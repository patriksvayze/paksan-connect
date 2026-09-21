# Ekosistem Kod Sistemi: Pilot Öncesi Çalışma

**Tarih:** 15 Eylül 2026
**Kapsam:** Bu belge, PAKSAN Connect (müşteri uygulaması), backoffice (personel paneli), PAKSAN Servisim (servis uygulaması) ve ortak dosyalardaki kimlik ve numara kodlarını ele alıyor. Bu kodların LOGO Tiger ile nasıl eşleşeceği de belgenin konusu.
**Durum:** Bu bir çalışma belgesi. Buradaki biçimler öneri, karar PAKSAN'ın. Karar gerektiren sorular, önerilen cevap ve sorumlusuyla birlikte Bölüm 7'de.

**Nasıl okunur**

- Parantez içindeki dosya adları kodun yerini gösterir, örneğin (src/lib/talep.js).
- Satır numaraları iki ayrı tabana dayanıyor, çünkü tarama sırasında dosyalar değişmeye devam etti:
  - veri.js, RequestForm.jsx, ElleKayit.jsx, Talepler.jsx, RequestDetail.jsx, ServisKapanisi.jsx ve demoServis.js numaraları son kayıtlı sürüme (HEAD d078ab6) göre verildi. veri.js'in 1788. satırından sonrası çalışma kopyasında yaklaşık 33 satır aşağıda.
  - Musteriler.jsx ile servisKaydi.js numaraları çalışma kopyasına göre verildi.
- **[PİLOT ENGELİ]**, çözülmeden pilotun başlamaması gereken konudur. **[doğrulanmadı]**, kaynağı bulunamamış ya da denenememiş bilgidir; karar vermeden önce doğrulanmalı.
- Bölüm 2 ve 3'teki örnek değerler kaynaktan alındı. "Fonksiyon çıktısı" yazan örnekler, koddaki üreteç bir kez çalıştırılarak elde edildi. Bölüm 4'teki örnekler öneridir, bugün kodda yoktur.
- Belge üç okuyucuya yazıldı. Yönetim, muhasebe ve satış için Bölüm 1, 5, 6 ve 7 yeterli. Bölüm 2, 3 ve 4 teknik ek niteliğinde.

**Birkaç terim**

- **İç kimlik:** Yazılımın bir kaydı tanımak için kullandığı, ekranda görünmeyen koddur. Bugün kodda "uid" adıyla geçiyor ve 13 karakter uzunluğunda (src/lib/storage.js:33-35).
- **Okunur numara:** İnsanın telefonda söylediği, havale açıklamasına yazdığı numaradır. Talep numarası buna örnektir.
- **Sayaç:** Her yeni kayıtta bir artan sayıdır. Bugünkü sayaçlar her telefonun ya da tarayıcının kendi hafızasında tutuluyor, yani her cihaz ayrı sayıyor.
- **Sunucu / veritabanı:** Bütün telefonların ve bilgisayarların bağlandığı ortak merkez ile kayıtların tutulduğu yerdir. Bugün yok; SQL Server önerildi.
- **Cari kod / malzeme (stok) kodu:** LOGO'nun bir firmayı ve bir ürünü tanıdığı kodlardır.

---

## 1. Kısa özet

- **Bugün bütün numaraları telefon ya da tarayıcı kendisi veriyor; numara dağıtan bir merkez yok.** Müşteri (MST), servis (SRV), bayi (BAY), personel (PRS) ve geri bildirim (GBD) sayaçları her cihazda 1'den başlıyor (src/lib/numara.js:44-48). Pilotta ikinci telefonun devreye girdiği gün aynı numara iki kişiye verilir. Bu bir olasılık değil, kesin sonuç.
- **Numaradan önce çözülmesi gereken bir sorun var: Sunucu olmadan taraflar birbirinin kaydını görmüyor.** En doğrudan etkisi şu: PAKSAN'ın backoffice'te yaptığı servis ataması müşterinin telefonuna ulaşmıyor. Ayrı cihazlarla yürüyen bir pilotta hiçbir müşteri servis talebi açamaz. Servisin elle açtığı kayıt, parça siparişi, hak ediş, cari hareketler, işlem kaydı ve müşterinin yüklediği dekont da yalnız kaydın açıldığı cihazda kalıyor. Pilot sunucuyla başlamalı.
- **Talep numarası çakışabiliyor ve bunu denetleyen bir yer yok.** Numara önek (SRV/YPR/TKF), tarih ve rastgele 4 haneden oluşuyor (src/lib/talep.js:54-61). Günde 10 talep açılırsa bir iş yılı içinde en az bir çakışma yaşanma olasılığı yaklaşık %71. Aynı önek iki farklı şey için de kullanılıyor: SRV hem servis firmasının hem servis talebinin öneki, YPR hem müşteri parça talebinin hem servis siparişinin.
- **LOGO ile eşleşecek alan yok.** Bayi ve servis kaydında cari kod, üründe malzeme kodu, talepte fatura ya da irsaliye numarası tutulmuyor. LOGO bağlantı taslağı, LOGO'nun bizim iç adlarımızı ('konya-merkez', 'orkinos-1270') döndürmesini bekliyor (src/lib/logo.js:63-70), ama LOGO bu adları bilemez. Yedek parça kodları gerçek fiyat listesinden geliyor (538 kod) ve büyük olasılıkla LOGO malzeme koduyla aynı [doğrulanmadı].
- **Seri numarası biçimi uydurma** ("ORK1270-2024-00157"). Gerçek biçim bilinmeden pilotta makine kaydedilemez. Kod ayrıca seri numarasındaki harfleri siliyor. Bu yüzden farklı modellerin aynı yıl ve sıradaki makineleri aynı numara sayılıyor.
- **Kimliklerin çoğu addan türetiliyor, kişiler de adıyla kaydediliyor.** Ad değişince ya da iki kişi aynı adı taşıyınca bağ kopuyor.
- **Pilottan önce düzeltilmesi gereken, kimliği bozan dört hata var:**
  - Servisler ve Bayiler ekranında süzgeç açıkken kaydetmek, listenin görünmeyen kısmını siliyor.
  - Bir personelin bilgilerini düzenlemek şifresini siliyor.
  - Aynı seri numarası için yeni makine satırı eklenince PAKSAN'ın atadığı servis görünmez oluyor.
  - Backoffice giriş ekranı, oturum açmamış birine personelin şifre değiştirme bağlantısını ve e-posta adresini gösteriyor.
- **Öneri özeti:**
  - Her kaydın iki kodu olsun: kimsenin görmediği, hiç değişmeyen bir iç kimlik ve sunucunun sırayla verdiği okunur numara (ör. `SRV-26-00123`).
  - Bayi ve servis, ekranda LOGO cari koduyla tanınsın; ayrı bir kod serisi açılmasın.
  - Para ve cari bakiye LOGO'da kalsın. Uygulama yalnız belgeyi, belgenin durumunu ve LOGO fiş numarasını tutsun.
  - Pilotta LOGO bağlantısı kurulmasın; eşleme Excel dökümüyle yapılsın.
  - Pilot kayıtları gerçek kodlarla, canlıya kalacak şekilde açılsın. Demo verisi pilot ortamına hiç girmesin.

---

## 2. Bugün hangi kodlar var

Tablodaki "uid", kodun her kayda verdiği, zaman damgası ve rastgele harflerden oluşan iç kimliktir. "Cihaz sayacı", her telefonda ya da tarayıcıda ayrı sayan sayaçtır. "Kim görüyor" sütunundaki "Kimse", kodun yalnız iç anahtar olarak kullanıldığını, ekranda görünmediğini anlatır.

| Kod | Örnek | Nasıl üretiliyor | Kim görüyor | Sorun |
|---|---|---|---|---|
| **A. İşlem numaraları** | | | | |
| Talep numarası (servis / yedek parça / fiyat teklifi) | `SRV2608214417`, `YPR2608215823`, `TKF2608211102` (tools/ekran-goruntusu.mjs) | Cihazda: önek + YYAAGG (cihaz saati) + 1000-9999 arası rastgele 4 hane (src/lib/talep.js:54-61). Sunucu numara dönerse onunki yazılır (src/context/AppState.jsx:327); bugün sunucu kapalı | Müşteri, servis, personel; muhasebe havale ve cari açıklamasında. LOGO bağlantısı yok | Çakışma denetimi yok; bir gün ve bir önek için yalnız 9000 olası değer var. Tarih cihaz saatine bağlı. Belgedeki tireli biçim (PRODA-CIKIS.md:122) kodla çelişiyor |
| Servis parça siparişi numarası | YPR biçiminde; siparişe özgü örnek kaynakta yok | Servis telefonunda, aynı üreteçle (src/backoffice/veri.js:2126); ayrı sipariş defteri yok | Servis, yedek parça personeli, muhasebe | Müşteri parça talebiyle aynı önek. Sunucuya gönderilmiyor (veri.js:2180) |
| Elle servis kaydı numarası (Servisim) | SRV biçiminde | Servis telefonunda (src/servis/ekranlar/ElleKayit.jsx:184) | Servis; müşteri SMS ile | Kayıt PAKSAN'a ulaşmadan numara müşteriye SMS'le gidiyor; kayıt sunucuya gönderilmiyor |
| Havale açıklaması (yedek parça ödeme referansı) | Kalıp `{no} · {ad}` (src/marka/kimlik.js:145) | Numara ödeme adımında üretiliyor (src/screens/RequestForm.jsx:484); numara ile hesap adı `Hesaplar` bileşeninde birleştiriliyor (RequestForm.jsx:2041-2044) | Müşteri; banka ekstresinde muhasebe | Numara bugün de ödeme adımında kaydedilmeden gösteriliyor (RequestForm.jsx:938-941). Banka hesapları boş olduğu için yalnız IBAN listesi ve açıklama kalıbı gizli (RequestForm.jsx:2057-2063) |
| Hak ediş | Kendi numarası yok; servis ekranında `SRV2609106112 · servis ödemesi` (src/servis/ekranlar/Hakkedis.jsx:171) | Talebin içine nesne olarak yazılıyor (veri.js:1831-1832) | Servis, personel | Aynı talepteki ikinci ziyaret, aynı numarayla ikinci bir hak ediş doğuruyor |
| Cari hareket (servisin PAKSAN'daki hesabı) | Açıklama `SRV2609106112 · servis ödemesi` | uid; açıklama talep numarasından (veri.js:2214-2218) | Servis, personel | Fiş numarası yok, mükerrer satır koruması yok. PAKSAN'ın servise yaptığı ödemeyi yazan bir akış yok |
| Fiyat teklifi | Kendi numarası yok; TKF talep numarasıyla anılıyor | Talebin içine nesne (veri.js:1166-1197) | Personel | İkinci teklif birincinin üstüne yazılıyor; tutar serbest metin |
| Geri bildirim numarası | `GBD000032` (src/lib/numara.js:11) | Cihaz sayacı (src/lib/geriBildirim.js:20) | Personel; müşteri görmüyor | Her müşteri telefonu GBD000001'den başlıyor |
| Numara değişikliği talebi, servis şifre yardım talebi, destek oturumu, talep notu | Okunur numara yok | uid; notların iç kimliği de yok | Personel | Telefonda anılacak bir numara yok. Bu kayıtların hiçbiri sunucuya gitmiyor |
| İşlem kaydı (denetim defteri) | Özet `${talep.no} · elle açıldı · ${talep.ad}` (ElleKayit.jsx:217) | uid; tür serbest yazı; kişi adıyla (veri.js:2458-2482, src/lib/kayit.js:26-37) | Personel | 500 satırı aşan eski kayıtlar siliniyor. Kişinin kimliği yok. Yazılan türlerle süzgeç listesi uyuşmuyor (3.15) |
| Ek dosyası (fotoğraf, video, dekont, duyuru görseli) | `mu2bcxbfw2xztu7` (fonksiyon çıktısı) | Cihazın kendi dosya deposunda (src/lib/ekler.js:54-62) | Dosyayı müşteri, servis ve personel görüyor; kimliğini kimse | Dosya yalnız yüklendiği cihazda duruyor; pilotta dekont backoffice'te açılmaz |
| Kargo takip numarası | Demoda 10 haneli rastgele sayı (src/backoffice/demoServis.js:347) | Personel elle yazıyor, zorunlu değil (Talepler.jsx) | Müşteri, servis, personel | LOGO irsaliyesiyle bağı yok; boş bırakılabiliyor |
| **B. Taraflar** | | | | |
| Genel iç kimlik (uid) | `mu2bcxbajz6bp` (fonksiyon çıktısı) | Zaman + 5 rastgele karakter (src/lib/storage.js:33-35) | Kimse; yalnız müşterinin talep adresinde (`/talebim/…`) geçiyor | Hangi cihazda ya da ortamda üretildiği belli değil. Sunucuya geçerken korunmazsa okundu bilgisi, gizlenen talepler ve bildirim bağları kopar |
| Müşteri hesabı kimliği | uid | Kayıt sırasında müşterinin telefonunda (AppState.jsx:184) | Kimse | Talepler bu kimliği taşımıyor; talep ile müşteri telefon yazısıyla eşleştiriliyor |
| Müşteri numarası | `MST000148` (numara.js:8) | Müşterinin kendi telefonundaki cihaz sayacı | Personel; müşteri kendi ekranında görmüyor | Her telefonda ilk numara MST000001. Demo yüklemesi 30 numara harcıyor |
| Müşteri telefonu (fiilen kimlik gibi kullanılıyor) | Kayıtta `532 123 45 67`; eşleştirme anahtarı `905321234567` (src/lib/tel.js:141) | Kullanıcı yazıyor | Herkes | Dört ayrı eşleştirme kuralı var. Aynı kişinin talepleri en az üç ayrı biçimde yazılıyor. Numara değişince eski talepler kişiden kopuyor |
| Personel kimliği ve numarası | `PRS007` (numara.js:12) | uid + tarayıcı sayacı (veri.js:372-373) | Personel | İz kayıtları kişiyi adıyla tutuyor; iki bilgisayar aynı PRS numarasını verebilir |
| Personel giriş adı | `serhat.tecimen` (veri.js:315); ilk yönetici `admin` (veri.js:334) | Addan öneriliyor, Türkçe kurala göre küçük harfe çevriliyor (veri.js:316-326, 358) | Personel | Ad düzeltilince giriş adı da sessizce değişiyor. Büyük "I" küçültülünce "ı" oluyor ve giriş eşleşmiyor |
| Rol kimliği | `sevkiyat-ekibi` (src/data/yetkiler.js:187), `servis` | Rol adından türetiliyor (yetkiler.js:188-198) | Kimse | `servis` hem PAKSAN'ın servis masası rolü hem dış servis firmasının işlemleri için kullanılıyor. "Satış - Destek" adı `satis---destek` oluyor |
| Yetki kimlikleri | `talepler`, `talepGeriAc`, `rolYonetimi` | Sabit liste (yetkiler.js:36-92) | Kimse | Adı değiştirilen yetki rollerden sessizce siliniyor; denetim yalnız uygulamada |
| Servis firması kimliği | `konya-servis` (src/marka/katalog/servisler.js:70) | Koddaki 14 temsilî kayıtta il adından elle yazılmış; backoffice'ten eklenen kayıtta uid | Kimse | Liste uydurma. Süzgeç açıkken kaydetmek listeyi siliyor. Silerken bağlı kayıtlara bakılmıyor |
| Servis firması numarası | `SRV001` (servisler.js:71) | Tarayıcı sayacı, kayıt sayısına göre yükseltiliyor (src/backoffice/ekranlar/Servisler.jsx:326-327) | Personel, servis | Servis talebiyle aynı önek. Sayacı düşük bir tarayıcı var olan bir numarayı yeniden verebiliyor |
| Servis giriş adı | `konya` (src/servis/demoKimlik.js:10) | Personel serbest yazıyor | Servis | Form benzersizlik denetimini atlıyor. Adı "i" ile başlayan servislerde klavyenin baş harfi büyütmesi girişi bozuyor |
| Servis cari bilgileri | Unvan, vergi dairesi, vergi no, IBAN | Personel formu (Servisler.jsx:539-571) | Personel, muhasebe | Şahıs servisin T.C. kimlik numarası `vergiNo` adlı alanda duruyor. LOGO cari kodu alanı yok |
| Bayi kimliği | `konya-merkez` (src/marka/katalog/bayiler.js:49) | 20 temsilî kayıtta il adından elle; yeni kayıtta uid | Kimse | LOGO cari kodu alanı yok, süzgeç sorunu burada da var. "Fabrika ayarına dön" sonradan eklenen bayileri siliyor |
| Bayi numarası | `BAY001` (bayiler.js:50) | Tarayıcı sayacı, kayıt sayısına göre | Personel | Servis numarasıyla aynı sayaç kusuru |
| Müşterinin fatura kimliği | TC 11 hane, vergi no 10 hane | Müşteri yazıyor, uygulama kontrol haneleriyle denetliyor (src/lib/kimlik.js) | Müşteri gizlenmiş hâliyle (src/screens/RequestDetail.jsx:274-282), personel (Talepler.jsx) | LOGO carisiyle eşleşmede anahtar olup olmayacağı kararlaştırılmamış |
| PAKSAN banka hesabı | Yer tutucu `TR00 0000 0000 …` (kimlik.js:140, yorum satırı) | Elle girilecek | Müşteri | IBAN'lar henüz gelmedi |
| **C. Ürün, makine, parça** | | | | |
| Ürün / model kimliği | `orkinos-1270` (src/marka/katalog/products.js:61) | 20 ürün, elle yazılmış | Kimse; ekranda ürün adı görünüyor | LOGO malzeme kodu alanı yok. Tek kimlik birden çok satılabilir varyantı kapsıyor (ör. Super Yunus'un 6 varyantı) |
| Kategori ve destek ailesi | `buyuk-balya`; aile `balya` (products.js:17, 599) | Elle | Kimse | Büyük ve küçük balya tek ailede: Orkinos sahibine küçük balya parçaları listeleniyor |
| Seri numarası öneki | `ORK1270` (products.js:65) | Elle yazılmış, uydurma | Müşteri, servis | Harfler silinince önekler çakışıyor; 11 önekte hiç rakam yok (3.6) |
| Makine seri (şase) numarası | `ORK1270-2024-00157` (src/lib/serial.js:114) | Müşteri ya da servis yazıyor; tiresiz ve büyük harfle saklanıyor | Müşteri, servis, personel; LOGO'ya sorgu olarak gidecek | Biçim uydurma. Sadeleştirme birkaç ayrı kuralla yapılıyor ve LOGO sorgusu harfleri siliyor. Sahte örnek seriler müşteri ekranında duruyor |
| Üretim yılı ve garanti | `2024`; garanti yıl + 2 (serial.js:90) | Seriden okunuyor | Müşteri (garanti rozeti), servis, personel | Garanti satıştan değil üretim yılından başlıyor. Fatura tarihi alanı var ama kullanılmıyor |
| Müşterinin telefonundaki makine | uid (araç verisinde `mk1`) | Cihazda (AppState.jsx:218-231) | Kimse | Aynı makinenin birbirine bağlanmamış 3-4 ayrı kimliği var |
| Kayıtlı makine satırı (makine, bayi ve servis bağı) | uid | Müşteri ya da servis kayıt açınca (src/lib/makineKaydi.js:60-139) | Personel (Kayıtlı Makineler) | Aynı seri için birden çok satır açılabiliyor ve en yeni satır atamanın önüne geçiyor. 500 satırı aşan eski satırlar siliniyor |
| Yedek parça kodu | `20131010102.01`, `151061807Z2`, `155030405028414634` (sunucu-taklidi/parca-katalogu/katalog.json) | PAKSAN Temmuz 2026 fiyat listesi PDF'inden okunuyor (21.09.2026'dan beri backoffice'te: src/lib/fiyatListesiOku.js; önce tools/parca-katalogu.py) | Müşteri (parça seçimi src/screens/ParcaSecEkrani.jsx:287, ödeme adımı RequestForm.jsx:888, talep detayı RequestDetail.jsx:698), servis, personel | LOGO malzeme kodu olduğu doğrulanmadı. 18 haneli kod sayı olarak işlenirse bozulur |
| Parça grubu ve görseli | `ip-gerdirme-sistemi`; `20131010102.01.webp` | Grup PDF başlığından, görsel adı koddan | Servis, müşteri (ad ve resim) | Başlığın yazımı değişince grup kimliği de değişiyor. Parçada makine ya da model alanı yok |
| Fiyat listesi sürümü | `surum: 1`, kaynak "PAKSAN TEMMUZ 2026 FİYAT LİSTESİ.pdf" | Yayına almada bir artıyor (sunucu-taklidi/fiyat-listesi-yayini.mjs; 21.09.2026'ya kadar betikte sabit 1'di) | Personel | Bugünkü liste hâlâ 1: backoffice'ten ilk yeni liste yüklenince 2 olacak. Görsel adreslerine de ekleniyor (önbellek) |
| Katalog dışı parça | `Diğer` (src/data/talepAlanlari.js:255) | Ekrandaki yazı veri olarak kaydediliyor | Müşteri, personel | Kodu olmadığı için LOGO'ya ya da stoğa aktarılamıyor |
| Kılavuz paketi kimlikleri | `MCH_PAKSAN_BALYA_SUPER`, `DOC_HAMMER_KULLANIM_KILAVUZU_20251201_7E1FB6D5` | Dışarıda üretilmiş paket (src/marka/icerik/mobile_support_package.json) | Kimse | Ürün kimliği ve parça kodu varken iki ayrı model kimliği sistemi daha var. Bir belge kimliğinde tarih 7 haneye kırpılmış. Destek kaydı arıza akışının kimliğini saklamıyor |
| LOGO seri sorgusu cevabı (sözleşme taslağı) | `{"seri":"1270240001","bayiId":"konya-merkez","model":"orkinos-1270", …}` (src/lib/logo.js:63-70) | Bugün kapalı, hep boş dönüyor | Kimse | LOGO bizim iç adlarımızı bilmez. Örnek seri uygulamanın biçimiyle çelişiyor. Fatura numarası alanı yok |
| **D. Durum ve sınıflandırma kodları** | | | | |
| Talep türü | `servis`, `parca`, `satinalma` (src/lib/talep.js:16-48) | Sabit liste | Kimse; ekranda türün adı görünüyor | Tanınmayan tür sessizce "servis" sayılıyor (talep.js:49-51). Fiyat teklifi beş ayrı adla geçiyor: satinalma, TKF, "Fiyat teklifi", rol `satis`, rapor `satis` |
| Talep durumu, masa, sahip | `yeni`, `incelemede`, `planlandi`, `teklif`, `onayBekliyor`, `parcaBekliyor`, `kapandi`, `iptal` (veri.js:578-636); sahip `servis`/`paksan`/`bayi` (veri.js:825, 844; AppState.jsx:315) | Sabit liste | Personel, müşteri, servis (çevrilmiş adıyla) | Tanınmayan durum sessizce "yeni" sayılıyor. Eski `gonderildi` ve `bayide` durumları için dönüşüm yok. CLAUDE.md'deki "Bayide" durumu kodda `kapandi` + sahip `bayi` olarak yazılıyor |
| Servis kaydı kapısı, garanti dışı işareti, yapılan iş | `kapi: 'garanti'`, `garantiDisi: true`, `yapilanIs: 'Ayar Yapıldı'` (src/lib/servisKaydi.js) | Sabit liste; yapılan iş ekrandaki yazıyla kaydediliyor | Servis, personel | Garanti ayrımı eski kayıtta bir alanda, yeni kayıtta başka bir alanda duruyor. Yapılan iş için kod yok |
| İşlem kaydı türü | `talep`, `durum`, `hakkedis`, `servisKaydi`, `sevk` … | Yazan her yer kendi yazısını veriyor | Personel | Yazılan türlerle ekrandaki süzgeç listesi uyuşmuyor (3.15) |
| Duyuru türü, bildirim sözlük anahtarı, dil | `kampanya`, `geriCagirma`; `talepDurum.parcaBekliyor` (src/data/duyuruTurleri.js, veri.js:1862) | Sabit liste; bildirimde ekran yazısı yerine sözlük anahtarı saklanıyor | Müşteri, servis | Duyuruya dil bilgisi yazan kod yok. Yurt dışı satış açılınca yurt dışındaki müşteriye güvenlik uyarısı dahil hiçbir duyuru gitmez (src/lib/duyuruHedef.js:135) |
| Ekran yazısıyla saklanan seçimler | Ulaşım, iptal nedeni, satış sonucu, ürün tipi, arazi, traktör (ör. `Fark etmez`, talepAlanlari.js:52) | Seçeneğin Türkçe yazısı veri olarak kaydediliyor | Personel | Yazı değişince eski ve yeni kayıtlar ayrı sayılır; veritabanında bunlar için kod tablosu gerekecek |
| İl ve ilçe | `Konya`, `Selçuklu` (src/data/iller.js) | Ad metni; yurt dışı bölge de aynı alanda | Herkes | Plaka ya da ilçe kodu yok, eşleşme yazının birebir aynı olmasına bakıyor. Excel'den içe aktarmada yazım denetlenmiyor |
| Ülke | `TR`, `DE`, `XK` (src/data/ulkeler.js) | İki harfli uluslararası kod | Kimse | Tanınmayan kod sessizce Türkiye sayılıyor (ulkeler.js:105-112). Talepte konum ülkesi ve telefon ülkesi var, ama alan adları bu ayrımı belli etmiyor |
| Para birimi ve KDV | `TL`; KDV 0.2; liste KDV hariç (src/marka/katalog/para.js) | Sabit | Herkes | Kayıtlarda para birimi ve KDV kuralı saklanmıyor |
| Bakım rehberi işareti | Makine kimliği, rehber, bölüm ve sıra, dik çizgiyle birleştirilmiş (src/lib/rehberIsaret.js:35-37) | Cihazda | Kimse | Rehberdeki madde sırası değişince işaret başka maddeye kayıyor. Demo verisi bu işareti yanlış biçimde yazıyor |
| KVKK onay sürümü | `1.0` (src/data/kvkk.js:20) | Elle | Müşteri, personel | Hukukçu onayından sonra artırılmazsa taslak metne verilen onaylar geçerli sayılır |
| Uygulama sürümü ve ürün adı | Connect `0.9.14`, Servisim `0.1.2`; `app`/`backoffice`/`servis` (src/lib/urun.js) | Elle / açılışta | Kimse | Talep, servis kaydı ve işlem kaydı hangi sürümden geldiğini taşımıyor |
| **E. Güvenlik, bildirim, ortam** | | | | |
| Şifre özeti | `{ tuz, ozet }`, 6 rakamlı şifre (src/lib/hesap.js:81-102) | Cihazda tek turluk SHA-256 | Kimse | Şifre kısa, özet zayıf. Sunucuya nasıl taşınacağına karar verilmedi. Düz HTTP bağlantısında giriş hiç çalışmıyor |
| Personel şifre değiştirme bağlantısı | 32 karakter, 24 saat geçerli (veri.js:511-545) | Güçlü rastgele | Personel | Giriş ekranında oturum açmamış kişiye gösteriliyor (src/backoffice/Backoffice.jsx:614-645) |
| Müşteri şifre sıfırlama kodu | 6 hane (hesap.js:239) | Cihazda; demoda ekrana basılıyor (hesap.js:284) | Müşteri | Sunucu tarafı yok, deneme sınırı yok |
| Bildirim kimlikleri | `duyuru-` + uid (src/lib/bildirimler.js:105); Android bildirim numarası `55091` (fonksiyon çıktısı, src/lib/bildirim.js:172-175) | Türetiliyor / saniyeden başlayan sayaç | Kimse | Okundu bilgisi cihazda. Android numarası başa sarınca perdede duran bir bildirimi silebiliyor |
| Yerel depo anahtarları | `paksan.requests`, `paksan.sayaclar` (önek storage.js:5; adlar veri.js:28, numara.js:29) | Sabit ad | Kimse | Demo, pilot ve canlı ayrımı yok. Defterler 500, 400, 200 ve 50 satırda kırpılıyor |
| Demo işareti ve demo hesapları | `demo: true`; `konya`/`123456`, `admin`/`123456` | Demo yükleyici (src/backoffice/demo.js, src/servis/demoKur.js) | Personel, servis | Demo kayıt üzerinde yapılan işlem, demo işareti taşımayan gerçek kayıt üretiyor. Demo personel e-postaları şirketin gerçek alan adında |
| Android uygulama kimliği | `com.paksanmakina.app`, `com.paksanmakina.servis` (tools/cap-hedef.mjs:35, 41) | Sabit | Play Store | Demo, pilot ve canlı sürüm aynı kimliği taşıyor; güncellemede eski demo verisi telefonda kalıyor |
| **F. Bugün olmayan ama gereken kodlar** | | | | |
| LOGO tarafının kodları | — | Yok (src içinde logoKod/cariKod/erpKod aranınca bulunamadı) | — | LOGO cari kodu, malzeme kodu ve LOGO firma numarası yok. Fatura, irsaliye ve tahsilat fişi numarası ile e-belge ETTN'si de yok |
| Ziyaret numarası ve hak ediş dönemi | — | Yok | — | İkinci ziyaret ilkinden ayrılamıyor; aylık döküm yok |
| Ürün markası (çok marka planı) | Planda `paksan` | Uygulanmadı (src/marka/katalog/markalar.js yok) | — | Veritabanı taslağında marka sütunu yok |

---

## 3. Sorunlar

Sorunlar önem sırasına göre dizildi. Pilot engelleri 3.1 ile 3.6 arasında. 3.9 ve 3.10 ise pilotun kapsamına göre engel olabilir.

### 3.1 [PİLOT ENGELİ] Sunucu olmadan taraflar birbirinin kaydını görmüyor

Bu bir numara sorunu değil, ama bütün numara kararlarının ön şartı. Bugün kayıt gönderen yol yalnız iki yerde var: müşteri talebi (ihracat talebi dahil) ve geri bildirim (src/lib/sunucu.js:18-40, AppState.jsx:319-327, geriBildirim.js:26). İkisi de ayarlarda kapalı. Kodda başka ağ çağrıları da var, ama bunlar kayıt göndermiyor: giriş ve şifre sıfırlama (hesap.js:125, 248), destek sohbeti (destekAsistani.js:100), LOGO seri sorgusu (logo.js:88) ve parça kataloğu (parcaKatalogu.js:56).

Aşağıdakiler hiç gönderilmiyor ya da hiç okunmuyor:

- **PAKSAN'ın servis ataması ve servis listesi.** Kayıtlı Makineler ekranında yapılan atama ile servis listesi yalnız backoffice tarayıcısında duruyor (makineKaydi.js:41-46, veri.js:1661-1668). Müşterinin telefonundaki atama okuması yalnız telefonun kendi deposuna bakıyor (servisAtama.js:42-46). Bu yüzden ayrı cihazlarla yürüyen pilotta hiçbir müşteri servis talebi açamaz.
- Müşteri hesabı kaydı ve makine kayıt defteri.
- Servis kaydı, hak ediş, servis parça siparişi ve elle kayıt.
- Backoffice'te yapılan durum değişiklikleri ve kişisel bildirimler (`duyurular`).
- Cari hareket ve işlem kaydı.
- Numara değişikliği talebi ve servis şifre talebi.
- Ek dosyaları (dekont dahil).

**Senaryo:** Pilot servis Konya'da bir tarlada Servisim'den elle kayıt açıyor ve numarayı müşteriye SMS ile gönderiyor.

- Kayıt yalnız servisin telefonuna yazılıyor (ElleKayit.jsx:210).
- PAKSAN'ın backoffice'i bu kaydı görmüyor ve hak edişi onaylayamıyor. Kayıt müşterinin uygulamasında da çıkmıyor.
- Servisin aynı gün verdiği parça siparişi PAKSAN'a ulaşmıyor (veri.js:2180).
- Müşterinin yüklediği havale dekontu yalnız müşterinin telefonunda kalıyor (ekler.js:13-15).

**Ek tuzak:** Sunucu açık yapılıp bir adres boş bırakılırsa istek gönderilmiyor, ama sonuç gönderilmiş gibi dönüyor (sunucu.js:19-22). Geri bildirim bu durumda "gönderildi" diye işaretleniyor (geriBildirim.js:27). Bekleyen kayıtları sonradan gönderecek bir kod yazılsa bile bunları atlar.

### 3.2 [PİLOT ENGELİ] Sayaçlar cihaz başına: aynı numara kesin olarak iki kişiye verilir

**Senaryo:** Pilotun ilk haftasında iki çiftçi kendi telefonundan kayıt oluyor. İkisi de MST000001 alıyor (AppState.jsx:184, numara.js:44-48). Geri bildirimde de aynısı oluyor: her telefon GBD000001'den başlıyor.

**Senaryo:** Backoffice iki bilgisayarda açılıyor ve iki personel aynı gün birer servis ekliyor. İkisi de aynı SRV numarasını alıyor.

**Sayaç ayrıca yanlış yere bakıyor.** Sayaç yalnız yukarı çekiliyor, hiç geri alınmıyor (numara.js:52-56). Ama en büyük numaraya göre değil, ekrandaki kayıt sayısına göre yükseltiliyor (Servisler.jsx:326-327, Bayiler.jsx:268-269). Bu yüzden sorun, sayacı düşük (örneğin yeni açılmış) bir tarayıcıda çıkıyor:

- 14 servisten biri silinmişse, yeni tarayıcıda sayaç 13'e yükseltiliyor. Yeni servis, zaten var olan SRV014 numarasını alıyor.
- İl süzgecinde tek servis görünürken sayaç 1'e yükseltiliyor. Yeni servis, zaten var olan SRV002 numarasını alıyor (Ankara servisi, servisler.js:82).

**Demo da sayaçları harcıyor.** Demo verisi yüklenmiş bir tarayıcıda ilk gerçek müşteri MST000031'den, ilk gerçek personel PRS012'den başlıyor. Demo temizlense bile sayaç geri alınmıyor (demo.js:362, 410, 1009-1023).

### 3.3 [PİLOT ENGELİ] Kimliği kaybettiren üç hata

**a) Süzgeç açıkken kaydetmek listeyi siliyor.** Servisler ve Bayiler ekranı, kaydederken ekranda görünen süzülmüş listeyi depoya yazıyor. Bu durum silme, ekleme, düzenleme ve Excel'den içe aktarmanın hepsinde oluyor (Servisler.jsx:133-158, 304, 326-345; Bayiler.jsx:72-102, 245, 268-271). Koddaki yorum bunun tersini söylüyor (Servisler.jsx:160-161).

**Senaryo:** Personel il süzgecini "Konya" yapıyor ve Konya servisinin telefonunu düzeltiyor. Öteki 13 servis depodan siliniyor. Onlara bağlı açık talepler, makine atamaları, cari bakiye ve giriş hesapları sahipsiz kalıyor.

- Silinen servis yeniden eklenirse yeni bir kimlik ve yeni bir numara alıyor. Geçmişi eski kimlikte kalıyor ve birleştirme yolu yok.
- Bütün servisler silinirse 14 uydurma servis geri geliyor (src/lib/icerikDeposu.js:34-37).

**b) Personel düzenlemek şifreyi siliyor.** Düzenleme formu şifre alanını boş açıyor. Kaydedince bu boş değer kayıttaki şifre özetinin üstüne yazılıyor (Personel.jsx:136, 172; veri.js:411-414). Kişinin adı düzeltildiyse, aynı kayıtta giriş adı da addan yeniden türetiliyor (Personel.jsx:280-288).

**Senaryo:** Yönetici bir personelin adındaki yazım hatasını düzeltiyor. O kişi ertesi sabah hem yeni bir giriş adına geçmiş hem de şifresiz kalmış oluyor ve "şifre yanlış" uyarısı alıyor (hesap.js:103). Tek çıkış yolu e-posta bağlantısı, ama uygulama bugün e-posta göndermiyor.

**c) Yeni makine satırı PAKSAN'ın atamasını görünmez yapıyor.** Müşterinin servisi, seri numarasıyla eşleşen ilk satırdan okunuyor. Yeni satırlar listenin başına eklendiği için ilk satır hep en yenisi oluyor (servisAtama.js:45, makineKaydi.js:133). Eşleştirme seri numarasını yalnız baştaki ve sondaki boşlukları silerek birebir karşılaştırıyor (servisAtama.js:43-45). Başka bir kuralla (tireli ya da küçük harfli) yazılmış satır hiç bulunamıyor.

**Senaryo:** PAKSAN, Kayıtlı Makineler ekranından bir makineyi Konya servisine atıyor (Makineler.jsx:171). Müşteri telefon değiştirip makinesini yeniden ekliyor, ya da makineyi ikinci el alan biri kaydediyor. Servissiz yeni bir satır listenin başına yazılıyor. Müşteri servis talebi açamıyor ve uygulama ona "PAKSAN ile iletişime geçin" diyor (RequestForm.jsx:689-703). Backoffice'te buna dair bir uyarı çıkmıyor.

- **İkinci durum:** Servis, elle kayıtta seri numarasını kendisi yazarsa kendini o makineye atamış oluyor (ElleKayit.jsx:230-236). Bu, "atama PAKSAN'ın kararıdır" ilkesine aykırı.
- **Üçüncü durum:** Defter 500 satırı geçince en eski makinelerin atamaları siliniyor (makineKaydi.js:89, 133).

### 3.4 [PİLOT ENGELİ] Güvenlik: şifre bağlantısı ve herkesin bildiği şifreler

**Senaryo:** Pilot backoffice internete açılıyor. Giriş ekranındaki şifre değiştirme formuna bir personelin kullanıcı adını yazan herkes, o personelin şifre değiştirme bağlantısını ve e-posta adresini ekranda görüyor (Backoffice.jsx:614-645, 637; veri.js:521-544). Form ayrıca kullanıcı adının var olup olmadığını da söylüyor (veri.js:526).

Bilinen şifreler:

- İlk yönetici `admin` / `123456`. Personel listesi boşsa bu hesap her girişte yeniden kuruluyor (veri.js:334-354).
- Demo personelin hepsinin şifresi 123456 (demo.js:368, 371).
- Servis demo hesabının kullanıcı adı ve şifresi her pakete derleniyor (demoKimlik.js:10). Hesap ise yalnız `data-demo="acik"` işareti duran pakette kuruluyor (src/servis/main.jsx:49-50, servis.html:16).

Diğer riskler:

- Rol ve kimlik bilgisi telefonda ya da tarayıcıda duruyor ve değiştirilebiliyor (CANLIYA-CIKIS.md:73-85).
- Şifre değiştirme jetonu düz metin olarak saklanıyor ve adres satırında taşınıyor.
- Excel'den personel içe aktarılırken ilk şifre tahmin edilebilir bir rastgele üreteçle (`Math.random`) oluşturuluyor ve kimseye iletilmiyor (Personel.jsx:424-425).
- Şifre özeti yalnız güvenli (HTTPS) bağlantıda çalışıyor (hesap.js:53-64). Pilot backoffice iç ağda düz HTTP ile yayınlanırsa kimse giriş yapamaz.

### 3.5 [PİLOT ENGELİ] Demo ile gerçek kayıt karışıyor, ortam ayrımı yok

**Demo kaydı üzerinde yapılan işlem, demo işareti taşımayan gerçek kayıt üretiyor:**

- hak ediş onayının yazdığı cari hareket (veri.js:1945-1956),
- kapanıştaki bakiye borcu (veri.js:1090-1099),
- müşteriye bildirim (veri.js:987-990),
- işlem kaydı (veri.js:2472-2480),
- servis siparişi (veri.js:2180),
- elle kayıt ve makine satırı (ElleKayit.jsx:210, 226-235).

"Demoyu temizle" düğmesi bunları silmiyor. Sayaçları, 14 uydurma servisi, işlem kaydını ve telefonun dosya deposunu da silmiyor (demo.js:1009-1023). Demo kodunda "gerçek kayıtlara dokunmaz" diye yazıyor (demo.js:8-11); bu doğru değil.

**Senaryo:** Pilot servise daha önce demo APK kurulmuş bir telefon veriliyor. Gerçek sürüm aynı uygulama kimliğiyle güncelleniyor (Servisim için android-servis/app/build.gradle:7, Connect için android/app/build.gradle:7). Güncelleme eski veriyi silmediği için telefonda 14 uydurma servis ve `konya` demo hesabı kalıyor (demoKur.js:67-73, icerikDeposu.js:35-38). Demo makine satırları gerçek satırların önüne konduğundan (demo.js:492-495), aynı seri numarası iki kez varsa müşteriye demo servisi atanıyor.

**Diğer ortam sorunları:**

- Demo kargo takip numaraları gerçek biçimde rastgele üretiliyor (demoServis.js:345-350). Demo TC ve vergi numaraları da rastgele üretiliyor (demo.js:1075-1093). Uygulama bu numaraları kontrol haneleriyle denetlediği için çoğu geçersiz; yine de demo TC'lerin yaklaşık %1'i kontrol hanesini tutturabilir. Excel'e aktarılınca bunlar gerçek veriden ayırt edilemiyor.
- Demo personel e-postaları şirketin gerçek alan adında (demo.js:366). E-posta gönderimi bağlanınca gerçek posta kutularına gidebilir.
- Ortam ayarları koda sabit yazılmış (config.js:78-81, 146-164).
- `npm run dogrula -- --yayin`, servis paketindeki `data-demo` işaretini yakalıyor (tools/dogrula.mjs:787-788), ama öteki demo ayarlarının çoğunu yakalamıyor (dogrula.mjs:765-799).
- Yalnız kod okunarak doğrulandı, telefonda denenmedi: Servis APK'sında parça kataloğu inmezse demo verisi hiç kurulmuyor, yine de kurulmuş gibi işaretleniyor (demoKur.js:53-56).

### 3.6 Seri numarası: gerçek biçim bilinmiyor [PİLOT ENGELİ], harf silme [canlı engeli; bir yönü pilotu da etkiliyor]

- **Biçim uydurma [PİLOT ENGELİ].** "ORK1270-2024-00157" biçimi uygulama için varsayılmış (serial.js:3-13, CANLIYA-CIKIS.md:228-230). Gerçek biçim farklı çıkarsa hiçbir makine tanınmaz. Çözümü kolay: birkaç plaka fotoğrafı yeterli.
- **Harf silme (senaryo).** LOGO bağlantısı açılıyor ve seri numaraları harfleri silinerek sorgulanıyor (logo.js:81). ORK870-2024-00001 ile ALB870-2024-00001 makinelerinin ikisi de LOGO'ya "870202400001" diye soruluyor (önekler products.js:95, 117, 134). Sorun bu üçlüyle sınırlı değil. Hiç rakam içermeyen 11 önekin (SYNS, HMR, IPAK, DMD, PLC, SCRP, AHTP, YNGC, KRLG, RTV, TSVY) aynı yıl ve sıradaki bütün makineleri aynı numarayla, örneğin `202400001` olarak soruluyor. S8002 ile S8002E de çakışıyor. Sonuçta LOGO yanlış makinenin bayisini döndürüyor, zincir yanlış servise gidiyor ve hak ediş yanlış tarafa yazılıyor. LOGO cevap örneğindeki seri ('1270240001', yalnız rakam) uygulamanın kendi biçimiyle de çelişiyor (logo.js:64).
- **Kimlik doğrulama (pilotu da etkiliyor).** Telefon numarası değişikliğinde seri numarası kimlik kanıtı olarak isteniyor. Harfler silindiği için başka bir modelin aynı yıl ve sıra numarası da "doğru" sayılıyor (veri.js:1527-1533).
- **Sahte örnek seriler.** Müşteri ekranındaki "DENEME" kartında her koşulda görünüyor (AddMachine.jsx:215-238). Pilotta iki gerçek müşteri aynı sahte seriyi kaydedebilir.
- **Garanti (senaryo).** 2024'te üretilip 2026'da satılan makinenin garantisi "doldu" görünüyor, çünkü garanti üretim yılından hesaplanıyor (serial.js:94-101; ServisKapanisi.jsx:89-100 bunu kabul ediyor). Servis, garanti kapsamındaki işi garanti dışı kapatıyor; müşteriden para isteniyor ve hak ediş yanlış çıkıyor.
- **Tutarsız yıl.** Talepler ekranı yılı başka bir kuralla okuyor: "S8002-1998-20055" için bir yerde 2005, öteki yerde 1998 çıkıyor (Talepler.jsx:1829-1835). Demoda seri ve yıl ayrı ayrı rastgele üretildiği için aynı makine iki ekranda farklı garanti gösterebiliyor.

### 3.7 LOGO kodlarının tutulacağı alan yok (pilot öncesi karar, canlı engeli)

Bayi, servis ve ürün kayıtlarında LOGO kodu alanı yok. LOGO bağlantı taslağı, LOGO'nun bizim iç adlarımızı döndürmesini bekliyor (logo.js:66-69).

**Senaryo:** LOGO bağlantısının açıldığı gün bir makinenin seri sorgusu, bayinin LOGO cari kodunu döndürüyor (bu kodun biçimi bilinmiyor). Uygulamada bu kodu taşıyan bir bayi yok, bu yüzden bayi araması boş dönüyor (bayiler.js:236-239). Makine, bayi ve servis zinciri kurulamıyor ve müşteri servis talebi açamıyor. Ürün modelinde de aynı şey oluyor.

**Pilotla ilgisi:** Pilot bayi ve servisleri bu alan olmadan açılırsa, LOGO geldiğinde hepsinin elle yeniden eşlenmesi gerekir.

Diğer eksikler:

- **Fatura numarası:** Hiçbir kayıtta alan olarak yok. Garanti başlangıcının kanıtı olarak istenen fatura numarası ve tarihi tutulamıyor (BAYI-YOL-HARITASI.md:152).
- **Hak ediş ve cari hareket:** LOGO'daki servis faturası, gider pusulası ya da ödeme fişiyle bağları yok.
- **"Makineyi kimden aldım" cevabı:** Serbest metin (Register.jsx:174). Bayi raporu aynı bayiyi farklı yazımlara göre ayrı satırlarda sayıyor (Raporlar.jsx:1250-1262).
- **Parça kodu:** LOGO malzeme koduyla aynı olup olmadığı doğrulanmadı; PDF'teki sütun başlığı okunamadı.

### 3.8 Talep numarası çakışması ve yeniden deneme (pilotta olasılık düşük, canlıda kesin)

**Olasılık.** Bir gün ve bir önek için yalnız 9000 olası değer var:

| Aynı gün, aynı önekte talep sayısı | Çakışma olasılığı |
|---|---|
| 10 | %0,5 |
| 20 | %2,1 |
| 50 | %12,8 |
| 100 | %42,4 |
| 112 | %50 |

Günde 10 talep açılırsa, 250 iş gününde en az bir çakışma yaşanma olasılığı yaklaşık %71. YPR numara alanını müşteri parça talebi ile servis siparişi, SRV alanını da müşteri servis talebi ile elle kayıt paylaşıyor.

**Çakışmanın etkisi:**

- **Havale (senaryo):** İki müşteri aynı gün YPR2609151873 numarasını alıyor. Banka ekstresinde iki havale aynı referansı taşıyor ve yalnız isimden ayrılabiliyor.
- **İki servis (senaryo):** İki ayrı servis aynı gün elle kayıt açıyor ve ikisi de aynı SRV numarasını alıyor. Numarada saat olmadığı için kayıtların hangi dakikada açıldığı fark etmiyor. Backoffice listesinde, İşlem Kaydı aramasında ve cari hareket açıklamasında aynı numara iki işe denk geliyor. Servislerin kendi hesap ekranları etkilenmiyor, çünkü her servis yalnız kendi taleplerini görüyor (Hakkedis.jsx:43-46, 188-189). Çakışan iki kaydı aynı servis açmışsa, o servisin hesap ayrıntısı yanlış işi açıyor.
- **Bildirim:** Yalnız aynı müşterinin kendi iki talebi aynı numarayı alırsa, bildirime dokunmak yanlış talebi açıyor. Bildirim başka bir müşterinin talebine gitmiyor, çünkü telefonda yalnız o müşterinin talepleri aranıyor (bildirimler.js:159-165, AppState.jsx:124-133).

**Yeniden deneme (senaryo).** Müşteri zayıf çekimde yedek parça talebini gönderiyor. Sunucu kaydı alıyor, ama cevap 30 saniye içinde gelmiyor (config.js:163). Ekran hata gösteriyor (RequestForm.jsx:684-686) ve müşteri yeniden basıyor.

- Yedek parçada numara formda tutulduğu için sunucuya **aynı numarayla ama farklı iç kimlikle** ikinci bir talep gidiyor.
- Servis talebinde ve fiyat teklifinde ise yeni numarayla ikinci bir talep açılıyor.

Aynı kaydın iki kez yazılmasını önleyen bir koruma yok.

**Diğer:**

- Numaradaki tarih cihaz saatine bağlı. Gece yarısından sonra gönderilen yedek parça talebinin numarası bir gün geride kalıyor.
- Demo talepler geçmiş tarihli olduğu hâlde numaralarında bugünün tarihi var (demo.js:689-690).

### 3.9 Yedek parça ödeme referansı kaydedilmeden veriliyor (pilotta havaleyle parça satılacaksa [PİLOT ENGELİ])

Numara ödeme adımında üretiliyor ve yalnız formun hafızasında duruyor (RequestForm.jsx:193-198, 484). Bugün de ekranda gösteriliyor; banka hesapları boş olduğu için yalnız IBAN listesi ve açıklama kalıbı gizli.

- **Senaryo 1:** Müşteri numarayı kopyalayıp banka uygulamasına geçiyor. Android arka plandaki uygulamayı kapatıyor. Müşteri döndüğünde form sıfırlanmış ve yeni bir numara üretilmiş oluyor. Havaledeki numara hiçbir talebe denk gelmiyor.
- **Senaryo 2:** Müşteri havaleyi yapıyor ama talebi göndermekten vazgeçiyor. Numara hiçbir yere yazılmadığı için muhasebe parayı bir talebe bağlayamıyor.
- **Senaryo 3:** Sunucu kendi numarasını verirse (AppState.jsx:327) havaledeki numara ile talep numarası birbirinden ayrışıyor.

Akışın asıl sorunu şu: Müşteriden havale, PAKSAN stoğu ve son tutarı (KDV dahil tutar ve kargo) doğrulamadan isteniyor. Parça stokta yoksa ya da fiyat değiştiyse, tahsil edilmiş para için iade faturası ve banka iadesi gerekir. Bu, muhasebe açısından en pahalı senaryodur. Ayrıca "·" işareti ve Türkçe harfler banka açıklamasında bozulabilir [doğrulanmadı]. Çiftçilerin bir kısmı açıklamaya hiç numara yazmayabilir.

### 3.10 Hak ediş ve cari hareketin kendi numarası yok, mükerrer satır yazılabiliyor (pilotta hak ediş gerçek parayla ödenecekse [PİLOT ENGELİ])

**İkinci ziyaret (senaryo):**

1. Müşteri "sorun devam ediyor" diyor ve talep aynı numarayla yeniden açılıyor (RequestDetail.jsx:563-567).
2. Servis ikinci kez gidiyor.
3. İkinci hak ediş ve onaydaki ikinci alacak, aynı açıklamayla ("SRV… · servis ödemesi") yazılıyor.

Sonuç: Muhasebe iki ödemeyi açıklamadan ayıramıyor. Servisin hesap ayrıntısı iki satırda da son ziyaretin işini gösteriyor (Hakkedis.jsx:189, 234-238). İkinci ziyaret çoğu zaman ilk işin eksik yapılmasından doğar. Bu yüzden ziyaret başına kendiliğinden doğan bir hak ediş, servisin kendi çıkarına kullanabileceği bir açık olur.

**Yeniden kapatma (senaryo, bugün tek tarayıcıda da oluyor):**

1. Yetkili personel kapanmış bir servis siparişini yeniden açıyor.
2. Siparişi yeniden kapatıyor.
3. Bakiyeden ödenmiş siparişe ikinci bir borç satırı yazılıyor, çünkü kapatma işlemi siparişin durumunu denetlemiyor (veri.js:1050-1100; Talepler.jsx:560-613).

Diğer eksikler:

- **Aynı anda onay:** Hak ediş onayı yalnız ekrandaki kopyanın durumuna bakıyor (veri.js:1932). Sunucuya geçince iki personel aynı anda onaylarsa iki alacak yazılır.
- **Ödeme kaydı:** PAKSAN'ın servise yaptığı ödemeyi yazan bir akış yok; tek örnek demo verisinde duruyor (demoServis.js:672-690). Bakiye yalnız hak ediş onayıyla artıyor ve yalnız bakiyeden ödenen parça siparişiyle azalıyor (veri.js:1088-1100). Uygulamanın bakiyesi LOGO'daki cari ekstreyle kısa sürede ayrışır, çünkü uygulama virman, mahsup, iade ve açılış devri fişlerini bilmiyor.
- **Cari hareket listesi:** Backoffice'te böyle bir ekran yok.
- **Fatura eşleşmesi:** Servis çoğu zaman her iş için ayrı fatura kesmez; ay sonunda tek fatura keser. Tek bir faturayı birçok hak edişe bağlayacak bir yapı yok.
- **Tutar:** Tek bir sayı olarak tutuluyor. KDV, tevkifat ve stopaj ayrımı yok.
- **Teklif:** İkinci teklif birincinin üstüne yazılıyor (veri.js:1171).

### 3.11 Müşteri kimliği yerine telefon yazısı kullanılıyor (sunucu tasarımında zorunlu)

Müşteri uygulamasından açılan talep, müşteri kimliğini taşımıyor (RequestForm.jsx:674-676, AppState.jsx:305-318). Talep ile müşteri, telefon yazısının birebir aynı olmasıyla eşleştiriliyor (veri.js:943; Musteriler.jsx:73, 202, 252, 510).

**Biçim farkı (senaryo):**

- Çiftçi kendi uygulamasından bir talep açıyor; telefonu "532 123 45 67" diye yazılıyor.
- Servis aynı çiftçi için elle kayıt açıyor; telefon "05321234567" diye yazılıyor. Servis baştaki sıfırı yazmazsa "5321234567" oluyor (ElleKayit.jsx:189-190).

Sonuç: Müşteriler ekranı çiftçinin yalnız bir talebini sayıyor. Sadakat ve bölge raporları ise onu iki ayrı müşteri sayıyor (Raporlar.jsx:894-907, 1225).

**Servis siparişi:** Siparişte servisin kendi telefonu yazılıyor ve raporlar servisi müşteri gibi sayıyor (veri.js:2129-2134, Raporlar.jsx:189).

**Numara değişikliği (senaryo):** Müşterinin telefon değişikliği onaylanıyor, ama yalnız hesaptaki numara değişiyor (veri.js:1558-1572). Eski talepler Müşteriler ekranında sıfıra düşüyor. Eski taleplere sonradan yazılan bildirim kimseye gösterilmiyor (veri.js:980-990). Yeni numaranın başka bir hesapta kayıtlı olup olmadığına da bakılmıyor.

**Ülke:**

- Birebir eşleşme ülkeyi hesaba katmıyor. Farklı ülkelerde aynı numarayı taşıyan iki kişi Müşteriler ekranında aynı kişi sayılıyor.
- Tanınmayan ülke kodu sessizce Türkiye sayılıyor ve eşleştirme anahtarı yanlış hesaplanıyor (ulkeler.js:105-112).

**Servis telefonunda gerçek müşteri bulunamıyor.** Elle kayıttaki müşteri araması yalnız o telefondaki listeye bakıyor (ElleKayit.jsx:99-104, veri.js:1470-1474). Demo APK'da demo müşteriler bulunuyor, gerçek müşteri bulunamıyor.

### 3.12 Addan türeyen kimlikler ve adla tutulan kişiler

- **Personel:** İşlem kaydında, notlarda, talep geçmişinde ve cari harekette personel görünen adıyla yazılıyor (Backoffice.jsx:184, veri.js:2477). Aynı adı taşıyan iki personel ayırt edilemiyor. Ad düzeltilince eski kayıtlar o kişiye bağlanamıyor (IslemKaydi.jsx:120).
- **Giriş adı:**
  - Personelin adı düzeltilince giriş adı da sessizce değişiyor (Personel.jsx:280-288; şifre silinmesiyle birleşmesi için bkz. 3.3b).
  - Servis girişinde klavyenin baş harfi büyütmesi kapatılmamış (ServisPanel.jsx:316-323). Giriş adı Türkçe kurala göre küçültülüyor (veri.js:2320). `konya` yazımı `Konya` olsa da sorun çıkmıyor, ama "i" ile başlayan adlar bozuluyor. Senaryo: Kullanıcı adı "izmir.servis" olan servisin klavyesi "Izmir.servis" yazıyor, uygulama bunu "ızmir.servis" yapıyor ve giriş reddediliyor.
  - Veri katmanında giriş adının benzersizliğini denetleyen bir fonksiyon (`servisHesabiYaz`) var, ama backoffice formu bu fonksiyonu çağırmadan doğrudan yazıyor (Servisler.jsx:341-345). Fonksiyonu yalnız demoKur.js:62 kullanıyor. Aynı ad iki servise verilirse giriş ilk kayda göre denetleniyor (veri.js:2287-2296). Bu durumda ikinci servis kendi şifresiyle giremiyor; iki servisin şifresi aynıysa birincinin hesabına giriyor.
- **Rol:**
  - `servis` rol kimliği hem PAKSAN'ın servis masası rolü hem dış servis firmasının işlemleri için kullanılıyor. İşlem Kaydı, PAKSAN servis masasındaki personelin işlemlerini "Servisler" başlığı altında, dış servis işlemi gibi gösteriyor (IslemKaydi.jsx:79-81, 120-121).
  - Silinip aynı adla yeniden açılan rol, eski kayıtları kendi adıyla gösteriyor.
- **Excel ile rol aktarımı:** Dışa aktarım rolün adını yazıyor, içe aktarım ise yalnız beş sabit adı tanıyor (Personel.jsx:387-434). Sonradan açılmış bir rol geri yüklenemiyor. Servis türünde yazım hatası olursa kayıt sessizce "tüzel kişi" sayılıyor (Servisler.jsx:877, 907).
- **Eskiyen ad kopyaları:** Talepte, makine satırında ve cari harekette servis ve bayi adının bir kopyası duruyor. Ad değişince bu kopyalar güncellenmiyor (AppState.jsx:312, makineKaydi.js:82, 119, veri.js:823).

### 3.13 Aynı önek iki farklı şeyi anlatıyor

- **SRV:** Hem servis firmasının numarası (SRV001) hem servis talebi (SRV2608…). İşlem Kaydı araması ikisini aynı kutuda arıyor (IslemKaydi.jsx:174, numara.js:17-20).
- **YPR:** Hem müşteri parça talebi hem servis parça siparişi. LOGO sipariş fişinde numaraya bakarak hangisi olduğu anlaşılamıyor.
- **Yurt dışı talep:** Numarada ayrılmıyor; ayrım yalnız kayıttaki bir işarette (veri.js:722).

### 3.14 Ürün kimliğinin kapsamı ve parça–model eşleşmesi kaba

- **Ürün kimliği birden çok varyantı kapsıyor:** Diamond dikey 10 hacmi, rotovatör 6 modeli, Super Yunus 6 varyantı tek kimlikte topluyor (teknikOzellikler.js:78, 560, 956). "DUAL 2" ve "3 YABALI" hem varyant hem ayrı ürün olarak tanımlı. Makine kaydı varyantı saklamıyor (AppState.jsx:219-228). LOGO'daki stok kartı varyant düzeyindeyse eşleşme bire çok olur [doğrulanmadı].
- **Yanlış parça listesi:** Büyük ve küçük balya tek aile sayılıyor ve 32 parça grubu "balya" ailesine bağlanmış (products.js:599, parcaGruplari.js:72). Katalogda adında ORKA, ORKİNOS ya da ALBATROS geçen parça yok, YUNUS geçen 59 parça var. Bu yüzden Orkinos sahibi küçük balya parçalarını görüyor.
- **Aynı adlı parçalar:** Müşteri parça talebinin asıl kaydı kod anahtarlı (`parcaFiyat.satirlar`, RequestForm.jsx:656-661; okuma önceliği servisKaydi.js:311-331). Eski okuyucular için tutulan `parcaAdet` alanı ise ad anahtarlı (RequestForm.jsx:641-646). Katalogda 6 parça adı tekrar ediyor (ör. "DİŞLİ Z:15" iki ayrı kodla). Aynı adlı iki parça seçilirse bu eski alanda birinin adedi kayboluyor. Fiyat görüntüsü olmayan eski talepler ve "Diğer" talepleri bu alana bağlı.
- **Uzun kodlar:** 18 haneli bir kod sayı olarak işlenirse son haneleri bozuluyor (155030405028414634 → 155030405028414620). Excel de 15 haneden sonrasını tutmuyor.
- **Katalog okuyucu:** Harfle başlayan ya da tire içeren kodları sessizce atlıyor (src/lib/fiyatListesiOku.js → KOD_KALIP; kural eski tools/parca-katalogu.py:79'dan aynen taşındı). Betiğin açıklaması "570'ten fazla parça" diyor, çıktıda 538 parça var; fark raporlanmıyor [doğrulanmadı].
- **Kılavuz paketi:** Destek asistanı Codex'in sorumluluğunda; burada yalnız not düşülüyor. Belge kimliğinin sonundaki özet kısmı, paket yeniden üretilince değişebilir [doğrulanmadı]. Destek kaydı, sorunu hangi arıza akışının çözdüğünü saklamıyor.

### 3.15 Tanınmayan kodlar sessizce varsayılana düşüyor, ekran yazıları veri olarak saklanıyor

- **Sessiz varsayılanlar:**
  - tanınmayan durum "yeni" sayılıyor (veri.js:635),
  - tanınmayan tür "servis" sayılıyor (talep.js:49-51),
  - tanınmayan ülke Türkiye sayılıyor (ulkeler.js:105-112),
  - tanınmayan duyuru alt türü "kampanya" sayılıyor (duyuruTurleri.js:129-132).

  Müşteri ekranında çevirisi olmayan kodun kendisi görünüyor (i18n/index.jsx:101).
- **İşlem kaydı süzgeci:** Kodun yazdığı 'hakkedis', 'bayi', 'sevk' ve 'servisKaydi' türleri süzgeçte yok (veri.js:1874; IslemKaydi.jsx:29-57). Süzgeçteki 'siparis', 'stok' ve 'teklif' türlerini ise artık hiçbir kod yazmıyor. Servis parça siparişi 'talep' türüyle yazıldığı için (veri.js:2215) "Servis siparişi" süzgeci boş dönüyor.
- **Duyuru dili (senaryo):** Yurt dışı satış açılıyor (kimlik.js:110). Duyuruya dil bilgisi yazan kod olmadığı için (veri.js:1352-1395), yurt dışındaki müşteriye hiçbir duyuru, bir güvenlik uyarısı bile gitmiyor (duyuruHedef.js:135). Geri çağırma duyurusu ise zaten yalnız servise gidiyor (duyuruHedef.js:127).
- **İl adı (senaryo):** Servis listesi Excel'den yükleniyor ve il "KONYA" ya da sonunda boşlukla "Konya " yazılmış. İl hedefli güvenlik uyarısı ve bölge önerisi o servise ulaşmıyor (servisler.js:267, 334; duyuruHedef.js:152, 159).
- **Yurt dışı bölgeler:** İl alanında durdukları için il raporunda il gibi sayılıyorlar (Raporlar.jsx:1221).
- **Ekran yazısıyla saklananlar:** Ulaşım, iptal nedeni ve yapılan iş gibi seçimler ekrandaki Türkçe yazıyla kaydediliyor. Teklif tutarı metin olarak tutuluyor, bu yüzden raporda toplanamıyor.

### 3.16 Küçük ama bilinmesi gerekenler

- **İşlem kaydı sınırı:** 500 satırı aşan eski kayıtlar siliniyor. Hak ediş onayı ve numara değişikliği gibi para ve hesap işlemleri de bu kayıtta (veri.js:2480, kayit.js:35).
- **Android bildirim numarası:** Yaklaşık 28 saatte başa sarıyor. Uygulama kısa aralıkla yeniden açılınca da perdede duran bir bildirimi silebiliyor (bildirim.js:172-175, 197).
- **Okundu bilgisi:** Cihazda tutuluyor. Sunucu kayıtlara yeni kimlik verirse bütün bildirimler okunmamış görünür.
- **Not ve geçmiş satırları:** Kimlikleri yok. Servisim yeni notları talep kimliğinden ve milisaniye cinsinden zamandan tanıyor; aynı milisaniyede yazılan iki not tek sayılıyor (servis/haber.js:66-69).
- **Bakım rehberi işareti:** Madde sırasına bağlı; demo bu işareti yanlış biçimde yazıyor (demo.js:251, 404).
- **Fiyat listesi sürümü:** Hep 1. Talep, fiyatlandığı KDV kuralını ve para birimini saklamıyor (parcaKatalogu.js:218-232).
- **Duyuru görseli:** Backoffice tarayıcısının deposunda duruyor; müşterinin telefonunda o dosya yok (veri.js:1366-1368).
- **Destek oturumu:** Kimliği sohbet sunucusuna gönderilmiyor (destekAsistani.js:103).
- **Geri bildirim:** Müşteri kimliğini taşımıyor; cevap, telefon yazısının birebir eşleşmesine bağlı (Profile.jsx:169-175, veri.js:939-944).
- **Şifre sıfırlama kodu:** Deneme sınırı yok. Sunucu tarafı yazılmadığı için sunucu açılınca şifre sıfırlama çalışmıyor (hesap.js:256-295).
- **İç kimliğin rastgeleliği:** İç kimlik de ilk personel şifresi de tahmin edilebilir bir rastgele üreteçle üretiliyor. Güvenlik gerektiren yerlerde kullanılmamalı.

### 3.17 Belgelerde, yorumlarda ve ekran metinlerinde düzeltilecek yerler

- **Talep numarası örneği:** PRODA-CIKIS.md:122 sunucudan tireli bir numara (`SRV-260817-4821`) bekliyor; kod ve numara.js:14 tiresiz.
- **CANLIYA-CIKIS.md:**
  - 526-529: çakışma riskini "bayilerin elle kaydı" diye anlatıyor; elle kaydı bugün servis açıyor.
  - 357: bayi uygulamasından söz ediyor; servis uygulamasının kimliği `com.paksanmakina.servis`.
  - 263: servis stokundan söz ediyor; servis stoku kodda yok.
- **Eski dosya yolları:**
  - CANLIYA-CIKIS.md:227, PRODA-CIKIS.md:269 ve SUNUCU-VE-VERITABANI.md:585-586 `src/data/bayiler.js` ve `products.js` diyor; dosyalar artık src/marka/katalog/ altında.
  - CANLIYA-CIKIS.md:232-240 garanti süresinin, banka bilgilerinin ve ihracat adreslerinin yerini `src/config.js` diye gösteriyor. Gerçek yerleri: garanti süresi src/lib/serial.js:90, banka bilgileri src/marka/kimlik.js, ihracat adresleri src/marka/kimlik.js:109.
- **SUNUCU-VE-VERITABANI.md:**
  - bayi panelinden söz ediyor (30, 52-54, 436-442, 478),
  - talep tablosunda servis kimliği yok (342-346),
  - örnek satırdaki tarih tutarsız (345),
  - "68 sahte talep" diyor (576). Demo bugün yaklaşık 100 talep üretiyor: son kayıtlı sürümde 97, çalışma kopyasında 96.
- **NOTLAR.md:**
  - 377-383 ve 2959: 30 uydurma parça kodundan söz ediyor; katalog artık 538 gerçek kod içeriyor.
  - 1168-1197 ve 1461-1497: `recording_id` akışını anlatıyor; bu kod kaldırılmış.
- **MARKA-DEVIR.md:** Bayi panelinden söz ediyor (24, 118-124, 134-139, 226).
- **Koddaki örnekler ve yorumlar:**
  - LOGO cevap örneği (src/lib/logo.js:63-70),
  - duyuru hedefi örneği (src/lib/duyuruHedef.js:27): servis kimliği yerine bayi kimliği yazılmış,
  - demo yorumu (demo.js:8-11). demo.js:552-553'teki yorum "16 bileşim, 32 talep" diyor; gerçek sayılar 17 bileşim ve 34 talep (demo.js:525-529),
  - Servisler.jsx:286-288 ve veri.js:930-932 yorumları.
- **Ekran metinleri:** Coğrafi atama kaldırıldığı hâlde iki ekranda ondan söz eden uyarı duruyor: Bayiler ekranındaki "en yakın servise düşüyor" uyarısı (Bayiler.jsx:159-163) ve Servisler ekranındaki "Talepler yalnız il, ilçe ve mesafeye göre eşleşir" uyarısı (Servisler.jsx:497). İkisi de ekranda göründüğü için düzeltmeleri proje kuralı gereği Codex'ten geçmeli.

---

## 4. Önerilen kod standardı

Öneriler üç aşamaya ayrıldı. Hangisinin ne zaman yapılacağı Bölüm 6'da. Pilottan önce yalnız zorunlu olanlar istenir. Varyant tablosu, parça–model eşlemesi, ilçe kodu ve LOGO bağlantısı canlı öncesi işidir.

### 4.1 Genel ilkeler

1. **Her kaydın iki ayrı kodu olur: iç kimlik ve okunur numara.**
   - **İç kimlik:** UUID kullanılır. UUID, rastgele üretilen ve dünyada tekrarlanmayan 36 karakterlik bir değerdir. Zamana göre sıralanan türü (UUID sürüm 7) veritabanında düzenli durur. İç kimlik ekranda görünmez, hiç değişmez ve anlam taşımaz. Telefonda da üretilebildiği için bağlantı yokken de kayıt açılabilir.
   - **Bağlar:** Talep ile müşteri, makine ile servis, bildirim ile talep gibi bütün bağlar iç kimlikle kurulur. Numara, telefon ya da ad ile bağ kurulmaz.
   - **Okunur numara:** İnsan içindir. Telefonda söylenir, havaleye yazılır, LOGO belgesine referans olarak geçer. Yalnız insanların gerçekten andığı kayıtlara verilir.
   - *Neden:* Bölüm 3'teki sorunların çoğu bu iki işin tek bir alana yüklenmesinden çıkıyor.
2. **Addan kimlik türetilmez.** Ad ayrı bir alandır ve değişebilir. `konya-servis`, `sevkiyat-ekibi` gibi bugünkü kimlikler geçişte "eski kimlik" alanında saklanır, yeniden üretilmez. Ürün katalog kodları (`orkinos-1270`) birçok tabloda anahtar olarak kullanıldığı için bir kez verilmiş sabit kodlar sayılabilir: Addan yeniden türetilmez, ürünün adı değişse de değişmez.
3. **Okunur numarayı sunucu sırayla verir.**
   - Sayaç, önek ve yıl başına bir satırı olan bir tabloda tutulur. Sunucu, aynı anda gelen iki isteğe aynı sayıyı vermez. Veritabanı da aynı numaranın ikinci kez yazılmasına izin vermez. Rastgele hane kullanılmaz.
   - Yıl başında yeni satır açılır. Bunun sahibi bilgi işlemdir; yılın ilk iş gününde kontrol edilir.
   - **Bu numaralar yasal belge numarası değildir.** Geri alınan işlemde aralarında boşluk oluşabilir. Denetimde LOGO belge numarası esastır. Bu, muhasebeye baştan söylenir.
4. **Aynı kayıt iki kez açılamaz.** Telefon her gönderimde kaydın iç kimliğini de yollar. Sunucu aynı iç kimliği ikinci kez görürse yeni kayıt açmaz, ilk verdiği numarayı geri döndürür. Böylece zayıf çekimde "tekrar gönder"e basan müşteri ikinci bir talep açmış olmaz.
5. **Bağlantı yokken numara verilmez.**
   - Kayıt telefonda iç kimlikle saklanır ve "gönderilmeyi bekliyor" olarak görünür.
   - Geçici bir etiket gerekiyorsa numaraya benzemez; kaydın açıldığı saat gibi bir bilgi olur. Numaraya benzeyen her şey bir yere yazılır ve sonra kalıcı numarayla karışır.
   - Kalıcı numara gelmeden müşteriye SMS, havale açıklaması ya da LOGO'ya hiçbir şey gitmez. Servisim'deki SMS düğmesi numara gelince açılır.
6. **Pilotta kontrol hanesi kullanılmaz.** Kontrol hanesi, numaranın sonuna eklenen ve yanlış yazılmış bir rakamı yakalayan tek bir hanedir. Ekranda sıra numarasıyla aynı gruba düştüğünde yanıltıcı oluyor: 1. talep "000-010", 123. talep "001-239" gibi görünüyor ve okuyan kişi bunları "10. talep" ve "1239. talep" sanabiliyor. Talepler zaten her aramada ad ve telefonla doğrulanıyor. İleride gerekirse kontrol hanesi ayrı bir grupta gösterilir (`SRV-26-00123-9`); o durumda Damm yöntemi önerilir (Bölüm 7).
7. **Karışan harfler ve Türkçe harf kullanılmaz.**
   - Numaranın değişken kısmı yalnız rakamdan oluşur. Harf yalnız sabit öneklerde bulunur.
   - Öneklerde O ve I kullanılmaz, çünkü 0 ve 1 ile karışır.
   - Türkçe harf (Ç, Ğ, İ, Ö, Ş, Ü) kullanılmaz. GİB'in e-belge numarası da yalnız İngilizce harf ve rakam kabul ediyor. Türkçe büyük-küçük harf çevirisi de "i/İ" eşleşmesini bozuyor; bugün giriş adında yaşanan sorun bu.
   - Kullanıcı numarayı yazarken büyük-küçük harf, boşluk, tire ve nokta dikkate alınmaz.
   - Numara kayıtta tiresiz ve büyük harfle saklanır, ekranda gruplanarak gösterilir.
8. **Numara telefonda okunabilir olur.** Ekranda önek, yıl ve sıra ayrı gruplarda gösterilir (`SRV-26-00123`). Uzunluk sabittir. İki haneli yıl, numarayı GİB'in 16 karakterlik fatura numarasından (3 karakter + 4 haneli yıl + 9 hane) da ayırır.
9. **Sayı gibi görünen kodlar metin olarak saklanır.** Parça kodu, seri numarası, telefon, TC, vergi numarası ve IBAN bu gruptadır. Böylece baştaki sıfırlar ve 15 haneden uzun kodlar bozulmaz. Excel alışverişinde de kod sütunları metin biçiminde tutulur (CSV, UTF-8, hazır şablon).
10. **Kod listeleri sabittir ve İngilizce harfle yazılır.** Ekranda görünen ad sözlükten gelir. Tanınmayan kod sessizce varsayılana düşmez; "bilinmeyen" olarak görünür ve hata kaydına yazılır. Ekran yazısı veri olarak saklanmaz.
11. **Para LOGO'da kalır.** Uygulama cari hesap ve bakiye tutmaz; belgeyi, belgenin durumunu ve LOGO belge numarasını tutar. Muhasebenin geçerli saydığı tek cari ekstre LOGO'dadır.

### 4.2 İşlem numaraları

Ortak kalıp: **önek + yıl (2 hane) + sıra (5 hane)**. Kayıtta 10 karakterlik bitişik bir değer olur (`SRV2600123`), ekranda `SRV-26-00123` diye gösterilir. Sıra her yıl ve her önek için 1'den başlar; her önek için yılda 99.999 numara verilebilir. Eski talep numarası 13 karakter olduğu için yeni biçimle karışmaz.

| Kod türü | Biçim | Örnek (öneri) | Kim üretir | Neden |
|---|---|---|---|---|
| Servis talebi | `SRV` + kalıp | `SRV-26-00123` | Sunucu, talep kaydedilince | Müşterinin açtığı talep ile servisin elle açtığı kayıt aynı iştir. Elle kayıt ayrı bir önek almaz; kayıtta "kaynak" bilgisi tutulur |
| Yedek parça talebi (müşteri) | `YPR` + kalıp | `YPR-26-00058` | Sunucu, talep gönderilince | Ödeme bilgisi PAKSAN tutarı doğruladıktan sonra verilir (4.2.1) |
| Fiyat teklifi talebi | `TKF` + kalıp; her teklif talebin altında sıra numaralı ayrı bir kayıt olur | `TKF-26-00011` · 2. teklif | Sunucu | Yeni teklif eskisinin üstüne yazılmaz. LOGO alanı açılmaz, çünkü satış bayinin muhasebesinde. İzlenen şey bayinin bildirdiği sonuç ve satış olduysa makinenin seri numarasıdır |
| Servis parça siparişi | `SPS` + kalıp | `SPS-26-00017` | Sunucu | Numarasına bakınca müşteri parça talebinden ayrılır |
| Ziyaret | Talebin içinde sıra numarası (1, 2, 3) | `SRV-26-00123` · 2. ziyaret | Sunucu | "Sorun devam ediyor" sonrası yapılan ziyaret ilkinden ayrılır |
| Hak ediş | Talep numarası + ziyaret sırası; ayrı önek yok | `SRV-26-00123` · 1. ziyaret | Sunucu, servis kaydı gönderilince | Her talep ve ziyaret için en fazla bir hak ediş olur. İkinci ve sonraki ziyaretlerin hak edişi "tekrar ziyaret, onay bekliyor" durumunda ve 0 tutarla açılır; tutarı servis masası onaylarken girer |
| Hak ediş dönem dökümü | `HAK` + kalıp; servis ve ay başına bir tane | `HAK-26-00045` | Sunucu, ay kapanınca | Servis ay sonunda tek fatura keser. LOGO'daki fatura ya da gider pusulası bu dökümle eşlenir: bir fatura, birçok hak ediş. Döküm muhasebeye Excel olarak da verilebilir |
| Ödeme durumu | Numara yok. Hak ediş dökümünde: onaylandı → faturası geldi (LOGO belge no) → ödendi (LOGO banka fişi no) | — | Pilotta muhasebe backoffice'te işaretler | Ödemeyi tek kişi girer. Uygulamada hesaplanmış bakiye gösterilmez |
| Telefon numarası değişikliği talebi | `TEL` + kalıp | `TEL-26-00008` | Sunucu | KVKK ve denetim yazışmalarında atıf yapılabilir |
| Geri bildirim | `GBD` + kalıp | `GBD-26-00032` | Sunucu | Bütün işlem numaraları tek kurala uyar |
| Şifre yardım talebi, destek oturumu, not, geçmiş satırı, işlem kaydı, bildirim, ek dosyası | Yalnız iç kimlik | — | Telefon ya da sunucu | Kimse bunları telefonda söylemiyor; her yeni okunur numara, bakımı gereken bir sayaç daha demek |

**Hak edişin tutarı** tek sayı olarak tutulmaz. KDV hariç tutar, KDV oranı ve varsa tevkifat ile stopaj ayrı alanlarda saklanır. Oranları muhasebe belirler.

#### 4.2.1 Yedek parça ödeme akışı

1. Müşteri talebi gönderir, sunucu `YPR` numarası verir.
2. PAKSAN stoğu, KDV dahil son tutarı ve kargoyu doğrular.
3. Müşteriye ödeme bilgisi ve referans gösterilir. Referans yalnız harf ve rakamdan oluşur (`YPR2600058`), noktalama ve Türkçe harf içermez.
4. Müşteri dekontu yükler.
5. PAKSAN LOGO faturasını keser ve parçayı sevk eder.

Muhasebe ödemeyi referansla değil; tutar, gönderen adı ve dekontla eşler. Referans yalnız yardımcı olur. "Ödeme bekliyor" durumundaki talepler, muhasebenin belirleyeceği süre sonunda kendiliğinden iptal olur. Bağlantı yoksa bugünkü "bizi arayın" kartı gösterilir.

### 4.3 Taraflar

| Kod türü | Biçim | Örnek (öneri) | Kim üretir | Neden |
|---|---|---|---|---|
| Her kaydın iç kimliği | UUID (sürüm 7) | — | Telefon ya da sunucu | Değişmez, anlam taşımaz; bağlantı yokken de üretilebilir |
| Müşteri numarası | Yok. Arama telefon ve adla yapılır. Müşteriye LOGO'da cari açılırsa LOGO cari kodu kayda yazılır | — | — | Müşteri bu numarayı görmüyor; çiftçi PAKSAN'ı arayınca adını ve telefonunu söylüyor |
| Müşteri telefonu | Uluslararası yazım: ülke kodu dahil, boşluksuz (E.164); ekranda boşluklu | `+905321234567` | Uygulama, tek bir kuralla | Telefon hesabın bir bilgisidir, kimliği değil. Aynı telefon iki hesapta olamaz. Değişiklik geçmişi ayrı tutulur |
| Müşteri hesabı kapsamı | Bir hesapta birden çok makine ve birden çok yetkili kişi (ad) tutulabilir | — | Backoffice, yetkiyle | Kırsalda telefonu aile paylaşır. Personelin elinde "hesaba makine ekle" ve "hesapları birleştir" işlemleri olur; telefonu açan personel için tek cümlelik bir yönerge yazılır |
| Bayi | Ekranda ad + LOGO cari kodu; ayrı kod serisi yok | `Konya Merkez · 120.01.042` (biçim [doğrulanmadı]) | LOGO'da cari açılır, uygulamaya aktarılır | Muhasebe ve satış bayiyi LOGO cari koduyla tanır. Carisi henüz açılmamış kayıt "LOGO kodu bekliyor" durumunda kalır ve pilotta kullanıma açılmaz |
| Servis firması | Ekranda ad + LOGO cari kodu; ayrı kod serisi yok | — | Aynı | SRV öneki yalnız servis talebinde kalır. Önerilen: tek cari kart (alıcı + satıcı). Muhasebe aksini söylerse ikinci alan eklenir |
| Personel | Numara yok; giriş adı ve ad | — | — | Ayrı bir seriyi kimse kullanmıyor |
| Giriş adı (personel ve servis) | Yalnız a-z, 0-9 ve nokta; Türkçe harfler girişte İngilizce karşılığına çevrilir; bütün kullanıcılar arasında benzersiz | `serhat.tecimen` | Personel yazar, sunucu denetler | Klavyenin büyük harfi ve Türkçe "I/ı" girişi bozmaz. Ad düzeltilince giriş adı kendiliğinden değişmez |
| Rol | İç kimlik; hazır roller için sabit kod; ad ayrı alan | `servis-masasi` | Sunucu | "servis" kelimesi dış servis firmasıyla karışmaz. Dış servisin işlemleri rolle değil, "kaynak: Servisim" bilgisi ve servis kimliğiyle yazılır |
| Yetki kimlikleri | Bugünkü kodlar (`talepler`, `rolYonetimi` …) kalır; sunucuda tablo olarak tutulur | — | Sunucu | Bir yetkinin adı değişirse eski ve yeni ad eşleştirilir; sessiz silme olmaz |

İz kayıtlarında kişinin kimliği ve o anki adının bir kopyası birlikte tutulur. Ayrı kod serisi, ancak markalar ayrı LOGO firmasına geçerse (Bölüm 7) yeniden düşünülür.

### 4.4 Ürün, makine, parça

| Kod türü | Biçim | Örnek | Kim üretir | Neden |
|---|---|---|---|---|
| Marka | Küçük harfli, İngilizce harfli kısa kod | `paksan` | Sabit liste | Çok marka planıyla uyumlu (4.8) |
| Ürün / model | Bugünkü katalog kodu sabit kalır; marka ile birlikte benzersiz | `paksan` + `orkinos-1270` | Katalog | Kod birçok tabloda anahtar olarak kullanılıyor |
| Makinenin LOGO malzeme kodu | Pilotta LOGO faturasındaki malzeme kodu makine kaydına olduğu gibi yazılır | — | PAKSAN personeli, Excel dökümünden | Varyant tablosu, LOGO malzeme listesi görüldükten sonra tasarlanır; birçok üretici her varyanta ayrı malzeme kartı açar |
| Makine | İç kimlik; marka ve seri numarası iki ayrı alanda; bu ikili veritabanında benzersiz | `PAKSAN · ORK1270-2024-00157` (seri bugünkü varsayılan biçimde) | Seri PAKSAN'ın plakasından gelir; uygulama yalnız sadeleştirir | Aynı makinenin tek kaydı olur. Sahiplik ve servis ataması ayrı geçmiş tablolarında tutulur. Zincir yalnız geçerli atamayı okur; servis kendi kaydıyla atama yapamaz |
| Garanti tarihleri | İki ayrı tarih: (a) PAKSAN'ın bayiye kestiği faturanın tarihi (LOGO'dan gelir, en erken sınırdır); (b) çiftçiye satış ya da teslim tarihi ve belgesinin fotoğrafı | — | (a) LOGO dökümü; (b) bayi ya da müşteri yükler, PAKSAN onaylar | Garanti (b)'den hesaplanır. (b) yoksa (a) artı satış biriminin belirleyeceği bir süre kullanılır ve ekranda "doğrulanmadı" görünür. Tüketiciye satışta garantinin teslimden başlaması hukukçuyla doğrulanmalı |
| Seri numarasını sadeleştirme | Büyük harf, yalnız A-Z ve 0-9; harfler asla silinmez; her yerde aynı kural | `ORK1270202400157` | Uygulama ve sunucu | Bugün birkaç yerde farklı kurallar var: logo.js:81, veri.js:1529-1531, serial.js, servisAtama.js:43-45 (yalnız boşluk silme) ve Talepler.jsx:1829-1832 (yıl okuma). Harf silinince modeller karışıyor. Gerçek biçim gelene kadar biçim denetimi yalnız uyarı verir |
| Yedek parça | Kod metin olarak saklanır; revizyon eki (`.01`) kodun parçasıdır; marka ve kod iki ayrı alanda; görsel `marka/kod.webp` | `20131010102.01` | PAKSAN fiyat listesi / LOGO | Kod müşteriye de gösteriliyor, bu yüzden biçimi değiştirilmez. Sayıya çevrilen uzun kod bozulur. ":" işareti Windows dosya adında geçersiz |
| Parça kullanım durumu ve fiyat | Pilotta PDF kataloğu kalır. Hedef: kullanım durumu ve fiyat LOGO'dan okunur | — | Canlıda LOGO | İki ayrı kaynak olmaz. Uygulama yalnız okuduğu listenin kimliğini ve talepte kullanılan fiyatı saklar |
| Parça grubu | Bir kez verilen sabit kod; PDF başlığı yalnız ad olarak tutulur | `ip-gerdirme-sistemi` (bugünkü kod korunur) | Katalog | Başlık düzeltilince bağ kopmaz |
| Parça–model eşlemesi | Ayrı tablo: hangi parça hangi model ya da varyantta kullanılıyor (canlı öncesi) | — | PAKSAN (sahibi Bölüm 7'de) | Orkinos sahibi küçük balya parçasını görmez |
| Fiyat listesi | Yürürlük ayı + sıra | `2026-07-1` | Katalog betiği | Talepte liste kimliği, para birimi, KDV oranı ve "liste KDV hariç mi" bilgisi saklanır |
| Katalog dışı parça | Kod boş + "katalog dışı" işareti + açıklama | — | Uygulama | "Diğer" yazısı veri olmaz |

### 4.5 Kod listeleri

| Kod türü | Biçim | Örnek | Neden |
|---|---|---|---|
| Talep türü, durum, masa, sahip, kapı, yapılan iş, ulaşım, iptal nedeni, işlem kaydı türü, duyuru türü | İngilizce harfli sabit kod; sunucuda tablo; eski değerler için eşleme tablosu | `parcaBekliyor` | Veritabanında ve LOGO'ya aktarımda sabit liste gerekiyor |
| İl | Plaka kodu | `42` | Yazım farkı eşleşmeyi bozmaz |
| İlçe (canlı öncesi) | Resmî ilçe kodu. Hangi kod listesinin kullanılacağı ve LOGO cari kartında hangi kodun tutulduğu [doğrulanmadı] | — | Aynı |
| Yurt dışı bölge | İl alanından ayrı bir alan | — | İl raporuna karışmaz |
| Ülke | Uluslararası iki harfli kod (ISO 3166-1) | `TR` | `XK` (Kosova) resmî bir kod değil, not düşülür. Tanınmayan kod Türkiye sayılmaz |
| Konum ülkesi / telefon ülkesi | İki ayrı, adıyla belli alan | — | Bugün adlar karışıyor |
| Para birimi | Uygulamada uluslararası üç harfli kod (ISO 4217) | `TRY` (ekranda "TL") | Her tutar birimiyle saklanır. LOGO döviz türünü kendi sayısal numarasıyla tutuyor [doğrulanmadı]; bu eşleme yalnız LOGO entegrasyonunda, LOGO'nun döviz listesinden doldurularak durur |
| Tarih-saat | Sunucu evrensel saatle saklar; numaradaki yıl Türkiye saatine göre belirlenir | — | Cihaz saati numarayı etkilemez |

### 4.6 Güvenlik ve dosya kodları

- **Şifre:**
  - Sunucuda kasıtlı olarak yavaş hesaplanan bir yöntemle (bcrypt ya da argon2) saklanır. Bu yöntem, çalınan kayıttan şifre bulmayı zorlaştırır.
  - Bugünkü özetler taşınmaz; pilot kullanıcıları ilk girişte şifrelerini belirler.
  - Pilot backoffice yalnız HTTPS ile açılır.
- **Şifre değiştirme bağlantısı:** Yalnız e-postayla gider, sunucuda özetiyle saklanır ve bir kez kullanılır. Giriş ekranında ne bağlantı ne e-posta adresi gösterilir.
- **SMS doğrulama kodu ve ilk şifreler:** Sunucuda güvenli rastgele üreteçle üretilir. Excel'den personel içe aktarımı da bu üreteci kullanır. SMS koduna deneme sınırı konur.
- **Ek dosyası:**
  - Kimliği UUID olur. Dosyanın parmak izi (içerik özeti) saklanır. Böylece aynı dosyanın iki kez yüklendiği ve dekontun sonradan değiştirilmediği görülür.
  - Dekont silinmez, "geçersiz" olarak işaretlenir.
- **İşlem kaydı:** UUID ile tutulur. Kayda tür kodu, kişi kimliği (personel, servis ya da müşteri), kaynak uygulama (Connect, backoffice, Servisim), uygulama sürümü ve ilgili kaydın türü ile kimliği yazılır. Satır sınırı yoktur ve kayıt silinemez (canlı öncesi).
- **Bildirim:** Talebe talep kimliğiyle bağlanır. Okundu bilgisi sunucuda, kullanıcı ve bildirim çifti olarak tutulur. Android bildirim numarası saklanan, artan bir sayaçtan gelir.
- **Kişisel veri:** TC, vergi numarası ve IBAN veritabanında şifreli saklanır ve yalnız yetkili rol görür. LOGO test kopyasına gerçek veri alınıyorsa maskelenir. LOGO aktarımı aydınlatma metnine eklenir [hukukçu doğrulamalı].

### 4.7 LOGO eşleşmesi

**İlke:** LOGO'nun kodları bizim kaydımızda kendi alanlarında durur. Bizim numaramız LOGO'nun anahtar alanlarına yazılmaz. Kayıtlar arasındaki asıl bağ bizim veritabanımızda kurulur.

**LOGO'nun yapısı hesaba katılır.** LOGO Tiger'da fatura, irsaliye ve sipariş tabloları firmaya ve döneme göre ayrılır (`LG_firma_dönem_…`). LOGO iç kayıt numarası (LOGICALREF) yalnız o dönemin tablosu içinde tektir. Bu yüzden:

- Her belge bağı dört bilgiyle saklanır: LOGO firma no, dönem no, LOGICALREF ve belge no.
- Cari ve malzeme kartları için kodun yanında kartın LOGICALREF'i de tutulur. Muhasebe kodu değiştirse de bağ kopmaz.

| Bizdeki kayıt | Saklanacak LOGO bilgisi | Not |
|---|---|---|
| Bayi | Firma no + cari kodu + kart LOGICALREF | Cari kodu 16 karakter (LOGO kılavuzu, 2008 ve 2012) |
| Servis firması | Firma no + cari kodu + kart LOGICALREF | Önerilen tek kart (alıcı + satıcı) [doğrulanmadı] |
| Müşteri (fatura kesilen) | Cari kodu; TC ve vergi numarası ayrı alanlarda | Müşteriye cari açılıp açılmayacağı karar sorusu |
| Makine | Malzeme kodu (faturadaki); seri numarası; LOGO'da seri takibi açıksa oradaki seri kaydıyla eşleşir | Malzeme kodu büyük olasılıkla en çok 24 karakter [doğrulanmadı]. PAKSAN'ın seri takibini kullanıp kullanmadığı [doğrulanmadı] |
| Yedek parça | Malzeme kodu (doğrulanırsa parça kodunun kendisi) | En uzun kodumuz 18 hane, sığıyor |
| PAKSAN'ın bayiye sattığı makine | Fatura belge bağı (dört bilgi), ETTN (e-belgenin benzersiz kimliği), fatura tarihi | Garantinin en erken sınırı; başlangıcı değil (4.4) |
| Yedek parça talebi | Satış faturası, ETTN, irsaliye, tahsilat ya da banka fişi | — |
| Hak ediş dönem dökümü | Servis faturası ya da gider pusulası, ödeme fişi | Bir fatura, birçok hak ediş |
| Servis parça siparişi | LOGO sipariş fişi, irsaliye ve fatura | — |
| Fiyat teklifi | LOGO bilgisi yok | Satış bayinin muhasebesinde |

**Bizim numaramız LOGO belgesinde nereye yazılır:**

- **Fatura ya da irsaliye numarası alanına yazılmaz.** e-Fatura, e-Arşiv ve e-İrsaliyede bu alan GİB kuralına uyan 16 karakterlik numara olmak zorunda (VUK 509 sayılı Genel Tebliğ, bölüm V.4): 3 karakterlik birim kodu, 4 haneli yıl ve 9 haneli sıra. Sıra her yıl 1'den başlar. Aktarımda bu alana "~" yazılırsa LOGO numarayı kendi şablonundan veriyor (forum kaynağı).
- **Aday alanlar, öncelik sırasıyla:**
  1. Muhasebe bu alanı başka bir iş için kullanmıyorsa, **Belge No** (DOCODE). Bu alan dış referans için kullanılır. Uzunluğu için eski bir kaynak 9 karakter, sahadan bir görüş 32 karakter diyor [doğrulanmadı].
  2. **Doküman izleme numarası** (20 karakter).
  3. **Açıklama satırı** (50 karakter). Yalnız insan okusun diye ek kopya olarak kullanılır; kullanıcı üstüne yazabilir, arama ve tekillik denetimi yoktur. e-faturada müşteriye not olarak da görünür.
- **Özel kod alanı** (10 karakter) gruplama için kullanılır. Talep numarası buraya yazılmaz; en fazla tür (`SRV`, `YPR`, `SPS`, `HAK`) yazılabilir. Bunun için muhasebenin bugünkü özel kod düzeniyle çakışmaması gerekir [doğrulanmadı].
- **Uzunlukların kesinleşmesi:** Uzunluklar 2008-2016 tarihli LOGO kılavuzlarından ve topluluk belgelerinden alındı; Tiger 3'te değişmiş olabilir. PAKSAN bilgi işlemi gerçek veritabanında kolon uzunluklarını sorgulamalı (`INFORMATION_SCHEMA.COLUMNS`; cari, malzeme, fatura ve irsaliye tabloları için).

**Pilotta LOGO bağlantısı kurulmaz.** Muhasebe, LOGO'dan cari listesini, malzeme listesini ve pilot makinelerin satış faturalarını Excel'e alır. Kod sütunları metin biçiminde olur. Backoffice bu dökümleri içe aktarır ve eşlemeyi PAKSAN personeli yapar.

**Canlı öncesi LOGO bağlantısı:**

- Okuma işini PAKSAN'ın LOGO iş ortağı yazar: Bütün dönemleri birleştiren, salt okunur bir görünüm (view) hazırlanır. Uygulama LOGO tablolarına değil, yalnız bu görünüme bakar. Böylece 2024'te satılmış bir makinenin seri sorgusu eski dönem tablolarında da sonuç bulur.
- Yazma işi Logo Objects ya da Tiger REST servisiyle yapılır. Doğrudan SQL ile fatura yazılmaz: LOGO kendi kaydettiği faturaya bir güvenlik değeri koyuyor ve SQL ile yazılan kayıt "program dışı giriş" sayılıyor. Bu servisler ek lisans ve iş ortağı işçiliği gerektirir; maliyeti ve takvimi Bölüm 7'de.
- Seri sorgusu taslağı (logo.js) şöyle değişir:
  - Cevapta bizim bayi ve model adlarımız yerine LOGO cari kodu ve malzeme kodu gelir; eşlemeyi bizim sunucu yapar.
  - Cevaba fatura belge bağı ve ETTN eklenir.
  - Seri numarası harfleriyle sorgulanır ve sorgu marka bilgisini taşır.
  - Bir seri için birden çok belge dönerse ilk satış faturası esas alınır; iade ve bayiler arası sevk ayrı tutulur.
- Ay sonunda uygulama ile LOGO karşılaştırılır: onaylanan hak ediş toplamı ile LOGO'ya işlenen servis faturaları, ödenmiş parça talepleri ile LOGO satış faturaları. Bu mutabakat raporunun sahibi muhasebedir.

### 4.8 Çok marka planıyla uyum

Plan dosyası: ~/.claude/plans/serene-tickling-possum.md. Plan henüz uygulanmadı.

- **Marka kodu:** Küçük harfli, İngilizce harfli (`paksan`). İşletmeci şirketi anlatan `sahip: 'paksan'`, depo öneki `paksan.` ve ürün markası ayrı kavramlardır; veritabanında farklı adlı sütunlarda tutulur.
- **Makine:** Plan "marka + seri" diyor. Veritabanında bunlar iki ayrı sütun olur ve ikili birlikte benzersizdir. `paksan:ORK…` gibi birleşik yazım gerekiyorsa yalnız uygulamanın içinde kullanılır.
- **Parça:** Plan `marka:kod` diyor. Veritabanında bu da iki sütun olur. Görsel dosya adında ":" kullanılmaz; klasörler zaten markaya göre ayrılıyor (plan:89).
- **Ürün:** Plan yalnız yeni markaların ürün kodlarına önek koyuyor, PAKSAN'ınkiler öneksiz kalıyor. Benzersizlik marka ve ürün kodu ikilisiyle kurulursa bu tutarsızlık sorun olmaktan çıkar.
- **Talep ve sipariş numarası:** Marka öneki taşımaz. Tek bir numara serisi olur, marka kayıtta ayrı alanda durur. *Neden:* Müşteri tek uygulama kullanıyor ve önek sayısı markalarla katlanmamalı. LOGO'da markalar ayrı firma olursa ve muhasebe ayrı seri isterse bu karar yeniden açılır (Bölüm 7).
- **Servis ve bayi:** Çalıştıkları markaların listesi tutulur. LOGO cari kodu, marka ya da LOGO firması başına ayrı olabilir. Bu yüzden LOGO bilgisi bir liste olarak tutulur (firma no + cari kodu + LOGICALREF).
- **Veritabanı şeması:** Baştan marka sütunuyla kurulur; bugünkü değeri `paksan` olur. SUNUCU-VE-VERITABANI.md:342-346'daki taslakta bu sütun yok.

---

## 5. Test/pilot ortamı ile canlı ortam ayrımı

### 5.1 Önerilen ortamlar

| Ortam | Kim kullanır | Veri | Nasıl ayrılır | LOGO |
|---|---|---|---|---|
| Geliştirme ve demo | Geliştirme, satış sunumu | Yalnız sahte veri (src/backoffice/demo.js) | Ayrı uygulama kimliği, ayrı depo | Yok ya da taklit |
| Test (prova) | PAKSAN bilgi işlemi, pilot öncesi prova | Sahte ama gerçek biçimli veri | Ayrı sunucu; ekranda "TEST" etiketi | LOGO'nun test firması (SUNUCU-VE-VERITABANI.md:564) |
| Canlı (pilot bu ortamın ilk dönemi) | Önce pilot bayi ve servisler, sonra herkes | Yalnız gerçek kayıt | — | Pilotta Excel dökümü; canlı öncesi gerçek LOGO |

Test ortamı numarayla değil bağlantıyla ayrılır. Test sunucusu yalnız LOGO test firmasına erişebilir (başka firma numarası, başka kullanıcı). Numara canlıdakiyle aynı uzunlukta kalır, böylece test ortamında alan uzunlukları da sınanmış olur.

CANLIYA-CIKIS.md:180-213 test ve canlı ortam tablosunu ve `test.` önekli adresleri zaten öngörüyor. Bu öneri onunla uyumlu.

**Sunucunun yeri:** İnternete açık uygulama sunucusu, LOGO sunucusuyla aynı makinede durmamalı. LOGO'ya yalnız entegrasyon servisi erişmeli. LOGO ile birlikte gelen SQL Server çoğu zaman yalnız LOGO'da kullanılabilen bir lisansla gelir; uygulama veritabanını aynı sunucuda açmak bu lisansa aykırı olabilir [doğrulanmadı].

### 5.2 Pilot, canlı sistemin ilk dönemi olsun

**Gerekçe:** Pilot servisin hak edişi, makine atamaları ve garanti kayıtları gerçek paraya ve gerçek makineye bağlı. Pilot verisi atılırsa bunlar kaybolur. Başka bir yere taşınırsa her kimlik ve numaranın tek tek eşlenmesi gerekir.

SUNUCU-VE-VERITABANI.md:571-596'daki "hiçbir şey taşınmayacak" kararı demo verisi için doğru, ama pilot verisi için bu kararın yeniden verilmesi gerekiyor.

**Pilot ayrı bir veritabanında yapılırsa:**

- Pilot numaraları canlıya olduğu gibi taşınır.
- Canlının sayacı pilotun son numarasından devam eder.
- İç kimlikler (UUID) değişmez. Bu yüzden iç kimlik kararı pilottan önce verilmeli.

### 5.3 Demo verisi

- **Pilot ve canlı sunucusuna hiç girmez.** Backoffice'teki "Demo verisini yükle" kutusu (Personel.jsx:163, 190-238) canlı derlemede bulunmaz.
- **Demo APK ayrı bir uygulama kimliğiyle derlenir.** Android'deki kimlik eki (applicationIdSuffix), aynı uygulamanın telefona ayrı bir uygulama olarak kurulmasını sağlar; örneğin `com.paksanmakina.app.demo`. Böylece demo telefonundaki veri gerçek sürüme taşınmaz.
- **Ortam derleme sırasında seçilir.** Bugün ayarlar koda sabit yazılı (config.js:78-81, 146-164).
- **`npm run dogrula -- --yayin` bugün servis paketindeki `data-demo` işaretini yakalıyor.** Bunlara ek olarak şunları da saymalı:
  - demo kutusu,
  - ilk yönetici şifresi,
  - kapalı sunucu, giriş ve LOGO ayarları,
  - ekrana basılan demo SMS kodu (hesap.js:284),
  - sahte örnek seriler (serial.js:113),
  - derlemeye giren demo kurulum dosyası ve sabit servis demo kullanıcı adı ile şifresi (demoKimlik.js:10).
- **Pilot telefonları:** Daha önce demo APK kurulmuşsa uygulama kaldırılıp yeniden kurulur. Bugün uygulama kimliği aynı olduğu için güncelleme eski veriyi silmiyor.
- **Demo kimlik numaraları:** Demo kayıtlarında TC ve vergi alanı boş kalır. Geçersiz değer üretmek çözüm değil, çünkü uygulamanın kendi denetimine takılır ve sunumda "Kaydet" çalışmaz. Demoyu gerçek veriden ayıran şey ortam ayrımıdır.

### 5.4 Numara aralıkları

- Canlı numara serisi pilotla başlar. Pilotun ilk servis talebi `SRV-26-00001` olur.
- Test ortamındaki numaralar canlıdakiyle aynı biçimdedir. Test numarasının canlı LOGO'ya ulaşmasını önek değil, test sunucusunun canlı LOGO'ya hiç erişememesi engeller.
- Pilot kayıtlarına ayrı bir işaret konmaz. Pilot dönemi, tarih aralığı ve bayi ya da servis kaydındaki "pilot katılımcısı" işareti üzerinden raporlanır.

### 5.5 Pilot bayi ve servisler şimdiden gerçek kodla açılır

- **Temsilî listeden seçilmez.** Koddaki listelerin kendi başlığında "bu liste gerçek değil" yazıyor (bayiler.js:4-8, servisler.js:4-8). Pilot bayi ve servisler sıfırdan, PAKSAN'ın verdiği gerçek bilgilerle açılır:
  - unvan,
  - LOGO firma numarası, cari kodu ve kart LOGICALREF'i (Excel dökümünden),
  - vergi numarası ya da TC,
  - IBAN,
  - il plaka kodu,
  - servisin çalıştığı bayiler,
  - markalar.
- **Açılış sırası:** Önce LOGO'da cari açılır, sonra uygulamada kayıt açılır. Uygulamada kaydı yetkili personel açar, muhasebe LOGO kodunu onaylar.
- **Kimlikler:** `konya-servis` gibi addan türetilmiş kimlikler canlıda kullanılmaz; iç kimlik UUID olur.
- **Makineler:** Pilot müşterilerinin makineleri plakadaki gerçek seri numarasıyla kaydedilir. PAKSAN, pilot başlamadan bu makinelerin servis atamasını Kayıtlı Makineler ekranından yapar.
- **Personel:** Hesaplar gerçek e-postayla açılır; ilk yönetici şifresi pilottan önce değiştirilir.
- **Taşınmayacaklar:** Bugün telefonlarda duran demo hesapları, sayaçlar ve cihazın ürettiği numaralar.

---

## 6. Geçiş planı

İş üç katmana ayrıldı. Pilottan önce yalnız birinci katman zorunlu.

### 6.1 Pilot öncesi (zorunlu)

1. **Kararlar.** Bölüm 7'deki "pilot öncesi" soruları cevaplanır. Pilot kapsamı rakamla yazılır: kaç bayi, kaç servis, kaç makine, hangi iller, hangi akışlar (havaleyle parça satışı, gerçek parayla hak ediş), süre ve başarı ölçütü.
2. **PAKSAN'dan bilgi toplanır:**
   - gerçek seri numarası biçimi (birkaç plaka fotoğrafı yeterli),
   - pilot bayi ve servislerin LOGO cari listesi (Excel, kod sütunları metin),
   - pilot makinelerinin PAKSAN satış faturaları ve malzeme kodları (Excel),
   - fiyat listesindeki beş parça kodunun LOGO'da aranması (aynı kod mu?),
   - LOGO kolon uzunlukları sorgusu,
   - IBAN'lar,
   - muhasebenin Belge No, özel kod ve açıklama satırını bugün nasıl kullandığı.
3. **Kimliği bozan hatalar düzeltilir.** Bu adım numara standardından bağımsızdır ve hemen yapılabilir:
   - süzgeç açıkken kaydetme (Servisler.jsx, Bayiler.jsx),
   - personel düzenlemesinin şifreyi silmesi ve giriş adını değiştirmesi (Personel.jsx:136, 280-288; veri.js:411),
   - backoffice'teki şifre bağlantısı ve e-posta gösterimi (Backoffice.jsx:614-645),
   - yeni makine satırının atamayı gölgelemesi ve seri eşleşmesinin yalnız boşluk silmesi (servisAtama.js:43-45, makineKaydi.js:133),
   - servisin elle kayıtla kendini makineye ataması (ElleKayit.jsx:230-236),
   - yeniden kapatmada ikinci borç (veri.js:1050-1100),
   - servis giriş adının benzersizliği ve klavyenin büyük harfi (Servisler.jsx:341-345, ServisPanel.jsx:316-323),
   - seri numarasında harf silme (logo.js:81, veri.js:1529-1531),
   - sahte örnek seriler (AddMachine.jsx:215-238).
4. **Sunucu ve veritabanı kurulur.** Her tabloda iç kimlik, gerekiyorsa okunur numara, LOGO alanları, marka sütunu ve "eski kimlik / eski numara" alanları bulunur. Kod tabloları hazırlanır. Veritabanı şu kuralları zorlar:
   - her okunur numara bir kez,
   - marka ve seri ikilisi bir kez,
   - giriş adı bir kez,
   - telefondan gelen iç kimlik bir kez,
   - her talep ve ziyaret için bir hak ediş,
   - aynı telefon bir hesapta.
5. **Uygulamalar sunucuya bağlanır.**
   - Numara üreten her yer sunucudan numara alır: müşteri talebi (AppState.jsx:307), yedek parça talebi (RequestForm.jsx:484), elle kayıt (ElleKayit.jsx:184), servis siparişi (veri.js:2126) ve geri bildirim.
   - Servis ataması, servis listesi ve makine kayıtları sunucudan okunur.
   - Telefon her gönderimde iç kimliği yollar, böylece aynı kayıt iki kez açılmaz.
   - Taleplere müşteri kimliği yazılır; bildirim talebe talep kimliğiyle bağlanır.
   - Telefon numarası tek bir kurala göre saklanır.
   - İz kayıtlarına kişinin kimliği yazılır.
   - Ekler sunucuya yüklenir.
   - Servis kaydı, hak ediş, servis siparişi, elle kayıt, işlem kaydı, numara değişikliği ve şifre talepleri sunucuya gönderilir.
6. **Ortamlar ayrılır** (Bölüm 5.3).
7. **Belgeler ve ekran metinleri düzeltilir** (Bölüm 3.17).
8. **Test ortamında uçtan uca prova yapılır.** Ana akış:
   1. müşteri kayıt olur ve makinesini ekler,
   2. PAKSAN servisi atar ve atama müşterinin telefonunda görünür,
   3. müşteri talep açar,
   4. servis işi kapatır,
   5. hak ediş onaylanır ve ay sonu dökümüne düşer,
   6. muhasebe dökümü "ödendi" olarak işaretler ve fiş numarasını yazar.

   Ayrıca şunlar denenir: zayıf bağlantıda tekrar gönderme, iki telefonun aynı anda kayıt açması, telefon numarası değişikliği ve bağlantı yokken elle kayıt.
9. **Aksaklık planı yazılır.** Sunucu çalışmazsa servis kâğıt servis formu kullanır, müşteri telefonla talep bildirir. Bu kayıtları sonradan sisteme kimin, kaç gün içinde gireceği belirlenir.
10. **Pilot kayıtları açılır** (Bölüm 5.5).

**Not:** Bu adımlarda ekrana çıkacak her yeni Türkçe metin proje kuralı gereği Codex'ten geçer. "Gönderilmeyi bekliyor" durum yazısı, "LOGO kodu bekliyor" uyarısı ve Bayiler ile Servisler ekranlarındaki uyarıların düzeltmesi bu gruba girer. Bu belgede geçen ekran ifadeleri yalnız anlatım için yazıldı.

### 6.2 Pilot sırasında (elle yürüyecekler)

- Numara biçimi ve önekler değiştirilmez.
- **LOGO:** Bağlantı kurulmaz. Cari, malzeme ve fatura bilgileri Excel dökümüyle aktarılır.
- **Hak ediş:** Ödeme LOGO'da, muhasebenin olağan süreciyle yapılır. Uygulama yalnız döküm durumunu ve LOGO fiş numarasını tutar.
- **Yedek parça:** Havaleden önce PAKSAN stoğu ve tutarı doğrular (4.2.1).
- **Haftalık kontrol sorguları:**
  - aynı marka ve seriyle iki makine var mı,
  - aynı telefon iki hesapta mı,
  - LOGO kodu boş bayi ya da servis var mı,
  - sunucuya ulaşmamış kaç telefon kaydı var,
  - aynı talep ve ziyaret için birden fazla hak ediş var mı,
  - onay bekleyen tekrar ziyaret var mı,
  - açık kalmış "ödeme bekliyor" yedek parça talebi var mı.
- **Aylık mutabakat:** Onaylanan hak ediş toplamı ile LOGO'ya işlenen servis faturaları, ödenmiş parça talepleri ile LOGO satış faturaları karşılaştırılır.
- **Okunabilirlik gözlenir:** Müşteri numarayı telefonda doğru söyleyebiliyor mu? Banka açıklamasında numara kesilmeden geliyor mu [doğrulanmadı]?
- **Eşleşmeyen kayıtlar:** LOGO kodu bulunamayan bayi ya da seri biçimine uymayan makine gibi kayıtlar bir listede toplanır; PAKSAN personeli listeyi haftada bir kapatır.

### 6.3 Canlı öncesi

- **LOGO okuma servisi:** Dönemleri birleştiren görünüm kurulur, seri sorgusu açılır (4.7).
- **LOGO'ya yazma:** Test firmasında prova edildikten sonra açılır. Yıl sonu devri sırasında aktarımın durdurulması ve eski dönem belgelerine erişim kuralı yazılır.
- **Varyant ve parça–model eşlemesi:** LOGO malzeme listesi görüldükten sonra tasarlanır. Parça kullanım durumu ve fiyat LOGO'dan okunur.
- **İlçe kodu ve marka ayrımı** uygulanır.
- **Seri numarası denetimi:** Gerçek biçim geldiyse uyarıdan zorunluluğa geçer.
- **Pilot verisi:** Pilot canlının ilk dönemiyse olduğu gibi kalır. Ayrı veritabanındaysa taşınır; numaralar ve iç kimlikler korunur, eşleme tablosu saklanır.
- **Demo:** Demo dosyaları canlı derlemeden çıkmış olmalı; `dogrula --yayin` temiz çalışmalı.
- **İşlem kaydı:** Sınırsız ve silinemez hâle gelir. 500, 400, 200 ve 50 satırlık sınırlar kalkar.
- **KVKK sürümü:** Hukukçu onayından sonra artırılır.

### 6.4 Eski kayıtların okunması

Bugün sahada gerçek kullanıcı verisi olmadığı varsayılıyor, çünkü APK'lar demo adıyla dağıtılıyor ve mağazada değil [doğrulanmadı]. Sahada gerçek kayıt varsa bu bölüm genişletilmeli. Bu varsayımla telefonlardaki bugünkü kayıtlar sunucuya taşınmaz. Yine de uygulama ve backoffice bir süre eski biçimleri tanımalı:

- **Talep numaraları:** Eski numara (`SRV2608214417`, 13 karakter) ile yeni numara (`SRV2600123`, 10 karakter) uzunlukları farklı olduğu için karışmaz. Arama kutusu ikisini de kabul eder. Eski numara kayıtta "eski numara" alanında durur ve hiçbir zaman yeniden verilmez.
- **Taraf numaraları:** Eski servis, bayi, personel ve müşteri numaraları (`SRV001`, `BAY001`, `PRS007`, `MST000148`) "eski numara" alanında durur; yenileri verilmez.
- **Eski kimlikler:** Addan türetilmiş kimlikler (`konya-servis`, `konya-merkez`) "eski kimlik" alanında saklanır; yeni bağlar UUID ile kurulur.
- **Eski kod değerleri:** `gonderildi`, `bayide`, `eldeParca`, `parcaIste` gibi durum ve kapı değerleri bir eşleme tablosuyla yeni kodlara çevrilir. Tanınmayan değer "bilinmeyen" olarak görünür.
- **Ekran yazısıyla saklanmış seçimler:** `Fark etmez` gibi değerler eşleme tablosuyla koda çevrilir.
- **Telefonda bekleyen kayıtlar:** Uygulama güncellendiğinde gönderilmemiş kayıt varsa iç kimliğiyle sunucuya yollanır ve sunucu numara verir. Telefonun ürettiği eski numara "cihaz numarası" alanında saklanır; müşteri eski numarayı söylerse kayıt bulunabilir.
- **Taşınmayanlar:**
  - Telefondaki ek dosyaları. Taşınması istenirse dosyanın içerik özetiyle eşlenir.
  - Şifreler. Herkes ilk girişte yeniden belirler.
  - Okundu bilgisi ve bakım işaretleri, çünkü telefonun iç kimliğine bağlılar.

---

## 7. PAKSAN'ın karar vermesi gereken sorular

Sorular sorumluya göre gruplandı. Her sorunun yanında önerilen cevap var. Cevap gelmezse önerilen cevapla ilerlenir. Son tarihleri PAKSAN yönetimi belirler; "pilot öncesi" işaretli sorular pilot tarihinden önce kapanmalı.

### Yönetim

1. **Pilot, canlı sistemin ilk dönemi mi olacak, yoksa ayrı bir deneme mi?** *Önerilen:* Canlının ilk dönemi, kayıtlar kalır (5.2). *Pilot öncesi.*
2. **Pilot sunucuyla mı başlayacak?** *Önerilen:* Evet. Sunucu olmadan müşteri, PAKSAN'ın yaptığı servis atamasını göremiyor ve talep açamıyor. *Pilot öncesi.*
3. **Pilotun kapsamı ne?** Kaç bayi, kaç servis, kaç makine, hangi iller, ne kadar süre ve başarı ölçütü ne? *Önerilen:* Tek il, 2-3 bayi, 1-2 servis, üç ay. *Pilot öncesi.*
4. **Sunucu nerede duracak, LOGO entegrasyonunu kim hangi lisansla ve ne maliyetle yapacak?** *Önerilen:* Uygulama sunucusu LOGO sunucusundan ayrı durur. Entegrasyonu PAKSAN'ın LOGO iş ortağı canlı öncesinde yapar; teklif şimdiden alınır.
5. **LOGO'da markalar (Globale, Gallignani) ayrı firma olarak mı açılacak? Talep numaraları markaya göre ayrı seri mi olsun?** *Önerilen:* Tek seri; ayrı firma kararı çıkarsa yeniden bakılır.

### Muhasebe

6. **Bayi ve servis ekranda LOGO cari koduyla mı tanınsın?** *Önerilen:* Evet; ayrı kod serisi açılmaz (4.3). *Pilot öncesi.*
7. **Servisler LOGO'da tek cari kartla mı (alıcı + satıcı) tutuluyor?** *Önerilen:* Tek kart. *Pilot öncesi.*
8. **Yedek parça alan müşteriye cari açılacak mı, yoksa perakende satışlar tek bir genel cariden mi faturalanıyor?** *Önerilen:* Muhasebenin bugünkü düzeni sürer.
9. **Pilotta hak ediş gerçek parayla ödenecek mi?** *Önerilen:* Evet. Ödeme LOGO'da yapılır; muhasebe backoffice'te dökümü "ödendi" işaretleyip fiş numarasını yazar. Uygulama bakiye göstermez. *Pilot öncesi.*
10. **Hak edişte KDV, tevkifat ve stopaj nasıl uygulanıyor? PAKSAN bakım-onarım hizmetinde tevkifat uygulayan alıcı mı? Şahıs servise gider pusulası mı düzenleniyor?** *Önerilen:* Muhasebe oranları belirler, uygulama ayrı alanlarda tutar. *Pilot öncesi.*
11. **Pilotta yedek parça havaleyle satılacak mı?** *Önerilen:* Evet; ama havaleden önce PAKSAN stoğu ve tutarı doğrular (4.2.1). "Ödeme bekliyor" talepleri kaç gün sonra iptal olsun? *Pilot öncesi.*
12. **Belge No alanını bugün ne için kullanıyorsunuz?** *Önerilen:* Boşsa uygulamanın numarası buraya yazılır; doluysa doküman izleme numarası kullanılır (4.7).
13. **Garanti kapsamında servise bedelsiz gönderilen parça LOGO'dan hangi belgeyle çıkıyor, iade ve iptal nasıl işliyor?** *Önerilen:* Muhasebe bugünkü belge türünü bildirir; uygulama o belgenin numarasını servis kaydına bağlar.
14. **Kargo bedelini kim ödüyor, faturada ayrı satır mı?** *Önerilen:* Muhasebenin bugünkü uygulaması sürer; uygulama tutarı ayrı alanda tutar.

### Satış

15. **Garanti hangi tarihten başlıyor ve süre 2 yıl mı?** *Önerilen:* Çiftçiye satış ya da teslim tarihinden başlar; belgeyi bayi ya da müşteri yükler, PAKSAN onaylar. Belge yoksa PAKSAN'ın bayiye kestiği fatura tarihine satışın belirleyeceği bir süre eklenir (4.4). Hukukçu doğrulamalı. *Pilot öncesi.*
16. **Talep numarası müşteriye `SRV-26-00123` biçiminde mi görünsün? SRV, YPR ve TKF önekleri kalsın mı?** *Önerilen:* Evet, kontrol hanesi olmadan. Servis parça siparişi için `SPS`.

### Servis müdürü

17. **"Sorun devam ediyor" sonrası yapılan ziyaretin bedeli ödeniyor mu? Kaç gün içinde aynı arıza tekrar sayılır?** *Önerilen:* Tekrar ziyaret onaya bağlı, 0 tutarla açılır; 30 gün içindeki aynı arıza tekrar sayılır. *Pilot öncesi.*
18. **Servisim hesabı firma başına mı, teknisyen başına mı?** *Önerilen:* Pilotta firma başına bir hesap; işi yapan teknisyenin adı servis kaydına yazılır.
19. **Parça–model eşlemesini kim hazırlayacak?** *Önerilen:* Servis müdürü ile Ar-Ge; canlı öncesi.

### Bilgi işlem

20. **Makine plakasındaki gerçek seri numarası biçimi ne? Plakada kontrol hanesi var mı?** *Pilot öncesi.*
21. **Fiyat listesindeki parça kodları LOGO malzeme kodlarıyla aynı mı?** *Pilot öncesi.*
22. **LOGO'da makineler hangi düzeyde stok kartı olarak tutuluyor ve seri takibi açık mı?** *Önerilen:* Pilotta faturadaki malzeme kodu olduğu gibi yazılır; yapı canlı öncesi tasarlanır.
23. **LOGO kolon uzunlukları ve döviz türü numaraları nedir?** *Önerilen:* `INFORMATION_SCHEMA.COLUMNS` sorgusu çalıştırılır. *Pilot öncesi.*
24. **Yıl başında numara sayacının açılmasından kim sorumlu?** *Önerilen:* Bilgi işlem; yılın ilk iş gününde kontrol edilir.

---

## Bu belgenin henüz kapsamadığı konular

- **LOGO sınıflandırma alanları:** Ticari işlem grubu, yetki kodu, satış elemanı, ambar ve birim (adet, takım, metre). Uygulamadan gelen satışların LOGO raporlarında hangi alanla ayrılacağı ve parça siparişinde birim ile ambar bilgisi belli değil.
- **Kargo takip numarası:** Kargo takip numarasının LOGO irsaliyesiyle bağı ve kargo firmasının kodu.
- **KVKK ayrıntısı:** LOGO'dan çekilen verinin saklama süresi.
- **Veri sahipliği:** Önerilen her yeni alanı kimin, ne zaman dolduracağı. Proje kuralı gereği servisten yalnız karşılığında bir şey aldığı alan istenir. LOGO cari kodu, malzeme kodu, fatura numarası ve ETTN'yi PAKSAN personeli ya da entegrasyon doldurur. Nihai satış tarihini bayi ya da müşteri yükler, PAKSAN onaylar.
- **Bayi şubeleri:** Bir bayinin birden çok şubesi ya da LOGO cari kartı varsa nasıl tutulacağı.

---

## Bu belge hakkında

- **Yöntem:** Kod salt okunur tarandı, hiçbir dosya değiştirilmedi. İddialar dosya okunarak ve arama yapılarak doğrulandı. İki ayrı eleştiri turunda yanlış ya da abartılı bulunan maddeler düzeltildi. Çakışma olasılıkları hesaplanarak bulundu.
- **Doğrulanamayanlar:**
  - LOGO alan uzunlukları (Belge No dahil), döviz türü kodlaması ve LOGO ile gelen SQL Server lisansının kapsamı: Resmî LOGO belge sitesi okunamadı; bilgiler eski kılavuzlardan, topluluk belgelerinden ve eleştirmen görüşünden.
  - Parça kodunun LOGO malzeme kodu olup olmadığı: Fiyat listesi PDF'i açılamadı.
  - Gerçek seri numarası biçimi.
  - PAKSAN'ın e-belge birim kodu.
  - Banka açıklama alanında numaranın kesilip kesilmediği.
  - Tüketiciye satışta garantinin başlangıç tarihi (hukukçu doğrulamalı).
  - Kılavuz paketi kimliklerinin kalıcılığı.
  - Sahada gerçek kullanıcı verisi olmadığı.
- **Telefonda denenmemiş iki bulgu:** Aşağıdakiler yalnız kod okunarak doğrulandı:
  - servis APK'sında demo kurulumunun sessizce atlanması,
  - servis şifresi değiştirildikten sonra sayfa yenilenince ilk şifre ekranının yeniden açılması (veri.js:2389-2390).
- **Okunmayanlar:** Telefon ve tarayıcı depolarının canlı içeriği; destek asistanı sunucusu (D:\PAKSAN\paksan-rag\sohbet, Codex'in sorumluluğunda).
- **Depo kökündeki boş dosyalar:** Başka oturumlardan kalma, 0 baytlık, izlenmeyen on bir dosya var (`0)`, `m.id`, `[parcaAdi(s.kod)`, `GECIKME_SAAT` gibi). Komut yazımı hatasından oluşmuş görünüyorlar; dokunulmadı.
- **LOGO araştırmasının başlıca kaynakları:**
  - VUK 509 değişiklik metni: https://tr.andersen.com/tr/images/pdf/and_62-ebelgelerle-ilgili-degisiklikler.pdf
  - LOGO Cari Hesap kılavuzu: https://www.logohizmetmerkezi.com/dokuman/egitim/logo_cari_hesaplar_bolumu.pdf
  - LOGO e-Fatura/e-Arşiv kılavuzu: https://www.sdmyazilim.com.tr/var/uploads/1500477467-e-fatura_e-arsiv.pdf
  - Tablo alanları (topluluk belgesi, resmî değil): https://ugurozpinar.github.io/Logo/
  - SQL ile fatura yazma uyarısı: https://www.muratcicekci.com/2019/05/logo-tigera-sql-ile-fatura-kaytta.html
  - Damm yöntemi (ileride kontrol hanesi istenirse): https://en.wikipedia.org/wiki/Damm_algorithm
