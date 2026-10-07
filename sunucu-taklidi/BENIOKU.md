# sunucu-taklidi

Bu klasör **hiçbir derlemeye girmiyor.** Ne `dist/`, ne
`dist-backoffice/`, ne `dist-servis/`. APK'nın içinde de yok.

Bugün iki şey var: **yedek parça kataloğu** (`parca-katalogu/`, aşağıda)
ve **kullanım kılavuzlarının PDF'leri** (`kilavuzlar/`, 29 Eylül 2026;
en altta).

## Neden var

Yedek parça kataloğu 538 parça ve 2 MB görsel. Bunu uygulamanın içine
gömmek üç yüzden yanlış:

- **Fiyatlar değişiyor.** Gömülü liste, ilk zamda yalan söylemeye
  başlar ve düzeltmenin tek yolu yeni sürüm yayınlamaktır.
- **APK şişer.** Uygulamanın tamamı bugün 7 MB civarında; katalog onu
  yüzde otuz büyütürdü.
- **Katalog PAKSAN'ın verisi, uygulamanın değil.** Yeni liste
  geldiğinde değişecek olan sunucudaki dosya, telefondaki uygulama
  değil.

Bu yüzden katalog **ağdan** çağrılıyor. Sunucu henüz yok (bkz.
CANLIYA-CIKIS.md); geliştirme sırasında onun yerini bu klasör tutuyor.

## Nasıl çalışıyor

`npm run dev` çalışırken geliştirme sunucusu bu klasörü
`/parca-katalogu/...` adresinden yayınlıyor (bkz. `vite.config.js` →
`katalogSun`). Uygulama gerçek bir HTTP isteği atıyor: yükleme
göstergesi, zaman aşımı ve hata ekranı gerçekten çalışıyor.

Derleme sırasında buradan hiçbir dosya kopyalanmıyor. Yani "gömülü
değil" bir tercih değil, ölçülebilir bir olgu: `npm run build:servis`
çıktısında bu dosyaların hiçbiri yok.

## Canlıya çıkarken

`src/config.js` → `PARCA_KATALOG.kok` alanına PAKSAN'ın sunucusundaki
adres yazılacak (örnek: `https://katalog.paksanmakina.com.tr/v1`).
Sunucudan beklenen tek şey bu klasörün aynısını yayınlaması:

    <kok>/katalog.json
    <kok>/gorseller/<parça kodu>.webp

Bir de yeni fiyat listesini kabul etmesi (aşağıda).

## Yeni fiyat listesi nasıl yayına giriyor (21 Eylül 2026'dan beri)

Personel backoffice'te **Yedek Parça Kataloğu** ekranından PAKSAN'ın PDF
fiyat listesini seçiyor. Liste onun tarayıcısında okunuyor
(`src/lib/fiyatListesiOku.js`), ekran neyin değiştiğini gösteriyor,
personel "Yayına Al" deyince liste buraya gönderiliyor:

    POST <kok>/yayinla

İşi `fiyat-listesi-yayini.mjs` yapıyor; sözleşme (ne gelir, ne döner,
neler reddedilir) dosyanın başında. Sunucu yazıldığında aynı sözleşmeyi
uygulayacak.

Yayından sonra bu klasörde:

| Yer | Ne |
|---|---|
| `parca-katalogu/katalog.json` | Yürürlükteki liste; `surum` her yeni listede bir artıyor, `yayinTarihi` ve `yayinlayan` yazılı |
| `parca-katalogu/gorseller/` | Yürürlükteki listenin görselleri |
| `parca-katalogu/kaynak.pdf` | Listenin okunduğu PDF (git'e girmez) |
| `parca-katalogu-arsiv/<sürüm>-<zaman>/` | Önceki listeler, olduğu gibi (git'e girmez). Hangi siparişin hangi fiyattan verildiğinin kanıtı |

Liste elle düzenlenmiyor: 538 satırlık bir liste elle yazılırsa ilk
güncellemede eskir. Önceden PDF komut satırından bir Python betiğiyle
okunuyordu (`tools/parca-katalogu.py`, 21 Eylül 2026'da kaldırıldı);
yeni okuyucunun aynı PDF'ten birebir aynı kataloğu verdiği her
`npm run dogrula`'da denetleniyor (`tools/fiyat-listesi-okuma-sinamasi.mjs`).

## Kullanım kılavuzları (29 Eylül 2026'dan beri)

Connect'te kılavuz, PAKSAN'ın basılı kullanım kılavuzunun PDF'i. Uygulamanın
içinde değil; sunucuda kılavuzların durduğu bir klasörden okunuyor
(kullanıcının kararı). Geliştirmede o klasör burası: `kilavuzlar/`, adresi
`/kilavuzlar/...` (`vite.config.js` → `kilavuzSun`, ayarı `src/config.js` →
`KILAVUZ.kok`). Çiftçi bir kılavuzu bir kez indiriyor; telefonda saklanıyor
ve internetsiz açılıyor (`src/lib/kilavuzPdf.js`).

Klasörde iki tür dosya var:

| Yer | Ne |
|---|---|
| `kilavuzlar/kilavuzlar.json` | Hangi kılavuzun hangi dosya olduğu (git'e girer) |
| `kilavuzlar/*.pdf` | Kılavuzların kendisi, 38 MB (git'e girmez) |

`kilavuzlar.json` her kılavuzu bir KODLA tanıyor; hangi ürünün hangi kodu
kullandığı markanın tablosunda (`src/data/icerik/kilavuzEslesme.js`). Bir
kaydın alanları:

    dosya         PDF'in adı; adında baskı tarihi var
    ad            { tr, en } ekranda görünen adı
    baski         baskı tarihi (YYYY-AA-GG)
    sayfa         sayfa sayısı
    boyut         bayt; çiftçi indirmeden önce görüyor
    diller        ["tr", "en"] — kılavuzda hangi dillerin bölümü var
    arizaSayfasi  arıza tablosunun başladığı sayfa; Destek'ten gelinince
                  kılavuz o sayfada açılıyor

**PDF'ler depoda değil.** Kaynağı `D:\PAKSAN\kaynaklar\kilavuzlar-onedrive\`;
buraya şu adlarla kopyalanıyor:

| Kaynak | Buradaki adı |
|---|---|
| `HAMMER KULLANIM KILAVUZU 20251201.pdf` | `hammer-kullanim-kilavuzu-20251201.pdf` |
| `PAKSAN BALYA KULLANIM KILAVUZU 20251201.pdf` | `kucuk-balya-kullanim-kilavuzu-20251201.pdf` |
| `ORKA KULLANIM KILAVUZU 20251205.pdf` | `orka-kullanim-kilavuzu-20251205.pdf` |
| `YUVARLAK BALYA KULLANIM KILAVUZU 20251129.pdf` | `yuvarlak-balya-kullanim-kilavuzu-20251129.pdf` |

Dosya yoksa `npm run dogrula` 8. kontrolü ("kullanım kılavuzu dosyaları")
düşüyor: listeyle klasörü karşılaştırıyor (boyut, sayfa sayısı, arıza
sayfası; `tools/kilavuz-dosyalari-denetimi.mjs`).

**Yeni baskı:** yeni PDF yeni adla konuyor (adındaki tarih değişiyor),
listedeki kayıt güncelleniyor. Telefondaki eski baskı yenisi indirilene
kadar açılmaya devam ediyor; ekran yenisinin çıktığını söylüyor.

**Yeni kılavuz:** PDF buraya, kaydı listeye, ürünü markanın tablosuna.
Hangi PDF'in hangi modele ait olduğunu PAKSAN doğrulamalı: yanlış kılavuz,
kılavuzsuzluktan kötü. `D:\PAKSAN\kaynaklar\ASD\` altında henüz bağlanmamış
kılavuzlar var (Ahtapot, Yengeç, ot toplama, yem karma); hangi modele ait
oldukları doğrulanınca eklenebilir.

**Canlıya çıkarken:** sunucu aynı klasörü yayınlayacak:

    <kok>/kilavuzlar.json
    <kok>/<dosya>.pdf

Adres https olmalı ve uygulamaya (https://localhost) CORS izni vermeli;
telefondaki uygulama başka adresten dosya okuyor.

