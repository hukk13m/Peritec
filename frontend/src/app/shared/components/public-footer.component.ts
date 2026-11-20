import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="mt-16 bg-navy text-slate-300">
      <div class="container-page grid gap-10 py-12 md:grid-cols-4">
        <div class="md:col-span-1">
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded bg-white/10"><span class="h-3.5 w-3.5 rounded-sm border-2 border-white"></span></span>
            <div>
              <p class="text-base font-extrabold tracking-tight text-white">PERITEC</p>
              <p class="text-[9px] uppercase tracking-[0.18em] text-slate-400">Measurement · Test</p>
            </div>
          </div>
          <p class="mt-4 text-sm leading-relaxed text-slate-400">Thiết bị và giải pháp cho đo lường, kiểm thử, tự động hóa tại Việt Nam.</p>
        </div>
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-wider text-white">Thiết bị</p>
          <ul class="space-y-2 text-sm">
            <li><a routerLink="/products" [queryParams]="{ application: 'rf-radio' }" class="hover:text-white">RF & Vô tuyến</a></li>
            <li><a routerLink="/products" [queryParams]="{ application: 'data-acquisition' }" class="hover:text-white">Thu thập dữ liệu</a></li>
            <li><a routerLink="/products" [queryParams]="{ application: 'electronics-test' }" class="hover:text-white">Kiểm thử điện tử</a></li>
            <li><a routerLink="/products" [queryParams]="{ application: 'automation' }" class="hover:text-white">Tự động hóa</a></li>
          </ul>
        </div>
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-wider text-white">Hỗ trợ</p>
          <ul class="space-y-2 text-sm">
            <li><a routerLink="/contact" class="hover:text-white">Tư vấn thiết bị</a></li>
            <li><a routerLink="/rfq" class="hover:text-white">Yêu cầu báo giá</a></li>
            <li><a routerLink="/login" class="hover:text-white">Customer Portal</a></li>
            <li><a routerLink="/login" class="hover:text-white">Đăng nhập nội bộ</a></li>
          </ul>
        </div>
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-wider text-white">Liên hệ</p>
          <ul class="space-y-2 text-sm text-slate-400">
            <li>sales@peritec.vn</li>
            <li>093 252 9288</li>
            <li>TP. Hồ Chí Minh, Việt Nam</li>
          </ul>
          <div class="mt-4 rounded border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            Website không bán hàng trực tuyến. Giá, cấu hình và thời gian giao chỉ được xác nhận trong báo giá chính thức.
          </div>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="container-page flex flex-col gap-2 py-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PERITEC Vietnam. MVP demo for academic evaluation.</p>
          <p>Chính sách bảo mật · Điều khoản sử dụng</p>
        </div>
      </div>
    </footer>
  `,
})
export class PublicFooterComponent {}
