import { useEffect, useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { hizmetAdi, yakindanUzaga, ileGore } from '../marka'
import { araProps } from '../lib/tel'
import { konumOku, konumDestekleniyorMu, KONUM } from '../lib/konum'
import { ServisHarita } from '../components/ServisHarita'
import { SIRKET, MARKA } from '../marka'
import {
  IconPin, IconPhone, IconRight, IconAlert, IconCheck, IconMail,
} from '../components/Icons'

/* Servis ve iletişim.

   İKİ HÂL VAR:

   · Kayıt sırasında konuma izin verilmişse (hesapta `konumIzni`), ekran
     açılınca konum sessizce okunuyor ve servisler yakından uzağa
     sıralanıyor. Telefon bir şey sormuyor — izin zaten verilmiş.
     Kullanıcı hiçbir şeye dokunmuyor.

   · İzin verilmemişse eski davranış: izin ekran açılır açılmaz
     İSTENMEZ. Çiftçi neden sorulduğunu bilmeden izin penceresiyle
     karşılaşmasın diye önce ne işe yaradığı yazılıyor, izni kendisi
     başlatıyor. Vermezse servisler kayıtlı iline göre sıralanır.

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

export default function Servisler() {
  const { user, showToast } = useApp()
  const { t, dil } = useDil()
  /* Kayıtta izin verildiyse ekran doğrudan "konum aranıyor" hâlinde
     açılıyor; kullanıcı bir an için boş bir düğme görmesin. */
  const izinVarmis = user?.konumIzni === KONUM.VERILDI && konumDestekleniyorMu()
  const [durum, setDurum] = useState(izinVarmis ? DURUM.bekliyor : DURUM.basta)
  const [konum, setKonum] = useState(null)
  /* Haritada dokunulan servis listede de vurgulanıyor */
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

  const servisler = konum ? yakindanUzaga(konum.enlem, konum.boylam) : ileGore(user?.il)

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
        showToast(t('servis.konumAlindiAlt'))
      },
      () => setDurum(DURUM.red),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    )
  }

  return (
    <div className="app">
      <TopBar title={t('servis.baslik')} back="auto" />

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
                {t('servis.konumAlindi')}
              </div>
              <div className="listitem__sub">
                {t('servis.konumAlindiAlt')}
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
                <div className="card__title">{t('servis.yakiniBul')}</div>
                <div className="card__sub">
                  {durum === DURUM.red
                    ? t('servis.konumRedAlt')
                    : durum === DURUM.yok
                      ? t('servis.konumYok')
                      : t('servis.konumAcikla')}
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
                  ? t('servis.konumAraniyor')
                  : durum === DURUM.red
                    ? t('servis.tekrarDene')
                    : t('servis.konumKullan')}
              </button>
            )}
          </div>
        )}

        {/* Harita yalnızca konum alındığında. Konum yoksa yön
            hesaplanamıyor, boş bir daire göstermenin anlamı yok. */}
        {konum && (
          <ServisHarita
            konum={konum}
            servisler={servisler}
            secili={secili}
            onSec={(id) => {
              setSecili(id)
              document
                .getElementById('servis-' + id)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        )}

        {/* Merkez — telefon ve e-posta. E-posta profil sayfasının
            dibindeydi, kimsenin bakmayacağı bir yerdi; iletişim
            bilgisinin yeri burası. */}
        <div className="card card--brand">
          <div className="card__title" style={{ fontSize: 18 }}>{MARKA}</div>
          <div className="card__sub">{t('servis.merkezAlt')}</div>
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
          <h2>{t('servis.servisler')}</h2>
          <span className="sectionhead__count">{servisler.length}</span>
        </div>

        <div className="stack">
          {servisler.map((b) => (
            <ServisKarti
              key={b.id}
              servis={b}
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
              <strong>{t('servis.temsili')}</strong> {t('servis.temsiliAlt')}
            </p>
          </div>
        </div>

      </div>

      <TabBar />
    </div>
  )
}

function ServisKarti({ servis, showToast, dil, vurgulu }) {
  return (
    <div
      className={'card' + (vurgulu ? ' card--vurgulu' : '')}
      id={'servis-' + servis.id}
    >
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="listitem__icon">
          <IconPin size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__title">{servis.ad}</div>
          <div className="card__sub">
            {servis.ilce} / {servis.il}
            {typeof servis.km === 'number' && (
              <> · <strong>{servis.km} km</strong> (kuş uçuşu)</>
            )}
          </div>
          <div className="card__sub" style={{ marginTop: 2 }}>
            {servis.adres}
          </div>

          <div className="row" style={{ marginTop: 9, gap: 6, flexWrap: 'wrap' }}>
            {(servis.hizmet || []).map((y) => (
              <span key={y} className="badge badge--blue">
                {hizmetAdi(y, dil)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <a
        className="btn btn--soft btn--sm"
        style={{ marginTop: 12 }}
        {...araProps(servis.tel, servis.telYazi, showToast)}
      >
        <IconPhone size={19} /> {servis.telYazi}
        <span className="spacer" />
        <IconRight size={18} />
      </a>
    </div>
  )
}
