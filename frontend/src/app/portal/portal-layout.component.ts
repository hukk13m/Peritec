import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent, NavItem } from '../shared/components/sidebar.component';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="min-h-screen bg-canvas">
      <app-sidebar [items]="nav" section="Customer Portal" [open]="open()" (close)="open.set(false)" />
      <div class="lg:pl-64">
        <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button class="rounded p-2 text-ink hover:bg-canvas lg:hidden" (click)="open.set(true)" aria-label="Mở menu">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">PERITEC Account</p>
            <p class="text-sm font-bold text-ink">Cổng thông tin doanh nghiệp</p>
          </div>
          <div class="ml-auto hidden items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs text-muted sm:flex">
            <span class="h-2 w-2 rounded-full bg-success"></span>
            Dữ liệu chỉ thuộc doanh nghiệp của bạn
          </div>
        </header>
        <main class="px-4 py-6 pb-16 sm:px-6 lg:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class PortalLayoutComponent {
  open = signal(false);
  nav: NavItem[] = [
    { label: 'Tổng quan', path: '/portal', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z', exact: true },
    { label: 'Yêu cầu báo giá', path: '/portal/rfqs', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { label: 'Đơn hàng & giao vận', path: '/portal/orders', icon: 'M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 100-4 2 2 0 000 4zM18 20a2 2 0 100-4 2 2 0 000 4z' },
    { label: 'Tài liệu của tôi', path: '/portal/documents', icon: 'M6 2h8l4 4v16H6zM14 2v5h5' },
    { label: 'Doanh nghiệp', path: '/portal/company', icon: 'M4 21V5a2 2 0 012-2h7a2 2 0 012 2v16M15 9h3a2 2 0 012 2v10M8 7h3M8 11h3M8 15h3M3 21h18' },
  ];
}
