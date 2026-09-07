# PAKSAN Connect

Tarım makineleri üreticisi PAKSAN Makina için React 19 + Vite 6 + Capacitor 6
mobil uygulama, artı ayrı derlenen bir "backoffice" (personel paneli). Kod
tabanı ~170 dosya / ~41.000 satır (`src/`). Kullanıcı geliştirici değil —
uygulama içi tüm metin ve yorumlar sade Türkçe.

## Yapı

- `src/screens/` — müşteri uygulaması ekranları (22 dosya)
- `src/backoffice/` — personel paneli, `ekranlar/` alt klasöründe ekranlar (16 dosya)
- `src/components/` — paylaşılan bileşenler
- `src/data/` — statik içerik (ürünler, rehberler, güvenlik, teknik özellikler) — çoğu `X.js`/`X.en.js` çifti hâlinde
- `src/lib/` — yardımcı modüller (depolama, bildirim, PDF/Excel dışa aktarım)
- `src/i18n/` — `tr.js`/`en.js` (663 anahtar, eşit tutuluyor ama build'de zorlanmıyor) + `index.jsx`
- `tools/` — otomasyon betikleri (ekran görüntüsü, ikon üretimi, veri doğrulama)

## Üç ayrı derleme

- `vite.config.js` → `dist/` → APK'ya giren **müşteri uygulaması**
- `vite.backoffice.config.js` → `dist-backoffice/` → **backoffice personel paneli**
- `vite.bayi.config.js` → `dist-bayi/` → **bayi paneli**

Backoffice ve bayi kodu müşteri APK'sının içine GİRMEMELİ.

- `npm run build` → müşteri uygulaması
- `npm run build:backoffice` → backoffice
- `npm run build:bayi` → bayi paneli

İki ayrı APK üretiliyor:

- `npm run apk` → müşteri APK'sı
- `npm run apk:bayi` → bayi APK'sı

İkisi tek `capacitor.config.json` dosyasını paylaşır. `tools/cap-hedef.mjs` hedefi değiştirir; bayi derlemesi bitince hedefi müşteriye geri alır. Böylece depodaki dosya değişmez.

### Bayi tarafında iki giriş

- Bayi derlemesinin iki girişi vardır, ancak tek uygulamadır:
  - `bayi-panel.html`: Tarayıcıdan açılan panel.
  - `bayi-mobil.html`: Telefona kurulan sürüm.
- İkisi de aynı `src/bayi/` kodunu yükler.
- Mobil sürüm, panelin ayrı bir kopyası değil, aynı panelin telefona sarılmış hâlidir.
- Ayrı tutulmalarının nedeni geliştirme sırasında karışmamalarıdır: İki ayrı adres ve sekme başlığı kullanılır.
- Aralarındaki tek fark HTML tarafındadır; mobil sürüm yakınlaştırmayı kapatır.
- Mobil giriş derlemede `index.html` adıyla çıkar; Capacitor `webDir` klasöründe bu adı arar.
- Adı `bayi-mobil.html` kalsaydı APK boş ekran açardı.

Bayi paneli kendi CSS kökünü açmaz, `backoffice.css` dosyasını paylaşır. `npm run dogrula` bu kuralı denetler.

İlk bayi APK'sında `android-bayi` klasörü henüz üretilmedi; ilk çalıştırmada oluşur.

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

## Bayi Ekosisteminin Temeli — Vericiler ve Alıcılar

Hizmet akışında üç taraf var ve rolleri eşit değil:

- **PAKSAN** sadece verir, hiçbir şey almaz
- **Bayi** hem alır (PAKSAN'dan) hem verir (müşteriye) — aradaki tek taraf
- **Müşteri** sadece alır

Bayi ayrı bir şirket ve **kendi menfaati dışında bir şey yapmaz.**
Yalnız PAKSAN'a yarayan bir veri girişi ya hiç yapılmaz ya
geçiştirilir; geçiştirilmiş veri, verinin olmamasından daha kötüdür —
PAKSAN ona bakıp karar alır.

**Kural:** Bayiden istenen her alan için tek soru sorulur:
*Bayi bunu doldurduğu anda ne alıyor?* Cevap yoksa alan istenmez.
Veri, bayinin kendi çıkarı için yaptığı işin **yan ürünü** olmalı;
ayrı bir iş olarak istenmemeli.

Bugün sunulan somut karşılıklar: garanti kapsamındaki bedelsiz
parça (talep formu zaten o parçayı istemenin tek yolu), stok bitince
sipariş önerisi, müşterinin uygulamasında görünen servis kaydı.
En güçlü ticari kaldıraç PAKSAN'ın elinde: garanti işçiliği bugün
ödenmiyor; ödendiği gün iş kaydı hak ediş belgesine dönüşür.

## Üç Ürün Birlikte Çalışır

Bayi panelinde doğan veriyi okuyan ekran yoksa iş bitmemiştir. Bir
özellik "bitti" sayılmadan önce üç tarafta da yeri olmalı:

- **Bayi Paneli** — veriyi üreten ekran
- **Backoffice** — PAKSAN'ın o veriyi göreceği ekran
- **PAKSAN Connect** — müşteriyi ilgilendiren kısmı

Ortak biçimleri yeniden icat etme: talep kapanışı `cozum` nesnesiyle
yürüyor (`yapilanIs`, `parcalar`, `ucret`, `ozet`) ve üç taraf da onu
okuyor. Bildirimler `duyurular` deposundan geçiyor. Paralel bir depo
açmak, iki tarafın birbirini görmemesi demek.

## Bayi Panelinin Kullanıcısı

Bayi personelinin teknoloji bilgisi yüksek olmayabilir. Ekranı
tarlada, işin sonunda, çoğu zaman ayakta açıyor. **Görsel kalite
hiçbir üründe düşmez; sorulan soru sayısı düşer.**

- Tek ekranda tek soru; cevaplar tam genişlikte düğmelerle sunulur
- Gizli etkileşim yok: kaydırarak silme, uzun basma, çift dokunma yok
- İkon tek başına anlam taşımaz; yanında yazı olur
- Terim yok: "iskonto", "kapsam", "künye", "hak ediş" ekranda geçmez
- Onay penceresi ne olacağını açıklar; "Emin misiniz?" demez
- Boş ekran çıkmaz sokak olmaz; ne yapılacağını açıklar

## Standing kurallar (kullanıcıdan)

- APK: yalnız istendiğinde derle, her sürümü ayrı dosyada sakla, üzerine yazma
- **Dil: yalnız PAKSAN Connect (müşteri uygulaması) iki dilli.** Orada her
  değişiklik Türkçe VE İngilizce yapılır. Backoffice ve bayi paneli tek
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

## Değişiklik sonrası kontrol listesi

Bir değişikliği "bitti" demeden önce:

1. Renk/tema değişikliği yaptıysan → `styles.css` ve `backoffice.css`
   token'ları hâlâ eşit mi, elle kontrol et
2. **Müşteri uygulamasında** metin ekledi/değiştirdiysen → `tr.js` VE
   `en.js` ikisi de güncellendi mi (anahtar sayıları eşit mi).
   Backoffice ve bayi paneli tek dilli, orada bu adım yok.
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

- **KALICI KURAL:** Codex’in bu projedeki rolü yalnızca Türkçe metin yazımı ve dil doğruluk kontrolüdür.
- Başka hiçbir iş Codex’e devredilmez.
- **Rolün sınırı YOK: ekranda görünen her Türkçe kelime Codex'ten
  geçer.** Cümle, paragraf, hata metni, sekme adı, düğme yazısı, bölüm
  başlığı, alan etiketi, rozet — hepsi. Bir-iki kelimelik etiketleri
  Claude'un yazması denendi ve geri alındı: kısa etiketler tam da
  ekranın ne anlattığını belirleyen yer ve orada üretilen Türkçe kötü
  çıkıyordu ("Stoklu model" gibi).
- Yeni ekran yazıldığında, İÇİNDEKİ BÜTÜN TÜRKÇE metinler tek seferde
  Codex'e verilir — yalnız uzun cümleler değil.
- İş devredilirken gereken efor açıkça belirtilir; `codex exec` için `-c model_reasoning_effort` kullanılır.
- Türkçe metin yazımı ve dil doğruluk kontrolü için efor seviyesi `low` olarak belirlenir.
- Devredilen iş sessizce başarısız olabilir; sonucu görülmeden iş tamamlanmış sayılmaz.

## Değişiklik sonrası doğrulama

Önceden elle yapılan kontroller artık tek komutta:

    npm run dogrula

Dört şeye bakıyor: `tr.js`/`en.js` anahtar eşitliği, kodda kullanılan
`t('...')` anahtarlarının sözlükte karşılığı, iki CSS dosyasındaki
token'ların uyumu, `dist/` içine backoffice kodu sızıp sızmadığı.
Sorun bulursa çıkış kodu 1.

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