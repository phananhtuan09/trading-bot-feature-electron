class Dashboard {
  constructor() {
    this.api = new ElectronAPI();
    this.isInitialized = false;
    this.updateInterval = null;
    this.init();
  }

  async init() {
    try {
      console.log('Đang khởi tạo Dashboard...');

      // Load initial data
      await this.loadStats();
      // Positions are now loaded by Positions.js
      await this.loadSignals();
      await this.loadLogs();

      // Setup event listeners
      this.setupEventListeners();
      this.setupRealTimeUpdates();

      this.isInitialized = true;
      console.log('Dashboard đã khởi tạo thành công');
    } catch (error) {
      console.error('Không thể khởi tạo Dashboard:', error);
    }
  }

  async loadStats() {
    try {
      const stats = await this.api.getStats();
      if (stats) {
        this.updateStatsDisplay(stats);
      }
    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
    }
  }

  // Positions are now managed by Positions.js for real-time updates
  // This method is kept for compatibility but does nothing
  async loadPositions() {
    // Positions.js handles this now
  }

  async loadSignals() {
    try {
      const signals = await this.api.getSignals();
      this.updateSignalsTable(signals);
    } catch (error) {
      console.error('Lỗi khi tải tín hiệu:', error);
    }
  }

  async loadLogs() {
    try {
      const logs = await this.api.getLogs();
      this.updateLogsDisplay(logs);
    } catch (error) {
      console.error('Lỗi khi tải logs:', error);
    }
  }

  updateStatsDisplay(stats) {
    // Update balance
    const balanceElement = document.getElementById('balance');
    if (balanceElement && stats.account) {
      const balance = stats.account.balance || 0;
      const accountType = stats.account.accountType || 'Mainnet';
      balanceElement.textContent = `${balance.toFixed(2)} USDT`;
      balanceElement.title = `Số dư: ${balance.toFixed(2)} USDT (${accountType})`;
    }

    // Update profit
    const profitElement = document.getElementById('profit');
    if (profitElement && stats.account) {
      const profit = stats.account.totalProfit || 0;
      const percentage = stats.account.profitPercentage || 0;
      const unrealizedPnl = stats.account.unrealizedPnl || 0;
      const profitClass = profit >= 0 ? 'positive' : 'negative';
      profitElement.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} (${percentage.toFixed(2)}%)`;
      profitElement.className = `stat-value ${profitClass}`;
      profitElement.title = `Lợi nhuận: ${profit.toFixed(2)} USDT (${percentage.toFixed(2)}%) | Chưa thực hiện: ${unrealizedPnl.toFixed(2)} USDT`;
    }

    // Update orders
    const ordersTodayElement = document.getElementById('ordersToday');
    if (ordersTodayElement && stats.orders) {
      const ordersToday = stats.orders.ordersPlacedToday || 0;
      const maxOrders = stats.orders.maxOrdersPerDay || 10;
      ordersTodayElement.textContent = `${ordersToday} / ${maxOrders}`;
      ordersTodayElement.title = `Lệnh hôm nay: ${ordersToday}/${maxOrders}`;
    }

    const totalOrdersElement = document.getElementById('totalOrders');
    if (totalOrdersElement && stats.orders) {
      const totalOrders = stats.orders.totalOrders || 0;
      const quantity = stats.orders.quantity || 10;
      totalOrdersElement.textContent = totalOrders;
      totalOrdersElement.title = `Tổng lệnh: ${totalOrders} | Vốn mỗi lệnh: ${quantity} USDT`;
    }

    // Update connection status
    const binanceStatusElement = document.getElementById('binanceStatus');
    if (binanceStatusElement && stats.connectionStatus) {
      const binanceStatus = stats.connectionStatus.binance;
      binanceStatusElement.textContent = binanceStatus?.connected ? '✅' : '❌';
      binanceStatusElement.title = binanceStatus?.connected
        ? `Binance ${stats.account?.accountType || 'Mainnet'} - Connected`
        : `Binance - ${binanceStatus?.error || 'Disconnected'}`;
    }

    const notificationStatusElement = document.getElementById('notificationStatus');
    if (notificationStatusElement && stats.connectionStatus) {
      const discordStatus = stats.connectionStatus.discord;
      const telegramStatus = stats.connectionStatus.telegram;
      const hasNotification = discordStatus?.connected || telegramStatus?.connected;
      notificationStatusElement.textContent = hasNotification ? '✅' : '❌';
      notificationStatusElement.title = hasNotification
        ? 'Discord/Telegram - Connected'
        : 'Discord/Telegram - Disconnected';
    }
  }

  // DEPRECATED: Positions.js handles position table updates
  // This method is kept for backward compatibility only
  // TODO: Remove after ensuring no external calls
  updatePositionsTable(positions) {
    console.warn('⚠️ updatePositionsTable is deprecated. Use Positions component instead.');
  }

  updateSignalsTable(signals) {
    const tbody = document.getElementById('signalsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!signals || signals.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; color: #666;">Không có tín hiệu nào</td></tr>';
      return;
    }

    signals.slice(0, 50).forEach(signal => {
      // Show only last 50 signals
      const row = document.createElement('tr');
      const time = new Date(signal.timestamp).toLocaleTimeString();
      row.innerHTML = `
        <td>${time}</td>
        <td><strong>${signal.symbol}</strong></td>
        <td><span class="decision-${signal.decision.toLowerCase()}">${signal.decision}</span></td>
        <td>${signal.price || 'N/A'}</td>
        <td>${signal.TP_ROI || 'N/A'} / ${signal.SL_ROI || 'N/A'}</td>
        <td>${signal.confidenceScore || signal.confidence || 'N/A'}%</td>
        <td><button class="btn btn-primary btn-table" onclick="if(window.app && window.app.signals) window.app.signals.executeSignal('${signal.id}', this)">Vào</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  updateLogsDisplay(logs) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="log-entry log-info">Không có logs nào</div>';
      return;
    }

    logs.slice(0, 100).forEach(log => {
      // Show only last 100 logs
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry log-${log.level || 'info'}`;

      const time = new Date(log.timestamp).toLocaleTimeString();
      logEntry.innerHTML = `
        <span class="log-time">[${time}]</span> 
        <span class="log-${log.level || 'info'}">${log.message}</span>
      `;
      container.appendChild(logEntry);
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  setupEventListeners() {
    // Bot control buttons
    document.getElementById('startBtn')?.addEventListener('click', () => this.startBot());
    document.getElementById('stopBtn')?.addEventListener('click', () => this.stopBot());
    document.getElementById('startOrderBtn')?.addEventListener('click', () => this.startOrders());
    document.getElementById('stopOrderBtn')?.addEventListener('click', () => this.stopOrders());

    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());

    // Report button
    document.getElementById('reportBtn')?.addEventListener('click', () => this.openReport());
  }

  setupRealTimeUpdates() {
    // Update stats, signals, and logs every 5 seconds
    // Note: Positions are now managed by Positions.js for real-time updates
    this.updateInterval = setInterval(async () => {
      if (this.isInitialized) {
        await this.loadStats();
        await this.loadSignals();
        await this.loadLogs();
      }
    }, 5000);

    // Listen for real-time updates from main process
    this.api.onBotStatusUpdate(status => {
      this.updateBotStatus(status);
    });

    this.api.onNewSignal(signal => {
      this.addSignalToTable(signal);
    });

    // Position updates are now handled by Positions.js
    // this.api.onPositionUpdate() is removed from here

    // Listen for order notifications (success/error when placing orders)
    this.api.onOrderNotification(notification => {
      this.showNotification(notification.message, notification.type);
    });

    this.api.onUpdateAvailable(info => {
      this.showUpdateNotification(info);
    });

    this.api.onUpdateDownloaded(info => {
      this.showUpdateDownloadedNotification(info);
    });
  }

  updateBotStatus(status) {
    const botStatus = document.getElementById('botStatus');
    const orderStatus = document.getElementById('orderStatus');

    if (botStatus) {
      if (status.isRunning) {
        botStatus.textContent = 'Bot: Đang chạy';
        botStatus.className = 'status-badge active';
      } else {
        botStatus.textContent = 'Bot: Dừng';
        botStatus.className = 'status-badge inactive';
      }
    }

    if (orderStatus) {
      if (status.isOrderActive) {
        orderStatus.textContent = 'Lệnh: Hoạt động';
        orderStatus.className = 'status-badge active';
      } else {
        orderStatus.textContent = 'Lệnh: Không hoạt động';
        orderStatus.className = 'status-badge inactive';
      }
    }
  }

  addSignalToTable(signal) {
    // Add new signal to the top of the table
    const tbody = document.getElementById('signalsTableBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    const time = new Date(signal.timestamp).toLocaleTimeString();
    row.innerHTML = `
      <td>${time}</td>
      <td><strong>${signal.symbol}</strong></td>
      <td><span class="decision-${signal.decision.toLowerCase()}">${signal.decision}</span></td>
      <td>${signal.price || 'N/A'}</td>
      <td>${signal.TP_ROI || 'N/A'} / ${signal.SL_ROI || 'N/A'}</td>
      <td>${signal.confidence || 'N/A'}%</td>
      <td><button class="btn btn-primary btn-table" onclick="if(window.app && window.app.signals) window.app.signals.executeSignal('${signal.id}', this)">Vào</button></td>
    `;
    tbody.insertBefore(row, tbody.firstChild);

    // Keep only last 50 signals
    while (tbody.children.length > 50) {
      tbody.removeChild(tbody.lastChild);
    }
  }

  // DEPRECATED: Positions.js handles position updates via WebSocket
  // This method is kept for backward compatibility only
  // TODO: Remove after ensuring no external calls
  updatePositionInTable(position) {
    console.warn('⚠️ updatePositionInTable is deprecated. Use Positions component instead.');
  }

  async startBot() {
    try {
      this.showLoading('startBtn');
      const result = await this.api.startBot();
      this.hideLoading('startBtn');

      if (result.success) {
        this.showNotification('Bot đã khởi động thành công', 'success');
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading('startBtn');
      this.showNotification(`Lỗi khi khởi động bot: ${error.message}`, 'error');
    }
  }

  async stopBot() {
    try {
      this.showLoading('stopBtn');
      const result = await this.api.stopBot();
      this.hideLoading('stopBtn');

      if (result.success) {
        this.showNotification('Bot đã dừng thành công', 'success');
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading('stopBtn');
      this.showNotification(`Lỗi khi dừng bot: ${error.message}`, 'error');
    }
  }

  async startOrders() {
    try {
      this.showLoading('startOrderBtn');
      const result = await this.api.startOrders();
      this.hideLoading('startOrderBtn');

      if (result.success) {
        this.showNotification('✅ Hệ thống đặt lệnh tự động đã được kích hoạt! Bot sẽ tự động đặt lệnh khi tìm thấy tín hiệu phù hợp.', 'success');
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading('startOrderBtn');
      this.showNotification(`Lỗi khi khởi động lệnh: ${error.message}`, 'error');
    }
  }

  async stopOrders() {
    try {
      this.showLoading('stopOrderBtn');
      const result = await this.api.stopOrders();
      this.hideLoading('stopOrderBtn');

      if (result.success) {
        this.showNotification('Lệnh đã dừng thành công', 'success');
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      this.hideLoading('stopOrderBtn');
      this.showNotification(`Lỗi khi dừng lệnh: ${error.message}`, 'error');
    }
  }

  openSettings() {
    // This will be handled by the Settings component
    if (window.settings) {
      window.settings.openModal();
    }
  }

  openReport() {
    // Call app's openReportModal method
    if (window.app && window.app.openReportModal) {
      window.app.openReportModal();
    } else {
      console.error('❌ Modal báo cáo không khả dụng');
      this.showNotification('Chức năng báo cáo chưa sẵn sàng', 'error');
    }
  }

  showUpdateNotification(info) {
    const notification = document.getElementById('updateNotification');
    const message = document.getElementById('updateMessage');

    if (notification && message) {
      message.textContent = `Phiên bản ${info.version} có sẵn. Bạn có muốn tải xuống và cài đặt không?`;
      notification.style.display = 'block';

      // Setup download button
      document.getElementById('downloadUpdateBtn')?.addEventListener('click', () => {
        this.downloadUpdate();
      });

      // Setup dismiss button
      document.getElementById('dismissUpdateBtn')?.addEventListener('click', () => {
        notification.style.display = 'none';
      });
    }
  }

  showUpdateDownloadedNotification(info) {
    const notification = document.getElementById('updateNotification');
    const message = document.getElementById('updateMessage');

    if (notification && message) {
      message.textContent = `Đã tải xuống bản cập nhật. Ứng dụng sẽ khởi động lại để cài đặt bản cập nhật.`;
      notification.style.display = 'block';

      // Auto-restart after 3 seconds
      setTimeout(() => {
        this.api.installUpdate();
      }, 3000);
    }
  }

  async downloadUpdate() {
    try {
      await this.api.checkForUpdates();
      this.showNotification('Đang tải xuống bản cập nhật...', 'info');
    } catch (error) {
      this.showNotification(`Lỗi khi tải xuống bản cập nhật: ${error.message}`, 'error');
    }
  }

  showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('loading');
      button.disabled = true;
    }
  }

  hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

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
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Placeholder methods for future implementation
  async closePosition(symbol, side) {
    try {
      const result = await this.api.closePosition(symbol, side);

      if (result.success) {
        this.showNotification(result.message, 'success');
        // Reload positions
        await this.loadPositions();
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Lỗi khi đóng vị thế:', error);
      this.showNotification(`Lỗi khi đóng vị thế: ${error.message}`, 'error');
    }
  }

  async executeSignal(signalId) {
    try {
      const result = await this.api.executeSignal(signalId);

      if (result.success) {
        this.showNotification(result.message, 'success');
        // Reload signals
        await this.loadSignals();
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Lỗi khi thực thi tín hiệu:', error);
      this.showNotification(`Lỗi khi thực thi tín hiệu: ${error.message}`, 'error');
    }
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.api.removeAllListeners('bot:status-update');
    this.api.removeAllListeners('signal:new');
    this.api.removeAllListeners('position:update');
    this.api.removeAllListeners('order:notification');
    this.api.removeAllListeners('update-available');
    this.api.removeAllListeners('update-downloaded');
  }

  destroy() {
    this.cleanup();
  }
}

// Export for global access
window.Dashboard = Dashboard;
