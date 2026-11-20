import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { roleLabel } from '../ui';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-40 bg-navy/40 lg:hidden" (click)="close.emit()"></div>
    }
    <aside class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy text-slate-300 transition-transform duration-200 lg:translate-x-0"
           [class.-translate-x-full]="!open">
      <div class="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span class="flex h-9 w-9 items-center justify-center rounded bg-white/10"><span class="h-3.5 w-3.5 rounded-sm border-2 border-white"></span></span>
        <div>
          <p class="text-base font-extrabold tracking-tight text-white">PERITEC</p>
          <p class="text-[9px] uppercase tracking-[0.16em] text-slate-400">{{ section }}</p>
        </div>
        <button class="ml-auto text-slate-400 hover:text-white lg:hidden" (click)="close.emit()" aria-label="Đóng">✕</button>
      </div>

      <div class="px-3 py-4">
        <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Không gian làm việc</p>
        <nav class="space-y-0.5">
          @for (item of items; track item.path) {
            @if (!item.roles || hasAnyRole(item.roles)) {
              <a [routerLink]="item.path" [routerLinkActive]="'nav-item-active'" [routerLinkActiveOptions]="{ exact: !!item.exact }"
                 class="nav-item" (click)="close.emit()">
                <svg class="h-4.5 w-4.5 shrink-0" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.icon" />
                </svg>
                <span>{{ item.label }}</span>
              </a>
            }
          }
        </nav>
      </div>

      <div class="mt-auto border-t border-white/10 p-3">
        <a routerLink="/" class="nav-item" (click)="close.emit()">
          <svg style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" />
          </svg>
          <span>Về trang public</span>
        </a>
        <div class="mt-2 rounded-md bg-white/5 p-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">{{ initials() }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-white">{{ auth.user()?.name }}</p>
              <p class="text-[10px] text-slate-400">{{ roleLabel(auth.user()?.role) }}</p>
            </div>
            <button class="text-slate-400 hover:text-white" (click)="logout()" title="Đăng xuất">
              <svg style="width:16px;height:16px" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4M10 3h9a2 2 0 012 2v14a2 2 0 01-2 2h-9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  @Input() items: NavItem[] = [];
  @Input() section = '';
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  auth = inject(AuthService);
  private router = inject(Router);
  roleLabel = roleLabel;

  hasAnyRole(roles: string[]) {
    return roles.includes(this.auth.user()?.role || '');
  }

  initials() {
    const name = this.auth.user()?.name || '';
    return name.split(' ').slice(-2).map((x) => x[0]).join('').toUpperCase();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
