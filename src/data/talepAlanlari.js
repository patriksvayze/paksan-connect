/* ==========================================================================
   Talep formlarında sorulan sorular

   Ad, telefon ve konum artık formda sorulmuyor — bunlar zaten hesapta
   kayıtlı, kullanıcıya iki kez yazdırmanın anlamı yok. Boşalan yere
   TALEBİ İŞE YARAR HÂLE GETİREN sorular kondu:

     · Servis  → makine ne durumda, belirti ne
     · Parça   → hangi parça gerekiyor
     · Teklif  → ne balyalayacak, kaç dönüm, traktörü kaç beygir

   Böylece Paksan tarafına gelen talep, telefon açmadan önce okunup
   anlaşılabiliyor: hangi ekip gidecek, yanına hangi parça alınacak,
   teklifi hangi modelden hazırlayacak.

   Seçenekler yazmak yerine DOKUNARAK işaretleniyor. Tarlada eldivenli
   parmakla yazı yazmak zor; seçenek varsa dokunmak yeter.

   ⚠ Buradaki belirti adları taslaktır. Servis ekibinin kullandığı
     gerçek adlarla değiştirilmeli (bkz. PRODA-CIKIS.md → B).

   PARÇA ADLARI BURADAN KALDIRILDI

   Bir dönem bu dosyada otuz parça adı duruyordu (`ORTAK_PARCA` ve
   makine grubuna göre `PARCALAR`). Hiçbiri PAKSAN'ın fiyat listesinden
   gelmiyordu; uydurulmuşlardı ve yanlarındaki fiyatlar da uydurmaydı.
   Çiftçi "Pikap parmağı" seçiyor, depoda o adla bir parça bulunmuyordu.

   Parça artık PAKSAN'ın kendi kataloğundan seçiliyor: 538 parça, 35 alt
   montaj, her birinin kodu, resmi ve fiyatı var
   (bkz. `src/lib/parcaKatalogu.js`). Anahtar PARÇA KODU — parça adı
   tekil değil, katalogda altı tekrar eden ad var.

   Listeye bağlı olmayan tek seçenek `PARCA_DIGER`: katalogda
   bulunmayan parçayı yazıyla anlatmanın yolu. Katalog inmese de talep
   o yoldan açılabiliyor, bu yüzden burada duruyor.
   ========================================================================== */

import {
  ULASIM_ZAMANI_EN, MAKINE_DURUMU_EN, URUN_TIPI_EN,
  ARAZI_EN, TRAKTOR_EN, ORTAK_BELIRTI_EN, BELIRTILER_EN, DIGER_EN,
} from './talepAlanlari.en'

/* -------------------------------------------------- Her talepte sorulan */

/* Çiftçi gün boyu tarlada; telefonu duymadığı saat çok olur. Ne zaman
   aranmak istediğini söylerse boşa arama sayısı düşer.

   Saatler PAKSAN'ın çalışma saatlerine göre: 09.00 - 18.00. Bunun
   dışında bir saat sunmak, tutulamayacak bir söz vermek olurdu. */
export const ULASIM_ZAMANI = [
  'Fark etmez',
  'Sabah (09.00 - 12.00)',
  'Öğleden sonra (12.00 - 15.00)',
  'Akşamüstü (15.00 - 18.00)',
]

/* ------------------------------------------------------------- Servis */

/* Aciliyeti müşteriye "acil mi" diye sormuyoruz — herkes acil der.
   Bunun yerine makinenin durumu soruluyor; sıralamayı Paksan yapar.

   ALT AÇIKLAMA YOK. Üç seçeneğin altında birer açıklama satırı vardı
   ("İş tamamen durdu", "Acelesi yok"). Başlıklar zaten açık; açıklama
   aynı şeyi ikinci kez söyleyip seçenekleri gereksiz yere büyütüyordu. */
/* DÖRDÜNCÜSÜ ARIZA DEĞİL, KURULUM.

   İlk üçü bir arızayı anlatıyor ve altlarında "sorun nedir" diye
   sorulmasının sebebi bu. Dördüncüsü bambaşka bir iş: makine yeni
   geldi, kurulup çalıştırılacak. Orada sorulacak bir sorun yok —
   seçildiğinde belirti ve açıklama bölümleri kapanıyor
   (bkz. screens/RequestForm.jsx). */
export const MAKINE_DURUMU = [
  { id: 'durdu', ad: 'Makine hiç çalışmıyor' },
  { id: 'sorunlu', ad: 'Çalışıyor ama sorun var' },
  { id: 'kontrol', ad: 'Çalışıyor, kontrol edilsin' },
  { id: 'kurulum', ad: 'İlk kurulum yapılacak' },
]

/* Arıza anlatan durumlar. Bu kümenin dışındaki seçim, formun
   arıza sorularını kapatıyor. */
export const ARIZA_DURUMLARI = ['durdu', 'sorunlu', 'kontrol']

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

/* KİMLİK DEĞİL, OKUNUR KARŞILIK.

   Makinenin durumu talebe KİMLİKLE yazılıyor ("sorunlu"); ekranda o
   kimliğin karşılığı görünmeli. Bu yardımcı önce yalnız backoffice'in
   içindeydi ve servis paneli aynı hatayı tekrarlıyordu: servis ekranında
   "sorunlu" yazıyordu. Excel çıktısına da ham kimlik aktarılıyordu.

   Kimlikler burada tanımlandığı için karşılıkları da burada duruyor;
   üç taraf da aynı yerden okuyor. */
export function makineDurumAdi(id) {
  if (!id) return ''
  return MAKINE_DURUMU.find((d) => d.id === id)?.ad || id
}

/* Makine grubuna göre belirti listesi. Grup bilinmiyorsa (kullanıcı
   henüz makine kaydetmemişse) yalnızca ortak belirtiler gösteriliyor —
   yem karma makinesi olmayana "helezon sıkışıyor" sormanın anlamı yok. */
export function belirtileriGetir(grup) {
  return [...(BELIRTILER[grup] || []), ...ORTAK_BELIRTI, 'Diğer']
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

/* Durum zaten kimlikle (id) saklanıyor; yalnız görünen metni
   değişiyor. */
export function makineDurumu(dil = 'tr') {
  if (dil === 'tr') return MAKINE_DURUMU
  return MAKINE_DURUMU.map((d) => ({ ...d, ...(MAKINE_DURUMU_EN[d.id] || {}) }))
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
   digerCevir); ne istendiği açıklama kutusuna yazılıyor.

   KATALOG İNMEZSE KALAN TEK YOL BU. Parça listesi PAKSAN'ın
   sunucusundan geliyor; tarlada şebeke yoksa inmiyor. O durumda ekran
   "talep açılamaz" demiyor, bu seçeneği açık bırakıyor: çiftçi istediği
   parçayı yazıyla anlatıyor, fiyatı PAKSAN'la konuşuluyor. */
export const PARCA_DIGER = 'Diğer'

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
  s['Diğer'] = DIGER_EN
  /* Eski talepler bu seçenekle açılmış olabilir; kayıt bozulmasın
     diye karşılığı sözlükte duruyor. Yeni taleplerde çıkmıyor. */
  s['Bilmiyorum, siz bakın'] = 'I am not sure, please check'
  /* Talebin kapanış sonuçları da kayda Türkçe yazılıyor (backoffice ve
     servis paneli tek dilli). Müşteri uygulaması iki dilli olduğu için
     karşılıkları burada duruyor; yoksa İngilizce ekranda "Satış oldu"
     görünüyordu. */
  s['Satış oldu'] = 'Sale completed'
  s['Müşteri vazgeçti'] = 'Customer declined'
  s['Rakibe gitti'] = 'Lost to a competitor'
  s['Ulaşılamadı'] = 'Could not be reached'
  for (const grup of Object.keys(BELIRTILER)) {
    ekle(BELIRTILER[grup], BELIRTILER_EN[grup] || [])
  }
  /* PARÇA ADLARININ İNGİLİZCESİ YOK. Parça adı artık PAKSAN'ın
     kataloğundan geliyor ve katalog tek dilli. Karşılığı bulunmayan
     değer olduğu gibi gösteriliyor; İngilizce ekranda parça Türkçe adı
     ve kodu ile görünüyor — kod iki dilde de aynı. */
  return s
}

export function alanEtiketi(deger, dil = 'tr') {
  if (!deger || dil === 'tr') return deger
  if (!_sozluk) _sozluk = sozlukKur()
  return _sozluk[deger] || deger
}
