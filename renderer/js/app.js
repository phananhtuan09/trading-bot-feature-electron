// Tab switching function
function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Add active class to selected tab
  const selectedTab = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Add active class to selected tab content
  const selectedContent = document.getElementById(tabName);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
}

// Make switchTab globally available
window.switchTab = switchTab;

// Main App Script
class App {
  constructor() {
    this.dashboard = null;
    this.settings = null;
    this.positions = null;
    this.signals = null;
    this.logs = null;
    this.api = new ElectronAPI();
    this.init();
  }

  async init() {
    try {
      console.log('Đang khởi tạo Trading Bot App...');

      // Initialize components
      this.dashboard = new Dashboard();
      this.settings = new Settings();
      this.positions = new Positions();
      this.signals = new Signals();
      this.logs = new Logs();

      // Setup global tab switching
      this.setupTabSwitching();

      // Setup global functions
      this.setupGlobalFunctions();

      console.log('Trading Bot App đã khởi tạo thành công');
    } catch (error) {
      console.error('Không thể khởi tạo App:', error);
    }
  }

  setupTabSwitching() {
    // Tab switching function
    window.switchTab = tabName => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Add active class to selected tab and content
      event.target.classList.add('active');
      document.getElementById(tabName).classList.add('active');

      // Load data for the active tab
      this.loadTabData(tabName);
    };
  }

  setupGlobalFunctions() {
    // Make components globally accessible
    window.dashboard = this.dashboard;
    window.settings = this.settings;
    window.positions = this.positions;
    window.signals = this.signals;
    window.logs = this.logs;

    // Setup report functionality
    window.openReportModal = () => this.openReportModal();
    window.closeReportModal = () => this.closeReportModal();
  }

  async loadTabData(tabName) {
    try {
      switch (tabName) {
        case 'positions':
          await this.positions.loadPositions();
          break;
        case 'signals':
          await this.signals.loadSignals();
          break;
        case 'logs':
          await this.logs.loadLogs();
          break;
      }
    } catch (error) {
      console.error(`Lỗi khi tải dữ liệu ${tabName}:`, error);
    }
  }

  async openReportModal() {
    try {
      const stats = await this.api.getStats();
      if (stats) {
        this.updateReportContent(stats);
        const modal = document.getElementById('reportModal');
        if (modal) {
          modal.classList.add('active');
        }
      }
    } catch (error) {
      console.error('Lỗi khi mở modal báo cáo:', error);
    }
  }

  closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  updateReportContent(stats) {
    const content = document.getElementById('reportContent');
    if (!content || !stats) return;

    const reportData = [
      {
        label: 'Số lệnh đã đặt trong ngày',
        value: `${stats.orders?.ordersPlacedToday || 0} / ${stats.orders?.maxOrdersPerDay || 10}`,
      },
      { label: 'Tổng số lệnh đã đặt', value: stats.orders?.totalOrders || 0 },
      {
        label: 'Tổng lợi nhuận',
        value: `${stats.account?.totalProfit || 0} USDT (${stats.account?.profitPercentage || 0}%)`,
      },
      { label: 'Số dư hiện tại', value: `${stats.account?.balance || 0} USDT` },
      { label: 'Số dư khả dụng', value: `${stats.account?.availableBalance || 0} USDT` },
      { label: 'Lãi/Lỗ chưa thực hiện', value: `${stats.account?.unrealizedPnl || 0} USDT` },
      { label: 'Loại tài khoản', value: stats.account?.accountType || 'Unknown' },
      { label: 'Vốn mỗi lệnh', value: `${stats.orders?.quantity || 10} USDT` },
      { label: 'Đòn bẩy', value: `${stats.orders?.leverage || 20}x` },
      { label: 'Số lệnh tối đa/ngày', value: stats.orders?.maxOrdersPerDay || 10 },
      { label: 'Số lệnh tối đa/lần quét', value: stats.orders?.orderLimitPerScan || 3 },
      { label: 'Số vị thế đang mở', value: stats.positions || 0 },
      { label: 'Tổng số tín hiệu', value: stats.signals || 0 },
      { label: 'Tỷ lệ thắng', value: `${stats.statistics?.winRate || 0}%` },
      { label: 'Tổng số giao dịch', value: stats.statistics?.totalTrades || 0 },
      { label: 'Giao dịch thắng', value: stats.statistics?.winningTrades || 0 },
      { label: 'Giao dịch thua', value: stats.statistics?.losingTrades || 0 },
      { label: 'Lãi trung bình', value: `${stats.statistics?.averageWin || 0} USDT` },
      { label: 'Lỗ trung bình', value: `${stats.statistics?.averageLoss || 0} USDT` },
      { label: 'Max Drawdown', value: `${stats.statistics?.maxDrawdown || 0} USDT` },
      { label: 'Sharpe Ratio', value: stats.statistics?.sharpeRatio || 0 },
    ];

    content.innerHTML = reportData
      .map(
        item => `
      <div class="report-item">
        <span class="report-label">${item.label}</span>
        <span class="report-value">${item.value}</span>
      </div>
    `
      )
      .join('');
  }

  // Global functions for UI interaction
  startBot() {
    this.dashboard.startBot();
  }

  stopBot() {
    this.dashboard.stopBot();
  }

  startOrder() {
    this.dashboard.startOrder();
  }

  stopOrder() {
    this.dashboard.stopOrder();
  }

  openSettings() {
    this.settings.open();
  }

  closeSettings() {
    this.settings.close();
  }

  saveSettings() {
    this.settings.save();
  }

  resetSettings() {
    this.settings.reset();
  }

  closePosition(positionId) {
    this.positions.closePosition(positionId);
  }

  executeSignal(signalId) {
    this.signals.executeSignal(signalId);
  }

  refreshData() {
    this.dashboard.loadStats();
    this.positions.loadPositions();
    this.signals.loadSignals();
    this.logs.loadLogs();
  }

  exportLogs() {
    this.logs.exportLogs();
  }

  clearLogs() {
    this.logs.clearLogs();
  }

  cleanup() {
    // Clean up any intervals or event listeners
    if (this.dashboard) {
      this.dashboard.cleanup();
    }
    if (this.settings) {
      this.settings.cleanup();
    }
    if (this.positions) {
      this.positions.cleanup();
    }
    if (this.signals) {
      this.signals.cleanup();
    }
    if (this.logs) {
      this.logs.cleanup();
    }
  }

  // Cleanup method
  destroy() {
    if (this.dashboard) {
      this.dashboard.destroy();
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Handle app cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.app && window.app.cleanup) {
    window.app.cleanup();
  }
});

// Global functions for UI interaction
window.startBot = () => {
  if (window.app) {
    window.app.startBot();
  }
};

window.stopBot = () => {
  if (window.app) {
    window.app.stopBot();
  }
};

window.startOrder = () => {
  if (window.app) {
    window.app.startOrder();
  }
};

window.stopOrder = () => {
  if (window.app) {
    window.app.stopOrder();
  }
};

window.openSettings = () => {
  if (window.app) {
    window.app.openSettings();
  }
};

window.closeSettings = () => {
  if (window.app) {
    window.app.closeSettings();
  }
};

window.saveSettings = () => {
  if (window.app) {
    window.app.saveSettings();
  }
};

window.resetSettings = () => {
  if (window.app) {
    window.app.resetSettings();
  }
};

window.closePosition = positionId => {
  if (window.app) {
    window.app.closePosition(positionId);
  }
};

window.executeSignal = signalId => {
  if (window.app) {
    window.app.executeSignal(signalId);
  }
};

window.refreshData = () => {
  if (window.app) {
    window.app.refreshData();
  }
};

window.exportLogs = () => {
  if (window.app) {
    window.app.exportLogs();
  }
};

window.clearLogs = () => {
  if (window.app) {
    window.app.clearLogs();
  }
};
