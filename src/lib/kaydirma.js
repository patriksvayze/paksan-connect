import { useEffect, useState } from 'react'

/* Sayfa kaydırıldı mı?

   Tasarım v3'te başlık çubuğu renkli değil, açık zeminin üstünde buğulu
   duruyor. İçerik başlığın altından geçmeye başlayınca sınırın belli olması
   için ince bir çizgi çıkar (`.topbar--scrolled`). */
export function useKaydirildi(esik = 8) {
  const [kaydirildi, setKaydirildi] = useState(false)

  useEffect(() => {
    const bak = () => setKaydirildi(window.scrollY > esik)
    bak()
    window.addEventListener('scroll', bak, { passive: true })
    return () => window.removeEventListener('scroll', bak)
  }, [esik])

  return kaydirildi
}
