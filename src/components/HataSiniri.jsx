import { Component } from 'react'

/* ==========================================================================
   Çizim hatası sınırı — üç ürünün ortağı

   NEDEN VAR

   React'te bir bileşen çizim sırasında hata atarsa React bütün ağacı
   söküyor ve yerine hiçbir şey koymuyor: ekran bembeyaz kalıyor.
   Düğme yok, yazı yok, kayıt yok. Sınama yapan kişinin elinde
   söyleyebileceği tek şey "çalışmadı" oluyor; hangi ekranda, hangi
   satırda olduğu hiçbir yere yazılmıyor.

   Boş ekran bu projede zaten yasak (bkz. CLAUDE.md): "Boş ekran
   çıkmaz; ne yapılacağını açıklar". Bu dosya o kuralı çökme anında da
   geçerli kılıyor.

   ÜÇ ÜRÜN, TEK SINIR

   Müşteri uygulaması, personel paneli ve servis uygulaması ayrı
   derleniyor ama çökme davranışı üçünde de aynı olmalı. Tek dosya
   tutuluyor; yalnız görünüm `urun` bilgisine göre değişiyor, çünkü
   ikisi telefon biri masaüstü.

   DIŞ BAĞIMLILIĞI YOK — BİLEREK

   Dosya React dışında hiçbir şey import etmiyor: sözlük yok, ikon
   dosyası yok, depolama yardımcısı yok. Sebebi basit — çöken şeyin ta
   kendisi o modüllerden biri olabilir. Sınırın kendisi de çökerse
   geriye yine beyaz ekran kalır.

   KAYIT NEREYE GİDİYOR

   Çökme bildirimi toplayan bir sunucu yok. O yüzden kayıt iki yerde:
   oturum boyunca hafızada (`hataKayitlari()`) ve konsolda, hata başına
   TEK satır. Telemetri ucu eklenmedi; gidecek bir yer yok.
   ========================================================================== */

/* Oturum boyunca hafızada duran çökme listesi. Sayfa yenilenince
   sıfırlanıyor — kalıcı olması gereken bir şey değil, aynı oturumda
   "az önce ne oldu" sorusunun cevabı. */
const kayitlar = []

/** Bu oturumda yakalanan çökmeler. Geliştirici konsoldan çağırabilir. */
export function hataKayitlari() {
  return kayitlar.slice()
}

/* Aynı hata her yeniden çizimde tekrar gelebiliyor; konsol bir
   satırdan fazlasını hak etmiyor. Anahtar: ad + mesaj + yol. */
const yazilanlar = new Set()

function suAndakiYol() {
  try {
    /* Müşteri uygulaması hash yönlendirme kullanıyor, diğer ikisi
       bileşen durumu. Hash boşsa yol bilgisi yok; uydurulmuyor. */
    return window.location.hash || window.location.pathname || '-'
  } catch {
    return '-'
  }
}

/**
 * Bir çökmeyi kaydeder. Sınırın içinden ve açılış dosyalarından
 * (çizimden önce patlayan işler için) çağrılıyor.
 */
export function hataKaydet(urun, hata, ek) {
  const kayit = {
    urun: urun || 'app',
    nerede: ek?.nerede || 'cizim',
    yol: suAndakiYol(),
    zaman: new Date().toISOString(),
    ad: hata?.name || 'Error',
    mesaj: hata?.message || String(hata),
    yigin: hata?.stack || '',
    zincir: ek?.zincir || '',
  }
  kayitlar.push(kayit)

  const anahtar = `${kayit.ad}|${kayit.mesaj}|${kayit.yol}|${kayit.nerede}`
  if (!yazilanlar.has(anahtar)) {
    yazilanlar.add(anahtar)
    try {
      /* Projedeki tek bilinçli konsol çıktısı. Hangi derleme, nerede,
         hangi yol — sınama yapan kişinin ekran görüntüsüyle birlikte
         gönderebileceği kadar bilgi. */
      console.error(`[${kayit.urun}] ${kayit.nerede} · ${kayit.yol}`, hata, kayit.zincir)
    } catch {
      /* Konsol yoksa hafızadaki kayıt yeter. */
    }
  }
  return kayit
}

/* ==========================================================================
   METİNLER

   Ekranda görünen her Türkçe kelime Codex'ten geçiyor (bkz. CLAUDE.md);
   aşağıdaki beş metin oradan geldi. Müşteri uygulaması iki dilli
   olduğu için tr ve en ayrı duruyor.

   METİN NEDEN SÖZLÜKTEN GELMİYOR

   Çöken şey sözlüğün kendisi olabiliyor: `t()` çözülemezse hata ekranı
   da çizilemez ve yine beyaz ekran kalır. O yüzden bu beş metin
   sözlüğe DEĞİL bu dosyaya gömülü; dil seçimi de context'ten değil
   doğrudan depodan okunuyor. Beş metnin sözlükle ayrı kalması kabul
   edilen bedel — hata ekranı, sözlüğün çalıştığı varsayımına
   dayanamaz.
   ========================================================================== */

const YAZI = {
  tr: {
    baslik: 'Bir sorun oluştu',
    aciklama: 'Ekran açılamadı; girdiğiniz bilgiler hiçbir yere gönderilmedi. Yeniden deneyin ya da baştan başlayın.',
    teknik: 'Teknik bilgi',
    dene: 'Yeniden Dene',
    bastan: 'Baştan Başla',
  },
  en: {
    baslik: 'Something went wrong',
    aciklama: 'The screen could not be displayed; none of the information you entered was sent anywhere. Try again or start over.',
    teknik: 'Technical details',
    dene: 'Try Again',
    bastan: 'Start Over',
  },
}

/* Dil tercihi AppState içinde `paksan.dil` anahtarıyla duruyor
   (bkz. src/lib/storage.js). Burada depo doğrudan okunuyor: sağlayıcı
   ağacın içinde ve ağaç sökülmüş olabilir. */
function dilSec() {
  try {
    const kayitli = JSON.parse(localStorage.getItem('paksan.dil'))
    if (kayitli === 'tr' || kayitli === 'en') return kayitli
  } catch {
    /* Depo okunamıyorsa cihaz diline bakılıyor. */
  }
  try {
    return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'
  } catch {
    return 'tr'
  }
}

/* Yeniden yükleme. Müşteri uygulamasında hash yönlendirme var: olduğu
   yerde yenilemek aynı kırık ekrana geri döndürürdü, o yüzden önce
   başlangıca alınıyor. Diğer iki ürün zaten açılış ekranıyla geliyor. */
function bastanBasla() {
  try {
    if (window.location.hash) window.location.hash = '#/'
    window.location.reload()
  } catch {
    /* Yenileme engellendiyse "Yeniden Dene" düğmesi duruyor. */
  }
}

function Uyari() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.4 2.6 19.6h18.8L12 3.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 9.2v4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="1.05" fill="currentColor" />
    </svg>
  )
}

function HataEkrani({ urun, hata, onDene }) {
  /* Personel paneli ve servis uygulaması tek dilli (bkz. CLAUDE.md). */
  const y = YAZI[urun === 'app' ? dilSec() : 'tr']
  const teknik = `${hata?.name || 'Error'}: ${hata?.message || ''}`.trim()

  const govde = (
    <>
      <Uyari />
      <h2 style={{ fontSize: 18.5, margin: '10px 0 8px' }}>{y.baslik}</h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: '0 0 14px' }}>{y.aciklama}</p>
      {/* Teknik satır kullanıcıya değil, ekran görüntüsünü gönderecek
          kişiye yazılıyor: yığın izi değil tek satır. */}
      <p
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.75,
          margin: '0 0 18px',
          wordBreak: 'break-word',
        }}
      >
        {y.teknik}: {teknik}
      </p>
    </>
  )

  if (urun === 'backoffice') {
    /* Masaüstü: sayfanın ortasında tek kart. Düğmeler yan yana,
       panelin her yerindeki `.dg` ailesiyle aynı. */
    return (
      <div style={{ padding: 32, maxWidth: 620, margin: '0 auto' }}>
        <div className="kart">
          <div className="bos">
            {govde}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" className="dg dg--ana" onClick={onDene}>
                {y.dene}
              </button>
              <button type="button" className="dg" onClick={bastanBasla}>
                {y.bastan}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (urun === 'servis') {
    /* Tarlada, çoğu zaman ayakta ve eldivenle açılıyor: düğmeler tam
       genişlikte, alt alta (bkz. CLAUDE.md, servis kullanıcısı). */
    return (
      <div className="uyg uyg--sayfa">
        <div className="uyg__ic">
          <div className="kart">
            <div className="bos">
              {govde}
              <div style={{ display: 'grid', gap: 10 }}>
                <button type="button" className="dg dg--lg dg--ana" onClick={onDene}>
                  {y.dene}
                </button>
                <button type="button" className="dg dg--lg" onClick={bastanBasla}>
                  {y.bastan}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* Müşteri uygulaması. `.btn` zaten tam genişlikte. */
  return (
    <div className="screen wrap" style={{ paddingTop: 28 }}>
      <div className="empty">
        {govde}
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" className="btn btn--primary" onClick={onDene}>
            {y.dene}
          </button>
          <button type="button" className="btn btn--soft" onClick={bastanBasla}>
            {y.bastan}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Üç ürünün kökünü saran sınır.
 *
 *   <HataSiniri urun="app"><App /></HataSiniri>
 *
 * `urun`: 'app' | 'backoffice' | 'servis' — yalnız görünümü ve dili
 * belirliyor (bkz. src/lib/urun.js; burada prop olarak alınıyor ki
 * sınır o dosyaya da bağımlı olmasın).
 */
export class HataSiniri extends Component {
  constructor(props) {
    super(props)
    this.state = { hata: null }
    this.dene = () => this.setState({ hata: null })
  }

  static getDerivedStateFromError(hata) {
    return { hata }
  }

  componentDidCatch(hata, bilgi) {
    hataKaydet(this.props.urun, hata, { nerede: 'cizim', zincir: bilgi?.componentStack || '' })
  }

  render() {
    if (!this.state.hata) return this.props.children
    return <HataEkrani urun={this.props.urun || 'app'} hata={this.state.hata} onDene={this.dene} />
  }
}
