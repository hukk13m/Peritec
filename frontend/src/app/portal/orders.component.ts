import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { badgeClass, fmtDate, orderStatus, stageName } from '../shared/ui';

@Component({
  selector: 'app-portal-orders',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Đơn hàng & giao vận</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Đơn hàng nhập khẩu</h1>
        <p class="mt-1 text-sm text-muted">Theo dõi 5 chặng của đơn hàng và ngày dự kiến giao.</p>
      </div>
      <a routerLink="/portal/rfqs" class="btn-secondary btn-sm">Xem yêu cầu báo giá</a>
    </div>

    @if (loading()) {
      <div class="mt-6 h-48 skeleton"></div>
    } @else if (items().length) {
      <div class="mt-5 space-y-3">
        @for (o of items(); track o.orderCode) {
          <div class="card p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a [routerLink]="['/portal/orders', o.orderCode]" class="text-base font-extrabold text-ink hover:text-brand">{{ o.orderCode }}</a>
                <p class="mt-0.5 text-xs text-muted">{{ o.itemCount }} thiết bị · {{ o.totalQuantity }} đơn vị · Tạo ngày {{ fmtDate(o.createdAt) }}</p>
              </div>
              <span class="badge" [class]="badge(o.status)">{{ label(o.status) }}</span>
            </div>
            <div class="mt-4 flex items-center gap-1.5">
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <span class="h-1.5 flex-1 rounded-full" [class]="n <= o.currentStage ? 'bg-brand' : 'bg-line'"></span>
              }
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p class="text-muted">Chặng hiện tại: <span class="font-semibold text-ink">{{ o.currentStage }}. {{ stageName(o.stageName || '') }}</span></p>
              <p class="text-muted">Ngày dự kiến: <span class="font-semibold text-ink">{{ fmtDate(o.etaDate) }}</span></p>
              <a [routerLink]="['/portal/orders', o.orderCode]" class="btn-secondary btn-sm">Theo dõi →</a>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="card mt-6 p-10 text-center">
        <p class="text-base font-bold">Chưa có đơn hàng nào</p>
        <p class="mt-1 text-sm text-muted">Đơn hàng được tạo sau khi bạn xác nhận báo giá chính thức.</p>
        <a routerLink="/portal/rfqs" class="btn-primary mt-4">Xem báo giá</a>
      </div>
    }
  `,
})
export class PortalOrdersComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(true);
  fmtDate = fmtDate;
  stageName = stageName;
  label = orderStatus;
  badge = badgeClass;

  ngOnInit() {
    this.api.get<{ items: any[] }>('/portal/orders').subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
