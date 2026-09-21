# PAKSAN Veritabanı Tasarımı — Kurallar

**Tarih:** 16 Eylül 2026
**Durum:** Bağlayıcı kural kaynağı. Tablo katalogları (`veritabani/tasarim/katalog-01…08-*.md`), SQL betikleri (K, V, R, T, B, O, S) ve `tools/vt/` denetimleri bu belgeye uyar.
**Öncelik:** Bu belge > `veritabani/tasarim-taslak-v1.md` (ilk taslak, İngilizce çalışma notu) > plan (`serene-tickling-possum.md`, "PAKSAN veritabanı temeli" bölümü). Bu belgede yazılmayan konu taslakta nasıl ise öyle uygulanır; taslaktaki bir ad ya da kural bu belgeyle çelişirse bu belge geçerlidir. İnceleme bulgularından biri bu belgede farklı karara bağlanmışsa (Bölüm 0.5) yine bu belge geçerlidir; katalog yazarı bulguyu yeniden yorumlamaz.
**Kaynaklar:** KOD-SISTEMI.md, SUNUCU-VE-VERITABANI.md, PLAN-COKLU-MARKA.md, CLAUDE.md; `src/backoffice/veri.js`, `src/context/AppState.jsx`, `src/screens/*`, `src/servis/**`, `src/lib/*`, `src/data/*`, `src/marka/**`; 72 geçerli inceleme bulgusu (Bölüm 0.6).

**Bu belge yazılırken yerel SQL Server 2025'te (yalnız tempdb, geçici nesneler silindi) sınananlar:**

| Konu | Sonuç |
|---|---|
| Aksansız arama ifadesi (Bölüm 1.4.3) | `IŞIK Makina → isik makina`, `KİLİS Servis → kilis servis`, `Diyarbakır → diyarbakir`, `Kâhta Çiftçi → kahta ciftci`, `İzmir Çiftçi → izmir ciftci`; ASCII dışı harf kalmadı; deterministik, dizinlenebilir, sonuç `Latin1_General_100_BIN2`; `LIKE N'%isik%'` ve `N'%izmir ciftci%'` birer satır buldu |
| `sistem.NumaraAl` gövdesi (Bölüm 1.7.2) | Sayaç satırı olmayan 300 yıl, iki eşzamanlı oturum, dış işlem + `XACT_ABORT ON`, işlem başına iki çağrı: 1200 farklı numara, 0 hata, 0 kilitlenme |
| NULL'da CHECK (Bölüm 1.17.6) | `CHECK (Adet > 0 OR (Adet IS NULL AND KatalogDisi = 1))` adetsiz **katalog** satırını kabul etti (NULL karşılaştırması UNKNOWN, UNKNOWN geçer). Bölüm 0.4'teki iki CHECK aynı satırı `547` ile reddetti |
| Sistem sürümlü yetki tablosunda hesaplanmış kolonlu bileşik FK (Bölüm 1.17.3) | Açık atama varken yetkiyi bitirme `547`; atama bitince yetki biter; bitmiş yetkiye atama `547`; yetki yeniden verilince atama geçer; geçmiş tablosu satır yazdı |
| Veritabanı düzeyinde `DENY INSERT, UPDATE, DELETE` + sahiplik zinciri (Bölüm 4.2) | Doğrudan `INSERT` `229`; aynı sahipli prosedür üzerinden yazma geçti; tablo değişkenine yazma etkilenmedi |
| `sistem.Ayar` tür CHECK'i ve kapsamlı tekillik (Bölüm 1.15.5) | `tamsayi` türüne `N'72 saat'` `547`; ikinci genel satır `2601`; aynı anahtarın genel + marka + şirket satırları birlikte geçti |
| Boş olabilen hesaplı filtreli tekillik (Bölüm 1.17.5) | `WHERE … AND HesapKimlik IS NOT NULL` ile iki oturumsuz talep geçti, aynı hesaba ikinci açık talep `2601` |
| `yardim.Sadelestir` başvuru uygulaması (Bölüm 3.1.4) | `srv-26-00123 → SRV2600123`; `ork1270-2024-00157 → ORK1270202400157`; `ıpak-2024-001 → IPAK2024001`; `0532 123 45 67`, `+90 (532) 123-45-67`, `905321234567`, `00905321234567`, `5321234567` → `+905321234567` / `5321234567`; `ızmır.merkez → izmir.merkez` |
| Türkiye saati | `2026-12-31 21:30 UTC → 2027-01-01 00:30` (`'Turkey Standard Time'` sunucuda var) |

---

## 0. Değişiklik özeti

### 0.1 Plan kararlarının işlenmesi

| Taslakta | Bu belgede | Neden |
|---|---|---|
| `kurum.Sirket`, `kurum.BankaHesabi`, `kurum.Personel` | `sirket.Sirket`, `sirket.BankaHesabi`, `personel.Personel` | Plan: şema = iş alanı |
| `kimlik.*` | `erisim.*` | Plan: "kimlik" hem teknik anahtar hem TC kimlik anlamına geliyordu |
| `taraf.Bayi`, `taraf.BayiMarkaYetkisi` | `bayi.Bayi`, `bayi.MarkaYetkisi` | Plan |
| `taraf.Servis`, `ServisFaturaBilgisi`, `ServisBayi`, `ServisBolgesi`, `ServisMarkaYetkisi`, `ServisKullanicisi`, `ServisSifreYardimTalebi` | `servis.Servis`, `servis.FaturaBilgisi`, `servis.BayiBagi`, `servis.Bolge`, `servis.MarkaYetkisi`, `servis.GirisHesabi`, `servis.SifreYardimTalebi` | Plan; `servis.Kullanici` yerine `GirisHesabi`, çünkü şifre `erisim.Kullanici`'da (bulgu: aynı sözcük farklı anlamda) |
| `taraf.LogoCariKarti`, `musteri.Hesap.LogoCariKodu` | `entegrasyon.CariKarti` (hesap, servis ya da bayi; dış sistemden bağımsız) | Bulgular: LOGO adı iş tablolarında; müşterinin ikinci LOGO firmasında cari kodu |
| `rapor.vw_*`, `makine.vw_*`, `kvkk.vw_*` | `gorunum.*`; alan görünümleri öneksiz (`makine.MakineninServisi`) | Plan + bulgu: `vw_` İngilizce kısaltma |
| Kod listelerinde `AdTr`, `AdEn`; katalogda `…Tr`/`…En` çiftleri | `Ad` (Türkçe, satırda) + `kod.Ceviri` ve `katalog.…Cevirisi` tabloları | Plan: yeni dil = satır; bulgu: çeviri tablosu alan adı ve bileşik anahtar taşımalı |
| `kurum.Sirket` tek satır (`Kimlik tinyint CK=1`) | `sirket.Sirket` çok satırlı, birincil anahtar `Kod` (`paksan`) | Plan + bulgu: çok satırlı şirket yarım kalmıştı |
| `yardim`/`yonetim` yalnız planda | Sözleşmeleri Bölüm 3'te; tam davranışları `katalog-08` | Kullanıcının 2. şartı |

### 0.2 Ad değişiklikleri (katalog ve betik yazarları eski adı kullanmaz)

| Eski (taslak) | Yeni | Neden |
|---|---|---|
| [K] içindeki `Sira bigint IDENTITY` | `KayitNo bigint IDENTITY` | Talep numarasındaki sırayla (`00123`) karışıyordu. `Sira` yalnız kod listesi gösterim sırasıdır |
| Aktör grubu `AktorTuruKodu`, `AktorKullaniciKimlik`, `AktorHesapKimlik`, `AktorAdi`; `denetim.IslemKaydi.AktorKimlik`, `AktorRolAdi` | `YapanTuruKodu`, `YapanKullaniciKimlik`, `YapanHesapKimlik`, `YapanAdi`; işlem kaydında da ayrı iki kimlik kolonu ve `YapanRolAdi` | Plan "YapanAdi" diyor; bulgu: işlem kaydı aynı CHECK'i kullanır |
| `sistem.AktorAyarla` | `sistem.YapanAyarla` | Aynı |
| `talep.Not`; `Teklif.Not`, `Kapanis.Not`, `OdemeOnayi.Not`, `MakineServisAtamasi.Not`, `ParcaModel.Not`, `EskiDegerEslesmesi.Not`, `RizaOlayi.Not`, `Ekleme.Not` | `talep.TalepNotu`; `TeklifNotu`, `KapanisNotu`, `OnayNotu`, `AtamaNotu`, `ModelNotu`, `EslesmeNotu`, `RizaNotu`, `EklemeNotu` | `NOT` ayrılmış sözcük; köşeli parantezsiz sorgu `156` verir |
| `destek.Oturum`, `destek.Olay` | `destek.SohbetOturumu`, `destek.SohbetOlayi` | `erisim.Oturum` ile karışıyordu |
| `cografya.Il.PlakaKodu`, `cografya.Ilce.IlceNo`, her yerde `IlceNo`, `KonumIlceNo`; `Ilce.ResmiKod` | `IlKodu`, `IlceKodu`, `KonumIlceKodu`; `ResmiIlceKodu` | Bulgu: `WHERE IlceKodu =` yazan hata almasın |
| `KimlikNoSifreli`, `KimlikNoArama`, `KimlikNoMaskeli`; `KimlikNoTuruKodu (tckn|vkn)`; işlem türü `kimlikNoGoruntulendi` | `TcNoSifreli`, `TcNoOzeti`, `TcNoMaskeli`; `VergiNoTuruKodu (tcNo|vergiNo)`; `tcVergiNoGoruntulendi` | Bulgu: "Kimlik" yalnız teknik anahtar anlamında kalır |
| HMAC eşleştirme kolonları `…Arama binary(32)` (`VergiNoArama`, `IbanArama`) | `…Ozeti binary(32)` (`TcNoOzeti`, `VergiNoOzeti`, `IbanOzeti`) | Taslak özetleri zaten `…Ozeti` adıyla tutuyor (`KodOzeti`, `JetonOzeti`, `IcerikOzeti`, `TanimlayiciOzeti`). `…Arama` yalnız aksansız arama metni kalır; bir ekin iki tipi olursa canlı ad–tip denetimi yapılamaz ve `WHERE TcNoArama = N'…'` hata vermeden 0 satır döner |
| `makine.vw_MakineGuncelSahibi`, `vw_MakineninServisi`, `vw_MakineGarantisi`, `kvkk.vw_GuncelRiza`, `taraf.vw_LogoKoduBekleyenTaraf`, `rapor.vw_Kontrol_*`, `rapor.vw_Talepler`, `vw_HakEdisler`, `vw_Makineler` | `makine.MakineGuncelSahibi`, `makine.MakineninServisi`, `makine.MakineGarantisi`, `kvkk.GuncelRiza`, `gorunum.KontrolLogoCariKoduEksik`, `gorunum.Kontrol…`, `gorunum.TalepListesi`, `gorunum.HakEdisListesi`, `gorunum.MakineKarti`; yeni `makine.MakineninBayisi` | Bulgular |
| `kod.TarafDurumu (logoKoduBekliyor, aktif, pasif)` | `kod.FirmaDurumu (aktif, pasif)` | Bulgu: "LOGO kodu eksik" iki yerden cevaplanıyordu; artık türetilir |
| `entegrasyon.LogoBelgeBagi`, `kod.LogoBelgeTuru`, `talep.TalepLogoBelgesi`, bütün `LogoBelgeBagiKimlik` kolonları | `entegrasyon.BelgeBagi`, `kod.BelgeTuru`, `talep.TalepBelgesi`, `BelgeBagiKimlik` | Bulgu: ikinci ERP/e-fatura iş tablolarına dokunmasın |
| `DonemDokumu.FaturaLogoBelgeBagiKimlik`, `OdemeLogoBelgeBagiKimlik` | Kaldırıldı → `hakedis.DonemDokumuBelgesi` | Bulgu: kısmi ödeme ve yeniden kesilen fatura |
| `denetim.IslemKaydi.Zaman`, `destek.Olay.Zaman`, `erisim.GirisDenemesi.Zaman` | `IslemZamani`, `OlayZamani`, `DenemeZamani` | Zaman kolonu `…Zamani` ile biter (plan kalıbı; canlı ad–tip denetimi) |
| `sistem.Giden.SaglayiciMesajKimligi`, `destek.Olay.BilgiKaydiKimligi` | `SaglayiciMesajNo`, `BilgiKaydiNo` | Dışarıdan gelen metin kimlik; "Kimlik" yalnız `uniqueidentifier` |
| `erisim.SifreSifirlamaJetonu.IsteyenIp` | `IsteyenIpAdresi` | Kısaltma yok |
| `erisim.Oturum.KapanmaNedeni`, `dosya.Dosya.DepolamaSaglayici` | `KapanmaNedeniKodu`, `DepolamaSaglayiciKodu` | Kod kolonu `…Kodu` ile biter |
| `katalog.Marka.GarantiBaslangicEsasi (CK)`, `SeriKurali k(40)` | `GarantiBaslangicEsasiKodu` → `kod.GarantiBaslangicEsasi`, `SeriKuraliKodu` → `kod.SeriKurali` | Plan: bilinmeyen kod yabancı anahtar hatası verir; yeni marka yeni kural = satır |
| `talep.ZiyaretDuzeltmesi.OncekiIscilik`, `YeniIscilik` | `OncekiIscilikTutari`, `YeniIscilikTutari` | Para kolonu `…Tutari` ile biter |
| `sistem.Ortam.Kimlik tinyint CK=1` | `TekSatir bit NOT NULL DEFAULT 1 CHECK (TekSatir = 1)` | `Kimlik` yalnız `uniqueidentifier` |
| `ilce-numaralari.json` | `ilce-kodlari.json` | `IlceKodu` |
| Geçmiş tablosu: plandaki "gecmis şemasında aynı adla" | `gecmis.<sema>_<Tablo>` (taslak A10) | Bulgu: `servis.MarkaYetkisi` ile `bayi.MarkaYetkisi` aynı adı ister, ikinci `CREATE` `2714` verir |
| [E] `EskiKimlik nvarchar(64)` | `EskiKayitNo nvarchar(64)` BIN2 | **Uygulamada değişti (17.09.2026):** eski uygulamanın metin kimliği (`konya-servis`) `uniqueidentifier` değil; "Kimlik yalnız `uniqueidentifier`" kuralı ve `SaglayiciMesajNo`, `BilgiKaydiNo`, `DisKayitNo` emsali. Eski adla canlı ad–tip denetimi (CD-TIP) 9 tabloda hata verirdi |
| `erisim.Kullanici.SifreOzeti`, `musteri.Hesap.SifreOzeti nvarchar(255)`; parametre `@SifreOzeti` | `SifreKaydi nvarchar(255)` BIN2; `@SifreKaydi`; `CK_…_SifreKaydi` | **Uygulamada değişti (17.09.2026):** değer PHC dizgisidir (`$scrypt$…`: yöntem, ayarlar, tuz ve özet), `binary(32)` özet değil; `…Ozeti` eki yalnız `binary(32)` anlamında kalır |

### 0.3 Kural değişiklikleri

| # | Taslak | Yeni kural | Bölüm | Neden (bulgu) |
|---|---|---|---|---|
| K1 | Veritabanı varsayılan harmanlaması `Turkish_100_CI_AS` (görev tanımı da böyle anıyordu) | Veritabanı `Latin1_General_100_CI_AS`; Türkçe insan metni kolonlarına açık `COLLATE Turkish_100_CI_AS` | 1.4.1 | Türkçe harmanlamada nesne adları i/I'ya duyarlı: `select ilkodu from cografya.il`, `KIMLIK`, `iptal` "nesne yok" (`207`/`208`) veriyor; SSMS'te elle arama (2. şart) bozuluyor. İki ayrı bulgu tempdb'de sınadı |
| K2 | `k(n) = varchar(n) BIN2` | `k(n) = nvarchar(n) COLLATE Latin1_General_100_BIN2`; `char/varchar/nchar/text/ntext` hiçbir betikte yok | 1.4.1, 1.5 | nvarchar parametre varchar kolona sessizce çevriliyor (`ızmır.merkez → izmir.merkez`), CHECK işe yaramıyor, giriş araması 0 dönüyor |
| K3 | Arama ifadesi: kolon harmanlamasıyla `REPLACE`, sonra `LOWER`, en son `BIN2` | Önce `COLLATE Latin1_General_100_BIN2`, sonra 18 harf `REPLACE`, sonra `LOWER`, en dışta `CAST(… AS nvarchar(n))` | 1.4.3 | Eski ifade `ı` bırakıyordu; `%isik%` 0 satır |
| K4 | `NumaraAl`: 2627 yakala, yeniden `UPDATE` | `UPDLOCK, HOLDLOCK` + iç işlem; `TRY/CATCH` yok | 1.7.2 | API işleminde `XACT_ABORT ON` ile `3930` |
| K5 | Aktör CHECK'i türleri tek tek sayıyor; `Kullanici.TurKodu CK personel|servis` | "Varsayılan kollu" tek CHECK metni; `Kullanici.TurKodu` FK `kod.AktorTuru` | 1.16 | Bayi paneli onlarca tabloda CHECK değişikliği isterdi |
| K6 | CHECK ve filtreli dizin açık durumları sabit sayıyor (`DurumKodu IN (<6 kod>)`), `satisOldu` literali, hareket yönü denetimsiz | Kod sınıfı gerekiyorsa bayrak satıra kopyalanır, bileşik FK ile doğrulanır | 1.17.1, 1.17.2 | CHECK başka tabloya bakamaz (`1046`); yeni durum V betiği isterdi |
| K7 | `ServisZiyareti`, `FaturaBilgisi`, `BayiAtamasi` CHECK ile tek türe kilitli | `kod.TalepTuruUydusu` + sabit `UyduKodu` kolonu + iki FK | 1.17.4 | "Kurulum" türü ziyaret ve hak ediş alamazdı |
| K8 | Boş olabilen kolonlu filtreli tekillik | Filtrede her boş olabilen anahtar kolon `IS NOT NULL`; NULL'ın anlamlı olduğu yerde ayrı `IS NULL` filtreli ikinci dizin | 1.17.5 | NULL'lar eşit sayılıyor; ikinci oturumsuz TEL talebi `2601` |
| K9 | Büyüyebilecek listeler `CK IN (…)` | Kod tablosu; `CK IN` yalnız Bölüm 1.17.7'deki teknik listelerde | 1.17.7 | WhatsApp kanalı, yeni içe aktarım türü, belge rolü, bayi cihazı V betiği isterdi |
| K10 | `sistem.Ayar` PK `Anahtar`; değer serbest metin | [K] + `SirketKodu`/`MarkaKodu` kapsamı + üç filtreli tekillik + tür CHECK'i; okuma `gorunum.GecerliAyar` | 1.15.5 | Marka/şirket ayarı kurulamıyordu; `N'72 saat'` kabul ediliyordu |
| K11 | YPR numarası talep eklenirken, ama ödeme tutarının doğrulanacağı yer yok | Numara ekleme işleminde; ödeme bilgisi PAKSAN doğrulamasından sonra; doğrulanmış tutar, kargo ve son ödeme tarihi `ParcaTalebiAyrinti`'da | 1.7.4, 1.9.7 | KOD 3.9 pilot engeli; KOD 4.2.1 akışı yazılamıyordu |
| K12 | `ServisHesapHareketi.Tutar` esası tanımsız | Tutar = cari etkisi (KDV dahil, tevkifat ve stopaj düşülmüş, işaretsiz) | 1.9.3 | KDV hariç alacak ile KDV dahil borç aynı bakiyede toplanıyordu |
| K13 | Hak ediş tutarı hem sabit kolonlarda hem kalemde; `NetTutar = yol + işçilik`; tarife yalnız `km` | Tek kaynak `hakedis.HakEdisKalemi`; `NetTutar` ve kalemleri yalnız prosedürler yazar; birim `kod.Birim` | 1.9.4 | İki kaynak ayrışabiliyordu; `diger` kalemi toplama girmiyordu; yeni kalem V betiği isterdi |
| K14 | Para satırlarında şirket yok | `SirketKodu` satır yazılırken sabitlenir; döküm tekilliği ve bağları şirket ve para birimini içerir | 1.9.2, 1.9.5 | Ayrı tüzel kişi markada iki cari karışıyordu; ikinci döküm açılamıyordu |
| K15 | Tohum MERGE her hedef satıra `Aktif = 0`; fiyat listesi MERGE | Katalogda hedef kaynaktaki markalarla sınırlı; kod/coğrafya/izinde kendiliğinden pasifleştirme yok; KVKK metni ve fiyat listesi satırları yalnız ekleme | 5.5 | Veriyle eklenen marka/kod satırları pasifleşiyordu; `5316`; geçmiş fiyat listesi bozuluyordu |
| K16 | Canlı `FULL`, yalnız `WITH INIT` tam yedek | Canlı `FULL` + 15 dakikada bir günlük yedeği; tarih damgalı dosyalar | 1.19.2 | Günlük dosyası sınırsız büyür; tek kopya kalır |
| K17 | Yönetim prosedürü geçici şifre yazar | Tek kullanımlık kod (`erisim.SifreSifirlamaJetonu`); boş özetli hesaba şifre yazmak jeton ya da doğrulama kodu ister | 1.14.4, 3.5 | T-SQL scrypt hesaplayamaz; boş özet hesap ele geçirme penceresi |
| K18 | Saklama süresi yalnız belgede | `sistem.SaklamaUygula`; uygulama rolü bu tablolarda silemez | 1.13.4 | Süreler uygulanamıyordu |
| K19 | Anonimleştirme yalnız hesaplı kişide, dar kapsam | Kapsam genişledi; hesapsız kişi için `yonetim.KisiselVerileriAnonimlestir` | 1.13.5 | Teslimat adresi, destek olayları, giden kuyruğu, IP'ler, hesapsız talepler kalıyordu |
| K20 | SMS kodu ve şifre bağlantısı giden kuyruğunda düz metin; OTP özeti anahtarsız | Kod ya da bağlantı taşıyan `sistem.Giden` satırı gövdesiz (CHECK); `KodOzeti` HMAC | 1.14.3 | 6 haneli kodun anahtarsız özeti anında çözülür |
| K21 | Rapor girişi bütün rapor şemasını okur | Yalnız adı yazılı, kişisel iletişim verisi taşımayan görünümler | 4.2 | Toplu müşteri telefonu indirme |
| K22 | Görünümler UTC gösterir | `…ZamaniTurkiye` ve `…Tarihi` (Türkiye günü) | 1.8, 3.1 | "Bugün/bu ay" 3 saat kayıyordu |
| K23 | Görünümler GUID gizler ama hedef satır seçilemez | `KayitNo` gösterilir; `yonetim` numarasız satırı numara + `KayitNo` ile alır | 3.1.5 | Dekont, hareket, aynı adlı firma seçilemiyordu |
| K24 | Genel "durum değiştir" prosedürü | `TalepDurumunuDegistir`, `TalebiKapat`, `TalebiIptalEt`, `TalebiYenidenAc`; uygulamanın kapıları uygulanır | 3.5 | Onay bekleyen hak edişli talep SSMS'ten kapatılabiliyordu |
| K25 | "Yapan" serbest ad | `@YapanGirisAdi` aktif personel olmalı; kaynak `yonetim`; `ORIGINAL_LOGIN()` ve `HOST_NAME()` kayda | 3.5.1 | Kim yaptığı doğrulanamıyordu |
| K26 | `Personel.Aktif` + `Kullanici.Aktif`; `Servis.DurumKodu` zincirde bakılmıyor | Giriş açıklığının tek kaynağı `erisim.Kullanici.Aktif`; personel çalışıyor mu `AyrilmaZamani IS NULL`; zincir yalnız `aktif` servis | 1.13.1, 3.2 | "Giriş açık mı" iki cevaplıydı |
| K27 | Yetki bitince atama ve talep FK'dan geçiyor | Atamada hesaplanmış kolonlu bileşik FK; talepte tetikleyici | 1.17.3, 4.4 | Yetkisi bitmiş servise atama kabul ediliyordu |
| K28 | Fiyat listesi hem tohum hem içe aktarım | Tek sahip depo; her liste kendi arşiv dosyası; satırlar yalnız eklenir | 5.2, 5.5 | Sonraki güncelleme içe aktarılanı pasifleştirir, eski liste bozulurdu |
| K29 | Garanti süresi güncel marka satırından | Satış satırına satış anındaki süre ve esas kopyalanır; garanti ilk, servis zinciri son geçerli satıştan | 1.9.6 | Kural değişince eski makinelerin garantisi geriye dönük değişirdi |
| K30 | Rol adı filtresiz tekil | `UNIQUE … WHERE Aktif = 1` | 1.17.5 | Silinen rolün adı yeniden kullanılamıyordu |
| K31 | CHECK ifadelerinde NULL durumu yazılmamış | Her CHECK boş olabilen kolonu açık `IS NULL`/`IS NOT NULL` ile yazar | 1.17.6 | Bulgunun önerdiği `Adet > 0 OR (Adet IS NULL AND KatalogDisi = 1)` adetsiz katalog satırını kabul ediyor (sınandı) |
| K32 | FK tip/uzunluk/harmanlama kuralı yok; `ParaBirimiKodu char(3)` → `varchar(40)` | FK kolonu hedefin tipini, uzunluğunu, harmanlamasını aynen alır; bileşik FK hedefinde aynı kolonlarda PK/UNIQUE | 1.5, 1.6 | `1753`, `1757`, `1776`, `1778` |
| K33 | Oturumsuz ve hesapsız kayıtlar yardım prosedürlerinde yok | `yardim.Ara`/`TalepGoster`/`MusteriGoster`/`ServisGoster` kapsamı genişledi; tek normalleştirme işlevi | 3.1.4, 3.4 | TEL talebi yeni telefonla, eski telefon, giriş adı, cari kodu, tireli numara bulunamıyordu |

### 0.4 Tabloya özgü zorunlu değişiklikler (katalog yazarları için bağlayıcı)

Taslak Bölüm B'nin üzerine, Bölüm 0.2 adlarıyla uygulanır. Tip kısaltmaları Bölüm 1.5'te. Burada adı geçmeyen taslak kolonu, kısıtı ve dizini olduğu gibi kalır (ad kuralları uygulanarak). "Kaldırıldı" yazanlar katalogda yazılmaz ve "Kararlar" satırında gerekçesiyle anılır.

**dbo**
- `dbo.SemaGecmisi`: `Kimlik int IDENTITY PK`, `BetikAdi nvarchar(260)`, `Tur nvarchar(1) CK (K,V,R,T,B,O)`, `Ozet nvarchar(64)`, `UygulanmaZamani datetime2(3)`, `SureMs int`, `Uygulayan nvarchar(128) DF SUSER_SNAME()`, `Makine nvarchar(128)`; `UNIQUE (BetikAdi) WHERE Tur = N'V'`. `dbo` şeması adlandırma denetiminin dışındadır ama harmanlama kuralına uyar (kolonlar `Latin1_General_100_BIN2`). K02 oluşturur; katalogu `katalog-01`.
- `dbo.AciklamaYaz`: Bölüm 1.20.

**sistem**
- `sistem.Ortam`: PK `TekSatir`; `OrtamKodu k(10) CK`; `OrnekVeriIzinli` hesaplanmış kolon kalır.
- `sistem.Ayar`: Bölüm 1.15.5.
- `sistem.NumaraOneki`: PK `Onek k(3)`; `KayitTuruKodu NOT NULL` FK `kod.KayitTuru`; `Aktif bit`; `Aciklama m(400)`. Tohum: `SRV`, `YPR`, `TKF`, `SPS` (`talep`), `HAK` (`donemDokumu`), `TEL` (`telefonDegisikligi`), `GBD` (`geriBildirim`).
- `sistem.Giden`: `KanalKodu` → FK `kod.BildirimKanali`; `SaglayiciKodu k(40) NULL` → FK `kod.DisSistem` + `CK (DurumKodu <> N'gonderildi' OR SaglayiciKodu IS NOT NULL)`; `SaglayiciMesajNo`; `CK (IlgiliKayitTuruKodu IS NULL OR IlgiliKayitTuruKodu NOT IN (N'dogrulamaKodu', N'sifreSifirlamaJetonu') OR (Govde IS NULL AND Konu IS NULL AND DegiskenlerJson IS NULL))`; `IlgiliKayitTuruKodu` FK `kod.KayitTuru`. `SablonKodu k(80)` FK'siz kalır.
- `sistem.SaklamaKurali`: PK `KayitTuruKodu`; `SureGun int NULL CK (SureGun IS NULL OR SureGun >= 0)`; `EylemKodu CK (sil, bosalt, sakla)` (taslaktaki `anonimlestir` yerine `bosalt`); `HukukOnayli bit DF 0`; `Aciklama m(400) NOT NULL`.
- `sistem.TekrarAnahtari`: `YapanTuruKodu` FK `kod.AktorTuru`, `YapanKimlik uid NULL` (FK'siz; kullanıcı ya da hesap kimliği; taslaktaki `AktorKimlik`); uygulama rolünden DELETE izni kalktı (temizlik `sistem.SaklamaUygula`).
- `sistem.GidenEki`, `sistem.IcerikPaketi`: taslaktaki gibi.

**kod** (hepsi [L]; ayrıntı Bölüm 1.15)
- Yeni listeler: `kod.KayitKaynagi`, `kod.DisSistem`, `kod.BildirimKanali`, `kod.BelgeTuru` (eski `LogoBelgeTuru`), `kod.IceAktarimTuru`, `kod.Birim`, `kod.FirmaDurumu` (eski `TarafDurumu`), `kod.KisiRolu`, `kod.SahiplikBitisNedeni`, `kod.GarantiBaslangicEsasi`, `kod.SeriKurali`; bağ tabloları `kod.TalepTuruUydusu`, `kod.BelirtiKapsami`.
- Kaldırıldı: `kod.Belirti.Ortak`, `kod.BelirtiAilesi` (→ `kod.BelirtiKapsami`); `kod.TalepTuru.NumaraOneki` (tek kaynak `kod.TalepNumaraKurali`); `logoKoduBekliyor` kodu.
- `kod.TalepDurumu`: `Kapali bit`, `GecikmeSayilir bit` (tohum: açık durumlarda 1, `teklif` ve `odemeBekliyor` için 0; kapalılarda 0), `Ton k(20)`; `UNIQUE (Kod, Kapali)`.
- `kod.TalepTuruDurumu`: PK `(TurKodu, DurumKodu)`; `ElleSecilebilir bit NOT NULL` anahtara girmez.
- `kod.TalepNumaraKurali`: PK `(TurKodu, KaynakKodu, NumaraOneki)`; `MarkaKodu k(20) NULL` FK `katalog.Marka` (FK V0004'te); `UNIQUE (TurKodu, KaynakKodu) WHERE MarkaKodu IS NULL`; `UNIQUE (TurKodu, KaynakKodu, MarkaKodu) WHERE MarkaKodu IS NOT NULL`. Tohum: taslaktaki 8 genel satır.
- `kod.TalepTuru`: `Kod`, [L] kolonları.
- `kod.Masa`: `TalepTuruKodu k(40) NOT NULL` FK `kod.TalepTuru`. Tohum `servisMasasi → servis`, `parcaMasasi → parca`.
- `kod.IptalNedeni (AciklamaZorunlu; UNIQUE (Kod, AciklamaZorunlu))`, `kod.TeklifSonucu (FiyatZorunlu; UNIQUE (Kod, FiyatZorunlu))`, `kod.HesapHareketTuru (YonKodu CK alacak|borc; UNIQUE (Kod, YonKodu))`.
- `kod.AktorTuru`: tohum `musteri`, `personel`, `servis`, `sistem`, `entegrasyon`.
- `kod.KaynakUygulama`: tohuma `yonetim` eklenir.
- `kod.KayitTuru`: tohuma `dogrulamaKodu`, `sifreSifirlamaJetonu`, `girisDenemesi`, `destekOturumu`, `giden`, `logoSeriSorgusu`, `iceAktarimSatiri`, `tekrarAnahtari`, `iptalTalepDosyasi`, `dekont`, `islemKaydi`, `rizaOlayi` eklenir (taslaktakiler kalır).
- `kod.KayitKaynagi`: `musteri`, `servis`, `personel`, `logo`, `iceAktarim`, `entegrasyon`; eski değerler (`connect → musteri`, `servisElle → servis`, `excel → iceAktarim`, `elle → personel`) `kod.EskiDegerEslesmesi`'nde.
- `kod.DisSistem`: tohum `logo`, `fcm`, `webPush`. `kod.BildirimKanali`: `sms`, `eposta`, `push`, `webPush`. `kod.Birim`: `km`, `adet`, `saat`, `sabit`. `kod.IceAktarimTuru`: `logoCariListesi`, `logoMalzemeListesi`, `logoSatisFaturalari`, `logoServisFaturalari`, `logoBankaFisleri`, `servisListesi`, `bayiListesi`, `personelListesi` (`fiyatListesi` YOK). `kod.BelgeTuru`: taslaktaki 7 kod + `garantiBedelsizCikis`, `satisIadeFaturasi`. `kod.KisiRolu`: `hesapSahibi`, `yetkili`. `kod.SahiplikBitisNedeni`: `musteriKaldirdi`, `devir`, `personel`, `anonimlestirme`, `birlestirme`. `kod.GarantiBaslangicEsasi`: `teslim`, `fatura`, `uretim`. `kod.SeriKurali`: `onekYilSira`. `kod.KargoFirmasi`: `DisSistemKodu k(40) NULL` FK; tohum boş.
- Yeni tohum satırları: `kod.TalepDurumu odemeBekliyor` (açık, `GecikmeSayilir = 0`); `kod.TalepTuruDurumu (parca, odemeBekliyor, ElleSecilebilir = 0)`; `kod.IptalNedeni odemeSuresiDoldu`; `kod.TalepTuruUydusu (servis, servisZiyareti)`, `(parca, faturaBilgisi)`, `(satinalma, bayiAtamasi)`; Bölüm 3.5.1'deki işlem türleri.

**cografya**
- `cografya.Il`: PK `IlKodu tinyint CK (IlKodu BETWEEN 1 AND 81)` (açıklama: plaka kodu); `Ad m(50)`; `AdArama`.
- `cografya.Ilce`: PK `IlceKodu int`; `IlKodu` FK; `UNIQUE (IlKodu, IlceKodu)`; `UNIQUE (IlKodu, Ad)`; `ResmiIlceKodu k(10) NULL` + `UNIQUE … WHERE ResmiIlceKodu IS NOT NULL`; `AdArama`.
- `cografya.Ulke`: `Kod k(2)`; `Ad`; `AdEn` kaldırıldı → `kod.Ceviri (ListeAdi = N'cografya.Ulke')`.

**sirket**
- `sirket.Sirket`: PK `Kod k(20) CK (Kod NOT LIKE N'%[^a-z]%')`; taslaktaki kolonlar; `LogoFirmaNo smallint NULL`; `VergiNo k(11) NULL`; `VergiDairesi m(100) NULL`; [T].
- `sirket.BankaHesabi`: [K]; `SirketKodu k(20) NOT NULL` FK; `UNIQUE (SirketKodu, Iban)`; [T].

**katalog**
- `katalog.Marka`: `SirketKodu k(20) NOT NULL` FK `sirket.Sirket`; `GarantiBaslangicEsasiKodu` FK; `SeriKuraliKodu` FK; `ParaBirimiKodu k(3) NULL` FK; `KilavuzDilleri k(20) NULL` taslaktaki gibi (virgüllü dil kodları); aktif marka CK'si: `CK (Aktif = 0 OR (GarantiYil IS NOT NULL AND SeriKuraliKodu IS NOT NULL AND KaynakNotu IS NOT NULL))`; [T].
- `katalog.Kategori`: `Ad`, `KisaAd` (Türkçe); İngilizce → `kod.Ceviri (katalog.Kategori, Kod, Ad|KisaAd, en)`.
- `katalog.BakimAdimi`: `Baslik`, `Detay`; çeviri `katalog.BakimAdimiCevirisi`.
- `katalog.Urun`: `Slogan`, `Aciklama`; çeviri `katalog.UrunCevirisi`; [T].
- `katalog.UrunOzelligi`: `Etiket`, `Deger`; çeviri `katalog.UrunOzelligiCevirisi`. `katalog.UrunVideosu`: `Baslik`; çeviri `katalog.UrunVideosuCevirisi`.
- Çeviri tabloları: Bölüm 1.15.3. Genel bir `katalog.Ceviri` tablosu açılmaz.
- **Uygulamada değişti (17.09.2026):** `katalog.UrunVaryantiCevirisi (MarkaKodu k(20), UrunKodu k(60), VaryantKodu k(40), DilKodu k(5), Ad c(60) NOT NULL)`; PK bu dört anahtar kolon; FK `(MarkaKodu, UrunKodu, VaryantKodu)` → `katalog.UrunVaryanti (MarkaKodu, UrunKodu, Kod)`; FK `DilKodu` → `kod.Dil`; `CK (DilKodu <> N'tr')`; uygulama yazmaz (şema izniyle okur). Neden: Connect İngilizce ekranı varyant adlarını `src/marka/icerik/teknikSozluk.js` `TEKNIK_VARYANT_EN` ile çeviriyor (`2 İPLİ → 2 TWINE`); bileşik anahtar `kod.Ceviri`'ye sığmıyordu ve İngilizce varyant adının veritabanında yeri yoktu.
- `katalog.FiyatListesi`: `KaynakOzeti binary(32) NOT NULL`; `DurumKodu CK (taslak, yururlukte, arsiv)`; `UNIQUE (MarkaKodu) WHERE DurumKodu = N'yururlukte'`.
- `katalog.FiyatListesiSatiri`: `Aktif` yok; satırlar yalnız eklenir (Bölüm 5.5).
- `katalog.ParcaModel`: `ModelNotu`.

**personel**
- `personel.Personel`: `Aktif` KALDIRILDI (çalışıyor mu = `AyrilmaZamani IS NULL`; giriş = `erisim.Kullanici.Aktif`); `TelefonE164 k(16) NULL` ([F]'nin E.164 CHECK'i); [T].

**erisim**
- `erisim.Kullanici`: `TurKodu k(40)` FK `kod.AktorTuru` + `CK (TurKodu NOT IN (N'musteri', N'sistem', N'entegrasyon'))`; `GirisAdi k(40)` UNIQUE + taslak CHECK'i; `SifreKaydi k(255) NULL CK (SifreKaydi IS NULL OR SifreKaydi LIKE N'$%$%')`. Bileşik `(Kimlik, TurKodu)` FK'si kurulmaz.
- `erisim.Rol`: `UNIQUE (Ad) WHERE Aktif = 1`; `Kod k(40) NULL` + `UNIQUE (Kod) WHERE Kod IS NOT NULL AND Aktif = 1`; filtresiz ad tekilliği yok.
- `erisim.IzinGrubu`, `erisim.Izin`: `Ad`.
- `erisim.Oturum`: `KapanmaNedeniKodu` CK listesi Bölüm 1.17.7.
- `erisim.DogrulamaKodu`: `KodOzeti` = HMAC (Bölüm 1.14.3).
- `erisim.SifreSifirlamaJetonu`: `IsteyenIpAdresi`.
- `erisim.GirisDenemesi`: `DenemeZamani`; uygulama rolünden DELETE izni kalktı.

**musteri**
- `musteri.Hesap`: `LogoCariKodu` KALDIRILDI (→ `entegrasyon.CariKarti`); `DurumKodu CK (aktif, kapali, anonim, birlestirildi)`; `BirlestigiHesapKimlik uid NULL` FK `musteri.Hesap`; `CK ((DurumKodu = N'birlestirildi' AND BirlestigiHesapKimlik IS NOT NULL AND TelefonE164 IS NULL) OR (DurumKodu <> N'birlestirildi' AND BirlestigiHesapKimlik IS NULL))`; `CK (BirlestigiHesapKimlik IS NULL OR BirlestigiHesapKimlik <> Kimlik)`; taslaktaki `CK (DurumKodu <> N'anonim' OR TelefonE164 IS NULL)`; `UNIQUE (TelefonE164) WHERE TelefonE164 IS NOT NULL`. (Birleştirme KOD-SISTEMI 4.3 kararı ve görevdeki 22. istek; Bölüm 0.5.)
- `musteri.HesapKisisi`: `RolKodu` → FK `kod.KisiRolu`; `UNIQUE (HesapKimlik) WHERE RolKodu = N'hesapSahibi' AND PasifZamani IS NULL`; `AdSoyadArama` (kaynak `ISNULL(Adi, N'') + N' ' + ISNULL(Soyadi, N'')`, n = 151).
- `musteri.TelefonDegisikligiTalebi`: `Numara` + `CK (LEFT(Numara, 3) = N'TEL')`; `UNIQUE (HesapKimlik) WHERE KararDurumuKodu = N'bekliyor' AND HesapKimlik IS NOT NULL`.
- `musteri.GeriBildirim`: `Numara` + `CK (LEFT(Numara, 3) = N'GBD')`.

**kvkk**
- `kvkk.MetinSurumu`: taslaktaki gibi; tetikleyici yalnız `HukukOnayiZamani`'nın NULL'dan dolu değere geçmesine izin verir.
- `kvkk.RizaOlayi`: `RizaNotu`. `kvkk.BasvuruTalebi`: taslaktaki gibi (okunur numara yok; `KayitNo` ile seçilir).

**servis / bayi**
- `servis.Servis`, `bayi.Bayi`: `DurumKodu` → FK `kod.FirmaDurumu`; `IlceKodu`.
- `servis.FaturaBilgisi`: `VergiNoTuruKodu CK (tcNo, vergiNo)`; `VergiNoSifreli/Ozeti/Maskeli`, `IbanSifreli/Ozeti/Maskeli`; `AnahtarNo`.
- `servis.MarkaYetkisi`, `bayi.MarkaYetkisi`: PK `(ServisKimlik|BayiKimlik, MarkaKodu)` kalır; `Etkin AS CAST(CASE WHEN BitisZamani IS NULL THEN 1 ELSE 0 END AS bit) PERSISTED NOT NULL`; `UNIQUE (<Firma>Kimlik, MarkaKodu, Etkin)`; [T]. Yetki yeniden verilince aynı satır güncellenir (`BitisZamani = NULL`, `BaslangicZamani` = şimdi); eski dönemler `gecmis`'te.
- `servis.GirisHesabi`: PK `KullaniciKimlik` FK `erisim.Kullanici`; `ServisKimlik NOT NULL` FK; `Aciklama m(100) NULL`; [O]. `ServisKimlik` üzerinde tekillik YOK (çok teknisyen).
- `servis.Bolge`: taslaktaki `UQ (ServisKimlik, IlKodu, IlceNo)` yerine `UNIQUE (ServisKimlik, IlKodu, IlceKodu) WHERE IlceKodu IS NOT NULL` ve `UNIQUE (ServisKimlik, IlKodu) WHERE IlceKodu IS NULL`; [T]; uygulama DELETE.
- `servis.BayiBagi`: [T]; uygulama DELETE (geçmiş sistem sürümlü tabloda kalır).
- `servis.SifreYardimTalebi`: taslaktaki gibi.

**makine**
- `makine.Makine`: `OlusmaKaynagiKodu` → FK `kod.KayitKaynagi`; `SeriNoYazildigiGibi k(60)`.
- `makine.MakineSahipligi`: `BitisNedeniKodu` → FK `kod.SahiplikBitisNedeni`; `KaynakKodu` → FK `kod.KayitKaynagi`.
- `makine.MakineServisAtamasi`: `KaynakKodu` → FK `kod.KayitKaynagi`; `YetkiEtkin AS CAST(CASE WHEN BitisZamani IS NULL THEN 1 END AS bit) PERSISTED`; FK `(ServisKimlik, MarkaKodu, YetkiEtkin)` → `servis.MarkaYetkisi (ServisKimlik, MarkaKodu, Etkin)` (taslaktaki iki kolonlu FK'nin yerine); `AtamaNotu`; `BitirenAdi m(150) NULL`; taslaktaki yapan kısıtı: `CK (YapanTuruKodu IN (N'personel', N'entegrasyon', N'sistem'))` (servis kendini atayamaz; bulgu kararı).
- `makine.MakineSatisi`: `GarantiYil tinyint NULL`, `GarantiBaslangicEsasiKodu k(40) NULL` FK, `GarantiFaturaEkGun smallint NULL` (satış yazılırken `katalog.MarkaKurallari`'ndan kopyalanır, sonra değişmez); `BelgeBagiKimlik`; `KaynakKodu` → FK `kod.KayitKaynagi`.
- `makine.KayitOlayi`: `BeyanAdi m(150) NULL` (kaynak `makineKayitlari.musteriAd`; anonimleştirme kapsamında); `KaynakKodu` → FK `kod.KayitKaynagi`; `KonumIlceKodu`.

**talep**
- `talep.Talep`: `Kapali bit NOT NULL` + FK `(DurumKodu, Kapali)` → `kod.TalepDurumu (Kod, Kapali)` + `CK ((Kapali = 1 AND KapanmaZamani IS NOT NULL) OR (Kapali = 0 AND KapanmaZamani IS NULL))`; taslaktaki "kapalı ya da iptal ⇔ KapanmaZamani" CK'si ve 6 kodlu açık talep dizini kaldırıldı, yerine `WHERE Kapali = 0` dizini; `SahipKodu = bayi ⇒ TurKodu = satinalma` CK'si KALDIRILDI; FK `(ServisKimlik, MarkaKodu)` → `servis.MarkaYetkisi` kalır + tetikleyici (Bölüm 4.4); `ServisKimlik` bir kez yazılınca değişmez (veri.js:1702 "BİR DAHA DEĞİŞMİYOR"; bileşik FK'lerin kaynağı).
- `talep.ServisTalebiAyrinti`, `ParcaTalebiAyrinti`, `TeklifTalebiAyrinti`: taslaktaki `TurKodu` literal CK'leri kalır (türe özgü ayrıntı tablosu).
- `talep.ParcaTalebiAyrinti`: `SirketKodu k(20) NOT NULL` FK (talep yazılırken markanın şirketi; sonra değişmez); `KargoTutari para NULL`, `OdenecekTutar para NULL` (KDV ve kargo dahil son tutar), `SonOdemeTarihi date NULL`, `TutarDogrulamaZamani dt NULL`, `TutarDogrulayanKullaniciKimlik uid NULL` FK, `TutarDogrulayanAdi m(150) NULL`; `CK ((OdenecekTutar IS NULL AND SonOdemeTarihi IS NULL AND TutarDogrulamaZamani IS NULL AND TutarDogrulayanKullaniciKimlik IS NULL) OR (OdenecekTutar IS NOT NULL AND SonOdemeTarihi IS NOT NULL AND TutarDogrulamaZamani IS NOT NULL AND TutarDogrulayanKullaniciKimlik IS NOT NULL))`. `AraToplam`, `KdvTutari`, `GenelToplam` ve `talep.ParcaSatiri` müşterinin gördüğü, değişmeyen görüntüdür.
- `talep.ParcaSatiri`: `Adet int NULL`; `CK (Adet IS NULL OR Adet > 0)`; `CK (Adet IS NOT NULL OR (KatalogDisi = 1 AND BirimFiyat IS NULL AND Tutar IS NULL))`.
- `talep.FaturaBilgisi`, `talep.ServisZiyareti`, `talep.BayiAtamasi`: Bölüm 1.17.4 uydu kalıbı; tür literalli CK yok. `FaturaBilgisi`: `TcNoSifreli/Ozeti/Maskeli`, `VergiNoSifreli/Ozeti/Maskeli`, `AnahtarNo`.
- `talep.ServisZiyareti`: `UNIQUE (Kimlik, TalepKimlik)` eklendi; taslaktaki `(Kimlik, TalepKimlik, ServisKimlik)`, `(Kimlik, KapiKodu, AsamaKodu)` ve "parca aşamasında tek ziyaret" (`UNIQUE (TalepKimlik) WHERE AsamaKodu = N'parca'`) kalır.
- `talep.ZiyaretParcaSatiri`: servisin gönderdiği liste; `Adet int NOT NULL CK (Adet > 0)`; uygulama rolü yalnız INSERT.
- `talep.ZiyaretDuzeltmesi`: `OncekiIscilikTutari`, `YeniIscilikTutari`. `talep.ZiyaretDuzeltmesiParcasi`: `TarafKodu CK (onceki, yeni)` kalır; `Adet int NOT NULL CK (Adet > 0)`; düzeltmede çıkarılan parça `yeni` tarafta satır olarak yer almaz.
- **Uygulamada değişti (17.09.2026):** **marka zinciri.** `talep.ServisZiyareti.MarkaKodu k(20) NOT NULL` + `UNIQUE (Kimlik, MarkaKodu)` + FK `(TalepKimlik, MarkaKodu)` → `talep.Talep (Kimlik, MarkaKodu)`; `talep.ZiyaretDuzeltmesi.MarkaKodu k(20) NOT NULL` + `UNIQUE (Kimlik, MarkaKodu)` + FK `(ZiyaretKimlik, MarkaKodu)` → `talep.ServisZiyareti (Kimlik, MarkaKodu)`; `talep.ZiyaretParcaSatiri` FK `(ZiyaretKimlik, MarkaKodu)` → `talep.ServisZiyareti (Kimlik, MarkaKodu)`; `talep.ZiyaretDuzeltmesiParcasi` FK `(DuzeltmeKimlik, MarkaKodu)` → `talep.ZiyaretDuzeltmesi (Kimlik, MarkaKodu)` (tek kolonlu FK'lerin yerine; her FK'nin dizini var). Neden: `(MarkaKodu, ParcaKodu) → katalog.Parca` FK'si katalog dışı satırda markayı hiç denetlemiyordu, dolu satırda da başka markanın parçası ziyarete yazılabiliyordu (`talep.ParcaSatiri`'deki `(TalepKimlik, MarkaKodu)` güvencesinin karşılığı; E1).
- **Uygulamada değişti (17.09.2026):** **yarıda kalan parça aşaması.** `kod.ZiyaretAsamasi`'na tohumla `yarimKaldi` satırı gelir (şema değişmez). Kural: talep iptal edilince ya da `parca` aşamasındaki ziyaret iş bitmeden talep kapanınca, aynı işlemde o ziyaretin `AsamaKodu` `N'yarimKaldi'` olur (`YapilanIsKodu` gerekmez: `CK_…_YapilanIs` yalnız `bitti`'yi bağlar). Uygulayan: API, `yonetim.TalebiIptalEt`, `yonetim.TalebiKapat` ve eski kayıt taşıması (`parcaIste` kapılı, `talepDurumDegistir(kapandi)` ile kapanmış kayıtlar). `UX_talep_ServisZiyareti_ParcaAsamasi` filtresi literal `parca` olduğu için `yarimKaldi` satırı yeni parça isteğine yer açar. Neden: backoffice `parcaBekliyor` talebi iptal edebiliyor (veri.js `talepIptal`; Servisim bu kararı PAKSAN'a bırakıyor, TalepDetay.jsx:120); talep yeniden açılıp servis yeni parça isteyince ikinci `parca` ziyareti `2601` veriyordu, eski ziyareti `bitti` yapmak da uydurma `YapilanIsKodu` isterdi.
- `talep.ParcaSevki`: `TurKodu k(40) NOT NULL` + FK `(TalepKimlik, TurKodu)` → `talep.Talep (Kimlik, TurKodu)`; FK `(ZiyaretKimlik, TalepKimlik)` → `talep.ServisZiyareti (Kimlik, TalepKimlik)`; `CK (TurKodu <> N'servis' OR ZiyaretKimlik IS NOT NULL)`; `UNIQUE (ZiyaretKimlik) WHERE ZiyaretKimlik IS NOT NULL`; `BelgeBagiKimlik`.
- `talep.Kapanis`: `TeklifSonucuKodu NULL`, `FiyatZorunlu bit NULL` + FK `(TeklifSonucuKodu, FiyatZorunlu)` → `kod.TeklifSonucu (Kod, FiyatZorunlu)`; `CK ((TeklifSonucuKodu IS NULL AND FiyatZorunlu IS NULL) OR (TeklifSonucuKodu IS NOT NULL AND FiyatZorunlu IS NOT NULL))`; `CK (FiyatZorunlu IS NULL OR FiyatZorunlu = 0 OR SatisFiyati IS NOT NULL)`; `satisOldu` literali kaldırıldı; `KapanisNotu`.
- `talep.Iptal`: `AciklamaZorunlu bit NOT NULL` + FK `(IptalNedeniKodu, AciklamaZorunlu)` → `kod.IptalNedeni (Kod, AciklamaZorunlu)`; `CK (AciklamaZorunlu = 0 OR (Aciklama IS NOT NULL AND LEN(Aciklama) > 0))`.
- `talep.OdemeOnayi`: `OnaylananTutar para NOT NULL`, `ParaBirimiKodu k(3) NOT NULL`; `OnayNotu`; `GeriAlanKullaniciKimlik uid NULL`; `UNIQUE (TalepKimlik) WHERE GeriAlinmaZamani IS NULL`.
- `talep.TalepBelgesi`: PK `(TalepKimlik, BelgeBagiKimlik)`; `RolKodu` KALDIRILDI (belgenin ne olduğu `BelgeBagi.BelgeTuruKodu`).
- `talep.TalepNotu` (eski `talep.Not`), `talep.Teklif.TeklifNotu`, `talep.Ekleme.EklemeNotu`.

**hakedis**
- `hakedis.Tarife`: `BirimKodu` → FK `kod.Birim`; açık tarife tekilliği `UNIQUE (KalemTuruKodu) WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NULL` ve `UNIQUE (KalemTuruKodu, MarkaKodu) WHERE GecerlilikBitisTarihi IS NULL AND MarkaKodu IS NOT NULL`. **Uygulamada değişti (18.09.2026, V0016):** iki dizine de `ParaBirimiKodu` eklendi — `UNIQUE (KalemTuruKodu, ParaBirimiKodu)` ve `UNIQUE (KalemTuruKodu, MarkaKodu, ParaBirimiKodu)`. `HakEdisHesapla` tarifeyi zaten para birimine göre seçiyordu (1.9.4); tekillik onu anahtara almadığı için "yol" kaleminin açık genel tarifesi TRY'de varken EUR'da bir tanesi açılamıyor, `Km > 0` olan her EUR hak edişi `51041` alıyordu. İkinci para birimi yalnız veriyle kurulamıyordu (Bölüm 2, ES-16). Kural gevşemedi: okuma yolunun gerçekte kullandığı anahtara oturdu, TRY davranışı birebir aynı.
- `hakedis.HakEdis`: `Km`, `YolBirimTutari`, `YolTutari`, `IscilikTutari`, `TarifeKimlik` ve `NetTutar = yol + işçilik` CK'si KALDIRILDI; `SirketKodu k(20) NOT NULL` FK; FK `(DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)` → `hakedis.DonemDokumu (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)`; `UNIQUE (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)`; `CK (DurumKodu <> N'bekliyor' OR (OnayZamani IS NULL AND OnaylayanKullaniciKimlik IS NULL AND OnaylayanAdi IS NULL AND RedZamani IS NULL AND RedEdenKullaniciKimlik IS NULL AND RedEdenAdi IS NULL AND RedNedeni IS NULL))`; `CK (DurumKodu <> N'onaylandi' OR (OnayZamani IS NOT NULL AND OnaylayanKullaniciKimlik IS NOT NULL AND KdvTutari IS NOT NULL AND TevkifatTutari IS NOT NULL AND StopajTutari IS NOT NULL))`; taslaktaki `KapiKodu CK 'garanti'`, `AsamaKodu CK 'bitti'` ve ziyarete bileşik FK'leri kalır. Uygulama rolü `NetTutar`'ı güncelleyemez.
- `hakedis.HakEdisKalemi`: [K]; `HakEdisKimlik`; `KalemTuruKodu`; `Miktar decimal(9,1) NULL`; `BirimKodu k(40) NULL` FK `kod.Birim`; `BirimTutar para NULL`; `TarifeKimlik uid NULL` FK; `Tutar para NOT NULL CK (Tutar >= 0)`; `UNIQUE (HakEdisKimlik, KalemTuruKodu)`; `SiraNo` yok (sıra `kod.HakEdisKalemTuru.Sira`). Uygulama rolü doğrudan yazamaz.
- `hakedis.DonemDokumu`: `SirketKodu k(20) NOT NULL` FK; `MahsupToplam para NOT NULL DEFAULT 0`; `FaturaLogoBelgeBagiKimlik`, `OdemeLogoBelgeBagiKimlik` KALDIRILDI; `Numara` + `CK (LEFT(Numara, 3) = N'HAK')`; `UNIQUE (ServisKimlik, SirketKodu, ParaBirimiKodu, DonemYili, DonemAyi) WHERE DurumKodu <> N'iptal'`; `UNIQUE (Kimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)`; `CK (OdenecekTutar = NetToplam + KdvToplam - TevkifatToplam - StopajToplam - MahsupToplam)`.
- `hakedis.DonemDokumuBelgesi` (yeni): PK `(DonemDokumuKimlik, BelgeBagiKimlik)`; [O]; [A].
- `hakedis.ServisHesapHareketi`: `SirketKodu k(20) NOT NULL` FK; `YonKodu` + FK `(HareketTuruKodu, YonKodu)` → `kod.HesapHareketTuru (Kod, YonKodu)`; FK `(HakEdisKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)` → `hakedis.HakEdis`; FK `(DonemDokumuKimlik, ServisKimlik, SirketKodu, ParaBirimiKodu)` → `hakedis.DonemDokumu`; `BelgeBagiKimlik`; `GeriAlinmaZamani dt NULL` (yalnız NULL'dan dolu değere, bir kez; yalnız `yonetim` yazar); `UNIQUE (HakEdisKimlik) WHERE HareketTuruKodu = N'hakEdisAlacagi' AND GeriAlinmaZamani IS NULL AND HakEdisKimlik IS NOT NULL`; `UNIQUE (ParcaTalepKimlik) WHERE HareketTuruKodu = N'parcaSiparisiBorcu' AND GeriAlinmaZamani IS NULL AND ParcaTalepKimlik IS NOT NULL`; `UNIQUE (DuzeltilenHareketKimlik) WHERE DuzeltilenHareketKimlik IS NOT NULL`; `CK (HareketTuruKodu <> N'odeme' OR (DonemDokumuKimlik IS NOT NULL AND BelgeBagiKimlik IS NOT NULL))`; dizin `(ServisKimlik, SirketKodu, ParaBirimiKodu, HareketZamani) INCLUDE (YonKodu, Tutar)`. Uygulama rolü yalnız INSERT ve `DonemDokumuKimlik`, `BelgeBagiKimlik` üzerinde UPDATE alır.
- **Uygulamada değişti (17.09.2026):** `hakedis.ServisHesapHareketi` Bölüm 1.9.3'ün zorunlu bağlarını CHECK'le zorlar: `CK_…_HakEdisBagi (HareketTuruKodu <> N'hakEdisAlacagi' OR HakEdisKimlik IS NOT NULL)`, `CK_…_ParcaBagi (HareketTuruKodu <> N'parcaSiparisiBorcu' OR ParcaTalepKimlik IS NOT NULL)`, `CK_…_DuzeltmeAlacakBagi (HareketTuruKodu <> N'duzeltmeAlacak' OR DuzeltilenHareketKimlik IS NOT NULL)`, `CK_…_DuzeltmeBorcBagi (HareketTuruKodu <> N'duzeltmeBorc' OR DuzeltilenHareketKimlik IS NOT NULL)`. Neden: bağsız satır kabul ediliyor ve `UX_…_HakEdisAlacagi`/`UX_…_ParcaSiparisiBorcu` filtrelerinin (`… IS NOT NULL`) dışında kalıp çift alacak ya da borç yazdırabiliyordu. `hakedis.HakEdis.MarkaKodu` varsayılansızdır (Bölüm 1.15.1 notu).

**duyuru / bildirim**
- `duyuru.Duyuru`, `duyuru.Hedef*`: taslaktaki gibi (`geriCagirma` CK'si kalır; `HedefIlce (DuyuruKimlik, IlKodu, IlceKodu)`). `kod.HedefKitle` ve `kod.DuyuruAltTuru` taslaktaki gibi.
- `bildirim.Bildirim`: alıcı CK'si "varsayılan kollu" (Bölüm 1.17.1); kolonlar taslaktaki gibi (`BayiKimlik` eklenmez).
- `bildirim.Teslimat`: alıcı ve kaynak CK'leri taslaktaki gibi; tekillikler `UNIQUE (BildirimKimlik) WHERE BildirimKimlik IS NOT NULL`; `UNIQUE (DuyuruKimlik, HesapKimlik) WHERE DuyuruKimlik IS NOT NULL AND HesapKimlik IS NOT NULL`; aynı kalıpla `ServisKimlik` ve `KullaniciKimlik`.
- `bildirim.Cihaz`: `UygulamaKodu` → FK `kod.KaynakUygulama`; `PushSaglayiciKodu` → FK `kod.DisSistem`; `PlatformKodu CK` kalır.

**destek / dosya / denetim / entegrasyon**
- `destek.SohbetOturumu`, `destek.SohbetOlayi (OlayZamani, BilgiKaydiNo)`.
- `dosya.Dosya`: `DepolamaSaglayiciKodu CK (disk, nesne)`; `SaklamaSinifiKodu CK (dekont, genel)`; taslaktaki `CK (SaklamaSinifiKodu <> N'dekont' OR SilinmeIstendiZamani IS NULL)` KALIR (hukukçu süre verirse ayrı V betiğiyle gevşetilir).
- `denetim.IslemKaydi`: `IslemZamani`; Yapan grubu FK'siz, aynı CHECK; `YapanRolAdi`; `CK (YapanTuruKodu <> N'musteri' OR IpAdresi IS NULL)`; INSTEAD OF UPDATE/DELETE koruması kesin (saklama istisnası yok).
- `entegrasyon.BelgeBagi` (eski `LogoBelgeBagi`): [K]; `DisSistemKodu k(40) NOT NULL` FK; `FirmaNo smallint NULL`; `DonemNo smallint NULL`; `DisKayitNo k(64) NULL` (LOGICALREF metin olarak); `BelgeTuruKodu` FK `kod.BelgeTuru`; `BelgeNo k(32) NULL`; `Ettn uid NULL`; `BelgeTarihi date NULL`; `Tutar para NULL` (belge genel toplamı, KDV dahil); `KdvHaricTutar para NULL`; `ParaBirimiKodu k(3) NULL`; `CariKartiKimlik uid NULL` FK; `IptalZamani dt NULL`; `KaynakKodu` FK `kod.KayitKaynagi`; `IceAktarimKimlik uid NULL` FK; [O]; [A]. `CK (DonemNo IS NULL OR FirmaNo IS NOT NULL)`; `CK (DisKayitNo IS NOT NULL OR Ettn IS NOT NULL OR (BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL))`; tekillikler: `(DisSistemKodu, FirmaNo, DonemNo, BelgeTuruKodu, DisKayitNo) WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NOT NULL AND DonemNo IS NOT NULL`; `(DisSistemKodu, FirmaNo, BelgeTuruKodu, DisKayitNo) WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NOT NULL AND DonemNo IS NULL`; `(DisSistemKodu, BelgeTuruKodu, DisKayitNo) WHERE DisKayitNo IS NOT NULL AND FirmaNo IS NULL`; `(Ettn) WHERE Ettn IS NOT NULL`; `(DisSistemKodu, FirmaNo, BelgeTuruKodu, BelgeNo, BelgeTarihi) WHERE BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL AND FirmaNo IS NOT NULL`; `(DisSistemKodu, BelgeTuruKodu, BelgeNo, BelgeTarihi) WHERE BelgeNo IS NOT NULL AND BelgeTarihi IS NOT NULL AND FirmaNo IS NULL`.
- `entegrasyon.CariKarti` (eski `LogoCariKarti` + `Hesap.LogoCariKodu`): [K]; `DisSistemKodu` FK; `FirmaNo smallint NULL`; `CariKodu k(32) NOT NULL`; `DisKayitNo k(64) NULL`; `HesapKimlik`, `ServisKimlik`, `BayiKimlik` (uid NULL, FK) + `CK ((CASE WHEN HesapKimlik IS NULL THEN 0 ELSE 1 END) + (CASE WHEN ServisKimlik IS NULL THEN 0 ELSE 1 END) + (CASE WHEN BayiKimlik IS NULL THEN 0 ELSE 1 END) = 1)`; `Aktif`; `KaynakKodu` FK `kod.KayitKaynagi`; `DogrulayanKullaniciKimlik`, `DogrulayanAdi`, `DogrulamaZamani`; [O]; `UNIQUE (DisSistemKodu, FirmaNo, CariKodu) WHERE FirmaNo IS NOT NULL`; `UNIQUE (DisSistemKodu, CariKodu) WHERE FirmaNo IS NULL`. Taslaktaki `MarkaKodu` kaldırıldı (cari firma başınadır, KOD 4.8).
- **Uygulamada değişti (17.09.2026):** `entegrasyon.BelgeBagi` ve `entegrasyon.CariKarti`'ya `SirketKodu k(20) NULL` FK `sirket.Sirket` (+ dizin). LOGO satırında `FirmaNo` ↔ `sirket.Sirket.LogoFirmaNo` eşleşmesinden türetilebilir; firma numarası olmayan dış sistemde (e-fatura entegratörü, ikinci ERP) API doldurur. `FirmaNo` boşken tekillik şirkete göre ayrılır (Bölüm 1.17.5 kalıbı): `CariKarti` `UX_…_FirmasizCariKodu (DisSistemKodu, CariKodu) WHERE FirmaNo IS NULL AND SirketKodu IS NULL` + `UX_…_SirketCariKodu (DisSistemKodu, SirketKodu, CariKodu) WHERE FirmaNo IS NULL AND SirketKodu IS NOT NULL`; `BelgeBagi` `DisKayitNoFirmasiz` ve `BelgeNoFirmasiz` filtrelerine `AND SirketKodu IS NULL`, yanlarına `DisKayitNoSirket` ve `BelgeNoSirket` (`SirketKodu` anahtarda, `WHERE … FirmaNo IS NULL AND SirketKodu IS NOT NULL`); `Ettn` tekilliği genel kalır. Neden: aynı dış sistemi iki şirket kullanırsa belgenin ve cari kartın şirketi tutulamıyor, `MutabakatHakEdisLogo`'nun servis × şirket × ay eşleşmesi ve çok şirketli cari tekilliği kurulamıyordu. Mutabakat görünümleri şirketi `COALESCE(SirketKodu, <FirmaNo = LogoFirmaNo eşleşen şirket>)` ile okur (Bölüm 3.2).
- `entegrasyon.LogoMalzemeKarti`, `makine.Makine.LogoMalzemeKodu`: pilotta LOGO'ya özgü adlarıyla kalır (KOD 4.4).
- `entegrasyon.LogoSeriSorgusu`: `LogoFirmaNo smallint NULL`; `BelgeBagiKimlik`.
- `entegrasyon.IceAktarim.TurKodu` → FK `kod.IceAktarimTuru`. `entegrasyon.IceAktarimSatiri.EslesenKayitTuruKodu` → FK `kod.KayitTuru`.

### 0.5 Bulguların farklı önerdiği ya da bulgu dışı karar gereken yerlerde verilen karar

| Konu | Karar | Gerekçe |
|---|---|---|
| Şirket anahtarı: `SirketKimlik` mi `SirketKodu` mu | `sirket.Sirket.Kod k(20)`; her yerde `SirketKodu` | Marka gibi başvuru verisi; SSMS'te `WHERE SirketKodu = N'paksan'` okunur |
| Müşteri LOGO cari kodu: `LogoCariKarti`'na `HesapKimlik` mi, ortak tablo mu | `entegrasyon.CariKarti` (hesap/servis/bayi, `DisSistemKodu`) | İkinci ERP de aynı tabloya satır olur |
| Bitmiş yetkiye bağ: tetikleyici mi hesaplanmış kolonlu FK mi | Atamada hesaplanmış kolonlu FK (iki bulgu); talepte tetikleyici (bir bulgu); talepte hesaplanmış FK KURULMAZ | Talepte FK kurulursa açık talebi olan servisin yetkisi alınamaz; veri.js'de servis talebin sahibi olarak kalıyor. Tetikleyici yalnız yeni bağı ve değişikliği reddeder |
| Yetki alınınca açık atamalar | `yonetim.ServistenMarkaYetkisiniAl` aynı işlemde açık atamaları bitirir, bitirdiklerini ve o markadaki açık talepleri listeler | İki bulgu "aynı işlemde bitir" diyor; önizleme (`@Uygula = 0`) listeyi önceden gösterdiği için "önce devret" bulgusunun amacı da karşılanır |
| Servis şifresi sıfırlama: prosedürden çıkar mı, jetonla mı | `yonetim.GirisSifresiniSifirla` tek kullanımlık kodla; reçetede önce backoffice ekranı | İki bulgu jetonla yazılabildiğini gösterdi; çıkarma öneren bulgunun gerekçesi (scrypt) jetonla ortadan kalkıyor |
| Hak ediş kalemlerini yazan prosedürün adı | `hakedis.HakEdisHesapla` (yol, işçilik, `NetTutar`) + `hakedis.HakEdisKalemiYaz` (başka türler) | İki bulgu iki ad veriyor; birden çok yeni kalem türü tek "diğer" parametresine sığmaz |
| Hak edişte onay tetikleyicisi | `TR_hakedis_HakEdis_Onay` + `gorunum.KontrolHakEdisToplamiUyusmuyor` | Uygulama kalem yazamadığı halde sahip girişi yazabilir; tetikleyici ucuz |
| Parça ödeme süresi: kolon mu hesap mı | `SonOdemeTarihi date` kolonu | Müşteriye gösterilen son gün sonradan ayar değişince geriye dönük değişmemeli (garanti sabitleme ile aynı ilke) |
| Doğrulanmış tutar CK'si | Dört kolon birlikte dolu ya da birlikte boş | İki bulgunun şartlarının birleşimi |
| Ayar kapsamı: yalnız marka mı, marka + şirket mi | Genel/şirket/marka; `UNIQUE (Anahtar, MarkaKodu)` yerine üç filtreli tekillik | Şirket ayarını (KDV, banka açıklaması) marka tekilliği karşılamıyor |
| Ayar okuma: işlev mi görünüm mü | `gorunum.GecerliAyar`; uygulama rolü bu tek görünümü okur | Bulgu görünüm istiyor; API ile SSMS aynı sonucu görsün |
| Ödeme ve iade gibi hareketlerde ters kayıt kolonu | `DuzeltilenHareketKimlik` (taslak) + `GeriAlinmaZamani` | Bulgu önerisi; taslak kolonu korunur |
| Tür uydusunda literal CK: `ParcaSevki` servis şartı, `HakEdis` kapı/aşama, `Duyuru` geri çağırma | Taslak/bulgu literalleri kalır (tek koda özgü, "içerme" biçimli; Bölüm 1.17.1) | En sade; yeni kod bunları reddetmez ya da yalnız o koda özgü kuralı taşır |
| Makine atamasını kim yapabilir | Taslaktaki `YapanTuruKodu IN (personel, entegrasyon, sistem)` CK'si kalır | Bulgu "kısıt kalır" diyor; varsayılan-red doğru: bayi paneli açılsa da bayi servis atayamaz |
| Belge bağında NULL firma | Ayrı `IS NULL` filtreli tekillikler | Bölüm 1.17.5 kuralı tek anlamlı kalsın |
| Hesap birleştirme (bulgu listesinde yok) | `musteri.Hesap.BirlestigiHesapKimlik` + `birlestirildi` + `yonetim.HesaplariBirlestir` | KOD-SISTEMI 4.3 "hesapları birleştir" işlemini karara bağlamış; görevdeki 22. istek; bağ kolonu olmadan eski telefonla gelen müşteri kalan hesaba ulaşılamaz (2. şart) |
| Markaya ayrı talep numarası serisi (bulgu listesinde yok) | `kod.TalepNumaraKurali.MarkaKodu NULL` bugünden | Planın 1. şartı; bugün bütün satırlar genel (KOD 4.8 tek seri kararı değişmez); sonradan V betiği gerekmez |
| Kanıt belgeler (servis fotoğrafı, servis fişi, satış belgesi) anonimleştirmede | Bulgu: `SilinmeIstendiZamani` + `OrijinalAd = NULL` | Bulgu önerisi uygulanır; dekont sınıfı saklama kuralını bekler |
| `yardim` için ayrı `NumaraGoster`, `BayiGoster`, `PersonelGoster`; ayrı kişi/ayar geçmişi görünümleri | Açılmaz; `yardim.Ara` `SonrakiAdim` verir, geçmiş için reçete sorgusu | Bulgu: "yeni görünüm açılmasın"; plan altı yardım prosedürü sayıyor |
| `katalog.Marka.KilavuzDilleri` | Taslaktaki virgüllü kolon kalır | İtalyanca kılavuz = değer değişikliği; şema değişmez |

### 0.6 İşlenen bulgular (başlık → bölüm)

| Açı | Bulgu (kısaltılmış) | İşlendiği yer |
|---|---|---|
| akış-connect | Yedek parça ödeme akışı tabloya yazılamıyor | 0.3 K11; 0.4 talep; 1.7.4; 1.9.7; 5.3 `OdemeBeklemeGunu`; SN-12; `gorunum.KontrolOdemeSuresiDolanParca` |
| akış-connect | "Talebiniz alındı" ve randevu hatırlatmasının okundu bilgisi | 1.12.1 (bildirim yazma kuralı); 5.7 `eslesme.json`; SN-03 |
| akış-connect | Oturumsuz TEL talebinde NULL hesap ikinci talebi reddediyor | 0.3 K8; 0.4 musteri, bildirim; 1.17.5; KS-07, KS-08, KS-09 |
| akış-connect | Çok şirkette IBAN ve müşteri LOGO cari kodu | 0.4 sirket, entegrasyon; 1.9.2; ES-04, ES-05 |
| akış-connect | `yardim.Ara`/`Goster` Connect kayıtlarını kapsamıyor | 3.4.1, 3.4.2, 3.4.4; BS-04, BS-06 |
| akış-connect | "Diğer" parçada uydurma adet | 0.4 talep; 0.3 K31; KS-35; SN-12 |
| akış-backoffice | Masa ile talep türü arasında bağ yok | 0.4 kod `Masa`; 1.15.6 (rol listesi tanımı); 3.2 `TalepListesi.MasaAdi`; ES-09 |
| akış-backoffice | Makinenin servisi görünümü personelin girdiği bayiyi almayabilir | 3.3 `makine.MakineninBayisi`; SN-02 |
| akış-backoffice | Silinen rolün adı yeniden kullanılamıyor | 0.3 K30; 0.4 erisim; KS-40 |
| akış-servisim | Servisim elle kaydı makineyi servise bağlıyor | 0.4 makine; 3.2 `KontrolServisiOlmayanSahipliMakine`; 5.7; 8 (#23); SN-02b |
| akış-servisim | Düzeltme parça satırını çıkaramıyor | 0.4 talep; 3.3 `talep.ZiyaretGuncelParcasi`; 4.3; SN-07; YS-06 |
| akış-servisim | Hak ediş tutarı iki yerde | 0.3 K13; 1.9.4; KS-32, YS-06; SN-06/07 |
| akış-servisim | Döküm ve hareket şirkete/para birimine ayrılamıyor | 0.3 K14; 1.9.5; KS-29, KS-30; ES-05 |
| akış-servisim | Sevk ziyarete bağlanmak zorunda değil | 0.4 talep `ParcaSevki`; KS-62..64 |
| akış-servisim | `yardim.Ara` servisi söylediği bilgiyle bulamıyor | 3.4.1, 3.4.5; BS-07 |
| esneklik | Aktör CHECK'i türleri sayıyor | 0.3 K5; 1.16; KS-44; ES-12 |
| esneklik | LOGO adları iş tablolarına gömülü | 0.2; 0.4 entegrasyon; 2.1 E8; ES-14 |
| esneklik | Çok satırlı şirket yarım | 0.4 sirket, katalog, talep; 1.9.2 |
| esneklik | Döküm ve hareket şirketlere ayrılamıyor | 1.9.2, 1.9.5 |
| esneklik | Çeviri tablosu alan adı ve bileşik anahtar taşıyamıyor | 1.15.3; CD-CEVIRI; ES-07 |
| esneklik | Belirti kapsamı yalnız aileye göre | 0.4 kod; 1.15.4; KS-65; ES-01 |
| esneklik | Yetkisi bitmiş servise atama ve talep | 0.5; 1.17.3; 4.4; KS-12..14 |
| esneklik | Uydular CHECK ile tek türe kilitli | 0.3 K7; 1.17.4; ES-09 |
| esneklik | Kapalı durum kısıtı ve açık dizin kodları sabit | 0.3 K6; 1.17.2; KS-23; ES-08 |
| esneklik | Ayar anahtarı marka/şirket kapsamı kuramıyor | 0.3 K10; 1.15.5; KS-38, KS-39 |
| esneklik | Büyüyecek listeler CHECK ile sabit; sağlayıcı kodu yok | 0.3 K9; 0.4 sistem, bildirim, makine; 1.17.7; ES-15 |
| esneklik | Hak ediş yol+işçilik ve km birimine kilitli | 0.3 K13; 1.9.4; `gorunum.KontrolHakEdisToplamiUyusmuyor`; ES-10 |
| esneklik | Duyuru hedef kitlesi ve bildirim alıcısı üç tarafla sınırlı | 1.17.1 varsayılan kol; 2.2 bayi paneli; ES-12 |
| bulunabilirlik | Ekrandaki biçimle numara/seri/telefon 0 satır | 3.1.1, 3.1.4, 3.4; BS-02..05 |
| bulunabilirlik | Onaylanmış hak ediş geri alınamıyor | 0.4 hakedis; 3.5.2 `HakEdisOnayiniGeriAl`; BS-17 |
| bulunabilirlik | `yonetim` listesi isteklerin yarısını karşılamıyor | 3.5.2; 4.2 `rol_yonetici`; 3.6 |
| bulunabilirlik | KVKK silme hesapsız kişide yapılamıyor | 1.13.5; 3.5.2 `KisiselVerileriAnonimlestir`; BS-21 |
| bulunabilirlik | Genel "durum değiştir" kapıları atlıyor | 0.3 K24; 3.5.2; BS-12..14 |
| bulunabilirlik | GUID gizlenince numarasız kayıt seçilemiyor | 0.2 `KayitNo`; 3.1.5; BS-15 |
| bulunabilirlik | Görünümler UTC gösteriyor | 0.3 K22; 1.8; 3.1.2; BS-09 |
| bulunabilirlik | Türkçe harmanlamada `il`, `iptal`, `KIMLIK` bulunamıyor | 0.3 K1; 1.4.1; BS-01 |
| bulunabilirlik | `talep.Not` sözdizimi hatası | 0.2; 1.3.4 |
| bulunabilirlik | Elle düzeltmede "yapan" serbest ad | 0.3 K25; 3.5.1; BS-10, BS-11 |
| bulunabilirlik | Servis şifresi SQL prosedürüyle sıfırlanamıyor | 0.5; 1.14.4; 3.5.2; BS-19 |
| bulunabilirlik | Hesapsız müşterinin makinesinde sahibi yok | 0.4 makine `BeyanAdi`; 3.2 `MakineKarti` |
| bulunabilirlik | Atama anahtarı yetki bitişine bakmıyor | 0.4 servis/bayi; 1.17.3; KS-12, KS-13 |
| bulunabilirlik | Giriş/firma/LOGO kodu soruları iki cevaplı | 0.3 K26; 0.2 `FirmaDurumu`; 3.2 `KontrolLogoCariKoduEksik`; 3.3 `MakineninServisi` |
| bulunabilirlik | Fiyat listesi iki yoldan yazılıyor | 0.3 K28; 0.4 kod `IceAktarimTuru`; 5.2 T06; 3.6 #16 |
| bulunabilirlik | Ayar değeri serbest metin, 48 saat sabit | 1.15.5; 3.2 `Gecikti`; BS-20 |
| bulunabilirlik | Aynı sözcük farklı anlamda | 0.2; 1.3 |
| bulunabilirlik | Dört soruya hazır görünüm yok | 3.2 `DuyuruListesi` sayaçları; 3.6 #11, #18, #19, #21 |
| sqlserver | Aksansız arama ifadesi `ı` bırakıyor | 0.3 K3; 1.4.3; CD-ARAMA |
| sqlserver | varchar BIN2 kolonlar Türkçe harfi dönüştürüyor | 0.3 K2; 1.4.1; KS-05 |
| sqlserver | Türkçe veritabanı harmanlaması nesne adlarını bozuyor | 0.3 K1; 1.4.1; 1.19.1; KR-10 |
| sqlserver | UPPER/LOWER normalleştirmesi seri ve giriş adını bozuyor | 1.4.2; 3.1.4; BS-02 |
| sqlserver | `NumaraAl` `3930` ile çöküyor | 0.3 K4; 1.7.2; KS-52 |
| sqlserver | FK yetkisi bitmiş servisi engellemiyor | 1.17.3; KS-12, KS-13 |
| sqlserver | Kod bayrakları CHECK'e giremiyor | 0.3 K6; 1.17.2; KS-23, KS-25, KS-26 |
| sqlserver | Tohum MERGE veriyle eklenenleri pasifleştiriyor; `5316` | 0.3 K15; 5.5; ES-19 |
| sqlserver | "Aynı adla" geçmiş kuralı çakışıyor; Ayar PK'si | 0.2; 1.11.1; 1.15.5 |
| sqlserver | FULL kurtarma + tek `INIT` yedek | 0.3 K16; 1.19.2 |
| sqlserver | Geçici şifre T-SQL'de yazılamaz | 0.3 K17; 1.14.4; 3.5.2 |
| sqlserver | FK tip/uzunluk/harmanlama uyuşmazlığı | 0.3 K32; 1.5; 1.6; 0.4 kod `TalepNumaraKurali`, `TalepTuruDurumu` |
| kvkk-güvenlik | Saklama süreleri uygulanamıyor | 0.3 K18; 1.13.4; KS-60, KS-61 |
| kvkk-güvenlik | Anonimleştirme kapsamı dar | 0.3 K19; 1.13.5; SN-17 |
| kvkk-güvenlik | SMS kodu ve şifre bağlantısı giden kuyruğunda | 0.3 K20; 1.14.3; KS-46 |
| kvkk-güvenlik | Rapor girişi müşteri iletişim verisini okuyor | 0.3 K21; 3.2 `TalepIstatistigi`; 4.2; CD-YETKI; YS-14 |
| kvkk-güvenlik | Geçici şifre / boş özet ele geçirme penceresi | 1.14.4; KS-57, KS-58 |
| logo-finans | Hareketin tek `Tutar`'ı iki esaslı | 0.3 K12; 1.9.3; 4.4; KS-33; SN-08, SN-15 |
| logo-finans | Döküm tek fatura/ödeme belgesine kilitli | 0.4 hakedis; 1.9.5; KS-28, KS-31; SN-15 |
| logo-finans | Para tablolarında çok şirket yok | 1.9.2; 0.4 entegrasyon `LogoSeriSorgusu`; ES-04, ES-05 |
| logo-finans | Parça ödemesinde beklenen tutar tutulamıyor | 0.4 talep; 1.9.7; 3.2 `KontrolOdemeTutariUyusmayanParca`; KS-37 |
| logo-finans | LOGO belge bağı mutabakata yetmiyor | 0.4 entegrasyon; 3.2 `Mutabakat…`; KS-42 |
| logo-finans | Fiyat listesi sürümü korunmuyor | 0.3 K28; 0.4 katalog; 5.2 T06; 5.5; 5.6 |
| logo-finans | `NetTutar` CK'si `diger` kalemini dışarıda bırakıyor | 1.9.4; ES-10 |
| logo-finans | İçe aktarım türü ve belge rolü CHECK içinde | 0.3 K9; 0.4 kod, talep; ES-18 |
| logo-finans | Garanti süresi satışa sabitlenmiyor | 0.3 K29; 1.9.6; SN-02 |

---

## 1. Kurallar

### 1.1 Ortamlar ve veritabanı adları

| Ortam kodu | Veritabanı adı | Nerede | Örnek veri (O betikleri) | Kurtarma modeli |
|---|---|---|---|---|
| `yerel` | `Paksan_Yerel` | Bu PC | Evet (`--ornek`) | SIMPLE |
| `sinama` | `Paksan_Sinama1`, `Paksan_Sinama2` | Bu PC; kurulur, sınanır, silinir | Evet | SIMPLE |
| `test` | `Paksan_Test` | VPS | Hayır | SIMPLE |
| `canli` | `Paksan_Canli` | VPS (pilot bu ortamın ilk dönemi) | Hayır | FULL (Bölüm 1.19.2) |

- Araç yalnız `^Paksan_(Yerel|Test|Canli|Sinama\d)$` adlarına dokunur; başka veritabanında kullanıcı açmaz.
- Her veritabanında `sistem.Ortam` tek satırı vardır: `TekSatir`, `OrtamKodu`, `VeritabaniAdi`, `KurulumZamani`, `KurulumMakinesi`, `OrnekVeriIzinli` (hesaplanmış: `yerel`/`sinama` → 1). K02 yazar; tetikleyici değiştirmeyi ve silmeyi reddeder (`51011`). Aynı değer `PaksanOrtam` genişletilmiş özelliği olarak da yazılır.
- Ortam dosyası (`veritabani/ortam/<ortam>.env`) ile `sistem.Ortam` uyuşmazsa araç durur.
- Her ortamın dört SQL girişi vardır: `paksan_<ortam>_sahip`, `paksan_<ortam>_uygulama`, `paksan_<ortam>_yonetici`, `paksan_<ortam>_rapor` (Bölüm 4.1).
- Test ile canlı aynı VPS'te, ayrı veritabanı ve ayrı girişlerle durabilir.
- Sunucu harmanlaması serbesttir (yerel sunucu `Turkish_CI_AS`); veritabanı ve bütün metin kolonları açık harmanlama taşıdığı için şema aynı çıkar. Sunucu harmanlamasına bağlı kalan tek şey değişken adları ve `#geçici` tablolardır (Bölüm 1.4.2).

### 1.2 Şemalar

Uygulamalar (Connect, backoffice, Servisim) veritabanına doğrudan bağlanmaz; API `paksan_<ortam>_uygulama` girişiyle yazar ve okur. "Yazan akış" sütunu verinin hangi ürünün hangi akışından doğduğunu söyler. `dbo` yalnız kurulum aracının nesnelerini taşır (`dbo.SemaGecmisi`, `dbo.AciklamaYaz`). Şemalar `AUTHORIZATION dbo` ile açılır.

| Şema | Amaç | SSMS'te ne bulunur | Yazan akış | Okuyan |
|---|---|---|---|---|
| `musteri` | Müşteri hesabı ve hesaba bağlı kişisel kayıtlar | `Hesap`, `HesapKisisi`, `HesapTelefonGecmisi`, `TelefonDegisikligiTalebi`, `GeriBildirim`, `GeriBildirimNotu`; `SifreYaz`, `HesabiAnonimlestir` | Connect (kayıt, profil, numara talebi, geri bildirim); backoffice (karar, not, müşteri düzenleme) | Üç ürün (Servisim elle kayıtta müşteri eşleştirme) |
| `makine` | Makine kaydı, sahiplik, servis ataması, satış, garanti | `Makine`, `MakineSahipligi`, `MakineServisAtamasi`, `MakineSatisi`, `KayitOlayi`, `BakimTamamlama`; görünümler `MakineGuncelSahibi`, `MakineninBayisi`, `MakineninServisi`, `MakineGarantisi` | Connect (makine ekleme, bakım işareti); Servisim (elle kayıt); backoffice (atama, satan bayi) | Üç ürün |
| `talep` | Servis, yedek parça, fiyat teklifi talepleri ve bütün alt kayıtları | `Talep` ve uyduları, `DurumGecmisi`, `TalepNotu`, `Randevu`, `Teklif`, `Iptal`, `Kapanis`, `YenidenAcma`, `Ekleme`, `Dekont`, `OdemeOnayi`, `ParcaSatiri`, `ServisZiyareti`, `ParcaSevki`, `BayiAtamasi`…; görünüm `ZiyaretGuncelParcasi` | Üç ürün | Üç ürün |
| `servis` | Servis firması, bölgesi, bayi bağı, marka yetkisi, giriş hesabı | `Servis`, `FaturaBilgisi`, `BayiBagi`, `Bolge`, `MarkaYetkisi`, `GirisHesabi`, `SifreYardimTalebi` | Backoffice (Servisler); Servisim (şifre yardımı) | Backoffice, Servisim, Connect (servis kartı) |
| `bayi` | Bayi firması ve marka yetkisi (bayinin paneli yok) | `Bayi`, `MarkaYetkisi` | Backoffice (Bayiler) | Backoffice, Servisim (Bayilerim), Connect (satıcı beyanı) |
| `hakedis` | Servisin PAKSAN'dan alacağı: tarife, hak ediş, aylık döküm, hesap hareketi | `Tarife`, `HakEdis`, `HakEdisKalemi`, `DonemDokumu`, `DonemDokumuBelgesi`, `ServisHesapHareketi`; `HakEdisHesapla`, `HakEdisKalemiYaz` | Servisim (servis kaydı); backoffice (onay, düzeltme, döküm) | Servisim (Hak Ediş), backoffice |
| `katalog` | Marka, ürün, parça, fiyat listesi ve çevirileri | `Marka`, `Kategori`, `Urun`, `Parca`, `FiyatListesi`, `…Cevirisi`; görünüm `MarkaKurallari` | Yalnız tohum (depo) | Üç ürün |
| `personel` | Personel kartı | `Personel` | Backoffice (Personel) | Backoffice |
| `erisim` | Giriş, rol, izin, oturum, şifre, doğrulama kodu | `Kullanici`, `Rol`, `IzinGrubu`, `Izin`, `RolIzin`, `Oturum`, `SifreSifirlamaJetonu`, `DogrulamaKodu`, `GirisDenemesi`; `SifreYaz` | API (giriş); backoffice (roller, personel, servis hesabı) | API |
| `duyuru` | Duyuru ve hedefleri | `Duyuru`, `HedefMarka`, `HedefIl`, `HedefIlce`, `HedefServis`, `HedefUrun`, `HedefSeri` | Backoffice (Duyurular) | Connect, Servisim |
| `bildirim` | Kişisel bildirim, alıcı başına teslimat, cihaz | `Bildirim`, `Teslimat`, `Cihaz` | API (olaylardan); üç ürün (görüldü/okundu) | Üç ürün |
| `destek` | Destek sohbeti oturum ve olay kaydı (sohbet metni yok) | `SohbetOturumu`, `SohbetOlayi` | Connect | Backoffice (Destek kayıtları) |
| `kvkk` | Metin sürümleri, rıza olayları, başvurular | `MetinSurumu`, `RizaOlayi`, `BasvuruTalebi`; görünüm `GuncelRiza` | Connect (kayıt, profil); backoffice (başvuru); tohum (metin) | Connect, backoffice |
| `dosya` | Ek dosyalarının üst verisi (dosya diskte ya da nesne deposunda) | `Dosya` | Üç ürün (yükleme) | Üç ürün |
| `denetim` | Silinemez işlem kaydı | `IslemKaydi` | API; `yonetim`; `sistem.SaklamaUygula` | Backoffice (İşlem Kaydı); `gorunum.IslemGecmisi` |
| `entegrasyon` | Dış sistem bağları (LOGO ve sonrakiler), içe aktarım | `BelgeBagi`, `CariKarti`, `LogoMalzemeKarti`, `LogoSeriSorgusu`, `IceAktarim`, `IceAktarimSatiri` | Backoffice (Excel içe aktarım, eşleme); ileride entegrasyon servisi | Backoffice, `gorunum` |
| `kod` | Bütün kod listeleri, bağları, çeviri, eski değer eşleşmesi | `TalepDurumu`, `Belirti`, `BelirtiKapsami`, `IptalNedeni`…, `Ceviri`, `EskiDegerEslesmesi` | Tohum (depo); esneklikte sahip girişiyle veri olarak | Hepsi |
| `cografya` | Ülke, il, ilçe, yurt dışı bölge | `Ulke`, `Il`, `Ilce`, `YurtdisiBolge` | Tohum | Hepsi |
| `sirket` | İşletmeci şirket(ler) ve banka hesapları | `Sirket`, `BankaHesabi` | Tohum | Connect (ödeme ekranı), backoffice |
| `sistem` | Ortam, ayar, numara, giden kuyruğu, tekrar koruması, saklama | `Ortam`, `Ayar`, `NumaraOneki`, `NumaraSayaci`, `TekrarAnahtari`, `Giden`, `GidenEki`, `IcerikPaketi`, `SaklamaKurali`; `NumaraAl`, `YapanAyarla`, `SaklamaUygula` | API; tohum; `yonetim.AyarDegistir` | API, `gorunum` |
| `gorunum` | İnsan için bakış görünümleri (GUID yok, Türkiye saati, Türkçe etiket) | Bölüm 3.2 | — | Yönetici girişi; rapor girişi yalnız adı yazılı olanları; uygulama girişi yalnız `GecerliAyar` |
| `yardim` | Arama ve kart prosedürleri; yalnız okur | Bölüm 3.4; işlev `Sadelestir` | — | Yönetici girişi |
| `yonetim` | Kurallı elle düzeltme prosedürleri | Bölüm 3.5 | Yönetici girişi (prosedür üzerinden) | — |
| `gecmis` | Sistem sürümlü tabloların geçmiş tabloları | `gecmis.<sema>_<Tablo>` | Motor | `gorunum`, API, reçete sorguları |

### 1.3 Adlandırma

#### 1.3.1 Genel

- Bütün nesne adları Türkçe sözcüklerle, **Türkçe harfsiz ASCII**, **kısaltmasız**, ekrandaki sözcüklerle yazılır. İngilizce yalnız SQL Server'ın kendi sözcüklerinde kalır.
- Şema adı küçük harf tek sözcük. Tablo, görünüm, prosedür, işlev, kolon ve parametre adları PascalCase.
- Tablo adı tekil ad öbeğidir; şemanın adını gereksiz tekrarlamaz (`talep.DurumGecmisi`), varlığın kendisi şemayla aynı adı alabilir (`servis.Servis`). `tbl`, `vw_`, `sp_`, `fn_`, `usp` gibi önekler yoktur.
- Prosedür adı nesne + eylem: `yonetim.TalebiKapat`, `yardim.TalepGoster`, `sistem.NumaraAl`, `hakedis.HakEdisHesapla`.
- İşlev adı sonucu söyler: `yardim.Sadelestir`.
- Görünüm adı ekranın ya da sorunun adıdır: `gorunum.TalepListesi`, `gorunum.KontrolOnayBekleyenHakEdis`, `gorunum.MutabakatHakEdisLogo`. Alan şemasındaki görünümler önek almaz (`makine.MakineninServisi`).
- Tetikleyici `TR_<sema>_<Tablo>_<Amac>`; geçmiş tablosu `gecmis.<sema>_<Tablo>`.
- Herkesin bildiği kısaltmalar (PascalCase yazılır): `Kdv`, `Tc`, `Km`, `Iban`, `Ettn`, `Logo`, `Sms`, `Url`, `Ip`, `Json`, `E164`.
- Aynı kavram her yerde aynı sözcükle yazılır: "kim yaptı" = `Yapan`, çevrilmiş etiket = `Ad`/`…Adi`, PAKSAN'ın verdiği okunur numara = `Numara`, satır seçme = `KayitNo`, teknik anahtar = `Kimlik`.
- Aynı adlı iki tablo farklı şeyleri anlatamaz: `servis.GirisHesabi` (bağ) ≠ `erisim.Kullanici` (şifre); `destek.SohbetOturumu` ≠ `erisim.Oturum`. `servis.FaturaBilgisi` ile `talep.FaturaBilgisi` aynı kavramdır (fatura bilgisi), sahipleri şemadan okunur.

#### 1.3.2 Kolon ekleri ve tipleri

Canlı denetim (CD-TIP) bu tabloyu `sys.columns` üzerinden uygular. "BIN2" = `COLLATE Latin1_General_100_BIN2`, "TR" = `COLLATE Turkish_100_CI_AS`, "LCI" = `COLLATE Latin1_General_100_CI_AS`.

| Ad kalıbı | Anlam | Tip | Not |
|---|---|---|---|
| `Kimlik` | Satırın teknik anahtarı | `uniqueidentifier NOT NULL` | Ekranda ve `gorunum`'da görünmez |
| `<Varlik>Kimlik`, `<Rol>KullaniciKimlik` | Başka satıra bağ | `uniqueidentifier` | Rol önekli olabilir: `OnaylayanKullaniciKimlik` |
| `KayitNo` | Veritabanında satır seçmek için sıra | `bigint IDENTITY(1,1) NOT NULL` | Kümelenmiş tekil dizin; iş anlamı yok; ekrana, SMS'e, LOGO'ya çıkmaz |
| `Numara` | PAKSAN'ın verdiği okunur numara (`SRV2600123`) | `nvarchar(10)` BIN2 | Bölüm 1.7 |
| `NumaraOneki`, `Onek` | Numaranın 3 harfi | `nvarchar(3)` BIN2 | |
| `Kod` | Kod listesinin, şirketin, markanın, katalog satırının doğal anahtarı | `nvarchar(n)` BIN2 | n: Bölüm 1.5 |
| `<X>Kodu` | Kod listesine ya da doğal anahtara bağ | `nvarchar(n)` BIN2, hedefle aynı n | İstisnalar: `IlKodu tinyint`, `IlceKodu int` |
| `Ad`, `KisaAd`, `<X>Adi`, `AdSoyad`, `Unvan` | İnsan metni (ad) | `nvarchar(n)` TR | Rol önekli anlık görüntü: `YapanAdi`, `OnaylayanAdi` |
| `Aciklama`, `Metin`, `Baslik`, `Detay`, `Slogan`, `Neden`, `<X>Notu`, `Adres`, `<X>Metni` | İnsan metni | `nvarchar(n)` TR | `Not` tek başına ad olamaz |
| `<X>Zamani` | UTC an | `datetime2(3)` | Tabloda hep UTC |
| `<X>ZamaniTurkiye` | Türkiye saatiyle an | `datetime2(0)` | Yalnız `gorunum`/`yardim`/`yonetim` sonuçlarında |
| `<X>Tarihi` | Türkiye takvim günü | `date` | |
| `Tutar`, `<X>Tutari`, `<X>Toplam`, `<X>Toplami`, `<X>Fiyati`, `BirimFiyat`, `BirimTutar`, `OdenecekTutar`, `MahsupToplam` | Para | `decimal(18,2)` | Aynı satırda `ParaBirimiKodu` |
| `<X>Orani` | Oran (0,2000 = %20) | `decimal(7,4)` | `CK (x IS NULL OR (x >= 0 AND x <= 1))` |
| `<X>Sifreli` | AES-GCM şifreli değer | `varbinary(512)` | Bölüm 1.14 |
| `<X>Ozeti` | SHA-256 ya da HMAC-SHA256 | `binary(32)` | `TcNoOzeti`, `KodOzeti`, `IcerikOzeti` |
| `SifreKaydi` | Şifrenin PHC dizgisi (`$scrypt$ln=15,r=8,p=1$<tuz>$<özet>`) | `nvarchar(255)` BIN2 | Bölüm 1.14.2. **Uygulamada değişti (17.09.2026):** eski ad `SifreOzeti` |
| `<X>Maskeli` | Gösterim için gizlenmiş değer | `nvarchar(40)` BIN2 | `*********45` |
| `<X>Arama` | Aksansız, küçük harfli arama metni | Kalıcı hesaplanmış kolon, Bölüm 1.4.3 | Yalnız bu anlamda |
| `<X>Json` | JSON metni | `nvarchar(max)` BIN2 + `CK (x IS NULL OR ISJSON(x) = 1)` | Bölüm 1.12 |
| `SatirSurumu` | İyimser eşzamanlılık | `rowversion NOT NULL` | |
| `Aktif`, `Kapali`, `Etkin`, `KatalogDisi`, `…Zorunlu`, `…Sayilir`, `…Izinli`, `…Gerekli` | Evet/hayır | `bit` | |
| `<X>Sayisi` | Adet | `int`/`smallint`/`tinyint` | |
| `Sira` | Kod listesinde gösterim sırası | `smallint NOT NULL DEFAULT 0` | |
| `SiraNo`, `ZiyaretNo`, `SatirNo` | Üst kayıt içindeki sıra | `smallint`/`tinyint`/`int` | Üst kayıtla birlikte tekil |
| `<X>No` | Dışarıdan gelen numara | `nvarchar(n)` BIN2 ya da `smallint` | `SeriNo`, `TakipNo`, `EskiKayitNo` (eski uygulamanın metin kimliği), `BelgeNo`, `FirmaNo`, `DonemNo`, `LogoFirmaNo`, `DisKayitNo`, `SaglayiciMesajNo`, `BilgiKaydiNo`, `AnahtarNo`; `TcNo`/`VergiNo` yalnız `…Sifreli/…Ozeti/…Maskeli` öncesinde |
| `TelefonE164` (önekli olabilir) | Uluslararası telefon | `nvarchar(16)` BIN2 | [F] |
| `TelefonUlusal` | E.164'ün ülke kodu atılmış hâli (TR: 10 hane, başında 0 yok) | `nvarchar(15)` BIN2 | [F] |
| `Eposta` | E-posta | `nvarchar(254)` LCI | |
| `IpAdresi` | IP | `nvarchar(45)` BIN2 | |
| `UygulamaSurumu` | `0.9.14` | `nvarchar(20)` BIN2 | |
| `Km` | Kilometre | `decimal(9,1)` | `CK (Km IS NULL OR Km >= 0)` |
| `DonemYili`, `DonemAyi` | Dönem | `smallint`, `tinyint CK 1..12` | |
| `SureGun`, `SureSaniye`, `BoyutBayt` | Süre/boyut; birim sonda | `int`/`decimal(7,2)`/`bigint` | |
| `GecerlilikBaslangici`, `GecerlilikBitisi` | Sistem sürümlü dönem | `datetime2(7) GENERATED ALWAYS … HIDDEN` | Bölüm 1.11 |

Ek kurallar:
- `uniqueidentifier` tipindeki her kolonun adı `Kimlik` ile biter. İstisnalar: `sistem.TekrarAnahtari.Anahtar`, `entegrasyon.BelgeBagi.Ettn`.
- `nvarchar(max)` yalnız `…Json`, `sistem.Giden.Govde`, `katalog.Urun.Aciklama`, `katalog.UrunCevirisi.Aciklama` kolonlarında.
- Kolon sırası: (1) `Numara`; (2) iş kolonları; (3) bağ kolonları (`…Kimlik`, `…Kodu`); (4) [Y], [F]; (5) iş durumu ve zamanları; (6) [A]; (7) [O], [I], `GuncellemeZamani`; (8) `KayitNo`, `Kimlik`, [E], `SatirSurumu`; (9) dönem kolonları. SSMS'te `SELECT *` önce işi gösterir.

#### 1.3.3 `Numara`, `…No`, `SiraNo`, `KayitNo`, `Sira`

- `Numara`: PAKSAN'ın sistemi verir (`sistem.NumaraAl`), insan söyler, havaleye yazılır.
- `…No`: başka bir yerin verdiği numara (plaka seri numarası, kargo takip, LOGO belge/firma/dönem, Excel satırı, sağlayıcı mesajı, TC/vergi no) ya da bir üst kayıt içindeki sıra (`ZiyaretNo`, `SiraNo`).
- `KayitNo`: yalnız veritabanında satır seçmek içindir.
- `Sira`: kod listesinde gösterim sırası.

#### 1.3.4 Yasak adlar

T-SQL ayrılmış sözcükleri (Microsoft'un güncel ayrılmış, ODBC ve gelecek sürüm listelerinin tamamı) tablo, kolon, görünüm, prosedür, işlev, parametre ve değişken adı olamaz. Bu projede özellikle: `Not`, `Key`, `Plan`, `File`, `User`, `View`, `Index`, `Rule`, `Open`, `Read`, `Level`, `Order`, `Group`, `Top`, `Percent`, `Current`, `Date`, `Time`, `Zone`, `Value`, `Language`, `Name`. `tools/vt/denetle.mjs` listenin tamamını tutar ve eşleşen adı reddeder.

#### 1.3.5 Kısıt ve dizin ad kalıpları

Tablo adları şemalar arasında tekrarlanabildiği için her kısıt ve dizin adı şemayı taşır. Adsız (sistemin adlandırdığı) kısıt ve dizin yasaktır.

| Nesne | Kalıp | Örnek |
|---|---|---|
| Birincil anahtar | `PK_<sema>_<Tablo>` | `PK_talep_Talep` |
| Kümelenmiş `KayitNo` dizini | `CX_<sema>_<Tablo>_KayitNo` | `CX_talep_Talep_KayitNo` |
| Tekillik kısıtı | `UQ_<sema>_<Tablo>_<Kolon1><Kolon2>` | `UQ_makine_Makine_MarkaKoduSeriNo` |
| Filtreli tekil dizin | `UX_<sema>_<Tablo>_<Amac>` | `UX_musteri_Hesap_Telefon` |
| Yabancı anahtar | `FK_<sema>_<Tablo>_<HedefSema>_<HedefTablo>[_<Rol>]` | `FK_talep_Talep_servis_MarkaYetkisi` |
| CHECK | `CK_<sema>_<Tablo>_<Amac>` | `CK_talep_Talep_Kapali`, `CK_talep_Talep_Yapan` |
| DEFAULT | `DF_<sema>_<Tablo>_<Kolon>` | `DF_talep_Talep_OlusmaZamani` |
| Dizin | `IX_<sema>_<Tablo>_<Kolonlar>` | `IX_talep_Talep_DurumKoduOlusmaZamani` |
| Tetikleyici | `TR_<sema>_<Tablo>_<Amac>` | `TR_talep_Talep_DurumGecmisi` |

Ad 128 karakteri aşarsa `<Kolonlar>` yerine kısa bir Türkçe amaç yazılır.

**Uygulamada değişti (17.09.2026):** **geçmiş tabloları istisnası.** `gecmis.<sema>_<Tablo>` tablolarını ve kümelenmiş dizinlerini motor açar (Bölüm 1.11.1): dizin adı motorun verdiği `ix_<sema>_<Tablo>`'dur ve dizin `PAGE` sıkıştırmalıdır (`sys.dm_db_persisted_sku_features` `Compression` döndürür). `gecmis` şemasında adsız dizin yasağı ve `DATA_COMPRESSION` kuralı bu dizinlere uygulanmaz: ad belirlenimcidir (her ortamda aynı, parmak izi değişmez); sıkıştırma 2016 SP1'den beri Express ve Standard dahil bütün sürüm türlerinde ve Linux'ta vardır (hedef 2019+, geri yüklemeyi engellemez) ve Express'in 10 GB sınırında büyüyen geçmiş tablolarına yarar. Geçmiş tablosu betikte elle açılmaz: motor geçmiş tablosunda birincil anahtara izin vermez (statik PK denetimi), 16 tablonun kolon listesi asıl tabloyla elle eşit tutulmak zorunda kalırdı. Adsız dizin denetimi ve parmak izi `gecmis` şemasındaki `ix_…` dizinlerini bu istisnayla okur.

#### 1.3.6 Kalıp grupları (katalogda köşeli parantezle anılır)

| Grup | Kolonlar |
|---|---|
| **[K]** | `Kimlik uniqueidentifier NOT NULL CONSTRAINT DF_…_Kimlik DEFAULT NEWID()` + `KayitNo bigint IDENTITY(1,1) NOT NULL`; `CONSTRAINT PK_… PRIMARY KEY NONCLUSTERED (Kimlik)`; `CREATE UNIQUE CLUSTERED INDEX CX_…_KayitNo ON … (KayitNo)` |
| **[O]** | `OlusmaZamani datetime2(3) NOT NULL CONSTRAINT DF_…_OlusmaZamani DEFAULT SYSUTCDATETIME()` |
| **[G]** | `GuncellemeZamani datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()` (API her güncellemede yazar) |
| **[R]** | `SatirSurumu rowversion NOT NULL` |
| **[A]** | Yapan grubu, Bölüm 1.16 |
| **[I]** | `IstemciOlusmaZamani datetime2(3) NULL` (bilgi amaçlı; sunucu saati esas) |
| **[E]** | `EskiKayitNo nvarchar(64)` BIN2 `NULL`, `EskiNumara nvarchar(20)` BIN2 `NULL`; `IX_…_EskiNumara … WHERE EskiNumara IS NOT NULL` |
| **[T]** | Sistem sürümlü geçmiş, Bölüm 1.11.1 |
| **[L]** | Kod listesi biçimi, Bölüm 1.15.1 |
| **[Y]** | Konum: `KonumUlkeKodu nvarchar(2)` BIN2 `NOT NULL` FK `cografya.Ulke`; `IlKodu tinyint NULL` FK `cografya.Il`; `IlceKodu int NULL` + FK `(IlKodu, IlceKodu)` → `cografya.Ilce (IlKodu, IlceKodu)`; `YurtdisiBolge nvarchar(100)` TR `NULL`; `YurtdisiIlce nvarchar(100)` TR `NULL`; `Adres nvarchar(500)` TR `NULL`; `CK ((KonumUlkeKodu = N'TR' AND YurtdisiBolge IS NULL AND YurtdisiIlce IS NULL) OR (KonumUlkeKodu <> N'TR' AND IlKodu IS NULL AND IlceKodu IS NULL))`; `CK (IlceKodu IS NULL OR IlKodu IS NOT NULL)`. Önekli kullanılabilir (`KonumIlKodu`) |
| **[F]** | Telefon: `TelefonE164 nvarchar(16)` BIN2 `NULL` + `CK (TelefonE164 IS NULL OR (TelefonE164 LIKE N'+[1-9]%' AND SUBSTRING(TelefonE164, 2, 15) NOT LIKE N'%[^0-9]%' AND LEN(TelefonE164) BETWEEN 8 AND 16))`; `TelefonUlusal nvarchar(15)` BIN2 `NULL` + `CK (TelefonUlusal IS NULL OR TelefonUlusal NOT LIKE N'%[^0-9]%')`. Değerleri API `yardim.Sadelestir` ile aynı kuralla üretir. Önekli olabilir: `IletisimTelefonE164`, `IletisimTelefonUlusal` |

### 1.4 Harmanlama

#### 1.4.1 Veritabanı ve kolonlar

1. `CREATE DATABASE … COLLATE Latin1_General_100_CI_AS`. Nesne, kolon ve şema adları büyük/küçük harf ve i/I farkı gözetmeden bulunur (`select ilkodu from cografya.il`, `SELECT KIMLIK FROM talep.talep` çalışır).
2. **Türkçe insan metni** tutan her `nvarchar` kolon açık `COLLATE Turkish_100_CI_AS` alır (ad, unvan, adres, açıklama, not, başlık, metin, gerekçe, neden). Türkçe sıralama ve Türkçe büyük/küçük harf duyarsız eşitlik (`WHERE Ad = N'istanbul'` → `İSTANBUL`) böyle korunur.
3. **Dili satıra göre değişen çeviri metni** (`kod.Ceviri.Metin`, `katalog.…Cevirisi` metin kolonları) ve `Eposta` kolonları `Latin1_General_100_CI_AS` alır.
4. **Kod benzeri** her kolon `nvarchar(n) COLLATE Latin1_General_100_BIN2` olur: bütün `Kod`/`…Kodu` (tamsayı `IlKodu`/`IlceKodu` hariç), `Numara`, `NumaraOneki`, `Onek`, `SeriNo`, `SeriNoYazildigiGibi`, `SeriOneki`, parça kodu, `GirisAdi`, `GirisAdiBeyani`, `TelefonE164`, `TelefonUlusal`, `…Maskeli`, `CariKodu`, `MalzemeKodu`, `BelgeNo`, `TakipNo`, `DisKayitNo`, `EskiKayitNo`, `EskiNumara`, `CihazNumarasi`, `IlgiliNumara`, `Anahtar` (ayar), `Deger` (ayar), `SablonKodu`, `BaslikAnahtari`, `MetinAnahtari`, `IslemKodu`, `UygulamaSurumu`, `IsletimSistemiSurumu`, `IpAdresi`, `KullaniciAjani`, `MimeTuru`, `DepolamaYolu`, `Url`/`…Yolu`/`…Url`, `SohbetAnahtari`, `BilgiKaydiNo`, `SaglayiciMesajNo`, `PushJetonu`, `Surum` (KVKK, içerik paketi), `ListeAdi`, `AlanAdi`, `EskiDeger`, `YeniKod`, `Ikon`, `Ton`, `Sembol`, `KilavuzDilleri`, `…Json`, `Govde`, `Konu`, `AliciAdres`, `SonHata`, `HataMesaji`, `KaynakDosyaAdi`, `OrijinalAd`.
5. **Açık harmanlaması olmayan metin kolonu olamaz** (statik ve canlı denetim reddeder).
6. `char`, `varchar`, `nchar`, `text`, `ntext` betiklerde kullanılmaz (`dbo` dahil). Neden: nvarchar parametre `varchar` kolona yazılırken Türkçe harf sessizce dönüşür (`ızmır → izmir`), CHECK işe yaramaz, eşitlik araması 0 döner.
7. **Uygulamada değişti (17.09.2026):** **elle aramada `N` öneki.** Veritabanı harmanlaması kod sayfası 1252 olduğu için `N` önekisiz yazılan Türkçe metin sessizce dönüşür: `'Konya Işık Servis'` → `'Konya Isik Servis'` (`ı→i`, `ş→s`, `ğ→g`, `İ→I`, `Ş→S`, `Ğ→G`; `Ç`, `Ö`, `Ü` korunur) ve `WHERE Ad = 'Konya Işık Servis'` hata vermeden 0 satır döner. BIN2 kolonlarda `'srv2600123'`, `'SRV-26-00123'` de 0 satır döner. Harmanlama değişmez (madde 1'in gerekçesi geçerli); kural kullanıcının göreceği yerlere yazılır: Türkçe insan metni kolonlarının (`Ad`, `Adi`, `Soyadi`, `AdSoyad`, `IletisimAdi`, `BeyanAdi`, `Unvan`, `Adres`), `…Arama` kolonlarının ve `Numara`/`SeriNo`/`GirisAdi` kolonlarının `MS_Description`'ına; `musteri`, `servis`, `talep` şema açıklamalarına; Bölüm 3.6 dizininin (VERITABANI.md reçeteleri) başına.

#### 1.4.2 Karşılaştırma ve normalleştirme

- Kod benzeri değer arayan her ifade girdiyi `yardim.Sadelestir` ile ya da tam olarak şu biçimlerle normalleştirir: seri, parça kodu, numara, cari kodu için `UPPER(@x COLLATE Latin1_General_100_BIN2)`; giriş adı için `LOWER(@x COLLATE Latin1_General_100_BIN2)`. Harmanlama belirtilmemiş `UPPER(@x)`/`LOWER(@x)` yazılmaz (Türkçe varsayılanda `i → İ`, `I → ı` olur; arama sessizce boş döner).
- Yabancı anahtar kolonu hedef anahtarın tipini, uzunluğunu ve harmanlamasını aynen alır (aksi `1753`, `1757`, `1778`). Kod tabloları ile onlara bakan kolonlar bu yüzden hep `Latin1_General_100_BIN2`'dir.
- Değişken ve parametre adları sunucu harmanlamasıyla çözülür. Betiklerde her değişken ve parametre bir modül içinde bildirildiği harf dizilişiyle birebir yazılır (statik denetim karşılaştırır). Reçetelerde (Bölüm 3.6) parametre adları prosedürdeki yazılışla kopyalanır.
- `#geçici` tablo ve tablo değişkeninde her metin kolonu açık `COLLATE` alır; R betiklerinde `#geçici` tablo yalnız zorunluysa kullanılır.

#### 1.4.3 Aksansız arama kolonunun tam ifadesi

`<Kaynak>` kaynak kolonun adı (ya da ifadesi), `<n>` kaynak kolonun uzunluğudur. İfade harfi harfine budur; yalnız bu ikisi değişir:

```sql
<Ad>Arama AS CAST(LOWER(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      <Kaynak> COLLATE Latin1_General_100_BIN2,
      N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
      N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
      N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U')
  ) AS nvarchar(<n>)) PERSISTED
```

- Sıra değişmez: önce `BIN2`, sonra 18 `REPLACE`, sonra `LOWER`, en dışta `CAST`. Sonuç harmanlaması `Latin1_General_100_BIN2`'dir; normal dizin kurulur.
- Arayan taraf aynı dönüşümü arama metnine uygular (`yardim.Sadelestir(...).Arama`) ve `LIKE N'%' + @Arama + N'%'` kullanır. İfade yalnız bu bölümde tanımlıdır; başka yerde kopyası yazılmaz, bu bölüme başvurulur.
- Arama kolonları: `servis.Servis.AdArama`, `bayi.Bayi.AdArama`, `personel.Personel.AdArama`, `cografya.Il.AdArama`, `cografya.Ilce.AdArama`, `talep.Talep.IletisimAdArama`, `musteri.HesapKisisi.AdSoyadArama` (kaynak `ISNULL(Adi, N'') + N' ' + ISNULL(Soyadi, N'')`, n = 151).
- Tam metin arama (FULLTEXT) kullanılmaz.

### 1.5 Tip sözlüğü ve anahtar uzunlukları

| Kısaltma | SQL tipi |
|---|---|
| `uid` | `uniqueidentifier` |
| `dt` | `datetime2(3)` |
| `tarih` | `date` |
| `k(n)` | `nvarchar(n) COLLATE Latin1_General_100_BIN2` |
| `m(n)` | `nvarchar(n) COLLATE Turkish_100_CI_AS` |
| `c(n)` | `nvarchar(n) COLLATE Latin1_General_100_CI_AS` |
| `para` | `decimal(18,2)` |
| `oran` | `decimal(7,4)` |
| `sif` | `varbinary(512)` |
| `ozet` | `binary(32)` |
| `?` | NULL olabilir |

Doğal anahtar tipleri (tek yer; FK kolonları birebir aynı tipi alır):

| Anahtar | Tip | Ona bakan kolon |
|---|---|---|
| `kod.<Liste>.Kod` (aşağıdakiler dışındaki bütün kod listeleri) | `k(40)` | `<Liste>Kodu` ya da rol adlı `…Kodu` |
| `kod.ParaBirimi.Kod` | `k(3)` | `ParaBirimiKodu` |
| `kod.Dil.Kod` | `k(5)` | `DilKodu` |
| `cografya.Ulke.Kod` | `k(2)` | `UlkeKodu`, `KonumUlkeKodu`, `TelefonUlkeKodu` |
| `cografya.Il.IlKodu` | `tinyint` | `IlKodu`, `KonumIlKodu` |
| `cografya.Ilce.IlceKodu` | `int` | `IlceKodu`, `KonumIlceKodu` |
| `sirket.Sirket.Kod` | `k(20)` | `SirketKodu` |
| `katalog.Marka.Kod` | `k(20)` | `MarkaKodu`, `FiyatListesiMarkaKodu`, `IlgiUrunMarkaKodu`, `KanitMarkaKodu` |
| `katalog.Kategori.Kod`, `katalog.BakimSablonu.Kod`, `katalog.UrunVaryanti.Kod` | `k(40)` | `KategoriKodu`, `BakimSablonuKodu`/`SablonKodu`, `VaryantKodu` |
| `katalog.Urun.Kod`, `katalog.ParcaGrubu.Kod` | `k(60)` | `UrunKodu`, `IlgiUrunKodu`, `GrupKodu` |
| `katalog.Parca.Kod` | `k(24)` | `ParcaKodu` |
| `katalog.FiyatListesi.Kod` | `k(20)` | `FiyatListesiKodu`, `IlkFiyatListesiKodu`, `SonFiyatListesiKodu` |
| `sistem.NumaraOneki.Onek` | `k(3)` | `NumaraOneki` |
| `erisim.Izin.Kod`, `erisim.IzinGrubu.Kod` | `k(40)` | `IzinKodu`, `GrupKodu` |
| `erisim.Rol.Kod` (isteğe bağlı UQ) | `k(40)` | — (bağ `RolKimlik`) |
| `sistem.IcerikPaketi (Kod, Surum)` | `k(60)`, `k(40)` | `IcerikPaketiKodu`, `IcerikPaketiSurumu` |
| `kvkk.MetinSurumu (MetinKodu, Surum, DilKodu)` | `k(40)`, `k(10)`, `k(5)` | aynı adlar |
| `sistem.Ayar.Anahtar` | `k(80)` | — |
| `makine.Makine.SeriNo` | `k(40)` | `SeriNo`, `KanitSeriNo` (FK'siz) |
| `erisim.Kullanici.GirisAdi` | `k(40)` | `GirisAdiBeyani` (FK'siz) |

### 1.6 Anahtarlar

- **Varlık tabloları** [K] kalıbını kullanır. `Kimlik` değerini telefon çevrimdışıyken UUIDv7 olarak üretebilir; sunucu kendi oluşturduğu satıra UUIDv7 verir; `NEWID()` yalnız betikler için yedektir.
- **Aynı kaydın ikinci kez gelmesi** birincil anahtarla engellenir: aynı `Kimlik` ile ikinci ekleme `2627`; API sahipliği denetleyip var olan satırı döndürür. Ekleme olmayan komutlar (onay, durum değişikliği) `sistem.TekrarAnahtari` kullanır.
- **Kod, katalog, coğrafya, şirket tabloları** doğal anahtarlıdır (kümelenmiş PK).
- **Bağ tabloları** bileşik doğal PK taşır, [K] almaz (`erisim.RolIzin (RolKimlik, IzinKodu)`).
- **Tek üst başına tek satır** (`ParcaTalebiAyrinti.TalepKimlik PK`) doğal PK ile yazılır.
- **Tohumla gelen ve GUID isteyen satırlar** (varsayılan roller) belirlenimci UUIDv5 alır; ad alanı `4b7e2a9c-5d31-4f86-a0c2-9e1d7b3f6a58`, ad metni `<sema>.<Tablo>:<doğal anahtar>` (`erisim.Rol:admin`).
- `CASCADE` ve `SET NULL`/`SET DEFAULT` başvuru eylemleri yoktur. `IDENTITY` yalnız `KayitNo`'da ve `dbo.SemaGecmisi.Kimlik`'te. `NEWSEQUENTIALID()` ve `@@IDENTITY` kullanılmaz.
- **Bileşik FK:** hedefte aynı kolonlardan (aynı sırada) oluşan PK ya da filtresiz `UNIQUE` kısıtı bulunur; FK filtreli dizine başvuramaz (`1776`). Hedef tekillik bu belgede ya da katalogda adıyla yazılır.
- **Değişmeyen kolonlar:** bileşik FK'nin kaynağı olan şu kolonlar satır oluştuktan sonra değişmez, API bunları salt okunur tutar: `Talep.TurKodu`, `Talep.MarkaKodu`, `Talep.ServisKimlik` (bir kez yazılınca), `ServisZiyareti.KapiKodu` ve `AsamaKodu` (hak ediş doğduktan sonra), `HakEdis.SirketKodu`, `HakEdis.ParaBirimiKodu`, `ServisHesapHareketi.SirketKodu`, `ParaBirimiKodu`.
- Her yabancı anahtarın öndeki kolonları bir dizinle karşılanır (CD-FK-DIZIN).

### 1.7 Okunur numaralar

#### 1.7.1 Biçim ve tablolar

- Saklanan: `Onek(3) + YY(2) + Sira(5)`, 10 karakter, tiresiz, büyük harf: `SRV2600123`. Gösterim: `SRV-26-00123` (`gorunum`/`yardim` bunu `<Tur>Numarasi` kolonunda verir: `LEFT(Numara, 3) + N'-' + SUBSTRING(Numara, 4, 2) + N'-' + RIGHT(Numara, 5)`).
- Kolon: `Numara k(10) NOT NULL` + `CK (Numara LIKE N'[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')` + `UNIQUE (Numara)`.
- `sistem.NumaraOneki.Onek`: `CK (Onek LIKE N'[A-HJ-NP-Z][A-HJ-NP-Z][A-HJ-NP-Z]')` (O ve I yok).

| Tablo | Önek | Önek–tür bağı |
|---|---|---|
| `talep.Talep` | `SRV`, `YPR`, `TKF`, `SPS` (ve veriyle eklenecekler) | `NumaraOneki k(3) NOT NULL` + `CK (LEFT(Numara, 3) = NumaraOneki)` + FK `(TurKodu, KaynakKodu, NumaraOneki)` → `kod.TalepNumaraKurali` |
| `hakedis.DonemDokumu` | `HAK` | `CK (LEFT(Numara, 3) = N'HAK')` |
| `musteri.TelefonDegisikligiTalebi` | `TEL` | `CK (LEFT(Numara, 3) = N'TEL')` |
| `musteri.GeriBildirim` | `GBD` | `CK (LEFT(Numara, 3) = N'GBD')` |

- Numara yasal belge numarası değildir; boşluk olabilir. Eski 13 karakterlik numaralar `EskiNumara`'da, cihazın ürettiği numara `talep.Talep.CihazNumarasi`'nda durur; hiçbiri yeniden verilmez.

#### 1.7.2 `sistem.NumaraAl` — tam gövde

```sql
CREATE OR ALTER PROCEDURE sistem.NumaraAl
    @Onek   nvarchar(3),
    @Numara nvarchar(10) OUTPUT,
    @Zaman  datetime2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Zaman IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1)
        THROW 51002, N'zaman yalnız yerel ve sınama ortamında belirtilebilir; diğer ortamlarda zaman belirtmeden yeniden çalıştırın', 1;

    IF NOT EXISTS (SELECT 1 FROM sistem.NumaraOneki
                   WHERE Onek = @Onek COLLATE Latin1_General_100_BIN2 AND Aktif = 1)
        THROW 51003, N'önek bulunamadı ya da pasif; tanımlı ve aktif bir önek kullanın', 1;

    DECLARE @Yil smallint = YEAR(ISNULL(@Zaman, SYSUTCDATETIME())
                                 AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time');
    DECLARE @Sira int;

    BEGIN TRANSACTION;

    UPDATE sistem.NumaraSayaci WITH (UPDLOCK, HOLDLOCK)
       SET @Sira = SonSira = SonSira + 1
     WHERE Onek = @Onek AND Yil = @Yil AND SonSira < 99999;

    IF @@ROWCOUNT = 0
    BEGIN
        IF EXISTS (SELECT 1 FROM sistem.NumaraSayaci WITH (UPDLOCK, HOLDLOCK)
                   WHERE Onek = @Onek AND Yil = @Yil)
            THROW 51001, N'bu önek ve yıl için numara sınırına ulaşıldı; numaralandırma tanımını veritabanı yöneticisiyle kontrol edin', 1;

        SET @Sira = 1;
        INSERT sistem.NumaraSayaci (Onek, Yil, SonSira) VALUES (@Onek, @Yil, 1);
    END;

    COMMIT TRANSACTION;

    SET @Numara = @Onek + RIGHT(CONVERT(nvarchar(4), @Yil), 2)
                + RIGHT(N'0000' + CONVERT(nvarchar(5), @Sira), 5);
END
```

- `TRY/CATCH` kullanılmaz; 2627'yi yakalayıp yeniden deneme yazılmaz (dış işlem `XACT_ABORT ON` iken `3930` verir). İç `BEGIN TRANSACTION` dış işlem yokken de aralık kilidini `INSERT`'e kadar tutar; dış işlem varsa kilit dış işlem bitene kadar sürer.
- API numarayı kaydı ekleyen işlemin içinde alır. Yeni yıl ve yeni önek satırı kendiliğinden açılır; yıl başı işi yoktur.
- `sistem.NumaraSayaci (Onek k(3), Yil smallint, SonSira int CK (SonSira BETWEEN 0 AND 99999), PK (Onek, Yil))`. Uygulama rolü tabloyu göremez; yalnız prosedür yazar (sahiplik zinciri).

#### 1.7.3 Önek seçimi

- Talep: API `kod.TalepNumaraKurali`'ndan `(TurKodu, KaynakKodu, MarkaKodu = talebin markası)` satırını arar; yoksa `MarkaKodu IS NULL` satırını kullanır. Tohumda yalnız genel satırlar vardır (tek seri, KOD 4.8).
- Döküm `HAK`, telefon değişikliği `TEL`, geri bildirim `GBD`: sabit.

#### 1.7.4 Yedek parça ödeme sırası (KOD 4.2.1)

1. Müşteri talebi gönderir; API `YPR` numarasını talep eklenirken, aynı işlemde alır. Cihazda numara üretilmez; ödeme bilgisi ve referans bu adımda gösterilmez (API fazında `RequestForm.jsx` akışı buna göre değişir; ekran metinleri Codex'ten geçer).
2. PAKSAN stoğu, KDV dahil son tutarı ve kargoyu doğrular: `ParcaTalebiAyrinti.KargoTutari`, `OdenecekTutar`, `SonOdemeTarihi` (= Türkiye bugünü + `OdemeBeklemeGunu`), `TutarDogrulama…` yazılır; durum `odemeBekliyor`.
3. Müşteriye ödeme bilgisi gösterilir: IBAN'lar `ParcaTalebiAyrinti.SirketKodu → sirket.BankaHesabi (Aktif = 1)`; alıcı unvanı `sirket.Sirket.Unvan`; referans tiresiz `Numara`.
4. Müşteri dekontu yükler (`talep.Dekont`); muhasebe `OdenecekTutar` ile karşılaştırır; `OdemeOnayi.OnaylananTutar` yazılır; durum `incelemede`.
5. Sevk (`talep.ParcaSevki`), kapanış (`talep.Kapanis`).
6. `SonOdemeTarihi` geçmiş `odemeBekliyor` talebi API iptal eder (`talep.Iptal`, `IptalNedeniKodu = N'odemeSuresiDoldu'`); `gorunum.KontrolOdemeSuresiDolanParca` kaçanları listeler.

### 1.8 Zaman

- Anlar `datetime2(3)` UTC, `DEFAULT SYSUTCDATETIME()`. `datetimeoffset` kullanılmaz.
- Takvim günleri (`…Tarihi`) Türkiye günüdür, `date`.
- `GETDATE()`, `SYSDATETIME()`, `CURRENT_TIMESTAMP`, `GETUTCDATE()` betiklerde yasaktır; yalnız `SYSUTCDATETIME()`.
- Türkiye saatine çevirme (yalnız görünüm, prosedür ve sorgularda; kalıcı hesaplanmış kolonda kullanılamaz):
  - an: `CONVERT(datetime2(0), X AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time')` → `…ZamaniTurkiye`
  - gün: `CONVERT(date, X AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time')` → `…Tarihi`
  - bugün: `gorunum.Bugun.Tarih`
- Gün, ay ve yıl sınırı hesapları (numara yılı, bugün, bu ay, hak ediş dönemi, garanti, son ödeme günü) Türkiye saatine göre yapılır. Hak ediş dönem yılı/ayı, hak edişin onay anının Türkiye günündendir.
- Cihazda oluşan kayıtlar ayrıca [I] taşır; bilgi amaçlıdır.
- Sistem sürümlü dönem kolonları UTC ve `datetime2(7)`'dir; `gorunum`'da ve reçete sorgularında aynı ifadeyle çevrilir.
- `VERITABANI.md`'nin başındaki kural: "Tablolardaki `…Zamani` kolonları UTC'dir; elle bakarken görünümlerdeki `…ZamaniTurkiye` ve `…Tarihi` kolonlarını kullanın."

### 1.9 Para

#### 1.9.1 Genel

- Tutar `decimal(18,2)`; oran `decimal(7,4)` ondalık kesir (0,2000 = %20). Para metin olarak saklanmaz; eski serbest metin ayrı `…Metni` kolonuna gider (`Teklif.GecerlilikMetni`).
- Tutarlı her satırda tek `ParaBirimiKodu k(3)` (FK `kod.ParaBirimi`, tohum `TRY`, eski `TL → TRY`); satırdaki bütün tutarlar o para birimindedir.
- Tutar kolonlarında `CK (x IS NULL OR x >= 0)`; toplam tutarlılığı CK ile (`GenelToplam = AraToplam + KdvTutari`).
- **Kur:** veritabanı para birimi çevirmez ve kur tutmaz. TL karşılığının esas kaynağı LOGO'dur. Görünümler farklı para birimlerini toplamaz; her toplam `ParaBirimiKodu` ile gruplanır. Kur gösterimi gerekirse Bölüm 2.3'teki ek V betiği.
- Muhasebe LOGO'da kalır. Uygulamanın tuttuğu hareketler belgeye bağlı bilgi listesidir; LOGO cari ekstresi esastır (KOD 4.1/11).

#### 1.9.2 Şirketin satıra sabitlenmesi

- `katalog.Marka.SirketKodu` markanın bugünkü şirketidir (sistem sürümlü; değişebilir).
- Parayla ilgili şu satırlar yazılırken `SirketKodu` o anki değerle yazılır ve sonra değişmez: `talep.ParcaTalebiAyrinti` (talebin markasının şirketi), `hakedis.HakEdis` (talebin markasının şirketi), `hakedis.DonemDokumu`, `hakedis.ServisHesapHareketi` (kaynağının şirketi; markasız ödeme hareketinde ödeyen şirket açıkça verilir).
- `sirket.BankaHesabi.SirketKodu` hesabın sahibidir; ödeme ekranı talebin `SirketKodu`'ndan okur.
- Şirket düzeyi KDV ve para birimi `sistem.Ayar` şirket satırındadır (Bölüm 1.15.5).

#### 1.9.3 Hesap hareketi tutarının esası

`hakedis.ServisHesapHareketi.Tutar` **cari etkisidir**: KDV dahil, tevkifat ve stopaj düşülmüş, işaretsiz, `Tutar > 0`; yön `YonKodu`'nda.

| Hareket türü | `Tutar` | Zorunlu bağ |
|---|---|---|
| `hakEdisAlacagi` | `HakEdis.NetTutar + HakEdis.KdvTutari − HakEdis.TevkifatTutari − HakEdis.StopajTutari` | `HakEdisKimlik`; hak ediş `onaylandi` |
| `parcaSiparisiBorcu` | `COALESCE(ParcaTalebiAyrinti.OdenecekTutar, ParcaTalebiAyrinti.GenelToplam)` | `ParcaTalepKimlik` |
| `odeme` | Banka belgesindeki tutar | `DonemDokumuKimlik` ve `BelgeBagiKimlik` (CK) |
| `duzeltmeAlacak`, `duzeltmeBorc` (ters hareket) | Düzeltilen hareketin tutarı; yön onun tersi | `DuzeltilenHareketKimlik` |

- `TR_hakedis_ServisHesapHareketi_Tutar` (`51042`) şunları denetler: `hakEdisAlacagi` ve `parcaSiparisiBorcu` satırında tutar, `SirketKodu` ve `ParaBirimiKodu` kaynağıyla eşit, hak ediş `onaylandi`; `DuzeltilenHareketKimlik` dolu satırda tutar, servis, şirket ve para birimi asılla eşit, yön ters.
- **Uygulamada değişti (17.09.2026):** zorunlu bağlar CHECK'le zorlanır (0.4 hakedis notu); bağı boş satır tetikleyiciye gelmeden `547` verir. 51042 yalnız dolu bağın tutar, şirket ve para birimi eşitliğini denetler.
- **Uygulamada değişti (18.09.2026):** 51042 yalnız hareket **eklenirken** çalışır. Onaydan sonra hak edişin vergi kolonları değişirse hareketin tutarı eski değerde kalır ve iki taraf sessizce ayrışır: `gorunum.ServisBakiyesi` hareketlerden, `hakedis.DonemDokumu` toplamları `HakEdis`'in vergi kolonlarından okur. `TR_hakedis_HakEdis_TutarKilidi` (`51046`) bu aralığı kapatır: hak edişe bağlı **geri alınmamış** `hakEdisAlacagi` hareketi varken `NetTutar`, `KdvOrani`, `KdvTutari`, `TevkifatOrani`, `TevkifatTutari`, `StopajOrani`, `StopajTutari`, `ServisKimlik`, `SirketKodu` ve `ParaBirimiKodu` donar (51042'nin eklenirken denetlediği on kolon). Tutarı düzeltmenin yolu `yonetim.HakEdisOnayiniGeriAl`'dir; o prosedür harekete `GeriAlinmaZamani`'nı `HakEdis`'i güncellemeden önce yazdığı için kilide takılmaz. Haftalık denetim `gorunum.KontrolHakEdisHareketiUyusmuyor`.
- Harekete vergi kolonu eklenmez. `gorunum.ServisHesapHareketleri` KDV hariç tutarı ve vergileri `HakEdis` ve `ParcaTalebiAyrinti`'dan birleştirerek gösterir.
- Geri alma ters harekettir: asıl satır silinmez ve tutarı değişmez; ters satır (`duzeltmeBorc` ya da `duzeltmeAlacak`) `DuzeltilenHareketKimlik` ile asla bağlanır; asıl satıra `GeriAlinmaZamani` yazılır (yalnız NULL'dan dolu değere, bir kez; yalnız `yonetim` prosedürleri). Doğru tutar gerekiyorsa aynı işlemde asılla aynı tür, servis, şirket, para birimi ve bağlarla yeni satır yazılır.
- Bakiye (`gorunum.ServisBakiyesi`) `(ServisKimlik, SirketKodu, ParaBirimiKodu)` başına bütün satırların `alacak − borç` toplamıdır (asıl ve ters satır birbirini sıfırlar); bilgi amaçlıdır.

#### 1.9.4 Hak edişin tutarı

- **Tek kaynak `hakedis.HakEdisKalemi`.** `HakEdis.NetTutar = SUM(HakEdisKalemi.Tutar)` (kalem yoksa 0).
- Kalemleri ve `NetTutar`'ı yalnız iki prosedür yazar (uygulama rolü `HakEdisKalemi`'ne doğrudan yazamaz, `NetTutar`'ı güncelleyemez; yazma sahiplik zinciriyle):
  - `hakedis.HakEdisHesapla @HakEdisKimlik uid`:
    - `HakEdis.DurumKodu <> N'bekliyor'` ise `51043`.
    - Ziyaretin `Km`, `IscilikTutari`, `ParaBirimiKodu` değerlerini ve ziyaretin `TamamlanmaZamani`'nın Türkiye gününde geçerli `hakedis.Tarife` satırını okur: önce `MarkaKodu` = hak edişin markası, yoksa `MarkaKodu IS NULL`; `GecerlilikBaslangicTarihi <= gün AND (GecerlilikBitisTarihi IS NULL OR GecerlilikBitisTarihi >= gün)`.
    - `yol` kalemi: `Miktar = Km`, `BirimKodu` = tarifenin birimi, `BirimTutar` = tarife, `TarifeKimlik`, `Tutar = ROUND(Km * BirimTutar, 0)` (servisKaydi.js:171 ile aynı: tam lira). `Km > 0` ve tarife yoksa `51041`.
    - `iscilik` kalemi: `Tutar = ROUND(IscilikTutari, 0)` (servisKaydi.js:172).
    - Tutarı 0 çıkan `yol`/`iscilik` kalemi yazılmaz, varsa silinir. Başka türdeki kalemler korunur.
    - `NetTutar = SUM(Tutar)`.
  - `hakedis.HakEdisKalemiYaz @HakEdisKimlik uid, @KalemTuruKodu k(40), @Tutar para, @Miktar decimal(9,1) = NULL, @BirimKodu k(40) = NULL`: `yol`/`iscilik` verilirse `51044`; `DurumKodu <> N'bekliyor'` ise `51043`; satırı ekler ya da günceller, `@Tutar = 0` ise siler; sonunda `HakEdisHesapla`'yı çağırır.
- Servis kaydı gönderildiğinde API `HakEdis`'i ekler ve aynı işlemde `HakEdisHesapla`'yı çağırır. PAKSAN düzeltmesi (`ZiyaretDuzeltmesi` + `ServisZiyareti.Km/IscilikTutari` güncellemesi) aynı işlemde `HakEdisHesapla`'yı çağırır. Tekrar ziyaretin 0 tutarlı hak edişine servis masasının girdiği tutar `HakEdisKalemiYaz` ile yazılır (KOD 4.2).
- Onay: API aynı işlemde `DurumKodu = N'onaylandi'`, oranlar, `KdvTutari`, `TevkifatTutari`, `StopajTutari`, onay kolonlarını `SatirSurumu` denetimiyle yazar ve `hakEdisAlacagi` hareketini ekler. `TR_hakedis_HakEdis_Onay`, `onaylandi`ya geçen satırda `NetTutar ≠ SUM(kalem)` ise `51040` verir; `gorunum.KontrolHakEdisToplamiUyusmuyor` bütün satırları haftalık denetler.
- KDV, tevkifat ve stopaj oranları muhasebenin kararıdır; tohumda ayar değerleri NULL başlar ve API boş ayarla onay yapmaz (Bölüm 8).

#### 1.9.5 Aylık döküm

- `hakedis.DonemDokumu` servis × şirket × para birimi × yıl × ay başına bir tanedir (`iptal` hariç).
- `OdenecekTutar = NetToplam + KdvToplam − TevkifatToplam − StopajToplam − MahsupToplam` (CK). `NetToplam`, `KdvToplam`, `TevkifatToplam`, `StopajToplam` döküme bağlı onaylı hak edişlerden; `MahsupToplam` döküme bağlı, `YonKodu = N'borc'` ve `HareketTuruKodu <> N'odeme'` hareketlerin tutar toplamıdır (API döküm `taslak` iken yeniden hesaplar).
- Ters (düzeltme) hareketi döküme bağlanmaz; geri alınan asıl hareketin ve geri alınan hak edişin döküm bağı aynı işlemde kaldırılır. Bağlı olduğu döküm `taslak` değilse ya da belgeye bağlıysa geri alma reddedilir (`51140`).
- Döküme yalnız aynı servis, şirket ve para birimindeki hak edişler ve hareketler bağlanır (dört kolonlu bileşik FK).
- Belgeler (servis faturası, gider pusulası, banka fişi; kısmi ödeme, yeniden kesilen fatura) `hakedis.DonemDokumuBelgesi` bağ tablosundadır; belgenin ne olduğu `entegrasyon.BelgeBagi.BelgeTuruKodu`'ndan okunur. `FaturaGelmeZamani` ve `OdemeZamani` durum zamanı olarak kalır.
- Ödenen tutarın tek kaynağı `odeme` hareketleridir (CK: döküm ve belge zorunlu). Kısmi ödeme gerekirse `kod.DonemDokumuDurumu`'na `kismenOdendi` satırı eklenir (veri).

#### 1.9.6 Garanti süresinin sabitlenmesi

- `makine.MakineSatisi` yazılırken `GarantiYil`, `GarantiBaslangicEsasiKodu`, `GarantiFaturaEkGun` o anki `katalog.MarkaKurallari` değerinden kopyalanır ve sonra değişmez.
- `makine.MakineGarantisi` süreyi ve esası garantiye esas satış satırından okur; o satırın değeri NULL ise `katalog.MarkaKurallari`'na düşer.
- Garantiye esas satış: `IptalZamani IS NULL` olan, `COALESCE(TeslimTarihi, FaturaTarihi)` dolu satırlar içinde en eski `FaturaTarihi` (yoksa `TeslimTarihi`) olan **ilk** satış (KOD 4.7: ilk satış faturası esas).
- **Uygulamada değişti (18.09.2026):** esas satış seçilirken `DogrulamaDurumuKodu <> N'reddedildi'` de aranır. `reddedildi`, PAKSAN'ın o satış ve teslim bilgisini inceleyip kabul etmediği anlamına gelir; kabul edilmemiş bir satırın garanti saatini başlatması, aynı satırın Bölüm 3.3'te satan bayiyi belirlemeye yetmemesiyle çelişirdi (`MakineninBayisi` aynı süzgeci kullanır). `bekliyor` elenmez, yalnız `reddedildi` elenir. Somut etki: 2024-01-10 faturalı reddedilmiş bir satış ile 2025-06-01 faturalı bekleyen bir satış varsa esas satış ikincisidir. Bu süzgeç `makine.MakineGarantisi` görünümünde ve açıklamasında yazılıdır.
- Adımlar: (1) `DogrulamaDurumuKodu = N'onaylandi'` ve `TeslimTarihi` dolu → `teslimOnayli`, başlangıç `TeslimTarihi`; (2) `FaturaTarihi` ve ek gün dolu → `faturaArtiSure`, başlangıç `DATEADD(day, ekGun, FaturaTarihi)`, "doğrulanmadı"; (3) `SeridenUretimYili` dolu → `uretimYili`, başlangıç `DATEFROMPARTS(yil, 1, 1)`, bitiş `DATEFROMPARTS(yil + GarantiYil, 12, 31)` (serial.js:100 "garanti bu yılın sonuna kadar sürer": `year + GARANTI_YIL`); (4) `bilinmiyor`. (1) ve (2)'de bitiş `DATEADD(day, -1, DATEADD(year, GarantiYil, baslangic))`.
- Doğrulama durumu (`DogrulamaDurumuKodu`) garanti **dayanağını** belirleyen tek şeydir: `onaylandi` + `TeslimTarihi` → `teslimOnayli`, değilse `faturaArtiSure` ("doğrulanmadı"). `bekliyor` hiçbir yerde satır elemez — ne garantide ne servis zincirinde (Bölüm 3.3 `MakineninBayisi`). `reddedildi` iki yerde de satırı eler (yukarıdaki 18.09.2026 notu).

#### 1.9.7 Yedek parça talebinde tutarlar

- Müşterinin gördüğü görüntü: `ParcaTalebiAyrinti.AraToplam`, `KdvTutari`, `GenelToplam`, `FiyatListesiKodu`, `KdvOrani`, `ListeKdvHaric` ve `talep.ParcaSatiri` satırları; talep eklendikten sonra değişmez.
- PAKSAN'ın doğruladığı tutar: `KargoTutari`, `OdenecekTutar` (KDV ve kargo dahil son tutar), `SonOdemeTarihi`, `TutarDogrulamaZamani`, `TutarDogrulayanKullaniciKimlik`, `TutarDogrulayanAdi`; dördü birlikte dolu ya da birlikte boş (CK).
- `talep.OdemeOnayi.OnaylananTutar` ve `ParaBirimiKodu` zorunludur; muhasebe `OdenecekTutar` ile karşılaştırır. Uyuşmayanlar `gorunum.KontrolOdemeTutariUyusmayanParca`'dadır.
- Stokta olmayan satır ya da kısmi sevk için satır düzeyi kolon açılmaz; PAKSAN doğrulamasında `OdenecekTutar` gönderilebilecek satırlara göre yazılır ve açıklama `talep.TalepNotu`'na (`MusteriGorur = 1`) girer.

### 1.10 Eşzamanlılık

- Veritabanı `READ_COMMITTED_SNAPSHOT ON`, `ALLOW_SNAPSHOT_ISOLATION OFF`.
- `NOLOCK`, `READUNCOMMITTED`, `TABLOCKX` ipuçları yasaktır.
- [R] `SatirSurumu` taşıyan tablolar: `talep.Talep`, `talep.ServisZiyareti`, `talep.FaturaBilgisi`, `hakedis.HakEdis`, `hakedis.DonemDokumu`, `musteri.Hesap`, `musteri.TelefonDegisikligiTalebi`, `musteri.GeriBildirim`, `servis.Servis`, `servis.FaturaBilgisi`, `bayi.Bayi`, `personel.Personel`, `erisim.Kullanici`, `makine.Makine`, `duyuru.Duyuru`.
- Onay ve durum komutları `UPDATE … WHERE Kimlik = @Kimlik AND SatirSurumu = @SatirSurumu AND DurumKodu = N'bekliyor'` biçimindedir; 0 satır başkasının önce davrandığı anlamına gelir.
- `sistem.TekrarAnahtari` ekleme olmayan komutların ikinci kez işlenmesini önler. Numara sayacı Bölüm 1.7.2'deki kilitle korunur.

### 1.11 Geçmiş

#### 1.11.1 Sistem sürümlü (temporal) tablolar

Liste (başka tablo sistem sürümlü yapılmaz): `katalog.Marka`, `katalog.Urun`, `katalog.Parca`, `sirket.Sirket`, `sirket.BankaHesabi`, `personel.Personel`, `erisim.Rol`, `erisim.RolIzin`, `bayi.Bayi`, `bayi.MarkaYetkisi`, `servis.Servis`, `servis.BayiBagi`, `servis.Bolge`, `servis.MarkaYetkisi`, `sistem.Ayar`, `hakedis.Tarife`.

- Dönem kolonları: `GecerlilikBaslangici datetime2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL`, `GecerlilikBitisi datetime2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL`, `PERIOD FOR SYSTEM_TIME (GecerlilikBaslangici, GecerlilikBitisi)`.
- `WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = gecmis.<sema>_<Tablo>, DATA_CONSISTENCY_CHECK = ON))`; geçmiş tablosu motor tarafından oluşturulur. `HISTORY_RETENTION_PERIOD` kullanılmaz.
- **Uygulamada değişti (17.09.2026):** motorun açtığı geçmiş tablosu dizini `ix_<sema>_<Tablo>` adlı ve `PAGE` sıkıştırmalıdır; Bölüm 1.3.5 istisnası.
- Sistem sürümlü tabloda `INSTEAD OF` tetikleyici kurulamaz; koruma `AFTER` tetikleyiciyle ya da yetkiyle yapılır. Kalıcı hesaplanmış kolon, `rowversion`, filtreli tekil dizin ve FK kullanılabilir (hesaplanmış kolonlu FK sınandı).
- Müşteri verisi (hesap, talep, fatura bilgisi, cari kart) sistem sürümlü yapılmaz: anonimleştirme geçmişi temizleyemezdi. `erisim.Kullanici` şifre özeti taşıdığı için sistem sürümlü değildir.
- Sonraki V betiklerinde sistem sürümlü tabloya boş olabilir ya da varsayılanlı kolon sürümleme açıkken eklenir (motor geçmiş tablosuna da ekler). Kolon silmek ya da tip değiştirmek kural gereği yapılmaz (Bölüm 2.1 E11). Zorunlu bir yapısal değişiklikte kalıp: `ALTER TABLE … SET (SYSTEM_VERSIONING = OFF)` → iki tabloda aynı değişiklik → `SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = …, DATA_CONSISTENCY_CHECK = ON))`, hepsi tek V betiğinde; `VERITABANI.md`'de yazılı.
- Geçmiş sorgusu reçetesi: `SELECT …, CONVERT(datetime2(0), GecerlilikBaslangici AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicTurkiye FROM <sema>.<Tablo> FOR SYSTEM_TIME ALL WHERE …`.

#### 1.11.2 Açık geçmiş tabloları

İş anlamı taşıyan dönemler ayrı satırlarla tutulur: `makine.MakineSahipligi`, `makine.MakineServisAtamasi`, `makine.MakineSatisi` (iptal edilen satış silinmez, `IptalZamani`), `musteri.HesapTelefonGecmisi`, `talep.DurumGecmisi` (yalnız `TR_talep_Talep_DurumGecmisi` yazar), `talep.ZiyaretDuzeltmesi` + `talep.ZiyaretDuzeltmesiParcasi`, `talep.YenidenAcma`, `talep.Iptal`, `talep.Kapanis` (her döngü ayrı satır), `kvkk.RizaOlayi` (yalnız ekleme), `denetim.IslemKaydi` (yalnız ekleme).

### 1.12 JSON kullanımı ve yazma sözleşmeleri

JSON yalnız aşağıdaki kolonlarda, `nvarchar(max)` + `CK (x IS NULL OR ISJSON(x) = 1)` ile:

| Kolon | İçerik | Kural |
|---|---|---|
| `bildirim.Bildirim.DegerlerJson` | Sözlük şablonu parametreleri | Hesabın anonimleştirilmesinde `N'{}'` |
| `denetim.IslemKaydi.AyrintiJson` | İşlem türüne göre ayrıntı | Müşterinin adı, telefonu, adresi, TC/VKN/IBAN yazılmaz (müşteri yerine `HesapKayitNo`); `yonetim` kayıtlarında `gerekce`, `sqlGirisi`, `bilgisayar` zorunlu |
| `entegrasyon.LogoSeriSorgusu.CevapJson` | Ham dış cevap | Saklama kuralıyla silinir |
| `entegrasyon.IceAktarimSatiri.HamVeriJson` | Excel satırı | TC, VKN, IBAN düz yazılmaz: yerine maskeli değer ve `…Ozeti` ile aynı HMAC; saklama kuralıyla ve anonimleştirmede boşaltılır |
| `sistem.TekrarAnahtari.SonucJson` | Önbelleğe alınmış cevap | TC, VKN, IBAN, doğrulama kodu, jeton içeremez |
| `sistem.Giden.DegiskenlerJson` | Şablon değişkenleri | Kod ya da bağlantı taşıyan satırda NULL (Bölüm 1.14.3) |
| `kvkk.MetinSurumu.IcerikJson` | Bölümlü yasal metin | Değişmez |
| `sistem.Ayar.Deger` (`DegerTuru = N'json'`) | Liste ayarı | Tür CHECK'i |

Başka her şey normalleştirilir; yabancı anahtar gerektiren liste JSON'da tutulmaz.

#### 1.12.1 Bildirim yazma kuralları (şema değişmeden)

- Hesabı dolu her talep eklenirken aynı işlemde bir `bildirim.Bildirim` (`AliciTuruKodu = N'musteri'`, `TurKodu = N'talep'`, `BaslikAnahtari = N'bildirimler.talepAlindi'`, `TalepKimlik`) ve onun `bildirim.Teslimat` satırı yazılır.
- Randevu planlanınca ya da değiştirilince `TurKodu = N'randevu'` olan `Bildirim` + `Teslimat` yazılır. Görünme aralığı etkin `talep.Randevu` satırından ve `sistem.Ayar` `RandevuHatirlatmaOnceSaati` (24) / `RandevuHatirlatmaSonraSaati` (12) değerlerinden hesaplanır; talep başına yalnız en son randevu bildirimi gösterilir (bildirimler.js:47-97).
- Okundu bilgisi `Teslimat.OkunmaZamani`, pencerede görülme `Teslimat.GorulmeZamani`'dır.

### 1.13 Silme, arşiv, saklama ve anonimleştirme

#### 1.13.1 Silinmeyen iş kayıtları

| Kayıt | Silme yerine |
|---|---|
| Talep | İptal (`talep.Iptal` + iptal durumu) |
| Servis, bayi | `DurumKodu = N'pasif'` + `PasifZamani` |
| Personel | `erisim.Kullanici.Aktif = 0` + `personel.Personel.AyrilmaZamani` (aynı işlemde; giriş açıklığının tek kaynağı `Kullanici.Aktif`; çalışıyor mu `AyrilmaZamani IS NULL`) |
| Rol | `Aktif = 0` (rolün personeli taşınır) |
| Makine sahipliği, servis ataması, marka yetkisi | `BitisZamani` |
| Makine satışı | `IptalZamani` |
| Duyuru | `YayindanKaldirmaZamani` |
| Dekont, dosya | `GecersizZamani` + `GecersizNedeni` |
| Ödeme onayı | `GeriAlinmaZamani` |
| Hesap hareketi | Ters hareket (`DuzeltilenHareketKimlik`) + asılda `GeriAlinmaZamani` |
| Müşteri hesabı | `kapali`, `anonim` ya da `birlestirildi` |
| Kod, izin, katalog satırı | `Aktif = 0` |

#### 1.13.2 Uygulamanın silebildiği bağ satırları

Uygulama rolünün `DELETE` izni yalnız: `erisim.RolIzin`, `servis.Bolge`, `servis.BayiBagi`, `talep.TalepGizleme`, `duyuru.HedefMarka`, `duyuru.HedefIl`, `duyuru.HedefIlce`, `duyuru.HedefServis`, `duyuru.HedefUrun`, `duyuru.HedefSeri` (yayından önce; API kuralı). Taslaktaki `sistem.TekrarAnahtari` ve `erisim.GirisDenemesi` DELETE izni kaldırıldı (temizlik `sistem.SaklamaUygula`).

#### 1.13.3 Yalnız prosedürün yazdığı, değiştirdiği ya da sildiği satırlar

| Satır | Prosedür |
|---|---|
| `hakedis.HakEdisKalemi` her değişiklik; `HakEdis.NetTutar` | `hakedis.HakEdisHesapla`, `hakedis.HakEdisKalemiYaz` |
| `hakedis.ServisHesapHareketi.GeriAlinmaZamani` | `yonetim.HakEdisOnayiniGeriAl`, `yonetim.HesapHareketiniDuzelt` |
| Saklama süresi dolan satırlar | `sistem.SaklamaUygula` |
| Müşteri kişisel alanları | `musteri.HesabiAnonimlestir`, `yonetim.KisiselVerileriAnonimlestir` |
| `entegrasyon.CariKarti` müşteri satırlarının silinmesi | `musteri.HesabiAnonimlestir` |
| Hesap birleştirme | `yonetim.HesaplariBirlestir` |
| Şifre özeti | `erisim.SifreYaz`, `musteri.SifreYaz` |
| `sistem.NumaraSayaci` | `sistem.NumaraAl` |
| `talep.DurumGecmisi` | `TR_talep_Talep_DurumGecmisi` |

`talep.ZiyaretParcaSatiri` hiç değişmez (yalnız ekleme); düzeltme sonrası liste `talep.ZiyaretGuncelParcasi` görünümündedir.

#### 1.13.4 Saklama süreleri

- Kurallar `sistem.SaklamaKurali`'nda veri olarak durur (T08, `HukukOnayli = 0`). Uygulayan `sistem.SaklamaUygula @EnFazlaSatir int = 5000` (dbo sahipli; uygulama rolü yalnız EXECUTE; günlük çağrıyı API ya da işletim sistemi zamanlayıcısı yapar, Express'te Agent yok).
- `SureGun IS NULL` ya da `EylemKodu = N'sakla'` → kural atlanır. `HukukOnayli` bilgi amaçlıdır; kuralın uygulanmasını değiştirmez (Bölüm 8 #5).
- Her kural için gövdede sabit yazılı (dinamik olmayan) bir `DELETE TOP (@EnFazlaSatir)` ya da `UPDATE TOP (@EnFazlaSatir)`; süre `SureGun`'dan okunur. Silme sırası FK'lere uyar.

| `KayitTuruKodu` | Tablo ve kapsam | Zaman ölçütü | Eylem | Tohum süresi |
|---|---|---|---|---|
| `girisDenemesi` | `erisim.GirisDenemesi` | `DenemeZamani` | sil | 90 gün |
| `dogrulamaKodu` | `erisim.DogrulamaKodu` | `OlusmaZamani` | sil | 30 gün |
| `sifreSifirlamaJetonu` | `erisim.SifreSifirlamaJetonu` | `SonGecerlilikZamani` | sil | 30 gün |
| `oturum` | `erisim.Oturum` (kapanmış ya da süresi bitmiş) | `COALESCE(KapanmaZamani, BitisZamani)` | sil | 365 gün |
| `destekOturumu` | önce `destek.SohbetOlayi`, sonra olayı kalmayan `destek.SohbetOturumu` | `SohbetOturumu.SonHareketZamani` | sil | 730 gün |
| `giden` | `sistem.Giden` (`DurumKodu IN (N'gonderildi', N'vazgecildi')`): `bildirim.Teslimat` ya da `erisim.DogrulamaKodu` bağlı satırda yalnız `Govde`, `Konu`, `DegiskenlerJson`, `AliciAdres` → NULL; bağsız satırda önce `sistem.GidenEki`, sonra `sistem.Giden` silinir | `COALESCE(GonderilmeZamani, OlusmaZamani)` | sil | 180 gün |
| `tekrarAnahtari` | `sistem.TekrarAnahtari` | `SonGecerlilikZamani` | sil | 1 gün |
| `logoSeriSorgusu` | `entegrasyon.LogoSeriSorgusu` (`makine.KayitOlayi`'nın başvurmadığı) | `GecerlilikBitisZamani` | sil | 30 gün |
| `iceAktarimSatiri` | `entegrasyon.IceAktarimSatiri.HamVeriJson` → NULL (içe aktarım `uygulandi`/`hata`) | `IceAktarim.OlusmaZamani` | bosalt | 90 gün |
| `iptalTalepDosyasi` | `dosya.Dosya` (`iptal` durumundaki talebin `TalepEki`/`EklemeEki`/ses dosyaları; `SaklamaSinifiKodu = N'genel'`): satır silinmez, `SilinmeIstendiZamani` yazılır | `Talep.KapanmaZamani` | sil | 730 gün |
| `dekont` | `dosya.Dosya` (`dekont`) | — | sakla | NULL |
| `islemKaydi` | `denetim.IslemKaydi` | — | sakla | NULL |
| `rizaOlayi` | `kvkk.RizaOlayi` | — | sakla | NULL |

- Her çalışmada kural başına etkilenen satır sayısı tek bir `denetim.IslemKaydi` satırına yazılır: `IslemTuruKodu = N'saklamaUygulandi'`, `YapanTuruKodu = N'sistem'`, `KaynakUygulamaKodu = N'api'`, `AyrintiJson = {"kurallar":[{"kayitTuru":"…","satir":n}]}` (imha kaydı).
- Dekont ve işlem kaydı korumaları değişmez (`dosya.Dosya` dekont CK'si, `TR_denetim_IslemKaydi_Koruma`). Hukukçu süre verirse ayrı V betiğiyle gevşetilir.
- Dosyanın diskten silinmesi API işidir: `SilinmeIstendiZamani` dolu, `DiskSilinmeZamani` boş satırları siler ve `DiskSilinmeZamani`'nı yazar.

#### 1.13.5 Anonimleştirme kapsamı

`musteri.HesabiAnonimlestir @HesapKimlik uid` (iç prosedür; uygulama rolü EXECUTE alır; SSMS'ten `yonetim.KisiselVerileriAnonimlestir` çağırır). Hesap `birlestirildi` zincirindeyse zincirdeki bütün hesaplara uygulanır. Tek işlemde:

| Tablo | Yapılan |
|---|---|
| `musteri.Hesap` | `TelefonE164`, `TelefonUlusal`, `TelefonUlkeKodu`, `SifreKaydi`, `Adres`, `YurtdisiBolge`, `YurtdisiIlce`, `SaticiBeyani` → NULL; `DurumKodu = N'anonim'`; `AnonimlestirmeZamani`. `KonumUlkeKodu`, `IlKodu`, `IlceKodu` istatistik için kalır |
| `musteri.HesapKisisi` | `Adi`, `Soyadi`, `TelefonE164`, `TelefonUlusal` → NULL; `PasifZamani` |
| `musteri.HesapTelefonGecmisi` | `TelefonE164` → NULL |
| `musteri.TelefonDegisikligiTalebi` (hesabın) | `BeyanAdi`, `EskiTelefonE164`, `YeniTelefonE164`, `KanitSeriNo` → NULL |
| `musteri.GeriBildirim` (hesabın) | `IletisimAdi`, `IletisimTelefonE164` → NULL; `Metin` → anonim metni |
| `musteri.GeriBildirimNotu` (hesabın geri bildirimlerinde) | `Metin` → anonim metni |
| `talep.Talep` (hesabın) | `IletisimAdi`, `IletisimTelefonE164`, `IletisimTelefonUlusal`, `Adres`, `YurtdisiBolge`, `YurtdisiIlce` → NULL; `Aciklama` → anonim metni |
| `talep.TalepNotu`, `talep.Iptal.Aciklama`, `talep.Kapanis.KapanisNotu` ve `YapilanIsMetni`, `talep.YenidenAcma.Aciklama`, `talep.Ekleme.EklemeNotu` (hesabın taleplerinde) | Anonim metni (kod, tarih, tutar ve parça kolonları istatistik için kalır) |
| `talep.ServisZiyareti` (hesabın taleplerinde) | **Uygulamada değişti (17.09.2026):** `ArizaMetni`, `SonucMetni` → anonim metni. Neden: ServisKapanisi.jsx:137 `ArizaMetni`'ni müşterinin talep açıklamasıyla dolduruyor (`onceki?.ariza || talep.aciklama`); servisin yazdığı sonuç notu ad ve adres taşıyabilir |
| `talep.Randevu` (hesabın taleplerinde) | **Uygulamada değişti (17.09.2026):** `IsTanimi` → NULL |
| `talep.Teklif.TeklifNotu`, `talep.Devir.Neden` (hesabın taleplerinde) | **Uygulamada değişti (17.09.2026):** anonim metni |
| `talep.ParcaTalebiAyrinti` | `TeslimatAdresi` → NULL |
| `talep.FaturaBilgisi` | `AdSoyad`, `Unvan`, `TcNo…`, `VergiNo…`, `VergiDairesi`, `Eposta`, [F], [Y] adres alanları → NULL |
| `makine.MakineSahipligi` | Açık sahiplik `BitisZamani`, `BitisNedeniKodu = N'anonimlestirme'`; bütün satırlarda `TakmaAd` → NULL |
| `makine.KayitOlayi` (hesabın ya da hesabın makinelerinin) | `BeyanAdi` → NULL |
| `bildirim.Bildirim` (alıcısı hesap) | `SerbestMetin` → anonim metni; `DegerlerJson` → `N'{}'` |
| `bildirim.Cihaz` (hesabın) | `PushJetonu`, `PushJetonuOzeti` → NULL; `PasifZamani` |
| `erisim.Oturum` (hesabın) | Açıklar `anonimlestirme` nedeniyle kapanır; bütün satırlarda `IpAdresi`, `KullaniciAjani` → NULL |
| `erisim.DogrulamaKodu` | `HesapKimlik` bu hesap olan ya da `TelefonE164` hesabın (temizlenmeden önceki) telefonlarından biri olan satırlarda `TelefonE164` → NULL |
| `sistem.Giden` | `AliciHesapKimlik` bu hesap olan ya da `IlgiliKimlik` hesabın bir talebi olan satırlarda `AliciAdres`, `Konu`, `Govde`, `DegiskenlerJson` → NULL |
| `destek.SohbetOlayi` (hesabın oturumları) | Bütün olaylarda `Deger` → NULL |
| `dosya.Dosya` | Hesabın taleplerine, eklemelerine, ziyaretlerine bağlı dosyalar (`TalepEki`, `EklemeEki`, ses, `ZiyaretFotografi`, `Kapanis.ServisFisiDosyaKimlik`) ve alıcısı bu hesap olan `MakineSatisi.BelgeDosyaKimlik`: `OrijinalAd` → NULL, `SaklamaSinifiKodu = N'genel'` olanlarda `SilinmeIstendiZamani`. Dekont sınıfı saklama kuralını bekler |
| `entegrasyon.CariKarti` | Hesabın satırları silinir. **Uygulamada değişti (17.09.2026):** sıra: önce `UPDATE entegrasyon.BelgeBagi SET CariKartiKimlik = NULL WHERE CariKartiKimlik IN (<hesabın kartları>)`, sonra `DELETE`. Neden: `BelgeBagi.CariKartiKimlik` FK'si (`SET NULL` yasak, Bölüm 1.6) belgeli kartta (satış faturası, iade) `547` verir ve anonimleştirme bütünüyle geri alınırdı |
| `entegrasyon.IceAktarimSatiri` | `EslesenKimlik` bu hesap ya da hesabın makine satışı olan satırlarda `HamVeriJson` → NULL |
| `kvkk.RizaOlayi`, `denetim.IslemKaydi`, `kvkk.BasvuruTalebi` | Kalır (yasal kanıt) |

- "Anonim metni" tek sabittir: `N'anonimleştirildi'` (5–1000 karakter CK'lerine uyar; Codex'ten 19.09.2026'da geçti, bkz. R05__hakedis_musteri_prosedurleri.sql).
- `yonetim.KisiselVerileriAnonimlestir @Telefon` telefonu E.164'e çevirir; hesap(lar) bulunursa `musteri.HesabiAnonimlestir`'i çağırır; ayrıca aynı telefonlu **hesapsız** satırları temizler: `talep.Talep` (`HesapKimlik IS NULL`; iletişim, adres, `Aciklama`, alt tabloların serbest metinleri, varsa `FaturaBilgisi`, `ParcaTalebiAyrinti.TeslimatAdresi`), `musteri.TelefonDegisikligiTalebi` (eski ya da yeni telefon eşleşen; telefon ve ad alanları), `musteri.GeriBildirim` (iletişim alanları, `Metin`), `sistem.Giden` (`AliciAdres` eşleşen), `erisim.DogrulamaKodu`, bu taleplerin makinelerindeki `makine.KayitOlayi.BeyanAdi`. Tablo başına etkilenen satır sayısını döndürür.
- **Uygulamada değişti (17.09.2026):** hesapsız taleplerin "alt tablolarının serbest metinleri" `talep.ServisZiyareti.ArizaMetni`/`SonucMetni` (anonim metni), `talep.Randevu.IsTanimi` (NULL), `talep.Teklif.TeklifNotu` ve `talep.Devir.Neden` (anonim metni) dahildir.
- `denetim.IslemKaydi` sözleşmesi: `CK (YapanTuruKodu <> N'musteri' OR IpAdresi IS NULL)`; müşteri IP'si yalnız `erisim.Oturum`'da, saklama süresi boyunca durur.

### 1.14 Şifreleme ve özetler

#### 1.14.1 TC, VKN, IBAN

- Uygulama tarafında AES-256-GCM. `…Sifreli varbinary(512)` düzeni: `[1 bayt biçim][1 bayt anahtar no][12 bayt IV][şifreli metin][16 bayt etiket]`.
- Eşleştirme için `…Ozeti binary(32)` = HMAC-SHA256(`PAKSAN_ARAMA_ANAHTARI`, normalleştirilmiş değer).
- Liste ekranları için `…Maskeli k(40)` (`*********45`, `TR** **** … 12`).
- `AnahtarNo tinyint` satırın hangi anahtarla şifrelendiğini söyler (anahtar döndürme).
- Kolonlar: `talep.FaturaBilgisi (TcNo…, VergiNo…)`, `servis.FaturaBilgisi (VergiNo…, Iban…)`.
- Anahtarlar veritabanında ve depoda değildir; API'nin ortam dosyasındadır. Always Encrypted ve TDE kullanılmaz. Şirketin kendi IBAN'ı ve VKN'si açık bilgidir (`sirket.*` düz metin).
- TC görüntüleme (`kimlikNo` izni) her seferinde `denetim.IslemKaydi` `tcVergiNoGoruntulendi` satırı yazar (`IlgiliNumara` = talep numarası).

#### 1.14.2 Şifre özeti

- PHC dizgisi `$scrypt$ln=15,r=8,p=1$<tuz>$<özet>`; girdi `HMAC-SHA256(PAKSAN_SIFRE_BIBERI, şifre)`. Node `node:crypto.scrypt` üretir; T-SQL üretmez.
- `SifreKaydi k(255) NULL`, `CK (SifreKaydi IS NULL OR SifreKaydi LIKE N'$%$%')`.
- Uygulama rolü `SifreKaydi` kolonunu doğrudan güncelleyemez; yazma yalnız `erisim.SifreYaz` ve `musteri.SifreYaz` ile.
- Eski cihaz özetleri taşınmaz; herkes ilk girişte doğrulanmış yolla şifre belirler (Bölüm 1.14.4).
- Müşteri girişinde kilit kolonu yoktur; API `erisim.GirisDenemesi`'nden (`TanimlayiciOzeti`, `IpAdresi`) personel ve servisle aynı eşiklerle yavaşlatır.

#### 1.14.3 Tek kullanımlık kodlar ve giden kuyruğu

- `erisim.DogrulamaKodu.KodOzeti = HMAC-SHA256(PAKSAN_DOGRULAMA_ANAHTARI, amaç + N'|' + telefonE164 + N'|' + kod)`. Anahtarsız SHA-256 yasaktır (6 haneli kod anında çözülür).
- `erisim.SifreSifirlamaJetonu.JetonOzeti = SHA-256(jetonun ASCII baytları)` (jeton en az 128 bit ya da Bölüm 1.14.4'teki 16 karakter; anahtarsız özet yeterli).
- Kod ya da bağlantı taşıyan mesaj `sistem.Giden`'e gövdesiz yazılır: API metni bellekte kurar ve sağlayıcıya doğrudan gönderir; `Giden` satırı yalnız kanal, alıcı, şablon, durum ve teslim izini tutar. CHECK: `IlgiliKayitTuruKodu IS NULL OR IlgiliKayitTuruKodu NOT IN (N'dogrulamaKodu', N'sifreSifirlamaJetonu') OR (Govde IS NULL AND Konu IS NULL AND DegiskenlerJson IS NULL)`. API bu mesajlarda `IlgiliKayitTuruKodu`'nu doldurmak zorundadır. Başarısız gönderim yeniden denenmez; kullanıcı yeni kod ister. Gizli içerik taşıyan yeni bir kayıt türü doğarsa bu CHECK ek V betiğiyle genişletilir.
- Rastgelelik: T-SQL'de `CRYPT_GEN_RANDOM`, Node'da `node:crypto`. `NEWID()`/`RAND()` güvenlik için kullanılmaz.

#### 1.14.4 Şifre yazma kuralı

- `erisim.SifreYaz @KullaniciKimlik uid, @SifreKaydi k(255), @JetonKimlik uid = NULL`:
  - Hedefin `SifreKaydi IS NULL` ya da `SifreBelirlemeGerekli = 1` ise `@JetonKimlik` zorunludur. Jeton aynı kullanıcıya ait, `KullanilmaZamani IS NULL`, `IptalZamani IS NULL`, `SonGecerlilikZamani > SYSUTCDATETIME()` olmalıdır; değilse `51030`.
  - Aynı işlemde jetonun `KullanilmaZamani` yazılır, kullanıcının öteki açık jetonları `IptalZamani` alır, `SifreBelirlemeGerekli = 0`, `SifreDegistirmeZamani`, açık oturumlar `sifreDegisti` nedeniyle kapanır.
- `musteri.SifreYaz @HesapKimlik uid, @SifreKaydi k(255), @DogrulamaKoduKimlik uid = NULL`:
  - Hedefin `SifreKaydi IS NULL` ise `@DogrulamaKoduKimlik` zorunludur; verilmişse her durumda denetlenir. Kod `AmacKodu IN (N'kayit', N'sifreSifirlama')`, `TelefonE164` hesabın telefonu, `KullanilmaZamani` dolu ve son 15 dakika içinde, hesabın `SifreDegistirmeZamani` NULL ya da kodun `KullanilmaZamani`'ndan önce olmalıdır (aynı kodla ikinci yazma böylece reddedilir); değilse `51030`.
- `yonetim.GirisSifresiniSifirla` (Bölüm 3.5.2): `SifreKaydi = NULL`, `SifreBelirlemeGerekli = 1`, açık oturumlar kapanır, öteki açık jetonlar iptal edilir; `CRYPT_GEN_RANDOM` ile alfabesi `23456789ABCDEFGHJKMNPQRSTUVWXYZ` olan 16 karakterlik kod üretilir, `XXXX-XXXX-XXXX-XXXX` biçiminde bir kez döndürülür; `erisim.SifreSifirlamaJetonu`'na yalnız `HASHBYTES('SHA2_256', CAST(<tiresiz büyük harf kod> AS varchar(16)))` yazılır, geçerlilik 1 saat. API girilen kodu tire ve boşluktan arındırıp büyük harfe çevirir, aynı ASCII baytları özetler.
- `npm run vt -- ilk-yonetici` ve pilotta açılan bütün personel/servis girişleri aynı yolu kullanır: `SifreKaydi = NULL`, `SifreBelirlemeGerekli = 1`, tek kullanımlık kod. Tohumda ve örnek veride bilinen şifre yoktur. Veritabanı ortam dosyasına şifre biberi girmez.

### 1.15 Kod listeleri, çeviri ve ayarlar

#### 1.15.1 Kod listesi biçimi [L]

```
Kod       k(n)   NOT NULL  PRIMARY KEY CLUSTERED     -- n Bölüm 1.5
          CK (LEN(Kod) >= 2 AND Kod NOT LIKE N'%[^A-Za-z0-9]%')
Ad        m(150) NOT NULL          -- Türkçe etiket
Sira      smallint NOT NULL DEFAULT 0
Aktif     bit NOT NULL DEFAULT 1
Aciklama  m(400) NULL
+ listeye özgü kolonlar (bayraklar, bağlar)
```

- Kodlar İngilizce harfli camelCase (`parcaBekliyor`); ISO kodları olduğu gibi (`TRY`, `tr`, `TR`).
- `Ad` `src` dosyasındaki etiketten kopyalanır (Codex'ten geçmiş metin). Kaynakta etiketi olmayan kodun `Ad`'ı `tohum/kaynak/kod-adlari.json`'dan gelir; o dosyaya metin Codex'ten geçerek girer. `Ad`'ı olmayan kod için üretici durur.
- Kod kolonlarında varsayılan değer yoktur (bilinmeyen değer FK hatası verir). İstisnalar: `MarkaKodu DEFAULT N'paksan'` (plan) ve Bölüm 1.17.4'teki sabit `UyduKodu` kolonları.
- **Uygulamada değişti (17.09.2026):** `MarkaKodu` kolonlarında da varsayılan yoktur; bir önceki maddedeki `MarkaKodu DEFAULT N'paksan'` istisnası kaldırıldı (23 `DF_*_MarkaKodu`, katalog tabloları dahil). Unutulan marka `515` verir. Neden: `servis.MarkaYetkisi`/`bayi.MarkaYetkisi`'nde unutulan marka servise ya da bayiye PAKSAN yetkisi veriyor (o servise atama açılıyordu); makinesiz `talep.Talep` (telefon, parça talebi) ve yeni `makine.Makine` satırında uyuşmazlığı yakalayan bir şey yoktu; motor şemasına marka adı yazılmaz (CLAUDE.md marka sınırı, PLAN-COKLU-MARKA). Tohum betikleri markayı her satırda açıkça yazar. R betiklerinde de marka varsayılanı düz yazılmaz: `yonetim` prosedürlerinde `@MarkaKodu` varsayılanı NULL'dur; seri tek markada bulunursa o marka kullanılır, birden çok markada bulunursa `51103` (Bölüm 3.1.5, 3.5.2).
- Satır silinmez; `Aktif = 0`.

#### 1.15.2 Eski değer eşleşmesi

`kod.EskiDegerEslesmesi (ListeAdi k(128), EskiDeger k(200), YeniKod k(60), EslesmeNotu m(400) NULL, PK (ListeAdi, EskiDeger))`. `ListeAdi` biçimi `<sema>.<Tablo>`. Ekran yazısıyla saklanmış eski değerler (`Fark etmez`, `Ayar Yapıldı`) ve eski kodlar (`gonderildi`, `bayide`, `eldeParca`, `app`, `excel`) burada koda çevrilir. `ListeAdi`'nin gerçek bir tablo, `YeniKod`'un o tabloda var olduğu canlı denetimle (CD-CEVIRI) doğrulanır.

#### 1.15.3 Çeviri

- `kod.Ceviri`:

```
ListeAdi  k(128) NOT NULL          -- <sema>.<Tablo>
Kod       k(60)  NOT NULL
AlanAdi   k(40)  NOT NULL  DEFAULT N'Ad'
DilKodu   k(5)   NOT NULL  FK kod.Dil   CK (DilKodu <> N'tr')
Metin     c(1000) NOT NULL
PRIMARY KEY (ListeAdi, Kod, AlanAdi, DilKodu)
```

  Tek kolon anahtarlı bütün listeler burayı kullanır: `kod.*`, `cografya.Ulke` (`Ad`), `katalog.Kategori` (`Ad`, `KisaAd`). `(ListeAdi, Kod)`'un hedef tabloda var olduğu ve `AlanAdi`'nin o tablonun metin kolonu olduğu canlı denetimle (CD-CEVIRI) sağlanır.
- Bileşik anahtarlı katalog satırları FK'li kendi çeviri tablolarını alır; PK = kaynak anahtar + `DilKodu`; metin kolonları `c(n)`:
  - `katalog.UrunCevirisi (MarkaKodu, UrunKodu, DilKodu, Ad c(100) NULL, Slogan c(200) NULL, Aciklama nvarchar(max) LCI NULL)`
  - `katalog.BakimAdimiCevirisi (SablonKodu, Saat, DilKodu, Baslik c(200) NOT NULL, Detay c(1000) NULL)`
  - `katalog.UrunOzelligiCevirisi (MarkaKodu, UrunKodu, SiraNo, DilKodu, Etiket c(150) NOT NULL, Deger c(300) NULL)`
  - `katalog.UrunVideosuCevirisi (MarkaKodu, UrunKodu, SiraNo, DilKodu, Baslik c(200) NOT NULL)`
  - `katalog.UrunVaryantiCevirisi (MarkaKodu, UrunKodu, VaryantKodu, DilKodu, Ad c(60) NOT NULL)` — **Uygulamada değişti (17.09.2026):** 0.4 katalog notu
  - Her birinde `CK (DilKodu <> N'tr')`.
- Genel bir `katalog.Ceviri` tablosu açılmaz. Parça ve parça grubu için bugün çeviri tablosu yoktur; gerekince aynı kalıpla eklenir (ek V).
- Yeni dil = `kod.Dil` satırı + çeviri satırları. Türkçe metin satırın kendisindedir; `tr` çeviri satırı yazılmaz.
- KVKK metinleri çeviri tablosu kullanmaz: `kvkk.MetinSurumu` her dil için ayrı satırdır (`AsilMetin = 1` yalnız `tr`).

#### 1.15.4 Kod listeleri envanteri

Hepsi [L]; parantez içi listeye özgü kolonlar. Tohum kaynağı Bölüm 5.

`Dil`; `ParaBirimi (+Sembol k(5))`; `KaynakUygulama` (connect, backoffice, servisim, api, betik, entegrasyon, yonetim); `AktorTuru`; `KayitTuru`; `KayitKaynagi`; `DisSistem`; `BildirimKanali`; `IslemKategorisi`; `IslemTuru (+KategoriKodu FK)`; `TalepTuru`; `TalepKaynagi`; `TalepNumaraKurali` (bağ; 0.4); `TalepDurumu (+Kapali, GecikmeSayilir, Ton)`; `TalepTuruDurumu` (bağ; `ElleSecilebilir`); `TalepTuruUydusu` (bağ); `Masa (+TalepTuruKodu)`; `Sahip`; `ServisAtamaKaynagi`; `UlasimZamani`; `MakineDurumu (+ArizaMi)`; `DestekAilesi`; `Belirti`; `BelirtiKapsami` (bağ); `UrunTipi`; `Arazi`; `TraktorGucu`; `IptalNedeni (+AciklamaZorunlu)`; `TeklifSonucu (+FiyatZorunlu)`; `YapilanIs`; `ServisKapisi (+Eski)`; `ZiyaretAsamasi`; `UcretDurumu`; `KapanisTuru`; `FaturaTuru`; `OdemeYontemi`; `HakEdisDurumu`; `HakEdisKalemTuru`; `Birim`; `HesapHareketTuru (+YonKodu)`; `DonemDokumuDurumu`; `DuyuruTuru`; `DuyuruAltTuru (+UstTurKodu FK, VarsayilanHedefKitleKodu FK, KilitliHedefKitleKodu FK NULL, Ton, Ikon; UNIQUE (Kod, UstTurKodu))`; `HedefKitle`; `BildirimTuru`; `AliciTuru`; `KararDurumu`; `DestekOlayTuru`; `DosyaTuru`; `ServisTuru`; `FirmaDurumu`; `KisiRolu`; `SahiplikBitisNedeni`; `RizaMetni`; `RizaSecimi`; `RizaKanali`; `BildirimIzni`; `BelgeTuru`; `SatisTuru`; `GarantiDayanagi`; `GarantiBaslangicEsasi`; `SeriKurali`; `KargoFirmasi (+DisSistemKodu FK NULL)`; `KvkkBasvuruTuru`; `IceAktarimTuru`; `Ceviri`; `EskiDegerEslesmesi`.

`kod.BelirtiKapsami (MarkaKodu k(20) FK katalog.Marka, DestekAilesiKodu FK, BelirtiKodu FK, Sira smallint, PK (MarkaKodu, DestekAilesiKodu, BelirtiKodu))`: tohum `paksan` için her ailenin kendi belirtileri + `ORTAK_BELIRTI` + `diger`; `genel` ailesine yalnız ortak belirtiler ve `diger` (bugünkü davranış). Talep ekranı listeyi `(marka, aile)` ile okur.

`kod.TalepTuruUydusu (TurKodu FK kod.TalepTuru, UyduKodu k(40), PK (TurKodu, UyduKodu))`.

#### 1.15.5 Ayarlar (`sistem.Ayar`)

```
[K]
Anahtar      k(80)   NOT NULL  CK (Anahtar NOT LIKE N'%[^A-Za-z0-9]%')
SirketKodu   k(20)   NULL      FK sirket.Sirket
MarkaKodu    k(20)   NULL      FK katalog.Marka
DegerTuru    k(10)   NOT NULL  CK (DegerTuru IN (N'tamsayi', N'ondalik', N'metin', N'mantiksal', N'json'))
Deger        k(4000) NULL      -- NULL: karar bekleniyor; okuyan işlem hata verir
Aciklama     m(400)  NOT NULL  -- ne işe yaradığı, birimi, ekrandaki sözcük ("48 saat"), eski kod sabitinin adı
[T]
CK (SirketKodu IS NULL OR MarkaKodu IS NULL)
CK (Deger IS NULL
    OR (DegerTuru = N'tamsayi'   AND TRY_CONVERT(int, Deger) IS NOT NULL)
    OR (DegerTuru = N'ondalik'   AND TRY_CONVERT(decimal(18,4), Deger) IS NOT NULL)
    OR (DegerTuru = N'mantiksal' AND Deger IN (N'0', N'1'))
    OR (DegerTuru = N'json'      AND ISJSON(Deger) = 1)
    OR  DegerTuru = N'metin')
UNIQUE (Anahtar)              WHERE SirketKodu IS NULL AND MarkaKodu IS NULL
UNIQUE (Anahtar, SirketKodu)  WHERE SirketKodu IS NOT NULL
UNIQUE (Anahtar, MarkaKodu)   WHERE MarkaKodu IS NOT NULL
```

- Anahtar adı Türkçe PascalCase ve birimini söyler (`TalepGecikmeSaati`, `TeklifBeklemeGunu`). Tam liste Bölüm 5.3.
- **Okuma tek yerden:** `gorunum.GecerliAyar` (Bölüm 3.2). Satırları: her `Anahtar` için (a) genel satır (`SirketKodu`, `MarkaKodu` NULL); (b) her `sirket.Sirket` için şirket satırı, yoksa genel; (c) her `katalog.Marka` için marka satırı, yoksa markanın şirket satırı, yoksa genel. Kolonlar: `Anahtar`, `SirketKodu`, `MarkaKodu`, `DegerTuru`, `Deger`, `KapsamTuru` (`genel`/`sirket`/`marka` — değerin geldiği satır), `Aciklama`. API, `gorunum` ve `yonetim` başka yoldan okumaz. Uygulama rolü bu görünümü SELECT eder.
- Marka kolonlarının (`katalog.Marka.GarantiYil`, `GarantiBaslangicEsasiKodu`, `GarantiFaturaEkGun`, `ServisIskontoOrani`, `ParaBirimiKodu`, `KdvOrani`) boş değeri `katalog.MarkaKurallari` görünümünde aynı sırayla düşer: marka kolonu → şirket ayarı → genel ayar (anahtarlar `GarantiYili`, `GarantiBaslangicEsasi`, `GarantiFaturaEkGunu`, `ServisParcaIskontoOrani`, `ParaBirimi`, `KdvOrani`).
- Değişiklik: `yonetim.AyarDegistir` (Bölüm 3.5.2); geçmiş `gecmis.sistem_Ayar`.

#### 1.15.6 Rolün göreceği talepler (tek tanım)

API ve görünümler aynı yüklemi kullanır (veri.js:134-138):
`t.TurKodu = r.TalepTuruKodu OR m.TalepTuruKodu = r.TalepTuruKodu` (`r` = `erisim.Rol`, `m` = `t.MasaKodu`'nun `kod.Masa` satırı); `r.TalepTuruKodu IS NULL` ise rol bütün talepleri görür. Yeni masa = `kod.Masa` satırı.

### 1.16 Yapan grubu [A]

İş geçmişi ve olay satırları "kim yaptı" bilgisini aynı kolonlarla taşır:

```
YapanTuruKodu         k(40)  NOT NULL  FK kod.AktorTuru
YapanKullaniciKimlik  uid    NULL      FK erisim.Kullanici
YapanHesapKimlik      uid    NULL      FK musteri.Hesap
YapanAdi              m(150) NULL      -- o anki ad; müşteri için NULL
KaynakUygulamaKodu    k(40)  NOT NULL  FK kod.KaynakUygulama
UygulamaSurumu        k(20)  NULL
```

CHECK (her tabloda harfi harfine aynı; adı `CK_<sema>_<Tablo>_Yapan`):

```sql
CHECK (
     (YapanTuruKodu = N'musteri'
        AND YapanHesapKimlik IS NOT NULL AND YapanKullaniciKimlik IS NULL AND YapanAdi IS NULL)
  OR (YapanTuruKodu IN (N'sistem', N'entegrasyon')
        AND YapanHesapKimlik IS NULL AND YapanKullaniciKimlik IS NULL)
  OR (YapanTuruKodu NOT IN (N'musteri', N'sistem', N'entegrasyon')
        AND YapanKullaniciKimlik IS NOT NULL AND YapanHesapKimlik IS NULL AND YapanAdi IS NOT NULL)
)
```

- Üçüncü kol "varsayılan koldur": `personel`, `servis` ve ileride veriyle eklenecek her tür (`bayi`) kullanıcı ister. Yeni aktör türü = `kod.AktorTuru` satırı; hiçbir CHECK değişmez.
- `erisim.Kullanici.TurKodu` FK `kod.AktorTuru` + `CK (TurKodu NOT IN (N'musteri', N'sistem', N'entegrasyon'))`.
- `denetim.IslemKaydi` aynı kolonları FK'siz taşır, aynı CHECK'i kullanır; ek olarak `YapanRolAdi m(100) NULL`.
- `sistem.YapanAyarla @YapanTuruKodu, @YapanKullaniciKimlik, @YapanHesapKimlik, @YapanAdi, @KaynakUygulamaKodu, @UygulamaSurumu, @MusteriyeBildirildi bit = 1`: aynı kuralı denetler (`51010`) ve `sp_set_session_context` ile (`@read_only = 0`) şu anahtarları yazar: `YapanTuruKodu`, `YapanKullaniciKimlik`, `YapanHesapKimlik`, `YapanAdi`, `KaynakUygulamaKodu`, `UygulamaSurumu`, `MusteriyeBildirildi`. API her istekte çağırır (bağlantı havuzu sıfırlamasına güvenilmez). `TR_talep_Talep_DurumGecmisi` bu anahtarları okur; eksikse `51010`. **Uygulamada değişti (18.09.2026):** kolon dolulukları kuralına ek olarak, `@YapanKullaniciKimlik` doluysa o kullanıcı `erisim.Kullanici`'da bulunmalı, `Aktif = 1` olmalı ve `TurKodu` `@YapanTuruKodu` ile aynı olmalıdır (`51010`); yoksa servis türündeki bir kullanıcı kendini `personel` olarak yazdırabiliyordu. Bu prosedür **atlanabilir** — uygulama rolü `sys.sp_set_session_context`'i doğrudan çağırabilir ve anahtarlar `@read_only = 0` yazıldığı için üzerine de yazılabilir — bu yüzden aynı çapraz denetim `TR_talep_Talep_DurumGecmisi` ve `TR_denetim_IslemKaydi_Yapan` tetikleyicilerinde de vardır; "kim yaptı"yı koruyan asıl kapı onlardır. `@YapanAdi` bilerek denetlenmez: yapanın o anki adının kopyasıdır, kullanıcının bugünkü adıyla eşitlenirse tarihsel doğruluk bozulur.
- İkincil kişiler aynı kalıbı kısaltarak kullanır: `<Rol>KullaniciKimlik` + `<Rol>Adi` (`OnaylayanKullaniciKimlik`/`OnaylayanAdi`; `RedEden…`, `GecersizKilan…`, `KararVeren…`, `Okuyan…`, `Kaldiran…`, `GeriAlan…`, `TutarDogrulayan…`, `Dogrulayan…`, `Bitiren…`, `Guncelleyen…`, `Kapatan…`).
- `yonetim` prosedürleri `YapanTuruKodu = N'personel'`, `YapanKullaniciKimlik` = `@YapanGirisAdi`'nın kullanıcısı, `YapanAdi` = `personel.Personel.AdSoyad`, `KaynakUygulamaKodu = N'yonetim'` yazar.

### 1.17 Kısıt yazım kuralları

#### 1.17.1 Kod adı geçen CHECK ve filtre

- CHECK ve filtreli dizin **büyüyebilen bir kod kümesini saymaz** (`DurumKodu IN (<açık durumlar>)` yasak). Kodun sınıfı (açık/kapalı, fiyat zorunlu, yön) gerekiyorsa bayrak kopyası kullanılır (1.17.2).
- **Tek bir koda özgü, "içerme" biçimli** şart yazılabilir; yeni kod bu şarta takılmaz. Bu belgedeki izinli örnekler (katalog yeni ekleyemez; eklemek bu belgeye önerilir):
  - `talep.Talep`: `KaynakKodu <> N'servisElle' OR ServisKimlik IS NOT NULL`; `KaynakKodu <> N'servisSiparisi' OR (HesapKimlik IS NULL AND ServisKimlik IS NOT NULL)`; `NOT (KaynakKodu = N'connect' AND TurKodu = N'servis') OR MakineKimlik IS NOT NULL`; `SahipKodu <> N'servis' OR ServisKimlik IS NOT NULL`.
  - Tür ayrıntı tabloları: `TurKodu = N'servis'` / `N'parca'` / `N'satinalma'` (tabloya özgü sabit).
  - `talep.ServisZiyareti`: `AsamaKodu <> N'bitti' OR YapilanIsKodu IS NOT NULL`; `UNIQUE (TalepKimlik) WHERE AsamaKodu = N'parca'`. **Uygulamada değişti (17.09.2026):** `yarimKaldi` aşaması bu filtreyi serbest bırakır (0.4 talep notu).
  - `talep.ParcaSevki`: `TurKodu <> N'servis' OR ZiyaretKimlik IS NOT NULL`.
  - `hakedis.HakEdis`: `KapiKodu = N'garanti'`, `AsamaKodu = N'bitti'`; durum kolları `N'bekliyor'`, `N'onaylandi'`, `N'reddedildi'`.
  - `hakedis.DonemDokumu`: `WHERE DurumKodu <> N'iptal'`.
  - `hakedis.ServisHesapHareketi`: `N'hakEdisAlacagi'`, `N'parcaSiparisiBorcu'` filtreleri; `HareketTuruKodu <> N'odeme' OR …`. **Uygulamada değişti (17.09.2026):** `HareketTuruKodu <> N'hakEdisAlacagi' OR HakEdisKimlik IS NOT NULL`; `HareketTuruKodu <> N'parcaSiparisiBorcu' OR ParcaTalepKimlik IS NOT NULL`; `HareketTuruKodu <> N'duzeltmeAlacak' OR DuzeltilenHareketKimlik IS NOT NULL`; `HareketTuruKodu <> N'duzeltmeBorc' OR DuzeltilenHareketKimlik IS NOT NULL`.
  - `musteri.HesapKisisi`: `WHERE RolKodu = N'hesapSahibi' …`; `musteri.TelefonDegisikligiTalebi`: `WHERE KararDurumuKodu = N'bekliyor' …`.
  - `duyuru.Duyuru`: `AltTurKodu <> N'geriCagirma' OR HedefKitleKodu = N'servis'`.
  - `sistem.Giden`: Bölüm 1.14.3 CHECK'i; `DurumKodu <> N'gonderildi' OR SaglayiciKodu IS NOT NULL`.
  - [Y] içindeki `N'TR'`; numara önek sabitleri (`N'HAK'`, `N'TEL'`, `N'GBD'`).
- **"Varsayılan kol" kuralı:** türlere göre dallanan CHECK'in son kolu `NOT IN (<adı geçen türler>)` ile yazılır; yeni tür o kola düşer. Uygulandığı yerler: Yapan grubu (1.16) ve `bildirim.Bildirim` alıcısı:

```sql
CHECK (
     (AliciTuruKodu = N'musteri' AND HesapKimlik IS NOT NULL AND ServisKimlik IS NULL AND KullaniciKimlik IS NULL)
  OR (AliciTuruKodu = N'servis'  AND ServisKimlik IS NOT NULL AND HesapKimlik IS NULL AND KullaniciKimlik IS NULL)
  OR (AliciTuruKodu NOT IN (N'musteri', N'servis')
        AND KullaniciKimlik IS NOT NULL AND HesapKimlik IS NULL AND ServisKimlik IS NULL)
)
```

- **Varsayılan-red** (kasıtlı): `makine.MakineServisAtamasi` `CK (YapanTuruKodu IN (N'personel', N'entegrasyon', N'sistem'))`; yeni aktör türü (bayi) makineye servis atayamaz.
- Tetikleyici, prosedür ve görünümler (R betikleri) bir kodun kendi iş anlamı için kod adı kullanabilir (`N'teklif'` için teklif bekleme süresi); sınıf gereken yerde bayrağı okur (`Kapali`, `GecikmeSayilir`).

#### 1.17.2 Bayrak kopyası kalıbı

CHECK başka tabloya bakamaz (`1046`). Kod tablosundaki bayrak satıra kopyalanır, bileşik FK doğruluğunu garanti eder:

1. Kod tablosunda `UNIQUE (Kod, <Bayrak>)`.
2. Satırda `<Bayrak>` kolonu (kod kolonu NOT NULL ise NOT NULL) + `FOREIGN KEY (<X>Kodu, <Bayrak>) REFERENCES kod.<Liste> (Kod, <Bayrak>)`.
3. Kod kolonu boş olabiliyorsa `CK ((<X>Kodu IS NULL AND <Bayrak> IS NULL) OR (<X>Kodu IS NOT NULL AND <Bayrak> IS NOT NULL))` (bileşik FK'nin bir kolonu NULL iken denetlenmez).
4. Kural bayrağa göre yazılır.

| Satır | Bayrak | Kural |
|---|---|---|
| `talep.Talep` | `Kapali` ← `kod.TalepDurumu` | `(Kapali = 1 AND KapanmaZamani IS NOT NULL) OR (Kapali = 0 AND KapanmaZamani IS NULL)`; açık talep dizini `WHERE Kapali = 0` |
| `talep.Kapanis` | `FiyatZorunlu` ← `kod.TeklifSonucu` (NULL olabilir) | `FiyatZorunlu IS NULL OR FiyatZorunlu = 0 OR SatisFiyati IS NOT NULL` |
| `talep.Iptal` | `AciklamaZorunlu` ← `kod.IptalNedeni` | `AciklamaZorunlu = 0 OR (Aciklama IS NOT NULL AND LEN(Aciklama) > 0)` |
| `hakedis.ServisHesapHareketi` | `YonKodu` ← `kod.HesapHareketTuru` | Yön türle çelişemez |

Kod tablosundaki bayrak, satırlar ona bakarken değiştirilemez (FK `547`); bir kodun sınıfı değişecekse yeni kod açılır. Görünümler ve `yardim` açıklık için `Talep.Kapali`'yi kullanır; durum kodu listesi yazmaz.

#### 1.17.3 Zamanla bitebilen yetkiye bağ

- `servis.MarkaYetkisi` ve `bayi.MarkaYetkisi`: `Etkin` kalıcı hesaplanmış kolon + `UNIQUE (<Firma>Kimlik, MarkaKodu, Etkin)`; PK `(<Firma>Kimlik, MarkaKodu)`; yetki yeniden verilince aynı satır güncellenir.
- `makine.MakineServisAtamasi.YetkiEtkin` (açıkken 1, bitince NULL) + FK `(ServisKimlik, MarkaKodu, YetkiEtkin)` → `servis.MarkaYetkisi (ServisKimlik, MarkaKodu, Etkin)`. Sonuç (sınandı): bitmiş yetkiye atama `547`; açık atama varken yetkiyi bitirmek `547`; atama bitince yetki biter; yetki yeniden verilince atama geçer.
- `talep.Talep`: FK `(ServisKimlik, MarkaKodu)` → `servis.MarkaYetkisi` PK'si ("bir zaman yetkiliydi" güvencesi) kalır; yeni ekleme ve `ServisKimlik` değişikliği `TR_talep_Talep_ServisYetkisi` ile denetlenir (`51020`). Kapanmış ve değişmeyen talepler etkilenmez; açık talebi olan servisin yetkisi alınabilir.
- `makine.MakineninServisi` her adımda `Etkin = 1` ve `servis.Servis.DurumKodu = N'aktif'` şartını koyar.
- `yonetim.ServistenMarkaYetkisiniAl` aynı işlemde o servisin o markadaki açık atamalarını bitirir ve bitirdiklerini ve açık talepleri listeler.

#### 1.17.4 Tür uydusu kalıbı

- Tohum: `(servis, servisZiyareti)`, `(parca, faturaBilgisi)`, `(satinalma, bayiAtamasi)`.

| Tablo | `UyduKodu` sabiti |
|---|---|
| `talep.ServisZiyareti` | `servisZiyareti` |
| `talep.FaturaBilgisi` | `faturaBilgisi` |
| `talep.BayiAtamasi` | `bayiAtamasi` |

- Her uydu tabloda: `TurKodu k(40) NOT NULL`; `UyduKodu k(40) NOT NULL CONSTRAINT DF_…_UyduKodu DEFAULT N'<sabit>' CONSTRAINT CK_…_UyduKodu CHECK (UyduKodu = N'<sabit>')`; `FOREIGN KEY (TalepKimlik, TurKodu) REFERENCES talep.Talep (Kimlik, TurKodu)`; `FOREIGN KEY (TurKodu, UyduKodu) REFERENCES kod.TalepTuruUydusu (TurKodu, UyduKodu)`. Tür adı geçen CHECK yoktur.
- Türe özgü ayrıntı tabloları (`ServisTalebiAyrinti`, `ParcaTalebiAyrinti`, `TeklifTalebiAyrinti`) tabloya özgü tür sabitini korur. Öteki alt tablolar (`TalepBelirtisi`, `Dekont`, `OdemeOnayi`, `ParcaSatiri`, `TeklifUrunTipi`, `TeklifArazi`…) türü kısıtlamaz.
- Yeni talep türü: `kod.TalepTuru`, `sistem.NumaraOneki`, `kod.TalepNumaraKurali`, `kod.TalepTuruDurumu`, `kod.TalepTuruUydusu`, `kod.Masa` satırları; türe özgü yeni alan gerekiyorsa yeni ayrıntı tablosu (ek V).
- `SahipKodu = N'bayi'` yalnız etkin bir `talep.BayiAtamasi` satırıyla birlikte yazılır; API ve `yonetim` denetler (CHECK değil).

#### 1.17.5 Tekillik ve NULL

- SQL Server tekil dizinde NULL'ları birbirine eşit sayar. **Filtreli tekil dizindeki boş olabilen her anahtar kolon filtrede `IS NOT NULL` ile yazılır.** NULL'ın anlamlı bir "yok" boyutu olduğu yerde (firma numarası olmayan dış sistem, il geneli servis bölgesi) aynı tekilliğin `<kolon> IS NULL` filtreli ikinci dizini yazılır (0.4'teki `BelgeBagi`, `CariKarti`, `Bolge`, `Tarife`). Canlı denetim CD-UX-NULL doğrular.
- Filtresiz `UNIQUE` kısıtında boş olabilen kolon yalnız bileşik FK hedefi için (`talep.Talep (Kimlik, ServisKimlik)`) kullanılır; ilk kolon zaten tekil olduğu için NULL eşitliği etkisizdir.
- Pasifleşebilen satırda ad tekilliği filtrelidir: `erisim.Rol UNIQUE (Ad) WHERE Aktif = 1`.

#### 1.17.6 CHECK ve NULL

- CHECK ifadesi UNKNOWN sonuçta satırı **kabul eder**. Boş olabilen kolona bakan her CHECK, NULL durumunu açık `IS NULL`/`IS NOT NULL` ile yazar; `x > 0 OR (…)` biçimi NULL'da yanlış kabul verir (sınandı: `Adet > 0 OR (Adet IS NULL AND KatalogDisi = 1)` adetsiz katalog satırını geçirdi).
- Kalıp: değer kuralı `x IS NULL OR <şart>`; boşluk kuralı `x IS NOT NULL OR <boşluğa izin veren şart>` (iki ayrı CHECK).

#### 1.17.7 `CHECK IN` izinli teknik listeler

Aşağıdakiler ve Bölüm 1.16/1.17.1'deki kalıplar dışında değer listesi kod tablosudur:

| Kolon | Değerler |
|---|---|
| `sistem.Ortam.OrtamKodu` | `yerel`, `sinama`, `test`, `canli` |
| `sistem.Ayar.DegerTuru` | `tamsayi`, `ondalik`, `metin`, `mantiksal`, `json` |
| `sistem.TekrarAnahtari.DurumKodu` | `isleniyor`, `tamamlandi`, `hata` |
| `sistem.Giden.DurumKodu` | `bekliyor`, `gonderiliyor`, `gonderildi`, `hata`, `vazgecildi` |
| `sistem.SaklamaKurali.EylemKodu` | `sil`, `bosalt`, `sakla` |
| `erisim.Oturum.KapanmaNedeniKodu` | `cikis`, `sure`, `iptal`, `sifreDegisti`, `telefonDegisti`, `rolSilindi`, `yenidenKullanim`, `hesapBirlestirildi`, `anonimlestirme` |
| `erisim.DogrulamaKodu.AmacKodu` | `sifreSifirlama`, `kayit`, `telefonDegisikligi`, `giris` |
| `erisim.GirisDenemesi.TanimlayiciTuruKodu`, `SonucKodu` | `girisAdi`, `telefon`; `basarili`, `yanlisSifre`, `bilinmeyen`, `kilitli`, `pasif` |
| `musteri.Hesap.DurumKodu` | `aktif`, `kapali`, `anonim`, `birlestirildi` |
| `kvkk.BasvuruTalebi.DurumKodu` | `alindi`, `isleniyor`, `sonuclandi`, `reddedildi` |
| `servis.SifreYardimTalebi.DurumKodu` | `bekliyor`, `kapandi` |
| `servis.FaturaBilgisi.VergiNoTuruKodu` | `tcNo`, `vergiNo` |
| `dosya.Dosya.DurumKodu`, `DepolamaSaglayiciKodu`, `SaklamaSinifiKodu` | `yukleniyor`, `hazir`, `karantina`; `disk`, `nesne`; `dekont`, `genel` |
| `entegrasyon.IceAktarim.DurumKodu` | `yuklendi`, `dogrulandi`, `uygulandi`, `hata` |
| `entegrasyon.IceAktarimSatiri.DurumKodu` | `bekliyor`, `eslesti`, `eslesmedi`, `hata` |
| `entegrasyon.LogoSeriSorgusu.SonucKodu` | `bulundu`, `bulunamadi`, `hata` |
| `kod.HesapHareketTuru.YonKodu` | `alacak`, `borc` |
| `bildirim.Cihaz.PlatformKodu` | `android`, `ios`, `web` |
| `katalog.FiyatListesi.DurumKodu` | `taslak`, `yururlukte`, `arsiv` |
| `katalog.UrunVideosu.TurKodu` | `tanitim`, `kullanim` |
| `talep.ZiyaretDuzeltmesiParcasi.TarafKodu` | `onceki`, `yeni` |
| `dbo.SemaGecmisi.Tur` | `K`, `V`, `R`, `T`, `B`, `O` |

Bu listelere değer eklemek kod değişikliği de gerektirdiği için ek V betiğiyle yapılır (Bölüm 2.3).

### 1.18 Sürüm ve özellik yasakları

Hedef: SQL Server 2019+, uyumluluk 150, Express/Standard, Windows/Linux. `tools/vt/denetle.mjs` statik denetimi `veritabani/**/*.sql` içinde (yorum ve dizgi dışı) şunları reddeder:

- 2019'dan sonra gelenler: `GREATEST`, `LEAST`, `DATETRUNC`, `JSON_OBJECT`, `JSON_ARRAY`, `JSON_PATH_EXISTS`, `GENERATE_SERIES`, `IS [NOT] DISTINCT FROM`, `REGEXP_*`, `APPROX_PERCENTILE_*`, üç parametreli `STRING_SPLIT`, yerel `json`/`vector` tipi, `LEDGER`, `HISTORY_RETENTION_PERIOD`, `_UTF8` harmanlamaları.
- Sürüm türü/platform bağımlıları: `MEMORY_OPTIMIZED`, `FILESTREAM`/`FILETABLE`, `CREATE ASSEMBLY`, `xp_cmdshell`, `sp_OA*`, `ENCRYPTED WITH`, `ONLINE = ON`, `DATA_COMPRESSION`, `PARTITION FUNCTION/SCHEME`, `CREATE FULLTEXT`, `CONTAINS(`, `FREETEXT(`, `OPENROWSET`, `OPENDATASOURCE`, `BULK INSERT`, bağlı sunucu, `BACKUP … COMPRESSION` (araç Express değilse ekler; betikte yok).
- Tasarım kuralları: `ON DELETE/UPDATE CASCADE`, `SET NULL`, `SET DEFAULT`; `char`, `varchar`, `nchar`, `text`, `ntext`, `image`, `datetime`, `smalldatetime`, `money`, `smallmoney`, `float`, `real`; `GETDATE()`, `SYSDATETIME()`, `CURRENT_TIMESTAMP`, `GETUTCDATE()`; `NEWSEQUENTIALID()`; `@@IDENTITY`; `NOLOCK`, `READUNCOMMITTED`, `TABLOCKX`; `sp_rename`; `sp_addrolemember`; dinamik SQL (`EXEC (`, `sp_executesql`) R betiklerinde; görünüm ve prosedürde `SELECT *`; V betiklerinde `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN` (Bölüm 2.3'teki izinli kalıplar hariç); adsız kısıt ve dizin; açık harmanlaması olmayan metin kolonu; BOM; `USE`; V/T/B/O betiği içinde `BEGIN TRANSACTION`/`COMMIT` (sarmalayıcı açar; R betiklerinde yalnız prosedür gövdesinde); `FORMAT()`; harmanlama belirtilmemiş `UPPER(`/`LOWER(` kod karşılaştırmasında.

### 1.19 Veritabanı seçenekleri ve yedek

#### 1.19.1 K01'in uyguladığı seçenekler

```sql
CREATE DATABASE <ad> COLLATE Latin1_General_100_CI_AS;   -- yoksa
ALTER DATABASE <ad> SET COMPATIBILITY_LEVEL = 150;
ALTER DATABASE <ad> SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
ALTER DATABASE <ad> SET ALLOW_SNAPSHOT_ISOLATION OFF;
ALTER DATABASE <ad> SET AUTO_CLOSE OFF;           -- Express varsayılanı ON
ALTER DATABASE <ad> SET AUTO_SHRINK OFF;
ALTER DATABASE <ad> SET AUTO_CREATE_STATISTICS ON;
ALTER DATABASE <ad> SET AUTO_UPDATE_STATISTICS ON;
ALTER DATABASE <ad> SET PAGE_VERIFY CHECKSUM;
ALTER DATABASE <ad> SET TRUSTWORTHY OFF;
ALTER DATABASE <ad> SET DB_CHAINING OFF;
ALTER DATABASE <ad> SET QUERY_STORE = ON (OPERATION_MODE = READ_WRITE);
ALTER DATABASE <ad> SET RECOVERY SIMPLE;          -- canli: FULL
-- veri ve günlük dosyası FILEGROWTH = 64MB
ALTER AUTHORIZATION ON DATABASE::<ad> TO paksan_<ortam>_sahip;
```

- Veritabanı zaten varsa ve harmanlaması `Latin1_General_100_CI_AS` değilse K01 ve `vt durum` durur (harmanlama sonradan değiştirilmez).
- `sa` açılmaz; K01/K02 yönetici bağlantısı ortam dosyasından gelir.

#### 1.19.2 Yedek

- `yerel`, `sinama`, `test`: `SIMPLE`; `npm run vt -- yedekle` tam yedek.
- `canli`: `FULL`. **Günlük yedeği zamanlanmadan canlı `FULL`'e alınmaz.**
  - Günde bir tam yedek: `npm run vt -- yedekle` (`BACKUP DATABASE … WITH CHECKSUM`).
  - 15 dakikada bir günlük yedeği: `npm run vt -- yedekle --gunluk` (`BACKUP LOG … WITH CHECKSUM`). Express'te Agent olmadığı için işletim sistemi zamanlayıcısı çalıştırır.
  - Dosya adları tarih damgalıdır: `<ad>_tam_YYYYMMDD_HHMMSS.bak`, `<ad>_gunluk_YYYYMMDD_HHMMSS.trn`; `INIT` yalnız yeni dosyaya yazılır.
  - Saklama (SUNUCU-VE-VERITABANI.md §12): son 7 günün bütün yedekleri, son 4 haftanın haftalık tam yedeği, son 12 ayın aylık tam yedeği; en eski tutulan tam yedekten eski günlük yedekleri silinir; en az bir kopya VPS dışında; yılda bir kez test ortamına geri yükleme denenir.
  - `vt durum`: `log_reuse_wait_desc`, son tam ve son günlük yedeği zamanı; `canli`'da son günlük yedeği 1 saatten eskiyse ya da `LOG_BACKUP` beklemesi 1 saatten uzunsa uyarı.
  - `vt guncelle` test/canlıda son 2 saatte tam yedek yoksa çalışmaz (`--yedeksiz` hariç).

### 1.20 Betiklerin ortak kuralları

- Sarmalayıcı (`tools/vt/calistir.mjs`) her V/R/T/B/O betiğinden önce şunları çalıştırır; betikler bunları değiştirmez:

```sql
SET NOCOUNT ON;
SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON; SET QUOTED_IDENTIFIER ON; SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
```

  Sonra `:r "<betik>"`, `dbo.SemaGecmisi` satırı, `COMMIT`. Filtreli dizin, hesaplanmış kolon dizini ve sistem sürümlü tablo bu ayarları ister; API bağlantısının oturum ayarları da aynı olmalıdır (API fazında doğrulanır).
- `sqlcmd -b -I -f 65001 -C` (Linux'ta `-f` desteklenmiyorsa atlanır; kurulumda doğrulanır); dosyalar UTF-8, BOM'suz; metin sabitleri `N'…'`.
- K betikleri işlem dışında ve tekrar çalışabilir yazılır (`IF NOT EXISTS`).
- V betikleri bir kez uygulanır, sonra değiştirilmez (`dbo.SemaGecmisi` SHA-256; CRLF→LF normalleştirilmiş, BOM atılmış bayt).
- R betikleri `CREATE OR ALTER`; her `PROCEDURE`/`VIEW`/`FUNCTION`/`TRIGGER` kendi `GO` toplu işinde. R betiği nesne silmez; kaldırılacak nesne yeni V betiğiyle kaldırılır.
- Her prosedür `SET NOCOUNT ON;` ile başlar; yazan her prosedür `SET XACT_ABORT ON;` içerir.
- **Açıklama:** her şema, tablo, kolon, görünüm, görünüm kolonu, prosedür, parametre, işlev, tetikleyici `MS_Description` alır. Yazan: `dbo.AciklamaYaz @Sema sysname, @Nesne sysname = NULL, @Alt sysname = NULL, @AltTuru nvarchar(20) = N'COLUMN', @Metin nvarchar(3750)` (`@Nesne` NULL → şema açıklaması; `@AltTuru`: `COLUMN`, `PARAMETER`, `TRIGGER`, `CONSTRAINT`, `INDEX`). Açıklamalar Türkçe teknik belgedir; `vt sozluk` bunlardan `VERITABANI.md`'yi üretir. `yardim`/`yonetim` prosedür açıklaması üç parça içerir: "Ne yapar", "Ne yapmaz", "Örnek".
- **Ekranda görünen Türkçe:** `THROW` metinleri, `yardim`/`yonetim` sonuç kümelerindeki bölüm başlıkları ve sabit metinler, `kod-adlari.json` etiketleri, anonim metni kullanıcının ya da yöneticinin gördüğü metindir; CLAUDE.md gereği Codex'ten geçer. Betik taslağında `N'<Codex metni: …>'` yer tutucusuyla yazılır; `npm run vt -- tohum --denetle`, statik denetim ve `npm run dogrula` (kontrol 12) yer tutucu kalmışsa hata verir; `vt guncelle` test/canlıda yer tutucu içeren betiği çalıştırmaz.
- Hata numaraları Bölüm 1.21'den; `RAISERROR` değil `THROW <no>, N'…', 1`.

### 1.21 Hata numaraları

| No | Çıkaran | Anlamı |
|---|---|---|
| 50001 | O betikleri | Ortam örnek veriye izin vermiyor |
| 51001 | `sistem.NumaraAl` | Önek ve yıl için 99999 doldu |
| 51002 | `sistem.NumaraAl` | `@Zaman` yalnız yerel/sınama |
| 51003 | `sistem.NumaraAl` | Önek yok ya da pasif |
| 51010 | `sistem.YapanAyarla`, `TR_talep_Talep_DurumGecmisi`, `TR_denetim_IslemKaydi_Yapan` | Yapan bilgisi eksik ya da tutarsız (kolon dolulukları; ya da kullanıcı yok, pasif, verilen türde değil) |
| 51011 | `TR_sistem_Ortam_Koruma` | Ortam işareti değiştirilemez |
| 51012 | `TR_denetim_IslemKaydi_Koruma` | İşlem kaydı değiştirilemez ve silinemez |
| 51013 | `TR_kvkk_RizaOlayi_Koruma` | Rıza olayı değiştirilemez |
| 51014 | `TR_kvkk_MetinSurumu_Koruma` | Metin içeriği değiştirilemez |
| 51015 | `TR_talep_DurumGecmisi_Koruma` | Durum geçmişi değiştirilemez |
| 51020 | `TR_talep_Talep_ServisYetkisi` | Talep yetkisi bitmiş ya da pasif servise bağlanamaz |
| 51030 | `erisim.SifreYaz`, `musteri.SifreYaz` | Geçerli ve kullanılmamış jeton/doğrulama kodu gerekir |
| 51040 | `TR_hakedis_HakEdis_Onay` | Onaylanan hak edişte `NetTutar` kalem toplamına eşit değil |
| 51041 | `hakedis.HakEdisHesapla` | Geçerli tarife yok |
| 51042 | `TR_hakedis_ServisHesapHareketi_Tutar` | Hareket tutarı, şirketi ya da para birimi kaynağıyla uyuşmuyor |
| 51043 | `hakedis.HakEdisHesapla`, `HakEdisKalemiYaz` | Hak ediş `bekliyor` durumunda değil |
| 51044 | `hakedis.HakEdisKalemiYaz` | `yol`/`iscilik` kalemi elle yazılamaz |
| 51045 | `hakedis.HakEdisHesapla` | Ziyaretin para birimi hak edişinkinden farklı |
| 51046 | `TR_hakedis_HakEdis_TutarKilidi` | Onaylı hak edişin tutarı ve vergileri, alacak hareketi geri alınmadan değiştirilemez |
| 51100 | `yonetim.*` | Gerekçe en az 10 karakter |
| 51101 | `yonetim.*` | Yapan giriş adı aktif bir personel değil |
| 51102 | `yonetim.*`, `yardim.*` | Kayıt bulunamadı |
| 51103 | `yonetim.*` | Birden çok kayıt eşleşti |
| 51104 | `yonetim.*` | Numara ile `KayitNo` aynı kayda ait değil |
| 51105 | `yardim.Ara` | Arama metni çok kısa |
| 51110 | `yonetim` talep prosedürleri | Onay bekleyen hak ediş var |
| 51111 | `yonetim` talep prosedürleri, `DekontuGecersizKil` | Ödeme onayı yok (ya da dekont geçersiz kılınırken etkin ödeme onayı var) |
| 51112 | `yonetim` talep prosedürleri | Hedef durum bu türde elle seçilemez ya da sınıfı uygun değil |
| 51113 | `yonetim.*` | Kayıt zaten istenen durumda (açık/kapalı, geçersiz, etkin) |
| 51114 | `yonetim.TalebiIptalEt` | Bu iptal nedeni açıklama ister |
| 51120 | `yonetim.MusteriTelefonunuDegistir`, `KisiselVerileriAnonimlestir`, `HesaplariBirlestir` | Telefon geçersiz |
| 51121 | `yonetim.MusteriTelefonunuDegistir` | Yeni telefon başka bir etkin hesapta |
| 51122 | `yonetim.HesaplariBirlestir` | Hesaplar birleştirilemez (aynı, anonim ya da zaten birleşmiş) |
| 51131 | `yonetim.MakineyeServisAta`, `ServiseMarkaYetkisiVer` | Servis pasif ya da markaya yetkisiz |
| 51140 | `yonetim.HakEdisOnayiniGeriAl`, `HesapHareketiniDuzelt` | Kayıt taslak olmayan döküme ya da belgeye bağlı |
| 51141 | `yonetim.HesapHareketiniDuzelt`, `HakEdisOnayiniGeriAl` | Hareket zaten geri alınmış |
| 51142 | `yonetim.HakEdisOnayiniGeriAl` | Hak ediş onaylı değil |
| 51143 | `yonetim.HesapHareketiniDuzelt` | Kaynağa bağlı hareketin tutarı bu prosedürle yeniden yazılamaz |
| 51150 | `yonetim.AyarDegistir` | Ayar yok ya da değer türüne uymuyor |

Motor hataları: `547` (CHECK/FK), `2601` (tekil dizin), `2627` (PK/UNIQUE), `229` (yetki), `1753`/`1757`/`1776`/`1778` (FK tanımı; yalnız betik yazımında).

---

## 2. Esneklik

### 2.1 Kurallar

- **E1. Marka veridir.** Yeni marka = `katalog.Marka` satırı + o markanın ürün, parça, fiyat listesi, belirti kapsamı ve yetki satırları. `MarkaKodu` ilgili her tabloda bugünden vardır; **Uygulamada değişti (17.09.2026):** varsayılanı yoktur, her satır markayı açıkça yazar (Bölüm 1.15.1); tek marka varken hiçbir ekranı, raporu, sorguyu değiştirmez.
- **E2. Marka kuralı boşsa şirkete, sonra genele düşer** (`katalog.MarkaKurallari`, `gorunum.GecerliAyar`). Aktif markanın zorunlu alanları `Aktif = 0 OR …` CHECK'iyle denetlenir.
- **E3. Şirket çok satırlıdır.** Her marka bir şirkete bağlıdır; banka hesabı şirkete bağlıdır; parayla ilgili satır yazıldığı andaki şirketi taşır (Bölüm 1.9.2); LOGO firma numarası şirkette ve cari kartta.
- **E4. İş listeleri tablodadır.** Durum, tür, neden, kanal, sağlayıcı, belge türü, içe aktarım türü, kalem türü, birim, kayıt kaynağı = satır. `CHECK IN` yalnız Bölüm 1.17.7'deki teknik listelerde.
- **E5. Kısıtlar yeni kodu reddetmez:** varsayılan kol, bayrak kopyası, uydu kalıbı, içerme biçimli tek kod şartı (Bölüm 1.17). Tek bilinçli istisna varsayılan-red atama kısıtıdır.
- **E6. Diller satırda değil çeviri tablolarındadır** (Bölüm 1.15.3).
- **E7. Ayarlar anahtar-değerdir ve kapsamlıdır** (genel/şirket/marka; Bölüm 1.15.5).
- **E8. Dış sistemler ayrıktır.** İş tabloları dış sistem adı taşımaz (`BelgeBagiKimlik`); bağ `entegrasyon.BelgeBagi` ve `entegrasyon.CariKarti` üzerinden, `DisSistemKodu` ile. Pilot istisnası: `makine.Makine.LogoMalzemeKodu`, `entegrasyon.LogoMalzemeKarti`, `entegrasyon.LogoSeriSorgusu`.
- **E9. Numara serisi veridir:** önek `sistem.NumaraOneki`; talep önek kuralı `kod.TalepNumaraKurali` (markaya göre satır olabilir).
- **E10. Katılımcı türleri veridir:** aktör türü, alıcı türü, giriş kullanıcısı türü satırdır; `servis.GirisHesabi` firma başına birden çok kullanıcıya izin verir.
- **E11. Büyüme yalnız ekleyerek.** Şema değişikliği gerekirse yeni numaralı V betiği yazılır: yeni tablo; mevcut tabloya boş olabilir ya da varsayılanlı kolon; yeni dizin; yeni kod tablosu; Bölüm 2.3'teki izinli CHECK genişletmesi. Kolon silinmez, yeniden adlandırılmaz, tipi ve anlamı değişmez; kullanılmayan kolonun açıklaması "kullanılmıyor (tarih, neden)" olur.
- **E12. Tohum veriyle eklenene dokunmaz.** Katalog MERGE'ü kaynaktaki markalarla sınırlıdır; kod/coğrafya/izin/şirket listelerinde kendiliğinden pasifleştirme yoktur (Bölüm 5.5).
- **E13. Sınama:** Bölüm 7.6 senaryoları yalnız veri ekleyerek geçmeli; şema parmak izi değişmemeli.

### 2.2 Senaryolar

| Senaryo | Şema değişmeden nasıl karşılanır | Şema değişikliği gereken kısım |
|---|---|---|
| **Yeni marka** (farklı garanti, seri kuralı, servis/bayi yetkisi, belirtiler, kılavuz dili) | `katalog.Marka` satırı (`SirketKodu`, `GarantiYil`, `GarantiBaslangicEsasiKodu`, `GarantiFaturaEkGun`, `SeriKuraliKodu`, `ServisIskontoOrani`, `KilavuzDilleri = N'tr,it'`, `KaynakNotu`, `Aktif`); yeni seri kuralı için `kod.SeriKurali` satırı; `katalog.Urun`, `UrunVaryanti`, `ParcaGrubu`, `Parca`, `FiyatListesi` (+satır); markaya özgü belirti için `kod.Belirti` + `kod.BelirtiKapsami (marka, aile, belirti)` satırları; `servis.MarkaYetkisi`, `bayi.MarkaYetkisi`; gerekirse `sistem.Ayar` marka satırları (`TeklifBeklemeGunu`); `hakedis.Tarife` marka satırı. Garanti satışa sabitlenir (1.9.6); yetkisiz ya da yetkisi bitmiş servise atama `547` | Seri kuralını çözen uygulama kodu (şema değil) |
| **Markanın ayrı tüzel kişi / ayrı LOGO firması olması** | `sirket.Sirket` satırı (`LogoFirmaNo`, `VergiNo`); `katalog.Marka.SirketKodu` güncellenir (sistem sürümlü; eski para satırları kendi şirketini taşır); `sirket.BankaHesabi` satırları (ödeme ekranı talebin şirketinden okur); `sistem.Ayar` şirket satırları (`KdvOrani`, `ParaBirimi`, `BankaAciklamaKalibi`, `IhracatEpostalari`); servis, bayi ve müşteri için `entegrasyon.CariKarti (logo, FirmaNo)`; aynı servis aynı ay iki şirkete iki `hakedis.DonemDokumu`; bakiye şirkete göre ayrılır; `gorunum.KontrolLogoCariKoduEksik` eksikleri firma başına listeler. KVKK veri sorumlusu farklıysa: `kod.RizaMetni` satırı + `kvkk.MetinSurumu` satırları | — |
| **Markaya ayrı numara serisi** | `sistem.NumaraOneki` satırı (ör. `GLS`, `talep`); `kod.TalepNumaraKurali (servis, connect, GLS, MarkaKodu = globale)` satırları; API marka satırını genel satıra tercih eder | Aynı önekle markaya ayrı sayaç istenirse `sistem.NumaraSayaci`'na kapsam kolonu (plan: tek betiklik iş) |
| **Yeni talep türü** (kurulum randevusu, eğitim) | `kod.TalepTuru`; `sistem.NumaraOneki` + `kod.TalepNumaraKurali`; `kod.TalepTuruDurumu`; `kod.TalepTuruUydusu` (`kurulum → servisZiyareti` ile ziyaret ve hak ediş açılır; `egitim → bayiAtamasi`); `kod.Masa (kurulumMasasi → kurulum)`; `erisim.Rol.TalepTuruKodu` | Türe özgü yeni alanlar: yeni ayrıntı tablosu (2.3) |
| **Yeni talep durumu** (`tekrarZiyaretBekliyor`, `odemeYapilmadi`) | `kod.TalepDurumu` satırı (`Kapali`, `GecikmeSayilir`, `Ton`) + `kod.TalepTuruDurumu` satırları; açık durum açık talep dizinine ve görünümlere `Kapali = 0` ile girer; kapalı durum `KapanmaZamani` ile kabul edilir | — |
| **Yeni iptal nedeni, kapanış türü, yapılan iş, teklif sonucu, belirti, ödeme yöntemi, belge türü, içe aktarım türü, hareket türü, hak ediş kalemi, birim, kayıt kaynağı** | İlgili `kod.*` satırı (bayraklarıyla). Yeni kalem türü `hakedis.HakEdisKalemiYaz` ile tutar alır ve `NetTutar`'a girer; yeni birim tarifede kullanılır | — |
| **Yeni dil** (ör. `it`) | `kod.Dil` satırı; `kod.Ceviri` (kod listeleri, `cografya.Ulke`, `katalog.Kategori`); `katalog.UrunCevirisi`, `BakimAdimiCevirisi`, `UrunOzelligiCevirisi`, `UrunVideosuCevirisi`, `UrunVaryantiCevirisi` (uygulamada eklendi, 17.09.2026); `kvkk.MetinSurumu` dil satırları (`AsilMetin = 0`); `katalog.Marka.KilavuzDilleri`; `musteri.Hesap.DilKodu`, `bildirim.Cihaz.DilKodu`. Bildirim ve giden şablonlarının metinleri uygulamanın sözlüğündedir (`BaslikAnahtari`, `SablonKodu`) | Parça/parça grubu adının çevirisi istenirse çeviri tablosu (2.3) |
| **Yeni bildirim kanalı ve sağlayıcı** (WhatsApp, başka SMS firması, Huawei push) | `kod.BildirimKanali` satırı; `kod.DisSistem` satırı; `sistem.Giden.KanalKodu`, `SaglayiciKodu`; `bildirim.Cihaz.PushSaglayiciKodu`; ticari ileti izni `kod.RizaKanali`/`kvkk.RizaOlayi` ile | — |
| **Bayi paneli** | `kod.AktorTuru (bayi)`; `kod.KaynakUygulama (bayiPaneli)`; `erisim.Kullanici (TurKodu = bayi)`; `erisim.Izin`/`erisim.Rol`/`RolIzin` satırları; `kod.AliciTuru (bayi)` → `bildirim.Bildirim/Teslimat.KullaniciKimlik` (varsayılan kol); `kod.HedefKitle` satırları (ör. `bayi`); bayinin satış kaydı `makine.MakineSatisi (KaynakKodu = bayi)` için `kod.KayitKaynagi (bayi)`. Yapan CHECK'i varsayılan koldan geçer; bayi makineye servis atayamaz (varsayılan-red `547`) | Bayi kullanıcısı ↔ bayi bağı: `bayi.GirisHesabi` (servis kalıbı); belirli bayilere duyuru hedefi: `duyuru.HedefBayi` (2.3) |
| **Servis başına çok teknisyen** | Her teknisyene `erisim.Kullanici` + `servis.GirisHesabi` satırı (firmada tekillik yok); politika sınırı ayar `ServisBasinaEnFazlaGirisHesabi`; işi kimin kaydettiği `ServisZiyareti.YapanKullaniciKimlik`, `TeknisyenAdi` | Talebi iş başlamadan belirli teknisyene atamak: `talep.TeknisyenAtamasi` (2.3) |
| **Kurumsal müşteri ve çok yetkili** | `musteri.HesapKisisi` çok satır (`RolKodu` → `kod.KisiRolu`; yeni rol = satır; her kişinin iletişim telefonu); `talep.FaturaBilgisi (FaturaTuruKodu = firma, Unvan, VergiNo…)`; `entegrasyon.CariKarti` | Her yetkilinin kendi telefonuyla ayrı giriş yapması (bugün hesap başına tek giriş telefonu) (2.3) |
| **Yurt dışı müşteri / farklı para birimi** | `cografya.Ulke`, `YurtdisiBolge` (tohumda); [Y] yurt dışı alanları; [F] E.164; `talep.Talep.Ihracat`; `kod.ParaBirimi (EUR)`; `katalog.Marka.ParaBirimiKodu` ya da şirket ayarı `ParaBirimi`; `katalog.FiyatListesi.ParaBirimiKodu`; her tutarda `ParaBirimiKodu`; döküm tekilliği para birimini içerir; görünümler para birimine göre gruplar | Kur tutmak (1.9.1; 2.3) |
| **İkinci ERP / e-fatura entegratörü / kargo API'si** | `kod.DisSistem` satırı; `entegrasyon.BelgeBagi (DisSistemKodu, DisKayitNo metin, Ettn, BelgeTuruKodu)`; `entegrasyon.CariKarti (DisSistemKodu, FirmaNo NULL, SirketKodu, CariKodu)`; `entegrasyon.BelgeBagi.SirketKodu` (uygulamada eklendi, 17.09.2026: aynı dış sistemi iki şirket kullanabilir); `kod.BelgeTuru`, `kod.IceAktarimTuru` satırları; kargo: `kod.KargoFirmasi (DisSistemKodu)`, `talep.ParcaSevki.KargoFirmasiKodu/TakipNo` | İkinci ERP'nin malzeme kartı (`entegrasyon.MalzemeKarti`); kargo hareket geçmişi (`talep.SevkHareketi`) (2.3) |
| **Makineye yeni özellik alanları** (çalışma saati, GPS/telemetri) | — | Tek değerli özellik: `makine.Makine`'ye boş olabilir kolon; zamana bağlı ölçüm: ayrı tablo (2.3). Telemetri ana tablolara yazılmaz |
| **Yeni ayar, izin, işlem kaydı türü** | `sistem.Ayar`, `erisim.Izin` + `RolIzin`, `kod.IslemTuru` (+`IslemKategorisi`) satırları | — |
| **Yeni saklama kuralı** | `kod.KayitTuru` + `sistem.SaklamaKurali` satırı | Yeni tabloyu kapsayacaksa `sistem.SaklamaUygula`'ya blok (R betiği; V değil) |
| **Yeni kontrol ya da rapor görünümü** | — | R betiği (`gorunum`); rapor rolüne açılacaksa Bölüm 4.2 listesi ve CD-YETKI güncellenir (V betiği değil) |

### 2.3 Şema değişikliği gerekenlerde ekleme betiği kalıbı

| İhtiyaç | Yeni V betiği ne yapar | Mevcut tablolara etkisi |
|---|---|---|
| Bayi paneli girişleri | `bayi.GirisHesabi (KullaniciKimlik PK FK erisim.Kullanici, BayiKimlik FK, Aciklama, [O])` | Yok |
| Belirli bayilere duyuru | `duyuru.HedefBayi (DuyuruKimlik, BayiKimlik)` | Yok |
| Teknisyen ataması | `talep.TeknisyenAtamasi ([K], TalepKimlik, KullaniciKimlik, BaslangicZamani, BitisZamani, [A]; UNIQUE (TalepKimlik) WHERE BitisZamani IS NULL)` | Yok |
| Kurumsal hesapta çok giriş telefonu | `musteri.EkGirisTelefonu ([K], HesapKimlik, HesapKisisiKimlik, TelefonE164, UNIQUE (TelefonE164) WHERE PasifZamani IS NULL, [O], PasifZamani)` + R betiğinde `musteri.Hesap.TelefonE164` ile çakışmayı reddeden tetikleyici | Yok |
| İkinci ERP malzeme kartı | `entegrasyon.MalzemeKarti` (`CariKarti` kalıbı: `DisSistemKodu`, `FirmaNo`, `MalzemeKodu`, `DisKayitNo`, hedef kolonları) | Yok (`LogoMalzemeKarti` "kullanılmıyor" açıklamasıyla kalır) |
| Kargo hareketleri | `talep.SevkHareketi ([K], ParcaSevkiKimlik, HareketZamani, DurumMetni, [O])` | Yok |
| Türe özgü yeni alanlar | Yeni ayrıntı tablosu (`TalepKimlik PK`, `TurKodu` sabiti + FK `(TalepKimlik, TurKodu)`) | Yok |
| Parça adı çevirisi | `katalog.ParcaCevirisi (MarkaKodu, ParcaKodu, DilKodu, Ad)` | Yok |
| Makinede tek değerli yeni alan | `makine.Makine`'ye boş olabilir kolon (+ gerekirse dizin) | Kolon eklenir |
| Makinede zamana bağlı ölçüm | `makine.CalismaSaatiOlcumu ([K], MakineKimlik, OlcumZamani, Saat, KaynakKodu, [O])` ya da telemetri için ayrı tablo | Yok |
| Kur | `sistem.DovizKuru (ParaBirimiKodu, KurTarihi, Kur decimal(18,6), KaynakKodu)` + gerekirse para satırlarına boş olabilir `TryKarsiligiTutari` | Kolon eklenir |
| Gizli içerik taşıyan yeni kayıt türü | `sistem.Giden` gizlilik CHECK'ini aynı adla düşürüp genişletilmiş listeyle yeniden kurar | CHECK yeniden kurulur |
| Teknik listeye değer (Bölüm 1.17.7) | `ALTER TABLE … DROP CONSTRAINT` + aynı adla genişletilmiş CHECK | CHECK yeniden kurulur |

Her ek V betiği açıklamaları yazar (`dbo.AciklamaYaz`), yeni tabloya yetki kararını aynı betikte verir (GRANT/DENY), ilgili katalog belgesine eklenir; `eslesme.json` ve sınamalar güncellenir.

---

## 3. Bulunabilirlik

Bu bölüm sözleşmeyi (amaç, kolonlar, parametreler, kaynaklar, doğrulamalar) verir. Görünümlerin birleştirme mantığı ve prosedürlerin sözde kodu `veritabani/tasarim/katalog-08-denetim-entegrasyon-gorunum-yardim-yonetim.md`'dedir ve buradaki sözleşmeye uyar.

### 3.1 Ortak kurallar

#### 3.1.1 İnsan için sonuçlarda (görünüm ve `yardim`/`yonetim` sonuç kümeleri)

- `uniqueidentifier` kolon yoktur. Satırın kendi seçme anahtarı `KayitNo`; bağlı kaydınki `<Varlik>KayitNo` (`ServisKayitNo`, `HesapKayitNo`).
- Kodun yanında Türkçe etiketi durur: `DurumKodu` + `DurumAdi` (kod tablosunun `Ad`'ı; görünümde sabit Türkçe metin yazılmaz).
- Numaranın iki biçimi: saklanan `Numara` (`SRV2600123`) + ekrandaki `<Tur>Numarasi` (`TalepNumarasi = SRV-26-00123`). Seri numarası saklandığı gibi gösterilir; süzerken `yardim.Sadelestir` kullanılır.
- Telefon E.164 (`+905321234567`).
- Zaman: `…ZamaniTurkiye` (`datetime2(0)`) ve gün süzgeci için `…Tarihi` (Türkiye günü). UTC `…Zamani` kolonu gösterilmez (CD-GORUNUM).
- Kişisel iletişim verisi yalnız rapor rolüne açılmayan görünümlerde bulunur (Bölüm 4.2).

#### 3.1.2 Türkiye saati yardımcısı

`gorunum.Bugun` (tek satır): `Tarih` (Türkiye bugünü), `AyBasi`, `HaftaBasi` (Pazartesi: `DATEADD(day, -(DATEDIFF(day, '19000101', Tarih) % 7), Tarih)`), `YilBasi`, `SimdiTurkiye`. Bütün görünümler Bölüm 1.8 ifadelerini kullanır.

#### 3.1.3 Sonuç kümesi düzeni (`yardim`)

- Her sonuç kümesinin ilk kolonu `Bolum` (sabit başlık, Codex'ten: `N'<Codex metni: 1 · Özet>'`).
- Prosedürün döndürdüğü küme sayısı ve sırası sabittir; veri yoksa küme boş döner.
- Liste kümelerinde en çok 200 satır (zaman azalan); fazlası varsa kümenin her satırında `DahaFazlaVar = 1`; tam liste için ilgili `gorunum` görünümü.

#### 3.1.4 `yardim.Sadelestir` — tek normalleştirme işlevi

Satır içi tablo değerli işlev `yardim.Sadelestir (@Metin nvarchar(400))`; tek satır döner. `yardim` ve `yonetim` prosedürleri kullanıcı girdisini yalnız bu işlevle normalleştirir; API aynı kuralları JavaScript'te uygular ve `sinama` bu ikisini aynı girdilerle karşılaştırır. Sonuç kolonlarının hepsi `Latin1_General_100_BIN2`.

| Çıktı | Kural |
|---|---|
| `Kod` | Kırpılır, `BIN2`'ye çevrilir, 18 Türkçe harf ASCII karşılığına çevrilir, büyük harf, yalnız `A-Z0-9` kalır. `SRV-26-00123 → SRV2600123`; `orK1270-2024-00157 → ORK1270202400157`; `ıpak-2024-001 → IPAK2024001` |
| `Rakam` | Yalnız `0-9` |
| `TelefonE164` | `Rakam` boşsa NULL; girdi `+` ile başlıyorsa `'+' + Rakam`; `Rakam` `00` ile başlıyorsa `'+' + 3. karakterden sonrası`; `Rakam` `90` ile başlıyor ve 12 haneyse `'+' + Rakam`; baştaki sıfırlar atılmış hâli 10 haneyse `'+90' + o`; sonuç 8–16 karakter değilse NULL |
| `TelefonUlusal` | `TelefonE164` `+90` ile başlıyor ve 13 karakterse son 10 hane; değilse `Rakam`'ın baştaki sıfırları atılmış hâli |
| `GirisAdi` | 18 harf çevrilir, küçük harf (`BIN2`), yalnız `a-z0-9.` kalır. `IZMIR.Merkez → izmir.merkez`, `ızmır.merkez → izmir.merkez` |
| `Arama` | Bölüm 1.4.3 dönüşümünün aynısı, `nvarchar(400)` |

Başvuru uygulaması (16.09.2026 sınandı):

```sql
CREATE OR ALTER FUNCTION yardim.Sadelestir (@Metin nvarchar(400))
RETURNS TABLE
AS RETURN
WITH girdi AS (
  SELECT LTRIM(RTRIM(ISNULL(@Metin, N''))) COLLATE Latin1_General_100_BIN2 AS Ham
), turkcesiz AS (
  SELECT Ham,
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      Ham,
      N'ç',N'c'), N'Ç',N'C'), N'ğ',N'g'), N'Ğ',N'G'), N'ı',N'i'), N'İ',N'I'),
      N'ö',N'o'), N'Ö',N'O'), N'ş',N's'), N'Ş',N'S'), N'ü',N'u'), N'Ü',N'U'),
      N'â',N'a'), N'Â',N'A'), N'î',N'i'), N'Î',N'I'), N'û',N'u'), N'Û',N'U') AS Duz
  FROM girdi
), sira AS (
  SELECT TOP (SELECT LEN(Ham) FROM girdi) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
  FROM (VALUES (0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0)) a(x)
  CROSS JOIN (VALUES (0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0),(0)) b(x)
), harf AS (
  SELECT s.i, UPPER(SUBSTRING(t.Duz, s.i, 1)) AS b, LOWER(SUBSTRING(t.Duz, s.i, 1)) AS k
  FROM turkcesiz t CROSS JOIN sira s
), parca AS (
  SELECT
    (SELECT STRING_AGG(b, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE b LIKE N'[A-Z0-9]') AS Kod,
    (SELECT STRING_AGG(b, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE b LIKE N'[0-9]') AS Rakam,
    (SELECT STRING_AGG(k, N'') WITHIN GROUP (ORDER BY i) FROM harf WHERE k LIKE N'[a-z0-9.]') AS GirisAdi,
    (SELECT CASE WHEN Ham LIKE N'+%' THEN 1 ELSE 0 END FROM girdi) AS Arti,
    (SELECT LOWER(Duz) FROM turkcesiz) AS Arama
), sifirsiz AS (
  SELECT Kod, Rakam, GirisAdi, Arti, Arama,
         REPLACE(LTRIM(REPLACE(Rakam, N'0', N' ')), N' ', N'0') AS RakamSifirsiz
  FROM parca
), tel AS (
  SELECT Kod, Rakam, GirisAdi, Arama, RakamSifirsiz,
    CASE
      WHEN Rakam IS NULL THEN NULL
      WHEN Arti = 1 THEN N'+' + Rakam
      WHEN Rakam LIKE N'00%' THEN N'+' + SUBSTRING(Rakam, 3, 400)
      WHEN Rakam LIKE N'90%' AND LEN(Rakam) = 12 THEN N'+' + Rakam
      WHEN LEN(RakamSifirsiz) = 10 THEN N'+90' + RakamSifirsiz
    END AS E164
  FROM sifirsiz
)
SELECT CAST(Kod AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Kod,
       CAST(Rakam AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Rakam,
       CAST(CASE WHEN LEN(E164) BETWEEN 8 AND 16 THEN E164 END AS nvarchar(16)) COLLATE Latin1_General_100_BIN2 AS TelefonE164,
       CAST(CASE WHEN E164 LIKE N'+90%' AND LEN(E164) = 13 THEN SUBSTRING(E164, 4, 10)
                 ELSE RakamSifirsiz END AS nvarchar(20)) COLLATE Latin1_General_100_BIN2 AS TelefonUlusal,
       CAST(GirisAdi AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS GirisAdi,
       CAST(Arama AS nvarchar(400)) COLLATE Latin1_General_100_BIN2 AS Arama
FROM tel;
```

Kullanım örneği (reçetelerde): `SELECT * FROM gorunum.MakineKarti WHERE SeriNo = (SELECT Kod FROM yardim.Sadelestir(N'ork1270-2024-00157'));`

#### 3.1.5 Hedef satırı seçme (`yonetim` parametreleri)

- Numaralı kayıt numarayla (her yazımı kabul; `Sadelestir(...).Kod`).
- Numarasız alt kayıt iki anahtarla: üst kaydın numarası + satırın `KayitNo`'su (`@TalepNumarasi` + `@DekontKayitNo`). İkisi aynı kayda ait değilse `51104`.
- Servis ve bayi `KayitNo` ile; aynı adlı iki firma ada göre seçilmez.
- Personel ve servis girişi giriş adıyla (`Sadelestir(...).GirisAdi`).
- Makine `@SeriNo` (her yazım) + `@MarkaKodu` (**Uygulamada değişti (17.09.2026):** varsayılan NULL; seri tek markada bulunursa o marka, birden çok markada bulunursa `51103`).
- Müşteri telefonla (her yazım; güncel telefon); ada göre seçim `yonetim`'de yapılmaz.
- Numarası olmayan hareket, başvuru `KayitNo` ile (`@HareketKayitNo`, `@BasvuruKayitNo`).

### 3.2 `gorunum` görünümleri

"Rapor" sütunu `rol_rapor`'un SELECT alıp almadığını söyler (Bölüm 4.2). `rol_yonetici` hepsini okur; `rol_uygulama` yalnız `GecerliAyar`'ı okur.

| Görünüm | Amaç | Kolonlar | Kaynak | Rapor |
|---|---|---|---|---|
| `Bugun` | Türkiye bugünü | `Tarih`, `AyBasi`, `HaftaBasi`, `YilBasi`, `SimdiTurkiye` | — | Evet |
| `GecerliAyar` | Her ayarın genel/şirket/marka için geçerli değeri | `Anahtar`, `SirketKodu`, `MarkaKodu`, `DegerTuru`, `Deger`, `KapsamTuru`, `Aciklama`, `AyarKayitNo` | `sistem.Ayar`, `sirket.Sirket`, `katalog.Marka` (Bölüm 1.15.5) | Hayır |
| `TalepListesi` | Talebin tek satırlık tam özeti | `TalepNumarasi`, `Numara`, `TurKodu`, `TurAdi`, `KaynakKodu`, `KaynakAdi`, `DurumKodu`, `DurumAdi`, `Kapali`, `Gecikti`, `TeklifBekliyor`, `SahipKodu`, `SahipAdi`, `MasaKodu`, `MasaAdi`, `MarkaKodu`, `MarkaAdi`, `MusteriAdi`, `MusteriTelefonu`, `HesapKayitNo`, `UlkeAdi`, `IlKodu`, `IlAdi`, `IlceAdi`, `YurtdisiBolge`, `Ihracat`, `UrunAdi`, `SeriNo`, `ServisAdi`, `ServisKayitNo`, `BayiAdi`, `OlusmaZamaniTurkiye`, `OlusmaTarihi`, `GuncellemeZamaniTurkiye`, `KapanmaZamaniTurkiye`, `KapanmaTarihi`, `OlusturanTuruAdi`, `OlusturanAdi`, `KaynakUygulamaAdi`, `EskiNumara`, `CihazNumarasi`, `KayitNo` | `talep.Talep`; `kod.TalepTuru/TalepKaynagi/TalepDurumu/Sahip/Masa/AktorTuru/KaynakUygulama`; `katalog.Marka/Urun`; `musteri.HesapKisisi` (etkin hesap sahibi; hesapsızsa `IletisimAdi`, `IletisimTelefonE164`); `cografya.*`; `makine.Makine`; `servis.Servis`; `talep.BayiAtamasi` (etkin) + `bayi.Bayi`; `talep.Teklif` (son); `gorunum.GecerliAyar` | Hayır |
| `TalepIstatistigi` | İletişim verisi içermeyen talep listesi | `TalepNumarasi`, `TurAdi`, `KaynakAdi`, `DurumAdi`, `Kapali`, `Gecikti`, `SahipAdi`, `MasaAdi`, `MarkaAdi`, `UrunAdi`, `UlkeAdi`, `IlAdi`, `IlceAdi`, `Ihracat`, `OlusmaTarihi`, `KapanmaTarihi`, `SonKapanisTuruAdi`, `SonIptalKoduAdi`, `KaynakUygulamaAdi`, `ParcaGenelToplami`, `OdenecekTutar`, `ParaBirimiKodu` | `TalepListesi` kaynakları + `talep.Kapanis`, `talep.Iptal` (son satır), `talep.ParcaTalebiAyrinti` | Evet |
| `TalepDurumGecmisi` | Durum, sahip, masa değişiklikleri | `TalepNumarasi`, `ZamanTurkiye`, `Tarihi`, `OncekiDurumAdi`, `YeniDurumAdi`, `OncekiSahipAdi`, `YeniSahipAdi`, `OncekiMasaAdi`, `YeniMasaAdi`, `MusteriyeBildirildi`, `YapanTuruAdi`, `YapanAdi`, `KaynakUygulamaAdi`, `KayitNo` | `talep.DurumGecmisi`, `talep.Talep`, `kod.*` | Hayır |
| `MusteriKarti` | Hesabın tek satırı | `HesapKayitNo`, `HesapDurumu`, `Telefon`, `HesapSahibiAdi`, `YetkiliKisiler`, `UlkeAdi`, `IlAdi`, `IlceAdi`, `Adres`, `SaticiBeyani`, `BeyanBayiAdi`, `DilAdi`, `MakineSayisi`, `AcikTalepSayisi`, `ToplamTalepSayisi`, `BirlestigiHesapKayitNo`, `BirlesenHesapSayisi`, `CariKodlari`, `TicariIletiSecimi`, `OlusmaZamaniTurkiye`, `SonGirisZamaniTurkiye`, `AnonimlestirmeZamaniTurkiye`, `EskiNumara` | `musteri.Hesap`, `musteri.HesapKisisi`, `makine.MakineGuncelSahibi`, `talep.Talep`, `entegrasyon.CariKarti`, `kvkk.GuncelRiza`, `bayi.Bayi`, `cografya.*`, `kod.Dil` | Hayır |
| `MakineKarti` | Makinenin sahibi, bayisi, servisi, garantisi | `MakineKayitNo`, `MarkaKodu`, `MarkaAdi`, `SeriNo`, `SeriBicimeUygun`, `UrunAdi`, `VaryantAdi`, `UretimYili`, `SahibiAdi`, `SahibiTelefonu`, `SahipBilgisininKaynagi` (`hesap`/`kayitBeyani`), `SahibiHesapKayitNo`, `SahiplikBaslangicTarihi`, `BayiAdi`, `BayiKayitNo`, `ServisAdi`, `ServisKayitNo`, `ServisKaynagiAdi`, `BayiFaturaTarihi`, `TeslimTarihi`, `GarantiDayanagiAdi`, `GarantiBaslangicTarihi`, `GarantiBitisTarihi`, `Garantide`, `LogoMalzemeKodu`, `AcikTalepSayisi`, `OlusmaZamaniTurkiye` | `makine.Makine`, `MakineGuncelSahibi`, `MakineninBayisi`, `MakineninServisi`, `MakineGarantisi`, `MakineSatisi`, `KayitOlayi` (son `BeyanAdi`), `katalog.*`, `musteri.*`, `servis.Servis`, `bayi.Bayi`, `gorunum.Bugun` | Hayır |
| `ServisKarti` | Servis firmasının tek satırı | `ServisKayitNo`, `ServisAdi`, `ServisTuruAdi`, `DurumAdi`, `PilotKatilimcisi`, `IlAdi`, `IlceAdi`, `Adres`, `Telefon`, `GirisAdlari`, `AktifGirisSayisi`, `EtkinMarkalar`, `BolgeOzeti`, `Bayiler`, `CariKodlari`, `VergiNoTuruAdi`, `VergiNoMaskeli`, `IbanMaskeli`, `AcikTalepSayisi`, `OnayBekleyenHakEdisSayisi`, `AcikSifreYardimTalebi`, `EskiNumara`, `OlusmaZamaniTurkiye` | `servis.*`, `erisim.Kullanici`, `entegrasyon.CariKarti`, `talep.Talep`, `hakedis.HakEdis`, `bayi.Bayi`, `katalog.Marka`, `cografya.*` | Hayır |
| `BayiKarti` | Bayinin tek satırı | `BayiKayitNo`, `BayiAdi`, `DurumAdi`, `PilotKatilimcisi`, `IlAdi`, `IlceAdi`, `Adres`, `Telefon`, `EtkinMarkalar`, `BagliServisler`, `CariKodlari`, `SatilanMakineSayisi`, `AcikBayiAtamasiSayisi`, `EskiNumara`, `OlusmaZamaniTurkiye` | `bayi.*`, `servis.BayiBagi`, `servis.Servis`, `entegrasyon.CariKarti`, `makine.MakineninBayisi`, `talep.BayiAtamasi` | Hayır |
| `HakEdisListesi` | Hak edişler, tutarlar kalemlerden | `TalepNumarasi`, `ZiyaretNo`, `ServisAdi`, `ServisKayitNo`, `SirketAdi`, `MarkaAdi`, `DurumKodu`, `DurumAdi`, `Km`, `YolTutari`, `IscilikTutari`, `DigerTutar`, `NetTutar`, `KdvTutari`, `TevkifatTutari`, `StopajTutari`, `CariEtkisiTutari`, `ParaBirimiKodu`, `DonemDokumuNumarasi`, `OlusmaZamaniTurkiye`, `OlusmaTarihi`, `OnayZamaniTurkiye`, `OnayTarihi`, `OnaylayanAdi`, `RedZamaniTurkiye`, `RedEdenAdi`, `KayitNo` (serbest metin `RedNedeni` bu görünümde yok; `yardim.HakEdisGoster`'de) | `hakedis.HakEdis`, `HakEdisKalemi` (`yol` → `Km` = `Miktar`, `YolTutari`; `iscilik` → `IscilikTutari`; öteki türler toplamı → `DigerTutar`), `talep.ServisZiyareti`, `talep.Talep`, `servis.Servis`, `sirket.Sirket`, `katalog.Marka`, `hakedis.DonemDokumu` | Evet |
| `ServisHesapHareketleri` | Servisin hareket listesi | `KayitNo`, `ServisAdi`, `ServisKayitNo`, `SirketAdi`, `MarkaAdi`, `ParaBirimiKodu`, `HareketZamaniTurkiye`, `HareketTarihi`, `HareketTuruAdi`, `YonKodu`, `AlacakTutari`, `BorcTutari`, `KdvHaricTutar`, `KdvTutari`, `TevkifatTutari`, `StopajTutari`, `TalepNumarasi`, `DonemDokumuNumarasi`, `BelgeNo`, `DuzeltilenHareketKayitNo`, `GeriAlindi`, `YapanAdi` (serbest metin `Aciklama` bu görünümde yok; `yardim.ServisGoster`'de) | `hakedis.ServisHesapHareketi`, `hakedis.HakEdis`, `talep.ParcaTalebiAyrinti`, `talep.Talep`, `hakedis.DonemDokumu`, `entegrasyon.BelgeBagi` | Evet |
| `ServisBakiyesi` | Servis × şirket × para birimi bakiyesi (bilgi amaçlı; LOGO esas) | `ServisAdi`, `ServisKayitNo`, `SirketAdi`, `ParaBirimiKodu`, `AlacakToplami`, `BorcToplami`, `Bakiye`, `SonHareketZamaniTurkiye` | `hakedis.ServisHesapHareketi` (Bölüm 1.9.3) | Evet |
| `IslemGecmisi` | İşlem kaydı | `KayitNo`, `IslemZamaniTurkiye`, `IslemTarihi`, `IslemTuruKodu`, `IslemTuruAdi`, `KategoriAdi`, `YapanTuruAdi`, `YapanAdi`, `YapanRolAdi`, `YapanGirisAdi`, `KaynakUygulamaAdi`, `UygulamaSurumu`, `IlgiliKayitTuruAdi`, `IlgiliNumara`, `Gerekce` (`JSON_VALUE(AyrintiJson, '$.gerekce')`), `SqlGirisi` (`'$.sqlGirisi'`), `Bilgisayar` (`'$.bilgisayar'`), `AyrintiJson` | `denetim.IslemKaydi`, `kod.IslemTuru/IslemKategorisi/AktorTuru/KaynakUygulama/KayitTuru`, `erisim.Kullanici` | Hayır |
| `DuyuruListesi` | Duyuru ve okunma sayıları | `KayitNo`, `Baslik`, `TurAdi`, `AltTurKodu`, `DuyuruAltTuruAdi`, `HedefKitleAdi`, `DilAdi`, `YayinDurumu` (`bekliyor`/`yayinda`/`bitti`/`kaldirildi`), `HedefOzeti`, `HedeflenenSayisi`, `GonderilenSayisi`, `CihazaUlasanSayisi`, `PencereyiGorenSayisi` (`GorulmeZamani` dolu), `ListedeOkuyanSayisi` (`OkunmaZamani` dolu), `KabulEdenSayisi`, `YayinZamaniTurkiye`, `BitisZamaniTurkiye`, `YayindanKaldirmaZamaniTurkiye`, `YayinlayanAdi`, `KaldiranAdi` | `duyuru.Duyuru`, `duyuru.Hedef*`, `bildirim.Teslimat`, `kod.*` | Evet |
| `KontrolLogoCariKoduEksik` | Etkin marka yetkisi olan aktif servis/bayiden, o markaların şirketinin `LogoFirmaNo`'sunda etkin `logo` cari kartı olmayanlar (şirketin `LogoFirmaNo`'su boşsa hiç etkin `logo` cari kartı olmayanlar) | `FirmaTuru` (`servis`/`bayi`), `FirmaAdi`, `FirmaKayitNo`, `SirketAdi`, `LogoFirmaNo`, `EtkinMarkalar`, `OlusmaZamaniTurkiye` | `servis.*`, `bayi.*`, `katalog.Marka`, `sirket.Sirket`, `entegrasyon.CariKarti` | Evet |
| `KontrolOnayBekleyenHakEdis` | Onay bekleyen hak edişler | `TalepNumarasi`, `ZiyaretNo`, `ServisAdi`, `NetTutar`, `ParaBirimiKodu`, `BeklemeGunu`, `OlusmaZamaniTurkiye` | `hakedis.HakEdis`, `talep.*`, `servis.Servis` | Evet |
| `KontrolHakEdisToplamiUyusmuyor` | `NetTutar ≠ SUM(HakEdisKalemi.Tutar)` | `TalepNumarasi`, `ZiyaretNo`, `ServisAdi`, `DurumAdi`, `NetTutar`, `KalemToplami`, `Fark`, `ParaBirimiKodu` | `hakedis.HakEdis`, `HakEdisKalemi` | Evet |
| `KontrolHakEdisHareketiUyusmuyor` | Geri alınmamış `hakEdisAlacagi` hareketleri içinde tutarı, bağı ya da hak ediş durumu kaynağıyla uyuşmayanlar (Bölüm 1.9.3; 51042 ve 51046 kapılarını atlamış satır) | `TalepNumarasi`, `ZiyaretNo`, `ServisAdi`, `DurumAdi`, `HakEdisCariEtkisi`, `HareketTutari`, `Fark`, `BagUyusmuyor`, `ParaBirimiKodu`, `HareketZamaniTurkiye`, `HareketKayitNo` | `hakedis.ServisHesapHareketi`, `hakedis.HakEdis`, `talep.*`, `servis.Servis` | Evet |
| `KontrolOdemeOnayiBekleyenParca` | Dekontu gelmiş, etkin ödeme onayı olmayan açık müşteri parça talepleri | `TalepNumarasi`, `DurumAdi`, `OdenecekTutar`, `ParaBirimiKodu`, `DekontSayisi`, `SonDekontZamaniTurkiye`, `BeklemeGunu` | `talep.*` | Evet |
| `KontrolOdemeTutariUyusmayanParca` | `OnaylananTutar ≠ OdenecekTutar` | `TalepNumarasi`, `OdenecekTutar`, `OnaylananTutar`, `Fark`, `ParaBirimiKodu`, `OnayZamaniTurkiye`, `OnaylayanAdi` | `talep.ParcaTalebiAyrinti`, `talep.OdemeOnayi` | Evet |
| `KontrolOdemeSuresiDolanParca` | `odemeBekliyor` ve `SonOdemeTarihi` geçmiş | `TalepNumarasi`, `SonOdemeTarihi`, `GecenGun`, `OdenecekTutar`, `ParaBirimiKodu` | `talep.*`, `gorunum.Bugun` | Evet |
| `KontrolSeriBicimiUyumsuzMakine` | `SeriBicimeUygun = 0` | `MarkaAdi`, `SeriNo`, `UrunAdi`, `OlusmaZamaniTurkiye`, `MakineKayitNo` | `makine.Makine`, `katalog.*` | Evet |
| `KontrolServisiOlmayanSahipliMakine` | Zincirde servisi olmayan ve (sahibi olan ya da servis kaynaklı kayıt olayı olan) makineler | `MarkaAdi`, `SeriNo`, `UrunAdi`, `SahipVar`, `SahiplikBaslangicTarihi`, `SahibiIlAdi`, `KaydedenServisAdi` (son `KayitOlayi.KaynakKodu = servis` satırının servisi), `KayitZamaniTurkiye`, `MakineKayitNo` | `makine.*`, `musteri.Hesap`, `servis.Servis`, `cografya.Il` | Evet |
| `KontrolKapanmamisDonem` | Ayı geçmiş, `odendi`/`iptal` olmayan dökümler | `DokumNumarasi`, `ServisAdi`, `SirketAdi`, `ParaBirimiKodu`, `DonemYili`, `DonemAyi`, `DurumAdi`, `GecenGun` | `hakedis.DonemDokumu`, `gorunum.Bugun` | Evet |
| `MutabakatHakEdisLogo` | Servis × şirket × ay: onaylı hak ediş neti ile o carinin iptal edilmemiş LOGO servis faturası/gider pusulası KDV hariç toplamı | `ServisAdi`, `SirketAdi`, `ParaBirimiKodu`, `DonemYili`, `DonemAyi`, `OnayliHakEdisNetToplami`, `LogoBelgeKdvHaricToplami`, `Fark`, `DokumNumarasi` | `hakedis.*`, `entegrasyon.BelgeBagi`, `entegrasyon.CariKarti` | Evet |
| `MutabakatParcaLogo` | Ödeme onaylı parça talepleri ile bağlı, iptal edilmemiş satış faturaları | `TalepNumarasi`, `OdenecekTutar`, `OnaylananTutar`, `LogoSatisFaturasiTutari`, `Fark`, `BelgeNo`, `BelgeTarihi`, `ParaBirimiKodu` | `talep.*`, `talep.TalepBelgesi`, `entegrasyon.BelgeBagi` | Evet |

Kural ayrıntıları:
- `Gecikti = 1`: `Kapali = 0` AND `kod.TalepDurumu.GecikmeSayilir = 1` AND `DATEDIFF(minute, OlusmaZamani, SYSUTCDATETIME()) > 60 * <GecerliAyar TalepGecikmeSaati, talebin markası>` (veri.js:1030 `gecikmisMi`).
- **Uygulamada değişti (17.09.2026):** `MutabakatHakEdisLogo` ve `MutabakatParcaLogo` belgenin ve cari kartın şirketini `COALESCE(SirketKodu, <FirmaNo = sirket.Sirket.LogoFirmaNo eşleşen şirketin Kod'u>)` ile okur (0.4 entegrasyon notu).
- **Uygulamada değişti (18.09.2026):** iki mutabakat görünümü de topladığı belgeyi `entegrasyon.BelgeBagi.DisSistemKodu = N'logo'` ile süzer (cari kartı doluysa `entegrasyon.CariKarti.DisSistemKodu` da). Sözleşme ve kolon adları (`LogoBelgeKdvHaricToplami`, `LogoSatisFaturasiTutari`) toplamın LOGO belgeleri olduğunu söylüyordu ama süzgeç yoktu. Bugün belge üretebilen tek dış sistem `logo`, bu yüzden sayı değişmez; Bölüm 2.2'deki "ikinci ERP / e-fatura entegratörü" eklenince aynı fatura iki dış sistemden gelir ve süzgeçsiz toplam onu iki kez sayardı — `Fark` sıfır yerine fatura tutarı kadar çıkar, mutabakat kararı yanlış verilirdi.
- `TeklifBekliyor = 1`: `DurumKodu = N'teklif'` AND son `talep.Teklif.OlusmaZamani` (yoksa talebin) üzerinden `<GecerliAyar TeklifBeklemeGunu>` günden fazla geçmiş (veri.js:1207 `teklifBekliyorMu`). Sabit sayı yazılmaz.
- Bu belgede adı geçmeyen yeni görünüm R betiğiyle eklenir ve aynı kurallara uyar.

### 3.3 Alan şemalarındaki görünümler (uygulama ve `gorunum` okur)

| Görünüm | Kolonlar | Kural |
|---|---|---|
| `makine.MakineGuncelSahibi` | `MakineKimlik`, `HesapKimlik`, `TakmaAd`, `BaslangicZamani` | Açık sahiplik |
| `makine.MakineninBayisi` | `MakineKimlik`, `BayiKimlik`, `MakineSatisiKimlik`, `SatisTuruKodu`, `FaturaTarihi` | Satan bayinin tek tanımı. `IptalZamani IS NULL AND DogrulamaDurumuKodu <> N'reddedildi' AND COALESCE(AliciBayiKimlik, SaticiBayiKimlik) IS NOT NULL` olan satışlar içinde en son (`OlusmaZamani`) satış; `BayiKimlik = COALESCE(AliciBayiKimlik, SaticiBayiKimlik)` (PAKSAN'dan bayiye satışta alıcı bayi, bayiden çiftçiye satışta satıcı bayi). Doğrulama durumu (`bekliyor` dahil) zinciri etkilemez |
| `makine.MakineninServisi` | `MakineKimlik`, `ServisKimlik`, `ServisKaynagiKodu` (`makineAtamasi`/`bayiServisi`/NULL) | Müşterinin servisinin tek kaynağı (servisAtama.js). (1) Açık `MakineServisAtamasi`, `servis.MarkaYetkisi.Etkin = 1` ve servis `aktif`; (2) değilse `MakineninBayisi` → `servis.BayiBagi` (`Oncelik` artan) → servis `aktif`, servis ve bayi makinenin markasında `Etkin = 1`; (3) değilse NULL |
| `makine.MakineGarantisi` | `MakineKimlik`, `GarantiDayanagiKodu`, `BaslangicTarihi`, `BitisTarihi`, `Dogrulandi` | Bölüm 1.9.6 |
| `kvkk.GuncelRiza` | `HesapKimlik`, `MetinKodu`, `SecimKodu`, `Surum`, `DilKodu`, `OlayZamani` | Hesap × metin başına en son olay |
| `katalog.MarkaKurallari` | `MarkaKodu`, `SirketKodu`, `GarantiYil`, `GarantiBaslangicEsasiKodu`, `GarantiFaturaEkGun`, `ServisIskontoOrani`, `ParaBirimiKodu`, `KdvOrani` | Bölüm 1.15.5 düşme sırası |
| `talep.ZiyaretGuncelParcasi` | `ZiyaretKimlik`, `SiraNo`, `MarkaKodu`, `ParcaKodu`, `ParcaAdi`, `Adet`, `BirimFiyat`, `Kaynak` (`servis`/`duzeltme`) | Ziyaretin `ZiyaretDuzeltmesi` kaydı varsa en son düzeltmenin (en büyük `KayitNo`) `TarafKodu = N'yeni'` satırları (sıfır satır olabilir); yoksa `ZiyaretParcaSatiri`. API (Servisim, backoffice, Connect `cozum.parcalar`), `gorunum`, `yardim` ve raporlar ziyaret parça listesini yalnız buradan okur |

### 3.4 `yardim` prosedürleri

Ortak: yalnız okur (statik denetim `yardim` betiğinde `INSERT`, `UPDATE`, `DELETE`, `MERGE` ve `yardim.*` dışı `EXEC` görürse reddeder; **Uygulamada değişti (18.09.2026):** tek istisna `EXEC dbo.AciklamaYaz` — prosedürlerin dışında, kurulum anında `MS_Description` yazar, veri yazmaz; `denetle.mjs` `ISTISNALAR` listesinde gerekçesiyle yazılı); metin parametreleri `nvarchar(400)`; girdi `yardim.Sadelestir` ile normalleştirilir; sonuçlar Bölüm 3.1'e uyar. Yetki: yalnız `rol_yonetici` EXECUTE.

#### 3.4.1 `yardim.Ara @Metin nvarchar(400)`

- `Kod` 3 karakterden, `Rakam` 4 haneden ve `Arama` 3 karakterden kısaysa `51105`.
- Tek sonuç kümesi, en çok 200 satır, önce tam eşleşmeler, sonra `ZamanTurkiye` azalan. Kolonlar: `KayitTuru` (Türkçe etiket), `Gosterim` (`SRV-26-00123`, `ORK1270202400157`, `+905321234567`, firma adı), `Ozet` (durum, ad, il; TEL satırında karar durumu, eski ve yeni telefon, kanıt seri, karar veren), `EslesenAlan` (Türkçe etiket), `Tam bit`, `ZamanTurkiye`, `KayitNo`, `SonrakiAdim` (çalıştırılacak komut: `EXEC yardim.TalepGoster N'SRV-26-00123';`).
- Kapsam (girdinin uyduğu bütün satırlar birlikte aranır; biri diğerini engellemez):

| Girdi biçimi | Aranan kolonlar | Eşleşme |
|---|---|---|
| `Kod` 10 karakter ve `[A-Z][A-Z][A-Z][0-9]{7}` | `talep.Talep.Numara`, `musteri.TelefonDegisikligiTalebi.Numara`, `musteri.GeriBildirim.Numara`, `hakedis.DonemDokumu.Numara` | Eşit |
| `Kod` 3–20 karakter | `talep.Talep.EskiNumara`, `talep.Talep.CihazNumarasi`, `servis.Servis.EskiNumara`, `bayi.Bayi.EskiNumara`, `personel.Personel.EskiNumara`, `musteri.Hesap.EskiNumara` (kısa `SRV014` biçimli eski servis numarası burada bulunur) | Eşit |
| `Kod` en az 3 karakter | `makine.Makine.SeriNo`; `entegrasyon.CariKarti.CariKodu` (`UPPER(CariKodu COLLATE Latin1_General_100_BIN2)` ile, noktalama atılmış karşılaştırma) → servis, bayi ya da müşteri | Seri: eşit, sonra `LIKE Kod + N'%'`; cari: eşit |
| `TelefonE164` dolu | `musteri.Hesap.TelefonE164`, `musteri.HesapTelefonGecmisi.TelefonE164` (eski telefon), `musteri.HesapKisisi.TelefonE164`, `talep.Talep.IletisimTelefonE164`, `musteri.TelefonDegisikligiTalebi.EskiTelefonE164` ve `YeniTelefonE164`, `musteri.GeriBildirim.IletisimTelefonE164`, `personel.Personel.TelefonE164` | Eşit |
| `TelefonUlusal` en az 7 hane | `musteri.Hesap.TelefonUlusal`, `talep.Talep.IletisimTelefonUlusal` | Eşit |
| `GirisAdi` en az 3 karakter | `erisim.Kullanici.GirisAdi` → türüne göre servis (`servis.GirisHesabi`) ya da personel; `servis.SifreYardimTalebi.GirisAdiBeyani` | Eşit |
| `Arama` en az 3 karakter | `musteri.HesapKisisi.AdSoyadArama`, `talep.Talep.IletisimAdArama`, `servis.Servis.AdArama`, `bayi.Bayi.AdArama`, `personel.Personel.AdArama` | `LIKE N'%' + Arama + N'%'` |

- Birleşmiş hesabın satırı `Ozet`'te kalan hesabın `KayitNo`'sunu gösterir; `SonrakiAdim` kalan hesabı açar.

#### 3.4.2 `yardim.TalepGoster @Numara nvarchar(400)`

`Numara`, `EskiNumara` ya da `CihazNumarasi` (her yazım). Bulunamazsa `51102`. Sonuç kümeleri bu sırayla:

| # | Bölüm | İçerik | Kaynak |
|---|---|---|---|
| 1 | Özet | `gorunum.TalepListesi` satırı | `gorunum.TalepListesi` |
| 2 | Durum geçmişi | `gorunum.TalepDurumGecmisi` satırları | aynı |
| 3 | Ayrıntı ve belirtiler | Türe göre: makine durumu ve belirti adları; ilgi ürün, traktör gücü, ürün tipleri, araziler; parça ödeme özeti (`OdemeYontemiAdi`, `FiyatListesiKodu`, `KdvOrani`, `ListeKdvHaric`, `AraToplam`, `KdvTutari`, `GenelToplam`, `KargoTutari`, `OdenecekTutar`, `SonOdemeTarihi`, `TutarDogrulayanAdi`, `SirketAdi`, `TeslimatAdresi`) | uydu tablolar, `TalepBelirtisi`, `TeklifUrunTipi`, `TeklifArazi` |
| 4 | Parça satırları (müşterinin gördüğü fiyat görüntüsü) | `SiraNo`, `ParcaKodu`, `ParcaAdi`, `KatalogDisi`, `Aciklama`, `Adet`, `BirimFiyat`, `Tutar` | `talep.ParcaSatiri` |
| 5 | Fatura bilgisi | `FaturaTuruAdi`, `AdSoyad`, `Unvan`, `TcNoMaskeli`, `VergiNoMaskeli`, `VergiDairesi`, `Eposta`, `Telefon`, `IlAdi`, `IlceAdi`, `Adres` (şifreli ve özet kolon yok) | `talep.FaturaBilgisi` |
| 6 | Notlar | `ZamanTurkiye`, `Metin`, `MusteriGorur`, `ServisGorur`, `ServistenGeldi`, `YapanAdi`, `KaynakUygulamaAdi`, `KayitNo` | `talep.TalepNotu` |
| 7 | Randevular | `PlanlananZamanTurkiye`, `SaatBelirtildi`, `IsTanimi`, `MusteriyleGorusuldu`, `IptalZamaniTurkiye`, `YapanAdi`, `KayitNo` | `talep.Randevu` |
| 8 | Teklifler | `SiraNo`, `Tutar`, `ParaBirimiKodu`, `KdvDahil`, `GecerlilikBitisTarihi`, `GecerlilikMetni`, `TeklifNotu`, `YapanAdi`, `ZamanTurkiye`, `KayitNo` | `talep.Teklif` |
| 9 | Servis ziyaretleri | `ZiyaretNo`, `ServisAdi`, `KapiAdi`, `AsamaAdi`, `YapilanIsAdi`, `ArizaMetni`, `SonucMetni`, `Km`, `IscilikTutari`, `TeknisyenAdi`, `ParcaIstemeZamaniTurkiye`, `TamamlanmaZamaniTurkiye`, `YapanAdi`, `KayitNo` | `talep.ServisZiyareti` |
| 10 | Ziyaret parçaları ve düzeltmeler | `ZiyaretNo`, `Liste` (`guncel` — `talep.ZiyaretGuncelParcasi`; `servisinGonderdigi`; `duzeltmeOncesi`; `duzeltmeSonrasi`), `DuzeltmeNedeni`, `ParcaKodu`, `ParcaAdi`, `Adet`, `BirimFiyat`, `DuzeltenAdi`, `ZamanTurkiye` | `talep.ZiyaretGuncelParcasi`, `ZiyaretParcaSatiri`, `ZiyaretDuzeltmesi`, `ZiyaretDuzeltmesiParcasi` |
| 11 | Hak edişler ve kalemler | `gorunum.HakEdisListesi` satırları + kalemler (`KalemTuruAdi`, `Miktar`, `BirimAdi`, `BirimTutar`, `Tutar`) | `hakedis.HakEdis`, `HakEdisKalemi` |
| 12 | Dekontlar ve ödeme onayları | Dekont: `DekontKayitNo`, `YuklemeZamaniTurkiye`, `DosyaKayitNo`, `GecersizZamaniTurkiye`, `GecersizNedeni`, `GecersizKilanAdi`; onay: `OnayKayitNo`, `OnaylananTutar`, `ParaBirimiKodu`, `OnayNotu`, `OnaylayanAdi`, `GeriAlinmaZamaniTurkiye`, `GeriAlanAdi` | `talep.Dekont`, `talep.OdemeOnayi` |
| 13 | Sevkler | `ZiyaretNo`, `KargoFirmasiAdi`, `KargoFirmasiMetni`, `TakipNo`, `SevkZamaniTurkiye`, `SonGuncellemeZamaniTurkiye`, `BelgeNo`, `YapanAdi`, `KayitNo`; güncel sevk talebin son ziyaretininkidir | `talep.ParcaSevki` |
| 14 | Kapanışlar | `KapanisTuruAdi`, `YapilanIsAdi`, `YapilanIsMetni`, `DegisenParcalarMetni`, `UcretDurumuAdi`, `UcretTutari`, `TeklifSonucuAdi`, `SatisFiyati`, `KapanisNotu`, `YapanTuruAdi`, `YapanAdi`, `KaynakUygulamaAdi`, `ZamanTurkiye`, `KayitNo` | `talep.Kapanis` |
| 15 | İptaller | `IptalNedeniAdi`, `Aciklama`, `YapanAdi`, `KaynakUygulamaAdi`, `ZamanTurkiye`, `KayitNo` | `talep.Iptal` |
| 16 | Yeniden açmalar | `OncekiDurumAdi`, `Aciklama`, `MusteriyeBildirilmedi`, `YapanTuruAdi`, `YapanAdi`, `ZamanTurkiye`, `KayitNo` | `talep.YenidenAcma` |
| 17 | Sonradan eklemeler | `EklemeNotu`, `SesVar`, `EkSayisi`, `YapanAdi`, `ZamanTurkiye`, `KayitNo` | `talep.Ekleme`, `EklemeEki` |
| 18 | Dosyalar | `Nereden` (talep eki / ekleme eki / ziyaret fotoğrafı / servis fişi / dekont / ses kaydı), `DosyaTuruAdi`, `MimeTuru`, `BoyutBayt`, `DepolamaSaglayiciKodu`, `DepolamaYolu`, `OrijinalAd`, `DurumKodu`, `GecersizZamaniTurkiye`, `SilinmeIstendiZamaniTurkiye`, `YukleyenAdi`, `ZamanTurkiye`, `DosyaKayitNo` | `dosya.Dosya` + bağ tabloları |
| 19 | Bayi atamaları, devirler, gizleme | Atama: `BayiAdi`, `ZamanTurkiye`, `KaldirilmaZamaniTurkiye`, `KaldiranAdi`; devir: `ServisAdi`, `Neden`, `ZamanTurkiye`; gizleme: `HesapKayitNo`, `GizlemeZamaniTurkiye` | `talep.BayiAtamasi`, `talep.Devir`, `talep.TalepGizleme` |
| 20 | Bildirimler ve teslimat | `AliciTuruAdi`, `BildirimTuruAdi`, `BaslikAnahtari`, `SerbestMetin`, `ZamanTurkiye`, `GonderilmeZamaniTurkiye`, `CihazaUlasmaZamaniTurkiye`, `GorulmeZamaniTurkiye`, `OkunmaZamaniTurkiye` | `bildirim.Bildirim`, `bildirim.Teslimat` |
| 21 | Belge bağları | `DisSistemAdi`, `FirmaNo`, `DonemNo`, `BelgeTuruAdi`, `BelgeNo`, `BelgeTarihi`, `Ettn`, `Tutar`, `KdvHaricTutar`, `IptalZamaniTurkiye` | `talep.TalepBelgesi`, `entegrasyon.BelgeBagi` |
| 22 | İşlem kaydı | `gorunum.IslemGecmisi` satırları (talep ve alt kayıtları) | `denetim.IslemKaydi` |

#### 3.4.3 `yardim.MakineGoster @SeriNo nvarchar(400), @MarkaKodu nvarchar(20) = NULL`

`@MarkaKodu` NULL ise bütün markalarda arar. Kümeler: (1) `gorunum.MakineKarti`; (2) sahiplik geçmişi (`SahibiAdi`, `SahibiTelefonu`, `TakmaAd`, `BaslangicZamaniTurkiye`, `BitisZamaniTurkiye`, `BitisNedeniAdi`, `KaynakAdi`); (3) servis atama geçmişi (`ServisAdi`, `BaslangicZamaniTurkiye`, `BitisZamaniTurkiye`, `KaynakAdi`, `AtamaNotu`, `YapanAdi`, `BitirenAdi`); (4) satışlar (`SatisTuruAdi`, `SaticiBayiAdi`, `AliciBayiAdi`, `FaturaTarihi`, `TeslimTarihi`, `GarantiYil`, `DogrulamaDurumuAdi`, `IptalZamaniTurkiye`, `BelgeNo`); (5) kayıt olayları (`KaynakAdi`, `ServisAdi`, `BeyanAdi`, `LogoBildi`, `YeniSatis`, `ZamanTurkiye`); (6) talepler (`gorunum.TalepListesi`); (7) bakım tamamlama; (8) LOGO seri sorguları.

#### 3.4.4 `yardim.MusteriGoster @Metin nvarchar(400)`

- Telefon ise hesap(lar)ı şu yerlerden bulur ve her satırda `BulunduguYer` yazar: `musteri.Hesap.TelefonE164` (güncel), `musteri.HesapTelefonGecmisi` (eski), `musteri.HesapKisisi.TelefonE164`; `BirlestigiHesapKimlik` zincirini iki yönde izler. Ayrıca hesapsız talepleri (`talep.Talep.HesapKimlik IS NULL AND IletisimTelefonE164 = telefon`), hesapsız ya da bu telefonu içeren TEL talepleri (eski ya da yeni telefon) ve hesapsız geri bildirimleri alır.
- Ad ise `HesapKisisi.AdSoyadArama` ve hesapsız `Talep.IletisimAdArama`; 20'den çok hesap eşleşirse yalnız (1) kümesini döndürür.
- Kümeler: (1) `gorunum.MusteriKarti` satırları + `BulunduguYer`; (2) kişiler; (3) telefon geçmişi; (4) makineler (güncel ve geçmiş sahiplik, servis, garanti); (5) talepler (`gorunum.TalepListesi`, hesaplı ve hesapsız; `HesapsizEslesme bit`); (6) telefon değişikliği talepleri (`TelNumarasi`, `KararDurumuAdi`, `EskiTelefon`, `YeniTelefon`, `KanitSeriNo`, `SeriEslesti`, `KararVerenAdi`, `KararNotu`, `ZamanTurkiye`); (7) geri bildirimler (`GbdNumarasi`, `Metin`, `OkunduMu`, notlar); (8) güncel rıza (`kvkk.GuncelRiza` + son olay zamanları); (9) KVKK başvuruları (`BasvuruKayitNo`, `TurAdi`, `DurumKodu`, `YanitSonTarihi`); (10) cihazlar (`UygulamaAdi`, `PlatformKodu`, `BildirimIzniAdi`, `DilKodu`, `SonGorulmeZamaniTurkiye`; push jetonu yok); (11) cari kartları.

#### 3.4.5 `yardim.ServisGoster @Metin nvarchar(400)`

Ad (aksansız), giriş adı, eski servis numarası, cari kodu, telefon ya da `KayitNo` kabul eder; eşleştirme `yardim.Ara` ile aynıdır. Birden çok servis eşleşirse yalnız (1) kümesi döner. Kümeler: (1) `gorunum.ServisKarti`; (2) giriş hesapları (`GirisAdi`, `Aktif`, `SifreBelirlemeGerekli`, `KilitBitisZamaniTurkiye`, `SonGirisZamaniTurkiye`, açık oturum sayısı, açık jeton var mı); (3) şifre yardım talepleri (`GirisAdiBeyani`, `DurumKodu`, `ZamanTurkiye`, `KapatanAdi`); (4) marka yetkileri ve geçmişi (`servis.MarkaYetkisi FOR SYSTEM_TIME ALL`); (5) bölgeler; (6) bağlı bayiler; (7) ad ve durum geçmişi (`servis.Servis FOR SYSTEM_TIME ALL`); (8) açık talepler; (9) bu ayın hak edişleri (`gorunum.HakEdisListesi`, `OlusmaTarihi >= Bugun.AyBasi`); (10) dönem dökümleri; (11) son 50 hesap hareketi (`Aciklama` dahil) ve `gorunum.ServisBakiyesi`; (12) cari kartları.

#### 3.4.6 `yardim.HakEdisGoster @Numara nvarchar(400), @ZiyaretNo tinyint = NULL`

- `HAK` numarasıysa: (1) döküm özeti (`DokumNumarasi`, servis, şirket, para birimi, dönem, durum, `NetToplam`, `KdvToplam`, `TevkifatToplam`, `StopajToplam`, `MahsupToplam`, `OdenecekTutar`, zamanlar); (2) bağlı hak edişler (`gorunum.HakEdisListesi`); (3) belgeler (`DonemDokumuBelgesi` + `BelgeBagi`); (4) döküme bağlı hareketler (`gorunum.ServisHesapHareketleri`).
- Talep numarasıysa: (1) talebin hak edişleri (`@ZiyaretNo` verilirse yalnız o; `RedNedeni` dahil); (2) kalemler; (3) ziyaret düzeltmeleri ve güncel parça listesi; (4) ilgili hesap hareketleri.

### 3.5 `yonetim` prosedürleri

#### 3.5.1 Ortak sözleşme

- Parametre listesinin sonu her prosedürde aynıdır: `@Gerekce nvarchar(500)`, `@YapanGirisAdi nvarchar(40)`, `@Uygula bit = 0`.
- Adımlar:
  1. `SET NOCOUNT ON; SET XACT_ABORT ON;`
  2. `LEN(LTRIM(RTRIM(ISNULL(@Gerekce, N'')))) < 10` → `51100`.
  3. `@YapanGirisAdi` `Sadelestir(...).GirisAdi` ile normalleştirilir; `erisim.Kullanici` içinde `TurKodu = N'personel' AND Aktif = 1` ve `personel.Personel.AyrilmaZamani IS NULL` olmalı → değilse `51101`. `YapanAdi` = `personel.Personel.AdSoyad`.
  4. Girdiler `yardim.Sadelestir` ile normalleştirilir; hedef bulunur (`51102`, `51103`, `51104`).
  5. `BEGIN TRANSACTION;` `EXEC sistem.YapanAyarla N'personel', <kullanıcı>, NULL, <ad>, N'yonetim', NULL, @MusteriyeBildirildi = 0;`
  6. İş kapıları (aşağıdaki tablo) → hata numarası.
  7. Yazma; yazılan satırlarda [A] = `personel` / `yonetim`.
  8. `denetim.IslemKaydi`: `IslemTuruKodu` (tabloda), `IlgiliKayitTuruKodu`, `IlgiliKimlik`, `IlgiliNumara`, `AyrintiJson = {"gerekce": @Gerekce, "sqlGirisi": ORIGINAL_LOGIN(), "bilgisayar": HOST_NAME(), "onceki": {…}, "sonraki": {…}}` (müşteri kişisel verisi yazılmaz; müşteri yerine `HesapKayitNo`).
  9. Sonuç kümesi (`Bolum = N'<Codex metni: Sonuç>'`): `Uygulandi bit`, `Mesaj` (Codex), etkilenen kayıtların numara/`KayitNo` listesi, önceki ve sonraki değerler, varsa listeler (bitirilen atamalar gibi).
  10. `IF @Uygula = 1 COMMIT TRANSACTION; ELSE ROLLBACK TRANSACTION;` — `@Uygula = 0` önizlemedir, hiçbir şey kalmaz (işlem kaydı dahil).
- İşlem türü kodları `kod.IslemTuru`'ya tohumla gelir (tablodaki "İşlem türü" sütunu). Yeni kodlar: `talepDurumuElleDegisti`, `talepElleKapatildi`, `talepElleIptalEdildi`, `talepElleYenidenAcildi`, `makineServisAtamasiKaldirildi`, `telefonDegistirildi`, `odemeOnayiGeriAlindi`, `girisSifresiSifirlandi`, `hesapAnonimlestirildi` (taslakta var), `kisiselVeriAnonimlestirildi`, `hakEdisOnayiGeriAlindi`, `hesapHareketiDuzeltildi`, `hesaplarBirlestirildi`, `ayarDegisti` (taslakta var), `saklamaUygulandi`, `tcVergiNoGoruntulendi` (yeniden adlandırma).
- Sistem sürümlü tablolarda geçmiş kendiliğinden yazılır; açık geçmiş tablolarına prosedür yazar.

#### 3.5.2 Liste

| Prosedür | Parametreler (ortak üçlü hariç) | Doğrulamalar | Yazdığı tablolar | İşlem türü |
|---|---|---|---|---|
| `TalepDurumunuDegistir` | `@TalepNumarasi`, `@YeniDurumKodu` | Talep açık (`51113`); hedef `Kapali = 0` ve türde `ElleSecilebilir = 1` (`51112`); bekleyen `HakEdis` yok (`51110`); müşteri parça talebinde (`KaynakKodu <> N'servisSiparisi'`) etkin `OdemeOnayi` yokken hedef `yeni` değil (`51111`) | `talep.Talep` (`DurumKodu`) → tetikleyici `DurumGecmisi` (`MusteriyeBildirildi = 0`) | `talepDurumuElleDegisti` |
| `TalebiKapat` | `@TalepNumarasi` | Talep açık (`51113`); `kapandi` bu türde `ElleSecilebilir = 1` (`51112`); bekleyen hak ediş yok (`51110`); müşteri parça talebinde etkin ödeme onayı var (`51111`) | `talep.Kapanis` (`KapanisTuruKodu = N'personelFormu'`, `KapanisNotu = @Gerekce`), `talep.Talep` (`DurumKodu = N'kapandi'`, `Kapali = 1`, `KapanmaZamani`, `MasaKodu = NULL`); talebin `parca` aşamasındaki ziyareti varsa `talep.ServisZiyareti` (`AsamaKodu = N'yarimKaldi'`; uygulamada eklendi, 17.09.2026, 0.4 talep notu) | `talepElleKapatildi` |
| `TalebiIptalEt` | `@TalepNumarasi`, `@IptalNedeniKodu`, `@Aciklama m(1000) = NULL` | Talep açık (`51113`); nedenin `AciklamaZorunlu = 1` ise açıklama dolu (`51114`); bekleyen hak ediş yok (`51110`) | `talep.Iptal`, `talep.Talep` (`DurumKodu = N'iptal'`, `Kapali = 1`, `KapanmaZamani`, `MasaKodu = NULL`); talebin `parca` aşamasındaki ziyareti varsa `talep.ServisZiyareti` (`AsamaKodu = N'yarimKaldi'`; uygulamada eklendi, 17.09.2026, 0.4 talep notu) | `talepElleIptalEdildi` |
| `TalebiYenidenAc` | `@TalepNumarasi`, `@YeniDurumKodu` | Talep kapalı (`51113`); hedef `Kapali = 0` ve `ElleSecilebilir = 1` (`51112`) | `talep.YenidenAcma` (`OncekiDurumKodu`, `Aciklama = @Gerekce`, `MusteriyeBildirilmedi = 1`), `talep.Talep` (`DurumKodu`, `Kapali = 0`, `KapanmaZamani = NULL`) | `talepElleYenidenAcildi` |
| `MakineyeServisAta` | `@SeriNo`, `@MarkaKodu = NULL`, `@ServisKayitNo bigint`, `@AtamaNotu m(500) = NULL` | Makine bulunur (`51102`); servis `aktif` ve markada `Etkin = 1` (`51131`) | `makine.MakineServisAtamasi` (açık atamaya `BitisZamani`, `Bitiren…`; yeni satır `KaynakKodu = N'personel'`) | `makineServisiAtandi` |
| `MakineServisAtamasiniKaldir` | `@SeriNo`, `@MarkaKodu = NULL` | Açık atama var (`51102`) | `makine.MakineServisAtamasi` (`BitisZamani`, `BitirenKullaniciKimlik`, `BitirenAdi`) | `makineServisAtamasiKaldirildi` |
| `MusteriTelefonunuDegistir` | `@EskiTelefon`, `@YeniTelefon`, `@TelefonDegisikligiNumarasi = NULL` | Eski telefon etkin bir hesabın güncel telefonu (`51102`); yeni telefon geçerli (`51120`); yeni telefon başka etkin hesapta değil (`51121`; mesaj `HesaplariBirlestir`'e yönlendirir); TEL numarası verildiyse `bekliyor` ve bu hesaba ait ya da hesapsız (`51104`) | `musteri.Hesap` (telefon kolonları), `musteri.HesapTelefonGecmisi` (eski satıra `BitisZamani`, yeni satır), `musteri.TelefonDegisikligiTalebi` (`KararDurumuKodu = N'onaylandi'`, karar kolonları, `UygulanmaZamani`, hesapsızsa `HesapKimlik`), `erisim.Oturum` (açıklar `telefonDegisti`) | `telefonDegistirildi` |
| `DekontuGecersizKil` | `@TalepNumarasi`, `@DekontKayitNo bigint`, `@GecersizNedeni m(500)` | Dekont bu talebin (`51104`); zaten geçersiz değil (`51113`); talepte etkin ödeme onayı varsa `51111` (önce `OdemeOnayiniGeriAl`) | `talep.Dekont` (`Gecersiz…`), `dosya.Dosya` (`GecersizZamani`, `GecersizNedeni`) | `dekontGecersizKilindi` |
| `OdemeOnayiniGeriAl` | `@TalepNumarasi` | Etkin ödeme onayı var (`51102`); talep açık (`51113`) | `talep.OdemeOnayi` (`GeriAlinmaZamani`, `GeriAlanKullaniciKimlik`, `GeriAlanAdi`) | `odemeOnayiGeriAlindi` |
| `PersoneliPasiflestir` | `@GirisAdi` | Personel girişi var ve aktif (`51102`/`51113`); yapan kendini pasifleştiremez (`51112`) | `erisim.Kullanici` (`Aktif = 0`), `personel.Personel` (`AyrilmaZamani`), `erisim.Oturum` (açıklar `iptal`), `erisim.SifreSifirlamaJetonu` (açıklar `IptalZamani`) | `personelPasiflestirildi` |
| `GirisSifresiniSifirla` | `@GirisAdi` | Kullanıcı var ve aktif (`51102`); personel ya da servis | `erisim.Kullanici` (`SifreKaydi = NULL`, `SifreBelirlemeGerekli = 1`), `erisim.Oturum` (açıklar `sifreDegisti`), `erisim.SifreSifirlamaJetonu` (öteki açıklar `IptalZamani`; yeni satır, 1 saat). `TekKullanimlikKod` (`XXXX-XXXX-XXXX-XXXX`) ve `GecerlilikBitisiTurkiye` yalnız `@Uygula = 1` iken döner; kod başka yere yazılmaz (Bölüm 1.14.4) | `girisSifresiSifirlandi` |
| `ServiseMarkaYetkisiVer` | `@ServisKayitNo bigint`, `@MarkaKodu` | Servis `aktif` (`51131`); marka var (`51102`); yetki zaten etkin değil (`51113`) | `servis.MarkaYetkisi` (yeni satır ya da `BitisZamani = NULL`, `BaslangicZamani`, `VerenKullaniciKimlik`) | `servisYetkisiDegisti` |
| `ServistenMarkaYetkisiniAl` | `@ServisKayitNo bigint`, `@MarkaKodu` | Yetki etkin (`51102`) | Aynı işlemde: `makine.MakineServisAtamasi` (o servisin o markadaki açık atamalarına `BitisZamani`), `servis.MarkaYetkisi` (`BitisZamani`). Sonuçta bitirilen atamaların seri numaraları ve o servisin o markadaki açık talepleri (devir kararı personelde) | `servisYetkisiDegisti` (+ atama başına `makineServisAtamasiKaldirildi`) |
| `KisiselVerileriAnonimlestir` | `@Telefon`, `@BasvuruKayitNo bigint = NULL` | Telefon geçerli (`51120`); başvuru verildiyse var ve `sonuclandi`/`reddedildi` değil (`51102`/`51113`) | Bölüm 1.13.5; başvuru verildiyse `kvkk.BasvuruTalebi` (`DurumKodu = N'sonuclandi'`, `SonuclanmaZamani`). Tablo başına etkilenen satır sayısı döner | `kisiselVeriAnonimlestirildi` (+ hesap başına `hesapAnonimlestirildi`; `AyrintiJson`'da başvuru `KayitNo`) |
| `HakEdisOnayiniGeriAl` | `@TalepNumarasi`, `@ZiyaretNo tinyint` | Hak ediş `onaylandi` (`51142`); `DonemDokumuKimlik` doluysa döküm `taslak` (`51140`); alacak hareketi belgeye bağlı değil (`51140`) ve geri alınmamış (`51141`) | `hakedis.ServisHesapHareketi` (ters `duzeltmeBorc`, `DuzeltilenHareketKimlik`, döküme bağlanmaz; asılda `GeriAlinmaZamani` ve `DonemDokumuKimlik = NULL`), `hakedis.HakEdis` (`DurumKodu = N'bekliyor'`, onay kolonları ve vergi tutarları NULL, `DonemDokumuKimlik = NULL`); talep kapalıysa `talep.YenidenAcma` (`MusteriyeBildirilmedi = 1`) + `talep.Talep` (`onayBekliyor`, `Kapali = 0`, `KapanmaZamani = NULL`, `MasaKodu = N'servisMasasi'`); açıksa `talep.Talep` (`onayBekliyor`, `servisMasasi`) | `hakEdisOnayiGeriAlindi` |
| `HesapHareketiniDuzelt` | `@HareketKayitNo bigint`, `@DogruTutar decimal(18,2) = NULL` | Hareket var (`51102`); ters hareket değil ve geri alınmamış (`51141`); taslak olmayan döküme ya da belgeye bağlı değil (`51140`); `hakEdisAlacagi`/`parcaSiparisiBorcu` türünde `@DogruTutar` verilemez (`51143`; hak ediş için `HakEdisOnayiniGeriAl`) | `hakedis.ServisHesapHareketi`: ters hareket (asıl alacaksa `duzeltmeBorc`, borçsa `duzeltmeAlacak`; `DuzeltilenHareketKimlik`; döküme bağlanmaz), asılda `GeriAlinmaZamani` ve `DonemDokumuKimlik = NULL`; `@DogruTutar` doluysa asılla aynı tür, servis, şirket, para birimi ve bağlarla (döküm bağı hariç) yeni satır | `hesapHareketiDuzeltildi` |
| `HesaplariBirlestir` | `@KalacakTelefon`, `@BirlesecekTelefon` | İki telefon geçerli (`51120`), farklı, etkin iki hesabın güncel telefonu (`51102`, `51122`) | `talep.Talep.HesapKimlik` taşınır; birleşen hesabın açık `makine.MakineSahipligi` satırları biter (`birlestirme`) ve kalan hesapta açık sahipliği olmayan makineler için yeni satır açılır; `bildirim.Cihaz.HesapKimlik` taşınır; `musteri.HesapKisisi` satırları taşınır (taşınan `hesapSahibi` → `yetkili`); `talep.TalepGizleme` satırları kalan hesaba kopyalanır; birleşen hesabın güncel `HesapTelefonGecmisi` satırı biter; `erisim.Oturum` açıkları `hesapBirlestirildi`; birleşen `musteri.Hesap`: `DurumKodu = N'birlestirildi'`, `BirlestigiHesapKimlik`, `TelefonE164 = NULL`, `TelefonUlusal = NULL`. `kvkk.RizaOlayi`, `denetim.IslemKaydi`, `bildirim.Teslimat`, `musteri.TelefonDegisikligiTalebi`, `musteri.GeriBildirim` eski hesapta kalır; okuyanlar zinciri izler | `hesaplarBirlestirildi` |
| `AyarDegistir` | `@Anahtar`, `@YeniDeger nvarchar(4000)`, `@MarkaKodu = NULL`, `@SirketKodu = NULL` | Genel satır var (`51150`); değer türüne uyar (`51150`); ikisi birden verilmez (`51150`); kapsamlı satır yoksa eklenir (türü ve açıklaması genel satırdan) | `sistem.Ayar` (geçmiş `gecmis.sistem_Ayar`) | `ayarDegisti` (`AyrintiJson`'da eski ve yeni değer, kapsam) |

- Servis/bayi adı ve bilgisi, LOGO cari kodu, fiyat listesi, katalog ve kod listesi için `yonetim` prosedürü yazılmaz: servis/bayi bilgisi ve LOGO cari kodu backoffice ekranlarından (Servisler, Bayiler, Excel içe aktarım), fiyat listesi ve katalog depo tohumundan (Bölüm 5) değişir.

### 3.6 "Ne arıyorsanız nereye bakın" dizini

Bu dizin `VERITABANI.md`'nin başına aynen konur. Bağlantı: `paksan_<ortam>_yonetici`. Numara, telefon ve seri her yazımla verilebilir. Tablolara doğrudan bakarken Türkçe harfli metni `N'…'` ile yazın (`N` öneki olmadan `ı, ş, ğ, İ, Ş, Ğ` sessizce değişir ve sorgu 0 satır döner); ad ararken `…Arama` kolonunu `LIKE N'%isik%'` biçiminde kullanın; numarayı ve seri numarasını tiresiz, büyük harfle yazın ya da `yardim.TalepGoster`, `yardim.MakineGoster` kullanın (uygulamada eklendi, 17.09.2026; Bölüm 1.4.1 madde 7). `yonetim` komutları önce `@Uygula = 0` (önizleme), sonra `@Uygula = 1` ile çalıştırılır. Parametre adları buradaki yazılışıyla kopyalanır. Tablolardaki `…Zamani` kolonları UTC'dir; elle bakarken görünümlerdeki `…ZamaniTurkiye` ve `…Tarihi` kullanılır.

| # | İstek | Nereye bakın / ne çalıştırın |
|---|---|---|
| 0 | Ne aradığımı biliyorum ama nerede olduğunu bilmiyorum | `EXEC yardim.Ara N'<numara, telefon, seri, ad, giriş adı ya da cari kodu>';` → `SonrakiAdim` kolonundaki komut |
| 1 | Bu talep neden ve kim tarafından kapatıldı | `EXEC yardim.TalepGoster N'SRV-26-00123';` → 14 · Kapanışlar (`KapanisTuruAdi`, `KapanisNotu`, `YapanAdi`, `KaynakUygulamaAdi`), 15 · İptaller, 2 · Durum geçmişi |
| 2 | Telefonu verilen müşterinin talepleri ve makineleri | `EXEC yardim.MusteriGoster N'0532 123 45 67';` → 4 · Makineler, 5 · Talepler (hesapsız açılmışlar `HesapsizEslesme = 1`; eski telefon ve birleşmiş hesaplar dahil) |
| 3 | Seri numarasıyla makinenin sahibi, servisi, garantisi | `EXEC yardim.MakineGoster N'ork1270-2024-00157';` ya da `SELECT SahibiAdi, SahipBilgisininKaynagi, ServisAdi, ServisKaynagiAdi, GarantiDayanagiAdi, GarantiBitisTarihi, Garantide FROM gorunum.MakineKarti WHERE SeriNo = (SELECT Kod FROM yardim.Sadelestir(N'ork1270-2024-00157'));` |
| 4 | Bir servisin bu ayki onay bekleyen hak edişleri ve toplamı | `EXEC yardim.ServisGoster N'selcuk tarim';` → 9 · Bu ayın hak edişleri; ya da `SELECT h.ParaBirimiKodu, COUNT(*) AS Adet, SUM(h.NetTutar) AS Toplam FROM gorunum.HakEdisListesi h CROSS JOIN gorunum.Bugun b WHERE h.ServisKayitNo = 17 AND h.DurumKodu = N'bekliyor' AND h.OlusmaTarihi >= b.AyBasi GROUP BY h.ParaBirimiKodu;` |
| 5 | Müşterinin telefonunu değiştirmek | Önce backoffice > Numara talepleri ekranı. SSMS'ten: `EXEC yonetim.MusteriTelefonunuDegistir @EskiTelefon = N'0532 111 22 33', @YeniTelefon = N'0533 444 55 66', @TelefonDegisikligiNumarasi = N'TEL-26-00008', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` → `51121` dönerse yeni telefon başka hesaptadır: 22. satır |
| 6 | Yanlışlıkla onaylanan hak edişi geri almak | `EXEC yonetim.HakEdisOnayiniGeriAl @TalepNumarasi = N'SRV-26-00123', @ZiyaretNo = 1, @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (ters hareket yazar, talebi onay bekliyora alır; döküm kesinleştiyse ya da belgeye bağlıysa `51140`) |
| 7 | Bir dekontu geçersiz kılmak | `EXEC yardim.TalepGoster N'YPR-26-00058';` → 12 · Dekontlar (`DekontKayitNo`); ödeme onaylıysa önce `EXEC yonetim.OdemeOnayiniGeriAl @TalepNumarasi = N'YPR-26-00058', …;` sonra `EXEC yonetim.DekontuGecersizKil @TalepNumarasi = N'YPR-26-00058', @DekontKayitNo = 314, @GecersizNedeni = N'…', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` |
| 8 | İşten ayrılan personelin girişini kapatmak | `EXEC yonetim.PersoneliPasiflestir @GirisAdi = N'ali.yilmaz', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` Kontrol: `SELECT GirisAdi, Aktif FROM erisim.Kullanici WHERE GirisAdi = N'ali.yilmaz';` |
| 9 | Servisin giriş şifresini sıfırlamak | Önce backoffice > Servisler ekranı. Backoffice'e girilemiyorsa: `EXEC yonetim.GirisSifresiniSifirla @GirisAdi = N'konya.merkez', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 1;` → `TekKullanimlikKod` servise telefonda okunur (1 saat geçerli); servis Servisim'de giriş adı + kod + yeni şifreyle girer |
| 10 | Makineyi başka servise atamak | `EXEC yardim.ServisGoster N'aksaray';` → `ServisKayitNo`; sonra `EXEC yonetim.MakineyeServisAta @SeriNo = N'ORK1270-2024-00157', @MarkaKodu = N'paksan', @ServisKayitNo = 17, @AtamaNotu = NULL, @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` |
| 11 | Geçen hafta yayınlanan kampanya duyurusunu kaç kişi okudu | `SELECT d.Baslik, d.YayinZamaniTurkiye, d.HedeflenenSayisi, d.GonderilenSayisi, d.PencereyiGorenSayisi, d.ListedeOkuyanSayisi, d.KabulEdenSayisi FROM gorunum.DuyuruListesi d CROSS JOIN gorunum.Bugun b WHERE d.AltTurKodu = N'kampanya' AND d.YayinZamaniTurkiye >= DATEADD(day, -7, b.HaftaBasi) ORDER BY d.YayinZamaniTurkiye DESC;` ("gören" pencereyi görmüş, "okuyan" bildirim listesinde açmış kişidir) |
| 12 | KVKK kapsamında veri silme isteği | Başvuruyu bulun: `SELECT KayitNo, TurKodu, DurumKodu, BasvuranAdi, YanitSonTarihi FROM kvkk.BasvuruTalebi WHERE DurumKodu IN (N'alindi', N'isleniyor') ORDER BY YanitSonTarihi;` sonra `EXEC yonetim.KisiselVerileriAnonimlestir @Telefon = N'0532 123 45 67', @BasvuruKayitNo = 3, @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (hesabı olmayan kişide de çalışır; tablo başına etkilenen satır sayısını gösterir) |
| 13 | LOGO cari kodu eksik servisler | `SELECT * FROM gorunum.KontrolLogoCariKoduEksik WHERE FirmaTuru = N'servis';` Kod backoffice > Servisler ekranından ya da `logoCariListesi` Excel içe aktarımıyla girilir |
| 14 | Bugün kaç talep açıldı, hangi ilden | `SELECT t.IlAdi, t.TurAdi, COUNT(*) AS TalepSayisi FROM gorunum.TalepListesi t CROSS JOIN gorunum.Bugun b WHERE t.OlusmaTarihi = b.Tarih GROUP BY t.IlAdi, t.TurAdi ORDER BY TalepSayisi DESC;` |
| 15 | İptal edilmiş talebi yeniden açmak | `EXEC yonetim.TalebiYenidenAc @TalepNumarasi = N'SRV-26-00123', @YeniDurumKodu = N'incelemede', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (müşteriye bildirim gitmez) |
| 16 | Parça fiyat listesi güncellendi, yeni liste nasıl yüklenir | SSMS'ten yapılmaz; tek sahip depo. (1) PDF backoffice'te **Yedek Parça Kataloğu** ekranından yüklenir, personel değişiklikleri görüp onaylar → `sunucu-taklidi/parca-katalogu/katalog.json` (**Uygulamada değişti (21.09.2026):** Python betiği kaldırıldı; canlıda bu adımı sunucunun `POST <kok>/yayinla` uç noktası yapacak ve `katalog.FiyatListesi` taslak → yürürlükte → arşiv geçişini tek işlemde yazacak — sözleşme `sunucu-taklidi/fiyat-listesi-yayini.mjs`, uygulama rolünün `katalog.*` yazma izni için karar CANLIYA-CIKIS.md 2.1.1 madde 6); (2) `npm run vt -- fiyat-listesi paksan 2026-09-1 2026-09-01` (arşive `tohum/kaynak/fiyat-listeleri/paksan/2026-09-1.json` olarak kopyalar ve `fiyat-listeleri.json`'a kaydeder); (3) `npm run vt:tohum`; (4) commit; (5) VPS'te `git pull`, `npm run vt -- durum`, `npm run vt -- yedekle`, `npm run vt -- guncelle`. Kontrol: `SELECT MarkaKodu, Kod, DurumKodu, YururlukBaslangicTarihi FROM katalog.FiyatListesi;` |
| 17 | Bir servise Globale yetkisi vermek | `EXEC yonetim.ServiseMarkaYetkisiVer @ServisKayitNo = 17, @MarkaKodu = N'globale', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (almak: `yonetim.ServistenMarkaYetkisiniAl`; önizleme bitecek atamaları listeler) |
| 18 | Bu talebin fotoğrafları nerede | `EXEC yardim.TalepGoster N'SRV-26-00123';` → 18 · Dosyalar (`Nereden`, `DepolamaSaglayiciKodu`, `DepolamaYolu`, `DurumKodu`); dosya kökü API ortam dosyasındaki depolama yoludur |
| 19 | Kim, ne zaman, hangi müşterinin TC'sini görüntüledi | `SELECT IslemZamaniTurkiye, YapanAdi, YapanGirisAdi, KaynakUygulamaAdi, IlgiliNumara FROM gorunum.IslemGecmisi WHERE IslemTuruKodu = N'tcVergiNoGoruntulendi' ORDER BY IslemZamaniTurkiye DESC;` → talep numarasıyla `EXEC yardim.TalepGoster …;` 5 · Fatura bilgisi (kimin adına kesildiği) |
| 20 | Bir bayinin adı yanlış yazılmış | Düzeltme backoffice > Bayiler ekranından. Eski adlar: `SELECT Ad, CONVERT(datetime2(0), GecerlilikBaslangici AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicTurkiye, CONVERT(datetime2(0), GecerlilikBitisi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisTurkiye FROM bayi.Bayi FOR SYSTEM_TIME ALL WHERE KayitNo = 4 ORDER BY GecerlilikBaslangici;` |
| 21 | Silinen (ayrılan) bir personelin eski rolü | `SELECT p.AdSoyad, r.Ad AS RolAdi, CONVERT(datetime2(0), p.GecerlilikBaslangici AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BaslangicTurkiye, CONVERT(datetime2(0), p.GecerlilikBitisi AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time') AS BitisTurkiye FROM personel.Personel FOR SYSTEM_TIME ALL p JOIN erisim.Rol FOR SYSTEM_TIME ALL r ON r.Kimlik = p.RolKimlik AND p.GecerlilikBaslangici >= r.GecerlilikBaslangici AND p.GecerlilikBaslangici < r.GecerlilikBitisi JOIN erisim.Kullanici k ON k.Kimlik = p.KullaniciKimlik WHERE k.GirisAdi = N'ali.yilmaz' ORDER BY p.GecerlilikBaslangici;` |
| 22 | Aynı müşteri iki hesap açmış, birleştirmek | `EXEC yardim.MusteriGoster N'0532 111 22 33'; EXEC yardim.MusteriGoster N'0533 444 55 66';` sonra `EXEC yonetim.HesaplariBirlestir @KalacakTelefon = N'0533 444 55 66', @BirlesecekTelefon = N'0532 111 22 33', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` |
| 23 | Servise yanlış yazılmış bir hesap hareketini düzeltmek | `SELECT KayitNo, HareketZamaniTurkiye, HareketTuruAdi, AlacakTutari, BorcTutari, TalepNumarasi, GeriAlindi FROM gorunum.ServisHesapHareketleri WHERE ServisKayitNo = 17 ORDER BY HareketZamaniTurkiye DESC;` sonra `EXEC yonetim.HesapHareketiniDuzelt @HareketKayitNo = 812, @DogruTutar = NULL, @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (hak ediş alacağının tutarı yanlışsa 6. satır) |
| 24 | Bir talebi elle "kapandı" yapmak | `EXEC yonetim.TalebiKapat @TalepNumarasi = N'SRV-26-00123', @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` (bekleyen hak ediş varsa `51110`, ödemesi onaylanmamış parça talebinde `51111`) |
| 25 | Uygulamadaki bir ayarı (48 saat) değiştirmek | `SELECT Anahtar, KapsamTuru, MarkaKodu, SirketKodu, Deger, Aciklama FROM gorunum.GecerliAyar WHERE Aciklama LIKE N'%48%' OR Anahtar LIKE N'%Gecikme%';` sonra `EXEC yonetim.AyarDegistir @Anahtar = N'TalepGecikmeSaati', @YeniDeger = N'72', @MarkaKodu = NULL, @SirketKodu = NULL, @Gerekce = N'…', @YapanGirisAdi = N'…', @Uygula = 0;` Eski değerler: `SELECT Anahtar, Deger, GecerlilikBaslangici, GecerlilikBitisi FROM sistem.Ayar FOR SYSTEM_TIME ALL WHERE Anahtar = N'TalepGecikmeSaati';` |
| 26 | Numarası TEL/GBD/HAK olan kayıt | `EXEC yardim.Ara N'TEL-26-00008';` (TEL satırında karar durumu ve telefonlar); HAK için `EXEC yardim.HakEdisGoster N'HAK-26-00045';` |
| 27 | Oturum açmadan numara değişikliği isteyen müşteri yeni numarasından arıyor | `EXEC yardim.Ara N'0533 444 55 66';` → Telefon değişikliği satırı (`EslesenAlan`: yeni telefon) |
| 28 | Servis "şifremi unuttum, kullanıcı adım X" diyor | `EXEC yardim.ServisGoster N'konya.merkez';` → 2 · Giriş hesapları, 3 · Şifre yardım talepleri |
| 29 | Talep hangi masada, hangi rol görüyor | `SELECT MasaAdi, TurAdi, SahipAdi FROM gorunum.TalepListesi WHERE Numara = N'SRV2600123';` (rol yüklemi Bölüm 1.15.6) |
| 30 | Ay sonu kontrolleri | `gorunum.KontrolKapanmamisDonem`, `gorunum.MutabakatHakEdisLogo WHERE Fark <> 0`, `gorunum.MutabakatParcaLogo WHERE Fark <> 0`, `gorunum.KontrolHakEdisToplamiUyusmuyor`, `gorunum.KontrolOdemeTutariUyusmayanParca`, `gorunum.KontrolOdemeSuresiDolanParca`, `gorunum.KontrolServisiOlmayanSahipliMakine` |
| 31 | Bir kaydı kim, ne zaman değiştirdi | `SELECT * FROM gorunum.IslemGecmisi WHERE IlgiliNumara = N'SRV2600123' ORDER BY IslemZamaniTurkiye;` |

---

## 4. Güvenlik

### 4.1 Girişler ve roller

| SQL girişi | Kim kullanır | Veritabanında | Not |
|---|---|---|---|
| `paksan_<ortam>_sahip` | Yalnız `tools/vt` (V/R/T/B/O betikleri) | Veritabanı sahibi (`dbo`) | sysadmin değil; insan kullanmaz; acil doğrudan müdahale yalnız bu girişle ve `VERITABANI.md` "Acil durum" bölümündeki kurala göre |
| `paksan_<ortam>_uygulama` | API; sınama senaryosu | Kullanıcı `paksan_uygulama` → `rol_uygulama` | En az yetki |
| `paksan_<ortam>_yonetici` | PAKSAN yetkilisinin SSMS oturumu | Kullanıcı `paksan_yonetici` → `rol_yonetici` | Okur; `yardim` ve `yonetim` çalıştırır; tabloya doğrudan yazamaz |
| `paksan_<ortam>_rapor` | Excel/BI bağlantısı | Kullanıcı `paksan_rapor` → `rol_rapor` | Yalnız adı yazılı görünümler |

- Bütün girişler SQL kimlik doğrulamalı: `CHECK_POLICY = ON`, `CHECK_EXPIRATION = OFF`, `DEFAULT_DATABASE` = kendi veritabanı. Sunucu düzeyinde başka yetki verilmez. `sa` kapalı kalır.
- K02: girişleri (yoksa) açar, şifreleri ortam dosyasından sqlcmd değişkeniyle alır; veritabanı kullanıcılarını ve rolleri (yoksa) oluşturur; üyelikleri `ALTER ROLE … ADD MEMBER` ile verir; sahipliği verir; `sistem` şemasını, `sistem.Ortam` işaretini ve `dbo.SemaGecmisi`'ni açar. Başka veritabanında kullanıcı açmayı reddeder.
- GRANT/DENY V0015'te verilir; sonradan eklenen her tablo yetki kararını kendi V betiğinde alır (CD-YETKI).
- VPS'te SQL Server yalnız `127.0.0.1` dinler; 1433 dışarıya kapalı; yönetici erişimi SSH/RDP tüneliyle. Yerelde TCP `127.0.0.1:1433`, `-C`.

### 4.2 Rol başına yetki ilkeleri

Tablo bazındaki ayrıntılı liste katalog belgelerinin "Yetkiler" bölümündedir ve aşağıdaki ilkelere uyar. Bütün nesneler `dbo` sahiplidir; prosedür, görünüm, işlev ve tetikleyici aynı sahipli tabloya eriştiğinde yetki denetimi (DENY dahil) yapılmaz (sahiplik zinciri; veritabanı düzeyindeki DENY ile sınandı). Bu yüzden R betiklerinde dinamik SQL yasaktır.

**`rol_uygulama`**
- `SELECT` şema başına: `musteri`, `makine`, `talep`, `servis`, `bayi`, `hakedis`, `katalog`, `personel`, `erisim`, `duyuru`, `bildirim`, `destek`, `kvkk`, `dosya`, `denetim`, `entegrasyon`, `kod`, `cografya`, `sirket`, `sistem`, `gecmis`; ayrıca yalnız `gorunum.GecerliAyar`. `yardim` ve `yonetim` üzerinde hiçbir yetki yoktur.
- `INSERT` ve `UPDATE` **tablo tablo** verilir, şema başına verilmez; güncellenebilir kolonlar sınırlıysa kolon listesiyle (`GRANT UPDATE (Kolon1, Kolon2) ON …`).
- Hiç yazma almayan (yalnız tohum, prosedür ya da tetikleyici yazar): `kod.*`, `cografya.*`, `katalog.*`, `sirket.*`, `sistem.Ortam`, `sistem.Ayar`, `sistem.NumaraOneki`, `sistem.NumaraSayaci`, `sistem.SaklamaKurali`, `sistem.IcerikPaketi`, `erisim.IzinGrubu`, `erisim.Izin`, `talep.DurumGecmisi`, `hakedis.HakEdisKalemi`, `kvkk.MetinSurumu`.
- Yalnız ekleme: `denetim.IslemKaydi`, `kvkk.RizaOlayi`, `talep.ZiyaretParcaSatiri`, `talep.ZiyaretDuzeltmesi`, `talep.ZiyaretDuzeltmesiParcasi`, `talep.YenidenAcma`, `talep.Iptal`, `talep.Kapanis`, `talep.TalepNotu`, `talep.Ekleme`, `talep.EklemeEki`, `talep.TalepEki`, `talep.TalepBelirtisi`, `talep.TeklifUrunTipi`, `talep.TeklifArazi`, `talep.Teklif`, `talep.ZiyaretFotografi`, `talep.TalepBelgesi`, `talep.ParcaSatiri`, `talep.Devir`, `makine.KayitOlayi`, `hakedis.DonemDokumuBelgesi`, `destek.SohbetOlayi`, `erisim.GirisDenemesi`, `musteri.GeriBildirimNotu`.
- Kolon kısıtlı `UPDATE`: `makine.MakineSahipligi (TakmaAd, BitisZamani, BitisNedeniKodu)`; `makine.MakineServisAtamasi (BitisZamani, BitirenKullaniciKimlik, BitirenAdi)`; `musteri.HesapTelefonGecmisi (BitisZamani)`; `talep.Dekont (GecersizZamani, GecersizNedeni, GecersizKilanKullaniciKimlik, GecersizKilanAdi)`; `talep.OdemeOnayi (GeriAlinmaZamani, GeriAlanKullaniciKimlik, GeriAlanAdi)`; `talep.ParcaTalebiAyrinti (KargoTutari, OdenecekTutar, SonOdemeTarihi, TutarDogrulamaZamani, TutarDogrulayanKullaniciKimlik, TutarDogrulayanAdi)`; `hakedis.ServisHesapHareketi (DonemDokumuKimlik, BelgeBagiKimlik)`; `hakedis.HakEdis` (bütün kolonlar, `NetTutar` hariç); `bildirim.Teslimat` (zaman kolonları); `erisim.Kullanici` (bütün kolonlar, `SifreKaydi` hariç); `musteri.Hesap` (bütün kolonlar, `SifreKaydi` hariç); `erisim.DogrulamaKodu (DenemeSayisi, KullanilmaZamani)`; `erisim.SifreSifirlamaJetonu (KullanilmaZamani, IptalZamani)`; `entegrasyon.IceAktarim (DurumKodu, SatirSayisi, HataSayisi)`; `entegrasyon.IceAktarimSatiri (DurumKodu, HataMesaji, EslesenKayitTuruKodu, EslesenKimlik)`.
- Serbest `INSERT` + `UPDATE` (katalog tablo tablo yazar): öteki iş tabloları (`talep.Talep`, uydular, `talep.ServisZiyareti`, `talep.ParcaSevki`, `hakedis.HakEdis`, `hakedis.DonemDokumu`, `hakedis.Tarife`, `servis.*`, `bayi.*`, `personel.Personel`, `erisim.Rol`, `erisim.Oturum`, `musteri.*` …).
- `DELETE`: yalnız Bölüm 1.13.2 listesi.
- `EXECUTE`: `sistem.NumaraAl`, `sistem.YapanAyarla`, `sistem.SaklamaUygula`, `erisim.SifreYaz`, `musteri.SifreYaz`, `musteri.HesabiAnonimlestir`, `hakedis.HakEdisHesapla`, `hakedis.HakEdisKalemiYaz`.
- `ALTER`, `CREATE`, `CONTROL`, `VIEW DEFINITION`, `db_datareader`, `db_datawriter`, `db_owner` yok.

**`rol_yonetici`**
- `SELECT` şema başına: bütün iş şemaları, `kod`, `cografya`, `sirket`, `sistem`, `gecmis`, `gorunum`, `yardim` (satır içi işlev için).
- `EXECUTE ON SCHEMA::yardim`, `EXECUTE ON SCHEMA::yonetim`.
- `VIEW DEFINITION` veritabanı düzeyinde (SSMS'te kolon, açıklama ve prosedür metni görünsün).
- Veritabanı düzeyinde `DENY INSERT, UPDATE, DELETE`: yazma yalnız `yonetim` prosedürleri üzerinden.
- İç prosedürlere (`sistem.*`, `erisim.SifreYaz`, `musteri.*`, `hakedis.*`) `EXECUTE` yok.
- Kolon düzeyinde SELECT DENY verilmez (SSMS'te `SELECT *` bozulmasın); şifre özeti scrypt, jeton özetleri SHA-256/HMAC olduğu için okunması tek başına bir şey açmaz.

**`rol_rapor`**
- Yalnız şu görünümlerde `SELECT` (şema başına yetki yok): `gorunum.Bugun`, `gorunum.TalepIstatistigi`, `gorunum.HakEdisListesi`, `gorunum.ServisHesapHareketleri`, `gorunum.ServisBakiyesi`, `gorunum.DuyuruListesi`, `gorunum.KontrolLogoCariKoduEksik`, `gorunum.KontrolOnayBekleyenHakEdis`, `gorunum.KontrolHakEdisToplamiUyusmuyor`, `gorunum.KontrolHakEdisHareketiUyusmuyor`, `gorunum.KontrolOdemeOnayiBekleyenParca`, `gorunum.KontrolOdemeTutariUyusmayanParca`, `gorunum.KontrolOdemeSuresiDolanParca`, `gorunum.KontrolSeriBicimiUyumsuzMakine`, `gorunum.KontrolServisiOlmayanSahipliMakine`, `gorunum.KontrolKapanmamisDonem`, `gorunum.MutabakatHakEdisLogo`, `gorunum.MutabakatParcaLogo`.
- `gorunum.MusteriKarti`, `MakineKarti`, `TalepListesi`, `TalepDurumGecmisi`, `ServisKarti`, `BayiKarti`, `IslemGecmisi`, `GecerliAyar` rapor rolüne açılmaz.
- Bu listedeki her görünüm müşteri adı, telefonu, adresi, e-postası, serbest metin, TC/VKN/IBAN (maskeli dahil) içermez. CD-RAPOR-KOLON kolon adlarıyla denetler: `Telefon`, `Adres`, `Eposta`, `MusteriAdi`, `SahibiAdi`, `AdSoyad`, `Maskeli`, `Aciklama`, `Metin`, `Notu`, `Nedeni` geçen kolon yok. Bu liste **istisnasızdır**: kapalı bir kod listesinin etiketini taşıyan kolon da bu adları almaz, çünkü denetim adla çalışır ve istisna listesi tutmak kuralı zamanla aşındırır. `gorunum.TalepIstatistigi`'nde iptal nedeninin **adı** bu yüzden `SonIptalKoduAdi` diye geçer (18.09.2026; değeri `kod.IptalNedeni.Ad`'dır, serbest metin değil); serbest metin iptal açıklaması `yardim.TalepGoster`'dedir. CD-YETKI `rol_rapor`'un SELECT izinlerinin bu listeyle birebir aynı olduğunu doğrular (yeni görünüm sessizce açılmaz).

### 4.3 DENY listesi

| Rol | DENY | Nesne |
|---|---|---|
| `rol_uygulama` | `UPDATE`, `DELETE` | `denetim.IslemKaydi`, `kvkk.RizaOlayi` |
| `rol_uygulama` | `INSERT`, `UPDATE`, `DELETE` | `kvkk.MetinSurumu`, `talep.DurumGecmisi`, `sistem.Ortam`, `hakedis.HakEdisKalemi` |
| `rol_uygulama` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | `sistem.NumaraSayaci`, `dbo.SemaGecmisi` |
| `rol_uygulama` | `UPDATE` (kolon) | `erisim.Kullanici (SifreKaydi)`, `musteri.Hesap (SifreKaydi)`, `hakedis.HakEdis (NetTutar)`, `hakedis.ServisHesapHareketi (GeriAlinmaZamani, Tutar, YonKodu, HareketTuruKodu, DuzeltilenHareketKimlik)` |
| `rol_uygulama` | `UPDATE`, `DELETE` | `talep.ZiyaretParcaSatiri` |
| `rol_uygulama` | `DELETE` | `talep.Dekont`, `dosya.Dosya`, `erisim.Oturum`, `erisim.DogrulamaKodu`, `erisim.SifreSifirlamaJetonu`, `erisim.GirisDenemesi`, `sistem.Giden`, `sistem.TekrarAnahtari`, `destek.SohbetOturumu`, `destek.SohbetOlayi`, `entegrasyon.CariKarti`, `entegrasyon.LogoSeriSorgusu`, `entegrasyon.IceAktarimSatiri` |
| `rol_uygulama` | `EXECUTE`, `SELECT` | `SCHEMA::yardim`, `SCHEMA::yonetim` |
| `rol_yonetici` | `INSERT`, `UPDATE`, `DELETE` | Veritabanı |
| `rol_rapor` | `SELECT` | `SCHEMA::` bütün iş şemaları, `kod`, `cografya`, `sirket`, `sistem`, `gecmis`, `yardim` (izinli görünümler sahiplik zinciriyle okunur) |

### 4.4 Tetikleyici korumaları

| Tetikleyici | Tablo, olay | Kural | Hata |
|---|---|---|---|
| `TR_sistem_Ortam_Koruma` | `sistem.Ortam`, INSTEAD OF UPDATE, DELETE | Her durumda reddeder | 51011 |
| `TR_denetim_IslemKaydi_Koruma` | `denetim.IslemKaydi`, INSTEAD OF UPDATE, DELETE | Her durumda reddeder (saklama istisnası yok) | 51012 |
| `TR_denetim_IslemKaydi_Yapan` | `denetim.IslemKaydi`, AFTER INSERT | **Uygulamada değişti (18.09.2026):** `YapanKullaniciKimlik` doluysa `erisim.Kullanici`'da bulunmalı, `Aktif = 1` olmalı ve `TurKodu` satırdaki `YapanTuruKodu` ile aynı olmalı. Yapan kolonlarında FK yoktur (Bölüm 1.16), denetim burada yapılır; `YapanAdi` denetlenmez (o anki adın kopyasıdır) | 51010 |
| `TR_kvkk_RizaOlayi_Koruma` | `kvkk.RizaOlayi`, INSTEAD OF UPDATE, DELETE | Reddeder | 51013 |
| `TR_kvkk_MetinSurumu_Koruma` | `kvkk.MetinSurumu`, INSTEAD OF UPDATE, DELETE | DELETE reddedilir; UPDATE yalnız `HukukOnayiZamani` NULL'dan dolu değere geçiyor ve başka kolon değişmiyorsa uygulanır | 51014 |
| `TR_talep_DurumGecmisi_Koruma` | `talep.DurumGecmisi`, INSTEAD OF UPDATE, DELETE | Reddeder | 51015 |
| `TR_talep_Talep_DurumGecmisi` | `talep.Talep`, AFTER INSERT, UPDATE | `DurumKodu`, `SahipKodu` ya da `MasaKodu` değişen (eklemede her) satır için `talep.DurumGecmisi` yazar; yapan bilgisi ve `MusteriyeBildirildi` `SESSION_CONTEXT`'ten; eksikse reddeder; çok satırlı güncellemeyi karşılar. **Uygulamada değişti (18.09.2026):** `YapanKullaniciKimlik` doluysa `Aktif = 1` ve `TurKodu = YapanTuruKodu` de aranır — `sistem.YapanAyarla` atlanabildiği için (uygulama rolü `sys.sp_set_session_context`'i doğrudan çağırabiliyor) asıl kapı budur | 51010 |
| `TR_talep_Talep_ServisYetkisi` | `talep.Talep`, AFTER INSERT, UPDATE | Eklenen ya da `ServisKimlik`'i değişen (`inserted`/`deleted` karşılaştırması) ve `KapanmaZamani IS NULL` olan satırda `ServisKimlik` doluysa talebin markasında `servis.MarkaYetkisi.Etkin = 1` ve `servis.Servis.DurumKodu = N'aktif'` olmalı | 51020 |
| `TR_hakedis_HakEdis_Onay` | `hakedis.HakEdis`, AFTER INSERT, UPDATE | `DurumKodu = N'onaylandi'` olan eklenen/güncellenen satırda `NetTutar = ISNULL(SUM(HakEdisKalemi.Tutar), 0)` | 51040 |
| `TR_hakedis_HakEdis_TutarKilidi` | `hakedis.HakEdis`, AFTER UPDATE | Güncellemeden önceki `DurumKodu = N'onaylandi'` ise ve hak edişe bağlı geri alınmamış `hakEdisAlacagi` hareketi varsa `NetTutar`, `KdvOrani`, `KdvTutari`, `TevkifatOrani`, `TevkifatTutari`, `StopajOrani`, `StopajTutari`, `ServisKimlik`, `SirketKodu`, `ParaBirimiKodu` değişemez (Bölüm 1.9.3) | 51046 |
| `TR_hakedis_ServisHesapHareketi_Tutar` | `hakedis.ServisHesapHareketi`, AFTER INSERT | Bölüm 1.9.3 eşitlikleri (**Uygulamada değişti (17.09.2026):** boş bağ CHECK'le `547` verir, tetikleyici yalnız dolu bağı denetler) | 51042 |

- Tetikleyiciler sahip girişine karşı da korur; kapatılmaları ancak git'te görünen bir V betiğiyle olur.
- Sistem sürümlü tablolarda `INSTEAD OF` tetikleyici yoktur (motor izin vermez); yukarıdaki tabloların hiçbiri sistem sürümlü değildir.
- Tetikleyiciler `SET NOCOUNT ON;` ile başlar, küme tabanlıdır, dinamik SQL içermez, tabloyu yeniden güncellemez (özyineleme yok).

### 4.5 Gizli bilgiler

- Veritabanı girişlerinin şifreleri `veritabani/ortam/<ortam>.env` dosyasında; git'e yalnız `ornek.env` girer. `vt kur` eksik şifreyi `node:crypto` ile 32 karakter (`[A-Za-z0-9]`) üretir, dosyaya yazar, ekrana basmaz. Şifreler sqlcmd'ye ortam değişkeniyle geçer, komut satırında görünmez. VPS'te dosya depo dışında (`/etc/paksan/…` ya da `C:\PaksanGizli\…`) ve kısıtlı izinlidir.
- Uygulama anahtarları (`PAKSAN_VERI_ANAHTARI_<n>`, `PAKSAN_ARAMA_ANAHTARI`, `PAKSAN_SIFRE_BIBERI`, `PAKSAN_DOGRULAMA_ANAHTARI`) veritabanı ortam dosyasında değil, API'nin ortam dosyasındadır; çevrimdışı kopyasını PAKSAN bilgi işlemi tutar (anahtar kaybı veri kaybıdır). Sınama senaryosu atılabilir sınama anahtarı kullanır.
- Veritabanında düz metin şifre, jeton, doğrulama kodu, TC/VKN/IBAN (şifreli kolon dışında) bulunmaz; `sistem.Giden` kod/bağlantı gövdesi taşımaz; `IslemKaydi.AyrintiJson` ve `TekrarAnahtari.SonucJson` bunları içermez.
- Yedekler işletim sistemi düzeyinde şifrelenir; en az bir kopya VPS dışında ve değiştirilemez biçimdedir.

---

## 5. Tohum verisi

### 5.1 Türler ve çalışma sırası

| Tür | Klasör | Kim yönetir | Nasıl yazar | Ortamlar |
|---|---|---|---|---|
| T | `veritabani/tohum/T0n__…sql` | Depo (üretilir; başlık `-- ÜRETİLDİ, elle düzenlemeyin`) | Kapsamlı MERGE ya da yalnız ekleme (Bölüm 5.5) | Hepsi |
| B | `veritabani/tohum/B0n__…sql` | Başlangıç değeri; sonra PAKSAN değiştirebilir (`yonetim`, backoffice) | Yalnız yoksa ekler | Hepsi |
| O | `veritabani/ornek/O0n__…sql` | Örnek veri | Yalnız yoksa ekler; ilk satır `IF NOT EXISTS (SELECT 1 FROM sistem.Ortam WHERE OrnekVeriIzinli = 1) THROW 50001, N'<Codex metni: …>', 1;` | Yalnız `yerel`, `sinama` |

Araç sırası: bekleyen V → değişen R → değişen T (numara sırasıyla) → değişen B → (`--ornek`) değişen O. T betikleri R'den sonra çalıştığı için T içinde prosedür çağrılabilir. T ve B ikinci kez çalışınca 0 satır değiştirir.

### 5.2 T listesi

| Betik | Tablolar | Kaynak `src` dosyaları | Yazım |
|---|---|---|---|
| `T01__kod_listeleri.sql` | Bütün `kod.*` listeleri (`BelirtiKapsami` hariç), `kod.TalepNumaraKurali` genel satırları, `kod.TalepTuruUydusu`, `kod.TalepTuruDurumu`, `sistem.NumaraOneki`, `kod.Ceviri` (kod listeleri), `kod.EskiDegerEslesmesi` | `src/lib/talep.js`; `src/backoffice/veri.js` (`DURUMLAR`, `talepDurumlari`, `elleSecilebilirDurumlar`, `KAPALI_DURUMLAR`); `src/data/talepAlanlari.js` + `.en.js`; `src/backoffice/ekranlar/Talepler.jsx` (`IPTAL_SEBEPLERI`, `KAPANIS_ALANLARI`); `src/servis/ekranlar/TalepDetay.jsx` (`IPTAL_NEDENLERI`); `src/lib/servisKaydi.js` (`YAPILAN_IS`, `KAPI`, `UCRET_YAZI`, `GARANTI_DISI_OZET`); `src/data/duyuruTurleri.js`; `src/lib/bildirim.js` (`BILDIRIM`); `src/backoffice/ekranlar/IslemKaydi.jsx` (`TURLER`); `src/marka/katalog/products.js` (`supportGroup` aileleri); `src/marka/katalog/para.js`; `src/i18n/en.js`; `tohum/kaynak/kod-eslesmeleri.json`, `kod-adlari.json` | MERGE, `NOT MATCHED BY SOURCE` yok; pasifleştirme yalnız `kod-eslesmeleri.json`'daki açık `pasif` kaydından üretilen `UPDATE … SET Aktif = 0 WHERE Kod IN (…)` ile |
| `T02__cografya.sql` | `cografya.Ulke`, `Il`, `Ilce`, `YurtdisiBolge`, `kod.Ceviri (cografya.Ulke)` | `src/data/ulkeler.js` + `.en.js`, `src/data/iller.js`, `src/data/bolgeler.js`, `tohum/kaynak/il-plaka.json`, `ilce-kodlari.json` | MERGE; `NOT MATCHED BY SOURCE` yok; `IlceKodu` yeniden numaralanmaz, yalnız eklenir |
| `T03__erisim_izinleri.sql` | `erisim.IzinGrubu`, `erisim.Izin` | `src/data/yetkiler.js` (`YETKI_KATALOG`) | MERGE; `NOT MATCHED BY SOURCE` yok; kodu değişen izin `kod.EskiDegerEslesmesi (ListeAdi = erisim.Izin)` alır. **Uygulamada değişti (18.09.2026):** `ListeAdi` kod şemasıyla sınırlı değildir; `kod-eslesmeleri.json` `eskiDegerler`'ine `erisim.Izin` (ya da `erisim.IzinGrubu`) yazılabilir ve `YeniKod` T03'ün ürettiği kodlara karşı doğrulanır. Satırların **hepsi T01'de** yazılır, çünkü `kod.EskiDegerEslesmesi` T01'in tablosudur. İzin grubu etiketleri de (Talepler, Müşteriler, …) aynı tabloya girer — `kod-eslesmeleri.json` `_aciklama`'sının "etiketler eski veride saklandığı için `kod.EskiDegerEslesmesi`'ne de girer" kuralı artık burada da uygulanıyor |
| `T04__sirket.sql` | `sirket.Sirket`, `sirket.BankaHesabi` | `src/marka/kimlik.js` (`SIRKET`, `UYGULAMA`, `BANKA.hesaplar`) | MERGE, hedef kaynaktaki şirket kodlarıyla sınırlı; banka hesabı eşleşmesi `(SirketKodu, Iban)`; kaynakta olmayan hesap `Aktif = 0` |
| `T05__katalog.sql` | `katalog.Marka`, `Kategori` (+`kod.Ceviri`), `BakimSablonu`, `BakimAdimi`, `BakimAdimiCevirisi`, `Urun`, `UrunCevirisi`, `UrunVaryanti`, `UrunVaryantiCevirisi` (uygulamada eklendi, 17.09.2026), `UrunOzelligi`, `UrunOzelligiCevirisi`, `UrunVideosu`, `UrunVideosuCevirisi`, `ParcaModel` (boş), `kod.BelirtiKapsami` | `src/marka/kimlik.js`, `src/lib/serial.js` (`GARANTI_YIL`), `src/marka/katalog/makineFiyat.js` (`PARCA_SERVIS_ISKONTO`), `src/marka/katalog/para.js`, `src/marka/katalog/markalar.js` (varsa), `src/marka/katalog/products.js` + `products.en.js`, `src/marka/icerik/teknikOzellikler.js`, `src/marka/icerik/teknikSozluk.js` (`TEKNIK_VARYANT_EN` → `UrunVaryantiCevirisi`), `src/marka/icerik/kilavuzEslesme.js`, `src/data/talepAlanlari.js` (`ORTAK_BELIRTI`, `BELIRTILER`) | MERGE, hedef `WHERE MarkaKodu IN (<kaynaktaki markalar>)` ile sınırlı; o markada kaynakta olmayan ürün/varyant `Aktif = 0`; `kod.BelirtiKapsami` bağ satırları kaynaktaki markalar için `NOT MATCHED BY SOURCE THEN DELETE` (başka tablo bu bağa FK vermez); `Kategori`, `BakimSablonu` markasızdır: `NOT MATCHED BY SOURCE` yok |
| `T06__fiyat_listeleri_parcalar.sql` | `katalog.ParcaGrubu`, `katalog.FiyatListesi`, `katalog.Parca`, `katalog.FiyatListesiSatiri` | `src/marka/katalog/parcaGruplari.js`; `tohum/kaynak/fiyat-listeleri.json`; `tohum/kaynak/fiyat-listeleri/<MarkaKodu>/<ListeKodu>.json` (arşivdeki bütün listeler) | Bölüm 5.5 fiyat listesi kuralı |
| `T07__kvkk_metinleri.sql` | `kvkk.MetinSurumu` | `src/data/kvkk.js`, `src/data/kvkk.en.js` | Yalnız ekleme (`INSERT … WHERE NOT EXISTS`); var olan `(MetinKodu, Surum, DilKodu)` satırının `IcerikOzeti` farklıysa `THROW` ("sürümü artırın"); `HukukOnayiZamani` yalnız NULL'dan dolu değere düz `UPDATE` ile (MERGE yazılmaz: INSTEAD OF tetikleyicili tabloda `5316`) |
| `T08__saklama_kurallari.sql` | `sistem.SaklamaKurali` | Bölüm 1.13.4 tablosu (`tohum/kaynak/saklama-kurallari.json`) | MERGE; `NOT MATCHED BY SOURCE` yok; hukukçu kararı bu dosyadan değişir |

### 5.3 B listesi

| Betik | Tablolar | Kaynak | Not |
|---|---|---|---|
| `B01__ayarlar.sql` | `sistem.Ayar` | `tohum/kaynak/ayarlar.json` (Bölüm 5.6) | Yalnız yoksa ekler (anahtar + kapsam) |
| `B02__tarife.sql` | `hakedis.Tarife` | `src/lib/servisKaydi.js` (`TARIFE.yolKm = 12`, `TRY`, `BirimKodu = N'km'`, `KalemTuruKodu = N'yol'`, `MarkaKodu = NULL`, `GecerlilikBaslangicTarihi = 2026-01-01`) | |
| `B03__roller.sql` | `erisim.Rol`, `erisim.RolIzin` | `src/data/yetkiler.js` (`VARSAYILAN_ROLLER`) | UUIDv5 kimlik; `Kod`: `admin`, `yonetici`, `servis-masasi`, `yedek-parca`, `satis`; `EskiKayitNo`: kaynaktaki `id`; `TalepTuruKodu` kaynaktan; admin `TumIzinler = 1` |

`B01` ayarları — **okunur özet; değiştirilecek yer `tohum/kaynak/ayarlar.json`'dur** (18.09.2026). Aşağıdaki tablo düzeltilip kaynak dosya aynı kalırsa `B01__ayarlar.sql` bayt bayt aynı üretilir ve değişiklik veritabanına hiç gitmez. (`Aciklama` her satırda ekrandaki sözcüğü ve eski sabitin adını içerir.)

| Anahtar | Kapsam | Tür | Değer | Kaynak |
|---|---|---|---|---|
| `TalepGecikmeSaati` | genel | tamsayi | 48 | veri.js `GECIKME_SAAT` |
| `TeklifBeklemeGunu` | genel | tamsayi | 14 | veri.js `TEKLIF_BEKLEME_GUN` |
| `SifreBaglantisiGecerlilikSaati` | genel | tamsayi | 24 | veri.js `SIFRE_BAGLANTI_SAAT` |
| `DogrulamaKoduGecerlilikSaniyesi` | genel | tamsayi | 120 | hesap.js `OTP_SURE` |
| `SifreHaneSayisi` | genel | tamsayi | 6 | hesap.js `SIFRE_HANE` |
| `EkFotografEnFazla`, `EkVideoEnFazla`, `EkVideoEnUzunSaniye`, `EkFotografUzunKenari` | genel | tamsayi | kaynak değerler | ekler.js `EK_SINIR` |
| `LogoYeniSatisGunu` | genel | tamsayi | 120 | logo.js `LOGO.yeniSatisGun` |
| `KdvOrani` | genel | ondalik | 0.2 | para.js `KDV_ORANI` |
| `FiyatListesiKdvHaric` | genel | mantiksal | 1 | para.js `KDV_HARIC_LISTE` |
| `ParaBirimi` | genel | metin | TRY | para.js (TL → TRY) |
| `GarantiYili` | genel | tamsayi | 2 | serial.js `GARANTI_YIL` |
| `GarantiBaslangicEsasi` | genel | metin | teslim | KOD 4.4 |
| `GarantiFaturaEkGunu` | genel | tamsayi | NULL | KOD soru 15 (karar bekliyor) |
| `ServisParcaIskontoOrani` | genel | ondalik | 0.3 | makineFiyat.js `PARCA_SERVIS_ISKONTO` |
| `BankaOdemesiAcik` | şirket `paksan` | mantiksal | kaynak değer | kimlik.js `BANKA.aktif` |
| `BankaAciklamaKalibi` | şirket `paksan` | metin | kaynak değer | kimlik.js `BANKA.aciklamaKalibi` |
| `IhracatAcik` | şirket `paksan` | mantiksal | kaynak değer | kimlik.js `IHRACAT.aktif` |
| `IhracatEpostalari` | şirket `paksan` | json | kaynak değer | kimlik.js `IHRACAT.epostalar` |
| `DestekOturumuSessizlikDakikasi` | genel | tamsayi | 30 | destekLog.js |
| `OdemeBeklemeGunu` | genel | tamsayi | 7 | KOD 4.2.1 / soru 11 (varsayılan; muhasebe onayı bekliyor) |
| `RandevuHatirlatmaOnceSaati`, `RandevuHatirlatmaSonraSaati` | genel | tamsayi | 24, 12 | bildirimler.js |
| `ServisBasinaEnFazlaGirisHesabi` | genel | tamsayi | 1 | KOD soru 18 |
| `HakEdisKdvOrani`, `HakEdisTevkifatOrani`, `HakEdisStopajOrani` | genel | ondalik | NULL | KOD soru 10 (muhasebe kararı) |

### 5.4 O listesi

| Betik | İçerik | Kaynak |
|---|---|---|
| `O01__servis_bayi.sql` | Temsilî servis ve bayiler, bölgeleri, bayi bağları, `paksan` yetkileri | `src/marka/katalog/servisler.js`, `bayiler.js` (`id` → `EskiKayitNo`, `no` → `EskiNumara`) |
| `O02__yerel_kullanicilar.sql` | Yerel personel ve servis girişleri (`SifreKaydi = NULL`, `SifreBelirlemeGerekli = 1`); araç her kullanıcıya tek kullanımlık kod üretip bir kez ekrana basar | Sabit liste (araç) |
| `O03__sinama_verisi.sql` | Yalnız `sinama`: Bölüm 7 senaryolarının başlangıç verisi (`IŞIK Makina` adlı servis, `IZMIR.MERKEZ` benzeri giriş adı, `IPAK…` serili makine, `SRV014` eski servis numarası) | Sabit |

Test ve canlıya hiçbir kullanıcı, servis, bayi, müşteri, makine ya da talep tohumlanmaz; `ilk-yonetici` tek yöneticiyi tek kullanımlık kodla açar.

### 5.5 Üretici kuralları (`tools/vt/tohum-uret.mjs`)

- Dışa aktarılan sabitler Vite `ssrLoadModule` ile okunur; JSX içindeki yerel sabitler yalnız düz dizi/nesne sabiti olarak ayrıştırılır; sabit olmayan ifade üretimi durdurur (hangi sabitin okunamadığını söyler).
- Kaynaktaki her etiketin kodu `kod-eslesmeleri.json`'da olmalıdır; eşleşmesi olmayan etiket üretimi durdurur (sessiz varsayılan yok).
- `Ad` kaynaktan ya da `kod-adlari.json`'dan gelir; `<Codex metni: …>` yer tutucusu kalmışsa durur. İngilizce çeviriler `src/i18n/en.js` ve `*.en.js` dosyalarından alınır; üretici metin uydurmaz.
- Çıktı belirlenimcidir: anahtara göre sıralı, `N'…'` kaçışlı, `VALUES` blokları en çok 1000 satır, aynı girdiden bayt bayt aynı dosya.
- MERGE kalıbı:

```sql
WITH hedef AS (SELECT * FROM katalog.Urun WHERE MarkaKodu IN (N'paksan'))   -- katalogda: kaynaktaki markalar
MERGE hedef AS h
USING (VALUES (…)) AS k (…)
   ON h.MarkaKodu = k.MarkaKodu AND h.Kod = k.Kod
WHEN MATCHED AND EXISTS (SELECT k.<kolonlar> EXCEPT SELECT h.<kolonlar>) THEN UPDATE SET …
WHEN NOT MATCHED BY TARGET THEN INSERT (…) VALUES (…)
WHEN NOT MATCHED BY SOURCE THEN UPDATE SET Aktif = 0;   -- yalnız marka kapsamlı katalog tablolarında
```

  - Kod, coğrafya, izin, saklama listelerinde `WHEN NOT MATCHED BY SOURCE` yazılmaz; kaynakta olmayan veritabanı satırlarını `npm run vt -- tohum --denetle` ve `vt durum` yalnız listeler.
  - `WHEN MATCHED` hiçbir zaman `DELETE` değildir.
  - `INSTEAD OF` tetikleyicili tabloya (`kvkk.MetinSurumu`) MERGE yazılmaz.
  - Bir markanın kataloğunun tek sahibi vardır: depo. Veriyle (sahip girişiyle) eklenen markanın satırları, o marka kaynağa girmediği sürece tohumun kapsamı dışındadır.
- **Fiyat listesi kuralı (T06):**
  - Her liste kendi arşiv dosyasındadır: `tohum/kaynak/fiyat-listeleri/<MarkaKodu>/<ListeKodu>.json` (bir kez yazılır, sonra değişmez). `fiyat-listeleri.json` her liste için `MarkaKodu`, `Kod`, `KaynakDosyaAdi`, `YururlukBaslangicTarihi`, `ListeKdvHaric`, `KdvEsasiDogrulandi`, `DurumKodu` tutar; markada en çok bir `yururlukte`.
  - `katalog.FiyatListesi.KaynakOzeti` = arşiv dosyasının SHA-256'sı. Var olan liste koduna farklı özet gelirse üretim durur ("yeni liste kodu verin").
  - Liste başlığında MERGE yalnız `DurumKodu`, `KdvEsasiDogrulandi`, `ListeKdvHaric` kolonlarını değiştirebilir; aynı betik önce eski `yururlukte` listeyi `arsiv`, sonra yenisini `yururlukte` yapar (tek listeli tekillik korunur).
  - `katalog.FiyatListesiSatiri` yalnız eklenir (`INSERT … WHERE NOT EXISTS`); değişmez, pasifleşmez.
  - `katalog.Parca` bütün arşiv listelerindeki parçaların birleşimidir (kaynaktaki markalarla sınırlı MERGE): `IlkFiyatListesiKodu`, `SonFiyatListesiKodu` hesaplanır; `Aktif = 1` yalnız markanın yürürlükteki listesinde bulunan parçada, öteki parçalar `Aktif = 0`.
  - `entegrasyon.IceAktarim` fiyat listesi almaz (`kod.IceAktarimTuru`'nda `fiyatListesi` yok).
  - Arşive ekleme komutu: `npm run vt -- fiyat-listesi <MarkaKodu> <ListeKodu> <YururlukBaslangicTarihi>` — `sunucu-taklidi/parca-katalogu/katalog.json`'u arşive kopyalar, `fiyat-listeleri.json`'a yeni satırı `yururlukte` olarak, öncekini `arsiv` olarak yazar; kod varsa durur.
- UUIDv5 ad alanı ve ad metni Bölüm 1.6'da.

### 5.6 Kaynak eşleşme dosyaları (`veritabani/tohum/kaynak/`)

| Dosya | İçerik |
|---|---|
| `kod-eslesmeleri.json` | Liste başına: yalnız etiketi olan seçeneklerin kodu (`"Fark etmez": "farkEtmez"`); eski değer → kod eşleşmeleri (`gonderildi → kapandi`, `bayide → kapandi`, `servis → servisMasasi`, `parca → parcaMasasi`, `app → connect`, `servis → servisim`, `gorsel → foto`, `TL → TRY`, `connect → musteri`, `servisElle → servis`, `excel → iceAktarim`, `elle → personel`, `eldeParca`, `parcaIste`, iki iptal listesinin metinleri ve Servisim `deger`leri); açık `pasif` kayıtları; İngilizce anahtar kalıbı |
| `kod-adlari.json` | Kaynakta etiketi olmayan kodların Codex'ten geçmiş Türkçe `Ad`'ı ve bayrakları (ör. `odemeBekliyor`, `odemeSuresiDoldu`, `yarimKaldi` (`kod.ZiyaretAsamasi`; uygulamada eklendi, 17.09.2026), yeni `IslemTuru` kodları, `KayitTuru`, `KayitKaynagi`, `DisSistem`, `BildirimKanali`, `BelgeTuru`, `IceAktarimTuru`, `Birim`, `FirmaDurumu`, `KisiRolu`, `SahiplikBitisNedeni`, `GarantiBaslangicEsasi`, `SeriKurali`) |
| `il-plaka.json` | 81 il adı → `IlKodu`; 81'inin eşleşmesi zorunlu |
| `ilce-kodlari.json` | `(IlKodu, ilçe adı) → IlceKodu` (= plaka × 1000 + kalıcı sıra); yalnız eklenir |
| `fiyat-listeleri.json`, `fiyat-listeleri/<MarkaKodu>/<ListeKodu>.json` | Bölüm 5.5 |
| `saklama-kurallari.json` | Bölüm 1.13.4 satırları |
| `ayarlar.json` | `B01__ayarlar.sql`'in **tek kaynağı**: 29 ayar satırının `Anahtar`, `Kapsam`, `DegerTuru`, değeri veren kaynak sabiti ve `Aciklama` metni. Aşağıdaki 5.3 tablosu bu dosyanın okunur özetidir; bir ayarı değiştirmek için **bu dosya** değiştirilir (18.09.2026) |
| `markalar.json` | Tohumun kapsadığı markalar ve şirketler: marka başına `MarkaKodu`, `SirketKodu`, `KaynakKlasoru` (`src/marka`), `SeriKuraliKodu`, `GarantiBaslangicEsasiKodu`. T04 şirket, T05 marka ve T06 fiyat listesi kapsamını bu dosya belirler; 5.5'teki "bir markanın kataloğunun tek sahibi depodur" kuralının kapsamı buradadır. İkinci marka eklenirken (`PLAN-COKLU-MARKA.md`) dokunulacak dosya budur (18.09.2026) |

### 5.7 `eslesme.json` kararları (bu belgeyi etkileyenler)

- `okunanBildirimler` içindeki `talep-<id>` ve `randevu-<id>` okundu kimlikleri ilgili `bildirim.Bildirim`'in `Teslimat.OkunmaZamani`'na eşlenir; taşımada eski talepler için Bölüm 1.12.1 kuralıyla `Bildirim` ve `Teslimat` üretilir.
- `makineKayitlari.servisId`: kaynak `servis` ise `makine.KayitOlayi.ServisKimlik` olur, atama sayılmaz; yalnız kaynak `musteri` ya da `logo` iken personelin yazdığı değer `makine.MakineServisAtamasi` olur. `makineKayitlari.musteriAd` → `makine.KayitOlayi.BeyanAdi`.
- `makineKayitlari.bayiId` (personelin "Satan Bayi" seçimi) → `makine.MakineSatisi (SatisTuruKodu = N'paksanBayiye', KaynakKodu = N'personel', FaturaTarihi NULL, DogrulamaDurumuKodu = N'bekliyor')`; bayi değiştirilir ya da kaldırılırsa önceki satışa `IptalZamani`.
- `requests[].odemeNo` (cihazda üretilen YPR) → `talep.Talep.CihazNumarasi`; yeni numara sunucudan.

---

## 6. Betik bölünmesi

Dosya adları `tools/vt/calistir.mjs` kalıplarına uyar: `K\d{2}__`, `V\d{4}__`, `R\d{2}__`, `T\d{2}__`, `B\d{2}__`, `O\d{2}__`, `S\d{2}__`; küçük harf, rakam ve alt çizgi.

### 6.1 K (kurulum; sunucu yöneticisiyle, işlem dışında, tekrar çalışabilir)

| Betik | İçerik |
|---|---|
| `K01__veritabani.sql` | `master`'da: veritabanı yoksa `CREATE DATABASE … COLLATE Latin1_General_100_CI_AS`; varsa harmanlamayı denetler; Bölüm 1.19.1 seçenekleri; ortama göre kurtarma modeli |
| `K02__girisler.sql` | Dört giriş; veritabanı kullanıcıları; sahiplik; `rol_uygulama`, `rol_yonetici`, `rol_rapor`; üyelikler; `CREATE SCHEMA sistem AUTHORIZATION dbo`; `dbo.SemaGecmisi` (Bölüm 0.4 dbo); `sistem.Ortam` + satır + `PaksanOrtam` genişletilmiş özelliği; `TR_sistem_Ortam_Koruma` |

### 6.2 V (şema; bir kez; bağımlılık sırasıyla)

| Betik | Şema | Tablolar ve nesneler (bu sırayla) |
|---|---|---|
| `V0001__temel.sql` | — | `sistem` dışındaki 23 şema (`AUTHORIZATION dbo`); `dbo.AciklamaYaz`; şema açıklamaları |
| `V0002__kod_sistem.sql` | `kod`, `sistem` | `kod.Dil`, `kod.ParaBirimi`, `kod.KayitTuru`, `sistem.NumaraOneki`, `sistem.NumaraSayaci`, `kod.KaynakUygulama`, `kod.AktorTuru`, `kod.KayitKaynagi`, `kod.DisSistem`, `kod.BildirimKanali`, `kod.IslemKategorisi`, `kod.IslemTuru`, `kod.TalepTuru`, `kod.TalepKaynagi`, `kod.TalepNumaraKurali` (Marka FK'si V0004), `kod.TalepDurumu`, `kod.TalepTuruDurumu`, `kod.TalepTuruUydusu`, `kod.Masa`, `kod.Sahip`, `kod.ServisAtamaKaynagi`, `kod.UlasimZamani`, `kod.MakineDurumu`, `kod.DestekAilesi`, `kod.Belirti`, `kod.UrunTipi`, `kod.Arazi`, `kod.TraktorGucu`, `kod.IptalNedeni`, `kod.TeklifSonucu`, `kod.YapilanIs`, `kod.ServisKapisi`, `kod.ZiyaretAsamasi`, `kod.UcretDurumu`, `kod.KapanisTuru`, `kod.FaturaTuru`, `kod.OdemeYontemi`, `kod.HakEdisDurumu`, `kod.Birim`, `kod.HakEdisKalemTuru`, `kod.HesapHareketTuru`, `kod.DonemDokumuDurumu`, `kod.HedefKitle`, `kod.DuyuruTuru`, `kod.DuyuruAltTuru`, `kod.BildirimTuru`, `kod.AliciTuru`, `kod.KararDurumu`, `kod.DestekOlayTuru`, `kod.DosyaTuru`, `kod.ServisTuru`, `kod.FirmaDurumu`, `kod.KisiRolu`, `kod.SahiplikBitisNedeni`, `kod.RizaMetni`, `kod.RizaSecimi`, `kod.RizaKanali`, `kod.BildirimIzni`, `kod.BelgeTuru`, `kod.SatisTuru`, `kod.GarantiDayanagi`, `kod.GarantiBaslangicEsasi`, `kod.SeriKurali`, `kod.KargoFirmasi`, `kod.KvkkBasvuruTuru`, `kod.IceAktarimTuru`, `kod.Ceviri`, `kod.EskiDegerEslesmesi` |
| `V0003__cografya.sql` | `cografya` | `Ulke`, `Il`, `Ilce`, `YurtdisiBolge` |
| `V0004__sirket_katalog.sql` | `sirket`, `katalog`, `kod` | `sirket.Sirket`, `sirket.BankaHesabi`, `katalog.Marka`, `katalog.Kategori`, `katalog.BakimSablonu`, `katalog.BakimAdimi`, `katalog.BakimAdimiCevirisi`, `katalog.Urun`, `katalog.UrunCevirisi`, `katalog.UrunVaryanti`, `katalog.UrunOzelligi`, `katalog.UrunOzelligiCevirisi`, `katalog.UrunVideosu`, `katalog.UrunVideosuCevirisi`, `katalog.ParcaGrubu`, `katalog.FiyatListesi`, `katalog.Parca`, `katalog.FiyatListesiSatiri`, `katalog.ParcaModel`, `kod.BelirtiKapsami`; `ALTER TABLE kod.TalepNumaraKurali ADD CONSTRAINT FK_kod_TalepNumaraKurali_katalog_Marka` |
| `V0005__erisim_personel.sql` | `erisim`, `personel` | `erisim.Kullanici`, `erisim.IzinGrubu`, `erisim.Izin`, `erisim.Rol`, `erisim.RolIzin`, `erisim.SifreSifirlamaJetonu`, `erisim.GirisDenemesi`, `personel.Personel` |
| `V0006__musteri_kvkk.sql` | `musteri`, `kvkk` | `musteri.Hesap` (`BeyanBayiKimlik` FK'si V0008), `musteri.HesapKisisi`, `musteri.TelefonDegisikligiTalebi`, `musteri.HesapTelefonGecmisi`, `musteri.GeriBildirim`, `musteri.GeriBildirimNotu`, `kvkk.MetinSurumu`, `kvkk.RizaOlayi` (`CihazKimlik` FK'si V0013), `kvkk.BasvuruTalebi` |
| `V0007__dosya.sql` | `dosya` | `dosya.Dosya` |
| `V0008__servis_bayi.sql` | `bayi`, `servis` | `bayi.Bayi`, `bayi.MarkaYetkisi`, `servis.Servis`, `servis.FaturaBilgisi`, `servis.BayiBagi`, `servis.Bolge`, `servis.MarkaYetkisi`, `servis.GirisHesabi`, `servis.SifreYardimTalebi`; `ALTER TABLE musteri.Hesap ADD CONSTRAINT FK_musteri_Hesap_bayi_Bayi_Beyan` |
| `V0009__entegrasyon.sql` | `entegrasyon` | `IceAktarim`, `IceAktarimSatiri`, `CariKarti`, `BelgeBagi`, `LogoMalzemeKarti`, `LogoSeriSorgusu` |
| `V0010__makine.sql` | `makine` | `Makine`, `MakineSahipligi`, `MakineServisAtamasi`, `MakineSatisi`, `KayitOlayi`, `BakimTamamlama` |
| `V0011__talep.sql` | `talep` | `Talep`, `ServisTalebiAyrinti`, `ParcaTalebiAyrinti`, `TeklifTalebiAyrinti`, `TalepBelirtisi`, `TeklifUrunTipi`, `TeklifArazi`, `DurumGecmisi`, `TalepNotu`, `Randevu`, `Teklif`, `Iptal`, `YenidenAcma`, `Ekleme`, `EklemeEki`, `TalepEki`, `FaturaBilgisi`, `Dekont`, `OdemeOnayi`, `ParcaSatiri`, `ServisZiyareti`, `ZiyaretParcaSatiri`, `ZiyaretFotografi`, `ZiyaretDuzeltmesi`, `ZiyaretDuzeltmesiParcasi`, `Kapanis`, `ParcaSevki`, `BayiAtamasi`, `Devir`, `TalepGizleme`, `TalepBelgesi` |
| `V0012__hakedis.sql` | `hakedis` | `Tarife`, `DonemDokumu`, `HakEdis`, `HakEdisKalemi`, `DonemDokumuBelgesi`, `ServisHesapHareketi` |
| `V0013__duyuru_bildirim.sql` | `duyuru`, `bildirim` | `duyuru.Duyuru`, `duyuru.HedefMarka`, `duyuru.HedefIl`, `duyuru.HedefIlce`, `duyuru.HedefServis`, `duyuru.HedefUrun`, `duyuru.HedefSeri`, `bildirim.Cihaz`, `bildirim.Bildirim`, `bildirim.Teslimat` (`GidenKimlik` FK'si V0014); `ALTER TABLE kvkk.RizaOlayi ADD CONSTRAINT FK_kvkk_RizaOlayi_bildirim_Cihaz` |
| `V0014__sistem_destek_denetim_erisim.sql` | `sistem`, `destek`, `denetim`, `erisim` | `sistem.IcerikPaketi`, `destek.SohbetOturumu`, `destek.SohbetOlayi`, `denetim.IslemKaydi`, `sistem.Ayar`, `sistem.Giden`, `sistem.GidenEki`, `sistem.TekrarAnahtari`, `sistem.SaklamaKurali`, `erisim.Oturum`, `erisim.DogrulamaKodu`; `ALTER TABLE bildirim.Teslimat ADD CONSTRAINT FK_bildirim_Teslimat_sistem_Giden` |
| `V0015__yetkiler.sql` | — | Bölüm 4.2 ve 4.3'teki tablo, kolon, şema ve veritabanı düzeyi GRANT/DENY (şema düzeyi `EXECUTE ON SCHEMA::yardim/yonetim` gibi izinler sonradan oluşan nesnelere de uygulanır) |

- Her V betiği kendi tablolarının ve kolonlarının `MS_Description`'ını aynı betikte yazar. Sistem sürümlü tablolar tanımlarıyla birlikte `gecmis.<sema>_<Tablo>`'yu oluşturur.
- Nesne düzeyindeki izinler (uygulama rolünün tek tek prosedürlere `EXECUTE`'u, `gorunum.GecerliAyar` SELECT'i, rapor rolünün görünüm başına SELECT'i) nesne R betiğinde oluştuğu için o R betiğinin sonunda verilir. `CREATE OR ALTER` mevcut izinleri korur; yeniden çalışmada `GRANT` tekrarı zararsızdır. CD-YETKI son durumu denetler.

### 6.3 Döngüsel ve ileri yabancı anahtarlar

| FK | Tablo (betik) | Hedef (betik) | Eklendiği betik |
|---|---|---|---|
| `FK_kod_TalepNumaraKurali_katalog_Marka` | `kod.TalepNumaraKurali` (V0002) | `katalog.Marka` (V0004) | V0004 |
| `FK_musteri_Hesap_bayi_Bayi_Beyan` | `musteri.Hesap` (V0006) | `bayi.Bayi` (V0008) | V0008 |
| `FK_kvkk_RizaOlayi_bildirim_Cihaz` | `kvkk.RizaOlayi` (V0006) | `bildirim.Cihaz` (V0013) | V0013 |
| `FK_bildirim_Teslimat_sistem_Giden` | `bildirim.Teslimat` (V0013) | `sistem.Giden` (V0014) | V0014 |

Öz FK'ler (`musteri.Hesap.BirlestigiHesapKimlik`, `hakedis.ServisHesapHareketi.DuzeltilenHareketKimlik`) `CREATE TABLE` içinde yazılır. Başka ileri FK yoktur; katalog yazarı bulursa bu tabloya eklenmesini önerir, kendisi sessizce eklemez.

### 6.4 R (tekrar; bu sırayla)

| Betik | Nesneler |
|---|---|
| `R01__islevler.sql` | `yardim.Sadelestir` |
| `R02__sistem_prosedurleri.sql` | `sistem.NumaraAl`, `sistem.YapanAyarla`, `erisim.SifreYaz`, `musteri.SifreYaz`, `sistem.SaklamaUygula`; sonunda uygulama rolüne `EXECUTE` izinleri |
| `R03__alan_gorunumleri.sql` | `gorunum.GecerliAyar`, `katalog.MarkaKurallari`, `makine.MakineGuncelSahibi`, `makine.MakineninBayisi`, `makine.MakineninServisi`, `makine.MakineGarantisi`, `kvkk.GuncelRiza`, `talep.ZiyaretGuncelParcasi`; sonunda `GRANT SELECT ON gorunum.GecerliAyar TO rol_uygulama` |
| `R04__korumalar.sql` | Bölüm 4.4'teki bütün tetikleyiciler (`TR_sistem_Ortam_Koruma` K02'de; burada `CREATE OR ALTER` ile yenilenir) |
| `R05__hakedis_musteri_prosedurleri.sql` | `hakedis.HakEdisHesapla`, `hakedis.HakEdisKalemiYaz`, `musteri.HesabiAnonimlestir`; sonunda uygulama rolüne `EXECUTE` izinleri |
| `R06__gorunum.sql` | `gorunum.*` (önce `Bugun`, sonra kartlar, listeler, kontrol ve mutabakat; başka görünüme bakan sonra); sonunda Bölüm 4.2 `rol_rapor` izinleri |
| `R07__yardim.sql` | `yardim.TalepGoster`, `yardim.HakEdisGoster`, `yardim.MakineGoster`, `yardim.MusteriGoster`, `yardim.ServisGoster`, `yardim.Ara` |
| `R08__yonetim.sql` | Bölüm 3.5.2'deki bütün prosedürler |

R betikleri açıklamalarını (nesne, kolon, parametre) aynı betikte `dbo.AciklamaYaz` ile yeniler.

### 6.5 T, B, O

Bölüm 5.2–5.4. Sıra bağımlılığı karşılar: `T01` (`kod`, `sistem.NumaraOneki`) → `T02` (`cografya`) → `T03` (`erisim` izinleri) → `T04` (`sirket`) → `T05` (`katalog`, `kod.BelirtiKapsami`) → `T06` (parça, fiyat) → `T07` (KVKK) → `T08` (saklama) → `B01`…`B03` → `O01`…`O03`.

### 6.6 S (sınama; `veritabani/sinama/`)

| Betik | Giriş | İçerik |
|---|---|---|
| `S01__kisitlar.sql` | `paksan_sinama_uygulama` (işaretli adımlar sahip) | Bölüm 7.3 |
| `S02__senaryo.sql` | `paksan_sinama_uygulama` | Bölüm 7.4 |
| `S03__yetkiler.sql` | Üç rol girişi sırayla | Bölüm 7.5 |
| `S04__esneklik.sql` | `paksan_sinama_sahip` (veri ekleme) + uygulama | Bölüm 7.6 |
| `S05__bulunabilirlik.sql` | `paksan_sinama_yonetici` | Bölüm 7.7 |
| `parmak-izi.sql` | sahip | Bölüm 7.1 |

Her adım `BEGIN TRY … END TRY BEGIN CATCH … END CATCH` ile beklenen hata numarasını doğrular; tutmazsa `THROW 59999, N'<adım kodu>: beklenen <no>, gelen <no>', 1;`. Adım kodları Bölüm 7'dekilerdir. Eşzamanlılık adımları (KS-52, KS-56) Node iki sqlcmd oturumu açarak yürütür.

---

## 7. Doğrulama sınamaları

`npm run vt -- sinama` hepsini `Paksan_Sinama1` ve `Paksan_Sinama2` üzerinde çalıştırır. "Beklenen" sütunu hata numarası değilse adım başarılı olmalıdır.

### 7.1 Kurulum ve tekrarlanabilirlik

| Kod | Adım | Beklenen |
|---|---|---|
| KR-01 | `Paksan_Sinama1`: `kur` + `guncelle --ornek` | Hatasız |
| KR-02 | İkinci `guncelle` | "0 bekleyen, 0 değişen" |
| KR-03 | İkinci `kur` | Değişiklik yok |
| KR-04 | T ve B betikleri yeniden | 0 satır değişir; başvuru verisi özeti aynı |
| KR-05 | `Paksan_Sinama2` sıfırdan; iki parmak izi | Birebir aynı (kolon, tip, harmanlama, hesaplanmış kolon ifadesi, kısıt, dizin + filtre + INCLUDE, FK, modül tanımı, genişletilmiş özellik, `sys.database_permissions`, sistem sürümlü ayarlar) |
| KR-06 | `Paksan_Yerel` parmak izi | Sınama ile aynı |
| KR-07 | Uygulanmış V0003'e yorum satırı eklenmiş kopya klasörle `guncelle` | Araç durur, V0003'ü adıyla söyler |
| KR-08 | Uygulanmış V betiğinin dosyası yok | Araç durur |
| KR-09 | En büyük uygulanmış numaradan küçük yeni V | Araç durur |
| KR-10 | Veritabanı harmanlaması, uyumluluk, RCSI | `Latin1_General_100_CI_AS`; 150; `is_read_committed_snapshot_on = 1` |
| KR-11 | O betiği `test` işaretli veritabanında | 50001 |
| KR-12 | `<Codex metni:` yer tutucusu içeren betik `test` işaretli veritabanında `guncelle` | Araç durur |

**Uygulamada değişti (18.09.2026):** KR-06 dışındaki on bir adım her turda koşuyor; **KR-06 hâlâ ölçülmedi.** `Paksan_Yerel` kurulmadığı için `vt sinama --yerel` çalıştırılamıyor ve adım "atlandı" olarak raporlanıyor. Sınama veritabanlarının dışına çıkmama kuralı bilerek korunuyor; KR-06 uygulama sırasının 11. maddesiyle (`Paksan_Yerel`'i kur) birlikte kapanır. Atlanan adım sessiz geçmez, özet satırında `–` ile görünür.

### 7.2 Statik ve canlı denetim (`tools/vt/denetle.mjs`)

Statik (`npm run dogrula` da çalıştırır): Bölüm 1.18 yasakları; BOM; dosya adı kalıpları; her `CREATE TABLE`'da PK; adsız kısıt ve dizin; açık `COLLATE`'i olmayan metin kolonu; `char/varchar/nchar/text/ntext`; T-SQL ayrılmış sözcüğü ad olarak; bir modülde değişken/parametre adının farklı harf dizilişiyle yazılması; `yardim` betiğinde yazma ifadesi; R betiklerinde dinamik SQL; harmanlama belirtilmemiş `UPPER(`/`LOWER(`; `N'<Codex metni:` yer tutucusu (uyarı; test/canlı için hata). **Uygulamada değişti (17.09.2026):** `tools/vt/denetle.mjs` yüklenmiyordu (tek tırnaklı dizgide kaçışsız kesme işareti, `SyntaxError`); düzeltildi. Bölüm 1.18'de sayılıp listede eksik kalan `HISTORY_RETENTION_PERIOD`, `_UTF8`, `sp_OA*`, `BULK INSERT` eklendi. `<Codex metni:` yer tutucusu doğrudan çalıştırmada uyarı olarak listelenir (sorun sayılmaz; test/canlıda durdurmak `calistir.mjs`'in işidir, henüz yazılmadı).

**Uygulamada değişti (18.09.2026):** listedeki on üç denetimden yalnız dördü (1.18 yasakları, BOM, `CREATE TABLE`'da PK, yer tutucu) yazılmıştı; araç yine de "SQL statik denetimi temiz." basıyordu, yani çıktı 7.2'nin karşılandığı anlamına gelmiyordu. Kalan dokuzu yazıldı: dosya adı kalıpları (`calistir.mjs` yalnız tür harfiyle başlayan dosyaları görüyordu, buradaki denetim klasördeki her `.sql` dosyasına bakar), adsız kısıt, açık `COLLATE`'i olmayan metin kolonu, `char/varchar/nchar/text/ntext`, T-SQL ayrılmış sözcüğü ad olarak (yalnız **bizim verdiğimiz** adlar: `DECLARE`'ler, prosedür/işlev parametreleri, tablo, kolon ve nesne adları — çağrılan sistem prosedürünün parametre adı ve `@@ROWCOUNT` gibi sistem işlevleri sayılmaz), aynı modülde aynı adın farklı harf dizilişi, `yardim` betiğinde yazma ifadesi, R betiklerinde dinamik SQL, harmanlama belirtilmemiş `UPPER(`/`LOWER(`. Gerekçeli istisnalar `denetle.mjs` içindeki `ISTISNALAR` listesinde tek tek yazılıdır (1.14.4'ün ASCII kod alfabesi, parmak izinin `char(64)` onaltılık özeti, `R01`'in `Duz` üzerinde yaptığı büyük/küçük dönüşümü, `yardim` betiğindeki `EXEC dbo.AciklamaYaz`); yeni istisna eklemeden önce oradaki gerekçe okunur. Denetim yazılırken bulunan tek gerçek uyumsuzluk `R08`'deki `@Not` değişkeniydi (`NOT` ayrılmış sözcük); `@AtamaNotuDuz` oldu. `npm run dogrula` bu denetimi artık gerçekten çağırıyor (13. kontrol); önceden çağırmıyordu, yalnız elle ve `vt sinama` içinden koşuyordu.

**Uygulamada değişti (18.09.2026):** canlı denetimlerin tamamı yazıldı; `tools/vt/denetle.mjs` artık `canliDenetim(ayar)` işlevini dışa açıyor ve `vt sinama` CD adımı çalışıyor (önceden "yapılamadı" diyordu). On üçü tek SQL toplu işiyle `sys.*` üzerinden ölçülüyor; CD-SADELESTIR `yardim.Sadelestir` ile aynı modüldeki JavaScript karşılığını (`sadelestir`) 14 girdide altı alan için karşılaştırıyor. Her denetimin **gerçekten ateşlediği**, beklentisi bilerek bozulup ölçülerek kanıtlandı (CD-TIP 155, CD-HARMANLAMA 285, CD-ARAMA 7, CD-SADELESTIR 14, CD-FK-DIZIN 513, CD-UX-NULL 43, CD-ACIKLAMA 23, CD-YETKI 2, CD-RAPOR-KOLON 52, CD-GORUNUM 26, CD-TEMPORAL 2, CD-CK-IN 194, CD-CEVIRI 178, CD-SAHIP 24 bulgu); sessiz geçen denetim 17.09.2026'daki statik denetim bulgusunun ta kendisiydi. Yazılırken bulunan iki kendi hatası: filtreli dizin süzgeci `LIKE` ile aranınca köşeli parantez karakter kümesi sayılıyordu (`CHARINDEX`'e çevrildi) ve `Anahtar`/`Deger` kod benzeri kolon listesi 1.4.1'de "(ayar)" diye sınırlıyken tablo farkı gözetmeden uygulanıyordu (`sistem.Ayar` ile sınırlandı).

**Uygulamada değişti (18.09.2026):** `npm run dogrula` 13. kontrolü yalnız statik SQL denetimini çağırıyordu; planın "Doğrulama → Eşleşme denetimi (`npm run dogrula`)" maddesinin diğer iki ölçülebilir parçası da eklendi ve kontrolün adı "Veritabanı betikleri" oldu. (a) **Tohum betikleri kaynakla aynı mı:** `tools/vt/tohum-uret.mjs` artık dosyaya yazmayan `tohumDurumu()` işlevini dışa açıyor, `calistir` de onu kullanıyor. Bu, `vt sinama` KR-04 ile aynı şey değildir: KR-04 betiği VERİTABANIYLA karşılaştırır, bu kontrol betiği KAYNAK JSON'la — `tohum/kaynak/*.json` düzeltilip betiği yeniden üretmeyi unutmak KR-04'ten sessizce geçiyordu. Yer tutucu sayısı burada sorun sayılmaz (12. kontrolün konusu); sorun sayılan yalnız kaynakla betiğin ayrışması. (b) **Ortam dosyası git'te olmamalı:** `git ls-files veritabani/ortam` yalnız `ornek.env` döndürmeli; şifre içeren `*.env` depoya girerse kontrol durur. Git yoksa ya da burası depo değilse atlanır. Üçü de yazılıydı ama hiçbiri bu komuttan koşmuyordu; bir sınama çağrılmıyorsa yoktur.

Canlı (`vt sinama`, `sys.*` üzerinden):

| Kod | Denetim |
|---|---|
| CD-TIP | Bölüm 1.3.2 ad–tip tablosu (`%Zamani` = `datetime2(3)`, `%Tarihi` = `date`, `%Kimlik` = `uniqueidentifier`, para ekleri = `decimal(18,2)`, `%Orani` = `decimal(7,4)`, `%Ozeti` = `binary(32)`, `%Sifreli` = `varbinary(512)`, `%Arama` = hesaplanmış, `Numara` = `nvarchar(10)` BIN2, `%Kodu` BIN2 — `IlKodu`/`IlceKodu` hariç) İstisna (adıyla): `dbo.SemaGecmisi.Kimlik int IDENTITY` (araç sözleşmesi). **Uygulamada değişti (17.09.2026):** `EskiKimlik` → `EskiKayitNo`, `SifreOzeti` → `SifreKaydi` (0.2); `SifreKaydi` = `nvarchar(255)` BIN2 |
| CD-HARMANLAMA | Her metin kolonunun harmanlaması `Turkish_100_CI_AS`, `Latin1_General_100_CI_AS` ya da `Latin1_General_100_BIN2`; Bölüm 1.4.1 madde 4 kolonları BIN2 |
| CD-ARAMA | Her `%Arama` kolonu kalıcı hesaplanmış ve tanımı Bölüm 1.4.3 ifadesiyle (boşluk normalleştirilmiş, kaynak ve n yerine konmuş) aynı; tohum ve sınama verisinde `WHERE <Arama> LIKE N'%[^ -~]%' COLLATE Latin1_General_100_BIN2` 0 satır; her satırda `<Arama> = (SELECT Arama FROM yardim.Sadelestir(<kaynak>))` |
| CD-SADELESTIR | Sabit girdi listesinde `yardim.Sadelestir` ile API'nin JavaScript normalleştirmesi aynı sonucu verir (Bölüm 3.1.4 tablosundaki örnekler + `IZMIR.MERKEZ`, küçük harfli `i` içeren seri) |
| CD-FK-DIZIN | Her FK'nin öndeki kolonları bir dizinle karşılanır |
| CD-UX-NULL | Filtreli tekil dizindeki boş olabilen her anahtar kolon filtrede `IS NOT NULL` ya da `IS NULL` ile geçer |
| CD-ACIKLAMA | Her şema, tablo, kolon, görünüm, görünüm kolonu, prosedür, parametre, işlev, tetikleyicide `MS_Description` var |
| CD-YETKI | Her iş tablosunda `rol_uygulama` için en az bir GRANT ya da DENY var; `rol_rapor`'un SELECT izinleri Bölüm 4.2 listesiyle birebir aynı; `rol_yonetici` veritabanı düzeyi DENY yerinde |
| CD-RAPOR-KOLON | `rol_rapor` görünümlerinde Bölüm 4.2'deki kişisel kolon adları yok |
| CD-GORUNUM | `gorunum` görünümlerinde ve `yardim` sonuç kümelerinde (`sys.dm_exec_describe_first_result_set_for_object`) `uniqueidentifier` kolon yok; UTC `…Zamani` kolonu yok |
| CD-TEMPORAL | Bölüm 1.11.1 listesi dışında sistem sürümlü tablo yok; listedekilerin geçmiş tablosu `gecmis.<sema>_<Tablo>`; **Uygulamada değişti (17.09.2026):** geçmiş tablosunun kümelenmiş dizini motorun `ix_<sema>_<Tablo>` adlı, `PAGE` sıkıştırmalı dizinidir (Bölüm 1.3.5 istisnası; adsız dizin denetimi bunu hata saymaz) |
| CD-CK-IN | CHECK tanımlarında `IN (` yalnız Bölüm 1.17.7 kolonlarında, Yapan CHECK'inde, alıcı CHECK'inde, atama kısıtında ve `sistem.Giden` gizlilik CHECK'inde |
| CD-CEVIRI | `kod.Ceviri` ve `kod.EskiDegerEslesmesi` satırlarının `ListeAdi`'si gerçek tablo; `(ListeAdi, Kod)` / `YeniKod` hedef tabloda var; `AlanAdi` o tablonun metin kolonu |
| CD-SAHIP | Bütün şemalar ve nesneler `dbo` sahipli |

### 7.3 Kısıt sınamaları (S01, uygulama girişi)

| Kod | Adım | Beklenen |
|---|---|---|
| KS-01 | Aynı `talep.Talep.Numara` iki kez | 2627 |
| KS-02 | Numara biçim dışı (`SRV26-0012`; **Uygulamada değişti (17.09.2026):** eski örnek `SRV-26-0012` 11 karakter olduğu için CHECK'e gelmeden `2628` veriyordu) | 547 |
| KS-03 | Aynı `(MarkaKodu, SeriNo)` iki makine; aynı seri başka markada | 2627; geçer |
| KS-04 | `erisim.Kullanici` `konya` personel, sonra servis | 2627 |
| KS-05 | Giriş adı `Konya`; `a..b`; nvarchar parametreyle `N'ızmır.merkez'` | 547; 547; 547 |
| KS-06 | Aynı E.164 iki hesapta; geçersiz E.164 | 2601; 547 |
| KS-07 | İki hesapsız (oturumsuz) TEL talebi aynı anda `bekliyor` | İkisi de geçer |
| KS-08 | Aynı hesaba ikinci açık TEL talebi | 2601 |
| KS-09 | `bildirim.Teslimat`: aynı duyuruya servis ve personel satırları (`HesapKimlik` NULL); aynı `(DuyuruKimlik, HesapKimlik)` ikinci kez | Geçer; 2601 |
| KS-10 | Başka markanın makinesiyle talep | 547 |
| KS-11 | Hiç yetkisi olmayan servise atama | 547 |
| KS-12 | Yetkisi bitmiş servise atama; yetki yeniden verilince atama | 547; geçer |
| KS-13 | Açık atama varken servisin marka yetkisini doğrudan bitirmek | 547 |
| KS-14 | Yetkisi bitmiş servise yeni talep; açık talebin `ServisKimlik`'ini yetkisiz servise çevirmek; yetki bitince eski kapanmış talebe dokunmayan güncelleme | 51020; 51020; geçer |
| KS-15 | Parça satırı markası ≠ talep markası | 547 |
| KS-16 | `ServisZiyareti`'ni `parca` talebine bağlamak | 547 |
| KS-17 | Uydu tabloda `UyduKodu` farklı değer | 547 |
| KS-18 | Aynı ziyarete ikinci hak ediş | 2627 |
| KS-19 | `parca` aşamasındaki ya da `garanti` olmayan kapılı ziyarete hak ediş | 547 |
| KS-20 | Aynı siparişe ikinci etkin `parcaSiparisiBorcu`; asıl geri alındıktan sonra yenisi | 2601; geçer |
| KS-21 | Bilinmeyen durum kodu (`gonderildi`) | 547 |
| KS-22 | `geriCagirma` alt türünde müşteri hedefli duyuru | 547 |
| KS-23 | Kapalı durum + `KapanmaZamani` NULL; açık durum + dolu; `Kapali` bayrağı kod tablosuyla çelişen | 547; 547; 547 |
| KS-24 | Negatif tutar; geçersiz JSON | 547; 547 |
| KS-25 | `FiyatZorunlu = 1` sonuçla fiyatsız kapanış; `TeklifSonucuKodu` dolu, `FiyatZorunlu` NULL | 547; 547 |
| KS-26 | `AciklamaZorunlu = 1` nedenle açıklamasız iptal | 547 |
| KS-27 | `hakedis.HakEdisKalemiYaz` `yol` türüyle; onaylı hak edişe kalem | 51044; 51043 |
| KS-28 | `DonemDokumu.OdenecekTutar` formülle uyuşmuyor | 547 |
| KS-29 | Aynı servis, şirket, para birimi, ay için ikinci döküm; farklı şirketle | 2601; geçer |
| KS-30 | Başka servisin ya da başka şirketin dökümüne hak ediş ve hareket bağlamak | 547 |
| KS-31 | `odeme` hareketi dökümsüz ya da belgesiz | 547 |
| KS-32 | Sahip girişiyle bozulmuş `NetTutar`'lı hak edişi `onaylandi` yapmak | 51040 |
| KS-33 | `hakEdisAlacagi` tutarı Bölüm 1.9.3 formülünden farklı; ters hareket asıldan farklı tutarla | 51042; 51042 |
| KS-34 | Onaylı hak edişte vergi tutarı boş; `bekliyor` hak edişte `OnayZamani` dolu | 547; 547 |
| KS-35 | `ParcaSatiri`: `Adet` NULL + `KatalogDisi = 0`; `Adet` NULL + `KatalogDisi = 1` + `Tutar` NULL; `Adet = 0`; `Adet` NULL + `Tutar` dolu | 547; geçer; 547; 547 |
| KS-36 | `ZiyaretParcaSatiri.Adet = 0`; `ZiyaretDuzeltmesiParcasi.Adet = 0` | 547; 547 |
| KS-37 | `OdenecekTutar` dolu, `TutarDogrulamaZamani` boş | 547 |
| KS-38 | `sistem.Ayar`: `tamsayi` türüne `N'72 saat'`; aynı genel anahtar iki kez; aynı anahtar genel + marka + şirket | 547; 2601; geçer |
| KS-39 | `sistem.Ayar` hem `SirketKodu` hem `MarkaKodu` dolu | 547 |
| KS-40 | `erisim.Rol`: pasif rolle aynı adda yeni rol; aynı adda iki aktif rol | Geçer; 2601 |
| KS-41 | `entegrasyon.CariKarti` iki hedef dolu; aynı `(logo, FirmaNo, CariKodu)` iki kez | 547; 2601 |
| KS-42 | `entegrasyon.BelgeBagi`: aynı `Ettn` iki kez; hiçbir belge tanımlayıcısı yok; aynı firma + tür + belge no + tarih iki kez | 2601; 547; 2601 |
| KS-43 | `musteri.Hesap` `birlestirildi` ama bağ boş; kendine bağlı | 547; 547 |
| KS-44 | Yapan CHECK: `musteri` + kullanıcı kimliği; `personel` + `YapanAdi` boş; `sistem` + hesap; veriyle eklenmiş `bayi` türü + kullanıcı + ad | 547; 547; 547; geçer |
| KS-45 | `denetim.IslemKaydi` müşteri satırında `IpAdresi` dolu | 547 |
| KS-46 | `sistem.Giden`: `IlgiliKayitTuruKodu = dogrulamaKodu` ve `Govde` dolu | 547 |
| KS-47 | Sahip girişiyle `denetim.IslemKaydi` UPDATE; DELETE | 51012; 51012 |
| KS-48 | Sahip girişiyle `kvkk.RizaOlayi` UPDATE; `kvkk.MetinSurumu` içerik UPDATE; `HukukOnayiZamani` NULL → dolu | 51013; 51014; geçer |
| KS-49 | Sahip girişiyle `sistem.Ortam` UPDATE | 51011 |
| KS-50 | Dekont sınıfı dosyaya `SilinmeIstendiZamani` | 547 |
| KS-51 | `YapanAyarla` çağrılmadan durum değişikliği; çağrılıp değişiklik | 51010; tam 1 `DurumGecmisi` satırı |
| KS-52 | `NumaraAl`: sayaç satırı yokken iki oturum, dış işlem + `XACT_ABORT ON`, 500'er çağrı | 1000 farklı numara, hata yok, `MAX(SonSira)` = çağrı sayısı |
| KS-53 | `NumaraAl @Zaman = '2026-12-31 21:00'` (UTC) | `SRV27…` |
| KS-54 | `NumaraAl @Zaman` `test` işaretli ortamda | 51002 |
| KS-55 | `NumaraAl` sayaç 99999'dayken | 51001 |
| KS-56 | İki oturum aynı hak edişi aynı `SatirSurumu` ile onaylar | Biri 1, diğeri 0 satır günceller |
| KS-57 | `erisim.SifreYaz` jetonsuz (özet NULL hedef); geçerli jetonla; aynı jetonla ikinci kez; süresi geçmiş jetonla | 51030; geçer; 51030; 51030 |
| KS-58 | `musteri.SifreYaz` kodsuz (özet NULL hedef); 20 dakika önce kullanılmış kodla; aynı kodla ikinci kez | 51030; 51030; 51030 |
| KS-59 | `makine.MakineServisAtamasi` `YapanTuruKodu = servis` | 547 |
| KS-60 | `sistem.SaklamaUygula` (sınama): süresi geçmiş örnek `DogrulamaKodu`, `Oturum`, bağsız `Giden`, `Teslimat`'a bağlı `Giden` | İlk üçü silinir; bağlı `Giden` satırı kalır, gövdesi NULL; tam 1 `saklamaUygulandi` işlem kaydı |
| KS-61 | Uygulama girişiyle `DELETE erisim.DogrulamaKodu` | 229 |
| KS-62 | Aynı ziyarete ikinci `ParcaSevki` | 2601 |
| KS-63 | Başka talebin ziyaretine `ParcaSevki` | 547 |
| KS-64 | `servis` talebine ziyaretsiz `ParcaSevki` | 547 |
| KS-65 | Sorgu: `talep.TalepBelirtisi` satırlarının talebin markası ve ailesi için `kod.BelirtiKapsami`'nda olmayanı | 0 satır |
| KS-66 | **Uygulamada değişti (17.09.2026):** `hakedis.ServisHesapHareketi`: `hakEdisAlacagi` `HakEdisKimlik` boş; `parcaSiparisiBorcu` `ParcaTalepKimlik` boş; `duzeltmeAlacak` ve `duzeltmeBorc` `DuzeltilenHareketKimlik` boş | 547; 547; 547 |
| KS-67 | **Uygulamada değişti (17.09.2026):** talebin markasından farklı markalı `ServisZiyareti`; ziyaretten farklı markalı `ZiyaretParcaSatiri` (katalog dışı satır dahil), `ZiyaretDuzeltmesi`; düzeltmeden farklı markalı `ZiyaretDuzeltmesiParcasi` | 547; 547; 547; 547 |
| KS-68 | **Uygulamada değişti (17.09.2026):** `MarkaKodu` verilmeden `servis.MarkaYetkisi`, `talep.ServisZiyareti`, `katalog.Urun` satırı | 515 |
| KS-69 | **Uygulamada değişti (17.09.2026):** `FirmaNo` boşken `entegrasyon.CariKarti` ve `BelgeBagi`: aynı kod iki şirkette; aynı şirkette ikinci kez; şirketsiz ikinci kez | Geçer; 2601; 2601 |
| KS-70 | **Uygulamada değişti (17.09.2026):** `katalog.UrunVaryantiCevirisi` `tr` satırı | 547 |

### 7.4 Uçtan uca senaryo (S02, uygulama girişi)

Her adım `sistem.YapanAyarla` çağırır, beklenen işlem kaydı türlerini yazar ve sayım/tutar kontrolleriyle biter. Sınama anahtarıyla üretilmiş AES-GCM şifreli TC, HMAC ve maskeli değer sqlcmd değişkeniyle gelir.

| Kod | Adım |
|---|---|
| SN-01 | Hesap + hesap sahibi + telefon geçmişi; `musteri.SifreYaz` (kayıt doğrulama koduyla); 3 rıza olayı (aydınlatma okundu, açık rıza onay, ticari ileti ret); cihaz (`BildirimIzni = verildi`) |
| SN-02 | `makine.Makine (paksan, ORK1270202400157)`, sahiplik, kayıt olayı (`musteri`); personelin "Satan Bayi" girişi `MakineSatisi (paksanBayiye, KaynakKodu personel, FaturaTarihi NULL, DogrulamaDurumu bekliyor, GarantiYil 2 kopyalandı)` → `makine.MakineninBayisi` bayiyi döndürür, `MakineninServisi` `bayiServisi`; servise `paksan` yetkisi + atama → `makineAtamasi`; atama bitince → `bayiServisi`; satışa `IptalZamani` (bayi kaldırıldı) → NULL; yeniden bayi girilir |
| SN-02b | Servisim elle kaydı: ikinci makine + `KayitOlayi (KaynakKodu servis, ServisKimlik, BeyanAdi)`; atama yazılmaz → `MakineninServisi` NULL; `gorunum.KontrolServisiOlmayanSahipliMakine` makineyi `KaydedenServisAdi` ile listeler; `gorunum.MakineKarti.SahipBilgisininKaynagi = kayitBeyani` |
| SN-03 | `NumaraAl SRV`; `Talep` + `ServisTalebiAyrinti (sorunlu)` + 2 belirti (`kod.BelirtiKapsami` paksan/balya'dan) + 2 fotoğraf + ses; aynı işlemde `Bildirim (talep, bildirimler.talepAlindi)` + `Teslimat`; sonra `Teslimat.OkunmaZamani` |
| SN-04 | Ziyaret 1 (`garanti`, `parca`) + 2 parça satırı; durum `parcaBekliyor`, masa `parcaMasasi`; Bölüm 1.15.6 yüklemiyle yedek parça rolü (masa) ve servis masası rolü (tür) talebi görür |
| SN-05 | `ParcaSevki (TurKodu servis, ZiyaretKimlik = ziyaret 1)`; masa NULL; aynı ziyarete ikinci gönderim yeni satır açmaz, `SonGuncelleme…` güncellenir |
| SN-06 | Ziyaret `bitti` (`parcaDegisimi`, Km 42, işçilik 750); `HakEdis (bekliyor, SirketKodu paksan)` + `HakEdisHesapla` → yol 504,00 + işçilik 750,00, `NetTutar` 1254,00; durum `onayBekliyor`, masa `servisMasasi` |
| SN-07 | PAKSAN düzeltmesi: `ZiyaretDuzeltmesi` (Km 42 → 30) + parçalar (önceki 2 satır; yeni: biri çıkarılmış, diğeri adet 2); `ServisZiyareti.Km = 30`; `HakEdisHesapla` → `NetTutar` 1110,00; `talep.ZiyaretGuncelParcasi` yalnız kalan parçayı adet 2 ile döndürür; `ZiyaretParcaSatiri` 2 satırıyla yerinde |
| SN-08 | Onay (`SatirSurumu` ile): `KdvOrani 0,2000`, `KdvTutari 222,00`, `TevkifatTutari 44,40`, `StopajTutari 0,00`; hareket `hakEdisAlacagi` 1287,60 (1287,00 ile deneme → 51042); durum `kapandi`; `Kapanis (hakEdisOnayi)` |
| SN-09 | `Bildirim (talep, bildirimler.durumBaslik, DegerlerJson)` + `Teslimat`; `OkunmaZamani` |
| SN-10 | Müşteri yeniden açar: `YenidenAcma`; durum `yeni`; `Kapali = 0`; `KapanmaZamani` NULL. Randevu planlanır: `Randevu` + `Bildirim (randevu)` + `Teslimat` |
| SN-11 | Servis garanti dışı kapatır: `Kapanis (garantiDisi)`; `kapandi`; yeni hak ediş yok |
| SN-12 | Parça talebi: `NumaraAl YPR` ekleme anında; `ParcaTalebiAyrinti (havale, 2026-07-1, KDV 0,2, liste KDV hariç, AraToplam/KdvTutari/GenelToplam, SirketKodu paksan)`; 2 katalog satırı + 1 adetsiz `KatalogDisi` satırı; `FaturaBilgisi (kendisi, TcNoSifreli/Ozeti/Maskeli)`; PAKSAN doğrulaması (`KargoTutari`, `OdenecekTutar`, `SonOdemeTarihi`, `TutarDogrulama…`); durum `odemeBekliyor`; ödeme hesapları `ParcaTalebiAyrinti.SirketKodu → sirket.BankaHesabi`; `Dekont`; `OdemeOnayi (OnaylananTutar = OdenecekTutar)`; `gorunum.KontrolOdemeTutariUyusmayanParca` 0 satır; `incelemede`; `ParcaSevki (TurKodu parca, ziyaretsiz)`; `Kapanis (personelFormu)`; `kapandi` |
| SN-13 | Servis parça siparişi: `NumaraAl SPS`; `OdemeYontemi = bakiye`; kapanışta `parcaSiparisiBorcu` = `COALESCE(OdenecekTutar, GenelToplam)`; ikinci borç 2601 |
| SN-14 | Fiyat teklifi: `NumaraAl TKF`; `TeklifTalebiAyrinti` + ürün tipleri (`yonca`, `samanBugday`) + arazi; `Teklif` 1 (1.650.000) ve 2 (1.580.000, geçerlilik tarihi); `BayiAtamasi` (uydu kalıbı); `kapandi`, sahip `bayi` |
| SN-15 | Dönem: `NumaraAl HAK`; `DonemDokumu (servis, paksan, TRY, yıl, ay)`; SN-08 hak edişi ve SN-13 borcu bağlanır; `MahsupToplam` = borç; `OdenecekTutar` = 1110,00 + 222,00 − 44,40 − 0 − borç (CK tutar); `DonemDokumuBelgesi` iki belge (servis faturası, banka fişi); `odendi` yapılırken aynı işlemde `odeme` hareketi (döküm + belge) |
| SN-16 | İçe aktarım: sınama TC'si ve IBAN'ı içeren servis listesi → `IceAktarimSatiri.HamVeriJson` içinde bu iki düz değer 0 satır. Kontroller: tablo başına sayımlar; `gorunum.TalepListesi` 4 talep ve beklenen durumlar; `gorunum.ServisHesapHareketleri` alacak 1287,60 ve borç; `gorunum.ServisBakiyesi` şirket ve para birimi başına tek satır; ilk talebin `TalepDurumGecmisi` sırası; `denetim.IslemKaydi` beklenen tür kodları; `makine.MakineGarantisi` beklenen dayanak; `gorunum.KontrolHakEdisToplamiUyusmuyor` 0 satır |
| SN-17 | `musteri.HesabiAnonimlestir` senaryo hesabına: senaryodaki ad, soyad, telefonun ulusal kısmı ve teslimat adresi `sys.columns`'tan bulunan bütün `nvarchar` kolonlarda `LIKE` ile aranır → 0 satır (`kvkk.BasvuruTalebi` hariç); **Uygulamada değişti (17.09.2026):** ziyaretin `ArizaMetni`/`SonucMetni`, randevunun `IsTanimi`, teklif notu ve devir nedeni de aranır; hesabın cari kartına bağlı bir satış faturası (`entegrasyon.BelgeBagi`) varken anonimleştirme geçer ve belgenin `CariKartiKimlik`'i NULL olur |
| SN-18 | **Uygulamada değişti (17.09.2026):** parça aşamasında ziyareti olan talep iptal edilir (ziyaret `yarimKaldi`) → talep yeniden açılır → servis yeni parça ister: ikinci `parca` ziyareti geçer; `yarimKaldi` yazılmadan aynı adım `2601` |

### 7.5 Yetki sınamaları (S03)

| Kod | Giriş | Adım | Beklenen |
|---|---|---|---|
| YS-01 | uygulama | `UPDATE`/`DELETE denetim.IslemKaydi`; `UPDATE`/`DELETE kvkk.RizaOlayi`; `INSERT kvkk.MetinSurumu` | 229 |
| YS-02 | uygulama | `INSERT talep.DurumGecmisi` | 229 |
| YS-03 | uygulama | `SELECT sistem.NumaraSayaci`; `SELECT dbo.SemaGecmisi` | 229 |
| YS-04 | uygulama | `UPDATE erisim.Kullanici SET SifreKaydi`; `UPDATE musteri.Hesap SET SifreKaydi` | 230 (prosedür yolu çalışır) |
| YS-05 | uygulama | `DELETE talep.Dekont`; `dosya.Dosya`; `erisim.Oturum`; `erisim.GirisDenemesi`; `sistem.TekrarAnahtari` | 229 |
| YS-06 | uygulama | `UPDATE`/`DELETE talep.ZiyaretParcaSatiri`; `INSERT hakedis.HakEdisKalemi` | 229; `UPDATE hakedis.HakEdis SET NetTutar` 230 |
| YS-07 | uygulama | `INSERT kod.TalepDurumu`; `INSERT katalog.Parca`; `UPDATE sistem.Ayar` | 229 |
| YS-08 | uygulama | `EXEC yonetim.TalebiKapat`; `EXEC yardim.Ara`; `SELECT gorunum.TalepListesi`; `SELECT gorunum.GecerliAyar` | 229; 229; 229; geçer |
| YS-09 | uygulama | `EXEC sistem.SaklamaUygula` | Geçer |
| YS-10 | uygulama | `UPDATE hakedis.ServisHesapHareketi SET GeriAlinmaZamani` | 230 |
| YS-11 | yönetici | Herhangi bir tabloya `INSERT`/`UPDATE`/`DELETE` (`denetim.IslemKaydi` dahil) | 229 |
| YS-12 | yönetici | `EXEC yonetim.GirisSifresiniSifirla … @Uygula = 1`; `SELECT * FROM erisim.Kullanici` | Geçer, işlem kaydı yazılır; geçer |
| YS-13 | yönetici | `EXEC erisim.SifreYaz`; `EXEC musteri.HesabiAnonimlestir` | 229 |
| YS-14 | rapor | `SELECT talep.Talep`; `SELECT gorunum.MusteriKarti`; `SELECT gorunum.TalepListesi` | 229 |
| YS-15 | rapor | `SELECT gorunum.TalepIstatistigi`; `SELECT gorunum.HakEdisListesi` | Geçer; kişisel/şifreli/özet/maskeli kolon yok |
| YS-16 | rapor | `EXEC yardim.Ara` | 229 |

**Uygulamada değişti (18.09.2026):** YS-04, YS-06'nın `NetTutar` yarısı ve YS-10 "229" diyordu; ölçülen **230**. Üçünün de DENY'si kolon düzeyindedir (Bölüm 4.3 son satırlar) ve SQL Server nesne düzeyi reddinde 229, kolon düzeyi reddinde 230 verir. Beklenen numara 230'a çevrildi: kolonun reddedildiğini söyleyen ayrı numaradır ve sınamanın "tablonun tamamı kapalı" durumuyla karışmasını önler. Aynı adımların nesne düzeyi yarıları (`ZiyaretParcaSatiri`, `HakEdisKalemi`) 229 olarak kaldı.

### 7.6 Esneklik sınamaları (S04; yalnız veri, V betiği yok)

Başlangıçta ve sonda şema parmak izi alınır; ikisi aynı olmalıdır.

| Kod | Adım | Beklenen |
|---|---|---|
| ES-01 | `katalog.Marka globale (SirketKodu paksan, GarantiYil 3)` + ürün + parça grubu + parça + fiyat listesi + `kod.BelirtiKapsami` + bir servise yetki; globale makinesiyle talep | Geçer; `(globale, aile)` belirti listesi PAKSAN'ınkinden ayrı |
| ES-02 | Globale'ye yetkisiz servise atama; yetkisi bitirilmiş servise atama ve yeni talep | 547; 547; 51020 |
| ES-03 | PAKSAN toplamları (`gorunum.TalepIstatistigi`, `HakEdisListesi`) ES-01 öncesi ve sonrası `MarkaKodu = paksan` süzgeciyle | Aynı |
| ES-04 | `sirket.Sirket gallignani (LogoFirmaNo 2)` + `BankaHesabi` + `katalog.Marka gallignani` + şirket ayarı `KdvOrani`; gallignani parça talebi; müşteri için `CariKarti (logo, FirmaNo 2)` | Talebin `SirketKodu = gallignani`; ödeme hesabı gallignani'nin; `gorunum.GecerliAyar` (`KdvOrani`, marka gallignani) şirket değerini döndürür; müşterinin iki firmada iki cari kodu durur |
| ES-05 | Aynı servis, aynı ay: paksan dökümü varken gallignani dökümü; PAKSAN dökümüne gallignani hak edişini bağlamak; servis için `CariKarti (logo, 2)` eklemeden önce ve sonra kontrol görünümü | Geçer; 547; `gorunum.ServisBakiyesi` iki satır; `KontrolLogoCariKoduEksik` önce listeler, sonra listelemez |
| ES-06 | `katalog.Marka paksan.SirketKodu` sonradan değiştirilir | Eski `HakEdis`, `DonemDokumu`, `ServisHesapHareketi`, `ParcaTalebiAyrinti` satırlarının `SirketKodu` değişmez |
| ES-07 | `kod.Dil it` + `kod.Ceviri (kod.TalepDurumu, …, Ad, it)` + `kod.Ceviri (katalog.Kategori, …, KisaAd, it)` + `katalog.UrunCevirisi (…, it)` (`Slogan` ve `Aciklama`) + `kvkk.MetinSurumu (it)` | Geçer; CD-CEVIRI temiz |
| ES-08 | `kod.TalepDurumu tekrarZiyaretBekliyor (Kapali 0, GecikmeSayilir 1)` ve `odemeYapilmadi (Kapali 1)` + `TalepTuruDurumu` | Açık durumlu talep açık talep dizinine ve `Gecikti` hesabına girer; kapalı durum `KapanmaZamani` ile kabul |
| ES-09 | `kod.TalepTuru kurulum` + `NumaraOneki KUR` + `TalepNumaraKurali` + `TalepTuruUydusu (kurulum, servisZiyareti)` + `kod.Masa kurulumMasasi`; kurulum talebine ziyaret ve hak ediş; rolü `kurulum` olan personel talebi görür | Geçer |
| ES-10 | `kod.HakEdisKalemTuru konaklama` + `hakedis.Tarife (konaklama, sabit)` + `HakEdisKalemiYaz` | `NetTutar` kalemi içerir; onay geçer |
| ES-11 | `sistem.NumaraOneki GLS` + `TalepNumaraKurali (servis, connect, GLS, globale)` | Globale talebi `GLS`, paksan `SRV` numarası alır |
| ES-12 | `kod.AktorTuru bayi`, `kod.KaynakUygulama bayiPaneli`, `kod.AliciTuru bayi`, `kod.KayitKaynagi bayi`, `erisim.Kullanici (bayi)`; bayi yapanlı `MakineSatisi`; bayi alıcılı `Bildirim` (`KullaniciKimlik`); bayi yapanlı `MakineServisAtamasi` | Geçer; geçer; 547 |
| ES-13 | Aynı servise ikinci ve üçüncü `servis.GirisHesabi` | Geçer |
| ES-14 | `kod.DisSistem efatura`; `BelgeBagi (efatura, DisKayitNo GUID metni, Ettn, FirmaNo NULL)`; aynı `DisKayitNo` ikinci kez; `CariKarti (efatura, FirmaNo NULL)`; `kod.KargoFirmasi (DisSistem)` | Geçer; 2601; geçer; geçer |
| ES-15 | `kod.BildirimKanali whatsapp` + `kod.DisSistem`; `Giden` satırı; `gonderildi` yapılırken `SaglayiciKodu` boş | Geçer; 547 |
| ES-16 | `kod.ParaBirimi EUR`; EUR fiyat listesi; aynı ay TRY dökümü varken EUR hak ediş ve döküm | Geçer; görünümler para birimine göre ayrı satır |
| ES-17 | `kod.KisiRolu muhasebeci` + `musteri.HesapKisisi` | Geçer |
| ES-18 | `kod.IceAktarimTuru`, `kod.BelgeTuru`, `kod.IptalNedeni`, `kod.Birim`, `sistem.Ayar` (marka satırı) yeni satırlar | Geçer |
| ES-19 | Veri eklendikten sonra değiştirilmiş (paksan'a ürün ve parça eklenmiş) T05/T06 ile `guncelle` | ES-01'de eklenen globale satırları ve ES-08/ES-18 kod satırları `Aktif = 1` kalır |
| ES-20 | Son parmak izi | Başlangıçla aynı; `vt durum` 0 bekleyen V |

### 7.7 Bulunabilirlik sınamaları (S05, yönetici girişi)

| Kod | Adım | Beklenen |
|---|---|---|
| BS-01 | `SELECT ilkodu FROM cografya.il;` `SELECT KIMLIK FROM talep.talep;` `SELECT * FROM cografya.Il WHERE Ad = N'istanbul';` | Çalışır (207/208 yok); `İSTANBUL` bulunur |
| BS-02 | `yardim.Ara`: `srv-26-00123`, `SRV2600123`, `0532 123 45 67`, `+90 532 123 45 67`, `905321234567`, küçük harf ve `ı` içeren seri, `isik makina`, müşterinin eski telefonu, oturumsuz TEL talebinin yeni telefonu, `TEL-…`, `GBD-…`, `HAK-…`, `IZMIR.MERKEZ` servis giriş adı, servis ve bayi cari kodu, `SRV014` eski servis numarası | Her biri beklenen kaydı `Tam = 1` ile ilk satırlarda döndürür |
| BS-03 | `yardim.Ara N'ab'` | 51105 |
| BS-04 | `yardim.TalepGoster N'SRV-26-00123'` ve `N'srv2600123'` | 22 sonuç kümesi, aynı sırada; kapanmış talebin kapanış nedeni ve yapanı 14. kümede; sonradan ekleme, yeniden açma, gizleme, parça fiyat görüntüsü ilgili kümelerde |
| BS-05 | `yardim.MakineGoster N'ork1270-2024-00157'`; `gorunum.MakineKarti WHERE SeriNo = (SELECT Kod FROM yardim.Sadelestir(N'ork1270-2024-00157'))` | Makine bulunur |
| BS-06 | `yardim.MusteriGoster` eski telefonla; birleşmiş hesabın telefonuyla; hesapsız talebin telefonuyla (`0532…`); oturumsuz TEL talebinin yeni telefonuyla | Hesap/zincir, hesapsız talepler ve TEL talebi `BulunduguYer` ile döner |
| BS-07 | `yardim.ServisGoster` giriş adıyla, cari koduyla, `SRV014` ile | Servis ve giriş hesabı durumu, açık şifre yardım talebi döner |
| BS-08 | CD-GORUNUM | `uniqueidentifier` ve UTC `…Zamani` yok |
| BS-09 | `gorunum.TalepListesi.OlusmaTarihi`: 22:30 UTC'de oluşmuş talep | Ertesi gün (Türkiye) |
| BS-10 | Her `yonetim` prosedürü: gerekçe 5 karakter; pasif personelle; var olmayan giriş adıyla | 51100; 51101; 51101 |
| BS-11 | Her `yonetim` prosedürü `@Uygula = 0`, sonra `@Uygula = 1` | Önizlemede hiçbir tabloda satır sayısı ya da değer değişmez; uygulamada tam 1 ana `IslemKaydi`: beklenen tür, `KaynakUygulamaKodu = yonetim`, `YapanTuruKodu = personel`, `AyrintiJson` `gerekce`, `sqlGirisi`, `bilgisayar` dolu; sistem sürümlü tabloda geçmiş satırı |
| BS-12 | `TalebiKapat` bekleyen hak edişli talepte; ödemesi onaylanmamış müşteri parça talebinde; `kapandi` elle seçilemeyen türde | 51110; 51111; 51112 |
| BS-13 | `TalebiKapat` uygun talepte | `Kapanis (personelFormu, KapanisNotu = gerekçe)`, `Kapali = 1`, `DurumGecmisi.MusteriyeBildirildi = 0`; `TalepGoster` 14. kümede `KaynakUygulamaAdi` yönetim |
| BS-14 | `TalebiYenidenAc` iptal talepte; `TalebiIptalEt` açıklama zorunlu nedenle açıklamasız; `TalepDurumunuDegistir` kapalı hedefle | `YenidenAcma`, `KapanmaZamani` NULL; 51114; 51112 |
| BS-15 | `DekontuGecersizKil` başka talebin dekont `KayitNo`'suyla; ödeme onaylıyken | 51104; 51111 |
| BS-16 | `ServistenMarkaYetkisiniAl` açık atamalı markada `@Uygula = 0`, sonra `= 1` | Önizleme bitecek atamaları ve açık talepleri listeler; uygulamada atamalar ve yetki biter, `makine.MakineninServisi` zincirin sonraki adımına düşer |
| BS-17 | `HakEdisOnayiniGeriAl`; sonra aynı hak edişi API yoluyla yeniden onaylamak; `HesapHareketiniDuzelt` geri alınmış asıl harekete; `hakEdisAlacagi` hareketine `@DogruTutar` | Ters hareket, asılda `GeriAlinmaZamani`, hak ediş `bekliyor`, talep `onayBekliyor`; yeni `hakEdisAlacagi` geçer; 51141; 51143 |
| BS-18 | `MusteriTelefonunuDegistir` yeni telefon başka hesaptayken; `HesaplariBirlestir` sonrası tekrar | 51121; geçer |
| BS-19 | `GirisSifresiniSifirla` → dönen kodla uygulama girişinden `erisim.SifreYaz`; aynı kodla ikinci kez | Geçer, eski oturumlar kapalı; 51030 |
| BS-20 | `AyarDegistir TalepGecikmeSaati N'72 saat'`; `N'72'` | 51150; geçer ve `gorunum.TalepListesi.Gecikti` yeni değere göre |
| BS-21 | `KisiselVerileriAnonimlestir` (hesaplı ve hesapsız kayıtları olan telefon; başvuru `KayitNo`'suyla) | Ad, soyad ve telefonun ulusal kısmı `sys.columns`'tan bulunan bütün `nvarchar` kolonlarda 0 satır (`kvkk.BasvuruTalebi` hariç); başvuru `sonuclandi`; tablo başına sayılar döner |

---

## 8. Açık sorular ve varsayılanlar

Varsayılanla ilerlenir; cevap gelince yalnız veri (ayar, kod satırı, saklama kuralı) değişir. Şema değişikliği gerektiren madde işaretlidir.

| # | Soru | Sorumlu | Varsayılan | Değişince ne değişir |
|---|---|---|---|---|
| 1 | Test ve canlı aynı VPS'te ayrı veritabanı ve girişlerle olabilir mi? | Bilgi işlem | Evet | — |
| 2 | VPS'te SQL Server Express (10 GB) ile başlanabilir mi? | Bilgi işlem | Evet, en az 2019 | — |
| 3 | Canlı kurtarma modeli ve yedek aralığı | Bilgi işlem | `FULL` + 15 dakikada bir günlük yedeği | `SIMPLE` seçilirse K01 ve `vt yedekle` |
| 4 | Teslim belgesi yoksa bayi faturasına kaç gün eklenir? (KOD 15) | Satış, hukukçu | `GarantiFaturaEkGunu` NULL; `faturaArtiSure` kullanılmaz | Ayar ya da `katalog.Marka.GarantiFaturaEkGun` |
| 5 | Saklama süreleri; hukuk onayı olmadan uygulansın mı? | Hukukçu | Bölüm 1.13.4 değerleri, `HukukOnayli = 0`, uygulanır (kısa tutmak veri azaltma yönündedir) | `saklama-kurallari.json` (T08) |
| 6 | Dekont ve işlem kaydı ne kadar saklanır? | Hukukçu, muhasebe | Süresiz (`sakla`); korumalar değişmez | **Şema**: dekont CHECK'i ve işlem kaydı tetikleyicisi ek V betiğiyle gevşetilir |
| 7 | "Ödeme bekliyor" parça talebi kaç gün sonra iptal olur? (KOD 11) | Muhasebe | 7 gün | `OdemeBeklemeGunu` |
| 8 | Hak edişte KDV, tevkifat, stopaj oranları; şahıs servise gider pusulası (KOD 10) | Muhasebe | Ayarlar NULL; oranlar girilmeden API onay yapmaz (yerel/sınamada örnek veri doldurur) | `HakEdisKdvOrani`, `HakEdisTevkifatOrani`, `HakEdisStopajOrani` |
| 9 | Kargo bedeli ayrı mı, kim öder? (KOD 14) | Muhasebe | `KargoTutari` ayrı, `OdenecekTutar` içinde | — |
| 10 | Garanti kapsamında bedelsiz parça çıkışının LOGO belge türü (KOD 13) | Muhasebe | `kod.BelgeTuru garantiBedelsizCikis` | Kod satırı |
| 11 | Yedek parça alan müşteriye LOGO'da cari açılacak mı? (KOD 8) | Muhasebe | Müşteri `CariKarti` satırları boş kalabilir | — |
| 12 | Kargo firması listesi | Satış/lojistik | `kod.KargoFirmasi` boş; `ParcaSevki.KargoFirmasiMetni` serbest | Kod satırları |
| 13 | Birleştirilmiş iptal nedeni listesi (backoffice + Servisim) | Servis müdürü | 7 kod + `odemeSuresiDoldu`; adlar Codex'ten | Kod satırları |
| 14 | "Sorun devam ediyor" sonrası tekrar ziyaret durumu (KOD 17) | Servis müdürü | `tekrarZiyaretBekliyor` tohumlanmaz | Kod satırı |
| 15 | Servisim hesabı firma mı teknisyen mi (KOD 18) | Servis müdürü | Firma başına 1 (`ServisBasinaEnFazlaGirisHesabi`) | Ayar |
| 16 | Aile hesabı: tek giriş telefonu, çok kişi | Yönetim | Evet | Çok girişli kurumsal hesap istenirse **şema** (2.3) |
| 17 | Gerçek seri numarası biçimi (KOD 20) | Bilgi işlem | `kod.SeriKurali onekYilSira`; biçim yalnız uyarı (`SeriBicimeUygun`) | Kod satırı + uygulama kodu |
| 18 | LOGO cari kodu, belge no uzunlukları | Bilgi işlem, muhasebe | `CariKodu k(32)`, `BelgeNo k(32)`, `DisKayitNo k(64)` | Daha uzunsa **şema** (yeni kolon; genişletme izinli değil) — pilot öncesi LOGO'da ölçülür |
| 19 | Şirketin LOGO firma numarası | Muhasebe | `sirket.Sirket.LogoFirmaNo` NULL; kontrol görünümü "hiç LOGO kodu yok" kuralıyla çalışır | Veri |
| 20 | Hak ediş tarifesinin başlangıç tarihi | Servis müdürü | `2026-01-01` | `hakedis.Tarife` satırı |
| 21 | `yonetim` prosedürlerini kim çalıştırır; tek yönetici girişi mi kişi başına giriş mi? | Yönetim, bilgi işlem | Tek giriş + `@YapanGirisAdi` (aktif personel) + `ORIGINAL_LOGIN()` + `HOST_NAME()` | Kişi başına giriş açılırsa K02'ye giriş eklenir; prosedürler değişmez |
| 22 | Bütün Türkçe metinler (THROW, bölüm başlıkları, kod adları, anonim metni, `MS_Description`, ayar açıklamaları) | Codex | Yer tutucu ya da taslak; `dogrula` kontrol 12 ve KR-12 yakalar; açıklamalar `vt sozluk` öncesi topluca Codex'ten geçer | Metin |
| 23 | Servisim elle kayıt ekranındaki "makine sizin kaydınıza bağlanır" cümlesi artık doğru değil (ElleKayit.jsx:391) | Codex (API fazı) | Değişmedi; yeni metin API fazında Codex'ten geçer | Ekran metni |
| 24 | Ödeme ekranı akışı: numara ve IBAN PAKSAN doğrulamasından sonra (RequestForm.jsx) | Ürün (API fazı) | Bölüm 1.7.4 | Ekran akışı ve metinleri |
| 25 | V0001, K01, K02 `THROW` metinleri (21 yer tutucu) ve V betiklerindeki `MS_Description` taslakları | Codex | 17.09.2026: Codex kullanım sınırı nedeniyle geçmedi. V betiği uygulandıktan sonra değiştirilemediği için V0001 metinleri ve V açıklamaları ilk kalıcı kurulumdan (`Paksan_Yerel` dahil) önce yerine konur, sonra `Paksan_Sinama1/2` silinip yeniden kurulur | K01/K02 her zaman; V0001–V0015 yalnız ilk kalıcı kurulumdan önce. Kalıcı kurulumdan sonraki açıklama düzeltmesi açıklamaları yeniden yazan ayrı bir betikle yapılır |

---

## 9. Katalog belgelerinin şablonu

### 9.1 Dosyalar

Tablolar `veritabani/tasarim/` altında şu dosyalara yazılır; bir nesne iki dosyada anlatılmaz:

| Dosya | Kapsam |
|---|---|
| `katalog-01-sistem-kod-cografya.md` | `dbo` (`SemaGecmisi`, `AciklamaYaz` sözleşmesi); `sistem` tabloları; `kod` (bütün kod listeleri, `TalepNumaraKurali`, `TalepTuruDurumu`, `TalepTuruUydusu`, `BelirtiKapsami`, `Ceviri`, `EskiDegerEslesmesi`; her liste için tohum satırları ya da üretileceği kaynak ve bayrak değerleri); `cografya` |
| `katalog-02-sirket-katalog.md` | `sirket`; `katalog` (marka, kategori, bakım şablonu/adımı, ürün ve uyduları, parça grubu, parça, fiyat listesi ve satırı, parça-model, `…Cevirisi` tabloları). Genel `katalog.Ceviri` yoktur (Bölüm 1.15.3) |
| `katalog-03-personel-erisim-kvkk.md` | `personel`, `erisim`, `kvkk` tabloları |
| `katalog-04-musteri-makine.md` | `musteri`, `makine` tabloları |
| `katalog-05-servis-bayi-hakedis.md` | `servis`, `bayi`, `hakedis` tabloları |
| `katalog-06-talep.md` | `talep` tabloları |
| `katalog-07-duyuru-bildirim-destek-dosya.md` | `duyuru`, `bildirim`, `destek`, `dosya` tabloları |
| `katalog-08-denetim-entegrasyon-gorunum-yardim-yonetim.md` | `denetim`, `entegrasyon` tabloları; **bütün R nesneleri**: `gorunum` ve alan şemalarındaki görünümlerin tam kolon listesi ve birleştirme mantığı (Bölüm 3.2, 3.3), `yardim.Sadelestir` ve `yardim` prosedürleri, `yonetim` prosedürleri (sözde kod), Bölüm 4.4 tetikleyicileri, `sistem.NumaraAl`, `sistem.YapanAyarla`, `sistem.SaklamaUygula`, `erisim.SifreYaz`, `musteri.SifreYaz`, `musteri.HesabiAnonimlestir`, `hakedis.HakEdisHesapla`, `hakedis.HakEdisKalemiYaz` |

01–07 yalnız tabloları anlatır; tablonun "Tetikleyiciler ve bağlı nesneler" satırında R nesnelerine adıyla başvurur. 08, bu belgedeki sözleşmelerden (Bölüm 1.7.2, 1.9, 1.13, 1.14.4, 3, 4.4) sapmaz; sözleşmenin söylemediği ayrıntıyı tamamlar.

Dosyanın başı:

```markdown
# Tablo kataloğu — <şemalar>

Kural kaynağı: veritabani/tasarim.md (bu dosya onunla çelişirse tasarim.md geçerlidir).
Kalıp grupları: [K] [O] [G] [R] [A] [I] [E] [T] [L] [Y] [F] — tasarim.md Bölüm 1.3.6.
Tip kısaltmaları: uid, dt, tarih, k(n), m(n), c(n), para, oran, sif, ozet, ? — tasarim.md Bölüm 1.5.

## <sema>
<şemanın bir cümlelik amacı; tasarim.md Bölüm 1.2 ile aynı>
```

### 9.2 Tablo şablonu (her tablo için aynen)

````markdown
### `<sema>.<Tablo>`

| Özellik | Değer |
|---|---|
| Amaç | <bir-iki cümle; MS_Description taslağı> |
| Ekrandaki karşılığı | <ekran adı ve ürün; yoksa "ekranda yok"> |
| Aşama | P (pilot) / C (canlı öncesi) / S (sonra; tablo bugün boş açılır) |
| Kalıplar | [K] [O] [R] [A] … |
| Sistem sürümlü | Evet → `gecmis.<sema>_<Tablo>` / Hayır |
| V betiği | V00NN__… |
| Yazan akış | <ürün + akış; yalnız prosedür ya da tetikleyiciyse adı> |
| Okuyan | <ürünler, görünümler, yardim prosedürleri> |
| Kaynak (bugünkü veri) | <dosya:satır ve depo anahtarı; yeni tabloysa "yeni (gerekçe)"> |

**Kolonlar**

| # | Kolon | Tip | Boş | Varsayılan | Açıklama (MS_Description taslağı) | Kaynak alan |
|---|---|---|---|---|---|---|
| 1 | `Numara` | `k(10)` | Hayır | — | Talebin okunur numarası (SRV2600123) | `requests[].no` (yeniden verilir) |

**Kısıtlar**

| Ad | Tür | Tanım (tam T-SQL) | Gerekçe |
|---|---|---|---|
| `PK_<sema>_<Tablo>` | PK | `(Kimlik)` NONCLUSTERED | [K] |
| `UQ_…` | UQ | `(…)` | |
| `UX_…` | UQ filtreli | `(…) WHERE … IS NOT NULL AND …` | |
| `FK_…` | FK | `(…) → <sema>.<Tablo> (…)` | |
| `CK_…` | CK | `<ifade>` | |
| `DF_…` | DF | `<Kolon> = <değer>` | |

**Dizinler**

| Ad | Kolonlar | INCLUDE | Filtre | Amaç (hangi sorgu) |
|---|---|---|---|---|

**Tetikleyiciler ve bağlı nesneler**

| Nesne | Tür | Bu tabloyla ilişkisi |
|---|---|---|

**Yetkiler**

| Rol | SELECT | INSERT | UPDATE | DELETE | Not |
|---|---|---|---|---|---|
| `rol_uygulama` | Şema | Evet/Hayır | Hayır / Evet / `(Kolon1, Kolon2)` | Hayır/Evet | DENY'ler |
| `rol_yonetici` | Şema | DENY (veritabanı) | DENY (veritabanı) | DENY (veritabanı) | |
| `rol_rapor` | Hayır | — | — | — | |

**Geçmiş, silme, saklama, anonimleştirme**

- Geçmiş: <sistem sürümlü / açık geçmiş / yok>
- Silme: <silinmez → neyle arşivlenir / bağ satırı silinir / yalnız prosedür>
- Saklama: <`sistem.SaklamaKurali` kayıt türü ya da "yok">
- Anonimleştirme: <hangi kolonlar, hangi prosedür; ya da "kişisel veri yok">

**Tohum**

<T/B/O betiği, kaynak dosya, yazım biçimi (MERGE kapsamı / yalnız ekleme / yalnız yoksa ekle); kod listelerinde satırlar ya da üretileceği kaynak ve bayrak değerleri; yoksa "tohum yok">

**Sınamalar**

<tasarim.md Bölüm 7 kodları: KS-.., SN-.., YS-.., ES-.., BS-..>

**Taslaktan farklar ve kararlar**

<taslak B'ye göre eklenen, kaldırılan, yeniden adlandırılan kolon/kısıt/dizin (kaldırılanlar gerekçesiyle); tasarim.md'de olmayan, bu tabloya özgü karar (gerekçe ve kaynakla). Kural değiştiren karar buraya yazılamaz; tasarim.md'ye önerilir.>
````

Görünüm, işlev, prosedür ve tetikleyici şablonu (`katalog-08`):

````markdown
### `<sema>.<Nesne>`

| Özellik | Değer |
|---|---|
| Tür | Görünüm / Satır içi işlev / Prosedür / Tetikleyici |
| Amaç | <tasarim.md'deki sözleşme cümlesi> |
| R betiği | R0n__… |
| Yetki | <hangi rol, hangi izin> |
| Sözleşme | tasarim.md Bölüm <n> |

**Parametreler** (prosedür/işlev): `| Ad | Tip | Varsayılan | Açıklama |`

**Sonuç kolonları** (görünüm/işlev) ya da **sonuç kümeleri** (prosedür, sırasıyla): `| Kolon | Tip | Kaynak ifadesi | Açıklama |`

**Davranış**: sözde kod ya da tam T-SQL; doğrulamalar hata numaralarıyla; yazdığı tablolar ve kolonlar; işlem kaydı türü.

**Sınamalar**: tasarim.md Bölüm 7 kodları.
````

Kurallar:
- Tablolar şema içinde V betiğindeki oluşturma sırasıyla yazılır.
- Bölüm 0.4'teki her madde ilgili tablonun kolon/kısıt listesine işlenir; taslakta olup bu belgede kaldırılan kolon yazılmaz, "Taslaktan farklar" satırında anılır. Taslaktaki hiçbir tablo, kısıt ya da dizin sessizce düşürülmez.
- Her `FK` kolonunun tipi, uzunluğu ve harmanlaması hedefle birebir aynıdır (Bölüm 1.5); bileşik FK'nin hedef tekilliği adıyla yazılır.
- Her CHECK Bölüm 1.17.6'ya (NULL) ve 1.17.1'e (kod adı) uyar.
- Kolon açıklamaları Türkçe teknik metindir ve birimi söyler ("UTC", "Türkiye günü", "KDV hariç", "para birimi ParaBirimiKodu'nda"); `vt sozluk` öncesi Codex'ten geçer.
- Ekranda görünen sabit Türkçe metin katalogda `<Codex metni: …>` yer tutucusuyla yazılır.
