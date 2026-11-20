import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { fmtDate, pdfUrl } from '../shared/ui';

const FILE_TYPES: Record<string, string> = {
  quotation: 'Báo giá',
  order_confirmation: 'Xác nhận đơn hàng',
  equipment_list: 'Danh mục thiết bị',
  delivery_document: 'Chứng từ giao hàng',
};

@Component({
  selector: 'app-portal-documents',
  standalone: true,
  template: `
    <div>
      <p class="eyebrow">Tài liệu giao dịch</p>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Tài liệu của tôi</h1>
      <p class="mt-1 text-sm text-muted">Báo giá, xác nhận đơn hàng, danh mục thiết bị và chứng từ giao hàng.</p>
    </div>

    <div class="card mt-5 overflow-hidden">
      @if (loading()) {
        <div class="p-5"><div class="h-40 skeleton"></div></div>
      } @else {
        <table class="table-base">
          <thead><tr><th>Tài liệu</th><th>Loại</th><th>Ngày</th><th></th></tr></thead>
          <tbody>
            @for (doc of items(); track doc.id) {
              <tr>
                <td class="font-medium">{{ doc.fileName }}</td>
                <td><span class="badge bg-brand-soft text-brand-dark">{{ typeLabel(doc.fileType) }}</span></td>
                <td class="text-xs text-muted">{{ fmtDate(doc.uploadedAt) }}</td>
                <td class="text-right"><a [href]="pdf(doc.fileUrl)" target="_blank" class="btn-secondary btn-sm">Xem / Tải PDF</a></td>
              </tr>
            }
            @if (!items().length) {
              <tr><td colspan="4" class="py-10 text-center text-sm text-muted">Chưa có tài liệu nào được chia sẻ.</td></tr>
            }
          </tbody>
        </table>
      }
    </div>

    <div class="card mt-4 p-4 text-[11px] leading-relaxed text-muted">
      Tài liệu nội bộ của PERITEC không được hiển thị tại đây. Chỉ tài liệu được đánh dấu chia sẻ cho khách hàng mới xuất hiện.
    </div>
  `,
})
export class PortalDocumentsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  items = signal<any[]>([]);
  loading = signal(true);
  fmtDate = fmtDate;

  ngOnInit() {
    this.api.get<{ items: any[] }>('/portal/documents').subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  typeLabel(type: string) {
    return FILE_TYPES[type] || type;
  }

  pdf(url?: string) {
    return pdfUrl(url, this.auth.token());
  }
}
