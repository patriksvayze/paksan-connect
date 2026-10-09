# Canlıda geliştirici gerektiren işler

Bu belge tek bir soruyu cevaplıyor: **canlıya çıkıldığında hangi işler
için geliştirici çağırmak gerekecek?**

Kullanıcının sorusu (18 Eylül 2026, birebir): *"Canlıdayken minimum
seviyede Claude Code'a bağımlı kalmak istiyorum. O yüzden canlıya
çıkıldığında her rol kendi sorumluluğundaki işleri yapabilmeli. Şu anki
ekosistem canlıya çıkıldığında hangi alanlarda ve akışlarda sana
bağımlı?"*

Cevap kod okunarak çıkarıldı: dört yüzey (marka ve katalog verisi,
backoffice yetkileri, üç uygulamanın akışları, sunucu/veritabanı/yayın)
ayrı ayrı tarandı, çıkan 71 bulgu üç ayrı gözle denetlendi.

## Bir cümleyle

**Backoffice bugün İŞ AKIŞINI yönetiyor, ÜRÜN VE FİYAT VERİSİNİ
yönetmiyor.** PAKSAN'ın ticari kararlarının tamamı — model listesi,
fiyat, KDV, iskonto, yol tarifesi, garanti süresi, IBAN — kaynak kodda
sabit. Her biri yeni sürüm ve yeni APK demek.

## Neyin bağımlılık sayıldığı

İşin olağan akışında düzenli ya da ara sıra yapılması gereken bir iş,
yalnızca şunlardan biriyle yapılabiliyorsa bu bir bağımlılıktır: kaynak
kodu değiştirmek, komut satırından betik çalıştırmak, dosya sistemine
elle dosya koymak, yeni sürüm derleyip yayınlamak, veritabanında elle
sorgu çalıştırmak.

Bağımlılık SAYILMAYANLAR: yeni özellik geliştirmek, hata düzeltmek,
tasarım değiştirmek, bir kerelik kurulum işleri.

## Rol rol durum

### PAKSAN personeli (backoffice)

**Bugün yapabildikleri:** Talep akışının tamamı: talebi görme, servise/bayiye atama, teklif verme, kapatma, iptal etme, gecikme rozetlerini izleme. Bayi ve servis kaydı açma-düzenleme. Makineye satan bayiyi ve bakan servisi atama (src/backoffice/ekranlar/Makineler.jsx:439-467). Duyuru yayınlama. Personel ve rol yönetimi (roller serbestçe açılıp yetkileri işaretlenebiliyor). Servisin hak edişini onaylama — onay cari deftere alacak yazıyor (src/backoffice/veri.js:2262). Müşterinin ad/il/ilçe/satıcı alanlarını düzeltme (src/backoffice/veri.js:1481). Rapor alma, destek kayıtlarını görme.

**Yapamadıkları:**

- Yeni makine modelini sisteme eklemek — ürün listesi kaynak kodda (src/data/katalog/products.js:472) ve seri doğrulaması bilinmeyen öneki reddediyor (src/lib/serial.js:79). Kataloğa girmemiş makine müşteri tarafından hiç eklenemiyor.
- Ürün fotoğrafı, teknik özellik, bakım adımı, vitrin sırası, garanti süresi değiştirmek — hepsi kodda (gorseller.js:23, teknikOzellikler.js:5, products.js:27, products.js:509, serial.js:90).
- ~~Yeni yedek parça fiyat listesini yürürlüğe sokmak~~ — **YAPILDI (21 Eylül 2026):** personel Yedek Parça Kataloğu ekranından PDF'i yüklüyor, değişiklikleri görüp onaylıyor (bkz. 8 numaralı iş). Canlıda sunucunun yayın uç noktası gerekiyor (CANLIYA-CIKIS.md 2.1.1 madde 6).
- Yeni parça grubunu makine ailesine bağlamak — eşleme kodda elle tutuluyor (src/data/katalog/parcaGruplari.js:37); yazılmayan grubun parçaları müşteri ekranında hiç görünmüyor.
- Banka hesabı / IBAN girmek — liste kodda ve bugün BOŞ (src/data/kimlik.js:132-146, `aktif: false`). Bu yüzden ödeme ekranı IBAN yerine 'bizi arayın' diyor (src/screens/RequestForm.jsx:1925-1932).
- Şirket telefon/e-posta/adres bilgisini değiştirmek — src/data/kimlik.js:41-58.
- Servise ödenen hak edişi deftere işlemek — `cariHareketEkle` (src/backoffice/veri.js:2545) hiçbir ekrandan çağrılmıyor; bakiye yalnız büyüyor.
- ~~Makinenin sahibini değiştirmek (ikinci el devir)~~ — **YAPILDI (9 Ekim 2026):** Kayıtlı Makineler penceresinde "Sahibini Değiştir"; yeni sahibin hesabı telefon numarasıyla bulunuyor, makine ona geçiyor (yetki `makineDevir`, varsayılan yalnız Admin; `backoffice/veri.js → makineSahibiniDegistir`).
- Müşterinin giriş telefonunu değiştirmek — Müşteriler ekranında telefon alanı yok; oturumsuz numara değişikliği talebi ise boş kimlikle kaydedildiği için onaylansa bile numarayı değiştirmiyor (src/lib/numaraTalebi.js:83-89, src/backoffice/veri.js:1600, 1817).
- Müşteri hesabını silmek/anonimleştirmek — kodda böyle bir işlev yok; uygulama müşteriyi e-posta yazmaya yönlendiriyor (src/screens/Profile.jsx:753).
- KDV oranını, servis parça iskontosunu, yol tarifesini, garanti yılını, gecikme ve teklif bekleme eşiklerini değiştirmek — hepsi kod sabiti (para.js:30, makineFiyat.js:24, servisKaydi.js:155, serial.js:90, veri.js:1003 ve 1209).
- Kullanım kılavuzu eklemek/güncellemek — Connect'te paket APK'nın içine gömülü (src/lib/destek.js:1), destek asistanında ise PDF'i klasöre koyup JSON'u elle düzenleyip betik çalıştırmak gerekiyor (paksan-rag/sohbet/kilavuz-ekle.mjs).
- KVKK aydınlatma/rıza metinlerini güncellemek — iki dilde kaynak kodda (src/data/kvkk.js), sürüm numarası da kodda elle artırılıyor.
- Arıza belirtisi, iptal sebebi, duyuru alt türü, form seçeneği gibi kod listelerine satır eklemek — 61 liste / 406 kod kaynak dosyalara dağılmış (src/data/talepAlanlari.js, src/data/duyuruTurleri.js, Talepler.jsx).
- Bir servis firmasına ikinci giriş hesabı açmak — servis kaydında tek kullanıcı/şifre alanı var (src/backoffice/veri.js:2574-2602).

**En büyük eksik:** Backoffice bugün yalnız İŞ AKIŞINI yönetiyor; ÜRÜN VE FİYAT VERİSİNİ yönetmiyor. Ne ürün kataloğu, ne fiyat listesi, ne şirket/banka bilgisi, ne de tek bir ayar ekranı var. PAKSAN'ın ticari kararlarının tamamı (model, fiyat, KDV, iskonto, tarife, garanti, IBAN) kaynak kodda sabit — hepsi yeni sürüm ve yeni APK demek.

### Bayi

**Bugün yapabildikleri:** Bayinin paneli yok, sistemde kaydı var — bu bilinçli bir karar. Bayiyle ilgili her şey (kayıt açma, bilgi güncelleme, fiyat teklifini bayiye atama) backoffice'ten PAKSAN personeli tarafından yapılıyor ve o ekranlar çalışıyor.

**Yapamadıkları:**

- Kendine atanan fiyat teklifi talebini bir ekranda görmek — `talebiBayiyeAta` talebi 'Bayide' durumuna alıyor ve PAKSAN'ın kuyruğundan çıkarıyor, ama bayiye ulaştırma yolu ürünün içinde yok; iletişim ürün dışında (telefon) yürüyor.

**En büyük eksik:** Bayi tarafında Claude Code bağımlılığı YOK — çünkü bayinin ürünü yok. Buradaki tek açık nokta, bayiye atanan teklifin bayiye nasıl ulaşacağı; bu bir bağımlılık değil, karara bağlanmamış bir akış. Listeye iş olarak yazılmamalı, önce 'bayi bunu nereden görecek' sorusu cevaplanmalı.

### Servis (PAKSAN Servisim)

**Bugün yapabildikleri:** İşi kabul etmek, sahada kapanış kaydı doldurmak (yapılan iş, parçalar, ücret, özet), kilometre yazmak, garanti kapsamını işaretlemek, parça siparişi vermek, Hak Ediş ekranından onaylanan işlerinin tutarını görmek.

**Yapamadıkları:**

- Aldığı ödemenin bakiyesinden düştüğünü görmek — ekran 'Ödeme yapıldıkça buradan düşer' diyor (src/servis/ekranlar/Hakkedis.jsx:77) ama ödeme satırı yazan hiçbir yer yok; bakiye sürekli büyüyor.
- Kendisine özel pazarlıkla belirlenmiş parça iskontosuyla sipariş vermek — oran tek ve sabit: %30 (src/data/katalog/makineFiyat.js:24). Servis kaydındaki `iskonto` alanı kodda anılıyor ama hiçbir yerde okunmuyor ve girilmiyor.
- Yol tarifesinin akaryakıt zammına göre güncellenmesini beklemek — km başına tutar kodda sabit (src/lib/servisKaydi.js:155, `yolKm: 12`); dosyanın kendi yorumu 'YOL TARİFESİ BUGÜN KODDA' diyor.
- Ekipteki ikinci tekniker için ayrı hesapla girmek — firma başına tek hesap var, ekip aynı hesabı paylaşıyor, kaydı kimin girdiği ayırt edilemiyor.

**En büyük eksik:** Ekosistemin en güçlü kaldıracı olarak yazılmış olan HAK EDİŞ zinciri yarım: servis işini kaydediyor, PAKSAN onaylıyor, alacak defterine yazılıyor — sonra ödeme yapılıyor ama defterde karşılığı yok. Servis, uygulamanın kendisine söz verdiği şeyi (ödendikçe düşen bakiye) göremiyor. Bu, veri girişini doğru yaptıran tek gerekçeyi aşındırır.

### Müşteri (PAKSAN Connect)

**Bugün yapabildikleri:** Kayıt olmak, KVKK onayı vermek, makinesini seri numarasıyla eklemek, servis ve fiyat teklifi talebi açmak, yedek parça talebi açıp dekont yüklemek, kılavuzlara bakmak, destek asistanına soru sormak, talebinin durumunu ve servis kaydını izlemek.

**Yapamadıkları:**

- Kataloğa girmemiş yeni bir modeli eklemek — seri doğrulaması 'Bu seri numarasını sistemimizde bulamadık' diyerek duruyor (src/lib/serial.js:79). Makine eklenemeyince o makine için servis talebi de açılamıyor.
- Yedek parça bedelini havale etmek — IBAN listesi boş olduğu için ödeme ekranı hesap bilgisi yerine 'bizi arayın' diyor.
- Telefonunu kaybedip hesabına dönmek — numara değişikliği yolu tam da giriş yapamayan müşteri için açılmış ama oturumsuz gönderilen talep boş kimlikle kaydediliyor ve onaylansa bile numara değişmiyor. Müşteri hesabına bir daha giremiyor.
- İkinci el aldığı makineyi üstüne almak — uygulama 'PAKSAN'ı arayın, doldurmanız gereken bir şey yok' diyor (src/screens/AddMachine.jsx:412) ama duvarın arkasında devri yapacak ekran yok.
- Hesabının silinmesini sağlamak — talep e-postayla alınıyor, işleyecek ekran yok.
- Servisi atanmamış makinede servis talebi açmak — bu bilinçli bir karar (src/lib/servisAtama.js), atama backoffice'te yapılıyor; bağımlılık değil.

**En büyük eksik:** Üç yerde uygulama müşteriye 'PAKSAN'ı arayın, gerisini onlar halleder' diyor — makine devri, hesap silme, numara değişikliği. Üçünde de duvarın arkasında kimse yok: PAKSAN personelinin elinde bu işleri yapacak bir ekran bulunmuyor. Söz verilip karşılığı olmayan üç akış, canlıda ilk hafta patlar.

### Sistem yöneticisi

**Bugün yapabildikleri:** Depoyu derlemek, üç ürünü ayrı ayrı çıkarmak, `npm run dogrula` ile 13 kontrolü koşturmak, `npm run vt -- calistir` ile veritabanı göçlerini uygulamak, `vt sinama` ile denetimleri koşmak, ilk admin hesabını açmak ve Personel ekranından gerçek hesapları kurmak.

**Yapamadıkları:**

- Canlı veritabanının yedeğini almak — `npm run vt -- yedekle` komut listesinde yazılı (tools/vt.mjs:170) ama DOSYASI YOK: tools/vt/ altında calistir, denetle, ortam, sinama, sqlcmd, tohum-uret var, yedekle yok. Komut 'henüz hazır değil' diyerek düşüyor. Aynı anda tools/vt/calistir.mjs:230-245 son 2 saatte tam yedek yoksa güncellemeyi DURDURUYOR. Yani yedek alınamıyor ve yedek alınmadan güncelleme de yapılamıyor.
- Ayar değiştirmek — 29 ayarın tek değiştirme yolu SSMS'ten `EXEC yonetim.AyarDegistir` çağırmak.
- KVKK saklama sürelerini uygulamak — `sistem.SaklamaUygula` yordamı var ama günlük çağıracak zamanlanmış iş kurulu değil; kurallar JSON'da ve hepsinde `HukukOnayli: false`.
- Sürüm numarasını artırıp APK üretmek — Connect'in numarası üç yerde elle yazılı, `npm run apk` APK üretmiyor (yalnız derleyip Capacitor'a aktarıyor), dosya ayrıca Android SDK kurulu makinede `gradlew.bat assembleDebug` ile çıkıyor.

**En büyük eksik:** Yedekleme. Canlıya çıkmadan önce kapatılması gereken tek gerçek kilit bu: yedek alacak araç yazılmamış, günlük yedek işi kurulmamış, geri dönme provası yapılmamış (CANLIYA-CIKIS.md:444-451 istiyor). Diğer her şey 'geliştirici çağırılır, bir gün bekler' seviyesinde; bu değil.

## Bağımlılığı kaldırma sırası

Sıra, en çok bağımlılığı kapatandan başlıyor. Bir backoffice ekranı çoğu
zaman birden fazla bağımlılığı birden kapatıyor; onlar öne alındı.

> **ÖNEMLİ UYARI — "veritabanı hazır, eksik olan yalnız ekran" DEĞİL.**
> Denetim bunu yakaladı: şema açıklamalarının 25'i ilgili tablolar için
> açıkça *"Tohumla gelir (kaynak: src/...); uygulama bu tabloya yazmaz"*
> diyor ve tohum betikleri koddaki değeri geri yazıyor
> (`MERGE ... UPDATE SET`). Yani aşağıdaki ekranların bir kısmı
> yazıldığında (a) yazacakları yordam yok, (b) yazsalar bile bir sonraki
> dağıtımın tohum koşusu değişikliği siliyor. Bu ekranların her biri
> önce bir VERİTABANI KARARI: hangi tablonun tohum kaynağı emekliye
> ayrılıyor, yerine hangi yazma yordamı geliyor.
>
> İkinci uyarı: aşağıdaki on üç ekranın **hiçbirinin yetki tanımı yok**.
> Yetki kataloğu bugün 17 izinden ibaret; her yeni ekran kendi iznini de
> getirmeli (kod + tohum + var olan rollere elle dağıtım).

### 1. Şirket ve Ayarlar ekranı

Backoffice'te tek bir "Şirket ve Ayarlar" ekranı: künye (telefon, e-posta, adres), banka hesapları/IBAN, ihracat e-posta listesi ve sayısal ayarlar (KDV oranı, garanti yılı, talep gecikme saati, teklif bekleme günü, yol tarifesi, parça iskontosu). Üç ürünün bu değerleri koddan değil depodan/sunucudan okuması — bayi/servis listesindeki `icerikListe` kalıbının aynısı.

**Büyüklük:** orta · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- IBAN girmek/değiştirmek (bugün ödeme ekranı 'bizi arayın' diyor — engel)
- Şirket telefon/e-posta/adres güncellemesi
- KDV oranını değiştirmek
- Servis parça iskontosunu değiştirmek
- Servis yol tarifesini (km başına tutar) değiştirmek
- Garanti süresini değiştirmek (ayrıca kimlik.js:69 ile serial.js:90 ikiliğini tek kaynağa indirir)
- Gecikme ve teklif bekleme eşiklerini ayarlamak
- İhracat e-posta listesini girmek/değiştirmek
- 29 ayarın SSMS'siz değiştirilebilmesi

### 2. Yayın güvenliği: uydurma bayi ve servis listeleri

Yayın güvenliği: canlı derlemede uydurma bayi (20) ve servis (14) yedek listelerinin boş olması, liste yoksa ekranın 'bilgi yok' demesi; ve bu kontrolün `npm run dogrula -- --yayin` içine eklenmesi (tools/dogrula.mjs:770-800 bugün yalnız dört ayara bakıyor).

**Büyüklük:** küçük · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- Müşterinin uydurma servis adı ve uydurma telefon numarası görmesi riski (src/lib/icerikDeposu.js:35 'liste yoksa koddaki liste' diyor)
- Uydurma kayıtları silmek için kod değişikliği + yeni APK gerekmesi

### 3. Servis cari hesabı ve ödeme girişi

Backoffice'te servis cari hesabı: bakiye listesi ve "Ödeme Girildi" formu (tutar, tarih, açıklama/dekont bağı). Yazacağı fonksiyon zaten var (`cariHareketEkle`, src/backoffice/veri.js:2545), eksik olan yalnız ekran ve 'odeme' hareket türü.

**Büyüklük:** küçük · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- Servise ödenen hak edişi deftere işlemek — bugün bakiye yalnız büyüyor (engel)
- Servisin Hak Ediş ekranındaki 'ödeme yapıldıkça düşer' sözünün karşılığının doğması

### 4. Müşteri kartı işlemleri: numara değiştirme, hesap silme

Backoffice → Müşteriler ekranında müşteri kartı işlemleri: "Giriş numarasını değiştir" ve "Hesabı sil / anonimleştir" (onaylı, gerekçeli, işlem kaydına yazan). Ayrıca oturumsuz numara değişikliği formunda eski numaranın sorulması (src/lib/numaraTalebi.js:83-89 bugün boş kimlik kaydediyor).

**Büyüklük:** orta · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- Telefonunu kaybeden müşterinin hesabına dönememesi (bugün hiçbir yoldan çözülemiyor — engel)
- KVKK hesap silme talebinin işleme alınamaması
- Müşteri telefonunun backoffice'ten hiç değiştirilememesi (veri.js:1481 yalnız ad/il/ilçe/satıcı yazıyor)

### 5. Makineyi devret

Backoffice → Makineler ekranında "Makineyi Devret": yeni sahibin hesabını seç, zorunlu gerekçe, eski satırı devredilmiş işaretle, işlem kaydına yaz. Kuralları 18.09.2026'da zaten karara bağlanmış (VT-TASARIM-EKLERI.md:46-108), yazılmamış.

**Büyüklük:** orta · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- İkinci el makine devri — uygulama müşteriye 'PAKSAN yapar' diyor ama yapacak ekran yok (engel)
- Devir için depodaki makineKayitlari satırını elle düzenleme zorunluluğu

### 6. Veritabanı yedeklemesi

**KISMEN BİTTİ (21 Eylül 2026).** `tools/vt/yedekle.mjs` yazıldı:
`npm run vt -- yedekle` tam yedek alıp `RESTORE VERIFYONLY` ile
doğruluyor, `--gunluk` günlük yedeğini alıyor (tasarim.md 1.19.2).
Sınama veritabanında denendi: yedekten önce güncelleme kapısı kapalı,
yedekten sonra açık; 64 KB'ı bozulmuş bir yedek kopyasını doğrulama
reddetti. **Kapattığı iki engel kalktı:** yedek alınabiliyor ve
`vt guncelle` test/canlıda artık durmuyor. **Kalan:** yedeğin ikinci
bir yere kopyalanması, zamanlanmış günlük iş (saklama kurallarıyla
birlikte) ve bir kez geri yükleme provası.

tools/vt/yedekle.mjs'in yazılması, yedeğin ikinci bir yere kopyalanması, günlük zamanlanmış yedek işi ve bir kez geri dönme provası (CANLIYA-CIKIS.md:444-451).

**Büyüklük:** orta · **Önce bitmesi gereken:** Veritabanının canlı sunucuda kurulmuş olması

Kapattığı bağımlılıklar:

- Canlı veritabanının yedeğinin alınamaması (komut tanımlı ama dosyası yok — engel)
- Yedek olmadığı için veritabanı güncellemesinin de yapılamaması (tools/vt/calistir.mjs:230-245 durduruyor)
- KVKK saklama işinin (`sistem.SaklamaUygula`) günlük koşması — aynı zamanlayıcıya bağlanabilir

### 7. Ürünler ekranı ve ürün kataloğunun veriye taşınması

Backoffice'te "Ürünler" ekranı ve ürün kataloğunun koddan veriye taşınması: model adı, kategori, seri öneki, açıklama, fotoğraf yükleme, teknik özellik satırları, bakım adımları, vitrin işareti, ürüne özel garanti süresi. Veritabanı tarafı hazır (katalog.Urun, katalog.UrunOzelligi, katalog.BakimSablonu).

**Büyüklük:** büyük · **Önce bitmesi gereken:** 1 (ayar/veri okuma kalıbının kurulmuş olması)

Kapattığı bağımlılıklar:

- Yeni makine modeli eklemek — bugün kataloğa girmemiş makine hiç kaydedilemiyor, dolayısıyla o makineye talep de açılamıyor (engel)
- Ürün fotoğrafı koymak/değiştirmek
- Teknik özellikleri güncellemek
- Ana ekran vitrinini (5 model) mevsime göre değiştirmek
- Bakım aralıklarını gerçek servis bilgisiyle düzeltmek
- Garanti süresinin ürün bazında tanımlanması
- Yeni ürünün kılavuzunun yüklenebilmesi (kataloğa girmemiş makineye kılavuz bağlanamıyor)

### 8. Yedek parça fiyat listesi ekranı

Backoffice'te "Yedek Parça Fiyat Listesi" ekranı: PDF yükle → çıkarılan listeyi önizle (kaç grup, kaç parça, kaç fiyat, kaç görsel; kaç yeni, kaç değişti) → eşleşmemiş parça gruplarını makine ailesiyle eşleştir → onayla → yeni liste yürürlüğe girsin, eski liste arşive geçsin. Çıkarım işinin (21 Eylül 2026’ya kadar tools/parca-katalogu.py) komut satırından çıkarılması.

**Büyüklük:** büyük · **Önce bitmesi gereken:** 7 (parça-makine eşleşmesi ürün kataloğuna dayanıyor)

**KARAR VERİLDİ (18 Eylül 2026):** Dönüştürme sunucuya taşınacak. Bugün fiyat listesi basılı bir PDF olarak geliyor ve komut satırından `python tools/parca-katalogu.py "<liste.pdf>"` ile ayrıştırılıyor. Sunucuda bu iş bir uç noktanın arkasına geçecek; personel PDF'i seçecek, sunucu dönüştürecek, ekran neyin değiştiğini gösterecek, personel onaylayınca liste yayına girecek.

**Ekranın önizleme ve onay tarafı YAZILDI** (`src/backoffice/ekranlar/ParcaKatalogu.jsx`, 18 Eylül 2026): parça adı ve grubu düzeltilebiliyor, parça pasife alınabiliyor, dönüşmüş liste açılıp neyin değiştiği görülebiliyor.

**PDF YÜKLEME YAPILDI (21 Eylül 2026, kullanıcının isteği: "Yedek parça personeli buradan yedek parça PDF listesini yükleyebilmeli").** Personel PDF'i seçiyor, liste tarayıcıda okunuyor (`src/lib/fiyatListesiOku.js`), fiyatı değişen / yeni / çıkan parçalar tek tek görülüyor, "Yayına Al" ile liste yürürlüğe giriyor ve eskisi arşive gidiyor (`sunucu-taklidi/fiyat-listesi-yayini.mjs`). 8 Ekim 2026'dan beri eski liste arşive gitmiyor, kalkıyor (kullanıcının kararı; kayıtların gösterdiği görseller kalıyor). Okumanın yeri kararından farklı: sunucuda değil tarayıcıda — sunucu yok ve sunucuya Python kurmak ek bağımlılıktı; akış aynı. Okuyucunun eski Python betiğiyle birebir aynı sonucu verdiği her `npm run dogrula`'da denetleniyor; betik kaldırıldı. Kalan: canlıda sunucunun `POST <kok>/yayinla` uç noktası (`CANLIYA-CIKIS.md` 2.1.1 madde 6) ve yeni parça grubunu makine ailesiyle eşleştirme adımı (bugün uyarı veriyor, eşleme hâlâ kodda).

Kapattığı bağımlılıklar:

- Yeni fiyat listesini yürürlüğe sokmak — bugün tek yol komut satırından Python betiği çalıştırıp çıktıyı sunucuya kopyalamak (engel)
- Yeni parça grubunun müşteri ekranından sessizce kaybolması (parcaGruplari.js:37 elle köprü)
- Belgelenmiş ama var olmayan `npm run vt -- fiyat-listesi` komutunun bıraktığı boşluk (tools/vt.mjs:165-171)
- PDF düzeni değişince çıkarımın sessizce eksik okuması (önizleme bunu yakalar)
- Fiyat listesi sürümlemesi/arşivi (katalog.FiyatListesi tablosu hazır)

### 9. Kılavuzların tek kaynağa toplanması

Kılavuzun tek kaynağa toplanması: backoffice'te "Kılavuzlar" ekranı (PDF yükle, hangi makinelere ait olduğunu işaretle), Connect'in gömülü 1,7 MB'lık paket yerine sunucudan okuması ve destek asistanı indeksinin sunucuda kendiliğinden yenilenmesi.

**Büyüklük:** büyük · **Önce bitmesi gereken:** 7 (kılavuz ürüne bağlanıyor)

Kapattığı bağımlılıklar:

- Connect'te kılavuz eklemek/güncellemek — bugün paketi yeniden üretip yeni APK çıkarmak gerekiyor
- Destek asistanına kılavuz eklemek — bugün PDF kopyalama + kilavuzlar.json'u elle düzenleme + betik çalıştırma + eşikleri yeniden ölçme
- Ürüne kılavuz ve tanıtım videosu bağlamak (products.js'te 30 boş video, 20 boş kılavuz bağlantısı)
- Güvenlik kuralları listesinin (40 madde) güncellenmesi
- Kılavuz indeksleme zincirinin üç ayrı ağaca bağlı olması (paksan-support-dataset .gitignore'da)

### 10. KVKK metinlerinin sürümlü yayımlanması

KVKK metinlerinin sürümlü olarak backoffice'ten yayımlanması ve uygulamanın açılışta güncel sürümü okuyup değiştiyse yeniden onay istemesi. Veritabanı tarafı hazır (kvkk.MetinSurumu).

**Büyüklük:** orta · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- Aydınlatma / açık rıza / ticari ileti metinlerini güncellemek (bugün iki dilde kod + elle sürüm artırma + yeni APK)
- Metin değişince mevcut kullanıcılardan yeniden onay alınamaması — bugün böyle bir akış hiç yok

### 11. Kod listeleri yönetim ekranı

Sık değişen kod listeleri için backoffice'te yönetim ekranı: arıza belirtisi (makine ailesi + TR + EN), iptal sebebi, duyuru alt türü, talep formu seçenekleri (makine durumu, ürün tipi, arazi, traktör gücü). kod.* tabloları şemada hazır.

**Büyüklük:** orta · **Önce bitmesi gereken:** yok

Kapattığı bağımlılıklar:

- Arıza belirtilerinin servis ekibinin gerçek diliyle düzeltilmesi (dosyanın kendi uyarısı: 'buradaki adlar taslaktır')
- Yeni duyuru türü açmak
- İptal sebebi eklemek
- 61 kod listesi / 406 kodun kaynak dosyalara dağılmış olması

### 12. Servise özel iskonto ve ikinci hesap

Servis kartında iki küçük alan: firma başına hesap listesi (birden çok tekniker) ve isteğe bağlı "bu servise özel parça iskontosu". `parcaServisFiyati` önce servis kaydına baksın.

**Büyüklük:** küçük · **Önce bitmesi gereken:** 1 (genel iskonto oranının ayara taşınmış olması)

Kapattığı bağımlılıklar:

- Bir servis firmasına ikinci giriş hesabı açmak (bugün ekip tek hesabı paylaşıyor, kaydı kimin girdiği bilinmiyor)
- Ticari pazarlıkla belirlenen servise özel iskontonun ekrana girilebilmesi

### 13. Sürüm ve yayın zinciri

Sürüm ve yayın zinciri: numarayı tek komutla artıran bir betik (Connect'in üç yeri + Servisim'in kendi hattı) ve APK'yı uçtan uca üretip imzalayan bir derleme adımı.

**Büyüklük:** orta · **Önce bitmesi gereken:** İmza anahtarı ve mağaza yayınını yapacak tarafın belirlenmesi (CANLIYA-CIKIS.md 5.2)

Kapattığı bağımlılıklar:

- Üç ayrı dosyada elle sürüm düzenlemesi
- `npm run apk`'nın APK üretmemesi, dosyanın ayrıca gradlew ile çıkması

## Canlıya çıkışla kendiliğinden kapananlar

Bunlar için ayrıca iş planlamayın.

Bunlar için iş planlamayın; canlıya çıkış adımlarının kendisi bunları kapatıyor.

1) VERİNİN TEK YERDE DURMAMASI. Bugün bütün backoffice verisi tarayıcının kendi deposunda (src/backoffice/veri.js:27, src/lib/storage.js); iki personel aynı listeyi görmüyor, müşteri kayıtları o telefonda duruyor (src/backoffice/ekranlar/DestekKayitlari.jsx:34 bunu açıkça yazıyor). Planlanan sunucu ve veritabanı açıldığında ekranların çoğu aynı kalıyor, yalnız okudukları yer değişiyor. Bu bir ekran eksiği değil, henüz kurulmamış bir altyapı.

2) DEMO VERİSİ. src/backoffice/demo.js ve demoServis.js açılışta uydurma müşteri/talep/hesap kuruyor; servis tarafındaki işaret servis.html kökündeki data-demo="acik". Bugün bilerek açık. Canlıya çıkışta o satır siliniyor ve `npm run dogrula -- --yayin` bunu zaten sorun sayıyor (tools/dogrula.mjs:738-800).

3) İLK ADMİN HESABI (admin / 123456). src/backoffice/veri.js:336-356; liste boşken kurulum yapılabilsin diye var. Gerçek admin hesabı açıldıktan sonra Personel ekranından siliniyor — o ekran zaten çalışıyor. Tek seferlik iş.

4) GELİŞTİRME ADRESLERİ VE GECİKMELER. src/config.js:46 (`AI.kok`), :113 (`PARCA_KATALOG.kok`), :125 (`taklitGecikme: 800`). Bugün doğru değerdeler; sunucu adresleri belli olduğu gün değişecekler. `npm run dogrula` 11. kontrol bunları listeliyor ve `--yayin` ile sorun saydırıyor. Kontrol listesi ve komut hazır.

DİKKAT: 2 ve 4 "kendiliğinden" olmuyor — komutu birinin çalıştırması gerekiyor. Kendiliğinden olan, ne yapılacağının zaten yazılı ve denetleniyor olması.

## Her zaman geliştirici işi kalacaklar

Her şeyin devredilebileceğini söylemek yanlış olur.

Her şeyin devredilebileceğini söylemek yanlış olur. Bunlar, yukarıdaki on üç iş bittikten sonra da geliştirici işi kalacak:

1) ÖZELLİK GELİŞTİRME, HATA DÜZELTME, TASARIM DEĞİŞİKLİĞİ. Yeni bir ekran, değişen bir iş kuralı, bozulan bir düzen. Bu zaten sorunun konusu değil ama sınırı çizmek gerekiyor: "PAKSAN personeli kendi işini yapabilsin" demek, uygulamanın kendini geliştirmesi demek değil.

2) APK DERLEMESİ VE MAĞAZA YAYINI. 13 numaralı iş bunu kolaylaştırır ama ortadan kaldırmaz: Android SDK kurulu bir makine, imza anahtarı ve mağaza hesabı gerekiyor. Uygulamanın içindeki her değişiklik bir yayın turu demek — asıl kazanç, VERİ değişikliklerinin artık yayın gerektirmemesi.

3) VERİTABANI ŞEMA DEĞİŞİKLİKLERİ. Yeni tablo, yeni alan, göç betiği. Ayar değiştirmek devredilebilir; şema değiştirmek devredilemez.

4) YENİ İKON ÜRETİMİ. src/data/ikonYollari.js:14 "BU DOSYA ELLE DÜZENLENMEZ" diyor; üretim yolu görsel + `python tools/ikon-svg.py`. Yeni ikon ihtiyacı zaten yeni bir ekranla birlikte geliyor, yani (1)'in parçası. Tek dikkat: ürün kataloğu ekranı yapılırken kategori için HAZIR BİR İKON KÜMESİNDEN SEÇİM sunulmalı, yoksa "yeni kategori ekleme" işi ikon üretimine bağlı kalır.

5) YENİ YETKİ TANIMLAMAK. src/data/yetkiler.js:31'deki katalog koddan geliyor. Rolleri açmak ve yetkileri dağıtmak personelin işi ve bu bugün çalışıyor; YENİ bir yetki ise neredeyse her zaman yeni bir ekran davranışı demek, yani zaten kod işi. Burada yapılacak tek şey var: sunucu yazılırken yetki denetiminin sunucuda tekrarlanması (CANLIYA-CIKIS.md 2.1 madde 7).

6) FİYAT LİSTESİ PDF'İNİN DÜZENİ DEĞİŞİRSE ÇIKARIM AYARI. src/lib/fiyatListesiOku.js → IZGARA'daki ölçüler bugünkü A4 listesi üzerinde ölçülmüş (21 Eylül 2026'ya kadar aynı ölçüler tools/parca-katalogu.py'deydi). Liste farklı dizilirse ölçüler yeniden alınmalı. 8 numaralı işteki önizleme bunu SESSİZ olmaktan çıkarır (yanlış sayı görünür, yükleme durur) ama düzeltmeyi yine geliştirici yapar.

7) TÜRKÇE METİN TURU. Ekranda görünen her Türkçe kelime Codex'ten geçiyor. Personelin backoffice'ten girdiği veri (ürün adı, belirti adı, duyuru metni) bu kuralın dışında — orada metni PAKSAN'ın kendisi yazıyor. Ama yeni bir EKRAN yazıldığında dizgi turu kaçınılmaz.

8) DESTEK ASİSTANININ MODEL VE EŞİK AYARLARI. Kılavuz yüklemek devredilebilir (9 numaralı iş); modelin, eşiklerin ve ölçüm turunun ayarlanması geliştirici işi kalır.

## Bu belge nasıl güncellenir

Bir madde bittiğinde satırı silinmez, başına **BİTTİ (tarih)** yazılır —
altı ay sonra "bu neden böyle yapılmış" sorusunun cevabı burada durur.
Yeni bir bağımlılık fark edildiğinde sıraya eklenir ve hangi rolü
etkilediği yazılır.
