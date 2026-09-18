import { useMemo, useState } from 'react'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TelefonAlani } from './TelefonAlani'
import { araProps, telAnahtar, telKullanici } from '../lib/tel'
import { formatSerial, normalizeSerial } from '../lib/serial'
import {
  acikNumaraTalebi, numaraTalebiGonder, seriCakismasiTalebi, SERI_CAKISMASI,
} from '../lib/numaraTalebi'
import { numaraMetni } from '../data/numaraDegisikligi'
import { SIRKET } from '../marka'
import { IconShield, IconCheck, IconCheckCircle, IconAlert, IconPhone } from './Icons'

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

/* SERİ ÇAKIŞMASI KİPİ (17 Eylül 2026)

   Müşteri makine eklerken seri başka bir hesapta çıktı ve "numaram
   değişti" dedi (bkz. screens/AddMachine.jsx). Aynı form, yön ters:

     · YENİ numara bu hesabın numarası — müşteri o numarayla giriş
       yaptı; kilitli.
     · ESKİ numarayı müşteri yazıyor. Tek soru bu.
     · Seri numarası ekleme ekranından geliyor; kilitli.

   Kanıt burada eski numara, seri değil: seri makinenin üstünde yazıyor,
   makineyi eline geçiren herkes bilir. Eski numarayı ise yalnız hesabın
   sahibi bilir — o yüzden ekran eski hesabın numarasını hiçbir yerde
   göstermiyor.

   Kopya form yazılmadı: talep backoffice'te aynı listeye düşüyor, aynı
   alanları taşıyor; iki form zamanla birbirinden ayrılırdı. */

/**
 * @param {() => void} onKapat  Sonuç ekranındaki kapatma düğmesi
 * @param {string} kapatEtiketi Kapatma düğmesinin yazısı
 * @param {string} [altNot]     Formun altında gösterilecek ek not
 * @param {'numara'|'seriCakismasi'} [kip]
 * @param {string} [seri]       seriCakismasi: ekleme ekranındaki seri
 * @param {{musteriId, musteriNo}} [eskiHesap] seriCakismasi: seriyi tutan hesap
 * @param {() => void} [onGeri] Formdaki geri düğmesi; verilirse "Geri" yazar
 */
export function NumaraTalepFormu({
  onKapat, kapatEtiketi, altNot, kip = 'numara', seri: gelenSeri = '', eskiHesap, onGeri,
}) {
  const { user, machines, showToast } = useApp()
  const { t, dil } = useDil()
  const m = numaraMetni(dil)
  const cakisma = kip === SERI_CAKISMASI

  const [ulke, setUlke] = useState(user?.ulke || 'TR')
  const [tel, setTel] = useState('')
  const [seri, setSeri] = useState(gelenSeri)
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [sonuc, setSonuc] = useState(null)

  /* Cevap bekleyen talep varsa form yerine durumu gösteriliyor —
     kullanıcı ikinci kez göndermeye çalışmasın. */
  const bekleyen = useMemo(
    () =>
      cakisma
        ? acikNumaraTalebi(user, {
            kaynak: SERI_CAKISMASI,
            eskiHesapId: eskiHesap?.musteriId,
            seri: normalizeSerial(gelenSeri),
          })
        : acikNumaraTalebi(user),
    [user, cakisma, eskiHesap, gelenSeri]
  )

  function gonder() {
    if (gonderiliyor) return
    if (cakisma) return cakismaGonder()

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

  function cakismaGonder() {
    const rakam = tel.replace(/\D/g, '')
    if (rakam.length < 7) return setHata(t('numara.hataEskiNumara'))
    if (user && telAnahtar(ulke, tel) === telAnahtar(user.ulke, user.tel)) {
      return setHata(t('numara.hataEskiAyni'))
    }

    setHata('')
    setGonderiliyor(true)
    const talep = seriCakismasiTalebi({
      user,
      eskiUlke: ulke,
      eskiTel: tel,
      seri: normalizeSerial(gelenSeri),
      eskiHesap,
    })
    setGonderiliyor(false)
    setSonuc(talep)
  }

  if (sonuc || bekleyen) {
    return (
      <Sonuc
        yeni={Boolean(sonuc)}
        cakisma={cakisma}
        onKapat={onKapat}
        kapatEtiketi={kapatEtiketi}
      />
    )
  }

  const hesapNumarasi = (
    <label className="field" style={cakisma ? { marginTop: 14 } : undefined}>
      <span className="field__label">{t('numara.eskiNumara')}</span>
      <input className="input" value={telKullanici(user)} disabled />
    </label>
  )

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
            <div style={{ fontWeight: 700, fontSize: 16.5 }}>
              {cakisma ? t('numara.cakismaKart') : t('numara.kart')}
            </div>
            <p className="muted small" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {cakisma ? t('numara.cakismaNeden') : m.neden}
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 17, marginTop: 24 }}>{t('numara.formBaslik')}</h2>

      <div className="card" style={{ marginTop: 12 }}>
        {!cakisma && hesapNumarasi}

        <div style={cakisma ? undefined : { marginTop: 14 }}>
          <TelefonAlani
            alan="tel"
            ulke={ulke}
            onUlke={setUlke}
            tel={tel}
            onTel={setTel}
            etiket={cakisma ? t('numara.eskiNumaraniz') : t('numara.yeniNumara')}
          />
        </div>

        {cakisma && hesapNumarasi}

        <label className="field" style={{ marginTop: 14 }}>
          <span className="field__label">{t('numara.seriNo')}</span>
          <input
            className="input"
            value={formatSerial(seri)}
            onChange={(e) => setSeri(e.target.value)}
            placeholder={t('numara.seriOrnek')}
            inputMode="numeric"
            disabled={cakisma}
          />
        </label>

        {!cakisma && (
          <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {m.seriNotu}
            {machines.length === 0 && t('numara.makineYok')}
          </p>
        )}
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
      {(onGeri || kapatEtiketi) && (
        <button
          className="btn btn--soft"
          style={{ marginTop: 10 }}
          onClick={onGeri || onKapat}
        >
          {onGeri ? t('ortak.geri') : kapatEtiketi}
        </button>
      )}

      {/* Eski numarasını hatırlamayan müşteri burada kalmasın: tek
          dokunuşla PAKSAN aranıyor. */}
      {cakisma ? (
        <a
          {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
          className="row small"
          /* Parmakla basılan bir bağlantı: yüksekliği dokunma tabanına
             çıkarılıyor (denetimde 320 pikselde 43 ölçüldü). */
          style={{
            marginTop: 18,
            minHeight: 'var(--dokunma, 48px)',
            justifyContent: 'center',
            fontWeight: 600,
            lineHeight: 1.6,
          }}
        >
          <IconPhone size={17} /> {t('numara.cakismaHatirlamiyorum', { tel: SIRKET.telefon })}
        </a>
      ) : (
        <p className="small muted center" style={{ marginTop: 18, lineHeight: 1.6 }}>
          {altNot || t('numara.not')}
        </p>
      )}
    </>
  )
}

function Sonuc({ yeni, cakisma, onKapat, kapatEtiketi }) {
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
        {cakisma ? t('numara.cakismaAlindiMetin') : t('numara.alindiMetin')}
      </p>

      {/* Numara değişince giriş numarası da değişiyor.

          Talep onaylandığında hesabın kimliği yeni numara oluyor;
          kullanıcı eski numarasıyla giriş yapmayı denerse hesabı
          bulunamıyor. Bunu talebi bırakırken söylemek, sonradan
          "hesabıma giremiyorum" aramasını önlüyor.

          Seri çakışmasında bu hesabın numarası değişmiyor; uyarı
          yanlış olurdu. */}
      {!cakisma && (
        <div className="uyari-kart" style={{ marginTop: 18, textAlign: 'left' }}>
          {t('numara.girisUyarisi')}
        </div>
      )}

      <button className="btn btn--soft" style={{ marginTop: 22 }} onClick={onKapat}>
        {kapatEtiketi || t('ortak.kapat')}
      </button>
    </div>
  )
}
