import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useKaydirildi } from '../lib/kaydirma'
import { useDil } from '../i18n'
import { IconHome, IconBaler, IconDestek, IconGrid, IconBack, IconUser } from './Icons'

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

  /* LOGO BAŞLIKTAN KALKTI, SAYFA ADI ONUN YERİNDE (22 Eylül 2026,
     kullanıcının isteği). Önce sağ üstte logo, geri düğmesinin altında
     ayrı bir satırda sayfa adı duruyordu; başlık iki satır yer tutuyor,
     ekranın gövdesine az yer kalıyordu. Artık tek satır: solda "Geri",
     sağda (logonun yerinde) sayfa adı, varsa en sağda sayfanın işlem
     düğmesi. Logo yalnız ana sayfada kalıyor (bkz. screens/Home.jsx).

     Geri düğmesi yokken ad solda duruyor — sağa yaslanacak bir şey yok.
     Sayfanın işlem düğmesi (bugün yalnız Bildirimler'deki "Tümünü
     okundu olarak işaretle") adın altında kendi satırında, sağda: aynı
     satıra konunca ad 390 pikselde sıkışıp ortada kalıyordu (ölçüldü). */
  const basliklar = (
    <div className={'topbar__ad' + (geriGoster ? ' topbar__ad--sag' : '')}>
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )

  return (
    <header className={sinif}>
      <div className="topbar__row">
        {geriGoster && (
          <button className="backbtn" onClick={geri}>
            <IconBack size={21} />
            {t('ortak.geri')}
          </button>
        )}
        {basliklar}
      </div>
      {right && <div className="topbar__islem-satiri">{right}</div>}
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
  /* Destek bir sohbet değil, adım adım arıza rehberi: simgesi sohbet
     balonuydu ve "birine yazmak" gibi okunuyordu. Daire içinde soru
     işareti her telefonda "yardım" demek (29 Eylül 2026, C1). */
  { to: '/destek', anahtar: 'menu.destek', Icon: IconDestek, altYollar: [] },
  /* Profil en sağda: hesabına bakmak nadiren yapılan bir iş, en uçta
     durması yanlışlıkla dokunulmasını da azaltıyor. */
  { to: '/profil', anahtar: 'menu.profil', Icon: IconUser, altYollar: ['/numara-degisikligi'] },
]

/* Alt payın, güvenli alan dışındaki kısmı: styles.css → .tabbar
   `padding-bottom: calc(8px + var(--safe-bottom))`. İkisi birlikte
   değişir. */
const CUBUK_ALT_PAY = 8

export function TabBar() {
  const { pathname } = useLocation()
  const { t } = useDil()
  const cubuk = useRef(null)

  /* ÇUBUĞUN GERÇEK YÜKSEKLİĞİ (29 Eylül 2026, görünüm önerisi C1).
     Çubuk artık yazılı ve yazıyla birlikte uzuyor: Android'in yazı boyu
     ayarı uygulamanın yazısını da büyütüyor. Ekranın alt boşluğu,
     yapışık işlem çubuğu ve bildirim balonu `--nav-h`'e bakıyor; sabit
     bir sayı kalsaydı büyük yazıda içerik çubuğun altında kalırdı.
     Güvenli alan payı (hareket çubuğu) o formüllerde ayrıca eklendiği
     için burada düşülüyor. */
  useLayoutEffect(() => {
    const el = cubuk.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const yaz = () => {
      const guvenli = Math.max(0, parseFloat(getComputedStyle(el).paddingBottom) - CUBUK_ALT_PAY)
      const yukseklik = Math.round(el.getBoundingClientRect().height - guvenli)
      document.documentElement.style.setProperty('--nav-h', yukseklik + 'px')
    }
    yaz()
    const gozcu = new ResizeObserver(yaz)
    gozcu.observe(el)
    return () => gozcu.disconnect()
  }, [])

  return (
    <nav className="tabbar" ref={cubuk}>
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

/* AÇILIŞTAN SONRAKİ İLK AN DOKUNUŞ YUTULUYOR (29 Eylül 2026, görünüm
   önerisi; kullanıcının onayı). "Gönder"e iki kez basan çiftçinin ikinci
   dokunuşu, açılmakta olan onay sayfasına düşüyordu: parmağının altına ne
   geldiyse — karartılmış zemin (sayfayı kapatır), "Evet" (okumadan
   gönderir) ya da "Vazgeç". Servisim'deki kilidin aynısı
   (servis/ServisPanel.jsx → GECIS_KILIDI_MS): çift dokunmanın aralığından
   uzun, bilerek yapılan bir sonraki dokunuştan kısa. */
const ACILIS_KILIDI_MS = 400

export function Sheet({ open, onClose, title, children }) {
  const [y, setY] = useState(0)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const bas = useRef(null)
  const acilis = useRef(0)

  /* Kapandığında bir sonraki açılış sıfırdan başlasın */
  useEffect(() => {
    if (!open) {
      setY(0)
      setSurukleniyor(false)
      bas.current = null
    } else {
      acilis.current = Date.now()
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

    /* Kapatılamayan pencere (onClose yok: KVKK güncellemesi) sürüklenince
       yerine dönüyor. */
    if (onClose && (mesafe > KAPANMA_ESIGI || hiz > HIZ_ESIGI)) onClose()
    else setY(0)
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      onClickCapture={(e) => {
        if (Date.now() - acilis.current < ACILIS_KILIDI_MS) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
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
