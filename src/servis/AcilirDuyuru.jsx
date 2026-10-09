import { useCallback, useEffect, useRef, useState } from 'react'
import { DuyuruPenceresi } from '../components/DuyuruPenceresi'
import { altBilgi } from '../data/duyuruTurleri'
import { duyuruGorulduSay, gorulenDuyurular, servisDuyurulari } from './talepBildirimleri'
import { useGeri } from './geri'

/* ==========================================================================
   Yeni duyuru penceresi — Servisim'in tarafı (9 Ekim 2026)

   KULLANICININ İSTEĞİ: "Yeni bir duyuru yapıldığında Servisim'de de
   bildirim ekrana gelebilsin Connect'teki gibi." Önce Servisim'de duyuru
   yalnız İşlerim'in en üstünde şerit (acil olanlar) ya da listenin
   altında kapalı satır (ötekiler) ve Bildirimler ekranındaydı; kampanya,
   yeni ürün ve etkinlik duyurusunu servis ancak aşağı inip açarsa
   görüyordu.

   Çizim Connect'le ortak (components/DuyuruPenceresi.jsx). Kural da
   Connect'teki gibi:
     · Görülmemiş bir pencere duyurusu varsa açılıyor; uygulama açıkken
       yeni duyuru gelirse (yeni haber, başka sekmenin yazdığı: `surum`)
       de açılıyor.
     · Pencerede yayındaki bütün servis duyuruları var: önce
       görülmemişler, sonra görülenler.
     · Ekrana gelen duyuru görülmüş sayılıyor. Anahtar Servisim'in
       duyuru anahtarı (talepBildirimleri.js → GORULEN_DUYURU): İşlerim'in
       acil şeridi ve Bildirimler ekranının okunmamış sayısı aynı bilgiye
       bakıyor; pencerede görülen uyarı şeritten "Uyarılar" satırına
       iniyor.
     · Yalnız sekmelerin ana ekranında (ServisPanel → Kabuk). Servis kaydı
       yazarken, sipariş verirken ya da bir işin ayrıntısındayken araya
       girmiyor: sahada yarım kalan bir kayıt, kaçırılan bir duyurudan
       pahalı. O ekranlardan dönünce açılıyor.
     · Android geri tuşu pencereyi kapatıyor (geri.jsx).
   ========================================================================== */

const GUN = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })

const YAZI = {
  kapat: 'Kapat',
  onceki: 'Önceki',
  sonraki: 'Sonraki',
  anladim: 'Anladım',
  tumu: 'Tüm Bildirimler',
  yeni: 'Yeni',
  nokta: (n) => `${n}. duyuru`,
  pencere: (d) => (altBilgi(d).ust === 'uyari' ? 'Önemli Uyarı' : 'PAKSAN Duyurusu'),
}

/**
 * @param {object} p
 * @param {object} p.oturum  servis oturumu
 * @param {number} p.surum   ServisPanel'in tazeleme sayacı
 * @param {() => void} p.onBildirimler  Bildirimler ekranını açar
 * @param {() => void} p.onKapandi  üst çubuktaki sayı tazelensin, çift dokunuş yutulsun
 */
export function AcilirDuyuru({ oturum, surum, onBildirimler, onKapandi }) {
  const [pencere, setPencere] = useState(null)
  /* Bu açılışta gösterilmiş duyurular: yarıda kapatılan pencere aynı
     oturumda yeniden açılmasın; yalnız yeni gelen duyuru açsın. */
  const bilinen = useRef(new Set())

  useEffect(() => {
    if (pencere) return
    const gorulen = gorulenDuyurular()
    const yayinda = servisDuyurulari(oturum)
    const yeniler = yayinda.filter((d) => !gorulen.has(d.id))
    if (!yeniler.some((d) => d.pencere && !bilinen.current.has(d.id))) return
    yayinda.forEach((d) => bilinen.current.add(d.id))
    setPencere({
      duyurular: [...yeniler, ...yayinda.filter((d) => gorulen.has(d.id))],
      yeni: new Set(yeniler.map((d) => d.id)),
    })
  }, [oturum, surum, pencere])

  const kapat = useCallback(() => {
    setPencere(null)
    onKapandi?.()
  }, [onKapandi])
  useGeri(Boolean(pencere), kapat)

  if (!pencere) return null

  return (
    <DuyuruPenceresi
      duyurular={pencere.duyurular}
      yeniMi={(d) => pencere.yeni.has(d.id)}
      yazi={YAZI}
      turAdi={(d) => altBilgi(d).ad}
      tarih={(d) => GUN.format(new Date(d.tarih))}
      onGoster={(d) => duyuruGorulduSay([d.id])}
      onKapat={kapat}
      onTumu={() => {
        kapat()
        onBildirimler()
      }}
    />
  )
}
