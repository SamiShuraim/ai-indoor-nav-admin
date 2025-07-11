import { clearLogs, exportLogs, getAllLogs, LogLevel, setLogLevel } from './logger';

// Development helper functions for logger access
// These functions will be available in the browser console for debugging

// Add logger helpers to window object in development
declare global {
  interface Window {
    loggerHelpers: {
      viewLogs: () => void;
      exportLogs: () => string;
      clearLogs: () => void;
      setLogLevel: (level: LogLevel) => void;
      downloadLogs: () => void;
      filterLogs: (context?: string, level?: LogLevel) => void;
      searchLogs: (searchTerm: string) => void;
    };
  }
}

const loggerHelpers = {
  // View all logs in console
  viewLogs: (): void => {
    const logs = getAllLogs();
    console.group('📋 All Application Logs');
    console.table(logs);
    console.groupEnd();
  },

  // Export logs as JSON string
  exportLogs: (): string => {
    const logsJson = exportLogs();
    console.log('📤 Logs exported:', logsJson);
    return logsJson;
  },

  // Clear all logs
  clearLogs: (): void => {
    clearLogs();
    console.log('🧹 All logs cleared');
  },

  // Set log level
  setLogLevel: (level: LogLevel): void => {
    setLogLevel(level);
    console.log(`📊 Log level set to: ${LogLevel[level]}`);
  },

  // Download logs as file
  downloadLogs: (): void => {
    const logsJson = exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-portal-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 Logs downloaded as file');
  },

  // Filter logs by context and/or level
  filterLogs: (context?: string, level?: LogLevel): void => {
    const logs = getAllLogs();
    let filteredLogs = logs;

    if (context) {
      filteredLogs = filteredLogs.filter(log => 
        log.context.toLowerCase().includes(context.toLowerCase())
      );
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    console.group(`🔍 Filtered Logs ${context ? `(context: ${context})` : ''} ${level !== undefined ? `(level: ${LogLevel[level]}+)` : ''}`);
    console.table(filteredLogs);
    console.groupEnd();
  },

  // Search logs by message content
  searchLogs: (searchTerm: string): void => {
    const logs = getAllLogs();
    const matchingLogs = logs.filter(log => 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    console.group(`🔎 Search Results for: "${searchTerm}"`);
    console.table(matchingLogs);
    console.groupEnd();
  }
};

// Make logger helpers available globally in development
if (process.env.NODE_ENV === 'development') {
  window.loggerHelpers = loggerHelpers;
  
  console.log('🔧 Logger helpers available! Use window.loggerHelpers in console:');
  console.log('  - viewLogs(): View all logs');
  console.log('  - exportLogs(): Export logs as JSON');
  console.log('  - clearLogs(): Clear all logs');
  console.log('  - setLogLevel(level): Set log level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)');
  console.log('  - downloadLogs(): Download logs as file');
  console.log('  - filterLogs(context?, level?): Filter logs');
  console.log('  - searchLogs(term): Search logs by content');
}

export default loggerHelpers; 