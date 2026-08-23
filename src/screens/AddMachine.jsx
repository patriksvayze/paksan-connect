import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, Sheet, DataRow } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { urunDilde } from '../data/products'
import { SIRKET } from '../config'
import { validateSerial, formatSerial, normalizeSerial, warrantyStatus, ORNEK_SERILER } from '../lib/serial'
import { araProps } from '../lib/tel'
import { makineKaydet } from '../lib/makineKaydi'
import { IconBarcode, IconInfo, IconMachine, IconAlert, IconPhone } from '../components/Icons'

/* Seri numarası ile makine kaydı.
   Amaç: müşteri hangi makineyi kullandığını bize bildirsin,
   biz de satılan ürünü ve garantiyi takip edebilelim. */

export default function AddMachine() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const ilkKayit = params.get('ilk') === '1'
  const { addMachine, hasSerial, showToast, user } = useApp()
  const { t, dil } = useDil()

  const [serial, setSerial] = useState('')
  const [hata, setHata] = useState('')
  const [bulunan, setBulunan] = useState(null) // {product, serial, year}
  const [takma, setTakma] = useState('')
  const [yardim, setYardim] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  function kontrolEt() {
    const sonuc = validateSerial(serial)
    if (!sonuc.ok) {
      setHata(t(sonuc.error))
      setBulunan(null)
      return
    }
    if (hasSerial(sonuc.serial)) {
      setHata(t('ekle.zatenKayitli'))
      setBulunan(null)
      return
    }
    setHata('')
    setBulunan(sonuc)
  }

  /* Kayıt yazıldıktan sonra Logo'ya soruluyor: bu makine yeni mi
     satıldı? Yeniyse kullanıcı kutlama ekranını görüyor, değilse
     doğrudan makine listesine gidiyor. Logo bağlı değilken kutlama
     hiç çıkmıyor — bkz. src/lib/logo.js */
  async function kaydet() {
    if (kaydediliyor) return
    setKaydediliyor(true)

    const makine = addMachine({
      productId: bulunan.product.id,
      serial: bulunan.serial,
      year: bulunan.year,
      nickname: takma.trim(),
    })

    let kutlama = false
    try {
      const sonuc = await makineKaydet(makine, user)
      kutlama = sonuc.kutlama
    } catch {
      /* Kaydı yazamadıysak makine yine de kullanıcıda duruyor */
    }

    setKaydediliyor(false)

    if (kutlama) {
      nav('/makinelerim?kutlama=' + encodeURIComponent(makine.id), { replace: true })
      return
    }
    showToast(t('ekle.kaydedildi'))
    nav('/makinelerim', { replace: true })
  }

  /* ---------------------------------------------- Onay ekranı */
  if (bulunan) {
    const g = warrantyStatus(bulunan.year, t)
    const urun = urunDilde(bulunan.product, dil)
    return (
      <div className="app">
        <TopBar title={t('ekle.baslik')} back />
        <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
          <div className="card" style={{ padding: 12, boxShadow: 'var(--sh-2)' }}>
            <UrunFoto urunId={urun.id} ad={urun.name} tip="wide" />

            <div className="center" style={{ padding: '14px 6px 4px' }}>
              <h2 style={{ fontSize: 21 }}>{urun.name}</h2>
              <p className="muted small" style={{ marginTop: 3 }}>{urun.tagline}</p>
            </div>

            <div className="divider" />

            <DataRow k={t('ekle.seriNo')} v={<span className="serial-mono">{formatSerial(bulunan.serial)}</span>} />
            {bulunan.year && <DataRow k={t('ekle.uretimYili')} v={bulunan.year} />}
            <DataRow
              k="Garanti"
              v={<span className={'badge badge--' + (g.tone || 'blue')}>{g.label}</span>}
            />
            <p className="small muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
              {t('ekle.garantiTahmin')}
            </p>
          </div>

          <label className="field" style={{ marginTop: 20 }}>
            <span className="field__label">{t('ekle.kendiNotum')}</span>
            <input
              className="input"
              value={takma}
              onChange={(e) => setTakma(e.target.value)}
              placeholder={t('ekle.notOrnek')}
              maxLength={30}
            />
            <span className="field__hint">
              {t('ekle.notYardim', { ad: urun.name })}
            </span>
          </label>

          <div className="stack" style={{ marginTop: 22 }}>
            <button className="btn btn--primary btn--lg" onClick={kaydet}>
              {t('ekle.kaydet')}
            </button>
            <button className="btn btn--soft" onClick={() => { setBulunan(null); setSerial('') }}>
              {t('ekle.benimDegil')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------- Giriş ekranı */
  return (
    <div className="app">
      <TopBar
        title={ilkKayit ? 'Makinenizi kaydedin' : 'Makine Ekle'}
        back={ilkKayit ? null : true}
      />

      <div className="screen screen--nonav wrap" style={{ paddingTop: 22 }}>
        <div className="center" style={{ marginBottom: 20 }}>
          <div style={{ color: 'var(--pk-blue)', opacity: 0.9 }}>
            <IconBarcode size={58} />
          </div>
          <h2 style={{ fontSize: 20, marginTop: 10 }}>{t('ekle.seriYazin')}</h2>
          <p className="muted" style={{ marginTop: 8, fontSize: 15.5, lineHeight: 1.55 }}>
            {t('ekle.seriNeredeYazar')}
          </p>
        </div>

        <input
          className="input input--serial"
          value={serial}
          onChange={(e) => { setSerial(e.target.value); setHata('') }}
          onKeyDown={(e) => e.key === 'Enter' && kontrolEt()}
          placeholder="ORK1270-2024-00157"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />

        {hata && (
          <div
            className="card card--flat"
            style={{
              marginTop: 12,
              background: 'var(--pk-red-soft)',
              borderColor: 'transparent',
              display: 'flex',
              gap: 12,
            }}
            role="alert"
          >
            <span style={{ color: 'var(--pk-red)', flex: 'none' }}><IconAlert size={22} /></span>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{hata}</div>
              <a
                {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
                className="row"
                style={{ marginTop: 10, fontWeight: 700, fontSize: 14.5 }}
              >
                <IconPhone size={18} /> {t('ortak.bizeUlasin', { tel: SIRKET.telefon })}
              </a>
            </div>
          </div>
        )}

        <button
          className="btn btn--primary btn--lg"
          style={{ marginTop: 16 }}
          onClick={kontrolEt}
          disabled={!serial.trim()}
        >
          {t('ekle.bul')}
        </button>

        <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => setYardim(true)}>
          <IconInfo size={20} /> {t('ekle.nerede')}
        </button>

        {ilkKayit && (
          <button
            className="btn btn--soft"
            style={{ marginTop: 12 }}
            onClick={() => nav('/', { replace: true })}
          >
            {t('ekle.sonra')}
          </button>
        )}

        {/* Deneme kolaylığı — yayına çıkmadan önce kaldırılacak */}
        <div
          className="card card--flat"
          style={{ marginTop: 26, background: 'var(--surface-2)', borderColor: 'transparent' }}
        >
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="badge badge--orange">DENEME</span>
            <span className="small muted">{t('ekle.ornekler')}</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {ORNEK_SERILER.map((o) => (
              <button
                key={o.serial}
                className="row"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => { setSerial(o.serial); setHata('') }}
              >
                <strong className="serial-mono small">{o.serial}</strong>
                <span className="small muted spacer" style={{ textAlign: 'right' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={yardim} onClose={() => setYardim(false)} title={t('ekle.seriNerede')}>
        <div className="stack" style={{ gap: 16 }}>
          <div
            className="photo photo--wide"
            style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue)', display: 'grid', placeItems: 'center' }}
          >
            <IconBarcode size={62} />
          </div>
          <p style={{ lineHeight: 1.6 }}>
            {t('ekle.seriAciklama')}
          </p>
          <div className="card card--flat" style={{ background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <strong>{t('ekle.genelde')}</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
              <li>{t('ekle.yerBalya')}</li>
              <li>{t('ekle.yerYem')}</li>
              <li>{t('ekle.yerDiger')}</li>
            </ul>
          </div>
          <p className="muted small" style={{ lineHeight: 1.6 }}>
            {t('ekle.etiketKirli')}
          </p>
          <a {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)} className="btn btn--orange">
            <IconPhone size={20} /> {t('ortak.araTel', { tel: SIRKET.telefon })}
          </a>
        </div>
      </Sheet>
    </div>
  )
}
