import { Component, inject } from '@angular/core';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.border-l-4]="true"
             [class.border-l-success]="t.type === 'success'"
             [class.border-l-danger]="t.type === 'error'"
             [class.border-l-brand]="t.type === 'info'">
          <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                [class.bg-success-soft]="t.type === 'success'"
                [class.text-success]="t.type === 'success'"
                [class.bg-danger-soft]="t.type === 'error'"
                [class.text-danger]="t.type === 'error'"
                [class.bg-brand-soft]="t.type === 'info'"
                [class.text-brand-dark]="t.type === 'info'">
            {{ t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i' }}
          </span>
          <p class="flex-1 text-sm text-ink">{{ t.message }}</p>
          <button class="text-muted hover:text-ink" (click)="toast.dismiss(t.id)" aria-label="Đóng">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  toast = inject(ToastService);
}
