import { exec } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

/* --------------------------------------------------------------------------
   YEDEK PARÇA KATALOĞUNU GELİŞTİRME SUNUCUSUNDAN YAYINLA

   Katalog uygulamanın içinde DEĞİL: 538 parça ve 2 MB görsel, ayrıca
   fiyatlar değişiyor. Uygulama onu ağdan çağırıyor (bkz.
   src/lib/parcaKatalogu.js). Sunucu henüz yok; geliştirme sırasında
   onun yerini depodaki `sunucu-taklidi/` klasörü tutuyor.

   `publicDir` KULLANILMADI ve sebebi tam da bu: Vite oradaki dosyaları
   `dist/` içine KOPYALAR, yani katalog APK'ya girerdi. Bu ara katman
   yalnızca geliştirme sunucusunda çalışıyor (`apply: 'serve'`);
   derlemede hiçbir dosya kopyalanmıyor.

   Böylece taklit gerçeğe benziyor: uygulama gerçek bir HTTP isteği
   atıyor, yükleme göstergesi ve hata ekranı gerçekten çalışıyor.
   -------------------------------------------------------------------------- */

function katalogSun() {
  const KOK = fileURLToPath(new URL('./sunucu-taklidi', import.meta.url))
  const TURLER = {
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }

  return {
    name: 'paksan-katalog-sun',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/parca-katalogu', (istek, cevap, sonraki) => {
        /* Adres çözümlemesi kök dışına çıkamıyor: `..` içeren bir
           istek geliştirme makinesindeki başka dosyaları okuyabilirdi. */
        const yol = decodeURIComponent((istek.url || '/').split('?')[0])
        const tam = join(KOK, 'parca-katalogu', yol)
        if (!tam.startsWith(join(KOK, 'parca-katalogu'))) return sonraki()
        if (!existsSync(tam) || statSync(tam).isDirectory()) return sonraki()

        const uzanti = extname(tam).toLowerCase()
        cevap.setHeader('Content-Type', TURLER[uzanti] || 'application/octet-stream')
        /* Görseller değişmiyor; tarayıcı ikinci kez indirmesin. */
        cevap.setHeader('Cache-Control', uzanti === '.json' ? 'no-cache' : 'max-age=86400')
        createReadStream(tam).pipe(cevap)
      })
    },
  }
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
  plugins: [react(), katalogSun(), ikiSekmeAc()],
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
