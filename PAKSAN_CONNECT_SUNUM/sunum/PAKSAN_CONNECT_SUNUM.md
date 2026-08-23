# PAKSAN Connect

## Mobil Uygulama ve Backoffice — Tanıtım ve İnceleme Dosyası

| | |
|---|---|
| **Sürüm** | 0.9.2 (demo) |
| **Tarih** | 21 Ağustos 2026 |
| **Kapsam** | Android mobil uygulama + web backoffice |
| **Diller** | Türkçe, İngilizce |
| **Durum** | Çalışan demo. Sunucu bağlantısı ve bazı gerçek veriler bekleniyor (bkz. Bölüm 9) |
| **Görseller** | Ekran görüntüleri çalışan uygulamadan ve backoffice’ten alınmıştır |

---

## İçindekiler

1. [Yönetici özeti](#1-yönetici-özeti)
2. [Projenin amacı ve giderdiği eksikler](#2-projenin-amacı-ve-giderdiği-eksikler)
3. [Sistemin yapısı](#3-sistemin-yapısı)
4. [Müşteri uygulaması — ekran ekran](#4-müşteri-uygulaması--ekran-ekran)
5. [PAKSAN Backoffice — ekran ekran](#5-paksan-backoffice--ekran-ekran)
6. [Ekranlar arası bağlantılar](#6-ekranlar-arası-bağlantılar)
7. [Destek veri seti ve güvenilirlik](#7-destek-veri-seti-ve-güvenilirlik)
8. [Kişisel verilerin korunması](#8-kişisel-verilerin-korunması)
9. [Yayına çıkmadan tamamlanması gerekenler](#9-yayına-çıkmadan-tamamlanması-gerekenler)
10. [Sonraki aşamalar](#10-sonraki-aşamalar)
11. [Ekler](#11-ekler)

---

# 1. Yönetici özeti

PAKSAN Connect, makinesini PAKSAN'dan almış çiftçinin telefonuna kurulan bir uygulama ve onun arkasında çalışan bir backofficedir. İki parça birlikte, satış sonrası hizmetin tamamını — arıza teşhisinden yedek parça sevkine kadar — tek bir kayıt zinciri üzerinde yürütür.

## 1.1. Sistem ne yapıyor

**Müşteri tarafında:**

- Makinesini seri numarasıyla kaydeder; garanti durumu seri numarasından hesaplanır.
- Arızasını uygulamadan bulur. Kullanım kılavuzlarının arıza tabloları — sorun, sebep, çözüm — telefonda aranabilir bir liste hâline getirilmiştir. Çiftçi kendi sorununa dokunur, kılavuzun yazdığı bütün sebepleri ve çözümleri görür.
- Servis, yedek parça ve fiyat teklifi taleplerini yazılı olarak açar; fotoğraf ve sesli not ekleyebilir.
- Yedek parçayı uygulamadan sipariş eder, fiyatını görür, faturasını kestirir, ödemesini yapar ve kargo takip numarasını bildirim olarak alır.
- Talebinin hangi aşamada olduğunu, kapandıysa ne yapıldığını, iptal edildiyse neden edildiğini uygulamadan görür.

**PAKSAN tarafında:**

- Her talep, kim tarafından ne zaman açıldığı ve kim tarafından ne yapıldığıyla birlikte kayıt altındadır.
- Talepler role göre ayrılır: servis ekibi servis taleplerini, yedek parça ekibi parça taleplerini, satış ekibi fiyat tekliflerini görür.
- On üç yönetim raporu, tarih aralığına göre süzülebilir ve Excel'e aktarılabilir.
- Hangi modelde hangi arızanın tekrarlandığı, hangi parçanın ne sıklıkta istendiği ve garanti kapsamında yapılan işin maliyeti ölçülebilir hâle gelir.

## 1.2. Sayılarla

| Ölçü | Değer |
|---|---|
| Yazılıma çevrilen kullanım kılavuzu | 5 adet, 381 sayfa |
| Kılavuzdan çıkarılmış arıza kaydı | 121 |
| Sebep – çözüm satırı | 205 |
| Teknik özellik cevabı | 179 |
| Kullanım prosedürü kartı | 44 |
| Güvenlik uyarısı | 262 |
| Uygulama ekranı | 21 |
| Backoffice ekranı | 12 |
| Yönetim raporu | 13 |

## 1.3. Sunumda vurgulanması önerilen üç nokta

1. **Kılavuzdaki bilgi çiftçinin cebine girdi.** Bugüne kadar 381 sayfalık kılavuz ya evde duruyordu ya kaybolmuştu. Artık aranabilir bir arıza listesi hâlinde telefonda — üstelik her cevabın altında hangi kılavuzun kaçıncı sayfasından geldiği yazıyor.
2. **Her talep kayda geçiyor.** Telefonla anlatılan ve hiçbir yere yazılmayan iş bitiyor. Bu kayıt birikince "hangi modelde ne bozuluyor" sorusunun cevabı imalata gidebilir.
3. **Uygulama kendiliğinden bilgi üretmiyor.** Ekranda görünen her teknik cümle kılavuzdan alınmıştır ve altında kaynağı — hangi kılavuzun kaçıncı sayfası — yazılıdır.

---

# 2. Projenin amacı ve giderdiği eksikler

## 2.1. Bugünkü durum

Makinesi tarlada bozulan çiftçinin yapabileceği tek şey telefon açmaktır. Bu yolun dört ayrı sorunu vardır:

| Sorun | Sonucu |
|---|---|
| Anlatılan şey kayda geçmiyor | Aynı arıza ikinci kez yaşandığında geçmiş bilinmiyor |
| Hangi modelden söz edildiği belirsiz | Yanlış parça hazırlanıyor, servis ikinci kez gidiyor |
| Kılavuz ortada yok | Kılavuzda cevabı yazan soru santralı meşgul ediyor |
| Talep sayısı ölçülemiyor | Kaç talep geldiği, ne kadar sürede kapandığı bilinmiyor |

PAKSAN tarafında da talepler bir deftere yazılıyor ya da hiç yazılmıyor. Hangi bölgede ne kadar iş olduğu, bir servis talebine kaç saatte dokunulduğu, garanti kapsamında ne kadar ücretsiz iş yapıldığı ölçülemiyor.

## 2.2. Projenin cevapladığı soru

> **Kılavuzdaki bilgi çiftçinin cebine, çiftçinin talebi de PAKSAN'ın kaydına nasıl girer?**

## 2.3. Kapsam dışında bırakılanlar

Sistemin ne olmadığını baştan söylemek, ne olduğunu anlatmak kadar önemlidir:

- **Yapay zekâ değildir.** Destek ekranı kendiliğinden cümle kurmaz. Kılavuzda karşılığı olmayan bir soruya "bulamadım" der ve servise yönlendirir.
- **Muhasebe sistemi değildir.** Backoffice’te görünen tutarlar personelin girdiği rakamlardan ve fiyat listesinden gelir. Kesin ciro Logo'daki faturadan okunur.
- **Bayi yönetim sistemi değildir.** Bayilere talep yönlendirmesi bilgi olarak gösterilir; bayinin kendi backoffice’i sonraki aşamadadır.

---

# 3. Sistemin yapısı

## 3.1. İki ayrı program

| | Müşteri uygulaması | PAKSAN Backoffice |
|---|---|---|
| **Kim kullanır** | Makine sahibi çiftçi | PAKSAN personeli |
| **Nerede çalışır** | Android telefon | Bilgisayarda tarayıcı |
| **Nasıl kurulur** | Uygulama olarak telefona | Kurulum yok, adrese girilir |
| **Tasarım önceliği** | Tarlada, eldivenle, tek elle kullanım | Ofiste, fareyle, saatlerce kullanım |

İki program ayrı derlenir. Backoffice’in kodu telefona kurulan uygulamanın içine **girmez**; bu kontrol edilmiştir.

## 3.2. Tasarım kararları ve gerekçeleri

**Uygulama tarafı**

- Büyük düğmeler, geniş boşluklar, az yazı. Eldivenli parmakla küçük hedefe basmak zordur.
- Yazmak yerine seçmek. Talep formlarında belirtiler ve parçalar listeden işaretlenir.
- Sesli not seçeneği. Yazmayı sevmeyen ya da beceremeyen kullanıcı anlatabilir.
- İnternet olmadan da açılır. Kılavuz, arıza çözümleri ve bakım rehberleri telefonun içindedir.

**Backoffice tarafı**

- Sık tablo, dar satır, tek ekranda çok bilgi.
- Her ekran süzülebilir, sıralanabilir ve Excel'e aktarılabilir.
- Rol bazlı görünürlük: personel yalnız kendi işini görür.

---

# 4. Müşteri uygulaması — ekran ekran

Bu bölüm uygulamanın her ekranını sırayla anlatır. Her başlıkta ekranın ne işe yaradığı, kullanıcının orada ne yapabildiği ve varsa diğer ekranlarla bağlantısı yazılıdır.

Bütün ekran görüntüleri çalışan uygulamadan alınmıştır. Görsellerdeki müşteri, makine ve talep kayıtları demo kayıtlarıdır; ekranların kendisi gerçektir.

---

## 4.1. Karşılama ekranı

<img src="gorseller/01-karsilama.png" alt="Karşılama ekranı" width="300">

*Görsel 4.1 — Karşılama*

**Ne için var:** Uygulama ilk açıldığında görülen ekran.

**Kullanıcı ne yapabilir:**

- Dil seçer (Türkçe / İngilizce). Hiç seçim yapılmazsa telefonun dili önerilir.
- "Hemen Başlayın" ile kayıt olur.
- "Zaten kayıtlıyım" ile giriş yapar.

**Not:** Kayıtsız kullanıcı yalnızca karşılama, kayıt ve giriş ekranlarını görebilir. Başka bir adres istenirse karşılama ekranı açılır.

---

## 4.2. Kayıt ekranı

<img src="gorseller/03-kayit.png" alt="Kayıt ekranı" width="300">

*Görsel 4.2 — Hesap açma*

**Ne için var:** Yeni müşterinin hesap açması.

**Kullanıcı ne yapabilir:**

- Ad soyad, cep telefonu, şifre ve konum (il / ilçe) girer.
- Ülke seçer. Türkiye dışı bir ülke seçilirse talepleri farklı yürür (bkz. Bölüm 6.5).
- Üç onay verir:
  - KVKK aydınlatma metni onayı (zorunlu)
  - Açık rıza metni onayı (zorunlu)
  - Kampanya ve duyuru bildirimleri izni (**isteğe bağlı**)

**Neden e-posta sorulmuyor:** Hedef kullanıcı kitlesinde e-posta kullanımı düşüktür. Telefon numarası hem kimlik hem iletişim kanalıdır.

**Konum izni:** Kayıt sonunda konum izni istenir. İzin verilirse bayi listesi en yakından başlayarak sıralanır. Konum saklanmaz; yalnız o an okunur.

---

## 4.3. Giriş ve şifre sıfırlama

<img src="gorseller/02-giris.png" alt="Giriş ekranı" width="300">

*Görsel 4.3 — Giriş*

**Giriş ekranı:** Telefon numarası ve şifre ile giriş. Şifre altı rakamdır; tarlada eldivenle uzun şifre yazmak zordur, rakam tuş takımı büyük çıkar.

**Şifremi unuttum:** Kullanıcı kimliğini seri numarasıyla doğrular.

**Numaram değişti:** Telefon numarası hesabın kimliğidir; kullanıcı kendi başına değiştiremez. Değiştirebilseydi telefonu eline geçiren biri hesabı devralabilirdi. Müşteri uygulamadan talep bırakır, kimliği seri numarasıyla doğrulanır, numarayı **PAKSAN admini** değiştirir.

<img src="gorseller/29-numara-degisikligi.png" alt="Numara değişikliği talebi" width="300">

*Görsel 4.4 — Numara değişikliği talebi. Karşılığı: Bölüm 5.10 (Backoffice → Numara Değişikliği Talepleri)*

---

## 4.4. Ana sayfa

<img src="gorseller/04-ana-sayfa.png" alt="Ana sayfa" width="300">

*Görsel 4.5 — Ana sayfa*

**Ne için var:** Uygulamanın giriş noktası ve en sık yapılan işlere kısayol.

**Ekranda ne var:**

- Kullanıcının adı ve üç sayaç: kayıtlı makine, aktif talep, bayi ve servis sayısı. Üçü de dokunulabilir; ilgili listeye gider.
- Servis talebi, kılavuzlar ve yedek parça talebi kısayolları
- Satın alma düğmesi
- Bildirim rozeti (okunmamış bildirim sayısı)
- Makinelerim listesi ve garanti rozetleri

**Alt menü:** Ana Sayfa · Makineler · Ürünler · Destek · Profil. Bu menü her ekranda durur.

---

## 4.5. Makinelerim

<img src="gorseller/05-makinelerim.png" alt="Makinelerim" width="300">

*Görsel 4.6 — Makinelerim*

**Ne için var:** Müşterinin kendi makinelerinin listesi.

**Kullanıcı ne yapabilir:**

- Kayıtlı makinelerini görür (model, seri numarası, garanti durumu).
- Yeni makine ekler.
- Bir makineye dokunarak detayına gider.

**Garanti durumu** dört değerden biridir: *Garanti sürüyor*, *Garantinin son yılı*, *Garanti bitti*, *Garanti bilgisi yok*. Üretim yılı seri numarasından okunur.

---

## 4.6. Makine ekleme

<img src="gorseller/07-makine-ekle.png" alt="Makine ekleme" width="300">

*Görsel 4.7 — Makine ekleme*

**Ne için var:** Makineyi seri numarasıyla sisteme kaydetmek.

**Kullanıcı ne yapabilir:**

- Seri numarasını yazar. Numaradan model ve üretim yılı çıkarılır.
- Seri numarasının makinenin neresinde yazdığını ekrandan öğrenir (balya makinalarında çeki oku yanında, yem karmada kazanın ön sağ köşesinde, vb.).
- İsteğe bağlı bir takma ad verir ("Büyük traktörün balyacısı" gibi) — aynı modelden birden fazla makinesi olanlar için.

**Neden seri numarası:** Tek bir alan hem modeli hem üretim yılını hem de garanti durumunu verir. Servis talebinde ilk sorulan soru — "garanti kapsamında mı" — talep açılırken cevaplanmış olur.

**Hata durumları:** Numara eksikse, tanınmıyorsa veya zaten kayıtlıysa kullanıcıya ne yapması gerektiği yazılı olarak söylenir.

---

## 4.7. Makine detayı

<img src="gorseller/06-makine-detay.png" alt="Makine detayı" width="300">

*Görsel 4.8 — Makine detayı*

**Ne için var:** Tek bir makinenin bütün bilgileri ve o makineye özel işlemler.

**Ekranda ne var:**

- Model, seri numarası, üretim yılı, garanti durumu
- Çalışma saati (kullanıcı günceller)
- Bakım takvimi ve yapılmış bakımların işaretlenmesi
- O makine için servis / yedek parça talebi kısayolu
- O makinenin kullanım kılavuzu kısayolu

---

## 4.8. Destek — arıza çözümü

Projenin en çok emek verilen bölümü budur. Beş kullanım kılavuzu, 381 sayfa, satır satır işlenerek uygulamanın içine alınmıştır.

**Ekranın biçimi kasıtlı olarak sadedir: hazır sorun listesi.** Çiftçi kendi sorununa dokunur, kılavuzun o sorun için yazdığı bütün sebepler ve çözümleri açılır. Uygulama soru sormaz, sohbet etmez, cümle kurmaz.

**Neden böyle:** Kılavuzların arıza bölümü zaten bir tablodur — SORUN | SEBEP | ÇÖZÜM. Tarlada eldivenle telefon kullanan biri art arda soru cevaplamak istemez; listeye bakıp kendi durumuna uyanı görmek ister. Ekran, kılavuzun tablosunu tablo olarak gösterir.

### 4.8.1. Makine seçimi

<img src="gorseller/10-destek-makine-secimi.png" alt="Makine seçimi" width="300">

*Görsel 4.9 — Makine seçimi*

**Ne için var:** Cevaplar seçilen makinenin **kendi** kullanım kılavuzundan geldiği için, önce model belirlenir.

**Kullanıcı ne yapabilir:**

- Kılavuzu işlenmiş 12 model arasından kendisininkini seçer. Modeller kılavuz ailesine göre öbeklenmiştir: Hammer, Twin Hammer, Orka, i-Pak, Süper / Yunus.
- Seçim telefonda saklanır; her açılışta yeniden seçilmez. Üstteki satırdan tek dokunuşla değiştirilir.

**Önemli:** Bu liste, müşterinin uygulamaya kaydettiği makinelerden **bağımsızdır**. Kılavuzu işlenmiş bütün modeller listededir; hiç makine kaydetmemiş kullanıcı da destek ekranını kullanabilir.

### 4.8.2. Arıza listesi

<img src="gorseller/11-destek-ariza-listesi.png" alt="Arıza listesi" width="300">

*Görsel 4.10 — Arıza listesi*

**Ne için var:** Seçilen modelin kılavuzunda tarif edilen arızaların listesi.

**Ekranda ne var:**

- **Arıza Çözümü** sekmesi: kılavuzdaki arızalar. Her satırda arızanın adı, ait olduğu sistem (ör. "Bağlama düğümleme düzeni"), kaç olası sebebi olduğu ve kılavuz sayfası yazar.
- **Hızlı Cevaplar** sekmesi: teknik özellikler.
- **Kullanım** sekmesi: kullanım prosedürü ve makine bilgisi kartları.
- **Güvenlik uyarıları** düğmesi: o makinenin kılavuzundaki bütün güvenlik notları.
- **Arama kutusu:** arıza listesinde arama.

**Örnek — Hammer 420 (2 ipli):** 25 arıza, 16 hızlı cevap, 8 kullanım kartı, 51 güvenlik uyarısı.

### 4.8.3. Sebepler ve çözümler

<img src="gorseller/12-destek-cozum.png" alt="Sebepler ve çözümler" width="300">

*Görsel 4.11 — Bir arızaya dokunulduğunda açılan sebep–çözüm listesi*

**Ne için var:** Kılavuzun o arıza için yazdığı bütün sebepleri ve her sebebin çözümünü göstermek.

**Ekranda ne var:**

- **Müdahale uyarısı şeridi** (turuncu) — aşağıdaki çözümlerin hepsi makineye el sürmeyi gerektirir.
- **Numaralı sebepler** — kılavuzdaki sırayla. Örnekte "İp düğümlenmiyor" arızasının üç sebebi vardır.
- **Her sebebin altında çözümü** — kılavuzdaki parça kodlarıyla birlikte: *"Mekik dili pimini değiştirin (131-29)"*.
- **Kaynak satırı** — *HAMMER KULLANIM KILAVUZU · s. 34*
- **Servis talebi oluştur** düğmesi

**Kılavuz kesin konuşmuyorsa** o sebebin altına "Kılavuz bu sebebi kesin olarak belirtmiyor; uygulamadan önce kontrol edin" notu düşülür. Kılavuz sebep yazmadan doğrudan yönlendirme yapıyorsa (ör. "yetkili servise başvurunuz") o satır numarasız, "Kılavuzun yönlendirmesi" başlığıyla gösterilir.

### 4.8.4. Müdahale uyarıları

<img src="gorseller/13-destek-guvenlik-serit.png" alt="Müdahale uyarıları" width="300">

*Görsel 4.12 — Turuncu şeride dokunulduğunda inen güvenlik uyarıları*

**Ne için var:** Çözüm adımları makineye el sürmeyi gerektirir. Traktör motoru kapatılmadan, kuyruk mili durdurulmadan yapılan müdahale ölümcül olabilir.

**Nasıl seçiliyor:** Kılavuzun güvenlik bölümünden yalnız üç başlık süzülür — **bakım**, **hareketli parça**, **kuyruk mili**. Bir makinenin güvenlik uyarılarının tamamı elliyi geçer; çoğu taşıma ve tarlada çalışma uyarısıdır ve bir arıza satırının altına sığmaz. Tamamına ayrı düğmeden ulaşılır (bkz. 4.8.7).

### 4.8.5. Kaynak gösterimi

<img src="gorseller/14-destek-kaynak.png" alt="Kılavuz alıntısı" width="300">

*Görsel 4.13 — Kaynak satırına dokunulduğunda açılan kılavuz alıntısı*

**Ne için var:** Uygulamanın bilgiyi uydurmadığını göstermek.

**Nasıl çalışır:** Her kaydın altında hangi kılavuzun kaçıncı sayfasından geldiği yazar. Satıra dokunulduğunda kılavuzdaki **asıl cümle** ve bölüm başlığı açılır. Müşteri bilginin nereden geldiğini görür; servisçi kılavuzu açıp aynı sayfaya bakabilir.

**Bu, sistemin en önemli tasarım kararıdır.** Uygulama kendiliğinden bilgi üretmez. Kılavuzda karşılığı olmayan hiçbir cümle ekrana çıkmaz.

### 4.8.6. Hızlı cevaplar ve kullanım kartları

<img src="gorseller/15-destek-hizli-cevaplar.png" alt="Hızlı cevaplar" width="300"> <img src="gorseller/16-destek-kullanim.png" alt="Kullanım kartları" width="300">

*Görsel 4.14 — Hızlı Cevaplar ve Kullanım sekmeleri*

**Hızlı Cevaplar:** Teknik özellikler soru-cevap biçiminde ("HAMMER 420 için ağırlık nedir? → 2790 kg"). Ekranın üstünde bu cevapların kılavuzun **teknik özellikler tablolarından üretildiği**, kılavuzda soru-cevap olarak yazılı olmadığı belirtilir.

**Kullanım:** Prosedür, makine bilgisi ve servis bildirimi kartları. Başlığa dokunulunca metin açılır, altında kaynağı yazar.

**Hızlı cevaplar model bazındadır, yayılmaz.** Ağırlık, ölçü ve bağlayıcı sayısı gibi değerler varyanta özeldir; iki ipli makinenin sahibine üç iplinin değerleri gösterilmez.

### 4.8.7. Güvenlik uyarıları

<img src="gorseller/17-destek-guvenlik.png" alt="Güvenlik uyarıları" width="300">

*Görsel 4.15 — Makinenin bütün güvenlik uyarıları*

**Ne için var:** Seçilen makinenin kılavuzundaki güvenlik notlarının tamamı. Her uyarının altında kaynağı yazar.

---

## 4.9. Ürünler ve ürün detayı

<img src="gorseller/08-urunler.png" alt="Ürünler" width="300"> <img src="gorseller/09-urun-detay.png" alt="Ürün detayı" width="300">

*Görsel 4.16 — Ürün kataloğu ve ürün detayı*

**Ne için var:** PAKSAN ürün kataloğu.

**Kullanıcı ne yapabilir:**

- Ürünleri kategoriye göre görür: büyük balya, küçük balya, rulo balya, yem karma, silaj, çayır ve ot toplama, toprak işleme.
- Ürün adında arama yapar.
- Ürün detayında teknik özellikleri, fotoğrafları ve tanıtım videolarını görür.
- Doğrudan o ürün için fiyat teklifi talebi açar (bkz. Bölüm 6.4).

---

## 4.10. Kullanım kılavuzları

<img src="gorseller/18-kilavuzlar.png" alt="Kılavuzlar" width="300"> <img src="gorseller/19-kilavuz.png" alt="Kılavuz detayı" width="300">

*Görsel 4.17 — Kılavuz listesi ve kılavuz detayı*

**Ne için var:** Makinelerin kullanım kılavuzu özetleri.

**Ekranda ne var (açılır kapanır bölümler hâlinde):**

1. Güvenlik kuralları
2. Makinenin traktöre bağlanması
3. Çalıştırma ve ayarlar
4. Bakım takvimi
5. Sık karşılaşılan sorunlar → **Destek ekranındaki arıza listesine yönlendirir**
6. Teknik özellikler

**Neden arıza listesi burada değil:** Tek doğru kaynak olması için. Arıza listesi ve çözümleri Destek ekranında durur; veri seti yenilendiğinde iki ekranın ayrışması istenmemiştir (bkz. Bölüm 6.3).

---

## 4.11. Bakım rehberleri

<img src="gorseller/20-bakim-rehberi.png" alt="Bakım rehberleri" width="300">

*Görsel 4.18 — Bakım rehberleri*

**Ne için var:** Makine grubuna göre bakım rehberleri — günlük, haftalık, sezonluk yapılacaklar.

---

## 4.12. Talep ekranları

Üç talep türü vardır ve her biri farklı sorular sorar. Ortak olan: ad, telefon ve konum formda **sorulmaz**, hesaptan gelir.

### 4.12.1. Servis talebi

<img src="gorseller/21-talep-servis.png" alt="Servis talebi formu" width="300">

*Görsel 4.19 — Servis talebi formu*

**Sorulanlar:**

- Hangi makine (kayıtlı makinelerden seçilir)
- Makine şu an ne durumda: *Hiç çalışmıyor* / *Çalışıyor ama sorun var* / *Çalışıyor, kontrol edilsin*
- Belirtiler (listeden birden fazla seçilebilir; makine grubuna göre değişir)
- Açıklama veya sesli not
- Fotoğraf (5 adede kadar) ve video (30 saniyeye kadar)
- Ne zaman aranmak istendiği

**Neden "acil mi" diye sorulmuyor:** Herkes acil der. Bunun yerine makinenin durumu sorulur; sıralamayı PAKSAN yapar.

### 4.12.2. Yedek parça talebi

<img src="gorseller/22-talep-parca.png" alt="Yedek parça talebi formu" width="300">

*Görsel 4.20 — Yedek parça talebi formu*

**Sorulanlar:**

- Hangi makine
- Hangi parçalar (listeden) ve **her parça için adet**
- Açıklama (isteğe bağlı), fotoğraf, sesli not
- Ne zaman aranmak istendiği

**Fiyat ekranda görünür:** Parça seçildiğinde birim fiyatı, parça kodu, satır tutarı ve KDV dâhil toplam ekranda hesaplanır.

**"Diğer" seçeneği:** Listede olmayan bir parça için kullanılır. Seçilirse adet sorulmaz ve başka parça seçilemez; ne istendiği açıklamaya yazılır, fiyatı PAKSAN belirler.

### 4.12.3. Fiyat teklifi talebi

<img src="gorseller/23-talep-teklif.png" alt="Fiyat teklifi talebi formu" width="300">

*Görsel 4.21 — Fiyat teklifi talebi formu*

**Sorulanlar:**

- İlgilenilen ürün
- Ne balyalanacak (yonca, saman, ot, mısır silajı)
- Kaç dönüm arazi
- Traktör kaç beygir

**Neden bu üç soru:** Satış ekibinin telefonda ilk sorduğu sorulardır. Cevapları önden gelirse teklif ilk aramada verilebilir.

**Talep gönderildikten sonra:** "İlgilendiğiniz ürünü incelemek ister misiniz?" kartı çıkar. Kendiliğinden yönlendirme yapılmaz; isteyen dokunur.

---

## 4.13. Yedek parça — fatura ve ödeme ekranı

**Ne için var:** Yedek parça bir hizmet talebi değil, satıştır. Faturası kesilir, parası alınır, bir yere gönderilir. Bu ekran talep formundan sonra gelir.

**Kullanıcı ne yapabilir:**

- **Sipariş özeti:** seçilen parçalar, adetleri, ara toplam, KDV ve **gönderilecek tutar** en üstte.
- **Fatura tipi:** *Şahsım adına* (TC kimlik numarası) veya *Firma adına* (tam ünvan + vergi numarası). Her iki numara da girildiği anda kendi içinde doğrulanır; hatalı numara kabul edilmez.
- **Fatura başkası adına kesilecekse** ad ve telefon ayrıca girilir. Kimlik numarası alanı bu seçimin **altındadır** — böylece başkasının adı yazılıp kendi kimlik numarasının unutulması engellenir.
- **Teslimat adresi:** il, ilçe ve açık adres.
- **PAKSAN hesap bilgileri:** IBAN ve havale açıklaması, kopyalama düğmeleriyle.
- **Dekont yükleme:** banka uygulamasından indirilen PDF veya ekran görüntüsü.

**Talep numarası bu ekranda üretilir** ve ekranda yazar. Müşteri havale açıklamasına o numarayı yazar; muhasebe ödemeyi talebe eşleştirebilir. Zincirin tamamı Bölüm 6.6'dadır.

---

## 4.14. Taleplerim ve talep detayı

### 4.14.1. Taleplerim (Profil sayfası içinde)

<img src="gorseller/28b-taleplerim.png" alt="Taleplerim" width="300">

*Görsel 4.22 — Taleplerim*

**Ne için var:** Müşterinin açtığı bütün taleplerin listesi.

**Ekranda ne var:**

- İki sekme: **Açık Talepler** ve **Tamamlananlar**
- Her sekmede ilk beş talep; gerisi "daha fazla" düğmesinin ardında
- Her satırda talep numarası, türü (renkli rozet), durumu (renkli hap), makinesi ve tarihi
- Satırı sola kaydırınca silme düğmesi çıkar

### 4.14.2. Talep detayı

<img src="gorseller/24-talep-detay.png" alt="Servis talebi detayı" width="300"> <img src="gorseller/25b-talep-detay-teklif.png" alt="Fiyat teklifi detayı" width="300">

*Görsel 4.23 — Servis talebi detayı (randevu verilmiş) ve fiyat teklifi detayı (teklif verilmiş)*

**Ne için var:** Tek bir talebin tamamı. Bildirime dokunan müşteri buraya gelir.

**Ekranda sırayla ne var:**

1. **Talebin şu anki hâli** — durum ve tarihi
2. **PAKSAN'ın son sözü** — hangisi varsa:
   - İptal sebebi ve personelin açıklaması
   - Verilen teklif: tutar, geçerlilik, not
   - Randevu: tarih ve yapılacak iş
   - Kargo bilgisi: firma ve takip numarası
   - Yapılan iş / teklif sonucu
3. **PAKSAN'dan notlar** — personelin müşteriye gönderdiği bilgilendirmeler
4. **Ödeme** (yedek parçada) — fatura bilgisi ve ödeme onay durumu
5. **Talebin kendisi** — ne sorulmuştu, hangi makine, eklenen fotoğraflar
6. **Talebin geçmişi** — geçtiği bütün aşamalar, tarihleriyle

**Sıralama kasıtlıdır:** Ekranı açan kişi ne sorduğunu zaten bilir; bilmediği şey cevaptır. Bu yüzden yeni bilgi üstte, eski bilgi alttadır.

<img src="gorseller/25-talep-detay-parca.png" alt="Yedek parça talebi detayı" width="300">

*Görsel 4.24 — Yedek parça talebi detayı. Ödeme bölümü yalnız bu türde görünür.*

---

## 4.15. Bildirimler

<img src="gorseller/27-bildirimler.png" alt="Bildirimler" width="300">

*Görsel 4.25 — Bildirimler*

**Ne için var:** PAKSAN'dan gelen her haberin tek yerde toplanması.

**Ekranda ne var:**

- **Yaklaşan randevu kartı** — listenin üstünde, ayrı renkte. Listenin içinde değildir; olsaydı yeni gelen bildirim ikinci sıraya düşerdi.
- **Bildirim listesi** — en yeni en üstte, tarihe göre öbeklenmiş (bugün / dün / bu hafta / daha eski)
- Okunmamış satırlar beyaz zeminde ve mavi noktalı; okunmuşlar soluk
- "Tümünü okundu işaretle"

**Hangi bildirimler gelir:**

| Olay | Bildirim |
|---|---|
| Talep açıldı | Talebiniz alındı |
| Durum değişti | Yeni durum ve açıklaması |
| Teklif verildi | Tutar ve geçerlilik |
| Ödeme onaylandı | Dekontunuz kontrol edildi |
| Parça gönderildi | Kargo firması ve takip numarası |
| Talep iptal edildi | **İptal sebebi** |
| Randevu yaklaştı | Bir gün önce hatırlatma |
| Personel not gönderdi | Notun kendisi |
| Görüşe cevap verildi | Cevabın kendisi |
| PAKSAN duyuru yaptı | Duyuru başlığı ve metni |

**Bildirime dokunulduğunda** ilgili talebin detay ekranı açılır (bkz. Bölüm 6.7). Gidilecek yeri olmayan bildirimlerde (duyuru, görüş cevabı) ok işareti çıkmaz.

---

## 4.16. Duyuru penceresi

**Ne için var:** PAKSAN'ın yaptığı duyuruyu müşterinin görmesini sağlamak.

**Nasıl çalışır:** Uygulama açıldığında pencere olarak çıkar, kapatılınca bir daha çıkmaz ama Bildirimler listesinde kalıcı durur. Yalnız listede dursaydı kimse görmezdi; yalnız pencere olsaydı kapatan kişi bir daha ulaşamazdı.

**İki tür duyuru vardır** ve aralarındaki fark hukukidir (bkz. Bölüm 5.9).

---

## 4.17. Bayiler

<img src="gorseller/26-bayiler.png" alt="Bayiler" width="300">

*Görsel 4.26 — Bayi ve servis ağı*

**Ne için var:** En yakın satış ve servis noktasını bulmak.

**Kullanıcı ne yapabilir:**

- Konumuna izin verirse bayiler en yakından uzağa sıralanır; izin vermezse kayıtlı iline göre sıralanır.
- Bayinin telefonunu tek dokunuşla arar.
- Yol tarifini açar.
- İle, ilçeye ve verilen hizmete göre süzer.

---

## 4.18. Profil

<img src="gorseller/28-profil.png" alt="Profil" width="300">

*Görsel 4.27 — Profil*

**Ne için var:** Hesap bilgileri, talepler ve yardım bağlantıları.

**Ekranda ne var:**

- Kayıtlı makine ve talep sayısı
- Taleplerim (bkz. 4.14.1)
- **Hesabım:** dil seçimi, bilgileri düzenleme, şifre değiştirme, telefon numarası (kilitli, yanında ne yapılacağını anlatan bağlantı), KVKK metinleri, kampanya izni
- **Yardım:** görüş ve öneri gönderme, bayi telefonları, çıkış

---
# 5. PAKSAN Backoffice — ekran ekran

Bu bölüm backoffice’in her ekranını sırayla anlatır. Ekran görüntüleri çalışan backoffice’ten alınmıştır; içindeki müşteri, talep ve rapor kayıtları demo kayıtlarıdır.

## 5.1. Giriş ve roller

<img src="gorseller/40-backoffice-giris.png" alt="Backoffice giriş ekranı" width="100%">

*Görsel 5.1 — Backoffice girişi*

**Hesaplar elle açılır.** Kimse kendi kaydını yapamaz, kendi rolünü seçemez. Admin, Personel ekranından kişiyi ekler; kullanıcı adı addan üretilir (*Serhat Tecimen* → *serhat.tecimen*) ve şifre 6 rakamdır.

| Rol | Ne görür, ne yapar |
|---|---|
| **Admin** | Her şey. Personel açar/siler, müşteri bilgisi düzeltir, numara değişikliği onaylar. |
| **Yönetici** | Bütün talepleri ve raporları görür, duyuru yayınlar. Personel açamaz. |
| **Servis** | Yalnız servis taleplerini (SRV…) görür. |
| **Yedek Parça** | Yalnız yedek parça taleplerini (YPR…) görür. |
| **Satış** | Yalnız fiyat teklifi taleplerini (TKF…) görür. |

**Şifre değiştirme:** Personel şifresini kendisi değiştirir ama şifreyi bilmeden değiştiremez. Giriş ekranından talep bırakınca kendi şirket e-posta adresine tek kullanımlık, 24 saat geçerli bir bağlantı gider. Kimlik, e-posta kutusuna erişimle doğrulanır.

---

## 5.2. Dashboard

<img src="gorseller/41-dashboard.png" alt="Dashboard" width="100%">

*Görsel 5.2 — Dashboard (admin görünümü)*

**Ne için var:** "Şu an ne oluyor" sorusuna bakan ekran. Backoffice açıldığında ilk gelen ekrandır.

### 5.2.1. Hızlı erişim kutuları

Her kutu tıklanabilir ve Talepler ekranını kendi süzgeciyle açar. "48 saati geçen 10" deyip bütün listeyi göstermek işe yaramıyordu.

| Kutu | Kim görür |
|---|---|
| Açılmamış talep | Herkes |
| Açık talep | Herkes |
| Bugün gelen | Herkes |
| 48 saati geçen | Herkes |
| Cevap bekleyen teklif | Satış + yönetim |
| Numara talebi | Admin |
| Okunmamış görüş | Yönetim |
| Müşteri adedi | Yönetim |
| Kayıtlı makine | Herkes |

### 5.2.2. Ölçüler

**Bu hafta gelen** — geçen haftayla karşılaştırmalı.

**Aynı gün açılan talep oranı** — personelin gelen talebe aynı gün dokunma alışkanlığını ölçer.

Hesabı: her çalışılan gün için o gün gelen taleplerin kaçının aynı gün "Yeni" durumundan çıktığı bulunur, sonra bu günlük oranların ortalaması alınır. Hesaba girmeyenler:

- Hiç talep gelmeyen günler
- Personelin backoffice’e hiç girmediği günler (resmî tatil, izin, hafta sonu). Hangi günün çalışıldığı takvimden değil, **işlem kaydındaki giriş satırlarından** okunur.
- Bugün — gün daha bitmemiştir

Günlük oranların ortalaması alınır, toplam üzerinden tek oran değil. Tek oran yoğun günleri ağırlıklandırır ve sakin günlerdeki ihmali gizlerdi.

### 5.2.3. Grafikler

| Grafik | Ne gösterir |
|---|---|
| Gelen talep | Seçilen dönemin günlük dağılımı. Bir güne tıklanınca o günün talepleri açılır. |
| Talep kalan süreleri | Açık işin yaş dağılımı: 24 saat içinde / 1-2 gün / 2 günden eski |
| Talep türü | Servis, yedek parça, fiyat teklifi dağılımı (yalnız yönetim) |
| Talep statü dağılımı | Hangi durumda kaç talep var |
| En çok talep gelen iller | Türe bölünmüş |
| En çok talep alan makineler | Türe bölünmüş |

---

## 5.3. Talepler

<img src="gorseller/42-talepler.png" alt="Talepler listesi" width="100%">

*Görsel 5.3 — Talepler listesi ve süzgeçler*

**Ne için var:** Backoffice’in en çok kullanılan ekranı. Solda liste, sağda seçilen talebin tamamı.

### 5.3.1. Süzgeçler ve liste

**Süzgeçler:** Durum, talep türü, tarih aralığı, il, ilçe, makine ve serbest arama (talep no, ad, telefon, seri no).

**Durum süzgecinde özel seçenekler:** *Açık olanlar*, *Gecikmiş talepler*, *Cevap bekleyen teklifler*.

**Liste sütunları:** Talep · Müşteri · Makine · Telefon · **Tarih / Saat** · Durum. Sütun başlığına tıklanınca o sütuna göre sıralanır; tekrar tıklanınca yön döner.

**Satır işaretleri:**

- Kırmızı ünlem: 48 saati geçmiş, hâlâ açık talep
- Mor kum saati: teklif verilmiş, müşteri 14 gündür dönmemiş

İki işaret farklı iş gerektirir: birincisinde kimse bakmamıştır, ikincisinde top müşteridedir.

### 5.3.2. Talep detayı

<img src="gorseller/43-talep-detay.png" alt="Talep detayı" width="100%">

*Görsel 5.4 — Bir talep seçildiğinde sağda açılan detay*

Sağ tarafta seçilen talebin bütün bilgileri bölümler hâlinde durur:

| Bölüm | İçerik |
|---|---|
| **Durum çipleri** | Talebi bir sonraki aşamaya almak için |
| **Müşteri** | Ad, telefon, konum, aranma tercihi |
| **Aktif diğer talepler** | Aynı müşterinin bekleyen başka işleri. "Tümü" düğmesi kapanmışları da açar. |
| **Makine** | Model, seri no, üretim yılı, **garanti durumu** |
| **Talep** | Belirtiler, istenen parçalar, açıklama, sesli not, fotoğraflar |
| **İlgili bayi** | Yalnız fiyat teklifinde (bkz. Bölüm 6.4) |
| **Fatura ve teslimat** | Yalnız yedek parçada: fatura bilgileri, adres, beklenen tutar, dekont, ödeme onayı |
| **Verilen teklif** | Tutar, geçerlilik, kaç gündür beklendiği |
| **Gönderim** | Kargo firması ve takip numarası |
| **İptal sebebi** | Müşteriye aynen giden yazı |
| **Notlar** | İç notlar ve müşteriye gönderilenler |
| **Geçmiş** | Talebin geçtiği bütün aşamalar |

### 5.3.3. Durum değişiklikleri

Her durum değişikliği kayıt altına alınır ve müşteriye bildirim gönderir. Bazı durumlar arkalarında bir bilgi olmadan **değiştirilemez**:

| Durum | Ne sorulur | Hangi türde |
|---|---|---|
| İncelemede | — | Hepsi |
| Planlandı | Tarih, yapılacak iş, müşteriyle görüşüldü mü | Servis, parça |
| Teklif Verildi | Tutar, geçerlilik, not | Fiyat teklifi |
| Gönderildi | Gönderilen parça, kargo firması, takip no | Yedek parça |
| Kapandı | Yapılan iş / satış sonucu ve fiyatı | Hepsi |
| İptal | **Sebep ve açıklama — müşteriye aynen gider** | Hepsi |

**Servis randevusunda müşteriyle görüşme şarttır.** Çiftçi bildirime bakmayabilir ve servis aracı boşa gider. Tarih müşteriyle telefonda belirlenmeden randevu kaydedilemez; bildirim o konuşmanın yazılı teyididir.

**Yedek parçada ödeme kapısı vardır.** Müşteri parça bedelini önden gönderir. Ödeme onaylanmadan talep "İncelemede" veya "Gönderildi" durumuna alınamaz; kilitli durum çiplerine tıklanınca personel doğrudan ödeme onayına yönlendirilir. Ödeme onaylandığında talep **kendiliğinden** İncelemede durumuna geçer. İptal bu kuralın dışındadır — ödemesi hiç gelmemiş talebi kapatmak tam da ihtiyaç duyulan işlemdir.

**Kapanmış talep kapalı kalır.** Yanlışlıkla kapatıldıysa yalnız admin geri açabilir ve o açılış müşteriye bildirilmez; "tamamlandı" haberi almış kişiye "yeniden açıldı" demek kafa karıştırır.

### 5.3.4. Notlar

İki tür not vardır:

- **İç not** — yalnız backoffice’te görünür, ekibin kendi arasında.
- **Müşteriye gönder** — müşterinin uygulamasına düşer ve bildirim gider. Kargo takip numarası buradan iletilir.

Müşteriye giden not **geri alınamaz**; bu yüzden gönderilecek metin onay penceresinde bir kez daha gösterilir.

---

## 5.4. Müşteriler

<img src="gorseller/44-musteriler.png" alt="Müşteriler" width="100%">

*Görsel 5.5 — Müşteri listesi*

**Ne için var:** Uygulamaya kayıt olmuş müşterilerin listesi.

**Ekranda ne var:** Müşteri numarası, ad, konum, kayıtlı makine sayısı, talep sayısı. Süzgeçler: tarih aralığı, il, ilçe, makinesi olanlar/olmayanlar, serbest arama (ad, telefon, seri no).

**Müşteri detayında:** kayıtlı makineleri, seri numaraları, açtığı talepler. **Admin** müşterinin ad ve konum bilgisini düzeltebilir; telefon numarası buradan değişmez.

<img src="gorseller/45-musteri-detay.png" alt="Müşteri detayı" width="100%">

*Görsel 5.6 — Müşteri detayı*

---

## 5.5. Bayiler

<img src="gorseller/46-bayiler.png" alt="Bayiler" width="100%">

*Görsel 5.7 — Bayi listesi*

**Ne için var:** Bayi listesinin yönetimi.

**Kullanıcı ne yapabilir:**

- Bayileri il, ilçe ve verdiği hizmete göre süzer.
- **Bayi adına, adrese veya telefona göre arar.**
- Sütun başlıklarına tıklayarak sıralar.
- Excel'e aktarır ve Excel'den toplu liste yükler.

**Not:** Uygulamadaki bayi listesi de buradan beslenir. Backoffice’ten liste girilmediği sürece koddaki liste geçerlidir.

---

## 5.6. Geri bildirimler

<img src="gorseller/47-geri-bildirimler.png" alt="Geri bildirimler" width="100%">

*Görsel 5.8 — Geri bildirimler*

**Ne için var:** Müşterilerin uygulama hakkında yazdığı görüşler.

**Kullanıcı ne yapabilir:** Görüşü okur, okundu işaretler, cevap yazar. Yazılan cevap müşterinin Bildirimler ekranına düşer.

**Erişim:** Yalnız admin ve yönetici. Bu ekran uygulamanın gelişimi içindir, günlük işin parçası değildir.

---

## 5.7. Raporlar

<img src="gorseller/48-raporlar.png" alt="Raporlar" width="100%">

*Görsel 5.9 — Raporlar*

**Ne için var:** "Geçen dönem ne oldu" sorusuna bakan ekran. Dashboard "şu an ne oluyor" sorusuna bakar.

Bütün raporlar seçilen tarih aralığında çalışır, sütun başlığından sıralanır ve Excel'e aktarılır. **Uydurma sayı yoktur:** hesaplanamayan bir şey varsa boş kalır.

| Rapor | Hangi soruyu cevaplar |
|---|---|
| **Dönem özeti** | Ne geldi, ne kapandı, ne kadar sürdü. Önceki dönemle yüzde karşılaştırmalı. **En yavaş %10** sütunu ortalamanın gizlediği kuyruğu gösterir. |
| **Para akışı ve satış hunisi** | Hunide bekleyen teklif tutarı, satışa dönen, kaybedilen, servis tahsilatı, yedek parça tahsilatı, garanti kapsamında ücretsiz yapılan iş |
| **Fiyat teklifi sonuçları** | Fiyatı verilmiş her teklif: kapananlar sonucuyla, bekleyenler kaç gündür beklediğiyle |
| **Garanti maliyeti** | Hangi modelde servislerin kaçı garanti içinde. İmalatçı için en pahalı satır. |
| **Model arıza raporu** | Hangi model kaç kez arızalanıyor, en sık hangi belirtiyle |
| **En çok istenen parçalar** | Stok planlaması |
| **Destek ekranı konuları** | Müşteri destekte ne arıyor, nerede cevapsız kalıyor |
| **Personel performansı** | Kim kaç talep kapattı, ortalama ne kadar sürede |
| **Bekleyen işler** | İki tür bekleme bir arada: kimsenin bakmadığı talepler ve müşteri cevabı beklenen teklifler. "Neden bekliyor" sütunu ikisini ayırır. |
| **Müşteri sadakati** | Kaç müşteri ikinci kez döndü |
| **Bölge dağılımı** | Hangi ilden ne kadar iş geliyor |
| **Bayi raporu** | Müşterinin "makineyi nereden aldım" beyanına dayanır. **Satış rakamı değildir.** |
| **Müşteri ve makine kayıtları** | Uygulamanın büyümesi |

**Garanti hesabı** talebin **açıldığı tarihe** göre yapılır, bugüne göre değil: iki yıl önceki bir servis o gün garanti kapsamındaydı.

---

## 5.8. Destek kayıtları

<img src="gorseller/49-destek-kayitlari.png" alt="Destek kayıtları" width="100%">

*Görsel 5.10 — Destek kayıtları*

**Ne için var:** Müşterinin destek ekranında ne aradığını görmek.

**Ekranda ne var:**

- **Cevapsız kalan sorular** — en üstte, sıklık sırasıyla. Müşterinin destek ekranında **arayıp bulamadığı** cümleler. Bu listedeki her satır, kılavuzda ya da veri setinde eksik olan bir arıza kaydına işaret eder; kılavuzun bir sonraki baskısında eklenmesi gerekenleri gösterir.
- **Oturum listesi** — kim, hangi makine, kaç arızaya baktı, kaç araması karşılıksız kaldı, sonunda servis talebine mi döndü.
- **Oturum detayı** — o oturumda ne yapıldığı, sırasıyla.

**Nasıl toplanıyor:** Kullanıcı arama kutusuna üç harften uzun bir şey yazıp hiçbir sonuç çıkmazsa, yazmayı bıraktıktan sonra o cümle kaydediliyor. Her tuşa basış değil, tamamlanmış arama.

**Neden değerli:** Bu veri bugüne kadar hiçbir yerde toplanmıyordu. Hangi modelde hangi arızanın arandığı imalata giden geri bildirimdir; destek ekranının işe yarayıp yaramadığı da buradan ölçülür. Amaç çiftçinin sorununu ekrandan çözmektir — her oturum servis talebiyle bitiyorsa ekran işini yapmıyor demektir.

---

## 5.9. Duyurular

<img src="gorseller/50-duyurular.png" alt="Duyurular" width="100%">

*Görsel 5.11 — Duyurular*

**Ne için var:** Müşterilere toplu duyuru ve uyarı göndermek.

**İki tür vardır ve aralarındaki fark hukukidir:**

| Tür | Örnek | Kime gider |
|---|---|---|
| **Duyuru** | Kampanya, yeni ürün, bayi etkinliği | Yalnız **ticari ileti izni** vermiş müşterilere. 6563 sayılı kanun bunu şart koşar. |
| **Önemli uyarı** | Güvenlik uyarısı, geri çağırma | **Herkese.** Hizmete ilişkin bildirimdir, ticari ileti değildir; zaten görülmemesi tehlikelidir. |

Yanlış tür seçmek hukuki sonuç doğurduğu için ekranda kimlere gideceği yayınlamadan önce yazılıdır.

**Görsel eklenebilir.** Önerilen ölçü 1200 × 675 piksel (16:9), en fazla 5 MB, JPG veya PNG. Bu bilgi ekranda da yazılıdır. Başka oranda görsel kırpılmaz, olduğu gibi gösterilir.

**Metin çevrilmez.** Personelin yazdığı cümle müşteriye aynen gider; yurtdışı müşterileri için ayrıca İngilizce duyuru yayınlanmalıdır.

**Geri çekme:** Yayınlanan duyuru geri çekilebilir; duyuruyu daha önce görmüş müşterilerin bildirim listesinden de silinir.

---

## 5.10. Numara değişikliği talepleri

<img src="gorseller/51-numara-talepleri.png" alt="Numara değişikliği talepleri" width="100%">

*Görsel 5.12 — Numara değişikliği talepleri. Karşılığı: Bölüm 4.3 (uygulama)*

**Ne için var:** Telefon numarası değişen müşterinin hesabına erişimini sağlamak.

**Nasıl çalışır:** Müşteri uygulamadan talep bırakır. Backoffice’te talebin yanında iki otomatik kontrol görünür:

- Talepteki seri numarası müşterinin kayıtlı makinelerinden biri mi?
- Talepteki eski numara hesaptaki numarayla aynı mı?

Admin bu iki kontrole bakarak onaylar veya reddeder. Onaylanırsa numara değişir ve müşteriye bildirim gider.

**Erişim:** Yalnız admin.

---

## 5.11. Personel

<img src="gorseller/52-personel.png" alt="Personel" width="100%">

*Görsel 5.13 — Personel*

**Ne için var:** Backoffice hesaplarının yönetimi.

**Kullanıcı ne yapabilir:** Personel ekler, rolünü belirler, hesabı kapatır veya siler. Excel'e aktarır, Excel'den toplu yükler.

**Koruma:** Son admin hesabı silinemez; silinseydi backoffice’e bir daha girilemezdi.

**Erişim:** Ekleme ve silme yalnız adminde; yönetici listeyi görür.

---

## 5.12. İşlem kaydı

<img src="gorseller/53-islem-kaydi.png" alt="İşlem kaydı" width="100%">

*Görsel 5.14 — İşlem kaydı*

**Ne için var:** Backoffice’te ve uygulamada olan her şeyin tek deftere yazılması.

**Kaydedilenler:** Backoffice girişi ve çıkış, durum değişiklikleri, not eklemeleri, ödeme onayları, personel işlemleri, müşteri bilgisi düzeltmeleri, bayi listesi değişiklikleri, duyuru yayınları, Excel aktarımları ve müşterinin uygulamadan yaptıkları.

**Süzgeçler:** İşlem türü, tarih aralığı, personel adı veya numarası, serbest arama.

**Not:** Bu ekran süzgeç seçilmeden liste getirmez. Amaç bir soruyu cevaplamaktır, listeyi gözle taramak değil.

---

## 5.13. Çıkış

<img src="gorseller/54-cikis-onayi.png" alt="Çıkış onayı" width="100%">

*Görsel 5.15 — Çıkış onayı*

**Ne için var:** Oturumu kapatmak.

**Neden onay isteniyor:** Sol menünün dibinde, kişinin kendi adının hemen altındadır; profil düğmesine basmak isteyen kişi yanlışlıkla çıkışa dokunabilir. Ortak bilgisayarda çalışılan bir ekranda bu, yarım kalmış bir talep formunun kaybolması demektir. Onay penceresi kimin oturumunun kapatılacağını da yazar.

---

# 6. Ekranlar arası bağlantılar

Bu bölüm, birden fazla ekranı birlikte ilgilendiren özellikleri anlatır. Her başlıkta bağlantının iki ucu — müşterinin gördüğü ekran ve personelin gördüğü ekran — yan yana verilmiştir.

## 6.1. Talebin uçtan uca yolculuğu

```
MÜŞTERİ (uygulama)                    PAKSAN (backoffice)
─────────────────────                 ─────────────────────
Talep formu
   │ fotoğraf, sesli not
   ▼
Talep gönderildi  ──────────────────► Talepler ekranı
                                          │ "Yeni" kutusunda
Bildirim: alındı  ◄───────────────────────┤
                                          ▼
                                      İncelemede
Bildirim  ◄───────────────────────────────┤
                                          ▼
                                      Planlandı / Teklif / Gönderildi
Bildirim + talep detayı ◄─────────────────┤
                                          ▼
                                      Kapandı  (yapılan iş yazılır)
Talep detayında  ◄────────────────────────┘
"Yapılan iş" görünür
```

Her okun karşılığı bir kayıttır: kim, ne zaman, ne yaptı.

<img src="gorseller/24-talep-detay.png" alt="Müşteri: talep detayı" width="270">
<img src="gorseller/43-talep-detay.png" alt="PAKSAN: talep detayı" width="620">

*Görsel 6.1 — Aynı talep, iki ekran. Solda müşterinin gördüğü; sağda personelin gördüğü. Personel randevu tarihini girdiğinde müşteri ekranındaki "Randevu verildi" kartı ve bildirim o an oluşur.*

## 6.2. Destek ekranından servis talebine

Açılan her arızanın altında **Servis talebi oluştur** düğmesi durur. Kılavuz o arıza için yetkili servis istiyorsa düğme öne alınır ve üstünde uyarı çıkar. Düğme servis talebi formunu açar; makine bilgisi ve seri numarası hazır gelir.

Müşterinin destek ekranında hangi arızaya baktığı kayıt altına alınır ve backoffice’te **Destek Kayıtları** ekranında görünür. Servis ekibi, gelen talebin arkasında müşterinin kılavuzda neye baktığını görebilir.

<img src="gorseller/12-destek-cozum.png" alt="Destek: sebep ve çözümler" width="270">
<img src="gorseller/21-talep-servis.png" alt="Servis talebi formu" width="270">
<img src="gorseller/49-destek-kayitlari.png" alt="Backoffice: destek kayıtları" width="620">

*Görsel 6.2 — Zincirin üç halkası: çiftçi arızayı açar, çözemezse aynı ekrandan servis talebi formuna geçer, baktığı arıza backoffice’te Destek Kayıtları ekranına düşer.*

## 6.3. Kılavuz ekranından arıza listesine

Kullanım kılavuzundaki "Sık karşılaşılan sorunlar" bölümü, arıza listesini kopyalamaz; Destek ekranındaki listeye yönlendirir. Böylece veri seti yenilendiğinde iki ekran ayrışmaz.

<img src="gorseller/19-kilavuz.png" alt="Kılavuz ekranı" width="270">
<img src="gorseller/11-destek-ariza-listesi.png" alt="Destek: arıza listesi" width="270">

*Görsel 6.3 — Kılavuzdaki düğme, Destek ekranındaki arıza listesini açar. Arıza listesi tek yerde tutulur.*

## 6.4. Fiyat teklifinden bayiye

Makineler bayiye satılır, son kullanıcıya bayi satar. Bu yüzden uygulamadan gelen fiyat teklifi talebinin içinde, o müşteriye bakacak bayi yazılıdır:

1. Müşterinin **ilçesindeki** satış bayisi
2. Yoksa **ilindeki** satış bayisi
3. İlinde bayi yoksa **kuş uçuşu en yakın üç bayi**, mesafeleriyle

Yalnız satış yetkisi olan bayiler gösterilir; yedek parça bayisine makine teklifi yönlendirmenin anlamı yoktur.

<img src="gorseller/23-talep-teklif.png" alt="Fiyat teklifi talebi" width="270">
<img src="gorseller/46-bayiler.png" alt="Backoffice: bayiler" width="620">

*Görsel 6.4 — Müşteri ürünü seçer; talep backoffice’e düştüğünde içinde o müşteriye bakacak bayi yazılı gelir. Bayi listesi Bayiler ekranından beslenir.*

## 6.5. Yurtdışı talepleri

Konumu Türkiye dışında olan müşterinin talebi **backoffice’e düşmez**; ihracat ekibinin e-posta adresine gider ve kayda geçer.

**Neden ayrı:** Yurtdışındaki iş Türkiye'deki işten başka yürür. Servisi yerel distribütör verir, parça gümrükten geçer, fiyat ihracat listesinden döviz üzerinden verilir. Servis ekibinin ekranında yapamayacağı bir iş, satış ekibinin ekranında yanlış fiyat listesinden cevaplanacak bir talep birikmemelidir.

**Karar konum ülkesine göre verilir**, telefon ülkesine göre değil: Almanya'da yaşayan ve Türk numarası taşıyan müşteri yurtdışı müşterisidir, makinesi oradadır.

## 6.6. Yedek parça ödeme zinciri

```
Müşteri: parça + adet seçer, fiyatı görür
   ▼
Müşteri: fatura bilgileri + teslimat adresi
   ▼
Müşteri: havale yapar, dekontu yükler
   ▼
Talep numarası havale açıklamasında
   ▼
PAKSAN: beklenen tutarı görür, dekontu açar
   ▼
PAKSAN: ödemeyi onaylar  ──► talep kendiliğinden İncelemede'ye geçer
   ▼                          müşteriye bildirim gider
PAKSAN: parçayı hazırlar, kargoya verir
   ▼
PAKSAN: takip numarasını girer  ──► müşteriye bildirim gider
   ▼
Talep kapanır
```

<img src="gorseller/22-talep-parca.png" alt="Yedek parça talebi formu" width="270">
<img src="gorseller/25-talep-detay-parca.png" alt="Müşteri: parça talebi detayı" width="270">

*Görsel 6.5 — Parça seçimi ve fiyatın müşteri tarafında görünmesi; ödeme onaylandıktan sonra talep detayında görünen ödeme bölümü.*

**Kilit noktası:** Ödeme onaylanmadan talep ilerletilemez. Personel kilitli durum çipine tıkladığında doğrudan ödeme onayı bölümüne yönlendirilir (bkz. Bölüm 5.3.3).

## 6.7. Bildirim ve talep detayı ilişkisi

Bildirime dokunan kişi bir şey **öğrenmek** ister. Bu yüzden talep bildirimleri profildeki listeye değil, talebin kendi ekranına gider: orada iptal sebebi, verilen teklif, kargo takip numarası ve yapılan iş yazılıdır.

<img src="gorseller/27-bildirimler.png" alt="Bildirimler" width="270">
<img src="gorseller/25b-talep-detay-teklif.png" alt="Talep detayı" width="270">

*Görsel 6.6 — "Teklifiniz hazırlandı" bildirimine dokunan müşteri doğrudan teklifin yazılı olduğu ekrana gelir.*

---

# 7. Destek veri seti ve güvenilirlik

## 7.1. Temel kural

> **Kaynakta olmayan bilgi veri setine giremez.**

Bu bir slogan değil, çalışan bir mekanizmadır. Her kaydın alıntısı, kılavuzun ham sayfa metniyle otomatik olarak karşılaştırılır ve doğrulanmadan onaylanmaz.

## 7.2. Kaynak kılavuzlar

| Kılavuz | Sayfa | Arıza kaydı |
|---|---:|---:|
| Hammer | 50 | 25 |
| Twin Hammer | 49 | 25 |
| Paksan Balya (Süper / Yunus) | 57 | 25 |
| i-Pak Yuvarlak Balya | 61 | 25 |
| Orka 870 | 164 | 21 |
| **Toplam** | **381** | **121** |

## 7.3. Uygulamaya giren kayıt türleri

| Tür | Adet | Ne işe yarar |
|---|---:|---|
| Arıza kaydı | 121 | Kılavuzun arıza tablosundaki bir sorun |
| Kontrol sorusu | 200 | "Şu durumu kontrol edin" |
| Sonuç | 205 | Sebep + çözüm adımları |
| Hızlı cevap | 179 | Teknik özellikler |
| Kullanım kartı | 44 | Prosedür, makine bilgisi, servis bildirimi |
| Güvenlik uyarısı | 262 | Çözüm adımlarından önce gösterilir |

## 7.4. Kalite denetimi

| Denetim | Sonuç |
|---|---|
| Şema doğrulama hatası | 0 |
| Regresyon senaryosu | 341, hepsi geçiyor |
| İnsan incelemesinde bekleyen kayıt | 84 |
| Uygulamaya alınmayan arıza kaydı | 15 |

**Uygulamaya alınmayan 15 kayıt**, sebep–çözüm satırları insan incelemesinde beklediği için dışarıda tutulmuştur. Dokununca boş açılan bir satır koymak yerine gösterilmemişlerdir; onaylandıklarında kendiliğinden gelirler.

## 7.5. Bilinen boşluklar

- Yem karma, silaj, çayır ve toprak işleme makinelerinin kılavuzları henüz işlenmemiştir. Bu makineler destek ekranındaki makine listesinde yer almaz.
- Aynı parçanın farklı kılavuzlarda farklı değerle geçtiği yerler tespit edilmiş ve raporlanmıştır; **silinmemişlerdir**. Hangisinin doğru olduğuna PAKSAN teknik ekibinin karar vermesi gerekir.
- Parça listeleri ve yağlama tabloları henüz aktarılmamıştır.
- **ORKA 870** ve **Twin Hammer** modellerinde Hızlı Cevaplar sekmesi boştur; o kılavuzların teknik özellik tabloları henüz işlenmemiştir. Arıza listesi ve güvenlik uyarıları çalışır.
- **ORKA 870** ve **i-Pak** modellerinde Kullanım sekmesi boştur.

---

# 8. Kişisel verilerin korunması

## 8.1. İşlenen veriler

Aydınlatma metninde sayılanlar:

- Kimlik ve iletişim: ad soyad, cep telefonu
- Konum: il, ilçe / köy
- Anlık konum: yalnız "en yakın bayiyi bul" kullanıldığında, yalnız telefonun içinde
- Ürün: seri numarası, model, üretim yılı
- Talep bilgisi: taleplerde yazılanlar
- **Fatura ve teslimat:** yedek parça siparişinde fatura adı, TC kimlik veya vergi numarası, teslimat adresi, ödeme dekontu
- Destek kayıtları: destek ekranında bakılan arızalar ve arama kutusuna yazılan cümleler

## 8.2. Uygulanan tedbirler

- Kimlik ve vergi numaraları ekranda tam gösterilmez; yalnız son dört hane görünür.
- Ticari ileti (kampanya, duyuru) izni ayrı alınır ve profilden geri çekilebilir. Hizmete ilişkin bildirimler bu izinden bağımsızdır.
- Hesap silme uygulamadan yapılmaz; KVKK kapsamındaki silme talebi PAKSAN'a iletilir ve yetkili tarafından yürütülür.

## 8.3. Bekleyen iş

> KVKK metinleri taslak hâldedir. **Hukukçu onayı, resmî unvan eki ve VERBİS bilgisi gereklidir.**

---

# 9. Yayına çıkmadan tamamlanması gerekenler

Uygulama demo olarak çalışmaktadır. Aşağıdaki kalemlerin çoğu **bilgi eksiğidir, kod değil**: gerçek veriler geldiğinde yalnız ilgili dosya değişir, ekranlara dokunulmaz.

| # | Konu | Ne gerekiyor | Öncelik |
|---|---|---|---|
| 1 | **Backoffice şifresi** | İlk admin hesabının şifresi mutlaka değiştirilmeli | **Kritik** |
| 2 | **Sunucu** | Talepler şu an yalnız telefonda duruyor. Merkezi kayıt, SMS doğrulaması ve anlık bildirim gerekiyor. | **Yüksek** |
| 3 | **Banka hesapları** | Yedek parça ödemesi için gerçek IBAN'lar. Girilmeden ödeme ekranı hesap bilgisi göstermiyor. | **Yüksek** |
| 4 | **Yedek parça fiyatları** | Gerçek fiyat listesi ve parça kodları. Şu anki 30 kayıt demo içindir. | **Yüksek** |
| 5 | **Bayi listesi** | Gerçek bayiler: ad, il/ilçe, adres, telefon, verdiği hizmetler | **Yüksek** |
| 6 | **KVKK metinleri** | Hukukçu onayı, resmî unvan eki, VERBİS bilgisi | **Yüksek** |
| 7 | **İhracat e-postaları** | Yurtdışı taleplerinin gideceği adresler | Orta |
| 8 | **Ürün bilgileri** | Gerçek teknik özellikler, PDF kılavuzlar, tanıtım videoları | Orta |
| 9 | **Belirti ve parça adları** | Servis ekibinin kullandığı gerçek adlarla değiştirilmeli | Orta |
| 10 | **Garanti süresi** | Şu an 2 yıl varsayıldı; doğrulanmalı | Orta |
| 11 | **Play Store** | Gerçek imza anahtarı ve mağaza kaydı | Aşama 4 |

## Sunumda söylenmesi gereken

Ekranlarda görünen **bayi listesi, yedek parça fiyatları ve bazı ürün özellikleri temsilîdir.** Ekranın nasıl çalıştığını göstermek için konulmuşlardır.

---

# 10. Sonraki aşamalar

## Aşama 2 — Sunucu

Taleplerin gerçekten PAKSAN'a ulaşması, kayıtların merkezi tutulması, hangi seri numarasının kimde olduğunun takibi, SMS ile doğrulama ve telefona anlık bildirim.

**Bu aşamadan sonra kazanılacaklar:** Müşteri telefonunu değiştirse de makineleri ve talepleri gelir. Talepler tek bir yerde toplanır. Bildirimler uygulama kapalıyken de ulaşır.

## Aşama 3 — Bayi Backoffice

Bayilerin kendi bölgelerindeki talepleri görmesi. Fiyat teklifi yönlendirmesi bugün backoffice’te bilgi olarak duruyor; bayi kendi ekranından takip edebilir.

## Aşama 4 — Yayın

Play Store kaydı, gerçek imza anahtarı, kurulum ve tanıtım.

## Değerlendirilmesi önerilenler

- **Kalan kılavuzların işlenmesi.** Yem karma, silaj, çayır ve toprak işleme makineleri destek ekranında henüz yok. Beş kılavuzun işlenmesi bir yöntem ortaya çıkardı; kalanları aynı hattan geçirmek mümkün.
- **Sesli notların yazıya çevrilmesi.** Talebe eklenen ses kaydı otomatik metne dönüştürülüp backoffice’e düşerse, sesli notların içinde arama yapılabilir hâle gelir. Çözümlemenin talebi bekletmemesi önemlidir: talep anında backoffice’e düşmeli, metin sonradan üzerine binmelidir.
- **Logo ERP bağlantısı.** Makine kaydı yapıldığında faturanın kesildiği bayinin otomatik bulunması.

---

# 11. Ekler

## Ek A — Talep numaralandırma

| Ön ek | Tür | Örnek |
|---|---|---|
| SRV | Servis talebi | SRV2608209001 |
| YPR | Yedek parça talebi | YPR2608215823 |
| TKF | Fiyat teklifi talebi | TKF2608201288 |

Biçim: **ÖN EK + YYAAGG + 4 hane**. Müşteri telefonda numarayı okuduğunda hangi ekibe bağlanacağı numaradan anlaşılır.

## Ek B — Talep durumları

| Durum | Anlamı | Hangi türde |
|---|---|---|
| Yeni | Talep geldi, henüz kimse bakmadı | Hepsi |
| İncelemede | Ekip talebi aldı | Hepsi |
| Planlandı | Randevu verildi | Servis, parça |
| Teklif Verildi | Fiyat verildi, müşteri cevabı bekleniyor | Fiyat teklifi |
| Gönderildi | Parça kargoya verildi (talep kapanır) | Yedek parça |
| Kapandı | İş tamamlandı | Hepsi |
| İptal | Talep iptal edildi (sebebiyle) | Hepsi |

## Ek C — Uyarı eşikleri

| Eşik | Süre | Nerede görünür |
|---|---|---|
| Gecikmiş talep | 48 saat | Talep listesinde kırmızı ünlem, dashboard kutusu |
| Cevap bekleyen teklif | 14 gün | Talep listesinde mor işaret, dashboard kutusu, tarayıcı bildirimi |
| Randevu hatırlatması | 24 saat önce | Müşterinin bildirimlerinde |

## Ek D — Rol yetki tablosu

| İşlem | Admin | Yönetici | Servis | Parça | Satış |
|---|:-:|:-:|:-:|:-:|:-:|
| Kendi taleplerini görme | ● | ● | ● | ● | ● |
| Bütün talepleri görme | ● | ● | | | |
| Müşteri listesi | ● | ● | ● | ● | ● |
| Müşteri bilgisi düzeltme | ● | | | | |
| Bayi listesi görme | ● | ● | ● | ● | ● |
| Bayi listesi düzenleme | ● | ● | | | |
| Raporlar | ● | ● | | | |
| Destek kayıtları | ● | ● | | | |
| Duyuru yayınlama | ● | ● | | | |
| Geri bildirimler | ● | ● | | | |
| Numara değişikliği onayı | ● | | | | |
| Personel açma / silme | ● | | | | |
| İşlem kaydı | ● | ● | | | |

## Ek E — Teknik künye

| | |
|---|---|
| Uygulama | React + Capacitor, Android 5.1 ve üzeri |
| Backoffice | React, tarayıcıdan çalışır, kurulum gerektirmez |
| Uygulama kimliği | `com.paksanmakina.app` (Play Store'a yüklendikten sonra değiştirilemez) |
| Uygulama adı | PAKSAN Connect |
| Destek verisi | `mobile_support_package.json` — veri seti 0.2.0, paket 1.0.0 |
| Ekran görüntüleri | `tools/ekran-goruntusu.mjs` ile üretilir, elle alınmaz |

---

*PAKSAN Connect 0.9.2 · 21 Ağustos 2026 · Demo sürümü, dış paylaşıma kapalıdır.*
