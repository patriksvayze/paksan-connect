import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { CIZIM } from '../marka/icerik/cizimler'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { getProduct, urunDilde } from '../marka'
import { formatSerial, warrantyStatus } from '../lib/serial'
import { IconMachine, IconPlus, IconRight, IconCheckCircle } from '../components/Icons'
import { servisGruplari } from '../lib/servisAtama'
import { ServisKarti, ServisYokKarti } from '../components/ServisKarti'

export default function Machines() {
  const nav = useNavigate()
  const { machines, showToast, gorulenler, gorulduIsaretle } = useApp()
  const { t, dil } = useDil()
  const [params, setParams] = useSearchParams()

  /* İKİ SEKME: MAKİNELERİM VE SERVİSLERİM (22 Eylül 2026, kullanıcının
     isteği). Servis kartları ana ekranda "Servislerim" başlığı altında
     duruyordu ve hızlı işlemleri aşağı itiyordu. Servis makineye göre
     belirlendiği için (atama makine başına, bkz. lib/servisAtama.js)
     yeri makinelerin yanı: alt menüdeki Makineler düğmesi bu ekranı
     açıyor, üstte iki sekme. Ana ekrandaki sayı şeridinin "Servislerim"
     kutusu doğrudan ikinci sekmeyi açıyor.

     SEKME ADRESTE (`?sekme=servisler`). Servis kartından makineye geçip
     geri dönen kullanıcı aynı sekmeye dönüyor; durum bileşende
     tutulsaydı geri tuşu hep ilk sekmeye atardı. Sekme değişince adres
     yerinde güncelleniyor, geçmişe yeni satır eklenmiyor: geri tuşu
     sekmeler arasında dolaşmasın. */
  const sekme = params.get('sekme') === 'servisler' ? 'servisler' : 'makineler'
  const sekmeSec = (s) => setParams(s === 'servisler' ? { sekme: 'servisler' } : {}, { replace: true })
  const { gruplar, atanmamis } = servisGruplari(machines)

  /* YENİ GELEN MAKİNE VE SERVİS (22 Eylül 2026). Ana ekrandaki kırmızı
     "Yeni" işareti kullanıcıyı buraya getiriyor. Görülmemiş olanlar
     ekran açılırken bir kez ayrılıyor ve bu ziyaret boyunca kartlarında
     "Yeni" rozeti taşıyor; açık sekme aynı anda görülmüş sayılıyor, bir
     sonraki açılışta rozet yok. Öbür sekmede yeni bir şey varsa sekme
     adının yanında kırmızı nokta. */
  const [yeniler] = useState(() => ({
    makine: gorulenler ? machines.filter((m) => !gorulenler.makine.includes(m.id)).map((m) => m.id) : [],
    servis: gorulenler
      ? gruplar.filter((g) => !gorulenler.servis.includes(g.servis.id)).map((g) => g.servis.id)
      : [],
  }))
  const gorulmemis = (tur, kimlikler) => Boolean(gorulenler) && kimlikler.some((k) => !gorulenler[tur].includes(k))
  const servisKimlikleri = gruplar.map((g) => g.servis.id).join(',')
  useEffect(() => {
    if (sekme === 'servisler') gorulduIsaretle('servis', servisKimlikleri ? servisKimlikleri.split(',') : [])
    else gorulduIsaretle('makine', machines.map((m) => m.id))
  }, [sekme, servisKimlikleri, machines, gorulduIsaretle])

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
        title={sekme === 'servisler' ? t('anasayfa.servislerim') : t('makine.baslik')}
        back="auto"
      />

      <div className="screen wrap fade-in" style={{ paddingTop: 18 }}>
        {/* Sekmeler Profil'deki talep sekmeleriyle aynı bileşen, adetleriyle.
            Makine yokken çizilmiyor: servis makineden çıkıyor, makinesiz
            bir servis sekmesi boş bir sayfa olurdu. */}
        {machines.length > 0 && (
          <div className="sekmeler">
            <button
              type="button"
              className={'sekme' + (sekme === 'makineler' ? ' sekme--on' : '')}
              aria-pressed={sekme === 'makineler'}
              onClick={() => sekmeSec('makineler')}
            >
              {t('anasayfa.makinelerim')}
              <span className="sekme__sayi">{machines.length}</span>
              {sekme !== 'makineler' && gorulmemis('makine', machines.map((m) => m.id)) && (
                <span className="sekme__yeni" aria-label={t('anasayfa.yeni')} />
              )}
            </button>
            <button
              type="button"
              className={'sekme' + (sekme === 'servisler' ? ' sekme--on' : '')}
              aria-pressed={sekme === 'servisler'}
              onClick={() => sekmeSec('servisler')}
            >
              {t('anasayfa.servislerim')}
              <span className="sekme__sayi">{gruplar.length}</span>
              {sekme !== 'servisler' && gorulmemis('servis', gruplar.map((g) => g.servis.id)) && (
                <span className="sekme__yeni" aria-label={t('anasayfa.yeni')} />
              )}
            </button>
          </div>
        )}

        {machines.length > 0 && sekme === 'servisler' ? (
          /* Her servis kendi kartında, baktığı makinelerle (adlar makine
             sayfasına bağlantı). Burada satır hep var: sekmenin sorusu
             tam olarak "hangi makineme kim bakıyor". Servisi olmayan
             makineler en altta, turuncu kartta. */
          <div className="stack">
            {gruplar.map((g) => (
              <ServisKarti
                key={g.servis.id}
                servis={g.servis}
                yeni={yeniler.servis.includes(g.servis.id)}
                makineler={g.makineler}
                showToast={showToast}
                t={t}
                dil={dil}
              />
            ))}
            {atanmamis.length > 0 && (
              <ServisYokKarti makineler={atanmamis} hicbiri={gruplar.length === 0} t={t} dil={dil} />
            )}
          </div>
        ) : machines.length === 0 ? (
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
              <MachineCard key={m.id} machine={m} yeni={yeniler.makine.includes(m.id)} />
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

export function MachineCard({ machine, yeni }) {
  const { t, dil } = useDil()
  const p = urunDilde(getProduct(machine.productId), dil)
  const g = warrantyStatus(machine.year, t)
  if (!p) return null

  return (
    <Link to={`/makine/${machine.id}`} className="listitem">
      <UrunFoto urunId={p.id} ad={p.name} tip="thumb" ikonBoyut={30} />
      <div className="listitem__body">
        {/* Başlık daima model adı — kullanıcının kendi notu ayrı etiket olarak durur */}
        <div className="listitem__title">
          {p.name}
          {/* Hesaba yeni gelen makine, bu ziyaret boyunca (bkz. yukarıda) */}
          {yeni && <span className="badge badge--yeni baslik-rozeti">{t('anasayfa.yeni')}</span>}
        </div>
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
