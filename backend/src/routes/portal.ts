import { Router } from 'express';
import type { Request } from 'express';
import {
  Company,
  Order,
  ProcessingLog,
  Quotation,
  RFQ,
  TransactionDoc,
} from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import {
  companyPublic,
  logView,
  orderCustomerView,
  quoteCustomerView,
  rfqCustomerView,
} from '../utils/serialize.js';
import { assertCompanyAccess, requireAuth, requireRole } from '../middleware/auth.js';
import { isExpired } from '../utils/codes.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

function companyIdOf(req: Request) {
  if (!req.user?.companyId) throw ApiError.forbidden('Your account is not linked to a company yet.');
  return req.user.companyId;
}

async function findCompanyRfq(req: Request, codeOrId: string) {
  const rfq = await RFQ.findOne({
    $or: [
      { rfqCode: codeOrId.toUpperCase() },
      ...(codeOrId.match(/^[a-f\d]{24}$/i) ? [{ _id: codeOrId }] : []),
    ],
  }).lean();
  if (!rfq) throw ApiError.notFound('Quote request not found');
  assertCompanyAccess(req, rfq.companyId);
  return rfq;
}

async function findCompanyOrder(req: Request, codeOrId: string) {
  const order = await Order.findOne({
    $or: [
      { orderCode: codeOrId.toUpperCase() },
      ...(codeOrId.match(/^[a-f\d]{24}$/i) ? [{ _id: codeOrId }] : []),
    ],
  }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  assertCompanyAccess(req, order.companyId);
  return order;
}

/* ------------------------------------------------------------------ */
/* Overview (FR-12)                                                    */
/* ------------------------------------------------------------------ */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    const [company, rfqCount, orders, docs, quotes] = await Promise.all([
      Company.findById(companyId).lean(),
      RFQ.countDocuments({ companyId }),
      Order.find({ companyId }).sort({ createdAt: -1 }).lean(),
      TransactionDoc.find({ companyId, visibleToCustomer: true }).lean(),
      Quotation.find({ companyId, status: { $in: ['sent', 'customer_confirmed', 'adjustment_requested'] } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const activeOrders = orders.filter((o) => o.status === 'processing');
    const pendingQuote = quotes.find((q) => q.status === 'sent' && !isExpired(q.validUntil));
    const activeOrder = activeOrders[0] || null;

    const nextActions: any[] = [];
    if (pendingQuote) {
      const rfq = await RFQ.findById(pendingQuote.rfqId).lean();
      nextActions.push({
        type: 'quote_review',
        title: `Review quotation ${pendingQuote.quoteCode}`,
        description: `Quote for ${rfq?.rfqCode || ''} is waiting for your confirmation.`,
        validUntil: pendingQuote.validUntil,
        link: `/portal/rfqs/${rfq?.rfqCode || ''}`,
      });
    }
    if (company?.status === 'pending_verification') {
      nextActions.push({
        type: 'verify_company',
        title: 'Company profile pending verification',
        description: 'PERITEC sales staff will verify your business profile shortly.',
      });
    }

    res.json({
      company: companyPublic(company),
      stats: {
        rfqs: rfqCount,
        activeOrders: activeOrders.length,
        documents: docs.length,
        pendingQuotes: quotes.filter((q) => q.status === 'sent' && !isExpired(q.validUntil)).length,
      },
      nextActions,
      activeOrder: activeOrder
        ? {
            orderCode: activeOrder.orderCode,
            currentStage: activeOrder.currentStage,
            stageName: activeOrder.stages?.find((s: any) => s.stageNo === activeOrder.currentStage)?.name,
            etaDate: activeOrder.etaDate,
            etaNote: activeOrder.etaNote,
            status: activeOrder.status,
          }
        : null,
    });
  })
);

/* ------------------------------------------------------------------ */
/* RFQ history (FR-13)                                                 */
/* ------------------------------------------------------------------ */
router.get(
  '/rfqs',
  asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    const rfqs = await RFQ.find({ companyId }).sort({ createdAt: -1 }).lean();
    const items = [];
    for (const rfq of rfqs) {
      const latestQuote = await Quotation.findOne({
        rfqId: rfq._id,
        status: { $in: ['sent', 'customer_confirmed', 'adjustment_requested', 'expired'] },
      })
        .sort({ versionNo: -1 })
        .lean();
      const order = await Order.findOne({ rfqId: rfq._id }).lean();
      items.push({
        rfqCode: rfq.rfqCode,
        status: rfq.status,
        createdAt: rfq.createdAt,
        updatedAt: rfq.updatedAt,
        itemCount: rfq.items.length,
        totalQuantity: rfq.items.reduce((s: number, i: any) => s + i.quantity, 0),
        devices: rfq.items.map((i: any) => ({ sku: i.sku, name: i.name, quantity: i.quantity })),
        latestQuote: latestQuote
          ? {
              quoteCode: latestQuote.quoteCode,
              versionNo: latestQuote.versionNo,
              status: latestQuote.status,
              validUntil: latestQuote.validUntil,
              expired: isExpired(latestQuote.validUntil),
            }
          : null,
        orderCode: order?.orderCode || null,
      });
    }
    res.json({ items });
  })
);

router.get(
  '/rfqs/:code',
  asyncHandler(async (req, res) => {
    const rfq = await findCompanyRfq(req, req.params.code);
    const [quotes, logs, order] = await Promise.all([
      Quotation.find({
        rfqId: rfq._id,
        status: { $in: ['sent', 'customer_confirmed', 'adjustment_requested', 'expired'] },
      })
        .sort({ versionNo: 1 })
        .lean(),
      ProcessingLog.find({ rfqId: rfq._id, visibleToCustomer: true }).sort({ createdAt: 1 }).lean(),
      Order.findOne({ rfqId: rfq._id }).lean(),
    ]);
    res.json(
      rfqCustomerView(rfq, {
        quotes: quotes.map((q) => ({
          ...quoteCustomerView(q),
          expired: isExpired(q.validUntil),
        })),
        logs: logs.map((l) => logView(l, true)),
        order: order
          ? { orderCode: order.orderCode, status: order.status, currentStage: order.currentStage }
          : null,
      })
    );
  })
);

/* ------------------------------------------------------------------ */
/* Orders & delivery tracking (FR-14, BR-11, BR-12)                    */
/* ------------------------------------------------------------------ */
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    const orders = await Order.find({ companyId }).sort({ createdAt: -1 }).lean();
    res.json({
      items: orders.map((o) => ({
        orderCode: o.orderCode,
        status: o.status,
        currentStage: o.currentStage,
        stageName: o.stages?.find((s: any) => s.stageNo === o.currentStage)?.name,
        etaDate: o.etaDate,
        etaNote: o.etaNote,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        totalQuantity: o.items.reduce((s: number, i: any) => s + i.quantity, 0),
      })),
    });
  })
);

router.get(
  '/orders/:code',
  asyncHandler(async (req, res) => {
    const order = await findCompanyOrder(req, req.params.code);
    const [logs, docs] = await Promise.all([
      ProcessingLog.find({ orderId: order._id, visibleToCustomer: true }).sort({ createdAt: 1 }).lean(),
      TransactionDoc.find({ orderId: order._id, visibleToCustomer: true }).lean(),
    ]);
    res.json(orderCustomerView(order, logs, docs.map(docView)));
  })
);

/** BR-12: customer confirms a quotation; only the owning company may do this. */
router.post(
  '/quotations/:id/confirm',
  asyncHandler(async (req, res) => {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) throw ApiError.notFound('Quotation not found');
    assertCompanyAccess(req, quote.companyId);
    if (quote.status !== 'sent') {
      throw ApiError.conflict('Only a sent quotation can be confirmed.', 'QUOTE_NOT_SENT');
    }
    if (isExpired(quote.validUntil)) {
      quote.status = 'expired';
      await quote.save();
      throw ApiError.conflict('This quotation has expired. Please request an updated quote.', 'QUOTE_EXPIRED');
    }
    quote.status = 'customer_confirmed';
    await quote.save();
    const rfq = await RFQ.findById(quote.rfqId);
    if (rfq) {
      rfq.status = 'confirmed';
      await rfq.save();
      await ProcessingLog.create({
        rfqId: rfq._id,
        userId: req.user!.id,
        actorName: req.user!.name,
        logType: 'customer',
        content: `Customer confirmed quotation ${quote.quoteCode}.`,
        visibleToCustomer: true,
      });
    }
    res.json({ quote: quoteCustomerView(quote), message: 'Quotation confirmed.' });
  })
);

router.post(
  '/quotations/:id/request-adjustment',
  asyncHandler(async (req, res) => {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) throw ApiError.notFound('Quotation not found');
    assertCompanyAccess(req, quote.companyId);
    if (quote.status !== 'sent') throw ApiError.conflict('Only a sent quotation can be adjusted.');
    const note = String(req.body?.note || '').slice(0, 1000);
    quote.status = 'adjustment_requested';
    quote.note = note;
    await quote.save();
    const rfq = await RFQ.findById(quote.rfqId);
    if (rfq) {
      rfq.status = 'needs_adjustment';
      await rfq.save();
      await ProcessingLog.create({
        rfqId: rfq._id,
        userId: req.user!.id,
        actorName: req.user!.name,
        logType: 'customer',
        content: `Customer requested an adjustment for ${quote.quoteCode}.${note ? ' Note: ' + note : ''}`,
        visibleToCustomer: true,
      });
    }
    res.json({ quote: quoteCustomerView(quote), message: 'Adjustment request sent to PERITEC.' });
  })
);

/* ------------------------------------------------------------------ */
/* My documents (FR-15)                                                */
/* ------------------------------------------------------------------ */
router.get(
  '/documents',
  asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    const docs = await TransactionDoc.find({ companyId, visibleToCustomer: true })
      .sort({ uploadedAt: -1 })
      .lean();
    res.json({ items: docs.map(docView) });
  })
);

/* ------------------------------------------------------------------ */
/* Company profile (FR-12)                                             */
/* ------------------------------------------------------------------ */
router.get(
  '/company',
  asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    const company = await Company.findById(companyId).lean();
    if (!company) throw ApiError.notFound('Company not found');
    res.json({ company: companyPublic(company) });
  })
);

function docView(d: any) {
  return {
    id: String(d._id),
    fileType: d.fileType,
    fileName: d.fileName,
    fileUrl: d.fileUrl,
    uploadedAt: d.uploadedAt,
  };
}

export default router;
