/* ==========================================================================
   PAKSAN makine gövde rengini ürün fotoğraflarından ölçer

   NEDEN VAR

   Uygulamanın lacivertiyle MAKİNENİN rengi ayrı şeyler. Lacivert marka
   ve arayüz rengi (logo, başlık çubuğu, düğmeler); makinenin kendisi
   turuncu. Üretilen çizimlerde makineler lacivert boyanmıştı — PAKSAN
   makinesi öyle görünmüyor.

   Renk tahmin edilmedi, ölçüldü: `src/assets/urunler/`
   altındaki 15 ürün fotoğrafı taranıp doygun pikseller ton kovalarına
   toplandı.

   4 Eylül 2026 ölçümü (45.479 piksel):

       10°  #E15927   29.872 piksel
       20°  #E16C20   15.607 piksel
       ────────────────────────────
       ağırlıklı ortalama:  #E16025   ← MAKİNE GÖVDE RENGİ

   İKİ TURUNCU AYRI ŞEYDİR, BİRİ ÖTEKİNE "DÜZELTİLMEZ".

   Buradaki **#E16025** fotoğraftan ÖLÇÜLEN makine gövde rengidir;
   bir veri noktasıdır, ekranda hiçbir yerde kullanılmıyor. Arayüzün
   turuncusu ise `src/styles/renkler.css` içindeki
   `--marka-turuncu: #e8641a` — o bir TASARIM kararı, beyaz yazıyla
   kontrast ölçülerek seçildi. İkisi yakın tonlar olduğu için birini
   öteki sanıp eşitlemek kolay; eşitlenirse ya çizimlerin rengi
   ölçümden kopar ya da düğme kontrastı bozulur. Ölçüm değişirse
   güncellenecek yer bu dosyanın yorumu ve çizim notudur
   (`src/data/icerik/cizimler.js`), renk token'ı değil.

   BU SAYI SABİT DEĞİL. Bugünkü fotoğraflar şirketin sitesinden alındı
   ve sıkıştırılmış JPEG; gerçek stüdyo çekimleri geldiğinde
   (bkz. CANLIYA-CIKIS.md → Aşama 0) bu betik yeniden çalıştırılıp
   sayı güncellenmeli.

   Kullanım:  node tools/marka-rengi.mjs

   Fotoğraflar beyaz zeminli stüdyo çekimi. Beyaz/gri/siyah pikselleri
   atıp geriye kalan DOYGUN renkleri sayıyoruz; en çok tekrar eden ton
   makinenin gövde rengi oluyor.
   ========================================================================== */

import sharp from 'sharp'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Proje klasörü sabit yazılmıyor: depo nereye taşınırsa taşınsın çalışsın.
const KLASOR = join(
  dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'urunler',
)

function hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max / 255 }
}

const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

const toplam = new Map()

for (const dosya of readdirSync(KLASOR).filter((f) => f.endsWith('.jpg'))) {
  const { data, info } = await sharp(join(KLASOR, dosya))
    .resize(240, 240, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const kanal = info.channels
  const sayim = new Map()

  for (let i = 0; i < data.length; i += kanal) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const { h, s, v } = hsv(r, g, b)
    /* Doygunluğu düşük (gri/beyaz) ve çok koyu pikseller atlanıyor */
    if (s < 0.45 || v < 0.25) continue
    /* 10 derecelik kovalara topluyoruz */
    const kova = Math.floor(h / 10) * 10
    const k = sayim.get(kova) || { n: 0, r: 0, g: 0, b: 0 }
    k.n++; k.r += r; k.g += g; k.b += b
    sayim.set(kova, k)
  }

  const sirali = [...sayim.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 2)
  const yaz = sirali.map(([kova, k]) =>
    `${String(kova).padStart(3)}° ${hex(k.r / k.n, k.g / k.n, k.b / k.n)} (${k.n})`
  )
  console.log(dosya.padEnd(22), yaz.join('   '))

  for (const [kova, k] of sayim) {
    const t = toplam.get(kova) || { n: 0, r: 0, g: 0, b: 0 }
    t.n += k.n; t.r += k.r; t.g += k.g; t.b += k.b
    toplam.set(kova, t)
  }
}

console.log('\n=== TÜM ÜRÜNLERDE TOPLAM ===')
for (const [kova, k] of [...toplam.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5)) {
  console.log(`${String(kova).padStart(3)}°  ${hex(k.r / k.n, k.g / k.n, k.b / k.n)}  ${k.n} piksel`)
}
