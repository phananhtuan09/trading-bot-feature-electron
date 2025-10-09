const { binanceTestClient: binanceClient } = require('./clients'); // Import binanceClient nếu muốn đặt lệnh trên tk thực
const { STRATEGY_CONFIG } = require('./config');


let symbolCache = {
  lastUpdated: 0,
  symbols: [],
};

async function fetchAllSymbols() {
  try {
    // logger.info('🔄 Đang cập nhật danh sách symbols cho futures...')
    const exchangeInfo = await binanceClient.futuresExchangeInfo();

    const validSymbols = exchangeInfo.symbols
      .filter(
        s =>
          s.status === 'TRADING' && // Chỉ lấy symbol đang giao dịch
          s.contractType === 'PERPETUAL' && // Chỉ lấy hợp đồng perpetual
          s.quoteAsset === 'USDT' // Quote asset là USDT
      )
      .map(s => s.symbol);

    symbolCache = {
      lastUpdated: Date.now(),
      symbols: validSymbols,
    };

    //  logger.info(`✅ Đã cập nhật ${validSymbols.length} symbols cho futures`)
    return validSymbols;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách biểu tượng:', error);
    return [];
  }
}

async function getSymbols() {
  if (Date.now() - symbolCache.lastUpdated > STRATEGY_CONFIG.EXCHANGE_INFO_CACHE_TIME) {
    return await fetchAllSymbols();
  }
  return symbolCache.symbols;
}

module.exports = { fetchAllSymbols, getSymbols };
