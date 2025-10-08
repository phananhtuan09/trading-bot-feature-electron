const StateManager = require('../database/stateStore');
const ConfigManager = require('../database/configStore');
const BinanceService = require('./binanceService');

class Order {
  constructor(scanner) {
    this.isRunning = false;
    this.stateManager = new StateManager();
    this.configManager = new ConfigManager();
    this.binanceService = new BinanceService();
    this.scanner = scanner; // Nhận scanner từ BotManager
    this.scanOrderLimit = 3; // Giới hạn đơn giản
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
    const { symbol, price, decision, TP_ROI, SL_ROI } = signal;

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

      console.log(`📈 Đã mở ${side} ${symbol} | Giá vào: ${price.toFixed(4)} | SL: ${slPrice.toFixed(4)} | TP: ${tpPrice.toFixed(4)} | KL: ${quantity}`);
      return true;
    } catch (error) {
      console.error(`🔴 Lỗi đặt lệnh ${symbol}: ${error.message}`);
      return false;
    }
  }

  // Thiết lập loại margin (ISOLATED) cho cặp giao dịch
  async setMarginType(symbol) {
    try {
      const client = this.binanceService.client;
      await client.futuresMarginType({ symbol, marginType: 'ISOLATED' });
    } catch (error) {
      if (!error.message.includes('No need')) {
        console.error(`🔴 Lỗi set margin type cho ${symbol}: ${error}`);
        throw error;
      }
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
    const client = this.binanceService.client;

    await client.futuresLeverage({
      symbol,
      leverage: orderSettings.leverage || 20,
    });

    return {
      quantity,
      side: decision === 'Long' ? 'BUY' : 'SELL',
    };
  }

  async calculateQuantity(symbol, price) {
    const client = this.binanceService.client;
    const exchangeInfo = await client.futuresExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const stepSize = parseFloat(lotSizeFilter.stepSize);

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
      const client = this.binanceService.client;
      const symbolInfo = (await client.futuresExchangeInfo()).symbols.find(s => s.symbol === symbol);
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
      console.error(`setTPSL error for ${symbol}: ${error}`);
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
      // Sử dụng scanner để lấy tín hiệu
      const signals = await this.scanner.performScan();
      if (!signals || signals.length === 0) {
        console.log('Không có tín hiệu nào để giao dịch.');
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

      // Sort and apply scanOrderLimit
      const filteredSignals = validSignals
        .sort((a, b) => b.TP_ROI - a.TP_ROI)
        .slice(0, this.scanOrderLimit);

      // Place orders for filtered signals
      for (const signal of filteredSignals) {
        console.log(`Đang thực hiện đặt lệnh cho: ${signal.symbol}`);
        await this.placeOrder(signal);
      }

      // Notify if signals were skipped due to scanOrderLimit
      if (validSignals.length > this.scanOrderLimit) {
        const skipped = validSignals.slice(this.scanOrderLimit).map(s => s.symbol);
        console.log(`⚠️ Vượt giới hạn ${this.scanOrderLimit} lệnh/lần, bỏ qua: ${skipped.join(', ')}`);
      }
    } catch (error) {
      console.error('Error in order execution:', error);
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

      console.log('Orders started successfully');
      return true;
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start orders:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    console.log('Orders stopped successfully');
  }
}

module.exports = Order;