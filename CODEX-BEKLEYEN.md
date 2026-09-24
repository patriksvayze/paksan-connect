# Codex'i bekleyen Türkçe metinler

**KUYRUKTA 13 DOSYA (24 Eylül 2026, 17:20).** Codex'in sınırı 24 Eylül
14:30'da doldu (açılış 18:08). Aynı gün yazılan metinler taslak olarak
yerinde: eksik gönderim, seri numarası (elle kayıt), sipariş tutarının
KDV dâhil gösterimi, sipariş iptali ve iadesi, kullanılabilir bakiye,
Servisim bildirim geçmişi, Talepler süzgeci, kalan parçaların iptali,
servis kaydında seri numarası. Brief içeriği aşağıdaki
kuyruk satırlarında. Önceki kuyruk (21 Eylül) boşaltılmıştı.

Dosya SİLİNMEDİ, çünkü anlattığı şey bir iş değil bir YÖNTEM ve o
yöntem tekrar gerekecek: Codex'in kullanım sınırı 17, 19 ve 21 Eylül'de
doldu. Beş kaynak dosya, `tools/dogrula.mjs` ve README bu dosyayı
adıyla gösteriyor; silinseydi hepsi kırık bağa bakardı.

## Yöntem — sınır dolduğunda ne yapılır

Kullanıcının kararı (17 Eylül 2026): Codex'in kullanım sınırı dolu
olduğu sürece yazılan Türkçe metinler burada birikir; sınır
yenilenince hepsi TEK SEFERDE Codex'e verilir (model `gpt-6-astra`,
efor `low`, bkz. CLAUDE.md → "Codex ile iş bölümü").

Taslak metin ekranda okunur dursun ki ekran değerlendirilebilsin;
yayına çıkışı `npm run dogrula` 12. kontrol engeller. Taslağın nasıl
işaretleneceği metnin nerede durduğuna göre değişir:

| Metin nerede | Nasıl işaretlenir | Nasıl sayılır |
|---|---|---|
| Connect sözlüğü (`src/i18n/tr.js`) | anahtar aşağıdaki `anahtarlar:connect` bloğuna yazılır | 12. kontrol bloğu okur |
| Tek dilli ekranın içinde | dosya aşağıdaki `dosyalar:tekdil` bloğuna yazılır | 12. kontrol bloğu okur |
| Yeni bir ekranın metin nesnesi | nesne `codexBekliyor({...})` ile sarılır (`src/backoffice/ekranlar/rapor/metin.js`) | 12. kontrol işareti kodda arar |
| SQL betiği | `N'<Codex metni: taslak>'` | `tools/vt/denetle.mjs`, `dogrula` 13. kontrol |
| Kod listesi adı | `kod-adlari.json` içinde `<Codex metni: taslak>` | tohum üretimi + 13. kontrol |

**Yer tutucunun içine taslağı yaz**, boş bırakma: Codex taslağı
iyiyse aynen kullanıyor ve bağlamı ondan anlıyor.

## Brief'e yazılacak ev kuralları

Codex bu projenin yazım düzenini bilmiyor; söylenmezse kendi
tercihine göre değiştiriyor.

- Düğme yazıları Başlık Düzeninde; etiket ve açıklama cümleleri normal
- Marka adı yer tutucuyla: `{marka}`, `{markaYi}`, `{markaya}`,
  `{markadan}`, `{markada}`, `{markanin}` — değiştirilmez
- `${MARKA}`, `${ad}`, `{tel}` gibi şablon yer tutucuları korunur
- Müşteri ve servis ekranlarında terim yasağı: iskonto, kapsam, künye;
  "hak ediş" yalnız müşteri ekranında yasak. Backoffice'te yasak yok
- Yorum satırları değiştirilmez — ekranda görünmüyorlar
- SQL'de tek tırnak kullandırılmaz; dizgiyi bozar

## Öğrenilenler (19 Eylül 2026 turundan)

- **Üretilen betiği düzenletme.** Codex T06, T07 ve O01–O03'ü
  düzenledi; oysa onları `tools/vt/tohum-uret.mjs` üretiyor. Bir
  sonraki `vt tohum` yazdığını silecekti. `dogrula` 13. kontrol
  yakaladı; metin üretece taşınıp yeniden üretildi. Üretilen dosya
  Codex'e verilmez, KAYNAĞI verilir.
- **Aynı cümle birden çok yerde.** "gerekçe en az 10 karakter olmalı"
  18 yerde, "önizleme; hiçbir şey kaydedilmedi" 15 yerde geçiyordu.
  Brief'te "aynı taslağın geçtiği her yere aynı metni yaz" denmezse
  aynı hata iki türlü görünür.
- **Codex tutarsızlık buluyor.** Kendisine söylenmeden fark etmiyor;
  ama "şu beş ad aynı şeyi anlatıyor, birleştir" dendiğinde
  birleştiriyor. Teslimat adresinin beş ayrı adı böyle tek ada indi.
- **Ekran turu kelimeye bakmadığı için hayatta kaldı.** 48 metin
  değişti, `tools/ekosistem-turu.mjs` 63 denetimle yeşil kaldı.

## Kuyruk

<!-- anahtarlar:connect -->
<!-- /anahtarlar:connect -->

<!-- dosyalar:tekdil -->
- `src/backoffice/ekranlar/Talepler.jsx` — (2) sipariş dökümü `SiparisDokumu`: "Ara toplam (KDV hariç)", "Genel toplam (KDV dâhil)", eksik fiyat uyarısı, "Servisin bakiyesinden düşülen", "Kalan parçalar gönderilince düşülecek" / "Parçalar gönderilince düşülecek", "İptalde bakiyeye geri eklenen"; Servis Siparişi bölümünde "Ödeme" satırı ("Servisin bakiyesinden düşülür" / "Faturayla"); iptal penceresi: başlık "Siparişi İptal Et", beş sipariş iptal sebebi (`SIPARIS_IPTAL_SEBEPLERI`), "Servise açıklama", örnek cümle, bakiyeye dönecek tutarın iki cümlesi, faturalı sipariş notu (LOGO iade faturası), "servisin uygulamasında aynen görünecek" uyarısı, iptal alt bilgisi (`servise bildirim gitti · … bakiyesine geri eklendi`); makine bölümünde serisiz satır ("Yok · servis seri numarasını okuyamadı", "(tahmini)"); durum süzgecinin iki grup başlığı ("Dikkat isteyenler", "Duruma göre"). (1) eksik gönderim: kapanış formunda "Gönderilen Parçalar" başlığı, bakiye ve fatura için iki açıklama cümlesi, "Bakiyeden düşülecek tutar" etiketi, "En az bir parçayı işaretleyin." hatası; parça tablosunda "Gönderilmedi" etiketi; "Kalan Parçaları Gönder" düğmesi ve penceresi (başlık, açıklama); kapanış ve gönderim sonrası iki alt bilgi cümlesi (`bir kısmı gönderildi, kalan parçalar talepte bekliyor`, `kalan parçalar gönderildi, servise bildirim gitti`) (3) kalan parçaların iptali (17:20): "Kalan Parçaları İptal Et" düğmesi ve penceresi (başlık, "İptal Edilecek Parçalar", açıklama cümlesi, dört sebep `KALAN_IPTAL_SEBEPLERI`, "Servise açıklama" ve örnek, bakiye ve fatura için iki bilgi cümlesi, "Siparişin tutarı … iken … olacak."), alt bilgi (`kalan parçalar iptal edildi, servise bildirim gitti`); parça tablosunda "İptal edildi" etiketi; dökümde "İptal edilen parçalar", "Siparişin yeni tutarı (KDV dâhil)", iptal satırı (`… kalem iptal edildi · sebep · …`)
- `src/backoffice/veri.js` — (2) durum adı "Parça Hazırlanıyor" (`DURUMLAR`, "Parça Yolda" ile çift); sipariş iptali: `servisSiparisiniIptalEt` iki hatası ("Sipariş bulunamadı.", işleme alınan sipariş iptal edilemiyor), iptal sebebi "Servis siparişten vazgeçti", iade hareketinin açıklaması (`… · sipariş iptali, bakiyeye iade`, Servisim Hak Ediş satırında görünüyor); bakiye yetmediğinde sipariş hatası (`servisParcaSiparisi`, "gönderilmeyi bekleyen siparişlerinizin tutarı ayrıldı"). (1) eksik gönderim: "En az bir parçayı işaretleyin." ve "Gönderilecek kalan parça yok." hataları, işlem kaydı özeti "kalan parçalar gönderildi" (`servisSiparisiGonderimi`, `kalanParcalariGonder`) (3) kalan parçaların iptali: "İptal edilecek kalan parça yok.", "En az bir parçayı işaretleyin.", "İptal sebebini seçin." hataları, işlem kaydı özeti "kalan parçalar iptal edildi" (`kalanParcalariIptalEt`)
- `src/servis/ekranlar/TalepDetay.jsx` — (2) sipariş iptali: "Siparişi İptal Et" düğmesi, işleme alınmış sipariş ipucu, onay penceresi (başlık "Sipariş iptal edilecek", bakiye ve fatura için iki cümle, "Sipariş", "Tutar"); bakiye satırları (`BakiyeDurumu`: "Bakiyenizden düşülen", "Kalan parçalar gönderilince düşülecek", "Parçalar gönderilince düşülecek", "İptalde bakiyenize geri eklenen"); serisiz makine (`SerisizMakine`: "Seri numarası yok · tahmini … üretimi", "Seri numarası olmadan garanti hesaplanamaz"). (1) eksik gönderim: parça altında "Henüz gönderilmedi" notu, listenin altında bakiye ve fatura için iki açıklama cümlesi (`ParcaDurumu`) (3) kalan parçaların iptali: parça altında "İptal edildi", listenin altında iptal cümlesi (`{MARKA} … parçayı siparişten çıkardı. İptal nedeni: …`, bakiye ve fatura için iki cümle), fiyat kartında "İptal edilen parçalar", "Siparişin yeni tutarı" (`IptalPayi`)
- `src/servis/talepBildirimleri.js` — eksik gönderim bildirimleri: `siparisKismenGonderildi` ve `kalanGonderildi` başlık ve metinleri; iptal bildiriminde iade cümlesi ("… bakiyenize geri eklendi.") · kalan parçaların iptali (17:20): `kalanIptalEdildi` başlığı ve iki metni
- `src/servis/ekranlar/ElleKayit.jsx` — seri numarası (24 Eylül, iki karar): alan adı "Makine Seri Numarası" ("(varsa)" kalktı), tanınmayan seri hatası, iki ipucu cümlesi; "Seri Numarası Yok" seçeneği ve alt satırı, "Makine Modeli", "Tahmini Üretim Yılı" ve ipucu cümlesi, üç hata ("modelini seçin", "tahmini üretim yılını seçin", "seri numarasını yazın ya da Seri Numarası Yok"), işlem kaydı eki "seri numarası yok"
- `src/servis/ekranlar/Hakkedis.jsx` — hesap hareketinin yaprağı: "Siparişin tutarı", "(KDV dâhil)", "İşlem" ve iptal cümlesi, "Gönderim" ve "… gönderim", "Kalan parçalar gönderilince düşülecek", "Bu gönderimdeki parçalar"; satır adındaki "… gönderim" eki · kalan parçaların iptali (17:20): "İptal edilen parçalar", "Siparişin yeni tutarı"
- `src/servis/ekranlar/Parca.jsx` — sipariş kartı durumu "Kısmen gönderildi"
- `src/servis/ekranlar/SiparisVer.jsx` — bakiye seçeneğinin alt satırı: "Kullanılabilir bakiyeniz: … · … gönderilmeyi bekleyen siparişlerinize ayrıldı"
- `src/servis/ekranlar/ServisKapanisi.jsx` — serisiz talepte "Tahmini İmal Yılı" satırı · seri numarası (17:20, kullanıcının isteği): "Şase Numarası" yerine "Seri Numarası" (kutu ve satır), serisiz talepte değer "Yok", iki garanti cümlesinde ve bir hatada "şase numarası" → "seri numarası"
- `src/servis/ekranlar/Bildirimler.jsx` — yeni ekran (bildirim geçmişi): grup adları "Bugün", "Dün", "Bu hafta", "Daha eski"; "Okunmadı"; boş ekran başlığı ve cümlesi
- `src/servis/ServisPanel.jsx` — üst çubukta "Bildirimler" düğmesi; Bildirimler ekranının alt başlığı ("… size ne yazdı")
- `src/servis/servisFormu.js` — servis formu PDF'inde serisiz makine: imal yılı "(tahmini)", şase no "Yok"
- `src/components/ParcaTablosu.jsx` — tutar sütunu: başlık "Tutar", adet birden çoksa "Birim …"
<!-- /dosyalar:tekdil -->

