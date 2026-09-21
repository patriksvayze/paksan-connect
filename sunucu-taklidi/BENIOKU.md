# sunucu-taklidi

Bu klasör **hiçbir derlemeye girmiyor.** Ne `dist/`, ne
`dist-backoffice/`, ne `dist-servis/`. APK'nın içinde de yok.

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
