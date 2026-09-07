import { useMemo, useState } from 'react'
import { TEKLIF_SONUC, kalanGun, teklifleriGetir } from '../../lib/bayiTeklif'
import { PARA_BIRIMI, paraYaz } from '../../data/parcaFiyat'
import { tarihYaz } from './ortak'

/* ==========================================================================
   Bayi Teklifleri — PAKSAN tarafı

   NEDEN VAR

   PAKSAN makinelerinin büyük kısmı bayi üzerinden satılıyor ve
   PAKSAN bugün yalnız SATILANI görüyor. Satılamayanı — hangi modele
   kaç teklif verilip kaçının rakibe gittiğini — hiçbir yerde
   görmüyor. Oysa fiyat ve kampanya kararı asıl o veriye bakılarak
   alınır.

   Bayi teklifi kendi panelinde açıyor ve sonucunu işaretliyor
   (bkz. lib/bayiTeklif.js). Veri orada birikiyordu ama PAKSAN'ın
   bakacağı bir ekran yoktu; toplanan ama görülmeyen veri, toplanmamış
   veriyle aynı şey.

   İKİ SORUYA CEVAP VERİYOR

     1. MODEL BAZINDA — hangi modelde kaç teklif verildi, kaçı satışa
        döndü, kaçı rakibe gitti. Fiyat kararının dayanağı bu.
     2. TEKLİF BAZINDA — tek tek kayıtlar; bir bayinin ya da bir
        müşterinin peşine düşmek gerektiğinde.

   BAYİNİN KÂRI BURADA GÖSTERİLMİYOR

   Teklif kaydında bayinin alış fiyatı ve kârı da duruyor; PAKSAN
   bunu zaten iskonto oranından biliyor. Ekranda müşteri fiyatı ve
   sonuç var — PAKSAN'ın pazar kararını ilgilendiren kısım bu.
   ========================================================================== */

const SUZGECLER = [
  { id: 'acik', ad: 'Açık Teklifler' },
  { id: 'satis', ad: 'Satışa Dönen' },
  { id: 'kaybedilen', ad: 'Kaybedilen' },
  { id: 'hepsi', ad: 'Hepsi' },
]

export function BayiTeklifleri() {
  const [suzgec, setSuzgec] = useState('hepsi')
  const hepsi = useMemo(() => teklifleriGetir(), [])

  const liste = useMemo(() => {
    if (suzgec === 'acik') return hepsi.filter((t) => t.durum === 'acik')
    if (suzgec === 'satis') return hepsi.filter((t) => t.durum === 'satis')
    if (suzgec === 'kaybedilen') {
      return hepsi.filter((t) => t.durum === 'vazgecti' || t.durum === 'rakip')
    }
    return hepsi
  }, [hepsi, suzgec])

  /* Model dökümü kapanmış tekliflerden çıkıyor: açık teklifin sonucu
     henüz belli değil ve orana katılırsa oran yanıltıcı oluyor. */
  const modeller = useMemo(() => {
    const tablo = new Map()
    hepsi
      .filter((t) => t.durum !== 'acik')
      .forEach((t) => {
        t.kalemler.forEach((k) => {
          const s = tablo.get(k.ad) || { ad: k.ad, teklif: 0, satis: 0, rakip: 0 }
          s.teklif += 1
          if (t.durum === 'satis') s.satis += 1
          if (t.durum === 'rakip') s.rakip += 1
          tablo.set(k.ad, s)
        })
      })
    return [...tablo.values()].sort((a, b) => b.teklif - a.teklif)
  }, [hepsi])

  if (!hepsi.length) {
    return (
      <>
        <div className="kart__tepe">
          <h2>Bayi Teklifleri</h2>
        </div>
        <p className="sonuk" style={{ padding: 20 }}>
          Bayiler henüz fiyat teklifi kaydetmedi.
        </p>
      </>
    )
  }

  return (
    <>
      <div className="kart__tepe">
        <h2>Bayi Teklifleri</h2>
        <div className="suzgec" style={{ marginLeft: 'auto' }}>
          {SUZGECLER.map((s) => (
            <button
              key={s.id}
              className={'cip' + (suzgec === s.id ? ' cip--on' : '')}
              onClick={() => setSuzgec(s.id)}
            >
              {s.ad}
            </button>
          ))}
        </div>
      </div>

      {modeller.length > 0 && (
        <div className="kart" style={{ marginBottom: 14 }}>
          <div className="kart__tepe">
            <h2>Model Dökümü</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              Sonuçlanan Teklifler
            </span>
          </div>
          <div className="kart__ic">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th style={{ textAlign: 'right' }}>Teklif</th>
                  <th style={{ textAlign: 'right' }}>Satış</th>
                  <th style={{ textAlign: 'right' }}>Rakibe Giden</th>
                  <th style={{ textAlign: 'right' }}>Satışa Dönüş</th>
                </tr>
              </thead>
              <tbody>
                {modeller.map((m) => (
                  <tr key={m.ad}>
                    <td>{m.ad}</td>
                    <td style={{ textAlign: 'right' }}>{m.teklif}</td>
                    <td style={{ textAlign: 'right' }}>{m.satis}</td>
                    <td style={{ textAlign: 'right' }}>{m.rakip}</td>
                    <td style={{ textAlign: 'right' }}>
                      %{Math.round((m.satis / m.teklif) * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!liste.length && (
        <p className="sonuk" style={{ padding: 20 }}>
          Bu süzgeçte teklif yok.
        </p>
      )}

      {liste.map((t) => (
        <TeklifSatiri key={t.id} teklif={t} />
      ))}
    </>
  )
}

const SONUC_TON = { satis: 'yesil', vazgecti: 'gri', rakip: 'kirmizi' }

function TeklifSatiri({ teklif }) {
  const acik = teklif.durum === 'acik'
  const kalan = kalanGun(teklif)

  return (
    <div className="kart" style={{ marginBottom: 10 }}>
      <div className="kart__ic">
        <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
          {acik ? (
            <span className={'rz rz--' + (kalan < 0 ? 'turuncu' : 'mavi')}>
              {kalan < 0 ? 'Süresi doldu' : `${kalan} gün kaldı`}
            </span>
          ) : (
            <span className={'rz rz--' + (SONUC_TON[teklif.durum] || 'gri')}>
              {TEKLIF_SONUC[teklif.durum]?.ad || teklif.durum}
            </span>
          )}
          <strong>{teklif.ad}</strong>
          <span className="mono kucuk sonuk">{teklif.no}</span>
          <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
            {tarihYaz(teklif.tarih, false)}
          </span>
        </div>

        <p className="kucuk" style={{ marginTop: 8 }}>
          {teklif.kalemler.map((k) => `${k.ad} × ${k.adet}`).join(', ')}
        </p>

        <p className="kucuk sonuk">
          {teklif.bayiAd}
          {teklif.ilce ? ` · ${teklif.ilce} / ${teklif.il}` : ''}
          {' · Müşteri Fiyatı: '}
          <b>
            {paraYaz(teklif.toplam)} {PARA_BIRIMI}
          </b>
        </p>

        {teklif.kapanis?.not && (
          <p className="kucuk" style={{ marginTop: 6 }}>
            <span className="sonuk">Bayinin Notu</span>
            <br />
            {teklif.kapanis.not}
          </p>
        )}
      </div>
    </div>
  )
}
