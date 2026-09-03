/* ==========================================================================
   Bayi stoğu

   Bayinin elindeki yedek parça ve makine sayısı. Bayinin KENDİ ticari
   bilgisi; PAKSAN backoffice'inde gösterilmiyor, bayiden PAKSAN'a
   raporlanması da istenmiyor.

   NE İŞE YARIYOR

   Yedek parça talebi geldiğinde bayi "bu parça bende var mı" sorusunu
   panelde görüyor. Stokta varsa gönderiyor, yoksa PAKSAN'dan destek
   istiyor.

   ENGELLEME YOK

   Stok sıfır ya da hiç girilmemişse ekran bunu yazıyor ama düğmeleri
   kapatmıyor. Bayiyi kendi stok kaydının doğruluğuna hapsetmek, ilk
   yanlış sayımda paneli kullanılmaz yapardı. Sayı bir bilgi, kilit
   değil.

   BİÇİM

     {
       'konya-merkez': {
         parca:  { 'Rulman': 12, 'Kayış': 0 },
         makine: { 'orkinos-1270': 2 },
       }
     }

   Parça anahtarı `src/data/parcaFiyat.js` içindeki TÜRKÇE ad — talep
   kaydına giden değerin ta kendisi, böylece eşleştirme doğrudan
   kuruluyor. Makine anahtarı `src/data/products.js` içindeki `id`.

   Sunucu geldiğinde bu dosyanın içi sunucu çağrısıyla değişecek.
   ========================================================================== */

import { load, save } from './storage.js'

const ANAHTAR = 'bayiStok'

function tumu() {
  return load(ANAHTAR, {})
}

/** Bir bayinin stok kaydı. Yoksa boş kayıt döner. */
export function stokGetir(bayiId) {
  const k = tumu()[bayiId]
  return { parca: k?.parca || {}, makine: k?.makine || {} }
}

/** Bayinin stok kaydını topluca yazar. */
export function stokYaz(bayiId, stok) {
  const hepsi = tumu()
  save(ANAHTAR, {
    ...hepsi,
    [bayiId]: { parca: stok.parca || {}, makine: stok.makine || {} },
  })
}

/**
 * Parça adı için stokta kaç adet var?
 * Hiç girilmemişse `null` dönüyor — "sıfır" ile "bilinmiyor" farklı
 * şeyler ve ekran ikisini ayrı yazıyor.
 */
export function parcaAdedi(bayiId, parcaAdi) {
  const s = stokGetir(bayiId)
  const v = s.parca[parcaAdi]
  return v === undefined ? null : Number(v) || 0
}

/**
 * Gönderilen parçaları stoktan düşer.
 * Girilmemiş parçaya dokunmuyor: bayi o parçayı takip etmiyor demektir,
 * eksi değere düşürmek yanlış bilgi üretir.
 */
export function stokDus(bayiId, parcalar = [], adetler = {}) {
  const s = stokGetir(bayiId)
  const yeni = { ...s.parca }
  for (const ad of parcalar) {
    if (yeni[ad] === undefined) continue
    const dusulecek = Number(adetler[ad]) || 1
    yeni[ad] = Math.max(0, Number(yeni[ad]) - dusulecek)
  }
  stokYaz(bayiId, { ...s, parca: yeni })
  return yeni
}
