import { useState } from 'react'
import {
  numaraDogruMu, numaraTalebiKarar, numaraTalepleriGetir, seriDogruMu,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, BeklemeKart, Bos, tarihYaz } from './ortak'
import { formatSerial } from '../../lib/serial'

/* Numara değişikliği talepleri.

   Giriş numarası hesabın kimliği; müşteri kendi başına değiştiremiyor.
   Telefonu eline geçiren biri numarayı değiştirebilseydi hesabı
   devralırdı.

   Kimlik doğrulaması makinenin seri numarasıyla yapılıyor — seri
   numarasını yalnız makinenin başındaki kişi bilir. Backoffice iki kontrolü
   kendisi yapıyor:

       · talepteki eski numara hesaptaki numarayla aynı mı,
       · girilen seri no müşterinin kayıtlı makinelerinden biri mi.

   İkisi de tutuyorsa onay güvenli. Tutmuyorsa onaylamadan önce müşteri
   aranmalı.                                                            */

export function NumaraTalepleri({ personel, bildir, tazele, surum }) {
  const [acik, setAcik] = useState('bekleyen')

  const { veri: liste, yukleniyor } = useVeri(() => numaraTalepleriGetir(), [surum], [])

  const gosterilen = liste.filter((t) =>
    acik === 'bekleyen' ? t.durum === 'bekliyor' : true
  )

  return (
    <>
      <Baslik
        ad="Numara Değişikliği Talepleri"
        sag={
          <div className="suzgec">
            <button
              className={'cip' + (acik === 'bekleyen' ? ' cip--on' : '')}
              onClick={() => setAcik('bekleyen')}
            >
              Bekleyen
            </button>
            <button
              className={'cip' + (acik === 'hepsi' ? ' cip--on' : '')}
              onClick={() => setAcik('hepsi')}
            >
              Hepsi
            </button>
          </div>
        }
      />

      {yukleniyor ? (
        <BeklemeKart satir={3} />
      ) : gosterilen.length === 0 ? (
        <div className="kart">
          <Bos metin="Numara değişikliği talebi yok." />
        </div>
      ) : (
        gosterilen.map((t) => (
          <Kart
            key={t.id}
            talep={t}
            personel={personel}
            bildir={bildir}
            tazele={tazele}
          />
        ))
      )}
    </>
  )
}

function Kart({ talep, personel, bildir, tazele }) {
  const [not, setNot] = useState('')
  const bekliyor = talep.durum === 'bekliyor'

  const seriTamam = seriDogruMu(talep)
  const numaraTamam = numaraDogruMu(talep)
  const guvenli = seriTamam && numaraTamam

  function karar(onay) {
    if (onay && !guvenli && !confirm('Kimlik doğrulaması tutmuyor. Yine de onaylansın mı?')) {
      return
    }
    numaraTalebiKarar(talep, onay, personel, not.trim())
    setNot('')
    tazele()
    bildir(onay ? 'Numara değiştirildi, müşteriye bildirim gönderildi.' : 'Talep reddedildi')
  }

  return (
    <div className="kart" style={{ marginBottom: 14 }}>
      <div className="kart__tepe">
        <div>
          <div style={{ fontWeight: 700 }}>{talep.ad || '—'}</div>
          <div className="kucuk sonuk">{tarihYaz(talep.tarih)}</div>
        </div>
        <span style={{ marginLeft: 'auto' }}>
          <span className={'rz rz--' + DURUM_TON[talep.durum]}>{DURUM_ADI[talep.durum]}</span>
        </span>
      </div>

      <div className="kart__ic">
        <div className="esit">
          <div>
        <div className="alan__ad">Girdiği seri numarası</div>
            <div className="mono">{formatSerial(talep.seri) || '—'}</div>
          </div>
          <div />
        </div>

        <div className="esit" style={{ marginTop: 12 }}>
          <div>
            <div className="alan__ad">Eski numara</div>
            <div className="mono">{talep.eskiTel || '—'}</div>
          </div>
          <div>
            <div className="alan__ad">Yeni numara</div>
            <div className="mono" style={{ fontWeight: 700 }}>{talep.yeniTel || '—'}</div>
          </div>
        </div>

        <div className="kontrol">
        <Kontrol tamam={numaraTamam} yazi="Eski numara hesapta kayıtlı numarayla aynı" />
        <Kontrol tamam={seriTamam} yazi="Seri numarası müşterinin kayıtlı makinesine ait" />
        </div>

        {bekliyor ? (
          <>
            {!guvenli && (
              <div className="uyari">
                Kimlik doğrulaması tutmuyor. Onaylamadan önce müşteriyi arayıp
                makinenin seri numarasını sorun.
              </div>
            )}

            <label className="alan">
              <span className="alan__ad">Not (işlem kaydına yazılır)</span>
              <input
                className="gir"
                value={not}
                onChange={(e) => setNot(e.target.value)}
          placeholder="Örnek: Müşteri arandı, seri numarası doğrulandı"
              />
            </label>

            <div className="satir">
              <button className="dg dg--ana" onClick={() => karar(true)}>
                Onayla ve numarayı değiştir
              </button>
              <button className="dg" onClick={() => karar(false)}>Reddet</button>
            </div>
          </>
        ) : (
          <div className="kucuk sonuk" style={{ marginTop: 12 }}>
            {talep.karar?.personel} · {tarihYaz(talep.karar?.tarih)}
            {talep.karar?.not ? ` · ${talep.karar.not}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function Kontrol({ tamam, yazi }) {
  return (
    <div className={'kontrol__a' + (tamam ? ' kontrol__a--ok' : '')}>
      <span aria-hidden="true">{tamam ? '✓' : '✕'}</span>
      <span>{yazi}</span>
    </div>
  )
}

const DURUM_ADI = { bekliyor: 'Bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' }
const DURUM_TON = { bekliyor: 'turuncu', onaylandi: 'yesil', reddedildi: 'gri' }
