import { Router } from 'express';
import { z } from 'zod';
import {
  Application,
  Company,
  ContactRequest,
  Product,
  RFQ,
  ProcessingLog,
} from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { nextCode } from '../utils/codes.js';
import { productPublic } from '../utils/serialize.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */
router.get(
  '/applications',
  asyncHandler(async (_req, res) => {
    const apps = await Application.find().sort({ sortOrder: 1 }).lean();
    res.json({
      items: apps.map((a) => ({
        id: String(a._id),
        code: a.code,
        name: a.name,
        slug: a.slug,
        description: a.description,
        icon: a.icon,
      })),
    });
  })
);

/* ------------------------------------------------------------------ */
/* Product search / filter (FR-01, FR-02)                              */
/* ------------------------------------------------------------------ */
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { q, application, brand, sort = 'relevance', page = '1', limit = '24' } =
      req.query as Record<string, string>;

    const filter: any = { status: 'published' };
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { model: rx },
        { name: rx },
        { sku: rx },
        { brand: rx },
        { shortDescription: rx },
        { 'specs.value': rx },
      ];
    }
    if (brand) filter.brand = { $in: String(brand).split(',').filter(Boolean) };
    if (application) {
      const app = await Application.findOne({
        $or: [{ code: application }, { slug: application }],
      }).lean();
      if (!app) return res.json({ items: [], total: 0, page: 1, pages: 0, facets: {} });
      filter.applicationIds = app._id;
    }

    const pageNo = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(limit) || 24));
    const sortMap: Record<string, any> = {
      relevance: { sortOrder: 1, createdAt: -1 },
      newest: { createdAt: -1 },
      name: { name: 1 },
      brand: { brand: 1, model: 1 },
    };

    const [items, total, brands, apps] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[sort] || sortMap.relevance)
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(filter),
      Product.distinct('brand', { status: 'published' }),
      Application.find().sort({ sortOrder: 1 }).lean(),
    ]);

    res.json({
      items: items.map(productPublic),
      total,
      page: pageNo,
      pages: Math.ceil(total / pageSize),
      facets: {
        brands: brands.sort(),
        applications: apps.map((a) => ({ code: a.code, name: a.name, slug: a.slug })),
      },
    });
  })
);

/* ------------------------------------------------------------------ */
/* Compare up to 3 devices in the same group (BR-13)                   */
/* ------------------------------------------------------------------ */
const compareSchema = z.object({
  ids: z.array(z.string()).min(2, 'Select at least 2 devices'),
});

router.post(
  '/products/compare',
  asyncHandler(async (req, res) => {
    const { ids } = compareSchema.parse(req.body);
    if (ids.length > 3) {
      throw ApiError.badRequest('Compare up to 3 devices only', { ids: 'Select a maximum of 3 devices' });
    }
    if (new Set(ids).size !== ids.length) throw ApiError.badRequest('Duplicate devices in comparison');
    const products = await Product.find({ _id: { $in: ids }, status: 'published' }).lean();
    if (products.length !== ids.length) throw ApiError.notFound('One or more devices were not found');

    const groups = new Set(products.map((p: any) => p.primaryApplicationCode));
    if (groups.size > 1) {
      throw new ApiError(
        400,
        'Devices can only be compared within the same application group.',
        'COMPARE_GROUP_MISMATCH'
      );
    }

    // Preserve the order the user selected in.
    const ordered = ids.map((id) => products.find((p: any) => String(p._id) === id)) as any[];

    const attributeOrder: string[] = [];
    const attributeMeta: Record<string, { group: string; label: string; unit?: string }> = {};
    for (const p of ordered) {
      for (const s of p.specs || []) {
        const key = `${s.group}::${s.label}`;
        if (!attributeMeta[key]) {
          attributeMeta[key] = { group: s.group, label: s.label, unit: s.unit };
          attributeOrder.push(key);
        }
      }
    }

    const rows = attributeOrder.map((key) => {
      const meta = attributeMeta[key];
      const cells = ordered.map((p: any) => {
        const spec = (p.specs || []).find((s: any) => `${s.group}::${s.label}` === key);
        if (!spec) return { display: '—', confirmed: true, raw: null };
        if (!spec.confirmed) {
          return {
            display: 'Need to confirm according to datasheet/configuration',
            confirmed: false,
            raw: null,
            note: spec.note,
          };
        }
        return {
          display: [spec.value, spec.unit].filter(Boolean).join(' '),
          confirmed: true,
          raw: spec.value,
        };
      });
      const distinct = new Set(cells.map((c) => c.display));
      return {
        group: meta.group,
        label: meta.label,
        unit: meta.unit || null,
        different: distinct.size > 1,
        cells,
      };
    });

    res.json({
      applicationCode: ordered[0].primaryApplicationCode,
      products: ordered.map(productPublic),
      rows,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Product detail (FR-03)                                              */
/* ------------------------------------------------------------------ */
router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, status: 'published' }).lean();
    if (!product) throw ApiError.notFound('Device not found');
    const related = await Product.find({
      sku: { $in: product.relatedSkus || [] },
      status: 'published',
    }).lean();
    const applications = await Application.find({ _id: { $in: product.applicationIds || [] } }).lean();
    res.json({
      product: productPublic(product),
      applications: applications.map((a) => ({ code: a.code, name: a.name, slug: a.slug })),
      related: related.map(productPublic),
    });
  })
);

/* ------------------------------------------------------------------ */
/* RFQ creation (BR-02, BR-03, BR-04, BR-05)                           */
/* ------------------------------------------------------------------ */
const rfqItemSchema = z.object({
  productId: z.string().min(1, 'Device is required'),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).int().min(1, 'Quantity must be at least 1'),
  configRequest: z.string().max(500).optional().nullable(),
  itemNote: z.string().max(500).optional().nullable(),
});

const rfqSchema = z.object({
  items: z.array(rfqItemSchema).min(1, 'A quote request must contain at least 1 device'),
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact person is required'),
  contactPosition: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('A valid work email is required'),
  contactPhone: z.string().min(6, 'Phone number is required'),
  technicalNote: z.string().max(2000).optional().nullable(),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the privacy policy before submitting' }),
  }),
});

router.post(
  '/rfqs',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const body = rfqSchema.parse(req.body);
    const productIds = body.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, status: 'published' }).lean();
    if (products.length !== new Set(productIds).size) {
      throw ApiError.unprocessable('One or more selected devices are no longer available');
    }

    // BR-04: attach to a company, or create a pending business record for follow-up.
    let company: any = null;
    if (req.user?.role === 'customer' && req.user.companyId) {
      company = await Company.findById(req.user.companyId);
    }
    if (!company) {
      company = await Company.findOne({
        $or: [
          { contactEmail: body.contactEmail.toLowerCase() },
          { name: new RegExp(`^${escapeRegex(body.companyName)}$`, 'i') },
        ],
      });
    }
    if (!company) {
      company = await Company.create({
        code: 'CUS-' + Date.now().toString().slice(-6),
        name: body.companyName,
        contactName: body.contactName,
        contactEmail: body.contactEmail.toLowerCase(),
        contactPhone: body.contactPhone,
        status: 'pending_verification',
      });
    }

    const rfqCode = await nextCode('RFQ');
    const items = body.items.map((item) => {
      const p: any = products.find((x: any) => String(x._id) === item.productId);
      return {
        productId: p._id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        quantity: item.quantity,
        configRequest: item.configRequest || null,
        itemNote: item.itemNote || null,
        checkStatus: 'not_tested',
      };
    });

    const rfq = await RFQ.create({
      rfqCode,
      companyId: company._id,
      customerUserId: req.user?.role === 'customer' ? req.user.id : null,
      companyName: body.companyName,
      contactName: body.contactName,
      contactPosition: body.contactPosition || null,
      contactEmail: body.contactEmail.toLowerCase(),
      contactPhone: body.contactPhone,
      technicalNote: body.technicalNote || null,
      privacyConsent: true,
      source: 'website',
      status: 'new',
      items,
    });

    await ProcessingLog.create({
      rfqId: rfq._id,
      logType: 'website',
      actorName: body.contactName,
      content: `Quote request submitted from the website with ${items.length} device line(s).`,
      visibleToCustomer: true,
      createdAt: rfq.createdAt,
    });

    res.status(201).json({
      rfqCode: rfq.rfqCode,
      status: rfq.status,
      createdAt: rfq.createdAt,
      itemCount: items.length,
      totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
      message:
        'Request received. PERITEC will confirm the configuration and send an official quotation. This is not a price confirmation.',
    });
  })
);

/** Public success-page lookup: deliberately minimal, never returns prices or contacts. */
router.get(
  '/rfqs/:code/summary',
  asyncHandler(async (req, res) => {
    const rfq = await RFQ.findOne({ rfqCode: req.params.code.toUpperCase() }).lean();
    if (!rfq) throw ApiError.notFound('Quote request not found');
    res.json({
      rfqCode: rfq.rfqCode,
      status: rfq.status,
      createdAt: rfq.createdAt,
      itemCount: rfq.items.length,
      totalQuantity: rfq.items.reduce((s: number, i: any) => s + i.quantity, 0),
      contactEmail: maskEmail(rfq.contactEmail),
    });
  })
);

/* ------------------------------------------------------------------ */
/* Contact / consultation request (FR-16)                              */
/* ------------------------------------------------------------------ */
const contactSchema = z.object({
  needType: z.string().default('product_consulting'),
  companyName: z.string().optional(),
  contactName: z.string().min(2, 'Contact person is required'),
  email: z.string().email('A valid email is required'),
  phone: z.string().min(6, 'Phone number is required'),
  content: z.string().min(10, 'Please describe your request'),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the privacy policy' }),
  }),
  relatedOrderCode: z.string().optional(),
});

router.post(
  '/contact-requests',
  asyncHandler(async (req, res) => {
    const body = contactSchema.parse(req.body);
    const doc = await ContactRequest.create(body);
    res.status(201).json({
      id: String(doc._id),
      status: doc.status,
      message: 'Your request was sent to the relevant PERITEC department.',
    });
  })
);

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

export default router;
