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
import { MARKA_YAZI_YOLU, MARKA_YAZI_W, MARKA_YAZI_H } from '../data/markaYollari'

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

  /* YAZI SVG OLARAK ÇİZİLİYOR.

     Önce PNG'nin yazı bölümü kırpılıp gösteriliyordu. Kaynak 225x69
     piksel; karşılama ekranında 163x50 çiziliyor ve telefonun piksel
     yoğunluğu 2 kat olduğu için gerçekte 326x100 gerekiyordu — yani
     görsel %44 büyütülüyor, bulanık ve kenarları bozuk çıkıyordu.

     SVG her boyutta net. Rengi de `currentColor` ile geliyor, koyu
     zeminde beyaz yapmak için görsel filtresine gerek kalmıyor
     (eskiden `brightness(0) invert(1)` kullanılıyordu; o filtre
     kenar yumuşatmayı da bozuyordu). */
  const olcek = height / TAM_H
  return (
    <svg
      role="img"
      aria-label="PAKSAN"
      className={className}
      viewBox={`0 0 ${MARKA_YAZI_W} ${MARKA_YAZI_H}`}
      width={YAZI_W * olcek}
      height={height}
      /* Kurumsal mavi logo dosyasından ölçüldü (#1d50a0). Marka
         rengi olduğu için tema belirteci değil, sabit değer. */
      style={{ display: 'block', color: beyaz ? '#fff' : '#1d50a0', ...style }}
    >
      <path d={MARKA_YAZI_YOLU} fill="currentColor" />
    </svg>
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
