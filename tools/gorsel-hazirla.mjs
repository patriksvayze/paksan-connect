/* ==========================================================================
   Üretilen görseli uygulamaya hazırlar

   Higgsfield 2K PNG döndürüyor — dosya başına 4-5 MB. O boyut APK'ya
   giremez: uygulamanın tamamı bugün 7 MB civarında ve tek bir boş
   durum çizimi onu ikiye katlardı.

   Bu betik küçültüp sıkıştırıyor. İki hedef var:

     boş durum çizimi  → 720 piksel genişlik, saydam zemin korunuyor
     geniş şerit       → 1400 piksel genişlik, zemin korunuyor

   720 piksel neden yeterli: çizim ekranda en fazla 260 piksel
   genişliğinde duruyor, üç katı yoğunluktaki telefonda bile net
   çıkıyor. Şerit tam genişlik olduğu için daha büyük.

   FOTOĞRAF AYRI YOLDAN GEÇİYOR

   Hedefin uzantısı `.jpg` ise indeksli palet devre dışı kalıyor.
   Palet, birkaç düz renkten oluşan çizimde kayıpsız görünüyor; sürekli
   tonlu bir fotoğrafta ise gökyüzünü bantlara bölüyor. Fotoğraf JPEG
   olarak, `mozjpeg` ve aşamalı tarama ile çıkıyor.

   Kullanım:
     node tools/gorsel-hazirla.mjs <kaynak> <hedef.png|.jpg> [genislik]
   ========================================================================== */

import sharp from 'sharp'
import { basename } from 'node:path'

const [, , kaynak, hedef, genislikArg] = process.argv

if (!kaynak || !hedef) {
  console.error('Kullanım: node tools/gorsel-hazirla.mjs <kaynak> <hedef> [genislik]')
  process.exit(1)
}

const genislik = Number(genislikArg) || 720
const fotograf = /\.jpe?g$/i.test(hedef)

const olcek = sharp(kaynak).resize({ width: genislik, withoutEnlargement: true })

const cikti = await (fotograf
  ? olcek.jpeg({ quality: 82, mozjpeg: true, progressive: true })
  : /* palette: true → PNG'yi indeksli renge çeviriyor. Bu çizimler
       birkaç düz renkten oluşuyor; indeksli palet dosyayı onda birine
       indiriyor ve düz renklerde kayıp görünmüyor. */
    olcek.png({ compressionLevel: 9, palette: true, quality: 90 })
).toFile(hedef)

const kb = (n) => Math.round(n / 1024) + ' KB'
console.log(
  `${basename(hedef)}  ${cikti.width}x${cikti.height}  ${kb(cikti.size)}`
)
