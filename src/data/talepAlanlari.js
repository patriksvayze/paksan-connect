/* ==========================================================================
   Talep formlarında sorulan sorular

   Ad, telefon ve konum artık formda sorulmuyor — bunlar zaten hesapta
   kayıtlı, kullanıcıya iki kez yazdırmanın anlamı yok. Boşalan yere
   TALEBİ İŞE YARAR HÂLE GETİREN sorular kondu:

     · Servis  → makine ne durumda, belirti ne
     · Parça   → hangi parça, ne kadar acil
     · Teklif  → ne balyalayacak, kaç dönüm, traktörü kaç beygir

   Böylece Paksan tarafına gelen talep, telefon açmadan önce okunup
   anlaşılabiliyor: hangi ekip gidecek, yanına hangi parça alınacak,
   teklifi hangi modelden hazırlayacak.

   Seçenekler yazmak yerine DOKUNARAK işaretleniyor. Tarlada eldivenli
   parmakla yazı yazmak zor; seçenek varsa dokunmak yeter.

   ⚠ Buradaki belirti ve parça adları taslaktır. Servis ekibinin
     kullandığı gerçek adlarla değiştirilmeli (bkz. PRODA-CIKIS.md → B).
   ========================================================================== */

import {
  ULASIM_ZAMANI_EN, MAKINE_DURUMU_EN, PARCA_ACELE_EN, URUN_TIPI_EN,
  ARAZI_EN, TRAKTOR_EN, ORTAK_BELIRTI_EN, BELIRTILER_EN,
  ORTAK_PARCA_EN, PARCALAR_EN, DIGER_EN,
} from './talepAlanlari.en'

/* -------------------------------------------------- Her talepte sorulan */

/* Çiftçi gün boyu tarlada; telefonu duymadığı saat çok olur. Ne zaman
   aranmak istediğini söylerse boşa arama sayısı düşer.

   Saatler PAKSAN'ın çalışma saatlerine göre: 09.00 - 18.00. Bunun
   dışında bir saat sunmak, tutulamayacak bir söz vermek olurdu. */
export const ULASIM_ZAMANI = [
  'Farketmez',
  'Sabah (09.00 - 12.00)',
  'Öğleden sonra (12.00 - 15.00)',
  'Akşamüstü (15.00 - 18.00)',
]

/* ------------------------------------------------------------- Servis */

/* Aciliyeti müşteriye "acil mi" diye sormuyoruz — herkes acil der.
   Bunun yerine makinenin durumu soruluyor; sıralamayı Paksan yapar. */
export const MAKINE_DURUMU = [
  { id: 'durdu', ad: 'Makine hiç çalışmıyor', alt: 'İş tamamen durdu' },
  { id: 'sorunlu', ad: 'Çalışıyor ama sorun var', alt: 'İş aksıyor, verim düştü' },
  { id: 'kontrol', ad: 'Çalışıyor, kontrol edilsin', alt: 'Acelesi yok' },
]

const ORTAK_BELIRTI = [
  'Anormal ses geliyor',
  'Aşırı titriyor',
  'Yağ kaçağı var',
  'Şaft / mafsal sorunu',
  'Hidrolikte sorun',
  'Kayış veya zincir atıyor',
  'Isınma / yanık kokusu',
]

const BELIRTILER = {
  balya: [
    'Düğüm atmıyor',
    'İp kopuyor',
    'Balya gevşek çıkıyor',
    'Balya dağılıyor',
    'Pikap otu almıyor',
    'Piston / vurma sorunu',
    'Balya sayacı çalışmıyor',
  ],
  rulo: [
    'Balya sarılmıyor',
    'Ağ veya ip sarmıyor',
    'Kapak açılmıyor / kapanmıyor',
    'Balya gevşek çıkıyor',
    'Pikap otu almıyor',
  ],
  yem: [
    'Karıştırma yetersiz',
    'Bıçaklar kesmiyor',
    'Boşaltma yapmıyor',
    'Tartı çalışmıyor',
    'Helezon sıkışıyor',
  ],
  silaj: [
    'Kesme boyu tutmuyor',
    'Bıçaklar körelmiş',
    'Tıkanma oluyor',
    'Besleme düzgün değil',
  ],
  cayir: [
    'Biçme düzgün değil',
    'Bıçak veya parmak kırılıyor',
    'Tırmık otu toplamıyor',
  ],
  toprak: [
    'Derinlik tutmuyor',
    'Uç / ayak kırılıyor',
    'Toprağı düzgün işlemiyor',
  ],
  genel: [],
}

/* --------------------------------------------------------- Yedek parça */

export const PARCA_ACELE = [
  { id: 'hemen', ad: 'Makine durdu, hemen lazım', alt: 'İş bekliyor' },
  { id: 'hafta', ad: 'Bu hafta içinde lazım', alt: 'Sıkışık ama iş sürüyor' },
  { id: 'yedek', ad: 'Acelesi yok', alt: 'Yedekte dursun' },
]

const ORTAK_PARCA = [
  'Rulman',
  'Kayış',
  'Zincir',
  'Yağ keçesi',
  'Mafsal / şaft',
  'Emniyet cıvatası',
  'Hidrolik hortum',
]

const PARCALAR = {
  balya: [
    'Düğüm atıcı bıçağı',
    'İp kılavuzu',
    'İğne',
    'Pikap parmağı',
    'Piston segmanı',
    'Balya sayacı',
  ],
  rulo: ['Sarım bıçağı', 'Kauçuk bant', 'Pikap parmağı', 'Kapak silindiri'],
  yem: ['Karıştırıcı bıçağı', 'Helezon', 'Tartı sensörü', 'Boşaltma bandı'],
  silaj: ['Kesici bıçak', 'Karşı bıçak', 'Besleme silindiri'],
  cayir: ['Biçme bıçağı', 'Tırmık parmağı', 'Koruma sacı'],
  toprak: ['Uç demiri', 'Ayak / gövde', 'Disk', 'Merdane'],
  genel: [],
}

/* ------------------------------------------------------- Fiyat teklifi */

/* Satış ekibinin telefonda ilk sorduğu üç soru bunlar. Cevapları
   önden gelirse teklif ilk aramada verilebiliyor. */
export const URUN_TIPI = [
  'Yonca',
  'Saman / buğday',
  'Ot / çayır',
  'Mısır silajı',
  'Diğer',
]

export const ARAZI = [
  '50 dönümden az',
  '50 - 150 dönüm',
  '150 - 500 dönüm',
  '500 dönümden fazla',
  'Başkasının tarlasında da çalışıyorum',
]

export const TRAKTOR = [
  '50 beygirin altı',
  '50 - 80 beygir',
  '80 - 110 beygir',
  '110 - 150 beygir',
  '150 beygirin üstü',
  'Bilmiyorum',
]

/* --------------------------------------------------------- Yardımcılar */

/* Makine grubuna göre belirti listesi. Grup bilinmiyorsa (kullanıcı
   henüz makine kaydetmemişse) yalnızca ortak belirtiler gösteriliyor —
   yem karma makinesi olmayana "helezon sıkışıyor" sormanın anlamı yok. */
export function belirtileriGetir(grup) {
  return [...(BELIRTILER[grup] || []), ...ORTAK_BELIRTI, 'Diğer']
}

export function parcalariGetir(grup) {
  return [...(PARCALAR[grup] || []), ...ORTAK_PARCA, 'Diğer']
}


/* ==========================================================================
   Dil

   Seçenekler ekranda kullanıcının dilinde görünüyor ama TALEBE HER ZAMAN
   TÜRKÇESİ YAZILIYOR. Böylece Paksan'a gelen talep, hangi dilde
   doldurulmuş olursa olsun aynı okunuyor: servis ekibi "Not tying knots"
   değil "Düğüm atmıyor" görüyor.

   Ekranlar `secenekler(...)` ile listeyi alıyor; her öğe
   { deger, etiket } — `deger` kayda giden Türkçe metin, `etiket`
   ekranda görünen metin.
   ========================================================================== */

function eslestir(trListe, enListe, dil) {
  return trListe.map((x, i) => ({
    deger: x,
    etiket: dil === 'tr' ? x : enListe[i] || x,
  }))
}

export function ulasimSecenekleri(dil = 'tr') {
  return eslestir(ULASIM_ZAMANI, ULASIM_ZAMANI_EN, dil)
}

export function urunTipiSecenekleri(dil = 'tr') {
  return eslestir(URUN_TIPI, URUN_TIPI_EN, dil)
}

export function araziSecenekleri(dil = 'tr') {
  return eslestir(ARAZI, ARAZI_EN, dil)
}

export function traktorSecenekleri(dil = 'tr') {
  return eslestir(TRAKTOR, TRAKTOR_EN, dil)
}

/* Durum ve aciliyet zaten kimlikle (id) saklanıyor; yalnız görünen
   yazıları değişiyor. */
export function makineDurumu(dil = 'tr') {
  if (dil === 'tr') return MAKINE_DURUMU
  return MAKINE_DURUMU.map((d) => ({ ...d, ...(MAKINE_DURUMU_EN[d.id] || {}) }))
}

export function parcaAcele(dil = 'tr') {
  if (dil === 'tr') return PARCA_ACELE
  return PARCA_ACELE.map((a) => ({ ...a, ...(PARCA_ACELE_EN[a.id] || {}) }))
}

export function belirtiSecenekleri(grup, dil = 'tr') {
  const trListe = [...(BELIRTILER[grup] || []), ...ORTAK_BELIRTI, 'Diğer']
  const enListe = [...(BELIRTILER_EN[grup] || []), ...ORTAK_BELIRTI_EN, DIGER_EN]
  return eslestir(trListe, enListe, dil)
}

/* Listenin sonundaki "Diğer".

   Önceden burada "Bilmiyorum, siz bakın" vardı ve iki sorun
   çıkarıyordu. Birincisi mantık: yedek parça sipariş eden çiftçi ne
   istediğini bilir; bilmiyorsa açtığı şey parça talebi değil servis
   talebidir. İkincisi ekran: seçilince adet kutusuna da düşüyordu —
   "bilmiyorum"dan 3 adet istenemez.

   "Diğer" listede olmayan bir parçayı anlatmak için. Seçildiğinde
   adet sorulmuyor ve başka parça seçilemiyor (bkz. RequestForm →
   parcaCevir); ne istendiği açıklama kutusuna yazılıyor. */
export const PARCA_DIGER = 'Diğer'

export function parcaSecenekleri(grup, dil = 'tr') {
  const trListe = [...(PARCALAR[grup] || []), ...ORTAK_PARCA, PARCA_DIGER]
  const enListe = [...(PARCALAR_EN[grup] || []), ...ORTAK_PARCA_EN, DIGER_EN]
  return eslestir(trListe, enListe, dil)
}

/* ==========================================================================
   Kayıttaki Türkçe değerin ekranda görünen karşılığı

   Talepler her zaman Türkçe kaydediliyor (Paksan'a gelen kayıt tek dilde
   olsun diye). Ama kullanıcı kendi talebini kendi dilinde görmeli —
   İngilizce kullanan biri "Düğüm atmıyor" değil "Not tying knots"
   okumalı. Bu fonksiyon kaydı bozmadan yalnızca ekrandaki yazıyı
   çeviriyor. Karşılığı bulunamayan değer olduğu gibi gösteriliyor.
   ========================================================================== */

/* Tüm seçenek listeleri tek bir Türkçe → İngilizce sözlükte toplanıyor.
   İlk çağrıda kuruluyor, sonra hafızadan okunuyor. */
let _sozluk = null

function sozlukKur() {
  const s = {}
  const ekle = (tr, en) => {
    tr.forEach((x, i) => {
      if (en[i]) s[x] = en[i]
    })
  }
  ekle(ULASIM_ZAMANI, ULASIM_ZAMANI_EN)
  ekle(URUN_TIPI, URUN_TIPI_EN)
  ekle(ARAZI, ARAZI_EN)
  ekle(TRAKTOR, TRAKTOR_EN)
  ekle(ORTAK_BELIRTI, ORTAK_BELIRTI_EN)
  ekle(ORTAK_PARCA, ORTAK_PARCA_EN)
  s['Diğer'] = DIGER_EN
  /* Eski talepler bu seçenekle açılmış olabilir; kayıt bozulmasın
     diye karşılığı sözlükte duruyor. Yeni taleplerde çıkmıyor. */
  s['Bilmiyorum, siz bakın'] = 'I am not sure, please check'
  for (const grup of Object.keys(BELIRTILER)) {
    ekle(BELIRTILER[grup], BELIRTILER_EN[grup] || [])
  }
  for (const grup of Object.keys(PARCALAR)) {
    ekle(PARCALAR[grup], PARCALAR_EN[grup] || [])
  }
  return s
}

export function alanEtiketi(deger, dil = 'tr') {
  if (!deger || dil === 'tr') return deger
  if (!_sozluk) _sozluk = sozlukKur()
  return _sozluk[deger] || deger
}
