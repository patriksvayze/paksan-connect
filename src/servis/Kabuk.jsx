import { useRef } from 'react'
import { Logo } from '../marka'
import { IconBack, IconCheckCircle, IconPhone, IconPlus } from '../components/Icons'
import { ParcaTablosu } from '../components/ParcaTablosu'
import { ParcaResmi, useParcaKatalogu } from '../components/ParcaResmi'
import { GeriKatmani, useGeri } from './geri'

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

/* Üst çubuk — Connect'in üst düzeni.

   Koyu çubuk yok. Ana sekmelerde solda tam renkli logo, sağda eylemler;
   alt sayfada solda beyaz "Geri" pili, ortada logo. Başlık çubuğun
   içinde sıkışmıyor, altında büyük ve dost duruyor — müşteri
   uygulamasındaki "Merhaba Onur" gibi. */
function Cubuk({ baslik, alt, onGeri, islem }) {
  return (
    <>
      <header className={'uyg__bar' + (onGeri ? ' uyg__bar--alt' : '')}>
        {onGeri ? (
          <button className="uyg__geri" onClick={onGeri}>
            <IconBack size={18} />
            Geri
          </button>
        ) : (
          <Logo height={26} />
        )}
        {onGeri && <Logo height={24} className="uyg__logo-orta" />}
        {islem ? <div className="uyg__islemler">{islem}</div> : <span />}
      </header>
      <div className="uyg__baslik">
        <h1>{baslik}</h1>
        {alt && <p>{alt}</p>}
      </div>
    </>
  )
}

/**
 * Sekmeli ana ekran.
 * @param {{ sekmeler: {id, ad, Icon, rozet?, rozetYazi?}[], onGeri?: Function }} props
 *        rozetYazi: rozetin ekran okuyucuya okunan anlamı ("3 yeni iş").
 *        onGeri verilirse sol üstte "Geri" düğmesi çıkıyor ve telefonun
 *        geri tuşu onu çağırıyor — sekmelerin üstüne açılan ama alt menüyü
 *        gizlemeyen ekranlar için (bugün Hesap).
 */
export function Kabuk({ baslik, alt, islem, fab, sekmeler, sekme, onSekme, onGeri, children }) {
  /* Geri tuşu: başka sekmedeyken ilk sekmeye döner; ilk sekmede
     karşılamaz, uygulama arka plana alınır (bkz. geri.jsx). */
  const ilk = sekmeler[0]?.id
  const derinlik = useGeri(Boolean(onGeri) || sekme !== ilk, () => (onGeri ? onGeri() : onSekme(ilk)))
  return (
    <GeriKatmani derinlik={derinlik}>
    <div className={'uyg' + (fab ? ' uyg--fabli' : '')}>
      <Cubuk baslik={baslik} alt={alt} islem={islem} onGeri={onGeri} />
      <main className="uyg__ic">{children}</main>

      {/* YÜZEN DÜĞME: sekmenin asıl işlemi (Kayıt Aç, Sipariş Ver).
          Alt menünün hemen üstünde, sağda — başparmağın durduğu yer.
          Yazısıyla birlikte: simge tek başına neyin ekleneceğini
          söylemiyor. Gerekçesi servis.css → .uyg__fab.

          DOKUNMA KUTUSU İLE GÖRÜNEN HAP AYRI (25 Eylül 2026, kullanıcı
          sınaması). Düğmenin kendisi yuvarlak haptı; hapın uçlarına
          dokunuş düğmeye değil alttaki karta düşüyor, basılı anda
          küçülme de kutuyu daraltıyordu. Düğme artık hapın çevresinde
          saydam bir dikdörtgen; hap onun içinde çiziliyor, basılınca
          küçülen yalnız hap. Ekran turu `.uyg__fab` seçicisine basıyor;
          sınıf yerinde. */}
      {fab && (
        <button className="uyg__fab" onClick={fab.onClick}>
          <span className="uyg__fab-hap">
            <IconPlus size={22} />
            <span>{fab.ad}</span>
          </span>
        </button>
      )}

      <nav className="uyg__tabs" aria-label="Bölümler">
        {sekmeler.map(({ id, ad, Icon, rozet, rozetYazi }) => (
          <button
            key={id}
            className={'uyg__tab' + (sekme === id ? ' uyg__tab--on' : '')}
            onClick={() => onSekme(id)}
            aria-current={sekme === id ? 'page' : undefined}
            /* Rozetin ne saydığını ekran okuyucu da söylüyor ("İşlerim,
               3 yeni iş"); rozetin kendisi ona kapalı. */
            aria-label={rozet > 0 && rozetYazi ? `${ad}, ${rozetYazi}` : undefined}
          >
            <span className="uyg__tab-ikon">
              <Icon size={22} />
              {/* Yeni iş sayısı; İşlerim'deki "Yeni" sekmesiyle aynı
                  (isDurumu.js → yeniIsSayisi). Bildirim sayısı değil:
                  o üst çubuktaki Bildirimler düğmesinde. Sayı 9'u geçince
                  "9+" yazıyor: rozet daireden taşıp simgeyi örtmesin. */}
              {rozet > 0 && (
                <span className="uyg__rozet" aria-hidden="true">{rozet > 9 ? '9+' : rozet}</span>
              )}
            </span>
            <span className="uyg__tab-ad">{ad}</span>
          </button>
        ))}
      </nav>
    </div>
    </GeriKatmani>
  )
}

/**
 * Tam ekran alt sayfa: talep detayı gibi, sekmelerin üstüne açılan
 * ekranlar. Sekme çubuğu görünmüyor — kullanıcı bir işin içinde,
 * yanlışlıkla başka bölüme geçmesin.
 */
export function Sayfa({ baslik, alt, onGeri, islem, dip, children }) {
  /* Geri tuşu ekrandaki "Geri" düğmesiyle aynı işi yapar. */
  const derinlik = useGeri(Boolean(onGeri), () => onGeri())
  return (
    <GeriKatmani derinlik={derinlik}>
    {/* Dip çubuğu varken gövdeye ek boşluk gerekiyor: çubuk ekranın
        altına yapışık duruyor ve sayfa aşağı kaydırılırken içeriğin son
        satırını örtüyordu. */}
    <div className={'uyg uyg--sayfa' + (dip ? ' uyg--dipli' : '')}>
      <Cubuk baslik={baslik} alt={alt} onGeri={onGeri} islem={islem} />
      <main className="uyg__ic">{children}</main>
      {/* Dip: sayfanın asıl işlemi. Ekranın altına yapışık duruyor ki
          uzun bir detayın sonuna kadar kaydırmak gerekmesin. */}
      {dip && <div className="uyg__dip">{dip}</div>}
    </div>
    </GeriKatmani>
  )
}

/* YAPILANIN ÖZETİ (29 Eylül 2026, görünüm önerisi S2). Kayıt, randevu,
   iptal ya da kapatmadan sonra liste sessizce açılıyordu; en önemli anın
   (kaydı gönderdim, ne kadar alacağım) bir cevabı yoktu. Şerit listenin
   ya da iş ayrıntısının başında, alt menünün üstüne binmiyor; ne
   olduğunu, işin nereye geçtiğini ve para varsa tutarı söylüyor. Ekran
   okuyucuya da okunuyor (role="status"). Durumu ve süresi
   ServisPanel.jsx'te (`basari`). */
export function BasariSeridi({ mesaj }) {
  return (
    <div className="basari-serit" role="status">
      <IconCheckCircle size={24} />
      <div className="basari-serit__govde">
        <strong>{mesaj.baslik}</strong>
        {mesaj.alt && <span>{mesaj.alt}</span>}
      </div>
    </div>
  )
}

/* AÇILIŞTAN SONRAKİ İLK AN DOKUNUŞ YUTULUYOR (29 Eylül 2026). Pencereyi
   açan düğmeye iki kez dokunulunca ikinci dokunuş, yeni açılan yaprağın
   o noktasına düşüyordu: karartılmış zemin (yaprağı kapatır) ya da
   onay düğmesi (okumadan onaylar). Kapanıştaki kilit
   (ServisPanel.jsx → GECIS_KILIDI_MS) açılışı kapsamıyordu. Connect'in
   yaprağındaki kilidin aynısı (components/Chrome.jsx → Sheet); süre
   Servisim'in öteki kilidiyle aynı. Yaprak açıldığında bağlanıyor, bu
   yüzden bağlanma anı açılış anı. Perdenin `onClickCapture`'ına verilir. */
const ACILIS_KILIDI_MS = 350

export function useAcilisKilidi() {
  const acilis = useRef(Date.now())
  return (e) => {
    if (Date.now() - acilis.current < ACILIS_KILIDI_MS) {
      e.stopPropagation()
      e.preventDefault()
    }
  }
}

/* ==========================================================================
   Onay yaprağı — geri alınamayan işlemden önce

   NEDEN VAR

   "Kaydı Tamamla" ve "Parçayı Taktım" basıldığı anda iş bitiyordu:
   talep durum değiştiriyor, PAKSAN'a düşüyor, müşteriye bildirim
   gidiyor. Sahada eldivenle, güneşte, tek elle kullanılan bir ekranda
   yanlış basmanın geri dönüşü yok.

   "EMİN MİSİNİZ?" DEMİYOR. Ne olacağını yazıyor — proje kuralı bu
   (bkz. CLAUDE.md, Servis Panelinin Kullanıcısı). Böylece onay bir
   engel değil, son bir özet oluyor.

   Ekranın DİBİNDEN açılıyor, ortasından değil: parmak orada duruyor
   ve giriş ekranındaki kâğıtla aynı dili konuşuyor.
   ========================================================================== */

/**
 * @param {{baslik, metin, kalemler, dugme, onOnayla, onVazgec}} p
 *        kalemler: [{ad, deger}] — onaylanacak şeyin özeti
 *        parcalar: [{kod, ad, adet}] — üç sütunlu tablo olarak çiziliyor
 */
export function Onay({
  baslik,
  metin,
  kalemler = [],
  /* Parça listesi metin olarak değil TABLO olarak geçiyor: kod, ad ve
     adet ayrı sütunlarda. Virgülle birleştirilmiş satır üç parçadan
     sonra okunmuyordu (bkz. components/ParcaTablosu.jsx). */
  parcalar = [],
  dugme,
  onOnayla,
  onVazgec,
}) {
  /* Geri tuşu "Vazgeç" demek. */
  useGeri(true, () => onVazgec())
  const kilit = useAcilisKilidi()
  return (
    <div
      className="onay-perde"
      onClickCapture={kilit}
      onClick={(e) => e.target === e.currentTarget && onVazgec()}
    >
      <div className="onay" role="dialog" aria-label={baslik}>
        <h2 className="onay__baslik">{baslik}</h2>
        {metin && <p className="onay__metin">{metin}</p>}

        {parcalar.length > 0 && (
          <div className="onay__parca">
            <ParcaTablosu parcalar={parcalar} />
          </div>
        )}

        {kalemler.length > 0 && (
          <div className="onay__liste">
            {kalemler.map((x) => (
              <div key={x.ad} className="onay__satir">
                <span>{x.ad}</span>
                <strong>{x.deger}</strong>
              </div>
            ))}
          </div>
        )}

        <button className="dg dg--ana dg--blok" onClick={onOnayla}>
          {dugme}
        </button>
        <button className="dg dg--blok onay__vazgec" onClick={onVazgec}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   Bilgi yaprağı — bir kaydın özeti

   Onay yaprağıyla aynı yüzey, ekranın dibinden açılıyor. Farkı: bir
   işlemi onaylatmıyor, bir kaydı özetliyor. İsteğe bağlı tek düğme
   kaydın kendisini açıyor; "Kapat" her zaman var.

   PARÇALAR GÖRSELLİ (21 Eylül 2026, kullanıcının isteği): yaprağı
   yalnız Hak Ediş ekranı kullanıyor. Önce ayrı bir görselli listesi
   vardı; 22 Eylül'de görsel ortak parça tablosuna girince o liste
   kaldırıldı (bkz. components/ParcaTablosu.jsx). `parcaBaslik` listenin
   üstündeki küçük etiket; verilmezse etiket yok.
   ========================================================================== */
export function Yaprak({
  baslik, metin, kalemler = [], parcalar = [], parcaBaslik, dugme, onDugme, onKapat,
}) {
  useGeri(true, () => onKapat())
  const kilit = useAcilisKilidi()
  return (
    <div
      className="onay-perde"
      onClickCapture={kilit}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="onay" role="dialog" aria-label={baslik}>
        <h2 className="onay__baslik">{baslik}</h2>
        {metin && <p className="onay__metin">{metin}</p>}

        {kalemler.length > 0 && (
          <div className="onay__liste">
            {kalemler.map((x, i) => (
              <div key={i} className="onay__satir">
                <span>{x.ad}</span>
                <strong>{x.deger}</strong>
              </div>
            ))}
          </div>
        )}

        {parcalar.length > 0 && (
          <div className="onay__parca">
            {parcaBaslik && <div className="onay__parca-baslik">{parcaBaslik}</div>}
            <ParcaTablosu parcalar={parcalar} />
          </div>
        )}

        {dugme && onDugme && (
          <button className="dg dg--ana dg--blok" onClick={onDugme}>
            {dugme}
          </button>
        )}
        <button className="dg dg--blok onay__vazgec" onClick={onKapat}>
          Kapat
        </button>
      </div>
    </div>
  )
}

/** Ekran içi bölüm başlığı. Sayı verilirse adın yanında duruyor.
    Kalan özellikler (`data-bolum` gibi) bölümün kendisine yazılıyor:
    ekran turu bölümü başlığın kelimesiyle değil bu işaretle buluyor
    (30 Eylül 2026, Hesap → "Hesabım", tur X-11). */
export function Bolum({ ad, sayi, children, ...ozellik }) {
  return (
    <section className="bolum" {...ozellik}>
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

   PARÇA ŞERİDİ (22 Eylül 2026, kullanıcının isteği: parça olan her
   yerde parçanın görseli). Sipariş kartında künyenin altında parçaların
   küçük resimleri. Kartın adı "2013101010 Pikap dişi × 2, …" diye kod
   ve adla yazıyor ve tek satırda kesiliyor; usta hangi siparişin ne
   olduğunu listeyi açmadan resimden tanıyor. En çok dört resim, fazlası
   "+2" gibi sayı. Yalnız kodu olan parça: kodu olmayan eski satırın
   resmi bulunamaz, şeritte boş kutu olurdu.
   ========================================================================== */

function ParcaSeridi({ parcalar }) {
  const katalog = useParcaKatalogu(parcalar.some((p) => p.gorsel === undefined))
  const gorunen = parcalar.slice(0, 4)
  const kalan = parcalar.length - gorunen.length
  return (
    <div className="is__parcalar" aria-hidden="true">
      {gorunen.map((p, i) => (
        <ParcaResmi key={p.kod + i} katalog={katalog} kod={p.kod} gorsel={p.gorsel} boyut={44} />
      ))}
      {kalan > 0 && <span className="is__parca-fazla">+{kalan}</span>}
    </div>
  )
}

/**
 * @param {{ad, tur, turAdi, kunye, parcalar, sol, sag, sagGec, gec, tutar, onAc, tel, telAd}} p
 *        sol/sag: durum satırının iki yakası · sagGec: sağdaki yazı uyarı
 *        rengine geçiyor · gec: kartın sol kenarında kırmızı şerit ·
 *        parcalar: [{kod, gorsel}] verilirse künyenin altında parça görselleri ·
 *        tutar: sağdaki yaka para, kartın en büyük yazısı (29 Eylül 2026, S3) ·
 *        turAdi boşsa tür rozeti çizilmiyor (her kartta aynı rozet gürültü)
 */
export function ListeKarti({
  ad,
  tur,
  turAdi,
  kunye,
  parcalar = [],
  ozet,
  uyari,
  sol,
  sag,
  sagGec,
  gec,
  tutar,
  onAc,
  tel,
  telAd,
}) {
  return (
    <div className={'is' + (gec ? ' is--gec' : '') + (tutar ? ' is--tutar' : '')}>
      <button className="is__ac" onClick={onAc}>
        <div className="is__bas">
          <div className="is__ad">{ad}</div>
          {turAdi && <span className={'tur tur--' + tur}>{turAdi}</span>}
        </div>

        <div className="is__alt">{kunye}</div>

        {parcalar.length > 0 && <ParcaSeridi parcalar={parcalar} />}

        {/* ARIZANIN KENDİSİ.

            Kart bir dönem yalnız kim, nerede, ne zaman diyordu;
            servisin gerçekten merak ettiği "ne olmuş" ancak kartı
            açınca görünüyordu. Sekiz işlik bir listede sekiz kartı
            tek tek açmak, listeyi listelikten çıkarıyor.

            Tek satırda kesiliyor: kart üç satırdan uzarsa liste yine
            okunmaz olur. */}
        {ozet && <div className="is__ozet">{ozet}</div>}

        {/* Kartın tek kırmızı satırı: bu iş bir kez kapandı, müşteri
            "hâlâ aynı" dedi. Servis listeye bakarken hangi işe ikinci
            kez gittiğini bilmeli. */}
        {uyari && <div className="is__uyari">{uyari}</div>}

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
