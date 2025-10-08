const pLimit = require('p-limit');
const { getSymbols } = require('./symbolManager');
const { analyzeMarket } = require('./dataService');
const StateManager = require('../database/stateStore');

// Mock implementations for message sending
const sendSignalMessage = async signal => {
  console.log(`Signal message: ${signal.symbol} ${signal.decision}`);
};

const sendMessage = async message => {
  console.log(`Message: ${message}`);
};

class Scanner {
  constructor() {
    this.isRunning = false;
    this.scanInterval = null;
    this.stateManager = new StateManager();
    this.lastScanTime = null;
    this.scanCount = 0;
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Scanner is already running');
    }

    try {
      this.isRunning = true;
      this.scanCount = 0;

      // Perform initial scan
      await this.performScan();

      // Start interval scanning
      this.startIntervalScanning();

      console.log('Scanner started successfully');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start scanner:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;

      if (this.scanInterval) {
        clearInterval(this.scanInterval);
        this.scanInterval = null;
      }

      console.log('Scanner stopped successfully');
      return true;
    } catch (error) {
      console.error('Failed to stop scanner:', error);
      throw error;
    }
  }

  async performScan() {
    if (!this.isRunning) return null;

    console.log(`🔍 Bắt đầu quét lúc ${new Date().toLocaleTimeString()}`);
    this.lastScanTime = Date.now();
    this.scanCount++;

    try {
      const symbols = await getSymbols();
      const scanLimiter = pLimit(20); // Default concurrency limit
      const scanPromises = symbols.map(symbol => scanLimiter(() => analyzeMarket(symbol)));
      const results = await Promise.allSettled(scanPromises);

      let signalCount = 0;
      const errors = [];
      const allSignals = [];

      for (const result of results) {
        if (result.status === 'rejected') {
          errors.push(result.reason);
          continue;
        }

        const signal = result.value;
        if (!signal) continue;

        signalCount++;
        console.log(
          `Tín hiệu: ${signal.symbol} | ${signal.decision} | ${signal.marketType} | Strength: ${signal.strength} | TP: ${signal.TP_ROI} | SL: ${signal.SL_ROI}`
        );

        allSignals.push(signal);

        // Add signal to state
        this.stateManager.addSignal(signal);

        // Send signal message
        await sendSignalMessage(signal);
      }

      const summary = [
        `📊 Tổng kết quét:`,
        `- Tổng cặp: ${symbols.length}`,
        `- Tín hiệu: ${signalCount}`,
        `- Lỗi: ${errors.length}`,
        `- Thời gian quét: ${new Date().toLocaleString()}`,
      ].join('\n');

      console.log(summary);

      // Update state
      this.stateManager.incrementScans();
      this.stateManager.addLog({
        level: 'info',
        message: summary,
        type: 'scan_summary',
      });

      if (errors.length > 0) {
        console.error(`Chi tiết lỗi:`, errors);
        this.stateManager.incrementErrors();
        this.stateManager.addLog({
          level: 'error',
          message: `Scan errors: ${errors.join(', ')}`,
          type: 'scan_error',
        });
        return null;
      }

      await sendMessage(summary);
      return allSignals;
    } catch (error) {
      console.error(`Lỗi quét tổng:`, error);
      this.stateManager.incrementErrors();
      this.stateManager.addLog({
        level: 'error',
        message: `Scan error: ${error.message}`,
        type: 'scan_error',
      });
      return null;
    }
  }

  startIntervalScanning() {
    const scanInterval = 3600000; // 1 hour default
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, scanInterval);
  }

  getLastScanTime() {
    return this.lastScanTime;
  }

  getScanCount() {
    return this.scanCount;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastScanTime: this.lastScanTime,
      scanCount: this.scanCount,
      nextScanIn: this.scanInterval ? scanInterval - (Date.now() - this.lastScanTime) : null,
    };
  }
}

module.exports = Scanner;
