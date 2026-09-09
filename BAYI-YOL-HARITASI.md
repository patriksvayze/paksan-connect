> ## ⚠ BU BELGE GEÇERSİZ — 9 Eylül 2026
>
> Belge, tek bir "bayi"nin hem makineyi sattığı hem servis verdiği
> hem parça tuttuğu varsayımına dayanıyor. 8 Eylül 2026'da Ziya ile
> yapılan toplantı bu varsayımın yanlış olduğunu gösterdi: **bayi ile
> servis ayrı taraflar** ve bayilerin çoğunun kendi servisi yok.
>
> Panel bayiden servise devredildi. Bugün geçerli olan model
> `CLAUDE.md` içindeki "Ekosistemin Temeli — Dört Taraf" bölümünde.
>
> **Belge silinmedi, çünkü gerekçeleri hâlâ değerli:** "karşılıksız
> veri istenmez" kuralı aynen geçerli, yalnız muhatabı servis.
> Dört maddenin bugünkü karşılığı:
>
> | Madde | Bugün |
> |---|---|
> | §1 Makine satışı panele gelsin | **Düştü** — satan tarafın paneli yok |
> | §2 Stok güncel tutma | **Servise geçti** — mantık aynı, aktör değişti |
> | §3 Kendi müşterilerini görme | **Servise geçti** — KVKK sorunu aynen duruyor |
> | §4 Garanti parça değişimi | **Kaldı** — aktör servis oldu |
> | §1.4 Garanti satış faturasından | **Aşıldı** — ilk kurulumdan başlayacak |

# Bayi Sistemi — Sıradaki Dört İş

## Temel: Vericiler ve Alıcılar

Bundan sonra bayiler için yapılacak her iş bu temele dayanıyor.

Hizmet akışında üç taraf var ve rolleri eşit değil:

| Taraf | Alır | Verir |
|---|---|---|
| **PAKSAN** | — | Ürün, fiyat, teknik bilgi, garanti, müşteri |
| **Bayi** | PAKSAN'dan | Müşteriye |
| **Müşteri** | Bayiden ve PAKSAN'dan | — |

Bayi ayrı bir şirket ve kendi menfaati dışında bir şey yapmaz. Bu bir
kusur değil, tanım: iki ayrı şirket arasındaki ilişki karşılıklılıkla
yürür.

Buradan tek bir tasarım kuralı çıkıyor:

> **Bayiden istenen her alan için tek soru sorulur: Bayi bunu
> doldurduğu anda ne alıyor? Cevap yoksa alan istenmez.**

Karşılıksız istenen veri ya hiç girilmez ya geçiştirilir.
Geçiştirilmiş veri, verinin olmamasından daha kötüdür — çünkü tablo
dolu görünür ve PAKSAN ona bakıp karar alır.

### Bu Kural Neyi Bozdu, Neyi Kurdu?

İlk yazılan "iş kartı" bu kuralı çiğniyordu: servis işini kapatmak
için belirti, yapılan iş, parça, süre ve usta adı soruluyordu ve
bayi bunların karşılığında hiçbir şey almıyordu. Sonucu tahmin
edilebilirdi: bayi ilk seçeneğe basıp geçerdi.

Yerine geçen kurgu, kapanışı bayinin ne aldığına göre üçe ayırıyor:

| Seçenek | Bayi Ne Alıyor? | Ne Soruluyor? |
|---|---|---|
| **Parça Değişmedi** | Müşterinin uygulamasında görünen kayıt — bayinin kendi vitrini | Tek dokunuş: ne yapıldı? |
| **Parçayı Müşteri Ödedi** | Stok azalıyor; parça bitince sipariş öneriliyor, bayi malsız kalmıyor | Hangi parça, kaç adet |
| **Garantiden Parça İste** | PAKSAN'dan bedelsiz parça | Ayrıntı — çünkü form bir rapor değil, talebin kendisi |

Üçüncü seçenekte doğruluğun bekçisi iyi niyet değil, bayinin kendi cebi.
Kalite verisi de en doğru hâliyle oradan geliyor.

### Hüküm Sorulmuyor, Gözlem Soruluyor

Garanti talebinde bayiye "Üretim hatası mı, kullanım hatası mı?" diye
sorulmuyor. Sorulsaydı her talepte "üretim hatası" yazardı; talebin
kabulü ona bağlı. Bayi yalnız gördüğünü yazıyor: kırıldı, aşındı,
kaçırıyor. Eski parça eline geçtiğinde hükmü PAKSAN veriyor.

### Bugün Kullanılamayan Kaldıraç

Garanti işçiliği ödenmiyor. Ödendiği gün servis kaydı hak ediş
belgesine dönüşür ve bayi parasını almak için kaydı doğru doldurur. Süre ve
işi yapan alanları bugün garanti formunda **isteğe bağlı** duruyor;
o gün zorunlu olacak, veri düzeni değişmeyecek.

---

Dört soru soruldu, dördü de "planla ve sun" dendi. Sırayla cevap:

1. Makine satışı bayi paneline nasıl gelmeli
2. Bayi stoğunu güncel tutmaya nasıl teşvik ederiz
3. Bayi kendi müşterilerini nasıl görsün
4. Garanti kapsamındaki parça değişimi nasıl akmalı

Dördü birbirine bağlı. **Sıra önemli: 1 yapılırsa 2'nin cevabı
kendiliğinden çıkıyor.** O yüzden makine satışıyla başlıyorum.

---

## 1. Makine Satışı — bayinin asıl işi

> "Bayi panel ve uygulamasına makine satışı özelliği getirilmeli.
> Bayilerimizin asıl yaptığı iş bu."

Doğru, ve bugünkü panelde hiç yok. Panel bayiye servis, parça ve
randevu veriyor — yani işinin yan tarafını. Asıl iş dışarıda kalmış.

### 1.1 Akış

```
PAKSAN, makineyi bayiye gönderir  →  makine bayinin stoğunda
                                          ↓
                          bayi müşteriye satar (panelden işler)
                                          ↓
              ┌───────────────────────────┴───────────────────────────┐
              ↓                                                       ↓
   müşteri PAKSAN Connect kullanıyor                    kullanmıyor
              ↓                                                       ↓
   makine hesabına eklenir                        kayıt "bekleyen" olarak
   "Hayırlı olsun" bildirimi                      durur; müşteri uygulamayı
   garanti başlar                                 indirdiğinde hesabına düşer
```

### 1.2 Seri numarası yazılmamalı, seçilmeli

Bu, tasarımın can alıcı noktası.

Bugün bayi stoğunda makine **adet** olarak duruyor: "Orkinos 1270 · 2
adet". Oysa PAKSAN hangi seri numaralı makineyi hangi bayiye
gönderdiğini biliyor.

Öneri: **sipariş ve sevkiyat seri numarası taşısın.** PAKSAN
"gönderildi" derken hangi seri numaralarını gönderdiğini yazsın. O
zaman:

- Bayinin stoğu "2 adet" değil, "ORK1270-2024-00157 ve
  ORK1270-2024-00161" olur.
- Satışta bayi seri numarası **yazmıyor, listeden seçiyor.**
- Yanlış yazılan tek hane makineyi bulunamaz yapıyordu; o risk ortadan
  kalkıyor.
- Stok kendiliğinden düşüyor — **2. sorunun cevabı burada.**

Bunun bedeli: PAKSAN sevkiyat yaparken seri numaralarını girmek
zorunda. Ama zaten irsaliyeye yazıyor.

### 1.3 Satış ekranında ne sorulacak

Az soru, hepsi zorunlu:

| Alan | Neden |
|---|---|
| Telefon | Müşterinin kimliği. İlk sırada — Yeni Kayıt'taki gibi. |
| Ad soyad | Kayıtlıysa kendiliğinden doluyor |
| İl / ilçe | Bölge ve servis planlaması |
| Makine (stoktan seçilir) | Seri numarası buradan geliyor |
| Fatura no ve tarihi | Garantinin başlangıcı |

Bitince: stok düşer, makine kayıt defterine satır düşer, müşterinin
hesabına makine eklenir (ya da beklemeye alınır), bildirim gider.

### 1.4 Garanti satış tarihinden başlamalı

**Bugün bir hata var.** Garanti seri numarasındaki **üretim yılından**
hesaplanıyor. 2024'te üretilip 2026'da satılan bir makinenin garantisi
bugün 2026'da bitmiş görünüyor — oysa 2028'e kadar sürmeli.

Bugün fark edilmiyor çünkü satış tarihini bilen kimse yok. Bayi satışı
gelince **biliniyor olacak**, o zaman garanti satış tarihinden
hesaplanmalı. Sıralama:

1. Bayi satış kaydındaki fatura tarihi (en güvenilir)
2. LOGO'daki fatura tarihi
3. Seri numarasındaki üretim yılı (yalnız ikisi de yoksa)

Bu, müşteriye doğrudan yansıyan bir düzeltme: bugün garantisi
sürerken "bitti" gördüğü durum ortadan kalkar.

### 1.5 Uygulaması olmayan müşteri

Müşteri PAKSAN Connect kullanmıyorsa satış kaydı **bekleyen** olarak
durur, telefon numarasıyla anahtarlanır. O numarayla biri kayıt
olduğunda makine hesabına düşer ve "Hayırlı olsun" penceresi çıkar.

> **Bu, sunucu olmadan çalışmaz.** Bayinin telefonundaki kayıt,
> müşterinin telefonundaki uygulamaya bugün ulaşamıyor. Ekranlar ve
> veri düzeni bugünden yazılabilir; bağlanması sunucuyla olur.

Ayrıca satış anında müşteriye SMS ile indirme bağlantısı gider — bu
zaten Yeni Kayıt ekranına eklendi, aynı kalıp burada da kullanılır.

### 1.6 Güvenlik sınırı — atlanmamalı

Bayi "şu telefon numarası bu makinenin sahibi" diyerek **başka birinin
hesabına** kayıt yazıyor. Yanlış rakam girilirse makine yabancı birinin
hesabına düşer.

İki önlem:

1. Müşterinin uygulamasında makine **kimin eklediği yazılarak** görünsün:
   *"Bu makineyi bayiniz Akdeniz Tarım Makineleri hesabınıza ekledi."*
2. Yanında **"Bu makine benim değil"** düğmesi olsun. Basılırsa kayıt
   ayrılır ve PAKSAN'a düşer.

---

## 2. Bayi Stoğunu Güncel Tutma

> "Bayi stok kullandığı zaman çok büyük ihtimalle düzenli olarak
> güncellemeyecek. Buna teşvik edecek bir şey bulmalıyız."

Haklısınız, güncellemez. Ve dürüst cevap şu: **hiçbir arayüz numarası
insanları veri girişi yapmaya ikna etmiyor.** Hatırlatma, rozet, uyarı
— hepsi birkaç hafta çalışır, sonra bakılmaz hâle gelir.

Tek kalıcı çözüm, veri girişini **kaldırmak**: stok, bayinin zaten
yaptığı işin yan ürünü olmalı.

### 2.1 Bugün zaten kendiliğinden olanlar

| Hareket | Durum |
|---|---|
| PAKSAN sevkiyatı → stok artar | ✅ Otomatik |
| Parça talebi kapanınca stok düşer | ✅ Otomatik ("Stoğumdan düş" kutusu) |

### 2.2 1. madde yapılırsa kendiliğinden olacak

| Hareket | Durum |
|---|---|
| Makine satılınca stok düşer | ⏳ Madde 1 ile |

### 2.3 Geriye kalan tek boşluk

Tezgâh üstü parça satışı: müşteri dükkâna gelir, parçayı alır, gider.
Ortada talep kaydı yok, o yüzden düşüm de yok.

Bunun için elle bir dokunuş şart. Dört öneri, etkililik sırasıyla:

**a) Teslim alma adımı (en güçlü, ayrıca doğru).**
Bugün PAKSAN "gönderildi" deyince bayi stoğu **tek taraflı** artıyor.
Doğrusu: bayi **"teslim aldım"** demeli, stok o zaman artmalı. Eksik
gelirse "eksik geldi" diyebilmeli.

Bu bayinin kendi çıkarına: kargo eksik getirdiğinde elinde kayıt olur.
Ayrıca stoğun doğru olduğu tek anı yaratır — teslim anını.

**b) Sipariş önerisi (bayinin işine yarar).**
Stok doğruysa panel şunu diyebilir: *"Rulman bitti. Sipariş vereyim
mi?"* Tek dokunuşla sipariş açılır.

Bayi stoğu PAKSAN için değil, **kendisi malsız kalmasın diye** tutmaya
başlar. Teşvik budur; hatırlatma değil.

**c) Sayım (üç ayda bir, iki dakika).**
Bir ekran, bütün kalemler alt alta, yanında rakam kutusu. Panelde
*"Son sayım: 3 ay önce"* yazar. Sayım yapılınca hareket kaydına
"sayım düzeltmesi" olarak geçer — böylece fark nereden geldi
sorulabilir.

**d) Ticari bağ (karar sizin).**
Kampanya, iskonto ya da öncelikli sevkiyat gibi bayinin istediği bir
şeyi stok doğruluğuna bağlamak. En etkili yöntem ama teknik değil
ticari bir karar; PAKSAN'ın bayi politikasına ait.

### 2.4 Kabul edilmesi gereken şey

Bayi stoğu **hiçbir zaman kusursuz olmayacak.** Sistem buna göre
kurulmalı — nitekim böyle kuruldu: stok bir **bilgi**, kilit değil. Stok
sıfır görünse de bayi "parçayı gönderdim" diyebiliyor. Bu bilinçli bir
karardı ve doğruydu; bayiyi kendi yanlış sayımına hapsetmek paneli
kullanılmaz yapardı.

---

## 3. Bayi Kendi Müşterilerini Görsün

> "Bayi satış yaptığı müşterisinin bilgilerini sisteminde görebilmeli
> ancak bunu şu anki sisteme nasıl entegre ederiz bilmiyorum."

### 3.1 Yeni veri girişi gerekmiyor

Bayi–müşteri bağı zaten üç yerden doğuyor:

1. **Satış** (madde 1) — en güçlü bağ
2. **Talep** — bayiye düşen ve bayinin ilgilendiği talepler
3. **Elle kayıt** — bayinin kendi açtığı talepler

"Müşterilerim" listesi bu üçünden **türetilir**, ayrıca doldurulmaz.

### 3.2 Ekranda ne olacak

Yeni bir sekme değil — bayi panelinde zaten dört sekme var ve beşinci
kalabalık yapar. **"İşlerim" içinde arama** olarak durmalı: bayi bir
isim ya da numara yazar, karşısına o müşterinin kartı çıkar.

Kartta:

- Ad, telefon (dokunulunca aranır), il/ilçe
- Makineleri: model, seri no, **garanti durumu**, satış tarihi
- Geçmiş: hangi talepler, ne zaman, ne yapıldı
- Son ziyaret ne zamandı

Bayinin gerçekten sorduğu soru şu: *"Bu adam kim, makinesi ne, garantisi
var mı, en son ne yapmıştık?"* Kart bu dört soruyu cevaplamalı, fazlası
değil.

### 3.3 KVKK — bu maddenin asıl zorluğu

Teknik kısım kolay. Zor kısım şu: **bayi ayrı bir tüzel kişi.**
Müşterinin adını, telefonunu ve makinesini bayiye göstermek, iki ayrı
veri sorumlusu arasında bir **veri aktarımı**dır.

Gerekenler:

- [ ] KVKK aydınlatma metninde açıkça yazılsın: müşteri verisi, ona
      hizmet veren yetkili bayiyle paylaşılır. *(Bugünkü metinde bu yok.)*
- [ ] Her bayiyle **veri paylaşım sözleşmesi.** İçeriği
      `CANLIYA-CIKIS.md` § 6.2'de.
- [ ] Bayi **yalnız kendi müşterisini** görsün. Bölgesindeki herkesi
      değil, bağı olan kişileri.
- [ ] Bayilik biterse erişim kapanmalı ve indirilmiş veri silinmeli.
- [ ] Süzgeç **sunucuda** uygulanmalı. Bugünkü `bayininTalepleri()` bir
      arayüz süzgeci; güvenlik sınırı değil.

### 3.4 Görülmemesi gerekenler

Bayi şunları görmemeli:

- Başka bayinin müşterisi
- Müşterinin PAKSAN'a yazdığı geri bildirim ve şikâyet
- Müşterinin diğer bayilerdeki servis geçmişi
- PAKSAN'ın iç notları

---

## 4. Garanti Kapsamında Parça Değişimi

> "Müşteriye servise gidildi, garanti kapsamında, parça değişimi oldu.
> Bayi bu parça değişimini PAKSAN'dan talep edecek haliyle."

### 4.1 Yeni bir akış kurulmamalı

Sipariş akışı zaten var ve tam olarak bu şekli taşıyor: bayi ister,
PAKSAN onaylar, hazırlar, gönderir, stok artar. Garanti talebi bunun
**bir türü** olmalı — ayrı bir sistem değil.

```
sipariş türü:  satinalma  (bayi parayla alıyor)
               garanti    (PAKSAN garanti kapsamında karşılıyor)
```

Fark üç yerde: nereden başladığı, ne sorduğu ve reddedilebilmesi.

### 4.2 Talebin doğduğu yer

Garanti talebi boşluktan doğmamalı — **kapanan servis talebinden**
doğmalı. Bayi işi tamamlarken "Garanti kapsamındaydı" işaretlerse, ne
değiştirdiği sorulur ve talep oradan açılır.

Sebebi: garanti talebinin dayanağı bir iştir. İş kaydından koparsa
PAKSAN neyin karşılığında parça gönderdiğini bilemez.

### 4.3 Sorulacaklar

| Alan | Neden |
|---|---|
| Talep no | Hangi iş — kendiliğinden geliyor |
| Makine seri no | Garanti buradan doğrulanıyor — kendiliğinden geliyor |
| Değişen parçalar + adet | Ne gönderilecek |
| Arıza sebebi | Üretim hatası mı, kullanım hatası mı |
| Eski parçanın fotoğrafı | Kanıt |
| Eski parça iade edilecek mi | Aşağıda |

**Garanti geçerliliği kendiliğinden kontrol edilmeli.** Makine kaydı
zaten var; süresi dolmuşsa ekran bunu talep açılmadan söylemeli.

### 4.4 Eski parçanın iadesi — atlanan madde

Gerçek garanti süreçlerinde asıl konu budur. PAKSAN bozuk parçayı geri
istemek zorunda, iki sebeple:

1. Gerçekten arızalı mı, kullanım hatası mı — incelemek için
2. Kendi tedarikçisinden garanti talep edebilmek için

Bu yüzden akışta bir adım daha var:

```
bayi talep açar → PAKSAN onaylar → yeni parça gider
                                        ↓
                          bayi eski parçayı geri gönderir
                                        ↓
                       PAKSAN inceler → dosya kapanır
```

Eski parça gelmezse talep **açık kalır** ve bayi panelinde bekleyen
olarak durur. Bu, kendi kendine işleyen bir hatırlatmadır.

### 4.5 Ret de bir sonuç

Her talep garanti değildir: kullanım hatası, aşınma parçası
(bıçak, ip, yay, kayış — garanti dışı), süresi dolmuş makine.

PAKSAN **sebebiyle birlikte** reddedebilmeli ve sebep bayiye
görünmeli. Sessiz ret, bayinin müşteriye ne diyeceğini bilememesi
demektir.

Reddedilen talep isteğe bağlı olarak **normal siparişe çevrilebilmeli**
— bayi parçayı yine de isteyebilir, parayla.

### 4.6 Asıl kazanç: kalite verisi

Bu akış işlemeye başladığında PAKSAN'ın eline şu bilgi geçiyor:

> *Hangi modelde, hangi parça, kaçıncı çalışma saatinde, ne sıklıkta
> arızalanıyor.*

Bu, üretim kalitesi için elde edilebilecek en değerli veridir ve bugün
hiçbir yerde toplanmıyor. Garanti akışının gerçek getirisi parça
lojistiği değil, budur.

Backoffice'e eklenecek tek rapor: **model × parça × arıza sayısı.**

---

## Önerilen sıra

| Sıra | İş | Neden burada |
|---|---|---|
| 1 | Sevkiyata seri numarası eklemek | Her şeyin altyapısı |
| 2 | Makine satışı | Bayinin asıl işi; 2. maddenin cevabı buradan çıkıyor |
| 3 | Garantinin satış tarihinden hesaplanması | Bugünkü hatanın düzeltilmesi |
| 4 | Teslim alma adımı | Stok doğruluğunun tek gerçek anı |
| 5 | Garanti parça talebi | Satış ve garanti verisi hazır olunca anlamlı |
| 6 | Müşterilerim | KVKK işi bitmeden başlanmamalı |
| 7 | Sipariş önerisi, sayım | Stok verisi birikince |

### Sunucu bağımlılığı

| İş | Sunucusuz yapılabilir mi |
|---|---|
| Seri numaralı sevkiyat | ✅ Evet |
| Makine satışı ekranı | ✅ Evet (ekran ve kayıt) |
| Satışın müşterinin uygulamasına düşmesi | ❌ Sunucu gerekiyor |
| Garanti parça talebi | ✅ Evet |
| Müşterilerim listesi | ⚠️ Ekran evet, güvenlik sınırı hayır |

Yani 1, 2, 3, 4, 5 ve 7 bugünden yapılabilir; 6 KVKK'yı, satışın
müşteriye ulaşması sunucuyu bekliyor.
