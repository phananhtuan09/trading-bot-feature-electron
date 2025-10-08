const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Bot control methods
  startBot: () => ipcRenderer.invoke('bot:start'),
  stopBot: () => ipcRenderer.invoke('bot:stop'),
  startOrders: () => ipcRenderer.invoke('bot:startOrders'),
  stopOrders: () => ipcRenderer.invoke('bot:stopOrders'),
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

  // Event listeners
  onBotStatusUpdate: callback => {
    ipcRenderer.on('bot:status-update', callback);
  },
  onNewSignal: callback => {
    ipcRenderer.on('signal:new', callback);
  },
  onPositionUpdate: callback => {
    ipcRenderer.on('position:update', callback);
  },
  onUpdateAvailable: callback => {
    ipcRenderer.on('update-available', callback);
  },
  onDownloadProgress: callback => {
    ipcRenderer.on('download-progress', callback);
  },
  onUpdateDownloaded: callback => {
    ipcRenderer.on('update-downloaded', callback);
  },

  // Remove listeners
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});
