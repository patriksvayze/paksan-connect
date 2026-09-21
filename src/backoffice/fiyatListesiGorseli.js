import { rgbaYap, kirpmaKutusu, GORSEL_EN } from '../lib/fiyatListesiOku'

/* ==========================================================================
   Fiyat listesindeki parça resmini dosyaya çevirmek (yalnız tarayıcıda)

   PDF'teki resim ham piksel olarak geliyor (bkz. lib/fiyatListesiOku.js).
   Burada üç şey yapılıyor, eski Python betiğinin yaptığının aynısı:

     1. Saydam zemin BEYAZA oturtuluyor. Listedeki resimlerin neredeyse
        hepsi ayrı bir saydamlık maskesiyle basılmış; maske atılırsa
        PDF'te bembeyaz görünen zemin siyah kareye dönüyor.
     2. Parçanın çevresindeki boşluk kırpılıyor (kirpmaKutusu).
     3. 512 pikselden genişse küçültülüp WebP olarak sıkıştırılıyor.

   Kırpma hesabı ortak dosyada: Node'daki sınama aynı hesabı kullanıp
   çıkan boyutları eski görsellerle karşılaştırıyor.

   WebP yazamayan tarayıcı (eski Safari) PNG veriyor; uzantı da ona göre
   değişiyor, sunucu ikisini de kabul ediyor.
   ========================================================================== */

const KALITE = 0.82

function tuval(en, boy) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(en, boy)
  const t = document.createElement('canvas')
  t.width = en
  t.height = boy
  return t
}

function dosyaYap(t, tur) {
  if (t.convertToBlob) return t.convertToBlob({ type: tur, quality: KALITE })
  return new Promise((coz) => t.toBlob(coz, tur, KALITE))
}

/**
 * @param {object} resim pdf.js resim nesnesi ({width, height, kind, data})
 * @returns {Promise<{dosya: Blob, uzanti: string}>}
 */
export async function gorseliDosyayaCevir(resim) {
  const { width: w, height: h } = resim
  const rgba = rgbaYap(resim)
  const k = kirpmaKutusu(rgba, w, h)

  const kaynak = tuval(w, h)
  kaynak.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0)

  const en = Math.min(GORSEL_EN, k.w)
  const boy = Math.max(1, Math.round((k.h * en) / k.w))
  const hedef = tuval(en, boy)
  const c = hedef.getContext('2d')
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, en, boy)
  c.imageSmoothingQuality = 'high'
  c.drawImage(kaynak, k.x, k.y, k.w, k.h, 0, 0, en, boy)

  const dosya = await dosyaYap(hedef, 'image/webp')
  return { dosya, uzanti: dosya?.type === 'image/webp' ? 'webp' : 'png' }
}
