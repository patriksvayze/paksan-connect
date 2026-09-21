/* ==========================================================================
   Kişi adının yazım biçimi — "onur GÖKAY" → "Onur Gökay"

   KULLANICININ İSTEĞİ (21 Eylül 2026): Servisim'in elle kayıt ekranında
   müşterinin adı büyük-küçük harfe dikkat edilmeden yazılsa da kayda
   "Onur Gökay" biçiminde geçmeli. Aynı kişi bir kayıtta "ONUR GÖKAY",
   ötekinde "onur gökay" diye durunca listeler dağınık görünüyor ve
   backoffice'te arayan personel aynı kişiyi iki kişi sanıyor.

   TÜRKÇE KURALLA: `toLocaleUpperCase('tr-TR')`. Düz `toUpperCase()`
   "i"yi "I" yapar ("İsmail" → "Ismail"); Türkçede "i"nin büyüğü "İ",
   "ı"nın büyüğü "I".

   Her kelimenin ilk harfi büyük, kalanı küçük. Tireli adlarda tirenin
   ardındaki harf de büyük ("ayşe-nur" → "Ayşe-Nur"). Fazla boşluklar
   teke iniyor. */

const TR = 'tr-TR'

const kelime = (k) => k.charAt(0).toLocaleUpperCase(TR) + k.slice(1).toLocaleLowerCase(TR)

/** @param {string} ad kullanıcının yazdığı ad @returns {string} */
export function adBicimle(ad) {
  return String(ad || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((k) => k.split('-').map(kelime).join('-'))
    .join(' ')
}
