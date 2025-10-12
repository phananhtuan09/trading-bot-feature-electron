const DiscordService = require('./discordService');
const TelegramService = require('./telegramService');

class NotificationManager {
  constructor() {
    this.discordService = new DiscordService();
    this.telegramService = new TelegramService();
    this.isInitialized = false;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.retryDelay = 2000; // 2 seconds
  }

  async initialize(config) {
    try {
      console.log('🔔 Initializing Notification Manager...');

      // Initialize Discord
      if (config?.DISCORD) {
        await this.discordService.initialize(config.DISCORD);
      }

      // Initialize Telegram
      if (config?.TELEGRAM) {
        await this.telegramService.initialize(config.TELEGRAM);
      }

      this.isInitialized = true;
      console.log('✅ Notification Manager initialized');

      // Log connection status
      const status = this.getConnectionStatus();
      console.log(`  - Discord: ${status.discord ? '✅' : '❌'}`);
      console.log(`  - Telegram: ${status.telegram ? '✅' : '❌'}`);

      return true;
    } catch (error) {
      console.error('Failed to initialize Notification Manager:', error.message);
      return false;
    }
  }

  async reinitialize(config) {
    // Disconnect existing services
    await this.disconnect();
    
    // Reinitialize with new config
    return await this.initialize(config);
  }

  getConnectionStatus() {
    return {
      discord: this.discordService.isConnected(),
      telegram: this.telegramService.isConnected(),
    };
  }

  async sendSignal(signal) {
    if (!this.isInitialized) {
      console.warn('Notification Manager not initialized');
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendSignalEmbed(signal));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendSignalMessage(signal));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
      message: anySuccess ? 'Signal sent successfully' : 'Failed to send signal',
    };
  }

  async sendOrderSuccess(order) {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendOrderEmbed(order));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendOrderMessage(order));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
      message: anySuccess ? 'Order notification sent' : 'Failed to send order notification',
    };
  }

  async sendPositionClosed(position) {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendPositionClosedEmbed(position));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendPositionClosedMessage(position));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
      message: anySuccess ? 'Position closed notification sent' : 'Failed to send notification',
    };
  }

  async sendError(error) {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendErrorAlert(error));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendErrorAlert(error));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
    };
  }

  async sendScanSummary(summary) {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendScanSummary(summary));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendScanSummary(summary));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
    };
  }

  async broadcast(message, _type = 'info') {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const results = {
      discord: { success: false },
      telegram: { success: false },
    };

    // Send to Discord
    if (this.discordService.isConnected()) {
      results.discord = await this._retry(() => this.discordService.sendMessage(message));
    }

    // Send to Telegram
    if (this.telegramService.isConnected()) {
      results.telegram = await this._retry(() => this.telegramService.sendMessage(message));
    }

    const anySuccess = results.discord.success || results.telegram.success;
    return {
      success: anySuccess,
      results,
      message: anySuccess ? 'Broadcast sent' : 'Failed to broadcast',
    };
  }

  async testConnections() {
    const results = {
      discord: { success: false, message: 'Not connected' },
      telegram: { success: false, message: 'Not connected' },
    };

    if (this.discordService.isConnected()) {
      results.discord = await this.discordService.testConnection();
    }

    if (this.telegramService.isConnected()) {
      results.telegram = await this.telegramService.testConnection();
    }

    return results;
  }

  async disconnect() {
    await this.discordService.disconnect();
    await this.telegramService.disconnect();
    this.isInitialized = false;
    console.log('Notification Manager disconnected');
  }

  // Retry logic with exponential backoff
  async _retry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        if (result.success) {
          return result;
        }
        
        // If not success but no exception, wait and retry
        if (i < maxRetries - 1) {
          await this._sleep(this.retryDelay * (i + 1));
        }
      } catch (error) {
        console.error(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
        if (i < maxRetries - 1) {
          await this._sleep(this.retryDelay * (i + 1));
        } else {
          return { success: false, error: error.message };
        }
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new NotificationManager();
  }
  return instance;
}

module.exports = NotificationManager;
module.exports.getInstance = getInstance;

