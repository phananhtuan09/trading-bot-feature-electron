// Logs Component
class Logs {
  constructor() {
    this.api = new ElectronAPI();
    this.logContainer = document.getElementById('logContainer');
    this.init();
  }

  init() {
    // Listen for real-time logs from the main process
    this.api.onNewLog(log => {
      this.addLogEntry(log);
    });
  }

  async loadLogs() {
    try {
      const logs = await this.api.getLogs();
      this.updateDisplay(logs);
    } catch (error) {
      console.error('Lỗi khi tải logs:', error);
    }
  }

  createLogElement(log) {
    const logEntry = document.createElement('div');
    const level = (log.level || 'info').toLowerCase();
    logEntry.className = `log-entry log-${level}`;

    const time = new Date(log.timestamp).toLocaleTimeString();

    logEntry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-level log-${level}">[${level.toUpperCase()}]</span>
      <span class="log-message">${log.message}</span>
    `;
    return logEntry;
  }

  updateDisplay(logs) {
    if (!this.logContainer) return;

    this.logContainer.innerHTML = '';

    if (!logs || logs.length === 0) {
      this.logContainer.innerHTML = '<div class="log-entry log-info">Không có logs nào</div>';
      return;
    }

    // Display the last 100 logs, preserving chronological order (oldest first)
    logs.slice(0, 100).reverse().forEach(log => {
      const logElement = this.createLogElement(log);
      this.logContainer.appendChild(logElement);
    });

    // Auto-scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  addLogEntry(log) {
    if (!this.logContainer) return;

    const logElement = this.createLogElement(log);
    this.logContainer.appendChild(logElement); // Add new log to the end

    // Keep only the last 100 logs by removing the first (oldest) child
    while (this.logContainer.children.length > 100) {
      this.logContainer.removeChild(this.logContainer.firstChild);
    }

    // Auto-scroll to bottom if the user is already near the bottom
    const shouldScroll = this.logContainer.scrollHeight - this.logContainer.clientHeight <= this.logContainer.scrollTop + 50;
    if (shouldScroll) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  cleanup() {
    // Clean up any event listeners or intervals
    console.log('✅ Đã dọn dẹp Logs');
  }
}

// Export for global access
window.Logs = Logs;