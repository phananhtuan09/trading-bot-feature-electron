// Positions Component
class Positions {
  constructor() {
    this.api = new ElectronAPI()
  }

  async loadPositions() {
    try {
      const positions = await this.api.getPositions()
      this.updateTable(positions)
    } catch (error) {
      console.error('Error loading positions:', error)
    }
  }

  updateTable(positions) {
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
        <td><button class="btn btn-danger btn-table" onclick="positions.closePosition('${position.id}')">Đóng</button></td>
      `
      tbody.appendChild(row)
    })
  }

  async closePosition(positionId) {
    try {
      // This would call an API method to close the position
      console.log('Closing position:', positionId)
      // await this.api.closePosition(positionId)
    } catch (error) {
      console.error('Error closing position:', error)
    }
  }
}

// Export for global access
window.Positions = Positions
