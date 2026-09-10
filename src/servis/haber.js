import { useEffect, useRef, useState } from 'react'
import { BILDIRIM, bildirimDestekleniyorMu, bildirimGoster, izinIste, mevcutIzin } from '../lib/bildirim'
import { servisinTalepleri, talepleriGetir } from '../backoffice/veri'
import { duyuruGecerliMi } from '../lib/duyuruHedef'
import { load } from '../lib/storage'
import { MARKA } from '../marka'

/* ==========================================================================
   Servis uygulamasının bildirimleri

   NEDEN AYRI DOSYA

   Müşteri uygulaması ve backoffice kendi haberlerini kendi
   dosyalarında üretiyor; servisin haber alması gereken şeyler ikisine
   de benzemiyor. Bildirimin NASIL gösterildiği ortak
   (`src/lib/bildirim.js`): telefonda Android'in bildirim perdesi,
   tarayıcıda tarayıcının kendi bildirimi. Burada yalnız NE ZAMAN
   gösterileceği yazıyor.

   SERVİSİN HABER BEKLEDİĞİ DÖRT ŞEY

     YENİ İŞ        kendisine bir talep düştü. Sabah uygulamayı
                    açmadan önce bilmek istiyor.
     PARÇA YOLDA    istediği parça kargoya verildi. Bu haber doğrudan
                    bir işe dönüşüyor: parça gelince makineye gidecek.
     PARA           hak edişi onaylandı ya da reddedildi. Servisin bu
                    uygulamada en çok merak ettiği şey.
     ACİL DUYURU    geri çağırma ve uyarı. Bunlar duyuru değil iş
                    emri: "bu makineleri arayıp servise çağırın".

   Kampanya ve fuar duyurusu bildirim ÜRETMİYOR. Tarlada çalışan bir
   ustanın telefonunu çaldıran şey, telefonunu çaldırmayı hak etmeli;
   yoksa bir süre sonra bütün bildirimler kapatılıyor.

   BUGÜNKÜ SINIR

   Veri tarayıcının kendi hafızasında ve uygulama açıkken kontrol
   ediliyor. Uygulama kapalıyken haber gönderebilmek için sunucu ve
   Firebase gerekiyor (bkz. CANLIYA-CIKIS.md). O geldiğinde bu
   dosyadaki sayaç yerine sunucunun kendi haberi gelecek; gösterme
   tarafı değişmeyecek.
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
       verilmiyor, listede zaten görünüyor. */
    isler: talepler.filter((t) => !t.servisSiparisi).map((t) => t.id),
    /* Kargoya verilen parçalar: talebin üstünde `parcaSevk` doğduğu an
       servisin haberi olmalı. */
    sevk: talepler.filter((t) => t.parcaSevk).map((t) => t.id),
    onayli: talepler.filter((t) => t.hakkedis?.durum === 'onaylandi').map((t) => t.id),
    redli: talepler.filter((t) => t.hakkedis?.durum === 'reddedildi').map((t) => t.id),
  }
}

/** Servise yönelmiş, henüz görülmemiş acil duyurular. */
function acilDuyurular(oturum) {
  const gorulen = new Set(load(GORULEN_DUYURU, []))
  return load('duyurular', [])
    .filter((d) => d.tur === 'uyari' && !gorulen.has(d.id))
    .filter((d) => duyuruGecerliMi(d, { servis: oturum }))
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
          baslik: `${sayili(yeniIs, 'yeni iş', 'Yeni iş')} · ${MARKA}`,
          metin: 'İşlerim listenize düştü.',
        })
      }

      const yeniSevk = artan(yeni.sevk, eski.sevk)
      if (yeniSevk) {
        bildirimGoster({
          baslik: `${sayili(yeniSevk, 'parça', 'Parça')} yola çıktı`,
          metin: 'Parça elinize geçtiğinde takıp işi tamamlayabilirsiniz.',
        })
      }

      const yeniOnay = artan(yeni.onayli, eski.onayli)
      if (yeniOnay) {
        bildirimGoster({
          baslik: `${sayili(yeniOnay, 'kayıt', 'Kayıt')} onaylandı`,
          metin: 'Tutar hesabınıza eklendi.',
        })
      }

      const yeniRed = artan(yeni.redli, eski.redli)
      if (yeniRed) {
        bildirimGoster({
          baslik: `${sayili(yeniRed, 'kayıt', 'Kayıt')} kabul edilmedi`,
          metin: 'Gerekçeyi talebin içinde görebilirsiniz.',
        })
      }

      const yeniDuyuru = artan(yeni.duyuru, eski.duyuru)
      if (yeniDuyuru) {
        bildirimGoster({
          baslik: `${MARKA} uyarısı`,
          metin: 'İşlerim ekranının üst bölümünde okuyabilirsiniz.',
        })
      }

      if (yeniIs || yeniSevk || yeniOnay || yeniRed || yeniDuyuru) tazele()

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
