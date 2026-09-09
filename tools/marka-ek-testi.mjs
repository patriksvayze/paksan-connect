/* ==========================================================================
   Türkçe hâl eki kuralının sınanması

     node tools/marka-ek-testi.mjs

   Bu kural, kod içinde tek başına duran ve dallanan bir mantık. Yanlış
   çalıştığında hata vermiyor — ekranda bozuk Türkçe çıkıyor ("ACME'a
   Sipariş Ver") ve kimse fark etmeyebiliyor. O yüzden burada sabit
   örneklerle karşılaştırılıyor.

   Örnekler gerçek firma adı biçimlerinden seçildi: kalın ünlüyle biten,
   ince ünlüyle biten, sert ünsüzle biten, ünlüyle biten, yuvarlak
   ünlülü.
   ========================================================================== */

import { ekle } from '../src/marka/ad.js'

const ORNEKLER = [
  /* ad,        a,           dan,            da,           in,            i */
  ['PAKSAN', 'PAKSAN’a', 'PAKSAN’dan', 'PAKSAN’da', 'PAKSAN’ın', 'PAKSAN’ı'],
  ['ACME', 'ACME’ye', 'ACME’den', 'ACME’de', 'ACME’nin', 'ACME’yi'],
  ['SANTEK', 'SANTEK’e', 'SANTEK’ten', 'SANTEK’te', 'SANTEK’in', 'SANTEK’i'],
  ['TÜRKÖZ', 'TÜRKÖZ’e', 'TÜRKÖZ’den', 'TÜRKÖZ’de', 'TÜRKÖZ’ün', 'TÜRKÖZ’ü'],
  ['ORHAN', 'ORHAN’a', 'ORHAN’dan', 'ORHAN’da', 'ORHAN’ın', 'ORHAN’ı'],
  ['TOPRAK', 'TOPRAK’a', 'TOPRAK’tan', 'TOPRAK’ta', 'TOPRAK’ın', 'TOPRAK’ı'],
  ['ÖZGÜR', 'ÖZGÜR’e', 'ÖZGÜR’den', 'ÖZGÜR’de', 'ÖZGÜR’ün', 'ÖZGÜR’ü'],
  ['DEMİRAY', 'DEMİRAY’a', 'DEMİRAY’dan', 'DEMİRAY’da', 'DEMİRAY’ın', 'DEMİRAY’ı'],
]

const HALLER = ['a', 'dan', 'da', 'in', 'i']

let sorun = 0
for (const [ad, ...beklenen] of ORNEKLER) {
  HALLER.forEach((hal, i) => {
    const cikan = ekle(ad, hal)
    if (cikan !== beklenen[i]) {
      console.log(`  ! ${ad} + ${hal}: "${cikan}" bekleniyordu "${beklenen[i]}"`)
      sorun++
    }
  })
}

if (sorun) {
  console.log(`\n${sorun} sapma bulundu.`)
  process.exit(1)
}
console.log(`${ORNEKLER.length * HALLER.length} örneğin tamamı doğru.`)
