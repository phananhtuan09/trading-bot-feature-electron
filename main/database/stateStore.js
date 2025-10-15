const Store = require('electron-store');
const BinanceService = require('../bot/binanceService');
const { sendPositionClosedMessage } = require('../bot/sendMessage');

class StateManager {
  constructor() {
    this.store = new Store({
      name: 'state',
      defaults: {
        // Bot state
        botState: {
          isRunning: false,
          isOrderActive: false,
          lastScanTime: null,
          startTime: null,
          totalScans: 0,
          totalSignals: 0,
          totalErrors: 0,
        },

        // Account state
        accountState: {
          balance: 0,
          availableBalance: 0,
          unrealizedPnl: 0,
          marginBalance: 0,
          initialCapital: 0,
          totalProfit: 0,
          profitPercentage: 0,
          lastUpdateTime: null,
          accountType: 'Unknown',
        },

        // Orders state
        ordersState: {
          ordersPlacedToday: 0,
          totalOrders: 0,
          totalCapital: 0,
          maxOrdersPerDay: 10,
          orderLimitPerScan: 3,
          quantity: 10,
          leverage: 20,
        },

        // Positions
        positions: [],

        // Signals
        signals: [],

        // Logs
        logs: [],

        // Statistics
        statistics: {
          winRate: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
        },

        // Connection status
        connectionStatus: {
          binance: { connected: false, lastCheck: null, error: null },
          discord: { connected: false, lastCheck: null, error: null },
          telegram: { connected: false, lastCheck: null, error: null },
        },
      },
    });

    this.binanceService = new BinanceService();
    this.mainWindow = null; // Add property to hold the window reference
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  async initialize() {
    try {
      console.log('StateManager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize StateManager:', error);
      throw error;
    }
  }

  // Bot state methods
  getBotState() {
    return this.store.get('botState');
  }

  updateBotState(updates) {
    const currentState = this.getBotState();
    this.store.set('botState', { ...currentState, ...updates });
  }

  setBotRunning(isRunning) {
    this.updateBotState({
      isRunning,
      startTime: isRunning ? Date.now() : null,
    });
  }

  setBotOrderActive(isOrderActive) {
    this.updateBotState({ isOrderActive });
  }

  incrementScans() {
    const currentState = this.getBotState();
    this.updateBotState({
      totalScans: currentState.totalScans + 1,
      lastScanTime: Date.now(),
    });
  }

  incrementSignals() {
    const currentState = this.getBotState();
    this.updateBotState({
      totalSignals: currentState.totalSignals + 1,
    });
  }

  incrementErrors() {
    const currentState = this.getBotState();
    this.updateBotState({
      totalErrors: currentState.totalErrors + 1,
    });
  }

  // Account state methods
  getAccountState() {
    return this.store.get('accountState');
  }

  updateAccountState(updates) {
    const currentState = this.getAccountState();
    this.store.set('accountState', { ...currentState, ...updates });
  }

  setBalance(balance) {
    this.updateAccountState({
      balance,
      lastUpdateTime: Date.now(),
    });
  }

  setInitialCapital(capital) {
    this.updateAccountState({
      initialCapital: capital,
      balance: capital,
    });
  }

  updateProfit(profit, percentage) {
    this.updateAccountState({
      totalProfit: profit,
      profitPercentage: percentage,
    });
  }

  // Orders state methods
  getOrdersState() {
    return this.store.get('ordersState');
  }

  updateOrdersState(updates) {
    const currentState = this.getOrdersState();
    this.store.set('ordersState', { ...currentState, ...updates });
  }

  incrementDailyOrders() {
    const currentState = this.getOrdersState();
    this.updateOrdersState({
      ordersPlacedToday: currentState.ordersPlacedToday + 1,
      totalOrders: currentState.totalOrders + 1,
    });
  }

  resetDailyOrders() {
    this.updateOrdersState({ ordersPlacedToday: 0 });
  }

  // Positions methods
  getPositions() {
    return this.store.get('positions', []);
  }

  addPosition(position) {
    const positions = this.getPositions();
    positions.push({
      ...position,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    this.store.set('positions', positions);
  }

  updatePosition(positionId, updates) {
    const positions = this.getPositions();
    const index = positions.findIndex(p => p.id === positionId);
    if (index !== -1) {
      positions[index] = { ...positions[index], ...updates };
      this.store.set('positions', positions);
    }
  }

  removePosition(positionId) {
    const positions = this.getPositions();
    const filteredPositions = positions.filter(p => p.id !== positionId);
    this.store.set('positions', filteredPositions);
  }

  getActivePositions() {
    const positions = this.getPositions();
    return positions.filter(p => p.status === 'active');
  }

  updateSinglePosition(positionUpdate) {
    const positions = this.getPositions();
    const index = positions.findIndex(p => p.symbol === positionUpdate.symbol);

    if (index !== -1) {
      // Merge new data into the existing position
      positions[index] = { ...positions[index], ...positionUpdate };
      this.store.set('positions', positions);
    } else {
      // If position doesn't exist, it might be a new one.
      // For simplicity, we can add it. Or rely on the full update.
      // For now, let's just update existing ones.
    }
  }

  // Signals methods
  getSignals() {
    return this.store.get('signals', []);
  }

  clearSignals() {
    this.store.set('signals', []);
  }

  setSignals(signals) {
    const enrichedSignals = signals.map((signal, index) => ({
      ...signal,
      id: `${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
    }));
    this.store.set('signals', enrichedSignals);
  }

  addSignal(signal) {
    const signals = this.getSignals();
    signals.unshift({
      ...signal,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    });
    this.setSignals(signals.slice(0, 1000)); // Keep only the last 1000
  }

  getTotalSignals() {
    return this.getSignals().length;
  }

  // Logs methods
  getLogs() {
    return this.store.get('logs', []);
  }

  addLog(log) {
    const logs = this.getLogs();
    const newLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);

    // Keep only last 500 logs
    if (logs.length > 500) {
      logs.splice(500);
    }

    this.store.set('logs', logs);

    // Push the new log to the UI for real-time update
    if (this.mainWindow) {
      this.mainWindow.webContents.send('log:new', newLog);
    }
  }

  // Statistics methods
  getStatistics() {
    return this.store.get('statistics');
  }

  updateStatistics(updates) {
    const currentStats = this.getStatistics();
    this.store.set('statistics', { ...currentStats, ...updates });
  }

  // Helper method to check if API keys are configured
  hasApiKeysConfigured() {
    try {
      const configManager = require('./configStore');
      const config = new configManager();
      const binanceConfig = config.getBinanceConfig();

      const isTestnet = binanceConfig.IS_TESTING;
      const apiKey = isTestnet ? binanceConfig.TEST_API_KEY : binanceConfig.API_KEY;
      const apiSecret = isTestnet ? binanceConfig.TEST_API_SECRET : binanceConfig.API_SECRET;

      const hasKeys = !!(apiKey && apiSecret);
      console.log('🔑 API Keys check:', {
        isTestnet,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasKeys,
      });
      return hasKeys;
    } catch (error) {
      console.error('❌ Error checking API keys:', error);
      return false;
    }
  }

  // Real-time data methods
  async updateAccountData() {
    try {
      // Check if API keys are configured before calling
      if (!this.hasApiKeysConfigured()) {
        return { success: false, error: 'API keys not configured' };
      }

      const balanceData = await this.binanceService.getAccountBalance();
      if (balanceData.success) {
        this.updateAccountState({
          balance: balanceData.balance,
          availableBalance: balanceData.availableBalance,
          unrealizedPnl: balanceData.unrealizedPnl,
          marginBalance: balanceData.marginBalance,
          accountType: balanceData.accountType,
          lastUpdateTime: Date.now(),
        });

        // Calculate profit if we have initial capital
        const accountState = this.getAccountState();
        if (accountState.initialCapital > 0) {
          const totalProfit = balanceData.balance - accountState.initialCapital;
          const profitPercentage = (totalProfit / accountState.initialCapital) * 100;
          this.updateAccountState({
            totalProfit: totalProfit,
            profitPercentage: profitPercentage,
          });
        }
      } else {
        console.error('Failed to get account balance:', balanceData.error);
        return { success: false, error: balanceData.error };
      }
      return balanceData;
    } catch (error) {
      console.error('Failed to update account data:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePositionsData() {
    try {
      // Check if API keys are configured before calling
      if (!this.hasApiKeysConfigured()) {
        console.log('⚠️ API keys not configured, skipping positions update');
        return [];
      }

      const positions = await this.binanceService.getPositions();
      if (Array.isArray(positions)) {
        this.store.set('positions', positions);
        return positions;
      } else {
        console.error('Failed to get positions: Invalid response format');
        return [];
      }
    } catch (error) {
      console.error('Failed to update positions data:', error);

      // Log specific error details
      if (error.code === -2015) {
        console.error('❌ API key không hợp lệ hoặc không có quyền truy cập');
      } else if (error.message.includes('Invalid API-key')) {
        console.error('❌ API key không hợp lệ');
      }

      return [];
    }
  }

  async closePositionReal(symbol, side) {
    try {
      const result = await this.binanceService.closePosition(symbol, side);
      if (result.success) {
        // Update positions after closing
        await this.updatePositionsData();
        // Update account data
        await this.updateAccountData();

        this.addLog({
          level: 'info',
          message: `Đã đóng vị thế ${symbol} thành công`,
          type: 'position_closed',
        });

        // Send position closed notification
        await sendPositionClosedMessage({
          symbol,
          side,
          pnl: result.pnl || 0,
        });
      }
      return result;
    } catch (error) {
      console.error(`Failed to close position ${symbol}:`, error);
      return { success: false, error: error.message };
    }
  }

  async executeSignalReal(signalId) {
    try {
      const signals = this.getSignals();
      const signal = signals.find(s => s.id === signalId);

      if (!signal) {
        throw new Error('Không tìm thấy tín hiệu');
      }

      // Use Order class to place the order
      const Order = require('../bot/order');
      const orderManager = new Order();
      orderManager.setMainWindow(this.mainWindow);

      // Execute the order using existing Order class logic
      const result = await orderManager.placeOrder(signal);

      if (result) {
        // Update orders count
        this.incrementDailyOrders();

        // Update positions and account data
        await this.updatePositionsData();
        await this.updateAccountData();

        // Remove executed signal
        const updatedSignals = this.getSignals().filter(s => s.id !== signalId);
        this.setSignals(updatedSignals);

        this.addLog({
          level: 'info',
          message: `Đã xóa tín hiệu ${signal.symbol} sau khi thực thi.`,
          type: 'signal_removed',
        });

        return {
          success: true,
          message: `✅ Đã vào lệnh ${signal.decision.toUpperCase()} ${signal.symbol} thành công`,
        };
      } else {
        return { success: false, error: 'Lỗi đặt lệnh' };
      }
    } catch (error) {
      console.error(`Failed to execute signal ${signalId}:`, error);

      // Send error notification to Telegram/Discord
      const { sendErrorAlert } = require('../bot/sendMessage');
      const errorMsg = `❌ Lỗi đặt lệnh (từ tín hiệu): ${error.message}`;
      await sendErrorAlert(errorMsg);

      return { success: false, error: error.message };
    }
  }

  // Connection status methods
  async checkBinanceConnection() {
    try {
      // First check if API keys are configured
      if (!this.hasApiKeysConfigured()) {
        this.updateConnectionStatus('binance', {
          connected: false,
          lastCheck: Date.now(),
          error: 'API keys not configured',
        });
        return { success: false, error: 'API keys not configured' };
      }

      const result = await this.binanceService.testConnection();
      this.updateConnectionStatus('binance', {
        connected: result.success,
        lastCheck: Date.now(),
        error: result.success ? null : result.error,
      });
      return result;
    } catch (error) {
      this.updateConnectionStatus('binance', {
        connected: false,
        lastCheck: Date.now(),
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async checkDiscordConnection() {
    try {
      // TODO: Implement Discord connection check when Discord is integrated
      // For now, check if config exists
      const configManager = require('./configStore');
      const config = new configManager();
      const discordConfig = config.getConfig().discord || {};

      const hasConfig = discordConfig.enabled && discordConfig.token && discordConfig.channelId;

      this.updateConnectionStatus('discord', {
        connected: hasConfig,
        lastCheck: Date.now(),
        error: hasConfig ? null : 'Not configured',
      });

      return { success: hasConfig, message: hasConfig ? 'Configured' : 'Not configured' };
    } catch (error) {
      this.updateConnectionStatus('discord', {
        connected: false,
        lastCheck: Date.now(),
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async checkTelegramConnection() {
    try {
      // TODO: Implement Telegram connection check when Telegram is integrated
      // For now, check if config exists
      const configManager = require('./configStore');
      const config = new configManager();
      const telegramConfig = config.getConfig().telegram || {};

      const hasConfig = telegramConfig.enabled && telegramConfig.token && telegramConfig.chatId;

      this.updateConnectionStatus('telegram', {
        connected: hasConfig,
        lastCheck: Date.now(),
        error: hasConfig ? null : 'Not configured',
      });

      return { success: hasConfig, message: hasConfig ? 'Configured' : 'Not configured' };
    } catch (error) {
      this.updateConnectionStatus('telegram', {
        connected: false,
        lastCheck: Date.now(),
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  async checkAllConnections() {
    const results = await Promise.allSettled([
      this.checkBinanceConnection(),
      this.checkDiscordConnection(),
      this.checkTelegramConnection(),
    ]);

    return {
      binance:
        results[0].status === 'fulfilled'
          ? results[0].value
          : { success: false, error: 'Check failed' },
      discord:
        results[1].status === 'fulfilled'
          ? results[1].value
          : { success: false, error: 'Check failed' },
      telegram:
        results[2].status === 'fulfilled'
          ? results[2].value
          : { success: false, error: 'Check failed' },
    };
  }

  updateConnectionStatus(service, status) {
    const currentStatus = this.store.get('connectionStatus');
    currentStatus[service] = { ...currentStatus[service], ...status };
    this.store.set('connectionStatus', currentStatus);
  }

  getConnectionStatus() {
    return this.store.get('connectionStatus');
  }

  // Enhanced statistics
  async calculateStatistics() {
    try {
      const positions = this.getPositions();
      const closedPositions = positions.filter(p => p.status === 'closed');

      if (closedPositions.length === 0) {
        return this.getStatistics();
      }

      const winningTrades = closedPositions.filter(p => p.unrealizedPnl > 0);
      const losingTrades = closedPositions.filter(p => p.unrealizedPnl < 0);

      const winRate = (winningTrades.length / closedPositions.length) * 100;
      const averageWin =
        winningTrades.length > 0
          ? winningTrades.reduce((sum, p) => sum + p.unrealizedPnl, 0) / winningTrades.length
          : 0;
      const averageLoss =
        losingTrades.length > 0
          ? losingTrades.reduce((sum, p) => sum + p.unrealizedPnl, 0) / losingTrades.length
          : 0;

      const statistics = {
        winRate: winRate,
        averageWin: averageWin,
        averageLoss: averageLoss,
        totalTrades: closedPositions.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        maxDrawdown: this.calculateMaxDrawdown(closedPositions),
        sharpeRatio: this.calculateSharpeRatio(closedPositions),
      };

      this.updateStatistics(statistics);
      return statistics;
    } catch (error) {
      console.error('Failed to calculate statistics:', error);
      return this.getStatistics();
    }
  }

  calculateMaxDrawdown(positions) {
    // Simplified max drawdown calculation
    let peak = 0;
    let maxDrawdown = 0;

    for (const position of positions) {
      if (position.unrealizedPnl > peak) {
        peak = position.unrealizedPnl;
      }
      const drawdown = peak - position.unrealizedPnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  calculateSharpeRatio(positions) {
    // Simplified Sharpe ratio calculation
    if (positions.length < 2) {
      return 0;
    }

    const returns = positions.map(p => p.unrealizedPnl);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : mean / stdDev;
  }

  // General methods
  getStats() {
    return {
      bot: this.getBotState(),
      account: this.getAccountState(),
      orders: this.getOrdersState(),
      statistics: this.getStatistics(),
      positions: this.getActivePositions().length,
      signals: this.getTotalSignals(),
      logs: this.getLogs().length,
      connectionStatus: this.getConnectionStatus(),
    };
  }

  // Reset all state
  resetState() {
    this.store.clear();
    console.log('State reset to defaults');
  }

  // Export state
  exportState() {
    return JSON.stringify(this.store.store, null, 2);
  }

  // Import state
  importState(stateJson) {
    try {
      const state = JSON.parse(stateJson);
      this.store.set(state);
      console.log('State imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    }
  }
}

module.exports = StateManager;
