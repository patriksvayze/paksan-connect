import { KAPALI_DURUMLAR } from '../../../veri'
import { makineninServisi } from '../../../../lib/servisAtama'
import { markaEk, servisleriGetir } from '../../../../marka'
import {
  dilim, fark, farkPuan, kapanisOlayi, musteriTalebiMi, oran, ortalama, paraHucre, RENK, SAAT,
  servisSinifi, servisZiyaretleri, sureYaz, topla, yenidenAcilmaSayisi, yuzde,
} from '../hesap'

/* ==========================================================================
   Servis Ağı — "Servislerimiz işi ne kadar hızlı ve eksiksiz yapıyor?"

   Servis ayrı bir şirket; işini bayiye değil PAKSAN'a raporluyor ve
   parasını PAKSAN'dan alıyor. Bu sekme PAKSAN'ın servis ağına dışarıdan
   baktığı yer: kime ne kadar iş gitti, kim ne kadar çabuk sahaya çıktı,
   kimin işi geri döndü, kim destek istedi, kimin hesabında ne birikti.

   HANGİ TALEPLER. Bir servise yazılmış müşteri talepleri
   (`talep.servis`). Servisin kendi parça siparişi de `servis` alanı
   taşıyor ama müşteri işi değil; dışarıda. Talebin servisi bir daha
   değişmiyor (bkz. veri.js → servisinTalepleri), PAKSAN'dan destek
   istenen iş de o servisin işi olarak sayılıyor.

   İLK SERVİS KAYDI GEÇMİŞTEN OKUNUYOR, KAYDIN TARİHİNDEN DEĞİL.
   Garanti işinde servis önce parçayı istiyor, parça gelince "Parçayı
   Taktım" diyor ve ikinci aşama kaydın `tarih` alanını ÜSTÜNE yazıyor
   (bkz. veri.js → servisKaydiGonder). Demo verisinde ölçüldü: parça
   istenen yedi işin altısında kaydın tarihi ilk ziyaretten 18–39 saat
   sonrasını gösteriyor. İlk ziyaretin izi geçmişte: servisin kendi adıyla yazdığı
   ilk "parça bekliyor", "onay bekliyor" ya da "kapandı" satırı.
   Randevu ("planlandı") ve destek isteği ziyaret sayılmıyor. Geçmişte
   iz yoksa ziyaret listesindeki en erken tarih kullanılıyor; ikisinin
   en erkeni geçerli.

   GARANTİ DIŞI İKİ YOLDAN GELİYOR. Servisin "Garanti Dışı İşi Tamamla"
   ile kapattığı iş (`garantiDisi`) ve servis kaydı olmadan backoffice
   kapanış formuna ücret yazılarak kapatılan iş (`ucretli`, bkz.
   hesap.js → servisSinifi). İkisinde de parayı müşteri ödüyor; ikincisi
   ayrı sayılsaydı grafikte "sonucu yok" dilimine düşerdi.

   BÜTÜN SERVİSLER KARNEDE. Hiç iş almamış servis de listede duruyor:
   ağda olup iş almayan servis, çok iş alan kadar bilgi.
   ========================================================================== */

const M = {
  ad: 'Servis Ağı',
  soru: 'Servislerimiz işi ne kadar hızlı ve eksiksiz yapıyor?',

  gelen: 'Servise giden talep',
  gelenAlt: 'Seçilen dönemde açılan ve bir servise atanan müşteri talepleri',
  tamamlanan: 'Tamamlanan iş',
  tamamlananAlt: 'Açılış tarihinden bağımsız, bu dönemde kapanan işler; sonradan yeniden açılanlar dahil',
  ilkKayit: 'İlk servis kaydına kadar',
  ilkKayitAlt: (p90) => `Ortalama · en yavaş %10: ${p90}`,
  yenidenAcilma: 'Yeniden açılma oranı',
  yenidenAcilmaAlt: (n, m) => `Kapanan ${m} işin ${n} tanesinde müşteri "sorun devam ediyor" dedi`,
  destek: 'Destek istenen iş',
  destekAlt: `Servisin ${markaEk('dan')} destek istediği talepler`,
  garantiDisi: 'Garanti dışı tamamlanan',
  garantiDisiAlt: 'Bu dönemde kapanan, parasını müşterinin ödediği işler',
  isYapan: 'İş yapan servis',
  isYapanAlt: (n) => `Kayıtlı ${n} servisten bu dönemde en az bir servis kaydı olanlar`,

  grafikServis: 'Servislere göre işler',
  grafikServisAlt:
    'Seçilen dönemde açılan talepler, bugünkü sonucuna göre. En çok iş alan 10 servis. Bir satıra tıklayınca servisin talepleri açılır.',
  /* Grafik dilimleri talebin BUGÜNKÜ sonucu (dönemde açılan talepler);
     karnedeki "Garanti işi" ve "Garanti dışı tamamlanan" ise dönemde
     BİTEN işler. Aynı ad iki ayrı sayıyı göstermesin diye dilimler
     sonuç cümlesiyle adlandırıldı. */
  sonuc: {
    garanti: 'Garanti işine döndü',
    garantiDisi: 'Garanti dışı kapandı',
    iptal: 'İptal edildi',
    yok: 'Henüz sonuçlanmadı',
  },

  tabloKarne: 'Servis karnesi',
  tabloKarneAciklama:
    'Bütün kayıtlı servisler; iş almayanlar en sonda. Gelen iş seçilen dönemde açılan; tamamlanan, garanti dışı tamamlanan ve yeniden açılan (kapanan işte) seçilen dönemde kapanan; garanti işi seçilen dönemde biten garanti işi; onaylanan hak ediş tutarı onay tarihine göre. Şu an açık ve bakiye tarihten bağımsız. Bir satıra tıklayınca servisin talepleri açılır.',
  /* Sütun adları sekmelerin kutularıyla aynı tanımda aynı ad:
     "Garanti işi" Garanti ve Hak Ediş sekmesindeki kutuyla, "Onaylanan
     hak ediş tutarı" oradaki tutarla aynı sayı. "Yeniden açılan" Genel
     Bakış'ta başka bir şey sayıyor (yeniden açılma tarihi dönemde);
     burada dönemde kapanan işlerden yeniden açılanlar. */
  sutun: {
    servis: 'Servis',
    il: 'İl',
    gelen: 'Gelen iş',
    tamamlanan: 'Tamamlanan',
    acik: 'Şu an açık',
    garanti: 'Garanti işi',
    garantiDisi: 'Garanti dışı tamamlanan',
    ilkKayit: 'Ortalama ilk kayıt süresi',
    yenidenAcilan: 'Kapanan işlerden yeniden açılan',
    destek: 'Destek istenen',
    hakkedis: 'Onaylanan hak ediş tutarı',
    bakiye: 'Bakiye',
  },

  tabloKapsama: 'Bölgelere göre servis kapsaması',
  tabloKapsamaAciklama:
    'Kayıtlı makinelerin güncel servis atamaları gösterilir; seçilen dönem dikkate alınmaz. Servisi olmayan makinenin sahibi servis talebi açamaz. Makineye ya da makineyi satan bayiye servis atayın. Bir satıra tıklayınca Kayıtlı Makineler açılır.',
  kolon: {
    il: 'İl',
    makine: 'Kayıtlı makine',
    servisli: 'Servisi olan',
    servissiz: 'Servisi olmayan',
    bolge: 'Bölgesinde tanımlı servis',
  },
  ilYok: 'İl yazılı değil',
  toplam: 'Toplam',

  notlar: [
    'Servise giden talep: seçilen dönemde açılan ve bir servise yazılan müşteri talepleri. Servislerin kendi parça siparişleri sayılmaz.',
    'Tamamlanan iş: servise atanmış taleplerden kapanışı seçilen döneme düşenler. Yeniden açılıp tekrar kapanan talepte son kapanış tarihi esas alınır. Kapanıp sonradan yeniden açılan ve hâlâ açık olan iş de sayılır: kapanış o dönemde gerçekleşti.',
    'İlk servis kaydına kadar: talebin açılışından servisin ilk kaydına (parça isteği, onaya giden kayıt ya da garanti dışı kapanış) geçen süre. İlk kaydı seçilen döneme düşen talepler sayılır. Randevu vermek ve destek istemek kayıt sayılmaz.',
    'Yeniden açılma oranı: kapanışı seçilen döneme düşen servis işlerinden müşterinin en az bir kez "sorun devam ediyor" dediklerinin oranı. Kapandıktan sonra yeniden açılmış ve hâlâ açık olan iş de hem paya hem paydaya girer.',
    `Destek istenen iş: servisin ${markaEk('dan')} destek istediği tarih seçilen döneme düşen talepler.`,
    'Garanti dışı tamamlanan: seçilen dönemde kapanan ve parasını müşterinin ödediği işler. Servisin garanti dışı kapattığı işler ile servis kaydı olmadan kapanış formuna ücret yazılarak kapatılan işler birlikte sayılır.',
    'İş yapan servis: seçilen dönemde en az bir servis kaydı olan farklı servis sayısı.',
    'Garanti işi (karne): servisin seçilen dönemde bitirip onaya gönderdiği garanti işleri; kabul edilmeyenler de dahil. Aynı talebe ikinci kez gidildiyse iki iş sayılır. Garanti ve Hak Ediş sekmesindeki "Garanti işi" ile aynı sayıdır.',
    'Yeniden açılan (kapanan işte, karne): seçilen dönemde kapanan işlerden müşterinin en az bir kez "sorun devam ediyor" dediği işler. Genel Bakış sekmesindeki "Yeniden açılan" ise "sorun devam ediyor" denen günü seçilen döneme düşen talepleri sayar.',
    'Onaylanan hak ediş tutarı (karne): onay tarihi seçilen döneme düşen hak edişlerin toplamı.',
    'Bakiye: servisin cari hesabındaki bütün hareketlerin toplamı (onaylanan hak edişler eksi hak edişten düşülen parça siparişleri ve ödemeler). Artı değer servise olan borcumuzdur.',
    'Grafikteki sonuç, seçilen dönemde açılan talebin bugünkü durumudur: garanti işine dönmüş, garanti dışı kapanmış, iptal edilmiş ya da henüz sonuçlanmamış. Karnedeki garanti işi ve garanti dışı tamamlanan sayıları dönemde biten işlere baktığı için grafikle aynı olmak zorunda değildir.',
    'Servis kapsaması: aynı seri numarası defterde birden çok satırda olsa da makine bir kez sayılır. Servis, makineye atanmış servisten, yoksa makineyi satan bayinin servisinden bulunur. Bölgesinde tanımlı servis, sorumluluk bölgesinde o il yazılı olan servis sayısıdır; hiçbir serviste bölge tanımlı değilse "—" yazar. Toplam satırında bu sütun için sayı gösterilmez; aynı servis birden çok ilde sayılabildiği için il bazındaki sayıları toplamak servis sayısını vermez.',
    'Servis karnesinde aynı servis kimliğine ait kayıtlar tek satırda birleştirilir. Servis kimliği bulunmayan eski bir kayıtta servis adı kayıtlı servis listesiyle eşleşiyorsa kayıt o servisin satırına eklenir.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

/* Servisin ziyaret olarak yazdığı durumlar (bkz. dosya başı). */
const ZIYARET_DURUMLARI = ['parcaBekliyor', 'onayBekliyor', 'kapandi']

/* Grafik dilimleri; sıra alttan üste değil soldan sağa. */
const SONUCLAR = [
  { anahtar: 'garanti', renk: RENK.bir },
  { anahtar: 'garantiDisi', renk: RENK.iki },
  { anahtar: 'iptal', renk: RENK.uc },
  { anahtar: 'yok', renk: RENK.notr },
]

/* Yalnız servis talebi: servise yazılmış başka türde müşteri talebi
   bugün yok, ama olursa (ör. ileride parça talebi servise düşerse) karne
   ile Genel Bakış'ın servis sayısı sessizce ayrışmasın. Tür süzgeci
   satır tıklamasında açılan listeyle de aynı. */
function servisliMi(t) {
  return t.tur === 'servis' && musteriTalebiMi(t) && Boolean(t.servis?.id || t.servis?.ad)
}

/* Servisin kimliği. Kimliği olmayan kayıt önce ADIYLA kayıtlı servis
   listesinde aranıyor; bulunursa onun kimliğine yazılıyor, bulunmazsa
   ad anahtarına düşüyor.

   ÖNEK TEK BAŞINA YETMİYORDU. "ad:" öneki iki kayıt aynı servisi iki
   satıra bölmesin diye konmuştu ama bölünmeyi engellemiyordu: talep
   servise yalnız adıyla yazılmışsa kimlikli satırla birleşmiyor,
   karnede ve grafikte aynı servis adı iki kez, iki ayrı sayı kümesiyle
   çıkıyordu. Bugünkü yazıcıların hepsi kimlik yazıyor; bu, dışarıdan
   aktarılmış ya da elle düzeltilmiş eski kayıt için. */
function anahtarlayici(servisListe) {
  const adla = new Map()
  for (const s of servisListe) {
    const ad = String(s.ad || '').trim()
    if (ad && s.id && !adla.has(ad)) adla.set(ad, s.id)
  }
  return (servisId, servisAd) => {
    if (servisId) return servisId
    const ad = String(servisAd || '').trim()
    return adla.get(ad) || `ad:${ad}`
  }
}

function garantiDisiMi(t) {
  const s = servisSinifi(t)
  return s === 'garantiDisi' || s === 'ucretli'
}

function sonucu(t) {
  if (t.status === 'iptal') return 'iptal'
  const s = servisSinifi(t)
  if (s === 'garanti' || s === 'reddedilen') return 'garanti'
  if (s === 'garantiDisi' || s === 'ucretli') return 'garantiDisi'
  return 'yok'
}

/* Servisin "PAKSAN'dan destek iste" düğmesine bastığı satır mı?

   `destekTalepEt` geçmişe talebin O ANKİ durumunu ve SERVİSİN ADINI
   yazıyor (bkz. veri.js). Durum 'parcaBekliyor' ya da 'onayBekliyor'
   ise satır gerçek bir servis kaydından ayırt edilemiyor ve destek
   istemek sahaya çıkmak gibi sayılıyordu — dosyanın kendi kuralına
   aykırı. Yeni kayıtlarda satırın `kaynak` alanı var; eski kayıtlarda
   `devir.tarih` ile eşleşen satır eleniyor. */
function devirSatiriMi(g, t) {
  return g?.kaynak === 'devir' || (Number.isFinite(t?.devir?.tarih) && g?.tarih === t.devir.tarih)
}

/* Talebin servis tarafındaki özeti — her talep için bir kez. */
function ozetle(t, anahtarla) {
  const ziyaretler = servisZiyaretleri(t)
  const adlar = new Set([t.servis?.ad, ...ziyaretler.map((z) => z.servisAd)].filter(Boolean))
  const zamanlar = [
    ...(t.gecmis || [])
      .filter(
        (g) =>
          ZIYARET_DURUMLARI.includes(g?.durum) &&
          adlar.has(g.personel) &&
          Number.isFinite(g.tarih) &&
          !devirSatiriMi(g, t),
      )
      .map((g) => g.tarih),
    ...ziyaretler.map((z) => z.tarih).filter(Number.isFinite),
  ]
  const ilk = zamanlar.length ? Math.min(...zamanlar) : null
  const sure = ilk !== null && Number.isFinite(t.createdAt) && ilk >= t.createdAt ? (ilk - t.createdAt) / SAAT : null
  return {
    t,
    anahtar: anahtarla(t.servis?.id, t.servis?.ad),
    ziyaretler,
    zamanlar,
    ilk,
    sure,
    /* Kapanış bir OLAY (bkz. hesap.js → kapanisOlayi): dönem içinde
       kapanmış, sonra müşteri "sorun devam ediyor" deyince yeniden
       açılmış iş de bu dönemde tamamlanmıştır. Eskiden talebin bugünkü
       durumundan okunuyordu ve böyle bir iş "Tamamlanan"dan tamamen
       düşüyor, üstelik yeniden açılma oranının ne payına ne paydasına
       girebiliyordu — ölçü tam da uyarması gereken durumu göremiyordu. */
    kapanis: kapanisOlayi(t),
  }
}

export const servisBolumu = {
  id: 'servis',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)

    const servisListe = veri.servisler || servisleriGetir() || []
    const anahtarla = anahtarlayici(servisListe)

    const kayitlar = veri.talepler.filter(servisliMi).map((t) => ozetle(t, anahtarla))
    const gelen = (icinde) => kayitlar.filter((k) => icinde(k.t.createdAt))
    const tamamlanan = (icinde) => kayitlar.filter((k) => icinde(k.kapanis))
    const ilkKayit = (icinde) => kayitlar.filter((k) => icinde(k.ilk))
    const destek = (icinde) => kayitlar.filter((k) => icinde(k.t.devir?.tarih))
    const yenidenAcilan = (liste) => liste.filter((k) => yenidenAcilmaSayisi(k.t) > 0)
    const garantiDisi = (liste) => liste.filter((k) => garantiDisiMi(k.t))
    const isYapan = (icinde) =>
      new Set(kayitlar.filter((k) => k.zamanlar.some(icinde)).map((k) => k.anahtar)).size

    const gelenDonem = gelen(donemde)
    const gelenOnceki = gelen(oncekide)
    const tamamDonem = tamamlanan(donemde)
    const tamamOnceki = tamamlanan(oncekide)
    const ilkDonem = ilkKayit(donemde).map((k) => k.sure)
    const ilkOnceki = ilkKayit(oncekide).map((k) => k.sure)
    const tekrarDonem = yenidenAcilan(tamamDonem).length
    const tekrarOnceki = yenidenAcilan(tamamOnceki).length

    /* ------------------------------------------------------- Ölçüler */

    const olculer = [
      {
        ad: M.gelen,
        deger: gelenDonem.length,
        fark: f(gelenDonem.length, gelenOnceki.length),
        iyi: null,
        alt: M.gelenAlt,
      },
      {
        ad: M.tamamlanan,
        deger: tamamDonem.length,
        fark: f(tamamDonem.length, tamamOnceki.length),
        iyi: 'artis',
        alt: M.tamamlananAlt,
      },
      {
        ad: M.ilkKayit,
        deger: sureYaz(ortalama(ilkDonem)),
        fark: f(ortalama(ilkDonem), ortalama(ilkOnceki)),
        iyi: 'azalis',
        alt: M.ilkKayitAlt(sureYaz(dilim(ilkDonem, 0.9))),
      },
      {
        ad: M.yenidenAcilma,
        deger: yuzde(tekrarDonem, tamamDonem.length),
        fark: karsilastir ? farkPuan(oran(tekrarDonem, tamamDonem.length), oran(tekrarOnceki, tamamOnceki.length)) : null,
        farkBirim: 'puan',
        iyi: 'azalis',
        alt: M.yenidenAcilmaAlt(tekrarDonem, tamamDonem.length),
      },
      {
        ad: M.destek,
        deger: destek(donemde).length,
        fark: f(destek(donemde).length, destek(oncekide).length),
        iyi: 'azalis',
        alt: M.destekAlt,
      },
      {
        ad: M.garantiDisi,
        deger: garantiDisi(tamamDonem).length,
        fark: f(garantiDisi(tamamDonem).length, garantiDisi(tamamOnceki).length),
        iyi: null,
        alt: M.garantiDisiAlt,
      },
      {
        ad: M.isYapan,
        deger: isYapan(donemde),
        fark: f(isYapan(donemde), isYapan(oncekide)),
        iyi: null,
        alt: M.isYapanAlt(servisListe.length),
      },
    ]

    /* -------------------------------------------------- Servis karnesi */

    /* Satırlar önce kayıtlı servis listesinden kuruluyor (iş almayan da
       görünsün), sonra listede artık olmayan ama talebi olan servisler
       ekleniyor — silinmiş servisin işi rapordan kaybolmasın. */
    const satirlar = new Map()
    for (const s of servisListe) {
      satirlar.set(anahtarla(s.id, s.ad), { id: s.id || null, ad: s.ad || '—', il: s.il || null })
    }
    for (const k of kayitlar) {
      if (!satirlar.has(k.anahtar)) {
        satirlar.set(k.anahtar, { id: k.t.servis?.id || null, ad: k.t.servis?.ad || '—', il: null })
      }
    }

    const garantiIsleri = kayitlar.flatMap((k) =>
      k.ziyaretler
        .filter((z) => z.kapi === 'garanti' && z.hakkedis)
        .map((z) => ({ anahtar: k.anahtar, hakkedis: z.hakkedis })),
    )

    /* Bakiye tarihten bağımsız: servisin bugün alacağı. Kimliği olmayan
       hareket adıyla eşleşiyor. */
    const bakiyeAl = (satir) =>
      topla(
        (veri.cari || [])
          .filter((h) => (satir.id ? h.servisId === satir.id : !h.servisId && h.servisAd === satir.ad))
          .map((h) => (h.tur === 'alacak' ? Number(h.tutar) : -Number(h.tutar))),
      )

    const karne = [...satirlar.entries()].map(([anahtar, satir]) => {
      const bunun = (liste) => liste.filter((k) => k.anahtar === anahtar)
      const gelenler = bunun(gelenDonem)
      const tamamlar = bunun(tamamDonem)
      const hakkedisler = garantiIsleri.filter((g) => g.anahtar === anahtar)
      return {
        satir,
        gelen: gelenler.length,
        tamamlanan: tamamlar.length,
        acik: bunun(kayitlar).filter((k) => !KAPALI_DURUMLAR.includes(k.t.status || 'yeni')).length,
        garanti: hakkedisler.filter((g) => donemde(g.hakkedis.olusma)).length,
        garantiDisi: garantiDisi(tamamlar).length,
        ilk: bunun(ilkKayit(donemde)).map((k) => k.sure),
        yenidenAcilan: yenidenAcilan(tamamlar).length,
        destek: bunun(destek(donemde)).length,
        hakkedis: topla(
          hakkedisler
            .filter((g) => g.hakkedis.durum === 'onaylandi' && donemde(g.hakkedis.onay?.tarih))
            .map((g) => Number(g.hakkedis.toplam)),
        ),
        bakiye: bakiyeAl(satir),
      }
    })

    karne.sort(
      (a, b) =>
        b.gelen - a.gelen ||
        b.tamamlanan - a.tamamlanan ||
        b.acik - a.acik ||
        String(a.satir.ad).localeCompare(String(b.satir.ad), 'tr'),
    )

    const karneHucreleri = (r) => [
      String(r.gelen),
      String(r.tamamlanan),
      String(r.acik),
      String(r.garanti),
      String(r.garantiDisi),
      sureYaz(ortalama(r.ilk)),
      String(r.yenidenAcilan),
      String(r.destek),
      paraHucre(r.hakkedis),
      paraHucre(r.bakiye),
    ]

    const karneToplam = (alan) => karne.reduce((t, r) => t + r[alan], 0)

    /* ------------------------------------------------------ Grafik */

    const grafikSatirlari = karne
      .filter((r) => r.gelen > 0)
      .slice(0, 10)
      .map((r) => {
        const anahtar = anahtarla(r.satir.id, r.satir.ad)
        const sayim = {}
        for (const k of gelenDonem) {
          if (k.anahtar !== anahtar) continue
          const s = sonucu(k.t)
          sayim[s] = (sayim[s] || 0) + 1
        }
        return {
          ad: r.satir.ad,
          deger: r.gelen,
          parcalar: SONUCLAR.map((s) => ({ ad: M.sonuc[s.anahtar], deger: sayim[s.anahtar] || 0, renk: s.renk })),
          onSec: git ? () => git('talepler', { durum: 'hepsi', tur: 'servis', ara: r.satir.ad, aralik }) : undefined,
        }
      })

    /* Anahtarda yalnız grafikte gerçekten görünen dilimler. */
    const gorunenDilimler = SONUCLAR.filter((_, i) => grafikSatirlari.some((r) => r.parcalar[i].deger > 0))

    const grafikler = [
      {
        tur: 'yatay',
        genis: true,
        baslik: M.grafikServis,
        alt: M.grafikServisAlt,
        anahtar: gorunenDilimler.map((s) => ({ ad: M.sonuc[s.anahtar], renk: s.renk })),
        satirlar: grafikSatirlari,
      },
    ]

    /* ---------------------------------------------- Servis kapsaması */

    /* Makine bir kez: defterin o seriye ait İLK satırı, çünkü
       makineninServisi de o satıra bakıyor (bkz. lib/servisAtama.js). */
    const iller = new Map()
    const gorulen = new Set()
    for (const kayit of veri.makineler || []) {
      const seri = String(kayit.seri || '').trim()
      if (!seri || gorulen.has(seri)) continue
      gorulen.add(seri)
      const il = kayit.il || ''
      if (!iller.has(il)) iller.set(il, { makine: 0, servisli: 0 })
      const k = iller.get(il)
      k.makine++
      if (makineninServisi(seri)) k.servisli++
    }

    /* Hiçbir serviste bölge tanımlı değilse sayı sıfır değil, bilinmiyor. */
    const bolgeTanimli = servisListe.some((s) => (s.bolge || []).length)
    const bolgedekiler = (il) => servisListe.filter((s) => (s.bolge || []).some((b) => b.il === il))

    const kapsama = [...iller.entries()]
      .map(([il, k]) => ({ il, ...k, servissiz: k.makine - k.servisli }))
      .sort((a, b) => b.servissiz - a.servissiz || b.makine - a.makine || a.il.localeCompare(b.il, 'tr'))

    const tablolar = [
      {
        baslik: M.tabloKarne,
        aciklama: M.tabloKarneAciklama,
        basliklar: [
          M.sutun.servis, M.sutun.il, M.sutun.gelen, M.sutun.tamamlanan, M.sutun.acik, M.sutun.garanti,
          M.sutun.garantiDisi, M.sutun.ilkKayit, M.sutun.yenidenAcilan, M.sutun.destek, M.sutun.hakkedis,
          M.sutun.bakiye,
        ],
        sag: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        satirlar: karne.map((r) => ({
          hucreler: [r.satir.ad, r.satir.il || '—', ...karneHucreleri(r)],
          git: git ? () => git('talepler', { durum: 'hepsi', tur: 'servis', ara: r.satir.ad, aralik }) : undefined,
        })),
        toplamSatiri: [
          M.toplam,
          '',
          String(karneToplam('gelen')),
          String(karneToplam('tamamlanan')),
          String(karneToplam('acik')),
          String(karneToplam('garanti')),
          String(karneToplam('garantiDisi')),
          sureYaz(ortalama(ilkDonem)),
          String(karneToplam('yenidenAcilan')),
          String(karneToplam('destek')),
          paraHucre(karneToplam('hakkedis')),
          paraHucre(karneToplam('bakiye')),
        ],
      },
      {
        baslik: M.tabloKapsama,
        aciklama: M.tabloKapsamaAciklama,
        basliklar: [M.kolon.il, M.kolon.makine, M.kolon.servisli, M.kolon.servissiz, M.kolon.bolge],
        sag: [1, 2, 3, 4],
        satirlar: kapsama.map((r) => ({
          hucreler: [
            r.il || M.ilYok,
            String(r.makine),
            String(r.servisli),
            String(r.servissiz),
            bolgeTanimli && r.il ? String(bolgedekiler(r.il).length) : '—',
          ],
          git: git ? () => git('makineler') : undefined,
          vurgu: r.servissiz > 0 ? 'kirmizi' : undefined,
        })),
        /* BÖLGE SÜTUNUNUN TOPLAMI YOK. Burada o illeri kapsayan TEKİL
           servis sayısı yazıyordu; sütundaki sayıların toplamı değil,
           başka bir büyüklük. Öteki üç sütunun toplamı gerçek toplam
           olduğu için yönetici burada da toplam bekliyor ve gözüyle
           yaptığı toplamı tutmuyordu. Bir servis birden çok ilde
           sayıldığı için bu sütunun toplamının anlamı da yok. */
        toplamSatiri: [
          M.toplam,
          String(topla(kapsama.map((r) => r.makine))),
          String(topla(kapsama.map((r) => r.servisli))),
          String(topla(kapsama.map((r) => r.servissiz))),
          '—',
        ],
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
