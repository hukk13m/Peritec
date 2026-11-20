import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from '../shared/components/public-header.component';
import { PublicFooterComponent } from '../shared/components/public-footer.component';
import { CompareBarComponent } from '../shared/components/compare-bar.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeaderComponent, PublicFooterComponent, CompareBarComponent],
  template: `
    <app-public-header />
    <main class="min-h-[60vh]">
      <router-outlet />
    </main>
    <app-public-footer />
    <app-compare-bar />
    <div class="h-4"></div>
  `,
})
export class PublicLayoutComponent {}
