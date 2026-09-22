import {
  gecikmisMi, gonderimGecikti, KAPALI_DURUMLAR, TALEP_ADI, teklifBekliyorMu,
} from '../../../veri'
import { makineninServisi } from '../../../../lib/servisAtama'
import { bekledigiYer, odemeOnayiBekliyorMu, parcaHazirliktaMi, yerSuzgeci } from '../../../bekleyenIs'
import { cevapsizlar } from '../../DestekKayitlari'
import {
  dilim, fark, ilkIslemSuresi, iptalZamani, kapanisOlayi, kapanisOlaySuresi, kovayaDagit,
  musteriTalebiMi, ortalama, paraKutu, RENK, servisZiyaretleri, sureYaz, talepModeli, topla,
  zamanKovalari,
} from '../hesap'

/* ==========================================================================
   Genel Bakış — "İşler nasıl gidiyor, neye yetişmemiz gerekiyor?"

   Yöneticinin ekranı açtığında ilk gördüğü yer. Üç şey söylüyor:

     1  DİKKAT İSTEYENLER  şu an açık ve bir şey yapılması gereken işler.
                           TARİH SÜZGECİNE BAĞLI DEĞİL: kırk gün önce
                           gelmiş ve hâlâ bekleyen talep, "son 30 gün"
                           seçili diye listeden düşmemeli.
     2  BU DÖNEM           gelen, kapanan, süreler, yeniden açılan,
                           garanti gideri, yeni müşteri — önceki eşit
                           dönemle karşılaştırmalı.
     3  NEREDE BEKLİYOR    açık işlerin kimin elinde durduğu. "Açık 37
                           talep" bir sayı; "12'si serviste, 9'u hak
                           ediş onayında" bir iş listesi.

   KAPANAN TALEP KAPANDIĞI GÜNE GÖRE SAYILIYOR. Eski rapor dönemde AÇILAN
   taleplerin kaçının kapandığına bakıyordu; ay sonunda açılan iş o ay
   hep "kapanmamış" görünüyor, önceki ayın işi bu ay kapansa da hiç
   sayılmıyordu. Ekibin bu dönemde ne kadar iş bitirdiğini kapanış günü
   söyler.
   ========================================================================== */

const M = {
  ad: 'Genel Bakış',
  soru: 'İşler nasıl gidiyor, neye yetişmemiz gerekiyor?',

  gelen: 'Gelen talep',
  gelenAlt: (s, p, t, sp) =>
    `${s} servis · ${p} yedek parça` + (sp ? ` (${sp} tanesi servis siparişi)` : '') + ` · ${t} fiyat teklifi`,
  /* Bu sekmede "yedek parça" servislerin kendi siparişlerini de sayıyor;
     Yedek Parça ve Müşteriler sekmelerinde yalnız müşterininkini. Aynı
     ad iki ayrı sayıyı göstermesin. */
  parcaVeSiparis: 'Yedek parça ve servis siparişi',
  kapanan: 'Kapanan talep',
  kapananAlt: 'Açılış tarihinden bağımsız olarak seçilen dönemde kapanan talepler; iptaller hariç',
  ilkIslem: 'İlk işlem süresi',
  ilkIslemAlt: 'Seçilen dönemde açılan taleplerin ilk işleme kadar geçen ortalama süresi; hiç işlem görmeyenler hariç',
  kapanma: 'Kapanma süresi',
  kapanmaAlt: (p90) => `Seçilen dönemde kapananların ortalaması · en yavaş %10 için eşik: ${p90}`,
  acik: 'Şu an açık talep',
  /* SAYI SAF YAŞ DEĞİL, İŞ KURALI (bkz. veri.js → gecikmisMi): teklif
     verilip müşterinin yanıtı beklenen talep "bekletiliyor" değil,
     bekliyor. Etiket "48 saati geçti" derken bunu söylemiyordu; teklif
     verilmiş ve iki gündür dönülmemiş talepler ne bu ölçüde ne de 14
     gün uyarısında görünüyordu ve sayı, yanındaki açık talep sayısıyla
     tutmuyordu. Kural değişmedi, etiket kuralı söylüyor. */
  acikAlt: (n) =>
    n
      ? `Tüm dönemlerdeki açık taleplerin ${n} tanesi 48 saati geçti; teklif verilip müşteriden yanıt beklenenler 48 saat hesabına dahil değil`
      : 'Tüm dönemlerdeki açık talepler içinde, teklif verilip müşteriden yanıt beklenenler dışında 48 saati geçen yok',
  yenidenAcilan: 'Yeniden açılan talep',
  yenidenAcilanAlt: 'Seçilen dönemde müşterinin "Sorun Devam Ediyor" diyerek yeniden açtığı talepler; her talep bir kez sayılır',
  garantiGideri: 'Garanti gideri',
  garantiGideriAlt: 'Seçilen dönemde onaylanan yol ve işçilik hak edişleri; parça bedeli dahil değil',
  yeniMusteri: 'Yeni müşteri',
  yeniMusteriAlt: 'Seçilen dönemde oluşturulan müşteri hesapları; telefonla açılan talepler müşteri hesabı oluşturmaz',

  grafikGelen: 'Gelen talepler',
  /* KOVA BOYU DÖNEME GÖRE DEĞİŞİYOR (bkz. hesap.js → zamanKovalari):
     bir aya kadar gün, altı aya kadar hafta, daha uzunu ay. Alt yazı
     "o günün talepleri" diyordu; haftalık kovada tıklanan sütun bir
     haftalık listeyi açıyor ve sütunun etiketi aralığın ilk günü
     olduğu için yönetici tek gün sandığı bir sayıya bakıyordu. */
  grafikGelenAlt: 'Seçilen dönemde açılan talepler, türlerine göre aynı ölçekte gösterilir. Sütunlar dönemin uzunluğuna göre gün, hafta veya ayı gösterir. Bir sütuna tıklayarak ilgili tarih aralığındaki talepleri açabilirsiniz.',
  grafikBekleyen: 'Açık talepler nerede bekliyor?',
  grafikBekleyenAlt: 'Tarih süzgecinden bağımsız olarak şu an açık olan bütün talepler, bekledikleri yere göre gösterilir. Bir satıra tıkladığınızda en yakın süzgeçle açılan liste, bu gruptakiler dışında talepler de içerebilir.',
  yer: {
    paksan: 'Personelimizin elinde',
    servis: 'Serviste',
    parcaHazirlik: 'Garanti parçası hazırlanıyor',
    yolda: 'Parça yolda, takılması bekleniyor',
    onay: 'Hak ediş onayı bekliyor',
    teklif: 'Müşterinin teklif yanıtı bekleniyor',
    parcaTalebi: 'Yedek parça talebi işlemde',
  },
  talepSayisi: (n) => `${n} talep`,

  uyariGecikme: (n) => `${n} açık talep 48 saati geçti (teklif yanıtı bekleyenler hariç)`,
  uyariGecikmeAlt:
    'Açılışından bu yana 48 saatten fazla geçmiş açık talepler; tarih süzgecinden bağımsızdır. Teklif verilip müşterinin yanıtı beklenenler sayılmaz. Teklif yanıtı 14 günden uzun süredir bekleniyorsa ayrı bir uyarı gösterilir.',
  uyariOnay: (n, tutar) => `${n} talep hak ediş onayı bekliyor · ${tutar}`,
  uyariOnayAlt: 'Servis işi bitirdi; onaylanana kadar talep kapanmıyor ve servis ödemesini göremiyor',
  uyariParca: (n) => `${n} garanti işinde parça hazırlanmayı bekliyor`,
  uyariParcaAlt: 'Servis parçayı istedi, henüz gönderilmedi; müşterinin makinesi bekliyor',
  uyariOdeme: (n) => `${n} yedek parça talebinde dekont onay bekliyor`,
  uyariOdemeAlt: 'Müşteri dekont gönderdi; ödemenin hesaba geçtiği henüz onaylanmadı. Servislerin kendi parça siparişleri bu sayıya dahil değildir.',
  uyariGonderim: (n) => `${n} yedek parça talebinde söz verilen gönderim tarihi geçti`,
  uyariGonderimAlt: 'Müşteriye bildirilen gönderim tarihi geçti; parça henüz gönderilmedi. Servislerin kendi parça siparişleri bu sayıya dahil değildir.',
  uyariTeklif: (n) => `${n} teklif 14 günden uzun süredir müşterinin yanıtını bekliyor`,
  uyariTeklifAlt: 'Teklif verildi, müşteriden henüz yanıt gelmedi. Müşteriyi arayarak teklifin durumunu öğrenin.',
  uyariServissiz: (n) => `${n} kayıtlı makine için atanmış servis bulunamadı`,
  /* Aynı seri defterde birden çok satırda olabiliyor ve servis zinciri
     (bkz. lib/servisAtama.js → makineninKaydi) en yeni satırı okuyor.
     Servisin elle açtığı satırda servis atanmışken müşteri aynı seriyi
     uygulamadan eklerse üstüne servisi boş yeni bir satır biniyor;
     makine burada "servisi yok" sayılıyor — uygulamanın davranışı da
     bu, müşteri gerçekten talep açamıyor. Ama Makineler ekranında eski
     satırda atanmış bir servis görünüyor ve personel raporu yanlış
     sanıyordu; hangi satıra bakıldığı bu yüzden yazılı. */
  uyariServissizAlt:
    'Bu makineler için müşteri uygulamasından servis talebi açılamıyor. Makineye veya makineyi satan bayiye servis atayın. Aynı seri numarası birden çok kayıtta varsa en yeni kayıt esas alınır; eski kayıtta servis atanmış olması yeterli değildir. Her makine bir kez sayılır.',
  uyariDestek: (n) => `Destek asistanında ${n} soru cevapsız kaldı (seçilen dönemde)`,
  uyariDestekAlt: 'Müşterinin uygulamada arayıp bulamadığı konular',
  uyariModel: (ad, n) => `En çok servis isteyen model: ${ad} (${n} talep, seçilen dönemde)`,
  uyariModelAlt: 'Seçilen dönemde açılan servis talepleri sayılır; iptal edilenler hariçtir. Talep sayısı arıza sıklığını tek başına göstermez. Ayrıntıları Ürün Kalitesi sekmesinden inceleyebilirsiniz.',

  tabloTur: 'Talep türüne göre',
  tabloTurAciklama:
    'Gelen, kapanan ve iptal edilen talepler ilgili işlemin seçilen dönemdeki tarihine göre sayılır. İptaller kapananlara dahil değildir. Şu an açık ve 48 saati geçen talepler tarih süzgecinden bağımsızdır; 48 saat hesabına teklif verilip müşteriden yanıt beklenenler dahil edilmez.',
  sutun: {
    tur: 'Talep türü', gelen: 'Gelen', kapanan: 'Kapanan', iptal: 'İptal edilen', acik: 'Şu an açık',
    gecikmis: '48 saati geçen (teklif yanıtı bekleyenler hariç)',
    ilk: 'Ort. ilk işlem süresi', kapanma: 'Ort. kapanma süresi', yavas: 'En yavaş %10 eşiği',
  },
  diger: 'Diğer / türü belirtilmemiş',
  toplam: 'Toplam',

  notlar: [
    'Gelen talep: seçilen dönemde açılan bütün talepler; servislerin kendi parça siparişleri de dahil.',
    'Kapanan talep: kapanışı seçilen döneme düşen talepler. Yeniden açılıp tekrar kapanan talepte son kapanış sayılır. Dönem içinde kapanıp sonradan yeniden açılan talep de sayılır: kapanış o dönemde gerçekleşti.',
    'İptal edilen: iptal tarihi seçilen dönemde olan talepler. İptal edilen talep kapanan sayılmaz; "Gelen" ile "Kapanan" ve "Şu an açık" arasındaki farkın bir bölümü buradan gelir.',
    'İlk işlem süresi: seçilen dönemde açılan taleplerin açılışından, geçmişine kaydedilen ilk işleme (durum değişikliği, servis kaydı, planlama) kadar geçen sürenin ortalaması. Hiç işlem görmemiş talep ortalamaya girmez.',
    'Kapanma süresi: seçilen dönemde kapanan taleplerin açılıştan kapanışa geçen ortalama süresi. En yavaş %10 eşiği, en uzun sürede kapanan %10 için hesaplanan sınır süredir; bu grubun ortalaması değildir.',
    '48 saati geçen: açılışından bu yana 48 saatten fazla geçmiş açık talepler; tarih süzgecinden bağımsızdır. Teklif verilip müşterinin yanıtı beklenenler sayılmaz. Teklif yanıtı 14 günden uzun süredir bekleniyorsa Dikkat İsteyenler kartında ayrı bir satırda gösterilir.',
    'Garanti gideri: onay tarihi seçilen döneme düşen servis hak edişlerinin toplamı (yol ve işçilik). Parçanın kendisi bu tutara dahil değildir.',
    'Yeni müşteri: kayıt tarihi seçilen döneme düşen müşteri hesapları. Telefonla açılan talepler müşteri hesabı oluşturmadığı için bu sayı "Gelen talep" ile aynı kaynaktan gelmez.',
    'Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılır. "Tüm zamanlar" seçiliyse karşılaştırma yapılmaz.',
    'Dikkat İsteyenler tarih süzgecinden bağımsızdır; yalnız "cevapsız soru" ve "en çok servis isteyen model" satırları seçilen döneme bakar.',
    'En çok servis isteyen model: seçilen dönemde açılan servis talepleri, iptal edilenler hariç; Ürün Kalitesi sekmesindeki model karnesiyle aynı sayı.',
    'Yedek parça ve servis siparişi: müşterilerin yedek parça talepleri ile servislerin kendi parça siparişleri birlikte. Yedek Parça ve Müşteriler sekmelerinde bu ikisi ayrı sayılır.',
    'Servis, yedek parça veya fiyat teklifi türlerinden birine girmeyen ya da türü belirtilmemiş eski kayıtlar "Diğer / türü belirtilmemiş" satırında toplanır. Böylece hiçbir kayıt toplamın dışında kalmaz; adet sütunlarındaki satırların toplamı, toplam satırındaki adede eşittir.',
  ],
}

const TURLER = ['servis', 'parca', 'satinalma']

/* Bu sekmede parça türü servis siparişlerini de sayıyor (bkz. M.parcaVeSiparis). */
function turAdi(tur) {
  return tur === 'parca' ? M.parcaVeSiparis : TALEP_ADI[tur]
}

function acikMi(t) {
  return !KAPALI_DURUMLAR.includes(t.status || 'yeni')
}

/* Açık talebin kimde beklediği ve o yerin Talepler süzgeci ortak
   dosyada: Dashboard da aynı kuralla sayıyor (bkz. backoffice/bekleyenIs.js). */

export const genelBolumu = {
  id: 'genel',
  ad: M.ad,
  soru: M.soru,

  uret({ veri, aralik, donem, onceki, donemde, oncekide, karsilastir, git }) {
    const f = (a, b) => (karsilastir ? fark(a, b) : null)
    const talepler = veri.talepler

    /* ------------------------------------------------------- Ölçüler */

    /* KAPANIŞ BİR OLAY, TALEBİN BUGÜNKÜ DURUMU DEĞİL (bkz. hesap.js →
       kapanisOlayi). Dönem içinde kapanıp sonradan yeniden açılan iş
       eskiden kapanan sayısından tamamen düşüyordu ve geçmiş bir ayın
       raporu iki kez bakıldığında iki farklı sayı veriyordu. */
    const kapananDonem = talepler.filter((t) => donemde(kapanisOlayi(t)))
    const kapananOnceki = talepler.filter((t) => oncekide(kapanisOlayi(t)))
    const iptalDonem = talepler.filter((t) => donemde(iptalZamani(t)))

    const ilkDonem = ortalama(donem.map(ilkIslemSuresi))
    const ilkOnceki = ortalama(onceki.map(ilkIslemSuresi))
    const kapanmaDonem = ortalama(kapananDonem.map(kapanisOlaySuresi))
    const kapanmaOnceki = ortalama(kapananOnceki.map(kapanisOlaySuresi))

    const acik = talepler.filter(acikMi)
    const geciken = acik.filter(gecikmisMi)

    const tekrarSay = (icinde) =>
      talepler.filter((t) => (t.tekrar || []).some((x) => icinde(x?.tarih))).length

    const onaylanan = (icinde) =>
      topla(
        talepler.flatMap(servisZiyaretleri)
          .filter((z) => z.hakkedis?.durum === 'onaylandi' && icinde(z.hakkedis.onay?.tarih))
          .map((z) => Number(z.hakkedis.toplam) || 0),
      )

    const yeniMusteri = veri.musteriler.filter((m) => donemde(m.createdAt)).length
    const yeniMusteriOnceki = veri.musteriler.filter((m) => oncekide(m.createdAt)).length

    const turSay = (tur) => donem.filter((t) => t.tur === tur).length

    const olculer = [
      {
        ad: M.gelen,
        deger: donem.length,
        fark: f(donem.length, onceki.length),
        iyi: null,
        alt: M.gelenAlt(
          turSay('servis'),
          turSay('parca'),
          turSay('satinalma'),
          donem.filter((t) => t.tur === 'parca' && !musteriTalebiMi(t)).length,
        ),
      },
      {
        ad: M.kapanan,
        deger: kapananDonem.length,
        fark: f(kapananDonem.length, kapananOnceki.length),
        iyi: 'artis',
        alt: M.kapananAlt,
      },
      {
        ad: M.ilkIslem,
        deger: sureYaz(ilkDonem),
        fark: f(ilkDonem, ilkOnceki),
        iyi: 'azalis',
        alt: M.ilkIslemAlt,
      },
      {
        ad: M.kapanma,
        deger: sureYaz(kapanmaDonem),
        fark: f(kapanmaDonem, kapanmaOnceki),
        iyi: 'azalis',
        alt: M.kapanmaAlt(sureYaz(dilim(kapananDonem.map(kapanisOlaySuresi), 0.9))),
      },
      {
        ad: M.acik,
        deger: acik.length,
        iyi: null,
        alt: M.acikAlt(geciken.length),
      },
      {
        ad: M.yenidenAcilan,
        deger: tekrarSay(donemde),
        fark: f(tekrarSay(donemde), tekrarSay(oncekide)),
        iyi: 'azalis',
        alt: M.yenidenAcilanAlt,
      },
      {
        ad: M.garantiGideri,
        deger: paraKutu(onaylanan(donemde)),
        fark: f(onaylanan(donemde), onaylanan(oncekide)),
        iyi: null,
        alt: M.garantiGideriAlt,
      },
      {
        ad: M.yeniMusteri,
        deger: yeniMusteri,
        fark: f(yeniMusteri, yeniMusteriOnceki),
        iyi: 'artis',
        alt: M.yeniMusteriAlt,
      },
    ]

    /* ------------------------------------------------------ Grafikler */

    const kovalar = zamanKovalari(aralik, talepler.map((t) => t.createdAt))
    const grafikler = [
      {
        tur: 'kucukCoklu',
        genis: true,
        baslik: M.grafikGelen,
        alt: M.grafikGelenAlt,
        parcalar: TURLER.map((tur) => ({
          baslik: turAdi(tur),
          toplam: turSay(tur),
          seriler: [{ anahtar: 'adet', ad: turAdi(tur), renk: RENK.bir }],
          kovalar: kovayaDagit(
            kovalar,
            donem.filter((t) => t.tur === tur),
            (t) => t.createdAt,
            () => 'adet',
          ),
          onSec: git ? (k) => git('talepler', { durum: 'hepsi', tur, aralik: k.aralik }) : undefined,
        })),
      },
    ]

    const yerSayim = {}
    for (const t of acik) {
      const y = bekledigiYer(t)
      yerSayim[y] = (yerSayim[y] || 0) + 1
    }
    grafikler.push({
      tur: 'yatay',
      genis: true,
      baslik: M.grafikBekleyen,
      alt: M.grafikBekleyenAlt,
      renk: RENK.bir,
      satirlar: Object.keys(M.yer)
        .filter((y) => yerSayim[y])
        .sort((a, b) => yerSayim[b] - yerSayim[a])
        .map((y) => ({
          ad: M.yer[y],
          deger: yerSayim[y],
          onSec: git ? () => git('talepler', yerSuzgeci(y)) : undefined,
        })),
    })

    /* ---------------------------------------------- Dikkat isteyenler */

    const uyarilar = []
    const ekle = (n, ad, alt, ton, goster) => {
      if (n > 0) uyarilar.push({ ad, alt, ton, goster: git ? goster : null })
    }

    ekle(geciken.length, M.uyariGecikme(geciken.length), M.uyariGecikmeAlt, 'kirmizi', () =>
      git('talepler', { durum: 'gecikmis' }),
    )

    const onayda = acik.filter((t) => t.status === 'onayBekliyor')
    ekle(
      onayda.length,
      M.uyariOnay(onayda.length, paraKutu(topla(onayda.map((t) => Number(t.hakkedis?.toplam) || 0)))),
      M.uyariOnayAlt,
      'turuncu',
      () => git('talepler', { durum: 'onayBekliyor' }),
    )

    /* Kural ve Talepler'deki tam süzgeç ortak dosyada; satır artık
       yalnız bu işleri açıyor (bkz. bekleyenIs.js). */
    const parcaHazirlik = acik.filter(parcaHazirliktaMi)
    ekle(parcaHazirlik.length, M.uyariParca(parcaHazirlik.length), M.uyariParcaAlt, 'turuncu', () =>
      git('talepler', { durum: 'parcaHazirlik' }),
    )

    /* İKİ UYARI DA YALNIZ MÜŞTERİ TALEBİ SAYIYOR. Servisin kendi parça
       siparişi de `parca` türünde duruyor (bkz. veri.js →
       servisParcaSiparisi) ama ön ödemeye tabi değil (parcaIlerlemeEngeli
       onu açıkça muaf tutuyor) ve gönderim sözü müşteriye değil servise
       veriliyor. Süzgeç yokken bu sekme "Müşteriye bildirilen gönderim
       tarihi geçti" derken servis siparişlerini de sayıyordu. */
    const odemeBekleyen = acik.filter(odemeOnayiBekliyorMu)
    ekle(odemeBekleyen.length, M.uyariOdeme(odemeBekleyen.length), M.uyariOdemeAlt, 'turuncu', () =>
      git('talepler', { durum: 'odemeBekleyen' }),
    )

    const gonderimGecen = talepler.filter((t) => musteriTalebiMi(t) && gonderimGecikti(t))
    ekle(gonderimGecen.length, M.uyariGonderim(gonderimGecen.length), M.uyariGonderimAlt, 'kirmizi', () =>
      git('talepler', { durum: 'acik', tur: 'parca' }),
    )

    const teklifBekleyen = talepler.filter(teklifBekliyorMu)
    ekle(teklifBekleyen.length, M.uyariTeklif(teklifBekleyen.length), M.uyariTeklifAlt, 'turuncu', () =>
      git('talepler', { durum: 'teklifBekleyen' }),
    )

    /* Aynı seri defterde birden çok satırda olabiliyor (bkz.
       Makineler.jsx); makine bir kez sayılıyor. */
    const seriler = [...new Set(veri.makineler.map((k) => String(k.seri || '').trim()).filter(Boolean))]
    const servissiz = seriler.filter((s) => !makineninServisi(s)).length
    ekle(servissiz, M.uyariServissiz(servissiz), M.uyariServissizAlt, 'mavi', () => git('makineler'))

    const cevapsiz = veri.destekOturumlari
      .filter((o) => donemde(o.baslangic))
      .reduce((a, o) => a + cevapsizlar(o).length, 0)
    ekle(cevapsiz, M.uyariDestek(cevapsiz), M.uyariDestekAlt, 'mavi', () => git('destek'))

    /* Ürün Kalitesi sekmesinin model karnesiyle aynı sayım: iptal
       edilen talep arıza değil. Önce iptaller de sayılıyordu; aynı
       dönemde burada "Scorpion 10 talep", karnede 9 yazıyordu. */
    const modelSayim = new Map()
    for (const t of donem) {
      if (t.tur !== 'servis' || !musteriTalebiMi(t) || t.status === 'iptal') continue
      const ad = talepModeli(t)
      if (!ad) continue
      modelSayim.set(ad, (modelSayim.get(ad) || 0) + 1)
    }
    const enCok = [...modelSayim.entries()].sort((a, b) => b[1] - a[1])[0]
    if (enCok && enCok[1] > 1) {
      uyarilar.push({
        ad: M.uyariModel(enCok[0], enCok[1]),
        alt: M.uyariModelAlt,
        ton: 'mavi',
        goster: git ? () => git('talepler', { durum: 'hepsi', tur: 'servis', makine: enCok[0], aralik }) : null,
      })
    }

    /* -------------------------------------------------------- Tablo */

    const turSatiri = (liste, kapanan, iptal, acikListe) => [
      String(liste.length),
      String(kapanan.length),
      String(iptal.length),
      String(acikListe.length),
      String(acikListe.filter(gecikmisMi).length),
      sureYaz(ortalama(liste.map(ilkIslemSuresi))),
      sureYaz(ortalama(kapanan.map(kapanisOlaySuresi))),
      sureYaz(dilim(kapanan.map(kapanisOlaySuresi), 0.9)),
    ]

    /* TOPLAM SATIRI SÜTUNLARIN TOPLAMI OLMALI. Satırlar yalnız bilinen
       üç türü geziyordu, toplam satırı ise bütün kayıtları sayıyordu;
       türü bu üçünden biri olmayan (ya da hiç olmayan) eski bir kayıt
       görünür bir satıra girmeden toplama giriyordu. Böyle bir kayıt
       varsa "Diğer" satırında toplanıyor; yoksa satır hiç çıkmıyor. */
    const digerMi = (t) => !TURLER.includes(t.tur)
    const digerVar = [donem, kapananDonem, iptalDonem, acik].some((liste) => liste.some(digerMi))

    const tabloSatiri = (ad, suz, git2) => ({
      hucreler: [
        ad,
        ...turSatiri(donem.filter(suz), kapananDonem.filter(suz), iptalDonem.filter(suz), acik.filter(suz)),
      ],
      git: git2,
    })

    const tablolar = [
      {
        baslik: M.tabloTur,
        aciklama: M.tabloTurAciklama,
        basliklar: [
          M.sutun.tur, M.sutun.gelen, M.sutun.kapanan, M.sutun.iptal, M.sutun.acik, M.sutun.gecikmis,
          M.sutun.ilk, M.sutun.kapanma, M.sutun.yavas,
        ],
        sag: [1, 2, 3, 4, 5, 6, 7, 8],
        satirlar: [
          ...TURLER.map((tur) =>
            tabloSatiri(turAdi(tur), (t) => t.tur === tur, git ? () => git('talepler', { durum: 'hepsi', tur, aralik }) : undefined),
          ),
          ...(digerVar ? [tabloSatiri(M.diger, digerMi, undefined)] : []),
        ],
        toplamSatiri: [M.toplam, ...turSatiri(donem, kapananDonem, iptalDonem, acik)],
      },
    ]

    return { olculer, uyarilar, grafikler, tablolar, notlar: M.notlar }
  },
}
