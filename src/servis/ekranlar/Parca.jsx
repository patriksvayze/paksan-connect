import { useMemo } from 'react'
import { servisinSiparisleri, talepleriGetir } from '../../backoffice/veri'
import { PARA_BIRIMI, paraYaz, MARKA, markaEk } from '../../marka'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
import { Bolum, Bos, ListeKarti } from '../Kabuk'
import bosStokGorseli from '../../assets/gorseller/servis-bos-stok.png'

/* ==========================================================================
   Servis uygulaması — parça

   STOK TAKİBİ KALDIRILDI

   Bu ekran servisin elindeki parça sayısını tutuyordu: sipariş gelince
   artıyor, iş bitince düşüyordu. Sistem hiçbir zaman çalışmadı ve
   çalışamazdı — servis kendi deposunu bu uygulamada saymıyor, PAKSAN'ın
   gönderdiğiyle eline geçen tutmuyor, aradaki fark da hiçbir yerde
   kapanmıyordu. Yanlış rakam, rakamın hiç olmamasından kötü: ekranlar
   ona bakıp karar veriyordu ("stokta yok" yazan parça serviste
   duruyordu).

   Geriye ekranın gerçekten işe yarayan tek parçası kaldı: sipariş.

   EKRANIN GÖVDESİ LİSTE, DÜĞME ÜST ÇUBUKTA

   "Sipariş Ver" düğmesi bu ekranın en üstünde tam genişlikte
   duruyordu ve servisin asıl baktığı şeyi — verdiği siparişlerin
   nerede olduğunu — aşağı itiyordu. İşlerim'de aynı sorun aynı
   şekilde çözülmüştü: yeni iş açmak üst çubuğun "+" düğmesinin işi
   (bkz. ServisPanel.jsx). İki sekme artık aynı yerden iş açıyor.

   Liste boşken düğme gövdede duruyor: orada zaten başka bir şey yok
   ve boş bir ekranın yapılacak işi göstermesi gerekiyor.

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

export function Parca({ oturum, onAc, onSiparis, surum }) {
  const siparisler = useMemo(
    () => servisinSiparisleri(talepleriGetir(), oturum.servisId),
    [oturum.servisId, surum],
  )

  if (siparisler.length === 0) {
    return (
      <>
        <Bos
          gorsel={bosStokGorseli}
          baslik="Henüz siparişiniz yok"
          alt={`İhtiyacınız olan parçaları ${markaEk('dan')} buradan isteyebilirsiniz.`}
        />
        <button className="dg dg--ana dg--blok" onClick={onSiparis}>
          Sipariş Ver
        </button>
      </>
    )
  }

  return (
    <>
      <p className="ipucu">
        Verdiğiniz siparişleri ve durumlarını burada görebilirsiniz. Yeni
        sipariş vermek için üstteki + düğmesine dokunun.
      </p>

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
              /* Ödeme biçimi kartta: servis "bunun parası hak edişimden
                 mi düşecek" sorusunu listeyi açmadan görüyor. */
              ozet={
                s.odeme === 'bakiye'
                  ? 'Bakiyenizden düşülecek'
                  : `${MARKA} faturalandıracak`
              }
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

      <p className="ipucu">
        Siparişiniz {MARKA} yedek parça birimine düşer. Kargoya verildiğinde
        buradaki durumu değişir.
      </p>
    </>
  )
}
