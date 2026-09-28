import { useMemo, useState } from 'react'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
import { altBilgi } from '../../data/duyuruTurleri'
import { MARKA } from '../../marka'
import { Bolum, Bos, Yaprak } from '../Kabuk'
import { IconBell } from '../../components/Icons'
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
   üstte, Bugün · Dün · Bu hafta · Daha eski diye gruplu; okunmamış
   satırın solunda nokta ve yanında yazı.

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

export function Bildirimler({ oturum, talepler, onAc, onUcretler }) {
  const [surum, setSurum] = useState(0)
  const [duyuru, setDuyuru] = useState(null)

  const satirlar = useMemo(() => {
    void surum
    const gorulen = gorulenDuyurular()
    const talepBildirimleri = servisBildirimleri(oturum.servisId).map((b) => {
      const y = bildirimYazisi(b)
      const t = b.talepId ? talepler.find((x) => x.id === b.talepId) : null
      return {
        id: b.id,
        tur: b.talepId ? 'talep' : 'hesap',
        tarih: b.tarih,
        baslik: y.baslik,
        metin: y.metin,
        alt: [
          musteridenMi(b) ? 'Müşteriden' : null,
          b.talepNo,
          t?.servisSiparisi ? null : t?.ad,
          gecenSure(b.tarih),
        ]
          .filter(Boolean)
          .join(' · '),
        okunmamis: !okunduMu(b.id),
        talep: t,
      }
    })
    const duyurular = servisDuyurulari(oturum).map((d) => ({
      id: d.id,
      tur: 'duyuru',
      tarih: d.tarih,
      baslik: d.baslik,
      metin: d.metin,
      alt: [altBilgi(d).ad, gecenSure(d.tarih)].filter(Boolean).join(' · '),
      okunmamis: !gorulen.has(d.id),
      duyuru: d,
    }))
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
        alt={`${MARKA} ya da müşteriniz taleplerinizle ilgili işlem yaptığında bildirimler burada görünür. ${MARKA} duyurularını da burada görebilirsiniz.`}
      />
    )
  }

  return (
    <>
      {okunmamis.length > 0 && (
        <button className="talep-haberi__hepsi" onClick={hepsiniOku}>
          Tümünü Okundu Say
        </button>
      )}

      {OBEKLER.map((o) => {
        const liste = satirlar.filter((s) => obek(s.tarih) === o.id)
        if (!liste.length) return null
        return (
          <Bolum key={o.id} ad={o.ad} sayi={liste.length}>
            <div className="talep-haberi">
              {liste.map((s) => (
                <button
                  key={s.id}
                  className={'talep-haberi__satir' + (s.okunmamis ? '' : ' talep-haberi__satir--okundu')}
                  onClick={() => ac(s)}
                >
                  <span className="talep-haberi__nokta" aria-hidden="true" />
                  <span className="talep-haberi__govde">
                    {s.okunmamis && <span className="talep-haberi__yeni">Okunmadı</span>}
                    <span className="talep-haberi__baslik">{s.baslik}</span>
                    {s.metin && (
                      <span
                        className={
                          'talep-haberi__metin' + (s.tur === 'duyuru' ? ' talep-haberi__metin--kisa' : '')
                        }
                      >
                        {s.metin}
                      </span>
                    )}
                    <span className="talep-haberi__alt">{s.alt}</span>
                  </span>
                </button>
              ))}
            </div>
          </Bolum>
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
