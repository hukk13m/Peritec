import mongoose, { Schema, model } from 'mongoose';

const { ObjectId } = Schema.Types;

/* ------------------------------------------------------------------ */
/* User — reuses the pre-existing "User" collection in database Peritec */
/* ------------------------------------------------------------------ */
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'sales', 'engineering', 'customer'],
      index: true,
    },
    companyId: { type: ObjectId, ref: 'Company', default: null, index: true },
    phone: { type: String },
    position: { type: String },
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: 'User' }
);
export const User = model('User', UserSchema);

/* ------------------------------------------------------------------ */
/* Company                                                            */
/* ------------------------------------------------------------------ */
const CompanySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    taxCode: { type: String },
    industry: { type: String },
    address: { type: String },
    website: { type: String },
    contactName: { type: String },
    contactEmail: { type: String, lowercase: true },
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'locked'],
      default: 'active',
      index: true,
    },
    accountManagerId: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'Company' }
);
export const Company = model('Company', CompanySchema);

/* ------------------------------------------------------------------ */
/* Application                                                        */
/* ------------------------------------------------------------------ */
const ApplicationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'Application' }
);
export const Application = model('Application', ApplicationSchema);

/* ------------------------------------------------------------------ */
/* Product                                                            */
/* ------------------------------------------------------------------ */
const SpecSchema = new Schema(
  {
    group: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, default: null },
    unit: { type: String, default: null },
    confirmed: { type: Boolean, default: true },
    note: { type: String, default: null },
  },
  { _id: false }
);

const ProductDocSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: 'Datasheet' },
    version: { type: String, default: '1.0' },
    language: { type: String, default: 'EN' },
    access: { type: String, enum: ['public', 'download_request'], default: 'public' },
    url: { type: String },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    brand: { type: String, required: true, index: true },
    category: { type: String, required: true },
    applicationIds: [{ type: ObjectId, ref: 'Application' }],
    primaryApplicationCode: { type: String, required: true, index: true },
    shortDescription: { type: String },
    description: { type: String },
    image: { type: String },
    specs: [SpecSchema],
    documents: [ProductDocSchema],
    configurations: [{ type: String }],
    relatedSkus: [{ type: String }],
    availability: { type: String, default: 'Contact to order' },
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'Product' }
);
export const Product = model('Product', ProductSchema);

/* ------------------------------------------------------------------ */
/* Counter — atomic document-code generator (BR-05)                    */
/* ------------------------------------------------------------------ */
const CounterSchema = new Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false, collection: 'Counter' }
);
export const Counter = model('Counter', CounterSchema);

/* ------------------------------------------------------------------ */
/* RFQ                                                                */
/* ------------------------------------------------------------------ */
const RfqItemSchema = new Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    configRequest: { type: String, default: null },
    itemNote: { type: String, default: null },
    checkStatus: {
      type: String,
      enum: ['not_tested', 'tested', 'need_clarification'],
      default: 'not_tested',
    },
    checkNote: { type: String, default: null },
    checkedBy: { type: ObjectId, ref: 'User' },
    checkedAt: { type: Date },
  },
  { _id: true }
);

const RfqSchema = new Schema(
  {
    rfqCode: { type: String, required: true, unique: true },
    companyId: { type: ObjectId, ref: 'Company', index: true },
    customerUserId: { type: ObjectId, ref: 'User' },
    companyName: { type: String, required: true },
    contactName: { type: String, required: true },
    contactPosition: { type: String },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String, required: true },
    technicalNote: { type: String },
    privacyConsent: { type: Boolean, required: true },
    source: { type: String, enum: ['website', 'contact', 'staff'], default: 'website' },
    status: {
      type: String,
      enum: [
        'new',
        'checking_configuration',
        'quote_sent',
        'needs_adjustment',
        'confirmed',
        'canceled',
      ],
      default: 'new',
      index: true,
    },
    salesId: { type: ObjectId, ref: 'User', index: true },
    technicianId: { type: ObjectId, ref: 'User', index: true },
    items: { type: [RfqItemSchema], validate: [(v) => v.length >= 1, 'At least 1 device'] },
  },
  { timestamps: true, collection: 'RFQ' }
);
export const RFQ = model('RFQ', RfqSchema);

/* ------------------------------------------------------------------ */
/* Quotation — immutable versions (BR-09)                             */
/* ------------------------------------------------------------------ */
const QuoteItemSchema = new Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, default: null },
    amount: { type: Number, default: null },
    configRequest: { type: String, default: null },
  },
  { _id: false }
);

const QuotationSchema = new Schema(
  {
    quoteCode: { type: String, required: true, unique: true },
    rootQuoteId: { type: ObjectId, ref: 'Quotation', index: true },
    versionNo: { type: Number, required: true, default: 1 },
    rfqId: { type: ObjectId, ref: 'RFQ', required: true, index: true },
    companyId: { type: ObjectId, ref: 'Company', index: true },
    items: { type: [QuoteItemSchema], default: [] },
    totalAmount: { type: Number, default: null },
    currency: { type: String, default: 'VND' },
    validUntil: { type: Date, required: true },
    quoteFileUrl: { type: String },
    configFileUrl: { type: String },
    sentToEmail: { type: String },
    sentBy: { type: ObjectId, ref: 'User' },
    sentAt: { type: Date },
    note: { type: String },
    status: {
      type: String,
      enum: ['draft', 'sent', 'customer_confirmed', 'adjustment_requested', 'expired'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true, collection: 'Quotation' }
);
QuotationSchema.index({ rfqId: 1, versionNo: 1 }, { unique: true });
export const Quotation = model('Quotation', QuotationSchema);

/* ------------------------------------------------------------------ */
/* Order — 5 embedded import stages (BR-11)                           */
/* ------------------------------------------------------------------ */
const OrderStageSchema = new Schema(
  {
    stageNo: { type: Number, required: true },
    name: { type: String, required: true },
    plannedDate: { type: Date, default: null },
    actualDate: { type: Date, default: null },
    status: { type: String, enum: ['not_started', 'current', 'complete'], default: 'not_started' },
    note: { type: String, default: null },
    updatedBy: { type: ObjectId, ref: 'User' },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const OrderItemSchema = new Schema(
  {
    productId: { type: ObjectId, ref: 'Product' },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    configRef: { type: String, default: null },
    itemStatus: { type: String, default: 'Processing' },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    quoteId: { type: ObjectId, ref: 'Quotation', required: true },
    rfqId: { type: ObjectId, ref: 'RFQ', index: true },
    companyId: { type: ObjectId, ref: 'Company', required: true, index: true },
    isImport: { type: Boolean, default: true },
    currentStage: { type: Number, default: 1 },
    etaDate: { type: Date, default: null },
    etaNote: {
      type: String,
      default: 'Estimated date may change due to transportation and customs clearance.',
    },
    recipientName: { type: String },
    recipientPhone: { type: String },
    recipientEmail: { type: String },
    deliveryAddress: { type: String },
    addressStatus: { type: String, enum: ['pending_confirmation', 'confirmed'], default: 'pending_confirmation' },
    items: { type: [OrderItemSchema], default: [] },
    stages: { type: [OrderStageSchema], default: [] },
    status: {
      type: String,
      enum: ['processing', 'delivered', 'canceled'],
      default: 'processing',
      index: true,
    },
  },
  { timestamps: true, collection: 'Order' }
);
export const Order = model('Order', OrderSchema);

/* ------------------------------------------------------------------ */
/* ProcessingLog                                                      */
/* ------------------------------------------------------------------ */
const ProcessingLogSchema = new Schema(
  {
    rfqId: { type: ObjectId, ref: 'RFQ', index: true },
    orderId: { type: ObjectId, ref: 'Order', index: true },
    userId: { type: ObjectId, ref: 'User' },
    actorName: { type: String },
    logType: {
      type: String,
      enum: ['website', 'internal', 'customer', 'assignment', 'status', 'quote', 'technical', 'eta', 'stage'],
      default: 'internal',
    },
    content: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    visibleToCustomer: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'ProcessingLog' }
);
export const ProcessingLog = model('ProcessingLog', ProcessingLogSchema);

/* ------------------------------------------------------------------ */
/* TransactionDoc                                                     */
/* ------------------------------------------------------------------ */
const TransactionDocSchema = new Schema(
  {
    companyId: { type: ObjectId, ref: 'Company', required: true, index: true },
    rfqId: { type: ObjectId, ref: 'RFQ' },
    orderId: { type: ObjectId, ref: 'Order' },
    fileType: {
      type: String,
      enum: ['quotation', 'order_confirmation', 'equipment_list', 'delivery_document'],
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    visibleToCustomer: { type: Boolean, default: false },
    uploadedBy: { type: ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { collection: 'TransactionDoc' }
);
export const TransactionDoc = model('TransactionDoc', TransactionDocSchema);

/* ------------------------------------------------------------------ */
/* ContactRequest (inquiry from public contact form)                  */
/* ------------------------------------------------------------------ */
const ContactSchema = new Schema(
  {
    needType: { type: String, default: 'product_consulting' },
    companyName: { type: String },
    contactName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    content: { type: String, required: true },
    privacyConsent: { type: Boolean, required: true },
    status: { type: String, default: 'new' },
    relatedOrderCode: { type: String, default: null },
  },
  { timestamps: true, collection: 'ContactRequest' }
);
export const ContactRequest = model('ContactRequest', ContactSchema);

export const collections = {
  User,
  Company,
  Application,
  Product,
  Counter,
  RFQ,
  Quotation,
  Order,
  ProcessingLog,
  TransactionDoc,
  ContactRequest,
};

export { mongoose };
