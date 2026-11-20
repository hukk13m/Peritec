import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { badgeClass, fmtDate, rfqStatus } from '../shared/ui';

@Component({
  selector: 'app-portal-rfqs',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Lịch sử giao dịch</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Yêu cầu báo giá</h1>
        <p class="mt-1 text-sm text-muted">Theo dõi trạng thái từng yêu cầu, báo giá đã nhận và đơn hàng liên quan.</p>
      </div>
      <a routerLink="/products" class="btn-primary btn-sm">Tạo yêu cầu mới</a>
    </div>

    <div class="card mt-5 overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        @for (tab of tabs; track tab.key) {
          <button class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  [class.bg-brand]="filter() === tab.key" [class.text-white]="filter() === tab.key"
                  [class.bg-canvas]="filter() !== tab.key" [class.text-muted]="filter() !== tab.key"
                  (click)="filter.set(tab.key)">{{ tab.label }}</button>
        }
        <div class="relative ml-auto min-w-[200px]">
          <input class="input !py-1.5 text-xs" name="q" [(ngModel)]="q" placeholder="Tìm mã RFQ hoặc thiết bị..." />
        </div>
      </div>

      @if (loading()) {
        <div class="p-5"><div class="h-40 skeleton"></div></div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table-base min-w-[760px]">
            <thead>
              <tr>
                <th>Mã yêu cầu</th>
                <th>Thiết bị</th>
                <th>Trạng thái</th>
                <th>Báo giá gần nhất</th>
                <th>Đơn hàng</th>
                <th>Ngày gửi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.rfqCode) {
                <tr>
                  <td>
                    <a [routerLink]="['/portal/rfqs', item.rfqCode]" class="font-bold text-brand hover:underline">{{ item.rfqCode }}</a>
                    <p class="mt-0.5 text-[11px] text-muted">{{ item.itemCount }} dòng · {{ item.totalQuantity }} đơn vị</p>
                  </td>
                  <td>
                    <div class="space-y-0.5">
                      @for (d of item.devices.slice(0, 2); track d.sku) {
                        <p class="text-xs"><span class="font-semibold">{{ d.sku }}</span> <span class="text-muted">× {{ d.quantity }}</span></p>
                      }
                      @if (item.devices.length > 2) {
                        <p class="text-[11px] text-muted">+{{ item.devices.length - 2 }} thiết bị khác</p>
                      }
                    </div>
                  </td>
                  <td><span class="badge" [class]="badge(item.status)">{{ label(item.status) }}</span></td>
                  <td>
                    @if (item.latestQuote; as quote) {
                      <p class="text-xs font-semibold">{{ quote.quoteCode }} <span class="text-muted">v{{ quote.versionNo }}</span></p>
                      <p class="text-[11px]" [class.text-danger]="quote.expired" [class.text-muted]="!quote.expired">
                        {{ quote.expired ? 'Đã hết hạn' : 'Hiệu lực đến ' + fmtDate(quote.validUntil) }}
                      </p>
                    } @else {
                      <span class="text-[11px] text-muted">Chưa có báo giá</span>
                    }
                  </td>
                  <td>
                    @if (item.orderCode) {
                      <a [routerLink]="['/portal/orders', item.orderCode]" class="text-xs font-semibold text-brand hover:underline">{{ item.orderCode }}</a>
                    } @else {
                      <span class="text-[11px] text-muted">—</span>
                    }
                  </td>
                  <td class="whitespace-nowrap text-xs text-muted">{{ fmtDate(item.createdAt) }}</td>
                  <td class="text-right">
                    <a [routerLink]="['/portal/rfqs', item.rfqCode]" class="btn-secondary btn-sm">Chi tiết</a>
                  </td>
                </tr>
              }
              @if (!filtered().length) {
                <tr><td colspan="7" class="py-10 text-center text-sm text-muted">Không có yêu cầu báo giá phù hợp.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class PortalRfqsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(true);
  filter = signal('all');
  q = '';
  fmtDate = fmtDate;
  tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'quote_sent', label: 'Có báo giá' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'needs_adjustment', label: 'Cần điều chỉnh' },
  ];

  ngOnInit() {
    this.api.get<{ items: any[] }>('/portal/rfqs').subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filtered() {
    return this.items().filter((i) => {
      if (this.filter() !== 'all' && i.status !== this.filter()) return false;
      if (!this.q.trim()) return true;
      const needle = this.q.toLowerCase();
      return (
        i.rfqCode.toLowerCase().includes(needle) ||
        i.devices.some((d: any) => (d.sku + ' ' + d.name).toLowerCase().includes(needle))
      );
    });
  }

  label = rfqStatus;
  badge = badgeClass;
}
