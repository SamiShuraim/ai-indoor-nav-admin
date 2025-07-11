// Logger Configuration Constants
const LOGGER_CONFIG = {
  ENABLED: true, // Set to false in production
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss.SSS',
  MAX_LOG_LENGTH: 1000,
} as const;

// Log Levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Log Level Colors for Console (optimized for both light and dark modes)
const LOG_COLORS = {
  [LogLevel.DEBUG]: '#9CA3AF', // Light gray - readable in both modes
  [LogLevel.INFO]: '#60A5FA',  // Bright blue - good contrast
  [LogLevel.WARN]: '#FBBF24',  // Bright yellow - good visibility
  [LogLevel.ERROR]: '#F87171', // Bright red - high contrast
} as const;

// Enhanced console styling for better readability
const CONSOLE_STYLES = {
  timestamp: 'color: #9CA3AF; font-weight: normal; font-size: 11px;',
  context: 'color: #A78BFA; font-weight: bold; font-size: 12px;',
  message: 'color: #E5E7EB; font-weight: normal; font-size: 12px;',
  data: 'color: #34D399; font-weight: normal;',
  error: 'color: #F87171; font-weight: bold;',
} as const;

// Log Level Names
const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
} as const;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private context: string;
  private static logs: LogEntry[] = [];
  private static currentLogLevel: LogLevel = LogLevel.DEBUG;

  constructor(context: string) {
    this.context = context;
  }

  // Set global log level
  static setLogLevel(level: LogLevel): void {
    Logger.currentLogLevel = level;
    console.log(`%c[Logger] Log level set to: ${LOG_LEVEL_NAMES[level]}`, 'color: #60A5FA; font-weight: bold;');
  }

  // Get all logs (for debugging or sending to server)
  static getAllLogs(): LogEntry[] {
    return [...Logger.logs];
  }

  // Clear all logs
  static clearLogs(): void {
    Logger.logs = [];
    console.log('%c[Logger] All logs cleared', 'color: #60A5FA; font-weight: bold;');
  }

  // Export logs as JSON
  static exportLogs(): string {
    return JSON.stringify(Logger.logs, null, 2);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOGGER_CONFIG.ENABLED && level >= Logger.currentLogLevel;
  }

  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  private truncateData(data: any): any {
    if (typeof data === 'string' && data.length > LOGGER_CONFIG.MAX_LOG_LENGTH) {
      return data.substring(0, LOGGER_CONFIG.MAX_LOG_LENGTH) + '... [truncated]';
    }
    return data;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const timestamp = this.formatTimestamp();
    const logEntry: LogEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      data: data ? this.truncateData(data) : undefined,
      error,
    };

    // Store log entry
    Logger.logs.push(logEntry);

    // Keep only last 1000 logs to prevent memory issues
    if (Logger.logs.length > 1000) {
      Logger.logs = Logger.logs.slice(-1000);
    }

    // Enhanced console output with better styling for dark mode
    const levelName = LOG_LEVEL_NAMES[level];
    const levelColor = LOG_COLORS[level];
    const contextStr = `[${this.context}]`;
    const timeStr = `[${timestamp}]`;
    const levelStr = `[${levelName}]`;

    // Use a more readable format with better colors
    console.groupCollapsed(
      `%c${timeStr} %c${levelStr} %c${contextStr} %c${message}`,
      CONSOLE_STYLES.timestamp,
      `color: ${levelColor}; font-weight: bold; font-size: 12px;`,
      CONSOLE_STYLES.context,
      CONSOLE_STYLES.message
    );

    if (data !== undefined) {
      console.log('%cData:', CONSOLE_STYLES.data, data);
    }

    if (error) {
      console.error('%cError:', CONSOLE_STYLES.error, error);
      console.trace('%cStack trace:', CONSOLE_STYLES.error);
    }

    console.groupEnd();
  }

  // Public logging methods
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  // Specialized logging methods
  apiRequest(method: string, url: string, data?: any): void {
    this.info(`🚀 API Request: ${method} ${url}`, { method, url, data });
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const emoji = status >= 400 ? '❌' : '✅';
    this.log(level, `${emoji} API Response: ${method} ${url} - ${status}`, { method, url, status, data });
  }

  apiError(method: string, url: string, error: Error): void {
    this.error(`💥 API Error: ${method} ${url}`, error, { method, url });
  }

  userAction(action: string, data?: any): void {
    this.info(`👤 User Action: ${action}`, data);
  }

  stateChange(component: string, oldState: any, newState: any): void {
    this.debug(`🔄 State Change: ${component}`, { from: oldState, to: newState });
  }

  navigationChange(from: string, to: string): void {
    this.info(`🧭 Navigation: ${from} → ${to}`, { from, to });
  }

  authEvent(event: string, data?: any): void {
    this.info(`🔐 Auth Event: ${event}`, data);
  }

  performanceLog(operation: string, duration: number, data?: any): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    const emoji = duration > 1000 ? '⚠️' : '⚡';
    this.log(level, `${emoji} Performance: ${operation} took ${duration}ms`, data);
  }
}

// Export factory function for creating loggers
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export static methods for global use
export const { setLogLevel, getAllLogs, clearLogs, exportLogs } = Logger;

// Default logger for general use
export const defaultLogger = createLogger('App'); 