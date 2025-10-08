// Positions Component
class Positions {
  constructor() {
    this.api = new ElectronAPI();
  }

  async loadPositions() {
    try {
      const positions = await this.api.getPositions();
      this.updateTable(positions);
    } catch (error) {
      console.error('Lỗi khi tải vị thế:', error);
    }
  }

  updateTable(positions) {
    const tbody = document.getElementById('positionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!positions || positions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>';
      return;
    }

    positions.forEach(position => {
      const row = document.createElement('tr');
      const pnl = position.unrealizedPnl || 0;
      const percentage = position.percentage || 0;

      row.innerHTML = `
        <td><strong>${position.symbol}</strong></td>
        <td><span class="decision-${position.side.toLowerCase()}">${position.side}</span></td>
        <td>${position.entryPrice ? position.entryPrice.toFixed(4) : 'N/A'}</td>
        <td>${position.markPrice ? position.markPrice.toFixed(4) : 'N/A'}</td>
        <td style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
          ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%)
        </td>
        <td><button class="btn btn-danger btn-table" onclick="positions.closePosition('${position.symbol}', '${position.side}')">Đóng</button></td>
      `;
      tbody.appendChild(row);
    });
  }

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
    console.log('Positions cleanup completed');
  }
}

// Export for global access
window.Positions = Positions;
