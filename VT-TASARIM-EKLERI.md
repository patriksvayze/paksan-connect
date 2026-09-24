# Uygulamadan gelen veritabanı tasarımı ekleri

18 Eylül 2026'da uygulamaya iki yeni akış girdi (21 Eylül'de üçüncüsü, 22 Eylül'de dördüncüsü, 23 Eylül'de beşincisi, altıncısı ve yedincisi, 24 Eylül'de sekizincisi eklendi). Hepsi bugün
tarayıcının hafızasında çalışıyor; sunucuya geçerken veritabanı
tasarımına (`veritabani/tasarim.md`) aşağıdaki maddeler işlenmeli.

Buraya yazılmasının sebebi: tasarım dosyası o sırada başka bir işte
açıktı; notlar kaybolmasın diye ayrı tutuldu. İşlendikten sonra bu dosya
silinir.

## 1. Seri numarası başka hesapta — "Numaram Değişti" / "Başkasından Aldım"

Akış: müşteri makine eklerken seri başka bir hesapta kayıtlıysa makine
eklenmiyor; ya numara değişikliği (hesap birleştirme) talebi açılıyor ya
da müşteri PAKSAN'ı arıyor (sahiplik devrini personel yapıyor).

- **Makine ekleme API'si:** seri, başka bir hesapta AÇIK
  `makine.MakineSahipligi` satırı taşıyorsa yeni sahiplik açılmaz. HTTP
  409 ve kendi hata kodu döner. Cevapta öteki hesabın kimliği, numarası,
  adı ve telefonu BULUNMAZ (başkasının bilgisi; isteyen kişi makineyi
  çalmış da olabilir). Deneme `makine.KayitOlayi`'na yazılır: "başkasından
  aldım" ve çalıntı şüphesi için iz kalır.
- **`musteri.TelefonDegisikligiTalebi`:**
  - `TurKodu` → yeni `kod.TelefonTalebiTuru` listesi: `numaraDegisikligi`,
    `hesapBirlestirme`.
  - `EskiHesapKimlik uniqueidentifier NULL` → `musteri.Hesap`; sunucu
    seriden çözer, istemci göndermez.
  - `KanitMakineKimlik uniqueidentifier NULL` → `makine.Makine`.
  - Kısıt: `TurKodu = N'hesapBirlestirme'` ise `HesapKimlik`,
    `EskiHesapKimlik`, `KanitSeriNo`, `EskiTelefonE164` dolu ve iki hesap
    farklı.
  - Bekleyen talep tekilliği tür başına: `UNIQUE (HesapKimlik, TurKodu)
    WHERE bekliyor`; birleştirmede ayrıca `(HesapKimlik, EskiHesapKimlik)`.
    Bugünkü tek kural, aynı hesabın numara talebi ile birleştirme talebini
    aynı anda açmasını engelliyor; arayüz ikisine de izin veriyor.
- **`yonetim.HesaplariBirlestir`:** `@TelefonDegisikligiNumarasi = NULL`
  parametresi (MusteriTelefonunuDegistir'deki gibi). Talep aynı işlemde
  `onaylandi` ve `UygulanmaZamani` alır; tür ya da hesap tutmazsa 51104.
  `hesaplarBirlestirildi` olayının ayrıntısına TEL numarası ve kanıt seri
  yazılır.
- **Sahiplik devri:** "başkasından aldım" için hesap birleştirme YANLIŞ;
  ayrı bir `yonetim.MakineSahipliginiDevret @SeriNo, @YeniTelefon,
  @Gerekce` gerekiyor — açık sahiplik `devir` nedeniyle biter, yeni
  sahiplik açılır, hesaplar birleşmez. Tasarımda bugün karşılığı yok.

### 1.1 Devrin kuralları — KULLANICININ KARARI (18 Eylül 2026)

Prosedür yazılırken bu üç madde uygulanır. Kararlar kullanıcıya aittir,
katalog yazarı yeniden yorumlamaz.

**(a) Belge istenmez, TEYİT İSTENİR.** Personel devri yaparken fatura ya
da satış belgesi aramaz; eski ve yeni numarayı arayıp iki taraftan da
teyit alır. Yani doğrulama belgede değil, personelin telefon görüşmesinde.

- `@Gerekce` bu yüzden ZORUNLU ve serbest metin değil bir kayıt: hangi
  iki numaranın arandığı ve kimin teyit verdiği yazılır. Devir sessizce
  yapılamaz.
- Devir `denetim.IslemKaydi`'na ve `makine.KayitOlayi`'na yazılır; sonradan
  "bu makine kimden kime, kimin kararıyla geçti" sorusunun cevabı orada
  durur.
- Belge şartı KONULMADI ama belge alanı da kapatılmadı: ileride istenirse
  `BelgeBagiKimlik` eklenir; bugün zorunlu değil.

**(b) MAKİNE GEÇER, GEÇMİŞ GEÇMEZ.** Makine el değiştirince eski sahibin
listesinden düşer, yeni sahibin listesine girer. Yeni sahip makinenin
ESKİ SERVİS GEÇMİŞİNİ GÖRMEZ. PAKSAN ise backoffice'ten makinenin bütün
servis kayıtlarını görmeye devam eder.

Şemada karşılığı: servis kayıtları makineye bağlı (`talep.Talep` →
`MakineKimlik`) ama HESABA da bağlı (`HesapKimlik`). Devirde
`talep.Talep.HesapKimlik` TAŞINMAZ — hesap birleştirmeden ayrıldığı yer
tam burası.

- **Connect'te makinenin talep listesi hesapla süzülmeli**, yalnız
  makineyle değil. Süzgeç makineye bırakılırsa yeni sahip önceki sahibin
  adını, telefonunu, adresini ve arızasını görür; bu KVKK sorunudur.
  Sunucu tarafında bu bir şart olarak yazılacak (bugün tek cihazda tek
  hesap çalıştığı için ortaya çıkmıyor).
- Backoffice'te süzgeç YOK: `gorunum.MakineKarti` ve `MakineArama`
  makinenin bütün geçmişini vermeye devam eder. Garanti tartışmasında ve
  ikinci el makinenin arıza geçmişinde PAKSAN'ın bakacağı tek yer orası.
- Eski sahibin kendi açtığı talepler kendi hesabında kalır; makine artık
  onun değil ama geçmişte açtığı kayıt onun kaydıdır.

**(c) GARANTİ SAHİPLİĞE BAĞLI DEĞİL.** Garanti makinenin satış zamanına
bağlı; sahiplik değişse de garantide hiçbir şey değişmez. Bu tasarımda
zaten böyle (garanti satışa sabitleniyor, Bölüm 1.9.6:
`makine.MakineSatisi` satırına `GarantiYil`,
`GarantiBaslangicEsasiKodu`, `GarantiFaturaEkGun` satış anında kopyalanır
ve sonra değişmez). Devir prosedürü garanti alanlarına DOKUNMAZ —
prosedürün sınamasına bu da bir madde olarak yazılır: devirden önce ve
sonra `gorunum.MakineGarantisi` aynı sonucu vermeli.

## 2. Servisim Adreslerim — teslimat adresi

Akış: servis, garanti parçası isteğinde ve kendi parça siparişinde
parçanın gönderileceği adresi seçiyor; adresler servis başına bir
defterde duruyor, bir kerelik adres de girilebiliyor.

- **`servis.TeslimatAdresi` (defter):** `ServisKimlik`, `Baslik
  nvarchar(40)`, `AliciAdi nvarchar(150)`, `TelefonE164`, konum grubu
  (`KonumUlkeKodu`, `IlKodu`, `IlceKodu`, `Adres nvarchar(500)`),
  `Varsayilan bit NOT NULL`, oluşma/güncelleme zamanı.
  - `UNIQUE (ServisKimlik) WHERE Varsayilan = 1`, `IX (ServisKimlik)`.
  - Servis defterden satır silebilir; talep adresin kopyasını taşıdığı
    için geçmiş bozulmaz.
- **`talep.TeslimatAdresi` (talebe yazılan kopya):** `talep.ParcaSevki`
  kalıbıyla `TalepKimlik`, `TurKodu`, `ZiyaretKimlik NULL` (garanti parça
  isteğinde ziyaret, servis siparişinde boş).
  - `CK (TurKodu <> N'servis' OR ZiyaretKimlik IS NOT NULL)`; ziyaret
    başına ve talep başına tekil.
  - `KaynakKodu` → yeni `kod.TeslimatAdresiKaynagi` (`kayitli`, `elle`).
  - `ServisTeslimatAdresiKimlik NULL` yalnız bilgi amaçlı bağ;
    `CK (KaynakKodu = N'kayitli' OR ServisTeslimatAdresiKimlik IS NULL)`.
  - Tek satırlık adres yazısı türetilir, saklanmaz.
- **KVKK:** elle girilen adres müşterinin tarlası olabilir.
  `talep.TeslimatAdresi` içindeki `AliciAdi`, telefon ve `Adres`
  anonimleştirme kapsamına (tasarım 1.13.5) girmeli.
- **Mevcut kolon:** `talep.ParcaTalebiAyrinti.TeslimatAdresi` müşterinin
  parça talebi için kalabilir; servis siparişi yeni tabloya taşınır.
- **Taşıma eşlemesi:** `servisAdresleri` → `servis.TeslimatAdresi`;
  talepteki `teslimat` → ziyaretsiz satır; `servisKaydi.teslimat` ve
  `oncekiKayitlar[].teslimat` → ziyaretli satır.

## 3. Rolün birden çok talep türü görmesi (21 Eylül 2026)

Akış: backoffice'te Roller ve Yetkiler ekranında bir rolün "Gördüğü
Talepler"i artık birden çok seçilebiliyor (kullanıcının isteği). Örnek:
servis ve fiyat teklifi taleplerine birlikte bakan bir masa. Hiçbiri
seçili değilse ya da üçü birden seçildiyse rol bütün talepleri görür.
Uygulamada alan `talepTurleri` (dizi); tek türlü eski kayıtlar okunurken
çevriliyor (`src/backoffice/veri.js` → `rolunTurleri`).

- **Bugünkü şema tek tür tutuyor:** `erisim.Rol.TalepTuruKodu NULL`
  (FK `kod.TalepTuru`). Birden çok tür için ara tablo gerekiyor.
- **`erisim.RolTalepTuru`:** `erisim.RolIzin` kalıbıyla `RolKimlik`,
  `TalepTuruKodu` → `PK (RolKimlik, TalepTuruKodu)`, FK'ler
  `erisim.Rol (Kimlik)` ve `kod.TalepTuru (Kod)`, sistem sürümlemeli
  (`gecmis.erisim_RolTalepTuru`). Satır yoksa rol bütün talepleri görür.
- **Taşıma:** dolu `erisim.Rol.TalepTuruKodu` değerleri birer satır
  olarak yeni tabloya; ardından sütun, FK'si ve `IX_erisim_Rol_TalepTuruKodu`
  kaldırılır (sürümleme geçici kapatılarak, geçmiş tablosuyla birlikte).
- **Görünür karşılık:** rolün talep listesi süzgeci (`rolunTalepleri`)
  "türü listede VEYA masası listede" kuralıyla çalışıyor; sunucudaki
  sorgu da aynı kuralı uygulamalı.
- **Tohum:** `tools/vt/tohum-uret.mjs` (B03) bugün tek türü sütuna
  yazıyor; varsayılan rollerden biri birden çok tür alırsa üretim
  "veritabanında yeri yok" diye duruyor. Tablo gelince B03 satırları ona
  yazacak.

## 4. Geçmiş işlemde parçanın görseli (22 Eylül 2026)

Kullanıcının kararı: yedek parça kataloğu değişirse geçmiş işlemlerdeki
parça kodu, adı ve **görseli** değişmemeli. Kod ve ad şemada zaten o
günün hâliyle satıra yazılıyor (`talep.ParcaSatiri.ParcaAdi`,
`talep.ZiyaretParcaSatiri.ParcaAdi`). Görsel için yer yok:
`katalog.Parca.GorselVar` yalnız "görseli var mı" diyor ve sistem
sürümlemesi resmin kendisini değil bu biti saklıyor.

Uygulamada parça satırı o günkü görselin dosya adını taşıyor (`gorsel`;
`src/lib/parcaKatalogu.js` → `fiyatGoruntusu`,
`src/servis/ekranlar/ParcaSec.jsx`, `src/servis/ekranlar/SiparisVer.jsx`)
ve ekranlar resmi bugünkü katalogtan değil oradan okuyor
(`src/components/ParcaResmi.jsx`). Sınaması AK-19.

- **Görsel dosyası değişmez olmalı.** Sunucu görseli hiçbir zaman
  ezmiyor ve silmiyor: resmi değişen parçanın yeni resmi yeni adla
  (`<kod>.<içerikten 8 hane>.webp`) yazılıyor, eski ad eski resmi
  göstermeye devam ediyor (`sunucu-taklidi/fiyat-listesi-yayini.mjs`,
  sınaması `tools/fiyat-listesi-okuma-sinamasi.mjs`). Gerçek sunucu da
  bu kuralı uygulamalı; dosyalar nesne deposuna taşınırsa anahtarlar
  yine değişmez olmalı.
- **`katalog.FiyatListesiSatiri.GorselDosyasi nvarchar(260) NULL`:**
  o listede parçanın gösterdiği dosya. Satırlar yalnız eklendiği için
  her liste kendi resmini saklıyor.
- **`talep.ParcaSatiri.GorselDosyasi` ve
  `talep.ZiyaretParcaSatiri.GorselDosyasi nvarchar(260) NULL`:** satırın
  yazıldığı günkü dosya. `NULL` iki anlama gelmemeli: sütun eklenmeden
  önceki satırlar için ayrı bir işaret (ya da taşımada
  `FiyatListesiSatiri`'ndan doldurma) düşünülmeli; uygulamada alan hiç
  yoksa resim bugünkü katalogtan bulunuyor, `null` ise "o gün görseli
  yoktu".
- **Alternatif:** satır `FiyatListesiKodu` ile listenin satırına
  bağlanırsa (`ParcaTalebiAyrinti.FiyatListesiKodu` zaten var) görsel
  oradan okunabilir; ama servis kaydının satırı listeye bağlı değil ve
  sipariş fiyatı servis fiyatı. Satıra yazmak iki yolu da kapatıyor.

## 5. Servis hizmet ücreti: servise ve ürüne göre tarife (23 Eylül 2026)

Kullanıcının isteği: km ve saat ücreti backoffice'ten değişsin; bütün
servislere genel ücret, istenen servise özel ücret, "makine bazında da
ayarlanabilse iyi olur". Uygulama: `src/lib/servisTarifesi.js` (hesap),
`backoffice/veri.js` → `hizmetTarifesiGetir`, `genelTarifeyiKaydet`,
`servisTarifesiniKaydet`; sınaması AK-21.

`hakedis.Tarife` bugün yalnız `MarkaKodu` boyutunu taşıyor. Gereken:

- **`ServisKimlik uniqueidentifier NULL` → `servis.Servis`** ve
  **`UrunKimlik uniqueidentifier NULL` → `katalog.Urun`** (makine =
  ürün modeli; seri numarasına ücret yazılmıyor).
- **Açık tarife tekilliği dört katmanda:** `(KalemTuruKodu,
  ParaBirimiKodu)` genel; `+ UrunKimlik`; `+ ServisKimlik`;
  `+ ServisKimlik + UrunKimlik` — her biri `GecerlilikBitisTarihi IS
  NULL` ve boş olabilen anahtar için `IS NULL / IS NOT NULL` filtreli
  ayrı dizin (tasarim.md E-kuralı, CD-UX-NULL).
- **`HakEdisHesapla` okuma sırası (1.9.4) değişir:** her kalem AYRI
  AYRI, en özel satır geçerli: servis + ürün → servis → ürün → genel
  (marka boyutu her katmanın içinde, bugünkü gibi önce marka sonra
  boş). Servis katmanı ürünün önünde: servise özel ücret o servisle
  yapılmış anlaşma, genel tarifedeki ürün satırı o serviste geçmez
  (gerekçesi `servisTarifesi.js` başında). Uygulamadaki `tarifeCoz`
  aynı sırayı uyguluyor; sınaması AK-21 5. ve 6. adım.
- **Ziyaret km ücretini de taşımalı mı?** Uygulama kayda `kmUcreti` ve
  `saatUcreti` yazıyor (tarife değişince eski hak ediş değişmesin).
  Veritabanında aynı iş tarifenin tarih aralığı ve
  `HakEdisKalemi.BirimTutar` ile görülüyor; ayrı sütun gerekmez.
- **"Özel ücretler de değişsin"** (genel ücret değişirken): değişen
  kalemin açık servis satırlarına bitiş tarihi yazılır; yeni satır
  açılmaz. Değişmeyen kalemin servis satırına dokunulmaz.
- **Bildirim:** ücreti değişen servise `bildirim.Bildirim` satırı,
  `TurKodu = N'hesap'` (talebe bağlı olmayan servis bildirimi; kod
  listesine eklenmeli), `MetinAnahtari = N'tarife'`, değerler JSON'da
  kalem kalem eski ve yeni tutar.

## 6. Servise özel yedek parça iskontosu (23 Eylül 2026)

Kullanıcının isteği: servislere genel ya da servise özel iskonto; oran
Servisim'in sipariş özetinde görünsün, değişince servise bildirim
gitsin. Uygulama: `src/lib/servisFiyat.js` (`iskontoCoz`),
`backoffice/veri.js` → `parcaIskontosuGetir`, `genelIskontoyuKaydet`,
`servisIskontosunuKaydet`; siparişi `servisParcaSiparisi` doğruluyor;
sınaması AK-22.

- **Genel oran bugünkü yerinde:** `katalog.Marka.ServisIskontoOrani`
  (boşsa `sistem.Ayar` `ServisParcaIskontoOrani`, katalog.MarkaKurallari).
  Uygulama rolünün `katalog.*` yazma izni yok (V0015) — parça
  düzeltmesiyle aynı veritabanı kararı gerekiyor.
- **Servise özel oran için tablo yok:** `servis.ParcaIskontosu`
  (`ServisKimlik`, `MarkaKodu`, `IskontoOrani decimal(7,4) CK 0..0,9`,
  `GecerlilikBaslangicTarihi`, `GecerlilikBitisTarihi`, sistem sürümlü)
  ve açık satır tekilliği `(ServisKimlik, MarkaKodu) WHERE
  GecerlilikBitisTarihi IS NULL`. Siparişin oranı çözülürken önce bu
  tablo, yoksa markanın oranı.
- **Siparişin oranı zaten saklanıyor:** `talep.ParcaTalebiAyrinti.IskontoOrani`
  (uygulamada `parcaFiyat.iskontoOrani`). API siparişi kaydederken
  istemcinin gönderdiği oranı bugünkü oranla karşılaştırmalı; tutmuyorsa
  reddetmeli (uygulama `iskontoDegisti` diye dönüyor, ekran yeni oranı
  okuyup tutarları yeniliyor).
- **Sınır:** oran en çok %90 (`ISKONTO_EN_COK`). Bugünkü CK 0..1'e izin
  veriyor; %100 iskonto bedava parça demek ve o iş garanti kaydından
  yürüyor.
- **Bildirim:** oranı değişen servise `bildirim.Bildirim`,
  `TurKodu = N'hesap'`, `MetinAnahtari = N'iskonto'`, değerler eski ve
  yeni yüzde.

## 7. Duyuru hedeflemesi: bölge, makine ve servis iki alıcıya da (23 Eylül 2026)

Kullanıcının isteği: "Geri Çağırma önemli uyarısını kaldır … Bildirimler
bölgeye, makineye ve servise spesifik gönderilebilsin." Uygulama:
`src/lib/duyuruHedef.js` (kural), `src/lib/servisAtama.js` →
`makinelereServisEkle`, `servisDuyuruBaglami` (bağlam),
`backoffice/ekranlar/Duyurular.jsx` (form); sınaması AK-09 ve
`tools/duyuru-hedef-testi.mjs` bölüm 11b.

Hedef tabloları V0013'te hazır (`HedefIl`, `HedefServis`, `HedefUrun`,
`HedefSeri`); değişen, tabloların NASIL okunduğu:

- **Servis süzgeci müşteriye de uygulanıyor.** `HedefServis` satırı olan
  duyuru, müşteride makinelerinden birine o servis bakıyorsa görünür
  (`servisAtama` zinciri: makineye atanmış servis, yoksa bayinin
  servisi). Makine ve servis süzgeci AYNI makinede aranır: "Konya
  servisinin baktığı Orkinos'ların sahipleri". Görünüm (R06) bunu
  makine tablosu ve atama zinciri üzerinden çözmeli.
- **Makine süzgeci servise de uygulanıyor.** `HedefUrun` / `HedefSeri`
  satırı olan duyuru, serviste baktığı makinelerden en az biri tutuyorsa
  görünür.
- **Servisin bölgesi:** `HedefIl` serviste servisin ili VEYA hizmet
  verdiği illerden biriyle eşleşir (servis kaydındaki bölge listesi).
- **Açıklama metinleri eskidi** (Türkçe olduğu için Codex'ten geçerek
  güncellenecek): `HedefServis` "Servise giden duyurunun…", `HedefIl`
  "serviste servisin ili", `HedefSeri` "(ör. geri çağırma)",
  `Duyuru.HedefKitleKodu` "Geri çağırma alt türü yalnız servise gider".
- **Geri çağırma yeni yayınlanmıyor.** `CK_…AltTurKodu <> 'geriCagirma'
  OR HedefKitleKodu = 'servis'` eski kayıtlar için yerinde kalabilir;
  `kod.DuyuruAltTur` satırı silinmemeli, yeni kayıtta seçtirilmemeli
  (ör. `Yayinlanabilir bit` sütunu).

## 8. Bakiyeden ödemede ek iskonto (24 Eylül 2026)

Kullanıcının isteği: "Servisim'de yedek parça siparişlerinde bakiyeden
düşsün seçeneği ile yapılan siparişlerde ek indirim uygulayabilelim."
Uygulama: `src/lib/servisFiyat.js` (`bakiyeIskontosu`, `siparisTutari`),
`backoffice/veri.js` → `bakiyeIskontosuGetir`, `bakiyeIskontosunuKaydet`;
siparişi `servisParcaSiparisi` doğruluyor, cariden düşümü `talepKapat`
yapıyor; oran backoffice'te Yedek Parça Kataloğu → Servis iskontosu
kartında; sınaması AK-23.

Kural: servis siparişini cari bakiyesinden öderse, servis iskontolu KDV
hariç ara toplamdan bir oran daha düşülür; KDV kalan tutardan hesaplanır.
Satır fiyatları değişmez, ek iskonto sipariş düzeyinde tek satırdır.
Tek oran, bütün servislere; servise özel katmanı yok. Oran 0 ise kapalı
(başlangıç değeri 0).

- **Oranın yeri:** genel servis iskontosuyla aynı düzeyde —
  `katalog.Marka.BakiyeIskontoOrani decimal(7,4) NULL` (CK 0..0,9),
  boşsa `sistem.Ayar` `BakiyeIskontoOrani` (katalog.MarkaKurallari ve
  `gorunum.GecerliAyar` zinciri, `ServisParcaIskontoOrani` ile aynı
  düşüş sırası). `katalog.*` yazma izni kararı §6 ile aynı (V0015).
- **Siparişin kendi oranı ve tutarı:** `talep.ParcaTalebiAyrinti`'ye
  `BakiyeIskontoOrani decimal(7,4) NULL` ve `BakiyeIskontoTutari
  decimal(18,2) NULL` (uygulamada `parcaFiyat.bakiyeIskontoOrani`,
  `bakiyeIskontoTutari`). İkisi birlikte boş ya da birlikte dolu; dolu
  ise `OdemeYontemiKodu` bakiye olmalı (CK). `AraToplam` ve
  `GenelToplam` ek iskontolu değerler; `CK_…_Toplam` (GenelToplam =
  AraToplam + KdvTutari) olduğu gibi geçerli.
- **API oranı doğrulamalı — §6'daki kuralın aynısı:** siparişi
  kaydederken bakiyeden ödenen siparişin taşıdığı oran bugünkü oranla
  aynı olmalı (taşımıyorsa 0 sayılır); faturayla ödenen sipariş ek
  iskonto taşıyamaz. Tutmuyorsa reddedilir (uygulama `iskontoDegisti`
  diye dönüyor, Servisim oranı yeniden okuyup tutarları yeniliyor).
- **Cari düşüm:** parça gönderilip talep kapanınca borç olarak
  `GenelToplam` (ek iskontolu, KDV dâhil) yazılır; ek iskonto ayrıca
  düşülmez.
- **Bildirim:** oran değişince BÜTÜN servislere `bildirim.Bildirim`,
  `TurKodu = N'hesap'`, `MetinAnahtari = N'bakiyeIskonto'`, değerler eski
  ve yeni yüzde. Aynı oran yeniden kaydedilirse bildirim gitmez.
