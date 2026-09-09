import { useEffect, useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { yetkiAdi, yakindanUzaga, ileGore } from '../marka'
import { araProps } from '../lib/tel'
import { konumOku, konumDestekleniyorMu, KONUM } from '../lib/konum'
import { BayiHarita } from '../components/BayiHarita'
import { SIRKET, MARKA } from '../marka'
import {
  IconPin, IconPhone, IconRight, IconAlert, IconCheck, IconMail,
} from '../components/Icons'

/* Bayi ve iletişim.

   İKİ HÂL VAR:

   · Kayıt sırasında konuma izin verilmişse (hesapta `konumIzni`), ekran
     açılınca konum sessizce okunuyor ve bayiler yakından uzağa
     sıralanıyor. Telefon bir şey sormuyor — izin zaten verilmiş.
     Kullanıcı hiçbir şeye dokunmuyor.

   · İzin verilmemişse eski davranış: izin ekran açılır açılmaz
     İSTENMEZ. Çiftçi neden sorulduğunu bilmeden izin penceresiyle
     karşılaşmasın diye önce ne işe yaradığı yazılıyor, izni kendisi
     başlatıyor. Vermezse bayiler kayıtlı iline göre sıralanır.

   İzin sonradan telefon ayarlarından kapatılmış olabilir; o zaman
   sessiz okuma hata veriyor ve ekran kendiliğinden ikinci hâle
   dönüyor.                                                             */

const DURUM = {
  basta: 'basta',
  bekliyor: 'bekliyor',
  tamam: 'tamam',
  red: 'red',
  yok: 'yok',
}

export default function Dealers() {
  const { user, showToast } = useApp()
  const { t, dil } = useDil()
  /* Kayıtta izin verildiyse ekran doğrudan "konum aranıyor" hâlinde
     açılıyor; kullanıcı bir an için boş bir düğme görmesin. */
  const izinVarmis = user?.konumIzni === KONUM.VERILDI && konumDestekleniyorMu()
  const [durum, setDurum] = useState(izinVarmis ? DURUM.bekliyor : DURUM.basta)
  const [konum, setKonum] = useState(null)
  /* Haritada dokunulan bayi listede de vurgulanıyor */
  const [secili, setSecili] = useState(null)

  useEffect(() => {
    if (!izinVarmis) return
    let iptal = false
    konumOku()
      .then((k) => {
        if (iptal) return
        setKonum(k)
        setDurum(DURUM.tamam)
      })
      .catch(() => {
        /* İzin telefon ayarlarından kapatılmış olabilir — elle isteme
           hâline dön, kullanıcıya hata gösterme. */
        if (!iptal) setDurum(DURUM.basta)
      })
    return () => { iptal = true }
  }, [izinVarmis])

  const bayiler = konum ? yakindanUzaga(konum.enlem, konum.boylam) : ileGore(user?.il)

  function konumIste() {
    if (!('geolocation' in navigator)) {
      setDurum(DURUM.yok)
      return
    }
    setDurum(DURUM.bekliyor)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setKonum({ enlem: p.coords.latitude, boylam: p.coords.longitude })
        setDurum(DURUM.tamam)
        showToast(t('bayi.konumAlindiAlt'))
      },
      () => setDurum(DURUM.red),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    )
  }

  return (
    <div className="app">
      <TopBar title={t('bayi.baslik')} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        {/* Konum kutusu */}
        {durum === DURUM.tamam ? (
          <div className="listitem listitem--flat" style={{ marginBottom: 16 }}>
            <div
              className="listitem__icon"
              style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green-yazi)' }}
            >
              <IconCheck size={22} />
            </div>
            <div className="listitem__body">
              <div className="listitem__title" style={{ fontSize: 15 }}>
                {t('bayi.konumAlindi')}
              </div>
              <div className="listitem__sub">
                {t('bayi.konumAlindiAlt')}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="listitem__icon">
                <IconPin size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="card__title">{t('bayi.yakiniBul')}</div>
                <div className="card__sub">
                  {durum === DURUM.red
                    ? t('bayi.konumRedAlt')
                    : durum === DURUM.yok
                      ? t('bayi.konumYok')
                      : t('bayi.konumAcikla')}
                </div>
              </div>
            </div>

            {durum !== DURUM.yok && (
              <button
                className="btn btn--blue"
                style={{ marginTop: 14 }}
                onClick={konumIste}
                disabled={durum === DURUM.bekliyor}
              >
                <IconPin size={20} />
                {durum === DURUM.bekliyor
                  ? t('bayi.konumAraniyor')
                  : durum === DURUM.red
                    ? t('bayi.tekrarDene')
                    : t('bayi.konumKullan')}
              </button>
            )}
          </div>
        )}

        {/* Harita yalnızca konum alındığında. Konum yoksa yön
            hesaplanamıyor, boş bir daire göstermenin anlamı yok. */}
        {konum && (
          <BayiHarita
            konum={konum}
            bayiler={bayiler}
            secili={secili}
            onSec={(id) => {
              setSecili(id)
              document
                .getElementById('bayi-' + id)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        )}

        {/* Merkez — telefon ve e-posta. E-posta profil sayfasının
            dibindeydi, kimsenin bakmayacağı bir yerdi; iletişim
            bilgisinin yeri burası. */}
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

        <div className="sectionhead">
          <h2>{t('bayi.bayiler')}</h2>
          <span className="sectionhead__count">{bayiler.length}</span>
        </div>

        <div className="stack">
          {bayiler.map((b) => (
            <BayiKarti
              key={b.id}
              bayi={b}
              showToast={showToast}
              dil={dil}
              vurgulu={secili === b.id}
            />
          ))}
        </div>

        {/* Uyarı: liste temsili */}
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

function BayiKarti({ bayi, showToast, dil, vurgulu }) {
  return (
    <div
      className={'card' + (vurgulu ? ' card--vurgulu' : '')}
      id={'bayi-' + bayi.id}
    >
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="listitem__icon">
          <IconPin size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__title">{bayi.ad}</div>
          <div className="card__sub">
            {bayi.ilce} / {bayi.il}
            {typeof bayi.km === 'number' && (
              <> · <strong>{bayi.km} km</strong> (kuş uçuşu)</>
            )}
          </div>
          <div className="card__sub" style={{ marginTop: 2 }}>
            {bayi.adres}
          </div>

          <div className="row" style={{ marginTop: 9, gap: 6, flexWrap: 'wrap' }}>
            {bayi.yetki.map((y) => (
              <span key={y} className="badge badge--blue">
                {yetkiAdi(y, dil)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        className="btn btn--soft btn--sm"
        style={{ marginTop: 12 }}
        {...araProps(bayi.tel, bayi.telYazi, showToast)}
      >
        <IconPhone size={19} /> {bayi.telYazi}
        <span className="spacer" />
        <IconRight size={18} />
      </a>
    </div>
  )
}
