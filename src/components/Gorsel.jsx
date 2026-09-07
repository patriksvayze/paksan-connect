import { urunGorseli } from '../marka'
import { IconMachine } from './Icons'

/**
 * Ürün fotoğrafı kutusu.
 * Fotoğrafı olmayan ürünlerde turuncu makine bloğuna düşer.
 *
 * @param {{urunId: string, ad?: string, tip?: 'sq'|'wide'|'thumb'|'hero',
 *          style?: object, ikonBoyut?: number}} props
 */
export function UrunFoto({ urunId, ad = '', tip = 'sq', style, ikonBoyut = 34 }) {
  const src = urunGorseli(urunId)

  if (!src) {
    return (
      <div className={`photo photo--${tip} photo--bos`} style={style}>
        <IconMachine size={ikonBoyut} />
      </div>
    )
  }

  return (
    <div className={`photo photo--${tip}`} style={style}>
      <img src={src} alt={ad} loading="lazy" decoding="async" />
    </div>
  )
}
