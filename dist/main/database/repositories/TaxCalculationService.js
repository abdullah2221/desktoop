"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxCalculationService = void 0;
class TaxCalculationService {
    static calculate(input) {
        const amount = Number(input.amount) || 0;
        const rate = Number(input.rate) || 0;
        const mode = input.mode;
        if (mode === 'inclusive') {
            const divisor = 1 + (rate / 100);
            const netAmount = divisor === 0 ? amount : amount / divisor;
            const taxAmount = amount - netAmount;
            return {
                netAmount: this.round(netAmount),
                taxAmount: this.round(taxAmount),
                grossAmount: this.round(amount)
            };
        }
        const taxAmount = amount * (rate / 100);
        return {
            netAmount: this.round(amount),
            taxAmount: this.round(taxAmount),
            grossAmount: this.round(amount + taxAmount)
        };
    }
    static calculateCompound(amount, taxes) {
        let runningNet = amount;
        let taxTotal = 0;
        for (const tax of taxes) {
            const result = this.calculate({ amount: runningNet, rate: tax.rate, mode: tax.mode });
            if (tax.mode === 'exclusive') {
                taxTotal += result.taxAmount;
                runningNet = result.grossAmount;
            }
            else {
                taxTotal += result.taxAmount;
            }
        }
        return {
            netAmount: this.round(amount),
            taxAmount: this.round(taxTotal),
            grossAmount: this.round(amount + taxTotal)
        };
    }
    static round(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
}
exports.TaxCalculationService = TaxCalculationService;
