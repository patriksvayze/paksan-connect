import { useState } from 'react'
import { stokGetir, stokYaz } from '../../lib/bayiStok'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { PRODUCTS } from '../../data/products'
import { Bolum } from '../Kabuk'

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

export function Stok({ oturum }) {
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
    <>
      <p className="ipucu">
        Takip etmediğiniz kalemi boş bırakın. Boş bırakmak “bakmıyorum”,
        sıfır yazmak “bende yok” demek.
      </p>

      <Bolum ad="Yedek Parça">
        <div className="kart" style={{ padding: '4px 16px' }}>
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
      </Bolum>

      <Bolum ad="Makine">
        <div className="kart" style={{ padding: '4px 16px' }}>
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
      </Bolum>

      {/* Kaydet ekranın dibine yapışık: uzun listenin sonuna kadar
          kaydırmak gerekmesin. */}
      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={kaydet}>
          {kaydedildi ? 'Kaydedildi' : 'Kaydet'}
        </button>
      </div>
    </>
  )
}

function SayiSatiri({ ad, alt, deger, onDegis }) {
  return (
    <div
      className="satir"
      style={{ alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--cizgi)' }}
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
