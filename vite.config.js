import { exec, spawn } from 'node:child_process'
import { createReadStream, existsSync, openSync, statSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { yayinIsleyicisi } from './sunucu-taklidi/fiyat-listesi-yayini.mjs'

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

   YENİ FİYAT LİSTESİ DE BURADAN YAYINA GİRİYOR (21 Eylül 2026).
   Backoffice personelin yüklediği PDF'i okuyup onaylanan listeyi
   `POST /parca-katalogu/yayinla` ile gönderiyor; işi
   `sunucu-taklidi/fiyat-listesi-yayini.mjs` yapıyor (sözleşmesi orada).
   Sunucu yazıldığında aynı sözleşmeyi uygulayacak.
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
      const yayinla = yayinIsleyicisi(KOK)
      server.middlewares.use('/parca-katalogu/yayinla', (istek, cevap, sonraki) => {
        if (istek.method !== 'POST') return sonraki()
        yayinla(istek, cevap)
      })
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

/* --------------------------------------------------------------------------
   KULLANIM KILAVUZLARINI GELİŞTİRME SUNUCUSUNDAN YAYINLA (29 Eylül 2026)

   Kılavuz, PAKSAN'ın basılı kılavuzunun PDF'i; uygulamanın içinde değil,
   sunucudaki bir klasörde (kullanıcının kararı: "sunucuda kılavuzların
   bulunduğu bir klasör olsun, oradan okunsun"). Klasörde PDF'ler ve
   hangisinin ne olduğunu söyleyen `kilavuzlar.json` duruyor (sözleşme
   sunucu-taklidi/BENIOKU.md'de). Katalogdaki gibi yalnız geliştirme
   sunucusunda çalışıyor, derlemeye hiçbir dosya girmiyor.

   OLMAYAN DOSYAYA 404. Katalogdaki ara katman olmayan dosyada bir
   sonrakine geçiyor ve Vite o isteğe uygulamanın index.html'ini "200"
   ile veriyor; kılavuzda bu, PDF yerine bir HTML sayfasının telefona
   kaydedilmesi demekti.
   -------------------------------------------------------------------------- */

function kilavuzSun() {
  const KLASOR = fileURLToPath(new URL('./sunucu-taklidi/kilavuzlar', import.meta.url))
  const TURLER = {
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
  }

  return {
    name: 'paksan-kilavuz-sun',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/kilavuzlar', (istek, cevap) => {
        const yol = decodeURIComponent((istek.url || '/').split('?')[0])
        const tam = join(KLASOR, yol)
        const uzanti = extname(tam).toLowerCase()
        if (
          !tam.startsWith(KLASOR) ||
          !TURLER[uzanti] ||
          !existsSync(tam) ||
          statSync(tam).isDirectory()
        ) {
          cevap.statusCode = 404
          cevap.end()
          return
        }
        cevap.setHeader('Content-Type', TURLER[uzanti])
        cevap.setHeader('Content-Length', statSync(tam).size)
        /* Liste her açılışta tazeleniyor; PDF'in adı yeni baskıda
           değişiyor (tarihi adında), aynı adın içeriği değişmiyor. */
        cevap.setHeader('Cache-Control', uzanti === '.json' ? 'no-cache' : 'max-age=86400')
        createReadStream(tam).pipe(cevap)
      })
    },
  }
}

/* --------------------------------------------------------------------------
   DESTEK ASİSTANI — geliştirmede yerel sohbet sunucusuna aktarım

   Destek ekranı `/destek-ai/...` adresine soru gönderiyor (bkz.
   src/config.js → AI). Asistanın kılavuzları, arama indeksi ve dil
   modeli uygulamanın içinde DEĞİL; canlıda PAKSAN'ın sunucusunda, bugün
   bu bilgisayardaki sohbet sunucusunda duruyor:

       D:/PAKSAN/paksan-rag/sohbet/sunucu.mjs   →   http://127.0.0.1:8770

   Bu ara katman istekleri oraya aktarıyor. Tarayıcı doğrudan 8770'e
   gitmiyor: adres uygulamanın kendi kökünde kalıyor ki canlıda
   değişecek tek şey `AI.kok` olsun.

   SUNUCU KAPALIYSA KENDİSİ BAŞLATIYOR. `npm run dev` açılınca 8770
   boşsa sohbet sunucusu arka planda başlıyor; günlüğü
   D:/PAKSAN/paksan-rag/uretim/sohbet-sunucusu.log. Açıksa dokunulmuyor.

   Yalnız geliştirme sunucusunda (`apply: 'serve'`); derlemeye hiçbir
   şey girmiyor.
   -------------------------------------------------------------------------- */

function destekAsistaniSun() {
  const HEDEF = { host: '127.0.0.1', port: Number(process.env.PAKSAN_SOHBET_PORT) || 8770 }
  const DOSYA = process.env.PAKSAN_SOHBET_SUNUCU || 'D:/PAKSAN/paksan-rag/sohbet/sunucu.mjs'
  const GUNLUK = process.env.PAKSAN_SOHBET_GUNLUK || 'D:/PAKSAN/paksan-rag/uretim/sohbet-sunucusu.log'

  const acikMi = () =>
    new Promise((coz) => {
      const soket = net.connect(HEDEF)
      soket.once('connect', () => {
        soket.destroy()
        coz(true)
      })
      soket.once('error', () => coz(false))
    })

  return {
    name: 'paksan-destek-asistani',
    apply: 'serve',
    async configureServer(server) {
      if (!(await acikMi())) {
        if (existsSync(DOSYA)) {
          let cikti = 'ignore'
          try {
            cikti = openSync(GUNLUK, 'a')
          } catch {
            /* Günlük açılamazsa sunucu yine başlıyor, yalnız sessiz */
          }
          spawn(process.execPath, [DOSYA], {
            detached: true,
            stdio: ['ignore', cikti, cikti],
            windowsHide: true,
          }).unref()
          server.config.logger.info(
            `  Destek asistanı sunucusu başlatıldı → http://${HEDEF.host}:${HEDEF.port}`,
          )
        } else {
          server.config.logger.warn(`  Destek asistanı sunucusu bulunamadı: ${DOSYA}`)
        }
      }

      server.middlewares.use('/destek-ai', (istek, cevap) => {
        const basliklar = { ...istek.headers, host: `${HEDEF.host}:${HEDEF.port}` }
        delete basliklar.origin
        delete basliklar.referer
        const giden = http.request(
          { ...HEDEF, method: istek.method, path: '/api' + (istek.url || '/'), headers: basliklar },
          (gelen) => {
            cevap.writeHead(gelen.statusCode || 502, gelen.headers)
            gelen.pipe(cevap)
          },
        )
        giden.on('error', () => {
          if (!cevap.headersSent) {
            cevap.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
          }
          cevap.end(JSON.stringify({ hata: 'destek-sunucusu-kapali' }))
        })
        /* Kullanıcı ekrandan çıkarsa sunucudaki üretim de dursun. */
        cevap.on('close', () => giden.destroy())
        istek.pipe(giden)
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
  plugins: [react(), katalogSun(), kilavuzSun(), destekAsistaniSun(), ikiSekmeAc()],
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
    /* SUNUCU KLASÖRÜ İZLENMİYOR (29 Eylül 2026). `sunucu-taklidi/`
       uygulamanın kodu değil, sunucunun verisi; ara katmanlar her istekte
       diskten okuyor. Vite onu da izliyordu: klasöre 8 MB'lık bir kılavuz
       PDF'i kopyalanırken Windows dosyayı kilitli tuttu, izleyici EBUSY ile
       düştü ve geliştirme sunucusu kapandı. Fiyat listesi yayını da aynı
       klasöre yazıyor. */
    watch: { ignored: ['**/sunucu-taklidi/**'] },
  },
})
