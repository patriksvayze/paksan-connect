import { PaksanLogo } from '../components/Marka'
import { IconBack } from '../components/Icons'

/* ==========================================================================
   Bayi uygulamasının kabuğu

   NEDEN AYRI BİR KABUK VAR

   Panel önce backoffice'in düzeniyle çiziliyordu: sayfanın tepesinde
   yan yana dizilmiş düğmeler, altında uzayıp giden bir liste. Bu
   bilgisayarda çalışan bir sayfanın düzeni. Telefonda açıldığında
   ekranın neresinde olunduğu belli olmuyor, işlemler başlıkla aynı
   satırda sıkışıyor ve "Çıkış" günlük işlerle aynı ağırlıkta duruyordu.

   Burada uygulamaların kendi düzeni var:

     · Üstte sabit bir çubuk — sayfa kaysa da yerinde duruyor,
       bulunulan yerin adını yazıyor.
     · Altta sekmeler — parmağın doğal olarak durduğu yer. Bayinin
       dört işi var, dördü de tek dokunuş uzakta.
     · Alt sayfalar tam ekran açılıyor ve geri oku ile kapanıyor.

   TEK KOD, İKİ GÖRÜNÜM. Aynı kabuk tarayıcıda da çalışıyor: geniş
   ekranda alt sekmeler üste, çubuğun altına geçiyor (bkz. bayi.css).
   Bayi panelinin ve bayi uygulamasının iki ayrı kopyası yok.

   ÇENTİK VE EV ÇUBUĞU. `bayi-mobil.html` içinde `viewport-fit=cover`
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
      {islem || <PaksanLogo height={15} sadeceYazi beyaz />}
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
    <div className="uyg uyg--sayfa">
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

/** Liste boşken ekranın ortasında duran açıklama. */
export function Bos({ Icon, baslik, alt }) {
  return (
    <div className="bos">
      {Icon && <Icon size={40} />}
      <strong>{baslik}</strong>
      {alt && <p>{alt}</p>}
    </div>
  )
}
