import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* PAKSAN Servis — üçüncü ayrı derleme.

   Servis uygulaması servis elemanının telefonunda açılıyor. Ne
   müşterinin APK'sına ne de PAKSAN personelinin backoffice'ine
   girmeli: üçü de ayrı çıktı klasörüne derleniyor.

     vite.config.js            → dist/            müşteri uygulaması (APK)
     vite.backoffice.config.js → dist-backoffice/ PAKSAN personeli
     vite.servis.config.js     → dist-servis/     SERVİS (APK)

   TEK GİRİŞ

   Bir zamanlar iki giriş vardı: tarayıcıdan açılan bir panel ve
   telefona kurulan sürüm. Panel kaldırıldı. Servis elemanı ekranı
   tarlada, işin sonunda, çoğu zaman ayakta açıyor; masaüstü panel
   onun çalışma biçiminde karşılığı olmayan ikinci bir yüzeydi ve
   iki yüzeyi eşit tutmak boşa bakım yüküydü.

   NEDEN `index.html` OLARAK ÇIKIYOR

   Capacitor, `webDir` klasöründe `index.html` arıyor
   (node_modules/@capacitor/cli → doctor.js). `servis.html` adıyla
   çıksaydı APK boş ekran açardı. Aşağıdaki eklenti derleme sonunda
   dosyanın adını değiştiriyor.

   Derlemek için:  npm run build:servis

   SUNUCU GELENE KADAR: veri tarayıcının kendi hafızasında. Servis
   uygulaması ayrı bir cihazda çalıştığı için müşterinin telefonunda
   oluşan talebi bugün göremiyor. Ekranlar ve veri düzeni hazır;
   sunucu bağlandığında yalnız veri katmanı değişecek. */

/** Girişi `index.html` olarak yeniden adlandırır. */
function girisiIndexYap() {
  return {
    name: 'paksan-servis-index',
    enforce: 'post',
    generateBundle(_ayar, paket) {
      const kaynak = paket['servis.html']
      if (!kaynak) return
      delete paket['servis.html']
      kaynak.fileName = 'index.html'
      paket['index.html'] = kaynak
    },
  }
}

export default defineConfig({
  plugins: [react(), girisiIndexYap()],
  base: './',
  build: {
    outDir: 'dist-servis',
    emptyOutDir: true,
    rollupOptions: {
      input: ['servis.html'],
    },
  },
})
