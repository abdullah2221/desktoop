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

  static getByBarcode(barcode: string) {
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
      WHERE p.barcode = ? AND p.status = 'active'
    `).get(barcode);
  }

  static searchByBarcodeOrSku(query: string) {
    const db = getDatabase();
    const cleanQuery = `%${query}%`;
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
      WHERE (p.barcode = ? OR p.sku = ? OR p.name LIKE ?) AND p.status = 'active'
      ORDER BY p.name ASC
      LIMIT 20
    `).all(query, query, cleanQuery);
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
      const db = getDatabase();
      const id = product.id || `P-${Math.floor(1000 + Math.random() * 9000)}`;
      const sku = String(product.sku || id).trim();
      const barcode = String(product.barcode || '').trim();
      const name = String(product.name || '').trim();
      const purchaseCost = Number(product.purchase_cost || 0);
      const salePrice = Number(product.sale_price || 0);
      const stockQty = Number(product.stock_quantity || 0);
      const minStock = Number(product.minimum_stock || 0);

      if (!sku) throw new Error('SKU is required.');
      if (!name) throw new Error('Product name is required.');
      if (purchaseCost < 0) throw new Error('Purchase cost cannot be negative.');
      if (salePrice < 0) throw new Error('Sale price cannot be negative.');
      if (stockQty < 0) throw new Error('Stock quantity cannot be negative.');
      if (minStock < 0) throw new Error('Minimum stock cannot be negative.');

      const skuExists = db.prepare('SELECT id FROM products WHERE lower(sku)=lower(?) LIMIT 1').get(sku) as { id: string } | undefined;
      if (skuExists) throw new Error('Duplicate SKU is not allowed.');
      if (barcode) {
        const barcodeExists = db.prepare('SELECT id FROM products WHERE barcode=? LIMIT 1').get(barcode) as { id: string } | undefined;
        if (barcodeExists) throw new Error('Duplicate barcode is not allowed.');
      }

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
        sku,
        barcode,
        name,
        category_id: product.category_id || null,
        category_name: product.category_name || '',
        supplier_id: product.supplier_id || null,
        brand_id: product.brand_id || null,
        unit_id: product.unit_id || null,
        purchase_cost: purchaseCost,
        sale_price: salePrice,
        wholesale_price: product.wholesale_price || 0,
        retail_price: product.retail_price || 0,
        stock_quantity: stockQty,
        opening_stock: stockQty,
        minimum_stock: minStock,
        rack_location: product.rack_location || '',
        expiry_date: product.expiry_date || null,
        batch_number: product.batch_number || '',
        status: product.status || 'active'
      });

      if (info.changes > 0) {
        AuditLogRepository.write({ action: 'PRODUCT_CREATE', details: `Product ${id} created` });
      }
      return info.changes > 0 ? { success: true, id } : { success: false };
    } catch (err: any) {
      throw err;
    }
  }

  static update(product: any) {
    const db = getDatabase();
    const sku = String(product.sku || product.id || '').trim();
    const barcode = String(product.barcode || '').trim();
    const name = String(product.name || '').trim();
    const purchaseCost = Number(product.purchase_cost || 0);
    const salePrice = Number(product.sale_price || 0);
    const stockQty = Number(product.stock_quantity || 0);
    const minStock = Number(product.minimum_stock || 0);

    if (!product.id) throw new Error('Product id is required.');
    if (!sku) throw new Error('SKU is required.');
    if (!name) throw new Error('Product name is required.');
    if (purchaseCost < 0) throw new Error('Purchase cost cannot be negative.');
    if (salePrice < 0) throw new Error('Sale price cannot be negative.');
    if (stockQty < 0) throw new Error('Stock quantity cannot be negative.');
    if (minStock < 0) throw new Error('Minimum stock cannot be negative.');

    const skuExists = db.prepare('SELECT id FROM products WHERE lower(sku)=lower(?) AND id<>? LIMIT 1').get(sku, product.id) as { id: string } | undefined;
    if (skuExists) throw new Error('Duplicate SKU is not allowed.');
    if (barcode) {
      const barcodeExists = db.prepare('SELECT id FROM products WHERE barcode=? AND id<>? LIMIT 1').get(barcode, product.id) as { id: string } | undefined;
      if (barcodeExists) throw new Error('Duplicate barcode is not allowed.');
    }

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
      sku,
      barcode,
      name,
      category_id: product.category_id || null,
      category_name: product.category_name || '',
      supplier_id: product.supplier_id || null,
      brand_id: product.brand_id || null,
      unit_id: product.unit_id || null,
      purchase_cost: purchaseCost,
      sale_price: salePrice,
      wholesale_price: product.wholesale_price || 0,
      retail_price: product.retail_price || 0,
      stock_quantity: stockQty,
      minimum_stock: minStock,
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

  static reactivate(id: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE products SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    if (info.changes > 0) {
      AuditLogRepository.write({ action: 'PRODUCT_REACTIVATE', details: `Product ${id} reactivated` });
    }
    return info.changes > 0;
  }

  static updateStock(id: string, newStock: number) {
    const db = getDatabase();
    if (Number(newStock) < 0) throw new Error('Stock cannot be negative.');
    const info = db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
    return info.changes > 0;
  }

  static getStockMovements(productId: string, filters: { branch_id?: string; date_from?: string; date_to?: string; movement_type?: string } = {}) {
    const db = getDatabase();
    return db.prepare(`
      SELECT *
      FROM stock_movements
      WHERE product_id = @product_id
        AND (@branch_id IS NULL OR branch_id=@branch_id)
        AND (@date_from IS NULL OR date >= @date_from)
        AND (@date_to IS NULL OR date <= @date_to)
        AND (@movement_type IS NULL OR movement_type=@movement_type)
      ORDER BY date DESC, created_at DESC
    `).all({
      product_id: productId,
      branch_id: filters.branch_id || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      movement_type: filters.movement_type || null
    });
  }

  static getBranchStock(productId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        bi.*,
        b.branch_code,
        COALESCE(b.branch_name, b.name) as branch_name,
        (bi.quantity_on_hand - bi.quantity_reserved) as available_quantity
      FROM branch_inventory bi
      JOIN branches b ON b.id = bi.branch_id
      WHERE bi.product_id=?
      ORDER BY b.branch_code ASC
    `).all(productId);
  }

  static getAuditTrail(productId: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, action, details, created_at, user_id
      FROM audit_logs
      WHERE details LIKE '%' || ? || '%'
      ORDER BY created_at DESC
      LIMIT 100
    `).all(productId);
  }
}
