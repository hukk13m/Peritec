export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'engineering' | 'customer';
  companyId: string | null;
  phone?: string;
  position?: string;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  industry?: string;
  address?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'pending_verification' | 'active' | 'locked';
}

export interface Application {
  id?: string;
  code: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface ProductSpec {
  group: string;
  label: string;
  value: string | null;
  unit: string | null;
  confirmed: boolean;
  note?: string | null;
}

export interface ProductDocument {
  name: string;
  type: string;
  version: string;
  language: string;
  access: 'public' | 'download_request';
  url?: string;
}

export interface Product {
  id: string;
  sku: string;
  model: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  primaryApplicationCode: string;
  applicationIds: string[];
  shortDescription: string;
  description: string;
  image: string;
  specs: ProductSpec[];
  documents: ProductDocument[];
  configurations: string[];
  relatedSkus: string[];
  availability: string;
}

export interface CompareRow {
  group: string;
  label: string;
  unit: string | null;
  different: boolean;
  cells: { display: string; confirmed: boolean; raw: string | null; note?: string }[];
}

export interface CompareResult {
  applicationCode: string;
  products: Product[];
  rows: CompareRow[];
}

export interface RfqItem {
  id?: string;
  sku: string;
  name: string;
  brand?: string;
  quantity: number;
  configRequest?: string | null;
  itemNote?: string | null;
  checkStatus?: 'not_tested' | 'tested' | 'need_clarification';
  checkNote?: string | null;
}

export interface Quote {
  id: string;
  quoteCode: string;
  versionNo: number;
  status: string;
  validUntil: string;
  sentAt?: string;
  totalAmount?: number | null;
  currency?: string;
  quoteFileUrl?: string;
  note?: string | null;
  expired?: boolean;
  items: RfqItem[];
}

export interface LogEntry {
  id?: string;
  logType: string;
  content: string;
  actorName?: string;
  visibleToCustomer?: boolean;
  attachmentUrl?: string | null;
  createdAt: string;
}

export interface OrderStage {
  stageNo: number;
  name: string;
  plannedDate: string | null;
  actualDate: string | null;
  status: 'not_started' | 'current' | 'complete';
  note?: string | null;
}

export interface Order {
  id?: string;
  orderCode: string;
  status: string;
  currentStage: number;
  stageName?: string;
  etaDate: string | null;
  etaNote?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  deliveryAddress?: string;
  addressStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  items: RfqItem[];
  stages: OrderStage[];
  logs?: LogEntry[];
  documents?: any[];
}
