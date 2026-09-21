import { cevapsizlar, cozuldu, sorular, yonlendirme } from '../../DestekKayitlari'
import { tarihYaz } from '../../ortak'
import {
  fark, farkPuan, kovayaDagit, modelAdi, ondalik, oran, RENK, yuzde, zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Destek Asistanı — "Müşteri uygulamada ne arıyor, nerede cevapsız kalıyor?"

   Destek ekranı kılavuzlardan cevap veren asistan (bkz.
   screens/Support.jsx). Konuşmaların kaydı uygulamada tutuluyor (bkz.
   lib/destekLog.js); bu bölüm yalnız o kaydı OKUYOR. Oturumun biçimi
   DestekKayitlari.jsx içindeki yardımcılarda biliniyor, burada kopyası
   yok: iki ekran aynı konuşmayı iki ayrı yoldan saymasın.

   DÖNEM KONUŞMANIN KENDİ TARİHİNE GÖRE. Destek oturumu bir talep değil;
   `baslangic` alanına bakılıyor, `donem` (dönemde açılan talepler)
   kullanılmıyor.

   HER KONUŞMA TEK SONUCA DÜŞÜYOR. Bir konuşmada hem "çözüldü" hem talep
   olabiliyor: ilk soru ekranda çözülür, ikincisi için servis çağrılır.
   İki seride birden sayılsaydı sütunun boyu konuşma sayısından büyük
   çıkardı. Sıra Destek Kayıtları ekranının Sonuç süzgeciyle aynı:
     1  talebe döndüyse  "Talebe dönen" — müşterinin attığı en ağır adım,
                         asistanın o konuşmada yetmediğinin açık kanıtı
     2  cevapsız sorusu kalmadıysa ve müşteri "çözüldü" dediyse
                         "Ekranda çözülen"
     3  kalanı           "Diğer" — çözülmedi ya da yarıda kaldı
   Ölçü, grafik ve tablo aynı kuralla sayıyor; grafiğe tıklayınca açılan
   listede de ayrım aynı.

   "EN ÇOK KONUŞULAN KONU" SÜTUNU YOK. Eski rapor `konu` olayına
   bakıyordu; yeni asistan o olayı yazmıyor ve sütun hep boş kalıyordu.

   KVKK. Cevapsız sorular tablosunda müşterinin adı ve telefonu yok;
   kimin sorduğu, satıra tıklayınca açılan Destek Kayıtları ekranında.
   ========================================================================== */

const M = {
  ad: 'Destek Asistanı',
  soru: 'Müşteri uygulamada ne arıyor, nerede cevapsız kalıyor?',

  konusma: 'Destek konuşması',
  konusmaAlt: 'Seçilen dönemde başlayan konuşmalar',
  soruSayisi: 'Sorulan soru',
  soruSayisiAlt: 'Müşterinin yazdığı ya da seçtiği sorular',
  cevapsiz: 'Cevapsız kalan soru',
  cevapsizAlt: 'Asistanın cevap bulamadığı veya müşterinin sorunun sürdüğünü belirttiği sorular',
  talebeDonen: 'Talebe dönen konuşma',
  talebeDonenAlt: (pay) => `Talep açma düğmesine basılan konuşmaların payı: ${pay}; formun gönderildiğini göstermez`,
  /* Oran. Grafikteki "Ekranda çözülen" dilimi ADET; aynı ad iki ayrı
     ölçüyü göstermesin. */
  cozulen: 'Ekranda çözülme oranı',
  /* Alt yazı hesabın üç şartından yalnız birini söylüyordu; notlardaki
     doğru tanım açılır panelin içinde, sayının yanındaki tek açıklama
     ise bu satır. Müşteri "çözüldü" dedikten sonra ikinci bir soru
     sorup cevapsız kalırsa konuşma çözülmüş sayılmıyor ve ekranda
     alt yazının tarifine göre %100 beklenen yerde %50 yazıyordu. */
  cozulenAlt: 'Müşterinin "çözüldü" dediği, talebe dönmemiş ve cevapsız sorusu kalmamış konuşmaların tüm konuşmalara oranı',
  basinaSoru: 'Konuşma başına soru',
  basinaSoruAlt: 'Bir konuşmada sorulan ortalama soru sayısı',

  grafikKonusma: 'Destek konuşmaları',
  grafikKonusmaAlt: 'Her konuşma tek sonuçla sayılır. Bir sütuna tıklayınca Destek Kayıtları açılır.',
  seri: {
    cozuldu: 'Ekranda çözülen',
    talep: 'Talebe dönen',
    diger: 'Diğer',
  },
  grafikCevapsiz: 'Makinelere göre cevapsız soru',
  /* Grafik ilk sekiz makineyi çiziyor ama kesim ekranda yazmıyordu:
     "Cevapsız kalan soru" ölçüsü bütün makineleri, grafik yalnız
     sekizini topluyor ve aynı adı taşıyan iki sayı ayrışıyordu. Kardeş
     sekmeler kesimi yazıyor (bkz. musteri.js, servis.js). */
  grafikCevapsizAlt: (kesim) =>
    `Cevapsız soru sayısına göre ilk ${kesim} makine gösterilir; diğer makineler grafikte yer almaz. Tam liste aşağıdaki tabloda. Bir satıra tıklayınca Destek Kayıtları açılır.`,

  makineYok: 'Makine seçilmedi',

  tabloMakine: 'Makinelere göre',
  tabloMakineAciklama: 'Seçilen dönemde başlayan konuşmalar, konuşulan makineye göre. Ekranda çözülme oranı, o makinedeki konuşmaların içindeki paydır; öteki sütunlar adet.',
  tabloCevapsiz: 'Cevapsız kalan sorular',
  tabloCevapsizAciklama: 'Asistanın cevap bulamadığı veya müşterinin sorunun sürdüğünü belirttiği sorular. Yanıtların neden yetersiz kaldığını incelemek için bir satıra tıklayarak Destek Kayıtları ekranını açın.',
  tabloCevapsizBos: 'Bu dönemde başlayan konuşmalarda cevapsız kalan soru yok. Başka bir dönemi incelemek için tarih aralığını değiştirin.',
  sutun: {
    makine: 'Makine', konusma: 'Konuşma', soru: 'Sorulan soru', cevapsiz: 'Cevapsız kalan',
    talep: 'Talebe dönen', cozulen: 'Ekranda çözülme oranı', tarih: 'Tarih', soruMetni: 'Soru',
  },
  toplam: 'Toplam',

  notlar: [
    'Bu rapor destek ekranındaki konuşmalardan hazırlanır; talep kayıtlarından bağımsızdır. "Cevapsız kalan" sütunu, yanıtı bulunamayan veya sorunu çözmeyen soruları sayar. Ayrıntıları Destek Kayıtları ekranında inceleyebilirsiniz.',
    'Destek konuşması: seçilen dönemde başlayan konuşmalar sayılır. Aynı makinede art arda yapılan işlemler arasındaki ara 30 dakikayı aşmadıkça tek konuşma sayılır. Ara 30 dakikayı aşarsa sonraki işlem yeni bir konuşma başlatır. Tam 30 dakikalık ara yeni konuşma başlatmaz; aralar bu sınırı aşmadıkça toplam süre ne kadar uzun olursa olsun konuşma tek sayılır.',
    'Sorulan soru: müşterinin asistana yazdığı ya da hazır listeden seçtiği sorular.',
    'Cevapsız kalan soru: asistanın kılavuzlarda cevabını bulamadığı sorular ile müşterinin cevaptan sonra "sorun devam ediyor" dediği sorular.',
    'Talebe dönen konuşma: müşterinin destek ekranından talep açma düğmesine bastığı konuşmalar. Talep formunu gönderip göndermediği burada görünmez.',
    'Ekranda çözülme oranı: müşterinin "çözüldü" dediği, talebe dönmemiş ve cevapsız sorusu kalmamış konuşmaların bütün konuşmalara oranı. Grafikteki "Ekranda çözülen" aynı konuşmaların adedidir.',
    'Grafikte her konuşma tek sonuçla sayılır: talebe döndüyse "Talebe dönen"; talebe dönmediyse, müşteri "çözüldü" dediyse ve cevapsız sorusu kalmadıysa "Ekranda çözülen"; kalanlar "Diğer" (çözülmedi ya da yarıda kaldı). Destek Kayıtları ekranındaki Sonuç süzgeci de aynı sırayla ayırır.',
    'Makine: konuşmanın geçtiği makine. Müşteri makine seçmeden sorduysa "Makine seçilmedi" satırında sayılır.',
    'Cevapsız kalan sorular tablosundaki tarih, konuşmanın başladığı gündür. Tabloda müşterinin adı ve telefonu yer almaz; kimin sorduğu Destek Kayıtları ekranında görülür.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
  ],
}

/* Cevapsız soru grafiğinde kaç makine çiziliyor (alt yazıda da yazılı). */
const CEVAPSIZ_KESIM = 8

/* Konuşmanın tek sonucu — sıranın gerekçesi dosya başında. */
function sonucu(o) {
  if (yonlendirme(o)) return 'talep'
  if (!cevapsizlar(o).length && cozuldu(o)) return 'cozuldu'
  return 'diger'
}

/* Konuşmanın geçtiği makinenin adı.

   `|| o.urun?.ad` YEDEĞİ ÖLÜ KODDU. modelAdi katalogda olmayan bir id
   için null değil, id'nin KENDİSİNİ döndürüyor (bkz. hesap.js); id dolu
   olduğu sürece yedek hiç çalışmıyor, katalogdan kalkmış bir ürün
   kayıtta insan-okunur adı dururken ekranda çıplak slug olarak
   yazılıyordu. Aynı oturum Destek Kayıtları ekranında `urun.ad` ile
   süzüldüğü için iki ekran aynı konuşmaya iki ayrı makine adı
   veriyordu. modelAdi id'yi geri verdiyse katalogda yok demektir. */
function makinesi(o) {
  const id = o.urun?.id || o.makine?.productId
  const katalog = modelAdi(id)
  if (katalog && katalog !== id) return katalog
  return o.urun?.ad || katalog || M.makineYok
}

/* Bir dönemin sayıları; ölçüler şimdiki ve önceki dönem için aynı yoldan. */
function say(oturumlar) {
  const n = oturumlar.length
  const soru = oturumlar.reduce((a, o) => a + sorular(o).length, 0)
  const cevapsiz = oturumlar.reduce((a, o) => a + cevapsizlar(o).length, 0)
  const talep = oturumlar.filter((o) => sonucu(o) === 'talep').length
  const cozulen = oturumlar.filter((o) => sonucu(o) === 'cozuldu').length
  return {
    n,
    soru,
    cevapsiz,
    talep,
    cozulen,
    cozulenOrani: oran(cozulen, n),
    basinaSoru: n ? soru / n : null,
  }
}

export const destekBolumu = {
  id: 'destek',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const hepsi = veri.destekOturumlari || []
    const oturumlar = hepsi.filter((o) => donemde(o.baslangic))
    const simdi = say(oturumlar)
    const once = say(hepsi.filter((o) => oncekide(o.baslangic)))
    const destegeGit = git ? () => git('destek') : undefined

    /* ------------------------------------------------------- Ölçüler */

    const olculer = [
      {
        ad: M.konusma,
        deger: simdi.n,
        fark: f(simdi.n, once.n),
        iyi: null,
        alt: M.konusmaAlt,
      },
      {
        ad: M.soruSayisi,
        deger: simdi.soru,
        fark: f(simdi.soru, once.soru),
        iyi: null,
        alt: M.soruSayisiAlt,
      },
      {
        ad: M.cevapsiz,
        deger: simdi.cevapsiz,
        fark: f(simdi.cevapsiz, once.cevapsiz),
        iyi: 'azalis',
        alt: M.cevapsizAlt,
      },
      {
        ad: M.talebeDonen,
        deger: simdi.talep,
        fark: f(simdi.talep, once.talep),
        iyi: null,
        alt: M.talebeDonenAlt(yuzde(simdi.talep, simdi.n)),
      },
      {
        ad: M.cozulen,
        deger: yuzde(simdi.cozulen, simdi.n),
        fark: karsilastir ? farkPuan(simdi.cozulenOrani, once.cozulenOrani) : null,
        farkBirim: 'puan',
        iyi: 'artis',
        alt: M.cozulenAlt,
      },
      {
        ad: M.basinaSoru,
        deger: ondalik(simdi.basinaSoru),
        fark: f(simdi.basinaSoru, once.basinaSoru),
        iyi: null,
        alt: M.basinaSoruAlt,
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const kovalar = zamanKovalari(aralik, hepsi.map((o) => o.baslangic))

    /* Makineye göre toplam — hem yatay grafik hem tablo buradan. */
    const kova = new Map()
    for (const o of oturumlar) {
      const ad = makinesi(o)
      if (!kova.has(ad)) kova.set(ad, [])
      kova.get(ad).push(o)
    }
    const makineler = [...kova.entries()]
      .map(([ad, liste]) => ({ ad, ...say(liste) }))
      .sort((a, b) => b.n - a.n || b.cevapsiz - a.cevapsiz || a.ad.localeCompare(b.ad, 'tr'))

    const grafikler = [
      {
        tur: 'sutun',
        genis: true,
        baslik: M.grafikKonusma,
        alt: M.grafikKonusmaAlt,
        seriler: [
          { anahtar: 'cozuldu', ad: M.seri.cozuldu, renk: RENK.bir },
          { anahtar: 'talep', ad: M.seri.talep, renk: RENK.iki },
          { anahtar: 'diger', ad: M.seri.diger, renk: RENK.notr },
        ],
        kovalar: kovayaDagit(kovalar, oturumlar, (o) => o.baslangic, sonucu),
        onSec: destegeGit,
      },
      {
        tur: 'yatay',
        baslik: M.grafikCevapsiz,
        alt: M.grafikCevapsizAlt(CEVAPSIZ_KESIM),
        renk: RENK.bir,
        satirlar: makineler
          .filter((m) => m.cevapsiz > 0)
          .sort((a, b) => b.cevapsiz - a.cevapsiz || a.ad.localeCompare(b.ad, 'tr'))
          .slice(0, CEVAPSIZ_KESIM)
          .map((m) => ({ ad: m.ad, deger: m.cevapsiz, onSec: destegeGit })),
      },
    ]

    /* -------------------------------------------------------- Tablolar */

    const makineHucreleri = (m) => [
      String(m.n),
      String(m.soru),
      String(m.cevapsiz),
      String(m.talep),
      yuzde(m.cozulen, m.n),
    ]

    /* Cevapsız sorular: `cevapsizlar` yalnız cümleyi döndürüyor, olayın
       saatini değil; tarih konuşmanın başladığı gün. */
    const cevapsizSatirlar = [...oturumlar]
      .sort((a, b) => (b.baslangic || 0) - (a.baslangic || 0))
      .flatMap((o) =>
        cevapsizlar(o).map((soru) => ({
          hucreler: [tarihYaz(o.baslangic, false), makinesi(o), soru],
          git: destegeGit,
        })),
      )

    const tablolar = [
      {
        baslik: M.tabloMakine,
        aciklama: M.tabloMakineAciklama,
        basliklar: [
          M.sutun.makine, M.sutun.konusma, M.sutun.soru, M.sutun.cevapsiz, M.sutun.talep, M.sutun.cozulen,
        ],
        sag: [1, 2, 3, 4, 5],
        satirlar: makineler.map((m) => ({ hucreler: [m.ad, ...makineHucreleri(m)], git: destegeGit })),
        toplamSatiri: [M.toplam, ...makineHucreleri(simdi)],
      },
      {
        baslik: M.tabloCevapsiz,
        aciklama: M.tabloCevapsizAciklama,
        bos: M.tabloCevapsizBos,
        basliklar: [M.sutun.tarih, M.sutun.makine, M.sutun.soruMetni],
        satirlar: cevapsizSatirlar,
      },
    ]

    return { olculer, grafikler, tablolar, notlar: M.notlar }
  },
}
