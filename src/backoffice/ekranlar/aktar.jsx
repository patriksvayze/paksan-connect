import { useRef, useState } from 'react'
import { dosyaAdi, indir, xlsxOku, xlsxYap } from '../excel'
import { islemYaz } from '../veri'

/* Excel'e aktarma ve Excel'den alma düğmeleri.

   Dışa aktarmada ekranda ne görünüyorsa o gidiyor: rolün göremediği
   kayıt dosyaya da girmiyor, süzgeç açıksa süzülmüş liste iniyor.

   İçe aktarmada önce şablon indiriliyor. Şablonun başlık satırı
   değiştirilmemeli — sütunlar başlığa göre eşleşiyor, sıraları
   değişebilir. */

export function DisaAktar({ ad, basliklar, satirlar, kapali, personel }) {
  return (
    <button
      className="dg"
      disabled={kapali || !satirlar.length}
      onClick={() => {
        indir(xlsxYap(ad, [basliklar, ...satirlar]), dosyaAdi(ad))
        islemYaz({ tur: 'excel', ozet: `${ad} dışa aktarıldı (${satirlar.length} kayıt)`, personel })
      }}
      title={satirlar.length ? `${satirlar.length} kayıt` : 'Aktarılacak kayıt yok'}
    >
      Excel'e aktar
    </button>
  )
}

/**
 * @param {string} ad dosya ve sayfa adı
 * @param {string[]} basliklar şablonun başlık satırı
 * @param {string[]} ornek şablona konacak örnek satır
 * @param {Function} onVeri (satirlar: Array<Object>) => {eklendi, atlandi, hatalar}
 */
export function IceAktar({ ad, basliklar, ornek, onVeri, bildir, tazele, personel }) {
  const dosyaRef = useRef(null)
  const [rapor, setRapor] = useState(null)
  const [okuyor, setOkuyor] = useState(false)

  async function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return

    setOkuyor(true)
    try {
      const satirlar = await xlsxOku(dosya)
      if (satirlar.length < 2) throw new Error('Dosyada veri satırı yok.')

      /* Sütunlar başlığa göre eşleşiyor; sıraları değişmiş olabilir. */
      const basi = satirlar[0].map((h) => String(h || '').trim())
      const eksik = basliklar.filter((b) => !basi.includes(b))
      if (eksik.length) {
        throw new Error('Şu sütunlar eksik: ' + eksik.join(', '))
      }

      const kayitlar = satirlar.slice(1).map((satir) => {
        const o = {}
        basi.forEach((baslik, i) => {
          o[baslik] = String(satir[i] ?? '').trim()
        })
        return o
      })

      const sonuc = await onVeri(kayitlar)
      islemYaz({
        tur: 'excel',
        ozet: `${ad} içe aktarıldı · ${sonuc.eklendi} eklendi, ${sonuc.atlandi} atlandı`,
        personel,
      })
      setRapor(sonuc)
      tazele()
      bildir(`${sonuc.eklendi} kayıt eklendi`)
    } catch (hata) {
      setRapor({ eklendi: 0, atlandi: 0, hatalar: [hata.message] })
    } finally {
      setOkuyor(false)
    }
  }

  return (
    <>
      <button
        className="dg"
        onClick={() => indir(xlsxYap(ad, [basliklar, ornek]), `${ad}-sablon.xlsx`)}
      >
        Şablon indir
      </button>

      <button className="dg" disabled={okuyor} onClick={() => dosyaRef.current?.click()}>
        {okuyor ? 'Okunuyor…' : "Excel'den al"}
      </button>

      <input
        ref={dosyaRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={dosyaSecildi}
      />

      {rapor && (
        <div className="pencere" onClick={(e) => e.target === e.currentTarget && setRapor(null)}>
          <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
            <div className="kart__tepe">
              <h2>İçe Aktarma Sonucu</h2>
              <button className="dg" style={{ marginLeft: 'auto' }} onClick={() => setRapor(null)}>
                Kapat
              </button>
            </div>
            <div className="kart__ic">
              <div className="satir" style={{ gap: 18, marginBottom: 14 }}>
                <span><b>{rapor.eklendi}</b> eklendi</span>
                <span><b>{rapor.atlandi}</b> atlandı</span>
              </div>

              {rapor.hatalar?.length > 0 && (
                <div className="uyari" style={{ flexDirection: 'column', gap: 6 }}>
                  {rapor.hatalar.slice(0, 12).map((h, i) => (
                    <div key={i}>{h}</div>
                  ))}
                  {rapor.hatalar.length > 12 && (
                    <div>… ve {rapor.hatalar.length - 12} satır daha</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
