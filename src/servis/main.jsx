import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ServisPanel } from './ServisPanel'

/* Yazı tipi backoffice ile aynı; servis paneli onun görsel dilini
   paylaşıyor (bkz. servis.css başlığı). */
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
   servis.css yalnız bu panele özel düzen ekliyor, kendi :root'u yok. */
/* Ortak ölçü sistemi (bkz. src/styles/olcu.css) — üç ürün de paylaşıyor.
   Servis uygulaması buradaki ölçüleri en çok kullanan taraf: tarlada,
   güneş altında, çoğu zaman eldivenle açılıyor. */
import '../styles/olcu.css'
import '../backoffice/backoffice.css'
import './servis.css'

import { HataSiniri, hataKaydet } from '../components/HataSiniri'
import { urunAyarla } from '../lib/urun'
import { temayiUygula } from '../backoffice/Tema'
import { demoAPKmi } from './demoKimlik'

/* Paylaşılan dosyalara hangi derlemenin çalıştığı burada bildiriliyor
   (bkz. src/lib/urun.js). Görünüm tercihi ve işlem kaydının rolü buna
   bakıyor; ikisi de backoffice'inkinden ayrı tutuluyor. */
urunAyarla('servis')

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

function ciz() {
  /* Sınır kökte; bir çizim hatası uygulamayı bembeyaz bırakmasın
     (bkz. src/components/HataSiniri.jsx). */
  createRoot(document.getElementById('servis')).render(
    <StrictMode>
      <HataSiniri urun="servis">
        <ServisPanel />
      </HataSiniri>
    </StrictMode>
  )
}

/* DEMO KURULUMU ÇİZİMİ ENGELLEMİYOR.

   Burada `.catch` yoktu: `import('./demoKur')` başarısız olursa —
   parça indirilemedi, hafıza yazılamadı — zincir kırılıyor ve
   `createRoot` hiç çağrılmıyordu. Sonuç boş ekran, konsolda tek satır
   yok. Demo verisi uygulamanın çalışması için şart değil; kurulamazsa
   uygulama boş hafızayla, giriş ekranıyla açılır. O yüzden hata
   yutulmuyor ama çizimi de durdurmuyor: kaydediliyor ve devam
   ediliyor. */
hazir.catch((e) => hataKaydet('servis', e, { nerede: 'demo-kurulumu' })).then(ciz)
