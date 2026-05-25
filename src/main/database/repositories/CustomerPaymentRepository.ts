import { CustomerRepository } from './CustomerRepository';

export class CustomerPaymentRepository {
  static record(payload: {
    customer_name: string;
    payment_date: string;
    amount: number;
    payment_method: 'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash' | 'Card' | 'Cheque';
    reference_no?: string;
    notes?: string;
    branch_id?: string;
    created_by?: string;
  }) {
    return CustomerRepository.recordPayment(payload);
  }
}
