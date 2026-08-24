/* ==========================================================================
   Teknik özelliklerin İngilizcesi

   NEDEN AYRI DOSYA

   Teknik veri paksanmakina.com.tr'den olduğu gibi alınıyor
   (src/data/teknikOzellikler.js) ve orası elle düzenlenmiyor — site
   güncellenince betik yeniden çalıştırılıp dosya baştan üretiliyor.
   Çeviri o dosyanın içine yazılsaydı her üretimde kaybolurdu. Burası
   elle yazılan taraf; ikisi ürün kimliğiyle değil, metnin kendisiyle
   eşleşiyor.

   KARŞILIĞI OLMAYAN METİN OLDUĞU GİBİ KALIYOR

   Sayılar ve ölçüler (120 X 70, 2.200 mm, 50 - 260) zaten dilden
   bağımsız; sözlükte aranmıyor bile. Sözlükte bulunmayan bir Türkçe
   metin de çevrilmeden gösteriliyor — eksik çeviri yüzünden satırın
   boş kalması, İngilizce yerine Türkçe görmekten çok daha kötü.

   TERİMLER TARIM MAKİNESİ TERİMLERİ

   "Haşpay" pick-up'ın önündeki kesici düzenek (chopper/cutter unit),
   "yaba" besleme çatalı (feeder fork), "mekik" düğüm atıcının mekiği
   (knotter shuttle), "valon" volan (flywheel). Sözlükte bunların
   sektörde kullanılan İngilizce karşılıkları var, birebir çevirileri
   değil.
   ========================================================================== */

/** Bölüm başlıkları */
export const TEKNIK_BASLIK_EN = {
  'BALYA ÖLÇÜLERİ': 'BALE DIMENSIONS',
  'BALYA EBATLARI': 'BALE DIMENSIONS',
  'BALYA AĞIRLIĞI': 'BALE WEIGHT',
  'TOPLAYICI DÜZENEĞİ': 'PICK-UP UNIT',
  'TIRMIK ÖLÇÜLERİ': 'PICK-UP DIMENSIONS',
  'BESLEME ODASI': 'FEEDING CHAMBER',
  'PİSTON': 'PLUNGER',
  'BAĞLAMA SİSTEMİ': 'KNOTTING SYSTEM',
  'BAĞLAMA GRUBU': 'KNOTTER ASSEMBLY',
  'ANA TAHRİK': 'MAIN DRIVE',
  'GÜÇ AKTARIMI': 'POWER TRANSMISSION',
  'MAKİNA ÖZELLİKLERİ': 'MACHINE FEATURES',
  'MAKİNA ÖLÇÜLERİ': 'MACHINE DIMENSIONS',
  'MAKİNA ÖLÇÜLERİ İŞ KONUMU': 'MACHINE DIMENSIONS — WORKING POSITION',
  'LASTİK ÖLÇÜLERİ': 'TYRE SIZES',
  'HAŞPAY DÜZENEĞİ': 'CHOPPER UNIT',
  'HELEZON SİSTEMİ': 'AUGER SYSTEM',
  'BIÇAK SİSTEMİ': 'BLADE SYSTEM',
  'GÜVENLİK SİSTEMİ': 'SAFETY SYSTEM',
  'KONTROL SİSTEMİ': 'CONTROL SYSTEM',
  'SAC KALINLIKLARI': 'PLATE THICKNESSES',
  'STREÇ VE FİLE EBATLARI': 'FILM AND NET DIMENSIONS',
  'KAPASİTE': 'CAPACITY',
  'TOPLAMA': 'PICK-UP',
  'TRAKTÖR': 'TRACTOR',
  '2. Boşaltma Bandı': '2nd Discharge Belt',
}

/** Satır etiketleri */
export const TEKNIK_ETIKET_EN = {
  /* Balya */
  'Balya Kesitleri': 'Bale cross-section',
  'Balya Ölçüsü': 'Bale size',
  'Balya Ebatları': 'Bale dimensions',
  'Balya Uzunluğu': 'Bale length',
  'Balya Boyu': 'Bale length',
  'Balya Ağırlığı': 'Bale weight',
  'Balya Ağırlığı - Ot': 'Bale weight — hay',
  'Balya Ağırlığı - Saman': 'Bale weight — straw',
  'Balya Ağırlığı-Saman': 'Bale weight — straw',
  'Balya / Saat': 'Bales per hour',
  'Balya Adedi': 'Number of bales',
  'Günlük Balya Adedi': 'Bales per day',
  'Balya Odası Tipi': 'Bale chamber type',
  'Balya Odası Motor İhtiyacı': 'Bale chamber motor requirement',
  'Balya Sarma Ünitesi': 'Bale wrapping unit',
  'Son Balya Çıkartma': 'Last bale ejection',
  'Dijital Balya Sayıcı': 'Digital bale counter',
  'Mekanik Balya Sayıcı': 'Mechanical bale counter',

  /* Toplayıcı ve tırmık */
  'Tırmık Genişliği': 'Pick-up width',
  'Tırmık Genişliği - İçten İçe': 'Pick-up width — inside to inside',
  'Tırmık Genişliği - İçten içe': 'Pick-up width — inside to inside',
  'Tırmık Genişliği - Dıştan Dışa': 'Pick-up width — outside to outside',
  'Maksimun Tırmık Genişliği': 'Maximum pick-up width',
  'Tırmık Teli': 'Pick-up tines',
  'Tırmık Borusu': 'Pick-up tine bars',
  'Tırmık Boru Sayısı': 'Number of tine bars',
  'Tırmık Parmak Sayısı': 'Number of tines',
  'Tırmık Tekerleği': 'Pick-up gauge wheel',
  'Tırmık Yöntemi': 'Pick-up drive',
  'Tırmık Emniyet Sistemi': 'Pick-up safety device',
  'Hidrolik Tırmık': 'Hydraulic pick-up',
  'Mekanik Tırmık': 'Mechanical pick-up',
  'Toplayıcı Düzeneği Güç Aktarımı': 'Pick-up drive transmission',
  'Hidrolik Toplayıcı Pistonu': 'Hydraulic pick-up cylinder',

  /* Haşpay */
  'Haşpay Düzeneği': 'Chopper unit',
  'Haspay Düzeneği': 'Chopper unit',
  'Haşpay Bıçak Sayısı': 'Number of chopper blades',
  'Haşpay Ünütesi': 'Chopper unit',

  /* Besleme */
  'Besleme Sistemi': 'Feeding system',
  'Besleme Odası Açıklığı': 'Feeding chamber opening',
  'Besleme Rotoru': 'Feeding rotor',
  'Besleme Yaba Sistemi': 'Feeder fork system',
  'Besleme Yaba Sayısı': 'Number of feeder forks',
  'Besleme Yaba Çatal Sayısı': 'Number of feeder fork tines',
  'Besleme Yaba Çatal Sayısı On': 'Number of feeder fork tines — front',
  'Besleme Yaba Çatal Sayısı Arka': 'Number of feeder fork tines — rear',
  'Besleme Yaba Çatal Sayısı - Arka': 'Number of feeder fork tines — rear',
  'Sağ Yaba Güç Aktarımı': 'Right fork drive',
  'Sol Yaba Güç Aktarımı': 'Left fork drive',
  'Yaba Emniyet Sistemi': 'Feeder fork safety device',

  /* Piston */
  'Piston Kursu': 'Plunger stroke',
  'Piston Vuruşu': 'Plunger strokes',
  'Piston Rayı': 'Plunger rail',
  'Piston Rayi': 'Plunger rail',
  'Strok Hızı': 'Stroke rate',
  'Strok Boyu ve Hızı': 'Stroke length and rate',
  'Presleme Ünitesi': 'Baling unit',
  'Materyal': 'Material',
  'Malzeme Tipi': 'Material type',

  /* Bağlama */
  'Bağlama Sistemi': 'Knotting system',
  'Bağlama Sistemi Güç Aktarımı': 'Knotter drive',
  'Bağlama Grubu': 'Knotter assembly',
  'Bağlama Gurubu': 'Knotter assembly',
  'Bağlama Grubu Emniyet Sistemi': 'Knotter safety device',
  'Bağlama Grubu Fanı': 'Knotter fan',
  'Bağlama Grubu Aydınlatması': 'Knotter lighting',
  'Mekik': 'Knotter shuttle',
  'İp Kapasitesi': 'Twine capacity',
  'İp Dolabı Kapasitesi': 'Twine box capacity',
  'İp Kopma Sensörü Standart': 'Twine break sensor',
  'İpli Bağlama': 'Twine tying',
  'Telli Bağlama': 'Wire tying',
  'Telli Bağlama Grubu': 'Wire tying assembly',
  'Tel Kapasitesi': 'Wire capacity',

  /* Tahrik */
  'Şanzıman': 'Gearbox',
  'Şaft Tipi': 'PTO shaft type',
  'Şaft Boyu min max': 'PTO shaft length min–max',
  'PTO Devir': 'PTO speed',
  'P T O': 'PTO',
  'P.T.O (Kuyruk Mili) DEVRİ': 'PTO speed',
  'P.T.O TORK SINIRLAYICI': 'PTO torque limiter',
  'Kuyruk Mili Devri': 'PTO speed',
  'Kuyruk Tipi': 'PTO type',
  'Güç Aktarımı': 'Power transmission',
  'TAHRİK SİSTEMİ': 'DRIVE SYSTEM',
  'Valon Emniyet Sistemi': 'Flywheel safety device',
  'Volan Emniyet Sistemi': 'Flywheel safety device',
  'Rotor Emniyet Sistemi': 'Rotor safety device',
  'Kontra Hareketi': 'Counter-rotation',
  'Hareket Yöntemi': 'Drive method',
  'Rotor Tahrik Yöntemi': 'Rotor drive',

  /* Traktör ve güç */
  'Traktör Gücü': 'Tractor power',
  'Traktor Gücü': 'Tractor power',
  'TRAKTÖR GÜCÜ': 'TRACTOR POWER',
  'Traktör Güç İhtiyacı': 'Required tractor power',
  'Traktör Devri': 'Tractor speed',
  'Güç İhtiyacı': 'Power requirement',
  'Gerekli Güç İhtiyacı': 'Required power',
  'Gerekli Enerji İhtiyacı': 'Required energy',
  'Enerji Kaynağı': 'Power source',
  'Jeneratör': 'Generator',
  'Araç Bağlama': 'Machine hitch',
  'BAĞLANTI SİSTEMİ': 'HITCH SYSTEM',
  'GÜÇ': 'POWER',

  /* Ölçüler */
  'Genişlik': 'Width',
  'GENİŞLİK': 'WIDTH',
  'TOPLAM GENİŞLİK': 'TOTAL WIDTH',
  'Genişlik - İş Konumu': 'Width — working position',
  'Genişlik - Yol Konumu': 'Width — transport position',
  'Uzunluk': 'Length',
  'Uzunluk - İş Konumu': 'Length — working position',
  'Uzunluk - Yol Konumu': 'Length — transport position',
  'Yükseklik': 'Height',
  'Yükseklik - Ot': 'Height — hay',
  'Yükseklik - Saman': 'Height — straw',
  'Yükseklik - İş Konumu': 'Height — working position',
  'Yükseklik - Yol Konumu': 'Height — transport position',
  'Yol Genişliği': 'Transport width',
  'İş Genişliği': 'Working width',
  'İŞ GENİŞLİĞİ': 'WORKING WIDTH',
  'İş-Yol Konumu': 'Working / transport position',
  'Çalışma Derinliği': 'Working depth',
  'Çalışma Hızı': 'Working speed',
  'HIZ': 'SPEED',
  'Ağırlık': 'Weight',
  'AĞIRLIK': 'WEIGHT',
  'Kg': 'Weight (kg)',
  'Çap': 'Diameter',
  'KAPASİTE': 'CAPACITY',
  'Kapasite': 'Capacity',
  'Bunker Kapasitesi': 'Hopper capacity',

  /* Şasi ve lastik */
  'Dingil': 'Axle',
  'Çift Dingil': 'Tandem axle',
  'Dingil Sayısı': 'Number of axles',
  'Lastik Ebatları': 'Tyre size',
  'Sağ Lastik Ölçüleri': 'Right tyre size',
  'Sol Lastik Ölçüleri': 'Left tyre size',
  'TEKERLEK SAYISI': 'NUMBER OF WHEELS',
  '3. Destek Tekerİ': '3rd support wheel',
  'Fren Sistemi': 'Braking system',
  'Taban Sac Kalınlık': 'Floor plate thickness',
  'Yan Sac Kalınlık': 'Side plate thickness',
  'Rotor Sac Kalınlıkları': 'Rotor plate thickness',

  /* Bıçak ve rotor */
  'Bıçak Sayısı': 'Number of blades',
  'BIÇAK SAYISI': 'NUMBER OF BLADES',
  'Bıçak Tipi': 'Blade type',
  'Bıçak Kontrolü': 'Blade control',
  'BIÇAK ENİ': 'BLADE WIDTH',
  'BIÇAK UZUNLUK': 'BLADE LENGTH',
  'Biçme Bıçağı': 'Cutter blade',
  'Bileme Düzeneği': 'Sharpening device',
  'Rotor Sayısı': 'Number of rotors',
  'Rotor Çapı': 'Rotor diameter',
  'ROTOR ÇAPI': 'ROTOR DIAMETER',
  'Rotor Arası': 'Rotor spacing',
  'TAMBUR': 'DRUMS',
  'Besleme Tamburu Sayısı': 'Number of feeding drums',
  'Atıcı Kanat Sayısı': 'Number of throwing blades',
  'DEVİR': 'SPEED',
  'KOL SAYISI': 'NUMBER OF ARMS',
  'TOPLAM YAY SAYISI': 'TOTAL NUMBER OF TINES',
  'YAY KESİT': 'TINE CROSS-SECTION',
  'Tesfiye Barı': 'Levelling bar',
  'Taş Kiti': 'Stone kit',

  /* Yem karma */
  'Helezon Sayısı': 'Number of augers',
  'Helezon Tipi': 'Auger type',
  'Helezon Tipi Yatay': 'Auger type — horizontal',
  'Helezon Çapı': 'Auger diameter',
  'Elektrikli Yem Karma': 'Electric feed mixer',
  'Yükleme Kepçesi': 'Loading bucket',
  'Yan Boşaltma Bandı': 'Side discharge belt',
  '2. Boşaltma Bandı': '2nd discharge belt',
  'Kantar': 'Weighing scale',

  /* Silaj paketleme */
  'Streç Ebatları': 'Stretch film size',
  'File Ebatları': 'Net size',
  'Baca Sistemi': 'Chimney system',

  /* Diğer */
  'Traktöre Bağlantı': 'Tractor hitch',
  'Hidrolik Çeki Oku': 'Hydraulic drawbar',
  'Mekanik Çeki Oku': 'Mechanical drawbar',
  'Çekilir Tip': 'Trailed type',
  'Otomatik Yağlama': 'Automatic lubrication',
  'Kendinden Yağlama Sistemi': 'Self-lubricating system',
  'Tartı Sistemi': 'Weighing system',
  'Dijital Tartı Sistemi': 'Digital weighing system',
  'Nem Ölçer': 'Moisture meter',
  'Kontrol Ekranı': 'Control display',
  'PLC': 'PLC',
  'MODEL': 'MODEL',
}

/** Hücre değerleri. Sayı ve ölçü içerenler burada aranmıyor. */
export const TEKNIK_DEGER_EN = {
  Var: 'Yes',
  Yok: 'No',
  Standart: 'Standard',
  STANDART: 'STANDARD',
  Opsiyon: 'Optional',
  /* Sitede "Otpsiyon" diye yazılmış; yazım hatası. */
  Otpsiyon: 'Optional',
  'Standart Opsiyon': 'Standard / optional',
  Otomatik: 'Automatic',
  Mekanik: 'Mechanical',
  Hidrolik: 'Hydraulic',
  'Hidrolik ve Elektronik': 'Hydraulic and electronic',
  'Hidrolik Turbo Fan': 'Hydraulic turbo fan',
  Zincir: 'Chain',
  Şaft: 'Shaft',
  Kavrama: 'Clutch',
  Rulman: 'Bearing',
  Hardox: 'Hardox',
  'ST 37': 'ST 37',
  'ST 52': 'ST 52',
  'Kesme Civatası': 'Shear bolt',
  /* Sitede noktasız "i" ile yazılmış; aynı şey. */
  'Kesme Civatasi': 'Shear bolt',
  'Pim Kesmeli': 'Shear pin',
  'Tork Emniyet': 'Torque limiter',
  'Çelik Piston': 'Steel plunger',
  /* Sitede eksik yazılmış. */
  'Çelik Pisto': 'Steel plunger',
  'Özel Dizayn': 'Custom design',
  'Paksan Özel Dizayn': 'Paksan custom design',
  'Önden Besleme': 'Front feeding',
  'Yandan Besleme': 'Side feeding',
  'Çift Düğüm': 'Double knot',
  'Tek Düğüm': 'Single knot',
  '2 İpli': '2 twine',
  '3 İpli': '3 twine',
  '2/3 İpli': '2/3 twine',
  '2-3 İpli': '2–3 twine',
  '55 ve Yukarı': '55 and above',
  'Tek Aks': 'Single axle',
  'Çift Devirli Vitesli': 'Two-speed gearbox',
  'Yıldız - Balta': 'Star / hammer',
  'Üçgen Tipi Bıçak': 'Triangular blade',
  Testere: 'Saw',
  'Üç Nokta Askı': 'Three-point linkage',
  'ÜÇ NOKTA ASKI': 'THREE-POINT LINKAGE',
  Asılır: 'Mounted',
  'Tek Noktadan Traktör Çekişli': 'Single-point tractor hitch',
  /* Sitede son harfi eksik yazılmış. */
  'Tek Noktadan Traktör Çekişl': 'Single-point tractor hitch',
  'Teleskobik Kardan Şaf': 'Telescopic PTO shaft',
  'Tek Hafif Yapı': 'Single lightweight frame',
  'Serbest Döşlü, Aşırı Yükte Cıvata Kesmeli': 'Free floating, shear bolt on overload',
  'Helezon Sistemi': 'Auger system',
  'Dikey Helezon Sistemi': 'Vertical auger system',
  'Otomatik Haşpay': 'Automatic chopper',
  'Haşpay Sistemi': 'Chopper system',
  'Silindirik Sabit Odalı': 'Cylindrical fixed chamber',
  'Standart Otomatik File veya Tek İp ile Sarma': 'Standard automatic net or single twine wrapping',
  'Tam Otomatik Kontrol Sistemi': 'Fully automatic control system',
  'Kauçuk Band': 'Rubber belt',
  'Elektrikli Motorlu': 'Electric motor driven',
  'Elektrik (380 V)': 'Electric (380 V)',
  'KIRLANGIÇ 9 KOLLU OT TOPLAMA TIRMIĞI': 'KIRLANGIÇ 9-ARM HAY RAKE',
  'KIRLANGIÇ 11 KOLLU OT TOPLAMA TIRMIĞI': 'KIRLANGIÇ 11-ARM HAY RAKE',
  'C-L': 'C–L',
  /* Sitede sayı ile birlikte yazılmış değerler. Sayı değişmiyor,
     yanındaki kelime çevriliyor. */
  '11 ADET': '11 pcs',
  '39 Bıçak': '39 blades',
  '46 Bıçak': '46 blades',
  '73cm - 92 rpm': '73 cm – 92 rpm',
  /* "Çekilir Tip" hem satır etiketi hem hücre değeri olarak geçiyor;
     iki sözlükte de bulunması gerekiyor. */
  'Çekilir Tip': 'Trailed type',
  Sierra: 'Saw',
  Estándar: 'Standard',
}

/** Ölçü birimleri */
export const TEKNIK_BIRIM_EN = {
  Adet: 'pcs',
  Ad: 'pcs',
  'AD': 'pcs',
  Kg: 'kg',
  gün: 'day',
  saat: 'hour',
  ton: 'tonnes',
  'km/sa': 'km/h',
  'kwh / ton': 'kWh/tonne',
  'PTO devir': 'PTO speed',
  'Haşpay Sistemi': 'Chopper system',
  Rpm: 'rpm',
  v: 'V',
}

/** Model adlarındaki Türkçe kelimeler */
export const TEKNIK_VARYANT_EN = {
  'HAMMER/ÇEKİÇ': 'HAMMER',
  'ÜÇ SIRA': 'THREE-ROW',
  'SIRA BAĞIMSIZ': 'ROW-INDEPENDENT',
  '11 KOLLU': '11-ARM',
  '9 KOLLU': '9-ARM',
  '2 İPLİ': '2 TWINE',
  '3 İPLİ': '3 TWINE',
  '3 İPLİ H': '3 TWINE H',
  '3 YABALI': '3 FORK',
  'Dikey MODEL 250': 'Vertical MODEL 250',
  'Dikey MODEL 300': 'Vertical MODEL 300',
  'Yatay MODEL 210': 'Horizontal MODEL 210',
  'Yatay MODEL 230': 'Horizontal MODEL 230',
  'Yatay MODEL 280': 'Horizontal MODEL 280',
  'Yatay MODEL 300': 'Horizontal MODEL 300',
}

/* Bir metnin İngilizcesi; yoksa metnin kendisi. */
function cevir(sozluk, metin) {
  if (!metin) return metin
  return sozluk[metin] || metin
}

/**
 * Bir teknik özellik bölümünü seçilen dile çevirir.
 * @param {object} bolum  {baslik, satirlar}
 * @param {string} dil    'tr' | 'en'
 */
export function bolumDilde(bolum, dil) {
  if (dil !== 'en') return bolum
  return {
    baslik: cevir(TEKNIK_BASLIK_EN, bolum.baslik),
    satirlar: bolum.satirlar.map(([ad, birim, degerler]) => [
      cevir(TEKNIK_ETIKET_EN, ad),
      cevir(TEKNIK_BIRIM_EN, birim),
      degerler.map((d) => cevir(TEKNIK_DEGER_EN, d)),
    ]),
  }
}

/** Model adlarını seçilen dile çevirir. */
export function varyantlarDilde(varyantlar, dil) {
  if (dil !== 'en') return varyantlar
  return varyantlar.map((v) => cevir(TEKNIK_VARYANT_EN, v))
}
