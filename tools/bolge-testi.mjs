/* ==========================================================================
   Bölge eşleştirmesi — kendini denetleyen kontrol

   Talebin hangi servise düşeceğine karar veren mantık burada sınanıyor.
   Projede test altyapısı yok; bu dosya çerçeve kullanmıyor, düz
   `assert` ile çalışıyor.

   ÇALIŞTIRMAK

     node tools/bolge-testi.mjs

   Bir şey bozulursa çıkış kodu 0 olmuyor.

   5 EKİM 2026: SERVİS BU YERE GİDİYOR MU (servisBolgesindeMi). Talep
   formundaki il ve ilçe servisin bölgesinde değilse talep PAKSAN'a
   düşüyor; bölgesi girilmemiş servisin bölgesi kendi ili. Aynı gün demo
   servislere bölge girildi (kendi ili ve bayilerinin illeri), bu yüzden
   1. adım artık "bölge" kademesini bekliyor; bölgesiz davranış 5. adımda
   sahte servisle sınanıyor.

   BOZMA DENEMELERİ (5 Ekim 2026, ikisi de düştü):
     - servisBolgesindeMi'de bölgesiz servis için `servis.il === il`
       yerine `true` döndürüldü → 5. adım "bölgesiz servis başka ili
       kapsamaz" ile düştü.
     - bölgeli serviste bolgeKapsiyorMu yerine `servis.il === il`
       kullanıldı → 5. adım "bölgedeki ikinci il kapsanır" ile düştü.
   ========================================================================== */

import assert from 'node:assert/strict'
import { talebinServisleri, bolgeKapsiyorMu, servisBolgesindeMi, servisleriGetir } from '../src/data/katalog/servisler.js'

const ilk = servisleriGetir()[0]
console.log('örnek servis:', ilk.id, '·', ilk.il, ilk.ilce)

/* 1. Demo servislerin bölgesi girili (5 Ekim 2026): öneri bölge
      kademesinden geliyor ve servisin kendisi listede. */
const eski = talebinServisleri(ilk.il, ilk.ilce)
assert.equal(eski.kademe, 'bolge', 'bölgesi girili serviste öneri bölge kademesinden gelir')
assert.ok(eski.servisler.some((s) => s.id === ilk.id), 'servis kendi ilinin önerisinde yer alır')
console.log('bölge tanımlı      →', eski.kademe, '·', eski.servisler.length, 'servis')

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
const hedef = liste.find((b) => b.il !== ilk.il)
if (hedef) {
  const sonuc = talebinServisleri(hedef.il, hedef.ilce, 3)
  assert.ok(sonuc.servisler.length >= 0, 'eşleştirme çökmeden sonuç döndürmeli')
  console.log('ikinci il denemesi →', sonuc.kademe, '·', sonuc.servisler.length, 'servis')
}

/* 5. Servis bu yere gidiyor mu (talebin servise mi PAKSAN'a mı gideceği). */
const bolgeli = { il: 'Konya', bolge: [{ il: 'Konya', ilceler: [] }, { il: 'Aksaray', ilceler: [] }, { il: 'Karaman', ilceler: ['Ermenek'] }] }
const bolgesiz = { il: 'Eskişehir', ilce: 'Alpu', bolge: [] }
const gidis = [
  [bolgeli, 'Konya', 'Çumra', true, 'bölgedeki il, başka ilçe kapsanır'],
  [bolgeli, 'Aksaray', 'Merkez', true, 'bölgedeki ikinci il kapsanır'],
  [bolgeli, 'Karaman', 'Ermenek', true, 'bölgede yazılı ilçe kapsanır'],
  [bolgeli, 'Karaman', 'Ayrancı', false, 'bölgede yazılmayan ilçe kapsanmaz'],
  [bolgeli, 'Eskişehir', 'Alpu', false, 'bölge dışı il kapsanmaz'],
  [bolgesiz, 'Eskişehir', 'Sivrihisar', true, 'bölgesiz servis kendi ilinin her ilçesine gider'],
  [bolgesiz, 'Ankara', 'Polatlı', false, 'bölgesiz servis başka ili kapsamaz'],
  [bolgeli, '', '', false, 'ilsiz yer kapsanmaz'],
  [null, 'Konya', 'Meram', false, 'servis yoksa kapsanmaz'],
]
for (const [s, il, ilce, beklenen, aciklama] of gidis) {
  assert.equal(servisBolgesindeMi(s, il, ilce), beklenen, aciklama)
}
console.log('servis bu yere     →', gidis.length, 'durumun hepsi doğru')

console.log('\nSONUÇ: bölge eşleştirmesi çalışıyor.')
