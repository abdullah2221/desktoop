import { PriceRuleRepository } from './PriceRuleRepository';
import { DiscountRepository } from './DiscountRepository';
import { ProductRepository } from './ProductRepository';

export class DiscountCalculationService {
  /**
   * Applies active price rules and quantity tier rules to a list of items.
   * Returns items with a calculated `discount` field (representing total discount amount for that line).
   */
  static calculateLineDiscounts(
    items: any[],
    context: {
      customerId?: string;
      customerName?: string;
      branchId?: string;
      classId?: string;
      date?: string;
    } = {}
  ): any[] {
    const activeRules = PriceRuleRepository.getActiveRules(context.date);

    return items.map((item) => {
      // Find all rules that apply to this item or context
      const applicableRules = activeRules.filter((rule) => {
        // Min Qty check
        if (rule.min_qty > 0 && item.quantity < rule.min_qty) {
          return false;
        }

        // Target check based on rule type
        switch (rule.rule_type) {
          case 'product':
            return rule.target_id === item.product_id;
          case 'category':
            // Category can be matched by ID or category name
            return rule.target_id === item.category_id || rule.target_id === item.category_name || rule.target_id === item.category;
          case 'customer':
            return rule.target_id === context.customerId || rule.target_id === context.customerName;
          case 'branch':
            return rule.target_id === context.branchId;
          case 'class':
            return rule.target_id === context.classId;
          case 'quantity_tier':
            // If rule_type is purely a quantity tier, apply to all products if target_id is empty, or match product_id
            return !rule.target_id || rule.target_id === item.product_id;
          case 'date_range':
            // start/end dates are already checked in getActiveRules, so it applies to all or matching product_id
            return !rule.target_id || rule.target_id === item.product_id;
          default:
            return false;
        }
      });

      // Find the best rule (giving the maximum discount amount)
      let bestRuleDiscount = 0;
      let appliedRuleId: string | null = null;
      const lineSubtotal = item.quantity * item.price;

      applicableRules.forEach((rule) => {
        let discountAmt = 0;
        if (rule.discount_type === 'percentage') {
          discountAmt = lineSubtotal * (rule.value / 100);
        } else {
          // Fixed amount is typically per unit or per line. Let's treat it as total fixed discount for the line, capped at line total
          discountAmt = Math.min(rule.value, lineSubtotal);
        }

        if (discountAmt > bestRuleDiscount) {
          bestRuleDiscount = discountAmt;
          appliedRuleId = rule.id;
        }
      });

      // Item manual discount
      let manualDiscountAmt = 0;
      if (item.discount_type === 'percentage') {
        manualDiscountAmt = lineSubtotal * ((item.discount_value || 0) / 100);
      } else if (item.discount_type === 'fixed') {
        manualDiscountAmt = Math.min(item.discount_value || 0, lineSubtotal);
      } else if (typeof item.discount === 'number') {
        // Fallback to absolute discount amount
        manualDiscountAmt = Math.min(item.discount, lineSubtotal);
      }

      // Combine manually specified item-level discount and rule-based discount (capping at line subtotal)
      const totalLineDiscount = Math.min(bestRuleDiscount + manualDiscountAmt, lineSubtotal);

      return {
        ...item,
        discount: totalLineDiscount,
        applied_rule_id: appliedRuleId,
        line_total: lineSubtotal - totalLineDiscount
      };
    });
  }

  /**
   * Calculates invoice-level discount based on subtotal.
   * Capped at subtotal.
   */
  static calculateInvoiceDiscount(
    subtotal: number,
    discountType: 'fixed' | 'percentage',
    discountValue: number
  ): number {
    if (subtotal <= 0 || discountValue <= 0) return 0;

    let discountAmt = 0;
    if (discountType === 'percentage') {
      discountAmt = subtotal * (discountValue / 100);
    } else {
      discountAmt = discountValue;
    }

    return Math.min(Math.max(0, discountAmt), subtotal);
  }
}
