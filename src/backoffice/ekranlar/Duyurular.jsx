import { useEffect, useRef, useState } from 'react'
import { duyurulariGetir, duyuruSil, duyuruYayinla } from '../veri'
import { ILLER } from '../../data/iller'
import { PRODUCTS } from '../../data/katalog/products.js'
import { UYGULAMA } from '../../data/kimlik.js'
import { servisleriGetir } from '../../data/katalog/servisler.js'
import { useVeri } from '../kanca'
import { ACILIR, AcilirOk, Baslik, Bekleme, Bos, tarihYaz } from './ortak'
import { boyutYaz, ekAdresi, ekSil, ekYaz, fotoKucult } from '../../lib/ekler'
import { altBilgi, DUYURU_UST, yayinlanabilirTurler } from '../../data/duyuruTurleri'
import { DuyuruSayfasi } from '../../components/DuyuruPenceresi'

/* ==========================================================================
   Duyurular

   NEDEN VAR

   Duyuru altyapısı uygulamada baştan beri duruyordu ama yayınlayacak
   bir ekran yoktu: PAKSAN bir kampanya başlatsa ya da bir güvenlik
   uyarısı yapması gerekse müşteriye ulaşacak yol yoktu.

   MÜŞTERİDE NASIL GÖRÜNÜYOR

   İki yerde birden. Uygulamayı bir sonraki açışında pencere olarak
   çıkıyor (kapatılınca bir daha çıkmıyor), sonrasında Bildirimler
   listesinde kalıcı duruyor. Yalnız listede dursaydı kimse görmezdi;
   yalnız pencere olsaydı kapatan kişi bir daha ulaşamazdı.

   İKİ ÜST TÜR — VE ARALARINDAKİ FARK HUKUKİ

     DUYURU  Ticari elektronik ileti sayılıyor: 6563 sayılı kanun
             gereği YALNIZ izin veren müşteriye gidiyor. İzin kayıt
             sırasında alınıyor ve profilden geri çekilebiliyor.

     UYARI   Hizmete ilişkin bildirim; ticari ileti değil, herkese
             gidiyor. Zaten görülmemesi tehlikeli olan şey bu.

   ALT TÜRLER — VE ARALARINDAKİ FARK GÖRSEL

   (23 Eylül 2026, kullanıcının isteği: Geri Çağırma yeni duyuru için
   kaldırıldı, kalan dört tür tek "Bildirim Tipi" başlığı altında. Eski
   geri çağırma kayıtları doğru adla görünmeye devam ediyor; bkz.
   data/duyuruTurleri.js → yayinlanmaz.)

   Kampanya ile yeni ürün duyurusu hukuken aynı sınıfta ama okuyan
   için aynı şey değil; güvenlik uyarısı ile geri çağırma da öyle.
   Alt tür ekranda hangi temanın çıkacağını belirliyor ve üç üründe de
   aynı tablodan okunuyor (bkz. src/data/duyuruTurleri.js).

   Yanlış türü seçmek hukuki sonuç doğurduğu için ekranda kaç kişiye
   gideceği yayınlamadan önce yazıyor.
   ========================================================================== */

/* ==========================================================================
   Kime gidecek

   BU SEÇİM AÇILIR PANELİN İÇİNDEYDİ, ARTIK FORMDA DURUYOR

   Alıcı kitlesi "Seç" düğmesinin arkasında, il ve model süzgeçleriyle
   aynı kutuda duruyordu; özet satırı da hedef seçilmemişken "Herkese
   gidecek" yazıyordu. Oysa varsayılan yalnız müşterilerdi — yayınlanan
   duyuru servis ekranlarına hiç düşmüyordu ve ekran bunun tersini
   söylüyordu.

   İl ve model bir SÜZGEÇ (kitleyi daraltır), alıcı kitlesi ise bir
   KARAR. İkisi aynı kutuda durmamalı.
   ========================================================================== */

const KIMLER = [
  { id: 'musteri', ad: 'Müşterilere', alt: `${UYGULAMA} kullanan çiftçiler` },
  { id: 'servis', ad: 'Servislere', alt: 'Servis paneli ve servis uygulaması' },
  { id: 'ikisi', ad: 'İkisine de', alt: 'Hem müşteri hem servis ekranları' },
]

const KIME_ADI = Object.fromEntries(KIMLER.map((k) => [k.id, k.ad]))

/* ==========================================================================
   Hedefleme

   Duyuru varsayılan olarak HERKESE gidiyor. Hedef seçilmediği sürece
   kayda `hedef` alanı hiç yazılmıyor; okuma tarafı yokluğu "sınır yok"
   diye anlıyor (bkz. src/lib/duyuruHedef.js).

   Makine tipi ayrı alan değil: kategori seçimi burada ürün
   kimliklerine genişletiliyor, böylece müşterinin telefonunda tek bir
   liste karşılaştırması kalıyor.
   ========================================================================== */

const BOS_HEDEF = { kime: 'musteri', iller: [], servisler: [], urunler: [], seriler: [] }

/* ==========================================================================
   Hedefleme — bölge, makine, servis (23 Eylül 2026)

   KULLANICININ İSTEĞİ: "Bildirimler bölgeye, makineye ve servise spesifik
   gönderilebilsin." Süzgeçler vardı ama "Daraltma · Seç" düğmesinin
   arkasındaydı, servis süzgeci yalnız servise giden duyuruda çıkıyordu,
   seri numarası hiç sorulmuyordu. Artık üçü de formda açık duruyor ve iki
   alıcıya da uygulanıyor; nasıl uygulandığı lib/duyuruHedef.js başında.

   Seri numarası geri çağırmanın yerini tutuyor: belirli seri numaralı
   makineler için yapılacak uyarı, Güvenlik Uyarısı seçilip seri
   numaraları yazılarak gönderiliyor.
   ========================================================================== */

const HEDEF = {
  baslik: 'Hedefleme',
  aciklama:
    'Boş bıraktığınız alanlar alıcıları sınırlamaz. Aynı alandaki seçimlerden en az birine, farklı alanlardaki koşulların ise tümüne uyan alıcılara gönderilir.',
  bolge: 'Bölge (il)',
  bolgeAlt:
    'Müşteriler için hesabın kayıtlı olduğu il; servisler için bulundukları il ve hizmet verdikleri iller esas alınır.',
  ilAra: 'İl ara',
  ilSecildi: (n) => `${n} il seçildi`,
  tumIller: 'Tüm iller',
  tumMakineler: 'Tüm makineler',
  tumServisler: 'Tüm servisler',
  modelSecildi: (n) => `${n} model seçildi`,
  servisSecildi: (n) => `${n} servis seçildi`,
  model: 'Makine modeli',
  modelAlt: {
    musteri: 'Seçilen modellerden makinesi olan müşterilere gönderilir.',
    servis: 'Seçilen modellerdeki makinelere hizmet veren servislere gönderilir.',
    ikisi: 'Seçilen modellerden makinesi olan müşterilere ve bu modellerdeki makinelere hizmet veren servislere gönderilir.',
  },
  seri: 'Seri numaraları · isteğe bağlı',
  seriYerTutucu: 'Örnek: ORK1270-2024-00157, ORK1270-2024-00158',
  seriAlt: {
    musteri: 'Seri numaralarını virgülle ayırın veya alt alta yazın. Bu makinelerin sahiplerine gönderilir.',
    servis: 'Seri numaralarını virgülle ayırın veya alt alta yazın. Bu makinelere hizmet veren servislere gönderilir.',
    ikisi: 'Seri numaralarını virgülle ayırın veya alt alta yazın. Bu makinelerin sahiplerine ve bu makinelere hizmet veren servislere gönderilir.',
  },
  servis: 'Servis',
  servisAlt: {
    musteri: 'Seçilen servislerin hizmet verdiği makinelerin sahiplerine gönderilir.',
    servis: 'Yalnızca seçilen servislere gönderilir.',
    ikisi: 'Seçilen servislere ve bu servislerin hizmet verdiği makinelerin sahiplerine gönderilir.',
  },
  temizle: 'Hedefi Temizle',
  sinirsiz: (kime) => `${kime} bölge, makine veya servis sınırlaması olmadan gönderilecek.`,
  seriSayisi: (n) => `${n} seri numarası`,
  onay: (ozet) => `Yalnızca şu koşullara uyan alıcılara gönderilecek: ${ozet}.`,
}

/* Seri kutusuna yazılan: virgül, noktalı virgül, boşluk ya da satır
   sonuyla ayrılmış seri numaraları. Karşılaştırma biçimden bağımsız
   (lib/duyuruHedef.js); burada yalnız ayrılıyor ve tekilleştiriliyor. */
const seriAyir = (metin) => [
  ...new Set(
    String(metin || '')
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
]

const hedefVarMi = (h) =>
  Boolean(h?.iller?.length || h?.servisler?.length || h?.urunler?.length || h?.seriler?.length)

/* ==========================================================================
   Kapalı hedef kutusu (24 Eylül 2026)

   KULLANICININ İSTEĞİ: "Bölge, Makine modeli ve Servis kısımları çok yer
   kaplıyor. Başlıklarına tıklandıklarında açılacak şekilde … Servisler
   ekranındaki Hizmet Ücretleri gibi." Kutu kapalı açılıyor; başlıkta
   adı, seçimin özeti ("Tüm iller" ya da "2 il seçildi") ve Hizmet
   Ücretleri kartındaki aynı "Ayrıntıları Göster" yazısı ve oku var.
   Seçim yapılmış kutu kapansa da özet ne seçildiğini söylüyor; ayrıca
   formun altındaki özet satırı bütün hedefi yazıyor.
   ========================================================================== */
function HedefBlok({ ad, ozet, secili, kimlik, children }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className={'hedef-blok' + (acik ? ' hedef-blok--acik' : '')}>
      <button
        type="button"
        className="hedef-blok__dugme"
        aria-expanded={acik}
        aria-controls={kimlik}
        onClick={() => setAcik(!acik)}
      >
        <span className="hedef-blok__ad">{ad}</span>
        <span className={'hedef-blok__ozet' + (secili ? ' hedef-blok__ozet--secili' : '')}>{ozet}</span>
        <span className="acilir-tepe__ac">
          {acik ? ACILIR.kapat : ACILIR.ac}
          <AcilirOk />
        </span>
      </button>
      {acik && (
        <div className="hedef-blok__govde" id={kimlik}>
          {children}
        </div>
      )}
    </div>
  )
}

function HedefSecici({ hedef, onDegis, servisler }) {
  const [ilAra, setIlAra] = useState('')
  const [seriMetni, setSeriMetni] = useState(() => (hedef.seriler || []).join(', '))

  /* Hedef dışarıdan boşaltılınca (Hedefi Temizle, yayından sonra) kutu da
     boşalıyor. Yalnız ayraç yazılmışsa (seri henüz yok) dokunulmuyor. */
  useEffect(() => {
    if (!hedef.seriler?.length) setSeriMetni((m) => (seriAyir(m).length ? '' : m))
  }, [hedef.seriler])

  const cevir = (alan, deger) => {
    const mevcut = hedef[alan] || []
    onDegis({
      ...hedef,
      [alan]: mevcut.includes(deger) ? mevcut.filter((x) => x !== deger) : [...mevcut, deger],
    })
  }

  /* Seçili iller aramadan bağımsız hep görünüyor ve başta duruyor;
     aranan il yazılınca seçim gözden kaybolmasın. */
  const aranan = ilAra.trim().toLocaleLowerCase('tr-TR')
  const iller = [
    ...hedef.iller,
    ...ILLER.filter(
      (il) => !hedef.iller.includes(il) && (!aranan || il.toLocaleLowerCase('tr-TR').includes(aranan)),
    ),
  ]
  const kime = hedef.kime

  return (
    <div className="alan hedefleme">
      <span className="alan__ad">{HEDEF.baslik}</span>
      <p className="kucuk sonuk" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>{HEDEF.aciklama}</p>

      <HedefBlok
        ad={HEDEF.bolge}
        kimlik="hedef-bolge"
        secili={hedef.iller.length > 0}
        ozet={hedef.iller.length ? HEDEF.ilSecildi(hedef.iller.length) : HEDEF.tumIller}
      >
        <div className="hedef-blok__tepe">
          <input
            className="gir hedef-blok__ara"
            value={ilAra}
            onChange={(e) => setIlAra(e.target.value)}
            placeholder={HEDEF.ilAra}
            aria-label={HEDEF.ilAra}
          />
        </div>
        <div className="suzgec hedef-blok__liste">
          {iller.map((il) => (
            <button
              key={il}
              className={'cip' + (hedef.iller.includes(il) ? ' cip--on' : '')}
              aria-pressed={hedef.iller.includes(il)}
              onClick={() => cevir('iller', il)}
            >
              {il}
            </button>
          ))}
        </div>
        <span className="kucuk sonuk">{HEDEF.bolgeAlt}</span>
      </HedefBlok>

      <HedefBlok
        ad={HEDEF.model}
        kimlik="hedef-makine"
        secili={hedef.urunler.length > 0 || hedef.seriler.length > 0}
        ozet={
          [
            hedef.urunler.length && HEDEF.modelSecildi(hedef.urunler.length),
            hedef.seriler.length && HEDEF.seriSayisi(hedef.seriler.length),
          ]
            .filter(Boolean)
            .join(' · ') || HEDEF.tumMakineler
        }
      >
        <div className="suzgec hedef-blok__liste">
          {PRODUCTS.map((u) => (
            <button
              key={u.id}
              className={'cip' + (hedef.urunler.includes(u.id) ? ' cip--on' : '')}
              aria-pressed={hedef.urunler.includes(u.id)}
              onClick={() => cevir('urunler', u.id)}
            >
              {u.name}
            </button>
          ))}
        </div>
        <span className="kucuk sonuk">{HEDEF.modelAlt[kime]}</span>

        <label className="alan" style={{ margin: '12px 0 0' }}>
          <span className="alan__ad">{HEDEF.seri}</span>
          <textarea
            className="metin mono"
            style={{ minHeight: 64 }}
            value={seriMetni}
            onChange={(e) => {
              setSeriMetni(e.target.value)
              onDegis({ ...hedef, seriler: seriAyir(e.target.value) })
            }}
            placeholder={HEDEF.seriYerTutucu}
          />
          <span className="kucuk sonuk">{HEDEF.seriAlt[kime]}</span>
        </label>
      </HedefBlok>

      <HedefBlok
        ad={HEDEF.servis}
        kimlik="hedef-servis"
        secili={hedef.servisler.length > 0}
        ozet={hedef.servisler.length ? HEDEF.servisSecildi(hedef.servisler.length) : HEDEF.tumServisler}
      >
        <div className="suzgec hedef-blok__liste">
          {servisler.map((b) => (
            <button
              key={b.id}
              className={'cip' + (hedef.servisler.includes(b.id) ? ' cip--on' : '')}
              aria-pressed={hedef.servisler.includes(b.id)}
              onClick={() => cevir('servisler', b.id)}
            >
              {b.ad}
            </button>
          ))}
        </div>
        <span className="kucuk sonuk">{HEDEF.servisAlt[kime]}</span>
      </HedefBlok>

      <div className="hedef-ozet">
        <span className="kucuk">
          {hedefVarMi(hedef) ? hedefOzeti(hedef, servisler) : HEDEF.sinirsiz(KIME_ADI[kime])}
        </span>
        {hedefVarMi(hedef) && (
          /* Alıcı kitlesi korunuyor: yalnız süzgeçler temizleniyor. */
          <button className="dg dg--kucuk" onClick={() => onDegis({ ...BOS_HEDEF, kime })}>
            {HEDEF.temizle}
          </button>
        )}
      </div>
    </div>
  )
}

/* Yayınlamadan önceki son cümle. Alıcı kitlesi burada da yazıyor:
   yanlış kitleye giden duyuru geri alınamıyor, kaldırılsa bile
   görülmüş oluyor. */
function onayMetni(alt, baslik, kime, hedef, servisler) {
  const ana = anaOnayMetni(alt, baslik, kime)
  /* Süzgeç varsa onay penceresi onu da söylüyor: yanlış kitleye gönderilen
     duyuru geri alınamıyor. */
  return hedefVarMi(hedef) ? `${ana} ${HEDEF.onay(hedefOzeti(hedef, servisler))}` : ana
}

function anaOnayMetni(alt, baslik, kime) {
  const bilgi = altBilgi({ alt })
  const tur = bilgi.ust
  const adKucuk = bilgi.ad.toLocaleLowerCase('tr-TR')
  const alici =
    kime === 'servis' ? 'yalnız servislere'
      : kime === 'ikisi' ? 'hem müşterilere hem de servislere'
        : 'müşterilere'

  if (tur === 'uyari') {
    return `“${baslik}” başlıklı ${adKucuk} ${alici} gidecek. Ekranlarını açtıklarında pencere olarak görecekler; bu bildirim için izin gerekmiyor.`
  }
  /* Ticari ileti izni YALNIZ müşteri tarafında aranıyor. Duyuru
     yalnız servislere gidiyorsa o cümle konuyla ilgisiz kalıyordu:
     personel, duyuruyu almayacak kitlenin izin kuralını okuyordu. */
  if (kime === 'servis') {
    return `“${baslik}” başlıklı ${adKucuk} duyurusu ${alici} gidecek. Servislerde ticari ileti izni aranmaz.`
  }
  return `“${baslik}” başlıklı ${adKucuk} duyurusu ${alici} gidecek. Müşteri tarafında yalnızca ticari ileti izni verenlere ulaşır${kime === 'ikisi' ? '; servislerde böyle bir izin aranmaz' : ''}.`
}

/* Süzgeçlerin tek satırlık özeti: "Konya, Karaman · Orkinos 1270 ·
   Selçuk Servisi". Alıcı kitlesi burada yok; ekranda ayrıca yazıyor.
   Üçten çok seri numarası sayıyla yazılıyor. */
function hedefOzeti(hedef, servisler) {
  if (!hedef) return ''
  const parcalar = []
  if (hedef.iller?.length) parcalar.push(hedef.iller.join(', '))
  if (hedef.urunler?.length) {
    parcalar.push(hedef.urunler.map((id) => PRODUCTS.find((u) => u.id === id)?.name || id).join(', '))
  }
  if (hedef.seriler?.length) {
    parcalar.push(hedef.seriler.length > 3 ? HEDEF.seriSayisi(hedef.seriler.length) : hedef.seriler.join(', '))
  }
  if (hedef.servisler?.length) {
    parcalar.push(hedef.servisler.map((id) => servisler.find((b) => b.id === id)?.ad || id).join(', '))
  }
  return parcalar.join(' · ')
}

/* Duyurunun ekranda kalacağı süre. Gün cinsinden; 0 = süresiz.

   Rakamlar keyfî değil: bir hafta kısa duyuru (bir günlük fuar,
   hafta sonu kampanyası), bir ay çoğu kampanyanın süresi, üç ay
   sezonluk duyuru. Süresiz güvenlik uyarısı için — onun düşeceği bir
   gün yok. */
const SURELER = [
  { gun: 7, ad: '1 hafta' },
  { gun: 30, ad: '1 ay' },
  { gun: 90, ad: '3 ay' },
  { gun: 0, ad: 'Süresiz' },
]

export function Duyurular({ personel, bildir, tazele, surum }) {
  const [alt, setAlt] = useState('kampanya')
  const [baslik, setBaslik] = useState('')
  const [metin, setMetin] = useState('')
  const [gorsel, setGorsel] = useState(null)
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [silinecek, setSilinecek] = useState(null)
  const [hedef, setHedef] = useState(BOS_HEDEF)
  /* Kaç gün ekranda kalacağı. Varsayılan 30 gün: kampanya ve fuar
     duyurularının çoğu bir ayı geçmiyor. Süresiz seçeneği ayrıca
     var ve tıklanarak seçiliyor. */
  const [gun, setGun] = useState(30)

  const { veri: liste, yukleniyor } = useVeri(duyurulariGetir, [surum], [])
  const servisListesi = servisleriGetir()

  const secili = altBilgi({ alt })
  const tur = secili.ust
  const ustBilgi = DUYURU_UST.find((x) => x.id === tur)

  /* Tür değişince alıcı kitlesi o türün varsayılanına dönüyor.
     (Geri çağırmanın kilitli kitlesi vardı; tür yeni duyuru için
     kaldırıldı, 23 Eylül 2026.) */
  function turSec(id) {
    const bilgi = altBilgi({ alt: id })
    setAlt(id)
    setHedef((h) => ({ ...h, kime: bilgi.varsayilanKime }))
  }

  function kontrolEt() {
    if (baslik.trim().length < 4) return setHata('Duyuru başlığını yazın.')
    if (metin.trim().length < 10) return setHata('Duyuru metnini yazın.')
    setHata('')
    setOnay(true)
  }

  function yayinla() {
    duyuruYayinla({ tur, alt, baslik, metin, gorsel, hedef, gun }, personel)
    setBaslik('')
    setMetin('')
    setGorsel(null)
    setHedef({ ...BOS_HEDEF, kime: secili.varsayilanKime })
    setOnay(false)
    tazele()
    bildir(`${secili.ad} yayınlandı`)
  }

  return (
    <>
      <Baslik ad="Duyurular" />

      <div className="ikili">
        {/* ------------------------------------------------- Yeni duyuru */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Yeni Duyuru</h2>
          </div>

          <div className="kart__ic">
            {/* TÜR SEÇİMİ TEK BAŞLIK ALTINDA (23 Eylül 2026, kullanıcının
                isteği). Önce iki öbekti — "Duyuru" ve "Önemli Uyarı" —
                çünkü kampanya ile geri çağırma yan yana eşit
                görünüyordu. Geri çağırma kaldırılınca öbeklerin taşıdığı
                bilgi seçilen türün altındaki hukuki açıklamada kaldı
                (sarı kutu): izin gerekip gerekmediği orada yazıyor. */}
            <div className="alan">
              <span className="alan__ad">Bildirim Tipi</span>
              <div className="suzgec" style={{ marginBottom: 4 }}>
                {yayinlanabilirTurler().map((x) => (
                  <button
                    key={x.id}
                    className={'cip duyuru-cip' + (alt === x.id ? ' cip--on' : '')}
                    aria-pressed={alt === x.id}
                    onClick={() => turSec(x.id)}
                  >
                    <span className={'duyuru-nokta duyuru-nokta--' + x.ton} aria-hidden="true" />
                    {x.ad}
                  </button>
                ))}
              </div>
            </div>

            <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>{secili.alt}</p>

            <div className="uyari" style={{ marginTop: 0 }}>
              <span>{ustBilgi.kime}</span>
            </div>

            {/* ALICI KİTLESİ FORMDA, AÇILIR PANELDE DEĞİL. Gerekçesi
                KIMLER tanımının başında yazılı. */}
            <div className="alan" style={{ marginTop: 14 }}>
              <span className="alan__ad">Kimlere Gidecek</span>
              <div className="suzgec" style={{ marginBottom: 4 }}>
                {KIMLER.map((x) => (
                  <button
                    key={x.id}
                    className={'cip' + (hedef.kime === x.id ? ' cip--on' : '')}
                    aria-pressed={hedef.kime === x.id}
                    onClick={() => setHedef({ ...hedef, kime: x.id })}
                  >
                    {x.ad}
                  </button>
                ))}
              </div>
              <span className="kucuk sonuk">{KIMLER.find((x) => x.id === hedef.kime)?.alt}</span>
            </div>

            {/* HEDEFLEME ALICI KİTLESİNİN HEMEN ALTINDA: ikisi birlikte
                "kime gidecek" sorusunun cevabı. Önce formun sonunda,
                açılır bir panelin içindeydi. */}
            <HedefSecici hedef={hedef} onDegis={setHedef} servisler={servisListesi} />

            {/* ==================================================== Süre

                DUYURULARIN SONU YOKTU.

                Yayınlanan her duyuru sonsuza kadar kalıyordu: geçen
                yılın fuarı, biten kampanya, tarihi geçmiş bakım
                çağrısı. Elle silinmesi bekleniyordu ve kimsenin
                görevi değildi; ekran zamanla arşive dönüyordu.

                SÜRESİZ SEÇENEĞİ DURUYOR ve bilerek: geri çağırma bir
                kampanya değil, makine güvenliğiyle ilgili bir uyarı.
                Onun ekrandan düşeceği bir gün yok. */}
            <div className="alan">
              <span className="alan__ad">Ne Kadar Kalsın</span>
              <div className="suzgec" style={{ marginBottom: 4 }}>
                {SURELER.map((x) => (
                  <button
                    key={x.gun}
                    className={'cip' + (gun === x.gun ? ' cip--on' : '')}
                    onClick={() => setGun(x.gun)}
                  >
                    {x.ad}
                  </button>
                ))}
              </div>
              <span className="kucuk sonuk">
                {gun > 0
                  ? `Süre dolunca duyuru kendiliğinden yayından kalkar. ${tarihYaz(
                      Date.now() + gun * 86400000
                    )} tarihine kadar görünür.`
                  : 'Duyuru, siz silene kadar ekranda kalır. Güvenlik uyarıları için bu seçeneği kullanın.'}
              </span>
            </div>

            <label className="alan">
              <span className="alan__ad">Başlık</span>
              <input
                className="gir"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                /* İpucu alt türe göre: "Örnek: Sezon öncesi kampanyası"
                   yazısı geri çağırma seçiliyken yanlış yönlendiriyordu
                   (bkz. data/duyuruTurleri.js → ipucu). */
                placeholder={secili.ipucu}
                maxLength={70}
              />
              <span className="kucuk sonuk">
                Telefonun bildiriminde ilk görünen yazı bu. Kısa tutun.
              </span>
            </label>

            <label className="alan">
              <span className="alan__ad">Metin</span>
              <textarea
                className="metin"
                style={{ minHeight: 140 }}
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                /* İpucu alıcıya göre değişiyor: hedef "servislere"
                   seçilmişken "müşterinin okuyacağı metin" demek,
                   personeli yanlış kitleye yazmaya yönlendiriyordu. */
                placeholder={
                  hedef.kime === 'servis'
                    ? 'Servisin okuyacağı metin. Ne olduğunu ve ne yapması gerektiğini yazın.'
                    : 'Müşterinin okuyacağı metin. Ne olduğunu ve ne yapması gerektiğini yazın.'
                }
              />
            </label>

            <GorselAlani gorsel={gorsel} onDegis={setGorsel} />

            {/* ÖNİZLEME.

                Her alt türün kendi teması var ve personel yayınlamadan
                önce hangi temayla çıkacağını göremiyordu. Yayınlanan
                duyuru geri alınamıyor — kaldırılsa bile görülmüş
                oluyor. Önizleme, müşterinin ekranında çıkan pencerenin
                aynı renk ve ikonuyla duruyor. */}
            <Onizleme alt={alt} baslik={baslik} metin={metin} gorsel={gorsel} />

            {/* Metin çevrilmiyor: personelin yazdığı cümleyi uygulama
                çeviremez. Yurt dışında müşteri de varsa iki dilde ayrı
                duyuru yayınlanmalı.

                YALNIZ BAYİLERE GİDEN DUYURUDA BU NOT ÇIKMIYOR: servis
                paneli tek dilli ve bütün servisler Türkiye'de. Orada
                "İngilizce bir duyuru da yayınlayın" demek, yapılması
                imkânsız bir iş öneriyordu. */}
            {hedef.kime !== 'servis' && (
              <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
                Yazdığınız metin müşteriye <b>aynen</b> gider; uygulama çeviri yapmaz.
                Yurt dışındaki müşteriler için ayrıca İngilizce bir duyuru yayınlayın.
              </p>
            )}

            {hata && <div className="uyari">{hata}</div>}

            <button className="dg dg--ana" onClick={kontrolEt}>Yayınla</button>
          </div>
        </div>

        {/* ---------------------------------------------- Yayındakiler */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Yayındaki Duyurular</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {liste.length} kayıt
            </span>
          </div>

          <div className="kart__ic">
            {yukleniyor ? (
              <Bekleme satir={4} />
            ) : liste.length === 0 ? (
              <Bos metin="Henüz duyuru yayınlanmadı." />
            ) : (
              liste.map((d) => (
                <div
                  key={d.id}
                  style={{
                    borderBottom: '1px solid var(--cizgi)',
                    paddingBottom: 14,
                    marginBottom: 14,
                  }}
                >
                  <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
                    {/* Rozette artık alt tür yazıyor. "Duyuru" ve "Uyarı",
                        beş türü iki kutuya sıkıştırıyordu; listede hangi
                        duyurunun kaldırıldığı anlaşılmıyordu. */}
                    <span className={'duyuru-rz duyuru-rz--' + altBilgi(d).ton}>
                      {altBilgi(d).ad}
                    </span>
                    <b>{d.baslik}</b>
                    <button
                      className="dg dg--kucuk"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setSilinecek(d)}
                    >
              Yayından kaldır
                    </button>
                  </div>
                  {d.gorsel && <DuyuruGorseli gorsel={d.gorsel} />}
                  <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{d.metin}</p>
                  <div className="kucuk sonuk" style={{ marginTop: 6 }}>
                    {/* Kimin gördüğü listede yazmıyordu: aynı başlıkla
                        servise ve müşteriye ayrı duyuru gönderilebiliyor. */}
                    {[d.personel, tarihYaz(d.tarih), KIME_ADI[d.hedef?.kime || 'musteri']]
                      .filter(Boolean)
                      .join(' · ')}
                    {/* Süzgeç listede de yazıyor: aynı başlıkla iki ayrı
                        bölgeye gönderilen duyurular ayırt edilebilsin. */}
                    {hedefVarMi(d.hedef) && (
                      <div className="hedef-satir">{hedefOzeti(d.hedef, servisListesi)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {onay && (
        <Pencere
          baslik="Duyuruyu yayınla"
          metin={onayMetni(alt, baslik, hedef.kime, hedef, servisListesi)}
          onayYazi="Yayınla"
          onOnayla={yayinla}
          onVazgec={() => setOnay(false)}
        />
      )}

      {silinecek && (
        <Pencere
          baslik="Duyuruyu yayından kaldır"
          metin={`"${silinecek.baslik}" yayından kaldırılacak. Duyuruyu daha önce görmüş müşterilerin bildirim listesinden de silinir.`}
          onayYazi="Yayından kaldır"
          onOnayla={() => {
            duyuruSil(silinecek.id, personel)
            setSilinecek(null)
            tazele()
          bildir('Duyuru yayından kaldırıldı')
          }}
          onVazgec={() => setSilinecek(null)}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Önizleme

   Yayımlanan duyuru geri alınamıyor: kaldırılsa bile görülmüş oluyor.
   Personel, yazdığı şeyin karşı tarafta nasıl görüneceğini görmeden
   yayımlıyordu — hangi renk, hangi ikon, başlık görselin altında mı
   üstünde mi?

   AYNI BİLEŞEN, AYNI SINIFLAR. Ayrı bir "önizleme görünümü" yazılmadı:
   9 Ekim 2026'dan beri önizleme Connect ve Servisim'deki duyuru
   penceresinin bir sayfası (components/DuyuruPenceresi.jsx →
   DuyuruSayfasi; kapak, başlık, gün, metin). Ayrı yazılsaydı ikisi
   zamanla ayrışır ve önizleme yanıltıcı olurdu. Sayfalama ve düğmeler
   önizlemede yok; onlar her duyuruda aynı. Renkler backoffice kökünde
   ayrıca tanımlı — token'lar paylaşılmıyor (bkz. CLAUDE.md).
   ========================================================================== */
const ONIZLEME_GUNU = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })

function Onizleme({ alt, baslik, metin, gorsel }) {
  return (
    <div className="alan">
      <span className="alan__ad">Önizleme</span>
      <div className="dpen__kart--onizleme" data-duyuru-onizleme>
        <DuyuruSayfasi
          duyuru={{
            id: 'onizleme',
            alt,
            baslik: baslik.trim() || 'Başlık buraya gelecek',
            metin: metin.trim() || 'Metin buraya gelecek.',
            gorsel: gorsel || null,
          }}
          turAdi={(d) => altBilgi(d).ad}
          tarih={() => ONIZLEME_GUNU.format(new Date())}
        />
      </div>
      <span className="kucuk sonuk">
        Müşteri ve servis ekranlarında bu renk ve başlıkla görünecek.
      </span>
    </div>
  )
}

function Pencere({ baslik, metin, onayYazi, onOnayla, onVazgec }) {
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
        <div className="kart__tepe">
          <h2>{baslik}</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: '0 0 18px', lineHeight: 1.6 }}>{metin}</p>
          <div className="satir">
            <button className="dg dg--ana" onClick={onOnayla} autoFocus>{onayYazi}</button>
            <button className="dg" onClick={onVazgec}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Duyuru görseli

   ÖNERİLEN ÖLÇÜ 1200 × 675 PİKSEL (16:9). Neden bu:

     · Telefonda duyuru penceresinin genişliği ekranın tamamı; 16:9
       oran, metni ekranın dışına itmeden üste oturuyor.
     · 1200 piksel, yüksek çözünürlüklü telefonlarda da net görünen en
       küçük genişlik. Daha büyüğü tarlada boşuna veri harcıyor.

   Başka oranda bir görsel yüklenirse kırpılmıyor, olduğu gibi
   gösteriliyor — kampanya görselinin yazısı kesilmesin.

   Yüklenen dosya küçültülüyor (uzun kenar 1600 piksel, JPEG). Tasarımcı
   PNG gönderse bile telefona inen dosya küçük kalıyor.
   ========================================================================== */

/* Ölçüler ekranda da yazıyor; tasarımcıya iletilecek bilgi bu. */
export const DUYURU_GORSEL = { en: 1200, boy: 675, mb: 5 }

function GorselAlani({ gorsel, onDegis }) {
  const dosyaRef = useRef(null)
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  async function secildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return

    if (!dosya.type.startsWith('image/')) {
        return setHata('Yalnızca JPG veya PNG görseli yükleyebilirsiniz.')
    }
    if (dosya.size > DUYURU_GORSEL.mb * 1024 * 1024) {
      return setHata(`Dosya çok büyük. En fazla ${DUYURU_GORSEL.mb} MB olmalı.`)
    }

    setHata('')
    setCalisiyor(true)
    try {
      const kucuk = await fotoKucult(dosya)
      const id = await ekYaz(kucuk)
      if (gorsel?.id) await ekSil(gorsel.id).catch(() => {})
      onDegis({ id, ad: dosya.name, boyut: kucuk.size })
    } catch {
      setHata('Görsel okunamadı. Başka bir dosya deneyin.')
    } finally {
      setCalisiyor(false)
    }
  }

  async function kaldir() {
    if (gorsel?.id) await ekSil(gorsel.id).catch(() => {})
    onDegis(null)
  }

  return (
    <div className="alan">
      <span className="alan__ad">
        Görsel<span className="sonuk"> · isteğe bağlı</span>
      </span>

      {gorsel ? (
        <>
          <DuyuruGorseli gorsel={gorsel} />
          <div className="satir" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
            <span className="kucuk sonuk">
              {[gorsel.ad, boyutYaz(gorsel.boyut)].filter(Boolean).join(' · ')}
            </span>
            <button className="dg dg--kucuk" style={{ marginLeft: 'auto' }} onClick={kaldir}>
              Kaldır
            </button>
          </div>
        </>
      ) : (
        <button className="dg" disabled={calisiyor} onClick={() => dosyaRef.current?.click()}>
          {calisiyor ? 'Yükleniyor…' : 'Görsel seç'}
        </button>
      )}

      <input
        ref={dosyaRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={secildi}
      />

      <span className="kucuk sonuk">
        Önerilen ölçü <b>{DUYURU_GORSEL.en} × {DUYURU_GORSEL.boy} piksel</b> (16:9), en fazla{' '}
        {DUYURU_GORSEL.mb} MB · JPG veya PNG. Başka oranda bir görsel kırpılmaz, olduğu gibi
        gösterilir; yazı içeren görsellerde 16:9 dışına çıkmayın.
      </span>

      {hata && <div className="uyari" style={{ marginTop: 10 }}>{hata}</div>}
    </div>
  )
}

/* Görselin kendisi IndexedDB'de; ekranda göstermek için geçici adres
   üretilip çıkarken bırakılıyor. */
function DuyuruGorseli({ gorsel }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(gorsel.id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [gorsel.id])

  if (!adres) return null
  return <img className="duyuru-gorsel" src={adres} alt="" />
}
