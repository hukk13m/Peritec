export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${d.toLocaleTimeString(
    'vi-VN',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
}

export function fmtCurrency(value?: number | null, currency = 'VND'): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('vi-VN').format(value) + (currency === 'VND' ? ' ₫' : ' ' + currency);
}

const RFQ_STATUS: Record<string, string> = {
  new: 'Mới tiếp nhận',
  checking_configuration: 'Đang kiểm tra cấu hình',
  quote_sent: 'Đã gửi báo giá',
  needs_adjustment: 'Cần điều chỉnh',
  confirmed: 'Đã xác nhận',
  canceled: 'Đã hủy',
};

const QUOTE_STATUS: Record<string, string> = {
  draft: 'Bản nháp',
  sent: 'Đã gửi',
  customer_confirmed: 'Khách đã xác nhận',
  adjustment_requested: 'Yêu cầu điều chỉnh',
  expired: 'Hết hạn',
};

const ORDER_STATUS: Record<string, string> = {
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};

const STAGE_STATUS: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  current: 'Đang thực hiện',
  complete: 'Hoàn thành',
};

const CHECK_STATUS: Record<string, string> = {
  not_tested: 'Chưa kiểm tra',
  tested: 'Đã kiểm tra',
  need_clarification: 'Cần làm rõ',
};

const COMPANY_STATUS: Record<string, string> = {
  pending_verification: 'Chờ xác minh',
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
};

export function rfqStatus(status: string) {
  return RFQ_STATUS[status] || status;
}
export function quoteStatus(status: string) {
  return QUOTE_STATUS[status] || status;
}
export function orderStatus(status: string) {
  return ORDER_STATUS[status] || status;
}
export function stageStatus(status: string) {
  return STAGE_STATUS[status] || status;
}
export function checkStatus(status?: string) {
  return CHECK_STATUS[status || 'not_tested'] || status || '';
}
export function companyStatus(status?: string) {
  return COMPANY_STATUS[status || ''] || status || '';
}

export function badgeClass(status?: string): string {
  switch (status) {
    case 'new':
    case 'not_started':
    case 'draft':
      return 'bg-slate-100 text-slate-700';
    case 'checking_configuration':
    case 'current':
    case 'processing':
      return 'bg-brand-soft text-brand-dark';
    case 'quote_sent':
    case 'sent':
      return 'bg-indigo-50 text-indigo-700';
    case 'needs_adjustment':
    case 'need_clarification':
    case 'adjustment_requested':
    case 'pending_verification':
      return 'bg-warn-soft text-warn';
    case 'confirmed':
    case 'customer_confirmed':
    case 'complete':
    case 'delivered':
    case 'tested':
    case 'active':
      return 'bg-success-soft text-success';
    case 'expired':
    case 'canceled':
    case 'locked':
      return 'bg-danger-soft text-danger';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function stageName(name: string): string {
  const map: Record<string, string> = {
    'Order confirmation': 'Xác nhận đơn hàng',
    'Supplier order': 'Đặt hàng nhà cung cấp',
    'International shipping': 'Vận chuyển quốc tế',
    'Customs clearance': 'Thông quan',
    Delivery: 'Giao hàng',
  };
  return map[name] || name;
}

export function pdfUrl(url?: string | null, token?: string | null): string {
  if (!url) return '';
  if (!token) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
}

export function roleLabel(role?: string): string {
  const map: Record<string, string> = {
    admin: 'Quản trị viên',
    sales: 'Kinh doanh',
    engineering: 'Kỹ thuật',
    customer: 'Khách hàng',
  };
  return map[role || ''] || role || '';
}
