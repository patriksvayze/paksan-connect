import { useMemo, useState } from 'react'
import { stokGetir } from '../../lib/bayiStok'
import {
  ACIK_DURUMLAR,
  SIPARIS_DURUM,
  bayininSiparisleri,
  siparisAc,
  stokKullan,
} from '../../lib/bayiSiparis'
import { islemYaz } from '../../backoffice/veri'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { PRODUCTS } from '../../data/products'
import { Bolum, Bos } from '../Kabuk'
import { IconParca, IconPlus, IconMinus } from '../../components/Icons'

/* ==========================================================================
   Bayi paneli — stok

   BAYİ STOĞUNU ARTIRAMAZ.

   Ekran önce her kaleme bir sayı kutusu veriyordu; bayi istediği sayıyı
   yazıyordu. Bu, stoğu bayinin kendi defterine çeviriyordu ve PAKSAN'ın
   gönderdiğiyle tutmayınca rakam hiçbir şey anlatmıyordu.

   Doğrusu şu: bayinin elindeki mal, PAKSAN'dan satın aldığı kadardır.

     sipariş ver  →  PAKSAN onaylar  →  hazırlar  →  gönderir  →  stok artar

   Bayi yalnız AZALTIYOR: müşteriye verdiği ya da serviste kullandığı
   parça. Onun için her satırda eksi düğmesi var.

   ÜÇ BÖLÜM: elindeki stok, verdiği siparişler, sipariş verme.
   ========================================================================== */

export function Stok({ oturum }) {
  const [ekran, setEkran] = useState('stok') // 'stok' | 'siparis'
  const [tazele, setTazele] = useState(0)

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

  function dus(kalem) {
    const sonuc = stokKullan(
      oturum.bayiId,
      kalem,
      1,
      'Müşteriye verildi veya serviste kullanıldı',
      oturum.ad,
    )
    if (sonuc.hata) return
    /* Stok hareketi bayinin kendi ekranında zaten duruyor; İşlem
       Kaydı'na da düşüyor ki PAKSAN "bu bayi stoğunu ne zaman
       kullanıyor" sorusuna tek yerden bakabilsin. */
    islemYaz({
      tur: 'stok',
      ozet: `${kalem.ad} · 1 adet düşüldü · kalan ${sonuc.kalan}`,
      personel: oturum.ad,
    })
    setTazele((x) => x + 1)
  }

  return (
    <>
      <p className="ipucu">
        Stoğunuz PAKSAN’dan gelen sevkiyatlarla artıyor. Müşteriye
        verdiğiniz veya serviste kullandığınız parçayı eksi düğmesiyle
        düşün.
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
          Icon={IconParca}
          baslik="Stoğunuz boş görünüyor"
          alt="PAKSAN’a sipariş verdiğinizde, gönderim yapıldığı anda buraya işlenecek."
        />
      ) : (
        <>
          {parcalar.length > 0 && (
            <Bolum ad="Yedek Parça">
              <div className="kart" style={{ padding: '4px 16px' }}>
                {parcalar.map((k) => (
                  <StokSatiri key={k.anahtar} kalem={k} onDus={() => dus(k)} />
                ))}
              </div>
            </Bolum>
          )}

          {makineler.length > 0 && (
            <Bolum ad="Makine">
              <div className="kart" style={{ padding: '4px 16px' }}>
                {makineler.map((k) => (
                  <StokSatiri key={k.anahtar} kalem={k} onDus={() => dus(k)} />
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
    </>
  )
}

/* Sayı solda büyük, eksi düğmesi sağda. Artı düğmesi YOK — bayi
   stoğunu artıramıyor, artış yalnız PAKSAN sevkiyatıyla oluyor. */
function StokSatiri({ kalem, onDus }) {
  const yok = Number(kalem.adet) <= 0
  return (
    <div className="stok-satir">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{kalem.ad}</div>
        {kalem.alt && <div className="kucuk sonuk mono">{kalem.alt}</div>}
      </div>
      <span className={'stok-adet' + (yok ? ' stok-adet--yok' : '')}>
        {kalem.adet}
      </span>
      <button
        className="stok-dus"
        onClick={onDus}
        disabled={yok}
        aria-label={kalem.ad + ' stoğundan bir adet düş'}
      >
        <IconMinus size={19} />
      </button>
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

/* ------------------------------------------------------- Sipariş verme */

function SiparisVer({ oturum, onKapat, onVerildi }) {
  const [adetler, setAdetler] = useState({})
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')

  const kalemler = [
    ...Object.entries(PARCA_FIYAT).map(([ad, b]) => ({
      tur: 'parca',
      anahtar: ad,
      ad,
      alt: b.kod,
    })),
    ...PRODUCTS.map((u) => ({
      tur: 'makine',
      anahtar: u.id,
      ad: u.name,
      alt: u.short || '',
    })),
  ]

  const secili = kalemler
    .map((k) => ({ ...k, adet: Number(adetler[k.tur + ':' + k.anahtar]) || 0 }))
    .filter((k) => k.adet > 0)

  function yaz(k, deger) {
    const temiz = String(deger).replace(/\D/g, '')
    setAdetler((a) => ({ ...a, [k.tur + ':' + k.anahtar]: temiz }))
    setHata('')
  }

  function gonder() {
    const sonuc = siparisAc({
      bayiId: oturum.bayiId,
      bayiAd: oturum.ad,
      bayiNo: oturum.no,
      kalemler: secili,
      not,
    })
    if (sonuc.hata) return setHata(sonuc.hata)
    const adet = secili.reduce((t, k) => t + k.adet, 0)
    islemYaz({
      tur: 'siparis',
      ozet: `${sonuc.siparis.no} · sipariş verildi · ${secili.length} kalem, ${adet} adet`,
      personel: oturum.ad,
    })
    onVerildi()
  }

  return (
    <>
      <p className="ipucu">
        İstediğiniz adetleri yazın. Siparişiniz PAKSAN’a iletilecek;
        onaylanıp gönderildiğinde stoğunuza işlenecek.
      </p>

      <Bolum ad="Yedek Parça">
        <div className="kart" style={{ padding: '4px 16px' }}>
          {kalemler
            .filter((k) => k.tur === 'parca')
            .map((k) => (
              <SiparisSatiri
                key={k.anahtar}
                kalem={k}
                deger={adetler[k.tur + ':' + k.anahtar]}
                onDegis={(v) => yaz(k, v)}
              />
            ))}
        </div>
      </Bolum>

      <Bolum ad="Makine">
        <div className="kart" style={{ padding: '4px 16px' }}>
          {kalemler
            .filter((k) => k.tur === 'makine')
            .map((k) => (
              <SiparisSatiri
                key={k.anahtar}
                kalem={k}
                deger={adetler[k.tur + ':' + k.anahtar]}
                onDegis={(v) => yaz(k, v)}
              />
            ))}
        </div>
      </Bolum>

      <Bolum ad="Not">
        <label className="alan">
          <textarea
            className="gir"
            rows={3}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="PAKSAN’a iletmek istediğiniz bir şey varsa yazın"
          />
        </label>
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={gonder}>
          {secili.length
            ? `Siparişi Gönder · ${secili.length} kalem`
            : 'Siparişi Gönder'}
        </button>
        <button
          className="dg dg--blok"
          style={{ marginTop: 8 }}
          onClick={onKapat}
        >
          Vazgeç
        </button>
      </div>
    </>
  )
}

function SiparisSatiri({ kalem, deger, onDegis }) {
  return (
    <div className="stok-satir">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{kalem.ad}</div>
        {kalem.alt && <div className="kucuk sonuk mono">{kalem.alt}</div>}
      </div>
      <input
        className="gir mono"
        style={{ width: 82, textAlign: 'right' }}
        inputMode="numeric"
        value={deger || ''}
        onChange={(e) => onDegis(e.target.value)}
        placeholder="0"
        aria-label={kalem.ad + ' sipariş adedi'}
      />
    </div>
  )
}
