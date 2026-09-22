import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useKaydirildi } from '../lib/kaydirma'
import { useDil } from '../i18n'
import { Rozet, RozetMini } from '../marka'
import { IconHome, IconBaler, IconChat, IconGrid, IconBack, IconUser } from './Icons'

/* -------------------------------------------------------------- Üst bar

   Buton üzerinde yalnızca "Geri" yazar ve gerçekten geldiğiniz sayfaya
   döner. Uygulamaya doğrudan bu sayfadan girildiyse (geçmiş yoksa)
   verilen yedek yola gider.

   back prop:
     yok / false → geri butonu yok
     true        → her zaman göster, geçmişte bir adım geri
     'auto'      → yalnızca uygulama içinden gelindiyse göster
     '/yol'      → her zaman göster; geçmiş yoksa bu yola git

   Zemin açık olduğu için logo kendi kurumsal mavisiyle, rozetsiz durur. */

export function TopBar({ title, sub, back, right }) {
  const nav = useNavigate()
  const { t } = useDil()
  const loc = useLocation()
  const kaydirildi = useKaydirildi()
  const sinif = 'topbar' + (kaydirildi ? ' topbar--scrolled' : '')

  /* location.key ilk açılışta 'default' olur. Farklıysa uygulama içinde
     gezinerek gelindi demektir; geri gitmek güvenli. */
  const gecmisVar = loc.key !== 'default'
  const geriGoster = back === 'auto' ? gecmisVar : Boolean(back)

  function geri() {
    /* Ekran kendi geri işini verdiyse o çalışıyor: çok adımlı formda
       geri, bir önceki SAYFA değil bir önceki ADIM demek. */
    if (typeof back === 'function') return back()
    if (gecmisVar) nav(-1)
    else if (typeof back === 'string' && back !== 'auto') nav(back)
    else nav('/')
  }

  /* Marka her başlıkta durur. Sayfaya ait bir işlem butonu varsa
     yer kalsın diye logo yerine kalkan amblemi gösterilir. */
  const marka = right ? (
    <>
      {right}
      <RozetMini />
    </>
  ) : (
    <Rozet />
  )

  const basliklar = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )

  /* Başlık iki durumda kendi satırına iner:

     - Geri butonu varken: buton net "Geri" yazar, sayfa adıyla yan
       yana gelip karışmaz.
     - Sayfaya ait bir işlem butonu varken: başlık, butonla ve amblemle
       aynı satırı paylaşınca daralıyordu. Bildirimler ekranı doğrudan
       açıldığında (geri butonu yokken) 390 piksel genişlikte başlığa
       106 piksel kalıyordu ve "Bildirimler" "Bildirimle" diye kesiliyordu.
       Artık buton ve amblem üst satırda, başlık altta tüm genişlikte. */
  if (geriGoster || right) {
    return (
      <header className={sinif}>
        <div className="topbar__row">
          {geriGoster && (
            <button className="backbtn" onClick={geri}>
              <IconBack size={21} />
              {t('ortak.geri')}
            </button>
          )}
          <div className="spacer" />
          {marka}
        </div>
        <div className="topbar__titles">{basliklar}</div>
      </header>
    )
  }

  return (
    <header className={sinif}>
      <div className="topbar__row">
        {basliklar}
        {marka}
      </div>
    </header>
  )
}

/* ------------------------------------------------------------- Alt menü */

/* `altYollar`: sekmenin kendi adresi dışında, o sekmeye ait sayılan
   sayfalar. Makine detayındayken "Makinelerim", kılavuzdayken "Ürünler"
   yanar — kullanıcı uygulamanın neresinde olduğunu görür. */
const TABS = [
  { to: '/', anahtar: 'menu.anasayfa', Icon: IconHome, altYollar: [] },
  {
    to: '/makinelerim',
    anahtar: 'menu.makinelerim',
    Icon: IconBaler,
    /* MAKİNE SİMGESİ BİRAZ BÜYÜK ÇİZİLİYOR (28 piksel).

       Öteki simgeler kare; balya makinesi yatay bir çizim (en/boy oranı
       yaklaşık 1,5): 24 pikselde boyu 15 piksele düşüyor ve komşularının
       yanında küçük kalıyor. 28 pikselde eni 26, boyu 18 oluyor —
       komşularıyla aynı ağırlıkta; kapsül 58'e 46, rahat sığıyor.
       Eski (izlenmiş) çizim daha geniş olduğu için 36 pikselde
       çiziliyordu; 22 Eylül 2026'da yeni çizimle 28'e indi
       (bkz. Icons.jsx → IconBaler). */
    ikonBoyut: 28,
    altYollar: ['/makine-ekle', '/makine/'],
  },
  {
    to: '/urunler',
    anahtar: 'menu.urunler',
    Icon: IconGrid,
    altYollar: ['/urun/', '/kilavuz'],
  },
  { to: '/destek', anahtar: 'menu.destek', Icon: IconChat, altYollar: [] },
  /* Profil en sağda: hesabına bakmak nadiren yapılan bir iş, en uçta
     durması yanlışlıkla dokunulmasını da azaltıyor. */
  { to: '/profil', anahtar: 'menu.profil', Icon: IconUser, altYollar: ['/numara-degisikligi'] },
]

export function TabBar() {
  const { pathname } = useLocation()
  const { t } = useDil()

  return (
    <nav className="tabbar">
      {TABS.map(({ to, anahtar, Icon, altYollar, sinif, ikonBoyut }) => {
        const kendi = to === '/' ? pathname === '/' : pathname.startsWith(to)
        const aktif = kendi || altYollar.some((y) => pathname.startsWith(y))

        return (
          <NavLink
            key={to}
            to={to}
            className={
              'tabbar__item' +
              (aktif ? ' tabbar__item--on' : '') +
              (sinif ? ' ' + sinif : '')
            }
          >
            {/* Simge kendi kapsülünün içinde. Seçili rengi yazıyı
                değil yalnız simgeyi sarıyor — sebebi styles.css'te
                `.tabbar__ikon` yanında yazılı. */}
            <span className="tabbar__ikon">
              <Icon size={ikonBoyut || 24} />
            </span>
            <span className="tabbar__label">{t(anahtar)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

/* ------------------------------------------------------------ Alt sayfa */

/* Alt sayfa, tutma yerinden aşağı kaydırılarak kapatılabiliyor.

   Kaydırma yalnızca tutma yerinden (üstteki gri çubuk ve başlık) başlar;
   içerikten başlarsa sayfa normal kayar, yoksa uzun metinleri (KVKK gibi)
   okumak imkânsız olurdu. Parmak sayfayı gerçekten sürüklüyor: yarıdan
   fazla indiyse veya hızlı bir aşağı hareket yapıldıysa kapanır, aksi
   halde yerine geri oturur.                                             */

const KAPANMA_ESIGI = 110 // px
const HIZ_ESIGI = 0.55 // px/ms

export function Sheet({ open, onClose, title, children }) {
  const [y, setY] = useState(0)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const bas = useRef(null)

  /* Kapandığında bir sonraki açılış sıfırdan başlasın */
  useEffect(() => {
    if (!open) {
      setY(0)
      setSurukleniyor(false)
      bas.current = null
    }
  }, [open])

  if (!open) return null

  function basla(e) {
    bas.current = { y: e.clientY, t: Date.now() }
    setSurukleniyor(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function hareket(e) {
    if (!bas.current) return
    setY(Math.max(0, e.clientY - bas.current.y))
  }

  function bitir(e) {
    if (!bas.current) return
    const mesafe = Math.max(0, e.clientY - bas.current.y)
    const sure = Math.max(1, Date.now() - bas.current.t)
    const hiz = mesafe / sure

    bas.current = null
    setSurukleniyor(false)

    if (mesafe > KAPANMA_ESIGI || hiz > HIZ_ESIGI) onClose?.()
    else setY(0)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: y ? `translateY(${y}px)` : undefined,
          transition: surukleniyor ? 'none' : undefined,
          /* Sürüklerken açılış animasyonu yeniden oynamasın */
          animation: surukleniyor || y ? 'none' : undefined,
        }}
      >
        <div
          className="sheet__tut"
          onPointerDown={basla}
          onPointerMove={hareket}
          onPointerUp={bitir}
          onPointerCancel={bitir}
        >
          <div className="sheet__grab" />
          {title && <h2>{title}</h2>}
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- Bildirim */

export function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  )
}

/* ------------------------------------------------- Anahtar/değer satırı */

export function DataRow({ k, v }) {
  return (
    <div className="datarow">
      <span className="datarow__k">{k}</span>
      <span className="datarow__v">{v}</span>
    </div>
  )
}
