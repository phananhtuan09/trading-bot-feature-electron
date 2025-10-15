const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const BotManager = require('./bot/BotManager');
const ConfigManager = require('./database/configStore');
const StateManager = require('./database/stateStore');
const { overrideConsole } = require('./bot/logger'); // Import the new function

class TradingBotApp {
  constructor() {
    this.botManager = new BotManager();
    this.configManager = new ConfigManager();
    this.stateManager = new StateManager();
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    this.overrideConsole = overrideConsole; // Add method to class
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
      icon: path.join(__dirname, '..', 'build', 'icons', 'trading-crypto-bot.ico'),
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

    // Set main window reference in bot manager and state manager
    this.botManager.setMainWindow(this.mainWindow);
    this.stateManager.setMainWindow(this.mainWindow);

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
        return { success: true, message: 'Bot đã khởi động thành công' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:stop', async () => {
      try {
        await this.botManager.stop();
        return { success: true, message: 'Bot đã dừng thành công' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:startOrders', async () => {
      try {
        await this.botManager.startOrders();
        return { success: true, message: 'Đã bắt đầu đặt lệnh thành công' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:stopOrders', async () => {
      try {
        await this.botManager.stopOrders();
        return { success: true, message: 'Đã dừng đặt lệnh thành công' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:start-with-auto-order', async () => {
      try {
        await this.botManager.startWithAutoOrder();
        return { success: true, message: 'Bot với tự động đặt lệnh đã khởi động thành công' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('bot:stop-with-auto-order', async () => {
      try {
        await this.botManager.stopWithAutoOrder();
        return { success: true, message: 'Bot với tự động đặt lệnh đã dừng thành công' };
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
        // Only update positions from Binance if bot is running
        if (this.botManager.isRunning) {
          await this.stateManager.updatePositionsData();
        }
        return this.stateManager.getPositions();
      } catch (error) {
        console.error('Lỗi lấy danh sách vị thế:', error);
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
        // Only update data from Binance if bot is running
        if (this.botManager.isRunning) {
          // Run updates in parallel for better performance, but handle errors individually
          await Promise.allSettled([
            this.stateManager.updateAccountData().catch(err => {
              console.error('⚠️ Failed to update account data:', err.message);
            }),
            this.stateManager.calculateStatistics().catch(err => {
              console.error('⚠️ Failed to calculate statistics:', err.message);
            }),
            // Check all connections status (Binance, Discord, Telegram)
            this.stateManager.checkAllConnections().catch(err => {
              console.error(
                '⚠️ Kiểm tra kết nối thất bại (sẽ hiển thị là ngắt kết nối):',
                err.message
              );
            }),
          ]);
        } else {
          // Only calculate statistics from cached data when bot is not running
          await this.stateManager.calculateStatistics().catch(err => {
            console.error('⚠️ Failed to calculate statistics:', err.message);
          });
        }

        return this.stateManager.getStats();
      } catch (error) {
        console.error('Lỗi lấy thống kê:', error);
        return this.stateManager.getStats();
      }
    });

    // Position management handlers
    ipcMain.handle('position:close', async (event, symbol, side) => {
      try {
        const result = await this.stateManager.closePositionReal(symbol, side);
        return result;
      } catch (error) {
        console.error('Lỗi đóng vị thế:', error);
        return { success: false, error: error.message };
      }
    });

    // Signal execution handlers
    ipcMain.handle('signal:execute', async (event, signalId) => {
      try {
        const result = await this.stateManager.executeSignalReal(signalId);
        return result;
      } catch (error) {
        console.error('Lỗi thực thi tín hiệu:', error);
        return { success: false, error: error.message };
      }
    });

    // Connection status handlers
    ipcMain.handle('connection:check', async () => {
      try {
        // Only check Binance connection if we have credentials configured
        // Don't require bot to be running for connection check
        const results = await this.stateManager.checkAllConnections();
        return results;
      } catch (error) {
        console.error('Lỗi kiểm tra kết nối:', error);
        return {
          binance: { connected: false, error: error.message },
          discord: { connected: false, error: 'Kiểm tra thất bại' },
          telegram: { connected: false, error: 'Kiểm tra thất bại' },
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

    // Notification handlers
    ipcMain.handle('notifications:reinitialize', async () => {
      try {
        const { reinitialize } = require('./bot/sendMessage');
        const result = await reinitialize();
        return { success: result };
      } catch (error) {
        console.error('Lỗi khởi tạo lại thông báo:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('notifications:test-discord', async () => {
      try {
        const { testConnections } = require('./bot/sendMessage');
        const results = await testConnections();
        return results.discord;
      } catch (error) {
        console.error('Lỗi kiểm tra Discord:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('notifications:test-telegram', async () => {
      try {
        const { reinitialize, testConnections } = require('./bot/sendMessage');

        // Reinitialize với config mới nhất trước khi test
        console.log('🔄 Reinitializing notification services...');
        await reinitialize();

        const results = await testConnections();
        return results.telegram;
      } catch (error) {
        console.error('Lỗi kiểm tra Telegram:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('notifications:test-telegram-with-config', async (event, config) => {
      try {
        const { testConnections } = require('./bot/sendMessage');

        // Test với config được truyền vào (không cần reinitialize)
        console.log('🔄 Testing Telegram với config từ UI...');
        const results = await testConnections(config);
        return results.telegram;
      } catch (error) {
        console.error('Lỗi kiểm tra Telegram với config:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('app:get-version', async () => {
      try {
        const packageJson = require('../package.json');
        return packageJson.version;
      } catch (error) {
        console.error('Lỗi khi lấy version:', error);
        return '1.0.0';
      }
    });

    ipcMain.handle('telegram:get-chat-id', async (event, token) => {
      try {
        const axios = require('axios');

        // Bước 1: Verify bot token
        const meResponse = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        if (!meResponse.data.ok) {
          return { success: false, error: 'Bot token không hợp lệ' };
        }

        // Bước 2: Lấy updates để tìm chat ID
        const updatesResponse = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);

        if (!updatesResponse.data.ok) {
          return { success: false, error: 'Không thể lấy updates từ Telegram' };
        }

        const updates = updatesResponse.data.result;

        if (updates.length === 0) {
          return {
            success: false,
            error: 'Chưa có tin nhắn nào. Vui lòng gửi "/start" cho bot và thử lại',
          };
        }

        // Lấy chat ID từ tin nhắn gần nhất
        const lastUpdate = updates[updates.length - 1];
        const chatId = lastUpdate.message?.chat?.id || lastUpdate.my_chat_member?.chat?.id;

        if (!chatId) {
          return {
            success: false,
            error: 'Không tìm thấy Chat ID. Vui lòng gửi tin nhắn cho bot và thử lại',
          };
        }

        return {
          success: true,
          chatId: chatId.toString(),
          botInfo: meResponse.data.result,
        };
      } catch (error) {
        console.error('Lỗi lấy Telegram Chat ID:', error);
        return {
          success: false,
          error: error.response?.data?.description || error.message,
        };
      }
    });

    // Signal to renderer that backend is ready
    this.mainWindow.webContents.send('backend-ready');
  }

  setupAutoUpdater() {
    // Only check for updates in production
    if (!this.isDev) {
      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on('checking-for-update', () => {
        console.log('Đang kiểm tra cập nhật...');
      });

      autoUpdater.on('update-available', info => {
        console.log('Có bản cập nhật:', info);
        if (this.mainWindow) {
          this.mainWindow.webContents.send('update-available', info);
        }
      });

      autoUpdater.on('update-not-available', info => {
        console.log('Không có bản cập nhật mới:', info);
      });

      autoUpdater.on('error', err => {
        console.log('Lỗi trong quá trình cập nhật:', err);
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
    this.overrideConsole(); // Activate console override
    try {
      // Initialize managers
      await this.configManager.initialize();
      await this.stateManager.initialize();

      // Create window
      await this.createWindow();

      console.log('✅ Trading Bot đã khởi tạo thành công');
    } catch (error) {
      console.error('❌ Lỗi khởi tạo ứng dụng:', error);
      dialog.showErrorBox('Lỗi khởi tạo', error.message);
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
  contents.on('new-window', (newEvent, _navigationUrl) => {
    newEvent.preventDefault();
  });
});
