import { useMemo, useRef, useState } from 'react'
import {
  izinli,
  parcaDuzeltmeleriGetir,
  parcaDuzeltmeleriSifirla,
  parcaDuzeltmesiYaz,
} from '../veri'
import { useVeri } from '../kanca'
import { katalogHamGetir, duzeltmeleriUygula, gorselAdresi } from '../../lib/parcaKatalogu'
import { MARKA, PARA_BIRIMI, paraYaz } from '../../marka'
import { Baslik, Bekleme, Bos, Sayfalama, siraliListe, SiraliBaslik, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'

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
   listelerinde bugün de böyle). Yeni fiyat listesi ise bugün sunucuya
   elle konuyor; ekran listeyi önizliyor ve birleştirilmiş dosyayı
   veriyor, yerine koymak dağıtım adımı.

   METİNLER TASLAK: Codex sınırı dolu (bkz. CODEX-BEKLEYEN.md). Hepsi
   aşağıdaki METIN nesnesinde; Codex'e olduğu gibi verilir.
   ========================================================================== */

const METIN = {
  baslik: 'Yedek Parça Kataloğu',

  /* Başlığın altındaki dikkat kartı. Ekranı açan personelin ilk
     sorusu "fiyatı nereden değiştiririm" oluyor; cevabı en başta ve
     tek cümlede veriliyor. Kalıp Servisler ekranındaki "Şifre Yardımı
     Bekleyen Servis" kartıyla aynı. */
  uyariBaslik: 'Fiyat buradan değiştirilmez',
  uyariMetin:
    'Parça adını ve grubunu düzeltebilir, satılmayan parçayı pasife alabilirsiniz. Fiyat tek tek değiştirilmez: zam ya da indirim geldiğinde güncel fiyat listesini yükleyin.',
  uyariAlt:
    'Eski fiyatlar verilmiş siparişlerin kanıtı olarak olduğu gibi kalır.',

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
  duzelt: 'Düzelt',
  geriAl: 'Geri Al',
  rozetDuzeltildi: 'Düzeltildi',
  rozetPasif: 'Pasif',
  asilAd: 'Listedeki adı:',
  bosSuzgec: 'Bu süzgeçle parça bulunamadı.',

  // Düzeltme penceresi
  formBaslik: 'Parçayı Düzelt',
  alanAd: 'Parça Adı',
  alanGrup: 'Grup',
  alanPasif: 'Pasife al',
  pasifIpucu:
    'Pasif parça müşteriye ve servise gösterilmez. Fiyat listesinden silinmez; bu listede "Pasif Olanları Göster" ile bulunup geri alınabilir.',
  gorselYok: 'Bu parçanın görseli yok.',
  kaydet: 'Düzeltmeyi Kaydet',
  vazgec: 'Vazgeç',
  adBos: 'Parça adı boş bırakılamaz.',

  // Toplu geri alma
  hepsiniGeriAl: 'Tüm Düzeltmeleri Geri Al',
  hepsiniGeriAlSoru: (n) =>
    `${n} düzeltme geri alınacak ve parçalar fiyat listesindeki hâline dönecek.`,

  // Yeni fiyat listesi
  listeBaslik: 'Yeni Fiyat Listesi',
  listeAciklama:
    'Yeni listeyi yüklediğinizde önce neyin değiştiğini gösteririm; onaylamadan hiçbir şey değişmez.',
  dosyaSec: 'Fiyat Listesi Dosyası Seç',
  dosyaIpucu: `${MARKA} fiyat listesinden üretilmiş .json dosyası`,
  okunamadi: 'Dosya okunamadı. Fiyat listesinden üretilmiş bir dosya seçtiğinizden emin olun.',
  onizlemeBaslik: 'Yeni listede ne değişiyor',
  toplamParca: 'Parça',
  yeniParca: 'Yeni gelen',
  dusenParca: 'Listeden düşen',
  fiyatiDegisen: 'Fiyatı değişen',
  ortalamaDegisim: 'Ortalama değişim',
  enBuyukArtis: 'En büyük artış',
  yeniGrup: 'Yeni grup',
  yeniGrupUyari:
    'Yeni gelen parça grupları bir makine ailesine bağlanmadan müşteri ekranında görünmez. Bu bağ bugün kod içinde tutuluyor; listeyi yayına almadan önce bize bildirin.',
  indir: 'Birleştirilmiş Dosyayı İndir',
  indirIpucu:
    'İndirdiğiniz dosya sunucuya konulduğunda yeni liste yayına girer. Sunucu açıldığında bu adım tek düğmeye inecek.',
  onizlemeKapat: 'Önizlemeyi Kapat',
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

  let yeniSayi = 0
  let dusen = 0
  const degisenler = []

  for (const [kod, p] of yeniler) {
    const o = eskiler.get(kod)
    if (!o) {
      yeniSayi += 1
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
  for (const kod of eskiler.keys()) if (!yeniler.has(kod)) dusen += 1

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
    yeni: yeniSayi,
    dusen,
    fiyatiDegisen: degisenler.length,
    ortalama,
    enBuyuk,
    yeniGruplar,
  }
}

/** Gelen dosya gerçekten fiyat listesi mi? */
function listeGecerliMi(v) {
  return (
    v &&
    Array.isArray(v.parcalar) &&
    v.parcalar.length > 0 &&
    Array.isArray(v.gruplar) &&
    v.gruplar.length > 0 &&
    v.parcalar.every(
      (p) => p && typeof p.kod === 'string' && typeof p.ad === 'string' && typeof p.fiyat === 'number',
    )
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
     müşterinin gördüğü listeyle aynı olsun. Pasife alınmış bir parçayı
     geri almak için bu kutu işaretleniyor. */
  const [pasifGoster, setPasifGoster] = useState(false)
  const [sayfa, setSayfa] = useState(0)
  const [duzenlenen, setDuzenlenen] = useState(null)
  const [yeniListe, setYeniListe] = useState(null)
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
      .filter((p) => (pasifGoster ? true : !p.gizli))
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

  const duzeltmeSayisi = Object.keys(duzeltmeler).length
  const pasifSayisi = Object.values(duzeltmeler).filter((d) => d?.gizli).length

  function duzeltmeKaydet(kod, d, ozet) {
    setDuzeltmeler(parcaDuzeltmesiYaz(kod, d, personel, ozet))
    tazele()
  }

  function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    const okuyucu = new FileReader()
    okuyucu.onerror = () => bildir(METIN.okunamadi)
    okuyucu.onload = () => {
      try {
        const v = JSON.parse(String(okuyucu.result))
        if (!listeGecerliMi(v)) return bildir(METIN.okunamadi)
        setYeniListe({ veri: v, ozet: listeKarsilastir(ham, v) })
      } catch {
        bildir(METIN.okunamadi)
      }
    }
    okuyucu.readAsText(dosya)
  }

  /* Birleştirilmiş dosya: yeni fiyat listesi + bugünkü düzeltmeler.
     Sunucuya konulacak dosya bu — düzeltmeler her okumada yeniden
     bindiği için aslında şart değil, ama sunucudaki dosyanın da doğru
     adları taşıması ileride bir karışıklığı önlüyor. */
  function birlestirilmisIndir() {
    const birlesik = duzeltmeleriUygula(yeniListe.veri, duzeltmeler)
    const kan = new Blob([JSON.stringify(birlesik, null, 2)], {
      type: 'application/json',
    })
    const adres = URL.createObjectURL(kan)
    const bag = document.createElement('a')
    bag.href = adres
    bag.download = `parca-katalogu-${new Date().toISOString().slice(0, 10)}.json`
    bag.click()
    URL.revokeObjectURL(adres)
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
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={dosyaSecildi}
            />
            <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
              <button className="dg" onClick={() => dosyaGirdisi.current?.click()}>
                {METIN.dosyaSec}
              </button>
              <span className="kucuk sonuk">{METIN.dosyaIpucu}</span>
            </div>

            {yeniListe && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>
                  {METIN.onizlemeBaslik}
                </h3>
                {/* Ölçü satırları: ad solda, sayı sağda. Düz tabloda
                    hepsi sola dayanıyor ve sayılar okunmuyordu. */}
                <dl className="katalog-ozet">
                  <div><dt>{METIN.toplamParca}</dt><dd className="mono">{yeniListe.ozet.toplam}</dd></div>
                  <div><dt>{METIN.yeniParca}</dt><dd className="mono">{yeniListe.ozet.yeni}</dd></div>
                  <div><dt>{METIN.dusenParca}</dt><dd className="mono">{yeniListe.ozet.dusen}</dd></div>
                  <div><dt>{METIN.fiyatiDegisen}</dt><dd className="mono">{yeniListe.ozet.fiyatiDegisen}</dd></div>
                  <div><dt>{METIN.ortalamaDegisim}</dt><dd className="mono">{yuzdeYaz(yeniListe.ozet.ortalama)}</dd></div>
                  <div>
                    <dt>{METIN.enBuyukArtis}</dt>
                    <dd className="mono">
                      {yeniListe.ozet.enBuyuk
                        ? `${yuzdeYaz(yeniListe.ozet.enBuyuk.oran)} · ${yeniListe.ozet.enBuyuk.ad}`
                        : '—'}
                    </dd>
                  </div>
                </dl>

                {yeniListe.ozet.yeniGruplar.length > 0 && (
                  <div className="uyari" style={{ marginTop: 12, display: 'block' }}>
                    <div style={{ fontWeight: 700 }}>
                      {METIN.yeniGrup}: {yeniListe.ozet.yeniGruplar.map((g) => g.ad).join(', ')}
                    </div>
                    <p style={{ margin: '4px 0 0' }}>{METIN.yeniGrupUyari}</p>
                  </div>
                )}

                <div className="satir" style={{ gap: 8, marginTop: 12 }}>
                  <button className="dg dg--ana" onClick={birlestirilmisIndir}>
                    {METIN.indir}
                  </button>
                  <button className="dg" onClick={() => setYeniListe(null)}>
                    {METIN.onizlemeKapat}
                  </button>
                </div>
                <p className="kucuk sonuk" style={{ margin: '6px 0 0' }}>
                  {METIN.indirIpucu}
                </p>
              </div>
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
          <Bos metin={METIN.okunamadi} />
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

      {duzenleyebilir && duzeltmeSayisi > 0 && (
        <button
          className="dg"
          style={{ marginTop: 12 }}
          onClick={() => {
            if (!confirm(METIN.hepsiniGeriAlSoru(duzeltmeSayisi))) return
            parcaDuzeltmeleriSifirla(personel)
            setDuzeltmeler({})
            tazele()
          }}
        >
          {METIN.hepsiniGeriAl}
        </button>
      )}

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
    </>
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
