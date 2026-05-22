import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('electron')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src'),
        '@components': resolve('src/components'),
        '@pages': resolve('src/pages'),
        '@store': resolve('src/store'),
        '@hooks': resolve('src/hooks'),
        '@utils': resolve('src/utils'),
        '@types': resolve('src/types'),
        '@services': resolve('src/services'),
        '@layouts': resolve('src/layouts')
      }
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
