import { extractYear, GARANTI_YIL, normalizeSerial } from '../../../../lib/serial'
import { YAPILAN_IS } from '../../../../lib/servisKaydi'
import { araligiCoz } from '../../suzgec'
import { codexBekliyor } from '../metin'
import {
  fark, farkPuan, modelAdi, musteriTalebiMi, ondalik, oran, RENK, servisZiyaretleri, talepModeli, yuzde,
} from '../hesap'

/* ==========================================================================
   Ürün Kalitesi — "Hangi makine ne sıklıkla arızalanıyor?"

   İmalatçının asıl sorusu. Cevabı ürün geliştirmeye ve üretimin
   denetimine doğrudan giriyor.

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

const M = codexBekliyor({
  ad: 'Ürün Kalitesi',
  soru: 'Hangi makine ne sıklıkla arızalanıyor?',

  talep: 'Servis talebi (iptal hariç)',
  talepAlt: (iptal) => (iptal ? `Seçilen dönemde açılan · ${iptal} iptal edilen sayılmadı` : 'Seçilen dönemde açılan'),
  makine: 'Arıza bildirilen makine',
  makineAlt: 'Servis talebi açılan farklı makine',
  oran: 'Bütün makinelerde 100 makineye düşen talep',
  oranAlt: (taban) => `Dönem sonunda kayıtlı ${taban} makinenin hepsine göre · modellere göre dağılımı grafikte`,
  tekrar: 'Tekrar arızalanan makine',
  tekrarAlt: 'Dönemde ikinci talebi gelen ya da talebi yeniden açılan',
  arizaYok: '"Arıza bulunamadı" oranı',
  arizaYokAlt: (n) => `${n} servis ziyaretinde · yüksekse gereksiz ziyaret var demektir`,
  garanti: 'Garanti süresindeki arıza',
  garantiAlt: (bilinmeyen) =>
    bilinmeyen
      ? `Arıza bildirilen makinelerden · ${bilinmeyen} makinenin üretim yılı okunamadı`
      : 'Arıza bildirilen makinelerden garantisi sürenler',

  grafikOran: 'Modellere göre 100 makineye düşen talep',
  grafikOranAlt: (esik, gizli, ortalamaVar) =>
    (ortalamaVar
      ? `"Bütün makineler" satırı, grafikte olmayan modeller de dahil bütün makinelerin oranı; üstündeki model bu ortalamadan kötü, altındaki iyi. `
      : '') +
    (gizli
      ? `Kayıtlı makinesi ${esik} makineden az olan ${gizli} model gösterilmiyor: birkaç makinelik modelde tek talep oranı çok oynatır, bu da modelin kalitesini değil tesadüfü gösterir. Bu modellerin talep sayısı model karnesinde. `
      : '') +
    'Bir satıra tıklayınca o modelin talepleri açılır.',
  grafikModel: 'Model',
  grafikHepsi: 'Bütün makineler',
  grafikBelirti: 'En sık bildirilen belirtiler',
  grafikBelirtiAlt: 'Seçilen dönemde açılan servis taleplerinde müşterinin seçtiği belirtiler',

  tabloModel: 'Model karnesi',
  tabloModelAciklama: (esik) =>
    `Talepler seçilen dönemde açılan, iş ve parça seçilen dönemde yapılan servis ziyaretlerinden. Oran yalnız kayıtlı makinesi en az ${esik} olan modelde gösteriliyor. Toplam satırı yukarıdaki "Bütün makinelerde" kutusuyla aynı sayıdır.`,
  tabloYil: 'Üretim yılına göre',
  /* Eşikten söz etmiyordu: kayıtlı makinesi beşten az olan yıl sessizce
     "—" gösteriyor, yönetici aynı biçimdeki iki satırdan birinin neden
     sayı, öbürünün neden boş olduğunu ekrandan öğrenemiyordu. Notlar da
     eşiği yalnız model başına orana bağlıyordu. */
  tabloYilAciklama: (esik) =>
    `Üretim yılı seri numarasından okunuyor. Eski makine daha çok servis istiyorsa oran yıllar geriye gittikçe artar. Oran yalnız kayıtlı makinesi en az ${esik} olan üretim yılında gösteriliyor. Toplam satırı yukarıdaki "Bütün makinelerde" kutusuyla aynı sayıdır.`,
  sutun: {
    model: 'Model', kayitli: 'Kayıtlı makine (dönem sonu)', talep: 'Servis talebi (iptal hariç)',
    oran: '100 makineye düşen talep',
    makine: 'Arıza bildirilen makine', tekrar: 'Tekrar arızalanan', belirti: 'En sık belirti',
    is: 'En sık yapılan iş', parca: 'En çok değişen parça',
    yil: 'Üretim yılı',
  },
  modelYok: 'Model bilinmiyor',
  yilYok: 'Okunamadı',
  toplam: 'Toplam',

  notlar: (esik) => [
    'Servis talebi (iptal hariç): seçilen dönemde açılan servis talepleri. İptal edilen talep sayılmaz; yanlış açılmış ya da müşterinin vazgeçtiği talep makinenin arızası değildir. Bu yüzden öteki sekmelerdeki "servis talebi" sayısından (iptal dahil) küçük olabilir.',
    'Arıza bildirilen makine: bu taleplerin geldiği farklı makine sayısı (seri numarasına göre). Seri numarası yazılmamış talep makine sayısına girmez.',
    'Kayıtlı makine (dönem sonu): müşterilerin uygulamaya kaydettiği makineler, seçilen dönemin sonundaki hâliyle. Aynı seri numarası bir kez sayılır.',
    `100 makineye düşen talep: servis talebi (iptal hariç) ÷ kayıtlı makine × 100. "Bütün makinelerde" kutusu bütün makineleri birlikte sayar; grafik ve model karnesi aynı hesabı her model için ayrı yapar. Kutudaki sayı, grafikteki "Bütün makineler" satırı ve iki tablonun toplam satırı birebir aynıdır. Model ve üretim yılı başına oran yalnız kayıtlı makinesi en az ${esik} olan satırda gösterilir: dört makinelik bir modelde tek talep oranı 25 puan oynatır, bu da modelin kalitesini değil tesadüfü gösterir. "Bütün makinelerde" kutusu bu eşikten geçmez, çünkü orada bütün defter paydadır.`,
    'Tekrar arızalanan makine: seçilen dönemde iki ya da daha çok servis talebi gelen, ya da talebinde müşterinin "sorun devam ediyor" dediği makineler.',
    '"Arıza bulunamadı" oranı: tarihi seçilen döneme düşen servis ziyaretlerinden, yapılan iş "Arıza Bulunamadı" yazılanların payı. İlk kurulum ziyaretleri ve işi henüz yazılmamış ziyaretler hesaba girmez.',
    'Ziyaret sayan sütunlar da iptal edilen talebi dışarıda bırakır; talep sayan ölçülerle aynı kural.',
    `Garanti süresindeki arıza: arıza bildirilen makinelerden, talebin açıldığı yıl garantisi süren makinelerin payı. Garanti, seri numarasındaki üretim yılından ${GARANTI_YIL} yıl sonrasının sonuna kadar sayılır. Üretim yılı okunamayan makine paydaya girmez.`,
    'En sık yapılan iş: tarihi seçilen döneme düşen servis ziyaretlerinden, yalnız işi yazılmış olanlar.',
    'En çok değişen parça: tarihi seçilen döneme düşen bütün servis ziyaretlerinden, adet olarak. Garanti işinin ilk aşamasında servis parçayı istiyor ve parça gönderiliyor; iş henüz yazılmamış olsa da o parça sayılır.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
})

/* Oranın gösterildiği en küçük kayıtlı makine sayısı (gerekçesi dosya başında). */
const ESIK = 5

const ARIZA_YOK = 'Arıza Bulunamadı'
const KURULUM = YAPILAN_IS[0]

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

/** 100 makinede talep; kırılımlarda taban eşiğin altındaysa null.
 *
 * EŞİK YALNIZ KIRILIMLARDA (17 Eylül 2026). Eşik, birkaç makinelik bir
 * MODELDE tek talebin oranı otuz puan oynatmasına karşı konmuştu; ama
 * "Bütün makinelerde" kutusu da aynı kapıdan geçiyordu. Dönem sonunda
 * defterde beşten az makine varsa kutu, grafikteki "Bütün makineler"
 * satırı ve iki tablonun toplam satırı birden "—" oluyor, üstelik
 * kutunun alt yazısı paydayı ("kayıtlı 4 makinenin hepsine göre")
 * yazdığı hâlde sonuç boş kalıyordu. Notlar eşiği model başına orana
 * bağlıyor; kutu artık eşiksiz hesaplanıyor.
 */
function yuzMakinede(talep, taban, esikUygula = true) {
  if (!taban) return null
  if (esikUygula && taban < ESIK) return null
  return (talep / taban) * 100
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
  soru: M.soru,

  uret({ veri, aralik, donem, onceki, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)

    const servisMi = (t) => t.tur === 'servis' && musteriTalebiMi(t)
    const sayilir = (t) => servisMi(t) && t.status !== 'iptal'
    const talepler = donem.filter(sayilir)
    const oncekiTalepler = onceki.filter(sayilir)
    const iptalSayisi = donem.filter((t) => servisMi(t) && t.status === 'iptal').length

    /* Taban: dönemin sonunda (ve önceki dönemin sonunda) defterdeki makineler. */
    const { bas, bit } = araligiCoz(aralik)
    const donemSonu = Math.min(bit, Date.now())
    const defter = kayitDefteri(veri.makineler)
    const taban = defter.filter((k) => tabanda(k, donemSonu))
    const oncekiTaban = karsilastir ? defter.filter((k) => tabanda(k, bas - 1)).length : 0

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
    const yazilmisZiyaretler = tumZiyaretler.filter((z) => YAPILAN_IS.includes(z.yapilanIs))
    const ziyaretler = yazilmisZiyaretler.filter((z) => donemde(z.tarih))

    /* ------------------------------------------------------- Ölçüler */

    const ozet = makineOzeti(talepler)
    const oncekiOzet = makineOzeti(oncekiTalepler)

    const oranDonem = yuzMakinede(talepler.length, taban.length, false)
    const oranOnceki = yuzMakinede(oncekiTalepler.length, oncekiTaban, false)

    const arizaYokOrani = (liste) => {
      const olcu = liste.filter((z) => z.yapilanIs !== KURULUM)
      return { n: olcu.length, bulunamadi: olcu.filter((z) => z.yapilanIs === ARIZA_YOK).length }
    }
    const ay = arizaYokOrani(ziyaretler)
    const ayOnceki = arizaYokOrani(yazilmisZiyaretler.filter((z) => oncekide(z.tarih)))

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
        ad: M.oran,
        deger: ondalik(oranDonem),
        fark: f(oranDonem, oranOnceki),
        iyi: 'azalis',
        alt: M.oranAlt(taban.length),
      },
      {
        ad: M.tekrar,
        deger: ozet.tekrar,
        fark: f(ozet.tekrar, oncekiOzet.tekrar),
        iyi: 'azalis',
        alt: M.tekrarAlt,
      },
      {
        ad: M.arizaYok,
        deger: yuzde(ay.bulunamadi, ay.n),
        fark: karsilastir ? farkPuan(oran(ay.bulunamadi, ay.n), oran(ayOnceki.bulunamadi, ayOnceki.n)) : null,
        farkBirim: 'puan',
        iyi: 'azalis',
        alt: M.arizaYokAlt(ay.n),
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
    for (const z of ziyaretler) say(model(talepModeli(z.talep) || M.modelYok).is, z.yapilanIs)
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
        oran: yuzMakinede(m.talepler.length, m.kayitli),
        hucreler: [
          String(m.kayitli),
          String(m.talepler.length),
          ondalik(yuzMakinede(m.talepler.length, m.kayitli)),
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
      .sort((a, b) => {
        if (a.k.oran === null && b.k.oran !== null) return 1
        if (b.k.oran === null && a.k.oran !== null) return -1
        if (a.k.oran !== b.k.oran) return (b.k.oran || 0) - (a.k.oran || 0)
        return b.m.talepler.length - a.m.talepler.length
      })

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

    /* AYNI ADLA İKİ SAYI YOKTU AMA ÖYLE GÖRÜNÜYORDU (17 Eylül 2026,
       kullanıcının şikâyeti). Ölçü kutusu ile grafik ikisi de "100
       makinede servis talebi" adını taşıyordu: kutu bütün makineleri
       birlikte (41 ÷ 44 → 93,2), grafik her modeli ayrı sayıyordu
       (Scorpion 9 ÷ 6 → 150,0; Kırlangıç 3 ÷ 6 → 50,0) ve eşiğin
       altındaki on üç model grafikte yoktu. Hesapların ikisi de
       doğruydu (ham veriden elle sayıldı); yanlış olan, iki ayrı
       sorunun aynı adla sorulmasıydı. Şimdi kutu "Bütün makinelerde",
       grafik "Modellere göre" diyor; grafikte bütün makinelerin
       ortalaması nötr renkli ayrı bir satır olarak da duruyor ve
       modeller onunla aynı sırada dizildiği için hangi modelin
       ortalamanın üstünde kaldığı okunuyor. Kutu, bu satır ve iki
       tablonun toplam satırı AYNI değişkenden (oranDonem) yazılıyor. */
    const modelSatirlari = sirali
      .filter(({ k }) => k.oran !== null)
      .map(({ m, k }) => ({
        ad: m.ad,
        deger: k.oran,
        degerYazi: ondalik(k.oran),
        onSec: modelGit(m.ad),
      }))
    const gizliModel = sirali.filter(({ k }) => k.oran === null).length
    const oranSatirlari = [...modelSatirlari]
    if (oranDonem !== null && modelSatirlari.length) {
      const yer = modelSatirlari.findIndex((s) => s.deger < oranDonem)
      oranSatirlari.splice(yer === -1 ? modelSatirlari.length : yer, 0, {
        ad: M.grafikHepsi,
        deger: oranDonem,
        degerYazi: ondalik(oranDonem),
        renk: RENK.notr,
        onSec: git ? () => git('talepler', { durum: 'hepsi', tur: 'servis', aralik }) : undefined,
      })
    }

    const ortalamaVar = oranSatirlari.length > modelSatirlari.length
    const belirtiSayim = hepsi.belirti
    const grafikler = [
      {
        tur: 'yatay',
        baslik: M.grafikOran,
        alt: M.grafikOranAlt(ESIK, gizliModel, ortalamaVar),
        renk: RENK.bir,
        anahtar: ortalamaVar
          ? [{ ad: M.grafikModel, renk: RENK.bir }, { ad: M.grafikHepsi, renk: RENK.notr }]
          : undefined,
        satirlar: oranSatirlari,
      },
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
      ondalik(yuzMakinede(y.talep, y.kayitli)),
    ]
    /* Toplam satırları kutuyla aynı değişkenlerden (bkz. Grafikler). */
    const karneToplami = karne(hepsi).hucreler
    karneToplami[2] = ondalik(oranDonem)

    const tablolar = [
      {
        baslik: M.tabloModel,
        aciklama: M.tabloModelAciklama(ESIK),
        basliklar: [
          M.sutun.model, M.sutun.kayitli, M.sutun.talep, M.sutun.oran, M.sutun.makine,
          M.sutun.tekrar, M.sutun.belirti, M.sutun.is, M.sutun.parca,
        ],
        sag: [1, 2, 3, 4, 5],
        satirlar: sirali.map(({ m, k }) => ({
          hucreler: [m.ad, ...k.hucreler],
          git: modelGit(m.ad),
        })),
        toplamSatiri: [M.toplam, ...karneToplami],
      },
      {
        baslik: M.tabloYil,
        aciklama: M.tabloYilAciklama(ESIK),
        basliklar: [M.sutun.yil, M.sutun.kayitli, M.sutun.talep, M.sutun.oran],
        sag: [1, 2, 3],
        satirlar: [...yillar.entries()]
          .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : b[0] - a[0]))
          .map(([y, d]) => ({ hucreler: [y ? String(y) : M.yilYok, ...yilSatiri(d)] })),
        toplamSatiri: [M.toplam, String(taban.length), String(talepler.length), ondalik(oranDonem)],
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar(ESIK) }
  },
}
