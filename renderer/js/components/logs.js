// Logs Component
class Logs {
  constructor() {
    this.api = new ElectronAPI();
  }

  async loadLogs() {
    try {
      const logs = await this.api.getLogs();
      this.updateDisplay(logs);
    } catch (error) {
      console.error('Lỗi khi tải logs:', error);
    }
  }

  updateDisplay(logs) {
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

  addLog(log) {
    const container = document.getElementById('logContainer');
    if (!container) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${log.level || 'info'}`;

    const time = new Date(log.timestamp).toLocaleTimeString();
    logEntry.innerHTML = `
      <span class="log-time">[${time}]</span> 
      <span class="log-${log.level || 'info'}">${log.message}</span>
    `;

    container.insertBefore(logEntry, container.firstChild);

    // Keep only last 100 logs
    while (container.children.length > 100) {
      container.removeChild(container.lastChild);
    }
  }

  cleanup() {
    // Clean up any event listeners or intervals
    console.log('Logs cleanup completed');
  }
}

// Export for global access
window.Logs = Logs;
