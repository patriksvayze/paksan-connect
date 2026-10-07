/* ==========================================================================
   Yedek parça iskontosu — SERVİS TARAFI

   Servis, garanti dışı işte kullandığı parçayı PAKSAN'dan iskontolu
   alıp müşteriye satıyor. Aradaki fark servisin kalan payı.

   MAKİNE FİYATI BURADA DEĞİL

   Bu dosya bir zamanlar makine fiyat listesiydi: liste fiyatı, bayiye
   özel iskonto, kampanyalar, tedarik biçimi. Makineyi satan taraf bayi
   ve bayinin paneli yok; servis makine almıyor. Liste kaldırıldı,
   yalnız parça iskontosu kaldı.

   Makine fiyatı yeniden gerekirse (bayiye bir ekran açılırsa) buraya
   geri gelir — dosyanın adı o yüzden korundu.
   ========================================================================== */

/* Servisin yedek parçada aldığı iskonto. Parça marjı servisin garanti
   dışı işteki ana geliri.

   Servis kaydındaki `iskonto` alanı bunun üstüne yazabiliyor: hakkediş
   nakit yerine iskontolu parçayla mahsup edildiğinde oran servise göre
   değişiyor (bkz. planın 4. aşaması). */
export const PARCA_SERVIS_ISKONTO = 0.3
