/* ==========================================================================
   MARKA İŞARETİ

   Firmanın logosu, amblemi ve bunların ekrandaki kullanım biçimleri.
   Yeni firmada bu dosyanın içi değişir; dışa verdiği adlar (`Logo`,
   `Rozet`, `RozetMini`, `Amblem`) ve aldıkları özellikler değişmez —
   ekranlar onlara göre yazıldı.

   Adlar bilerek marka içermiyor. Önce `PaksanLogo`, `PaksanRozet` diye
   yazılmıştı; başka bir firmaya geçerken sekiz ekranda bileşen adı
   değiştirmek gerekiyordu.

   BUGÜNKÜ LOGONUN ÖZELLİĞİ

   Logo dosyası (225x69) iki parçadan oluşuyor:
     0 – 48 px  → kalkan amblemi
     54 – 225px → "paksan" yazısı

   Amblem çok renkli (mavi kalkan + beyaz detaylar). Koyu zeminde
   beyaza çevrilirse detayları kaybolup düz bir leke oluyor. Bu yüzden:
     · koyu zeminlerde → yalnızca yazı (beyaza çevrilir, temiz durur)
     · açık zeminlerde → tam logo, orijinal mavi
     · marka anı gereken yerlerde → amblem, beyaz daire içinde tam renkli

   Başka bir logoda bu bölünme olmayabilir; o zaman `sadeceYazi`
   seçeneği tam logoyu döndürecek şekilde sadeleştirilir.
   ========================================================================== */

import logo from './varliklar/paksan-logo.png'
import amblem from './varliklar/paksan-amblem.png'
import { MARKA_YAZI_YOLU, MARKA_YAZI_W, MARKA_YAZI_H } from './markaYollari'
import { SIRKET } from './kimlik'

const TAM_W = 225
const TAM_H = 69
const YAZI_X = 54 // yazının başladığı piksel
const YAZI_W = TAM_W - YAZI_X

/* Yazı SVG'sinin rengi. Logo dosyasından ölçüldü (#1d50a0). Marka
   rengi olduğu için tema belirteci değil, sabit değer — aynı ham renk
   `renkler.css` içinde de duruyor. */
const MARKA_MAVI = '#1d50a0'

/**
 * Firma logosu.
 * @param {{height?: number, beyaz?: boolean, sadeceYazi?: boolean}} props
 */
export function Logo({
  height = 22, beyaz = false, sadeceYazi = false, style, className,
}) {
  const filtre = beyaz ? 'brightness(0) invert(1)' : 'none'

  if (!sadeceYazi) {
    return (
      <img
        src={logo}
        alt={SIRKET.ad}
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
      aria-label={SIRKET.ad}
      className={className}
      viewBox={`0 0 ${MARKA_YAZI_W} ${MARKA_YAZI_H}`}
      width={YAZI_W * olcek}
      height={height}
      style={{ display: 'block', color: beyaz ? '#fff' : MARKA_MAVI, ...style }}
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
export function Rozet({ height = 38, style }) {
  return <Logo height={height} style={{ flex: 'none', ...style }} />
}

/**
 * Dar alanlar için sıkışık marka — yalnızca kalkan amblemi.
 * Başlıkta ayrıca bir işlem butonu varken logonun yerini alır.
 */
export function RozetMini({ size = 36, style }) {
  return (
    <span style={{ display: 'inline-flex', flex: 'none', ...style }}>
      <Amblem size={size} />
    </span>
  )
}

/** Kalkan amblem. Koyu zeminde beyaz daire içinde tam renkli gösterilir. */
export function Amblem({ size = 40, cerceve = false }) {
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
