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
/* Ortak ölçü sistemi (bkz. src/styles/olcu.css) — üç ürün de paylaşıyor.
   Bayi uygulaması buradaki ölçüleri en çok kullanan taraf: tarlada,
   güneş altında, çoğu zaman eldivenle açılıyor. */
import '../styles/olcu.css'
import '../backoffice/backoffice.css'
import './bayi.css'

import { urunAyarla } from '../lib/urun'
import { temayiUygula } from '../backoffice/Tema'
import { demoAPKmi } from './demoKimlik'

/* Paylaşılan dosyalara hangi derlemenin çalıştığı burada bildiriliyor
   (bkz. src/lib/urun.js). Görünüm tercihi ve işlem kaydının rolü buna
   bakıyor; ikisi de backoffice'inkinden ayrı tutuluyor. */
urunAyarla('bayi')

/* Kayıtlı görünüm tercihi ilk çizimden ÖNCE uygulanıyor. */
temayiUygula()

/* DEMO APK'SI KENDİ VERİSİNİ KURUYOR.

   Telefona kurulan sürüm boş bir hafızayla açılıyor: kayıtlı hesap
   yok, girilecek bir şey yok. Kurulum `demoKur.js` içinde, gerekçesiyle
   yazılı. Tarayıcı paneli bu dosyayı yüklemiyor bile — `import()`
   ayrı bir parça üretiyor, koşul sağlanmazsa indirilmiyor.

   Kurulum bitmeden çizilmiyor: ekran önce boş giriş, sonra dolu ekran
   diye iki kez değişirdi. */
const hazir = demoAPKmi()
  ? import('./demoKur').then((m) => m.demoKur())
  : Promise.resolve()

hazir.then(() => {
  createRoot(document.getElementById('bayi')).render(
    <StrictMode>
      <BayiPanel />
    </StrictMode>
  )
})
