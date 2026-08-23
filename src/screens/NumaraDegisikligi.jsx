import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { PaksanRozet } from '../components/Marka'
import { TelefonAlani } from '../components/TelefonAlani'
import { telKullanici } from '../lib/tel'
import { formatSerial, normalizeSerial } from '../lib/serial'
import { acikNumaraTalebi, numaraTalebiGonder } from '../lib/numaraTalebi'
import { numaraMetni } from '../data/numaraDegisikligi'
import { IconBack, IconShield, IconCheck, IconCheckCircle, IconAlert } from '../components/Icons'

/* ==========================================================================
   Telefon numarası değişikliği

   Numarayı kullanıcı kendisi değiştiremiyor: giriş numarası hesabın
   kimliği, telefonu eline geçiren biri hesabı devralırdı. Değişikliği
   PAKSAN yapıyor.

   Kullanıcı buradan yazılı talep bırakıyor — yeni numarası ve
   makinesinin seri numarası. Talep backoffice’e düşüyor; backoffice eski numarayı
   ve seri numarasını hesapla karşılaştırıyor, yetkili onaylayınca numara
   değişiyor ve kullanıcıya bildirim gidiyor.

   Kimseyi telefona yönlendirmiyoruz: hem müşteri sırada beklemesin hem
   de ekibin telefon yükü artmasın.

   Ekrana üç yoldan geliniyor:
     · Şifremi unuttum → kod gelmedi → "numaranızı mı değiştirdiniz?"
     · Talep onayı → "bu numarayı artık kullanmıyorum"
     · Profil → giriş numarasının yanındaki bağlantı
   ========================================================================== */

export default function NumaraDegisikligi() {
  const nav = useNavigate()
  const { user, machines } = useApp()
  const { t, dil } = useDil()
  const m = numaraMetni(dil)

  const [ulke, setUlke] = useState(user?.ulke || 'TR')
  const [tel, setTel] = useState('')
  const [seri, setSeri] = useState('')
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [sonuc, setSonuc] = useState(null)

  /* Cevap bekleyen talep varsa form yerine durumu gösteriliyor —
     kullanıcı ikinci kez göndermeye çalışmasın. */
  const bekleyen = useMemo(() => acikNumaraTalebi(user), [user])

  function gonder() {
    if (gonderiliyor) return

    const rakam = tel.replace(/\D/g, '')
    if (rakam.length < 7) return setHata(t('numara.hataNumara'))
    if (rakam === String(user?.tel || '').replace(/\D/g, '')) {
      return setHata(t('numara.hataAyni'))
    }
    if (normalizeSerial(seri).length < 6) return setHata(t('numara.hataSeri'))

    setHata('')
    setGonderiliyor(true)
    const talep = numaraTalebiGonder({
      user,
      yeniUlke: ulke,
      yeniTel: tel,
      seri: normalizeSerial(seri),
    })
    setGonderiliyor(false)
    setSonuc(talep)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <button className="backbtn" onClick={() => nav(-1)}>
            <IconBack size={21} />
            {t('ortak.geri')}
          </button>
          <div className="spacer" />
          <PaksanRozet />
        </div>
        <div className="topbar__titles">
          <h1>{t('numara.baslik')}</h1>
        </div>
      </header>

      <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
        {sonuc || bekleyen ? (
          <Sonuc yeni={Boolean(sonuc)} onKapat={() => nav('/profil')} />
        ) : (
          <>
            <div className="card">
              <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
                <div
                  className="listitem__icon"
                  style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue)' }}
                >
                  <IconShield size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16.5 }}>{t('numara.kart')}</div>
                  <p className="muted small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                    {m.neden}
                  </p>
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: 17, marginTop: 24 }}>{t('numara.formBaslik')}</h2>

            <div className="card" style={{ marginTop: 12 }}>
              <label className="field">
                <span className="field__label">{t('numara.eskiNumara')}</span>
                <input className="input" value={telKullanici(user)} disabled />
              </label>

              <div style={{ marginTop: 14 }}>
                <TelefonAlani
                  alan="tel"
                  ulke={ulke}
                  onUlke={setUlke}
                  tel={tel}
                  onTel={setTel}
                  etiket={t('numara.yeniNumara')}
                />
              </div>

              <label className="field" style={{ marginTop: 14 }}>
                <span className="field__label">{t('numara.seriNo')}</span>
                <input
                  className="input"
                  value={formatSerial(seri)}
                  onChange={(e) => setSeri(e.target.value)}
                  placeholder={t('numara.seriOrnek')}
                  inputMode="numeric"
                />
              </label>

              <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                {m.seriNotu}
                {machines.length === 0 && t('numara.makineYok')}
              </p>
            </div>

            {hata && (
              <div className="hata-kutu" style={{ marginTop: 14 }}>
                <span className="hata-kutu__ikon"><IconAlert size={20} /></span>
                <span>{hata}</span>
              </div>
            )}

            <button
              className="btn btn--orange btn--lg"
              style={{ marginTop: 18 }}
              onClick={gonder}
              disabled={gonderiliyor}
            >
              {gonderiliyor ? t('numara.gonderiliyor') : t('numara.gonder')}
            </button>

            <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.6 }}>
              {t('numara.not')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Sonuc({ yeni, onKapat }) {
  const { t } = useDil()

  return (
    <div className="card center" style={{ padding: '30px 20px' }}>
      <div style={{ color: 'var(--pk-green)' }}>
        {yeni ? <IconCheckCircle size={62} /> : <IconCheck size={62} />}
      </div>

      <h2 style={{ marginTop: 14, fontSize: 19 }}>
        {yeni ? t('numara.alindi') : t('numara.bekleyen')}
      </h2>

      <p className="muted" style={{ marginTop: 10, lineHeight: 1.65 }}>
        {t('numara.alindiMetin')}
      </p>

      {/* Numara değişince giriş numarası da değişiyor.

          Talep onaylandığında hesabın kimliği yeni numara oluyor;
          kullanıcı eski numarasıyla giriş yapmayı denerse hesabı
          bulunamıyor. Bunu talebi bırakırken söylemek, sonradan
          "hesabıma giremiyorum" aramasını önlüyor. */}
      <div className="uyari-kart" style={{ marginTop: 18, textAlign: 'left' }}>
        {t('numara.girisUyarisi')}
      </div>

      <button className="btn btn--soft" style={{ marginTop: 22 }} onClick={onKapat}>
        {t('ortak.kapat')}
      </button>
    </div>
  )
}
