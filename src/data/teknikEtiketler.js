/* ==========================================================================
   Kılavuz künye tablosu — etiket ve değer sözlüğü

   SORUN NEYDİ:

   Makinelerin kullanım kılavuzlarındaki künye tabloları ÇİFT DİLLİ
   basılmış: aynı satırda önce Türkçesi, sonra İngilizcesi yazıyor
   ("Ağırlık / Weight"). Kılavuzlar taranırken bu iki sütun tek bir
   metin olarak okunmuş ve veri setine öyle girmiş:

       "Ağırlık Weight"          → ekranda böyle görünüyordu
       "* Güç Power"
       "Kuyruk Mili Hızı PTO Speed"
       "Silindirik sabit odalı Cylindrical Fixed chamber"

   179 künye satırının 92'si bu durumdaydı. Türkçe kullanan çiftçi
   satırın yarısını anlamıyordu; İngilizce kullanan da öyle.

   ÇÖZÜM:

   Aşağıdaki tablo her metnin Türkçe ve İngilizce karşılığını AYRI
   AYRI tutuyor. Tahmin ya da otomatik bölme yok — kılavuzda geçen
   42 etiketin ve 13 metin değerinin tamamı elle eşlendi.

   Kılavuz veri paketi (mobile_support_package.json) ELLE
   DÜZENLENMİYOR, olduğu gibi kopyalanıyor. Düzeltme bu yüzden
   burada, uygulama tarafında duruyor. Veri paketi yenilendiğinde
   eşleşmeyen bir metin çıkarsa olduğu gibi gösteriliyor — uydurma
   karşılık üretilmiyor.

   Kaynakta ayrıca şu kalıntılar vardı, onlar da burada düzeltildi:
     "* Güç"              → baştaki dipnot yıldızı
     "Balya Sarma Üitesi" → yazım hatası (Ünitesi)
     "Boy Lenght"         → kaynakta İngilizcesi de yanlış yazılmış
     "30 to 140 cm"       → İngilizce bağlaç, sayı aralığına çevrildi
     "540–610 minmax rpm" → "minmax" kalıntısı
     "2210 Mm"            → birim büyük harfle yazılmış
   ========================================================================== */

/* Etiketler: kaynaktaki birleşik metin → { tr, en } */
export const KUNYE_ETIKET = {
  '* Güç Power': { tr: 'Güç', en: 'Power' },
  'Ağırlık Weight': { tr: 'Ağırlık', en: 'Weight' },
  'Balya Ağırlığı Bale Weight': { tr: 'Balya Ağırlığı', en: 'Bale Weight' },
  'Balya Ebatları Bale Dimension': { tr: 'Balya Ebatları', en: 'Bale Dimensions' },
  'Balya Odası Tipi Bale Chamber Type': { tr: 'Balya Odası Tipi', en: 'Bale Chamber Type' },
  'Balya Sarma Üitesi Bale Wrapping Unit': { tr: 'Balya Sarma Ünitesi', en: 'Bale Wrapping Unit' },
  'Bağlayıcı Knotters': { tr: 'Bağlayıcı', en: 'Knotters' },
  'Boy Lenght': { tr: 'Boy', en: 'Length' },
  'Boy Length': { tr: 'Boy', en: 'Length' },
  'Boy yol-iş Lenght': { tr: 'Boy (yol / iş)', en: 'Length (transport / working)' },
  'Diş Borusu Tine Bars': { tr: 'Diş Borusu', en: 'Tine Bars' },
  'Dişler Tines': { tr: 'Dişler', en: 'Tines' },
  'Elektrik sistemi Electrical system': { tr: 'Elektrik Sistemi', en: 'Electrical System' },
  'Genişlik Width': { tr: 'Genişlik', en: 'Width' },
  'Güç Aktarımı Power Transmission': { tr: 'Güç Aktarımı', en: 'Power Transmission' },
  'Haşbay Chopper': { tr: 'Haşbay', en: 'Chopper' },
  'Hız Speed': { tr: 'Hız', en: 'Speed' },
  'Kesit Section': { tr: 'Kesit', en: 'Section' },
  'Kurs Stroke': { tr: 'Kurs', en: 'Stroke' },
  'Kuyruk Mili Devri PTO Rotation Rate': { tr: 'Kuyruk Mili Devri', en: 'PTO Rotation Rate' },
  'Kuyruk Mili Hızı PTO Speed': { tr: 'Kuyruk Mili Hızı', en: 'PTO Speed' },
  'Lastik Ebatları Tyre Sizes': { tr: 'Lastik Ebatları', en: 'Tyre Sizes' },
  'Maksimum Tırmık Genişliği Maximum Pick-Up Width': {
    tr: 'Maksimum Tırmık Genişliği', en: 'Maximum Pick-Up Width',
  },
  'Minimum Traktör Gücü Minimum Tractor Requirements': {
    tr: 'Minimum Traktör Gücü', en: 'Minimum Tractor Power',
  },
  'Net Genişlik Net Width': { tr: 'Net Genişlik', en: 'Net Width' },
  'Rulo File Sayısı Number of Net Rolls': { tr: 'Rulo File Sayısı', en: 'Number of Net Rolls' },
  'Sağ Right': { tr: 'Sağ', en: 'Right' },
  'Sol Left': { tr: 'Sol', en: 'Left' },
  'Traktör Hızı Tractor Transport speed': { tr: 'Traktör Hızı', en: 'Tractor Transport Speed' },
  'Traktör Prizi Tractor plug': { tr: 'Traktör Prizi', en: 'Tractor Plug' },
  'Traktör hidrolik basınç gereksinim Required pressure in the tractror’s hydraulic system': {
    tr: 'Traktör Hidrolik Basınç Gereksinimi',
    en: 'Required Pressure in the Tractor’s Hydraulic System',
  },
  'Traktör hidrolik sistem Hydraulic system': {
    tr: 'Traktör Hidrolik Sistemi', en: 'Tractor Hydraulic System',
  },
  'Traktör-Makine Şaft Bağlantı Profili Splined Profile of The PTO Shaft': {
    tr: 'Şaft Bağlantı Profili', en: 'Splined Profile of the PTO Shaft',
  },
  'Tırmık Boru sayısı Tines Bars': { tr: 'Tırmık Boru Sayısı', en: 'Number of Tine Bars' },
  'Tırmık Parmak Sayısı Pick-Up Tines': { tr: 'Tırmık Parmak Sayısı', en: 'Pick-Up Tines' },
  'Tırmık Tekerleri Arası Maksimum Mesafe Max. Distance Between The Exterme Pick-Up Tyres': {
    tr: 'Tırmık Tekerleri Arası Maksimum Mesafe',
    en: 'Max. Distance Between the Outer Pick-Up Tyres',
  },
  'Tırmık lastik ebatları Dimensions of Pick-Up Wheel Tyres': {
    tr: 'Tırmık Lastik Ebatları', en: 'Pick-Up Wheel Tyre Dimensions',
  },
  'Uzunluk Length': { tr: 'Uzunluk', en: 'Length' },
  'Yükseklik Height': { tr: 'Yükseklik', en: 'Height' },
  'Çeki kancası gelen ağırlık': { tr: 'Çeki Kancasına Gelen Ağırlık', en: 'Drawbar Load' },
  'Şaft Boyu Min Max Shaft Size Min-max': { tr: 'Şaft Boyu (min–maks)', en: 'Shaft Length (min–max)' },
  'Şaft Tipi Shaft Type': { tr: 'Şaft Tipi', en: 'Shaft Type' },
}

/* Değerler: yalnız içinde metin geçenler. Sayı + birim olanlara
   dokunulmuyor, onlar iki dilde de aynı okunuyor. */
export const KUNYE_DEGER = {
  '2 Adet/ pcs': { tr: '2 adet', en: '2 pcs' },
  '2 Adet/pcs': { tr: '2 adet', en: '2 pcs' },
  '3 Adet/ pcs': { tr: '3 adet', en: '3 pcs' },
  '3 Adet/pcs': { tr: '3 adet', en: '3 pcs' },
  '4 Adet/pcs': { tr: '4 adet', en: '4 pcs' },
  '5 Adet/ pcs': { tr: '5 adet', en: '5 pcs' },
  '540–610 minmax rpm': { tr: '540–610 rpm', en: '540–610 rpm' },
  '540–610 min-max rpm': { tr: '540–610 rpm', en: '540–610 rpm' },
  '30 to 140 cm': { tr: '30–140 cm', en: '30–140 cm' },
  '2210 Mm': { tr: '2210 mm', en: '2210 mm' },
  /* Kaynakta birim iki kez yazılmış: "36 x 46 cm x cm" */
  '36 x 46 cm x cm': { tr: '36 x 46 cm', en: '36 x 46 cm' },
  '7’li römork fişi (aydınlatma)': {
    tr: '7’li römork fişi (aydınlatma)', en: '7-pin trailer plug (lighting)',
  },
  'Silindirik sabit odalı Cylindrical Fixed chamber': {
    tr: 'Silindirik, sabit odalı', en: 'Cylindrical, fixed chamber',
  },
  'Standart otomatik File Standard automatic net wrapping -': {
    tr: 'Standart otomatik file sarma', en: 'Standard automatic net wrapping',
  },
  'Teleskopik kardan şaft Telescopic cardan shaft': {
    tr: 'Teleskopik kardan şaft', en: 'Telescopic cardan shaft',
  },
  'Serbest dönüşlü, Aşırı yükte, Cıvata kesmeli, Geniş açılı Free rotation, overload, bolt shear, The Wide –angel shaft': {
    tr: 'Serbest dönüşlü, aşırı yükte cıvata kesmeli, geniş açılı',
    en: 'Free rotation, overload bolt shear, wide angle',
  },
  '2 ünite Tek etkili 1 ünite çift etkili 2 unidietiona manifod, 1 dual-directional manifod (for baler with blades optional equipment)': {
    tr: '2 ünite tek etkili, 1 ünite çift etkili (bıçaklı modelde)',
    en: '2 single-acting units, 1 double-acting unit (on bladed models)',
  },
}

/** Künye etiketini seçili dilde verir; eşleşme yoksa olduğu gibi. */
export function kunyeEtiket(ham, dil = 'tr') {
  const k = KUNYE_ETIKET[(ham || '').trim()]
  return k ? k[dil] || k.tr : ham
}

/* Adet bildiren değerler kaynakta "110 pcs" gibi yazılmış; sayı
   değiştiği için sözlüğe tek tek girmek yerine kalıpla çevriliyor.
   "2 Adet/ pcs" gibi karma yazımlar yukarıdaki sözlükte, onlar
   önce eşleşiyor. */
const ADET_KALIBI = /^(\d+)\s*pcs\.?$/i

/** Künye değerini seçili dilde verir; eşleşme yoksa olduğu gibi. */
export function kunyeDeger(ham, dil = 'tr') {
  const metin = (ham || '').trim()
  const k = KUNYE_DEGER[metin]
  if (k) return k[dil] || k.tr
  const adet = metin.match(ADET_KALIBI)
  if (adet) return dil === 'tr' ? `${adet[1]} adet` : `${adet[1]} pcs`
  return ham
}
