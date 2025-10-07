const Store = require('electron-store')

class StateManager {
  constructor() {
    this.store = new Store({
      name: 'state',
      defaults: {
        // Bot state
        botState: {
          isRunning: false,
          isOrderActive: false,
          lastScanTime: null,
          startTime: null,
          totalScans: 0,
          totalSignals: 0,
          totalErrors: 0
        },
        
        // Account state
        accountState: {
          balance: 0,
          initialCapital: 0,
          totalProfit: 0,
          profitPercentage: 0,
          lastUpdateTime: null
        },
        
        // Orders state
        ordersState: {
          ordersPlacedToday: 0,
          totalOrders: 0,
          totalCapital: 0,
          maxOrdersPerDay: 10,
          orderLimitPerScan: 3
        },
        
        // Positions
        positions: [],
        
        // Signals
        signals: [],
        
        // Logs
        logs: [],
        
        // Statistics
        statistics: {
          winRate: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0
        }
      }
    })
  }

  async initialize() {
    try {
      console.log('StateManager initialized')
      return true
    } catch (error) {
      console.error('Failed to initialize StateManager:', error)
      throw error
    }
  }

  // Bot state methods
  getBotState() {
    return this.store.get('botState')
  }

  updateBotState(updates) {
    const currentState = this.getBotState()
    this.store.set('botState', { ...currentState, ...updates })
  }

  setBotRunning(isRunning) {
    this.updateBotState({ 
      isRunning,
      startTime: isRunning ? Date.now() : null
    })
  }

  setBotOrderActive(isOrderActive) {
    this.updateBotState({ isOrderActive })
  }

  incrementScans() {
    const currentState = this.getBotState()
    this.updateBotState({ 
      totalScans: currentState.totalScans + 1,
      lastScanTime: Date.now()
    })
  }

  incrementSignals() {
    const currentState = this.getBotState()
    this.updateBotState({ 
      totalSignals: currentState.totalSignals + 1
    })
  }

  incrementErrors() {
    const currentState = this.getBotState()
    this.updateBotState({ 
      totalErrors: currentState.totalErrors + 1
    })
  }

  // Account state methods
  getAccountState() {
    return this.store.get('accountState')
  }

  updateAccountState(updates) {
    const currentState = this.getAccountState()
    this.store.set('accountState', { ...currentState, ...updates })
  }

  setBalance(balance) {
    this.updateAccountState({ 
      balance,
      lastUpdateTime: Date.now()
    })
  }

  setInitialCapital(capital) {
    this.updateAccountState({ 
      initialCapital: capital,
      balance: capital
    })
  }

  updateProfit(profit, percentage) {
    this.updateAccountState({ 
      totalProfit: profit,
      profitPercentage: percentage
    })
  }

  // Orders state methods
  getOrdersState() {
    return this.store.get('ordersState')
  }

  updateOrdersState(updates) {
    const currentState = this.getOrdersState()
    this.store.set('ordersState', { ...currentState, ...updates })
  }

  incrementDailyOrders() {
    const currentState = this.getOrdersState()
    this.updateOrdersState({ 
      ordersPlacedToday: currentState.ordersPlacedToday + 1,
      totalOrders: currentState.totalOrders + 1
    })
  }

  resetDailyOrders() {
    this.updateOrdersState({ ordersPlacedToday: 0 })
  }

  // Positions methods
  getPositions() {
    return this.store.get('positions', [])
  }

  addPosition(position) {
    const positions = this.getPositions()
    positions.push({
      ...position,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    })
    this.store.set('positions', positions)
  }

  updatePosition(positionId, updates) {
    const positions = this.getPositions()
    const index = positions.findIndex(p => p.id === positionId)
    if (index !== -1) {
      positions[index] = { ...positions[index], ...updates }
      this.store.set('positions', positions)
    }
  }

  removePosition(positionId) {
    const positions = this.getPositions()
    const filteredPositions = positions.filter(p => p.id !== positionId)
    this.store.set('positions', filteredPositions)
  }

  getActivePositions() {
    const positions = this.getPositions()
    return positions.filter(p => p.status === 'active')
  }

  // Signals methods
  getSignals() {
    return this.store.get('signals', [])
  }

  addSignal(signal) {
    const signals = this.getSignals()
    signals.unshift({
      ...signal,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 1000 signals
    if (signals.length > 1000) {
      signals.splice(1000)
    }
    
    this.store.set('signals', signals)
  }

  getTotalSignals() {
    return this.getSignals().length
  }

  // Logs methods
  getLogs() {
    return this.store.get('logs', [])
  }

  addLog(log) {
    const logs = this.getLogs()
    logs.unshift({
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 500 logs
    if (logs.length > 500) {
      logs.splice(500)
    }
    
    this.store.set('logs', logs)
  }

  // Statistics methods
  getStatistics() {
    return this.store.get('statistics')
  }

  updateStatistics(updates) {
    const currentStats = this.getStatistics()
    this.store.set('statistics', { ...currentStats, ...updates })
  }

  // General methods
  getStats() {
    return {
      bot: this.getBotState(),
      account: this.getAccountState(),
      orders: this.getOrdersState(),
      statistics: this.getStatistics(),
      positions: this.getActivePositions().length,
      signals: this.getTotalSignals(),
      logs: this.getLogs().length
    }
  }

  // Reset all state
  resetState() {
    this.store.clear()
    console.log('State reset to defaults')
  }

  // Export state
  exportState() {
    return JSON.stringify(this.store.store, null, 2)
  }

  // Import state
  importState(stateJson) {
    try {
      const state = JSON.parse(stateJson)
      this.store.set(state)
      console.log('State imported successfully')
      return true
    } catch (error) {
      console.error('Failed to import state:', error)
      throw error
    }
  }
}

module.exports = StateManager
