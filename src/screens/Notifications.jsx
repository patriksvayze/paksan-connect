import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { CIZIM } from '../marka/icerik/cizimler'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { talepTuru } from '../lib/talep'
import {
  bildirimListesi, bildirimleriAyir, tarihObegi, OBEK_SIRASI, BILDIRIM_TURU, bildirimYazisi,
} from '../lib/bildirimler'
import {
  IconBell, IconCheckCircle, IconAlert, IconRight, IconCalendar,
  IconMachine, IconTag, IconUndo,
} from '../components/Icons'
import { altBilgi } from '../data/duyuruTurleri'
import { talepSimgesi, talepSimgeAdi } from '../components/TalepSimgesi'

/* Bildirimler.

   Okunmamış satır beyaz zeminde ve solunda mavi nokta duruyor; okunmuş
   satır soluyor. Bildirim ekranlarının hepsinde olan düzen — kullanıcı
   neyin yeni olduğunu okumadan görüyor.

   "Tümünü okundu işaretle" başlıkta, yalnızca okunmamış varken.

   Satırlar tarihe göre öbekleniyor (bugün / dün / bu hafta / daha eski).

   Şu an tek bildirim kaynağı var: kullanıcının kendi oluşturduğu
   talepler. Duyuru ve uyarı türleri hazır ama sunucu bağlanmadan içerik
   üretmiyoruz — uydurma duyuru göstermektense hiç göstermemek doğru.  */

const IKONLAR = {
  [BILDIRIM_TURU.TALEP]: IconCheckCircle,
  [BILDIRIM_TURU.RANDEVU]: IconCalendar,
  [BILDIRIM_TURU.DUYURU]: IconBell,
  [BILDIRIM_TURU.UYARI]: IconAlert,
  [BILDIRIM_TURU.MAKINE]: IconMachine,
}

/* Duyuru alt türlerinin ikonları — tablodaki `ikon` adı burada
   bileşene bağlanıyor (bkz. src/data/duyuruTurleri.js). */
const ALT_IKONLAR = {
  etiket: IconTag,
  makine: IconMachine,
  takvim: IconCalendar,
  uyari: IconAlert,
  geri: IconUndo,
}

/* Marka renginin YAZI hâli kullanılıyor (--pk-x-yazi), ana rengi değil:
   ana renkler karanlık temada değişmiyor ve koyu kart üstünde
   okunmuyorlar (ölçüm: mavi 1,85 · yeşil 2,47). */
const RENKLER = {
  [BILDIRIM_TURU.TALEP]: { zemin: 'var(--pk-green-soft)', renk: 'var(--pk-green-yazi)' },
  [BILDIRIM_TURU.RANDEVU]: { zemin: 'var(--pk-orange-soft)', renk: 'var(--pk-orange-ink)' },
  [BILDIRIM_TURU.DUYURU]: { zemin: 'var(--pk-blue-soft)', renk: 'var(--pk-blue-yazi)' },
  [BILDIRIM_TURU.UYARI]: { zemin: 'var(--pk-orange-soft)', renk: 'var(--pk-orange-ink)' },
  [BILDIRIM_TURU.MAKINE]: { zemin: 'var(--pk-blue-soft)', renk: 'var(--pk-blue-yazi)' },
}

/* PAKSAN duyurusu mu, uygulamanın kendi bildirimi mi?

   Duyuru ve uyarı satırları alt türün rengiyle çıkıyor: kampanya ile
   güvenlik uyarısı listede aynı görünüyordu, ikisi de "duyuru" ikonu
   taşıyordu. Talep ve randevu bildirimleri kendi renklerinde kalıyor —
   onların alt türü yok. */
function duyuruSatiri(b) {
  return b.tur === BILDIRIM_TURU.DUYURU || b.tur === BILDIRIM_TURU.UYARI
}

export default function Notifications() {
  const nav = useNavigate()
  const { t, dil } = useDil()
  const {
    requests, user, machines, okunanBildirimler, bildirimOku, bildirimleriOku,
  } = useApp()

  /* Duyurunun kime gideceği src/lib/duyuruHedef.js içinde: kampanya
     izni, yurtdışı ve hedefleme kuralları orada. Makine listesi de
     geçiyor, çünkü duyuru modele ya da seri numarasına
     hedeflenebiliyor. */
  const liste = useMemo(
    () => bildirimListesi({ requests, user, makineler: machines }),
    [requests, user, machines]
  )
  const okunanSet = useMemo(() => new Set(okunanBildirimler), [okunanBildirimler])
  const okunmamis = liste.filter((b) => !okunanSet.has(b.id))

  /* Ekran açık kalırken yeni bildirim gelirse rozet düşmesin diye
     otomatik okundu işaretleme YOK; kullanıcı ya satıra dokunuyor ya da
     "tümünü okundu" diyor. */

  /* Yaklaşan randevu hatırlatması listenin İÇİNDE değil, ÜSTÜNDE.

     Önceden zamanı geleceğe kurulup listenin başına zorlanıyordu ve
     yeni gelen bildirim ikinci sıraya düşüyordu. Bildirim listesinde
     en üstteki satırın en yeni olması bir alışkanlık değil, beklenti;
     o bozulunca müşteri "bildirim gelmemiş" sanıp bakmayı bırakıyor.

     Hatırlatma artık ayrı bir kart: kendi başlığı var, "bildirim"
     gibi görünmüyor, listenin sırasına da karışmıyor. */
  const { sabitler, akis } = useMemo(() => bildirimleriAyir(liste), [liste])

  /* Öbeklere ayır — yalnız akış, sabitler hariç */
  const obekler = useMemo(() => {
    const o = {}
    for (const b of akis) {
      const ad = tarihObegi(b.tarih)
      ;(o[ad] = o[ad] || []).push(b)
    }
    return o
  }, [akis])

  useEffect(() => {
    /* Sayfa açıldığında en üste */
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="app">
      <TopBar
        title={t('bildirimler.baslik')}
        sub={okunmamis.length ? t('bildirimler.okunmamis', { n: okunmamis.length }) : null}
        back="auto"
        right={
          okunmamis.length > 0 ? (
            <button
              className="topbar__islem"
              onClick={() => bildirimleriOku(okunmamis.map((b) => b.id))}
            >
              {t('bildirimler.tumunuOku')}
            </button>
          ) : null
        }
      />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        {/* Yaklaşan randevu — listenin dışında, hatırlatma kartı */}
        {sabitler.length > 0 && (
          <div className="stack" style={{ marginBottom: 6 }}>
            {sabitler.map((b) => (
              <button
                key={b.id}
                className="randevu-kart"
                onClick={() => {
                  bildirimOku(b.id)
                  if (b.yol) nav(b.yol, { state: b.durum })
                }}
              >
                <span className="randevu-kart__ikon"><IconCalendar size={22} /></span>
                <span className="randevu-kart__body">
                  <span className="randevu-kart__ust">
                    {yaz(t, b, dil, 'baslikAnahtar')}
                  </span>
                  <span className="randevu-kart__ana">{b.degerler?.tarih}</span>
                  <span className="randevu-kart__alt">{b.degerler?.is}</span>
                </span>
                <span className="listitem__chev"><IconRight size={20} /></span>
              </button>
            ))}
          </div>
        )}

        {liste.length === 0 ? (
          <div className="empty">
            <img className="empty__cizim" src={CIZIM.bosBildirim} alt="" />
            <h2 style={{ fontSize: 19, marginTop: 12 }}>{t('bildirimler.bosBaslik')}</h2>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>{t('bildirimler.bosAlt')}</p>
          </div>
        ) : (
          OBEK_SIRASI.filter((ad) => obekler[ad]?.length).map((ad) => (
            <div key={ad}>
              <div className="eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>
                {t('bildirimler.' + ad)}
              </div>
              <div className="stack">
                {obekler[ad].map((b) => {
                  const duyurusu = duyuruSatiri(b)
                  const bilgi = duyurusu ? altBilgi(b) : null
                  /* Talep bildirimi talebin türüyle çiziliyor (29 Eylül
                     2026, C3): her "talebiniz alındı" satırında yeşil
                     onay işareti vardı, iş sürerken "bitti" gibi
                     görünüyordu. Tür, Taleplerim'deki simgeyle aynı. */
                  const talepSatiri = !bilgi && b.tur === BILDIRIM_TURU.TALEP
                  const Ikon = bilgi
                    ? ALT_IKONLAR[bilgi.ikon] || IconBell
                    : talepSatiri
                      ? talepSimgesi(b.degerler?.tur)
                      : IKONLAR[b.tur] || IconBell
                  const renk = RENKLER[b.tur] || RENKLER[BILDIRIM_TURU.DUYURU]
                  const okundu = okunanSet.has(b.id)
                  return (
                    <button
                      key={b.id}
                      className={'listitem bildirim' + (okundu ? ' bildirim--okundu' : '')}
                      style={{ alignItems: 'flex-start' }}
                      onClick={() => {
                        bildirimOku(b.id)
                        if (b.yol) nav(b.yol, { state: b.durum })
                      }}
                    >
                      <div
                        className={
                          'listitem__icon' +
                          (bilgi ? ' duyuru-ikon duyuru-ikon--' + bilgi.ton : '') +
                          (talepSatiri ? ' talep-simge talep-simge--' + talepSimgeAdi(b.degerler?.tur) : '')
                        }
                        style={bilgi || talepSatiri ? undefined : { background: renk.zemin, color: renk.renk }}
                      >
                        <Ikon size={22} />
                      </div>
                      <div className="listitem__body">
                        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                          <span className="listitem__title" style={{ fontSize: 15.5, flex: 1 }}>
                            {/* Backoffice’ten gelen bildirimin yazısı hazır;
                                uygulamanın kendi ürettiğinde sözlükten
                                geçiyor. */}
                            {b.baslik || yaz(t, b, dil, 'baslikAnahtar')}
                          </span>
                          {!okundu && <span className="bildirim__nokta" aria-hidden="true" />}
                        </div>
                        <div className="listitem__sub" style={{ marginTop: 3 }}>
                          {b.metin || yaz(t, b, dil, 'metinAnahtar')}
                        </div>
                        <div className="row" style={{ gap: 8, marginTop: 7 }}>
                          {/* Türün adı satırda yazıyor. İkon rengi tek
                              başına yetmiyordu: renk körlüğü bir yana,
                              müşteri "Kampanya mı, uyarı mı?" sorusunu
                              metni okumadan cevaplayabilmeli. */}
                          {bilgi && (
                            <span className={'duyuru-etiket duyuru-etiket--' + bilgi.ton}>
                              {t(bilgi.anahtar)}
                            </span>
                          )}
                          {(b.degerler?.no || b.talepNo) && (
                            <span
                              className={
                                'badge serial-mono badge--' +
                                talepTuru(b.degerler?.tur || 'servis').ton
                              }
                              style={{ fontSize: 11 }}
                            >
                              {b.degerler?.no || b.talepNo}
                            </span>
                          )}
                          <span className="small muted">{saat(b.tarih, dil)}</span>
                        </div>
                      </div>
                      {/* Gidilecek yer yoksa ok da yok: duyuru ve görüş
                          cevabı okunup geçiliyor, dokununca bir şey
                          olacağı izlenimi verilmemeli. */}
                      {b.yol && (
                        <span className="listitem__chev"><IconRight size={20} /></span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Geçici not — sunucu bağlanınca kaldırılacak
            (bkz. PRODA-CIKIS.md → C9) */}
        <div className="uyari-kart" style={{ marginTop: 22 }}>
          {t('bildirimler.demoNot')}
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/* Anahtarlı bildirimin yazısı lib/bildirimler.js → bildirimYazisi:
   telefonun bildirim perdesi de aynı yazıyı kullanıyor. */
function yaz(t, b, dil, hangi) {
  return bildirimYazisi(t, b, dil, hangi)
}

/* Saat ve tarih. Bugünün bildiriminde yalnız saat yazıyor — tarihi
   zaten öbek başlığı söylüyor. */
function saat(zaman, dil) {
  const yerel = dil === 'tr' ? 'tr-TR' : 'en-GB'
  const d = new Date(zaman)
  const obek = tarihObegi(zaman)
  if (obek === 'bugun' || obek === 'dun') {
    return d.toLocaleTimeString(yerel, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(yerel, { day: 'numeric', month: 'long' })
}
