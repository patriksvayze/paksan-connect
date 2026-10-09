import { useEffect, useState } from 'react'
import { gorselAdresi, katalogGetir, parcaBul } from '../lib/parcaKatalogu'

/* ==========================================================================
   Parçanın küçük görseli — üç uygulamada, parça listelenen her yerde

   KULLANICININ İSTEĞİ (22 Eylül 2026): "Yedek parça ile ilgili olan
   yerlerde ilgili parçanın görseli en uygun şekilde gösterilmeli."
   Görsel yalnız parça SEÇİLEN ekranlarda vardı (Connect'in parça
   listesi, Servisim'in parça kartı, backoffice'in kataloğu). Seçim
   bittikten sonra parça her yerde yalnız kod ve adla görünüyordu:
   backoffice'in talep detayında, kargo formunda, Servisim'in talep ve
   onay ekranlarında, Connect'in ödeme özetinde. Parçayı hazırlayan
   personel de takan usta da parçayı fiyat listesindeki resmiyle
   tanıyor; ad tekil değil, katalogta aynı adı taşıyan parçalar var.

   GÖRSEL KAYITTAN OKUNUYOR, BUGÜNKÜ KATALOGTAN DEĞİL (22 Eylül 2026,
   kullanıcının kararı: "katalog değişirse geçmiş işlemlerdeki kodlar,
   adlar ve görseller değişmemeli"). Parça satırı, kaydedildiği günkü
   görselin dosya adını taşıyor (`gorsel`, bkz. lib/parcaKatalogu.js →
   fiyatGoruntusu). Dosya sunucuda hiç ezilmiyor; yeni listede resmi
   değişen parça yeni adla geliyor ve yeni liste eskisini kaldırırken
   kayıtların gösterdiği görselleri tutuyor (bkz.
   sunucu-taklidi/fiyat-listesi-yayini.mjs). Böylece altı ay önceki
   talep, o gün müşterinin seçtiği resmi gösteriyor.

   Alan hiç yoksa (o tarihten önce kaydedilmiş satır, demo verisi)
   resim kodla bugünkü katalogtan bulunuyor — başka bir kaynak yok.
   `null` ise parçanın o gün görseli yoktu: katalogta sonradan resmi
   gelse de "Görsel yok" yazıyor. Katalog bir kez iniyor ve bellekte
   duruyor, her satır için yeniden istenmiyor.

   KATALOG GELMEDEN DE ÇİZİLİYOR. Kutu önce boş ve soluk; katalog gelince
   resim yerine oturuyor. Parçanın kodu yoksa (katalogdan önceki kayıtlar)
   ya da katalogta resmi yoksa kutuda "Görsel yok" yazıyor, satır yine
   okunuyor. Resim inmezse (şebeke) de aynı yazı çıkıyor; kırık resim
   simgesi görünmüyor.

   ZEMİN HER TEMADA BEYAZ: katalog görselleri beyaz zemine basılmış;
   koyu temada koyu kutuya oturunca kenarları kirli görünüyordu.

   YAZI TEK DİLLİ DEĞİL: Connect `yok` ile kendi sözlüğünden veriyor;
   backoffice ve Servisim varsayılanı kullanıyor. */

/* Son inen katalog: yeni açılan listenin ilk çiziminde boş kutu
   yanıp sönmesin. Katalogun kendisi yine her açılışta katalogGetir'den
   isteniyor; fiyat listesi değişince (katalogUnut) yenisi gelir. */
let sonKatalog = null

/** Parça kataloğu; henüz inmediyse null. `gerekli` false ise hiç istenmez. */
export function useParcaKatalogu(gerekli = true) {
  const [katalog, setKatalog] = useState(sonKatalog)

  useEffect(() => {
    if (!gerekli) return undefined
    let iptal = false
    katalogGetir()
      .then((k) => {
        sonKatalog = k
        if (!iptal) setKatalog(k)
      })
      .catch(() => {})
    return () => {
      iptal = true
    }
  }, [gerekli])

  return katalog
}

/**
 * @param {{katalog: object|null, kod?: string, gorsel?: string|null, yok?: string, boyut?: number}} p
 *   `gorsel` kayıttaki dosya adı; `undefined` ise kodla katalogtan
 *   bulunuyor. `boyut` piksel; verilmezse CSS'teki `--parca-resmi`.
 */
export function ParcaResmi({ katalog, kod, gorsel, yok = 'Görsel yok', boyut }) {
  const [bozuk, setBozuk] = useState(false)
  const kayitta = gorsel !== undefined
  const adres = kayitta
    ? gorselAdresi(gorsel)
    : katalog && kod
      ? gorselAdresi(parcaBul(katalog, kod)?.gorsel)
      : null
  const bekliyor = !kayitta && !katalog && Boolean(kod)

  return (
    <span
      className={'parca-resmi' + (bekliyor ? ' parca-resmi--bekliyor' : '')}
      style={boyut ? { '--parca-resmi': `${boyut}px` } : undefined}
      aria-hidden="true"
    >
      {adres && !bozuk ? (
        <img src={adres} alt="" loading="lazy" decoding="async" onError={() => setBozuk(true)} />
      ) : (
        !bekliyor && <span className="parca-resmi__yok">{yok}</span>
      )}
    </span>
  )
}
