# PAKSAN Connect — Prod'a Çıkış Listesi

Bu liste, uygulamanın müşteriye açılabilmesi için yapılması gerekenleri
sıralıyor. Üç bölüm var:

- **A** — Olmadan çıkılamaz (uygulama yanlış bilgi verir veya çalışmaz)
- **B** — Sizden gelmesi gereken içerik
- **C** — Çıkmadan önce uygulamadan kaldırılacak geçici uyarılar

Her maddede hangi dosyanın değişeceği yazılı.

---

## A — Olmadan çıkılamaz

### A1. Sunucu (en büyük iş)

Şu anda **her şey telefonun içinde**. Uygulama silinirse veya telefon
değişirse hiçbir kayıt geri gelmez, hiçbir talep Paksan'a ulaşmaz.

Sunucunun yapması gerekenler:

| İş | Neden şart |
|---|---|
| Talepleri almak | Şu an müşteri "Talebiniz bize ulaştı" görüyor ama talep kimseye gitmiyor. **Bu, uygulamanın müşteriye yalan söylediği tek yer.** |
| Hesapları tutmak | Telefon değişince makine kayıtları gelsin |
| **SMS gönderimi** | **"Şifremi unuttum" ekranı hazır ve çalışıyor ama kodu gönderecek SMS altyapısı yok. Şu an kod ekranda gösteriliyor (demo).** |
| Şifre kontrolü | Şifre şimdilik telefonda tuzlanıp özetlenerek saklanıyor. Sunucu gelince kontrol sunucuya geçmeli, şifre cihazda hiç durmamalı |
| Kayıtlı makineleri tutmak | Hangi seri numara kimde, takip edilebilsin |
| Bildirim göndermek | İzin ekranı hazır ama gönderecek taraf yok |

### A1b. Numara değişikliği için Paksan tarafında süreç

Giriş numarası hesabın kimliği; müşteri kendi başına değiştiremiyor
(uygulamadan değiştirilebilseydi telefonu eline geçiren biri hesabı
devralabilirdi). Numara **uygulamanın hiçbir yerinden** düzenlenemiyor:
profilde kilitli, talep gönderirken açılan onay penceresinde de kilitli.
Üç yol da aynı ekrana çıkıyor (`src/screens/NumaraDegisikligi.jsx`,
metinler `src/data/numaraDegisikligi.js`) ve kimlik doğrulaması için
**makine seri numarası + ad soyad + eski/yeni numara** isteniyor.

Devre backoffice’te kuruldu: müşteri uygulamadan yazılı talep bırakıyor
(`src/lib/numaraTalebi.js`), talep backoffice’in **Numara Talepleri**
ekranında görünüyor, backoffice iki kontrolü kendisi yapıyor (eski numara
hesapla aynı mı, seri no müşterinin kayıtlı makinesine ait mi) ve admin
onaylayınca numara değişip müşteriye bildirim gidiyor. İşlem kaydına da
yazılıyor.

Paksan tarafında kalan iş:

- Bu talebe kimin bakacağının belirlenmesi (admin rolü kimde olacak)
- Kimlik doğrulaması tutmadığında ne yapılacağı — backoffice uyarı veriyor
  ama son kararı insan veriyor
- Sunucu geldiğinde talebin ağdan gelmesi (şu an aynı tarayıcıda)

### A1c. Ses kayıtları sunucuya yüklenmeli

Talep formlarındaki "Ses Kaydı Bırakın" düğmesi çalışıyor ama kayıt
şimdilik **telefonun hafızasında, talebin içinde** duruyor. Sunucu
geldiğinde ses dosya olarak yüklenmeli, talebe yalnızca adresi
yazılmalı.

Bilinmesi gerekenler:

- Kayıt en fazla **60 saniye**, düşük bit hızıyla (24 kbps) alınıyor.
  60 saniye ≈ 250 KB. Telefon hafızasının uygulamaya ayırdığı alan
  ~5 MB; yani 15-20 kayıttan sonra doluyor. Sunucuya taşınana kadar
  bu sınır var.
- Android izni eklendi (`RECORD_AUDIO`). İzin uygulama açılışında
  değil, kullanıcı düğmeye bastığında isteniyor. İzin verilmezse
  kullanıcıya yazarak anlatabileceği söyleniyor, talep yine
  gönderilebiliyor.
- **Gerçek telefonda denenmesi gerekiyor**: tarayıcıda çalıştığı
  doğrulandı, Capacitor WebView'inde mikrofon izninin sorunsuz
  istendiği cihazda görülmeli.

### A1d. Destek asistanı gerçek yapay zekâya bağlanınca

`src/config.js` → `AI.aktif = true` yapıldığında sohbet PAKSAN'ın kendi
servisine bağlanıyor. O noktada sohbet ekranına eklenebilecek iki şey
**şimdiden not alındı**:

| Ne | Ne işe yarar |
|---|---|
| **Görsel gönderme** | Çiftçi arızalı parçanın fotoğrafını çekip gönderir. "Şu parça kırılmış" demekten çok daha net; yanlış parça gönderme riskini düşürür. |
| **Ses kaydı** | Talep formlarında zaten var (`src/components/SesKaydi.jsx`), aynı bileşen sohbete de konabilir. Anormal ses, titreşim gibi arızalarda sesin kendisi en iyi tarif. |

İkisi de sunucuya dosya yükleme gerektiriyor; A1'deki sunucu işiyle
birlikte planlanmalı.

### A1e. Geri bildirimler sunucuya gitmeli

Profil sayfasına "Görüş ve önerileriniz" satırı eklendi. Yazılan metin
şu an **telefonun hafızasında** biriktiriliyor (`paksan.geribildirim`,
en fazla 50 kayıt). Sunucu açıldığında `src/config.js` →
`SUNUCU.geriBildirimEndpoint` doldurulmalı; o an itibarıyla yeni
geri bildirimler doğrudan gidiyor.

Cihazda birikmiş eski kayıtların da gönderilmesi isteniyorsa, uygulama
ilk açılışta `geriBildirimListesi()` içinden `gonderildi: false`
olanları sunucuya yollamalı. Bu kod HENÜZ YOK.

Kayıtta ne var: metin, tarih, uygulama sürümü, kullanıcının adı ve
telefonu, hangi dilde yazıldığı.

### A1f. Gönderim beklemesi — sunucu adresleri

Talep gönderimi ve geri bildirim tek yerden geçiyor
(`src/lib/sunucu.js`). Ekranlar zaten beklemeyi gösterecek şekilde
yazıldı: gönder düğmesine basıldığı anda düğme "Gönderiliyor" olup
kilitleniyor, cevap gelmezse hata gösteriliyor ve **form kaybolmadan**
tekrar denenebiliyor.

Sunucu hazır olduğunda yapılacak tek şey `src/config.js` içinde:

```
SUNUCU.aktif = true
SUNUCU.talepEndpoint = 'https://.../api/talep'
SUNUCU.geriBildirimEndpoint = 'https://.../api/geri-bildirim'
```

Sunucudan beklenen cevap: talep için `{ "no": "SRV-260817-4821" }`
(talep numarasını sunucu üretiyorsa onunki geçerli sayılıyor), geri
bildirim için cevabın içeriği önemli değil.

Zaman aşımı 30 saniye (`SUNUCU.zamanAsimi`). Tarlada şebeke zayıf
olabildiği için geniş tutuldu; aşılırsa kullanıcı hata görüp yeniden
deniyor, talep yarım kaydedilmiyor.

⚠ **Sunucu açıldıktan sonra gerçek şebekede denenmeli**: uçak moduna
alıp gönderilmeli (hata çıkmalı, form durmalı), sonra zayıf şebekede
gönderilmeli (düğme beklemede kalmalı, çift kayıt oluşmamalı).

### A1g. Backoffice sunucuya bağlanmalı

PAKSAN personeli için backoffice yazıldı (`backoffice.html`, `src/backoffice/`).
Altı ekranın hepsi çalışıyor — Özet, Talepler, Geri Bildirimler,
Müşteriler, Bayiler, İşlem Kaydı — ama veri **tarayıcının hafızasında**:
backoffice ile uygulama ancak aynı tarayıcıda açılırsa birbirini görüyor.

Sunucu geldiğinde değişecek tek dosya `src/backoffice/veri.js` — backoffice’in
bütün veri erişimi oradan geçiyor, ekranlara dokunulmayacak.

Sunucuyla birlikte gereken üç şey:

- **Personel hesapları.** Şu an tek bir backoffice şifresi var ve gerçek bir
  kimlik doğrulaması değil. Kim ne yaptı bilgisi işlem kaydında tutuluyor
  ama kimse kendi adını yazmaya zorlanmıyor.
- **Personel hesapları sunucuya taşınmalı.** Backoffice’te hesap açma, roller
  (admin / yönetici / servis / yedek parça / satış) ve 6 haneli şifre
  çalışıyor; hesaplar şu an tarayıcının hafızasında duruyor. Sunucuda
  tutulmadıkça bir bilgisayarda açılan hesap ötekinde görünmüyor.
- **İlk admin şifresi değiştirilmeli.** Backoffice boşken `admin` / `123456`
  hesabı kendiliğinden açılıyor (`src/backoffice/veri.js` → `ILK_ADMIN`).
  Yayına çıkmadan bu hesabın şifresi değiştirilmeli veya hesap
  silinmeli.
- **Şifre sıfırlama e-postası gönderilmeli.** "Şifremi unuttum" talebi
  şimdilik yalnız backoffice’te birikiyor; sunucu bunu şirket e-posta
  adresine göndermeli.
- **İşlem kaydının korunması.** Kaydın silinemez olması gerekiyor.
  Tarayıcı hafızasındayken bu koruma sözde; sunucuda gerçek olacak.
- **Sekme kapalıyken bildirim.** Backoffice açıkken tarayıcı bildirimi
  çalışıyor. Sekme kapalıyken de haber gitmesi için sunucu ve bir push
  servisi (Web Push / VAPID) gerekiyor.

### A1h. Logo ERP bağlantısı kurulmalı

Backoffice’in ve uygulamanın Logo'dan öğrenmek istediği tek şey seri
numarasının geçmişi: makine ne zaman üretildi, ne zaman fatura edildi,
hangi bayiye satıldı.

Buna bağlı olan özellik uygulamadaki **"Hayırlı olsun!" penceresi**;
Logo kapalıyken hiç çıkmıyor (yanlış bilgi vermektense hiç vermemek
doğru).

Bağlantı Logo'ya doğrudan değil, PAKSAN sunucusu üzerinden kurulacak;
Logo kullanıcı bilgileri telefona konamaz:

```
Uygulama / Backoffice  →  PAKSAN sunucusu  →  Logo (REST / SQL)
```

PAKSAN tarafında yapılacaklar:

1. Logo'da REST servisinin açılması veya veritabanına **okuma yetkili**
   bir kullanıcı tanımlanması. Bu iş Logo iş ortağınızla yapılıyor.
2. Sunucuda `/logo/seri/{seriNo}` uç noktasının yazılması. Cevabın
   biçimi `src/lib/logo.js` dosyasında örneklendi.
3. `src/lib/logo.js` → `LOGO.aktif = true` ve `LOGO.endpoint` adresi.

### A1i. Talep ekleri sunucuya yüklenmeli

Servis ve yedek parça taleplerine fotoğraf ve video ekleniyor
(`src/lib/ekler.js`). Dosyalar şimdilik telefonun IndexedDB alanında
duruyor; talep sunucuya gittiğinde ekler de yüklenip adresleri
saklanmalı. Talebin içindeki alanlar değişmiyor, yalnız `ekler[].id`
yerine sunucu adresi yazılacak.

Boyut hesabı: fotoğraf küçültüldükten sonra ~200-400 KB, 30 saniyelik
video 5-15 MB. Sunucu tarafında depolama ve yükleme süresi buna göre
planlanmalı.

### A1j. Demo verisi kaldırılmalı

Personel ekranındaki "Demo verisi" kutusu (`src/backoffice/demo.js`)
yalnızca backoffice’i denemek için var. Yayına çıkmadan hem kutu hem dosya
kaldırılmalı.

### A2. Talep gönderimi gerçekten çalışmalı

Sunucu gelene kadar **ara çözüm** de olabilir: talep e-posta veya SMS
olarak Paksan'a düşsün. Bu bile "hiç ulaşmıyor" durumundan iyidir.
Ara çözüme geçilmeyecekse, o zamana kadar başarı ekranındaki
"Talebiniz bize ulaştı" cümlesi değiştirilmeli.

### A3. KVKK metinlerinin hukukçu onayı

> ⚠ **İNGİLİZCE SÜRÜM İÇİN AYRICA:** `src/data/kvkk.en.js` bir
> ÇEVİRİDİR, ayrı bir hukuki metin değildir. Metinler 6698 sayılı
> KVKK'ya göre yazıldı; Avrupa'daki müşteriye "6698 sayılı kanun
> uyarınca" demek anlam ifade etmiyor. **GDPR'a göre yazılmış ayrı bir
> metin gerekiyor.** Şimdilik her İngilizce metnin başında Türkçe aslın
> bağlayıcı olduğu yazılı; hukuk danışmanınız GDPR metnini hazırlayınca
> o dosya değiştirilmeli.


Üç metin hazır (`src/data/kvkk.js`) ama **taslak**. Hukuk danışmanınız
okuyup onaylamadan yayına çıkılmamalı. Eksik olan bilgiler:

- Resmî ticari unvan (sitede yalnızca "Paksan Makina" yazıyor; A.Ş. /
  Ltd. Şti. gibi bir ek varsa eklenmeli) → `src/config.js` → `SIRKET.unvan`
- Varsa VERBİS kayıt bilgisi
- Metin değişirse `KVKK_SURUM` numarası artırılmalı

### A4. Gerçek imza anahtarı (Android)

Şu anki APK **geliştirme imzasıyla** imzalı. Play Store'a yüklemek için
kalıcı bir imza anahtarı (keystore) üretilmeli.

> ⚠ Bu anahtar kaybolursa uygulamanın güncellenmesi **mümkün olmaz**.
> Yedeği güvenli bir yerde saklanmalı.

### A5. Açılış ekranı

Uygulama ikonu **yapıldı** (Paksan kalkan amblemi, beyaz zemin). Geriye
açılış (splash) ekranı kaldı — şu an Capacitor'ün varsayılanı duruyor.

> Not: İkon 192x192 amblemden üretiliyor. Play Store ayrıca 512x512
> mağaza görseli istiyor; grafik ekibinizden yüksek çözünürlüklü amblem
> alınırsa hem ikon hem mağaza görseli daha net olur.

### A6. Uygulama kimliği kararı

`com.paksanmakina.app` — Play Store'a bir kez yüklendikten sonra
**değiştirilemez**. Farklı istenirse şimdi söylenmeli.

---

## B — Sizden gelmesi gereken içerik

| Konu | Ne lazım | Dosya |
|---|---|---|
| Seri no | Gerçek seri numarası biçimi ve model kodları | `src/lib/serial.js` |
| Ürünler | Her modelin gerçek teknik özellikleri | `src/data/products.js` |
| **Teknik özellik genişletmesi** | **Gerçek kılavuzlar geldiğinde ürün sayfalarındaki teknik özellik listeleri kılavuzdaki değerlere göre genişletilecek ve düzeltilecek. Şu an her modelde 4-6 satır var; kılavuzdaki tüm ölçüler işlenecek.** | `src/data/products.js` → `specs` |
| Kılavuzlar | PDF kullanım kılavuzları | `src/data/products.js` |
| Videolar | YouTube linkleri (tanıtım + kullanım) | `src/data/products.js` |
| Görseller | Küçük balya modellerinin ayrı fotoğrafları (6'sı aynı görseli paylaşıyor) | `src/assets/urunler/` |
| **Bayiler** | **Gerçek bayi listesi** (ad, il/ilçe, adres, telefon, hangi hizmetler) | `src/data/bayiler.js` |
| Garanti | Gerçek garanti süresi (şu an 2 yıl varsayıldı) | `src/config.js` |
| **Belirti ve parça adları** | **Talep formlarındaki "ne oluyor?" ve "hangi parça lazım?" seçenekleri taslak olarak yazıldı. Servis ve yedek parça ekibinin günlük kullandığı adlarla değiştirilmeli; yanlış ad, yanlış parçanın yola çıkması demek.** | `src/data/talepAlanlari.js` |
| **Çeviri kontrolü** | **İngilizce metinler sektör terimleriyle yazıldı (balya makinesi → baler, prizmatik balya → square baler, düğüm atıcı → knotter). PAKSAN'ın kendi İngilizce kataloğu/broşürü varsa terimler onunla karşılaştırılmalı — şirketin dışarıya kullandığı dille birebir aynı olmalı.** | `src/data/*.en.js` |
| **Uygulama içi özet kılavuz** | **Güvenlik, traktöre bağlama ve günlük kontrol maddeleri genel yazıldı; gerçek kılavuzlar geldiğinde modele göre gözden geçirilmeli. Güvenlik bölümü mutlaka servis/üretim onayından geçmeli.** | `src/data/kilavuz.js` |
| Bakım rehberleri | Servis ekibinin onayı + modele özel değerler (tork, yağ tipi, gres aralığı) | `src/data/rehber.js` |
| Arıza rehberi | Çevrimdışı destek içeriğinin servis onayı | `src/data/destek.js` |

---

## C — Çıkmadan önce KALDIRILACAK geçici şeyler

Bunlar demo döneminde bilerek konuldu. Prod'a çıkarken tek tek
gözden geçirilmeli.

### C1. Bayi listesi uyarısı
**Yer:** `src/screens/Dealers.jsx`, sayfanın altındaki turuncu kart
> "Bu bayi listesi temsilidir. Gerçek bayi bilgileri geldiğinde buraya
> işlenecek. Şimdilik yolculuğa çıkmadan önce merkezden teyit alın."

Gerçek bayi listesi girildiğinde **bu kart tamamen silinmeli.**

### C2. Örnek seri numaraları
> **Güncel (25 Eylül 2026):** kutu artık `index.html` kök etiketindeki
> `data-demo="acik"` işaretine bağlı (`src/lib/demoSurumu.js`). Yeri
> yardım penceresi değil, Makine Kaydet ekranının giriş sayfası
> ("DENEME" rozetli kutu). İşaret silinince kutu kendiliğinden
> kayboluyor; `npm run dogrula -- --yayin` işaret duruyorsa durduruyor.
> Aşağıdaki "kaldırılmalı" hâlâ geçerli: `ORNEK_SERILER` dizisi canlı
> pakette gereksiz.

**Yer:** `src/screens/AddMachine.jsx` → "Seri numarası nerede yazıyor?"
yardım penceresinde `ORNEK_SERILER` listesi gösteriliyor.

Bunlar denemek için konulmuş sahte seri numaraları. Prod'da müşteri
bunları görüp kendi makinesi sanabilir → **kaldırılmalı**
(`src/lib/serial.js` içindeki `ORNEK_SERILER` dizisiyle birlikte).

### C3. Bildirim demo uyarısı
**Yer:** `src/screens/Register.jsx`
> "Bildirimler bu demo sürümünde henüz çalışmıyor"

Capacitor push eklentisi kurulduğunda **kaldırılmalı**.

### C3b. Ekranda gösterilen SMS kodu
**Yer:** `src/screens/SifreSifirla.jsx`, kod ekranındaki turuncu kutu
> "Demo: SMS altyapısı henüz bağlı değil. Bu sürümde kod gönderilmiyor;
> denemeniz için buraya yazıyoruz: 123456"

SMS altyapısı bağlanınca **kutu tamamen silinmeli** ve `src/lib/hesap.js`
içindeki `otpGonder` fonksiyonunun `demoKod` döndüren satırı kaldırılmalı.
Kod ekranda kaldığı sürece şifre sıfırlama hiçbir işe yaramaz —
telefonu eline geçiren herkes şifreyi değiştirebilir.

### C4. "Merkezî hesap sistemi yakında" cümleleri
**Yer:** `src/lib/hesap.js` (`GIRIS_BULUNAMADI_METIN`) ve
`src/screens/Profile.jsx` (çıkış penceresi)
> "…merkezî hesap sistemi açıldığında hangi telefondan girerseniz girin
> karşınıza gelecek."

Sunucu geldiğinde **kaldırılmalı**; çıkış metni de "kayıtlarınız
Paksan'da duruyor" şeklinde güncellenmeli.

### C5. "Video yakında eklenecek" bildirimi
**Yer:** `src/screens/MachineDetail.jsx`, `src/screens/ProductDetail.jsx`

Gerçek video linkleri girildiğinde bu durum kendiliğinden ortadan
kalkar; girilmeyen video kalırsa o video **listeden çıkarılmalı**
(müşteriye çalışmayan bir satır göstermektense hiç göstermemek iyidir).

### C6. "PDF kılavuz yakında" notu
**Yer:** `src/screens/Manual.jsx`

Gerçek PDF kılavuzlar eklendiğinde **kaldırılmalı**.

### C7. Destek asistanı "çevrimdışı" açıklaması
**Yer:** `src/screens/Profile.jsx` → Uygulama hakkında penceresi

PAKSAN yapay zekâsı bağlandığında (`src/config.js` → `AI.aktif = true`)
metin kendiliğinden değişiyor, elle iş yok. Yine de kontrol edilmeli.


### C8. Sürüm numarası
**Yer:** `package.json` ve `android/app/build.gradle`

Demo boyunca `0.x`. Müşteriye açılırken **1.0.0** yapılmalı.

---

## Sıralama önerisi

1. **Şimdi:** B'deki içerikleri toplayın (bayi listesi ve seri no biçimi
   en kritik ikisi), KVKK metinlerini hukukçuya verin.
2. **Sonra:** Sunucu (A1). En uzun iş bu, paralel başlatılmalı.
3. **Sunucu bitince:** C4, C3 kaldırılır; bildirim eklentisi kurulur.
4. **Çıkmadan hemen önce:** C1, C2, C5, C6 kaldırılır; A4 imza anahtarı,
   A5 ikon, C8 sürüm 1.0.0 yapılır.
5. Play Store'a yüklenir.

---

## Şu an ne çalışıyor?

Yanlış beklenti olmasın diye:

| Tamamen çalışıyor | Ekranı var, arkası yok |
|---|---|
| Kayıt, giriş, çıkış (şifreli) | Taleplerin Paksan'a ulaşması |
| Ülke kodlu telefon (72 ülke) | SMS gönderimi (kod ekranda gösteriliyor) |
| Şifre değiştirme ve sıfırlama | Numara değişikliğinin Paksan tarafı |
| KVKK onayları ve kaydı | Bildirim gönderimi |
| Seri no ile makine kaydı | Merkezî hesap (telefon değişince kayıt gelmesi) |
| Garanti durumu ve bilgilendirme | PAKSAN yapay zekâsı |
| Bakım rehberleri (3 rehber, makineye uyarlanan) | Gerçek bayi bilgileri |
| Talep düzenleme ve silme (kaydırarak) | |
| Türe göre talep numarası (SRV / YPR / TKF) | |
| Bakım takibi (işaretleme) | PDF kılavuzlar, videolar |
| Ürün kataloğu ve arama | |
| Destek asistanı (çevrimdışı rehber) | |
| Bayi ekranı, konum izni, mesafe sıralaması | |
| Telefonla arama | |
| Android geri hareketi | |
