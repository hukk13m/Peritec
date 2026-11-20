import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Application, Product } from '../core/models';
import { ProductCardComponent } from '../shared/components/product-card.component';
import { CompareService } from '../shared/compare.service';
import { CartService } from '../shared/cart.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, ProductCardComponent, RouterLink],
  template: `
    <section class="border-b border-line bg-white">
      <div class="container-page py-8">
        <p class="eyebrow">Danh mục thiết bị</p>
        <div class="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Tìm thiết bị phù hợp</h1>
            <p class="mt-1 text-sm text-muted">Lọc theo ứng dụng, hãng và thông số. So sánh tối đa 3 thiết bị cùng nhóm.</p>
          </div>
          <a routerLink="/rfq" class="btn-secondary btn-sm">Giỏ RFQ ({{ cart.count() }}) →</a>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <div class="relative flex-1 min-w-[240px]">
            <svg class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input class="input !pl-9" name="q" [(ngModel)]="q" (keyup.enter)="applyFilters()" placeholder="Tìm theo mã model, hãng hoặc từ khóa..." />
          </div>
          <button class="btn-secondary lg:hidden" (click)="showFilters.set(!showFilters())">Bộ lọc ({{ activeCount() }})</button>
          <select class="input !w-auto" name="sort" [(ngModel)]="sort" (change)="applyFilters()">
            <option value="relevance">Liên quan nhất</option>
            <option value="newest">Mới nhất</option>
            <option value="name">Tên A → Z</option>
            <option value="brand">Theo hãng</option>
          </select>
          <button class="btn-primary" (click)="applyFilters()">Tìm</button>
        </div>

        @if (activeChips().length) {
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold text-muted">Đang lọc:</span>
            @for (chip of activeChips(); track chip.key) {
              <span class="chip chip-active">
                {{ chip.label }}
                <button class="hover:text-danger" (click)="removeChip(chip.key)" aria-label="Bỏ lọc">✕</button>
              </span>
            }
            <button class="text-xs font-semibold text-brand hover:underline" (click)="reset()">Xóa tất cả</button>
          </div>
        }
      </div>
    </section>

    <section class="container-page py-8">
      <div class="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside class="card h-fit p-4 lg:block" [class.hidden]="!showFilters()">
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold">Bộ lọc</p>
            <button class="text-xs text-brand hover:underline" (click)="reset()">Đặt lại</button>
          </div>

          <div class="mt-4">
            <p class="label">Ứng dụng</p>
            <div class="space-y-1">
              @for (app of applications(); track app.code) {
                <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-canvas">
                  <input type="radio" name="app" class="accent-brand" [checked]="application === app.slug" (change)="selectApp(app.slug)" />
                  <span>{{ app.name }}</span>
                </label>
              }
              <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-canvas">
                <input type="radio" name="app" class="accent-brand" [checked]="!application" (change)="selectApp('')" />
                <span>Tất cả ứng dụng</span>
              </label>
            </div>
          </div>

          <div class="mt-5 border-t border-line pt-4">
            <p class="label">Thương hiệu</p>
            <div class="max-h-64 space-y-1 overflow-auto pr-1 scrollbar-thin">
              @for (b of brands(); track b) {
                <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-canvas">
                  <input type="checkbox" class="accent-brand" [checked]="selectedBrands().includes(b)" (change)="toggleBrand(b)" />
                  <span>{{ b }}</span>
                </label>
              }
              @if (!brands().length) { <p class="px-2 text-xs text-muted">Đang tải...</p> }
            </div>
          </div>

          <div class="mt-5 rounded-md bg-canvas p-3 text-[11px] leading-relaxed text-muted">
            <p class="font-semibold text-ink">Cần tư vấn cấu hình?</p>
            <a routerLink="/contact" class="mt-1 inline-block font-semibold text-brand hover:underline">Gửi câu hỏi cho kỹ sư →</a>
          </div>
        </aside>

        <div>
          <div class="mb-4 flex items-center justify-between gap-3">
            <p class="text-sm text-muted"><span class="font-bold text-ink">{{ total() }}</span> thiết bị phù hợp</p>
            <p class="hidden text-xs text-muted sm:block">Giá và thời gian giao được xác nhận trong báo giá chính thức.</p>
          </div>

          @if (loading()) {
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (i of [1,2,3,4,5,6]; track i) { <div class="h-80 skeleton"></div> }
            </div>
          } @else if (products().length) {
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (p of products(); track p.id) { <app-product-card [product]="p" /> }
            </div>
            @if (pages() > 1) {
              <div class="mt-6 flex items-center justify-center gap-2">
                <button class="btn-secondary btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">← Trước</button>
                <span class="text-xs text-muted">Trang {{ page() }} / {{ pages() }}</span>
                <button class="btn-secondary btn-sm" [disabled]="page() >= pages()" (click)="goPage(page() + 1)">Sau →</button>
              </div>
            }
          } @else {
            <div class="card flex flex-col items-center p-12 text-center">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-muted">
                <svg style="width:22px;height:22px" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              </span>
              <p class="mt-3 text-sm font-bold">Không tìm thấy thiết bị phù hợp</p>
              <p class="mt-1 max-w-sm text-xs text-muted">Thử bỏ một vài điều kiện lọc, hoặc gửi yêu cầu để PERITEC tư vấn cấu hình thay thế.</p>
              <div class="mt-4 flex gap-2">
                <button class="btn-secondary btn-sm" (click)="reset()">Xóa bộ lọc</button>
                <a routerLink="/contact" class="btn-primary btn-sm">Gửi yêu cầu tư vấn</a>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  compare = inject(CompareService);
  cart = inject(CartService);

  applications = signal<Application[]>([]);
  brands = signal<string[]>([]);
  products = signal<Product[]>([]);
  selectedBrands = signal<string[]>([]);
  total = signal(0);
  pages = signal(0);
  page = signal(1);
  loading = signal(true);
  showFilters = signal(false);

  q = '';
  application = '';
  sort = 'relevance';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.q = params.get('q') || '';
    this.application = params.get('application') || '';
    this.sort = params.get('sort') || 'relevance';
    this.api.get<{ items: Application[] }>('/applications').subscribe((r) => this.applications.set(r.items));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .get<any>('/products', {
        q: this.q,
        application: this.application,
        brand: this.selectedBrands().join(','),
        sort: this.sort,
        page: this.page(),
        limit: 12,
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.items);
          this.total.set(res.total);
          this.pages.set(res.pages);
          if (res.facets?.brands) this.brands.set(res.facets.brands);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilters() {
    this.page.set(1);
    this.load();
  }

  selectApp(slug: string) {
    this.application = slug;
    this.applyFilters();
  }

  toggleBrand(brand: string) {
    const list = this.selectedBrands();
    this.selectedBrands.set(list.includes(brand) ? list.filter((b) => b !== brand) : [...list, brand]);
    this.applyFilters();
  }

  removeChip(key: string) {
    if (key === 'app') this.application = '';
    else if (key.startsWith('brand:')) this.selectedBrands.set(this.selectedBrands().filter((b) => b !== key.slice(6)));
    else if (key === 'q') this.q = '';
    this.applyFilters();
  }

  activeCount() {
    return (this.application ? 1 : 0) + this.selectedBrands().length + (this.q ? 1 : 0);
  }

  activeChips() {
    const chips: { key: string; label: string }[] = [];
    if (this.q) chips.push({ key: 'q', label: `Từ khóa: ${this.q}` });
    if (this.application) {
      const app = this.applications().find((a) => a.slug === this.application);
      chips.push({ key: 'app', label: app?.name || this.application });
    }
    for (const b of this.selectedBrands()) chips.push({ key: 'brand:' + b, label: b });
    return chips;
  }

  reset() {
    this.q = '';
    this.application = '';
    this.selectedBrands.set([]);
    this.sort = 'relevance';
    this.page.set(1);
    this.load();
  }

  goPage(p: number) {
    this.page.set(p);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
