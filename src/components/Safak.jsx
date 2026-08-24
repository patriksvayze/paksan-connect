import { useEffect, useRef, useState } from 'react'
import { PaksanLogo } from './Marka'
import tarla from '../assets/gorseller/karsilama-tarla.png'

/* ==========================================================================
   Şafak — karşılama ekranının açılış sahnesi

   NE OLUYOR

   Uygulama açıldığında gün doğuyor: gökyüzü gece lacivertinden şafak
   turuncusuna, oradan sabah mavisine dönüyor; güneş ufkun arkasından
   yükseliyor; PAKSAN logosu güneşle birlikte doğuyor. Altta tarla ve
   balyalar duruyor.

   NEDEN GÜNEŞ AYRI ÇİZİLİYOR

   Güneş de logo da görselin içine gömülü DEĞİL; ikisi de ayrı katman.
   Gömülü olsalardı hareket ettirilemezlerdi. Tarla görseli hareketsiz
   duruyor, gökyüzü CSS ile boyanıyor, güneş ve logo yükseliyor.

   Görselin kendi gökyüzü kırpıldı ve üstünde kalan şerit saydam
   yapıldı; böylece boyanan gökyüzü onun arkasından görünüyor.

   BİR KERE OYNUYOR

   Kullanıcı kayıt ekranına gidip geri geldiğinde animasyon baştan
   başlamıyor. Bir açılışta bir kez oynuyor; ikinci gelişte sahne
   doğrudan bitmiş hâliyle duruyor. Her seferinde iki saniye beklemek
   çabuk sıkar.

   HAREKET İSTEMEYENE HAREKET YOK

   Telefonunda "hareketi azalt" açık olan kullanıcıya animasyon hiç
   oynatılmıyor, sahne doğrudan son hâlinde geliyor. Bu bir tercih
   değil erişilebilirlik meselesi: hareket bazı insanlarda baş dönmesi
   yapıyor.
   ========================================================================== */

/* Animasyon bu oturumda oynadı mı. Bileşenin dışında duruyor ki
   ekrandan çıkıp geri gelince sıfırlanmasın. */
let oynadi = false

export function Safak({ children }) {
  const azalt = useRef(
    typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  /* İlk açılışta animasyonlu, sonrasında bitmiş hâlde. */
  const [bitti, setBitti] = useState(() => oynadi || azalt.current)

  useEffect(() => {
    if (bitti) return
    /* İşaret animasyon BAŞLARKEN değil BİTERKEN konuyor.

       Başlarken konsaydı React'in geliştirme kipindeki çift bağlaması
       onu daha ilk anda kapatıyordu: ilk bağlanmada işaret konuyor,
       hemen ardından bileşen yeniden bağlanıyor ve "zaten oynadı"
       diyerek sahneyi bitmiş hâlde açıyordu. Animasyon hiç
       görünmüyordu. */
    const sayac = setTimeout(() => {
      oynadi = true
      setBitti(true)
    }, 2600)
    return () => clearTimeout(sayac)
  }, [bitti])

  return (
    <div className={'safak' + (bitti ? ' safak--bitti' : '')}>
      <div className="safak__gok" />
      <div className="safak__gunes" />
      <img className="safak__tarla" src={tarla} alt="" />

      <div className="safak__logo">
        <PaksanLogo height={64} sadeceYazi beyaz />
      </div>

      <div className="safak__ic">{children}</div>
    </div>
  )
}
