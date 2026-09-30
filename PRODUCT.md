# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Surfaces

Üç ürünün platformu aynı değil (29 Eylül 2026, kullanıcının kararı).
Yukarıdaki değer iki mobil uygulamanınki; alan tek değer aldığı için
backoffice burada ayrıca yazılı.

- **PAKSAN Connect** (müşteri uygulaması) — mobil uygulama, şimdilik
  yalnız Android.
- **PAKSAN Servisim** (servis uygulaması) — mobil uygulama, şimdilik
  yalnız Android.
- **Backoffice** (PAKSAN personel paneli) — web, masaüstü tarayıcı.

Aşağıdaki bölümler Servisim'i anlatıyor.

## Users

**Birincil kullanıcı: anlaşmalı servisin sahada çalışan personeli.**

Servis, PAKSAN'ın çalışanı değil — ayrı bir şirket ya da şahıs. Kurulumu,
bakımı ve tamiri yapıyor; işini bayiye değil doğrudan PAKSAN'a raporluyor
ve parasını PAKSAN'dan alıyor.

Teknoloji bilgisi yüksek olmayabilir. Uygulamayı tarlada, işin sonunda,
çoğu zaman ayakta açıyor. Cihaz: orta sınıf Android, 6–6,5 inç ekran
(kullanıcı onayladı).

Diğer taraflar bu uygulamayı KULLANMIYOR ama ürettiği veriyi okuyor:
PAKSAN personeli backoffice'ten, müşteri kendi uygulamasından.

## Product Purpose

Sahada yapılan işin tek belgesini üretmek ve o belgeyi paraya bağlamak.

Servis işi bitirince kaydı dolduruyor: müşteri, makine, arıza, sonuç,
garanti kapısı, değişen parça, gidilen yol, işçilik. Kayıt talebin
üstüne yazılıyor ve içeriğine göre PAKSAN'da doğru masaya düşüyor.
Garanti kapsamındaysa onaydan sonra servisin cari hesabına alacak
yazılıyor.

Başarı ölçütü: servis kaydı doğru dolduruyor ve doldurmayı
geciktirmiyor.

## Positioning

**Kayıt bir rapor değil, paranın kendisi.**

Servis ayrı bir şirket ve kendi menfaati dışında bir şey yapmıyor.
Yalnız PAKSAN'a yarayan bir veri girişi ya hiç yapılmıyor ya
geçiştiriliyor; geçiştirilmiş veri, verinin olmamasından beter —
PAKSAN ona bakıp karar alıyor.

Bu ürünün kurgusu şu tek cümleye dayanıyor: servis, işini kaydetmeden
parasını alamıyor. Doğruluğun bekçisi iyi niyet değil, servisin kendi
cebi. Komşu bir ürün bunu kopyalayamaz çünkü ödeme akışına sahip
olmayan bir uygulamada aynı kaldıraç yok.

**Kural:** Servisten istenen her alan için tek soru sorulur —
*servis bunu doldurduğu an ne alıyor?* Cevap yoksa alan istenmez.

## Operating Context

- **Yer:** tarla, hasat sonrası, ayakta, tek el, güneş altında.
- **Mevsim:** iş hacmi sezona göre değişiyor (kullanıcı onayladı).
  Hasat döneminde patlıyor, dışında sakin. Liste iki yoğunluğu da
  kaldırmalı — sakin dönemde ferah, yoğun dönemde taranabilir.
- **Aciliyet:** müşterinin makinesi hasat ortasında durmuş olabilir;
  "Hasat başladı, acele lazım" gerçek bir talep cümlesi.
- **Üç ekran, üç iş:** İşlerim (bekleyen müşteri işleri), Parça
  (PAKSAN'dan sipariş), Hak Ediş (alacak ve hesap hareketleri).
- **Kayıt akışı:** talep uygulamadan da gelebilir, müşteri telefonla da
  arayabilir; ikisi de aynı kayda çıkıyor.

## Capabilities and Constraints

- **Tek dilli: yalnız Türkçe.** Müşteri uygulaması iki dilli, bu değil.
  Kullanıcıları Türkiye'deki servisler.
- **Ekranda görünen her Türkçe kelime Codex'ten geçiyor** (proje kuralı).
  Tasarım turu metin yazmaz; taslağı Codex'e verir.
- **Veri bugün tarayıcının hafızasında.** Sunucu yok, gerçekçi takvim
  6–9 ay. Servisin telefonundaki kayıt PAKSAN'ın ekranına ulaşmıyor.
  Bu bilinen ve kabul edilmiş bir sınır.
- **CSS kökü açılamaz.** Renk token'ları `backoffice.css`'ten geliyor,
  ölçü token'ları `src/styles/olcu.css`'ten. `src/servis/` altında
  `:root` bloğu olamaz — `npm run dogrula` bunu denetliyor. Servise özel
  değerler `.uyg` altında tanımlanıyor.
- **`bayi` kelimesi `src/servis/` içinde geçemez** (aynı denetim).
- **Üç ayrı derleme:** müşteri uygulaması, backoffice, servis. Servis
  derlemesi `servis.html` girişinden çıkıyor, APK'da `index.html`
  adını alıyor.
- **APK yalnız istendiğinde derleniyor**, her sürüm ayrı dosyada.
- Uygulama Capacitor ile Android'e paketleniyor; ekranlar web
  teknolojisiyle yazılı, native bileşen kullanılmıyor. Hedef cihaz
  Android telefon, tasarım kararları ona göre (geri hareketi, sistem
  çubukları, dokunma hedefi).

## Brand Commitments

- **Ad:** PAKSAN Makina. Kod içinde marka adı düz yazıyla geçmez;
  `MARKA` ve Türkçe ekler için `markaEk()` kullanılır. Denetleniyor.
- **Renk:** makine gövdesi turuncu **#E16025**. Kullanıcı kararı:
  turuncu arayüzde **vurgu olarak kullanılabilir** — lacivert taşıyıcı
  kalır, turuncu asıl eylemde ve dikkat noktalarında görünür.
- **Görsel içerik Higgsfield ile üretilir.** Hesapta kredi var; elle
  çizilmiş zayıf görselle idare edilmez. Mevcut çizimler bu yolla
  üretildi: uygulamanın görsel diline (kalın lacivert kontur, düz
  dolgu, sınırlı palet) referans verilerek.
- **Ton:** terim kullanılmaz. "İskonto", "kapsam", "künye", "cari"
  ekranda geçmez. Onay penceresi ne olacağını anlatır, "Emin misiniz?"
  demez. Düğme yazıları Başlık Düzeninde.

## Evidence on Hand

- **Gerçek ürün kataloğu:** 27 makine, kod ve teknik değerleriyle
  (`src/marka/katalog/`).
- **Gerçek kullanım kılavuzları:** 5 PDF, 381 sayfa
  (`paksan-support-dataset/`). 27 üründen yalnız 5'inin kılavuzu var.
  29 Eylül 2026'dan beri Connect kılavuzu uygulamada yeniden kurmuyor,
  PDF'in kendisini gösteriyor (sunucudaki klasörden bir kez indiriliyor,
  internetsiz açılıyor; bugün 4 PDF, 9 ürün).
- **Üretilmiş çizimler:** `src/assets/gorseller/servis-*.png` —
  boş ekranlarda kullanılıyor.
- **Gerçek makine fotoğrafları:** ürün kataloğunda mevcut.
- **YOK ve uydurulmayacak:** resimli yedek parça kataloğu, patlatılmış
  çizim, parça no–şema eşleşmesi. Kullanıcı "katalog gelene kadar
  bekle" dedi.
- **YOK:** gerçek kullanıcı sayısı, sahada kullanım verisi, memnuniyet
  ölçümü. Uygulama henüz üretimde değil.

## Product Principles

1. **Servisin cebi, verinin bekçisidir.** Her alan bir karşılığın
   bedeli olmalı; karşılıksız alan sorulmaz.
2. **Belge ile hızlı karar ayrı işlerdir.** Servis kaydı bir belgedir
   ve tek sayfada durur; hızlı karar ekranlarında tek soru sorulur.
3. **Görsel kalite hiçbir üründe düşmez; sorulan soru sayısı düşer.**
   Servisin ekranı backoffice'in ucuz kopyası değildir.
4. **Yanlış rakam, rakamın olmamasından kötüdür.** Tutulamayacak veri
   tutulmaz (stok takibi bu yüzden kaldırıldı).
5. **Üç ürün birlikte çalışır.** Serviste üretilen veriyi okuyan ekran
   yoksa iş bitmemiştir.

## Accessibility & Inclusion

- **Kontrast hedefi 7:1 (AAA)**, 4,5 değil: dışarıda ekran parlaması
  gerçek kontrastı düşürüyor.
- **Dokunma hedefi 48 piksel** — Material'ın eldivenli kullanım için
  verdiği alt sınır (Apple 44 diyor, büyüğü alındı).
- **Gövde yazısı en az 16 piksel.**
- **Renk tek başına anlam taşımaz.** Seçili durum kenar şeridiyle,
  uyarı yazısıyla da ayrılır.
- **Gizli etkileşim yok:** kaydırarak silme, uzun basma, çift dokunma
  kullanılmaz.
- **İkon tek başına anlam taşımaz**, yanında yazı olur.
