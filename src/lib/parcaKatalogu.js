import { PARCA_KATALOG } from '../config'
import { kdvTutari, PARCA_GRUBU_AILESI, PARCASIZ_AILELER } from '../marka'
import { load } from './storage'

/* ==========================================================================
   YEDEK PARÇA KATALOĞU — uzaktan çağrılıyor

   Katalog uygulamanın içinde DEĞİL. 538 parça, 35 alt montaj ve 2 MB
   görsel; ayrıca fiyatlar değişiyor. Gerekçenin tamamı
   `src/config.js` → PARCA_KATALOG başlığında.

   BU DOSYA TEK KAPI. Ekranlar katalogun nereden geldiğini bilmiyor:
   bugün geliştirme sunucusundan, yarın PAKSAN'ın sunucusundan
   geliyor. Değişecek olan tek şey `PARCA_KATALOG.kok`.

   OTURUM BOYUNCA BİR KEZ İNİYOR

   Servis parça seçerken gruplar arasında geziyor; her geçişte 86 KB
   liste indirmek tarlada zayıf şebekede işkence olurdu. İlk çağrıdan
   sonra sonuç bellekte duruyor.

   BEKLEYEN İSTEK DE PAYLAŞILIYOR: iki ekran aynı anda isterse tek
   istek atılıyor. Söz (Promise) saklanıyor, sonuç değil — ikinci
   çağrı birincinin cevabını bekliyor.

   HATA BELLEKTE KALMIYOR. İstek başarısız olursa saklanan söz
   siliniyor; "Yeniden dene" düğmesi gerçekten yeniden deniyor,
   ekrandaki hatayı tekrar göstermiyor.
   ========================================================================== */

/* ==========================================================================
   PAKSAN'IN KENDİ DÜZELTMELERİ

   Katalog PAKSAN'ın bastığı fiyat listesinden üretiliyor ve o listede
   yanlış yazılmış bir parça adı ya da yanlış gruba düşmüş bir parça
   olabiliyor. Bunu düzeltmek için yeni liste beklenmiyor: personel
   backoffice'teki Yedek Parça Kataloğu ekranından düzeltiyor
   (bkz. backoffice/ekranlar/ParcaKatalogu.jsx).

   DÜZELTME KATALOĞUN ÜSTÜNE BİNİYOR, İÇİNE YAZILMIYOR. Asıl katalog
   dosyası olduğu gibi duruyor; düzeltmeler ayrı bir kayıtta ve okuma
   sırasında uygulanıyor. Sebebi: yeni fiyat listesi geldiğinde asıl
   dosya bütünüyle değişiyor, düzeltmeler ise parça koduna bağlı
   kaldığı için hayatta kalıyor.

   FİYAT BURADAN DEĞİŞMİYOR. Düzeltme yalnız ad, grup ve "listede
   görünmesin" işaretini taşıyor. Fiyat tek tek değiştirilseydi altı ay
   sonra hangi tutarın ne zaman geçerli olduğu çıkarılamazdı; fiyat
   ancak yeni bir liste sürümüyle bütün olarak değişiyor.

   Bayi ve servis listelerindeki kalıbın aynısı (bkz. lib/icerikDeposu.js):
   bugün tarayıcının deposunda, sunucu geldiğinde yalnız bu dosyanın içi
   değişecek.
   ========================================================================== */

const DUZELTME_ANAHTARI = 'panelIcerik'
const DUZELTME_BOLUMU = 'parcaDuzeltme'

/** Personelin yaptığı düzeltmeler: `{ [parça kodu]: {ad, grup, gizli} }` */
export function katalogDuzeltmeleri() {
  const v = load(DUZELTME_ANAHTARI, {})?.[DUZELTME_BOLUMU]
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

/**
 * Düzeltmeleri katalogun üstüne bindirir ve grup sayaçlarını yeniden
 * hesaplar. Düzeltme yoksa katalog olduğu gibi dönüyor — tek bir nesne
 * bile kopyalanmıyor.
 */
export function duzeltmeleriUygula(katalog, duzeltmeler = katalogDuzeltmeleri()) {
  const kodlar = Object.keys(duzeltmeler || {})
  if (!katalog || !kodlar.length) return katalog

  const parcalar = []
  for (const p of katalog.parcalar || []) {
    const d = duzeltmeler[p.kod]
    if (!d) {
      parcalar.push(p)
      continue
    }
    /* "Gizli" parça listeden tamamen çıkıyor: fiyat listesinde duran ama
       artık satılmayan parçayı müşteriye göstermemenin yolu bu. */
    if (d.gizli) continue
    parcalar.push({
      ...p,
      ad: typeof d.ad === 'string' && d.ad.trim() ? d.ad.trim() : p.ad,
      grup: typeof d.grup === 'string' && d.grup ? d.grup : p.grup,
    })
  }

  /* Grup sayacı türetilmiş bir değer; parça gizlenince ya da başka
     gruba taşınınca ekranda yanlış sayı görünmesin. */
  const sayim = new Map()
  for (const p of parcalar) sayim.set(p.grup, (sayim.get(p.grup) || 0) + 1)
  const gruplar = (katalog.gruplar || []).map((g) => ({
    ...g,
    adet: sayim.get(g.id) || 0,
  }))

  return { ...katalog, parcalar, gruplar }
}

/** Bekleyen ya da tamamlanmış istek. Hata olursa temizleniyor. */
let istek = null

function kok() {
  return String(PARCA_KATALOG.kok || '').replace(/\/+$/, '')
}

function bekle(ms) {
  return new Promise((c) => setTimeout(c, ms))
}

/**
 * PAKSAN'ın bastığı katalog, düzeltmeler UYGULANMADAN. Backoffice'teki
 * düzeltme ekranı asıl değerle düzeltilmiş değeri yan yana gösterebilsin
 * diye ayrı duruyor; başka hiçbir ekran bunu çağırmamalı.
 *
 * @returns {Promise<{surum, gruplar: Array, parcalar: Array}>}
 */
export function katalogHamGetir() {
  if (istek) return istek

  istek = (async () => {
    const durdurucu = new AbortController()
    const zamanlayici = setTimeout(
      () => durdurucu.abort(),
      PARCA_KATALOG.zamanAsimi,
    )

    try {
      const cevap = await fetch(`${kok()}/katalog.json`, {
        signal: durdurucu.signal,
      })
      if (!cevap.ok) throw new Error('katalog-' + cevap.status)
      const veri = await cevap.json()
      if (!Array.isArray(veri?.parcalar) || !veri.parcalar.length) {
        throw new Error('katalog-bos')
      }
      /* Grup listesi de zorunlu: ekran grupları gezerek çalışıyor,
         gruplar boş gelirse kullanıcı boş ekran görür. */
      if (!Array.isArray(veri?.gruplar) || !veri.gruplar.length) {
        throw new Error('katalog-gruplar-bos')
      }
      /* Alanı eksik parça ekranda sessiz '—' olarak görünür; fiyatı
         eksik parça ise müşteriye eksik tutar söyletir. Erken patlat. */
      const bozuk = veri.parcalar.find(
        (p) =>
          !p ||
          typeof p.kod !== 'string' || !p.kod ||
          typeof p.ad !== 'string' || !p.ad ||
          typeof p.grup !== 'string' || !p.grup ||
          typeof p.fiyat !== 'number' || !Number.isFinite(p.fiyat),
      )
      if (bozuk) throw new Error('katalog-eksik-alan')

      /* Sunucu hızını taklit eden gecikme; sunucu açıldığında sıfır
         olacak (bkz. config.js). */
      if (PARCA_KATALOG.taklitGecikme > 0) {
        await bekle(PARCA_KATALOG.taklitGecikme)
      }
      return veri
    } finally {
      clearTimeout(zamanlayici)
    }
  })()

  istek.catch(() => {
    istek = null
  })
  return istek
}

/**
 * Ekranların çağırdığı asıl kapı: katalog + personelin düzeltmeleri.
 *
 * Düzeltmeler HER ÇAĞRIDA yeniden biniyor, önbelleğe alınmıyor. Sebebi:
 * personel backoffice'te bir adı düzelttiğinde aynı oturumda açılan
 * ekranın onu görmesi gerekiyor; ağa yeniden çıkmaya ise gerek yok.
 * Denetimler ham dosyada koşuyor (yukarıda), yani bozuk bir katalog
 * düzeltmeyle gizlenemiyor.
 *
 * @returns {Promise<{surum, gruplar: Array, parcalar: Array}>}
 */
export async function katalogGetir() {
  return duzeltmeleriUygula(await katalogHamGetir())
}

/** Parça görselinin adresi. Görseli olmayan parçada null. */
export function gorselAdresi(gorsel) {
  return gorsel ? `${kok()}/gorseller/${gorsel}` : null
}

/** Bir alt montajın parçaları, listedeki sırasıyla. */
export function grubunParcalari(katalog, grupId) {
  return (katalog?.parcalar || []).filter((p) => p.grup === grupId)
}

/* Kod ya da ad içinde arama.

   538 parçada 35 grubu tek tek gezmek, kodu bilen bir servis için
   gereksiz yol. Grup seçimi asıl akış olarak duruyor; arama onun
   kestirmesi.

   Türkçe küçültme `toLocaleLowerCase('tr-TR')` ile: "İĞNE" ile "iğne"
   ancak böyle eşleşiyor. */
export function parcaAra(katalog, sorgu) {
  const q = String(sorgu || '').trim().toLocaleLowerCase('tr-TR')
  if (q.length < 2) return []
  return (katalog?.parcalar || []).filter(
    (p) =>
      p.ad.toLocaleLowerCase('tr-TR').includes(q) ||
      p.kod.toLocaleLowerCase('tr-TR').includes(q),
  )
}

/** Yalnız sınama ve ekran geçişleri için: belleği boşaltır. */
export function katalogUnut() {
  istek = null
}

/**
 * Kodu verilen parça; yoksa null.
 *
 * Birincil anahtar `kod`. Parça ADI tekil değil (katalogda 6 tekrar
 * eden ad var), o yüzden ada göre arama yapan bir eşleme yazılmamalı.
 */
export function parcaBul(katalog, kod) {
  if (!kod) return null
  const aranan = String(kod)
  return (katalog?.parcalar || []).find((p) => p.kod === aranan) || null
}

/** Katalogdaki alt montaj listesi, fiyat listesindeki sırasıyla. */
export function gruplarListesi(katalog) {
  return katalog?.gruplar || []
}

/**
 * Bir makine ailesinin parça grupları.
 *
 * Makine ailesi `supportGroup()` çıktısıdır (balya · rulo · yem ·
 * silaj · cayir · toprak · genel). Eşleme `src/marka/katalog/
 * parcaGruplari.js` içinde; katalogda makine alanı olmadığı için
 * köprü oradan geliyor.
 *
 * `ayriListeVar` false dönen ailelerde (rulo, silaj, toprak) PAKSAN'ın
 * fiyat listesinde hiç parça yok. O durumda ekran kataloğun tamamını
 * göstermeli — parça isteme yolu kapanmamalı.
 *
 * @returns {{ayriListeVar: boolean, gruplar: Array}}
 */
export function destekGrubununGruplari(katalog, destekGrubu) {
  const hepsi = gruplarListesi(katalog)
  if (!destekGrubu || PARCASIZ_AILELER.includes(destekGrubu)) {
    return { ayriListeVar: false, gruplar: hepsi }
  }
  const kendi = hepsi.filter((g) => PARCA_GRUBU_AILESI[g.id] === destekGrubu)
  if (!kendi.length) return { ayriListeVar: false, gruplar: hepsi }
  return { ayriListeVar: true, gruplar: kendi }
}

/**
 * Seçilen parçaların tutarı — kod üzerinden, gerçek katalogdan.
 *
 * Eski sistem parça ADINI anahtar olarak kullanıyordu ve fiyatlar
 * uydurmaydı; ikisi de kaldırıldı. Artık anahtar kod, kaynak katalog.
 *
 * @param {Object} katalog katalogGetir() sonucu
 * @param {Array<{kod: string, adet: number}>} secimler
 * @returns {{satirlar, araToplam, kdv, toplam, eksikFiyat}}
 *   `eksikFiyat` — kodu katalogda bulunmayan seçim var mı. Varsa ekran
 *   "toplam" değil "hesaplanan kısım" demeli, yoksa müşteri eksik para
 *   gönderir.
 */
export function parcaToplami(katalog, secimler = []) {
  const satirlar = []
  let araToplam = 0
  let eksikFiyat = false

  for (const secim of secimler) {
    const kod = secim?.kod
    const adet = Math.max(1, Number(secim?.adet) || 1)
    const parca = parcaBul(katalog, kod)

    if (!parca) {
      eksikFiyat = true
      satirlar.push({ kod, ad: secim?.ad || kod, adet, parca: null, tutar: null })
      continue
    }

    const tutar = parca.fiyat * adet
    araToplam += tutar
    satirlar.push({ kod: parca.kod, ad: parca.ad, adet, parca, tutar })
  }

  const kdv = kdvTutari(araToplam)
  return { satirlar, araToplam, kdv, toplam: araToplam + kdv, eksikFiyat }
}

/**
 * Talep kaydına yazılacak fiyat anlık görüntüsü.
 *
 * Fiyat listesi değişiyor. Müşteri bugünkü tutarı havale ediyor; altı
 * ay sonra aynı talebe bakan personel o günün fiyatını görmemeli.
 * Bu yüzden satırlar, katalog sürümü ve kaynağı kaydın İÇİNE yazılıyor
 * ve rapor ile backoffice canlı fiyata değil bu görüntüye bakıyor.
 */
export function fiyatGoruntusu(katalog, secimler = []) {
  const hesap = parcaToplami(katalog, secimler)
  return {
    surum: katalog?.surum ?? null,
    kaynak: katalog?.kaynak || null,
    satirlar: hesap.satirlar.map((r) => ({
      kod: r.kod, ad: r.ad, adet: r.adet,
      birimFiyat: r.parca ? r.parca.fiyat : null,
      tutar: r.tutar,
    })),
    araToplam: hesap.araToplam,
    kdv: hesap.kdv,
    toplam: hesap.toplam,
    eksikFiyat: hesap.eksikFiyat,
  }
}
