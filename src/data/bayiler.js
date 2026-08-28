/* ==========================================================================
   PAKSAN bayi ağı

   ÖNEMLİ — BU LİSTE GERÇEK DEĞİL.
   Ekranın çalıştığını görebilmek için Türkiye geneline dağıtılmış 20
   temsili bayi yazıldı. İsimler, adresler ve telefonlar uydurmadır.
   Gerçek bayi listesi geldiğinde YALNIZCA bu dosya değiştirilir;
   ekranların hiçbirine dokunmaya gerek yoktur.

   Her kayıt:
     id      → benzersiz kısa ad
     ad      → bayi ticari adı
     il/ilce → adres
     tel     → tuşlanacak numara (boşluksuz)
     telYazi → ekranda görünecek hâli
     enlem/boylam → konuma göre sıralama için (il merkezi koordinatı)
     yetki   → bayinin verdiği hizmetler
   ========================================================================== */

import { icerikListe } from '../lib/icerikDeposu'
import { ilKoordinati } from './ilKoordinat'

export const YETKILER = {
  satis: 'Satış',
  servis: 'Yetkili servis',
  parca: 'Yedek parça',
}

const YETKILER_EN = {
  satis: 'Sales',
  servis: 'Authorised service',
  parca: 'Spare parts',
}

/** Bayinin verdiği hizmetin seçili dildeki adı. */
export function yetkiAdi(kod, dil = 'tr') {
  return (dil === 'tr' ? YETKILER : YETKILER_EN)[kod] || kod
}

export const BAYILER = [
  {
    id: 'konya-merkez',
    no: 'BAY001',
    ad: 'PAKSAN Konya Ana Bayi',
    il: 'Konya',
    ilce: 'Selçuklu',
    adres: 'Ankara Yolu 12. km, Tarım Makinaları Sitesi',
    tel: '03323210001',
    telYazi: '0332 321 00 01',
    enlem: 37.8746,
    boylam: 32.4932,
    yetki: ['satis', 'servis', 'parca'],
  },
  {
    id: 'aksaray',
    no: 'BAY002',
    ad: 'Ovataş Tarım Makinaları',
    il: 'Aksaray',
    ilce: 'Merkez',
    adres: 'Nevşehir Caddesi No: 148',
    tel: '03822150002',
    telYazi: '0382 215 00 02',
    enlem: 38.3687,
    boylam: 34.037,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'ankara',
    no: 'BAY003',
    ad: 'Başkent Tarım Ekipmanları',
    il: 'Ankara',
    ilce: 'Polatlı',
    adres: 'Sanayi Mahallesi, İstasyon Caddesi No: 61',
    tel: '03126230003',
    telYazi: '0312 623 00 03',
    enlem: 39.5842,
    boylam: 32.1471,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'eskisehir',
    no: 'BAY004',
    ad: 'Porsuk Tarım Makinaları',
    il: 'Eskişehir',
    ilce: 'Alpu',
    adres: 'Cumhuriyet Mahallesi, Ankara Caddesi No: 22',
    tel: '02226110004',
    telYazi: '0222 611 00 04',
    enlem: 39.7767,
    boylam: 30.5206,
    yetki: ['satis', 'servis', 'parca'],
  },
  {
    id: 'balikesir',
    no: 'BAY005',
    ad: 'Marmara Ziraat Makinaları',
    il: 'Balıkesir',
    ilce: 'Bandırma',
    adres: 'Yeni Sanayi Sitesi 4. Blok No: 9',
    tel: '02667140005',
    telYazi: '0266 714 00 05',
    enlem: 40.352,
    boylam: 27.9767,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'bursa',
    no: 'BAY006',
    ad: 'Uludağ Tarım Teknolojileri',
    il: 'Bursa',
    ilce: 'Karacabey',
    adres: 'Ovaesemen Mahallesi, İzmir Yolu No: 105',
    tel: '02246760006',
    telYazi: '0224 676 00 06',
    enlem: 40.2148,
    boylam: 28.36,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'izmir',
    no: 'BAY007',
    ad: 'Ege Balya Sistemleri',
    il: 'İzmir',
    ilce: 'Torbalı',
    adres: 'Ayrancılar Mahallesi, Sanayi Bulvarı No: 40',
    tel: '02328530007',
    telYazi: '0232 853 00 07',
    enlem: 38.1543,
    boylam: 27.3595,
    yetki: ['satis', 'servis', 'parca'],
  },
  {
    id: 'manisa',
    no: 'BAY008',
    ad: 'Gediz Tarım Makinaları',
    il: 'Manisa',
    ilce: 'Salihli',
    adres: 'Atatürk Mahallesi, İzmir Caddesi No: 214',
    tel: '02367150008',
    telYazi: '0236 715 00 08',
    enlem: 38.4818,
    boylam: 28.1394,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'aydin',
    no: 'BAY009',
    ad: 'Menderes Ziraat',
    il: 'Aydın',
    ilce: 'Söke',
    adres: 'Yenicami Mahallesi, Milas Yolu No: 76',
    tel: '02565120009',
    telYazi: '0256 512 00 09',
    enlem: 37.7508,
    boylam: 27.4098,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'antalya',
    no: 'BAY010',
    ad: 'Akdeniz Tarım Makinaları',
    il: 'Antalya',
    ilce: 'Korkuteli',
    adres: 'Yazır Mahallesi, Burdur Caddesi No: 33',
    tel: '02426430010',
    telYazi: '0242 643 00 10',
    enlem: 37.0665,
    boylam: 30.196,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'adana',
    no: 'BAY011',
    ad: 'Çukurova Makina Ticaret',
    il: 'Adana',
    ilce: 'Ceyhan',
    adres: 'Yeni Mahalle, Osmaniye Yolu No: 88',
    tel: '03226130011',
    telYazi: '0322 613 00 11',
    enlem: 37.0247,
    boylam: 35.8175,
    yetki: ['satis', 'servis', 'parca'],
  },
  {
    id: 'sanliurfa',
    no: 'BAY012',
    ad: 'Harran Tarım Ekipmanları',
    il: 'Şanlıurfa',
    ilce: 'Viranşehir',
    adres: 'Sanayi Mahallesi, Mardin Yolu 3. km',
    tel: '04145110012',
    telYazi: '0414 511 00 12',
    enlem: 37.2353,
    boylam: 39.7639,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'diyarbakir',
    no: 'BAY013',
    ad: 'Dicle Tarım Makinaları',
    il: 'Diyarbakır',
    ilce: 'Bismil',
    adres: 'Kurtuluş Mahallesi, Batman Caddesi No: 51',
    tel: '04124130013',
    telYazi: '0412 413 00 13',
    enlem: 37.8481,
    boylam: 40.6667,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'malatya',
    no: 'BAY014',
    ad: 'Fırat Ziraat Makinaları',
    il: 'Malatya',
    ilce: 'Battalgazi',
    adres: 'Hasırcılar Mahallesi, Sivas Caddesi No: 17',
    tel: '04223210014',
    telYazi: '0422 321 00 14',
    enlem: 38.3895,
    boylam: 38.3475,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'kayseri',
    no: 'BAY015',
    ad: 'Erciyes Tarım Sistemleri',
    il: 'Kayseri',
    ilce: 'Develi',
    adres: 'Aşağı Everek Mahallesi, Yeni Sanayi No: 6',
    tel: '03526180015',
    telYazi: '0352 618 00 15',
    enlem: 38.3906,
    boylam: 35.4931,
    yetki: ['satis', 'servis', 'parca'],
  },
  {
    id: 'sivas',
    no: 'BAY016',
    ad: 'Kızılırmak Tarım',
    il: 'Sivas',
    ilce: 'Şarkışla',
    adres: 'İstasyon Mahallesi, Kayseri Caddesi No: 29',
    tel: '03464120016',
    telYazi: '0346 412 00 16',
    enlem: 39.3529,
    boylam: 36.4083,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'samsun',
    no: 'BAY017',
    ad: 'Karadeniz Tarım Makinaları',
    il: 'Samsun',
    ilce: 'Bafra',
    adres: 'Alparslan Mahallesi, Sinop Caddesi No: 132',
    tel: '03625420017',
    telYazi: '0362 542 00 17',
    enlem: 41.5678,
    boylam: 35.9069,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'corum',
    no: 'BAY018',
    ad: 'Hitit Tarım Ekipmanları',
    il: 'Çorum',
    ilce: 'Sungurlu',
    adres: 'Sunguroğlu Mahallesi, Ankara Yolu No: 44',
    tel: '03648110018',
    telYazi: '0364 811 00 18',
    enlem: 40.1667,
    boylam: 34.3722,
    yetki: ['satis', 'parca'],
  },
  {
    id: 'erzurum',
    no: 'BAY019',
    ad: 'Doğu Anadolu Tarım Makinaları',
    il: 'Erzurum',
    ilce: 'Pasinler',
    adres: 'Hasankale Mahallesi, Kars Yolu No: 12',
    tel: '04426610019',
    telYazi: '0442 661 00 19',
    enlem: 39.9808,
    boylam: 41.6764,
    yetki: ['satis', 'servis'],
  },
  {
    id: 'tekirdag',
    no: 'BAY020',
    ad: 'Trakya Balya Makinaları',
    il: 'Tekirdağ',
    ilce: 'Malkara',
    adres: 'Camiatik Mahallesi, Keşan Yolu No: 25',
    tel: '02824270020',
    telYazi: '0282 427 00 20',
    enlem: 40.8894,
    boylam: 26.9,
    yetki: ['satis', 'servis', 'parca'],
  },
]

/* İki nokta arası kuş uçuşu kilometre (Haversine).
   Bayi sıralamasında "hangisi daha yakın" sorusuna yeter; yol mesafesi
   değildir, ekranda da "kuş uçuşu" diye yazılır. */
export function mesafeKm(enlem1, boylam1, enlem2, boylam2) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dEnlem = rad(enlem2 - enlem1)
  const dBoylam = rad(boylam2 - boylam1)
  const a =
    Math.sin(dEnlem / 2) ** 2 +
    Math.cos(rad(enlem1)) * Math.cos(rad(enlem2)) * Math.sin(dBoylam / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

/* Backoffice'ten gerçek bayi listesi girildiyse o geçerli; yoksa
   yukarıdaki temsilî liste. Ekranlar bu fonksiyonu çağırıyor, doğrudan
   BAYILER'i değil. */
export function bayileriGetir() {
  return icerikListe('bayiler', BAYILER)
}

/** Bayileri verilen konuma göre yakından uzağa sıralar. */
export function yakindanUzaga(enlem, boylam) {
  return bayileriGetir()
    .map((b) => ({ ...b, km: mesafeKm(enlem, boylam, b.enlem, b.boylam) }))
    .sort((a, b) => a.km - b.km)
}

/** Konum yoksa, kullanıcının kayıtlı ilindeki bayiler önce gelsin. */
export function ileGore(il) {
  const liste = bayileriGetir()
  if (!il) return liste
  return [...liste].sort((a, b) => (b.il === il) - (a.il === il))
}

/* ==========================================================================
   Talebe bakacak bayi

   Makineleri bayiye satıyoruz, son kullanıcıya bayi satıyor. Bu yüzden
   uygulamadan gelen fiyat teklifi talebi doğrudan cevaplanmıyor: doğru
   bayiye yönlendiriliyor. Satış personelinin talebi açtığında "bunu
   kime yollayacağım" sorusunun cevabı ekranda yazılı olmalı.

   ÜÇ KADEME, sırayla:

     1. Aynı ilçede satış yetkili bayi — en doğru adres.
     2. Aynı ilde satış yetkili bayi.
     3. İlinde bayi yoksa, il merkezine kuş uçuşu en yakın bayiler.

   Yalnız SATIŞ yetkisi olan bayiler döndürülüyor: yedek parça bayisine
   makine teklifi yollamanın anlamı yok.

   @param {string} il
   @param {string} ilce
   @param {number} adet en fazla kaç bayi
   @returns {{kademe: 'ilce'|'il'|'yakin', bayiler: Array}}
   ========================================================================== */
export function talebinBayileri(il, ilce, adet = 3) {
  const satisBayileri = bayileriGetir().filter((b) => (b.yetki || []).includes('satis'))

  if (il) {
    const ildekiler = satisBayileri.filter((b) => b.il === il)

    if (ildekiler.length) {
      const ilcedekiler = ilce ? ildekiler.filter((b) => b.ilce === ilce) : []
      if (ilcedekiler.length) {
        return { kademe: 'ilce', bayiler: ilcedekiler.slice(0, adet) }
      }
      return { kademe: 'il', bayiler: ildekiler.slice(0, adet) }
    }
  }

  /* İlinde satış bayisi yok — en yakınları göster. Koordinat
     bilinmiyorsa mesafe hesaplanamıyor; uydurmak yerine boş dönüyoruz
     ve ekran "bayi eşleştirilemedi" diyor. */
  const konum = ilKoordinati(il)
  if (!konum) return { kademe: 'yakin', bayiler: [] }

  return {
    kademe: 'yakin',
    bayiler: satisBayileri
      .map((b) => ({ ...b, km: mesafeKm(konum.enlem, konum.boylam, b.enlem, b.boylam) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, adet),
  }
}
