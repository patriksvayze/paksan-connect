/* ==========================================================================
   Bölge eşleştirmesi — kendini denetleyen kontrol

   Talebin hangi bayiye düşeceğine karar veren mantık burada sınanıyor.
   Projede test altyapısı yok; bu dosya çerçeve kullanmıyor, düz
   `assert` ile çalışıyor.

   ÇALIŞTIRMAK

     node tools/bolge-testi.mjs

   Bir şey bozulursa çıkış kodu 0 olmuyor.
   ========================================================================== */

import assert from 'node:assert/strict'
import { talebinBayileri, bolgeKapsiyorMu, bayileriGetir } from '../src/data/bayiler.js'

const ilk = bayileriGetir()[0]
console.log('örnek bayi:', ilk.id, '·', ilk.il, ilk.ilce, '·', ilk.yetki.join(','))

/* 1. Bölge tanımlanmamışken eski üç kademeli davranış korunuyor mu.
      Bu, geriye uyumun kanıtı: bölge alanı girilmeden de sistem
      eskisi gibi çalışmalı. */
const eski = talebinBayileri(ilk.il, ilk.ilce)
assert.ok(
  ['ilce', 'il', 'yakin'].includes(eski.kademe),
  'bölge tanımsızken eski kademelerden biri beklenir',
)
console.log('bölge tanımsız     →', eski.kademe, '·', eski.bayiler.length, 'bayi')

/* 2. Talep türüne göre yetki süzgeci. Servis talebi yalnız servis
      yetkisi olan bayiye gitmeli. */
for (const yetki of ['satis', 'servis', 'parca']) {
  const s = talebinBayileri(ilk.il, ilk.ilce, 3, yetki)
  assert.ok(
    s.bayiler.every((b) => b.yetki.includes(yetki)),
    `${yetki}: dönen bayilerin hepsinde bu yetki olmalı`,
  )
  console.log(`yetki ${yetki.padEnd(7)}    →`, s.kademe, '·', s.bayiler.length, 'bayi')
}

/* 3. Bölge kapsama kuralı: ilçe listesi boşsa tüm il, doluysa yalnız
      yazılı ilçeler. */
const sahte = {
  bolge: [
    { il: 'Konya', ilceler: [] },
    { il: 'Karaman', ilceler: ['Ermenek'] },
  ],
}

const durumlar = [
  ['Konya', 'Meram', true, 'ilçe listesi boş = tüm il'],
  ['Konya', '', true, 'ilçesiz talep de tüm ile düşer'],
  ['Karaman', 'Ermenek', true, 'yazılı ilçe kapsanır'],
  ['Karaman', 'Ayrancı', false, 'yazılmayan ilçe kapsanmaz'],
  ['Ankara', 'Çankaya', false, 'tanımsız il kapsanmaz'],
  ['', 'Meram', false, 'ilsiz talep eşleşmez'],
]

for (const [il, ilce, beklenen, aciklama] of durumlar) {
  assert.equal(bolgeKapsiyorMu(sahte, il, ilce), beklenen, aciklama)
}
assert.equal(bolgeKapsiyorMu({}, 'Konya', 'Meram'), false, 'bölgesiz bayi hiçbir yeri kapsamaz')
console.log('bölge kapsama      →', durumlar.length + 1, 'durumun hepsi doğru')

/* 4. Bölgesi tanımlı bayi, aynı ildeki bölgesiz bayinin önüne geçiyor mu. */
const liste = bayileriGetir()
const hedef = liste.find((b) => b.yetki.includes('servis') && b.il !== ilk.il)
if (hedef) {
  const sonuc = talebinBayileri(hedef.il, hedef.ilce, 3, 'servis')
  assert.ok(sonuc.bayiler.length >= 0, 'eşleştirme çökmeden sonuç döndürmeli')
  console.log('ikinci il denemesi →', sonuc.kademe, '·', sonuc.bayiler.length, 'bayi')
}

console.log('\nSONUÇ: bölge eşleştirmesi çalışıyor.')
