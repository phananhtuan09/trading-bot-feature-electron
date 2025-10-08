const Scanner = require('./scanner');
const Order = require('./order');
const StateManager = require('../database/stateStore');
const ConfigManager = require('../database/configStore');
const BinanceService = require('./binanceService');

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
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Bot is already running');
    }

    try {
      this.isRunning = true;

      // Initialize bot components
      this.scanner = new Scanner();
      this.order = new Order(this.scanner); // Truyền scanner vào Order

      // Start scanning process
      await this.scanner.start();

      // Emit status update
      this.emitStatusUpdate();

      console.log('Bot started successfully');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start bot:', error);
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

      // Emit status update
      this.emitStatusUpdate();

      console.log('Bot stopped successfully');
      return true;
    } catch (error) {
      console.error('Failed to stop bot:', error);
      throw error;
    }
  }

  async startOrders() {
    if (!this.isRunning) {
      throw new Error('Bot must be running before starting orders');
    }

    if (this.isOrderActive) {
      throw new Error('Orders are already active');
    }

    try {
      this.isOrderActive = true;

      if (this.order) {
        await this.order.start();
      }

      // Emit status update
      this.emitStatusUpdate();

      console.log('Orders started successfully');
      return true;
    } catch (error) {
      this.isOrderActive = false;
      console.error('Failed to start orders:', error);
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

      console.log('Orders stopped successfully');
      return true;
    } catch (error) {
      console.error('Failed to stop orders:', error);
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
