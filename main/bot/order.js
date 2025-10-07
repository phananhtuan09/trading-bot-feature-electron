const StateManager = require('../database/stateStore')
const ConfigManager = require('../database/configStore')
const { binanceTestClient: binanceClient } = require('./clients')

// Mock implementations for now
const performScan = async () => {
  return [
    {
      symbol: 'BTCUSDT',
      decision: 'LONG',
      marketType: 'trending',
      strength: 75,
      TP_ROI: 3.5,
      SL_ROI: -1.5,
      price: 50000,
      confidence: 85,
      timestamp: new Date().toISOString()
    }
  ]
}

const sendMessage = async (message) => {
  console.log(`Message: ${message}`)
}

class Order {
  constructor() {
    this.isRunning = false
    this.stateManager = new StateManager()
    this.configManager = new ConfigManager()
    this.dailyOrderLimit = 10
    this.scanOrderLimit = 3
    this.binanceClient = null
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Order manager is already running')
    }

    try {
      this.isRunning = true
      
      // Initialize Binance client
      await this.initializeBinanceClient()
      
      // Check API connection
      await this.checkBinanceConnection()
      
      // Start order execution
      this.startOrderExecution()
      
      console.log('Order manager started successfully')
      return true
    } catch (error) {
      this.isRunning = false
      console.error('Failed to start order manager:', error)
      throw error
    }
  }

  async stop() {
    if (!this.isRunning) {
      return
    }

    try {
      this.isRunning = false
      console.log('Order manager stopped successfully')
      return true
    } catch (error) {
      console.error('Failed to stop order manager:', error)
      throw error
    }
  }

  async initializeBinanceClient() {
    try {
      const binanceConfig = this.configManager.getBinanceConfig()
      
      if (binanceConfig.IS_TESTING) {
        // Use testnet client
        const Binance = require('binance-api-node').default
        this.binanceClient = Binance({
          apiKey: binanceConfig.TEST_API_KEY,
          apiSecret: binanceConfig.TEST_API_SECRET,
          test: true
        })
        console.log('Initialized Binance Testnet client')
      } else {
        // Use production client
        const Binance = require('binance-api-node').default
        this.binanceClient = Binance({
          apiKey: binanceConfig.API_KEY,
          apiSecret: binanceConfig.API_SECRET
        })
        console.log('Initialized Binance Production client')
      }
    } catch (error) {
      console.error('Failed to initialize Binance client:', error)
      throw error
    }
  }

  async checkBinanceConnection() {
    try {
      const time = await this.binanceClient.time()
      console.log(`✅ Binance: ${new Date(time).toLocaleString()}`)
      return true
    } catch (error) {
      console.error(`❌ Lỗi Binance: ${error}`)
      throw error
    }
  }

  startOrderExecution() {
    // This will be called by the scanner when signals are found
    console.log('Order execution ready')
  }

  // Kiểm tra xem cặp giao dịch có vị thế đang mở hay không
  async checkExistingPosition(symbol) {
    try {
      const positions = await this.binanceClient.futuresPositionRisk()
      return positions.some((p) => p.symbol === symbol && Math.abs(parseFloat(p.positionAmt)) > 0)
    } catch (error) {
      console.error(`Lỗi kiểm tra vị thế: ${error}`)
      await sendMessage('Lỗi kiểm tra vị thế:', error?.message)
      return false
    }
  }

  // Show thông tin số dư và lợi nhuận
  async logBalance() {
    try {
      const balances = await this.binanceClient.futuresAccountBalance()
      const usdtBalance = balances.find((b) => b.asset === 'USDT')

      const walletBalance = parseFloat(usdtBalance.balance)
      const availableBalance = parseFloat(usdtBalance.availableBalance)

      const accountState = this.stateManager.getAccountState()
      const currentCapital = accountState.initialCapital || walletBalance

      if (!accountState.initialCapital) {
        this.stateManager.setInitialCapital(walletBalance)
      }

      const unrealizedProfit = await this.getUnrealizedProfit()
      const currentTotal = walletBalance + unrealizedProfit

      const profit = currentTotal - currentCapital
      const profitPercent = ((profit / currentCapital) * 100).toFixed(2)

      const profitMessage = `
💰 Số dư khả dụng: ${availableBalance.toFixed(2)} USDT
📈 Lợi nhuận: ${isNaN(profit) ? 0 : profit.toFixed(2)} USDT (${isNaN(profitPercent) ? 0 : profitPercent}%)
      `
      console.log(profitMessage)
      
      // Update state
      this.stateManager.setBalance(walletBalance)
      this.stateManager.updateProfit(profit, profitPercent)
      
      return {
        availableBalance,
        profit: isNaN(profit) ? 0 : profit.toFixed(2),
        profitPercent: isNaN(profitPercent) ? 0 : profitPercent,
      }
    } catch (error) {
      console.error(`Lỗi khi log balance: ${error}`)
      await sendMessage(`🔴 Lỗi khi kiểm tra balance: ${error.message}`)
      return { availableBalance: 0, profit: 0, profitPercent: 0 }
    }
  }

  // Lấy tổng lợi nhuận chưa thực hiện từ các vị thế
  async getUnrealizedProfit() {
    try {
      const positions = await this.binanceClient.futuresPositionRisk()
      if (!Array.isArray(positions) || positions.length === 0) {
        return 0
      }

      const totalUnrealizedProfit = positions.reduce((sum, p) => {
        const profit = parseFloat(p.unRealizedProfit)
        if (Number.isNaN(profit)) {
          return sum // Skip invalid values
        }
        return sum + profit
      }, 0)

      return totalUnrealizedProfit
    } catch (error) {
      console.error(`Lỗi lấy tổng lợi nhuận chưa thực hiện từ các vị thế: ${error}`)
      await sendMessage(`Lỗi lấy tổng lợi nhuận chưa thực hiện từ các vị thế: ${error.message}`)
      return 0 // Fallback to 0 on error
    }
  }

  // Đặt lệnh giao dịch dựa trên tín hiệu
  async placeOrder(signal) {
    const ordersState = this.stateManager.getOrdersState()
    
    if (ordersState.ordersPlacedToday >= this.dailyOrderLimit) {
      const limitMessage = `⚠️ Đã đạt giới hạn ${this.dailyOrderLimit} lệnh/ngày`
      console.log(limitMessage)
      await sendMessage(limitMessage)
      return false
    }

    try {
      // Check existing position
      if (await this.checkExistingPosition(signal.symbol)) {
        const existMessage = `🟡 Bỏ qua ${signal.symbol} - Đang có vị thế mở`
        console.log(existMessage)
        await sendMessage(existMessage)
        return false
      }

      // Place order logic here
      const orderResult = await this.executeOrder(signal)
      
      if (orderResult.success) {
        // Update state
        this.stateManager.incrementDailyOrders()
        this.stateManager.addPosition({
          symbol: signal.symbol,
          side: signal.decision,
          entryPrice: orderResult.entryPrice,
          stopLoss: orderResult.stopLoss,
          takeProfit: orderResult.takeProfit,
          status: 'active',
          quantity: orderResult.quantity
        })

        const successMessage = `📈 Mở ${signal.decision} ${signal.symbol} | Entry: ${orderResult.entryPrice} | SL: ${orderResult.stopLoss} | TP: ${orderResult.takeProfit}`
        console.log(successMessage)
        await sendMessage(successMessage)
        
        return true
      } else {
        console.error(`Failed to place order for ${signal.symbol}: ${orderResult.error}`)
        return false
      }
    } catch (error) {
      console.error(`Error placing order for ${signal.symbol}:`, error)
      await sendMessage(`🔴 Lỗi đặt lệnh ${signal.symbol}: ${error.message}`)
      return false
    }
  }

  async executeOrder(signal) {
    try {
      const orderSettings = this.configManager.getOrderSettings()
      
      // Calculate order parameters
      const quantity = orderSettings.QUANTITY
      const leverage = orderSettings.LEVERAGE
      
      // Set leverage
      await this.binanceClient.futuresLeverage({
        symbol: signal.symbol,
        leverage: leverage
      })

      // Place order
      const order = await this.binanceClient.futuresOrder({
        symbol: signal.symbol,
        side: signal.decision.toLowerCase(),
        type: 'MARKET',
        quantity: quantity
      })

      return {
        success: true,
        orderId: order.orderId,
        entryPrice: order.avgPrice || signal.price,
        stopLoss: signal.SL_ROI,
        takeProfit: signal.TP_ROI,
        quantity: quantity
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Thực thi quá trình quét tín hiệu và đặt lệnh
  async execute() {
    if (!this.isRunning) return

    try {
      // Reset daily orders if needed
      this.stateManager.resetDailyOrders()

      const signals = await performScan()
      if (!signals || signals.length === 0) {
        const noSignalMessage = 'Không có tín hiệu nào để giao dịch.'
        console.log(noSignalMessage)
        await sendMessage(noSignalMessage)
        return
      }

      // Filter signals without existing positions
      const validSignals = []
      for (const signal of signals) {
        if (!(await this.checkExistingPosition(signal.symbol))) {
          validSignals.push(signal)
        } else {
          const existMessage = `🟡 Bỏ qua ${signal.symbol} - Đang có vị thế mở`
          console.log(existMessage)
          await sendMessage(existMessage)
        }
      }

      // Sort and apply scanOrderLimit
      const filteredSignals = validSignals.sort((a, b) => b.TP_ROI - a.TP_ROI).slice(0, this.scanOrderLimit)

      // Place orders for filtered signals
      for (const signal of filteredSignals) {
        console.log(`Đang thực hiện đặt lệnh cho: ${signal.symbol}`)
        await this.placeOrder(signal)
      }

      // Notify if signals were skipped due to scanOrderLimit
      if (validSignals.length > this.scanOrderLimit) {
        const skipped = validSignals.slice(this.scanOrderLimit).map((s) => s.symbol)
        const limitMessage = `⚠️ Vượt giới hạn ${this.scanOrderLimit} lệnh/lần, bỏ qua: ${skipped.join(', ')}`
        console.log(limitMessage)
        await sendMessage(limitMessage)
      }
    } catch (error) {
      console.error('Error in order execution:', error)
      await sendMessage(`🔴 Lỗi thực thi đặt lệnh: ${error.message}`)
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      dailyOrderLimit: this.dailyOrderLimit,
      scanOrderLimit: this.scanOrderLimit,
      ordersPlacedToday: this.stateManager.getOrdersState().ordersPlacedToday,
      totalOrders: this.stateManager.getOrdersState().totalOrders
    }
  }
}

module.exports = Order
