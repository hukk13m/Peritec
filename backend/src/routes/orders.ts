import { Router } from 'express';
import { z } from 'zod';
import { Order, ProcessingLog, Quotation, RFQ, TransactionDoc } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { orderInternalView } from '../utils/serialize.js';
import { requireAuth, requireInternal, requireRole } from '../middleware/auth.js';
import { isExpired, nextCode } from '../utils/codes.js';
import { updateOrderStage } from '../services/orderStages.js';

const router = Router();
router.use(requireAuth, requireInternal);

export const STAGE_NAMES = [
  'Order confirmation',
  'Supplier order',
  'International shipping',
  'Customs clearance',
  'Delivery',
];

const createOrderSchema = z.object({
  quoteId: z.string().min(1),
  recipientName: z.string().min(2),
  recipientPhone: z.string().min(6),
  recipientEmail: z.string().email().optional().nullable(),
  deliveryAddress: z.string().min(5),
  isImport: z.boolean().default(true),
  etaDate: z.coerce.date().optional().nullable(),
  plannedDates: z.array(z.coerce.date()).length(5).optional(),
});

/** BR-09 + BR-10: only a customer-confirmed, non-expired quotation can become an order. */
router.post(
  '/',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const quote = await Quotation.findById(body.quoteId);
    if (!quote) throw ApiError.notFound('Quotation not found');
    if (quote.status !== 'customer_confirmed') {
      throw ApiError.conflict(
        `Orders can only be created from a quotation confirmed by the customer (current status: ${quote.status}).`,
        'QUOTE_NOT_CONFIRMED'
      );
    }
    if (isExpired(quote.validUntil)) {
      quote.status = 'expired';
      await quote.save();
      throw ApiError.conflict('This quotation has expired and cannot be used to create an order.', 'QUOTE_EXPIRED');
    }
    const existing = await Order.findOne({ quoteId: quote._id }).lean();
    if (existing) {
      throw ApiError.conflict(`Order ${existing.orderCode} already exists for this quotation.`, 'ORDER_EXISTS');
    }
    const rfq = await RFQ.findById(quote.rfqId);
    if (!rfq) throw ApiError.notFound('Quote request not found');

    const orderCode = await nextCode('PO');
    const now = new Date();
    const defaultDates = [7, 21, 45, 60, 70].map((d) => {
      const x = new Date(now);
      x.setDate(x.getDate() + d);
      return x;
    });
    const planned = body.plannedDates || defaultDates;
    const stages = STAGE_NAMES.map((name, idx) => ({
      stageNo: idx + 1,
      name,
      plannedDate: planned[idx],
      actualDate: null,
      status: idx === 0 ? 'current' : 'not_started',
      note: null,
    }));

    const order = await Order.create({
      orderCode,
      quoteId: quote._id,
      rfqId: quote.rfqId,
      companyId: quote.companyId || rfq.companyId,
      isImport: body.isImport,
      currentStage: 1,
      etaDate: body.etaDate || planned[4],
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      recipientEmail: body.recipientEmail || rfq.contactEmail,
      deliveryAddress: body.deliveryAddress,
      addressStatus: 'pending_confirmation',
      items: quote.items.map((i: any) => ({
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        configRef: i.configRequest,
        itemStatus: 'Processing',
      })),
      stages,
      status: 'processing',
    });

    await TransactionDoc.create([
      {
        companyId: order.companyId,
        orderId: order._id,
        rfqId: order.rfqId,
        fileType: 'order_confirmation',
        fileName: `${orderCode}-order-confirmation.pdf`,
        fileUrl: `/api/files/order/${orderCode}.pdf`,
        visibleToCustomer: true,
        uploadedBy: req.user!.id,
      },
      {
        companyId: order.companyId,
        orderId: order._id,
        rfqId: order.rfqId,
        fileType: 'equipment_list',
        fileName: `${orderCode}-equipment-list.pdf`,
        fileUrl: `/api/files/equipment/${orderCode}.pdf`,
        visibleToCustomer: true,
        uploadedBy: req.user!.id,
      },
    ]);

    await ProcessingLog.create({
      orderId: order._id,
      rfqId: order.rfqId,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'status',
      content: `Order ${orderCode} created from confirmed quotation ${quote.quoteCode}. Five import stages generated.`,
      visibleToCustomer: true,
    });
    await ProcessingLog.create({
      rfqId: order.rfqId,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'internal',
      content: `Order ${orderCode} created internally. Delivery address must be confirmed with the customer.`,
      visibleToCustomer: false,
    });

    res.status(201).json({
      ...orderInternalView(order),
      message: 'Order created. Stages generated in the required order.',
    });
  })
);

/** BR-11: ETA is updated by authorized staff only, with a mandatory reason. */
const etaSchema = z.object({
  etaDate: z.coerce.date(),
  reason: z.string().min(3, 'A reason is required when changing the ETA'),
});

router.patch(
  '/:idOrCode/eta',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const body = etaSchema.parse(req.body);
    const order = await findOrder(req.params.idOrCode);
    const old = order.etaDate ? new Date(order.etaDate).toISOString().slice(0, 10) : 'not set';
    order.etaDate = body.etaDate;
    await order.save();
    await ProcessingLog.create({
      orderId: order._id,
      userId: req.user!.id,
      actorName: req.user!.name,
      logType: 'eta',
      content: `ETA changed from ${old} to ${body.etaDate.toISOString().slice(0, 10)}. Reason: ${body.reason}. ${order.etaNote}`,
      visibleToCustomer: true,
    });
    res.json(orderInternalView(order));
  })
);

const stageSchema = z.object({
  actualDate: z.coerce.date().optional(),
  plannedDate: z.coerce.date().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  etaDate: z.coerce.date().optional().nullable(),
  etaReason: z.string().max(500).optional().nullable(),
  visibleToCustomer: z.boolean().optional(),
});

router.patch(
  '/:idOrCode/stages/:stageNo',
  requireRole('sales', 'admin'),
  asyncHandler(async (req, res) => {
    const body = stageSchema.parse(req.body);
    const order = await updateOrderStage(
      (await findOrder(req.params.idOrCode))._id.toString(),
      Number(req.params.stageNo),
      body,
      { id: req.user!.id, name: req.user!.name }
    );
    res.json(orderInternalView(order));
  })
);

async function findOrder(idOrCode: string) {
  const query = idOrCode.match(/^[a-f\d]{24}$/i)
    ? { $or: [{ _id: idOrCode }, { orderCode: idOrCode.toUpperCase() }] }
    : { orderCode: idOrCode.toUpperCase() };
  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export default router;
