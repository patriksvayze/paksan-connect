import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, Sheet, DataRow } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { urunDilde } from '../marka'
import { SIRKET } from '../marka'
import { validateSerial, formatSerial, normalizeSerial, warrantyStatus, ORNEK_SERILER } from '../lib/serial'
import { araProps } from '../lib/tel'
import { makineKaydet, seriBaskaHesaptaMi } from '../lib/makineKaydi'
import { SERI_CAKISMASI } from '../lib/numaraTalebi'
import { NumaraTalepFormu } from '../components/NumaraTalepFormu'
import {
  IconBarcode, IconInfo, IconMachine, IconAlert, IconPhone, IconLock, IconRight, IconUser,
} from '../components/Icons'

/* Seri numarası ile makine kaydı.
   Amaç: müşteri hangi makineyi kullandığını bize bildirsin,
   biz de satılan ürünü ve garantiyi takip edebilelim.

   SERİ BAŞKA HESAPTAYSA (17 Eylül 2026, kullanıcının kararı)

   İkinci kayıt açılmıyor: makine eklenmiyor, deftere satır yazılmıyor.
   Müşteriye iki seçenek çıkıyor:

     Numaram Değişti            → yazılı numara talebi, seri çakışması
                                  kipinde (bkz. components/NumaraTalepFormu.jsx).
                                  PAKSAN eski numarayı doğrulayınca eski
                                  hesabın kayıtları bu hesaba geçiyor.
     Makineyi Başkasından Aldım → PAKSAN'ı aramaya yönlendiriliyor.
                                  Sahiplik devrini PAKSAN arka planda
                                  yapıyor; uygulama bir şey istemiyor.

   Öteki hesabın adı, numarası, müşteri numarası ekranda HİÇ geçmiyor:
   başkasının bilgisi, ve makineyi çalmış biri de bu ekranı görebilir. */

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
  /* Seri başka hesapta çıktıysa: {product, serial, year, eskiHesap} */
  const [cakisma, setCakisma] = useState(null)
  const [cakismaAdim, setCakismaAdim] = useState('secim') // 'secim' | 'numara' | 'aldim'

  /** Seri başka hesaptaysa çakışma ekranını açar ve true döner. */
  function cakismayaGec(sonuc) {
    const eskiHesap = seriBaskaHesaptaMi(sonuc.serial, user)
    if (!eskiHesap) return false
    setHata('')
    setBulunan(null)
    setCakismaAdim('secim')
    setCakisma({ ...sonuc, eskiHesap })
    return true
  }

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
    if (cakismayaGec(sonuc)) return
    setHata('')
    setBulunan(sonuc)
  }

  /* Kayıt yazıldıktan sonra Logo'ya soruluyor: bu makine yeni mi
     satıldı? Yeniyse kullanıcı kutlama ekranını görüyor, değilse
     doğrudan makine listesine gidiyor. Logo bağlı değilken kutlama
     hiç çıkmıyor — bkz. src/lib/logo.js */
  async function kaydet() {
    if (kaydediliyor) return
    /* Onay ekranında beklerken defter değişmiş olabilir (başka bir
       hesap aynı seriyi kaydetti); yazmadan önce bir kez daha. */
    if (cakismayaGec(bulunan)) return
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

  /* ------------------------------------ Seri başka hesapta */
  if (cakisma) {
    const secimeDon = () => setCakismaAdim('secim')
    /* Seri kutusu dolu kalıyor: yanlış yazdıysa düzeltsin. */
    const giriseDon = () => setCakisma(null)

    if (cakismaAdim === 'numara') {
      return (
        <div className="app">
          <TopBar title={t('ekle.numaramDegisti')} back={secimeDon} />
          <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
            <NumaraTalepFormu
              kip={SERI_CAKISMASI}
              seri={cakisma.serial}
              eskiHesap={cakisma.eskiHesap}
              onGeri={secimeDon}
              onKapat={() => nav(ilkKayit ? '/' : '/makinelerim', { replace: true })}
            />
          </div>
        </div>
      )
    }

    if (cakismaAdim === 'aldim') {
      return <BaskasindanAldim seri={cakisma.serial} onGeri={secimeDon} />
    }

    const urun = urunDilde(cakisma.product, dil)
    return (
      <div className="app">
        <TopBar title={t('ekle.cakismaBaslik')} back={giriseDon} />
        <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
          <div className="card">
            <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
              <div
                className="listitem__icon"
                style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
              >
                <IconLock size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16.5 }}>{urun.name}</div>
                <div className="serial-mono small muted" style={{ marginTop: 2 }}>
                  {formatSerial(cakisma.serial)}
                </div>
                <p className="muted small" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  {t('ekle.cakismaAciklama')}
                </p>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 17, marginTop: 24 }}>{t('ekle.cakismaSoru')}</h2>

          <div className="stack" style={{ marginTop: 12 }}>
            <button className="listitem" onClick={() => setCakismaAdim('numara')}>
              <div className="listitem__icon">
                <IconPhone size={22} />
              </div>
              <div className="listitem__body">
                <div className="listitem__title">{t('ekle.numaramDegisti')}</div>
                <div className="listitem__sub">{t('ekle.numaramDegistiAlt')}</div>
              </div>
              <span className="listitem__chev">
                <IconRight size={21} />
              </span>
            </button>

            <button className="listitem" onClick={() => setCakismaAdim('aldim')}>
              <div
                className="listitem__icon"
                style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
              >
                <IconUser size={22} />
              </div>
              <div className="listitem__body">
                <div className="listitem__title">{t('ekle.baskasindanAldim')}</div>
                <div className="listitem__sub">{t('ekle.baskasindanAldimAlt')}</div>
              </div>
              <span className="listitem__chev">
                <IconRight size={21} />
              </span>
            </button>
          </div>

          <button className="btn btn--soft" style={{ marginTop: 22 }} onClick={giriseDon}>
            {t('ekle.seriDuzelt')}
          </button>
        </div>
      </div>
    )
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
        title={ilkKayit ? t('ekle.ilkBaslik') : t('ekle.baslik')}
        back={ilkKayit ? null : true}
      />

      <div className="screen screen--nonav wrap" style={{ paddingTop: 22 }}>
        <div className="center" style={{ marginBottom: 20 }}>
          <div style={{ color: 'var(--pk-blue-yazi)', opacity: 0.9 }}>
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
            <span style={{ color: 'var(--pk-red-yazi)', flex: 'none' }}><IconAlert size={22} /></span>
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
                /* Satır 20 piksel yüksekliğindeydi; parmakla seçilemiyordu. */
                style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}
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
            style={{ background: 'var(--pk-blue-soft)', color: 'var(--pk-blue-yazi)', display: 'grid', placeItems: 'center' }}
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

/* "Makineyi başkasından aldım".

   Sahiplik devrini PAKSAN yapıyor: önceki sahibin hesabından çıkarıp
   bu hesaba geçirmek, önceki sahiple de konuşmayı gerektirebilir.
   Uygulamada doldurulacak bir form yok; müşteri arıyor.

   Telefonda ilk sorulacak şey seri numarası. Ekranda büyük yazılı ve
   kopyalanabilir duruyor: müşteri etikete tekrar gitmesin. */
function BaskasindanAldim({ seri, onGeri }) {
  const { t } = useDil()
  const { showToast } = useApp()

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(formatSerial(seri))
      showToast(t('ekle.seriKopyalandi'))
    } catch {
      /* Pano kapalı olabiliyor; numara ekranda yazılı duruyor. */
      showToast(t('parcaOdeme.kopyalanamadi'))
    }
  }

  return (
    <div className="app">
      <TopBar title={t('ekle.baskasindanAldim')} back={onGeri} />
      <div className="screen screen--nonav wrap fade-in" style={{ paddingTop: 20 }}>
        <div className="card center" style={{ padding: '28px 20px' }}>
          <div style={{ color: 'var(--pk-blue-yazi)' }}>
            <IconPhone size={46} />
          </div>
          <h2 style={{ marginTop: 14, fontSize: 19 }}>{t('ekle.aldimBaslik')}</h2>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
            {t('ekle.aldimMetin')}
          </p>
          <a
            className="btn btn--brand btn--lg"
            style={{ marginTop: 20 }}
            {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
          >
            <IconPhone size={21} /> {t('ortak.araTel', { tel: SIRKET.telefon })}
          </a>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="field__label">{t('ekle.aldimSeriEtiket')}</div>
          <div
            className="serial-mono"
            style={{ fontSize: 20, fontWeight: 700, marginTop: 6, userSelect: 'all', overflowWrap: 'anywhere' }}
          >
            {formatSerial(seri)}
          </div>
          <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {t('ekle.aldimHazirla')}
          </p>
          <button className="btn btn--soft" style={{ marginTop: 12 }} onClick={kopyala}>
            {t('ekle.seriKopyala')}
          </button>
        </div>

        <button className="btn btn--ghost" style={{ marginTop: 14 }} onClick={onGeri}>
          {t('ortak.geri')}
        </button>
      </div>
    </div>
  )
}
