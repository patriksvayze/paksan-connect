/* ==========================================================================
   Yeni fiyat listesini yayına almak — sunucunun yapacağı işin taklidi

   Backoffice'teki Yedek Parça Kataloğu ekranı, personelin yüklediği
   PDF'i okuyup onayladıktan sonra sonucu buraya gönderiyor. Bugün
   sunucu yok; geliştirme sunucusu bu dosyayı çağırıyor (vite.config.js
   → katalogSun). Sunucu yazıldığında AYNI SÖZLEŞMEYİ uygular ve bu
   dosyanın yerini alır.

   SÖZLEŞME

     POST <kok>/yayinla        (<kok> = src/config.js → PARCA_KATALOG.kok)
     {
       katalog:   { kaynak, gruplar: [{id, ad, adet}],
                    parcalar: [{kod, ad, fiyat, grup, gorsel}] },
       gorseller: { "<parça kodu>.webp": "<base64>", ... },
       kaynakPdf: "<base64>",        // okunan PDF'in kendisi
       korunanGorseller: ["<dosya adı>", ...],
                                     // geçmiş işlemlerin gösterdiği görseller
       personel:  "<ad soyad>"
     }

     200 → { surum, parca, yayinTarihi }
     400 → { hata: "<kod>" }   gelen liste kurallara uymuyor
     500 → { hata: "yazilamadi" }

   SUNUCU TARAYICIYA GÜVENMEZ. Liste personelin tarayıcısında okundu;
   sunucu yine de her parçayı denetliyor: kod ve dosya adı kalıbı
   (başka klasöre yazılamasın), fiyat pozitif tam sayı, grup listede
   var, aynı kod iki kez yok, görseli yazılı her parçanın dosyası
   gelmiş.

   YENİ LİSTE ESKİSİNİN YERİNİ ALIYOR, ESKİSİ KALKIYOR (8 Ekim 2026,
   kullanıcının kararı: "her liste yüklemesinde o liste artık fiyat
   listesinin kendisi olmalı, önceki fiyat listesi çıkartılmalı … çünkü
   yeni liste zaten güncel tüm yedek parça listesi"). Yayından sonra
   klasörde yalnız yeni liste var: katalog.json, görselleri ve PDF'i.
   Önceden (21 Eylül – 8 Ekim) eski liste olduğu gibi
   `parca-katalogu-arsiv/` altına kopyalanıyordu, "hangi sipariş hangi
   fiyattan verildi" kanıtı diye. O kanıt zaten işlemin kendi içinde:
   talep ve sipariş o günkü kodu, adı, fiyatı ve görselin dosya adını
   taşıyor (src/lib/parcaKatalogu.js → fiyatGoruntusu). Arşive hiçbir
   uygulama bakmıyordu; her yayın 538 görseli bir kez daha kopyalıyordu.

   GEÇMİŞ İŞLEMİN GÖRSELİ KALIYOR (22 Eylül 2026, kullanıcının kararı:
   "katalog değişirse geçmiş işlemlerdeki yedek parça kodları, isimleri
   ve görselleri değişmemeli"). Eski listenin görsellerinden, kayıtlı
   bir talebin, servis kaydının ya da siparişin gösterdikleri silinmiyor
   (`korunanGorseller`); geri kalanı siliniyor. Hangileri kalıyor,
   `korunan-gorseller.json` dosyasında yazılı (`npm run dogrula` 9.
   kontrolü sahipsiz görseli oradan ayırıyor). Liste bugün tarayıcıdan
   geliyor, çünkü kayıtlar personelin tarayıcısının deposunda. SUNUCU
   YAZILDIĞINDA bu listeyi tarayıcıdan almaz, veritabanındaki parça
   satırlarından kendisi çıkarır: eksik bir liste geçmiş talebin
   resmini sildirebilir.

   GÖRSEL DOSYASI EZİLMİYOR. Gelen resim yürürlükteki dosyayla birebir
   aynıysa o ad kullanılıyor; farklıysa ve ad doluysa resim içeriğinden
   türeyen yeni bir adla (`<kod>.<8 hane>.webp`) yazılıyor ve katalog o
   adı gösteriyor. Altı ay önceki talep, o adı taşıdığı için yeni resmi
   göstermiyor.

   YÜRÜRLÜĞE GİRİŞ TEK HAMLEDE. Sıra şu:
     1. yeni liste yan klasöre (parca-katalogu.yeni) bütünüyle yazılır
     2. yeni görseller ve PDF yerine konur
     3. katalog.json geçici dosyadan tek bir yeniden adlandırmayla değişir
     4. eski listenin kalanı silinir: yeni listenin ve hiçbir kaydın
        göstermediği görseller; yeni listeyle PDF gelmediyse eski PDF
   Uygulamalar listeyi katalog.json'dan okuyor; o dosya değişmeden yeni
   liste yürürlüğe girmiş sayılmaz. 1. ya da 2. adımda bir şey ters
   giderse yürürlükteki listeye hiç dokunulmamış olur. Silme yeni liste
   yürürlüğe GİRDİKTEN SONRA: silinemeyen dosya (Windows'ta kilitli
   kalan) yayını düşürmüyor, bir sonraki yayında yine sahipsiz olduğu
   için siliniyor.

   NEDEN KLASÖR TAŞINMIYOR. İlk sürüm yürürlükteki klasörü arşive
   taşıyordu. Windows'ta geliştirme sunucusu proje klasörlerini izlediği
   için klasör taşıma izin hatası verdi (EPERM, 21 Eylül 2026 denemesi);
   dosya kopyalamak ve tek dosyayı yeniden adlandırmak her iki
   işletim sisteminde de çalışıyor.

   VERİTABANINDA KARŞILIĞI: katalog.FiyatListesi ve
   katalog.FiyatListesiSatiri. Sunucu yazıldığında bu iş o tablolara da
   yazacak (bkz. veritabani/tasarim.md, işletim tablosu 16. satır;
   eski listenin kalkması VT-TASARIM-EKLERI.md §17).
   ========================================================================== */

import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const KOD = /^[0-9A-Za-z][0-9A-Za-z.]*$/
const GRUP = /^[a-z0-9][a-z0-9-]*$/
const GORSEL = /^([0-9A-Za-z][0-9A-Za-z.]*)\.(webp|png)$/

/** Eski listeden kalan görsellerin neden durduğunu yazan dosya. */
export const KORUNAN_DOSYASI = 'korunan-gorseller.json'

/* Sınır: bugünkü liste 7,8 MB PDF ve 2 MB görsel. */
export const EN_BUYUK_ISTEK = 80 * 1024 * 1024

class YayinHatasi extends Error {
  constructor(kod) {
    super(kod)
    this.kod = kod
  }
}

/** Gelen isteği denetler; uymuyorsa hata kodunu fırlatır. */
export function yayiniDenetle(istek) {
  const k = istek?.katalog
  if (!k || !Array.isArray(k.parcalar) || !k.parcalar.length) throw new YayinHatasi('parca-yok')
  if (!Array.isArray(k.gruplar) || !k.gruplar.length) throw new YayinHatasi('grup-yok')

  const gruplar = new Set()
  for (const g of k.gruplar) {
    if (!g || !GRUP.test(g.id || '') || typeof g.ad !== 'string' || !g.ad.trim()) {
      throw new YayinHatasi('grup-bozuk')
    }
    gruplar.add(g.id)
  }

  const gorseller = istek.gorseller || {}
  const kodlar = new Set()
  for (const p of k.parcalar) {
    if (!p || !KOD.test(p.kod || '')) throw new YayinHatasi('kod-bozuk')
    if (kodlar.has(p.kod)) throw new YayinHatasi('kod-tekrar')
    kodlar.add(p.kod)
    if (typeof p.ad !== 'string' || !p.ad.trim()) throw new YayinHatasi('ad-yok')
    if (!Number.isInteger(p.fiyat) || p.fiyat <= 0) throw new YayinHatasi('fiyat-bozuk')
    if (!gruplar.has(p.grup)) throw new YayinHatasi('grup-bilinmiyor')
    if (p.gorsel != null) {
      const m = GORSEL.exec(p.gorsel)
      if (!m || m[1] !== p.kod) throw new YayinHatasi('gorsel-adi-bozuk')
      if (typeof gorseller[p.gorsel] !== 'string') throw new YayinHatasi('gorsel-eksik')
    }
  }
  for (const ad of Object.keys(gorseller)) {
    if (!GORSEL.test(ad)) throw new YayinHatasi('gorsel-adi-bozuk')
  }

  if (istek.kaynakPdf != null) {
    const bas = Buffer.from(String(istek.kaynakPdf).slice(0, 8), 'base64').toString('latin1')
    if (!bas.startsWith('%PDF')) throw new YayinHatasi('pdf-degil')
  }
}

/* Gelen görselin yürürlükte yazılacağı ad. Aynı içerik varsa onun adı
   (yeni dosya yok), `<kod>.<uzantı>` boşsa o, ikisi de değilse içerikten
   türeyen ad. Hiçbir durumda var olan farklı bir dosyanın üstüne
   yazılmıyor. `oncekiAd` yürürlükteki katalogda bu parçanın gösterdiği
   dosya — daha önce yeniden adlandırılmış olabilir. */
function gorselAdiSec(klasor, gelenAd, veri, oncekiAd) {
  const [, kod, uzanti] = GORSEL.exec(gelenAd)
  const ayni = (ad) => existsSync(join(klasor, ad)) && readFileSync(join(klasor, ad)).equals(veri)
  for (const ad of [oncekiAd, gelenAd]) if (ad && ayni(ad)) return ad
  if (!existsSync(join(klasor, gelenAd))) return gelenAd
  const iz = createHash('sha256').update(veri).digest('hex').slice(0, 8)
  return `${kod}.${iz}.${uzanti}`
}

/* Korunacak adlar. Liste yalnız silmeyi engelliyor, hiçbir yere
   yazdırmıyor; bu yüzden kalıba uymayan ad reddedilmiyor, sayılmıyor. */
function korunanlar(liste) {
  return new Set((Array.isArray(liste) ? liste : []).filter((ad) => typeof ad === 'string' && GORSEL.test(ad)))
}

/* Silinemeyen dosya yayını düşürmüyor (bkz. başlık, 4. adım). */
function sessizSil(yol) {
  try {
    rmSync(yol, { force: true })
    return true
  } catch (e) {
    console.warn('[fiyat listesi] eski dosya silinemedi, sonraki yayında yeniden denenecek:', yol, e?.code)
    return false
  }
}

/**
 * Listeyi yayına alır.
 *
 * @param {string} kok  sunucu-taklidi klasörü
 * @param {object} istek  sözleşmedeki gövde
 * @param {Date} [simdi]
 * @returns {{surum: number, parca: number, yayinTarihi: string}}
 */
export function fiyatListesiniYayinla(kok, istek, simdi = new Date()) {
  yayiniDenetle(istek)

  const canli = join(kok, 'parca-katalogu')
  const yeni = join(kok, 'parca-katalogu.yeni')

  let eskiSurum = 0
  let eskiGorsel = new Map()
  try {
    const eski = JSON.parse(readFileSync(join(canli, 'katalog.json'), 'utf8'))
    eskiSurum = Number(eski.surum) || 0
    eskiGorsel = new Map((eski.parcalar || []).map((p) => [p.kod, p.gorsel]))
  } catch {
    /* Yürürlükte liste yoksa ilk liste bu. */
  }

  const surum = eskiSurum + 1
  const yayinTarihi = simdi.toISOString()
  const { kaynak, gruplar, parcalar } = istek.katalog

  /* 1. Yeni liste yan klasöre. Yan klasör her durumda, hata olsa da
     sonunda siliniyor; yarım kalmış bir yan klasör bırakılmıyor. */
  rmSync(yeni, { recursive: true, force: true })
  mkdirSync(join(yeni, 'gorseller'), { recursive: true })
  try {
    /* Gelen ad → yürürlükte yazılacak ad (bkz. gorselAdiSec). */
    const adlar = new Map()
    for (const [ad, taban64] of Object.entries(istek.gorseller || {})) {
      const veri = Buffer.from(taban64, 'base64')
      const [, kod] = GORSEL.exec(ad)
      const son = gorselAdiSec(join(canli, 'gorseller'), ad, veri, eskiGorsel.get(kod))
      adlar.set(ad, son)
      writeFileSync(join(yeni, 'gorseller', son), veri)
    }
    if (istek.kaynakPdf) writeFileSync(join(yeni, 'kaynak.pdf'), Buffer.from(istek.kaynakPdf, 'base64'))
    const katalog = {
      surum,
      kaynak: String(kaynak || ''),
      yayinTarihi,
      yayinlayan: String(istek.personel || ''),
      gruplar: gruplar.map((g) => ({ id: g.id, ad: g.ad, adet: parcalar.filter((p) => p.grup === g.id).length })),
      parcalar: parcalar.map((p) => ({
        kod: p.kod, ad: p.ad.trim(), fiyat: p.fiyat, grup: p.grup,
        gorsel: p.gorsel == null ? null : adlar.get(p.gorsel),
      })),
    }
    writeFileSync(join(yeni, 'katalog.json'), JSON.stringify(katalog, null, 1) + '\n', 'utf8')

    /* 2. Görseller ve PDF yerine. Aynı adla var olan dosya zaten aynı
       içerik (gorselAdiSec); yeniden kopyalanmıyor. */
    mkdirSync(join(canli, 'gorseller'), { recursive: true })
    for (const ad of readdirSync(join(yeni, 'gorseller'))) {
      if (!existsSync(join(canli, 'gorseller', ad))) {
        copyFileSync(join(yeni, 'gorseller', ad), join(canli, 'gorseller', ad))
      }
    }
    if (existsSync(join(yeni, 'kaynak.pdf'))) {
      copyFileSync(join(yeni, 'kaynak.pdf'), join(canli, 'kaynak.pdf'))
    }

    /* 3. Liste tek hamlede yürürlüğe giriyor. */
    const gecici = join(canli, 'katalog.json.yeni')
    copyFileSync(join(yeni, 'katalog.json'), gecici)
    yerineKoy(gecici, join(canli, 'katalog.json'))

    /* 4. Eski listenin kalanı kalkıyor. Kalıba uymayan dosyaya
       (klasöre elle konmuş bir şey) dokunulmuyor. */
    const yeniListede = new Set(katalog.parcalar.map((p) => p.gorsel).filter(Boolean))
    const korunan = korunanlar(istek.korunanGorseller)
    const kalanlar = []
    for (const ad of readdirSync(join(canli, 'gorseller'))) {
      if (!GORSEL.test(ad) || yeniListede.has(ad)) continue
      if (korunan.has(ad)) kalanlar.push(ad)
      else sessizSil(join(canli, 'gorseller', ad))
    }
    if (!istek.kaynakPdf) sessizSil(join(canli, 'kaynak.pdf'))
    try {
      writeFileSync(
        join(canli, KORUNAN_DOSYASI),
        JSON.stringify({ guncelleme: yayinTarihi, gorseller: kalanlar.sort() }, null, 1) + '\n',
        'utf8',
      )
    } catch (e) {
      console.warn('[fiyat listesi] korunan görsellerin listesi yazılamadı:', e?.code)
    }
  } finally {
    rmSync(yeni, { recursive: true, force: true })
  }

  return { surum, parca: parcalar.length, yayinTarihi }
}

/* WINDOWS'TA YENİ YAZILAN DOSYA BİR AN KİLİTLİ (7 Ekim 2026). 6 Ekim'de
   backoffice'ten üç yayın denemesi bu adımda EPERM ile düştü: görseller,
   PDF ve arşiv yazılmış, liste yürürlüğe girmemişti; katalog.json.yeni
   geride kalmıştı. Yeni yazılan dosyayı virüs tarayıcısı ya da dizin
   hizmeti kısa süre açık tutuyor ve o sırada taşınamıyor. Taşıma birkaç
   kez, aralıklarla yeniden deneniyor; olmazsa hata yükseliyor ve geçici
   dosya siliniyor (yarım iz kalmasın). */
const TASIMA_DENEMESI = 20
const TASIMA_ARASI_MS = 150

function yerineKoy(gecici, hedef) {
  for (let i = 1; ; i++) {
    try {
      renameSync(gecici, hedef)
      return
    } catch (e) {
      const kilitli = e && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'EACCES')
      if (!kilitli || i >= TASIMA_DENEMESI) {
        rmSync(gecici, { force: true })
        throw e
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TASIMA_ARASI_MS)
    }
  }
}

/**
 * Geliştirme sunucusunun istek işleyicisi (vite.config.js çağırıyor).
 * Gövdeyi okur, yayına alır, sonucu JSON olarak döner.
 */
export function yayinIsleyicisi(kok) {
  return (istek, cevap) => {
    const parcalar = []
    let boyut = 0
    let asti = false
    const bitir = (kod, govde) => {
      cevap.statusCode = kod
      cevap.setHeader('Content-Type', 'application/json; charset=utf-8')
      cevap.end(JSON.stringify(govde))
    }
    /* Sınır aşılınca bağlantı koparılmıyor, gelen veri boşa akıtılıyor:
       koparılsaydı tarayıcıya cevap yazılamaz, ekran neden olduğunu
       söyleyemezdi. */
    istek.on('data', (p) => {
      boyut += p.length
      if (boyut > EN_BUYUK_ISTEK) {
        asti = true
        parcalar.length = 0
        return
      }
      parcalar.push(p)
    })
    istek.on('end', () => {
      if (asti) return bitir(413, { hata: 'cok-buyuk' })
      try {
        const govde = JSON.parse(Buffer.concat(parcalar).toString('utf8'))
        bitir(200, fiyatListesiniYayinla(kok, govde))
      } catch (e) {
        if (e instanceof YayinHatasi) return bitir(400, { hata: e.kod })
        if (e instanceof SyntaxError) return bitir(400, { hata: 'govde-bozuk' })
        console.error('[fiyat listesi] yayına alınamadı:', e)
        bitir(500, { hata: 'yazilamadi' })
      }
    })
  }
}
