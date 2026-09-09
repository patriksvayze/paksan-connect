import { useEffect } from 'react'
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppState'
import { useAndroidGeri } from './lib/android'
import { useBildirimYayini } from './lib/bildirimYayini'
import { bildirimListesi } from './lib/bildirimler'
import { useDil } from './i18n'
import { Toast } from './components/Chrome'
import { Gecis } from './components/Gecis'
import { Duyuru } from './components/Duyuru'

import Welcome from './screens/Welcome'
import Register from './screens/Register'
import Login from './screens/Login'
import SifreSifirla from './screens/SifreSifirla'
import NumaraDegisikligi from './screens/NumaraDegisikligi'
import Home from './screens/Home'
import Machines from './screens/Machines'
import AddMachine from './screens/AddMachine'
import MachineDetail from './screens/MachineDetail'
import Support from './screens/Support'
import Catalog from './screens/Catalog'
import ProductDetail from './screens/ProductDetail'
import Manual from './screens/Manual'
import RequestForm from './screens/RequestForm'
import RequestDetail from './screens/RequestDetail'
import Profile from './screens/Profile'
import Notifications from './screens/Notifications'
import Bayiler from './screens/Bayiler'
import Guide from './screens/Guide'
import Guides from './screens/Guides'
import Manuals from './screens/Manuals'
import ManualSafety from './screens/ManualSafety'

/* Sayfa değişince en üste dön */
function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/* Bilinmeyen adres.

   Burada YÖNLENDİRME YAPILMIYOR, ekran gösteriliyor. Sebebi:
   kayıt tamamlanırken kullanıcının yazılması ile adresin değişmesi aynı
   anda olur. Arada bir karelik "adres yeni, kullanıcı henüz eski" hâli
   oluşuyor ve o karede çalışan bir yönlendirme, kaydın hemen ardından
   gidilecek ekranı eziyordu (kullanıcı makine ekleme yerine ana sayfaya
   düşüyordu). Yönlendirme yerine ekran çizmek bu sorunu tamamen kaldırır. */
function Bulunamadi() {
  const { t } = useDil()
  return (
    <div className="app">
      <div className="screen screen--nonav wrap center" style={{ paddingTop: 90 }}>
        <h2 style={{ fontSize: 20 }}>{t('ortak.bulunamadi')}</h2>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          {t('ortak.bulunamadiAlt')}
        </p>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 22 }}>
          {t('ortak.anaSayfayaDon')}
        </Link>
      </div>
    </div>
  )
}

function Yonlendirme() {
  const { user, requests, machines, showToast } = useApp()
  const { t } = useDil()

  /* Android'in geri hareketi ve geri tuşu uygulamayı kapatmasın,
     uygulama içinde gezinsin (bkz. src/lib/android.js) */
  useAndroidGeri(showToast, t('ortak.cikmakIcin'))

  /* Yeni bildirimler telefonun kendi bildirim perdesine düşüyor.
     Burada duruyor, tek bir ekranda değil: kullanıcı hangi sayfada
     olursa olsun bildirimi alsın (bkz. src/lib/bildirimYayini.js). */
  useBildirimYayini(
    bildirimListesi({ requests, user, makineler: machines }),
    t,
    Boolean(user),
  )

  /* Kayıtsız kullanıcı yalnızca karşılama, kayıt ve giriş ekranlarını
     görebilir; başka bir adres istenirse karşılama açılır. */
  if (!user) {
    return (
      <Routes>
        <Route path="/kayit" element={<Register />} />
        <Route path="/giris" element={<Login />} />
        <Route path="/sifremi-unuttum" element={<SifreSifirla />} />
        <Route path="/numara-degisikligi" element={<NumaraDegisikligi />} />
        <Route path="*" element={<Welcome />} />
      </Routes>
    )
  }

  return (
    <Gecis>
      {/* PAKSAN duyurusu varsa açılışta bir kez pencere olarak çıkıyor;
          sonrasında Bildirimler listesinde kalıyor
          (bkz. src/components/Duyuru.jsx). */}
      <Duyuru />
      <Routes>
        <Route path="/" element={<Home />} />
      <Route path="/makinelerim" element={<Machines />} />
      <Route path="/makine-ekle" element={<AddMachine />} />
      <Route path="/makine/:id" element={<MachineDetail />} />
      <Route path="/destek" element={<Support />} />
      <Route path="/destek/:machineId" element={<Support />} />
      <Route path="/urunler" element={<Catalog />} />
      <Route path="/urun/:id" element={<ProductDetail />} />
      <Route path="/kilavuzlar" element={<Manuals />} />
      <Route path="/kilavuzlar/guvenlik" element={<ManualSafety />} />
      <Route path="/kilavuz/:productId" element={<Manual />} />
      <Route path="/talep" element={<RequestForm />} />
      {/* Talebin kendisi ayrı ekran: bildirime dokunan kişi durumu,
          iptal sebebini, verilen teklifi ve kargo takip numarasını
          burada görüyor (bkz. src/screens/RequestDetail.jsx). */}
      <Route path="/talebim/:id" element={<RequestDetail />} />
      <Route path="/profil" element={<Profile />} />
      <Route path="/bildirimler" element={<Notifications />} />
      <Route path="/bayiler" element={<Bayiler />} />
      <Route path="/bakim" element={<Guides />} />
      <Route path="/bakim/:rehberId" element={<Guide />} />
      {/* Numara değişikliği oturum açıkken de açılabiliyor: profildeki
          kilitli numaranın yanındaki bağlantıdan geliniyor. */}
      <Route path="/numara-degisikligi" element={<NumaraDegisikligi />} />
        <Route path="*" element={<Bulunamadi />} />
      </Routes>
    </Gecis>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ScrollTop />
        <Yonlendirme />
        <Toast />
      </HashRouter>
    </AppProvider>
  )
}
