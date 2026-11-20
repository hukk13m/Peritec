import { Component, Input } from '@angular/core';
import { badgeClass } from '../ui';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="badgeClass(status)">{{ label || status }}</span>`,
})
export class StatusBadgeComponent {
  @Input() status = '';
  @Input() label?: string;
  badgeClass = badgeClass;
}
