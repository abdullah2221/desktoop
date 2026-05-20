export type TaxMode = 'inclusive' | 'exclusive';

export interface TaxCalculationInput {
  amount: number;
  rate: number;
  mode: TaxMode;
  rounding?: 'line' | 'document';
}

export interface TaxCalculationOutput {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

export class TaxCalculationService {
  static calculate(input: TaxCalculationInput): TaxCalculationOutput {
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

  static calculateCompound(amount: number, taxes: Array<{ rate: number; mode: TaxMode }>): TaxCalculationOutput {
    let runningNet = amount;
    let taxTotal = 0;

    for (const tax of taxes) {
      const result = this.calculate({ amount: runningNet, rate: tax.rate, mode: tax.mode });
      if (tax.mode === 'exclusive') {
        taxTotal += result.taxAmount;
        runningNet = result.grossAmount;
      } else {
        taxTotal += result.taxAmount;
      }
    }

    return {
      netAmount: this.round(amount),
      taxAmount: this.round(taxTotal),
      grossAmount: this.round(amount + taxTotal)
    };
  }

  private static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
