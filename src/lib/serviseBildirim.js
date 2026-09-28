/* ==========================================================================
   Servise giden talep bildiriminin kaydı

   Servisim'e düşen talep bildirimi (Bildirimler ekranı, İşlerim'in
   üstündeki okunmamışlar, talebin içindeki geçmiş, telefon bildirimi)
   bu kayıttan okunuyor. Kaydı yazan TEK GÖVDE burası.

   NEDEN AYRI DOSYA (25 Eylül 2026, kullanıcı sınaması O5). Gövde
   backoffice/veri.js → serviseBildir'in içindeydi. Müşterinin talebine
   Connect'ten yaptığı işlem de servise bildiriliyor (lib/talepEkleme.js
   → eklemeyiServiseBildir `musteriEkledi`, sorunDevaminiServiseBildir
   `musteriSorunDevam`); Connect ise backoffice kodunu içe aktaramıyor
   (npm run dogrula 4. kontrol: backoffice kodu müşteri APK'sına
   girmez). Aynı kaydı iki yerde iki ayrı biçimde yazmak yerine gövde
   buraya taşındı; veri.js'teki serviseBildir adıyla ve imzasıyla
   yerinde duruyor, içi bunu çağırıyor.

   KAYIT BİÇİMİ DEĞİŞMEDİ. Müşteri bildirimleriyle aynı `duyurular`
   deposu (paralel depo açmak iki tarafın birbirini görmemesi demek);
   `alici: 'servis'`, `servisId`, talebin kimliği ve numarası, `olay`
   ve `degerler`. Yazının kendisi Servisim'in sözlüğünde
   (servis/talepBildirimleri.js). Ayrıntılı gerekçe veri.js →
   serviseBildir'in başında.

   Servisi olmayan talepte kayıt yazılmıyor: bildirimi okuyacak servis
   yok. Ekrana çıkan metin yok.
   ========================================================================== */

import { load, save, uid } from './storage'

/* backoffice/veri.js → ANAHTAR.duyurular ile aynı anahtar. Burada
   yeniden yazıldı, çünkü lib dosyası veri.js'i içe aktaramıyor. */
const DUYURULAR = 'duyurular'

/**
 * Servise talep bildirimi yazar.
 *
 * @param {object} talep   `servis.id`, `id`, `no` taşıyan talep
 * @param {string} olay    Servisim'in yazı sözlüğündeki olay adı
 * @param {object} degerler yazıya giren değerler (tutar, adet …)
 */
export function serviseBildirimYaz(talep, olay, degerler = {}) {
  const servisId = talep?.servis?.id
  if (!servisId) return
  save(DUYURULAR, [
    {
      id: uid(),
      tarih: Date.now(),
      tur: 'talep',
      kisisel: true,
      alici: 'servis',
      servisId,
      talepId: talep.id,
      talepNo: talep.no,
      olay,
      degerler,
    },
    ...load(DUYURULAR, []),
  ])
}
