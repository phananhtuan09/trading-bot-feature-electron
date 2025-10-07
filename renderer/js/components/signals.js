// Signals Component
class Signals {
  constructor() {
    this.api = new ElectronAPI()
  }

  async loadSignals() {
    try {
      const signals = await this.api.getSignals()
      this.updateTable(signals)
    } catch (error) {
      console.error('Error loading signals:', error)
    }
  }

  updateTable(signals) {
    const tbody = document.getElementById('signalsTableBody')
    if (!tbody) return

    tbody.innerHTML = ''

    if (!signals || signals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">Không có tín hiệu nào</td></tr>'
      return
    }

    signals.slice(0, 50).forEach(signal => { // Show only last 50 signals
      const row = document.createElement('tr')
      const time = new Date(signal.timestamp).toLocaleTimeString()
      row.innerHTML = `
        <td>${time}</td>
        <td><strong>${signal.symbol}</strong></td>
        <td><span class="decision-${signal.decision.toLowerCase()}">${signal.decision}</span></td>
        <td>${signal.price || 'N/A'}</td>
        <td>${signal.TP_ROI || 'N/A'} / ${signal.SL_ROI || 'N/A'}</td>
        <td>${signal.confidence || 'N/A'}%</td>
        <td><button class="btn btn-primary btn-table" onclick="signals.executeSignal('${signal.id}')">Vào</button></td>
      `
      tbody.appendChild(row)
    })
  }

  async executeSignal(signalId) {
    try {
      // This would call an API method to execute the signal
      console.log('Executing signal:', signalId)
      // await this.api.executeSignal(signalId)
    } catch (error) {
      console.error('Error executing signal:', error)
    }
  }
}

// Export for global access
window.Signals = Signals
