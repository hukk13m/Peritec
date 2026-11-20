import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { rfqStatus } from '../shared/ui';

@Component({
  selector: 'app-rfq-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="container-page py-14">
      <div class="mx-auto max-w-2xl">
        <div class="card overflow-hidden">
          <div class="bg-success-soft px-6 py-8 text-center">
            <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-2xl font-bold text-white">✓</span>
            <h1 class="mt-4 text-xl font-extrabold text-ink sm:text-2xl">Yêu cầu báo giá đã được ghi nhận</h1>
            <p class="mt-1 text-sm text-muted">PERITEC sẽ kiểm tra cấu hình và phản hồi báo giá chính thức qua email.</p>
          </div>
          <div class="p-6">
            @if (data(); as d) {
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-md border border-line p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Mã yêu cầu</p>
                  <p class="mt-1 text-lg font-extrabold tracking-tight text-brand">{{ d.rfqCode }}</p>
                </div>
                <div class="rounded-md border border-line p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Trạng thái</p>
                  <p class="mt-1 text-sm font-bold">{{ statusLabel }}</p>
                </div>
                <div class="rounded-md border border-line p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Thiết bị</p>
                  <p class="mt-1 text-sm font-bold">{{ d.itemCount }} dòng · {{ d.totalQuantity }} đơn vị</p>
                </div>
                <div class="rounded-md border border-line p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Email nhận phản hồi</p>
                  <p class="mt-1 text-sm font-bold">{{ d.contactEmail }}</p>
                </div>
              </div>
            } @else {
              <div class="h-32 skeleton"></div>
            }

            <div class="mt-5 rounded-md bg-canvas p-4 text-xs leading-relaxed text-muted">
              <p class="font-bold text-ink">Bước tiếp theo</p>
              <ol class="mt-2 list-decimal space-y-1 pl-4">
                <li>Sales tiếp nhận và phân công người phụ trách trong vòng 1 ngày làm việc.</li>
                <li>Kỹ thuật kiểm tra cấu hình từng thiết bị (nếu cần).</li>
                <li>Báo giá chính thức được gửi qua email và hiển thị trong Customer Portal.</li>
              </ol>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              @if (auth.hasRole('customer')) {
                <a routerLink="/portal/rfqs" class="btn-primary">Xem trong Customer Portal →</a>
              } @else {
                <a routerLink="/login" class="btn-primary">Đăng nhập để theo dõi</a>
              }
              <a routerLink="/products" class="btn-secondary">Tiếp tục xem thiết bị</a>
            </div>
            <p class="mt-3 text-[11px] text-muted">Đây là xác nhận tiếp nhận, không phải xác nhận giá hay thời gian giao hàng.</p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class RfqSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  auth = inject(AuthService);
  data = signal<any>(null);

  get statusLabel() {
    return rfqStatus(this.data()?.status || '');
  }

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.get<any>(`/rfqs/${code}/summary`).subscribe({
      next: (r) => this.data.set(r),
      error: () => this.data.set({ rfqCode: code }),
    });
  }
}
