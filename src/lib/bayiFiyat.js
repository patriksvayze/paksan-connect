/* ==========================================================================
   Bayi fiyatı

   Liste fiyatından bayinin ödeyeceği fiyatı çıkaran tek yer. Hesabın
   birden fazla ekranda tekrarlanması, bir gün birinin güncellenip
   diğerinin unutulması demek — fiyat hatasının bedeli yüksek.

   İSKONTO NEREDEN GELİYOR

     1. Bayi kaydındaki `iskonto` (bayiden bayiye değişiyor)
     2. Yoksa `BAYI_ISKONTO` varsayılanı
     3. Ürüne bir kampanya uyuyorsa üstüne `ekIskonto` biniyor

   Kampanya iskontosu ÇARPILMIYOR, TOPLANIYOR: %18 + %5 = %23. Ticari
   hayatta iskonto böyle konuşuluyor; çarpım (%22,1) hesabı doğru
   gösterip bayiyi şaşırtırdı.

   KDV BURADA YOK. Bayi fiyatları KDV hariç konuşuluyor; KDV'yi gösteren
   ekran `KDV_ORANI` ile kendisi hesaplıyor.
   ========================================================================== */

import {
  BAYI_ISKONTO,
  KAMPANYALAR,
  MAKINE_FIYAT,
  MAKINE_FIYAT_AKTIF,
  PARCA_BAYI_ISKONTO,
} from '../marka'
import { parcaFiyatBilgisi } from '../marka'

/** Süresi geçmemiş kampanyalar. */
export function acikKampanyalar(simdi = Date.now()) {
  return KAMPANYALAR.filter((k) => !k.biter || k.biter > simdi)
}

/** Ürüne uyan kampanya; yoksa null. İlk uyan geçerli. */
export function urununKampanyasi(urunId, simdi = Date.now()) {
  return acikKampanyalar(simdi).find((k) => k.urunler.includes(urunId)) || null
}

function bayininIskontosu(bayi) {
  const oran = Number(bayi?.iskonto)
  return Number.isFinite(oran) && oran > 0 && oran < 1 ? oran : BAYI_ISKONTO
}

/**
 * Bir makinenin bayi fiyatı.
 *
 * @returns {null|{liste, tavsiye, alis, iskonto, temelIskonto, kampanya,
 *                 tedarik, teslimGun}}
 *   Fiyat listesi kapalıysa ya da ürünün fiyatı yazılmamışsa null —
 *   ekran o zaman fiyat yerine "PAKSAN'a danışın" yazıyor.
 */
export function makineFiyati(urunId, bayi, simdi = Date.now()) {
  if (!MAKINE_FIYAT_AKTIF) return null
  const kayit = MAKINE_FIYAT[urunId]
  if (!kayit) return null

  const temel = bayininIskontosu(bayi)
  const kampanya = urununKampanyasi(urunId, simdi)
  const iskonto = Math.min(0.9, temel + (kampanya?.ekIskonto || 0))

  return {
    liste: kayit.liste,
    /* Tavsiye satış fiyatı liste fiyatına eşit; ayrı alan olarak
       duruyor çünkü kampanyada ikisi ayrışabiliyor. */
    tavsiye: kayit.liste,
    alis: Math.round(kayit.liste * (1 - iskonto)),
    iskonto,
    temelIskonto: temel,
    kampanya,
    tedarik: kayit.tedarik || 'siparis',
    teslimGun: kampanya?.teslimGun ?? kayit.teslimGun ?? null,
  }
}

/**
 * Bir yedek parçanın bayi fiyatı.
 * Parça fiyatları müşteri tarafında da kullanılıyor; oradaki `fiyat`
 * tavsiye satış fiyatı, bayinin ödediği onun iskontolu hâli.
 */
export function parcaBayiFiyati(ad) {
  const bilgi = parcaFiyatBilgisi(ad)
  if (!bilgi) return null
  return {
    ...bilgi,
    tavsiye: bilgi.fiyat,
    alis: Math.round(bilgi.fiyat * (1 - PARCA_BAYI_ISKONTO)),
    iskonto: PARCA_BAYI_ISKONTO,
  }
}

/** Sipariş kalemlerinin bayiye maliyeti. */
export function siparisTutari(kalemler = [], bayi) {
  let toplam = 0
  let eksik = false

  for (const k of kalemler) {
    const adet = Math.max(1, Number(k.adet) || 1)
    const f =
      (k.tur || 'parca') === 'makine'
        ? makineFiyati(k.anahtar, bayi)
        : parcaBayiFiyati(k.anahtar)
    if (!f) {
      eksik = true
      continue
    }
    toplam += f.alis * adet
  }

  return { toplam, eksik }
}
