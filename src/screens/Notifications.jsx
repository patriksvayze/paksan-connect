import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { talepTuru } from '../lib/talep'
import {
  bildirimListesi, bildirimleriAyir, tarihObegi, OBEK_SIRASI, BILDIRIM_TURU,
} from '../lib/bildirimler'
import {
  IconBell, IconCheckCircle, IconAlert, IconRight, IconCalendar,
} from '../components/Icons'

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
}

const RENKLER = {
  [BILDIRIM_TURU.TALEP]: { zemin: 'var(--pk-green-soft)', renk: 'var(--pk-green)' },
  [BILDIRIM_TURU.RANDEVU]: { zemin: 'var(--pk-orange-soft)', renk: 'var(--pk-orange-ink)' },
  [BILDIRIM_TURU.DUYURU]: { zemin: 'var(--pk-blue-soft)', renk: 'var(--pk-blue)' },
  [BILDIRIM_TURU.UYARI]: { zemin: 'var(--pk-orange-soft)', renk: 'var(--pk-orange-ink)' },
}

export default function Notifications() {
  const nav = useNavigate()
  const { t, dil } = useDil()
  const {
    requests, user, okunanBildirimler, bildirimOku, bildirimleriOku,
  } = useApp()

  /* Kampanya izni yoksa backoffice’ten gelen duyurular gösterilmiyor;
     hizmete ilişkin bildirimler izinden bağımsız geliyor. */
  const liste = useMemo(
    () => bildirimListesi({ requests, kampanyaIzni: Boolean(user?.onaylar?.kampanya) }),
    [requests, user]
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
            <IconBell size={62} />
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
                  const Ikon = IKONLAR[b.tur] || IconBell
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
                        className="listitem__icon"
                        style={{ background: renk.zemin, color: renk.renk }}
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

/* Sözlük anahtarı taşıyan bildirimin yazısını çözer.

   İki kaynak var: uygulamanın kendi ürettiği ("talebiniz alındı") ve
   backoffice’ten gelen otomatik durum bildirimi. İkisi de anahtar taşıyor ki
   müşterinin kendi dilinde çıksın; personelin elle yazdığı duyuru ise
   hazır metin olarak geliyor. */
function yaz(t, b, dil, hangi) {
  const anahtar = b[hangi]
  if (!anahtar) return ''
  const d = b.degerler || {}
  const turAnahtar = d.tur || d.talepTur
  return t(anahtar, {
    ...d,
    tur: turAnahtar ? cumleBasi(t(`talep.${turAnahtar}.baslik`), dil) : '',
  })
}

/* "Servis Talebi" gibi başlık biçimindeki tür adını cümle içine
   yerleştirir: "Servis talebi alındı". Türkçede küçültme kuralı
   farklı olduğu için dil veriliyor (I → ı). */
function cumleBasi(metin, dil) {
  const yerel = dil === 'tr' ? 'tr-TR' : 'en-GB'
  const kucuk = metin.toLocaleLowerCase(yerel)
  return kucuk.charAt(0).toLocaleUpperCase(yerel) + kucuk.slice(1)
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
