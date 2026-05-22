import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'STARTUP' | 'IPC' | 'DB' | 'AUTH' | 'AUTOMATION' | 'GENERAL';

class ProductionLogger {
  private logDir: string = '';
  private activeLogFile: string = '';
  private maxLogSize = 5 * 1024 * 1024; // 5 MB

  constructor() {
    this.initPaths();
  }

  private initPaths() {
    try {
      const isDev = !app.isPackaged;
      this.logDir = isDev
        ? path.join(app.getAppPath(), 'logs')
        : path.join(app.getPath('userData'), 'logs');
    } catch {
      this.logDir = path.join(__dirname, '../../logs');
    }

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.activeLogFile = path.join(this.logDir, 'app.log');
  }

  getLogDirectory() {
    return this.logDir;
  }

  getLogFilePath() {
    return this.activeLogFile;
  }

  log(level: LogLevel, category: LogCategory, message: string, details?: any) {
    const timestamp = new Date().toISOString();
    let detailStr = '';
    if (details) {
      if (details instanceof Error) {
        detailStr = `\n  Error: ${details.message}\n  Stack: ${details.stack}`;
      } else {
        detailStr = `\n  Details: ${JSON.stringify(details, null, 2)}`;
      }
    }

    const logLine = `[${timestamp}] [${level}] [${category}] ${message}${detailStr}\n`;

    // Write to console
    if (level === 'ERROR') {
      console.error(logLine.trim());
    } else if (level === 'WARN') {
      console.warn(logLine.trim());
    } else {
      console.log(logLine.trim());
    }

    // Write to file with rotation check
    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.activeLogFile, logLine, 'utf8');
    } catch (err) {
      console.error('Failed to write to app log file:', err);
    }
  }

  info(category: LogCategory, message: string, details?: any) {
    this.log('INFO', category, message, details);
  }

  warn(category: LogCategory, message: string, details?: any) {
    this.log('WARN', category, message, details);
  }

  error(category: LogCategory, message: string, details?: any) {
    this.log('ERROR', category, message, details);
  }

  private rotateIfNeeded() {
    if (!fs.existsSync(this.activeLogFile)) return;
    try {
      const stats = fs.statSync(this.activeLogFile);
      if (stats.size >= this.maxLogSize) {
        const backupFile = path.join(this.logDir, `app.${Date.now()}.log`);
        fs.renameSync(this.activeLogFile, backupFile);
      }
    } catch (err) {
      console.error('Error during log file rotation:', err);
    }
  }

  readLogLines(limit = 100): string[] {
    if (!fs.existsSync(this.activeLogFile)) return [];
    try {
      const content = fs.readFileSync(this.activeLogFile, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      return lines.slice(-limit);
    } catch {
      return [];
    }
  }
}

export const logger = new ProductionLogger();
