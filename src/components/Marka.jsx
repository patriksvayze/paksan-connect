/* PAKSAN kurumsal kimlik parçaları.
   Logo ve amblem paksanmakina.com.tr'den alınan gerçek dosyalar.

   Logo dosyası (225x69) iki parçadan oluşuyor:
     0 – 48 px  → kalkan amblemi
     54 – 225px → "paksan" yazısı

   Amblem çok renkli (mavi kalkan + beyaz detaylar). Koyu zeminde
   beyaza çevrilirse detayları kaybolup düz bir leke oluyor. Bu yüzden:
     · koyu zeminlerde → yalnızca yazı (beyaza çevrilir, temiz durur)
     · açık zeminlerde → tam logo, orijinal mavi
     · marka anı gereken yerlerde → amblem, beyaz daire içinde tam renkli
   ========================================================================== */

import logo from '../assets/marka/paksan-logo.png'
import amblem from '../assets/marka/paksan-amblem.png'

const TAM_W = 225
const TAM_H = 69
const YAZI_X = 54 // yazının başladığı piksel
const YAZI_W = TAM_W - YAZI_X

/**
 * Paksan logosu.
 * @param {{height?: number, beyaz?: boolean, sadeceYazi?: boolean}} props
 */
export function PaksanLogo({
  height = 22, beyaz = false, sadeceYazi = false, style, className,
}) {
  const filtre = beyaz ? 'brightness(0) invert(1)' : 'none'

  if (!sadeceYazi) {
    return (
      <img
        src={logo}
        alt="PAKSAN"
        className={className}
        style={{
          height,
          width: (height * TAM_W) / TAM_H,
          display: 'block',
          filter: filtre,
          ...style,
        }}
      />
    )
  }

  const olcek = height / TAM_H
  return (
    <span
      aria-label="PAKSAN"
      role="img"
      className={className}
      style={{
        display: 'inline-block',
        height,
        width: YAZI_W * olcek,
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        src={logo}
        alt=""
        style={{
          height,
          width: TAM_W * olcek,
          maxWidth: 'none',
          display: 'block',
          marginLeft: -YAZI_X * olcek,
          filter: filtre,
        }}
      />
    </span>
  )
}

/**
 * Başlıklardaki marka — tasarım v3'te zemin açık olduğu için logo
 * kendi kurumsal mavisiyle, kutusuz durur.
 * (Koyu zemin gereken tek yer karşılama ekranı; orada `.brandchip` kullanılır.)
 */
export function PaksanRozet({ height = 38, style }) {
  return <PaksanLogo height={height} style={{ flex: 'none', ...style }} />
}

/**
 * Dar alanlar için sıkışık marka — yalnızca kalkan amblemi.
 * Başlıkta ayrıca bir işlem butonu varken logonun yerini alır.
 */
export function PaksanRozetMini({ size = 36, style }) {
  return (
    <span style={{ display: 'inline-flex', flex: 'none', ...style }}>
      <PaksanAmblem size={size} />
    </span>
  )
}

/** Kalkan amblem. Koyu zeminde beyaz daire içinde tam renkli gösterilir. */
export function PaksanAmblem({ size = 40, cerceve = false }) {
  const img = (
    <img
      src={amblem}
      alt=""
      style={{ width: cerceve ? size * 0.72 : size, height: 'auto', display: 'block' }}
    />
  )

  if (!cerceve) return img

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        boxShadow: '0 4px 16px rgba(8, 26, 54, 0.28)',
      }}
    >
      {img}
    </span>
  )
}
