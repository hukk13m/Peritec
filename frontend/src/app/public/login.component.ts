import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="container-page py-10">
      <div class="mx-auto grid max-w-4xl overflow-hidden rounded-xl border border-line bg-white shadow-card lg:grid-cols-[0.9fr_1.1fr]">
        <div class="relative hidden bg-navy p-8 text-white lg:block">
          <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.35) 1px, transparent 0); background-size: 24px 24px;"></div>
          <div class="relative">
            <div class="flex items-center gap-2.5">
              <span class="flex h-9 w-9 items-center justify-center rounded bg-white/10"><span class="h-3.5 w-3.5 rounded-sm border-2 border-white"></span></span>
              <div><p class="text-base font-extrabold">PERITEC</p><p class="text-[9px] uppercase tracking-[0.18em] text-slate-400">Account</p></div>
            </div>
            <h2 class="mt-10 text-2xl font-extrabold leading-tight">Một tài khoản cho toàn bộ giao dịch B2B.</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-300">Theo dõi yêu cầu báo giá, báo giá đã nhận, đơn hàng nhập khẩu và tài liệu doanh nghiệp.</p>
            <ul class="mt-6 space-y-3 text-sm text-slate-300">
              @for (item of benefits; track item) {
                <li class="flex gap-2"><span class="text-sky-300">✓</span>{{ item }}</li>
              }
            </ul>
            <p class="mt-10 rounded border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
              Tài khoản khách hàng chỉ thấy dữ liệu thuộc doanh nghiệp của mình. Ghi chú nội bộ và giá nội bộ không hiển thị.
            </p>
          </div>
        </div>

        <div class="p-6 sm:p-8">
          <p class="eyebrow">Đăng nhập</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight">PERITEC Account</h1>
          <p class="mt-1 text-sm text-muted">Dùng email công việc đã đăng ký.</p>

          <div class="mt-5 space-y-4">
            <div>
              <label class="label">Email công việc</label>
              <input class="input" type="email" name="email" [(ngModel)]="email" placeholder="ten@doanhnghiep.vn" />
            </div>
            <div>
              <label class="label">Mật khẩu</label>
              <input class="input" type="password" name="password" [(ngModel)]="password" (keyup.enter)="submit()" placeholder="••••••••" />
            </div>
            @if (error()) { <p class="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{{ error() }}</p> }
            <button class="btn-primary w-full" [disabled]="loading()" (click)="submit()">{{ loading() ? 'Đang đăng nhập...' : 'Đăng nhập' }}</button>
          </div>

          <div class="mt-5 rounded-md border border-line bg-canvas p-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-muted">Tài khoản demo (mật khẩu Peritec&#64;123)</p>
            <div class="mt-2 grid gap-1.5 sm:grid-cols-2">
              @for (acc of demoAccounts; track acc.email) {
                <button class="rounded border border-line bg-white px-2.5 py-1.5 text-left text-[11px] hover:border-brand" (click)="fill(acc.email)">
                  <span class="block font-semibold text-ink">{{ acc.label }}</span>
                  <span class="block truncate text-muted">{{ acc.email }}</span>
                </button>
              }
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between text-xs">
            <span class="text-muted">Chưa có tài khoản doanh nghiệp?</span>
            <a routerLink="/register" class="font-bold text-brand hover:underline">Đăng ký doanh nghiệp →</a>
          </div>
          <p class="mt-4 text-[11px] leading-relaxed text-muted">
            Khách vãng lai vẫn có thể gửi RFQ mà không cần tài khoản. Khi đăng ký cùng email công việc, các yêu cầu trước đó sẽ được liên kết.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  benefits = ['Theo dõi trạng thái RFQ và báo giá', 'Xem tiến độ 5 chặng của đơn nhập khẩu', 'Tải báo giá, xác nhận đơn và tài liệu', 'Quản lý thông tin doanh nghiệp'];
  demoAccounts = [
    { label: 'Customer (An Việt)', email: 'customer@anviet.example' },
    { label: 'Sales', email: 'sales@peritec.vn' },
    { label: 'Engineering', email: 'engineering@peritec.vn' },
    { label: 'Administrator', email: 'admin@peritec.vn' },
  ];

  fill(email: string) {
    this.email = email;
    this.password = 'Peritec@123';
  }

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Vui lòng nhập email và mật khẩu.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) this.router.navigateByUrl(returnUrl);
        else this.router.navigate([res.user.role === 'customer' ? '/portal' : '/workspace']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(ApiService.errorMessage(err));
      },
    });
  }
}
