import { useEffect, useRef, useState } from 'react'
import { BILDIRIM, bildirimDestekleniyorMu, bildirimGoster, izinIste, mevcutIzin } from '../lib/bildirim'
import { servisinTalepleri, talepleriGetir } from '../backoffice/veri'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { servisDuyuruBaglami } from '../lib/servisAtama'
import { load } from '../lib/storage'
import { bildirimYazisi, musteridenMi, okunmamislar } from './talepBildirimleri'

/* ==========================================================================
   Servis uygulamasının bildirimleri

   NEDEN AYRI DOSYA

   Müşteri uygulaması ve backoffice kendi haberlerini kendi
   dosyalarında üretiyor; servisin haber alması gereken şeyler ikisine
   de benzemiyor. Bildirimin NASIL gösterildiği ortak
   (`src/lib/bildirim.js`): telefonda Android'in bildirim perdesi,
   tarayıcıda tarayıcının kendi bildirimi. Burada yalnız NE ZAMAN
   gösterileceği yazıyor.

   SERVİSİN HABER BEKLEDİĞİ ÜÇ ŞEY

     YENİ İŞ        kendisine bir talep düştü. Sabah uygulamayı
                    açmadan önce bilmek istiyor.
     PAKSAN'IN      PAKSAN talepte servise dokunan bir işlem yaptı:
     İŞLEMİ         durumu değiştirdi, iptal etti, kapattı, parça
                    gönderdi, kaydı onayladı, düzeltti ya da reddetti,
                    not yazdı. Her biri talebe bağlı, kalıcı bir kayıt
                    (bkz. talepBildirimleri.js).
     ACİL DUYURU    geri çağırma ve uyarı. Bunlar duyuru değil iş
                    emri: "bu makineleri arayıp servise çağırın".

   MÜŞTERİNİN İŞLEMİ de aynı kayıttan geliyor (25 Eylül 2026): müşteri
   Connect'ten talebe bir şey eklediğinde ya da "Sorun Devam Ediyor"
   dediğinde (lib/talepEkleme.js). Tek bildirimde başlık olayın kendi
   yazısı ("Müşteri talebe yeni bilgi ekledi"); birden çok bildirim
   toplanınca başlık yalnız hepsi PAKSAN'dansa marka adını taşıyor —
   müşterinin işi PAKSAN'ınki gibi görünmesin.

   PARÇA, PARA VE NOT ESKİDEN AYRI AYRI SAYILIYORDU (21 Eylül 2026'ya
   kadar): talebin üstünde `parcaSevk` doğdu mu, hak ediş onaylandı mı,
   servise not düştü mü diye önceki hâlle karşılaştırılıyordu. PAKSAN'ın
   iptal, kapatma ve durum değişikliğinin karşılığı yoktu. Şimdi hepsi
   tek kaynaktan, PAKSAN'ın yazdığı kayıttan geliyor; eski sayımlar
   kaldırıldı, yoksa aynı olay iki bildirim olurdu.

   Kampanya ve fuar duyurusu bildirim ÜRETMİYOR. Tarlada çalışan bir
   ustanın telefonunu çaldıran şey, telefonunu çaldırmayı hak etmeli;
   yoksa bir süre sonra bütün bildirimler kapatılıyor.

   BUGÜNKÜ SINIR

   Veri tarayıcının kendi hafızasında ve uygulama açıkken kontrol
   ediliyor. Uygulama kapalıyken haber gönderebilmek için sunucu ve
   Firebase gerekiyor (bkz. CANLIYA-CIKIS.md). O geldiğinde bu
   dosyadaki sayaç yerine sunucunun kendi haberi gelecek; gösterme
   tarafı değişmeyecek.

   Bu sayaç yalnız telefonu ÇALDIRAN haberi arıyor; bildirim doğurmayan
   değişiklikte ekranı tazelemiyor. Tarayıcıda başka sekmenin yazdığı
   her şey ekrana ServisPanel.jsx'teki depo dinleyicisiyle düşüyor
   (25 Eylül 2026); burada ikinci bir dinleyici yok.
   ========================================================================== */

/* Sekme açıkken düzenli bakılıyor. Backoffice'teki aralığın aynısı:
   sunucu gelene kadar iki üründe de tek çare bu. */
const ARALIK = 15000

const GORULEN_DUYURU = 'gorulenDuyurularServis'

/** Bu servise düşen açık işler ve para durumu — tek bakışta. */
function durumOku(servisId) {
  const talepler = servisinTalepleri(talepleriGetir(), servisId)

  return {
    /* Servisin kendi parça siparişi "iş" değil; onun haberi ayrı
       verilmiyor, listede zaten görünüyor. Servisin kendi açtığı elle
       kayıt da "yeni iş" değil (22 Eylül 2026, kullanıcı bildirdi):
       kaydı az önce kendisi açtı, telefonunun çalması anlamsız. */
    isler: talepler.filter((t) => !t.servisSiparisi && !t.elle).map((t) => t.id),
    /* PAKSAN'ın bu servise yazdığı, henüz okunmamış talep bildirimleri. */
    bildirimler: okunmamislar(servisId),
  }
}

/** Servise yönelmiş, henüz görülmemiş acil duyurular. */
function acilDuyurular(oturum) {
  const gorulen = new Set(load(GORULEN_DUYURU, []))
  const baglam = servisDuyuruBaglami(oturum)
  return load('duyurular', [])
    .filter((d) => d.tur === 'uyari' && !gorulen.has(d.id))
    .filter((d) => duyuruGecerliMi(d, baglam))
    .map((d) => d.id)
}

/** İki listede ilkinde olmayan kaç kimlik var? */
function artan(yeni, eski) {
  const vardi = new Set(eski)
  return yeni.filter((id) => !vardi.has(id)).length
}

/* Türkçede sayıdan sonra isim çoğul eki almıyor: "2 yeni iş", "2 parça".
   Sayı yazılmadığında başlık büyük harfle başlıyor. */
function sayili(n, tekil, tekBaslik) {
  return n > 1 ? `${n} ${tekil}` : tekBaslik
}

/**
 * Servise düşen yeni işleri ve para hareketlerini izler, bildirim gönderir.
 * @param {object} oturum servis oturumu
 * @param {Function} tazele değişiklik varsa listeyi yenileten geri çağırma
 */
export function useServisHaberi(oturum, tazele) {
  const onceki = useRef(null)

  useEffect(() => {
    if (!oturum?.servisId) {
      onceki.current = null
      return
    }

    const oku = () => ({
      ...durumOku(oturum.servisId),
      duyuru: acilDuyurular(oturum),
    })

    /* İlk okuma sessiz: uygulama açıldığında var olan işler "yeni"
       değil. Yoksa her girişte elindeki bütün işler bildirim olurdu. */
    if (onceki.current === null) onceki.current = oku()

    const zamanlayici = setInterval(() => {
      const yeni = oku()
      const eski = onceki.current

      const yeniIs = artan(yeni.isler, eski.isler)
      if (yeniIs) {
        bildirimGoster({
          baslik: `${sayili(yeniIs, 'yeni iş', 'Yeni iş')} · PAKSAN`,
          metin: 'İşlerim listenize düştü.',
        })
      }

      /* TEK BİLDİRİMSE NE OLDUĞUNU SÖYLÜYOR, birden çoksa sayıyor.
         Telefonun bildirim perdesinde talep numarası duruyor: servis
         uygulamayı açmadan hangi işe dokunulduğunu biliyor. */
      const eskiKimlik = new Set(eski.bildirimler.map((b) => b.id))
      const gelen = yeni.bildirimler.filter((b) => !eskiKimlik.has(b.id))
      if (gelen.length === 1) {
        const y = bildirimYazisi(gelen[0])
        /* Ücret ve indirim bildiriminde talep numarası yok (23 Eylül 2026,
           `tur: 'hesap'`); başlık yalnız olayın kendisi. */
        bildirimGoster({
          baslik: gelen[0].talepNo ? `${gelen[0].talepNo} · ${y.baslik}` : y.baslik,
          metin: y.metin || 'Ayrıntıları görmek için talebi açın.',
        })
      } else if (gelen.length > 1) {
        /* Aralarında müşterinin işlemi varsa başlık markayı anmıyor. */
        const hepsiPaksandan = gelen.every((b) => !musteridenMi(b))
        bildirimGoster({
          baslik: hepsiPaksandan
            ? `PAKSAN · ${gelen.length} Yeni Bildirim`
            : `${gelen.length} Yeni Bildirim`,
          metin: 'Bildirimleri İşlerim ekranının üst bölümünde görebilirsiniz.',
        })
      }

      const yeniDuyuru = artan(yeni.duyuru, eski.duyuru)
      if (yeniDuyuru) {
        bildirimGoster({
          baslik: `PAKSAN uyarısı`,
          metin: 'İşlerim ekranının üst bölümünde okuyabilirsiniz.',
        })
      }

      if (yeniIs || gelen.length || yeniDuyuru) tazele()

      onceki.current = yeni
    }, ARALIK)

    return () => clearInterval(zamanlayici)
  }, [oturum, tazele])
}

/* ==========================================================================
   İzin

   Kendiliğinden sorulmuyor: hem Android hem tarayıcı, kullanıcı bir
   şeye basmadan açılan izin pencerelerini kötü karşılıyor — Android
   penceresi hiç açılmadan "reddedildi" dönebiliyor ve o karar geri
   alınamıyor.

   Şerit yalnız karar verilmemişken çıkıyor. Reddedilmişse bir kez
   nereden açılacağını söyleyip susuyor; her açılışta aynı uyarıyı
   göstermek, kullanıcının kendi kararını geri çevirmeye çalışmak
   olurdu.
   ========================================================================== */

export function useBildirimIzni() {
  const [durum, setDurum] = useState(null)

  useEffect(() => {
    let gecerli = true
    mevcutIzin().then((d) => gecerli && setDurum(d))
    return () => {
      gecerli = false
    }
  }, [])

  return {
    durum,
    destekli: bildirimDestekleniyorMu(),
    iste: async () => {
      const sonuc = await izinIste()
      setDurum(sonuc)
      return sonuc
    },
    BILDIRIM,
  }
}
