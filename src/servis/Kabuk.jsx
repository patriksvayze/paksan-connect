import { Logo } from '../marka'
import { IconBack, IconPhone } from '../components/Icons'

/* ==========================================================================
   Servis uygulamasının kabuğu

   NEDEN AYRI BİR KABUK VAR

   Panel önce backoffice'in düzeniyle çiziliyordu: sayfanın tepesinde
   yan yana dizilmiş düğmeler, altında uzayıp giden bir liste. Bu
   bilgisayarda çalışan bir sayfanın düzeni. Telefonda açıldığında
   ekranın neresinde olunduğu belli olmuyor, işlemler başlıkla aynı
   satırda sıkışıyor ve "Çıkış" günlük işlerle aynı ağırlıkta duruyordu.

   Burada uygulamaların kendi düzeni var:

     · Üstte sabit bir çubuk — sayfa kaysa da yerinde duruyor,
       bulunulan yerin adını yazıyor.
     · Altta sekmeler — parmağın doğal olarak durduğu yer. Servisin
       dört işi var, dördü de tek dokunuş uzakta.
     · Alt sayfalar tam ekran açılıyor ve geri oku ile kapanıyor.

   TEK KOD, İKİ GÖRÜNÜM. Aynı kabuk tarayıcıda da çalışıyor: geniş
   ekranda alt sekmeler üste, çubuğun altına geçiyor (bkz. servis.css).
   Servis panelinin ve servis uygulamasının iki ayrı kopyası yok.

   ÇENTİK VE EV ÇUBUĞU. `servis.html` içinde `viewport-fit=cover`
   var; içerik ekranın en tepesine kadar çıkıyor. Güvenli alan payları
   bu yüzden CSS'te `env(safe-area-inset-*)` ile veriliyor, yoksa
   başlık çentiğin, sekmeler de ev çubuğunun altında kalırdı.
   ========================================================================== */

/** Üst çubuk. Geri oku verilirse başlığın soluna geçiyor. */
function Cubuk({ baslik, alt, onGeri, islem }) {
  return (
    <header className="uyg__bar">
      {onGeri && (
        <button className="uyg__geri" onClick={onGeri} aria-label="Geri">
          <IconBack size={22} />
        </button>
      )}
      <div className="uyg__ad">
        <h1>{baslik}</h1>
        {alt && <p>{alt}</p>}
      </div>
      {/* İşlem varsa marka yerini ona bırakıyor: çubuk iki satıra
          taşmasın. Marka zaten giriş ekranında tam hâliyle duruyor. */}
      {/* 30 piksel: 15'ti, okunmuyordu. Marka çubuğun sağında tek
          başına duruyor, yer var. */}
      {islem || <Logo height={30} sadeceYazi beyaz />}
    </header>
  )
}

/**
 * Sekmeli ana ekran.
 * @param {{ sekmeler: {id, ad, Icon, rozet?}[] }} props
 */
export function Kabuk({ baslik, alt, islem, sekmeler, sekme, onSekme, children }) {
  return (
    <div className="uyg">
      <Cubuk baslik={baslik} alt={alt} islem={islem} />
      <main className="uyg__ic">{children}</main>

      <nav className="uyg__tabs" aria-label="Bölümler">
        {sekmeler.map(({ id, ad, Icon, rozet }) => (
          <button
            key={id}
            className={'uyg__tab' + (sekme === id ? ' uyg__tab--on' : '')}
            onClick={() => onSekme(id)}
            aria-current={sekme === id ? 'page' : undefined}
          >
            <span className="uyg__tab-ikon">
              <Icon size={22} />
              {/* Sayı 9'u geçince "9+" yazıyor: rozet daireden taşıp
                  simgeyi örtmesin. */}
              {rozet > 0 && (
                <span className="uyg__rozet">{rozet > 9 ? '9+' : rozet}</span>
              )}
            </span>
            <span className="uyg__tab-ad">{ad}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

/**
 * Tam ekran alt sayfa: talep detayı gibi, sekmelerin üstüne açılan
 * ekranlar. Sekme çubuğu görünmüyor — kullanıcı bir işin içinde,
 * yanlışlıkla başka bölüme geçmesin.
 */
export function Sayfa({ baslik, alt, onGeri, islem, dip, children }) {
  return (
    /* Dip çubuğu varken gövdeye ek boşluk gerekiyor: çubuk ekranın
       altına yapışık duruyor ve sayfa aşağı kaydırılırken içeriğin son
       satırını örtüyordu. */
    <div className={'uyg uyg--sayfa' + (dip ? ' uyg--dipli' : '')}>
      <Cubuk baslik={baslik} alt={alt} onGeri={onGeri} islem={islem} />
      <main className="uyg__ic">{children}</main>
      {/* Dip: sayfanın asıl işlemi. Ekranın altına yapışık duruyor ki
          uzun bir detayın sonuna kadar kaydırmak gerekmesin. */}
      {dip && <div className="uyg__dip">{dip}</div>}
    </div>
  )
}

/** Ekran içi bölüm başlığı. Sayı verilirse adın yanında duruyor. */
export function Bolum({ ad, sayi, children }) {
  return (
    <section className="bolum">
      <h2 className="bolum__ad">
        {ad}
        {sayi > 0 && <span className="bolum__sayi">{sayi}</span>}
      </h2>
      {children}
    </section>
  )
}

/* ==========================================================================
   Liste kartı — İşlerim'deki her satırın ortak iskeleti

   ÖNCEKİ KART BEŞ SATIRDI VE HEPSİ AYNI AĞIRLIKTAYDI

   Üstte tür rozeti ve tarih, altında ad, altında yer ve numara, altında
   randevu, altında "48 saati geçti". Beş satırın ilki tamamen künye
   bilgisiydi; servisin listede aradığı MÜŞTERİ ADI ikinci sıraya
   düşüyordu. Alt iki satır ayrı ayrı renkliydi ve kartın altı tırtıklı
   bitiyordu. Sekiz kartlık bir listede ekranda on altı renkli işaret
   oluyordu — hepsi acil görünüyor, hiçbiri öne çıkmıyordu.

   ÜÇ SATIR, TEK RENKLİ İŞARET

     1. AD — kartın çapası. Türü sağda, kendi rozetinde.
     2. KÜNYE — yer ve numara, sönük, tek satır.
     3. DURUM — solda servisin yapacağı iş (randevu ya da tutar),
        sağda zaman. İkisi de her kartta aynı yerde.

   ZAMAN İLE GECİKME AYNI YUVADA. Gecikmiş bir işte hem "7 gün önce"
   hem "48 saati geçti" yazıyordu; ikisi aynı şeyi söylüyor. Gecikmişse
   gecikme yazıyor, değilse süre.

   TEK İSKELET, İKİ İÇERİK. Aynı kartı hem talep hem teklif
   kullanıyor; ikisi İşlerim'de art arda duruyor ve ayrı düzenlerde
   çizilince liste dağılıyordu.

   Kart iç içe düğme DEĞİL: soldaki alan detayı açıyor, sağdaki
   bağlantı müşteriyi arıyor. İkisi kardeş — `<button>` içine
   `<button>` geçerli değil.
   ========================================================================== */

/**
 * @param {{ad, tur, turAdi, kunye, sol, sag, sagGec, gec, onAc, tel, telAd}} p
 *        sol/sag: durum satırının iki yakası · sagGec: sağdaki yazı uyarı
 *        rengine geçiyor · gec: kartın sol kenarında kırmızı şerit
 */
export function ListeKarti({
  ad,
  tur,
  turAdi,
  kunye,
  sol,
  sag,
  sagGec,
  gec,
  onAc,
  tel,
  telAd,
}) {
  return (
    <div className={'is' + (gec ? ' is--gec' : '')}>
      <button className="is__ac" onClick={onAc}>
        <div className="is__bas">
          <div className="is__ad">{ad}</div>
          <span className={'tur tur--' + tur}>{turAdi}</span>
        </div>

        <div className="is__alt">{kunye}</div>

        {(sol || sag) && (
          <div className="is__durum">
            <span className="is__sol">{sol}</span>
            <span className={'is__sag' + (sagGec ? ' is__sag--gec' : '')}>
              {sag}
            </span>
          </div>
        )}
      </button>

      {tel && (
        <a className="is__ara" href={'tel:' + tel} aria-label={telAd}>
          <IconPhone size={21} />
        </a>
      )}
    </div>
  )
}

/* Liste boşken duran açıklama.

   ÇİZİM VARSA ÇİZİM, YOKSA SİMGE

   Boş ekran servisin uygulamayı en çok göreceği hâllerden biri:
   sabah açtığında iş yoksa, stoku boşsa. Orada 40 piksellik gri bir
   simge "burada bir şey yok" demiyor, "ekran yüklenmedi" diyor.

   Çizimler saydam zeminli; koyu temada da aynı duruyorlar.

   İKİ BOY VAR VE SEBEBİ YER

   Boş bölümün ALTINDA başka bölüm varsa çizim küçülüyor (`kucuk`).
   Gerekçe ölçüldü: 375 pikselli bir telefonda çubuk ve sekmeler
   düştükten sonra 537 piksel içerik alanı kalıyor. Büyük boy blok
   370 piksel tutuyordu; altındaki "Tamamlanan" başlığı ekranın
   dışında kalıyor, servis tamamladığı işleri göremiyordu.

   Ekranda başka hiçbir şey yoksa büyük boy doğru: orada çizimin
   kaplayacağı yer zaten boş. */
export function Bos({ Icon, gorsel, baslik, alt, kucuk }) {
  return (
    <div className={'bos' + (kucuk ? ' bos--kucuk' : '')}>
      {gorsel ? (
        <img className="bos__gorsel" src={gorsel} alt="" />
      ) : (
        Icon && <Icon size={kucuk ? 28 : 40} />
      )}
      <strong>{baslik}</strong>
      {alt && <p>{alt}</p>}
    </div>
  )
}
