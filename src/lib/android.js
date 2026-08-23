import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as Uygulama } from '@capacitor/app'
import { geriYakalandiMi } from './geriYakala'

/* ==========================================================================
   Android geri hareketi ve geri tuşu

   Sorun: Android'de kenardan kaydırarak geri gelme hareketi (ve üç tuşlu
   gezinmedeki geri tuşu) uygulamayı komple kapatıyordu. Sebebi, bu
   hareketin uygulamaya "geri" olarak ulaşması ama karşılayan kimsenin
   olmaması — Android de varsayılan davranışı uygulayıp uygulamayı arka
   plana atıyordu.

   Çözüm: hareketi burada karşılayıp uygulamanın kendi gezinme geçmişine
   bağlıyoruz. Kural, Android'in kendi tasarım rehberindeki gibi:

     · Alt sayfadaysa      → bir önceki sayfaya döner
     · Kök sekmedeyse      → ana sayfaya döner
       (Makinelerim, Destek, Ürünler)
     · Ana sayfadaysa      → "çıkmak için tekrar" uyarısı, ikinci geride
                             uygulama arka plana alınır

   Böylece hem kenardan kaydırma hem de geri tuşu aynı şekilde çalışır;
   ikisi de Android'e aynı olay olarak ulaştığı için tek yerden yönetilir.

   Tarayıcıda hiçbir şey yapmaz (olay zaten gelmez).
   ========================================================================== */

const KOK_SEKMELER = ['/makinelerim', '/destek', '/urunler']
const CIKIS_SURESI = 2000 // iki geri arasındaki süre (ms)

export function useAndroidGeri(showToast, cikisUyarisi) {
  const nav = useNavigate()
  const { pathname } = useLocation()

  /* Olay dinleyicisi bir kez kuruluyor; o yüzden güncel yol ve son geri
     zamanı ref'te tutuluyor, dinleyici hep tazesini okuyor. */
  const yolRef = useRef(pathname)
  yolRef.current = pathname
  const sonGeriRef = useRef(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let kayit
    let kaldirildi = false

    Uygulama.addListener('backButton', () => {
      /* Ekranın kendi geri işi varsa önce o çalışır: çok adımlı formda
         geri, bir önceki SAYFA değil bir önceki ADIM demek
         (bkz. src/lib/geriYakala.js). */
      if (geriYakalandiMi()) return

      const yol = yolRef.current

      if (yol !== '/') {
        if (KOK_SEKMELER.includes(yol)) nav('/')
        else nav(-1)
        return
      }

      /* Ana sayfadayız: yanlışlıkla çıkılmasın diye iki kez sorulur. */
      const simdi = Date.now()
      if (simdi - sonGeriRef.current < CIKIS_SURESI) {
        Uygulama.minimizeApp()
      } else {
        sonGeriRef.current = simdi
        showToast?.(cikisUyarisi)
      }
    }).then((h) => {
      if (kaldirildi) h.remove()
      else kayit = h
    })

    return () => {
      kaldirildi = true
      kayit?.remove()
    }
  }, [nav, showToast, cikisUyarisi])
}
