# PAKSAN Connect

Tarım makineleri üreticisi PAKSAN Makina için React 19 + Vite 6 + Capacitor 8
mobil uygulama, artı ayrı derlenen bir "backoffice" (personel paneli). Kod
tabanı ~170 dosya / ~41.000 satır (`src/`). Kullanıcı geliştirici değil —
uygulama içi tüm metin ve yorumlar sade Türkçe.

## Yapı

- `src/screens/` — müşteri uygulaması ekranları (24 dosya)
- `src/backoffice/` — personel paneli, `ekranlar/` alt klasöründe ekranlar (22 dosya ve `rapor/`)
- `src/components/` — paylaşılan bileşenler
- `src/marka/` — firmaya ait her şey: kimlik, logo, renkler, ürün kataloğu, servis listesi, fiyatlar, kılavuz paketi. Motor buraya yalnızca `src/marka/index.js` kapısından bakar (bkz. MARKA-DEVIR.md)
- `src/data/` — ülkeye ve motora ait statik içerik: il listesi, KVKK metinleri, talep alanları, duyuru türleri, yetki kataloğu
- `src/lib/` — yardımcı modüller (depolama, bildirim, PDF/Excel dışa aktarım)
- `src/i18n/` — `tr.js`/`en.js` (783 anahtar, eşit tutuluyor ama build'de zorlanmıyor; `npm run dogrula` 1. ve 2. kontrol) + `index.jsx`
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
  (bkz. CANLIYA-CIKIS.md). 25 Eylül 2026'dan beri Connect'in
  `index.html`'inde de aynı işaret var: Makine Kaydet'teki "DENEME"
  (örnek seriler) kutusu yalnız işaretli derlemede çıkıyor. İşareti tek
  yer okuyor: `src/lib/demoSurumu.js → demoSurumuMu` (Servisim'in
  `servis/demoKimlik.js`'i de ona bağlı). `npm run dogrula` 11. kontrol
  iki işareti de listeliyor.

Servis uygulaması kendi CSS kökünü açmaz, `backoffice.css` dosyasını paylaşır. `npm run dogrula` bu kuralı denetler.

İlk servis APK'sında `android-servis` klasörü henüz üretilmedi; ilk çalıştırmada oluşur.

## CSS — iki ayrı kök, elle senkron

`src/styles.css` (5141 satır) ve `src/backoffice/backoffice.css` (2311 satır)
kendi `:root` bloklarını ayrı ayrı tanımlıyor — **token'lar paylaşılmıyor**.
Renk değerleri (`--pk-blue`, `--tur-servis` vb.) iki dosyada da birebir aynı
olmalı, bu elle sağlanıyor. Bir renk token'ını değiştirirsen diğer dosyayı da
kontrol et.

Karanlık/aydınlık tema `data-tema='koyu'/'acik'` attribute'u ile uygulanıyor.

## Sınama altyapısı — ne var, ne yok

Çerçeve (vitest/jest/playwright) **yok** ve eklenmeyecek; hiçbir
otomasyon paketi kurulu değil. Buna karşılık dört şey var:

- **`npm run dogrula`** — 13 kontrol. 8. kontrol sekiz sınama betiğini
  ayrı süreçlerde koşturuyor (`tools/` altında). Kural: *bir sınama
  çağrılmıyorsa yoktur.*
- **Ekosistem sınaması** (`tools/ekosistem-sinamasi.mjs`) — üç
  uygulamanın PAYLAŞTIĞI veri katmanını Node içinde gerçekten
  çalıştırıyor: otuz altı akış senaryosu (AK-01…AK-36), talep açılışından
  hak edişin cariye yazılmasına kadar. Modüller Vite'ın
  `ssrLoadModule`'üyle yükleniyor, depo taklit ediliyor, saat donmuş,
  rastgelelik tohumlu, saat dilimi sabit (Europe/Istanbul; 0. adım
  denetliyor, UTC'de koşan makinede dilime bağlı kusur görünmez olurdu).
  Ayrıntısı betiğin başında.
- **Uygulama–veritabanı eşleme denetimi**
  (`tools/veritabani-eslesme-denetimi.mjs`, 21 Eylül 2026) — uygulama
  veritabanına henüz bağlı değil; yeni bir alan, veritabanında
  karşılığı olmasa da hata vermiyordu. Aynı senaryoları koşturup depoya
  düşen HER ALANI `veritabani/uygulama-eslesmesi.mjs` ile karşılaştırıyor.
  Eşlemesiz alan ya da anahtar, SQL betiklerinde olmayan sütun,
  eşlemesiz `veri.js` işlevi ve eşlemede iki kez yazılmış satır (ÇİFT
  SATIR, 25 Eylül 2026: nesnede ikinci satır birincinin notunu sessizce
  ezer) doğrulamayı düşürür. Karşılığı bilerek
  olmayanlar eşlemede `yok(gerekçe)` diye durur ve "bilinen boşluk"
  sayılır — sunucu aşamasının iş listesi. Senaryoların yazmadığı
  anahtarları göremez; onları "sınanmıyor" diye ayrı sayar.
  `--envanter` her alanın karşılığını basar.
- **Ekosistem ekran turu** (`tools/ekosistem-turu.mjs`) — üç uygulamanın
  **gezilebilir yüzeyinin tamamını** Chrome'da açıyor: envanter
  `tools/ekosistem/ekranlar.mjs` içinde (Connect 28, backoffice 17,
  Servisim 11; artı rol bazlı menü ve yetkisiz rolün Kayıtlı Makineler
  penceresi, başka sekmenin rol değişikliği, uygulamalar arası ispat,
  "gezinmek kayıt yazmıyor", Servisim açıkken gelen kayıt ve açık
  pencere, Servisim'in çift dokunuş kilidi (X-07), yüzen düğmenin
  dokunma kutusu, Connect'in beş ekran kararı (C-29…C-33: süren işte
  form yerine kart, "Sorun Devam Ediyor" yerine kart, kaldırılan talebi
  geri alma, DENEME kutusunun demo işareti, servissiz makinede form
  yerine kart) ve **on bir formun boş gönderimi**
  (`tools/ekosistem/formlar.mjs`) — toplam 82 denetim). Her ekranda
  üç soru: boş mu açıldı, hata verdi mi, ekili değer basılı mı.
  `--yalniz C-27,X-03` yalnız adı verilen denetimleri koşturur (bozma
  denemesi için; kapsam iddiası tam koşunun); bilinmeyen kod verilirse
  hiçbir şey koşturmadan 1 ile çıkar.
  Gidilemeyen ekran "ERİŞİLEMEDİ" diye AYRI sayılıyor; sessizce
  atlanmıyor. Yalnız ekilen değerleri arar (talep numarası, seri,
  tutar, ad), ekrandaki kelimelere bakmaz — Codex metinleri
  yenilediğinde kırmızıya dönmesin diye.

Geri kalanı elle: `tools/ekran-goruntusu.mjs` ve tarayıcıda ölçülen JS
(kontrast, taşma, dokunma hedefi). Veritabanı tarafının kendi koşumu
var: `npm run vt -- sinama`.

**Her senaryonun taşıdığı, bilerek bozularak gösterildi.** Bozma listesi
`tools/ekosistem-sinamasi.mjs` başlığında (tur adımlarınınki
`tools/ekosistem-turu.mjs`, eşleme denetimininki
`tools/veritabani-eslesme-denetimi.mjs` başlığında); yeni senaryo yazan
aynısını yapar. Hiç düştüğü görülmemiş bir sınama, hiçbir şey iddia
etmeyen sınamadan ayırt edilemez. Düşmeyen bozma da yazılır, nedeniyle
(25 Eylül 2026'da bir tane: iki kat kapının biri tek başına silinince
öteki tuttu).

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
servisin henüz atanmadığını ve PAKSAN'ın en kısa sürede atayacağını
söylüyor — müşteriden arama istenmiyor (21 Eylül 2026). Sözü tutan
backoffice: yan menüdeki **Kayıtlı Makineler** sayacı servisi olmayan
MAKİNELERİ sayıyor (`servisiAtanmamisKayitlar`), atama yalnız o
ekrandan yapılıyor. **Atama makine başına, müşteri başına değil**
(kullanıcının kararı): her servis her makinede uzman değil; aynı
müşterinin yem karmasına bir servis, balya makinesine başka bir servis
bakabilir. Connect de bunu makine başına gösterir (22 Eylül 2026): ana
ekranda her servis kendi kartında, baktığı makineyle; makine detayında
o makinenin servisi; servis talebi seçilen makinenin servisine gider,
servisi olmayan makine için gönderilmez (`servisAtama.js →
servisGruplari`, sınaması AK-02). Önce yalnız ilk bulunan servis
görünüyordu. Müşteriler ekranında atama yeri YOK — aynı gün denenip geri
alındı. Makinenin servisi değişince (atama ya da bayi değişikliği)
müşteriye Connect'te bildirim gider (`veri.js → makineAtamasiniKaydet`).

**BİR SERİ NUMARASI, DEFTERDE TEK SATIR** (21 Eylül 2026). Müşteri
makinesini silip yeniden ekleyince ya da servis Servisim'den kayıtlı
bir seriyle elle talep açınca yeni satır açılıyordu: makine iki kişide
görünüyor, en yeni satır PAKSAN'ın atadığı servisi gölgeliyor, servis
kendini atamış oluyordu. Artık yazan işlevler var olan satırı buluyor;
Servisim'in elle kaydı var olan makineye hiç dokunmuyor, talep yine
açılıyor (`lib/makineKaydi.js` başı, sınaması AK-18).

**KATALOG DEĞİŞİNCE GEÇMİŞ İŞLEM DEĞİŞMEZ** (22 Eylül 2026, kullanıcının
kararı). Talebin ve servis kaydının parça satırı kodu, adı, tutarı VE o
günkü görselin dosya adını (`gorsel`) kendi içinde taşır; ekranlar
bunları bugünkü katalogtan okumaz (`components/ParcaResmi.jsx`). Sunucu
görsel dosyasını hiç ezmez ve silmez; resmi değişen parça yeni adla
gelir (`sunucu-taklidi/fiyat-listesi-yayini.mjs`). Parça satırı yazan
yeni bir yol açan, bu alanı da yazar. Sınaması AK-19; veritabanı
karşılığı `VT-TASARIM-EKLERI.md` §4.

**İŞÇİLİK SÜREYLE YAZILIR** (22 Eylül 2026, kullanıcının kararı). Servis
garanti kaydında işçilik TUTARI değil, işe harcadığı SÜREYİ yazar
(yarım saat yazılabilir); tutar saat ücretinden hesaplanır. Kayıt o
günün ücretini de taşır (`saatUcreti`, 23 Eylül 2026'dan beri km için
`kmUcreti`): tarife değişince geçmiş hak ediş değişmez. `iscilik` alanı
tutar olarak kalır; rapor, cari ve hak ediş onu okur. PAKSAN düzeltmeyi
de süreyle yapar ve düzeltme kaydın kendi ücretiyle hesaplanır.
Sınaması AK-20.

**HİZMET ÜCRETİ VE PARÇA İSKONTOSU BACKOFFICE'TEN** (23 Eylül 2026,
kullanıcının isteği). İkisi de koddaki bir sabitti (`TARIFE`: 12 TL/km,
50 TL/saat; `PARCA_SERVIS_ISKONTO`: %30); sabitler artık yalnız
BAŞLANGIÇ değeri ve çalışırken değiştirilmez (tohum betikleri onları
okuyor). Ücret Servisler ekranında: genel, makine modeline göre ve
servise özel (servisin Düzenle penceresi); en özeli geçerli, sıra
servis+model > servis > model > genel, kalem kalem
(`lib/servisTarifesi.js`, gerekçe dosyanın başında). İskonto Yedek Parça
Kataloğu ekranında: genel ve servise özel (`lib/servisFiyat.js →
iskontoCoz`). Genel değer değişirken özel değeri olan servis varsa
pencere onları adıyla listeleyip "onlar da değişsin mi" diye soruyor;
evet denirse yalnız DEĞİŞEN kalemin özel değeri kalkar. İki ayrı yetki:
`servisUcreti`, `servisIskontosu`. Ücret servis kaydına
`servisKaydiGonder`'de, oran siparişe `servisParcaSiparisi`'nde yazılır
(onayda görülen değer, aşağıda). Değeri gerçekten değişen servise
Servisim'de talebe bağlı olmayan bildirim gider (`tur: 'hesap'`);
Servisim Hesap'ta "Ücretlendirmeler", Hak Ediş'te tek satırlık özet, sipariş
ekranında indirim şeridi ve özet satırı gösterir. Servis ekranında
"iskonto" yazmaz, "indirim" yazar. Connect'te karşılığı yok: ücret ve
iskonto PAKSAN ile servis arasında. Sınaması AK-21, AK-22; veritabanı
karşılığı `VT-TASARIM-EKLERI.md` §5, §6.
İki kart da kapalı açılıyor (kullanıcının isteği, aynı gün): başlıkta
genel değer ve özel değerli servis sayısı okunuyor, gerisi
"Ayrıntıları Göster" ile (`ekranlar/ortak.jsx → AcilirTepe`).
Servis listesinde "Özel Ücret" süzgeci var (24 Eylül 2026): yalnız
makine modeline göre özel ücreti olan servis de "özel" sayılır.

**BAKİYEDEN ÖDEMEDE EK İSKONTO** (24 Eylül 2026, kullanıcının isteği).
Servis parça siparişini "Bakiyemden Düşülsün" ile öderse servis
iskontosuna EK bir oran uygulanır. Tek genel oran:
`parcaIskontosu.bakiye`, başlangıç `BAKIYE_EK_ISKONTO = 0` (personel
girene kadar kapalı); Yedek Parça Kataloğu → Servis iskontosu kartının
ikinci kutusu, yetkisi `servisIskontosu`. Tutar tek yerden:
`lib/servisFiyat.js → siparisTutari` — servis iskontolu KDV hariç ara
toplamdan düşülür, KDV ondan sonra; satır fiyatları değişmez. "Bakiye
yeter" indirimli toplama bakar. Oran siparişe yazılır
(`parcaFiyat.bakiyeIskontoOrani`, `bakiyeIskontoTutari`);
`servisParcaSiparisi` faturalı siparişin bu indirimi taşımasını
reddeder. Oran değişince her servise bildirim gider (`olay:
'bakiyeIskonto'`). Servisim: seçenekte rozet, özet ve onayda satır,
Ücretlendirmeler'de kutu, sipariş detayında satır; oran sıfırken
hiçbiri görünmez. Sınaması AK-23; veritabanı `VT-TASARIM-EKLERI.md` §8.

**ONAYDA GÖRÜLEN TUTAR BAĞLAYICI** (24 Eylül 2026, kullanıcının kararı:
"sipariş verildiği zamanki tutar üzerinden ücretlendirilmeli müşteri
veya servis"). Servisim parça siparişinde ve servis kaydında tutarı onay
penceresi açılırken yeniden okur; pencerede görülen tutar kaydedilen
tutardır. PAKSAN iskontoyu ya da ücreti tam o sırada değiştirse de
servisin onayladığı geçer. Önce tersiydi: sipariş eski oranla
reddediliyor, hak edişte ekranın ücreti sessizce bugünküyle
değiştiriliyordu. Sınır: bugünküyle tutmayan değer yalnız okuma anı
(`parcaFiyat.fiyatZamani`, `servisKaydi.ucretZamani`) 30 dakikadan
yeniyse VE değer o anda gerçekten geçerliyse geçer; yoksa gönderim
kaydedilmez, ekran yeni tutarı gösterir (`lib/servisFiyat.js →
ONAY_TUTAR_SURESI`, `onayTazeMi`; o anın değeri `veri.js →
okunduguAnkiIcerik`, oranın ve ücretin son 30 dakikalık geçmişinden:
`panelIcerik.ucretGecmisi`). Connect'in
parça talebi zaten müşterinin gördüğü fiyatla kaydediliyor. Aynı gün:
yeniden kapatılan bakiye siparişi cariden ikinci kez düşülmüyor
(`talepKapat`, talep kimliğiyle — numara tekil değil). Sınaması AK-21
(11), AK-22 (3), AK-23 (5-10); sunucu tasarımı — süreli fiyat teklifi —
`VT-TASARIM-EKLERI.md` §9, orada karar bekleyen dört madde de var.

**EKSİK GÖNDERİLEN SERVİS SİPARİŞİ** (24 Eylül 2026, kullanıcının
kararı). Backoffice kapanış formunda sipariş kalemleri işaretli
geliyor; personel stokta olmayan parçanın işaretini kaldırıyor.
Bakiyeden ödenen siparişte servisin bakiyesinden yalnız gönderilenlerin
tutarı düşülüyor (sipariş anındaki satır fiyatı, siparişin ek
iskontosu, KDV; `lib/servisFiyat.js → gonderilenTutar`). Kalan parça
talepte bekliyor, "Kalan Parçaları Gönder" ile gidiyor ve tutarı o gün
düşülüyor. Deftere hep fark yazılıyor (`veri.js → siparisBorcunuYaz`):
düşülenlerin toplamı siparişin toplamına eşit, yeniden kapanış ikinci
kez düşmüyor. Gönderimler talepte `gonderimler`; hangi satırın beklediği
`lib/servisKaydi.js → siparisGonderimi`. Servisim sipariş ayrıntısında
gönderilmeyen parçayı ve ne olacağını gösteriyor; servise kısmi ve
kalan gönderim için ayrı bildirim gidiyor. Sınaması AK-24; veritabanı
`VT-TASARIM-EKLERI.md` §9.

**SİPARİŞİN TUTARI HER EKRANDA KDV DÂHİL** (24 Eylül 2026, kullanıcının
bildirdiği hata). Servisim'in sipariş listesi ve backoffice'in "Sipariş
tutarı" satırı kaydın `tutar` alanını (KDV HARİÇ) gösteriyordu, bakiyeden
düşülen KDV dâhil tutardı; iki ekran birbirini tutuyor, hak ediş ikisini
de tutmuyordu. Tutar gösteren her yer `lib/servisFiyat.js →
siparisToplami`'yi çağırıyor; KDV hariç rakam yalnız dökümde, adıyla.
"Ne kadar düşüldü, ne kadar kaldı" tek yerden: `veri.js → siparisHesabi`
(Servisim sipariş detayı ve Hak Ediş yaprağı, backoffice sipariş dökümü).
Borç hareketi hangi gönderimin karşılığı olduğunu taşıyor (`gonderimNo`).
Backoffice'te servis siparişinin parça tablosu tutarlı
(`ParcaTablosu tutarli`). Sınaması AK-25.

**SERVİS SİPARİŞİNİN İPTALİ VE İADE** (24 Eylül 2026, kullanıcının
kararı). Servis kendi siparişini Servisim'den YALNIZ "Yeni" iken iptal
ediyor (`servisSiparisiniIptalEt`, durumu depodan yeniden okuyarak);
işleme alınmışsa backoffice iptal ediyor, kapanmış (gönderilmiş) sipariş
de formdan geçiyor. İptalde bakiyeden düşülmüş NET tutar tek alacakla
geri yazılıyor (`siparisIadesiniYaz`, hem `talepIptal` hem durum
düğmesi); faturalı siparişte uygulama para yazmıyor, iade faturası
LOGO'da. Aynı gün: gönderilmeyi bekleyen bakiye siparişleri bakiyeden
AYRILIYOR, yeni bakiye siparişi kullanılabilir kısma bakıyor
(`bakiyeDurumu`; Servisim seçeneği ve `servisParcaSiparisi`). Sınaması
AK-25; veritabanı `VT-TASARIM-EKLERI.md` §9.

**KALAN PARÇALARIN İPTALİ** (24 Eylül 2026, kullanıcının onayı).
Kısmen gönderilmiş siparişin bekleyen kalemleri backoffice'ten "Kalan
Parçaları İptal Et" ile siparişten çıkıyor; gönderilenler yerinde,
siparişin tamamını iptal etmek gerekmiyor (`veri.js →
kalanParcalariIptalEt`, talepte `kalemIptalleri`). Bekleyen kalemin
borcu henüz yazılmadığı için cariye bir şey yazılmıyor; siparişin
ödenecek tutarı iptal edilen pay kadar iniyor: `siparisHesabi` →
`iptalEdilen`, `net` (`lib/servisFiyat.js → siparisNetTutari`).
Genel toplam siparişin ilk hâli olarak kalıyor, iptal edilen pay ve
yeni tutar altında ayrı; Servisim'in sipariş kartı yeni tutarı
gösteriyor. Servise bildirim `kalanIptalEdildi`. Sınaması AK-26;
veritabanı `VT-TASARIM-EKLERI.md` §9.

**ORTAK DEPO VE ESKİ EKRAN** (24 Eylül 2026, kod okunarak bulunan dört
hata). (1) Connect'te yeni telefonla kayıt, telefonu devralan önceki
kişinin kayıtlarını görmesin diye ORTAK depoları (talepler, bildirimler,
destek, geri bildirim, numara talepleri) siliyordu; artık silmiyor,
talep listesi hesaba göre süzülüyor ve talep açanın kimliğini taşıyor
(`lib/musterininTalepleri.js → gorunenTalepler`, 25 Eylül 2026'ya kadar
`context/AppState.jsx`'teydi; `lib/talepOlustur.js`).
(2) Connect her değişiklikte bellekteki eski talep listesini depoya
yazıp başka uygulamanın değişikliğini geri alıyordu; artık depodaki
listenin üstüne yazıyor (`requestsGuncelle`). (3) Backoffice'te para
ya da durum değiştiren işlevler kararı ekrandaki kopyadan veriyordu
(aynı hak ediş iki kez onaylanabiliyordu); artık depodaki kayıttan
(`veri.js → guncelTalep`). (4) Servisim'de şifre değişince oturum
yanlış depoya yazılıyor, yenilemede şifre ekranı dönüyordu. Sınaması
AK-28.

**TALEPLER'DE GÖRÜNEN DURUM** (24 Eylül 2026, kullanıcının isteği).
`parcaBekliyor` ekranda iki ad: "Parça Hazırlanıyor" (gönderim yok) ve
"Parça Yolda" (gönderim var). Rozet, süzgeç, sıralama, Excel ve geçmiş
aynı işlevden okuyor: `veri.js → gorunenDurum`, `gecmisDurumu`,
`GORUNEN_DURUMLAR`. Süzgeç iki gruplu ("Dikkat isteyenler", "Duruma
göre"); seçili türde oluşmayan durum listede çıkmıyor. Kod değişmedi.

**SERVİSİM BİLDİRİM GEÇMİŞİ** (24 Eylül 2026, kullanıcının isteği):
üst çubukta "Bildirimler" (okunmamış sayısıyla), ekranı
`servis/ekranlar/Bildirimler.jsx` — talep ve hesap bildirimleri ile
duyurular tek listede, Connect'teki gibi günlere göre. İşlerim'deki
okunmamış bölümü duruyor.

**ELLE KAYITTA SERİ YOKSA MODEL VE TAHMİNİ YIL** (24 Eylül 2026,
kullanıcının kararı): seri ya yazılıyor ya da "Seri Numarası Yok"
seçilip model ve tahmini üretim yılı giriliyor (`makine.seriYok`,
`makine.tahminiYil`); makinesiz talep açılmıyor. Servis kaydı böyle bir
talepte seriyi bir daha sormuyor, yerinde "Yok" yazıyor (aynı gün,
kullanıcının bildirdiği hata; `lib/servisKaydi.js → eksikAlanlar`).
Servis ekranlarında makinenin numarası "Seri Numarası" diye geçiyor,
"şase" değil (kullanıcı: "seri numarası zaten doğrusu"). Sınaması
AK-27; veritabanı `VT-TASARIM-EKLERI.md` §10.

**CAPACITOR 8** (24 Eylül 2026): Google Play'in hedef API 36 şartı.
İki Android projesi compileSdk/targetSdk 36, minSdk 24, AGP 8.13,
Gradle 8.14.3, Java 21. Uygulama ekranın tamamına çiziliyor
(edge-to-edge): güvenli alan payları önce Capacitor'ın
`--safe-area-inset-*` değişkeninden, sistem çubuğu simgelerinin rengi
temaya göre (`lib/sistemCubuklari.js`).

**PARÇA KARTI ORTAK** (24 Eylül 2026, kullanıcının isteği): Connect'in
yedek parça talebindeki parça seçimi Servisim'inkiyle aynı büyük
görselli kartları ve montaj listesini kullanıyor. Kart
`src/components/ParcaKarti.jsx`'te; `src/servis/ParcaKarti.jsx` onu
Servisim'in "Görsel yok" yazısıyla saran ince bir kabuk. Connect servis
kodunu içe aktarmıyor (`npm run dogrula` 4. kontrol); CSS iki kökte
ayrı (`styles.css` Connect'in token'larıyla).

**DUYURU HEDEFLEMESİ İKİ TARAFA DA** (23 Eylül 2026, kullanıcının
isteği). Geri Çağırma yeni duyuru için kaldırıldı (eski kayıtlar doğru
adla görünüyor, okuma tarafındaki "yalnız servise" kapısı duruyor);
kalan türler tek "Bildirim Tipi" başlığı altında. Bölge, makine (model
ya da seri numarası) ve servis süzgeçleri formda açık ve iki alıcıya da
uygulanıyor: müşteride servis süzgeci makinesine bakan servise, serviste
makine süzgeci baktığı makinelere, bölge servisin hizmet illerine
bakıyor. Makine ve servis aynı makinede aranıyor. Kural
`lib/duyuruHedef.js` başında; bağlamı `lib/servisAtama.js` veriyor
(`makinelereServisEkle`, `servisDuyuruBaglami`) — Connect ve Servisim
duyuru süzerken bu ikisini çağırmalı. Sınaması AK-09; veritabanı
karşılığı `VT-TASARIM-EKLERI.md` §7. Bölge, makine ve servis kutuları
kapalı açılıyor (24 Eylül 2026); başlıkta seçimin özeti yazıyor.

### 25 Eylül 2026 kullanıcı sınamasının düzeltmeleri

Dört kullanıcı ajanının ilk turu (rapor
`tools/kullanici-sinamasi/raporlar/2026-09-24-ilk-sinama.md`) beş
yüksek, on orta ve on beş düşük bulgu ile dört tasarım sorusu çıkardı;
hepsi düzeltildi. Kullanıcının kararı: "Rapordaki tüm bulguları
ekosistemin akışına ve mantığına uygun olacak şekilde düzelt." Aşağıda
konu konu; her birinin sınaması yanında, bozularak düştüğü gösterildi
(`tools/ekosistem-sinamasi.mjs` ve `tools/ekosistem-turu.mjs`
başlıkları). Yeni ekran metinleri TASLAK, Codex'i bekliyor
(`CODEX-BEKLEYEN.md`).

**TALEBİN MÜŞTERİSİ TEK YERDEN** (Y3). "Bu kayıt bu müşterinin mi"
sorusunun tek cevabı `lib/musteriEslesmesi.js` (`musterininMi`,
`talepSahibiBulucu`): (a) servisin kendi parça siparişi hiçbir müşterinin
değil, (b) kayıtta `musteriId` varsa yalnız o hesabın, (c) yoksa ülke
kodlu numarayla, yazılıştan bağımsız ("532…", "0532…", "+90 532…" aynı).
Backoffice'in müşteri kartı, "Aktif diğer talepler"
(`veri.js → musterininDigerTalepleri`), bildirim alıcısı, Müşteriler
raporu ve Connect'in talep listesi (`lib/musterininTalepleri.js →
talepHesabinMi`) bu kurala bakıyor; önce dört ayrı kopya vardı, dördü de
talepteki kimliğe bakmıyordu. **BİLİNÇLİ İSTİSNA: servisin elle açtığı
kimliksiz iş** (`elle: true`, `musteriId` yok). Müşteri kartı ve rapor onu
numarayla müşteriye bağlıyor — PAKSAN o müşteriyle ilgili her işi
görmeli. Connect ise bağlamıyor: listede göstermiyor (telefonu bilen
biri başkası adına açılmış işin ayrıntısını görmesin) ve bildirimini
yazmıyor (`veri.js → bildirimAlicisi`: müşteri açamayacağı bir talebin
bildirimini almasın). İstisna da tek yerde: "bu kayıt HESABIN mı"
sorusu (Connect listesi, bildirim alıcısı, numara değişikliği, hesap
birleştirme) `musteriEslesmesi.js → hesabaBaglanirMi`'ye bakıyor (25 Eylül
2026 akşamı; önce her çağıranda ayrı yazılıydı ve hesap birleştirme onu
unutup elle işi yeni hesaba taşıyordu). Numara değişikliği onaylanınca eski
numarayla açılmış kimliksiz Connect talepleri ve görüşler hesaba bağlanıyor,
elle açılanlar bağlanmıyor (`numaraTalebiKarar`); seri çakışmasıyla hesap
birleşince de elle iş taşınmıyor. Görüş (geri bildirim) hesabın kimliğini
taşıyor; cevabı numara değişse de o hesaba gidiyor. Sınaması AK-30, AK-07,
AK-12, AK-32.

**TELEFON TEK BİÇİMDE** (düşük bulgu). Aynı müşteri ekranlarda üç
biçimde görünüyordu. Kayıtta ham numara sıfırsız, ülke kodsuz rakam
(`lib/tel.js → telHamYap`), ekranda "+90 532 111 22 33"
(`telGoster`, `kayitTelGoster`), arama bağlantısı ülke kodlu
(`kayitTelHref`); servisin siparişindeki numara firma biçiminde
(`telFirma`). Connect talebi, Servisim'in elle kaydı ve servis
kaydının tamamladığı numara aynı biçimi yazıyor. Sınaması AK-30.

**SERVİS SİPARİŞİ MÜŞTERİYE BİLDİRİM YAZMAZ** (Y4). Siparişin telefonu
servisin numarası; o numara bir Connect hesabıyla eşleşince PAKSAN'ın
siparişteki her işlemi o hesaba "talebiniz…" diye yazılıyor, backoffice
"müşteriye bildirim gitti" diyordu. Servis siparişinin müşteri alıcısı
yok (`bildirimAlicisi` ve `musterininMi`: iki kat kapı). Alıcısı
çözülmeyen bildirim artık HİÇ yazılmıyor (`musteriyeBildir`; önce
kimliksiz yazılıp kimseye gösterilmiyordu, veritabanı da kabul etmiyor:
CK_bildirim_Bildirim_Alici). Ekranların "bildirim gitti / gidecek"
cümlesi yazan kuralla aynı yerden (`veri.js → bildirimAlicilari`).
Alıcısız cümle backoffice'te ve Servisim'de aynı: "Talep müşterinin
uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek"
(taslak). Sınaması AK-29, AK-07.

**KARGO KAPANIŞIN İÇİNDE** (düşük bulgu). Müşterinin parça talebinde
takip numarası kapanış formunda soruluyor; personel onu ayrı bir
"müşteriye not"la göndermiyor, çiftçiye art arda iki bildirim düşmüyor.
Değer talebin `parcaSevk` alanına yazılıyor (`cozum`'a değil) ve tek
kapanış bildirimi onu taşıyor (`veri.js → talepKapat`). Servis
siparişine kargo yazılmıyor: gönderimi bölünebiliyor, kargo gönderim
başına ayrıca tasarlanacak; Servisim'in "sipariş gönderildi" yazısı bu
yüzden kargo takibi vaat etmiyor. Sınaması AK-04, AK-29.

**ATAMA BİLDİRİMİ MAKİNENİN GÜNCEL DURUMU** (düşük bulgu). Yanlış atama
düzeltilince çiftçinin listesinde iki servis adı kalıyordu. İlk atama
"atandı", değişiklik "değişti", servisi kalmayan makine "yeniden
belirleniyor" diyor (`veri.js → makineAtamasiniKaydet`); Connect aynı
makinenin yalnız SON atama bildirimini gösteriyor (`lib/bildirimler.js →
sonAtamaBildirimleri`). Sınaması AK-18 (7, 8).

**ELLE İŞ ATAMA DIŞIYSA İŞARET, ENGEL DEĞİL** (Y5, kullanıcının kararı:
uyar, engelleme). Servisim'in "Kayıt Aç" işi hep açan servisin adına
yazılıyor, makine başka servise atanmışsa kimse bilmiyordu. Kayıt artık
tek gövdeden (`lib/elleTalep.js → elleTalepKaydiOlustur`; ElleKayit ve
sınama aynısını çağırıyor): makine başka servisteyse, servissizse ya da
seri yoksa talebe `atamaDisi` (`durum` baskaServis / atanmamis /
seriYok, `servisId`, `servisAd`, `kaynak` atama / bayi) yazılıyor
(`lib/servisAtama.js → elleIsinAtamasi`). Servis uyarıyı görüyor;
backoffice listede ve ayrıntıda işaretliyor, hak edişi onaylayan
personel pencerede görüyor; ödeme işi açan servise. Kayıt ve onay
işareti silmiyor. Connect'in talep ayrıntısı işi yürüten servisi,
makinenin kendi servisi değilse "Servisiniz" diye göstermiyor
(`makineninKendiServisiMi`). **DEFTER AYRIMI:** Servisim'in açtığı
makine satırı makineye servis ATAMIYOR; kaydeden servis
`kaydedenServisId`'de (`lib/makineKaydi.js → servisMakineKaydi`).
Makine PAKSAN atayana kadar servissiz sayılıyor; çiftçi o zamana kadar
Connect'ten servis talebi açamıyor. Sınaması AK-31, AK-16, AK-18.

**AYNI MAKİNEDE İKİNCİ SERVİS TALEBİ** (O5). "Açık" iki anlamda, tek
dosyada (`lib/makineTalepleri.js`): `acikServisTalebiMi` onay bekleyen işi
de sayıyor (ödenmedi) — backoffice'in "makinede başka açık iş" işareti;
`isSurenServisTalebiMi` saymıyor (iş bitti, servis orada devam edemez) —
Connect'in engeli ve Servisim'in "bu makinede açık işiniz var" kartı.
Connect aynı makinede işi süren talep varken ikinci talebi açtırmıyor,
çiftçiyi o talebe ekleme penceresine götürüyor (formdaki açıklama, Destek
özeti dahil, pencerenin notuna taşınıyor). Kapanmış talebin "Sorun Devam
Ediyor"u da aynı makinede başka iş sürerken talebi yeniden açmıyor,
yerinde aynı kart (`sorunDevamEngeli`). Servisim'in kartı servisin
PAKSAN'a devrettiği işi "açık işiniz" saymıyor, "başka açık talep"
sayıyor (`servisinMakinedekiIsleri`). Sınaması AK-31, AK-32; ekranda
C-29, C-30.

**CONNECT FORMLARI VE TALEPLERİM** (Y1, Y2, O4, O9, O10 ve düşükler).
Fiyat teklifi makine taşımıyor (`lib/talepOlustur.js`; eski kayıt okurken
ayıklanıyor: `lib/talep.js → makinesizTeklif`). Seri numarası model
kodu, dört haneli yıl ve beş haneli sıra olarak denetleniyor; yazımdaki
O ve I rakama çevriliyor, model kodu çevrilmiyor (`lib/serial.js →
validateSerial`, `seriDuzelt`). Servis talebinin yeri makinenin son
servis adresinden öneriliyor (`makineninSonServisAdresi`) ve talep
ayrıntısında görünüyor; onayda hesaba yalnız BOŞ olan yazılıyor, dolu
hesap yeri makinenin yeriyle değişmiyor (`lib/talepOlustur.js →
hesabaIslenecekKonum`). Talepler Profil'den kendi ekranına taşındı
(`/taleplerim`, `screens/Taleplerim.jsx`); listeden kaldırılan talep
"Listeden Kaldırdıklarım"dan geri alınıyor; gizleme yalnız kapalı talebi
saklıyor (PAKSAN yeniden açarsa listede). Parçada `planlandi`
"gönderim günü" diye okunuyor (`lib/talep.js → musteriDurumAnahtari`,
hatırlatma da). "DENEME" kutusu yalnız demo derlemesinde (yukarıda,
Servis tarafı). Boş görüşte görünür uyarı; ana ekran sayaçları
Taleplerim'e götürüyor. Sınaması AK-32; ekranda C-27, C-28, C-31,
C-32, F-11.

**SERVİSİM EKRANLARI** (O1, O3 ve düşükler). Sipariş başarı ekranı
listedeki kartın rakamını gösteriyor (`lib/servisKaydi.js →
siparisOzeti`: kalem, adet, KDV dâhil tutar). "Bakiyemden Düşülsün"
pasifken nedeni yazıyor; kural reddin kuralı (`lib/servisFiyat.js →
bakiyeYetmiyor`). Ekranlar açık kaldıkça depodaki değişikliği
gösteriyor: açık talep kimlikle tutuluyor, depo dinleyicisi tek
(`ServisPanel.jsx`). Talebin durumu değişince açık pencere (randevu,
iptal, "Talebi Kapat") kapanıyor; servisin kapanmış ya da iptal edilmiş
işe yazımını veri katmanı da reddediyor (`veri.js →
servisinKapaliIsEngeli`: talepPlanla, talepKapat, talepDurumDegistir,
talepIptal; backoffice'in yetkili çağrısı bu kapıdan geçmiyor). Sınaması
AK-28; ekranda X-06. İşlerim rozeti yalnız el sürülmemiş işi sayıyor
(`servis/isDurumu.js → yeniIsSayisi`); 48 saati geçen iş "Yeni"de başta,
kartında etiketli, şeride dokununca açılıyor (`yeniIsSirasi`). Yüzen
düğmenin dokunma alanı görünen haptan her yönde geniş
(`servis.css → .uyg__fab`). Hak Ediş'in ücret özeti makineye göre farklı
ücreti de söylüyor. Kalem iptali bildirimi parça adedini ve kalem
sayısını ayrı taşıyor (`satirlarinAdedi`). "Parçayı Taktım"a ayrı teslim
adımı eklenmedi (karar). Sınaması AK-17, AK-25, AK-26; ekranda S-10,
X-03, X-04, X-05.

**SAATSİZ RANDEVU** (düşük bulgu: saati girilmeyen randevu 03:00
görünüyordu). Servisim randevuda yalnız günü soruyor; kayıt o günün
YEREL başı ve `saatBelirtildi: false` (`lib/tarih.js → gunlukRandevu`),
backoffice planı `true`. Alanı olmayan eski kayıt geriye dönük kuralla
okunuyor (`randevuSaatliMi`). Connect'in hatırlatması saatsiz randevuyu
gün sonuna kadar tutuyor. Veritabanında talep.Randevu.SaatBelirtildi.
Sınaması AK-15 (sınama Türkiye saatinde koşuyor).

**OTURUM SEKMEYE AİT** (O6). Backoffice oturumu bütün sekmelerde
ortaktı: yenilenen sekme başka personelin kimliğine geçiyordu. Artık
sekmenin oturumu oturum deposunda, son giriş kalıcı depoda (yeni sekme
bir kez devralıyor). Oturum her okumada personel kaydına bağlı: rol ve ad
kayıttan, kapatılan ya da silinen personelin oturumu düşüyor, başkasının
son girişine dokunulmuyor; işlem kaydı bu sekmenin kişisinin GÜNCEL rolünü
taşıyor (`islemYaz` rolü personel kaydından okuyor; oturumsuz sekmede son
girişin rolü yalnız aynı kişinin işlemine yazılıyor). Aynı sekmede kendi
hesabını değiştiren personelin oturumu da yeniden okunuyor (`tazele`).
Çıkış bu sekmenin oturumunu ve son giriş kendisininse onu siliyor, aynı
kişinin öteki sekmelerini kapatıyor
(`BroadcastChannel`); paneli kapatılan servisin oturumu da düşüyor
(`servisOturumuGetir`). Backoffice'e bir kez yeniden giriş gerekebilir.
Sınaması AK-33.

**BAŞKA SEKMENİN DEĞİŞİKLİĞİ YENİLEMEDEN** (O7). Rol, ücret ve iskonto
başka sekmede değişince bu sekme eski hâli gösteriyordu. Tek düzenek:
`lib/storage.js → baskaSekmeDegistirince`; `lib/icerikDeposu.js` belleği
boşaltıyor, Backoffice.jsx ve ServisPanel.jsx ekranı tazeliyor. Sınaması
AK-33; ekranda B-SEKME, X-03, X-04.

**DURUM KİLİDİ VE NEDENİ** (O8). Kapanmış talepte ve gönderilmiş servis
siparişinde durum çipleri `talepGeriAc` iznine bağlı; kilidin nedeni tek
işlevden (`veri.js → durumKilidi`) ve ekranda yazıyor, çipe basınca
"hiçbir şey olmuyor" değil. Sınaması AK-08.

**PARÇA YOLDAYKEN İŞ YEDEK PARÇADA** (O2). Takip numarası girilince iş
yedek parça rolünün listesinden düşüyordu. Parça yolda kaldıkça listede
(`rolunTalepleri`, üçüncü kapı); yanlış takip numarası sonradan
düzeltiliyor — karar depodaki kayıttan, ilk gönderimin tarihi ve
personeli korunuyor, servise "kargo bilgisi değişti" gidiyor
(`servisParcasiGonderildi`); parça takılınca kargo girişi reddediliyor.
Sınaması AK-03, AK-08.

**HAK EDİŞ REDDİ KESİN** (tasarım sorusu, karar). Ret talebi kapatıyor;
ret penceresi bunu söylüyor ve düzeltilebilir sorun için "Düzelt"e
yönlendiriyor. Servisin açık kalmış eski kayıt ekranı reddedilen işe
kayıt gönderemiyor (`servisKaydiGonder` kapanmış talebe yazmıyor).
Sınaması AK-28 (7).

**MAKİNEYE SERVİS ATAMA AYRI YETKİ** (tasarım sorusu, karar):
`makineAtama`. `servisDuzenle` artık servis kaydı, bölgesi ve hesabı.
Varsayılan: Yönetici, Satış ve Servis atıyor; Yedek Parça atamıyor
(Satış'ın `servisDuzenle`'si olduğu gibi kaldı). Depodaki eski rol bir
kez taşınıyor: `servisDuzenle` taşıyan rol `makineAtama`'yı alıyor
(`veri.js → rolIzinleriniTasi`, `izinSurumu` 3); personelin sonradan
kaldırdığı izin geri gelmiyor. Varsayılan liste izni kendisi taşıyor,
çünkü veritabanı tohumu (B03) listeyi taşımasız okuyor. Kayıtlı
Makineler yetkisiz rolde atama kartını ve bölümünü göstermiyor, nedenini
yazıyor. Sunucu aşamasında `servisDuzenle`'si olan rollere `makineAtama`
yazan bir geçiş satırı gerekecek. Sınaması AK-08; ekranda B-ROL.

**DEMO KAYDI MAKİNEYE UYUYOR** (düşük bulgu: rotovatörde "düğüm
atmıyor", garantisi bitmiş makinede "garanti kapsamında", Süper 8002E'de
Yunus parçası). Demo makinenin ailesine, modeline ve garantisine göre
üretiliyor (`backoffice/demoMakineAilesi.js`; marka sabitleri
`PARCA_ADINDAKI_MODEL`, `GRUBUN_MODELLERI`, bugün yalnız demo okuyor) ve
gerçek akışın yazacağı biçimde yazıyor: telefon ve `musteriId`, saatsiz
Servisim randevusu, elle işte kuralla `atamaDisi`, serinin yılı. Açık
işi uygun boş makineye koymaya çalışıyor (yer kalmazsa aynı makineye
düşebilir; kural değil tercih), talep numarası tekil, randevunun işi tek
yerden (`lib/talep.js → RANDEVU_ISI`). `demoTemizle` demo talebine bağlı
cari ve bildirim satırlarını da siliyor. `DEMO_SURUMU` 5: tarayıcıdaki
demo bir kez yeniden kuruluyor. Sınaması AK-34 (demoyu üç tohumla
gerçekten kuruyor, depoyu BİLEREK boşaltmıyor: eşleme denetimi demonun
yazdığını görmeli; demo damgası eşlemede `yok`); canlıda
`tools/kullanici-sinamasi/tutarlilik.js` D1-D3.

### 26 Eylül 2026 ikinci kullanıcı sınamasının düzeltmeleri

Aynı dört ajanla ikinci tur (rapor
`tools/kullanici-sinamasi/raporlar/2026-09-26-ikinci-sinama.md`): ilk
turun bulguları düzelmiş görüldü; bir yüksek, dört orta ve on iki düşük
yeni bulgu çıktı, üçü yanlış alarm (sekmenin sıcak yenilemeden bozulması,
küçük tarayıcı panelinde koordinat, ölçümün arşivi saymaması). Hepsi
düzeltildi; iki tasarım sorusu 28 Eylül'de karara bağlandı (aşağıda).

**YENİDEN AÇILAN İŞTE GEÇEN ZİYARETİN KAYDI** (Y1). "Sorun Devam
Ediyor" talebi açıyor, son servis kaydı yerinde kalıyor; Servisim onu bu
ziyaretinmiş gibi okuyordu: kayıt formu geçen ziyaretin yapılan işi, km'si
ve süresiyle doluydu, parça isteği o değerlerle yazıldı, "Parçayı Taktım"
eski km ve saatle hazır geldi, Randevu düğmesi yoktu, iş "Yeni"ye
düşmüyordu. Tek kural `lib/servisKaydi.js → buZiyaretinKaydi` (1. aşama
kaydı hep bu ziyaretin, bitmiş kayıt yalnız talep onu izleyen bir
durumdaysa); form, Randevu ve "Yeni" sekmesi ona bakıyor. Formun "talep
nedeni" müşterinin son "Sorun Devam" cümlesi, yoksa açıklama, belirtiler
ya da makinenin durumu (`talepNedeni`; kurulum talebinde boş gelmiyor).
Parça isteği sorulmayan yapılan iş, km ve işçiliği yazmıyor (ekran ve
`veri.js → servisKaydiGonder`, iki kat). Sınaması AK-35.

**SERVİSSİZ MAKİNEDE FORM YERİNE KART** (O1). Connect'te servisi
atanmamış makine seçilince form açık kalıyor, "Gönder"de geri
çevriliyordu; artık açık talepteki gibi formun yerinde kart
(`RequestForm.jsx → servisiYokMakine`). Ekranda C-33.

**KAPANIŞTAN SONRA KARGO BİLGİSİ** (O2). Müşterinin parça talebi
kapandıktan sonra takip numarası girilemiyordu. Backoffice "Kargo
Bilgisini Gir/Düzelt" (`veri.js → musteriKargosunuGuncelle`): talep kapalı
kalıyor, ilk gönderimin tarihi ve personeli korunuyor, müşteriye kargo
bilgisiyle tek bildirim. Sınaması AK-36.

**AYNI TÜRDEN DÖRT EKRAN DÜZELTMESİ.** Kayıtlı Makineler penceresi
süzülmemiş listeden okuyor (atanan makine "Servis Atanmamış" süzgecinden
düşünce pencere eski kalıyordu; O3). Servisim ekran değişince 350 ms
dokunuş yutuyor: çift dokunuşun ikincisi yeni ekranda başka işi açıyordu
(`ServisPanel.jsx → GECIS_KILIDI_MS`; O4, ekranda X-07). Backoffice'te
talep numarasının tamamı aranınca durum süzgeci aşılıyor. Servisler
ekranı yetkisiz role nedenini yazıyor.

**DÜŞÜKLER.** Connect: teklifin cevapları (ürün, arazi, traktör)
ayrıntıda; servisin açtığı işte "Talebi açan"; geçmişte ikinci "parça
bekleniyor" satırı "Parça yola çıktı" (`lib/talep.js → sevkSatiriMi`,
backoffice'le ortak, arşivdeki sevki de sayıyor; AK-35); "Sorun Devam"
kartında en yeni üstte, tarih yazının üstünde. Servisim: seri düzeltilince
uyarı siliniyor; indirim dökümsüz siparişte "(KDV dâhil)". Backoffice:
iptal edilmiş talebin kilidi "iptal edildi" diyor (`durumKilidi`, AK-08);
iptal nedeninin kime göründüğü alıcı kuralından; fotoğraf düğmesinin adı.

**İKİ KARAR** (28 Eylül 2026, kullanıcının cevabı: "Uyarsın",
"Görsünler"). Servisim'in Kayıt Aç ekranı, servisin aynı makinede onay
bekleyen kendi işi varsa uyarıyor, engellemiyor (`lib/makineTalepleri.js
→ servisinMakinedekiIsleri().onayda`, AK-31). Servisin bakiyesi Servisler
listesinde "Bakiye" sütununda, hak ediş bölümünde ve bakiyeden ödenen
siparişte görünüyor; ayrı izin yok, Servisler'i gören görüyor
(`veri.js → bakiyeDurumu`).

**EŞLEME.** Önceki ziyaretin alanları (`oncekiKayitlar[]`) son
ziyaretinkilerden türetiliyor (aynı talebin küçük ZiyaretNo'lu
talep.ServisZiyareti satırları); "Sorun Devam" kaydı (`tekrar[]`)
talep.YenidenAcma'ya; `servisKaydi.sonuc` SonucMetni'ne. Üçü de hiçbir
senaryo yazmadığı için denetimin görmediği yerdi.

**Fiyat teklifi servise değil bayiye gider.** Bayinin paneli yok:
satış personeli bayiye telefonla haber veriyor, sistemde yalnız hangi
bayinin yetkilendirildiği yazılıyor (`talebiBayiyeAta`). Talep
"Bayiye İletildi" durumuna geçiyor — KAPALI bir durum, sonraki
aşamalara geçmiyor, müşteriye bildirim gitmiyor. Teklif verilmiş
talep bayiye iletilemiyor. Fiyat teklifinin durumları: Yeni, Bayiye
İletildi, Teklif Verildi, Kapandı, İptal (21 Eylül 2026, kullanıcının
kararı; PAKSAN bayisiz de satabildiği için son üçü duruyor).

**PAKSAN'ın talepteki işlemi servise bildirilir** (`serviseBildir`,
aynı `duyurular` deposu, `alici: 'servis'`). Servisin kendi işlemi
kendisine bildirilmez: paylaşılan işlevler `servisten: true` alıyor.
Yazısı Servisim'de `src/servis/talepBildirimleri.js`. Kaydın gövdesi
tek yerde: `lib/serviseBildirim.js → serviseBildirimYaz` (Connect
veri.js'i içe aktaramadığı için). **Müşterinin iki işlemi de aynı
kayıtla gidiyor** (25 Eylül 2026, kullanıcı sınaması): servisin
yürüttüğü talebe ekleme (`musteriEkledi`) ve kapanmış işte "Sorun Devam
Ediyor" (`musteriSorunDevam`); ikisini Connect yazıyor
(`lib/talepEkleme.js → eklemeyiServiseBildir`,
`sorunDevaminiServiseBildir`; parça ve teklif talebinde, PAKSAN'a
devredilmiş işte gitmiyor). Servisim bunları "Müşteriden" diye ayırıyor
(`talepBildirimleri.js → musteridenMi`; İşlerim'de ayrı başlık,
Bildirimler'de alt satır): müşterinin işi PAKSAN'ınki gibi
görünmesin. Sınaması AK-15, AK-32.

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
4. Veri katmanına, talep / hak ediş / yedek parça / cari akışına, servis
   atamasına, duyuru hedeflemesine ya da yetki kataloğuna dokunduysan →
   `ekosistem-sinamasi` subagent'ını çalıştır. Bir uygulamanın ötekinin
   okuyamayacağı bir kayıt yazdığını başka hiçbir kontrol görmüyor.
   Depoya YENİ BİR ALAN yazdıysan `npm run dogrula` "YENİ ALAN" diye
   düşer: `veritabani/uygulama-eslesmesi.mjs`'e satırını ekle — sütunu,
   türediği yer ya da `yok(gerekçe)`. Sessizce geçirmek yasak.
5. Yeni/değişen ikon varsa → `ikon-uretici` subagent'ını kullan, ikonu elle
   `ikonYollari.js`'e yazma

## Subagent'lar

Bu projede sekiz proje-özel subagent var (`.claude/agents/`):

- **ekran-dogrulama** — ekran görüntülerini yeniler, kırık CSS seçicileri onarır
- **ikon-uretici** — Higgsfield PNG'sini vektör ikona çevirir
- **ui-dogrulama** — tamamlanmış bir değişikliğin son görsel QA turu (salt okunur)
- **ekosistem-sinamasi** — üç uygulamanın paylaştığı veri katmanını ve
  ekranları uçtan uca koşturur (`tools/ekosistem-sinamasi.mjs` +
  `tools/ekosistem-turu.mjs`), düşen adımı "uygulama bozuldu" /
  "beklenti eskidi" diye ayırır; `src/` altında hiçbir şey değiştirmez
- **kullanici-ciftci**, **kullanici-servis**, **kullanici-paksan-servis**,
  **kullanici-paksan-parca** — kullanıcı sınamasının dört kişisi (çiftçi,
  servis teknisyeni, backoffice servis ve yedek parça personeli). Üç
  uygulamayı yalnız ekrandan, gerçek kullanıcılar gibi hata yaparak
  kullanır ve beklenmedik davranışları raporlar; turları orkestratör
  yürütür (`tools/kullanici-sinamasi/README.md`). Oturumları kullanıcı
  açar; ajanlar şifre yazmaz

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
- **SINAMA VERİSİ EKRAN METNİ DEĞİL (19 Eylül 2026, kullanıcının
  kararı): "Sınama verilerini sen yazabilirsin, Codex'e vermene gerek
  yok."** `veritabani/sinama/` betiklerinin `Paksan_Sinama1/2`
  veritabanına yazdığı sahte kayıtlar ("S02 servis teknisyeni",
  "S01 duyuru başlığı") ve `tools/ekosistem/tohum.mjs` fikstürleri
  Claude'un. Ölçü şu: **o veritabanına hiçbir uygulama bağlanmıyor ve
  sınama bitince siliniyor** — metin hiçbir ekrana ulaşmıyor. Aynı
  ölçü `tools/` betiklerinin terminal çıktısı için de geçerli.
  Sınırda kalırsa bakılacak yer: değer bir ekranda görünebiliyor mu?
  Görünüyorsa Codex'in.
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

 1. `tr.js`/`en.js` anahtar eşitliği ve Connect sözlüğünde terim yasağı
    (iskonto, kapsam, künye, hak ediş)
 2. Kodda kullanılan `t('...')` anahtarlarının ve bildirim kaydına
    yazılan anahtarların (`baslikAnahtar`, `metinAnahtar`; 25 Eylül 2026)
    iki sözlükteki karşılıkları
 3. İki CSS dosyasındaki token'ların uyumu
 4. `dist/` içine backoffice kodunun sızıp sızmadığı
 5. Motorun marka klasörüne yalnızca kapıdan bakıp bakmadığı
 6. Motor kodunda marka adının düz yazıyla geçip geçmediği
 7. Servis uygulamasında bayi kalıntısı kalıp kalmadığı
 8. `tools/` altındaki sekiz sınama betiğinin geçip geçmediği
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
hangi adın ne anlama geldiğini belirsizleştirir. 8. kontrol sekiz
sınama betiğini çağırıyor: `marka-ek-testi`, `bolge-testi`,
`duyuru-hedef-testi`, `destek-dogrula` (dördü metin okuyor, ayrı
dururken unutuluyorlardı ve biri haftalarca kırık kaldı), artı
`ekosistem-sinamasi`, `veritabani-eslesme-denetimi` ve
`ekosistem-turu` (üçü metin okumuyor, üç uygulamanın paylaştığı
katmanı ÇALIŞTIRIYOR; bkz. "Sınama altyapısı"), bir de
`fiyat-listesi-okuma-sinamasi`: backoffice'e yüklenen fiyat listesi
PDF'ini okuyan kodun gerçek PDF'ten bugünkü katalogla birebir aynı
sonucu verdiğini ve sunucunun yayına alma adımının bozuk listeyi
reddettiğini denetliyor (PDF yoksa okuma kısmı "atlandı" der). Ekran turu sunucu ya da Chrome yoksa kendini atlıyor,
bu yüzden orada "ok" görmek her zaman turun koştuğu anlamına gelmez.
9. kontrol uydurma
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
