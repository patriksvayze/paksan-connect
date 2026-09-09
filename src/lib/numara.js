/* ==========================================================================
   Kayıt numaraları

   Müşteri, servis, geri bildirim ve personel kayıtlarının her birinin
   telefonda okunabilir bir numarası var. Amaç, telefonda konuşurken
   "hangi kayıt" sorusunun tek cümlede cevaplanabilmesi:

       MST000148   müşteri
       SRV014      servis
       BAY003      bayi
       GBD000032   geri bildirim
       PRS007      personel

   Numara bitişik yazılıyor: telefonda okurken ve Excel'de ararken tire
   fazladan iş çıkarıyor.

   Talep numaraları burada değil, `talep.js` içinde üretiliyor; onlar
   tarih de taşıyor (SRV2608184821). Aynı önek iki yerde geçiyor ama
   karışmıyor: kayıt numarası üç haneli ve tarihsiz (SRV014), talep
   numarası tarihli ve uzun.

   Sayaç telefonun/tarayıcının hafızasında tutuluyor. Sunucu geldiğinde
   numarayı sunucu verecek — iki cihazın aynı numarayı üretmemesi için
   bu şart. O gün değişecek tek yer bu dosya.
   ========================================================================== */

import { load, save } from './storage'

const SAYAC = 'sayaclar'

export const NUMARA_TURU = {
  musteri: { onek: 'MST', hane: 6 },
  servis: { onek: 'SRV', hane: 3 },
  bayi: { onek: 'BAY', hane: 3 },
  geribildirim: { onek: 'GBD', hane: 6 },
  personel: { onek: 'PRS', hane: 3 },
}

/** Sıradaki numarayı üretir ve sayacı bir artırır. */
export function yeniNo(tur) {
  const bicim = NUMARA_TURU[tur]
  if (!bicim) return ''

  const sayaclar = load(SAYAC, {})
  const sira = (sayaclar[tur] || 0) + 1
  save(SAYAC, { ...sayaclar, [tur]: sira })

  return bicim.onek + String(sira).padStart(bicim.hane, '0')
}

/** Sayacı en az bu değerden devam ettirir (hazır listeleri içeri alırken). */
export function sayaciEnAz(tur, deger) {
  const sayaclar = load(SAYAC, {})
  if ((sayaclar[tur] || 0) >= deger) return
  save(SAYAC, { ...sayaclar, [tur]: deger })
}
