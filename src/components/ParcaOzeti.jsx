import { ParcaResmi } from './ParcaResmi'

/* ==========================================================================
   Parça özeti — seçilen parçaların satırı ve tutar kutusu, iki uygulamada

   Üç ekran aynı satırı ve aynı kutuyu kullanıyor:
     · Connect, yedek parça talebinin ödeme adımındaki "Talebiniz" kartı
       (screens/RequestForm.jsx)
     · Connect, parça talebinin ayrıntısı (screens/RequestDetail.jsx →
       Parcalar)
     · Servisim, PAKSAN'a siparişin özeti (servis/ekranlar/SiparisVer.jsx)

   NEDEN ORTAK (30 Eylül 2026, kullanıcının isteği)

   Kullanıcı: "Servisim checkout ekranında parçaları paylaştığım ekran
   görüntüsündeki gibi görmek istiyorum, format anlamında yani" — ekran
   görüntüsü Connect'in "Talebiniz" kartıydı. Aynı gün sorusu da şuydu:
   "neden Connect'teki parça seçimi ile Servisim'deki parça seçimi
   ekranları farklı oluyor sürekli?" İki uygulama aynı satırı iki ayrı
   yerde çiziyordu: Connect'te resimli satır, Servisim'de resimsiz,
   "1 × 1.820 TL" diye yazılı başka bir satır. Biri değişince öteki
   unutuluyordu. Satırın ve kutunun kendisi artık burada; parça kartında
   (ParcaKarti.jsx) olduğu gibi.

   SATIR: solda parçanın resmi, yanında adı ve altında "kod · × adet",
   sağda satır tutarı. Ad sarıyor, tutar kırılmıyor.

   "· × adet" TEK PARÇA (30 Eylül 2026, inceleme). Alt satırı çağıran
   kuruyor; üçü de "·"dan ve "×"ten sonra bölünmeyen boşluk (\u00a0, JSX içinde &nbsp;)
   koyuyor. 320 piksellik telefonda satır kırılınca nokta satır sonunda
   asılı kalıyordu ("2013101010 ·" / "× 4"); şimdi kod üstte, "· × 4"
   altta. Sığan satırda görünüm aynı. Yeni çağıran da aynısını yapar.

   SATIRIN ALTINDAKİ İŞLEMLER ÇAĞIRANDAN (`children`). Connect'in kartı
   salt okunur. Servisim'in özetinde her satırın altında adet düğmeleri
   ve "Kaldır" var (kullanıcı: "adetlerini değiştiremiyoruz. Bunu yapmak
   için geri gelmek gerekiyor"); onlar satırın altına tam genişlikte
   geliyor.

   KUTU: soluk satırlar ve altta çizgiyle ayrılmış kalın toplam.
   Satırları ve rakamları çağıran veriyor; bu bileşen HESAP YAPMIYOR.
   Connect tutarı kendi işlevinden, Servisim lib/servisFiyat.js'ten
   alıyor — ekranlar arasında tutmayan rakam çıkmasın diye para tek
   yerden hesaplanıyor.

   YAZILAR ÇAĞIRANDAN. Connect iki dilli, Servisim tek dilli; bu dosyada
   ekranda görünen yazı yok. Resmi olmayan parçanın notu da `gorselYok`
   ile geliyor (vermeyen ParcaResmi'nin varsayılanını kullanır).

   GÖRÜNÜM İKİ AYRI CSS DOSYASINDA. Connect `styles.css`, Servisim
   `servis/servis.css`; iki kök renk değişkeni paylaşmıyor (bkz.
   CLAUDE.md → CSS). Sınıf adları aynı (`.parca-ozet*`, `.tutar-kutu*`);
   düzen değişirse iki dosyadaki kurallar birlikte güncellenir. Connect'in
   kartı bu bileşene geçerken piksel piksel aynı kaldı (önce ve sonra
   ekran görüntüsüyle karşılaştırıldı).
   ========================================================================== */

/**
 * @param {{katalog: object|null, kod?: string, gorsel?: string|null, ad: string,
 *          alt?: string, tutar: string, gorselYok?: string}} p
 *   `alt` adın altındaki satır ("kod · × adet"); `tutar` biçimlenmiş yazı.
 *   Geri kalan özellikler (`data-*`) satırın kutusuna geçiyor.
 */
export function ParcaOzetSatiri({ katalog, kod, gorsel, ad, alt, tutar, gorselYok, children, ...ek }) {
  return (
    <div className={'parca-ozet' + (children ? ' parca-ozet--islemli' : '')} {...ek}>
      <span className="parca-ozet__sol">
        <ParcaResmi katalog={katalog} kod={kod} gorsel={gorsel} yok={gorselYok} />
        <span className="parca-ozet__metin">
          {ad}
          <span className="parca-ozet__alt">{alt}</span>
        </span>
      </span>
      <span className="parca-ozet__tutar">{tutar}</span>
      {children && <div className="parca-ozet__islem">{children}</div>}
    </div>
  )
}

/**
 * @param {{satirlar: Array<{ad: string, deger: string, indirim?: boolean}|false|null>,
 *          toplam?: {ad: string, deger: string}}} p
 *   `satirlar` üstteki soluk satırlar; `false` ya da `null` olan atlanıyor
 *   (koşullu satır için). `indirim` satırı düşülen tutar olarak işaretliyor.
 *   `children` toplamın altına, kutunun içine (Connect'in kargo notu).
 *   Geri kalan özellikler (`style`, `data-*`) kutuya geçiyor.
 */
export function TutarKutusu({ satirlar = [], toplam, children, ...ek }) {
  return (
    <div className="tutar-kutu" {...ek}>
      {satirlar.filter(Boolean).map((s) => (
        <div
          key={s.ad}
          className={'tutar-kutu__satir' + (s.indirim ? ' tutar-kutu__satir--indirim' : '')}
        >
          <span>{s.ad}</span>
          <span>{s.deger}</span>
        </div>
      ))}
      {toplam && (
        <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
          <span>{toplam.ad}</span>
          <span>{toplam.deger}</span>
        </div>
      )}
      {children}
    </div>
  )
}
