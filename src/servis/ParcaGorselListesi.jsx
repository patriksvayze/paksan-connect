import { useEffect, useState } from 'react'
import { gorselAdresi, katalogGetir, parcaBul } from '../lib/parcaKatalogu'

/* ==========================================================================
   Görselli parça listesi — Hak Ediş ekranının iş ve sipariş özetleri

   KULLANICININ İSTEĞİ (21 Eylül 2026): "Servisim Hak Ediş ekranında parça
   bilgisi içeren işlerde parça görseli de gösterilsin."

   NEDEN GÖRSEL: sahadaki usta parçayı adıyla değil, fiyat listesindeki
   resmiyle ve koduyla tanıyor (bkz. ParcaKarti.jsx). Hak ediş özetinde
   yalnız kod ve ad vardı; servis hangi işin parası olduğunu parçanın
   resmine bakarak hatırlıyor.

   NEDEN ParcaTablosu DEĞİL: o bileşen altı ekranın ortak üç sütunlu
   listesi (backoffice dâhil) ve dar kutulara göre yazıldı. Görsel sütunu
   orada ad sütununu sıkıştırırdı. Burada satır başına görsel, kod, ad ve
   adet — aynı bilgiler, aynı sıra.

   GÖRSEL 72 PİKSEL. ParcaKarti'nin notu: 44 piksellik resimde parça
   tanınmıyordu. Yaprak telefon genişliğinde; 72 piksel adı iki satıra
   sığdıracak yeri bırakıyor. Zemin her temada beyaz — katalog görselleri
   beyaz zemine basılmış.

   KATALOG GELMEDEN DE ÇİZİLİYOR. Liste önce görselsiz yer tutucuyla
   çıkıyor, katalog gelince görseller yerine oturuyor. Katalog hiç
   gelmezse ya da parçanın kodu yoksa (katalogdan önceki kayıtlar)
   "Görsel yok" yazıyor; satır yine okunuyor. */

/**
 * @param {{parcalar: Array<{kod?: string, ad: string, adet: number}>}} p
 */
export function ParcaGorselListesi({ parcalar = [] }) {
  const liste = parcalar.filter((p) => p?.ad && Number(p.adet) > 0)
  const [katalog, setKatalog] = useState(null)

  useEffect(() => {
    if (!liste.some((p) => p.kod)) return undefined
    let iptal = false
    katalogGetir()
      .then((k) => !iptal && setKatalog(k))
      .catch(() => {})
    return () => {
      iptal = true
    }
    /* Liste her çizimde yeni dizi; kodların kendisi yeterli işaret. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste.map((p) => p.kod).join('|')])

  if (!liste.length) return null

  return (
    <ul className="parca-gorselli">
      {liste.map((p, i) => {
        const adres = katalog ? gorselAdresi(parcaBul(katalog, p.kod)?.gorsel) : null
        const bekliyor = !katalog && Boolean(p.kod)
        return (
          <li className="parca-gorselli__satir" key={(p.kod || p.ad) + i}>
            <span
              className={'parca-gorselli__resim' + (bekliyor ? ' parca-gorselli__resim--bekliyor' : '')}
            >
              {adres ? (
                <img src={adres} alt="" loading="lazy" decoding="async" />
              ) : (
                !bekliyor && <span className="parca-gorselli__resimsiz">Görsel yok</span>
              )}
            </span>
            <span className="parca-gorselli__govde">
              <span className="parca-gorselli__kod mono">{p.kod || '—'}</span>
              <span className="parca-gorselli__ad">{p.ad}</span>
            </span>
            <span className="parca-gorselli__adet">
              <span className="parca-gorselli__adet-ad">Adet</span>
              <strong>{p.adet}</strong>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
