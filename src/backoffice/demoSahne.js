/* ==========================================================================
   Servisim demo sahnesi — Selçuk Tarım Servisi'nin işleri (29 Eylül 2026)

   KULLANICININ İSTEĞİ: "Servisim için güncellenmiş ve daha kapsamlı bir
   demo verisi girilmeli. Talep adedi çok olmak zorunda değil, uygulamada
   mümkün olduğunca her yere girilsin istiyorum demo verisi ile, ki hem
   test edebilelim hem görelim doğru çalışıyor mu diye."

   NEDEN YENİ BİR DOSYA. Sahne servisinin işleri önce demoServis.js'te
   elle kurulan nesnelerdi (SAHNE_GOREVLERI → servisAkisi). Gerçek
   işlevlerden geçmedikleri için Servisim'in yarısı boş kalıyordu: servise
   giden bildirim hiç yoktu (İşlerim'in "PAKSAN" ve "Müşteriden"
   bölümleri, talebin içindeki işlem geçmişi, Bildirimler ekranı), yeniden
   açılan iş, müşterinin sonradan eklediği not, kısmi gönderilen ve iptal
   edilen sipariş, düzeltilmiş hak ediş, ücret ve indirim değişikliği
   yoktu. Elle kurulan kayıt gerçekte oluşamayacak biçimler de taşıyordu:
   parça isteği teslimat adresi olmadan, sipariş indirim oranı olmadan
   yazılıyordu.

   ŞİMDİ HER KAYIT GERÇEK YOLDAN. Talep Connect'in kaydıyla
   (lib/talepOlustur.js → talepKaydiOlustur) ya da Servisim'in Kayıt Aç
   kaydıyla (lib/elleTalep.js) kuruluyor, sonra her adım uygulamanın kendi
   işleviyle yürüyor: randevu, parça isteği, parçanın gönderilmesi, kargo
   bilgisinin sonradan girilmesi, iş bitti, düzeltme, onay, ret, destek
   isteme, iptal, müşterinin eklemesi ve "Sorun Devam Ediyor"u, sipariş,
   kısmi gönderim, kalan parçaların gönderilmesi ve iptali, iade. Bildirim,
   hesap hareketi ve geçmiş satırı o işlevlerin kendi yazdığı.

   GEÇMİŞ TARİHLE. Her adım kendi gününde çalışıyor: `anda` yalnız o
   adımın süresince saati geri alıyor (Date.now ve argümansız new Date);
   adım bitince saat yerine dönüyor. Adımlar tarihe göre sıralı
   koşturuluyor, yani bakiye, indirim oranı ve ücret her adımda o güne
   kadar olanlardan okunuyor. Saat hiçbir zaman bir bekleme (await)
   boyunca geri alınmış kalmıyor: fotoğraflar önceden hazırlanıyor.

   RASTGELE YOK. Müşteriler, makineler, seri numaraları, arızalar,
   parçalar ve tarihler sabit: her kurulumda aynı sahne. Parça seçimi
   katalogtan en ucuzdan pahalıya ilk uygun parça (katalog değişirse
   parça da değişir, akış değişmez).

   DEPOLAR. Talepler demo deposuna (`demoTalepler`) yazılıyor; veri
   katmanının yazan işlevleri demo talebini zaten orada buluyor
   (veri.js → talepYaz). Servis siparişi de öyle: kaydı gerçek gövdeyle
   kuruluyor (veri.js → servisSiparisKaydi), ortak listeye (`requests`)
   değil demo deposuna yazılıyor. Bildirim ve hesap hareketi talebin
   kimliğini taşıyor; demo temizlenirken onunla bulunuyor (demo.js →
   demoTemizle). Talebe bağlı olmayan hesap bildirimleri `demo` damgası
   alıyor.

   İŞLEM KAYDI YAZILMIYOR. Gerçek işlevler her adımda İşlem Kaydı'na
   satır yazıyor (yaklaşık 80 satır). İşlem Kaydı insanların yaptığını
   gösteren denetim defteri: demo kurulumu kimsenin işi değil. Servisim'de
   çalışırken bütün satırlar "servis" rolüyle yazılıyor (veri.js →
   islemYaz), PAKSAN'ın adımları yanlış rolle görünürdü; defter 500 satırla
   sınırlı ve eski gerçek satırları iterdi. Sahne bitince defter kurulum
   öncesine dönüyor; demo.js'in "Demo verisi yüklendi" satırı kalıyor.

   AYARLAR. Üç ayar sahnenin parçası, çünkü Servisim'in Ücretlendirmeler
   bölümü ve iki bildirim ancak onlarla görünüyor: bu servise Orkinos
   1270'te özel işçilik ücreti (50 gün önce), servise özel parça indirimi
   (15 gün önce), bakiyeden ödemede ek indirim (5 gün önce). Personel o
   ayarı zaten yazmışsa demo DOKUNMUYOR. Yazılan her ayarın önceki hâli
   `demoAyarYedegi`nde; demo temizlenince ayar, personel o arada
   değiştirmediyse, eski hâline dönüyor (demo.js → demoTemizle).

   KAYIT AÇ İÇİN BİLİNEN NUMARALAR (sınayan kişinin kopya kâğıdı; ekranda
   ipucu olarak yazmıyor, yazılacaksa metin Codex'ten geçer):
     505 000 00 01 … 08  Konya müşterileri (K1–K8); makineleri bu servisin
     505 000 00 09       Polatlı'daki müşteri (N1): iki makinesi de
                         Polatlı Tarım Servisi'nin; biri üzerinde o servisin
                         açık işi var, ötekinde bu servisin atama dışı işi
                         (D16). Kayıt Aç "başka servis" uyarısını gösterir
     505 000 00 10       Kulu'daki müşteri (N2): makinesinin servisi ve
                         bayisi yok, Kayıt Aç "servisi atanmamış" der
     505 000 00 11       kayıtlı olmayan kişi (D07'nin sahibi, seri
                         numarası olmayan tesviye küreği)
   Yeni numarayla bir K müşterisinin seri numarası yazılırsa (örneğin
   K5'in makinesi) Kayıt Aç "makine başka birinin adına kayıtlı" uyarısını
   gösterir. Numaralar gerçek olmayacak biçimde seçildi (505 000 00 xx);
   rastgele demo numaraları 530-559 ile başlıyor, çakışmıyor. Aynı liste
   tools/kullanici-sinamasi/README.md'de.

   Sunucu bağlandığında demo dosyalarıyla birlikte bu dosya da siliniyor
   (bkz. servis/demoKur.js başı).
   ========================================================================== */

import { load, save, uid } from '../lib/storage'
import { yeniNo } from '../lib/numara'
import { LOGO } from '../lib/logo'
import { normalizeSerial } from '../lib/serial'
import { telKullanici } from '../lib/tel'
import { RANDEVU_ISI } from '../lib/talep'
import { bugunGirdi, gunlukRandevu } from '../lib/tarih'
import { talepKaydiOlustur } from '../lib/talepOlustur'
import { elleTalepKaydiOlustur } from '../lib/elleTalep'
import { eklemeOlustur, eklemeyiServiseBildir, sorunDevaminiServiseBildir } from '../lib/talepEkleme'
import {
  ASAMA,
  GARANTI_DISI_OZET,
  buZiyaretinKaydi,
  iscilikAlanlari,
  talebinParcalari,
  talepNedeni,
} from '../lib/servisKaydi'
import {
  sepetSatirlari,
  sepetToplami,
  siparisGoruntusu,
  siparisKalemleri,
  siparisTutari,
} from '../lib/servisFiyat'
import { parcaBul } from '../lib/parcaKatalogu'
import { icerikTazele } from '../lib/icerikDeposu'
import { adresEkle, adresTeslimata, firmaAdresi } from '../servis/adresler'
import { okunduSay } from '../servis/talepBildirimleri'
import { BAYILER } from '../data/katalog/bayiler.js'
import { SERVISLER } from '../data/katalog/servisler.js'
import { getProduct } from '../data/katalog/products.js'
import {
  ANAHTAR,
  bakiyeIskontosuGetir,
  bakiyeIskontosunuKaydet,
  cariHareketEkle,
  cariHareketleri,
  destekTalepEt,
  hakkedisDuzelt,
  hakkedisOnayla,
  hakkedisReddet,
  hizmetTarifesiGetir,
  kalanParcalariGonder,
  kalanParcalariIptalEt,
  parcaIskontosuGetir,
  servisBildirimleri,
  servisIskontosunuKaydet,
  servisinIskontosu,
  servisinTarifesi,
  servisKaydiGonder,
  servisParcasiGonderildi,
  servisSiparisiniIptalEt,
  servisSiparisKaydi,
  servisTarifesiniKaydet,
  talepDurumDegistir,
  talepIptal,
  talepKapat,
  talepNotEkle,
  talepPlanla,
} from './veri'
import { DEMO_SERVIS, DEVIR_NEDEN, RED_NEDEN } from './demoServis'
import {
  ARIZA_VAKALARI,
  KURULUM_VAKASI,
  makineninParcaHavuzu,
  parcaliSonucYazisi,
  tespitYazisi,
  vakaHavuzu,
} from './demoMakineAilesi'

const GUN = 86400000

/* Sabit müşterilerin telefon bildirimi izni (demo.js'in rastgele
   müşterileriyle aynı değer). */
const BILDIRIM_IZNI = 'verildi'

/* Ayarların yedeği: demo temizlenirken ayar buradan geri konuyor. */
export const AYAR_YEDEGI = 'demoAyarYedegi'

/* ==========================================================================
   Sabit müşteriler

   K1–K8 sahne servisinin Konya'daki müşterileri; makineleri bu servise
   atanmış (K2'ninkiler atama olmadan, bayiden). N1 başka servisin
   müşterisi, N2'nin makinesinin servisi yok: Kayıt Aç'ın uyarıları ve
   backoffice'in "servisi atanmamış makine" sayacı için.

   `yas` makinenin kaç yıl önce üretildiği: 1 garanti sürüyor, 2 garantinin
   son yılı, 5 garanti bitti, 0 bu yıl (yeni makine, kurulum). `sira` seri
   numarasının sıra kısmı; rastgele demo 00001-09999 arasını kullanıyor,
   sabitler 10101'den başlıyor. Adres köyü müşterinin ilçesinde (demo.js →
   KOYLER); servis talebi bu adresi taşıyor.
   ========================================================================== */
export const SAHNE_MUSTERILERI = [
  {
    kod: 'K1', ad: 'Hüseyin Aydın', tel: '505 000 00 01', il: 'Konya', ilce: 'Selçuklu',
    adres: 'Hocacihan Mahallesi, silonun yanı',
    makineler: [
      { urun: 'orkinos-1270', yas: 1, sira: '10101', saat: 640 },
      { urun: 'diamond-dikey', yas: 1, sira: '10102', saat: 310 },
    ],
  },
  {
    kod: 'K2', ad: 'Ramazan Çetin', tel: '505 000 00 02', il: 'Konya', ilce: 'Karatay',
    adres: 'İsmil Mahallesi, cami karşısı',
    /* Servis atanmamış, bayisinin servisi bakıyor (lib/servisAtama.js). */
    bayidenServis: true,
    makineler: [
      { urun: 'super-yunus', yas: 1, sira: '10201', saat: 820 },
      { urun: 'orkinos-870', yas: 2, sira: '10202', saat: 1150 },
    ],
  },
  {
    kod: 'K3', ad: 'Fatma Korkmaz', tel: '505 000 00 03', il: 'Konya', ilce: 'Meram',
    adres: 'Dedemli Mahallesi, köy girişi ilk sağ',
    makineler: [
      { urun: 'super-8002e', yas: 1, sira: '10301', saat: 540 },
      { urun: 'kirlangic-ot-toplama', yas: 5, sira: '10302', saat: 1900 },
      { urun: 'pelican-yatay', yas: 0, sira: '10303', saat: 0 },
    ],
  },
  {
    kod: 'K4', ad: 'İbrahim Polat', tel: '505 000 00 04', il: 'Konya', ilce: 'Çumra',
    adres: 'Karkın Mahallesi, kooperatifin arkası',
    makineler: [{ urun: 'orka-870', yas: 1, sira: '10401', saat: 720 }],
  },
  {
    kod: 'K5', ad: 'Emine Arslan', tel: '505 000 00 05', il: 'Konya', ilce: 'Ereğli',
    adres: 'Akhüyük Mahallesi, muhtarlığın karşısı',
    makineler: [{ urun: 'albatros-870', yas: 1, sira: '10501', saat: 460 }],
  },
  {
    kod: 'K6', ad: 'Osman Kılıç', tel: '505 000 00 06', il: 'Konya', ilce: 'Cihanbeyli',
    adres: 'Taşpınar Mahallesi, sulama kanalının kenarı',
    makineler: [
      { urun: 'super-yunus-dual2', yas: 1, sira: '10601', saat: 910 },
      { urun: 'yengec-cayir', yas: 1, sira: '10602', saat: 280 },
    ],
  },
  {
    kod: 'K7', ad: 'Recep Doğan', tel: '505 000 00 07', il: 'Konya', ilce: 'Sarayönü',
    adres: 'Ladik Mahallesi, okulun arkası',
    makineler: [
      { urun: 'super-8002', yas: 1, sira: '10701', saat: 600 },
      { urun: 'hammer', yas: 1, sira: '10702', saat: 350 },
    ],
  },
  {
    kod: 'K8', ad: 'Zeynep Şahin', tel: '505 000 00 08', il: 'Konya', ilce: 'Kulu',
    adres: 'Kozanlı Mahallesi, cami karşısı',
    makineler: [
      { urun: 'super-yunus-3yabali', yas: 1, sira: '10801', saat: 700 },
      { urun: 'super-8002e-dual2', yas: 2, sira: '10802', saat: 1240 },
    ],
  },
  {
    kod: 'N1', ad: 'Kemal Öztürk', tel: '505 000 00 09', il: 'Ankara', ilce: 'Polatlı',
    adres: 'Yassıhüyük Mahallesi, silonun yanı',
    bayi: 'ankara', servis: 'ankara-servis',
    makineler: [
      { urun: 'orkinos-870', yas: 1, sira: '10901', saat: 510 },
      { urun: 'super-yunus', yas: 1, sira: '10902', saat: 380 },
    ],
  },
  {
    kod: 'N2', ad: 'Halil Kurt', tel: '505 000 00 10', il: 'Konya', ilce: 'Kulu',
    adres: 'Tavlıören Mahallesi, köy girişi ilk sağ',
    bayi: null, servis: null,
    makineler: [{ urun: 'rotovator', yas: 1, sira: '11001', saat: 150 }],
  },
]

/** Sahne servisinin Konya'daki müşterileri: demo müşteri listesinin ilk sekizi. */
export const SAHNE_MUSTERI = 8

/** Sabit müşterilerin sayısı; rastgele demo müşterileri bunlardan sonra. */
export const SABIT_MUSTERI = SAHNE_MUSTERILERI.length

/* Kayıt Aç'ta seri numarası olmayan makineyle açılan işin sahibi (D07):
   uygulamada hesabı yok. */
const KAYITSIZ = {
  adi: 'Cemal', soyadi: 'Bulut', tel: '505 000 00 11', il: 'Konya', ilce: 'Karatay',
  adres: 'Divanlar Mahallesi, muhtarlığın karşısı',
}

/* ==========================================================================
   Sahnenin işleri — her biri Servisim'de görünen bir hâl

   `tur`: servis talebi ya da servisin kendi siparişi. `durum` sahne
   kurulduktan sonraki durum; ekosistem sınaması (AK-34) her birinin o
   durumda olduğunu denetliyor. Talep `demoSahne` alanında kodunu taşıyor.
   ========================================================================== */
export const SAHNE_ISLERI = [
  /* Yeni sekmesi */
  { kod: 'D01', tur: 'servis', durum: 'yeni' }, // uygulamadan: sesli not, fotoğraf, Destek'te kontrol edilenler
  { kod: 'D02', tur: 'servis', durum: 'yeni' }, // müşteri sonradan not ve fotoğraf ekledi (Müşteriden)
  { kod: 'D03', tur: 'servis', durum: 'yeni' }, // yeni makinenin ilk kurulumu, 48 saati geçti
  { kod: 'D04', tur: 'servis', durum: 'yeni' }, // 48 saati geçti, PAKSAN'ın servise notu; garantinin son yılı
  { kod: 'D05', tur: 'servis', durum: 'yeni' }, // onaylanmış işte müşteri "Sorun Devam Ediyor" dedi
  { kod: 'D06', tur: 'servis', durum: 'yeni' }, // Kayıt Aç, kayıtlı müşteri
  { kod: 'D07', tur: 'servis', durum: 'yeni' }, // Kayıt Aç, kayıtsız kişi, seri numarası yok
  /* Devam Eden sekmesi */
  { kod: 'D08', tur: 'servis', durum: 'planlandi' }, // randevu günü geçti
  { kod: 'D09', tur: 'servis', durum: 'planlandi' }, // randevu bugün; PAKSAN müşteriye not yazdı
  { kod: 'D10', tur: 'servis', durum: 'planlandi' }, // servis yarına randevu verdi (ileri tarihli)
  { kod: 'D11', tur: 'servis', durum: 'incelemede' }, // servis PAKSAN'dan destek istedi
  { kod: 'D12', tur: 'servis', durum: 'parcaBekliyor' }, // parça istendi, hazırlanıyor
  { kod: 'D13', tur: 'servis', durum: 'parcaBekliyor' }, // parça Depo adresine yolda, kargo bilgisi sonradan
  { kod: 'D14', tur: 'servis', durum: 'onayBekliyor' }, // parçalı iş bitti, onay bekliyor
  { kod: 'D15', tur: 'servis', durum: 'onayBekliyor' }, // ikinci ziyaret, PAKSAN süreyi düzeltti
  { kod: 'D16', tur: 'servis', durum: 'onayBekliyor' }, // Kayıt Aç, makine başka servisin (atama dışı)
  /* Tamamlanan sekmesi */
  { kod: 'D17', tur: 'servis', durum: 'kapandi' }, // parçalı iş onaylandı, servisin notu
  { kod: 'D18', tur: 'servis', durum: 'kapandi' }, // yol düzeltildi, sonra onaylandı
  { kod: 'D19', tur: 'servis', durum: 'kapandi' }, // kayıt reddedildi
  { kod: 'D20', tur: 'servis', durum: 'kapandi' }, // garanti bitmiş makine, garanti dışı kapatıldı
  { kod: 'D21', tur: 'servis', durum: 'kapandi' }, // destek istendi, PAKSAN kapattı
  { kod: 'D22', tur: 'servis', durum: 'iptal' }, // PAKSAN açıklamayla iptal etti
  /* Parça sekmesi (servisin siparişleri) */
  { kod: 'D23', tur: 'siparis', durum: 'yeni' }, // bakiyeden, ek indirimli, bakiyeden ayrıldı
  { kod: 'D24', tur: 'siparis', durum: 'planlandi' }, // işleme alındı, kargoya verileceği gün belli
  { kod: 'D25', tur: 'siparis', durum: 'kapandi' }, // tamamı gönderildi, bakiyeden düşüldü
  { kod: 'D26', tur: 'siparis', durum: 'kapandi' }, // bir kısmı gönderildi, kalanı bekliyor
  { kod: 'D27', tur: 'siparis', durum: 'kapandi' }, // iki gönderim ve bir iptal edilen kalem
  { kod: 'D28', tur: 'siparis', durum: 'iptal' }, // gönderildikten sonra iptal, tutar bakiyeye döndü
  { kod: 'D29', tur: 'siparis', durum: 'iptal' }, // servis kendisi iptal etti
  { kod: 'D30', tur: 'siparis', durum: 'kapandi' }, // eski, faturalı, eski indirim oranıyla
  /* Başka servisin işi: N1'in öteki makinesi (Kayıt Aç'ta "açık iş") */
  { kod: 'N1A', tur: 'servis', durum: 'yeni', servis: 'ankara-servis' },
]

/* --------------------------------------------------------- Sabit metinler

   Hepsi uygulamanın kendi listelerinde duran, Codex'ten geçmiş değerler;
   gerçek formun yazacağı değer yazılıyor. Yeni cümleler (düzeltme
   gerekçeleri, müşterinin yazdıkları, adres adları) 29 Eylül 2026'da
   Codex'ten geçti. */

/* Connect'in talep formu Destek'ten gelen talepte açıklamayı iki satırla
   açıyor: tr.js → talep.destektenGeldi ve talep.destekteDenenen. Belirti
   ve nedenler Destek'in arıza rehberinden (data/icerik/destekVerisi.js,
   balya → ip-kopuyor). */
const DESTEKTEN_ACIKLAMA =
  'Destek ekranında şu arıza üzerinde konuşuldu: İp sürekli kopuyor\n' +
  'Kontrol edilen nedenler: İp bir yere sürtüyor; İp gerginliği fazla'

const METIN = {
  /* PAKSAN'ın servise notları ve servisin kendi notu (eski
     SAHNE_GOREVLERI'nden). */
  serviseNot: 'Müşteri sabah dokuzdan önce aranmak istiyor.',
  kargoNotu: 'Parça kargoya verildi. Takip numarası gelince buraya yazacağız.',
  servistenNot: 'Müşteriye sezon sonu bakımı hatırlatıldı.',
  /* Codex, 29 Eylül 2026 */
  yolDuzeltme: 'Müşterinin köyü servise 60 km uzaklıkta. Gidiş dönüş 120 km olarak düzeltildi.',
  sureDuzeltme: 'Parça değişimi için iki saat yeterli, işçilik süresi buna göre düzeltildi.',
  sorunDevamIp: 'Ayardan sonra bir hafta düzgün çalıştı, şimdi yine ip kopuyor.',
  sorunDevamSaft: 'Titreşim geri geldi, şaftın yanından tıkırtı sesi de geliyor.',
  paksanKapanis: 'Hidrolik hortum değiştirildi, bağlantılar kontrol edildi, yağ kaçağı kalmadı.',
  iptalAciklama: 'Balya sıkıştırma ayarını telefonda birlikte yaptık, makine düzgün çalışıyor.',
  ekleme: 'Balya odasının altından yağ damlıyor, fotoğrafını ekledim.',
  adresDepo: 'Depo',
  adresAtolye: 'Karatay Atölyesi',
  /* Backoffice'in iptal formlarındaki değerler (ekranlar/Talepler.jsx →
     IPTAL_SEBEPLERI, SIPARIS_IPTAL_SEBEPLERI, KALAN_IPTAL_SEBEPLERI). */
  iptalNedeni: 'Sorun telefonda çözüldü',
  siparisIade: 'Parçalar iade alındı',
  kalanIptal: 'Parça temin edilemiyor',
  /* Hesap ekranındaki ödeme satırı (eski demoServis.js → odemeUret). */
  odeme: 'Havale ile ödendi',
}

/* Kargo firması ve takip numarası: firma adları demonun kendi listesinden
   (demoServis.js, demo.js → KARGO), numaralar sabit. */
const KARGO = {
  aras: 'Aras Kargo',
  yurtici: 'Yurtiçi Kargo',
  mng: 'MNG Kargo',
}

/* Servise özel ücretin yazıldığı model: K1'in ilk makinesi. İşçilik 90
   TL/saat (ekran görüntüsü aracının tohumuyla aynı değer). */
const OZEL_UCRETLI_MODEL = 'orkinos-1270'
const OZEL_SAAT_UCRETI = 90
const SERVIS_INDIRIMI = 35
const BAKIYE_EK_INDIRIMI = 3

/* ------------------------------------------------------------ Yardımcılar */

/**
 * `fn`'i verilen anda çalıştırır: Date.now() ve argümansız new Date() o anı
 * veriyor (her çağrıda bir milisaniye ilerleyerek, sıra bozulmasın). O
 * sırada geçerli Date sarılıyor, bitince yerine konuyor; ekosistem
 * sınamasının donmuş saati de böyle korunuyor. Yalnız eşzamanlı işler için:
 * `fn` bir söz (Promise) döndürürse saat beklemeden geri alınmış olur.
 */
export function anda(zaman, fn) {
  const Onceki = globalThis.Date
  let adim = 0
  const an = () => zaman + adim++
  class AnDate extends Onceki {
    constructor(...arg) {
      if (arg.length === 0) super(an())
      else super(...arg)
    }

    static now() {
      return an()
    }
  }
  globalThis.Date = AnDate
  try {
    return fn()
  } finally {
    globalThis.Date = Onceki
  }
}

/* Makinenin takvimi, rastgelesiz: üretim o yılın şubatında (en geç 150
   gün önce), fatura bir ay sonra, kayıt faturadan 45 gün sonra ama en geç
   46 gün önce — sahnenin en eski işi 31 gün önce açılıyor ve talep
   makineden önce açılamaz (demo.js → makineTakvimi ile aynı sınırlar). */
function sabitTakvim(yas, simdi) {
  const sonUretim = simdi - 150 * GUN
  let yil = new Date(simdi).getFullYear() - yas
  if (new Date(yil, 0, 1).getTime() > sonUretim) yil = new Date(sonUretim).getFullYear()
  const uretim = Math.min(new Date(yil, 1, 10).getTime(), sonUretim)
  const fatura = uretim + 30 * GUN
  const kayit = Math.max(fatura, Math.min(fatura + 45 * GUN, simdi - 46 * GUN))
  return { yil, uretim, fatura, kayit }
}

/**
 * Sabit müşteriler, makineleri ve makine defterindeki satırları.
 * demo.js müşteri listesinin başına koyuyor.
 */
export function sahneMusterileriKur(simdi = Date.now()) {
  const musteriler = []
  const defter = []
  for (const s of SAHNE_MUSTERILERI) {
    const takvimler = []
    const makineler = s.makineler.map((x) => {
      const urun = getProduct(x.urun)
      const t = sabitTakvim(x.yas, simdi)
      takvimler.push(t)
      return {
        id: uid(),
        productId: urun.id,
        serial: `${normalizeSerial(urun.serialPrefix)}${t.yil}${x.sira}`,
        year: t.yil,
        nickname: '',
        addedAt: t.kayit,
        hours: x.saat || 0,
        doneMaintenance: [],
      }
    })
    const bayi = s.bayi === null ? null : BAYILER.find((b) => b.id === (s.bayi || 'konya-merkez')) || null
    const servisId = s.servis === null || s.bayidenServis ? null : s.servis || DEMO_SERVIS
    const servis = SERVISLER.find((x) => x.id === servisId) || null
    const createdAt = Math.min(simdi - 400 * GUN, ...makineler.map((mk) => mk.addedAt))
    const m = {
      id: uid(),
      no: yeniNo('musteri'),
      createdAt,
      ad: s.ad,
      ulke: 'TR',
      tel: s.tel,
      konumUlke: 'TR',
      il: s.il,
      ilce: s.ilce,
      adres: s.adres,
      satici: bayi?.ad || '',
      onaylar: { aydinlatma: true, acikRiza: true, kampanya: true, surum: '1.0', tarih: createdAt },
      bildirim: { izin: BILDIRIM_IZNI },
      makineler,
      demo: true,
      demoSahne: s.kod,
    }
    musteriler.push(m)
    makineler.forEach((mk, j) => {
      const t = takvimler[j]
      defter.push({
        id: uid(),
        tarih: mk.addedAt,
        seri: mk.serial,
        productId: mk.productId,
        musteriId: m.id,
        musteriNo: m.no,
        musteriAd: m.ad,
        il: m.il,
        ilce: m.ilce,
        bayiId: bayi?.id || null,
        bayiAd: bayi?.ad || '',
        servisId: servis?.id || null,
        servisAd: servis?.ad || '',
        uretimTarihi: bayi ? t.uretim : null,
        faturaTarihi: bayi ? t.fatura : null,
        logoBildi: Boolean(bayi),
        yeniSatis: Boolean(bayi) && (t.kayit - t.fatura) / GUN <= LOGO.yeniSatisGun,
        kaynak: 'musteri',
        demo: true,
      })
    })
  }
  return { musteriler, defter }
}

/* Servisim'in "sesli not"u: üç saniyelik alçak bir makine uğultusu
   (8 kHz, 8 bit WAV). Gerçek kayıt gibi talebin içinde veri adresi olarak
   duruyor ve oynatılabiliyor; 32 KB. */
function sesliNot(saniye = 3) {
  const oran = 8000
  const n = oran * saniye
  const veri = new Uint8Array(44 + n)
  const v = new DataView(veri.buffer)
  const yazi = (i, s) => {
    for (let k = 0; k < s.length; k++) veri[i + k] = s.charCodeAt(k)
  }
  yazi(0, 'RIFF')
  v.setUint32(4, 36 + n, true)
  yazi(8, 'WAVE')
  yazi(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, oran, true)
  v.setUint32(28, oran, true)
  v.setUint16(32, 1, true)
  v.setUint16(34, 8, true)
  yazi(36, 'data')
  v.setUint32(40, n, true)
  for (let i = 0; i < n; i++) {
    const t = i / oran
    const zarf = Math.min(1, t * 4, (saniye - t) * 4)
    const tik = 1 + 0.35 * Math.sin(2 * Math.PI * 3 * t)
    veri[44 + i] = 128 + Math.round(zarf * 24 * tik * Math.sin(2 * Math.PI * 110 * t))
  }
  let ikili = ''
  for (let i = 0; i < veri.length; i += 0x8000) ikili += String.fromCharCode(...veri.subarray(i, i + 0x8000))
  return { veri: 'data:audio/wav;base64,' + btoa(ikili), sure: saniye }
}

/* Tarihli (saatli) plan: backoffice'in planlama formunun yazdığı biçim
   (ekranlar/Talepler.jsx → PlanFormu). */
function saatliPlan(zaman, is, gorusuldu) {
  const d = new Date(zaman)
  return {
    gorusuldu,
    saatBelirtildi: true,
    tarih: d.getTime(),
    tarihYazi: d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    is,
  }
}

/* Parçanın ekrandaki satırı (backoffice kapanış formu → parcaYazisi). */
function parcaYazisi(talep) {
  return talebinParcalari(talep)
    .map((k) => (k.adet > 1 ? `${k.ad || '—'} × ${k.adet}` : k.ad || '—'))
    .join(' · ')
}

/* ==========================================================================
   Sahneyi kurar

   demo.js çağırıyor: sabit müşteriler ve makine defteri demo deposuna
   yazıldıktan SONRA (talebin servisi defterden çıkıyor).

   @param {object} a
   @param {object} a.katalog      parça kataloğu
   @param {string[]} a.personel   demo personelinin adları (PAKSAN'ın adımları)
   @param {function} a.tekilNo    demo.js'in tekil talep numarası
   @param {function} a.fotoUret   demo.js'in fotoğraf eki üreticisi (async)
   @param {{musteriyeNot: string, gonderimIsi: string}} a.metinler
          demo.js'in kendi listelerinden iki değer (NOTLAR, PARCA_PLAN_IS)
   @returns {Promise<{talep: number}>}
   ========================================================================== */
export async function sahneKur({ katalog, personel, tekilNo, fotoUret, metinler }) {
  const servis = SERVISLER.find((x) => x.id === DEMO_SERVIS)
  if (!servis) return { talep: 0 }
  const simdi = Date.now()
  const oturum = { servisId: servis.id, ad: servis.ad }
  const [pServis, pParca] = [personel[0] || '—', personel[1] || personel[0] || '—']
  const musteriler = load(ANAHTAR.demoMusteriler, [])
  const musteri = (kod) => musteriler.find((m) => m.demoSahne === kod)

  /* Fotoğraflar önce: tuval ve IndexedDB beklemeli, saat geri alınmışken
     beklenemez. Node'da (sınama) tuval yok; talep fotoğrafsız kuruluyor. */
  const foto = async (yazi) => {
    try {
      return await fotoUret(yazi)
    } catch {
      return null
    }
  }
  const d01Foto = (await Promise.all(['Düğüm atıcı', 'Seri numarası plakası'].map(foto))).filter(Boolean)
  const d02Foto = (await Promise.all(['Balya odası'].map(foto))).filter(Boolean)

  /* ---- Kayıt yardımcıları */

  const kimlik = {}
  const bul = (kod) => load(ANAHTAR.demoTalepler, []).find((t) => t.id === kimlik[kod]) || null

  function talebiKoy(kod, kayit) {
    const t = { ...kayit, no: tekilNo(kayit.tur), demo: true, demoSahne: kod }
    save(ANAHTAR.demoTalepler, [t, ...load(ANAHTAR.demoTalepler, [])])
    kimlik[kod] = t.id
    return t
  }

  /* Connect'in yamasının aynısı (screens/RequestDetail.jsx →
     updateRequest); talep demo deposunda. */
  function yamala(kod, yama) {
    save(
      ANAHTAR.demoTalepler,
      load(ANAHTAR.demoTalepler, []).map((t) => (t.id === kimlik[kod] ? { ...t, ...yama } : t)),
    )
  }

  /* Connect'ten açılan servis talebi: talep formunun gönderdiği alanlar
     (screens/RequestForm.jsx) ve Connect'in kaydı (talepKaydiOlustur). */
  function connectTalebi(kod, mKod, sira, vaka, ek = {}) {
    const m = musteri(mKod)
    const mk = m?.makineler[sira]
    if (!mk) return null
    const data = {
      tur: 'servis',
      aciklama: ek.aciklama ?? vaka.aciklama,
      ses: ek.ses || null,
      ekler: ek.ekler || [],
      makine: { id: mk.id, serial: mk.serial, productId: mk.productId },
      urunId: null,
      durum: vaka.durum,
      belirtiler: [...vaka.belirtiler],
      parcalar: [],
      parcaAdet: null,
      parcaFiyat: null,
      fatura: null,
      dekont: null,
      urunTipi: '',
      arazi: '',
      traktor: '',
      ad: m.ad,
      tel: telKullanici(m),
      telUlke: m.ulke,
      telHam: m.tel,
      il: m.il,
      ilce: m.ilce,
      adres: m.adres,
    }
    return talebiKoy(kod, talepKaydiOlustur(data, m))
  }

  /* Servisim'in Kayıt Aç'ı (servis/ekranlar/ElleKayit.jsx). */
  function elleTalep(kod, form) {
    return talebiKoy(kod, elleTalepKaydiOlustur(form, oturum))
  }

  function kayitliMusteriFormu(mKod, sira, aciklama) {
    const m = musteri(mKod)
    const mk = m?.makineler[sira]
    if (!mk) return null
    const [adi, ...soy] = m.ad.split(' ')
    return {
      adi,
      soyadi: soy.join(' '),
      tel: m.tel,
      il: m.il,
      ilce: m.ilce,
      adres: m.adres,
      aciklama,
      makine: { id: mk.id, serial: mk.serial, productId: mk.productId },
      musteriId: m.id,
    }
  }

  /* Parça seçimi: vakanın gruplarında, bu makineye uyan en ucuz parçalar;
     aynı ad iki kez seçilmiyor. `adetler` her parçanın adedi. */
  function parcalarSec(t, vaka, adetler) {
    const havuz = vakaHavuzu(katalog, t.makine.productId, vaka)
      .filter((p) => Number.isFinite(p.fiyat) && p.fiyat > 0)
      .sort((a, b) => a.fiyat - b.fiyat || String(a.kod).localeCompare(String(b.kod)))
    const secilen = []
    for (const p of havuz) {
      if (secilen.length >= adetler.length) break
      if (!secilen.some((s) => s.ad === p.ad)) secilen.push(p)
    }
    return secilen.map((p, i) => ({ kod: p.kod, ad: p.ad, fiyat: p.fiyat, gorsel: p.gorsel ?? null, adet: adetler[i] }))
  }

  /* Servis kaydının ortak alanları: Servisim'in kayıt ekranı müşteri ve
     makine bilgisini talepten doldurup gönderiyor
     (servis/ekranlar/ServisKapanisi.jsx → gonder). */
  function kayitGovdesi(t) {
    return {
      musteri: { ad: t.ad, tel: t.telHam, adres: t.adres },
      makine: t.makine?.serial ? { serial: t.makine.serial, productId: t.makine.productId } : null,
    }
  }

  /* 1. aşama: parça isteği; yol ve işçilik sorulmuyor. */
  function parcaIste(kod, vaka, adetler, teslimat) {
    const t = bul(kod)
    if (!t) return null
    const parcalar = parcalarSec(t, vaka, adetler)
    if (!parcalar.length) return { hata: 'makineye uyan parça bulunamadı' }
    const tarife = servisinTarifesi(servis.id, t.makine?.productId || null)
    return servisKaydiGonder(
      t,
      {
        asama: ASAMA.parca,
        kapi: 'garanti',
        yapilanIs: '',
        sonuc: tespitYazisi(parcalar),
        parcalar,
        foto: null,
        km: 0,
        kmUcreti: tarife.yolKm,
        ...iscilikAlanlari(0, tarife.iscilikSaat),
        ucretZamani: Date.now(),
        teslimat,
        ...kayitGovdesi(t),
        ariza: talepNedeni(t),
      },
      servis.ad,
    )
  }

  /* 2. aşama ya da parçasız biten iş: yapılan iş, yol ve işçilik süresi
     burada; ücret servisin ve makinenin o günkü tarifesinden. Parça
     isteğinin devamında ("Parçayı Taktım") parçalar ve arıza nedeni
     1. aşamadan geliyor. */
  function isBitti(kod, { yapilanIs, sonuc, km, saat }) {
    const t = bul(kod)
    if (!t) return null
    const onceki = buZiyaretinKaydi(t)
    const ikinci = onceki?.asama === ASAMA.parca
    const tarife = servisinTarifesi(servis.id, t.makine?.productId || null)
    return servisKaydiGonder(
      t,
      {
        asama: ASAMA.bitti,
        kapi: 'garanti',
        yapilanIs: ikinci ? 'Parça Değişti' : yapilanIs,
        sonuc: ikinci ? parcaliSonucYazisi(onceki.parcalar) : sonuc,
        parcalar: ikinci ? onceki.parcalar : [],
        foto: null,
        km,
        kmUcreti: tarife.yolKm,
        ...iscilikAlanlari(saat, tarife.iscilikSaat),
        ucretZamani: Date.now(),
        ...kayitGovdesi(t),
        ariza: ikinci ? onceki.ariza : talepNedeni(t),
      },
      servis.ad,
    )
  }

  /* Backoffice'in hak ediş düzeltme formu (ekranlar/Talepler.jsx →
     HakkedisFormu): kaydın kendi ücretiyle. */
  function duzelt(kod, { km, saat }, neden) {
    const t = bul(kod)
    const k = t?.servisKaydi
    if (!k) return null
    return hakkedisDuzelt(
      t,
      {
        ...k,
        km: km ?? k.km,
        ...iscilikAlanlari(saat ?? k.iscilikSaat, k.saatUcreti),
        parcalar: k.parcalar,
      },
      neden,
      pServis,
    )
  }

  /* Servisim'in randevusu: yalnız gün (lib/tarih.js → gunlukRandevu). */
  function randevu(kod, gun) {
    const t = bul(kod)
    if (!t) return null
    return talepPlanla(
      t,
      { ...gunlukRandevu(bugunGirdi(gun)), is: RANDEVU_ISI.servis, gorusuldu: true },
      servis.ad,
      { servisten: true },
    )
  }

  /* Connect'in "Sorun Devam Ediyor"u (screens/RequestDetail.jsx). */
  function sorunDevam(kod, aciklama) {
    const r = bul(kod)
    if (!r) return null
    const kayit = { tarih: Date.now(), aciklama }
    yamala(kod, {
      status: 'yeni',
      tekrar: [...(r.tekrar || []), kayit],
      gecmis: [...(r.gecmis || []), { durum: 'yeni', tarih: kayit.tarih }],
    })
    sorunDevaminiServiseBildir(r)
    return null
  }

  /* ---- Servisin parça siparişi: Servisim'in sipariş ekranının yolu
     (servis/ekranlar/SiparisVer.jsx → gonder), kayıt demo deposuna. */
  const siparisHavuzu = makineninParcaHavuzu(katalog, OZEL_UCRETLI_MODEL)
    .filter((p) => Number.isFinite(p.fiyat) && p.fiyat > 0)
    .sort((a, b) => a.fiyat - b.fiyat || String(a.kod).localeCompare(String(b.kod)))
    .filter((p, i, dizi) => dizi.findIndex((x) => x.ad === p.ad) === i)
  const siparisParcasi = (i) => siparisHavuzu[i % Math.max(1, siparisHavuzu.length)]

  const firmaTeslimat = () => adresTeslimata(firmaAdresi(servis.id))

  function siparisVer(kod, kalemler, odeme, teslimat = firmaTeslimat()) {
    const secim = kalemler
      .map(([i, adet]) => ({ p: siparisParcasi(i), adet }))
      .filter((x) => x.p)
      .map(({ p, adet }) => ({ kod: p.kod, adet, parca: parcaBul(katalog, p.kod) }))
    const oran = servisinIskontosu(servis.id).oran
    const satirlar = sepetSatirlari(secim, oran)
    const sepet = sepetToplami(satirlar)
    const kur = (odemeBicimi) => {
      const hesap = { ...sepet, ...siparisTutari(sepet.araToplam, { odeme: odemeBicimi, bakiyeOrani: bakiyeIskontosuGetir() }) }
      return servisSiparisKaydi({
        servisId: servis.id,
        servisAd: servis.ad,
        servisNo: servis.no,
        servisTel: servis.tel || '',
        il: servis.il || '',
        ilce: servis.ilce || '',
        kalemler: siparisKalemleri(satirlar),
        parcaFiyat: siparisGoruntusu({ katalog, satirlar, hesap, iskontoOrani: oran, fiyatZamani: Date.now() }),
        not: '',
        teslimat,
        odeme: odemeBicimi,
        tutar: hesap.araToplam,
        tutarKdvli: hesap.toplam,
      })
    }
    let sonuc = kur(odeme)
    /* Tarayıcıda gerçek siparişler bakiyeyi eritmişse bakiyeden ödeme
       reddediliyor (veri.js → bakiyeDurumu); sipariş faturayla veriliyor. */
    if (sonuc.bakiyeYetmiyor) {
      console.warn('demo sahnesi:', kod, 'bakiye yetmedi, faturayla verildi')
      sonuc = kur('fatura')
    }
    if (sonuc.hata) return sonuc
    return talebiKoy(kod, sonuc.talep)
  }

  function siparisKapat(kod, gonderilen) {
    const t = bul(kod)
    if (!t) return null
    const yapilanIs = parcaYazisi(t)
    return talepKapat(
      t,
      { yapilanIs, not: '', fis: null, ozet: yapilanIs, gonderilen: gonderilen ?? t.parcaFiyat.satirlar.map((_, i) => i) },
      pParca,
    )
  }

  const isleme = (kod) => {
    const t = bul(kod)
    return t ? talepDurumDegistir(t, 'incelemede', pParca) : null
  }

  /* ---- Ayarlar */

  const yedek = {}
  const onceDuyuru = new Set(load(ANAHTAR.duyurular, []).map((d) => d.id))
  let depoAdresi = null

  /* ==========================================================================
     ZAMAN ÇİZELGESİ — gün önce · ne oluyor
     ========================================================================== */
  const adimlar = []
  const adim = (gunOnce, ad, is) => adimlar.push({ zaman: simdi - Math.round(gunOnce * GUN), ad, is })

  const V = ARIZA_VAKALARI
  const [dugum, pikap, gevsek, saft, hidrolik] = V.balya
  const tarti = V.yem[0]
  const bicme = V.cayir.find((v) => v.urunler?.includes('yengec-cayir') && v.parca === 'olur') || V.genel[0]
  const tirmik = V.cayir.find((v) => v.urunler?.includes('kirlangic-ot-toplama')) || V.genel[0]
  const kurek = V.toprak.find((v) => v.urunler?.includes('tesviye-kuregi')) || V.genel[0]
  const ileri = (gunSonra, saat, dakika) => {
    const d = new Date(simdi + gunSonra * GUN)
    d.setHours(saat, dakika, 0, 0)
    return d.getTime()
  }

  /* Ayar 1 · bu servise Orkinos 1270'te özel işçilik ücreti. */
  adim(50, 'ücret', () => {
    const tarife = hizmetTarifesiGetir()
    const onceki = tarife.servisler[servis.id] || null
    if (onceki?.modeller?.[OZEL_UCRETLI_MODEL]) return null
    const sonuc = servisTarifesiniKaydet(
      servis.id,
      {
        yolKm: onceki?.yolKm,
        iscilikSaat: onceki?.iscilikSaat,
        modeller: { ...(onceki?.modeller || {}), [OZEL_UCRETLI_MODEL]: { iscilikSaat: OZEL_SAAT_UCRETI } },
      },
      pServis,
    )
    if (sonuc.bildirildi) yedek.tarife = { onceki, demo: hizmetTarifesiGetir().servisler[servis.id] || null }
    return sonuc
  })

  /* Servisim'in adres defteri: iki adres (Adreslerim). D13'ün parçası
     Depo'ya gidiyor. */
  adim(40, 'adresler', () => {
    const depo = adresEkle(servis.id, {
      baslik: METIN.adresDepo,
      alici: servis.ad,
      tel: servis.tel,
      il: 'Konya',
      ilce: 'Selçuklu',
      acikAdres: 'Horozluhan Mahallesi, Sanayi Sitesi 3. Blok No: 8',
    })
    const atolye = adresEkle(servis.id, {
      baslik: METIN.adresAtolye,
      alici: 'Mustafa Yılmaz',
      tel: '0332 350 00 27',
      il: 'Konya',
      ilce: 'Karatay',
      acikAdres: 'Fetih Mahallesi, 1. Sanayi Caddesi No: 27',
    })
    depoAdresi = depo.adres || null
    const demolar = new Set([depo.adres?.id, atolye.adres?.id].filter(Boolean))
    const hepsi = load('servisAdresleri', {})
    save('servisAdresleri', {
      ...hepsi,
      [servis.id]: (hepsi[servis.id] || []).map((a) => (demolar.has(a.id) ? { ...a, demo: true } : a)),
    })
    return null
  })

  /* D18 · yol düzeltildi, sonra onaylandı */
  adim(31, 'D18 talep', () => connectTalebi('D18', 'K4', 0, pikap))
  adim(30, 'D18 iş bitti', () => isBitti('D18', { ...pikap.parcasiz, km: 180, saat: 2.5 }))
  adim(29, 'D18 düzeltme', () => duzelt('D18', { km: 120 }, METIN.yolDuzeltme))
  adim(27, 'D18 onay', () => hakkedisOnayla(bul('D18'), pServis))

  /* D30 · eski, faturalı sipariş (servise özel indirimden önce) */
  adim(29.2, 'D30 sipariş', () => siparisVer('D30', [[11, 1], [12, 3]], 'fatura'))
  adim(28, 'D30 işleme', () => isleme('D30'))
  adim(27.3, 'D30 gönderildi', () => siparisKapat('D30'))

  /* D19 · kayıt reddedildi */
  adim(24, 'D19 talep', () => connectTalebi('D19', 'K5', 0, gevsek))
  adim(23, 'D19 iş bitti', () => isBitti('D19', { ...gevsek.parcasiz, km: 50, saat: 1.5 }))
  adim(21, 'D19 ret', () => hakkedisReddet(bul('D19'), RED_NEDEN[0], pServis))

  /* D15 · ilk ziyaret onaylandı; sorun devam etti, parçayla ikinci ziyaret,
     PAKSAN işçilik süresini düzeltti */
  adim(21.5, 'D15 talep', () => connectTalebi('D15', 'K8', 0, dugum))
  adim(20, 'D15 ilk ziyaret', () => isBitti('D15', { ...dugum.parcasiz, km: 70, saat: 2 }))
  adim(17.5, 'D15 ilk onay', () => hakkedisOnayla(bul('D15'), pServis))
  adim(6, 'D15 sorun devam', () => sorunDevam('D15', METIN.sorunDevamIp))
  adim(5, 'D15 parça isteği', () => parcaIste('D15', dugum, [2], firmaTeslimat()))
  adim(4, 'D15 parça gönderildi', () =>
    servisParcasiGonderildi(bul('D15'), { firma: KARGO.aras, takipNo: '4817305926' }, pServis))
  adim(2, 'D15 parça takıldı', () => isBitti('D15', { km: 70, saat: 3 }))
  adim(1, 'D15 düzeltme', () => duzelt('D15', { saat: 2 }, METIN.sureDuzeltme))

  /* D05 · onaylanmış işte "Sorun Devam Ediyor" */
  adim(19, 'D05 talep', () => connectTalebi('D05', 'K5', 0, saft))
  adim(18, 'D05 iş bitti', () => isBitti('D05', { ...saft.parcasiz, km: 64, saat: 2 }))
  adim(16, 'D05 onay', () => hakkedisOnayla(bul('D05'), pServis))
  adim(1.1, 'D05 sorun devam', () => sorunDevam('D05', METIN.sorunDevamSaft))

  /* Servise yapılmış ödeme: 18 günden eski onaylı sahne işlerinin toplamı
     (eski demoServis.js → odemeUret). Hesapta artı ve eksi satır görünsün. */
  adim(18, 'ödeme', () => {
    const sahne = new Set(Object.values(kimlik))
    const tutar = cariHareketleri(servis.id)
      .filter((h) => h.tur === 'alacak' && sahne.has(h.talepId))
      .reduce((top, h) => top + (Number(h.tutar) || 0), 0)
    if (!tutar) return null
    cariHareketEkle({
      servisId: servis.id,
      servisAd: servis.ad,
      tur: 'borc',
      tutar,
      aciklama: METIN.odeme,
      personel: pServis,
      demo: true,
    })
    return null
  })

  /* Ayar 2 · servise özel parça indirimi */
  adim(15, 'indirim', () => {
    const i = parcaIskontosuGetir()
    if (i.servisler[servis.id] !== undefined) return null
    const guncelleme = i.guncelleme || null
    const sonuc = servisIskontosunuKaydet(servis.id, SERVIS_INDIRIMI, pParca)
    if (!sonuc.hata) {
      yedek.iskonto = { onceki: null, demo: parcaIskontosuGetir().servisler[servis.id] }
      yedek.iskontoGuncelleme = { onceki: guncelleme }
    }
    return sonuc
  })

  /* D17 · parçalı iş onaylandı; servisin kendi notu */
  adim(14, 'D17 talep', () => connectTalebi('D17', 'K1', 0, pikap))
  adim(13.6, 'D17 randevu', () => randevu('D17', simdi - 13 * GUN))
  adim(13, 'D17 parça isteği', () => parcaIste('D17', pikap, [2], firmaTeslimat()))
  adim(12, 'D17 parça gönderildi', () =>
    servisParcasiGonderildi(bul('D17'), { firma: KARGO.yurtici, takipNo: '7304158862' }, pServis))
  adim(10, 'D17 parça takıldı', () => isBitti('D17', { km: 86, saat: 3.5 }))
  adim(9, 'D17 servisin notu', () => talepNotEkle(bul('D17'), METIN.servistenNot, servis.ad, { servisten: true }))
  adim(7, 'D17 onay', () => hakkedisOnayla(bul('D17'), pServis))

  /* D21 · servis destek istedi, PAKSAN kapattı */
  adim(14.5, 'D21 talep', () => connectTalebi('D21', 'K6', 0, hidrolik))
  adim(12.5, 'D21 destek', () => destekTalepEt(bul('D21'), DEVIR_NEDEN[1], servis.ad))
  adim(8, 'D21 kapanış', () =>
    talepKapat(
      bul('D21'),
      { yapilanIs: METIN.paksanKapanis, parcalar: '', ucret: '', not: '', fis: null, ozet: METIN.paksanKapanis },
      pServis,
    ))

  /* D20 · garantisi bitmiş makine, garanti dışı kapatıldı */
  adim(13.2, 'D20 talep', () => connectTalebi('D20', 'K3', 1, tirmik))
  adim(12.2, 'D20 garanti dışı', () =>
    talepKapat(bul('D20'), { ozet: GARANTI_DISI_OZET, garantiDisi: true }, servis.ad, { servisten: true }))

  /* D28 · gönderilmiş bakiye siparişi iptal edildi, tutar geri döndü */
  adim(13, 'D28 sipariş', () => siparisVer('D28', [[9, 2]], 'bakiye'))
  adim(12, 'D28 işleme', () => isleme('D28'))
  adim(11, 'D28 gönderildi', () => siparisKapat('D28'))
  adim(6, 'D28 iptal', () => talepIptal(bul('D28'), { neden: METIN.siparisIade, aciklama: '' }, pParca))

  /* D22 · PAKSAN açıklamayla iptal etti */
  adim(11, 'D22 talep', () => connectTalebi('D22', 'K7', 1, gevsek))
  adim(10, 'D22 iptal', () =>
    talepIptal(bul('D22'), { neden: METIN.iptalNedeni, aciklama: METIN.iptalAciklama }, pServis))

  /* D27 · üç kalem: biri gönderildi, biri sonra gönderildi, biri iptal */
  adim(11.2, 'D27 sipariş', () => siparisVer('D27', [[6, 1], [7, 2], [8, 1]], 'bakiye'))
  adim(10.5, 'D27 işleme', () => isleme('D27'))
  adim(8, 'D27 kısmi gönderim', () => siparisKapat('D27', [0]))
  adim(5.2, 'D27 kalan gönderildi', () => kalanParcalariGonder(bul('D27'), [1], pParca))
  adim(4.2, 'D27 kalan iptal', () => kalanParcalariIptalEt(bul('D27'), [2], { neden: METIN.kalanIptal }, pParca))

  /* D25 · tamamı gönderildi, bakiyeden düşüldü */
  adim(10, 'D25 sipariş', () => siparisVer('D25', [[3, 2]], 'bakiye'))
  adim(9.5, 'D25 işleme', () => isleme('D25'))
  adim(9, 'D25 gönderildi', () => siparisKapat('D25'))

  /* D14 · parçalı iş bitti, onay bekliyor */
  adim(8, 'D14 talep', () => connectTalebi('D14', 'K7', 0, gevsek))
  adim(7, 'D14 parça isteği', () => parcaIste('D14', gevsek, [1, 1], firmaTeslimat()))
  adim(6, 'D14 parça gönderildi', () =>
    servisParcasiGonderildi(bul('D14'), { firma: KARGO.mng, takipNo: '5520187341' }, pServis))
  adim(3, 'D14 parça takıldı', () => isBitti('D14', { km: 45, saat: 2.5 }))

  /* D29 · servis kendi siparişini iptal etti */
  adim(7.2, 'D29 sipariş', () => siparisVer('D29', [[10, 1]], 'fatura'))
  adim(7, 'D29 servis iptali', () => servisSiparisiniIptalEt(bul('D29'), servis.ad))

  /* Ayar 3 · bakiyeden ödemede ek indirim (bütün servislere) */
  adim(5, 'ek indirim', () => {
    if (bakiyeIskontosuGetir() > 0) return null
    const guncelleme = parcaIskontosuGetir().guncelleme || null
    const sonuc = bakiyeIskontosunuKaydet(BAKIYE_EK_INDIRIMI, pParca)
    if (!sonuc.hata) {
      yedek.bakiye = { onceki: 0, demo: bakiyeIskontosuGetir() }
      if (!yedek.iskontoGuncelleme) yedek.iskontoGuncelleme = { onceki: guncelleme }
    }
    return sonuc
  })

  /* D13 · parça Depo adresine yolda; takip numarası sonradan */
  adim(5, 'D13 talep', () => connectTalebi('D13', 'K6', 0, saft))
  adim(4, 'D13 parça isteği', () =>
    parcaIste('D13', saft, [1], depoAdresi ? adresTeslimata(depoAdresi) : firmaTeslimat()))
  adim(2, 'D13 parça gönderildi', () => servisParcasiGonderildi(bul('D13'), { firma: KARGO.aras, takipNo: '' }, pServis))
  adim(1.9, 'D13 not', () => talepNotEkle(bul('D13'), METIN.kargoNotu, pServis, { servise: true }))
  adim(1, 'D13 takip numarası', () =>
    servisParcasiGonderildi(bul('D13'), { firma: KARGO.aras, takipNo: '4817399214' }, pServis))

  /* D26 · bir kısmı gönderildi, kalanı bekliyor (ek indirimli) */
  adim(4, 'D26 sipariş', () => siparisVer('D26', [[4, 1], [5, 2]], 'bakiye'))
  adim(3, 'D26 işleme', () => isleme('D26'))
  adim(2.1, 'D26 kısmi gönderim', () => siparisKapat('D26', [0]))

  /* D08 · randevu günü geçti */
  adim(4.1, 'D08 talep', () => connectTalebi('D08', 'K7', 1, pikap))
  adim(3, 'D08 randevu', () => randevu('D08', simdi - GUN))

  /* D11 · servis PAKSAN'dan destek istedi */
  adim(4, 'D11 talep', () => connectTalebi('D11', 'K2', 0, pikap))
  adim(3, 'D11 destek', () => destekTalepEt(bul('D11'), DEVIR_NEDEN[0], servis.ad))

  /* D16 · Kayıt Aç: makine başka servisin; iş bitti, onay bekliyor */
  adim(4.05, 'D16 kayıt aç', () => {
    const form = kayitliMusteriFormu('N1', 1, gevsek.aciklama)
    return form ? elleTalep('D16', form) : null
  })
  adim(3.9, 'D16 iş bitti', () => isBitti('D16', { ...gevsek.parcasiz, km: 0, saat: 1.5 }))

  /* D03 · yeni makinenin ilk kurulumu */
  adim(3.5, 'D03 talep', () => connectTalebi('D03', 'K3', 2, KURULUM_VAKASI))

  /* D04 · 48 saati geçti, PAKSAN servise not yazdı */
  adim(2.4, 'D04 talep', () => connectTalebi('D04', 'K2', 1, gevsek))
  adim(2.2, 'D04 not', () => talepNotEkle(bul('D04'), METIN.serviseNot, pServis, { servise: true }))

  /* D24 · sipariş işleme alındı, kargoya verileceği gün belli */
  adim(2.3, 'D24 sipariş', () => siparisVer('D24', [[1, 1], [2, 1]], 'fatura'))
  adim(2, 'D24 işleme', () => isleme('D24'))
  adim(1, 'D24 gönderim günü', () =>
    talepPlanla(bul('D24'), saatliPlan(ileri(1, 14, 0), metinler.gonderimIsi, false), pParca))

  /* D12 · parça istendi, hazırlanıyor */
  adim(2, 'D12 talep', () => connectTalebi('D12', 'K3', 0, dugum))
  adim(1, 'D12 parça isteği', () => parcaIste('D12', dugum, [1], firmaTeslimat()))

  /* D09 · randevu bugün; PAKSAN müşteriye not yazdı */
  adim(1.5, 'D09 talep', () => connectTalebi('D09', 'K8', 1, pikap))
  adim(1.2, 'D09 müşteriye not', () => talepNotEkle(bul('D09'), metinler.musteriyeNot, pServis, { musteriye: true }))
  adim(0.85, 'D09 randevu', () => randevu('D09', simdi))

  /* N1A · başka servisin açık işi (Kayıt Aç'ta N1'in ilk makinesi) */
  adim(1, 'N1A talep', () => connectTalebi('N1A', 'N1', 0, pikap))

  /* D02 · müşteri sonradan not ve fotoğraf ekledi */
  adim(1, 'D02 talep', () => connectTalebi('D02', 'K4', 0, gevsek))
  adim(0.13, 'D02 ekleme', () => {
    const r = bul('D02')
    const ekleme = eklemeOlustur({ not: METIN.ekleme, ses: null, ekler: d02Foto })
    if (!r || !ekleme) return null
    yamala('D02', { eklemeler: [...(r.eklemeler || []), ekleme] })
    eklemeyiServiseBildir(r)
    return null
  })

  /* D10 · Servis yarına randevu verdi (ileri tarihli; "Devam Eden"de
     bugünkülerin altında). Önce PAKSAN'ın verdiği saatli randevuydu;
     29 Eylül 2026'dan beri PAKSAN devredilmemiş işe randevu veremiyor
     (veri.js → paksanRandevuEngeli). */
  adim(0.33, 'D10 talep', () => connectTalebi('D10', 'K1', 1, tarti))
  adim(0.25, 'D10 randevu', () => randevu('D10', simdi + GUN))

  /* D07 · Kayıt Aç: kayıtlı olmayan kişi, seri numarası yok */
  adim(0.25, 'D07 kayıt aç', () =>
    elleTalep('D07', {
      ...KAYITSIZ,
      aciklama: kurek.aciklama,
      makine: {
        id: uid(),
        productId: 'tesviye-kuregi',
        seriYok: true,
        tahminiYil: new Date(simdi).getFullYear() - 6,
      },
      musteriId: null,
    }))

  /* D06 · Kayıt Aç: kayıtlı müşteri */
  adim(0.21, 'D06 kayıt aç', () => {
    const form = kayitliMusteriFormu('K6', 1, bicme.aciklama)
    return form ? elleTalep('D06', form) : null
  })

  /* D23 · bakiyeden, ek indirimli yeni sipariş */
  adim(0.12, 'D23 sipariş', () => siparisVer('D23', [[0, 2]], 'bakiye'))

  /* D01 · uygulamadan yeni iş: sesli not, fotoğraf, Destek'in kontrolleri */
  adim(0.083, 'D01 talep', () =>
    connectTalebi('D01', 'K1', 0, dugum, { aciklama: DESTEKTEN_ACIKLAMA, ses: sesliNot(3), ekler: d01Foto }))

  /* ---- Koşturma: tarih sırasıyla, her adım kendi gününde */
  adimlar.sort((a, b) => a.zaman - b.zaman)
  const islemOnce = load(ANAHTAR.islemKaydi, [])
  const islemOnceKimlik = new Set(islemOnce.map((k) => k.id))
  for (const a of adimlar) {
    try {
      const sonuc = anda(a.zaman, a.is)
      if (sonuc?.hata) console.warn('demo sahnesi:', a.ad, sonuc.hata)
    } catch (hata) {
      console.warn('demo sahnesi: adım yapılamadı', a.ad, hata)
    }
  }

  /* İşlem Kaydı kurulum öncesine (dosyanın başı). Sahnenin satırları
     geçmiş tarihli; aynı anda başka sekmede gerçekten yazılmış bir satır
     varsa şimdiki tarihli, o kalıyor. */
  save(
    ANAHTAR.islemKaydi,
    [
      ...load(ANAHTAR.islemKaydi, []).filter((k) => !islemOnceKimlik.has(k.id) && k.tarih >= simdi),
      ...islemOnce,
    ].slice(0, 500),
  )

  /* Talebe bağlı olmayan hesap bildirimleri (ücret ve indirim) demo
     damgası alıyor: talep kimliği taşımıyorlar. */
  save(
    ANAHTAR.duyurular,
    load(ANAHTAR.duyurular, []).map((d) =>
      d.tur === 'hesap' && !onceDuyuru.has(d.id) ? { ...d, demo: true } : d,
    ),
  )

  /* Bildirimlerin iki günden eskisi okunmuş; yenileri İşlerim'in üstünde
     ve Bildirimler'de okunmamış duruyor. */
  okunduSay(
    servisBildirimleri(servis.id)
      .filter((b) => simdi - b.tarih > 2 * GUN)
      .map((b) => b.id),
  )

  if (Object.keys(yedek).length) {
    const iskonto = parcaIskontosuGetir()
    if (yedek.iskontoGuncelleme) yedek.iskontoGuncelleme.demo = iskonto.guncelleme || null
    save(AYAR_YEDEGI, { ...yedek, ...load(AYAR_YEDEGI, {}) })
  }

  return { talep: Object.keys(kimlik).length }
}

/* ==========================================================================
   Demo temizlenirken sahnenin cihazdaki izleri ve ayarlar

   demo.js → demoTemizle çağırıyor (talepler, bildirimler ve hesap
   hareketleri orada siliniyor).

   AYARLAR PERSONEL DEĞİŞTİRMEDİYSE GERİ DÖNÜYOR. Ayar hâlâ demonun
   yazdığı değerdeyse önceki hâline dönüyor; personel o arada değiştirdiyse
   onun değeri kalıyor. Yazım doğrudan: veri.js'in kaydetme işlevleri
   servislere "ücretiniz değişti" bildirimi yazardı.
   ========================================================================== */
export function sahneIzleriniTemizle() {
  const ayni = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  const yedek = load(AYAR_YEDEGI, null)
  if (yedek) {
    const icerik = load(ANAHTAR.icerik, {})
    let degisti = false
    const tarife = icerik.hizmetTarifesi
    if (yedek.tarife && tarife && ayni(tarife.servisler?.[DEMO_SERVIS], yedek.tarife.demo)) {
      const servisler = { ...(tarife.servisler || {}) }
      if (yedek.tarife.onceki) servisler[DEMO_SERVIS] = yedek.tarife.onceki
      else delete servisler[DEMO_SERVIS]
      icerik.hizmetTarifesi = { ...tarife, servisler }
      degisti = true
    }
    const iskonto = icerik.parcaIskontosu
    if (iskonto) {
      const yeni = { ...iskonto, servisler: { ...(iskonto.servisler || {}) } }
      if (yedek.iskonto && ayni(yeni.servisler[DEMO_SERVIS], yedek.iskonto.demo)) {
        delete yeni.servisler[DEMO_SERVIS]
        degisti = true
      }
      if (yedek.bakiye && ayni(yeni.bakiye, yedek.bakiye.demo)) {
        yeni.bakiye = yedek.bakiye.onceki
        degisti = true
      }
      if (yedek.iskontoGuncelleme && ayni(yeni.guncelleme, yedek.iskontoGuncelleme.demo)) {
        if (yedek.iskontoGuncelleme.onceki) yeni.guncelleme = yedek.iskontoGuncelleme.onceki
        else delete yeni.guncelleme
        degisti = true
      }
      icerik.parcaIskontosu = yeni
    }
    if (degisti) {
      save(ANAHTAR.icerik, icerik)
      icerikTazele()
    }
  }

  /* Servisim'in adres defterindeki demo adresleri. */
  const adresler = load('servisAdresleri', null)
  if (adresler && typeof adresler === 'object') {
    save(
      'servisAdresleri',
      Object.fromEntries(
        Object.entries(adresler).map(([id, liste]) => [id, Array.isArray(liste) ? liste.filter((a) => !a.demo) : liste]),
      ),
    )
  }
  return Boolean(yedek)
}
