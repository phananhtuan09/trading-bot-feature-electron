const pLimit = require('p-limit');
const { getSymbols } = require('./symbolManager');
const { analyzeMarket } = require('./dataService');
const StateManager = require('../database/stateStore');
const ConfigManager = require('../database/configStore');
const { sendSignalMessage, sendScanSummary } = require('./sendMessage');

class Scanner {
  constructor() {
    this.isRunning = false;
    this.scanInterval = null;
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
    this.lastScanTime = null;
    this.scanCount = 0;
  }

  async start(callback = null) {
    if (this.isRunning) {
      throw new Error('Scanner đang chạy rồi');
    }

    try {
      this.isRunning = true;
      this.scanCount = 0;

      // Perform initial scan
      await this.performScan(callback);

      // Start interval scanning
      this.startIntervalScanning(callback);

      console.log('✅ Scanner đã khởi động thành công');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('❌ Lỗi khởi động scanner:', error);
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

      console.log('✅ Scanner đã dừng thành công');
      return true;
    } catch (error) {
      console.error('❌ Lỗi dừng scanner:', error);
      throw error;
    }
  }

  async performScan(callback = null) {
    if (!this.isRunning) return null;

    console.log(`🔍 Bắt đầu quét lúc ${new Date().toLocaleTimeString()}`);
    this.lastScanTime = Date.now();
    this.scanCount++;

    // Xóa các tín hiệu cũ trước mỗi lần quét
    this.stateManager.clearSignals();

    try {
      const strategyConfig = this.configManager.getStrategyConfig();
      const symbols = await getSymbols();
      const concurrencyLimit = strategyConfig.CONCURRENCY_LIMIT || 10;
      const scanLimiter = pLimit(concurrencyLimit);
      const scanPromises = symbols.map(symbol => scanLimiter(() => analyzeMarket(symbol)));
      const results = await Promise.allSettled(scanPromises);

      const errors = [];
      const allSignals = [];

      for (const result of results) {
        if (result.status === 'rejected') {
          errors.push(result.reason);
          continue;
        }
        if (result.value) {
          allSignals.push(result.value);
        }
      }

      // Lưu tất cả tín hiệu mới vào state
      if (allSignals.length > 0) {
        this.stateManager.setSignals(allSignals);
        console.log(`📈 Đã lưu ${allSignals.length} tín hiệu mới.`);

        // Send notification for each signal
        for (const signal of allSignals) {
          await sendSignalMessage(signal);
        }
      }

      const summary = [
        `📊 Tổng kết quét:`,
        `- Tổng cặp: ${symbols.length}`,
        `- Tín hiệu mới: ${allSignals.length}`,
        `- Lỗi: ${errors.length}`,
        `- Thời gian quét: ${new Date().toLocaleString()}`,
      ].join('\n');

      console.log(summary);

      // Cập nhật state và log
      this.stateManager.incrementScans();
      this.stateManager.addLog({
        level: 'info',
        message: summary,
        type: 'scan_summary',
      });

      // Send scan summary notification
      await sendScanSummary(summary);

      // Call callback after scan completes and signals are saved
      if (callback && typeof callback === 'function') {
        try {
          await callback();
        } catch (error) {
          console.error('❌ Error in scan callback:', error);
        }
      }

      if (errors.length > 0) {
        console.error(`Chi tiết lỗi:`, errors);
        this.stateManager.incrementErrors();
        this.stateManager.addLog({
          level: 'error',
          message: `Lỗi quét: ${errors.join(', ')}`,
          type: 'scan_error',
        });
      }

      return allSignals;
    } catch (error) {
      console.error(`Lỗi quét tổng:`, error);
      this.stateManager.incrementErrors();
      this.stateManager.addLog({
        level: 'error',
        message: `Lỗi quét: ${error.message}`,
        type: 'scan_error',
      });
      return null;
    }
  }

  startIntervalScanning(callback = null) {
    const appConfig = this.configManager.getConfig().CONFIG;
    const scanInterval = appConfig.SCAN_INTERVAL || 3600000; // Mặc định 1 giờ
    this.scanInterval = setInterval(() => {
      this.performScan(callback);
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
