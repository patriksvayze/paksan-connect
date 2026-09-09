import { useMemo, useState } from 'react'
import { servisinSiparisleri, talepleriGetir } from '../../backoffice/veri'
import { PARA_BIRIMI, paraYaz, MARKA, markaEk } from '../../marka'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
import { Bolum, Bos, ListeKarti } from '../Kabuk'
import { SiparisVer } from './SiparisVer'
import { IconPlus } from '../../components/Icons'
import bosStokGorseli from '../../assets/gorseller/servis-bos-stok.png'

/* ==========================================================================
   Servis paneli — parça

   STOK TAKİBİ KALDIRILDI

   Bu ekran servisin elindeki parça sayısını tutuyordu: sipariş gelince
   artıyor, iş bitince düşüyordu. Sistem hiçbir zaman çalışmadı ve
   çalışamazdı — servis kendi deposunu bu uygulamada saymıyor, PAKSAN'ın
   gönderdiğiyle eline geçen tutmuyor, aradaki fark da hiçbir yerde
   kapanmıyordu. Yanlış rakam, rakamın hiç olmamasından kötü: ekranlar
   ona bakıp karar veriyordu ("stokta yok" yazan parça serviste
   duruyordu).

   Geriye ekranın gerçekten işe yarayan tek parçası kaldı: sipariş.

   İKİ İŞ VAR

     SİPARİŞ VER   servisin kendi satın alması
     SİPARİŞLERİM  verdiği siparişlerin nerede olduğu

   Garanti kapsamındaki parça BURADAN İSTENMİYOR. O, bir servis
   kaydının içinden isteniyor ve aynı talebin üstünde yürüyor
   (bkz. lib/servisKaydi.js). Buradan istenseydi parça ile onu doğuran
   iş birbirinden kopardı.
   ========================================================================== */

const DURUM_YAZI = {
  yeni: { ad: 'Alındı', gec: false },
  incelemede: { ad: 'Hazırlanıyor', gec: false },
  planlandi: { ad: 'Hazırlanıyor', gec: false },
  parcaBekliyor: { ad: 'Hazırlanıyor', gec: false },
  kapandi: { ad: 'Gönderildi', gec: false },
  iptal: { ad: 'İptal edildi', gec: true },
}

export function Parca({ oturum, onAc }) {
  const [ekran, setEkran] = useState('liste')
  const [tazele, setTazele] = useState(0)

  const siparisler = useMemo(
    () => servisinSiparisleri(talepleriGetir(), oturum.servisId),
    [oturum.servisId, tazele],
  )

  if (ekran === 'siparis') {
    return (
      <SiparisVer
        oturum={oturum}
        onKapat={() => setEkran('liste')}
        onVerildi={() => {
          setEkran('liste')
          setTazele((x) => x + 1)
        }}
      />
    )
  }

  return (
    <>
      <p className="ipucu">
        {markaEk('dan')} parça siparişi verin ve verdiğiniz siparişleri buradan
        takip edin.
      </p>

      <button
        className="dg dg--ana dg--blok"
        style={{ marginBottom: 16 }}
        onClick={() => setEkran('siparis')}
      >
        <IconPlus size={19} />
        {markaEk('dan')} Sipariş Ver
      </button>

      {siparisler.length === 0 ? (
        <Bos
          gorsel={bosStokGorseli}
          baslik="Henüz siparişiniz yok"
          alt={`İhtiyacınız olan parçaları ${markaEk('dan')} buradan isteyebilirsiniz.`}
        />
      ) : (
        <Bolum ad="Siparişlerim" sayi={siparisler.length}>
          {siparisler.map((s) => {
            const durum = DURUM_YAZI[s.status] || DURUM_YAZI.yeni
            const adet = Object.values(s.parcaAdet || {}).reduce(
              (t, n) => t + Number(n),
              0,
            )
            return (
              <ListeKarti
                key={s.id}
                ad={(s.parcalar || []).join(', ') || 'Parça siparişi'}
                tur="parca"
                turAdi="Sipariş"
                kunye={`${s.no} · ${adet} adet`}
                sol={durum.ad}
                sag={
                  s.tutar
                    ? `${paraYaz(s.tutar)} ${PARA_BIRIMI}`
                    : gecenSure(s.createdAt)
                }
                gec={durum.gec}
                onAc={() => onAc(s)}
              />
            )
          })}
        </Bolum>
      )}

      <p className="ipucu">
        Siparişiniz {MARKA} yedek parça birimine düşer. Kargoya verildiğinde
        buradaki durumu değişir.
      </p>
    </>
  )
}
