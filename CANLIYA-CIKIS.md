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
| 9 | Destek asistanı ve yedek parça kataloğu (bkz. 2.1.1) | Destek ekranı cevap veremez, servis parça seçemez |

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

### 2.1.1 Destek asistanı, yedek parça kataloğu ve kullanım kılavuzları

Üçü de bugün uygulamanın İÇİNDE DEĞİL ve canlıda da olmayacak:
uygulama onları adresten çağırıyor. Geliştirmede bu bilgisayardaki
sunucular cevap veriyor; canlıda PAKSAN'ın sunucusu verecek.

| Ne | Uygulamadaki ayar | Bugün cevap veren | Sunucudan beklenen |
|---|---|---|---|
| Destek asistanı | `src/config.js` → `AI.kok` (`/destek-ai`) | `D:\PAKSAN\paksan-rag\sohbet\sunucu.mjs` (127.0.0.1:8770); `npm run dev` açıkken aktarılıyor, kapalıysa kendiliğinden başlatılıyor | `GET <kok>/durum`, `POST <kok>/sohbet` (satır satır JSON akışı), `GET <kok>/kilavuz/<belge>` (PDF) |
| Yedek parça kataloğu | `src/config.js` → `PARCA_KATALOG.kok` (`/parca-katalogu`) | depodaki `sunucu-taklidi/` klasörü | `<kok>/katalog.json`, `<kok>/gorseller/<kod>.webp` |
| Kullanım kılavuzları (PDF, 29 Eylül 2026) | `src/config.js` → `KILAVUZ.kok` (`/kilavuzlar`) | depodaki `sunucu-taklidi/kilavuzlar/` klasörü (PDF'ler git'te değil, bkz. `sunucu-taklidi/BENIOKU.md`) | `<kok>/kilavuzlar.json`, `<kok>/<dosya>.pdf`; https ve uygulamaya CORS izni |

Canlıya çıkarken:

1. `AI.kok`, `PARCA_KATALOG.kok` ve `KILAVUZ.kok` alanlarına sunucunun MUTLAK adresi
   yazılır. APK'da göreli adres çalışmaz: telefonda uygulamanın kendi
   kökü sunucu değil.
2. Kılavuzlar, arama indeksi ve dil modeli sunucuda durur. Dil modeli
   için bir API anahtarı gerekirse o da sunucuda kalır; uygulamaya
   yazılmaz.
3. Dil modeli bugün bu bilgisayarda Ollama ile çalışıyor. Model yoksa
   asistan cevap yazamaz, kılavuzda bulduğu bölümleri alıntı olarak
   gösterir (`llm_yok` durumu). Sunucuda model hazır olmadan açılış
   yapılmamalı.

   Sohbet akışında sunucu, cevabın ilk kelimesini beklerken en geç 15
   saniyede bir `durum` olayı gönderir: `araniyor`, `model_yukleniyor`,
   `yaziyor`. Ekrandaki bekleme yazısı buna göre değişir; uygulama 90
   saniye hiç olay gelmezse bağlantıyı kopmuş sayar (`AI.bekleme`).
   Sunucuyu başka biri yazarsa bu nabız da sözleşmenin parçasıdır.

   Model bir süre kullanılmayınca bellekten düşer ve sonraki ilk soru
   uzun sürer. Canlı sunucuda model hep bellekte tutulmalı
   (`PAKSAN_LLM_KEEP_ALIVE=-1`, bkz. `D:\PAKSAN\paksan-rag\sohbet\llm.mjs`).
4. Yeni kılavuz eklemek: PDF `D:\PAKSAN\paksan-rag\kilavuzlar\` klasörüne,
   hangi ürüne ait olduğu `kilavuzlar.json` dosyasına yazılır, sonra
   `node D:\PAKSAN\paksan-rag\sohbet\kilavuz-ekle.mjs` çalıştırılır
   (ayrıntı: `kilavuzlar/BENIOKU.md`). Sunucu yeni indeksi kendisi
   yükler; uygulamada değişen bir şey olmaz.
5. `PARCA_KATALOG.taklitGecikme` 0 yapılır.
6. **YENİ FİYAT LİSTESİ BACKOFFICE'TEN YÜKLENİYOR** (18 Eylül 2026
   kararı, 21 Eylül 2026'da yapıldı). Personel **Yedek Parça Kataloğu**
   ekranından PDF'i seçer → liste okunur → ekran neyin değiştiğini
   gösterir (kaç parça geldi/düştü, kaçının fiyatı değişti, yeni parça
   grubu var mı, fiyatı okunamayan parça var mı) → personel onaylar → liste yayına girer, eskisi kalkar (8 Ekim 2026,
   kullanıcının kararı; kayıtların gösterdiği eski görseller kalır).
   Geliştirici devreye girmez.

   18 Eylül'de dönüştürmenin SUNUCUDA yapılması planlanmıştı; okuma
   personelin tarayıcısında yapılıyor (`src/lib/fiyatListesiOku.js`),
   sunucu yalnız sonucu denetleyip saklıyor. Gerekçe: sunucu henüz yok,
   sunucuya Python kurmak da ek bir bağımlılıktı. Akış aynı.

   **Sunucuda yapılacak:** `POST <kok>/yayinla` uç noktası
   (sözleşme: `sunucu-taklidi/fiyat-listesi-yayini.mjs`) — gelen listeyi
   denetler, `katalog.FiyatListesi` ve `katalog.FiyatListesiSatiri`
   tablolarına yazar, görselleri ve kaynak PDF'i saklar; eski listeyi
   kaldırır. Eski görsellerden hangilerinin kalacağını (kayıtların
   gösterdikleri) veritabanındaki parça satırlarından kendisi bulur,
   bugünkü taklit gibi tarayıcının gönderdiği listeye güvenmez
   (`VT-TASARIM-EKLERI.md` §17). Uygulama rolünün `katalog.*` yazma izni yok (V0015);
   bu uç nokta için izin kararı verilecek. Yetki denetimi sunucuda da
   yapılmalı (`parcaKatalogDuzenle`).

   Kalıcı istisna: fiyat listesinin sayfa düzeni değişirse okuyucunun
   ızgara ölçüleri (`fiyatListesiOku.js` → `IZGARA`) yeniden ayarlanmalı
   — o geliştirici işi kalıyor. Önizleme bunu sessiz olmaktan
   çıkarıyor: yanlış okunmuş liste ekranda "şu ankinden çok farklı"
   uyarısıyla görünür.

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
      Kural 25 Eylül 2026'dan beri SIKI: model kodu + 4 haneli yıl +
      5 haneli sıra (`onekYilSira`); eksik ya da fazla haneli numara
      reddediliyor, önekten sonraki O ve I rakama çevriliyor. Gerçek
      biçim farklıysa `serial.js`'teki iki sayı (`SERI_YIL_HANE`,
      `SERI_SIRA_HANE`) ve `seriDuzelt` değişir.
- [ ] **Gerçek garanti süresi.** Bugün 2 yıl varsayıldı.
      → `src/config.js`
- [ ] **Parça ve belirti adları.** Talep formundaki "hangi parça lazım"
      listesi taslak. Servis ve yedek parça ekibinin günlük kullandığı
      adlarla değişmeli. Yanlış ad = yanlış parçanın yola çıkması.
      → `src/data/talepAlanlari.js`
- [ ] **Banka hesapları (IBAN).** Yedek parça ödemesi için. 30 Eylül
      2026'da kullanıcının paylaştığı afişten girildi (Halkbank 17 Eylül
      Şubesi, TR56 0001 2001 5660 0010 1000 19, alıcı "PAKSAN MAKİNA").
      Kalan: PAKSAN muhasebesi IBAN'ı ve müşterinin yazacağı alıcı adını
      (afişteki kısa ad mı, tam unvan mı) bir kez doğrulasın.
      → `src/data/kimlik.js` → `BANKA`
- [ ] **İhracat ekibi e-posta adresleri.** → `src/config.js` → `IHRACAT`
- [ ] **KVKK metinleri hukukçuya.** *(Aşağıda ayrı başlık.)*
- [ ] **Kılavuz PDF'leri, ürün videoları, ürün fotoğrafları.** Kılavuz
      PDF'leri sunucudaki kılavuz klasörüne; bugün 20 ürünün 9'unun
      kılavuzu bağlı. `D:\PAKSAN\kaynaklar\ASD\` altındaki kılavuzların
      hangi modele ait olduğu PAKSAN'ca doğrulanınca eklenir
      (`sunucu-taklidi/BENIOKU.md`).

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

**Müşteri uygulamasında da tek satır (25 Eylül 2026):** `index.html`
kök etiketindeki `data-demo="acik"` silinecek. O işaret varken Makine
Kaydet ekranında "DENEME" kutusu ve örnek seri numaraları görünüyor
(bkz. `src/lib/demoSurumu.js`). Silinmezse iki gerçek müşteri aynı
sahte seriyi kaydedebilir. `npm run dogrula -- --yayin` iki işaretten
biri duruyorsa durduruyor.

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

**Her servisin hizmet bölgesi girilecek (5 Ekim 2026).** Servis talebi,
makinenin bulunduğu il ve ilçe servisin bölgesinde değilse servise
gitmiyor, PAKSAN'a düşüyor (bkz. CLAUDE.md → "5 Ekim 2026 — bölge dışı
servis talebi"). Bölge backoffice → Servisler → servisin Düzenle
penceresinde. Girilmezse servisin bölgesi yalnız kendi ili sayılıyor: başka
ildeki bir bayiyle çalışan servisin (örnek listede 14 servisin 7'si) o
bayiden makine almış müşterilerinin her talebi PAKSAN'a düşer. Demo listede
bölgeler girili (kendi ili ve bayilerinin illeri); gerçek liste girilirken
aynısı yapılmalı.

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

Connect'in dört metni (`src/data/kvkk.js`, sürüm 1.1) ve Servisim'in üç
metni (`src/data/servisGizlilik.js`, sürüm 1.0) hazır ama **taslak**.
Hukuk danışmanınız onaylamadan canlıya çıkılmamalı. 29 Eylül 2026'da
gözden geçirildi: yanlış cümleler düzeltildi, eksikler eklendi, Connect'e
"Gizlilik ve İzinler" sayfası ve onay geçmişi, Servisim'e ilk girişte
kabul ekranı geldi (CLAUDE.md → "29 Eylül 2026 — KVKK").

#### KVKK: hukuk danışmanına sorulacaklar

1. **Şirket kimliği.** MERSİS numarası, KEP adresi, KVKK için ayrı bir
   e-posta ya da kişi, VERBİS kaydı ve uygulamanın akışlarını kapsayıp
   kapsamadığı (`src/data/kimlik.js → SIRKET`).
2. **Connect'te zorunlu açık rıza.** Kayıt, Açık Rıza Metni onaylanmadan
   tamamlanmıyor (kullanıcının kararı: "şimdilik olduğu gibi kalsın").
   Kurul'un yaklaşımı: hizmet açık rızaya bağlanamaz; sözleşme, kanuni
   yükümlülük ya da meşru menfaatle yapılabilen işlem için rıza
   istenmemeli. Servis ve bayiye aktarım md. 8/2 ile md. 5/2-c'ye
   dayanabilir. Rıza zorunlu kalmalı mı, yalnız kampanya için mi
   istenmeli?
3. **Servisin rolü.** Çiftçi verisi için servis veri işleyen mi, ayrı veri
   sorumlusu mu, yoksa ikisi birden mi (garanti dışı iş ve dükkâna
   gelen müşteri servisin kendi işi)? Servis sözleşmesine veri işleme ve
   gizlilik eki gerekiyor; Servisim'deki kabul ekranı sözleşmenin yerine
   geçmiyor. Bayinin fiyat teklifi talebindeki rolü de aynı soru.
4. **Servisim'de telefon ve seriyle müşteri arama.** Kayıt Aç ekranı,
   başka servise bağlı müşterinin adını, ilini ve telefonunu da
   gösteriyor (21 Eylül kararı; 29 Eylül'de "şimdilik kalsın, avukata
   sorulsun"). Ölçülülük (md. 4) açısından uygun mu? Gerekirse: arama
   kaydı, sınır, telefonun maskelenmesi.
5. **Saklama süreleri** ve Saklama ve İmha Politikası: dekont, işlem
   kaydı, rıza olayları, servisin vergi ve IBAN bilgisi
   (`veritabani/tohum/kaynak/saklama-kurallari.json`, hepsi
   `HukukOnayli: false`).
6. **Yurt dışına aktarım.** Bugün yok. Planlananlar: bildirim altyapısı
   (FCM), hata kaydı (Crashlytics), barındırma yeri; Servisim'in sesle
   yazması telefonun ses tanıma hizmetine (çoğu zaman Google) gidiyor;
   Yol Tarifi adresi Google Haritalar'a açıyor. Standart sözleşme ve
   Kurum'a 5 iş günü içinde bildirim gerekir mi?
7. **Ticari ileti (6563, İYS).** Uygulama bildirimi İYS kanalı mı; onay ve
   ret kayıtları ne kadar saklanmalı; bakım hatırlatmaları izin ister
   mi; servisin SMS daveti ticari ileti mi; şahıs servislerine kampanya.
8. **Başvuru yolu.** Metin ıslak imza, KEP, güvenli e-imza ve kayıtlı
   e-posta sayıyor; Connect e-posta toplamıyor. Uygulama içi başvuru
   formu "yazılım" kanalı sayılır mı (veritabanında `kvkk.BasvuruTalebi`
   hazır)?
9. **Hesap silme** ile yasal saklama arasındaki sınır (anonimleştirme).
10. **İhlal bildirimi.** Kurul'a 72 saat; servisin firmaya bildirim süresi.
11. **Çocuk ve aile hesabı**, sağlık bilgisi içeren fotoğraf ya da açıklama.
12. **Yurt dışı müşterisi.** `kvkk.en.js` bir **çeviridir**; Avrupa'ya satış
    varsa GDPR'a göre ayrı metin gerekir.
13. **"Okudum ve anladım" kutusu** aydınlatma için kanıt olarak kalmalı mı,
    yoksa metin gösterilip gösterildiği mi kaydedilmeli?

Yayından önce ayrıca: Google Play'in Veri Güvenliği formu gerçeğe göre
doldurulmalı (ad, telefon, adres, T.C. kimlik/vergi no, dekont, fotoğraf,
video, ses, destek kaydı, bildirim kimliği) ve gizlilik metni internette
bir adreste yayımlanmalı (Play Console istiyor).

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
listeye 30 sahte müşteri karışır. Demonun öteki dosyaları da gider:
`demoServis.js`, `demoSahne.js`, `demoMakineAilesi.js`,
`src/servis/demoKur.js`. 29 Eylül 2026'dan beri demo, personel yazmamışsa
üç ayar da yazıyor (demo servisine özel işçilik ücreti ve parça indirimi,
bakiyeden ödemede ek indirim); canlıya çıkmadan önce demo backoffice'ten
temizlenirse bu ayarlar eski hâline döner (`demoTemizle`).

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


---

## 11. Maliyet (22 Eylül 2026)

Kullanıcının isteği: "Bu projenin canlıya çıkma maliyetini hesaplamamız
lazım." Varsayımlar:

- **Yalnız Android.** iOS ilk aşamada yok (bkz. 5.6).
- **Sunucu:** şirketin Vodafone bulutunda kiraladığı sunucu. Kurulum
  oraya yapılacak; **sunucu kirası bu hesaba girmedi.** Bulut sunucusu
  olduğu için `SUNUCU-VE-VERITABANI.md` §14'teki şirket içi kalemler
  (yedek internet hattı, elektrik ve soğutma, ağ ayrımı) gerekmiyor.
- Rakamlar **KDV hariç** (aksi yazılan yerde dahil). Kur: 1 ABD doları
  = 48,8 TL (TCMB, 22 Eylül 2026).
- Fiyatı bilinen kalemler kaynağından alındı; bilinmeyenler
  **aralık** olarak verildi ve dayanağı yazıldı. Kesin rakam için her
  tahmini kalemde 2-3 teklif alınmalı.

### 11.1 Fiyatı belli kalemler

| Kalem | Ne zaman | Tutar | Not |
|---|---|---|---|
| Google Play geliştirici hesabı | tek sefer | 25 USD ≈ **1.220 TL** | Connect ve Servisim aynı hesapta |
| D-U-N-S numarası (kurumsal Play hesabı için) | tek sefer | 0 | Dun & Bradstreet ücretsiz veriyor; birkaç hafta sürebilir |
| SSL sertifikası (Let's Encrypt) | — | 0 | 90 günde bir kendiliğinden yenileniyor |
| Alt alan adları (`api.`, `backoffice.`) | — | 0 | `paksanmakina.com.tr` zaten şirketin |
| Bildirim gönderimi (Firebase Cloud Messaging) | — | 0 | Push bildirimi ücretsiz |
| Veritabanı (SQL Server Express) | — | 0 | 10 GB sınırı; talep ve kayıt verisine yıllarca yeter. Fotoğraf ve video veritabanında değil diskte duruyor |
| Uygulama imza anahtarı (Play App Signing) | — | 0 | |
| Uygulama hata takibi (Firebase Crashlytics) | — | 0 | |
| İYS temel hizmetleri | — | 0 | Yalnız ticari SMS / e-posta gönderilirse gerekiyor; uygulama içi duyuru ve push bir İYS kanalı değil. Hukuk danışmanına teyit ettirilmeli |
| Doğrulama SMS'i (OTP) | kullandıkça | **0,18–0,48 TL/adet** (ÖİV ve KDV dahil) | Netgsm OTP tarifesi: 10.000'lik paket 2.790 TL, 1 yıl geçerli; yeni abonede 1.999 TL |
| Logo Tiger 3 Objects lisansı *(gerekirse)* | tek sefer | **63.100 TL** (LEM'i olan) / **69.500 TL** (LEM'i olmayan) | LOGO'nun REST servisi ayrı lisanslanmıyor, bu lisansı şart koşuyor. PAKSAN'da Objects lisansı zaten varsa 0. Logo tavsiye edilen fiyat listesi, 7 Ocak 2026 |

**SMS hacmi.** SMS yalnız kayıt, şifre sıfırlama ve numara
değişikliğinde gidiyor. Yılda 3.000 yeni müşteri ≈ 5.000 SMS ≈ **1.500–2.500
TL/yıl.** Talep bildirimleri SMS'le değil push'la gidiyor ve öyle
kalmalı: binlerce kullanıcıya SMS, bütün sunucu masrafından pahalıya
gelir.

### 11.2 Fiyatı belli olmayan, önerilen kalemler (tahmin)

| Kalem | Tahmin | Dayanak |
|---|---|---|
| **Sunucu yazılımı (API)** — hesaplar, talepler, yetki denetimi, dosya yükleme, SMS ve bildirim bağlantısı, test. Veritabanı tasarımı ve betikleri hazır (`veritabani/`) | **Dış firma: 0,8–2,3 milyon TL** | 2.4'teki süreler 65–125 adam/gün ediyor; 2026'da yazılım firmalarının adam/gün fiyatı ~12.000–18.000 TL |
| (Aynı iş) **içeriden bir yazılımcı + yapay zekâ araçları** | **0,5–1,0 milyon TL** | 4–6 ay × işveren maliyeti ~110.000–150.000 TL/ay (2026 back-end ortalama maaşı ~72.700 TL) + araçlar ~20.000 TL/ay (Claude ve Codex abonelikleri; bu proje bugüne kadar böyle yazıldı) |
| LOGO iş ortağı hizmeti — REST servisinin kurulumu, okuma yetkisi, veri eşleme | 20.000–100.000 TL | İş ortağının tarifesine ve LOGO tarafındaki işin büyüklüğüne bağlı |
| Sızma testi — backoffice + API + iki Android uygulaması | 60.000–200.000 TL | 2026'da tek web uygulaması 40.000–90.000 TL; mobil ve API kapsamı ekleniyor |
| Hukuk — KVKK metinleri, servis ve bayilerle veri paylaşım sözleşmesi | 20.000–75.000 TL | Hukuk danışmanının tarifesi |
| Yedeklerin sunucu dışında, Türkiye'de tutulması | 500–2.000 TL/ay | Vodafone'un yedekleme hizmeti ya da nesne depolama; teklif alınmalı. Aynı sunucudaki yedek, yedek değildir (bkz. 7.1) |
| Çalışma izleme (sunucu çökünce haber) | 0–400 TL/ay | Ücretsiz katman (ör. UptimeRobot) başlangıçta yeter |
| E-posta gönderimi (backoffice şifre sıfırlama, ihracat talepleri) | 0 | Şirketin kendi e-posta sunucusundan |
| Yayından sonra bakım ve destek | 20.000–60.000 TL/ay | Dış firmayla çalışılırsa sözleşme; içeriden yazılımcıda maaşın içinde |

### 11.3 Hesaba katılmayanlar — ama sunucu kararını etkileyenler

- **Sunucu kirası** (Vodafone).
- **Destek asistanının dil modeli sunucuda çalışıyor.** Ücretli bir
  yapay zekâ servisine bağlı değil, soru başına ücret yok. Ama modelin
  hep bellekte durması için sunucuda **yaklaşık 8 GB ek bellek**
  gerekiyor (bkz. 2.1.1). Vodafone sunucusunun belleği yetmezse kira
  artar — bilgi işleme sorulmalı.
- **Talep ekleri** (fotoğraf, video, ses): ayda 1.000 talepte yılda
  yaklaşık 100–300 GB disk. Sunucunun diski buna göre seçilmeli.
- **Test ortamı:** aynı sunucuda ayrı bir veritabanı olarak kurulabilir;
  ayrı küçük bir sunucu istenirse kira.
- **iOS:** Apple geliştirici hesabı yıllık 99 USD ≈ 4.830 TL; şimdilik
  yok.

### 11.4 İlk yıl — kaba toplam (KDV hariç)

| | Dış firmayla | İçeriden yazılımcı + yapay zekâ |
|---|---|---|
| Fiyatı belli kalemler (Play hesabı, SMS) | ~5.000 TL | ~5.000 TL |
| Logo Objects lisansı *(gerekirse)* | 0–69.500 TL | 0–69.500 TL |
| Sunucu yazılımı | 0,8–2,3 milyon TL | 0,5–1,0 milyon TL |
| LOGO iş ortağı | 20.000–100.000 TL | 20.000–100.000 TL |
| Sızma testi | 60.000–200.000 TL | 60.000–200.000 TL |
| Hukuk | 20.000–75.000 TL | 20.000–75.000 TL |
| Yedek + izleme (12 ay) | 6.000–29.000 TL | 6.000–29.000 TL |
| Yayından sonraki bakım (ilk yılın kalan ~6 ayı) | 120.000–360.000 TL | yazılımcının maaşında |
| **Toplam** | **~1,0–3,1 milyon TL** | **~0,6–1,5 milyon TL** |

İçeriden yolda yazılımcı yayından sonra da kalırsa aylık maliyeti
(~130.000–170.000 TL, araçlar dahil) sürer; karşılığında her değişiklik
için firmanın sırasını beklemek gerekmez.

**En büyük kalem sunucu yazılımı, gerisi küçük.** Uygulamaların üçü ve
veritabanı tasarımı bitmiş durumda (işin %60-70'i, bkz. 1) — onlar bu
hesapta yer almıyor. Toplamı asıl belirleyecek iki soru: sunucuyu kim
yazacak (2.2) ve PAKSAN'da Logo Objects lisansı var mı.

**Kaynaklar (22 Eylül 2026):** Netgsm OTP SMS fiyatları
(netgsm.com.tr/fiyatlar/otp-sms), Logo Tiger 3 tavsiye edilen fiyat
listesi (7 Ocak 2026), İYS sıkça sorulan sorular (iys.org.tr),
Eleman.net 2026 back-end maaşları, Most Idea 2026 özel yazılım maliyet
rehberi, 2026 sızma testi fiyat rehberleri, TCMB kuru.
