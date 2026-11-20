import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Application, Product } from '../core/models';
import { ProductCardComponent } from '../shared/components/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent],
  template: `
    <section class="relative overflow-hidden bg-navy text-white">
      <div class="absolute inset-0 opacity-20"
           style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.35) 1px, transparent 0); background-size: 26px 26px;"></div>
      <div class="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-brand/30 blur-3xl"></div>
      <div class="container-page relative grid gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
        <div class="max-w-2xl">
          <p class="eyebrow !text-sky-300">Thiết bị đo lường · Kiểm thử · Tự động hóa</p>
          <h1 class="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
            Kết nối công nghệ.<br />Đồng hành giải pháp.
          </h1>
          <p class="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            PERITEC phân phối thiết bị và cấp giải pháp đo lường, kiểm thử, điều khiển, tự động hóa.
            Tìm thiết bị theo ứng dụng, so sánh cấu hình và gửi yêu cầu báo giá trong một luồng duy nhất.
          </p>

          <form class="mt-7 flex max-w-xl overflow-hidden rounded-lg bg-white p-1.5 shadow-float" (ngSubmit)="search()">
            <input name="q" [(ngModel)]="q" class="min-w-0 flex-1 rounded px-3 py-2 text-sm text-ink outline-none placeholder:text-slate-400"
                   placeholder="Nhập mã thiết bị, hãng hoặc từ khóa (SAN-90, NI, DAQ...)" />
            <button class="btn-primary shrink-0">Tìm thiết bị</button>
          </form>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Gợi ý:</span>
            @for (tag of ['SAN-90', 'NI mioDAQ', 'USRP X420']; track tag) {
              <button class="rounded-full border border-white/15 px-2.5 py-1 text-slate-200 hover:border-white/40 hover:text-white" (click)="quickSearch(tag)">{{ tag }}</button>
            }
          </div>

          <div class="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <div><p class="text-lg font-bold">20+</p><p class="text-[11px] text-slate-400">Thương hiệu đối tác</p></div>
            <div><p class="text-lg font-bold">3 bước</p><p class="text-[11px] text-slate-400">Từ chọn thiết bị đến RFQ</p></div>
            <div><p class="text-lg font-bold">5 chặng</p><p class="text-[11px] text-slate-400">Theo dõi đơn nhập khẩu</p></div>
          </div>
        </div>

        <div class="relative hidden lg:block">
          <div class="absolute inset-6 rounded-2xl bg-white/5"></div>
          <img src="/assets/products/rf.svg" alt="Thiết bị đo lường PERITEC"
               class="relative h-full max-h-[340px] w-full rounded-2xl border border-white/10 object-cover shadow-float" />
          <div class="absolute -bottom-4 left-6 right-6 rounded-lg border border-white/10 bg-navy-light/95 p-4 shadow-float backdrop-blur">
            <p class="text-[10px] font-bold uppercase tracking-wider text-sky-300">HAROGIC SAN Series</p>
            <p class="mt-1 text-sm font-bold">Máy phân tích phổ RF · 4.5 / 6.0 / 9.5 GHz</p>
            <a routerLink="/products/harogic-san-90" class="mt-2 inline-flex text-xs font-semibold text-sky-300 hover:text-white">Xem chi tiết →</a>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page -mt-6 relative z-10">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        @for (app of apps(); track app.code) {
          <a [routerLink]="['/products']" [queryParams]="{ application: app.slug }"
             class="card group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-float">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <svg style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="iconFor(app.code)" />
              </svg>
            </span>
            <span>
              <span class="block text-sm font-bold text-ink group-hover:text-brand">{{ app.name }}</span>
              <span class="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted">{{ app.description }}</span>
            </span>
          </a>
        }
      </div>
    </section>

    <section class="container-page mt-14">
      <div class="overflow-hidden rounded-xl bg-navy">
        <div class="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">Hợp tác tại Việt Nam</p>
            <p class="mt-2 text-3xl font-extrabold tracking-tight text-white">NI / Emerson</p>
            <p class="mt-1 text-xs text-slate-400">Thiết bị, phần mềm và giải pháp trong cùng hệ sinh thái.</p>
          </div>
          <div class="text-sm leading-relaxed text-slate-300">
            PERITEC cung cấp sản phẩm phần cứng, phần mềm và giải pháp công nghệ của NI tại Việt Nam:
            LabVIEW, TestStand, VeriStand, FPGA, cRIO, CompactDAQ, DAQ và USRP.
            <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              @for (brand of ['NI', 'HAROGIC', 'Ettus Research', 'Digilent', 'Pickering', 'AMETEK']; track brand) {
                <span class="rounded border border-white/15 px-2 py-1">{{ brand }}</span>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container-page mt-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Danh mục thiết bị</p>
          <h2 class="section-title mt-1">Thiết bị được quan tâm</h2>
          <p class="mt-1 text-sm text-muted">Thông số kỹ thuật và tài liệu được chuẩn hóa theo từng model.</p>
        </div>
        <a routerLink="/products" class="btn-secondary btn-sm">Xem toàn bộ danh mục →</a>
      </div>
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (p of products(); track p.id) {
          <app-product-card [product]="p" />
        }
        @if (!products().length) {
          @for (i of [1,2,3,4]; track i) {
            <div class="card h-80 skeleton"></div>
          }
        }
      </div>
    </section>

    <section class="container-page mt-16">
      <div class="grid gap-5 lg:grid-cols-3">
        @for (step of steps; track step.no) {
          <div class="card-pad">
            <p class="text-xs font-extrabold text-brand">0{{ step.no }}</p>
            <h3 class="mt-2 text-base font-bold">{{ step.title }}</h3>
            <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ step.text }}</p>
          </div>
        }
      </div>
    </section>

    <section class="container-page mt-14">
      <div class="rounded-xl border border-line bg-white p-6 sm:p-8 lg:flex lg:items-center lg:justify-between">
        <div>
          <p class="eyebrow">Cần tư vấn cấu hình?</p>
          <h2 class="mt-1 text-xl font-bold">Trao đổi với kỹ sư PERITEC</h2>
          <p class="mt-1 max-w-2xl text-sm text-muted">Mô tả bài toán đo lường, tín hiệu và môi trường sử dụng. PERITEC sẽ đề xuất cấu hình phù hợp trước khi báo giá.</p>
        </div>
        <div class="mt-4 flex gap-2 lg:mt-0">
          <a routerLink="/contact" class="btn-primary">Gửi yêu cầu tư vấn</a>
          <a routerLink="/rfq" class="btn-secondary">Tạo RFQ</a>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  apps = signal<Application[]>([]);
  products = signal<Product[]>([]);
  q = '';
  steps = [
    { no: 1, title: 'Tìm theo ứng dụng', text: 'Lọc theo nhóm ứng dụng, hãng và thông số kỹ thuật thay vì ghi nhớ mã thiết bị.' },
    { no: 2, title: 'So sánh & cấu hình', text: 'So sánh tối đa 3 thiết bị cùng nhóm; thông số chưa xác nhận được ghi rõ thay vì tự điền.' },
    { no: 3, title: 'Gửi RFQ & theo dõi', text: 'Một yêu cầu cho nhiều thiết bị, nhận mã RFQ và theo dõi báo giá, đơn hàng trong portal.' },
  ];

  ngOnInit() {
    this.api.get<{ items: Application[] }>('/applications').subscribe((r) => this.apps.set(r.items));
    this.api.get<{ items: Product[] }>('/products', { limit: 4, sort: 'relevance' }).subscribe((r) => this.products.set(r.items));
  }

  search() {
    this.router.navigate(['/products'], { queryParams: this.q ? { q: this.q } : {} });
  }

  quickSearch(value: string) {
    this.router.navigate(['/products'], { queryParams: { q: value } });
  }

  iconFor(code: string) {
    switch (code) {
      case 'DA':
        return 'M4 19h16M6 16V8m6 8V4m6 12v-6';
      case 'RF':
        return 'M12 20a8 8 0 100-16 8 8 0 000 16zm0-4a4 4 0 100-8 4 4 0 000 8zm0-4h.01';
      case 'ET':
        return 'M4 5h16v10H4zM8 19h8M12 15v4';
      default:
        return 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1M16 12a4 4 0 11-8 0 4 4 0 018 0z';
    }
  }
}
