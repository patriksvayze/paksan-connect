# Uygulamadan gelen veritabanı tasarımı ekleri

18 Eylül 2026'da uygulamaya iki yeni akış girdi (21 Eylül'de üçüncüsü, 22 Eylül'de dördüncüsü, 23 Eylül'de beşincisi, altıncısı ve yedincisi, 24 Eylül'de sekizincisi, dokuzuncusu ve onuncusu, 25 Eylül'de on birincisi ve on ikincisi eklendi). Hepsi bugün
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
- **Ziyaret ücretini kendisi taşımalı (24 Eylül 2026'da değişti).**
  Uygulama kayda `kmUcreti` ve `saatUcreti` yazıyor ve bu ücret artık
  servisin onay penceresinde GÖRDÜĞÜ ücret (§9): PAKSAN ücreti o sırada
  değiştirdiyse o günün tarife satırıyla tutmayabilir. Önceki karar
  ("tarifenin tarih aralığı yeter, ayrı sütun gerekmez") bu yüzden
  geçerli değil. `HakEdisHesapla` bugün tarifeyi ziyaretin tamamlandığı
  TAKVİM GÜNÜNE göre yeniden seçiyor (R05) ve her PAKSAN düzeltmesinde
  yeniden çalışıyor; aynı gün eklenen bir tarife satırı gönderilmiş
  kaydı yeniden fiyatlar. Gereken: ücret kayıt anında §9'daki tekliften
  alınıp `HakEdisKalemi.BirimTutar`'a (ve `TarifeKimlik`'e) yazılır;
  düzeltme süreyi ve km'yi değiştirir, BİRİM TUTARI o satırdan yeniden
  kullanır, tarifeye yeniden bakmaz.
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
  (uygulamada `parcaFiyat.iskontoOrani`). Bu oran servisin onay
  penceresinde gördüğü oran; bugünkü oranla tutmayabilir (§9). Önceki
  kural ("bugünkü oranla tutmuyorsa reddet") 24 Eylül 2026'da
  kullanıcının kararıyla kaldırıldı. API oranı istemciden değil, §9'daki
  tekliften alır.
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
- **Oran tekliften gelir — §6'daki kuralın aynısı:** bakiyeden ödenen
  siparişin ek oranı servisin onay penceresinde gördüğü oran (§9); bugünkü
  oranla karşılaştırılmaz. Faturayla ödenen sipariş ek iskonto
  TAŞIYAMAZ — bu tazelik değil kuralın kendisi; uygulama
  `faturayaEkIndirim` diye reddediyor.
- **Cari düşüm:** parça gönderilip talep kapanınca borç olarak
  `GenelToplam` (ek iskontolu, KDV dâhil) yazılır; ek iskonto ayrıca
  düşülmez.
- **Bildirim:** oran değişince BÜTÜN servislere `bildirim.Bildirim`,
  `TurKodu = N'hesap'`, `MetinAnahtari = N'bakiyeIskonto'`, değerler eski
  ve yeni yüzde. Aynı oran yeniden kaydedilirse bildirim gitmez.

## 9. Onayda görülen tutar bağlayıcı: süreli fiyat teklifi (24 Eylül 2026)

Kullanıcının kararı: "sipariş verildiği zamanki tutar üzerinden
ücretlendirilmeli müşteri veya servis." Servis parça siparişinde ve
servis kaydında (hak ediş) servisin onay penceresinde gördüğü tutar
geçer; PAKSAN oranı ya da ücreti tam o sırada değiştirse de. Uygulama:
`src/lib/servisFiyat.js` → `ONAY_TUTAR_SURESI` (30 dakika),
`onayTazeMi`; `backoffice/veri.js` → `servisParcaSiparisi`,
`servisKaydiGonder`; Servisim tutarı onay penceresi açılırken yeniden
okuyor (`SiparisVer.jsx`, `ServisKapanisi.jsx`); sınaması AK-21 11.
adım, AK-22 3. adım, AK-23 5., 6., 8. adım.

Uygulamada istemci tutarı ve okuma anını (`parcaFiyat.fiyatZamani`,
`servisKaydi.ucretZamani`) kendisi gönderiyor. Veri katmanı bugünküyle
tutmayan değeri iki şartla kabul ediyor: okuma anı 30 dakikadan yeni ve
değer O ANDA gerçekten geçerliydi. İkincisi için oranın ve ücretin
önceki hâlleri, bittikleri anla birlikte son 30 dakika tutuluyor
(`panelIcerik.ucretGecmisi`, bkz. `veri.js → icerikAlaniYaz`,
`okunduguAnkiIcerik`); yoksa taze okuma anı taşıyan her rakam geçerdi.
Veritabanında bu geçmişe gerek yok: `katalog.Marka` ve önerilen
`servis.ParcaIskontosu` sistem sürümlü, `hakedis.Tarife` geçerlilik
aralıklı; o anın değeri oradan okunur. Bu kontrol yalnız demo için
yeterli: veri katmanı bugün servisin telefonunda çalışıyor. Sunucuda
istemcinin saatine, oranına ve toplamına güvenilmez:

- **Teklif tablosu:** `talep.FiyatTeklifi` (`Kimlik`, `ServisKimlik`,
  `TurKodu` — parça siparişi / servis kaydı, `DegerlerJson` — servis
  iskonto oranı, ek oran, fiyat listesi kodu ya da km ve saat ücreti ve
  hangi tarife satırından geldikleri, `VerilmeZamani`,
  `SonGecerlilikZamani` = verilme + 30 dakika, `KullanilmaZamani NULL`).
  Servisim onay penceresini açarken teklifi ister ve penceredeki tutarı
  onunla hesaplar.
- **Gönderim teklif kimliğiyle:** API teklifi okur; servis aynı mı,
  süresi geçmemiş mi, kullanılmamış mı bakar. Tutarı KENDİSİ hesaplar:
  fiyat listesinin satırları × teklifin oranları, KDV; istemcinin
  gönderdiği toplamlara bakmaz. Teklif kullanıldı diye işaretlenir; aynı
  teklifle ikinci gönderim ikinci kayıt açmaz (çift dokunuş).
- **Kayıtta:** `talep.ParcaTalebiAyrinti.FiyatTeklifKimlik` ve
  `talep.ServisZiyareti.FiyatTeklifKimlik` (NULL; teklifsiz eski
  kayıtlar için). Uygulamanın `fiyatZamani` / `ucretZamani` alanlarının
  karşılığı bu kimlik (eşlemede `yok`).
- **Süresi geçen teklif:** gönderim reddedilir; Servisim yeni teklif
  alıp güncel tutarı gösterir ve yeniden onay ister (uygulamadaki
  `iskontoDegisti`, `ucretDegisti`).

Aynı günün bulguları (karar bekleyenler; uygulamada değişmedi):

- **Müşteri parça talebinde son tutar.** tasarim.md 1.7.4 PAKSAN'ın
  sipariş sonrası "KDV dahil son tutarı" yazmasını (`OdenecekTutar`) ve
  müşterinin onu ödemesini öngörüyor. Uygulamada müşteri dekontu
  talepten ÖNCE yüklüyor ve backoffice onu siparişin tutarıyla
  karşılaştırıyor; kullanıcının kararı da gördüğü tutarın geçmesi.
  `OdenecekTutar` yalnız kargo ve gönderilemeyen satırlar için
  değişebilmeli: gönderilen satırların sipariş anındaki fiyatları + KDV
  + `KargoTutari`. Kargonun kimden alındığı da açık (Connect
  "kargo teslimde kuryeye ödenir" diyor).
- **Kısmi gönderim — KARARLANDI ve uygulandı (24 Eylül 2026,
  kullanıcının kararı: "kapanışta gönderilen parçalar işaretlensin").**
  Kapanışta personel gönderilen satırları işaretliyor; bakiyeden ödenen
  siparişte yalnız onların tutarı düşülüyor, kalanı "Kalan Parçaları
  Gönder" ile gittiği gün (sınaması AK-24). Uygulama deftere her
  gönderimde FARK yazıyor: gönderilenlerin toplamı eksi önce düşülen.
  Veritabanında talep başına TEK etkin borç var
  (`UX_…_ParcaSiparisiBorcu`, V0012): ikinci gönderimde önceki borç
  geri alınıp (`GeriAlinmaZamani`) toplam yeniden yazılmalı ya da indeks
  sevk kimliğiyle genişletilmeli — sunucu aşamasında seçilecek. Her
  gönderim bir `talep.ParcaSevki` satırı (`ZiyaretKimlik` boş); hangi
  sipariş satırının hangi sevkte gittiği için `talep.ParcaSevkiSatiri`
  (`SevkKimlik`, `ParcaSatiriKimlik`, `Adet`) gerekiyor.
- **Kapanmış bakiye siparişinin iptali — KARARLANDI ve uygulandı (24
  Eylül 2026, kullanıcının kararı: "İptal edilen taleplerde bakiyeden
  düşüldüyse düşülen tutar bakiyeye geri eklenmeli").** Uygulama iptalde
  siparişe düşülmüş NET tutarı tek bir alacak hareketiyle geri yazıyor;
  hareket talebin kimliğini taşıyor (`veri.js → siparisIadesiniYaz`,
  sınaması AK-25). Veritabanında karşılığı: siparişin etkin
  `parcaSiparisiBorcu` satırları geri alınır (`GeriAlinmaZamani`) ya da
  her birine `duzeltmeAlacak` yazılır (`DuzeltilenHareketKimlik`) —
  uygulamanın tek alacak satırı, kısmi gönderimde iki borcun toplamı
  olabildiği için birebir karşılık değil. Seçim sunucu aşamasında.
  Servis kendi siparişini yalnız "Yeni" iken iptal edebiliyor
  (`servisSiparisiniIptalEt`); o anda borç yok, iade de yok. Faturalı
  siparişte uygulama para yazmıyor: fatura kesildiyse iade faturası
  LOGO'da.
- **Kalan parçaların iptali — KARARLANDI ve uygulandı (24 Eylül 2026,
  kullanıcının onayı).** Kısmen gönderilmiş siparişin bekleyen satırını
  kapatmak için siparişin tamamını iptal etmek gerekiyordu. Backoffice
  artık yalnız seçilen bekleyen satırları siparişten çıkarıyor
  ("Kalan Parçaları İptal Et"; sebep ve açıklama servise gidiyor).
  Bekleyen satırın borcu henüz yazılmadığı için cariye bir şey
  yazılmıyor; siparişin ödenecek tutarı iptal edilen pay kadar iniyor
  ve bakiyeden ayrılan kısım da onunla (`veri.js → kalanParcalariIptalEt`,
  `siparisHesabi → net`; `lib/servisFiyat.js → siparisNetTutari`;
  sınaması AK-26). Uygulamada talepte `kalemIptalleri: [{no, tarih,
  personel, neden, aciklama, satirlar}]`. Veritabanında satır silinmez:
  `talep.ParcaSatiriIptali` (`ParcaSatiriKimlik`, `Neden`, `Aciklama`,
  `YapanAdi`, `OlusmaZamani`) ya da `talep.ParcaSatiri`'na `IptalZamani`
  + `IptalNedeni`; `OdenecekTutar` iptal edilmeyen satırlardan hesaplanır.
  Faturalı siparişte uygulama para yazmıyor, fatura düzeltmesi LOGO'da.
- **Bekleyen bakiye siparişi bakiyeden ayrılıyor (24 Eylül 2026).**
  Borç parça gönderilince yazıldığı için aynı bakiyeyle birkaç sipariş
  verilebiliyordu. Uygulama gönderilmeyi bekleyen tutarı "ayrılan"
  sayıyor, yeni bakiye siparişi kullanılabilir kısma bakıyor
  (`bakiyeDurumu`; ekranda da, `servisParcaSiparisi`'nde de).
  Veritabanında ayrı bir sütun gerekmiyor: ayrılan, açık bakiye
  siparişlerinin `ParcaTalebiAyrinti` toplamından etkin borçları
  çıkararak sorguyla bulunur; sunucu siparişi kaydederken aynı sorguyu
  kilitle (UPDLOCK) yapmalı, yoksa iki cihazdan aynı anda verilen
  sipariş ikisi de geçer.
- **Fiyatı listede olmayan parça.** Servis siparişinde fiyatı olmayan
  parça toplama girmiyor; Servisim "bu parçanın tutarını PAKSAN
  bildirecek" diyor. Faturalı siparişte fatura bunu karşılıyor; bakiyeden
  ödenen siparişte ise borç yalnız fiyatlı satırlardan yazılıyor ve eksik
  parçayı sonradan düşecek bir yol yok. Karar: böyle bir siparişte
  "Bakiyemden Düşülsün" kapatılsın mı, yoksa PAKSAN parçanın tutarını
  ayrı bir borç satırı olarak mı yazsın?
- **Hak ediş vergileri.** Onay adımı KDV, tevkifat ve stopajı o günkü
  ayardan yazıyor (tasarim.md); Servisim ise servise yol + işçilik
  gösteriyor. Vergilerin hangi an sabitleneceği ve servise net mi brüt
  mü gösterileceği karar bekliyor.

## 10. Seri numarası olmadan açılan servis talebi (24 Eylül 2026)

Kullanıcının kararı: Servisim'in elle kaydında seri numarası zorunlu
olmasın, ama yazılmadıysa makinenin modeli ve tahmini üretim yılı
alınsın (amaç: LOGO'dan seriyle makineyi bulmak; seri yoksa en azından
hangi model olduğu bilinsin). Uygulama: `src/servis/ekranlar/ElleKayit.jsx`
→ "Seri Numarası Yok" seçeneği; talepte `makine: { id, productId,
seriYok: true, tahminiYil }`, `serial` yok. Makine defterine satır
açılmıyor (defter seriyle tutuluyor), garanti hesaplanmıyor. Servis
kaydı ekranı seriyi bir daha sormuyor, yerinde "Yok" yazıyor
(kullanıcının bildirdiği hata, aynı gün: servis "yok" demişti;
`lib/servisKaydi.js → eksikAlanlar`). Seri başka bir yoldan gelirse
talebin makinesi seriyle tamamlanıyor ve iki işaret düşüyor
(`veri.js → servisKaydiGonder`). Sınaması AK-27.

Veritabanında `talep.Talep.MakineKimlik` makine satırına bağlı; serisiz
makinenin satırı yok. İki yol:

- `talep.Talep`'e `UrunKodu` (NULL, `katalog.Urun`'a FK) ve
  `TahminiUretimYili` (smallint NULL) — `MakineKimlik` boşken dolu
  olmalı (CHECK). Makine defteri temiz kalır; sonradan seri bulunursa
  `MakineKimlik` yazılır, iki sütun kalabilir (tarihçe).
- Ya da `makine.Makine`'de `SeriNo` NULL satır — defterin "bir seri, bir
  satır" kuralını (UX) filtreli indekse çevirmeyi gerektirir; önerilmez.

Eşlemede iki alan `yok` (bkz. `veritabani/uygulama-eslesmesi.mjs`).

## 11. Fiyat teklifinde makine yok (25 Eylül 2026)

Kullanıcı sınaması (Y1): Connect'in teklif formu makine kutusu çizmediği
hâlde çiftçinin ilk makinesini kayda yazıyordu ("Süper Yunus teklifi ·
Makine: Orkinos 1270"). Artık yazmıyor (`lib/talepOlustur.js`); 25 Eylül
öncesi kayıtlar okurken ayıklanıyor, depodaki kayıt yeniden yazılmıyor
(`lib/talep.js → makinesizTeklif`; backoffice ve Connect aynı işlevden
geçiyor). Sınaması AK-32.

Veritabanında taşımada fiyat teklifi satırının `talep.Talep.MakineKimlik`
alanı NULL yazılır (eşlemenin notu). Sunucu aşamasında kuralın kendisi
tabloya konmalı:

    CONSTRAINT CK_talep_Talep_TeklifMakinesiz
        CHECK (TurKodu <> N'satinalma' OR MakineKimlik IS NULL)

SQL betiğine bugün eklenmedi: tarayıcıdaki eski kayıtlar taşınmadan önce
ayıklanmalı, yoksa taşıma bu kısıtta durur.

## 12. Makineye servis atama ayrı yetki: rol geçişi (25 Eylül 2026)

Kullanıcı sınaması (tasarım sorusu, karar): makineye servis atama
`servisDuzenle`'den ayrılıp `makineAtama` oldu (`src/data/yetkiler.js`).
Tarayıcıda depodaki eski rol bir kez taşınıyor (`veri.js →
rolIzinleriniTasi`, `izinSurumu` 3). Veritabanında izin satırları
`erisim.RolIzin`'de; tohum (T03, B03) yeni izni ve varsayılan rolleri
zaten yazıyor. Canlıya taşınırken, `servisDuzenle` izni olan her role
`makineAtama` satırı ekleyen tek seferlik bir geçiş gerekecek; yoksa dün
atama yapabilen rol yetkisini sessizce kaybeder. Eşlemedeki notu:
`veritabani/uygulama-eslesmesi.mjs` → `panelIcerik.roller[].izinSurumu`.
Sınaması AK-08.

## 13. KVKK onay olayları ve Servisim'in gizlilik kabulü (29 Eylül 2026)

**Connect.** Hesap artık her kararı ayrı satır olarak taşıyor
(`hesap.onaylar.olaylar[]`: metin, seçim, sürüm, dil, kanal, istemci
zamanı, uygulama sürümü; `lib/rizaKaydi.js`). Karşılığı zaten var:
`kvkk.RizaOlayi`. Eşleme satırları `veritabani/uygulama-eslesmesi.mjs →
hesap.onaylar.olaylar[]`. Yeni kanal kodu `connectGuncelleme` (metin
sürümü değişince açılışta yeniden onay) `kod.RizaKanali` listesine
eklendi (`tohum/kaynak/kod-adlari.json`, T01 yeniden üretildi). Metin
sürümü 1.1 (T07 yeniden üretildi; 1.0 satırları veritabanında kalıyor,
betik yalnız ekliyor).

**Servisim.** Servis ilk girişte iki metni kabul ediyor
(`servisKabulleri[]`, `lib/servisGizlilik.js`). Veritabanında yeri
YOK: `kvkk.RizaOlayi.HesapKimlik` NOT NULL ve yalnız `musteri.Hesap`'a
bağlı. Sunucu aşamasında iki yoldan biri:

- (a) `HesapKimlik` boş olabilir, yanına `KullaniciKimlik`
  (`erisim.Kullanici`) eklenir, ikisinden tam biri dolu olmalı (CHECK);
- (b) ayrı tablo `kvkk.ServisKabulOlayi` (servis, giriş, metin, sürüm,
  kanal, zaman).

Her iki yolda: `kod.RizaMetni` listesine `servisAydinlatma`,
`servisGizlilik`; `kod.RizaKanali` listesine `servisimIlkGiris`,
`servisimGuncelleme`; Servisim metinleri `kvkk.MetinSurumu`'na (T07
bugün yalnız Connect'in `METINLER` listesini okuyor). `tasarim.md`
kvkk şemasının kullanıcıları arasına Servisim yazılmalı. Karar
verilince eşlemedeki `servisKabulleri` boşluğu kapanır.
