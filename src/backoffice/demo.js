/* ==========================================================================
   Demo verisi

   Backoffice boşken nasıl çalıştığı anlaşılmıyor: tablolar boş, süzgeçlerin
   ne yaptığı görünmüyor, rollerin farkı belli olmuyor. Bu dosya backoffice’e
   uydurma ama tutarlı bir veri seti yüklüyor.

   Demo kayıtları uygulamanın kendi kayıtlarından AYRI depolarda duruyor
   (`demoMusteriler`, `demoTalepler`). Böylece backoffice’te görünüyorlar ama
   müşterinin telefonundaki listeye karışmıyorlar. "Demo verisini
   temizle" dendiğinde gerçek kayıtlara dokunulmadan siliniyorlar.

   Yayına çıkarken bu dosyanın çağrıldığı düğme kaldırılmalı
   (bkz. PRODA-CIKIS.md).

   DEMO KAYDI GERÇEK AKIŞIN YAZACAĞI KAYDIN AYNISI (25 Eylül 2026,
   kullanıcı sınaması). Arıza, belirti, parça, not ve garanti makineye
   bakmadan ayrı ayrı rastgele çekiliyordu: rotovatörde "düğüm atmıyor",
   garantisi bitmiş makinede garanti kaydı, Süper 8002E'de Yunus parçası.
   Seçim sırası artık senaryo → senaryonun makineden istediği → makine →
   makineye uyan arıza vakası → parçalar → notlar (bkz.
   demoMakineAilesi.js). Makinenin yılı, üretim ve fatura tarihi ile
   kayıt günü seri numarasından çıkan tek takvimden. Telefon ve müşteri
   kimliği Connect'in yazdığı biçimde (lib/tel.js), Servisim'in randevusu
   yalnız gün, elle açılan işte `atamaDisi` (bkz. demoServis.js).

   SERVİSİM'İN SAHNESİ AYRI VE SABİT (29 Eylül 2026, kullanıcının
   isteği: "uygulamada mümkün olduğunca her yere girilsin"). Servisim'in
   demo hesabının servisi (Selçuk Tarım Servisi) ve müşterileri artık
   rastgele değil: on sabit müşteri listenin başında, işleri gerçek
   işlevlerden geçerek geçmiş tarihlerle kuruluyor (bkz. demoSahne.js).
   Bu dosyanın rastgele üreticisi geri kalan müşterileri ve öteki
   servislerin işlerini kuruyor; sabit müşterilere dokunmuyor.
   ========================================================================== */

import { load, remove, save, uid } from '../lib/storage'
import { ekYaz } from '../lib/ekler'
import { sifreHazirla } from '../lib/hesap'
import { yeniNo } from '../lib/numara'
import { talepNo } from '../lib/talep'
import { normalizeSerial } from '../lib/serial'
import { telAnahtar, telGoster, telHamYap } from '../lib/tel'
import { LOGO } from '../lib/logo'
import { ANAHTAR, islemYaz, personelGetir, rolleriGetir } from './veri'
import { PRODUCTS, SIRKET } from '../marka'
import { SERVISLER, BAYILER } from '../marka'
import { makineninServisi } from '../lib/servisAtama'
import { fiyatGoruntusu } from '../lib/parcaKatalogu'
import { DEMO_SERVIS, parcaKaynagi, parcaSecimi, senaryoSec, servisAkisi } from './demoServis'
import {
  AYAR_YEDEGI,
  SABIT_MUSTERI,
  sahneIzleriniTemizle,
  sahneKur,
  sahneMusterileriKur,
} from './demoSahne'
import { duyuruGorulduSay, GORULEN_DUYURU } from '../servis/talepBildirimleri'
import {
  destekSorusu,
  garantideMi,
  makineninParcaHavuzu,
  makineUyar,
  senaryoIhtiyaci,
  vakaHavuzu,
  vakaSec,
} from './demoMakineAilesi'

/* ------------------------------------------------------------ Malzemeler */

const ADLAR = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Ali', 'Osman',
  'Yusuf', 'Ramazan', 'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif',
  'Recep', 'Kemal', 'Süleyman', 'Halil', 'Bekir', 'Şaban', 'Cemal', 'Nuri',
]

const SOYADLAR = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk',
  'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara',
  'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Korkmaz', 'Bulut', 'Erdoğan',
]

/* Servis talebinin adresi bunlardan kuruluyor. Adres tarifi çiftçinin
   yazacağı gibi: köy adı ve bir işaret noktası.

   KÖY GERÇEKTEN O İLÇEDE (29 Eylül 2026). Köy, müşterinin ilçesinden
   bağımsız 12 Konya köyünden rastgele seçiliyordu ("Bandırma,
   Alibeyhüyüğü köyü"; Alibeyhüyüğü Çumra'da); aynı müşterinin her
   talebinde başka köy çıkıyordu. Servisim'deki "Yol Tarifi" adresi
   haritada açınca demo yanlış yeri gösterirdi. Her ilçenin köyleri
   gerçek (Vikipedi'deki ilçe sayfalarının kırsal mahalle ve köy
   listeleri, 29 Eylül 2026). Büyükşehir illerinde köyler 2012'den beri
   mahalle; Aksaray, Edirne ve Sivas'ta hâlâ köy. Köy müşteri başına
   bir kez seçiliyor ve müşterinin adresi oluyor; Servisim'in Kayıt Aç
   ekranı da onu dolduruyor. */
const KOYLER = {
  'Konya|Selçuklu': [['Tatköy', 'mahalle'], ['Hocacihan', 'mahalle'], ['Başarakavak', 'mahalle']],
  'Konya|Çumra': [['Alibeyhüyüğü', 'mahalle'], ['Karkın', 'mahalle'], ['Türkmenkarahüyük', 'mahalle']],
  'Konya|Karatay': [['İsmil', 'mahalle'], ['Divanlar', 'mahalle'], ['Yarma', 'mahalle']],
  'Konya|Meram': [['Dedemli', 'mahalle'], ['Hatunsaray', 'mahalle'], ['Karadiğin', 'mahalle']],
  'Konya|Ereğli': [['Akhüyük', 'mahalle'], ['Alhan', 'mahalle'], ['Kutören', 'mahalle']],
  'Konya|Cihanbeyli': [['Büyükbeşkavak', 'mahalle'], ['Taşpınar', 'mahalle'], ['Kuşça', 'mahalle']],
  'Konya|Sarayönü': [['Ladik', 'mahalle'], ['Başhüyük', 'mahalle'], ['Gözlü', 'mahalle']],
  'Konya|Kulu': [['Kozanlı', 'mahalle'], ['Tavlıören', 'mahalle'], ['Burunağıl', 'mahalle']],
  'Aksaray|Merkez': [['Doğantarla', 'köy'], ['Darıhüyük', 'köy'], ['Yenipınar', 'köy']],
  'Ankara|Polatlı': [['Yassıhüyük', 'mahalle'], ['Sabanca', 'mahalle'], ['Beylikköprü', 'mahalle']],
  'Eskişehir|Alpu': [['Büğdüz', 'mahalle'], ['Gökçekaya', 'mahalle'], ['Sarıkavak', 'mahalle']],
  'Balıkesir|Bandırma': [['Aksakal', 'mahalle'], ['Ergili', 'mahalle'], ['Doğanpınar', 'mahalle']],
  'Bursa|Karacabey': [['Uluabat', 'mahalle'], ['Ekinli', 'mahalle'], ['Yenisarıbey', 'mahalle']],
  'İzmir|Torbalı': [['Karakızlar', 'mahalle'], ['Pamukyazı', 'mahalle'], ['Çapak', 'mahalle']],
  'Manisa|Salihli': [['Yeşilkavak', 'mahalle'], ['Kemerköy', 'mahalle'], ['Mersinli', 'mahalle']],
  'Aydın|Söke': [['Sarıkemer', 'mahalle'], ['Tuzburgazı', 'mahalle'], ['Özbaşı', 'mahalle']],
  'Antalya|Korkuteli': [['Yazır', 'mahalle'], ['Küçükköy', 'mahalle'], ['Kargın', 'mahalle']],
  'Adana|Ceyhan': [['Tatarlı', 'mahalle'], ['İncetarla', 'mahalle'], ['Dikilitaş', 'mahalle']],
  'Şanlıurfa|Viranşehir': [['Altınbaşak', 'mahalle'], ['Çiftçiler', 'mahalle'], ['Ekinciler', 'mahalle']],
  'Diyarbakır|Bismil': [['Çeltikli', 'mahalle'], ['Ağıllı', 'mahalle'], ['Sarıköy', 'mahalle']],
  'Malatya|Battalgazi': [['Yarımcahan', 'mahalle'], ['Kuluşağı', 'mahalle'], ['Alhanuşağı', 'mahalle']],
  'Kayseri|Develi': [['Kulpak', 'mahalle'], ['Hüseyinli', 'mahalle'], ['Gömedi', 'mahalle']],
  'Samsun|Bafra': [['Doğanca', 'mahalle'], ['Karpuzlu', 'mahalle'], ['Sarıköy', 'mahalle']],
  'Tekirdağ|Malkara': [['Balabancık', 'mahalle'], ['Hasköy', 'mahalle'], ['Karaiğdemir', 'mahalle']],
  'Edirne|Uzunköprü': [['Kurtbey', 'köy'], ['Hamitli', 'köy'], ['Kırköy', 'köy']],
  'Sivas|Şarkışla': [['Sivrialan', 'köy'], ['Büyüktopaç', 'köy'], ['Alaman', 'köy']],
}

function koyAdresi(il, ilce) {
  const secenek = KOYLER[`${il}|${ilce}`]
  if (!secenek) return ''
  const [ad, tur] = sec(secenek)
  return `${ad} ${tur === 'köy' ? 'köyü' : 'Mahallesi'}, ${sec(TARIFLER)}`
}

const TARIFLER = [
  'kooperatifin arkası', 'cami karşısı', 'silonun yanı', 'köy girişi ilk sağ',
  'muhtarlığın karşısı', 'sulama kanalının kenarı', 'okulun arkası',
]

/* İl ve ilçeler servis listesindeki illerden seçiliyor ki harita ve
   "en yakın servis" sıralaması anlamlı çıksın. */
const YERLER = [
  ['Konya', 'Selçuklu'], ['Konya', 'Çumra'], ['Aksaray', 'Merkez'],
  ['Ankara', 'Polatlı'], ['Eskişehir', 'Alpu'], ['Balıkesir', 'Bandırma'],
  ['Bursa', 'Karacabey'], ['İzmir', 'Torbalı'], ['Manisa', 'Salihli'],
  ['Aydın', 'Söke'], ['Antalya', 'Korkuteli'], ['Adana', 'Ceyhan'],
  ['Şanlıurfa', 'Viranşehir'], ['Diyarbakır', 'Bismil'], ['Malatya', 'Battalgazi'],
  ['Kayseri', 'Develi'], ['Samsun', 'Bafra'], ['Tekirdağ', 'Malkara'],
  ['Edirne', 'Uzunköprü'], ['Sivas', 'Şarkışla'],
]

/* Servis talebinin belirtileri, açıklaması ve fotoğrafları makinenin
   ailesinden (bkz. demoMakineAilesi.js → ARIZA_VAKALARI). Belirti eskiden
   buradaki bir listedendi ve talep formunun değerleri değildi: raporun
   "En sık belirtiler" grafiği ve Connect'in çevirisi onları tanımıyordu. */

/* Müşterinin parça talebi kapanırken kargo bilgisi (veri.js → talepKapat,
   25 Eylül 2026'dan beri kapanışın içinde). */
const KARGO = ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo', 'Sürat Kargo']

/* Yedek parça kapanışındaki isteğe bağlı not — fazladan bir şey
   yapıldıysa yazılıyor. */
const PARCA_KAPANIS_NOTU = [
  'Stokta olmayan parça için bir gün beklendi, müşteri bilgilendirildi.',
  'Müşteri talebi üzerine iki parça aynı pakete konuldu.',
  'Kargo firması değiştirildi, teslimat bir gün öne alındı.',
  'Müşteriyle telefonda görüşüldü, adres teyit edildi.',
]

/* NOTLAR TALEBİN TÜRÜNDEN (25 Eylül 2026, kullanıcı sınaması). Her türe
   aynı listeden not düşüyordu: "Garanti kapsamında, ücret alınmayacak"
   parça ve teklif talebinde, garantisi bitmiş makinede; "Bölge servisi
   yönlendirildi" coğrafi atamanın kalıntısıydı (o atama kaldırıldı);
   "Servis ekibimiz…" ise servis ayrı bir şirket, PAKSAN'ın servis ekibi
   yok. İç not ekibin kendi arasında, müşteri notu telefona düşüyor. */
const NOTLAR = {
  servis: {
    ic: [
      'Müşteriye ulaşıldı, bu hafta içinde uygun olacak.',
      'Müşteri makinenin başında olmayacak, gitmeden önce aranmalı.',
    ],
    musteriye: [
      'Talebiniz alındı, en kısa sürede size dönüş yapacağız.',
      'Talebiniz servisinize iletildi, servisiniz sizi arayacak.',
    ],
  },
  parca: {
    ic: ['Parça stokta yok, tedarik ediliyor.', 'Müşteriyle telefonda görüşüldü, adres teyit edildi.'],
    musteriye: ['Talebiniz alındı, en kısa sürede size dönüş yapacağız.'],
  },
  satinalma: {
    ic: ['Müşteriye ulaşıldı, teklif için bilgi alındı.'],
    musteriye: ['Talebiniz alındı, en kısa sürede size dönüş yapacağız.'],
  },
}

/* Garanti notu yalnız garanti süresindeki makinenin servis talebine ve
   garanti dışı kapanmamış, reddedilmemiş işe düşüyor (bkz. notUret).
   "kapsamında" demiyor: servis ekranında o kelime geçmiyor. */
export const GARANTI_NOTU = 'Makine garanti süresi içinde.'

/* Ödemesi onaylanmış parça talebinde müşteriye giden not. */
const PARCA_HAZIR_NOTU = 'Parçanız hazırlandı, kargoya verilecek.'

/* Parça talebinin gönderim planındaki "Planlanan iş": servis işi değil,
   gönderim. Önce servis talebinin iş listesinden çekiliyordu. */
export const PARCA_PLAN_IS = [
  'Parçalar hazırlanıp kargoya verilecek.',
  'Eksik parça tamamlanınca kargoya verilecek.',
]

/* İptal nedeni. "Servise yönlendirildi" çıkarıldı: parça ve teklif
   talebine de yazılıyordu, oysa yedek parça talebi servise gitmez. */
const IPTAL_NEDEN = ['Müşteri vazgeçti', 'Ulaşılamadı', 'Yanlış talep']

/* Arıza fotoğrafının yanındaki ikinci fotoğraf: her makinede olan şey. */
const GENEL_FOTO = ['Seri numarası plakası', 'Makinenin genel görünümü']

const GUN = 86400000

const SATIS_SONUC = ['Satış oldu', 'Müşteri vazgeçti', 'Rakibe gitti', 'Ulaşılamadı']

const PARCA_ACIKLAMA = [
  'İki takım istiyorum, kargoyla gönderebilir misiniz?',
  'Bayiden bulamadım, sizden alabilir miyim?',
  'Fiyat ve stok durumunu öğrenmek istiyorum.',
  'Acele lazım, hasat sürüyor.',
]

const SATIS_ACIKLAMA = [
  'Fiyat bilgisi ve teslim süresi öğrenmek istiyorum.',
  'Traktörüme uygun modeli önerir misiniz?',
  'Kredi veya taksit imkânı var mı?',
  'Bu sezon almayı düşünüyorum.',
]

const GORUSLER = [
  'Uygulama güzel olmuş, talebi kolayca gönderdim.',
  'Bakım rehberi işime yaradı, teşekkürler.',
  'Yedek parça isimlerini bulmakta zorlandım.',
  'Bildirimlerin telefona da gelmesi iyi olur.',
  'Servis listesinde bize en yakın nokta yanlış görünüyor.',
]

/* Demo personelinin rolleri YÜRÜRLÜKTEKİ listeden alınıyor.

   Önceden sabit bir kimlik dizisiydi. Roller
   backoffice'ten silinebildiği için o kimlikler var olmayan rolleri
   gösterebiliyordu; demo yüklenince personel tanımsız bir rolde
   kalabiliyordu.

   Admin hariç: demo personeli admin yetkisiyle oluşturulmamalı. Admin
   rolü yoksa (silinemiyor ama) listenin tamamı kullanılıyor. */
function demoRolleri() {
  const liste = rolleriGetir()
  const adminsiz = liste.filter((r) => !r.sistem)
  return (adminsiz.length ? adminsiz : liste).map((r) => r.id)
}

/* Destek asistanına yazılan sorular makinenin ailesinden (bkz.
   demoMakineAilesi.js → destekSorusu): hepsi balya makinesi içindi ve
   herhangi bir makinenin kılavuzuna bağlanıyordu ("Rotovatör kılavuzu"). */

/* Beş alt türün hepsinden en az bir örnek var: ekranlar boş bir
   listeyle değil, gerçek çeşitlilikle deneniyor. Hedefi olanlar
   `hedef` taşıyor — geri çağırma yalnız servise gidiyor
   (bkz. src/data/duyuruTurleri.js).

   YAŞ SABİT, HEDEF SERVİSİM'E DE (29 Eylül 2026). `yas` duyurunun kaç
   gün önce yayınlandığı: Servisim'in Bildirimler ekranında "Bugün",
   "Dün" ve daha eski günler dolsun. Kampanya iki tarafa gidiyor
   (servis de görsün); bölge süzgeci iki uyarıda: Konya'ya giden sahne
   servisinde görünüyor, İzmir'e giden görünmüyor (lib/duyuruHedef.js).
   `servisteGorulmus` sahne servisinin "Anladım" dediği uyarı:
   İşlerim'deki "Uyarılar" katında duruyor. Kaydın alanı değil. */
const DUYURULAR = [
  {
    tur: 'duyuru',
    alt: 'kampanya',
    baslik: 'Sezon öncesi bakım kampanyası',
    gun: 30,
    yas: 1,
    metin: 'Nisan sonuna kadar yetkili servislerimizde sezon öncesi bakım işçiliğinde %20 indirim uygulanıyor. Randevu için servisinizle görüşebilirsiniz.',
    hedef: { kime: 'ikisi' },
  },
  {
    tur: 'duyuru',
    alt: 'yeniUrun',
    baslik: 'Orkinos 1290 satışa çıktı',
    gun: 45,
    yas: 10,
    metin: 'Orkinos serisinin yeni modeli Orkinos 1290 satışa sunuldu. Fiyat ve satın alma için bayinize, teknik bilgi ve servis desteği için yetkili servise başvurabilirsiniz.',
    hedef: { kime: 'ikisi' },
  },
  {
    tur: 'duyuru',
    alt: 'etkinlik',
    baslik: 'Konya Tarım Fuarı’nda sizi bekliyoruz',
    gun: 12,
    yas: 3,
    metin: 'Konya Tarım Fuarı’nda B salonundaki 214 numaralı standımızdayız. Bütün modellerimizi yerinde görebilir, ekibimizle görüşebilirsiniz.',
    hedef: { kime: 'ikisi' },
  },
  {
    tur: 'duyuru',
    alt: 'kampanya',
    baslik: 'Yeni yedek parça fiyat listesi',
    gun: 60,
    yas: 30,
    metin: '2026 yedek parça fiyat listesi yürürlüğe girdi. Güncel fiyatları uygulamadaki yedek parça talebi ekranından görebilirsiniz.',
  },
  {
    tur: 'uyari',
    alt: 'guvenlik',
    baslik: 'Kuyruk mili koruma kapağı kontrolü',
    metin: 'Kuyruk mili koruma kapağı hasarlıysa makineyi çalıştırmayın. Kapağı hasarlı müşterilerimiz, ücretsiz değişim için servislerine başvurabilir.',
    yas: 3,
    hedef: { kime: 'ikisi', iller: ['Konya'] },
    servisteGorulmus: true,
  },
  {
    tur: 'uyari',
    alt: 'guvenlik',
    baslik: 'Sıcak havada balya deposu kontrolü',
    metin: 'Yüksek sıcaklıkta nemli ot balyalandığında depoda yanma riski oluşur. Balya nemini kontrol etmeden depolamayın.',
    yas: 10,
    hedef: { kime: 'ikisi', iller: ['İzmir'] },
  },
  {
    tur: 'uyari',
    /* Önce 'geriCagirma' idi; tür yeni duyuru için kaldırıldı (23 Eylül
       2026). Servise giden güvenlik uyarısı olarak duruyor. */
    alt: 'guvenlik',
    baslik: 'ORK1270-2024 serisi düğüm atıcı kontrolü',
    metin: 'ORK1270-2024 seri numaralı makinelerin düğüm atıcı yayında üretim kaynaklı kırılma görüldü. Bu makineleri kullanan müşterilerinizi arayıp servise çağırın. Değişim bedelsizdir; yay stoku servislere gönderildi.',
    yas: 1 / 24,
    hedef: { kime: 'servis' },
  },
]

/* Bakım rehberlerindeki madde anahtarları makineId-rehberId-bölüm-sıra
   biçiminde (bkz. src/lib/rehberIsaret.js → maddeAnahtari). */
const BAKIM_REHBERLERI = ['gunluk', 'sezonOncesi', 'sezonSonu']

/* ----------------------------------------------------------- Yardımcılar */

function sec(dizi) {
  return dizi[Math.floor(Math.random() * dizi.length)]
}

function secBirkac(dizi, enAz, enCok) {
  const adet = enAz + Math.floor(Math.random() * (enCok - enAz + 1))
  const kopya = [...dizi]
  const sonuc = []
  for (let i = 0; i < adet && kopya.length; i++) {
    sonuc.push(kopya.splice(Math.floor(Math.random() * kopya.length), 1)[0])
  }
  return sonuc
}

function tamsayi(enAz, enCok) {
  return enAz + Math.floor(Math.random() * (enCok - enAz + 1))
}

function gunOnce(gun) {
  return Date.now() - gun * 86400000 - Math.floor(Math.random() * 86400000)
}

function telUret() {
  return `5${tamsayi(30, 59)} ${tamsayi(100, 999)} ${tamsayi(10, 99)} ${tamsayi(10, 99)}`
}

/* Önek ürünün KENDİ model kodundan geliyor (`serialPrefix`), ürün
   kimliğinden değil.

   Önce kimliğin ilk altı harfi kullanılıyordu: `diamond-...` ürünü
   `DIAMON2023...` gibi bir numara üretiyordu. Böyle bir önek
   `products.js` içinde yok, dolayısıyla `matchProduct` eşleşmiyor;
   demo verisinde model bulunamıyor, üretim yılı çıkarılamıyor,
   garanti "bilinmiyor" görünüyor ve numara ekranda tiresiz
   yazılıyordu. Gerçek seri numaralarında bunların hiçbiri olmuyor —
   yani demo, olmayan bir hatayı taklit ediyordu.

   Biçim lib/serial.js'in kuralı (`onekYilSira`): model kodu, 4 haneli
   üretim yılı, 5 haneli sıra; validateSerial 25 Eylül 2026'dan beri
   önekten sonrasını da denetliyor. YIL PARAMETRE: makinenin takviminden
   geliyor (makineTakvimi). Önce seri yılı ile makinenin `year` alanı ayrı
   ayrı rastgeleydi; Müşteriler ekranı garantiyi `year`'dan, talep
   detayı ve Servisim seriden okuyordu ve aynı makine iki ekranda iki
   farklı garanti gösteriyordu. */
function seriUret(urun, yil) {
  const onek = normalizeSerial(urun.serialPrefix)
  return `${onek}${yil}${String(tamsayi(1, 9999)).padStart(5, '0')}`
}

/* MAKİNENİN TAKVİMİ: üretim → bayiye fatura → uygulamaya kayıt, tek
   yıldan. Üretim yılı `enEski` ile bu yıl arasında; üretim en geç 150 gün
   önce (fatura 15-60 gün sonra, kayıt faturadan sonra). Kayıt en geç 46
   gün önce: en eski demo işi 40 gün önce açılıyor (aşağıda yasGun) ve
   talep makineden önce açılamaz. Kayıt Makineler
   ekranındaki üretim ve fatura tarihiyle aynı takvimden (bkz. makine
   defteri, aşağıda). */
function makineTakvimi(enEski) {
  const simdi = Date.now()
  const sonUretim = simdi - 150 * GUN
  let yil = tamsayi(enEski, new Date(simdi).getFullYear())
  if (new Date(yil, 0, 1).getTime() > sonUretim) yil = new Date(sonUretim).getFullYear()
  const bas = new Date(yil, 0, 1).getTime()
  const son = Math.min(new Date(yil + 1, 0, 1).getTime() - 1, sonUretim)
  const uretim = Math.round(bas + Math.random() * (son - bas))
  const fatura = uretim + GUN * tamsayi(15, 60)
  const kayit = Math.max(fatura, Math.min(fatura + GUN * tamsayi(0, 400), simdi - 46 * GUN))
  return { yil, uretim, fatura, kayit }
}

/* -------------------------------------------------------------- Üretim */

export function demoVarMi() {
  return load(ANAHTAR.demoMusteriler, []).length > 0
}

/**
 * Demo verisini üretir: 10 personel, 30 müşteri, talepler ve numara
 * değişikliği talepleri.
 */
export async function demoYukle() {
  /* ---- Parça kataloğu: EN BAŞTA, hiçbir kayıt yazılmadan önce

     Demo verisindeki her parça PAKSAN'ın gerçek fiyat listesinden
     geliyor: gerçek kod, gerçek ad, gerçek fiyat (bkz.
     lib/parcaKatalogu.js). Katalog uygulamanın içinde değil,
     sunucudan iniyor.

     KATALOG GELMEZSE DEMO HİÇ KURULMUYOR. Eskiden uydurma bir fiyat
     tablosuna düşülüyordu; demo o zaman hiç var olmayan kodlarla
     doluyor ve demoyu inceleyen kişiye yanlış bir fiyat listesi
     gösteriyordu. Parçasız kurmak da olmazdı: parça istenmiş ama
     parçası olmayan bir servis kaydı gerçekte oluşamaz, parça masası
     da boş görünürdü.

     Bu yüzden istek en başta atılıyor — personel, müşteri ve makine
     kayıtları yazılmadan. Yarım bir demo kalmıyor, `demoVarMi()`
     hâlâ boş dönüyor ve düğme açık kalıyor. Başarısız katalog isteği
     bellekte saklanmadığı için ikinci deneme gerçekten yeniden
     deniyor (bkz. lib/parcaKatalogu.js). */
  let katalog
  try {
    katalog = (await parcaKaynagi()).katalog
  } catch (hata) {
    console.error('demo: parça kataloğu alınamadı, demo verisi kurulmadı', hata)
    return {
      personel: 0, musteri: 0, talep: 0, numara: 0,
      gorus: 0, destek: 0, duyuru: 0, hata: 'katalog',
    }
  }

  /* Sahne servisi: servis uygulamasının demo hesabının açıldığı servis
     (bkz. demoServis.js). Rastgele işler ona düşmüyor; onun işleri
     sabit sahnede (demoSahne.js). */
  const sahneServisi = SERVISLER.find((x) => x.id === DEMO_SERVIS) || SERVISLER[0]
  const digerServisler = SERVISLER.filter((x) => x.id !== sahneServisi.id)

  const YIL = new Date().getFullYear()
  const takvimler = new Map()

  /* ---- Personel: admin dışında rastgele roller */
  const mevcut = personelGetir()
  const yeniPersonel = []
  const demoRol = demoRolleri()

  for (let i = 0; i < 10; i++) {
    const ad = `${sec(ADLAR)} ${sec(SOYADLAR)}`
    const kullanici = ad
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .join('.')

    /* Aynı ad iki kez düşerse kullanıcı adı çakışmasın */
    const benzer = [...mevcut, ...yeniPersonel].filter((p) =>
      p.kullanici.startsWith(kullanici)
    ).length

    yeniPersonel.push({
      id: uid(),
      no: yeniNo('personel'),
      ad,
      kullanici: benzer ? `${kullanici}${benzer + 1}` : kullanici,
      rol: demoRol[i % demoRol.length],
      eposta: `${kullanici}@${SIRKET.siteKisa}`,
      tel: '0' + telUret(),
      aktif: i !== 9, /* biri kapalı — kapalı hesap nasıl görünüyor */
      createdAt: gunOnce(tamsayi(30, 400)),
      sonGiris: i < 7 ? gunOnce(tamsayi(0, 20)) : null,
      sifre: await sifreHazirla('123456'),
      demo: true,
    })
  }
  save(ANAHTAR.personel, [...mevcut, ...yeniPersonel])

  /* ---- Müşteriler

     Önce sahnenin on sabit müşterisi (demoSahne.js → SAHNE_MUSTERILERI:
     sahne servisinin Konya'daki sekiz müşterisi, başka servisin bir
     müşterisi, servisi olmayan bir makinenin sahibi), sonra rastgele
     müşteriler. Rastgele iş, talep, görüş ve numara değişikliği
     yalnız rastgele müşterilere düşüyor: sabit müşterinin geçmişi her
     kurulumda aynı. */
  const sabit = sahneMusterileriKur()
  const musteriler = [...sabit.musteriler]
  for (let i = 0; i < 30 - SABIT_MUSTERI; i++) {
    const [il, ilce] = sec(YERLER)
    const urunler = secBirkac(PRODUCTS, 1, 2)
    const makineler = urunler.map((urun) => {
      const t = makineTakvimi(2019)
      const mk = {
        id: uid(),
        productId: urun.id,
        serial: seriUret(urun, t.yil),
        year: t.yil,
        nickname: '',
        addedAt: t.kayit,
        hours: tamsayi(0, 1200),
        doneMaintenance: [],
      }
      takvimler.set(mk.id, t)
      return mk
    })

    /* Bakım işaretleri. Makinelerin bir kısmında bakım yapılmış
       görünsün: "bakımını yapan makineler daha az arızalanıyor mu"
       sorusu ancak işaretli kayıt varsa konuşulabiliyor. */
    for (const mk of makineler) {
      if (Math.random() < 0.45) continue
      const rehber = sec(BAKIM_REHBERLERI)
      const kacMadde = tamsayi(2, 6)
      for (let j = 0; j < kacMadde; j++) {
        mk.doneMaintenance.push(`${mk.id}|${rehber}|bolum${tamsayi(1, 3)}|${j}`)
      }
    }

    musteriler.push({
      id: uid(),
      no: yeniNo('musteri'),
      /* Hesap ilk makine kaydından önce açılmış olmalı. */
      createdAt: Math.min(gunOnce(tamsayi(20, 800)), ...makineler.map((mk) => mk.addedAt)),
      ad: `${sec(ADLAR)} ${sec(SOYADLAR)}`,
      ulke: 'TR',
      tel: telUret(),
      konumUlke: 'TR',
      il,
      ilce,
      /* Makinenin durduğu köy; bütün servis taleplerinin adresi bu
         (yukarıda KOYLER). */
      adres: koyAdresi(il, ilce),
      /* Müşterinin "makineyi kimden aldım" cevabı BAYİ adı; servis
         adı değil. Servis makine satmıyor. */
      satici: sec(BAYILER).ad,
      onaylar: {
        aydinlatma: true,
        acikRiza: true,
        kampanya: Math.random() > 0.4,
        surum: '1.0',
        tarih: gunOnce(tamsayi(20, 800)),
      },
      bildirim: { izin: sec(['verildi', 'verildi', 'reddedildi', 'sorulmadi']) },
      makineler,
      demo: true,
    })
  }
  save(ANAHTAR.demoMusteriler, musteriler)
  const rastgele = musteriler.slice(SABIT_MUSTERI)

  /* ---- Makine kayıt defteri

     Müşteri uygulamada makinesini kaydettiğinde `makineKayitlari`
     defterine bir satır düşüyor (bkz. src/lib/makineKaydi.js) ve pano
     "Kayıtlı Makine" kutusu o defteri sayıyor. Demo müşterilerin
     makineleri vardı ama defter boş kalıyordu: pano 30 müşteri ve
     0 kayıtlı makine gösteriyordu.

     BAYİ LOGO'DAN, SERVİS ELDEN. Fatura bayiye kesiliyor: Logo'nun
     verdiği `bayiId`. Hangi servisin bakacağı ise ticari bir karar,
     faturada yazmıyor — personel backoffice'ten atıyor.

     Bir kısmı bilerek boş bırakıldı: Logo her seri numarasını
     bilmiyor ve her makineye servis atanmış değil. Backoffice o
     eksikliği gösterebilmeli, demo da onu göstermeli. */
  /* Sabit müşterilerin satırları sahneden (atama ve bayi sabit). */
  const makineKayitlari = [...sabit.defter]
  for (const m of rastgele) {
    for (const mk of m.makineler) {
      const logoBildi = Math.random() > 0.15
      const bayi = logoBildi ? sec(BAYILER) : null
      /* Makinelerin bir bölümüne servis elle atanmış; kalanların
         servisi bayisinden geliyor ya da hiç yok. */
      /* Sahne servisine atanmıyor ki onun listesi dağılmasın. */
      const servis = Math.random() > 0.45 ? sec(digerServisler) : null
      /* Üretim ve fatura tarihi seri numarasının yılından, kayıt günü
         makinenin kendi takviminden (makineTakvimi). Önce üçü ayrı ayrı
         rastgeleydi: üretim tarihi seriden başka bir yıla düşebiliyordu. */
      const t = takvimler.get(mk.id)
      makineKayitlari.push({
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
        uretimTarihi: logoBildi ? t.uretim : null,
        faturaTarihi: logoBildi ? t.fatura : null,
        logoBildi,
        /* Kayıt anıyla fatura tarihi yakınsa yeni satış sayılıyor —
           lib/logo.js → yeniSatisMi ile aynı kural ve aynı gün sayısı. */
        yeniSatis: logoBildi && (t.kayit - t.fatura) / GUN <= LOGO.yeniSatisGun,
        kaynak: 'musteri',
        demo: true,
      })
    }
  }
  makineKayitlari.sort((a, b) => b.tarih - a.tarih)
  save(ANAHTAR.makineKayitlari, [
    ...makineKayitlari,
    ...load(ANAHTAR.makineKayitlari, []).filter((x) => !x.demo),
  ])

  /* SERVİS TALEBİ YALNIZ SERVİSİ OLAN MAKİNEDEN AÇILIYOR.

     Uygulamada servisi olmayan müşteri servis talebi açamıyor; talep
     makineden bayiye, bayiden servise giden zincirle bir servise düşüyor
     (bkz. lib/servisAtama.js). Demo önceden servis talebini rastgele bir
     müşteriye açıyor, servisi il ve ilçeye bakarak buluyordu — gerçekte
     oluşamayacak bir kayıt. Şimdi aynı zincir soruluyor. */
  const servisliMakineler = rastgele.flatMap((m) =>
    m.makineler
      .map((mk) => ({ m, mk, servis: makineninServisi(mk)?.servis || null }))
      .filter((x) => x.servis && x.servis.id !== sahneServisi.id),
  )

  /* MAKİNE SENARYOYA GÖRE SEÇİLİYOR (25 Eylül 2026, kullanıcı sınaması).
     Garanti kaydı açılan iş garanti süresindeki makineye, parça isteyen
     iş fiyat listesinde parçası olan makineye düşüyor; garanti dışı iş
     için garantisi bitmiş makine tercih ediliyor (demoMakineAilesi.js →
     makineUyar). Uyan makine yoksa iş hiç kurulmuyor: önce sahne
     servisinin makinelerine dönülüyordu, rastgele iş Servisim'in sabit
     sahnesine karışırdı (29 Eylül 2026).

     BİR MAKİNEDE TEK AÇIK SERVİS TALEBİ. Connect aynı makinede işi süren
     servis talebi varken ikincisini açtırmıyor (lib/makineTalepleri.js)
     ve backoffice aynı makinedeki ikinci açık işi işaretliyor. Demo her
     açık işi ayrı bir makineye koymaya çalışıyor; yer kalmazsa aynı
     makineye düşebiliyor — o zaman işaret de doğru olarak görünüyor. */
  const acikMakineler = new Set()
  const uygunlar = (liste, ihtiyac, acik) => {
    let u = liste.filter((x) => makineUyar(katalog, x.mk, ihtiyac))
    if (ihtiyac.garantiDisi) {
      const bitmis = u.filter((x) => !garantideMi(x.mk.serial))
      if (bitmis.length) u = bitmis
    }
    if (acik) {
      const bos = u.filter((x) => !acikMakineler.has(x.mk.id))
      if (bos.length) u = bos
    }
    return u
  }
  const servisMakinesi = (ihtiyac, acik) => {
    const a = uygunlar(servisliMakineler, ihtiyac, acik)
    return a.length ? sec(a) : null
  }
  /* Müşterinin parça talebi fiyat listesinde parçası olan makineden. */
  const parcaliMakineler = rastgele.flatMap((m) =>
    m.makineler
      .filter((mk) => makineninParcaHavuzu(katalog, mk.productId).length)
      .map((mk) => ({ m, mk })),
  )

  /* ---- Talepler

     Tarihler bilerek dağıtıldı: bir kısmı son 24 saatte (yeşil), bir
     kısmı 1-2 gün (sarı), bir kısmı daha eski (kırmızı). Renk kuralı
     böylece backoffice’te görünüyor. */
  const talepler = []

  /* TALEP NUMARASI TEKİL. Numara gün + dört rastgele hane
     (lib/talep.js → talepNo) ve demo yüzü aşkın talebi aynı gün
     numaralıyor; iki talep aynı numarayı alabiliyordu (tutarlilik T2).
     Tarayıcıdaki gerçek talepler de sayılıyor: demo temizlenirken
     numarayla bağlanan satırlar gerçek talebe karışmasın
     (bkz. demoTemizle). */
  const kullanilanNo = new Set(load(ANAHTAR.talepler, []).map((t) => t.no))
  const tekilNo = (tur) => {
    let no = talepNo(tur)
    while (kullanilanNo.has(no)) no = talepNo(tur)
    kullanilanNo.add(no)
    return no
  }

  /* Her türün kendi aşamaları var; demo da o aşamaları izliyor ki
     backoffice'teki durum süzgeci ve rapor sütunları boş kalmasın
     (bkz. src/backoffice/veri.js → talepDurumlari). */
  const DURUM = {
    servis: ['yeni', 'incelemede', 'planlandi', 'parcaBekliyor', 'onayBekliyor', 'kapandi', 'iptal'],
    parca: ['yeni', 'incelemede', 'planlandi', 'kapandi', 'iptal'],
    /* Fiyat teklifinde 'İncelemede' yok; 'Bayiye İletildi' aşağıda, bayi
       seçilerek kuruluyor (21 Eylül 2026, bkz. veri.js → talepDurumlari). */
    satinalma: ['yeni', 'teklif', 'kapandi', 'iptal'],
  }

  /* Ağırlıklı seçim: talep havuzunun çoğu açık işten oluşsun, kapanmış
     ve iptal olanlar azınlıkta kalsın — gerçek bir günün dağılımı
     böyle görünüyor. */
  const AGIRLIK = {
    yeni: 3, incelemede: 3, planlandi: 2, teklif: 2, kapandi: 4, iptal: 1,
    parcaBekliyor: 2, onayBekliyor: 2,
  }

  function durumSec(tur) {
    const havuz = []
    for (const d of DURUM[tur]) for (let i = 0; i < AGIRLIK[d]; i++) havuz.push(d)
    return sec(havuz)
  }

  /* HER TÜR x DURUM BİLEŞİMİ GARANTİLİ ÜRETİLİYOR.

     Önce her müşteriye rastgele 0-3 talep açılıyordu ve durum ağırlıklı
     seçiliyordu. Sonuç: bazı durumlar hiç çıkmıyordu. Sunumda "iptal
     edilmiş bir talep gösterebilir misin" dendiğinde elde örnek
     olmaması, demoyu yarıda kesiyor.

     Şimdi önce her bileşimden ikişer tane üretiliyor (16 bileşim, 32
     talep), sonra üstüne rastgele talepler ekleniyor. Böylece süzgeçte
     hangi durum seçilirse seçilsin liste dolu geliyor. */
  const gorevler = []

  for (const tur of Object.keys(DURUM)) {
    for (const durum of DURUM[tur]) {
      for (let k = 0; k < 2; k++) gorevler.push({ tur, durum })
    }
  }

  /* Rastgele ekler — havuz tek düze görünmesin */
  for (let i = 0; i < 26; i++) {
    const tur = sec(['servis', 'servis', 'parca', 'satinalma'])
    gorevler.push({ tur, durum: durumSec(tur) })
  }

  /* BEKLEYEN İŞ ÖRNEKLERİ. Dashboard'daki "48 saati geçen" kutusu ve
     Raporlar'daki "kimse bakmadı" uyarısı ancak eski ve hâlâ açık bir
     talep varsa dolu görünüyor. */
  gorevler.push({ tur: 'servis', durum: 'yeni', yasGun: 4 })
  gorevler.push({ tur: 'servis', durum: 'incelemede', yasGun: 6 })
  gorevler.push({ tur: 'parca', durum: 'yeni', yasGun: 3 })
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 9 })
  /* "Cevap bekleyen teklif" kutusu, teklif verileli TEKLIF_BEKLEME_GUN
     (14) günden fazla olan talepleri sayıyor. En eski demo teklifi 9
     günlüktü, kutu hep 0 gösteriyordu. */
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 21 })
  gorevler.push({ tur: 'satinalma', durum: 'teklif', yasGun: 17 })

  /* GÖNDERİM TARİHİ GEÇMİŞ PARÇA TALEPLERİ.

     "Gönderilecek" uyarısı (bkz. veri.js → gonderimGecikti) planlanan
     gönderim saati geçtiği hâlde hâlâ gönderilmemiş parça
     taleplerinde çıkıyor. Havuzda planlanmış parça talebi hiç
     yoktu; uyarı ekranda hiç görünmüyordu. */
  gorevler.push({ tur: 'parca', durum: 'planlandi', yasGun: 6 })
  gorevler.push({ tur: 'parca', durum: 'planlandi', yasGun: 9 })

  /* BUGÜN GELENLER — "bugün gelen" kutusu boş kalmasın */
  gorevler.push({ tur: 'servis', durum: 'yeni', yasGun: 0 })
  gorevler.push({ tur: 'parca', durum: 'yeni', yasGun: 0 })
  gorevler.push({ tur: 'satinalma', durum: 'yeni', yasGun: 0 })

  /* İHRACAT — yurtdışı talebi ayrı yoldan gidiyor, örneği olsun */
  gorevler.push({ tur: 'satinalma', durum: 'yeni', ihracat: true })

  /* Hesap hareketleri talepler kurulurken birikiyor. Parça havuzu
     yukarıda, demonun en başında alındı. */
  const cariHareketler = []

  /* Fotoğraflı talepler: ilk beş serviste ek olacak */
  let fotoKalan = 5

  /* SERVİS İŞLERİNİN MAKİNESİ ÖNCE SEÇİLİYOR, EN KISITLI İŞTEN BAŞLAYARAK.
     Garanti ve parça isteyen iş az sayıdaki uygun makineyi bekliyor;
     sırası sona kalırsa o makineler kısıtsız açık işlerle dolmuş olurdu.
     Senaryo, ihtiyaç ve makine görevin üstüne yazılıyor; talepler
     aşağıda görev sırasıyla kuruluyor. */
  const servisSecimi = new Map()
  const kisit = (x) => (x.ihtiyac.parcali ? 0 : x.ihtiyac.garanti ? 1 : x.ihtiyac.garantiDisi ? 2 : 3)
  const servisGorevleri = gorevler
    .filter((g) => g.tur === 'servis')
    .map((g) => {
      const senaryo = g.senaryo || senaryoSec(g.durum)
      return { g, senaryo, ihtiyac: senaryoIhtiyaci(senaryo) }
    })
  for (const x of [...servisGorevleri].sort((a, b) => kisit(a) - kisit(b))) {
    const acik = !['kapandi', 'iptal'].includes(x.g.durum)
    x.eslesme = servisMakinesi(x.ihtiyac, acik)
    if (acik && x.eslesme) acikMakineler.add(x.eslesme.mk.id)
    servisSecimi.set(x.g, x)
  }

  for (const gorev of gorevler) {
    {
      const tur = gorev.tur
      const secim = tur === 'servis' ? servisSecimi.get(gorev) : null
      /* Uyan makine bulunamayan servis işi kurulmuyor (yukarıda). */
      if (tur === 'servis' && !secim?.eslesme) continue
      const senaryo = secim ? secim.senaryo : null
      const ihtiyac = secim ? secim.ihtiyac : null
      const eslesme = secim ? secim.eslesme : tur === 'parca' ? sec(parcaliMakineler) : null
      const m = eslesme ? eslesme.m : sec(rastgele)
      const makine = eslesme ? eslesme.mk : sec(m.makineler)
      /* Arıza vakası makineden: belirti, açıklama ve fotoğraf makinenin
         ailesinden, parçalı iş vakanın gruplarından. */
      const vaka = secim ? vakaSec(katalog, makine, senaryo, ihtiyac, { elle: Boolean(gorev.elle) }) : null
      /* Servisin elle açtığı kayıtta ve kurulum talebinde ses ve fotoğraf
         yok: elle kayıtta sorulmuyor, kurulumda anlatılacak arıza yok. */
      const sessiz = Boolean(secim) && (Boolean(gorev.elle) || vaka.durum === 'kurulum')
      const yasGun = gorev.yasGun !== undefined
        ? gorev.yasGun
        : sec([0, 0.5, 1.2, 1.6, 3, 6, 14, 40])
      const tarih = Date.now() - yasGun * 86400000 - tamsayi(0, 6) * 3600000
      const durum = gorev.durum
      const personel = sec(yeniPersonel).ad

      /* Aşamalar sırayla işleniyor: "kapandı" bir talep önce
         "incelemede"den geçmiş olmalı, geçmiş sütunu da öyle
         görünmeli. İptal her aşamadan olabildiği için tek satır. */
      const sira = DURUM[tur].filter((d) => d !== 'yeni' && d !== 'iptal')
      const asamalar = durum === 'iptal'
        ? ['incelemede', 'iptal']
        : sira.slice(0, sira.indexOf(durum) + 1)

      /* Aşama tarihleri talep tarihinden İLERİ gidiyor; bugünü geçmemeli.
         Geçmeleri mümkündü: bugün açılmış üç aşamalı bir talepte son
         aşama 40 saat sonrasına düşebiliyordu. Sonuç ekranda gelecek
         tarihli bir geçmiş satırı ve "-1 gündür bekliyor" gibi eksi
         sürelerdi. Aralık bugüne sığmıyorsa aşamalar oransal olarak
         sıkıştırılıyor — sıraları bozulmadan. */
      /* Aralıklar biriktirilerek üretiliyor: her aşama bir öncekinden
         SONRA olmalı. Önceden her aşama kendi rastgele sayısını
         alıyordu ve sıra bozulabiliyordu (ikinci aşama birinciden önce
         gelebiliyordu). */
      const ham = []
      let birikim = 0
      for (let j = 0; j < asamalar.length; j++) {
        birikim += 3600000 * tamsayi(2, 20)
        ham.push(birikim)
      }
      const gereken = birikim
      const yer = Math.max(0, Date.now() - tarih - 60000)
      const olcek = gereken > yer ? yer / gereken : 1
      const gecmis = asamalar.map((d, j) => ({
        durum: d,
        tarih: Math.round(tarih + ham[j] * olcek),
        personel,
      }))
      const sonTarih = gecmis.length ? gecmis[gecmis.length - 1].tarih : tarih

      /* PARÇALAR KATALOGDAN, FİYAT KAYDIN İÇİNDE.

         Seçim PAKSAN'ın fiyat listesinden yapılıyor; "en çok istenen
         parçalar" raporu gerçek kodlarla doluyor. Talebin tutarı
         açılış anındaki fiyat görüntüsünden (`parcaFiyat`) okunuyor:
         liste sonradan değiştiğinde eski talebin rakamı değişmiyor
         (bkz. lib/parcaKatalogu.js → fiyatGoruntusu). */
      /* Parça bu makinenin: makinenin ailesinin grupları, adında model
         geçen parça yalnız o modelde (demoMakineAilesi.js). */
      const kalemler = tur === 'parca'
        ? parcaSecimi(makineninParcaHavuzu(katalog, makine.productId), 1, 3).map((p) => ({ ...p, adet: tamsayi(1, 4) }))
        : []
      const parcalar = kalemler.map((k) => k.ad)
      const parcaAdet = Object.fromEntries(kalemler.map((k) => [k.ad, k.adet]))

      /* Yedek parçada bedel önden ödeniyor: "yeni" dışındaki her
         aşamada ödemenin onaylanmış olması gerekiyor, yoksa talep
         zaten ilerleyemezdi (bkz. Talepler ekranındaki ödeme kapısı). */
      const odemeVar = tur === 'parca' && durum !== 'yeni' && durum !== 'iptal'

      /* Sesli not her talepte yok. Ses kaydının kendisi demoya
         konmuyor — megabaytlarca base64 tarayıcının hafızasını
         doldururdu; oynatıcı yerine süresi görünüyor. */
      const sesliMi = Math.random() > 0.75

      const talep = {
        id: uid(),
        no: tekilNo(tur),
        createdAt: tarih,
        status: durum,
        tur,
        ad: m.ad,
        /* Numara Connect'in yazdığı biçimde (25 Eylül 2026, kullanıcı
           sınaması Y3): ekranda "+90 …", ham numara yalnız rakam,
           talep açanın hesabına kimlikle bağlı. Servisin elle açtığı
           işte de kimlik yazılıyor: demo müşterisi kayıtlı müşteri,
           Servisim numarasını tanıyıp talebi hesabına bağlıyor
           (lib/elleTalep.js). */
        tel: telGoster('TR', m.tel),
        telUlke: 'TR',
        telHam: telHamYap('TR', m.tel),
        musteriId: m.id,
        il: m.il,
        ilce: m.ilce,
        /* SERVİS TALEBİNİN ADRESİ — UYGULAMADAN GELEN TALEPTE VAR.

           Servis talebi uygulamadan açıldığında müşteri makinenin
           bulunduğu adresi yazıyor (bkz. screens/RequestForm.jsx).
           Telefonla gelen taleplerde bu alan boş; sahadaki servis
           kayıt ekranında kendisi dolduruyor. Demoda beşte biri boş
           bırakılıyor ki iki yol da denenebilsin. Servisin elle açtığı
           işte adres HEP var: Kayıt Aç ekranı onu zorunlu tutuyor. */
        adres: tur === 'servis' && (gorev.elle || Math.random() > 0.2) ? m.adres : '',
        ulke: gorev.ihracat ? 'DE' : 'TR',
        ihracat: Boolean(gorev.ihracat),
        makine: tur === 'satinalma'
          ? null
          : { id: makine.id, serial: makine.serial, productId: makine.productId },
        urunId: tur === 'satinalma' ? sec(PRODUCTS).id : null,
        /* Makinenin durumu ve belirtiler talep formunun değerleri; kurulumda
           belirti yok (RequestForm.jsx kurulumda onları siliyor). Servisin
           elle açtığı işte ikisi de sorulmuyor (ElleKayit.jsx). */
        durum: tur === 'servis' && !gorev.elle ? vaka.durum : null,
        belirtiler: tur === 'servis' && !gorev.elle ? [...vaka.belirtiler] : [],
        parcalar,
        parcaAdet: tur === 'parca' ? parcaAdet : null,
        parcaFiyat: kalemler.length ? fiyatGoruntusu(katalog, kalemler) : null,
        urunTipi: tur === 'satinalma' ? sec(['Saman', 'Kuru ot', 'Silaj']) : '',
        arazi: tur === 'satinalma' ? sec(['Düz', 'Hafif eğimli', 'Engebeli']) : '',
        traktor: tur === 'satinalma' ? sec(['50-75 HP', '75-100 HP', '100 HP üzeri']) : '',
        aciklama:
          tur === 'servis'
            ? vaka.aciklama
            : tur === 'parca'
              ? sec(PARCA_ACIKLAMA)
              : sec(SATIS_ACIKLAMA),

        ses: sesliMi && !sessiz ? { veri: null, sure: tamsayi(8, 45) } : null,
        /* Fotoğraflar aşağıda, talepler kaydedildikten sonra
           ekleniyor: eklerin yazılması asenkron. Fotoğrafın yazısı
           arızanın parçası ("Düğüm atıcı"), yanında bazen seri plakası. */
        ekler: [],
        _fotoYazilari:
          tur === 'servis' && !sessiz && vaka.foto && fotoKalan > 0
            ? (fotoKalan--, [vaka.foto, ...secBirkac(GENEL_FOTO.filter((f) => f !== vaka.foto), 0, 1)])
            : null,

        /* -------------------------------------------- Fatura ve ödeme */
        fatura: tur === 'parca' ? faturaUret(m) : null,
        dekont: tur === 'parca'
          ? { id: uid(), tur: sec(['pdf', 'gorsel']), ad: 'dekont', boyut: tamsayi(60, 400) }
          : null,
        odemeOnay: odemeVar ? { tarih: tarih + 5400000, personel, not: '' } : null,

        /* ----------------------------------------- Aşamaya özel kayıtlar */
        /* PLAN KAPANDIKTAN SONRA DA DURUYOR.

           Eskiden yalnız durum "planlandı" iken yazılıyordu; talep
           kapanınca plan kayboluyordu. Oysa gerçekte `talepPlanla`
           bir kez yazıyor ve kayıt kalıcı (bkz. veri.js). Kaybolunca
           "verilen tarihte teslim edildi mi" ölçüsü kapanmış
           taleplerde hesaplanamıyordu.

           Yalnız yedek parçada: servis talebinin planını servis akışı
           yazıyor (Servisim'in randevusu, bkz. demoServis.js). */
        plan: tur === 'parca' && asamalar.includes('planlandi')
          ? planUret(sonTarih, personel)
          : null,
        teklif: (durum === 'teklif' || (durum === 'kapandi' && tur === 'satinalma'))
          ? teklifUret(sonTarih, personel)
          : null,
        iptalBilgi: durum === 'iptal'
          ? { neden: sec(IPTAL_NEDEN), aciklama: '', personel, tarih: sonTarih }
          : null,
        cozum: durum === 'kapandi' && tur !== 'servis'
          ? cozumUret(tur, parcalar, parcaAdet, personel, sonTarih)
          : null,
        /* KARGO KAPANIŞIN İÇİNDE (25 Eylül 2026): müşterinin parça
           talebi kapanırken personel kargo firmasını ve takip numarasını
           yazabiliyor; değer talebin `parcaSevk` alanına gidiyor
           (veri.js → talepKapat). İsteğe bağlı olduğu için bir kısmında
           yok. */
        ...(tur === 'parca' && durum === 'kapandi' && Math.random() < 0.75
          ? {
              parcaSevk: {
                firma: sec(KARGO),
                takipNo: String(tamsayi(1000000000, 9999999999)),
                tarih: sonTarih,
                personel,
              },
            }
          : {}),

        /* Servis talebinde ikisini de servis akışı yazıyor. */
        servis: null,
        sahip: 'paksan',

        notlar: notUret({
          tur,
          tarih,
          personel,
          garanti: tur === 'servis' ? garantideMi(makine.serial) : false,
          senaryo,
          odemeVar,
        }),
        gecmis,
        demo: true,
      }

      /* SERVİS TALEBİ SERVİS AKIŞINDAN GEÇİYOR: randevu, servis kaydı,
         parça gönderimi, onay ve hesap hareketi (bkz. demoServis.js). */
      if (tur === 'servis') {
        const akis = servisAkisi(talep, senaryo, {
          servis: eslesme.servis,
          havuz: vakaHavuzu(katalog, makine.productId, vaka),
          personel,
          secenek: { ...gorev, vaka, parcali: ihtiyac.parcali },
        })
        Object.assign(talep, akis.yama)
        cariHareketler.push(...akis.cari)
      }

      /* FİYAT TEKLİFİNİN BİR KISMI BAYİYE İLETİLDİ. Satış personeli
         talebi bayiye verdiğinde PAKSAN'ın işi biter ve talep 'Bayiye
         İletildi' durumunda kalır (bkz. veri.js → talebiBayiyeAta). Teklif
         verilmiş talep iletilemediği için geçmişte yalnız iletme satırı
         var. Demo yalnız teklif verip kapatılan satışı gösteriyordu. */
      if (tur === 'satinalma' && durum === 'kapandi' && !gorev.ihracat && Math.random() < 0.5) {
        const bayi = sec(BAYILER)
        Object.assign(talep, {
          bayi: { id: bayi.id, ad: bayi.ad, tel: bayi.tel || '', tarih: sonTarih },
          sahip: 'bayi',
          status: 'bayiyeIletildi',
          gecmis: [{ durum: 'bayiyeIletildi', tarih: sonTarih, personel }],
          teklif: null,
          cozum: null,
        })
      }

      talepler.push(talep)
    }
  }

  /* Fotoğraf ekleri. Tuvale çizilip IndexedDB'ye yazılıyor; işlem
     asenkron olduğu için talepler kurulduktan sonra yapılıyor. */
  for (const t of talepler) {
    const yazilar = t._fotoYazilari
    delete t._fotoYazilari
    if (!yazilar) continue
    try {
      t.ekler = await Promise.all(yazilar.map((y) => fotoUret(y)))
    } catch {
      /* Tuval ya da IndexedDB kullanılamıyorsa demo yine yüklensin */
      t.ekler = []
    }
  }

  /* Servisin parça siparişleri, ödemesi ve hesabı sahnede
     (demoSahne.js): siparişler gerçek sipariş gövdesinden geçiyor. */
  talepler.sort((a, b) => b.createdAt - a.createdAt)

  save(ANAHTAR.cari, [
    ...cariHareketler.sort((a, b) => b.tarih - a.tarih),
    ...load(ANAHTAR.cari, []).filter((h) => !h.demo),
  ])

  save(ANAHTAR.demoTalepler, talepler)

  /* ---- Numara değişikliği talepleri

     Bir kısmında seri no doğru (backoffice ✓ gösterecek), bir kısmında
     yanlış (✕) — kontrolün nasıl çalıştığı görünsün. */
  const numaraTalepleri = []
  secBirkac(rastgele, 4, 6).forEach((m) => {
    const dogru = Math.random() > 0.35
    const makine = m.makineler[0]
    /* Yeni numara TEK kez üretiliyor: ekranda görünen ile onayda hesaba
       yazılacak ham hâl aynı numara (lib/numaraTalebi.js →
       numaraTalebiGonder ile aynı alanlar). Önce iki ayrı rastgele
       numaraydı; backoffice birini gösterip ötekini yazıyordu. */
    const yeni = telUret()
    numaraTalepleri.push({
      kaynak: 'numara',
      id: uid(),
      tarih: gunOnce(tamsayi(0, 12)),
      durum: sec(['bekliyor', 'bekliyor', 'bekliyor', 'onaylandi', 'reddedildi']),
      musteriId: m.id,
      ad: m.ad,
      eskiTel: telGoster('TR', m.tel),
      eskiUlke: 'TR',
      yeniTel: yeni,
      yeniTelHam: yeni,
      yeniUlke: 'TR',
      yeniAnahtar: telAnahtar('TR', yeni),
      /* Yanlış seri de kuralına uygun bir seri: başka bir makinenin. */
      seri: dogru ? makine.serial : seriUret(sec(PRODUCTS), tamsayi(2019, YIL)),
      demo: true,
    })
  })
  numaraTalepleri.forEach((t) => {
    if (t.durum !== 'bekliyor') {
      t.karar = { personel: sec(yeniPersonel).ad, tarih: t.tarih + 7200000, not: '' }
    }
  })
  save(ANAHTAR.numaraTalepleri, [
    ...numaraTalepleri,
    ...load(ANAHTAR.numaraTalepleri, []),
  ])

  /* ---- Destek ekranı oturumları

     Destek Kayıtları ekranı demo verisinde bomboş kalıyordu; sunumda
     "müşteri talep açmadan önce neye baktı" anlatılamıyordu.

     Üç tür oturum üretiliyor:
       · cevap bulundu, talep açılmadı  → ekranın işe yaradığı hâl
       · cevap bulundu ama talep açıldı → yetmediği hâl
       · cevapsız kaldı                 → bilgi tabanının eksiği

     Üçü de raporlarda ayrı ayrı sayılıyor. */
  const destekOturumlari = []

  secBirkac(rastgele, 12, 18).forEach((m) => {
    const kac = tamsayi(1, 2)
    for (let i = 0; i < kac; i++) {
      const makine = sec(m.makineler)
      const urun = PRODUCTS.find((u) => u.id === makine.productId)
      const baslangic = gunOnce(tamsayi(0, 45))
      /* Asistanın yazdığı olaylar (bkz. screens/Support.jsx): soru,
         kılavuzdan gelen cevabın kaynağı, çiftçinin "çözüldü" ya da
         "devam ediyor" demesi, talebe yönlenme. Beşte biri yarıda
         kalıyor: cevap geldi, çiftçi bir şey demeden çıktı. */
      const sonuc = sec(['cozuldu', 'cozuldu', 'talep', 'cevapsiz', 'yarim'])
      const olaylar = []

      /* Soru makinenin ailesinden (demoMakineAilesi.js → destekSorusu). */
      if (sonuc === 'cevapsiz') {
        const soru = destekSorusu(makine.productId, true)
        olaylar.push({ tur: 'serbest', deger: soru, tarih: baslangic + 20000 })
        olaylar.push({ tur: 'cevapsiz', deger: soru, tarih: baslangic + 29000 })
      } else {
        const soru = destekSorusu(makine.productId, false)
        const sayfa = tamsayi(8, 60)
        olaylar.push({ tur: 'serbest', deger: soru, tarih: baslangic + 20000 })
        olaylar.push({
          tur: 'cevap',
          deger: `${urun?.name || 'Genel'} kılavuzu, s. ${sayfa}, ${sayfa + 1}`,
          tarih: baslangic + 41000,
        })
        if (sonuc === 'cozuldu') {
          olaylar.push({ tur: 'cevap', deger: 'çözüldü', tarih: baslangic + 90000 })
        }
        if (sonuc === 'talep') {
          olaylar.push({ tur: 'cozulmedi', deger: soru, tarih: baslangic + 95000 })
          olaylar.push({ tur: 'yonlendirme', deger: 'servis', tarih: baslangic + 140000 })
        }
      }

      destekOturumlari.push({
        id: uid(),
        anahtar: m.id + '-' + makine.id,
        baslangic,
        son: olaylar[olaylar.length - 1].tarih,
        dil: 'tr',
        grup: urun?.category || 'genel',
        kullanici: { no: m.no, ad: m.ad, tel: m.tel, il: m.il, ilce: m.ilce },
        makine: { id: makine.id, serial: makine.serial, productId: makine.productId },
        urun: urun ? { id: urun.id, ad: urun.name } : null,
        olaylar,
        demo: true,
      })
    }
  })
  save(ANAHTAR.destekLog, [...destekOturumlari, ...load(ANAHTAR.destekLog, [])])

  /* ---- Duyurular ve uyarılar

     Duyurular ekranı da boştu. Dördü de gerçek bir üreticinin
     gönderebileceği içerikte: iki kampanya duyurusu, iki güvenlik
     uyarısı. Uyarılar uygulamada kampanya izni olmadan da gidiyor —
     hizmete ilişkin bildirim izne bağlı değil. */
  const duyurular = DUYURULAR.map((x, i) => ({
    id: uid(),
    tarih: Date.now() - Math.round(x.yas * GUN),
    tur: x.tur,
    alt: x.alt,
    baslik: x.baslik,
    metin: x.metin,
    gorsel: null,
    personel: sec(yeniPersonel).ad,
    pencere: i === 0,
    demo: true,
    /* Kampanya ve etkinliğin son günü var; uyarıların yok
       (bkz. veri.js → duyuruYayinla). */
    ...(x.gun ? { bitis: Date.now() + x.gun * 86400000 } : {}),
    ...(x.hedef ? { hedef: x.hedef } : {}),
  }))
  save(ANAHTAR.duyurular, [...duyurular, ...load(ANAHTAR.duyurular, [])])
  duyuruGorulduSay(duyurular.filter((d, i) => DUYURULAR[i].servisteGorulmus).map((d) => d.id))

  /* ---- Geri bildirimler */
  const gorusler = secBirkac(rastgele, 5, 8).map((m) => ({
    id: uid(),
    no: yeniNo('geribildirim'),
    tarih: gunOnce(tamsayi(0, 30)),
    metin: sec(GORUSLER),
    ad: m.ad,
    tel: m.tel,
    /* Connect'in görüşü hesabın kimliğini ve numaranın ülkesini de
       yazıyor (screens/Profile.jsx, 25 Eylül 2026). */
    musteriId: m.id,
    telUlke: 'TR',
    dil: 'tr',
    surum: '0.6.1',
    okundu: Math.random() > 0.6,
    gonderildi: false,
    demo: true,
  }))
  save(ANAHTAR.geriBildirim, [...gorusler, ...load(ANAHTAR.geriBildirim, [])])

  /* ---- Servisim'in sahnesi: sabit müşterilerin işleri, servisin
     siparişleri, ayarlar ve adres defteri (demoSahne.js). Müşteri,
     makine defteri ve öteki kayıtlar yazıldıktan SONRA: talebin servisi
     defterden çıkıyor. */
  const sahne = await sahneKur({
    katalog,
    personel: yeniPersonel.map((p) => p.ad),
    tekilNo,
    fotoUret,
    metinler: { musteriyeNot: NOTLAR.servis.musteriye[1], gonderimIsi: PARCA_PLAN_IS[0] },
  })

  const ozet = {
    personel: yeniPersonel.length,
    musteri: musteriler.length,
    talep: talepler.length + sahne.talep,
    numara: numaraTalepleri.length,
    gorus: gorusler.length,
    destek: destekOturumlari.length,
    duyuru: duyurular.length,
  }
  islemYaz({
    tur: 'demo',
    ozet: `Demo verisi yüklendi · ${ozet.personel} personel, ${ozet.musteri} müşteri, ` +
      `${ozet.talep} talep, ${ozet.destek} destek oturumu, ${ozet.duyuru} duyuru`,
  })
  return ozet
}

/** Demo kayıtlarını siler; gerçek kayıtlara dokunmaz. */
export function demoTemizle() {
  /* DEMO KAYDINA BAĞLI SATIRLAR DA GİDİYOR (25 Eylül 2026, kullanıcı
     sınaması). Uygulama demo talebinde iş yaptığında cariye ve
     bildirimlere DEMO İŞARETSİZ satır yazıyor: hak ediş onayının alacağı,
     siparişin borcu ve iadesi, servise ve müşteriye giden bildirimler.
     Talep silinip satır kalınca bakiye silinmiş işin parasını taşıyor,
     bildirim açılamayan talebe gidiyordu.

     Kümeler depo silinmeden ÖNCE kuruluyor. Talep önce kimlikle aranıyor;
     numara tekil değil (gün + dört rastgele hane), bu yüzden numara yalnız
     kimliği olmayan satırda ve yalnız gerçek bir talepte geçmeyen numara
     için kullanılıyor. Demo müşterisine giden kişisel bildirim müşteri
     kimliğiyle bulunuyor. Gerçek talebe (`requests`) bağlı satıra
     dokunulmuyor; İşlem Kaydı olduğu gibi kalıyor.

     SAHNENİN İZLERİ DE GİDİYOR (29 Eylül 2026). Servisim'in sahnesi
     (demoSahne.js) ücret ve indirim ayarı yazıyor, servise talebe bağlı
     olmayan hesap bildirimi (`demo` damgalı) düşürüyor, adres defterine
     adres ekliyor, bildirimleri okunmuş sayıyor. Ayar personel o arada
     değiştirmediyse eski hâline dönüyor; okunmuş listelerinden silinen
     bildirimlerin kimlikleri çıkıyor.

     DEMO SÜRÜMÜ DE SİLİNİYOR. Backoffice'ten temizlenen demo, Servisim
     hesabı ve `demoSurumu` yerinde kaldığı için Servisim'de bir daha
     kurulmuyordu (servis/demoKur.js hesabı ve sürümü görüp dönüyordu);
     Servisim boş açılıyordu. Sürüm silinince Servisim bir sonraki
     açılışta demoyu yeniden kuruyor. */
  const demoTalepleri = load(ANAHTAR.demoTalepler, [])
  const talepKimlikleri = new Set(demoTalepleri.map((t) => t.id))
  const gercekNumaralar = new Set(load(ANAHTAR.talepler, []).map((t) => t.no))
  const talepNumaralari = new Set(
    demoTalepleri.map((t) => t.no).filter((no) => no && !gercekNumaralar.has(no)),
  )
  const musteriKimlikleri = new Set(load(ANAHTAR.demoMusteriler, []).map((m) => m.id))
  const bagli = (x) =>
    (x.talepId && talepKimlikleri.has(x.talepId)) ||
    (!x.talepId && x.talepNo && talepNumaralari.has(x.talepNo)) ||
    (x.musteriId && musteriKimlikleri.has(x.musteriId))

  islemYaz({ tur: 'demo', ozet: 'Demo verisi temizlendi' })
  save(ANAHTAR.demoMusteriler, [])
  save(ANAHTAR.demoTalepler, [])
  save(ANAHTAR.personel, personelGetir().filter((p) => !p.demo))
  save(ANAHTAR.numaraTalepleri, load(ANAHTAR.numaraTalepleri, []).filter((t) => !t.demo))
  save(ANAHTAR.geriBildirim, load(ANAHTAR.geriBildirim, []).filter((g) => !g.demo))
  save(ANAHTAR.destekLog, load(ANAHTAR.destekLog, []).filter((o) => !o.demo))
  save(ANAHTAR.duyurular, load(ANAHTAR.duyurular, []).filter((x) => !x.demo && !(x.kisisel && bagli(x))))
  save(ANAHTAR.cari, load(ANAHTAR.cari, []).filter((h) => !h.demo && !bagli(h)))
  save(
    ANAHTAR.makineKayitlari,
    load(ANAHTAR.makineKayitlari, []).filter((x) => !x.demo)
  )
  sahneIzleriniTemizle()
  const kalanBildirimler = new Set(load(ANAHTAR.duyurular, []).map((d) => d.id))
  for (const anahtar of ['okunanBildirimlerServis', GORULEN_DUYURU]) {
    const liste = load(anahtar, null)
    if (Array.isArray(liste)) save(anahtar, liste.filter((id) => kalanBildirimler.has(id)))
  }
  remove(AYAR_YEDEGI)
  remove('demoSurumu')
}

/* -------------------------------------------------------- Fotoğraf eki

   Talep detayındaki fotoğraf bölümü demo verisinde hep boş kalıyordu;
   sunumda "müşteri fotoğraf gönderebiliyor" denip gösterilecek bir şey
   olmuyordu.

   Gerçek fotoğraf konmuyor — kaynağı yok ve megabaytlarca veri demoyu
   ağırlaştırırdı. Onun yerine üstünde ne olduğu yazan basit bir kare
   çiziliyor. Ekranda fotoğrafın nasıl durduğu, büyütülünce ne olduğu ve
   yan yana kaç tane sığdığı görünüyor; anlatılmak istenen bu.

   Yazı arızanın parçası: vakanın fotoğrafı (demoMakineAilesi.js) ve
   bazen seri plakası (GENEL_FOTO). Önce sekiz yazılık tek bir listeden
   rastgele seçiliyordu; rotovatörün fotoğrafında "Düğüm atıcı"
   yazabiliyordu. */
async function fotoUret(yazi) {
  const tuval = document.createElement('canvas')
  tuval.width = 640
  tuval.height = 480
  const c = tuval.getContext('2d')

  c.fillStyle = '#1d2b45'
  c.fillRect(0, 0, 640, 480)
  c.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 640; i += 40) c.fillRect(i, 0, 1, 480)
  for (let i = 0; i < 480; i += 40) c.fillRect(0, i, 640, 1)

  c.fillStyle = '#e8641a'
  c.fillRect(60, 300, 520, 120)
  c.fillStyle = '#dce3ef'
  c.fillRect(90, 180, 460, 130)

  c.fillStyle = '#ffffff'
  c.font = 'bold 34px system-ui, sans-serif'
  c.fillText(yazi, 60, 100)
  c.font = '22px system-ui, sans-serif'
  c.fillStyle = 'rgba(255,255,255,0.65)'
  c.fillText('müşteri fotoğrafı · demo', 60, 140)

  const blob = await new Promise((r) => tuval.toBlob(r, 'image/jpeg', 0.7))
  const id = await ekYaz(blob)
  return { id, tur: 'foto', ad: yazi + '.jpg', boyut: blob.size }
}

/* ---------------------------------------------------- Talep parçaları

   Aşağıdaki üreticiler backoffice'in beklediği alan adlarını birebir
   dolduruyor (bkz. src/backoffice/ekranlar/Talepler.jsx). Bir alan
   eksik kalırsa o bölüm ekranda hiç çıkmıyor ve demo eksik görünüyor. */

function faturaUret(musteri) {
  const tuzel = Math.random() > 0.6
  const soyad = musteri.ad.split(' ').pop()
  return {
    tuzel,
    ad: tuzel ? '' : musteri.ad,
    tc: tuzel ? '' : String(tamsayi(10000000000, 99999999999)),
    unvan: tuzel ? soyad + ' Tarım Ltd. Şti.' : '',
    vergiNo: tuzel ? String(tamsayi(1000000000, 9999999999)) : '',
    tel: '+90 ' + musteri.tel,
    farkliKisi: false,
    adres:
      sec(['Yeni', 'Cumhuriyet', 'Atatürk', 'Fatih']) + ' Mahallesi, ' +
      tamsayi(1, 40) + '. Sokak No:' + tamsayi(1, 60),
    il: musteri.il,
    ilce: musteri.ilce,
    ulke: 'TR',
  }
}

function planUret(sonTarih, personel) {
  /* `tarih` ZAMAN DAMGASI da yazılıyor.

     Demo yalnızca `tarihYazi` üretiyordu; gerçek planlama ikisini
     birden yazıyor (bkz. veri.js → talepPlanla). Damga olmayınca
     "planlanan gönderim tarihi geçti" uyarısı hiçbir demo kaydında
     çalışmıyordu — ekranda gösterilecek örnek yoktu.

     Yalnız yedek parça talebinin gönderim planı (servis talebinin
     randevusunu servis akışı yazıyor). Backoffice gün VE saat soruyor:
     plan `saatBelirtildi: true` (bkz. lib/tarih.js → randevuSaatliMi).

     Bir kısmı bilerek GEÇMİŞ tarihli: gönderim gecikmesi uyarısının
     sunumda görünmesi için. */
  const gecmis = Math.random() < 0.5
  const zaman = gecmis
    ? sonTarih - 86400000 * tamsayi(1, 4)
    : sonTarih + 86400000 * tamsayi(1, 5)
  const d = new Date(zaman)
  return {
    saatBelirtildi: true,
    tarih: zaman,
    tarihYazi: d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    is: sec(PARCA_PLAN_IS),
    gorusuldu: true,
    personel,
    kayitTarihi: sonTarih,
  }
}

function teklifUret(sonTarih, personel) {
  return {
    tutar: String(tamsayi(85, 195) * 10000),
    gecerlilik: sec(['7 gün', '15 gün', '30 gün']),
    not: 'Fiyata teslim ve devreye alma dâhildir.',
    personel,
    tarih: sonTarih,
  }
}

/* Kapanış alanları türe göre değişiyor (bkz. Talepler ekranındaki
   KAPANIS_ALANLARI); demo da aynı alanları dolduruyor. */
function cozumUret(tur, parcalar, parcaAdet, personel, tarih) {
  /* Servis talebinin kapanışı burada üretilmiyor: servis kaydından
     çıkıyor (bkz. demoServis.js → servisAkisi). */

  if (tur === 'parca') {
    /* "Yapılan iş" gönderilen parçaların kendisi; personel yazmıyor,
       talepten geliyor (bkz. Talepler.jsx → KAPANIS_ALANLARI.parca).
       Not isteğe bağlı, demoda bir kısmında var. */
    return {
      yapilanIs: parcalar.map((x) => x + ' × ' + parcaAdet[x]).join(' · '),
      not: Math.random() < 0.35 ? sec(PARCA_KAPANIS_NOTU) : '',
      personel,
      tarih,
    }
  }

  const sonuc = sec(SATIS_SONUC)
  return {
    sonuc,
    satisFiyati: sonuc === 'Satış oldu' ? String(tamsayi(85, 195) * 10000) : '',
    not: 'Görüşme tamamlandı.',
    personel,
    tarih,
  }
}

/* İki tür not: iç not ekibin kendi arasında, müşteri notu telefona
   düşüyor. İkisi de demoda olsun ki ayrım ekranda görünsün.

   Not talebin türünden (NOTLAR). Garanti notu yalnız garanti süresindeki
   makinenin servis talebinde ve garanti dışı kapanmamış, reddedilmemiş
   işte; "Parçanız hazırlandı" yalnız ödemesi onaylanmış parça
   talebinde. */
function notUret({ tur, tarih, personel, garanti, senaryo, odemeVar }) {
  if (Math.random() < 0.45) return []
  const ic = [...NOTLAR[tur].ic]
  if (tur === 'servis' && garanti && !['garantiDisi', 'reddedildi'].includes(senaryo)) ic.push(GARANTI_NOTU)
  const musteriye = [...NOTLAR[tur].musteriye, ...(tur === 'parca' && odemeVar ? [PARCA_HAZIR_NOTU] : [])]
  const notlar = [
    { metin: sec(ic), tarih: tarih + 7200000, personel, musteriye: false },
  ]
  if (Math.random() > 0.5) {
    notlar.push({
      metin: sec(musteriye),
      tarih: tarih + 10800000,
      personel,
      musteriye: true,
    })
  }
  return notlar
}
