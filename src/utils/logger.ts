/**
 * Sistema de logging en memoria para debugging
 * Permite capturar logs del servidor y exponerlos a través de un endpoint
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
  stack?: string;
}

class InMemoryLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Mantener solo los últimos 1000 logs
  private isLogging = false; // Evitar recursión infinita

  log(message: string, data?: any) {
    if (this.isLogging) return;
    this.addLog('log', message, data);
  }

  error(message: string, error?: any) {
    if (this.isLogging) return;
    this.addLog('error', message, error, error?.stack);
  }

  warn(message: string, data?: any) {
    if (this.isLogging) return;
    this.addLog('warn', message, data);
  }

  info(message: string, data?: any) {
    if (this.isLogging) return;
    this.addLog('info', message, data);
  }

  private addLog(level: LogEntry['level'], message: string, data?: any, stack?: string) {
    this.isLogging = true;
    try {
      let safeData: any;
      if (data) {
        try {
          safeData = typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data;
        } catch {
          safeData = '[Circular reference or non-serializable data]';
        }
      }

      this.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data: safeData,
        stack,
      });

      // Mantener solo los últimos maxLogs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    } finally {
      this.isLogging = false;
    }
  }

  getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  clearLogs() {
    this.logs = [];
  }

  getRecentLogs(seconds: number = 60): LogEntry[] {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    return this.logs.filter(log => log.timestamp >= cutoff);
  }
}

export const logger = new InMemoryLogger();

// Interceptar console.log, console.error, etc. para capturar todos los logs
// Nota: Esto se ejecuta cuando se importa el módulo, así que debe importarse temprano
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info || console.log;

console.log = (...args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logger.log(message, args.length > 1 ? args.slice(1) : undefined);
  originalLog.apply(console, args);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  const error = args.find(arg => arg instanceof Error) || (args.length > 1 ? args[1] : undefined);
  logger.error(message, error);
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logger.warn(message, args.length > 1 ? args.slice(1) : undefined);
  originalWarn.apply(console, args);
};

console.info = (...args: any[]) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logger.info(message, args.length > 1 ? args.slice(1) : undefined);
  originalInfo.apply(console, args);
};

