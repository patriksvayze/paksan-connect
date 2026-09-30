import { useMemo } from 'react'
import { servisinSiparisleri, talepleriGetir } from '../../backoffice/veri'
import { parcaYazisiKodlu, siparisGonderimi, talebinParcalari } from '../../lib/servisKaydi'
import { siparisNetTutari } from '../../lib/servisFiyat'
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

   EKRANIN GÖVDESİ LİSTE, DÜĞME ALTTA YÜZÜYOR

   "Sipariş Ver" bir dönem ekranın en üstünde tam genişlikte, sonra
   üst çubukta "+" olarak durdu. İkisinde de parmağın uzağındaydı.
   Şimdi İşlerim'deki "Kayıt Aç" ile aynı yerde: alt menünün üstünde
   yüzen düğme (bkz. Kabuk.jsx → fab). Liste boşken de aynı düğme;
   gövdeye ikinci bir kopyası konmuyor.

   Garanti kapsamındaki parça BURADAN İSTENMİYOR. O, bir servis
   kaydının içinden isteniyor ve aynı talebin üstünde yürüyor
   (bkz. lib/servisKaydi.js). Buradan istenseydi parça ile onu doğuran
   iş birbirinden kopardı.

   KARTTA KOD DA YAZIYOR

   Kart bir dönem yalnız adları virgülle birleştiriyordu ("İPLİ BIÇAK,
   KAYIŞ"). Katalogta aynı adı taşıyan parçalar var: ad, hangi parçanın
   istendiğini söylemiyor. Adet de kartta eksikti. İkisi de kaydın fiyat
   görüntüsünde yazılı; kart artık oradan okuyor
   (bkz. veri.js → servisParcaSiparisi).
   ========================================================================== */

/* Siparişin parça satırları lib/servisKaydi.js → talebinParcalari'den
   okunuyor: kaydın hangi biçimlerde durduğu ve adedin nerede yazılı
   olduğu orada tek yerde anlatılıyor. Aynı okuma bir dönem bu ekranda,
   hak ediş ekranında ve talep ekranında ayrı ayrı duruyordu. */

const DURUM_YAZI = {
  yeni: { ad: 'Alındı', gec: false },
  incelemede: { ad: 'Hazırlanıyor', gec: false },
  planlandi: { ad: 'Hazırlanıyor', gec: false },
  parcaBekliyor: { ad: 'Hazırlanıyor', gec: false },
  kapandi: { ad: 'Gönderildi', gec: false },
  iptal: { ad: 'İptal edildi', gec: true },
}
const KISMEN_GONDERILDI = { ad: 'Kısmen gönderildi', gec: false }

/** Siparişin görünen durumu: listedeki kart ve siparişin ayrıntısı aynı
    işlevden okuyor (29 Eylül 2026, görünüm önerisi S3). Eksik gönderilen
    sipariş "Gönderildi" demiyor: parçanın bir kısmı hâlâ PAKSAN'da (bkz.
    veri.js → kalanParcalariGonder). */
export function siparisDurumu(s) {
  const kismi = s.status === 'kapandi' && siparisGonderimi(s)?.kalan.length > 0
  return kismi ? KISMEN_GONDERILDI : DURUM_YAZI[s.status] || DURUM_YAZI.yeni
}

export function Parca({ oturum, onAc, onSiparis, surum }) {
  const siparisler = useMemo(
    () => servisinSiparisleri(talepleriGetir(), oturum.servisId),
    [oturum.servisId, surum],
  )

  if (siparisler.length === 0) {
    return (
      <Bos
        gorsel={bosStokGorseli}
        baslik="Henüz siparişiniz yok"
        alt={`İhtiyacınız olan parçaları ${markaEk('dan')} aşağıdaki Sipariş Ver düğmesiyle isteyebilirsiniz.`}
      />
    )
  }

  return (
    <>
      <p className="ipucu">
        Verdiğiniz siparişleri ve durumlarını burada görebilirsiniz. Yeni
        sipariş için aşağıdaki Sipariş Ver düğmesine dokunun.
      </p>

      <Bolum ad="Siparişlerim" sayi={siparisler.length}>
        {siparisler.map((s) => {
          const kismi = s.status === 'kapandi' && siparisGonderimi(s)?.kalan.length > 0
          const durum = siparisDurumu(s)
          /* İptal edilen kalem varsa servisin ödeyeceği yeni tutar
             (lib/servisFiyat.js → siparisNetTutari); yoksa siparişin toplamı. */
          const tutar = siparisNetTutari(s)
          const parcalar = talebinParcalari(s)
          /* Toplam adet satırlardan: `parcaAdet` nesnesini toplamak,
             aynı adı taşıyan iki parçanın tek satıra çöktüğü eski
             kayıtlarda eksik rakam veriyordu. */
          const adet = parcalar.reduce((t, p) => t + p.adet, 0)
          return (
            <ListeKarti
              key={s.id}
              ad={parcaYazisiKodlu(parcalar) || 'Parça siparişi'}
              tur="parca"
              turAdi="Sipariş"
              kunye={`${s.no} · ${adet} adet`}
              parcalar={parcalar.filter((p) => p.kod)}
              /* Ödeme biçimi kartta: servis "bunun parası hak edişimden
                 mi düşecek" sorusunu listeyi açmadan görüyor. */
              /* İptal edilen siparişte ödeme satırı yok; tamamı
                 gönderilen bakiye siparişinde para düşüldü (24 Eylül 2026). */
              ozet={
                s.status === 'iptal'
                  ? undefined
                  : s.odeme === 'bakiye'
                    ? s.status === 'kapandi' && !kismi
                      ? 'Bakiyenizden düşüldü'
                      : 'Bakiyenizden düşülecek'
                    : `${MARKA} faturalandıracak`
              }
              sol={durum.ad}
              /* KDV DÂHİL TUTAR (24 Eylül 2026). Kart kaydın `tutar`
                 alanını, yani KDV hariç ara toplamı gösteriyordu; bakiyeden
                 düşen ve faturaya yazılan KDV dâhil tutar. Servis ikisini
                 karşılaştırıp bakiyesinden fazla para düştüğünü sandı
                 (bkz. lib/servisFiyat.js → siparisToplami, siparisNetTutari). */
              sag={tutar ? `${paraYaz(tutar)} ${PARA_BIRIMI}` : gecenSure(s.createdAt)}
              gec={durum.gec}
              /* Tutar kartın en büyük yazısı (29 Eylül 2026, S3). */
              tutar={Boolean(tutar)}
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
