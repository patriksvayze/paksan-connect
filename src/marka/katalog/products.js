import { URUN_EN, KATEGORI_EN, SPEC_EN, SPEC_DEGER_EN, VIDEO_EN, DESC_EN, BAKIM_EN } from './products.en'
import orkinosTanitim from '../varliklar/videolar/orkinos-1270-tanitim.mp4'

/* ==========================================================================
   PAKSAN ürün kataloğu
   Kategoriler ve model adları paksanmakina.com.tr sitesinden alındı.

   ÖNEMLİ — doldurulacak alanlar:
   - manualUrl : gerçek kullanım kılavuzu PDF adresi
   - videos[].url : gerçek YouTube video adresi (Paksan YouTube kanalı)
   - specs : gerçek teknik değerler
   Şu an bu alanlarda örnek/temsili bilgi var; şirketten gelen doğru
   bilgiyle değiştirilecek.
   ========================================================================== */

export const CATEGORIES = [
  { id: 'buyuk-balya', name: 'Büyük Balya Makineleri', short: 'Büyük Balya', icon: 'bale' },
  { id: 'kucuk-balya', name: 'Küçük Balya Makineleri', short: 'Küçük Balya', icon: 'bale' },
  { id: 'rulo-balya', name: 'Rulo Balya Makineleri', short: 'Rulo Balya', icon: 'roll' },
  { id: 'yem-karma', name: 'Yem Karma Makineleri', short: 'Yem Karma', icon: 'mixer' },
  { id: 'silaj', name: 'Silaj Ekipmanları', short: 'Silaj', icon: 'silage' },
  { id: 'cayir-ot', name: 'Çayır Biçme ve Ot Toplama', short: 'Çayır & Ot', icon: 'grass' },
  { id: 'toprak', name: 'Toprak İşleme', short: 'Toprak İşleme', icon: 'soil' },
]

/* Bakım şablonları — kategoriye göre ortak bakım adımları */
const BAKIM = {
  balya: [
    { saat: 10, baslik: 'Günlük gresleme', detay: 'Düğüm atıcı, piston yatakları ve pikap gres noktalarına gres basın.' },
    { saat: 50, baslik: 'Zincir gerginliği ve yağlama', detay: 'Tüm zincirlerin gerginliğini kontrol edin, zincir yağı uygulayın.' },
    { saat: 100, baslik: 'Düğüm atıcı kontrolü', detay: 'Düğüm atıcı bıçağı, ip tutucu ve yay basıncını kontrol edin.' },
    { saat: 250, baslik: 'Şanzıman yağ değişimi', detay: 'Ana şanzımandaki yağı boşaltıp şanzımanı yeni yağla doldurun.' },
    { saat: 500, baslik: 'Genel bakım', detay: 'Piston bıçağı ile karşı bıçak arasındaki boşluğu, tüm rulmanları ve emniyet cıvatalarını kontrol edin.' },
  ],
  yem: [
    { saat: 10, baslik: 'Günlük kontrol', detay: 'Bıçakların aşınıp aşınmadığını ve hidrolik kaçak olup olmadığını kontrol edin.' },
    { saat: 50, baslik: 'Gresleme', detay: 'Helezon yatakları ve boşaltma bandı rulmanlarını gresleyin.' },
    { saat: 250, baslik: 'Bıçak değişimi/bileme', detay: 'Kesici bıçakları kontrol edin, körelmişse değiştirin.' },
    { saat: 500, baslik: 'Şanzıman ve tartı', detay: 'Şanzıman yağını ve tartı sisteminin kalibrasyonunu kontrol edin.' },
  ],
  silaj: [
    { saat: 8, baslik: 'Bıçak bileme', detay: 'Her çalışma gününde bıçakları bileyin, karşı bıçak boşluğunu ayarlayın.' },
    { saat: 50, baslik: 'Gresleme ve kayış', detay: 'Gres noktalarını ve kayış gerginliğini kontrol edin.' },
    { saat: 250, baslik: 'Şanzıman yağı', detay: 'Şanzıman yağ seviyesini kontrol edin ve gerekiyorsa yağı değiştirin.' },
  ],
  toprak: [
    { saat: 10, baslik: 'Bıçak/keski kontrolü', detay: 'Kırık veya aşınmış bıçakları değiştirin, cıvata torklarını kontrol edin.' },
    { saat: 50, baslik: 'Gresleme', detay: 'Yan şanzıman ve rulman gres noktalarına gres basın.' },
    { saat: 250, baslik: 'Yağ değişimi', detay: 'Yan şanzıman ve ana şanzıman yağını değiştirin.' },
  ],
}

/*
  serialPrefix: Seri numarasının başındaki model kodu.
  Müşteri makinenin üzerindeki etiketten okuyup girecek.
  Örn: ORK1270-2024-00157
*/
const HAM_URUNLER = [
  /* ------------------------------------------------ BÜYÜK BALYA */
  {
    id: 'orkinos-1270',
    name: 'Orkinos 1270',
    category: 'buyuk-balya',
    tagline: 'Prizmatik büyük balya makinesi',
    serialPrefix: 'ORK1270',
    desc: 'Yüksek kapasiteli prizmatik büyük balya makinesi. Geniş pikabı ve güçlü sıkıştırma sistemiyle saman, kuru ot ve sap balyalamada yüksek yoğunluk sağlar.',
    specs: [
      ['Balya ölçüsü', '120 x 70 cm'],
      ['Balya uzunluğu', 'Ayarlanabilir, 40 – 250 cm'],
      ['Düğüm atıcı', '6 adet'],
      ['Pikap genişliği', '2.200 mm'],
      ['Gerekli traktör gücü', 'min. 120 HP'],
      ['Kuyruk mili devri', '1000 d/dk'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [
      {
        title: 'Orkinos 1270 tanıtım',
        type: 'tanitim',
        dur: '0:26',
        /* Uygulamanın içinde oynatılıyor — tarlada internet olmasa da açılır */
        dosya: orkinosTanitim,
      },
      { title: 'İlk çalıştırma ve traktöre bağlama', type: 'kullanim', dur: '6:40', url: null },
      { title: 'Düğüm atıcı ayarı', type: 'kullanim', dur: '8:05', url: null },
      { title: 'Balya yoğunluğu ayarı', type: 'kullanim', dur: '4:22', url: null },
    ],
  },
  {
    id: 'orkinos-870',
    name: 'Orkinos 870',
    category: 'buyuk-balya',
    tagline: 'Prizmatik büyük balya makinesi',
    serialPrefix: 'ORK870',
    desc: 'Orta ve büyük ölçekli işletmeler için prizmatik balya makinesi. Orkinos serisinin dayanıklılığını daha düşük traktör gücüyle sunar.',
    specs: [
      ['Balya ölçüsü', '80 x 70 cm'],
      ['Balya uzunluğu', 'Ayarlanabilir, 40 – 250 cm'],
      ['Düğüm atıcı', '4 adet'],
      ['Pikap genişliği', '1.900 mm'],
      ['Gerekli traktör gücü', 'min. 90 HP'],
      ['Kuyruk mili devri', '1000 d/dk'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [
      { title: 'Orkinos 870 tanıtım', type: 'tanitim', dur: '2:48', url: null },
      { title: 'Bakım ve gresleme noktaları', type: 'kullanim', dur: '5:30', url: null },
    ],
  },
  {
    id: 'orka-870',
    name: 'Orka 870',
    category: 'buyuk-balya',
    tagline: 'Prizmatik büyük balya makinesi',
    serialPrefix: 'ORKA870',
    desc: 'Orka serisi prizmatik balya makinesi. Sağlam şasi yapısı ve kolay bakım özellikleriyle uzun ömürlü kullanım sunar.',
    specs: [
      ['Balya ölçüsü', '80 x 70 cm'],
      ['Düğüm atıcı', '4 adet'],
      ['Pikap genişliği', '1.900 mm'],
      ['Gerekli traktör gücü', 'min. 85 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Orka 870 tanıtım', type: 'tanitim', dur: '2:35', url: null }],
  },
  {
    id: 'albatros-870',
    name: 'Albatros 870',
    category: 'buyuk-balya',
    tagline: 'Prizmatik büyük balya makinesi',
    serialPrefix: 'ALB870',
    desc: 'Albatros 870, yüksek çalışma hızı ve dengeli balya yoğunluğuyla müteahhit ve büyük işletmeler için tasarlanmıştır.',
    specs: [
      ['Balya ölçüsü', '80 x 70 cm'],
      ['Düğüm atıcı', '4 adet'],
      ['Pikap genişliği', '2.000 mm'],
      ['Gerekli traktör gücü', 'min. 100 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Albatros 870 tarlada', type: 'tanitim', dur: '3:04', url: null }],
  },

  /* ------------------------------------------------ KÜÇÜK BALYA */
  {
    id: 'super-yunus',
    name: 'Süper Yunus',
    category: 'kucuk-balya',
    tagline: 'Küçük balya makinesi',
    serialPrefix: 'SYNS',
    desc: 'PAKSAN\'ın en çok tercih edilen küçük balya makinesi. Elle taşınabilir balya ölçüsüyle küçük ve orta ölçekli işletmeler için idealdir.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Balya uzunluğu', '30 – 140 cm'],
      ['Düğüm atıcı', '2 – 3 adet (modele göre)'],
      ['Net genişlik', '163 cm'],
      ['Gerekli traktör gücü', 'min. 70 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [
      { title: 'Süper Yunus tanıtım', type: 'tanitim', dur: '2:20', url: null },
      { title: 'İp takma ve düğüm ayarı', type: 'kullanim', dur: '7:15', url: null },
      { title: 'Emniyet cıvatası değişimi', type: 'kullanim', dur: '3:40', url: null },
    ],
  },
  {
    id: 'super-yunus-dual2',
    name: 'Süper Yunus Dual 2',
    category: 'kucuk-balya',
    tagline: 'Çift sistemli küçük balya makinesi',
    serialPrefix: 'SYNSD2',
    desc: 'Süper Yunus\'un çift bağlama sistemli modeli. Daha sıkı balya ve daha az ip kopması sağlar.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Düğüm atıcı', '2 adet (Dual)'],
      ['Net genişlik', '163 cm'],
      ['Gerekli traktör gücü', 'min. 70 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Dual 2 sistemi nasıl çalışır', type: 'kullanim', dur: '4:50', url: null }],
  },
  {
    id: 'super-yunus-3yabali',
    name: 'Süper Yunus 3 Yabalı',
    category: 'kucuk-balya',
    tagline: 'Üç yabalı küçük balya makinesi',
    serialPrefix: 'SYNS3Y',
    desc: 'Üç yaba sistemi ile daha düzenli besleme ve daha yüksek çalışma kapasitesi sunan Süper Yunus modeli.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Yaba sayısı', '3'],
      ['Net genişlik', '163 cm'],
      ['Gerekli traktör gücü', 'min. 70 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: '3 Yabalı sistem tanıtımı', type: 'tanitim', dur: '2:55', url: null }],
  },
  {
    id: 'super-8002',
    name: 'Süper 8002',
    category: 'kucuk-balya',
    tagline: 'Küçük balya makinesi',
    serialPrefix: 'S8002',
    desc: 'Uzun yıllardır sahada kanıtlanmış klasik PAKSAN küçük balya makinesi.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Balya uzunluğu', '30 – 140 cm'],
      ['Düğüm atıcı', '2 adet'],
      ['Net genişlik', '142 cm'],
      ['Gerekli traktör gücü', 'min. 60 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Süper 8002 kullanım', type: 'kullanim', dur: '5:10', url: null }],
  },
  {
    id: 'super-8002e',
    name: 'Süper 8002E',
    category: 'kucuk-balya',
    tagline: 'Küçük balya makinesi (E serisi)',
    serialPrefix: 'S8002E',
    desc: 'Süper 8002\'nin geliştirilmiş E serisi. Güçlendirilmiş şasi ve iyileştirilmiş besleme sistemi.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Balya uzunluğu', '30 – 140 cm'],
      ['Düğüm atıcı', '2 adet'],
      ['Net genişlik', '150 cm'],
      ['Gerekli traktör gücü', 'min. 60 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'E serisi farkları', type: 'tanitim', dur: '3:20', url: null }],
  },
  {
    id: 'super-8002e-dual2',
    name: 'Süper 8002E Dual 2',
    category: 'kucuk-balya',
    tagline: 'Çift sistemli küçük balya makinesi',
    serialPrefix: 'S8002ED2',
    desc: 'E serisinin çift bağlama sistemli en üst modeli.',
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Düğüm atıcı', '2 adet (Dual)'],
      ['Net genişlik', '150 cm'],
      ['Gerekli traktör gücü', 'min. 60 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Süper 8002E Dual 2', type: 'tanitim', dur: '3:00', url: null }],
  },
  {
    id: 'hammer',
    name: 'Hammer',
    category: 'kucuk-balya',
    tagline: 'Küçük balya makinesi',
    serialPrefix: 'HMR',
    desc: 'Hammer, yüksek sıkıştırma gücü ve dayanıklı gövdesiyle zorlu şartlarda çalışan işletmeler için üretildi.',
    /* Değerler HAMMER kullanım kılavuzunun teknik tablosundan.
       Kılavuz iki modeli kapsıyor: 420 (2 bağlayıcı), 430 (3 bağlayıcı).
       Model bazında tam liste Kılavuzlar ekranında. */
    specs: [
      ['Balya ölçüsü', '36 x 46 cm'],
      ['Balya uzunluğu', '30 – 140 cm'],
      ['Düğüm atıcı', '2 – 3 adet (modele göre)'],
      ['Net genişlik', '180 cm'],
      ['Gerekli traktör gücü', 'min. 45 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [{ title: 'Hammer tanıtım', type: 'tanitim', dur: '2:44', url: null }],
  },

  /* ------------------------------------------------ RULO BALYA */
  {
    id: 'ipak-rulo',
    name: 'i-Pak Rulo Balya Makinesi',
    category: 'rulo-balya',
    tagline: 'Rulo (yuvarlak) balya makinesi',
    serialPrefix: 'IPAK',
    desc: 'Sabit hazneli rulo balya makinesi. Ağ ve ip sarma seçenekleriyle saman, kuru ot ve silaj balyalamaya uygundur.',
    /* Değerler YUVARLAK BALYA kullanım kılavuzunun teknik tablosundan */
    specs: [
      ['Balya çapı', '120 cm'],
      ['Balya genişliği', '120 cm'],
      ['Balya ağırlığı', '100 – 700 kg'],
      ['Sarma tipi', 'Otomatik file'],
      ['Pikap genişliği', '1.940 mm'],
      ['Gerekli traktör gücü', 'min. 70 HP'],
    ],
    bakim: BAKIM.balya,
    manualUrl: null,
    videos: [
      { title: 'i-Pak tanıtım', type: 'tanitim', dur: '3:30', url: null },
      { title: 'Ağ takma ve ayarı', type: 'kullanim', dur: '6:12', url: null },
    ],
  },

  /* ------------------------------------------------ YEM KARMA */
  {
    id: 'diamond-dikey',
    name: 'Diamond Dikey Yem Karma',
    category: 'yem-karma',
    tagline: 'Dikey helezonlu yem karma makinesi',
    serialPrefix: 'DMD',
    variants: ['4 m³', '6 m³', '8 m³'],
    desc: 'Kaba ve kesif yemi homojen karıştıran dikey helezonlu yem karma makinesi. Özel tasarım kesici bıçakları, yükleme kepçesi ve boşaltma bandı ile süt ve besi sığırcılığı işletmeleri için üretildi.',
    specs: [
      ['Hacim seçenekleri', '4 m³ / 6 m³ / 8 m³'],
      ['Helezon', 'Dikey, tek helezon'],
      ['Bıçak', 'Özel tasarım kesici bıçak'],
      ['Boşaltma', 'Bant ile yandan boşaltma'],
      ['Tartı sistemi', 'Dijital (opsiyonel)'],
      ['Yükleme kepçesi', 'Opsiyonel'],
    ],
    bakim: BAKIM.yem,
    manualUrl: null,
    videos: [
      { title: 'Diamond tanıtım', type: 'tanitim', dur: '4:10', url: null },
      { title: 'Doğru yükleme sırası', type: 'kullanim', dur: '5:35', url: null },
      { title: 'Tartı kalibrasyonu', type: 'kullanim', dur: '4:05', url: null },
    ],
  },
  {
    id: 'pelican-yatay',
    name: 'Pelican Yatay Yem Karma',
    category: 'yem-karma',
    tagline: 'Yatay helezonlu yem karma makinesi',
    serialPrefix: 'PLC',
    desc: 'Yatay helezon sistemiyle hızlı ve homojen karışım sağlayan yem karma makinesi. Düşük tavan yüksekliğine sahip ahırlar için uygundur.',
    specs: [
      ['Helezon', 'Yatay'],
      ['Boşaltma', 'Çift yönlü bant'],
      ['Tartı sistemi', 'Dijital (opsiyonel)'],
    ],
    bakim: BAKIM.yem,
    manualUrl: null,
    videos: [{ title: 'Pelican tanıtım', type: 'tanitim', dur: '3:45', url: null }],
  },

  /* ------------------------------------------------ SİLAJ */
  {
    id: 'scorpion-silaj',
    name: 'Scorpion Silaj Makinesi',
    category: 'silaj',
    tagline: 'Sıra bağımsız silaj makinesi',
    serialPrefix: 'SCRP',
    desc: 'Sıra bağımsız çalışan silaj makinesi. Mısır, sorgum ve benzeri ürünleri sıra gözetmeksizin biçip parçalar.',
    specs: [
      ['Çalışma tipi', 'Sıra bağımsız'],
      ['Kesme boyu', 'Ayarlanabilir'],
      ['Gerekli traktör gücü', 'min. 90 HP'],
    ],
    bakim: BAKIM.silaj,
    manualUrl: null,
    videos: [
      { title: 'Scorpion tarlada', type: 'tanitim', dur: '3:55', url: null },
      { title: 'Bıçak bileme ve boşluk ayarı', type: 'kullanim', dur: '7:30', url: null },
    ],
  },
  {
    id: 'silaj-paketleme',
    name: 'Ahtapot Silaj Paketleme Makinesi',
    category: 'silaj',
    tagline: 'Balya sarma / paketleme makinesi',
    serialPrefix: 'AHTP',
    desc: 'Rulo balyaları streç film ile sararak silaj yapımını sağlayan paketleme makinesi.',
    specs: [
      ['Balya çapı', '120 cm\'e kadar'],
      ['Film genişliği', '500 / 750 mm'],
      ['Kumanda', 'Hidrolik'],
    ],
    bakim: BAKIM.silaj,
    manualUrl: null,
    videos: [
      { title: 'Ahtapot tanıtım', type: 'tanitim', dur: '2:50', url: null },
      { title: 'Paketleme makinesi kullanımı', type: 'kullanim', dur: '5:20', url: null },
    ],
  },

  /* ------------------------------------------------ ÇAYIR & OT */
  {
    id: 'yengec-cayir',
    name: 'Yengeç Çayır Biçme Makinesi',
    category: 'cayir-ot',
    tagline: 'Diskli çayır biçme makinesi',
    serialPrefix: 'YNGC',
    desc: 'Diskli çayır biçme makinesi. Temiz kesim ve yüksek çalışma hızı sağlar.',
    specs: [
      ['Disk sayısı', '4 – 8 (modele göre)'],
      ['Çalışma genişliği', '1.650 – 2.800 mm'],
      ['Gerekli traktör gücü', 'min. 50 HP'],
    ],
    bakim: BAKIM.toprak,
    manualUrl: null,
    videos: [{ title: 'Yengeç tanıtım', type: 'tanitim', dur: '2:40', url: null }],
  },
  {
    id: 'kirlangic-ot-toplama',
    name: 'Kırlangıç Ot Toplama Makinesi',
    category: 'cayir-ot',
    tagline: 'Ot toplama / tırmık makinesi',
    serialPrefix: 'KRLG',
    desc: 'Biçilen otu namlu hâline getiren ot toplama makinesi. Balya öncesi düzgün namlu oluşturur.',
    specs: [
      ['Parmak kolu sayısı', '10 – 12'],
      ['Çalışma genişliği', '3.200 – 3.800 mm'],
      ['Gerekli traktör gücü', 'min. 40 HP'],
    ],
    bakim: BAKIM.toprak,
    manualUrl: null,
    videos: [{ title: 'Kırlangıç tanıtım', type: 'tanitim', dur: '2:15', url: null }],
  },

  /* ------------------------------------------------ TOPRAK İŞLEME */
  {
    id: 'rotovator',
    name: 'Rotovatör',
    category: 'toprak',
    tagline: 'Toprak frezesi',
    serialPrefix: 'RTV',
    desc: 'Toprağı parçalayıp ekime hazır hale getiren rotovatör. Değişik çalışma genişliği seçenekleriyle sunulur.',
    specs: [
      ['Çalışma genişliği', '1.400 – 2.500 mm'],
      ['Bıçak tipi', 'C tipi / L tipi'],
      ['Şanzıman', 'Yan zincir / dişli'],
      ['Gerekli traktör gücü', 'min. 45 HP'],
    ],
    bakim: BAKIM.toprak,
    manualUrl: null,
    videos: [{ title: 'Rotovatör kullanımı', type: 'kullanim', dur: '4:00', url: null }],
  },
  {
    id: 'tesviye-kuregi',
    name: 'Tesviye Küreği',
    category: 'toprak',
    tagline: 'Arazi tesviye küreği',
    serialPrefix: 'TSVY',
    desc: 'Tarla düzeltme ve tesviye işleri için kullanılan kürek. Sağlam çelik gövde.',
    specs: [
      ['Çalışma genişliği', '1.800 – 2.500 mm'],
      ['Kumanda', 'Mekanik / Hidrolik'],
      ['Gerekli traktör gücü', 'min. 40 HP'],
    ],
    bakim: BAKIM.toprak,
    manualUrl: null,
    videos: [{ title: 'Tesviye küreği tanıtım', type: 'tanitim', dur: '1:50', url: null }],
  },
]

/* Liste alanları burada garantiye alınıyor.

   Ekranlar `product.videos.filter(...)`, `product.specs.map(...)` diye
   yazıyor; alan hiç yoksa ekran çöküyor. Bugünkü katalogda üçü de her
   üründe dolu ama bu kataloğu dolduran kişinin dikkatine bağlı — bir
   üründe `videos` satırını yazmayı unutmak o makinenin detay ekranını
   kapatıyor ve hata ancak o makineyi kaydeden müşteride görülüyor.

   Boşluk üç ekranda ayrı ayrı değil, kaynağında bir kez kapatılıyor. */
const HEPSI_DIZI = (u) => ({
  ...u,
  specs: u.specs || [],
  videos: u.videos || [],
  bakim: u.bakim || [],
})

export const PRODUCTS = HAM_URUNLER.map(HEPSI_DIZI)

/* ------------------------------------------------------- Vitrin sırası

   Listelerde önce balya makineleri, sonra yem karma makineleri gelir;
   geri kalanı katalogdaki sırayı korur. Balya grubunun içinde de öne
   çıkarılacak modeller belli.

   Sebep: Paksan'ın ana işi balya makinesi. Müşteri uygulamayı açtığında
   önce onu görsün; sıralamayı rastgeleye bırakmıyoruz.                 */

const ONCELIKLI_MODELLER = ['super-yunus', 'orka-870', 'ipak-rulo']

const KATEGORI_ONCELIGI = {
  'buyuk-balya': 0,
  'kucuk-balya': 0,
  'rulo-balya': 0,
  'yem-karma': 1,
}

function sira(p) {
  const kat = KATEGORI_ONCELIGI[p.category] ?? 2
  const model = ONCELIKLI_MODELLER.indexOf(p.id)
  return [kat, model === -1 ? 99 : model]
}

/* Ana ekranın vitrini — karşılamada hangi beş modelin göründüğünü belirler.

   Bu liste kodda değil, burada duruyor çünkü seçim firmanın ticari
   kararı: Hangi modeli öne çıkardığı, sezona ve stoğa göre değişiyor.
   Sıra da bilerek sabit — önce balya makineleri, sonra yem karma.

   Ürüne bayrak koymak yerine liste tutuluyor: Bayrak, sırayı
   taşıyamıyor; vitrinde sıra anlamlı.

   Kimliği katalogda bulunmayan satır sessizce atlanıyor; liste boş
   bırakılırsa ana ekranda vitrin bölümü hiç çıkmıyor. */
export const VITRIN = [
  'super-yunus',
  'orka-870',
  'ipak-rulo',
  'orkinos-1270',
  'diamond-dikey',
]

/** Ürünleri vitrin sırasına göre dizer (özgün diziyi bozmadan). */
export function siralanmisUrunler(liste = PRODUCTS) {
  return [...liste].sort((a, b) => {
    const [ka, ma] = sira(a)
    const [kb, mb] = sira(b)
    return ka - kb || ma - mb
  })
}

/* Kılavuz listesindeki sıra — makine tipine göre.
   Vitrin sırasından ayrı: orada öne çıkarılan modeller vardı, burada
   çiftçi kendi makine tipini arıyor. */
const KILAVUZ_SIRASI = {
  'kucuk-balya': 0,
  'buyuk-balya': 1,
  'rulo-balya': 2,
}

/** Ürünleri kılavuz listesi sırasına göre dizer. */
export function kilavuzSirasiyla(liste = PRODUCTS) {
  return [...liste].sort((a, b) => {
    const ka = KILAVUZ_SIRASI[a.category] ?? 3
    const kb = KILAVUZ_SIRASI[b.category] ?? 3
    if (ka !== kb) return ka - kb
    /* Aynı tipte olanlar kendi aralarında kategori sırasını,
       sonra katalogdaki sırayı korur. */
    if (a.category !== b.category) {
      return (
        CATEGORIES.findIndex((c) => c.id === a.category) -
        CATEGORIES.findIndex((c) => c.id === b.category)
      )
    }
    return 0
  })
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null
}

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null
}

export function productsByCategory(catId) {
  return PRODUCTS.filter((p) => p.category === catId)
}

/* Bir ürünün hangi bakım/arıza bilgi grubuna ait olduğunu döndürür */
/* ------------------------------------------------------------- Dil

   Model adları ve tür açıklamaları products.en.js dosyasında. Bir
   ürünün İngilizcesi yoksa Türkçesi gösteriliyor — liste hiç boş
   kalmıyor, eksik ürün belli oluyor.

   Kullanım (ekranlarda):
     const p = urunDilde(getProduct(id), dil)
     <h1>{p.name}</h1>                                              */

export function urunDilde(urun, dil = 'tr') {
  if (!urun || dil === 'tr') return urun
  const ceviri = URUN_EN[urun.id] || {}
  return {
    ...urun,
    ...ceviri,
    /* Teknik özelliklerde yalnız ETİKET çevriliyor; değer (120 x 70 cm,
       min. 120 HP) her dilde aynı. */
    specs: (urun.specs || []).map(([k, v]) => [SPEC_EN[k] || k, SPEC_DEGER_EN[v] || v]),
    videos: (urun.videos || []).map((v) => ({ ...v, title: VIDEO_EN[v.title] || v.title })),
    desc: DESC_EN[urun.id] || urun.desc,
    bakim: (urun.bakim || []).map((b) => ({ ...b, ...(BAKIM_EN[b.baslik] || {}) })),
  }
}

export function kategoriDilde(kategori, dil = 'tr') {
  if (!kategori || dil === 'tr') return kategori
  const ceviri = KATEGORI_EN[kategori.id]
  return ceviri ? { ...kategori, ...ceviri } : kategori
}

export function supportGroup(product) {
  if (!product) return 'genel'
  if (product.category === 'buyuk-balya' || product.category === 'kucuk-balya') return 'balya'
  if (product.category === 'rulo-balya') return 'rulo'
  if (product.category === 'yem-karma') return 'yem'
  if (product.category === 'silaj') return 'silaj'
  if (product.category === 'cayir-ot') return 'cayir'
  if (product.category === 'toprak') return 'toprak'
  return 'genel'
}
