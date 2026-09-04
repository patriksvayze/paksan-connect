import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Backoffice } from './Backoffice'
/* Yazı tipi. Uygulama tarafı (src/main.jsx) bunları zaten yüklüyordu,
   backoffice yüklemiyordu: CSS Roboto istiyor ama font hiç gelmediği
   için tarayıcı Segoe UI'ye düşüyordu. Aynı marka, aynı yazı tipi
   olması gerekiyor (bkz. backoffice.css başlığı). 900 dahil, pano
   sayıları o kalınlıkta yazılıyor. */
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-900.css'
import '@fontsource/roboto/latin-ext-400.css'
import '@fontsource/roboto/latin-ext-500.css'
import '@fontsource/roboto/latin-ext-700.css'
import '@fontsource/roboto/latin-ext-900.css'
/* Ortak ölçü sistemi (bkz. src/styles/olcu.css) — üç ürün de paylaşıyor. */
import '../styles/olcu.css'
import './backoffice.css'
import { temayiUygula } from './Tema'

/* Kayıtlı görünüm tercihi ilk çizimden ÖNCE uygulanıyor; koyu seçmiş
   personel bir an beyaz ekran görmesin. */
temayiUygula()

/* PAKSAN Backoffice — telefondaki uygulamadan ayrı bir program.
   Bilgisayarda tarayıcıda açılıyor, APK'nın içine girmiyor. */

createRoot(document.getElementById('backoffice')).render(
  <StrictMode>
    <Backoffice />
  </StrictMode>
)
