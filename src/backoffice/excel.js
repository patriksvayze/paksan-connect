/* ==========================================================================
   Excel dosyası yazma ve okuma

   Dışarıdan kütüphane kullanılmıyor. Sebebi: backoffice PAKSAN'ın kendi
   sunucusundan gelecek, dışarıdaki bir adrese bağlanmasın. Bir de her
   kütüphane bakım yükü demek.

   .xlsx dosyası aslında içinde birkaç XML olan bir ZIP. Aşağıdaki
   `xlsxYaz` bu ZIP'i sıkıştırmadan (store) üretiyor — sıkıştırma
   olmayınca dosya biraz büyüyor ama kod kısa ve Excel sorunsuz açıyor.

   Okuma tarafında iş tersine dönüyor: Excel kendi kaydettiği dosyayı
   sıkıştırıyor, o yüzden açarken tarayıcının `DecompressionStream`
   özelliği kullanılıyor (Chrome, Edge, Firefox, Safari — hepsinde var).
   ========================================================================== */

/* ------------------------------------------------------------------- ZIP */

const CRC_TABLO = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(veri) {
  let c = 0xffffffff
  for (let i = 0; i < veri.length; i++) c = CRC_TABLO[(c ^ veri[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function yaz16(dizi, konum, deger) {
  dizi[konum] = deger & 0xff
  dizi[konum + 1] = (deger >>> 8) & 0xff
}

function yaz32(dizi, konum, deger) {
  dizi[konum] = deger & 0xff
  dizi[konum + 1] = (deger >>> 8) & 0xff
  dizi[konum + 2] = (deger >>> 16) & 0xff
  dizi[konum + 3] = (deger >>> 24) & 0xff
}

/** Sıkıştırmasız ZIP üretir. dosyalar: [{ad, icerik(Uint8Array)}] */
function zipYap(dosyalar) {
  const parcalar = []
  const merkez = []
  let konum = 0

  dosyalar.forEach((d) => {
    const ad = new TextEncoder().encode(d.ad)
    const crc = crc32(d.icerik)
    const boy = d.icerik.length

    const bas = new Uint8Array(30 + ad.length)
    yaz32(bas, 0, 0x04034b50)
    yaz16(bas, 4, 20) /* gereken sürüm */
    yaz16(bas, 6, 0) /* bayrak */
    yaz16(bas, 8, 0) /* yöntem: store */
    yaz16(bas, 10, 0) /* saat */
    yaz16(bas, 12, 0x2821) /* tarih — sabit, önemli değil */
    yaz32(bas, 14, crc)
    yaz32(bas, 18, boy)
    yaz32(bas, 22, boy)
    yaz16(bas, 26, ad.length)
    yaz16(bas, 28, 0)
    bas.set(ad, 30)

    parcalar.push(bas, d.icerik)

    const mrk = new Uint8Array(46 + ad.length)
    yaz32(mrk, 0, 0x02014b50)
    yaz16(mrk, 4, 20)
    yaz16(mrk, 6, 20)
    yaz16(mrk, 8, 0)
    yaz16(mrk, 10, 0)
    yaz16(mrk, 12, 0)
    yaz16(mrk, 14, 0x2821)
    yaz32(mrk, 16, crc)
    yaz32(mrk, 20, boy)
    yaz32(mrk, 24, boy)
    yaz16(mrk, 28, ad.length)
    yaz32(mrk, 42, konum)
    mrk.set(ad, 46)
    merkez.push(mrk)

    konum += bas.length + boy
  })

  const merkezBoy = merkez.reduce((t, m) => t + m.length, 0)
  const son = new Uint8Array(22)
  yaz32(son, 0, 0x06054b50)
  yaz16(son, 8, dosyalar.length)
  yaz16(son, 10, dosyalar.length)
  yaz32(son, 12, merkezBoy)
  yaz32(son, 16, konum)

  return new Blob([...parcalar, ...merkez, son], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/* ------------------------------------------------------------------- XML */

function kacir(metin) {
  return String(metin ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    /* Excel kontrol karakterlerini kabul etmiyor */
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function sutunHarfi(i) {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const kalan = (n - 1) % 26
    s = String.fromCharCode(65 + kalan) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function metin(x) {
  return new TextEncoder().encode(x)
}

/* Sayı gibi görünen ama sayı OLMAYAN alanlar var: telefon (0332…),
   seri no, müşteri numarası. Bunlar sayı yazılırsa Excel baştaki sıfırı
   atıyor ve uzun numarayı 3,32E+10 yapıyor. Bu yüzden her hücre metin
   yazılıyor; ondalıklı gerçek sayı bu tabloların hiçbirinde yok. */
function sayfaXml(satirlar) {
  const govde = satirlar
    .map((satir, y) => {
      const hucreler = satir
        .map((deger, x) => {
          const ref = sutunHarfi(x) + (y + 1)
          const stil = y === 0 ? ' s="1"' : ''
          return `<c r="${ref}"${stil} t="inlineStr"><is><t xml:space="preserve">${kacir(
            deger
          )}</t></is></c>`
        })
        .join('')
      return `<row r="${y + 1}">${hucreler}</row>`
    })
    .join('')

  const genislik = (satirlar[0] || [])
    .map((_, x) => {
      const enUzun = satirlar.reduce(
        (t, s) => Math.max(t, String(s[x] ?? '').length),
        6
      )
      const en = Math.min(46, enUzun + 3)
      return `<col min="${x + 1}" max="${x + 1}" width="${en}" customWidth="1"/>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${genislik}</cols>
<sheetData>${govde}</sheetData>
</worksheet>`
}

const STILLER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1848A8"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="2">
<xf xfId="0"/>
<xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/**
 * Tek sayfalık .xlsx üretir.
 * @param {string} sayfaAdi Excel'de sekme adı
 * @param {Array<Array<string>>} satirlar ilk satır başlık
 */
export function xlsxYap(sayfaAdi, satirlar) {
  const ad = String(sayfaAdi).slice(0, 28).replace(/[\\/?*[\]:]/g, ' ')

  return zipYap([
    {
      ad: '[Content_Types].xml',
      icerik: metin(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    },
    {
      ad: '_rels/.rels',
      icerik: metin(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      ad: 'xl/workbook.xml',
      icerik: metin(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${kacir(ad)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    },
    {
      ad: 'xl/_rels/workbook.xml.rels',
      icerik: metin(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { ad: 'xl/styles.xml', icerik: metin(STILLER) },
    { ad: 'xl/worksheets/sheet1.xml', icerik: metin(sayfaXml(satirlar)) },
  ])
}

/** Dosyayı kullanıcıya indirtir. */
export function indir(blob, dosyaAdi) {
  const adres = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = adres
  a.download = dosyaAdi
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(adres), 1000)
}

/** Dosya adına tarih ekler: "Talepler-20260818.xlsx" */
export function dosyaAdi(ad) {
  const d = new Date()
  const iki = (n) => String(n).padStart(2, '0')
  return `${ad}-${d.getFullYear()}${iki(d.getMonth() + 1)}${iki(d.getDate())}.xlsx`
}

/* --------------------------------------------------------------- Okuma */

async function zipAc(tampon) {
  const veri = new Uint8Array(tampon)
  const gorunum = new DataView(tampon)
  const dosyalar = {}

  /* Merkezi dizin sondan aranıyor (yorum alanı olabilir) */
  let son = -1
  for (let i = veri.length - 22; i >= 0; i--) {
    if (gorunum.getUint32(i, true) === 0x06054b50) {
      son = i
      break
    }
  }
  if (son < 0) throw new Error('Dosya bir Excel dosyası değil.')

  const adet = gorunum.getUint16(son + 10, true)
  let p = gorunum.getUint32(son + 16, true)

  for (let i = 0; i < adet; i++) {
    const yontem = gorunum.getUint16(p + 10, true)
    const boy = gorunum.getUint32(p + 20, true)
    const adBoy = gorunum.getUint16(p + 28, true)
    const ekBoy = gorunum.getUint16(p + 30, true)
    const yorumBoy = gorunum.getUint16(p + 32, true)
    const yerelKonum = gorunum.getUint32(p + 42, true)
    const ad = new TextDecoder().decode(veri.subarray(p + 46, p + 46 + adBoy))

    /* Yerel başlıktaki alan uzunlukları merkezdekinden farklı olabilir */
    const yerelAdBoy = gorunum.getUint16(yerelKonum + 26, true)
    const yerelEkBoy = gorunum.getUint16(yerelKonum + 28, true)
    const bas = yerelKonum + 30 + yerelAdBoy + yerelEkBoy
    const ham = veri.subarray(bas, bas + boy)

    if (yontem === 0) {
      dosyalar[ad] = new TextDecoder().decode(ham)
    } else if (yontem === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Tarayıcınız bu dosyayı açamıyor. Güncel Chrome veya Edge kullanın.')
      }
      const akis = new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      dosyalar[ad] = await new Response(akis).text()
    }
    p += 46 + adBoy + ekBoy + yorumBoy
  }
  return dosyalar
}

function sutunNo(ref) {
  const harfler = ref.match(/[A-Z]+/)[0]
  let n = 0
  for (const h of harfler) n = n * 26 + (h.charCodeAt(0) - 64)
  return n - 1
}

function xmlCoz(metinDegeri) {
  return metinDegeri
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&')
}

/**
 * .xlsx dosyasının ilk sayfasını satır dizisi olarak okur.
 * @returns {Promise<Array<Array<string>>>}
 */
export async function xlsxOku(dosya) {
  const dosyalar = await zipAc(await dosya.arrayBuffer())

  const sayfaAdi = Object.keys(dosyalar).find((a) => /^xl\/worksheets\/sheet1?\.xml$/.test(a))
  const sayfa = dosyalar[sayfaAdi] || dosyalar['xl/worksheets/sheet1.xml']
  if (!sayfa) throw new Error('Excel dosyasında sayfa bulunamadı.')

  /* Ortak metin havuzu — Excel yazıları çoğunlukla burada tutuyor */
  const havuz = []
  const paylasim = dosyalar['xl/sharedStrings.xml']
  if (paylasim) {
    const parcalar = paylasim.match(/<si>[\s\S]*?<\/si>/g) || []
    parcalar.forEach((si) => {
      const yazilar = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []
      havuz.push(
        yazilar.map((t) => xmlCoz(t.replace(/<[^>]+>/g, ''))).join('')
      )
    })
  }

  const satirlar = []
  const satirParcalari = sayfa.match(/<row[\s\S]*?<\/row>/g) || []

  satirParcalari.forEach((satirXml) => {
    const satir = []
    const hucreler = satirXml.match(/<c[\s>][\s\S]*?(?:\/>|<\/c>)/g) || []

    hucreler.forEach((c) => {
      const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1]
      const tur = (c.match(/t="([^"]+)"/) || [])[1]
      const ic = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]

      let deger = ''
      if (tur === 's') {
        deger = havuz[Number(ic)] ?? ''
      } else if (tur === 'inlineStr') {
        const yazilar = c.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []
        deger = yazilar.map((t) => xmlCoz(t.replace(/<[^>]+>/g, ''))).join('')
      } else if (ic !== undefined) {
        deger = xmlCoz(ic)
      }

      satir[ref ? sutunNo(ref) : satir.length] = String(deger).trim()
    })

    satirlar.push(satir)
  })

  /* Tamamen boş satırlar atılıyor */
  return satirlar.filter((s) => s.some((h) => h && h.length))
}
