class ElectronAPI {
  constructor() {
    this.setupIpcListeners();
  }

  // Bot control methods
  async startBot() {
    try {
      return await window.electronAPI.startBot();
    } catch (error) {
      console.error('Lỗi khi khởi động bot:', error);
      throw error;
    }
  }

  async stopBot() {
    try {
      return await window.electronAPI.stopBot();
    } catch (error) {
      console.error('Lỗi khi dừng bot:', error);
      throw error;
    }
  }

  async startOrders() {
    try {
      return await window.electronAPI.startOrders();
    } catch (error) {
      console.error('Lỗi khi khởi động lệnh:', error);
      throw error;
    }
  }

  async stopOrders() {
    try {
      return await window.electronAPI.stopOrders();
    } catch (error) {
      console.error('Lỗi khi dừng lệnh:', error);
      throw error;
    }
  }

  async getBotStatus() {
    try {
      return await window.electronAPI.getBotStatus();
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái bot:', error);
      return null;
    }
  }

  // Configuration methods
  async getConfig() {
    try {
      return await window.electronAPI.getConfig();
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình:', error);
      return null;
    }
  }

  async saveConfig(config) {
    try {
      return await window.electronAPI.saveConfig(config);
    } catch (error) {
      console.error('Lỗi khi lưu cấu hình:', error);
      throw error;
    }
  }

  // Data methods
  async getPositions() {
    try {
      return await window.electronAPI.getPositions();
    } catch (error) {
      console.error('Lỗi khi lấy vị thế:', error);
      return [];
    }
  }

  async getSignals() {
    try {
      return await window.electronAPI.getSignals();
    } catch (error) {
      console.error('Lỗi khi lấy tín hiệu:', error);
      return [];
    }
  }

  async getLogs() {
    try {
      return await window.electronAPI.getLogs();
    } catch (error) {
      console.error('Lỗi khi lấy logs:', error);
      return [];
    }
  }

  async getStats() {
    try {
      return await window.electronAPI.getStats();
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
      return null;
    }
  }

  // Position management methods
  async closePosition(symbol, side) {
    try {
      return await window.electronAPI.closePosition(symbol, side);
    } catch (error) {
      console.error('Lỗi khi đóng vị thế:', error);
      return { success: false, error: error.message };
    }
  }

  // Signal execution methods
  async executeSignal(signalId) {
    try {
      return await window.electronAPI.executeSignal(signalId);
    } catch (error) {
      console.error('Lỗi khi thực thi tín hiệu:', error);
      return { success: false, error: error.message };
    }
  }

  // Connection status methods
  async checkConnections() {
    try {
      return await window.electronAPI.checkConnections();
    } catch (error) {
      console.error('Lỗi khi kiểm tra kết nối:', error);
      return { success: false, error: error.message };
    }
  }

  // Update methods
  async checkForUpdates() {
    try {
      return await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('Lỗi khi kiểm tra bản cập nhật:', error);
      return null;
    }
  }

  async installUpdate() {
    try {
      return await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Lỗi khi cài đặt bản cập nhật:', error);
      throw error;
    }
  }

  // Notification methods
  async reinitializeNotifications() {
    try {
      return await window.electronAPI.reinitializeNotifications();
    } catch (error) {
      console.error('Lỗi khi reinitialize notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async testDiscordConnection() {
    try {
      return await window.electronAPI.testDiscordConnection();
    } catch (error) {
      console.error('Lỗi khi test Discord connection:', error);
      return { success: false, error: error.message };
    }
  }

  async testTelegramConnection() {
    try {
      return await window.electronAPI.invoke('notifications:test-telegram');
    } catch (error) {
      console.error('Lỗi khi test Telegram connection:', error);
      return { success: false, error: error.message };
    }
  }

  async testTelegramConnectionWithConfig(config) {
    try {
      return await window.electronAPI.invoke('notifications:test-telegram-with-config', config);
    } catch (error) {
      console.error('Lỗi khi test Telegram connection với config:', error);
      return { success: false, error: error.message };
    }
  }

  async getTelegramChatId(token) {
    try {
      return await window.electronAPI.invoke('telegram:get-chat-id', token);
    } catch (error) {
      console.error('Lỗi khi lấy Telegram Chat ID:', error);
      return { success: false, error: error.message };
    }
  }

  async getAppVersion() {
    try {
      return await window.electronAPI.invoke('app:get-version');
    } catch (error) {
      console.error('Lỗi khi lấy version:', error);
      return 'v1.0.0'; // Fallback version
    }
  }

  // Generic invoke method for any IPC channel
  async invoke(channel, ...args) {
    try {
      return await window.electronAPI.invoke(channel, ...args);
    } catch (error) {
      console.error(`Lỗi khi invoke ${channel}:`, error);
      throw error;
    }
  }

  // Event listeners
  onBackendReady(callback) {
    window.electronAPI.onBackendReady(callback);
  }

  onBotStatusUpdate(callback) {
    window.electronAPI.onBotStatusUpdate(callback);
  }

  onNewSignal(callback) {
    window.electronAPI.onNewSignal(callback);
  }

  onPositionUpdate(callback) {
    window.electronAPI.onPositionUpdate(callback);
  }

  onUpdateAvailable(callback) {
    window.electronAPI.onUpdateAvailable(callback);
  }

  onDownloadProgress(callback) {
    window.electronAPI.onDownloadProgress(callback);
  }

  onUpdateDownloaded(callback) {
    window.electronAPI.onUpdateDownloaded(callback);
  }

  onNewLog(callback) {
    window.electronAPI.onNewLog(callback);
  }

  onOrderNotification(callback) {
    window.electronAPI.onOrderNotification(callback);
  }

  // Remove listeners
  removeAllListeners(channel) {
    window.electronAPI.removeAllListeners(channel);
  }

  setupIpcListeners() {
    // Setup any additional listeners if needed
    console.log('ElectronAPI đã khởi tạo');
  }
}

// Export for use in other modules
window.ElectronAPI = ElectronAPI;
