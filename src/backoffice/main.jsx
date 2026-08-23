import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Backoffice } from './Backoffice'
import './backoffice.css'

/* PAKSAN Backoffice — telefondaki uygulamadan ayrı bir program.
   Bilgisayarda tarayıcıda açılıyor, APK'nın içine girmiyor. */

createRoot(document.getElementById('backoffice')).render(
  <StrictMode>
    <Backoffice />
  </StrictMode>
)
