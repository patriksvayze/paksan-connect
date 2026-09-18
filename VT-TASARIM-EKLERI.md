# Uygulamadan gelen veritabanı tasarımı ekleri

18 Eylül 2026'da uygulamaya iki yeni akış girdi. İkisi de bugün
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
