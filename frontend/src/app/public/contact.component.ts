import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="bg-navy py-10 text-white">
      <div class="container-page">
        <p class="eyebrow !text-sky-300">Liên hệ</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Trao đổi với kỹ sư PERITEC</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-300">Chọn đúng nhu cầu để yêu cầu được chuyển tới bộ phận phụ trách, tránh chuyển tiếp nhiều lần.</p>
      </div>
    </section>

    <section class="container-page py-8">
      <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div class="card p-5 sm:p-6">
          @if (sent()) {
            <div class="py-10 text-center">
              <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-xl font-bold text-success">✓</span>
              <p class="mt-3 text-base font-bold">Đã gửi yêu cầu tư vấn</p>
              <p class="mt-1 text-sm text-muted">PERITEC sẽ liên hệ theo thông tin bạn cung cấp.</p>
              <button class="btn-secondary mt-4" (click)="sent.set(false)">Gửi yêu cầu khác</button>
            </div>
          } @else {
            <p class="text-sm font-bold">Thông tin liên hệ</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="label">Nhu cầu của bạn *</label>
                <select class="input" name="needType" [(ngModel)]="form.needType">
                  <option value="product_consulting">Tư vấn chọn thiết bị</option>
                  <option value="technical_support">Hỗ trợ kỹ thuật</option>
                  <option value="order_support">Hỗ trợ đơn hàng / giao vận</option>
                  <option value="partnership">Hợp tác / đại lý</option>
                </select>
              </div>
              <div>
                <label class="label">Doanh nghiệp</label>
                <input class="input" name="companyName" [(ngModel)]="form.companyName" />
              </div>
              <div>
                <label class="label">Người liên hệ *</label>
                <input class="input" [class.input-error]="errors['contactName']" name="contactName" [(ngModel)]="form.contactName" />
                @if (errors['contactName']) { <p class="field-error">{{ errors['contactName'] }}</p> }
              </div>
              <div>
                <label class="label">Email *</label>
                <input class="input" type="email" [class.input-error]="errors['email']" name="email" [(ngModel)]="form.email" />
                @if (errors['email']) { <p class="field-error">{{ errors['email'] }}</p> }
              </div>
              <div>
                <label class="label">Điện thoại *</label>
                <input class="input" [class.input-error]="errors['phone']" name="phone" [(ngModel)]="form.phone" />
                @if (errors['phone']) { <p class="field-error">{{ errors['phone'] }}</p> }
              </div>
              <div class="sm:col-span-2">
                <label class="label">Nội dung *</label>
                <textarea class="input" rows="5" [class.input-error]="errors['content']" name="content" [(ngModel)]="form.content"
                          placeholder="Mô tả bài toán đo lường, thiết bị đang dùng, tín hiệu cần kiểm tra..."></textarea>
                @if (errors['content']) { <p class="field-error">{{ errors['content'] }}</p> }
              </div>
            </div>
            <label class="mt-4 flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3">
              <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand" name="consent" [(ngModel)]="form.privacyConsent" />
              <span class="text-xs leading-relaxed text-muted">Tôi đồng ý để PERITEC xử lý thông tin liên hệ theo chính sách bảo mật. *</span>
            </label>
            @if (errors['privacyConsent']) { <p class="field-error">{{ errors['privacyConsent'] }}</p> }
            <div class="mt-5 flex items-center justify-between">
              <a routerLink="/rfq" class="text-xs font-semibold text-brand hover:underline">Cần báo giá? Tạo RFQ →</a>
              <button class="btn-primary" [disabled]="submitting()" (click)="submit()">{{ submitting() ? 'Đang gửi...' : 'Gửi yêu cầu' }}</button>
            </div>
          }
        </div>

        <aside class="space-y-3">
          <div class="card p-4">
            <p class="text-sm font-bold">Liên hệ trực tiếp</p>
            <div class="mt-3 space-y-2 text-sm">
              <p><span class="text-muted">Email:</span> <span class="font-semibold">sales@peritec.vn</span></p>
              <p><span class="text-muted">Điện thoại:</span> <span class="font-semibold">093 252 9288</span></p>
              <p><span class="text-muted">Địa chỉ:</span> TP. Hồ Chí Minh, Việt Nam</p>
            </div>
          </div>
          <div class="card bg-navy p-4 text-white">
            <p class="text-sm font-bold">Quy trình phản hồi</p>
            <ul class="mt-3 space-y-2 text-xs text-slate-300">
              <li>1. Tiếp nhận và phân loại nhu cầu</li>
              <li>2. Kỹ sư liên hệ làm rõ thông số</li>
              <li>3. Đề xuất cấu hình và báo giá chính thức</li>
            </ul>
          </div>
          <div class="card p-4 text-[11px] leading-relaxed text-muted">
            Thông tin liên hệ được thu thập tối thiểu và chỉ dùng cho việc phản hồi yêu cầu, phù hợp Nghị định 13/2023/NĐ-CP.
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class ContactComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  sent = signal(false);
  submitting = signal(false);
  errors: Record<string, string> = {};
  form = {
    needType: 'product_consulting',
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    content: '',
    privacyConsent: false,
  };

  submit() {
    this.errors = {};
    if (!this.form.contactName.trim()) this.errors['contactName'] = 'Vui lòng nhập người liên hệ.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) this.errors['email'] = 'Email không hợp lệ.';
    if ((this.form.phone || '').trim().length < 6) this.errors['phone'] = 'Số điện thoại không hợp lệ.';
    if ((this.form.content || '').trim().length < 10) this.errors['content'] = 'Vui lòng mô tả chi tiết hơn (tối thiểu 10 ký tự).';
    if (!this.form.privacyConsent) this.errors['privacyConsent'] = 'Bạn cần đồng ý chính sách bảo mật.';
    if (Object.keys(this.errors).length) return;
    this.submitting.set(true);
    this.api.post('/contact-requests', this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
        this.toast.success('Yêu cầu tư vấn đã được gửi.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(ApiService.errorMessage(err));
      },
    });
  }
}
