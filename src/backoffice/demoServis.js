import { uid } from '../lib/storage'
import { RANDEVU_ISI, talepNo } from '../lib/talep'
import { fiyatGoruntusu, katalogGetir } from '../lib/parcaKatalogu'
import { bugunGirdi, gunlukRandevu } from '../lib/tarih'
import { elleIsinAtamasi } from '../lib/servisAtama'
import { makineDurumAdi } from '../data/talepAlanlari'
import {
  ASAMA,
  GARANTI_DISI_OZET,
  iscilikAlanlari,
  kaydiCozume,
  kaydiDogrula,
  kapininSonucu,
} from '../lib/servisKaydi'
import { kdvTutari } from '../marka'
import { servisinTarifesi } from './veri'
import { ARIZA_VAKALARI, parcaliSonucYazisi, tespitYazisi } from './demoMakineAilesi'

/* ==========================================================================
   Demo verisi — servis akışı

   Servis talebinin bugünkü yolu birkaç adımdan geçiyor ve demo verisi
   hepsini göstermeli: randevu, PAKSAN'dan destek isteme, garanti işinde
   parça isteme, parçanın gönderilmesi, iş bitince onay, onaylanan işin
   servisin hesabına yazılması, kabul edilmeyen iş
   (bkz. lib/servisKaydi.js başı).

   Önceki demo servis talebini PAKSAN'ın elle kapattığı eski biçimde
   üretiyordu: servis kaydı, onay bekleyen iş, parça masası ve servisin
   hesabı boş kalıyordu. Sunumda bu ekranların hiçbiri gösterilemiyordu.

   KAYITLAR GERÇEK HESAPLARDAN GEÇİYOR. Kaydın talebe yazılacak hâli
   `kaydiCozume` ve `kapininSonucu` ile çıkarılıyor, `kaydiDogrula` ile
   sınanıyor — servis uygulamasının kullandığı hesapların aynısı. Demo
   kendi biçimini uydursaydı ekranlar gerçekte hiç oluşmayacak bir kaydı
   gösterirdi.

   SAHNE SERVİSİ

   Servis uygulamasının demo hesabı tek bir servise açılıyor
   (bkz. servis/demoKur.js). O servisin ekranında her durumdan en az bir
   iş olmalı; rastgele dağıtım bunu garanti etmiyordu. `SAHNE_GOREVLERI`
   o servisin işlerini tek tek sayıyor. Müşterileri de kendi ilinden:
   Konya servisinin listesinde Antalya işi, demoyu inceleyen kişiye
   ekranın yanlış olduğunu düşündürür.

   PARÇALAR KATALOGDAN — YEDEK TABLO YOK

   Demo verisindeki her parça, servis uygulamasının parça seçtiği
   yerden — PAKSAN'ın fiyat listesinden — geliyor: gerçek kod, gerçek
   ad, gerçek fiyat (bkz. lib/parcaKatalogu.js).

   Katalog uygulamanın içinde değil, sunucudan iniyor. Eskiden
   inmediğinde uydurma bir fiyat tablosuna düşülüyordu; demo o zaman
   hiç var olmayan kodlarla doluyor ve demoyu inceleyen kişiye yanlış
   bir fiyat listesi gösteriyordu. Sessizce yanlış veri üretmek,
   veri üretmemekten kötüdür: yedek tablo kaldırıldı. Katalog
   gelmezse demo verisi hiç kurulmuyor (bkz. demo.js → demoYukle).

   FİYAT KAYDIN İÇİNDE DURUYOR

   Parça talebi, açıldığı günün fiyat görüntüsünü kendi içinde
   taşıyor (`parcaFiyat`). Fiyat listesi değişiyor; altı ay sonra
   aynı talebe bakan personel o günün rakamını görmemeli. Demo da
   aynı biçimi yazıyor, yoksa backoffice ekranları demo kaydıyla
   gerçek kaydı ayrı ayrı okumak zorunda kalırdı.

   MAKİNEYE UYAN KAYIT (25 Eylül 2026, kullanıcı sınaması)

   Arıza, tespit, yapılan iş ve parça makineye bakmadan ayrı ayrı
   rastgele çekiliyordu: rotovatörde "düğüm atmıyor", Süper 8002E'de
   Yunus parçası, garantisi bitmiş makinede garanti kaydı. Şimdi talebin
   arıza vakası ve makinesi demo.js'te birlikte seçiliyor (bkz.
   demoMakineAilesi.js); servis akışı o vakadan yürüyor. Kaydın nedeni
   talebin kendi açıklaması (Servisim'in kayıt ekranı da oradan okuyor),
   parça vakanın gruplarından ve makinenin modeline göre süzülmüş
   katalogdan, tespit ve sonuç seçilen parçanın adıyla, hizmet ücreti
   servisin ve modelin o günkü tarifesinden (veri.js → servisKaydiGonder
   ile aynı). Servisim'in randevusu gerçekteki gibi yalnız gün
   (`saatBelirtildi: false`); elle açılan işe makinenin servisi başkaysa
   `atamaDisi` yazılıyor (lib/elleTalep.js ile aynı kural). Hesap
   hareketleri talep kimliğini taşıyor: demo temizlenirken bağlı satır
   bulunabilsin (bkz. demo.js → demoTemizle).
   ========================================================================== */

/** Servis uygulamasının demo hesabının açıldığı servis. */
export const DEMO_SERVIS = 'konya-servis'

/* Sahne servisinin müşterileri: demo müşteri listesinin ilk sekizi bu
   ilçelerden açılıyor. */
export const SAHNE_MUSTERI = 8
export const SAHNE_YERLERI = [
  ['Konya', 'Selçuklu'], ['Konya', 'Karatay'], ['Konya', 'Meram'], ['Konya', 'Çumra'],
  ['Konya', 'Ereğli'], ['Konya', 'Cihanbeyli'], ['Konya', 'Sarayönü'], ['Konya', 'Kulu'],
]

/* Sahne servisinin işleri. `yas` talebin kaç gün önce açıldığı.

   Her satır servis uygulamasında görünen bir hâl:
     yeni          Yeni bölümü; biri 48 saati geçmiş, biri PAKSAN'ın
                   notuyla, biri dükkâna gelen müşteri için elle açılmış
     planlandi     Devam Eden; biri bugün (Bugün bloğu dolsun)
     devir         servis PAKSAN'dan destek istedi
     parcaIstendi  garanti işi, parça istendi, henüz gönderilmedi
     parcaYolda    parça gönderildi, takip numarası daha girilmedi
     parcaGeldi    parça takip numarasıyla yolda, "Parçayı Taktım" açık
     onay…         iş bitti, onay bekliyor (parçalı ve parçasız)
     onaylandi     hesaba yazıldı; dördü farklı tarihlerde
     reddedildi    kabul edilmedi, gerekçesiyle
     garantiDisi   garanti dışı yapıldı, servis kaydı açılmadan kapandı
     iptal         PAKSAN iptal etti

   GARANTİ DIŞI İKİ SAHNE KALDIRILDI (15 Eylül 2026). "parcaIste"
   (parçayı PAKSAN göndersin) ve "eldeParca" (parçayı ben taktım)
   servis kaydının garanti dışı kapılarıydı; servis kaydı artık yalnız
   garanti işi için (bkz. lib/servisKaydi.js başı). Demo bugünkü akışı
   gösteriyor: garanti dışı iş kayıtsız kapanıyor. */
export const SAHNE_GOREVLERI = [
  { durum: 'yeni', senaryo: 'yeni', yas: 0.1 },
  { durum: 'yeni', senaryo: 'yeni', yas: 2.6 },
  { durum: 'yeni', senaryo: 'yeni', yas: 0.8, serviseNot: 'Müşteri sabah dokuzdan önce aranmak istiyor.' },
  { durum: 'yeni', senaryo: 'yeni', yas: 0.3, elle: true },
  { durum: 'planlandi', senaryo: 'planlandi', yas: 1.5, bugun: true },
  { durum: 'planlandi', senaryo: 'planlandi', yas: 1, gun: 2 },
  { durum: 'incelemede', senaryo: 'devir', yas: 4 },
  { durum: 'parcaBekliyor', senaryo: 'parcaIstendi', yas: 0.6 },
  {
    durum: 'parcaBekliyor',
    senaryo: 'parcaYolda',
    yas: 2,
    serviseNot: 'Parça kargoya verildi. Takip numarası gelince buraya yazacağız.',
  },
  { durum: 'parcaBekliyor', senaryo: 'parcaGeldi', yas: 5 },
  { durum: 'onayBekliyor', senaryo: 'onayParcali', yas: 9 },
  { durum: 'onayBekliyor', senaryo: 'onayParcasiz', yas: 3 },
  { durum: 'kapandi', senaryo: 'onaylandi', yas: 7 },
  { durum: 'kapandi', senaryo: 'onaylandi', yas: 16, servistenNot: 'Müşteriye sezon sonu bakımı hatırlatıldı.' },
  { durum: 'kapandi', senaryo: 'onaylandi', yas: 29 },
  { durum: 'kapandi', senaryo: 'onaylandi', yas: 44 },
  { durum: 'kapandi', senaryo: 'reddedildi', yas: 21 },
  { durum: 'kapandi', senaryo: 'garantiDisi', yas: 12 },
  { durum: 'kapandi', senaryo: 'garantiDisi', yas: 33, elle: true },
  { durum: 'iptal', senaryo: 'iptal', yas: 10 },
]

/* ------------------------------------------------------------ Malzemeler */

const KARGO = ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo', 'Sürat Kargo']

/* Arıza, tespit ve yapılan iş metinleri artık makinenin ailesinden
   (bkz. demoMakineAilesi.js → ARIZA_VAKALARI). Randevunun "ne
   yapılacak"ı Servisim'deki gibi türden (lib/talep.js → RANDEVU_ISI). */

const RED_NEDEN = [
  'Arıza kullanım hatasından kaynaklanıyor. Bu nedenle garanti dışı.',
  'Aynı arıza için geçen ay ödeme yapıldı. Kayıt ikinci kez gönderilmiş.',
]

/* Makineden bağımsız iki neden: şanzıman ya da sensör her makinede yok. */
const DEVIR_NEDEN = [
  'Arızanın kaynağını bulamadık, üreticinin teknik desteği gerekiyor.',
  'Tamir için atölyemizde gerekli ekipman yok.',
]

const IPTAL_NEDEN = ['Müşteri vazgeçti', 'Ulaşılamadı']

/* ----------------------------------------------------------- Yardımcılar */

function sec(dizi) {
  return dizi[Math.floor(Math.random() * dizi.length)]
}

function tamsayi(enAz, enCok) {
  return enAz + Math.floor(Math.random() * (enCok - enAz + 1))
}

function secBirkac(dizi, enAz, enCok) {
  const adet = tamsayi(enAz, enCok)
  const kopya = [...dizi]
  const sonuc = []
  for (let i = 0; i < adet && kopya.length; i++) {
    sonuc.push(kopya.splice(Math.floor(Math.random() * kopya.length), 1)[0])
  }
  return sonuc
}

/* Talebin açılışıyla bugün arasına sıralı adım tarihleri. Adımlar
   arası en çok 18 saat; aralık dar gelirse sıkıştırılıyor. Her adım
   bir öncekinden sonra geliyor — geçmiş sütunu ters sıralı
   görünmesin. */
function zamanlar(bas, adet) {
  const son = Date.now() - 60000
  const adim = Math.min(Math.max(0, son - bas) / (adet + 1), 18 * 3600000)
  return Array.from({ length: adet }, (_, i) =>
    Math.round(bas + adim * (i + 1) - Math.random() * adim * 0.2),
  )
}

/**
 * Demo verisinin parça kaynağı: katalogun kendisi ve ondan türeyen
 * havuz. Katalog da dönüyor, çünkü talebe yazılan fiyat görüntüsü
 * (`fiyatGoruntusu`) katalogu istiyor.
 *
 * HATA YUTULMUYOR. Çağıran demoYukle; katalog gelmezse hiç kayıt
 * açmıyor. Burada bir yedek tabloya düşmek, demoyu uydurma kodlarla
 * doldurmak olurdu.
 *
 * @returns {Promise<{katalog: Object, havuz: Array}>}
 */
export async function parcaKaynagi() {
  const katalog = await katalogGetir()
  /* Görsel de satırda: gerçek parça satırı o günün görselini taşıyor
     (bkz. CLAUDE.md "Katalog değişince geçmiş işlem değişmez"). */
  const havuz = katalog.parcalar.map((p) => ({ kod: p.kod, ad: p.ad, fiyat: p.fiyat, gorsel: p.gorsel ?? null }))
  return { katalog, havuz }
}

/* Havuzdan parça seçer, ADI tekrar etmeyecek biçimde.

   Katalogun birincil anahtarı kod; ad tekil değil, aynı ad birkaç
   kodda geçiyor. Servis siparişinin adedi artık KODLA anahtarlanıyor
   (aşağıda, gerçek siparişin yazdığı biçimin aynısı), yani orada aynı
   ad iki kez düşse de rakam bozulmuyor.

   AYIKLAMA YİNE DURUYOR: bu seçim müşterinin parça talebinde de
   kullanılıyor ve o kayıt adedi hâlâ ADLA anahtarlıyor
   (bkz. demo.js → parcaAdet); aynı ad iki kez düşerse biri diğerinin
   adedini siler. Seçimde ayıklamak, orada yanlış adet yazmaktan ucuz.
   En az bir parça her zaman dönüyor. */
export function parcaSecimi(havuz, enAz, enCok) {
  const secilen = []
  for (const p of secBirkac(havuz, enAz, enCok)) {
    if (secilen.some((s) => s.ad === p.ad)) continue
    secilen.push(p)
  }
  return secilen
}

function parcaSec(havuz) {
  return parcaSecimi(havuz, 1, 2).map((p) => ({ ...p, adet: tamsayi(1, 2) }))
}

/** Rastgele üretilen servis talebinde durumdan senaryo seçer. */
export function senaryoSec(durum) {
  switch (durum) {
    case 'incelemede':
      return 'devir'
    case 'planlandi':
      return 'planlandi'
    case 'parcaBekliyor':
      return sec(['parcaIstendi', 'parcaYolda', 'parcaGeldi'])
    case 'onayBekliyor':
      return sec(['onayParcali', 'onayParcasiz'])
    case 'kapandi':
      return sec(['onaylandi', 'onaylandi', 'onaylandi', 'garantiDisi', 'reddedildi'])
    case 'iptal':
      return 'iptal'
    default:
      return 'yeni'
  }
}

/* ==========================================================================
   Tek servis talebinin akışı

   Talebin demo üreticisinin kurduğu gövdesine (müşteri, makine,
   açıklama) servis tarafının alanlarını ekliyor. Dönen `yama` talebin
   üstüne yazılıyor; `cari` servisin hesabına düşen satırlar.

   `secenek.vaka` talebin arıza vakası (demoMakineAilesi.js → vakaSec),
   `secenek.parcali` işin parçalı olup olmadığı (senaryoIhtiyaci): makine
   o karara göre seçildi, akış aynı kararı okuyor. `havuz` vakanın bu
   makinedeki parçaları.

   Alanların hepsi açıkça yazılıyor, boş olanlar da: gövdede başka bir
   türden kalmış bir alan (plan, çözüm) servis akışına karışmasın.
   ========================================================================== */
export function servisAkisi(talep, senaryo, { servis, havuz, personel, secenek = {} }) {
  const bas = talep.createdAt
  const servisAd = servis.ad
  const [t1, t2, t3, t4] = zamanlar(bas, 4)
  const cari = []
  const vaka = secenek.vaka
  /* Parçasız bitmeyen vaka (kırık bıçak) parçasız akışa hiç gelmiyor
     (vakaSec); gelirse genel vakanın sonucu yazılıyor. */
  const parcasiz = vaka?.parcasiz || ARIZA_VAKALARI.genel[0].parcasiz
  /* Ücret servisin ve makinenin modelinin o günkü tarifesi — gerçek
     kayıtta servisKaydiGonder'in yazdığı (bkz. veri.js). */
  const tarife = servisinTarifesi(servis.id, talep.makine?.productId || null)

  const yama = {
    /* Uygulamadan gelen talepte servisin numarası da yazılıyor
       (lib/talepOlustur.js); Servisim'in elle açtığında yazılmıyor
       (lib/elleTalep.js). */
    servis: {
      id: servis.id,
      ad: servisAd,
      ...(secenek.elle ? { kademe: 'elle' } : { tel: servis.tel || '' }),
      tarih: bas,
    },
    sahip: 'servis',
    status: 'yeni',
    masa: null,
    gecmis: [],
    plan: null,
    teklif: null,
    iptalBilgi: null,
    servisKaydi: null,
    cozum: null,
    hakkedis: null,
    parcaSevk: null,
    devir: null,
    notlar: [...(talep.notlar || [])],
  }

  /* Dükkâna gelen müşteri için servisin elle açtığı kayıt: sesli not ve
     fotoğraf yok (bkz. servis/ekranlar/ElleKayit.jsx). ADRES VAR: Kayıt
     Aç ekranı onu zorunlu tutuyor; önce burada boşaltılıyordu.

     Makine başka servise atanmışsa ya da servisi yoksa talebe açıldığı
     anın durumu yazılıyor (`atamaDisi`; kural lib/servisAtama.js →
     elleIsinAtamasi, gerçek kayıtta lib/elleTalep.js). Sahne
     müşterilerinin makineleri sahne servisine atandığı için bugün
     yazılmıyor; alanın olmaması "çelişki yok" demek. */
  if (secenek.elle) {
    const atamaDisi = elleIsinAtamasi(talep.makine, servis.id)
    Object.assign(yama, { elle: true, ses: null, _fotoYazilari: null, ...(atamaDisi ? { atamaDisi } : {}) })
  }

  /* Kayıttaki "Servis Talebi Nedeni": Servisim'in kayıt ekranı talebin
     açıklamasını getiriyor (servis/ekranlar/ServisKapanisi.jsx). Kurulum
     talebinde açıklama yok; servis makinenin durumunu yazıyor. */
  const ariza = talep.aciklama || makineDurumAdi(talep.durum) || vaka?.aciklama || ''

  /* Kaydı servis uygulamasının yazdığı gibi yazar (bkz. veri.js →
     servisKaydiGonder). İkinci aşama birinci aşamanın üstüne. */
  function kayitYaz(kayit, tarih) {
    const hata = kaydiDogrula(kayit)
    if (hata) console.warn('Demo servis kaydı geçersiz:', senaryo, hata)
    const { cozum, hakkedis, parcalar } = kaydiCozume(kayit)
    const sonuc = kapininSonucu(kayit)
    const devam = yama.servisKaydi?.asama === ASAMA.parca && kayit.asama !== ASAMA.parca
    yama.servisKaydi = devam
      ? { ...yama.servisKaydi, ...kayit, parcalar, tarih, servisAd }
      : { ...kayit, parcalar, tarih, servisAd }
    yama.cozum = { ...cozum, tarih, personel: servisAd }
    yama.status = sonuc.durum
    yama.masa = sonuc.masa
    yama.gecmis.push({ durum: sonuc.durum, tarih, personel: servisAd })
    if (kayit.kapi === 'garanti' && kayit.asama !== ASAMA.parca) {
      yama.hakkedis = { ...hakkedis, durum: 'bekliyor', olusma: tarih }
    }
  }

  /* Yedek parça personeli parçayı gönderdi. Takip numarası yoksa talep
     parça masasında kalıyor (bkz. veri.js → servisParcasiGonderildi). */
  function sevk(tarih, takipli) {
    yama.parcaSevk = takipli
      ? { firma: sec(KARGO), takipNo: String(tamsayi(1000000000, 9999999999)), tarih, personel }
      : { firma: '', takipNo: '', tarih, personel }
    yama.masa = takipli ? null : 'parca'
    yama.gecmis.push({ durum: 'parcaBekliyor', tarih, personel })
  }

  /* Tespit seçilen parçanın adıyla: "hasarlı parça" ile istenen parça
     aynı şeyi söylüyor. */
  const parcaKaydi = () => {
    const parcalar = parcaSec(havuz)
    return { kapi: 'garanti', asama: ASAMA.parca, parcalar, sonuc: tespitYazisi(parcalar), ariza }
  }

  /* Yapılan iş ile ayrıntısı birlikte: parçalı işte "Parça Değişti" ve
     değişen parçalar, parçasız işte vakanın kendi sonucu. Önce ayrı ayrı
     çekiliyordu; "Arıza Bulunamadı" yanında "Parça takıldı…" yazabiliyordu. */
  const bitenKayit = (onceki) => ({
    ...(onceki || { kapi: 'garanti', parcalar: [], ariza }),
    asama: ASAMA.bitti,
    yapilanIs: onceki ? 'Parça Değişti' : parcasiz.yapilanIs,
    km: tamsayi(12, 140),
    kmUcreti: tarife.yolKm,
    /* İşçilik süreyle (bkz. lib/servisKaydi.js → TARIFE): yarım saatlik
       adımlarla 1-8 saat, saat ücreti tarifeden. */
    ...iscilikAlanlari(tamsayi(2, 16) / 2, tarife.iscilikSaat),
    sonuc: onceki ? parcaliSonucYazisi(onceki.parcalar) : parcasiz.sonuc,
  })

  switch (senaryo) {
    /* SERVİSİM'İN RANDEVUSU YALNIZ GÜN (25 Eylül 2026). Servis
       randevuda saat girmiyor; kayıt yerel gün başı ve
       `saatBelirtildi: false` (lib/tarih.js → gunlukRandevu), "ne
       yapılacak" türden (RANDEVU_ISI). Demo önce 09:00-16:00 arası bir
       saat ve balya makinesine ait bir iş yazıyordu: gerçekte oluşmayan
       bir kayıt. */
    case 'planlandi': {
      let gun = secenek.bugun ? Date.now() : t1 + 86400000 * (secenek.gun || tamsayi(1, 4))
      /* Rastgele eski taleplerde gün geçmişte kalıyor; yarısı ileri
         alınıyor ki her kartta "gecikmiş randevu" görünmesin. */
      if (!secenek.bugun && gun < Date.now() && Math.random() < 0.5) {
        gun = Date.now() + 86400000 * tamsayi(1, 3)
      }
      yama.status = 'planlandi'
      yama.plan = {
        ...gunlukRandevu(bugunGirdi(gun)),
        is: RANDEVU_ISI.servis,
        gorusuldu: true,
        kayitTarihi: t1,
        personel: servisAd,
      }
      yama.gecmis.push({ durum: 'planlandi', tarih: t1, personel: servisAd })
      break
    }

    /* Geçmiş satırı kaynağıyla: destek isteme gerçek bir servis kaydından
       ayırt ediliyor (bkz. veri.js → destekTalepEt). */
    case 'devir':
      yama.status = 'incelemede'
      yama.sahip = 'paksan'
      yama.devir = { tarih: t1, neden: sec(DEVIR_NEDEN), servisAd }
      yama.gecmis.push({ durum: 'incelemede', tarih: t1, personel: servisAd, kaynak: 'devir' })
      break

    case 'parcaIstendi':
      kayitYaz(parcaKaydi(), t1)
      break

    case 'parcaYolda':
      kayitYaz(parcaKaydi(), t1)
      sevk(t2, false)
      break

    case 'parcaGeldi':
      kayitYaz(parcaKaydi(), t1)
      sevk(t2, true)
      break

    case 'onayParcali':
    case 'onayParcasiz':
    case 'onaylandi':
    case 'reddedildi': {
      /* Karar makine seçilirken verildi (senaryoIhtiyaci); makine o karara
         göre seçildiği için burada yeniden çekilmiyor. */
      const parcali =
        secenek.parcali ??
        (senaryo === 'onayParcali' ? true : senaryo === 'onayParcasiz' ? false : Math.random() < 0.6)
      if (parcali) {
        const ilk = parcaKaydi()
        kayitYaz(ilk, t1)
        sevk(t2, true)
        kayitYaz(bitenKayit(ilk), t3)
      } else {
        kayitYaz(bitenKayit(null), t1)
      }

      if (senaryo === 'onaylandi') {
        yama.hakkedis = { ...yama.hakkedis, durum: 'onaylandi', onay: { personel, tarih: t4 } }
        yama.status = 'kapandi'
        yama.masa = null
        yama.gecmis.push({ durum: 'kapandi', tarih: t4, personel })
        if (yama.hakkedis.toplam > 0) {
          cari.push({
            id: uid(),
            tarih: t4,
            servisId: servis.id,
            servisAd,
            tur: 'alacak',
            tutar: yama.hakkedis.toplam,
            aciklama: `${talep.no} · servis ödemesi`,
            talepNo: talep.no,
            /* Gerçek hak ediş onayının yazdığı gibi kimlikle
               (veri.js → hakkedisOnayla): numara tekil değil. */
            talepId: talep.id,
            personel,
            demo: true,
          })
        }
      }
      if (senaryo === 'reddedildi') {
        yama.hakkedis = {
          ...yama.hakkedis,
          durum: 'reddedildi',
          red: { personel, tarih: t4, neden: sec(RED_NEDEN) },
        }
        yama.status = 'kapandi'
        yama.masa = null
        yama.gecmis.push({ durum: 'kapandi', tarih: t4, personel })
      }
      break
    }

    /* Servis işin garanti dışı olduğunu gördü; kayıt açmadan kapattı
       (bkz. servis/ekranlar/TalepDetay.jsx → garantiDisi). */
    case 'garantiDisi':
      yama.status = 'kapandi'
      yama.cozum = { ozet: GARANTI_DISI_OZET, garantiDisi: true, tarih: t1, personel: servisAd }
      yama.gecmis.push({ durum: 'kapandi', tarih: t1, personel: servisAd })
      break

    case 'iptal':
      yama.status = 'iptal'
      yama.iptalBilgi = { neden: sec(IPTAL_NEDEN), aciklama: '', personel, tarih: t2 }
      yama.gecmis.push(
        { durum: 'incelemede', tarih: t1, personel },
        { durum: 'iptal', tarih: t2, personel },
      )
      break

    default:
      break
  }

  /* PAKSAN'ın servise yazdığı not ve servisin kendi notu: ikisi de
     talebin içinde ayrı başlıkta görünüyor (bkz. servis/ekranlar/
     TalepDetay.jsx → bizeNotlar, benimNotlarim). */
  if (secenek.serviseNot) {
    yama.notlar.push({
      metin: secenek.serviseNot,
      tarih: t1,
      personel,
      musteriye: false,
      servise: true,
    })
  }
  if (secenek.servistenNot) {
    yama.notlar.push({
      metin: secenek.servistenNot,
      tarih: t2,
      personel: servisAd,
      musteriye: false,
      servise: false,
      servisten: true,
    })
  }
  yama.notlar.sort((a, b) => a.tarih - b.tarih)

  return { yama, cari }
}

/* ==========================================================================
   Servisin kendi parça siparişleri

   Normal yedek parça talebi, `servisSiparisi` işaretiyle
   (bkz. veri.js → servisParcaSiparisi). Dört hâl: yeni, hazırlanıyor,
   gönderildi ve bedeli hesaptan düşülen, gönderildi ve faturalı.
   Bakiyeden düşülen kapanmış siparişin borç satırı da burada.

   `noUret` talep numarasını veriyor: demo.js numaraların tekil
   kalmasını istiyor ve kendi sayacını geçiriyor.
   ========================================================================== */
export function servisSiparisleriUret({ servis, personel, katalog, butce = 0, noUret = talepNo }) {
  const liste = katalog.parcalar
  /* BAKİYEDEN ÖDENEN SİPARİŞ BAKİYEYİ AŞMIYOR. Servis uygulaması
     bakiyenin karşılamadığı siparişte bu seçeneği kapatıyor (bkz.
     servis/ekranlar/SiparisVer.jsx). Demo aşsaydı hesap ekranı eksi
     bakiye gösterirdi: gerçekte oluşamayacak bir rakam. Sığan parça
     yoksa sipariş faturalı yazılıyor. */
  let kalan = butce
  /* KDV tek yerden hesaplanıyor: `kdvTutari` (bkz. marka/katalog/
     para.js). Oranı elle çarpan her satır, oran değiştiğinde
     gözden kaçacak bir satırdır. */
  const kdvli = (fiyat, adet) => fiyat * adet + kdvTutari(fiyat * adet)
  const SIPARISLER = [
    { yas: 0.4, durum: 'yeni', odeme: 'bakiye' },
    { yas: 2, durum: 'incelemede', odeme: 'fatura' },
    { yas: 9, durum: 'kapandi', odeme: 'bakiye' },
    { yas: 27, durum: 'kapandi', odeme: 'fatura' },
  ]

  const talepler = []
  const cari = []

  for (const s of SIPARISLER) {
    const bas = Date.now() - s.yas * 86400000
    const [t1, t2] = zamanlar(bas, 2)
    const kim = sec(personel)
    let odeme = s.odeme
    let kalemler = parcaSecimi(liste, 1, 3).map((p) => ({
      ad: p.ad,
      kod: p.kod,
      fiyat: p.fiyat,
      adet: tamsayi(1, 4),
    }))
    if (odeme === 'bakiye') {
      const sigan = liste.filter((p) => kdvli(p.fiyat, 1) <= kalan * 0.6)
      if (sigan.length) {
        const p = sec(sigan)
        const adet = kdvli(p.fiyat, 2) <= kalan * 0.6 ? tamsayi(1, 2) : 1
        kalemler = [{ ad: p.ad, kod: p.kod, fiyat: p.fiyat, adet }]
      } else {
        odeme = 'fatura'
      }
    }
    /* Tutar da fiyat görüntüsünden okunuyor: sipariş kaydındaki rakam
       ile kayda yazılan satırlar aynı hesaptan çıksın. */
    const parcaGoruntu = fiyatGoruntusu(katalog, kalemler)
    const tutar = parcaGoruntu.araToplam
    const tutarKdvli = parcaGoruntu.toplam
    if (odeme === 'bakiye') kalan -= tutarKdvli

    const gecmis = [{ durum: 'yeni', tarih: bas, personel: servis.ad }]
    if (s.durum !== 'yeni') gecmis.push({ durum: 'incelemede', tarih: t1, personel: kim })
    if (s.durum === 'kapandi') gecmis.push({ durum: 'kapandi', tarih: t2, personel: kim })

    const talep = {
      id: uid(),
      no: noUret('parca'),
      createdAt: bas,
      status: s.durum,
      tur: 'parca',
      ad: servis.ad,
      tel: servis.tel || '',
      telHam: String(servis.tel || '').replace(/\D/g, ''),
      il: servis.il || '',
      ilce: servis.ilce || '',
      ulke: 'TR',
      ihracat: false,
      musteriId: null,
      aciklama: '',
      /* BİÇİM GERÇEK SİPARİŞİN AYNISI (bkz. veri.js →
         servisParcaSiparisi): ad listesi eski okuyucular için duruyor,
         adet KOD anahtarlı. Demo adla anahtarlamaya devam ederken servis
         uygulaması adedi kodla arıyordu; demo siparişlerinin her satırı
         ekranda "× 1" görünüyordu. Kodu olmayan satır ancak adıyla
         anahtarlanabiliyor; kod uydurulmuyor. */
      parcalar: kalemler.map((k) => k.ad || k.kod),
      parcaAdet: Object.fromEntries(kalemler.map((k) => [k.kod || k.ad, k.adet])),
      /* Sipariş anının fiyat görüntüsü: kod, adet, birim fiyat, tutar
         ve katalog sürümü kaydın içinde. Ekranlar canlı fiyata değil
         buna bakıyor. */
      parcaFiyat: parcaGoruntu,
      fatura: { ad: servis.ad, adres: [servis.ilce, servis.il].filter(Boolean).join(' / ') },
      odeme,
      tutar,
      tutarKdvli,
      servisSiparisi: true,
      sahip: 'paksan',
      /* Masa yalnız talep "yeni" iken dolu; durum değişince boşalıyor
         (bkz. veri.js → talepYaz). */
      masa: s.durum === 'yeni' ? 'parca' : null,
      servis: { id: servis.id, ad: servis.ad, no: servis.no || '', tarih: bas },
      gecmis,
      cozum:
        s.durum === 'kapandi'
          ? {
              yapilanIs: kalemler.map((k) => `${k.ad} × ${k.adet}`).join(' · '),
              not: '',
              personel: kim,
              tarih: t2,
            }
          : null,
      notlar: [],
      ekler: [],
      demo: true,
    }
    talepler.push(talep)

    if (s.durum === 'kapandi' && odeme === 'bakiye') {
      cari.push({
        id: uid(),
        tarih: t2,
        servisId: servis.id,
        servisAd: servis.ad,
        tur: 'borc',
        tutar: tutarKdvli,
        aciklama: `${talep.no} · parça siparişi`,
        talepNo: talep.no,
        talepId: talep.id,
        personel: kim,
        demo: true,
      })
    }
  }

  return { talepler, cari }
}

/* Servise yapılmış bir ödeme: 18 günden eski onaylı işlerin toplamı.
   Hesap ekranında hem artı hem eksi satır görünsün, bakiye de
   birikmiş toplamdan küçük olsun — gerçek bir ay böyle görünüyor. */
export function odemeUret(cari, servis, personel) {
  const esik = Date.now() - 18 * 86400000
  const tutar = cari
    .filter((h) => h.servisId === servis.id && h.tur === 'alacak' && h.tarih < esik)
    .reduce((t, h) => t + h.tutar, 0)
  if (!tutar) return []
  return [
    {
      id: uid(),
      tarih: esik,
      servisId: servis.id,
      servisAd: servis.ad,
      tur: 'borc',
      tutar,
      aciklama: 'Havale ile ödendi',
      personel,
      demo: true,
    },
  ]
}
