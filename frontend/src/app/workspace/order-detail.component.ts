import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../shared/toast.service';
import { badgeClass, fmtCurrency, fmtDate, fmtDateTime, orderStatus, pdfUrl, stageName } from '../shared/ui';

@Component({
  selector: 'app-workspace-order-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (data(); as d) {
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a routerLink="/workspace/orders" class="text-xs font-semibold text-brand hover:underline">← Danh sách đơn hàng</a>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-extrabold tracking-tight">{{ d.order.orderCode }}</h1>
            <span class="badge" [class]="badge(d.order.status)">{{ label(d.order.status) }}</span>
            @if (d.rfqCode) {
              <a [routerLink]="['/workspace/rfqs', d.rfqCode]" class="badge bg-brand-soft text-brand-dark hover:underline">RFQ: {{ d.rfqCode }}</a>
            }
          </div>
          <p class="mt-1 text-xs text-muted">{{ d.company?.name }} · Tạo {{ fmtDateTime(d.order.createdAt) }}</p>
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Tiến độ 5 chặng</p>
              <p class="text-[11px] text-muted">ETA: <span class="font-bold text-ink">{{ fmtDate(d.order.etaDate) }}</span></p>
            </div>
            <div class="mt-4 space-y-2">
              @for (s of d.order.stages; track s.stageNo) {
                <div class="rounded-md border p-3" [class.border-brand]="s.stageNo === d.order.currentStage" [class.bg-brand-soft]="s.stageNo === d.order.currentStage" [class.border-line]="s.stageNo !== d.order.currentStage">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="flex items-start gap-2.5">
                      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            [class.bg-success]="s.status === 'complete'" [class.text-white]="s.status === 'complete'"
                            [class.bg-brand]="s.status === 'current'" [class.text-white]="s.status === 'current'"
                            [class.bg-canvas]="s.status === 'not_started'" [class.text-muted]="s.status === 'not_started'">
                        {{ s.status === 'complete' ? '✓' : s.stageNo }}
                      </span>
                      <div>
                        <p class="text-xs font-bold">{{ s.stageNo }}. {{ stageTitle(s.name) }}</p>
                        <p class="text-[11px] text-muted">
                          Kế hoạch {{ fmtDate(s.plannedDate) }}
                          @if (s.actualDate) { · Thực tế {{ fmtDate(s.actualDate) }} }
                          @if (s.note) { · {{ s.note }} }
                        </p>
                      </div>
                    </div>
                    @if (s.stageNo === d.order.currentStage && canOperate()) {
                      <div class="flex flex-wrap items-center gap-1.5">
                        <input class="input !w-auto !py-1 text-[11px]" placeholder="Ghi chú chặng" [ngModel]="stageNotes()[s.stageNo] || ''" (ngModelChange)="setStageNote(s.stageNo, $event)" [ngModelOptions]="{ standalone: true }" />
                        <button class="btn-primary btn-sm" (click)="completeStage(s.stageNo)">Hoàn thành chặng</button>
                      </div>
                    } @else {
                      <span class="badge" [class]="s.status === 'complete' ? 'bg-success-soft text-success' : s.status === 'current' ? 'bg-brand-soft text-brand-dark' : 'bg-slate-100 text-slate-600'">
                        {{ s.status === 'complete' ? 'Hoàn thành' : s.status === 'current' ? 'Đang thực hiện' : 'Chưa bắt đầu' }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
            <p class="mt-3 rounded-md bg-warn-soft p-2.5 text-[11px] leading-relaxed text-warn">
              Chỉ được hoàn thành tuần tự từng chặng. Đổi ETA bắt buộc nhập lý do và được ghi vào lịch sử.
            </p>
          </div>

          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Thay đổi ngày dự kiến (ETA)</p>
              <span class="text-[11px] text-muted">Hiện tại: {{ fmtDate(d.order.etaDate) }}</span>
            </div>
            @if (canOperate()) {
              <div class="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                <input type="date" class="input !py-1.5 text-xs" [ngModel]="etaDate" (ngModelChange)="etaDate = $event" [ngModelOptions]="{ standalone: true }" />
                <input class="input !py-1.5 text-xs" placeholder="Lý do thay đổi ETA (bắt buộc)" [ngModel]="etaReason" (ngModelChange)="etaReason = $event" [ngModelOptions]="{ standalone: true }" />
                <button class="btn-primary btn-sm" (click)="saveEta()">Cập nhật ETA</button>
              </div>
            } @else {
              <p class="mt-2 text-[11px] text-muted">Chỉ Sales/Admin được cập nhật ETA.</p>
            }
          </div>

          <div class="card overflow-hidden">
            <div class="border-b border-line px-5 py-3"><p class="text-sm font-bold">Thiết bị</p></div>
            <table class="table-base">
              <thead><tr><th>Thiết bị</th><th>SL</th><th>Cấu hình</th><th>Trạng thái</th></tr></thead>
              <tbody>
                @for (i of d.order.items; track i.sku) {
                  <tr>
                    <td><p class="text-xs font-bold">{{ i.sku }}</p><p class="text-[11px] text-muted">{{ i.name }}</p></td>
                    <td class="font-semibold">{{ i.quantity }}</td>
                    <td class="text-xs text-muted">{{ i.configRef || '—' }}</td>
                    <td><span class="badge bg-brand-soft text-brand-dark">{{ i.itemStatus }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Lịch sử xử lý</p>
            <div class="mt-3 space-y-3">
              @for (log of d.logs; track log.id) {
                <div class="flex gap-3">
                  <span class="mt-1 h-2 w-2 shrink-0 rounded-full" [class.bg-warn]="log.logType === 'eta'" [class.bg-brand]="log.logType !== 'eta'"></span>
                  <div>
                    <p class="text-xs leading-relaxed">{{ log.content }}</p>
                    <p class="mt-0.5 text-[11px] text-muted">{{ fmtDateTime(log.createdAt) }} · {{ log.actorName }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <p class="text-sm font-bold">Giao hàng</p>
            <div class="mt-3 space-y-3">
              <div><label class="label">Người nhận</label><input class="input text-xs" [ngModel]="delivery.recipientName" (ngModelChange)="delivery.recipientName = $event" [ngModelOptions]="{ standalone: true }" /></div>
              <div><label class="label">Điện thoại</label><input class="input text-xs" [ngModel]="delivery.recipientPhone" (ngModelChange)="delivery.recipientPhone = $event" [ngModelOptions]="{ standalone: true }" /></div>
              <div><label class="label">Email</label><input class="input text-xs" [ngModel]="delivery.recipientEmail" (ngModelChange)="delivery.recipientEmail = $event" [ngModelOptions]="{ standalone: true }" /></div>
              <div><label class="label">Địa chỉ</label><textarea class="input text-xs" rows="2" [ngModel]="delivery.deliveryAddress" (ngModelChange)="delivery.deliveryAddress = $event" [ngModelOptions]="{ standalone: true }"></textarea></div>
              <label class="flex items-center gap-2 text-xs"><input type="checkbox" class="accent-brand" [ngModel]="delivery.confirmed" (ngModelChange)="delivery.confirmed = $event" [ngModelOptions]="{ standalone: true }" /> Địa chỉ đã xác nhận</label>
              @if (canOperate()) { <button class="btn-primary btn-sm w-full" (click)="saveDelivery()">Lưu thông tin giao</button> }
            </div>
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Báo giá gốc</p>
            @if (d.quote) {
              <p class="mt-2 text-xs font-bold">{{ d.quote.quoteCode }} <span class="text-muted">v{{ d.quote.versionNo }}</span></p>
              <p class="text-[11px] text-muted">Tổng: {{ fmtCurrency(d.quote.totalAmount, d.quote.currency) }}</p>
              <p class="text-[11px] text-muted">Hiệu lực {{ fmtDate(d.quote.validUntil) }}</p>
            } @else {
              <p class="mt-2 text-[11px] text-muted">Không tìm thấy báo giá.</p>
            }
          </div>

          <div class="card p-5">
            <p class="text-sm font-bold">Tài liệu đơn</p>
            <div class="mt-2 space-y-2">
              @for (doc of d.documents; track doc.id) {
                <a [href]="pdf(doc.fileUrl)" target="_blank" class="flex items-center justify-between rounded border border-line px-2.5 py-2 text-[11px] hover:border-brand">
                  <span class="truncate">{{ doc.fileName }}</span>
                  <span class="ml-2 shrink-0 font-bold text-brand">PDF</span>
                </a>
              }
              @if (!d.documents.length) { <p class="text-[11px] text-muted">Chưa có tài liệu.</p> }
            </div>
          </div>
        </aside>
      </div>
    } @else {
      <div class="h-96 skeleton"></div>
    }
  `,
})
export class WorkspaceOrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  data = signal<any>(null);
  stageNotes = signal<Record<number, string>>({});
  etaDate = '';
  etaReason = '';
  delivery = { recipientName: '', recipientPhone: '', recipientEmail: '', deliveryAddress: '', confirmed: false };
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  fmtCurrency = fmtCurrency;
  stageTitle = stageName;
  label = orderStatus;
  badge = badgeClass;
  canOperate = computed(() => ['sales', 'admin'].includes(this.auth.user()?.role || ''));

  ngOnInit() {
    this.reload();
  }

  reload() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.get<any>(`/workspace/orders/${code}`).subscribe({
      next: (d) => {
        this.data.set(d);
        this.etaDate = (d.order.etaDate || '').slice(0, 10);
        this.delivery = {
          recipientName: d.order.recipientName || '',
          recipientPhone: d.order.recipientPhone || '',
          recipientEmail: d.order.recipientEmail || '',
          deliveryAddress: d.order.deliveryAddress || '',
          confirmed: d.order.addressStatus === 'confirmed',
        };
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  setStageNote(stageNo: number, value: string) {
    this.stageNotes.set({ ...this.stageNotes(), [stageNo]: value });
  }

  completeStage(stageNo: number) {
    const d = this.data();
    if (!d) return;
    if (!window.confirm(`Đánh dấu chặng ${stageNo} đã hoàn thành?`)) return;
    this.api
      .patch<any>(`/workspace/orders/${d.order.orderCode}/stages/${stageNo}`, {
        note: this.stageNotes()[stageNo] || null,
      })
      .subscribe({
        next: () => {
          this.toast.success(`Đã hoàn thành chặng ${stageNo}.`);
          this.reload();
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  saveEta() {
    const d = this.data();
    if (!d) return;
    if (!this.etaDate || !this.etaReason.trim()) {
      this.toast.error('Cần chọn ngày và nhập lý do thay đổi ETA.');
      return;
    }
    this.api.patch<any>(`/orders/${d.order.orderCode}/eta`, { etaDate: this.etaDate, reason: this.etaReason }).subscribe({
      next: () => {
        this.toast.success('Đã cập nhật ETA và ghi lịch sử.');
        this.etaReason = '';
        this.reload();
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  saveDelivery() {
    const d = this.data();
    if (!d) return;
    this.api
      .patch<any>(`/workspace/orders/${d.order.orderCode}/delivery`, {
        recipientName: this.delivery.recipientName,
        recipientPhone: this.delivery.recipientPhone,
        recipientEmail: this.delivery.recipientEmail,
        deliveryAddress: this.delivery.deliveryAddress,
        addressStatus: this.delivery.confirmed ? 'confirmed' : 'pending_confirmation',
      })
      .subscribe({
        next: () => {
          this.toast.success('Đã lưu thông tin giao hàng.');
          this.reload();
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  pdf(url?: string) {
    return pdfUrl(url, this.auth.token());
  }
}
