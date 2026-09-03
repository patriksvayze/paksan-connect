import { useState } from 'react'
import { stokGetir, stokYaz } from '../../lib/bayiStok'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { PRODUCTS } from '../../data/products'

/* ==========================================================================
   Bayi paneli — stok

   Bayinin elindeki parça ve makine sayısı. Tek ekran, sayı kutuları ve
   tek "Kaydet" düğmesi. Hareket kaydı, rezervasyon, geçmiş yok —
   bayiden beklenen tek şey ara sıra sayıyı güncellemek.

   BOŞ BIRAKMAK GEÇERLİ BİR CEVAP. Bayi bir parçayı takip etmiyorsa
   kutusunu boş bırakıyor; ekran o parça için "bilinmiyor" diyor,
   sıfır demiyor. İkisi farklı şeyler: sıfır "bende yok", boş "ben
   bakmıyorum".
   ========================================================================== */

export function Stok({ oturum, onKapat }) {
  const [stok, setStok] = useState(() => stokGetir(oturum.bayiId))
  const [kaydedildi, setKaydedildi] = useState(false)

  function yaz(bolum, anahtar, deger) {
    const temiz = deger.replace(/\D/g, '')
    setStok((s) => ({
      ...s,
      [bolum]: { ...s[bolum], [anahtar]: temiz === '' ? undefined : Number(temiz) },
    }))
    setKaydedildi(false)
  }

  function kaydet() {
    /* undefined değerler yazılmıyor: boş kutu "girilmedi" demek. */
    const temizle = (o) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
    stokYaz(oturum.bayiId, { parca: temizle(stok.parca), makine: temizle(stok.makine) })
    setKaydedildi(true)
  }

  return (
    <div className="bayi-govde">
      <div className="bayi-tepe">
        <button className="dg" onClick={onKapat}>Geri</button>
        <div>
          <div className="bayi-tepe__ad">Stoğum</div>
          <div className="bayi-tepe__alt">
            Elinizdeki sayıyı yazın. Takip etmediğiniz kalemi boş bırakın.
          </div>
        </div>
      </div>

      <div className="kart" style={{ padding: 16, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Yedek Parça</h2>
        {Object.entries(PARCA_FIYAT).map(([ad, bilgi]) => (
          <SayiSatiri
            key={ad}
            ad={ad}
            alt={bilgi.kod}
            deger={stok.parca[ad]}
            onDegis={(v) => yaz('parca', ad, v)}
          />
        ))}
      </div>

      <div className="kart" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Makine</h2>
        {PRODUCTS.map((u) => (
          <SayiSatiri
            key={u.id}
            ad={u.name}
            alt={u.short || ''}
            deger={stok.makine[u.id]}
            onDegis={(v) => yaz('makine', u.id, v)}
          />
        ))}
      </div>

      <div className="bayi-islem">
        <button className="dg dg--ana" onClick={kaydet}>
          {kaydedildi ? 'Kaydedildi' : 'Kaydet'}
        </button>
        <button className="dg" onClick={onKapat}>Geri dön</button>
      </div>
    </div>
  )
}

function SayiSatiri({ ad, alt, deger, onDegis }) {
  return (
    <div
      className="satir"
      style={{ alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cizgi)' }}
    >
      <div style={{ flex: 1 }}>
        <div>{ad}</div>
        {alt && <div className="kucuk sonuk mono">{alt}</div>}
      </div>
      <input
        className="gir mono"
        style={{ width: 90, textAlign: 'right' }}
        inputMode="numeric"
        value={deger === undefined ? '' : deger}
        onChange={(e) => onDegis(e.target.value)}
        placeholder="—"
        aria-label={ad + ' adedi'}
      />
    </div>
  )
}
