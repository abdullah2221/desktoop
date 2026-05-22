import { getDatabase } from '../connection';

export class CustomerRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM customers WHERE status != 'inactive' ORDER BY name ASC").all();
  }

  static create(payload: any) {
    const db = getDatabase();
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Customer name is required.');
    const info = db.prepare(`
      INSERT INTO customers (
        name, tenant_id, branch_id, phone, whatsapp, address, opening_balance, totalPurchases, credit, lastPayment, credit_limit, due_days, status, updated_at
      ) VALUES (
        @name, 'T001', @branch_id, @phone, @whatsapp, @address, @opening_balance, @totalPurchases, @credit, @lastPayment, @credit_limit, @due_days, @status, CURRENT_TIMESTAMP
      )
    `).run({
      name,
      branch_id: payload.branch_id || 'B001',
      phone: payload.phone || '',
      whatsapp: payload.whatsapp || payload.phone || '',
      address: payload.address || '',
      opening_balance: Number(payload.opening_balance || 0),
      totalPurchases: Number(payload.totalPurchases || 0),
      credit: Number(payload.credit || 0),
      lastPayment: payload.lastPayment || new Date().toISOString().split('T')[0],
      credit_limit: Number(payload.credit_limit || 0),
      due_days: Number(payload.due_days || 0),
      status: payload.status || 'active'
    });
    return info.changes > 0;
  }

  static update(payload: any) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE customers
      SET phone=@phone,
          whatsapp=@whatsapp,
          address=@address,
          opening_balance=@opening_balance,
          totalPurchases=@totalPurchases,
          credit=@credit,
          lastPayment=@lastPayment,
          credit_limit=@credit_limit,
          due_days=@due_days,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE name=@name
    `).run({
      name: payload.name,
      phone: payload.phone || '',
      whatsapp: payload.whatsapp || payload.phone || '',
      address: payload.address || '',
      opening_balance: Number(payload.opening_balance || 0),
      totalPurchases: Number(payload.totalPurchases || 0),
      credit: Number(payload.credit || 0),
      lastPayment: payload.lastPayment || new Date().toISOString().split('T')[0],
      credit_limit: Number(payload.credit_limit || 0),
      due_days: Number(payload.due_days || 0),
      status: payload.status || 'active'
    });
    return info.changes > 0;
  }

  static deactivate(name: string) {
    const db = getDatabase();
    const info = db.prepare(`UPDATE customers SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE name=?`).run(name);
    return info.changes > 0;
  }

  static getByName(name: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers WHERE name=?').get(name);
  }

  static getById(name: string) {
    return this.getByName(name);
  }

  static getSales(name: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM sales
      WHERE customer_id = @name OR customerName = @name
      ORDER BY date DESC, sale_time DESC, created_at DESC
    `).all({ name });
  }

  static getInvoices(name: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM invoices
      WHERE customer_id = @name OR customer_name = @name
      ORDER BY invoice_date DESC, created_at DESC
    `).all({ name });
  }

  static getPayments(name: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT ip.*, i.invoice_no, i.customer_name
      FROM invoice_payments ip
      JOIN invoices i ON i.id = ip.invoice_id
      WHERE i.customer_id = @name OR i.customer_name = @name
      ORDER BY ip.payment_date DESC, ip.created_at DESC
    `).all({ name });
  }

  static getStatement(name: string) {
    const db = getDatabase();
    const customer = this.getByName(name) as any;
    const sales = this.getSales(name) as any[];
    const invoices = this.getInvoices(name) as any[];
    const payments = this.getPayments(name) as any[];
    const returns = db.prepare(`
      SELECT sr.*
      FROM sales_returns sr
      LEFT JOIN sales s ON s.invoiceNo = sr.sale_id
      WHERE sr.customer_id = @name OR s.customer_id = @name OR s.customerName = @name
      ORDER BY sr.created_at DESC
    `).all({ name }) as any[];

    const khataPayments = db.prepare(`
      SELECT * FROM customer_payments
      WHERE customer_name = ?
      ORDER BY payment_date DESC, created_at DESC
    `).all(name) as any[];
    const adjustments = db.prepare(`
      SELECT * FROM customer_adjustments
      WHERE customer_name = ?
      ORDER BY adjustment_date DESC, created_at DESC
    `).all(name) as any[];

    const runningEntries: Array<{ date: string; type: string; reference: string; debit: number; credit: number; balance: number; notes?: string }> = [];
    const txns: Array<{ date: string; ts: string; type: string; reference: string; debit: number; credit: number; notes?: string }> = [];
    const opening = Number(customer?.opening_balance || 0);
    txns.push({ date: customer?.created_at?.split?.(' ')?.[0] || new Date().toISOString().split('T')[0], ts: customer?.created_at || '', type: 'OPENING', reference: name, debit: opening, credit: 0, notes: 'Opening balance' });

    for (const sale of sales.filter((row) => String(row.status || '') === 'Credit')) {
      txns.push({ date: sale.date, ts: sale.sale_time || sale.created_at || sale.date, type: 'POS_CREDIT_SALE', reference: sale.invoiceNo, debit: Number(sale.total || 0), credit: 0, notes: 'POS credit sale' });
    }
    for (const invoice of invoices) {
      txns.push({ date: invoice.invoice_date, ts: invoice.created_at || invoice.invoice_date, type: 'SALES_INVOICE', reference: invoice.invoice_no || invoice.id, debit: Number(invoice.grand_total || 0), credit: 0, notes: `Invoice ${invoice.status}` });
    }
    for (const payment of payments) {
      txns.push({ date: payment.payment_date, ts: payment.created_at || payment.payment_date, type: 'INVOICE_PAYMENT', reference: payment.id, debit: 0, credit: Number(payment.amount || 0), notes: payment.notes || '' });
    }
    for (const payment of khataPayments) {
      txns.push({ date: payment.payment_date, ts: payment.created_at || payment.payment_date, type: 'KHATA_PAYMENT', reference: payment.id, debit: 0, credit: Number(payment.amount || 0), notes: payment.notes || '' });
    }
    for (const ret of returns) {
      txns.push({ date: String(ret.created_at || '').split(' ')[0] || new Date().toISOString().split('T')[0], ts: ret.created_at || '', type: 'RETURN', reference: ret.id, debit: 0, credit: Number(ret.total_amount || 0), notes: ret.return_reason || '' });
    }
    for (const adj of adjustments) {
      const amount = Number(adj.amount || 0);
      txns.push({
        date: adj.adjustment_date,
        ts: adj.created_at || adj.adjustment_date,
        type: `ADJUST_${adj.adjustment_type}`,
        reference: adj.id,
        debit: adj.adjustment_type === 'DEBIT' ? amount : 0,
        credit: adj.adjustment_type === 'CREDIT' ? amount : 0,
        notes: adj.notes || ''
      });
    }

    txns.sort((a, b) => `${a.date} ${a.ts}`.localeCompare(`${b.date} ${b.ts}`));
    let running = 0;
    for (const row of txns) {
      running += Number(row.debit || 0) - Number(row.credit || 0);
      runningEntries.push({ ...row, balance: running });
    }

    const totalPosSales = sales.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const totalInvoiceSales = invoices.reduce((sum, row) => sum + Number(row.grand_total || 0), 0);
    const totalInvoicePayments = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const totalKhataPayments = khataPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const totalReturns = returns.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, row) => {
      const amount = Number(row.amount || 0);
      return sum + (row.adjustment_type === 'DEBIT' ? amount : -amount);
    }, 0);
    const outstanding = runningEntries.length ? runningEntries[runningEntries.length - 1].balance : 0;

    return {
      customer,
      summary: {
        opening_balance: opening,
        total_pos_sales: totalPosSales,
        total_invoice_sales: totalInvoiceSales,
        total_sales: totalPosSales + totalInvoiceSales,
        total_payments: totalInvoicePayments + totalKhataPayments,
        total_invoice_payments: totalInvoicePayments,
        total_khata_payments: totalKhataPayments,
        total_returns: totalReturns,
        net_adjustments: totalAdjustments,
        outstanding_balance: outstanding,
        khata_balance: Number(customer?.credit || 0),
        due_days: Number(customer?.due_days || 0)
      },
      sales,
      invoices,
      payments,
      khata_payments: khataPayments,
      returns,
      adjustments,
      entries: runningEntries
    };
  }

  static getKhataCustomers() {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        c.*,
        CASE
          WHEN COALESCE(c.due_days, 0) <= 0 THEN 0
          ELSE MAX(0, CAST((julianday('now') - julianday(COALESCE(c.lastPayment, date('now'))) - c.due_days) AS INTEGER))
        END AS overdue_days
      FROM customers c
      WHERE COALESCE(c.status, 'active') != 'inactive'
      ORDER BY COALESCE(c.credit, 0) DESC, c.name ASC
    `).all();
  }

  static recordPayment(payload: {
    customer_name: string;
    payment_date: string;
    amount: number;
    payment_method: 'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash' | 'Card' | 'Cheque';
    reference_no?: string;
    notes?: string;
    branch_id?: string;
    created_by?: string;
  }) {
    const db = getDatabase();
    const tx = db.transaction((data: typeof payload) => {
      const customer = this.getByName(data.customer_name) as any;
      if (!customer) throw new Error('Customer not found.');
      const amount = Number(data.amount || 0);
      if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
      const id = `CP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      db.prepare(`
        INSERT INTO customer_payments (
          id, tenant_id, branch_id, customer_name, payment_date, amount, payment_method, reference_no, notes, created_by
        ) VALUES (
          @id, 'T001', @branch_id, @customer_name, @payment_date, @amount, @payment_method, @reference_no, @notes, @created_by
        )
      `).run({
        id,
        branch_id: data.branch_id || customer.branch_id || 'B001',
        customer_name: data.customer_name,
        payment_date: data.payment_date,
        amount,
        payment_method: data.payment_method,
        reference_no: data.reference_no || '',
        notes: data.notes || '',
        created_by: data.created_by || null
      });
      const newCredit = Math.max(0, Number(customer.credit || 0) - amount);
      db.prepare(`
        UPDATE customers
        SET credit = ?, lastPayment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `).run(newCredit, data.payment_date, data.customer_name);
      return { success: true, id, new_balance: newCredit };
    });
    return tx(payload);
  }

  static createAdjustment(payload: {
    customer_name: string;
    adjustment_date: string;
    adjustment_type: 'DEBIT' | 'CREDIT';
    amount: number;
    notes?: string;
    branch_id?: string;
    created_by?: string;
  }) {
    const db = getDatabase();
    const tx = db.transaction((data: typeof payload) => {
      const customer = this.getByName(data.customer_name) as any;
      if (!customer) throw new Error('Customer not found.');
      const amount = Number(data.amount || 0);
      if (amount <= 0) throw new Error('Adjustment amount must be greater than zero.');
      const id = `CA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      db.prepare(`
        INSERT INTO customer_adjustments (
          id, tenant_id, branch_id, customer_name, adjustment_date, adjustment_type, amount, notes, created_by
        ) VALUES (
          @id, 'T001', @branch_id, @customer_name, @adjustment_date, @adjustment_type, @amount, @notes, @created_by
        )
      `).run({
        id,
        branch_id: data.branch_id || customer.branch_id || 'B001',
        customer_name: data.customer_name,
        adjustment_date: data.adjustment_date,
        adjustment_type: data.adjustment_type,
        amount,
        notes: data.notes || '',
        created_by: data.created_by || null
      });
      const delta = data.adjustment_type === 'DEBIT' ? amount : -amount;
      const newCredit = Math.max(0, Number(customer.credit || 0) + delta);
      db.prepare(`
        UPDATE customers
        SET credit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `).run(newCredit, data.customer_name);
      return { success: true, id, new_balance: newCredit };
    });
    return tx(payload);
  }

  static getOverdue(asOfDate: string) {
    const rows = this.getKhataCustomers() as any[];
    const today = new Date(asOfDate || new Date().toISOString().split('T')[0]);
    return rows.map((row) => {
      const dueDays = Number(row.due_days || 0);
      const baseDate = new Date(row.lastPayment || row.updated_at || row.created_at || asOfDate);
      const dueDate = new Date(baseDate.getTime() + Math.max(0, dueDays) * 86400000);
      const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
      const balance = Number(row.credit || 0);
      const bucket = overdueDays <= 30 ? '0-30' : overdueDays <= 60 ? '31-60' : overdueDays <= 90 ? '61-90' : '90+';
      return {
        customer_name: row.name,
        phone: row.phone,
        whatsapp: row.whatsapp || row.phone || '',
        due_date: dueDate.toISOString().split('T')[0],
        overdue_days: balance > 0 ? overdueDays : 0,
        balance,
        aging_bucket: balance > 0 ? bucket : 'Current'
      };
    }).filter((row) => row.balance > 0).sort((a, b) => b.overdue_days - a.overdue_days);
  }

  static getReminders(asOfDate: string) {
    const db = getDatabase();
    const overdue = this.getOverdue(asOfDate) as any[];
    return overdue.map((row) => {
      const notif = db.prepare(`
        SELECT status, created_at
        FROM notifications
        WHERE category='customers'
          AND (title LIKE '%' || @customer || '%' OR message LIKE '%' || @customer || '%')
        ORDER BY created_at DESC
        LIMIT 1
      `).get({ customer: row.customer_name }) as any;
      return {
        ...row,
        reminder_status: notif?.status || 'pending',
        reminder_last_at: notif?.created_at || null
      };
    });
  }

  static createOrIncrementCredit(name: string, creditChange: number, purchasesChange: number, paymentDate: string) {
    const db = getDatabase();
    
    // Check if customer exists first
    const customer = db.prepare('SELECT * FROM customers WHERE name = ?').get(name) as any;
    
    if (customer) {
      const stmt = db.prepare(`
        UPDATE customers 
        SET credit = credit + ?, totalPurchases = totalPurchases + ?, lastPayment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `);
      const info = stmt.run(creditChange, purchasesChange, paymentDate, name);
      return info.changes > 0;
    } else {
      const stmt = db.prepare(`
        INSERT INTO customers (name, tenant_id, branch_id, phone, totalPurchases, credit, lastPayment)
        VALUES (?, 'T001', 'B001', '0300-0000000', ?, ?, ?)
      `);
      const info = stmt.run(name, purchasesChange, creditChange, paymentDate);
      return info.changes > 0;
    }
  }

  static receivePayment(name: string, payAmt: number, paymentDate: string) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE customers 
      SET credit = MAX(0, credit - ?), lastPayment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `);
    const info = stmt.run(payAmt, paymentDate, name);
    return info.changes > 0;
  }
}
