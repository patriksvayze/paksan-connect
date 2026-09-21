/* ==========================================================================
   Yedek parça fiyat listesini PDF'ten okumak

   PAKSAN'ın bastığı yedek parça fiyat listesini (PDF) parçalara,
   fiyatlara ve görsellere ayırıyor. Sonuç, uygulamaların okuduğu
   katalog biçiminde dönüyor (sunucu-taklidi/parca-katalogu/katalog.json
   ile aynı: kaynak, gruplar, parçalar).

   KİM KULLANIYOR: backoffice → Yedek Parça Kataloğu ekranı. Personel
   PDF'i seçiyor, liste onun tarayıcısında okunuyor, personel neyin
   değiştiğini görüp onaylayınca sonuç sunucuya gidiyor
   (bkz. src/backoffice/ekranlar/ParcaKatalogu.jsx).

   NEREDEN GELDİ (21 Eylül 2026). Bu iş o güne kadar komut satırından
   bir Python betiğiyle yapılıyordu (tools/parca-katalogu.py) ve yeni
   liste yayına girene kadar geliştirici gerekiyordu. Kullanıcının
   isteği: "Yedek parça personeli buradan yedek parça PDF listesini
   yükleyebilmeli." Betiğin mantığı birebir buraya taşındı; aynı
   PDF'ten aynı kataloğu ürettiği tools/fiyat-listesi-okuma-sinamasi.mjs
   ile gösteriliyor.

   NEDEN TARAYICIDA, SUNUCUDA DEĞİL. 18 Eylül'de dönüştürmenin sunucuya
   taşınması planlanmıştı. Akış aynı kaldı (personel seçer → okunur →
   değişenleri görür → onaylar → yayına girer); yalnız okumanın yeri
   değişti: sunucu henüz yok, sunucuya Python kurmak da ek bir bağımlılık.
   Bu dosya ortamdan bağımsız yazıldı — PDF kütüphanesi (pdf.js) ve
   görseli dosyaya çeviren adım dışarıdan veriliyor. Tarayıcı görseli
   WebP'ye çeviriyor, Node'daki sınama yalnız parmak izini alıyor.
   İleride okumayı sunucuya almak bu dosyayı değiştirmeyi gerektirmez.

   SAYFA NASIL OKUNUYOR

   Listenin her sayfasında bir alt montaj başlığı ve 3x4'lük bir ızgara
   var. Her gözde dört şey: görsel, parça kodu, parça adı, fiyat.
   Metin konumlarından okunuyor: kod 11 punto, adı 9-10 punto ve kodun
   8-26 punto altında, fiyatı 11 punto, ₺ ile başlıyor ve kodun 20-45
   punto altında. Sütunlar x merkezine göre üçe ayrılıyor.

   BAŞLIK SAYFA ORTASINDA DA BAŞLAYABİLİYOR. Alt montaj başlığı (18
   punto) kategorinin değiştiği yerde duruyor; bir sayfanın üst yarısı
   bir gruba, alt yarısı başka gruba ait olabiliyor. Başlık bu yüzden
   sayfaya değil SATIRA bakılarak veriliyor; başlıksız sayfa öncekinin
   devamı.

   LOGO PARÇA RESMİ SANILMASIN. Sayfa üstündeki logo ve altındaki
   künye görselleri konumla eleniyor (ızgaranın dışındakiler). Logo
   bazı sayfalarda ızgaranın tam içine basılmış; onu "beşten çok
   sayfada geçen aynı resim" kuralı eliyor — parça resimleri bir kez
   kullanılıyor. Aynı resim, boyutu ve piksellerinden çıkarılan parmak
   iziyle tanınıyor.

   RESİMLER SATIR BÜTÜNÜNDE PAYLAŞTIRILIYOR, göz göz değil. Geniş
   basılmış bir resmin merkezi komşu sütuna kayınca iki göz aynı resmi
   seçiyor, öbür göz görselsiz kalıyordu. Satırdaki resimler soldan
   sağa, her göze sütun merkezine en yakın olan verilerek dağıtılıyor.

   ÖLÇÜLER BUGÜNKÜ A4 LİSTEDE ÖLÇÜLDÜ (Temmuz 2026). Liste başka düzende
   basılırsa okuma eksik kalır; ekran bunu sessiz bırakmıyor (okunan
   parça sayısı, görseli ve fiyatı bulunamayanlar önizlemede yazıyor).
   ========================================================================== */

export const IZGARA = {
  /* Sütun merkezleri (punto, A4 = 595x842). */
  sutunMerkezleri: [128, 283, 438],
  /* Bunun üstü sayfa logosu, altı künye görseli. */
  ust: 120,
  alt: 725,
  /* Kod satırına göre adın ve fiyatın uzaklığı. */
  adAraligi: [8, 26],
  fiyatAraligi: [20, 45],
  /* Aynı ızgara satırındaki kodların y farkı bundan küçük. */
  satirPayi: 6,
  /* Alt montaj başlığı 18 punto; bundan büyük yazı başlıktır. */
  baslikBoyu: 16,
  /* Bir resim bundan çok sayfada geçiyorsa parça resmi değil süstür. */
  susSayfaSayisi: 5,
  /* Sütun merkezine bundan uzak öğe hiçbir sütuna ait değil. */
  sutunPayi: 90,
}

/* '₺26.500' ve '₺850,00' — listede iki biçim de var, kuruş her zaman sıfır. */
const FIYAT_KALIP = /^\s*₺\s*([\d.]+?)(?:,\d+)?\s*$/
const KOD_KALIP = /^[0-9][0-9.]{4,}[A-Z0-9.]*$/

const HARF = {
  ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
  ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
}

/** Başlıktan grup kimliği: 'İP GERDİRME SİSTEMİ' → 'ip-gerdirme-sistemi'. */
export function kimlik(metin) {
  return [...metin]
    .map((k) => HARF[k] ?? k)
    .join('')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** '₺26.500' → 26500. Fiyat değilse null. */
export function fiyatSayisi(metin) {
  const m = FIYAT_KALIP.exec(metin)
  return m ? Number(m[1].replace(/\./g, '')) : null
}

/* Öğe hangi sütunda? EN YAKIN sütun merkezine göre. "Merkeze 90 punto
   içindeki ilk sütun" denirse tam ortada duran öğe soldaki sütuna
   yazılıyor ve bir parça görselsiz kalıyordu. */
function sutun(x) {
  const m = IZGARA.sutunMerkezleri
  let en = 0
  for (let i = 1; i < m.length; i++) if (Math.abs(x - m[i]) < Math.abs(x - m[en])) en = i
  return Math.abs(x - m[en]) < IZGARA.sutunPayi ? en : null
}

/* --------------------------------------------------------------- Metin */

/* Sayfadaki yazılar: metin, punto, yatay merkez ve ÜST kenar (yukarıdan
   aşağı). Üst kenar yazı tipinin yükseltisiyle hesaplanıyor; betiğin
   kullandığı kütüphane de kutunun üstünü böyle veriyordu ve aralıklar
   (adAraligi, fiyatAraligi) o ölçüye göre konmuştu. */
function yazilariTopla(icerik, sayfaUst, sayfaSol) {
  const liste = []
  for (const oge of icerik.items) {
    const metin = (oge.str || '').trim()
    if (!metin) continue
    const [, , c, d, e, f] = oge.transform
    const boy = Math.round(Math.hypot(c, d) * 10) / 10
    const yukselti = icerik.styles?.[oge.fontName]?.ascent ?? 0.9
    liste.push({
      metin,
      boy,
      x: e - sayfaSol + oge.width / 2,
      y: sayfaUst - f - yukselti * boy,
    })
  }
  return liste
}

/* -------------------------------------------------------------- Resim */

function carp(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

/* pdf.js resmi ayrı bir kuyrukta çözüyor; hazır olunca veriyor. */
function nesneAl(sayfa, kimlikAdi) {
  const kap = kimlikAdi.startsWith('g_') ? sayfa.commonObjs : sayfa.objs
  return new Promise((coz) => kap.get(kimlikAdi, coz))
}

/** Resmin parmak izi: boyutu ve piksellerinden örneklenmiş bir özet. */
export function parmakIzi(resim) {
  const veri = resim.data || []
  let ozet = 0x811c9dc5
  const adim = Math.max(1, Math.floor(veri.length / 2048))
  for (let i = 0; i < veri.length; i += adim) {
    ozet ^= veri[i]
    ozet = Math.imul(ozet, 0x01000193) >>> 0
  }
  return `${resim.width}x${resim.height}-${ozet.toString(16)}`
}

/**
 * pdf.js'in verdiği resmi RGBA piksellere çevirir. Resim üç biçimde
 * gelebiliyor: 1 bitlik siyah-beyaz, RGB ya da saydamlığı olan RGBA.
 */
export function rgbaYap(resim) {
  const { width: w, height: h, kind, data } = resim
  if (kind === 3) return data
  const cikti = new Uint8ClampedArray(w * h * 4)
  if (kind === 2) {
    for (let i = 0, j = 0; i < w * h; i++, j += 3) {
      cikti[i * 4] = data[j]
      cikti[i * 4 + 1] = data[j + 1]
      cikti[i * 4 + 2] = data[j + 2]
      cikti[i * 4 + 3] = 255
    }
    return cikti
  }
  /* 1 bit: satırlar bayta yuvarlanmış; bit 1 beyaz (pdf.js'in kuralı). */
  const satirBayt = Math.ceil(w / 8)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const beyaz = (data[y * satirBayt + (x >> 3)] >> (7 - (x & 7))) & 1
      const i = (y * w + x) * 4
      cikti[i] = cikti[i + 1] = cikti[i + 2] = beyaz ? 255 : 0
      cikti[i + 3] = 255
    }
  }
  return cikti
}

/**
 * Resmin kırpılacağı kutu: parçanın gerçekten kapladığı alan ve çevresinde
 * küçük bir pay. CAD çıktılarının çevresinde geniş boşluk var; kırpılmadan
 * kartın içinde parça küçücük kalıyor.
 *
 * Alan saydamlıktan okunuyor: listedeki resimlerin neredeyse hepsi ayrı bir
 * saydamlık maskesiyle basılmış, boşluk orada saydam. Maskesiz resimde
 * beyaz olmayan piksellere bakılıyor.
 *
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function kirpmaKutusu(rgba, w, h) {
  let saydamVar = false
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 255) {
      saydamVar = true
      break
    }
  }
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const dolu = saydamVar
        ? rgba[i + 3] > 0
        : (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000 <= 247
      if (!dolu) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h }
  const pay = Math.max(4, Math.floor(Math.min(w, h) / 40))
  const sol = Math.max(0, x0 - pay)
  const ust = Math.max(0, y0 - pay)
  return {
    x: sol,
    y: ust,
    w: Math.min(w, x1 + 1 + pay) - sol,
    h: Math.min(h, y1 + 1 + pay) - ust,
  }
}

/* Görsel ekranda en fazla 170 piksel genişlikte duruyor; üç katı
   yoğunluktaki telefonda bile 512 fazlasıyla yetiyor. */
export const GORSEL_EN = 512

/* Sayfaya basılan resimler: nerede durdukları ve parmak izleri.
   Konum, çizim komutlarındaki dönüşüm matrisinden çıkıyor: resim birim
   kareye çiziliyor, matris onu sayfadaki yerine taşıyor. */
async function resimleriTopla(sayfa, pdfjs, sayfaUst, sayfaSol) {
  const O = pdfjs.OPS
  const liste = await sayfa.getOperatorList()
  let ctm = [1, 0, 0, 1, 0, 0]
  const yigin = []
  const resimler = []
  const bilinen = new Map()

  const yerlestir = async (nesne, anahtar, m) => {
    if (!nesne?.data) return
    if (!bilinen.has(anahtar)) bilinen.set(anahtar, parmakIzi(nesne))
    const xs = [m[4], m[4] + m[0], m[4] + m[2], m[4] + m[0] + m[2]]
    const ys = [m[5], m[5] + m[1], m[5] + m[3], m[5] + m[1] + m[3]]
    resimler.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2 - sayfaSol,
      y0: sayfaUst - Math.max(...ys),
      y1: sayfaUst - Math.min(...ys),
      iz: bilinen.get(anahtar),
      nesne,
    })
  }

  for (let i = 0; i < liste.fnArray.length; i++) {
    const fn = liste.fnArray[i]
    const a = liste.argsArray[i]
    if (fn === O.save) yigin.push(ctm)
    else if (fn === O.restore) ctm = yigin.pop() || [1, 0, 0, 1, 0, 0]
    else if (fn === O.transform) ctm = carp(ctm, a)
    else if (fn === O.paintFormXObjectBegin) {
      yigin.push(ctm)
      if (Array.isArray(a?.[0]) && a[0].length === 6) ctm = carp(ctm, a[0])
    } else if (fn === O.paintFormXObjectEnd) ctm = yigin.pop() || [1, 0, 0, 1, 0, 0]
    else if (fn === O.paintImageXObject) {
      await yerlestir(await nesneAl(sayfa, a[0]), a[0], ctm)
    } else if (fn === O.paintInlineImageXObject) {
      await yerlestir(a[0], `satir-${i}`, ctm)
    } else if (fn === O.paintImageXObjectRepeat) {
      const [ad, sx, sy, konumlar] = a
      const nesne = await nesneAl(sayfa, ad)
      for (let k = 0; k < (konumlar?.length || 0); k += 2) {
        await yerlestir(nesne, ad, carp(ctm, [sx, 0, 0, sy, konumlar[k], konumlar[k + 1]]))
      }
    }
  }
  return resimler
}

/* ------------------------------------------------------------ Sayfa */

/* Bir sayfanın başlıkları ve parçaları (betikteki sayfayiOku'nun
   aynısı). Süs resimleri çıkarılmış olarak geliyor. */
function sayfayiCoz({ yazilar, resimler }) {
  if (!yazilar.length) return { basliklar: [], parcalar: [] }

  const basliklar = yazilar
    .filter((s) => s.boy >= IZGARA.baslikBoyu)
    .map((s) => ({ y: s.y, ad: s.metin }))
    .sort((a, b) => a.y - b.y)

  const kodlar = yazilar
    .filter((s) => s.y > IZGARA.ust && KOD_KALIP.test(s.metin) && sutun(s.x) !== null)
    .sort((a, b) => a.y - b.y)

  const izgaradakiler = resimler.filter((r) => !(r.y1 < IZGARA.ust || r.y0 > IZGARA.alt))

  /* Kodlar satırlara kümeleniyor: aynı ızgara satırındaki üç kodun y
     değeri birkaç ondalık farkla aynı. */
  const satirlar = []
  for (const k of kodlar) {
    const son = satirlar[satirlar.length - 1]
    if (son && Math.abs(k.y - son[0].y) < IZGARA.satirPayi) son.push(k)
    else satirlar.push([k])
  }

  const parcalar = []
  satirlar.forEach((satir, i) => {
    const satirY = satir[0].y
    const oncekiY = i ? satirlar[i - 1][0].y : 0
    const adaylar = izgaradakiler.filter((r) => {
      const merkez = (r.y0 + r.y1) / 2
      return oncekiY < merkez && merkez < satirY
    })

    for (const k of [...satir].sort((a, b) => a.x - b.x)) {
      const sut = sutun(k.x)
      const ayniSutun = yazilar.filter((x) => sutun(x.x) === sut)

      const ad = ayniSutun.find(
        (x) =>
          IZGARA.adAraligi[0] < x.y - k.y &&
          x.y - k.y < IZGARA.adAraligi[1] &&
          fiyatSayisi(x.metin) === null &&
          !KOD_KALIP.test(x.metin),
      )
      const fiyatYazisi = ayniSutun.find(
        (x) =>
          IZGARA.fiyatAraligi[0] < x.y - k.y &&
          x.y - k.y < IZGARA.fiyatAraligi[1] &&
          fiyatSayisi(x.metin) !== null,
      )

      let resim = null
      if (adaylar.length) {
        const merkez = sut !== null ? IZGARA.sutunMerkezleri[sut] : k.x
        let en = 0
        for (let j = 1; j < adaylar.length; j++) {
          if (Math.abs(adaylar[j].x - merkez) < Math.abs(adaylar[en].x - merkez)) en = j
        }
        resim = adaylar.splice(en, 1)[0]
      }

      parcalar.push({
        kod: k.metin,
        ad: ad ? ad.metin : '',
        fiyat: fiyatYazisi ? fiyatSayisi(fiyatYazisi.metin) : null,
        resim,
        y: k.y,
      })
    }
  })

  /* Okuma sırası yukarıdan aşağı; başlık eşleştirmesi buna dayanıyor. */
  parcalar.sort((a, b) => a.y - b.y || (a.kod < b.kod ? -1 : a.kod > b.kod ? 1 : 0))
  return { basliklar, parcalar }
}

/* ------------------------------------------------------------ Liste */

/**
 * Fiyat listesi PDF'ini okur.
 *
 * @param {ArrayBuffer|Uint8Array} veri  PDF dosyasının baytları
 * @param {object} secenek
 * @param {object} secenek.pdfjs  pdf.js modülü (tarayıcıda 'pdfjs-dist',
 *   Node'da 'pdfjs-dist/legacy/build/pdf.mjs')
 * @param {string} [secenek.kaynak]  PDF'in dosya adı, katalogda yazılır
 * @param {(resim: object) => Promise<any>} [secenek.gorselIsle]  bir parça
 *   resmini dosyaya çevirir; dönen değer `gorseller`de parça koduna bağlanır
 * @param {(sayfa: number, toplam: number) => void} [secenek.ilerleme]
 * @returns {Promise<{katalog, gorseller: Map, eksik, sayfaSayisi}>}
 */
export async function fiyatListesiniOku(veri, { pdfjs, kaynak = '', gorselIsle, ilerleme } = {}) {
  /* Resimler ham piksel olarak gelsin: tarayıcı kendi çözücüsünü
     kullanırsa pikseller Node'dakinden farklı çıkabiliyor ve parmak
     izi iki ortamda aynı olmuyor. */
  /* KOPYA veriliyor. pdf.js baytları işçisine devrediyor ve çağıranın
     elindeki dizi boşalıyor; ekran aynı PDF'i sonra arşive gönderiyor.
     Düz Uint8Array olması da şart: pdf.js Node'un Buffer'ını almıyor. */
  const bayt = ArrayBuffer.isView(veri)
    ? new Uint8Array(veri.buffer, veri.byteOffset, veri.byteLength).slice()
    : new Uint8Array(veri).slice()
  const gorev = pdfjs.getDocument({
    data: bayt,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    verbosity: 0,
  })
  const belge = await gorev.promise

  const sayfalar = []
  const kacSayfada = new Map()
  const islenen = new Map()
  const sayfaSayisi = belge.numPages

  try {
    for (let no = 1; no <= sayfaSayisi; no++) {
      ilerleme?.(no, sayfaSayisi)
      const sayfa = await belge.getPage(no)
      const [sol, , , ust] = sayfa.view
      const yazilar = yazilariTopla(await sayfa.getTextContent(), ust, sol)
      const resimler = await resimleriTopla(sayfa, pdfjs, ust, sol)

      for (const iz of new Set(resimler.map((r) => r.iz))) {
        kacSayfada.set(iz, (kacSayfada.get(iz) || 0) + 1)
      }

      /* Izgaradaki resimler şimdi dosyaya çevriliyor; ham pikseller
         sayfa bitince bırakılıyor. Yüzlerce resmin pikselini sona kadar
         tutmak tarayıcının belleğini dolduruyordu. */
      if (gorselIsle) {
        for (const r of resimler) {
          if (r.y1 < IZGARA.ust || r.y0 > IZGARA.alt || islenen.has(r.iz)) continue
          islenen.set(r.iz, await gorselIsle(r.nesne))
        }
      }
      for (const r of resimler) delete r.nesne

      sayfalar.push({ yazilar, resimler })
      sayfa.cleanup()
    }
  } finally {
    await gorev.destroy()
  }

  const susler = new Set(
    [...kacSayfada].filter(([, n]) => n > IZGARA.susSayfaSayisi).map(([iz]) => iz),
  )

  const gruplar = new Map()
  const parcalar = []
  const gorseller = new Map()
  const gorulen = new Set()
  const eksik = { gorsel: [], fiyat: [], ad: [], grupsuz: 0 }

  /* Başlıksız sayfa öncekinin devamı; grup sayfalar arasında taşınıyor. */
  let acikGrup = null

  for (const s of sayfalar) {
    const { basliklar, parcalar: sayfaninkiler } = sayfayiCoz({
      yazilar: s.yazilar,
      resimler: s.resimler.filter((r) => !susler.has(r.iz)),
    })

    if (!sayfaninkiler.length) {
      /* Parçası olmayan sayfada da başlık olabilir (bölüm ayracı). */
      for (const b of basliklar) if (kimlik(b.ad)) acikGrup = b
      continue
    }

    for (const p of sayfaninkiler) {
      /* Bu satırdan ÖNCE gelen son başlık bu parçanın grubu. */
      const oncekiler = basliklar.filter((b) => b.y <= p.y)
      if (oncekiler.length) acikGrup = oncekiler[oncekiler.length - 1]
      const grupId = acikGrup ? kimlik(acikGrup.ad) : ''
      if (!grupId) {
        eksik.grupsuz += 1
        continue
      }
      if (!gruplar.has(grupId)) gruplar.set(grupId, { id: grupId, ad: acikGrup.ad, adet: 0 })

      /* Aynı kod iki yerde geçiyorsa ilki kalıyor. */
      if (gorulen.has(p.kod)) continue
      gorulen.add(p.kod)

      let gorsel = null
      if (p.resim) {
        gorsel = `${p.kod}.webp`
        if (islenen.has(p.resim.iz)) gorseller.set(p.kod, islenen.get(p.resim.iz))
      } else {
        eksik.gorsel.push(p.kod)
      }
      if (p.fiyat === null) eksik.fiyat.push(p.kod)
      if (!p.ad) eksik.ad.push(p.kod)

      parcalar.push({ kod: p.kod, ad: p.ad, fiyat: p.fiyat, grup: grupId, gorsel })
      gruplar.get(grupId).adet += 1
    }
  }

  return {
    katalog: { kaynak, gruplar: [...gruplar.values()], parcalar },
    gorseller,
    eksik,
    sayfaSayisi,
  }
}
