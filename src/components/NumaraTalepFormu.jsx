import { useMemo, useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TelefonAlani } from './TelefonAlani'
import { telKullanici } from '../lib/tel'
import { formatSerial, normalizeSerial } from '../lib/serial'
import { acikNumaraTalebi, numaraTalebiGonder } from '../lib/numaraTalebi'
import { numaraMetni } from '../data/numaraDegisikligi'
import { IconShield, IconCheck, IconCheckCircle, IconAlert } from './Icons'

/* ==========================================================================
   Numara değişikliği talebi — ortak form

   NEDEN ORTAK

   Bu forma iki yerden geliniyor: profildeki "telefon numaram değişti"
   bağlantısından ve talep gönderirken çıkan onay penceresindeki "bu
   numarayı artık kullanmıyorum" bağlantısından.

   İKİSİ AYRI ŞEY ANLATIYORDU. Profil yazılı talep formuna götürüyordu;
   talep penceresi ise eski yöntemi, "PAKSAN'ı arayın"ı gösteriyordu.
   Aynı işi iki farklı şekilde anlatmak müşteriyi de personeli de
   şaşırtıyor — üstelik telefona yönlendirmek tam da azaltmaya
   çalıştığımız yükü artırıyordu.

   Form artık tek yerde yazılı; iki ekran da bunu çağırıyor, aynı
   metinleri ve aynı kuralları kullanıyor.

   NUMARAYI KULLANICI KENDİ DEĞİŞTİREMİYOR

   Giriş numarası hesabın kimliği; kullanıcı değiştirebilseydi telefonu
   bir süreliğine eline geçiren biri hesabı devralırdı. Kullanıcı yalnız
   TALEP bırakıyor: yeni numarası ve makinesinin seri numarası. Seri
   numarasını yalnız makinenin başındaki kişi bilir; kimlik doğrulaması
   böyle yapılıyor. Değişikliği PAKSAN yetkilisi yapıyor.
   ========================================================================== */

/**
 * @param {() => void} onKapat  Sonuç ekranındaki kapatma düğmesi
 * @param {string} kapatEtiketi Kapatma düğmesinin yazısı
 * @param {string} [altNot]     Formun altında gösterilecek ek not
 */
export function NumaraTalepFormu({ onKapat, kapatEtiketi, altNot }) {
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
  }

  if (sonuc || bekleyen) {
    return <Sonuc yeni={Boolean(sonuc)} onKapat={onKapat} kapatEtiketi={kapatEtiketi} />
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
          <div
            className="listitem__icon"
            style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue-yazi)' }}
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

      {/* Talep penceresinden gelindiyse "vazgeç" değil "geri dön":
          doldurulan talep formu arkada duruyor, kaybolmadı. */}
      {kapatEtiketi && (
        <button className="btn btn--soft" style={{ marginTop: 10 }} onClick={onKapat}>
          {kapatEtiketi}
        </button>
      )}

      <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.6 }}>
        {altNot || t('numara.not')}
      </p>
    </>
  )
}

function Sonuc({ yeni, onKapat, kapatEtiketi }) {
  const { t } = useDil()

  return (
    <div className="card center" style={{ padding: '30px 20px' }}>
      <div style={{ color: 'var(--pk-green-yazi)' }}>
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
        {kapatEtiketi || t('ortak.kapat')}
      </button>
    </div>
  )
}
