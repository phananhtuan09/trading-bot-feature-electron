class Settings {
  constructor() {
    this.api = new ElectronAPI();
    this.currentConfig = null;
    this.isModalOpen = false;
    this.init();
  }

  async init() {
    try {
      console.log('Đang khởi tạo Settings...');
      await this.loadSettings();
      this.setupEventListeners();
      console.log('Settings đã khởi tạo thành công');
    } catch (error) {
      console.error('Không thể khởi tạo Settings:', error);
    }
  }

  async loadSettings() {
    try {
      this.currentConfig = await this.api.getConfig();
      if (this.currentConfig) {
        this.populateForms(this.currentConfig);
      }
    } catch (error) {
      console.error('Lỗi khi tải cài đặt:', error);
    }
  }

  populateForms(config) {
    // Strategy settings
    this.setValue('interval', config.STRATEGY_CONFIG?.INTERVAL || '1h');
    this.setValue('maxSymbols', config.STRATEGY_CONFIG?.MAX_SYMBOLS || 500);
    this.setValue('concurrencyLimit', config.STRATEGY_CONFIG?.CONCURRENCY_LIMIT || 20);
    this.setValue('maxCandlesHold', config.STRATEGY_CONFIG?.MAX_CANDLES_HOLD || 96);

    // Filter settings
    this.setValue('trendMaPeriod', config.STRATEGY_CONFIG?.FILTER?.TREND_MA_PERIOD || 200);
    this.setValue('minTradeVolume', config.STRATEGY_CONFIG?.FILTER?.MIN_TRADE_VOLUME || 1000000);
    this.setValue('minConfidenceScore', config.STRATEGY_CONFIG?.FILTER?.MIN_CONFIDENCE_SCORE || 60);

    // Bollinger Bands
    this.setValue('bbPeriod', config.STRATEGY_CONFIG?.BOLLINGER_BAND?.PERIOD || 20);
    this.setValue('bbStdDev', config.STRATEGY_CONFIG?.BOLLINGER_BAND?.STD_DEV || 2);

    // RSI
    this.setValue('rsiPeriod', config.STRATEGY_CONFIG?.RSI?.PERIOD || 14);

    // MACD
    this.setValue('macdFastPeriod', config.STRATEGY_CONFIG?.MACD?.FAST_PERIOD || 12);
    this.setValue('macdSlowPeriod', config.STRATEGY_CONFIG?.MACD?.SLOW_PERIOD || 26);
    this.setValue('macdSignalPeriod', config.STRATEGY_CONFIG?.MACD?.SIGNAL_PERIOD || 9);

    // EMA
    this.setValue('emaShortPeriod', config.STRATEGY_CONFIG?.EMA_PERIODS?.SHORT || 20);
    this.setValue('emaLongPeriod', config.STRATEGY_CONFIG?.EMA_PERIODS?.LONG || 50);

    // ADX
    this.setValue('adxPeriod', config.STRATEGY_CONFIG?.ADX?.PERIOD || 14);

    // ATR
    this.setValue('atrPeriod', config.STRATEGY_CONFIG?.ATR?.PERIOD || 14);

    // Binance settings
    this.setValue('testingMode', config.BINANCE?.IS_TESTING ? 'true' : 'false');
    this.setValue('apiKey', config.BINANCE?.API_KEY || '');
    this.setValue('apiSecret', config.BINANCE?.API_SECRET || '');

    // Discord settings
    this.setValue('discordEnabled', config.DISCORD?.IS_ENABLED ? 'true' : 'false');
    this.setValue('discordToken', config.DISCORD?.BOT_TOKEN || '');
    this.setValue('discordChannelId', config.DISCORD?.CHANNEL_ID || '');

    // Telegram settings
    this.setValue('telegramEnabled', config.TELEGRAM?.IS_ENABLED ? 'true' : 'false');
    this.setValue('telegramToken', config.TELEGRAM?.BOT_TOKEN || '');
    this.setValue('telegramChatId', config.TELEGRAM?.CHAT_ID || '');

    // Order settings
    this.setValue('leverage', config.ORDER_SETTINGS?.LEVERAGE || 20);
    this.setValue('quantity', config.ORDER_SETTINGS?.QUANTITY || 10);
    this.setValue('maxOrdersPerDay', config.ORDER_SETTINGS?.MAX_ORDERS_PER_DAY || 10);
    this.setValue('orderLimitPerScan', config.ORDER_SETTINGS?.ORDER_LIMIT_PER_SCAN || 3);

    // Bot settings
    this.setValue('scanInterval', config.CONFIG?.SCAN_INTERVAL || 3600000);
    this.setValue('loggingEnabled', config.CONFIG?.IS_LOG_ENABLED ? 'true' : 'false');

    // Risk management
    this.setValue('riskMinConfidence', config.STRATEGY_CONFIG?.FILTER?.MIN_CONFIDENCE_SCORE || 10);
    this.setValue('riskMaxCandles', config.STRATEGY_CONFIG?.MAX_CANDLES_HOLD || 96);
  }

  setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value;
    }
  }

  getValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : null;
  }

  setupEventListeners() {
    // Modal controls
    document
      .getElementById('closeSettingsModal')
      ?.addEventListener('click', () => this.closeModal());
    document
      .getElementById('saveSettingsBtn')
      ?.addEventListener('click', () => this.saveSettings());
    document
      .getElementById('resetSettingsBtn')
      ?.addEventListener('click', () => this.resetSettings());

    // Close modal when clicking outside
    document.getElementById('settingsModal')?.addEventListener('click', e => {
      if (e.target.id === 'settingsModal') {
        this.closeModal();
      }
    });
  }

  openModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('active');
      this.isModalOpen = true;
      this.loadSettings(); // Refresh settings when opening
    }
  }

  closeModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
      this.isModalOpen = false;
    }
  }

  async saveSettings() {
    try {
      const config = this.collectFormData();

      // Validate config
      this.validateConfig(config);

      // Show loading
      this.showLoading('saveSettingsBtn');

      // Save config
      const result = await this.api.saveConfig(config);

      this.hideLoading('saveSettingsBtn');

      if (result.success) {
        this.showNotification('Cài đặt đã lưu thành công', 'success');
        this.currentConfig = config;
        this.closeModal();
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading('saveSettingsBtn');
      this.showNotification(`Lỗi khi lưu cài đặt: ${error.message}`, 'error');
    }
  }

  collectFormData() {
    return {
      STRATEGY_CONFIG: {
        INTERVAL: this.getValue('interval'),
        QUOTE_ASSET: this.getValue('quoteAsset'),
        MAX_SYMBOLS: parseInt(this.getValue('maxSymbols')),
        CONCURRENCY_LIMIT: parseInt(this.getValue('concurrencyLimit')),
        MAX_CANDLES_HOLD: parseInt(this.getValue('maxCandlesHold')),
        BOLLINGER_BAND: {
          PERIOD: parseInt(this.getValue('bbPeriod')),
          STD_DEV: parseFloat(this.getValue('bbStdDev')),
        },
        RSI: {
          PERIOD: parseInt(this.getValue('rsiPeriod')),
        },
        MACD: {
          FAST_PERIOD: parseInt(this.getValue('macdFastPeriod')),
          SLOW_PERIOD: parseInt(this.getValue('macdSlowPeriod')),
          SIGNAL_PERIOD: parseInt(this.getValue('macdSignalPeriod')),
        },
        EMA_PERIODS: {
          SHORT: parseInt(this.getValue('emaShortPeriod')),
          LONG: parseInt(this.getValue('emaLongPeriod')),
        },
        ADX: {
          PERIOD: parseInt(this.getValue('adxPeriod')),
        },
        ATR: {
          PERIOD: parseInt(this.getValue('atrPeriod')),
        },
        FILTER: {
          TREND_MA_PERIOD: parseInt(this.getValue('trendMaPeriod')),
          MIN_TRADE_VOLUME: parseInt(this.getValue('minTradeVolume')),
          MIN_CONFIDENCE_SCORE: parseInt(this.getValue('minConfidenceScore')),
        },
      },
      BINANCE: {
        IS_TESTING: this.getValue('testingMode') === 'true',
        API_KEY: this.getValue('apiKey'),
        API_SECRET: this.getValue('apiSecret'),
        TEST_API_KEY: this.getValue('apiKey'), // Sử dụng cùng API key
        TEST_API_SECRET: this.getValue('apiSecret'), // Sử dụng cùng API secret
      },
      DISCORD: {
        IS_ENABLED: this.getValue('discordEnabled') === 'true',
        BOT_TOKEN: this.getValue('discordToken'),
        CHANNEL_ID: this.getValue('discordChannelId'),
      },
      TELEGRAM: {
        IS_ENABLED: this.getValue('telegramEnabled') === 'true',
        BOT_TOKEN: this.getValue('telegramToken'),
        CHAT_ID: this.getValue('telegramChatId'),
      },
      CONFIG: {
        IS_LOG_ENABLED: this.getValue('loggingEnabled') === 'true',
        SCAN_INTERVAL: parseInt(this.getValue('scanInterval')),
      },
      ORDER_SETTINGS: {
        LEVERAGE: parseInt(this.getValue('leverage')),
        QUANTITY: parseInt(this.getValue('quantity')),
        MAX_ORDERS_PER_DAY: parseInt(this.getValue('maxOrdersPerDay')),
        ORDER_LIMIT_PER_SCAN: parseInt(this.getValue('orderLimitPerScan')),
      },
    };
  }

  validateConfig(config) {
    // Basic validation
    if (!config.STRATEGY_CONFIG) {
      throw new Error('Cấu hình chiến lược là bắt buộc');
    }

    if (!config.BINANCE) {
      throw new Error('Cấu hình Binance là bắt buộc');
    }

    if (!config.ORDER_SETTINGS) {
      throw new Error('Cài đặt lệnh là bắt buộc');
    }

    // Validate required fields
    if (config.BINANCE.IS_TESTING === false) {
      if (!config.BINANCE.API_KEY || !config.BINANCE.API_SECRET) {
        throw new Error('Binance API Key và Secret là bắt buộc cho chế độ sản xuất');
      }
    }

    // Validate numeric values
    if (config.ORDER_SETTINGS.LEVERAGE < 1 || config.ORDER_SETTINGS.LEVERAGE > 125) {
      throw new Error('Đòn bẩy phải từ 1 đến 125');
    }

    if (config.ORDER_SETTINGS.QUANTITY < 1) {
      throw new Error('Số tiền phải lớn hơn 0');
    }

    if (config.CONFIG.SCAN_INTERVAL < 60000) {
      throw new Error('Khoảng thời gian quét phải ít nhất 60 giây');
    }
  }

  async resetSettings() {
    if (confirm('Bạn có chắc chắn muốn đặt lại tất cả cài đặt về giá trị mặc định?')) {
      try {
        // Reset to default values
        this.populateForms({
          STRATEGY_CONFIG: {
            INTERVAL: '1h',
            QUOTE_ASSET: 'USDT',
            MAX_SYMBOLS: 500,
            CONCURRENCY_LIMIT: 20,
            MAX_CANDLES_HOLD: 96,
            BOLLINGER_BAND: { PERIOD: 20, STD_DEV: 2 },
            RSI: { PERIOD: 14 },
            MACD: { FAST_PERIOD: 12, SLOW_PERIOD: 26, SIGNAL_PERIOD: 9 },
            EMA_PERIODS: { SHORT: 20, LONG: 50 },
            ADX: { PERIOD: 14 },
            ATR: { PERIOD: 14 },
            FILTER: { TREND_MA_PERIOD: 200, MIN_TRADE_VOLUME: 1000000, MIN_CONFIDENCE_SCORE: 60 },
          },
          BINANCE: { IS_TESTING: false, API_KEY: '', API_SECRET: '' },
          DISCORD: { IS_ENABLED: false, BOT_TOKEN: '', CHANNEL_ID: '' },
          TELEGRAM: { IS_ENABLED: false, BOT_TOKEN: '', CHAT_ID: '' },
          CONFIG: { IS_LOG_ENABLED: true, SCAN_INTERVAL: 3600000 },
          ORDER_SETTINGS: {
            LEVERAGE: 20,
            QUANTITY: 10,
            MAX_ORDERS_PER_DAY: 10,
            ORDER_LIMIT_PER_SCAN: 3,
          },
        });

        this.showNotification('Cài đặt đã đặt lại về mặc định', 'info');
      } catch (error) {
        this.showNotification(`Lỗi khi đặt lại cài đặt: ${error.message}`, 'error');
      }
    }
  }

  showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('loading');
      button.disabled = true;
    }
  }

  hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 3000;
      animation: slideInRight 0.3s;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  cleanup() {
    // Clean up any event listeners or intervals
    console.log('Settings cleanup completed');
  }
}

// Tab switching functions
function switchSettingsTab(tabName, event) {
  // Remove active class from all tabs and contents
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.modal-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Add active class to selected tab and content
  if (event && event.target) {
    event.target.classList.add('active');
  }
  document.getElementById(tabName).classList.add('active');
}

// Export for global access
window.Settings = Settings;
window.switchSettingsTab = switchSettingsTab;
