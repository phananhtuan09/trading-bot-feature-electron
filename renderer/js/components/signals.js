// Signals Component
class Signals {
  constructor() {
    this.api = new ElectronAPI();
  }

  async loadSignals() {
    try {
      const signals = await this.api.getSignals();
      this.updateTable(signals);
    } catch (error) {
      console.error('Lỗi khi tải tín hiệu:', error);
    }
  }

  updateTable(signals) {
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
        <td>${signal.confidence || 'N/A'}%</td>
        <td><button class="btn btn-primary btn-table" onclick="signals.executeSignal('${signal.id}')">Vào</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  async executeSignal(signalId) {
    try {
      const result = await this.api.executeSignal(signalId);

      if (result.success) {
        this.showNotification(result.message, 'success');
        // Reload signals to update status
        await this.loadSignals();
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Lỗi khi thực thi tín hiệu:', error);
      this.showNotification(`Lỗi khi thực thi tín hiệu: ${error.message}`, 'error');
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

  cleanup() {
    // Clean up any event listeners or intervals
    console.log('Signals cleanup completed');
  }
}

// Export for global access
window.Signals = Signals;
