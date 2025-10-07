// Main App Script
class App {
  constructor() {
    this.dashboard = null
    this.settings = null
    this.positions = null
    this.signals = null
    this.logs = null
    this.api = new ElectronAPI()
    this.init()
  }

  async init() {
    try {
      console.log('Initializing Trading Bot App...')
      
      // Initialize components
      this.dashboard = new Dashboard()
      this.settings = new Settings()
      this.positions = new Positions()
      this.signals = new Signals()
      this.logs = new Logs()
      
      // Setup global tab switching
      this.setupTabSwitching()
      
      // Setup global functions
      this.setupGlobalFunctions()
      
      console.log('Trading Bot App initialized successfully')
    } catch (error) {
      console.error('Failed to initialize App:', error)
    }
  }

  setupTabSwitching() {
    // Tab switching function
    window.switchTab = (tabName) => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active')
      })
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active')
      })
      
      // Add active class to selected tab and content
      event.target.classList.add('active')
      document.getElementById(tabName).classList.add('active')
      
      // Load data for the active tab
      this.loadTabData(tabName)
    }
  }

  setupGlobalFunctions() {
    // Make components globally accessible
    window.dashboard = this.dashboard
    window.settings = this.settings
    window.positions = this.positions
    window.signals = this.signals
    window.logs = this.logs
    
    // Setup report functionality
    window.openReportModal = () => this.openReportModal()
    window.closeReportModal = () => this.closeReportModal()
  }

  async loadTabData(tabName) {
    try {
      switch (tabName) {
        case 'positions':
          await this.positions.loadPositions()
          break
        case 'signals':
          await this.signals.loadSignals()
          break
        case 'logs':
          await this.logs.loadLogs()
          break
      }
    } catch (error) {
      console.error(`Error loading ${tabName} data:`, error)
    }
  }

  async openReportModal() {
    try {
      const stats = await this.api.getStats()
      if (stats) {
        this.updateReportContent(stats)
        const modal = document.getElementById('reportModal')
        if (modal) {
          modal.classList.add('active')
        }
      }
    } catch (error) {
      console.error('Error opening report modal:', error)
    }
  }

  closeReportModal() {
    const modal = document.getElementById('reportModal')
    if (modal) {
      modal.classList.remove('active')
    }
  }

  updateReportContent(stats) {
    const content = document.getElementById('reportContent')
    if (!content || !stats) return

    const reportData = [
      { label: 'Số lệnh đã đặt trong ngày', value: `${stats.orders?.ordersPlacedToday || 0} / ${stats.orders?.maxOrdersPerDay || 10}` },
      { label: 'Tổng số lệnh đã đặt', value: stats.orders?.totalOrders || 0 },
      { label: 'Tổng lợi nhuận', value: `${stats.account?.totalProfit || 0} USDT (${stats.account?.profitPercentage || 0}%)` },
      { label: 'Tổng vốn đã vào', value: `${stats.orders?.totalCapital || 0} USDT` },
      { label: 'Vốn mỗi lệnh', value: `${stats.orders?.quantity || 10} USDT` },
      { label: 'Đòn bẩy', value: `${stats.orders?.leverage || 20}x` },
      { label: 'Số lệnh tối đa/ngày', value: stats.orders?.maxOrdersPerDay || 10 },
      { label: 'Số lệnh tối đa/lần quét', value: stats.orders?.orderLimitPerScan || 3 }
    ]

    content.innerHTML = reportData.map(item => `
      <div class="report-item">
        <span class="report-label">${item.label}</span>
        <span class="report-value">${item.value}</span>
      </div>
    `).join('')
  }

  // Cleanup method
  destroy() {
    if (this.dashboard) {
      this.dashboard.destroy()
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App()
})

// Handle app cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.destroy()
  }
})
