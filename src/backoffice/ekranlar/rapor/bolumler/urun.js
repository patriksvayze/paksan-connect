import { extractYear, GARANTI_YIL, normalizeSerial } from '../../../../lib/serial'
import { yapilanIsleri } from '../../../../lib/servisKaydi'
import { araligiCoz } from '../../suzgec'
import {
  fark, farkPuan, modelAdi, musteriTalebiMi, oran, RENK, servisZiyaretleri, talepModeli, yuzde,
} from '../hesap'

/* ==========================================================================
   Ürün Kalitesi — "Hangi makine ne sıklıkla arızalanıyor?"

   İmalatçının asıl sorusu. Cevabı ürün geliştirmeye ve üretimin
   denetimine doğrudan giriyor.

   6 EKİM 2026 SADELEŞTİ (kullanıcının isteği): "100 makineye düşen
   talep" ölçüsü her yerden kalktı (kutu, "Modellere göre" grafiği, iki
   tablonun sütunu), "Arıza bulunamadı" oranı kutusu ve bölümün alt
   açıklaması da. Aşağıdaki "HAM SAYI DEĞİL, ORAN" ve "EŞİK 5" bölümleri
   o ölçünün gerekçesiydi; geçmiş için duruyor. Model karnesi artık talep
   sayısına göre sıralanıyor.

   HAM SAYI DEĞİL, ORAN. 200 makinesi satılmış modelde 10 arıza, 20
   makinesi satılmış modelde 6 arızadan iyidir; ham sayı çok satan modeli
   hep "en kötü" gösterir. Ana ölçü bu yüzden "100 makinede servis
   talebi": dönemde açılan servis talebi ÷ kayıtlı makine × 100.

   KAYITLI MAKİNE = MAKİNE KAYIT DEFTERİ, DÖNEMİN SONUNDA. Müşterinin
   uygulamaya kaydettiği makineler; aynı seri defterde birden çok satırda
   olabildiği için seri tekilleştiriliyor. Taban dönemin SONUNDAKİ
   defter: geçen yılın bir ayı, o aydan sonra kaydedilen makinelerle
   bölünürse oran olduğundan iyi görünür. Servis talebi yalnız kayıtlı
   makineden açılabildiği için (bkz. lib/servisAtama.js) talebi olan her
   makine o gün defterde.

   AZ MAKİNELİ MODELDE ORAN YOK — EŞİK 5. Demo defterinde bir modelin
   kayıtlı makinesi 1 ile 6 arasında, çoğunda 3–4. Dört makinelik
   modelde tek talep oranı 25 puan oynatıyor; tek makinelik modelde bir
   talep "100 makinede 100" yazdırıyor. Bu, modelin kalitesini değil
   tesadüfü gösterir ve yönetici o sayıya bakıp üretime iş çıkarır.
   Eşiğin altındaki modelin talep sayısı yine görünüyor, oranı "—".

   İPTAL EDİLEN TALEP ARIZA SAYILMIYOR. İptal nedenleri "yanlış talep",
   "müşteri vazgeçti", "ulaşılamadı": makinenin arızasını değil talebin
   akıbetini anlatıyor. Kaç tanesinin dışarıda kaldığı ölçünün altında
   yazılı.

   GARANTİ DURUMU TALEBİN AÇILDIĞI YILA GÖRE. lib/serial.js →
   warrantyStatus bugünün yılına bakıyor (müşteri ekranı için doğru).
   Geçmiş bir dönemin raporunda "o gün garantideydi mi" sorulduğu için
   aynı kural (üretim yılı + GARANTI_YIL, o yılın sonuna kadar) talebin
   açıldığı yıla uygulanıyor.
   ========================================================================== */

const M = {
  ad: 'Ürün Kalitesi',

  talep: 'Servis talebi (iptal hariç)',
  talepAlt: (iptal) => (iptal ? `Seçilen dönemde açılan · iptal edilen ${iptal} talep sayılmadı` : 'Seçilen dönemde açılan'),
  makine: 'Arıza bildirilen makine',
  makineAlt: 'Seri numarasına göre farklı makine sayısı; seri numarası olmayan talepler hariç',
  tekrar: 'Tekrar arızalanan makine',
  tekrarAlt: 'Seçilen dönemde en az iki talebi olan ya da bu dönemdeki talebinde sorunun sürdüğü bildirilen',
  garanti: 'Garanti süresindeki arıza',
  garantiAlt: (bilinmeyen) =>
    bilinmeyen
      ? `Arıza bildirilen makinelerden · üretim yılı okunamayan ${bilinmeyen} makine hesap dışında`
      : 'Arıza bildirilen makinelerden talebin açıldığı yıl garantisi sürenlerin oranı',

  grafikBelirti: 'En sık bildirilen belirtiler',
  grafikBelirtiAlt: 'Seçilen dönemde açılan servis taleplerinde müşterinin seçtiği belirtiler',

  tabloModel: 'Model karnesi',
  tabloModelAciklama:
    'Talepler seçilen dönemde açılan, iş ve parça seçilen dönemde yapılan servis ziyaretlerinden.',
  tabloYil: 'Üretim yılına göre',
  /* Eşikten söz etmiyordu: kayıtlı makinesi beşten az olan yıl sessizce
     "—" gösteriyor, yönetici aynı biçimdeki iki satırdan birinin neden
     sayı, öbürünün neden boş olduğunu ekrandan öğrenemiyordu. Notlar da
     eşiği yalnız model başına orana bağlıyordu. */
  tabloYilAciklama: 'Üretim yılı seri numarasından okunur.',
  sutun: {
    model: 'Model', kayitli: 'Kayıtlı makine (dönem sonu)', talep: 'Servis talebi (iptal hariç)',
    makine: 'Arıza bildirilen makine', tekrar: 'Tekrar arızalanan', belirti: 'En sık belirti',
    is: 'En sık yapılan iş', parca: 'En çok değişen parça',
    yil: 'Üretim yılı',
  },
  modelYok: 'Model bilinmiyor',
  yilYok: 'Okunamadı',
  toplam: 'Toplam',

  notlar: [
    'Servis talebi (iptal hariç): seçilen dönemde açılan servis talepleri. İptal edilen talep sayılmaz; yanlış açılmış ya da müşterinin vazgeçtiği bir talep, tek başına arıza olduğunu göstermez. Bu yüzden öteki sekmelerdeki "servis talebi" sayısından (iptal dahil) küçük olabilir.',
    'Arıza bildirilen makine: bu taleplerin geldiği farklı makine sayısı (seri numarasına göre). Seri numarası yazılmamış talep makine sayısına girmez.',
    'Kayıtlı makine (dönem sonu): müşterilerin uygulamaya kaydettiği makineler, seçilen dönemin sonundaki hâliyle. Aynı seri numarası bir kez sayılır.',
    'Tekrar arızalanan makine: seçilen dönemde iki ya da daha çok servis talebi gelen, ya da talebinde müşterinin "sorun devam ediyor" dediği makineler.',
    'İptal edilen taleplerin servis ziyaretleri de iş, parça ve ziyaret sayımlarına dahil edilmez. Talep sayan ölçülerdeki iptal istisnası bu hesaplarda da geçerlidir.',
    `Garanti süresindeki arıza: arıza bildirilen makinelerden, talebin açıldığı yıl garantisi süren makinelerin payı. Garanti, seri numarasındaki üretim yılından ${GARANTI_YIL} yıl sonrasının sonuna kadar sayılır. Üretim yılı okunamayan makine paydaya girmez.`,
    'En sık yapılan iş: seçilen dönemdeki servis ziyaretlerinde kaydedilen işler arasında en sık yapılan iş. Yapılan işi henüz kaydedilmeyen ziyaretler sayılmaz.',
    'En çok değişen parça: seçilen dönemdeki bütün servis ziyaretlerinde kaydedilen parçalar arasında adedi en yüksek olan parça. Garanti işinin ilk aşamasında servis parçayı ister ve parça gönderilir; yapılan iş henüz kaydedilmemiş olsa da bu parça sayılır.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

function seriAl(t) {
  return normalizeSerial(t?.makine?.serial) || null
}

/* Makine kayıt defteri, tekil seri → { productId, tarih }. Aynı seri
   birden çok satırdaysa ilk kaydın tarihi geçerli. Tarihi olmayan satır
   her dönemin tabanına giriyor: ne zaman kaydedildiği bilinmiyor diye
   makineyi yok saymak tabanı olduğundan küçük gösterirdi. */
function kayitDefteri(makineler) {
  const harita = new Map()
  for (const k of makineler || []) {
    const seri = normalizeSerial(k.seri)
    if (!seri) continue
    const tarih = Number.isFinite(k.tarih) ? k.tarih : null
    const onceki = harita.get(seri)
    if (!onceki) {
      harita.set(seri, { seri, productId: k.productId || null, tarih })
      continue
    }
    if (!onceki.productId && k.productId) onceki.productId = k.productId
    if (onceki.tarih !== null && (tarih === null || tarih < onceki.tarih)) onceki.tarih = tarih
  }
  return [...harita.values()]
}

function tabanda(kayit, sinir) {
  return kayit.tarih === null || kayit.tarih <= sinir
}

/* "Zincir atıyor (5)". Parça KODA göre sayılıyor (katalogda aynı adı
   taşıyan birden çok parça var) ve adıyla, adet olduğu için "İPLİ
   BIÇAK × 2" biçiminde yazılıyor (bkz. lib/servisKaydi.js → parcaYazisi). */
function enSik(sayim, adlar = null) {
  const ilk = [...sayim.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!ilk) return '—'
  return adlar ? `${adlar.get(ilk[0]) || ilk[0]} × ${ilk[1]}` : `${ilk[0]} (${ilk[1]})`
}

function say(harita, anahtar, n = 1) {
  harita.set(anahtar, (harita.get(anahtar) || 0) + n)
}

/* Dönemde açılan servis taleplerinin makine özeti. */
function makineOzeti(talepler) {
  const seriSayim = new Map()
  const yenidenAcilan = new Set()
  for (const t of talepler) {
    const seri = seriAl(t)
    if (!seri) continue
    say(seriSayim, seri)
    if (Array.isArray(t.tekrar) && t.tekrar.length) yenidenAcilan.add(seri)
  }
  const tekrar = [...seriSayim.keys()].filter((s) => seriSayim.get(s) > 1 || yenidenAcilan.has(s))
  return { makine: seriSayim.size, tekrar: tekrar.length }
}

/* Talep açıldığı yıl makine garantideydi mi? null: üretim yılı okunamadı. */
function garantideMi(t) {
  const yil = extractYear(t?.makine?.serial)
  if (!yil || !Number.isFinite(t.createdAt)) return null
  return new Date(t.createdAt).getFullYear() <= yil + GARANTI_YIL
}

export const urunBolumu = {
  id: 'urun',
  ad: M.ad,

  uret({ veri, aralik, donem, onceki, donemde, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)

    const servisMi = (t) => t.tur === 'servis' && musteriTalebiMi(t)
    const sayilir = (t) => servisMi(t) && t.status !== 'iptal'
    const talepler = donem.filter(sayilir)
    const oncekiTalepler = onceki.filter(sayilir)
    const iptalSayisi = donem.filter((t) => servisMi(t) && t.status === 'iptal').length

    /* Taban: dönemin sonunda (ve önceki dönemin sonunda) defterdeki makineler. */
    const { bit } = araligiCoz(aralik)
    const donemSonu = Math.min(bit, Date.now())
    const defter = kayitDefteri(veri.makineler)
    const taban = defter.filter((k) => tabanda(k, donemSonu))

    /* SERVİS ZİYARETLERİ İKİ LİSTE; DÖNEM İKİSİNDE DE ZİYARETİN KENDİ
       TARİHİ.

         parcaZiyaretleri  bütün ziyaretler — parça sayımı buradan
         ziyaretler        yalnız işi yazılmış olanlar — iş sayımı ve
                           "Arıza bulunamadı" oranı buradan

       İKİSİ NEDEN AYRILDI (17 Eylül 2026). Tek liste vardı ve `yapilanIs`
       dolu olanlara süzülüyordu. Süzgeç iş sütunu için doğru; parça
       sütunu için gerçek veriyi siliyordu: garanti işinin 1. aşamasında
       servis parçayı istiyor, PAKSAN parçayı gönderiyor ve iş henüz
       yazılmamış oluyor. Son 30 günde dönemdeki parçanın dörtte biri
       böyle düşüyor, PAKSAN'ın gerçekten gönderdiği parçalar model
       karnesinde "—" görünüyordu.

       İPTAL EDİLEN TALEP ARIZA SAYILMIYOR (dosya başı) — ziyaret sayan
       hesaplarda da öyle. Talep sayan ölçüler iptali dışarıda bırakıyor,
       ziyaret sayanlar bırakmıyordu ve bu ayrım hiçbir yerde yazılı
       değildi. */
    const tumZiyaretler = veri.talepler.filter(sayilir).flatMap(servisZiyaretleri)
    const parcaZiyaretleri = tumZiyaretler.filter((z) => donemde(z.tarih))
    /* Yapılan iş 6 Ekim 2026'dan beri çok seçimli: her seçim ayrı
       sayılıyor (lib/servisKaydi.js → yapilanIsleri). */
    const ziyaretler = tumZiyaretler.filter((z) => yapilanIsleri(z.yapilanIs).length && donemde(z.tarih))

    /* ------------------------------------------------------- Ölçüler */

    const ozet = makineOzeti(talepler)
    const oncekiOzet = makineOzeti(oncekiTalepler)

    /* Garanti: makine başına; dönemdeki taleplerinden biri garanti
       süresindeyse o makine garantide arızalanmış sayılıyor. */
    const garantiOzeti = (liste) => {
      const durum = new Map()
      for (const t of liste) {
        const seri = seriAl(t)
        if (!seri) continue
        const g = garantideMi(t)
        if (g === null) {
          if (!durum.has(seri)) durum.set(seri, null)
          continue
        }
        durum.set(seri, Boolean(durum.get(seri)) || g)
      }
      const degerler = [...durum.values()]
      const bilinen = degerler.filter((d) => d !== null)
      return {
        bilinen: bilinen.length,
        garantide: bilinen.filter(Boolean).length,
        bilinmeyen: degerler.length - bilinen.length,
      }
    }
    const gd = garantiOzeti(talepler)
    const gdOnceki = garantiOzeti(oncekiTalepler)

    const olculer = [
      {
        ad: M.talep,
        deger: talepler.length,
        fark: f(talepler.length, oncekiTalepler.length),
        iyi: 'azalis',
        alt: M.talepAlt(iptalSayisi),
      },
      {
        ad: M.makine,
        deger: ozet.makine,
        fark: f(ozet.makine, oncekiOzet.makine),
        iyi: 'azalis',
        alt: M.makineAlt,
      },
      {
        ad: M.tekrar,
        deger: ozet.tekrar,
        fark: f(ozet.tekrar, oncekiOzet.tekrar),
        iyi: 'azalis',
        alt: M.tekrarAlt,
      },
      {
        ad: M.garanti,
        deger: yuzde(gd.garantide, gd.bilinen),
        fark: karsilastir ? farkPuan(oran(gd.garantide, gd.bilinen), oran(gdOnceki.garantide, gdOnceki.bilinen)) : null,
        farkBirim: 'puan',
        iyi: null,
        alt: M.garantiAlt(gd.bilinmeyen),
      },
    ]

    /* ------------------------------------------------ Model karnesi */

    const modeller = new Map()
    const model = (ad) => {
      if (!modeller.has(ad)) {
        modeller.set(ad, {
          ad, kayitli: 0, talepler: [], belirti: new Map(), is: new Map(), parca: new Map(), parcaAd: new Map(),
        })
      }
      return modeller.get(ad)
    }
    for (const k of taban) model(modelAdi(k.productId) || M.modelYok).kayitli++
    for (const t of talepler) {
      const m = model(talepModeli(t) || M.modelYok)
      m.talepler.push(t)
      for (const b of t.belirtiler || []) if (b) say(m.belirti, b)
    }
    for (const z of ziyaretler) {
      const m = model(talepModeli(z.talep) || M.modelYok)
      for (const is of yapilanIsleri(z.yapilanIs)) say(m.is, is)
    }
    for (const z of parcaZiyaretleri) {
      const m = model(talepModeli(z.talep) || M.modelYok)
      for (const p of z.parcalar) {
        const adet = Number(p?.adet) || 0
        if (!p?.ad || adet <= 0) continue
        const anahtar = p.kod || p.ad
        say(m.parca, anahtar, adet)
        m.parcaAd.set(anahtar, p.ad)
      }
    }

    const karne = (m) => {
      const mo = makineOzeti(m.talepler)
      return {
        hucreler: [
          String(m.kayitli),
          String(m.talepler.length),
          String(mo.makine),
          String(mo.tekrar),
          enSik(m.belirti),
          enSik(m.is),
          enSik(m.parca, m.parcaAd),
        ],
      }
    }

    const sirali = [...modeller.values()]
      .map((m) => ({ m, k: karne(m) }))
      .sort((a, b) => b.m.talepler.length - a.m.talepler.length || b.m.kayitli - a.m.kayitli)

    const modelGit = (ad) =>
      git && ad !== M.modelYok
        ? () => git('talepler', { durum: 'hepsi', tur: 'servis', makine: ad, aralik })
        : undefined

    /* Toplam satırı: bütün modeller tek model gibi. */
    const hepsi = {
      kayitli: taban.length, talepler, belirti: new Map(), is: new Map(), parca: new Map(), parcaAd: new Map(),
    }
    for (const m of modeller.values()) {
      for (const [k, n] of m.belirti) say(hepsi.belirti, k, n)
      for (const [k, n] of m.is) say(hepsi.is, k, n)
      for (const [k, n] of m.parca) {
        say(hepsi.parca, k, n)
        hepsi.parcaAd.set(k, m.parcaAd.get(k))
      }
    }

    /* ------------------------------------------------------ Grafikler */

    const belirtiSayim = hepsi.belirti
    const grafikler = [
      {
        tur: 'yatay',
        baslik: M.grafikBelirti,
        alt: M.grafikBelirtiAlt,
        renk: RENK.bir,
        satirlar: [...belirtiSayim.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([ad, n]) => ({ ad, deger: n })),
      },
    ]

    /* ------------------------------------------------ Üretim yılına göre */

    const yillar = new Map()
    const yil = (anahtar) => {
      if (!yillar.has(anahtar)) yillar.set(anahtar, { kayitli: 0, talep: 0 })
      return yillar.get(anahtar)
    }
    for (const k of taban) yil(extractYear(k.seri) || 0).kayitli++
    /* Seri numarası yazılmamış talep de "Okunamadı" satırında sayılıyor;
       dışarıda kalsaydı toplam satırı kutudaki talep sayısından ve
       orandan ayrışırdı. */
    for (const t of talepler) yil(extractYear(seriAl(t)) || 0).talep++
    const yilSatiri = (y) => [
      String(y.kayitli),
      String(y.talep),
    ]
    /* Toplam satırları kutuyla aynı değişkenlerden (bkz. Grafikler). */
    const karneToplami = karne(hepsi).hucreler

    const tablolar = [
      {
        baslik: M.tabloModel,
        aciklama: M.tabloModelAciklama,
        basliklar: [
          M.sutun.model, M.sutun.kayitli, M.sutun.talep, M.sutun.makine,
          M.sutun.tekrar, M.sutun.belirti, M.sutun.is, M.sutun.parca,
        ],
        sag: [1, 2, 3, 4],
        satirlar: sirali.map(({ m, k }) => ({
          hucreler: [m.ad, ...k.hucreler],
          git: modelGit(m.ad),
        })),
        toplamSatiri: [M.toplam, ...karneToplami],
      },
      {
        baslik: M.tabloYil,
        aciklama: M.tabloYilAciklama,
        basliklar: [M.sutun.yil, M.sutun.kayitli, M.sutun.talep],
        sag: [1, 2],
        satirlar: [...yillar.entries()]
          .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : b[0] - a[0]))
          .map(([y, d]) => ({ hucreler: [y ? String(y) : M.yilYok, ...yilSatiri(d)] })),
        toplamSatiri: [M.toplam, String(taban.length), String(talepler.length)],
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
