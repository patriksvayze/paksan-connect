import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Logo, Amblem } from '../marka'
import sahne from '../assets/gorseller/karsilama-sahne.jpg'

/* ==========================================================================
   Şafak — karşılama ekranının açılış sahnesi

   NE OLUYOR

   Uygulama açıldığında Anadolu'da bir tarlada gün doğuyor. Sahne gece
   karanlığından şafağa aydınlanıyor, kamera ufka doğru çok yavaş
   ilerliyor, güneşin ışığı amblemin arkasında büyüyor, ufuktaki sis
   hafifçe kayıyor. Amblem ve PAKSAN yazısı güneşle birlikte doğuyor.

   ÇİZİMDEN FOTOĞRAF GERÇEKLİĞİNE (14 Eylül 2026)

   Önceki sahne CSS ile boyanmış bir gökyüzü, düz renkli bir daire
   güneş ve altta düz renkli bir tarla çiziminden (karsilama-tarla.png)
   oluşuyordu. Kullanıcı daha kaliteli bir açılış istedi. Görsel
   Higgsfield ile üretildi (Nano Banana Pro, firmanın Orkinos
   videosundan bir kare makine referansı olarak verildi) ve aynı
   yerde 4K'ya büyütüldü. Kaynak: tools/kaynak/karsilama-sahne-girdi.jpg.

   UFUKTAKİ MAKİNE PAKSAN'IN

   Üretilen sahnedeki makine PAKSAN'a benzemiyordu; kullanıcı
   "müşterilerimiz neden PAKSAN olmayan bir makine görsün" dedi.
   Traktörün çektiği turuncu balya makinesi ayrıca üretilip (Süper
   S8002 E fotoğrafı referans) sahneye yerleştirildi, eski makine
   silindi. Modelin gövdeye yazdığı bozuk marka yazısı silindi: yanlış
   yazılmış marka adı, hiç yazı olmamasından kötü.

   İlk yerleştirmede makine elle çizilmiş kaba bir çokgenle kesildi ve
   üretim görselinin açık renkli tozlu gökyüzü de makineyle birlikte
   geldi: traktörün ve makinenin çevresinde açık tonda yamalar göze
   batıyordu (kullanıcı fark etti). Şimdi makine arka plan ayırma
   modeliyle kendi hattından kesiliyor; sahnenin sisine göre biraz
   karartılıp puslandırılıyor, kenarlarına sahnenin ışığı sızdırılıyor,
   tekerlerin altına hafif gölge ve toz ekleniyor. Aynı iş yeniden
   yapılacaksa kaba maskeyle kesilmemeli.

   GÜNEŞ AMBLEMİN ARKASINDA — VE BU ÖLÇÜLEREK KONUYOR

   Görselde güneş ufukta, yüksekliğin %52,8'inde. Olduğu gibi
   yayılsaydı ufuk ekranın ortasına düşüyor ve "Yanınızdayız" yazısı
   güneşin en parlak ışığının üstünde kalıyordu (ölçüldü: kontrast
   2,34:1). Güneşin amblemin arkasına oturması hem bu sorunu çözüyor
   hem "logo güneşle doğar" fikrinin kendisi.

   Amblemin yeri sabit değil: karşılama ekranı esnek boşluklarla
   dizili, amblem ekran boyuna göre yukarı aşağı kayıyor. Bu yüzden
   ufuk bir yüzdeye yazılmıyor; amblemin merkezi ölçülüp `--ufuk-y`
   değişkenine yazılıyor ve görsel katmanı onu hizalıyor (bkz.
   styles.css → .safak__foto). Ekran döndüğünde ya da boyu değiştiğinde
   yeniden ölçülüyor.

   BİR KERE OYNUYOR

   Kullanıcı kayıt ekranına gidip geri geldiğinde animasyon baştan
   başlamıyor. Bir açılışta bir kez oynuyor; ikinci gelişte sahne
   doğrudan bitmiş hâliyle duruyor. Her seferinde birkaç saniye
   beklemek çabuk sıkar.

   HAREKET İSTEMEYENE HAREKET YOK

   Telefonunda "hareketi azalt" açık olan kullanıcıya animasyon hiç
   oynatılmıyor, sahne doğrudan son hâlinde geliyor. Bu bir tercih
   değil erişilebilirlik meselesi: hareket bazı insanlarda baş dönmesi
   yapıyor.
   ========================================================================== */

/* Animasyon bu oturumda oynadı mı. Bileşenin dışında duruyor ki
   ekrandan çıkıp geri gelince sıfırlanmasın. */
let oynadi = false

/* En uzun katmanın (kameranın ilerleyişi) süresi, milisaniye.
   styles.css → safak-kamera ile aynı tutulmalı. */
const SAHNE_SURESI = 7200

/* Amblem ölçülemezse (ilk çizimden önce) kullanılan ufuk: 390x844
   telefonda amblemin merkezi ekranın %23'ünde. */
const VARSAYILAN_UFUK = 0.23

/** Amblemin merkezi: dikeyde sahne yüksekliğine oran, yatayda sahnenin
 * ortasından piksel farkı.
 *
 * `getBoundingClientRect` KULLANILMIYOR: amblem doğarken 52 piksel
 * aşağıdan başlıyor (transform), o anda ölçülse ufuk da onunla birlikte
 * aşağı kayardı. `offsetTop` zinciri dönüşümleri saymıyor, amblemin
 * yerleşimdeki gerçek yerini veriyor.
 *
 * YATAY FARK NEDEN VAR. Karşılama ekranının iç dolgusu solda 24, sağda
 * 44 piksel; amblem o sütunda ortalandığı için ekranın ortasının 10
 * piksel sağında duruyor. Görsel ekranın ortasına hizalıydı ve güneş
 * her genişlikte amblemin 10 piksel solunda kalıyordu (son QA turu
 * ölçtü). Fark ölçülüp görsel katmanı o kadar kaydırılıyor. */
function amblemMerkezi(sahneEl) {
  const amblem = sahneEl.querySelector('.safak__amblem')
  if (!amblem || !sahneEl.offsetHeight) return null
  let y = amblem.offsetHeight / 2
  let x = amblem.offsetWidth / 2
  let el = amblem
  while (el && el !== sahneEl) {
    y += el.offsetTop
    x += el.offsetLeft
    el = el.offsetParent
  }
  if (el !== sahneEl) return null
  return {
    oran: Math.min(0.6, Math.max(0.08, y / sahneEl.offsetHeight)),
    fark: x - sahneEl.offsetWidth / 2,
  }
}

export function Safak({ children }) {
  const azalt = useRef(
    typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const kok = useRef(null)
  /* İlk açılışta animasyonlu, sonrasında bitmiş hâlde. */
  const [bitti, setBitti] = useState(() => oynadi || azalt.current)

  useEffect(() => {
    if (bitti) return
    /* İşaret animasyon BAŞLARKEN değil BİTERKEN konuyor.

       Başlarken konsaydı React'in geliştirme kipindeki çift bağlaması
       onu daha ilk anda kapatıyordu: ilk bağlanmada işaret konuyor,
       hemen ardından bileşen yeniden bağlanıyor ve "zaten oynadı"
       diyerek sahneyi bitmiş hâlde açıyordu. Animasyon hiç
       görünmüyordu. */
    const sayac = setTimeout(() => {
      oynadi = true
      setBitti(true)
    }, SAHNE_SURESI)
    return () => clearTimeout(sayac)
  }, [bitti])

  /* Ufku amblemin merkezine hizala; boy değişince yeniden ölç.
     `useLayoutEffect`: ilk kare boyanmadan önce yerine otursun, görsel
     bir an yanlış yerde görünüp zıplamasın. */
  useLayoutEffect(() => {
    const el = kok.current
    if (!el) return
    const olc = () => {
      const m = amblemMerkezi(el)
      if (!m) return
      el.style.setProperty('--ufuk-y', m.oran.toFixed(4))
      el.style.setProperty('--gunes-dx', m.fark.toFixed(1) + 'px')
    }
    olc()
    if (typeof ResizeObserver !== 'function') return
    const gozcu = new ResizeObserver(olc)
    gozcu.observe(el)
    return () => gozcu.disconnect()
  }, [])

  return (
    <div
      ref={kok}
      className={'safak' + (bitti ? ' safak--bitti' : '')}
      style={{ '--ufuk-y': VARSAYILAN_UFUK, '--gunes-dx': '0px' }}
    >
      <div className="safak__foto" style={{ backgroundImage: `url(${sahne})` }} />
      <div className="safak__isik" />
      <div className="safak__sis" />
      <div className="safak__perde" />

      <div className="safak__ic">{children}</div>
    </div>
  )
}

/**
 * Sahnenin marka bloğu — amblem üstte, PAKSAN yazısı altta.
 *
 * KARŞILAMA EKRANI KENDİ YERİNE KOYUYOR. Önce sahnenin içinde ayrı bir
 * katmandı ve yüzde ile konumlanıyordu; amblem eklenip blok büyüyünce
 * alttaki başlığın üstüne bindi. Akışın içinde durunca hiçbir ekran
 * boyunda çakışmıyor.
 *
 * AMBLEM BEYAZ DAİRE İÇİNDE. Kalkan amblemi çok renkli; koyu gökyüzünde
 * beyaza çevrilirse ayrıntıları kaybolup düz bir leke oluyor
 * (bkz. src/marka/logo.jsx). Beyaz daire hem amblemi kendi
 * renkleriyle bırakıyor hem doğan güneşin tam önünde duran bir madalyon
 * gibi duruyor.
 */
export function SafakLogo() {
  return (
    <div className="safak__logo">
      {/* Amblem yazıdan yarım saniye önce doğuyor: ikisi aynı anda
          gelseydi tek bir blok gibi kayarlardı. Arada boşluk olunca
          önce marka işareti, sonra adı beliriyor. */}
      <span className="safak__amblem">
        <Amblem size={64} cerceve />
      </span>
      <span className="safak__yazi">
        <Logo height={50} sadeceYazi beyaz />
      </span>
    </div>
  )
}
