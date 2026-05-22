/**
 * Electron Builder configuration for DevDoz POS
 * Produces Windows NSIS installer + macOS DMG
 */
module.exports = {
  appId: 'com.devdoz.pos',
  productName: 'DevDoz POS',
  copyright: 'Copyright © 2024 DevDoz',
  directories: {
    output: 'dist',
    buildResources: 'assets'
  },
  files: [
    'out/**/*',
    'prisma/schema.prisma',
    'node_modules/.prisma/**/*',
    'node_modules/@prisma/client/**/*'
  ],
  extraResources: [
    {
      from: 'node_modules/.prisma/client',
      to: 'prisma/client',
      filter: ['**/*']
    }
  ],
  asarUnpack: [
    'node_modules/.prisma/**/*',
    'node_modules/@prisma/client/**/*'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'assets/icons/icon.ico',
    artifactName: 'DevDozPOSSetup.exe'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'DevDoz POS',
    installerHeaderIcon: 'assets/icons/icon.ico',
    installerIcon: 'assets/icons/icon.ico',
    uninstallerIcon: 'assets/icons/icon.ico',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'assets/icons/icon.icns',
    category: 'public.app-category.business',
    darkModeSupport: false
  },
  dmg: {
    title: 'DevDoz POS',
    icon: 'assets/icons/icon.icns'
  },
  publish: {
    provider: 'github',
    releaseType: 'release'
  }
}
