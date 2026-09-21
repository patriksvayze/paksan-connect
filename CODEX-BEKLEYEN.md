# Codex'i bekleyen Türkçe metinler

**ŞU AN KUYRUK BOŞ (19 Eylül 2026).** Bekleyen metin yok;
`npm run dogrula` 12. kontrol ve `node tools/vt/denetle.mjs` temiz.

Dosya SİLİNMEDİ, çünkü anlattığı şey bir iş değil bir YÖNTEM ve o
yöntem tekrar gerekecek: Codex'in kullanım sınırı 17 ve 19 Eylül'de
iki kez doldu. Beş kaynak dosya, `tools/dogrula.mjs` ve README bu
dosyayı adıyla gösteriyor; silinseydi hepsi kırık bağa bakardı.

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
<!-- /dosyalar:tekdil -->
