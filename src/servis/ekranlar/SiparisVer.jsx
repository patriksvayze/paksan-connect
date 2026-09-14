import { useEffect, useMemo, useState } from 'react'
import { cariBakiye, servisParcaSiparisi } from '../../backoffice/veri'
import { servisleriGetir, MARKA, markaEk } from '../../marka'
import {
  KDV_HARIC_LISTE,
  KDV_ORANI,
  PARA_BIRIMI,
  kdvTutari,
  paraYaz,
} from '../../marka'
import {
  gorselAdresi,
  grubunParcalari,
  katalogGetir,
  parcaAra,
  parcaBul,
} from '../../lib/parcaKatalogu'
import { parcaServisFiyati } from '../../lib/servisFiyat'
import { Bolum, Onay } from '../Kabuk'
import {
  IconAlert,
  IconBack,
  IconCheck,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconRight,
  IconSearch,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Servis uygulaması — PAKSAN'a sipariş

   ÜÇ ADIM

     1. SEÇİM   kalemler ve adetler
     2. ONAY    satır satır özet, tutar, teslim yeri, ödeme
     3. SONUÇ   sipariş numarası

   Onay adımı ayrı bir ekran, aynı sayfanın altı değil. Servis ne
   gönderdiğini gördükten sonra gönderiyor; gördüğü şey de siparişin
   kendisi — kalem, adet, birim fiyat, satır tutarı.

   TUTAR BAĞLAYICI DEĞİL ve bu ekranda yazıyor. Fiyat listesi
   göstergedir; siparişi PAKSAN onaylıyor, fatura LOGO'dan çıkıyor.

   SİPARİŞ ARTIK PAKSAN'IN KENDİ KATALOĞUNDAN VERİLİYOR

   Bu ekran bir dönem uydurma bir fiyat tablosundan (30 kalem, sahte
   kodlar) liste kuruyordu. Tablo 12 Eylül 2026'da kaldırıldı; parçanın
   tek kaynağı PAKSAN'ın bastığı yedek parça listesi — 538 parça, 35 alt
   montaj (bkz. lib/parcaKatalogu.js). Liste ekran açılınca ağdan
   iniyor; yükleme ve hata durumları gerçek.

   ANAHTAR AD DEĞİL KOD. Katalogda ad tekil değil, aynı ad birden fazla
   montajda geçiyor. Seçim, sepet ve sipariş satırları bu yüzden kodla
   taşınıyor; ad yalnız ekranda okunan yazı.

   PARÇA SEÇİMİYLE AYNI YOL: ÖNCE MONTAJ, SONRA PARÇA

   538 parça tek listede gösterilemez. Servis kaydındaki parça seçimi
   (bkz. ekranlar/ParcaSec.jsx) bu işi alt montajlara bölerek çözüyor ve
   servis o ekranı zaten kullanıyor. Sipariş ekranı ayrı bir düzen
   kurmuyor: aynı grup listesi, aynı arama kutusu, aynı sıra — fiyat
   listesinin sırası. Arama kestirme, asıl yol montaj listesi.

   FİYAT SERVİSİN ÖDEDİĞİ FİYAT. Katalogdaki tutar tavsiye satış
   fiyatı; satırda görünen ve toplanan, onun iskontolu hâli
   (bkz. lib/servisFiyat.js).

   ADET KUTUYA YAZILMIYOR, DÜĞMEYLE SAYILIYOR

   Her satırın sağında bir yazı kutusu vardı ve servis oraya rakam
   yazıyordu. Tarlada, eldivenle, tek elle kullanılan bir uygulamada
   sayı klavyesi açıp "2" yazmak, iki dokunuşluk bir işi beş dokunuşa
   çıkarıyordu. Satırlar da seçili olup olmadıklarını söylemiyordu.
   Şimdi servis kaydındaki parça seçimiyle aynı kalıp kullanılıyor:
   kutucuk, ad, artı-eksi.

   İSTENEN TESLİM TARİHİ KALDIRILDI

   Soruluyordu ve hiçbir yere bağlanmıyordu — ne sevkiyat planına ne
   kapanış formuna giriyordu. Cevabı hiçbir şeyi değiştirmeyen bir
   soru, formu uzatmaktan başka iş yapmaz.

   YERİNE ÖDEME BİÇİMİ GELDİ

   Servis cari hesaplı bir iş ortağı: PAKSAN ona hak ediş borçlu.
   Bakiyesi siparişi karşılıyorsa bedelin oradan düşülmesini
   isteyebiliyor. Yetmiyorsa seçenek kapalı ve KAÇ LİRA EKSİK OLDUĞU
   yazıyor — kapalı bir düğme sebebini söylemeden durmaz.

   Para bu ekranda işlenmiyor: sipariş henüz onaylanmadı ve tutar
   bağlayıcı değil. Düşüm, parça kargoya verilip talep kapandığında
   yapılıyor (bkz. backoffice/veri.js → talepKapat).

   SİPARİŞ AYRI BİR DEFTERE DEĞİL, TALEPLER'E DÜŞÜYOR

   Önce kendi deposu ve backoffice'te kendi ekranı vardı. Kaldırıldı:
   yedek parça personeli gününü Talepler ekranında geçiriyor ve
   servisin siparişi oraya hiç düşmüyordu. Artık sipariş normal bir
   yedek parça talebi — aynı liste, aynı durumlar, aynı kapanış
   (bkz. backoffice/veri.js → servisParcaSiparisi).

   SİPARİŞİN İÇİNE FİYAT ANLIK GÖRÜNTÜSÜ YAZILIYOR

   Fiyat listesi değişiyor. Altı ay sonra bu siparişe bakan personel o
   günün fiyatını değil, siparişin verildiği günün fiyatını görmeli.
   Bu yüzden satırlar, katalog sürümü ve kaynağı kaydın içine
   gönderiliyor (`parcaFiyat`). Tutarlar servisin ödediği iskontolu
   fiyattan; kaydın canlı katalogla yeniden hesaplanması gerekmiyor.
   ========================================================================== */

export function SiparisVer({ oturum, onKapat, onVerildi }) {
  const [adim, setAdim] = useState('secim')
  /* Seçim kod → adet. Ad anahtar olarak kullanılmıyor: katalogda
     tekrar eden adlar var, ikisi tek satıra düşerdi. */
  const [adetler, setAdetler] = useState({})
  const [arama, setArama] = useState('')
  const [not, setNot] = useState('')
  const [odeme, setOdeme] = useState('fatura')
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [siparis, setSiparis] = useState(null)

  /* Katalog ağdan iniyor; üç hâl de gerçek. Servis kaydındaki parça
     seçimiyle aynı yükleme ve hata yüzeyi kullanılıyor. */
  const [durum, setDurum] = useState('yukleniyor')
  const [katalog, setKatalog] = useState(null)
  const [grup, setGrup] = useState(null)

  useEffect(() => {
    let gecerli = true
    setDurum('yukleniyor')
    katalogGetir()
      .then((k) => {
        if (!gecerli) return
        setKatalog(k)
        setDurum('hazir')
      })
      .catch(() => gecerli && setDurum('hata'))
    return () => {
      gecerli = false
    }
  }, [])

  const servis = useMemo(
    () => servisleriGetir().find((b) => b.id === oturum.servisId) || null,
    [oturum.servisId],
  )

  const bakiye = useMemo(() => cariBakiye(oturum.servisId), [oturum.servisId, adim])

  /* Teslim adresi servisin kayıtlı adresiyle doluyor ama kilitli değil:
     sevkiyat bazen doğrudan müşterinin tarlasına gidiyor. */
  const [teslimat, setTeslimat] = useState(() =>
    servis ? [servis.adres, servis.ilce, servis.il].filter(Boolean).join(', ') : '',
  )

  /* Sepet. Sıra, seçim sırası: servis en son dokunduğu parçayı özetin
     sonunda bulur. Fiyat katalogdan değil `parcaServisFiyati`den
     geliyor — servis iskontolu fiyatı ödüyor. */
  const secili = useMemo(() => {
    const liste = []
    for (const [kod, ham] of Object.entries(adetler)) {
      const adet = Number(ham) || 0
      if (adet <= 0) continue
      const parca = parcaBul(katalog, kod)
      const f = parcaServisFiyati(parca)
      liste.push({
        kod,
        ad: parca?.ad || kod,
        grup: parca?.grup || null,
        adet,
        birimFiyat: f ? f.alis : null,
        satirTutari: f ? f.alis * adet : null,
      })
    }
    return liste
  }, [katalog, adetler])

  const hesap = useMemo(() => {
    let araToplam = 0
    let eksik = false
    for (const k of secili) {
      if (k.satirTutari === null) eksik = true
      else araToplam += k.satirTutari
    }
    const kdv = kdvTutari(araToplam)
    return { araToplam, kdv, toplam: araToplam + kdv, eksik }
  }, [secili])

  /* Bakiye siparişin KDV dâhil tutarını karşılıyor mu? Karşılamıyorsa
     seçenek kapalı ve farkı yazıyor. */
  const bakiyeYeter = bakiye >= hesap.toplam && hesap.toplam > 0
  const eksikTutar = Math.max(0, hesap.toplam - bakiye)

  function adetDegistir(kod, fark) {
    setAdetler((a) => {
      const simdiki = Number(a[kod]) || 0
      const yeni = Math.max(0, simdiki + fark)
      const sonraki = { ...a }
      if (yeni > 0) sonraki[kod] = yeni
      else delete sonraki[kod]
      return sonraki
    })
    setHata('')
  }

  function gonder() {
    setOnay(false)
    if (!teslimat.trim()) return setHata('Teslim adresini yazın.')

    const sonuc = servisParcaSiparisi({
      servisId: oturum.servisId,
      servisAd: oturum.ad,
      servisNo: oturum.no,
      servisTel: servis?.tel || '',
      il: servis?.il || '',
      ilce: servis?.ilce || '',
      /* Kalem satırında artık kod da var: talebi okuyan taraf parçayı
         adıyla değil koduyla buluyor. */
      kalemler: secili.map((k) => ({
        kod: k.kod,
        ad: k.ad,
        adet: k.adet,
        birimFiyat: k.birimFiyat,
        satirTutari: k.satirTutari,
      })),
      /* Fiyat anlık görüntüsü: sipariş anındaki satırlar, katalog
         sürümü ve kaynağı. Tutarlar servisin ödediği iskontolu
         fiyattan — liste fiyatından değil. */
      parcaFiyat: {
        surum: katalog?.surum ?? null,
        kaynak: katalog?.kaynak || null,
        satirlar: secili.map((k) => ({
          kod: k.kod,
          ad: k.ad,
          adet: k.adet,
          birimFiyat: k.birimFiyat,
          tutar: k.satirTutari,
        })),
        araToplam: hesap.araToplam,
        kdv: hesap.kdv,
        toplam: hesap.toplam,
        eksikFiyat: hesap.eksik,
      },
      not,
      teslimat,
      odeme: bakiyeYeter ? odeme : 'fatura',
      tutar: hesap.araToplam,
      tutarKdvli: hesap.toplam,
    })
    if (sonuc.hata) return setHata(sonuc.hata)

    setSiparis(sonuc.talep)
    setAdim('sonuc')
  }

  if (adim === 'sonuc' && siparis) {
    return <Sonuc siparis={siparis} hesap={hesap} onBitir={onVerildi} />
  }

  if (adim === 'onay') {
    return (
      <>
        <Ozet
          secili={secili}
          hesap={hesap}
          teslimat={teslimat}
          onTeslimat={setTeslimat}
          not={not}
          onNot={setNot}
          odeme={bakiyeYeter ? odeme : 'fatura'}
          onOdeme={setOdeme}
          bakiye={bakiye}
          bakiyeYeter={bakiyeYeter}
          eksikTutar={eksikTutar}
          hata={hata}
          onGeri={() => {
            setAdim('secim')
            setHata('')
          }}
          onVer={() => {
            if (!teslimat.trim()) return setHata('Teslim adresini yazın.')
            setHata('')
            setOnay(true)
          }}
          onSil={(k) => adetDegistir(k.kod, -k.adet)}
        />

        {onay && (
          <Onay
            baslik={`Sipariş ${markaEk('a')} gidecek`}
            metin={`${MARKA} yedek parça birimi siparişi görecek ve hazırlayacak. Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.`}
            /* Sipariş onayında listenin kendisi duruyor, sayısı değil.
               "3 tür · 7 adet" satırı neyin sipariş edildiğini
               söylemiyordu; yanlış adet ancak parça geldiğinde fark
               ediliyordu. */
            parcalar={secili.map((k) => ({ kod: k.kod, ad: k.ad, adet: k.adet }))}
            kalemler={[
              { ad: 'Tutar', deger: `${paraYaz(hesap.toplam)} ${PARA_BIRIMI}` },
              {
                ad: 'Ödeme',
                deger:
                  bakiyeYeter && odeme === 'bakiye'
                    ? 'Bakiyemden düşülsün'
                    : 'Faturayla',
              },
            ]}
            dugme="Sipariş Ver"
            onOnayla={gonder}
            onVazgec={() => setOnay(false)}
          />
        )}
      </>
    )
  }

  return (
    <Secim
      durum={durum}
      katalog={katalog}
      grup={grup}
      onGrup={setGrup}
      adetler={adetler}
      arama={arama}
      onArama={setArama}
      onAdet={adetDegistir}
      secili={secili}
      hesap={hesap}
      onKapat={onKapat}
      onDevam={() => setAdim('onay')}
      onTekrar={() => {
        setDurum('yukleniyor')
        yenidenDene(setDurum, setKatalog)
      }}
    />
  )
}

/* Yeniden deneme: bellekteki hata zaten silinmiş oluyor
   (bkz. lib/parcaKatalogu.js), tek yapılacak yeni bir istek. */
function yenidenDene(setDurum, setKatalog) {
  katalogGetir()
    .then((k) => {
      setKatalog(k)
      setDurum('hazir')
    })
    .catch(() => setDurum('hata'))
}

/* -------------------------------------------------------------- 1. Seçim */

function Secim({
  durum,
  katalog,
  grup,
  onGrup,
  adetler,
  arama,
  onArama,
  onAdet,
  secili,
  hesap,
  onKapat,
  onDevam,
  onTekrar,
}) {
  const aranan = arama.trim()
  const aramaAcik = aranan.length >= 2
  const sonuclar = useMemo(() => parcaAra(katalog, arama), [katalog, arama])

  /* Listelenen parçalar: arama varsa sonuçlar, yoksa seçili montajın
     parçaları. Hiçbiri yoksa ekranda montaj listesi duruyor. */
  const listelenen = aramaAcik
    ? sonuclar
    : grup
      ? grubunParcalari(katalog, grup.id)
      : []

  const adetToplam = secili.reduce((t, k) => t + k.adet, 0)

  return (
    <>
      <p className="ipucu">
        Almak istediğiniz parçaları seçin. Bir sonraki adımda özeti
        görecek ve siparişi vereceksiniz.
      </p>

      {durum === 'yukleniyor' && <Yukleniyor />}
      {durum === 'hata' && <Hata onTekrar={onTekrar} />}

      {durum === 'hazir' && (
        <>
          <label className="ara-kutu">
            <IconSearch size={18} />
            <input
              className="gir"
              value={arama}
              onChange={(e) => onArama(e.target.value)}
              placeholder="Parça adı veya kodu"
              aria-label="Parça ara"
            />
          </label>

          {/* Montaj listesi: arama boşken ve bir montaj seçilmemişken.
              Sıra katalogdan geliyor, yani basılı fiyat listesinin
              sırası; sağdaki sayı o montajda kaç parça olduğunu
              söylüyor. */}
          {!grup && !aranan && (
            <div className="montaj-liste">
              {(katalog?.gruplar || []).map((g) => (
                <button key={g.id} className="montaj" onClick={() => onGrup(g)}>
                  <span className="montaj__ad">{g.ad}</span>
                  <span className="montaj__sayi">{g.adet}</span>
                  <IconRight size={18} />
                </button>
              ))}
            </div>
          )}

          {(grup || aramaAcik) && (
            <>
              {/* Montaja girildiğinde geri dönüş yolu ekranda duruyor:
                  sayfanın geri düğmesi siparişin tamamından çıkıyor,
                  servisin istediği ise bir üst kademe. */}
              {grup && !aranan && (
                <button
                  className="dg dg--blok"
                  style={{ marginBottom: 12 }}
                  onClick={() => onGrup(null)}
                >
                  <IconBack size={17} />
                  Bölüm Listesine Dön
                </button>
              )}

              {aramaAcik && (
                <p className="ipucu">
                  “{aranan}” için {listelenen.length} parça bulundu.
                </p>
              )}

              {listelenen.length === 0 ? (
                <p className="kucuk sonuk">Eşleşen parça yok.</p>
              ) : (
                <Bolum ad={grup && !aranan ? grup.ad : 'Yedek Parça'}>
                  <div className="parca-liste">
                    {listelenen.map((p) => (
                      <SecimSatiri
                        key={p.kod}
                        parca={p}
                        adet={Number(adetler[p.kod]) || 0}
                        onAdet={(fark) => onAdet(p.kod, fark)}
                      />
                    ))}
                  </div>
                </Bolum>
              )}
            </>
          )}
        </>
      )}

      <div className="yapisik">
        {secili.length > 0 && (
          <div className="siparis-toplam">
            <span>
              {secili.length} parça türü · {adetToplam} adet
            </span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
            {KDV_HARIC_LISTE && <small>KDV hariç</small>}
          </div>
        )}
        <button
          className="dg dg--ana dg--blok"
          onClick={onDevam}
          disabled={!secili.length}
        >
          Devam
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onKapat}>
          Vazgeç
        </button>
      </div>
    </>
  )
}

/* Satırın tamamı dokunma hedefi: seçilmemişken bir kez dokunmak bir
   adet ekliyor. Servis kaydındaki parça satırıyla aynı iskelet.

   Küçük görsel fiyat listesindeki resmin kendisi: sahadaki usta
   parçayı adıyla değil resmiyle ve koduyla tanıyor. Tek başına anlam
   taşımıyor, yanında kod ve ad duruyor. */
function SecimSatiri({ parca, adet, onAdet }) {
  const f = parcaServisFiyati(parca)
  const secili = adet > 0
  const adres = gorselAdresi(parca.gorsel)

  return (
    <div className={'parca-satir' + (secili ? ' parca-satir--on' : '')}>
      <button
        className="parca-satir__ac"
        onClick={() => onAdet(secili ? -adet : 1)}
        aria-pressed={secili}
      >
        <span className="parca-kutucuk">{secili && <IconCheck size={15} />}</span>
        {adres && (
          /* Bir montajda otuz satır olabiliyor; hepsini birden
             indirmek tarlada zayıf şebekede ekranı kilitler. */
          <img
            src={adres}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              flex: 'none',
              width: 44,
              height: 44,
              objectFit: 'contain',
              borderRadius: 6,
            }}
          />
        )}
        <span className="parca-satir__ad">
          {parca.ad}
          <span className="parca-satir__fiyat">
            <span className="mono">{parca.kod}</span>
            {f ? ` · ${paraYaz(f.alis)} ${PARA_BIRIMI}` : ''}
          </span>
        </span>
      </button>

      {secili && (
        <div className="parca-satir__adet">
          <button
            className="stok-dus"
            onClick={() => onAdet(-1)}
            aria-label={parca.ad + ' adedini azalt'}
          >
            <IconMinus size={19} />
          </button>
          <span className="parca-satir__sayi">{adet}</span>
          <button
            className="stok-dus"
            onClick={() => onAdet(1)}
            aria-label={parca.ad + ' adedini artır'}
          >
            <IconPlus size={19} />
          </button>
        </div>
      )}
    </div>
  )
}

/* Yükleme sırasında kartların iskeleti duruyor: boş bir ekran
   "bir şey yok" der, iskelet "geliyor" der. Servis kaydındaki parça
   seçimiyle birebir aynı yüzey. */
function Yukleniyor() {
  return (
    <>
      <p className="ipucu">Parça listesi {MARKA} sunucusundan yükleniyor…</p>
      <div className="parca-izgara">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="parca-kart parca-kart--iskelet">
            <span className="parca-kart__resim" />
            <span className="iskelet-satir iskelet-satir--kisa" />
            <span className="iskelet-satir" />
            <span className="iskelet-satir iskelet-satir--kisa" />
          </div>
        ))}
      </div>
    </>
  )
}

function Hata({ onTekrar }) {
  return (
    <div className="not not--turuncu">
      <IconAlert size={19} />
      <div>
        <strong>Parça listesi yüklenemedi</strong>
        <p>
          Liste {MARKA} sunucusundan geliyor. Bağlantınızı kontrol edip
          yeniden deneyin.
        </p>
        <button className="dg dg--ana dg--blok" style={{ marginTop: 12 }} onClick={onTekrar}>
          Yeniden Dene
        </button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- 2. Özet */

function Ozet({
  secili,
  hesap,
  teslimat,
  onTeslimat,
  not,
  onNot,
  odeme,
  onOdeme,
  bakiye,
  bakiyeYeter,
  eksikTutar,
  hata,
  onGeri,
  onVer,
  onSil,
}) {
  return (
    <>
      <p className="ipucu">
        Siparişinizi vermeden önce kontrol edin. Satırı kaldırmak için
        çöp kutusuna dokunun.
      </p>

      <Bolum ad="Sipariş Özeti" sayi={secili.length}>
        <div className="kart" style={{ padding: '4px 16px' }}>
          {secili.map((k) => (
            <div key={k.kod} className="ozet-kalem">
              <div className="ozet-kalem__ad">
                <div>{k.ad}</div>
                <div className="kucuk sonuk">
                  <span className="mono">{k.kod}</span> · {k.adet} ×{' '}
                  {k.birimFiyat === null
                    ? 'Fiyat bilgisi yok'
                    : `${paraYaz(k.birimFiyat)} ${PARA_BIRIMI}`}
                </div>
              </div>
              <div className="ozet-kalem__tutar">
                {k.satirTutari === null ? '—' : paraYaz(k.satirTutari)}
              </div>
              <button
                className="ozet-kalem__sil"
                onClick={() => onSil(k)}
                aria-label={k.ad + ' satırını kaldır'}
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="fiyat-kart" style={{ marginTop: 12 }}>
          <div className="urun-kart__satir">
            <span>Ara toplam</span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
          </div>
          {/* KDV satırı yalnız liste fiyatı KDV hariçse görünüyor;
              kararın gerekçesi marka/katalog/para.js içinde. */}
          {KDV_HARIC_LISTE && (
            <div className="urun-kart__satir">
              <span>KDV %{Math.round(KDV_ORANI * 100)}</span>
              <strong>
                {paraYaz(hesap.kdv)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          <div className="urun-kart__satir urun-kart__satir--vurgu">
            <span>Genel toplam</span>
            <strong>
              {paraYaz(hesap.toplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__dip">
            {hesap.eksik
              ? 'Fiyatı listede olmayan parça var; gösterilen toplam eksik. '
              : ''}
            Tutar fiyat listesinden hesaplandı; kesin tutar faturada belirlenir.
          </div>
        </div>
      </Bolum>

      {/* ÖDEME BİÇİMİ.

          Bakiye yetmiyorsa seçenek kapalı ve farkı yazıyor. Kapalı
          düğmenin yanında sebebi yoksa kullanıcı ona bir daha
          dokunuyor ve hiçbir şey olmuyor. */}
      <Bolum ad="Ödeme">
        <div className="secenek">
          <button
            className={'buyuk-sec' + (odeme === 'fatura' ? ' buyuk-sec--on' : '')}
            onClick={() => onOdeme('fatura')}
          >
            <span className="buyuk-sec__ad">Faturayla</span>
            <span className="buyuk-sec__alt">
              {MARKA} faturayı gönderecek. Ödeme ay sonu hesaplaşmasında
              yapılacak.
            </span>
          </button>

          <button
            className={
              'buyuk-sec' +
              (odeme === 'bakiye' ? ' buyuk-sec--on' : '') +
              (bakiyeYeter ? '' : ' buyuk-sec--kapali')
            }
            disabled={!bakiyeYeter}
            onClick={() => onOdeme('bakiye')}
          >
            <span className="buyuk-sec__ad">Bakiyemden Düşülsün</span>
            <span className="buyuk-sec__alt">
              {bakiyeYeter
                ? `Bakiyeniz ${paraYaz(bakiye)} ${PARA_BIRIMI}. Parça gönderildiğinde tutar bakiyenizden düşülecek.`
                : `Bakiyeniz ${paraYaz(bakiye)} ${PARA_BIRIMI}; ${paraYaz(eksikTutar)} ${PARA_BIRIMI} eksik.`}
            </span>
          </button>
        </div>
      </Bolum>

      <Bolum ad="Teslimat">
        <label className="alan">
          <span className="alan__ad">Teslim Adresi</span>
          <textarea
            className="gir"
            rows={2}
            value={teslimat}
            onChange={(e) => onTeslimat(e.target.value)}
            placeholder="Sevkiyatın gideceği adres"
          />
        </label>
      </Bolum>

      {/* NOT ZORUNLU DEĞİL ve bunu etiketin kendisi söylüyor. Boş
          bırakılabileceği yazmıyorsa kullanıcı doldurmak zorunda
          olduğunu sanıyor. */}
      <Bolum ad="Not">
        <label className="alan">
          <span className="alan__ad">Not (isteğe bağlı)</span>
          <textarea
            className="gir"
            rows={3}
            value={not}
            onChange={(e) => onNot(e.target.value)}
            placeholder={`${markaEk('a')} iletmek istediğiniz bir şey varsa yazın`}
          />
        </label>
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={onVer}>
          Sipariş Ver
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onGeri}>
          Geri
        </button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- 3. Sonuç */

function Sonuc({ siparis, hesap, onBitir }) {
  const adet = Object.values(siparis.parcaAdet || {}).reduce((t, n) => t + Number(n), 0)

  return (
    <div className="siparis-sonuc">
      <IconCheckCircle size={54} />
      <h2>Siparişiniz {markaEk('a')} İletildi</h2>
      <p className="mono siparis-sonuc__no">{siparis.no}</p>
      <p className="kucuk sonuk">
        {(siparis.parcalar || []).length} kalem · {adet} adet ·{' '}
        {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
        {KDV_HARIC_LISTE ? ' (KDV hariç)' : ''}
      </p>
      <p className="kucuk sonuk">
        Siparişin durumunu Parça bölümünden takip edebilirsiniz. {MARKA}{' '}
        onayladığında haberdar olacaksınız.
      </p>
      <button className="dg dg--ana dg--blok" onClick={onBitir}>
        Tamam
      </button>
    </div>
  )
}
