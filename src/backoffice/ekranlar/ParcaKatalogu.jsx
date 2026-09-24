import { useMemo, useRef, useState } from 'react'
import { fiyatListesiYayinlandi, izinli, parcaDuzeltmeleriGetir, parcaDuzeltmesiYaz } from '../veri'
import { useVeri } from '../kanca'
import {
  katalogHamGetir, duzeltmeleriUygula, fiyatListesiYayinla, gorselAdresi,
} from '../../lib/parcaKatalogu'
import { fiyatListesiniOku } from '../../lib/fiyatListesiOku'
import { gorseliDosyayaCevir } from '../fiyatListesiGorseli'
import { MARKA, PARA_BIRIMI, paraYaz } from '../../marka'
import { Baslik, Bekleme, Bos, Sayfalama, siraliListe, SiraliBaslik, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { ServisIskontosuKarti } from './ServisIskontosu'

/* ==========================================================================
   Yedek Parça Kataloğu — PAKSAN'ın fiyat listesinin ekrandaki yüzü

   NEDEN BU EKRAN AÇILDI (kullanıcının isteği, 18 Eylül 2026)

   Kullanıcının sorusu şuydu: "Parça kataloğunda ufak bir güncelleme
   yapmak istediğimde bunu kendim yapamayacak mıyım?" Yapamıyordu:
   katalog PAKSAN'ın bastığı fiyat listesinden bir betikle üretiliyor ve
   yanlış yazılmış tek bir parça adını düzeltmek bile geliştiriciye
   düşüyordu.

   İKİ AYRI İŞ, İKİ AYRI YOL — bu ayrım ekranın temeli

     DÜZELTME   Parça adı yanlış yazılmış, parça yanlış gruba düşmüş ya
                da artık satılmıyor. Bunlar fiyat değil KİMLİK bilgisi;
                üstüne yazılabilir, geçmişi bozmaz. Personel buradan
                anında düzeltiyor.

     FİYAT      Zam, indirim, yeni liste. Tek tek DEĞİŞTİRİLMİYOR; yeni
                liste bütün olarak yürürlüğe giriyor. Sebebi hukuki: bir
                servis üç ay önce o parçayı o fiyattan sipariş etti ve
                fiyat satırının üstüne yazılırsa o siparişin kanıtı
                kaybolur.

   Bu yüzden ekranda fiyat kutusu YOK. Fiyat yalnız "yeni liste" yoluyla
   değişiyor ve o yol önizlemeli.

   GEÇMİŞ SİPARİŞLER ZATEN KORUNUYOR

   Talep kaydına o günkü fiyatın anlık görüntüsü yazılıyor (bkz.
   lib/parcaKatalogu.js → fiyatGoruntusu: sürüm, kaynak ve satır satır
   birim fiyat). Backoffice ve raporlar canlı fiyata değil o görüntüye
   bakıyor. Yani yeni liste açık talepleri değiştirmiyor.

   DÜZELTME ASIL DOSYAYA YAZILMIYOR, ÜSTÜNE BİNİYOR

   Katalog dosyası olduğu gibi duruyor; düzeltmeler parça koduna bağlı
   ayrı bir kayıtta (bkz. backoffice/veri.js → parcaDuzeltmesiYaz).
   Yeni fiyat listesi geldiğinde dosya bütünüyle değişiyor ama
   düzeltmeler kodla eşleştiği için ayakta kalıyor.

   BUGÜNKÜ SINIR — ekranda da yazıyor

   Düzeltmeler bu tarayıcının deposunda. Sunucu açıldığında aynı ekran
   aynı işi yapacak, yalnız yazdığı yer değişecek (bayi ve servis
   listelerinde bugün de böyle).

   YENİ FİYAT LİSTESİ BURADAN YÜKLENİYOR (21 Eylül 2026). Personel PDF'i
   seçiyor, liste tarayıcıda okunuyor, önizlemede neyin değiştiği
   görünüyor, "Yayına Al" deyince sunucu eskisini arşive alıp yenisini
   yürürlüğe sokuyor. Bugün o sunucunun yerini geliştirme sunucusu
   tutuyor (sunucu-taklidi/fiyat-listesi-yayini.mjs); derlenmiş
   backoffice'te sunucu olmadan "sunucuya ulaşılamadı" der.

   METİNLER TEK NESNEDE: hepsi aşağıdaki METIN nesnesinde toplu.
   Codex'ten 19 Eylül 2026'da geçti; yeni metin eklenirse o da buraya
   yazılır, tek tek dağıtılmaz.
   ========================================================================== */

const METIN = {
  baslik: 'Yedek Parça Kataloğu',

  /* Başlığın altındaki dikkat kartı. Ekranı açan personelin ilk
     sorusu "fiyatı nereden değiştiririm" oluyor; cevabı en başta ve
     tek cümlede veriliyor. Kalıp Servisler ekranındaki "Şifre Yardımı
     Bekleyen Servis" kartıyla aynı. */
  uyariBaslik: 'Fiyatlar yeni liste yüklenerek güncellenir',
  uyariMetin:
    'Burada parça adını ve grubunu düzeltebilir, satılmayan parçayı pasife alabilirsiniz. Fiyatları güncellemek için aşağıdaki bölümden yeni fiyat listesini PDF olarak yükleyin.',
  uyariAlt:
    'Fiyatlar tek tek değiştirilemez. Yeni liste, daha önce verilmiş siparişlerin fiyatlarını değiştirmez.',

  // Süzgeç
  tumGruplar: 'Tüm gruplar',
  pasifGoster: 'Pasif Olanları Göster',
  ara: 'Ara',
  araIpucu: 'Parça adı veya kodu',
  birim: 'parça',

  // Tablo
  sutunKod: 'Kod',
  sutunAd: 'Parça',
  sutunGrup: 'Grup',
  sutunFiyat: 'Fiyat',
  duzelt: 'Düzenle',
  geriAl: 'Geri Al',
  rozetDuzeltildi: 'Düzeltildi',
  rozetPasif: 'Pasif',
  asilAd: 'Listedeki adı:',
  bosSuzgec: 'Aradığınız parça bulunamadı. Parça adını veya kodunu kontrol edin, farklı bir grup seçin ya da pasif parçaları gösterin.',

  // Düzeltme penceresi
  formBaslik: 'Parçayı düzenle',
  alanAd: 'Parça adı',
  alanGrup: 'Grup',
  alanPasif: 'Pasife al',
  pasifIpucu:
    'Pasif parça müşteriye ve servise gösterilmez, fiyat listesinden silinmez. Yeniden göstermek için "Pasif Olanları Göster" ile parçayı bulun ve "Pasife al" işaretini kaldırın.',
  gorselYok: 'Bu parçanın görseli yok.',
  kaydet: 'Düzeltmeyi Kaydet',
  vazgec: 'Vazgeç',
  adBos: 'Parça adını yazın.',

  /* Katalog sunucudan okunamadığında tablonun yerinde çıkan yazı. */
  katalogYok:
    'Parça kataloğu yüklenemedi. Sayfayı yenileyin; sorun sürerse yazılım ekibine haber verin.',

  /* YENİ FİYAT LİSTESİ (21 Eylül 2026, kullanıcının isteği: "Yedek parça
     personeli buradan yedek parça PDF listesini yükleyebilmeli").

     Personel PAKSAN'ın PDF fiyat listesini seçiyor; liste tarayıcıda
     okunuyor (lib/fiyatListesiOku.js), neyin değiştiği gösteriliyor,
     personel onaylayınca sunucu eskisini arşive alıp yenisini yürürlüğe
     sokuyor. Onay adımı asıl değer: yanlış okunmuş bir liste yayına
     girmeden yakalanıyor.

     Önceki hâli bir YÜKLEME değil KONTROL yeriydi: PDF'i bir geliştirici
     komut satırından dönüştürüyor, personel çıkan dosyayı açıp
     bakıyordu. Personelin elinde PDF vardı, dönüşmüş dosya yoktu; ekran
     "bize gönderin" diyordu ve "biz" diye bir taraf yoktu. */
  listeBaslik: 'Yeni fiyat listesi yükleyin',
  listeAciklama:
    `${MARKA} yedek parça fiyat listesini PDF olarak seçin. Parça sayısını ve yürürlükteki listeye göre değişiklikleri kontrol edin. Ardından "Listeyi Yayına Al" düğmesine basın. Onay penceresinde işlemi onaylamadan hiçbir fiyat değişmez.`,
  dosyaSec: "Fiyat Listesi PDF'ini Seç",
  dosyaIpucu:
    `Parça görsellerini, kodlarını, adlarını ve fiyatlarını içeren ${MARKA} fiyat listesinin PDF dosyasını seçin.`,
  okunuyor: 'Liste okunuyor…',
  okunanSayfa: (sayfa, toplam) => `Okunan sayfa: ${sayfa} / ${toplam}`,
  pdfDegil: `Seçtiğiniz dosya PDF değil. ${MARKA} yedek parça fiyat listesinin PDF dosyasını seçin.`,
  pdfOkunamadi: 'PDF açılamadı. Dosya bozuk ya da şifreli olabilir.',
  parcaBulunamadi:
    `Bu PDF'te parça bulunamadı. Dosyanın ${MARKA} yedek parça fiyat listesi olduğundan emin olun.`,

  onizlemeBaslik: (dosya, sayfa) => `${dosya} okundu · ${sayfa} sayfa`,
  toplamParca: 'Toplam parça',
  yeniParca: 'Yeni eklenen parça',
  dusenParca: 'Listeden çıkan parça',
  fiyatiDegisen: 'Fiyatı değişen parça',
  ortalamaDegisim: 'Ortalama fiyat değişimi',
  enBuyukArtis: 'En yüksek fiyat artışı',
  gorselsizParca: 'Görseli bulunamayan parça',
  buyukFark:
    "Okunan liste yürürlükteki listeden çok farklı. PDF dosyasını ve karşılaştırmayı kontrol edin. Sayfa düzeni değiştiyse liste eksik okunmuş olabilir. Doğru okunduğundan emin olmadan listeyi yayına almayın.",
  yayinDisi: (n) => `Liste yayına alınabilir. Fiyatı ya da adı okunamayan şu ${n} parça listede yer almayacak:`,
  yeniGrup: 'Yeni grup',
  yeniGrupUyari:
    'Yeni parça gruplarının hangi makineye ait olduğunu yazılım ekibine bildirin. Bu eşleştirme tanımlanana kadar gruplar müşteri ekranında görünmez.',
  listeFiyat: 'Fiyatı değişen parçalar',
  listeYeni: 'Yeni eklenen parçalar',
  listeDusen: 'Listeden çıkan parçalar',
  sutunEski: 'Eski fiyat',
  sutunYeni: 'Yeni fiyat',
  sutunDegisim: 'Değişim',
  yayinla: 'Listeyi Yayına Al',

  onayBaslik: 'Yeni fiyat listesini yayına al',
  onayMetin: (n) =>
    `Onayladığınızda ${n} parçalık yeni liste yürürlüğe girecek. Müşteriler ve servisler yeni fiyatları görecek. Daha önce verilmiş siparişlerin fiyatları değişmeyecek. Yürürlükteki liste arşivde saklanacak.`,
  onayDugme: 'Listeyi Yayına Al',
  yayinlaniyor: 'Liste yayına alınıyor…',
  yayinlandi: (n) => `Yeni fiyat listesi yayında · ${n} parça`,
  yayinBaglanti:
    'Sunucuya ulaşılamadığı için liste yayına alınamadı. Bağlantınızı kontrol edip yeniden deneyin.',
  yayinYazilamadi:
    'Sunucu dosyaları kaydedemediği için liste yayına alınamadı. Yürürlükteki liste değişmedi. Biraz sonra yeniden deneyin. Sorun sürerse yazılım ekibine haber verin.',
  yayinReddedildi:
    "Sunucu okunan listeyi kabul etmediği için liste yayına alınamadı. PDF dosyasını yeniden seçip deneyin. Sorun sürerse yazılım ekibine haber verin.",
}

const SAYFA_BOYU = 25

/** Düzeltme kaydı boşsa (hiçbir alan yoksa) tutulmasın. */
function duzeltmeDolu(d) {
  return Boolean(d && (d.ad || d.grup || d.gizli))
}

/* İki listeyi karşılaştırıp personelin anlayacağı özeti çıkarıyor.
   Saf fonksiyon: hiçbir yere yazmıyor, yalnız sayıyor. */
export function listeKarsilastir(eski, yeni) {
  const eskiler = new Map((eski?.parcalar || []).map((p) => [p.kod, p]))
  const yeniler = new Map((yeni?.parcalar || []).map((p) => [p.kod, p]))

  const yeniEklenenler = []
  const dusenler = []
  const degisenler = []

  for (const [kod, p] of yeniler) {
    const o = eskiler.get(kod)
    if (!o) {
      yeniEklenenler.push({ kod, ad: p.ad, fiyat: p.fiyat })
      continue
    }
    if (o.fiyat !== p.fiyat) {
      degisenler.push({
        kod,
        ad: p.ad,
        eski: o.fiyat,
        yeni: p.fiyat,
        /* Yüzde, eski fiyat sıfırsa hesaplanmıyor; listede sıfır fiyat
           yok ama gelen dosya bozuk olabilir. */
        oran: o.fiyat > 0 ? (p.fiyat - o.fiyat) / o.fiyat : null,
      })
    }
  }
  for (const [kod, o] of eskiler) {
    if (!yeniler.has(kod)) dusenler.push({ kod, ad: o.ad, fiyat: o.fiyat })
  }
  /* Personel önce en büyük değişime baksın: yanlış okunmuş bir fiyat
     (bir sıfır fazla, bir hane eksik) listenin en üstüne çıkıyor. */
  degisenler.sort((a, b) => Math.abs(b.oran ?? Infinity) - Math.abs(a.oran ?? Infinity))

  const oranlar = degisenler.map((d) => d.oran).filter((o) => o !== null)
  const ortalama = oranlar.length
    ? oranlar.reduce((a, b) => a + b, 0) / oranlar.length
    : null
  const enBuyuk = degisenler
    .filter((d) => d.oran !== null)
    .sort((a, b) => b.oran - a.oran)[0] || null

  const eskiGruplar = new Set((eski?.gruplar || []).map((g) => g.id))
  const yeniGruplar = (yeni?.gruplar || []).filter((g) => !eskiGruplar.has(g.id))

  return {
    toplam: yeniler.size,
    yeni: yeniEklenenler.length,
    dusen: dusenler.length,
    fiyatiDegisen: degisenler.length,
    ortalama,
    enBuyuk,
    yeniGruplar,
    yeniEklenenler,
    dusenler,
    degisenler,
  }
}

/* PDF kütüphanesi YALNIZ bu ekranda ve ilk seçimde yükleniyor: 1 MB'ı
   aşan bir kütüphane, fiyat listesi yılda birkaç kez yüklenirken bütün
   backoffice'in açılışını yavaşlatmasın. Okuma ayrı bir işçide koşuyor,
   sayfa donmuyor. */
async function pdfKutuphanesi() {
  const [pdfjs, isci] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = isci.default
  return pdfjs
}

function base64Yap(dosya) {
  return new Promise((coz, red) => {
    const okuyucu = new FileReader()
    okuyucu.onerror = () => red(okuyucu.error)
    okuyucu.onload = () => coz(String(okuyucu.result).split(',')[1] || '')
    okuyucu.readAsDataURL(dosya)
  })
}

/* Okunan liste şu ankinden çok mu farklı? PDF'in düzeni değişmişse
   okuma sessizce eksik kalır; o zaman ya parçaların büyük kısmı
   "çıkarılmış" görünür ya da görseller bulunamaz. */
function cokFarkliMi(ham, sonuc, ozet) {
  const eski = ham?.parcalar?.length || 0
  const yeni = sonuc.katalog.parcalar.length
  return (
    (eski > 0 && ozet.dusen > eski * 0.2) ||
    sonuc.eksik.gorsel.length > yeni * 0.1 ||
    sonuc.eksik.fiyat.length + sonuc.eksik.ad.length > yeni * 0.05
  )
}

function yuzdeYaz(oran) {
  if (oran === null || oran === undefined) return '—'
  const isaret = oran > 0 ? '+' : ''
  return `${isaret}%${(oran * 100).toFixed(1).replace('.', ',')}`
}

export function ParcaKatalogu({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'parcaKatalogDuzenle')

  const [duzeltmeler, setDuzeltmeler] = useState(() => parcaDuzeltmeleriGetir())
  const [grup, setGrup] = useState('hepsi')
  const [ara, setAra] = useState('')
  /* Pasif parçalar varsayılan olarak GİZLİ: personelin gördüğü liste,
     müşterinin gördüğü listeyle aynı olsun. Kutu işaretlenince liste
     yalnız pasiflere dönüyor — iki hâl birbirinin tersi, karışmıyor. */
  const [pasifGoster, setPasifGoster] = useState(false)
  const [sayfa, setSayfa] = useState(0)
  const [duzenlenen, setDuzenlenen] = useState(null)
  /* Yeni liste üç aşamadan geçiyor:
       okunuyor      { asama, dosyaAdi, sayfa, toplam }
       onizleme      { asama, dosyaAdi, sonuc, ozet, pdf }
       yayinlaniyor  önizlemenin aynısı, düğmeler kapalı */
  const [yeniListe, setYeniListe] = useState(null)
  const [listeHata, setListeHata] = useState('')
  const [yayinOnayi, setYayinOnayi] = useState(false)
  const dosyaGirdisi = useRef(null)

  /* HAM katalog okunuyor: ekran hem asıl adı hem düzeltilmiş adı
     gösteriyor. Öteki ekranlar düzeltilmiş hâli alıyor. */
  const { veri: ham, yukleniyor, hata } = useVeri(() => katalogHamGetir(), [surum], null)

  const gosterilen = useMemo(
    () => (ham ? duzeltmeleriUygula(ham, duzeltmeler) : null),
    [ham, duzeltmeler],
  )

  const gruplar = ham?.gruplar || []
  const grupAdi = useMemo(
    () => Object.fromEntries(gruplar.map((g) => [g.id, g.ad])),
    [gruplar],
  )

  const { siralama, cevir } = useSiralama('kod', 'artan')

  /* Liste HAM parçalar üzerinden kuruluyor: gizlenmiş parça da ekranda
     görünmeli, yoksa personel onu geri alamaz. */
  const liste = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const satirlar = (ham?.parcalar || [])
      .map((p) => {
        const d = duzeltmeler[p.kod]
        return {
          ...p,
          asilAd: p.ad,
          asilGrup: p.grup,
          ad: d?.ad || p.ad,
          grup: d?.grup || p.grup,
          gizli: Boolean(d?.gizli),
          duzeltilmis: duzeltmeDolu(d),
        }
      })
      .filter((p) => (grup === 'hepsi' ? true : p.grup === grup))
      /* Kutu işaretliyken YALNIZ pasifler görünüyor, hepsi değil:
         "pasife aldıklarım neydi" tek bakışta okunuyor ve geri alınacak
         parça 538 satırın arasında aranmıyor. */
      .filter((p) => (pasifGoster ? p.gizli : !p.gizli))
      .filter((p) =>
        q.length < 2
          ? true
          : p.ad.toLocaleLowerCase('tr-TR').includes(q) ||
            p.kod.toLocaleLowerCase('tr-TR').includes(q),
      )
    return siraliListe(satirlar, siralama, {
      kod: (p) => p.kod,
      ad: (p) => p.ad,
      grup: (p) => grupAdi[p.grup] || p.grup,
      fiyat: (p) => p.fiyat,
    })
  }, [ham, duzeltmeler, grup, ara, pasifGoster, siralama, grupAdi])

  /* `Sayfalama` sıfır tabanlı çalışıyor (bkz. ortak.jsx:196). */
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / SAYFA_BOYU))
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi - 1)
  const sayfadakiler = liste.slice(
    gecerliSayfa * SAYFA_BOYU,
    (gecerliSayfa + 1) * SAYFA_BOYU,
  )

  const pasifSayisi = Object.values(duzeltmeler).filter((d) => d?.gizli).length

  function duzeltmeKaydet(kod, d, ozet) {
    setDuzeltmeler(parcaDuzeltmesiYaz(kod, d, personel, ozet))
    tazele()
  }

  async function pdfSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    setListeHata('')
    setYeniListe(null)

    const bayt = await dosya.arrayBuffer()
    const imza = String.fromCharCode(...new Uint8Array(bayt, 0, Math.min(4, bayt.byteLength)))
    if (imza !== '%PDF') return setListeHata(METIN.pdfDegil)

    setYeniListe({ asama: 'okunuyor', dosyaAdi: dosya.name, sayfa: 0, toplam: 0 })
    try {
      const pdfjs = await pdfKutuphanesi()
      const sonuc = await fiyatListesiniOku(bayt, {
        pdfjs,
        kaynak: dosya.name,
        gorselIsle: gorseliDosyayaCevir,
        ilerleme: (sayfa, toplam) =>
          setYeniListe((l) => (l?.asama === 'okunuyor' ? { ...l, sayfa, toplam } : l)),
      })
      if (!sonuc.katalog.parcalar.length) {
        setYeniListe(null)
        return setListeHata(METIN.parcaBulunamadi)
      }
      setYeniListe({
        asama: 'onizleme',
        dosyaAdi: dosya.name,
        sonuc,
        ozet: listeKarsilastir(ham, sonuc.katalog),
        pdf: bayt,
      })
    } catch {
      setYeniListe(null)
      setListeHata(METIN.pdfOkunamadi)
    }
  }

  /* Yayına alınan liste: fiyatı ya da adı okunamayan parçalar
     çıkarılmış hâli. Onlar yayına girse müşteriye eksik tutar
     söylenirdi; önizlemede kodlarıyla yazıyorlar. Düzeltmeler (parça
     adı, grup, pasiflik) listeye yazılmıyor: parça koduna bağlı ayrı
     kayıtta duruyorlar ve yeni listenin üstüne de biniyorlar. */
  async function yayinla() {
    setYayinOnayi(false)
    const liste = yeniListe
    setYeniListe({ ...liste, asama: 'yayinlaniyor' })
    setListeHata('')

    try {
      const gorseller = {}
      const parcalar = []
      for (const p of liste.sonuc.katalog.parcalar) {
        if (p.fiyat === null || !p.ad) continue
        const g = liste.sonuc.gorseller.get(p.kod)
        let gorsel = null
        if (p.gorsel && g?.dosya) {
          gorsel = `${p.kod}.${g.uzanti}`
          gorseller[gorsel] = await base64Yap(g.dosya)
        }
        parcalar.push({ ...p, gorsel })
      }
      const kullanilan = new Set(parcalar.map((p) => p.grup))
      const cevap = await fiyatListesiYayinla({
        katalog: {
          kaynak: liste.dosyaAdi,
          gruplar: liste.sonuc.katalog.gruplar.filter((g) => kullanilan.has(g.id)),
          parcalar,
        },
        gorseller,
        kaynakPdf: await base64Yap(new Blob([liste.pdf])),
        personel,
      })

      if (cevap.hata) {
        setYeniListe(liste)
        /* Üç ayrı sebep, üç ayrı cümle: sunucuya ulaşılamadı, sunucu
           listeyi kaydedemedi, sunucu listeyi kurala aykırı buldu.
           Hepsine "kabul etmedi" demek personeli yanlış yere
           yönlendiriyordu (21 Eylül denemesinde kayıt hatasına öyle
           dendi). */
        const metin =
          cevap.hata === 'baglanti' ? METIN.yayinBaglanti
            : cevap.hata === 'yazilamadi' || cevap.hata.startsWith('durum-5') ? METIN.yayinYazilamadi
              : METIN.yayinReddedildi
        return setListeHata(metin)
      }
      fiyatListesiYayinlandi({ kaynak: liste.dosyaAdi, parca: cevap.parca, surum: cevap.surum }, personel)
      setYeniListe(null)
      tazele()
      bildir(METIN.yayinlandi(cevap.parca))
    } catch {
      setYeniListe(liste)
      setListeHata(METIN.yayinBaglanti)
    }
  }

  return (
    <>
      <Baslik ad={METIN.baslik} />

      <div className="kart kart--dikkat" style={{ marginBottom: 14 }}>
        <div className="kart__tepe">
          <h2>{METIN.uyariBaslik}</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: 0 }}>{METIN.uyariMetin}</p>
          <p className="kucuk sonuk" style={{ margin: '6px 0 0' }}>{METIN.uyariAlt}</p>
        </div>
      </div>

      {/* Servis iskontosu (23 Eylül 2026, kullanıcının isteği: "Bunu Yedek
          Parça Kataloğu ekranında yapabiliriz"). Ayrıntısı
          ServisIskontosu.jsx başında. */}
      <ServisIskontosuKarti personel={personel} rol={rol} bildir={bildir} tazele={tazele} surum={surum} />

      {duzenleyebilir && (
        <div className="kart" style={{ marginBottom: 14 }}>
          <div className="kart__tepe">
            <h2>{METIN.listeBaslik}</h2>
          </div>
          <div className="kart__ic">
            <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
              {METIN.listeAciklama}
            </p>

            <input
              ref={dosyaGirdisi}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={pdfSecildi}
            />
            {!yeniListe && (
              <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
                <button className="dg dg--ana" onClick={() => dosyaGirdisi.current?.click()}>
                  {METIN.dosyaSec}
                </button>
                <span className="kucuk sonuk">{METIN.dosyaIpucu}</span>
              </div>
            )}

            {listeHata && (
              <p className="uyari" style={{ margin: '12px 0 0', display: 'block' }}>
                {listeHata}
              </p>
            )}

            {yeniListe?.asama === 'okunuyor' && (
              <div className="katalog-okuma" role="status">
                <div style={{ fontWeight: 700 }}>{METIN.okunuyor}</div>
                <progress max={yeniListe.toplam || 1} value={yeniListe.sayfa} />
                <div className="kucuk sonuk">
                  {yeniListe.dosyaAdi}
                  {yeniListe.toplam ? ` · ${METIN.okunanSayfa(yeniListe.sayfa, yeniListe.toplam)}` : ''}
                </div>
              </div>
            )}

            {(yeniListe?.asama === 'onizleme' || yeniListe?.asama === 'yayinlaniyor') && (
              <ListeOnizleme
                liste={yeniListe}
                ham={ham}
                yayinlaniyor={yeniListe.asama === 'yayinlaniyor'}
                onYayinla={() => setYayinOnayi(true)}
                onVazgec={() => {
                  setYeniListe(null)
                  setListeHata('')
                }}
              />
            )}
          </div>
        </div>
      )}

      <SuzgecCubugu>
        <Secim
          ad={METIN.sutunGrup}
          deger={grup}
          onDegis={(v) => {
            setGrup(v)
            setSayfa(0)
          }}
          secenekler={[
            { deger: 'hepsi', ad: METIN.tumGruplar },
            ...gruplar.map((g) => ({ deger: g.id, ad: g.ad })),
          ]}
          genislik={230}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">{METIN.ara}</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => {
              setAra(e.target.value)
              setSayfa(0)
            }}
            placeholder={METIN.araIpucu}
          />
        </label>

        {/* Kutu yalnız pasif parça VARSA çıkıyor: hiç yokken
            anlamsız bir seçenek duruyordu. */}
        {pasifSayisi > 0 && (
          <label className="secim-alan">
            <span className="secim-alan__ad">{METIN.pasifGoster}</span>
            <input
              type="checkbox"
              checked={pasifGoster}
              onChange={(e) => {
                setPasifGoster(e.target.checked)
                setSayfa(0)
              }}
            />
          </label>
        )}

        <span className="suzgec-cubugu__sayi">
          {liste.length} {METIN.birim}
        </span>
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={6} />
        ) : hata || !ham ? (
          <Bos metin={METIN.katalogYok} />
        ) : liste.length === 0 ? (
          <Bos metin={METIN.bosSuzgec} />
        ) : (
          <>
            <div className="tablo-sar">
              {/* SÜTUN GENİŞLİĞİ SABİT. Sıralama değiştikçe satır
                  metinleri değişiyor ve tarayıcı sütunları yeniden
                  ölçüyordu: başlığa her tıklamada tablo yerinden
                  oynuyordu. Genişlikler burada bir kez veriliyor
                  (kalıp: rapor/Gorunum.jsx → rapor-tablo--sabit). */}
              <table className="katalog-tablo">
                <colgroup>
                  <col style={{ width: 130 }} />
                  <col />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 130 }} />
                  {duzenleyebilir && <col style={{ width: 170 }} />}
                </colgroup>
                <thead>
                  <tr>
                    <SiraliBaslik
                      ad={METIN.sutunKod}
                      alan="kod"
                      siralama={siralama}
                      onSirala={cevir}
                    />
                    <SiraliBaslik ad={METIN.sutunAd} alan="ad" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad={METIN.sutunGrup} alan="grup" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik
                      ad={METIN.sutunFiyat}
                      alan="fiyat"
                      siralama={siralama}
                      onSirala={cevir}
                      sag
                    />
                    {duzenleyebilir && <th style={{ width: 1 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {sayfadakiler.map((p) => (
                    <tr key={p.kod}>
                      <td className="mono kucuk sonuk">{p.kod}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{p.ad}</div>
                        {p.duzeltilmis && p.ad !== p.asilAd && (
                          <div className="kucuk sonuk">
                            {METIN.asilAd} {p.asilAd}
                          </div>
                        )}
                        <div className="satir" style={{ gap: 6, marginTop: 4 }}>
                          {p.gizli && <span className="rz rz--turuncu">{METIN.rozetPasif}</span>}
                          {p.duzeltilmis && !p.gizli && (
                            <span className="rz rz--mavi">{METIN.rozetDuzeltildi}</span>
                          )}
                        </div>
                      </td>
                      <td className="kucuk">{grupAdi[p.grup] || p.grup}</td>
                      <td className="kucuk mono sag">{paraYaz(p.fiyat)} {PARA_BIRIMI}</td>
                      {duzenleyebilir && (
                        <td>
                          <div className="satir" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <button className="dg" onClick={() => setDuzenlenen({ ...p })}>
                              {METIN.duzelt}
                            </button>
                            {/* Pasif satırda "Geri Al" YOK: pasifliği geri
                                almanın yeri düzeltme penceresindeki
                                "Pasife al" kutusu. İki ayrı yerden aynı
                                işin yapılması karışıklık çıkarıyordu. */}
                            {p.duzeltilmis && !p.gizli && (
                              <button
                                className="dg"
                                onClick={() => {
                                  duzeltmeKaydet(
                                    p.kod,
                                    null,
                                    `${p.kod} parçasının düzeltmesi geri alındı`,
                                  )
                                  bildir(METIN.geriAl)
                                }}
                              >
                                {METIN.geriAl}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Sayfalama
              sayfa={gecerliSayfa}
              sayfaSayisi={sayfaSayisi}
              toplam={liste.length}
              boy={SAYFA_BOYU}
              birim={METIN.birim}
              onDegis={setSayfa}
            />
          </>
        )}
      </div>

      {duzenlenen && (
        <DuzeltmeFormu
          parca={duzenlenen}
          gruplar={gruplar}
          onKapat={() => setDuzenlenen(null)}
          onKaydet={(yeni) => {
            const d = {}
            if (yeni.ad.trim() && yeni.ad.trim() !== duzenlenen.asilAd) d.ad = yeni.ad.trim()
            if (yeni.grup && yeni.grup !== duzenlenen.asilGrup) d.grup = yeni.grup
            if (yeni.gizli) d.gizli = true
            duzeltmeKaydet(
              duzenlenen.kod,
              duzeltmeDolu(d) ? d : null,
              `${duzenlenen.kod} parçası düzeltildi`,
            )
            setDuzenlenen(null)
            bildir(METIN.kaydet)
          }}
        />
      )}

      {yayinOnayi && yeniListe?.sonuc && (
        <div className="pencere" onClick={(e) => e.target === e.currentTarget && setYayinOnayi(false)}>
          <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
            <div className="kart__tepe">
              <h2>{METIN.onayBaslik}</h2>
            </div>
            <div className="kart__ic">
              <p style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
                {METIN.onayMetin(yayinlanacaklar(yeniListe.sonuc).length)}
              </p>
              <div className="satir">
                <button className="dg dg--ana" onClick={yayinla} autoFocus>
                  {METIN.onayDugme}
                </button>
                <button className="dg" onClick={() => setYayinOnayi(false)}>
                  {METIN.vazgec}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* Yayına girecek parçalar: fiyatı ve adı okunmuş olanlar. */
function yayinlanacaklar(sonuc) {
  return sonuc.katalog.parcalar.filter((p) => p.fiyat !== null && p.ad)
}

/* ------------------------------------------------------ Liste önizlemesi

   Personelin sorusu "bu liste doğru okundu mu, neler değişiyor?".
   Üstte sayılar, altında açılır üç liste: fiyatı değişenler (en büyük
   değişim en üstte — yanlış okunmuş bir fiyat orada göze batıyor),
   yeni eklenenler ve listeden çıkanlar. */
function ListeOnizleme({ liste, ham, yayinlaniyor, onYayinla, onVazgec }) {
  const { sonuc, ozet } = liste
  const disarida = sonuc.katalog.parcalar.filter((p) => p.fiyat === null || !p.ad)
  const fiyat = (n) => (n === null || n === undefined ? '—' : `${paraYaz(n)} ${PARA_BIRIMI}`)

  return (
    <div style={{ marginTop: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>
        {METIN.onizlemeBaslik(liste.dosyaAdi, sonuc.sayfaSayisi)}
      </h3>

      {cokFarkliMi(ham, sonuc, ozet) && (
        <p className="uyari" style={{ margin: '0 0 12px', display: 'block' }}>{METIN.buyukFark}</p>
      )}

      {/* Ölçü satırları: ad solda, sayı sağda. Düz tabloda hepsi sola
          dayanıyor ve sayılar okunmuyordu. */}
      <dl className="katalog-ozet">
        <div><dt>{METIN.toplamParca}</dt><dd className="mono">{ozet.toplam}</dd></div>
        <div><dt>{METIN.yeniParca}</dt><dd className="mono">{ozet.yeni}</dd></div>
        <div><dt>{METIN.dusenParca}</dt><dd className="mono">{ozet.dusen}</dd></div>
        <div><dt>{METIN.fiyatiDegisen}</dt><dd className="mono">{ozet.fiyatiDegisen}</dd></div>
        <div><dt>{METIN.ortalamaDegisim}</dt><dd className="mono">{yuzdeYaz(ozet.ortalama)}</dd></div>
        <div>
          <dt>{METIN.enBuyukArtis}</dt>
          <dd className="mono">
            {ozet.enBuyuk ? `${yuzdeYaz(ozet.enBuyuk.oran)} · ${ozet.enBuyuk.ad}` : '—'}
          </dd>
        </div>
        <div><dt>{METIN.gorselsizParca}</dt><dd className="mono">{sonuc.eksik.gorsel.length}</dd></div>
      </dl>

      {disarida.length > 0 && (
        <div className="uyari" style={{ marginTop: 12, display: 'block' }}>
          <div style={{ fontWeight: 700 }}>{METIN.yayinDisi(disarida.length)}</div>
          <p className="mono kucuk" style={{ margin: '4px 0 0' }}>
            {disarida.map((p) => p.kod).join(', ')}
          </p>
        </div>
      )}

      {ozet.yeniGruplar.length > 0 && (
        <div className="uyari" style={{ marginTop: 12, display: 'block' }}>
          <div style={{ fontWeight: 700 }}>
            {METIN.yeniGrup}: {ozet.yeniGruplar.map((g) => g.ad).join(', ')}
          </div>
          <p style={{ margin: '4px 0 0' }}>{METIN.yeniGrupUyari}</p>
        </div>
      )}

      <div className="katalog-degisim">
        {ozet.degisenler.length > 0 && (
          <details>
            <summary>{METIN.listeFiyat} ({ozet.degisenler.length})</summary>
            <DegisimTablosu
              satirlar={ozet.degisenler}
              sutunlar={[METIN.sutunEski, METIN.sutunYeni, METIN.sutunDegisim]}
              hucreler={(d) => [fiyat(d.eski), fiyat(d.yeni), yuzdeYaz(d.oran)]}
            />
          </details>
        )}
        {ozet.yeniEklenenler.length > 0 && (
          <details>
            <summary>{METIN.listeYeni} ({ozet.yeniEklenenler.length})</summary>
            <DegisimTablosu
              satirlar={ozet.yeniEklenenler}
              sutunlar={[METIN.sutunFiyat]}
              hucreler={(d) => [fiyat(d.fiyat)]}
            />
          </details>
        )}
        {ozet.dusenler.length > 0 && (
          <details>
            <summary>{METIN.listeDusen} ({ozet.dusenler.length})</summary>
            <DegisimTablosu
              satirlar={ozet.dusenler}
              sutunlar={[METIN.sutunFiyat]}
              hucreler={(d) => [fiyat(d.fiyat)]}
            />
          </details>
        )}
      </div>

      <div className="satir" style={{ gap: 8, marginTop: 14, alignItems: 'center' }}>
        <button className="dg dg--ana" onClick={onYayinla} disabled={yayinlaniyor}>
          {METIN.yayinla}
        </button>
        <button className="dg" onClick={onVazgec} disabled={yayinlaniyor}>
          {METIN.vazgec}
        </button>
        {yayinlaniyor && <span className="kucuk sonuk" role="status">{METIN.yayinlaniyor}</span>}
      </div>
    </div>
  )
}

function DegisimTablosu({ satirlar, sutunlar, hucreler }) {
  return (
    <div className="tablo-sar">
      <table className="katalog-tablo">
        <thead>
          <tr>
            <th>{METIN.sutunKod}</th>
            <th>{METIN.sutunAd}</th>
            {sutunlar.map((s) => (
              <th key={s} className="sag">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((d) => (
            <tr key={d.kod}>
              <td className="mono kucuk sonuk">{d.kod}</td>
              <td className="kucuk">{d.ad}</td>
              {hucreler(d).map((h, i) => (
                <td key={i} className="kucuk mono sag">{h}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------ Düzeltme penceresi */

function DuzeltmeFormu({ parca, gruplar, onKapat, onKaydet }) {
  const [ad, setAd] = useState(parca.ad)
  const [grup, setGrup] = useState(parca.grup)
  const [gizli, setGizli] = useState(Boolean(parca.gizli))
  const [hata, setHata] = useState('')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,26,51,.45)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="kart" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="kart__tepe">
          <h2>{METIN.formBaslik}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>
            {METIN.vazgec}
          </button>
        </div>
        <div className="kart__ic">
        {/* GÖRSEL EN ÜSTTE. Parça kodu ile ad yan yana birbirine
            benziyor; personel doğru parçayı düzelttiğinden ancak
            resme bakarak emin oluyor. */}
        <div className="katalog-form__tepe">
          {gorselAdresi(parca.gorsel) ? (
            <img
              className="katalog-form__gorsel"
              src={gorselAdresi(parca.gorsel)}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="katalog-form__gorsel katalog-form__gorsel--bos">
              <span className="kucuk sonuk">{METIN.gorselYok}</span>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700 }}>{parca.asilAd}</div>
            <div className="mono kucuk sonuk">{parca.kod}</div>
          </div>
        </div>

        <label className="alan">
          <span className="alan__ad">{METIN.alanAd}</span>
          <input
            className="gir"
            value={ad}
            autoFocus
            onChange={(e) => {
              setAd(e.target.value)
              setHata('')
            }}
            maxLength={120}
          />
        </label>

        <label className="alan">
          <span className="alan__ad">{METIN.alanGrup}</span>
          <select className="gir" value={grup} onChange={(e) => setGrup(e.target.value)}>
            {gruplar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.ad}
              </option>
            ))}
          </select>
        </label>

        <label className="alan" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={gizli} onChange={(e) => setGizli(e.target.checked)} />
          <span>{METIN.alanPasif}</span>
        </label>
        <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>{METIN.pasifIpucu}</p>

        {hata && <p className="uyari">{hata}</p>}

        <div className="satir" style={{ gap: 8 }}>
          <button
            className="dg dg--ana"
            onClick={() => {
              if (!ad.trim()) return setHata(METIN.adBos)
              onKaydet({ ad, grup, gizli })
            }}
          >
            {METIN.kaydet}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
