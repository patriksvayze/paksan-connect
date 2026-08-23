import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* PAKSAN Backoffice — ayrı derleme.

   Backoffice PAKSAN personelinin bilgisayarında çalışıyor; müşterinin
   telefonuna kurulan APK'nın içine girmemeli. Bu yüzden ayrı bir
   çıktı klasörüne (`dist-backoffice/`) derleniyor — Capacitor yalnızca
   `dist/` klasörünü telefona kopyalıyor.

   Derlemek için:  npm run build:backoffice
   Çıkan klasör şirket içi bir sunucuya veya ağdaki bir klasöre konur. */

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-backoffice',
    emptyOutDir: true,
    rollupOptions: {
      input: 'backoffice.html',
    },
  },
})
