/* ==========================================================================
   Servis stoku — okuma ve azaltma

   Servisin elindeki yedek parça ve makine sayısı.

   SERVİS STOKUNU ARTIRAMAZ.

   Elindeki mal, PAKSAN'dan satın aldığı kadardır. Artış tek yoldan
   oluyor: servis sipariş verir, PAKSAN gönderir, gönderim işaretlendiğinde
   stok artar (bkz. `servisSiparis.js`). Bu dosyada artırma fonksiyonu
   bilerek yok.

   Önce ekran servise sayı kutusu veriyor ve servis istediği sayıyı
   yazabiliyordu; stok servisin kendi defterine dönüşüyordu. PAKSAN'ın
   gönderdiğiyle servisin yazdığı tutmayınca rakam hiçbir şey anlatmıyor.

   AZALTMA SERVİSTE. Müşteriye sattığı ya da serviste kullandığı parçayı
   servis kendi düşüyor; bunun için onaya gerek yok.

   ENGELLEME YOK

   Stok sıfır ya da hiç girilmemişse ekran bunu yazıyor ama düğmeleri
   kapatmıyor. Servisi kendi stok kaydının doğruluğuna hapsetmek, ilk
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
import { stokKullan } from './servisSiparis.js'

const ANAHTAR = 'servisStok'

/** Bir servisin stok kaydı. Yoksa boş kayıt döner. */
export function stokGetir(servisId) {
  const k = load(ANAHTAR, {})[servisId]
  return { parca: k?.parca || {}, makine: k?.makine || {} }
}

/**
 * Bu parçadan stokta kaç adet var?
 * Hiç girilmemişse `null` dönüyor — "sıfır" ile "bilinmiyor" farklı
 * şeyler ve ekran ikisini ayrı yazıyor.
 */
export function parcaAdedi(servisId, parcaAdi) {
  const s = stokGetir(servisId)
  const v = s.parca[parcaAdi]
  return v === undefined ? null : Number(v) || 0
}

/**
 * Talep kapanırken gönderilen parçaları stoktan düşer.
 *
 * Girilmemiş parçaya dokunmuyor: servis o parçayı takip etmiyor demektir,
 * eksi değere düşürmek yanlış bilgi üretir.
 *
 * Her düşüş hareket kaydına sebebiyle yazılıyor — stokun neden
 * değiştiği sorulabilsin diye.
 */
export function stokDus(
  servisId,
  parcalar = [],
  adetler = {},
  talepNo,
  kim,
  /* Hareket kaydına yazılacak sebep. Varsayılan yedek parça
     gönderimi; servis kapanışı kendi sebebini veriyor ("serviste
     kullanıldı"). Stok neden değişti sorusunun cevabı bu alan. */
  sebep = 'Müşteriye gönderildi',
) {
  for (const ad of parcalar) {
    stokKullan(
      servisId,
      { tur: 'parca', anahtar: ad, ad },
      Number(adetler[ad]) || 1,
      talepNo ? `${talepNo} · ${sebep}` : sebep,
      kim,
      /* Talepten gelen düşüş stok ekranından geri ALINAMIYOR: talep
         kapandı ve "gönderildi" diyor. Gerekçesi servisSiparis.js'te. */
      'talep',
    )
  }
  return stokGetir(servisId).parca
}
