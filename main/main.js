const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const BotManager = require('./bot/BotManager');
const ConfigManager = require('./database/configStore');
const StateManager = require('./database/stateStore');

class TradingBotApp {
  constructor() {
    this.botManager = new BotManager();
    this.configManager = new ConfigManager();
    this.stateManager = new StateManager();
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
  }

  async createWindow() {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      icon: path.join(__dirname, 'build/icons/icon.png'),
      titleBarStyle: 'default',
      show: true, // Show immediately on Linux
      center: true,
      alwaysOnTop: false,
    });

    // Load the app
    await this.mainWindow.loadFile('renderer/index.html');

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();

      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Set main window reference in bot manager
    this.botManager.setMainWindow(this.mainWindow);

    // Setup IPC handlers
    this.setupIpcHandlers();

    // Setup auto updater
    this.setupAutoUpdater();
  }

  setupIpcHandlers() {
    // Bot control handlers
    ipcMain.handle('bot:start', async () => {
      try {
        await this.botManager.start();
        return { success: true, message: 'Bot started successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:stop', async () => {
      try {
        await this.botManager.stop();
        return { success: true, message: 'Bot stopped successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:startOrders', async () => {
      try {
        await this.botManager.startOrders();
        return { success: true, message: 'Orders started successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:stopOrders', async () => {
      try {
        await this.botManager.stopOrders();
        return { success: true, message: 'Orders stopped successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:status', () => {
      return this.botManager.getStatus();
    });

    // Configuration handlers
    ipcMain.handle('config:get', () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('config:save', async (event, config) => {
      try {
        await this.configManager.saveConfig(config);
        return { success: true, message: 'Configuration saved successfully' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Data handlers
    ipcMain.handle('data:positions', async () => {
      try {
        // Update positions from Binance
        await this.stateManager.updatePositionsData();
        return this.stateManager.getPositions();
      } catch (error) {
        console.error('Error getting positions:', error);
        return [];
      }
    });

    ipcMain.handle('data:signals', () => {
      return this.stateManager.getSignals();
    });

    ipcMain.handle('data:logs', () => {
      return this.stateManager.getLogs();
    });

    ipcMain.handle('data:stats', async () => {
      try {
        // Update account data from Binance
        await this.stateManager.updateAccountData();
        // Calculate statistics
        await this.stateManager.calculateStatistics();
        return this.stateManager.getStats();
      } catch (error) {
        console.error('Error getting stats:', error);
        return this.stateManager.getStats();
      }
    });

    // Position management handlers
    ipcMain.handle('position:close', async (event, symbol, side) => {
      try {
        const result = await this.stateManager.closePositionReal(symbol, side);
        return result;
      } catch (error) {
        console.error('Error closing position:', error);
        return { success: false, error: error.message };
      }
    });

    // Signal execution handlers
    ipcMain.handle('signal:execute', async (event, signalId) => {
      try {
        const result = await this.stateManager.executeSignalReal(signalId);
        return result;
      } catch (error) {
        console.error('Error executing signal:', error);
        return { success: false, error: error.message };
      }
    });

    // Connection status handlers
    ipcMain.handle('connection:check', async () => {
      try {
        const binanceResult = await this.stateManager.checkBinanceConnection();
        return {
          binance: binanceResult,
          discord: { connected: false, error: 'Not implemented' },
          telegram: { connected: false, error: 'Not implemented' },
        };
      } catch (error) {
        console.error('Error checking connections:', error);
        return {
          binance: { connected: false, error: error.message },
          discord: { connected: false, error: 'Not implemented' },
          telegram: { connected: false, error: 'Not implemented' },
        };
      }
    });

    // Update handlers
    ipcMain.handle('update:check', () => {
      return autoUpdater.checkForUpdatesAndNotify();
    });

    ipcMain.handle('update:install', () => {
      autoUpdater.quitAndInstall();
    });
  }

  setupAutoUpdater() {
    // Only check for updates in production
    if (!this.isDev) {
      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
      });

      autoUpdater.on('update-available', info => {
        console.log('Update available:', info);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('update-available', info);
        }
      });

      autoUpdater.on('update-not-available', info => {
        console.log('Update not available:', info);
      });

      autoUpdater.on('error', err => {
        console.log('Error in auto-updater:', err);
      });

      autoUpdater.on('download-progress', progressObj => {
        if (this.mainWindow) {
          this.mainWindow.webContents.send('download-progress', progressObj);
        }
      });

      autoUpdater.on('update-downloaded', info => {
        console.log('Update downloaded:', info);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('update-downloaded', info);
        }
      });
    }
  }

  async initialize() {
    try {
      // Initialize managers
      await this.configManager.initialize();
      await this.stateManager.initialize();

      // Create window
      await this.createWindow();

      console.log('Trading Bot App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      dialog.showErrorBox('Initialization Error', error.message);
    }
  }
}

// Create app instance
const tradingBotApp = new TradingBotApp();

// App event handlers
app.whenReady().then(() => {
  tradingBotApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    tradingBotApp.createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
