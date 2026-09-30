import { KILAVUZ } from '../config'
import { URUN_KILAVUZU } from '../marka/icerik/kilavuzEslesme'
import { load, save } from './storage'

/* ==========================================================================
   Kullanım kılavuzu PDF'leri — sunucudaki klasörden, telefonda saklanarak

   KARAR (29 Eylül 2026, kullanıcının): kılavuz, PAKSAN'ın basılı
   kılavuzunun PDF'i. Önce kılavuzun içeriği uygulamaya gömülü bir veri
   paketinden ekran ekran kuruluyordu; kullanıcı "çok karmaşık" buldu, 20
   makinenin 9'unu kapsıyordu ve her yeni baskı geliştirici işiydi. Şimdi
   PDF'ler sunucuda bir klasörde ("sunucuda kılavuzların bulunduğu bir
   klasör olsun, oradan okunsun").

   Klasörün sözleşmesi (bkz. sunucu-taklidi/BENIOKU.md):

     <kok>/kilavuzlar.json   { kilavuzlar: { <kılavuz kodu>: { dosya, ad,
                             baski, sayfa, boyut, diller, arizaSayfasi } } }
     <kok>/<dosya>           kılavuzun PDF'i

   Hangi ürünün hangi kılavuzu kullandığı markanın tablosunda
   (marka/icerik/kilavuzEslesme.js → URUN_KILAVUZU); kod iki tarafta aynı.

   TELEFONDA SAKLAMA. Çiftçi kılavuzu bir kez indiriyor, sonra tarlada
   internetsiz açıyor. Dosya tarayıcının kalıcı önbelleğinde (Cache API)
   tutuluyor: uygulama telefonda https://localhost'tan açıldığı için
   önbellek orada da var, ek eklenti gerekmiyor. Olmadığı yerde
   (geliştirme sunucusuna ağdan http ile bağlanan telefon) kılavuz her
   açılışta yeniden indiriliyor; ekran bunu söylüyor (`kalici`).

   YENİ BASKI. Dosyanın adında baskı tarihi var; yeni baskı yeni ad
   demek. Telefondaki eski baskı yeni indirilene kadar açılmaya devam
   ediyor (internet yoksa eski kılavuz, kılavuzsuzluktan iyidir), ekran
   yenisinin çıktığını söylüyor. Yenisi inince eskisi siliniyor.
   ========================================================================== */

const DEPO = 'paksan-kilavuzlar'
/* Önbellekteki her dosya hangi kılavuzun hangi baskısı olduğunu kendi
   üstünde taşıyor: eski baskıyı tanımak için. */
const KOD_BASLIGI = 'X-Kilavuz-Kod'

function kok() {
  return String(KILAVUZ.kok || '').replace(/\/+$/, '')
}

/** Telefonda kalıcı saklama var mı. */
export const kalici = typeof window !== 'undefined' && 'caches' in window

/** Ürünün kılavuz kodu; kılavuzu yoksa null. */
export function kilavuzKodu(urunId) {
  return URUN_KILAVUZU[urunId] || null
}

export function kilavuzVarMi(urunId) {
  return Boolean(kilavuzKodu(urunId))
}

/** Kılavuzun o dildeki adı; yoksa Türkçesi. */
export function kilavuzAdi(bilgi, dil) {
  return bilgi?.ad?.[dil] || bilgi?.ad?.tr || ''
}

/** "8,7 MB" — dile göre ondalık ayracıyla. */
export function boyutYaz(bayt, dil) {
  const mb = (Number(bayt) || 0) / 1048576
  return `${mb.toLocaleString(dil === 'en' ? 'en-GB' : 'tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: mb < 10 ? 1 : 0 })} MB`
}

export function dosyaAdresi(bilgi) {
  return new URL(`${kok()}/${encodeURIComponent(bilgi.dosya)}`, location.href).href
}

/* ---------------------------------------------------------------- Liste */

let listeIstegi = null

function gecerliListe(veri) {
  const liste = veri?.kilavuzlar
  if (!liste || typeof liste !== 'object') return null
  for (const b of Object.values(liste)) {
    if (!b || typeof b.dosya !== 'string' || !b.dosya.toLowerCase().endsWith('.pdf')) return null
    if (!Number.isFinite(b.sayfa) || !Number.isFinite(b.boyut)) return null
  }
  return liste
}

/**
 * Sunucudaki kılavuz listesi. Liste gelmezse (internet yok) telefondaki
 * son liste kullanılıyor; o da yoksa boş nesne döner — ekranlar kılavuzun
 * adını ve boyutunu yazamaz ama kılavuz satırları yine görünür.
 *
 * @returns {Promise<Record<string, {dosya, ad, baski, sayfa, boyut, diller, arizaSayfasi}>>}
 */
export function kilavuzListesiGetir() {
  if (listeIstegi) return listeIstegi
  listeIstegi = (async () => {
    const durdurucu = new AbortController()
    const zaman = setTimeout(() => durdurucu.abort(), KILAVUZ.listeZamanAsimi)
    try {
      const cevap = await fetch(`${kok()}/kilavuzlar.json`, { signal: durdurucu.signal, cache: 'no-cache' })
      if (!cevap.ok) throw new Error('kilavuz-liste-' + cevap.status)
      const liste = gecerliListe(await cevap.json())
      if (!liste) throw new Error('kilavuz-liste-bozuk')
      save('kilavuzListesi', liste)
      return liste
    } catch (e) {
      listeIstegi = null
      const eski = load('kilavuzListesi', null)
      if (eski) return eski
      throw e
    } finally {
      clearTimeout(zaman)
    }
  })()
  return listeIstegi
}

/** Listeyi bekletmeden: bellekteki ya da telefondaki son liste. */
export function sonKilavuzListesi() {
  return load('kilavuzListesi', null) || {}
}

/* ------------------------------------------------------------ Önbellek */

async function depo() {
  if (!kalici) return null
  try {
    return await caches.open(DEPO)
  } catch {
    return null
  }
}

/**
 * Kılavuz telefonda mı: 'kayitli' (bu baskı), 'eski' (önceki baskı
 * var, bu yok) ya da 'yok'.
 */
export async function kilavuzDurumu(kod, bilgi) {
  const d = await depo()
  if (!d || !bilgi) return 'yok'
  if (await d.match(dosyaAdresi(bilgi))) return 'kayitli'
  return (await eskiBaski(d, kod)) ? 'eski' : 'yok'
}

async function eskiBaski(d, kod) {
  for (const istek of await d.keys()) {
    const cevap = await d.match(istek)
    if (cevap?.headers.get(KOD_BASLIGI) === kod) return istek
  }
  return null
}

/** Telefondaki kılavuzun baytları: bu baskı, yoksa eskisi; yoksa null. */
export async function kayitliKilavuz(kod, bilgi) {
  const d = await depo()
  if (!d) return null
  let cevap = bilgi ? await d.match(dosyaAdresi(bilgi)) : null
  if (!cevap) {
    const eski = await eskiBaski(d, kod)
    if (eski) cevap = await d.match(eski)
  }
  return cevap ? cevap.arrayBuffer() : null
}

export async function kilavuzuSil(kod) {
  const d = await depo()
  if (!d) return
  for (const istek of await d.keys()) {
    const cevap = await d.match(istek)
    if (cevap?.headers.get(KOD_BASLIGI) === kod) await d.delete(istek)
  }
}

/* PDF mi: sunucu bir hata sayfası ya da uygulamanın kendi sayfasını
   "200" ile verebiliyor; o sayfa kılavuz diye saklanmasın. */
function pdfMi(bayt) {
  const b = new Uint8Array(bayt, 0, Math.min(5, bayt.byteLength))
  return String.fromCharCode(...b) === '%PDF-'
}

/**
 * Kılavuzu indirir, telefonda saklar; `{ bayt, kayitli }` döner. İlerleme
 * 0-1 arası bildiriliyor; `sinyal` ile vazgeçilebiliyor. `kayitli`
 * false ise kılavuz açılabiliyor ama telefonda saklanamadı (önbellek yok
 * ya da telefonun yeri dolu); ekran "kayıtlı" dememeli.
 *
 * Hata kodları: 'internet-yok', 'sunucu', 'bozuk'.
 */
export async function kilavuzuIndir(kod, bilgi, { ilerleme, sinyal } = {}) {
  let cevap
  try {
    cevap = await fetch(dosyaAdresi(bilgi), { signal: sinyal })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new Error(typeof navigator !== 'undefined' && navigator.onLine === false ? 'internet-yok' : 'sunucu')
  }
  if (!cevap.ok) throw new Error('sunucu')

  const toplam = Number(cevap.headers.get('Content-Length')) || bilgi.boyut || 0
  const parcalar = []
  let alinan = 0
  try {
    const okuyucu = cevap.body.getReader()
    for (;;) {
      const { done, value } = await okuyucu.read()
      if (done) break
      parcalar.push(value)
      alinan += value.length
      if (toplam) ilerleme?.(Math.min(1, alinan / toplam))
    }
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new Error('internet-yok')
  }
  const bayt = await new Blob(parcalar).arrayBuffer()
  if (!pdfMi(bayt)) throw new Error('bozuk')

  /* ÖNCE YENİSİ YAZILIYOR, SONRA ESKİSİ SİLİNİYOR (29 Eylül 2026, son
     inceleme). Önce eski baskı siliniyordu; telefonun yeri dolup yeni
     baskı yazılamazsa çiftçinin internetsiz okuduğu kılavuz da gidiyordu,
     ekran yine "kayıtlı" diyordu. */
  const d = await depo()
  let kayitli = false
  if (d) {
    const adres = dosyaAdresi(bilgi)
    try {
      await d.put(
        adres,
        new Response(bayt.slice(0), {
          headers: { 'Content-Type': 'application/pdf', [KOD_BASLIGI]: kod },
        }),
      )
      kayitli = true
    } catch {
      /* Telefonun yeri dolu: kılavuz açılıyor, yalnız saklanmıyor; eski
         baskı yerinde kalıyor. */
    }
    if (kayitli) {
      for (const istek of await d.keys()) {
        if (istek.url === adres) continue
        const eski = await d.match(istek)
        if (eski?.headers.get(KOD_BASLIGI) === kod) await d.delete(istek)
      }
    }
  }
  return { bayt, kayitli }
}
