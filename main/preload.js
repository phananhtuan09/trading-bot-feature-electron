const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Bot control methods
  startBot: () => ipcRenderer.invoke('bot:start'),
  stopBot: () => ipcRenderer.invoke('bot:stop'),
  startOrders: () => ipcRenderer.invoke('bot:startOrders'),
  stopOrders: () => ipcRenderer.invoke('bot:stopOrders'),
  startBotWithAutoOrder: () => ipcRenderer.invoke('bot:start-with-auto-order'),
  stopBotWithAutoOrder: () => ipcRenderer.invoke('bot:stop-with-auto-order'),
  getBotStatus: () => ipcRenderer.invoke('bot:status'),

  // Configuration methods
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: config => ipcRenderer.invoke('config:save', config),

  // Data methods
  getPositions: () => ipcRenderer.invoke('data:positions'),
  getSignals: () => ipcRenderer.invoke('data:signals'),
  getLogs: () => ipcRenderer.invoke('data:logs'),
  getStats: () => ipcRenderer.invoke('data:stats'),

  // Position management methods
  closePosition: (symbol, side) => ipcRenderer.invoke('position:close', symbol, side),

  // Signal execution methods
  executeSignal: signalId => ipcRenderer.invoke('signal:execute', signalId),

  // Connection status methods
  checkConnections: () => ipcRenderer.invoke('connection:check'),

  // Update methods
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // Notification methods
  reinitializeNotifications: () => ipcRenderer.invoke('notifications:reinitialize'),
  testDiscordConnection: () => ipcRenderer.invoke('notifications:test-discord'),
  testTelegramConnection: () => ipcRenderer.invoke('notifications:test-telegram'),

  // App methods
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Generic invoke method for any IPC channel
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Event listeners
  onBackendReady: callback => {
    ipcRenderer.on('backend-ready', event => callback());
  },
  onBotStatusUpdate: callback => {
    ipcRenderer.on('bot:status-update', (event, status) => callback(status));
  },
  onNewSignal: callback => {
    ipcRenderer.on('signal:new', (event, signal) => callback(signal));
  },
  onPositionUpdate: callback => {
    ipcRenderer.on('position:update', (event, position) => callback(position));
  },
  onUpdateAvailable: callback => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onDownloadProgress: callback => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },
  onUpdateDownloaded: callback => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  onNewLog: callback => {
    ipcRenderer.on('log:new', (event, log) => callback(log));
  },
  onOrderNotification: callback => {
    ipcRenderer.on('order:notification', (event, notification) => callback(notification));
  },

  // Remove listeners
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});
