import { PARA_BIRIMI, paraYaz } from '../marka'
import { gorselAdresi } from '../lib/parcaKatalogu'
import { IconCheck } from './Icons'

/* ==========================================================================
   Parça kartı — katalogdan parça gösterilen her yerin ortak kartı

   Üç ekran aynı kartı kullanıyor:
     · Servisim, servis kaydındaki parça seçimi (servis/ekranlar/ParcaSec.jsx)
     · Servisim, PAKSAN'a sipariş (servis/ekranlar/SiparisVer.jsx)
     · Connect, yedek parça talebindeki parça seçimi
       (screens/ParcaSecEkrani.jsx)

   NEDEN ORTAK

   Sipariş ekranı bir dönem küçük görselli satırlar gösteriyordu: 44
   piksellik resimde parça tanınmıyordu ve servis ne sipariş edeceğini
   ancak adından tahmin ediyordu. Sahadaki usta parçayı adıyla değil,
   fiyat listesindeki RESMİYLE ve KODUYLA tanıyor. İki ekranda iki ayrı
   kart olursa biri güncellenir, öbürü unutulur; servis de aynı parçayı
   iki biçimde ezberlemek zorunda kalır.

   CONNECT DE AYNI KARTA GEÇTİ (24 Eylül 2026, kullanıcının isteği).
   Connect'in parça seçimi aynı akışı izliyordu ama parçaları 44
   piksellik resimli satırlarla gösteriyordu; kullanıcı "Servisim'deki
   sistem daha iyi, daha büyük görseller var, direkt aynısını koy" dedi.
   Kart bu yüzden `src/servis/` altından buraya taşındı: müşteri APK'sı
   servis klasöründen hiçbir şey almamalı (`npm run dogrula` 4. kontrol
   `dist/` içinde servis kodu arıyor). `servis/ParcaKarti.jsx` bu dosyayı
   saran ince bir kabuk olarak kaldı; Servisim ekranları değişmedi.

   KART DÜZENİ FİYAT LİSTESİNİN AYNISI: üstte görsel, altında kod,
   altında ad, en altta fiyat.

   HANGİ FİYAT GÖRÜNECEĞİNİ ÇAĞIRAN SÖYLÜYOR

   Servis kaydında liste fiyatı, siparişte servisin ödediği iskontolu
   fiyat (bkz. lib/servisFiyat.js), Connect'te müşterinin gördüğü liste
   fiyatı. Kart hesap yapmıyor; `fiyat` sayı değilse fiyat yerine çizgi
   duruyor.

   KARTIN KENDİ YAZISI ÇAĞIRANDAN GELİYOR

   Kartın içinde tek bir yazı var: resmi olmayan parçadaki "görsel yok"
   notu. Connect iki dilli, Servisim tek dilli; bu yüzden yazı kartın
   içine gömülmüyor, `gorselYok` olarak veriliyor. Connect sözlükten
   (`parcaSec.gorselYok`), Servisim kendi kabuğundan gönderiyor.

   KART DIŞ KUTU, DOKUNULAN YER İÇTEKİ DÜĞME

   Siparişte seçili kartın altına adet düğmeleri geliyor (`children`).
   Düğme düğmenin içine konamıyor; bu yüzden kenarlık dıştaki kutuda,
   dokunma alanı içteki düğmede. Adet düğmeleri kartın çerçevesinin
   içinde kalıyor, hangi parçaya ait oldukları yerinden belli.

   GÖRÜNÜM İKİ AYRI CSS DOSYASINDA. Servisim `servis/servis.css`,
   Connect `styles.css` kullanıyor ve iki kök renk değişkeni paylaşmıyor
   (bkz. CLAUDE.md → CSS). Sınıf adları aynı; kartın düzeni değişirse
   iki dosyadaki `.parca-kart` kuralları birlikte güncellenir.
   ========================================================================== */

export function ParcaKarti({ parca, fiyat, listeFiyati, secili, onSec, gorselYok, children }) {
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
            <span className="parca-kart__resimsiz">{gorselYok}</span>
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
          {/* Siparişte liste fiyatı üstü çizili, yanında servisin ödediği
              (23 Eylül 2026): indirim kartın kendisinde görünsün. */}
          {fiyatVar && typeof listeFiyati === 'number' && listeFiyati > fiyat && (
            <s className="parca-kart__liste">{paraYaz(listeFiyati)}</s>
          )}
          {fiyatVar ? `${paraYaz(fiyat)} ${PARA_BIRIMI}` : '—'}
        </span>
      </button>

      {children}
    </div>
  )
}
