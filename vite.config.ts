import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Necesario para GitHub Pages en /PabloGGuizar/temporizador-entrenamiento
  base: '/temporizador-entrenamiento/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webp}'],
      },
      manifest: {
        name: 'Temporizador de Entrenamiento',
        short_name: 'Timer',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        description: 'PWA para entrenamientos con calentamiento, intervalos y enfriamiento',
        icons: [
          // Nota: añade PNG reales 192/512 para una experiencia de instalación ideal
        ],
      },
    }),
  ],
})
