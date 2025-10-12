const { binanceTestClient: binanceClient } = require('./clients');
const TradingStrategies = require('./tradingStrategies');
const { RSI, BollingerBands, MACD, ADX, EMA } = require('technicalindicators');
const { STRATEGY_CONFIG } = require('./config');


// Lấy dữ liệu lịch sử giá (nến) từ Binance Futures.
async function getHistoricalData(symbol, interval = STRATEGY_CONFIG.INTERVAL, limit = 200) {
  const BATCH_SIZE = 100;
  let allCandles = []; // Sẽ lưu trữ nến từ cũ nhất đến mới nhất

  try {
    let requestsNeeded = Math.ceil(limit / BATCH_SIZE);
    let currentBatchEndTime;

    for (let i = 0; i < requestsNeeded; i++) {
      const numCandlesToFetchThisIteration = Math.min(BATCH_SIZE, limit - allCandles.length);

      if (numCandlesToFetchThisIteration <= 0) {
        break; // Đã lấy đủ hoặc vượt limit
      }

      const params = {
        symbol: symbol,
        interval,
        limit: numCandlesToFetchThisIteration,
      };

      if (currentBatchEndTime) {
        params.endTime = currentBatchEndTime;
      }
      const newCandlesBatch = await binanceClient.futuresCandles(params);

      if (!newCandlesBatch || newCandlesBatch.length === 0) {
        break; // Dừng nếu không có thêm dữ liệu
      }

      if (
        newCandlesBatch[0] &&
        typeof newCandlesBatch[0].openTime === 'number' &&
        newCandlesBatch[0].openTime > 0
      ) {
        currentBatchEndTime = newCandlesBatch[0].openTime;
      } else {
        allCandles = [...newCandlesBatch, ...allCandles];
        break;
      }

      allCandles = [...newCandlesBatch, ...allCandles];

      if (newCandlesBatch.length < numCandlesToFetchThisIteration) {
        break;
      }

      if (allCandles.length >= limit) {
        break; // Đã lấy đủ số nến yêu cầu
      }

      if (i < requestsNeeded - 1 && allCandles.length < limit) {
        const delay = 500 + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const finalCandles =
      allCandles.length > limit ? allCandles.slice(allCandles.length - limit) : allCandles;

    if (finalCandles.length === 0 && limit > 0) {
      //  logger.warn(`[${symbol}-${interval}] Không có nến nào được lấy cho yêu cầu ${limit} nến.`)
      return null;
    }
    if (finalCandles.length < limit && limit > 0 && requestsNeeded > 0 && allCandles.length > 0) {
      //   logger.warn(`[${symbol}-${interval}] Chỉ lấy được ${finalCandles.length} trong số ${limit} nến yêu cầu.`)
    }

    return {
      symbol,
      closes: finalCandles.map(c => parseFloat(c.close)),
      highs: finalCandles.map(c => parseFloat(c.high)),
      lows: finalCandles.map(c => parseFloat(c.low)),
      volumes: finalCandles.map(c => parseFloat(c.volume)),
    };
  } catch (error) {
    // logger.error(`[${symbol}-${interval}] Lỗi lấy dữ liệu lịch sử: ${error.message} (Code: ${error.code})`)
    return null;
  }
}

// Tính chỉ số Momentum dựa trên giá đóng cửa.
function calculateMomentum(closes, period = 10) {
  return closes.map((close, index) => {
    if (index < period) return null;
    return close - closes[index - period];
  });
}

// Xử lý các tín hiệu giao dịch và đưa ra quyết định cuối cùng.
function processSignals(signals) {
  const signalGroups = {
    BUY: { strategies: [], count: 0 },
    SELL: { strategies: [], count: 0 },
  };
  for (const [strategy, signal] of Object.entries(signals)) {
    if (signal === 'BUY') {
      signalGroups.BUY.strategies.push(strategy);
      signalGroups.BUY.count++;
    } else if (signal === 'SELL') {
      signalGroups.SELL.strategies.push(strategy);
      signalGroups.SELL.count++;
    }
  }
  const futuresDetails = {};
  for (const [action, group] of Object.entries(signalGroups)) {
    if (group.count > 0) {
      const key = group.strategies.join('_') || action;
      futuresDetails[key] = {
        direction: action === 'BUY' ? 'Long' : 'Short',
        strength: `${group.count}/${Object.keys(signals).length}`,
        contributors: group.strategies,
      };
    }
  }

  // Quyết định cuối cùng
  let decision = 'Wait'; // Nếu tín hiệu buy và sell bằn nhau
  let strengthCount = 0;
  if (signalGroups.BUY.count > signalGroups.SELL.count) {
    strengthCount = signalGroups.BUY.count;
    decision = 'Long';
  } else if (signalGroups.SELL.count > signalGroups.BUY.count) {
    strengthCount = signalGroups.SELL.count;
    decision = 'Short';
  }

  if (decision === 'Wait') {
    logger.info(
      `No clear decision for ${signals.symbol}. BUY: ${signalGroups.BUY.count}, SELL: ${signalGroups.SELL.count}`
    );
    return null;
  }

  return { decision, futuresDetails, strengthCount };
}

// Lọc tín hiệu giao dịch dựa trên các điều kiện bổ sung (volume, EMA, ATR, v.v.).
function filterSignals(strategies, data, indicators, multiTimeframe) {
  const volumeMA =
    data.volumes.length >= 20 ? data.volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : 0;
  const currentATR = indicators.atr;
  const dailyVolume = data.volumes.slice(-24).reduce((a, b) => a + b, 0);
  if (dailyVolume < STRATEGY_CONFIG.FILTER.MIN_TRADE_VOLUME) {
    //   logger.info(`Discarded signal for ${data.symbol} due to low daily volume: ${dailyVolume}`)
    return null;
  }

  const ema200 = EMA.calculate({
    period: STRATEGY_CONFIG.FILTER.TREND_MA_PERIOD,
    values: data.closes,
  });
  const currentEma200 = ema200[ema200.length - 1];
  const isPriceAboveEMA200 = data.closes.at(-1) > currentEma200;
  const isPriceBelowEMA200 = data.closes.at(-1) < currentEma200;

  // Chỉ cho phép tín hiệu MUA khi giá trên EMA200 và tín hiệu BÁN khi giá dưới EMA200
  const validSignals = Object.entries(strategies).reduce((acc, [strategy, signal]) => {
    if (signal === 'BUY' && isPriceAboveEMA200) {
      acc[strategy] = signal;
    } else if (signal === 'SELL' && isPriceBelowEMA200) {
      acc[strategy] = signal;
    } else if (signal === 'BUY' && isPriceBelowEMA200) {
      //    logger.info(`Discarded BUY signal for ${data.symbol} due to price below EMA200`)
    } else if (signal === 'SELL' && isPriceAboveEMA200) {
      //     logger.info(`Discarded SELL signal for ${data.symbol} due to price above EMA200`)
    }
    return acc;
  }, {});

  let confidenceScore = Object.entries(validSignals).reduce((score, [strategy, signal]) => {
    return (
      score + (signal ? STRATEGY_CONFIG.FILTER.STRATEGY_WEIGHTS[strategy.toUpperCase()] || 1 : 0)
    );
  }, 0);

  const multiTimeframeConfirm = Object.values(multiTimeframe).filter(
    tf => tf.ema && data.closes.at(-1) > tf.ema.at(-1)
  ).length;
  if (multiTimeframeConfirm >= 0) {
    confidenceScore += multiTimeframeConfirm; // Chỉ cộng điểm khi ít nhất 2 khung thời gian xác nhận
  }

  if (confidenceScore < STRATEGY_CONFIG.FILTER.MIN_CONFIDENCE_SCORE) {
    //  logger.info(`Discarded signal for ${data.symbol} due to low confidence score: ${confidenceScore}`)
    return null;
  }

  if (currentATR > data.closes.at(-1) * 0.05) {
    //  logger.info(`Discarded signal for ${data.symbol} due to high ATR: ${currentATR}`)
    return null;
  }

  // Nới lỏng kết hợp RSI và MACD: chỉ yêu cầu MACD không ngược chiều
  if (validSignals.RSI) {
    if (strategies.MACD && strategies.MACD !== validSignals.RSI) {
      // logger.info(`Discarded signal for ${data.symbol} due to MACD not confirming RSI: ${strategies.MACD}`)
      delete validSignals.RSI;
    }
  }

  if (
    validSignals.BollingerBands &&
    volumeMA < STRATEGY_CONFIG.BOLLINGER_BAND.VOLUME_MA_THRESHOLD
  ) {
    //  logger.info(`Discarded signal for ${data.symbol} due to low volume MA: ${volumeMA}`)
    delete validSignals.BollingerBands;
  }

  return Object.keys(validSignals).length > 0 ? validSignals : null;
}

// Format tín hiệu thay null -> ""
function formatSignals(signals) {
  return Object.fromEntries(Object.entries(signals).map(([k, v]) => [k, v || '']));
}

// Hàm tính TP và SL mới dựa trên ATR
function calculateTPAndSL(decision, currentPrice, indicators) {
  const { atr, volatility } = indicators;
  // Tính baseTP và baseSL
  const tpMultiplier = 3; // Ví dụ: TP gấp 3 lần ATR
  const slMultiplier = 1.5; // Ví dụ: SL gấp 1.5 lần ATR

  const baseTP = decision === 'Long' ? currentPrice + tpMultiplier * atr : currentPrice - tpMultiplier * atr;
  const baseSL = decision === 'Long' ? currentPrice - slMultiplier * atr : currentPrice + slMultiplier * atr;

  // Tính ROI ban đầu
  const TP_ROI = Math.abs(((baseTP - currentPrice) / currentPrice) * 100);
  const SL_ROI = Math.abs(((baseSL - currentPrice) / currentPrice) * 100);

  // Có thể thêm logic điều chỉnh ROI ở đây nếu cần, ví dụ:
  // if (TP_ROI < 5) TP_ROI = 5;

  // Điều chỉnh theo độ biến động
  const volatilityAdjustment = 1 + volatility / 100;
  return {
    TP: baseTP,
    SL: baseSL,
    TP_ROI: parseFloat(TP_ROI.toFixed(2)),
    SL_ROI: -parseFloat(SL_ROI.toFixed(2)), // SL_ROI luôn là số âm
  };
}

async function analyzeTimeframe(symbol, interval) {
  const data = await getHistoricalData(symbol, interval);
  return {
    ema: EMA.calculate({
      period: STRATEGY_CONFIG.FILTER.MULTI_TIMEFRAME_EMA.LONG,
      values: data.closes,
    }),
    atr: calculateATR(data.highs, data.lows, data.closes),
  };
}

function calculateATR(highs, lows, closes, period = STRATEGY_CONFIG.ATR.PERIOD) {
  const tr = [];
  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highPrevClose = Math.abs(highs[i] - closes[i - 1]);
    const lowPrevClose = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }
  // Sử dụng phương pháp Wilder
  let atr = tr[0];
  for (let i = 1; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
  }
  return atr;
}

async function analyzeMarket(symbol) {
  try {
    const data = await getHistoricalData(symbol);
    if (!data || data.closes.length < 200) return null;

    const atrValues = calculateATR(data.highs, data.lows, data.closes);
    const currentATR = atrValues || 0;
    const currentPrice = data.closes.at(-1);
    const volatility = currentATR ? (currentATR / currentPrice) * 100 : 0;

    const indicators = {
      bb: BollingerBands.calculate({
        period: STRATEGY_CONFIG.BOLLINGER_BAND.PERIOD,
        values: data.closes,
        stdDev: STRATEGY_CONFIG.BOLLINGER_BAND.STD_DEV,
      }),
      rsi: RSI.calculate({
        values: data.closes,
        period: STRATEGY_CONFIG.RSI.PERIOD,
      }),
      macd: MACD.calculate({
        values: data.closes,
        fastPeriod: STRATEGY_CONFIG.MACD.FAST_PERIOD,
        slowPeriod: STRATEGY_CONFIG.MACD.SLOW_PERIOD,
        signalPeriod: STRATEGY_CONFIG.MACD.SIGNAL_PERIOD,
      }),
      adx: ADX.calculate({
        high: data.highs,
        low: data.lows,
        close: data.closes,
        period: STRATEGY_CONFIG.ADX.PERIOD,
      }),
      atr: currentATR,
      volatility: volatility,
    };

    const emaShort = EMA.calculate({
      period: STRATEGY_CONFIG.EMA_PERIODS.SHORT,
      values: data.closes,
    });
    const emaLong = EMA.calculate({
      period: STRATEGY_CONFIG.EMA_PERIODS.LONG,
      values: data.closes,
    });

    // Không cần phân tích đa khung thời gian nữa - đơn giản hóa

    // Sử dụng chiến lược mới - phân tích trực tiếp
    const result = TradingStrategies.analyzeMarket(data, {
      adx: indicators.adx,
      ema20: emaShort,
      ema50: emaLong,
      bb: indicators.bb,
      rsi: indicators.rsi,
      macd: indicators.macd,
      volumes: data.volumes,
      atr: indicators.atr,
    });

    if (!result) {
      return null;
    }

    // Lọc thêm: Volume
    const dailyVolume = data.volumes.slice(-24).reduce((a, b) => a + b, 0);
    if (dailyVolume < STRATEGY_CONFIG.FILTER.MIN_TRADE_VOLUME) {
      return null;
    }

    // Lọc thêm: Strength tối thiểu
    if (result.strength < STRATEGY_CONFIG.FILTER.MIN_CONFIDENCE_SCORE) {
      return null;
    }

    // Tính TP/SL
    const { TP_ROI, SL_ROI } = calculateTPAndSL(
      result.signal === 'BUY' ? 'Long' : 'Short',
      currentPrice,
      indicators
    );

    if (Number(TP_ROI) < 5) {
      //  logger.info(`Discarded signal for ${symbol} due to TP_ROI < 5%: ${TP_ROI}`)
      return null; // Loại bỏ tín hiệu có TP < 5%
    }

    return {
      symbol,
      decision: result.signal === 'BUY' ? 'Long' : 'Short',
      price: currentPrice,
      TP_ROI: Number(TP_ROI),
      SL_ROI: Number(SL_ROI),
      strength: result.strength,
      confidenceScore: result.strength, // Add confidence score for UI and notifications
      reason: result.reason,
      marketType: result.marketType,
    };
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu nến cho ${symbol}:`, error);
    return null;
  }
}

module.exports = {
  getHistoricalData,
  analyzeMarket,
  processSignals,
  filterSignals,
  calculateTPAndSL,
  calculateATR,
  calculateMomentum,
  analyzeTimeframe,
};
