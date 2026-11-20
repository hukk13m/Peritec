import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../compare.service';

@Component({
  selector: 'app-compare-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (compare.count() > 0) {
      <div class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-8px_24px_rgba(16,24,40,0.08)] backdrop-blur">
        <div class="container-page flex flex-wrap items-center gap-3 py-3">
          <span class="text-xs font-bold uppercase tracking-wide text-brand">So sánh ({{ compare.count() }}/3)</span>
          <div class="flex flex-1 flex-wrap gap-2">
            @for (item of compare.items(); track item.id) {
              <span class="chip">
                {{ item.sku }}
                <button class="text-muted hover:text-danger" (click)="compare.remove(item.id)" aria-label="Bỏ so sánh">✕</button>
              </span>
            }
          </div>
          <button class="btn-ghost btn-sm" (click)="compare.clear()">Xóa chọn</button>
          <a routerLink="/compare" class="btn-primary btn-sm" [class.pointer-events-none]="compare.count() < 2"
             [class.opacity-50]="compare.count() < 2">So sánh thiết bị →</a>
        </div>
      </div>
    }
  `,
})
export class CompareBarComponent {
  compare = inject(CompareService);
}
