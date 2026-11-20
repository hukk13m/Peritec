import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Company } from '../core/models';
import { companyStatus, fmtDate, orderStatus } from '../shared/ui';

@Component({
  selector: 'app-portal-overview',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (data(); as d) {
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Customer Portal</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Xin chào, {{ d.company?.contactName || d.company?.name }}</h1>
          <p class="mt-1 text-sm text-muted">Tổng quan yêu cầu báo giá, báo giá và đơn hàng của doanh nghiệp.</p>
        </div>
        <a routerLink="/products" class="btn-primary btn-sm">Tạo yêu cầu báo giá mới</a>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of cards(d); track card.label) {
          <div class="stat-card">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-extrabold tracking-tight text-ink">{{ card.value }}</p>
            <p class="mt-0.5 text-[11px] text-muted">{{ card.hint }}</p>
          </div>
        }
      </div>

      <div class="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-5">
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold">Việc cần xử lý</p>
              <span class="badge bg-brand-soft text-brand-dark">{{ d.nextActions.length }} mục</span>
            </div>
            @if (d.nextActions.length) {
              <div class="mt-3 space-y-2">
                @for (action of d.nextActions; track action.title) {
                  <div class="flex items-start gap-3 rounded-md border border-line p-3">
                    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warn-soft text-xs font-bold text-warn">!</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-ink">{{ action.title }}</p>
                      <p class="mt-0.5 text-xs text-muted">{{ action.description }}</p>
                      @if (action.validUntil) {
                        <p class="mt-1 text-[11px] font-medium text-warn">Hiệu lực đến {{ fmtDate(action.validUntil) }}</p>
                      }
                    </div>
                    @if (action.link) {
                      <a [routerLink]="action.link" class="btn-secondary btn-sm shrink-0">Xem</a>
                    }
                  </div>
                }
              </div>
            } @else {
              <p class="mt-3 rounded-md bg-canvas p-3 text-xs text-muted">Không có việc nào đang chờ bạn xử lý.</p>
            }
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold">Đơn hàng đang xử lý</p>
              <a routerLink="/portal/orders" class="text-xs font-semibold text-brand hover:underline">Tất cả đơn hàng →</a>
            </div>
            @if (d.activeOrder; as o) {
              <div class="mt-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <a [routerLink]="['/portal/orders', o.orderCode]" class="text-base font-extrabold text-ink hover:text-brand">{{ o.orderCode }}</a>
                  <span class="badge" [class]="orderBadge(o.status)">{{ orderLabel(o.status) }}</span>
                </div>
                <p class="mt-1 text-xs text-muted">Chặng hiện tại: <span class="font-semibold text-ink">{{ o.currentStage }}. {{ stageName(o.stageName || '') }}</span></p>
                <div class="mt-3 flex items-center gap-1.5">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <span class="h-1.5 flex-1 rounded-full" [class]="n <= o.currentStage ? 'bg-brand' : 'bg-line'"></span>
                  }
                </div>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-canvas p-3 text-xs">
                  <span class="text-muted">Ngày dự kiến: <span class="font-semibold text-ink">{{ fmtDate(o.etaDate) }}</span></span>
                  <span class="text-[11px] text-muted">{{ o.etaNote }}</span>
                </div>
              </div>
            } @else {
              <p class="mt-3 rounded-md bg-canvas p-3 text-xs text-muted">Chưa có đơn hàng đang xử lý.</p>
            }
          </div>
        </div>

        <div class="space-y-5">
          <div class="card p-5">
            <p class="text-sm font-bold">Hồ sơ doanh nghiệp</p>
            <div class="mt-3 space-y-2 text-sm">
              <p class="font-semibold text-ink">{{ d.company?.name }}</p>
              <p class="text-xs text-muted">Mã: {{ d.company?.code }} · MST: {{ d.company?.taxCode || '—' }}</p>
              <p class="text-xs text-muted">{{ d.company?.industry }}</p>
              <p class="text-xs text-muted">{{ d.company?.address }}</p>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <span class="badge" [class]="companyBadge(d.company?.status)">{{ companyLabel(d.company?.status) }}</span>
              <a routerLink="/portal/company" class="text-xs font-semibold text-brand hover:underline">Chi tiết →</a>
            </div>
          </div>

          <div class="card bg-navy p-5 text-white">
            <p class="text-sm font-bold">Theo dõi đơn nhập khẩu</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-300">
              Đơn hàng nhập khẩu đi qua 5 chặng: xác nhận đơn, đặt hàng nhà cung cấp, vận chuyển quốc tế, thông quan và giao hàng.
            </p>
            <a routerLink="/portal/orders" class="mt-3 inline-block text-xs font-bold text-sky-300 hover:text-white">Xem tiến độ →</a>
          </div>

          <div class="card p-4 text-[11px] leading-relaxed text-muted">
            Giá và ghi chú nội bộ chỉ hiển thị cho nhân viên PERITEC. Portal của bạn chỉ hiển thị thông tin doanh nghiệp của mình.
          </div>
        </div>
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) { <div class="h-24 skeleton"></div> }
      </div>
    }
  `,
})
export class PortalOverviewComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<any>(null);
  fmtDate = fmtDate;
  stageName = (name: string) => name;
  companyLabel = companyStatus;

  ngOnInit() {
    this.api.get<any>('/portal/overview').subscribe((r) => this.data.set(r));
  }

  cards(d: any) {
    return [
      { label: 'Yêu cầu báo giá', value: d.stats.rfqs, hint: 'Tổng số yêu cầu đã gửi' },
      { label: 'Báo giá chờ xác nhận', value: d.stats.pendingQuotes, hint: 'Cần phản hồi từ bạn' },
      { label: 'Đơn hàng đang xử lý', value: d.stats.activeOrders, hint: 'Đang trong quá trình nhập khẩu' },
      { label: 'Tài liệu', value: d.stats.documents, hint: 'Báo giá, xác nhận đơn, chứng từ' },
    ];
  }

  orderLabel(status: string) {
    return orderStatus(status);
  }
  orderBadge(status: string) {
    return status === 'delivered' ? 'bg-success-soft text-success' : 'bg-brand-soft text-brand-dark';
  }
  companyBadge(status?: string) {
    return status === 'active' ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn';
  }
}
