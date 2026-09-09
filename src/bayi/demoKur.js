/* ==========================================================================
   Bayi APK'sı — demo kurulumu

   YALNIZCA TELEFONA KURULAN SÜRÜMDE ÇALIŞIR.

   Bayi panelinin verisi bugün tarayıcının kendi hafızasında duruyor.
   Telefona kurulan APK ilk açıldığında o hafıza bomboş: kayıtlı bayi
   hesabı yok, talep yok, stok yok. Giriş ekranı çıkıyor ama girilecek
   hesap bulunmuyor.

   Bu dosya, demo APK'sı ilk açıldığında hafızayı bir kez dolduruyor:

     1. Backoffice'in demo üreticisini çalıştırıyor (personel, müşteri,
        talep, duyuru)
     2. Talepleri bölgesine göre bayilere dağıtıyor — uygulamadan gelen
        gerçek taleplerde bunu AppState yapıyor, demo üreticisi yapmıyordu
     3. Bir bayiye panel hesabı açıyor
     4. O bayiye stok yazıyor

   ÜRETİMDE ÇALIŞMIYOR. Çağrı `main.jsx` içinde `demoAPKmi()` ile
   koşula bağlı; tarayıcıdan açılan panel bu dosyayı yüklemiyor bile.
   Sunucu bağlandığında dosya tamamen siliniyor.
   ========================================================================== */

import { load, save } from '../lib/storage'
import { ANAHTAR, bayiHesabiYaz, bayileriYaz } from '../backoffice/veri'
import { bayileriGetir, talebinBayileri, MARKA } from '../marka'
import { demoVarMi, demoYukle } from '../backoffice/demo'
import { PARCA_FIYAT } from '../marka'
import { PRODUCTS } from '../marka'
import { makineFiyati } from '../lib/bayiFiyat'
import { teklifAc, teklifKapat } from '../lib/bayiTeklif'
import { DEMO_HESAP } from './demoKimlik'

/** Hesabı açılan bayi (bkz. src/data/bayiler.js). */
const DEMO_BAYI = 'konya-merkez'

/* Talep türü ile bayi yetkisi eşlemesi — AppState.jsx'teki tablonun
   aynısı. Orası dışa aktarmıyor; iki satırlık tablo için o dosyayı
   değiştirmek yerine burada tekrarlandı. */
const TUR_YETKI = { servis: 'servis', parca: 'parca', satinalma: 'satis' }

const KAPALI = ['kapandi', 'iptal']

/* Bayinin ekranında en az bu kadar açık iş görünsün. Bölge eşleşmesi bu
   sayıyı tutturamazsa başka bayilerin taleplerinden tamamlanıyor. */
const EN_AZ_ACIK_IS = 6

export async function demoKur() {
  /* Hesap zaten varsa kurulum bir kez yapılmış demektir. Her açılışta
     tekrarlanırsa bayinin kendi kayıtları üstüne yazılır. */
  if (bayileriGetir().some((b) => b.kullanici === DEMO_HESAP.kullanici)) return

  if (!demoVarMi()) await demoYukle()

  talepleriDagit()
  await hesapAc()
  stokYaz()
  teklifYaz()
}

/* ---------------------------------------------------------- Talep dağıtımı */

function talepleriDagit() {
  const demoBayi = bayileriGetir().find((b) => b.id === DEMO_BAYI)
  const bayiAdi = demoBayi?.ad || `${MARKA} Bayisi`

  let liste = load(ANAHTAR.demoTalepler, []).map((t) => {
    if (t.bayi) return t
    const es = talebinBayileri(t.il, t.ilce, 1, TUR_YETKI[t.tur] || 'satis')
    const b = es?.bayiler?.[0]
    if (!b) return t
    return {
      ...t,
      bayi: { id: b.id, ad: b.ad, kademe: es.kademe, tarih: t.createdAt },
      sahip: 'bayi',
    }
  })

  const bende = (t) => t.bayi?.id === DEMO_BAYI
  const acik = (t) => !KAPALI.includes(t.status)

  const eksik = EN_AZ_ACIK_IS - liste.filter((t) => bende(t) && acik(t)).length
  if (eksik > 0) {
    /* Önce bayinin kendi ilinden alınıyor. Konya bayisinin ekranında
       Antalya işinin görünmesi, demoyu inceleyen kişiye ekranın
       yanlış olduğu izlenimini verir. */
    const secilen = new Set(
      liste
        .filter((t) => !bende(t) && acik(t))
        .sort((a, b) => (a.il === demoBayi?.il ? 0 : 1) - (b.il === demoBayi?.il ? 0 : 1))
        .slice(0, eksik)
        .map((t) => t.id),
    )
    liste = liste.map((t) =>
      secilen.has(t.id)
        ? {
            ...t,
            bayi: { id: DEMO_BAYI, ad: bayiAdi, kademe: 'il', tarih: t.createdAt },
            sahip: 'bayi',
          }
        : t,
    )
  }

  save(ANAHTAR.demoTalepler, bugunRandevusu(liste, bende, acik))
}

/* Ana ekrandaki "Bugün" bloğunun dolu görünmesi için bir randevu
   bugüne çekiliyor. Demo üreticisi tarihleri rastgele dağıtıyor;
   hepsinin geçmişe düşmesi mümkün ve o zaman blok boş bir cümleye
   iniyor — anlatmak istediği şeyi anlatmıyor. */
function bugunRandevusu(liste, bende, acik) {
  const hedef = liste.find((t) => bende(t) && acik(t) && t.tur === 'servis')
  if (!hedef) return liste

  const bugun = new Date()
  bugun.setHours(10, 0, 0, 0)
  const zaman = bugun.getTime()

  return liste.map((t) =>
    t.id === hedef.id
      ? {
          ...t,
          plan: {
            ...(t.plan || {}),
            tarih: zaman,
            tarihYazi: bugun.toLocaleString('tr-TR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            gorusuldu: true,
            kayitTarihi: t.createdAt,
          },
        }
      : t,
  )
}

/* ------------------------------------------------------------------ Hesap */

async function hesapAc() {
  const sonuc = await bayiHesabiYaz(DEMO_BAYI, DEMO_HESAP, 'Demo')
  if (sonuc.hata) return

  /* İlk girişte şifre belirleme adımı demo APK'sında atlanıyor: burada
     şifreyi PAKSAN yetkilisi değil, uygulamanın kendisi belirledi. */
  bayileriYaz(
    bayileriGetir().map((b) =>
      b.id === DEMO_BAYI ? { ...b, ilkGiris: false } : b,
    ),
    'Demo',
    'Demo bayi hesabı hazırlandı',
  )
}

/* -------------------------------------------------------------------- Stok */

const PARCA_ADET = [12, 8, 5, 3, 20, 2]
const MAKINE_ADET = [2, 1, 1]

function stokYaz() {
  const parca = {}
  Object.keys(PARCA_FIYAT)
    .slice(0, PARCA_ADET.length)
    .forEach((ad, i) => {
      parca[ad] = PARCA_ADET[i]
    })

  const makine = {}
  PRODUCTS.slice(0, MAKINE_ADET.length).forEach((u, i) => {
    makine[u.id] = MAKINE_ADET[i]
  })

  save('bayiStok', { ...load('bayiStok', {}), [DEMO_BAYI]: { parca, makine } })
}

/* ---------------------------------------------------------------- Teklif

   Demo teklif kaydı olmadan iki ekran birden boş açılıyordu: bayinin
   "Açık Teklifler" bölümü ve PAKSAN'ın "Bayi Teklifleri" ekranı. İkisi
   de teklif–satış oranını anlatmak için var; boş hâlleriyle ne
   yaptıklarını anlatmıyorlar.

   Beş kayıt üretiliyor. İkisi açık — biri süresi dolmak üzere, biri
   dolmuş — ki bayi ekranındaki hatırlatma çalışsın. Üçü kapalı ve
   sonuçları farklı; PAKSAN'ın model dökümünde satışa dönüş oranı
   böylece bir sayı veriyor.

   Tarihler kaydedildikten SONRA geriye çekiliyor: `teklifAc` her zaman
   "şimdi"yi yazıyor ve süresi dolmuş bir teklif başka türlü
   üretilemiyor. */
const DEMO_TEKLIF = [
  { urun: 0, gun: 15, gecen: 13, durum: 'acik' },
  { urun: 1, gun: 15, gecen: 18, durum: 'acik' },
  { urun: 0, gun: 15, gecen: 40, durum: 'satis', not: 'Peşin ödeme yaptı.' },
  { urun: 0, gun: 15, gecen: 60, durum: 'rakip', not: 'Rakip 200.000 TL daha düşük fiyat verdi.' },
  { urun: 2, gun: 15, gecen: 75, durum: 'vazgecti', not: 'Bu sezon almaktan vazgeçti.' },
]

const GUN = 86400000

function teklifYaz() {
  const bayi = bayileriGetir().find((b) => b.id === DEMO_BAYI)
  if (!bayi) return

  /* Bayinin kendi ilindeki müşteriler önce. Konya bayisinin
     Diyarbakır'daki çiftçiye teklif vermesi demoyu inceleyen kişiye
     ekranın yanlış olduğu izlenimini verir. */
  const hepsi = load(ANAHTAR.demoMusteriler, [])
  const musteriler = [
    ...hepsi.filter((m) => m.il === bayi.il),
    ...hepsi.filter((m) => m.il !== bayi.il),
  ]
  if (!musteriler.length) return

  const oturum = { bayiId: DEMO_BAYI, il: bayi.il, iskonto: bayi.iskonto }

  DEMO_TEKLIF.forEach((d, i) => {
    const urun = PRODUCTS[d.urun]
    const musteri = musteriler[i % musteriler.length]
    const fiyat = makineFiyati(urun.id, oturum)
    if (!fiyat) return

    const sonuc = teklifAc({
      bayiId: DEMO_BAYI,
      bayiAd: bayi.ad,
      bayiNo: bayi.no,
      musteriId: musteri.id,
      ad: musteri.ad,
      tel: musteri.tel,
      il: musteri.il || bayi.il,
      ilce: musteri.ilce || bayi.ilce,
      kalemler: [
        {
          urunId: urun.id,
          ad: urun.name,
          adet: 1,
          birimFiyat: fiyat.liste,
          listeFiyat: fiyat.liste,
          alisFiyat: fiyat.alis,
        },
      ],
      gecerlilikGun: d.gun,
    })
    if (sonuc.hata) return

    if (d.durum !== 'acik') {
      teklifKapat(sonuc.teklif.id, d.durum, bayi.ad, d.not || '')
    }

    /* Tarihleri geriye çek. Kapanış tarihi de teklifin kendi
       tarihiyle geçerlilik tarihi arasında kalmalı, yoksa kayıt
       "kapandıktan sonra verilmiş" görünüyor. */
    const tarih = Date.now() - d.gecen * GUN
    save(
      'bayiTeklif',
      load('bayiTeklif', []).map((t) =>
        t.id === sonuc.teklif.id
          ? {
              ...t,
              tarih,
              gecerlilik: tarih + d.gun * GUN,
              kapanis: t.kapanis
                ? { ...t.kapanis, tarih: tarih + Math.min(d.gun, 5) * GUN }
                : null,
            }
          : t,
      ),
    )
  })
}
