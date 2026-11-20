import type { AuthUser } from '../middleware/auth.js';

export function publicUser(user: any): AuthUser | null {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId ? String(user.companyId) : null,
    phone: user.phone,
    position: user.position,
  };
}

export function companyPublic(c: any) {
  if (!c) return null;
  return {
    id: String(c._id),
    code: c.code,
    name: c.name,
    taxCode: c.taxCode,
    industry: c.industry,
    address: c.address,
    website: c.website,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    status: c.status,
  };
}

export function productPublic(p: any) {
  if (!p) return null;
  return {
    id: String(p._id),
    sku: p.sku,
    model: p.model,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    category: p.category,
    primaryApplicationCode: p.primaryApplicationCode,
    applicationIds: (p.applicationIds || []).map((x: any) => String(x?._id || x)),
    shortDescription: p.shortDescription,
    description: p.description,
    image: p.image,
    specs: (p.specs || []).map((s: any) => ({
      group: s.group,
      label: s.label,
      value: s.confirmed ? s.value : null,
      unit: s.unit,
      confirmed: !!s.confirmed,
      note: s.confirmed ? s.note : 'Need to confirm according to datasheet/configuration',
    })),
    documents: (p.documents || []).map((d: any) => ({
      name: d.name,
      type: d.type,
      version: d.version,
      language: d.language,
      access: d.access,
      url: d.url,
    })),
    configurations: p.configurations || [],
    relatedSkus: p.relatedSkus || [],
    availability: p.availability,
  };
}

export function rfqCustomerView(rfq: any, extras: any = {}) {
  const items = (rfq.items || []).map((i: any) => ({
    id: String(i._id),
    sku: i.sku,
    name: i.name,
    brand: i.brand,
    quantity: i.quantity,
    configRequest: i.configRequest,
    itemNote: i.itemNote,
    checkStatus: i.checkStatus,
    // BR-12: no checklist author, no internal technical notes
  }));
  return {
    id: String(rfq._id),
    rfqCode: rfq.rfqCode,
    companyName: rfq.companyName,
    contactName: rfq.contactName,
    contactPosition: rfq.contactPosition,
    contactEmail: rfq.contactEmail,
    contactPhone: rfq.contactPhone,
    technicalNote: rfq.technicalNote,
    status: rfq.status,
    createdAt: rfq.createdAt,
    updatedAt: rfq.updatedAt,
    items,
    // BR-12: assignment (salesId / technicianId) is not exposed to customers
    ...extras,
  };
}

export function quoteCustomerView(q: any) {
  if (!q) return null;
  return {
    id: String(q._id),
    quoteCode: q.quoteCode,
    versionNo: q.versionNo,
    status: q.status,
    validUntil: q.validUntil,
    sentAt: q.sentAt,
    quoteFileUrl: q.quoteFileUrl,
    // BR-12: no totalAmount, unitPrice, sentBy, internal note
    items: (q.items || []).map((i: any) => ({
      sku: i.sku,
      name: i.name,
      quantity: i.quantity,
      configRequest: i.configRequest,
    })),
  };
}

export function quoteInternalView(q: any) {
  if (!q) return null;
  return {
    id: String(q._id),
    quoteCode: q.quoteCode,
    rootQuoteId: q.rootQuoteId ? String(q.rootQuoteId) : null,
    versionNo: q.versionNo,
    rfqId: String(q.rfqId),
    status: q.status,
    validUntil: q.validUntil,
    totalAmount: q.totalAmount,
    currency: q.currency,
    sentAt: q.sentAt,
    sentBy: q.sentBy ? String(q.sentBy) : null,
    sentToEmail: q.sentToEmail,
    quoteFileUrl: q.quoteFileUrl,
    configFileUrl: q.configFileUrl,
    note: q.note,
    items: q.items || [],
    createdAt: q.createdAt,
  };
}

export function logView(log: any, forCustomer: boolean) {
  return {
    id: String(log._id),
    logType: log.logType,
    content: log.content,
    attachmentUrl: log.attachmentUrl,
    visibleToCustomer: log.visibleToCustomer,
    actorName: log.actorName || (forCustomer ? 'PERITEC' : null),
    createdAt: log.createdAt,
    ...(forCustomer ? {} : { userId: log.userId ? String(log.userId) : null }),
  };
}

export function orderCustomerView(order: any, logs: any[] = [], docs: any[] = []) {
  if (!order) return null;
  return {
    id: String(order._id),
    orderCode: order.orderCode,
    isImport: order.isImport,
    currentStage: order.currentStage,
    etaDate: order.etaDate,
    etaNote: order.etaNote,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    recipientEmail: order.recipientEmail,
    deliveryAddress: order.deliveryAddress,
    addressStatus: order.addressStatus,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // BR-12: delivery tracking never shows prices
    items: (order.items || []).map((i: any) => ({
      sku: i.sku,
      name: i.name,
      quantity: i.quantity,
      configRef: i.configRef,
      itemStatus: i.itemStatus,
    })),
    stages: (order.stages || []).map((s: any) => ({
      stageNo: s.stageNo,
      name: s.name,
      plannedDate: s.plannedDate,
      actualDate: s.actualDate,
      status: s.status,
      note: s.note,
    })),
    logs: logs.map((l) => logView(l, true)),
    documents: docs,
  };
}

export function orderInternalView(order: any) {
  if (!order) return null;
  return {
    ...JSON.parse(JSON.stringify(order)),
    id: String(order._id),
    quoteId: order.quoteId ? String(order.quoteId) : null,
    rfqId: order.rfqId ? String(order.rfqId) : null,
    companyId: order.companyId ? String(order.companyId) : null,
  };
}

/** Strip internal quote fields from an order object before JSON output. */
export function stripQuotePrices(quote: any) {
  if (!quote) return null;
  const { totalAmount, currency, items, ...rest } = quote;
  return {
    ...rest,
    items: (items || []).map((i: any) => ({
      sku: i.sku,
      name: i.name,
      quantity: i.quantity,
      configRequest: i.configRequest,
    })),
  };
}
