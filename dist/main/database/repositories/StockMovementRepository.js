"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMovementRepository = void 0;
const connection_1 = require("../connection");
class StockMovementRepository {
    static getByProduct(productId) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT *
      FROM stock_movements
      WHERE product_id = ?
      ORDER BY created_at DESC
    `).all(productId);
    }
}
exports.StockMovementRepository = StockMovementRepository;
