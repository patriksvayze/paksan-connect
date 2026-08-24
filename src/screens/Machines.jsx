import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { CIZIM } from '../data/cizimler'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { getProduct, urunDilde } from '../data/products'
import { formatSerial, warrantyStatus } from '../lib/serial'
import { IconMachine, IconPlus, IconRight, IconCheckCircle } from '../components/Icons'

export default function Machines() {
  const nav = useNavigate()
  const { machines } = useApp()
  const { t, dil } = useDil()
  const [params] = useSearchParams()

  /* Kutlama yalnız yeni satış Logo'dan doğrulandığında geliyor
     (bkz. src/lib/logo.js). Bir kez gösterilip kapanıyor. */
  const [kutlama, setKutlama] = useState(() => {
    const id = params.get('kutlama')
    return id ? machines.find((m) => m.id === id) || null : null
  })

  return (
    <div className="app">
      {kutlama && (
        <Kutlama
          makine={kutlama}
          dil={dil}
          t={t}
          onKapat={() => setKutlama(null)}
          onGit={() => {
            setKutlama(null)
            nav('/makine/' + kutlama.id)
          }}
        />
      )}
      {/* Başlıkta ayrı bir "+" butonu yok: makine ekleme zaten sayfanın
          gövdesinde, hem boş hâlde hem listenin altında duruyor. */}
      <TopBar
        title={t('makine.baslik')}
        sub={machines.length ? t('makine.makineSayisi', { n: machines.length }) : t('makine.henuzYok')}
        back="auto"
      />

      <div className="screen wrap fade-in" style={{ paddingTop: 18 }}>
        {machines.length === 0 ? (
          <div className="empty">
            {/* Simge yerine çizim: boş ekran, kullanıcının uygulamada
                ilk karşılaştığı yerlerden biri. */}
            <img className="empty__cizim" src={CIZIM.bosMakine} alt="" />
            <h2 style={{ fontSize: 18.5, marginBottom: 8 }}>{t('makine.bosBaslik2')}</h2>
            <p style={{ lineHeight: 1.6, marginBottom: 24 }}>{t('makine.bosAlt2')}</p>
            <button className="btn btn--primary btn--lg" onClick={() => nav('/makine-ekle')}>
              <IconPlus size={22} /> {t('makine.ekle')}
            </button>
          </div>
        ) : (
          <div className="stack">
            {machines.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}

            <button
              className="btn btn--soft"
              style={{ marginTop: 6 }}
              onClick={() => nav('/makine-ekle')}
            >
              <IconPlus size={20} /> {t('makine.baskaEkle')}
            </button>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  )
}

export function MachineCard({ machine }) {
  const { t, dil } = useDil()
  const p = urunDilde(getProduct(machine.productId), dil)
  const g = warrantyStatus(machine.year, t)
  if (!p) return null

  return (
    <Link to={`/makine/${machine.id}`} className="listitem">
      <UrunFoto urunId={p.id} ad={p.name} tip="thumb" ikonBoyut={30} />
      <div className="listitem__body">
        {/* Başlık daima model adı — kullanıcının kendi notu ayrı etiket olarak durur */}
        <div className="listitem__title">{p.name}</div>
        <div className="listitem__sub">{p.tagline}</div>
        <div className="listitem__sub serial-mono" style={{ fontSize: 12.5 }}>
          {formatSerial(machine.serial)}
        </div>
        <div className="row" style={{ marginTop: 7, gap: 6, flexWrap: 'wrap' }}>
          <span className={'badge badge--' + (g.tone || 'blue')}>{g.label}</span>
          {machine.nickname && <span className="badge">{machine.nickname}</span>}
        </div>
      </div>
      <span className="listitem__chev">
        <IconRight size={21} />
      </span>
    </Link>
  )
}

/* Yeni makine kutlaması.

   Ekranın üstünden kayarak giren pencere. Yalnız gerçekten yeni bir
   satış olduğunda çıkıyor: seri numarası Logo'da fatura edilmiş ve
   fatura yeni tarihli olmalı. Logo bağlı değilken hiç çıkmıyor. */
function Kutlama({ makine, dil, t, onKapat, onGit }) {
  const urun = urunDilde(getProduct(makine.productId), dil)

  return (
    <div className="kutlama" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kutlama__kart">
        <div className="kutlama__ikon">
          <IconCheckCircle size={58} />
        </div>
        <h2 className="kutlama__baslik">{t('kutlama.baslik')}</h2>
        <p className="kutlama__metin">
          {t('kutlama.metin', { makine: urun?.name || makine.nickname || '' })}
        </p>
        <button className="btn btn--primary btn--lg" onClick={onGit}>
          {t('kutlama.makinemeGit')}
        </button>
        <button className="btn btn--soft" style={{ marginTop: 10 }} onClick={onKapat}>
          {t('kutlama.kapat')}
        </button>
      </div>
    </div>
  )
}
