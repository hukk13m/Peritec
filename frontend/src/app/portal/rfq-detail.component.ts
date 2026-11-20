import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../shared/toast.service';
import { badgeClass, fmtDate, fmtDateTime, pdfUrl, quoteStatus, rfqStatus } from '../shared/ui';

@Component({
  selector: 'app-portal-rfq-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (rfq(); as r) {
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a routerLink="/portal/rfqs" class="text-xs font-semibold text-brand hover:underline">← Danh sách yêu cầu</a>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-extrabold tracking-tight">{{ r.rfqCode }}</h1>
            <span class="badge" [class]="rfqBadge(r.status)">{{ rfqLabel(r.status) }}</span>
          </div>
          <p class="mt-1 text-xs text-muted">Gửi ngày {{ fmtDateTime(r.createdAt) }} · {{ r.contactName }} · {{ r.contactEmail }}</p>
        </div>
        @if (r.order; as o) {
          <a [routerLink]="['/portal/orders', o.orderCode]" class="btn-primary btn-sm">Xem đơn hàng {{ o.orderCode }} →</a>
        }
      </div>

      <div class="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-5">
          <div class="card overflow-hidden">
            <div class="border-b border-line px-5 py-3"><p class="text-sm font-bold">Thiết bị yêu cầu</p></div>
            <div class="overflow-x-auto">
              <table class="table-base min-w-[560px]">
                <thead><tr><th>Thiết bị</th><th>SL</th><th>Cấu hình yêu cầu</th><th>Kiểm tra kỹ thuật</th></tr></thead>
                <tbody>
                  @for (i of r.items; track i.id) {
                    <tr>
                      <td><p class="text-xs font-bold">{{ i.sku }}</p><p class="text-[11px] text-muted">{{ i.name }}</p></td>
                      <td class="font-semibold">{{ i.quantity }}</td>
                      <td class="text-xs text-muted">{{ i.configRequest || '—' }}</td>
                      <td><span class="badge" [class]="checkBadge(i.checkStatus)">{{ checkLabel(i.checkStatus) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (r.technicalNote) {
              <div class="border-t border-line bg-canvas px-5 py-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-muted">Yêu cầu kỹ thuật</p>
                <p class="mt-1 text-xs leading-relaxed text-ink">{{ r.technicalNote }}</p>
              </div>
            }
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold">Báo giá đã nhận</p>
              <span class="text-[11px] text-muted">{{ r.quotes.length }} phiên bản</span>
            </div>
            @if (!r.quotes.length) {
              <p class="mt-3 rounded-md bg-canvas p-3 text-xs text-muted">PERITEC đang kiểm tra cấu hình và chuẩn bị báo giá.</p>
            }
            <div class="mt-3 space-y-3">
              @for (q of r.quotes; track q.id) {
                <div class="rounded-md border p-4" [class.border-brand]="q.status === 'sent' && !q.expired" [class.border-line]="q.status !== 'sent' || q.expired">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="text-sm font-bold">{{ q.quoteCode }} <span class="text-xs font-normal text-muted">v{{ q.versionNo }}</span></p>
                      <p class="text-[11px] text-muted">Hiệu lực đến {{ fmtDate(q.validUntil) }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="badge" [class]="quoteBadge(q.expired ? 'expired' : q.status)">{{ quoteLabel(q.expired ? 'expired' : q.status) }}</span>
                      <a [href]="pdf(q.quoteFileUrl)" target="_blank" class="btn-secondary btn-sm">Tải PDF</a>
                    </div>
                  </div>
                  <div class="mt-2 text-xs text-muted">
                    @for (i of q.items; track i.sku) {
                      <span class="mr-3">{{ i.sku }} × {{ i.quantity }}</span>
                    }
                  </div>
                  @if (q.status === 'sent' && !q.expired) {
                    <div class="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      <button class="btn-primary btn-sm" (click)="confirmQuote(q.id)">Xác nhận báo giá</button>
                      <button class="btn-secondary btn-sm" (click)="startAdjust(q.id)">Yêu cầu điều chỉnh</button>
                    </div>
                    @if (adjusting() === q.id) {
                      <div class="mt-3 rounded-md bg-canvas p-3">
                        <label class="label">Nội dung cần điều chỉnh</label>
                        <textarea class="input" rows="2" name="adjustNote" [(ngModel)]="adjustNote" placeholder="Ví dụ: cần bổ sung cấu hình 10GbE..."></textarea>
                        <div class="mt-2 flex gap-2">
                          <button class="btn-primary btn-sm" (click)="sendAdjust(q.id)">Gửi yêu cầu</button>
                          <button class="btn-ghost btn-sm" (click)="adjusting.set('')">Hủy</button>
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Lịch sử cập nhật</p>
            <div class="mt-3 space-y-3">
              @for (log of r.logs; track log.id) {
                <div class="flex gap-3">
                  <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand"></span>
                  <div>
                    <p class="text-xs leading-relaxed text-ink">{{ log.content }}</p>
                    <p class="mt-0.5 text-[11px] text-muted">{{ fmtDateTime(log.createdAt) }} · {{ log.actorName || 'PERITEC' }}</p>
                  </div>
                </div>
              }
              @if (!r.logs.length) { <p class="text-xs text-muted">Chưa có cập nhật.</p> }
            </div>
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <p class="text-sm font-bold">Người liên hệ</p>
            <div class="mt-3 space-y-1.5 text-xs">
              <p class="font-semibold text-ink">{{ r.contactName }}</p>
              <p class="text-muted">{{ r.contactPosition || '—' }}</p>
              <p class="text-muted">{{ r.contactEmail }}</p>
              <p class="text-muted">{{ r.contactPhone }}</p>
            </div>
          </div>
          <div class="card bg-navy p-5 text-white">
            <p class="text-sm font-bold">Cần hỗ trợ?</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-300">Trao đổi với kỹ sư PERITEC về cấu hình trước khi xác nhận báo giá.</p>
            <a routerLink="/contact" class="mt-3 inline-block text-xs font-bold text-sky-300 hover:text-white">Gửi yêu cầu tư vấn →</a>
          </div>
        </aside>
      </div>
    } @else {
      <div class="h-96 skeleton"></div>
    }
  `,
})
export class PortalRfqDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  rfq = signal<any>(null);
  adjusting = signal('');
  adjustNote = '';
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  rfqLabel = rfqStatus;
  quoteLabel = quoteStatus;
  rfqBadge = badgeClass;
  quoteBadge = badgeClass;

  ngOnInit() {
    this.load();
  }

  load() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.get<any>(`/portal/rfqs/${code}`).subscribe({
      next: (r) => this.rfq.set(r),
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  pdf(url?: string) {
    return pdfUrl(url, this.auth.token());
  }

  checkLabel(status?: string) {
    return status === 'tested' ? 'Đã kiểm tra' : status === 'need_clarification' ? 'Cần làm rõ' : 'Đang kiểm tra';
  }
  checkBadge(status?: string) {
    return status === 'tested' ? 'bg-success-soft text-success' : status === 'need_clarification' ? 'bg-warn-soft text-warn' : 'bg-slate-100 text-slate-700';
  }

  confirmQuote(quoteId: string) {
    if (!window.confirm('Xác nhận báo giá này? PERITEC sẽ liên hệ để tạo đơn hàng.')) return;
    this.api.post<any>(`/portal/quotations/${quoteId}/confirm`, {}).subscribe({
      next: () => {
        this.toast.success('Đã xác nhận báo giá.');
        this.load();
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  startAdjust(quoteId: string) {
    this.adjusting.set(quoteId);
    this.adjustNote = '';
  }

  sendAdjust(quoteId: string) {
    this.api.post<any>(`/portal/quotations/${quoteId}/request-adjustment`, { note: this.adjustNote }).subscribe({
      next: () => {
        this.toast.success('Đã gửi yêu cầu điều chỉnh tới PERITEC.');
        this.adjusting.set('');
        this.load();
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }
}
