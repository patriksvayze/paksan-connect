import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TabBar } from '../components/Chrome'
import { useKaydirildi } from '../lib/kaydirma'
import { Rozet } from '../marka'
import { UrunFoto } from '../components/Gorsel'
import { MachineCard } from './Machines'
import { PRODUCTS, urunDilde } from '../data/products'
import { bayileriGetir } from '../data/bayiler'
import { rehberListesi } from '../data/rehber'
import { bildirimListesi, okunmamisSayisi } from '../lib/bildirimler'
import {
  IconBook, IconWrench, IconCart, IconPlus, IconParca,
  IconUser, IconCalendar, IconRight, IconBell,
} from '../components/Icons'

/* Vitrinde önce balya makineleri, sonra yem karma. Sıra bilerek sabit. */
const VITRIN = ['super-yunus', 'orka-870', 'ipak-rulo', 'orkinos-1270', 'diamond-dikey']

export default function Home() {
  const nav = useNavigate()
  const { t, dil } = useDil()
  const { user, machines, requests, okunanBildirimler } = useApp()
  const okunmamis = okunmamisSayisi(
    bildirimListesi({ requests, user, makineler: machines }),
    okunanBildirimler
  )
  const kaydirildi = useKaydirildi()
  const ilkAd = user?.ad?.split(' ')[0] || ''
  const vitrin = VITRIN.map((id) => PRODUCTS.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => urunDilde(p, dil))
  const acikTalep = requests.length

  return (
    <div className="app">
      {/* Başlık: renkli çubuk yok — logo solda, profil sağda yuvarlak buton */}
      <header className={'topbar' + (kaydirildi ? ' topbar--scrolled' : '')}>
        <div className="topbar__row" style={{ minHeight: 50 }}>
          <Rozet />
          <div className="spacer" />
          {/* Profil alt menüye taşındı; bu köşe bildirimlere ayrıldı.
              Okunmamış varsa düğmenin üstünde sayı duruyor. */}
          <button className="profilbtn" onClick={() => nav('/bildirimler')}>
            <span className="profilbtn__yuvarlak">
              <IconBell size={26} />
              {okunmamis > 0 && (
                <span className="rozet-sayi">{okunmamis > 9 ? '9+' : okunmamis}</span>
              )}
            </span>
            {t('menu.bildirimler')}
          </button>
        </div>
      </header>

      <div className="screen fade-in">
        {/* Karşılama — açık zeminde büyük, kalın başlık.
            Altına tanıtım cümlesi konmuyor: ne yapılacağını hemen
            aşağıdaki butonlar zaten söylüyor. */}
        <div className="wrap" style={{ paddingTop: 6 }}>
          <h1 style={{ fontSize: 30 }}>
            {t('anasayfa.merhaba')}{ilkAd ? ` ${ilkAd}` : ''}
          </h1>
        </div>

        {/* Sayı şeridi — yalnızca gerçekten bildiğimiz veriler.
            Çalışma saati ve garanti sayacı kaldırıldı: makineler bir yere
            bağlı olmadığı için kaç saat çalıştıklarını bilemeyiz. */}
        {machines.length > 0 && (
          <div className="wrap" style={{ marginTop: 18 }}>
            <div className="statstrip">
              <Stat
                v={machines.length}
                k={t('anasayfa.kayitliMakine')}
                onClick={() => nav('/makinelerim')}
              />
              <Stat
                v={acikTalep}
                k={t('anasayfa.aktifTalep')}
                /* Profil sayfası talep listesinden açılsın; kullanıcı
                   aradığı yeri kendisi aramasın. */
                onClick={() => nav('/profil', { state: { odak: 'talepler' } })}
              />
              <Stat v={bayileriGetir().length} k={t('anasayfa.bayiServis')} onClick={() => nav('/bayiler')} />
            </div>
          </div>
        )}

        {/* Hızlı işlemler — üç ana iş, belirgin karolar.
            Destek zaten alt menüde duruyor; buradaki yer servis talebine
            ayrıldı, başka türlü ulaşılacak tek yer destek sohbetinin
            sonuydu. */}
        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="hizli">
            <QuickAction
              icon={<IconWrench size={26} />}
              label={t('anasayfa.servisTalebi')}
              onClick={() => nav('/talep?tur=servis')}
            />
            <QuickAction
              icon={<IconBook size={26} />}
              label={t('anasayfa.kilavuzlar')}
              onClick={() => nav('/kilavuzlar')}
            />
            <QuickAction
              icon={<IconParca size={26} />}
              label={t('anasayfa.yedekParcaTalebi')}
              onClick={() => nav('/talep?tur=parca')}
            />
          </div>

          {/* İki ana çağrı, aynı biçimde ve hizada:
              makinesi olan kaydeder (mavi), olmayan satın alır (turuncu). */}
          {machines.length === 0 && (
            <button
              className="btn btn--brand btn--lg"
              style={{ marginTop: 12 }}
              onClick={() => nav('/makine-ekle')}
            >
              <IconPlus size={22} /> {t('anasayfa.makineKaydet')}
            </button>
          )}

          <button
            className="btn btn--orange btn--lg"
            style={{ marginTop: 12 }}
            onClick={() => nav('/talep?tur=satinalma')}
          >
            <IconCart size={22} /> {t('anasayfa.satinAl')}
          </button>
        </div>

        <div className="wrap">
          {/* Makineler */}
          {machines.length > 0 && (
            <>
              <div className="sectionhead">
                <h2>{t('anasayfa.makinelerim')}</h2>
                <Link to="/makinelerim">{t('anasayfa.tumuSayili', { n: machines.length })}</Link>
              </div>
              <div className="stack">
                {machines.slice(0, 2).map((m) => (
                  <MachineCard key={m.id} machine={m} />
                ))}
              </div>
            </>
          )}

        </div>

        {/* Ürün vitrini */}
        <div className="wrap">
          <div className="sectionhead">
            <h2>{t('anasayfa.urunlerimiz')}</h2>
            <Link to="/urunler">{t('ortak.tumu')}</Link>
          </div>
        </div>
        <div className="hscroll">
          {vitrin.map((p) => (
            <Link key={p.id} to={`/urun/${p.id}`} className="prodcard" style={{ width: 168 }}>
              <UrunFoto urunId={p.id} ad={p.name} tip="wide" ikonBoyut={36} />
              <div className="prodcard__body">
                <div className="prodcard__name">{p.name}</div>
                <div className="prodcard__sub">{p.tagline}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bakım rehberleri — ürünlerin altında */}
        <div className="wrap">
          <div className="sectionhead">
            <h2>{t('anasayfa.bakimRehberi')}</h2>
            <Link to="/bakim">{t('ortak.tumu')}</Link>
          </div>
          <div className="stack">
            {rehberListesi(dil).map((r) => (
              <Link key={r.id} to={`/bakim/${r.id}`} className="listitem">
                <div
                  className="listitem__icon"
                  style={{ background: 'var(--pk-green-soft)', color: 'var(--pk-green-yazi)' }}
                >
                  <IconCalendar size={22} />
                </div>
                <div className="listitem__body">
                  <div className="listitem__title">{r.baslik}</div>
                  <div className="listitem__sub">{r.ozet}</div>
                </div>
                <span className="listitem__chev">
                  <IconRight size={21} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/* Büyük sayı / küçük etiket — referanstaki sayı şeridi.
   Üçü de dokunulabilir: sayıya basınca ilgili sayfaya gider. */
/* Sayı şeridinin bir sütunu.

   Bunlar bilgi gibi görünüp dokunulabilir olduğu anlaşılmıyordu.
   İki işaret eklendi: sayı marka mavisiyle yazılıyor (bağlantı rengi)
   ve etiketin sonunda küçük bir ok duruyor. */
function Stat({ v, k, onClick }) {
  return (
    <button className="statstrip__item" onClick={onClick}>
      <div className="statstrip__v">{v}</div>
      <div className="statstrip__k">
        <span>{k}</span>
        <IconRight size={13} />
      </div>
    </button>
  )
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button className="hizli__karo" onClick={onClick}>
      <span className="hizli__ikon">{icon}</span>
      <span className="hizli__yazi">{label}</span>
    </button>
  )
}
