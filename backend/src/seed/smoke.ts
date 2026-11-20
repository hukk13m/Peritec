/**
 * End-to-end smoke test for the PERITEC MVP.
 * Run the API on :3000 first, then: npm run smoke
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:3000/api';
const PASSWORD = 'Peritec@123';

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`, extra ? JSON.stringify(extra).slice(0, 300) : '');
  }
}

async function api(method: string, path: string, opts: { token?: string; body?: any } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* pdf / empty */
  }
  return { status: res.status, body: json };
}

async function login(email: string) {
  const r = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
  return r.body.token as string;
}

async function main() {
  console.log('\nPERITEC MVP smoke test\n' + '='.repeat(48));

  const health = await api('GET', '/health');
  ok('health endpoint reports connected DB', health.status === 200 && health.body.db === 'connected', health.body);

  const admin = await login('admin@peritec.vn');
  const sales = await login('sales@peritec.vn');
  const engineering = await login('engineering@peritec.vn');
  const customer = await login('customer@anviet.example');
  ok('all four seeded accounts can log in', !!admin && !!sales && !!engineering && !!customer);

  /* ---------------- public catalogue ---------------- */
  const list = await api('GET', '/products?application=RF');
  ok('filter by RF application returns HAROGIC devices', list.status === 200 && list.body.items.length >= 3, list.body?.total);

  const all = await api('GET', '/products');
  const san45 = all.body.items.find((p: any) => p.sku === 'SAN-45');
  const san60 = all.body.items.find((p: any) => p.sku === 'SAN-60');
  const san90 = all.body.items.find((p: any) => p.sku === 'SAN-90');
  const daq = all.body.items.find((p: any) => p.sku === 'NI-MIODAQ-8');

  const cmp = await api('POST', '/products/compare', {
    body: { ids: [san45.id, san60.id, san90.id] },
  });
  ok('compare 3 devices in same group', cmp.status === 200 && cmp.body.products.length === 3);
  const unconfirmedRow = cmp.body?.rows?.find((r: any) => r.cells.some((c: any) => !c.confirmed));
  ok(
    'BR-13: unconfirmed parameter is not auto-filled',
    !!unconfirmedRow && unconfirmedRow.cells.some((c: any) => /Need to confirm/.test(c.display))
  );

  const cmp4 = await api('POST', '/products/compare', { body: { ids: [san45.id, san60.id, san90.id, daq.id] } });
  ok('BR-13: more than 3 devices is rejected (400)', cmp4.status === 400, cmp4.body);

  const cmpGroup = await api('POST', '/products/compare', { body: { ids: [san45.id, daq.id] } });
  ok('BR-13: cross-group comparison is rejected (400)', cmpGroup.status === 400, cmpGroup.body);

  /* ---------------- RFQ validation ---------------- */
  const baseRfq = {
    companyName: 'Công ty TNHH Kỹ thuật An Việt',
    contactName: 'Nguyễn Minh Anh',
    contactEmail: 'minh.anh@anviet.example',
    contactPhone: '090 123 4567',
    privacyConsent: true,
    items: [{ productId: san45.id, quantity: 1 }],
  };

  const noItems = await api('POST', '/rfqs', { body: { ...baseRfq, items: [] } });
  ok('BR-02: RFQ with no device is rejected (422)', noItems.status === 422, noItems.body);

  const badQty = await api('POST', '/rfqs', {
    body: { ...baseRfq, items: [{ productId: san45.id, quantity: 0 }] },
  });
  ok('BR-02: quantity below 1 is rejected (422)', badQty.status === 422, badQty.body);

  const noConsent = await api('POST', '/rfqs', { body: { ...baseRfq, privacyConsent: false } });
  ok('BR-03: missing privacy consent is rejected (422)', noConsent.status === 422, noConsent.body);

  const noPhone = await api('POST', '/rfqs', { body: { ...baseRfq, contactPhone: '' } });
  ok('BR-03: missing phone is rejected (422)', noPhone.status === 422, noPhone.body);

  const created = await api('POST', '/rfqs', {
    token: customer,
    body: { ...baseRfq, items: [{ productId: san45.id, quantity: 2 }, { productId: san90.id, quantity: 1 }] },
  });
  ok('BR-05: valid RFQ returns RFQ-YYMMDD-NNN', created.status === 201 && /^RFQ-\d{6}-\d{3}$/.test(created.body?.rfqCode || ''), created.body);
  const testRfqCode = created.body?.rfqCode;

  const summary = await api('GET', `/rfqs/${testRfqCode}/summary`);
  ok('public success lookup works without leaking prices', summary.status === 200 && !!summary.body.rfqCode && !('items' in (summary.body || {})));

  /* ---------------- customer portal scope (BR-12) ---------------- */
  const own = await api('GET', `/portal/rfqs/${testRfqCode}`, { token: customer });
  ok('customer sees own RFQ', own.status === 200 && own.body.rfqCode === testRfqCode);

  const cross = await api('GET', '/portal/rfqs/RFQ-261119-001', { token: customer });
  ok('BR-12: cross-company RFQ access is denied (403)', cross.status === 403, cross.body);

  const orderOwn = await api('GET', '/portal/orders/PO-261018-006', { token: customer });
  ok('customer sees own PO', orderOwn.status === 200 && orderOwn.body.orderCode === 'PO-261018-006');
  const orderText = JSON.stringify(orderOwn.body);
  ok(
    'BR-12: delivery tracking hides prices and internal notes',
    !/totalAmount|unitPrice|"amount"|Forwarder báo tàu trễ/.test(orderText)
  );
  ok('BR-11: seeded PO exposes 5 ordered stages', orderOwn.body.stages?.length === 5);

  /* ---------------- internal workspace ---------------- */
  const queue = await api('GET', '/workspace/rfqs', { token: sales });
  ok('sales sees the RFQ queue', queue.status === 200 && queue.body.total >= 4);

  const wsDetail = await api('GET', `/workspace/rfqs/${testRfqCode}`, { token: sales });
  const rfqId = wsDetail.body?.id;
  ok('workspace detail returns internal view', wsDetail.status === 200 && !!rfqId);

  const assign = await api('PATCH', `/workspace/rfqs/${rfqId}/assign`, {
    token: sales,
    body: {
      salesId: queue.body.items.find((i: any) => i.rfqCode === testRfqCode) ? (await api('GET', '/workspace/users?role=sales', { token: sales })).body.items[0].id : null,
      technicianId: (await api('GET', '/workspace/users?role=engineering', { token: sales })).body.items[0].id,
    },
  });
  ok('FR-18: assignment saves sales + engineering', assign.status === 200 && !!assign.body.technicianId, assign.body);

  const engQuote = await api('POST', '/quotations', {
    token: engineering,
    body: { rfqId, validUntil: '2026-12-31', totalAmount: 100 },
  });
  ok('BR-08: engineering cannot create a quotation (403)', engQuote.status === 403, engQuote.body);

  const engAssign = await api('PATCH', `/workspace/rfqs/${rfqId}/assign`, {
    token: engineering,
    body: { salesId: null },
  });
  ok('BR-08: engineering cannot reassign requests (403)', engAssign.status === 403, engAssign.body);

  const engCheck = await api('PATCH', `/workspace/rfqs/${rfqId}/items/${wsDetail.body.items[0].id}/check`, {
    token: engineering,
    body: { checkStatus: 'tested', note: 'Đã kiểm tra cấu hình.' },
  });
  ok('FR-19: engineering can record a technical check', engCheck.status === 200, engCheck.body);

  /* ---------------- quotation versioning (BR-09) ---------------- */
  const quote = await api('POST', '/quotations', {
    token: sales,
    body: { rfqId, validUntil: '2026-12-31', totalAmount: 320000000, currency: 'VND' },
  });
  ok('BR-05: sales creates quotation BG-YYMMDD-NNN', quote.status === 201 && /^BG-\d{6}-\d{3}$/.test(quote.body?.quoteCode || ''), quote.body);
  const quoteId = quote.body?.id;

  const duplicate = await api('POST', '/quotations', {
    token: sales,
    body: { rfqId, validUntil: '2026-12-31', totalAmount: 1 },
  });
  ok('BR-09: overwriting v1 is prevented, revise is required (409)', duplicate.status === 409, duplicate.body);

  const sent = await api('POST', `/quotations/${quoteId}/send`, { token: sales });
  ok('sales sends quotation to customer', sent.status === 200 && sent.body.quote.status === 'sent', sent.body);

  const engSend = await api('POST', `/quotations/${quoteId}/send`, { token: engineering });
  ok('BR-08: engineering cannot send a quotation (403)', engSend.status === 403, engSend.body);

  const revised = await api('POST', `/quotations/${quoteId}/revise`, {
    token: sales,
    body: { totalAmount: 330000000, validUntil: '2026-12-31' },
  });
  ok('BR-09: adjustment creates version 2', revised.status === 201 && revised.body.versionNo === 2, revised.body);

  const versions = await api('GET', `/workspace/rfqs/${rfqId}`, { token: sales });
  ok('BR-09: v1 is preserved alongside v2', versions.body.quotes?.length === 2 && versions.body.quotes[0].status === 'sent');

  const immutable = await api('PUT', `/quotations/${quoteId}`, { token: sales, body: { totalAmount: 1 } });
  ok('BR-09: PUT on a sent quote returns 409', immutable.status === 409, immutable.body);

  /* ---------------- confirm -> order (BR-10) ---------------- */
  const confirm = await api('POST', `/portal/quotations/${quoteId}/confirm`, { token: customer });
  ok('customer confirms the quotation', confirm.status === 200 && confirm.body.quote.status === 'customer_confirmed', confirm.body);

  const orderByCustomer = await api('POST', '/orders', {
    token: customer,
    body: {
      quoteId,
      recipientName: 'Nguyễn Minh Anh',
      recipientPhone: '090 123 4567',
      deliveryAddress: 'Lô B12, KCN Tân Bình, TP.HCM',
    },
  });
  ok('customer cannot create an order (403)', orderByCustomer.status === 403, orderByCustomer.body);

  const order = await api('POST', '/orders', {
    token: sales,
    body: {
      quoteId,
      recipientName: 'Nguyễn Minh Anh',
      recipientPhone: '090 123 4567',
      recipientEmail: 'minh.anh@anviet.example',
      deliveryAddress: 'Lô B12, KCN Tân Bình, TP.HCM',
      etaDate: '2026-12-20',
    },
  });
  ok('BR-10: order is created from a confirmed quote', order.status === 201 && /^PO-\d{6}-\d{3}$/.test(order.body?.orderCode || ''), order.body);
  const orderCode = order.body?.orderCode;
  ok('BR-11: order starts with 5 generated stages', order.body?.stages?.length === 5 && order.body.currentStage === 1);

  const skipStage = await api('PATCH', `/orders/${orderCode}/stages/5`, { token: sales, body: { note: 'skip' } });
  ok('BR-11: completing stage 5 first is rejected (409)', skipStage.status === 409, skipStage.body);

  const noReason = await api('PATCH', `/orders/${orderCode}/eta`, {
    token: sales,
    body: { etaDate: '2026-12-28' },
  });
  ok('BR-11: ETA change without reason is rejected (422)', noReason.status === 422, noReason.body);

  const eta = await api('PATCH', `/orders/${orderCode}/eta`, {
    token: sales,
    body: { etaDate: '2026-12-28', reason: 'Nhà sản xuất điều chỉnh lịch giao.' },
  });
  ok('BR-11: ETA change with reason is logged', eta.status === 200);

  const stage1 = await api('PATCH', `/orders/${orderCode}/stages/1`, {
    token: sales,
    body: { note: 'Đã xác nhận đơn với khách hàng.' },
  });
  ok('BR-11: stage 1 completes and moves to stage 2', stage1.status === 200 && stage1.body.currentStage === 2, stage1.body?.currentStage);

  const internalNote = await api('POST', `/workspace/rfqs/${rfqId}/logs`, {
    token: engineering,
    body: { logType: 'internal', content: 'SMOKE-INTERNAL-NOTE không được hiện cho khách.' },
  });
  ok('internal note is stored', internalNote.status === 201);

  const customerRfq = await api('GET', `/portal/rfqs/${testRfqCode}`, { token: customer });
  ok(
    'BR-12: internal notes are hidden from the customer',
    !JSON.stringify(customerRfq.body).includes('SMOKE-INTERNAL-NOTE')
  );

  const engineeringCustomerNote = await api('POST', `/workspace/rfqs/${rfqId}/logs`, {
    token: engineering,
    body: { logType: 'customer', content: 'should fail' },
  });
  ok('BR-08: engineering cannot publish customer-facing messages (403)', engineeringCustomerNote.status === 403);

  /* ---------------- files ---------------- */
  const pdf = await fetch(`${BASE}/files/quotation/BG-261105-001.pdf?token=${customer}`);
  const pdfBuf = Buffer.from(await pdf.arrayBuffer());
  ok(
    'customer downloads own quotation PDF',
    pdf.status === 200 && pdf.headers.get('content-type')?.includes('pdf') && pdfBuf.slice(0, 4).toString() === '%PDF'
  );
  const otherPdf = await fetch(`${BASE}/files/quotation/BG-261105-001.pdf?token=${engineering}`);
  ok('staff can download quotation PDF', otherPdf.status === 200);

  console.log('\n' + '='.repeat(48));
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err);
  process.exit(1);
});
