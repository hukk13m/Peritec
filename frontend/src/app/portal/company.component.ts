import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Company } from '../core/models';
import { companyStatus } from '../shared/ui';

@Component({
  selector: 'app-portal-company',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (company(); as c) {
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Hồ sơ doanh nghiệp</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight">{{ c.name }}</h1>
          <p class="mt-1 text-sm text-muted">Thông tin doanh nghiệp dùng để xác minh quyền xem báo giá và đơn hàng.</p>
        </div>
        <span class="badge" [class]="c.status === 'active' ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn'">{{ companyLabel(c.status) }}</span>
      </div>

      @if (c.status === 'pending_verification') {
        <div class="mt-4 rounded-md border border-warn/30 bg-warn-soft p-3 text-xs leading-relaxed text-warn">
          Hồ sơ đang chờ nhân viên Sales xác minh. Bạn vẫn có thể theo dõi yêu cầu báo giá, nhưng một số quyền giao dịch có thể bị giới hạn cho đến khi hồ sơ được duyệt.
        </div>
      }

      <div class="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="card p-5 sm:p-6">
          <p class="text-sm font-bold">Thông tin pháp lý</p>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            @for (row of rows(c); track row.label) {
              <div>
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-muted">{{ row.label }}</dt>
                <dd class="mt-1 text-sm text-ink">{{ row.value || '—' }}</dd>
              </div>
            }
          </dl>
          <div class="mt-5 rounded-md bg-canvas p-3 text-[11px] leading-relaxed text-muted">
            Để thay đổi thông tin pháp lý, vui lòng gửi yêu cầu tới PERITEC. Thay đổi được xác minh trước khi áp dụng.
          </div>
        </div>

        <div class="space-y-4">
          <div class="card p-5">
            <p class="text-sm font-bold">Người liên hệ chính</p>
            <div class="mt-3 space-y-1.5 text-xs">
              <p class="text-sm font-semibold text-ink">{{ c.contactName }}</p>
              <p class="text-muted">{{ c.contactEmail }}</p>
              <p class="text-muted">{{ c.contactPhone }}</p>
            </div>
          </div>
          <div class="card bg-navy p-5 text-white">
            <p class="text-sm font-bold">Cần cập nhật hồ sơ?</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-300">Gửi yêu cầu tới bộ phận phụ trách để cập nhật mã số thuế, địa chỉ hoặc người liên hệ.</p>
            <a routerLink="/contact" class="mt-3 inline-block text-xs font-bold text-sky-300 hover:text-white">Liên hệ PERITEC →</a>
          </div>
        </div>
      </div>
    } @else {
      <div class="h-72 skeleton"></div>
    }
  `,
})
export class PortalCompanyComponent implements OnInit {
  private api = inject(ApiService);
  company = signal<Company | null>(null);
  companyLabel = companyStatus;

  ngOnInit() {
    this.api.get<{ company: Company }>('/portal/company').subscribe((r) => this.company.set(r.company));
  }

  rows(c: Company) {
    return [
      { label: 'Mã doanh nghiệp', value: c.code },
      { label: 'Mã số thuế', value: c.taxCode },
      { label: 'Ngành', value: c.industry },
      { label: 'Website', value: c.website },
      { label: 'Địa chỉ', value: c.address },
      { label: 'Trạng thái', value: this.companyLabel(c.status) },
    ];
  }
}
