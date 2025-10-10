class Positions {
  constructor() {
    this.api = new ElectronAPI();
    this.tbody = document.getElementById('positionsTableBody');
    this.updateInterval = null;
    this.botIsRunning = false; // Track bot status
    this.init();
  }

  async init() {
    // Set up real-time update listener from WebSocket
    this.api.onPositionUpdate(position => {
      console.log('🔄 Real-time position update from WebSocket:', position.symbol);
      this.handlePositionUpdate(position);
    });
    
    // Listen to bot status to adjust polling strategy
    this.api.onBotStatusUpdate(status => {
      this.botIsRunning = status.isRunning;
      // Adjust polling interval based on bot status
      this.adjustPollingStrategy();
    });
    
    // Load initial positions
    await this.loadPositions();
    
    // Setup periodic polling to ensure updates even when WebSocket is not active
    // This provides a fallback when bot is not running
    this.startPeriodicUpdates();
  }

  startPeriodicUpdates() {
    // Poll positions every 3 seconds for real-time price updates
    // When bot is running, WebSocket provides real-time updates
    // Polling serves as a backup/fallback
    this.updateInterval = setInterval(async () => {
      await this.refreshPositions();
    }, 3000);
    
    console.log('✅ Positions: Started periodic updates (every 3s)');
  }

  adjustPollingStrategy() {
    // Optional: Adjust polling frequency based on bot status
    // When bot running: WebSocket handles real-time, polling is backup (can be slower)
    // When bot stopped: Polling is primary update source (keep it fast)
    
    // For now, keep 3s interval for both cases for consistency
    // Could optimize later: 10s when bot running, 3s when stopped
    console.log(`📊 Positions: Bot ${this.botIsRunning ? 'RUNNING' : 'STOPPED'} - Polling strategy: 3s interval`);
  }

  async refreshPositions() {
    try {
      const positions = await this.api.getPositions();
      
      // Update each position individually without destroying the table
      if (positions && positions.length > 0) {
        positions.forEach(position => {
          this.handlePositionUpdate(position);
        });
      } else if (this.tbody) {
        // No positions - show empty message if table has content
        if (this.tbody.children.length > 0) {
          const firstRow = this.tbody.children[0];
          // Check if it's not already the "no positions" message
          if (!firstRow.querySelector('td[colspan="6"]')) {
            this.tbody.innerHTML =
              '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>';
          }
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing positions:', error);
    }
  }

  async loadPositions() {
    try {
      console.log('🔄 Loading positions...');
      const positions = await this.api.getPositions();
      console.log('📥 Received positions:', positions?.length || 0, positions);
      this.updateTable(positions);
    } catch (error) {
      console.error('❌ Lỗi khi tải vị thế:', error);
    }
  }

  updateTable(positions) {
    if (!this.tbody) {
      return;
    }

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
    
    // Determine side: LONG if positionAmt > 0, SHORT if < 0
    let side = position.side;
    if (!side && position.positionAmt !== undefined) {
      side = parseFloat(position.positionAmt) > 0 ? 'LONG' : 'SHORT';
    }
    
    // Calculate percentage based on entry price and size if not provided
    const size = Math.abs(position.positionAmt || position.size || 0);
    const entryPrice = parseFloat(position.entryPrice) || 0;
    const pnlPercentage = entryPrice > 0 ? (pnl / (size * entryPrice) * 100) : 0;

    row.innerHTML = `
      <td><strong>${position.symbol}</strong></td>
      <td><span class="decision-${side.toLowerCase()}">${side}</span></td>
      <td data-field="entryPrice">${position.entryPrice ? parseFloat(position.entryPrice).toFixed(4) : 'N/A'}</td>
      <td data-field="markPrice">${position.markPrice ? parseFloat(position.markPrice).toFixed(4) : 'N/A'}</td>
      <td data-field="pnl" style="color: ${pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
        ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)
      </td>
      <td><button class="btn btn-danger btn-table" onclick="app.positions.closePosition('${position.symbol}', '${side}', this)">Đóng</button></td>
    `;
    return row;
  }

  handlePositionUpdate(position) {
    if (!this.tbody) {
      console.error('❌ tbody not found!');
      return;
    }

    console.log('📊 Position update:', {
      symbol: position.symbol,
      markPrice: position.markPrice,
      unrealizedPnl: position.unrealizedPnl,
      positionAmt: position.positionAmt
    });

    const row = this.tbody.querySelector(`tr[data-symbol="${position.symbol}"]`);
    console.log('🔍 Found existing row:', row ? 'YES' : 'NO');

    // If position amount is 0 or close to 0, remove it
    const posAmt = parseFloat(position.positionAmt || position.size || 0);
    if (Math.abs(posAmt) < 1e-8) {
      if (row) {
        row.remove();
        // Show "no positions" message if table is empty
        if (this.tbody.children.length === 0) {
          this.tbody.innerHTML =
            '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>';
        }
      }
      return;
    }

    if (row) {
      // Update existing row - only update price and PnL cells
      const pnlCell = row.querySelector('td[data-field="pnl"]');
      const markPriceCell = row.querySelector('td[data-field="markPrice"]');
      const entryPriceCell = row.querySelector('td[data-field="entryPrice"]');

      const pnl = parseFloat(position.unrealizedPnl) || 0;
      const entryPrice = parseFloat(position.entryPrice) || parseFloat(entryPriceCell?.textContent) || 0;
      const size = Math.abs(parseFloat(position.positionAmt) || 0);
      const pnlPercentage = entryPrice > 0 && size > 0 ? (pnl / (size * entryPrice) * 100) : 0;

      // Update entry price if provided
      if (entryPriceCell && position.entryPrice) {
        entryPriceCell.textContent = parseFloat(position.entryPrice).toFixed(4);
      }

      // Update mark price (current price)
      if (markPriceCell && position.markPrice) {
        const newPrice = parseFloat(position.markPrice).toFixed(4);
        markPriceCell.textContent = newPrice;
        console.log('✅ Updated markPrice:', newPrice);
      }

      // Update PnL
      if (pnlCell) {
        pnlCell.style.color = pnl >= 0 ? '#10b981' : '#ef4444';
        pnlCell.innerHTML = `
          ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)
        `;
        console.log('✅ Updated PnL:', pnl.toFixed(2));
      }
    } else {
      // Remove "no positions" message if it exists
      const noDataRow = this.tbody.querySelector('tr td[colspan="6"]');
      if (noDataRow) {
        this.tbody.innerHTML = '';
      }
      
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
        this.showNotification(result.message || `Đã đóng vị thế ${symbol} thành công`, 'success');
        
        // Remove the row immediately for better UX
        if (buttonElement) {
          const row = buttonElement.closest('tr');
          if (row) {
            row.remove();
            
            // Show "no positions" message if table is empty
            if (this.tbody && this.tbody.children.length === 0) {
              this.tbody.innerHTML =
                '<tr><td colspan="6" style="text-align: center; color: #666;">Không có vị thế nào</td></tr>';
            }
          }
        }
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
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('✅ Positions: Stopped periodic updates');
    }
    console.log('Positions cleanup completed');
  }
}

window.Positions = Positions;

