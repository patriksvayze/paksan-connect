/* ==========================================================================
   Bayi stoğu — okuma ve azaltma

   Bayinin elindeki yedek parça ve makine sayısı.

   BAYİ STOĞUNU ARTIRAMAZ.

   Elindeki mal, PAKSAN'dan satın aldığı kadardır. Artış tek yoldan
   oluyor: bayi sipariş verir, PAKSAN gönderir, gönderim işaretlendiğinde
   stok artar (bkz. `bayiSiparis.js`). Bu dosyada artırma fonksiyonu
   bilerek yok.

   Önce ekran bayiye sayı kutusu veriyor ve bayi istediği sayıyı
   yazabiliyordu; stok bayinin kendi defterine dönüşüyordu. PAKSAN'ın
   gönderdiğiyle bayinin yazdığı tutmayınca rakam hiçbir şey anlatmıyor.

   AZALTMA BAYİDE. Müşteriye sattığı ya da serviste kullandığı parçayı
   bayi kendi düşüyor; bunun onaya gerek yok.

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

import { load } from './storage.js'
import { stokKullan } from './bayiSiparis.js'

const ANAHTAR = 'bayiStok'

/** Bir bayinin stok kaydı. Yoksa boş kayıt döner. */
export function stokGetir(bayiId) {
  const k = load(ANAHTAR, {})[bayiId]
  return { parca: k?.parca || {}, makine: k?.makine || {} }
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
 * Talep kapanırken gönderilen parçaları stoktan düşer.
 *
 * Girilmemiş parçaya dokunmuyor: bayi o parçayı takip etmiyor demektir,
 * eksi değere düşürmek yanlış bilgi üretir.
 *
 * Her düşüş hareket kaydına sebebiyle yazılıyor — stoğun neden
 * değiştiği sorulabilsin diye.
 */
export function stokDus(bayiId, parcalar = [], adetler = {}, talepNo, kim) {
  for (const ad of parcalar) {
    stokKullan(
      bayiId,
      { tur: 'parca', anahtar: ad, ad },
      Number(adetler[ad]) || 1,
      talepNo ? `${talepNo} · müşteriye gönderildi` : 'Müşteriye gönderildi',
      kim,
    )
  }
  return stokGetir(bayiId).parca
}
