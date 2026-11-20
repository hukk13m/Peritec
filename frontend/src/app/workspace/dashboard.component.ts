import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { badgeClass, fmtDate, fmtDateTime, rfqStatus } from '../shared/ui';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Internal Workspace</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Hàng đợi yêu cầu báo giá</h1>
        <p class="mt-1 text-sm text-muted">Tiếp nhận, phân công và theo dõi tiến độ xử lý RFQ của toàn bộ khách hàng.</p>
      </div>
      <a routerLink="/products" class="btn-secondary btn-sm">Xem website public</a>
    </div>

    @if (metrics(); as m) {
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div class="stat-card">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">RFQ mới</p>
          <p class="mt-1 text-2xl font-extrabold text-brand">{{ m.counts.new }}</p>
          <p class="text-[11px] text-muted">Chưa phân công xử lý</p>
        </div>
        <div class="stat-card">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Chưa gán Sales</p>
          <p class="mt-1 text-2xl font-extrabold text-warn">{{ m.unassignedRfqs }}</p>
          <p class="text-[11px] text-muted">Cần phân công ngay</p>
        </div>
        <div class="stat-card">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Đã gửi báo giá</p>
          <p class="mt-1 text-2xl font-extrabold text-ink">{{ m.counts.quote_sent }}</p>
          <p class="text-[11px] text-muted">Chờ khách phản hồi</p>
        </div>
        <div class="stat-card">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Đơn đang xử lý</p>
          <p class="mt-1 text-2xl font-extrabold text-ink">{{ m.ordersActive }}</p>
          <p class="text-[11px] text-muted">Đơn nhập khẩu đang chạy</p>
        </div>
        <div class="stat-card">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">TB tạo → gửi báo giá</p>
          <p class="mt-1 text-2xl font-extrabold text-ink">{{ m.avgHoursToQuote ?? '—' }}<span class="text-sm font-medium text-muted"> giờ</span></p>
          <p class="text-[11px] text-muted">Tính trên RFQ đã gửi báo giá</p>
        </div>
      </div>
    }

    <div class="card mt-5 overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        @for (tab of tabs; track tab.key) {
          <button class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  [class.bg-brand]="status() === tab.key" [class.text-white]="status() === tab.key"
                  [class.bg-canvas]="status() !== tab.key" [class.text-muted]="status() !== tab.key"
                  (click)="setStatus(tab.key)">{{ tab.label }}</button>
        }
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <input class="input !py-1.5 min-w-[220px] text-xs" name="q" [(ngModel)]="q" (keyup.enter)="load()" placeholder="Tìm mã RFQ, công ty, thiết bị..." />
          <button class="btn-primary btn-sm" (click)="load()">Tìm</button>
        </div>
      </div>

      @if (loading()) {
        <div class="p-4"><div class="h-44 skeleton"></div></div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table-base min-w-[900px]">
            <thead>
              <tr>
                <th>Mã RFQ</th>
                <th>Khách hàng</th>
                <th>Thiết bị</th>
                <th>Trạng thái</th>
                <th>Sales</th>
                <th>Kỹ thuật</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/workspace/rfqs', item.rfqCode]" class="font-bold text-brand hover:underline">{{ item.rfqCode }}</a>
                    <p class="mt-0.5 text-[11px] text-muted">{{ item.contactName }}</p>
                  </td>
                  <td>
                    <p class="text-xs font-semibold">{{ item.companyName }}</p>
                    <p class="text-[11px] text-muted">{{ item.contactEmail }}</p>
                  </td>
                  <td>
                    <div class="space-y-0.5">
                      @for (d of item.devices.slice(0, 2); track d.sku) {
                        <p class="text-xs"><span class="font-semibold">{{ d.sku }}</span> <span class="text-muted">× {{ d.quantity }}</span></p>
                      }
                      @if (item.devices.length > 2) { <p class="text-[11px] text-muted">+{{ item.devices.length - 2 }} khác</p> }
                    </div>
                  </td>
                  <td><span class="badge" [class]="badge(item.status)">{{ label(item.status) }}</span></td>
                  <td>
                    @if (item.sales) {
                      <span class="text-xs font-medium">{{ item.sales.name }}</span>
                    } @else {
                      <span class="badge bg-danger-soft text-danger">Chưa gán</span>
                    }
                  </td>
                  <td>
                    @if (item.technician) {
                      <span class="text-xs">{{ item.technician.name }}</span>
                    } @else {
                      <span class="text-[11px] text-muted">Chưa gán</span>
                    }
                  </td>
                  <td class="whitespace-nowrap text-[11px] text-muted">{{ fmtDateTime(item.updatedAt) }}</td>
                  <td class="text-right"><a [routerLink]="['/workspace/rfqs', item.rfqCode]" class="btn-secondary btn-sm">Xử lý →</a></td>
                </tr>
              }
              @if (!items().length) {
                <tr><td colspan="8" class="py-10 text-center text-sm text-muted">Không có yêu cầu phù hợp bộ lọc.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
          <span>{{ total() }} yêu cầu · Trang {{ page() }} / {{ pages() || 1 }}</span>
          <div class="flex gap-2">
            <button class="btn-secondary btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">← Trước</button>
            <button class="btn-secondary btn-sm" [disabled]="page() >= pages()" (click)="goPage(page() + 1)">Sau →</button>
          </div>
        </div>
      }
    </div>

    @if (metrics(); as m) {
      <div class="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="card p-5">
          <p class="text-sm font-bold">RFQ cập nhật gần đây</p>
          <div class="mt-3 space-y-2">
            @for (r of m.recent; track r.rfqCode) {
              <a [routerLink]="['/workspace/rfqs', r.rfqCode]" class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 hover:border-brand">
                <div>
                  <p class="text-xs font-bold text-ink">{{ r.rfqCode }} <span class="font-normal text-muted">· {{ r.companyName }}</span></p>
                  <p class="text-[11px] text-muted">{{ r.itemCount }} thiết bị · {{ r.totalQuantity }} đơn vị</p>
                </div>
                <span class="badge" [class]="badge(r.status)">{{ label(r.status) }}</span>
              </a>
            }
          </div>
        </div>
        <div class="card p-5">
          <p class="text-sm font-bold">Trạng thái xử lý</p>
          <div class="mt-3 space-y-2">
            @for (row of statusRows(); track row.key) {
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted">{{ row.label }}</span>
                <span class="font-bold text-ink">{{ row.value }}</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-canvas">
                <div class="h-1.5 rounded-full bg-brand" [style.width.%]="row.pct"></div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class WorkspaceDashboardComponent implements OnInit {
  private api = inject(ApiService);
  metrics = signal<any>(null);
  items = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  pages = signal(1);
  loading = signal(true);
  status = signal('all');
  q = '';
  fmtDateTime = fmtDateTime;
  fmtDate = fmtDate;
  label = rfqStatus;
  badge = badgeClass;
  tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'new', label: 'Mới' },
    { key: 'checking_configuration', label: 'Đang kiểm tra' },
    { key: 'quote_sent', label: 'Đã gửi báo giá' },
    { key: 'needs_adjustment', label: 'Cần điều chỉnh' },
    { key: 'confirmed', label: 'Đã xác nhận' },
  ];

  ngOnInit() {
    this.api.get<any>('/workspace/overview').subscribe((r) => this.metrics.set(r));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .get<any>('/workspace/rfqs', { status: this.status(), q: this.q, page: this.page(), limit: 12 })
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.pages.set(r.pages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  setStatus(key: string) {
    this.status.set(key);
    this.page.set(1);
    this.load();
  }

  goPage(p: number) {
    this.page.set(p);
    this.load();
  }

  statusRows() {
    const m = this.metrics();
    if (!m) return [];
    const total = Math.max(1, m.totalRfqs);
    return [
      { key: 'new', label: 'Mới tiếp nhận', value: m.counts.new },
      { key: 'checking_configuration', label: 'Đang kiểm tra cấu hình', value: m.counts.checking_configuration },
      { key: 'quote_sent', label: 'Đã gửi báo giá', value: m.counts.quote_sent },
      { key: 'needs_adjustment', label: 'Cần điều chỉnh', value: m.counts.needs_adjustment },
      { key: 'confirmed', label: 'Đã xác nhận', value: m.counts.confirmed },
    ].map((r) => ({ ...r, pct: Math.round((r.value / total) * 100) }));
  }
}
