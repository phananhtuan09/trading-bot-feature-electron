// Positions Component
class Positions {
  constructor() {
    this.api = new ElectronAPI();
    this.tbody = document.getElementById('positionsTableBody');
    this.init();
  }

  init() {
    this.api.onPositionUpdate(position => {
      this.handlePositionUpdate(position);
    });
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
    if (!this.tbody) return;

    this.tbody.innerHTML = '';

    if (!positions || positions.length === 0) {
      this.tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>';
      return;
    }

    positions.forEach(position => {
      const row = this.createPositionRow(position);
      this.tbody.appendChild(row);
    });
  }

  createPositionRow(position) {
    const row = document.createElement('tr');
    row.setAttribute('data-symbol', position.symbol);

    const pnl = position.unrealizedPnl || 0;
    // Calculate percentage based on entry price and size if not provided
    const pnlPercentage = pnl / (Math.abs(position.size) * position.entryPrice) * 100 || 0;

    row.innerHTML = `
      <td><strong>${position.symbol}</strong></td>
      <td><span class="decision-${position.side.toLowerCase()}">${position.side}</span></td>
      <td data-field="entryPrice">${position.entryPrice ? position.entryPrice.toFixed(4) : 'N/A'}</td>
      <td data-field="markPrice">${position.markPrice ? position.markPrice.toFixed(4) : 'N/A'}</td>
      <td data-field="pnl" style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)
      </td>
      <td><button class="btn btn-danger btn-table" onclick="app.positions.closePosition('${position.symbol}', '${position.side}', this)">Đóng</button></td>
    `;
    return row;
  }

  handlePositionUpdate(position) {
    if (!this.tbody) return;

    const row = this.tbody.querySelector(`tr[data-symbol="${position.symbol}"]`);

    // If position amount is 0 or close to 0, remove it
    if (Math.abs(position.positionAmt) < 1e-8) {
      if (row) {
        row.remove();
      }
      return;
    }

    if (row) {
      // Update existing row
      const pnlCell = row.querySelector('td[data-field="pnl"]');
      const markPriceCell = row.querySelector('td[data-field="markPrice"]');

      // DEBUG: Use a random number to check if the update pipeline is working
      const pnl = Math.random() * 10 - 5;

      const entryPrice = parseFloat(row.querySelector('td[data-field="entryPrice"]').textContent);
      const size = Math.abs(position.positionAmt);
      const pnlPercentage = pnl / (size * entryPrice) * 100 || 0;

      if (markPriceCell) {
        // Assuming markPrice is sent in the update, otherwise this needs adjustment
        markPriceCell.textContent = position.markPrice ? position.markPrice.toFixed(4) : 'N/A';
      }

      if (pnlCell) {
        pnlCell.style.color = pnl >= 0 ? '#10b981' : '#ef4444';
        pnlCell.innerHTML = `
          ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)
        `;
      }
    } else {
      // Position is new, add it to the table
      const newRow = this.createPositionRow(position);
      this.tbody.appendChild(newRow);
    }
  }

  async closePosition(symbol, side, buttonElement) {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = 'Đang đóng...';
    }

    try {
      const result = await this.api.closePosition(symbol, side);

      if (result.success) {
        this.showNotification(result.message, 'success');
        // The row will be removed by the handlePositionUpdate event, so no need to reload.
      } else {
        this.showNotification(`Lỗi: ${result.error}`, 'error');
        if (buttonElement) {
          buttonElement.disabled = false;
          buttonElement.textContent = 'Đóng';
        }
      }
    } catch (error) {
      console.error('Lỗi khi đóng vị thế:', error);
      this.showNotification(`Lỗi khi đóng vị thế: ${error.message}`, 'error');
      if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.textContent = 'Đóng';
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

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

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  cleanup() {
    console.log('Positions cleanup completed');
  }
}

window.Positions = Positions;