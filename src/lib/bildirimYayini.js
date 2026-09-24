import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { bildirimGoster, dokunmayiDinle, mevcutIzin, BILDIRIM } from './bildirim'
import { load, save } from './storage'
import { bildirimYazisi } from './bildirimler'

/* ==========================================================================
   Bildirimleri telefonun perdesine düşürmek

   Uygulamanın içinde bir "Bildirimler" ekranı vardı ama telefonun kendi
   bildirim perdesinde hiçbir şey çıkmıyordu. Yani PAKSAN bir duyuru
   geçtiğinde müşteri ancak uygulamayı KENDİ açtığında görüyordu —
   bildirimin varlık sebebi tam da bunun tersi.

   Burası o boşluğu kapatıyor: uygulama, Bildirimler ekranında yeni bir
   satır gördüğünde aynısını telefonun bildirim perdesine de koyuyor.

   BİR BİLDİRİM BİR KEZ ÇIKAR

   Hangi satırların perdeye düştüğü kayıt altında (`yayinlananBildirimler`).
   Olmasaydı uygulama her açıldığında aynı duyuru yeniden çıkardı;
   iki günde bildirimleri kapatan bir kullanıcı olurdu.

   LİSTEDE DURAN SATIRIN KAYDI SİLİNMİYOR (22 Eylül 2026). Kayıt 200
   satırla sınırlanıyordu: bildirim sayısı 200'ü geçince her açılışta
   birkaç satırın kaydı düşüyor, düşenler bir sonraki açılışta "yeni"
   sayılıp perdeye yeniden çıkıyordu. Kullanıcı hiçbir şey yapmadığı
   hâlde aynı "talebiniz alındı" bildirimi aralıklarla geliyordu.
   Tarayıcıda 210 talepli bir hesapla yeniden üretildi: her açılışta on
   kaydın yer değiştirdiği görüldü. Artık yalnız listeden çıkmış
   satırların kaydı budanıyor.

   ESKİLER SESSİZ GEÇER

   Uygulamayı ilk kurduğunda geçmişteki bütün bildirimler birden perdeye
   dökülmesin diye, kayıt boşken sadece işaretleniyor — gösterilmiyor.
   Aynı sebeple belli bir yaştan eski satırlar hiç gösterilmiyor: iki
   hafta önceki bir duyuru bugün "yeni bildirim" olarak çıkmamalı.

   UYGULAMA KAPALIYKEN

   Bunlar YEREL bildirim: uygulamanın kendisi koyuyor, dolayısıyla
   uygulama en az bir kez açılmış olmalı. Uygulama hiç açılmadan
   bildirim gitmesi için sunucu ve Firebase gerekiyor
   (bkz. PRODA-CIKIS.md → A1g). O geldiğinde bu dosya olduğu gibi
   kalıyor, yanına uzak bildirim ekleniyor.
   ========================================================================== */

const ANAHTAR = 'yayinlananBildirimler'

/* Bir bildirim en fazla bu kadar eskiyse perdeye düşer. */
const EN_ESKI_GUN = 3

/* Bir seferde en fazla kaç bildirim çıksın.

   Bir hafta uygulamayı açmayan kullanıcıya on iki bildirim birden
   dökülürse hiçbirini okumuyor, hepsini birden siliyor. Fazlası
   uygulamanın içindeki listede zaten duruyor. */
const EN_COK = 3

/**
 * Yeni bildirimleri telefonun bildirim perdesine koyar.
 *
 * @param {array} liste  bildirimListesi() çıktısı
 * @param {(anahtar: string, degerler?: object) => string} t  sözlük
 * @param {boolean} acik kullanıcı giriş yapmış mı
 * @param {string} dil  talep türünün adı cümleye bu dile göre giriyor
 */
export function useBildirimYayini(liste, t, acik, dil) {
  const nav = useNavigate()

  /* Aynı kare içinde iki kez çalışmasın; StrictMode geliştirmede her
     etkiyi iki kez kuruyor. */
  const calisiyor = useRef(false)

  useEffect(() => {
    if (!acik || !liste?.length || calisiyor.current) return
    calisiyor.current = true

    /* İPTAL YOK. Önce etki temizlenince döngü duruyordu; ama satırlar o
       ana kadar "gösterildi" diye işaretlenmiş oluyordu ve bildirim hiç
       çıkmıyordu (geliştirmede her açılışta, telefonda liste o sırada
       değişirse). İşaretlenen her satır gösteriliyor; ikinci bir kopya
       `calisiyor` ile zaten engelli. */

    ;(async () => {
      try {
        if ((await mevcutIzin()) !== BILDIRIM.VERILDI) return

        const yayinlanan = load(ANAHTAR, [])
        const ilkKez = yayinlanan.length === 0
        const sinir = Date.now() - EN_ESKI_GUN * 86400000

        const yeniler = liste.filter((b) => !yayinlanan.includes(b.id))
        if (!yeniler.length) return

        /* Kayıt neyin çıktığını değil, neyin BİLİNDİĞİNİ tutuyor:
           yaşı geçtiği için gösterilmeyen satır da işaretleniyor,
           yoksa her açılışta yeniden değerlendirilirdi. */
        const listede = new Set(liste.map((b) => b.id))
        save(ANAHTAR, [
          /* Listeden çıkmış satırların en fazla yüzü: geri gelirse
             (duyuru yeniden hedeflendi gibi) ikinci kez çıkmasın. */
          ...yayinlanan.filter((id) => !listede.has(id)).slice(-100),
          ...yayinlanan.filter((id) => listede.has(id)),
          ...yeniler.map((b) => b.id),
        ])

        if (ilkKez) return

        /* En yeniden eskiye; perdede de o sırayla dursunlar diye
           gösterirken ters çevriliyor. */
        const cikacaklar = yeniler
          .filter((b) => b.tarih >= sinir)
          .slice(0, EN_COK)
          .reverse()

        for (const b of cikacaklar) {
          await bildirimGoster({
            baslik: b.baslik || bildirimYazisi(t, b, dil, 'baslikAnahtar'),
            metin: b.metin || bildirimYazisi(t, b, dil, 'metinAnahtar'),
            yol: b.yol || '/bildirimler',
          })
        }
      } finally {
        calisiyor.current = false
      }
    })()
    /* Liste her çizimde yeniden üretilen bir dizi; bağımlılığa
       konulsaydı etki durmadan yeniden çalışırdı. Uzunluğu yeterli
       işaret: yeni bildirim geldiğinde uzunluk değişiyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, liste?.length])

  /* Perdedeki bildirime dokunulunca ilgili ekran açılıyor. */
  useEffect(() => {
    let kaldir = () => {}
    let kaldirildi = false

    dokunmayiDinle((yol) => nav(yol)).then((f) => {
      if (kaldirildi) f()
      else kaldir = f
    })

    return () => {
      kaldirildi = true
      kaldir()
    }
  }, [nav])
}
