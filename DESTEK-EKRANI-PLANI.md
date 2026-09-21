# PAKSAN Connect — Destek ekranının yeniden kurulması

> ## ⏸ ASKIYA ALINDI — 18.09.2026, kullanıcının kararı
>
> **Gerekçe (kullanıcının sözü):** "Şu anda RAG'ı tam ve doğru olarak
> oluşturacak veri elimde yok. Bu veriler tamamlandığında işte o zaman bu
> plan uygulanacak. Belki o zamana kadar ekran kartı ve server konusu da
> netleşmiş olur."
>
> **Ne zaman açılır:** kılavuz verisi tamamlandığında. Bugün katalogdaki
> 20 üründen yalnız 9'unun kılavuzu var; asistan kalan 11 modelde hiçbir
> soruya cevap veremiyor. Eksik olanlar: `orkinos-1270`, `orkinos-870`,
> `albatros-870`, `diamond-dikey`, `pelican-yatay`, `scorpion-silaj`,
> `silaj-paketleme`, `yengec-cayir`, `kirlangic-ot-toplama`, `rotovator`,
> `tesviye-kuregi`.
>
> Ayrıca çözülmeyi bekleyen bir tutarsızlık: `TWIN HAMMER KULLANIM
> KILAVUZU` indekste var ama hiçbir katalog ürünü ona işaret etmiyor
> (`urunler` alanı boş). Ya katalogda eksik bir ürün var ya da eşleşme
> yanlış.
>
> **Açılırken önce yapılacak:** bu plan yazıldığında sunucu 8770'te
> çalışıyordu, Ollama 0.34.2'ydi, taban ölçüm `d41-takip-20260913`
> (Ollama 0.34.0'da alınmış). Plan açılırken bu üçü yeniden ölçülmeli;
> aradan geçen sürede hepsi değişmiş olabilir.
>
> **Plan yazıldıktan sonra düzeltilecek iki nokta** (ikinci bir tasarım
> incelemesi bunları farklı söyledi, ölçümle doğrulandı): alan adı
> `sections` (`section_heading` değil) ve 1068 parçanın 197'sinde dolu;
> sayfa görseli üretmek için gereken PyMuPDF `paksan-rag/.venv` içinde
> KURULU (yok değil).
>
> Askıya alma, bu plandaki kararların geçersiz olduğu anlamına gelmiyor —
> yalnız uygulamanın zamanı gelmedi.

## Bağlam

Destek ekranı bugün bir sohbet penceresi: çiftçi yazıyor, 25–50 saniye
bekliyor, kılavuzdan bir cevap alıyor. Kullanıcı 17 Eylül'de "bu ekranı en
baştan kurguluyor olsaydık nasıl kurgulardın?" diye sordu; verilen cevabı
onayladı ve 18 Eylül'de "o şekilde devam etmek istiyorum, bunu kurgulayalım"
dedi. Bu plan o cevabı uygulanabilir aşamalara böler.

Onaylanan tasarımın özü: **Destek bir sohbet penceresi değil, "makinemde
sorun var" anının ekranı.** Asistan bu ekrandaki araçlardan biri, ekranın
kendisi değil. Başarı ölçütü asistanın kaç soruya cevap verdiği değil, şu
üçü:

1. Çiftçi sorunu kendi çözdü; PAKSAN'ın parasını ödeyeceği bir servis
   gidişi olmadı.
2. Çözemediyse servis ne konuşulduğunu bilerek, doğru parçayla geldi ve işi
   tek gidişte bitirdi.
3. Asistan cevap veremediyse PAKSAN hangi kılavuzun eksik olduğunu öğrendi.

Tasarımı belirleyen dört gerçek:

- **Her şey makineye bağlı.** Kılavuz, garanti, atanmış servis ve parça
  makineden çıkıyor. Destek de makineden başlamalı. Bugün makine sorudan
  SONRA soruluyor.
- **Kılavuzların yarısı eksik.** Katalogdaki 20 modelin yalnız 9'unun
  kılavuzu var. Kalan 11 modelde asistan hiçbir soruya cevap veremez.
- **Cevap yavaş** (ölçüldü: ortalama 33 sn). Sebebi model seçimi değil, bu
  bilgisayarda ekran kartı olmaması. Ekran bu süreye dayanacak şekilde
  kurulmalı.
- **Çiftçi tarlada.** Eli kirli ya da eldivenli, internet zayıf olabilir.

## Kullanıcının kararları (18.09.2026)

| Konu | Karar |
|---|---|
| İş bölümü | **Destek ekranı geliştirmesi tamamen Claude'a geçiyor. Geçici değil.** Türkçe dil sorumluluğu Codex'te kalıyor. |
| Sunucu | **Ekran kartlı sunucu alınacak** (tek kart, 24 GB). |
| Sıra | **Önce ekran**, arka taraf sonra. |
| Geliştirme döngüsü | **Kapalı kalacak**; işler normal oturumlarda yürüyecek. |

## Aşama 0 — Yönetişim: işin Claude'a geçmesi

Bu aşama kod değiştirmez, ama diğer her şeyden önce gelir: bugünkü kurallar
Claude'un `Support.jsx`'e dokunmasını açıkça yasaklıyor.

**`CLAUDE.md` → "Codex ile iş bölümü"** — "TEK İSTİSNA — DESTEK ASİSTANI"
maddesi yeniden yazılır: destek ekranı ve sohbet sunucusu geliştirmesi
Claude'da; Codex'in rolü projenin geri kalanındaki gibi Türkçe metin yazımı
ve dil denetimi. "SÜREKLİ GELİŞTİRME DÖNGÜSÜ" maddesi kaldırılıp yerine tek
cümle: döngü 14.09.2026'da duraklatıldı, 18.09.2026'da kapatıldı; işler
normal oturumlarda yürüyor. Karar tarihi ve gerekçesi yazılır — bu dosyanın
kuralı eskimiş bir kuralın sessizce kalmaması.

**`D:\PAKSAN\paksan-rag\sohbet\ORTAK-DEFTER.md` → "2. Dosya sahipliği"** —
Codex'in alanı listesinden `src/screens/Support.jsx`,
`src/lib/destekAsistani.js`, `config.js` `AI` bloğu, `styles.css` "Destek
asistanı" bölümü, `CANLIYA-CIKIS.md` 2.1.1 ve `sohbet/` klasörü çıkarılır;
hepsi Claude'a geçer. **`tr.js`/`en.js` `destek` bloğu istisna:** Türkçe
Codex'te kalıyor, İngilizceyi Claude yazıyor — bu zaten projenin genel
kuralı. Defter append-only olduğu için kural bloğu değiştirilirken en sona
bir karar kaydı da düşülür.

**`sohbet/dongu-durumu.json`** — `sahip: "codex"` → `"claude"`,
`duraklatildi: true` kalır. Bu dosyanın kuralı "sahip yalnız kullanıcının
açık sözüyle değişir"; o söz 18 Eylül'de verildi, kayda geçirilir.

**`sohbet/GELISTIRME-DONGUSU.md`** SİLİNMEZ. Başına bir "KAPANDI" notu
eklenir: döngü düzeni yürürlükte değil, dosya turların nasıl ölçüldüğünü
anlatan kayıt olarak duruyor. İçindeki ölçüm ve karar kuralları (soğuk
koşu, C:/bellek koruması, tabanın ne zaman yeniden ölçüleceği) hâlâ
geçerli ve arka taraf işinde kullanılacak.

**`sohbet/GELISTIRME-KUYRUGU.md`** OLDUĞU GİBİ KALIR. 24 bekleyen iş
ölçülmüş bulgular; arka taraf aşamasının iş listesi bu. Atılması 42 turluk
ölçümün çöpe gitmesi olurdu.

**KORUNAN İKİ KURAL:**

- **Kilitli 28 dosya** (`artifacts/round4-lock.json`). Bu kilit sahiplikle
  değil ÖLÇÜM GEÇERLİLİĞİYLE ilgili: klasör git deposu değil, değiştirilen
  bir dosya geri alınamaz ve 4. turun bütün ölçümü geçersiz olur. Yeni
  motor yazılacaksa üstüne katman konur.
- **Ekranda görünen her Türkçe kelime Codex'ten geçer.** Kullanıcı bunu
  18 Eylül'de ayrıca teyit etti.

## Ekranın yeni iskeleti

Bugünkü ekran yukarıdan aşağı bir sohbet akışı; makine sohbetin ORTASINDA
soruluyor. Yeni iskelet üç sabit bölge:

```
┌─ MAKİNE ŞERİDİ ────────── hep görünür, seçim burada
│  [Orkinos 1270 ▾]  seri 1270-2024
│  Servisiniz: Selçuk Tarım Servisi · [Ara]
├─ İŞ ALANI ──────────────── duruma göre değişen tek bölge
│  · kılavuz yoksa  → "bu makinenin kılavuzu yok" + sonraki adım kutusu
│  · soru yoksa     → örnek sorular
│  · beklerken      → "Kılavuza bakıyorum: ORKA, s.131"
│  · cevap          → güvenlik uyarısı + cevap + kaynak sayfa
│  · takıldıysa     → SONRAKİ ADIM KUTUSU
├─ YAZI KUTUSU ──────────── yazı + sesle sor + gönder
└────────────────────────────
```

**Sonraki adım kutusu** tek bir bileşen ve beş yerde aynı çıkıyor: asistan
bulamadı, çiftçi "devam ediyor" dedi, bağlantı koptu, hata oldu, asistan
hazır değil. İçinde sırayla: **Servisi Ara** (servisin adıyla; servis yoksa
markayı Ara), **Yeniden Dene**, **Servis Talebi Oluştur**, **Yedek Parça
Talebi**, **Kılavuzu Aç** (kılavuz varsa; internetsiz de çalışır).

## Aşama 1 — Sonraki adım kutusu ve servisi arama

En küçük iş, en büyük kazanç. Bugün bağlantı koptuğunda ekranda yalnız bir
cümle ve "Baştan Başla" kalıyor; `talepVar` listesinde `baglanti`, `hata`,
`hazir_degil` YOK (`src/screens/Support.jsx:348-353`) — oysa
`src/config.js:28-29` "bağlantı yoksa servis talebine yönlendiriyor" diyor.
Yazılan niyet ile kod uyuşmuyor ve bu kırsalda en sık yaşanacak durum.

- `Support.jsx` içinde `SonrakiAdim` bileşeni; `talepVar` koşulu bu üç
  durumu da kapsayacak şekilde genişletilir.
- Servis satırı için **`musterininServisleri`**
  (`src/lib/servisAtama.js:82-89`) ve **`araProps`** (`src/lib/tel.js:187-192`)
  yeniden kullanılır; ekran karşılığı `ServisimKarti`
  (`src/screens/Home.jsx:256-315`) zaten var, kalıbı oradan alınır. Servis
  yoksa `null` dönüyor → marka numarası.
- "Yeniden Dene" son soruyu yeniden gönderir (`sonSoru.current` zaten var).
- Talebe geçiş bugünkü `talepAc()` ile (`Support.jsx:328-337`).

## Aşama 2 — Kılavuzu olmayan makinede baştan yönlendirme

Katalogda 20 ürün var, kılavuzu olan 9. Kalan 11 modelde çiftçi bugün
sorusunu yazıyor, 30 saniye bekliyor ve "kılavuz yüklenmedi" cevabını
alıyor.

- **`durumGetir()`** (`src/lib/destekAsistani.js:68-76`) yazılmış ama hiç
  çağrılmıyor. Ölçüldü: `GET /api/durum` bugün `kilavuzluUrunler` alanını
  zaten döndürüyor — tam olarak 9 ürün kimliği. Ekran bunu okur.
- Böylece "hangi modelin kılavuzu var" sorusunun tek kaynağı sunucu olur;
  uygulamadaki gömülü tablo (`src/marka/icerik/kilavuzEslesme.js`) ile
  sunucunun ayrışması biter. Bugün ikisi aynı 9 ürünü söylüyor, yani
  davranış değişmiyor, yalnız kayma riski kapanıyor.
- Sunucuya ulaşılamazsa gömülü tabloya düşülür (`kilavuzVarMi`,
  `src/lib/kilavuzVeri.js:60-62`).
- Kılavuzsuz makine seçiliyken yazı kutusu sönük; iş alanında açıklama ve
  sonraki adım kutusu var.
- Makine listesinde kılavuzsuz modeller işaretlenir.

## Aşama 3 — Makine şeridi: önce makine, sonra soru

- Şerit ekranın üstünde sabit. Tek makine varsa ya da `/destek/:machineId`
  ile gelindiyse seçili gelir; seçim her zaman görünür, tek dokunuşla
  değişir.
- Bugünkü `MakineListesi` (`Support.jsx:601-625`) sohbetin içinden çıkıp
  şeridin açılır listesi olur; `benimMakinelerim` / `digerUrunler`
  hesapları (`Support.jsx:93-118`) korunur.
- `makine_gerekli` durumu böylece nadirleşir ama KALIR: çiftçi hiç makine
  kaydetmemişse ve model adı da yazmamışsa sunucu yine sorar.
- Sunucuya giden `urun` alanı değişmiyor; bu aşama tamamen ekran tarafı.

## Aşama 4 — Beklerken "bakıyorum" satırı

Ölçüldü: sunucu `kaynaklar` olayını modeli çağırmadan ÖNCE gönderiyor
(`sohbet/sunucu.mjs:314`, model çağrısı `:337`). Yani kılavuz ve sayfa
bilgisi, cevap yazılmaya başlamadan ~24 saniye önce elde.

- Ekran bugün bu listeyi cevap bitene kadar gizliyor
  (`Support.jsx:576-594`). Bekleme sırasında "Kılavuza bakıyorum: ORKA
  KULLANIM KILAVUZU, s. 131" satırı gösterilir. Bu satır "kaynak" demez,
  "bakıyorum" der — modele beş bölüm gidiyor, cevap çoğu zaman birini
  kullanıyor.
- **Bölüm adı ("Bakım › Şanzıman › Yağ") bu aşamada gösterilmez.**
  Ölçüldü: parçalardaki `sections` alanı var ama SEYREK ve DENGESİZ —
  1068 parçanın 197'sinde dolu; en büyük kılavuz olan ORKA'nın 391
  parçasının yalnız 9'unda. Bazı makinede bölüm adı çıkıp bazısında
  çıkmaması ekranı tutarsız gösterirdi. Kılavuz adı ve sayfa bugün her
  parçada var ve yeterli; bölüm adını güvenilir kılmak indeks işi.
- Tamamen ekran tarafı; sunucuya dokunulmuyor.

## Aşama 5 — Sesle sorma

Servisim'deki dikte Connect'e taşınır. Bugün `src/servis/` altında ve
`src/servis/dikteMotoru.js:24` açıkça "Connect'e girmemeli" diyor — o yasak
bu kararla kalkar ve dosyalar ortak yere taşınır.

- `Dikte.jsx` + `dikteMotoru.js` → `src/components/` ve `src/lib/` altına;
  iki uygulama da aynı dosyayı kullanır (kopya çıkarılmaz, kopya zamanla
  ayrışır).
- Taşınırken çözülecek dört bağımlılık:
  1. **Metinler** `Dikte.jsx:44-56` içinde sabit Türkçe, `t()` kullanmıyor.
     Connect iki dilli → sözlüğe taşınır (Türkçe Codex, İngilizce Claude).
  2. **`Onay` penceresi** `src/servis/Kabuk.jsx:162-183` — Connect'te
     karşılığı yok. İzin reddi akışı Connect'in kendi kalıbıyla yazılır.
  3. **CSS** `.dikteli*` yalnız `src/servis/servis.css:3520-3620`'de;
     `src/styles.css`e karşılığı eklenir (iki kök elle eşit tutuluyor).
  4. **Android**: Connect'te `RECORD_AUDIO` izni ZATEN VAR
     (`android/app/src/main/AndroidManifest.xml:61-62`). Eksik olan iki
     şey: `<queries>` içine `android.speech.RecognitionService` satırı ve
     `MainActivity.java`'ya `registerPlugin(DiktePlugin.class)`.
- Servisim'in bozulmadığı `npm run build:servis` ve tarayıcıda dikte
  denemesiyle doğrulanır.

## Aşama 6 — Talebe konuşmanın tamamı

Bugün talebe yalnız son soru tek cümle olarak geçiyor
(`Support.jsx:330` → `RequestForm.jsx:89-92`).

- Talebe taşınacaklar: makine ve seri numarası, sorulan bütün sorular,
  gösterilen kılavuz sayfaları, çiftçinin "çözülmedi" demesi.
- Servisim'de servis kaydı ekranında bunun için ayrı bir bölüm açılır —
  servis sahaya çıkmadan neyin konuşulduğunu okur ve parçayı yanına alır.
  Projenin kuralı gereği servisin bundan kazancı var, o yüzden doldurulur.
- Ölü `parcalar` parametresi (`RequestForm.jsx:105-108`, kimse
  göndermiyor) ya kullanılır ya silinir.

## Aşama 7 — Kaynak sayfanın uygulama içinde açılması

Bugün kaynak bağlantısı sunucudaki PDF'e, tarayıcıya çıkıyor
(`Support.jsx:584`); telefonda doğru sayfada açılması garanti değil.

- **Bu aşama sunucu işi gerektiriyor.** Ölçüldü: projede PDF sayfasını
  resme çeviren hiçbir adım yok; sayfa görselleri indeks hattına eklenmeli
  (PyMuPDF zaten kurulu). Parçalarda `bboxes` var — ilgili alanın
  vurgulanması sonradan mümkün.
- Ekran tarafı bu olmadan çalışır; hazır olduğunda kaynak kartı resme
  döner. Bu yüzden sıranın sonunda.

## Arka taraf yol haritası (ekran kartlı sunucudan sonra)

Sıra bağımlılık zinciridir, atlanamaz:

1. **Taban yeniden ölçülür.** Ollama plan yazıldığında 0.34.2, taban `d41`
   0.34.0'da ölçülmüş. Döngü kuralı sürüm değişince tabanın yeniden
   ölçülmesini istiyor ve gerekçesi kayıtlı: 0.33.3 → 0.34.0 geçişinde aynı
   kodla 54 sorunun 15'inde cevap değişti. Koşu dosyası Ollama sürümünü
   kaydetmiyor; bu alan eklenir.
2. **Ölçüm ikiye ayrılır:** arama sınavı (doğru bölüm ilk 3'te mi, modelsiz,
   saniyeler) ve cevap sınavı. Altyapı hazır — `olcu-arama-kaybi.mjs`
   saklanan koşudan yeniden sayıyor. **Uyarı, dört kez ölçülmüş:** arama
   ölçüsü ile cevap ölçüsü ters yönde gidebiliyor; kabul kararı arama
   ölçüsüne dayandırılamaz.
3. **İndeks yeniden kurulur:** Türkçe/İngilizce ayrımı, kılavuzun kendi
   bölümlerine göre parçalama (`sections` bugün 1068 parçanın 197'sinde
   dolu, ORKA'da neredeyse hiç — başlık çıkarımı düzeltilmeli), güvenlik
   uyarılarının işleme bağlanması, sayfa görselleri, "çiftçi bunu nasıl
   sorar" soruları. Parçalar değişeceği için eşikler (özellikle
   `not_found = 0.8377`) yeniden ölçülür.
4. **Yeniden sıralama** eklenir (bugün yok): küçük bir model soruyu her
   adayla yan yana okur, "doğru sayfa yanlış paragraf" sorunu burada
   çözülür.
5. **Model karşılaştırması:** aday modeller (Gemma 4 26B-A4B, Gemma 4 31B,
   Qwen3.6-35B-A3B) aynı soru setiyle hedef sunucuda ölçülür.

Kilitli 28 dosya değiştirilmez; yeni motor `sohbet/` altında yeni
dosyalarda kurulur, eskisi karşılaştırma için yerinde kalır.

## Doğrulama

- **Tarayıcıda:** geliştirme sunucusu açılır, Connect adresine gidilir.
  Connect hesap istiyor; **giriş yapılmaz, şifre yazılmaz** —
  `sessionStorage['paksan.user']` ve `localStorage['paksan.machines']`
  doğrudan doldurulur (Servisim'de bugün kullanılan yöntem).
- Destek sunucusu 8770'te çalışıyor ve `/api/durum` cevap veriyor; gerçek
  cevaplar alınabiliyor. Kılavuzu olan (Orka 870) ve olmayan (Orkinos 1270)
  birer makineyle ayrı ayrı denenir.
- Bağlantı kopması sunucu durdurularak ya da ağ engellenerek gerçekten
  yaşatılır — bugün en kırık olan yol orası.
- Her aşama sonunda: `npm run dogrula`, üç derleme (`build`,
  `build:backoffice`, `build:servis`).
- Görsel QA: kontrast, dokunma hedefi (48 piksel), açık/koyu tema,
  320-414 piksel genişlikler.

## Türkçe metin akışı

Ekrana çıkan her yeni Türkçe metin taslak olarak yazılır ve
`CODEX-BEKLEYEN.md` listesine eklenir; `npm run dogrula` 12. kontrol yayına
çıkmasını engeller. Codex sınırı yenilendiğinde hepsi tek seferde geçer
(bu plan yazıldığında listede 47 metin bekliyordu). İngilizce karşılıkları
Claude yazar.

## Riskler

| Risk | Karşılığı |
|---|---|
| Dikte Connect'e taşınırken Servisim bozulur | Kopya değil taşıma; her adımda `build:servis` ve tarayıcıda dikte denemesi |
| Ekran değişince destek kayıtlarının biçimi bozulur, backoffice raporu kırılır | `destekLog.js` olay türleri korunur; `DestekKayitlari.jsx` ve rapor bölümü aynı turda kontrol edilir |
| Sunucu `/api/durum` cevap vermezse ekran kılavuzsuz sanır | Sunucu sessizse gömülü tabloya düşülür, ekran hiçbir zaman "kılavuz yok" diye kilitlenmez |
| Türkçe metinler Codex'i beklerken ekran yarım görünür | Taslak metinler okunabilir yazılır; 12. kontrol yayını zaten engelliyor |
| Arka tarafta arama iyileşir, cevap bozulur | Kabul kararı cevap sınavına dayandırılır; dört kez ölçülmüş kural |

## Ek: temizlik

- `src/styles.css:4938-5095` arasında eski destek ekranından kalan 18 ölü
  sınıf (`.dst-cevap*`, `.dst-guvenlik*`, `.dst-rozet*`, `.dst-sebep*`).
