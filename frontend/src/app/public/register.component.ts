import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="container-page py-10">
      <div class="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-card lg:grid-cols-[0.85fr_1.15fr]">
        <div class="hidden bg-navy p-8 text-white lg:block">
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded bg-white/10"><span class="h-3.5 w-3.5 rounded-sm border-2 border-white"></span></span>
            <div><p class="text-base font-extrabold">PERITEC</p><p class="text-[9px] uppercase tracking-[0.18em] text-slate-400">Business Account</p></div>
          </div>
          <h2 class="mt-10 text-2xl font-extrabold leading-tight">Đăng ký tài khoản doanh nghiệp</h2>
          <p class="mt-3 text-sm leading-relaxed text-slate-300">Tài khoản được xác minh bởi nhân viên Sales trước khi kích hoạt đầy đủ quyền truy cập giao dịch.</p>
          <div class="mt-6 space-y-3">
            @for (step of steps; track step.title) {
              <div class="rounded border border-white/10 bg-white/5 p-3">
                <p class="text-xs font-bold text-white">{{ step.title }}</p>
                <p class="mt-1 text-[11px] leading-relaxed text-slate-400">{{ step.text }}</p>
              </div>
            }
          </div>
          <p class="mt-8 text-[11px] leading-relaxed text-slate-500">Mỗi email chỉ đăng ký một tài khoản. Thông tin doanh nghiệp được dùng để xác minh quyền xem báo giá và đơn hàng.</p>
        </div>

        <div class="p-6 sm:p-8">
          <p class="eyebrow">Đăng ký</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Tạo tài khoản doanh nghiệp</h1>
          <p class="mt-1 text-sm text-muted">Sau khi gửi, hồ sơ ở trạng thái “Chờ xác minh”.</p>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="label">Tên doanh nghiệp *</label>
              <input class="input" [class.input-error]="errors['companyName']" name="companyName" [(ngModel)]="form.companyName" />
              @if (errors['companyName']) { <p class="field-error">{{ errors['companyName'] }}</p> }
            </div>
            <div>
              <label class="label">Mã số thuế</label>
              <input class="input" name="taxCode" [(ngModel)]="form.taxCode" />
            </div>
            <div>
              <label class="label">Người liên hệ *</label>
              <input class="input" [class.input-error]="errors['name']" name="name" [(ngModel)]="form.name" />
              @if (errors['name']) { <p class="field-error">{{ errors['name'] }}</p> }
            </div>
            <div>
              <label class="label">Email công việc *</label>
              <input class="input" type="email" [class.input-error]="errors['email']" name="email" [(ngModel)]="form.email" />
              @if (errors['email']) { <p class="field-error">{{ errors['email'] }}</p> }
            </div>
            <div>
              <label class="label">Điện thoại *</label>
              <input class="input" [class.input-error]="errors['phone']" name="phone" [(ngModel)]="form.phone" />
              @if (errors['phone']) { <p class="field-error">{{ errors['phone'] }}</p> }
            </div>
            <div>
              <label class="label">Chức vụ / Bộ phận</label>
              <input class="input" name="position" [(ngModel)]="form.position" />
            </div>
            <div>
              <label class="label">Mật khẩu *</label>
              <input class="input" type="password" [class.input-error]="errors['password']" name="password" [(ngModel)]="form.password" />
              @if (errors['password']) { <p class="field-error">{{ errors['password'] }}</p> }
            </div>
          </div>

          @if (error()) { <p class="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger">{{ error() }}</p> }
          <button class="btn-primary mt-5 w-full" [disabled]="loading()" (click)="submit()">{{ loading() ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản' }}</button>
          <div class="mt-4 flex items-center justify-between text-xs">
            <span class="text-muted">Đã có tài khoản?</span>
            <a routerLink="/login" class="font-bold text-brand hover:underline">Đăng nhập →</a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');
  errors: Record<string, string> = {};
  steps = [
    { title: '1. Thông tin doanh nghiệp', text: 'Tên, mã số thuế và người liên hệ chính.' },
    { title: '2. Xác minh bởi Sales', text: 'Hồ sơ chờ xác minh trước khi kích hoạt giao dịch.' },
    { title: '3. Liên kết dữ liệu', text: 'Các RFQ gửi trước đó bằng cùng email sẽ được gắn vào tài khoản.' },
  ];
  form = { companyName: '', taxCode: '', name: '', email: '', phone: '', position: '', password: '' };

  submit() {
    this.errors = {};
    if (!this.form.companyName.trim()) this.errors['companyName'] = 'Vui lòng nhập tên doanh nghiệp.';
    if (!this.form.name.trim()) this.errors['name'] = 'Vui lòng nhập người liên hệ.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) this.errors['email'] = 'Email không hợp lệ.';
    if ((this.form.phone || '').trim().length < 6) this.errors['phone'] = 'Số điện thoại không hợp lệ.';
    if ((this.form.password || '').length < 6) this.errors['password'] = 'Mật khẩu tối thiểu 6 ký tự.';
    if (Object.keys(this.errors).length) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.form).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/portal']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(ApiService.errorMessage(err));
      },
    });
  }
}
