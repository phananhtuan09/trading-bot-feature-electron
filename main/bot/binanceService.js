const Binance = require('binance-api-node').default;
const ConfigManager = require('../database/configStore');

// Utility function to add delay between API requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class BinanceService {
  constructor(binanceConfig = null) {
    // Allow passing config from outside, or get from store
    if (!binanceConfig) {
      const configManager = new ConfigManager();
      binanceConfig = configManager.getBinanceConfig();
    }

    this.isTestnet = binanceConfig.IS_TESTING;

    const apiKey = this.isTestnet ? binanceConfig.TEST_API_KEY : binanceConfig.API_KEY;
    const apiSecret = this.isTestnet ? binanceConfig.TEST_API_SECRET : binanceConfig.API_SECRET;

    const options = {
      apiKey,
      apiSecret,
      timeout: 60000, // 60 seconds timeout
      recvWindow: 60000, // 60 seconds recv window
      keepAlive: true,
    };
    if (this.isTestnet) {
      options.httpFutures = 'https://testnet.binancefuture.com';
    }

    if (!apiKey || !apiSecret) {
      console.error('Binance API key and secret are required.');
      // We don't throw an error here, but calls will fail.
      // The UI should prevent starting the bot without keys.
      this.client = null;
      return; // Exit early, don't initialize client
    }

    this.client = Binance(options);
  }

  // Subscribe to user account updates via WebSocket
  subscribeToAccountUpdates(callback) {
    if (!this.client) {
      console.error('Binance client not initialized. Please configure API keys.');
      return null;
    }

    try {
      const clean = this.client.ws.user(callback);
      return clean;
    } catch (error) {
      console.error('Failed to subscribe to user data stream:', error);
      return null;
    }
  }

  // Test connection
  async testConnection() {
    if (!this.client) {
      return {
        success: false,
        message: 'Binance client not initialized. Please configure API keys.',
        error: 'No API keys configured',
      };
    }

    try {
      const accountInfo = await this.client.futuresAccountInfo();
      return {
        success: true,
        message: 'Kết nối Binance thành công',
        accountType: this.isTestnet ? 'Testnet' : 'Mainnet',
        canTrade: accountInfo.canTrade,
        canWithdraw: accountInfo.canWithdraw,
        canDeposit: accountInfo.canDeposit,
      };
    } catch (error) {
      console.error('Binance connection test failed:', error);

      let errorMessage = 'Lỗi kết nối Binance không xác định';

      if (error.code === -2015) {
        errorMessage =
          'API key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API key và secret.';
      } else if (error.code === -1021) {
        errorMessage = 'Timestamp không đồng bộ. Vui lòng kiểm tra thời gian hệ thống.';
      } else if (error.code === -2014) {
        errorMessage = 'API key không có quyền thực hiện hành động này.';
      } else if (error.message.includes('Invalid API-key')) {
        errorMessage = 'API key không hợp lệ. Vui lòng kiểm tra lại cấu hình.';
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        code: error.code,
      };
    }
  }

  // Get account balance
  async getAccountBalance() {
    if (!this.client) {
      throw new Error('Binance client not initialized. Please configure API keys.');
    }

    try {
      const accountInfo = await this.client.futuresAccountInfo();
      const usdtBalance = accountInfo.assets.find(asset => asset.asset === 'USDT');

      return {
        success: true,
        balance: parseFloat(usdtBalance?.walletBalance || 0),
        availableBalance: parseFloat(usdtBalance?.availableBalance || 0),
        unrealizedPnl: parseFloat(usdtBalance?.unrealizedProfit || 0),
        marginBalance: parseFloat(usdtBalance?.marginBalance || 0),
        accountType: this.isTestnet ? 'Testnet' : 'Mainnet',
      };
    } catch (error) {
      console.error('Failed to get account balance:', error);

      let errorMessage = 'Lỗi lấy số dư tài khoản';
      if (error.code === -2015) {
        errorMessage = 'API key không hợp lệ hoặc không có quyền truy cập';
      }

      return {
        success: false,
        error: errorMessage,
        code: error.code,
      };
    }
  }

  // Get all positions
  async getPositions() {
    if (!this.client) {
      console.warn('⚠️ Binance client not initialized. Please configure API keys.');
      return [];
    }

    try {
      const positions = await this.client.futuresPositionRisk();
      const activePositions = positions.filter(pos => parseFloat(pos.positionAmt) !== 0);

      return activePositions.map(position => {
        const posAmt = parseFloat(position.positionAmt);

        const mappedPosition = {
          symbol: position.symbol,
          side: posAmt > 0 ? 'LONG' : 'SHORT',
          positionAmt: posAmt, // Keep original for UI logic
          size: Math.abs(posAmt),
          entryPrice: parseFloat(position.entryPrice),
          markPrice: parseFloat(position.markPrice),
          unrealizedPnl: parseFloat(position.unRealizedProfit || position.unrealizedPnl || 0),
          percentage: parseFloat(position.percentage || 0),
          leverage: parseFloat(position.leverage),
          marginType: position.marginType,
          isolatedMargin: parseFloat(position.isolatedMargin),
          isAutoAddMargin: position.isAutoAddMargin,
          positionSide: position.positionSide,
          notional: parseFloat(position.notional),
          isolatedWallet: parseFloat(position.isolatedWallet),
          updateTime: position.updateTime,
        };

        return mappedPosition;
      });
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách vị thế:', error.message);
      return [];
    }
  }

  // Get position for specific symbol
  async getPosition(symbol) {
    try {
      const positions = await this.getPositions();
      return positions.find(pos => pos.symbol === symbol);
    } catch (error) {
      console.error(`Failed to get position for ${symbol}:`, error);
      return null;
    }
  }

  // Close position
  async closePosition(symbol, side) {
    if (!this.client) {
      throw new Error('Binance client not initialized. Please configure API keys.');
    }

    try {
      const position = await this.getPosition(symbol);
      if (!position) {
        throw new Error(`Không tìm thấy vị thế cho ${symbol}`);
      }

      const orderSide = side === 'LONG' ? 'SELL' : 'BUY';
      const quantity = position.size;

      const order = await this.client.futuresOrder({
        symbol: symbol,
        side: orderSide,
        type: 'MARKET',
        quantity: quantity.toString(),
        positionSide: 'BOTH',
        reduceOnly: true,
      });
      return {
        success: true,
        orderId: order.orderId,
        symbol: symbol,
        side: orderSide,
        quantity: quantity,
        message: `Đã đóng vị thế ${symbol} thành công`,
      };
    } catch (error) {
      console.error(`Failed to close position ${symbol}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Place order
  async placeOrder(orderData) {
    if (!this.client) {
      throw new Error('Binance client not initialized. Please configure API keys.');
    }

    try {
      const {
        symbol,
        side,
        type = 'MARKET',
        quantity,
        price,
        stopPrice,
        timeInForce = 'GTC',
        reduceOnly = false,
      } = orderData;

      const orderParams = {
        symbol,
        side,
        type,
        quantity: quantity.toString(),
        positionSide: 'BOTH',
      };

      if (type === 'LIMIT' && price) {
        orderParams.price = price.toString();
        orderParams.timeInForce = timeInForce;
      }

      if (stopPrice) {
        orderParams.stopPrice = stopPrice.toString();
      }

      if (reduceOnly) {
        orderParams.reduceOnly = true;
      }

      const order = await this.client.futuresOrder(orderParams);

      return {
        success: true,
        orderId: order.orderId,
        symbol: symbol,
        side: side,
        type: type,
        quantity: quantity,
        status: order.status,
        message: `Đã đặt lệnh ${symbol} thành công`,
      };
    } catch (error) {
      console.error(`Failed to place order:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get order status
  async getOrderStatus(symbol, orderId) {
    try {
      const order = await this.client.futuresGetOrder({
        symbol,
        orderId,
      });

      return {
        success: true,
        order: {
          orderId: order.orderId,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: parseFloat(order.origQty),
          price: parseFloat(order.price || 0),
          status: order.status,
          timeInForce: order.timeInForce,
          reduceOnly: order.reduceOnly,
          updateTime: order.updateTime,
        },
      };
    } catch (error) {
      console.error(`Failed to get order status:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get recent orders
  async getRecentOrders(symbol, limit = 50) {
    try {
      const orders = await this.client.futuresAllOrders({
        symbol,
        limit,
      });

      return orders.map(order => ({
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price || 0),
        status: order.status,
        timeInForce: order.timeInForce,
        reduceOnly: order.reduceOnly,
        updateTime: order.updateTime,
        workingType: order.workingType,
      }));
    } catch (error) {
      console.error(`Failed to get recent orders:`, error);
      return [];
    }
  }

  // Get exchange info
  async getExchangeInfo() {
    try {
      const info = await this.client.futuresExchangeInfo();
      return {
        success: true,
        symbols: info.symbols.map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status,
          filters: symbol.filters,
        })),
      };
    } catch (error) {
      console.error('Failed to get exchange info:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get 24hr ticker
  async get24hrTicker(symbol) {
    try {
      const ticker = await this.client.futures24hrTicker({ symbol });
      return {
        success: true,
        symbol: ticker.symbol,
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        weightedAvgPrice: parseFloat(ticker.weightedAvgPrice),
        prevClosePrice: parseFloat(ticker.prevClosePrice),
        lastPrice: parseFloat(ticker.lastPrice),
        lastQty: parseFloat(ticker.lastQty),
        bidPrice: parseFloat(ticker.bidPrice),
        bidQty: parseFloat(ticker.bidQty),
        askPrice: parseFloat(ticker.askPrice),
        askQty: parseFloat(ticker.askQty),
        openPrice: parseFloat(ticker.openPrice),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        openTime: ticker.openTime,
        closeTime: ticker.closeTime,
        count: ticker.count,
      };
    } catch (error) {
      console.error(`Failed to get 24hr ticker for ${symbol}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Set margin type with delay and better error handling
  async setMarginType(symbol, marginType = 'ISOLATED') {
    if (!this.client) {
      throw new Error('Binance client not initialized. Please configure API keys.');
    }

    try {
      // Add delay before API request to prevent rate limiting
      await delay(500);

      const result = await this.client.futuresMarginType({
        symbol,
        marginType,
      });

      return { success: true, result };
    } catch (error) {
      // Check for timestamp synchronization error
      if (error.code === -1021) {
        console.error(`❌ Timestamp synchronization error for ${symbol}:`, error.message);
        console.error('   Please check your system clock and time zone settings.');
        return { success: false, error: 'Timestamp synchronization error', isTimestampError: true };
      }

      // Ignore if already set to the desired margin type
      if (
        error.message?.includes('No need to change margin type') ||
        error.message?.includes('No need')
      ) {
        return { success: true, message: `Margin type already set to ${marginType}` };
      }

      // Handle timeout or server errors gracefully
      if (error.message?.includes('Timeout') || error.message?.includes('backend server')) {
        console.warn(`⚠️ Timeout setting margin type for ${symbol}`);
        return { success: false, error: error.message, isTimeout: true };
      }

      console.error(`❌ Failed to set margin type for ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Set leverage with delay and better error handling
  async setLeverage(symbol, leverage = 20) {
    if (!this.client) {
      throw new Error('Binance client not initialized. Please configure API keys.');
    }

    try {
      // Add delay before API request to prevent rate limiting
      await delay(1000); // 1 second delay

      const result = await this.client.futuresLeverage({
        symbol,
        leverage,
      });

      return { success: true, result };
    } catch (error) {
      // Check for timestamp synchronization error
      if (error.code === -1021) {
        console.error(`❌ Timestamp synchronization error for ${symbol}:`, error.message);
        console.error('   Please check your system clock and time zone settings.');
        return { success: false, error: 'Timestamp synchronization error', isTimestampError: true };
      }

      // Handle timeout or server errors gracefully
      if (error.message?.includes('Timeout') || error.message?.includes('backend server')) {
        console.warn(`⚠️ Timeout setting leverage for ${symbol}`);
        return { success: false, error: error.message, isTimeout: true };
      }

      console.error(`❌ Failed to set leverage for ${symbol}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BinanceService;
