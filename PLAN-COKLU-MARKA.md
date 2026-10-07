<!-- 14.09.2026 plan modunda hazırlandı; 16.09.2026 plan dosyasından buraya taşındı. Bekliyor: marka verileri gelmeden uygulanmaz. Veritabanı tarafı VERITABANI.md tasarımında zaten karşılanıyor (marka veri olarak). -->

> **5 Ekim 2026 notu.** Ürün yalnız PAKSAN'ın; başka firmaya kurulum için
> yapılan marka katmanı (`src/marka/`, kapı, hesaplanan ad) söküldü. Bu plan
> PAKSAN'ın kendi alt markaları için olduğundan beklemede kalıyor (kullanıcı:
> "Beklemede kalsın"), ama içindeki dosya yolları ve "bir derleme = bir
> firma" varsayımı eskidi. Uygulanacağı gün yeni düzene göre yeniden
> doğrulanmalı (CLAUDE.md → 5 Ekim 2026 bölümü).

# Çok markalı ekosistem — PAKSAN + Globale + Gallignani

## Önce (bu plandan bağımsız, plan modundan çıkınca ilk iş)

Kullanıcının 14.09 isteği, plan modu yüzünden bekliyor:
1. `dongu-durumu.json` → `duraklatildi: true`. Süren tur yarım değişikliği yedekten geri alıp çıkar.
2. `destek-gelistirme-dongusu` ve `destek-dongu-zinciri` görevleri kapatılır.
3. **17.09.2026 Perşembe 09:00** için tek seferlik hatırlatma kurulur. Döngü hâlâ duraklatılmışsa kullanıcıya haber verir, kendisi başlatmaz.

## Bağlam

Bugünkü proje tek bir ürün markası üzerine kurulu. `src/marka/` katmanı "başka bir firmaya kurulabilsin" diye yazıldı (MARKA-DEVIR.md): **bir derleme = bir firma**. PAKSAN'ın iki alt markası daha var: Globale ve Gallignani. Bu markaların makinelerini satan bayiler, kullanan müşteriler ve bakan servisler ekosisteme girecek.

Kullanıcının kararları (14.09.2026):
- **Şirket tek.** Üç markada da makineyi PAKSAN Makina satıyor, parçayı PAKSAN gönderiyor, hak edişi PAKSAN ödüyor. Banka hesabı, KVKK veri sorumlusu ve uygulama sahibi aynı.
- **Uygulama tek.** PAKSAN Connect üç markayı da gösterir; her makine kendi markasının adı, logosu ve kılavuzuyla görünür.
- **Servis ve bayi markaya göre yetkili.**
- **Bir müşteride birden çok marka** olabilir.

13 ajanlık salt okunur envanter (sonuç: `tool-results/b2qtjy1q2.txt`) tek markaya bağlı yaklaşık 110 varsayım buldu.

Kodda doğrulanan en kritik üç bulgu:
- `serial.js:90` `GARANTI_YIL = 2`, `kimlik.js:69` `garantiYil: 2`. Garanti süresi iki yerde ve tek değer.
- `servisAtama.js:54-71` `makineninServisi` markaya bakmıyor; bayinin ilk servisini seçiyor.
- `ad.js` `ekle('GALLIGNANI','a')` sonucu **"GALLIGNANI’ya"** çıkıyor (yanlış; doğrusu ’ye).

**Temel ayrım (toplu yeniden adlandırma yok):**
- **İşletmeci şirket:** bugünkü `MARKA`, `SIRKET`, `markaEk`, `{marka}`. "PAKSAN'a başvurun", fatura, IBAN, KVKK, hak ediş ödeyen, `sahip:'paksan'`. **Tek kalır, anlamı değişmez.**
- **Ürün markası:** yeni `MARKALAR` kaydı. Katalog, logo, kılavuz, seri kuralı, garanti, parça listesi, servis ve bayi yetkisi buna bağlanır.

**İki ilke:**
- **Veri gelmeden marka kapalı.** Globale ve Gallignani `aktif: false` ve bütün alanları `null` başlar. Uydurma veri yok (12 Eylül'deki uydurma fiyat listesi dersi). Yalnız PAKSAN açıkken her ekran bugünküyle birebir aynı davranır.
- **Eski kayıt PAKSAN sayılır.** Marka alanı olmayan kayıt, okunurken tek bir yardımcıdan geçer ve `'paksan'` değerini alır; depodaki veri toplu yeniden yazılmaz. Yeni yazılan her kayıt markayı açıkça taşır.

## Faz 1 — Veri modeli ve doğrulama

- **Yeni `src/marka/katalog/markalar.js`**, yalnız kapıdan (`src/marka/index.js`) dışarı verilir:
  - Her marka: `{ id, ad, okunus, aktif, logo, amblem, site, siteKisa, garanti:{yil, baslangic, asinmaAnahtari}, seri:{kural}, parca:{kaynak, servisIskonto}, kilavuz:{paket, dil}, kaynakNotu }`
  - PAKSAN bugünkü değerlerle dolar (`seri.kural: 'onekYilSira'`, `garanti.yil: 2`). Öteki iki marka `null` alanlarla gelir.
  - Yardımcılar: `markaGetir(id)`, `aktifMarkalar()`, `kaydinMarkasi(kayit)`, `markaYetkiliMi(servisYaDaBayi, markaId)`.
- **Kayıtlar:**
  - `products.js`: her ürüne `marka`. Yeni markaların ürün kimlikleri marka önekli olacak.
  - Makine kaydı (`src/lib/makineKaydi.js` `makineKaydet` / `servisMakineKaydi`) `marka` taşır; makinenin kimliği **marka + seri** olur.
  - `servisler.js` ve `bayiler.js`: `markalar: []` alanı. Alan yoksa `['paksan']` sayılır.
  - Talep, hak ediş, cari hareket, parça siparişi ve duyuru hedefi `marka` taşır; değer makineden alınır.
- **Okuma varsayılanı** şu noktalarda uygulanır: `icerikListe` (`src/lib/icerikDeposu.js`), `veri.js` okuyucuları, `AppState.jsx` makine yükleme. Kayıt yolları (`servisleriYaz`, `bayileriYaz`) alanı açıkça yazar.
- **Türkçe ek düzeltmesi** (`src/marka/ad.js`): `ekle(ad, hal, okunus = ad)`. Ünlü uyumu `okunus` üzerinden hesaplanır, ek `ad`a eklenir. `tools/marka-ek-testi.mjs` genişletilir: GALLIGNANI → ’ye/’nin, Globale → ’ye/’nin; PAKSAN sonuçları değişmez.
- **Yeni sınama** `tools/urun-marka-testi.mjs`: varsayılan marka, yetki kontrolü, marka+seri kimliği. `dogrula` 8. kontrole bağlanır.
- **`dogrula`ya yeni bölüm "Ürün markası kaydı"** (veritabanı eşleşmesi 13 olursa bu 14):
  - kimlikler benzersiz, varsayılan marka aktif;
  - her ürünün `marka` değeri geçerli, her servis ve bayinin `markalar` değerleri geçerli;
  - aktif bir markanın zorunlu alanları (`ad`, `logo`, `garanti.yil`, `seri`, `kaynakNotu`) dolu;
  - pasif markanın ürünü vitrinde yok.
  CLAUDE.md'deki kontrol sayısı güncellenir.

## Faz 2 — Ağ: yetki, atama zinciri, talep kapısı

- **`servisAtama.js` `makineninServisi`:**
  - Elle atanmış servis yalnız o markaya yetkiliyse kabul edilir. Yetkisizse `uyari:'yetkisizMarka'` ile döner; personel çakışmayı görür.
  - Bayi zinciri: `bayininServisleri(bayiId, marka)` ile hem bayinin hem servisin o markaya yetkili olduğu kesişim alınır.
  - `talebinServisleri` (coğrafi öneri) ve `musterininServisleri` marka ve makine bazında çalışır.
- **Talep kapısı makine bazında** (`RequestForm.jsx:69, 711`). CLAUDE.md kuralı korunur: seçilen makinenin markasına yetkili servis yoksa talep **açılmaz**, uygulama müşteriye PAKSAN'la iletişime geçmesini söyler. Yönlendirme yapılmaz.
- **`Home.jsx`:** servis kartı makine gruplarına göre gösterilir. Tek servis varsa bugünkü tek kart aynen kalır.
- **Backoffice:**
  - `Servisler.jsx` ve bayi ekranında marka çoklu seçimi.
  - `Makineler.jsx`: marka sütunu ve süzgeci. Atama listesinde yetkisiz servis **seçilemez**; önce servise marka yetkisi verilmesi gerekir ("PAKSAN kime iş verdiğini bilmek zorunda").
- **Servisim:**
  - `ElleKayit.jsx`: teknisyen önce yalnız yetkili olduğu markalardan birini seçer, sonra ürünü.
  - Aynı marka ve seriyle kayıt varsa yeni kayıt açılmaz, var olana bağlanır. Bu, doğrulayıcının bulduğu mükerrer kayıt hatasını da kapatır.
  - `Bayilerim.jsx`: her bayinin markaları gösterilir.
- **Sınama** `tools/servis-atama-testi.mjs`: iki servisli bayi ve farklı markalar; yetkisiz elle atama; marka alanı olmayan eski kayıt.

## Faz 3 — Seri numarası ve garanti

- **`src/lib/serial.js`:**
  - Tek biçim yerine `marka.seri.kural` anahtarlı bir kural tablosu kurulur. `'onekYilSira'` bugünkü koddur.
  - `matchProduct(raw, markaId)` yalnız o markanın aktif ürünlerinde arar.
  - `GARANTI_YIL` silinir. `warrantyStatus(year, t, markaId)` süreyi markadan okur; `null` ise durum "bilinmiyor" olur.
  - `kimlik.js` `garantiYil` bir sürüm boyunca eski ad olarak kalır, sonra silinir.
- **Çağrı yerleri:**
  - `AddMachine.jsx`: seriden önce marka adımı; örnek seriler markaya göre.
  - `MachineDetail.jsx`, `ElleKayit.jsx`, Servisim `ServisKapanisi.jsx` ve `TalepDetay.jsx`, backoffice `Makineler.jsx`.
  - `Talepler.jsx:801-808, 1829-1832`: yerel yıl ayıklayıcı kaldırılır, `lib/serial` kullanılır.
- **Aşınma parçası istisna metni:** `detay.garantiMetni_<asinmaAnahtari>` anahtarı. Metni olmayan marka için genel bir cümle kullanılır (Codex yazar).
- **Sınama** `tools/seri-testi.mjs`: PAKSAN örnekleri bugünkü gibi çözülüyor; pasif marka hiç eşleşmiyor; aynı seri iki markada iki ayrı kimlik.

## Faz 4 — Yedek parça (markaya göre)

- **Katalog yolu:** `PARCA_KATALOG.kok` → `${kok}/${marka}/katalog.json`. PAKSAN taşınana kadar bugünkü köke düşer.
- **`parcaKatalogu.js`:**
  - Bellekteki tek kopya, marka anahtarlı bir `Map` olur; `katalogGetir(marka)`.
  - Parçanın kimliği markalar arasında `marka:kod` olur: sepet (`ParcaSec.jsx`, `veri.js` `servisParcaSiparisi`), rapor ve görsel anahtarları.
  - `fiyatGoruntusu` hem görüntüye hem her satıra `marka` yazar.
- **Fiyat kuralları:**
  - `parcaGruplari.js` köprüsü markaya göre olur; veri gelene kadar öteki markalar boştur, yani parça ekranı çıkmaz.
  - Para birimi ve KDV şirket değeri olarak kalır; markada isteğe bağlı üzerine yazma alanı açılır.
  - Servis iskontosu `parca.servisIskonto ?? 0.3`.
- **Tek talep ya da sipariş tek marka taşır**; karışık sepet olmaz.
- **`src/lib/fiyatListesiOku.js`:** marka seçeneği (liste okunurken hangi markanın kataloğuna gideceği; 21.09.2026'ya kadar bu iş `tools/parca-katalogu.py`'deydi).
- **`dogrula` 9. kontrol:** her marka klasörü için ayrı çalışır. Fiyatlı bir katalog, markada `kaynakNotu` yoksa **doğrulamayı düşürür** (uydurma fiyat engeli).

## Faz 5 — Ekranlar, metin, logo, katalog

- **Metin yer tutucuları:** `i18n/index.jsx`'e `makineDegerleri(markaId)` eklenir: `{makineMarkasi, makineMarkasiYi … makineMarkasinin, makineSitesi}`. Çağıran bu değerleri geçer.
  - Ürün markası anlamındaki anahtarlar `{marka}` yerine bunları kullanır: `detay.garantiMetni`, `detay.teknikKaynak`, `guvenlik.giris`, `destek.asistanNot`, `sohbetKimlik`, `konuDisi`, seri yardım metinleri.
  - Şirket anlamındaki anahtarlar olduğu gibi kalır.
  - Her değişen Türkçe metin Codex'ten, İngilizcesiyle birlikte geçer. Kontrol 1 ve 12 bunu yakalar.
- **Logo:** `<UrunMarkasiLogo marka>`. Logo yoksa marka adını yazıyla gösterir, PAKSAN logosuna düşmez. Üst çubuk (`Chrome.jsx`) şirket rozetini korur; makine, ürün ve kılavuz ekranlarında modelin yanında ürün markası görünür.
- **`Catalog.jsx`, `ProductDetail.jsx`, vitrin:** marka seçicisi yalnız birden çok marka aktifken görünür. Kategoriler ortak kalır.
- **İçerik süzme:** `kilavuzEslesme.js`, `kilavuzVeri.js`, `guvenlik.js`, `rehber.js`, `talepAlanlari.js` ürünün markasına göre süzülür. Markası olmayan içerik PAKSAN sayılır.
- **`TeknikOzellikler.jsx`:** kaynak olarak markanın sitesi gösterilir.
- **`dogrula` 6. kontrol:** `MARKALAR`daki bütün adları motor kodunda arar (CSS ve HTML dahil).

## Faz 6 — Duyuru ve geri çağırma

- `duyuruHedef.js` şemasına `hedef.markalar`.
  - Müşteri tarafı: makinelerinden biri hedef markadaysa duyuru görünür.
  - Servis tarafı: `markalar` ve `urunler` uygulanır; geri çağırma yalnız o markaya yetkili servislere gider.
- Backoffice duyuru ekranına marka seçimi.
- `tools/duyuru-hedef-testi.mjs`'e marka durumları eklenir.

## Faz 7 — Raporlar ve hak ediş

- `Raporlar.jsx`: marka süzgeci ve markaya göre gruplama.
- Hak ediş ve cari: `Hakkedis.jsx`, `veri.js` hak ediş onayı, `excel.js` dışa aktarımına marka sütunu. Bakiye servis başına kalır; karşı taraf tek şirket.
- PAKSAN-yalnız toplamlar değişiklikten önceki raporla birebir aynı olmalı.

## Faz 8 — Destek asistanı (RAG) — Codex'in işi, veri gelince

- CLAUDE.md gereği Claude kodu yazmaz. İş `ORTAK-DEFTER.md` İSTEK'i ve kuyruk işi olarak Codex'e verilir:
  1. `kilavuzlar.json`'a `marka` ve `dil`; belge kimliği `marka/dosya`.
  2. Arama kapsamı `(marka, ürün)`; model adı eşleşmesi marka içinde kalır. İstek API'si markayı taşır (`destekAsistani.js`).
  3. Persona "PAKSAN Makina destek asistanı" (şirket) kalır; isteme makinenin markası eklenir.
  4. Dil süzgeci kılavuzun diline göre çalışır. `niyet.mjs`'e marka kelimeleri eklenir.
  5. Round-4 kilidi açılır, çok markalı sette eşik yeniden ayarlanıp yeni kilit alınır.
- **Kapı:** en az bir yeni markanın kılavuzu gelmeden başlamaz. Döngü şu an zaten duraklatılıyor.

## Faz 9 — Belgeler

- **CLAUDE.md:** "şirket (MARKA/SIRKET) ile ürün markası (MARKALAR)" bölümü, marka açma kontrol listesi, yeni doğrulama kontrolleri.
- **MARKA-DEVIR.md:** kavram "işletmeci firma devri" olarak yeniden adlandırılır; "yeni ürün markası ekleme" bölümü eklenir; eskimiş satırlar (bayi paneli, Servisim yok) düzeltilir.

## Marka açma kontrol listesi (veri geldiğinde)

Her madde kaynak notuyla gelir:
1. model listesi
2. seri kuralı ve sınama örnekleri
3. garanti süresi, başlangıç esası ve istisna metni
4. logo dosyası
5. markaya yetkili servis ve bayiler
6. (isteğe bağlı) parça fiyat listesi ve kılavuz PDF'leri

Sonra `aktif: true`, `npm run dogrula` (aktif marka eksik alanla açılamaz), üç derleme ve tarayıcı turu.

## Kullanıcıdan istenecek veri (plan beklemez, marka o zamana kadar kapalı)

Her iki marka için: model listesi, seri numarası biçimi (örnek plakalar), garanti süresi ve başlangıcı, logo, yetkili servis ve bayi listesi, parça fiyat listesi (para birimi, KDV), kullanma kılavuzları ve dilleri. Gallignani'nin Türkçe okunuşu (ek için: "Gallignani’ye" varsayılıyor).

## Varsayılan kararlar (kullanıcı aksini demedikçe)

- Mevcut servis ve bayilerin yetkisi: yalnız PAKSAN.
- Bayi → servis bağı ayrıca markaya göre tutulmaz; iki yetkinin kesişimi alınır.
- Yetkili servisi olmayan makinede talep açılmaz (CLAUDE.md'deki bugünkü kural).
- Backoffice'te yetkisiz servis atanamaz.
- Bir talep ya da sipariş tek marka taşır.
- Personel rolleri markaya göre sınırlanmaz.
- Parça iskontosu %30, para birimi TL, KDV şirket değeri.
- Kılavuz dili: TR+EN kabul; yalnız İtalyanca olan kılavuz çevrilene kadar indekslenmez.

## Doğrulama (her faz sonunda)

- `npm run dogrula` (yeni sınamalar 8. kontrolde, yeni bölüm).
- `npm run build`, `build:backoffice`, `build:servis`.
- Yalnız PAKSAN aktifken:
  - Home, MachineDetail, AddMachine, Catalog, RequestForm, Makineler, Servisler, ElleKayit, Raporlar ekran görüntüleri değişmemeli (`ekran-dogrulama`);
  - parça toplamları ve rapor toplamları önceki kayıtla aynı olmalı.
- Yeni marka davranışı, **commit edilmeyen** yerel bir geliştirme ayarıyla sahte-aktif bir markada tarayıcıda sınanır: atama süzgeci, talep kapısı, mükerrer kayıt engeli, logo, katalog seçicisi, duyuru hedefi. Görsel değişikliklerde son tur `ui-dogrulama`.
- Türkçe metinler Codex'ten geçmeden faz bitmiş sayılmaz (kontrol 12).
