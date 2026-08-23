import { useEffect, useState } from 'react'
import { boyutYaz, ekAdresi } from '../../lib/ekler'

/* Talebe eklenen fotoğraf ve videolar.

   Dosyalar müşterinin telefonunda IndexedDB'de duruyor; backoffice aynı
   tarayıcıda çalıştığı için okuyabiliyor. Sunucu geldiğinde adresler
   ağdan gelecek, bu ekran aynı kalacak.

   Fotoğrafa tıklayınca tam boy açılıyor — servisçi arızayı yakından
   görmek istiyor. */

export function Ekler({ ekler = [] }) {
  const [buyuk, setBuyuk] = useState(null)

  if (!ekler.length) return null

  const fotolar = ekler.filter((e) => e.tur === 'foto')
  const video = ekler.find((e) => e.tur === 'video')

  return (
    <>
      {fotolar.length > 0 && (
        <div className="ekler">
          {fotolar.map((ek) => (
            <Foto key={ek.id} ek={ek} onAc={setBuyuk} />
          ))}
        </div>
      )}

      {video && <Video ek={video} />}

      {buyuk && (
        <div className="pencere" onClick={() => setBuyuk(null)}>
          <img className="ekler__buyuk" src={buyuk} alt="" />
        </div>
      )}
    </>
  )
}

function useEkAdresi(id) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [id])

  return adres
}

function Foto({ ek, onAc }) {
  const adres = useEkAdresi(ek.id)
  if (!adres) return <div className="ekler__bos" />

  return (
    <button className="ekler__foto" onClick={() => onAc(adres)} title={boyutYaz(ek.boyut)}>
      <img src={adres} alt="" />
    </button>
  )
}

function Video({ ek }) {
  const adres = useEkAdresi(ek.id)
  if (!adres) return null

  return (
    <div style={{ marginTop: 12 }}>
      <div className="alan__ad">Video · {ek.sure} sn · {boyutYaz(ek.boyut)}</div>
      <video controls src={adres} className="ekler__video" />
    </div>
  )
}

/* ---------------------------------------------------------------- Dekont

   Yedek parça ödemesinin kanıtı. İki biçimde geliyor: banka
   uygulamasının ekran görüntüsü (fotoğraf) ya da bankadan indirilen
   PDF. İkisi de aynı yerde duruyor ama açılışları farklı — PDF'i
   tarayıcının kendi görüntüleyicisi açıyor.

   Ödeme onaylanmadan parça hazırlanmıyor; bu yüzden dekont talebin en
   görünür yerinde. */

export function Dekont({ dekont }) {
  const adres = useEkAdresi(dekont?.id)
  const [buyuk, setBuyuk] = useState(false)

  if (!dekont) return <div className="uyari">Dekont yüklenmemiş.</div>
  if (!adres) return <div className="ekler__bos" />

  if (dekont.tur === 'foto') {
    return (
      <>
        <button className="ekler__foto" onClick={() => setBuyuk(true)} title={boyutYaz(dekont.boyut)}>
          <img src={adres} alt="Dekont" />
        </button>
        {buyuk && (
          <div className="pencere" onClick={() => setBuyuk(false)}>
            <img className="ekler__buyuk" src={adres} alt="Dekont" />
          </div>
        )}
      </>
    )
  }

  return (
    <a className="dg" href={adres} target="_blank" rel="noreferrer">
      Dekontu aç · PDF{dekont.boyut ? ' · ' + boyutYaz(dekont.boyut) : ''}
    </a>
  )
}
