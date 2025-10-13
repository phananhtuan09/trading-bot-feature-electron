// Electron Builder Configuration
const packageJson = require('./package.json');

module.exports = {
  appId: 'com.tradingbot.feature.app',
  productName: packageJson.name,
  copyright: `Copyright © 2025 ${packageJson.name}`,

  name: packageJson.name,

  // Skip code signing for faster build
  forceCodeSigning: false,

  // Disable winCodeSign to avoid symbolic link issues
  winCodeSign: false,

  // Cấu hình build
  directories: {
    output: 'dist',
    buildResources: 'build',
  },

  // Files cần include trong build
  files: [
    'main/**/*',
    'renderer/**/*',
    'node_modules/**/*',
    '!node_modules/**/{test,spec}/**',
    '!node_modules/**/*.d.ts',
    '!**/*.{iml,o,hprof}',
    '!**/._*',
    '!**/Thumbs.db',
  ],

  // Cấu hình cho Windows
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
    icon: 'build/icons/trading-crypto-bot.ico',
    publisherName: 'Trading Bot',
    verifyUpdateCodeSignature: false,
    sign: null, // Disable code signing completely
    // Disable symbolic links to avoid permission issues
    requestedExecutionLevel: 'asInvoker',
    // Force sử dụng name từ package.json
    artifactName: '${name}-${version}-${arch}.${ext}',
  },

  // Cấu hình cho Linux
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
      {
        target: 'rpm',
        arch: ['x64'],
      },
    ],
    icon: 'build/icons',
    category: 'Office',
    synopsis: 'Crypto Trading Bot Desktop Application',
  },

  // Cấu hình NSIS installer cho Windows
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/icons/trading-crypto-bot.ico',
    uninstallerIcon: 'build/icons/trading-crypto-bot.ico',
    installerHeaderIcon: 'build/icons/trading-crypto-bot.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: packageJson.name,
    artifactName: '${name}-Setup-${version}-${arch}.${ext}',
  },

  // Cấu hình Portable cho Windows
  portable: {
    artifactName: '${name}-Portable-${version}-${arch}.${ext}',
  },

  // Cấu hình AppImage cho Linux
  appImage: {
    artifactName: '${name}-${version}-${arch}.${ext}',
    category: 'Office',
  },

  // Cấu hình DEB package cho Ubuntu/Debian
  deb: {
    artifactName: '${name}-${version}-${arch}.${ext}',
    category: 'Office',
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils'],
  },

  // Cấu hình RPM package cho Red Hat/Fedora
  rpm: {
    artifactName: '${name}-${version}-${arch}.${ext}',
    category: 'Office',
  },

  // Cấu hình auto-updater
  publish: {
    provider: 'github',
    owner: 'your-username',
    repo: 'trading-bot-electron',
  },
};
