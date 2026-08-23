/* ==========================================================================
   İşlem kaydı — uygulama tarafı

   Backoffice’te personelin yaptığı her iş kaydediliyor. Ama kaydın işe
   yaraması için müşterinin yaptıkları da aynı yerde olmalı: "talep ne
   zaman geldi, kim ne zaman baktı" sorusu tek listede cevaplanabilsin.

   Bu dosya uygulamadan çıkan olayları aynı deftere yazıyor. Personel
   alanına "Uygulama" yazılıyor; kaydı bir kişi değil müşterinin
   hareketi oluşturuyor.

   Backoffice’in `veri.js` dosyasındaki `islemYaz` ile aynı deftere yazıyor;
   ikisi ayrı dosya çünkü uygulama backoffice’in kodunu içeri almıyor
   (APK'nın içine backoffice kodu girmesin).
   ========================================================================== */

import { load, save, uid } from './storage'

const ANAHTAR = 'islemKaydi'
const KAYNAK = 'Uygulama'

/**
 * @param {string} tur işlem türü — backoffice’te süzgeçte görünüyor
 * @param {string} ozet tek satırlık açıklama, aranabilir olmalı
 */
export function uygulamaKaydi(tur, ozet) {
  const kayit = {
    id: uid(),
    tarih: Date.now(),
    tur,
    ozet,
    personel: KAYNAK,
    rol: null,
  }
  save(ANAHTAR, [kayit, ...load(ANAHTAR, [])].slice(0, 500))
  return kayit
}
