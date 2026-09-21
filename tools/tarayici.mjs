/* ==========================================================================
   Tarayıcı motoru — Chrome'u açan ve ona konuşan ortak katman

   İki araç bunu kullanıyor:

     tools/ekran-goruntusu.mjs   sunum görsellerini üretiyor
     tools/ekosistem-turu.mjs    ekranların birbirini gördüğünü sınıyor

   NEDEN AYRI DOSYA. Motor bir dönem yalnız ekran-goruntusu.mjs'in
   içindeydi; ikinci bir araç gerekince kopyalanması işten değildi ve
   zaten bir kez kopyalandı (denetim/duyuru-goruntu.mjs, ayrışmış 750
   satır). Üçüncü kopya çıkmasın diye motor buraya alındı.

   Ek paket kurulmuyor: Chrome'a DevTools Protokolü ile, Node 22+
   içindeki WebSocket üzerinden konuşuluyor.
   ========================================================================== */

import { spawn } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const CHROME = [
  process.env.PAKSAN_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((y) => y && existsSync(y))

const PORT = 9333 + Math.floor(Math.random() * 400)
export const PROFIL = join(tmpdir(), 'paksan-tarayici-' + Date.now())

export function bekle(ms) {
  return new Promise((c) => setTimeout(c, ms))
}

export async function chromeAc() {
  if (!CHROME) {
    throw new Error('Chrome bulunamadı. Yolu PAKSAN_CHROME ile verebilirsiniz.')
  }
  const p = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFIL,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: 'ignore' })

  for (let i = 0; i < 60; i++) {
    await bekle(250)
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (r.ok) return { surec: p, bilgi: await r.json() }
    } catch { /* henüz açılmadı */ }
  }
  throw new Error('Chrome açılmadı')
}

/* CDP: tek bir WebSocket üzerinden komut gönderip cevabını bekliyoruz. */
export class Cdp {
  constructor(ws) {
    this.ws = ws
    this.no = 0
    this.bekleyen = new Map()
    this.olaylar = new Map()
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.bekleyen.has(m.id)) {
        const { coz, red } = this.bekleyen.get(m.id)
        this.bekleyen.delete(m.id)
        m.error ? red(new Error(m.error.message)) : coz(m.result)
      } else if (m.method) {
        const d = this.olaylar.get(m.method)
        if (d) { this.olaylar.delete(m.method); d(m.params) }
      }
    })
  }

  static async bagla(url) {
    const ws = new WebSocket(url)
    await new Promise((c, r) => {
      ws.addEventListener('open', c, { once: true })
      ws.addEventListener('error', r, { once: true })
    })
    return new Cdp(ws)
  }

  gonder(method, params = {}, sessionId) {
    const id = ++this.no
    this.ws.send(JSON.stringify({ id, method, params, sessionId }))
    return new Promise((coz, red) => this.bekleyen.set(id, { coz, red }))
  }

  olay(method, sure = 8000) {
    return new Promise((coz) => {
      const zaman = setTimeout(() => { this.olaylar.delete(method); coz(null) }, sure)
      this.olaylar.set(method, (p) => { clearTimeout(zaman); coz(p) })
    })
  }
}

/* ------------------------------------------------------------- Sayfa */

export class Sayfa {
  constructor(cdp, oturum) {
    this.cdp = cdp
    this.oturum = oturum
  }

  static async ac(cdp) {
    const { targetId } = await cdp.gonder('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.gonder('Target.attachToTarget', { targetId, flatten: true })
    const s = new Sayfa(cdp, sessionId)
    await s.cdp.gonder('Page.enable', {}, sessionId)
    await s.cdp.gonder('Runtime.enable', {}, sessionId)
    return s
  }

  olcu(m) {
    return this.cdp.gonder('Emulation.setDeviceMetricsOverride', {
      ...m, screenWidth: m.width, screenHeight: m.height,
    }, this.oturum)
  }

  /**
   * Sayfanin KENDI kodundan once calisacak kod kurar; her gezinmede
   * yeniden calisir.
   *
   * Neden gerekli: gezindikten SONRA enjekte edilen bir hata dinleyicisi
   * yuklenme sirasindaki hatalari kaciriyor — React'in bir bilesende
   * patlamasi da dahil, ki en cok gorulen hata odur. Buradan kurulunca
   * ilk satirdan itibaren dinliyor.
   */
  onceden(kod) {
    return this.cdp.gonder(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: kod },
      this.oturum,
    )
  }

  /* Uygulama HashRouter kullaniyor: yalniz `#` degisince Chrome sayfayi
     yeniden yuklemiyor ve bir onceki ekranin durumu (acik akordiyon,
     secili sekme) ustte kaliyor. Her sahne temiz baslasin diye adres
     yazildiktan sonra sayfa acikca yenileniyor. */
  async git(url) {
    await this.cdp.gonder('Page.navigate', { url }, this.oturum)
    await bekle(150)
    const yuklendi = this.cdp.olay('Page.loadEventFired', 15000)
    await this.cdp.gonder('Page.reload', {}, this.oturum)
    await yuklendi
    await bekle(600)
  }

  async js(kod) {
    const r = await this.cdp.gonder('Runtime.evaluate', {
      expression: kod, awaitPromise: true, returnByValue: true,
    }, this.oturum)
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + kod.slice(0, 80))
    return r.result?.value
  }

  /* Metnine göre düğme bulup tıklıyor. `kapsam` verilirse yalnız o
     seçicideki öğelere bakılıyor — "Kullanım" hem sekmede hem kart
     başlığında geçebiliyor. */
  tiklaMetin(metin, kapsam = 'button, a, [role="button"]') {
    return this.js(`(() => {
      const ara = ${JSON.stringify(metin)};
      const hepsi = [...document.querySelectorAll(${JSON.stringify(kapsam)})];
      const h = hepsi.find(e => (e.innerText || '').includes(ara));
      if (!h) return 'YOK';
      h.click();
      return 'OK';
    })()`)
  }

  tikla(secici) {
    return this.js(`(() => {
      const e = document.querySelector(${JSON.stringify(secici)});
      if (!e) return 'YOK';
      e.click();
      return 'OK';
    })()`)
  }

  tiklaSon(secici) {
    return this.js(`(() => {
      const l = [...document.querySelectorAll(${JSON.stringify(secici)})];
      if (!l.length) return 'YOK';
      l[l.length - 1].click();
      return 'OK';
    })()`)
  }

  tiklaSira(secici, sira) {
    return this.js(`(() => {
      const l = [...document.querySelectorAll(${JSON.stringify(secici)})];
      if (!l[${sira}]) return 'YOK';
      l[${sira}].click();
      return 'OK';
    })()`)
  }

  kaydir(px) {
    return this.js(`(window.scrollTo({top:${px}}), 'OK')`)
  }

  /* Acilan akordiyon ekranin altinda kalabiliyor; goruntu alinmadan
     once o kutuyu ekranin ustune getiriyor. */
  kaydirSecici(secici, bosluk = 90) {
    return this.js(`(() => {
      const e = document.querySelector(${JSON.stringify(secici)});
      if (!e) return 'YOK';
      const y = e.getBoundingClientRect().top + window.scrollY - ${bosluk};
      window.scrollTo({ top: Math.max(0, y) });
      return 'OK';
    })()`)
  }

  async cek(dosya) {
    const { data } = await this.cdp.gonder('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
    }, this.oturum)
    writeFileSync(dosya, Buffer.from(data, 'base64'))
  }
}
