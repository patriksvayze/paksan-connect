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

   YEDEK PARÇA SERVİSİN İŞİ DEĞİL

   Kayıtta bir dönem "hizmet" alanı vardı (servis · yedek parça) ve
   müşterinin parça talebi, parça hizmeti işaretli servise
   yönlendiriliyordu. Alan kaldırıldı: parçanın tedarikçisi PAKSAN ve
   müşteri parayı PAKSAN'a ödüyor (bkz. context/AppState.jsx →
   addRequest). Servisin parça ihtiyacı kendi siparişiyle karşılanıyor.

   SORUMLULUK BÖLGESİ BİR KISIT DEĞİL

   `bolge` alanı, personel bir makineye servis atarken hangi servisi
   önce göreceğini belirliyor. Bölgesi girilmemiş servis listeden
   DÜŞMÜYOR; yalnız sırada geride kalıyor. Bölge zorunlu tutulsaydı
   yeni açılan her servis, kimse ona bölge yazana kadar görünmez
   olurdu.

   KOORDİNAT YOK

   Kayıtta enlem/boylam tutulmuyor. Tutulduğu dönemde tek işi
   müşteri uygulamasındaki yön haritasıydı; harita kaldırıldı.
   Servisin nerede olduğu il, ilçe ve adresle zaten belli.
   ========================================================================== */

import { icerikListe } from '../../lib/icerikDeposu.js'

/** Servis şahıs mı, tüzel kişi mi — hak ediş bu ayrıma göre ödeniyor. */
export const SERVIS_TURU = {
  sahis: 'Şahıs',
  tuzel: 'Tüzel kişi',
}

/* DEMO BÖLGELERİ (5 Ekim 2026). Her servisin bölgesi kendi ili ve çalıştığı
   bayilerin illeri: PAKSAN'ın gerçek listede gireceği biçim. Bölge talebin
   servise mi PAKSAN'a mı gideceğini belirliyor (servisBolgesindeMi).
   Girilmeseydi örneğin Aksaray bayisinin müşterileri, servisleri
   Konya'da olduğu için her talepte PAKSAN'a düşerdi. */
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
    bayiler: ['konya-merkez', 'aksaray'],
    bolge: [{ il: 'Konya', ilceler: [] }, { il: 'Aksaray', ilceler: [] }],
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
    bayiler: ['ankara'],
    bolge: [{ il: 'Ankara', ilceler: [] }],
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
    bayiler: ['eskisehir'],
    bolge: [{ il: 'Eskişehir', ilceler: [] }],
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
    bayiler: ['balikesir', 'bursa'],
    bolge: [{ il: 'Balıkesir', ilceler: [] }, { il: 'Bursa', ilceler: [] }],
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
    bayiler: ['izmir', 'aydin'],
    bolge: [{ il: 'İzmir', ilceler: [] }, { il: 'Aydın', ilceler: [] }],
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
    bayiler: ['manisa'],
    bolge: [{ il: 'Manisa', ilceler: [] }],
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
    bayiler: ['antalya'],
    bolge: [{ il: 'Antalya', ilceler: [] }],
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
    bayiler: ['adana'],
    bolge: [{ il: 'Adana', ilceler: [] }],
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
    bayiler: ['sanliurfa', 'diyarbakir'],
    bolge: [{ il: 'Şanlıurfa', ilceler: [] }, { il: 'Diyarbakır', ilceler: [] }],
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
    bayiler: ['malatya'],
    bolge: [{ il: 'Malatya', ilceler: [] }],
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
    bayiler: ['kayseri', 'sivas'],
    bolge: [{ il: 'Kayseri', ilceler: [] }, { il: 'Sivas', ilceler: [] }],
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
    bayiler: ['samsun', 'corum'],
    bolge: [{ il: 'Samsun', ilceler: [] }, { il: 'Çorum', ilceler: [] }],
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
    bayiler: ['erzurum'],
    bolge: [{ il: 'Erzurum', ilceler: [] }],
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
    bayiler: ['tekirdag'],
    bolge: [{ il: 'Tekirdağ', ilceler: [] }],
  },
]

/* Backoffice'ten gerçek servis listesi girildiyse o geçerli; yoksa
   yukarıdaki temsilî liste. Ekranlar bu fonksiyonu çağırıyor, doğrudan
   SERVISLER'i değil. */
export function servisleriGetir() {
  return icerikListe('servisler', SERVISLER)
}

/** Bir servisi kimliğiyle bulur. */
export function servisGetir(id) {
  if (!id) return null
  return servisleriGetir().find((s) => s.id === id) || null
}

/** Kullanıcının kayıtlı ilindeki servisler önce gelsin. */
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

/* ==========================================================================
   Servis bu yere gidiyor mu? (5 Ekim 2026, kullanıcının kararı)

   Çiftçi makinesiyle başka bir il ya da ilçeye işe gitmiş olabilir.
   Servis talebi makinenin servisine gidiyordu, makine nerede olursa
   olsun. Artık talep formundaki il ve ilçe servisin bölgesinde değilse
   talep servise gitmiyor, PAKSAN'a düşüyor ve PAKSAN o iş için bir
   servis atıyor (bkz. lib/talepOlustur.js → bolgeDisiKaydi, backoffice/
   veri.js → bolgeDisiTalebeServisAta).

   Kullanıcının üç cevabı: çiftçinin hesap adresine BAKILMIYOR (adres çoğu
   zaman evi, tarla başka ilçede; asıl soru servisin oraya gidip
   gitmediği), bölge dışında talep PAKSAN'a gidiyor, BÖLGESİ
   GİRİLMEMİŞ SERVİSİN BÖLGESİ KENDİ İLİ sayılıyor.

   Bu yüzden `bolge` bugün yalnız sıralama değil, talebin nereye gittiğini
   de belirliyor (yukarıdaki "kısıt değil" notu atama önerisi için hâlâ
   doğru). Başka ildeki bir bayiyle çalışan servisin bölgesi girilmezse o
   bayinin müşterilerinin talepleri PAKSAN'a düşer: canlıdan önce her
   servisin bölgesi girilmeli (CANLIYA-CIKIS.md).
   ========================================================================== */
export function servisBolgesindeMi(servis, il, ilce) {
  if (!servis || !il) return false
  if ((servis.bolge || []).length) return bolgeKapsiyorMu(servis, il, ilce)
  return servis.il === il
}

/** Kapsama ilçe adı yazılarak mı kuruldu, yoksa tüm il olduğu için mi? */
function bolgeIlceyeOzelMi(servis, il, ilce) {
  if (!ilce) return false
  return (servis.bolge || []).some(
    (b) => b.il === il && (b.ilceler || []).includes(ilce),
  )
}

/* ==========================================================================
   Talebe önerilen servis

   BU FONKSİYON ARTIK ATAMA YAPMIYOR, ÖNERİ VERİYOR.

   Eskiden müşteri talep açtığı anda burası çalışıyor ve talebi
   coğrafyaya göre bir servise düşürüyordu. O yol bırakıldı: hangi
   servisin hangi müşteriye bakacağı PAKSAN'ın kararı, coğrafyanın
   değil — servis, hak edişini PAKSAN'dan alıyor ve PAKSAN kime iş
   verdiğini bilmek zorunda.

   Bugün müşterinin servisi şu zincirden geliyor (bkz. lib/servisAtama.js):

     makine → atanmış servis            elle ya da LOGO ile
     makine → bayi → bayinin servisi    bayi biliniyorsa

   Zincir boş dönerse müşteri servis talebi AÇAMIYOR; uygulama
   PAKSAN'la iletişime geçmesini söylüyor.

   Burası o boşluğu personelin doldurması için: backoffice'te bir
   makineye ya da talebe servis atanırken "bu il/ilçe için hangi
   servisler uygun" sorusunun cevabı. Personel listeden seçiyor, karar
   insanda kalıyor.

   ÜÇ KADEME, sırayla:

     1. Sorumluluk bölgesi talebi kapsayan servis — personelin elle
        tanımladığı bölge. Tanımlıysa en doğru cevap budur.
     2. Aynı ilçedeki servis.
     3. Aynı ildeki servis.

   BÖLGESİ OLMAYAN SERVİS ELENMİYOR. Bölge yalnız sıralamayı
   belirliyor; tanımlanmamış olması servisi listeden düşürmüyor.
   Hiçbir servise bölge girilmemişse liste 2. ve 3. kademeyle
   doluyor. Bölge bir kısıt değil, bir tercih.

   @param {string} il
   @param {string} ilce
   @param {number} adet en fazla kaç servis
   @returns {{kademe: 'bolge'|'ilce'|'il'|'yok', servisler: Array}}
   ========================================================================== */
export function talebinServisleri(il, ilce, adet = 3) {
  const uygunlar = servisleriGetir()

  /* 1. kademe — sorumluluk bölgesi.
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

  /* İlinde servis yok. Uydurulmuş bir öneri, önerisizlikten kötü:
     personel listeden kendisi seçiyor. */
  return { kademe: 'yok', servisler: [] }
}

/* ==========================================================================
   Bayiden servise

   Makinenin hangi bayiden satıldığı biliniyorsa müşteriye bakacak
   servis tahmin değil, kayıt: o bayiyle çalışan servis.

   Birden çok servis aynı bayiyle çalışıyorsa hepsi dönüyor; seçimi
   çağıran taraf yapıyor. Bayi bilinmiyorsa boş dizi dönüyor ve
   çağıran coğrafi eşleştirmeye düşüyor.
   ========================================================================== */
export function bayininServisleri(bayiId) {
  if (!bayiId) return []
  return servisleriGetir().filter((s) => (s.bayiler || []).includes(bayiId))
}
