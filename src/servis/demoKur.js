/* ==========================================================================
   Servis APK'sı — demo kurulumu

   YALNIZCA TELEFONA KURULAN SÜRÜMDE ÇALIŞIR.

   Servis panelinin verisi bugün tarayıcının kendi hafızasında duruyor.
   Telefona kurulan APK ilk açıldığında o hafıza bomboş: kayıtlı servis
   hesabı yok, talep yok, stok yok. Giriş ekranı çıkıyor ama girilecek
   hesap bulunmuyor.

   Bu dosya, demo APK'sı ilk açıldığında hafızayı bir kez dolduruyor:

     1. Backoffice'in demo üreticisini çalıştırıyor (personel, müşteri,
        talep, duyuru)
     2. Talepleri bölgesine göre servislere dağıtıyor — uygulamadan gelen
        gerçek taleplerde bunu AppState yapıyor, demo üreticisi yapmıyordu
     3. Bir servise panel hesabı açıyor
     4. O servise stok yazıyor

   ÜRETİMDE ÇALIŞMIYOR. Çağrı `main.jsx` içinde `demoAPKmi()` ile
   koşula bağlı; tarayıcıdan açılan panel bu dosyayı yüklemiyor bile.
   Sunucu bağlandığında dosya tamamen siliniyor.
   ========================================================================== */

import { load, save } from '../lib/storage'
import { ANAHTAR, servisHesabiYaz, servisleriYaz } from '../backoffice/veri'
import { servisleriGetir, talebinServisleri, MARKA } from '../marka'
import { demoVarMi, demoYukle } from '../backoffice/demo'
import { DEMO_HESAP } from './demoKimlik'

/** Hesabı açılan servis (bkz. src/marka/katalog/servisler.js). */
const DEMO_SERVIS = 'konya-servis'

/* Talep türü ile servis hizmeti eşlemesi — AppState.jsx'teki tablonun
   aynısı. Orası dışa aktarmıyor; iki satırlık tablo için o dosyayı
   değiştirmek yerine burada tekrarlandı. */
const TUR_HIZMET = { servis: 'servis', parca: 'parca' }

const KAPALI = ['kapandi', 'iptal']

/* Servisin ekranında en az bu kadar açık iş görünsün. Bölge eşleşmesi
   bu sayıyı tutturamazsa başka servislerin taleplerinden
   tamamlanıyor. */
const EN_AZ_ACIK_IS = 6

export async function demoKur() {
  /* Hesap zaten varsa kurulum bir kez yapılmış demektir. Her açılışta
     tekrarlanırsa servisin kendi kayıtları üstüne yazılır. */
  if (servisleriGetir().some((b) => b.kullanici === DEMO_HESAP.kullanici)) return

  if (!demoVarMi()) await demoYukle()

  talepleriDagit()
  await hesapAc()
}

/* ---------------------------------------------------------- Talep dağıtımı */

function talepleriDagit() {
  const demoServis = servisleriGetir().find((b) => b.id === DEMO_SERVIS)
  const servisAdi = demoServis?.ad || `${MARKA} Servisi`

  let liste = load(ANAHTAR.demoTalepler, []).map((t) => {
    if (t.servis) return t
    const gerekenHizmet = TUR_HIZMET[t.tur]
    if (!gerekenHizmet) return t
    const es = talebinServisleri(t.il, t.ilce, 1, gerekenHizmet)
    const b = es?.servisler?.[0]
    if (!b) return t
    return {
      ...t,
      servis: { id: b.id, ad: b.ad, tel: b.tel || '', tarih: t.createdAt },
      sahip: 'servis',
    }
  })

  const bende = (t) => t.servis?.id === DEMO_SERVIS
  const acik = (t) => !KAPALI.includes(t.status)
  /* Fiyat teklifi servise atanmıyor; tamamlama sırasında da
     seçilmemeli (bkz. TUR_HIZMET). */
  const atanabilir = (t) => Boolean(TUR_HIZMET[t.tur])

  const eksik = EN_AZ_ACIK_IS - liste.filter((t) => bende(t) && acik(t)).length
  if (eksik > 0) {
    /* Önce servisin kendi ilinden alınıyor. Konya servisinin ekranında
       Antalya işinin görünmesi, demoyu inceleyen kişiye ekranın
       yanlış olduğu izlenimini verir. */
    const secilen = new Set(
      liste
        .filter((t) => !bende(t) && acik(t) && atanabilir(t))
        .sort((a, b) => (a.il === demoServis?.il ? 0 : 1) - (b.il === demoServis?.il ? 0 : 1))
        .slice(0, eksik)
        .map((t) => t.id),
    )
    liste = liste.map((t) =>
      secilen.has(t.id)
        ? {
            ...t,
            servis: { id: DEMO_SERVIS, ad: servisAdi, tarih: t.createdAt },
            sahip: 'servis',
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
  const sonuc = await servisHesabiYaz(DEMO_SERVIS, DEMO_HESAP, 'Demo')
  if (sonuc.hata) return

  /* İlk girişte şifre belirleme adımı demo APK'sında atlanıyor: burada
     şifreyi PAKSAN yetkilisi değil, uygulamanın kendisi belirledi. */
  servisleriYaz(
    servisleriGetir().map((b) =>
      b.id === DEMO_SERVIS ? { ...b, ilkGiris: false } : b,
    ),
    'Demo',
    'Demo servis hesabı hazırlandı',
  )
}

/* STOK DEMOSU KALDIRILDI. Servisin elindeki parça sayısı artık
   tutulmuyor; gerekçesi ekranlar/Parca.jsx başında. */

