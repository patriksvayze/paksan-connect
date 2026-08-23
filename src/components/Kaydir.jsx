import { useEffect, useRef, useState } from 'react'
import { useDil } from '../i18n'

/* Kaydırarak silinen satır.

   Satırı sola kaydırınca altından "Sil" düğmesi çıkar. Parmağı bırakınca
   satır ya açık kalır ya da yerine döner — yarım yolda kalmaz.
   Dokunmatik olmayan cihazlarda (masaüstü tarayıcı) fare ile de çalışsın
   diye pointer olayları kullanılıyor.

   Neden kaydırma? Listede her satırın yanında sürekli duran çöp kutusu
   ikonu hem kalabalık yapıyor hem de yanlışlıkla basılıyor. Kaydırma
   niyet gerektiriyor, kaza olmuyor.

   Düzenleme seçeneği kaldırıldı: gönderilmiş bir talebin içeriğini
   sonradan değiştirmek, Paksan tarafındaki kayıtla ekranda görünenin
   ayrışmasına yol açıyordu. Değişiklik gerekiyorsa talep silinip
   yenisi açılıyor.                                                     */

const ACIKLIK = 76 // tek düğmenin genişliği
const ESIK = 45 // bu kadar kaydırınca açık kabul edilir

/* Dokununca satır bu kadar sola kayıp geri dönüyor: altında bir şey
   olduğu görünüyor ama silme açılmıyor. Kaydırmayı hiç denemeyen
   kullanıcı düğmenin varlığını böyle öğreniyor. */
const GOZ_KIRP = 26
const GOZ_KIRP_SURE = 620 // ms
/* Bu kadar hareketten azı dokunuş sayılıyor */
const DOKUNUS_ESIGI = 6

/**
 * @param {Function} [onDokun] satıra dokunulunca çalışır. Verildiğinde
 *   dokunuş "göz kırpma"yı değil bu işi tetikliyor — satırın açacağı
 *   bir ekran varsa dokunmanın karşılığı o ekran olmalı. Göz kırpma
 *   yalnızca dokununca başka bir şey olmayan satırlarda anlamlı.
 */
export function KaydirilirSatir({ children, onSil, onDokun }) {
  const { t } = useDil()
  const [x, setX] = useState(0)
  const [suruklenıyor, setSurukleniyor] = useState(false)
  const baslangic = useRef(null)
  const acikRef = useRef(false)
  const gozKirpRef = useRef(null)

  /* Ekrandan çıkarken bekleyen geri dönüş zamanlayıcısı kalmasın */
  useEffect(() => () => clearTimeout(gozKirpRef.current), [])

  function basla(e) {
    clearTimeout(gozKirpRef.current)
    baslangic.current = {
      x: e.clientX,
      y: e.clientY,
      baslangicX: acikRef.current ? -ACIKLIK : 0,
      hareket: 0,
      dikey: false,
    }
    setSurukleniyor(true)
  }

  function hareket(e) {
    if (!baslangic.current) return
    const dx = e.clientX - baslangic.current.x
    const dy = e.clientY - baslangic.current.y

    /* Dikey kaydırma niyeti varsa karışma — sayfa normal kaysın.
       Bu bir dokunuş da sayılmıyor: sayfayı kaydırmak için satırın
       üstünden tutan kullanıcıya "silebilirsin" diye göz kırpmak
       rahatsız ediciydi. */
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      baslangic.current.dikey = true
      bitir()
      return
    }

    baslangic.current.hareket = Math.max(baslangic.current.hareket, Math.abs(dx))
    const yeni = Math.min(0, Math.max(-ACIKLIK, baslangic.current.baslangicX + dx))
    setX(yeni)
  }

  function bitir() {
    if (!baslangic.current) return
    const dokunus =
      !baslangic.current.dikey && baslangic.current.hareket < DOKUNUS_ESIGI
    baslangic.current = null
    setSurukleniyor(false)

    /* Kaydırmadan dokunuldu.

       Satır açıksa önce kapanıyor — açık silme düğmesinin üstünden
       başka bir ekrana atlamak istemeyiz.

       Kapalıysa: satırın açacağı bir ekran varsa oraya gidiliyor,
       yoksa göz kırpıp altındaki silme düğmesini tanıtıyor. */
    if (dokunus) {
      if (acikRef.current) {
        acikRef.current = false
        setX(0)
        return
      }
      if (onDokun) {
        onDokun()
        return
      }
      setX(-GOZ_KIRP)
      gozKirpRef.current = setTimeout(() => setX(0), GOZ_KIRP_SURE)
      return
    }

    setX((mevcut) => {
      const acik = mevcut < -ESIK
      acikRef.current = acik
      return acik ? -ACIKLIK : 0
    })
  }

  function kapat() {
    clearTimeout(gozKirpRef.current)
    acikRef.current = false
    setX(0)
  }

  /* Satır kapalıyken işlem düğmeleri hiç çizilmiyor. Sürekli altta
     durduklarında, yuvarlatılmış köşelerin kenarında ince bir kırmızı
     çizgi olarak sızıyorlardı. */
  const islemlerGorunur = suruklenıyor || x < 0

  return (
    <div className="kaydir">
      {/* Altta duran işlemler */}
      <div className="kaydir__islemler" hidden={!islemlerGorunur}>
        <button
          className="kaydir__btn kaydir__btn--sil"
          onClick={() => {
            kapat()
            onSil?.()
          }}
        >
          {t('ortak.sil')}
        </button>
      </div>

      {/* Kayan yüzey */}
      <div
        className="kaydir__yuzey"
        style={{
          transform: `translateX(${x}px)`,
          transition: suruklenıyor ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        onPointerDown={basla}
        onPointerMove={hareket}
        onPointerUp={bitir}
        onPointerCancel={bitir}
      >
        {children}
      </div>
    </div>
  )
}
