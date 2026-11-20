import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../core/models';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  image?: string;
  quantity: number;
  configRequest: string;
  itemNote: string;
}

const KEY = 'peritec_rfq_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.load());
  readonly count = computed(() => this.items().length);
  readonly totalQuantity = computed(() => this.items().reduce((s, i) => s + i.quantity, 0));

  add(product: Product, quantity = 1, configRequest = '', itemNote = '') {
    const items = [...this.items()];
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
      if (configRequest) existing.configRequest = configRequest;
      if (itemNote) existing.itemNote = itemNote;
    } else {
      items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        image: product.image,
        quantity: Math.max(1, quantity),
        configRequest,
        itemNote,
      });
    }
    this.commit(items);
  }

  update(productId: string, patch: Partial<CartItem>) {
    const items = this.items().map((i) => (i.productId === productId ? { ...i, ...patch } : i));
    this.commit(items);
  }

  remove(productId: string) {
    this.commit(this.items().filter((i) => i.productId !== productId));
  }

  clear() {
    this.commit([]);
  }

  has(productId: string) {
    return this.items().some((i) => i.productId === productId);
  }

  private commit(items: CartItem[]) {
    this.items.set(items);
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  private load(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }
}
