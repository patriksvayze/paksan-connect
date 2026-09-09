/* ==========================================================================
   SERVİSLER — işi yapan taraf

   ⚠⚠ BU LİSTE GERÇEK DEĞİL ⚠⚠

   On dört temsilî kayıt. Adlar, adresler ve telefonlar uydurmadır.
   YAYINA ÇIKMADAN ÖNCE PAKSAN'ın gerçek servis listesi buraya
   yazılmalı.

   SERVİS NE YAPAR

   Makinenin ilk kurulumunu ve çalıştırmasını, sonrasında bakımını ve
   tamirini yapar. Yaptığı işi bayiye değil doğrudan PAKSAN'a
   bildiriyor ve hak edişini PAKSAN'dan alıyor.

   Servis makine SATMAZ. Bu yüzden kayıtta satış diye bir hizmet yok;
   makineyi satan taraf bayi (bkz. bayiler.js).

   ÇALIŞTIĞI BAYİLER — ZİNCİRİN ORTA HALKASI

   Bayilerin çoğunun kendi servisi yok; anlaştıkları servise
   yönlendiriyorlar. `bayiler` alanı bu anlaşmayı tutuyor ve müşteriye
   hangi servisin bakacağı buradan çıkıyor:

     makine → (LOGO faturası) → bayi → bayinin servisi → müşteri

   Bir servis birden çok bayiyle çalışabiliyor; sahada olan da bu.
   Bağ servis kaydında duruyor, bayi kaydında değil: bayinin paneli
   yok, bu ilişkiyi PAKSAN personeli servis üzerinden yönetiyor.

   ŞAHIS MI, TÜZEL Mİ

   `tur` alanı hak edişin kime ödeneceğini söylüyor. Servislerin bir
   kısmı tek kişilik: usta kendi adına çalışıyor, faturayı şahıs
   olarak kesiyor.

   İKİ HİZMET VAR

     servis  kurulum, bakım, tamir
     parca   yedek parça bulundurup satabiliyor

   Her servis parça tutmuyor; talep yönlendirmesi buna bakıyor.

   SORUMLULUK BÖLGESİ NEDEN HÂLÂ DURUYOR

   Doğru yol makineden bayiye, bayiden servise gitmek. Ama LOGO
   açılana kadar makinenin hangi bayiden çıktığı bilinmiyor; o zamana
   kadar talep coğrafyaya göre eşleşiyor. `bolge` bunun için.
   ========================================================================== */

import { icerikListe } from '../../lib/icerikDeposu.js'
import { ilKoordinati } from '../../data/ilKoordinat.js'

/* Servisin verebileceği hizmetler. Talep türü bu tabloya bakarak
   eşleşiyor (bkz. src/context/AppState.jsx → TUR_YETKI). */
export const HIZMETLER = {
  servis: 'Servis ve bakım',
  parca: 'Yedek parça',
}

const HIZMETLER_EN = {
  servis: 'Service and maintenance',
  parca: 'Spare parts',
}

/** Hizmetin ekranda görünen adı. */
export function hizmetAdi(kod, dil = 'tr') {
  return (dil === 'tr' ? HIZMETLER : HIZMETLER_EN)[kod] || kod
}

/** Servis şahıs mı, tüzel kişi mi — hak ediş bu ayrıma göre ödeniyor. */
export const SERVIS_TURU = {
  sahis: 'Şahıs',
  tuzel: 'Tüzel kişi',
}

export const SERVISLER = [
  {
    id: 'konya-servis',
    no: 'SRV001',
    ad: 'Selçuk Tarım Servisi',
    tur: 'tuzel',
    il: 'Konya',
    ilce: 'Selçuklu',
    adres: 'Fevzi Çakmak Mahallesi, 10680. Sokak No: 14',
    tel: '03323450014',
    telYazi: '0332 345 00 14',
    enlem: 37.8901,
    boylam: 32.4711,
    bayiler: ['konya-merkez', 'aksaray'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'ankara-servis',
    no: 'SRV002',
    ad: 'Polatlı Tarım Servisi',
    tur: 'tuzel',
    il: 'Ankara',
    ilce: 'Polatlı',
    adres: 'Şentepe Mahallesi, Sanayi Sitesi 6. Blok',
    tel: '03126230211',
    telYazi: '0312 623 02 11',
    enlem: 39.5776,
    boylam: 32.1402,
    bayiler: ['ankara'],
    hizmet: ['servis'],
  },
  {
    id: 'eskisehir-servis',
    no: 'SRV003',
    ad: 'Porsuk Teknik Servis',
    tur: 'tuzel',
    il: 'Eskişehir',
    ilce: 'Alpu',
    adres: 'Yeni Mahalle, Sanayi Caddesi No: 22',
    tel: '02226110320',
    telYazi: '0222 611 03 20',
    enlem: 39.7801,
    boylam: 30.5148,
    bayiler: ['eskisehir'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'bandirma-servis',
    no: 'SRV004',
    ad: 'Kemal Aydın Tarım Servisi',
    tur: 'sahis',
    il: 'Balıkesir',
    ilce: 'Bandırma',
    adres: 'Yeni Sanayi Sitesi 9. Blok No: 4',
    tel: '02667330418',
    telYazi: '0266 733 04 18',
    enlem: 40.3462,
    boylam: 27.9691,
    bayiler: ['balikesir', 'bursa'],
    hizmet: ['servis'],
  },
  {
    id: 'izmir-servis',
    no: 'SRV005',
    ad: 'Ege Teknik Servis',
    tur: 'tuzel',
    il: 'İzmir',
    ilce: 'Torbalı',
    adres: 'Pancar Organize Sanayi, 3. Cadde No: 8',
    tel: '02328560517',
    telYazi: '0232 856 05 17',
    enlem: 38.1489,
    boylam: 27.3662,
    bayiler: ['izmir', 'aydin'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'manisa-servis',
    no: 'SRV006',
    ad: 'Salihli Tarım Servisi',
    tur: 'tuzel',
    il: 'Manisa',
    ilce: 'Salihli',
    adres: 'Adala Yolu 2. km',
    tel: '02367120633',
    telYazi: '0236 712 06 33',
    enlem: 38.4771,
    boylam: 28.1462,
    bayiler: ['manisa'],
    hizmet: ['servis'],
  },
  {
    id: 'antalya-servis',
    no: 'SRV007',
    ad: 'Hüseyin Kara Tarım Servisi',
    tur: 'sahis',
    il: 'Antalya',
    ilce: 'Korkuteli',
    adres: 'Bayat Mahallesi, Sanayi Caddesi No: 41',
    tel: '02426430741',
    telYazi: '0242 643 07 41',
    enlem: 37.0612,
    boylam: 30.2033,
    bayiler: ['antalya'],
    hizmet: ['servis'],
  },
  {
    id: 'adana-servis',
    no: 'SRV008',
    ad: 'Çukurova Teknik Servis',
    tur: 'tuzel',
    il: 'Adana',
    ilce: 'Ceyhan',
    adres: 'Sanayi Mahallesi, 5. Sokak No: 16',
    tel: '03226130816',
    telYazi: '0322 613 08 16',
    enlem: 37.0301,
    boylam: 35.8102,
    bayiler: ['adana'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'urfa-servis',
    no: 'SRV009',
    ad: 'Harran Teknik Servis',
    tur: 'tuzel',
    il: 'Şanlıurfa',
    ilce: 'Viranşehir',
    adres: 'Yeni Sanayi Sitesi 12. Blok',
    tel: '04145110927',
    telYazi: '0414 511 09 27',
    enlem: 37.2288,
    boylam: 39.7702,
    bayiler: ['sanliurfa', 'diyarbakir'],
    hizmet: ['servis'],
  },
  {
    id: 'malatya-servis',
    no: 'SRV010',
    ad: 'Fırat Teknik Servis',
    tur: 'tuzel',
    il: 'Malatya',
    ilce: 'Battalgazi',
    adres: 'Çöşnük Mahallesi, Sanayi Caddesi No: 9',
    tel: '04223211009',
    telYazi: '0422 321 10 09',
    enlem: 38.3841,
    boylam: 38.3402,
    bayiler: ['malatya'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'kayseri-servis',
    no: 'SRV011',
    ad: 'Erciyes Tarım Servisi',
    tur: 'tuzel',
    il: 'Kayseri',
    ilce: 'Develi',
    adres: 'Aşağı Everek Mahallesi, Sanayi Sitesi 3. Blok',
    tel: '03526181122',
    telYazi: '0352 618 11 22',
    enlem: 38.3852,
    boylam: 35.4877,
    bayiler: ['kayseri', 'sivas'],
    hizmet: ['servis', 'parca'],
  },
  {
    id: 'samsun-servis',
    no: 'SRV012',
    ad: 'Bafra Tarım Servisi',
    tur: 'tuzel',
    il: 'Samsun',
    ilce: 'Bafra',
    adres: 'Kızılırmak Mahallesi, Sanayi Caddesi No: 30',
    tel: '03625421230',
    telYazi: '0362 542 12 30',
    enlem: 41.5602,
    boylam: 35.9134,
    bayiler: ['samsun', 'corum'],
    hizmet: ['servis'],
  },
  {
    id: 'erzurum-servis',
    no: 'SRV013',
    ad: 'Ahmet Solmaz Tarım Servisi',
    tur: 'sahis',
    il: 'Erzurum',
    ilce: 'Pasinler',
    adres: 'Hasankale Sanayi Sitesi No: 7',
    tel: '04426611307',
    telYazi: '0442 661 13 07',
    enlem: 39.9761,
    boylam: 41.6702,
    bayiler: ['erzurum'],
    hizmet: ['servis'],
  },
  {
    id: 'tekirdag-servis',
    no: 'SRV014',
    ad: 'Trakya Teknik Servis',
    tur: 'tuzel',
    il: 'Tekirdağ',
    ilce: 'Malkara',
    adres: 'Camiatik Mahallesi, Keşan Caddesi No: 52',
    tel: '02824271452',
    telYazi: '0282 427 14 52',
    enlem: 40.8841,
    boylam: 26.9062,
    bayiler: ['tekirdag'],
    hizmet: ['servis', 'parca'],
  },
]

/* İki nokta arası kuş uçuşu kilometre (Haversine).
   Servis sıralamasında "hangisi daha yakın" sorusuna yeter; yol mesafesi
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

/* Backoffice'ten gerçek servis listesi girildiyse o geçerli; yoksa
   yukarıdaki temsilî liste. Ekranlar bu fonksiyonu çağırıyor, doğrudan
   SERVISLER'i değil. */
export function servisleriGetir() {
  return icerikListe('servisler', SERVISLER)
}

/** Servisleri verilen konuma göre yakından uzağa sıralar. */
export function yakindanUzaga(enlem, boylam) {
  return servisleriGetir()
    .map((b) => ({ ...b, km: mesafeKm(enlem, boylam, b.enlem, b.boylam) }))
    .sort((a, b) => a.km - b.km)
}

/** Konum yoksa, kullanıcının kayıtlı ilindeki servisler önce gelsin. */
export function ileGore(il) {
  const liste = servisleriGetir()
  if (!il) return liste
  return [...liste].sort((a, b) => (b.il === il) - (a.il === il))
}

/* ==========================================================================
   Sorumluluk bölgesi

   Servis kaydındaki `bolge` alanı, satış personelinin backoffice'ten
   tanımladığı sorumluluk alanı:

     bolge: [
       { il: 'Konya', ilceler: [] },              tüm Konya
       { il: 'Karaman', ilceler: ['Ermenek'] },   yalnız Ermenek
     ]

   İLÇE LİSTESİ BOŞSA tüm il demektir. Dolu ise yalnız o ilçeler.

   Alan eski kayıtlarda yok; olmaması "bölge tanımlanmamış" anlamına
   geliyor ve eşleştirme eski üç kademeye düşüyor.
   ========================================================================== */

/** Servisin sorumluluk bölgesi bu il/ilçeyi kapsıyor mu? */
export function bolgeKapsiyorMu(servis, il, ilce) {
  if (!il) return false
  return (servis.bolge || []).some(
    (b) =>
      b.il === il && (!b.ilceler || !b.ilceler.length || b.ilceler.includes(ilce)),
  )
}

/** Kapsama ilçe adı yazılarak mı kuruldu, yoksa tüm il olduğu için mi? */
function bolgeIlceyeOzelMi(servis, il, ilce) {
  if (!ilce) return false
  return (servis.bolge || []).some(
    (b) => b.il === il && (b.ilceler || []).includes(ilce),
  )
}

/* ==========================================================================
   Talebe bakacak servis

   Makineyi kuran, bakımını ve tamirini yapan taraf servis. Uygulamadan
   gelen servis ve yedek parça talebi doğrudan cevaplanmıyor: müşteriyle
   sahada ilgilenecek servise yönlendiriliyor.

   DOĞRU YOL BURADA DEĞİL — HENÜZ

   Zincirin doğrusu makineden geçiyor:

     makine → (LOGO faturası) → bayi → bayinin servisi

   LOGO açılana kadar makinenin hangi bayiden çıktığı bilinmiyor. O gün
   gelene kadar coğrafya yedek yol: aşağıdaki dört kademe.

   DÖRT KADEME, sırayla:

     0. Sorumluluk bölgesi talebi kapsayan servis — personelin elle
        tanımladığı bölge. Tanımlıysa en doğru cevap budur.
     1. Aynı ilçedeki servis.
     2. Aynı ildeki servis.
     3. İlinde servis yoksa, il merkezine kuş uçuşu en yakın servisler.

   0. kademe bölge tanımı girilmiş servisler için çalışıyor; hiçbir
   servise bölge tanımlanmamışsa fonksiyon 1-3 ile sonuçlanıyor.
   Böylece bölge tanımlanmadan da sistem çalışmaya devam ediyor.

   HİZMET: hangi hizmetin arandığı talebin türüne göre değişiyor. Parça
   tutmayan servise yedek parça talebi yollamanın anlamı yok.

   @param {string} il
   @param {string} ilce
   @param {number} adet en fazla kaç servis
   @param {'servis'|'parca'} gerekenHizmet
   @returns {{kademe: 'bolge'|'ilce'|'il'|'yakin', servisler: Array}}
   ========================================================================== */
export function talebinServisleri(il, ilce, adet = 3, gerekenHizmet = 'servis') {
  const uygunlar = servisleriGetir().filter((b) =>
    (b.hizmet || []).includes(gerekenHizmet),
  )

  /* 0. kademe — sorumluluk bölgesi.
     İlçesi açıkça yazılmış servis, tüm ilden sorumlu olana tercih
     ediliyor: daha dar tanım daha bilinçli bir atamadır. */
  const bolgeliler = uygunlar.filter((b) => bolgeKapsiyorMu(b, il, ilce))
  if (bolgeliler.length) {
    const ilceyeOzel = bolgeliler.filter((b) => bolgeIlceyeOzelMi(b, il, ilce))
    const secilen = ilceyeOzel.length ? ilceyeOzel : bolgeliler
    return { kademe: 'bolge', servisler: secilen.slice(0, adet) }
  }

  if (il) {
    const ildekiler = uygunlar.filter((b) => b.il === il)

    if (ildekiler.length) {
      const ilcedekiler = ilce ? ildekiler.filter((b) => b.ilce === ilce) : []
      if (ilcedekiler.length) {
        return { kademe: 'ilce', servisler: ilcedekiler.slice(0, adet) }
      }
      return { kademe: 'il', servisler: ildekiler.slice(0, adet) }
    }
  }

  /* İlinde servis yok — en yakınları göster. Koordinat bilinmiyorsa
     mesafe hesaplanamıyor; uydurmak yerine boş dönüyoruz ve ekran
     "servis eşleştirilemedi" diyor. */
  const konum = ilKoordinati(il)
  if (!konum) return { kademe: 'yakin', servisler: [] }

  return {
    kademe: 'yakin',
    servisler: uygunlar
      .map((b) => ({ ...b, km: mesafeKm(konum.enlem, konum.boylam, b.enlem, b.boylam) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, adet),
  }
}

/* ==========================================================================
   Bayiden servise

   Makinenin hangi bayiden satıldığı biliniyorsa müşteriye bakacak
   servis tahmin değil, kayıt: o bayiyle çalışan servis.

   Birden çok servis aynı bayiyle çalışıyorsa hepsi dönüyor; seçimi
   çağıran taraf yapıyor. Bayi bilinmiyorsa boş dizi dönüyor ve
   çağıran coğrafi eşleştirmeye düşüyor.
   ========================================================================== */
export function bayininServisleri(bayiId, gerekenHizmet = 'servis') {
  if (!bayiId) return []
  return servisleriGetir().filter(
    (s) => (s.bayiler || []).includes(bayiId) && (s.hizmet || []).includes(gerekenHizmet),
  )
}
