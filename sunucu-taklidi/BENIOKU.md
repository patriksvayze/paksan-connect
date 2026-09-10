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

## Katalog nasıl üretiliyor

PAKSAN'ın bastığı fiyat listesi PDF'inden:

    pip install pymupdf pillow
    python tools/parca-katalogu.py "<liste.pdf>"

Yeni liste geldiğinde aynı komut yeniden çalıştırılıyor. Elle
düzenlenmiyor: 538 satırlık bir liste elle yazılırsa ilk güncellemede
eskir.
