import { Order, ProcessingLog } from '../models/index.js';
import { ApiError } from '../utils/errors.js';

export interface StageUpdateBody {
  actualDate?: Date;
  plannedDate?: Date | null;
  note?: string | null;
  etaDate?: Date | null;
  etaReason?: string | null;
  visibleToCustomer?: boolean;
}

/**
 * BR-11 — import stages must be completed in order. Every update records the
 * actor and time; an ETA change always requires and stores a reason.
 */
export async function updateOrderStage(
  orderId: string,
  stageNo: number,
  body: StageUpdateBody,
  actor: { id: string; name: string }
) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  const stage: any = (order.stages as any[]).find((s) => s.stageNo === stageNo);
  if (!stage) throw ApiError.badRequest('Stage does not exist');

  if (stageNo !== order.currentStage) {
    throw ApiError.conflict(
      `Stage ${stageNo} cannot be updated now. Current stage is ${order.currentStage}; complete stages in order.`,
      'STAGE_OUT_OF_ORDER'
    );
  }

  if (body.etaDate !== undefined && body.etaDate !== null) {
    const next = new Date(body.etaDate);
    const changed = !order.etaDate || new Date(order.etaDate).getTime() !== next.getTime();
    if (changed && !String(body.etaReason || '').trim()) {
      throw ApiError.unprocessable('A reason is required when changing the ETA', {
        etaReason: 'Provide the reason for the ETA change',
      });
    }
    if (changed) {
      const old = order.etaDate ? new Date(order.etaDate).toISOString().slice(0, 10) : 'not set';
      order.etaDate = next;
      await ProcessingLog.create({
        orderId: order._id,
        userId: actor.id,
        actorName: actor.name,
        logType: 'eta',
        content: `ETA changed from ${old} to ${next.toISOString().slice(0, 10)}. Reason: ${body.etaReason}. ${order.etaNote}`,
        visibleToCustomer: true,
      });
    }
  }

  stage.status = 'complete';
  stage.actualDate = body.actualDate ? new Date(body.actualDate) : new Date();
  if (body.plannedDate !== undefined) stage.plannedDate = body.plannedDate;
  if (body.note !== undefined) stage.note = body.note;
  stage.updatedBy = actor.id;
  stage.updatedAt = new Date();

  const nextStage: any = (order.stages as any[]).find((s) => s.stageNo === stageNo + 1);
  if (nextStage && nextStage.status === 'not_started') nextStage.status = 'current';
  order.currentStage = nextStage ? stageNo + 1 : stageNo;
  if (!nextStage) order.status = 'delivered';
  await order.save();

  await ProcessingLog.create({
    orderId: order._id,
    userId: actor.id,
    actorName: actor.name,
    logType: 'stage',
    content:
      `Stage ${stageNo} "${stage.name}" marked complete.` +
      (body.note ? ' ' + body.note : '') +
      (nextStage ? ` Next: ${nextStage.name}.` : ' Order delivered.'),
    visibleToCustomer: body.visibleToCustomer !== false,
  });

  return order;
}
