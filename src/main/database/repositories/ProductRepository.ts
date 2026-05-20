import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class ProductRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.*,
        p.cost as purchase_cost,
        p.price as sale_price,
        p.stock as stock_quantity,
        c.name as category_name,
        s.name as supplier_name,
        u.name as unit_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ORDER BY p.name ASC
    `).all();
  }

  static getById(id: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.*,
        p.cost as purchase_cost,
        p.price as sale_price,
        p.stock as stock_quantity,
        c.name as category_name,
        s.name as supplier_name,
        u.name as unit_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = ?
    `).get(id);
  }

  static getLowStock() {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        p.*,
        p.cost as purchase_cost,
        p.price as sale_price,
        p.stock as stock_quantity,
        c.name as category_name,
        s.name as supplier_name,
        u.name as unit_name,
        b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.stock <= p.min_stock_alert AND p.status = 'active'
      ORDER BY p.name ASC
    `).all();
  }

  static create(product: any) {
    try {
      console.log('[ProductRepository] Attempting SQLite insert for product payload:', product);
      const db = getDatabase();
      const id = product.id || `P-${Math.floor(1000 + Math.random() * 9000)}`;

      const stmt = db.prepare(`
        INSERT INTO products (
          id, tenant_id, branch_id, sku, barcode, name, category_id, category, supplier_id, 
          brand_id, unit_id, cost, price, wholesale_price, retail_price, 
          stock, opening_stock, min_stock_alert, rack_location, 
          expiry_date, batch_number, status
        )
        VALUES (
          @id, 'T001', 'B001', @sku, @barcode, @name, @category_id, @category_name, @supplier_id,
          @brand_id, @unit_id, @purchase_cost, @sale_price, @wholesale_price, @retail_price,
          @stock_quantity, @opening_stock, @minimum_stock, @rack_location,
          @expiry_date, @batch_number, @status
        )
      `);

      const info = stmt.run({
        id,
        sku: product.sku || id,
        barcode: product.barcode || '',
        name: product.name,
        category_id: product.category_id || null,
        category_name: product.category_name || '',
        supplier_id: product.supplier_id || null,
        brand_id: product.brand_id || null,
        unit_id: product.unit_id || null,
        purchase_cost: product.purchase_cost || 0,
        sale_price: product.sale_price || 0,
        wholesale_price: product.wholesale_price || 0,
        retail_price: product.retail_price || 0,
        stock_quantity: product.stock_quantity || 0,
        opening_stock: product.stock_quantity || 0,
        minimum_stock: product.minimum_stock || 0,
        rack_location: product.rack_location || '',
        expiry_date: product.expiry_date || null,
        batch_number: product.batch_number || '',
        status: product.status || 'active'
      });

      console.log('[ProductRepository] Product successfully inserted into SQLite. Changes:', info.changes);
      if (info.changes > 0) {
        AuditLogRepository.write({ action: 'PRODUCT_CREATE', details: `Product ${id} created` });
      }
      return info.changes > 0 ? { success: true, id } : { success: false };
    } catch (err: any) {
      console.error('[ProductRepository] SQLite insert failed critically:', err.message || err);
      throw err;
    }
  }

  static update(product: any) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE products 
      SET 
        sku = @sku,
        barcode = @barcode,
        name = @name, 
        category_id = @category_id,
        category = @category_name,
        supplier_id = @supplier_id,
        brand_id = @brand_id,
        unit_id = @unit_id,
        cost = @purchase_cost, 
        price = @sale_price,
        wholesale_price = @wholesale_price,
        retail_price = @retail_price,
        stock = @stock_quantity, 
        min_stock_alert = @minimum_stock,
        rack_location = @rack_location,
        expiry_date = @expiry_date,
        batch_number = @batch_number,
        status = @status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    const info = stmt.run({
      id: product.id,
      sku: product.sku || product.id,
      barcode: product.barcode || '',
      name: product.name,
      category_id: product.category_id || null,
      category_name: product.category_name || '',
      supplier_id: product.supplier_id || null,
      brand_id: product.brand_id || null,
      unit_id: product.unit_id || null,
      purchase_cost: product.purchase_cost || 0,
      sale_price: product.sale_price || 0,
      wholesale_price: product.wholesale_price || 0,
      retail_price: product.retail_price || 0,
      stock_quantity: product.stock_quantity || 0,
      minimum_stock: product.minimum_stock || 0,
      rack_location: product.rack_location || '',
      expiry_date: product.expiry_date || null,
      batch_number: product.batch_number || '',
      status: product.status || 'active'
    });
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRODUCT_UPDATE', details: `Product ${product.id} updated` });
    }
    return info.changes > 0;
  }

  static deactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE products SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRODUCT_DEACTIVATE', details: `Product ${id} deactivated` });
    }
    return info.changes > 0;
  }

  static updateStock(id: string, newStock: number) {
    const db = getDatabase();
    const info = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
    return info.changes > 0;
  }
}
