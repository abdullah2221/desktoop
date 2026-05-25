import { CustomerRepository } from './CustomerRepository';

export class CustomerStatementService {
  static getStatement(customerName: string) {
    return CustomerRepository.getStatement(customerName);
  }

  static getOverdue(asOfDate: string) {
    return CustomerRepository.getOverdue(asOfDate);
  }

  static getReminders(asOfDate: string) {
    return CustomerRepository.getReminders(asOfDate);
  }
}
