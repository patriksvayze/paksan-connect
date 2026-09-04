import { useMemo, useState } from 'react'
import {
  ACIK_DURUMLAR,
  SIPARIS_DURUM,
  siparisDurumu,
  siparisleriGetir,
} from '../../lib/bayiSiparis'
import { tarihYaz } from './ortak'
import { islemYaz, izinli } from '../veri'

/* ==========================================================================
   Bayi Siparişleri — PAKSAN tarafı

   Bayi stoğunu kendi artıramıyor; artışın tek yolu bu ekran. Bayi
   sipariş veriyor, PAKSAN burada ilerletiyor:

     PAKSAN'a iletildi → Onaylandı → Hazırlanıyor → Gönderildi

   "Gönderildi" işaretlendiği anda bayinin stoğu artıyor. Onay ve
   hazırlık adımlarında artmıyor — parça henüz bayide değil. Kargo
   bilgisi burada giriliyor, bayi panelinde görünüyor.

   İPTAL GERİ ALINMIYOR. Kapanmış sipariş (gönderildi/iptal) bir daha
   değişmiyor; yanlışlık olursa yeni sipariş açılıyor. Gönderilmiş
   siparişi geri almak stoğu da geri almak demek, o da bayinin elindeki
   gerçek malı yok saymak olurdu.
   ========================================================================== */

const SUZGECLER = [
  { id: 'acik', ad: 'Bekleyen' },
  { id: 'kapali', ad: 'Kapanan' },
  { id: 'hepsi', ad: 'Hepsi' },
]

export function BayiSiparisleri({ rol, personel }) {
  const [suzgec, setSuzgec] = useState('acik')
  const [tazele, setTazele] = useState(0)
  const [acik, setAcik] = useState(null)

  const liste = useMemo(() => {
    const hepsi = siparisleriGetir()
    if (suzgec === 'acik') return hepsi.filter((s) => ACIK_DURUMLAR.includes(s.durum))
    if (suzgec === 'kapali') return hepsi.filter((s) => !ACIK_DURUMLAR.includes(s.durum))
    return hepsi
  }, [suzgec, tazele])

  /* Yalnız bayi kaydını düzenleyebilen personel siparişi ilerletebiliyor:
     sevkiyat kararı ticari bir karar, her rolün işi değil. */
  const yetkili = izinli(rol, 'bayiDuzenle')

  return (
    <>
      <div className="kart__tepe">
        <h2>Bayi Siparişleri</h2>
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

      {!liste.length && (
        <p className="sonuk" style={{ padding: 20 }}>
          {suzgec === 'acik'
            ? 'Bekleyen sipariş yok.'
            : 'Bu süzgeçte sipariş yok.'}
        </p>
      )}

      {liste.map((s) => (
        <SiparisSatiri
          key={s.id}
          siparis={s}
          acik={acik === s.id}
          onAc={() => setAcik(acik === s.id ? null : s.id)}
          yetkili={yetkili}
          personel={personel}
          onDegisti={() => setTazele((x) => x + 1)}
        />
      ))}
    </>
  )
}

/* Sıradaki adım tek düğme: personel "şimdi ne olacak" diye durum
   listesinden seçmiyor, akış zaten tek yönlü. */
const SONRAKI = {
  yeni: { durum: 'onaylandi', ad: 'Onayla' },
  onaylandi: { durum: 'hazirlaniyor', ad: 'Hazırlığa al' },
  hazirlaniyor: { durum: 'gonderildi', ad: 'Gönderildi olarak işaretle' },
}

function SiparisSatiri({ siparis, acik, onAc, yetkili, personel, onDegisti }) {
  const [firma, setFirma] = useState('')
  const [takip, setTakip] = useState('')
  const [hata, setHata] = useState('')
  const d = SIPARIS_DURUM[siparis.durum] || SIPARIS_DURUM.yeni
  const sonraki = SONRAKI[siparis.durum]
  const adet = siparis.kalemler.reduce((t, k) => t + Number(k.adet), 0)

  /* Sipariş hareketleri İşlem Kaydı'na da yazılıyor: stoğu değiştiren
     tek adım gönderim ve "bu bayinin stoğu neden arttı" sorusunun
     cevabı denetlenebilir bir yerde durmalı. */
  function yaz(ozet) {
    islemYaz({ tur: 'siparis', ozet: `${siparis.no} · ${siparis.bayiAd} · ${ozet}`, personel })
  }

  function ilerlet() {
    const kargo = siparis.durum === 'hazirlaniyor' ? { firma, takipNo: takip } : undefined
    const sonuc = siparisDurumu(siparis.id, sonraki.durum, personel, kargo)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz(
      sonraki.durum === 'gonderildi'
        ? `gönderildi · stok işlendi${takip ? ' · ' + (firma || 'kargo') + ' ' + takip : ''}`
        : SIPARIS_DURUM[sonraki.durum].ad.toLocaleLowerCase('tr-TR'),
    )
    onDegisti()
  }

  function iptal() {
    const sonuc = siparisDurumu(siparis.id, 'iptal', personel)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz('iptal edildi')
    onDegisti()
  }

  return (
    <div className="kart" style={{ marginBottom: 10 }}>
      <button
        className="siparis-bas"
        onClick={onAc}
        aria-expanded={acik}
      >
        <span className={'rz rz--' + d.ton}>{d.ad}</span>
        <strong>{siparis.bayiAd}</strong>
        <span className="mono kucuk sonuk">{siparis.no}</span>
        <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
          {siparis.kalemler.length} kalem · {adet} adet · {tarihYaz(siparis.tarih, false)}
        </span>
      </button>

      {acik && (
        <div className="kart__ic">
          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Tür</th>
                <th style={{ textAlign: 'right' }}>Adet</th>
              </tr>
            </thead>
            <tbody>
              {siparis.kalemler.map((k) => (
                <tr key={k.tur + k.anahtar}>
                  <td>{k.ad}</td>
                  <td>{k.tur === 'makine' ? 'Makine' : 'Yedek parça'}</td>
                  <td style={{ textAlign: 'right' }}>{k.adet}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {siparis.not && (
            <p style={{ marginTop: 12 }}>
              <span className="kucuk sonuk">Bayinin notu</span>
              <br />
              {siparis.not}
            </p>
          )}

          {siparis.kargo?.takipNo && (
            <p className="kucuk" style={{ marginTop: 12 }}>
              Kargo: {siparis.kargo.firma || '—'} · {siparis.kargo.takipNo}
            </p>
          )}

          <div className="zaman" style={{ marginTop: 12 }}>
            {(siparis.gecmis || []).map((g, i) => (
              <div key={i} className="kucuk sonuk">
                {SIPARIS_DURUM[g.durum]?.ad || g.durum} · {tarihYaz(g.tarih)} · {g.kim}
              </div>
            ))}
          </div>

          {yetkili && sonraki && (
            <>
              {/* Kargo bilgisi yalnız gönderim adımında soruluyor;
                  önceki adımlarda henüz kargo yok. */}
              {siparis.durum === 'hazirlaniyor' && (
                <div className="esit" style={{ marginTop: 14 }}>
                  <label className="alan">
                    <span className="alan__ad">Kargo firması</span>
                    <input
                      className="gir"
                      value={firma}
                      onChange={(e) => setFirma(e.target.value)}
                      placeholder="Örnek: Aras Kargo"
                    />
                  </label>
                  <label className="alan">
                    <span className="alan__ad">Takip numarası</span>
                    <input
                      className="gir mono"
                      value={takip}
                      onChange={(e) => setTakip(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {hata && <div className="uyari">{hata}</div>}

              <div className="satir" style={{ marginTop: 12 }}>
                <button className="dg dg--ana" onClick={ilerlet}>
                  {sonraki.ad}
                </button>
                <button className="dg" onClick={iptal}>
                  Siparişi iptal et
                </button>
              </div>

              {siparis.durum === 'hazirlaniyor' && (
                <p className="kucuk sonuk" style={{ marginTop: 8 }}>
                  Gönderildi işaretlendiğinde bu kalemler bayinin stoğuna
                  eklenecek.
                </p>
              )}
            </>
          )}

          {!yetkili && (
            <p className="kucuk sonuk" style={{ marginTop: 12 }}>
              Siparişi ilerletmek için bayi düzenleme yetkisi gerekiyor.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
