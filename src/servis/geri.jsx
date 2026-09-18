import { createContext, useContext, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as Uygulama } from '@capacitor/app'

/* ==========================================================================
   Android geri tuşu — Servisim

   SORUN

   Servisim'de ekranlar adres değiştirmiyor, state ile değişiyor: talep
   detayı, servis kaydı, parça seçici, alttan açılan yapraklar. WebView'ın
   geçmişi hep boş. Geri tuşunu kimse karşılamayınca Android varsayılanı
   uyguluyor ve uygulama kapanıyordu — yarım kalmış servis kaydıyla.

   ÇÖZÜM

   Geri alınabilecek her katman (Sayfa, Onay, Yaprak, Pencere, sekmeli
   kabuk, çok adımlı form) açıkken buraya bir yakalayıcı bırakıyor. Geri
   gelince EN DERİNDEKİ çalışıyor. Derinlik React ağacından geliyor:
   her katman çocuklarına bir fazlasını veriyor. Böylece sıra kendiliğinden
   çıkıyor:

     yaprak / pencere  →  tam ekran katman (parça seçici, servis kaydı)
       →  detay / alt sayfa  →  sekme kökü (ilk sekmeye dön)

   Derinlik yerine yalnız "son eklenen" sırası kullanılamazdı: React
   effect'leri önce çocukta çalışıyor; aynı anda açılan anne ve çocuktan
   anne en üste yazılır, geri önce anneyi kapatırdı. Eşit derinlikte son
   eklenen kazanıyor.

   Hiçbir katman karşılamazsa (ilk sekmedeyiz ya da giriş ekranı) uygulama
   ARKA PLANA alınıyor, kapatılmıyor. Android 12'den beri kök ekranda geri
   tuşunun sistem davranışı bu: uygulama bitirilmez, görev arkaya gider;
   servis döndüğünde oturumu ve açık ekranı yerinde bulur. exitApp süreci
   öldürür ve bir sonraki açılış soğuk başlar — sahada telefonu cebine
   koyup çıkaran için yanlış.

   PAKSAN Connect'in karşılığı src/lib/android.js ve src/lib/geriYakala.js.
   Onlar react-router'a bağlı ve müşteri APK'sına giriyor; Servisim'in
   kodu src/servis altında kalıyor, o yüzden ayrı yazıldı.
   ========================================================================== */

const yigin = []
let sira = 0

const Derinlik = createContext(0)

/** Geri tuşuna basıldı: en derindeki yakalayıcı çalışır. Karşılandıysa true. */
export function geriBasildi() {
  const adaylar = [...yigin].sort((a, b) => b.derinlik - a.derinlik || b.sira - a.sira)
  for (const k of adaylar) {
    if (k.fn.current() !== false) return true
  }
  return false
}

/**
 * Katman açıkken geri tuşunu yakalar.
 * @param {boolean} aktif yakalayıcı şu an geçerli mi
 * @param {Function} fn geri gelince çalışacak iş; `false` dönerse "ben ilgilenmedim"
 */
export function useGeri(aktif, fn) {
  const derinlik = useContext(Derinlik)
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!aktif) return undefined
    const kayit = { fn: ref, derinlik, sira: ++sira }
    yigin.push(kayit)
    return () => {
      const i = yigin.indexOf(kayit)
      if (i !== -1) yigin.splice(i, 1)
    }
  }, [aktif, derinlik])
  return derinlik
}

/** Çocuklarını bir derin katmana koyar. */
export function GeriKatmani({ derinlik, children }) {
  return <Derinlik.Provider value={derinlik + 1}>{children}</Derinlik.Provider>
}

/** Uygulama açılışında bir kez çağrılır. Tarayıcıda hiçbir şey yapmaz. */
export function geriTusunuKur() {
  if (!Capacitor.isNativePlatform()) return
  /* Dinleyici eklendiği anda AppPlugin geri basışlarını WebView geçmişine
     değil buraya yönlendiriyor; kök ekranda da karar bizde. */
  Uygulama.addListener('backButton', () => {
    if (!geriBasildi()) Uygulama.minimizeApp()
  })
}
