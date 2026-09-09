/* ==========================================================================
   Servis parça fiyatı

   Liste fiyatından servisin ödeyeceği fiyatı çıkaran tek yer. Hesabın
   birden fazla ekranda tekrarlanması, bir gün birinin güncellenip
   diğerinin unutulması demek — fiyat hatasının bedeli yüksek.

   MAKİNE FİYATI ARTIK BURADA YOK

   Dosya bir zamanlar makine fiyatını da hesaplıyordu: liste fiyatı,
   bayiye özel iskonto, kampanya, kâr. Makineyi satan taraf bayi ve
   bayinin paneli yok; servis makine almıyor, parça alıyor. Makine
   fiyat katmanı bu yüzden kaldırıldı.

   KDV BURADA YOK. Fiyatlar KDV hariç konuşuluyor; KDV'yi gösteren
   ekran `KDV_ORANI` ile kendisi hesaplıyor.
   ========================================================================== */

import { PARCA_SERVIS_ISKONTO, parcaFiyatBilgisi } from '../marka'

/**
 * Bir yedek parçanın servis fiyatı.
 *
 * Parça fiyatları müşteri tarafında da kullanılıyor; oradaki `fiyat`
 * tavsiye satış fiyatı, servisin ödediği onun iskontolu hâli. Aradaki
 * fark servisin garanti dışı işte kalan payı.
 *
 * @returns {null|{fiyat, kod, tavsiye, alis, iskonto}}
 *   Parçanın fiyatı yazılmamışsa null.
 */
export function parcaServisFiyati(ad) {
  const bilgi = parcaFiyatBilgisi(ad)
  if (!bilgi) return null
  return {
    ...bilgi,
    tavsiye: bilgi.fiyat,
    alis: Math.round(bilgi.fiyat * (1 - PARCA_SERVIS_ISKONTO)),
    iskonto: PARCA_SERVIS_ISKONTO,
  }
}
