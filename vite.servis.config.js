import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* PAKSAN Servis Paneli — üçüncü ayrı derleme.

   Servis paneli servisin kendi bilgisayarında veya telefonunda
   açılıyor. Ne müşterinin APK'sına ne de PAKSAN personelinin
   backoffice'ine girmeli: üçü de ayrı çıktı klasörüne derleniyor.

     vite.config.js            → dist/            müşteri uygulaması (APK)
     vite.backoffice.config.js → dist-backoffice/ PAKSAN personeli
     vite.servis.config.js     → dist-servis/     SERVİS

   İKİ GİRİŞ, TEK UYGULAMA

     servis-panel.html  tarayıcıdan açılan panel
     servis-mobil.html  telefona kurulan sürüm (APK bunu sarıyor)

   İkisi de aynı kodu (`src/servis/`) yüklüyor. Uygulama sürümü panelin
   ayrı bir kopyası değil, aynı panelin telefona sarılmış hâli.
   Ayrı durmalarının sebebi geliştirmede karışmamaları: tarayıcıda iki
   ayrı adres, iki ayrı sekme başlığı.

   Aralarındaki tek fark HTML'de: mobil sürüm yakınlaştırmayı
   kapatıyor ve çentikli ekranlara uyum için `viewport-fit=cover`
   kullanıyor.

   NEDEN MOBİL GİRİŞ `index.html` OLARAK ÇIKIYOR

   Capacitor, `webDir` klasöründe `index.html` arıyor
   (node_modules/@capacitor/cli → doctor.js). `servis-mobil.html` adıyla
   çıksaydı APK boş ekran açardı. Aşağıdaki eklenti derleme sonunda
   dosyanın adını değiştiriyor.

   Derlemek için:  npm run build:servis

   SUNUCU GELENE KADAR: veri tarayıcının kendi hafızasında. Servis
   paneli ayrı bir cihazda çalıştığı için müşterinin telefonunda oluşan
   talebi bugün göremiyor. Ekranlar ve veri düzeni hazır; sunucu
   bağlandığında yalnız veri katmanı değişecek. */

/** Mobil girişi `index.html` olarak yeniden adlandırır. */
function mobilGirisiIndexYap() {
  return {
    name: 'paksan-servis-mobil-index',
    enforce: 'post',
    generateBundle(_ayar, paket) {
      const kaynak = paket['servis-mobil.html']
      if (!kaynak) return
      delete paket['servis-mobil.html']
      kaynak.fileName = 'index.html'
      paket['index.html'] = kaynak
    },
  }
}

export default defineConfig({
  plugins: [react(), mobilGirisiIndexYap()],
  base: './',
  build: {
    outDir: 'dist-servis',
    emptyOutDir: true,
    rollupOptions: {
      input: ['servis-panel.html', 'servis-mobil.html'],
    },
  },
})
