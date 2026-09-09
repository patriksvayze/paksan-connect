/* ==========================================================================
   BAYİLER — makineyi satan taraf

   ⚠⚠ BU LİSTE GERÇEK DEĞİL ⚠⚠

   Yirmi temsilî kayıt. Adlar, adresler ve telefonlar uydurmadır.
   YAYINA ÇIKMADAN ÖNCE PAKSAN'ın gerçek bayi listesi buraya
   yazılmalı.

   BAYİ NE YAPAR, NE YAPMAZ

   Bayi makineyi müşteriye satar. Kurulumu, bakımı ve tamiri yapmaz —
   onu servis yapar (bkz. servisler.js). Bayilerin çoğunun kendi
   servisi yok; anlaştıkları bağımsız servislere yönlendiriyorlar.

   BAYİNİN PANELİ YOK

   Bu kayıtta kullanıcı adı, şifre ya da panel alanı bulunmuyor ve
   bulunmayacak. Servis talebi, parça talebi ve stok bayinin işi değil;
   panel servise ait. Bayi sistemde yalnız bir KAYIT: makinenin
   nereden satıldığını ve müşteriye hangi servisin bakacağını bulmak
   için duruyor.

   NEDEN BÖLGE ALANI YOK

   Talep bayiye değil servise düşüyor; bölge eşleştirmesi servis
   kaydında (bkz. servisler.js → bolge). Bayinin sorumluluk bölgesi
   diye bir kavram yok, satış yaptığı yer var.

   ZİNCİR

     makine → (LOGO faturası) → bayi → bayinin servisi → müşteri

   LOGO açılana kadar bu zincirin ilk halkası boş; makinenin hangi
   bayiden çıktığı personel tarafından backoffice'ten giriliyor
   (bkz. backoffice/ekranlar/Makineler.jsx).

   KOORDİNAT YOK

   Kayıtta enlem/boylam tutulmuyor. Tek tüketicisi müşteri
   uygulamasındaki yön haritasıydı; harita kaldırıldı. Bayinin nerede
   olduğu il, ilçe ve adresle belli.
   ========================================================================== */

import { icerikListe } from '../../lib/icerikDeposu.js'

export const BAYILER = [
  {
    id: 'konya-merkez',
    no: 'BAY001',
    ad: 'PAKSAN Konya Ana Bayi',
    il: 'Konya',
    ilce: 'Selçuklu',
    adres: 'Ankara Yolu 12. km, Tarım Makineleri Sitesi',
    tel: '03323210001',
  },
  {
    id: 'aksaray',
    no: 'BAY002',
    ad: 'Ovataş Tarım Makineleri',
    il: 'Aksaray',
    ilce: 'Merkez',
    adres: 'Nevşehir Yolu 3. km No: 44',
    tel: '03822130044',
  },
  {
    id: 'ankara',
    no: 'BAY003',
    ad: 'Başkent Tarım Ekipmanları',
    il: 'Ankara',
    ilce: 'Polatlı',
    adres: 'İstasyon Mahallesi, Sanayi Caddesi No: 18',
    tel: '03126230018',
  },
  {
    id: 'eskisehir',
    no: 'BAY004',
    ad: 'Porsuk Tarım Makineleri',
    il: 'Eskişehir',
    ilce: 'Alpu',
    adres: 'Cumhuriyet Mahallesi, Ankara Caddesi No: 7',
    tel: '02226110007',
  },
  {
    id: 'balikesir',
    no: 'BAY005',
    ad: 'Marmara Ziraat Makineleri',
    il: 'Balıkesir',
    ilce: 'Bandırma',
    adres: 'Sanayi Sitesi 4. Blok No: 12',
    tel: '02667330012',
  },
  {
    id: 'bursa',
    no: 'BAY006',
    ad: 'Uludağ Tarım Teknolojileri',
    il: 'Bursa',
    ilce: 'Karacabey',
    adres: 'Bursa Caddesi No: 96',
    tel: '02245760096',
  },
  {
    id: 'izmir',
    no: 'BAY007',
    ad: 'Ege Balya Sistemleri',
    il: 'İzmir',
    ilce: 'Torbalı',
    adres: 'Ayrancılar Mahallesi, Sanayi Caddesi No: 23',
    tel: '02328560023',
  },
  {
    id: 'manisa',
    no: 'BAY008',
    ad: 'Gediz Tarım Makineleri',
    il: 'Manisa',
    ilce: 'Salihli',
    adres: 'Atatürk Mahallesi, İzmir Caddesi No: 61',
    tel: '02367120061',
  },
  {
    id: 'aydin',
    no: 'BAY009',
    ad: 'Menderes Ziraat',
    il: 'Aydın',
    ilce: 'Söke',
    adres: 'Yeni Sanayi Sitesi 2. Sokak No: 9',
    tel: '02565120009',
  },
  {
    id: 'antalya',
    no: 'BAY010',
    ad: 'Akdeniz Tarım Makineleri',
    il: 'Antalya',
    ilce: 'Korkuteli',
    adres: 'Antalya Caddesi No: 130',
    tel: '02426430130',
  },
  {
    id: 'adana',
    no: 'BAY011',
    ad: 'Çukurova Makine Ticaret',
    il: 'Adana',
    ilce: 'Ceyhan',
    adres: 'Kurtkulağı Yolu 2. km',
    tel: '03226130002',
  },
  {
    id: 'sanliurfa',
    no: 'BAY012',
    ad: 'Harran Tarım Ekipmanları',
    il: 'Şanlıurfa',
    ilce: 'Viranşehir',
    adres: 'Mardin Yolu 1. km No: 55',
    tel: '04145110055',
  },
  {
    id: 'diyarbakir',
    no: 'BAY013',
    ad: 'Dicle Tarım Makineleri',
    il: 'Diyarbakır',
    ilce: 'Bismil',
    adres: 'Diyarbakır Caddesi No: 74',
    tel: '04124130074',
  },
  {
    id: 'malatya',
    no: 'BAY014',
    ad: 'Fırat Ziraat Makineleri',
    il: 'Malatya',
    ilce: 'Battalgazi',
    adres: 'Sanayi Mahallesi, 12. Sokak No: 3',
    tel: '04223210003',
  },
  {
    id: 'kayseri',
    no: 'BAY015',
    ad: 'Erciyes Tarım Sistemleri',
    il: 'Kayseri',
    ilce: 'Develi',
    adres: 'Yeni Mahalle, Kayseri Caddesi No: 210',
    tel: '03526180210',
  },
  {
    id: 'sivas',
    no: 'BAY016',
    ad: 'Kızılırmak Tarım',
    il: 'Sivas',
    ilce: 'Şarkışla',
    adres: 'Kayseri Yolu 1. km',
    tel: '03464120001',
  },
  {
    id: 'samsun',
    no: 'BAY017',
    ad: 'Karadeniz Tarım Makineleri',
    il: 'Samsun',
    ilce: 'Bafra',
    adres: 'Sinop Caddesi No: 88',
    tel: '03625420088',
  },
  {
    id: 'corum',
    no: 'BAY018',
    ad: 'Hitit Tarım Ekipmanları',
    il: 'Çorum',
    ilce: 'Sungurlu',
    adres: 'Ankara Caddesi No: 145',
    tel: '03643110145',
  },
  {
    id: 'erzurum',
    no: 'BAY019',
    ad: 'Doğu Anadolu Tarım Makineleri',
    il: 'Erzurum',
    ilce: 'Pasinler',
    adres: 'Erzurum Caddesi No: 26',
    tel: '04426610026',
  },
  {
    id: 'tekirdag',
    no: 'BAY020',
    ad: 'Trakya Balya Makineleri',
    il: 'Tekirdağ',
    ilce: 'Malkara',
    adres: 'Keşan Yolu 3. km',
    tel: '02824270003',
  },
]

/* Backoffice listesi varsa o geçerli; yoksa buradaki temsilî liste. */
export function bayileriGetir() {
  return icerikListe('bayiler', BAYILER)
}

/** Bir bayiyi kimliğiyle bulur. */
export function bayiGetir(id) {
  if (!id) return null
  return bayileriGetir().find((b) => b.id === id) || null
}

/** Bayinin ekranda görünen adı; kayıt yoksa boş. */
export function bayiAdi(id) {
  return bayiGetir(id)?.ad || ''
}

/** Kullanıcının kayıtlı ilindeki bayiler önce gelsin. */
export function bayiIleGore(il) {
  const liste = bayileriGetir()
  if (!il) return liste
  return [...liste].sort((a, b) => (b.il === il) - (a.il === il))
}
