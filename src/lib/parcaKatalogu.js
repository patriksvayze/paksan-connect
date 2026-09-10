import { PARCA_KATALOG } from '../config'

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

/** Bekleyen ya da tamamlanmış istek. Hata olursa temizleniyor. */
let istek = null

function kok() {
  return String(PARCA_KATALOG.kok || '').replace(/\/+$/, '')
}

function bekle(ms) {
  return new Promise((c) => setTimeout(c, ms))
}

/**
 * Katalogu getirir. Aynı oturumda ikinci çağrı ağa çıkmıyor.
 * @returns {Promise<{surum, gruplar: Array, parcalar: Array}>}
 */
export function katalogGetir() {
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
