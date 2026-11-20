import bcrypt from 'bcryptjs';
import {
  Application,
  Company,
  ContactRequest,
  Counter,
  Order,
  ProcessingLog,
  Product,
  Quotation,
  RFQ,
  TransactionDoc,
  User,
} from '../models/index.js';
import { connectDb, disconnectDb } from '../db.js';

const PASSWORD = 'Peritec@123';
const d = (s: string) => new Date(s);

const APPLICATIONS = [
  {
    code: 'DA',
    name: 'Thu thập dữ liệu',
    slug: 'data-acquisition',
    description: 'DAQ, CompactDAQ, PXI và phần mềm LabVIEW cho đo lường và điều khiển.',
    icon: 'daq',
    sortOrder: 1,
  },
  {
    code: 'RF',
    name: 'RF & Vô tuyến',
    slug: 'rf-radio',
    description: 'Máy phân tích phổ, SDR, mô phỏng GNSS và kiểm thử vô tuyến.',
    icon: 'rf',
    sortOrder: 2,
  },
  {
    code: 'ET',
    name: 'Kiểm thử điện tử',
    slug: 'electronics-test',
    description: 'Dao động ký, thiết bị đo, chuyển mạch và kiểm thử bo mạch.',
    icon: 'test',
    sortOrder: 3,
  },
  {
    code: 'AUTO',
    name: 'Tự động hóa',
    slug: 'automation',
    description: 'PLC, industrial PC, nguồn lập trình và hệ thống tích hợp.',
    icon: 'auto',
    sortOrder: 4,
  },
];

const rfSpecs = (freq: string, bw: string, bwConfirmed = true, conn = 'USB 3.0') => [
  { group: 'Tần số', label: 'Dải tần', value: freq, unit: null, confirmed: true },
  { group: 'Tần số', label: 'Băng thông thời gian thực', value: bw, unit: 'MHz', confirmed: bwConfirmed },
  { group: 'Kết nối', label: 'Giao tiếp', value: conn, unit: null, confirmed: true },
  { group: 'Hiệu năng', label: 'Độ phân giải ADC', value: '14', unit: 'bit', confirmed: true },
  { group: 'Hiệu năng', label: 'Dải động', value: '100', unit: 'dB', confirmed: true },
];

const PRODUCTS = [
  {
    sku: 'SAN-45',
    model: 'SAN-45',
    name: 'HAROGIC SAN-45 Spectrum Analyzer',
    slug: 'harogic-san-45',
    brand: 'HAROGIC',
    category: 'Máy phân tích phổ',
    primaryApplicationCode: 'RF',
    shortDescription: 'Máy phân tích phổ RF 4.5 GHz, băng thông thời gian thực 40 MHz, kết nối USB 3.0.',
    description:
      'SAN-45 là máy phân tích phổ dạng module USB dành cho kiểm thử RF tại phòng lab và trên dây chuyền. Thiết bị phù hợp với đo kiểm tín hiệu vô tuyến, phân tích nhiễu và kiểm tra module RF.',
    image: '/assets/products/rf.svg',
    specs: rfSpecs('9 kHz – 4.5 GHz', '40'),
    configurations: ['Bản USB 3.0 tiêu chuẩn', 'Kèm phần mềm phân tích phổ', 'Bộ cáp RF 1 m'],
    relatedSkus: ['SAN-60', 'SAN-90'],
    sortOrder: 1,
  },
  {
    sku: 'SAN-60',
    model: 'SAN-60',
    name: 'HAROGIC SAN-60 Spectrum Analyzer',
    slug: 'harogic-san-60',
    brand: 'HAROGIC',
    category: 'Máy phân tích phổ',
    primaryApplicationCode: 'RF',
    shortDescription: 'Máy phân tích phổ RF 6 GHz, băng thông thời gian thực 60 MHz.',
    description:
      'SAN-60 mở rộng dải tần lên 6 GHz cho các ứng dụng Wi-Fi, IoT và kiểm thử module truyền thông. Thông số băng thông thời gian thực cần đối chiếu datasheet theo từng cấu hình.',
    image: '/assets/products/rf.svg',
    specs: rfSpecs('9 kHz – 6.0 GHz', '60', false),
    configurations: ['Bản USB 3.0 tiêu chuẩn', 'Tùy chọn phần mềm phân tích'],
    relatedSkus: ['SAN-45', 'SAN-90'],
    sortOrder: 2,
  },
  {
    sku: 'SAN-90',
    model: 'SAN-90',
    name: 'HAROGIC SAN-90 Spectrum Analyzer',
    slug: 'harogic-san-90',
    brand: 'HAROGIC',
    category: 'Máy phân tích phổ',
    primaryApplicationCode: 'RF',
    shortDescription: 'Máy phân tích phổ RF 9.5 GHz, băng thông 100 MHz, USB 3.0 và 10GbE.',
    description:
      'SAN-90 là model cao nhất trong dòng SAN, đáp ứng kiểm thử băng rộng, phân tích tín hiệu radar và đo kiểm trong môi trường nhiễu cao.',
    image: '/assets/products/rf.svg',
    specs: rfSpecs('9 kHz – 9.5 GHz', '100', true, 'USB 3.0 / 10GbE'),
    configurations: ['Bản USB 3.0 + 10GbE', 'Kèm phần mềm phân tích phổ', 'Bộ cáp RF 1 m'],
    relatedSkus: ['SAN-45', 'SAN-60'],
    sortOrder: 3,
  },
  {
    sku: 'NI-MIODAQ-8',
    model: 'mioDAQ',
    name: 'NI mioDAQ 8-channel DAQ',
    slug: 'ni-miodaq-8',
    brand: 'NI / Emerson',
    category: 'Thiết bị thu thập dữ liệu',
    primaryApplicationCode: 'DA',
    shortDescription: 'Thiết bị DAQ USB 8 kênh AI 16-bit, 1 MS/s, 16 DIO và 2 AO.',
    description:
      'mioDAQ là thiết bị thu thập dữ liệu USB gọn nhẹ thuộc hệ sinh thái NI, phù hợp cho phòng thí nghiệm, kiểm tra tín hiệu cảm biến và giảng dạy.',
    image: '/assets/products/daq.svg',
    specs: [
      { group: 'Kênh đo', label: 'Số kênh AI', value: '8', unit: 'kênh', confirmed: true },
      { group: 'Kênh đo', label: 'Độ phân giải', value: '16', unit: 'bit', confirmed: true },
      { group: 'Hiệu năng', label: 'Tốc độ lấy mẫu', value: '1', unit: 'MS/s', confirmed: true },
      { group: 'Kết nối', label: 'Giao tiếp', value: 'USB 3.0', unit: null, confirmed: true },
      { group: 'Cấu hình', label: 'Phần mềm', value: 'LabVIEW / DAQExpress', unit: null, confirmed: true },
    ],
    configurations: ['Bản 8 kênh', 'Kèm cáp tín hiệu', 'Bộ nguồn'],
    relatedSkus: ['AD3'],
    sortOrder: 4,
  },
  {
    sku: 'USRP-X420',
    model: 'USRP X420',
    name: 'Ettus USRP X420 Software Defined Radio',
    slug: 'ettus-usrp-x420',
    brand: 'Ettus Research',
    category: 'Software Defined Radio',
    primaryApplicationCode: 'RF',
    shortDescription: 'SDR 2 kênh TX/RX, dải tần 10 MHz – 7.2 GHz, băng thông 400 MHz, 100GbE.',
    description:
      'USRP X420 là nền tảng SDR hiệu năng cao cho nghiên cứu vô tuyến, mô phỏng tín hiệu và kiểm thử 5G. Cấu hình FPGA và phần mềm cần được tư vấn theo ứng dụng.',
    image: '/assets/products/sdr.svg',
    specs: [
      { group: 'Tần số', label: 'Dải tần', value: '10 MHz – 7.2 GHz', unit: null, confirmed: true },
      { group: 'Tần số', label: 'Băng thông thời gian thực', value: '400', unit: 'MHz', confirmed: true },
      { group: 'Kênh đo', label: 'Số kênh TX/RX', value: '2/2', unit: null, confirmed: true },
      { group: 'Kết nối', label: 'Giao tiếp', value: '100GbE / PCIe', unit: null, confirmed: true },
      { group: 'Cấu hình', label: 'FPGA', value: 'Cần xác nhận theo cấu hình đặt hàng', unit: null, confirmed: false },
    ],
    configurations: ['Bản 2 kênh', 'Kèm FPGA image theo yêu cầu', 'Cần tư vấn cấu hình'],
    relatedSkus: ['SAN-90'],
    sortOrder: 5,
  },
  {
    sku: 'AD3',
    model: 'Analog Discovery 3',
    name: 'Digilent Analog Discovery 3',
    slug: 'digilent-analog-discovery-3',
    brand: 'Digilent',
    category: 'Thiết bị kiểm thử đa năng',
    primaryApplicationCode: 'ET',
    shortDescription: 'Thiết bị đo đa năng USB: dao động ký, máy phát hàm, logic analyzer 125 MS/s.',
    description:
      'Analog Discovery 3 kết hợp nhiều công cụ đo trong một thiết bị USB nhỏ gọn, phù hợp cho giảng dạy và kiểm tra mạch điện tử.',
    image: '/assets/products/test.svg',
    specs: [
      { group: 'Kênh đo', label: 'Số kênh AI', value: '2', unit: 'kênh', confirmed: true },
      { group: 'Hiệu năng', label: 'Tốc độ lấy mẫu', value: '125', unit: 'MS/s', confirmed: true },
      { group: 'Kênh đo', label: 'Số kênh logic', value: '16', unit: 'kênh', confirmed: true },
      { group: 'Kết nối', label: 'Giao tiếp', value: 'USB 2.0', unit: null, confirmed: true },
    ],
    configurations: ['Bản tiêu chuẩn', 'Kèm bộ dây đo'],
    relatedSkus: ['NI-MIODAQ-8'],
    sortOrder: 6,
  },
  {
    sku: 'PXIe-1092',
    model: 'PXIe-1092',
    name: 'Pickering PXIe Chassis 18-slot',
    slug: 'pickering-pxie-1092',
    brand: 'Pickering Interfaces',
    category: 'Khung PXIe',
    primaryApplicationCode: 'ET',
    shortDescription: 'Khung PXIe 18 slot cho hệ thống chuyển mạch và mô phỏng cảm biến.',
    description:
      'Khung PXIe 18 slot tích hợp nguồn và làm mát cho các module chuyển mạch Pickering, dùng trong hệ thống kiểm thử tự động.',
    image: '/assets/products/test.svg',
    specs: [
      { group: 'Cấu hình', label: 'Số slot', value: '18', unit: 'slot', confirmed: true },
      { group: 'Kết nối', label: 'Giao tiếp', value: 'PCIe', unit: null, confirmed: true },
      { group: 'Hiệu năng', label: 'Băng thông', value: 'Cần xác nhận theo module', unit: null, confirmed: false },
    ],
    configurations: ['Khung 18 slot', 'Kèm module điều khiển'],
    relatedSkus: ['AD3'],
    sortOrder: 7,
  },
  {
    sku: 'ASTERION-ASM',
    model: 'Asterion ASM',
    name: 'Ametek Asterion Programmable Power Supply',
    slug: 'ametek-asterion-asm',
    brand: 'AMETEK',
    category: 'Nguồn lập trình',
    primaryApplicationCode: 'AUTO',
    shortDescription: 'Nguồn DC lập trình 1 kW, giao tiếp LAN/USB, phù hợp kiểm thử tự động.',
    description:
      'Asterion cung cấp nguồn DC ổn định cho kiểm thử ô tô, năng lượng và tự động hóa, hỗ trợ điều khiển từ xa qua LAN/USB.',
    image: '/assets/products/power.svg',
    specs: [
      { group: 'Hiệu năng', label: 'Công suất', value: '1', unit: 'kW', confirmed: true },
      { group: 'Hiệu năng', label: 'Điện áp', value: '0 – 400', unit: 'V', confirmed: true },
      { group: 'Kết nối', label: 'Giao tiếp', value: 'LAN / USB / RS232', unit: null, confirmed: true },
    ],
    configurations: ['Bản 1 kW', 'Kèm cáp nguồn'],
    relatedSkus: ['PXIe-1092'],
    sortOrder: 8,
  },
];

async function main() {
  await connectDb();
  console.log('[seed] clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Application.deleteMany({}),
    Product.deleteMany({}),
    Counter.deleteMany({}),
    RFQ.deleteMany({}),
    Quotation.deleteMany({}),
    Order.deleteMany({}),
    ProcessingLog.deleteMany({}),
    TransactionDoc.deleteMany({}),
    ContactRequest.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('[seed] applications');
  const apps = await Application.insertMany(APPLICATIONS);
  const appByCode = Object.fromEntries(apps.map((a) => [a.code, a]));

  console.log('[seed] companies');
  const [anViet, minhPhat, saoViet] = await Company.insertMany([
    {
      code: 'DN-ANVIET',
      name: 'Công ty TNHH Kỹ thuật An Việt',
      taxCode: '0312456789',
      industry: 'Sản xuất điện tử',
      address: 'Lô B12, KCN Tân Bình, TP.HCM',
      website: 'anviet.example',
      contactName: 'Nguyễn Minh Anh',
      contactEmail: 'minh.anh@anviet.example',
      contactPhone: '090 123 4567',
      status: 'active',
    },
    {
      code: 'DN-MINHPHAT',
      name: 'Công ty CP Tự động hóa Minh Phát',
      taxCode: '0312987654',
      industry: 'Tự động hóa',
      address: '128 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM',
      contactName: 'Phạm Quốc Bảo',
      contactEmail: 'bao@minhphat.example',
      contactPhone: '091 234 5678',
      status: 'active',
    },
    {
      code: 'DN-SAOVIET',
      name: 'Công ty TNHH Giải pháp Sao Việt',
      taxCode: '0313111222',
      industry: 'Nghiên cứu & Phát triển',
      address: '45 Cách Mạng Tháng 8, Quận 3, TP.HCM',
      contactName: 'Đỗ Thu Trang',
      contactEmail: 'trang@saoviet.example',
      contactPhone: '092 345 6789',
      status: 'pending_verification',
    },
  ]);

  console.log('[seed] users');
  const [admin, sales, engineering, customer] = await User.insertMany([
    {
      name: 'Nguyễn Đình Huy',
      email: 'admin@peritec.vn',
      passwordHash,
      role: 'admin',
      phone: '093 252 9288',
      position: 'System Administrator',
      status: 'active',
    },
    {
      name: 'Lê Thanh Hà',
      email: 'sales@peritec.vn',
      passwordHash,
      role: 'sales',
      phone: '093 252 9288',
      position: 'Kinh doanh',
      status: 'active',
    },
    {
      name: 'Trần Quốc Huy',
      email: 'engineering@peritec.vn',
      passwordHash,
      role: 'engineering',
      phone: '093 252 9288',
      position: 'Kỹ thuật / Ứng dụng',
      status: 'active',
    },
    {
      name: 'Nguyễn Minh Anh',
      email: 'customer@anviet.example',
      passwordHash,
      role: 'customer',
      companyId: anViet._id,
      phone: '090 123 4567',
      position: 'Kỹ thuật / Kỹ sư kiểm thử',
      status: 'active',
    },
  ]);
  anViet.accountManagerId = sales._id as any;
  minhPhat.accountManagerId = sales._id as any;
  await Promise.all([anViet.save(), minhPhat.save()]);

  console.log('[seed] products');
  const products = await Product.insertMany(
    PRODUCTS.map((p) => ({
      ...p,
      applicationIds: [appByCode[p.primaryApplicationCode]._id],
    }))
  );
  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  /* ---------------------------------------------------------------- */
  /* RFQ-261025-014 — quote sent, two quotation versions              */
  /* ---------------------------------------------------------------- */
  console.log('[seed] RFQ-261025-014 + quotation versions');
  const rfq1 = await RFQ.create({
    rfqCode: 'RFQ-261025-014',
    companyId: anViet._id,
    customerUserId: customer._id,
    companyName: anViet.name,
    contactName: 'Nguyễn Minh Anh',
    contactPosition: 'Kỹ thuật / Kỹ sư kiểm thử',
    contactEmail: 'minh.anh@anviet.example',
    contactPhone: '090 123 4567',
    technicalNote:
      'Phân tích tín hiệu RF trong phòng thí nghiệm. Cần tư vấn dải tần, băng thông và khả năng kết nối với máy tính hiện có.',
    privacyConsent: true,
    source: 'website',
    status: 'quote_sent',
    salesId: sales._id as any,
    technicianId: engineering._id as any,
    items: [
      {
        productId: bySku['SAN-90']._id,
        sku: 'SAN-90',
        name: bySku['SAN-90'].name,
        brand: 'HAROGIC',
        quantity: 2,
        configRequest: 'Tùy chọn cấp USB 3.0 và phần mềm phân tích phổ',
        itemNote: 'Dùng cho phòng lab RF',
        checkStatus: 'tested',
        checkNote: 'Cấu hình USB 3.0 phù hợp; đã đối chiếu datasheet SAN-90.',
        checkedBy: engineering._id as any,
        checkedAt: d('2026-10-25T09:50:00+07:00'),
      },
      {
        productId: bySku['SAN-45']._id,
        sku: 'SAN-45',
        name: bySku['SAN-45'].name,
        brand: 'HAROGIC',
        quantity: 1,
        configRequest: 'Đối chiếu với hệ thống hiện có',
        itemNote: null,
        checkStatus: 'tested',
        checkNote: 'Tương thích với cấu hình hiện tại.',
        checkedBy: engineering._id as any,
        checkedAt: d('2026-10-25T09:55:00+07:00'),
      },
    ],
    createdAt: d('2026-10-25T08:45:00+07:00'),
    updatedAt: d('2026-11-05T10:20:00+07:00'),
  });

  const quote1v1 = await Quotation.create({
    quoteCode: 'BG-261025-014',
    versionNo: 1,
    rfqId: rfq1._id,
    companyId: anViet._id,
    items: [
      { sku: 'SAN-90', name: bySku['SAN-90'].name, quantity: 2, unitPrice: 470000000, amount: 940000000, configRequest: 'USB 3.0 + phần mềm' },
      { sku: 'SAN-45', name: bySku['SAN-45'].name, quantity: 1, unitPrice: 240000000, amount: 240000000, configRequest: 'Đối chiếu hệ thống hiện có' },
    ],
    totalAmount: 1180000000,
    currency: 'VND',
    validUntil: d('2026-11-05T23:59:59+07:00'),
    quoteFileUrl: '/api/files/quotation/BG-261025-014.pdf',
    sentToEmail: 'minh.anh@anviet.example',
    sentBy: sales._id as any,
    sentAt: d('2026-10-25T10:25:00+07:00'),
    status: 'expired',
    createdAt: d('2026-10-25T10:00:00+07:00'),
  });
  quote1v1.rootQuoteId = quote1v1._id as any;
  await quote1v1.save();

  const quote1v2 = await Quotation.create({
    quoteCode: 'BG-261105-001',
    rootQuoteId: quote1v1._id,
    versionNo: 2,
    rfqId: rfq1._id,
    companyId: anViet._id,
    items: [
      { sku: 'SAN-90', name: bySku['SAN-90'].name, quantity: 2, unitPrice: 500000000, amount: 1000000000, configRequest: 'USB 3.0 + 10GbE + phần mềm' },
      { sku: 'SAN-45', name: bySku['SAN-45'].name, quantity: 1, unitPrice: 250000000, amount: 250000000, configRequest: 'Đối chiếu hệ thống hiện có' },
    ],
    totalAmount: 1250000000,
    currency: 'VND',
    validUntil: d('2026-12-10T23:59:59+07:00'),
    quoteFileUrl: '/api/files/quotation/BG-261105-001.pdf',
    sentToEmail: 'minh.anh@anviet.example',
    sentBy: sales._id as any,
    sentAt: d('2026-11-05T10:20:00+07:00'),
    note: 'Điều chỉnh theo phản hồi của khách hàng về cấu hình 10GbE.',
    status: 'sent',
    createdAt: d('2026-11-05T09:40:00+07:00'),
  });

  await ProcessingLog.create([
    {
      rfqId: rfq1._id,
      logType: 'website',
      actorName: 'Nguyễn Minh Anh',
      content: 'Quote request submitted from the website with 2 device line(s).',
      visibleToCustomer: true,
      createdAt: d('2026-10-25T08:45:00+07:00'),
    },
    {
      rfqId: rfq1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'assignment',
      content: 'Sales in charge: Lê Thanh Hà. Engineering coordinator: Trần Quốc Huy.',
      visibleToCustomer: false,
      createdAt: d('2026-10-25T10:20:00+07:00'),
    },
    {
      rfqId: rfq1._id,
      userId: engineering._id,
      actorName: 'Trần Quốc Huy',
      logType: 'technical',
      content: 'Hoàn tất kiểm tra cấu hình cho SAN-90 và SAN-45. Đã đối chiếu datasheet và cấu hình thực tế.',
      visibleToCustomer: false,
      createdAt: d('2026-10-25T09:55:00+07:00'),
    },
    {
      rfqId: rfq1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'quote',
      content: 'Quotation BG-261025-014 v1 sent to minh.anh@anviet.example. Validity: 2026-11-05.',
      visibleToCustomer: true,
      createdAt: d('2026-10-25T10:25:00+07:00'),
    },
    {
      rfqId: rfq1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'internal',
      content: 'Khách hàng phản hồi muốn bổ sung cấu hình 10GbE; đã chuẩn bị báo giá v2.',
      visibleToCustomer: false,
      createdAt: d('2026-11-04T16:10:00+07:00'),
    },
    {
      rfqId: rfq1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'quote',
      content: 'Quotation BG-261105-001 v2 sent to minh.anh@anviet.example. Validity: 2026-12-10.',
      visibleToCustomer: true,
      createdAt: d('2026-11-05T10:20:00+07:00'),
    },
  ]);

  await TransactionDoc.create([
    {
      companyId: anViet._id,
      rfqId: rfq1._id,
      fileType: 'quotation',
      fileName: 'BG-261025-014.pdf',
      fileUrl: '/api/files/quotation/BG-261025-014.pdf',
      visibleToCustomer: true,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-10-25T10:25:00+07:00'),
    },
    {
      companyId: anViet._id,
      rfqId: rfq1._id,
      fileType: 'quotation',
      fileName: 'BG-261105-001.pdf',
      fileUrl: '/api/files/quotation/BG-261105-001.pdf',
      visibleToCustomer: true,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-11-05T10:20:00+07:00'),
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* RFQ-261018-006 -> BG-261018-006 -> PO-261018-006 (5 stages)      */
  /* ---------------------------------------------------------------- */
  console.log('[seed] RFQ-261018-006 + confirmed quotation + PO-261018-006');
  const rfq2 = await RFQ.create({
    rfqCode: 'RFQ-261018-006',
    companyId: anViet._id,
    customerUserId: customer._id,
    companyName: anViet.name,
    contactName: 'Nguyễn Minh Anh',
    contactPosition: 'Kỹ thuật / Kỹ sư kiểm thử',
    contactEmail: 'minh.anh@anviet.example',
    contactPhone: '090 123 4567',
    technicalNote: 'Mô phỏng và kiểm thử tín hiệu vô tuyến cho dự án nghiên cứu 5G.',
    privacyConsent: true,
    source: 'website',
    status: 'confirmed',
    salesId: sales._id as any,
    technicianId: engineering._id as any,
    items: [
      {
        productId: bySku['USRP-X420']._id,
        sku: 'USRP-X420',
        name: bySku['USRP-X420'].name,
        brand: 'Ettus Research',
        quantity: 2,
        configRequest: 'Bản 2 kênh TX/RX, kèm FPGA image theo yêu cầu',
        itemNote: 'Cần tư vấn cấu hình FPGA',
        checkStatus: 'tested',
        checkNote: 'Đã xác nhận cấu hình với nhà sản xuất.',
        checkedBy: engineering._id as any,
        checkedAt: d('2026-10-20T14:00:00+07:00'),
      },
    ],
    createdAt: d('2026-10-18T09:10:00+07:00'),
    updatedAt: d('2026-10-23T11:00:00+07:00'),
  });

  const quote2 = await Quotation.create({
    quoteCode: 'BG-261018-006',
    versionNo: 1,
    rfqId: rfq2._id,
    companyId: anViet._id,
    items: [
      { sku: 'USRP-X420', name: bySku['USRP-X420'].name, quantity: 2, unitPrice: 890000000, amount: 1780000000, configRequest: '2 kênh TX/RX' },
    ],
    totalAmount: 1780000000,
    currency: 'VND',
    validUntil: d('2026-11-30T23:59:59+07:00'),
    quoteFileUrl: '/api/files/quotation/BG-261018-006.pdf',
    sentToEmail: 'minh.anh@anviet.example',
    sentBy: sales._id as any,
    sentAt: d('2026-10-19T15:30:00+07:00'),
    status: 'customer_confirmed',
    createdAt: d('2026-10-19T14:00:00+07:00'),
  });
  quote2.rootQuoteId = quote2._id as any;
  await quote2.save();

  const orderStages = [
    { stageNo: 1, name: 'Order confirmation', plannedDate: d('2026-10-23'), actualDate: d('2026-10-23'), status: 'complete', note: 'Đã xác nhận đơn hàng với khách.' },
    { stageNo: 2, name: 'Supplier order', plannedDate: d('2026-11-02'), actualDate: d('2026-10-29'), status: 'complete', note: 'Đã đặt hàng nhà sản xuất.' },
    { stageNo: 3, name: 'International shipping', plannedDate: d('2026-11-25'), actualDate: null, status: 'current', note: 'Hàng đang trên đường vận chuyển quốc tế.' },
    { stageNo: 4, name: 'Customs clearance', plannedDate: d('2026-12-02'), actualDate: null, status: 'not_started', note: null },
    { stageNo: 5, name: 'Delivery', plannedDate: d('2026-12-10'), actualDate: null, status: 'not_started', note: null },
  ];

  const order1 = await Order.create({
    orderCode: 'PO-261018-006',
    quoteId: quote2._id,
    rfqId: rfq2._id,
    companyId: anViet._id,
    isImport: true,
    currentStage: 3,
    etaDate: d('2026-12-12T00:00:00+07:00'),
    etaNote: 'Estimated date may change due to transportation and customs clearance.',
    recipientName: 'Nguyễn Minh Anh',
    recipientPhone: '090 123 4567',
    recipientEmail: 'minh.anh@anviet.example',
    deliveryAddress: 'Lô B12, KCN Tân Bình, TP.HCM',
    addressStatus: 'confirmed',
    items: [
      {
        productId: bySku['USRP-X420']._id,
        sku: 'USRP-X420',
        name: bySku['USRP-X420'].name,
        quantity: 2,
        configRef: 'Bản 2 kênh TX/RX, FPGA image theo yêu cầu',
        itemStatus: 'Shipping',
      },
    ],
    stages: orderStages,
    status: 'processing',
    createdAt: d('2026-10-23T11:00:00+07:00'),
    updatedAt: d('2026-11-12T16:40:00+07:00'),
  });

  await ProcessingLog.create([
    {
      orderId: order1._id,
      rfqId: rfq2._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'status',
      content: 'Order PO-261018-006 created from confirmed quotation BG-261018-006. Five import stages generated.',
      visibleToCustomer: true,
      createdAt: d('2026-10-23T11:00:00+07:00'),
    },
    {
      orderId: order1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'stage',
      content: 'Stage 1 "Order confirmation" marked complete. Next: Supplier order.',
      visibleToCustomer: true,
      createdAt: d('2026-10-23T11:15:00+07:00'),
    },
    {
      orderId: order1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'stage',
      content: 'Stage 2 "Supplier order" marked complete. Next: International shipping.',
      visibleToCustomer: true,
      createdAt: d('2026-10-29T09:30:00+07:00'),
    },
    {
      orderId: order1._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'eta',
      content:
        'ETA changed from 2026-12-05 to 2026-12-12. Reason: Nhà sản xuất chậm giao 1 tuần do lịch sản xuất. Estimated date may change due to transportation and customs clearance.',
      visibleToCustomer: true,
      createdAt: d('2026-11-12T16:40:00+07:00'),
    },
    {
      orderId: order1._id,
      rfqId: rfq2._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'internal',
      content: 'Forwarder báo tàu trễ; chưa thông báo chi tiết cho khách, chỉ cập nhật ETA chính thức.',
      visibleToCustomer: false,
      createdAt: d('2026-11-12T16:45:00+07:00'),
    },
  ]);

  await TransactionDoc.create([
    {
      companyId: anViet._id,
      rfqId: rfq2._id,
      orderId: order1._id,
      fileType: 'quotation',
      fileName: 'BG-261018-006.pdf',
      fileUrl: '/api/files/quotation/BG-261018-006.pdf',
      visibleToCustomer: true,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-10-19T15:30:00+07:00'),
    },
    {
      companyId: anViet._id,
      orderId: order1._id,
      fileType: 'order_confirmation',
      fileName: 'PO-261018-006-order-confirmation.pdf',
      fileUrl: '/api/files/order/PO-261018-006.pdf',
      visibleToCustomer: true,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-10-23T11:00:00+07:00'),
    },
    {
      companyId: anViet._id,
      orderId: order1._id,
      fileType: 'equipment_list',
      fileName: 'PO-261018-006-equipment-list.pdf',
      fileUrl: '/api/files/equipment/PO-261018-006.pdf',
      visibleToCustomer: true,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-10-23T11:00:00+07:00'),
    },
    {
      companyId: anViet._id,
      orderId: order1._id,
      fileType: 'delivery_document',
      fileName: 'PO-261018-006-internal-handover.pdf',
      fileUrl: '/api/files/order/PO-261018-006.pdf',
      visibleToCustomer: false,
      uploadedBy: sales._id as any,
      uploadedAt: d('2026-11-01T09:00:00+07:00'),
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Two extra RFQs so the internal queue has realistic metrics       */
  /* ---------------------------------------------------------------- */
  console.log('[seed] extra RFQs for the internal queue');
  const rfq3 = await RFQ.create({
    rfqCode: 'RFQ-261119-001',
    companyId: minhPhat._id,
    companyName: minhPhat.name,
    contactName: 'Phạm Quốc Bảo',
    contactPosition: 'Trưởng phòng kỹ thuật',
    contactEmail: 'bao@minhphat.example',
    contactPhone: '091 234 5678',
    technicalNote: 'Cần bộ thu thập dữ liệu cho dây chuyền kiểm tra tự động, 8 kênh tín hiệu tương tự.',
    privacyConsent: true,
    source: 'website',
    status: 'new',
    items: [
      {
        productId: bySku['NI-MIODAQ-8']._id,
        sku: 'NI-MIODAQ-8',
        name: bySku['NI-MIODAQ-8'].name,
        brand: 'NI / Emerson',
        quantity: 2,
        configRequest: 'Bản 8 kênh, kèm cáp tín hiệu',
        itemNote: 'Cần tư vấn phần mềm DAQExpress',
        checkStatus: 'not_tested',
      },
    ],
    createdAt: d('2026-11-19T14:10:00+07:00'),
  });

  const rfq4 = await RFQ.create({
    rfqCode: 'RFQ-261120-002',
    companyId: saoViet._id,
    companyName: saoViet.name,
    contactName: 'Đỗ Thu Trang',
    contactPosition: 'Giám đốc R&D',
    contactEmail: 'trang@saoviet.example',
    contactPhone: '092 345 6789',
    technicalNote: 'Đo kiểm module Wi-Fi 6E, cần tư vấn băng thông thời gian thực.',
    privacyConsent: true,
    source: 'website',
    status: 'checking_configuration',
    salesId: sales._id as any,
    technicianId: engineering._id as any,
    items: [
      {
        productId: bySku['SAN-60']._id,
        sku: 'SAN-60',
        name: bySku['SAN-60'].name,
        brand: 'HAROGIC',
        quantity: 1,
        configRequest: 'Bản USB 3.0, đối chiếu băng thông 60 MHz',
        itemNote: null,
        checkStatus: 'need_clarification',
        checkNote: 'Băng thông thời gian thực chưa được xác nhận trong datasheet hiện tại.',
        checkedBy: engineering._id as any,
        checkedAt: d('2026-11-20T09:15:00+07:00'),
      },
    ],
    createdAt: d('2026-11-20T08:30:00+07:00'),
  });

  await ProcessingLog.create([
    {
      rfqId: rfq3._id,
      logType: 'website',
      actorName: 'Phạm Quốc Bảo',
      content: 'Quote request submitted from the website with 1 device line(s).',
      visibleToCustomer: true,
      createdAt: d('2026-11-19T14:10:00+07:00'),
    },
    {
      rfqId: rfq4._id,
      logType: 'website',
      actorName: 'Đỗ Thu Trang',
      content: 'Quote request submitted from the website with 1 device line(s).',
      visibleToCustomer: true,
      createdAt: d('2026-11-20T08:30:00+07:00'),
    },
    {
      rfqId: rfq4._id,
      userId: sales._id,
      actorName: 'Lê Thanh Hà',
      logType: 'assignment',
      content: 'Sales in charge: Lê Thanh Hà. Engineering coordinator: Trần Quốc Huy.',
      visibleToCustomer: false,
      createdAt: d('2026-11-20T08:45:00+07:00'),
    },
    {
      rfqId: rfq4._id,
      userId: engineering._id,
      actorName: 'Trần Quốc Huy',
      logType: 'technical',
      content: 'Configuration check for SAN-60: need_clarification — cần xác nhận băng thông theo datasheet mới.',
      visibleToCustomer: false,
      createdAt: d('2026-11-20T09:15:00+07:00'),
    },
  ]);

  /* ---------------------------------------------------------------- */
  /* Counters — so generated codes continue after the seeded ones     */
  /* ---------------------------------------------------------------- */
  await Counter.insertMany([
    { _id: 'RFQ-261018', seq: 6 },
    { _id: 'RFQ-261025', seq: 14 },
    { _id: 'RFQ-261119', seq: 1 },
    { _id: 'RFQ-261120', seq: 2 },
    { _id: 'BG-261018', seq: 6 },
    { _id: 'BG-261025', seq: 14 },
    { _id: 'BG-261105', seq: 1 },
    { _id: 'PO-261018', seq: 6 },
  ]);

  console.log('');
  console.log('[seed] done');
  console.log('  companies :', await Company.countDocuments());
  console.log('  users     :', await User.countDocuments());
  console.log('  products  :', await Product.countDocuments());
  console.log('  rfqs      :', await RFQ.countDocuments());
  console.log('  quotes    :', await Quotation.countDocuments());
  console.log('  orders    :', await Order.countDocuments());
  console.log('  logs      :', await ProcessingLog.countDocuments());
  console.log('  documents :', await TransactionDoc.countDocuments());
  console.log('');
  console.log('  test accounts (password Peritec@123):');
  console.log('   admin@peritec.vn        admin');
  console.log('   sales@peritec.vn        sales');
  console.log('   engineering@peritec.vn  engineering');
  console.log('   customer@anviet.example customer (An Việt)');
  console.log('');

  await disconnectDb();
}

main().catch(async (err) => {
  console.error('[seed] failed', err);
  await disconnectDb();
  process.exit(1);
});
