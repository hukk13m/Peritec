import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../shared/toast.service';
import { companyStatus, fmtDate } from '../shared/ui';

@Component({
  selector: 'app-workspace-companies',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div>
      <p class="eyebrow">Danh mục khách hàng</p>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight">Doanh nghiệp</h1>
      <p class="mt-1 text-sm text-muted">Xác minh hồ sơ doanh nghiệp trước khi mở đầy đủ quyền giao dịch B2B.</p>
    </div>

    <div class="card mt-5 overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        @for (tab of tabs; track tab.key) {
          <button class="rounded-full px-3 py-1.5 text-xs font-semibold"
                  [class.bg-brand]="filter() === tab.key" [class.text-white]="filter() === tab.key"
                  [class.bg-canvas]="filter() !== tab.key" [class.text-muted]="filter() !== tab.key"
                  (click)="filter.set(tab.key)">{{ tab.label }}</button>
        }
        <input class="input !py-1.5 ml-auto min-w-[200px] text-xs" name="q" [(ngModel)]="q" placeholder="Tìm tên, mã số thuế..." />
      </div>

      @if (loading()) {
        <div class="p-4"><div class="h-40 skeleton"></div></div>
      } @else {
        <div class="overflow-x-auto">
          <table class="table-base min-w-[760px]">
            <thead><tr><th>Doanh nghiệp</th><th>Mã số thuế</th><th>Ngành</th><th>Liên hệ</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
            <tbody>
              @for (c of filtered(); track c.id) {
                <tr>
                  <td><p class="text-xs font-bold">{{ c.name }}</p><p class="text-[11px] text-muted">{{ c.code }}</p></td>
                  <td class="text-xs">{{ c.taxCode || '—' }}</td>
                  <td class="text-xs text-muted">{{ c.industry || '—' }}</td>
                  <td><p class="text-xs">{{ c.contactName }}</p><p class="text-[11px] text-muted">{{ c.contactEmail }}</p></td>
                  <td><span class="badge" [class]="badge(c.status)">{{ label(c.status) }}</span></td>
                  <td class="text-xs text-muted">{{ fmtDate(c.createdAt) }}</td>
                  <td class="text-right">
                    @if (canVerify()) {
                      @if (c.status === 'pending_verification') {
                        <button class="btn-primary btn-sm" (click)="verify(c, 'active')">Xác minh</button>
                      } @else if (c.status === 'active') {
                        <button class="btn-secondary btn-sm" (click)="verify(c, 'locked')">Khóa</button>
                      } @else {
                        <button class="btn-secondary btn-sm" (click)="verify(c, 'active')">Mở khóa</button>
                      }
                    } @else {
                      <span class="text-[11px] text-muted">Chỉ xem</span>
                    }
                  </td>
                </tr>
              }
              @if (!filtered().length) {
                <tr><td colspan="7" class="py-10 text-center text-sm text-muted">Không có doanh nghiệp phù hợp.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <div class="card mt-4 p-4 text-[11px] leading-relaxed text-muted">
      Hồ sơ chờ xác minh vẫn có thể gửi RFQ nhưng chưa được xem toàn bộ tài liệu giao dịch. Mỗi email doanh nghiệp chỉ liên kết một tài khoản.
    </div>
  `,
})
export class WorkspaceCompaniesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  items = signal<any[]>([]);
  loading = signal(true);
  filter = signal('all');
  q = '';
  fmtDate = fmtDate;
  label = companyStatus;
  tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending_verification', label: 'Chờ xác minh' },
    { key: 'active', label: 'Đang hoạt động' },
    { key: 'locked', label: 'Đã khóa' },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<{ items: any[] }>('/workspace/companies').subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canVerify() {
    return ['admin', 'sales'].includes(this.auth.user()?.role || '');
  }

  filtered() {
    return this.items().filter((c) => {
      if (this.filter() !== 'all' && c.status !== this.filter()) return false;
      if (!this.q.trim()) return true;
      const n = this.q.toLowerCase();
      return (c.name + ' ' + c.code + ' ' + (c.taxCode || '') + ' ' + (c.contactEmail || '')).toLowerCase().includes(n);
    });
  }

  badge(status: string) {
    if (status === 'active') return 'bg-success-soft text-success';
    if (status === 'locked') return 'bg-danger-soft text-danger';
    return 'bg-warn-soft text-warn';
  }

  verify(company: any, status: 'active' | 'locked') {
    const verb = status === 'active' ? (company.status === 'locked' ? 'mở khóa' : 'xác minh') : 'khóa';
    if (!window.confirm(`Bạn chắc chắn muốn ${verb} "${company.name}"?`)) return;
    this.api.patch<any>(`/workspace/companies/${company.id}/verify`, { status }).subscribe({
      next: () => {
        this.toast.success(`Đã cập nhật trạng thái ${company.name}.`);
        this.load();
      },
      error: (err) => this.toast.error(ApiService.errorMessage(err)),
    });
  }
}
