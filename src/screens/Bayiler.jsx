import { useMemo } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { bayiIleGore } from '../marka'
import { araProps, telFirma } from '../lib/tel'
import { makineninKaydi } from '../lib/servisAtama'
import { SIRKET, MARKA } from '../marka'
import {
  IconPin, IconPhone, IconRight, IconAlert, IconMail, IconCheckCircle,
} from '../components/Icons'

/* ==========================================================================
   Bayi ve İletişim

   Bayi makineyi satan taraf. Müşterinin buradaki sorusu iki tane:
   "makinemi aldığım yer neresiydi" ve "kimseye ulaşamazsam kimi
   ararım".

   HARİTA KALDIRILDI

   Ekranda bir yön haritası vardı: konum izni isteniyor, bayiler
   gerçek yönlerinde bir daire üzerine yerleştiriliyordu. Kaldırıldı.
   Çiftçi bayiyi haritadan bulmuyor, telefonla arıyor; harita bir
   konum izni ve bir ekran dolusu yer karşılığında hiçbir soruya
   cevap vermiyordu. Konum izni de bu ekranda artık hiç istenmiyor.

   SIRALAMA: müşterinin kayıtlı ili önce geliyor. Bunun için izne
   gerek yok, il zaten hesabında yazılı.

   SERVİS BURADA DEĞİL. Müşteriye bakan servis ana sayfada, kendi
   kartında duruyor (bkz. screens/Home.jsx → Servisim). Bayi ile
   servis ayrı taraflar; aynı listede yan yana durmaları ikisini tek
   şey gibi gösteriyordu.
   ========================================================================== */

export default function Bayiler() {
  const { user, machines, showToast } = useApp()
  const { t } = useDil()

  const bayiler = useMemo(() => bayiIleGore(user?.il), [user?.il])

  /* Müşterinin makinesini aldığı bayi biliniyorsa listenin başında,
     kendi başlığıyla duruyor. LOGO kapalıyken bu alan personel
     backoffice'ten girmedikçe boş kalıyor. */
  const kendiBayileri = useMemo(() => {
    const idler = new Set()
    for (const m of machines) {
      const kayit = makineninKaydi(m.serial)
      if (kayit?.bayiId) idler.add(kayit.bayiId)
    }
    return bayiler.filter((b) => idler.has(b.id))
  }, [machines, bayiler])

  const digerleri = bayiler.filter((b) => !kendiBayileri.includes(b))

  return (
    <div className="app">
      <TopBar title={t('bayi.baslik')} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        {/* Merkez — telefon ve e-posta. En üstte: bu ekranın asıl
            sebebi "kimseye ulaşamıyorum" hâli. */}
        <div className="card card--brand">
          <div className="card__title" style={{ fontSize: 18 }}>{MARKA}</div>
          <div className="card__sub">{t('bayi.merkezAlt')}</div>
          <a
            className="btn btn--on-dark"
            style={{ marginTop: 14 }}
            {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
          >
            <IconPhone size={20} /> {SIRKET.telefon}
          </a>
          <a
            className="btn btn--on-dark"
            style={{ marginTop: 10 }}
            href={`mailto:${SIRKET.eposta}`}
          >
            <IconMail size={20} /> {SIRKET.eposta}
          </a>
        </div>

        {kendiBayileri.length > 0 && (
          <>
            <div className="sectionhead">
              <h2>{t('bayi.benimBayim')}</h2>
            </div>
            <div className="stack">
              {kendiBayileri.map((b) => (
                <BayiKarti key={b.id} bayi={b} showToast={showToast} kendi />
              ))}
            </div>
          </>
        )}

        <div className="sectionhead">
          <h2>{t('bayi.bayiler')}</h2>
          <span className="sectionhead__count">{digerleri.length}</span>
        </div>

        <div className="stack">
          {digerleri.map((b) => (
            <BayiKarti key={b.id} bayi={b} showToast={showToast} />
          ))}
        </div>

        <div
          className="card"
          style={{ marginTop: 18, background: 'var(--pk-orange-soft)', boxShadow: 'none' }}
        >
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--pk-orange-ink)', flex: 'none' }}>
              <IconAlert size={21} />
            </span>
            <p className="small" style={{ lineHeight: 1.6 }}>
              <strong>{t('bayi.temsili')}</strong> {t('bayi.temsiliAlt')}
            </p>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}

function BayiKarti({ bayi, showToast, kendi }) {
  const { t } = useDil()
  const numara = telFirma(bayi.tel)

  return (
    <div className={'card' + (kendi ? ' card--vurgulu' : '')}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="listitem__icon">
          {kendi ? <IconCheckCircle size={21} /> : <IconPin size={21} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__title">{bayi.ad}</div>
          <div className="card__sub">
            {bayi.ilce} / {bayi.il}
          </div>
          {bayi.adres && (
            <div className="card__sub" style={{ marginTop: 2 }}>{bayi.adres}</div>
          )}
          {kendi && (
            <div className="row" style={{ marginTop: 9 }}>
              <span className="badge badge--blue">{t('bayi.buradanAldiniz')}</span>
            </div>
          )}
        </div>
      </div>

      {numara && (
        <a
          className="btn btn--soft btn--sm"
          style={{ marginTop: 12 }}
          {...araProps(bayi.tel, numara, showToast)}
        >
          <IconPhone size={19} /> {numara}
          <span className="spacer" />
          <IconRight size={18} />
        </a>
      )}
    </div>
  )
}
