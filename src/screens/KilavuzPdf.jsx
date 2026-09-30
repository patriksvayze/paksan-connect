import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { useDil } from '../i18n'
import { getProduct, urunDilde } from '../marka'
import { IconAlert, IconBook, IconMinus, IconPaylas, IconPlus, IconTrash } from '../components/Icons'
import { dosyaPaylas } from '../lib/dosyaPaylas'
import {
  boyutYaz,
  kalici,
  kayitliKilavuz,
  kilavuzAdi,
  kilavuzDurumu,
  kilavuzKodu,
  kilavuzListesiGetir,
  kilavuzuIndir,
  kilavuzuSil,
  sonKilavuzListesi,
} from '../lib/kilavuzPdf'

/* ==========================================================================
   Kullanım kılavuzu — PAKSAN'ın basılı kılavuzunun PDF'i, uygulamanın içinde

   29 EYLÜL 2026'DAN BERİ (kullanıcının kararı). Önce kılavuzun içeriği
   uygulamaya gömülü bir paketten bölüm bölüm çiziliyordu (güvenlik,
   kullanım adımları, teknik bilgiler, arıza tablosu). Kullanıcı "çok
   karmaşık" buldu; sorun çözmenin yeri zaten Destek. Şimdi kılavuzun
   kendisi: sunucudaki klasörden bir kez indiriliyor, telefonda saklanıyor
   ve tarlada internetsiz açılıyor (bkz. lib/kilavuzPdf.js).

   NEDEN UYGULAMANIN İÇİNDE AÇILIYOR. Telefonun kendi PDF açıcısına
   vermek her telefonda başka davranıyor: kimi indirip bildirimlere
   bırakıyor, kimi paylaşma penceresi açıyor. Uygulama içinde çiziliyor
   (pdf.js), her telefonda aynı. pdf.js ağır; yalnız kılavuz açılınca
   yükleniyor, uygulamanın açılışına girmiyor. Eski Android'lerin tarayıcı
   motoru için "legacy" sürümü.

   BÜYÜTME DÜĞMEYLE. Uygulamanın kabuğunda iki parmakla büyütme kapalı
   (index.html); kılavuzun küçük yazısı için alttaki düğmeler var.

   PAYLAŞ (29 Eylül 2026, kullanıcının onayı). Kılavuz telefonun
   İndirilenler klasörüne inmiyor: orada çiftçi onu bulamaz, yeni baskıyı
   uygulama izleyemez, Destek arıza sayfasına atlatamaz. Dosyayı dışarı
   çıkarmak isteyen için "Paylaş": telefonun paylaşma ekranı açılıyor
   (WhatsApp, e-posta, Dosyalar'a kaydet). Tarayıcıda dosya iniyor
   (lib/dosyaPaylas.js). Düğme kılavuzun hemen üstünde: önce en alttaydı,
   kullanıcı "çok gizli kalmış" dedi.

   SAYFAYA ATLAMA. Destek'ten "Kılavuzdaki arıza tablosu" ile gelinince
   (?bolum=ariza) arıza tablosunun sayfası açılıyor; sayfa numarası
   sunucudaki listede (`arizaSayfasi`). `?sayfa=N` de çalışıyor.
   ========================================================================== */

/* Tek işçi, bütün kılavuzlar için. pdf.js her belgeye ayrı işçi açıp
   belge kapanınca kapatıyordu; ikinci kılavuz işçi dosyasını yeniden
   istiyordu. İşçi uygulamayla açılıp açık kalıyor. */
let pdfjsIstegi = null
function pdfKutuphanesi() {
  if (!pdfjsIstegi) {
    pdfjsIstegi = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.min.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, isci]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = isci.default
      return { pdfjs, isci: new pdfjs.PDFWorker({ name: 'kilavuz' }) }
    })
    pdfjsIstegi.catch(() => {
      pdfjsIstegi = null
    })
  }
  return pdfjsIstegi
}

const HATA_ANAHTARI = {
  'internet-yok': 'kilavuz.internetYok',
  sunucu: 'kilavuz.indirilemedi',
  bozuk: 'kilavuz.indirilemedi',
  acilamadi: 'kilavuz.acilamadi',
}

export default function KilavuzPdf() {
  const { productId } = useParams()
  const [params] = useSearchParams()
  const { t, dil } = useDil()
  const p = urunDilde(getProduct(productId), dil)
  const kod = kilavuzKodu(productId)

  const [liste, setListe] = useState(() => sonKilavuzListesi())
  const bilgi = kod ? liste[kod] || null : null
  /* bakiliyor → (telefonda varsa) acik; yoksa bilgi → iniyor → acik.
     Her adımda hata olabiliyor. */
  const [hal, setHal] = useState('bakiliyor')
  const [hata, setHata] = useState(null)
  const [ilerleme, setIlerleme] = useState(0)
  const [belge, setBelge] = useState(null)
  /* Telefondaki baskı eski, sunucuda yenisi var. */
  const [eski, setEski] = useState(false)
  /* Açık kılavuz telefonda saklı mı: "Telefondan Sil" yalnız öyleyse
     (yer dolup saklanamadıysa değil). */
  const [kayitli, setKayitli] = useState(false)
  /* Yeni baskı inerken hata: eski baskı açık kalıyor, hata onun üstünde. */
  const [yeniHata, setYeniHata] = useState(null)
  const [paylasiliyor, setPaylasiliyor] = useState(false)
  const [paylasHata, setPaylasHata] = useState(false)
  const belgeRef = useRef(null)
  const durdurucu = useRef(null)
  /* Ekrandan çıkıldıysa yarım kalan açılış belgeyi bırakıyor; yoksa ortak
     işçide sahipsiz bir belge kalırdı (son inceleme). */
  const canli = useRef(true)

  function listeyiGetir() {
    return kilavuzListesiGetir()
      .then((l) => {
        setListe(l)
        return l
      })
      .catch(() => null)
  }

  useEffect(() => {
    canli.current = true
    listeyiGetir()
    return () => {
      canli.current = false
      durdurucu.current?.abort()
      belgeRef.current?.loadingTask.destroy()
      belgeRef.current = null
    }
  }, [])

  async function ac(bayt) {
    try {
      const { pdfjs, isci } = await pdfKutuphanesi()
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bayt), worker: isci, isEvalSupported: false }).promise
      if (!canli.current) {
        doc.loadingTask.destroy()
        return
      }
      belgeRef.current?.loadingTask.destroy()
      belgeRef.current = doc
      setBelge(doc)
      setHal('acik')
    } catch {
      if (!canli.current) return
      setHata('acilamadi')
      setHal('hata')
    }
  }

  /* Telefonda kayıtlıysa doğrudan açılıyor. Liste sonradan gelir ve yeni
     baskı çıkmışsa açık kılavuz değişmiyor, yalnız "yenisi var" diyor. */
  useEffect(() => {
    if (!kod) return undefined
    let iptal = false
    ;(async () => {
      if (belgeRef.current) {
        if (bilgi) setEski((await kilavuzDurumu(kod, bilgi)) === 'eski')
        return
      }
      const bayt = await kayitliKilavuz(kod, bilgi)
      if (iptal || belgeRef.current) return
      if (!bayt) {
        setHal((h) => (h === 'bakiliyor' ? 'bilgi' : h))
        return
      }
      if (bilgi) setEski((await kilavuzDurumu(kod, bilgi)) === 'eski')
      if (iptal) return
      setKayitli(true)
      await ac(bayt)
    })()
    return () => {
      iptal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kod, bilgi?.dosya])

  async function indir() {
    let b = bilgi
    if (!b) {
      /* Liste hiç gelmemişti (ilk açılış internetsiz): önce liste. */
      setHal('bakiliyor')
      b = (await listeyiGetir())?.[kod]
      if (!b) {
        setHata('internet-yok')
        setHal('hata')
        return
      }
    }
    const d = new AbortController()
    durdurucu.current = d
    setIlerleme(0)
    setYeniHata(null)
    setHal('iniyor')
    try {
      const { bayt, kayitli: saklandi } = await kilavuzuIndir(kod, b, { ilerleme: setIlerleme, sinyal: d.signal })
      if (!canli.current) return
      setEski(false)
      setKayitli(saklandi)
      await ac(bayt)
    } catch (e) {
      if (!canli.current) return
      if (e?.name === 'AbortError') {
        setHal(belgeRef.current ? 'acik' : 'bilgi')
        return
      }
      const neden = e?.message in HATA_ANAHTARI ? e.message : 'sunucu'
      /* Yeni baskı inmediyse telefondaki eski baskı açık kalıyor; hata
         "yeni baskı" şeridinde. Önce ekran boş hata kartına dönüyor ve
         "telefonunuzda kayıtlı değil" diyordu (son inceleme). */
      if (belgeRef.current) {
        setYeniHata(neden)
        setHal('acik')
        return
      }
      setHata(neden)
      setHal('hata')
    } finally {
      durdurucu.current = null
    }
  }

  /* Paylaşılan dosyanın adı kılavuzun adı: çiftçi WhatsApp'ta ya da
     Dosyalar'da "hammer-kullanim-kilavuzu-20251201.pdf"yi tanımaz.
     Dosya adında olamayacak işaretler atılıyor. */
  async function paylas() {
    const doc = belgeRef.current
    if (!doc || paylasiliyor) return
    const ad = kilavuzAdi(bilgi, dil) || p.name
    setPaylasHata(false)
    setPaylasiliyor(true)
    try {
      const bayt = await doc.getData()
      const dosyaAdi = ad.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf'
      await dosyaPaylas(bayt, dosyaAdi, ad)
    } catch {
      if (canli.current) setPaylasHata(true)
    } finally {
      if (canli.current) setPaylasiliyor(false)
    }
  }

  async function sil() {
    setPaylasHata(false)
    await kilavuzuSil(kod)
    belgeRef.current?.loadingTask.destroy()
    belgeRef.current = null
    setBelge(null)
    setEski(false)
    setKayitli(false)
    setHal('bilgi')
  }

  if (!p || !kod) {
    return (
      <div className="app">
        <TopBar title={t('urun.kilavuz')} back />
        <div className="screen wrap">
          <div className="empty">
            <IconBook size={64} />
            <p>{p ? t('kilavuz.kilavuzYok') : t('detay.urunYok')}</p>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  const boyut = bilgi ? boyutYaz(bilgi.boyut, dil) : ''
  const baslangic =
    Number(params.get('sayfa')) || (params.get('bolum') === 'ariza' ? bilgi?.arizaSayfasi : 0) || 1

  return (
    <div className="app">
      <TopBar title={t('urun.kilavuz')} sub={p.name} back />

      <div className="screen wrap kilavuz-pdf">
        {/* Hangi kılavuz, kaç sayfa, ne kadar yer: indirmeden önce
            çiftçi dosyanın büyüklüğünü bilmeli (köyde mobil veri). */}
        <header className="kilavuz-kapak">
          <UrunFoto urunId={p.id} ad={p.name} tip="thumb" ikonBoyut={24} />
          <div className="kilavuz-kapak__metin">
            <div className="kilavuz-kapak__ad">{kilavuzAdi(bilgi, dil) || p.name}</div>
            {bilgi && (
              <div className="kilavuz-kapak__alt">
                {t('kilavuz.ozet', { sayfa: bilgi.sayfa, boyut })}
              </div>
            )}
            {bilgi?.diller?.length > 0 && (
              <div className="kilavuz-kapak__alt">
                {bilgi.diller.includes('en') ? t('kilavuz.dilIkisi') : t('kilavuz.dilTurkce')}
              </div>
            )}
          </div>
        </header>

        {hal === 'bakiliyor' && <p className="kilavuz-pdf__bekle">{t('ortak.yukleniyor')}</p>}

        {hal === 'bilgi' && (
          <section className="kilavuz-pdf__kart">
            <h2 className="kilavuz-pdf__baslik">{t('kilavuz.indirBaslik')}</h2>
            <p>{kalici ? t('kilavuz.indirAlt') : t('kilavuz.indirAltGecici')}</p>
            <button type="button" className="btn btn--lg btn--primary" onClick={indir}>
              {bilgi ? t('kilavuz.indir', { boyut }) : t('kilavuz.indirBoyutsuz')}
            </button>
          </section>
        )}

        {hal === 'iniyor' && (
          <section className="kilavuz-pdf__kart" aria-live="polite">
            <div className="bakim-ilerleme">
              <div
                className="bakim-ilerleme__cubuk"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ilerleme * 100)}
              >
                <span style={{ width: `${Math.round(ilerleme * 100)}%` }} />
              </div>
              <div className="bakim-ilerleme__yazi">
                {t('kilavuz.indiriliyor', { yuzde: Math.round(ilerleme * 100) })}
              </div>
            </div>
            <button type="button" className="btn btn--soft" onClick={() => durdurucu.current?.abort()}>
              {t('ortak.vazgec')}
            </button>
          </section>
        )}

        {hal === 'hata' && (
          <section className="kilavuz-pdf__kart kilavuz-pdf__kart--hata" role="alert">
            <IconAlert size={22} />
            <p>{t(HATA_ANAHTARI[hata] || 'kilavuz.indirilemedi')}</p>
            <button type="button" className="btn btn--soft" onClick={indir}>
              {t('kilavuz.tekrarDene')}
            </button>
          </section>
        )}

        {hal === 'acik' && belge && (
          <>
            {eski && bilgi && (
              <div className="kilavuz-pdf__yeni" role="status">
                <p>{t('kilavuz.yeniBaski')}</p>
                {yeniHata && <p className="kilavuz-pdf__yeni-hata">{t(HATA_ANAHTARI[yeniHata])}</p>}
                <button type="button" className="btn btn--soft" onClick={indir}>
                  {t('kilavuz.yenisiniIndir', { boyut })}
                </button>
              </div>
            )}
            <div className="kilavuz-pdf__paylas">
              <button type="button" className="btn btn--soft" onClick={paylas} disabled={paylasiliyor}>
                <IconPaylas size={18} />
                {t('kilavuz.paylas')}
              </button>
              {paylasHata && (
                <p className="kilavuz-pdf__paylas-hata" role="alert">
                  {t('kilavuz.paylasilamadi')}
                </p>
              )}
            </div>
            <Sayfalar belge={belge} baslangic={baslangic} t={t} />
            {/* Dip hep var: son sayfa alttaki araç çubuğunun altında
                kalmasın. "Telefondan Sil" yalnız kılavuz saklıysa. */}
            <div className="kilavuz-pdf__dip">
              {kayitli && (
                <button type="button" className="btn btn--ghost" onClick={sil}>
                  <IconTrash size={18} />
                  {t('kilavuz.telefondanSil')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <TabBar />
    </div>
  )
}

/* ------------------------------------------------------------ Sayfalar */

const YAKINLIK = [1, 1.5, 2, 3]

function Sayfalar({ belge, baslangic, t }) {
  const kap = useRef(null)
  const [genislik, setGenislik] = useState(0)
  const [yakin, setYakin] = useState(0)
  const [oran, setOran] = useState(1.414)
  const [simdiki, setSimdiki] = useState(1)
  const atlandi = useRef(false)
  const sayfaSayisi = belge.numPages

  /* Sütunun genişliği: telefon döndürülünce de. */
  useLayoutEffect(() => {
    const olc = () => setGenislik(kap.current?.clientWidth || 0)
    olc()
    const g = new ResizeObserver(olc)
    g.observe(kap.current)
    return () => g.disconnect()
  }, [])

  /* Çizilmemiş sayfaların yeri ilk sayfanın oranıyla ayrılıyor. */
  useEffect(() => {
    let iptal = false
    belge.getPage(1).then((s) => {
      const v = s.getViewport({ scale: 1 })
      if (!iptal) setOran(v.height / v.width)
    })
    return () => {
      iptal = true
    }
  }, [belge])

  function sayfayaGit(no, davranis = 'auto') {
    document.getElementById('kilavuz-sayfa-' + no)?.scrollIntoView({ block: 'start', behavior: davranis })
  }

  /* İstenen sayfaya bir kez, yer ayrıldıktan sonra. */
  useEffect(() => {
    if (atlandi.current || !genislik) return
    atlandi.current = true
    if (baslangic > 1) requestAnimationFrame(() => sayfayaGit(Math.min(baslangic, sayfaSayisi)))
  }, [genislik, baslangic, sayfaSayisi])

  /* Hangi sayfadayız: ekranın üst üçte birine giren ilk sayfa. */
  useEffect(() => {
    let kare = 0
    const bak = () => {
      cancelAnimationFrame(kare)
      kare = requestAnimationFrame(() => {
        const cizgi = window.innerHeight / 3
        const sayfalar = kap.current?.querySelectorAll('.kilavuz-pdf-sayfa') || []
        for (const el of sayfalar) {
          if (el.getBoundingClientRect().bottom > cizgi) {
            setSimdiki(Number(el.dataset.no))
            break
          }
        }
      })
    }
    window.addEventListener('scroll', bak, { passive: true })
    bak()
    return () => {
      cancelAnimationFrame(kare)
      window.removeEventListener('scroll', bak)
    }
  }, [genislik])

  /* Büyütünce aynı sayfada kalınıyor. */
  const oncekiYakin = useRef(yakin)
  useLayoutEffect(() => {
    if (oncekiYakin.current === yakin) return
    oncekiYakin.current = yakin
    sayfayaGit(simdiki)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yakin])

  const sayfaGenisligi = Math.floor(genislik * YAKINLIK[yakin])

  return (
    <>
      <div className="kilavuz-pdf-sayfalar" ref={kap}>
        <div className="kilavuz-pdf-sayfalar__ic" style={{ width: sayfaGenisligi || undefined }}>
          {genislik > 0 &&
            Array.from({ length: sayfaSayisi }, (_, i) => (
              <PdfSayfa
                key={i + 1}
                belge={belge}
                no={i + 1}
                genislik={sayfaGenisligi}
                oran={oran}
                ad={t('kilavuz.sayfaKonumu', { n: i + 1, toplam: sayfaSayisi })}
              />
            ))}
        </div>
      </div>

      {/* Başparmağın yetiştiği yerde, alt menünün hemen üstünde. */}
      <div className="kilavuz-pdf-arac" role="toolbar" aria-label={t('urun.kilavuz')}>
        <button
          type="button"
          className="kilavuz-pdf-arac__dugme"
          onClick={() => setYakin((y) => Math.max(0, y - 1))}
          disabled={yakin === 0}
        >
          <IconMinus size={20} />
          {t('kilavuz.kucult')}
        </button>
        {/* Görünen yalnız rakam: 360 piksellik telefonda iki düğmeyle
            aynı satıra sığsın. Ekran okuyucu cümleyi okuyor. */}
        <span
          className="kilavuz-pdf-arac__sayfa"
          aria-label={t('kilavuz.sayfaKonumu', { n: simdiki, toplam: sayfaSayisi })}
        >
          {simdiki} / {sayfaSayisi}
        </span>
        <button
          type="button"
          className="kilavuz-pdf-arac__dugme"
          onClick={() => setYakin((y) => Math.min(YAKINLIK.length - 1, y + 1))}
          disabled={yakin === YAKINLIK.length - 1}
        >
          <IconPlus size={20} />
          {t('kilavuz.buyut')}
        </button>
      </div>
    </>
  )
}

/* Bir sayfa: ekrana yaklaşınca çiziliyor, uzaklaşınca tuvali
   bırakılıyor. 164 sayfalık kılavuzun hepsi aynı anda çizilse telefonun
   belleği yetmezdi. */
function PdfSayfa({ belge, no, genislik, oran, ad }) {
  const kutu = useRef(null)
  const tuval = useRef(null)
  /* Sayfanın pdf.js nesnesi. Ekrandan uzaklaşınca `cleanup()` ile
     çözülmüş görselleri bırakılıyor: tuvali boşaltmak yetmiyordu, 164
     sayfalık Orka baştan sona okununca bellek ~390 MB'a çıkıyordu (son
     inceleme). Büyütmede bırakılmıyor, sayfa yeniden çözülmesin. */
  const vekil = useRef(null)
  const [yakinda, setYakinda] = useState(false)
  const [kendiOran, setKendiOran] = useState(null)

  useEffect(() => {
    const g = new IntersectionObserver(([k]) => setYakinda(k.isIntersecting), { rootMargin: '1200px 0px' })
    g.observe(kutu.current)
    return () => g.disconnect()
  }, [])

  useEffect(() => {
    const c = tuval.current
    if (!yakinda || !genislik) {
      c.width = 0
      c.height = 0
      vekil.current?.cleanup()
      vekil.current = null
      return undefined
    }
    let iptal = false
    let gorev = null
    belge.getPage(no).then((sayfa) => {
      if (iptal) return
      vekil.current = sayfa
      const bir = sayfa.getViewport({ scale: 1 })
      setKendiOran(bir.height / bir.width)
      /* Keskin yazı için ekranın piksel yoğunluğuyla; tuval 4096
         pikseli geçmiyor (telefonların tuval sınırı). */
      const yogunluk = Math.min(window.devicePixelRatio || 1, 2)
      const olcek = Math.min((genislik * yogunluk) / bir.width, 4096 / bir.width)
      const gorunum = sayfa.getViewport({ scale: olcek })
      c.width = Math.floor(gorunum.width)
      c.height = Math.floor(gorunum.height)
      gorev = sayfa.render({ canvas: c, viewport: gorunum })
      gorev.promise.catch(() => {})
    })
    return () => {
      iptal = true
      gorev?.cancel()
    }
  }, [yakinda, genislik, no, belge])

  return (
    <div
      ref={kutu}
      id={'kilavuz-sayfa-' + no}
      data-no={no}
      className="kilavuz-pdf-sayfa"
      style={{ width: genislik, height: Math.round(genislik * (kendiOran || oran)) }}
    >
      <canvas ref={tuval} role="img" aria-label={ad} />
    </div>
  )
}
