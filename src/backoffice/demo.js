/* ==========================================================================
   Demo verisi

   Backoffice boşken nasıl çalıştığı anlaşılmıyor: tablolar boş, süzgeçlerin
   ne yaptığı görünmüyor, rollerin farkı belli olmuyor. Bu dosya backoffice’e
   uydurma ama tutarlı bir veri seti yüklüyor.

   Demo kayıtları uygulamanın kendi kayıtlarından AYRI depolarda duruyor
   (`demoMusteriler`, `demoTalepler`). Böylece backoffice’te görünüyorlar ama
   müşterinin telefonundaki listeye karışmıyorlar. "Demo verisini
   temizle" dendiğinde gerçek kayıtlara dokunulmadan siliniyorlar.

   Yayına çıkarken bu dosyanın çağrıldığı düğme kaldırılmalı
   (bkz. PRODA-CIKIS.md).
   ========================================================================== */

import { load, save, uid } from '../lib/storage'
import { ekYaz } from '../lib/ekler'
import { sifreHazirla } from '../lib/hesap'
import { yeniNo } from '../lib/numara'
import { talepNo } from '../lib/talep'
import { normalizeSerial } from '../lib/serial'
import { ANAHTAR, islemYaz, personelGetir, rolleriGetir } from './veri'
import { MAKINE_DURUMU, ULASIM_ZAMANI } from '../data/talepAlanlari'
import { PRODUCTS, SIRKET } from '../marka'
import { PARCA_FIYAT } from '../marka'
import { SERVISLER, BAYILER } from '../marka'

/* ------------------------------------------------------------ Malzemeler */

const ADLAR = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Ali', 'Osman',
  'Yusuf', 'Ramazan', 'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif',
  'Recep', 'Kemal', 'Süleyman', 'Halil', 'Bekir', 'Şaban', 'Cemal', 'Nuri',
]

const SOYADLAR = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk',
  'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara',
  'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Korkmaz', 'Bulut', 'Erdoğan',
]

/* Servis talebinin adresi bunlardan kuruluyor. Adres tarifi çiftçinin
   yazacağı gibi: köy adı ve bir işaret noktası — servis navigasyonla
   değil, sorarak buluyor. */
const KOYLER = [
  'Alibeyhüyüğü', 'Karkın', 'Dedemli', 'Gökhüyük', 'Beşkavak', 'Yenidoğan',
  'Akören', 'Taşpınar', 'Sarıkaya', 'Çayırbaşı', 'Kızılören', 'Üçpınar',
]

const TARIFLER = [
  'kooperatifin arkası', 'cami karşısı', 'silonun yanı', 'köy girişi ilk sağ',
  'muhtarlığın karşısı', 'sulama kanalının kenarı', 'okulun arkası',
]

/* İl ve ilçeler servis listesindeki illerden seçiliyor ki harita ve
   "en yakın servis" sıralaması anlamlı çıksın. */
const YERLER = [
  ['Konya', 'Selçuklu'], ['Konya', 'Çumra'], ['Aksaray', 'Merkez'],
  ['Ankara', 'Polatlı'], ['Eskişehir', 'Alpu'], ['Balıkesir', 'Bandırma'],
  ['Bursa', 'Karacabey'], ['İzmir', 'Torbalı'], ['Manisa', 'Salihli'],
  ['Aydın', 'Söke'], ['Antalya', 'Korkuteli'], ['Adana', 'Ceyhan'],
  ['Şanlıurfa', 'Viranşehir'], ['Diyarbakır', 'Bismil'], ['Malatya', 'Battalgazi'],
  ['Kayseri', 'Develi'], ['Samsun', 'Bafra'], ['Tekirdağ', 'Malkara'],
  ['Edirne', 'Uzunköprü'], ['Sivas', 'Şarkışla'],
]

const SERVIS_BELIRTI = [
  'İp düğümlemiyor', 'Balya dağılıyor', 'Pikap toplamıyor', 'Ses geliyor',
  'Zincir atıyor', 'Yağ kaçırıyor', 'Sensör uyarı veriyor', 'Titreşim var',
]

/* Parça adları fiyat listesinden geliyor: demo talebi açıldığında
   backoffice'te tutar da hesaplanabilsin, "en çok istenen parçalar"
   raporu gerçek kodlarla dolsun (bkz. src/data/parcaFiyat.js). */
const PARCALAR = Object.keys(PARCA_FIYAT)

const KARGO = ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo', 'Sürat Kargo']

/* Yedek parça kapanışındaki isteğe bağlı not — fazladan bir şey
   yapıldıysa yazılıyor. */
const PARCA_KAPANIS_NOTU = [
  'Stokta olmayan parça için bir gün beklendi, müşteri bilgilendirildi.',
  'Müşteri talebi üzerine iki parça aynı pakete konuldu.',
  'Kargo firması değiştirildi, teslimat bir gün öne alındı.',
  'Müşteriyle telefonda görüşüldü, adres teyit edildi.',
]

const YAPILAN_IS = [
  'Bağlama grubu ayarlandı, mekik dili pimi değiştirildi.',
  'Pikap parmakları değiştirildi, zincir gerginliği ayarlandı.',
  'Kuyruk mili şaftı yenilendi, yağlama yapıldı.',
  'İp yolları temizlendi, gergi mekanizması ayarlandı.',
  'Piston segmanları değiştirildi, boşluk ayarı yapıldı.',
]

const IC_NOTLAR = [
  'Müşteriye ulaşıldı, hasat bitince uygun olacak.',
  'Bölge servisi yönlendirildi.',
  'Parça stokta yok, tedarik ediliyor.',
  'Garanti kapsamında, ücret alınmayacak.',
]

const MUSTERI_NOTLARI = [
  'Talebiniz alındı, en kısa sürede size dönüş yapacağız.',
  'Servis ekibimiz yarın bölgenizde olacak.',
  'Parçanız hazırlandı, kargoya verilecek.',
]

const IPTAL_NEDEN = [
  'Müşteri vazgeçti', 'Ulaşılamadı', 'Yanlış talep', 'Servise yönlendirildi',
]

const SATIS_SONUC = ['Satış oldu', 'Müşteri vazgeçti', 'Rakibe gitti', 'Ulaşılamadı']

const SERVIS_ACIKLAMA = [
  'Sabah çalışırken durdu, tekrar çalıştıramadım.',
  'Balya yaparken ip sürekli kopuyor, ayar yaptım düzelmedi.',
  'Sesin nereden geldiğini bulamadım, bakılması gerekiyor.',
  'Hasat başladı, acele lazım.',
  'Geçen sene de aynı yerden sorun çıkmıştı.',
]

const PARCA_ACIKLAMA = [
  'İki takım istiyorum, kargoyla gönderebilir misiniz?',
  'Bayiden bulamadım, sizden alabilir miyim?',
  'Fiyat ve stok durumunu öğrenmek istiyorum.',
  'Acele lazım, hasat sürüyor.',
]

const SATIS_ACIKLAMA = [
  'Fiyat bilgisi ve teslim süresi öğrenmek istiyorum.',
  'Traktörüme uygun modeli önerir misiniz?',
  'Kredi veya taksit imkânı var mı?',
  'Bu sezon almayı düşünüyorum.',
]

const GORUSLER = [
  'Uygulama güzel olmuş, talebi kolayca gönderdim.',
  'Bakım rehberi işime yaradı, teşekkürler.',
  'Yedek parça isimlerini bulmakta zorlandım.',
  'Bildirimlerin telefona da gelmesi iyi olur.',
  'Servis listesinde bize en yakın nokta yanlış görünüyor.',
]

/* Demo personelinin rolleri YÜRÜRLÜKTEKİ listeden alınıyor.

   Önceden sabit bir kimlik dizisiydi. Roller
   backoffice'ten silinebildiği için o kimlikler var olmayan rolleri
   gösterebiliyordu; demo yüklenince personel tanımsız bir rolde
   kalabiliyordu.

   Admin hariç: demo personeli admin yetkisiyle oluşturulmamalı. Admin
   rolü yoksa (silinemiyor ama) listenin tamamı kullanılıyor. */
function demoRolleri() {
  const liste = rolleriGetir()
  const adminsiz = liste.filter((r) => !r.sistem)
  return (adminsiz.length ? adminsiz : liste).map((r) => r.id)
}

/* Destek ekranında seçilen konular ve sorular. Gerçek bilgi tabanındaki
   başlıklarla aynı dilde yazıldı; backoffice'te "en çok sorulan" listesi
   anlamlı görünsün. */
const DESTEK_KONU = [
  'Balya bağlama', 'Pikap ve toplama', 'Piston ve sıkıştırma',
  'Şanzıman ve şaft', 'Hidrolik', 'Genel bakım',
]

const DESTEK_SORU = [
  'Düğüm atmıyor', 'İp kopuyor', 'Balya gevşek çıkıyor',
  'Pikap otu almıyor', 'Anormal ses geliyor', 'Yağ kaçağı var',
  'Şaft titriyor', 'Balya sayacı çalışmıyor',
]

/* Cevapsız kalan sorular bilgi tabanının eksik listesi; demoda da
   birkaç tane olsun ki o rapor boş çıkmasın. */
const DESTEK_CEVAPSIZ = [
  'Nem ölçer hata veriyor',
  'PLC ekranı açılmıyor',
  'Otomatik yağlama çalışmıyor',
  'Tartı sistemi yanlış tartıyor',
]

/* Beş alt türün hepsinden en az bir örnek var: ekranlar boş bir
   listeyle değil, gerçek çeşitlilikle deneniyor. Hedefi olanlar
   `hedef` taşıyor — geri çağırma yalnız servise gidiyor
   (bkz. src/data/duyuruTurleri.js). */
const DUYURULAR = [
  {
    tur: 'duyuru',
    alt: 'kampanya',
    baslik: 'Sezon öncesi bakım kampanyası',
    metin: 'Nisan sonuna kadar yetkili servislerimizde sezon öncesi bakım işçiliğinde %20 indirim uygulanıyor. Randevu için servisinizle görüşebilirsiniz.',
  },
  {
    tur: 'duyuru',
    alt: 'yeniUrun',
    baslik: 'Orkinos 1290 satışa çıktı',
    metin: 'Orkinos serisinin yeni modeli Orkinos 1290 satışa sunuldu. Fiyat ve satın alma için bayinize, teknik bilgi ve servis desteği için yetkili servise başvurabilirsiniz.',
    hedef: { kime: 'ikisi' },
  },
  {
    tur: 'duyuru',
    alt: 'etkinlik',
    baslik: 'Konya Tarım Fuarı’nda sizi bekliyoruz',
    metin: 'Konya Tarım Fuarı’nda B salonundaki 214 numaralı standımızdayız. Bütün modellerimizi yerinde görebilir, ekibimizle görüşebilirsiniz.',
    hedef: { kime: 'ikisi' },
  },
  {
    tur: 'duyuru',
    alt: 'kampanya',
    baslik: 'Yeni yedek parça fiyat listesi',
    metin: '2026 yedek parça fiyat listesi yürürlüğe girdi. Güncel fiyatları uygulamadaki yedek parça talebi ekranından görebilirsiniz.',
  },
  {
    tur: 'uyari',
    alt: 'guvenlik',
    baslik: 'Kuyruk mili koruma kapağı kontrolü',
    metin: 'Kuyruk mili koruma kapağı hasarlıysa makineyi çalıştırmayın. Kapağı hasarlı müşterilerimiz, ücretsiz değişim için servislerine başvurabilir.',
  },
  {
    tur: 'uyari',
    alt: 'guvenlik',
    baslik: 'Sıcak havada balya deposu kontrolü',
    metin: 'Yüksek sıcaklıkta nemli ot balyalandığında depoda yanma riski oluşur. Balya nemini kontrol etmeden depolamayın.',
  },
  {
    tur: 'uyari',
    alt: 'geriCagirma',
    baslik: 'ORK1270-2024 serisi düğüm atıcı kontrolü',
    metin: 'ORK1270-2024 seri numaralı makinelerin düğüm atıcı yayında üretim kaynaklı kırılma görüldü. Bu makineleri kullanan müşterilerinizi arayıp servise çağırın. Değişim bedelsizdir; yay stoku servislere gönderildi.',
    hedef: { kime: 'servis' },
  },
]

/* Bakım rehberlerindeki madde anahtarları makineId-rehberId-bölüm-sıra
   biçiminde (bkz. src/lib/rehberIsaret.js → maddeAnahtari). */
const BAKIM_REHBERLERI = ['gunluk', 'sezonOncesi', 'sezonSonu']

/* ----------------------------------------------------------- Yardımcılar */

function sec(dizi) {
  return dizi[Math.floor(Math.random() * dizi.length)]
}

function secBirkac(dizi, enAz, enCok) {
  const adet = enAz + Math.floor(Math.random() * (enCok - enAz + 1))
  const kopya = [...dizi]
  const sonuc = []
  for (let i = 0; i < adet && kopya.length; i++) {
    sonuc.push(kopya.splice(Math.floor(Math.random() * kopya.length), 1)[0])
  }
  return sonuc
}

function tamsayi(enAz, enCok) {
  return enAz + Math.floor(Math.random() * (enCok - enAz + 1))
}

function gunOnce(gun) {
  return Date.now() - gun * 86400000 - Math.floor(Math.random() * 86400000)
}

function telUret() {
  return `5${tamsayi(30, 59)} ${tamsayi(100, 999)} ${tamsayi(10, 99)} ${tamsayi(10, 99)}`
}

/* Önek ürünün KENDİ model kodundan geliyor (`serialPrefix`), ürün
   kimliğinden değil.

   Önce kimliğin ilk altı harfi kullanılıyordu: `diamond-...` ürünü
   `DIAMON2023...` gibi bir numara üretiyordu. Böyle bir önek
   `products.js` içinde yok, dolayısıyla `matchProduct` eşleşmiyor;
   demo verisinde model bulunamıyor, üretim yılı çıkarılamıyor,
   garanti "bilinmiyor" görünüyor ve numara ekranda tiresiz
   yazılıyordu. Gerçek seri numaralarında bunların hiçbiri olmuyor —
   yani demo, olmayan bir hatayı taklit ediyordu. */
function seriUret(urun) {
  const yil = tamsayi(2019, 2025)
  const onek = normalizeSerial(urun.serialPrefix)
  return `${onek}${yil}${String(tamsayi(1, 9999)).padStart(5, '0')}`
}

/* -------------------------------------------------------------- Üretim */

export function demoVarMi() {
  return load(ANAHTAR.demoMusteriler, []).length > 0
}

/**
 * Demo verisini üretir: 10 personel, 30 müşteri, talepler ve numara
 * değişikliği talepleri.
 */
export async function demoYukle() {
  /* ---- Personel: admin dışında rastgele roller */
  const mevcut = personelGetir()
  const yeniPersonel = []
  const demoRol = demoRolleri()

  for (let i = 0; i < 10; i++) {
    const ad = `${sec(ADLAR)} ${sec(SOYADLAR)}`
    const kullanici = ad
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .join('.')

    /* Aynı ad iki kez düşerse kullanıcı adı çakışmasın */
    const benzer = [...mevcut, ...yeniPersonel].filter((p) =>
      p.kullanici.startsWith(kullanici)
    ).length

    yeniPersonel.push({
      id: uid(),
      no: yeniNo('personel'),
      ad,
      kullanici: benzer ? `${kullanici}${benzer + 1}` : kullanici,
      rol: demoRol[i % demoRol.length],
      eposta: `${kullanici}@${SIRKET.siteKisa}`,
      tel: '0' + telUret(),
      aktif: i !== 9, /* biri kapalı — kapalı hesap nasıl görünüyor */
      createdAt: gunOnce(tamsayi(30, 400)),
      sonGiris: i < 7 ? gunOnce(tamsayi(0, 20)) : null,
      sifre: await sifreHazirla('123456'),
      demo: true,
    })
  }
  save(ANAHTAR.personel, [...mevcut, ...yeniPersonel])

  /* ---- Müşteriler */
  const musteriler = []
  for (let i = 0; i < 30; i++) {
    const [il, ilce] = sec(YERLER)
    const makineler = secBirkac(PRODUCTS, 1, 2).map((urun) => ({
      id: uid(),
      productId: urun.id,
      serial: seriUret(urun),
      year: tamsayi(2019, 2025),
      nickname: '',
      addedAt: gunOnce(tamsayi(10, 700)),
      hours: tamsayi(0, 1200),
      doneMaintenance: [],
    }))

    /* Bakım işaretleri. Makinelerin bir kısmında bakım yapılmış
       görünsün: "bakımını yapan makineler daha az arızalanıyor mu"
       sorusu ancak işaretli kayıt varsa konuşulabiliyor. */
    for (const mk of makineler) {
      if (Math.random() < 0.45) continue
      const rehber = sec(BAKIM_REHBERLERI)
      const kacMadde = tamsayi(2, 6)
      for (let j = 0; j < kacMadde; j++) {
        mk.doneMaintenance.push(`${mk.id}|${rehber}|bolum${tamsayi(1, 3)}|${j}`)
      }
    }

    musteriler.push({
      id: uid(),
      no: yeniNo('musteri'),
      createdAt: gunOnce(tamsayi(20, 800)),
      ad: `${sec(ADLAR)} ${sec(SOYADLAR)}`,
      ulke: 'TR',
      tel: telUret(),
      konumUlke: 'TR',
      il,
      ilce,
      /* Müşterinin "makineyi kimden aldım" cevabı BAYİ adı; servis
         adı değil. Servis makine satmıyor. */
      satici: sec(BAYILER).ad,
      onaylar: {
        aydinlatma: true,
        acikRiza: true,
        kampanya: Math.random() > 0.4,
        surum: '1.0',
        tarih: gunOnce(tamsayi(20, 800)),
      },
      bildirim: { izin: sec(['verildi', 'verildi', 'reddedildi', 'sorulmadi']) },
      makineler,
      demo: true,
    })
  }
  save(ANAHTAR.demoMusteriler, musteriler)

  /* ---- Makine kayıt defteri

     Müşteri uygulamada makinesini kaydettiğinde `makineKayitlari`
     defterine bir satır düşüyor (bkz. src/lib/makineKaydi.js) ve pano
     "Kayıtlı Makine" kutusu o defteri sayıyor. Demo müşterilerin
     makineleri vardı ama defter boş kalıyordu: pano 30 müşteri ve
     0 kayıtlı makine gösteriyordu.

     BAYİ LOGO'DAN, SERVİS ELDEN. Fatura bayiye kesiliyor: Logo'nun
     verdiği `bayiId`. Hangi servisin bakacağı ise ticari bir karar,
     faturada yazmıyor — personel backoffice'ten atıyor.

     Bir kısmı bilerek boş bırakıldı: Logo her seri numarasını
     bilmiyor ve her makineye servis atanmış değil. Backoffice o
     eksikliği gösterebilmeli, demo da onu göstermeli. */
  const makineKayitlari = []
  for (const m of musteriler) {
    for (const mk of m.makineler) {
      const logoBildi = Math.random() > 0.15
      const bayi = logoBildi ? sec(BAYILER) : null
      /* Makinelerin bir bölümüne servis elle atanmış; kalanların
         servisi bayisinden geliyor ya da hiç yok. */
      const servis = Math.random() > 0.55 ? sec(SERVISLER) : null
      makineKayitlari.push({
        id: uid(),
        tarih: mk.addedAt,
        seri: mk.serial,
        productId: mk.productId,
        musteriId: m.id,
        musteriNo: m.no,
        musteriAd: m.ad,
        il: m.il,
        ilce: m.ilce,
        bayiId: bayi?.id || null,
        bayiAd: bayi?.ad || '',
        servisId: servis?.id || null,
        servisAd: servis?.ad || '',
        uretimTarihi: logoBildi ? gunOnce(tamsayi(400, 2000)) : null,
        faturaTarihi: logoBildi ? gunOnce(tamsayi(10, 800)) : null,
        logoBildi,
        /* Kayıt anıyla fatura tarihi yakınsa yeni satış sayılıyor */
        yeniSatis: logoBildi && Math.random() > 0.7,
        kaynak: 'musteri',
        demo: true,
      })
    }
  }
  makineKayitlari.sort((a, b) => b.tarih - a.tarih)
  save(ANAHTAR.makineKayitlari, [
    ...makineKayitlari,
    ...load(ANAHTAR.makineKayitlari, []).filter((x) => !x.demo),
  ])

  /* ---- Talepler

     Tarihler bilerek dağıtıldı: bir kısmı son 24 saatte (yeşil), bir
     kısmı 1-2 gün (sarı), bir kısmı daha eski (kırmızı). Renk kuralı
     böylece backoffice’te görünüyor. */
  const talepler = []

  /* Her türün kendi aşamaları var; demo da o aşamaları izliyor ki
     backoffice'teki durum süzgeci ve rapor sütunları boş kalmasın
     (bkz. src/backoffice/veri.js → talepDurumlari). */
  const DURUM = {
    servis: ['yeni', 'incelemede', 'planlandi', 'kapandi', 'iptal'],
    parca: ['yeni', 'incelemede', 'planlandi', 'kapandi', 'iptal'],
    satinalma: ['yeni', 'incelemede', 'teklif', 'kapandi', 'iptal'],
  }

  /* Ağırlıklı seçim: talep havuzunun çoğu açık işten oluşsun, kapanmış
     ve iptal olanlar azınlıkta kalsın — gerçek bir günün dağılımı
     böyle görünüyor. */
  const AGIRLIK = {
    yeni: 3, incelemede: 3, planlandi: 2, teklif: 2, kapandi: 4, iptal: 1,
  }

  function durumSec(tur) {
    const havuz = []
    for (const d of DURUM[tur]) for (let i = 0; i < AGIRLIK[d]; i++) havuz.push(d)
    return sec(havuz)
  }

  /* HER TÜR x DURUM BİLEŞİMİ GARANTİLİ ÜRETİLİYOR.

     Önce her müşteriye rastgele 0-3 talep açılıyordu ve durum ağırlıklı
     seçiliyordu. Sonuç: bazı durumlar hiç çıkmıyordu. Sunumda "iptal
     edilmiş bir talep gösterebilir misin" dendiğinde elde örnek
     olmaması, demoyu yarıda kesiyor.

     Şimdi önce her bileşimden ikişer tane üretiliyor (16 bileşim, 32
     talep), sonra üstüne rastgele talepler ekleniyor. Böylece süzgeçte
     hangi durum seçilirse seçilsin liste dolu geliyor. */
  const gorevler = []

  for (const tur of Object.keys(DURUM)) {
    for (const durum of DURUM[tur]) {
      for (let k = 0; k < 2; k++) gorevler.push({ tur, durum })
    }
  }

  /* Rastgele ekler — havuz tek düze görünmesin */
  for (let i = 0; i < 26; i++) {
    const tur = sec(['servis', 'servis', 'parca', 'satinalma'])
    gorevler.push({ tur, durum: durumSec(tur) })
  }

  /* BEKLEYEN İŞ ÖRNEKLERİ. Dashboard'daki "48 saati geçen" kutusu ve
     Raporlar'daki "kimse bakmadı" uyarısı ancak eski ve hâlâ açık bir
     talep varsa dolu görünüyor. */
  gorevler.push({ tur: 'servis', durum: 'yeni', yasGun: 4 })
  gorevler.push({ tur: 'servis', durum: 'incelemede', yasGun: 6 })
  gorevler.push({ tur: 'parca', durum: 'yeni', yasGun: 3 })
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 9 })
  /* "Cevap bekleyen teklif" kutusu, teklif verileli TEKLIF_BEKLEME_GUN
     (14) günden fazla olan talepleri sayıyor. En eski demo teklifi 9
     günlüktü, kutu hep 0 gösteriyordu. */
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 21 })
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 17 })

  /* GÖNDERİM TARİHİ GEÇMİŞ PARÇA TALEPLERİ.

     "Gönderilecek" uyarısı (bkz. veri.js → gonderimGecikti) planlanan
     gönderim saati geçtiği hâlde hâlâ gönderilmemiş parça
     taleplerinde çıkıyor. Havuzda planlanmış parça talebi hiç
     yoktu; uyarı ekranda hiç görünmüyordu. */
  gorevler.push({ tur: 'parca', durum: 'planlandi', yasGun: 6 })
  gorevler.push({ tur: 'parca', durum: 'planlandi', yasGun: 9 })

  /* BUGÜN GELENLER — "bugün gelen" kutusu boş kalmasın */
  gorevler.push({ tur: 'servis', durum: 'yeni', yasGun: 0 })
  gorevler.push({ tur: 'parca', durum: 'yeni', yasGun: 0 })
  gorevler.push({ tur: 'satinalma', durum: 'yeni', yasGun: 0 })

  /* İHRACAT — yurtdışı talebi ayrı yoldan gidiyor, örneği olsun */
  gorevler.push({ tur: 'satinalma', durum: 'incelemede', ihracat: true })

  /* Fotoğraflı talepler: ilk beş serviste ek olacak */
  let fotoKalan = 5

  for (const gorev of gorevler) {
    {
      const m = sec(musteriler)
      const tur = gorev.tur
      const makine = sec(m.makineler)
      const yasGun = gorev.yasGun !== undefined
        ? gorev.yasGun
        : sec([0, 0.5, 1.2, 1.6, 3, 6, 14, 40])
      const tarih = Date.now() - yasGun * 86400000 - tamsayi(0, 6) * 3600000
      const durum = gorev.durum
      const personel = sec(yeniPersonel).ad

      /* Aşamalar sırayla işleniyor: "kapandı" bir talep önce
         "incelemede"den geçmiş olmalı, geçmiş sütunu da öyle
         görünmeli. İptal her aşamadan olabildiği için tek satır. */
      const sira = DURUM[tur].filter((d) => d !== 'yeni' && d !== 'iptal')
      const asamalar = durum === 'iptal'
        ? ['incelemede', 'iptal']
        : sira.slice(0, sira.indexOf(durum) + 1)

      /* Aşama tarihleri talep tarihinden İLERİ gidiyor; bugünü geçmemeli.
         Geçmeleri mümkündü: bugün açılmış üç aşamalı bir talepte son
         aşama 40 saat sonrasına düşebiliyordu. Sonuç ekranda gelecek
         tarihli bir geçmiş satırı ve "-1 gündür bekliyor" gibi eksi
         sürelerdi. Aralık bugüne sığmıyorsa aşamalar oransal olarak
         sıkıştırılıyor — sıraları bozulmadan. */
      /* Aralıklar biriktirilerek üretiliyor: her aşama bir öncekinden
         SONRA olmalı. Önceden her aşama kendi rastgele sayısını
         alıyordu ve sıra bozulabiliyordu (ikinci aşama birinciden önce
         gelebiliyordu). */
      const ham = []
      let birikim = 0
      for (let j = 0; j < asamalar.length; j++) {
        birikim += 3600000 * tamsayi(2, 20)
        ham.push(birikim)
      }
      const gereken = birikim
      const yer = Math.max(0, Date.now() - tarih - 60000)
      const olcek = gereken > yer ? yer / gereken : 1
      const gecmis = asamalar.map((d, j) => ({
        durum: d,
        tarih: Math.round(tarih + ham[j] * olcek),
        personel,
      }))
      const sonTarih = gecmis.length ? gecmis[gecmis.length - 1].tarih : tarih

      const parcalar = tur === 'parca' ? secBirkac(PARCALAR, 1, 3) : []
      const parcaAdet = {}
      for (const x of parcalar) parcaAdet[x] = tamsayi(1, 4)

      /* Yedek parçada bedel önden ödeniyor: "yeni" dışındaki her
         aşamada ödemenin onaylanmış olması gerekiyor, yoksa talep
         zaten ilerleyemezdi (bkz. Talepler ekranındaki ödeme kapısı). */
      const odemeVar = tur === 'parca' && durum !== 'yeni' && durum !== 'iptal'

      /* Sesli not her talepte yok. Ses kaydının kendisi demoya
         konmuyor — megabaytlarca base64 tarayıcının hafızasını
         doldururdu; oynatıcı yerine süresi görünüyor. */
      const sesliMi = Math.random() > 0.75

      talepler.push({
        id: uid(),
        no: talepNo(tur),
        createdAt: tarih,
        status: durum,
        tur,
        ad: m.ad,
        tel: '+90 ' + m.tel,
        telUlke: 'TR',
        telHam: m.tel,
        il: m.il,
        ilce: m.ilce,
        /* SERVİS TALEBİNİN ADRESİ — UYGULAMADAN GELEN TALEPTE VAR.

           Servis talebi uygulamadan açıldığında müşteri makinenin
           bulunduğu adresi yazıyor (bkz. screens/RequestForm.jsx).
           Telefonla gelen taleplerde bu alan boş; sahadaki servis
           kayıt ekranında kendisi dolduruyor. Demoda beşte biri boş
           bırakılıyor ki iki yol da denenebilsin. */
        adres:
          tur === 'servis' && Math.random() > 0.2
            ? `${m.ilce}, ${sec(KOYLER)} köyü, ${sec(TARIFLER)}`
            : '',
        ulke: gorev.ihracat ? 'DE' : 'TR',
        ihracat: Boolean(gorev.ihracat),
        /* Uygulamanın sakladığı değerlerin aynısı — backoffice'te saat
           aralıkları da görünsün. */
        ulasim: sec(ULASIM_ZAMANI),
        makine: tur === 'satinalma'
          ? null
          : { id: makine.id, serial: makine.serial, productId: makine.productId },
        urunId: tur === 'satinalma' ? sec(PRODUCTS).id : null,
        durum: tur === 'servis' ? sec(MAKINE_DURUMU).id : null,
        belirtiler: tur === 'servis' ? secBirkac(SERVIS_BELIRTI, 1, 3) : [],
        parcalar,
        parcaAdet: tur === 'parca' ? parcaAdet : null,
        urunTipi: tur === 'satinalma' ? sec(['Saman', 'Kuru ot', 'Silaj']) : '',
        arazi: tur === 'satinalma' ? sec(['Düz', 'Hafif eğimli', 'Engebeli']) : '',
        traktor: tur === 'satinalma' ? sec(['50-75 HP', '75-100 HP', '100 HP üzeri']) : '',
        aciklama:
          tur === 'servis'
            ? sec(SERVIS_ACIKLAMA)
            : tur === 'parca'
              ? sec(PARCA_ACIKLAMA)
              : sec(SATIS_ACIKLAMA),

        ses: sesliMi ? { veri: null, sure: tamsayi(8, 45) } : null,
        /* Fotoğraflar aşağıda, talepler kaydedildikten sonra
           ekleniyor: eklerin yazılması asenkron. */
        ekler: [],
        _fotoIstensin: tur === 'servis' && fotoKalan-- > 0,

        /* -------------------------------------------- Fatura ve ödeme */
        fatura: tur === 'parca' ? faturaUret(m) : null,
        dekont: tur === 'parca'
          ? { id: uid(), tur: sec(['pdf', 'gorsel']), ad: 'dekont', boyut: tamsayi(60, 400) }
          : null,
        odemeOnay: odemeVar ? { tarih: tarih + 5400000, personel, not: '' } : null,

        /* ----------------------------------------- Aşamaya özel kayıtlar */
        /* PLAN KAPANDIKTAN SONRA DA DURUYOR.

           Eskiden yalnız durum "planlandı" iken yazılıyordu; talep
           kapanınca plan kayboluyordu. Oysa gerçekte `talepPlanla`
           bir kez yazıyor ve kayıt kalıcı (bkz. veri.js). Kaybolunca
           "verilen tarihte teslim edildi mi" ölçüsü kapanmış
           taleplerde hesaplanamıyordu. */
        plan: asamalar.includes('planlandi')
          ? planUret(sonTarih, personel, tur)
          : null,
        teklif: (durum === 'teklif' || (durum === 'kapandi' && tur === 'satinalma'))
          ? teklifUret(sonTarih, personel)
          : null,
        iptalBilgi: durum === 'iptal'
          ? { neden: sec(IPTAL_NEDEN), aciklama: '', personel, tarih: sonTarih }
          : null,
        cozum: durum === 'kapandi'
          ? cozumUret(tur, parcalar, parcaAdet, personel, sonTarih)
          : null,

        notlar: notUret(tarih, personel),
        gecmis,
        demo: true,
      })
    }
  }

  /* Fotoğraf ekleri. Tuvale çizilip IndexedDB'ye yazılıyor; işlem
     asenkron olduğu için talepler kurulduktan sonra yapılıyor. */
  for (const t of talepler) {
    if (!t._fotoIstensin) {
      delete t._fotoIstensin
      continue
    }
    delete t._fotoIstensin
    try {
      const kac = tamsayi(1, 3)
      const yazilar = secBirkac(EK_YAZILARI, kac, kac)
      t.ekler = await Promise.all(yazilar.map((y) => fotoUret(y)))
    } catch {
      /* Tuval ya da IndexedDB kullanılamıyorsa demo yine yüklensin */
      t.ekler = []
    }
  }

  save(ANAHTAR.demoTalepler, talepler)

  /* ---- Numara değişikliği talepleri

     Bir kısmında seri no doğru (backoffice ✓ gösterecek), bir kısmında
     yanlış (✕) — kontrolün nasıl çalıştığı görünsün. */
  const numaraTalepleri = []
  secBirkac(musteriler, 4, 6).forEach((m) => {
    const dogru = Math.random() > 0.35
    const makine = m.makineler[0]
    numaraTalepleri.push({
      id: uid(),
      tarih: gunOnce(tamsayi(0, 12)),
      durum: sec(['bekliyor', 'bekliyor', 'bekliyor', 'onaylandi', 'reddedildi']),
      musteriId: m.id,
      ad: m.ad,
      eskiTel: '+90 ' + m.tel,
      eskiUlke: 'TR',
      yeniTel: telUret(),
      yeniTelHam: telUret(),
      yeniUlke: 'TR',
      seri: dogru ? makine.serial : seriUret(sec(PRODUCTS)),
      demo: true,
    })
  })
  numaraTalepleri.forEach((t) => {
    if (t.durum !== 'bekliyor') {
      t.karar = { personel: sec(yeniPersonel).ad, tarih: t.tarih + 7200000, not: '' }
    }
  })
  save(ANAHTAR.numaraTalepleri, [
    ...numaraTalepleri,
    ...load(ANAHTAR.numaraTalepleri, []),
  ])

  /* ---- Destek ekranı oturumları

     Destek Kayıtları ekranı demo verisinde bomboş kalıyordu; sunumda
     "müşteri talep açmadan önce neye baktı" anlatılamıyordu.

     Üç tür oturum üretiliyor:
       · cevap bulundu, talep açılmadı  → ekranın işe yaradığı hâl
       · cevap bulundu ama talep açıldı → yetmediği hâl
       · cevapsız kaldı                 → bilgi tabanının eksiği

     Üçü de raporlarda ayrı ayrı sayılıyor. */
  const destekOturumlari = []

  secBirkac(musteriler, 12, 18).forEach((m) => {
    const kac = tamsayi(1, 2)
    for (let i = 0; i < kac; i++) {
      const makine = sec(m.makineler)
      const urun = PRODUCTS.find((u) => u.id === makine.productId)
      const baslangic = gunOnce(tamsayi(0, 45))
      const sonuc = sec(['cozuldu', 'cozuldu', 'talep', 'cevapsiz'])

      const olaylar = [
        { tur: 'konu', deger: sec(DESTEK_KONU), tarih: baslangic + 20000 },
      ]

      if (sonuc === 'cevapsiz') {
        olaylar.push({ tur: 'serbest', deger: sec(DESTEK_CEVAPSIZ), tarih: baslangic + 60000 })
        olaylar.push({ tur: 'cevapsiz', deger: sec(DESTEK_CEVAPSIZ), tarih: baslangic + 65000 })
      } else {
        const soru = sec(DESTEK_SORU)
        olaylar.push({ tur: 'soru', deger: soru, tarih: baslangic + 55000 })
        olaylar.push({ tur: 'cevap', deger: soru, kayitId: 'kb-' + tamsayi(100, 999), tarih: baslangic + 60000 })
        if (sonuc === 'talep') {
          olaylar.push({ tur: 'yonlendirme', deger: 'servis', tarih: baslangic + 140000 })
        }
      }

      destekOturumlari.push({
        id: uid(),
        anahtar: m.id + '-' + makine.id,
        baslangic,
        son: olaylar[olaylar.length - 1].tarih,
        dil: 'tr',
        grup: urun?.category || 'genel',
        kullanici: { no: m.no, ad: m.ad, tel: m.tel, il: m.il, ilce: m.ilce },
        makine: { id: makine.id, serial: makine.serial, productId: makine.productId },
        urun: urun ? { id: urun.id, ad: urun.name } : null,
        olaylar,
        demo: true,
      })
    }
  })
  save(ANAHTAR.destekLog, [...destekOturumlari, ...load(ANAHTAR.destekLog, [])])

  /* ---- Duyurular ve uyarılar

     Duyurular ekranı da boştu. Dördü de gerçek bir üreticinin
     gönderebileceği içerikte: iki kampanya duyurusu, iki güvenlik
     uyarısı. Uyarılar uygulamada kampanya izni olmadan da gidiyor —
     hizmete ilişkin bildirim izne bağlı değil. */
  const duyurular = DUYURULAR.map((x, i) => ({
    id: uid(),
    tarih: gunOnce(tamsayi(1, 40) + i),
    tur: x.tur,
    alt: x.alt,
    baslik: x.baslik,
    metin: x.metin,
    gorsel: null,
    personel: sec(yeniPersonel).ad,
    pencere: i === 0,
    demo: true,
    ...(x.hedef ? { hedef: x.hedef } : {}),
  }))
  save(ANAHTAR.duyurular, [...duyurular, ...load(ANAHTAR.duyurular, [])])

  /* ---- Geri bildirimler */
  const gorusler = secBirkac(musteriler, 5, 8).map((m) => ({
    id: uid(),
    no: yeniNo('geribildirim'),
    tarih: gunOnce(tamsayi(0, 30)),
    metin: sec(GORUSLER),
    ad: m.ad,
    tel: m.tel,
    dil: 'tr',
    surum: '0.6.1',
    okundu: Math.random() > 0.6,
    gonderildi: false,
    demo: true,
  }))
  save(ANAHTAR.geriBildirim, [...gorusler, ...load(ANAHTAR.geriBildirim, [])])

  const ozet = {
    personel: yeniPersonel.length,
    musteri: musteriler.length,
    talep: talepler.length,
    numara: numaraTalepleri.length,
    gorus: gorusler.length,
    destek: destekOturumlari.length,
    duyuru: duyurular.length,
  }
  islemYaz({
    tur: 'demo',
    ozet: `Demo verisi yüklendi · ${ozet.personel} personel, ${ozet.musteri} müşteri, ` +
      `${ozet.talep} talep, ${ozet.destek} destek oturumu, ${ozet.duyuru} duyuru`,
  })
  return ozet
}

/** Demo kayıtlarını siler; gerçek kayıtlara dokunmaz. */
export function demoTemizle() {
  islemYaz({ tur: 'demo', ozet: 'Demo verisi temizlendi' })
  save(ANAHTAR.demoMusteriler, [])
  save(ANAHTAR.demoTalepler, [])
  save(ANAHTAR.personel, personelGetir().filter((p) => !p.demo))
  save(ANAHTAR.numaraTalepleri, load(ANAHTAR.numaraTalepleri, []).filter((t) => !t.demo))
  save(ANAHTAR.geriBildirim, load(ANAHTAR.geriBildirim, []).filter((g) => !g.demo))
  save(ANAHTAR.destekLog, load(ANAHTAR.destekLog, []).filter((o) => !o.demo))
  save(ANAHTAR.duyurular, load(ANAHTAR.duyurular, []).filter((x) => !x.demo))
  save(
    ANAHTAR.makineKayitlari,
    load(ANAHTAR.makineKayitlari, []).filter((x) => !x.demo)
  )
}

/* -------------------------------------------------------- Fotoğraf eki

   Talep detayındaki fotoğraf bölümü demo verisinde hep boş kalıyordu;
   sunumda "müşteri fotoğraf gönderebiliyor" denip gösterilecek bir şey
   olmuyordu.

   Gerçek fotoğraf konmuyor — kaynağı yok ve megabaytlarca veri demoyu
   ağırlaştırırdı. Onun yerine üstünde ne olduğu yazan basit bir kare
   çiziliyor. Ekranda fotoğrafın nasıl durduğu, büyütülünce ne olduğu ve
   yan yana kaç tane sığdığı görünüyor; anlatılmak istenen bu. */
const EK_YAZILARI = [
  'Düğüm atıcı', 'Pikap', 'Şanzıman', 'Hidrolik hortum',
  'Balya odası', 'Zincir', 'Rulman', 'Kayış',
]

async function fotoUret(yazi) {
  const tuval = document.createElement('canvas')
  tuval.width = 640
  tuval.height = 480
  const c = tuval.getContext('2d')

  c.fillStyle = '#1d2b45'
  c.fillRect(0, 0, 640, 480)
  c.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 640; i += 40) c.fillRect(i, 0, 1, 480)
  for (let i = 0; i < 480; i += 40) c.fillRect(0, i, 640, 1)

  c.fillStyle = '#e8641a'
  c.fillRect(60, 300, 520, 120)
  c.fillStyle = '#dce3ef'
  c.fillRect(90, 180, 460, 130)

  c.fillStyle = '#ffffff'
  c.font = 'bold 34px system-ui, sans-serif'
  c.fillText(yazi, 60, 100)
  c.font = '22px system-ui, sans-serif'
  c.fillStyle = 'rgba(255,255,255,0.65)'
  c.fillText('müşteri fotoğrafı · demo', 60, 140)

  const blob = await new Promise((r) => tuval.toBlob(r, 'image/jpeg', 0.7))
  const id = await ekYaz(blob)
  return { id, tur: 'foto', ad: yazi + '.jpg', boyut: blob.size }
}

/* ---------------------------------------------------- Talep parçaları

   Aşağıdaki üreticiler backoffice'in beklediği alan adlarını birebir
   dolduruyor (bkz. src/backoffice/ekranlar/Talepler.jsx). Bir alan
   eksik kalırsa o bölüm ekranda hiç çıkmıyor ve demo eksik görünüyor. */

function faturaUret(musteri) {
  const tuzel = Math.random() > 0.6
  const soyad = musteri.ad.split(' ').pop()
  return {
    tuzel,
    ad: tuzel ? '' : musteri.ad,
    tc: tuzel ? '' : String(tamsayi(10000000000, 99999999999)),
    unvan: tuzel ? soyad + ' Tarım Ltd. Şti.' : '',
    vergiNo: tuzel ? String(tamsayi(1000000000, 9999999999)) : '',
    tel: '+90 ' + musteri.tel,
    farkliKisi: false,
    adres:
      sec(['Yeni', 'Cumhuriyet', 'Atatürk', 'Fatih']) + ' Mahallesi, ' +
      tamsayi(1, 40) + '. Sokak No:' + tamsayi(1, 60),
    il: musteri.il,
    ilce: musteri.ilce,
    ulke: 'TR',
  }
}

function planUret(sonTarih, personel, tur) {
  /* `tarih` ZAMAN DAMGASI da yazılıyor.

     Demo yalnızca `tarihYazi` üretiyordu; gerçek planlama ikisini
     birden yazıyor (bkz. veri.js → talepPlanla). Damga olmayınca
     "planlanan gönderim tarihi geçti" uyarısı hiçbir demo kaydında
     çalışmıyordu — ekranda gösterilecek örnek yoktu.

     Yedek parçanın bir kısmı bilerek GEÇMİŞ tarihli: gönderim
     gecikmesi uyarısının sunumda görünmesi için. */
  const gecmis = tur === 'parca' && Math.random() < 0.5
  const zaman = gecmis
    ? sonTarih - 86400000 * tamsayi(1, 4)
    : sonTarih + 86400000 * tamsayi(1, 5)
  const d = new Date(zaman)
  return {
    tarih: zaman,
    tarihYazi: d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    is: sec(YAPILAN_IS),
    gorusuldu: true,
    personel,
    kayitTarihi: sonTarih,
  }
}

function teklifUret(sonTarih, personel) {
  return {
    tutar: String(tamsayi(85, 195) * 10000),
    gecerlilik: sec(['7 gün', '15 gün', '30 gün']),
    not: 'Fiyata teslim ve devreye alma dâhildir.',
    personel,
    tarih: sonTarih,
  }
}

/* Kapanış alanları türe göre değişiyor (bkz. Talepler ekranındaki
   KAPANIS_ALANLARI); demo da aynı alanları dolduruyor. */
function cozumUret(tur, parcalar, parcaAdet, personel, tarih) {
  if (tur === 'servis') {
    return {
      yapilanIs: sec(YAPILAN_IS),
      parcalar: parcalar.join(', '),
      ucret: sec(['Garanti kapsamında', String(tamsayi(80, 450) * 10)]),
      personel,
      tarih,
    }
  }

  if (tur === 'parca') {
    /* "Yapılan iş" gönderilen parçaların kendisi; personel yazmıyor,
       talepten geliyor (bkz. Talepler.jsx → KAPANIS_ALANLARI.parca).
       Not isteğe bağlı, demoda bir kısmında var. */
    return {
      yapilanIs: parcalar.map((x) => x + ' × ' + parcaAdet[x]).join(' · '),
      not: Math.random() < 0.35 ? sec(PARCA_KAPANIS_NOTU) : '',
      personel,
      tarih,
    }
  }

  const sonuc = sec(SATIS_SONUC)
  return {
    sonuc,
    satisFiyati: sonuc === 'Satış oldu' ? String(tamsayi(85, 195) * 10000) : '',
    not: 'Görüşme tamamlandı.',
    personel,
    tarih,
  }
}

/* İki tür not: iç not ekibin kendi arasında, müşteri notu telefona
   düşüyor. İkisi de demoda olsun ki ayrım ekranda görünsün. */
function notUret(tarih, personel) {
  if (Math.random() < 0.45) return []
  const notlar = [
    { metin: sec(IC_NOTLAR), tarih: tarih + 7200000, personel, musteriye: false },
  ]
  if (Math.random() > 0.5) {
    notlar.push({
      metin: sec(MUSTERI_NOTLARI),
      tarih: tarih + 10800000,
      personel,
      musteriye: true,
    })
  }
  return notlar
}
