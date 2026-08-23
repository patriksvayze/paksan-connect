import { useState } from 'react'
import { geriBildirimGetir, geriBildirimNotEkle, geriBildirimOkundu } from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme, Bos, gecenSure, tarihYaz } from './ortak'

/* Geri bildirimler.

   Uygulamada Profil > Görüş ve önerileriniz'den gelen mesajlar.
   Okunmamışlar üstte duruyor; okunan mesaj listeden silinmiyor.

   Her mesaja cevap yazılabiliyor. Cevap müşterinin Bildirimler ekranına
   düşüyor — görüşünün okunduğunu görmek, bir daha yazmasını sağlıyor. */

export function GeriBildirimler({ personel, bildir, tazele, surum }) {
  const { veri: liste, yukleniyor } = useVeri(() => geriBildirimGetir(), [surum], [])
  const okunmamis = liste.filter((g) => !g.okundu).length

  const sirali = [...liste].sort((a, b) =>
    a.okundu === b.okundu ? b.tarih - a.tarih : a.okundu ? 1 : -1
  )

  return (
    <>
      <Baslik
        ad="Geri Bildirimler"
        sag={<span className="kucuk sonuk">{okunmamis} okunmamış / {liste.length}</span>}
      />

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={3} />
        ) : liste.length === 0 ? (
          <Bos metin="Geri bildirim yok." />
        ) : (
          <div className="satirlar">
            {sirali.map((g) => (
              <Gorus
                key={g.id}
                gorus={g}
                personel={personel}
                bildir={bildir}
                tazele={tazele}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Gorus({ gorus, personel, bildir, tazele }) {
  const [not, setNot] = useState('')
  const [yaziyor, setYaziyor] = useState(false)

  function gonder() {
    const metin = not.trim()
    if (metin.length < 3) return
    geriBildirimNotEkle(gorus, metin, personel)
    setNot('')
    setYaziyor(false)
    tazele()
    bildir('Cevap gönderildi, müşterinin bildirimlerine düştü')
  }

  return (
    <div className={'kalem' + (gorus.okundu ? '' : ' kalem--yeni')}>
      <div className="kalem__gov">
        <div style={{ whiteSpace: 'pre-wrap' }}>{gorus.metin}</div>

        <div className="kalem__alt">
          <span className="mono">{gorus.no || '—'}</span> · {gorus.ad || 'İsimsiz'} ·{' '}
          <span className="mono">{gorus.tel || '—'}</span> · {gecenSure(gorus.tarih)}
        </div>

        {gorus.okundu && gorus.okuyan && (
          <div className="kalem__alt">
            Okundu: {gorus.okuyan}
            {gorus.okumaTarih ? ` · ${tarihYaz(gorus.okumaTarih)}` : ''}
          </div>
        )}

        {gorus.notlar?.length > 0 && (
          <div className="cevap">
            {gorus.notlar.map((n, i) => (
              <div key={i} className="cevap__a">
                <div>{n.metin}</div>
                <div className="kucuk sonuk">{n.personel} · {tarihYaz(n.tarih)}</div>
              </div>
            ))}
          </div>
        )}

        {yaziyor && (
          <div style={{ marginTop: 12 }}>
            <textarea
              className="metin"
              style={{ minHeight: 66 }}
              value={not}
              onChange={(e) => setNot(e.target.value)}
              placeholder="Müşterinin bildirimlerine düşecek cevabı yazın"
              autoFocus
            />
            <div className="satir" style={{ marginTop: 8 }}>
              <button className="dg dg--ana" onClick={gonder}>Cevabı gönder</button>
              <button className="dg" onClick={() => setYaziyor(false)}>Vazgeç</button>
            </div>
          </div>
        )}
      </div>

      {!yaziyor && (
        <div className="satir" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <button className="dg" onClick={() => setYaziyor(true)}>Cevap yaz</button>
          {!gorus.okundu && (
            <button
              className="dg"
              onClick={() => {
                geriBildirimOkundu(gorus.id, personel)
                tazele()
                bildir('Okundu işaretlendi')
              }}
            >
              Okundu
            </button>
          )}
        </div>
      )}
    </div>
  )
}
