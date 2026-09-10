# Canlıya Çıkış Planı

Bu belge tek bir soruyu cevaplıyor: **proje bittiğinde onu gerçek
müşterilere nasıl açacağız?**

`PRODA-CIKIS.md` "neler eksik" diyor. Bu belge "ne satın alacağız, kimi
işe alacağız, hangi sırayla ne yapacağız" diyor.

> **Teknik tarafı merak ediyorsanız:** sunucu nedir, veritabanı nasıl
> kurulur, kod oraya nasıl gider — hepsi sıfırdan
> `SUNUCU-VE-VERITABANI.md` içinde anlatılıyor. Yazılım bilgisi
> gerektirmiyor.

Yazılım bilmeyen biri için yazıldı. Teknik terim geçtiği yerde ne
demek olduğu da yazıyor.

---

## 1. Bugün gerçekte nerede duruyoruz

Ekranların hepsi çalışıyor. Kayıt, giriş, talep açma, bayi paneli,
backoffice, raporlar — hepsi gerçek gibi çalışıyor.

**Ama ortada sunucu yok.** Her şey telefonun (ya da tarayıcının) kendi
hafızasında duruyor. Bunun pratikte anlamı şu:

| Görünen | Gerçek |
|---|---|
| "Talebiniz bize ulaştı" | Talep hiçbir yere gitmedi, telefonda duruyor |
| Backoffice'te 68 talep | O talepler yalnız o bilgisayarda var |
| Bayi paneli müşteri talebini görüyor | Yalnız aynı tarayıcıda açılırsa görüyor |
| Şifre sıfırlama | SMS altyapısı yok, kod ekranda yazıyor |
| Bildirim izni | İzin isteniyor ama gönderecek taraf yok |

Yani bugün elimizde **çalışan bir vitrin** var, çalışan bir sistem değil.
Vitrin en baştan bilerek böyle kuruldu: bütün veri erişimi tek dosyalardan
geçiyor (`src/backoffice/veri.js`, `src/lib/storage.js`), sunucu
gelince ekranlara dokunulmayacak.

**Bu, işin %60-70'inin bittiği anlamına geliyor. Kalan %30-40 sunucu.**

---

## 2. En büyük karar: sunucu

Bundan kaçış yok. Sunucu olmadan bu proje canlıya çıkamaz — "hiçbir
talep PAKSAN'a ulaşmıyor" durumu bir eksiklik değil, uygulamanın
müşteriye yalan söylemesi demek.

### 2.1 Sunucunun yapması gerekenler

Öncelik sırasıyla:

| # | İş | Olmadan ne olur |
|---|---|---|
| 1 | Talepleri almak ve saklamak | Uygulama işe yaramaz |
| 2 | Hesapları tutmak | Telefon değişince her şey kaybolur |
| 3 | SMS göndermek (doğrulama kodu) | Şifresini unutan hesabına erişemez |
| 4 | Bildirim göndermek | Müşteri talebinin ne olduğunu bilmez |
| 5 | Dosya saklamak (foto, video, ses) | Talep formundaki ekler çalışmaz |
| 6 | Bayi ve backoffice verisini paylaştırmak | Bayi paneli işe yaramaz |
| 7 | Yetki denetimi | Bir bayi başka bayinin müşterisini görür |
| 8 | LOGO ERP'ye bağlanmak | Fatura ve satış bilgisi hiç gelmez |

7. madde özellikle önemli ve gözden kaçıyor: bugün "bu bayi yalnız
kendi taleplerini görsün" kuralı **arayüzde** uygulanıyor. Bu bir
güvenlik önlemi değil, bir görüntü tercihi. Sunucu geldiğinde aynı
kural **sunucuda** tekrar yazılmak zorunda. Yazılmazsa bir bayi,
tarayıcısının adres çubuğuyla oynayarak bütün müşteri listesini
görebilir.

**Ölçüldü (10 Eylül 2026 denetimi).** Bu soyut bir risk değil, bugün
iki adımda yapılabiliyor: tarayıcı konsolunda
`paksan.panelOturum` kaydındaki `rol` alanını `"admin"` yazıp sayfayı
yenilemek yetiyor. Yedek parça personeli olarak açılan oturum, tek
satırla Personel, Roller ve Yetkiler ve İşlem Kaydı ekranlarına
erişti. Aynısı servis uygulaması (`paksan.servisOturum`) ve müşteri
uygulaması (`paksan.user`) için de geçerli.

Bu **düzeltilebilecek bir hata değil**: istemci tarafındaki her
denetim aynı yolla aşılır. Rol sistemi bugün bir arayüz kolaylığı;
güvenlik sınırına ancak sunucu geldiğinde dönüşür. Sunucu yazılırken
yetki denetimi HER istekte sunucuda tekrarlanmalı — istemcinin
gönderdiği role asla güvenilmemeli.

### 2.2 Sunucuyu kim yazacak — üç yol

**A) Dışarıdan yazılım firması.**
En yaygın yol. Bu belgeyi ve `PRODA-CIKIS.md`'yi verirsiniz, teklif
alırsınız. Avantajı: hızlı başlar. Dezavantajı: sonrasında da onlara
bağımlı kalırsınız, her küçük değişiklik için sıraya girersiniz.

**B) İçeriden bir yazılımcı işe almak.**
PAKSAN'ın kendi bilgi işlemi varsa oraya bir kişi. Avantajı: LOGO
zaten içeride, bağlantıyı kuran kişi şirketi tanır. Dezavantajı: tek
kişiye bağımlılık — o kişi ayrılırsa proje durur.

**C) İkisi birden (önerilen).**
Sunucuyu firma yazsın, **kodu PAKSAN'ın kendi deposunda dursun**, ve
içeriden en az bir kişi işi anlasın. Sözleşmeye "kaynak kodu ve
bütün hesaplar PAKSAN'a aittir" maddesi konur.

> **Bu maddeyi atlamayın.** Yazılım projelerinde en pahalı hata, kodun
> ve sunucu hesaplarının yükleniciye ait kalmasıdır. Anlaşma bozulunca
> uygulamayı güncelleyemezsiniz.

### 2.3 Firmaya ne soracaksınız

Teklif alırken şu soruları sorun; cevaplar firmayı ayırt eder:

1. Kaynak kodu ve bütün hesaplar (sunucu, veritabanı, mağaza) bize mi
   ait olacak? *(Cevap "evet" değilse devam etmeyin.)*
2. Veriler Türkiye'de mi tutulacak? *(KVKK açısından önemli.)*
3. Yedekleme nasıl ve ne sıklıkta yapılacak? Geri yükleme denendi mi?
4. Test ortamı ayrı olacak mı?
5. Teslimden sonra bakım ve olay müdahalesi nasıl işleyecek, ücreti ne?
6. LOGO entegrasyonunu daha önce yaptınız mı?
7. Uygulama mağazaya kimin hesabından yüklenecek? *(Cevap: PAKSAN'ın.)*

### 2.4 Ne kadar sürer

Dürüst tahmin, bu projenin bugünkü hâline göre:

| İş | Süre |
|---|---|
| Sunucu + veritabanı + hesaplar | 4-8 hafta |
| SMS ve bildirim | 1-2 hafta |
| Dosya yükleme (foto/video/ses) | 1-2 hafta |
| Bayi ve backoffice yetkileri | 2-3 hafta |
| LOGO entegrasyonu | 2-6 hafta *(LOGO iş ortağınızın hızına bağlı)* |
| Test ve düzeltme | 3-4 hafta |

**Toplam: 3-6 ay.** Paralel çalışılırsa alt sınıra yaklaşır. LOGO
genelde en belirsiz kalem — o iş sizin ERP tarafınızdaki insanlara
bağlı, yazılım firmasına değil.

---

## 3. İki ortam: test ve canlı

Bu, atlanınca en çok canı yakan konudur.

**Test ortamı**, canlının birebir kopyasıdır ama içindeki veri
sahtedir. Yeni bir özellik önce oraya çıkar, orada denenir, sonra
canlıya alınır.

Ayrı ortam olmazsa şu olur: bir düzeltme yapılır, doğrudan canlıya
verilir, gerçek müşteri talepleri kaybolur. Bu, olması muhtemel bir şey
değil — olması **kaçınılmaz** bir şeydir.

Gereken:

| | Test | Canlı |
|---|---|---|
| Sunucu | Küçük, ucuz | Gerçek |
| Veritabanı | Ayrı, sahte veriyle | Gerçek, yedekli |
| SMS | Kapalı ya da tek numaraya | Açık |
| Uygulama | Play Store "iç test" kanalı | Play Store yayın |
| Backoffice adresi | test-backoffice.paksanmakina.com.tr | backoffice.paksanmakina.com.tr |

**Kural: canlı veritabanına elle dokunulmaz.** Değişiklik önce testte
denenir.

### Alan adları

Şimdiden ayırtın (paksanmakina.com.tr elinizde olduğu için alt alan
adı açmak ücretsiz):

- `api.paksanmakina.com.tr` — uygulamanın konuştuğu sunucu
- `backoffice.paksanmakina.com.tr` — personel paneli
- `bayi.paksanmakina.com.tr` — bayi paneli
- `test.` önekiyle üçünün test kopyası

---

## 4. Sıra — ne, ne zaman

Bu sıralama önemli. Yanlış sırayla gidilirse iş iki kere yapılır.

### Aşama 0 — Şimdi başlayın (sunucuyu beklemez)

Bunların hiçbiri yazılım işi değil, hepsi **PAKSAN'ın kendi işi** ve
hepsi sunucudan bağımsız. Sunucu firması ararken bunlar bitmeli:

- [ ] **Gerçek bayi listesi.** Ad, il/ilçe, adres, telefon, hangi
      hizmeti veriyor. → `src/data/bayiler.js`
- [ ] **Gerçek seri numarası biçimi.** Bugün varsayılan bir biçim
      kullanılıyor (`ORK1270-2024-00157`). PAKSAN'ın gerçek biçimi
      neyse o yazılmalı — yanlışsa hiçbir makine tanınmaz.
      → `src/lib/serial.js`
- [ ] **Gerçek garanti süresi.** Bugün 2 yıl varsayıldı.
      → `src/config.js`
- [ ] **Parça ve belirti adları.** Talep formundaki "hangi parça lazım"
      listesi taslak. Servis ve yedek parça ekibinin günlük kullandığı
      adlarla değişmeli. Yanlış ad = yanlış parçanın yola çıkması.
      → `src/data/talepAlanlari.js`
- [ ] **Banka hesapları (IBAN).** Yedek parça ödemesi için.
      → `src/config.js` → `BANKA`
- [ ] **İhracat ekibi e-posta adresleri.** → `src/config.js` → `IHRACAT`
- [ ] **KVKK metinleri hukukçuya.** *(Aşağıda ayrı başlık.)*
- [ ] **Kılavuz PDF'leri, ürün videoları, ürün fotoğrafları.**

> Bu listeyi bitirmek muhtemelen 3-6 hafta sürer ve tamamı sizde. Sunucu
> firmasını beklerken yapılacak iş budur.

### Aşama 1 — Sunucu (en uzun iş)

Yukarıdaki 2.1 listesinin 1-7. maddeleri. LOGO (8. madde) paralel
yürür ama onu beklemeyin: LOGO gecikirse uygulama LOGO'suz da çıkar,
yalnız "Hayırlı olsun" penceresi ve fatura bilgisi çalışmaz.

### Aşama 2 — Geçici uyarıların kaldırılması

Uygulamada demo dönemi için bilerek konmuş uyarılar var. Sunucu
gelince bunlar tek tek kaldırılır — listesi `PRODA-CIKIS.md` → C
bölümünde. **En kritiği C3b:** şifre sıfırlama kodu şu an ekranda
yazıyor. O kutu kaldırılmadan canlıya çıkılırsa telefonu eline geçiren
herkes hesabı ele geçirir.

**Servis uygulamasında tek satır:** `servis.html` kök etiketindeki
`data-demo="acik"` silinecek. O işaret varken uygulama açılışta örnek
servisi, taleplerini ve stokunu kuruyor ve giriş alanları dolu geliyor
(bkz. `src/servis/demoKimlik.js`). Silinmezse gerçek servis, uygulamayı
açtığında uydurma müşteri adları görür.

**Kod açıklamaları teslimden önce temizlenecek.** Kaynak kodda her
kararın gerekçesi yazılı: neyin neden denendiği, neyin geri alındığı,
hangi ölçümün hangi sayıyı verdiği. Bunlar geliştirme boyunca değerli
— aynı hatanın altı ay sonra tekrar yapılmasını engelliyorlar — ama
teslim edilen kodda durmayacaklar.

Nasıl yapılacağı önemli: açıklamalar **elle silinmeyecek**. Derleme
sırasında (Vite → esbuild / terser) `legalComments: 'none'` ile
düşürülür; kaynak deposunda oldukları gibi kalır. Elle silinmiş bir
kod tabanı geri alınamaz ve depodaki gerekçeler de kaybolur.

> Bu bir teslim adımı, geliştirme kuralı değil. Yeni yazılan kodda
> gerekçe yazılmaya devam ediyor.

### Aşama 3 — İç test (PAKSAN personeli)

Uygulama Play Store'un **"iç test"** kanalına yüklenir. Bu kanal
herkese açık değil; yalnız e-posta adresini listeye eklediğiniz kişiler
indirebilir. Uygulama mağaza incelemesinden geçmez ve aynı gün yüklenir.

15-20 kişilik bir grup: servis, yedek parça, satış, muhasebe. En az
**iki hafta**, gerçek işleriyle.

### Aşama 4 — Servis testi (en değerli adım)

**Bu adımı atlamayın.** Servis uygulaması, servislerin kullanmayacağı
bir şey olursa bütün emek boşa gider. (Bayinin paneli yok; bayi
sistemde yalnız bir kayıt.)

3-5 servis seçin — biri mutlaka teknolojiyle arası iyi olmayan biri
olsun. Uygulamanın en zayıf yeri orada görünür. Bir ay kullansınlar,
gerçek işleriyle, tarlada.

Sorulacak tek soru: *"Bunu her gün açar mıydınız?"* Cevap "belki" ise
cevap hayırdır.

### Aşama 5 — Sınırlı müşteri açılışı

Tek bir bölgeyle başlayın — örneğin bir ilin bayisi ve onun
müşterileri. 50-100 gerçek kullanıcı.

Sebebi şu: ilk gerçek kullanıcılar her zaman düşünmediğiniz bir şeyi
yapar. 100 kişide çıkan sorun düzeltilebilir, 5.000 kişide çıkan sorun
itibar kaybıdır.

En az **bir ay**.

### Aşama 6 — Tam açılış

Play Store'da **kademeli yayın** (staged rollout) kullanın: Google
uygulamayı önce kullanıcıların %5'ine, sonra %20'sine, sonra hepsine
verir. Bir sorun çıkarsa yayını durdurursunuz.

---

## 5. Google Play Store

### 5.1 Hesap

- Google Play Console geliştirici hesabı gerekiyor. **Tek seferlik 25
  ABD doları** kayıt ücreti var.
- Hesap **PAKSAN Makina adına, kurumsal (organization) hesap** olarak
  açılmalı. Bir çalışanın kişisel Google hesabıyla açılırsa o kişi
  ayrıldığında uygulama sizde kalmaz.
- Kurumsal hesap için Google, şirketin **D-U-N-S numarasını** istiyor.
  Yoksa Dun & Bradstreet'ten ücretsiz alınıyor ama **birkaç hafta
  sürebiliyor** — bu yüzden erken başlatın.
- Google'ın kayıt ve doğrulama kuralları sık değişiyor; başvurmadan
  önce Play Console'un güncel gereklilik sayfasına bakın.

### 5.2 İmza anahtarı (keystore)

Uygulamayı imzalayan dijital anahtar. Şu an geliştirme anahtarıyla
imzalı; mağazaya çıkmadan kalıcı bir anahtar üretilmeli.

> ⚠ **Bu anahtar kaybolursa uygulama bir daha güncellenemez.** Yeni
> anahtarla yüklenen sürüm, mağazada ayrı bir uygulama sayılır;
> kullanıcılar güncelleme alamaz.
>
> Anahtar **iki ayrı yerde** yedeklensin: biri şirket kasasında, biri
> bilgi işlemin şifreli yedeğinde. Şifresi de ayrı yerde.

Google'ın **Play App Signing** özelliği bu riski büyük ölçüde
kaldırıyor: anahtarı Google saklıyor. Kullanın.

### 5.3 Uygulama kimliği

`com.paksanmakina.app` — mağazaya bir kez yüklendikten sonra
**değiştirilemez.** Farklı bir kimlik isteniyorsa şimdi söylenmeli.

Bayi uygulaması ayrı: `com.paksanmakina.bayi`.

### 5.4 Bayi uygulaması mağazada olmalı mı?

Bir karar vermeniz gerekiyor. İki seçenek:

**A) Play Store'da yayınlanır.** Herkes indirebilir ama hesabı olmayan
giremez. Kolay kurulum, otomatik güncelleme. Dezavantajı: rakipleriniz
de indirip içeriden nasıl çalıştığınıza bakar (giriş ekranına kadar).

**B) Play Store'un "kapalı test" kanalında kalır.** Yalnız e-posta
adresi listeye eklenmiş bayiler indirebilir. Otomatik güncelleme yine
çalışır. Bayi sayısı arttıkça liste yönetimi yük olur.

**Öneri: B ile başlayın, bayi sayısı 50'yi geçince A'ya geçin.**

### 5.5 Mağaza incelemesi

Google her sürümü inceliyor. İlk yüklemede birkaç gün, sonraki
güncellemelerde genelde saatler sürüyor. Reddedilme sebepleri
çoğunlukla: eksik gizlilik politikası bağlantısı, izinlerin
açıklanmaması, veri güvenliği formunun yanlış doldurulması.

Uygulamanın kullandığı izinler ve sebepleri şimdiden yazılı hâle getirilmeli:
bildirim, mikrofon (ses kaydı), kamera (talep fotoğrafı), konum (en
yakın bayi).

### 5.6 iPhone?

Bugün yalnız Android var. iPhone istenirse ayrı bir karar: Apple
Developer hesabı **yıllık 99 ABD doları**, ayrı mağaza kuralları, ayrı
inceleme süreci. Uygulamanın kendisi (React + Capacitor) iOS'a da
derlenebilecek şekilde yazıldı, yani sıfırdan yazmak gerekmiyor — ama
test ve mağaza süreci baştan yaşanır.

Türkiye'de çiftçi kitlesinde Android baskın olduğu için **önce Android,
iOS sonra** doğru sıra.

---

## 6. Hukuk

### 6.1 KVKK

Üç metin hazır ama **taslak** (`src/data/kvkk.js`). Hukuk danışmanınız
onaylamadan canlıya çıkılmamalı.

Eksik olanlar:

- VERBİS kaydı (varsa kayıt bilgisi metne girmeli)
- Veri saklama süreleri (talep kaydı ne kadar tutulacak?)
- **Bayilerle veri paylaşımı.** Bu metinde açıkça yazmalı: müşterinin
  adı, telefonu ve makinesi, ona hizmet veren yetkili bayiyle
  paylaşılıyor. Bayi ayrı bir tüzel kişi — bu bir veri aktarımıdır.
- Yurtdışı müşterisi varsa: `kvkk.en.js` bir **çeviridir**, GDPR metni
  değildir. Avrupa'ya satış varsa GDPR'a göre yazılmış ayrı metin gerekir.

### 6.2 Bayi sözleşmesi

Bayi paneli müşteri verisi taşıyor. Her bayiyle **veri paylaşım
sözleşmesi** imzalanmalı. İçermesi gerekenler:

- Bayi veriyi yalnız PAKSAN işi için kullanır
- Üçüncü kişiye aktarmaz
- Bayilik biterse erişim kapanır ve veriyi siler
- Panel şifresini paylaşmaz
- Veri sızıntısında PAKSAN'a bildirim yükümlülüğü

### 6.3 Ticari elektronik ileti (6563)

Kampanya duyurusu ticari ileti sayılıyor; **izin verenlere** gönderilebilir.
İzin uygulamada kayıt sırasında alınıyor ve profilden geri
çekilebiliyor — bu yapı doğru kurulmuş.

Güvenlik uyarısı ticari ileti değildir, izin gerektirmez. Backoffice'te
bu ayrım "Duyuru" / "Önemli uyarı" olarak duruyor.

> **Dikkat:** İYS (İleti Yönetim Sistemi) kaydı gerekebilir. Ticari
> ileti gönderen firmaların izinlerini İYS'ye işlemesi zorunlu. Hukuk
> danışmanınıza sorun.

---

## 7. Canlıya çıktıktan sonra

Yayın günü işin bitişi değil, başlangıcı.

### 7.1 Yedekleme

- Veritabanı **günlük** yedeklenmeli, yedekler **başka bir yerde**
  durmalı (aynı sunucuda duran yedek, yedek değildir).
- **Yedekten geri dönme en az bir kez denenmiş olmalı.** Denenmemiş
  yedek, yedek sayılmaz. Bu, göz ardı edilen ama en pahalıya patlayan
  maddedir.

### 7.2 İzleme

Sunucu çökerse **sizin haberiniz olmalı**, müşteri aramadan önce.
Basit bir izleme servisi (uptime monitor) dakikada bir kontrol eder,
çökerse SMS/e-posta atar. Ücretsiz seçenekleri var.

### 7.3 Destek

Uygulama açıldığı gün telefonlar gelir. Kimin bakacağı belli olmalı:

| Konu | Kim bakar |
|---|---|
| "Giremiyorum" | Backoffice'te bakacak personel |
| "Talebim ne oldu" | İlgili ekip (servis/parça/satış) |
| Numara değişikliği | Yalnız admin yetkili kişi |
| Bayi şifresi | Bayilerden sorumlu kişi |
| Uygulama çöküyor | Yazılım firması |

Bu tabloyu **açılıştan önce** doldurun, isimlerle.

### 7.4 İlk admin şifresi

Backoffice boşken `admin` / `123456` hesabı kendiliğinden açılıyor.
**Canlıya çıkmadan bu şifre değiştirilmeli** ya da hesap silinmeli.

### 7.5 Demo verisi

Backoffice'teki "Demo verisi" kutusu ve `src/backoffice/demo.js`
dosyası canlıdan kaldırılmalı. Bir personel yanlışlıkla basarsa gerçek
listeye 30 sahte müşteri karışır.

---

## 8. Kim ne yapar

| İş | Kim |
|---|---|
| Bayi listesi, seri no biçimi, parça adları, garanti süresi | PAKSAN — servis, satış, yedek parça |
| IBAN, ihracat e-postaları | PAKSAN — muhasebe |
| KVKK metinleri, bayi sözleşmesi, İYS | Hukuk danışmanı |
| Sunucu, veritabanı, SMS, bildirim | Yazılım firması / iç yazılımcı |
| LOGO tarafında okuma yetkisi | LOGO iş ortağı + PAKSAN bilgi işlem |
| Play Console hesabı, D-U-N-S | PAKSAN — yönetim |
| İmza anahtarının saklanması | PAKSAN — bilgi işlem + kasa |
| İç test | PAKSAN personeli |
| Bayi testi | 3-5 seçilmiş bayi |
| Yayın sonrası destek | Belirlenecek — 7.3'teki tablo |

---

## 9. Riskler

**Sunucu gecikirse.** En büyük risk bu. Ara çözüm var: talepler
e-posta ile PAKSAN'a düşsün. "Hiç ulaşmıyor" durumundan iyidir ve
sunucu gelince kaldırılır.

**Bayiler kullanmazsa.** Bayi paneli iyi kurgulanmış olabilir ama
bayiler PAKSAN personeli değil; günlük işlerine girmezse açmazlar. Bu
yüzden Aşama 4 (bayi testi) atlanmamalı ve tam açılıştan **önce**
yapılmalı.

**İmza anahtarı kaybı.** Yukarıda anlatıldı. Play App Signing ile
büyük ölçüde önlenir.

**Kod ve hesapların yüklenicide kalması.** Sözleşme maddesiyle önlenir.

**LOGO'nun beklenenden zor çıkması.** ERP entegrasyonları çoğu zaman
tahminden uzun sürer. LOGO'yu kritik yola koymayın: uygulama LOGO'suz
da çıkabilir.

**KVKK'nın sona bırakılması.** Hukuk süreci yazılımdan yavaş ilerler.
Metinleri **bugün** hukukçuya verin; yazılım biterken hukuk bekletirse
açılış gecikir.

**Talep numarası çakışması.** Talep numarası bugün 4 haneli rastgele
sayı kullanıyor ve numarayı her cihaz kendi üretiyor. Bayiler de elle
kayıt açmaya başladığında aynı gün aynı numara ihtimali doğuyor.
Sunucu geldiğinde numarayı **sunucu üretmeli.**

---

## 10. Özet — üç cümle

1. **Bugün başlayın:** bayi listesi, seri numarası biçimi, parça adları
   ve KVKK metinleri sizde; sunucuyu beklemeden bitirilebilir.
2. **Sunucu 3-6 ay:** firma seçerken kaynak kodun ve hesapların PAKSAN'a
   ait olmasını sözleşmeye yazdırın.
3. **Yayına kademeli çıkın:** iç test → bayi testi → tek bölge → tam
   açılış. Her adım en az bir ay.

Toplam gerçekçi takvim: **6-9 ay.**
