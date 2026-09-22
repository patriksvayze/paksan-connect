# Servisim · İşlerim ekranının eski hâli (22 Eylül 2026)

Kullanıcı İşlerim ekranının baştan tasarlanmasına izin verdi ve eski
düzenin yedeğinin "bir süre" tutulmasını istedi: "belki geri döneriz".
Bu klasör o yedek. Uygulamanın içine girmez, hiçbir derlemeye katılmaz.

## İçinde ne var

| Dosya | Ne |
|---|---|
| `ServisPanel.jsx` | `src/servis/ServisPanel.jsx` dosyasının yeniden tasarımdan önceki hâli. İşlerim ekranı (`Isler`, `Bugun`, `TalepKarti`, duyurular) bu dosyada. |
| `Kabuk.jsx` | `src/servis/Kabuk.jsx` — iş kartının iskeleti (`ListeKarti`), sekmeler, yüzen düğme. |
| `servis.css` | `src/servis/servis.css` — Servisim'in bütün stilleri (`.bugun`, `.is`, `.duyuru` blokları eski düzenin). |
| `islerim-ekrani-eski.png` | Eski ekranın tamamı, yukarıdan aşağı (telefon eninde). |
| `islerim-ilk-ekran-eski.png` | Uygulama açıldığında ilk görünen kısım. |

## Geri dönmek istenirse

En kolayı: Claude'a "İşlerim ekranını yedekteki eski hâline döndür"
demek. Elle yapılacaksa bu üç dosya `src/servis/` altına geri kopyalanır.

Dikkat: yedek alındıktan SONRA bu üç dosyaya başka işler için
dokunulduysa, düz kopyalamak o değişiklikleri de geri alır. Geri dönüş
bu yüzden dosyanın tamamını değil, yalnız İşlerim ekranının parçalarını
geri getirerek yapılmalı.

## Ne zaman silinir

Yeni düzen bir süre kullanılıp beğenilirse bu klasör silinebilir. Karar
kullanıcının; kendiliğinden silinmez.
