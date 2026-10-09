import { getProduct } from '../data/katalog/products.js'
import { PARA_BIRIMI, paraYaz } from '../data/katalog/para.js'
import { SIRKET } from '../data/kimlik.js'
import AMBLEM_DOSYASI from '../assets/logo/paksan-amblem.png'
import { extractYear, formatSerial, matchProduct } from '../lib/serial'
import { buZiyaretinKaydi, hakkedisHesapla, kmUcretiOku, saatOku, saatUcretiOku, saatYaz, temizParcalar } from '../lib/servisKaydi'
import { makineninServisi } from '../lib/servisAtama'
import { kayitTelGoster } from '../lib/tel'
import { jpegdenPdf, tuvaldenJpeg } from '../lib/pdf'
import { dosyaPaylas } from '../lib/dosyaPaylas'

/* ==========================================================================
   Servis formu — garanti işinin PDF'i

   KULLANICININ İSTEĞİ (22 Eylül 2026): "Servisim uygulamasında garanti
   kapsamında tamamlanan işler için servis formu çıktısı alınabilmesi
   gerekiyor. Şu anda PAKSAN'da saha servisi basılı servis formu
   dolduruyor." Form o basılı formun düzeninde: başlık, müşteri ve
   bayi kutusu, makine satırı, arıza, parça, işçilik ve yol tabloları,
   toplam, taahhüt ve iki imza.

   ELLE YAZILAN HER ŞEY KAYITTAN GELİYOR. Servis kaydını zaten doldurdu;
   formu ikinci kez yazdırmak, kaydı geçiştirmenin davetiyesi olurdu.
   Kayıtta karşılığı olmayan kutular boş çiziliyor, uydurulmuyor:
     · makine kodu (basılı formdaki "231") katalogta yok
     · modeli — ürün adı zaten modeli söylüyor
     · çıkış ve varış kilometresi — kayıt yalnız gidilen yolu tutuyor
     · KDV ve genel toplam — hak edişin KDV'li mi KDV'siz mi olduğu
       kayıtta yazmıyor; rakam uydurulmuyor
   İmzalar boş: form basılıp elle imzalanıyor.

   TUTARLAR HAK EDİŞTEN (kullanıcının kararı): işçilik ve yol tutarı
   PAKSAN'ın servise ödeyeceği hak edişin aynısı, toplam da. Parça
   garanti kapsamında PAKSAN'dan bedelsiz geliyor: satırda garanti VAR,
   tutar 0. PAKSAN kaydı düzelttiyse (yol, işçilik) düzeltilmiş hâli.

   İŞÇİLİK SATIRI SAAT × SAAT ÜCRETİ (22 Eylül 2026'dan beri servis
   süreyi yazıyor, bkz. lib/servisKaydi.js → TARIFE): tablonun adet
   sütunu SAAT, fiyat sütunu SAAT ÜCRETİ. Süresi olmayan eski kayıtta
   satır eskisi gibi tek kalem: adet 1, fiyat tutarın kendisi.

   TAAHHÜT CÜMLESİ DEĞİŞTİ. Basılı formdaki cümle "çıkacak fatura
   tutarını ödemeyi taahhüt ederim" diyor; garanti işinde müşteri
   ödeme yapmıyor. Müşteriye tutarı yazılı bir formda ödeme taahhüdü
   imzalatmak yanlış olurdu. Garanti formundaki cümle teslim aldığını
   ve bedelin garanti kapsamında karşılandığını söylüyor.

   NEDEN TUVAL: bkz. lib/pdf.js — PDF'in hazır yazı tipleri Türkçe
   harfleri tanımıyor. Form 200 DPI'lık bir A4 tuvaline çiziliyor.

   HANGİ İŞTE: garanti kapısından geçmiş ve bitmiş kayıt; PAKSAN'ın
   kabul etmediği (reddedilen) hak edişte form yok — "garanti
   kapsamında" diyen bir belge o işte doğru olmaz. */

/* Formdaki bütün yazılar. Basılı formun etiketleri Codex'ten geçti;
   büyük harfli olanlar basılı formdaki gibi büyük harfli. */
export const METIN = {
  baslik: 'SERVİS FORMU',
  siraNo: 'SIRA NO',
  tarih: 'TARİH',
  musteriAdi: 'MÜŞTERİ ADI',
  telefon: 'TELEFONU',
  adres: 'ADRESİ',
  bayiAdi: 'BAYİ ADI',
  servisAdi: 'SERVİS ADI',
  servisAdresi: 'SERVİSİN YAPILDIĞI ADRES',
  makineKodu: 'MAKİNE KODU',
  makineAdi: 'ADI',
  model: 'MODELİ',
  imalYili: 'ÜRETİM YILI',
  saseNo: 'SERİ NUMARASI',
  arizaTanimi: 'ARIZANIN TANIMI',
  arizaSonucu: 'ARIZANIN SONUCU',
  parcaNo: 'PARÇA NO',
  parcaAdi: 'PARÇA ADI',
  adet: 'ADET',
  birimFiyat: 'B. FİYAT',
  garantiSutun: 'GARANTİ',
  var: 'VAR',
  yok: 'YOK',
  parcaTutari: 'PARÇA TUTARI',
  iscilik: 'İŞÇİLİK',
  iscilikNo: 'İŞÇİLİK NO',
  iscilikTanimi: 'İŞÇİLİĞİN TANIMI',
  iscilikFiyati: 'İŞÇİLİK FİYATI',
  iscilikSaat: 'SAAT',
  saatUcreti: 'SAAT ÜCRETİ',
  iscilikTutari: 'İŞÇİLİK TUTARI',
  iscilikSatiri: 'İşçilik',
  yol: 'YOL',
  cikisKm: 'ÇIKIŞ KM',
  varisKm: 'VARIŞ KM',
  netKm: 'NET KM',
  kmUcreti: 'KM ÜCRETİ',
  yolTutari: 'YOL TUTARI',
  toplam: 'TOPLAM SERVİS TUTARI',
  kdv: 'KDV %',
  genelToplam: 'GENEL TOPLAM',
  taahhut: `Bu servis formuyla arızanın giderildiğini ve makinemi çalışır hâlde teslim aldığımı beyan ederim. İşlem garantiye dâhildir; bedeli PAKSAN tarafından karşılanır, benden ücret alınmaz.`,
  musteriImza: 'MÜŞTERİ (VEKİLİ / GÖREVLİSİ)',
  servisImza: 'ONARIMI YAPAN SERVİS',
  adiSoyadi: 'ADI SOYADI',
  imza: 'İMZA',
  paylasmaBasligi: 'Servis Formu',
}

/* FORM YALNIZ BU ZİYARETİN KAYDI TAMAMLANINCA (7 Ekim 2026, kullanıcının
   bildirdiği: "servis kaydı tamamlanmadan servis formu çıktısı
   alınamamalı. Şu an alınabiliyor"). Kural yalnız son kayda bakıyordu:
   müşteri "Sorun Devam Ediyor" deyince talep yeniden açılıyor, geçen
   ziyaretin bitmiş kaydı yerinde kalıyor ve düğme yeni ziyaret daha
   yapılmadan o kayıtla çıkıyordu. Artık kayıt bu ziyaretin olmalı
   (lib/servisKaydi.js → buZiyaretinKaydi) ve talep kaydın gönderildiği
   duruma geçmiş olmalı: onay bekliyor ya da kapandı. */
const FORMLU_DURUMLAR = ['onayBekliyor', 'kapandi']

/** Bu işin servis formu alınabilir mi? */
export function servisFormuVarMi(talep) {
  const k = talep?.servisKaydi
  return Boolean(
    k &&
      buZiyaretinKaydi(talep) === k &&
      FORMLU_DURUMLAR.includes(talep.status) &&
      k.kapi === 'garanti' &&
      k.asama === 'bitti' &&
      talep.hakkedis?.durum !== 'reddedildi',
  )
}

const tarihYaz = (t) => (t ? new Date(t).toLocaleDateString('tr-TR') : '')
const tl = (n) => `${paraYaz(n)} ${PARA_BIRIMI}`
const yerYaz = (ilce, il) => [ilce, il].filter(Boolean).join(' / ')

/**
 * Formun kayıttan dolan hâli. Ekrana değil tuvale gidiyor; ayrı durması
 * sınanabilsin diye.
 */
export function servisFormuVerisi(talep, servisAd) {
  const k = talep.servisKaydi || {}
  const seri = talep.makine?.serial || ''
  const urun = getProduct(talep.makine?.productId) || matchProduct(seri)?.product || null
  /* PAKSAN'ın onayladığı ya da düzelttiği hak ediş öncelikli; yoksa
     kayıttan hesap (onay bekleyen iş). */
  const h = talep.hakkedis?.toplam != null ? talep.hakkedis : hakkedisHesapla(k)
  const musteriAdres = talep.fatura?.adres
    ? [talep.fatura.adres, yerYaz(talep.fatura.ilce, talep.fatura.il)].filter(Boolean).join(' · ')
    : [talep.adres, yerYaz(talep.ilce, talep.il)].filter(Boolean).join(' · ')

  return {
    siraNo: talep.no || '',
    tarih: tarihYaz(k.tarih || talep.cozum?.tarih || Date.now()),
    musteriAdi: talep.ad || '',
    /* Numara ekranlardakiyle aynı işlevden (lib/tel.js → kayitTelGoster;
       25 Eylül 2026, kullanıcı sınaması): ham numarası olmayan eski
       kayıtta da ülke koduyla, tek biçimde. */
    telefon: kayitTelGoster(talep),
    musteriAdres,
    bayiAdi: makineninServisi(seri)?.bayi?.ad || '',
    servisAdi: servisAd || talep.servis?.ad || '',
    servisAdresi:
      [talep.adres, yerYaz(talep.ilce, talep.il)].filter(Boolean).join(' · ') || musteriAdres,
    makineKodu: '',
    makineAdi: urun?.name || '',
    model: '',
    /* Serisiz elle kayıtta (ElleKayit → seriYok) yıl servisin tahmini;
       formda öyle yazıyor. */
    imalYili: extractYear(seri)
      ? String(extractYear(seri))
      : talep.makine?.seriYok && talep.makine?.tahminiYil
        ? `${talep.makine.tahminiYil} (tahmini)`
        : '',
    saseNo: seri ? formatSerial(seri) : talep.makine?.seriYok ? 'Yok' : '',
    arizaTanimi: k.ariza || talep.aciklama || (talep.belirtiler || []).join(', '),
    arizaSonucu: [k.yapilanIs, k.sonuc].filter(Boolean).join('. '),
    parcalar: temizParcalar(k.parcalar).map((p) => ({
      no: p.kod || '',
      ad: p.ad,
      adet: String(p.adet),
      birimFiyat: '',
      garanti: true,
      tutar: tl(0),
    })),
    iscilik: h.iscilik ? [iscilikSatiri(k, h)] : [],
    iscilikSaatli: Boolean(saatOku(k.iscilikSaat)),
    netKm: k.km ? String(k.km) : '',
    /* Kaydın kendi km ücreti (23 Eylül 2026'dan beri kayıt taşıyor). */
    kmUcreti: k.km ? tl(kmUcretiOku(k)) : '',
    yolTutari: k.km ? tl(h.yol) : '',
    toplam: tl(h.toplam || 0),
  }
}

/* İşçilik tablosunun tek satırı. Tutar hak edişten (PAKSAN'ın
   düzelttiği hâl); süre ve ücret kayıttan — düzeltme ikisini birlikte
   yazıyor (bkz. veri.js → hakkedisDuzelt). */
function iscilikSatiri(k, h) {
  const saat = saatOku(k.iscilikSaat)
  if (!saat) {
    return { no: '', ad: METIN.iscilikSatiri, adet: '1', birimFiyat: tl(h.iscilik), garanti: true, tutar: tl(h.iscilik) }
  }
  return {
    no: '',
    ad: METIN.iscilikSatiri,
    adet: saatYaz(saat),
    birimFiyat: tl(saatUcretiOku(k)),
    garanti: true,
    tutar: tl(h.iscilik),
  }
}

/* ------------------------------------------------------------ Çizim */

/* A4, 200 DPI. Yazıcıda keskin, dosya birkaç yüz KB. */
const G = 1654
const Y = 2339
const K = 80 /* kenar boşluğu */
const EN = G - 2 * K

const RENK = {
  cizgi: '#1f2937',
  noktali: '#9aa3af',
  etiket: '#374151',
  deger: '#0f172a',
  sira: '#c62828',
  garanti: '#1b7f3b',
  soluk: '#9aa3af',
}

function resimYukle(adres) {
  return new Promise((coz) => {
    const r = new Image()
    r.onload = () => coz(r)
    r.onerror = () => coz(null)
    r.src = adres
  })
}

function cizici(c) {
  const yaz = (s, x, y, { boy = 24, kalin = 700, renk = RENK.etiket, hiza = 'left' } = {}) => {
    c.font = `${kalin} ${boy}px Roboto, Arial, sans-serif`
    c.fillStyle = renk
    c.textAlign = hiza
    c.textBaseline = 'alphabetic'
    c.fillText(s, x, y)
  }
  /* Değer kutuya sığmıyorsa sonu "…" ile kesiliyor; taşan yazı yan
     kutunun üstüne binmesin. */
  const sigdir = (s, en, boy, kalin = 400) => {
    c.font = `${kalin} ${boy}px Roboto, Arial, sans-serif`
    let t = String(s || '')
    if (c.measureText(t).width <= en) return t
    while (t.length && c.measureText(t + '…').width > en) t = t.slice(0, -1)
    return t + '…'
  }
  const deger = (s, x, y, en, { boy = 27, hiza = 'left' } = {}) =>
    yaz(sigdir(s, en, boy), x, y, { boy, kalin: 400, renk: RENK.deger, hiza })
  /* Kelime kelime satırlara böler. */
  const satirlar = (s, en, boy) => {
    c.font = `400 ${boy}px Roboto, Arial, sans-serif`
    const sonuc = []
    let satir = ''
    for (const kelime of String(s || '').split(/\s+/).filter(Boolean)) {
      const aday = satir ? `${satir} ${kelime}` : kelime
      if (c.measureText(aday).width > en && satir) {
        sonuc.push(satir)
        satir = kelime
      } else satir = aday
    }
    if (satir) sonuc.push(satir)
    return sonuc
  }
  const kutu = (x, y, w, h, kalinlik = 2) => {
    c.strokeStyle = RENK.cizgi
    c.lineWidth = kalinlik
    c.strokeRect(x, y, w, h)
  }
  const cizgi = (x1, y1, x2, y2, { noktali = false, renk = RENK.cizgi, kalinlik = 2 } = {}) => {
    c.beginPath()
    c.setLineDash(noktali ? [3, 5] : [])
    c.strokeStyle = noktali ? RENK.noktali : renk
    c.lineWidth = noktali ? 1.5 : kalinlik
    c.moveTo(x1, y1)
    c.lineTo(x2, y2)
    c.stroke()
    c.setLineDash([])
  }
  return { yaz, sigdir, deger, satirlar, kutu, cizgi }
}

/* Tablo: başlık satırı + satırlar. `sutunlar` [{ad, en, hiza}] — son
   sütunun eni kalan yer. GARANTİ sütunu VAR/YOK diye ikiye bölünüyor
   ve işaretli olan yuvarlak içine alınıyor, basılı formdaki gibi. */
function tablo(c, d, x, y, sutunlar, satirlar, { satirBoy = 46, enAz = 0 } = {}) {
  const baslikBoy = 48
  const adet = Math.max(enAz, satirlar.length)
  const toplamBoy = baslikBoy + adet * satirBoy
  let sol = x
  const xler = sutunlar.map((s, i) => {
    const en = i === sutunlar.length - 1 ? x + EN - sol : s.en
    const r = { x: sol, en }
    sol += en
    return r
  })
  d.kutu(x, y, EN, toplamBoy)
  d.cizgi(x, y + baslikBoy, x + EN, y + baslikBoy)
  xler.forEach((r, i) => {
    if (i) d.cizgi(r.x, y, r.x, y + toplamBoy)
    d.yaz(d.sigdir(sutunlar[i].ad, r.en - 16, 21, 700), r.x + r.en / 2, y + 32, { boy: 21, hiza: 'center' })
  })
  for (let i = 0; i < adet; i++) {
    const sy = y + baslikBoy + i * satirBoy
    if (i) d.cizgi(x, sy, x + EN, sy, { noktali: true })
    const satir = satirlar[i]
    sutunlar.forEach((s, j) => {
      const r = xler[j]
      if (s.garanti) {
        const orta = r.x + r.en / 2
        d.cizgi(orta, sy, orta, sy + satirBoy, { renk: '#6b7280', kalinlik: 1 })
        const varX = r.x + r.en / 4
        const yokX = r.x + (r.en * 3) / 4
        const renk = satir ? RENK.etiket : RENK.soluk
        d.yaz(METIN.var, varX, sy + 31, { boy: 20, renk, hiza: 'center' })
        d.yaz(METIN.yok, yokX, sy + 31, { boy: 20, renk, hiza: 'center' })
        if (satir) {
          c.beginPath()
          c.strokeStyle = RENK.garanti
          c.lineWidth = 3
          c.ellipse(satir.garanti ? varX : yokX, sy + satirBoy / 2 + 1, 34, 17, 0, 0, Math.PI * 2)
          c.stroke()
        }
        return
      }
      if (!satir) return
      const v = satir[s.alan] || ''
      const pay = 12
      if (s.hiza === 'right') d.deger(v, r.x + r.en - pay, sy + 31, r.en - 2 * pay, { boy: 25, hiza: 'right' })
      else if (s.hiza === 'center') d.deger(v, r.x + r.en / 2, sy + 31, r.en - 2 * pay, { boy: 25, hiza: 'center' })
      else d.deger(v, r.x + pay, sy + 31, r.en - 2 * pay, { boy: 25 })
    })
  }
  return y + toplamBoy
}

/** Formu tuvale çizer. */
export async function servisFormuCiz(v) {
  const tuval = document.createElement('canvas')
  tuval.width = G
  tuval.height = Y
  const c = tuval.getContext('2d')

  /* Yazı tipi yüklenmeden çizilirse tuval yedek yazı tipine düşüyor. */
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load('400 27px Roboto'),
      document.fonts.load('700 27px Roboto'),
    ]).catch(() => {})
  }
  const amblem = await resimYukle(AMBLEM_DOSYASI)

  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, G, Y)
  const d = cizici(c)

  /* ---------------------------------------------------- Başlık */
  let x = K
  if (amblem) {
    c.drawImage(amblem, K, 60, 132, 132)
    x = K + 150
  }
  /* Unvan iki satır: basılı formdaki gibi. Ortadaki kelimeden bölünüyor. */
  const kelimeler = SIRKET.unvan.split(' ')
  const yari = Math.ceil(kelimeler.length / 2)
  d.yaz(kelimeler.slice(0, yari).join(' '), x, 118, { boy: 30, renk: RENK.deger })
  d.yaz(kelimeler.slice(yari).join(' '), x, 156, { boy: 30, renk: RENK.deger })

  /* Başlığın altındaki "GARANTİYE DÂHİL" damgası 8 Ekim 2026'da kalktı
     (kullanıcının isteği): servis formu zaten yalnız garanti işinde
     çıkıyor. Başlık boşalan yerde, başlık alanının ortasında. */
  d.yaz(METIN.baslik, G / 2 + 110, 150, { boy: 58, renk: RENK.deger, hiza: 'center' })

  /* Sıra no etiketi numaranın ÜSTÜNDE: basılı formda yan yanaydı ama
     orada numara dört hane; talep numarası on üç hane ve etiketin
     üstüne biniyordu. */
  d.yaz(METIN.siraNo, G - K, 92, { boy: 20, hiza: 'right' })
  d.yaz(d.sigdir(v.siraNo, 340, 34, 700), G - K, 134, { boy: 34, renk: RENK.sira, hiza: 'right' })
  d.yaz(`${METIN.tarih} :`, G - K - 190, 186, { boy: 20, hiza: 'right' })
  d.deger(v.tarih, G - K, 188, 180, { hiza: 'right' })

  /* ------------------------------------- Müşteri, bayi, servis */
  const kutuY = 230
  const kutuBoy = 260
  const orta = K + EN / 2
  d.kutu(K, kutuY, EN, kutuBoy)
  d.cizgi(orta, kutuY, orta, kutuY + kutuBoy)

  const alan = (etiket, deger, ex, dx, y, en) => {
    d.yaz(etiket, ex, y, { boy: 20 })
    d.yaz(':', dx - 14, y, { boy: 20 })
    d.deger(deger, dx, y, en)
    d.cizgi(dx, y + 10, dx + en, y + 10, { noktali: true })
  }
  const solDeger = K + 200
  const solEn = orta - solDeger - 20
  alan(METIN.musteriAdi, v.musteriAdi, K + 18, solDeger, kutuY + 50, solEn)
  alan(METIN.telefon, v.telefon, K + 18, solDeger, kutuY + 100, solEn)
  const adresSatir = d.satirlar(v.musteriAdres, solEn, 27)
  alan(METIN.adres, adresSatir[0] || '', K + 18, solDeger, kutuY + 150, solEn)
  d.deger(adresSatir.slice(1).join(' '), K + 18, kutuY + 205, orta - K - 38)
  d.cizgi(K + 18, kutuY + 215, orta - 20, kutuY + 215, { noktali: true })

  const sagDeger = orta + 190
  const sagEn = K + EN - sagDeger - 20
  alan(METIN.bayiAdi, v.bayiAdi, orta + 18, sagDeger, kutuY + 50, sagEn)
  alan(METIN.servisAdi, v.servisAdi, orta + 18, sagDeger, kutuY + 100, sagEn)
  d.yaz(METIN.servisAdresi, orta + 18, kutuY + 150, { boy: 20 })
  const yerSatir = d.satirlar(v.servisAdresi, K + EN - orta - 38, 27)
  d.deger(yerSatir[0] || '', orta + 18, kutuY + 195, K + EN - orta - 38)
  d.cizgi(orta + 18, kutuY + 205, K + EN - 20, kutuY + 205, { noktali: true })
  d.deger(yerSatir.slice(1).join(' '), orta + 18, kutuY + 243, K + EN - orta - 38)

  /* ---------------------------------------------------- Makine */
  let yy = tablo(
    c,
    d,
    K,
    kutuY + kutuBoy + 14,
    [
      { ad: METIN.makineKodu, en: 210, alan: 'makineKodu', hiza: 'center' },
      { ad: METIN.makineAdi, en: 420, alan: 'makineAdi' },
      { ad: METIN.model, en: 330, alan: 'model' },
      { ad: METIN.imalYili, en: 190, alan: 'imalYili', hiza: 'center' },
      { ad: METIN.saseNo, alan: 'saseNo', hiza: 'center' },
    ],
    [v],
    { satirBoy: 56 },
  )

  /* ------------------------------------------------------ Arıza */
  const arizaY = yy + 14
  const arizaBoy = 360
  d.kutu(K, arizaY, EN, arizaBoy)
  const arizaBlok = (etiket, metin, y) => {
    d.yaz(`${etiket} :`, K + 18, y, { boy: 20 })
    c.font = '700 20px Roboto, Arial, sans-serif'
    const bas = K + 30 + c.measureText(`${etiket} :`).width
    const ilkEn = K + EN - 20 - bas
    const tamEn = EN - 40
    /* İlk satır etiketin yanında, kalanlar tam genişlikte. */
    const ilk = d.satirlar(metin, ilkEn, 27)
    const ilkSatir = ilk[0] || ''
    const kalan = d.satirlar(ilk.slice(1).join(' '), tamEn, 27)
    d.deger(ilkSatir, bas, y, ilkEn)
    d.cizgi(bas, y + 10, K + EN - 20, y + 10, { noktali: true })
    for (let i = 0; i < 2; i++) {
      const sy = y + 52 * (i + 1)
      d.deger(kalan[i] || '', K + 18, sy, tamEn)
      d.cizgi(K + 18, sy + 10, K + EN - 20, sy + 10, { noktali: true })
    }
  }
  arizaBlok(METIN.arizaTanimi, v.arizaTanimi, arizaY + 48)
  arizaBlok(METIN.arizaSonucu, v.arizaSonucu, arizaY + 222)

  /* ----------------------------------------------------- Parça */
  const cok = v.parcalar.length > 7
  const kalemSutunlari = (no, ad, fiyat, tutar, adet = METIN.adet) => [
    { ad: no, en: 210, alan: 'no', hiza: 'center' },
    { ad, en: 500, alan: 'ad' },
    { ad: adet, en: 110, alan: 'adet', hiza: 'center' },
    { ad: fiyat, en: 190, alan: 'birimFiyat', hiza: 'right' },
    { ad: METIN.garantiSutun, en: 250, garanti: true },
    { ad: tutar, alan: 'tutar', hiza: 'right' },
  ]
  yy = tablo(
    c,
    d,
    K,
    arizaY + arizaBoy + 14,
    kalemSutunlari(METIN.parcaNo, METIN.parcaAdi, METIN.birimFiyat, METIN.parcaTutari),
    v.parcalar.slice(0, 10),
    { enAz: 5, satirBoy: cok ? 40 : 46 },
  )

  /* --------------------------------------------------- İşçilik */
  d.yaz(METIN.iscilik, K + 4, yy + 36, { boy: 21, renk: RENK.deger })
  yy = tablo(
    c,
    d,
    K,
    yy + 46,
    v.iscilikSaatli
      ? kalemSutunlari(METIN.iscilikNo, METIN.iscilikTanimi, METIN.saatUcreti, METIN.iscilikTutari, METIN.iscilikSaat)
      : kalemSutunlari(METIN.iscilikNo, METIN.iscilikTanimi, METIN.iscilikFiyati, METIN.iscilikTutari),
    v.iscilik,
    { enAz: cok ? 1 : 2 },
  )

  /* ------------------------------------------------------- Yol */
  d.yaz(METIN.yol, K + 4, yy + 36, { boy: 21, renk: RENK.deger })
  yy = tablo(
    c,
    d,
    K,
    yy + 46,
    [
      { ad: METIN.cikisKm, en: 270, alan: 'cikisKm', hiza: 'center' },
      { ad: METIN.varisKm, en: 270, alan: 'varisKm', hiza: 'center' },
      { ad: METIN.netKm, en: 270, alan: 'netKm', hiza: 'center' },
      { ad: METIN.kmUcreti, en: 270, alan: 'kmUcreti', hiza: 'center' },
      { ad: METIN.yolTutari, alan: 'yolTutari', hiza: 'right' },
    ],
    [v],
    { satirBoy: 52 },
  )

  /* ------------------------------------ Taahhüt ve toplamlar */
  const altY = yy + 30
  const toplamX = K + EN - 740
  const toplamSatir = 54
  d.kutu(toplamX, altY, 740, toplamSatir * 3)
  d.cizgi(toplamX + 330, altY, toplamX + 330, altY + toplamSatir * 3)
  ;[
    [METIN.toplam, v.toplam],
    [METIN.kdv, ''],
    [METIN.genelToplam, ''],
  ].forEach(([etiket, deger], i) => {
    const sy = altY + i * toplamSatir
    if (i) d.cizgi(toplamX, sy, toplamX + 740, sy)
    d.yaz(d.sigdir(etiket, 300, 20, 700), toplamX + 16, sy + 35, { boy: 20 })
    d.deger(deger, toplamX + 740 - 16, sy + 36, 380, { hiza: 'right' })
  })

  const taahhutEn = toplamX - K - 40
  d.satirlar(METIN.taahhut, taahhutEn, 23).forEach((s, i) => {
    d.yaz(s, K, altY + 30 + i * 34, { boy: 23, kalin: 500, renk: RENK.etiket })
  })

  /* ------------------------------------------------------ İmzalar */
  const imzaY = altY + toplamSatir * 3 + 70
  const imzaBlok = (baslik, ad, x0) => {
    d.yaz(baslik, x0, imzaY, { boy: 22, renk: RENK.deger })
    const satir = (etiket, deger, y) => {
      d.yaz(`${etiket} :`, x0, y, { boy: 20 })
      d.deger(deger, x0 + 170, y, 480)
      d.cizgi(x0 + 170, y + 10, x0 + 650, y + 10, { noktali: true })
    }
    satir(METIN.adiSoyadi, ad, imzaY + 56)
    satir(METIN.tarih, v.tarih, imzaY + 110)
    satir(METIN.imza, '', imzaY + 190)
  }
  imzaBlok(METIN.musteriImza, v.musteriAdi, K)
  imzaBlok(METIN.servisImza, v.servisAdi, K + EN / 2 + 40)

  return tuval
}

/* DOSYA ADINDA ÜRETİLDİĞİ GÜN (28 Eylül 2026, kullanıcının isteği):
   "servis-formu-SRV2609211588-28-09-2026.pdf". Talep numarası kalıyor:
   aynı gün iki işin formu alınınca biri ötekinin üstüne yazılmasın.
   Tarih gün-ay-yıl, tireyle: basılı formdaki sırayla aynı; eğik çizgi
   ve nokta dosya adında sorun çıkarıyor. Formun İÇİNDEKİ tarih servisin
   yapıldığı gün, bu ise formun alındığı gün. */
export function servisFormuDosyaAdi(talep, an = new Date()) {
  const iki = (n) => String(n).padStart(2, '0')
  const gun = `${iki(an.getDate())}-${iki(an.getMonth() + 1)}-${an.getFullYear()}`
  return `servis-formu-${talep.no || 'talep'}-${gun}.pdf`
}

/** Formu PDF olarak üretir ve paylaşır (telefonda) ya da indirir. */
export async function servisFormuPaylas(talep, servisAd) {
  const tuval = await servisFormuCiz(servisFormuVerisi(talep, servisAd))
  const jpeg = await tuvaldenJpeg(tuval, 0.9)
  const pdf = jpegdenPdf([{ jpeg, genislik: tuval.width, yukseklik: tuval.height }])
  await dosyaPaylas(pdf, servisFormuDosyaAdi(talep), METIN.paylasmaBasligi)
}
