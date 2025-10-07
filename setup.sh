#!/bin/bash

# Trading Bot Electron - Auto Setup Script
# This script helps users set up the trading bot quickly

echo "🚀 Trading Bot Electron - Auto Setup"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   macOS: brew install node"
    echo "   Windows: Download from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    
    cat > .env << EOF
# Trading Bot Electron - Environment Configuration
# Fill in your actual values below

# Binance Testnet API (Recommended for testing)
BINANCE_TEST_API_KEY=your_testnet_api_key_here
BINANCE_TEST_API_SECRET=your_testnet_api_secret_here

# Binance Live API (⚠️ USE WITH CAUTION!)
BINANCE_API_KEY=your_live_api_key_here
BINANCE_API_SECRET=your_live_api_secret_here

# Telegram Bot Token (Get from @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
TELEGRAM_IS_ENABLED=true

# Discord Bot Token (Get from Discord Developer Portal)
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here
DISCORD_IS_ENABLED=false

# Trading Settings
DEFAULT_SYMBOL=BTCUSDT
DEFAULT_TIMEFRAME=1h
MAX_POSITION_SIZE=100
RISK_PERCENTAGE=2

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/trading-bot.log

# Development
NODE_ENV=development
DEBUG_MODE=true
EOF
    
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file with your actual API keys before running the bot"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs
echo "✅ Logs directory created"

# Detect OS and show appropriate run command
echo ""
echo "🎯 Setup completed! Next steps:"
echo ""

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected:"
    echo "   1. Edit .env file with your API keys"
    echo "   2. Run: npm run dev"
    echo "   3. If window doesn't appear, try: npm run dev:ubuntu"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected:"
    echo "   1. Edit .env file with your API keys"
    echo "   2. Run: npm run dev"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Windows detected:"
    echo "   1. Edit .env file with your API keys"
    echo "   2. Run: npm run dev:win"
else
    echo "   1. Edit .env file with your API keys"
    echo "   2. Run: npm run dev"
fi

echo ""
echo "📚 For detailed instructions, see SETUP.md"
echo "🔒 Remember: Never commit your .env file to version control!"
echo ""
echo "Happy trading! 🚀"
