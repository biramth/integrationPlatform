import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const inNodeModules = (...names) =>
  new RegExp(`[\\/]node_modules[\\/](${names.join('|')})[\\/]`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            // Socle React : ne bouge qu'aux montées de version, donc le CDN
            // Vercel le garde en cache d'un déploiement à l'autre.
            {
              name: 'react-vendor',
              test: inNodeModules('react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'),
              priority: 20,
            },
            // Utilitaires de classes partagés par toute l'UI : sans ce groupe
            // ils se font absorber par le chunk recharts, qui remonte alors
            // dans le chargement initial.
            {
              name: 'ui-utils',
              test: inNodeModules('clsx', 'tailwind-merge', 'class-variance-authority'),
              priority: 15,
            },
            // Recharts + d3 : ~380 kB tirés uniquement par le tableau de bord
            // admin et la page Risques, tous deux chargés à la demande.
            {
              name: 'recharts',
              test: inNodeModules('recharts', 'victory-vendor', 'internmap', 'decimal[.]js-light', 'd3-[a-z-]+'),
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
})
