import { useEffect, useMemo, useRef } from 'react'
import { hizmetTarifesiGetir, parcaIskontosuGetir } from '../../backoffice/veri'
import { makineFarklari, tarifeCoz } from '../../lib/servisTarifesi'
import { bakiyeIskontosu, iskontoCoz, yuzdeYap } from '../../lib/servisFiyat'
import { PARA_BIRIMI, paraYaz } from '../../data/katalog/para.js'
import { getProduct } from '../../data/katalog/products.js'
import { tarihYaz } from '../../backoffice/ekranlar/ortak'
import { Bolum } from '../Kabuk'
import { IconRight } from '../../components/Icons'

/* ==========================================================================
   Ücretlendirmeler — Servisim (23 Eylül 2026; başlık önce "Ücretlendirmeler"ydi,
   aynı gün kullanıcının isteğiyle değişti)

   KULLANICININ İSTEĞİ: "Servisim uygulamasında da kullanıcının güncel
   tarifeyi görebileceği bir alan yaratılmalı." Ücretler ve parça
   indirimi artık backoffice'ten değişiyor (bkz. lib/servisTarifesi.js,
   lib/servisFiyat.js); servis kendi parasının hesabını bilmeli.

   İKİ YERDE GÖRÜNÜYOR

     Hesap      bölümün tamamı: yol ve işçilik ücreti, makineye göre
                farklı olanlar, yedek parça indirimi, son değişiklik.
     Hak Ediş   tek satırlık özet; dokununca Hesap'taki bu bölüm
                açılıyor. Servis parasına orada bakıyor. Makine
                modeline göre farklı ücret varsa özetin altında bir
                satır (25 Eylül 2026, kullanıcı sınaması: özet yalnız
                genel ücreti söylüyordu; Orkinos 1270 işinin hak edişi
                90 TL/saat'ten gelirken servis 50 TL'den hesaplandığını
                sanıyordu). Tek modelde modelin adı ve ücreti, birden
                çokta kaç modelde farklı olduğu; tam liste Hesap'ta.

   Değişince servise bildirim de gidiyor (veri.js → servisHesapBildir);
   bildirime dokunmak da bu bölümü açıyor.

   BAKİYEDEN ÖDEMEDE EK İNDİRİM (24 Eylül 2026). PAKSAN oranı sıfırdan
   büyük yazdıysa yedek parça indiriminin altında kendi karosu var:
   servis bu parayı ancak siparişi bakiyesinden öderse alıyor, bunu
   ücretlerine baktığı yerde de bilmeli. Oran sıfırsa karo yok — var
   olmayan bir indirimin "%0" diye durması servise bir şey söylemiyor.

   "İSKONTO" YAZMIYOR, "İNDİRİM" YAZIYOR: servis ekranında yasak terim
   (CLAUDE.md "Servis Panelinin Kullanıcısı").
   ========================================================================== */

const METIN = {
  bolum: 'Ücretlendirmeler',
  aciklama: `Garantili işlerde PAKSAN’ın size ödediği yol ve işçilik ücretleri ile yedek parça siparişlerinizdeki indiriminiz.`,
  yol: 'Yol',
  yolBirim: 'kilometre başına',
  iscilik: 'İşçilik',
  iscilikBirim: 'saat başına',
  indirim: 'Yedek parça indirimi',
  indirimAlt: 'Parça siparişlerinizde liste fiyatından düşülür.',
  bakiyeIndirim: 'Bakiyeden ödemede ek indirim',
  bakiyeIndirimAlt: 'Parça siparişinizi bakiyenizden öderseniz yedek parça indiriminize ek indirim uygulanır.',
  makineBaslik: 'Bazı makine modellerinde farklı ücret',
  dip: 'Hak edişiniz, kaydı gönderdiğiniz gün geçerli olan ücretlerle hesaplanır.',
  guncelleme: (tarih) => `Son değişiklik: ${tarih}`,
  ozet: 'Güncel ücretleriniz',
  /* Model adına ek gelmiyor ("Orkinos 1270 için"): adın sonuna göre
     çekim gerekmesin diye cümle eksiz kuruldu. */
  ozetTekModel: (ad) => `${ad} için ücretler farklı:`,
  ozetCokModel: (n) => `${n} makine modelinde ücret farklı`,
}

const tl = (v) => `${paraYaz(v)} ${PARA_BIRIMI}`

/* Servisin ücret ve indirim bilgisi; iki görünüm de bunu okuyor. */
function useUcretler(servisId, surum) {
  return useMemo(() => {
    void surum
    const tarife = hizmetTarifesiGetir()
    const iskontolar = parcaIskontosuGetir()
    const temel = tarifeCoz(tarife, servisId, null)
    const farklar = makineFarklari(tarife, servisId).map((f) => ({
      ...f,
      ad: getProduct(f.urunId)?.name || f.urunId,
    }))
    const indirim = yuzdeYap(iskontoCoz(iskontolar, servisId).oran)
    const bakiyeIndirim = yuzdeYap(bakiyeIskontosu(iskontolar))
    /* Servisin gördüğü "son değişiklik": ona dokunan üç kaydın en
       yenisi — genel tarife, kendi özel tarifesi, iskonto. */
    const tarihler = [
      tarife.genel.guncelleme?.tarih,
      tarife.servisler[servisId]?.guncelleme?.tarih,
      iskontolar.guncelleme?.tarih,
    ].filter(Boolean)
    return { temel, farklar, indirim, bakiyeIndirim, son: tarihler.length ? Math.max(...tarihler) : null }
  }, [servisId, surum])
}

/** Hesap ekranındaki bölüm. `odak` true ise ekran açılınca bölüme kayıyor. */
export function Ucretlerim({ oturum, surum, odak }) {
  const u = useUcretler(oturum.servisId, surum)
  /* Yalnız açılışta bir kez: bildirim gelip ekran yeniden çizilince
     servisin okuduğu yer zıplamasın. */
  const kutu = useRef(null)
  useEffect(() => {
    if (odak) kutu.current?.scrollIntoView({ block: 'start' })
  }, [odak])

  return (
    <div id="ucretlerim" ref={kutu}>
      <Bolum ad={METIN.bolum}>
        <p className="alan__ipucu" style={{ marginTop: 0, marginBottom: 12 }}>{METIN.aciklama}</p>

        <div className="ucret-karolar">
          <div className="ucret-karo">
            <span className="ucret-karo__ad">{METIN.yol}</span>
            <span className="ucret-karo__deger">{tl(u.temel.yolKm)}</span>
            <span className="ucret-karo__alt">{METIN.yolBirim}</span>
          </div>
          <div className="ucret-karo">
            <span className="ucret-karo__ad">{METIN.iscilik}</span>
            <span className="ucret-karo__deger">{tl(u.temel.iscilikSaat)}</span>
            <span className="ucret-karo__alt">{METIN.iscilikBirim}</span>
          </div>
          <div className="ucret-karo ucret-karo--indirim">
            <span className="ucret-karo__ad">{METIN.indirim}</span>
            <span className="ucret-karo__deger">%{u.indirim}</span>
            <span className="ucret-karo__alt">{METIN.indirimAlt}</span>
          </div>
          {u.bakiyeIndirim > 0 && (
            <div className="ucret-karo ucret-karo--indirim">
              <span className="ucret-karo__ad">{METIN.bakiyeIndirim}</span>
              <span className="ucret-karo__deger">%{u.bakiyeIndirim}</span>
              <span className="ucret-karo__alt">{METIN.bakiyeIndirimAlt}</span>
            </div>
          )}
        </div>

        {u.farklar.length > 0 && (
          <div className="ucret-farklar">
            <div className="ucret-farklar__baslik">{METIN.makineBaslik}</div>
            {u.farklar.map((f) => (
              <div key={f.urunId} className="ucret-fark">
                <span className="ucret-fark__ad">{f.ad}</span>
                <span className="ucret-fark__deger">
                  {tl(f.yolKm)}/km · {tl(f.iscilikSaat)}/saat
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="kucuk sonuk" style={{ marginTop: 12, marginBottom: 0 }}>
          {METIN.dip}
          {u.son ? ` ${METIN.guncelleme(tarihYaz(u.son, false))}` : ''}
        </p>
      </Bolum>
    </div>
  )
}

/** Hak Ediş ekranındaki tek satır; dokununca Hesap'taki bölüm açılıyor. */
export function UcretOzeti({ oturum, surum, onAc }) {
  const u = useUcretler(oturum.servisId, surum)
  return (
    <button type="button" className="ucret-ozet-satir" onClick={onAc}>
      <span className="ucret-ozet-satir__govde">
        <span className="ucret-ozet-satir__ad">{METIN.ozet}</span>
        <span className="ucret-ozet-satir__deger">
          {METIN.yol} {tl(u.temel.yolKm)}/km · {METIN.iscilik} {tl(u.temel.iscilikSaat)}/saat
        </span>
        {u.farklar.length > 0 && (
          <span className="ucret-ozet-satir__not">
            {u.farklar.length === 1
              ? `${METIN.ozetTekModel(u.farklar[0].ad)} ${METIN.yol} ${tl(u.farklar[0].yolKm)}/km · ${METIN.iscilik} ${tl(u.farklar[0].iscilikSaat)}/saat`
              : METIN.ozetCokModel(u.farklar.length)}
          </span>
        )}
      </span>
      <IconRight size={18} />
    </button>
  )
}
