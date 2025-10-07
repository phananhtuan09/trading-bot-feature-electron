class ElectronAPI {
  constructor() {
    this.setupIpcListeners()
  }

  // Bot control methods
  async startBot() {
    try {
      return await window.electronAPI.startBot()
    } catch (error) {
      console.error('Error starting bot:', error)
      throw error
    }
  }

  async stopBot() {
    try {
      return await window.electronAPI.stopBot()
    } catch (error) {
      console.error('Error stopping bot:', error)
      throw error
    }
  }

  async startOrders() {
    try {
      return await window.electronAPI.startOrders()
    } catch (error) {
      console.error('Error starting orders:', error)
      throw error
    }
  }

  async stopOrders() {
    try {
      return await window.electronAPI.stopOrders()
    } catch (error) {
      console.error('Error stopping orders:', error)
      throw error
    }
  }

  async getBotStatus() {
    try {
      return await window.electronAPI.getBotStatus()
    } catch (error) {
      console.error('Error getting bot status:', error)
      return null
    }
  }

  // Configuration methods
  async getConfig() {
    try {
      return await window.electronAPI.getConfig()
    } catch (error) {
      console.error('Error getting config:', error)
      return null
    }
  }

  async saveConfig(config) {
    try {
      return await window.electronAPI.saveConfig(config)
    } catch (error) {
      console.error('Error saving config:', error)
      throw error
    }
  }

  // Data methods
  async getPositions() {
    try {
      return await window.electronAPI.getPositions()
    } catch (error) {
      console.error('Error getting positions:', error)
      return []
    }
  }

  async getSignals() {
    try {
      return await window.electronAPI.getSignals()
    } catch (error) {
      console.error('Error getting signals:', error)
      return []
    }
  }

  async getLogs() {
    try {
      return await window.electronAPI.getLogs()
    } catch (error) {
      console.error('Error getting logs:', error)
      return []
    }
  }

  async getStats() {
    try {
      return await window.electronAPI.getStats()
    } catch (error) {
      console.error('Error getting stats:', error)
      return null
    }
  }

  // Update methods
  async checkForUpdates() {
    try {
      return await window.electronAPI.checkForUpdates()
    } catch (error) {
      console.error('Error checking for updates:', error)
      return null
    }
  }

  async installUpdate() {
    try {
      return await window.electronAPI.installUpdate()
    } catch (error) {
      console.error('Error installing update:', error)
      throw error
    }
  }

  // Event listeners
  onBotStatusUpdate(callback) {
    window.electronAPI.onBotStatusUpdate(callback)
  }

  onNewSignal(callback) {
    window.electronAPI.onNewSignal(callback)
  }

  onPositionUpdate(callback) {
    window.electronAPI.onPositionUpdate(callback)
  }

  onUpdateAvailable(callback) {
    window.electronAPI.onUpdateAvailable(callback)
  }

  onDownloadProgress(callback) {
    window.electronAPI.onDownloadProgress(callback)
  }

  onUpdateDownloaded(callback) {
    window.electronAPI.onUpdateDownloaded(callback)
  }

  // Remove listeners
  removeAllListeners(channel) {
    window.electronAPI.removeAllListeners(channel)
  }

  setupIpcListeners() {
    // Setup any additional listeners if needed
    console.log('ElectronAPI initialized')
  }
}

// Export for use in other modules
window.ElectronAPI = ElectronAPI
