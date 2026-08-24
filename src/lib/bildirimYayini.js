import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { bildirimGoster, dokunmayiDinle, mevcutIzin, BILDIRIM } from './bildirim'
import { load, save } from './storage'

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
 */
export function useBildirimYayini(liste, t, acik) {
  const nav = useNavigate()

  /* Aynı kare içinde iki kez çalışmasın; StrictMode geliştirmede her
     etkiyi iki kez kuruyor. */
  const calisiyor = useRef(false)

  useEffect(() => {
    if (!acik || !liste?.length || calisiyor.current) return
    calisiyor.current = true

    let iptal = false

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
        save(ANAHTAR, [...yayinlanan, ...yeniler.map((b) => b.id)].slice(-200))

        if (ilkKez) return

        /* En yeniden eskiye; perdede de o sırayla dursunlar diye
           gösterirken ters çevriliyor. */
        const cikacaklar = yeniler
          .filter((b) => b.tarih >= sinir)
          .slice(0, EN_COK)
          .reverse()

        for (const b of cikacaklar) {
          if (iptal) return
          await bildirimGoster({
            baslik: yaz(b.baslik, b.baslikAnahtar, b.degerler, t),
            metin: yaz(b.metin, b.metinAnahtar, b.degerler, t),
            yol: b.yol || '/bildirimler',
          })
        }
      } finally {
        calisiyor.current = false
      }
    })()

    return () => {
      iptal = true
    }
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

/* Personelin elle yazdığı duyuru hazır metin taşıyor; uygulamanın kendi
   ürettiği bildirim sözlük anahtarı taşıyor. İkisi de gelebilir. */
function yaz(hazir, anahtar, degerler, t) {
  if (hazir) return hazir
  if (anahtar) return t(anahtar, degerler)
  return ''
}
