import { ParcaKarti as OrtakParcaKarti } from '../components/ParcaKarti'

/* ==========================================================================
   Parça kartı — Servisim kabuğu

   Kartın kendisi `src/components/ParcaKarti.jsx` içinde; gerekçesi ve
   düzeni orada yazılı. 24 Eylül 2026'da Connect'in parça seçimi de aynı
   karta geçti ve kart ortak klasöre taşındı: müşteri APK'sı servis
   klasöründen hiçbir şey almamalı.

   Bu dosya YALNIZ SERVİSİM'İN YAZISINI veriyor. Kart iki dilli
   Connect'te de çizildiği için "görsel yok" notu kartın içine gömülü
   değil; Servisim tek dilli, notu burada veriyor. Servisim ekranları
   (ParcaSec.jsx, SiparisVer.jsx) kartı eskisi gibi buradan alıyor,
   hiçbiri değişmedi. Çağıran `gorselYok` verirse onunki geçerli.
   ========================================================================== */

export function ParcaKarti(props) {
  return <OrtakParcaKarti gorselYok="Görsel yok" {...props} />
}
