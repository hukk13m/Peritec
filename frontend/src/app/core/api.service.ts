import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  get<T>(path: string, params?: Record<string, any>) {
    return this.http.get<T>(this.base + path, { params: this.build(params) });
  }
  post<T>(path: string, body: any = {}) {
    return this.http.post<T>(this.base + path, body);
  }
  patch<T>(path: string, body: any = {}) {
    return this.http.patch<T>(this.base + path, body);
  }
  put<T>(path: string, body: any = {}) {
    return this.http.put<T>(this.base + path, body);
  }

  private build(params?: Record<string, any>) {
    let p = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
      }
    }
    return p;
  }

  static errorMessage(err: any): string {
    const body = err?.error;
    if (!body) return 'Không kết nối được máy chủ. Vui lòng thử lại.';
    if (body.error?.details && typeof body.error.details === 'object') {
      const first = Object.values(body.error.details)[0];
      if (typeof first === 'string') return first;
    }
    return body.error?.message || body.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}
