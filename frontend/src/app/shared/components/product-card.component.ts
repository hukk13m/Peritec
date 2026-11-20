import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models';
import { CartService } from '../cart.service';
import { CompareService } from '../compare.service';
import { ToastService } from '../toast.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float">
      <a [routerLink]="['/products', product.slug]" class="relative block bg-slate-50">
        @if (product.sku === 'SAN-90') {
          <span class="absolute left-3 top-3 z-10 rounded bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Nổi bật</span>
        }
        <img [src]="product.image" [alt]="product.name" class="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
      </a>
      <div class="flex flex-1 flex-col p-4">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-[11px] font-bold uppercase tracking-wide text-brand">{{ product.brand }}</span>
          <span class="text-[11px] text-muted">{{ product.sku }}</span>
        </div>
        <a [routerLink]="['/products', product.slug]" class="line-clamp-2 text-sm font-bold leading-snug text-ink hover:text-brand">
          {{ product.name }}
        </a>
        <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{{ product.shortDescription }}</p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          @for (spec of topSpecs; track spec.label) {
            <span class="rounded bg-canvas px-2 py-1 text-[10px] font-medium text-slate-600">
              {{ spec.label }}: {{ spec.confirmed ? spec.value : 'Cần xác nhận' }}{{ spec.confirmed ? ' ' + (spec.unit || '') : '' }}
            </span>
          }
        </div>

        <div class="mt-auto pt-4">
          <div class="mb-3 flex items-center gap-1.5 text-[11px] text-muted">
            <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
            {{ product.availability }}
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-primary flex-1 !py-2 text-xs" (click)="addToCart()">Thêm vào giỏ RFQ</button>
            <label class="flex cursor-pointer items-center gap-1.5 rounded border border-line px-2.5 py-2 text-[11px] font-medium text-muted hover:border-brand hover:text-brand">
              <input type="checkbox" class="h-3.5 w-3.5 accent-brand" [checked]="compare.has(product.id)" (change)="toggleCompare()" />
              So sánh
            </label>
          </div>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  cart = inject(CartService);
  compare = inject(CompareService);
  private toast = inject(ToastService);
  private api = inject(ApiService);

  get topSpecs() {
    return (this.product.specs || []).slice(0, 3);
  }

  addToCart() {
    this.cart.add(this.product);
    this.toast.success(`Đã thêm ${this.product.sku} vào giỏ RFQ.`);
  }

  toggleCompare() {
    const res = this.compare.toggle({ id: this.product.id, sku: this.product.sku, name: this.product.name });
    if (!res.ok) this.toast.error(res.message || 'Không thể thêm thiết bị.');
    if (res.ok && this.compare.has(this.product.id)) {
      // BR-13: warn early when the selected devices belong to different groups.
      const ids = this.compare.items().map((i) => i.id);
      if (ids.length >= 2) {
        this.api.post<any>('/products/compare', { ids }).subscribe({
          next: () => {},
          error: (err) => {
            this.toast.error(ApiService.errorMessage(err));
            this.compare.remove(this.product.id);
          },
        });
      }
    }
  }
}
