> ## ⚠ TARİHSEL KAYIT — güncel değil
>
> Bu belge projenin ilk aşamasının (Ağustos 2026) çalışma notları.
> Uygulama o günden beri çok değişti: bayi paneli kaldırıldı, servis
> uygulaması ayrıldı, ekosistem dört taraflı hâle geldi. Buradaki
> ayrıntılar bugünkü kodu anlatmıyor.
>
> **Bugünkü kurallar:** `CLAUDE.md`. **Klasörde ne var:** `README.md`.
>
> Silinmedi çünkü kararların neden öyle alındığını anlatan tek kayıt
> burası.

# PAKSAN Connect — Aşama 1 Notları

> Uygulamanın adı **PAKSAN Connect**. Telefonun ekranında ikonun altında
> bu yazıyor. Şirketin adı ayrı: "PAKSAN Makina". Ad üç yerde tanımlı —
> `src/config.js` (UYGULAMA), `capacitor.config.json`,
> `android/app/src/main/res/values/strings.xml`.

Sürüm: **0.9.11 (demo)** · Tarih: 24 Ağustos 2026

---

## Uygulamayı bilgisayarda açmak

`paksan` klasöründeki `dev.bat` dosyasına çift tıklayın. **Tarayıcıda iki
sekme kendiliğinden açılır:**

```
http://localhost:5174             → müşteri uygulaması
http://localhost:5174/backoffice.html  → PAKSAN Backoffice (personel)
```

İkisi aynı sunucudan geliyor; aynı tarayıcıda açık oldukları için
uygulamadan açılan talep backoffice’te görünüyor, backoffice’ten yapılan değişiklik
uygulamaya düşüyor.

Telefon görünümü için tarayıcıda F12 → cihaz simgesi (mobil görünüm).

> Sekmeler yalnız sunucuyu **siz terminalden** başlattığınızda açılıyor.
> Bir araç sunucuyu arka planda başlattığında açılmıyor — yoksa her
> yeniden başlatmada tarayıcınıza sekme yağardı. Ayar
> `vite.config.js` içinde.

---

## Telefona kurmak (demo APK)

Hazır dosya: **`apk/paksan-0.6.1-demo.apk`**

Önceki sürümler de `apk/` klasöründe duruyor; üzerine yazılmıyor.

Kurulum:

1. APK'yı telefona kopyalayın (USB, WhatsApp, e-posta — fark etmez).
2. Dosyaya dokunun. Android "bilinmeyen kaynak" uyarısı verecek;
   "Ayarlar"a gidip o uygulamaya (dosya yöneticisi veya WhatsApp) izin
   verin, sonra kuruluma devam edin.
3. Android 5.1 ve üzeri her telefonda çalışır.

Bu uyarı normaldir: APK **geliştirme imzasıyla** imzalanmıştır, Play
Store'dan gelmediği için Android tanımıyor. Play Store'a yüklemek için
gerçek bir imza anahtarı üretilmesi gerekir (Aşama 4).

### APK'yı yeniden üretmek

Kod değiştikten sonra yeni APK almak için, `paksan` klasöründe sırayla:

```
npm run build
npx cap sync android
cd android
gradlew.bat assembleDebug
```

Çıkan dosya: `android/app/build/outputs/apk/debug/app-debug.apk`

**24 Eylül 2026'dan beri Capacitor 8** (Google Play'in hedef API 36
şartı): SDK 36, Android Gradle Plugin 8.13, Gradle 8.14.3 ve **Java 21**
gerekiyor. Android Studio'nun kendi Java'sı (`jbr`) şu an 25 ve Gradle
8.14 onunla çalışmıyor; Gradle'a JDK 21 gösterilmeli (`JAVA_HOME` ya
da `org.gradle.java.home`). Eski not: Capacitor 6 döneminde SDK 34 ve
Java 17 yetiyordu; taşınabilir JDK 17 `D:\PAKSAN\_araclar\jdk-17`
klasöründe.

### Sürüm numarası

İki yerde tutuluyor, ikisi de elle güncelleniyor:

- `package.json` → `"version"`
- `android/app/build.gradle` → `versionName` ve `versionCode`
  (`versionCode` her yeni yüklemede bir artmalı, yoksa Android
  güncellemeyi kabul etmez)

### Uygulama kimliği

`com.paksanmakina.app` — Play Store'a bir kez yüklendikten sonra
**değiştirilemez**. Farklı bir kimlik isteniyorsa şimdi söylenmeli.

---

## İki dil: Türkçe ve İngilizce

Uygulama iki dilde çalışıyor. Dil seçimi **karşılama ekranının sağ
üstünde** ve **profil sayfasında**; tek dokunuşla değişiyor, seçim
telefonda saklanıyor. Hiç seçim yapılmadıysa telefonun dili öneriliyor.

**Çeviri nerede duruyor**

| Ne | Dosya |
|---|---|
| Ekran metinleri | `src/i18n/tr.js` ve `src/i18n/en.js` (aynı anahtarlar) |
| Ürün adları, açıklamaları, teknik özellikler, bakım takvimi | `src/data/products.en.js` |
| Bakım rehberleri | `src/data/rehber.en.js` |
| Destek ve kılavuz içeriği | `src/data/mobile_support_package.json` (her kaydın içinde `tr` ve `en` yan yana) |
| Talep formu seçenekleri | `src/data/talepAlanlari.en.js` |
| KVKK metinleri | `src/data/kvkk.en.js` |
| Ülke adları | `src/data/ulkeler.en.js` |

**Eksik çeviri uygulamayı bozmaz.** İngilizcesi yazılmamış bir metnin
yerine Türkçesi görünür. Eksik olup olmadığını görmek için
`tools/dil-kontrol.js` var (şu an eksik: 0).

**İki karar bilerek böyle yapıldı:**

1. **Model adları çevrilmedi**, yalnız Türkçe harfler sadeleştirildi
   (Süper Yunus → Super Yunus). Makinenin üstünde o ad yazıyor ve yedek
   parça talebinde o aranıyor; çevirmek yanlış olurdu. Ama yabancı
   müşteri "ç" ve "ü" yazamadığı için aramada bulamıyordu.

2. **Talepler her zaman Türkçe kaydediliyor.** Kullanıcı ekranda
   "Not tying knots" seçiyor ama Paksan'a gelen talepte "Düğüm atmıyor"
   yazıyor. Servis ekibi hangi dilde doldurulduğunu bilmek zorunda
   kalmıyor. Aynı şey kılavuz veri seti için de geçerli: kayıtlar
   birbirine kimlik numarasıyla bağlı, iki dil aynı kaydın içinde
   duruyor, çeviri yalnızca ekranda seçiliyor.

**Ülke ve bölge.** Türkçede eskisi gibi il + ilçe. İngilizce seçilince
önce ülke soruluyor; Türkiye'de yine il + ilçe, listesi olan 19 ülkede
eyalet/bölge seçimi + şehir yazımı, diğerlerinde ikisi de yazılıyor.
70 ülkenin ilçe listesini telefonda taşımak mümkün değil (yüz binlerce
satır) ve uygulama internetsiz çalışıyor. Ülke eklemek
`src/data/bolgeler.js` dosyasına bir dizi yazmak kadar kolay.

**Hizalama.** İki dil yan yana denendi ve ekranların hizası ölçülerek
düzeltildi. İngilizce metinler Türkçeden uzun olduğu için birkaç yerde
düzen kayıyordu:

- Sayfa başlığı tek satıra sıkıştırılıp kesiliyordu ("Maintenance
  Guides"); artık gerekirse iki satır oluyor, hiçbir yazı kaybolmuyor.
- Ürün ızgarasında yan yana duran iki karttan birinin adı tek, öbürünün
  iki satır olunca alttaki açıklamalar farklı hizada başlıyordu; ad için
  iki satırlık yer ayrıldı.
- Profil özet kutularından biri buton, öbürü düz kutuydu. Tarayıcı
  butonlara kendi satır yüksekliğini verdiği için içerideki sayı ve yazı
  5 piksel kayıyordu. Artık bütün butonlar sayfanın satır yüksekliğini
  devralıyor — bu düzeltme uygulamanın tamamını kapsıyor.
- Ana sayfadaki üç kısayol karosunda yazı bir veya iki satır olabiliyor;
  simgeler yine aynı hizada duruyor.

Her iki dilde 20 ekran taranarak doğrulandı: taşan yazı, kesilen satır,
kutusundan çıkan düğme ve yan yana kutularda yükseklik farkı yok.

**Çevrilmeyenler bilerek öyle:** bayi firma adları ve adresleri, il/ilçe
adları ve "Türkiye". Bunlar özel isim; çevrilirse müşteri adresi
bulamaz.

**Destek ekranındaki konuşma saklanmıyor.** Ekrandan çıkılınca siliniyor,
geri gelindiğinde baştan başlıyor. Dil de profil sayfasından
değiştirildiği için ekrandan çıkmayı gerektiriyor — yarısı Türkçe
yarısı İngilizce bir konuşma hiç oluşmuyor. Kayda geçen oturum ayrı
tutuluyor, o kaybolmuyor.

⚠ **KVKK metinlerinin İngilizcesi bir ÇEVİRİDİR**, ayrı bir hukuki metin
değil. Her metnin başında Türkçe aslın bağlayıcı olduğu yazılı.
Avrupa'daki müşteri için GDPR'a göre yazılmış ayrı bir metin gerekiyor
(bkz. PRODA-CIKIS.md → A3).

---

## 0.7.0 ile gelenler

Bu sürümde altı konu değişti. Hepsi hem Türkçe hem İngilizce çalışıyor.

### 1. Talep detay ekranı — bildirimlerin bir karşılığı oldu

**Sorun:** Bildirime dokunan müşteri profil sayfasındaki listeye
düşüyordu. Orada talebin yalnız durumu yazıyordu: "Talebiniz kapatıldı"
bildirimine dokunan çiftçi yine "Kapatıldı" yazısını görüyor, NEDEN
kapatıldığını öğrenemiyordu. Dokunmanın hiçbir karşılığı yoktu.

**Şimdi:** Her talebin kendi ekranı var (`/talebim/:id`). En üstte
talebin şu anki hâli, hemen altında PAKSAN'ın son sözü — iptal sebebi,
yapılan iş, verilen teklif, kargo takip numarası, ödeme durumu. Talebin
kendisi (ne sorulmuştu) altta.

Bütün bildirimler artık oraya gidiyor. Gidilecek yeri olmayan bildirimde
(duyuru, görüş cevabı) ok işareti hiç çıkmıyor — dokununca bir şey
olacağı izlenimi verilmiyor.

Profildeki talep kartına dokununca da aynı ekran açılıyor; kaydırınca
yine silme düğmesi çıkıyor.

### 2. İptal artık sebepsiz yapılamıyor

Backoffice’te bir talep iptal edilirken sebep soruluyor (hazır liste + serbest
açıklama). Yazılan şey müşterinin uygulamasında **aynen** görünüyor ve
bildirimde de yazıyor. Sebep girilmeden iptal edilemiyor.

### 3. Duyurular

Backoffice’te **Duyurular** ekranı açıldı (admin ve yönetici). İki tür var:

| Tür | Kime gider |
|---|---|
| **Duyuru** (kampanya, yeni ürün) | Yalnız ticari ileti izni verenlere — 6563 sayılı kanun gereği |
| **Önemli uyarı** (güvenlik, geri çağırma) | Herkese; hizmete ilişkin bildirim, izin gerektirmez |

Müşteride iki yerde birden görünüyor: uygulamayı bir sonraki açışında
**pencere** olarak, sonrasında Bildirimler listesinde kalıcı olarak.
Pencereyi kapatmak duyuruyu okundu saymıyor — listede mavi noktası
duruyor.

> Metin çevrilmiyor. Yurtdışı müşterisi için ayrıca İngilizce bir
> duyuru yayınlanmalı.

### 4. Müşteriye not gönderme

Talep notları ikiye ayrıldı:

- **İç not** — yalnız backoffice’te görünür, ekibin kendi arasında.
- **Müşteriye gönder** — müşterinin uygulamasına düşer ve bildirim
  gider. Kargo takip numarası buradan iletiliyor.

Kapanmış talebe de not eklenebiliyor; parça kargoya verildikten sonra
takip numarası ancak böyle iletilir.

### 5. Fiyat teklifinde "Teklif Verildi" aşaması

Önceden teklif talebi "İncelemede"den doğrudan "Kapandı"ya gidiyordu.
İki farklı şey aynı kutuda görünüyordu: fiyatı henüz çalışılmamış talep
ile fiyatı verilip müşterinin cevabı beklenen talep.

Yeni aşama: **Yeni → İncelemede → Teklif Verildi → Kapandı**

- *Teklif Verildi* ekranında teklif tutarı, geçerlilik ve not soruluyor.
  **Sonuç sorulmuyor** — sonuç henüz yok.
- *Kapandı* ekranında sonuç (Satış oldu / Müşteri vazgeçti / Rakibe
  gitti / Ulaşılamadı) ve **sonuçlanan satış fiyatı** soruluyor. Teklif
  tutarı ile satış fiyatı ayrı ayrı duruyor ki pazarlık payı görünsün.
- Teklif verileli **14 gün** geçip müşteri dönmediyse: talep listede mor
  kum saatiyle işaretleniyor, Dashboard'da "Cevap bekleyen teklif"
  kutusunda sayılıyor ve backoffice açıkken tarayıcı bildirimi gidiyor.
  Süre `src/backoffice/veri.js` → `TEKLIF_BEKLEME_GUN`.

Bu bekleme "48 saati geçen" ile karıştırılmıyor: orada kimse bakmamıştır,
burada bakılmış ve top müşteridedir. İkisi ayrı işaret, ayrı kutu.

### 6. Yedek parça: adet, fatura, ödeme, kargo

**Uygulamada** yedek parça talebi artık iki adımlı:

1. **Talep** — makine, parçalar, **her parça için adet**, açıklama,
   fotoğraf, aranma saati. *Aciliyet sorusu kaldırıldı* — herkes "hemen"
   diyordu, sıralamaya katkı vermiyordu.
2. **Fatura ve Ödeme** — yeni ekran:
   - Fatura tipi: şahıs (TC kimlik no) veya firma (ünvan + vergi no).
     İkisi de **kendi içinde doğrulanıyor**; yanlış numara girildiği anda
     yakalanıyor, iki gün sonra telefonla değil.
   - Ad ve telefon hesaptan geliyor; "fatura başka birinin adına
     kesilecek" işaretlenirse elle girilebiliyor.
   - Teslimat adresi (il/ilçe + açık adres).
   - PAKSAN hesap bilgileri ve havale açıklaması, kopyala düğmeleriyle.
   - Dekont yükleme (fotoğraf veya PDF).

   Talep numarası bu adımda üretiliyor ve ekranda yazıyor: müşteri
   havalenin açıklamasına o numarayı yazıyor, muhasebe ödemeyi talebe
   eşleştirebiliyor.

**Backoffice’te** yedek parça talebinde:

- Fatura, teslimat adresi ve dekont görünüyor; dekont tıklanınca açılıyor.
- **Ödemeyi onayla** düğmesi — dekont ve hesaba geçen tutar kontrol
  edilip onaylanıyor, müşteriye "ödemeniz alındı" bildirimi gidiyor.
- Yeni durum: **Gönderildi**. Kargo firması ve takip numarası isteğe
  bağlı; girilirse müşteriye bildirimle birlikte gidiyor. Bu durum talebi
  kapatıyor.

> **⚠ BANKA HESABI TANIMLI DEĞİL.** `src/config.js` → `BANKA` bloğu boş
> ve `aktif: false`. Bu hâliyle ödeme ekranı IBAN göstermiyor, "hesap
> bilgileri için bizi arayın" diyor. Yanlış IBAN'a para göndermek geri
> dönüşü zor bir hata olduğu için uydurma numara konulmadı. Muhasebeden
> gerçek IBAN'lar alınıp yazılmalı ve `aktif: true` yapılmalı.

> **Dekont zorunlu.** Talep, dekont yüklenmeden gönderilemiyor. Tarlada
> parça sipariş edip parayı akşam evden gönderecek müşteri, bu hâliyle
> talebi hiç açamaz. Böyle bir senaryo yaşanırsa `odemeDevam()`
> içindeki dekont kontrolü isteğe bağlıya çevrilebilir; backoffice tarafı
> zaten "ödeme onayı bekliyor" durumunu gösteriyor.

### 7. Fiyat teklifinden sonra ürün sayfası önerisi

Teklif talebi gönderildikten sonra "Talebiniz alındı" ekranında
*"{Ürün} ürününü incelemek ister misiniz?"* kartı çıkıyor. Kendiliğinden
yönlendirme yok — işin bittiğini görmek isteyen kişiyi habersiz başka
sayfaya atmak şaşırtır; soruluyor, isteyen dokunuyor.

### 8. Destek ekranı oturum kaydı

Destek ekranındaki her konuşma kaydediliyor: kim, hangi makine, hangi
konu, hangi soru, cevap bulundu mu, sonunda talep açtı mı.

Backoffice’te **Destek Kayıtları** ekranı (admin/yönetici):

- En üstte **cevapsız kalan sorular** — müşterinin yazdığı ama bilgi
  tabanının karşılayamadığı cümleler, sıklık sırasıyla. Bu liste doğrudan
  `src/data/destek.js` dosyasına yazılacak kayıtları gösteriyor.
- Oturum listesi ve tek tek konuşma akışı.
- Excel'e aktarılabiliyor.

Raporlarda da **Destek ekranı konuları** raporu var: hangi makinede kaç
konuşma, kaç cevapsız, kaçı talebe döndü.

Oturum, aynı makinede 30 dakika içindeki hareketlerden oluşuyor. Bot
cevaplarının tam metni saklanmıyor — o zaten bilgi tabanında duruyor.

> KVKK aydınlatma metnine fatura bilgisi ve teslimat adresi kalemleri
> eklendi. Destek kayıtları zaten yazılıydı. **Hukukçu onayı gerekiyor.**

### 9. Raporlar yeniden düzenlendi

Yöneticinin ilk sorusu — "bu dönemde ne kadar iş yaptık" — hiçbir raporda
cevaplanmıyordu. Backoffice tutarları baştan beri topluyordu (kapanışta
girilen servis ücreti, parça tutarı, verilen teklif) ama hiçbir yerde
toplanmıyordu.

Yeni raporlar:

| Rapor | Ne cevaplıyor |
|---|---|
| **Para akışı ve satış hunisi** | Hunide bekleyen tutar, satışa dönen, kaybedilen, servis + parça tahsilatı, garanti kapsamında yapılan ücretsiz iş |
| **Garanti maliyeti** | Hangi modelde servislerin kaçı garanti içinde — imalatçı için en pahalı satır |
| **Müşteri sadakati** | Kaç müşteri ikinci kez döndü, kim kaç kez geldi |
| **Destek ekranı konuları** | Müşteri destekte ne arıyor, nerede cevapsız kalıyor |

Değişen raporlar:

- **Dönem özeti**: bir önceki eşit dönemle yüzde karşılaştırma, toplam
  satırı ve **"en yavaş %10"** sütunu. Ortalama kapanma süresi iyi
  görünürken müşterilerin onda biri haftalarca bekliyor olabiliyor;
  ortalama bunu gizliyor.
- **Fiyat teklifi sonuçları**: artık yalnız kapanmışlar değil, fiyatı
  verilmiş her teklif listede — bekleyenler kaç gündür beklediğiyle.
- **Bekleyen işler** (eski adı "Gecikmiş talepler"): iki tür bekleme bir
  arada, "neden bekliyor" sütunu ikisini ayırıyor.

Garanti durumu **talebin açıldığı tarihe** göre hesaplanıyor, bugüne göre
değil: iki yıl önceki bir servis o gün garanti kapsamındaydı.

> Tutarlar personelin backoffice’e girdiği rakamlardan geliyor. Bu bir muhasebe
> kaydı değil; kesin ciro Logo'daki faturadan okunur.

### 10. Backoffice’te talep detayında "Aktif diğer talepler"

Eski hâli iki sorunluydu:

1. Yalnız **daha eski** talepler görünüyordu. Bu ilişkiyi tek yönlü
   yapıyordu: A'nın içinde B yazıyor ama B'nin içinde A yazmıyordu.
2. Kapanmışlar da listeleniyordu ve yıllar içinde birikip bu alanı
   şişiriyordu.

Şimdi varsayılan yalnız **açık** talepler, zaman sırası gözetilmeden.
Geçmişin tamamı **"Tümü"** düğmesinin ardında.

### 11. Küçük düzeltmeler

- Fiyat teklifi formundaki **"Ne balyalayacaksınız?"** seçenekleri hiç
  çizilmiyordu (boş bir kutu duruyordu); düzeltildi.
- Backoffice’te başka bir talep seçilince detay bölümü sıfırlanıyor. Önceden
  yarım kalmış not, açık form ve açılmış "Tümü" görünümü bir sonraki
  talebe taşınıyordu — personel yanlış talebe not yazabiliyordu.
- Android geri hareketi çok adımlı formda bir önceki **adıma** dönüyor,
  uygulamadan çıkmıyor.
- Dev sunucusu `PORT` ortam değişkenini okuyor; aynı proje iki kez
  birden çalıştırılabiliyor. Elle çalıştırırken yine 5174.

---

## 0.8.0 ile gelenler

### Yedek parça fiyat listesi

`src/data/parcaFiyat.js` — 30 parça, her biri parça kodu ve birim
fiyatıyla.

> **⚠ FİYATLAR GERÇEK DEĞİL.** Hepsi demo için uydurulmuş sayılar.
> Yedek parça biriminden gerçek liste alınıp buraya yazılmalı; parça
> kodları da öyle. Gerçek liste girilene kadar `PARCA_FIYAT_AKTIF`
> false yapılırsa ekran hiç fiyat göstermez.

Müşteri parça seçerken birim fiyatı, satır tutarını ve KDV'li toplamı
görüyor; ödeme adımında "gönderilecek tutar" en üstte yazıyor. Backoffice’te
de "beklenen tutar" var — ödemeyi onaylayan personel dekonttaki rakamı
neyle karşılaştıracağını görüyor.

Fiyatı olmayan tek seçenek "Diğer"; o durumda backoffice’te "toplam EKSİK"
uyarısı çıkıyor.

**"Bilmiyorum, siz bakın" kaldırıldı, yerine "Diğer" geldi.** Parça
sipariş eden çiftçi ne istediğini bilir; bilmiyorsa açtığı şey parça
talebi değil servis talebidir. Üstelik o seçenek adet kutusuna da
düşüyordu — "bilmiyorum"dan 3 adet istenemez. "Diğer" seçilince adet
sorulmuyor ve başka parça seçilemiyor.

### Talep listesinde tarih ve saat

"3 saat önce" yerine tarih (üstte) ve saat (altta). Göreli süre
okunması kolay ama iş görmüyor: müşteri "salı sabahı aramıştım" diyor,
ekranda "2 gün önce" yazıyor ve eşleşmiyor.

### Tablolarda sütun sıralaması

Backoffice’in bütün tablolarında sütun başlığına tıklanınca o sütuna göre
sıralanıyor, tekrar tıklanınca yön dönüyor. Talepler, Müşteriler,
Bayiler, Personel, İşlem Kaydı ve **bütün raporlar**.

Sıralama gördüğü yazıya değil, arkasındaki değere bakıyor: "Tarih /
Saat" sütunu zaman damgasına, "1.850.000" sayıya, "Orkinos 1270"
Türkçe alfabeye göre. Boş hücreler yön ne olursa olsun sonda kalıyor.
Dönem özetindeki TOPLAM satırı sıralamaya karışmıyor, tablonun dibinde
sabit duruyor.

### Bayiler ekranına arama

Bayi adı, il/ilçe, adres ve telefonda arıyor. Telefon boşluksuz da
bulunuyor.

### Duyurulara görsel

Duyuru ve uyarılara görsel eklenebiliyor. **Önerilen ölçü 1200 × 675
piksel (16:9), en fazla 5 MB, JPG veya PNG** — bu bilgi ekranda da
yazıyor. Başka oranda görsel kırpılmıyor, olduğu gibi gösteriliyor
(kampanya görselindeki yazı kesilmesin).

Görsel uygulamada duyuru penceresinin tepesinde çıkıyor.

### Dashboard

| Ne | Değişiklik |
|---|---|
| Talep Kalan Süreleri | Orta dilim turuncu yerine **sarı** — turuncu ile kırmızı yan yana karışıyordu |
| Talep türü | Başlığa "Tüm zamanlar · N talep" eklendi; yandaki grafik dönem süzgecine bağlı, bu değil |
| Durum dağılımı | Adı **Talep Statü Dağılımı** oldu |
| Tamamlanma Oranı | Yerine **Aynı Gün Açılan Talep Oranı** geldi |

**Aynı Gün Açılan Talep Oranı nasıl hesaplanıyor:** her iş günü için o
gün gelen taleplerin kaçı aynı gün içinde "Yeni" durumundan çıkmış diye
bakılıyor, sonra bu günlük oranların ortalaması alınıyor. Hiç talep
gelmeyen günler, hafta sonları ve **bugün** (henüz bitmedi) hesaba
girmiyor. Kutunun altında kaç iş gününün ortalaması olduğu yazıyor.

Günlük oranların ortalaması alınıyor, toplam üzerinden tek oran değil:
tek oran yoğun günleri ağırlıklandırır, sakin günlerdeki ihmali
gizlerdi.

**Rol bazlı görünürlük:**

| Kutu / grafik | Kim görüyor |
|---|---|
| Cevap bekleyen teklif | Satış + yönetim |
| Numara talebi, Okunmamış görüş, Müşteri adedi | Yalnız yönetim |
| Talep türü grafiği | Yalnız yönetim |
| Geri kalan hepsi | Herkes |

### Fiyat teklifi taleplerinde bayi bilgisi

Makineleri bayiye satıyoruz, son kullanıcıya bayi satıyor. Fiyat
teklifi talebinin içinde artık "İlgili bayi" bölümü var:

1. Müşterinin **ilçesindeki** satış bayisi
2. Yoksa **ilindeki** satış bayisi
3. İlinde bayi yoksa **kuş uçuşu en yakın üç bayi**, mesafeleriyle

Üçüncü kademe için il merkezi koordinatları eklendi
(`src/data/ilKoordinat.js`). Yalnız satış yetkisi olan bayiler
gösteriliyor — parça bayisine makine teklifi yollamanın anlamı yok.

### Yurtdışı talepleri

Konumu Türkiye dışında olan müşterinin talebi **backoffice’e düşmüyor**;
ihracat ekibinin e-postasına gidiyor ve kayda geçiyor.

Karar konum ülkesine göre veriliyor, telefon ülkesine göre değil:
Almanya'da yaşayan ve Türk numarası taşıyan müşteri yurtdışı
müşterisidir, makinesi oradadır.

`src/lib/ihracat.js` e-posta gövdesini hazır üretiyor (İngilizce, tek
sütun, telefonda da açılır). Sunucu bağlandığında yalnız yollaması
yeterli; ikinci bir şablon yazılmasına gerek yok.

> **⚠ E-POSTA ADRESLERİ DOLDURULMADI.** `src/config.js` → `IHRACAT.epostalar`.
> Adres girilmeden de talep işaretleniyor ve backoffice’ten gizleniyor;
> e-posta sunucu gelince gidecek.

### Uygulama

**Bildirimlerde randevu artık listeyi bozmuyor.** Yaklaşan randevu
listenin İÇİNDE değil ÜSTÜNDE, ayrı bir turuncu kartta. Önceden zamanı
geleceğe kurulup listenin başına zorlanıyordu ve yeni gelen bildirim
ikinci sıraya düşüyordu — müşteri "bildirim gelmemiş" sanıyordu.

**Profilde talepler ikiye ayrıldı:** "Açık Talepler" ve
"Tamamlananlar". Her sekme ilk beş satırı gösteriyor, gerisi "daha
fazla" düğmesinin ardında. Durum artık renkli hap hâlinde; düz yazıyla
yazınca satırların arasında kayboluyordu.

**Talep türü renkleri backofficele eşitlendi:** servis turuncu, yedek parça
mor, fiyat teklifi mavi. Önceden uygulama servisi kırmızı, parçayı
turuncu gösteriyordu; telefonda konuşurken karışıklık üretiyordu.

**Gönderildi mesajı türe göre değişiyor.** Servis ve yedek parçada
artık "sizi arayacağız" demiyoruz — servis randevusu bildirimle
gidiyor, parça kargoya veriliyor; aramayı gerektiren bir şey yok.
Tutulmayacak söz, tutulan sözü de değersizleştiriyor. Fiyat teklifinde
söz duruyor: satış ekibi fiyatı telefonda konuşuyor.

**Fatura ekranında TC kimlik numarası aşağı alındı.** Önceden kutu en
üstteydi, "başkası adına" seçeneği altındaydı: kullanıcı kendi
numarasını yazıyor, sonra başkasının adını giriyor ama yukarıda kalan
kimlik numarasını değiştirmeyi unutuyordu. Artık kimlik numarası, adı
ve telefonuyla aynı öbekte ve onlardan sonra; "başkası" seçiliyken
etiketi de değişiyor.

### Kılavuzdaki arızalar artık yerinde açılıyor

"Sık karşılaşılan sorunlar"da bir arızaya dokununca çözüm adımları
satırın altında açılıyor. Önceden kullanıcı sohbet ekranına atılıyor ve
aynı soru orada kendiliğinden soruluyordu — cevap zaten kılavuzun
elindeyken gereksiz bir yolculuktu. Sohbet hâlâ bir tık uzakta ama
zorunlu değil.

### Düzeltilen hata: her ekran iki kez kuruluyordu

`Gecis` bileşeni sayfa anahtarını bir effect içinde güncelliyordu ve bu,
her gezinmede alt ağacı söküp yeniden kuruyordu. Görünür sonucu:
kılavuzdan destek ekranına geçildiğinde soru **iki kez** gönderilip
**iki kez** cevaplanıyordu.

Sunucu bağlandığında bu, her açılışta çift istek demek olurdu. Anahtar
artık çizim sırasında hesaplanıyor; ekran adres başına tam olarak bir
kez kuruluyor. Ayrıca destek ekranındaki gönderim yeniden girişe
kapatıldı (durum değil, ref ile) — aynı karede iki çağrı gelse bile tek
istek gidiyor.

---

## 0.9.0 ile gelenler

### Destek ekranı baştan yazıldı — kılavuzdan teşhis

Eski soru-cevap seti **tamamen kaldırıldı**. Yerine PAKSAN'ın beş
kullanım kılavuzundan çıkarılmış, her kaydı kaynak sayfasıyla
doğrulanmış bir **karar ağacı** geldi.

**Akış:** Makine → Arıza → evet/hayır kontrol soruları → Sebep + çözüm

Kılavuzda "ip düğümlenmiyor"un altı ayrı sebebi var ve hangisi olduğu
ancak makineye bakılarak anlaşılıyor. Eski sürüm hepsini birden
döküyordu; yeni sürüm tek tek soruyor ve yalnız tutanın çözümünü
veriyor. Çözüm adımlarında kılavuzdaki parça kodları da geliyor
(`Mekik dili pimini değiştirin (131-29)`).

**Her cevabın altında kaynağı yazıyor:** `HAMMER KULLANIM KILAVUZU · s. 34`

| Kılavuz | Sayfa | Arıza | Kontrol | Çözüm |
|---|---|---|---|---|
| Hammer | 50 | 25 | 52 | 53 |
| Twin Hammer | 49 | 25 | 52 | 53 |
| Paksan Balya (Süper/Yunus) | 57 | 25 | 49 | 50 |
| i-Pak Yuvarlak Balya | 61 | 25 | 26 | 27 |
| Orka 870 | 164 | 23 | 23 | 24 |

Ayrıca 223 teknik değer ve 262 güvenlik notu.

**Nasıl üretiliyor:** `python tools/destek-uret.py`

Betik `paksan-support-dataset/output/` klasöründeki doğrulanmış
kayıtları okuyup `src/data/destek.js` dosyasını üretiyor.
**Bu dosya ELLE DÜZENLENMEZ** — elle eklenen cümlenin kaynağı olmaz ve
bir sonraki üretimde kaybolur. Kılavuz güncellenince veri seti yeniden
üretilir, sonra bu betik çalıştırılır.

Betik ağacın bütünlüğünü de denetliyor: kırık bağ varsa üretim hata
veriyor.

> **13 arıza uygulamaya alınmadı.** Teşhis ağaçları veri setinde insan
> incelemesinde bekliyor. Dokununca hiçbir yere gitmeyen düğme koymak
> yerine dışarıda bırakıldılar; onaylandıklarında betik yeniden
> çalıştırılınca gelirler. Listeyi betik çıktısında görebilirsiniz.

**Kaldırılan dosyalar:** `src/lib/ai.js`, `src/data/destek.en.js`.
Yeni motor: `src/lib/destekMotor.js`.

**Kılavuz ekranı** da bu veriye bağlandı: "Sık karşılaşılan sorunlar"
artık kılavuzun kendi arıza kayıtlarını gösteriyor ve satıra
dokununca teşhis akışı başlıyor.

> Kılavuzu veri setinde olmayan makinelerde (yem karma, silaj, çayır,
> toprak işleme) destek ekranı teşhis yapmıyor, bunu açıkça söylüyor ve
> servise yönlendiriyor.

### Yedek parça akışında mantık düzeltmeleri

- **Açıklama zorunluluğu kalktı.** Parça listeden seçiliyor, adedi ayrı
  alanda; ayrıca paragraf yazdırmanın karşılığı yoktu. Yalnız "Diğer"
  seçildiyse hâlâ zorunlu.
- **Müşteriye not göndermek onay istiyor.** Gönderilen not geri
  alınamıyor, bildirim anında düşüyor; iki düğme yan yana olduğu için
  yanlışına basmak kolaydı. İç notta onay yok.
- **Ödeme onaylanmadan ilerlenemiyor.** "Yeni"den başka bir duruma
  geçmek için önce ödeme onayı gerekiyor; çipler kilit işaretiyle
  görünüyor ve tıklanınca doğrudan ödeme onayına götürüyor. İptal bu
  kuralın dışında.
- **Ödeme onaylanınca talep kendiliğinden "İncelemede"ye geçiyor.**
- **"Tutar" alanı Gönderildi ve Kapandı ekranlarından kaldırıldı.**
  Para talebin başında alınıyor ve tutar fiyat listesinden belli; aynı
  rakamı ikinci kez elle yazdırmak iki kayıt üretiyordu.
  Para akışı raporu artık parça gelirini fiyat listesinden hesaplıyor.

### Bayi telefonu tıklanabilir değil

Backoffice masaüstü tarayıcıda açılıyor; oradan arama başlatmak işe
yaramıyordu.

### "Aynı gün açılan talep oranı" artık gerçek çalışma günlerine bakıyor

Hangi günün iş günü olduğu takvimden değil, **personelin backoffice’e giriş
kaydından** okunuyor. Resmî tatil ve izin günleri ortalamayı haksız
yere düşürmüyor; hafta sonu vardiyası da sayılıyor. Kutunun altında
"N çalışılan gün ortalaması" yazıyor.

### Yönetim tanıtım dokümanı

`sunum/paksan-connect-tanitim.html` — yöneticilere sunulacak, sonra
detaylı okunabilecek tanıtım dokümanı. Ekran görüntüsü yerleri
hazırlandı, henüz doldurulmadı.

---

## 0.9.11 — Simgeler Higgsfield çizimlerinden, alt menü düzeni

### Bütün simgeler yeniden üretildi

Uygulamanın ve backoffice'in 46 simgesi Higgsfield ile üretildi. Elle
çizilen simgelerin hiçbiri kalmadı.

**Asıl mesele şuydu.** Üretilen çizimler PNG. PNG olarak konulamazlardı:
simgeler alt menüde seçili sekmede beyaz, seçilmemişte soluk, karanlık
modda bambaşka bir renk oluyor. Hazır bir PNG tek renkte donar ve 24
pikselde bulanıklaşır. Elle benzerini çizmek de doğru cevap değildi —
o zaman ekranda görünen şey üretilen çizim değil, ona benzetilmiş başka
bir çizim olurdu.

Üçüncü yol kuruldu: **üretilen çizimin kendisi izlenip vektöre
dönüştürülüyor.** Ekranda görünen şey birebir üretilen çizim, ama vektör
olduğu için her boyda net ve istenen renge dönüyor.

    python tools/ikon-svg.py tools/kaynak/ikon-referans-1.png ev izgara ...

Betik sayfayı siyah-beyaza indiriyor, mürekkebi satır ve sütunlara
ayırıp simgeleri tek tek kesiyor, her birini izleyip 24 birimlik kutuya
oturtuyor. Çıktı `src/data/ikonYollari.js` — **bu dosya elle
düzenlenmez**, bir simgeyi değiştirmek için sayfa yenilenip betik
yeniden çalıştırılır.

**Anlamlar korundu.** Yedek parça altıgen somun (dişli değil — dişli
"ayar" demek), seri numarası dört köşesinden perçinli künye (barkod
değil — uygulamada barkod okuma yok), personel kimlik kartı, kayıt
geçmişi saatli ok.

**Makine simgesi iki kere üretildi.** İlkinin çeki oku uzundu, simge
1,86 oranında yayılıyor ve alt menüde komşularının yarısı boyunda
kalıyordu. İkincisi derli toplu: 1,18 oran, aynı ağırlıkta duruyor.

### Alt menüde seçili renk yazıyı değil simgeyi sarıyor

Mavi hap sekmenin tamamıydı; simgeyi ve yazıyı birlikte içine alıyordu.
Sekmenin genişliği sabit (menünün beşte biri) ama yazının genişliği
değişken. İkisi birbirine yaklaşınca hap yazıyı sıfır payla sarıyordu —
ölçüldü, 279 piksellik ekranda yazının iki yanında **birer piksel**
kalıyordu.

Kapsül artık yalnız simgenin arkasında: 46x32 piksel, simgenin
çevresinde yatayda 11, dikeyde 4 piksel pay var. Yazı kapsülün dışında,
altında; ne kadar uzarsa uzasın kapsüle dokunmuyor. Ayar değil düzen
düzeltmesi — sorun bir daha çıkmaz.

### Profildeki bildirim satırı kaldırıldı

Aynı bilgi zaten İzinler ekranında duruyordu. İzin isteme ve bildirim
gösterme altyapısı yerinde.

---

## 0.9.10 — Teknik özellikler, gerçek bildirim ve karanlık mod düzeltmesi

### Teknik özelliklerin tamamı geldi

Ürün sayfasında elle yazılmış dört beş satırlık bir özet vardı. Oysa
paksanmakina.com.tr'de aynı makinenin kırk satırı aşan tablosu duruyor:
piston kursu, tırmık teli sayısı, sac kalınlıkları, lastik ölçüleri.
Makineyi alacak ya da yedek parça arayacak kişi tam olarak bunlara
bakıyor.

**Yirmi ürünün tablosu alındı: 510 satır, 1108 dolu hücre.**

Tablolar sitede sayfanın içinde değil; sonradan yükleniyor. İki betik
işi yapıyor:

    python tools/teknik-cek.py      siteden çeker
    python tools/teknik-uret.py     src/data/teknikOzellikler.js üretir

**Ekranda nasıl duruyor.** Kırk satırı alt alta dökmek ürün sayfasını
kullanılamaz hâle getirirdi. Özellikler kaynaktaki bölümlerine ayrılmış
(BALYA ÖLÇÜLERİ, PİSTON, LASTİK ÖLÇÜLERİ...) ve bölümler kapalı
geliyor; her başlıkta kaç özellik olduğu yazıyor. İlk bölüm açık —
hepsi kapalı olsaydı altında ne olduğu anlaşılmaz, kimse dokunmazdı.

**Model seçici.** Bir üründe birden çok model olabiliyor; Diamond'ın on
hacmi var. Telefonda on sütunlu tablo göstermek imkânsız. Üstte model
seçici duruyor, altta yalnız seçili modelin değerleri. O modelde
karşılığı olmayan satır hiç çizilmiyor: boş satır "bilgi eksik"
izlenimi verirdi, oysa o özellik o modelde yok.

Özet tablo kaldırılmadı. Makineye ilk bakan "balya ölçüsü ne, kaç
beygir traktör ister" diye bakıyor; o dört beş satır açmadan görünüyor.

Aynı bölüm kayıtlı makinenin sayfasında da var.

**Sitede iki hata bulundu.** Scorpion Silaj'ın tablosu Türkçe sitede
baştan sona İspanyolca yazılmış (Largo, Anchura, Peso...); Türkçeye
çevrildi. Süper 8002 ve 8002E'de üç sütunun üçüne de aynı ad yazılmış
("8002") ama değerleri farklı — üçü ayrı model. Ad uydurulmadı,
şimdilik numaralandılar; **gerçek model adları PAKSAN'dan öğrenilince
düzeltilecek.**

### Bildirim izni artık gerçekten soruluyor

APK'da bildirim izni penceresi hiç açılmıyordu. İki sebebi vardı:
uygulama yalnızca tarayıcının bildirim arayüzünü kullanıyordu ve o
arayüz Android'in içinde yok; ayrıca izin AndroidManifest'te ilan
edilmemişti — Android o satır olmadan pencereyi hiç açmıyor.

Artık Android'in kendi izni isteniyor ve bildirimler telefonun bildirim
perdesine düşüyor. Bildirime dokununca ilgili ekran açılıyor.

**İzin verilir verilmez ilk bildirim çıkıyor.** Kullanıcı hem iznin
çalıştığını görüyor hem PAKSAN bildiriminin telefonunda nasıl
durduğunu.

**Profile "Bildirimler" satırı eklendi.** İzin kayıtta bir kez
soruluyordu; "şimdi değil" diyenin ya da uygulamayı önceden kurmuş
olanın geri dönecek yeri yoktu. Reddedilmiş izinde düğme "İzin ver"
demiyor — Android ikinci kez sormuyor, satır telefon ayarlarını tarif
ediyor.

Bunlar **yerel** bildirim: uygulamanın kendisi koyuyor, dolayısıyla
uygulama en az bir kez açılmış olmalı. Uygulama hiç açılmadan bildirim
gitmesi için sunucu ve Firebase gerekiyor.

### Karanlık modda seçili düğmeler görünüyor

Lacivert iki ayrı iş yapıyordu: koyu çerçeve (alt menü, yan menü,
bildirim şeridi) ve dolu eylem zemini (birincil düğme, seçili seçenek,
seçili hap). Aydınlıkta ikisi de çalışıyor, karanlıkta ayrışıyorlar.

Ölçüldü: karanlık modda seçili hap ile kart yüzeyi arasındaki kontrast
uygulamada **1,08:1**, backoffice'te **1,04:1** idi. Yani seçili düğme
seçilmemişten ayırt edilemiyordu; tek belirti yazının kalınlaşmasıydı.

Dolu eylemler ayrı bir renk belirtecine taşındı. Karanlıktaki ton
ölçülerek seçildi: kart yüzeyine karşı **3,54:1** (arayüz ögeleri için
aranan 3:1'i geçiyor), üstündeki beyaz yazı **4,63:1** (okunabilirlik
için aranan 4,5:1'i geçiyor). İki ölçüt ters yönde çalıştığı için ton
daha açılamıyor. Aydınlık mod hiç değişmedi.

### Karşılama sahnesi

**Mavi şerit çayır oldu.** Üretilen görselin kendi gökyüzü kırpılmıştı
ama tepe çizgisi sağa yükseldiği için sağda bir parçası kalmıştı.
Tarlanın üstündeki mavi su çağrıştırıyordu; PAKSAN tarım makinesi
üreticisi, sahnede denizin işi yok. Üst kenarı da yumuşatıldı — kesik
kırpma çizgisi kalmadı.

    python tools/karsilama-cayir.py

**Amblem yazının üstüne geldi.** Beyaz daire içinde, tam renkli: kalkan
amblemi koyu gökyüzünde beyaza çevrilirse tanınmaz bir lekeye dönüyor.
Amblem yazıdan yarım saniye önce doğuyor.

**Güneş artık doğuyor.** Bitmiş hâlde neredeyse tamamı ufkun üstündeydi;
sahne "gün doğumu" değil "gündüz" gibi duruyor, düğmelerin altındaki
yazılar turuncu kürenin üstüne düşüp okunmuyordu. Şimdi büyük kısmı
tarlanın arkasında.

Android açılış ekranı da sahneyle örtüşsün diye yeniden üretildi:

    python tools/acilis-ekrani.py

### Karşılama düğmeleri ne yaptığını söylüyor

"Hemen Başlayın" ne yaptığını söylemiyordu, zaten üye olan da ona
basıyordu. Düğmeler **"Kayıt Ol"** ve **"Giriş Yap"** oldu, altlarında
kimin hangisine basacağı yazıyor. Kayıt hâlâ ön planda.

### Görünüm ayarı iki seçenek

Üç düğme profil satırına sığmıyor, yazılar kırpılıyordu. "Otomatik"
kaldırıldı ama davranışı kaybolmadı: hiç dokunulmamışsa telefonun
ayarı geçerli.

### Simgeler

45 simgenin tamamı gerçek kullanım boylarında (46 ve 22 piksel) yan
yana çizilip tek tek bakıldı. Ölçek küçüldüğünde dağılan **dördü**
yeniden çizildi: Raporlar, Talepler, Durdur, Pano.

Alt menüdeki **Makineler** simgesi, boş liste çizimindeki makineyle
aynı hâle getirildi — kullanıcı aynı kavramı iki ayrı resimle
öğrenmesin. **Seri numarası** simgesi dört köşesinden perçinli künyeye
dönüştü; önceki hâlde perçinler yalnız üstteydi, etiket bir kenarından
asılmış gibi duruyordu.

Geri kalan 41'i değişmedi: hem temiz hem tutarlılar, üstelik bir kısmı
bilerek öyle çizilmiş. En belirgin örnek yedek parça simgesi — dişli
sanılabilir ama somun; dişli "ayar" demek. Hepsini yeniden üretmek bu
ayrımları silerdi.

Simgeler PNG değil SVG: alt menüde seçiliyken beyaz, değilken soluk
oluyorlar, karanlık modda da renk değiştiriyorlar. Hazır bir PNG tek
renkte donar ve 24 pikselde bulanıklaşır.

### Küçük düzeltmeler

- Ürün sayfasındaki "Fiyat Teklifi İste" şeridi görünmez yapıldı;
  sayfanın altına yapışan bulanık bir bant değil, yalnız düğme yüzüyor.
- Bakım "tamamlandı" şeridinde metin üstte, düğme altında. Yan yana
  olduklarında uzun başlıkta metne kalan yer daralıp sıkışıyordu.

---

## 0.9.9 — Çizimler, gün doğumu ve görünüm ayarı

### Karşılama ekranı: gün doğumu

Uygulama açıldığında gün doğuyor. Gökyüzü gece lacivertinden şafağa
dönüyor, güneş ufkun arkasından yükseliyor, PAKSAN yazısı onunla
birlikte doğuyor. Altta tarla ve yuvarlak balyalar.

**Güneş ve logo görselin içine gömülü değil**, ayrı katman — gömülü
olsalardı hareket ettirilemezlerdi. Üretilen görselin kendi gökyüzü
kırpıldı, üstünde kalan şerit saydam yapıldı; boyanan gökyüzü onun
arkasından görünüyor.

    gök      boyanan gökyüzü, gece → şafak
    güneş    ufkun arkasından yükseliyor
    tarla    görsel; güneşin alt yarısını kapatıyor
    logo     güneşle birlikte doğuyor
    içerik   söz ve düğmeler, en son beliriyor

Bitiş rengi bilerek koyu: üstte lacivert, ufka doğru turuncu. Açık
olsaydı üstündeki beyaz yazı okunmazdı; ayrıca marka renklerinin ikisi
de sahnede.

**Bir kere oynuyor.** Kayıt ekranına gidip geri gelince baştan
başlamıyor. **Hareket istemeyene hareket yok:** telefonunda "hareketi
azalt" açık olan kullanıcıya sahne doğrudan son hâlinde geliyor.

### Android açılış ekranı artık PAKSAN

Capacitor projeyi kurarken kendi varsayılan görselini bırakmış: beyaz
zeminde açık mavi bir "X". **APK'yı açan kullanıcı, uygulama yüklenene
kadar PAKSAN yerine onu görüyordu.**

Yerine karşılama sahnesiyle aynı dili konuşan bir açılış ekranı geldi:
koyu lacivert gökyüzü, ufka doğru turuncu, ortada PAKSAN yazısı, güneşin
durduğu yerde yumuşak bir parıltı. On bir yoğunluk için ayrı ayrı
üretiliyor.

Açılış ekranı işletim sisteminin gösterdiği tek kare bir görsel, hareket
edemiyor; animasyon uygulama açıldıktan sonra başlıyor. İkisi aynı renk
ve düzende olduğu için geçiş kesintisiz.

Üretici: `python tools/acilis-ekrani.py`

### Çizimler

Higgsfield ile üretildi, `tools/gorsel-hazirla.py` ile uygulamaya
hazırlandı.

| Nerede | Çizim |
|---|---|
| Makinelerim boş | Çekilir makine, tarlada |
| Bildirim yok | Sessiz zil |
| Arama sonuçsuz | Boş büyüteç |
| Destek → güvenlik uyarısı | Dört maddenin yanında dört çizim |
| Bakım rehberi bölümleri | Göz kontrolü, gresleme, cıvata, temizlik |

**Güvenlik ve bakım çizimleri makine değil İŞ gösteriyor**: kolu indiren
el, kontaktan çıkan anahtar, duran dişli, gres tabancası, anahtar ve
somun, hava tabancası. Görsel üreticiler tarım makinesi ayrıntılarında
güvenilir değil; uydurma bir parça çizimi, müşterinin makinesinde
olmayan bir şeyi aramasına yol açardı.

Bakımda on beşten fazla bölüm var ama hepsi dört temel işe iniyor:
bakmak, greslemek, sıkmak, temizlemek. Her bölüme ayrı çizim üretmek
yerine bu dördü eşleştirildi; aynı iş her rehberde aynı çizimle
görünüyor, kullanıcı çizimi bir kere öğreniyor.

Eşleşme **Türkçe** başlığın anahtar kelimesine bakıyor. Çeviri Türkçe
başlığın üstüne yazdığı için `baslikTr` olarak ayrıca saklanıyor;
saklanmasaydı İngilizce kullanan kullanıcı hiçbir çizim görmezdi.

**Hazırlama betiği ne yapıyor:** üretilen görsel doğrudan
kullanılamıyor. Konu karenin ortasında küçük duruyor, çevresi kocaman
beyaz; zemin de düz beyaz, karanlık modda parlak bir kare olurdu.
Betik kenarları kırpıyor, zemini **kenardan yayılarak** saydam yapıyor
(düz "beyaz pikseli sil" makinenin içindeki açık gri dolguları da
silerdi) ve paleti 32 renge indiriyor. 101 KB → 8 KB. On iki çizim
toplam 220 KB.

### Görünüm ayarı — uygulama ve backoffice

Karanlık mod yalnız işletim sisteminin ayarını izliyordu, geri dönüş
yolu yoktu. İkisine de üç seçenekli bir satır kondu:

    Otomatik    telefonun/bilgisayarın ayarını izler (varsayılan)
    Açık
    Koyu

Uygulamada Profil → Görünüm, backoffice'te profil penceresinde. Ayrı
depo anahtarları: personelin kendi bilgisayarındaki tercihi müşterinin
telefonundakiyle ilgisiz.

Renk **değerleri tek yerde** duruyor (`--x-koyu` belirteçleri); iki kural
yalnız hangi değerin kullanılacağını söylüyor. Medya sorgusu seçici
içine yazılamadığı için "sistem koyu" ile "elle koyu" ayrı belirtilmek
zorunda, ama değer listesi tekrar edilmiyor.

Tercih ilk çizimden **önce** uygulanıyor; sonra uygulansaydı koyu seçmiş
kullanıcı bir an beyaz ekran görürdü.

### Backoffice giriş ekranı

Düz lacivert zemin, uygulamanın gökyüzüyle aynı renk düzenine geçti.
Backoffice'in geri kalanı bilerek süssüz; burası istisna ve işin önüne
geçmiyor. Görsel dosyası yok, gökyüzü CSS ile boyanıyor.

---

## 0.9.7 — Destek ekranı kendi bilgi tabanıyla yeniden kuruldu

### Ne değişti

Destek ekranı artık kullanım kılavuzu veri setine bakmıyor. Kendi
bilgi tabanı var: `src/data/destekVerisi.js`.

Sebebi kapsam. Kılavuz veri seti yalnız 9 ürünü kapsıyordu; uygulamada
20 makine var. Yem karma, silaj, çayır biçme ve toprak işleme
makinelerinin sahibi Destek ekranını açtığında karşısında hiçbir şey
bulamıyordu. **Şimdi yirmi makinenin tamamının karşılığı var.**

Kılavuz veri seti duruyor ve **Kılavuzlar ekranı onu kullanmaya devam
ediyor** — orası zaten kılavuzun kendisini gösteren ekran.

### Akış

    makine  →  nerede  →  ne oluyor  →  CEVAP

Üç dokunuş. Makine bir kere seçiliyor ve hatırlanıyor, ikinci açılışta
iki dokunuş kalıyor. Makine sayfasından ya da bakım rehberinden
gelindiğinde makine adresten okunuyor ve hiç sorulmuyor.

**Her adım, çiftçinin makineye bakarak cevaplayabileceği bir soru:**

| Adım | Soru | Çiftçi neye bakar |
|---|---|---|
| 1 | Hangi makine | Yanında duran makine |
| 2 | Nerede | Parmağıyla gösterebileceği bölüm |
| 3 | Ne oluyor | Gözüyle gördüğü belirti |

Hiçbir adımda teşhis koyması istenmiyor. "Mekik zamanlaması bozuk mu?"
diye sorulsa cevabı bilemez; bilse zaten çözerdi. **Teşhis ekranın işi,
belirtiyi bildirmek çiftçinin.**

Makine sorusu **sohbetin içinde** soruluyor, aşağıdan kayan pencereyle
değil. Pencere yalnız "başka bir makine" denince açılıyor.

### Cevap nasıl geliyor

Bir belirtinin altında birden çok sebep olabiliyor. Hepsi birden
gösteriliyor ama **sıralı**: en olası ve en kolay kontrol edilen en
üstte, servis gerektiren en altta.

    ⚠ MAKİNEYE DOKUNMADAN ÖNCE
      Traktörü durdurun, kuyruk milini kapatın.
      Kontağı kapatıp anahtarı üzerinize alın.
      Hareketli parçalar tamamen durana kadar bekleyin.
      Kaldırılmış bir parçanın altına girmeyin; destek koyun.

    BUNUN 4 OLASI SEBEBİ VAR

    1  İp gerginliği yanlış              [ Tarlada yapılır ]
       NASIL ANLARSINIZ  İp çok gevşekse düğüm uzun ve dağınık,
                         çok gergin ise kısa çıkar ve kopar.
       NE YAPMALISINIZ   Gerginlik ayarını küçük adımlarla
                         değiştirin ve her seferinde bir balya
                         alıp düğüme bakın.

    2  Düğüm atıcı bıçağı körelmiş       [ Alet gerekir ]
       ...

    GEREKEBİLECEK PARÇALAR
    İğne · Düğüm atıcı bıçağı · Mekik dili · İp tutucu disk

Her sebepte iki satır var: **nasıl anlarsınız** ve **ne yapmalısınız**.
Yanındaki rozet çiftçinin o işi kendi başına yapıp yapamayacağını
söylüyor — tarlada yapılır / alet gerekir / servis işi. Rozet aynı
zamanda sıralamayı belirliyor.

### Bilgi tabanı

`src/data/destekVerisi.js` — 7 destek grubu, 19 bölüm, 36 belirti,
91 sebep. İki dilde.

| Grup | Kapsadığı makineler |
|---|---|
| balya | Orkinos, Orka, Albatros, Süper, Yunus, Hammer (11 makine) |
| rulo | i-Pak Rulo Balya |
| yem | Diamond, Pelican |
| silaj | Scorpion, Ahtapot |
| cayir | Yengeç, Kırlangıç |
| toprak | Rotovatör, Tesviye Küreği |
| genel | Karşılığı olmayan her makine |

Grup, ürünün `supportGroup` değerinden geliyor (bkz. `products.js`).
Yeni bir makine eklendiğinde kategorisi zaten bir gruba düştüğü için
Destek ekranı kendiliğinden çalışıyor.

> **Bu içerik kullanım kılavuzu değildir.** Makine sınıfının genel
> çalışma bilgisi. Cevabın altında bu açıkça yazıyor. Model bazında
> ölçü, tork ve ayar değeri **bilerek verilmiyor** — yanlış bir sayı,
> hiç bilgi vermemekten kötüdür. Ayar değerleri için kılavuza
> yönlendiriliyor.

### Çözülmezse

Cevabın altında "Sorun çözüldü" ve "Hâlâ devam ediyor" var. Devam
ediyorsa üç yol açılıyor: başka bir belirtiye bakmak, servis talebi,
yedek parça talebi. Talebe makine ve konuşulan belirti taşınıyor.
Aramaya yönlendirme yok.

Çözülmeyen her konuşma backoffice → **Destek Kayıtları** ekranına
düşüyor. Bu ekranın asıl çıktısı o liste: bilgi tabanının sahada
yetmediği yeri gösteriyor.

### Kaldırılan dosya

`src/lib/destekKonulari.js` — kılavuz veri setindeki arızaları belirtiye
göre öbeklemek için yazılmıştı. Yeni bilgi tabanı zaten bölüm bölüm
düzenli olduğu için gereği kalmadı.

---

## 0.9.6 — Raporlar yeniden, bakım takibi, sesli not n8n'e bağlandı

### Raporlar ekranı baştan tasarlandı

**Eski hâli neden çalışmıyordu:** on üç rapor bir açılır listedeydi.
Yönetici ekranı açtığında hiçbir şey görmüyordu; önce hangi raporu
istediğini bilmesi, sonra listeden bulup seçmesi gerekiyordu. Oysa
yöneticinin sorusu "Garanti maliyeti raporunu aç" değil, **"işler
nasıl gidiyor, neye bakmam lazım"**.

Yeni ekran üç kat:

    1  BU DÖNEM        altı sayı, önceki eşit dönemle karşılaştırmalı
    2  DİKKAT İSTEYEN  o an müdahale gerektirenler, her biri listeye gidiyor
    3  RAPORLAR        on üç raporun kartları, öbeklenmiş

**Dikkat isteyenler** bu ekranın asıl yeniliği. Yönetici rapor okumak
için değil, neye yetişeceğini bilmek için bakıyor:

    ● 8 talebe 48 saattir kimse bakmadı              Göster →
    ● 3 teklif müşteri cevabı bekliyor               Göster →
    ● En çok servis isteyen model: Süper Yunus (6)
    ● Destek ekranında 4 soru cevapsız kaldı         Göster →

"Göster" ilgili ekranı **süzgeçli** açıyor ve seçili dönemi de
taşıyor. Dönem taşınmadığında rapor "8 talep" derken açılan liste 9
satır gösteriyordu; iki sayının tutmaması raporun tamamına olan güveni
götürür. Sayısı sıfır olan başlık listeye hiç girmiyor.

**Rapor kartlarında raporun adı değil, cevapladığı SORU öne çıkıyor:**

    Para akışı
    Bu dönem ne kadar iş yaptık, hunide ne bekliyor?
    ₺1.960.000  HUNİDE BEKLEYEN

Yönetici rapor adlarını ezberlemek zorunda kalmıyor. Her kartta o
raporun bir başlık rakamı duruyor — açmadan önce içinde ne olduğu
belli. Karta dokununca raporun tablosu açılıyor, "← Bütün raporlar"
ile geri dönülüyor.

Öbekler: **Sonuç** (para, satış, tamamlanma), **Operasyon** (işin akışı
ve ekibin yükü), **Büyüme** (müşteri, bölge, bayi).

> **Raporların kendisi değişmedi.** On üç raporun hesaplamaları,
> sütunları, Excel çıktısı ve "uydurma sayı yok" kuralı aynı. Değişen
> yalnız yöneticinin onlara nasıl ulaştığı.

Bu düzen servis masası ve CRM ürünlerinde yerleşmiş yöntem: özet üstte,
istisnalar hemen altında, ayrıntıya özetin üstünden tıklanarak
iniliyor; raporlar açılır liste yerine adı ve açıklaması görünen bir
kitaplık.

### Excel'de tarih ve saat ayrı sütunlarda

Tek hücrede "21.08.2026 14:35" duruyordu. Excel bunu düz metin sayıyor;
tarihe göre süzmek, saate göre sıralamak, ay bazında pivot almak
çalışmıyordu. İçinde saat olan her sütun ikiye ayrıldı:

| Ekran | Eski sütun | Yeni sütunlar |
|---|---|---|
| Talepler | Geldiği tarih | Tarih · Saat |
| Destek Kayıtları | Tarih | Tarih · Saat |
| Müşteriler | Kayıt tarihi | Kayıt tarihi · Kayıt saati |
| Raporlar → Bekleyen işler | Geldiği tarih | Tarih · Saat |

Zaten saatsiz olan sütunlara (Teklif tarihi, Ödeme onayı) dokunulmadı.
Ortak yardımcı: `src/backoffice/ekranlar/ortak.jsx → tarihSaat`.

### Bakım rehberinde maddeler işaretleniyor

Rehberdeki her madde artık dokunulabilir. İşaretsizken kutu açık yeşil,
işaretlenince **koyu yeşil dolgu ve beyaz tik**, metnin üstü çiziliyor.
Başlığın yanında sayaç var: `3 / 6`.

Bir bölümün bütün maddeleri işaretlenince altta şerit çıkıyor:

    ✓ Gresleme — Günlük Bakım tamamlandı!
      Bu bölümün bütün adımlarını yaptınız.        [ Yeniden başlat ]

**Neden:** çiftçi bakımı tek oturuşta bitirmiyor — birkaç madde yapıp
traktöre biniyor, akşam devam ediyor. Nerede kaldığını hatırlamak
zorunda kalmasın diye işaretler telefonda saklanıyor.

Anahtar dört parçadan: `makine | rehber | bölüm | maddenin sırası`.
Makine de anahtarın içinde, çünkü Hammer'ın günlük greslemesini yapmış
olmak i-Pak'ınkini yapmış saymaz. **Metin değil sıra saklanıyor**;
metinle saklansaydı dil değiştirildiğinde bütün işaretler kaybolurdu.

Günlük bakım her gün yeniden yapılıyor ama işaretler kendiliğinden
silinmiyor — hangi gün neyin yapıldığını uygulama bilemez, tarlada
çalışılmayan günler de var. Temizlemek "Yeniden başlat" ile
kullanıcının elinde.

Yeni dosya: `src/lib/rehberIsaret.js`.

### Destek ekranı makine seçimini artık öne atmıyor

Ekran açılır açılmaz aşağıdan kayan makine seçme penceresi geliyordu;
kullanıcı daha ne sunulduğunu görmeden karar vermeye zorlanıyordu.

Şimdi konuşma hemen başlıyor ve belirti başlıkları görünüyor. Bir
başlığa dokunulduğunda makine soruluyor — **seçim hâlâ zorunlu**, yalnız
zamanı değişti. Makine seçilince dokunulan başlık kaldığı yerden
açılıyor, kullanıcı ikinci kez aramıyor.

Makine seçilmemişken başlıkların yanında sayı yazmıyor: hangi başlıkta
kaç arıza olduğu makineye göre değişiyor. Tek kayıtlı makinesi olan
kullanıcıya seçim hiç sorulmuyor.

### Sesli not n8n akışına bağlandı

Adres `src/config.js → SES_METIN.webhook` içinde tanımlı. İşleyiş:

    Talep gönderildi
      ├─ talebin kendisi backoffice'e (ses kaydı da yanında)
      └─ AYNI ANDA yalnız ses kaydı n8n'e
              └─ n8n metne çeviriyor
                    └─ köprüye bırakıyor (talep numarasıyla)
                          └─ backoffice metni o talebe işliyor

**Koşullu çalışıyor:** ses kaydı yoksa n8n'e hiçbir şey gitmiyor.
Gönderim talebi BEKLETMİYOR ve cevabı beklenmiyor — n8n kapalıysa
talep yine eksiksiz, yalnız metin gelmiyor.

n8n'e giden alanlar: `audio` (ikili dosya, adı talep numarası +
doğru uzantı), `recording_id` (talep numarası), `user_id`, `sure`.

> **İki şey yayına çıkmadan halledilmeli.**
>
> **1. Adres test adresi.** `webhook-test` bölümü akış yayına
> alındığında `webhook` olacak. n8n test adresi yalnız "Test workflow"
> düğmesine basıldığında dinliyor ve tek istek alıp duruyor.
>
> **2. Köprü buluttan görünmüyor.** `tools/ses-metin-sunucu.mjs`
> `localhost:5180` üzerinde çalışıyor; n8n Cloud oraya erişemez.
> Ya n8n bu bilgisayarda çalışacak ya da porta bir tünel açılacak
> (cloudflared, ngrok) ve tünel adresi n8n'deki HTTP Request
> düğümüne yazılacak.
>
> **3. Adres gizli değil.** APK'nın içinde açıkça duruyor; adresi bilen
> herkes akışa ses dosyası gönderebilir. Yayına çıkarken akışın başına
> bir başlık anahtarı doğrulaması koymak gerekiyor.

---

## 0.9.5 — Destek ekranı baştan tasarlandı

Ekran sıfırdan yazıldı. Amaç tek cümleyle: **çiftçi makinenin yanında
dururken, iki dokunuşta kılavuzun o arıza için yazdığı çözüme
ulaşsın.**

### Ekranın işleyişi

    makine  →  ne görüyorsun  →  hangisi  →  CEVAP

Makine bir kere seçiliyor ve hatırlanıyor. Yani ikinci kullanımdan
sonra **iki dokunuş** yetiyor.

**Yazı kutusu yok.** Kullanıcı hiçbir yere yazı yazmıyor; her cevap bir
düğme. Üç sebebi var:

- Tarlada eldivenle, güneşin altında yazı yazmak zor.
- Yazılan cümleyi anlamaya çalışan bir sistem yanlış anlayabilir.
  Yanlış anlaşılmış bir arıza tavsiyesi makineye zarar verir.
- Düğmeyle gelen her cümlenin kılavuzda birebir karşılığı var.

### Neden soru sormuyor

Önceki sürümde ekran kılavuzun teşhis sorularını Evet/Hayır diye
soruyordu. Kaldırıldı.

Kılavuzların arıza bölümü zaten bir tablo: **SORUN | SEBEP | ÇÖZÜM**.
121 arızanın **83'ünde tek sebep** yazıyor. Tek sebepli bir arızada
çiftçiye "şu pim kesik mi?" diye sormak, cevabı zaten bir satır aşağıda
yazan bir soruyu sormak demek. Tablo olduğu gibi gösteriliyor.

### Arızalar belirtiye göre öbekleniyor

Bir makinenin kılavuzunda 21–25 arıza var. Hepsini tek listede
göstermek okunmuyordu. Önce **ne gördüğü** soruluyor:

    Düğüm hiç olmuyor        2
    Düğüm bozuk çıkıyor     11
    İp, iğne ve mekik        3
    Balya kalitesi           3
    Besleme ve toplama       3
    Makine ve mekanik        3

Sağdaki sayı o başlığın altında kaç arıza olduğunu söylüyor — çiftçi
dokunmadan önce ne kadarlık bir liste açacağını biliyor. Başlıklar
makineye göre değişiyor: i-Pak'ta "File ve sarma", Orka'da "Kontrol
paneli" çıkıyor.

**Bu öbekleme elle yazıldı** (`src/lib/destekKonulari.js`). Sebebi:
kılavuzlar böyle bir öbek vermiyor, arıza tablosunun tamamı tek başlık
altında ("GENEL ARIZA CETVELİ"). Paketteki bölüm bilgisi de 121
arızanın yalnız 38'inde dolu.

> O dosyada **hiçbir teknik metin yok**. Yalnız "bu arıza hangi
> başlığın altında görünsün" yazıyor. Bir arıza hiçbir kalıba uymazsa
> en sondaki "Makine ve mekanik" başlığına düşüyor; hiçbir arıza
> listeden kaybolmuyor.

### Cevabın içinde ne var

Bir arızaya dokunulunca kılavuzun o arıza için yazdığı **her şey tek
seferde** açılıyor:

    KILAVUZ NE DİYOR
    İp düğümlenmiyor

    ⚠ Önce güvenlik — makineye el sürmeden (19)   ← kapalı, dokununca iniyor

    KILAVUZDAKİ 3 SEBEP
    1  Mekik dili pimi kesik
       • Mekik dili pimini değiştirin (131-29)
    2  Mekik dili hasar görmüş
       • Mekik dilini değiştirin (131-28)
    3  İp vericiler ip verme pozisyonundan geri dönmüyor
       • İp verici mekanizmasını kontrol edin (13102)

    🛒 GEREKEBİLECEK PARÇALAR
       131-29   131-28   13102

    📖 HAMMER KULLANIM KILAVUZU · s. 34   ← dokununca kılavuzun asıl cümlesi

**Parça kodları yeni.** Kılavuz kodu çözüm cümlesinin içinde parantezle
veriyor; ekran bunları toplayıp altta bir arada gösteriyor. Yedek parça
isterken çiftçi kodu cümlelerin içinde aramıyor.

**Güvenlik şeridi kapalı geliyor ama çözümün üstünde duruyor.** Bir
makinenin güvenlik uyarısı elliyi geçiyor; hepsini açık göstermek cevabı
gömüyordu. Şeritte yalnız "makineye el sürmeden önce" ile ilgili olanlar
süzülüyor.

> ORKA kılavuzunun 58 uyarısının tamamı sınıflandırılmamış çıkmış
> (`OTHER`). Kategori bir şey vermeyince uyarının **metnine** bakılıyor:
> traktörü durdurmayı, kontağı kapatmayı, kuyruk milini ayırmayı
> anlatan cümleler zaten aranan cümleler. Orka'da 6 uyarı çıkıyor.

### Çözemezse

Cevabın altında iki düğme: **Sorun çözüldü** ve **Hâlâ devam ediyor**.
Devam ediyorsa üç yol açılıyor, üçü de tek dokunuş:

    Başka bir arızaya bakayım
    Servis talebi oluştur       → /talep?tur=servis
    Yedek Parça Talebi          → /talep?tur=parca

Talebe makine ve konuşulan arıza taşınıyor; çiftçi aynı şeyi ikinci kez
anlatmıyor. **Aramaya yönlendirme yok** — bu ekranın işi telefon yükünü
azaltmak.

"Hâlâ devam ediyor" backoffice'te **cevapsız kalan** listesine düşüyor:
kılavuzun o satırı sahada işe yaramamış demektir.

### Makine seçimi uygulamanın kendi kimliğiyle

Seçici artık müşterinin **kayıtlı makinelerini** en üstte gösteriyor,
seri numarasıyla:

    MAKİNELERİM
      Hammer          HMR202400123
      i-Pak Rulo      IPAK202300456
    DİĞER MODELLER
      Süper 8002 · Süper Yunus · Orka 870 …

Tek kayıtlı makinesi olan kullanıcıya seçim hiç sorulmuyor.

Saklanan değer de değişti: eskiden paketin iç kimliği tutuluyordu
(`MCH_HAMMER_2K`), şimdi uygulamanın **ürün kimliği** (`hammer`).
Müşteri makinesini "Süper Yunus" diye tanıyor, "Süper YUNUS 2 İpli
Haşbaysız" diye değil. Depo anahtarı `paksan.destekMakine` →
`paksan.destekUrun` oldu.

Kılavuzu olmayan bir makine seçilirse ekran uydurma cevap vermiyor;
durumu söyleyip doğrudan servis/parça talebine götürüyor.

### Bu sürümde düzeltilen iki hata

**Sohbet mesajlarının numarası çakışıyordu.** Numara React'in güncelleme
fonksiyonunun içinden okunuyordu; React o fonksiyonu hemen değil sıraya
alarak çalıştırdığı için arka arkaya gönderilen iki mesaja aynı numara
düşüyor, biri diğerinin yerine geçiyordu.

**İngilizce modda bütün arızalar tek başlığa düşüyordu.** Öbekleme
kalıpları Türkçe; İngilizce başlıkla eşleştirilince hiçbiri tutmuyordu.
Öbekleme artık ekranın dili ne olursa olsun **Türkçe başlığa** bakıyor.
Başlıkların adı i18n'den geldiği için iki dilde de doğru görünüyor.

### Dosyalar

    src/screens/Support.jsx        ekran (baştan yazıldı)
    src/lib/destekKonulari.js      YENİ — belirti öbekleri, parça kodu ayıklama
    src/lib/destek.js              güvenlik süzgecine metin yedeği eklendi

Veri seti değişmedi ve elle düzenlenmiyor. Uygulamaya kopyalanan iki
dosya yine aynı:

    src/data/mobile_support_package.json
    src/lib/mobile_support_runtime.ts

---

## 0.9.4 — Kılavuz sadeleşti, destek kaydı tamamlandı, ses metne dönüyor

### Kılavuz ekranı: güvenlik tek yerde

Her makinenin kılavuz sayfası 51-58 güvenlik maddesini açık dökerek
başlıyordu; ekran okunmuyordu. Üstelik dört kılavuzun maddeleri
neredeyse aynı — **47 madde beş kılavuzun dördünde ortak**.

    Makine sayfası    yalnız "makineye el sürmeden önce" kuralları (4 madde)
    Kılavuzlar listesi Güvenlik Kuralları sayfası — 115 kuralın tamamı

Sabit kutu açılır kapanır değil: aşağıdaki bütün prosedürler makineye
el sürmeyi gerektiriyor, uyarı hep görünür olmalı. Hangi maddelerin
sabitleneceği uygulamanın seçimi değil, kılavuzun kendi
sınıflandırması (`hazard_category = MAINTENANCE`).

Yeni ekran: `src/screens/ManualSafety.jsx` → `/kilavuzlar/guvenlik`.
Maddeler kılavuzun kendi kategorilerine göre öbeklenmiş, aynı cümle
birden çok kılavuzda geçiyorsa bir kez yazılıyor.

### Kılavuzda kaldırılanlar

- **Makine bilgisi** açılır kutusu ve içeriği kaldırıldı. Kartların
  başlığı gövdenin kendisiydi, ikisi birebir aynı çıkıyordu; içlerinden
  biri de Türkçe metnin ortasında İngilizceye dönüyordu
  (*"…emniyet tertibatları ile korunmuştur. 7. OPERATION 7.1…"*).
- **Teknik değerler** → **Makine Bilgisi ve Teknik Değerleri** oldu.
- **Servis bildirimi** bölümü kaldırıldı: veri setindeki tek kayıt Twin
  Hammer'a ait ve uygulamada o ürün yok; ayrıca metni İngilizce.
- **Kaynak satırları** (*"HAMMER KULLANIM KILAVUZU · s. 34"*) kılavuz
  ekranından tamamen kaldırıldı. Destek ekranında duruyor — orada
  teşhis sonucunun nereden geldiğini göstermek gerekiyor.
- Açılır kutuların altındaki **madde sayıları** kaldırıldı.

### Kullanım prosedürlerine kısa ad verildi

Veri setinde kullanım kartlarının başlığı gövdenin kendisi: listede
başlık ve metin birebir aynı görünüyordu, hiçbiri ayırt edilmiyordu.

    1  Traktöre Bağlama          7  Balya Kontrolü
    2  Çalıştırmadan Önce        8  Kuyruk Mili Devri
    3  İlk Çalıştırma            9  Traktör Seçimi
    4  Boşta Çalıştırma         10  Teslim Durumu
    5  Çalışmaya Başlama        11  Kılavuzu Okuduktan Sonra
    6  İlk Yüz Balya

Adlar `src/lib/kilavuzVeri.js → PROSEDUR_ADI` tablosunda. Ad bir
**etiket**; teknik içerik değil — kılavuzun cümlesi kartın içinde
olduğu gibi duruyor. Kalıp tutmazsa uydurma ad üretilmiyor, cümlenin
ilk parçası gösteriliyor.

### Destek ekranı backoffice'e eksiksiz yazıyor

Sohbetin her adımı kayda geçiyor. Backoffice → **Destek Kayıtları**
ekranında konuşma satır satır okunuyor:

    Konu seçti           · Bağlama düğümleme düzeni
    Hazır soruya dokundu · İp düğümlenmiyor
    Hazır soruya dokundu · Mekik dili pimi kesik      ← "Bilmiyorum" denildi
    CEVAP BULUNAMADI
    Cevap verildi        · Mekik dili hasar görmüş → Evet
    Cevap verildi        · Mekik dili hasar görmüş    ← kılavuzun teşhisi
    Cevap verildi        · Güvenlik uyarılarını okudu
    Sorun devam ediyor dedi
    Yönlendirildi        · servis

Önceden yalnız arıza başlığı ve sonuç yazılıyordu; hangi kontrolde
takılındığı görünmüyordu. Olay adları backoffice'in kendi sözlüğünden
alındı (`DestekKayitlari.jsx → OLAY_ADI`), yeni bir tür uydurulmadı.

**Yeni düğme: "Bilmiyorum".** Kılavuz "mekik dili pimi kesik mi?" diye
soruyor; çiftçi mekik dilinin nerede olduğunu bilmeyebiliyordu ve akış
orada tıkanıyordu. Düğme o kontrolü atlayıp sıradakine geçiyor,
kayda **cevapsız** olarak düşüyor. Backoffice'teki "Cevapsız kalan
sorular" listesi kılavuzun çiftçiye anlatamadığı maddeleri gösteriyor.

**Talep formuna arıza taşınıyor.** Sohbet servis ya da parça talebiyle
bitiyorsa konuşulan arıza açıklamaya hazır yazılıyor; müşteri aynı
şeyi ikinci kez anlatmıyor.

### Yedek parçada adet kutusundaki fiyat

Adet arttıkça kutudaki rakam da artıyordu: aynı bilgi (satır tutarı)
hem orada hem alt toplamda, iki ayrı yerde değişiyordu. Artık kutuda
**birim fiyat** duruyor, adetle çarpılmıyor. Toplam yalnız alt
toplamda.

### Numara değişikliğinde giriş uyarısı

Talep gönderildikten sonra çıkan ekrana eklendi:

> Talebinizin onaylanması halinde PAKSAN Connect uygulamasına güncel
> telefon numaranız üzerinden giriş yapmanız gerektiğini lütfen
> unutmayınız.

Numara değişince hesabın kimliği de değişiyor; eski numarasıyla giriş
denemesi "hesap bulunamadı" ile sonuçlanıyordu.

### Sesli notlar yazıya çevriliyor (n8n)

Talebe bırakılan ses kaydı n8n akışına gidip metne dönüşüyor ve
backoffice'te talebin üzerine işleniyor. **Talep beklemiyor**: kayıt
anında backoffice'e düşüyor, çeviri sonradan üstüne biniyor.

    1  Uygulama  ──►  n8n webhook        ses + talep numarası
    2  n8n       ──►  Groq / Whisper     metne çeviriyor
    3  n8n       ──►  ses metni köprüsü  metni bırakıyor
    4  Backoffice ─►  köprü              alıp talebe işliyor

Köprüyü çalıştırmak:

    node tools/ses-metin-sunucu.mjs

n8n'e eklenecek HTTP Request düğümü:

    POST http://<bu-bilgisayar>:5180/api/destek/ses-metni
    {
      "recording_id": "{{ $json.recording_id }}",
      "user_id":      "{{ $json.user_id }}",
      "transcript":   "{{ $json.transcript }}",
      "language":     "{{ $json.language }}"
    }

`recording_id` **talep numarası** (SRV2608214417 gibi); metin o talebe
işleniyor. Uygulama ses kaydını gönderirken bu alana talep numarasını
yazıyor.

> n8n bulutta çalışıyorsa `localhost` adresini göremez. n8n'i bu
> bilgisayarda çalıştırın ya da porta bir tünel açıp tünel adresini
> yazın.

Ayarlar `src/config.js → SES_METIN`. `webhook` boşken gönderim hiç
denenmiyor; köprüye ulaşılamazsa hiçbir şey bozulmuyor, yalnız metin
gelmiyor. Aşama 2'de gerçek sunucu geldiğinde köprü silinecek, n8n
aynı yolu gerçek sunucuda bulacak.

### Başlıklarda büyük harf kuralı

Başlık ve alt başlıklarda **her kelimenin baş harfi büyük**, bağlaçlar
küçük: *Kullanım ve Ayar*, *Fatura ve Teslimat*, *Numaranız mı
Değişti?*. Uygulamada 73, backoffice'te 92 başlık düzeltildi.

İngilizce ayrı kuralla çevrildi: Türkçe kuralı uygulamak "is"
kelimesini "İs" yapıyordu, İngilizcede küçük kalan kelimeler de farklı
(and, of, the…).

Dokunulmayanlar: gövde metni, ipuçları, uyarı cümleleri, parantez içi
açıklamalar ve nesne alanı adları.

### Demo verisi yenilendi

Demo talepleri artık yeni alanları da dolduruyor: fatura, dekont, ödeme
onayı, parça adetleri, randevu, verilen teklif, kargo bilgisi, iptal
sebebi, kapanış kaydı, iç notlar ve müşteri notları, sesli not ve
yazıya çevrilmiş hâli.

Aşamalar sırayla işleniyor: "kapandı" bir talep önce "incelemede"den
geçmiş görünüyor. Yedek parçada ödeme onayı "yeni" dışındaki her
aşamada var — yoksa talep zaten ilerleyemezdi.

Parça adları fiyat listesinden geliyor, böylece tutarlar hesaplanıyor
ve "en çok istenen parçalar" raporu gerçek kodlarla doluyor.

> Ses kaydının kendisi demoya konmuyor: megabaytlarca base64
> tarayıcının hafızasını doldururdu. Süresi ve yazıya çevrilmiş hâli
> var, oynatıcı yerine "ses kaydı bu kayıtta saklanmıyor" yazıyor.

### Düzeltilen iki çeviri hatası

- Bakım Rehberleri ekranının üst satırında `rehberler.rehberSayisi`
  yazıyordu: anahtar `ortak` bloğundaydı, çağrı `rehberler` bloğunu
  arıyordu.
- Makine kaydedildikten sonra çıkan bildirimde
  `makineEkle.kaydedildi` yazıyordu: doğrusu `ekle.kaydedildi`.

---

## 0.9.3 — Destek yeniden sohbet, Kılavuzlar gerçek kılavuz

Bu sürümde iki ekran birbirinden ayrıldı. Daha önce ikisi de kılavuzun
aynı bölümlerini gösteriyordu; hangisine bakılacağı belli değildi.

    DESTEK      makinede bir sorun VAR   → adım adım sebebi bulunuyor
    KILAVUZLAR  makine hakkında bilgi    → güvenlik, kullanım, teknik değerler

### Destek yeniden sohbet ekranı

0.9.2'de düz listeye çevrilmişti, geri alındı. Ekran yine sohbet
görünümünde: PAKSAN solda konuşuyor, kullanıcının cevapları sağda
duruyor.

**Kullanıcı hiçbir yere yazı yazmıyor.** Klavye açılmıyor; bütün cevaplar
dokunulacak düğme. Tarlada eldivenle telefon kullanan biri için yazmak
en zor iş, ayrıca yazılan cümleyi anlamaya çalışan bir sistem yanlış
anlayabilir. Düğmede yanlış anlama yok.

Sıra şöyle işliyor:

    1  Makine seçiliyor (bir kere; sonraki açılışta hatırlanıyor)
    2  Hangi bölüm?        bağlama · pikap · düğüm atıcı · …
    3  Hangi sorun?        kılavuzun o bölümdeki arıza başlıkları
    4  Kılavuzun soruları  Evet · Hayır · Bilmiyorum · Başka
    5  Sebep bulundu       kılavuzun teşhisi
    6  Güvenlik uyarısı    varsa, çözümden ÖNCE, bir kere onaylanıyor
    7  Yapılacaklar        kılavuzun çözüm adımları, parça koduyla
    8  Çözüldü mü?

Bir makinenin tek bölümü varsa 2. adım sorulmadan geçiliyor.

**4. adımdaki "Bilmiyorum" ve "Başka" önemli.** Kılavuz "mekik dili pimi
kesik mi?" diye soruyor; çiftçi mekik dilinin nerede olduğunu
bilmeyebilir. Bu iki düğme akışı bitirmiyor, motoru başka dala
sokuyor — ve `cevapsiz` olayı olarak kayda geçiyor. Backoffice →
Destek Kayıtları'nda hangi soruda takılındığı görünüyor; kılavuzun
o maddesi çiftçiye anlatılamıyor demektir.

### Sonuç alınamazsa ne oluyor

Sohbetin sonunda "Çözüldü" ve "Çözülmedi" var. Çözülmediyse üç yol
açılıyor, üçü de tek dokunuş:

    Başka bir arızayı deneyeyim   → 3. adıma dönüyor
    Servis talebi oluştur          → /talep?tur=servis
    Yedek parça talebi             → /talep?tur=parca

Talep formuna makine ve konuşulan arıza bilgisi taşınıyor; kullanıcı
aynı şeyi ikinci kez anlatmıyor. **Aramaya yönlendirme yok** — telefon
yükünü düşürmek bu projenin amacı.

### Kılavuzlar ekranı gerçek kılavuzdan yazılıyor

Eskiden uygulamanın kendi yazdığı genel bir özet vardı: her makinede
aynı güvenlik maddeleri, aynı bakım listesi. Doğruydu ama makineye ait
değildi. O dosya (`src/data/kilavuz.js`) silindi.

Artık içerik `mobile_support_package.json` içinden geliyor; o dosya da
PAKSAN'ın **beş gerçek kullanım kılavuzundan** çıkarıldı. Ekrandaki her
cümlenin altında hangi kılavuzun kaçıncı sayfası olduğu yazıyor,
dokununca kılavuzdaki asıl cümle açılıyor.

Bölümler:

    Güvenlik uyarıları   kılavuzun güvenlik bölümü (51–58 madde)
    Kullanım ve ayar     traktöre bağlama, çalıştırma, ayar
    Makine bilgisi       makinenin nasıl çalıştığı
    Teknik değerler      ölçü, ağırlık, devir — MODEL SEÇİLEREK
    Servis bildirimi     kılavuzun servis notları
    Arıza çözümü         Destek ekranını açıyor

En üstte kılavuzun künyesi duruyor: dosya adı ve sayfa sayısı. Müşteri
elindeki basılı kılavuzla aynı belgeye baktığını görüyor.

**Teknik değerler modele göre seçiliyor.** Bir kılavuz birden çok modeli
kapsıyor (Süper Yunus 2 ipli, 3 ipli, haşbaylı…). Güvenlik ve kullanım
hepsinde ortak ama ölçü, ağırlık ve bağlayıcı sayısı değişiyor. Uygulama
tahmin etmiyor, kullanıcı kendi modelini seçiyor: iki ipli makinenin
sahibine üç iplinin değerlerini göstermek, hiç göstermemekten kötü.

### Kılavuzu olmayan makine listede yok

Beş kılavuzun kapsadığı makineler:

| Kılavuz | Uygulamadaki ürün |
|---|---|
| HAMMER KULLANIM KILAVUZU | Hammer |
| PAKSAN BALYA KULLANIM KILAVUZU | Süper 8002, 8002E, 8002E Dual2, Süper Yunus, Yunus Dual2, Yunus 3 Yabalı |
| ORKA KULLANIM KILAVUZU | Orka 870 |
| YUVARLAK BALYA KULLANIM KILAVUZU | i-Pak rulo balya |
| TWIN HAMMER KULLANIM KILAVUZU | **karşılığı olan ürün yok** |

Kılavuzlar listesi yalnız bu ürünleri gösteriyor. Uydurma kılavuz
göstermektense hiç göstermemek doğru. **Makineler ve Ürünler ekranları
değişmedi**, bütün makineler orada duruyor.

> **Twin Hammer:** kılavuzu veri setinde var (25 arıza, 17 kullanım
> kartı) ama uygulamanın ürün listesinde böyle bir model yok. Ürün
> eklenirse `src/lib/kilavuzVeri.js` içindeki `URUN_KILAVUZU` tablosuna
> bir satır yazmak yeterli, başka hiçbir yere dokunulmuyor.

### Teknik özellikler kılavuzun tablosuna göre düzeltildi

Ürünler ekranındaki teknik özellikler elle yazılmıştı, kılavuzun kendi
tablosuyla karşılaştırıldı. Farklı çıkanlar:

| Ürün | Neydi | Ne oldu |
|---|---|---|
| Hammer | min. 55 HP | min. 45 HP · balya uzunluğu ve net genişlik eklendi |
| Süper Yunus | min. 45 HP · balya 30–110 cm | min. 70 HP · 30–140 cm |
| Süper Yunus Dual2 / 3 Yabalı | min. 50 HP | min. 70 HP |
| Süper 8002 | min. 45 HP | min. 60 HP |
| Süper 8002E | min. 50 HP | min. 60 HP |
| Süper 8002E Dual2 | min. 55 HP | min. 60 HP |
| i-Pak | pikap 1.800 mm · "Ağ / İp" | 1.940 mm · "Otomatik file" · balya ağırlığı eklendi |

**Orka 870'e dokunulmadı.** Orka kılavuzunun teknik tablosu veri setine
girmemiş; doğrulanamayan bir değeri değiştirmek tahmin olurdu. Kılavuz
verisi tamamlanınca bu satır da düzeltilmeli.

### Yeni dosya

    src/lib/kilavuzVeri.js    ürün → kılavuz eşleştirmesi, bölüm süzgeçleri

Veri seti hâlâ elle düzenlenmiyor. Uygulamaya yalnız iki dosya
kopyalanıyor:

    src/data/mobile_support_package.json
    src/lib/mobile_support_runtime.ts

Kılavuz güncellenince bu iki dosya yenileniyor, uygulama koduna
dokunulmuyor. `node tools/destek-dogrula.mjs` veri setini kontrol
ediyor (şu an: sorun yok).

---

## 0.9.2 — Destek ekranı hazır sorun listesine döndü

### Ekran artık soru sormuyor

Destek ekranı **hazır sorun listesi**. Çiftçi kendi arızasına dokunuyor,
kılavuzun o sorun için yazdığı bütün sebepler ve çözümleri açılıyor.
Adım adım Evet/Hayır soran teşhis akışı kaldırıldı.

**Neden:** Kılavuzların arıza bölümü zaten bir tablo —
SORUN | SEBEP | ÇÖZÜM. Tarlada eldivenle telefon kullanan biri art arda
soru cevaplamak istemiyor; listeye bakıp kendi durumuna uyanı görmek
istiyor. Ekran tabloyu tablo olarak gösteriyor.

Karar ağacının **yaprakları** tablonun satırlarının ta kendisi: her
`result` bir sebep ve onun çözümü. `src/lib/destek.js → cozumler(flowId)`
bir arızanın bütün `result` kayıtlarını `problem_id` üzerinden topluyor.

Veri hâlâ aynı iki dosyadan geliyor:

    src/data/mobile_support_package.json   veri
    src/lib/mobile_support_runtime.ts      makine ve arıza listesi + arama

Motor artık yalnız `listMachines` ve `listFlows` için kullanılıyor;
`start`/`answer` akışı ekranda yok.

### Açılan arızanın içinde ne var

    Müdahale uyarısı şeridi (turuncu, dokununca iniyor)
    KILAVUZDAKİ SEBEPLER VE ÇÖZÜMLERİ
      1  Mekik dili pimi kesik
         • Mekik dili pimini değiştirin (131-29)
      2  Mekik dili hasar görmüş
         • Mekik dilini değiştirin (131-28)
      ...
    HAMMER KULLANIM KILAVUZU · s. 34   ← dokununca asıl cümle açılıyor
    [ Servis talebi oluştur ]

Kılavuz sebep yazmadan doğrudan yönlendirme yapıyorsa o satır numarasız,
"Kılavuzun yönlendirmesi" başlığıyla çıkıyor. Kılavuz kesin
konuşmuyorsa (`certainty: UNKNOWN`) sebebin altına uyarı düşüyor.

### Güvenlik kapısı yerine müdahale şeridi

Akış kalkınca "Okudum, Anladım" kapısı da kalktı. Yerine açılan her
arızanın en üstünde turuncu bir şerit var: dokununca kılavuzun müdahale
uyarıları iniyor.

Bir makinenin güvenlik uyarısı elliyi geçiyor ve çoğu taşıma / tarlada
çalışma uyarısı — bir arıza satırının altına sığmıyor. Şeritte yalnız üç
kategori süzülüyor (`src/lib/destek.js → mudahaleUyarilari`):

    MAINTENANCE · MOVING_PARTS · PTO

Tamamı ayrı düğmede duruyor.

### "Panel" adı bırakıldı: **backoffice**

Klasör, dosya ve ekran adlarının hepsi değişti:

    src/panel/            → src/backoffice/
    src/panel/panel.css   → src/backoffice/backoffice.css
    panel.html            → backoffice.html
    vite.panel.config.js  → vite.backoffice.config.js
    dist-panel/           → dist-backoffice/

Geliştirme adresi de değişti:

    http://localhost:5174/backoffice.html

> **İki localStorage anahtarı bilerek eski adında bırakıldı**
> (`panelOturum`, `panelIcerik`). Değiştirilseydi tarayıcıda açık olan
> oturumlar düşer, girilmiş içerik kaybolurdu. Kod içinde nedeni yazılı.
> İşlem kaydındaki eski satırlarda da hâlâ "Panele giriş" yazıyor;
> yeniler "Backoffice girişi".

### Çıkışta onay soruluyor

Sol menünün dibindeki **Çıkış** düğmesi artık doğrudan çıkmıyor; kimin
oturumunun kapatılacağını yazan bir onay penceresi açılıyor.

**Neden:** Düğme kişinin kendi adının hemen altında. Profil düğmesine
basmak isteyen yanlışlıkla çıkışa dokunabiliyordu; ortak bilgisayarda bu,
yarım kalmış bir talep formunun kaybolması demek.

### Karşılıksız aramalar kayda geçiyor

Kullanıcı arama kutusuna üç harften uzun bir şey yazıp hiçbir arıza
çıkmazsa, yazmayı bıraktıktan ~1,5 saniye sonra o cümle kaydediliyor
(`serbest` + `cevapsiz` olayı). Backoffice → **Destek Kayıtları**
ekranının en üstündeki "Cevapsız kalan sorular" listesi bundan
besleniyor.

Sohbet kalkınca o liste boş kalmıştı; ekranın asıl çıktısı o listeydi.
Her satır, kılavuzda ya da veri setinde eksik olan bir arıza kaydına
işaret ediyor.

### Yeni araç: ekran görüntüsü üretici

    node tools/ekran-goruntusu.mjs          bütün ekranlar
    node tools/ekran-goruntusu.mjs destek   yalnız adı eşleşenler

Ayrı bir terminalde `npm run dev` çalışıyor olmalı. Araç bilgisayardaki
Chrome'u görünmeden açıyor, her ekranı geziyor ve `sunum/gorseller/`
klasörüne PNG yazıyor. 46 görsel: uygulama telefon ölçüsünde (390×844),
backoffice masaüstü ölçüsünde (1600×1000), ikisi de 2x — sunum çıktı
alınacak.

Ek paket kurulmuyor; Chrome'a DevTools Protokolü ile Node'un kendi
WebSocket'i üzerinden konuşuluyor.

Uygulama tarafı araç içinde tanımlı sahte bir müşteri hesabıyla
açılıyor. Backoffice tarafı kendi **"Demo verisini yükle"** düğmesiyle
dolduruluyor — görsellerdeki talepler, müşteriler ve raporlar
backoffice'in kendi demo üreticisinden geliyor.

**Ekran değişince araç yeniden çalıştırılıyor**, görseller kendiliğinden
güncelleniyor. Elle ekran görüntüsü alınmıyor.

### Sunum dosyası görselli

`sunum/PAKSAN_CONNECT_SUNUM.md` her ekranın görüntüsüyle birlikte
anlatıyor. Bölüm 6'da bağlantılı ekranlar **yan yana** duruyor: aynı
talebin müşteri ekranı ve backoffice ekranı, destek → servis talebi →
destek kayıtları zinciri, kılavuz → arıza listesi.

---

## 0.9.1 — Destek ekranı yeniden yazıldı

### Sohbet biçimi kaldırıldı

Destek ekranı artık bir sohbet değil, **adım adım ilerleyen bir arıza
çözüm ekranı**. Dört adım:

    1. MAKİNE   müşteri modelini seçiyor (bir kez, telefonda saklanıyor)
    2. LİSTE    o modelin arızaları · hızlı cevaplar · kullanım kartları
    3. AKIŞ     kılavuzun kontrol soruları, tek tek (Evet / Hayır)
    4. SONUÇ    önce güvenlik uyarısı, onaylanınca çözüm adımları

### Veri ve motor: yalnız iki dosya

    src/data/mobile_support_package.json   veri
    src/lib/mobile_support_runtime.ts      akış motoru

İkisi de `paksan-support-dataset` deposundan **olduğu gibi** kopyalandı;
uygulamada değiştirilmiyorlar. Veri seti yenilenince iki dosya yeniden
kopyalanır, başka hiçbir yere dokunulmaz.

`src/lib/destek.js` arada duran ince bir katman: motoru bir kez kurup
ekranın ihtiyaç duyduğu seçmeleri veriyor (makine listesi, hızlı
cevaplar, prosedür kartları, kaynak yazısı). Teşhis akışının kendisi
motorda yürüyor.

**Kaldırılan dosyalar:** `src/data/destek.js`, `src/lib/destekMotor.js`,
`tools/destek-uret.py`. Bunların yerini yukarıdaki iki dosya aldı.

### Düzeltilen hata: makine seçilemiyordu

Önceki sürüm makine listesini kullanıcının **kayıtlı makinelerinden**
alıyordu. Kayıtlı makinesi olmayan kullanıcıda seçim ekranı boş
geliyordu ve destek hiç kullanılamıyordu.

Artık liste **paketin makine kataloğundan** geliyor: 12 model, kılavuz
ailesine göre öbeklenmiş (Hammer, Twin Hammer, Orka, i-Pak,
Süper / Yunus). Kullanıcının uygulamada kayıtlı makinesi olmasa da
destek çalışıyor. Kılavuzun kapsam kayıtları listede yok.

### Yeni: hızlı cevaplar ve kullanım kartları

Paketteki `quick_answers` ve `knowledge_cards` katmanları da ekrana
geldi:

- **Hızlı Cevaplar** — teknik özellikler soru-cevap biçiminde
  (*"HAMMER 420 için ağırlık nedir? → 2790 kg"*). Ekranda bunların
  kılavuzda soru-cevap olarak yazılı **olmadığı** belirtiliyor.
- **Kullanım** — prosedür, makine bilgisi ve servis bildirimi kartları.
- **Güvenlik uyarıları** — o makinenin bütün notları, ayrı düğmeden.

### Yeni: güvenlik kapısı

Çözüm adımları **doğrudan gösterilmiyor**. Önce o makinenin güvenlik
uyarıları listeleniyor ve "Okudum, Anladım" onayı isteniyor. Paketin
çalışma sözleşmesi de bunu şart koşuyor (`safety_acknowledged`).

### Yeni: kaynak alıntısı açılabiliyor

Her kartın altındaki "HAMMER KULLANIM KILAVUZU · s. 34" satırına
dokununca kılavuzdaki **asıl cümle** ve bölüm başlığı açılıyor. Müşteri
metnin değiştirilmediğini görebiliyor.

### Kılavuz ekranı

"Sık karşılaşılan sorunlar" bölümü arıza listesini kopyalamıyor, Destek
ekranına yönlendiriyor. Tek doğru kaynak olsun diye: veri seti
yenilendiğinde iki ekran ayrışmasın.

### Dikkat: kapsam kaydı bağlantısı

Pakette bir kılavuzun kapsadığı modeller "kapsam kaydı" altında
toplanıyor (`MCH_HAMMER_SERIES`, `MCH_PAKSAN_BALYA_SUPER`). Kayıtların
hangi modele bağlandığı **ailelere göre değişiyor**:

- Hammer ailesinde güvenlik notlarının `model_scope` alanı varyantları
  da sayıyor.
- Süper / Yunus ailesinde saymıyor; kayıt yalnız kapsam kaydına bağlı.

Doğrudan eşleştirmede Süper/Yunus modellerinin **güvenlik notu sıfır**
çıkıyordu — yani çözüm adımları hiçbir uyarı gösterilmeden açılıyordu.
Motor bu durumu zaten doğru çözüyor (`safetyFor` akışın makine kaydına
da bakıyor); `src/lib/destek.js` içindeki liste yardımcıları da aynı
kuralı izleyecek şekilde yazıldı.

Doğrulanan sayılar (Süper YUNUS 2 İpli): 25 arıza · 17 hızlı cevap ·
19 kullanım kartı · 51 güvenlik uyarısı.

> Hızlı cevaplar kasıtlı olarak kapsama genişletilmiyor: ağırlık, ölçü,
> bağlayıcı sayısı gibi varyanta özel değerler. Kapsama yayılsaydı iki
> ipli makinenin sahibine üç iplinin değerleri gösterilirdi.

### Sunum dosyası

`sunum/PAKSAN_CONNECT_SUNUM.md` — yöneticilere sunulacak, sunum
sonrasında incelenecek ayrıntılı doküman. Uygulama ve backoffice **ekran
ekran** anlatılıyor; ekranlar arası bağlantılar ayrı bölümde.

---

## PAKSAN Backoffice (backoffice)

Uygulamadan ayrı, **bilgisayarda tarayıcıda açılan** bir program. APK'nın
içine girmiyor; telefona kurulan uygulama yalnızca müşterinin gördüğü
kısım. Yayına çıktığında adresi `backoffice.paksanmakina.com.tr` gibi
ayrı bir alan adı olacak.

Backoffice uygulamayı **yönetmiyor**, uygulamanın arkasındaki iş takibi.
Uygulamaya bir özellik veya içerik eklenmesi gerekiyorsa o koddan
yapılıyor.

**Denemek için:** `npm run dev` çalışırken tarayıcıda
`http://localhost:5174/backoffice.html`

**İlk giriş:** kullanıcı adı `admin`, şifre `123456`. Bu hesap backoffice
boşken kendiliğinden açılıyor; kendi hesabınızı açtıktan sonra
silebilirsiniz. **Yayına çıkmadan bu şifre mutlaka değiştirilmeli.**

**Ayrı derleniyor:** `npm run build:backoffice` → `dist-backoffice/` klasörü.
Uygulamanın derlemesi (`npm run build` → `dist/`) backoffice’i içermiyor;
Capacitor yalnızca `dist/` klasörünü telefona kopyaladığı için backoffice’in
kodu APK'nın içine girmiyor. Bu kontrol edildi.

### Hesaplar ve roller

Backoffice hesapları **elle açılıyor**. Kimse kendi kaydını yapamıyor, kendi
rolünü seçemiyor. Admin, Personel ekranından kişiyi ekliyor; kullanıcı
adı addan üretiliyor (`Serhat Tecimen` → `serhat.tecimen`) ve şifre
uygulamadaki gibi 6 rakam.

| Rol | Ne görür, ne yapar |
|---|---|
| **Admin** | Her şey. Personel açar/siler, müşteri bilgisi düzeltir, numara değişikliğini onaylar. |
| **Yönetici** | Bütün talepleri ve kayıtları görür, personel listesini görür ama değiştiremez. |
| **Servis** | Yalnız servis taleplerini (SRV-…) görür. |
| **Yedek Parça** | Yalnız yedek parça taleplerini (YPR-…) görür. |
| **Satış** | Yalnız fiyat teklifi taleplerini (TKF-…) görür. |

Servis, yedek parça ve satış rolleri müşterileri ve bayileri de
görüyor. **Geri bildirimler** onlara kapalı — orası uygulamanın
gelişimi için, günlük işin parçası değil. Numara talepleri, personel ve
işlem kaydı da kapalı.

**Şifresini unutan kendi şifresini değiştiriyor.** Giriş ekranındaki
"Şifremi unuttum" kullanıcı adını soruyor ve o kişinin **kendi şirket
e-posta adresine** bir bağlantı gönderiyor. Bağlantıyı açan kişi yeni
şifresini iki kez yazıyor; eski şifre sorulmuyor, zaten unutulduğu için
oraya gelindi. Kimlik doğrulaması e-posta kutusuna erişimle yapılıyor.
Bağlantı tek kullanımlık ve 24 saat geçerli.

Sunucu gelene kadar e-posta gerçekten gitmiyor; bağlantı denenebilsin
diye ekranda gösteriliyor.

### Ekranlar

Menü **tek liste**; bütün düğmeler eşit aralıklı, en sık açılanlar
üstte. Önce ikiye bölünmüştü ("günlük iş" / "ayar işleri") ama iki
grubun sınırı kullanıcı için belli değildi — Raporlar neden ayar işi,
Duyurular neden günlük iş değil? Açıklanmayan bir ayrım bilgi vermiyor,
yalnızca menüyü kesiyordu.

Kimin neyi göreceği yine **rolüne göre** süzülüyor; menü düzeni değişti,
yetki kuralları aynı kaldı.

| Ekran | İş |
|---|---|
| **Dashboard** | Yöneticinin monitörü — aşağıda ayrıntısı var |
| **Talepler** | Duruma göre süzme ve arama; talebin tamamı (makine, seri no, belirtiler, fotoğraf, video, sesli not); durum değiştirme; iç not |
| **Müşteriler** | Kim, hangi makine, hangi seri no, garanti durumu, KVKK onayları, talep geçmişi; admin bilgileri düzeltebilir |
| **Bayiler** | Bayi ekleme, düzenleme, silme; koddaki listeye geri dönme |
| **Geri Bildirimler** | Uygulamadan gelen görüş ve öneriler; okundu işaretleme |
| **Raporlar** | Dönem raporları — yalnız admin ve yönetici |
| **Destek Kayıtları** | Uygulamadaki destek asistanının oturumları |
| **Duyurular** | Müşteriye gönderilen duyuru ve uyarılar |
| **Numara Değişikliği Talepleri** | Telefon numarası değişikliği taleplerinin onayı — yalnız admin |
| **Personel** | Backoffice hesapları — admin ekler/siler, yönetici yalnız görür |
| **İşlem Kaydı** | Kim, ne zaman, hangi rolle ne yaptı — silinemez |

**İşlem kaydında bütün loglar duruyor** — hem backoffice’te personelin
yaptıkları hem uygulamada müşterinin yaptıkları: talep açılması, makine
kaydı, geri bildirim, numara talebi, durum değişikliği, iç not, personel
işlemleri, şifre talepleri, bayi listesi değişikliği, Excel aktarımı,
demo verisi ve backoffice girişleri. Uygulamadan gelen satırlarda personel
alanında "Uygulama" yazıyor.

Ekran açılır açılmaz liste getirmiyor; kayıt binlerce satıra çıkıyor.
Arama kutusuna satırda geçen her şey yazılabiliyor: personel adı,
personel numarası (PRS003), talep numarası (SRV2608184821), müşteri
numarası (MST000001), bayi adı. Yalnız tarih aralığı seçilerek de liste
alınabiliyor.

### Profil

Sol alttaki ada tıklayınca kişinin kendi bilgileri açılıyor: personel
no, kullanıcı adı, rol, e-posta, telefon, oturum saati. Şifre değiştirme
de burada — giriş ekranındakiyle aynı yol, bağlantı kişinin şirket
e-postasına gidiyor.

### Müşteri kaydı

Müşteri seçilince sağda bilgileri açılıyor; adın altında müşteri
numarası ve telefonu okunaklı boyutta duruyor. Admin "Düzenle" ile ad,
il, ilçe ve makineyi aldığı yeri düzeltebiliyor — telefon buradan
değişmiyor.

### Geri bildirime cevap

Backoffice’te her geri bildirime cevap yazılabiliyor; cevap müşterinin
**Bildirimler** ekranına düşüyor. Uygulamada görüş gönderildiğinde
"Geri bildirimleriniz ekibimiz tarafından dikkate alınacaktır.
Teşekkürler." mesajı çıkıyor.

Her giriş Dashboard'dan başlıyor; önceki kullanıcının kaldığı ekran
açılmıyor.

### Dashboard

Üstte tek satır hızlı erişim kutusu (açılmamış, açık, bugün gelen,
48 saati geçen, numara talebi, okunmamış görüş, müşteri, kayıtlı
makine). Ekran daralırsa alt satıra kaymak yerine yana kayıyorlar.

Altında iki ölçü: **bu hafta gelen** (geçen haftaya göre yüzde
değişimle) ve **tamamlanma oranı**.

Sonra grafikler:

| Grafik | Ne söylüyor |
|---|---|
| Gelen talep | Günlük talep sayısı — dönem seçilebiliyor (7 / 14 / 30 / 90 gün), solda değer ölçeği, çubukların tepesinde sayısı |
| Talep Süreleri | Açık işin ne kadarı taze, ne kadarı bekliyor |
| Talep türü | Servis / yedek parça / fiyat teklifi dağılımı |
| Durum dağılımı | Yeni, incelemede, planlandı, kapandı, iptal |
| En çok talep gelen iller | İlk 6 il, her bar talep türüne bölünmüş |
| En çok talep alan makineler | İlk 5 model, her bar talep türüne bölünmüş |

Türlerin rengi bütün grafiklerde ve talep etiketlerinde aynı: servis
turuncu, yedek parça mor, fiyat teklifi mavi (`backoffice.css` →
`--tur-servis`, `--tur-parca`, `--tur-satis`). Kırmızı bilerek
kullanılmıyor; o renk gecikme işaretinin.

Hepsi girenin rolüne göre süzülüyor: servisçi yalnız servis
taleplerinin grafiğini görüyor. Grafikler dışarıdan kütüphane olmadan,
düz SVG ile çiziliyor (`src/backoffice/ekranlar/grafik.jsx`).

### Gecikmiş talep

Açık bir talep **48 saati geçtiyse** numarasının başında kırmızı ünlem
çıkıyor. Süzgeçteki "Gecikmiş talepler" seçeneği yalnız onları
getiriyor. Kapanmış taleplerde işaret yok.

Liste sütunları eşit genişlikte: talep no, müşteri, makine,
**telefon**, geldi, durum. Telefon listede duruyor ki personel numarayı
kendi iş telefonundan tuşlayabilsin — backoffice’te arama düğmesi yok.

Talep numarasının altında **tür etiketi** var; rengi Dashboard'daki
grafiklerle aynı.

### Talep sahipliği departmanda

Talep tek bir kişiye atanmıyor: yedek parça talebi yedek parça
ekibinin **tümünde**, servis talebi servis ekibinin tümünde görünüyor.
Rol süzgeci bunu kendiliğinden yapıyor.

Kişi bazlı atama denendi ve kaldırıldı: her talebi birine zimmetlemek
ekibe fazladan iş çıkarıyor, kimse atamayınca da liste "atanmamış" diye
yığılıyordu.

### Durum değişikliği onaydan geçiyor

Her durum değişikliği müşteriye bildirim gönderiyor; yanlış tıklama
müşteriyi yanıltır. Bu yüzden durum değiştirilirken onay penceresi
çıkıyor ve ne olacağı yazıyor.

**Kapanmış talep kapalı kalıyor.** Kapandı veya iptal olmuş bir talebin
durumunu yalnız **admin** değiştirebiliyor; ötekilere düğmeler kapalı.
Admin geri açtığında müşteriye bildirim **gitmiyor** — "tamamlandı"
haberini almış kişiye "yeniden açıldı" demek kafa karıştırır, iş PAKSAN
içinde toparlanıyor. Onay penceresi bunu açıkça yazıyor, işlem kaydına
da "bildirim gitmedi" diye düşüyor.

### Planlama

"Planlandı" demek tek başına bir şey anlatmıyordu. Artık **planlanan
tarih ve saat** ile **planlanan iş** soruluyor; ikisi müşterinin
bildirimine aynen gidiyor: *"21.08.2026 10:30 için planlandı. Servis
ekibi tarlada olacak, pikap dişi değişecek."*

**Servis randevusunda "Randevu gün ve saati müşteri ile görüşüldü"
kutusu zorunlu.** Sebebi saha gerçeği: çiftçi bildirime bakmayabilir,
servis aracı boşa gider. Tarih müşteriyle telefonda belirlenmeden
randevu kaydedilemiyor; bildirim o konuşmanın yazılı teyidi oluyor, tek
kaynağı değil. Kutunun işaretlendiği işlem kaydına da yazılıyor.

Randevudan **bir gün önce** uygulamada hatırlatma çıkıyor ("Yaklaşan
randevunuz"). Hatırlatma saklanmıyor; uygulama her açıldığında
randevunun tarihine bakılıp üretiliyor (`src/lib/bildirimler.js`).
Randevu bilgisi ayrıca **Profil > Taleplerim** içinde talebin kartında
duruyor — bildirim kaçsa bile görünüyor.

Fiyat teklifinde "Planlandı" aşaması yok: satış ekibi teklifi
hazırlarken "İncelemede", fiyatı verip müşteriyle konuştuktan sonra
"Kapandı" diyor.

### Talep kapatma

Kapanış formu türe göre değişiyor:

| Tür | Sorulanlar |
|---|---|
| Servis | Yapılan iş (zorunlu), değişen parça, ücret |
| Yedek parça | Yapılan iş (zorunlu), gönderilen parça, tutar |
| Fiyat teklifi | Verilen fiyat (zorunlu), teklif geçerlilik, sonuç, not |

Para alanlarına yalnız rakam yazılınca binlik ayracı kendiliğinden
konuyor: `1650000` yazıldığında kutuda `1.650.000` görünüyor. Cümle
yazılırsa ("Garanti kapsamında") dokunulmuyor.

Bu kayıt tutulmazsa makinenin arıza geçmişi oluşmuyor — "hangi modelde
hangi parça sık bozuluyor" sorusunun cevabı bu kayıtlardan çıkıyor.
Fiyat tekliflerinde ise "kaç teklif satışa döndü" buradan okunuyor.

### Garanti ve müşterinin geçmişi

Talebin detayında makinenin **garanti durumu** rozet olarak duruyor;
servisçi "bu garantili mi" sorusunu başka yerden aramıyor.

Altında **bu müşterinin önceki servis ve yedek parça talepleri**
listeleniyor. Numaralar tıklanabiliyor: tıklandığında o talep sağda
açılıyor.

### Raporlar

Admin ve yöneticiye açık. Dashboard "şu an ne oluyor" sorusuna bakıyor;
raporlar "geçen dönem ne oldu" sorusuna. Hepsi seçilen tarih aralığında
çalışıyor ve Excel'e aktarılabiliyor.

Ekran üç kat: en üstte **Bu Dönem** (altı sayı, önceki dönemle
karşılaştırmalı), altında **Dikkat İsteyenler** (müdahale gerektirenler,
her biri ilgili listeye tek dokunuşla gidiyor), en altta rapor
kartları. Kartta raporun cevapladığı soru ve bir başlık rakamı yazıyor;
dokununca tablosu açılıyor. Ayrıntı için bkz. 0.9.6 bölümü.

| Rapor | Ne söylüyor |
|---|---|
| Dönem özeti | Tür bazında gelen/kapanan/açık/gecikmiş, tamamlanma oranı, ortalama süreler |
| Personel performansı | Kim kaç talebe dokundu, kaçını kapattı, ortalama kapanma süresi |
| Model arıza raporu | Hangi model kaç kez arızalandı, en sık hangi belirtiyle |
| En çok istenen parçalar | Stok planlaması için parça sıralaması |
| Fiyat teklifi sonuçları | Verilen fiyatlar ve kaçı satışa döndü |
| Bölge dağılımı | İl bazında talep ve müşteri sayısı |
| Bayi raporu | Müşterinin "makineyi nereden aldım" beyanına göre dağılım |
| Bekleyen işler | 48 saati geçmiş açık işler ve cevap beklenen teklifler |
| Müşteri ve makine kayıtları | Dönemde kaydolan müşteriler ve makineleri |

⚠ Bayi raporu bir **satış rakamı değil**: yalnız uygulamaya kayıt olan
müşterilerin beyanı. Gerçek satış adedi Logo'daki faturadan gelir.

### Dashboard'dan süzgeçle geçiş

Hızlı erişim kutuları Talepler'i **kendi süzgeciyle** açıyor: "48 saati
geçen 17" kutusuna basınca o 17 talep geliyor, bütün liste değil.
"Gelen talep" grafiğindeki çubuklar da tıklanabilir — bir güne basınca o
günün talepleri açılıyor.

### Süzgeçler

Talepler, Müşteriler ve İşlem Kaydı ekranlarında süzgeçler açılır kutu:
"Durum: Açık olanlar" tek bakışta okunuyor. Yanında **tarih aralığı**
var — hazır seçenekler ve "Tarih seç" ile iki tarih kutusu. Talepler
ekranında "bu ay / geçen ay" yok; orada gün ölçeğinde bakılıyor.

Talep türü de süzgeçte. Tek türle çalışan rolde kutu kendi türünü
gösteriyor, değiştirilemiyor.

Talepler ekranında ayrıca **il, ilçe ve makine** süzgeci var; Müşteriler
ve Bayiler ekranlarında il ve ilçe (Bayiler'de bir de hizmet türü).
Seçenekler elimizdeki kayıtlardan çıkarılıyor — boş il listelenmiyor.

**Arama parça eşleşiyor:** telefonun son 6 hanesi, talep numarasının bir
bölümü veya seri numarasının sonu yeterli. Rakamlar boşluksuz hâliyle de
karşılaştırılıyor — "1415057" araması "549 141 50 57" numarasını
buluyor.

Süzgecin sağında kaç kayıt kaldığı yazıyor; Excel'e aktarma da o listeyi
indiriyor.

### Excel

Talepler, Müşteriler, Bayiler ve Personel ekranlarında "Excel'e aktar"
düğmesi var. **Ekranda ne görünüyorsa o iniyor**: rolün göremediği
kayıt dosyaya da girmiyor, süzgeç açıksa süzülmüş liste iniyor.

Bayiler ve Personel ekranlarında ayrıca **Excel'den alma** var, yalnız
adminde. Önce "Şablon indir" ile boş dosya alınıyor, doldurulup
"Excel'den al" ile yükleniyor. Sütunlar **başlığa göre** eşleşiyor;
sütun sırası değişebilir ama başlıklar değişmemeli. Hatalı satırlar
atlanıyor ve sebebi tek tek yazılıyor.

Excel dosyası dışarıdan kütüphane olmadan üretiliyor
(`src/backoffice/excel.js`) — backoffice internete çıkmasın diye.

### Kayıt numaraları

Telefonda konuşurken kaydı tek cümlede bulmak için her kaydın numarası
var (`src/lib/numara.js`):

```
MST000148   müşteri          GBD000032   geri bildirim
BAY014      bayi             PRS007      personel
SRV2608184821   servis talebi
```

Numaralarda tire yok: telefonda okurken ve Excel'de ararken tire
fazladan iş çıkarıyor.

### Tarayıcı bildirimi

Backoffice açıkken yeni talep veya geri bildirim geldiğinde tarayıcı
bildirimi gidiyor: "Yeni Talep — PAKSAN", "2 Yeni Geri Bildirim —
PAKSAN". İzin kendiliğinden istenmiyor; backoffice’in üstünde bir şerit
çıkıyor ve izni kullanıcı düğmeye basarak veriyor (tarayıcılar başka
türlüsünü engelliyor).

Sekme kapalıyken bildirim gitmiyor. Kapalıyken de gitmesi için sunucu
ve push servisi gerekiyor (bkz. PRODA-CIKIS.md → A1g).

### Devre nasıl kapanıyor

Müşteri uygulamadan talep açıyor → talep ilgili rolün backoffice ekranında
görünüyor → personel durumu değiştiriyor → müşterinin **Bildirimler**
ekranına düşüyor.

Numara değişikliğinde de aynı devre: müşteri uygulamadan yeni numarasını
ve makinesinin seri numarasını yazıyor → backoffice iki kontrolü kendisi
yapıyor (eski numara hesapla aynı mı, seri no müşterinin makinesine ait
mi) → admin onaylıyor → numara değişiyor ve müşteriye bildirim gidiyor.

**Otomatik bildirimler müşterinin dilinde çıkıyor.** Backoffice Türkçe ama
bildirimler metin değil *anahtar* olarak saklanıyor; İngilizce kullanan
müşteri "Your request has been completed" görüyor.

### Bekleme göstergesi

Backoffice ekranlarındaki bütün veri okumaları `src/backoffice/kanca.js` içindeki
`useVeri` kancasından geçiyor. Veri gelene kadar gri iskelet satırlar
duruyor. Şu an veri hafızada olduğu için bekleme göze çarpmıyor; sunucu
bağlandığında ekranlarda değişiklik gerekmeden çalışacak.

### Demo verisi

Backoffice boşken nasıl çalıştığı anlaşılmıyor. **Personel** ekranının
altındaki kutudan (yalnız admin) 10 personel, 30 müşteri, taleplerini
ve numara değişikliği taleplerini bir tıkla yükleyebilirsiniz.

Demo kayıtları uygulamanın kendi kayıtlarından ayrı depolarda duruyor;
müşterinin telefonundaki listeye karışmıyor. "Temizle" dendiğinde
gerçek kayıtlara dokunulmadan siliniyor.

Demo personel hesaplarının hepsinin şifresi **123456**.

Yayına çıkarken bu kutu kaldırılmalı.

### ⚠ Bu bir maket

Veri **backoffice’i açtığınız tarayıcının hafızasında** duruyor. Uygulamayı ve
backoffice’i aynı tarayıcıda açarsanız devre gerçekten kapanır; başka bir
bilgisayarda açarsanız orası boş görünür. İki cihazın birbirini görmesi
sunucuya bağlı (bkz. PRODA-CIKIS.md → A1).

Backoffice’in bütün veri erişimi tek dosyadan geçiyor: `src/backoffice/veri.js`.
Sunucu geldiğinde yalnızca o dosyanın içi değişecek, ekranlara
dokunulmayacak.

### Bayi listesi

Uygulama koddaki bayi listesini okumaya devam ediyor; backoffice’ten liste
girildiyse onun üstüne geçiyor (`src/lib/icerikDeposu.js`). Backoffice’te
dokunulmadığı sürece koddaki liste geçerli, "fabrika ayarına dön"
düğmesi her zaman geri getiriyor.

Backoffice’ten düzenlenen tek içerik bu. Ürün, rehber ve arıza kayıtları
koddan yönetiliyor.

---

## Logo ERP bağlantısı

PAKSAN'ın satış ve üretim kayıtları Logo'da. Backoffice’in ve uygulamanın
Logo'dan istediği tek şey seri numarasının geçmişi: makine ne zaman
üretildi, ne zaman fatura edildi, hangi bayiye satıldı.

**Neden gerekli:** müşteri makinesini seri numarasıyla kaydediyor ama
seri numarası tek başına "bu makine yeni satıldı" demiyor. 2019'da
satılmış bir makine bugün de kaydedilebilir, ikinci el alınmış olabilir.
Faturayı yalnız Logo biliyor.

Buna bağlı olan şey: **uygulamadaki "Hayırlı olsun!" penceresi.**
Müşteri makinesini kaydettiğinde yalnız Logo faturayı doğrularsa ve
fatura yeniyse çıkıyor. Logo bağlı değilken hiç çıkmıyor.

**Bağlantı Logo'ya doğrudan değil, PAKSAN sunucusu üzerinden kurulacak:**

```
Uygulama / Backoffice  →  PAKSAN sunucusu  →  Logo
```

Logo kullanıcı bilgileri telefona konamaz. Sunucu Logo'dan okuduğunu
sadeleştirip veriyor. Yapılacaklar `src/lib/logo.js` dosyasının başında
yazılı; bağlantı açılınca değişecek tek yer o dosya.

---

## Talep ekleri — fotoğraf ve video

Servis ve yedek parça taleplerine **en fazla 5 fotoğraf ve 1 video**
eklenebiliyor; video en fazla **30 saniye**. Süre aşılırsa dosya
alınmıyor ve ekranda kaç saniye olduğu yazıyor. Fiyat teklifinde ek
istenmiyor — orada makine henüz müşterinin elinde değil.

Fotoğraflar alınırken küçültülüyor (uzun kenar 1600 piksel). Telefon
kamerası 4-8 MB'lık kare çekiyor; tarladaki şebekeyle bu yüklenmez.

Dosyalar `localStorage`'da değil **IndexedDB**'de duruyor: localStorage
sınırı ~5 MB ve yalnızca yazı saklıyor, tek bir video onu tek başına
doldurur. Talebin içinde yalnızca ekin kimliği yazıyor
(`src/lib/ekler.js`).

Backoffice’te talebin detayında fotoğraflar küçük kare olarak duruyor,
tıklayınca tam boy açılıyor; video oynatılabiliyor.

---

## Şu an ne yapıyor?

**Herkes için**
- **Karşılama ekranı**: yalnızca PAKSAN logosu, "Yanınızdayız" ve iki
  buton — Kayıt Ol / Giriş Yap. Rakamlar ve kuruluş yılı kaldırıldı;
  ilk ekranın işi bilgi vermek değil, marka duygusu verip kullanıcıyı
  içeri almak. **Üç tasarım denenmek üzere kodda duruyor**, seçim
  `src/screens/Welcome.jsx` dosyasının en üstündeki `TASARIM` sabitiyle
  yapılıyor (A sanayi / B amblem / C tarla fotoğrafı).
- **Kayıt** tek form: ad, telefon, şifre, il. E-posta yok.
  ("Makinem var / makine almak istiyorum" ayrımı kaldırıldı — iki yol da
  aynı ekranlara çıkıyordu, soru boşa soruluyordu. Müşterinin makinesi
  olup olmadığı zaten seri numarasıyla kayıt açtığında belli oluyor.)
- **Telefon ülke koduyla ve başında sıfır olmadan** alınıyor (72 ülke,
  Türkiye en üstte). Yurtdışındaki müşteriler de aynı ekranı kullanıyor.
  Kullanıcı alışkanlıkla sıfır yazsa bile kendiliğinden atılıyor.
- **Şifre 6 rakam.** Bir çiftlikte aynı hesabı baba, oğul, çalışan
  birlikte kullanabiliyor; herkese ayrı hesap açtırmak yerine tek
  hesabın şifresi paylaşılıyor. Rakam olması eldivenle yazmayı ve
  telefonda söylemeyi kolaylaştırıyor. Şifre düz metin saklanmıyor.
- **KVKK Aydınlatma ve Açık Rıza metinleri** kayıt ekranında okunup
  onaylanıyor; onaylanmadan kayıt tamamlanmıyor. Kim, ne zaman, hangi
  sürümü onayladı kaydediliyor. Metinler sonradan profil sayfasının
  en altındaki bağlantıdan tekrar okunabiliyor.
- **Bildirim izni** kayıttan hemen sonra, ne işe yaradığı anlatılarak
  isteniyor. "Şimdi değil" denebiliyor.
- **Giriş**: kayıtlı telefon numarası + şifre
- **Şifremi unuttum**: numaraya altı haneli kod gider, kod girilince
  yeni şifre belirlenir. Kodun süresi (2 dakika) dolduğunda aşağıda
  **"Telefon numaranızı mı değiştirdiniz?"** yolu açılır — zorunlu
  değil, çünkü kod geç de gelmiş olabilir. Asıl beklenen "kodu tekrar
  gönder" hep daha üstte ve belirgin duruyor.
- **Telefon numarası değişikliği uygulamadan yapılmaz.** Giriş numarası
  hesabın kimliği; kullanıcı değiştirebilseydi telefonu bir süreliğine
  eline geçiren biri hesabı devralırdı. Değişiklik yalnızca PAKSAN
  yetkilisi tarafından, müşteriyle görüşerek yapılır. Uygulama müşteriyi
  bu ekrana yönlendiriyor ve kimlik doğrulaması için yanında ne
  bulunması gerektiğini söylüyor (makine seri numarası dahil).
- **Numara uygulamanın hiçbir yerinden değiştirilemiyor.** Profil,
  talep onayı, her yerde kilitli. Talep gönderirken "bu numara doğru
  mu?" diye soruluyor; kullanıcı "artık kullanmıyorum" derse numarayı
  yazdırmıyoruz, Paksan'a yönlendiriyoruz. Doldurduğu talep kaybolmuyor,
  açıklama aynı pencerede çıkıyor.
- **Çıkış**: yalnızca oturumu kapatır, kayıtları silmez.
  **Hesap silme uygulamadan yapılmaz** — talep PAKSAN'a iletilir,
  işlemi yetkili yürütür.
- Ürün kataloğu: 7 kategori, 20 model, arama
- Ürün sayfası: açıklama, teknik özellikler, videolar, teklif isteme
- **Bayi ve iletişim**: 20 nokta; konum izni verilirse en yakından
  uzağa sıralanır, verilmezse kayıtlı ile göre

**Makinesi olan müşteri için**
- **Seri no ile makine kaydı** — numarayı yazınca hangi model olduğunu otomatik buluyor
- Makinelerim listesi, garanti durumu
- Makine detayı: videolar, bakım takvimi (işaretlenebilir), teknik bilgiler
- **Bakım rehberleri**: günlük, sezon öncesi, sezon sonu — makinenin
  türüne göre uyarlanıyor. Her madde işaretlenebiliyor; bölümün bütün
  adımları yapılınca "tamamlandı" şeridi çıkıyor. İşaretler telefonda
  saklanıyor, çiftçi kaldığı yerden devam ediyor.
- **Kullanım kılavuzu ekranı** — makinenin kendi basılı kılavuzundan:
  güvenlik uyarıları, kullanım ve ayar, makine bilgisi, teknik değerler
  (model seçilerek), servis bildirimi. Her cümlenin altında kılavuzun
  sayfa numarası var. Yalnız gerçek kılavuzu olan makinelerde açılıyor.
- **Destek**: sohbet ekranı, kullanıcı yazı yazmıyor — hepsi düğme.
  Makine, sonra makinenin hangi bölümü, sonra ne gördüğü soruluyor.
  Cevapta o belirtinin bütün olası sebepleri sıralı geliyor; her
  sebepte "nasıl anlarsınız" ve "ne yapmalısınız" satırları, yanında
  tarlada mı yapılır yoksa servis işi mi olduğunu söyleyen bir rozet
  var. Çözülmezse başka belirti, servis talebi veya yedek parça
  talebine yönlendiriyor. Yirmi makinenin tamamı kapsanıyor.
- Servis talebi / yedek parça talebi oluşturma
- **Ses kaydı**: üç talep formunda da yazı kutusunun altında "ya da"
  deyip ses kaydı düğmesi var. Çiftçinin çoğu telefonda uzun yazı
  yazmak istemiyor — eldivenli parmak, güneş altında ekran. "Şu sesi
  bir dinleyin" demek yazmaktan hem kolay hem daha anlaşılır. En fazla
  60 saniye. Ses kaydı bırakıldıysa yazı zorunluluğu düşüyor.
  *(Kayıt şimdilik telefonda duruyor; sunucu gelince yüklenecek.)*

### Çalışma saati neden yok?

Makineler bir yere bağlı olmadığı için kaç saat çalıştıklarını bilemeyiz.
Bu yüzden çalışma saati hiçbir yerde tutulmuyor, gösterilmiyor ve bakım
"sıradaki iş" tahmini yapılmıyor. Bakım takvimi olduğu gibi listeleniyor,
çiftçi yaptığını kendisi işaretliyor.

### Garanti bilgilendirmesi nerede?

Makine sayfasında künyenin altında **yalnızca durum rozeti** var
("Garantinin son yılı" gibi) ve "Bilgiler" sekmesinde garanti şartları
yazılı. Ayrıca bir uyarı kartı **bilerek konmuyor**: garanti kapsamını
sürekli göze sokmak, sorunsuz parçalar için bile değişim talebini
artırıyor — bu da gereksiz operasyon yükü ve maliyet demek. Müşterinin
hakkı saklı, ama teşvik edilmiyor.

### Makine sayfasının düzeni

Gizli ayarlar menüsü kaldırıldı; her şey sayfanın kendi içinde:

1. Makine fotoğrafı ve künye (seri no, üretim yılı, garanti durumu)
2. **Sorun mu var? Destek Al** — ana buton
3. Kılavuz · Yedek Parça
4. **Servis talebi oluştur** — seri no otomatik gider
5. Videolar / Bakım / Bilgiler sekmeleri
6. En altta, sade biçimde: **Makine kaydını sil**

Genel (makine seçmeden) servis talebi ana sayfadaki hızlı işlemlerde,
"Servis" karosunda.

### Ana sayfa düzeni

Yukarıdan aşağı: marka + profil → selamlama → sayı şeridi → üç hızlı
işlem (Servis, Kılavuzlar, Yedek Parça) → Satın Al → Makinelerim →
Ürünlerimiz → Bakım rehberi.

"Bize ulaşın" bölümü kaldırıldı: bayi ve telefon bilgisi zaten
"Bayi ve İletişim" ekranında duruyor, ana sayfada tekrar etmiyor.

### Karşılama ekranı

Üç tasarım denenmişti; **sanayi tasarımı seçildi** ve diğer ikisi kodla
birlikte silindi. Neredeyse siyah lacivert zemin, üstünde teknik çizim
kâğıdı gibi ince ızgara ve solda dikey turuncu bir çizgi. Yazılar sola
hizalı, amblem yok — ortalanmış her şey "hazır şablon" hissi veriyordu.

### Telefon numarası hane sınırı

Numaraya en fazla **seçili ülkenin hane sayısı** kadar rakam yazılabiliyor
— Türkiye'de tam olarak 10. Sabit 10 verilmedi: Brezilya ve Çin'de numara
11 hane, sabit sınır o müşterilerin numarasını hiç yazamaması demekti.

### "Makineler" simgesi

PAKSAN'ın gönderdiği rulo balya makinesi simgesinden çizildi: dolu siluet
gövde, sol uçta çeki oku, altta kalın halkalı iki tekerlek.

Uygulamanın diğer simgeleri çizgi tabanlı; bu bilerek **dolu** bırakıldı —
kaynağı öyle ve alt menüde ürünün kendisini temsil ediyor. Renk
`currentColor`, yani sekme seçiliyken beyaza, değilken soluk beyaza
kendiliğinden dönüyor.

Daha önce çizilen ayrıntılı hâl 24 pikselde okunmuyordu; şimdiki çizim
küçük ekranda da açık. `src/components/Icons.jsx` içinde iki alternatifi
yorum olarak duruyor (sadeleştirilmiş dolu / tamamen çizgi), değiştirmek
birkaç satır.

### Alt menü

Menü **beş** eşit parçaya bölünüyor, simgeler tam ortalarında duruyor:
Ana Sayfa · Makineler · Ürünler · Destek · **Profil**.

Profil en sağda: hesabına bakmak nadiren yapılan bir iş, en uçta durması
yanlışlıkla dokunulmasını da azaltıyor. Profil oradan çıkınca ana
sayfanın sağ üst köşesi **Bildirimler**'e ayrıldı; okunmamış varsa
düğmenin üstünde sayı duruyor.

Sekme adı ekran başlığından kısa: menüde "Makineler", ekranın kendisinde
"Makinelerim". Beş sekmede her sekmeye düşen yer beşte bir olduğu için
uzun ad dar telefonda kesiliyordu.

Önce sekmeler yazıları kadar geniş bırakılmıştı; o zaman yazıların arası
eşit oluyordu ama simgelerin arası değil — göz alt menüde önce simgeleri
okuyor. Üstelik yazı uzunlukları dile göre değiştiği için menü Türkçe ve
İngilizcede farklı yerlere oturuyordu ("Ana Sayfa" 51px, "Home" 30px);
dil değiştirince menü kayıyordu. Eşit parçaya bölününce simge aralıkları
iki dilde de bire bir aynı (375px telefonda 81,8px).

Dar telefonlarda yazı bir punto küçülüyor, 340px altında yanlardaki
boşluk da daralıyor — "Makinelerim" ve "My Machines" 320px'te bile
kısalmadan sığıyor. Yalnızca seçili sekme renkleniyor, menü sekme
değişince oynamıyor. "Makinelerim" sekmesinin ikonu balya makinesi.

### İki ayrı veri kaynağı

Destek ve Kılavuzlar ekranları **ayrı kaynaklardan** besleniyor.

| Ekran | Kaynak | Kapsam |
|---|---|---|
| **Destek** | `src/data/destekVerisi.js` | Uygulamadaki 20 makinenin tamamı |
| **Kılavuzlar** | `src/data/mobile_support_package.json` | Kılavuzu olan 9 ürün |

**Destek verisi** makine sınıfının genel çalışma bilgisi: 7 grup,
19 bölüm, 36 belirti, 91 sebep, iki dilde. Elle yazıldı ve elle
düzenlenebilir. Kullanım kılavuzunun yerine geçmez, ekranda da bu
yazıyor. Ayrıntısı için bkz. 0.9.7 bölümü.

**Kılavuz verisi** aşağıda anlatılıyor.

### Kılavuz verisi

Veri tek dosyada: `src/data/mobile_support_package.json`. PAKSAN'ın beş
gerçek kullanım kılavuzundan çıkarıldı, iki dili de içinde:

    makineler        12   kılavuzların kapsadığı modeller
    bölümler         38   bağlama, pikap, düğüm atıcı…
    arızalar        121   kılavuzun arıza başlıkları
    sorular         200   teşhis soruları
    çözümler        205   sebep + yapılacaklar + parça kodu
    teknik değer    179   ölçü, ağırlık, devir
    kullanım kartı   44   bağlama, ayar, makine bilgisi
    güvenlik        262   kılavuzun uyarıları

**Bu dosya elle düzenlenmiyor.** Kılavuz güncellenince veri seti
yeniden üretilip kopyalanıyor; elle yazılan bir satır bir sonraki
üretimde kaybolur. Uygulamaya kopyalanan iki dosya:

    src/data/mobile_support_package.json    veri
    src/lib/mobile_support_runtime.ts       teşhis motoru

Motor artık yalnız Kılavuzlar ekranı için kullanılıyor; Destek ekranı
kendi verisine geçtiğinden teşhis akışı çalıştırılmıyor.

**Kayıtların hepsinin kaynağı yazılı** — hangi kılavuz, kaçıncı sayfa,
kılavuzdaki asıl cümle. Ekranda her satırın altında duruyor.
`node tools/destek-dogrula.mjs` kaynağı olmayan kayıt var mı diye
tarıyor (şu an: yok).

Uygulama tarafındaki iki yardımcı dosya:

    src/lib/destek.js        paketi okuma, kaynak satırı, arama
    src/lib/kilavuzVeri.js   ürün → kılavuz eşleştirmesi, bölüm süzgeçleri

Bu paketi yalnız `Manual.jsx` ve `ManualSafety.jsx` okuyor. Destek
ekranının pakete hiçbir bağı yok.

### İl ve ilçe listesi

`src/data/iller.js` — 81 il, 973 ilçe. Kayıt, profil ve üç talep
ekranında ilçe artık **elle yazılmıyor, seçiliyor**; liste seçilen ile
göre değişiyor. Böylece talepler tutarlı geliyor ve bayi eşleştirmesi
şaşmıyor. İl değişince ilçe seçimi temizleniyor.

Kaynak: turkiyeapi.dev. İdari değişiklik olursa dosyanın tamamı
yenilenebilir; ekranlarda değişiklik gerekmez.

### Videolar

Tanıtım videoları uygulamanın içine gömülüyor ve **uygulamadan
çıkmadan** oynatılıyor (`src/components/Video.jsx`). Tarlada internet
olmasa da açılırlar.

Video süresi listede **dosyadan okunuyor**, elle yazılan değere
güvenilmiyor: Orkinos tanıtımında "2:14" yazarken video gerçekte 26
saniyeydi. Elle girilen değer eskiyor, dosya eskimiyor.

Yeni video eklemek için dosyayı `src/assets/videolar/` altına koyun ve
`src/data/products.js` içindeki ilgili videoya `dosya:` alanıyla
bağlayın. Dış bağlantı (YouTube) kullanmak isterseniz `url:` alanı da
çalışmaya devam ediyor; o zaman video tarayıcıda açılır.

> Dikkat: gömülü video uygulama boyutunu doğrudan büyütür. Orkinos
> tanıtımı tek başına 6,7 MB. Çok sayıda video eklenecekse bunları
> sunucudan yayınlamak (Aşama 2) daha doğru olur.

### Ürün sıralaması

Listelerde önce balya makineleri, sonra yem karma makineleri gelir.
Balya grubunda öne çıkarılanlar: Süper Yunus, Orka 870, i-Pak.
Tek yerden yönetiliyor: `src/data/products.js` → `siralanmisUrunler()`.

### Talep numaraları

Her talep türü kendi ön ekini alıyor; numaradan türü okunabiliyor ve
veritabanında ön eke göre süzülebiliyor:

| Tür | Ön ek | Örnek | Rozet rengi |
|---|---|---|---|
| Servis | `SRV` | SRV-260814-4821 | kırmızı |
| Yedek parça | `YPR` | YPR-260814-3310 | turuncu |
| Fiyat teklifi | `TKF` | TKF-260813-9022 | mavi |

Biçim: `ÖNEK-YYAAGG-4hane`. Tek dosyada: `src/lib/talep.js`.

### Talep gönderilirken bekleme

Şu an talep telefona yazıldığı için gönderim anlık. Sunucu açıldığında
tarlada zayıf şebekeyle bu birkaç saniye sürebilir. Ekran buna göre
yazıldı:

- "Talebi Gönder" düğmesine basılınca düğme **"Gönderiliyor…"** olup
  içinde dönen bir halka çıkıyor ve kilitleniyor. Sabırsızlanıp tekrar
  basılamıyor — aynı talep iki kez gitmesin.
- Cevap gelince mevcut "Talebiniz alındı" ekranı açılıyor.
- Cevap gelmezse pencere kapanmıyor: hata yazısı çıkıyor, **doldurulan
  form olduğu gibi duruyor** ve aynı yerden tekrar denenebiliyor.

Aynı davranış geri bildirim gönderiminde de var; ikisi de tek düğme
bileşenini kullanıyor (`src/components/GonderButonu.jsx`).

Sunucu adresleri `src/config.js` → `SUNUCU` bloğunda; doldurulunca
ekranlarda değişiklik gerekmiyor (bkz. PRODA-CIKIS.md → A1f).

### Bildirimler

Ana sayfanın sağ üstünden ve alt menüden ulaşılıyor. Okunmamış satır
beyaz zeminde ve solunda mavi nokta; okunmuş satır soluyor. Satırlar
tarihe göre öbekleniyor (bugün / dün / bu hafta / daha eski),
"Tümünü okundu işaretle" başlıkta duruyor.

**Bildirimler uydurulmuyor.** İki kaynak var: kullanıcının kendi
oluşturduğu talepler — her talep için "talebiniz alındı" satırı çıkıyor,
talep silinirse satırı da gidiyor — ve backoffice’ten durumu değiştirilen
talepler. İkincisi metin olarak değil anahtar olarak saklandığı için
müşterinin kendi dilinde çıkıyor.

Hangi satırın okunduğu telefonda saklanıyor. Talepten üretilen satırlar
her açılışta yeniden üretiliyor; backoffice’ten gelen durum bildirimleri
kaydediliyor.

### Konum izni

İzin **kayıt akışının sonunda** bir kez isteniyor (bildirim adımından
sonra, ayrı bir ekranda — telefon iki izin penceresini üst üste açarsa
kullanıcı hangisine ne dediğini bilemez).

İzin verilmişse "Bayi ve iletişim" ekranı açılınca konum sessizce
okunuyor ve bayiler yakından uzağa sıralanıyor; kullanıcı hiçbir şeye
dokunmuyor. Verilmemişse ekran eski hâlinde: önce ne işe yaradığı
yazıyor, izni kullanıcı başlatıyor.

**Konumun kendisi saklanmıyor**, yalnızca izin durumu. Koordinat birkaç
gün sonra yanlış oluyor (çiftçi başka tarlada) ve saklanan konum kişisel
veridir. İzin telefon ayarlarından sonradan kapatılmışsa sessiz okuma
hata veriyor ve ekran kendiliğinden elle isteme hâline dönüyor.

### Geri bildirim

Profil sayfasının menüsünde "Görüş ve önerileriniz" satırı var. Meraklı
kullanıcı uygulamada eksik veya zor bulduğu şeyi yazıp gönderiyor.
Bilerek sade ve gösterişsiz tutuldu — herkesin dolduracağı bir anket
değil, yazmak isteyene açık bir kapı.

Şu an telefonda birikiyor; sunucu açıldığında oraya gidecek
(bkz. PRODA-CIKIS.md → A1e).

### Bayi haritası

Konum alındığında bayi listesinin üstünde bir **yön ve mesafe haritası**
çiziliyor: ortada kullanıcı, çevresinde bayiler gerçek yönlerinde ve
mesafe sırasında. Halkalar mesafe ölçeği. Bir noktaya dokununca aşağıdaki
listede o bayi işaretlenip ekrana getiriliyor.

**Yakınlaştırma radar mantığıyla.** Çizimi büyütmek işe yaramadı:
büyütünce bayiler kutunun dışına çıkıyor, ortada yalnız kullanıcının
noktası kalıyordu. Onun yerine **menzil** daralıyor — en dıştaki halkanın
kaç kilometreyi gösterdiği küçülüyor, yakındaki bayiler tüm daireye
yayılıyor, menzil dışında kalanlar düşüp altta "6 bayi menzil dışında"
diye yazılıyor. Radar ve balık bulucu ekranları böyle çalışır.

Ayrıca üst üste binen noktalar çizilmeden önce birbirinden ayrılıyor;
varsayılan görünümde bile hepsi dokunulabilir durumda.

**Sokak haritası değil, bilinçli olarak.** Google Maps veya Mapbox gibi
bir harita her açılışta internetten harita karesi indirir; bu uygulama
tarlada şebekenin zayıf olduğu yerde çalışmak üzere yazıldı. Ayrıca o
servisler anahtar ve kullanım başına ücret istiyor. Buradaki harita
telefonun içinde çiziliyor: internet gerekmiyor, ücret yok, anahtar yok.

Yol tarifi gerektiğinde telefonun kendi harita uygulaması açılıyor —
gerçek harita zaten orada.

Gerçek sokak haritası istenirse gereken üç şey var: harita sağlayıcı
seçimi, uygulamaya gömülecek bir anahtar ve kullanım başına ücret.
Bu, sunucu kararlarıyla birlikte konuşulmalı.

### Form hataları

Uzun formda sorun en üstteki alanda olabiliyor ama kullanıcı en altta,
gönder düğmesinin başındadır. İki şey birden yapılıyor: gönder düğmesinin
hemen üstünde kırmızı bir kutuda neyin eksik olduğu yazıyor, ve sorunlu
alan ekrana getirilip bir an için çerçeveleniyor. Yazı alanıysa imleç de
oraya gidiyor.

Alanlar `data-alan="ad"` gibi işaretli; taşıyan kod
`src/lib/formOdak.js`.

### Talepleri silme

Profil → Taleplerim listesinde satır **sola kaydırılınca** altından
"Sil" çıkıyor. Satıra **bir kez dokunulduğunda** satır kendiliğinden
biraz sola kayıp geri dönüyor: kaydırmayı hiç denemeyen kullanıcı
altında bir şey olduğunu böyle görüyor.

Düzenleme seçeneği kaldırıldı: gönderilmiş bir talebin içeriğini
sonradan değiştirmek, Paksan tarafındaki kayıtla ekranda görünenin
ayrışmasına yol açıyordu. Değişiklik gerekiyorsa talep silinip yenisi
açılıyor.

### Sayfa geçişleri ve alt sayfalar

- Sayfa değişince gövde kısa bir kayma animasyonuyla geliyor: ileri
  giderken sağdan, geri gelirken soldan. Başlık ve alt menü sabit kalıyor.
- Aşağıdan açılan sayfalar (KVKK metni, çıkış onayı, talep düzenleme)
  **tutma yerinden aşağı kaydırılarak** kapatılabiliyor. Parmak sayfayı
  gerçekten sürüklüyor; yeterince indirilirse kapanıyor, yoksa yerine
  geri oturuyor.

### Uygulama ikonu

Paksan kalkan amblemi, beyaz zemin üzerinde. Android'in üç ikon biçimi de
(kare, yuvarlak, uyarlanır) üretiliyor. Amblem değişirse:

```
node tools/ikon-uret.mjs
npx cap sync android
```

### Android geri hareketi

Telefonda kenardan kaydırarak geri gelme hareketi ve üç tuşlu gezinmedeki
geri tuşu artık uygulama içinde çalışıyor. Kural, Android'in kendi
tasarım rehberindeki gibi:

- **Alt sayfadaysanız** → bir önceki sayfaya döner
- **Kök sekmedeyseniz** (Makinelerim, Destek, Ürünler) → ana sayfaya döner
- **Ana sayfadaysanız** → "Çıkmak için tekrar geri gidin" uyarısı çıkar,
  iki saniye içinde ikinci kez geri giderseniz uygulama arka plana alınır

Tek dosyada: `src/lib/android.js`.

> Sürüm 0.2.0'da bu hareket uygulamayı doğrudan kapatıyordu. Sebebi
> `@capacitor/app` eklentisinin kurulu olmamasıydı: hareketi karşılayan
> kimse olmayınca Android varsayılan davranışı uyguluyordu.

### Uygulama içi geri butonu

Butonun üzerinde yalnızca **"Geri"** yazar — hangi sayfaya döneceği
yazmaz. Gerçekten geldiğiniz sayfaya döner (tarayıcı geçmişi). Uygulamaya
doğrudan o sayfadan girilmişse (geçmiş yoksa) mantıklı bir yedek sayfaya
gider. Ana sayfa gibi kök sekmelerde, oraya uygulama içinden gelinmediyse
buton hiç görünmez.

**Yeni müşteri için**
- Tanıtım videoları, ürün vitrini
- Fiyat teklifi talebi (arazi/ihtiyaç anlatarak)

---

## Prod'a çıkış listesi

Uygulamayı müşteriye açmak için yapılması gerekenlerin tam listesi ayrı
bir dosyada: **`PRODA-CIKIS.md`**. Orada demo döneminde bilerek konulmuş
ve çıkmadan önce kaldırılması gereken uyarılar da tek tek yazılı.

---

## ÖNEMLİ: Şu an gerçek olmayan kısımlar

Bunları bilmeniz gerekiyor, uygulamayı müşteriye açmadan önce çözülmeli:

**1. Talepler kimseye ulaşmıyor.**
Servis/parça/teklif talebi gönderince "Talebiniz bize ulaştı" yazıyor ama
talep sadece telefonun hafızasına kaydediliyor. Gerçekten Paksan'a
ulaşması için bir sunucu gerekiyor (Aşama 2).

**1b. Hesap yalnızca o telefonda geçerli.**
Kayıt ve giriş çalışıyor ama merkezî bir hesap yok. Müşteri telefon
değiştirirse veya uygulamayı silip yeniden kurarsa makine kayıtları
gelmez. Sunucu geldiğinde `src/config.js` içindeki `GIRIS` bloğu
doldurulacak; giriş SMS doğrulama koduyla çalışacak ve kayıtlar hangi
telefondan girilirse girilsin gelecek. Ekranlarda değişiklik gerekmiyor,
tek dosya: `src/lib/hesap.js`.

**1c. Şifre sıfırlama kodu SMS ile gitmiyor.**
"Şifremi unuttum" ekranı çalışıyor ama SMS altyapısı bağlı olmadığı için
kod gönderilemiyor; deneyebilmeniz adına ekranda gösteriliyor. **Bu kutu
prod'a çıkmadan silinmeli** — kod ekranda kaldığı sürece şifre sıfırlama
hiçbir işe yaramaz, telefonu eline geçiren herkes şifreyi değiştirebilir.
(`src/screens/SifreSifirla.jsx` ve `src/lib/hesap.js` → `otpGonder`)

**1d. Numara değişikliği için Paksan tarafında süreç kurulmalı.**
Uygulama müşteriyi doğru şekilde Paksan'a yönlendiriyor ama karşı tarafta
bu talebi kimin alacağı, kimin onaylayacağı ve numarayı hangi ekrandan
değiştireceği belirlenmiş olmalı. Kimlik doğrulaması için müşteriden
makine seri numarası isteniyor — seri numarasını yalnızca makinenin
başındaki kişi bilir.

**1b-2. KVKK metinleri hukukçu onayı bekliyor.**
Üç metin var, hepsi uygulamanın gerçek işleyişine göre yazıldı: hangi
veriyi topladığımız, ne için kullandığımız ve kime aktardığımız
maddelerle birebir uyuşuyor.

| Metin | Zorunlu mu? |
|---|---|
| KVKK Aydınlatma Metni | Evet |
| Açık Rıza Metni | Evet |
| Kampanya ve Duyuru Bildirimleri | **Hayır — isteğe bağlı** |

Unvan ve iki adres sitenizden alındı. Resmî unvanda A.Ş. / Ltd. Şti.
gibi bir ek varsa ve VERBİS kaydınız varsa `src/config.js` içindeki
`SIRKET.unvan` alanına eklenmeli. Metinler **taslak**; yayına çıkmadan
önce hukuk danışmanınız okuyup onaylamalı.

İki hukuki not:
- KVKK'da açık rızayı hizmetin şartına bağlamak tartışmalıdır ("rıza
  vermezsen kayıt olamazsın"). Siz "onaylamadan kayıt olmasın" dediğiniz
  için öyle kurdum; danışmanınız aksini söylerse açık rıza onayını
  isteğe bağlı hale getirmek tek satırlık bir değişiklik.
- Kampanya/duyuru izni 6563 sayılı kanun gereği **zorunlu tutulamaz**,
  bu yüzden isteğe bağlı bıraktım. İşaretlenmese de kayıt tamamlanıyor.
  Kullanıcı bu izni sonradan profil sayfasının altındaki "Kişisel
  verilerin korunması" bağlantısından açıp
  kapatabiliyor.

Metinler tek dosyada: `src/data/kvkk.js`. Değiştirirseniz aynı dosyadaki
`KVKK_SURUM` numarasını artırın — böylece kimin hangi metni onayladığı
karışmaz.

**1b-3. Bildirimler henüz gerçekten gönderilmiyor.**
İzin isteme ekranı ve izin kaydı hazır. Ama bildirimi *göndermek* için
sunucu ve Android tarafında Capacitor push eklentisi gerekiyor
(Aşama 2 + Aşama 4). O zaman yalnızca `src/lib/bildirim.js` değişecek:
izin alınıp cihaz bildirim kimliği PAKSAN sunucusuna yollanacak.
Ekranlarda değişiklik gerekmiyor.

**Demo APK'da:** "Bildirimlere İzin Ver" düğmesine basınca Android izin
kutusu ÇIKMAZ; ekranda "bu demo sürümünde henüz çalışmıyor" yazısı
görünür ve kayıt normal şekilde tamamlanır. Sebebi, Android uygulama
içi tarayıcısında web bildirim arayüzünün bulunmaması. Eklenti
kurulduğunda gerçek izin kutusu çıkacak.

**1b-4. Demo APK'da neler çalışır, neler çalışmaz?**

| Çalışır | Çalışmaz |
|---|---|
| Kayıt, giriş, çıkış | Bildirim gönderimi |
| Makine kaydı (seri no ile) | Taleplerin Paksan'a ulaşması |
| Kılavuz, videolar, bakım listesi | Gerçek bayi bilgileri (liste temsili) |
| Destek asistanı (çevrimdışı rehber) | PAKSAN yapay zekâsı (henüz bağlı değil) |
| Numaraya dokununca arama ekranı | |
| Konum izni ve bayi sıralaması | |

**1c. Bayi listesi uydurma.**
Türkiye geneline dağıtılmış 20 temsili bayi yazıldı — isimler, adresler
ve telefonlar gerçek değil. Ekranda da bu açıkça uyarı olarak yazıyor.
Gerçek liste geldiğinde tek dosya değişir: `src/data/bayiler.js`.

**2. Seri numarası biçimini ben varsaydım.**
Şu an `MODELKODU-YIL-SIRANO` (örn. `ORK1270-2024-00157`) biçimini
kullanıyor. Paksan'ın gerçek seri no biçimi neyse onu söyleyin,
tek dosya değiştirerek (`src/lib/serial.js`) uyarlarız.

**3. Teknik özellikler temsili.**
Balya ölçüsü, traktör gücü gibi değerleri genel bilgiye göre yazdım.
Gerçek kataloğunuzdaki değerleri verin, hepsini düzelteyim.

**4. Kılavuz PDF'leri ve videolar yok.**
Ekranlar hazır, sadece dosya adresleri boş. PDF kılavuzları ve YouTube
video linklerini verdiğinizde `src/data/products.js` dosyasına eklenir.

**5. PAKSAN yapay zekâsı henüz bağlı değil — bağlantı hazır bekliyor.**
Destek asistanı, PAKSAN için geliştirilen LLM'e bağlanacak şekilde kuruldu.
Bağlamak için tek yapılacak: `src/config.js` dosyasında iki satır.

```js
export const AI = {
  aktif: true,
  endpoint: 'https://destek.paksanmakina.com.tr/api/sor',
}
```

Ekranlarda hiçbir değişiklik gerekmiyor. Uygulama LLM'e şunları gönderiyor:
soru, sohbet geçmişi, hangi ürün, makinenin seri no / üretim yılı /
çalışma saati ve müşterinin ili. Böylece asistan "hangi makineden
bahsedildiğini" biliyor. Beklenen istek ve cevap biçimi
`src/lib/ai.js` dosyasının sonunda örnekle yazılı.

**Not:** API anahtarı uygulamanın içine konmamalı. Uygulama sadece PAKSAN
sunucusuna soru yollar, anahtar orada durur. Aksi halde uygulamayı indiren
herkes anahtarı çıkarabilir.

**6. Çevrimdışı yedek — bilinçli olarak dar tutuldu.**
Tarlada internet çekmediğinde müşteri ekranda yalnız kalmasın diye
telefonun içinde temel bir arıza rehberi var. LLM bağlandığında asıl
cevapları o verecek; bu rehber sadece bağlantı koptuğunda devreye giriyor.
Genişletilmesine gerek yok. İçeriğini yine de servis ekibiniz bir okusun.

---

## Ekran boyutlarına uyum — sonraya bırakılan iş

**Soruldu:** uygulama ve backoffice başka ekran boyutlarında farklı mı
görünüyor? **Cevap:** ikisi de uyumlu kurulmuş ama backoffice'te
denenmemiş aralıklar var.

**Uygulama** ölçüye göre uyum sağlıyor. Genişlikler yüzde ve `max-width`
ile veriliyor, sahne yükseklikleri `vh` cinsinden, alt menü etiketleri
420 ve 340 pikselde küçülüyor, kısa ekranlar için ayrı bir kural var.
320-430 piksel aralığında ölçülerek denendi.

**Backoffice** iki kırılma noktası taşıyor (1100 ve 860 piksel); 860'ın
altında yan menü yataya dönüyor. Tablolar kendi içinde yatay
kaydırılıyor, sayfa gövdesi kaymıyor.

**Bulunan ve düzeltilen sorun:** Dashboard'un üstündeki dokuz sayı
kutusu tek satıra zorlanıyordu. Ölçüldü — dokuz kutu 1214 piksel
istiyor, 1366 piksellik ekranda içeriğe 1023 piksel kalıyor. En yaygın
dizüstü çözünürlüğünde kutuların üçte biri ekran dışında kalıyordu.
Artık sarıyorlar.

**Kalan iş (öncelik değil):**

- Backoffice 1100-1366 aralığında sistematik olarak denenmedi;
  düzeltilen kutu bu aralıkta çıktı, başka yerlerde de olabilir.
- Tarayıcı büyütme oranı (%110, %125) ayrı bir durum: ekran aynı kalıp
  her şey büyüyor. Denenmedi.
- Gerçek telefonlarda yalnız tek cihazda bakıldı; farklı en-boy
  oranlarında (katlanabilir, tablet) denenmedi.

---

## Sizden gereken bilgiler

| Konu | Ne lazım |
|---|---|
| Seri no | Gerçek seri numarası biçimi ve model kodları |
| Ürünler | Her modelin gerçek teknik özellikleri |
| Kılavuzlar | PDF kullanım kılavuzları |
| Videolar | YouTube video linkleri (tanıtım + kullanım) |
| Görseller | Küçük balya modellerinin ayrı fotoğrafları (6'sı aynı görseli paylaşıyor) |
| Servis | Çevrimdışı arıza rehberinin onayı |
| Bayiler | Gerçek bayi listesi (ad, il/ilçe, adres, telefon, hangi hizmetleri verdiği) |
| Garanti | Gerçek garanti süresi (şu an 2 yıl varsayıldı) |
| **Banka** | **Yedek parça ödemesi için gerçek IBAN'lar** — `src/config.js` → `BANKA`. Girilmeden ödeme ekranı hesap bilgisi göstermiyor. |
| **Yedek parça fiyatları** | **Gerçek fiyat listesi ve parça kodları** — `src/data/parcaFiyat.js`. Şu anki 30 kayıt demo için uydurulmuştur. |
| **İhracat** | Yurtdışı taleplerinin gideceği e-posta adresleri — `src/config.js` → `IHRACAT.epostalar` |
| KVKK | Metinlerin hukukçu onayı + resmî unvan eki (A.Ş./Ltd.) ve VERBİS bilgisi |

---

## Sonraki aşamalar

**Aşama 2 — Sunucu**
Taleplerin gerçekten Paksan'a ulaşması, kayıtların merkezi tutulması,
hangi seri numaranın kimde olduğunun takibi, bayi backoffice’i ve **SMS
doğrulamalı giriş** (müşteri telefon değiştirse de kayıtları gelsin).

**Aşama 3 — PAKSAN yapay zekâsının bağlanması**
Sizin geliştirdiğiniz LLM'in uygulamaya bağlanması (`src/config.js`),
sonrasında fotoğraftan arıza teşhisi gibi ekler.

**Aşama 4 — Android uygulaması**
Capacitor kuruldu, **demo APK üretiliyor** (aşağıya bakın). Kalan iş:
gerçek imza anahtarı, uygulama ikonu ve Google Play Store'a yükleme.

**Aşama 5 — iOS**
Aynı koddan iPhone uygulaması. Mac bilgisayar gerekiyor.

---

## Teknik özet

- React 19 + Vite 6, arayüz tamamen Türkçe
- Mobil öncelikli tasarım, büyük buton ve yazı (çiftçi/bayi kullanımı için)
- Veriler telefonun hafızasında (localStorage) — internet gerektirmiyor
- Android'e çevirmek için Capacitor kullanılacak (travel-planner projesindeki
  ile aynı yöntem)

### Kurumsal kimlik

Logo ve amblem **sitenizden alınan gerçek dosyalar** (`src/assets/marka/`).

Ekranların zemini açık olduğu için logo **kendi kurumsal mavisiyle,
kutusuz** duruyor — en net göründüğü hâli bu.

- **Başlıkta işlem butonu yoksa** → tam logo (kalkan + "paksan")
- **İşlem butonu varsa** → yer kalsın diye yalnızca kalkan amblemi
- **Karşılama ekranı** koyu lacivert olduğu için orada logo beyaz bir
  rozetin içinde duruyor (tek istisna)
- **Destek asistanının avatarı** kalkan amblemi
- Tek yerden yönetiliyor: `src/components/Marka.jsx`

### Renkler

Paksan'ın gerçek görüntüsü uygulamaya taşındı: **makineler turuncu,
etiketler mavi/beyaz.** Turuncu tonu, ürün fotoğraflarından piksel
örneklemesiyle bulundu (ışığa göre `#CC5400` – `#FC7824` arası).

| Renk | Kod | Nerede |
|---|---|---|
| Paksan mavisi | `#1848A8` | Logo, başlık, alt menü, ana butonlar |
| Koyu lacivert | `#0A1F4D` → `#071730` | Başlık ve karşılama backofficelerinin degradesi |
| Makine turuncusu | `#E8641A` | Vurgular, marka şeridi, rozetler |
| Buton turuncusu | `#C7490A` | Turuncu butonlar (beyaz yazı okunsun diye koyu) |

Mavi backofficelerin altındaki ince turuncu şerit, "mavi etiket / turuncu
gövde" görüntüsünü arayüze taşıyan imza detay.
Renkleri değiştirmek isterseniz hepsi tek yerde: `src/styles.css` en üstte.

### Tema (v3 — güncel)

Tema, **dribbble.com/tags/mobile-app-ui** üzerinden seçilen bir referansa
göre yeniden kuruldu: Phenomenon Studio'nun "EvoCare" (araç bakım) ve
"Packsy" (kargo takip) uygulama tasarımları. Bu iki iş seçildi çünkü
ikisi de bizimkiyle aynı işi yapıyor — bir kullanıcının **kendi
cihazını takip ettiği**, servis ve bakım çağırdığı uygulamalar.

Referanstan alınan yaklaşım:

- **Renkli başlık çubuğu yok.** Sayfa başlığı doğrudan açık zeminde,
  büyük ve kalın duruyor; işlemler sağda yuvarlak butonlarda. Sayfa
  kaydırılınca başlığın altında ince bir çizgi beliriyor.
- **Yüzen alt menü**: koyu lacivert hap, kenarlardan ayrık. Aktif sekme
  genişleyip beyaz hapın içinde yazısını açıyor, diğerleri sadece ikon.
- **Marka rengi arayüzü kaplamıyor**, öne çıkan kartlarda kullanılıyor.
  En güçlü çağrı olan "Makinenizi kaydedin" kartı turuncu.
- **Sayı şeridi**: ana sayfada tek kart içinde üç sütun — kayıtlı makine,
  toplam çalışma saati, garanti kapsamındaki makine sayısı.
- Bölüm başlıklarında küçük büyük-harf "eyebrow" etiketleri, ince
  çerçeveli durum hapları, kartlarda yumuşak katmanlı gölge.

Koyu lacivert yalnızca iki yerde kaldı: **karşılama ekranı** ve **alt
menü**. Böylece açık zemindeki ürün fotoğrafları öne çıkıyor.

### Yazı tipi

Uygulamanın tamamında **tek yazı tipi** var: Roboto. Logo bir görsel
olduğu için o ayrı. Seri numaraları dahil hiçbir yerde ikinci bir yazı
tipi kullanılmıyor (eskiden seri numaralarında daktilo tarzı ayrı bir
font vardı, kaldırıldı).

Kullanılabilecek kalınlıklar: **400 normal · 500 orta · 700 kalın ·
900 çok kalın**. Başka bir değer yazılırsa (600, 800 gibi) tarayıcı en
yakınına yuvarlıyor ve ekranda beklenmedik bir kalınlık çıkıyordu;
hepsi bu dörde çekildi. Yeni bir kalınlık gerekirse önce
`src/main.jsx` içine o kalınlığın dosyası eklenmeli.

### Başlık altı yazıları

Sayfa başlıklarının altına **tanıtım cümlesi konmuyor**. Alt yazı
yalnızca bilgi taşıyorsa duruyor: "1 kayıtlı makine", "20 bayi ve
servis noktası", kılavuzda hangi makinenin kılavuzu olduğu gibi.

### Ürün fotoğrafları

15 makine fotoğrafı sitenizden alındı. Orijinaller 1800x1800'dü ve
makinenin üstünde/altında çok boşluk vardı; makine bölgesi ölçülüp
kırpıldı ve 720x450 (16:10) olarak kaydedildi — böylece kartlarda
makine çerçeveyi dolduruyor. Toplam 640 KB.

Fotoğraflar beyaz zeminli olduğu için arayüzde **daima açık yüzeylerde**
gösteriliyor; koyu ekranlarda beyaz bir kartın içine alınıyor.

Küçük balya modellerinin 6'sı aynı fotoğrafı paylaşıyor (sitede de öyle).
Modele özel fotoğraflar gelince `src/data/gorseller.js` içinde tek tek
bağlanır.

### Dosya düzeni

```
src/
  config.js           → AYARLAR: yapay zekâ bağlantısı, şirket bilgileri
  styles.css          → renkler ve tüm tasarım
  data/products.js    → ürün kataloğu (7 kategori, 20 model)
  data/destek.js      → çevrimdışı arıza rehberi (yedek yol)
  data/bayiler.js     → BAYİ LİSTESİ (şu an temsili — gerçeği gelince burası)
  data/kvkk.js        → KVKK, açık rıza ve kampanya izni metinleri (taslak)
  lib/bildirim.js     → bildirim izni (Capacitor'a geçince yalnızca burası)
  lib/serial.js       → seri no çözümleme, garanti hesabı ve bilgilendirmesi
  lib/hesap.js        → kayıt/giriş (sunucu gelince yalnızca burası değişir)
  lib/ai.js           → destek asistanı: LLM bağlantısı + çevrimdışı yedek
  lib/tel.js          → telefon biçimi ve arama bağlantıları
  screens/            → ekranlar
  components/         → ortak parçalar (üst bar, alt menü, ikonlar)
```

### Telefonla arama

Numaraya dokunulduğunda telefonun arama ekranı açılır (Android
uygulamasında da aynı). Bilgisayarda tarayıcıda denerken arama
yapılamayacağı için, tıklanınca numara ekranda bir bildirim olarak
gösterilir — buton bozuk sanılmasın diye. Tek yerden yönetiliyor:
`src/lib/tel.js`.
