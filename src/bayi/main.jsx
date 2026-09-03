import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BayiPanel } from './BayiPanel'

/* Yazı tipi backoffice ile aynı; bayi paneli onun görsel dilini
   paylaşıyor (bkz. bayi.css başlığı). */
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-900.css'
import '@fontsource/roboto/latin-ext-400.css'
import '@fontsource/roboto/latin-ext-500.css'
import '@fontsource/roboto/latin-ext-700.css'
import '@fontsource/roboto/latin-ext-900.css'

/* Backoffice'in stil kökü paylaşılıyor, üçüncü bir :root açılmıyor.
   Renk token'ları bu projede elle senkron tutuluyor ve iki dosyayı
   eşit tutmak zaten bakım yükü; üçüncüsü onu katlardı.
   bayi.css yalnız bu panele özel düzen ekliyor, kendi :root'u yok. */
import '../backoffice/backoffice.css'
import './bayi.css'

import { temayiUygula } from '../backoffice/Tema'

/* Kayıtlı görünüm tercihi ilk çizimden ÖNCE uygulanıyor. */
temayiUygula()

createRoot(document.getElementById('bayi')).render(
  <StrictMode>
    <BayiPanel />
  </StrictMode>
)
