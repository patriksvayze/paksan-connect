/* ==========================================================================
   Süzgeçler

   Ekranlarda süzgeç sayısı arttıkça düğme sırası okunmaz oldu: on tane
   düğme yan yana durunca hangisinin açık olduğu kaybolıyor. Onun yerine
   adı yazan açılır kutular var — "Durum: Açık" tek bakışta okunuyor.

   Tarih aralığı iki kutudan oluşuyor ama önce hazır seçenekler geliyor
   (bugün, son 7 gün, son 30 gün). Yönetici çoğu zaman tarih yazmak
   istemiyor, hazır aralığı seçiyor; ötesi için "Tarih seç" var.
   ========================================================================== */

import { useId } from 'react'

export function SuzgecCubugu({ children }) {
  return <div className="suzgec-cubugu">{children}</div>
}

/**
 * Açılır kutu.
 * @param {Array<{deger: string, ad: string}>} secenekler
 */
export function Secim({ ad, deger, onDegis, secenekler, genislik }) {
  const id = useId()
  return (
    <label className="secim-alan" htmlFor={id} style={genislik ? { minWidth: genislik } : undefined}>
      <span className="secim-alan__ad">{ad}</span>
      <select
        id={id}
        className="sec"
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
      >
        {secenekler.map((s) => (
          <option key={s.deger} value={s.deger}>
            {s.ad}
          </option>
        ))}
      </select>
    </label>
  )
}

/* -------------------------------------------------------- Tarih aralığı */

export const ARALIKLAR = [
  { deger: 'hepsi', ad: 'Tüm zamanlar' },
  { deger: 'bugun', ad: 'Bugün' },
  { deger: 'dun', ad: 'Dün' },
  { deger: 'gun7', ad: 'Son 7 gün' },
  { deger: 'gun30', ad: 'Son 30 gün' },
  { deger: 'ozel', ad: 'Tarih seç' },
]

function gunBasi(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function gunSonu(t) {
  const d = new Date(t)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** Seçilen aralığı {bas, bit} zaman damgasına çevirir. */
export function araligiCoz({ tur, bas, bit }) {
  const simdi = new Date()

  switch (tur) {
    case 'bugun':
      return { bas: gunBasi(simdi), bit: gunSonu(simdi) }
    case 'dun': {
      const d = new Date(simdi)
      d.setDate(d.getDate() - 1)
      return { bas: gunBasi(d), bit: gunSonu(d) }
    }
    case 'gun7': {
      const d = new Date(simdi)
      d.setDate(d.getDate() - 6)
      return { bas: gunBasi(d), bit: gunSonu(simdi) }
    }
    case 'gun30': {
      const d = new Date(simdi)
      d.setDate(d.getDate() - 29)
      return { bas: gunBasi(d), bit: gunSonu(simdi) }
    }
    case 'ozel':
      return {
        bas: bas ? gunBasi(new Date(bas)) : 0,
        bit: bit ? gunSonu(new Date(bit)) : Infinity,
      }
    default:
      return { bas: 0, bit: Infinity }
  }
}

/** Zaman damgası aralığın içinde mi? */
export function araliktaMi(zaman, aralik) {
  const { bas, bit } = araligiCoz(aralik)
  return zaman >= bas && zaman <= bit
}

export const BOS_ARALIK = { tur: 'hepsi', bas: '', bit: '' }

/**
 * @param {string[]} cikar gösterilmeyecek hazır seçenekler
 */
export function TarihAraligi({ aralik, onDegis, cikar = [] }) {
  const secenekler = ARALIKLAR.filter((a) => !cikar.includes(a.deger))

  return (
    <>
      <Secim
        ad="Tarih"
        deger={aralik.tur}
        onDegis={(tur) => onDegis({ ...aralik, tur })}
        secenekler={secenekler}
        genislik={140}
      />

      {aralik.tur === 'ozel' && (
        <>
          <label className="secim-alan">
            <span className="secim-alan__ad">Başlangıç</span>
            <input
              className="sec"
              type="date"
              value={aralik.bas}
              max={aralik.bit || undefined}
              onChange={(e) => onDegis({ ...aralik, bas: e.target.value })}
            />
          </label>
          <label className="secim-alan">
            <span className="secim-alan__ad">Bitiş</span>
            <input
              className="sec"
              type="date"
              value={aralik.bit}
              min={aralik.bas || undefined}
              onChange={(e) => onDegis({ ...aralik, bit: e.target.value })}
            />
          </label>
        </>
      )}
    </>
  )
}
