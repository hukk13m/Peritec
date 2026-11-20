import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CompareResult, Product } from '../core/models';
import { CompareService } from '../shared/compare.service';
import { CartService } from '../shared/cart.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="container-page py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">So sánh thiết bị</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">So sánh tối đa 3 thiết bị cùng nhóm</h1>
          <p class="mt-1 text-sm text-muted">Thông số chưa xác nhận được giữ trống và ghi rõ nguồn cần đối chiếu, không tự điền giá trị.</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-medium">
            <input type="checkbox" class="accent-brand" [checked]="highlight()" (change)="highlight.set(!highlight())" />
            Tô sáng khác biệt
          </label>
          <button class="btn-secondary btn-sm" (click)="compare.clear(); result.set(null)">Xóa tất cả</button>
        </div>
      </div>

      @if (compare.count() < 2) {
        <div class="card mt-6 flex flex-col items-center p-12 text-center">
          <p class="text-base font-bold">Chọn ít nhất 2 thiết bị để so sánh</p>
          <p class="mt-1 max-w-md text-sm text-muted">Thiết bị phải thuộc cùng nhóm ứng dụng để các dòng thông số có thể đối chiếu trực tiếp.</p>
          <a routerLink="/products" class="btn-primary mt-4">Tìm thiết bị</a>
        </div>
      } @else if (result(); as r) {
        <p class="mt-4 text-xs text-muted">Nhóm ứng dụng: <span class="font-semibold text-ink">{{ r.applicationCode }}</span> · {{ r.products.length }} thiết bị</p>

        <div class="card mt-3 overflow-x-auto scrollbar-thin">
          <table class="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr>
                <th class="w-40 border-b border-line bg-canvas px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Tiêu chí</th>
                @for (p of r.products; track p.id) {
                  <th class="border-b border-l border-line bg-white px-4 py-3 text-left align-top">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <p class="text-[10px] font-bold uppercase tracking-wide text-brand">{{ p.brand }}</p>
                        <a [routerLink]="['/products', p.slug]" class="mt-0.5 block text-sm font-bold text-ink hover:text-brand">{{ p.sku }}</a>
                        <p class="mt-0.5 max-w-[180px] text-[11px] font-normal text-muted">{{ p.name }}</p>
                      </div>
                      <button class="text-muted hover:text-danger" (click)="remove(p.id)" aria-label="Bỏ so sánh">✕</button>
                    </div>
                    <button class="btn-secondary btn-sm mt-3 w-full" (click)="addToCart(p)">Thêm vào RFQ</button>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of r.rows; track row.group + row.label) {
                <tr [class.bg-warn-soft]="highlight() && row.different" [class.bg-opacity-40]="highlight() && row.different">
                  <td class="border-b border-line px-4 py-3 align-top">
                    <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">{{ row.group }}</p>
                    <p class="mt-0.5 font-medium text-ink">{{ row.label }}</p>
                  </td>
                  @for (cell of row.cells; track $index) {
                    <td class="border-b border-l border-line px-4 py-3 align-top">
                      @if (cell.confirmed) {
                        <span [class.font-semibold]="highlight() && row.different">{{ cell.display }}</span>
                      } @else {
                        <span class="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">
                          Cần xác nhận theo datasheet/cấu hình
                        </span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
          <p class="text-xs text-muted">Cần thêm thiết bị khác? Việc so sánh không thay thế kiểm tra tương thích kỹ thuật.</p>
          <div class="flex gap-2">
            <a routerLink="/products" class="btn-secondary btn-sm">Chọn thêm thiết bị</a>
            <a routerLink="/rfq" class="btn-primary btn-sm">Đi tới giỏ RFQ →</a>
          </div>
        </div>
      } @else {
        <div class="mt-6 h-64 skeleton"></div>
      }
    </section>
  `,
})
export class CompareComponent implements OnInit {
  compare = inject(CompareService);
  private api = inject(ApiService);
  private cart = inject(CartService);
  private toast = inject(ToastService);
  result = signal<CompareResult | null>(null);
  highlight = signal(true);

  ngOnInit() {
    this.load();
  }

  load() {
    const ids = this.compare.items().map((i) => i.id);
    if (ids.length < 2) {
      this.result.set(null);
      return;
    }
    this.api.post<CompareResult>('/products/compare', { ids }).subscribe({
      next: (r) => this.result.set(r),
      error: (err) => {
        this.toast.error(ApiService.errorMessage(err));
        this.result.set(null);
      },
    });
  }

  remove(id: string) {
    this.compare.remove(id);
    this.load();
  }

  addToCart(p: Product) {
    this.cart.add(p);
    this.toast.success(`Đã thêm ${p.sku} vào giỏ RFQ.`);
  }
}
