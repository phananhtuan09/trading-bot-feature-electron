const StateManager = require('../database/stateStore');
const ConfigManager = require('../database/configStore');
const BinanceService = require('./binanceService');
const { sendOrderMessage } = require('./sendMessage');

class Order {
  constructor() {
    this.isRunning = false;
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
    this.binanceService = new BinanceService();
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  sendNotification(message, type = 'info') {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('order:notification', { message, type });
    }
  }

  // Kiểm tra xem cặp giao dịch có vị thế đang mở hay không
  async checkExistingPosition(symbol) {
    try {
      const positions = await this.binanceService.getPositions();
      return positions.some(p => p.symbol === symbol && Math.abs(p.positionAmt) > 0);
    } catch (error) {
      console.error(`Lỗi kiểm tra vị thế: ${error}`);
      return false;
    }
  }

  // Đặt lệnh giao dịch dựa trên tín hiệu
  async placeOrder(signal) {
    const { symbol, price, decision } = signal;
    const { sendErrorAlert } = require('./sendMessage');

    try {
      // Kiểm tra margin type
      await this.setMarginType(symbol);

      // Đặt lệnh chính
      const { quantity, side } = await this.prepareOrder(symbol, price, decision);
      const orderResult = await this.binanceService.placeOrder({
        symbol,
        side,
        type: 'MARKET',
        quantity,
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }

      // Lấy TP/SL từ settings thay vì từ signal
      const orderSettings = this.configManager.getConfig().ORDER_SETTINGS;
      const TP_ROI = orderSettings.TAKE_PROFIT_PERCENT || 4;
      const SL_ROI = orderSettings.STOP_LOSS_PERCENT || 2;

      // Đặt TP/SL
      const { tpPrice, slPrice } = await this.setTPSL(symbol, side, price, TP_ROI, SL_ROI);

      // Update state
      this.stateManager.addPosition({
        symbol,
        side: decision,
        entryPrice: price,
        stopLoss: slPrice,
        takeProfit: tpPrice,
        status: 'active',
        quantity,
      });

      const successMsg = `✅ Đã vào lệnh ${decision.toUpperCase()} ${symbol} | Giá: ${price.toFixed(4)} | KL: ${quantity}`;
      console.log(`📈 ${successMsg} | SL: ${slPrice.toFixed(4)} | TP: ${tpPrice.toFixed(4)}`);

      // Send success notification to UI
      this.sendNotification(successMsg, 'success');

      // Send order notification to Discord/Telegram
      await sendOrderMessage({
        symbol,
        side,
        price,
        quantity,
        tpPrice,
        slPrice,
        leverage: this.configManager.getConfig().ORDER_SETTINGS?.LEVERAGE || 20,
      });

      return true;
    } catch (error) {
      const errorMsg = `❌ Lỗi đặt lệnh ${symbol}: ${error.message}`;
      console.error(`🔴 ${errorMsg}`);

      // Send error notification to UI
      this.sendNotification(errorMsg, 'error');

      // Send error notification to Telegram/Discord
      await sendErrorAlert(errorMsg);

      return false;
    }
  }

  // Thiết lập loại margin (ISOLATED) cho cặp giao dịch
  async setMarginType(symbol) {
    const result = await this.binanceService.setMarginType(symbol, 'ISOLATED');

    // If margin type is already set correctly, that's fine - don't throw error
    if (result.success || result.message?.includes('already')) {
      return; // Success or already set
    }

    if (!result.success && !result.isTimeout && !result.isTimestampError) {
      // Only throw if it's a critical error (not timeout or timestamp error)
      const errorMsg = `Lỗi set margin type cho ${symbol}: ${result.error}`;
      console.error(`🔴 ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // If it's a timeout, log warning but continue
    if (result.isTimeout) {
      console.warn(`⚠️ Timeout setting margin type for ${symbol}, but continuing...`);
    }

    // If it's a timestamp error, log warning but continue
    if (result.isTimestampError) {
      console.warn(
        `⚠️ Timestamp error setting margin type for ${symbol} - please check system clock`
      );
    }
  }

  // Tính số lượng giao dịch dựa trên giá và cấu hình
  async prepareOrder(symbol, price, decision) {
    const quantity = await this.calculateQuantity(symbol, price);
    if (quantity <= 0) {
      const quantityError = 'Số lượng không hợp lệ';
      throw new Error(quantityError);
    }

    const orderSettings = this.stateManager.getOrdersState();
    const leverage = orderSettings.leverage || 20;

    const leverageResult = await this.binanceService.setLeverage(symbol, leverage);
    if (!leverageResult.success && !leverageResult.isTimeout && !leverageResult.isTimestampError) {
      throw new Error(`Failed to set leverage for ${symbol}: ${leverageResult.error}`);
    }

    if (leverageResult.isTimeout) {
      console.warn(`⚠️ Timeout setting leverage for ${symbol}, but continuing...`);
    }

    if (leverageResult.isTimestampError) {
      console.warn(`⚠️ Timestamp error setting leverage for ${symbol} - please check system clock`);
    }

    return {
      quantity,
      side: decision === 'Long' ? 'BUY' : 'SELL',
    };
  }

  async calculateQuantity(symbol, price) {
    let stepSize;
    try {
      const client = this.binanceService.client;
      const exchangeInfo = await client.futuresExchangeInfo();
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);

      if (!symbolInfo) {
        throw new Error(`Không tìm thấy thông tin cho symbol: ${symbol}`);
      }

      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
      if (!lotSizeFilter || !lotSizeFilter.stepSize) {
        throw new Error(`Không tìm thấy stepSize cho symbol: ${symbol}`);
      }

      stepSize = parseFloat(lotSizeFilter.stepSize);
    } catch (error) {
      console.error(`⚠️ Failed to get exchange info for ${symbol}:`, error.message);
      throw new Error(`Không thể lấy thông tin sàn giao dịch: ${error.message}`);
    }

    const orderSettings = this.stateManager.getOrdersState();
    const quantityPerOrder = orderSettings.quantity || 10;
    const leverage = orderSettings.leverage || 20;

    // Tính toán số lượng chính xác với làm tròn xuống
    const rawQty = (quantityPerOrder * leverage) / price;
    const quantity = Math.floor(rawQty / stepSize) * stepSize;

    return quantity;
  }

  // Thiết lập giá chốt lời (TP) và cắt lỗ (SL)
  async setTPSL(symbol, side, entryPrice, TP_ROI, SL_ROI) {
    try {
      // Calculate TP/SL prices
      const { tp: tpPriceRaw, sl: slPriceRaw } = this.calculateTpSlPrices({
        entryPrice,
        tpRoiPercent: TP_ROI,
        slRoiPercent: Math.abs(SL_ROI),
        side,
      });

      // Get tickSize from exchange info
      let symbolInfo;
      try {
        const client = this.binanceService.client;
        const exchangeInfo = await client.futuresExchangeInfo();
        symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
      } catch (error) {
        console.error(`⚠️ Failed to get exchange info for ${symbol}:`, error.message);
        throw new Error(`Không thể lấy thông tin sàn giao dịch: ${error.message}`);
      }

      const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
      const tickSize = parseFloat(priceFilter.tickSize);

      // Round prices to tickSize
      const roundToTickSize = (price, tickSizeValue) => {
        const precision = -Math.floor(Math.log10(tickSizeValue));
        return Number(price.toFixed(precision));
      };

      const tpPrice = roundToTickSize(tpPriceRaw, tickSize);
      const slPrice = roundToTickSize(slPriceRaw, tickSize);

      // Place TP/SL orders
      await this.placeTPSLOrder(symbol, side, tpPrice, 'TAKE_PROFIT_MARKET');
      await this.placeTPSLOrder(symbol, side, slPrice, 'STOP_MARKET');

      return { tpPrice, slPrice };
    } catch (error) {
      console.error(`Lỗi đặt TP/SL cho ${symbol}: ${error}`);
      throw error;
    }
  }

  // Tính giá TP và SL dựa trên ROI và hướng lệnh
  calculateTpSlPrices({ entryPrice, tpRoiPercent, slRoiPercent, side }) {
    const orderSettings = this.stateManager.getOrdersState();
    const leverage = orderSettings.leverage || 20;

    const tpChange = tpRoiPercent / leverage / 100;
    const slChange = slRoiPercent / leverage / 100;

    let tpPrice, slPrice;
    if (side === 'BUY') {
      tpPrice = entryPrice * (1 + tpChange);
      slPrice = entryPrice * (1 - slChange);
    } else {
      tpPrice = entryPrice * (1 - tpChange);
      slPrice = entryPrice * (1 + slChange);
    }

    return { tp: tpPrice, sl: slPrice };
  }

  // Đặt lệnh TP hoặc SL trên Binance
  async placeTPSLOrder(symbol, side, price, type) {
    const orderSide = side === 'BUY' ? 'SELL' : 'BUY';
    const client = this.binanceService.client;

    // Get tickSize to format stopPrice
    const symbolInfo = (await client.futuresExchangeInfo()).symbols.find(s => s.symbol === symbol);
    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
    const tickSize = parseFloat(priceFilter.tickSize);
    const precision = -Math.floor(Math.log10(tickSize));
    const formattedPrice = Number(price.toFixed(precision));

    const order = await client.futuresOrder({
      symbol,
      side: orderSide,
      type,
      stopPrice: formattedPrice,
      closePosition: true,
    });

    return order;
  }

  // Thực thi quá trình quét tín hiệu và đặt lệnh
  async execute() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Lấy tín hiệu từ StateManager
      const signals = this.stateManager.getSignals();
      if (!signals || signals.length === 0) {
        console.log('Không có tín hiệu nào để giao dịch.');
        this.sendNotification('ℹ️ Không có tín hiệu nào để giao dịch', 'info');
        return;
      }

      // Filter signals without existing positions
      const validSignals = [];
      for (const signal of signals) {
        if (!(await this.checkExistingPosition(signal.symbol))) {
          validSignals.push(signal);
        } else {
          console.log(`🟡 Bỏ qua ${signal.symbol} - Đang có vị thế mở`);
        }
      }

      // Lấy giới hạn lệnh mỗi lần quét từ cấu hình
      const orderSettings = this.stateManager.getOrdersState();
      const scanOrderLimit = orderSettings.orderLimitPerScan || 3;

      // Sort by strength and apply scanOrderLimit
      const filteredSignals = validSignals
        .sort((a, b) => b.strength - a.strength)
        .slice(0, scanOrderLimit);

      // Place orders for filtered signals and track results
      let successCount = 0;
      let errorCount = 0;
      const successfulSignals = []; // Track successfully executed signals

      for (const signal of filteredSignals) {
        console.log(`Đang thực hiện đặt lệnh cho: ${signal.symbol}`);
        const result = await this.placeOrder(signal);
        if (result) {
          successCount++;
          successfulSignals.push(signal);
        } else {
          errorCount++;
        }
      }

      // Remove successfully executed signals from store
      if (successfulSignals.length > 0) {
        const currentSignals = this.stateManager.getSignals();
        const successfulSignalIds = successfulSignals.map(s => s.id);
        const updatedSignals = currentSignals.filter(s => !successfulSignalIds.includes(s.id));
        this.stateManager.setSignals(updatedSignals);

        // Log removed signals
        for (const signal of successfulSignals) {
          this.stateManager.addLog({
            level: 'info',
            message: `Đã xóa tín hiệu ${signal.symbol} sau khi đặt lệnh thành công`,
            type: 'signal_removed',
          });
        }
        console.log(`🗑️ Đã xóa ${successfulSignals.length} tín hiệu sau khi đặt lệnh thành công`);
      }

      // Send summary notification
      if (successCount > 0 || errorCount > 0) {
        const summary = [];
        if (successCount > 0) {
          summary.push(`✅ ${successCount} lệnh thành công`);
        }
        if (errorCount > 0) {
          summary.push(`❌ ${errorCount} lệnh lỗi`);
        }
        this.sendNotification(
          `📊 Kết quả đặt lệnh: ${summary.join(', ')}`,
          successCount > 0 ? 'success' : 'error'
        );
      }

      // Notify if signals were skipped due to scanOrderLimit
      if (validSignals.length > scanOrderLimit) {
        const skipped = validSignals.slice(scanOrderLimit).map(s => s.symbol);
        const skipMsg = `⚠️ Vượt giới hạn ${scanOrderLimit} lệnh/lần, bỏ qua: ${skipped.join(', ')}`;
        console.log(skipMsg);
        this.sendNotification(skipMsg, 'info');
      }
    } catch (error) {
      console.error('Lỗi trong quá trình đặt lệnh:', error);
      this.sendNotification(`❌ Lỗi khi thực thi lệnh: ${error.message}`, 'error');
    }
  }

  async start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    try {
      // Kiểm tra kết nối API
      const balanceData = await this.binanceService.getAccountBalance();
      if (!balanceData.success) {
        throw new Error(balanceData.error);
      }

      // Thực thi ngay lập tức
      await this.execute();

      console.log('✅ Hệ thống đặt lệnh đã khởi động thành công');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('❌ Lỗi khởi động hệ thống đặt lệnh:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    console.log('✅ Hệ thống đặt lệnh đã dừng');
  }
}

module.exports = Order;
