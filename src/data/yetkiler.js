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
         kontrol ediliyordu; kimlik yerine yetkiye bağlandı. */
      { id: 'talepGeriAc', ad: 'Kapanmış talebi yeniden açar' },
    ],
  },
  {
    grup: 'Müşteriler',
    izinler: [
      { id: 'musteriler', ad: 'Müşteri ve makine kayıtlarını görür' },
      { id: 'musteriDuzenle', ad: 'Müşteri bilgisini düzeltir' },
      { id: 'numara', ad: 'Numara değişikliği talebini onaylar' },
      { id: 'kimlikNo', ad: 'Talepteki T.C. kimlik veya vergi numarasının tamamını görür' },
    ],
  },
  {
    grup: 'Servisler',
    izinler: [
      { id: 'servisler', ad: 'Servisleri, siparişleri ve teklifleri görür' },
      { id: 'servisDuzenle', ad: 'Servis kaydını ve sorumluluk bölgesini değiştirir' },
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

   Bir rol ya bütün talep türlerini görüyor (`null`) ya da tekini.
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
    talepTuru: null,
    izinler: TUM_IZINLER,
    sistem: true,
  },
  {
    id: 'yonetici',
    ad: 'Yönetici',
    aciklama: 'Tüm talepleri ve raporları görür; personel listesini görür ancak değiştiremez.',
    talepTuru: null,
    izinler: [
      'talepler', 'musteriler', 'servisler', 'servisDuzenle', 'personel',
      'geribildirim', 'raporlar', 'yonetimOzeti', 'kayit', 'duyurular', 'destek',
    ],
  },
  {
    id: 'servis',
    ad: 'Servis',
    aciklama: 'Yalnız servis taleplerini görür.',
    talepTuru: 'servis',
    izinler: ['talepler', 'musteriler', 'servisler'],
  },
  {
    id: 'parca',
    ad: 'Yedek Parça',
    aciklama: 'Yalnız yedek parça taleplerini görür.',
    talepTuru: 'parca',
    izinler: ['talepler', 'musteriler', 'servisler'],
  },
  {
    id: 'satis',
    ad: 'Satış',
    aciklama: 'Yalnız fiyat teklifi taleplerini görür; servis bölgelerini düzenleyebilir.',
    talepTuru: 'satinalma',
    /* Satış personeli servisin sorumluluk bölgesini değiştirebiliyor:
       servis ağını tanıyan, hangi servisin nereye baktığını bilen o. */
    izinler: ['talepler', 'musteriler', 'servisler', 'servisDuzenle'],
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
  ad: 'Tanımsız rol',
  aciklama: 'Bu rol silinmiş. Yöneticinize başvurun.',
  talepTuru: null,
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
