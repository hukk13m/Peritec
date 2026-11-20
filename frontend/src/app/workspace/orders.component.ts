import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { badgeClass, fmtDate, orderStatus, stageName } from '../shared/ui';

@Component({
  selector: 'app-workspace-orders',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Vận hành</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Đơn hàng nhập khẩu</h1>
        <p class="mt-1 text-sm text-muted">Cập nhật tiến độ 5 chặng, ETA và thông tin giao hàng cho từng đơn.</p>
      </div>
      <a routerLink="/workspace" class="btn-secondary btn-sm">← Hàng đợi RFQ</a>
    </div>

    <div class="card mt-5 overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        @for (tab of tabs; track tab.key) {
          <button class="rounded-full px-3 py-1.5 text-xs font-semibold"
                  [class.bg-brand]="status() === tab.key" [class.text-white]="status() === tab.key"
                  [class.bg-canvas]="status() !== tab.key" [class.text-muted]="status() !== tab.key"
                  (click)="setStatus(tab.key)">{{ tab.label }}</button>
        }
      </div>

      @if (loading()) {
        <div class="p-4"><div class="h-40 skeleton"></div></div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table-base min-w-[820px]">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thiết bị</th><th>Chặng hiện tại</th><th>ETA</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              @for (o of filtered(); track o.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/workspace/orders', o.orderCode]" class="font-bold text-brand hover:underline">{{ o.orderCode }}</a>
                    <p class="mt-0.5 text-[11px] text-muted">{{ fmtDate(o.createdAt) }}</p>
                  </td>
                  <td class="text-xs font-semibold">{{ o.companyName }}</td>
                  <td class="text-xs">{{ o.itemCount }} dòng · {{ o.totalQuantity }} đơn vị</td>
                  <td>
                    <p class="text-xs font-semibold">{{ o.currentStage }}. {{ stageTitle(o.stageName || '') }}</p>
                    <div class="mt-1 flex gap-0.5">
                      @for (n of [1, 2, 3, 4, 5]; track n) {
                        <span class="h-1 w-4 rounded-full" [class]="n <= o.currentStage ? 'bg-brand' : 'bg-line'"></span>
                      }
                    </div>
                  </td>
                  <td class="text-xs">{{ fmtDate(o.etaDate) }}</td>
                  <td><span class="badge" [class]="badge(o.status)">{{ label(o.status) }}</span></td>
                  <td class="text-right"><a [routerLink]="['/workspace/orders', o.orderCode]" class="btn-secondary btn-sm">Cập nhật →</a></td>
                </tr>
              }
              @if (!filtered().length) {
                <tr><td colspan="7" class="py-10 text-center text-sm text-muted">Không có đơn hàng phù hợp.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class WorkspaceOrdersComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(true);
  status = signal('all');
  fmtDate = fmtDate;
  stageTitle = stageName;
  label = orderStatus;
  badge = badgeClass;
  tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'processing', label: 'Đang xử lý' },
    { key: 'delivered', label: 'Đã giao' },
  ];

  ngOnInit() {
    this.api.get<{ items: any[] }>('/workspace/orders').subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(key: string) {
    this.status.set(key);
  }

  filtered() {
    return this.items().filter((o) => this.status() === 'all' || o.status === this.status());
  }
}
