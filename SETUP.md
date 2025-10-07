# Trading Bot Electron - Hướng dẫn Setup

## 🚀 Cài đặt nhanh

### 1. Clone repository
```bash
git clone <your-github-repo-url>
cd trading-bot-electron
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
```bash
# Copy file cấu hình mẫu
cp .env.example .env

# Chỉnh sửa file .env với thông tin của bạn
nano .env
```

### 4. Chạy ứng dụng

#### Trên Ubuntu/Linux:
```bash
npm run dev
```

#### Trên Windows:
```bash
npm run dev:win
```

#### Trên macOS:
```bash
npm run dev:mac
```

## 🔧 Cấu hình chi tiết

### File .env cần thiết:
```env
# Binance API (Testnet)
BINANCE_TEST_API_KEY=your_test_api_key
BINANCE_TEST_API_SECRET=your_test_api_secret

# Binance API (Live - Cẩn thận!)
BINANCE_API_KEY=your_live_api_key
BINANCE_API_SECRET=your_live_api_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_IS_ENABLED=true

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_channel_id
DISCORD_IS_ENABLED=false
```

### Cấu hình Binance Testnet:
1. Truy cập: https://testnet.binance.vision/
2. Đăng ký tài khoản testnet
3. Tạo API Key và Secret
4. Cập nhật vào file .env

## 🐛 Troubleshooting

### Lỗi sandbox trên Linux:
```bash
# Chạy với flag no-sandbox
npm run dev:ubuntu
```

### Lỗi không hiện cửa sổ:
```bash
# Kiểm tra DISPLAY
echo $DISPLAY

# Chạy với DISPLAY explicit
DISPLAY=:0 npm run dev
```

### Lỗi dependencies:
```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

## 📦 Build ứng dụng

### Build cho Linux:
```bash
npm run build:linux
```

### Build cho Windows:
```bash
npm run build:win
```

### Build cho tất cả platforms:
```bash
npm run build:all
```

## 🔒 Bảo mật

⚠️ **QUAN TRỌNG:**
- Không commit file `.env` lên GitHub
- Sử dụng testnet trước khi dùng live trading
- Bảo vệ API keys của bạn
- Chỉ enable live trading khi đã test kỹ

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra file log trong thư mục `logs/`
2. Chạy với `--enable-logging` để debug
3. Tạo issue trên GitHub với thông tin chi tiết
