# Trading Bot Electron App

Desktop application for crypto trading bot built with Electron.

## 🚀 Features

- **Cross-platform**: Windows & Ubuntu support
- **Real-time Dashboard**: Live trading data and bot status
- **Professional UI**: Modern interface based on mockup
- **Auto-updates**: GitHub releases integration
- **Configuration Management**: Easy settings management
- **Logging**: Real-time logs display
- **Portable**: No installation required (portable versions)

## 📦 Quick Start

### 🚀 Auto Setup (Recommended)
```bash
# Clone the repository
git clone <your-github-repo-url>
cd trading-bot-electron

# Run auto setup script
npm run setup

# Edit .env file with your API keys
nano .env

# Run the application
npm run dev
```

### 🔧 Manual Setup
```bash
# Clone the repository
git clone <your-github-repo-url>
cd trading-bot-electron

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Run the application
npm run dev
```

### Production Build
```bash
# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Build for all platforms
npm run build:all
```

## 🏗️ Project Structure

```
trading-bot-electron/
├── main/                    # Main process (Backend)
│   ├── main.js             # Electron entry point
│   ├── bot/                # Bot core
│   ├── services/           # External services
│   ├── database/           # Local storage
│   └── ipc/                # IPC handlers
├── renderer/                # Renderer process (Frontend)
│   ├── index.html          # Main UI
│   ├── styles/             # CSS files
│   ├── js/                 # JavaScript files
│   └── assets/             # Images, icons
├── build/                  # Build configuration
└── dist/                   # Built application
```

## 🔧 Configuration

The app uses electron-store for configuration management:

- **Strategy Settings**: Trading parameters
- **API Keys**: Binance API configuration
- **Order Settings**: Trading limits and parameters
- **Integration**: Discord/Telegram settings

## 📱 Usage

1. **Download** installer from GitHub Releases
2. **Install** app (Windows) or run AppImage (Linux)
3. **Configure** API keys and settings
4. **Start** trading bot with beautiful UI
5. **Monitor** real-time data and logs

## 🔄 Auto Updates

The app automatically checks for updates from GitHub Releases:

- **Stable**: Production releases
- **Beta**: Pre-release testing
- **Alpha**: Development builds

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
git clone <repository>
cd trading-bot-electron
npm install
npm run dev
```

### Build
```bash
npm run build:all
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check documentation
- Contact development team
