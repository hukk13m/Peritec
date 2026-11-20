import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { Company, User } from './models';

const TOKEN_KEY = 'peritec_token';
const USER_KEY = 'peritec_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<User | null>(this.readUser());
  readonly company = signal<Company | null>(null);
  readonly isLoggedIn = computed(() => !!this.token() && !!this.user());

  login(email: string, password: string) {
    return this.api.post<{ token: string; user: User; company: Company | null }>('/auth/login', { email, password }).pipe(
      tap((res) => {
        this.token.set(res.token);
        this.user.set(res.user);
        this.company.set(res.company);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      })
    );
  }

  register(payload: any) {
    return this.api
      .post<{ token: string; user: User; company: Company | null }>('/auth/register', payload)
      .pipe(
        tap((res) => {
          this.token.set(res.token);
          this.user.set(res.user);
          this.company.set(res.company);
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        })
      );
  }

  loadMe() {
    if (!this.token()) return;
    this.api.get<{ user: User; company: Company | null }>('/auth/me').subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.company.set(res.company);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      },
      error: () => this.logout(),
    });
  }

  hasRole(...roles: User['role'][]) {
    const u = this.user();
    return !!u && roles.includes(u.role);
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    this.company.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
