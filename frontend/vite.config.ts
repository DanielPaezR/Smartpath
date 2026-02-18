// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 👇 FORZAR nombre del manifest como .json
      manifestFilename: 'manifest.json',
      includeAssets: [
        'icon-72x72.png', 
        'icon-96x96.png', 
        'icon-128x128.png', 
        'icon-144x144.png', 
        'icon-152x152.png', 
        'icon-192x192.png',
        'icon-384x384.png', 
        'icon-512x512.png', 
        'maskable-icon-512x512.png',
        'logo.jpeg',
        'favicon.ico'
      ],
      manifest: {
        name: 'SmartPath Vitamarket',
        short_name: 'SmartPath',
        description: 'Optimización de rutas para asesores comerciales Vitamarket',
        theme_color: '#2E7D32',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/~daniel.paez/smartpath/',
        start_url: '/~daniel.paez/smartpath/#/login',
        id: '/~daniel.paez/smartpath/',
        icons: [
          {
            src: '/~daniel.paez/smartpath/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/~daniel.paez/smartpath/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,json}'],
        globIgnores: ['**/node_modules/**/*'],
        navigateFallback: '/~daniel.paez/smartpath/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/ingenieria\.unac\.edu\.co\/~daniel\.paez\/smartpath\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    }),
    // 👇 PLUGIN PERSONALIZADO PARA GARANTIZAR QUE SEA manifest.json
    {
      name: 'rename-manifest',
      closeBundle: () => {
        const distDir = path.resolve(__dirname, 'dist');
        const oldManifest = path.join(distDir, 'manifest.webmanifest');
        const newManifest = path.join(distDir, 'manifest.json');
        
        if (fs.existsSync(oldManifest)) {
          fs.renameSync(oldManifest, newManifest);
          console.log('✅ manifest.webmanifest → manifest.json');
          
          // Actualizar index.html
          const indexHtml = path.join(distDir, 'index.html');
          if (fs.existsSync(indexHtml)) {
            let content = fs.readFileSync(indexHtml, 'utf8');
            content = content.replace(/manifest\.webmanifest/g, 'manifest.json');
            fs.writeFileSync(indexHtml, content);
            console.log('✅ Referencia actualizada en index.html');
          }
        }
      }
    }
  ],
  
  base: '/~daniel.paez/smartpath/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: false,
    sourcemap: true,
    
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})