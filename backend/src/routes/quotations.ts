import { Router } from 'express';
import { z } from 'zod';
import { ProcessingLog, Quotation, RFQ, TransactionDoc } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { quoteInternalView } from '../utils/serialize.js';
import { requireAuth, requireInternal, requireRole } from '../middleware/auth.js';
import { isExpired, nextCode } from '../utils/codes.js';

const router = Router();
router.use(requireAuth, requireInternal);

const createSchema = z.object({
  rfqId: z.string().min(1),
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().default('VND'),
  validUntil: z.coerce.date(),
  note: z.string().max(1000).optional().nullable(),
  configFileUrl: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        sku: z.string(),
        name: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().nullable().optional(),
        amount: z.number().nullable().optional(),
        configRequest: z.string().nullable().optional(),
      })
    )
    .optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rfqId } = req.query as any;
    const filter: any = {};
    if (rfqId) filter.rfqId = rfqId;
    const quotes = await Quotation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items: quotes.map(quoteInternalView) });
  })
);

/** Create version 1 of a quotation. Adjustments must use /:id/revise (BR-09). */
router.post(
  '/',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const rfq = await RFQ.findById(body.rfqId);
    if (!rfq) throw ApiError.notFound('Quote request not found');
    if (isExpired(body.validUntil)) throw ApiError.unprocessable('validUntil must be in the future');

    const existing = await Quotation.findOne({ rfqId: rfq._id });
    if (existing) {
      throw ApiError.conflict(
        'A quotation already exists for this request. Create a new version instead.',
        'QUOTE_EXISTS_USE_REVISE'
      );
    }
    if (!rfq.salesId) {
      throw ApiError.conflict('Assign a sales person in charge before preparing a quotation.', 'NO_SALES_ASSIGNED');
    }

    const quoteCode = await nextCode('BG');
    const items =
      body.items ||
      rfq.items.map((i: any) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        unitPrice: null,
        amount: null,
        configRequest: i.configRequest,
      }));
    const quote = await Quotation.create({
      quoteCode,
      versionNo: 1,
      rfqId: rfq._id,
      companyId: rfq.companyId,
      items,
      totalAmount: body.totalAmount ?? null,
      currency: body.currency || 'VND',
      validUntil: body.validUntil,
      note: body.note || null,
      configFileUrl: body.configFileUrl || null,
      quoteFileUrl: `/api/files/quotation/${quoteCode}.pdf`,
      status: 'draft',
    });
    quote.rootQuoteId = quote._id as any;
    await quote.save();

    await ProcessingLog.create({
      rfqId: rfq._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'quote',
      content: `Draft quotation ${quote.quoteCode} (v1) created.`,
      visibleToCustomer: false,
    });

    res.status(201).json(quoteInternalView(quote));
  })
);

/**
 * BR-09: any adjustment creates a new version. The original document is never
 * overwritten; the previous version stays queryable through rootQuoteId.
 */
const reviseSchema = z.object({
  totalAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  note: z.string().max(1000).optional().nullable(),
  configFileUrl: z.string().optional().nullable(),
  items: createSchema.shape.items,
});

router.post(
  '/:id/revise',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const source = await Quotation.findById(req.params.id);
    if (!source) throw ApiError.notFound('Quotation not found');
    const body = reviseSchema.parse(req.body);
    const rootId = source.rootQuoteId || source._id;
    const latest = await Quotation.findOne({ rootQuoteId: rootId }).sort({ versionNo: -1 }).lean();
    const versionNo = (latest?.versionNo || source.versionNo || 1) + 1;
    const quoteCode = await nextCode('BG');
    const validUntil = body.validUntil || source.validUntil;
    if (isExpired(validUntil)) throw ApiError.unprocessable('validUntil must be in the future');

    const quote = await Quotation.create({
      quoteCode,
      rootQuoteId: rootId,
      versionNo,
      rfqId: source.rfqId,
      companyId: source.companyId,
      items: body.items || source.items,
      totalAmount: body.totalAmount !== undefined ? body.totalAmount : source.totalAmount,
      currency: body.currency || source.currency,
      validUntil,
      note: body.note !== undefined ? body.note : source.note,
      configFileUrl: body.configFileUrl !== undefined ? body.configFileUrl : source.configFileUrl,
      quoteFileUrl: `/api/files/quotation/${quoteCode}.pdf`,
      status: 'draft',
    });

    const rfq = await RFQ.findById(source.rfqId);
    if (rfq && rfq.status === 'needs_adjustment') rfq.status = 'checking_configuration';
    if (rfq) await rfq.save();

    await ProcessingLog.create({
      rfqId: source.rfqId,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'quote',
      content: `Quotation revised: ${quote.quoteCode} (v${versionNo}). Previous version ${source.quoteCode} (v${source.versionNo}) kept unchanged.`,
      visibleToCustomer: false,
    });

    res.status(201).json(quoteInternalView(quote));
  })
);

/** Send a quotation — admin/sales only (BR-08). */
router.post(
  '/:id/send',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) throw ApiError.notFound('Quotation not found');
    if (quote.status !== 'draft') {
      throw ApiError.conflict(`Only a draft can be sent (current status: ${quote.status}).`, 'QUOTE_NOT_DRAFT');
    }
    if (isExpired(quote.validUntil)) {
      throw ApiError.conflict('The quotation validity date has passed. Revise it before sending.', 'QUOTE_EXPIRED');
    }
    const rfq = await RFQ.findById(quote.rfqId);
    if (!rfq) throw ApiError.notFound('Quote request not found');

    quote.status = 'sent';
    quote.sentAt = new Date();
    quote.sentBy = req.user!.id as any;
    quote.sentToEmail = rfq.contactEmail;
    quote.quoteFileUrl = quote.quoteFileUrl || `/api/files/quotation/${quote.quoteCode}.pdf`;
    await quote.save();

    rfq.status = 'quote_sent';
    await rfq.save();

    await TransactionDoc.findOneAndUpdate(
      { rfqId: rfq._id, fileType: 'quotation', fileName: quote.quoteCode + '.pdf' },
      {
        $set: {
          companyId: rfq.companyId,
          rfqId: rfq._id,
          fileType: 'quotation',
          fileName: quote.quoteCode + '.pdf',
          fileUrl: quote.quoteFileUrl,
          visibleToCustomer: true,
          uploadedBy: req.user!.id,
          uploadedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    await ProcessingLog.create({
      rfqId: rfq._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'quote',
      content: `Quotation ${quote.quoteCode} v${quote.versionNo} sent to ${rfq.contactEmail}. Validity: ${new Date(
        quote.validUntil
      )
        .toISOString()
        .slice(0, 10)}.`,
      visibleToCustomer: true,
    });

    res.json({
      quote: quoteInternalView(quote),
      message: `Quotation sent to ${rfq.contactEmail} (email delivery mocked in MVP).`,
    });
  })
);

/** Explicitly reject overwriting a sent version (BR-09 guard for QA). */
router.put(
  '/:id',
  requireRole('sales', 'admin'),
  asyncHandler(async (_req, _res) => {
    throw ApiError.conflict(
      'Sent quotations are immutable. Create a new version with POST /api/quotations/:id/revise.',
      'QUOTE_IMMUTABLE'
    );
  })
);

export default router;
