# Kullanıcı sınaması — 24 Eylül 2026 (ilk sınama)

Sekiz tur, dört kişi: çiftçi Mehmet Kaya (Connect, 3 tur), Selçuk Tarım
Servisi teknisyeni (Servisim, 2 tur), Selin Aksoy (backoffice, Servis
rolü, 2 tur), Burak Demirtaş (backoffice, Yedek Parça rolü, 1 tur).
Oturumları kullanıcı açtı; ajanlar yalnız ekrandan çalıştı. Her turdan
sonra `tutarlilik.js` ile veri ölçüldü; ajanın söylediği kayıtla
karşılaştırıldı.

Sınamadan önce kod okunarak dört hata bulundu ve aynı gün düzeltildi
(Connect kaydının ortak depoyu silmesi, Connect'in eski listeyi geri
yazması, backoffice'in eski ekrandan ikinci onayı, Servisim şifre
oturumu; sınaması AK-28). Kaydın ortak depoyu silmesi sınamanın başında
canlı da yaşandı: kullanıcı çiftçi hesabını düzeltmeden önceki kodla
açtı, kurulan hesabın makineleri ve iki bildirim silindi.

"Doğrulandı" = kayıt ya da kod okunarak kanıtlandı. "Ajan" = yalnız
ajanın ekranda gördüğü.

## Yüksek

| # | Bulgu | Nerede | Kanıt |
|---|---|---|---|
| Y1 | Fiyat teklifine çiftçinin ilk makinesi kendiliğinden yazılıyor; Süper Yunus teklifinde "Makine: Orkinos 1270" | Connect talep formu (`RequestForm.jsx`, `makine` her türde gönderiliyor) | Doğrulandı (TKF2609242211 kaydı) |
| Y2 | Seri numarası yalnız model önekine bakıyor: bir hanesi eksik ya da O/0 karışık numara "makine bulundu" diyor | Connect Makine Kaydet (`lib/serial.js → validateSerial`) | Ajan + kod |
| Y3 | Müşteri kartı ve "Aktif diğer talepler" servisin elle açtığı talepleri göstermiyor: telefon yazısı harfi harfine karşılaştırılıyor (Connect boşluklu, Servisim boşluksuz yazıyor), talepteki müşteri kimliğine bakılmıyor | Backoffice Müşteriler (`Musteriler.jsx:262`), talep detayı | Doğrulandı (kod + kayıt) |
| Y4 | Servis siparişi akışları müşteriye bildirim yazdırıyor; servis siparişinin müşterisi yok, bildirim kimseye gitmiyor; ekran "müşteriye bildirim gitti" diyor | Servisim sipariş iptali, backoffice sipariş kapanışı (`talepIptal`, `talepKapat`) | Doğrulandı (sahipsiz 4 bildirim) |
| Y5 | Servis, kendisine atanmamış bir makine için telefonla iş açıp o işin servisi oluyor; çiftçiye "Servisinizi Ara: Selçuk" gösteriliyor, makinenin servisi ise Bandırma'daki servis | Servisim Kayıt Aç, Connect talep detayı | Doğrulandı (SRV2609241656) |

## Orta

| # | Bulgu | Nerede | Kanıt |
|---|---|---|---|
| O1 | Sipariş başarı ekranı KDV hariç ara toplamı gösteriyor (1.820 TL); liste ve onay KDV dâhil (2.184 TL) | Servisim `SiparisVer.jsx:963` | Doğrulandı (kod) |
| O2 | Kargo bilgisi girilince servis işi yedek parça biriminin listesinden düşüyor; yanlış takip numarası düzeltilemiyor | Backoffice (`rolunTalepleri` masaya bakıyor) | Doğrulandı (SRV2609232963) |
| O3 | Servisim Hak Ediş ekranı açık kaldıkça listeyi yenilemiyor; onaylanmış kayıt "onay bekliyor 654 TL" görünürken bakiye güncel | `Hakkedis.jsx:44-51` (`surum` bağımlılıkta yok) | Doğrulandı (kod) |
| O4 | Talebin il/ilçesi hesaptan geliyor, servisin gideceği adresten değil (adres "Konya Selçuklu", talep "Balıkesir/Bandırma") | Connect servis talebi | Doğrulandı (kayıt) |
| O5 | Aynı makine için iki servis talebi aynı anda açık kalabiliyor (farklı servislerde); ne engel ne uyarı | Connect + Servisim | Doğrulandı (kayıt) |
| O6 | Backoffice oturumu bütün sekmelerde ortak: sekme yenilenince başka personelin kimliğine geçiyor (işlem yanlış kişi adına yazılabilir) | `panelOturum` localStorage | Doğrulandı (canlı yaşandı) |
| O7 | Rol, ücret ve iskonto değişikliği başka sekmelerde sayfa yenilenene kadar görünmüyor | `lib/icerikDeposu.js` bellek | Kod |
| O8 | Kapanmış siparişte "İptal"e basınca hiçbir şey olmuyor, neden yazmıyor (Yedek Parça rolünün yeniden açma yetkisi yok) | Backoffice Talepler | Ajan |
| O9 | Listeden kaldırılan talep geri getirilemiyor; onay metni geri dönüş yolu varmış gibi yazıyor | Connect Taleplerim | Ajan |
| O10 | Makine Kaydet ekranında "DENEME – test için örnek seri numaraları" kutusu çiftçiye görünüyor | Connect `AddMachine` | Ajan |

## Karar bekleyen tasarım soruları

- **Hak ediş reddi talebi kapatıyor**; personel "düzeltip yeniden
  gönderin" yazsa da servisin yeniden gönderme yolu yok.
- **"Parçayı Taktım" parça daha yoldayken basılabiliyor**; "parça
  elinize ulaştı mı" adımı yok.
- **Servis ataması**: varsayılan rollerde yalnız Yönetici/Admin
  yapabiliyordu. Sınama için "Servis" rolüne `servisDuzenle` eklendi
  (kullanıcının kararı); kalıcı olsun mu?
- **Elle açılan iş ve makinenin servisi çelişirse** (Y5) iş kimde
  kalmalı, hak edişi kim almalı?

## Düşük

- Saat girilmeyen randevuya "03:00" ekleniyor (iki kez görüldü; saat dilimi).
- Servisim'de İşlerim simgesindeki "9+" rozeti bildirim sayısı sanılıyor.
- Yüzen "Sipariş Ver" düğmesi bazen tepki vermiyor ya da alttaki karta tıklatıyor.
- Bakiye yetmeyince "Bakiyemden Düşülsün" açıklamasız pasif kalıyor.
- Connect ana ekran sayaçları sıfırken dokununca tepki vermiyor; "Aktif taleplerim" Profil'e götürüyor.
- Connect talep detayında çiftçinin yazdığı servis adresi görünmüyor.
- Parça talebinin geçmişinde "Randevu verildi" yazıyor (parçada anlamı "gönderim günü").
- Kargo için art arda iki benzer bildirim; yanlış servis ataması bildirimi düzeltilince geri alınmıyor.
- "PAKSAN 1 parçayı siparişten çıkardı" kalemi sayıyor, adedi değil (kalem iptali, bugünkü metin).
- Aynı telefon ekranlarda üç biçimde (ülke kodlu, boşluklu, sıfırlı).
- Servisim "48 saati geçen iş" uyarısı hangi iş olduğunu göstermiyor.
- Hak Ediş'teki "güncel ücretleriniz" özeti model bazlı istisnayı söylemiyor (Orkinos 1270: 90 TL/saat).
- Boş geri bildirim kaydedilmiyor ama ekran bir şey söylemiyor.
- Kayıtlı Makineler "servis ataması buradan yapılır" diyor; yetkisiz role neden düğme olmadığını söylemiyor.
- Demo verisindeki servis kayıtları makineyle uyuşmuyor (rotovatörde "düğüm atmıyor", garantisi bitmiş makinede "garanti kapsamında" notu) — uygulama hatası değil, personeli ve sınamayı yanıltıyor.

## Çalıştığı görülenler

- Çift dokunma / çift onay tek kayıt yazdı (hak ediş onayı, ödeme onayı,
  servis kaydı, sipariş). Hak ediş onayında bugünkü düzeltmenin canlı kanıtı.
- Para her adımda tuttu: servis bakiyesi 1.507 → 2.017 (düzeltilmiş
  hak ediş 510) → 1.981 (sipariş 36) → 2.581 (hak ediş 330 + 270);
  kalem iptalinde sipariş 21.408 → 21.240; servis formu PDF'i ekranla birebir.
- Servis ataması çiftçiye bildirildi; talepler atanan servise düştü.
- Servisin elle açtığı iş çiftçinin Connect listesinde göründü (talebin
  hesap kimliği taşıması, bugünkü düzeltme).
- "Sorun devam ediyor" talebi servise geri gönderdi; onaylanmış hak ediş
  ikinci kez yazılmadı.
- Tutarlılık ölçümü sekiz tur boyunca yalnız Y4'ün sahipsiz bildirimlerini buldu.

## Test verisi

Kayıtlar kullanıcının kararıyla yerinde bırakıldı. Sınama öncesi
tarayıcı verisinin yedeği: `D:\PAKSAN\_yedek\tarayici-verisi-2026-09-24-kullanici-sinamasi-oncesi.json`.
İndirilen dosyalar (Excel, servis formu PDF'i) Geri Dönüşüm Kutusu'na gönderildi.
