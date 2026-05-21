export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category_id: string;
  category_name: string;
  supplier_id: string;
  supplier_name: string;
  brand_id: string;
  brand_name: string;
  unit_id: string;
  unit_name: string;
  purchase_cost: number;
  sale_price: number;
  wholesale_price: number;
  retail_price: number;
  stock_quantity: number;
  minimum_stock: number;
  rack_location: string;
  expiry_date: string;
  batch_number: string;
  status: 'active' | 'inactive';
  
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  invoiceNo: string;
  customerName: string;
  date: string;
  total: number;
  status: 'Paid' | 'Credit';
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  paidTo: string;
  status: string;
  created_at?: string;
}

export interface Customer {
  name: string;
  phone: string;
  totalPurchases: number;
  credit: number; // Outstanding Udhaar balance
  lastPayment: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role_id?: string;
  role?: string;
  role_name?: string;
  status?: 'active' | 'inactive';
  last_login?: string;
  branch_id?: string;
  permissions?: string[];
  created_at?: string;
}

export interface Tenant {
  id: string;
  storeName: string;
  phone: string;
  address: string;
  ntn: string; // National Tax Number (Pakistan)
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  ntn: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  cost: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  tenant_id: string;
  branch_id: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_invoice_no?: string;
  date: string;
  total: number;
  status: string;
  payment_status: 'Paid' | 'Partial' | 'Credit';
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  remaining_payable: number;
  payment_method: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  items?: PurchaseItem[];
}

export interface CreatePurchaseInput extends Partial<Purchase> {
  items: PurchaseItem[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'OPENING' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  quantity_in: number;
  quantity_out: number;
  reference_type: string;
  reference_id: string;
  previous_stock: number;
  new_stock: number;
  date: string;
  notes: string;
  created_by?: string;
  created_at?: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  date: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  notes: string;
  created_at?: string;
}

export interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  account_subtype?: string;
  parent_account_id?: string;
  opening_balance: number;
  current_balance: number;
  is_system_account: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryLine {
  id?: string;
  journal_entry_id?: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entry_no: string;
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  total_debit: number;
  total_credit: number;
  status: string;
  created_by?: string;
  created_at?: string;
  lines?: JournalEntryLine[];
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
export type InvoiceStatus = 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Void';

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

export interface Quote {
  id: string;
  quote_no: string;
  customer_name: string;
  quote_date: string;
  expiry_date: string;
  status: QuoteStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: QuoteItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  invoice_date: string;
  due_date?: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  stock_posted: number;
  accounting_posted: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'Cash' | 'Bank';
  reference_no?: string;
  notes?: string;
  created_at?: string;
}

export interface TaxRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  type: 'GST' | 'VAT' | 'Sales Tax' | 'Withholding';
  mode: 'inclusive' | 'exclusive';
  purchase_account_id?: string;
  sales_account_id?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export type BankAccountType = 'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash';
export type MoneyTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'BANK_CHARGE' | 'ADJUSTMENT';
export type PaymentMethod = 'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash' | 'Card' | 'Cheque';

export interface BankAccount {
  id: string;
  code: string;
  name: string;
  account_type: BankAccountType;
  linked_gl_account_id: string;
  opening_balance: number;
  current_balance: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface MoneyTransaction {
  id: string;
  tenant_id: string;
  branch_id: string;
  account_id: string;
  account_name?: string;
  account_code?: string;
  transaction_date: string;
  transaction_type: MoneyTransactionType;
  amount: number;
  offset_gl_account_id?: string;
  reference_no?: string;
  notes?: string;
  counter_account_id?: string;
  is_cleared: number;
  cleared_at?: string;
  created_at?: string;
}

export interface BankReconciliation {
  id: string;
  account_id: string;
  account_name?: string;
  account_code?: string;
  start_date: string;
  end_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  status: 'draft' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface BankReconciliationItem {
  id: string;
  reconciliation_id: string;
  transaction_id: string;
  transaction_date: string;
  transaction_type: MoneyTransactionType;
  amount: number;
  cleared_amount: number;
  reference_no?: string;
}

export interface PaymentMethodAccount {
  payment_method: PaymentMethod;
  account_id: string | null;
  account_name?: string;
  account_code?: string;
}
