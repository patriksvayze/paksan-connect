import { useMemo, useState } from 'react'
import { stokGetir } from '../../lib/bayiStok'
import {
  ACIK_DURUMLAR,
  SIPARIS_DURUM,
  bayininSiparisleri,
  geriAlinabilir,
  stokGeriAl,
  stokKullan,
} from '../../lib/bayiSiparis'
import { islemYaz } from '../../backoffice/veri'
import { PARA_BIRIMI, PARCA_FIYAT, paraYaz } from '../../data/parcaFiyat'
import { PRODUCTS } from '../../data/products'
import { makineFiyati, parcaBayiFiyati } from '../../lib/bayiFiyat'
import { Bolum, Bos } from '../Kabuk'
import { SiparisVer } from './SiparisVer'
import { IconPlus, IconMinus, IconRight, IconUndo } from '../../components/Icons'
import bosStokGorseli from '../../assets/gorseller/bayi-bos-stok.png'

/* ==========================================================================
   Bayi paneli — stok

   BAYİ STOKUNU ARTIRAMAZ.

   Ekran önce her kaleme bir sayı kutusu veriyordu; bayi istediği sayıyı
   yazıyordu. Bu, stoku bayinin kendi defterine çeviriyordu ve PAKSAN'ın
   gönderdiğiyle tutmayınca rakam hiçbir şey anlatmıyordu.

   Doğrusu şu: bayinin elindeki mal, PAKSAN'dan satın aldığı kadardır.

     sipariş ver  →  PAKSAN onaylar  →  hazırlar  →  gönderir  →  stok artar

   Bayi yalnız AZALTIYOR: müşteriye verdiği ya da serviste kullandığı
   parça.

   DÜŞÜŞ ÜÇ ADIMDA

   Önce eksi düğmesi tek dokunuşta bir adet düşürüyordu: onay yok, geri
   dönüş yok, artırma da olmadığı için yanlış basış kalıcıydı. On adet
   düşürmek on kez basmak demekti; ellinci dokunuşta kaçıncı olduğunu
   kimse bilmiyordu.

     1. Bayi adedi yazıyor (1, 5, 10…)
     2. Düşür düğmesine basıyor
     3. Onay penceresi ne düşeceğini ve kaç kalacağını gösteriyor

   Onaydan sonra da satırda "Geri al" çıkıyor. Ne zaman çıktığı ve
   neden sınırlı olduğu `bayiSiparis.js` içinde yazılı: yanlış rakamı
   düzeltmek için var, stok artırma yolu değil.

   ÜÇ BÖLÜM: elindeki stok, verdiği siparişler, sipariş verme.
   ========================================================================== */

/** Kalemin bayi fiyatı; makinede iskonto bayiye göre değişiyor. */
function kalemFiyati(kalem, oturum) {
  return kalem.tur === 'makine'
    ? makineFiyati(kalem.anahtar, oturum)
    : parcaBayiFiyati(kalem.anahtar)
}

export function Stok({ oturum }) {
  const [ekran, setEkran] = useState('stok') // 'stok' | 'siparis'
  const [tazele, setTazele] = useState(0)
  /* Onay bekleyen düşüş: { kalem, adet } */
  const [onay, setOnay] = useState(null)

  const stok = useMemo(() => stokGetir(oturum.bayiId), [oturum.bayiId, tazele])
  const siparisler = useMemo(
    () => bayininSiparisleri(oturum.bayiId),
    [oturum.bayiId, tazele],
  )
  const acikSiparis = siparisler.filter((s) => ACIK_DURUMLAR.includes(s.durum))

  if (ekran === 'siparis') {
    return (
      <SiparisVer
        oturum={oturum}
        onKapat={() => setEkran('stok')}
        onVerildi={() => {
          setEkran('stok')
          setTazele((x) => x + 1)
        }}
      />
    )
  }

  const parcalar = Object.entries(PARCA_FIYAT)
    .map(([ad, bilgi]) => ({ tur: 'parca', anahtar: ad, ad, alt: bilgi.kod, adet: stok.parca[ad] }))
    .filter((k) => k.adet !== undefined)
  const makineler = PRODUCTS.map((u) => ({
    tur: 'makine',
    anahtar: u.id,
    ad: u.name,
    alt: u.short || '',
    adet: stok.makine[u.id],
  })).filter((k) => k.adet !== undefined)

  const bosMu = !parcalar.length && !makineler.length

  function dus() {
    const { kalem, adet } = onay
    const sonuc = stokKullan(
      oturum.bayiId,
      kalem,
      adet,
      'Müşteriye verildi veya serviste kullanıldı',
      oturum.ad,
    )
    setOnay(null)
    if (sonuc.hata) return
    /* Stok hareketi bayinin kendi ekranında zaten duruyor; İşlem
       Kaydı'na da düşüyor ki PAKSAN "bu bayi stokunu ne zaman
       kullanıyor" sorusuna tek yerden bakabilsin. */
    islemYaz({
      tur: 'stok',
      ozet: `${kalem.ad} · ${adet} adet düşüldü · kalan ${sonuc.kalan}`,
      personel: oturum.ad,
    })
    setTazele((x) => x + 1)
  }

  function geriAl(hareket, kalem) {
    const sonuc = stokGeriAl(oturum.bayiId, hareket.id, oturum.ad)
    if (sonuc.hata) return
    const adet = hareket.kalemler?.[0]?.adet || 0
    islemYaz({
      tur: 'stok',
      ozet: `${kalem.ad} · ${adet} adet düşüş geri alındı`,
      personel: oturum.ad,
    })
    setTazele((x) => x + 1)
  }

  return (
    <>
      <p className="ipucu">
        Stokunuz PAKSAN’dan gelen sevkiyatlarla artıyor. Müşteriye
        verdiğiniz veya serviste kullandığınız parçayı eksi düğmesiyle
        düşürün.
      </p>

      {acikSiparis.length > 0 && (
        <Bolum ad="Yoldaki Sipariş" sayi={acikSiparis.length}>
          {acikSiparis.map((s) => (
            <SiparisKarti key={s.id} siparis={s} />
          ))}
        </Bolum>
      )}

      {bosMu ? (
        <Bos
          gorsel={bosStokGorseli}
          baslik="Stokunuz Boş Görünüyor"
          alt="PAKSAN’a verdiğiniz siparişler sevk edildiğinde stokunuza işlenecek."
        />
      ) : (
        <>
          {parcalar.length > 0 && (
            <Bolum ad="Yedek Parça">
              <div className="kart" style={{ padding: '4px 16px' }}>
                <StokBasliklari />
                {parcalar.map((k) => (
                  <StokSatiri
                    key={k.anahtar}
                    kalem={k}
                    fiyat={kalemFiyati(k, oturum)}
                    bayiId={oturum.bayiId}
                    tazele={tazele}
                    onDus={(adet) => setOnay({ kalem: k, adet })}
                    onGeriAl={(h) => geriAl(h, k)}
                  />
                ))}
              </div>
            </Bolum>
          )}

          {makineler.length > 0 && (
            <Bolum ad="Makine">
              <div className="kart" style={{ padding: '4px 16px' }}>
                {makineler.map((k) => (
                  <StokSatiri
                    key={k.anahtar}
                    kalem={k}
                    fiyat={kalemFiyati(k, oturum)}
                    bayiId={oturum.bayiId}
                    tazele={tazele}
                    onDus={(adet) => setOnay({ kalem: k, adet })}
                    onGeriAl={(h) => geriAl(h, k)}
                  />
                ))}
              </div>
            </Bolum>
          )}
        </>
      )}

      {siparisler.length > acikSiparis.length && (
        <Bolum ad="Geçmiş Sipariş">
          {siparisler
            .filter((s) => !ACIK_DURUMLAR.includes(s.durum))
            .slice(0, 10)
            .map((s) => (
              <SiparisKarti key={s.id} siparis={s} />
            ))}
        </Bolum>
      )}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={() => setEkran('siparis')}>
          <IconPlus size={19} />
          PAKSAN’a Sipariş Ver
        </button>
      </div>

      {onay && (
        <DusOnayi
          kalem={onay.kalem}
          adet={onay.adet}
          onOnayla={dus}
          onVazgec={() => setOnay(null)}
        />
      )}
    </>
  )
}

/* SÜTUN BAŞLIKLARI.

   Satırda başlıksız iki sayı yan yana duruyordu: kalın bir "12", onun
   yanında içi boş bir kutu, onun yanında eksi düğmesi. Hangisinin
   eldeki stok, hangisinin yazılacak adet olduğu yalnız deneyerek
   anlaşılıyordu. İki kelime, ekranın tamamını okunur yapıyor.

   Listenin başında bir kez yazılıyor, her satırda değil: on kalemlik
   bir listede on kez tekrarlanan etiket gürültüdür. */
function StokBasliklari() {
  return (
    <div className="stok-satir stok-satir--dus stok-satir--baslik">
      <span className="stok-basi stok-basi--adet">Elinizde</span>
      <span className="stok-basi stok-basi--giris">Düşülecek</span>
    </div>
  )
}

/* Eldeki sayı solda, düşülecek adet sağda. Artı düğmesi YOK — bayi
   stokunu artıramıyor, artış yalnız PAKSAN sevkiyatıyla oluyor.

   Adet kutusu boşken düğme kapalı: boş kutuyla basılan bir düşüş "bir
   adet mi, hiç mi" belirsizliği yaratıyordu. */
function StokSatiri({ kalem, fiyat, bayiId, tazele, onDus, onGeriAl }) {
  const [adet, setAdet] = useState('')
  const yok = Number(kalem.adet) <= 0
  const sayi = Number(adet)
  const gecerli = Number.isFinite(sayi) && sayi >= 1 && sayi <= Number(kalem.adet)

  /* `tazele` her düşüşte artıyor; geri alma penceresi o an yeniden
     hesaplanıyor. Saniye saniye sayan bir zamanlayıcı kurulmadı —
     ekranda duran bir düğmenin bir dakika fazla durması sorun değil,
     basıldığında zaten süre yeniden denetleniyor. */
  const geri = useMemo(
    () => geriAlinabilir(bayiId, kalem),
    [bayiId, kalem.anahtar, kalem.tur, tazele],
  )

  return (
    <div className="stok-satir stok-satir--dus">
      <div className="stok-satir__ad">
        <div>{kalem.ad}</div>
        <div className="kucuk sonuk">
          {kalem.alt && <span className="mono">{kalem.alt}</span>}
          {kalem.alt && fiyat ? ' · ' : ''}
          {fiyat ? `${paraYaz(fiyat.alis)} ${PARA_BIRIMI}` : ''}
        </div>
      </div>

      <span className={'stok-adet' + (yok ? ' stok-adet--yok' : '')}>
        {kalem.adet}
      </span>

      <input
        className="gir mono stok-giris"
        inputMode="numeric"
        value={adet}
        onChange={(e) => setAdet(e.target.value.replace(/\D/g, ''))}
        placeholder="0"
        disabled={yok}
        aria-label={kalem.ad + ' için düşülecek adet'}
      />

      <button
        className="stok-dus"
        onClick={() => { onDus(sayi); setAdet('') }}
        disabled={!gecerli}
        aria-label={kalem.ad + ' stokundan düş'}
      >
        <IconMinus size={19} />
      </button>

      {geri && (
        <button className="stok-geri" onClick={() => onGeriAl(geri)}>
          <IconUndo size={16} />
          Geri Al · {geri.kalemler?.[0]?.adet} adet
        </button>
      )}
    </div>
  )
}

/* Düşüşten önceki son duruş.

   Stok geri alınabiliyor ama yalnız on dakika ve yalnız bir kez; asıl
   koruma burada, kalıcı olmadan önce. Pencere ne düşeceğini VE kaç
   kalacağını yazıyor — bayinin kafasındaki hesabı ekranda görmesi için. */
function DusOnayi({ kalem, adet, onOnayla, onVazgec }) {
  const kalan = Number(kalem.adet) - adet
  return (
    <div className="pencere-bayi" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="pencere-bayi__kart">
        <h2>Stoktan Düşür</h2>
        <p>
          <b>{kalem.ad}</b> stokunuzdan <b>{adet} adet</b> düşülecek.
        </p>
        <div className="dus-ozet">
          <span>{kalem.adet}</span>
          <IconRight size={18} />
          <span className={kalan === 0 ? 'stok-adet--yok' : ''}>{kalan}</span>
        </div>
        <p className="kucuk sonuk">
          Yanlışlıkla stoktan düşerseniz on dakika içinde geri
          alabilirsiniz.
        </p>
        <button className="dg dg--ana dg--blok" onClick={onOnayla}>
          Düş
        </button>
        <button className="dg dg--blok" style={{ marginTop: 8 }} onClick={onVazgec}>
          Vazgeç
        </button>
      </div>
    </div>
  )
}

function SiparisKarti({ siparis }) {
  const d = SIPARIS_DURUM[siparis.durum] || SIPARIS_DURUM.yeni
  const adet = siparis.kalemler.reduce((t, k) => t + Number(k.adet), 0)
  return (
    <div className="siparis">
      <div className="siparis__ust">
        <span className={'rz rz--' + d.ton}>{d.ad}</span>
        <span className="mono kucuk sonuk">{siparis.no}</span>
      </div>
      <div className="kucuk">
        {siparis.kalemler.length} kalem · {adet} adet
      </div>
      {siparis.kargo?.takipNo && (
        <div className="kucuk sonuk">
          {siparis.kargo.firma || 'Kargo'} · {siparis.kargo.takipNo}
        </div>
      )}
    </div>
  )
}

