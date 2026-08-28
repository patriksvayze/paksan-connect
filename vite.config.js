import { exec } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Bu ayar YALNIZCA müşterinin uygulamasını derliyor (index.html).

   PAKSAN Backoffice ayrı derleniyor (vite.backoffice.config.js →
   dist-backoffice/). Ayrı tutulmasının sebebi: backoffice’in kodu telefona kurulan
   APK'nın içine girmesin. Capacitor `dist` klasörünün tamamını
   kopyalıyor, o yüzden backoffice oraya hiç çıkmamalı.

   Geliştirirken ikisi de aynı sunucudan açılıyor:
     http://localhost:5174/            → uygulama
     http://localhost:5174/backoffice.html  → backoffice                        */

/* --------------------------------------------------------------------------
   `npm run dev` deyince iki sekmeyi birden açar.

   İkisi ayrı adres olduğu için her seferinde elle yazmak gerekiyordu.
   Sunucu ayağa kalkınca tarayıcıda ikisi birden açılıyor.

   NE ZAMAN AÇILIYOR: `dev.bat` içinde PAKSAN_SEKME=ac tanımlı, yani
   dosyaya çift tıkladığınızda sekmeler açılıyor. Terminalden düz
   `npm run dev` yazdığınızda da açılıyor (terminal algılanıyor).

   NE ZAMAN AÇILMIYOR: sunucuyu bir araç arka planda başlattığında —
   Claude Code'un önizleme paneli gibi. Yoksa her yeniden başlatmada
   masaüstündeki tarayıcınıza sekmeler yağardı.
   -------------------------------------------------------------------------- */

function tarayicidaAc(adres) {
  const komut =
    process.platform === 'win32'
      ? `start "" "${adres}"`
      : process.platform === 'darwin'
        ? `open "${adres}"`
        : `xdg-open "${adres}"`
  exec(komut, () => {
    /* Tarayıcı açılmazsa sorun değil: adresler konsolda zaten yazıyor */
  })
}

function ikiSekmeAc() {
  return {
    name: 'paksan-iki-sekme',
    apply: 'serve',
    configureServer(server) {
      const istendi =
        process.env.PAKSAN_SEKME === 'ac' || Boolean(process.stdout.isTTY)
      if (!istendi) return

      server.httpServer?.once('listening', () => {
        const port = server.httpServer.address()?.port || 5174
        const kok = `http://localhost:${port}`
        /* Vite'ın kendi çıktısı ekrana yazılsın, sonra açılsın */
        setTimeout(() => {
          tarayicidaAc(`${kok}/`)
          tarayicidaAc(`${kok}/backoffice.html`)
        }, 400)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), ikiSekmeAc()],
  // Göreli yollar: Capacitor/Android WebView'da da aynı şekilde çalışır
  base: './',
  build: {
    /* Fotoğraflar ayrı dosya olarak çıkar (base64 gömme yok):
       JS paketi küçük kalır, görseller tembel yüklenir. */
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    /* PORT ortam değişkeni verilmişse o kullanılıyor.

       Verilmemişse: terminalden ELLE çalıştırıldığında 5174 —
       dev.bat ve NOTLAR.md bu adresi yazıyor, orası değişmesin.
       Bir ARAÇ arka planda başlattığında (Claude Code'un önizleme
       paneli gibi) port seçimi Vite'a bırakılıyor; 5174 başka bir
       oturum tarafından tutulduğunda takılıp kalmasın diye. */
    port: Number(process.env.PORT) || (process.stdout.isTTY ? 5174 : undefined),
    host: true,
  },
})
