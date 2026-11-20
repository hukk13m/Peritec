import { Injectable, computed, signal } from '@angular/core';

export interface CompareItem {
  id: string;
  sku: string;
  name: string;
}

const KEY = 'peritec_compare';

@Injectable({ providedIn: 'root' })
export class CompareService {
  readonly items = signal<CompareItem[]>(this.load());
  readonly count = computed(() => this.items().length);

  toggle(item: CompareItem): { ok: boolean; message?: string } {
    const items = [...this.items()];
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items.splice(idx, 1);
      this.commit(items);
      return { ok: true };
    }
    if (items.length >= 3) {
      return { ok: false, message: 'Chỉ so sánh tối đa 3 thiết bị. Hãy bỏ bớt một thiết bị trước.' };
    }
    items.push(item);
    this.commit(items);
    return { ok: true };
  }

  has(id: string) {
    return this.items().some((i) => i.id === id);
  }

  remove(id: string) {
    this.commit(this.items().filter((i) => i.id !== id));
  }

  clear() {
    this.commit([]);
  }

  private commit(items: CompareItem[]) {
    this.items.set(items);
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  private load(): CompareItem[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }
}
