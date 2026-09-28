# Kullanıcı sınaması — 26 Eylül 2026 (ikinci sınama)

> Teknik sürüm (kod ve dosya adlarıyla). Yazılımcı olmayan okuyucu için
> aynı içerik sade Türkçeyle: `2026-09-26-ikinci-sinama-sade.md`.

İlk sınamanın (`2026-09-24-ilk-sinama.md`) bulguları 25 Eylül'de
düzeltildi; bu tur aynı dört kişiyle, aynı sekiz tur düzeniyle o
düzeltmeleri ve yenilerini sınadı: çiftçi Mehmet Kaya (Connect, 2 tur),
Selçuk Tarım Servisi teknisyeni (Servisim, 3 tur), Selin Aksoy
(backoffice, Servis rolü, 2 tur), Burak Demirtaş (backoffice, Yedek
Parça rolü, 1 tur). Oturumları kullanıcı açtı. Her turdan sonra
`tutarlilik.js` ile veri ölçüldü ve ajanın söylediğiyle karşılaştırıldı.

"Doğrulandı" = kayıt ya da kod okunarak kanıtlandı. "Ajan" = yalnız
ajanın ekranda gördüğü.

## İlk sınamanın bulguları — bu turda

| İlk tur | Bu turda | Kanıt |
|---|---|---|
| Y1 teklife makine yazılıyor | Düzeldi | TKF2609265859 makinesiz |
| Y2 gevşek seri denetimi | Düzeldi (Connect ve Servisim) | eksik hane reddedildi, O → 0 çevrildi |
| Y3 müşteri kartında elle işler yok | Düzeldi | SRV2609262281 Mehmet Kaya'nın kartında |
| Y4 servis siparişinden müşteriye bildirim | Düzeldi | sekiz turda sahipsiz bildirim artmadı (eski 2 kayıt duruyor) |
| Y5 atama dışı elle iş | Düzeldi (uyarı + işaret) | SRV2609262281 "başka servis", SRV2609269186 "servissiz"; onay penceresinde görüldü |
| O1 başarı ekranı KDV hariç | Düzeldi | başarı ekranı ve kart 76 TL |
| O2 kargodan sonra iş Yedek Parça'dan düşüyor | Düzeldi | SRV2609243039 listede kaldı, takip no düzeltildi |
| O5 aynı makinede ikinci talep | Düzeldi | Connect açık talep kartı, ekleme tek kayıt |
| O6 ortak backoffice oturumu | Düzeldi | dört sekme yenilendi, herkes kendi kimliğinde kaldı |
| O8 sessiz iptal | Düzeldi | kilit nedeni yazıyor |
| O9 kaldırılan talep geri gelmiyor | Düzeldi | 7. turda iki yön de kalıcı |
| 03:00 randevu | Düzeldi | `saatBelirtildi: false`, gün olarak |
| Yetkisiz rolde atama | Düzeldi | Yedek Parça: "Servis atama yetkiniz yok…" |
| Boş görüş, bakiye pasif nedeni, sayaçlar, telefon biçimi, atama bildirimi, kalem iptali adedi | Düzeldi | ajan + kayıt |

## Yüksek

| # | Bulgu | Nerede | Kanıt |
|---|---|---|---|
| Y1 | **Yeniden açılan işte geçen ziyaretin kaydı yeni ziyaretin formunu dolduruyor.** Müşteri "Sorun Devam Ediyor" deyince talep açılıyor ama son servis kaydı yerinde kalıyor; Servisim kaydı ondan dolduruyor. Parça isteğinde görünmeyen "yapılan iş, km, süre" eski değerle kayda gitti ve PAKSAN'a öyle göründü; "Parçayı Taktım" 20 km / 1 saat / 330 TL ile, üçüncü ziyaret 35 km / 2 saat ile dolu açıldı. Fark edilmezse hak edişe eski rakam yazılır. Aynı nedenle yeniden açılan işte "Randevu" düğmesi yok ve iş "Yeni" sekmesine düşmüyor | Servisim `ServisKapanisi.jsx` (form `talep.servisKaydi`'den doluyor), `TalepDetay.jsx → randevuVar`, `isDurumu.js → dokunulmamis` | Doğrulandı (SRV2609243039; 2., 5. ve 8. tur) |

## Orta

| # | Bulgu | Nerede | Kanıt |
|---|---|---|---|
| O1 | Servisi atanmamış makine seçilince servis talebi formu açık kalıyor; çiftçi her şeyi dolduruyor, "Gönder"de geri çevriliyor. Açık talepte formun yerine kart çıkıyor, burada çıkmıyor | Connect `RequestForm.jsx` (yalnız seçim kutusunun altında ipucu) | Doğrulandı (Hammer, 1. tur) |
| O2 | Müşterinin parça talebi kapandıktan sonra kargo takip numarası eklenemiyor ya da düzeltilemiyor; personel unutursa çiftçi takip numarası alamıyor. Servisin garanti parçasında "Kargo Bilgisini Düzelt" var | Backoffice Talepler, müşteri parça talebi | Doğrulandı (YPR2609268517: "Aras Kargo", takip no boş) |
| O3 | Kayıtlı Makineler'de "Servis Atanmamış" süzgeci açıkken servis atanınca açık pencere eski hâlde kalıyor ("Bakan servis —"); personel atamanın tutmadığını sanıyor | Backoffice `Makineler.jsx` (pencere süzülmüş listeden okuyor) | Doğrulandı (HMR202504417) |
| O4 | Servisim'de "Kaydı Gönder"e çift dokunulunca ikinci dokunuş, hemen açılan listede o noktaya gelen başka işin kartını açıyor | Servisim kayıt gönderimi | Ajan (kayıt tek yazıldı) |

## Düşük

- Connect: fiyat teklifinin ayrıntısında çiftçinin cevapladığı ürün türü, arazi ve traktör gücü görünmüyor (backoffice görüyor).
- Connect: servisin telefonla açıp çiftçinin hesabına bağladığı iş "Talebiniz" diye görünüyor; talebi servisin açtığı yazmıyor (SRV2609262281).
- Connect: talep geçmişinde "parça bekleniyor" iki kez yazıyor; ikincisi aslında "parça yola çıktı" (backoffice ikisini ayırıyor).
- Connect: "Sorun Devam Ediyor" kartında açıklaması boş eski bildirim yalnız tarihiyle duruyor; çiftçi onu kartın tarihi sandı.
- Servisim: elle kayıtta seri numarası düzeltilince "Seri numarası tanınmadı" uyarısı silinmiyor (öteki kutular siliyor).
- Servisim: indirim dökümü olmayan eski siparişte toplam kartı "KDV dâhil" demiyor, satırlar KDV hariç.
- Servisim: kurulum talebinde "Servis Talebi Nedeni" boş geliyor (Connect kurulumda açıklama sormuyor); servis yazmadan kayıt gönderemiyor.
- Backoffice: servis siparişinin iptal nedeninde "Bu yazı müşterinin uygulamasında aynen görünüyor" yazıyor; siparişin müşterisi yok.
- Backoffice: iptal edilmiş talepte kilit uyarısı "Bu talep kapandı" diyor.
- Backoffice: kapanmış talep numarayla aranınca varsayılan "Açık olanlar" süzgeci yüzünden "Talep yok" çıkıyor.
- Backoffice: Servis ve Yedek Parça rolü Servisler ekranında düzenleme yapamıyor ama ekran nedenini yazmıyor; iki rol servisin bakiyesini hiçbir yerde göremiyor.
- Servisim: müşteri notundaki ek düğmesi yalnız dosya boyutunu yazıyor ("5 KB") — ajan, doğrulanmadı.

## Karar bekleyen sorular

**Karara bağlandı (28 Eylül 2026):** 1. "Uyarsın" — Servisim'in Kayıt Aç
ekranı uyarıyor, engellemiyor (AK-31). 2. "Görsünler" — bakiye Servisler
listesinde, hak ediş bölümünde ve bakiyeden ödenen siparişte.

- **Servisin onay bekleyen işi olan makinede yeni iş.** Servisim uyarmıyor
  (onay bekleyen iş "bitmiş" sayılıyor, bilerek); PAKSAN onayda "aynı
  makinede açık iş" işaretini görüyor. Ajan bunu kötüye kullanılabilir
  buldu (SRV2609269186 onaydayken SRV2609269874 açıldı). Servisim de
  uyarsın mı?
- **Servis ve Yedek Parça rolü servisin bakiyesini görsün mü?** Hak edişi
  onaylayan ve bakiyeden ödenen siparişi gönderen personel, servisin
  bakiyesini yalnız talep ayrıntısındaki satırlardan çıkarabiliyor.

## Yanlış alarmlar (uygulama hatası değil)

- **"Taleplerim'de Kaldır ve Geri Al kalıcı olmuyor"** (1. tur, ajan
  yüksek dedi). Çiftçinin sekmesi saatlerce süren kod değişikliklerinden
  eski ve yeni modül karışıklığıyla kalmıştı ("useApp bir AppProvider
  içinde kullanılmalı" hatası, hata sınırı ekranı sıfırlayıp değişikliği
  atıyordu). Sekme yenilenince iki yön de çalıştı; 7. turda çiftçi de
  doğruladı. README'ye "sınamadan önce sekmeler yenilenir" eklendi.
- **"Fareyle hiçbir düğmeye basılamıyor"** (5. ve 8. tur). Tarayıcı paneli
  küçük; telefon boyu küçültülerek çiziliyor ve ajan sayfanın piksellerini
  ekran koordinatı sandı. Masaüstü ve telefon boyunda fareyle denendi,
  çalışıyor.
- **"Aynı işe iki kez ödeme yazılmış"** (tutarlılık ölçümü, 6. tur).
  SRV2609243039'un iki alacağı iki ayrı ziyaretin onayı (330 TL 24 Eylül,
  600 TL 26 Eylül). Ölçüm arşivdeki ziyareti saymıyordu; düzeltildi.

## Düzeltmeler (aynı gün)

Bütün bulgular düzeltildi; karar bekleyen iki soru açık. Ayrıntı
CLAUDE.md → "26 Eylül 2026 ikinci kullanıcı sınamasının düzeltmeleri".

| Bulgu | Düzeltme | Sınaması |
|---|---|---|
| Y1 | `lib/servisKaydi.js → buZiyaretinKaydi`, `talepNedeni`; parça isteği sorulmayan alanları yazmıyor | AK-35 (34 iddia) |
| O1 | Connect formunun yerinde "servis atanmadı" kartı | ekran turu C-33 |
| O2 | `veri.js → musteriKargosunuGuncelle`, backoffice "Kargo Bilgisini Gir/Düzelt" | AK-36 (18 iddia) |
| O3 | pencere süzülmemiş listeden okuyor | — (tek satır) |
| O4 | Servisim ekran değişince 350 ms dokunuş yutuyor | ekran turu X-07 |
| Düşükler | teklif cevapları, "Talebi açan", "Parça yola çıktı" (AK-35), iptal kilidi (AK-08), numarayla arama, yetki cümlesi, seri uyarısı, "(KDV dâhil)", "Sorun Devam" kartı, fotoğraf düğmesinin adı, iptal nedeninin kime göründüğü | — |

Her yeni iddia kod bilerek bozularak düşürüldü (liste
`tools/ekosistem-sinamasi.mjs` ve `tools/ekosistem-turu.mjs`
başlıklarında). Eşleme denetimi üç kör noktayı gösterdi ve kapandı:
önceki ziyaretin alanları, "Sorun Devam" kaydı ve `servisKaydi.sonuc`.
Yeni Türkçe metinler Codex'ten geçti (18 metin, 4'ü değişti). `npm run
dogrula` on üç kontrolün hepsi temiz: 36 senaryo, 1.083 iddia; ekran turu
82 denetim.

## Test verisi

Kayıtlar yerinde bırakıldı. Mehmet Kaya'nın hesabındaki il/ilçe
(Balıkesir/Bandırma, ilk turdan) adresiyle (Konya Selçuklu) tutmuyor ve
"makinenin son servis adresi" üzerinden yeni taleplere taşınıyor
(SRV2609268377); bu uygulama hatası değil, eski verinin izi.

## Çalıştığı görülenler

- Para her adımda tuttu: Konya servisinin bakiyesi 1.476 → 1.400 (bakiyeden
  gönderilen sipariş 76) → 3.626 (hak edişler 600 + 204 + 1.422);
  reddedilen 1.428 yazılmadı; iptal edilen 600'lük sipariş ayrılan tutardan
  çıktı; eksik gönderilen faturalı sipariş 1.608 → 288. Servisim'in hareket
  listesi her turda bakiyeye eşit toplandı.
- Çift dokunma tek kayıt yazdı: not, ödeme onayı, hak ediş onayı, parça
  isteği, servis kaydı.
- Düzeltme gerekçesiz kaydedilmedi; iptal nedeni seçilmeden iptal olmadı.
- Servis ataması: yanlış atama düzeltilince çiftçiye "Servisi Değişti"
  gitti; hesabı olmayan müşteriye bildirim yazılmadı; sayaç 6 → 4.
- Rol sınırları: Servis rolü teklifi ve müşteri parça talebini görmüyor;
  Yedek Parça rolü atama yapamıyor, nedenini okuyor.
- Tutarlılık ölçümü sekiz turda uygulamadan kaynaklı yeni bir ihlal
  bulmadı.
