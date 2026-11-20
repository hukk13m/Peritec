import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { PublicLayoutComponent } from './public/public-layout.component';
import { HomeComponent } from './public/home.component';
import { ProductsComponent } from './public/products.component';
import { ProductDetailComponent } from './public/product-detail.component';
import { CompareComponent } from './public/compare.component';
import { RfqComponent } from './public/rfq.component';
import { RfqSuccessComponent } from './public/rfq-success.component';
import { ContactComponent } from './public/contact.component';
import { LoginComponent } from './public/login.component';
import { RegisterComponent } from './public/register.component';
import { PortalLayoutComponent } from './portal/portal-layout.component';
import { PortalOverviewComponent } from './portal/overview.component';
import { PortalRfqsComponent } from './portal/rfqs.component';
import { PortalRfqDetailComponent } from './portal/rfq-detail.component';
import { PortalOrdersComponent } from './portal/orders.component';
import { PortalOrderDetailComponent } from './portal/order-detail.component';
import { PortalDocumentsComponent } from './portal/documents.component';
import { PortalCompanyComponent } from './portal/company.component';
import { WorkspaceLayoutComponent } from './workspace/workspace-layout.component';
import { WorkspaceDashboardComponent } from './workspace/dashboard.component';
import { WorkspaceRfqDetailComponent } from './workspace/rfq-detail.component';
import { WorkspaceOrdersComponent } from './workspace/orders.component';
import { WorkspaceOrderDetailComponent } from './workspace/order-detail.component';
import { WorkspaceCompaniesComponent } from './workspace/companies.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent, title: 'PERITEC · Thiết bị đo lường, kiểm thử, tự động hóa' },
      { path: 'products', component: ProductsComponent, title: 'Danh mục thiết bị · PERITEC' },
      { path: 'products/:slug', component: ProductDetailComponent, title: 'Chi tiết thiết bị · PERITEC' },
      { path: 'compare', component: CompareComponent, title: 'So sánh thiết bị · PERITEC' },
      { path: 'rfq', component: RfqComponent, title: 'Yêu cầu báo giá · PERITEC' },
      { path: 'rfq/success/:code', component: RfqSuccessComponent, title: 'Đã gửi yêu cầu · PERITEC' },
      { path: 'contact', component: ContactComponent, title: 'Liên hệ · PERITEC' },
      { path: 'login', component: LoginComponent, canActivate: [guestGuard], title: 'Đăng nhập · PERITEC' },
      { path: 'register', component: RegisterComponent, canActivate: [guestGuard], title: 'Đăng ký doanh nghiệp · PERITEC' },
    ],
  },
  {
    path: 'portal',
    component: PortalLayoutComponent,
    canActivate: [authGuard, roleGuard(['customer'])],
    children: [
      { path: '', component: PortalOverviewComponent, title: 'Tổng quan · Customer Portal' },
      { path: 'rfqs', component: PortalRfqsComponent, title: 'Yêu cầu báo giá · Customer Portal' },
      { path: 'rfqs/:code', component: PortalRfqDetailComponent, title: 'Chi tiết yêu cầu · Customer Portal' },
      { path: 'orders', component: PortalOrdersComponent, title: 'Đơn hàng · Customer Portal' },
      { path: 'orders/:code', component: PortalOrderDetailComponent, title: 'Theo dõi đơn hàng · Customer Portal' },
      { path: 'documents', component: PortalDocumentsComponent, title: 'Tài liệu · Customer Portal' },
      { path: 'company', component: PortalCompanyComponent, title: 'Doanh nghiệp · Customer Portal' },
    ],
  },
  {
    path: 'workspace',
    component: WorkspaceLayoutComponent,
    canActivate: [authGuard, roleGuard(['admin', 'sales', 'engineering'])],
    children: [
      { path: '', component: WorkspaceDashboardComponent, title: 'Hàng đợi RFQ · Internal Workspace' },
      { path: 'rfqs/:code', component: WorkspaceRfqDetailComponent, title: 'Xử lý RFQ · Internal Workspace' },
      { path: 'orders', component: WorkspaceOrdersComponent, title: 'Đơn hàng · Internal Workspace' },
      { path: 'orders/:code', component: WorkspaceOrderDetailComponent, title: 'Cập nhật đơn hàng · Internal Workspace' },
      {
        path: 'companies',
        component: WorkspaceCompaniesComponent,
        canActivate: [roleGuard(['admin', 'sales'])],
        title: 'Doanh nghiệp · Internal Workspace',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
