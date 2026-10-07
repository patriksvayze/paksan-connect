/* Ürün fotoğrafları — paksanmakina.com.tr üzerinden alınıp
   uygulama için 640x640 boyutuna küçültüldü.

   Fotoğraflar beyaz/açık zeminli stüdyo çekimleri olduğu için
   arayüzde daima açık yüzeylerin üzerinde gösteriliyor. */

import orkinos1270 from '../../assets/urunler/orkinos-1270.jpg'
import orkinos870 from '../../assets/urunler/orkinos-870.jpg'
import orka870 from '../../assets/urunler/orka-870.jpg'
import albatros870 from '../../assets/urunler/albatros-870.jpg'
import kucukBalya from '../../assets/urunler/kucuk-balya.jpg'
import hammer from '../../assets/urunler/hammer.jpg'
import ipakRulo from '../../assets/urunler/ipak-rulo.jpg'
import pelican from '../../assets/urunler/pelican-yatay.jpg'
import diamond from '../../assets/urunler/diamond-dikey.jpg'
import scorpion from '../../assets/urunler/scorpion-silaj.jpg'
import silajPaketleme from '../../assets/urunler/silaj-paketleme.jpg'
import yengec from '../../assets/urunler/yengec-cayir.jpg'
import kirlangic from '../../assets/urunler/kirlangic.jpg'
import rotovator from '../../assets/urunler/rotovator.jpg'
import tesviye from '../../assets/urunler/tesviye-kuregi.jpg'

export const URUN_GORSELI = {
  'orkinos-1270': orkinos1270,
  'orkinos-870': orkinos870,
  'orka-870': orka870,
  'albatros-870': albatros870,

  /* Küçük balya modelleri sitede de aynı görseli paylaşıyor.
     Modele özel fotoğraflar geldiğinde buradan tek tek bağlanacak. */
  'super-8002': kucukBalya,
  'super-8002e': kucukBalya,
  'super-8002e-dual2': kucukBalya,
  'super-yunus': kucukBalya,
  'super-yunus-3yabali': kucukBalya,
  'super-yunus-dual2': kucukBalya,
  hammer: hammer,

  'ipak-rulo': ipakRulo,
  'pelican-yatay': pelican,
  'diamond-dikey': diamond,
  'scorpion-silaj': scorpion,
  'silaj-paketleme': silajPaketleme,
  'yengec-cayir': yengec,
  'kirlangic-ot-toplama': kirlangic,
  rotovator: rotovator,
  'tesviye-kuregi': tesviye,
}

/* Kategori vitrinlerinde kullanılan temsili görseller */
export const KATEGORI_GORSELI = {
  'buyuk-balya': orkinos1270,
  'kucuk-balya': kucukBalya,
  'rulo-balya': ipakRulo,
  'yem-karma': diamond,
  silaj: scorpion,
  'cayir-ot': yengec,
  toprak: rotovator,
}

export function urunGorseli(id) {
  return URUN_GORSELI[id] || null
}
