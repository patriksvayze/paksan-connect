import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Sadece Türkçe için gereken alfabeler (latin + latin-ext).
   Kiril/Yunan/Vietnam alfabelerini almıyoruz — uygulama boyutu küçük kalsın. */
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-900.css'
import '@fontsource/roboto/latin-ext-400.css'
import '@fontsource/roboto/latin-ext-500.css'
import '@fontsource/roboto/latin-ext-700.css'
import '@fontsource/roboto/latin-ext-900.css'
/* Ortak ölçü sistemi — boşluk, yazı boyu, yarıçap, dokunma hedefi.
   Üç ürün de aynı dosyayı kullanıyor; renk burada değil, sebebi
   dosyanın başında yazılı. */
import './styles/olcu.css'
import './styles.css'

import App from './App'
import { HataSiniri } from './components/HataSiniri'
import { temayiUygula } from './components/TemaSecici'

/* Kayıtlı görünüm tercihi ilk çizimden ÖNCE uygulanıyor. Sonra
   uygulanırsa koyu tema seçmiş kullanıcı bir an beyaz ekran görüyor —
   gece kullanımda tam da kaçınmak istediğimiz şey. */
temayiUygula()

/* Sınır KÖKTE duruyor: altında ne patlarsa patlasın ekranda bir şey
   kalıyor. Sınır olmadan tek bir çizim hatası kalıcı beyaz ekran
   demekti (bkz. src/components/HataSiniri.jsx). */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HataSiniri urun="app">
      <App />
    </HataSiniri>
  </StrictMode>
)
