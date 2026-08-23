/* ==========================================================================
   Veri okuma kancası

   Şu an veri tarayıcının hafızasında; okuma anında bitiyor. Sunucu
   geldiğinde aynı okuma ağ üzerinden gelecek ve bir süre bekleyecek.

   Ekranlar o günü beklemesin diye bütün okumalar bu kancadan geçiyor:
   `yukleniyor` bilgisi şimdiden var, ekranlar bekleme iskeletini
   şimdiden gösteriyor. Sunucuya geçildiğinde ekranlarda değişiklik
   gerekmiyor — `veri.js` içindeki fonksiyonlar Promise döndürmeye
   başlayınca bu kanca onu da karşılıyor.
   ========================================================================== */

import { useEffect, useState } from 'react'

/**
 * @param {Function} oku veriyi döndüren fonksiyon (değer veya Promise)
 * @param {Array} bagimliliklar değişince yeniden okunur
 * @param {*} baslangic ilk okuma bitene kadar dönecek değer
 */
export function useVeri(oku, bagimliliklar = [], baslangic = null) {
  const [durum, setDurum] = useState({ veri: baslangic, yukleniyor: true, hata: null })

  useEffect(() => {
    let gecerli = true
    setDurum((d) => ({ ...d, yukleniyor: true }))

    Promise.resolve()
      .then(oku)
      .then((veri) => {
        if (gecerli) setDurum({ veri, yukleniyor: false, hata: null })
      })
      .catch((e) => {
        if (gecerli) setDurum({ veri: baslangic, yukleniyor: false, hata: e })
      })

    return () => {
      gecerli = false
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, bagimliliklar)

  return durum
}
