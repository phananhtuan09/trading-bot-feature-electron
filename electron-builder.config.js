const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

module.exports = {
  appId: 'com.tradingbot.app',
  productName: 'Trading Bot',
  copyright: 'Copyright © 2024 Trading Bot',

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
    icon: 'build/icons/icon.ico',
    publisherName: 'Trading Bot',
    verifyUpdateCodeSignature: false,
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
    icon: 'build/icons/icon.png',
    category: 'Office',
    synopsis: 'Crypto Trading Bot Desktop Application',
  },

  // Cấu hình NSIS installer cho Windows
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/icons/icon.ico',
    uninstallerIcon: 'build/icons/icon.ico',
    installerHeaderIcon: 'build/icons/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Trading Bot',
    include: 'build/installer.nsh',
  },

  // Cấu hình AppImage cho Linux
  appImage: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    category: 'Office',
  },

  // Cấu hình DEB package cho Ubuntu/Debian
  deb: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    category: 'Office',
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils'],
  },

  // Cấu hình RPM package cho Red Hat/Fedora
  rpm: {
    artifactName: '${productName}-${version}-${arch}.${ext}',
    category: 'Office',
  },

  // Cấu hình auto-updater
  publish: {
    provider: 'github',
    owner: 'your-username',
    repo: 'trading-bot-electron',
  },
};
