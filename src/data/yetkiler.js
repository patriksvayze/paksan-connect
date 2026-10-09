/* ==========================================================================
   Roller ve yetkiler

   NEDEN AYRI DOSYA

   Roller önceden `backoffice/veri.js` içinde iki sabitti: beş satırlık bir
   dizi ve yanında elle yazılmış bir yetki tablosu. Yeni bir ekip kurmak
   ya da bir rolün yetkisini kısıtlamak kod değişikliği, derleme ve yeni
   sürüm demekti.

   Artık roller backoffice'ten düzenleniyor (bkz. ekranlar/Roller.jsx) ve
   servis listesiyle aynı yolu kullanıyor: koddaki liste varsayılan,
   backoffice yazdıysa o geçerli (bkz. lib/icerikDeposu.js).

   YETKİ ROL BAZLI

   Kişiye özel istisna yok. Personel bir role atanıyor, yetkisi rolünden
   geliyor. Aynı roldeki iki kişinin yetkileri farklı olamıyor — olabilseydi
   "Bu kişi neden göremiyor?" sorusunun cevabı iki yere bakmayı
   gerektirirdi.

   KATALOG NEDEN VAR

   Yetkiler yalnızca dizelerdi ('talepler', 'servisDuzenle'). Ekranın onay
   kutusu çizebilmesi için her yetkinin okunabilir bir adı ve bir öbeği
   olmalı. Katalog aynı zamanda tek doğruluk kaynağı: admin rolünün
   yetkisi buradan üretiliyor, yeni yetki eklendiğinde admin onu
   kendiliğinden alıyor.
   ========================================================================== */

export const YETKI_KATALOG = [
  {
    grup: 'Talepler',
    izinler: [
      { id: 'talepler', ad: 'Talepleri görür' },
      /* Kapanmış talebi geri açmak bugün `rol !== 'admin'` diye
         kontrol ediliyordu; kimlik yerine yetkiye bağlandı.
         Gönderilmiş servis siparişinin iptali de bu izne bağlı (24 Eylül
         2026): iptal servisin bakiyesine para geri yazıyor, kapanmış işi
         geri çevirmekle aynı yetkiyi istiyor. Ad bu gücü söylemiyordu;
         Roller ekranında admin, yedek parça personeline iade yetkisi
         vermek için hangi kutuyu işaretleyeceğini bilemiyordu (25 Eylül
         2026, kullanıcı sınaması O8). Kimlik aynı kaldı, yalnız ad
         değişti: depodaki roller olduğu gibi çalışıyor. */
      { id: 'talepGeriAc', ad: 'Kapanmış talebi yeniden açar, gönderilmiş servis siparişini iptal eder' },
      /* TALEPTE YAPILAN İŞLER AYRI YETKİ (8 Ekim 2026, kullanıcının
         isteği: "Talepler ekranında nelerin düzenlenebileceği hakkında
         bir yetki sınırlaması getirelim. Yönetim rolünün Talepler
         ekranında düzenleme yapmasını istemiyorum mesela. Ama sonraki
         roller için de daha detaylı sınırlamalar çekebilmek için
         detaylandırabiliriz"). Önce `talepler` izni hem listeyi açıyor
         hem talepteki BÜTÜN işlemlere izin veriyordu: talebi gören,
         durumunu değiştirip iptal edebiliyor, hak edişi onaylayabiliyordu.
         Artık `talepler` yalnız görmek; her iş kendi izninde. Hangi
         düğmenin hangi izne bağlı olduğu tek yerde: veri.js →
         TALEP_EYLEMLERI. Depodaki eski roller bir kez taşındı
         (veri.js → rolIzinleriniTasi, izinSurumu 4). */
      { id: 'talepDurum', ad: 'Talebin durumunu değiştirir, talebi kapatır ve gönderim gününü belirler' },
      { id: 'talepIptal', ad: 'Talebi iptal eder ve müşterinin iptal isteğini karara bağlar' },
      { id: 'talepNot', ad: 'Talebe not yazar ve notu müşteriye ve servise gönderir' },
      { id: 'talepTeklif', ad: 'Fiyat teklifi verir ve talebi bayiye iletir' },
      { id: 'hakedisOnay', ad: 'Servisin hak edişini onaylar, düzeltir veya reddeder' },
      { id: 'parcaGonderim', ad: 'Parça gönderimini ve kargo bilgisini girer, kalan parçaları gönderir veya iptal eder' },
      { id: 'odemeOnay', ad: 'Müşterinin ödemesini onaylar' },
    ],
  },
  {
    grup: 'Müşteriler',
    izinler: [
      { id: 'musteriler', ad: 'Müşterileri görür' },
      /* Kayıtlı Makineler ekranı 22 Eylül 2026'ya kadar `musteriler`
         yetkisine bağlıydı: satış personeline Müşteriler'i açmak
         makine defterini de açıyordu (kullanıcının isteği: satış
         müşterileri görsün, makineleri görmesin). Ayrılırken eski
         rollere kendiliğinden eklendi, kimsenin ekranı kaybolmadı
         (bkz. veri.js → rolIzinleriniTasi). */
      { id: 'makineler', ad: 'Kayıtlı makineleri görür' },
      /* Makineye servis atamak 25 Eylül 2026'ya kadar `servisDuzenle`
         iznine bağlıydı. O tek izin üç ayrı işi topluyordu: servis kaydı
         ve bölgesi, servis hesabı ve şifre yardımı, makineye servis ve
         bayi ataması. Hak edişi onaylayan servis birimi makinenin başka
         servise atandığını görüp düzeltemiyordu; atamayı açmak için ona
         servis hesaplarını ve şifreleri de açmak gerekiyordu (kullanıcı
         sınaması). Servis birimi "PAKSAN kime iş verdiğini bilmek
         zorunda" ilkesinin sahibi, atamayı o yapar; servis hesabı ise
         bir güvenlik işlemi, `servisDuzenle`de kaldı. Ayrılırken
         `servisDuzenle` taşıyan eski rollere kendiliğinden eklendi,
         kimse atama gücünü kaybetmedi (bkz. veri.js → rolIzinleriniTasi,
         izinSurumu 3). */
      { id: 'makineAtama', ad: 'Makineye servis atar ve satan bayiyi girer' },
      /* İkinci el devir (9 Ekim 2026, kullanıcının onayı): makineyi bir
         hesaptan alıp başkasının hesabına geçiriyor. Servis atamasından
         ayrı: yanlış devirde makine, servis talebi açma hakkıyla birlikte
         yabancının hesabına geçer. Numara değişikliği gibi varsayılan
         rollerde yalnız Admin'de (TUM_IZINLER); depodaki rollere
         taşınmıyor, admin Roller ekranından veriyor. */
      { id: 'makineDevir', ad: 'Makinenin sahibini değiştirir' },
      { id: 'musteriDuzenle', ad: 'Müşteri bilgisini düzeltir' },
      { id: 'numara', ad: 'Numara değişikliği talebini onaylar' },
      { id: 'kimlikNo', ad: 'Talepteki T.C. kimlik veya vergi numarasının tamamını görür' },
    ],
  },
  {
    grup: 'Servisler',
    izinler: [
      { id: 'servisler', ad: 'Servisleri ve bayileri görür' },
      /* Makineye servis ataması 25 Eylül 2026'da bu izinden ayrılıp
         `makineAtama` oldu (Müşteriler öbeğinde, gerekçesi orada). */
      { id: 'servisDuzenle', ad: 'Servis kaydını, sorumluluk bölgesini ve servis hesabını değiştirir' },
      /* Servisin eline geçen parayı değiştiriyor (23 Eylül 2026, kullanıcının
         isteği: "ilgili personel tarafından değiştirilebilsin"). Servis
         kaydını düzeltmekten ayrı: bölgeyi düzelten satış personeli
         ücreti değiştirememeli. */
      { id: 'servisUcreti', ad: 'Servislerin kilometre ve saat başına ücretlerini değiştirir' },
    ],
  },
  {
    grup: 'Yedek Parça Kataloğu',
    izinler: [
      { id: 'parcaKatalogu', ad: 'Yedek parça kataloğunu görür' },
      /* Düzeltme müşterinin ve servisin gördüğü parça adını değiştiriyor;
         görmekten ayrı bir yetki. */
      { id: 'parcaKatalogDuzenle', ad: 'Parça adını ve grubunu düzeltir, parçayı listeden kaldırır' },
      /* Servisin parça siparişinde ödediği tutarı değiştiriyor; parça adını
         düzeltmekten ayrı bir yetki (23 Eylül 2026). */
      { id: 'servisIskontosu', ad: 'Servislerin yedek parça iskontosunu değiştirir' },
    ],
  },
  {
    grup: 'Yönetim',
    izinler: [
      { id: 'raporlar', ad: 'Raporları görür' },
      /* Dashboard'daki şirket geneli sayılar bugün
         `rol === 'admin' || rol === 'yonetici'` ile açılıyordu. */
      { id: 'yonetimOzeti', ad: 'Dashboard’da şirket genelindeki sayıları görür' },
      { id: 'duyurular', ad: 'Duyuru ve uyarı yayımlar' },
      { id: 'geribildirim', ad: 'Geri bildirimleri görür' },
      { id: 'destek', ad: 'Destek kayıtlarını görür' },
      { id: 'kayit', ad: 'İşlem kaydını görür' },
    ],
  },
  {
    grup: 'Hesaplar',
    izinler: [
      { id: 'personel', ad: 'Personel listesini görür' },
      { id: 'personelDuzenle', ad: 'Personel hesabı açar, kapatır ve rolünü değiştirir' },
      { id: 'rolYonetimi', ad: 'Rolleri ve yetkilerini düzenler' },
    ],
  },
]

/* Talepte iş yapma izinleri (yukarıda, Talepler öbeği). Talebi gören
   varsayılan rollere ve taşınan eski rollere birlikte veriliyor: her rol
   zaten yalnız kendi türündeki talepleri görüyor, fiyat teklifi izni
   servis biriminde bir şey açmıyor. Yönetici bilerek dışarıda. */
export const TALEP_EYLEM_IZINLERI = [
  'talepDurum', 'talepIptal', 'talepNot', 'talepTeklif', 'hakedisOnay', 'parcaGonderim', 'odemeOnay',
]

/** Katalogdaki bütün izin kimlikleri — admin rolü bunu taşıyor. */
export const TUM_IZINLER = YETKI_KATALOG.flatMap((g) => g.izinler.map((y) => y.id))

const IZIN_ADI = Object.fromEntries(
  YETKI_KATALOG.flatMap((g) => g.izinler.map((y) => [y.id, y.ad])),
)

/** İznin okunur adı; tanınmayan izin kimliği olduğu gibi dönüyor. */
export function yetkiAdi(id) {
  return IZIN_ADI[id] || id
}

/* ==========================================================================
   Rolün gördüğü talep türü

   Bir rol ya bütün talep türlerini görüyor (`null`) ya da seçtiklerini
   (`talepTurleri`, 21 Eylül 2026'dan beri birden çok; önce tek türdü —
   okurken ikisini de veri.js → rolunTurleri çözüyor).
   Excel sütunları da buradan süzülüyor: sütun hangi türlerle anlamlıysa
   onu taşıyor, rol kimliğine bakılmıyor (bkz. Talepler.jsx).
   ========================================================================== */

export const TALEP_TURU_SECENEKLERI = [
  { id: null, ad: 'Hepsi' },
  { id: 'servis', ad: 'Servis' },
  { id: 'parca', ad: 'Yedek Parça' },
  { id: 'satinalma', ad: 'Fiyat Teklifi' },
]

/* ==========================================================================
   Varsayılan roller

   Backoffice'te rol listesine hiç dokunulmadıysa bunlar geçerli.
   Dokunulduğu anda listenin tamamı depoya yazılıyor ve burası yalnız
   ilk kurulumun kaynağı oluyor.

   ADMIN KİLİTLİ — `sistem: true` yalnızca onda.

   Sebebi kurtarma yolunun olmaması: yetkisini kaldıran admin ekranı bir
   daha açamaz, şifre sıfırlama da personel ekranından geçtiği için geri
   dönüşü yoktur. Admin sistemin çıpası; adı bile değişmiyor.

   Öteki dördü sıradan kayıt: adları, açıklamaları, yetkileri ve
   gördükleri talep türleri değiştirilebiliyor; kendileri de
   silinebiliyor.
   ========================================================================== */

export const VARSAYILAN_ROLLER = [
  {
    id: 'admin',
    ad: 'Admin',
    aciklama: 'Her şeyi görür ve yapar; rolleri ve personel hesaplarını yönetir.',
    talepTurleri: null,
    izinler: TUM_IZINLER,
    sistem: true,
  },
  {
    id: 'yonetici',
    ad: 'Yönetici',
    aciklama: 'Tüm talepleri, raporları ve personel listesini görür ancak taleplerde ve personel listesinde değişiklik yapamaz.',
    talepTurleri: null,
    /* TALEPTE İŞLEM İZNİ YOK (8 Ekim 2026, kullanıcının kararı: "Yönetim
       rolünün Talepler ekranında düzenleme yapmasını istemiyorum"):
       talepleri görüyor, durum, not, iptal, hak ediş düğmeleri ona
       çıkmıyor. */
    izinler: [
      'talepler', 'musteriler', 'makineler', 'makineAtama', 'servisler', 'servisDuzenle', 'personel',
      'geribildirim', 'raporlar', 'yonetimOzeti', 'kayit', 'duyurular', 'destek',
      'servisUcreti', 'servisIskontosu',
    ],
  },
  {
    id: 'servis',
    ad: 'Servis',
    aciklama: 'Yalnız servis taleplerini görür; makinelere servis atar.',
    talepTurleri: ['servis'],
    /* Makineye servis atar (25 Eylül 2026): talepleri ve hak edişi bu
       birim yürütüyor, atama dışı işi gören de o. Servis hesaplarını
       düzenlemez: `servisDuzenle` bilerek yok. */
    izinler: ['talepler', ...TALEP_EYLEM_IZINLERI, 'musteriler', 'makineler', 'makineAtama', 'servisler'],
  },
  {
    id: 'parca',
    ad: 'Yedek Parça',
    aciklama: 'Yalnız yedek parça taleplerini görür.',
    talepTurleri: ['parca'],
    izinler: ['talepler', ...TALEP_EYLEM_IZINLERI, 'musteriler', 'makineler', 'servisler'],
  },
  {
    id: 'satis',
    ad: 'Satış',
    aciklama: 'Yalnız fiyat teklifi taleplerini görür; servis bölgelerini düzenleyebilir.',
    talepTurleri: ['satinalma'],
    /* Satış personeli servisin sorumluluk bölgesini değiştirebiliyor:
       servis ağını tanıyan, hangi servisin nereye baktığını bilen o.
       `makineAtama` 25 Eylül 2026'da `servisDuzenle`den ayrılırken
       satışta kaldı: dün makineye servis ve bayi atayabiliyordu, yetki
       kaybetmesin. */
    izinler: ['talepler', ...TALEP_EYLEM_IZINLERI, 'musteriler', 'makineler', 'makineAtama', 'servisler', 'servisDuzenle'],
  },
]

/* Rolü silinmiş ya da tanınmayan bir kimlikle gelen kişi için.

   Önceki hâlinde `rolBilgi()`, tanımadığı bir kimlik için listenin
   ÜÇÜNCÜ satırını (Servis) döndürüyordu. Bu zaten yanlıştı — servis
   panelinin yazdığı 'servis' rolü işlem kaydında "Servis" olarak
   görünüyordu — ama roller silinebilir olunca tehlikeye dönüşüyor:
   rolü silinen kişi Servis yetkisiyle çalışmaya başlar.

   Yedek artık YETKİSİZ. Böyle bir kişi hiçbir ekranı açamıyor; oturumu
   da zaten kapatılıyor (bkz. veri.js → oturumGetir). */
export const YETKISIZ_ROL = {
  id: '',
  ad: 'Tanımsız Rol',
  aciklama: 'Bu rol silinmiş. Yöneticinize başvurun.',
  talepTurleri: null,
  izinler: [],
}

/** "Sevkiyat Ekibi" → "sevkiyat-ekibi" */
export function rolKimligi(ad) {
  return String(ad || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('-')
}
