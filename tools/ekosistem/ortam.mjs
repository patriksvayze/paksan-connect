/* ==========================================================================
   Ekosistem sınamasının ortamı

   Üç uygulamanın paylaştığı veri katmanını Node içinde çalıştırabilmek
   için gereken her şey burada: depo taklidi, donmuş saat, tohumlu
   rastgelelik, modül yükleyici ve iddia yardımcıları.

   NEDEN VITE GEREKİYOR. Modülleri düz `import` ile alamıyoruz:
   src/backoffice/veri.js `'../marka'` diyor, src/marka/index.js de
   `'./logo.jsx'`ten yeniden dışa aktarım yapıyor. Node ne uzantısız
   yolu çözer ne de JSX'i okur. Vite'ın `ssrLoadModule`'ü ikisini de
   yapıyor. Aynı yöntem projede zaten çalışıyor: tools/vt/tohum-uret.mjs
   uygulama sabitlerini böyle okuyor ve `npm run dogrula` 13. kontrolden
   koşuyor.

   NEDEN SIRA ÖNEMLİ. Depo taklidi, saat ve rastgelelik modüller
   yüklenmeden ÖNCE kurulmalı. Modül gövdeleri yüklenirken depoya
   bakabiliyor; taklit sonra kurulursa o ilk okuma boşa düşer ve bir daha
   tekrarlanmaz.
   ========================================================================== */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const KOK = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/* Projede tek bir "şimdi" olsun diye tools/ekran-goruntusu.mjs:90'daki
   SIMDI ile aynı an. İki araç aynı tarihi üretirse ekran görüntüsündeki
   talep ile sınamadaki talep karşılaştırılabilir kalıyor. */
export const TABAN = 1787293350214

/* -------------------------------------------------------------- Saat */

let akis = 0
let kaydirma = 0
const GercekDate = Date

function anlikZaman() {
  return TABAN + kaydirma + akis++
}

export const saat = {
  /** Senaryo başında çağrılır: akış sıfırlanır, gün kaydırması silinir. */
  sifirla() {
    akis = 0
    kaydirma = 0
  },
  /** Eşik sınamaları için ileri sarar; beklemeden 48 saat geçirir. */
  ileri(gun) {
    kaydirma += Math.round(gun * 24 * 60 * 60 * 1000)
  },
  /** O anki değeri akışı ilerletmeden okur (iddialarda kullanılır). */
  simdi() {
    return TABAN + kaydirma + akis
  },
}

/* --------------------------------------------------------- Rastgelelik */

let tohumDurumu = 1
export let TOHUM = 20260918

export function tohumla(tohum) {
  TOHUM = tohum
  tohumDurumu = tohum >>> 0 || 1
}

/* xorshift32 — küçük, bağımlılıksız, tekrarlanabilir. */
function rastgele() {
  tohumDurumu ^= tohumDurumu << 13
  tohumDurumu ^= tohumDurumu >>> 17
  tohumDurumu ^= tohumDurumu << 5
  tohumDurumu >>>= 0
  return tohumDurumu / 4294967296
}

/* ---------------------------------------------------------- Depo taklidi */

function depoYap() {
  const harita = new Map()
  return {
    getItem: (k) => (harita.has(String(k)) ? harita.get(String(k)) : null),
    setItem: (k, v) => void harita.set(String(k), String(v)),
    removeItem: (k) => void harita.delete(String(k)),
    clear: () => harita.clear(),
    key: (i) => Array.from(harita.keys())[i] ?? null,
    get length() {
      return harita.size
    },
    /** Sınamaya özel: yazılmış anahtarların listesi (AK-10 bunu okuyor). */
    anahtarlar: () => Array.from(harita.keys()).sort(),
  }
}

/**
 * Depo, saat ve rastgeleliği globalThis'e kurar.
 * Modül yüklemeden ÖNCE çağrılmak zorunda.
 */
export function ortamKur() {
  globalThis.localStorage = depoYap()
  globalThis.sessionStorage = depoYap()

  /* `Date.now()` çoğu yerde kullanılıyor ama lib/talep.js → talepNo()
     `new Date()` çağırıyor. Yalnız `Date.now`u dondurmak talep
     numarasının tarih kısmını gerçek güne bırakırdı; sınama gece
     yarısını geçtiğinde beklenen numara değişirdi. İkisi de sarılıyor. */
  class DonmusDate extends GercekDate {
    constructor(...arg) {
      if (arg.length === 0) super(anlikZaman())
      else super(...arg)
    }
    static now() {
      return anlikZaman()
    }
  }
  globalThis.Date = DonmusDate
  globalThis.Math.random = rastgele
}

/** Her senaryonun başında: depo boş, saat başa sarılı, tohum yerinde. */
export function depoTemizle() {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
  saat.sifirla()
  tohumla(TOHUM)
}

/* ------------------------------------------------------- Modül yükleyici */

let sunucu = null

/**
 * Uygulama modüllerini Node içinde yükler.
 * Tek Vite sunucusu açılıyor, bütün senaryolar onu paylaşıyor.
 */
export async function modulleriYukle() {
  const { createServer } = await import('vite')
  sunucu = await createServer({
    root: KOK,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, watch: null, hmr: false },
  })

  const al = (yol) => sunucu.ssrLoadModule(yol)

  const [veri, servisKaydi, servisAtama, talepOlustur, duyuruHedef, teslimat, depo, icerik, yetkiler, marka, makineKaydi, talep, serial, numaraTalebi, urun, adresler, rehber] =
    await Promise.all([
      al('/src/backoffice/veri.js'),
      al('/src/lib/servisKaydi.js'),
      al('/src/lib/servisAtama.js'),
      al('/src/lib/talepOlustur.js'),
      al('/src/lib/duyuruHedef.js'),
      al('/src/lib/teslimat.js'),
      al('/src/lib/storage.js'),
      al('/src/lib/icerikDeposu.js'),
      al('/src/data/yetkiler.js'),
      al('/src/marka/index.js'),
      al('/src/lib/makineKaydi.js'),
      al('/src/lib/talep.js'),
      al('/src/lib/serial.js'),
      al('/src/lib/numaraTalebi.js'),
      al('/src/lib/urun.js'),
      al('/src/servis/adresler.js'),
      al('/src/marka/icerik/rehber.js'),
    ])

  return { veri, servisKaydi, servisAtama, talepOlustur, duyuruHedef, teslimat, depo, icerik, yetkiler, marka, makineKaydi, talep, serial, numaraTalebi, urun, adresler, rehber }
}

/**
 * Tek bir modülü sonradan yükler.
 *
 * Bazı modüller yüklenirken globalThis'e bakıyor ve sınanabilmeleri için
 * önce ortamın hazırlanması gerekiyor: `src/servis/dikteMotoru.js`
 * `window.SpeechRecognition`'ı MODÜL GÖVDESİNDE okuyor, yani taklit
 * yüklemeden önce kurulmalı. Toplu yüklemeye konsaydı taklit hiç
 * görülmezdi.
 */
export async function modulYukle(yol) {
  if (!sunucu) throw new Error('önce modulleriYukle() çağrılmalı')
  return sunucu.ssrLoadModule(yol)
}

export async function kapat() {
  if (sunucu) await sunucu.close()
  sunucu = null
}

/* ------------------------------------------------------------ 0. adım */

/**
 * Depo taklidi gerçekten çalışıyor mu?
 *
 * BU DOSYANIN EN ÖNEMLİ FONKSİYONU. src/lib/storage.js her hatayı
 * yutup varsayılanı döndürüyor (`try/catch` → `fallback`). Taklit
 * kurulmamışsa ya da bozuksa hiçbir şey patlamaz: bütün senaryolar boş
 * bir depoya bakar ve HEPSİ YEŞİL GEÇER. Sınama ile sessiz bir yalancı
 * arasındaki fark bu turdur.
 */
export function nisanTuru(depo) {
  /* Önce taklidin VARLIĞI. Yoksa aşağıdaki `depoTemizle()` çirkin bir
     TypeError ile patlar ve neyin yanlış gittiği anlaşılmaz. */
  for (const [ad, d] of [
    ['localStorage', globalThis.localStorage],
    ['sessionStorage', globalThis.sessionStorage],
  ]) {
    if (!d || typeof d.anahtarlar !== 'function') {
      return `${ad} taklidi kurulmamış — ortamKur() çağrıldı mı?`
    }
  }

  depoTemizle()
  const nisan = { a: 1, b: 'iki', c: [3] }
  depo.save('__nisan', nisan)
  const geri = depo.load('__nisan', null)
  const tamam =
    geri && geri.a === 1 && geri.b === 'iki' && Array.isArray(geri.c) && geri.c[0] === 3
  const ham = globalThis.localStorage.getItem('paksan.__nisan')
  depo.remove('__nisan')
  if (!tamam) return 'depo taklidi yazılanı geri vermiyor'
  if (!ham) return 'anahtar "paksan." önekiyle yazılmamış'
  if (depo.load('__nisan', 'silindi') !== 'silindi') return 'remove() çalışmıyor'
  return null
}

/* ------------------------------------------------------- İddia yardımcıları */

/** Bir senaryonun iddia defteri. */
export function defter(kod, ad) {
  const dusen = []
  let sayi = 0

  const yaz = (ne, beklenen, gelen) => {
    dusen.push({ ne, beklenen: goster(beklenen), gelen: goster(gelen) })
  }

  return {
    kod,
    ad,
    get sayi() {
      return sayi
    },
    get dusen() {
      return dusen
    },
    esit(gelen, beklenen, ne) {
      sayi++
      if (!Object.is(gelen, beklenen)) yaz(ne, beklenen, gelen)
    },
    dogru(kosul, ne) {
      sayi++
      if (!kosul) yaz(ne, 'doğru', 'yanlış')
    },
    yanlis(kosul, ne) {
      sayi++
      if (kosul) yaz(ne, 'yanlış', 'doğru')
    },
    /** Serbest karşılaştırma: iddia düşerse iki değeri de yazdırır. */
    bak(kosul, ne, beklenen, gelen) {
      sayi++
      if (!kosul) yaz(ne, beklenen, gelen)
    },
  }
}

function goster(d) {
  if (d === null) return 'null'
  if (d === undefined) return 'undefined'
  if (typeof d === 'string') return `"${d}"`
  if (typeof d === 'object') {
    const y = JSON.stringify(d)
    return y.length > 120 ? y.slice(0, 117) + '…' : y
  }
  return String(d)
}
