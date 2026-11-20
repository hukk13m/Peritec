import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../cart.service';
import { CompareService } from '../compare.service';
import { roleLabel } from '../ui';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div class="container-page flex h-16 items-center gap-4">
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded bg-navy">
            <span class="h-3.5 w-3.5 rounded-sm border-2 border-white"></span>
          </span>
          <span class="leading-none">
            <span class="block text-[17px] font-extrabold tracking-tight text-navy">PERITEC</span>
            <span class="block text-[9px] font-medium uppercase tracking-[0.18em] text-muted">Measurement · Test</span>
          </span>
        </a>

        <nav class="ml-6 hidden items-center gap-1 lg:flex">
          <a routerLink="/products" routerLinkActive="text-brand" class="rounded px-3 py-2 text-sm font-semibold text-ink hover:text-brand">Thiết bị</a>
          <a routerLink="/products" [queryParams]="{ application: 'rf-radio' }" class="rounded px-3 py-2 text-sm font-semibold text-ink hover:text-brand">RF & Vô tuyến</a>
          <a routerLink="/products" [queryParams]="{ application: 'data-acquisition' }" class="rounded px-3 py-2 text-sm font-semibold text-ink hover:text-brand">Thu thập dữ liệu</a>
          <a routerLink="/contact" class="rounded px-3 py-2 text-sm font-semibold text-ink hover:text-brand">Tư vấn kỹ thuật</a>
        </nav>

        <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
          <a routerLink="/compare" class="relative hidden rounded-md p-2 text-muted hover:bg-canvas hover:text-brand sm:block" title="So sánh thiết bị">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8M8 12h8M8 17h8M4 7h.01M4 12h.01M4 17h.01" />
            </svg>
            @if (compare.count() > 0) {
              <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{{ compare.count() }}</span>
            }
          </a>

          <a routerLink="/rfq" class="relative inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-bold text-ink hover:border-brand hover:text-brand">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l2.4 12.3a2 2 0 001.96 1.7h7.9a2 2 0 001.96-1.6L21 7H6" />
              <circle cx="9" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" />
            </svg>
            Giỏ RFQ
            <span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-white">{{ cart.count() }}</span>
          </a>

          @if (auth.isLoggedIn()) {
            <div class="relative">
              <button class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-canvas" (click)="menu.set(!menu())">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{{ initials() }}</span>
                <span class="hidden text-left sm:block">
                  <span class="block max-w-[130px] truncate text-xs font-bold text-ink">{{ auth.user()?.name }}</span>
                  <span class="block text-[10px] text-muted">{{ roleLabel(auth.user()?.role) }}</span>
                </span>
              </button>
              @if (menu()) {
                <div class="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-float">
                  <div class="border-b border-line px-3 py-2">
                    <p class="text-xs font-bold text-ink">{{ auth.user()?.name }}</p>
                    <p class="truncate text-[11px] text-muted">{{ auth.user()?.email }}</p>
                  </div>
                  <a [routerLink]="portalLink()" class="block px-3 py-2 text-sm hover:bg-canvas" (click)="menu.set(false)">
                    {{ auth.hasRole('customer') ? 'Customer Portal' : 'Internal Workspace' }}
                  </a>
                  <a routerLink="/portal/rfqs" class="block px-3 py-2 text-sm hover:bg-canvas" (click)="menu.set(false)">Lịch sử báo giá</a>
                  <button class="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft" (click)="logout()">Đăng xuất</button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="hidden px-2 text-sm font-semibold text-ink hover:text-brand sm:block">Đăng nhập</a>
            <a routerLink="/contact" class="btn-primary btn-sm hidden sm:inline-flex">Liên hệ</a>
          }

          <button class="rounded-md p-2 text-ink hover:bg-canvas lg:hidden" (click)="mobile.set(!mobile())" aria-label="Mở menu">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      @if (mobile()) {
        <div class="border-t border-line bg-white px-4 py-3 lg:hidden">
          <a routerLink="/products" class="block rounded px-3 py-2 text-sm font-semibold hover:bg-canvas" (click)="mobile.set(false)">Thiết bị</a>
          <a routerLink="/compare" class="block rounded px-3 py-2 text-sm font-semibold hover:bg-canvas" (click)="mobile.set(false)">So sánh thiết bị</a>
          <a routerLink="/contact" class="block rounded px-3 py-2 text-sm font-semibold hover:bg-canvas" (click)="mobile.set(false)">Tư vấn kỹ thuật</a>
          @if (!auth.isLoggedIn()) {
            <a routerLink="/login" class="block rounded px-3 py-2 text-sm font-semibold text-brand" (click)="mobile.set(false)">Đăng nhập doanh nghiệp</a>
          } @else {
            <a [routerLink]="portalLink()" class="block rounded px-3 py-2 text-sm font-semibold text-brand" (click)="mobile.set(false)">Vào portal</a>
          }
        </div>
      }
    </header>
  `,
})
export class PublicHeaderComponent {
  auth = inject(AuthService);
  cart = inject(CartService);
  compare = inject(CompareService);
  private router = inject(Router);
  menu = signal(false);
  mobile = signal(false);
  roleLabel = roleLabel;

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.menu.set(false);
  }

  initials() {
    const name = this.auth.user()?.name || '';
    return name.split(' ').slice(-2).map((x) => x[0]).join('').toUpperCase();
  }

  portalLink() {
    return this.auth.hasRole('customer') ? '/portal' : '/workspace';
  }

  logout() {
    this.auth.logout();
    this.menu.set(false);
    this.router.navigate(['/']);
  }
}
