/* ==========================================================================
   Servis parça fiyatı

   Liste fiyatından servisin ödeyeceği fiyatı çıkaran tek yer. Hesabın
   birden fazla ekranda tekrarlanması, bir gün birinin güncellenip
   diğerinin unutulması demek — fiyat hatasının bedeli yüksek.

   MAKİNE FİYATI ARTIK BURADA YOK

   Dosya bir zamanlar makine fiyatını da hesaplıyordu: liste fiyatı,
   satıcıya özel iskonto, kampanya, kâr. Makineyi satan tarafın
   paneli yok; servis makine almıyor, parça alıyor. Makine
   fiyat katmanı bu yüzden kaldırıldı.

   KDV BURADA YOK. Fiyatlar KDV hariç konuşuluyor; KDV'yi gösteren
   ekran `kdvTutari()` ile kendisi hesaplıyor.

   ARTIK PARÇA ADI DEĞİL, PARÇANIN KENDİSİ GİRİYOR

   Bu dosya bir dönem parça ADINA bakıp uydurma bir fiyat tablosundan
   fiyat buluyordu. O tablo 12 Eylül 2026'da kaldırıldı; fiyatın tek
   kaynağı PAKSAN'ın yedek parça kataloğu. Katalogdaki birincil anahtar
   `kod` (ad tekil değil), bu yüzden fonksiyon artık katalogdan gelen
   parça nesnesini alıyor. Eski hâli gerçek katalogun hiçbir parçasında
   çalışmıyordu: ada göre arama 538 parçanın tamamında boş dönüyordu.
   ========================================================================== */

import { PARCA_SERVIS_ISKONTO } from '../marka'

/**
 * Bir yedek parçanın servis fiyatı.
 *
 * Katalogdaki `fiyat` tavsiye satış fiyatı; servisin ödediği onun
 * iskontolu hâli. Aradaki fark servisin garanti dışı işte kalan payı.
 *
 * @param {null|{kod: string, ad: string, fiyat: number}} parca
 *   `katalogGetir()` / `parcaBul()` sonucundan gelen parça.
 * @returns {null|{kod, ad, fiyat, tavsiye, alis, iskonto}}
 *   Parça yoksa ya da fiyatı sayı değilse null.
 */
export function parcaServisFiyati(parca) {
  if (!parca || typeof parca.fiyat !== 'number' || !Number.isFinite(parca.fiyat)) {
    return null
  }
  return {
    kod: parca.kod,
    ad: parca.ad,
    fiyat: parca.fiyat,
    tavsiye: parca.fiyat,
    alis: Math.round(parca.fiyat * (1 - PARCA_SERVIS_ISKONTO)),
    iskonto: PARCA_SERVIS_ISKONTO,
  }
}
