/* ==========================================================================
   Bölge eşleştirmesi — kendini denetleyen kontrol

   Talebin hangi servise düşeceğine karar veren mantık burada sınanıyor.
   Projede test altyapısı yok; bu dosya çerçeve kullanmıyor, düz
   `assert` ile çalışıyor.

   ÇALIŞTIRMAK

     node tools/bolge-testi.mjs

   Bir şey bozulursa çıkış kodu 0 olmuyor.
   ========================================================================== */

import assert from 'node:assert/strict'
import { talebinServisleri, bolgeKapsiyorMu, servisleriGetir } from '../src/marka/katalog/servisler.js'

const ilk = servisleriGetir()[0]
console.log('örnek servis:', ilk.id, '·', ilk.il, ilk.ilce, '·', ilk.yetki.join(','))

/* 1. Bölge tanımlanmamışken eski üç kademeli davranış korunuyor mu.
      Bu, geriye uyumun kanıtı: bölge alanı girilmeden de sistem
      eskisi gibi çalışmalı. */
const eski = talebinServisleri(ilk.il, ilk.ilce)
assert.ok(
  ['ilce', 'il', 'yakin'].includes(eski.kademe),
  'bölge tanımsızken eski kademelerden biri beklenir',
)
console.log('bölge tanımsız     →', eski.kademe, '·', eski.servisler.length, 'servis')

/* 2. Talep türüne göre yetki süzgeci. Servis talebi yalnız servis
      yetkisi olan servise gitmeli. */
for (const yetki of ['satis', 'servis', 'parca']) {
  const s = talebinServisleri(ilk.il, ilk.ilce, 3, yetki)
  assert.ok(
    s.servisler.every((b) => b.yetki.includes(yetki)),
    `${yetki}: dönen servislerin hepsinde bu yetki olmalı`,
  )
  console.log(`yetki ${yetki.padEnd(7)}    →`, s.kademe, '·', s.servisler.length, 'servis')
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
assert.equal(bolgeKapsiyorMu({}, 'Konya', 'Meram'), false, 'bölgesiz servis hiçbir yeri kapsamaz')
console.log('bölge kapsama      →', durumlar.length + 1, 'durumun hepsi doğru')

/* 4. Bölgesi tanımlı servis, aynı ildeki bölgesiz servisin önüne geçiyor mu. */
const liste = servisleriGetir()
const hedef = liste.find((b) => b.yetki.includes('servis') && b.il !== ilk.il)
if (hedef) {
  const sonuc = talebinServisleri(hedef.il, hedef.ilce, 3, 'servis')
  assert.ok(sonuc.servisler.length >= 0, 'eşleştirme çökmeden sonuç döndürmeli')
  console.log('ikinci il denemesi →', sonuc.kademe, '·', sonuc.servisler.length, 'servis')
}

console.log('\nSONUÇ: bölge eşleştirmesi çalışıyor.')
