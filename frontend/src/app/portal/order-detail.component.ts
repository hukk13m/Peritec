import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../shared/toast.service';
import { badgeClass, fmtDate, fmtDateTime, orderStatus, pdfUrl, stageName } from '../shared/ui';

@Component({
  selector: 'app-portal-order-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (order(); as o) {
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a routerLink="/portal/orders" class="text-xs font-semibold text-brand hover:underline">← Danh sách đơn hàng</a>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-extrabold tracking-tight">{{ o.orderCode }}</h1>
            <span class="badge" [class]="badge(o.status)">{{ label(o.status) }}</span>
          </div>
          <p class="mt-1 text-xs text-muted">Đơn nhập khẩu · Tạo ngày {{ fmtDate(o.createdAt) }}</p>
        </div>
        <div class="flex gap-2">
          @for (doc of docs(); track doc.id) {
            <a [href]="pdf(doc.fileUrl)" target="_blank" class="btn-secondary btn-sm">{{ docLabel(doc.fileType) }}</a>
          }
        </div>
      </div>

      <div class="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Tiến độ 5 chặng</p>
              <p class="text-[11px] text-muted">Ngày dự kiến giao: <span class="font-bold text-ink">{{ fmtDate(o.etaDate) }}</span></p>
            </div>

            <div class="mt-4 flex items-center">
              @for (s of o.stages; track s.stageNo) {
                <div class="flex flex-1 flex-col items-center">
                  <div class="flex w-full items-center">
                    <span class="h-0.5 flex-1" [class.bg-brand]="s.stageNo > 1" [class.bg-line]="s.stageNo === 1"></span>
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                          [class.border-brand]="s.status !== 'not_started'"
                          [class.bg-brand]="s.status === 'complete'"
                          [class.text-white]="s.status === 'complete'"
                          [class.bg-white]="s.status !== 'complete'"
                          [class.text-brand]="s.status === 'current'"
                          [class.border-line]="s.status === 'not_started'"
                          [class.text-slate-400]="s.status === 'not_started'">
                      {{ s.status === 'complete' ? '✓' : s.stageNo }}
                    </span>
                    <span class="h-0.5 flex-1" [class.bg-brand]="s.stageNo < o.currentStage" [class.bg-line]="s.stageNo >= o.currentStage"></span>
                  </div>
                  <p class="mt-2 px-1 text-center text-[10px] font-semibold leading-tight" [class.text-ink]="s.status !== 'not_started'" [class.text-muted]="s.status === 'not_started'">
                    {{ stageTitle(s.name) }}
                  </p>
                  <p class="mt-0.5 text-[10px] text-muted">{{ s.actualDate ? fmtDate(s.actualDate) : s.plannedDate ? fmtDate(s.plannedDate) : '—' }}</p>
                </div>
              }
            </div>

            <div class="mt-4 rounded-md bg-warn-soft p-3 text-[11px] leading-relaxed text-warn">
              {{ o.etaNote }}
            </div>
          </div>

          <div class="card overflow-hidden">
            <div class="border-b border-line px-5 py-3"><p class="text-sm font-bold">Thiết bị trong đơn</p></div>
            <table class="table-base">
              <thead><tr><th>Thiết bị</th><th>SL</th><th>Cấu hình</th><th>Trạng thái</th></tr></thead>
              <tbody>
                @for (i of o.items; track i.sku) {
                  <tr>
                    <td><p class="text-xs font-bold">{{ i.sku }}</p><p class="text-[11px] text-muted">{{ i.name }}</p></td>
                    <td class="font-semibold">{{ i.quantity }}</td>
                    <td class="text-xs text-muted">{{ i.configRef || 'Theo báo giá' }}</td>
                    <td><span class="badge bg-brand-soft text-brand-dark">{{ i.itemStatus }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Cập nhật giao vận</p>
            <div class="mt-3 space-y-3">
              @for (log of o.logs; track log.id) {
                <div class="flex gap-3">
                  <span class="mt-1 h-2 w-2 shrink-0 rounded-full" [class.bg-warn]="log.logType === 'eta'" [class.bg-brand]="log.logType !== 'eta'"></span>
                  <div>
                    <p class="text-xs leading-relaxed text-ink">{{ log.content }}</p>
                    <p class="mt-0.5 text-[11px] text-muted">{{ fmtDateTime(log.createdAt) }}</p>
                  </div>
                </div>
              }
              @if (!o.logs.length) { <p class="text-xs text-muted">Chưa có cập nhật.</p> }
            </div>
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <p class="text-sm font-bold">Thông tin giao hàng</p>
            <div class="mt-3 space-y-2 text-xs">
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Người nhận</p><p class="font-semibold text-ink">{{ o.recipientName }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Điện thoại</p><p class="text-ink">{{ o.recipientPhone }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Email</p><p class="text-ink">{{ o.recipientEmail }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Địa chỉ</p><p class="text-ink">{{ o.deliveryAddress }}</p></div>
              <span class="badge" [class]="o.addressStatus === 'confirmed' ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn'">
                {{ o.addressStatus === 'confirmed' ? 'Địa chỉ đã xác nhận' : 'Chờ xác nhận địa chỉ' }}
              </span>
            </div>
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Tài liệu đơn hàng</p>
            <div class="mt-3 space-y-2">
              @for (doc of docs(); track doc.id) {
                <a [href]="pdf(doc.fileUrl)" target="_blank" class="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs hover:border-brand">
                  <span class="truncate">{{ doc.fileName }}</span>
                  <span class="font-bold text-brand">PDF</span>
                </a>
              }
              @if (!docs().length) { <p class="text-xs text-muted">Chưa có tài liệu.</p> }
            </div>
          </div>

          <div class="card p-4 text-[11px] leading-relaxed text-muted">
            Thông tin theo dõi giao hàng không bao gồm giá hoặc ghi chú nội bộ. Ngày dự kiến có thể thay đổi do vận chuyển và thông quan.
          </div>
        </aside>
      </div>
    } @else {
      <div class="h-96 skeleton"></div>
    }
  `,
})
export class PortalOrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  order = signal<any>(null);
  docs = signal<any[]>([]);
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  stageTitle = stageName;
  label = orderStatus;
  badge = badgeClass;

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.get<any>(`/portal/orders/${code}`).subscribe({
      next: (r) => {
        this.order.set(r);
        this.docs.set(r.documents || []);
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  pdf(url?: string) {
    return pdfUrl(url, this.auth.token());
  }

  docLabel(type?: string) {
    const map: Record<string, string> = {
      quotation: 'Báo giá',
      order_confirmation: 'Xác nhận đơn',
      equipment_list: 'Danh mục thiết bị',
      delivery_document: 'Chứng từ giao hàng',
    };
    return (type && map[type]) || 'Tài liệu';
  }
}
