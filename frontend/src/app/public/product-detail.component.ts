import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Application, Product } from '../core/models';
import { CartService } from '../shared/cart.service';
import { CompareService } from '../shared/compare.service';
import { ToastService } from '../shared/toast.service';
import { ProductCardComponent } from '../shared/components/product-card.component';
import { StatusBadgeComponent } from '../shared/components/status-badge.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent],
  template: `
    @if (product(); as p) {
      <div class="border-b border-line bg-white">
        <div class="container-page py-4 text-xs text-muted">
          <a routerLink="/" class="hover:text-brand">Trang chủ</a>
          <span class="mx-1.5">/</span>
          <a routerLink="/products" class="hover:text-brand">Thiết bị</a>
          <span class="mx-1.5">/</span>
          <span class="font-medium text-ink">{{ p.sku }}</span>
        </div>
      </div>

      <section class="container-page py-8">
        <div class="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <div class="card overflow-hidden">
              <img [src]="p.image" [alt]="p.name" class="h-[320px] w-full object-cover sm:h-[400px]" />
            </div>
            <div class="mt-3 grid grid-cols-3 gap-3">
              @for (label of ['Cấu hình theo yêu cầu', 'Tài liệu chuẩn hóa', 'Hỗ trợ kỹ thuật']; track label) {
                <div class="rounded-md border border-line bg-white p-3 text-center">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-brand">PERITEC</p>
                  <p class="mt-1 text-[11px] text-muted">{{ label }}</p>
                </div>
              }
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-brand">{{ p.brand }}</span>
              <span class="badge bg-success-soft text-success">Sẵn sàng tư vấn</span>
            </div>
            <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{{ p.name }}</h1>
            <p class="mt-1 text-sm text-muted">Mã model: <span class="font-semibold text-ink">{{ p.model }}</span> · Nhóm: {{ p.category }}</p>
            <p class="mt-4 text-sm leading-relaxed text-muted">{{ p.description }}</p>

            <div class="mt-4 flex flex-wrap gap-2">
              @for (app of applications(); track app.code) {
                <a routerLink="/products" [queryParams]="{ application: app.slug }" class="chip hover:border-brand">{{ app.name }}</a>
              }
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3">
              @for (spec of highlightSpecs(); track spec.label) {
                <div class="rounded-md border border-line bg-white p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">{{ spec.label }}</p>
                  <p class="mt-1 text-sm font-bold" [class.text-warn]="!spec.confirmed">
                    {{ spec.confirmed ? (spec.value || '—') + ' ' + (spec.unit || '') : 'Cần xác nhận' }}
                  </p>
                </div>
              }
            </div>

            <div class="card mt-5 p-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="label">Cấu hình yêu cầu</label>
                  <select class="input" name="config" [(ngModel)]="config">
                    <option value="">Tư vấn cấu hình tiêu chuẩn</option>
                    @for (c of p.configurations; track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
                <div>
                  <label class="label">Số lượng</label>
                  <div class="flex items-center">
                    <button class="btn-secondary h-[38px] rounded-r-none px-3" (click)="dec()">−</button>
                    <input type="number" min="1" class="input h-[38px] rounded-none text-center" name="qty" [(ngModel)]="quantity" />
                    <button class="btn-secondary h-[38px] rounded-l-none px-3" (click)="inc()">+</button>
                  </div>
                </div>
              </div>
              <div class="mt-3">
                <label class="label">Ghi chú cho thiết bị (không bắt buộc)</label>
                <textarea class="input" rows="2" name="note" [(ngModel)]="note" placeholder="Ví dụ: cần cấp USB 3.0, đối chiếu với hệ thống hiện có..."></textarea>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button class="btn-primary flex-1" (click)="addToCart()">Thêm vào giỏ RFQ</button>
                <button class="btn-secondary" (click)="toggleCompare()">{{ compare.has(p.id) ? 'Bỏ so sánh' : 'So sánh' }}</button>
              </div>
              <p class="mt-2 text-[11px] leading-relaxed text-muted">
                Website không bán hàng trực tuyến. Giá, cấu hình và thời gian giao được xác nhận trong báo giá chính thức.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="container-page pb-10">
        <div class="border-b border-line">
          <div class="flex gap-1 overflow-auto">
            @for (tab of tabs; track tab.key) {
              <button class="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition"
                      [class.border-brand]="activeTab() === tab.key" [class.text-brand]="activeTab() === tab.key"
                      [class.border-transparent]="activeTab() !== tab.key" [class.text-muted]="activeTab() !== tab.key"
                      (click)="activeTab.set(tab.key)">{{ tab.label }}</button>
            }
          </div>
        </div>

        @if (activeTab() === 'specs') {
          <div class="mt-5 grid gap-5 lg:grid-cols-2">
            @for (group of specGroups(); track group.name) {
              <div class="card overflow-hidden">
                <div class="border-b border-line bg-canvas px-4 py-2.5"><p class="text-sm font-bold">{{ group.name }}</p></div>
                <table class="table-base">
                  <tbody>
                    @for (spec of group.specs; track spec.label) {
                      <tr>
                        <td class="w-1/2 text-muted">{{ spec.label }}</td>
                        <td class="font-medium">
                          @if (spec.confirmed) {
                            {{ spec.value }}{{ spec.unit ? ' ' + spec.unit : '' }}
                          } @else {
                            <span class="badge bg-warn-soft text-warn">Cần xác nhận theo datasheet/cấu hình</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'docs') {
          <div class="card mt-5 overflow-hidden">
            <table class="table-base">
              <thead><tr><th>Tài liệu</th><th>Loại</th><th>Phiên bản</th><th>Ngôn ngữ</th><th>Truy cập</th><th></th></tr></thead>
              <tbody>
                @for (doc of p.documents; track doc.name) {
                  <tr>
                    <td class="font-medium">{{ doc.name }}</td>
                    <td>{{ doc.type }}</td>
                    <td>{{ doc.version }}</td>
                    <td>{{ doc.language }}</td>
                    <td>
                      @if (doc.access === 'public') {
                        <span class="badge bg-success-soft text-success">Công khai</span>
                      } @else {
                        <span class="badge bg-warn-soft text-warn">Cần xác nhận phiên bản</span>
                      }
                    </td>
                    <td class="text-right">
                      @if (doc.access === 'public') {
                        <a [href]="doc.url || '#'" target="_blank" class="btn-secondary btn-sm">Tải xuống</a>
                      } @else {
                        <button class="btn-secondary btn-sm" (click)="requestDoc(doc.name)">Gửi yêu cầu tải</button>
                      }
                    </td>
                  </tr>
                }
                @if (!p.documents.length) {
                  <tr><td colspan="6" class="py-6 text-center text-sm text-muted">Tài liệu đang được cập nhật.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-xs text-muted">Tài liệu cần xác nhận phiên bản sẽ được PERITEC kiểm tra theo đúng model trước khi gửi.</p>
        }

        @if (activeTab() === 'related') {
          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (r of related(); track r.id) { <app-product-card [product]="r" /> }
            @if (!related().length) { <p class="text-sm text-muted">Không có thiết bị liên quan.</p> }
          </div>
        }
      </section>
    } @else {
      <div class="container-page py-16"><div class="h-96 skeleton"></div></div>
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  cart = inject(CartService);
  compare = inject(CompareService);
  private toast = inject(ToastService);

  product = signal<Product | null>(null);
  related = signal<Product[]>([]);
  applications = signal<Application[]>([]);
  activeTab = signal<string>('specs');
  quantity = 1;
  config = '';
  note = '';
  tabs = [
    { key: 'specs', label: 'Thông số kỹ thuật' },
    { key: 'docs', label: 'Tài liệu & driver' },
    { key: 'related', label: 'Thiết bị liên quan' },
  ];

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      this.load(pm.get('slug') || '');
      window.scrollTo({ top: 0 });
    });
  }

  load(slug: string) {
    this.product.set(null);
    this.api.get<any>(`/products/${slug}`).subscribe({
      next: (res) => {
        this.product.set(res.product);
        this.applications.set(res.applications || []);
        this.related.set(res.related || []);
        this.quantity = 1;
        this.config = '';
        this.note = '';
      },
      error: () => this.toast.error('Không tìm thấy thiết bị.'),
    });
  }

  highlightSpecs() {
    return (this.product()?.specs || []).slice(0, 4);
  }

  specGroups() {
    const groups: { name: string; specs: any[] }[] = [];
    for (const s of this.product()?.specs || []) {
      let g = groups.find((x) => x.name === s.group);
      if (!g) {
        g = { name: s.group, specs: [] };
        groups.push(g);
      }
      g.specs.push(s);
    }
    return groups;
  }

  inc() {
    this.quantity = (Number(this.quantity) || 0) + 1;
  }
  dec() {
    this.quantity = Math.max(1, (Number(this.quantity) || 1) - 1);
  }

  addToCart() {
    const p = this.product();
    if (!p) return;
    this.cart.add(p, Math.max(1, Number(this.quantity) || 1), this.config, this.note);
    this.toast.success(`Đã thêm ${p.sku} vào giỏ RFQ.`);
  }

  toggleCompare() {
    const p = this.product();
    if (!p) return;
    const res = this.compare.toggle({ id: p.id, sku: p.sku, name: p.name });
    if (!res.ok) this.toast.error(res.message || '');
  }

  requestDoc(name: string) {
    this.toast.info(`Đã ghi nhận yêu cầu tài liệu "${name}". PERITEC sẽ kiểm tra phiên bản theo model trước khi gửi.`);
  }
}
