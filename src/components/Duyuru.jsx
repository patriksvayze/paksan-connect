import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'
import { duyuruGecerliMi, personelDuyurusuMu } from '../lib/duyuruHedef'
import { makinelereServisEkle } from '../lib/servisAtama'
import { yurtdisiTalepMi } from '../lib/ihracat'
import { useGeriYakala } from '../lib/geriYakala'
import { altBilgi } from '../data/duyuruTurleri'
import { DuyuruPenceresi } from './DuyuruPenceresi'

/* ==========================================================================
   Duyuru penceresi — Connect'in tarafı

   NEDEN PENCERE

   Duyuru yalnız Bildirimler listesinde dursaydı kimse görmezdi: o
   listeye kendiliğinden bakan kullanıcı yok. Kampanya ya da güvenlik
   uyarısı yapılıyorsa görülmesi gerekiyor.

   NEDEN YALNIZ PENCERE DEĞİL

   Pencereyi kapatan kişi bir daha ulaşamasın istemiyoruz. Bu yüzden
   duyuru iki yerde birden: burada pencere olarak, sonrasında Bildirimler
   listesinde kalıcı olarak.

   HANGİSİ KİME GİDİYOR

     duyuru → kampanya, yeni ürün. YALNIZ izin verene gidiyor. Ticari
              elektronik ileti kuralı (6563) bunu şart koşuyor.
     uyari  → güvenlik uyarısı, geri çağırma. Herkese gidiyor; hizmete
              ilişkin bildirim ticari ileti sayılmıyor ve zaten
              görülmemesi tehlikeli.

   NE ZAMAN AÇILIYOR, NEYİ GÖSTERİYOR (9 Ekim 2026, kullanıcının isteği:
   "yayında daha fazla duyuru varsa o duyurular arasında geçiş de
   yapabilsin")
     · Görülmemiş bir pencere duyurusu varsa açılıyor. Uygulama açıkken
       yeni duyuru gelirse de (başka sekmede yayımlandı, sekmeye
       dönüldü) açılıyor.
     · Pencerede yayındaki BÜTÜN duyurular var: önce görülmemişler, sonra
       daha önce görülenler, ikisi de yeniden eskiye. Önce yalnız
       görülmemişler vardı, "Sonraki" ile tek yönde ilerleniyordu.
     · Bir duyuru ekrana geldiği an görülmüş sayılıyor. Yarıda kapatan
       kişinin göremediği duyuru bir sonraki açılışta yine gelir.
     · Çizim ortak bileşende (DuyuruPenceresi.jsx), Servisim de aynısını
       kullanıyor.

   GÖRÜLDÜ BİLGİSİ okundu bilgisinden AYRI tutuluyor: pencerede görmek
   duyuruyu okundu saymıyor, Bildirimler listesinde mavi noktası duruyor.
   Kapatan kişi "sonra bakarım" demiş olabilir.
   ========================================================================== */

const ANAHTAR = 'gorulenDuyurular'

export function Duyuru() {
  const nav = useNavigate()
  const { user, machines } = useApp()
  const { t, dil } = useDil()
  /* Açık pencerenin duyuruları ve açıldığı andaki "görülmemiş" kümesi:
     rozet pencere açıkken yerinde kalsın (sayfa görülünce depo değişiyor). */
  const [pencere, setPencere] = useState(null)
  const [tazelik, setTazelik] = useState(0)
  /* Bu açılışta pencerede gösterilmiş duyurular. Yarıda kapatılan
     pencere, görülmemiş duyuru kaldı diye hemen yeniden açılmasın: aynı
     oturumda yalnız YENİ gelen duyuru açıyor; kalanlar bir sonraki
     açılışta. */
  const bilinen = useRef(new Set())

  /* Başka sekmede yayımlanan duyuru ya da uygulamaya dönüş. */
  useEffect(() => {
    const tazele = () => setTazelik((n) => n + 1)
    window.addEventListener('storage', tazele)
    window.addEventListener('focus', tazele)
    return () => {
      window.removeEventListener('storage', tazele)
      window.removeEventListener('focus', tazele)
    }
  }, [])

  useEffect(() => {
    if (!user || pencere) return
    const gorulen = new Set(load(ANAHTAR, []))
    /* Kime gideceği kararı tek yerde: src/lib/duyuruHedef.js. Kampanya
       izni, yurtdışı ve hedefleme kuralları orada. */
    const yayinda = load('duyurular', [])
      .filter((d) => personelDuyurusuMu(d))
      .filter((d) =>
        duyuruGecerliMi(d, {
          user,
          /* Makineye bakan servis de ekleniyor: servis seçilmiş duyuru
             o servisin baktığı makinelerin sahiplerine gidiyor. */
          makineler: makinelereServisEkle(machines),
          yurtdisi: yurtdisiTalepMi(user),
        }),
      )
      .sort((a, b) => b.tarih - a.tarih)
    const yeniler = yayinda.filter((d) => !gorulen.has(d.id))
    if (!yeniler.some((d) => d.pencere && !bilinen.current.has(d.id))) return
    yayinda.forEach((d) => bilinen.current.add(d.id))
    setPencere({
      duyurular: [...yeniler, ...yayinda.filter((d) => gorulen.has(d.id))],
      yeni: new Set(yeniler.map((d) => d.id)),
    })
  }, [user, machines, tazelik, pencere])

  const kapat = useCallback(() => setPencere(null), [])
  useGeriYakala(Boolean(pencere), kapat)

  const gunYazisi = useMemo(
    () => new Intl.DateTimeFormat(dil === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long' }),
    [dil],
  )

  if (!pencere) return null

  return (
    <DuyuruPenceresi
      duyurular={pencere.duyurular}
      yeniMi={(d) => pencere.yeni.has(d.id)}
      yazi={{
        kapat: t('duyuru.kapat'),
        onceki: t('duyuru.onceki'),
        sonraki: t('duyuru.sonraki'),
        anladim: t('duyuru.anladim'),
        tumu: t('duyuru.tumBildirimler'),
        yeni: t('duyuru.yeni'),
        nokta: (n) => t('duyuru.nokta', { n }),
        /* Pencerenin adı ÜST türü söylüyor, kapaktaki etiket alt türü. */
        pencere: (d) => (altBilgi(d).ust === 'uyari' ? t('duyuru.uyariBaslik') : t('duyuru.baslik')),
      }}
      turAdi={(d) => t(altBilgi(d).anahtar)}
      tarih={(d) => gunYazisi.format(new Date(d.tarih))}
      onGoster={(d) => save(ANAHTAR, [...new Set([...load(ANAHTAR, []), d.id])])}
      onKapat={kapat}
      onTumu={() => {
        kapat()
        nav('/bildirimler')
      }}
    />
  )
}
