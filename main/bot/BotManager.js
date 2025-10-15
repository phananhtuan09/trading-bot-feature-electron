const Scanner = require('./scanner');
const Order = require('./order');
const StateManager = require('../database/stateStore');
const ConfigManager = require('../database/configStore');
const BinanceService = require('./binanceService');
const { initialize: initNotifications } = require('./sendMessage');

class BotManager {
  constructor() {
    this.isRunning = false;
    this.isOrderActive = false;
    this.scanner = null;
    this.order = null;
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
    this.binanceService = new BinanceService();
    this.mainWindow = null;
    this.userWs = null; // To hold the WebSocket cleanup function
  }

  // Handles real-time account updates from Binance WebSocket
  handleAccountUpdate(data) {
    if (data.eventType === 'ACCOUNT_UPDATE') {
      // Update positions
      for (const position of data.updateData.updatedPositions) {
        const positionAmt = parseFloat(position.pa);
        const markPrice = parseFloat(position.mp);

        // Map abbreviated WebSocket property names to full names
        const positionUpdate = {
          symbol: position.s,
          positionAmt: positionAmt,
          unrealizedPnl: parseFloat(position.up),
          entryPrice: parseFloat(position.ep),
          markPrice: markPrice,
          // Calculate notional value (position value in USDT) for accurate PNL percentage
          notional: Math.abs(positionAmt) * markPrice,
        };

        // Update the state store silently
        this.stateManager.updateSinglePosition(positionUpdate);

        // Push the update to the UI
        this.emitPositionUpdate(positionUpdate);
      }

      // Update account balance (includes profit calculation)
      // This happens real-time when account balance changes
      if (data.updateData.balances) {
        this.stateManager.updateAccountData().catch(err => {
          console.error('Lỗi cập nhật dữ liệu tài khoản từ WebSocket:', err);
        });
      }
    }
    // We could also handle 'ORDER_TRADE_UPDATE' here if needed
  }

  setMainWindow(window) {
    this.mainWindow = window;
    // Also set mainWindow for order instance if it exists
    if (this.order) {
      this.order.setMainWindow(window);
    }
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Bot đang chạy rồi');
    }

    try {
      this.isRunning = true;

      // Initialize notification services
      await initNotifications();

      // Get current balance and set as initial capital if not already set
      const accountState = this.stateManager.getAccountState();
      if (!accountState.initialCapital || accountState.initialCapital === 0) {
        // Only try to get balance if API keys are configured
        if (this.stateManager.hasApiKeysConfigured()) {
          try {
            const balanceData = await this.binanceService.getAccountBalance();
            if (balanceData.success) {
              this.stateManager.setInitialCapital(balanceData.balance);
              console.log(`💰 Initial Capital set to: ${balanceData.balance} USDT`);
            }
          } catch (error) {
            console.log('⚠️ Could not get initial balance (API keys not configured or invalid)');
          }
        }
      }

      // Initialize bot components
      this.scanner = new Scanner();
      this.order = new Order();

      // Set mainWindow for order to send notifications
      if (this.mainWindow) {
        this.order.setMainWindow(this.mainWindow);
      }

      // Start scanning process
      await this.scanner.start();

      // Subscribe to real-time account updates (only if API keys are configured)
      if (this.stateManager.hasApiKeysConfigured()) {
        const wsCleanup = this.binanceService.subscribeToAccountUpdates(
          this.handleAccountUpdate.bind(this)
        );
        if (wsCleanup && typeof wsCleanup === 'function') {
          this.userWs = wsCleanup;
        } else {
          console.log('⚠️ WebSocket subscription failed or returned invalid cleanup function');
          this.userWs = null;
        }
      } else {
        console.log('⚠️ Skipping Binance WebSocket subscription (API keys not configured)');
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Bot đã khởi động thành công');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('❌ Lỗi khởi động bot:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;
      this.isOrderActive = false;

      // Stop components
      if (this.scanner) {
        await this.scanner.stop();
        this.scanner = null;
      }

      if (this.order) {
        await this.order.stop();
        this.order = null;
      }

      // Clean up WebSocket connection
      if (this.userWs && typeof this.userWs === 'function') {
        this.userWs(); // The cleanup function returned by the ws subscription
        this.userWs = null;
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Bot đã dừng thành công');
      return true;
    } catch (error) {
      console.error('❌ Lỗi dừng bot:', error);
      throw error;
    }
  }

  async startOrders() {
    if (!this.isRunning) {
      throw new Error('Bot phải chạy trước khi bắt đầu đặt lệnh');
    }

    if (this.isOrderActive) {
      throw new Error('Lệnh đang hoạt động rồi');
    }

    try {
      this.isOrderActive = true;

      if (this.order) {
        await this.order.start();
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Đã bắt đầu đặt lệnh thành công');
      return true;
    } catch (error) {
      this.isOrderActive = false;
      console.error('❌ Lỗi bắt đầu đặt lệnh:', error);
      throw error;
    }
  }

  async stopOrders() {
    if (!this.isOrderActive) {
      return;
    }

    try {
      this.isOrderActive = false;

      if (this.order) {
        await this.order.stop();
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Đã dừng đặt lệnh thành công');
      return true;
    } catch (error) {
      console.error('❌ Lỗi dừng đặt lệnh:', error);
      throw error;
    }
  }

  async startWithAutoOrder() {
    if (this.isRunning) {
      throw new Error('Bot đang chạy rồi');
    }

    try {
      this.isRunning = true;
      this.isOrderActive = true;

      // Initialize notification services
      await initNotifications();

      // Get current balance and set as initial capital if not already set
      const accountState = this.stateManager.getAccountState();
      if (!accountState.initialCapital || accountState.initialCapital === 0) {
        // Only try to get balance if API keys are configured
        if (this.stateManager.hasApiKeysConfigured()) {
          try {
            const balanceData = await this.binanceService.getAccountBalance();
            if (balanceData.success) {
              this.stateManager.setInitialCapital(balanceData.balance);
              console.log(`💰 Initial Capital set to: ${balanceData.balance} USDT`);
            }
          } catch (error) {
            console.log('⚠️ Could not get initial balance (API keys not configured or invalid)');
          }
        }
      }

      // Initialize bot components
      this.scanner = new Scanner();
      this.order = new Order();

      // Set mainWindow for order to send notifications
      if (this.mainWindow) {
        this.order.setMainWindow(this.mainWindow);
      }

      // Start order execution
      this.order.start();

      // Start scanning process with auto order callback
      const autoOrderCallback = async () => {
        console.log('🔄 Auto order callback triggered');
        if (this.isOrderActive && this.order) {
          try {
            console.log('📋 Executing auto order...');
            await this.order.execute();
          } catch (error) {
            console.error('❌ Error in auto order execution:', error);
          }
        } else {
          console.log('⚠️ Auto order not active or order not initialized');
        }
      };

      await this.scanner.start(autoOrderCallback);

      // Subscribe to real-time account updates (only if API keys are configured)
      if (this.stateManager.hasApiKeysConfigured()) {
        const wsCleanup = this.binanceService.subscribeToAccountUpdates(
          this.handleAccountUpdate.bind(this)
        );
        if (wsCleanup && typeof wsCleanup === 'function') {
          this.userWs = wsCleanup;
        } else {
          console.log('⚠️ WebSocket subscription failed or returned invalid cleanup function');
          this.userWs = null;
        }
      } else {
        console.log('⚠️ Skipping Binance WebSocket subscription (API keys not configured)');
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Bot với tự động đặt lệnh đã khởi động thành công');
      return true;
    } catch (error) {
      this.isRunning = false;
      this.isOrderActive = false;
      console.error('❌ Lỗi khởi động bot với tự động đặt lệnh:', error);
      throw error;
    }
  }

  async stopWithAutoOrder() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;
      this.isOrderActive = false;

      // Stop components
      if (this.scanner) {
        await this.scanner.stop();
        this.scanner = null;
      }

      if (this.order) {
        await this.order.stop();
        this.order = null;
      }

      // Clean up WebSocket connection
      if (this.userWs && typeof this.userWs === 'function') {
        this.userWs(); // The cleanup function returned by the ws subscription
        this.userWs = null;
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('✅ Bot với tự động đặt lệnh đã dừng thành công');
      return true;
    } catch (error) {
      console.error('❌ Lỗi dừng bot với tự động đặt lệnh:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isOrderActive: this.isOrderActive,
      lastScan: this.scanner?.getLastScanTime() || null,
      totalSignals: this.stateManager.getTotalSignals(),
      activePositions: this.stateManager.getActivePositions(),
    };
  }

  emitStatusUpdate() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('bot:status-update', this.getStatus());
    }
  }

  emitNewSignal(signal) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('signal:new', signal);
    }
  }

  emitPositionUpdate(position) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('position:update', position);
    }
  }
}

module.exports = BotManager;
