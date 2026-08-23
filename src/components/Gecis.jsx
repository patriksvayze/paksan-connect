import { useLocation, useNavigationType } from 'react-router-dom'

/* Sayfa geçiş sarmalayıcısı.

   Her adres değişiminde içeriği yeniden çizdirip kısa bir kayma
   animasyonu veriyor. Yön, gezinmenin türünden anlaşılıyor:
     · yeni sayfaya gidildiyse (PUSH)  → sağdan gelir
     · geri gelindiyse (POP)           → soldan gelir

   Hareketi kapalı cihazlarda styles.css'teki
   `prefers-reduced-motion` kuralı animasyonu zaten devre dışı bırakıyor.

   ANAHTAR DOĞRUDAN `pathname` — EFFECT İÇİNDEN DEĞİL.

   Önceki hâli anahtarı bir effect içinde güncelliyordu ve bu, her
   gezinmede ekranı İKİ KEZ kuruyordu:

     1. Adres değişiyor, çocuklar ESKİ anahtarla bir kez çiziliyor →
        yeni ekran kuruluyor, açılış işleri çalışıyor.
     2. Effect anahtarı yeni adrese çekiyor → `key` değiştiği için
        React bütün alt ağacı söküp yeniden kuruyor → açılış işleri
        BİR KEZ DAHA çalışıyor, üstelik ref'ler de sıfırlanmış oluyor.

   Görünür sonucu: kılavuzdaki bir arızaya dokunup destek ekranına
   geçildiğinde soru iki kez gönderiliyor ve iki kez cevaplanıyordu.
   Sunucu bağlandığında bu, her açılışta iki istek demek olurdu.

   Anahtar çizim sırasında hesaplanınca ekran adres başına tam olarak
   bir kez kuruluyor; animasyon aynı şekilde çalışıyor. */

export function Gecis({ children }) {
  const { pathname } = useLocation()
  const tur = useNavigationType() // 'PUSH' | 'POP' | 'REPLACE'

  return (
    <div key={pathname} className={'gecis' + (tur === 'POP' ? ' gecis--geri' : '')}>
      {children}
    </div>
  )
}
