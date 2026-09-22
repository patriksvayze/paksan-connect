/* ==========================================================================
   PDF yazma — resim sayfalardan

   NEDEN VAR (22 Eylül 2026): Servisim'de garanti işinin servis formu PDF
   olarak alınıyor (bkz. servis/servisFormu.js). Projede PDF yazan bir
   şey yoktu.

   NEDEN KÜTÜPHANE YOK: projede dışarıdan kütüphane kullanılmıyor
   (bkz. backoffice/excel.js başı). Asıl zorluk yazı değil TÜRKÇE HARF:
   PDF'in hazır yazı tipleri "ğ, ş, ı, İ" harflerini tanımıyor; yazıyla
   PDF üretmek için yazı tipi dosyasını PDF'in içine gömmek gerekiyor ve
   o iş bir kütüphane büyüklüğünde.

   ÇÖZÜM: form önce bir tuvale (canvas) çiziliyor — tarayıcı Türkçeyi
   zaten doğru yazıyor — sonra tuval JPEG olarak bir A4 sayfasının
   üstüne oturtuluyor. PDF'in içinde her sayfa tek bir resim. Bedeli:
   yazı seçilemiyor ve dosya yazılı PDF'ten büyük (A4, 200 DPI: 300-600
   KB). Çıktı alınacak bir form için ikisi de sorun değil.

   Biçim PDF 1.4'ün en küçük hâli: katalog, sayfa ağacı, her sayfa için
   sayfa + resim + çizim komutu. Resim DCTDecode (JPEG olduğu gibi).
   ========================================================================== */

/* A4, PDF noktası (1/72 inç). */
export const A4 = { genislik: 595.28, yukseklik: 841.89 }

const yazi = (s) => new TextEncoder().encode(s)

/**
 * JPEG sayfalardan PDF üretir. Her resim bir A4 sayfasını kaplar.
 *
 * @param {Array<{jpeg: Uint8Array, genislik: number, yukseklik: number}>} sayfalar
 *   `genislik`/`yukseklik` resmin piksel ölçüsü.
 * @returns {Uint8Array}
 */
export function jpegdenPdf(sayfalar) {
  const parcalar = []
  const konumlar = []
  let boy = 0
  const ekle = (p) => {
    const b = typeof p === 'string' ? yazi(p) : p
    parcalar.push(b)
    boy += b.length
  }
  const nesne = (no, govde) => {
    konumlar[no] = boy
    ekle(`${no} 0 obj\n`)
    for (const p of [].concat(govde)) ekle(p)
    ekle('\nendobj\n')
  }

  /* İkili dosya olduğunu belirten dört yüksek baytlı yorum satırı. */
  ekle('%PDF-1.4\n')
  ekle(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  /* 1 katalog, 2 sayfa ağacı; sayfa başına üç nesne: sayfa, resim, çizim. */
  const sayfaNo = (i) => 3 + i * 3
  const kidler = sayfalar.map((_, i) => `${sayfaNo(i)} 0 R`).join(' ')

  nesne(1, '<< /Type /Catalog /Pages 2 0 R >>')
  nesne(2, `<< /Type /Pages /Kids [${kidler}] /Count ${sayfalar.length} >>`)

  sayfalar.forEach((s, i) => {
    const no = sayfaNo(i)
    const { genislik: G, yukseklik: Y } = A4
    const cizim = `q ${G} 0 0 ${Y} 0 0 cm /Im0 Do Q`
    nesne(
      no,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${G} ${Y}] ` +
        `/Resources << /XObject << /Im0 ${no + 1} 0 R >> >> /Contents ${no + 2} 0 R >>`,
    )
    nesne(no + 1, [
      `<< /Type /XObject /Subtype /Image /Width ${s.genislik} /Height ${s.yukseklik} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.length} >>\nstream\n`,
      s.jpeg,
      '\nendstream',
    ])
    nesne(no + 2, [`<< /Length ${cizim.length} >>\nstream\n`, cizim, '\nendstream'])
  })

  /* Çapraz başvuru tablosu: her nesnenin dosyadaki bayt konumu. */
  const adet = 3 + sayfalar.length * 3
  const xref = boy
  ekle(`xref\n0 ${adet}\n0000000000 65535 f \n`)
  for (let no = 1; no < adet; no++) {
    ekle(`${String(konumlar[no]).padStart(10, '0')} 00000 n \n`)
  }
  ekle(`trailer\n<< /Size ${adet} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const sonuc = new Uint8Array(boy)
  let k = 0
  for (const p of parcalar) {
    sonuc.set(p, k)
    k += p.length
  }
  return sonuc
}

/** Tuvali JPEG baytlarına çevirir. */
export async function tuvaldenJpeg(tuval, kalite = 0.9) {
  const blob = await new Promise((coz, reddet) =>
    tuval.toBlob((b) => (b ? coz(b) : reddet(new Error('jpeg'))), 'image/jpeg', kalite),
  )
  return new Uint8Array(await blob.arrayBuffer())
}
