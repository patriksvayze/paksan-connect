import { useEffect, useRef, useState } from 'react'
import { ekAdresi } from '../lib/ekler'
import { altBilgi } from '../data/duyuruTurleri'
import {
  IconAlert, IconBack, IconBell, IconCalendar, IconClose, IconMachine, IconRight, IconTag, IconUndo,
} from './Icons'

/* ==========================================================================
   Duyuru penceresi — PAKSAN Connect ve PAKSAN Servisim ortak (9 Ekim 2026)

   KULLANICININ İSTEĞİ: "Yeni duyuruda ekrana gelen bildirim ekranını
   geliştirelim, çok düşük ve kalitesiz kaldı … eğer yayında daha fazla
   duyuru varsa o duyurular arasında geçiş de yapabilsin kullanıcı, pop-up
   gelen duyurulardaki sayfa geçişleri gibi." Biçim kullanıcının seçimi:
   "Ortada kart". Aynı gün Servisim'de de çıkması istendi.

   ÖNCEKİ HÂLİ Connect'te alttan açılan yapraktaki küçük bir kutuydu: türün
   şeridi, başlık ve metin, altında "Sonraki" düğmesi. Görsel yoksa ekranın
   üçte birini dolduruyordu; geri dönülemiyordu, kaç duyuru olduğu
   bilinmiyordu. Servisim'de pencere hiç yoktu.

   ŞİMDİ
     · Ekranın ortasında kart. Üstte duyurunun KAPAĞI: görsel varsa görsel,
       yoksa türün renginde geniş alan ve türün simgesi; türün adı kapağın
       köşesinde. Kampanya ile güvenlik uyarısı başlık okunmadan ayırt
       ediliyor.
     · Yayında birden çok duyuru varsa kart sayfalanıyor: sayfa noktaları
       (dokununca o duyuruya), "Önceki" / "Sonraki" ve parmakla yana
       kaydırma. Kaydırma tek yol değil: düğmeler her zaman var (gizli
       etkileşim kuralı, CLAUDE.md).
     · Son sayfada ana düğme "Anladım"; altında bütün bildirimler.
     · Görülmemiş duyurunun yanında "Yeni" rozeti.

   BU BİLEŞEN YALNIZ ÇİZİYOR. Hangi duyuruların, hangi sırayla geleceğine
   ve "görüldü" bilgisinin nereye yazılacağına iki uygulama kendisi karar
   veriyor (components/Duyuru.jsx, servis/DuyuruAcilir.jsx): hedefleme,
   izin kuralı ve depo anahtarı ikisinde ayrı. Yazılar da dışarıdan
   geliyor: Connect iki dilli (sözlük), Servisim tek dilli; bileşen
   sözlüğü içe aktarsaydı Connect'in sözlüğü servis APK'sına girerdi.

   CSS İKİ KÖKTE AYNI SINIFLA (`.dpen*`): Connect styles.css'te kendi
   token'larıyla, Servisim servis.css'te `.uyg` altında. Token'lar
   paylaşılmıyor (CLAUDE.md).
   ========================================================================== */

const IKONLAR = {
  etiket: IconTag,
  makine: IconMachine,
  takvim: IconCalendar,
  uyari: IconAlert,
  geri: IconUndo,
}

/* Sekizden fazla duyuruda noktalar sığmıyor ve sayılamıyor; yerine
   "3 / 12" yazıyor. */
const NOKTA_SINIRI = 8
/* Parmağın sayfayı değiştirmesi için gereken yol ya da hız. Yaprağı
   kapatan sürüklemenin eşikleriyle aynı mertebe (Chrome.jsx → Sheet). */
const KAYDIRMA_ESIGI = 56
const HIZ_ESIGI = 0.45
/* Parmak hangi yöne gidiyor: bu kadar pikselden sonra karar veriliyor.
   Dikey ise sayfanın kendi kaydırması (uzun metin) çalışıyor. */
const YON_ESIGI = 8

/**
 * @param {object} p
 * @param {Array} p.duyurular  gösterilecek duyurular, sırasıyla
 * @param {(d: object) => boolean} p.yeniMi  "Yeni" rozeti çıksın mı
 * @param {object} p.yazi  { kapat, onceki, sonraki, anladim, tumu, yeni, nokta(n), pencere(d) }
 * @param {(d: object) => string} p.turAdi  türün ekrandaki adı
 * @param {(d: object) => string} p.tarih  yayın günü
 * @param {(d: object) => void} p.onGoster  sayfa ekrana gelince (görüldü yazmak için)
 * @param {() => void} p.onKapat
 * @param {(() => void)|null} p.onTumu  bütün bildirimler; yoksa düğme çizilmiyor
 */
export function DuyuruPenceresi({ duyurular, yeniMi, yazi, turAdi, tarih, onGoster, onKapat, onTumu }) {
  const [sira, setSira] = useState(0)
  const [cekme, setCekme] = useState(0)
  const [cekiliyor, setCekiliyor] = useState(false)
  const bas = useRef(null)
  const kart = useRef(null)
  /* Sürükleme bittiği anda gelen tıklama bir düğmeye ya da zemine
     düşmesin. */
  const tiklamayiYut = useRef(false)

  const toplam = duyurular.length
  const acik = duyurular[Math.min(sira, toplam - 1)]
  const son = sira >= toplam - 1

  const goster = useRef(onGoster)
  goster.current = onGoster
  useEffect(() => {
    if (acik) goster.current?.(acik)
  }, [acik])

  /* Klavye (tarayıcıda ve klavyeli telefonda): oklar ve Esc. */
  useEffect(() => {
    kart.current?.focus({ preventScroll: true })
  }, [])

  if (!acik) return null

  const git = (i) => setSira(Math.max(0, Math.min(toplam - 1, i)))

  function basla(e) {
    if (toplam < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return
    bas.current = { x: e.clientX, y: e.clientY, t: performance.now(), yon: null, id: e.pointerId }
  }

  function hareket(e) {
    const b = bas.current
    if (!b || b.id !== e.pointerId) return
    const dx = e.clientX - b.x
    const dy = e.clientY - b.y
    if (!b.yon) {
      if (Math.abs(dx) < YON_ESIGI && Math.abs(dy) < YON_ESIGI) return
      b.yon = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (b.yon === 'y') return
      setCekiliyor(true)
      /* Yakalama yapılamazsa (parmak çoktan kalktı) sürükleme yine çalışıyor. */
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* yok sayılıyor */
      }
    }
    if (b.yon !== 'x') return
    /* Baştaki ve sondaki sayfada direnç: gidecek sayfa olmadığı belli olsun. */
    const kenar = (sira === 0 && dx > 0) || (son && dx < 0)
    setCekme(kenar ? dx * 0.3 : dx)
  }

  function bitir(e) {
    const b = bas.current
    bas.current = null
    if (!b || b.yon !== 'x') return
    const dx = e.clientX - b.x
    const hiz = Math.abs(dx) / Math.max(1, performance.now() - b.t)
    if (dx < -KAYDIRMA_ESIGI || (dx < 0 && hiz > HIZ_ESIGI)) git(sira + 1)
    else if (dx > KAYDIRMA_ESIGI || (dx > 0 && hiz > HIZ_ESIGI)) git(sira - 1)
    setCekme(0)
    setCekiliyor(false)
    tiklamayiYut.current = true
    setTimeout(() => {
      tiklamayiYut.current = false
    }, 0)
  }

  function vazgec() {
    bas.current = null
    setCekme(0)
    setCekiliyor(false)
  }

  function tus(e) {
    if (e.key === 'Escape') onKapat()
    else if (e.key === 'ArrowRight') git(sira + 1)
    else if (e.key === 'ArrowLeft') git(sira - 1)
  }

  return (
    <div
      className="dpen"
      data-duyuru-penceresi
      onClick={(e) => e.target === e.currentTarget && !tiklamayiYut.current && onKapat()}
    >
      <div
        ref={kart}
        className="dpen__kart"
        role="dialog"
        aria-modal="true"
        aria-label={yazi.pencere(acik)}
        tabIndex={-1}
        onKeyDown={tus}
        onClickCapture={(e) => {
          if (tiklamayiYut.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <div
          className="dpen__pencere"
          onPointerDown={basla}
          onPointerMove={hareket}
          onPointerUp={bitir}
          onPointerCancel={vazgec}
        >
          <div
            className={'dpen__serit' + (cekiliyor ? ' dpen__serit--cekiliyor' : '')}
            style={{ transform: `translateX(calc(${-sira * 100}% + ${cekme}px))` }}
          >
            {duyurular.map((d, i) => (
              <DuyuruSayfasi
                key={d.id}
                duyuru={d}
                gorunur={i === sira}
                yeni={yeniMi(d)}
                yazi={yazi}
                turAdi={turAdi}
                tarih={tarih}
              />
            ))}
          </div>
        </div>

        <button type="button" className="dpen__kapat" data-eylem="duyuru-kapat" onClick={onKapat}>
          <IconClose size={17} />
          {yazi.kapat}
        </button>

        <div className="dpen__dip">
          {toplam > 1 &&
            (toplam <= NOKTA_SINIRI ? (
              <div className="dpen__noktalar">
                {duyurular.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    className={'dpen__nokta' + (i === sira ? ' dpen__nokta--acik' : '')}
                    aria-label={yazi.nokta(i + 1)}
                    aria-current={i === sira ? 'true' : undefined}
                    data-duyuru-nokta={i}
                    onClick={() => git(i)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            ) : (
              <div className="dpen__sayac" aria-live="polite">
                {sira + 1} / {toplam}
              </div>
            ))}

          <div className={'dpen__dugmeler' + (toplam > 1 ? ' dpen__dugmeler--iki' : '')}>
            {toplam > 1 && (
              <button
                type="button"
                className="dpen__dg dpen__dg--ikincil"
                data-eylem="duyuru-onceki"
                disabled={sira === 0}
                onClick={() => git(sira - 1)}
              >
                <IconBack size={18} />
                {yazi.onceki}
              </button>
            )}
            <button
              type="button"
              className="dpen__dg dpen__dg--ana"
              data-eylem={son ? 'duyuru-anladim' : 'duyuru-sonraki'}
              onClick={son ? onKapat : () => git(sira + 1)}
            >
              {son ? yazi.anladim : yazi.sonraki}
              {!son && <IconRight size={18} />}
            </button>
          </div>

          {/* Sıradaki duyuru varken listeye gitme düğmesi yok: arkada
              bekleyen duyuru görülmeden kapanırdı. */}
          {son && onTumu && (
            <button type="button" className="dpen__tumu" onClick={onTumu}>
              {yazi.tumu}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* Bir duyurunun sayfası: kapak (görsel ya da türün rengi), başlık, gün,
   metin. Görünmeyen sayfa `inert`: odak ve ekran okuyucu ona gitmiyor.
   Backoffice'in Duyurular ekranındaki önizleme de bunu çiziyor: personel
   yayımlamadan önce karşı tarafta çıkacak sayfayı görüyor. */
export function DuyuruSayfasi({ duyuru, gorunur = true, yeni = false, yazi = {}, turAdi, tarih }) {
  const bilgi = altBilgi(duyuru)
  const Ikon = IKONLAR[bilgi.ikon] || IconBell
  return (
    <section
      className={'dpen__sayfa dpen--' + bilgi.ton}
      aria-hidden={!gorunur}
      inert={!gorunur}
      data-duyuru-sayfa={duyuru.id}
    >
      <div className={'dpen__kapak' + (duyuru.gorsel ? ' dpen__kapak--gorsel' : '')}>
        {duyuru.gorsel ? (
          <DuyuruGorseli gorsel={duyuru.gorsel} />
        ) : (
          <span className="dpen__simge" aria-hidden="true">
            <Ikon size={40} />
          </span>
        )}
        <span className="dpen__tur">
          <Ikon size={15} />
          {turAdi(duyuru)}
        </span>
      </div>
      <div className="dpen__govde">
        <h2 className="dpen__baslik">{duyuru.baslik}</h2>
        <div className="dpen__bilgi">
          <span>{tarih(duyuru)}</span>
          {yeni && <span className="dpen__yeni">{yazi.yeni}</span>}
        </div>
        <p className="dpen__metin">{duyuru.metin}</p>
      </div>
    </section>
  )
}

/* Duyuru görseli.

   Dosyanın kendisi IndexedDB'de duruyor (backoffice oraya yazıyor); burada
   geçici bir adres üretilip gösteriliyor ve ekrandan çıkarken
   bırakılıyor — yoksa hafızada birikiyor. `contain`: kampanya görselinin
   üzerindeki yazı kırpılmasın. */
export function DuyuruGorseli({ gorsel, className = 'dpen__gorsel' }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(gorsel.id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [gorsel.id])

  if (!adres) return null
  return <img className={className} src={adres} alt="" draggable={false} />
}
