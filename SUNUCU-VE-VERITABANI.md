> ## ⚠ YERİNİ İKİ BELGE ALDI — güncel değil
>
> Bu belge (4 Eylül 2026) sunucu ve veritabanı konusunu ilk kez
> anlatıyordu. O günden sonra konu ikiye ayrıldı ve ikisi de
> ayrıntılandı:
>
> - **Canlıya nasıl çıkılacak, ne satın alınacak:** `CANLIYA-CIKIS.md`
> - **Veritabanının kendisi:** `veritabani/tasarim.md`
>
> Çelişki olursa o iki belge geçerlidir. Burası tarihsel kayıt olarak
> duruyor.

# Sunucu ve Veritabanı — Sıfırdan Anlatım

Bu belge tek bir soruyu cevaplıyor: **proje bittiğinde, onu
bilgisayarımdan alıp gerçek kullanıcıların telefonuna nasıl
ulaştıracağız?**

`CANLIYA-CIKIS.md` "neler eksik, hangi sırayla" diyor. Bu belge
"veritabanı nedir, sunucu nasıl kurulur, kod oraya nasıl gider" diyor.

Yazılım bilmeyen biri için yazıldı. Her terim ilk geçtiği yerde
açıklanıyor. Hiçbir şey bildiğiniz varsayılmıyor.

> **Bu sürüm PAKSAN'ın kendi sunucularına göre yazıldı.** Şirkette
> hâlihazırda bir "ortak" dosya sunucusu, SolidWorks PDM sunucusu ve
> LOGO altyapısı var; kurulum oraya yapılacak. Belgenin ilk hâli
> dışarıdan sunucu kiralamayı anlatıyordu, o kısım baştan yazıldı.

---

## 1. Bugün elimizde tam olarak ne var

Bunu netleştirmeden gerisi havada kalır.

`npm run build` yazdığınızda bilgisayarınızda üç klasör oluşuyor:

| Klasör | İçindeki | Ne işe yarıyor |
|---|---|---|
| `dist/` | 52 dosya · 10,5 MB | Müşteri uygulaması (APK'ya da bu giriyor) |
| `dist-backoffice/` | 22 dosya · 7,8 MB | Personel paneli |
| `dist-bayi/` | 26 dosya · 7,8 MB | Bayi paneli ve uygulaması |

Bu klasörlerin içinde ne var? **Sadece dosya.** HTML, JavaScript, resim,
yazı tipi. Başka bir şey yok.

Bu önemli, çünkü şu anlama geliyor: **bu dosyaları bir USB belleğe atıp
başka bir bilgisayarda açsanız çalışır.** İnternete bile gerek yok.

### Peki veriler nerede duruyor?

Tarayıcının kendi hafızasında. Buna `localStorage` deniyor — tarayıcının
her siteye ayırdığı küçük bir not defteri.

Şu an 16 ayrı "defter" kullanılıyor:

```
requests          talepler
machines          müşterinin kaydettiği makineler
makineKayitlari   makine kayıt defteri
personel          backoffice personeli
duyurular         duyurular ve bildirimler
islemKaydi        kim ne yaptı kaydı
panelIcerik       bayi listesi
bayiSiparis       bayi siparişleri
bayiStok          bayi stokları
...
```

**Bu defterlerin üç kritik özelliği vardır:**

1. **Sadece o tarayıcıda varlar.** Sizin bilgisayarınızdaki backoffice
   ile müşterinin telefonundaki uygulama birbirini göremez. Aynı
   tarayıcıda açılırlarsa görürler — demoyu böyle yapıyoruz.
2. **Silinebilirler.** Kullanıcı tarayıcı verisini temizlerse ya da
   uygulamayı silerse her şey gider.
3. **Kimse denetlemiyor.** Tarayıcının geliştirici araçlarını açan biri
   bu defterleri elle değiştirebilir.

Yani bugün elimizde **çalışan bir vitrin** var. Bütün ekranlar gerçek,
bütün akışlar işliyor — ama her kullanıcı kendi adasında.

---

## 2. "Canlıya çıkmak" aslında iki ayrı iş

En sık karışan yer burası. İkisini ayırmak lazım:

### İş A — Ekranları erişilebilir bir yere koymak
Yukarıdaki üç klasörü, dışarıdan açılabilen bir yere yüklemek.
**Kolay.** Bir öğleden sonra sürer.

### İş B — Sunucu programı ve veritabanı kurmak
Amaç, verilerin ortak bir yerde durması ve herkesin aynı veriyi görmesi.
**Zor.** Aylar sürer.

**İş A tek başına yapılırsa ne olur?** Uygulama internetten açılır ama
hiçbir şey değişmez: her kullanıcı yine kendi adasında olur. Talep yine
PAKSAN'a ulaşmaz.

Yani **İş B kaçınılmaz.** Aşağıdaki bölümlerin çoğu onu anlatıyor.

---

## 3. PAKSAN'ın mevcut altyapısı — ve neyi çözdüğü

Şirkette bugün en az üç sunucu var:

| Sunucu | Ne yapıyor | Kim kullanıyor |
|---|---|---|
| "Ortak" dosya sunucusu | Herkesin çalışmalarını koyduğu paylaşımlı klasör | PAKSAN çalışanları |
| SolidWorks PDM sunucusu | Teknik çizimlerin kasası | Tasarım ekibi |
| LOGO sunucusu | ERP — muhasebe, stok, fatura, cari | Muhasebe, satış, depo |

Bu **çok iyi bir başlangıç.** Şu üç şey zaten var: fiziksel sunucular,
onlara bakan biri ve bir internet bağlantısı. Sıfırdan başlamıyoruz.

### Ama şunu netleştirmek gerekiyor: iç ağ ≠ internet

Bu belgenin en önemli cümlesi bu.

Yukarıdaki üç sunucunun ortak özelliği: **hepsi şirketin içinden
kullanılıyor.** Bir çalışan "ortak" klasörünü açabiliyor çünkü aynı ağa
bağlı — aynı binada, aynı kablo düzeninde. Buna **iç ağ** (yerel ağ)
deniyor.

Bu sunucuların internetten erişilebilir olması **gerekmiyor** ve büyük
ihtimalle **erişilebilir değiller.** Doğrusu da bu: teknik çizimlerin
durduğu bir sunucunun internete açık olması istenmez.

**Bizim ihtiyacımız farklı.** Konya'daki bir çiftçi, telefonundan,
şirket ağına hiç bağlı olmadan uygulamayı açıp talep gönderecek. Yani
bir sunucunun **dışarıya açık** olması gerekiyor.

Bunu bir binaya benzetelim:

- Ortak klasör, PDM ve LOGO = binanın **iç odaları.** Kartı olan girer.
- Bizim ihtiyacımız = **sokağa açılan bir vitrin.** Herkes görebilmeli.

Vitrin binanın içinde olabilir — ama sokakla iç odalar arasına bir
duvar konması şartıyla. O duvarın adı aşağıda.

### Yani ne yapılacak

Var olan sunuculardan birine kurulmayacak. **Yeni bir sunucu
eklenecek** — büyük ihtimalle fiziksel değil, mevcut donanım üzerinde
açılan yeni bir *sanal sunucu*.

> **Sanal sunucu nedir?** Güçlü bir fiziksel bilgisayarı, birbirinden
> habersiz çalışan birkaç ayrı bilgisayara bölme yöntemi. Her biri
> kendi işletim sistemine, kendi diskine, kendi adresine sahip;
> birindeki sorun ötekini etkilemiyor. Şirketlerin çoğu sunucularını
> böyle çalıştırır — PAKSAN'ınkiler de muhtemelen öyle.

Bunun anlamı: **yeni donanım almanız gerekmeyebilir.** Mevcut
sunucularda boş kaynak varsa, oraya bir sanal sunucu açılır.

---

## 4. Önce cevaplanması gereken sorular

Buradan sonrası, altyapının bugünkü hâline bağlı. Siz de bilmiyorsunuz,
ben de bilemem. **Bu listeyi sunuculara bakan kişiye sorun** — iç
personel ya da dışarıdan hizmet aldığınız firma.

Cevapları bir yere yazın; yazılım firmasından teklif alırken de
soracaklar.

### Ağ ve erişim

1. Şirketin **sabit (statik) genel IP adresi** var mı? *(Dışarıdan
   ulaşılabilmesi için şart.)*
2. İnternet hattının hızı nedir, **yedek hat var mı?** Hat koparsa ne oluyor?
3. Daha önce **internete açık bir servis** çalıştırıldı mı? (Web sitesi,
   VPN, uzak masaüstü…)
4. **Güvenlik duvarı** (firewall) var mı, kim yönetiyor?
5. **DMZ** var mı? *(Aşağıda açıklanıyor — yoksa kurulması gerekecek.)*

### Donanım ve kapasite

6. Sunucular **sanallaştırma** üzerinde mi çalışıyor? (VMware, Hyper-V,
   Proxmox gibi)
7. **Boş kaynak var mı?** Yeni bir sanal sunucu için yaklaşık 4 çekirdek
   işlemci, 8 GB bellek, 100 GB disk gerekiyor.
8. Sunucular **nerede duruyor?** Ayrı bir sistem odası mı, yoksa normal
   bir odada mı?
9. **Kesintisiz güç kaynağı (UPS) ve jeneratör** var mı? Elektrik
   kesilince sunucular ne kadar dayanıyor?

### İşletim ve bakım

10. Sunuculara **kim bakıyor?** İç personel mi, dışarıdan firma mı?
11. **Yedekleme** nasıl yapılıyor? Ne sıklıkta, nereye?
12. **Yedekten geri dönme hiç denendi mi?**
13. Hafta sonu / gece bir sorun çıksa **kim müdahale ediyor?**

### LOGO tarafı

14. LOGO hangi **SQL Server sürümünü** kullanıyor?
15. LOGO için **REST servisi** açık mı, yoksa yalnız veritabanı
    bağlantısı mı var?
16. LOGO veritabanına **okuma yetkili ayrı bir kullanıcı** tanımlanabilir
    mi?

> **9. ve 13. sorular sandığınızdan önemli.** Ortak klasör çökerse
> çalışanlar canı sıkkın bekler. Uygulama sunucusu çökerse binlerce
> çiftçi ve bütün bayiler PAKSAN'a ulaşamaz. Aynı sunucu odası, iki
> farklı sonuç.

---

## 5. Üç kurulum senaryosu

Yukarıdaki soruların cevapları hangi senaryonun mümkün olduğunu
söyleyecek.

### Senaryo A — Her şey şirket içinde

Uygulama sunucusu ve veritabanı, PAKSAN'ın kendi donanımında; dışarıya
şirketin internet hattı üzerinden açılıyor.

- **Artısı:** Aylık sunucu kirası yok. Veri tamamen şirkette; KVKK
  açısından en rahat konum. LOGO ile aynı ağda olduğu için entegrasyon
  kolay.
- **Eksisi:** Fabrikanın interneti veya elektriği kesilirse **uygulama
  da kesilir.** Güvenlik tamamen sizin sorumluluğunuzda. Yedek internet
  hattı ve jeneratör artık isteğe bağlı değil, zorunlu.
- **Şartı:** Sabit IP, düzgün bir güvenlik duvarı ve **DMZ**.

### Senaryo B — Karma: vitrin dışarıda, kasa içeride *(önerilen)*

Uygulama sunucusu ve veritabanı yine şirkette. Ama dışarıya doğrudan
açılmıyor: veri merkezinde duran küçük bir sunucu "kapı görevlisi"
oluyor, gelen istekleri güvenli bir tünelle içeriye aktarıyor.

```
Çiftçinin telefonu
        │
        ▼
  Kapı sunucusu (veri merkezinde, küçük)
        │  güvenli tünel
        ▼
  Uygulama sunucusu + veritabanı (PAKSAN'da)
        │
        ▼
  LOGO (PAKSAN'da)
```

- **Artısı:** Şirket ağının IP adresi dışarıya hiç görünmüyor. Saldırı
  önce kapı sunucusuna gelir; o çökse bile iç ağa ulaşamaz. Veri yine
  şirkette kalır.
- **Eksisi:** Küçük bir aylık kira. Kurulumu biraz daha uzun.
- **Neden öneriyorum:** SolidWorks PDM ile aynı ağda internete açık bir
  sunucu bulundurmanın riskini büyük ölçüde kaldırıyor. Bir sonraki
  bölüm bunu anlatıyor.

### Senaryo C — Uygulama dışarıda, LOGO içeride

Uygulama ve veritabanı veri merkezinde; yalnız LOGO'ya bağlanmak için
şirket ağına güvenli bir hat çekiliyor.

- **Artısı:** Fabrikanın elektriği ya da interneti kesilse uygulama
  çalışmaya devam eder. Yedeklemeyi ve güvenliği veri merkezi üstlenir.
- **Eksisi:** Veri şirket dışında. Aylık kira var. "Kurulum burada
  olacak" tercihinize ters.

**Özet:** A mümkünse yapılabilir, ama **B daha güvenli ve maliyeti
küçük.** C'yi yalnız fabrika altyapısı yetersiz çıkarsa düşünün.

---

## 6. Güvenlik — atlanmaması gereken bölüm

Bu bölüm PAKSAN'a özel ve önemli.

### Sorun

SolidWorks PDM sunucusunda ne var? **PAKSAN'ın makine tasarımları.**
Şirketin en değerli varlığı, elli yıllık mühendislik birikimi.

İnternete açık her sunucu, sürekli saldırı altındadır. Bu bir olasılık
değil, gündelik gerçek: dünya çapında otomatik programlar durmadan açık
adres tarar. Uygulama sunucusu da bundan payını alacak.

Şimdi tehlikeli senaryo: uygulama sunucusu ele geçirilir. Eğer o sunucu
PDM ve dosya sunucusuyla **aynı ağdaysa**, saldırgan artık binanın
içindedir. Oradan yan tarafa geçmek — teknik deyimiyle *lateral
movement* — bilinen ve sık kullanılan bir yöntemdir.

Yani risk "uygulama çöker" değil. Risk **teknik çizimlerin çalınması.**

### Çözüm: ağ ayrımı (DMZ)

**DMZ**, dışarıya açık sunucuların konduğu ayrı bir ağ bölmesidir.
Askerî terimden geliyor: *arındırılmış bölge*, iki taraf arasındaki
tampon.

```
İnternet
   │
   ▼
Güvenlik duvarı
   │
   ├──▶ DMZ: uygulama sunucusu    ← dışarıdan erişilebilir
   │         │
   │         │ yalnız TEK bir bağlantı, yalnız LOGO'ya, yalnız okuma
   │         ▼
   └──▶ İç ağ: LOGO · PDM · ortak klasör   ← dışarıdan ERİŞİLEMEZ
```

Kural şu: **DMZ'deki sunucu iç ağa istediği gibi ulaşamaz.** Yalnız
izin verilen tek bir kapı açıktır — LOGO'ya, yalnız okuma yetkisiyle.
Uygulama sunucusu ele geçirilse bile saldırgan PDM'e ulaşamaz.

### Sorulacak tek soru

Bilgi işleme sorulacak soru şu: *"İnternete açacağımız sunucuyu, PDM ve
dosya sunucusundan ağ olarak ayırabilir miyiz?"*

- **Cevap "evet" ise** Senaryo A güvenle yapılabilir.
- **Cevap "hayır" ya da "nasıl yapılır bilmiyorum" ise** Senaryo B'ye
  geçin. Kapı sunucusu bu ayrımı kendiliğinden sağlıyor.

### Diğer standart önlemler

Bunlar hangi senaryoda olursa olsun geçerli:

- Uygulama sunucusuna **uzak masaüstü** internete açık bırakılmaz
- İşletim sistemi ve veritabanı **güncel tutulur**
- Veritabanı **dışarıdan hiç erişilemez** — yalnız uygulama sunucusundan
- Uygulamanın kullandığı veritabanı hesabı **sınırlı yetkilidir**
- Yönetici erişimlerinde **iki adımlı doğrulama**

---

## 7. Veritabanı nedir

**Veritabanı, veriyi düzenli tutan ve sorulara cevap veren bir
programdır.**

Excel'i düşünün: satırlar, sütunlar, tablolar. Veritabanı da öyle — ama
aynı anda binlerce kişi kullanabilir, milyonlarca satır tutabilir ve
"Konya'daki açık servis taleplerini tarihe göre sırala" gibi soruları
saniyenin altında cevaplar.

### Bugünkü defterler nasıl tabloya dönüşecek

Şu an `requests` adlı defterde talepler duruyor. Veritabanında bu bir
**tablo** olacak:

```
TALEPLER tablosu

 id  | no             | tur    | musteri_id | bayi_id | durum   | olusturma
-----+----------------+--------+------------+---------+---------+------------
 1   | SRV2609044033  | servis | 42         | 7       | yeni    | 04.09.2026
 2   | YPR2609049288  | parca  | 17         | 3       | kapandi | 03.09.2026
```

16 defterin her biri buna benzer bir tabloya dönüşecek. Bu iş
**yazılımcının işi** ve tahmini 1-2 haftalık bir çalışma.

### Hangi veritabanı — LOGO bunu değiştiriyor

Önceki sürümde PostgreSQL öneriyordum. **PAKSAN'ın LOGO kullandığını
öğrenince öneri değişiyor.**

LOGO Tiger, **Microsoft SQL Server** üzerinde çalışıyor. Yani şirkette
zaten bir SQL Server var ve bilgi işlem onu yönetmeyi biliyor:
kurulumunu, yedeğini, güncellemesini.

Bu durumda uygulama için de SQL Server kullanmak mantıklı:

| | Microsoft SQL Server | PostgreSQL |
|---|---|---|
| Bilgi işlem biliyor mu | **Evet, LOGO'dan** | Hayır, öğrenecek |
| Yedekleme düzeni | **Zaten kurulu** | Yeniden kurulacak |
| Lisans | Ücretli *(Express ücretsiz)* | Ücretsiz |
| Teknik yeterlilik | Fazlasıyla yeterli | Fazlasıyla yeterli |

**Öneri: SQL Server.** Sebebi teknik üstünlük değil; ikisi de bu iş
için fazlasıyla yeterli. Sebep şu: **bilgi işlemin bakabileceği bir şey
olmalı.** Kimsenin bilmediği yeni bir veritabanı, ilk sorunda kimsenin
dokunamadığı bir kutuya dönüşür.

> **Ücretsiz sürüm yeter mi?** SQL Server Express ücretsiz ama sınırlı:
> yaklaşık 10 GB veri, 1 işlemci, 1 GB bellek. Bizim veri türümüz —
> talepler, makine kayıtları, işlem geçmişi — düz metin ve sayıdan
> ibaret; 10 GB **yıllarca yeter.** Yer kaplayan fotoğraf ve videolar
> zaten veritabanına değil, diske yazılacak.
>
> Yine de: Express sürümünün 1 GB bellek sınırı yoğun kullanımda
> hissedilebilir. Şirkette zaten lisanslı SQL Server varsa oradan
> ilerleyin.

### İki şey kesinlikle ayrı kalacak

**1. Uygulama veritabanı LOGO'nun veritabanı DEĞİL.**

Ayrı bir veritabanı olacak, muhtemelen `paksan_connect` gibi bir adla.
LOGO'nun tablolarına dokunulmayacak.

**2. Uygulama LOGO'nun sunucusunda ÇALIŞMAYACAK.**

LOGO'nun kendi belgeleri bunu açıkça söylüyor: *"Sunucu üzerinde bir
başka server uygulaması çalıştırılmamalıdır."* Sebebi haklı — uygulama
sunucusundaki bir yük ya da hata, bütün şirketin ERP'sini durdurabilir.

Ayrıca güvenlik: LOGO sunucusu **hiçbir koşulda** internete açılmamalı.

İkisi konuşacak ama birleşmeyecek. Uygulama LOGO'ya "şu seri numarası ne
zaman fatura edilmiş" diye sorar; LOGO cevap verir. O kadar.

---

## 8. API nedir — ve neden şart

Burası genelde atlanıyor ama anlaşılması önemli.

### Telefon doğrudan veritabanına bağlanamaz mı?

**Hayır. Asla.** Sebebi güvenlik.

Telefondaki uygulama, kullanıcının cihazında çalışıyor. İçindeki her şey
— şifreler dahil — okunabilir. Uygulamaya veritabanı şifresi koysanız,
telefonu eline geçiren biri o şifreyle **bütün müşteri verisine**
erişirdi.

### Çözüm: araya bir kapıcı koymak

```
Telefon  ──istek──▶  API (sunucuda)  ──sorgu──▶  Veritabanı
         ◀─cevap──                   ◀─sonuç───
```

**API**, sunucuda çalışan ve şu işi yapan programdır:

1. Telefondan isteği alır: "Ahmet'in taleplerini ver"
2. **Kim olduğunu doğrular:** Bu gerçekten Ahmet mi?
3. **Yetkisini kontrol eder:** Ahmet sadece kendi taleplerini görebilir
4. Veritabanına sorar
5. Sadece Ahmet'e ait olanları geri gönderir

Veritabanı şifresi **sadece sunucuda** durur. Telefon onu hiç görmez.

### Bu neden özellikle bizim için kritik

Bugün "bu bayi sadece kendi taleplerini görsün" kuralı **ekranda**
uygulanıyor (`bayininTalepleri` fonksiyonu). Bu bir güvenlik önlemi
değil, bir görüntü tercihi.

Sunucu geldiğinde **aynı kural API'de tekrar yazılmak zorunda.**
Yazılmazsa bir bayi, tarayıcısının adres çubuğuyla oynayarak başka
bayilerin müşterilerini görebilir.

Bunu yazılım firmasına sözleşmede yazdırın.

### İyi haber: uygulama buna hazır

Proje baştan bu geçiş düşünülerek yazıldı:

- Bütün veri erişimi tek dosyadan geçiyor: `src/backoffice/veri.js`
- Gönderim tek dosyadan geçiyor: `src/lib/sunucu.js`
- Adresler ayarlarda hazır bekliyor: `src/config.js`

Yani **ekranlara dokunulmayacak.** Sunucu hazır olduğunda o dosyaların
içi değişecek, geri kalan her şey aynı kalacak. Bu, işin kabaca üçte
birini baştan halletmiş olmak demek.

---

## 9. Alan adı ve HTTPS

### Alan adı (domain)

`paksanmakina.com.tr` bir alan adı. Elinizde zaten var.

İnternetteki her sunucunun bir numarası var (`95.173.180.24` gibi).
Kimse numara ezberleyemeyeceği için **alan adı sistemi (DNS)** var:
"paksanmakina.com.tr yazınca şu numaraya git" diyen bir telefon rehberi.

### Alt alan adları — ücretsiz

Elinizde bir alan adı varsa, önüne istediğiniz kadar kelime
ekleyebilirsiniz. Hiçbir ek ücreti yok:

```
api.paksanmakina.com.tr          → uygulamanın konuştuğu sunucu
backoffice.paksanmakina.com.tr   → personel paneli
bayi.paksanmakina.com.tr         → bayi paneli
test.api.paksanmakina.com.tr     → test kopyası
```

Şirket içinde kurulumda bu adresler, PAKSAN'ın sabit IP adresini
gösterecek şekilde ayarlanır. Bunu, alan adınızı yöneten yerde bilgi
işlem birkaç dakikada yapar.

> **Mevcut web siteniz etkilenmez.** `www.paksanmakina.com.tr` nerede
> duruyorsa orada kalır; yeni adresler ondan bağımsızdır.

### HTTPS ve SSL sertifikası

Adres çubuğundaki **kilit simgesi**, bu site ile tarayıcı
arasındaki trafik şifreli, aradaki kimse okuyamıyor.

**Şart mı? Evet, tartışmasız.** Üç sebep:

1. Şifre ve kişisel veri taşıyoruz
2. HTTPS olmayan siteyi tarayıcılar "Güvenli değil" diye işaretliyor
3. Android uygulamalar HTTPS olmayan adrese bağlanmayı varsayılan olarak
   reddediyor

**Maliyeti sıfır.** *Let's Encrypt* adlı ücretsiz servis sertifika
veriyor; sunucudaki bir program 90 günde bir kendiliğinden yeniliyor.
Bilgi işlem bir kez kurar, bir daha uğraşılmaz.

---

## 10. Kod sunucuya nasıl gider

Bu adıma "deployment" ya da "yayına alma" denir.

### Bugün nasıl çalışıyoruz

```
Kod dosyaları  ──npm run build──▶  dist/ klasörü
```

Bu klasör bilgisayarınızda duruyor.

### Sunucuyla nasıl olacak

```
Kod  ──▶  Git deposu  ──▶  Derleme  ──▶  Sunucu  ──▶  Kullanıcı
```

**Git deposu nedir?** Kodun bütün geçmişini tutan bir arşiv. Projede
zaten kullanıyoruz — bugüne kadar yaptığımız her değişiklik orada,
gerekirse geri alınabiliyor.

Bu arşiv ya internette bir yerde durur (GitHub, GitLab) ya da **şirket
içinde kendi sunucunuzda** (GitLab'ın kurulabilen sürümü var). Kod
dışarı çıkmasın isteniyorsa ikincisi tercih edilir.

> **Sözleşmeye yazın:** Bu arşiv PAKSAN'ın olmalı, yazılım firmasının
> değil. Bu tek madde, projenin sahibi olup olmadığınızı belirler.

### İki yol

**Elle:** Yazılımcı sunucuya bağlanır, komutları çalıştırır. Basit ama
her seferinde insan gerektirir ve unutulan adım hata doğurur.

**Otomatik (CI/CD):** Kod arşive gönderildiği anda, bir robot derlemeyi
yapar ve sunucuya kurar. İnsan hatası ortadan kalkar. Kurması yarım gün
sürer, sonrasında hiç uğraşılmaz. **Önerilen budur.**

### Test ve canlı ayrımı

Bu, en pahalıya patlayan atlamadır.

**Test ortamı**, canlının birebir kopyasıdır ama içindeki veri sahtedir.
Yeni bir özellik önce oraya çıkar, orada denenir, sonra canlıya alınır.

Ayrı ortam olmazsa şu olur: bir düzeltme yapılır, doğrudan canlıya
verilir, gerçek müşteri talepleri kaybolur. Bu, olması **muhtemel** bir
şey değil — olması **kaçınılmaz** bir şeydir.

İyi haber: şirket içindeki kurulumda test ortamı **neredeyse bedava.**
İkinci bir sanal sunucu açmak yeni donanım gerektirmiyor.

| | Test | Canlı |
|---|---|---|
| Sanal sunucu | Küçük | Gerçek |
| Veritabanı | Ayrı, sahte veriyle | Gerçek, yedekli |
| SMS | Kapalı ya da tek numaraya | Açık |
| LOGO bağlantısı | Kapalı ya da LOGO'nun test kopyası | Gerçek, okuma yetkili |
| Uygulama | Play Store "iç test" kanalı | Play Store yayın |

**Altın kural: canlı veritabanına elle dokunulmaz.**

---

## 11. Bugünkü veriler ne olacak

Kısa cevap: **hiçbir şey taşınmayacak. Hepsi gidecek; gitmeli.**

Şu an tarayıcılardaki veri demo verisi — `Demo verisi yükle` düğmesinin
ürettiği 30 sahte müşteri, 68 sahte talep. Canlıya taşınmaz, taşınmamalı.

### Peki gerçek veri nereden gelecek

Üç kaynak:

**1. Sizin gireceğiniz sabit bilgiler.** Bunlar zaten kod dosyalarında
duruyor, sunucuya bir kez aktarılacak:

- Gerçek bayi listesi (`src/data/bayiler.js`)
- Ürünler ve teknik özellikleri (`src/data/products.js`)
- Parça listesi, il/ilçe listesi

**2. LOGO'dan gelecekler.** Fatura geçmişi, hangi makine hangi bayiden
satılmış. Bunlar aktarılmaz, **sorulur** — uygulama gerektiğinde LOGO'ya
sorar. LOGO aynı ağda olduğu için bu bağlantı kolay kurulur; asıl iş
LOGO tarafında okuma yetkili bir kullanıcı tanımlamak.

**3. Kullanıcıların üreteceği.** Talepler, makine kayıtları, siparişler.
Bunlar sıfırdan başlar. Bu normaldir: sistem açıldığı gün boştur, ilk
gerçek kullanıcıyla dolmaya başlar.

---

## 12. Yedekleme

**Yedek, verinin başka bir yerdeki kopyasıdır.**

Şirkette muhtemelen zaten bir yedekleme düzeni var — LOGO ve dosya
sunucusu için. **Yeni veritabanı otomatik olarak o düzene dahil
olmayacak.** Bilgi işleme açıkça söylenmesi gerekiyor.

### Doğru yedekleme neye benzer

- **Günde en az bir kez** otomatik alınır
- **Başka bir yerde** durur — aynı sunucudaki kopya yedek değildir;
  aynı binadaki yedek de yangında yedek değildir. En az bir kopya
  **fabrika dışında** olmalı
- **Geriye dönük tutulur:** son 7 gün, son 4 hafta, son 12 ay gibi.
  Sebebi: bir hata bugün fark edilmeyebilir; üç hafta öncesine dönmek
  gerekebilir
- **Denenmiş olur**

Son madde en çok atlanan ve en pahalıya patlayandır:

> **Geri yükleme en az bir kez denenmemişse, yedeğiniz yok demektir.**

Yıllarca yedek alıp, ihtiyaç anında yedeğin bozuk olduğunu fark eden
şirketler var. Yılda bir kez, test ortamına gerçek yedekten geri dönün.
Yarım gün sürer.

> **Fidye yazılımı notu:** Son yıllarda en yaygın saldırı, şirket ağına
> girip **yedekler dahil** her şeyi şifrelemek. Bu yüzden en az bir
> yedek kopyası, ağdan kopuk ya da değiştirilemez biçimde durmalı.
> Bilgi işleme sorun: *"Yedeklerimiz fidye yazılımına karşı korumalı
> mı?"*

---

## 13. Bir şey bozulduğunda

### İzleme

Sunucu çökerse **sizin haberiniz olmalı**, müşteri arayıp söylemeden
önce.

Bunun için "uptime monitor" denen basit servisler var: dakikada bir
adresinize bakarlar, cevap gelmezse SMS ya da e-posta atarlar. Ücretsiz
seçenekleri yeterli.

**Şirket içi kurulumda bu daha da önemli.** İzlemenin **dışarıdan**
yapılması gerekiyor: fabrikanın interneti koptuğunda, içeriden bakan bir
program bunu göremez.

### Kayıtlar (log)

Sunucu yaptığı her işi bir deftere yazar. Bir şey bozulduğunda
yazılımcının ilk bakacağı yer orasıdır. Kurulum sırasında bunun düzgün
ayarlanmasını isteyin.

### Kim müdahale edecek

Bu tabloyu **açılıştan önce, isimlerle** doldurun:

| Durum | Kim bakar | Ne kadar sürede |
|---|---|---|
| Sunucu çökmüş | ? | ? |
| Fabrika interneti kesik | ? | ? |
| Elektrik kesintisi uzuyor | ? | ? |
| Uygulama açılıyor ama talep gitmiyor | ? | ? |
| LOGO bağlantısı kopmuş | ? | ? |
| Bir bayi giremiyor | ? | ? |

İlk üçü **bilgi işlemin**, sonraki üçü **yazılım firmasının** işi. Bu
ayrımı baştan netleştirin; olay anında "bu bende değil" tartışması
yaşanmasın.

---

## 14. Maliyet

Şirket içinde kurulum, maliyet tablosunu belirgin şekilde değiştiriyor.

### Bir kerelik

| Kalem | Durum |
|---|---|
| Sunucu programı ve veritabanı yazılımı (API) | **En büyük kalem** — aylarca iş |
| LOGO entegrasyonu | Ayrı kalem; LOGO iş ortağı da dahil |
| Sanal sunucu kurulumu | Bilgi işlem, birkaç gün |
| Ağ ayrımı / DMZ kurulumu | Bilgi işlem ya da dışarıdan destek |
| Windows Server lisansı | Mevcut lisansla karşılanabilir — sorun |
| SQL Server lisansı | Express ücretsiz; mevcut lisans varsa gerekmez |
| Play Console geliştirici hesabı | 25 ABD doları, tek seferlik |
| KVKK metinlerinin hukukçu onayı | Hukuk danışmanınızın tarifesi |

### Her ay tekrarlayan

| Kalem | Şirket içinde |
|---|---|
| Sunucu kirası | **Yok** — kendi donanımınız |
| Sabit IP | ISS'ten, düşük |
| **Yedek internet hattı** | **Yeni ve zorunlu bir kalem** |
| Kapı sunucusu *(Senaryo B ise)* | Küçük |
| Elektrik ve soğutma | Zaten var, biraz artar |
| SMS gönderimi | **Adet başına** — kullandıkça |
| Bildirim gönderimi | Ücretsiz (Firebase) |
| Alan adı yenileme | Yılda bir, düşük |
| Bakım / destek anlaşması | Sözleşmeye bağlı |

**İki uyarı:**

**SMS.** Doğrulama kodu ve bildirim SMS'i adet başına ücretlendirilir.
Binlerce kullanıcıya SMS atmak, bütün sunucu masrafından pahalıya
gelebilir. Bildirimler SMS'le değil **push bildirimle** gönderilmeli —
o ücretsiz. SMS yalnız şifre doğrulama gibi zorunlu yerlerde.

**Yedek internet hattı.** Bugün fabrikanın interneti kesildiğinde
çalışanlar rahatsız olur, iş devam eder. Uygulama oraya taşındığında
aynı kesinti **binlerce çiftçinin PAKSAN'a ulaşamaması** demek. Bu, tek
hatla kabul edilebilir bir risk olmaktan çıkıyor.

---

## 15. Sıra — ne, ne zaman

### Aşama 0 — Şimdi (yazılımı beklemez)

**a) Bilgi işlemden bilgi toplayın.** Bölüm 4'teki 16 soru. Bu, projenin
en ucuz ve en kritik adımı; bir toplantıda biter ve sonraki her kararı
belirler.

**b) İçerikleri hazırlayın.** Hepsi PAKSAN'ın kendi işi:

- [ ] Gerçek bayi listesi
- [ ] Gerçek seri numarası biçimi
- [ ] Gerçek parça adları (servis ve yedek parça ekibinden)
- [ ] Banka hesapları (IBAN)
- [ ] KVKK metinlerini hukukçuya vermek
- [ ] Play Console kurumsal hesabı açmak

*Süre: 3-6 hafta, tamamen size bağlı.*

### Aşama 1 — Senaryo kararı

Bölüm 4'ün cevapları geldikten sonra A / B / C kararı verilir. Özellikle
**"internete açacağımız sunucuyu PDM'den ağ olarak ayırabilir miyiz"**
sorusunun cevabı belirleyici.

*Süre: bir toplantı.*

### Aşama 2 — Yazılımcı bulmak

Bu belgeyi, `CANLIYA-CIKIS.md`'yi ve Bölüm 4'ün cevaplarını verip teklif
alın.

*Süre: 2-4 hafta.*

### Aşama 3 — Altyapı kurulumu

Sanal sunucu açılır, veritabanı kurulur, ağ ayrımı yapılır, sabit IP ve
alan adları ayarlanır, SSL sertifikası alınır, test ve canlı ortamlar
ayrılır.

*Süre: 1-2 hafta. Bilgi işlem + yazılımcı birlikte.*

### Aşama 4 — API yazımı

En uzun iş. Talepler, hesaplar, yetkiler, dosya yükleme, bildirim.

*Süre: 2-4 ay.*

### Aşama 5 — LOGO bağlantısı

Paralel yürür ama **kritik yola koymayın**: LOGO gecikirse uygulama
LOGO'suz da çıkabilir. Aynı ağda olmak bu işi kolaylaştırıyor.

*Süre: 2-6 hafta.*

### Aşama 6 — Test

Önce PAKSAN personeli (2 hafta), sonra 3-5 bayi (1 ay), sonra tek
bölgede gerçek müşteriler (1 ay).

*Süre: 2-3 ay. Kısaltmayın.*

### Aşama 7 — Açılış

Play Store'da kademeli yayın: önce %5, sonra %20, sonra hepsi.

---

## 16. En kısa özet

1. **Bugün elimizde ekranlar var, sistem yok.** Veriler her kullanıcının
   kendi tarayıcısında; kimse kimseyi görmüyor.
2. **PAKSAN'ın sunucuları olması iyi bir başlangıç ama yeterli değil.**
   O sunucular **iç ağda** çalışıyor; bizim **dışarıya açık** bir
   sunucuya ihtiyacımız var. Mevcut donanım üzerinde yeni bir **sanal
   sunucu** açılarak çözülür — yeni donanım gerekmeyebilir.
3. **En kritik soru güvenlik:** internete açılacak sunucu, SolidWorks
   PDM ve dosya sunucusundan **ağ olarak ayrılmalı** (DMZ). Ayrılamıyorsa
   Senaryo B — dışarıda küçük bir kapı sunucusu.
4. **Veritabanı SQL Server olsun.** Teknik üstünlükten dolayı değil: LOGO zaten
   onu kullanıyor, bilgi işlem biliyor. Ama LOGO'nun veritabanından ve
   LOGO'nun sunucusundan **ayrı** olacak.
5. **API şart.** Telefon veritabanına doğrudan bağlanmaz; kimlik ve
   yetki kontrolü orada yapılır.
6. **Uygulama bu geçişe hazır yazıldı.** Ekranlar değişmeyecek, sadece
   üç dosyanın içeriği değişecek.
7. **Yedek internet hattı artık zorunlu.** Fabrikanın kesintisi, şimdi
   müşterinin kesintisi demek.
8. **Yedek denenmemişse yedek değildir.**
9. **Gerçekçi takvim: 6-9 ay.** İlk adım bir toplantı: Bölüm 4'teki 16
   soruyu bilgi işleme sorun.
