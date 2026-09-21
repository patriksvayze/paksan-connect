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

   ESKİ LİSTE SİLİNMİYOR, ARŞİVE GİDİYOR. Fiyat tek tek değişmiyor,
   liste bütün olarak yürürlüğe giriyor; eski liste hangi siparişin
   hangi fiyattan verildiğinin kanıtı. Yürürlükteki klasör olduğu gibi
   `parca-katalogu-arsiv/<sürüm>-<zaman>/` altına taşınıyor, yeni liste
   yerine geçiyor. Kaynak PDF de listeyle birlikte saklanıyor.

   YÜRÜRLÜĞE GİRİŞ TEK HAMLEDE. Sıra şu:
     1. yeni liste yan klasöre (parca-katalogu.yeni) bütünüyle yazılır
     2. yürürlükteki liste arşive KOPYALANIR
     3. yeni görseller ve PDF yerine konur
     4. katalog.json geçici dosyadan tek bir yeniden adlandırmayla değişir
     5. eski listeye özgü görseller silinir (arşivde kopyaları var)
   Uygulamalar listeyi katalog.json'dan okuyor; o dosya değişmeden yeni
   liste yürürlüğe girmiş sayılmaz. 1. ya da 2. adımda bir şey ters
   giderse yürürlükteki listeye hiç dokunulmamış olur.

   NEDEN KLASÖR TAŞINMIYOR. İlk sürüm yürürlükteki klasörü arşive
   taşıyordu. Windows'ta geliştirme sunucusu proje klasörlerini izlediği
   için klasör taşıma izin hatası verdi (EPERM, 21 Eylül 2026 denemesi);
   dosya kopyalamak ve tek dosyayı yeniden adlandırmak her iki
   işletim sisteminde de çalışıyor.

   VERİTABANINDA KARŞILIĞI: katalog.FiyatListesi (taslak → yürürlükte →
   arşiv) ve katalog.FiyatListesiSatiri (yalnız eklenir). Sunucu
   yazıldığında bu iş o tablolara da yazacak (bkz. veritabani/tasarim.md,
   işletim tablosu 16. satır).
   ========================================================================== */

import {
  copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

const KOD = /^[0-9A-Za-z][0-9A-Za-z.]*$/
const GRUP = /^[a-z0-9][a-z0-9-]*$/
const GORSEL = /^([0-9A-Za-z][0-9A-Za-z.]*)\.(webp|png)$/

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
  const arsiv = join(kok, 'parca-katalogu-arsiv')

  let eskiSurum = 0
  try {
    eskiSurum = Number(JSON.parse(readFileSync(join(canli, 'katalog.json'), 'utf8')).surum) || 0
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
    for (const [ad, veri] of Object.entries(istek.gorseller || {})) {
      writeFileSync(join(yeni, 'gorseller', ad), Buffer.from(veri, 'base64'))
    }
    if (istek.kaynakPdf) writeFileSync(join(yeni, 'kaynak.pdf'), Buffer.from(istek.kaynakPdf, 'base64'))
    const katalog = {
      surum,
      kaynak: String(kaynak || ''),
      yayinTarihi,
      yayinlayan: String(istek.personel || ''),
      gruplar: gruplar.map((g) => ({ id: g.id, ad: g.ad, adet: parcalar.filter((p) => p.grup === g.id).length })),
      parcalar: parcalar.map((p) => ({ kod: p.kod, ad: p.ad.trim(), fiyat: p.fiyat, grup: p.grup, gorsel: p.gorsel ?? null })),
    }
    writeFileSync(join(yeni, 'katalog.json'), JSON.stringify(katalog, null, 1) + '\n', 'utf8')

    /* 2. Yürürlükteki liste arşive kopyalanıyor. */
    if (existsSync(join(canli, 'katalog.json'))) {
      const hedef = join(arsiv, `${eskiSurum}-${yayinTarihi.replace(/[:.]/g, '-')}`)
      try {
        cpSync(canli, hedef, { recursive: true })
      } catch (e) {
        rmSync(hedef, { recursive: true, force: true })
        throw e
      }
    }

    /* 3. Görseller ve PDF yerine. */
    mkdirSync(join(canli, 'gorseller'), { recursive: true })
    const yeniGorseller = new Set(readdirSync(join(yeni, 'gorseller')))
    for (const ad of yeniGorseller) {
      copyFileSync(join(yeni, 'gorseller', ad), join(canli, 'gorseller', ad))
    }
    if (existsSync(join(yeni, 'kaynak.pdf'))) {
      copyFileSync(join(yeni, 'kaynak.pdf'), join(canli, 'kaynak.pdf'))
    }

    /* 4. Liste tek hamlede yürürlüğe giriyor. */
    const gecici = join(canli, 'katalog.json.yeni')
    copyFileSync(join(yeni, 'katalog.json'), gecici)
    renameSync(gecici, join(canli, 'katalog.json'))

    /* 5. Eski listeye özgü görseller ANCAK şimdi siliniyor: önce silinse
       arada eski liste olmayan resimleri gösterirdi. Arşivde kopyaları var. */
    for (const ad of readdirSync(join(canli, 'gorseller'))) {
      if (!yeniGorseller.has(ad)) rmSync(join(canli, 'gorseller', ad), { force: true })
    }
  } finally {
    rmSync(yeni, { recursive: true, force: true })
  }

  return { surum, parca: parcalar.length, yayinTarihi }
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
