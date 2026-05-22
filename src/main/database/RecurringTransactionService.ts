import { AutomationRepository } from './repositories/AutomationRepository';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { InvoiceRepository } from './repositories/InvoiceRepository';
import { JournalRepository } from './repositories/JournalRepository';
import { PurchaseRepository } from './repositories/PurchaseRepository';
import { RecurringRepository, RecurringFrequency } from './repositories/RecurringRepository';
import { NotificationService } from './repositories/NotificationService';

type RunResult = {
  templateId: string;
  templateName: string;
  status: 'success' | 'failed' | 'skipped';
  createdTransactionType?: string;
  createdTransactionId?: string;
  errorMessage?: string;
};

function toDateOnly(value: string | Date = new Date()) {
  return new Date(value).toISOString().split('T')[0];
}

function addMonths(date: Date, months: number) {
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < day) date.setDate(0);
  return date;
}

export function calculateNextRunDate(runDate: string, frequency: RecurringFrequency) {
  const next = new Date(`${runDate}T00:00:00.000Z`);
  if (Number.isNaN(next.getTime())) throw new Error('Invalid run date.');

  if (frequency === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === 'monthly') addMonths(next, 1);
  if (frequency === 'quarterly') addMonths(next, 3);
  if (frequency === 'yearly') addMonths(next, 12);

  return next.toISOString().split('T')[0];
}

export class RecurringTransactionService {
  static runDue(runDate = toDateOnly()) {
    const dueTemplates = RecurringRepository.getDue(runDate);
    const results: RunResult[] = [];

    for (const template of dueTemplates) {
      if (RecurringRepository.hasSuccessfulRun(template.id, runDate)) {
        results.push({ templateId: template.id, templateName: template.name, status: 'skipped' });
        continue;
      }

      try {
        const created = this.createFromTemplate(template, runDate);
        RecurringRepository.logRun({
          template_id: template.id,
          run_date: runDate,
          status: 'success',
          created_transaction_type: created.type,
          created_transaction_id: created.id
        });
        RecurringRepository.advanceNextRunDate(template.id, calculateNextRunDate(runDate, template.frequency));
        results.push({
          templateId: template.id,
          templateName: template.name,
          status: 'success',
          createdTransactionType: created.type,
          createdTransactionId: created.id
        });
      } catch (error: any) {
        const message = error?.message || String(error);
        RecurringRepository.logRun({
          template_id: template.id,
          run_date: runDate,
          status: 'failed',
          error_message: message
        });
        NotificationService.createSystemAlert({
          type: 'system.automation_failed',
          severity: 'warning',
          title: `Automation failed: ${template.name}`,
          message,
          dedupeKey: `automation_failed:${template.id}:${runDate}`
        });
        results.push({
          templateId: template.id,
          templateName: template.name,
          status: 'failed',
          errorMessage: message
        });
      }
    }

    AutomationRepository.updateRules({ last_recurring_run_at: new Date().toISOString() });

    return {
      processed: results.length,
      success: results.filter((row) => row.status === 'success').length,
      failed: results.filter((row) => row.status === 'failed').length,
      skipped: results.filter((row) => row.status === 'skipped').length,
      results
    };
  }

  private static createFromTemplate(template: any, runDate: string) {
    const payload = template.payload || {};
    const branch_id = template.branch_id || payload.branch_id || 'B001';
    const class_id = template.class_id || payload.class_id || null;

    if (template.template_type === 'expense') {
      const id = payload.id || `REC-EXP-${template.id}-${runDate}`;
      const created = ExpenseRepository.create({
        ...payload,
        id,
        date: runDate,
        branch_id,
        class_id,
        status: payload.status || 'Paid'
      });
      if (!created) throw new Error('Recurring expense was not created.');
      return { type: 'expense', id };
    }

    if (template.template_type === 'journal') {
      const id = payload.id || `REC-JE-${template.id}-${runDate}`;
      const created = JournalRepository.createJournal({
        ...payload,
        id,
        entry_no: payload.entry_no || id,
        entry_date: runDate,
        branch_id,
        class_id,
        reference_type: 'RECURRING_JOURNAL',
        reference_id: template.id
      });
      return { type: 'journal', id: created.id };
    }

    if (template.template_type === 'purchase') {
      const id = payload.id || `REC-PUR-${template.id}-${runDate}`;
      const created = PurchaseRepository.create({
        ...payload,
        id,
        date: runDate,
        branch_id,
        class_id
      });
      return { type: 'purchase', id: created.id || id };
    }

    if (template.template_type === 'invoice') {
      const id = payload.id || `REC-INV-${template.id}-${runDate}`;
      const created = InvoiceRepository.create({
        ...payload,
        id,
        invoice_date: runDate,
        due_date: payload.due_date || runDate
      });
      return { type: 'invoice', id: created.id || id };
    }

    throw new Error(`Unsupported recurring template type: ${template.template_type}`);
  }
}
