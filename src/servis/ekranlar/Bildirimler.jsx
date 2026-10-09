import { useMemo, useState } from 'react'
import { altBilgi } from '../../data/duyuruTurleri'
import { Bos, Yaprak } from '../Kabuk'
import { DUYURU_IKON } from './Islerim'
import { IconBell, IconCuzdan, IconParca, IconRight, IconUser, IconWrench } from '../../components/Icons'
import {
  bildirimYazisi,
  duyuruGorulduSay,
  gorulenDuyurular,
  musteridenMi,
  okunduMu,
  okunduSay,
  servisDuyurulari,
} from '../talepBildirimleri'
import { servisBildirimleri } from '../../backoffice/veri'

/* ==========================================================================
   Servis paneli — bildirim geçmişi (24 Eylül 2026, kullanıcının isteği:
   "Servisim'de geçmiş bildirimleri görebileceğimiz bir alan olsun,
   Connect'teki gibi")

   ÖNCE NE VARDI. İşlerim'in üstünde yalnız OKUNMAMIŞ bildirimler
   duruyordu; okunan talep bildirimi yalnız o talebin içinde, okunan ücret
   ve indirim bildirimi hiçbir yerde kalmıyordu. "Geçen hafta PAKSAN ne
   demişti?" sorusunun cevabı yoktu.

   TEK LİSTE, ÜÇ KAYNAK. PAKSAN'ın talepteki işlemleri ve hesap
   bildirimleri (`duyurular` deposu, `alici: 'servis'`; yazısı
   talepBildirimleri.js), bir de servise yönelik duyurular ve uyarılar
   (hedeflemeye göre süzülmüş). Connect'in bildirim ekranı gibi en yeni
   üstte, Bugün · Dün · Bu hafta · Daha eski diye gruplu; okunmamışın
   başlığı kalın ve yanında nokta (aşağıda, KART).

   DOKUNUNCA NE OLUYOR. Talep bildirimi talebi açıyor — servisin kendi
   parça siparişi de dahil (İşlerim'deki liste siparişi bulamıyor ve
   dokunuş boşa gidiyordu). Hesap bildirimi Hesap'taki Ücretlendirmeler'e
   gidiyor. Duyurunun tamamı alttan açılan yaprakta; okunmamışsa
   "Anladım" ile okundu sayılıyor, İşlerim'deki duyurularla aynı kayıt.

   Silme yok, Connect'teki gibi: geçmiş geçmiş olarak kalıyor.

   MÜŞTERİDEN GELENLER AYRILIYOR (25 Eylül 2026). Müşterinin Connect'ten
   talebe eklemesi ve "Sorun Devam Ediyor" demesi de bu listeye düşüyor
   (aynı kayıt, lib/talepEkleme.js). Satırın alt yazısı "Müşteriden"
   diye başlıyor: PAKSAN'ın işlemi gibi okunmasın. Ayrım olayın adından
   (talepBildirimleri.js → musteridenMi); yeni alan yok.

   KART, CONNECT'TEKİ GİBİ (8 Ekim 2026, kullanıcının isteği: "Servisim'de
   bildirimleri birbirinden ayırmak zor ve scannability de"). Bildirimler
   tek kutuda alt alta satırdı; simge yoktu, PAKSAN'ın işlemi, müşterinin
   eklemesi ve ücret haberi aynı görünüyordu, her satırın başında
   "Okunmadı" yazısı tekrar ediyordu. Artık her bildirim ayrı kart
   (Connect → screens/Notifications.jsx):
     - solda türün simgesi kendi renginde: servis işi turuncu anahtar,
       parça siparişi mor somun (Connect'in talep türü renkleri), müşteriden
       gelen yeşil kişi, ücret ve indirim mavi cüzdan (Hak Ediş sekmesinin
       simgesi), duyuru kendi türünün simgesi ve rengi;
     - okunmamışın başlığı kalın ve yanında nokta; sayfanın başında
       "Tümünü Okundu Say" (Connect'teki gibi tek yer);
     - altta türün adı (yalnız "Müşteriden" ve duyurunun türü; ikon tek
       başına anlam taşımasın), talep numarası işin renginde, müşterinin
       adı ve saat. Bugün ve dün yalnız saat, öncesi tarih: günü öbek
       başlığı söylüyor (Connect'in kuralı);
     - dokununca bir yere gidiyorsa sağda ok.
   Öbek başlıkları Connect'teki gibi küçük ve büyük harfli: kartlar öne
   çıksın. Tür kodu kartta `data-bildirim-tur` (ekran turu X-17 okuyor).
   ========================================================================== */

/* Connect'teki gruplamanın aynısı (lib/bildirimler.js → tarihObegi). */
function obek(tarih) {
  const gun = new Date()
  gun.setHours(0, 0, 0, 0)
  const bas = gun.getTime()
  if (tarih >= bas) return 'bugun'
  if (tarih >= bas - 86400000) return 'dun'
  if (tarih >= bas - 6 * 86400000) return 'hafta'
  return 'eski'
}

const OBEKLER = [
  { id: 'bugun', ad: 'Bugün' },
  { id: 'dun', ad: 'Dün' },
  { id: 'hafta', ad: 'Bu hafta' },
  { id: 'eski', ad: 'Daha eski' },
]

/* Türün simgesi; duyurununki duyuru tablosundan (DUYURU_IKON). */
const TUR_SIMGESI = { servis: IconWrench, siparis: IconParca, musteri: IconUser, hesap: IconCuzdan }

/* Bugün ve dün saat, öncesi "9 Ekim" (Connect → Notifications.jsx → saat). */
function zaman(tarih) {
  const d = new Date(tarih)
  const o = obek(tarih)
  if (o === 'bugun' || o === 'dun') return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

/* İşin türü: servisin kendi parça siparişi mi, servis işi mi. Talep
   Servisim'in listesinde yoksa numaranın önekinden (YPR parça). */
function isTuru(t, no) {
  if (t) return t.servisSiparisi || t.tur === 'parca' ? 'siparis' : 'servis'
  return /^YPR/.test(no || '') ? 'siparis' : 'servis'
}

export function Bildirimler({ oturum, talepler, onAc, onUcretler }) {
  const [surum, setSurum] = useState(0)
  const [duyuru, setDuyuru] = useState(null)

  const satirlar = useMemo(() => {
    void surum
    const gorulen = gorulenDuyurular()
    const talepBildirimleri = servisBildirimleri(oturum.servisId).map((b) => {
      const y = bildirimYazisi(b)
      const t = b.talepId ? talepler.find((x) => x.id === b.talepId) : null
      const is = isTuru(t, b.talepNo)
      const musteriden = musteridenMi(b)
      return {
        id: b.id,
        tur: b.talepId ? 'talep' : 'hesap',
        /* Kartın rengi ve simgesi: müşteriden gelen, işin türünden önce. */
        ton: !b.talepId ? 'hesap' : musteriden ? 'musteri' : is,
        etiket: musteriden ? 'Müşteriden' : null,
        tarih: b.tarih,
        baslik: y.baslik,
        metin: y.metin,
        no: b.talepNo || null,
        is,
        kisi: t?.servisSiparisi ? null : t?.ad || null,
        okunmamis: !okunduMu(b.id),
        talep: t,
        /* Gidilecek yer: talep ya da Ücretlendirmeler. Talep Servisim'in
           listesinde yoksa dokunuş bir yere götürmüyor, ok da yok. */
        gider: !b.talepId || Boolean(t),
      }
    })
    const duyurular = servisDuyurulari(oturum).map((d) => {
      const bilgi = altBilgi(d)
      return {
        id: d.id,
        tur: 'duyuru',
        ton: bilgi.ton,
        Ikon: DUYURU_IKON[bilgi.ikon] || IconBell,
        etiket: bilgi.ad,
        tarih: d.tarih,
        baslik: d.baslik,
        metin: d.metin,
        okunmamis: !gorulen.has(d.id),
        duyuru: d,
        /* Tamamı alttan açılan yaprakta. */
        gider: true,
      }
    })
    return [...talepBildirimleri, ...duyurular].sort((a, b) => b.tarih - a.tarih)
  }, [oturum, talepler, surum])

  const okunmamis = satirlar.filter((s) => s.okunmamis)

  function ac(s) {
    if (s.tur === 'duyuru') return setDuyuru(s)
    okunduSay([s.id])
    setSurum((x) => x + 1)
    if (s.tur === 'hesap') return onUcretler()
    if (s.talep) onAc(s.talep)
  }

  function hepsiniOku() {
    okunduSay(okunmamis.filter((s) => s.tur !== 'duyuru').map((s) => s.id))
    duyuruGorulduSay(okunmamis.filter((s) => s.tur === 'duyuru').map((s) => s.id))
    setSurum((x) => x + 1)
  }

  if (!satirlar.length) {
    return (
      <Bos
        Icon={IconBell}
        baslik="Henüz bildiriminiz yok"
        alt={`PAKSAN ya da müşteriniz taleplerinizle ilgili işlem yaptığında bildirimler burada görünür. PAKSAN duyurularını da burada görebilirsiniz.`}
      />
    )
  }

  return (
    <>
      {okunmamis.length > 0 && (
        <button className="bildirim-hepsi" onClick={hepsiniOku}>
          Tümünü Okundu Say
        </button>
      )}

      {OBEKLER.map((o) => {
        const liste = satirlar.filter((s) => obek(s.tarih) === o.id)
        if (!liste.length) return null
        return (
          <section key={o.id} className="bildirim-obek">
            <h2 className="bildirim-obek__ad">{o.ad}</h2>
            <div className="bildirim-liste">
              {liste.map((s) => {
                const Ikon = s.Ikon || TUR_SIMGESI[s.ton] || IconBell
                return (
                  <button
                    key={s.id}
                    className={'bildirim-kart' + (s.okunmamis ? '' : ' bildirim-kart--okundu')}
                    data-bildirim={s.id}
                    data-bildirim-tur={s.ton}
                    data-okunmadi={s.okunmamis ? '' : undefined}
                    onClick={() => ac(s)}
                  >
                    <span className={'bildirim-kart__simge bildirim-kart__simge--' + s.ton} aria-hidden="true">
                      <Ikon size={22} />
                    </span>
                    <span className="bildirim-kart__govde">
                      <span className="bildirim-kart__ust">
                        <span className="bildirim-kart__baslik">{s.baslik}</span>
                        {s.okunmamis && <span className="bildirim-kart__nokta" role="img" aria-label="Okunmadı" />}
                      </span>
                      {s.metin && (
                        <span
                          className={'bildirim-kart__metin' + (s.tur === 'duyuru' ? ' bildirim-kart__metin--kisa' : '')}
                        >
                          {s.metin}
                        </span>
                      )}
                      <span className="bildirim-kart__alt">
                        {s.etiket && (
                          <span className={'bildirim-kart__etiket bildirim-kart__etiket--' + s.ton}>{s.etiket}</span>
                        )}
                        {s.no && <span className={'bildirim-kart__no bildirim-kart__no--' + s.is}>{s.no}</span>}
                        <span className="bildirim-kart__zaman">
                          {[s.kisi, zaman(s.tarih)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </span>
                    {s.gider && (
                      <span className="bildirim-kart__ok" aria-hidden="true">
                        <IconRight size={20} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {duyuru && (
        <Yaprak
          baslik={duyuru.baslik}
          metin={duyuru.metin}
          {...(duyuru.okunmamis
            ? {
                dugme: 'Anladım',
                onDugme: () => {
                  duyuruGorulduSay([duyuru.id])
                  setDuyuru(null)
                  setSurum((x) => x + 1)
                },
              }
            : {})}
          onKapat={() => setDuyuru(null)}
        />
      )}
    </>
  )
}
