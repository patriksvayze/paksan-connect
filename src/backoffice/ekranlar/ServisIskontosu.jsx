import { useMemo, useState } from 'react'
import {
  bakiyeIskontosunuKaydet,
  genelIskontoyuKaydet,
  izinli,
  parcaIskontosuGetir,
  servisIskontosunuKaydet,
} from '../veri'
import { oranOku, yuzdeYap } from '../../lib/servisFiyat'
import { servisleriGetir } from '../../marka'
import { AcilirTepe, tarihYaz } from './ortak'

/* ==========================================================================
   Servis iskontosu — Yedek Parça Kataloğu ekranında (23 Eylül 2026)

   KULLANICININ İSTEĞİ: "Servislerimize genel veya servise özel iskonto
   uygulayabileceğimiz bir alan oluşturulmalı. Bunu Yedek Parça Kataloğu
   ekranında yapabiliriz. Uygulanan iskonto, servisim uygulamasında parça
   siparişi checkout ekranında görebilmeli servis. Hatta yapılan
   iskontolar veya değişiklikler bildirim olarak da gitmeli."

   Oran kodda sabitti (%30). Şimdi iki katman: bütün servislere geçen
   GENEL oran ve istenen servise ÖZEL oran; özel olan geçerli (bkz.
   lib/servisFiyat.js → iskontoCoz).

   GENEL DEĞİŞİRKEN ÖZEL ORANLAR SORULUYOR — hizmet ücretindeki kuralın
   aynısı (bkz. HizmetUcretleri.jsx → OzelUcretUyarisi): özel oranı olan
   servisler varken genel oran değişiyorsa pencere onları adıyla ve
   bugünkü oranıyla listeliyor, "onlar da değişsin mi" diye soruyor.

   Oranı değişen her servise Servisim'de bildirim gidiyor (veri.js →
   servisHesapBildir). Servisin ekranında "iskonto" yazmıyor, "indirim"
   yazıyor: servis ekranlarında yasak terim. Burası backoffice; terim
   serbest.

   YETKİ AYRI: `servisIskontosu`. Parça adını düzelten kişi servisin
   ödediği tutarı değiştirememeli.

   BAKİYEDEN ÖDEMEDE EK İSKONTO (24 Eylül 2026, kullanıcının isteği:
   "Servisim'de yedek parça siparişlerinde bakiyeden düşsün seçeneği ile
   yapılan siparişlerde ek indirim uygulayabilelim. Bu indirim oranı en
   uygun nereden belirlenmeli…"). Yeri burası: aynı para (servisin parça
   siparişinde düşülen oran), aynı yetki, aynı kart. Genel oranın
   yanında ikinci karo; servise özel katmanı yok (gerekçe
   lib/servisFiyat.js başında). Oran 0 iken özellik kapalı ve başlıkta
   özet çıkmıyor. Değişince BÜTÜN servislere bildirim gidiyor (veri.js →
   bakiyeIskontosunuKaydet).
   ========================================================================== */

const METIN = {
  baslik: 'Servis iskontosu',
  aciklama:
    'Servislerin yedek parça siparişlerinde liste fiyatından düşülen oran. Servis, sipariş verirken iskonto oranını ve düşülen tutarı görür; oran değişince bildirim alır.',
  gecmisNotu: 'Yeni oran bundan sonra verilen siparişlere uygulanır. Daha önce verilen siparişlerin oranları değişmez.',
  genelAd: 'Bütün servisler',
  genelAlt: 'Özel oranı olmayan servislere uygulanır.',
  genelDuzenle: 'Genel Oranı Değiştir',
  oranEtiketi: 'İskonto oranı (%)',
  kaydet: 'Kaydet',
  vazgec: 'Vazgeç',
  ozelBaslik: 'Servise özel oranlar',
  ozelYok: 'Bütün servisler genel oranı kullanıyor.',
  ozelEkleBaslik: 'Servise özel oran ekle veya değiştir',
  servisSec: 'Servis seçin',
  ekle: 'Ekle',
  guncelle: 'Güncelle',
  kaldir: 'Kaldır',
  guncelleme: (tarih, kisi) => `Son değişiklik: ${tarih}${kisi ? ' · ' + kisi : ''}`,
  ozetGenel: (oran) => `Genel: %${oran}`,
  ozetOzel: (n) => `${n} serviste özel oran`,
  kaydedildi: (n) => (n ? `İskonto kaydedildi · ${n} servise bildirim gönderildi` : 'İskonto kaydedildi'),
  ozelKaydedildi: (ad) => `${ad} için oran kaydedildi`,
  ozelKaldirildi: (ad) => `${ad} genel orana döndü`,
  degisiklikYok: 'Değişiklik yok.',
  // Bakiyeden ödemede ek iskonto
  bakiyeAd: 'Bakiyeden ödemede ek iskonto',
  bakiyeAlt: 'Siparişini cari bakiyesinden ödeyen servise, yedek parça iskontosuna ek olarak uygulanır. Oran sıfırsa uygulanmaz.',
  bakiyeDuzenle: 'Ek İskontoyu Değiştir',
  bakiyeEtiketi: 'Ek iskonto oranı (%)',
  ozetBakiye: (oran) => `Bakiyeden ödemede ek %${oran}`,
  bakiyeKaydedildi: (n) => (n ? `Ek iskonto kaydedildi · ${n} servise bildirim gönderildi` : 'Ek iskonto kaydedildi'),
  oranHata: 'İskonto oranını 0 ile 90 arasında bir sayı olarak yazın.',
  servisHata: 'Önce servisi seçin.',
  // Uyarı penceresi
  uyariBaslik: 'Özel oranı olan servisler var',
  uyariMetin: (n) =>
    `${n} serviste özel iskonto oranı tanımlı. Genel oran değişince bu servislerin oranı da değişsin mi?`,
  uyariOzelDe: 'Özel Oranlar da Değişsin',
  uyariYalnizGenel: 'Yalnız Genel Oranı Değiştir',
  uyariAltNot:
    'Özel oranlar da değişirse bu servislerin özel oranları silinir ve genel oran uygulanır. Özel oranlar korunursa yalnızca özel oranı olmayan servislerin oranı değişir.',
}

const yuzdeRakam = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 2)

export function ServisIskontosuKarti({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'servisIskontosu')
  const iskonto = useMemo(() => {
    void surum
    return parcaIskontosuGetir()
  }, [surum])
  const servisler = useMemo(() => {
    void surum
    return servisleriGetir().slice().sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  }, [surum])
  const servisAdi = (id) => servisler.find((s) => s.id === id)?.ad || id

  const [genelTaslak, setGenelTaslak] = useState(null)
  const [bakiyeTaslak, setBakiyeTaslak] = useState(null)
  const [uyari, setUyari] = useState(false)
  const [secilen, setSecilen] = useState('')
  const [ozelOran, setOzelOran] = useState('')
  const [hata, setHata] = useState('')
  /* Kart kapalı açılıyor; gerekçesi HizmetUcretleri.jsx'teki kartla aynı
     (kullanıcının isteği, 23 Eylül 2026). Kapalıyken başlıkta genel oran
     ve özel oranlı servis sayısı okunuyor. */
  const [acik, setAcik] = useState(false)

  const ozeller = Object.entries(iskonto.servisler).sort((a, b) =>
    servisAdi(a[0]).localeCompare(servisAdi(b[0]), 'tr'),
  )

  function genelKaydet(ozelleriDegistir) {
    const sonuc = genelIskontoyuKaydet(genelTaslak, { ozelleriDegistir }, personel)
    setUyari(false)
    if (sonuc.hata) return setHata(sonuc.hata)
    setGenelTaslak(null)
    setHata('')
    bildir(METIN.kaydedildi(sonuc.bildirilen))
    tazele()
  }

  function genelKaydetIste() {
    const oran = oranOku(genelTaslak, true)
    if (oran === null) return setHata(METIN.oranHata)
    if (oran === iskonto.genel) {
      setGenelTaslak(null)
      return bildir(METIN.degisiklikYok)
    }
    /* Kullanıcının kuralı: özel oranlı servis varken genel değişiyorsa sor. */
    if (ozeller.length) return setUyari(true)
    genelKaydet(false)
  }

  /* Ek iskonto: genel oranın akışı, "özel oranlar" sorusu yok — servise
     özel katmanı yok. Aynı oran yeniden yazılırsa hiçbir şey olmuyor. */
  function bakiyeKaydet() {
    const oran = oranOku(bakiyeTaslak, true)
    if (oran === null) return setHata(METIN.oranHata)
    if (oran === iskonto.bakiye) {
      setBakiyeTaslak(null)
      return bildir(METIN.degisiklikYok)
    }
    const sonuc = bakiyeIskontosunuKaydet(bakiyeTaslak, personel)
    if (sonuc.hata) return setHata(sonuc.hata)
    setBakiyeTaslak(null)
    setHata('')
    bildir(METIN.bakiyeKaydedildi(sonuc.bildirilen))
    tazele()
  }

  function ozelKaydet() {
    if (!secilen) return setHata(METIN.servisHata)
    if (oranOku(ozelOran, true) === null) return setHata(METIN.oranHata)
    const sonuc = servisIskontosunuKaydet(secilen, ozelOran, personel)
    if (sonuc.hata) return setHata(sonuc.hata)
    bildir(METIN.ozelKaydedildi(servisAdi(secilen)))
    setSecilen('')
    setOzelOran('')
    setHata('')
    tazele()
  }

  function ozelKaldir(servisId) {
    servisIskontosunuKaydet(servisId, null, personel)
    bildir(METIN.ozelKaldirildi(servisAdi(servisId)))
    tazele()
  }

  const guncelleme = iskonto.guncelleme

  return (
    <div className={'kart acilir-kart' + (acik ? ' acilir-kart--acik' : '')} style={{ marginBottom: 14 }}>
      <AcilirTepe
        baslik={METIN.baslik}
        ozet={[
          METIN.ozetGenel(yuzdeYap(iskonto.genel)),
          ozeller.length ? METIN.ozetOzel(ozeller.length) : null,
          iskonto.bakiye > 0 ? METIN.ozetBakiye(yuzdeYap(iskonto.bakiye)) : null,
        ]}
        acik={acik}
        onDegis={setAcik}
        govdeId="servis-iskontosu-govde"
      />
      {acik && (
      <div className="kart__ic" id="servis-iskontosu-govde">
        <p className="kucuk sonuk" style={{ margin: 0, lineHeight: 1.55 }}>{METIN.aciklama}</p>
        <p className="kucuk sonuk acilir-guncelleme">
          {guncelleme?.tarih ? METIN.guncelleme(tarihYaz(guncelleme.tarih), guncelleme.personel) : null}
        </p>

        <div className="ucret-sayilar ucret-sayilar--iki">
          <div className="ucret-sayi">
            <div className="ucret-sayi__ad">{METIN.genelAd}</div>
            {genelTaslak === null ? (
              <>
                <div className="ucret-sayi__deger">%{yuzdeYap(iskonto.genel)}</div>
                <div className="ucret-sayi__birim">{METIN.genelAlt}</div>
                {duzenleyebilir && (
                  <button
                    className="dg"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      setGenelTaslak(String(yuzdeYap(iskonto.genel)))
                      setHata('')
                    }}
                  >
                    {METIN.genelDuzenle}
                  </button>
                )}
              </>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label className="alan" style={{ marginBottom: 10 }}>
                  <span className="alan__ad">{METIN.oranEtiketi}</span>
                  <input
                    className="gir mono"
                    value={genelTaslak}
                    onChange={(e) => setGenelTaslak(yuzdeRakam(e.target.value))}
                    inputMode="numeric"
                    autoFocus
                  />
                </label>
                <div className="satir">
                  <button className="dg dg--ana" onClick={genelKaydetIste}>{METIN.kaydet}</button>
                  <button className="dg" onClick={() => setGenelTaslak(null)}>{METIN.vazgec}</button>
                </div>
              </div>
            )}
          </div>

          <div className="ucret-sayi">
            <div className="ucret-sayi__ad">{METIN.bakiyeAd}</div>
            {bakiyeTaslak === null ? (
              <>
                <div className="ucret-sayi__deger">%{yuzdeYap(iskonto.bakiye)}</div>
                <div className="ucret-sayi__birim">{METIN.bakiyeAlt}</div>
                {duzenleyebilir && (
                  <button
                    className="dg"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      setBakiyeTaslak(String(yuzdeYap(iskonto.bakiye)))
                      setHata('')
                    }}
                  >
                    {METIN.bakiyeDuzenle}
                  </button>
                )}
              </>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label className="alan" style={{ marginBottom: 10 }}>
                  <span className="alan__ad">{METIN.bakiyeEtiketi}</span>
                  <input
                    className="gir mono"
                    value={bakiyeTaslak}
                    onChange={(e) => setBakiyeTaslak(yuzdeRakam(e.target.value))}
                    inputMode="numeric"
                    autoFocus
                  />
                </label>
                <div className="satir">
                  <button className="dg dg--ana" onClick={bakiyeKaydet}>{METIN.kaydet}</button>
                  <button className="dg" onClick={() => setBakiyeTaslak(null)}>{METIN.vazgec}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ucret-bolum">
          <div className="ucret-bolum__ad">{METIN.ozelBaslik}</div>
          {ozeller.length ? (
            <div>
              {ozeller.map(([servisId, oran]) => (
                <div key={servisId} className="iskonto-satir">
                  <span style={{ fontWeight: 700 }}>{servisAdi(servisId)}</span>
                  <span className="mono">%{yuzdeYap(oran)}</span>
                  {duzenleyebilir ? (
                    <button className="dg" onClick={() => ozelKaldir(servisId)}>{METIN.kaldir}</button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="kucuk sonuk" style={{ margin: 0 }}>{METIN.ozelYok}</p>
          )}
        </div>

        {duzenleyebilir && (
          <div className="ucret-bolum">
            <div className="ucret-bolum__ad">{METIN.ozelEkleBaslik}</div>
            <div className="iskonto-ekle">
              <label className="alan" style={{ marginBottom: 0 }}>
                <span className="alan__ad">{METIN.servisSec}</span>
                <select
                  className="gir"
                  value={secilen}
                  onChange={(e) => {
                    setSecilen(e.target.value)
                    const var_ = iskonto.servisler[e.target.value]
                    setOzelOran(var_ === undefined ? '' : String(yuzdeYap(var_)))
                  }}
                >
                  <option value="">{METIN.servisSec}</option>
                  {servisler.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ad}
                      {iskonto.servisler[s.id] !== undefined ? ` · %${yuzdeYap(iskonto.servisler[s.id])}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="alan" style={{ marginBottom: 0 }}>
                <span className="alan__ad">{METIN.oranEtiketi}</span>
                <input
                  className="gir mono"
                  value={ozelOran}
                  onChange={(e) => setOzelOran(yuzdeRakam(e.target.value))}
                  inputMode="numeric"
                />
              </label>
              <button className="dg dg--ana" onClick={ozelKaydet}>
                {secilen && iskonto.servisler[secilen] !== undefined ? METIN.guncelle : METIN.ekle}
              </button>
            </div>
          </div>
        )}

        <p className="kucuk sonuk" style={{ margin: '14px 0 0' }}>{METIN.gecmisNotu}</p>
        {hata && <div className="uyari" style={{ marginTop: 12, marginBottom: 0 }}>{hata}</div>}
      </div>
      )}

      {uyari && (
        <div className="pencere" onClick={(e) => e.target === e.currentTarget && setUyari(false)}>
          <div className="kart pencere__kart" style={{ maxWidth: 560 }}>
            <div className="kart__tepe">
              <h2>{METIN.uyariBaslik}</h2>
            </div>
            <div className="kart__ic">
              <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{METIN.uyariMetin(ozeller.length)}</p>
              <div className="ucret-uyari-liste">
                {ozeller.map(([servisId, oran]) => (
                  <div key={servisId} className="ucret-uyari-satir">
                    <strong>{servisAdi(servisId)}</strong>
                    <span className="kucuk sonuk">%{yuzdeYap(oran)}</span>
                  </div>
                ))}
              </div>
              <p className="kucuk sonuk" style={{ margin: '12px 0 16px', lineHeight: 1.55 }}>{METIN.uyariAltNot}</p>
              <div className="satir" style={{ flexWrap: 'wrap' }}>
                <button className="dg dg--ana" onClick={() => genelKaydet(true)}>{METIN.uyariOzelDe}</button>
                <button className="dg" onClick={() => genelKaydet(false)} autoFocus>{METIN.uyariYalnizGenel}</button>
                <button className="dg" onClick={() => setUyari(false)}>{METIN.vazgec}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
