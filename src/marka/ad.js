/* ==========================================================================
   MARKA ADI VE TÜRKÇE EKLERİ

   NEDEN GEREKLİ

   Ekran metinlerinde firma adı çekimli geçiyor: "PAKSAN'a Sipariş Ver",
   "PAKSAN'a Devret", "PAKSAN'ın attığı adımlar", "PAKSAN'da".
   Adı sabit yazmak yerine değişkene almak yetmiyor — Türkçede ek, adın
   son ünlüsüne ve son harfine göre değişiyor:

     PAKSAN'a   ama   ACME'ye
     PAKSAN'dan ama   ACME'den
     PAKSAN'ın  ama   ACME'nin
     PAKSAN'da  ama   TÜRKÖZ'de

   Yeni firmanın adı yazıldığında bütün ekranların bozulmaması için ek
   hesaplanıyor, elle yazılmıyor.

   ÖZEL ADA EK KESME İŞARETİYLE GELİYOR — yazım kuralı bu.

   KULLANIM

     markaEk('a')    → "PAKSAN'a"     yönelme
     markaEk('dan')  → "PAKSAN'dan"   ayrılma
     markaEk('da')   → "PAKSAN'da"    bulunma
     markaEk('in')   → "PAKSAN'ın"    tamlayan
     markaEk('i')    → "PAKSAN'ı"     belirtme
     MARKA           → "PAKSAN"       eksiz

   SINIR: Kısaltma gibi okunan adlarda (TSE, KOSGEB) ek, okunuşa göre
   gelir ve bu kural harften çıkarılamaz. Böyle bir ad kullanılacaksa
   `kisaAd` yerine okunuşuna uyan bir yazım seçilmeli.
   ========================================================================== */

import { SIRKET, UYGULAMA } from './kimlik.js'

export const MARKA = SIRKET.kisaAd

const KALIN = 'aıouAIOU'
const INCE = 'eiöüEİÖÜ'
const YUVARLAK = 'ouöüOUÖÜ'
const UNLU = KALIN + INCE
/* Sert ünsüzler — ayrılma ve bulunma ekleri bunlardan sonra
   sertleşiyor: MERKEZ'den ama SANTEK'ten. */
const SERT = 'pçtkfhsşPÇTKFHSŞ'

function sonUnlu(ad) {
  for (let i = ad.length - 1; i >= 0; i--) {
    if (UNLU.includes(ad[i])) return ad[i]
  }
  return 'a' /* Ünlüsü yoksa kalın varsayılıyor. */
}

function sonHarf(ad) {
  const temiz = ad.trim()
  return temiz[temiz.length - 1] || ''
}

/**
 * Verilen ada Türkçe hâl eki ekler. Marka adı için `markaEk()` kullanılır;
 * bu hâli dışarıya açıktır çünkü kuralın sınanabilmesi için birden çok ad
 * gerekiyor (bkz. tools/marka-ek-testi.mjs).
 *
 * @param {string} ad
 * @param {'a'|'dan'|'da'|'in'|'i'} hal
 * @returns {string} "PAKSAN’a" gibi
 */
export function ekle(ad, hal) {
  const u = sonUnlu(ad)
  const kalin = KALIN.includes(u)
  const yuvarlak = YUVARLAK.includes(u)
  const son = sonHarf(ad)
  const unluyleBitiyor = UNLU.includes(son)
  const sertle = SERT.includes(son)

  let ek
  switch (hal) {
    /* Yönelme: Ünlüyle bitiyorsa araya y giriyor (ACME'ye). */
    case 'a':
      ek = (unluyleBitiyor ? 'y' : '') + (kalin ? 'a' : 'e')
      break

    /* Ayrılma ve bulunma: Sert ünsüzden sonra d → t. */
    case 'dan':
      ek = (sertle ? 't' : 'd') + (kalin ? 'an' : 'en')
      break
    case 'da':
      ek = (sertle ? 't' : 'd') + (kalin ? 'a' : 'e')
      break

    /* Tamlayan: Ünlüyle bitiyorsa araya n giriyor (ACME'nin). */
    case 'in':
      ek =
        (unluyleBitiyor ? 'n' : '') +
        (kalin ? (yuvarlak ? 'un' : 'ın') : yuvarlak ? 'ün' : 'in')
      break

    /* Belirtme: Ünlüyle bitiyorsa araya y giriyor (ACME'yi). */
    case 'i':
      ek =
        (unluyleBitiyor ? 'y' : '') +
        (kalin ? (yuvarlak ? 'u' : 'ı') : yuvarlak ? 'ü' : 'i')
      break

    default:
      return ad
  }

  return `${ad}’${ek}`
}

/**
 * Marka adına Türkçe hâl eki ekler.
 *
 * @param {'a'|'dan'|'da'|'in'|'i'} hal
 * @returns {string} "PAKSAN’a" gibi
 */
export function markaEk(hal) {
  return ekle(MARKA, hal)
}

/**
 * Uygulama adına Türkçe hâl eki ekler: "PAKSAN Connect’te kayıtlı değil",
 * "PAKSAN Connect’i indirin". Marka adından ayrıdır çünkü uygulama adının
 * son hecesi başka: PAKSAN kalın biterken Connect ince ve sert bitiyor.
 *
 * @param {'a'|'dan'|'da'|'in'|'i'} hal
 * @returns {string} "PAKSAN Connect’te" gibi
 */
export function uygulamaEk(hal) {
  return ekle(UYGULAMA, hal)
}
