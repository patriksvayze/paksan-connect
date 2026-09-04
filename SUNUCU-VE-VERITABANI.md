# Sunucu ve Veritabanı — Sıfırdan Anlatım

Bu belge tek bir soruyu cevaplıyor: **proje bittiğinde, onu bilgisayarımdan
alıp gerçek kullanıcıların telefonuna nasıl ulaştıracağız?**

`CANLIYA-CIKIS.md` "neler eksik, hangi sırayla" diyor. Bu belge
"veritabanı nedir, sunucu nasıl kurulur, kod oraya nasıl gider" diyor.

Yazılım bilmeyen biri için yazıldı. Her terim ilk geçtiği yerde
açıklanıyor. Hiçbir şey bildiğiniz varsayılmıyor.

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

1. **Sadece o tarayıcıda varlar.** Sizin bilgisayarınızdaki backoffice ile
   müşterinin telefonundaki uygulama birbirini göremez. Aynı tarayıcıda
   açılırlarsa görürler — demoyu böyle yapıyoruz.
2. **Silinebilirler.** Kullanıcı tarayıcı verisini temizlerse ya da
   uygulamayı silerse her şey gider.
3. **Kimse denetlemiyor.** Tarayıcının geliştirici araçlarını açan biri
   bu defterleri elle değiştirebilir.

Yani bugün elimizde **çalışan bir vitrin** var. Bütün ekranlar gerçek,
bütün akışlar işliyor — ama her kullanıcı kendi adasında.

---

## 2. "Canlıya çıkmak" aslında iki ayrı iş

En sık karışan yer burası. İkisini ayırmak lazım:

### İş A — Ekranları internete koymak
Yukarıdaki üç klasörü, internetten erişilebilen bir yere yüklemek.
**Kolay ve ucuz.** Bir öğleden sonra sürer, yılda birkaç yüz lira tutar.
Hatta ücretsiz seçenekleri var.

### İş B — Sunucu ve veritabanı kurmak
Verilerin ortak bir yerde durması, herkesin aynı veriyi görmesi.
**Zor ve pahalı.** Aylar sürer, sürekli masrafı vardır.

**İş A tek başına yapılırsa ne olur?** Uygulama internetten açılır, ama
hiçbir şey değişmez: her kullanıcı yine kendi adasında olur. Talep yine
PAKSAN'a ulaşmaz.

Yani **İş B kaçınılmaz.** Aşağıdaki bölümlerin çoğu onu anlatıyor.

---

## 3. Sunucu nedir

**Sunucu, sürekli açık duran bir bilgisayardır.** Gerçekten bu kadar
basit. Farkları şunlar:

- **Hiç kapanmaz.** Sizin bilgisayarınız kapanır, sunucu kapanmaz.
- **Sabit bir adresi vardır.** İnternetteki her cihazın bir numarası var
  (IP adresi, örneğin `95.173.180.24`). Evdeki internet bağlantınızın
  numarası her gün değişir; sunucununki değişmez.
- **Bir veri merkezinde durur.** Klimalı, jeneratörlü, çift internet
  hatlı bir binada. Elektrik kesilse çalışmaya devam eder.
- **Ekranı, klavyesi yoktur.** Ona uzaktan, yazarak bağlanılır.

Sunucuyu **satın almazsınız, kiralarsınız.** Aylık ödersiniz, istediğiniz
zaman bırakırsınız.

### Üç kiralama biçimi

**1. VPS (sanal sunucu) — "boş bir bilgisayar kiralamak"**

Size bir bilgisayar verilir, içinde hiçbir şey yoktur. Her şeyi siz
kurarsınız: işletim sistemi ayarları, veritabanı, güvenlik duvarı,
yedekleme.

- *Artısı:* En ucuzu. Her şey sizin kontrolünüzde.
- *Eksisi:* Kuran ve bakan biri lazım. Güvenlik yamaları sizin
  sorumluluğunuzda.
- *Kimler veriyor:* Türkiye'de Turhost, Natro, Radore gibi firmalar;
  yurtdışında Hetzner, DigitalOcean, Linode.
- *Yaklaşık aylık:* Küçük bir sunucu birkaç yüz lira seviyesinde
  başlıyor. Kesin rakam için güncel fiyatlara bakılmalı.

**2. Yönetilen platform — "anahtar teslim"**

Kodu verirsiniz, gerisini onlar halleder. Sunucu ayarı, güvenlik,
yedekleme, ölçeklendirme onların işi.

- *Artısı:* Sistem yöneticisi gerekmez. Hızlı başlar.
- *Eksisi:* Daha pahalı. Kontrol daha az.
- *Kimler veriyor:* Railway, Render, Fly.io, Heroku.
- *Yaklaşık aylık:* VPS'in iki-üç katı.

**3. Bulut (AWS, Google Cloud, Azure) — "kurumsal"**

Büyük şirketlerin kullandığı. Çok güçlü, çok esnek, çok karmaşık.

- *Artısı:* Sınırsız büyüyebilir.
- *Eksisi:* PAKSAN'ın bugünkü ölçeği için gereksiz karmaşık. Faturayı
  anlamak bile ayrı bir uzmanlık.

**PAKSAN için önerim: VPS.** Kullanıcı sayısı (birkaç bin çiftçi, 20
bayi, birkaç düzine personel) tek bir orta boy sunucunun rahat
kaldıracağı bir yük. Yeter ki bakacak biri olsun.

### Sunucu Türkiye'de mi olmalı?

**Evet, tercihen.** İki sebep:

1. **KVKK.** Kişisel veri yurtdışına çıkarken ek yükümlülükler doğuyor.
   Veri Türkiye'de kalırsa bu sorun hiç doğmuyor.
2. **Hız.** Sunucu Almanya'daysa Konya'daki çiftçinin isteği oraya gidip
   dönüyor. Fark milisaniyelerle ölçülür ama tarlada zayıf şebekede
   hissedilir.

---

## 4. Veritabanı nedir

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

### Hangi veritabanı

İki yaygın seçenek var, ikisi de ücretsiz ve açık kaynak:

- **PostgreSQL** — Güçlü, güvenilir, standart. **Önerilen.**
- **MySQL / MariaDB** — Yaygın, biraz daha basit.

Aralarındaki fark bu ölçekte hissedilmez. Yazılımcınız hangisini iyi
biliyorsa onu seçsin. PostgreSQL biraz daha "doğru" tercih.

### LOGO ile karışmasın

PAKSAN'ın zaten LOGO ERP'si var ve onun da veritabanı var. **Bu ikisi
ayrı kalacak.**

- LOGO: muhasebe, fatura, stok, cari hesap
- Yeni veritabanı: uygulama verisi — talepler, makine kayıtları, bayi
  panelleri

İkisi konuşacak ama birleşmeyecek. Uygulama LOGO'ya "şu seri numarası
ne zaman fatura edilmiş" diye sorar; LOGO cevap verir. LOGO'nun
tablolarına dokunulmaz.

---

## 5. API nedir — ve neden şart

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
içi değişecek, geri kalan her şey aynı kalacak. Bu, işin belki üçte
birini baştan halletmiş olmak demek.

---

## 6. Alan adı ve HTTPS

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

Bunlar alan adınızı yönettiğiniz panelden, birkaç dakikada tanımlanır.

### HTTPS ve SSL sertifikası

Adres çubuğundaki **kilit simgesi.** Anlamı: bu site ile tarayıcı
arasındaki trafik şifreli, aradaki kimse okuyamıyor.

**Şart mı? Evet, tartışmasız.** Üç sebep:

1. Şifre ve kişisel veri taşıyoruz
2. HTTPS olmayan siteyi tarayıcılar "Güvenli değil" diye işaretliyor
3. Android uygulamalar HTTPS olmayan adrese bağlanmayı varsayılan olarak
   reddediyor

**Maliyeti sıfır.** *Let's Encrypt* adlı ücretsiz servis sertifika
veriyor; sunucudaki bir program 90 günde bir kendiliğinden yeniliyor.
Yazılımcı bir kez kurar, bir daha uğraşılmaz.

---

## 7. Kod sunucuya nasıl gider

Bu adım "deployment" ya da "yayına alma" diye geçiyor.

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
gerekirse geri alınabiliyor. Bu arşiv internette bir yerde durur
(GitHub, GitLab) ve sunucu oradan kodu çeker.

> **Sözleşmeye yazın:** Bu arşiv PAKSAN'ın hesabında olmalı, yazılım
> firmasının değil. Bu tek madde, projenin sahibi olup olmadığınızı
> belirler.

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

| | Test | Canlı |
|---|---|---|
| Sunucu | Küçük, ucuz | Gerçek |
| Veritabanı | Ayrı, sahte veriyle | Gerçek, yedekli |
| SMS | Kapalı ya da tek numaraya | Açık |
| Uygulama | Play Store "iç test" kanalı | Play Store yayın |

**Altın kural: canlı veritabanına elle dokunulmaz.**

---

## 8. Bugünkü veriler ne olacak

Kısa cevap: **hiçbir şey. Hepsi gidecek ve gitmeli.**

Şu an tarayıcılardaki veri demo verisi — `Demo verisi yükle` düğmesinin
ürettiği 30 sahte müşteri, 68 sahte talep. Canlıya taşınmaz, taşınmamalı.

### Peki gerçek veri nereden gelecek

Üç kaynak:

**1. Sizin gireceğiniz sabit bilgiler.** Bunlar zaten kod dosyalarında
duruyor, sunucuya bir kez aktarılacak:

- Gerçek bayi listesi (`src/data/bayiler.js`)
- Ürünler ve teknik özellikleri (`src/data/products.js`)
- Parça listesi, il/ilçe listesi

**2. LOGO'dan gelecek veriler.** Fatura geçmişi, hangi makine hangi bayiden
satılmış. Bunlar aktarılmaz, **sorulur** — uygulama gerektiğinde
LOGO'ya sorar.

**3. Kullanıcıların üreteceği.** Talepler, makine kayıtları, siparişler.
Bunlar sıfırdan başlar. Bu normaldir: sistem açıldığı gün boştur, ilk
gerçek kullanıcıyla dolmaya başlar.

### Bir istisna

Uygulamayı demo döneminde gerçekten kullanan biri varsa (örneğin bir
pilot bayi), onun verisi elle taşınabilir. Ama planlamayın — birkaç
kaydı elle girmek, taşıma programı yazmaktan ucuzdur.

---

## 9. Yedekleme

**Yedek, verinin başka bir yerdeki kopyasıdır.**

Neden lazım: sunucunun diski bozulabilir, biri yanlışlıkla silebilir,
bir saldırgan verileri şifreleyip fidye isteyebilir. Bunların hepsi
gerçekten oluyor.

### Doğru yedekleme neye benzer

- **Günde en az bir kez** otomatik alınır
- **Başka bir yerde** durur — aynı sunucudaki yedek yedek değildir;
  sunucu giderse o da gider
- **Geriye dönük tutulur:** son 7 gün, son 4 hafta, son 12 ay gibi.
  Sebebi: bir hata bugün fark edilmeyebilir; üç hafta öncesine dönmek
  gerekebilir
- **Denenmiş olur**

Son madde en çok atlanan ve en pahalıya patlayandır:

> **Geri yükleme en az bir kez denenmemişse, yedeğiniz yok demektir.**

Yıllarca yedek alıp, ihtiyaç anında yedeğin bozuk olduğunu fark eden
şirketler var. Yılda bir kez, test ortamına gerçek yedekten geri dönün.
Yarım gün sürer.

---

## 10. Bir şey bozulduğunda

### İzleme

Sunucu çökerse **sizin haberiniz olmalı**, müşteri arayıp söylemeden
önce.

Bunun için "uptime monitor" denen basit servisler var: dakikada bir
sitenize bakarlar, cevap gelmezse SMS ya da e-posta atarlar. Ücretsiz
seçenekleri yeterli.

### Kayıtlar (log)

Sunucu yaptığı her işi bir deftere yazar. Bir şey bozulduğunda
yazılımcının ilk bakacağı yer orasıdır. Kurulum sırasında bunun düzgün
ayarlanmasını isteyin.

### Kim müdahale edecek

Bu tabloyu **açılıştan önce, isimlerle** doldurun:

| Durum | Kim bakar | Ne kadar sürede |
|---|---|---|
| Sunucu tamamen çökmüş | ? | ? |
| Uygulama açılıyor ama talep gitmiyor | ? | ? |
| Bir bayi giremiyor | ? | ? |
| Yavaşlık şikâyeti | ? | ? |

Yazılım firmasıyla sözleşme yaparken **bakım ve müdahale** ayrı bir
madde olmalı: aylık ücreti ne, ne kadar sürede cevap veriyorlar, gece
ve hafta sonu kapsam içinde mi.

---

## 11. Maliyet — dürüst tablo

Kesin rakam veremem; fiyatlar değişiyor ve teklife göre farklılaşıyor.
Ama **kalemleri** ve **büyüklük sırasını** söyleyebilirim.

### Bir kerelik

| Kalem | Yaklaşık |
|---|---|
| Sunucu ve veritabanı yazılımı (API) | En büyük kalem — aylarca iş |
| LOGO entegrasyonu | Ayrı kalem, LOGO iş ortağı da dahil |
| Play Console geliştirici hesabı | 25 ABD doları, tek seferlik |
| KVKK metinlerinin hukukçu onayı | Hukuk danışmanınızın tarifesi |

### Her ay tekrarlayan

| Kalem | Yaklaşık |
|---|---|
| Sunucu kirası (canlı) | Birkaç yüz lira seviyesi |
| Sunucu kirası (test) | Canlının yarısı ya da daha azı |
| Yedekleme alanı | Küçük |
| SMS gönderimi | **Adet başına** — kullandıkça |
| Bildirim gönderimi | Ücretsiz (Firebase) |
| Alan adı yenileme | Yılda bir, düşük |
| Bakım / destek anlaşması | Sözleşmeye bağlı |

**SMS'e dikkat.** Doğrulama kodu ve bildirim SMS'i adet başına
ücretlendirilir. Binlerce kullanıcıya SMS atmak, sunucu kirasından
pahalıya gelebilir. Bu yüzden bildirimler SMS'le değil **push
bildirimle** gönderilmeli — o ücretsiz. SMS sadece şifre doğrulama gibi
zorunlu yerlerde kullanılmalı.

---

## 12. Sıra — ne, ne zaman

### Aşama 0 — Şimdi (sunucuyu beklemez)

Hepsi PAKSAN'ın kendi işi, hiçbiri yazılım gerektirmiyor:

- [ ] Gerçek bayi listesi
- [ ] Gerçek seri numarası biçimi
- [ ] Gerçek parça adları (servis ve yedek parça ekibinden)
- [ ] Banka hesapları (IBAN)
- [ ] KVKK metinlerini hukukçuya vermek
- [ ] Play Console kurumsal hesabı açmak (D-U-N-S numarası haftalar
      sürebiliyor, erken başlatın)

*Süre: 3-6 hafta, tamamen size bağlı.*

### Aşama 1 — Yazılımcı bulmak

Bu belgeyi ve `CANLIYA-CIKIS.md`'yi verip teklif alın. Sorulacaklar
`CANLIYA-CIKIS.md` § 2.3'te.

*Süre: 2-4 hafta.*

### Aşama 2 — Altyapı kurulumu

Sunucu kiralanır, veritabanı kurulur, alan adları yönlendirilir, SSL
sertifikası alınır, test ve canlı ortamlar ayrılır.

*Süre: 1 hafta. Bu adım kısa; asıl iş bir sonraki adımda.*

### Aşama 3 — API yazımı

En uzun iş. Talepler, hesaplar, yetkiler, dosya yükleme, bildirim.

*Süre: 2-4 ay.*

### Aşama 4 — LOGO bağlantısı

Paralel yürür ama **kritik yola koymayın**: LOGO gecikirse uygulama
LOGO'suz da çıkabilir.

*Süre: 2-6 hafta, LOGO iş ortağınızın hızına bağlı.*

### Aşama 5 — Test

Önce PAKSAN personeli (2 hafta), sonra 3-5 bayi (1 ay), sonra tek
bölgede gerçek müşteriler (1 ay).

*Süre: 2-3 ay. Kısaltmayın.*

### Aşama 6 — Açılış

Play Store'da kademeli yayın: önce %5, sonra %20, sonra hepsi.

---

## 13. En kısa özet

1. **Bugün elimizde ekranlar var, sistem yok.** Veriler her kullanıcının
   kendi tarayıcısında; kimse kimseyi görmüyor.
2. **Sunucu = sürekli açık bir bilgisayar.** Kiralanır, aylık ödenir.
   PAKSAN için VPS yeterli, tercihen Türkiye'de.
3. **Veritabanı = verinin ortak durduğu yer.** PostgreSQL önerilir.
   Bugünkü 16 "defter" oraya tablo olarak taşınacak.
4. **API = araya giren kapıcı.** Telefon veritabanına doğrudan bağlanmaz;
   kimlik ve yetki kontrolü orada yapılır.
5. **Uygulama bu geçişe hazır yazıldı.** Ekranlar değişmeyecek, sadece
   üç dosyanın içi.
6. **Test ortamı şart.** Canlıya doğrudan dokunmak veri kaybıdır.
7. **Yedek denenmemişse yedek değildir.**
8. **Gerçekçi takvim: 6-9 ay.** İlk 3-6 haftası sizin elinizde ve bugün
   başlayabilir.
