const fs = require('fs');
const path = require('path');

class FileLogger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log('📁 Created logs directory:', this.logsDir);
    }
  }

  getLogFileName() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `${dateString}.json`);
  }

  async writeLog(logEntry) {
    try {
      const logFile = this.getLogFileName();
      
      // Read existing logs or initialize empty array
      let logs = [];
      if (fs.existsSync(logFile)) {
        try {
          const fileContent = fs.readFileSync(logFile, 'utf8');
          logs = JSON.parse(fileContent);
        } catch (error) {
          console.warn('⚠️ Error reading existing log file, starting fresh:', error.message);
          logs = [];
        }
      }

      // Add new log entry
      logs.push(logEntry);

      // Write back to file
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
      
      return true;
    } catch (error) {
      console.error('❌ Error writing to log file:', error);
      return false;
    }
  }

  // Log when a signal is detected (passes all filters)
  async logSignalDetected(signalData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'signal_detected',
      symbol: signalData.symbol,
      data: {
        symbol: signalData.symbol,
        decision: signalData.decision,
        price: signalData.price,
        TP_ROI: signalData.TP_ROI,
        SL_ROI: signalData.SL_ROI,
        strength: signalData.strength,
        confidenceScore: signalData.confidenceScore,
        reason: signalData.reason,
        marketType: signalData.marketType
      }
    };

    await this.writeLog(logEntry);
    console.log(`📊 Logged signal detected: ${signalData.symbol} ${signalData.decision}`);
  }

  // Log when a signal is filtered out
  async logSignalFiltered(symbol, price, filterReason, filterDetails = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'signal_filtered',
      symbol: symbol,
      data: {
        symbol: symbol,
        price: price,
        filterReason: filterReason,
        filterDetails: filterDetails
      }
    };

    await this.writeLog(logEntry);
    console.log(`🚫 Logged signal filtered: ${symbol} - ${filterReason}`);
  }

  // Log when an order is successfully placed
  async logOrderPlaced(orderData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'order_placed',
      symbol: orderData.symbol,
      data: {
        symbol: orderData.symbol,
        side: orderData.side,
        entryPrice: orderData.entryPrice,
        quantity: orderData.quantity,
        tpPrice: orderData.tpPrice,
        slPrice: orderData.slPrice,
        leverage: orderData.leverage,
        orderId: orderData.orderId || null
      }
    };

    await this.writeLog(logEntry);
    console.log(`✅ Logged order placed: ${orderData.symbol} ${orderData.side}`);
  }

  // Log when an order fails
  async logOrderFailed(orderData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'order_failed',
      symbol: orderData.symbol,
      data: {
        symbol: orderData.symbol,
        side: orderData.side,
        error: orderData.error,
        attemptedPrice: orderData.attemptedPrice,
        attemptedQuantity: orderData.attemptedQuantity
      }
    };

    await this.writeLog(logEntry);
    console.log(`❌ Logged order failed: ${orderData.symbol} - ${orderData.error}`);
  }

  // Log scan summary
  async logScanSummary(summaryData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'scan_summary',
      symbol: 'ALL',
      data: {
        totalSymbols: summaryData.totalSymbols,
        signalsDetected: summaryData.signalsDetected,
        signalsFiltered: summaryData.signalsFiltered,
        errors: summaryData.errors,
        scanTime: summaryData.scanTime,
        signals: summaryData.signals || []
      }
    };

    await this.writeLog(logEntry);
    console.log(`📈 Logged scan summary: ${summaryData.signalsDetected} signals detected`);
  }

  // Get logs for a specific date
  getLogsForDate(dateString) {
    const logFile = path.join(this.logsDir, `${dateString}.json`);
    if (fs.existsSync(logFile)) {
      try {
        const fileContent = fs.readFileSync(logFile, 'utf8');
        return JSON.parse(fileContent);
      } catch (error) {
        console.error('❌ Error reading log file:', error);
        return [];
      }
    }
    return [];
  }

  // Get logs for today
  getTodayLogs() {
    const today = new Date().toISOString().split('T')[0];
    return this.getLogsForDate(today);
  }

  // Get all available log files
  getAvailableLogFiles() {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('❌ Error reading logs directory:', error);
      return [];
    }
  }
}

// Create singleton instance
const fileLogger = new FileLogger();

module.exports = fileLogger;
