import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { getDatabase } from '../connection';
import { ImportExportRepository } from './ImportExportRepository';

export interface ImportPreviewResult {
  jobId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewRows: Array<{
    rowNumber: number;
    isValid: boolean;
    errors: string[];
    data: any;
  }>;
}

export class ImportExportService {
  /**
   * Generates a template as a buffer.
   */
  static getTemplate(entityType: string, format: 'csv' | 'xlsx'): Buffer {
    let headers: string[] = [];
    let sampleData: any[] = [];

    switch (entityType) {
      case 'products':
        headers = [
          'sku', 'barcode', 'name', 'category', 'supplier', 'brand', 'unit',
          'cost', 'price', 'wholesale_price', 'retail_price', 'stock',
          'min_stock_alert', 'rack_location', 'expiry_date', 'batch_number', 'status'
        ];
        sampleData = [
          {
            sku: 'SKU-001', barcode: '123456789012', name: 'Premium Basmati Rice 5kg',
            category: 'Grains', supplier: 'Al-Rehman Traders', brand: 'National Foods',
            unit: 'kg', cost: 850, price: 950, wholesale_price: 900, retail_price: 950,
            stock: 100, min_stock_alert: 15, rack_location: 'Shelf B-2',
            expiry_date: '2027-12-31', batch_number: 'BATCH-2026-A', status: 'active'
          }
        ];
        break;
      case 'customers':
        headers = ['name', 'phone', 'credit', 'totalPurchases', 'lastPayment'];
        sampleData = [
          { name: 'Muhammad Ali', phone: '03001234567', credit: 2500, totalPurchases: 15000, lastPayment: '2026-05-15' }
        ];
        break;
      case 'suppliers':
        headers = ['name', 'phone', 'email', 'address', 'city', 'ntn', 'opening_balance'];
        sampleData = [
          { name: 'Bilal Foods Lahore', phone: '04237654321', email: 'sales@bilalfoods.com', address: '12-A G.T Road', city: 'Lahore', ntn: '1234567-9', opening_balance: 50000 }
        ];
        break;
      case 'opening_stock':
        headers = ['sku', 'stock_quantity', 'purchase_cost', 'branch_id'];
        sampleData = [
          { sku: 'SKU-001', stock_quantity: 50, purchase_cost: 850, branch_id: 'B001' }
        ];
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    if (format === 'csv') {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      return Buffer.from(csvContent, 'utf-8');
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return buffer as Buffer;
    }
  }

  /**
   * Parses uploaded import file and performs visual validation.
   */
  static async previewImport(filePath: string, entityType: string): Promise<ImportPreviewResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws) as any[];

    const db = getDatabase();
    
    // Create pre-import job
    const jobId = ImportExportRepository.createImportJob({
      entity_type: entityType,
      file_name: path.basename(filePath),
      status: 'pending',
      total_rows: rawRows.length
    });

    const previewRows: ImportPreviewResult['previewRows'] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Track duplicate SKUs or Names in this spreadsheet session to catch inter-sheet duplicates
    const uniqueSheetKeys = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // Excel row numbering start from 2 (excluding header)
      const errors: string[] = [];

      // Validate based on entity rules
      if (entityType === 'products') {
        const sku = row.sku ? String(row.sku).trim() : '';
        const name = row.name ? String(row.name).trim() : '';

        if (!sku) {
          errors.push('SKU is required');
        } else {
          // Unique SKU check in spreadsheet
          if (uniqueSheetKeys.has(sku)) {
            errors.push(`Duplicate SKU '${sku}' in this spreadsheet`);
          } else {
            uniqueSheetKeys.add(sku);
          }

          // Duplicate SKU check in DB
          const exists = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
          if (exists) {
            errors.push(`SKU '${sku}' already exists in database`);
          }
        }

        if (!name) {
          errors.push('Product name is required');
        }

        if (row.cost !== undefined && isNaN(Number(row.cost))) {
          errors.push('Purchase cost must be a numeric value');
        }
        if (row.price !== undefined && isNaN(Number(row.price))) {
          errors.push('Sale price must be a numeric value');
        }
        if (row.stock !== undefined && isNaN(Number(row.stock))) {
          errors.push('Stock quantity must be an integer');
        }

      } else if (entityType === 'customers') {
        const name = row.name ? String(row.name).trim() : '';
        const phone = row.phone ? String(row.phone).trim() : '';

        if (!name) {
          errors.push('Customer Name is required');
        } else {
          if (uniqueSheetKeys.has(name)) {
            errors.push(`Duplicate Customer Name '${name}' in this spreadsheet`);
          } else {
            uniqueSheetKeys.add(name);
          }

          const exists = db.prepare('SELECT name FROM customers WHERE name = ?').get(name);
          if (exists) {
            errors.push(`Customer '${name}' already exists in database`);
          }
        }

        if (!phone) {
          errors.push('Phone number is required');
        }

      } else if (entityType === 'suppliers') {
        const name = row.name ? String(row.name).trim() : '';

        if (!name) {
          errors.push('Supplier Name is required');
        } else {
          if (uniqueSheetKeys.has(name)) {
            errors.push(`Duplicate Supplier Name '${name}' in this spreadsheet`);
          } else {
            uniqueSheetKeys.add(name);
          }

          const exists = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name);
          if (exists) {
            errors.push(`Supplier '${name}' already exists in database`);
          }
        }

      } else if (entityType === 'opening_stock') {
        const sku = row.sku ? String(row.sku).trim() : '';
        const qty = Number(row.stock_quantity);
        const cost = Number(row.purchase_cost);
        const branchId = row.branch_id ? String(row.branch_id).trim() : '';

        if (!sku) {
          errors.push('SKU is required');
        } else {
          const product = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
          if (!product) {
            errors.push(`SKU '${sku}' does not exist in product catalog`);
          }
        }

        if (isNaN(qty) || qty <= 0) {
          errors.push('Stock quantity must be a positive number');
        }
        if (isNaN(cost) || cost < 0) {
          errors.push('Purchase cost must be a non-negative number');
        }
        if (!branchId) {
          errors.push('Branch ID is required');
        } else {
          const branch = db.prepare('SELECT id FROM branches WHERE id = ?').get(branchId);
          if (!branch) {
            errors.push(`Branch ID '${branchId}' does not exist`);
          }
        }
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      previewRows.push({
        rowNumber,
        isValid,
        errors,
        data: row
      });
    }

    // Update job details
    ImportExportRepository.updateImportJob(jobId, {
      total_rows: rawRows.length,
      failed_rows: invalidCount
    });

    return {
      jobId,
      totalRows: rawRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      previewRows
    };
  }

  /**
   * Commits the previewed import rows inside a single database transaction.
   * If atomic rollback is true, rolls back if ANY invalid row exists.
   * If false, imports valid rows and logs failing rows.
   */
  static commitImport(jobId: string, previewRows: ImportPreviewResult['previewRows'], atomic: boolean = true): { success: boolean; processed: number; failed: number } {
    const db = getDatabase();
    
    const invalidRows = previewRows.filter(r => !r.isValid);
    if (atomic && invalidRows.length > 0) {
      // Mark job as failed immediately due to atomic setup
      ImportExportRepository.updateImportJob(jobId, {
        status: 'failed',
        failed_rows: previewRows.length
      });

      // Bulk write errors
      const jobErrors = invalidRows.map(r => ({
        job_id: jobId,
        row_number: r.rowNumber,
        error_message: r.errors.join('; '),
        row_data: JSON.stringify(r.data)
      }));
      ImportExportRepository.createImportJobErrors(jobErrors);

      return { success: false, processed: 0, failed: previewRows.length };
    }

    // Set job as processing
    ImportExportRepository.updateImportJob(jobId, { status: 'processing' });

    let processedCount = 0;
    let failedCount = 0;
    const errorsToLog: any[] = [];

    // Helper functions for entity resolution
    const resolveCategory = (name: string): string => {
      const catName = name ? name.trim() : 'General';
      let row = db.prepare('SELECT id FROM categories WHERE name = ?').get(catName) as any;
      if (row) return row.id;
      const id = `CAT-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)').run(id, catName, 'Imported automatically');
      return id;
    };

    const resolveSupplier = (name: string): string => {
      const supName = name ? name.trim() : 'General Supplier';
      let row = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(supName) as any;
      if (row) return row.id;
      const id = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare("INSERT INTO suppliers (id, tenant_id, name, phone) VALUES (?, 'T001', ?, '0300-0000000')").run(id, supName);
      return id;
    };

    const resolveBrand = (name: string): string => {
      const brandName = name ? name.trim() : 'Generic';
      let row = db.prepare('SELECT id FROM brands WHERE name = ?').get(brandName) as any;
      if (row) return row.id;
      const id = `BRD-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare("INSERT INTO brands (id, tenant_id, name) VALUES (?, 'T001', ?)").run(id, brandName);
      return id;
    };

    const resolveUnit = (name: string): string => {
      const unitName = name ? name.trim() : 'pcs';
      let row = db.prepare('SELECT id FROM units WHERE name = ?').get(unitName) as any;
      if (row) return row.id;
      const id = `UNT-${Math.floor(1000 + Math.random() * 9000)}`;
      db.prepare("INSERT INTO units (id, tenant_id, name, abbreviation) VALUES (?, 'T001', ?, ?)").run(id, unitName, unitName.substring(0, 3));
      return id;
    };

    // Execute SQLite transaction
    const transaction = db.transaction(() => {
      // Get the job entity type
      const job = db.prepare('SELECT entity_type FROM import_jobs WHERE id = ?').get(jobId) as any;
      if (!job) throw new Error(`Import job not found: ${jobId}`);
      const entityType = job.entity_type;

      for (const row of previewRows) {
        if (!row.isValid) {
          failedCount++;
          errorsToLog.push({
            job_id: jobId,
            row_number: row.rowNumber,
            error_message: row.errors.join('; '),
            row_data: JSON.stringify(row.data)
          });
          continue;
        }

        try {
          if (entityType === 'products') {
            const data = row.data;
            const pId = `P-${Math.floor(100000 + Math.random() * 900000)}`;
            const catId = resolveCategory(data.category);
            const supId = resolveSupplier(data.supplier);
            const brandId = resolveBrand(data.brand);
            const unitId = resolveUnit(data.unit);

            db.prepare(`
              INSERT INTO products (
                id, tenant_id, branch_id, sku, barcode, name, category_id, category, 
                supplier_id, brand_id, unit_id, cost, price, wholesale_price, retail_price, 
                stock, opening_stock, min_stock_alert, rack_location, expiry_date, batch_number, status
              ) VALUES (
                ?, 'T001', 'B001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              )
            `).run(
              pId,
              String(data.sku || pId).trim(),
              String(data.barcode || '').trim(),
              String(data.name).trim(),
              catId,
              String(data.category || 'General').trim(),
              supId,
              brandId,
              unitId,
              Number(data.cost || 0),
              Number(data.price || 0),
              Number(data.wholesale_price || data.price || 0),
              Number(data.retail_price || data.price || 0),
              Number(data.stock || 0),
              Number(data.stock || 0),
              Number(data.min_stock_alert || 0),
              String(data.rack_location || '').trim(),
              data.expiry_date || null,
              String(data.batch_number || '').trim(),
              String(data.status || 'active').trim()
            );

            // Populate branch inventory for this product
            db.prepare(`
              INSERT INTO branch_inventory (branch_id, product_id, quantity_on_hand, average_cost)
              VALUES ('B001', ?, ?, ?)
            `).run(pId, Number(data.stock || 0), Number(data.cost || 0));

          } else if (entityType === 'customers') {
            const data = row.data;
            db.prepare(`
              INSERT INTO customers (name, tenant_id, branch_id, phone, totalPurchases, credit, lastPayment)
              VALUES (?, 'T001', 'B001', ?, ?, ?, ?)
            `).run(
              String(data.name).trim(),
              String(data.phone || '0300-0000000').trim(),
              Number(data.totalPurchases || 0),
              Number(data.credit || 0),
              String(data.lastPayment || new Date().toISOString().split('T')[0]).trim()
            );

          } else if (entityType === 'suppliers') {
            const data = row.data;
            const sId = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
            db.prepare(`
              INSERT INTO suppliers (id, tenant_id, name, phone, email, address, city, ntn, opening_balance, current_balance, status)
              VALUES (?, 'T001', ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `).run(
              sId,
              String(data.name).trim(),
              String(data.phone || '').trim(),
              String(data.email || '').trim(),
              String(data.address || '').trim(),
              String(data.city || '').trim(),
              String(data.ntn || '').trim(),
              Number(data.opening_balance || 0),
              Number(data.opening_balance || 0)
            );

          } else if (entityType === 'opening_stock') {
            const data = row.data;
            const sku = String(data.sku).trim();
            const qty = Number(data.stock_quantity);
            const cost = Number(data.purchase_cost);
            const bId = String(data.branch_id).trim();

            const product = db.prepare('SELECT id, stock FROM products WHERE sku = ?').get(sku) as any;
            if (!product) throw new Error(`Product SKU not found: ${sku}`);

            // Update main product table
            db.prepare('UPDATE products SET stock = stock + ?, cost = ? WHERE id = ?').run(qty, cost, product.id);

            // Update Branch Inventory
            const prevBranchInv = db.prepare('SELECT quantity_on_hand FROM branch_inventory WHERE branch_id = ? AND product_id = ?').get(bId, product.id) as any;
            const prevQty = prevBranchInv ? Number(prevBranchInv.quantity_on_hand) : 0;

            db.prepare(`
              INSERT INTO branch_inventory (branch_id, product_id, quantity_on_hand, average_cost)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(branch_id, product_id) DO UPDATE SET
                quantity_on_hand = quantity_on_hand + excluded.quantity_on_hand,
                average_cost = excluded.average_cost
            `).run(bId, product.id, qty, cost);

            // Record stock movement
            const mId = `MOV-${Math.floor(100000 + Math.random() * 900000)}`;
            db.prepare(`
              INSERT INTO stock_movements (
                id, tenant_id, branch_id, product_id, movement_type, 
                quantity_in, quantity_out, reference_type, reference_id, 
                previous_stock, new_stock, date, notes
              ) VALUES (
                ?, 'T001', ?, ?, 'OPENING_STOCK', 
                ?, 0, 'IMPORT', 'DATA_SYNC', 
                ?, ?, ?, 'Opening stock import via data sync'
              )
            `).run(mId, bId, product.id, qty, prevQty, prevQty + qty, new Date().toISOString().split('T')[0]);
          }

          processedCount++;
        } catch (err: any) {
          failedCount++;
          errorsToLog.push({
            job_id: jobId,
            row_number: row.rowNumber,
            error_message: err.message || String(err),
            row_data: JSON.stringify(row.data)
          });
          // In atomic mode, we want to roll back the transaction!
          if (atomic) {
            throw err; // will trigger database auto rollback
          }
        }
      }
    });

    try {
      transaction();
      
      const finalStatus = failedCount > 0 ? (processedCount > 0 ? 'completed' : 'failed') : 'completed';
      
      ImportExportRepository.updateImportJob(jobId, {
        status: finalStatus,
        processed_rows: processedCount,
        failed_rows: failedCount
      });

      if (errorsToLog.length > 0) {
        ImportExportRepository.createImportJobErrors(errorsToLog);
      }

      return { success: finalStatus === 'completed', processed: processedCount, failed: failedCount };
    } catch (txErr) {
      // Transaction rolled back completely due to error
      ImportExportRepository.updateImportJob(jobId, {
        status: 'failed',
        failed_rows: previewRows.length
      });

      if (errorsToLog.length > 0) {
        ImportExportRepository.createImportJobErrors(errorsToLog);
      }

      return { success: false, processed: 0, failed: previewRows.length };
    }
  }

  /**
   * Exports dataset based on filter settings and writes as CSV/XLSX.
   */
  static exportData(entityType: string, format: 'csv' | 'xlsx', exportPath: string): string {
    const db = getDatabase();
    let data: any[] = [];
    let headers: string[] = [];

    // Log the export job
    const jobId = ImportExportRepository.createExportJob({
      entity_type: entityType,
      format,
      file_path: exportPath,
      status: 'pending'
    });

    try {
      switch (entityType) {
        case 'products':
          headers = ['id', 'sku', 'barcode', 'name', 'category', 'stock', 'cost', 'price', 'wholesale_price', 'retail_price', 'min_stock_alert', 'expiry_date', 'batch_number', 'rack_location', 'status'];
          data = db.prepare('SELECT id, sku, barcode, name, category, stock, cost, price, wholesale_price, retail_price, min_stock_alert, expiry_date, batch_number, rack_location, status FROM products ORDER BY name ASC').all();
          break;

        case 'customers':
          headers = ['name', 'phone', 'totalPurchases', 'credit', 'lastPayment'];
          data = db.prepare('SELECT name, phone, totalPurchases, credit, lastPayment FROM customers ORDER BY name ASC').all();
          break;

        case 'suppliers':
          headers = ['id', 'name', 'phone', 'email', 'address', 'city', 'ntn', 'opening_balance', 'current_balance', 'status'];
          data = db.prepare('SELECT id, name, phone, email, address, city, ntn, opening_balance, current_balance, status FROM suppliers ORDER BY name ASC').all();
          break;

        case 'sales':
          headers = ['invoiceNo', 'customerName', 'date', 'total', 'status', 'discount', 'tax_rate', 'tax_amount'];
          data = db.prepare('SELECT invoiceNo, customerName, date, total, status, discount, tax_rate, tax_amount FROM sales ORDER BY date DESC').all();
          break;

        case 'purchases':
          headers = ['id', 'date', 'total', 'status', 'payment_status', 'discount', 'tax', 'grand_total', 'amount_paid', 'remaining_payable'];
          data = db.prepare('SELECT id, date, total, status, payment_status, discount, tax, grand_total, amount_paid, remaining_payable FROM purchases ORDER BY date DESC').all();
          break;

        case 'inventory_valuation':
          headers = ['id', 'sku', 'name', 'category', 'stock', 'cost', 'valuation'];
          data = db.prepare('SELECT id, sku, name, category, stock, cost, (stock * cost) AS valuation FROM products WHERE status = "active" ORDER BY name ASC').all();
          break;

        case 'reports':
          // Aggregate a visual profit and loss summary report for export
          headers = ['Metric', 'Value'];
          const totalSales = (db.prepare("SELECT SUM(total) as sum FROM sales").get() as any).sum || 0;
          const totalPurchases = (db.prepare("SELECT SUM(grand_total) as sum FROM purchases").get() as any).sum || 0;
          const totalExpenses = (db.prepare("SELECT SUM(amount) as sum FROM expenses").get() as any).sum || 0;
          data = [
            { Metric: 'Total Revenue / Sales', Value: totalSales },
            { Metric: 'Total Purchase Outflow', Value: totalPurchases },
            { Metric: 'Total Operating Expenses', Value: totalExpenses },
            { Metric: 'Estimated Net Cash Profit', Value: (totalSales - totalExpenses - totalPurchases) }
          ];
          break;

        default:
          throw new Error(`Unsupported export entity: ${entityType}`);
      }

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Export');

      if (format === 'csv') {
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        fs.writeFileSync(exportPath, csvContent, 'utf-8');
      } else {
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(exportPath, buffer);
      }

      ImportExportRepository.updateExportJob(jobId, { status: 'completed' });
      return jobId;
    } catch (err: any) {
      ImportExportRepository.updateExportJob(jobId, { status: 'failed' });
      throw err;
    }
  }
}
