# Codex'i bekleyen Türkçe metinler

Kullanıcının kararı (17 Eylül 2026): Codex'in kullanım sınırı dolu olduğu
sürece yazılan Türkçe metinler bu listede birikiyor; sınır yenilenince
hepsi TEK SEFERDE Codex'e verilecek (model `gpt-6-astra`, efor `low`,
bkz. CLAUDE.md → "Codex ile iş bölümü").

Metinler ekranda şimdilik okunur bir taslak olarak duruyor; yayına
çıkışı `npm run dogrula` 12. kontrol engelliyor. Codex geçişi bitince
ilgili satır bu dosyadan silinir; dosya boşalınca dosyanın kendisi de.

Codex'e verirken brife ev kuralları yazılır: düğme yazıları Başlık
Düzeninde, marka adı yer tutucuyla (`{marka}`, `markaEk(...)`),
müşteri ve servis ekranlarında terim yasağı (iskonto, kapsam, künye;
"hak ediş" yalnız müşteri ekranında yasak).

## 1. Backoffice — Raporlar ekranı (17 Eylül 2026)

Her dosyada metinlerin hepsi dosya başındaki `codexBekliyor({...})`
nesnesinde toplu. Nesne olduğu gibi verilir, dönen metin yazılır,
sarmalayıcı kaldırılır.

**18 Eylül 2026 — hesap düzeltmeleriyle gelen yeni/değişen metinler.**
Ekrandaki sayıların hesabı düzeltildi; sayının ne anlattığını söyleyen
metinler de onunla birlikte değişti. Aşağıdakiler bu turda yazılan
taslaklar; dosyaların `codexBekliyor` nesnesi Codex'e verilirken bunlar
da içinde gidiyor, ayrıca bir iş değil. Kısa dökümü (Codex'in neyin
neden değiştiğini bilmesi için):

- `genel.js` — "48 saati geçen" ölçüsünün ve sütununun teklif
  bekleyenleri saymadığını söyleyen etiketler; yeni "İptal" sütunu ve
  "Diğer" satırı; "Yeni müşteri" alt yazısı; servissiz makine
  uyarısının "en yeni defter satırı" ibaresi; grafik alt yazısında
  "o günün" → "o aralığın"; dört yeni not maddesi
- `Gorunum.jsx` — "Dikkat İsteyenler" kartının alt yazısı
- `servis.js` — kapanış ve yeniden açılma notlarının yeni tanımı,
  kapsama sütununun toplam satırı ve kimliksiz servis kaydı notları
- `garanti.js` — "Kabul edilmeyen iş" ölçü adı ve tutarlı alt yazısı,
  "Yol tutarı" / "İşçilik tutarı" sütun adları, parça sütununun
  "(kabul edilmeyen hariç)" ibaresi, model tablosu açıklaması,
  onay bekleyen ve parça notları
- `urun.js` — üretim yılı tablosunun eşik cümlesi, eşik notunun
  genişletilmesi, iş/parça notlarının ayrılması, iptal notu
- `parca.js` — "Gecikme" sütununun birimsiz adı, söz ölçütünün
  "tarih ve saat" ibaresi, gecikme ve servis siparişi tablolarının
  açıklamaları, grafik alt yazısı
- `satis.js` — "Listede olmayan bayi" satır adı, hunideki tutarın alt
  yazısı, bayi karnesi açıklaması, "Yanıt gecikti" notu
- `musteri.js` — "Müşteri no" sütunu, en çok talep açan müşteriler
  tablosunun açıklaması ve notu
- `destek.js` — çözülme oranının alt yazısı, cevapsız grafiğinin kesim
  ibaresi, 30 dakika notunun düzeltilmesi
- `ekip.js` — personel grafiğinin kesim ibaresi

- `src/backoffice/ekranlar/Raporlar.jsx`
- `src/backoffice/ekranlar/rapor/Gorunum.jsx`
- `src/backoffice/ekranlar/rapor/bolumler/genel.js`
- `src/backoffice/ekranlar/rapor/bolumler/servis.js`
- `src/backoffice/ekranlar/rapor/bolumler/garanti.js`
- `src/backoffice/ekranlar/rapor/bolumler/urun.js`
- `src/backoffice/ekranlar/rapor/bolumler/parca.js`
- `src/backoffice/ekranlar/rapor/bolumler/satis.js`
- `src/backoffice/ekranlar/rapor/bolumler/musteri.js`
- `src/backoffice/ekranlar/rapor/bolumler/destek.js`
- `src/backoffice/ekranlar/rapor/bolumler/ekip.js`

## 2. Veritabanı — hata mesajları ve kod adları

`<Codex metni: …>` yer tutucuları. Tam listesi:
`node tools/vt/denetle.mjs` (17 Eylül akşamı 629 yer). Kalıcı kurulumdan
(Paksan_Yerel dahil) ÖNCE bitmeli.

- `veritabani/kurulum/K01__veritabani.sql`, `K02__girisler.sql`
- `veritabani/semalar/V0001__temel.sql`
- `veritabani/tekrar/R02` … `R08` (THROW mesajları, yardim/yonetim çıktıları)
- `veritabani/tohum/T01__kod_listeleri.sql` (kaynakta etiketi olmayan kod adları; üretici `veritabani/tohum/kaynak/kod-adlari.json`'dan yazıyor — Codex'e JSON verilir, betik yeniden üretilir)
- `veritabani/ornek/O01`–`O03`, `veritabani/tohum/T06`, `T07`

## 3. PAKSAN Connect — sözlük anahtarları (`src/i18n/tr.js`)

Türkçe taslak `tr.js`'de; İngilizcesi `en.js`'de Claude tarafından
yazılı. `npm run dogrula` 12. kontrol bu başlığın altındaki her anahtarı
"Codex bekleyen" diye sayıyor — satır biçimi `- \`anahtar.yolu\``.

<!-- anahtarlar:connect -->
- `ekle.ilkBaslik`
- `ekle.cakismaBaslik`
- `ekle.cakismaAciklama`
- `ekle.cakismaSoru`
- `ekle.numaramDegisti`
- `ekle.numaramDegistiAlt`
- `ekle.baskasindanAldim`
- `ekle.baskasindanAldimAlt`
- `ekle.seriDuzelt`
- `ekle.aldimBaslik`
- `ekle.aldimMetin`
- `ekle.aldimSeriEtiket`
- `ekle.aldimHazirla`
- `ekle.seriKopyala`
- `ekle.seriKopyalandi`
- `numara.cakismaKart`
- `numara.cakismaNeden`
- `numara.eskiNumaraniz`
- `numara.hataEskiNumara`
- `numara.hataEskiAyni`
- `numara.cakismaAlindiMetin`
- `numara.cakismaHatirlamiyorum`
- `bildirimler.cakismaBaslik`
- `bildirimler.cakismaOnay`
- `bildirimler.cakismaRet`
<!-- /anahtarlar:connect -->

## 4. PAKSAN Servisim ve backoffice — dosya içi metinler

Tek dilli ekranlar; metin dosyanın içinde. Satır biçimi
`- \`dosya\` — ne` ; 12. kontrol bu başlıktaki dosya satırlarını sayıyor.

<!-- dosyalar:tekdil -->
- `src/backoffice/ekranlar/NumaraTalepleri.jsx` — seri çakışması talebi: rozet, açıklama, alan adları, iki kontrol yazısı, uyarılar, taşınacaklar özeti, onay düğmesi, onay sorusu ve bildirim cümleleri; onaylanmış kartta kontrollerin yerine geçen sonuç cümleleri, taşınacak kayıt bulunamadığında çıkan bildirim
- `src/backoffice/ekranlar/Musteriler.jsx` — birleştirilmiş hesap: listede "… hesabına geçirildi" satırı, müşteri kartındaki açıklama cümlesi
- `src/backoffice/veri.js` — seri çakışması onay/ret işlem kaydı özetleri (`numaraTalebiKarar`); Adreslerim: teslimat adresi eksik hata cümlesi (`servisParcaSiparisi`, `servisKaydiGonder`)
- `src/lib/numaraTalebi.js` — seri çakışması talebinin işlem kaydı özeti (backoffice İşlem Kaydı'nda görünüyor)
- `src/servis/adresler.js` — Adreslerim: firma adresinin defterdeki adı (`FIRMA_ADRES_BASLIK`, taslak "Firma Adresim"). Servis bu adı kendi vermiyor, PAKSAN kaydından gelen adresin başlığı
- `src/servis/AdresSecici.jsx` — Adreslerim seçici ve adres formu: `ADRES_METNI` nesnesinin tamamı (alan adları, ipuçları, ad önerileri, eksik alan uyarıları, düğmeler, form başlıkları, firma adresi notu). 18 Eylül'de eklenenler: `firmaRozet`, `hesaptanDegistir`in yeni iki cümlelik hâli, `hesaptanDegistirKendi`
- `src/servis/ekranlar/Adreslerim.jsx` — Hesap → Adreslerim: `METIN` nesnesinin tamamı (bölüm adı, boş durum, düğmeler, silme onayı). 18 Eylül'de eklenen: `firmaNotu` (firma adresinin neden düzenlenemediği ve taşınınca ne yapılacağı)
- `src/servis/ekranlar/SiparisVer.jsx` — Adreslerim: "Teslim Adresi" bölüm adı ve onay yaprağındaki "Teslim Adresi" satırı
- `src/servis/ekranlar/ServisKapanisi.jsx` — Adreslerim: "Parçanın Gönderileceği Adres" bölümü, "Müşterinin bilgileriyle dolduruldu; değiştirebilirsiniz." notu, onay yaprağında "Gönderilecek Adres", 2. aşamada "Gönderim Adresi"
- `src/servis/ekranlar/TalepDetay.jsx` — Adreslerim: servis kaydı kartında "Gönderim Adresi" satırı
- `src/backoffice/ekranlar/Talepler.jsx` — Adreslerim: `TeslimatAdresi` bölümü (Teslimat adresi, Servis elle girdi, Adresi Kopyala/Kopyalandı, Alıcı, Telefon, İl / İlçe, Açık adres)
- `src/backoffice/ekranlar/ParcaKatalogu.jsx` — Yedek Parça Kataloğu ekranı: `METIN` nesnesinin tamamı (başlık, açıklama ve fiyat notu, süzgeç adları, sütun başlıkları, rozetler, düzeltme penceresi alanları ve uyarıları, toplu geri alma onayı, yeni fiyat listesi bölümünün tamamı: dosya seçme, önizleme satır adları, yeni grup uyarısı, indirme ipucu)
<!-- /dosyalar:tekdil -->
