# PAKSAN Connect

Tarım makineleri üreticisi PAKSAN Makina için React 19 + Vite 6 + Capacitor 6
mobil uygulama, artı ayrı derlenen bir "backoffice" (personel paneli). Kod
tabanı ~170 dosya / ~41.000 satır (`src/`). Kullanıcı geliştirici değil —
uygulama içi tüm metin ve yorumlar sade Türkçe.

## Yapı

- `src/screens/` — müşteri uygulaması ekranları (22 dosya)
- `src/backoffice/` — personel paneli, `ekranlar/` alt klasöründe ekranlar (16 dosya)
- `src/components/` — paylaşılan bileşenler
- `src/marka/` — firmaya ait her şey: kimlik, logo, renkler, ürün kataloğu, servis listesi, fiyatlar, kılavuz paketi. Motor buraya yalnızca `src/marka/index.js` kapısından bakar (bkz. MARKA-DEVIR.md)
- `src/data/` — ülkeye ve motora ait statik içerik: il listesi, KVKK metinleri, talep alanları, duyuru türleri, yetki kataloğu
- `src/lib/` — yardımcı modüller (depolama, bildirim, PDF/Excel dışa aktarım)
- `src/i18n/` — `tr.js`/`en.js` (663 anahtar, eşit tutuluyor ama build'de zorlanmıyor) + `index.jsx`
- `tools/` — otomasyon betikleri (ekran görüntüsü, ikon üretimi, veri doğrulama)

## Üç ayrı derleme

- `vite.config.js` → `dist/` → APK'ya giren **müşteri uygulaması**
- `vite.backoffice.config.js` → `dist-backoffice/` → **backoffice personel paneli**
- `vite.servis.config.js` → `dist-servis/` → **PAKSAN Servisim** (servis uygulaması)

Backoffice ve servis kodu müşteri APK'sının içine GİRMEMELİ.

**Servis uygulamasının adı PAKSAN Servisim** (10 Eylül 2026'dan beri).
Android'de görünen ad `tools/cap-hedef.mjs` içinde. Kodda marka adı düz
yazılmaz: `${MARKA} Servisim`.

- `npm run build` → müşteri uygulaması
- `npm run build:backoffice` → backoffice
- `npm run build:servis` → servis uygulaması

İki ayrı APK üretiliyor:

- `npm run apk` → müşteri APK'sı
- `npm run apk:servis` → servis APK'sı

### Sürüm numaraları — iki uygulamanın AYRI hattı var

- **PAKSAN Connect:** `src/marka/kimlik.js` → `SURUM` (uygulamanın içinde
  görünen), `package.json` → `version`, `android/app/build.gradle` →
  `versionName` + `versionCode`. Üçü birlikte artırılır.
- **PAKSAN Servisim:** yalnız `android-servis/app/build.gradle` →
  `versionName` + `versionCode`. Kendi hattı 0.1.0'dan başladı
  (10 Eylül 2026); Connect'in numarasını kopyalamaz.
- APK dosyaları: `apk/paksan-<sürüm>-demo.apk` ve
  `apk-servis/paksan-servisim-<sürüm>-demo.apk`. Var olan dosyanın
  üstüne yazılmaz.

İkisi tek `capacitor.config.json` dosyasını paylaşır. `tools/cap-hedef.mjs` hedefi değiştirir; servis derlemesi bitince hedefi müşteriye geri alır. Böylece depodaki dosya değişmez.

### Servis tarafı YALNIZ MOBİL UYGULAMA

- **Servisin tarayıcıdan açılan bir paneli YOKTUR.** Bir dönem vardı
  (`servis-panel.html`) ve 9 Eylül 2026'da kaldırıldı: servis elemanı
  ekranı tarlada, işin sonunda, çoğu zaman ayakta açıyor. Masaüstü bir
  panel onun çalışma biçiminde karşılığı olmayan ikinci bir yüzeydi ve
  iki yüzeyi eşit tutmak boşa bakım yüküydü.
- Tek giriş `servis.html`; derlemede `index.html` adıyla çıkar, çünkü
  Capacitor `webDir` klasöründe bu adı arar. Başka adla çıksaydı APK
  boş ekran açardı.
- `servis.html` kök etiketinde `data-demo="acik"` var: demo verisi bu
  işaretle kuruluyor. **Canlıya çıkarken o satır silinecek**
  (bkz. CANLIYA-CIKIS.md).

Servis uygulaması kendi CSS kökünü açmaz, `backoffice.css` dosyasını paylaşır. `npm run dogrula` bu kuralı denetler.

İlk servis APK'sında `android-servis` klasörü henüz üretilmedi; ilk çalıştırmada oluşur.

## CSS — iki ayrı kök, elle senkron

`src/styles.css` (5141 satır) ve `src/backoffice/backoffice.css` (2311 satır)
kendi `:root` bloklarını ayrı ayrı tanımlıyor — **token'lar paylaşılmıyor**.
Renk değerleri (`--pk-blue`, `--tur-servis` vb.) iki dosyada da birebir aynı
olmalı, bu elle sağlanıyor. Bir renk token'ını değiştirirsen diğer dosyayı da
kontrol et.

Karanlık/aydınlık tema `data-tema='koyu'/'acik'` attribute'u ile uygulanıyor.

## Test altyapısı yok

Unit/e2e test yok. Doğrulama: manuel + `tools/ekran-goruntusu.mjs` +
tarayıcıda ölçülen JS (kontrast, taşma, dokunma hedefi).

## Ekosistemin Temeli — Dört Taraf, Eşit Değil

Bayi ve servis AYRI taraflardır. Bayilerin çoğunun kendi servisi yoktur;
anlaştıkları bağımsız servislere yönlendirirler.

- **PAKSAN** makineyi bayiye satar, servise parça gönderir ve
  servisin hak edişini öder
- **Bayi** makineyi müşteriye satar. Paneli yoktur; sistemde kaydı vardır
- **Servis** kurulumu, bakımı ve tamiri yapar. İşini bayiye değil,
  doğrudan PAKSAN'a raporlar; parasını PAKSAN'dan alır
- **Müşteri** makineyi bayiden, hizmeti servisten alır

**MÜŞTERİNİN SERVİSİ TEK YERDEN ÇIKIYOR:** `src/lib/servisAtama.js`.
Zincir makineden geçiyor — makineye atanmış servis, yoksa makineyi
satan bayinin servisi. Coğrafyaya bakan otomatik atama KALDIRILDI:
servis hak edişini PAKSAN'dan alıyor, PAKSAN kime iş verdiğini bilmek
zorunda ve "en yakın" bir kayıt değil tahmindir.

Zincir boş dönerse müşteri **servis talebi açamıyor**; uygulama
PAKSAN'la iletişime geçmesini söylüyor. Atama backoffice'te
Kayıtlı Makineler ekranından yapılıyor.

**Fiyat teklifi servise değil bayiye gider.** Talep PAKSAN'a düşüyor,
satış personeli bayiye atıyor (`talebiBayiyeAta`), talep "Bayide"
durumuna geçiyor ve PAKSAN'ın kuyruğundan çıkıyor.

**Yedek parça talebi servise gitmez.** Müşterinin PAKSAN Connect'ten
açtığı parça talebi yalnız backoffice'e düşer: tedarikçi PAKSAN, müşteri
parayı dekontla PAKSAN'a öder, parçayı PAKSAN gönderir. Servislerde bir
dönem "yedek parça hizmeti" işareti vardı ve talep o servise
yönlendiriliyordu; servis parçayı kendi elinden gönderiyor, karşılığı
hiçbir yere yazılmıyordu. İşaret ve yönlendirme 10 Eylül 2026'da
kaldırıldı. Servisin parça ihtiyacı kendi siparişiyle ya da servis
kaydının içinden karşılanır.

Servis ayrı bir şirket ya da şahıstır ve **kendi menfaati dışında bir
şey yapmaz.** Yalnızca PAKSAN'a yarayan bir veri girişi ya hiç yapılmaz
ya da geçiştirilir; geçiştirilmiş veri, verinin olmamasından daha
kötüdür — PAKSAN ona bakarak karar alır.

**Kural:** Servisten istenen her alan için tek soru sorulur:
*Servis bunu doldurduğu anda ne alıyor?* Cevap yoksa alan istenmez.
Veri, servisin kendi çıkarı için yaptığı işin **yan ürünü** olmalı;
ayrı bir iş olarak istenmemelidir.

Bugün sunulan somut karşılıklar: garanti kapsamındaki bedelsiz parça
(talep formu zaten o parçayı istemenin tek yoludur), stok bitince
sipariş önerisi, müşterinin uygulamasında görünen servis kaydı.
En güçlü kaldıraç ise hak ediştir: Servis, işini kaydetmeden parasını
alamaz; bu yüzden kaydı kendi çıkarı için doğru doldurur.

## Üç Ürün Birlikte Çalışır

Servis panelinde oluşturulan veriyi okuyan ekran yoksa iş bitmemiştir.
Bir özellik "bitti" sayılmadan önce üç tarafta da yeri olmalıdır:

- **Servis Paneli** — veriyi üreten ekran
- **Backoffice** — PAKSAN'ın o veriyi göreceği ekran
- **PAKSAN Connect** — verinin müşteriyi ilgilendiren kısmı

Ortak biçimleri yeniden icat etme: Talep kapanışı `cozum` nesnesiyle
yürüyor (`yapilanIs`, `parcalar`, `ucret`, `ozet`) ve üç taraf da onu
okuyor. Bildirimler `duyurular` deposundan geçiyor. Paralel bir depo
açmak, iki tarafın birbirini görmemesi demektir.

## Servis Panelinin Kullanıcısı

Servis personelinin teknoloji bilgisi yüksek olmayabilir. Ekranı
tarlada, işin sonunda, çoğu zaman ayakta açar. **Görsel kalite
hiçbir üründe düşmez; sorulan soru sayısı düşer.**

- Tek ekranda tek soru; cevaplar tam genişlikte düğmelerle sunulur
- Gizli etkileşim yok: Kaydırarak silme, uzun basma, çift dokunma yok
- İkon tek başına anlam taşımaz; yanında yazı olur
- Terim yok: "İskonto", "kapsam", "künye" ekranda geçmez.
  **"hak ediş" SERVİSTE SERBEST** (12 Eylül 2026, kullanıcının kararı):
  servis ayrı bir şirket, PAKSAN'ın karşı tarafı ve bu kelime onun
  kendi parasının adı — bilmediği bir terim değil. Alt menüdeki
  "Hak Ediş" sekmesi ve ekran başlığı bu yüzden yerinde kalıyor
  (`src/servis/ServisPanel.jsx`). Müşteri ekranlarında yasak sürüyor.

  YASAK LİSTESİ NEREDEN GELDİ: 7 Eylül 2026'da **bayi paneli** için
  yazıldı (commit e6569c4, o günkü başlık "Bayi Panelinin
  Kullanıcısı"). 9 Eylül'de panel bayiden servise devredilirken
  (6d6410f) başlık "Servis Panelinin Kullanıcısı" oldu ve liste olduğu
  gibi taşındı — yeni kullanıcıya göre bir daha okunmadı. Kalan üç
  terim gerçekten müşteri diline ait; "hak ediş" değildi.
- Onay penceresi ne olacağını açıklar; "Emin misiniz?" demez
- Boş ekran çıkmaz sokak olmaz; ne yapılacağını açıklar

## Standing kurallar (kullanıcıdan)

- APK: yalnız istendiğinde derle, her sürümü ayrı dosyada sakla, üzerine yazma
- **Dil: yalnız PAKSAN Connect (müşteri uygulaması) iki dilli.** Orada her
  değişiklik Türkçe VE İngilizce yapılır. Backoffice ve servis paneli tek
  dilli, yalnız Türkçe — kullanıcıları PAKSAN personeli ve Türkiye'deki
  bayiler. Bu ekranlarda `t()` ve sözlük aranmaz.
- **TÜRKÇE HER ŞEY CODEX'TEN GEÇER.** Cümle, paragraf, hata metni,
  sekme adı, düğme yazısı, bölüm başlığı, alan etiketi, rozet — ayrım
  yok. Claude Türkçe metin yazmaz; taslağı Codex'e verir, dönen metni
  kullanır. (6 Eylül 2026: "kısa etiketleri Claude yazar" istisnası
  kaldırıldı — "Stoklu model" gibi etiketler kötü çıkıyordu.)
- API anahtarları asla uygulamaya gömülmez (sunucu tarafında kalır)
- Hesap silme / numara değişikliği yalnız PAKSAN yetkilisi tarafından yapılır
- Görsel içerik üretilecekse Higgsfield kullanılır — hesapta kredi var,
  elle çizilmiş zayıf görselle idare edilmez
- Tasarım referansı için kullanıcıya sorulmaz: tarayıcı açılır, benzer
  uygulamalara bakılır, karar gerekçesiyle yazılır
- **DOSYA DÜZENİ AÇIKLANABİLİR OLMALI (18 Eylül 2026, kullanıcının
  isteği):** "Dosyalara daldığımda neyin ne olduğunu bilmeliyim."
  Kullanıcı geliştirici değil ama dosyaların içine giriyor; kod okumadan,
  yalnız adlara bakarak neyin nerede olduğunu çıkarabilmeli.
  - Klasörde neyin ne olduğunu **`README.md`** anlatır. Yeni klasör ya da
    kök belgesi eklenince o dosya da güncellenir.
  - Ad ne işe yaradığını söylesin; kısaltma ve İngilizce ad kullanılmaz.
  - Geçici çalışma dosyası bırakılmaz; iş bitince silinir.
  - Kök dizine yeni `.md` atmadan önce var olan bir belgeye ait olup
    olmadığına bakılır.
  - Bir belge geçerliliğini yitirdiyse SİLİNMEZ, başına gerekçesiyle
    "GEÇERSİZ" notu düşülür (örnek: `BAYI-YOL-HARITASI.md`).
  - Aynı bilgi iki dosyada tutulmaz; ikinci dosya birinciye yönlendirir
    (örnek: `AGENTS.md` → `CLAUDE.md`).
- **GEREKSİZ DOSYA SORULMADAN SİLİNİR (18 Eylül 2026, kullanıcının
  kararı):** "Sileyim mi diye sorduğun şeyin ne olduğunu ben zaten
  bilmiyorum." İki şart: işe yaramadığından %100 emin ol (referans
  taraması yap) ve geri dönüşüm kutusuna gönder. Emin değilsen silme,
  yalnız bildir.

## Değişiklik sonrası kontrol listesi

Bir değişikliği "bitti" demeden önce:

1. Renk/tema değişikliği yaptıysan → `styles.css` ve `backoffice.css`
   token'ları hâlâ eşit mi, elle kontrol et
2. **Müşteri uygulamasında** metin ekledi/değiştirdiysen → `tr.js` VE
   `en.js` ikisi de güncellendi mi (anahtar sayıları eşit mi).
   Backoffice ve servis uygulaması tek dilli, orada bu adım yok.
   Marka adı sözlüğe SABİT YAZILMAZ; yer tutucu kullanılır:
   `{marka}`, ve çekimli hâller için `{markaYi}`, `{markaya}`,
   `{markadan}`, `{markada}`, `{markanin}` (bkz. `src/i18n/index.jsx`).
3. Görsel bir değişiklikse → `ekran-dogrulama` subagent'ı ile ekran
   görüntülerini tazele, `ui-dogrulama` subagent'ı ile son QA turu yap
4. Yeni/değişen ikon varsa → `ikon-uretici` subagent'ını kullan, ikonu elle
   `ikonYollari.js`'e yazma

## Subagent'lar

Bu projede üç proje-özel subagent var (`.claude/agents/`):

- **ekran-dogrulama** — ekran görüntülerini yeniler, kırık CSS seçicileri onarır
- **ikon-uretici** — Higgsfield PNG'sini vektör ikona çevirir
- **ui-dogrulama** — tamamlanmış bir değişikliğin son görsel QA turu (salt okunur)

Genel kod tabanı keşfi için ayrıca proje-özel bir agent yazmaya gerek yok —
global `Explore` agent tipi yeterli, bu dosya ona gereken bağlamı zaten veriyor.
Genel diff incelemesi için `/code-review` komutu kullanılır.

## Codex ile iş bölümü

- **KALICI KURAL:** Codex’in bu projedeki rolü Türkçe metin yazımı ve dil doğruluk kontrolüdür.
- **TEK İSTİSNA — DESTEK ASİSTANI (10 Eylül 2026, kullanıcının kararı).**
  Destek ekranının geliştirmesini Codex yürütür: sohbet sunucusu
  (`D:\PAKSAN\paksan-rag\sohbet\`), kılavuz arama ve dil modeli,
  `src/screens/Support.jsx` ve ona bağlı destek dosyaları. Model
  `gpt-6-astra`, efor `xhigh`. Claude bu işi kendisi ya da kendi alt
  ajanlarıyla YAPMAZ; yardım eder (tarayıcıda sınama, ölçüm, inceleme;
  commit ve APK Claude'da). İki taraf arasındaki haberleşmeyi Claude'un
  açtığı irtibat alt ajanı yürütür; her değişiklik ve her istek
  `D:\PAKSAN\paksan-rag\sohbet\ORTAK-DEFTER.md` dosyasına yazılır. Dosya
  sahipliği o defterde.
- **SÜREKLİ GELİŞTİRME DÖNGÜSÜ (10 Eylül 2026, kullanıcının isteği):**
  Destek asistanı tek tek iş verilip beklenmeden sürekli geliştirilir.
  Kural `D:\PAKSAN\paksan-rag\sohbet\GELISTIRME-DONGUSU.md`, iş listesi
  `GELISTIRME-KUYRUGU.md`, sahip ve taban `dongu-durumu.json`. Zamanlanmış
  görev `destek-gelistirme-dongusu` 5 dakikada bir yoklar; tur sürmüyorsa
  hemen yenisini başlatır, çalışma durmaz (sahip
  Codex iken Codex turunu başlatır ve doğrular). Bir işi bitirip "devam
  edeyim mi?" diye durulmaz; sıradaki iş kuyruktan alınır. Kullanıcı
  sohbette **"duraklat"** yazınca döngü hemen durdurulur
  (`duraklatildi: true`, görev kapatılır, süren ölçüm durdurulur),
  **"devam"** yazınca sürer.
- Bunun dışında hiçbir iş Codex’e devredilmez.
- **Rolün sınırı YOK: ekranda görünen her Türkçe kelime Codex'ten
  geçer.** Cümle, paragraf, hata metni, sekme adı, düğme yazısı, bölüm
  başlığı, alan etiketi, rozet — hepsi. Bir-iki kelimelik etiketleri
  Claude'un yazması denendi ve geri alındı: kısa etiketler tam da
  ekranın ne anlattığını belirleyen yer ve orada üretilen Türkçe kötü
  çıkıyordu ("Stoklu model" gibi).
- Yeni ekran yazıldığında, İÇİNDEKİ BÜTÜN TÜRKÇE metinler tek seferde
  Codex'e verilir — yalnız uzun cümleler değil.
- **Brief'e EV KURALLARI da yazılır.** Codex bu projenin yazım
  düzenini bilmiyor; söylenmezse kendi tercihine göre değiştiriyor:
  - Düğme yazıları **Başlık Düzeninde**: "Devam Et", "Talebimi Gör",
    "Sorun Devam Ediyor". Etiket ve açıklama cümleleri normal.
  - Marka adı yer tutucuyla geçer (`{marka}`, `{markaYi}`, …);
    Codex'ten bunları değiştirmemesi istenir.
  - Terim yasağı (iskonto, kapsam, künye) müşteri ve servis ekranları
    için geçerli, backoffice'te değil. "hak ediş" YALNIZ müşteri
    ekranlarında yasak; serviste serbest (gerekçesi "Servis Panelinin
    Kullanıcısı" bölümünde).
- İş devredilirken gereken efor açıkça belirtilir; `codex exec` için `-c model_reasoning_effort` kullanılır.
- Türkçe metin yazımı ve dil doğruluk kontrolü için efor seviyesi `low` olarak belirlenir.
- Devredilen iş sessizce başarısız olabilir; sonucu görülmeden iş tamamlanmış sayılmaz.

## Değişiklik sonrası doğrulama

Önceden elle yapılan kontroller artık tek komutta:

    npm run dogrula

On üç şeye bakıyor:

 1. `tr.js`/`en.js` anahtar eşitliği
 2. Kodda kullanılan `t('...')` anahtarlarının sözlükteki karşılıkları
 3. İki CSS dosyasındaki token'ların uyumu
 4. `dist/` içine backoffice kodunun sızıp sızmadığı
 5. Motorun marka klasörüne yalnızca kapıdan bakıp bakmadığı
 6. Motor kodunda marka adının düz yazıyla geçip geçmediği
 7. Servis uygulamasında bayi kalıntısı kalıp kalmadığı
 8. `tools/` altındaki dört birim sınamasının geçip geçmediği
 9. Yedek parça kataloğunun tutarlılığı ve uydurma fiyat izi
10. Connect'in üç yerdeki sürüm numarasının tutması, Servisim'in ayrı hattı
11. Yayına çıkışı engelleyen geliştirme ayarları (saymıyor, yalnız listeler)
12. Codex'i bekleyen yer tutucu metin ekrana çıkıyor mu
13. Veritabanı betikleri: SQL statik denetimi (`tools/vt/denetle.mjs`),
    tohum betiklerinin `tohum/kaynak/*.json` ile aynı olması ve ortam
    dosyasının git'e girmemiş olması (veritabanı klasörü yoksa atlanır)

5. ve 6. kontroller marka sınırını koruyor: ürünün başka bir firmaya
kurulabilmesi buna bağlı. 7. kontrol bayi–servis ayrımını koruyor:
panel bayiden servise devredildi; yarım kalan bir devir, altı ay sonra
hangi adın ne anlama geldiğini belirsizleştirir. 8. kontrol
`marka-ek-testi`, `bolge-testi`, `duyuru-hedef-testi` ve
`destek-dogrula` betiklerini çağırıyor — ayrı dururken
unutuluyorlardı ve biri haftalarca kırık kaldı. 9. kontrol uydurma
parça listesinin geri gelmesini engelliyor ve kataloğa yeni bir grup
eklendiğinde o grubun müşteri ekranından sessizce kaybolmasını
yakalıyor. 11. kontrol bulduğunu SORUN SAYMIYOR: o ayarların bugün
açık olması doğru; yayın günü saydırmak için `npm run dogrula --
--yayin`. 12. kontrol, ekranda görünen Türkçenin Codex'ten geçmesi
kuralının ağıdır: yer tutucu bırakıp unutmak yedi partinin birlikte
çalıştığı bir günde gerçekten oldu (15 yazılmamış dizgi). 13. kontrol
veritabanı planının "Eşleşme denetimi (`npm run dogrula`)" maddesini
buradan çağırıyor. Üç parçası da yazılıydı ama hiçbiri bu komuttan
koşmuyordu: statik denetim yalnız elle ya da `vt sinama` içinden,
tohum karşılaştırması yalnız elle `vt tohum --denetle`, ortam dosyası
kontrolü hiç. Tohum karşılaştırması `vt sinama` KR-04 ile aynı şey
değildir: KR-04 betiği veritabanıyla karşılaştırır, bu kontrol betiği
kaynak JSON'la — kaynağı düzeltip betiği yeniden üretmeyi unutmak
KR-04'ten sessizce geçiyordu.

Yorumlar altıncı ve on ikinci kontrolün dışında; oralarda firmanın iş
kuralını anlatan gerekçeler var. Sorun bulursa çıkış kodu 1.

**bayi ≠ servis.** Bayi makineyi satan firma: kaydı var, paneli yok.
Servis işi yapan taraf: hesabı ve mobil uygulaması var. `src/servis/`
içinde `bayi` kelimesi geçmez; `bayileriGetir` gibi adlar ise gerçekten
bayi varlığını yönettiği için yerinde kalır. Tek istisna
`src/lib/servisAtama.js` — adı `servis` ile başlıyor ama servis
uygulamasının dosyası değil, makine → bayi → servis köprüsü.

Bazı CSS token'ları **bilerek** ayrı (backoffice'te beyaz yazı için koyu
ton gerekiyor). Bunlar `tools/dogrula.mjs` içinde gerekçesiyle listeli —
eklemeden önce `backoffice.css`'teki ölçüm gerekçesini oku.

## Kod grafiği

- Projede `codebase-memory` kod grafiği bulunur.
- Kod grafiği, fonksiyonları ve aralarındaki çağrı ilişkilerini tutar.
- Böylece büyük dosyaları baştan sona okumak yerine doğrudan ilgili bölüme gidilebilir.
- Claude, kod grafiğini MCP üzerinden kullanır.
- Codex, kendi kipinde MCP araçlarını kullanamaz; araç çağrıları onay ister ve başarısız olur.
- Codex için komut satırı yolu kullanılır: `npm run graf`
- Örnek kullanımlar:

```bash
npm run graf -- search_graph --query "tema uygula"
npm run graf -- trace_path --function-name "paksan-connect.src.components.TemaSecici.temayiUygula" --direction inbound
npm run graf -- get_architecture
```

- `--direction` yalnızca `inbound`, `outbound` veya `both` değerlerini kabul eder.
- Aynı isim birden fazla yerdeyse araç tam nitelikli ad ister.
- Tam nitelikli ad, önce `search_graph` kullanılarak bulunur.
- Codex'e iş devredilirken brief içinde `npm run graf` komutunun kullanılacağı belirtilir.
