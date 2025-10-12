const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = null;
    this.chatId = null;
    this.isEnabled = false;
    this.isInitialized = false;
    this.baseUrl = null;
    this.maxRetries = 3;
  }

  async initialize(config) {

    if (!config || !config.IS_ENABLED) {
      console.log('Telegram service is disabled');
      return false;
    }

    if (!config.BOT_TOKEN || !config.CHAT_ID) {
      console.warn('Telegram configuration incomplete');
      return false;
    }

    this.isEnabled = true;
    this.botToken = config.BOT_TOKEN;
    this.chatId = config.CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    try {
      // Test connection
      const response = await axios.get(`${this.baseUrl}/getMe`);
      if (response.data.ok) {
        console.log(`✅ Telegram bot connected: @${response.data.result.username}`);
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize Telegram service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async sendMessage(text, options = {}) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    try {
      const payload = {
        chat_id: this.chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview !== false,
        ...options,
      };

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

      if (response.data.ok) {
        return { success: true, messageId: response.data.result.message_id };
      }

      return { success: false, error: 'Failed to send message' };
    } catch (error) {
      console.error('Telegram send message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendSignalMessage(signal) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    const direction = signal.decision === 'Long' ? '🟢 LONG' : '🔴 SHORT';
    const message = `
🎯 <b>TÍN HIỆU TRADING MỚI</b>

📊 <b>Symbol:</b> ${signal.symbol}
📈 <b>Direction:</b> ${direction}
💰 <b>Price:</b> $${signal.price.toFixed(4)}
🎯 <b>Take Profit:</b> $${signal.tpPrice?.toFixed(4) || 'N/A'} (${signal.TP_ROI ? '+' + signal.TP_ROI.toFixed(2) : 'N/A'}%)
🛡️ <b>Stop Loss:</b> $${signal.slPrice?.toFixed(4) || 'N/A'} (${signal.SL_ROI ? signal.SL_ROI.toFixed(2) : 'N/A'}%)
⭐ <b>Confidence:</b> ${signal.confidenceScore || 'N/A'}%

⏰ <i>${new Date().toLocaleString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  async sendOrderMessage(order) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    const message = `
✅ <b>LỆNH ĐÃ ĐẶT THÀNH CÔNG</b>

📊 <b>Symbol:</b> ${order.symbol}
📈 <b>Side:</b> ${order.side}
💰 <b>Entry Price:</b> $${order.price.toFixed(4)}
📦 <b>Quantity:</b> ${order.quantity}
⚡ <b>Leverage:</b> ${order.leverage || 20}x

🎯 <b>Take Profit:</b> $${order.tpPrice?.toFixed(4) || 'N/A'}
🛡️ <b>Stop Loss:</b> $${order.slPrice?.toFixed(4) || 'N/A'}

✓ <b>Status:</b> Active

⏰ <i>${new Date().toLocaleString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  async sendPositionClosedMessage(position) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    const pnl = position.pnl || 0;
    const isProfit = pnl > 0;
    const emoji = isProfit ? '✅' : '❌';
    const title = isProfit ? 'VỊ THẾ ĐÓNG - LỜI' : 'VỊ THẾ ĐÓNG - LỖ';

    const message = `
${emoji} <b>${title}</b>

📊 <b>Symbol:</b> ${position.symbol}
📈 <b>Side:</b> ${position.side}
💰 <b>P&L:</b> ${isProfit ? '+' : ''}$${pnl.toFixed(2)}

⏰ <i>${new Date().toLocaleString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  async sendErrorAlert(error) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    const message = `
🚨 <b>LỖI HỆ THỐNG</b>

❌ ${error.message || 'Unknown error'}

⏰ <i>${new Date().toLocaleString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  async sendScanSummary(summary) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Telegram service not available' };
    }

    const message = `
📊 <b>BÁO CÁO QUÉT THỊ TRƯỜNG</b>

${summary}

⏰ <i>${new Date().toLocaleString('vi-VN')}</i>
    `.trim();

    return await this.sendMessage(message);
  }

  isConnected() {
    return this.isEnabled && this.isInitialized;
  }

  async disconnect() {
    this.isInitialized = false;
    console.log('Telegram service disconnected');
  }

  async testConnection() {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const result = await this.sendMessage('🔔 Test notification from Trading Bot');
      return { 
        success: result.success, 
        message: result.success ? 'Telegram connection is working' : result.error 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TelegramService;

