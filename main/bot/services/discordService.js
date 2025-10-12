const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

class DiscordService {
  constructor() {
    this.client = null;
    this.channelId = null;
    this.isEnabled = false;
    this.isInitialized = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async initialize(config) {
    if (!config || !config.IS_ENABLED) {
      console.log('Discord service is disabled');
      return false;
    }

    if (!config.BOT_TOKEN || !config.CHANNEL_ID) {
      console.warn('Discord configuration incomplete');
      return false;
    }

    this.isEnabled = true;
    this.channelId = config.CHANNEL_ID;

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
        ],
      });

      this.client.on('ready', () => {
        console.log(`✅ Discord bot connected as ${this.client.user.tag}`);
        this.isInitialized = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', error => {
        console.error('❌ Discord client error:', error.message);
      });

      this.client.on('disconnect', () => {
        console.warn('⚠️ Discord bot disconnected');
        this.isInitialized = false;
      });

      await this.client.login(config.BOT_TOKEN);
      return true;
    } catch (error) {
      console.error('Failed to initialize Discord service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async sendMessage(content, options = {}) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      await channel.send({ content, ...options });
      return { success: true };
    } catch (error) {
      console.error('Discord send message error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendSignalEmbed(signal) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle('🎯 TÍN HIỆU TRADING MỚI')
        .setColor(signal.decision === 'Long' ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: '📊 Symbol', value: signal.symbol, inline: true },
          { name: '📈 Direction', value: signal.decision === 'Long' ? '🟢 LONG' : '🔴 SHORT', inline: true },
          { name: '💰 Price', value: `$${signal.price.toFixed(4)}`, inline: true },
          { name: '🎯 Take Profit', value: `$${signal.tpPrice?.toFixed(4) || 'N/A'} (${signal.TP_ROI ? '+' + signal.TP_ROI.toFixed(2) : 'N/A'}%)`, inline: true },
          { name: '🛡️ Stop Loss', value: `$${signal.slPrice?.toFixed(4) || 'N/A'} (${signal.SL_ROI ? signal.SL_ROI.toFixed(2) : 'N/A'}%)`, inline: true },
          { name: '⭐ Confidence', value: `${signal.confidenceScore || 'N/A'}%`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Trading Bot Signal' });

      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send({ embeds: [embed] });
      return { success: true };
    } catch (error) {
      console.error('Discord send signal embed error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendOrderEmbed(order) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle('✅ LỆNH ĐÃ ĐẶT THÀNH CÔNG')
        .setColor(0x00ff00)
        .addFields(
          { name: '📊 Symbol', value: order.symbol, inline: true },
          { name: '📈 Side', value: order.side, inline: true },
          { name: '💰 Entry Price', value: `$${order.price.toFixed(4)}`, inline: true },
          { name: '📦 Quantity', value: `${order.quantity}`, inline: true },
          { name: '⚡ Leverage', value: `${order.leverage || 20}x`, inline: true },
          { name: '🎯 Take Profit', value: `$${order.tpPrice?.toFixed(4) || 'N/A'}`, inline: true },
          { name: '🛡️ Stop Loss', value: `$${order.slPrice?.toFixed(4) || 'N/A'}`, inline: true },
          { name: '✓ Status', value: 'Active', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Trading Bot Order' });

      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send({ embeds: [embed] });
      return { success: true };
    } catch (error) {
      console.error('Discord send order embed error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPositionClosedEmbed(position) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const pnl = position.pnl || 0;
      const isProfit = pnl > 0;

      const embed = new EmbedBuilder()
        .setTitle(isProfit ? '✅ VỊ THẾ ĐÓNG - LỜI' : '❌ VỊ THẾ ĐÓNG - LỖ')
        .setColor(isProfit ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: '📊 Symbol', value: position.symbol, inline: true },
          { name: '📈 Side', value: position.side, inline: true },
          { name: '💰 P&L', value: `${isProfit ? '+' : ''}$${pnl.toFixed(2)}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Trading Bot Position Closed' });

      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send({ embeds: [embed] });
      return { success: true };
    } catch (error) {
      console.error('Discord send position closed embed error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendErrorAlert(error) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle('🚨 LỖI HỆ THỐNG')
        .setColor(0xff0000)
        .setDescription(error.message || 'Unknown error')
        .setTimestamp()
        .setFooter({ text: 'Trading Bot Error Alert' });

      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send({ embeds: [embed] });
      return { success: true };
    } catch (err) {
      console.error('Discord send error alert error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendScanSummary(summary) {
    if (!this.isEnabled || !this.isInitialized) {
      return { success: false, error: 'Discord service not available' };
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle('📊 BÁO CÁO QUÉT THỊ TRƯỜNG')
        .setColor(0x0099ff)
        .setDescription(summary)
        .setTimestamp()
        .setFooter({ text: 'Trading Bot Scan Summary' });

      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send({ embeds: [embed] });
      return { success: true };
    } catch (error) {
      console.error('Discord send scan summary error:', error.message);
      return { success: false, error: error.message };
    }
  }

  isConnected() {
    return this.isEnabled && this.isInitialized && this.client?.isReady();
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isInitialized = false;
      console.log('Discord service disconnected');
    }
  }

  async testConnection() {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      await this.sendMessage('🔔 Test notification from Trading Bot');
      return { success: true, message: 'Discord connection is working' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = DiscordService;

