import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationRuleRepository } from '../repositories/NotificationRuleRepository';
import { NotificationService } from '../repositories/NotificationService';

function actor(token: string) {
  return AuthRepository.getCurrentUser(token);
}

export function registerNotificationHandlers() {
  ipcMain.handle('notifications:getAll', (_, token: string, tab?: string) => {
    AuthRepository.requirePermission(token, 'notifications.view');
    return NotificationRepository.getAll({ tab: tab || 'all', includeDismissed: tab === 'dismissed' });
  });

  ipcMain.handle('notifications:getUnreadCount', (_, token: string) => {
    AuthRepository.requirePermission(token, 'notifications.view');
    return NotificationRepository.getUnreadCount();
  });

  ipcMain.handle('notifications:markRead', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'notifications.view');
    return NotificationRepository.markRead(id);
  });

  ipcMain.handle('notifications:markAllRead', (_, token: string) => {
    AuthRepository.requirePermission(token, 'notifications.view');
    return NotificationRepository.markAllRead();
  });

  ipcMain.handle('notifications:dismiss', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'notifications.manage');
    const user = actor(token);
    return NotificationRepository.dismiss(id, user?.id);
  });

  ipcMain.handle('notifications:scan', (_, token: string, runDate?: string) => {
    AuthRepository.requirePermission(token, 'notifications.manage');
    return NotificationService.scanAndGenerate(runDate);
  });

  ipcMain.handle('notificationRules:getRules', (_, token: string) => {
    AuthRepository.requirePermission(token, 'notifications.manage');
    return NotificationRuleRepository.getRules();
  });

  ipcMain.handle('notificationRules:updateRules', (_, token: string, settings: Record<string, string>) => {
    AuthRepository.requirePermission(token, 'notifications.manage');
    return NotificationRuleRepository.updateRules(settings || {});
  });
}
