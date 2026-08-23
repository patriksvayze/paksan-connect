import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar, DataRow } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { VideoOynatici, videoTuru, VideoSure } from '../components/Video'
import {
  getProduct, getCategory, productsByCategory, urunDilde, kategoriDilde,
} from '../data/products'
import { araProps } from '../lib/tel'
import { SIRKET } from '../config'
import {
  IconMachine, IconPlay, IconCart, IconPhone, IconRight, IconBook, IconPlus,
} from '../components/Icons'

export default function ProductDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { showToast } = useApp()
  const { t, dil } = useDil()
  const [acikVideo, setAcikVideo] = useState(null)
  const p = urunDilde(getProduct(id), dil)

  if (!p) {
    return (
      <div className="app">
        <TopBar title={t('detay.urunYok')} back="/urunler" />
        <div className="screen wrap">
          <div className="empty">
            <IconMachine size={62} />
            <p>{t('detay.urunYok')}</p>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  const kat = kategoriDilde(getCategory(p.category), dil)
  const benzer = productsByCategory(p.category)
    .filter((x) => x.id !== p.id)
    .map((x) => urunDilde(x, dil))

  return (
    <div className="app">
      <TopBar title={p.name} sub={kat?.name} back="/urunler" />

      <div className="screen fade-in">
        {/* Görsel */}
        <UrunFoto urunId={p.id} ad={p.name} tip="hero" ikonBoyut={78} />

        <div className="wrap" style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 23 }}>{p.name}</h2>
          <p className="muted" style={{ marginTop: 4 }}>{p.tagline}</p>

          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
            {p.variants?.map((v) => (
              <span key={v} className="badge badge--blue">{v}</span>
            ))}
          </div>

          <p style={{ marginTop: 14, lineHeight: 1.65, color: 'var(--ink-2)' }}>{p.desc}</p>

          {/* Teknik özellikler */}
          <div className="sectionhead">
            <h2>{t('detay.teknik')}</h2>
          </div>
          <div className="card">
            {p.specs.map(([k, v]) => (
              <DataRow key={k} k={k} v={v} />
            ))}
          </div>

          {/* Videolar */}
          {p.videos.length > 0 && (
            <>
              <div className="sectionhead">
                <h2>{t('detay.videolar')}</h2>
              </div>
              <div className="stack">
                {p.videos.map((v, i) => (
                  <button
                    key={i}
                    className="listitem"
                    onClick={() => {
                      const tur = videoTuru(v)
                      if (tur === 'oynat') setAcikVideo(v)
                      else if (tur === 'dis') window.open(v.url, '_blank')
                      else showToast(t('detay.videoYakinda'))
                    }}
                  >
                    <div
                      className="listitem__icon"
                      style={{
                        width: 46, height: 46,
                        background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)',
                      }}
                    >
                      <IconPlay size={23} />
                    </div>
                    <div className="listitem__body">
                      <div className="listitem__title" style={{ whiteSpace: 'normal', fontSize: 15 }}>
                        {v.title}
                      </div>
                      <div className="listitem__sub">
                        {t(v.type === 'tanitim' ? 'detay.tanitim' : 'detay.kullanim')} ·{' '}
                        <VideoSure video={v} />
                      </div>
                    </div>
                    <span className="listitem__chev">
                      <IconRight size={20} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Kılavuz */}
          <button className="btn btn--soft" style={{ marginTop: 18 }} onClick={() => nav(`/kilavuz/${p.id}`)}>
            <IconBook size={20} /> {t('urun.kilavuz')}
          </button>

          {/* Bu makine bende var */}
          <button
            className="listitem listitem--flat"
            style={{ marginTop: 12 }}
            onClick={() => nav('/makine-ekle')}
          >
            <div className="listitem__icon"><IconPlus size={21} /></div>
            <div className="listitem__body">
              <div className="listitem__title" style={{ fontSize: 15.5 }}>{t('detay.bendeVar')}</div>
              <div className="listitem__sub">{t('detay.bendeVarAlt')}</div>
            </div>
            <span className="listitem__chev"><IconRight size={20} /></span>
          </button>

          {/* Benzer ürünler */}
          {benzer.length > 0 && (
            <>
              <div className="sectionhead">
                <h2>{t('detay.ayniKategori')}</h2>
              </div>
            </>
          )}
        </div>

        {benzer.length > 0 && (
          <div className="hscroll">
            {benzer.map((b) => (
              <Link key={b.id} to={`/urun/${b.id}`} className="prodcard" style={{ width: 156 }}>
                <UrunFoto urunId={b.id} ad={b.name} tip="wide" ikonBoyut={32} />
                <div className="prodcard__body">
                  <div className="prodcard__name">{b.name}</div>
                  <div className="prodcard__sub">{b.tagline}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sabit eylem çubuğu — yanına "Ara" butonu konmuyor:
            müşteri zaten teklif istiyor, dönüşü biz yapacağız. */}
        <div className="actionbar">
          <button
            className="btn btn--orange"
            onClick={() => nav(`/talep?tur=satinalma&urun=${p.id}`)}
          >
            <IconCart size={20} /> {t('urun.teklifIste')}
          </button>
        </div>
      </div>

      <VideoOynatici video={acikVideo} onClose={() => setAcikVideo(null)} />

      <TabBar />
    </div>
  )
}
