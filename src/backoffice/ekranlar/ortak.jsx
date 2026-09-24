/* Backoffice ekranlarının paylaştığı küçük parçalar. */

import { useCallback, useState } from 'react'
import { durumBilgi, gorunenDurum } from '../veri'

export function tarihYaz(zaman, saatli = true) {
  if (!zaman) return '—'
  const d = new Date(zaman)
  const t = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!saatli) return t
  return `${t} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
}

/* Excel'e giderken tarih ve saat AYRI sütunlara yazılıyor.

   Tek hücrede "21.08.2026 14:35" duruyordu; Excel bunu düz metin
   sayıyor, tarihe göre süzmek ya da ay bazında pivot almak
   çalışmıyordu. İki değer döndürüp iki sütuna yazmak yeterli.

   Boş zaman için ikisi de "—": sütun sayısı hiç değişmemeli, yoksa
   satırlar kayıyor. */
export function tarihSaat(zaman) {
  if (!zaman) return ['—', '—']
  return [tarihYaz(zaman, false), saatYaz(zaman)]
}

/** Yalnız saat: "14:35" */
export function saatYaz(zaman) {
  if (!zaman) return ''
  return new Date(zaman).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

/** Listede tarihten çabuk okunuyor: "3 saat önce" */
export function gecenSure(zaman) {
  if (!zaman) return '—'
  const dk = Math.floor((Date.now() - zaman) / 60000)
  if (dk < 1) return 'az önce'
  if (dk < 60) return `${dk} dakika önce`
  const sa = Math.floor(dk / 60)
  if (sa < 24) return `${sa} saat önce`
  const gun = Math.floor(sa / 24)
  if (gun < 30) return `${gun} gün önce`
  return tarihYaz(zaman, false)
}

/* PARÇA YOLDA — durum değil, durumun alt hâli (10 Eylül 2026).

   Parça gönderildikten sonra talep `parcaBekliyor` durumunda kalıyor:
   iş, servis parçayı takıp kaydı tamamlayana kadar açık. Rozet aynı
   kalınca personel "Parçayı Gönderdim" dediği hâlde talebin
   güncellenmediğini sanıyordu (kullanıcı).

   24 Eylül 2026'dan beri süzgeç de bu ayrımı yapıyor ve ad tek yerden
   geliyor: veri.js → gorunenDurum ("Parça Hazırlanıyor" / "Parça
   Yolda"). Önce süzgeç ayırmıyordu; "Parça Bekleniyor" seçilince iki
   ayrı rozet listeleniyordu. */
export function durumYazisi(talep) {
  return gorunenDurum(talep).ad
}

export function DurumRozet({ durum, talep }) {
  const d = talep ? gorunenDurum(talep) : durumBilgi(durum || 'yeni')
  return <span className={'rz rz--' + d.ton}>{d.ad}</span>
}

export function Baslik({ ad, sag }) {
  return (
    <div className="baslik">
      <h1>{ad}</h1>
      {sag && <div className="baslik__sag">{sag}</div>}
    </div>
  )
}

export function Bos({ metin }) {
  return <div className="bos">{metin}</div>
}

/* Veri gelene kadar duran gri iskelet.

   Boş ekran yerine iskelet gösteriliyor: kullanıcı "kayıt yok" mu
   "yükleniyor" mu ayırt edebilsin. Sunucu bağlandığında bu bekleme
   gerçekten görünür olacak. */
export function Bekleme({ satir = 4 }) {
  return (
    <div className="bekle" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: satir }).map((_, i) => (
        <div key={i} className="bekle__satir" />
      ))}
    </div>
  )
}

export function BeklemeKart({ satir = 4 }) {
  return (
    <div className="kart">
      <Bekleme satir={satir} />
    </div>
  )
}

/* ==========================================================================
   Tablo sıralama

   Backoffice’te bir liste hep aynı sırada geliyordu ve başka bir sıra
   gerektiğinde yapılacak bir şey yoktu: "en eski bekleyen talep
   hangisi", "hangi serviste en çok makine var", "kim en çok talep
   kapatmış" sorularının cevabı ekrandaydı ama bulunması gözle tarama
   gerektiriyordu.

   Sütun başlığına tıklanınca o sütuna göre sıralanıyor; tekrar
   tıklanınca yön dönüyor.

   NASIL KULLANILIYOR

     const { siralama, cevir } = useSiralama('createdAt', 'azalan')

     <SiraliBaslik ad="Tarih / saat" alan="createdAt"
                   siralama={siralama} onSirala={cevir} />

     const liste = siraliListe(kayitlar, siralama, {
       createdAt: (t) => t.createdAt,
       ad: (t) => t.ad,
     })

   DEĞER FONKSİYONLARI sıralamanın neye baktığını belirliyor. Ekranda
   "3 saat önce" yazan sütun aslında bir zaman damgası; metne göre
   sıralamak anlamsız olurdu. Sayı sayı gibi, tarih tarih gibi, yazı
   Türkçe alfabeye göre sıralanıyor.
   ========================================================================== */

/**
 * @param {string} varsayilanAlan açılışta hangi sütuna göre sıralı
 * @param {'artan'|'azalan'} varsayilanYon
 */
export function useSiralama(varsayilanAlan = null, varsayilanYon = 'azalan') {
  const [siralama, setSiralama] = useState({ alan: varsayilanAlan, yon: varsayilanYon })

  const cevir = useCallback((alan) => {
    setSiralama((s) => {
      /* Aynı sütuna ikinci tık yönü çeviriyor. Başka bir sütuna
         geçildiğinde yön varsayılana dönüyor: tarihte "en yeni önce",
         yazıda "A'dan Z'ye" beklenen davranış. */
      if (s.alan === alan) {
        return { alan, yon: s.yon === 'artan' ? 'azalan' : 'artan' }
      }
      return { alan, yon: 'artan' }
    })
  }, [])

  return { siralama, cevir }
}

/** Tıklanabilir sütun başlığı. */
/* `sag`: sayı sütunlarında başlık da sağa dayanıyor. Başlık solda,
   rakamlar sağda kalınca sütun kaymış görünüyordu (kullanıcı bildirdi,
   18.09.2026). Hizalamayı ekranın kendi CSS'i tamamlıyor
   (`… th.sag .th-sirala { justify-content: flex-end }`). */
export function SiraliBaslik({ ad, alan, siralama, onSirala, genislik, sag = false }) {
  const secili = siralama?.alan === alan
  const yon = secili ? siralama.yon : null

  return (
    <th className={sag ? 'sag' : undefined} style={genislik ? { width: genislik } : undefined}>
      <button
        type="button"
        className={'th-sirala' + (secili ? ' th-sirala--on' : '')}
        onClick={() => onSirala(alan)}
        title={secili && yon === 'artan' ? 'Ters sırala' : 'Bu sütuna göre sırala'}
      >
        {ad}
        <span className="th-sirala__ok" aria-hidden="true">
          {secili ? (yon === 'artan' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  )
}

/* ==========================================================================
   Sayfalama

   Uzun liste tek sayfada çizilmiyor. 200 talep olsa 200 satırın hepsi
   birden ekrana basılıyordu; aranan kayıt bitmeyen bir kaydırmanın
   içinde kayboluyordu (kullanıcı isteği, 10 Eylül 2026: 50 kayıtta bir
   sayfa, geçiş düğmeleri listenin hem başında hem sonunda).

   Numaralar kısaltılıyor: ilk sayfa, son sayfa, bulunulan sayfa ve iki
   komşusu görünüyor; aradakiler üç nokta oluyor. Tek sayfalık listede
   hiçbir şey çizilmiyor.

   ÇUBUK SAYFA DEĞİŞİNCE YERİNDEN OYNAMIYOR (17 Eylül 2026). Önceden
   ilk sayfada 4, ortada 7 öğe çıkıyordu; sağa yaslı grup genişleyip
   daralınca tıklanan numara imlecin altından kayıyordu. Artık yedi
   sayfadan uzun listede her zaman yedi yer var (baştayken 1–5 … son,
   sondayken 1 … son beş), üç nokta bir numara genişliğinde, numara
   düğmeleri en uzun sayfa numarasına göre eşit genişlikte ve "1–50 /
   237" yazısı en uzun hâlinin yerini baştan ayırıyor. */
export function Sayfalama({ sayfa, sayfaSayisi, toplam, boy, birim, onDegis, alt = false }) {
  if (sayfaSayisi <= 1) return null
  const bas = sayfa * boy + 1
  const son = Math.min(toplam, (sayfa + 1) * boy)

  const YER = 7
  let numaralar
  if (sayfaSayisi <= YER) {
    numaralar = Array.from({ length: sayfaSayisi }, (_, i) => i)
  } else if (sayfa <= 3) {
    numaralar = [0, 1, 2, 3, 4, 'bosluk-son', sayfaSayisi - 1]
  } else if (sayfa >= sayfaSayisi - 4) {
    const k = sayfaSayisi
    numaralar = [0, 'bosluk-bas', k - 5, k - 4, k - 3, k - 2, k - 1]
  } else {
    numaralar = [0, 'bosluk-bas', sayfa - 1, sayfa, sayfa + 1, 'bosluk-son', sayfaSayisi - 1]
  }

  const hane = String(sayfaSayisi).length
  const enUzunBilgi = `${toplam}–${toplam} / ${toplam} ${birim}`.length

  return (
    <nav
      className={'sayfalama' + (alt ? ' sayfalama--alt' : '')}
      aria-label="Sayfa geçişi"
      style={{ '--sayfa-hane': hane, '--sayfa-bilgi': enUzunBilgi }}
    >
      <span className="sayfalama__bilgi">
        {bas}–{son} / {toplam} {birim}
      </span>
      <div className="sayfalama__dugmeler">
        <button
          type="button"
          className="dg dg--kucuk"
          disabled={sayfa === 0}
          onClick={() => onDegis(sayfa - 1)}
        >
          Önceki
        </button>
        {numaralar.map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="sayfalama__bosluk" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={'dg dg--kucuk sayfalama__no' + (n === sayfa ? ' sayfalama__no--on' : '')}
              aria-current={n === sayfa ? 'page' : undefined}
              aria-label={`Sayfa ${n + 1}`}
              onClick={() => onDegis(n)}
            >
              {n + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className="dg dg--kucuk"
          disabled={sayfa >= sayfaSayisi - 1}
          onClick={() => onDegis(sayfa + 1)}
        >
          Sonraki
        </button>
      </div>
    </nav>
  )
}

/* Boş değerler HER ZAMAN SONDA.

   Yönü ne olursa olsun: "İl" sütununa göre sıralayan kişi illeri
   görmek istiyor, ili yazılmamış kayıtları değil. Ters çevirince
   ekranın tepesi boş satırlarla dolmamalı. */
function karsilastir(a, b) {
  const aBos = a === null || a === undefined || a === ''
  const bBos = b === null || b === undefined || b === ''
  if (aBos && bBos) return 0
  if (aBos) return 1
  if (bBos) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' || typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0)

  return String(a).localeCompare(String(b), 'tr', { numeric: true, sensitivity: 'base' })
}

/**
 * @param {Array} liste
 * @param {{alan, yon}} siralama
 * @param {Object} degerler { alanAdi: (satir) => karşılaştırılacak değer }
 */
export function siraliListe(liste, siralama, degerler) {
  if (!siralama?.alan) return liste
  const al = degerler[siralama.alan]
  if (!al) return liste

  /* Kopya üzerinde: sort yerinde çalışıyor, gelen diziyi bozmamalı. */
  const kopya = [...liste]
  kopya.sort((x, y) => {
    const fark = karsilastir(al(x), al(y))
    /* Boş değerler yön ne olursa olsun sonda kalsın diye, boşluk
       karşılaştırmasının sonucu ters çevrilmiyor. */
    const xBos = bosMu(al(x))
    const yBos = bosMu(al(y))
    if (xBos !== yBos) return fark
    return siralama.yon === 'artan' ? fark : -fark
  })
  return kopya
}

function bosMu(v) {
  return v === null || v === undefined || v === ''
}

/* ==========================================================================
   Hazır tablo hücresinden sıralanabilir değer

   Raporlar ekranındaki tablolar hücrelerini yazı olarak üretiyor:
   "1.850.000", "%12", "3 gün", "20.08.2026 13:03". Bunları yazı gibi
   sıralamak yanlış sonuç verir — "1.850.000" ile "900.000"i yan yana
   koyarsanız yazı sırasına göre birincisi küçük çıkar.

   Burada hücrenin ne olduğu anlaşılmaya çalışılıyor:

     1. Türkçe tarih (gg.aa.yyyy, saatiyle veya saatsiz) → zaman
     2. Tamamen sayı (nokta ayraçlı, %'li, para birimli) → sayı
     3. Geri kalan → yazı, Türkçe alfabeye göre

   "Orkinos 1270" gibi içinde sayı GEÇEN ama sayı OLMAYAN değerler
   ikinci kurala takılmıyor; yazı olarak sıralanıyor ve doğru yer
   buluyor.
   ========================================================================== */

const TARIH_KALIBI = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/

export function hucreDegeri(deger) {
  if (deger === null || deger === undefined) return null
  if (typeof deger === 'number') return deger

  const metin = String(deger).trim()
  if (!metin || metin === '—') return null

  const tarih = metin.match(TARIH_KALIBI)
  if (tarih) {
    const [, gun, ay, yil, saat = '00', dakika = '00'] = tarih
    return new Date(+yil, +ay - 1, +gun, +saat, +dakika).getTime()
  }

  /* SÜRE saate çevriliyor: "45 dk", "37 sa", "2,9 gün", "5 gündür".
     Raporlar süreyi büyüklüğüne göre farklı birimle yazıyor; yazı gibi
     sıralanınca "2,0 gün" (48 saat) "27 sa"dan önce geliyordu. */
  const sure = metin.match(/^(-?\d+(?:,\d+)?)\s*(dk|sa|gün|gündür)$/)
  if (sure) {
    const n = Number(sure[1].replace(',', '.'))
    return sure[2] === 'dk' ? n / 60 : sure[2] === 'sa' ? n : n * 24
  }

  /* BİNLİK NOKTASI GERÇEKTEN SİLİNİYOR (17 Eylül 2026). Aşağıdaki
     düzenli ifadede `\b` yerine görünmez bir kontrol karakteri (0x08)
     yazılı kalmıştı; nokta hiç silinmiyor, "10.480" 10,48 diye, iki
     noktalı "8.730.000" yazı diye sıralanıyordu. Bütün backoffice
     tablolarında para ve binlik sayı sütunları yanlış sıralanıyordu.

     Binlik noktası, yüzde işareti, para birimi ve boşluk atılıyor;
     ondalık virgül noktaya çevriliyor. Geriye yalnız rakam kaldıysa
     bu bir sayıdır. */
  const temiz = metin
    .replace(/[%\s]/g, '')
    .replace(/\.(?=\d{3}(?!\d))/g, '')
    .replace(',', '.')
  if (/^-?\d+(\.\d+)?$/.test(temiz)) return Number(temiz)

  return metin
}

/** Hazır satır dizilerini sütun sırasına göre sıralar. */
export function siraliSatirlar(satirlar, siralama) {
  if (siralama?.alan === null || siralama?.alan === undefined) return satirlar
  const i = Number(siralama.alan)
  if (Number.isNaN(i)) return satirlar

  const kopya = [...satirlar]
  kopya.sort((a, b) => {
    const x = hucreDegeri(a[i])
    const y = hucreDegeri(b[i])
    const fark = karsilastir(x, y)
    if (bosMu(x) !== bosMu(y)) return fark
    return siralama.yon === 'artan' ? fark : -fark
  })
  return kopya
}

/* ---------------------------------------------------- Açılır kart başlığı

   Hizmet ücretleri ve servis iskontosu kartları kapalı açılıyor. Başlık
   tek bir düğme: adı, kapalıyken okunacak özet ve ok. Düğme başlığın
   İÇİNDE (h2 > button); ekran okuyucu onu hem başlık hem açılır düğme
   olarak tanıyor. Okun yanında yazı var: ikon tek başına anlam taşımıyor.

   İlk kullanan: Servisler ekranındaki Hizmet Ücretleri ve Yedek Parça
   Kataloğu'ndaki Servis iskontosu (23 Eylül 2026, kullanıcının isteği:
   "çok yer kaplıyor … kalan kısım gerektiğinde açılsın"). */

export const ACILIR = { ac: 'Ayrıntıları Göster', kapat: 'Ayrıntıları Gizle' }

/* Ok ikonu: açık kartta yukarı döner (CSS). Duyurular'daki hedefleme
   kutuları da kullanıyor. */
export function AcilirOk() {
  return (
    <svg className="acilir-tepe__ok" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AcilirTepe({ baslik, ozet, acik, onDegis, govdeId }) {
  const parcalar = (ozet || []).filter(Boolean)
  return (
    <div className="kart__tepe acilir-tepe">
      <h2 className="acilir-tepe__baslik">
        <button
          type="button"
          className="acilir-tepe__dugme"
          aria-expanded={acik}
          aria-controls={govdeId}
          onClick={() => onDegis(!acik)}
        >
          <span className="acilir-tepe__ad">{baslik}</span>
          {parcalar.length > 0 && (
            <span className="acilir-tepe__ozet">
              {parcalar.map((p) => (
                <span key={p} className="acilir-tepe__cip">{p}</span>
              ))}
            </span>
          )}
          <span className="acilir-tepe__ac">
            {acik ? ACILIR.kapat : ACILIR.ac}
            <AcilirOk />
          </span>
        </button>
      </h2>
    </div>
  )
}
