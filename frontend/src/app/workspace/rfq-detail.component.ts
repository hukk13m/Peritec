import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../shared/toast.service';
import { badgeClass, fmtDate, fmtDateTime, fmtCurrency, quoteStatus, rfqStatus } from '../shared/ui';

@Component({
  selector: 'app-workspace-rfq-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    @if (rfq(); as r) {
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a routerLink="/workspace" class="text-xs font-semibold text-brand hover:underline">← Hàng đợi RFQ</a>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-extrabold tracking-tight">{{ r.rfqCode }}</h1>
            <span class="badge" [class]="rfqBadge(r.status)">{{ rfqLabel(r.status) }}</span>
            @if (r.order) {
              <a [routerLink]="['/workspace/orders', r.order.orderCode]" class="badge bg-success-soft text-success hover:underline">PO: {{ r.order.orderCode }}</a>
            }
          </div>
          <p class="mt-1 text-xs text-muted">{{ r.customer.companyName }} · {{ r.customer.contactName }} · {{ fmtDateTime(r.createdAt) }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (canAssign()) {
            <span class="badge bg-canvas text-muted">Bạn có quyền phân công</span>
          } @else {
            <span class="badge bg-warn-soft text-warn">Chỉ xem thương mại</span>
          }
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Thông tin khách hàng</p>
              @if (r.customer.companyStatus) {
                <span class="badge" [class]="r.customer.companyStatus === 'active' ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn'">
                  {{ r.customer.companyStatus === 'active' ? 'Đã xác minh' : 'Chờ xác minh' }}
                </span>
              }
            </div>
            <div class="mt-3 grid gap-4 text-xs sm:grid-cols-2">
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Doanh nghiệp</p><p class="mt-0.5 text-sm font-semibold">{{ r.customer.companyName }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Mã số thuế</p><p class="mt-0.5">{{ r.customer.taxCode || '—' }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Người liên hệ</p><p class="mt-0.5 font-semibold">{{ r.customer.contactName }}</p><p class="text-muted">{{ r.customer.contactPosition || '—' }}</p></div>
              <div><p class="text-[10px] uppercase tracking-wide text-muted">Liên hệ</p><p class="mt-0.5">{{ r.customer.contactEmail }}</p><p class="text-muted">{{ r.customer.contactPhone }}</p></div>
              <div class="sm:col-span-2"><p class="text-[10px] uppercase tracking-wide text-muted">Địa chỉ</p><p class="mt-0.5">{{ r.customer.address || '—' }}</p></div>
            </div>
            @if (r.technicalNote) {
              <div class="mt-4 rounded-md bg-canvas p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-muted">Yêu cầu kỹ thuật từ khách</p>
                <p class="mt-1 text-xs leading-relaxed">{{ r.technicalNote }}</p>
              </div>
            }
          </div>

          <div class="card overflow-hidden">
            <div class="flex items-center justify-between border-b border-line px-5 py-3">
              <p class="text-sm font-bold">Thiết bị & kiểm tra cấu hình</p>
              <p class="text-[11px] text-muted">{{ r.items.length }} dòng</p>
            </div>
            <div class="divide-y divide-line">
              @for (item of r.items; track item.id) {
                <div class="p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-bold">{{ item.sku }} <span class="text-xs font-normal text-muted">× {{ item.quantity }}</span></p>
                      <p class="text-[11px] text-muted">{{ item.name }}</p>
                    </div>
                    <span class="badge" [class]="checkBadge(item.checkStatus)">{{ checkLabel(item.checkStatus) }}</span>
                  </div>
                  @if (item.configRequest) {
                    <p class="mt-2 rounded bg-canvas px-2.5 py-1.5 text-[11px] text-muted">Cấu hình yêu cầu: <span class="text-ink">{{ item.configRequest }}</span></p>
                  }
                  @if (item.checkNote) {
                    <p class="mt-1.5 text-[11px] text-muted">Ghi chú kỹ thuật: <span class="text-ink">{{ item.checkNote }}</span></p>
                  }
                  @if (canCheck()) {
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <select class="input !w-auto !py-1.5 text-xs" [ngModel]="item.checkStatus" (ngModelChange)="setCheckValue(item.id, $event)" [ngModelOptions]="{ standalone: true }">
                        <option value="not_tested">Chưa kiểm tra</option>
                        <option value="tested">Đã kiểm tra</option>
                        <option value="need_clarification">Cần làm rõ</option>
                      </select>
                      <input class="input !py-1.5 flex-1 text-xs" placeholder="Ghi chú kiểm tra kỹ thuật..." [ngModel]="checkNotes()[item.id] || ''" (ngModelChange)="setCheckNote(item.id, $event)" [ngModelOptions]="{ standalone: true }" />
                      <button class="btn-primary btn-sm" (click)="saveCheck(item.id)">Lưu kiểm tra</button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Báo giá & phiên bản</p>
              <span class="text-[11px] text-muted">{{ r.quotes.length }} phiên bản · không ghi đè bản đã gửi</span>
            </div>

            @if (r.quotes.length) {
              <div class="mt-3 space-y-2">
                @for (q of r.quotes; track q.id) {
                  <div class="rounded-md border border-line p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p class="text-xs font-bold">{{ q.quoteCode }} <span class="text-muted">v{{ q.versionNo }}</span></p>
                        <p class="text-[11px] text-muted">Hiệu lực {{ fmtDate(q.validUntil) }} · {{ fmtCurrency(q.totalAmount, q.currency) }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="badge" [class]="quoteBadge(q.status)">{{ quoteLabel(q.status) }}</span>
                        @if (q.status === 'draft' && canSell()) {
                          <button class="btn-primary btn-sm" (click)="sendQuote(q.id)">Gửi khách</button>
                          <button class="btn-secondary btn-sm" (click)="startRevise(q)">Tạo bản mới</button>
                        }
                        @if (q.status !== 'draft' && canSell()) {
                          <button class="btn-secondary btn-sm" (click)="startRevise(q)">Điều chỉnh → v{{ q.versionNo + 1 }}</button>
                        }
                      </div>
                    </div>
                    @if (q.note) { <p class="mt-1 text-[11px] text-muted">Ghi chú: {{ q.note }}</p> }
                  </div>
                }
              </div>
            } @else {
              <p class="mt-3 rounded-md bg-canvas p-3 text-xs text-muted">
                Chưa có báo giá. Cần phân công Sales phụ trách trước khi tạo phiên bản đầu tiên.
              </p>
            }

            @if (canSell() && !r.quotes.length) {
              <div class="mt-4 rounded-md border border-line p-3">
                <p class="text-xs font-bold">Tạo báo giá v1</p>
                <div class="mt-2 grid gap-2 sm:grid-cols-3">
                  <div><label class="label !mb-1 !text-[10px]">Hiệu lực đến</label><input type="date" class="input !py-1.5 text-xs" [ngModel]="quoteValidUntil" (ngModelChange)="quoteValidUntil = $event" [ngModelOptions]="{ standalone: true }" /></div>
                  <div><label class="label !mb-1 !text-[10px]">Tổng tiền (VND)</label><input type="number" class="input !py-1.5 text-xs" [ngModel]="quoteTotal" (ngModelChange)="quoteTotal = $event" [ngModelOptions]="{ standalone: true }" /></div>
                  <div class="flex items-end"><button class="btn-primary btn-sm w-full" [disabled]="!r.sales" (click)="createQuote()">Tạo báo giá</button></div>
                </div>
                @if (!r.sales) { <p class="mt-1 text-[11px] text-warn">Chưa có Sales phụ trách — hãy phân công trước.</p> }
              </div>
            }

            @if (canSell() && revising(); as rv) {
              <div class="mt-4 rounded-md border border-brand/40 bg-brand-soft p-3">
                <p class="text-xs font-bold text-brand-dark">Tạo phiên bản mới từ {{ rv.quoteCode }} (v{{ rv.versionNo }})</p>
                <div class="mt-2 grid gap-2 sm:grid-cols-3">
                  <div><label class="label !mb-1 !text-[10px]">Hiệu lực đến</label><input type="date" class="input !py-1.5 text-xs" [ngModel]="reviseValidUntil" (ngModelChange)="reviseValidUntil = $event" [ngModelOptions]="{ standalone: true }" /></div>
                  <div><label class="label !mb-1 !text-[10px]">Tổng tiền (VND)</label><input type="number" class="input !py-1.5 text-xs" [ngModel]="reviseTotal" (ngModelChange)="reviseTotal = $event" [ngModelOptions]="{ standalone: true }" /></div>
                  <div class="flex items-end gap-2"><button class="btn-primary btn-sm flex-1" (click)="reviseQuote(rv.id)">Tạo v{{ rv.versionNo + 1 }}</button><button class="btn-ghost btn-sm" (click)="revising.set(null)">Hủy</button></div>
                </div>
              </div>
            }
          </div>

          <div class="card p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold">Lịch sử trao đổi</p>
              <div class="flex gap-1">
                @for (t of logTabs; track t.key) {
                  <button class="rounded px-2.5 py-1 text-[11px] font-semibold" [class.bg-brand]="logTab() === t.key" [class.text-white]="logTab() === t.key" [class.bg-canvas]="logTab() !== t.key" (click)="logTab.set(t.key)">{{ t.label }}</button>
                }
              </div>
            </div>
            <div class="mt-3 space-y-3">
              @for (log of filteredLogs(); track log.id) {
                <div class="flex gap-3">
                  <span class="mt-1 h-2 w-2 shrink-0 rounded-full" [class.bg-warn]="log.logType === 'internal'" [class.bg-brand]="log.logType !== 'internal'"></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs leading-relaxed">{{ log.content }}</p>
                    <p class="mt-0.5 text-[11px] text-muted">{{ fmtDateTime(log.createdAt) }} · {{ log.actorName }}
                      @if (log.logType === 'internal') { <span class="ml-1 font-semibold text-warn">Nội bộ</span> }
                      @if (log.visibleToCustomer) { <span class="ml-1 font-semibold text-success">Khách thấy</span> }
                    </p>
                  </div>
                </div>
              }
              @if (!filteredLogs().length) { <p class="text-xs text-muted">Chưa có ghi chú.</p> }
            </div>

            <div class="mt-4 rounded-md border border-line p-3">
              <div class="flex flex-wrap items-center gap-2">
                <select class="input !w-auto !py-1.5 text-xs" [ngModel]="newLogType" (ngModelChange)="newLogType = $event" [ngModelOptions]="{ standalone: true }">
                  <option value="internal">Ghi chú nội bộ</option>
                  @if (auth.user()?.role !== 'engineering') {
                    <option value="customer">Cập nhật cho khách</option>
                  }
                </select>
                <input class="input !py-1.5 flex-1 text-xs" placeholder="Nội dung trao đổi..." [ngModel]="newLog" (ngModelChange)="newLog = $event" (keyup.enter)="addLog()" [ngModelOptions]="{ standalone: true }" />
                <button class="btn-primary btn-sm" (click)="addLog()">Thêm</button>
              </div>
              <p class="mt-1.5 text-[11px] text-muted">Ghi chú nội bộ không bao giờ hiển thị cho khách hàng.</p>
            </div>
          </div>
        </div>

        <aside class="space-y-4">
          <div class="card p-5">
            <p class="text-sm font-bold">Phân công xử lý</p>
            <div class="mt-3 space-y-3">
              <div>
                <label class="label">Sales phụ trách</label>
                <select class="input text-xs" [disabled]="!canAssign()" [ngModel]="salesId()" (ngModelChange)="salesId.set($event)" [ngModelOptions]="{ standalone: true }">
                  <option value="">— Chưa phân công —</option>
                  @for (u of salesUsers(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
              </div>
              <div>
                <label class="label">Kỹ thuật phụ trách</label>
                <select class="input text-xs" [disabled]="!canAssign()" [ngModel]="techId()" (ngModelChange)="techId.set($event)" [ngModelOptions]="{ standalone: true }">
                  <option value="">— Chưa phân công —</option>
                  @for (u of techUsers(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
              </div>
              @if (canAssign()) {
                <button class="btn-primary btn-sm w-full" (click)="saveAssign()">Lưu phân công</button>
              } @else {
                <p class="rounded bg-warn-soft p-2 text-[11px] text-warn">Kỹ thuật không được phép phân công hoặc gửi báo giá.</p>
              }
            </div>
          </div>

          @if (canAssign()) {
            <div class="card p-5">
              <p class="text-sm font-bold">Chuyển trạng thái</p>
              <div class="mt-2 space-y-1.5">
                @for (next of nextStatuses(); track next) {
                  <button class="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-xs hover:border-brand" (click)="changeStatus(next)">
                    <span>{{ rfqLabel(next) }}</span>
                    <span class="text-brand">→</span>
                  </button>
                }
                @if (!nextStatuses().length) { <p class="text-[11px] text-muted">Không còn trạng thái chuyển tiếp hợp lệ.</p> }
              </div>
            </div>
          }

          <div class="card p-5">
            <p class="text-sm font-bold">Khách hàng nhìn thấy</p>
            <div class="mt-2 space-y-2">
              @for (log of r.customerVisible.logs; track log.createdAt) {
                <p class="rounded bg-canvas p-2 text-[11px] leading-relaxed text-muted">{{ log.content }}</p>
              }
              @if (!r.customerVisible.logs.length) { <p class="text-[11px] text-muted">Chưa có cập nhật công khai.</p> }
            </div>
            <div class="mt-3 border-t border-line pt-3">
              <p class="text-[10px] font-bold uppercase tracking-wide text-muted">Báo giá khách thấy</p>
              @for (q of r.customerVisible.quotes; track q.quoteCode) {
                <p class="mt-1 text-[11px]">{{ q.quoteCode }} v{{ q.versionNo }} · {{ quoteLabel(q.expired ? 'expired' : q.status) }}</p>
              }
              @if (!r.customerVisible.quotes.length) { <p class="mt-1 text-[11px] text-muted">Chưa có báo giá được phát hành.</p> }
            </div>
          </div>

          <div class="card p-4 text-[11px] leading-relaxed text-muted">
            Giá và ghi chú nội bộ trong trang này không được trả về cho Customer Portal. Quyền hạn được kiểm tra ở API, không chỉ ở giao diện.
          </div>
        </aside>
      </div>
    } @else {
      <div class="h-96 skeleton"></div>
    }
  `,
})
export class WorkspaceRfqDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  rfq = signal<any>(null);
  salesUsers = signal<any[]>([]);
  techUsers = signal<any[]>([]);
  salesId = signal('');
  techId = signal('');
  checkNotes = signal<Record<string, string>>({});
  logTab = signal('all');
  newLogType = 'internal';
  newLog = '';
  revising = signal<any>(null);
  quoteValidUntil = this.inDays(30);
  quoteTotal = 0;
  reviseValidUntil = this.inDays(30);
  reviseTotal = 0;

  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  fmtCurrency = fmtCurrency;
  rfqLabel = rfqStatus;
  quoteLabel = quoteStatus;
  rfqBadge = badgeClass;
  quoteBadge = badgeClass;
  logTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'internal', label: 'Nội bộ' },
    { key: 'public', label: 'Khách thấy' },
  ];

  canSell = computed(() => ['sales', 'admin'].includes(this.auth.user()?.role || ''));
  canAssign = computed(() => ['sales', 'admin'].includes(this.auth.user()?.role || ''));
  canCheck = computed(() => ['engineering', 'sales', 'admin'].includes(this.auth.user()?.role || ''));

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.load(code);
    this.api.get<{ items: any[] }>('/workspace/users', { role: 'sales,admin' }).subscribe((r) => this.salesUsers.set(r.items));
    this.api.get<{ items: any[] }>('/workspace/users', { role: 'engineering,admin' }).subscribe((r) => this.techUsers.set(r.items));
  }

  load(code: string) {
    this.api.get<any>(`/workspace/rfqs/${code}`).subscribe({
      next: (r) => {
        this.rfq.set(r);
        this.salesId.set(r.sales?.id || '');
        this.techId.set(r.technician?.id || '');
        const notes: Record<string, string> = {};
        for (const i of r.items) notes[i.id] = i.checkNote || '';
        this.checkNotes.set(notes);
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  inDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  saveAssign() {
    const r = this.rfq();
    if (!r) return;
    this.api
      .patch<any>(`/workspace/rfqs/${r.id}/assign`, {
        salesId: this.salesId() || null,
        technicianId: this.techId() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Đã lưu phân công.');
          this.load(r.rfqCode);
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  nextStatuses() {
    const map: Record<string, string[]> = {
      new: ['checking_configuration', 'quote_sent', 'canceled'],
      checking_configuration: ['quote_sent', 'needs_adjustment', 'canceled'],
      quote_sent: ['needs_adjustment', 'canceled'],
      needs_adjustment: ['checking_configuration', 'quote_sent', 'canceled'],
      confirmed: [],
      canceled: [],
    };
    return map[this.rfq()?.status] || [];
  }

  changeStatus(status: string) {
    const r = this.rfq();
    if (!r) return;
    if (!window.confirm(`Chuyển ${r.rfqCode} sang "${rfqStatus(status)}"?`)) return;
    this.api.patch<any>(`/workspace/rfqs/${r.id}/status`, { status }).subscribe({
      next: () => {
        this.toast.success('Đã cập nhật trạng thái.');
        this.load(r.rfqCode);
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  setCheckValue(itemId: string, value: string) {
    const r = this.rfq();
    if (!r) return;
    r.items = r.items.map((i: any) => (i.id === itemId ? { ...i, checkStatus: value } : i));
    this.rfq.set({ ...r });
  }

  setCheckNote(itemId: string, value: string) {
    this.checkNotes.set({ ...this.checkNotes(), [itemId]: value });
  }

  saveCheck(itemId: string) {
    const r = this.rfq();
    if (!r) return;
    const item = r.items.find((i: any) => i.id === itemId);
    this.api
      .patch<any>(`/workspace/rfqs/${r.id}/items/${itemId}/check`, {
        checkStatus: item.checkStatus,
        note: this.checkNotes()[itemId] || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Đã lưu kết quả kiểm tra kỹ thuật.');
          this.load(r.rfqCode);
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  filteredLogs() {
    const logs = this.rfq()?.logs || [];
    if (this.logTab() === 'internal') return logs.filter((l: any) => l.logType === 'internal');
    if (this.logTab() === 'public') return logs.filter((l: any) => l.visibleToCustomer);
    return logs;
  }

  addLog() {
    const r = this.rfq();
    if (!r || !this.newLog.trim()) return;
    this.api
      .post<any>(`/workspace/rfqs/${r.id}/logs`, { logType: this.newLogType, content: this.newLog.trim() })
      .subscribe({
        next: () => {
          this.newLog = '';
          this.toast.success(this.newLogType === 'customer' ? 'Đã gửi cập nhật cho khách.' : 'Đã thêm ghi chú nội bộ.');
          this.load(r.rfqCode);
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  createQuote() {
    const r = this.rfq();
    if (!r) return;
    this.api
      .post<any>('/quotations', {
        rfqId: r.id,
        validUntil: this.quoteValidUntil,
        totalAmount: this.quoteTotal ? Number(this.quoteTotal) : null,
        currency: 'VND',
      })
      .subscribe({
        next: (q) => {
          this.toast.success(`Đã tạo báo giá ${q.quoteCode}.`);
          this.load(r.rfqCode);
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  startRevise(q: any) {
    this.revising.set(q);
    this.reviseValidUntil = (q.validUntil || this.inDays(30)).slice(0, 10);
    this.reviseTotal = q.totalAmount || 0;
  }

  reviseQuote(id: string) {
    const r = this.rfq();
    if (!r) return;
    this.api
      .post<any>(`/quotations/${id}/revise`, {
        validUntil: this.reviseValidUntil,
        totalAmount: this.reviseTotal ? Number(this.reviseTotal) : null,
      })
      .subscribe({
        next: (q) => {
          this.revising.set(null);
          this.toast.success(`Đã tạo phiên bản mới ${q.quoteCode} (v${q.versionNo}).`);
          this.load(r.rfqCode);
        },
        error: (err) => this.toast.error(ApiService.errorMessage(err)),
      });
  }

  sendQuote(id: string) {
    const r = this.rfq();
    if (!r) return;
    if (!window.confirm('Gửi báo giá này cho khách hàng? Bản đã gửi sẽ không thể chỉnh sửa.')) return;
    this.api.post<any>(`/quotations/${id}/send`, {}).subscribe({
      next: () => {
        this.toast.success('Đã gửi báo giá cho khách hàng.');
        this.load(r.rfqCode);
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }

  checkLabel(status?: string) {
    return status === 'tested' ? 'Đã kiểm tra' : status === 'need_clarification' ? 'Cần làm rõ' : 'Chưa kiểm tra';
  }
  checkBadge(status?: string) {
    return status === 'tested' ? 'bg-success-soft text-success' : status === 'need_clarification' ? 'bg-warn-soft text-warn' : 'bg-slate-100 text-slate-700';
  }
}
