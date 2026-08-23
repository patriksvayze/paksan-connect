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
import './styles.css'

import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
