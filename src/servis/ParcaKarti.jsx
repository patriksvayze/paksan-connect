import { PARA_BIRIMI, paraYaz } from '../marka'
import { gorselAdresi } from '../lib/parcaKatalogu'
import { IconCheck } from '../components/Icons'

/* ==========================================================================
   Parça kartı — katalogdan parça gösterilen her yerin ortak kartı

   Servis kaydındaki parça seçimi (ekranlar/ParcaSec.jsx) ve PAKSAN'a
   sipariş (ekranlar/SiparisVer.jsx) aynı kartı kullanıyor.

   NEDEN ORTAK

   Sipariş ekranı bir dönem küçük görselli satırlar gösteriyordu: 44
   piksellik resimde parça tanınmıyordu ve servis ne sipariş edeceğini
   ancak adından tahmin ediyordu. Sahadaki usta parçayı adıyla değil,
   fiyat listesindeki RESMİYLE ve KODUYLA tanıyor. İki ekranda iki ayrı
   kart olursa biri güncellenir, öbürü unutulur; servis de aynı parçayı
   iki biçimde ezberlemek zorunda kalır.

   KART DÜZENİ FİYAT LİSTESİNİN AYNISI: üstte görsel, altında kod,
   altında ad, en altta fiyat.

   HANGİ FİYAT GÖRÜNECEĞİNİ ÇAĞIRAN SÖYLÜYOR

   Servis kaydında liste fiyatı, siparişte servisin ödediği iskontolu
   fiyat (bkz. lib/servisFiyat.js). Kart hesap yapmıyor; `fiyat` sayı
   değilse fiyat yerine çizgi duruyor.

   KART DIŞ KUTU, DOKUNULAN YER İÇTEKİ DÜĞME

   Siparişte seçili kartın altına adet düğmeleri geliyor (`children`).
   Düğme düğmenin içine konamıyor; bu yüzden kenarlık dıştaki kutuda,
   dokunma alanı içteki düğmede. Adet düğmeleri kartın çerçevesinin
   içinde kalıyor, hangi parçaya ait oldukları yerinden belli.
   ========================================================================== */

export function ParcaKarti({ parca, fiyat, secili, onSec, children }) {
  const adres = gorselAdresi(parca.gorsel)
  const fiyatVar = typeof fiyat === 'number' && Number.isFinite(fiyat)

  return (
    <div className={'parca-kart' + (secili ? ' parca-kart--on' : '')}>
      <button type="button" className="parca-kart__ac" onClick={onSec} aria-pressed={secili}>
        <span className="parca-kart__resim">
          {adres ? (
            /* Ekranda otuz kart olabiliyor; hepsini birden indirmek
               tarlada zayıf şebekede ekranı kilitler. */
            <img src={adres} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="parca-kart__resimsiz">Görsel yok</span>
          )}
          {/* Seçili olan yalnız renkle değil, köşedeki onay işaretiyle
              de ayrılıyor — güneşte ve renk körlüğünde renk tek başına
              yetmiyor. */}
          {secili && (
            <span className="parca-kart__onay">
              <IconCheck size={15} />
            </span>
          )}
        </span>

        <span className="parca-kart__kod mono">{parca.kod}</span>
        <span className="parca-kart__ad">{parca.ad}</span>
        <span className="parca-kart__fiyat">
          {fiyatVar ? `${paraYaz(fiyat)} ${PARA_BIRIMI}` : '—'}
        </span>
      </button>

      {children}
    </div>
  )
}
