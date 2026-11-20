import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../shared/cart.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-rfq',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="border-b border-line bg-white">
      <div class="container-page py-7">
        <p class="eyebrow">Yêu cầu báo giá</p>
        <div class="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Giỏ RFQ của bạn</h1>
            <p class="mt-1 text-sm text-muted">Một yêu cầu cho nhiều thiết bị. Không thanh toán trực tuyến, không tự động xác nhận giá.</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted">
            <span class="badge bg-brand-soft text-brand-dark">{{ cart.count() }} thiết bị</span>
            <span class="badge bg-canvas text-muted">{{ cart.totalQuantity() }} đơn vị</span>
          </div>
        </div>

        <div class="mt-6 grid max-w-2xl grid-cols-3 gap-2">
          @for (s of steps; track s.no) {
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    [class.bg-brand]="step() >= s.no" [class.text-white]="step() >= s.no"
                    [class.bg-slate-200]="step() < s.no" [class.text-slate-500]="step() < s.no">{{ s.no }}</span>
              <span class="text-xs font-semibold" [class.text-ink]="step() >= s.no" [class.text-muted]="step() < s.no">{{ s.label }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    @if (!cart.count()) {
      <section class="container-page py-14">
        <div class="card mx-auto max-w-xl p-10 text-center">
          <p class="text-base font-bold">Giỏ RFQ đang trống</p>
          <p class="mt-1 text-sm text-muted">Thêm thiết bị từ danh mục hoặc trang chi tiết để bắt đầu yêu cầu báo giá.</p>
          <a routerLink="/products" class="btn-primary mt-4">Tìm thiết bị</a>
        </div>
      </section>
    } @else {
      <section class="container-page py-8">
        <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            @if (step() === 1) {
              <div class="card overflow-hidden">
                <div class="flex items-center justify-between border-b border-line px-5 py-3">
                  <p class="text-sm font-bold">01 · Thiết bị cần báo giá</p>
                  <a routerLink="/products" class="text-xs font-semibold text-brand hover:underline">+ Thêm thiết bị</a>
                </div>
                <div class="divide-y divide-line">
                  @for (item of cart.items(); track item.productId) {
                    <div class="p-4 sm:p-5">
                      <div class="flex gap-4">
                        <img [src]="item.image" [alt]="item.sku" class="hidden h-20 w-28 rounded border border-line object-cover sm:block" />
                        <div class="min-w-0 flex-1">
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <p class="text-[10px] font-bold uppercase tracking-wide text-brand">{{ item.brand }}</p>
                              <p class="text-sm font-bold">{{ item.sku }}</p>
                              <p class="line-clamp-2 text-xs text-muted">{{ item.name }}</p>
                            </div>
                            <button class="text-xs text-muted hover:text-danger" (click)="cart.remove(item.productId)">Xóa</button>
                          </div>
                          <div class="mt-3 grid gap-2 sm:grid-cols-[100px_1fr]">
                            <div>
                              <label class="label !mb-1 !text-[10px]">Số lượng</label>
                              <input type="number" min="1" class="input !py-1.5 text-center" [ngModel]="item.quantity"
                                     (ngModelChange)="updateQty(item.productId, $event)" [ngModelOptions]="{standalone:true}" />
                            </div>
                            <div>
                              <label class="label !mb-1 !text-[10px]">Cấu hình yêu cầu</label>
                              <input class="input !py-1.5" [ngModel]="item.configRequest" (ngModelChange)="update(item.productId, 'configRequest', $event)"
                                     [ngModelOptions]="{standalone:true}" placeholder="Cấu hình, phụ kiện, tiêu chuẩn..." />
                            </div>
                          </div>
                          <div class="mt-2">
                            <input class="input !py-1.5" [ngModel]="item.itemNote" (ngModelChange)="update(item.productId, 'itemNote', $event)"
                                   [ngModelOptions]="{standalone:true}" placeholder="Ghi chú cho thiết bị (không bắt buộc)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
              @if (errors['items']) { <p class="field-error">{{ errors['items'] }}</p> }
              <div class="mt-4 flex justify-end">
                <button class="btn-primary" (click)="nextFromItems()">Tiếp tục: Thông tin doanh nghiệp →</button>
              </div>
            }

            @if (step() === 2) {
              <div class="card p-5 sm:p-6">
                <p class="text-sm font-bold">02 · Doanh nghiệp & người liên hệ</p>
                <p class="mt-1 text-xs text-muted">Thông tin này dùng để PERITEC phản hồi báo giá và xác minh doanh nghiệp.</p>
                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label class="label">Tên doanh nghiệp *</label>
                    <input class="input" [class.input-error]="errors['companyName']" name="companyName" [(ngModel)]="form.companyName" />
                    @if (errors['companyName']) { <p class="field-error">{{ errors['companyName'] }}</p> }
                  </div>
                  <div>
                    <label class="label">Người liên hệ *</label>
                    <input class="input" [class.input-error]="errors['contactName']" name="contactName" [(ngModel)]="form.contactName" />
                    @if (errors['contactName']) { <p class="field-error">{{ errors['contactName'] }}</p> }
                  </div>
                  <div>
                    <label class="label">Chức vụ / Bộ phận</label>
                    <input class="input" name="contactPosition" [(ngModel)]="form.contactPosition" placeholder="Ví dụ: Kỹ sư kiểm thử" />
                  </div>
                  <div>
                    <label class="label">Email công việc *</label>
                    <input class="input" type="email" [class.input-error]="errors['contactEmail']" name="contactEmail" [(ngModel)]="form.contactEmail" />
                    @if (errors['contactEmail']) { <p class="field-error">{{ errors['contactEmail'] }}</p> }
                  </div>
                  <div>
                    <label class="label">Số điện thoại *</label>
                    <input class="input" [class.input-error]="errors['contactPhone']" name="contactPhone" [(ngModel)]="form.contactPhone" />
                    @if (errors['contactPhone']) { <p class="field-error">{{ errors['contactPhone'] }}</p> }
                  </div>
                </div>
                <div class="mt-4 rounded-md bg-canvas p-3 text-[11px] leading-relaxed text-muted">
                  Nếu bạn đăng nhập bằng email doanh nghiệp, các yêu cầu trước đó sẽ được liên kết vào tài khoản của bạn.
                </div>
                <div class="mt-5 flex justify-between">
                  <button class="btn-secondary" (click)="step.set(1)">← Quay lại</button>
                  <button class="btn-primary" (click)="nextFromContact()">Tiếp tục: Yêu cầu kỹ thuật →</button>
                </div>
              </div>
            }

            @if (step() === 3) {
              <div class="space-y-4">
                <div class="card p-5 sm:p-6">
                  <p class="text-sm font-bold">03 · Yêu cầu kỹ thuật & xác nhận</p>
                  <div class="mt-4">
                    <label class="label">Mô tả bài toán / ứng dụng / tín hiệu / môi trường sử dụng</label>
                    <textarea class="input" rows="5" name="technicalNote" [(ngModel)]="form.technicalNote"
                              placeholder="Ví dụ: Phân tích tín hiệu RF 2.4 GHz trong phòng lab, cần kết nối USB với máy tính, môi trường nhiệt độ 25–30°C..."></textarea>
                  </div>

                  <div class="mt-4 rounded-md border border-line bg-canvas p-3 text-xs text-muted">
                    <p class="font-semibold text-ink">Thông tin sẽ gửi</p>
                    <p class="mt-1">{{ cart.count() }} dòng thiết bị · {{ cart.totalQuantity() }} đơn vị · {{ form.companyName }} · {{ form.contactEmail }}</p>
                  </div>

                  <label class="mt-4 flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3">
                    <input type="checkbox" class="mt-0.5 h-4 w-4 accent-brand" name="consent" [(ngModel)]="form.privacyConsent" />
                    <span class="text-xs leading-relaxed text-muted">
                      Tôi đồng ý để PERITEC liên hệ và xử lý thông tin theo chính sách bảo mật. Tôi hiểu giá, cấu hình và thời gian giao chỉ được xác nhận trong báo giá chính thức. *
                    </span>
                  </label>
                  @if (errors['privacyConsent']) { <p class="field-error">{{ errors['privacyConsent'] }}</p> }
                </div>

                <div class="flex justify-between">
                  <button class="btn-secondary" (click)="step.set(2)">← Quay lại</button>
                  <button class="btn-primary" [disabled]="submitting()" (click)="submit()">
                    {{ submitting() ? 'Đang gửi...' : 'Gửi toàn bộ yêu cầu' }}
                  </button>
                </div>
                @if (errors['form']) { <p class="field-error text-right">{{ errors['form'] }}</p> }
              </div>
            }
          </div>

          <aside class="space-y-3">
            <div class="card p-4">
              <p class="text-sm font-bold">Tóm tắt yêu cầu</p>
              <div class="mt-3 space-y-2">
                @for (item of cart.items(); track item.productId) {
                  <div class="flex items-start justify-between gap-2 text-xs">
                    <span><span class="font-semibold">{{ item.sku }}</span> <span class="text-muted">× {{ item.quantity }}</span></span>
                    <span class="text-muted">{{ item.brand }}</span>
                  </div>
                }
              </div>
              <div class="mt-3 border-t border-line pt-3 text-xs">
                <div class="flex justify-between"><span class="text-muted">Số dòng thiết bị</span><span class="font-semibold">{{ cart.count() }}</span></div>
                <div class="mt-1 flex justify-between"><span class="text-muted">Tổng số lượng</span><span class="font-semibold">{{ cart.totalQuantity() }}</span></div>
              </div>
              <p class="mt-3 text-[11px] leading-relaxed text-muted">Đây là yêu cầu báo giá, không phải đơn hàng. PERITEC sẽ kiểm tra cấu hình trước khi phản hồi.</p>
            </div>
            <div class="card bg-brand-soft p-4">
              <p class="text-xs font-bold text-brand-dark">Cần hỗ trợ cấu hình?</p>
              <p class="mt-1 text-[11px] leading-relaxed text-brand-dark/80">Kỹ sư PERITEC có thể tư vấn trước khi bạn gửi yêu cầu.</p>
              <a routerLink="/contact" class="mt-2 inline-block text-[11px] font-bold text-brand-dark hover:underline">Liên hệ kỹ sư →</a>
            </div>
          </aside>
        </div>
      </section>
    }
  `,
})
export class RfqComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  step = signal(1);
  submitting = signal(false);
  errors: Record<string, string> = {};
  steps = [
    { no: 1, label: 'Thiết bị' },
    { no: 2, label: 'Doanh nghiệp' },
    { no: 3, label: 'Xác nhận' },
  ];
  form = {
    companyName: '',
    contactName: '',
    contactPosition: '',
    contactEmail: '',
    contactPhone: '',
    technicalNote: '',
    privacyConsent: false,
  };

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.api.get<any>('/auth/me').subscribe((res) => {
        this.form.contactName = res.user?.name || '';
        this.form.contactEmail = res.user?.email || '';
        this.form.contactPhone = res.user?.phone || '';
        this.form.contactPosition = res.user?.position || '';
        this.form.companyName = res.company?.name || '';
      });
    }
    if (!this.cart.count()) this.toast.info('Giỏ RFQ đang trống. Hãy chọn thiết bị trước.');
  }

  updateQty(id: string, value: any) {
    this.cart.update(id, { quantity: Math.max(1, Number(value) || 1) });
  }

  update(id: string, key: 'configRequest' | 'itemNote', value: string) {
    this.cart.update(id, { [key]: value } as any);
  }

  nextFromItems() {
    this.errors = {};
    if (!this.cart.count()) {
      this.errors['items'] = 'Cần ít nhất 1 thiết bị trong yêu cầu báo giá.';
      return;
    }
    if (this.cart.items().some((i) => i.quantity < 1)) {
      this.errors['items'] = 'Số lượng mỗi thiết bị phải từ 1 trở lên.';
      return;
    }
    this.step.set(2);
  }

  nextFromContact() {
    this.errors = {};
    if (!this.form.companyName.trim()) this.errors['companyName'] = 'Vui lòng nhập tên doanh nghiệp.';
    if (!this.form.contactName.trim()) this.errors['contactName'] = 'Vui lòng nhập người liên hệ.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.contactEmail)) this.errors['contactEmail'] = 'Email công việc không hợp lệ.';
    if ((this.form.contactPhone || '').trim().length < 6) this.errors['contactPhone'] = 'Số điện thoại không hợp lệ.';
    if (Object.keys(this.errors).length) return;
    this.step.set(3);
  }

  submit() {
    this.errors = {};
    if (!this.form.privacyConsent) {
      this.errors['privacyConsent'] = 'Bạn cần đồng ý chính sách bảo mật trước khi gửi.';
      return;
    }
    this.submitting.set(true);
    this.api
      .post<any>('/rfqs', {
        ...this.form,
        items: this.cart.items().map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          configRequest: i.configRequest,
          itemNote: i.itemNote,
        })),
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.cart.clear();
          this.router.navigate(['/rfq/success', res.rfqCode]);
        },
        error: (err) => {
          this.submitting.set(false);
          const details = err?.error?.error?.details;
          if (details && typeof details === 'object') {
            this.errors = details;
            const keys = Object.keys(details);
            if (keys.some((k) => k.startsWith('contact') || k.startsWith('company'))) this.step.set(2);
            else if (keys.some((k) => k.startsWith('items'))) this.step.set(1);
          }
          this.errors['form'] = ApiService.errorMessage(err);
          this.toast.error(ApiService.errorMessage(err));
        },
      });
  }
}
