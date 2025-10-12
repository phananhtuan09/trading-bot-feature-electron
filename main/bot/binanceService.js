const Binance = require('binance-api-node').default;
const ConfigManager = require('../database/configStore');


class BinanceService {
  constructor() {
    const configManager = new ConfigManager();
    const binanceConfig = configManager.getBinanceConfig();

    this.isTestnet = binanceConfig.IS_TESTING;

    const apiKey = this.isTestnet ? binanceConfig.TEST_API_KEY : binanceConfig.API_KEY;
    const apiSecret = this.isTestnet ? binanceConfig.TEST_API_SECRET : binanceConfig.API_SECRET;

    const options = { apiKey, apiSecret };
    if (this.isTestnet) {
      options.httpFutures = 'https://testnet.binancefuture.com';
    }

    if (!apiKey || !apiSecret) {
      console.error('Binance API key and secret are required.');
      // We don't throw an error here, but calls will fail.
      // The UI should prevent starting the bot without keys.
    }

    this.client = Binance(options);
  }

  // Subscribe to user account updates via WebSocket
  subscribeToAccountUpdates(callback) {
    try {
      console.log('Subscribing to Binance user data stream...');
      const clean = this.client.ws.user(callback);
      console.log('Successfully subscribed to user data stream.');
      // We can return the `clean` function to allow unsubscribing later if needed
      return clean;
    } catch (error) {
      console.error('Failed to subscribe to user data stream:', error);
    }
  }

  // Test connection
  async testConnection() {
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
      return {
        success: false,
        message: `Lỗi kết nối Binance: ${error.message}`,
        error: error.message,
      };
    }
  }

  // Get account balance
  async getAccountBalance() {
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
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get all positions
  async getPositions() {
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
      console.error('❌ Lỗi lấy danh sách vị thế:', error);
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

      console.log(`Đã đóng vị thế ${symbol}: ${orderSide} ${quantity}`);
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

      console.log(`Đã đặt lệnh ${symbol}: ${side} ${quantity} ${type}`);
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

}

module.exports = BinanceService;
