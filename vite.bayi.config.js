import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* PAKSAN Bayi Paneli — üçüncü ayrı derleme.

   Bayi paneli bayinin kendi bilgisayarında veya telefonunda açılıyor.
   Ne müşterinin APK'sına ne de PAKSAN personelinin backoffice'ine
   girmeli: üçü de ayrı çıktı klasörüne derleniyor.

     vite.config.js            → dist/            müşteri uygulaması (APK)
     vite.backoffice.config.js → dist-backoffice/ PAKSAN personeli
     vite.bayi.config.js       → dist-bayi/       BAYİ

   Derlemek için:  npm run build:bayi

   Bayi APK'sı da bu çıktıdan üretiliyor (bkz. tools/cap-hedef.mjs).

   ÖNEMLİ — SUNUCU GELENE KADAR: veri tarayıcının kendi hafızasında
   duruyor. Bayi paneli ayrı bir cihazda çalıştığı için müşterinin
   telefonunda oluşan talebi bugün göremiyor. Ekranlar ve veri düzeni
   hazır; sunucu bağlandığında yalnız veri katmanı değişecek. */

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-bayi',
    emptyOutDir: true,
    rollupOptions: {
      input: 'bayi.html',
    },
  },
})
