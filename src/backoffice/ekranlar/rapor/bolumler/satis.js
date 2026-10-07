import { TEKLIF_BEKLEME_GUN, teklifBekliyorMu } from '../../../veri'
import { bayileriGetir } from '../../../../data/katalog/bayiler.js'
import { bayininServisleri } from '../../../../data/katalog/servisler.js'

import { tarihYaz } from '../../ortak'
import {
  fark, farkPuan, GUN, iptalZamani, kapanisSuresi, kapanisZamani, kovayaDagit, oran, paraHucre,
  paraKutu, paraOku, RENK, SAAT, sureYaz, talepModeli, topla, yuzde, zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Satış ve Bayiler — "Fiyat teklifleri satışa dönüyor mu, bayiler ne
   durumda?"

   FİYAT TEKLİFİ TALEBİNİN İKİ YOLU VAR ve ikisi ayrı sayılıyor:

     BAYİYE İLETİLEN satış personeli talebi bayiye iletiyor, talep o an
                     kapanıyor ve PAKSAN'ın işi bitiyor (bkz. veri.js →
                     talebiBayiyeAta). Fiyatı bayi veriyor; tutar da
                     sonuç da PAKSAN'ın kaydına dönmüyor. Burada yalnız
                     ADET var, uydurma tutar yok.
     PAKSAN'IN       PAKSAN kendisi fiyat veriyor (`teklif`), müşteri
     KENDİ TEKLİFİ   dönünce sonuçla kapatıyor (`cozum.sonuc`).

   DÖNÜŞÜM ORANI YALNIZ SONUCU YAZILAN TEKLİFLERDE. Bayiye iletilen
   teklifin sonucu bilinmiyor; paydaya girse oran kendiliğinden
   düşerdi ve satış ekibi yapmadığı bir kaybı görürdü. Hâlâ açık
   teklif de paydada yok: sonucu henüz yok.

   ÖLÇÜLER OLAYIN KENDİ GÜNÜNE GÖRE (bayiye iletme, fiyat verme,
   kapanış). Grafik ve teklif tablosu ise dönemde AÇILAN taleplere
   bakıyor: "bu dönem gelen talepler bugün ne durumda" sorusu.

   BAYİ KARNESİ BİR SATIŞ ADEDİ DEĞİL. Bayinin paneli yok; elimizde
   olan kayıtlar iletilen teklif, makine kayıt defteri ve o makinelerden
   gelen servis talebi. Kesin satış Logo'daki faturada. Servisi olmayan
   bayi işaretli: makineye elle servis atanmadıysa o bayiden alınan
   makinenin sahibi servis talebi açamıyor (bkz. lib/servisAtama.js).

   MAKİNE SERİ NUMARASIYLA BİR KEZ SAYILIYOR. Aynı seri defterde
   birden çok satırda olabiliyor; makine ilk satırındaki bayiye
   yazılıyor — servis zincirinin okuduğu satır da o
   (bkz. servisAtama.js → makineninKaydi).
   ========================================================================== */

const M = {
  ad: 'Satış ve Bayiler',
  soru: 'Fiyat teklifleri satışa dönüyor mu, bayiler ne durumda?',

  gelen: 'Fiyat teklifi talebi',
  gelenAlt: 'Bu dönemde açılan talepler',
  bayiye: 'Bayiye iletilen',
  bayiyeAlt: `Fiyatı bayi veriyor; tutar PAKSAN kayıtlarında yok`,
  fiyatVerilen: 'Fiyat verilen',
  fiyatVerilenAlt: `PAKSAN personelinin fiyat verdiği teklifler`,
  bekleyen: 'Müşterinin yanıtı beklenen',
  bekleyenAlt: (n) =>
    n ? `${n} tanesi ${TEKLIF_BEKLEME_GUN} günü geçti` : `Hiçbiri ${TEKLIF_BEKLEME_GUN} günü geçmedi`,
  satis: 'Satışa dönen',
  satisAlt: (tutar) => `Satış fiyatları toplamı: ${tutar}`,
  donusum: 'Dönüşüm oranı',
  donusumAlt: (s, n) => `Sonuçlanan ${n} tekliften ${s} tanesi satışa döndü`,
  donusumYok: 'Bu dönemde sonuçlanan teklif yok',
  huni: 'Yanıt beklenen teklif tutarı',
  /* Tutar yalnız rakamla yazılmış tekliflerden hesaplanıyor; alt yazı
     ise bekleyenlerin TAMAMINI sayıyordu. Tutarı üç teklifin ikisinden
     toplanmışken "3 teklifin toplamı" yazıyor, tutarı adede bölen
     yönetici yanılıyordu. */
  huniAlt: (bilinen, hepsi) =>
    bilinen === hepsi
      ? `Şu an yanıt beklenen ${hepsi} teklifin toplam tutarı`
      : `Şu an yanıt beklenen ${hepsi} tekliften tutarı sayısal olarak kayıtlı ${bilinen} tanesinin toplamı; diğerleri tutara dâhil değil`,

  grafikSonuc: 'Teklif talepleri ne oldu?',
  grafikSonucAlt: 'Bu dönemde açılan talepler, bugünkü durumlarıyla. Bir satıra tıklayınca liste açılır.',
  sonuc: {
    bayi: 'Bayiye İletildi',
    bekliyor: 'Müşterinin yanıtı bekleniyor',
    gecikti: 'Yanıt gecikti',
    islemde: 'İşlemde',
    fiyatYok: 'Henüz fiyat verilmedi',
    iptal: 'İptal edildi',
    sonucsuz: 'Sonucu yazılmadan kapandı',
  },

  grafikGelen: 'Fiyat teklifi talepleri',
  grafikGelenAlt: 'Zaman içinde gelen talepler. Bir sütuna tıklayınca o aralığın talepleri açılır.',
  seriTalep: 'Talep',

  tabloBayi: 'Bayi karnesi',
  tabloBayiAciklama:
    'Bütün bayiler gösterilir. Bayilere iletilen teklifler, bu dönem kaydedilen makineler ve servis talepleri seçilen döneme aittir; kayıtlı makine sayısı bütün zamanları kapsar. Yalnız bayisi yazılı makineler sayılır; bu yüzden toplam satırı öteki sekmelerdeki kayıtlı makine, yeni makine kaydı ve servis talebi sayılarından küçük olabilir. Turuncu satırdaki bayinin servisi yok: o bayiden alınan makineye elle servis atanmadıysa müşteri servis talebi açamaz. Bayi bilgisi bulunan ancak bayi listesinde kaydı bulunamayanların sayıları "Bayi kaydı bulunamayanlar" satırında toplanır.',
  listeDisiBayi: 'Bayi kaydı bulunamayanlar',
  sutunBayi: {
    bayi: 'Bayi',
    il: 'İl',
    atanan: 'İletilen teklif',
    makine: 'Kayıtlı makine',
    yeniMakine: 'Bu dönem kaydedilen makine',
    servisTalebi: 'Makinelerinden gelen servis talebi',
    servis: 'Bayinin servisi',
  },

  tabloTeklif: 'Fiyat teklifleri',
  tabloTeklifAciklama: `Bu dönemde açılan bütün fiyat teklifi talepleri. Turuncu satırda fiyat verileli ${TEKLIF_BEKLEME_GUN} günü geçti, müşteri dönmedi.`,
  sutunTeklif: {
    no: 'Talep no',
    tarih: 'Tarih',
    musteri: 'Müşteri',
    il: 'İl',
    urun: 'İlgilendiği ürün',
    kimde: 'Kimde',
    tutar: 'Teklif tutarı',
    sonuc: 'Sonuç',
    satisFiyati: 'Satış fiyatı',
    sure: 'Süre',
  },
  kimdeMarka: 'PAKSAN',
  gundur: (n) => `${n} gündür`,
  toplam: 'Toplam',

  notlar: [
    'Fiyat teklifi talebi: seçilen dönemde açılan fiyat teklifi talepleri.',
    `Bayiye iletilen: seçilen dönemde bayiye iletilen talepler. Bu taleplerde fiyatı bayi veriyor; tutar ve sonuç PAKSAN kayıtlarında yok, bu yüzden dönüşüm oranına girmiyor.`,
    'Fiyat verilen: teklif tarihi seçilen döneme düşen talepler.',
    `Müşterinin yanıtı beklenen: şu an "Teklif Verildi" durumundaki talepler; tarih süzgecinden bağımsız. ${TEKLIF_BEKLEME_GUN} günü geçen, fiyat verildiği günden sayılır.`,
    'Satışa dönen: sonucu "Satış oldu" yazılıp seçilen dönemde kapanan teklifler. Tutar, kapanışta yazılan satış fiyatlarının toplamıdır.',
    'Dönüşüm oranı: seçilen dönemde sonucu yazılarak kapanan tekliflerden satışa dönenlerin payı. Bayiye iletilen, iptal edilen ve hâlâ açık olan teklifler hesaba girmez.',
    'Yanıt beklenen teklif tutarı: şu an müşterinin yanıtı beklenen tekliflerin tutarları toplamı; tarih süzgecinden bağımsız. Tutarı rakamla yazılmamış teklif toplama girmez, kaç tanesinin girdiği kutunun altında yazar.',
    `Teklif talepleri ne oldu: seçilen dönemde açılan taleplerin bugünkü durumu. Olumsuz sonuçlar kapanışta seçildiği gibi ayrı satırlarda. Yanıt bekleyen teklifler, fiyat verildiği tarihten geçen süreye göre ikiye ayrılır: ${TEKLIF_BEKLEME_GUN} günü geçmeyenler "Müşterinin yanıtı bekleniyor", geçmişler "Yanıt gecikti"; teklif tablosundaki "Sonuç" sütunu da aynı adları kullanır.`,
    "Bayi karnesi: kayıtlı makine, makine kayıt defterinde o bayiye bağlı seri numaralarıdır; bir makine bir kez sayılır. Bu bir satış adedi değildir, kesin satış Logo'daki faturadan gelir. Üç makine sütunu da makinenin defterdeki ilk satırına bakar, bu yüzden \"bu dönem kaydedilen\" her zaman \"kayıtlı\"nın alt kümesidir.",
    'Makinelerinden gelen servis talebi: seçilen dönemde açılan ve makinesinin seri numarası kayıt defterinde o bayiye bağlı servis talepleri.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

/* Kapanış formundaki sonuç seçeneği (bkz. Talepler.jsx →
   KAPANIS_ALANLARI.satinalma). Ekran yazısı değil, kayıttaki değer. */
const SATIS_OLDU = 'Satış oldu'

const teklifMi = (t) => t.tur === 'satinalma'
const seriOku = (x) => String(x || '').trim()

/* Talebin bugünkü sonucu. Grafiğin satırı ve tablonun "Sonuç" sütunu
   aynı okuyucudan geçiyor; ikisi aynı talebi farklı adla anmasın. */
function sonucAnahtari(t) {
  if (t.bayi) return 'bayi'
  const d = t.status || 'yeni'
  if (d === 'iptal') return 'iptal'
  if (d === 'kapandi') return t.cozum?.sonuc ? 'sonuc:' + t.cozum.sonuc : 'sonucsuz'
  /* Yanıtı geciken teklif, tabloda "Yanıt gecikti" diye yazılırken
     grafikte "Müşterinin yanıtı bekleniyor" satırının içinde
     sayılıyordu: aynı talep aynı sekmede iki ayrı adla anılıyor, üstelik
     "Yanıt gecikti" satırı grafikte hiç çıkmıyordu. Ayrım artık ortak
     okuyucuda. */
  if (d === 'teklif') return teklifBekliyorMu(t) ? 'gecikti' : 'bekliyor'
  return t.teklif ? 'islemde' : 'fiyatYok'
}

/* Olumsuz sonuçların adı kayıttaki değerin kendisi ("Rakibe gitti");
   kapanış formunda ne seçildiyse o. */
function sonucAdi(anahtar) {
  return anahtar.startsWith('sonuc:') ? anahtar.slice(6) : M.sonuc[anahtar]
}

/* Sonucun Talepler ekranındaki en yakın süzgeci. "Satış oldu" ile
   olumsuz sonuçları ayıran bir süzgeç orada yok; liste PAKSAN'ın
   kapattığı bütün teklifleri gösteriyor — fazla gösterir, eksik
   göstermez. */
function sonucSuzgeci(anahtar) {
  if (anahtar === 'bayi') return { durum: 'hepsi', sahiplik: 'bayi' }
  if (anahtar.startsWith('sonuc:') || anahtar === 'sonucsuz') return { durum: 'kapandi', sahiplik: 'paksan' }
  if (anahtar === 'gecikti') return { durum: 'teklifBekleyen' }
  if (anahtar === 'bekliyor') return { durum: 'teklif' }
  if (anahtar === 'iptal') return { durum: 'iptal' }
  return { durum: 'acik' }
}

function sureHucresi(t) {
  const d = t.status || 'yeni'
  if (d === 'kapandi') return sureYaz(kapanisSuresi(t))
  if (d === 'iptal') {
    const z = iptalZamani(t)
    return z ? sureYaz((z - t.createdAt) / SAAT) : '—'
  }
  if (!Number.isFinite(t.createdAt)) return '—'
  return M.gundur(Math.max(0, Math.floor((Date.now() - t.createdAt) / GUN)))
}

/* Tutar alanı rakamsa biçimli; rakam içermeyen bir yazıysa olduğu gibi. */
function tutarHucresi(ham) {
  const sayi = paraOku(ham)
  if (sayi !== null) return paraHucre(sayi)
  return ham ? String(ham) : '—'
}

/* Tutarı bilinen kayıtların toplamı. Hiçbirinin tutarı yoksa null:
   "0 ₺" ile "bilinmiyor" karışmasın. Liste boşsa gerçekten 0. */
function bilinenToplam(liste, oku) {
  const tutarlar = liste.map(oku).filter((x) => x !== null)
  if (liste.length && !tutarlar.length) return null
  return topla(tutarlar)
}

export const satisBolumu = {
  id: 'satis',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donem, onceki, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const teklifler = veri.talepler.filter(teklifMi)
    const donemTeklif = donem.filter(teklifMi)
    const oncekiTeklif = onceki.filter(teklifMi)

    /* ------------------------------------------------------- Ölçüler */

    const bayiyeAtanan = (icinde) => teklifler.filter((t) => t.bayi && icinde(t.bayi.tarih))
    const fiyatVerilen = (icinde) => teklifler.filter((t) => icinde(t.teklif?.tarih))
    const sonuclanan = (icinde) =>
      teklifler.filter((t) => !t.bayi && t.cozum?.sonuc && icinde(kapanisZamani(t)))
    const satisaDonen = (liste) => liste.filter((t) => t.cozum.sonuc === SATIS_OLDU)

    const bayiDonem = bayiyeAtanan(donemde)
    const bayiOnceki = bayiyeAtanan(oncekide)
    const fiyatDonem = fiyatVerilen(donemde)
    const fiyatOnceki = fiyatVerilen(oncekide)
    const sonucDonem = sonuclanan(donemde)
    const sonucOnceki = sonuclanan(oncekide)
    const satisDonem = satisaDonen(sonucDonem)
    const satisOnceki = satisaDonen(sonucOnceki)

    const bekleyen = teklifler.filter((t) => (t.status || 'yeni') === 'teklif')
    const geciken = bekleyen.filter(teklifBekliyorMu)

    const satisTutari = bilinenToplam(satisDonem, (t) => paraOku(t.cozum.satisFiyati))
    const huniTutari = bilinenToplam(bekleyen, (t) => paraOku(t.teklif?.tutar))
    const huniBilinen = bekleyen.filter((t) => paraOku(t.teklif?.tutar) !== null).length

    const olculer = [
      {
        ad: M.gelen,
        deger: donemTeklif.length,
        fark: f(donemTeklif.length, oncekiTeklif.length),
        iyi: 'artis',
        alt: M.gelenAlt,
      },
      {
        ad: M.bayiye,
        deger: bayiDonem.length,
        fark: f(bayiDonem.length, bayiOnceki.length),
        iyi: null,
        alt: M.bayiyeAlt,
      },
      {
        ad: M.fiyatVerilen,
        deger: fiyatDonem.length,
        fark: f(fiyatDonem.length, fiyatOnceki.length),
        iyi: null,
        alt: M.fiyatVerilenAlt,
      },
      {
        ad: M.bekleyen,
        deger: bekleyen.length,
        iyi: null,
        alt: M.bekleyenAlt(geciken.length),
      },
      {
        /* Dashboard'un yönetim özeti bu ölçüyü kimliğiyle buluyor (bkz. Ozet.jsx). */
        id: 'satis',
        ad: M.satis,
        deger: satisDonem.length,
        fark: f(satisDonem.length, satisOnceki.length),
        iyi: 'artis',
        alt: satisDonem.length ? M.satisAlt(paraKutu(satisTutari)) : undefined,
      },
      {
        /* Dashboard'un yönetim özeti bu ölçüyü kimliğiyle buluyor (bkz. Ozet.jsx). */
        id: 'donusum',
        ad: M.donusum,
        deger: yuzde(satisDonem.length, sonucDonem.length),
        fark: karsilastir ? farkPuan(oran(satisDonem.length, sonucDonem.length), oran(satisOnceki.length, sonucOnceki.length)) : null,
        farkBirim: 'puan',
        iyi: 'artis',
        alt: sonucDonem.length ? M.donusumAlt(satisDonem.length, sonucDonem.length) : M.donusumYok,
      },
      {
        ad: M.huni,
        deger: paraKutu(huniTutari),
        iyi: null,
        alt: M.huniAlt(huniBilinen, bekleyen.length),
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const sonucSayim = new Map()
    for (const t of donemTeklif) {
      const k = sonucAnahtari(t)
      sonucSayim.set(k, (sonucSayim.get(k) || 0) + 1)
    }
    const olumsuzlar = [...sonucSayim.keys()]
      .filter((k) => k.startsWith('sonuc:') && k !== 'sonuc:' + SATIS_OLDU)
      .sort((a, b) => sonucSayim.get(b) - sonucSayim.get(a))
    const sira = [
      'bayi', 'sonuc:' + SATIS_OLDU, ...olumsuzlar, 'bekliyor', 'gecikti', 'islemde', 'fiyatYok', 'iptal', 'sonucsuz',
    ].filter((k) => sonucSayim.get(k))

    const kovalar = zamanKovalari(aralik, teklifler.map((t) => t.createdAt))

    const grafikler = [
      {
        tur: 'yatay',
        baslik: M.grafikSonuc,
        alt: M.grafikSonucAlt,
        renk: RENK.bir,
        satirlar: sira.map((k) => ({
          ad: sonucAdi(k),
          deger: sonucSayim.get(k),
          onSec: git
            ? () => git('talepler', { ...sonucSuzgeci(k), tur: 'satinalma', aralik })
            : undefined,
        })),
      },
      {
        tur: 'sutun',
        baslik: M.grafikGelen,
        alt: M.grafikGelenAlt,
        seriler: [{ anahtar: 'adet', ad: M.seriTalep, renk: RENK.bir }],
        kovalar: kovayaDagit(kovalar, donemTeklif, (t) => t.createdAt, () => 'adet'),
        onSec: git ? (k) => git('talepler', { durum: 'hepsi', tur: 'satinalma', aralik: k.aralik }) : undefined,
      },
    ]

    /* ------------------------------------------------------- Tablolar */

    /* MAKİNENİN TEK YETKİLİ SATIRI VAR: defterdeki ilk satır — servis
       zincirinin okuduğu satır da o (bkz. servisAtama.js →
       makineninKaydi).

       "Bu dönem kaydedilen makine" ayrı bir harita kuruyordu: serinin
       DÖNEM İÇİNE düşen ilk satırı. İki satırın bayisi farklıysa aynı
       makine bir sütunda A bayisine, öbüründe B bayisine yazılıyor ve
       bir bayinin "bu dönem kaydedilen" sayısı "kayıtlı" sayısını
       geçebiliyordu — alt küme kümeden büyük çıkıyordu. Servisin elle
       açtığı kayıt bayisiz yeni bir satırı başa eklediği için durum
       gerçekten oluşuyor. Üç sütun da tek satıra dayanıyor. */
    const ilkSatir = new Map()
    for (const k of veri.makineler) {
      const s = seriOku(k.seri)
      if (s && !ilkSatir.has(s)) ilkSatir.set(s, k)
    }

    const say = (harita, anahtar) => harita.set(anahtar, (harita.get(anahtar) || 0) + 1)
    const atanan = new Map()
    const kayitli = new Map()
    const yeniKayit = new Map()
    const servisTalebi = new Map()
    for (const t of bayiDonem) if (t.bayi.id) say(atanan, t.bayi.id)
    for (const k of ilkSatir.values()) {
      if (!k.bayiId) continue
      say(kayitli, k.bayiId)
      if (donemde(k.tarih)) say(yeniKayit, k.bayiId)
    }
    for (const t of donem) {
      if (t.tur !== 'servis') continue
      const k = ilkSatir.get(seriOku(t.makine?.serial))
      if (k?.bayiId) say(servisTalebi, k.bayiId)
    }

    const bayiler = veri.bayiler || bayileriGetir()
    const bayiSatirlari = bayiler
      .map((b) => ({
        b,
        servisler: bayininServisleri(b.id),
        sayilar: [
          atanan.get(b.id) || 0,
          kayitli.get(b.id) || 0,
          yeniKayit.get(b.id) || 0,
          servisTalebi.get(b.id) || 0,
        ],
      }))
      .sort(
        (x, y) =>
          y.sayilar[1] - x.sayilar[1] ||
          y.sayilar[0] - x.sayilar[0] ||
          String(x.b.ad || '').localeCompare(String(y.b.ad || ''), 'tr'),
      )

    /* KATALOGDAN SİLİNMİŞ BAYİ KAYBOLMUYOR. Tablo yalnız bayi
       listesindeki bayilere satır açıyordu; silinmiş bir bayiye iletilmiş
       teklif "bayiye iletilen" ölçüsünde sayılıyor ama tabloda hiçbir
       satıra girmiyordu — aynı sekmede aynı şey için iki farklı sayı.
       Bayi listede yokken sayılar tek satırda toplanıyor. */
    const bilinen = new Set(bayiler.map((b) => b.id))
    const artan = (harita) => topla([...harita.entries()].filter(([id]) => !bilinen.has(id)).map(([, n]) => n))
    const listeDisi = [atanan, kayitli, yeniKayit, servisTalebi].map(artan)
    const tumSatirlar = listeDisi.some((n) => n > 0)
      ? [...bayiSatirlari, { b: { ad: M.listeDisiBayi, il: null }, servisler: [], sayilar: listeDisi, listeDisi: true }]
      : bayiSatirlari

    const bayiToplam = [0, 1, 2, 3].map((i) => topla(tumSatirlar.map((s) => s.sayilar[i])))

    const teklifSatirlari = [...donemTeklif]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((t) => {
        const gecikti = teklifBekliyorMu(t)
        return {
          hucreler: [
            t.no || '—',
            tarihYaz(t.createdAt, false),
            t.ad || '—',
            t.il || '—',
            talepModeli(t) || '—',
            t.bayi ? t.bayi.ad || '—' : M.kimdeMarka,
            tutarHucresi(t.teklif?.tutar),
            sonucAdi(sonucAnahtari(t)),
            tutarHucresi(t.cozum?.satisFiyati),
            sureHucresi(t),
          ],
          git: git ? () => git('talepler', { durum: 'hepsi', talep: t.id }) : undefined,
          vurgu: gecikti ? 'turuncu' : undefined,
        }
      })

    const tablolar = [
      {
        baslik: M.tabloBayi,
        aciklama: M.tabloBayiAciklama,
        basliklar: [
          M.sutunBayi.bayi, M.sutunBayi.il, M.sutunBayi.atanan, M.sutunBayi.makine,
          M.sutunBayi.yeniMakine, M.sutunBayi.servisTalebi, M.sutunBayi.servis,
        ],
        sag: [2, 3, 4, 5],
        satirlar: tumSatirlar.map(({ b, servisler, sayilar, listeDisi }) => ({
          hucreler: [
            b.ad || '—',
            b.il || '—',
            ...sayilar.map(String),
            listeDisi ? '—' : servisler.map((s) => s.ad).filter(Boolean).join(', ') || '—',
          ],
          git: git && !listeDisi ? () => git('bayiler') : undefined,
          vurgu: listeDisi || servisler.length ? undefined : 'turuncu',
        })),
        toplamSatiri: [M.toplam, '', ...bayiToplam.map(String), ''],
      },
      {
        baslik: M.tabloTeklif,
        aciklama: M.tabloTeklifAciklama,
        basliklar: [
          M.sutunTeklif.no, M.sutunTeklif.tarih, M.sutunTeklif.musteri, M.sutunTeklif.il,
          M.sutunTeklif.urun, M.sutunTeklif.kimde, M.sutunTeklif.tutar, M.sutunTeklif.sonuc,
          M.sutunTeklif.satisFiyati, M.sutunTeklif.sure,
        ],
        sag: [6, 8, 9],
        satirlar: teklifSatirlari,
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
