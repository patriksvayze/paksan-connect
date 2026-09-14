/* ==========================================================================
   Duyuru hedeflemesi — kendini denetleyen kontrol

   Kimin hangi duyuruyu göreceğine karar veren mantık. Yanlış çalışırsa
   iki yönde de zarar var: kampanya izni olmayana ticari ileti gitmesi
   hukuki sorun, güvenlik uyarısının gitmemesi gerçek tehlike.

   ÇALIŞTIRMAK

     node tools/duyuru-hedef-testi.mjs
   ========================================================================== */

import assert from 'node:assert/strict'
import { duyuruGecerliMi, personelDuyurusuMu } from '../src/lib/duyuruHedef.js'

const izinli = { il: 'Konya', ilce: 'Selçuklu', onaylar: { kampanya: true } }
const izinsiz = { il: 'Konya', ilce: 'Selçuklu', onaylar: { kampanya: false } }
const ankarali = { il: 'Ankara', ilce: 'Çankaya', onaylar: { kampanya: true } }
const yurtdisi = { il: 'Konya', konumUlke: 'DE', onaylar: { kampanya: true } }
const makineler = [{ productId: 'orkinos-1270', serial: 'ORK1270-2024-00157' }]

const duyuru = { id: 'd1', tur: 'duyuru', baslik: 'Kampanya' }
const uyari = { id: 'u1', tur: 'uyari', baslik: 'Güvenlik' }
const talepBildirimi = { id: 'b1', tur: 'talep', talepNo: 'SRV1' }

let n = 0
const bak = (sonuc, beklenen, aciklama) => {
  assert.equal(sonuc, beklenen, aciklama)
  n++
}

/* 1. Ticari ileti kuralı: kampanya yalnız izin verene, uyarı herkese. */
bak(duyuruGecerliMi(duyuru, { user: izinli }), true, 'izin veren kampanyayı görür')
bak(duyuruGecerliMi(duyuru, { user: izinsiz }), false, 'izin vermeyen kampanyayı görmez')
bak(duyuruGecerliMi(uyari, { user: izinsiz }), true, 'güvenlik uyarısı izinden bağımsız')

/* 2. Talep ve numara bildirimleri ASLA süzülmüyor. `duyurular` anahtarı
      onlarla paylaşılıyor; süzülselerdi müşteri kendi talebinin
      bildirimini kaybederdi. */
bak(personelDuyurusuMu(talepBildirimi), false, 'talep bildirimi personel duyurusu değil')
bak(duyuruGecerliMi(talepBildirimi, { user: izinsiz }), true, 'talep bildirimi hep geçer')

/* 3. Yurtdışı: Türkçe duyuru gitmiyor, `dil: en` işaretli gidiyor. */
bak(duyuruGecerliMi(uyari, { user: yurtdisi, yurtdisi: true }), false, 'yurtdışına Türkçe uyarı gitmez')
bak(
  duyuruGecerliMi({ ...uyari, dil: 'en' }, { user: yurtdisi, yurtdisi: true }),
  true,
  'yurtdışına İngilizce kanal açık',
)

/* 4. Hedef yoksa sınır yok — eski duyurularla geriye uyum. */
bak(duyuruGecerliMi(duyuru, { user: ankarali }), true, 'hedefsiz duyuru herkese')

/* 5. İl hedefi. */
const konyaya = { ...duyuru, hedef: { iller: ['Konya'] } }
bak(duyuruGecerliMi(konyaya, { user: izinli }), true, 'Konyalı Konya duyurusunu görür')
bak(duyuruGecerliMi(konyaya, { user: ankarali }), false, 'Ankaralı görmez')

/* 6. İlçe hedefi. */
const meramA = { ...duyuru, hedef: { iller: ['Konya'], ilceler: ['Meram'] } }
bak(duyuruGecerliMi(meramA, { user: izinli }), false, 'Selçuklulu Meram duyurusunu görmez')

/* 7. Model hedefi: kullanıcının makinelerinden en az biri tutmalı. */
const orkinosa = { ...duyuru, hedef: { urunler: ['orkinos-1270'] } }
bak(duyuruGecerliMi(orkinosa, { user: izinli, makineler }), true, 'Orkinos sahibi görür')
bak(duyuruGecerliMi(orkinosa, { user: izinli, makineler: [] }), false, 'makinesi olmayan görmez')

/* 8. Seri numarası hedefi; tire ve büyük/küçük harf aramayı bozmamalı. */
const seriye = { ...duyuru, hedef: { seriler: ['ork1270202400157'] } }
bak(duyuruGecerliMi(seriye, { user: izinli, makineler }), true, 'seri biçimden bağımsız eşleşir')

/* 9. Servis tarafı: hedefsiz duyuru servise GİTMEZ, çünkü varsayılan
      kime 'musteri'. */
const servis = { servisId: 'konya-merkez', il: 'Konya' }
bak(duyuruGecerliMi(duyuru, { servis }), false, 'hedefsiz duyuru servise gitmez')
bak(
  duyuruGecerliMi({ ...duyuru, hedef: { kime: 'servis' } }, { servis }),
  true,
  'servislere hedeflenmiş duyuru servise gider',
)
bak(
  duyuruGecerliMi({ ...duyuru, hedef: { kime: 'servis' } }, { user: izinli }),
  false,
  'yalnız servislere olan duyuru müşteriye gitmez',
)
bak(
  duyuruGecerliMi({ ...duyuru, hedef: { kime: 'ikisi' } }, { user: izinli }),
  true,
  'ikisine de olan duyuru müşteriye gider',
)
bak(
  duyuruGecerliMi({ ...duyuru, hedef: { kime: 'servis', servisler: ['izmir'] } }, { servis }),
  false,
  'başka servise hedeflenmiş duyuru gelmez',
)

/* 10. Geri çağırma YALNIZ servise.

       Kural iki yerde birden duruyor: yayınlama ekranında alıcı
       kitlesi kilitli, burada da okuma tarafında kapı var. Buradaki
       kapı, ekranı atlayan bir kayıt için — çiftçinin telefonunda
       "makinenizi kullanmayın" penceresi açılmasın. */
const geriCagirma = { id: 'g1', tur: 'uyari', alt: 'geriCagirma', baslik: 'Geri çağırma' }
bak(duyuruGecerliMi(geriCagirma, { servis }), false, 'hedefsiz geri çağırma servise de gitmez')
bak(
  duyuruGecerliMi({ ...geriCagirma, hedef: { kime: 'servis' } }, { servis }),
  true,
  'servise hedeflenmiş geri çağırma servise gider',
)
bak(
  duyuruGecerliMi({ ...geriCagirma, hedef: { kime: 'ikisi' } }, { user: izinsiz }),
  false,
  'geri çağırma müşteriye ikisi seçilse bile gitmez',
)
bak(
  duyuruGecerliMi({ ...geriCagirma, hedef: { kime: 'musteri' } }, { user: izinli }),
  false,
  'geri çağırma müşteriye doğrudan hedeflense bile gitmez',
)

/* 11. Öteki uyarı alt türü müşteriye gitmeye devam ediyor: kapı
       yalnız geri çağırmaya konuldu. */
bak(
  duyuruGecerliMi({ ...uyari, alt: 'guvenlik' }, { user: izinsiz }),
  true,
  'güvenlik uyarısı müşteriye gider',
)

/* 12. KİŞİSEL BİLDİRİM YABANCIYA GİTMİYOR.

       `duyurular` anahtarı paylaşıldığı için süzgeç kişisel kaydı
       yalnız `musteriId` alanından tanıyordu; alansız kayıt HERKESE
       AÇIK sayılıyordu. Alıcı telefondan eşleşmediğinde (bkz. veri.js
       → bildirimAlicisi) alan boş kalıyor ve o kayıt —başkasının talep
       numarası, kargo notu, randevusu— her hesabın ekranına düşüyordu.
       `veri.js → musteriyeBildir` artık her kişisel bildirime
       `kisisel` damgası vuruyor; damga varken kimlik yoksa kayıt
       kimseye gösterilmiyor. Sahibinden saklamak, yabancıya
       göstermekten iyidir. */
const ahmet = { id: 'u-ahmet', il: 'Konya', onaylar: {} }
const mehmet = { id: 'u-mehmet', il: 'Konya', onaylar: {} }
const ahmetin = { id: 'b2', tur: 'talep', kisisel: true, musteriId: 'u-ahmet' }
const kimsesiz = { id: 'b3', tur: 'talep', kisisel: true }

bak(duyuruGecerliMi(ahmetin, { user: ahmet }), true, 'kişisel bildirim sahibine gider')
bak(duyuruGecerliMi(ahmetin, { user: mehmet }), false, 'kişisel bildirim yabancıya gitmez')
bak(duyuruGecerliMi(kimsesiz, { user: ahmet }), false, 'alıcısı çözülemeyen bildirim kimseye gitmez')
bak(duyuruGecerliMi(kimsesiz, { user: mehmet }), false, 'kimliksiz kişisel kayıt herkese açık değil')

/* Damgasız ESKİ kayıt eskisi gibi geçiyor: tek hesaplı cihazda
   üretildi, geriye uyum bozulmuyor. */
bak(duyuruGecerliMi(talepBildirimi, { user: ahmet }), true, 'damgasız eski bildirim geçmeye devam eder')

console.log(`${n} durumun hepsi doğru.`)
console.log('\nSONUÇ: duyuru hedeflemesi çalışıyor.')
