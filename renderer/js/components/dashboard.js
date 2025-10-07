class Dashboard {
  constructor() {
    this.api = new ElectronAPI()
    this.isInitialized = false
    this.updateInterval = null
    this.init()
  }

  async init() {
    try {
      console.log('Initializing Dashboard...')
      
      // Load initial data
      await this.loadStats()
      await this.loadPositions()
      await this.loadSignals()
      await this.loadLogs()
      
      // Setup event listeners
      this.setupEventListeners()
      this.setupRealTimeUpdates()
      
      this.isInitialized = true
      console.log('Dashboard initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Dashboard:', error)
    }
  }

  async loadStats() {
    try {
      const stats = await this.api.getStats()
      if (stats) {
        this.updateStatsDisplay(stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  async loadPositions() {
    try {
      const positions = await this.api.getPositions()
      this.updatePositionsTable(positions)
    } catch (error) {
      console.error('Error loading positions:', error)
    }
  }

  async loadSignals() {
    try {
      const signals = await this.api.getSignals()
      this.updateSignalsTable(signals)
    } catch (error) {
      console.error('Error loading signals:', error)
    }
  }

  async loadLogs() {
    try {
      const logs = await this.api.getLogs()
      this.updateLogsDisplay(logs)
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  updateStatsDisplay(stats) {
    // Update balance
    const balanceElement = document.getElementById('balance')
    if (balanceElement && stats.account) {
      balanceElement.textContent = `${stats.account.balance || 0} USDT`
    }

    // Update profit
    const profitElement = document.getElementById('profit')
    if (profitElement && stats.account) {
      const profit = stats.account.totalProfit || 0
      const percentage = stats.account.profitPercentage || 0
      const profitClass = profit >= 0 ? 'positive' : 'negative'
      profitElement.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${percentage.toFixed(2)}%)`
      profitElement.className = `stat-value ${profitClass}`
    }

    // Update orders
    const ordersTodayElement = document.getElementById('ordersToday')
    if (ordersTodayElement && stats.orders) {
      ordersTodayElement.textContent = `${stats.orders.ordersPlacedToday || 0} / ${stats.orders.maxOrdersPerDay || 10}`
    }

    const totalOrdersElement = document.getElementById('totalOrders')
    if (totalOrdersElement && stats.orders) {
      totalOrdersElement.textContent = stats.orders.totalOrders || 0
    }

    // Update connection status
    const binanceStatusElement = document.getElementById('binanceStatus')
    if (binanceStatusElement) {
      binanceStatusElement.textContent = stats.bot?.isRunning ? '✅' : '❌'
    }

    const notificationStatusElement = document.getElementById('notificationStatus')
    if (notificationStatusElement) {
      notificationStatusElement.textContent = '✅' // Will be updated based on actual status
    }
  }

  updatePositionsTable(positions) {
    const tbody = document.getElementById('positionsTableBody')
    if (!tbody) return

    tbody.innerHTML = ''

    if (!positions || positions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>'
      return
    }

    positions.forEach(position => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td><strong>${position.symbol}</strong></td>
        <td><span class="decision-${position.side.toLowerCase()}">${position.side}</span></td>
        <td>${position.entryPrice || 'N/A'}</td>
        <td>${position.takeProfit || 'N/A'} / ${position.stopLoss || 'N/A'}</td>
        <td style="color: ${position.pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
          ${position.pnl >= 0 ? '+' : ''}${position.pnl || 0}
        </td>
        <td><button class="btn btn-danger btn-table" onclick="dashboard.closePosition('${position.id}')">Đóng</button></td>
      `
      tbody.appendChild(row)
    })
  }

  updateSignalsTable(signals) {
    const tbody = document.getElementById('signalsTableBody')
    if (!tbody) return

    tbody.innerHTML = ''

    if (!signals || signals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">Không có tín hiệu nào</td></tr>'
      return
    }

    signals.slice(0, 50).forEach(signal => { // Show only last 50 signals
      const row = document.createElement('tr')
      const time = new Date(signal.timestamp).toLocaleTimeString()
      row.innerHTML = `
        <td>${time}</td>
        <td><strong>${signal.symbol}</strong></td>
        <td><span class="decision-${signal.decision.toLowerCase()}">${signal.decision}</span></td>
        <td>${signal.price || 'N/A'}</td>
        <td>${signal.TP_ROI || 'N/A'} / ${signal.SL_ROI || 'N/A'}</td>
        <td>${signal.confidence || 'N/A'}%</td>
        <td><button class="btn btn-primary btn-table" onclick="dashboard.executeSignal('${signal.id}')">Vào</button></td>
      `
      tbody.appendChild(row)
    })
  }

  updateLogsDisplay(logs) {
    const container = document.getElementById('logContainer')
    if (!container) return

    container.innerHTML = ''

    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="log-entry log-info">Không có logs nào</div>'
      return
    }

    logs.slice(0, 100).forEach(log => { // Show only last 100 logs
      const logEntry = document.createElement('div')
      logEntry.className = `log-entry log-${log.level || 'info'}`
      
      const time = new Date(log.timestamp).toLocaleTimeString()
      logEntry.innerHTML = `
        <span class="log-time">[${time}]</span> 
        <span class="log-${log.level || 'info'}">${log.message}</span>
      `
      container.appendChild(logEntry)
    })

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight
  }

  setupEventListeners() {
    // Bot control buttons
    document.getElementById('startBtn')?.addEventListener('click', () => this.startBot())
    document.getElementById('stopBtn')?.addEventListener('click', () => this.stopBot())
    document.getElementById('startOrderBtn')?.addEventListener('click', () => this.startOrders())
    document.getElementById('stopOrderBtn')?.addEventListener('click', () => this.stopOrders())
    
    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings())
    
    // Report button
    document.getElementById('reportBtn')?.addEventListener('click', () => this.openReport())
  }

  setupRealTimeUpdates() {
    // Update data every 5 seconds
    this.updateInterval = setInterval(async () => {
      if (this.isInitialized) {
        await this.loadStats()
        await this.loadPositions()
        await this.loadSignals()
        await this.loadLogs()
      }
    }, 5000)

    // Listen for real-time updates from main process
    this.api.onBotStatusUpdate((status) => {
      this.updateBotStatus(status)
    })

    this.api.onNewSignal((signal) => {
      this.addSignalToTable(signal)
    })

    this.api.onPositionUpdate((position) => {
      this.updatePositionInTable(position)
    })

    this.api.onUpdateAvailable((info) => {
      this.showUpdateNotification(info)
    })

    this.api.onUpdateDownloaded((info) => {
      this.showUpdateDownloadedNotification(info)
    })
  }

  updateBotStatus(status) {
    const botStatus = document.getElementById('botStatus')
    const orderStatus = document.getElementById('orderStatus')
    
    if (botStatus) {
      if (status.isRunning) {
        botStatus.textContent = 'Bot: Running'
        botStatus.className = 'status-badge active'
      } else {
        botStatus.textContent = 'Bot: Stopped'
        botStatus.className = 'status-badge inactive'
      }
    }

    if (orderStatus) {
      if (status.isOrderActive) {
        orderStatus.textContent = 'Order: Active'
        orderStatus.className = 'status-badge active'
      } else {
        orderStatus.textContent = 'Order: Inactive'
        orderStatus.className = 'status-badge inactive'
      }
    }
  }

  addSignalToTable(signal) {
    // Add new signal to the top of the table
    const tbody = document.getElementById('signalsTableBody')
    if (!tbody) return

    const row = document.createElement('tr')
    const time = new Date(signal.timestamp).toLocaleTimeString()
    row.innerHTML = `
      <td>${time}</td>
      <td><strong>${signal.symbol}</strong></td>
      <td><span class="decision-${signal.decision.toLowerCase()}">${signal.decision}</span></td>
      <td>${signal.price || 'N/A'}</td>
      <td>${signal.TP_ROI || 'N/A'} / ${signal.SL_ROI || 'N/A'}</td>
      <td>${signal.confidence || 'N/A'}%</td>
      <td><button class="btn btn-primary btn-table" onclick="dashboard.executeSignal('${signal.id}')">Vào</button></td>
    `
    tbody.insertBefore(row, tbody.firstChild)

    // Keep only last 50 signals
    while (tbody.children.length > 50) {
      tbody.removeChild(tbody.lastChild)
    }
  }

  updatePositionInTable(position) {
    // Update existing position or add new one
    const tbody = document.getElementById('positionsTableBody')
    if (!tbody) return

    // Find existing row or create new one
    let row = Array.from(tbody.children).find(r => 
      r.cells[0]?.textContent.includes(position.symbol)
    )

    if (!row) {
      row = document.createElement('tr')
      tbody.appendChild(row)
    }

    row.innerHTML = `
      <td><strong>${position.symbol}</strong></td>
      <td><span class="decision-${position.side.toLowerCase()}">${position.side}</span></td>
      <td>${position.entryPrice || 'N/A'}</td>
      <td>${position.takeProfit || 'N/A'} / ${position.stopLoss || 'N/A'}</td>
      <td style="color: ${position.pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${position.pnl >= 0 ? '+' : ''}${position.pnl || 0}
      </td>
      <td><button class="btn btn-danger btn-table" onclick="dashboard.closePosition('${position.id}')">Đóng</button></td>
    `
  }

  async startBot() {
    try {
      this.showLoading('startBtn')
      const result = await this.api.startBot()
      this.hideLoading('startBtn')
      
      if (result.success) {
        this.showNotification('Bot started successfully', 'success')
      } else {
        this.showNotification(`Error: ${result.error}`, 'error')
      }
    } catch (error) {
      this.hideLoading('startBtn')
      this.showNotification(`Error starting bot: ${error.message}`, 'error')
    }
  }

  async stopBot() {
    try {
      this.showLoading('stopBtn')
      const result = await this.api.stopBot()
      this.hideLoading('stopBtn')
      
      if (result.success) {
        this.showNotification('Bot stopped successfully', 'success')
      } else {
        this.showNotification(`Error: ${result.error}`, 'error')
      }
    } catch (error) {
      this.hideLoading('stopBtn')
      this.showNotification(`Error stopping bot: ${error.message}`, 'error')
    }
  }

  async startOrders() {
    try {
      this.showLoading('startOrderBtn')
      const result = await this.api.startOrders()
      this.hideLoading('startOrderBtn')
      
      if (result.success) {
        this.showNotification('Orders started successfully', 'success')
      } else {
        this.showNotification(`Error: ${result.error}`, 'error')
      }
    } catch (error) {
      this.hideLoading('startOrderBtn')
      this.showNotification(`Error starting orders: ${error.message}`, 'error')
    }
  }

  async stopOrders() {
    try {
      this.showLoading('stopOrderBtn')
      const result = await this.api.stopOrders()
      this.hideLoading('stopOrderBtn')
      
      if (result.success) {
        this.showNotification('Orders stopped successfully', 'success')
      } else {
        this.showNotification(`Error: ${result.error}`, 'error')
      }
    } catch (error) {
      this.hideLoading('stopOrderBtn')
      this.showNotification(`Error stopping orders: ${error.message}`, 'error')
    }
  }

  openSettings() {
    // This will be handled by the Settings component
    if (window.settings) {
      window.settings.openModal()
    }
  }

  openReport() {
    // This will be handled by the Report component
    if (window.report) {
      window.report.openModal()
    }
  }

  showUpdateNotification(info) {
    const notification = document.getElementById('updateNotification')
    const message = document.getElementById('updateMessage')
    
    if (notification && message) {
      message.textContent = `Version ${info.version} is available. Would you like to download and install it?`
      notification.style.display = 'block'
      
      // Setup download button
      document.getElementById('downloadUpdateBtn')?.addEventListener('click', () => {
        this.downloadUpdate()
      })
      
      // Setup dismiss button
      document.getElementById('dismissUpdateBtn')?.addEventListener('click', () => {
        notification.style.display = 'none'
      })
    }
  }

  showUpdateDownloadedNotification(info) {
    const notification = document.getElementById('updateNotification')
    const message = document.getElementById('updateMessage')
    
    if (notification && message) {
      message.textContent = `Update downloaded. The app will restart to install the update.`
      notification.style.display = 'block'
      
      // Auto-restart after 3 seconds
      setTimeout(() => {
        this.api.installUpdate()
      }, 3000)
    }
  }

  async downloadUpdate() {
    try {
      await this.api.checkForUpdates()
      this.showNotification('Downloading update...', 'info')
    } catch (error) {
      this.showNotification(`Error downloading update: ${error.message}`, 'error')
    }
  }

  showLoading(buttonId) {
    const button = document.getElementById(buttonId)
    if (button) {
      button.classList.add('loading')
      button.disabled = true
    }
  }

  hideLoading(buttonId) {
    const button = document.getElementById(buttonId)
    if (button) {
      button.classList.remove('loading')
      button.disabled = false
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
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
    `
    
    document.body.appendChild(notification)
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  // Placeholder methods for future implementation
  closePosition(positionId) {
    console.log('Close position:', positionId)
    this.showNotification('Close position functionality coming soon', 'info')
  }

  executeSignal(signalId) {
    console.log('Execute signal:', signalId)
    this.showNotification('Execute signal functionality coming soon', 'info')
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    this.api.removeAllListeners('bot:status-update')
    this.api.removeAllListeners('signal:new')
    this.api.removeAllListeners('position:update')
    this.api.removeAllListeners('update-available')
    this.api.removeAllListeners('update-downloaded')
  }
}

// Export for global access
window.Dashboard = Dashboard
