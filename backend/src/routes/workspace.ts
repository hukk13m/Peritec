import { Router } from 'express';
import { z } from 'zod';
import {
  Company,
  Order,
  ProcessingLog,
  Quotation,
  RFQ,
  TransactionDoc,
  User,
} from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { quoteInternalView, logView, orderInternalView } from '../utils/serialize.js';
import { isInternal, requireAuth, requireInternal, requireRole } from '../middleware/auth.js';
import { isExpired } from '../utils/codes.js';
import { updateOrderStage } from '../services/orderStages.js';

const router = Router();
router.use(requireAuth, requireInternal);

const STAFF_VIEW = 'name email role phone position companyId';

function idOf(ref: any): string | null {
  if (!ref) return null;
  return String(ref._id || ref);
}

async function staffMap(ids: any[]) {
  const clean = ids.filter(Boolean).map(String);
  const users = await User.find({ _id: { $in: clean } }).select('name email role').lean();
  return Object.fromEntries(users.map((u) => [String(u._id), u]));
}

async function getRfqOr404(idOrCode: string) {
  const query = idOrCode.match(/^[a-f\d]{24}$/i)
    ? { $or: [{ _id: idOrCode }, { rfqCode: idOrCode.toUpperCase() }] }
    : { rfqCode: idOrCode.toUpperCase() };
  const rfq = await RFQ.findOne(query).lean();
  if (!rfq) throw ApiError.notFound('Quote request not found');
  return rfq;
}

async function getOrderOr404(idOrCode: string) {
  const query = idOrCode.match(/^[a-f\d]{24}$/i)
    ? { $or: [{ _id: idOrCode }, { orderCode: idOrCode.toUpperCase() }] }
    : { orderCode: idOrCode.toUpperCase() };
  const order = await Order.findOne(query).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/* ------------------------------------------------------------------ */
/* Dashboard metrics (FR-17, FR-28)                                    */
/* ------------------------------------------------------------------ */
router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [byStatus, unassigned, total, ordersActive, ordersDelivered, recent] = await Promise.all([
      RFQ.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      RFQ.countDocuments({ salesId: null, status: { $in: ['new', 'checking_configuration'] } }),
      RFQ.countDocuments({}),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'delivered' }),
      RFQ.find({}).sort({ createdAt: -1 }).limit(6).lean(),
    ]);
    const counts: Record<string, number> = {
      new: 0,
      checking_configuration: 0,
      quote_sent: 0,
      needs_adjustment: 0,
      confirmed: 0,
      canceled: 0,
    };
    byStatus.forEach((s: any) => (counts[s._id] = s.count));

    // Average time from creation to quote-sent (only requests that reached that state)
    const sent = await RFQ.find({ status: { $in: ['quote_sent', 'confirmed'] } }).lean();
    const quoteTimes = await Promise.all(
      sent.map(async (r) => {
        const q = await Quotation.findOne({ rfqId: r._id, status: { $ne: 'draft' } })
          .sort({ sentAt: 1 })
          .lean();
        if (!q?.sentAt) return null;
        return (new Date(q.sentAt).getTime() - new Date(r.createdAt).getTime()) / 3600000;
      })
    );
    const valid = quoteTimes.filter((x): x is number => typeof x === 'number');
    const avgHours = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;

    res.json({
      counts,
      totalRfqs: total,
      unassignedRfqs: unassigned,
      ordersActive,
      ordersDelivered,
      avgHoursToQuote: avgHours,
      recent: await Promise.all(
        recent.map(async (r) => ({
          rfqCode: r.rfqCode,
          companyName: r.companyName,
          status: r.status,
          itemCount: r.items.length,
          totalQuantity: r.items.reduce((s: number, i: any) => s + i.quantity, 0),
          updatedAt: r.updatedAt,
        }))
      ),
    });
  })
);

/* ------------------------------------------------------------------ */
/* RFQ queue (FR-17)                                                   */
/* ------------------------------------------------------------------ */
router.get(
  '/rfqs',
  asyncHandler(async (req, res) => {
    const { q, status, salesId, technicianId, page = '1', limit = '20' } = req.query as any;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (salesId) filter.salesId = salesId === 'unassigned' ? null : salesId;
    if (technicianId) filter.technicianId = technicianId === 'unassigned' ? null : technicianId;
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ rfqCode: rx }, { companyName: rx }, { contactName: rx }, { 'items.sku': rx }, { 'items.name': rx }];
    }
    const pageNo = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const [rfqs, total] = await Promise.all([
      RFQ.find(filter).sort({ createdAt: -1 }).skip((pageNo - 1) * pageSize).limit(pageSize).lean(),
      RFQ.countDocuments(filter),
    ]);
    const people = await staffMap(rfqs.flatMap((r) => [r.salesId, r.technicianId]));
    res.json({
      total,
      page: pageNo,
      pages: Math.ceil(total / pageSize),
      items: rfqs.map((r) => ({
        id: String(r._id),
        rfqCode: r.rfqCode,
        companyName: r.companyName,
        contactName: r.contactName,
        contactEmail: r.contactEmail,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        devices: r.items.map((i: any) => ({ sku: i.sku, name: i.name, quantity: i.quantity, checkStatus: i.checkStatus })),
        totalQuantity: r.items.reduce((s: number, i: any) => s + i.quantity, 0),
        sales: r.salesId ? people[String(r.salesId)] || null : null,
        technician: r.technicianId ? people[String(r.technicianId)] || null : null,
      })),
    });
  })
);

/* ------------------------------------------------------------------ */
/* RFQ detail — internal view (FR-18..FR-21)                           */
/* ------------------------------------------------------------------ */
router.get(
  '/rfqs/:idOrCode',
  asyncHandler(async (req, res) => {
    const rfq = await getRfqOr404(req.params.idOrCode);
    const [quotes, logs, order, company, people] = await Promise.all([
      Quotation.find({ rfqId: rfq._id }).sort({ versionNo: 1 }).lean(),
      ProcessingLog.find({ rfqId: rfq._id }).sort({ createdAt: 1 }).lean(),
      Order.findOne({ rfqId: rfq._id }).lean(),
      rfq.companyId ? Company.findById(rfq.companyId).lean() : null,
      staffMap([rfq.salesId, rfq.technicianId]),
    ]);
    res.json({
      id: String(rfq._id),
      rfqCode: rfq.rfqCode,
      status: rfq.status,
      source: rfq.source,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      customer: {
        companyId: rfq.companyId ? String(rfq.companyId) : null,
        companyName: rfq.companyName,
        companyCode: company?.code,
        companyStatus: company?.status,
        taxCode: company?.taxCode,
        industry: company?.industry,
        address: company?.address,
        contactName: rfq.contactName,
        contactPosition: rfq.contactPosition,
        contactEmail: rfq.contactEmail,
        contactPhone: rfq.contactPhone,
      },
      technicalNote: rfq.technicalNote,
      privacyConsent: rfq.privacyConsent,
      items: rfq.items.map((i: any) => ({ ...i, id: String(i._id) })),
      sales: rfq.salesId ? people[String(rfq.salesId)] || null : null,
      technician: rfq.technicianId ? people[String(rfq.technicianId)] || null : null,
      quotes: quotes.map(quoteInternalView),
      logs: logs.map((l) => logView(l, false)),
      order: order ? { id: String(order._id), orderCode: order.orderCode, status: order.status, currentStage: order.currentStage } : null,
      customerVisible: {
        status: rfq.status,
        logs: logs.filter((l) => l.visibleToCustomer).map((l) => ({
          content: l.content,
          createdAt: l.createdAt,
          logType: l.logType,
        })),
        quotes: quotes
          .filter((q) => ['sent', 'customer_confirmed', 'adjustment_requested', 'expired'].includes(q.status))
          .map((q) => ({
            quoteCode: q.quoteCode,
            versionNo: q.versionNo,
            status: q.status,
            validUntil: q.validUntil,
            expired: isExpired(q.validUntil),
            fileUrl: q.quoteFileUrl,
          })),
      },
    });
  })
);

/* ------------------------------------------------------------------ */
/* Assignment (FR-18) — Sales/Admin only, Engineering cannot assign    */
/* ------------------------------------------------------------------ */
const assignSchema = z.object({
  salesId: z.string().nullable().optional(),
  technicianId: z.string().nullable().optional(),
});

router.patch(
  '/rfqs/:idOrCode/assign',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const rfq = await RFQ.findById(await resolveId(req.params.idOrCode));
    if (!rfq) throw ApiError.notFound('Quote request not found');
    const body = assignSchema.parse(req.body);
    const changes: string[] = [];

    if (body.salesId !== undefined) {
      if (body.salesId) {
        const sales = await User.findOne({ _id: body.salesId, role: { $in: ['sales', 'admin'] } });
        if (!sales) throw ApiError.badRequest('Selected sales user is invalid');
        rfq.salesId = sales._id as any;
        changes.push(`Sales in charge: ${sales.name}`);
      } else {
        rfq.salesId = null as any;
        changes.push('Sales assignment cleared');
      }
    }
    if (body.technicianId !== undefined) {
      if (body.technicianId) {
        const tech = await User.findOne({ _id: body.technicianId, role: { $in: ['engineering', 'admin'] } });
        if (!tech) throw ApiError.badRequest('Selected engineering user is invalid');
        rfq.technicianId = tech._id as any;
        changes.push(`Engineering coordinator: ${tech.name}`);
      } else {
        rfq.technicianId = null as any;
        changes.push('Engineering assignment cleared');
      }
    }
    await rfq.save();
    if (changes.length) {
      await ProcessingLog.create({
        rfqId: rfq._id,
        userId: req.user!.id,
        actorName: req.user!.name,
        logType: 'assignment',
        content: changes.join('. '),
        visibleToCustomer: false,
      });
    }
    res.json({ id: String(rfq._id), rfqCode: rfq.rfqCode, salesId: idOf(rfq.salesId), technicianId: idOf(rfq.technicianId) });
  })
);

/* ------------------------------------------------------------------ */
/* Status transition (BR-06)                                           */
/* ------------------------------------------------------------------ */
const TRANSITIONS: Record<string, string[]> = {
  new: ['checking_configuration', 'quote_sent', 'canceled'],
  checking_configuration: ['quote_sent', 'needs_adjustment', 'canceled'],
  quote_sent: ['needs_adjustment', 'canceled'],
  needs_adjustment: ['checking_configuration', 'quote_sent', 'canceled'],
  confirmed: [],
  canceled: [],
};

router.patch(
  '/rfqs/:idOrCode/status',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const rfq = await RFQ.findById(await resolveId(req.params.idOrCode));
    if (!rfq) throw ApiError.notFound('Quote request not found');
    const status = z
      .enum(['new', 'checking_configuration', 'quote_sent', 'needs_adjustment', 'confirmed', 'canceled'])
      .parse(req.body?.status);
    if (!TRANSITIONS[rfq.status]?.includes(status)) {
      throw ApiError.conflict(
        `Cannot move a request from "${rfq.status}" to "${status}".`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    const note = String(req.body?.note || '').slice(0, 1000);
    rfq.status = status as any;
    await rfq.save();
    await ProcessingLog.create({
      rfqId: rfq._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'status',
      content: `Status changed to ${status}.${note ? ' ' + note : ''}`,
      visibleToCustomer: status !== 'canceled',
    });
    res.json({ id: String(rfq._id), status: rfq.status });
  })
);

/* ------------------------------------------------------------------ */
/* Technical check (FR-19, BR-08)                                      */
/* ------------------------------------------------------------------ */
const checkSchema = z.object({
  checkStatus: z.enum(['not_tested', 'tested', 'need_clarification']),
  note: z.string().max(1000).optional().nullable(),
});

router.patch(
  '/rfqs/:idOrCode/items/:itemId/check',
  requireRole('engineering', 'sales', 'admin'),
  asyncHandler(async (req, res) => {
    const rfq = await RFQ.findById(await resolveId(req.params.idOrCode));
    if (!rfq) throw ApiError.notFound('Quote request not found');
    const item: any = (rfq.items as any[]).find((i) => String(i._id) === req.params.itemId);
    if (!item) throw ApiError.notFound('Device line not found');
    const body = checkSchema.parse(req.body);
    item.checkStatus = body.checkStatus;
    item.checkNote = body.note || null;
    item.checkedBy = req.user!.id as any;
    item.checkedAt = new Date();
    if (rfq.status === 'new' && body.checkStatus !== 'not_tested') rfq.status = 'checking_configuration';
    await rfq.save();
    await ProcessingLog.create({
      rfqId: rfq._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'technical',
      content: `Configuration check for ${item.sku}: ${body.checkStatus}${body.note ? ' — ' + body.note : ''}`,
      visibleToCustomer: false,
    });
    res.json({ id: item._id, checkStatus: item.checkStatus, checkedAt: item.checkedAt });
  })
);

/* ------------------------------------------------------------------ */
/* Exchange history: internal note vs customer-visible message (FR-21) */
/* ------------------------------------------------------------------ */
const logSchema = z.object({
  logType: z.enum(['internal', 'customer']),
  content: z.string().min(1).max(2000),
  attachmentUrl: z.string().optional().nullable(),
});

router.post(
  '/rfqs/:idOrCode/logs',
  asyncHandler(async (req, res) => {
    const rfq = await RFQ.findById(await resolveId(req.params.idOrCode));
    if (!rfq) throw ApiError.notFound('Quote request not found');
    const body = logSchema.parse(req.body);
    if (req.user!.role === 'engineering' && body.logType === 'customer') {
      throw ApiError.forbidden('Engineering staff can only add internal notes.');
    }
    const log = await ProcessingLog.create({
      rfqId: rfq._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: body.logType === 'customer' ? 'customer' : 'internal',
      content: body.content,
      attachmentUrl: body.attachmentUrl || null,
      visibleToCustomer: body.logType === 'customer',
    });
    res.status(201).json(logView(log, false));
  })
);

/* ------------------------------------------------------------------ */
/* Internal order list / detail                                        */
/* ------------------------------------------------------------------ */
router.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    const companies = await Company.find({ _id: { $in: orders.map((o) => o.companyId) } }).lean();
    const map = Object.fromEntries(companies.map((c) => [String(c._id), c]));
    res.json({
      items: orders.map((o) => ({
        id: String(o._id),
        orderCode: o.orderCode,
        companyName: map[String(o.companyId)]?.name || '',
        status: o.status,
        currentStage: o.currentStage,
        stageName: o.stages?.find((s: any) => s.stageNo === o.currentStage)?.name,
        etaDate: o.etaDate,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        totalQuantity: o.items.reduce((s: number, i: any) => s + i.quantity, 0),
      })),
    });
  })
);

router.get(
  '/orders/:idOrCode',
  asyncHandler(async (req, res) => {
    const order = await getOrderOr404(req.params.idOrCode);
    const [logs, docs, company, quote, rfq] = await Promise.all([
      ProcessingLog.find({ orderId: order._id }).sort({ createdAt: 1 }).lean(),
      TransactionDoc.find({ orderId: order._id }).lean(),
      Company.findById(order.companyId).lean(),
      Quotation.findById(order.quoteId).lean(),
      order.rfqId ? RFQ.findById(order.rfqId).lean() : null,
    ]);
    res.json({
      order: orderInternalView(order),
      company: company ? { id: String(company._id), name: company.name, code: company.code } : null,
      quote: quoteInternalView(quote),
      rfqCode: rfq?.rfqCode || null,
      logs: logs.map((l) => logView(l, false)),
      documents: docs.map((d) => ({
        id: String(d._id),
        fileType: d.fileType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        visibleToCustomer: d.visibleToCustomer,
        uploadedAt: d.uploadedAt,
      })),
    });
  })
);

/* ------------------------------------------------------------------ */
/* Update one import stage (BR-11) — business logic in orderStages.ts  */
/* ------------------------------------------------------------------ */
const stageSchema = z.object({
  actualDate: z.coerce.date().optional(),
  plannedDate: z.coerce.date().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  etaDate: z.coerce.date().optional().nullable(),
  etaReason: z.string().max(500).optional().nullable(),
  visibleToCustomer: z.boolean().optional(),
});

router.patch(
  '/orders/:idOrCode/stages/:stageNo',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const body = stageSchema.parse(req.body);
    const order = await updateOrderStage(
      await resolveOrderId(req.params.idOrCode),
      Number(req.params.stageNo),
      body,
      { id: req.user!.id, name: req.user!.name }
    );
    res.json(orderInternalView(order));
  })
);

/* ------------------------------------------------------------------ */
/* Delivery details / address confirmation                             */
/* ------------------------------------------------------------------ */
const deliverySchema = z.object({
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  deliveryAddress: z.string().optional(),
  addressStatus: z.enum(['pending_confirmation', 'confirmed']).optional(),
});

router.patch(
  '/orders/:idOrCode/delivery',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(await resolveOrderId(req.params.idOrCode));
    if (!order) throw ApiError.notFound('Order not found');
    const body = deliverySchema.parse(req.body);
    Object.assign(order, body);
    await order.save();
    await ProcessingLog.create({
      orderId: order._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'status',
      content: 'Delivery information was updated.',
      visibleToCustomer: true,
    });
    res.json(orderInternalView(order));
  })
);

/* ------------------------------------------------------------------ */
/* Attach transaction document (FR-23)                                 */
/* ------------------------------------------------------------------ */
const docSchema = z.object({
  fileType: z.enum(['quotation', 'order_confirmation', 'equipment_list', 'delivery_document']),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  visibleToCustomer: z.boolean().default(false),
});

router.post(
  '/orders/:idOrCode/documents',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(await resolveOrderId(req.params.idOrCode));
    if (!order) throw ApiError.notFound('Order not found');
    const body = docSchema.parse(req.body);
    const doc = await TransactionDoc.create({
      companyId: order.companyId,
      orderId: order._id,
      rfqId: order.rfqId,
      ...body,
      uploadedBy: req.user!.id,
    });
    res.status(201).json({ id: String(doc._id), fileName: doc.fileName });
  })
);

/* ------------------------------------------------------------------ */
/* Companies & staff pickers (FR-24, FR-27, BR-15)                     */
/* ------------------------------------------------------------------ */
router.get(
  '/companies',
  asyncHandler(async (_req, res) => {
    const companies = await Company.find({}).sort({ name: 1 }).lean();
    res.json({
      items: companies.map((c) => ({
        id: String(c._id),
        code: c.code,
        name: c.name,
        taxCode: c.taxCode,
        industry: c.industry,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  })
);

router.patch(
  '/companies/:id/verify',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) throw ApiError.notFound('Company not found');
    const status = z.enum(['active', 'locked']).parse(req.body?.status || 'active');
    company.status = status;
    if (!company.accountManagerId) company.accountManagerId = req.user!.id as any;
    await company.save();
    res.json({ id: String(company._id), status: company.status });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { role } = req.query as any;
    const filter: any = { status: 'active' };
    if (role) filter.role = { $in: String(role).split(',') };
    const users = await User.find(filter).select(STAFF_VIEW).sort({ name: 1 }).lean();
    res.json({
      items: users.map((u) => ({ ...u, id: String(u._id), companyId: u.companyId ? String(u.companyId) : null })),
    });
  })
);

async function resolveId(idOrCode: string): Promise<string> {
  if (idOrCode.match(/^[a-f\d]{24}$/i)) return idOrCode;
  const rfq = await RFQ.findOne({ rfqCode: idOrCode.toUpperCase() }).select('_id').lean();
  if (!rfq) throw ApiError.notFound('Quote request not found');
  return String(rfq._id);
}

async function resolveOrderId(idOrCode: string): Promise<string> {
  if (idOrCode.match(/^[a-f\d]{24}$/i)) return idOrCode;
  const order = await Order.findOne({ orderCode: idOrCode.toUpperCase() }).select('_id').lean();
  if (!order) throw ApiError.notFound('Order not found');
  return String(order._id);
}

export default router;
