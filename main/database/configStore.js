const Store = require('electron-store');

class ConfigManager {
  constructor() {
    this.store = new Store({
      name: 'config',
      defaults: {
        // Strategy Configuration
        STRATEGY_CONFIG: {
          INTERVAL: '1h',
          QUOTE_ASSET: 'USDT',
          MAX_SYMBOLS: 500,
          EXCHANGE_INFO_CACHE_TIME: 3600000,
          CONCURRENCY_LIMIT: 20,
          MAX_CANDLES_HOLD: 96,
          BOLLINGER_BAND: {
            PERIOD: 20,
            STD_DEV: 2,
          },
          RSI: {
            PERIOD: 14,
          },
          MACD: {
            FAST_PERIOD: 12,
            SLOW_PERIOD: 26,
            SIGNAL_PERIOD: 9,
          },
          EMA_PERIODS: {
            SHORT: 20,
            LONG: 50,
          },
          ADX: {
            PERIOD: 14,
          },
          FILTER: {
            TREND_MA_PERIOD: 200,
            MIN_TRADE_VOLUME: 1000000,
            MIN_CONFIDENCE_SCORE: 60,
          },
          ATR: {
            PERIOD: 14,
          },
        },

        // Binance Configuration
        BINANCE: {
          API_KEY: '',
          API_SECRET: '',
          TEST_API_KEY: '',
          TEST_API_SECRET: '',
          IS_TESTING: false,
        },

        // Discord Configuration
        DISCORD: {
          BOT_TOKEN: '',
          IS_ENABLED: false,
          CHANNEL_ID: '',
        },

        // Telegram Configuration
        TELEGRAM: {
          BOT_TOKEN: '',
          CHAT_ID: '',
          IS_ENABLED: false,
        },

        // App Configuration
        CONFIG: {
          IS_LOG_ENABLED: true,
          SCAN_INTERVAL: 3600000,
        },

        // Order Settings
        ORDER_SETTINGS: {
          LEVERAGE: 20,
          QUANTITY: 10,
          MAX_ORDERS_PER_DAY: 10,
          ORDER_LIMIT_PER_SCAN: 3,
        },
      },
    });
  }

  async initialize() {
    try {
      console.log('ConfigManager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize ConfigManager:', error);
      throw error;
    }
  }

  getConfig() {
    return this.store.store;
  }

  async saveConfig(config) {
    try {
      // Validate config before saving
      this.validateConfig(config);

      // Save to store
      this.store.set(config);

      console.log('Configuration saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  validateConfig(config) {
    // Basic validation
    if (!config.STRATEGY_CONFIG) {
      throw new Error('STRATEGY_CONFIG is required');
    }

    if (!config.BINANCE) {
      throw new Error('BINANCE config is required');
    }

    if (!config.ORDER_SETTINGS) {
      throw new Error('ORDER_SETTINGS is required');
    }

    // Validate required fields
    if (config.BINANCE.IS_TESTING === false) {
      if (!config.BINANCE.API_KEY || !config.BINANCE.API_SECRET) {
        throw new Error('Binance API Key and Secret are required for production mode');
      }
    }

    if (config.BINANCE.IS_TESTING === true) {
      // Sử dụng TEST_API_KEY nếu có, nếu không thì dùng API_KEY
      const apiKey = config.BINANCE.TEST_API_KEY || config.BINANCE.API_KEY;
      const apiSecret = config.BINANCE.TEST_API_SECRET || config.BINANCE.API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('Binance API Key and Secret are required for testing mode');
      }
    }
  }

  getStrategyConfig() {
    return this.store.get('STRATEGY_CONFIG');
  }

  getBinanceConfig() {
    return this.store.get('BINANCE');
  }

  getOrderSettings() {
    return this.store.get('ORDER_SETTINGS');
  }

  getDiscordConfig() {
    return this.store.get('DISCORD');
  }

  getTelegramConfig() {
    return this.store.get('TELEGRAM');
  }

  updateStrategyConfig(strategyConfig) {
    this.store.set('STRATEGY_CONFIG', strategyConfig);
  }

  updateBinanceConfig(binanceConfig) {
    this.store.set('BINANCE', binanceConfig);
  }

  updateOrderSettings(orderSettings) {
    this.store.set('ORDER_SETTINGS', orderSettings);
  }

  // Reset to defaults
  resetToDefaults() {
    this.store.clear();
    console.log('Configuration reset to defaults');
  }

  // Export config
  exportConfig() {
    return JSON.stringify(this.store.store, null, 2);
  }

  // Import config
  importConfig(configJson) {
    try {
      const config = JSON.parse(configJson);
      this.validateConfig(config);
      this.store.set(config);
      console.log('Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      throw error;
    }
  }
}

module.exports = ConfigManager;
