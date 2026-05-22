import { ipcMain } from 'electron';
import { RecurringTransactionService } from '../RecurringTransactionService';
import { AuthRepository } from '../repositories/AuthRepository';
import { AutomationRepository } from '../repositories/AutomationRepository';
import { RecurringRepository } from '../repositories/RecurringRepository';

function actorId(token: string) {
  return AuthRepository.getCurrentUser(token)?.id;
}

function requireAutomationManage(token: string) {
  AuthRepository.requirePermission(token, 'automation.manage');
}

function requirePayloadBranchAccess(token: string, payload: any) {
  if (payload?.branch_id) AuthRepository.requireBranchAccess(token, payload.branch_id);
}

export function registerRecurringHandlers() {
  ipcMain.handle('recurring:getTemplates', (_, token: string) => {
    requireAutomationManage(token);
    return RecurringRepository.getAll();
  });
  ipcMain.handle('recurring:getTemplateById', (_, token: string, id: string) => {
    requireAutomationManage(token);
    return RecurringRepository.getById(id);
  });
  ipcMain.handle('recurring:createTemplate', (_, token: string, payload: any) => {
    requireAutomationManage(token);
    requirePayloadBranchAccess(token, payload);
    return RecurringRepository.create(payload, actorId(token));
  });
  ipcMain.handle('recurring:updateTemplate', (_, token: string, payload: any) => {
    requireAutomationManage(token);
    requirePayloadBranchAccess(token, payload);
    return RecurringRepository.update(payload, actorId(token));
  });
  ipcMain.handle('recurring:deactivateTemplate', (_, token: string, id: string) => {
    requireAutomationManage(token);
    return RecurringRepository.deactivate(id, actorId(token));
  });
  ipcMain.handle('recurring:getRuns', (_, token: string, templateId?: string) => {
    requireAutomationManage(token);
    return RecurringRepository.getRuns(templateId);
  });
  ipcMain.handle('recurring:runDue', (_, token: string, runDate?: string) => {
    requireAutomationManage(token);
    return RecurringTransactionService.runDue(runDate);
  });
  ipcMain.handle('automation:getRules', (_, token: string) => {
    requireAutomationManage(token);
    return AutomationRepository.getRules();
  });
  ipcMain.handle('automation:updateRules', (_, token: string, settings: Record<string, string>) => {
    requireAutomationManage(token);
    return AutomationRepository.updateRules(settings);
  });
}
