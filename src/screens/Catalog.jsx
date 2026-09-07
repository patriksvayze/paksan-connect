import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { CIZIM } from '../marka/icerik/cizimler'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import {
  CATEGORIES, PRODUCTS, productsByCategory, siralanmisUrunler,
  urunDilde, kategoriDilde,
} from '../marka'
import { SIRKET } from '../marka'
import { araProps } from '../lib/tel'
import { norm } from '../lib/arama'
import { IconSearch, IconCart, IconPhone, IconClose } from '../components/Icons'

export default function Catalog() {
  const { t, dil } = useDil()
  const nav = useNavigate()
  const { showToast } = useApp()
  const [kat, setKat] = useState('hepsi')
  const [ara, setAra] = useState('')

  const liste = useMemo(() => {
    const q = norm(ara)
    if (q) {
      /* Hem Türkçe hem seçili dildeki metinde aranıyor: İngilizce
         kullanan "baler" yazınca da, "balya" yazınca da bulsun. */
      return PRODUCTS.filter((p) => {
        const c = urunDilde(p, dil)
        return [p.name, p.tagline, p.desc, c.name, c.tagline, c.desc].some((m) =>
          norm(m || '').includes(q)
        )
      })
    }
    return siralanmisUrunler(kat === 'hepsi' ? PRODUCTS : productsByCategory(kat))
  }, [kat, ara, dil])

  const aktifKat = kategoriDilde(CATEGORIES.find((c) => c.id === kat), dil)

  return (
    <div className="app">
      <TopBar title={t('anasayfa.urunlerimiz')} back="auto" />

      <div className="screen fade-in">
        {/* Arama */}
        <div className="wrap" style={{ paddingTop: 16 }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ink-3)', pointerEvents: 'none',
              }}
            >
              <IconSearch size={20} />
            </span>
            <input
              className="input"
              style={{ paddingLeft: 45, paddingRight: ara ? 46 : 16 }}
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder={t('urun.araPlaceholder')}
              aria-label={t('urun.ara')}
            />
            {ara && (
              <button
                onClick={() => setAra('')}
                aria-label={t('ortak.kapat')}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--ink-3)', width: 30, height: 30, display: 'grid', placeItems: 'center',
                }}
              >
                <IconClose size={19} />
              </button>
            )}
          </div>
        </div>

        {/* Kategoriler */}
        {!ara && (
          <div className="pill-list" style={{ marginTop: 14 }}>
            <button
              className={'pill' + (kat === 'hepsi' ? ' pill--on' : '')}
              onClick={() => setKat('hepsi')}
            >
              {t('urun.hepsi')}
            </button>
            {CATEGORIES.map((ham) => {
              const c = kategoriDilde(ham, dil)
              return (
              <button
                key={c.id}
                className={'pill' + (kat === c.id ? ' pill--on' : '')}
                onClick={() => setKat(c.id)}
              >
                {c.short}
              </button>
              )
            })}
          </div>
        )}

        <div className="wrap" style={{ marginTop: 16 }}>
          {/* Sonuç sayısı */}
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="small muted">
              {ara
                ? t('urun.sonuc', { q: ara, n: liste.length })
                : t('urun.modelSayisi', { ad: aktifKat ? aktifKat.name : t('urun.tumUrunler'), n: liste.length })}
            </span>
          </div>

          {liste.length === 0 ? (
            <div className="empty">
              <img className="empty__cizim" src={CIZIM.bosArama} alt="" />
              <p style={{ marginBottom: 20 }}>{t('urun.bulunamadi')}</p>
              <a {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)} className="btn btn--soft">
                <IconPhone size={20} /> {t('urun.bizeSorun', { tel: SIRKET.telefon })}
              </a>
            </div>
          ) : (
            <div className="grid-2">
              {liste.map((ham) => {
                const p = urunDilde(ham, dil)
                return (
                <Link key={p.id} to={`/urun/${p.id}`} className="prodcard">
                  <UrunFoto urunId={p.id} ad={p.name} tip="wide" ikonBoyut={36} />
                  <div className="prodcard__body">
                    <div className="prodcard__name">{p.name}</div>
                    <div className="prodcard__sub">{p.tagline}</div>
                  </div>
                </Link>
                )
              })}
            </div>
          )}

          {/* Danışma kartı */}
          <div
            className="card"
            style={{
              marginTop: 24,
              background: 'linear-gradient(150deg, var(--pk-blue) 0%, var(--pk-blue-900) 100%)',
              color: '#fff',
              border: 'none',
              boxShadow: 'var(--sh-2)',
            }}
          >
            <h3 style={{ fontSize: 17.5 }}>{t('urun.hangiMakine')}</h3>
            <p style={{ opacity: 0.84, marginTop: 6, lineHeight: 1.55, fontSize: 15 }}>
              {t('urun.hangiMakineAlt')}
            </p>
            <button
              className="btn btn--orange"
              style={{ marginTop: 16 }}
              onClick={() => nav('/talep?tur=satinalma')}
            >
              <IconCart size={20} /> {t('urun.teklifIsteyin')}
            </button>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
