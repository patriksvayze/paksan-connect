/* ==========================================================================
   Demo verisi — makineye uyan kayıt

   NEDEN VAR (kullanıcı sınaması, 24 Eylül 2026). Demo üreticisi önce
   makineyi seçiyor, sonra arızayı, parçayı ve notu makineye bakmadan ayrı
   ayrı rastgele çekiyordu. Sınamada üç örnek çıktı:
     · Rotovatörde "düğüm atmıyor, ip kopuyor" arızası (bütün metinler
       balya makinesi için yazılmıştı),
     · garantisi bitmiş makinede "Garanti kapsamında, ücret alınmayacak"
       notu ve garanti kaydı (seri yılı ile makinenin yılı ayrı ayrı
       rastgeleydi),
     · Süper 8002E kaydında "YUNUS ALT YAN KILAVUZ LAMASI" parçası (parça
       538 kalemlik kataloğun tamamından seçiliyordu).

   SEÇİM SIRASI. senaryo → senaryonun makineden istediği (garanti, parça)
   → makine → makinenin ailesine uyan arıza vakası → parçalar (vakanın
   gruplarından, makinenin ailesine ve modeline göre süzülmüş katalogdan)
   → notlar. Köprüler ekosistemin kendi köprüleri: `supportGroup` (makine
   → aile), `PARCA_GRUBU_AILESI` (parça grubu → aile),
   `PARCA_ADINDAKI_MODEL` ve `GRUBUN_MODELLERI` (listenin kendi model
   kısıtı), `belirtileriGetir` (formun belirti değerleri) ve seri
   numarasındaki yıl (garanti). Demo yeni bir uyumluluk uydurmuyor.

   GARANTİ SERİDEN. Servisim ve talep detayı garantiyi seri numarasındaki
   yıldan okuyor; demo da oradan okuyor (garantideMi).

   Ekranda görünen metinler (arıza açıklaması, sonuç, fotoğraf yazısı,
   destek soruları) servisin, backoffice'in ve Destek Kayıtları'nın
   ekranında görünüyor; Codex'ten geçiyor (bkz. CODEX-BEKLEYEN.md). Belirti
   değerleri talepAlanlari.js'in kendi değerleri, burada yazılmıyor,
   seçiliyor.

   Sunucu bağlandığında demo dosyalarıyla birlikte bu dosya da siliniyor
   (bkz. servis/demoKur.js başı).
   ========================================================================== */

import { getProduct, supportGroup, PARCA_GRUBU_AILESI, PARCA_ADINDAKI_MODEL, GRUBUN_MODELLERI } from '../marka'
import { extractYear, warrantyStatus } from '../lib/serial'

const sec = (d) => d[Math.floor(Math.random() * d.length)]

/** Makinenin ailesi: balya · rulo · yem · silaj · cayir · toprak · genel */
export const makineAilesi = (productId) => supportGroup(getProduct(productId))

/** Servisim'in ve talep detayının baktığı yer: seri numarasındaki yıl. */
export function garantideMi(seri) {
  const s = warrantyStatus(extractYear(seri)).state
  return s === 'devam' || s === 'son'
}

/* Parça adının kelimeleri, Türkçe büyük harfle: "10x50x1035 YUNUS ALT…"
   → ['10X50X1035', 'YUNUS', 'ALT', …]. Kelime olarak aranıyor ki
   "DUAL" başka bir kelimenin içinde yakalanmasın. */
const kelimeler = (ad) =>
  String(ad || '').toLocaleUpperCase('tr-TR').split(/[^0-9A-ZÇĞİÖŞÜ]+/).filter(Boolean)

/**
 * Bu makineye takılabilecek parçalar: makinenin ailesinin grupları, tek
 * makineye ait gruplar yalnız o makinede, adında model geçen parça yalnız
 * o modelde. Satır, servis kaydının ve parça talebinin taşıdığı alanlarla
 * (görsel dahil; bkz. CLAUDE.md "Katalog değişince geçmiş işlem
 * değişmez") ve seçim için grubuyla dönüyor.
 */
export function makineninParcaHavuzu(katalog, productId) {
  const aile = makineAilesi(productId)
  const kendi = Object.keys(GRUBUN_MODELLERI).filter((g) => GRUBUN_MODELLERI[g].includes(productId))
  return (katalog?.parcalar || [])
    .filter((p) => {
      if (kendi.length) return kendi.includes(p.grup)
      if (GRUBUN_MODELLERI[p.grup] || PARCA_GRUBU_AILESI[p.grup] !== aile) return false
      const k = kelimeler(p.ad)
      return Object.entries(PARCA_ADINDAKI_MODEL).every(
        ([kelime, urunler]) => !k.includes(kelime) || urunler.includes(productId),
      )
    })
    .map((p) => ({ kod: p.kod, ad: p.ad, fiyat: p.fiyat, gorsel: p.gorsel ?? null, grup: p.grup }))
}

/* ==========================================================================
   Arıza vakaları

   Bir vaka, çiftçinin talep formunda anlatacağı arızanın bütünü:
     durum       makinenin durumu (talepAlanlari.js → MAKINE_DURUMU kimliği)
     belirtiler  YALNIZ talepAlanlari.js → belirtileriGetir(aile) değerleri
     aciklama    çiftçinin yazdığı cümle; servis kaydının "Müşterinin
                 Anlattığı" satırı da bu (ServisKapanisi.jsx aynı yeri okuyor)
     foto        çiftçinin fotoğrafının üstündeki yazı
     parca       'olur'   iş parçalı da parçasız da bitebilir
                 'gerekir' iş ancak parçayla biter
                 'yok'    parça gerekmiyor ya da listede makinenin parçası yok
     gruplar     parçalı işte parçanın seçildiği katalog grupları
     urunler     vaka yalnız bu ürünlerde (ailenin tek bir makinesine ait arıza)
     parcasiz    parçasız biten işin "Yapılan İş"i (servisKaydi.js →
                 YAPILAN_IS değerlerinden biri) ve sonucu

   Rulo, silaj ve toprak ailelerinin fiyat listesinde parçası yok
   (marka/katalog/parcaGruplari.js → PARCASIZ_AILELER); vakaları da
   parçasız.
   ========================================================================== */

const HAMMER = 'hammer-yedek-parca'

export const ARIZA_VAKALARI = {
  balya: [
    {
      durum: 'sorunlu',
      belirtiler: ['Düğüm atmıyor', 'İp kopuyor'],
      aciklama: 'Balya yaparken ip sürekli kopuyor, ayar yaptım düzelmedi.',
      foto: 'Düğüm atıcı',
      parca: 'olur',
      gruplar: ['baglama-grubu', 'ip-gerdirme-sistemi', 'baglama-grubu-balata-sistemi', HAMMER],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Düğüm atıcı ayarlandı. Makine tarlada denendi, düzgün düğüm atıyor.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Pikap otu almıyor', 'Anormal ses geliyor'],
      aciklama: 'Pikaptan ses geliyor, ot toplamıyor.',
      foto: 'Pikap',
      parca: 'olur',
      gruplar: ['tirmik-sistemi', 'tirmik-hareket-sistemi', 'tirmik-kaldirma-sistemi', HAMMER],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Pikap yüksekliği ve zincir gerginliği ayarlandı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Balya gevşek çıkıyor', 'Balya dağılıyor'],
      aciklama: 'Balyalar gevşek çıkıyor, taşırken dağılıyor.',
      foto: 'Balya odası',
      parca: 'olur',
      gruplar: ['balya-cikis-sistemi', 'balya-boy-ayar-sistemi', 'balya-boy-ayar-cark-sistemi'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Balya sıkıştırma ayarı yapıldı, balyalar sıkı çıkıyor.' },
    },
    {
      durum: 'durdu',
      belirtiler: ['Şaft / mafsal sorunu', 'Aşırı titriyor'],
      aciklama: 'Kuyruk mili tarafında titreşim var, makineyi durdurdum.',
      foto: 'Şaft',
      parca: 'olur',
      gruplar: ['saftlar', 'saft-aski-sistemi', 'volan', 'sigorta'],
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Şaft mafsalları yağlandı, titreşim kalmadı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Yağ kaçağı var', 'Hidrolikte sorun'],
      aciklama: 'Hidrolik hortumdan yağ kaçırıyor.',
      foto: 'Hidrolik hortum',
      parca: 'yok',
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Hortum bağlantıları sıkıldı, yağ kaçağı kalmadı.' },
    },
  ],
  rulo: [
    {
      durum: 'sorunlu',
      belirtiler: ['Ağ veya ip sarmıyor'],
      aciklama: 'Balya oluşuyor ama ağ sarmıyor, elle sarmak zorunda kalıyorum.',
      foto: 'Ağ sarma ünitesi',
      parca: 'yok',
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Ağ sarma ünitesi ayarlandı, balya düzgün sarılıyor.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Kapak açılmıyor / kapanmıyor', 'Hidrolikte sorun'],
      aciklama: 'Arka kapak açılıyor ama kapanmıyor.',
      foto: 'Arka kapak',
      parca: 'yok',
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Hidrolik bağlantıları temizlendi, kapak açılıp kapanıyor.' },
    },
  ],
  yem: [
    {
      durum: 'sorunlu',
      belirtiler: ['Tartı çalışmıyor'],
      aciklama: 'Tartı ekranı sıfırda kalıyor, yükleme yaparken değer değişmiyor.',
      foto: 'Tartı ekranı',
      parca: 'yok',
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Tartı ayarlandı, yüklenen ağırlık doğru gösteriliyor.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Helezon sıkışıyor', 'Anormal ses geliyor'],
      aciklama: 'Helezon arada sıkışıyor, zorlanma sesi geliyor.',
      foto: 'Helezon',
      parca: 'olur',
      gruplar: ['yem-karma'],
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Helezon temizlendi, bıçaklar kontrol edildi, ses kalmadı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Boşaltma yapmıyor'],
      aciklama: 'Boşaltma kapağı açılıyor ama yem akmıyor.',
      foto: 'Boşaltma kapağı',
      parca: 'olur',
      gruplar: ['yem-karma'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Boşaltma kapağı ayarlandı, yem düzgün akıyor.' },
    },
  ],
  silaj: [
    {
      durum: 'sorunlu',
      belirtiler: ['Tıkanma oluyor'],
      aciklama: 'Islak mısırda sık sık tıkanıyor.',
      foto: 'Besleme ağzı',
      parca: 'yok',
      urunler: ['scorpion-silaj'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Besleme merdaneleri ayarlandı, tıkanma kalmadı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Bıçaklar körelmiş', 'Kesme boyu tutmuyor'],
      aciklama: 'Kıyım boyu tutmuyor, bıçaklar kesmiyor gibi.',
      foto: 'Bıçaklar',
      parca: 'yok',
      urunler: ['scorpion-silaj'],
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Bıçaklar bilendi, kıyım boyu ayarlandı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Anormal ses geliyor'],
      aciklama: 'Sarma kolu dönerken ses geliyor, streç film yırtılıyor.',
      foto: 'Sarma kolu',
      parca: 'yok',
      urunler: ['silaj-paketleme'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Film germe ünitesi ayarlandı, film düzgün sarılıyor.' },
    },
  ],
  cayir: [
    {
      durum: 'sorunlu',
      belirtiler: ['Biçme düzgün değil'],
      aciklama: 'Biçerken yer yer ot kalıyor, düz biçmiyor.',
      foto: 'Bıçaklar',
      parca: 'olur',
      gruplar: ['cayir-bicme'],
      urunler: ['yengec-cayir'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Tambur yüksekliği ayarlandı, makine düzgün biçiyor.' },
    },
    {
      /* Kırık bıçak parçasız bitmez: yalnız parçalı işte seçiliyor. */
      durum: 'sorunlu',
      belirtiler: ['Bıçak veya parmak kırılıyor'],
      aciklama: 'Taşlı tarlada bıçaklar sık kırılıyor, iki bıçak koptu.',
      foto: 'Kırık bıçak',
      parca: 'gerekir',
      gruplar: ['cayir-bicme'],
      urunler: ['yengec-cayir'],
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Tırmık otu toplamıyor'],
      aciklama: 'Tırmık otu tam toplamıyor, arkada ot kalıyor.',
      foto: 'Tırmık kolları',
      parca: 'olur',
      gruplar: ['ot-toplama'],
      urunler: ['kirlangic-ot-toplama'],
      parcasiz: { yapilanIs: 'Ayar Yapıldı', sonuc: 'Tırmık yüksekliği ayarlandı, otlar tam toplanıyor.' },
    },
  ],
  toprak: [
    {
      durum: 'sorunlu',
      belirtiler: ['Toprağı düzgün işlemiyor', 'Anormal ses geliyor'],
      aciklama: 'Rotor dönerken şanzımandan ses geliyor.',
      foto: 'Şanzıman',
      parca: 'yok',
      urunler: ['rotovator'],
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Şanzıman yağı değiştirildi, rotor yatakları yağlandı, ses kalmadı.' },
    },
    {
      durum: 'sorunlu',
      belirtiler: ['Hidrolikte sorun'],
      aciklama: 'Küreği kaldırınca kendiliğinden aşağı iniyor.',
      foto: 'Hidrolik silindir',
      parca: 'yok',
      urunler: ['tesviye-kuregi'],
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Hidrolik bağlantılar sıkıldı, kürek havada duruyor.' },
    },
  ],
  genel: [
    {
      durum: 'kontrol',
      belirtiler: ['Anormal ses geliyor'],
      aciklama: 'Çalışırken alışılmadık bir ses geliyor.',
      foto: 'Makinenin genel görünümü',
      parca: 'yok',
      parcasiz: { yapilanIs: 'Bakım Yapıldı', sonuc: 'Genel kontrol ve yağlama yapıldı.' },
    },
  ],
}

/* Yeni makinenin ilk kurulumu: arıza değil. Talep formu kurulumda belirti
   ve açıklamayı siliyor (screens/RequestForm.jsx), servis kaydının nedeni
   makinenin durum adı ("İlk kurulum yapılacak"). */
export const KURULUM_VAKASI = {
  durum: 'kurulum',
  belirtiler: [],
  aciklama: '',
  foto: null,
  parca: 'yok',
  parcasiz: {
    yapilanIs: 'İlk Kurulum ve Çalıştırma',
    sonuc: 'Makine traktöre bağlandı, ayarları yapıldı, müşteriye kullanımı anlatıldı.',
  },
}

function ailesininVakalari(productId) {
  const liste = (ARIZA_VAKALARI[makineAilesi(productId)] || ARIZA_VAKALARI.genel).filter(
    (v) => !v.urunler || v.urunler.includes(productId),
  )
  return liste.length ? liste : ARIZA_VAKALARI.genel
}

/** Vakanın parçası bu makinede hangi parçalardan seçilir (parçasız vakada boş). */
export const vakaHavuzu = (katalog, productId, vaka) =>
  vaka?.gruplar
    ? makineninParcaHavuzu(katalog, productId).filter((p) => vaka.gruplar.includes(p.grup))
    : []

/** Bu makinede parçalı biten bir iş kurulabiliyor mu? */
export const parcaliIsOlur = (katalog, productId) =>
  ailesininVakalari(productId).some((v) => v.parca !== 'yok' && vakaHavuzu(katalog, productId, v).length > 0)

/**
 * Senaryonun makineden istediği.
 *   garanti        servis kaydı açılıyor; kayıt yalnız garanti işi için
 *                  (lib/servisKaydi.js başı), makine garanti süresinde olmalı
 *   parcali        iş parça isteyerek yürüyor
 *   parcasizBiter  kayıt var ama parçasız bitiyor
 *   garantiDisi    garanti dışı iş; garantisi bitmiş makine tercih ediliyor
 * Parçalı olup olmadığı onaylanan ve reddedilen işte burada, BİR KEZ
 * seçiliyor: makine seçimi ile servis akışı aynı kararı okusun.
 */
export function senaryoIhtiyaci(senaryo) {
  const parcaSahnesi = ['parcaIstendi', 'parcaYolda', 'parcaGeldi', 'onayParcali'].includes(senaryo)
  const kayitli = parcaSahnesi || ['onayParcasiz', 'onaylandi', 'reddedildi'].includes(senaryo)
  const parcali = parcaSahnesi || (['onaylandi', 'reddedildi'].includes(senaryo) && Math.random() < 0.6)
  return {
    garanti: kayitli,
    parcali,
    parcasizBiter: kayitli && !parcali,
    garantiDisi: senaryo === 'garantiDisi',
  }
}

/** Makine senaryonun istediğini karşılıyor mu? */
export function makineUyar(katalog, mk, ihtiyac) {
  if (ihtiyac.garanti && !garantideMi(mk.serial)) return false
  if (ihtiyac.parcali && !parcaliIsOlur(katalog, mk.productId)) return false
  return true
}

/**
 * Makineye ve senaryoya uyan arıza vakası. Garantideki yeni makinede
 * arada bir ilk kurulum (servisin elle açtığı işte değil: dükkâna gelen
 * müşteri kurulum için gelmiyor).
 */
export function vakaSec(katalog, mk, senaryo, ihtiyac, { elle = false } = {}) {
  const yeni = (extractYear(mk.serial) || 0) >= new Date().getFullYear() - 1
  if (
    !elle &&
    !ihtiyac.parcali &&
    yeni &&
    ['yeni', 'planlandi', 'onayParcasiz', 'onaylandi', 'iptal'].includes(senaryo) &&
    Math.random() < 0.15
  ) {
    return KURULUM_VAKASI
  }
  const liste = ailesininVakalari(mk.productId).filter((v) =>
    ihtiyac.parcali
      ? v.parca !== 'yok' && vakaHavuzu(katalog, mk.productId, v).length > 0
      : ihtiyac.parcasizBiter
        ? v.parca !== 'gerekir'
        : true,
  )
  return sec(liste.length ? liste : ARIZA_VAKALARI.genel)
}

/* Parça isterken "Tespitiniz" ve parçayı takınca "Yapılan İş" ayrıntısı:
   seçilen parçaların adıyla kuruluyor, parçayla çelişmesin. */
const TESPIT_KALIBI = 'Hasarlı parça: {parcalar}. Değişmesi gerekiyor.'
const PARCALI_SONUC_KALIBI = 'Parça değişti ({parcalar}), makine denendi, sorun kalmadı.'

const adlar = (parcalar) => parcalar.map((p) => p.ad).join(', ')
export const tespitYazisi = (parcalar) => TESPIT_KALIBI.replace('{parcalar}', adlar(parcalar))
export const parcaliSonucYazisi = (parcalar) => PARCALI_SONUC_KALIBI.replace('{parcalar}', adlar(parcalar))

/* ==========================================================================
   Destek asistanına yazılan sorular

   Çiftçi soruyu kendisi yazıyor (bkz. screens/Support.jsx); kılavuzda
   cevabı olan türden sorular, backoffice'te "en çok sorulan" listesi
   anlamlı görünsün. Soru makinenin ailesinden: rotovatörün kılavuzuna
   "düğüm atıcı" sorulmuyor. Cevapsız kalanlar bilgi tabanının eksik
   listesi; demoda da birkaç tane olsun ki o rapor boş çıkmasın.
   ========================================================================== */
export const DESTEK_SORULARI = {
  genel: ['Kaç beygir traktör gerekir?', 'Sezon sonunda makineyi nasıl saklamalıyım?'],
  balya: [
    'Düğüm atıcı ne sıklıkla yağlanmalı?',
    'Kuyruk mili devri kaç olmalı?',
    'Balya boyu nasıl ayarlanır?',
    'İp makaraya nasıl takılır?',
    'Pikap yüksekliği nasıl ayarlanır?',
    'Emniyet cıvatası neden kopar?',
  ],
  rulo: ['Ağ kaç tur sarılmalı?', 'Balya çapı nasıl ayarlanır?'],
  yem: ['Tartı nasıl sıfırlanır?', 'Karıştırma süresi ne kadar olmalı?'],
  silaj: ['Hidrolik bağlantısı nasıl yapılır?'],
  cayir: ['Çalışma yüksekliği nasıl ayarlanır?', 'Kuyruk mili devri kaç olmalı?'],
  toprak: ['Çalışma derinliği nasıl ayarlanır?'],
}

export const DESTEK_CEVAPSIZ = {
  balya: ['Nem ölçer hata veriyor', 'Otomatik yağlama çalışmıyor'],
  yem: ['Tartı sistemi yanlış tartıyor', 'PLC ekranı açılmıyor'],
  genel: ['Garanti süresi nasıl uzatılır?'],
}

/** Makinenin ailesine uyan destek sorusu; `cevapsiz` ise kılavuzda cevabı olmayan. */
export function destekSorusu(productId, cevapsiz) {
  const aile = makineAilesi(productId)
  return cevapsiz
    ? sec(DESTEK_CEVAPSIZ[aile] || DESTEK_CEVAPSIZ.genel)
    : sec([...DESTEK_SORULARI.genel, ...(DESTEK_SORULARI[aile] || [])])
}
