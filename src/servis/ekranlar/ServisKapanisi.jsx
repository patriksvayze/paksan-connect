import { useMemo, useState } from 'react'
import { parcalariGetir, PARCA_DIGER } from '../../data/talepAlanlari'
import { supportGroup, MARKA, markaEk, PARA_BIRIMI, paraYaz } from '../../marka'
import {
  extractYear,
  formatSerial,
  matchProduct,
  normalizeSerial,
  validateSerial,
  warrantyStatus,
  GARANTI_YIL,
} from '../../lib/serial'
import { telGiris } from '../../lib/tel'
import {
  KAPI,
  PARCA_DURUMU,
  TARIFE,
  YAPILAN_IS,
  eksikAlanlar,
  hakkedisHesapla,
} from '../../lib/servisKaydi'
import { ekYaz, fotoKucult } from '../../lib/ekler'
import { servisKaydiGonder } from '../../backoffice/veri'
import { Bolum, Sayfa } from '../Kabuk'
import {
  IconAlert,
  IconCamera,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconShield,
} from '../../components/Icons'

/* ==========================================================================
   Servis kaydı — sahada yapılan işin belgesi

   TEK EKRANDA TEK SORU

   Panelin kullanıcısı servis personeli: ekranı tarlada, işin sonunda,
   çoğu zaman ayakta açıyor. Kaydırılan uzun bir form orada
   doldurulmuyor; doldurulursa geçiştiriliyor.

   Bu yüzden her ekranda tek soru var, cevaplar tam genişlikteki
   düğmelerde. Dokunulan cevap bir sonraki soruyu açıyor.

   FORM UZADI AMA SORU SAYISI ARTMADI

   Kayıt artık müşteriyi, makineyi, arızayı, sonucu, garanti kapısını,
   yolu ve işçiliği taşıyor. Buna karşılık EKSİK OLMAYAN HİÇBİR ŞEY
   SORULMUYOR: talep uygulamadan geldiyse müşterinin adı, telefonu,
   adresi ve makinenin künyesi zaten içinde ve ekran onları yalnız
   gösteriyor. Adımlar `adimlar()` içinde talebe bakılarak
   hesaplanıyor; dolu bir talepte kayıt üç dokunuşta bitiyor, telefonla
   gelen boş bir kayıtta yedi adım açılıyor.

   NEDEN BU KADAR ALAN İSTENEBİLİYOR

   Gerekçe `lib/servisKaydi.js` başında: bu kayıt bir rapor değil,
   PARANIN KENDİSİ. Servis yolunu, işçiliğini ve parçasını yazmadan
   hak edişini alamıyor. Doğruluğun bekçisi iyi niyet değil, servisin
   kendi cebi.

   GERİ DÖNÜŞ HER ADIMDA

   Üst çubuktaki geri oku bir önceki soruya dönüyor, ekranı
   kapatmıyor. Yanlış basılan bir cevap kalıcı olmamalı.
   ========================================================================== */

const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

const BASLIK = {
  bilgi: 'Müşteri ve Makine',
  ariza: 'Arıza Nedir?',
  is: 'Ne Yapıldı?',
  sonuc: 'Arızanın Sonucu',
  kapi: 'Ücreti Kim Ödüyor?',
  parca: 'Hangi Parça Değişti?',
  hakkedis: 'Yol ve İşçilik',
  ozet: 'Kaydı Tamamla',
}

const ALT = {
  bilgi: 'Kayıtta olmayanları doldurun',
  ariza: 'Müşterinin şikâyeti',
  is: 'Tek dokunuş',
  sonuc: 'Ne buldunuz, ne yaptınız',
  kapi: 'Bu seçim kaydın nereye gideceğini belirler',
  parca: 'Değişen parçaları işaretleyin',
  hakkedis: `${MARKA} bu iki satırı ödeyecek`,
  ozet: 'Son bir kez bakın',
}

export function ServisKapanisi({ talep, oturum, onKapat, onBitti }) {
  /* Talepte olmayan alanlar. Bir kez hesaplanıyor: kullanıcı yazdıkça
     liste kısalsaydı adımlar altından kayardı. */
  const eksik = useMemo(() => eksikAlanlar(talep), [talep])

  const [ad, setAd] = useState(talep.ad || '')
  const [tel, setTel] = useState(talep.tel || '')
  const [adres, setAdres] = useState(talep.adres || talep.fatura?.adres || '')
  const [seri, setSeri] = useState(talep.makine?.serial || '')
  const [ariza, setAriza] = useState(talep.aciklama || '')
  const [yapilanIs, setYapilanIs] = useState('')
  const [sonuc, setSonuc] = useState('')
  const [kapi, setKapi] = useState('')
  const [parcalar, setParcalar] = useState([])
  const [parcaDurumu, setParcaDurumu] = useState('')
  const [foto, setFoto] = useState(null)
  const [km, setKm] = useState('')
  const [iscilik, setIscilik] = useState('')
  const [hata, setHata] = useState('')

  /* Adım listesi cevaplara göre uzuyor. Kapı seçilmeden parça ve hak
     ediş adımları hiç görünmüyor: hangisinin sorulacağını kapı
     belirliyor. */
  const adimlar = useMemo(() => {
    const l = []
    if (eksik.length) l.push('bilgi')
    if (!talep.aciklama?.trim()) l.push('ariza')
    l.push('is')
    l.push('sonuc')
    l.push('kapi')
    if (kapi) l.push('parca')
    if (kapi === 'garanti') l.push('hakkedis')
    l.push('ozet')
    return l
  }, [eksik.length, talep.aciklama, kapi])

  const [adim, setAdim] = useState(() =>
    eksikAlanlar(talep).length ? 'bilgi' : talep.aciklama?.trim() ? 'is' : 'ariza',
  )

  const sira = adimlar.indexOf(adim)
  const sonAdim = adim === 'ozet'

  const seriDegeri = seri.trim() || talep.makine?.serial || ''
  const urun = useMemo(
    () => matchProduct(seriDegeri)?.product || null,
    [seriDegeri],
  )

  /* Parça listesi makinenin destek grubundan geliyor; "Diğer" satırı
     kayıtta bir şey anlatmadığı için çıkarılıyor. */
  const parcaSecenekleri = useMemo(
    () => parcalariGetir(supportGroup(urun)).filter((p) => p !== PARCA_DIGER),
    [urun],
  )

  /* "son" = garantinin SON YILI, yani garanti hâlâ sürüyor. */
  const garantiDurumu = warrantyStatus(extractYear(seriDegeri)).state
  const garantiVar = garantiDurumu === 'devam' || garantiDurumu === 'son'

  const kayit = {
    kapi,
    yapilanIs,
    sonuc,
    parcalar,
    parcaDurumu,
    foto,
    km: Number(km) || 0,
    iscilik: Number(iscilik) || 0,
  }
  const hakkedis = hakkedisHesapla(kayit)

  function ileri() {
    setHata('')
    if (adim === 'bilgi') {
      if (eksik.includes('ad') && ad.trim().length < 3) {
        return setHata('Müşterinin adını yazın.')
      }
      if (eksik.includes('tel') && telGiris(tel).replace(/\D/g, '').length < 10) {
        return setHata('Telefon numarasını eksiksiz yazın.')
      }
      if (eksik.includes('seri') && seri.trim()) {
        const s = validateSerial(normalizeSerial(seri))
        if (!s.ok) return setHata('Şase numarası tanınmadı. Yazdığınızı kontrol edin.')
      }
    }
    if (adim === 'ariza' && ariza.trim().length < 5) {
      return setHata('Arızayı bir cümleyle yazın.')
    }
    if (adim === 'sonuc' && sonuc.trim().length < 5) {
      return setHata('Sonucu bir cümleyle yazın.')
    }
    setAdim(adimlar[sira + 1])
  }

  function geri() {
    setHata('')
    if (sira <= 0) return onKapat()
    setAdim(adimlar[sira - 1])
  }

  function isSec(deger) {
    setYapilanIs(deger)
    setAdim(adimlar[adimlar.indexOf('is') + 1])
  }

  function kapiSec(deger) {
    setKapi(deger)
    setAdim('parca')
  }

  function parcaCevir(ad) {
    setHata('')
    setParcalar((l) =>
      l.some((p) => p.ad === ad) ? l.filter((p) => p.ad !== ad) : [...l, { ad, adet: 1 }],
    )
  }

  function adetDegistir(ad, fark) {
    setParcalar((l) =>
      l.map((p) => (p.ad === ad ? { ...p, adet: Math.max(1, p.adet + fark) } : p)),
    )
  }

  function bitir() {
    /* Servisin doldurduğu eksikler talebin kendisine de işleniyor:
       telefonla gelen bir işte müşterinin adı ve makinenin şasesi
       ilk kez burada öğreniliyor. */
    const tam = {
      ...kayit,
      musteri: { ad: ad.trim(), tel: telGiris(tel), adres: adres.trim() },
      makine: seri.trim()
        ? { serial: normalizeSerial(seri), productId: urun?.id || null }
        : null,
      ariza: ariza.trim(),
    }
    const sonucKayit = servisKaydiGonder(talep, tam, oturum.ad)
    if (sonucKayit.hata) return setHata(sonucKayit.hata)
    onBitti()
  }

  const DIP = {
    ozet: (
      <button className="dg dg--ana dg--blok" onClick={bitir}>
        Kaydı Tamamla
      </button>
    ),
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={BASLIK[adim]}
        alt={ALT[adim]}
        onGeri={geri}
        dip={
          sonAdim ? (
            DIP.ozet
          ) : adim === 'is' || adim === 'kapi' ? null : (
            <button className="dg dg--ana dg--blok" onClick={ileri}>
              Devam
            </button>
          )
        }
      >
        {adim === 'bilgi' && (
          <Bilgi
            eksik={eksik}
            ad={ad}
            tel={tel}
            adres={adres}
            seri={seri}
            urun={urun}
            onAd={setAd}
            onTel={(v) => setTel(telGiris(v))}
            onAdres={setAdres}
            onSeri={setSeri}
          />
        )}

        {adim === 'ariza' && (
          <Bolum ad="Müşteri Ne Anlattı?">
            <label className="alan">
              <textarea
                className="gir"
                rows={4}
                value={ariza}
                onChange={(e) => setAriza(e.target.value)}
                placeholder="Örnek: Balya bağlamıyor, ip sürekli kopuyor"
              />
            </label>
          </Bolum>
        )}

        {adim === 'is' && (
          <Secenekler
            secenekler={YAPILAN_IS.map((x) => ({ deger: x, ad: x }))}
            secili={yapilanIs}
            onSec={isSec}
          />
        )}

        {adim === 'sonuc' && (
          <>
            {talep.aciklama?.trim() && (
              <div className="not not--mavi">
                <IconAlert size={19} />
                <div>
                  <strong>Müşterinin anlattığı</strong>
                  <p>{talep.aciklama}</p>
                </div>
              </div>
            )}
            <Bolum ad="Ne Buldunuz?">
              <label className="alan">
                <textarea
                  className="gir"
                  rows={4}
                  value={sonuc}
                  onChange={(e) => setSonuc(e.target.value)}
                  placeholder="Örnek: Düğüm bıçağı aşınmıştı, değiştirildi ve ayar yapıldı"
                />
              </label>
            </Bolum>
          </>
        )}

        {adim === 'kapi' && (
          <>
            <Secenekler
              secenekler={[
                {
                  deger: 'garanti',
                  ad: KAPI.garanti,
                  alt: `Yolunuzu ve işçiliğinizi ${MARKA} öder.`,
                },
                {
                  deger: 'eldeParca',
                  ad: KAPI.eldeParca,
                  alt: 'Ücreti müşteriden alırsınız, kayıt kapanır.',
                },
                {
                  deger: 'parcaIste',
                  ad: KAPI.parcaIste,
                  alt: `Parça ${markaEk('dan')} gelecek, ücreti müşteriden alırsınız.`,
                },
              ]}
              secili={kapi}
              onSec={kapiSec}
            />
            {seriDegeri && <Garanti seri={seriDegeri} urun={urun} />}
          </>
        )}

        {adim === 'parca' && (
          <>
            {kapi === 'garanti' && !garantiVar && (
              <div className="not not--turuncu">
                <IconAlert size={19} />
                <div>
                  <strong>Bu makinenin garantisi görünmüyor.</strong>
                  <p>
                    Kayıt yine de gönderilebilir ama {MARKA} reddedebilir.
                    Şase numarasını kontrol edin.
                  </p>
                </div>
              </div>
            )}

            <ParcaSecimi
              secenekler={parcaSecenekleri}
              secili={parcalar}
              onCevir={parcaCevir}
              onAdet={adetDegistir}
            />

            {parcalar.length > 0 && kapi === 'garanti' && (
              <>
                <Bolum ad="Parçanın Nesi Var?">
                  <Secenekler
                    secenekler={PARCA_DURUMU.map((x) => ({ deger: x, ad: x }))}
                    secili={parcaDurumu}
                    onSec={(v) => {
                      setParcaDurumu(v)
                      setHata('')
                    }}
                  />
                </Bolum>

                <Bolum ad="Eski Parçanın Fotoğrafı">
                  <Fotograf foto={foto} onFoto={setFoto} />
                </Bolum>

                <div className="not not--mavi">
                  <IconShield size={19} />
                  <div>
                    <strong>Eski parçayı {markaEk('a')} geri gönderin.</strong>
                    <p>
                      {MARKA} parçayı inceleyecek. Geri gönderilmezse kayıt
                      açık kalır.
                    </p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {adim === 'hakkedis' && (
          <Hakkedis
            km={km}
            iscilik={iscilik}
            hakkedis={hakkedis}
            onKm={setKm}
            onIscilik={setIscilik}
          />
        )}

        {adim === 'ozet' && (
          <Ozet
            talep={talep}
            ad={ad}
            yapilanIs={yapilanIs}
            kapi={kapi}
            parcalar={parcalar}
            hakkedis={hakkedis}
          />
        )}

        {hata && <div className="uyari">{hata}</div>}
      </Sayfa>
    </div>
  )
}

/* ------------------------------------------------------- Eksik bilgiler */

/* YALNIZ EKSİK OLAN SORULUYOR.

   Uygulamadan gelen talepte müşterinin adı, telefonu, adresi ve
   makinenin şasesi zaten var. Aynı şeyi ikinci kez yazdırmak formu
   uzatmaktan başka bir işe yaramıyor; uzayan form da geçiştiriliyor.
   Dolu alanlar aşağıda okunur hâlde duruyor, kutu olarak değil. */
function Bilgi({ eksik, ad, tel, adres, seri, urun, onAd, onTel, onAdres, onSeri }) {
  return (
    <>
      <Bolum ad="Müşteri">
        {eksik.includes('ad') ? (
          <label className="alan">
            <span className="alan__ad">Adı Soyadı</span>
            <input className="gir" value={ad} onChange={(e) => onAd(e.target.value)} />
          </label>
        ) : (
          <Dolu ad="Adı Soyadı" deger={ad} />
        )}

        {eksik.includes('tel') ? (
          <label className="alan">
            <span className="alan__ad">Telefon</span>
            <input
              className="gir"
              inputMode="tel"
              value={tel}
              onChange={(e) => onTel(e.target.value)}
              placeholder="05xx xxx xx xx"
            />
          </label>
        ) : (
          <Dolu ad="Telefon" deger={tel} />
        )}

        {eksik.includes('adres') ? (
          <label className="alan">
            <span className="alan__ad">Adres</span>
            <textarea
              className="gir"
              rows={2}
              value={adres}
              onChange={(e) => onAdres(e.target.value)}
            />
          </label>
        ) : (
          <Dolu ad="Adres" deger={adres} />
        )}
      </Bolum>

      <Bolum ad="Makine">
        {eksik.includes('seri') ? (
          <label className="alan">
            <span className="alan__ad">Şase Numarası</span>
            <input
              className="gir"
              value={seri}
              onChange={(e) => onSeri(e.target.value)}
              placeholder="Makinenin üstündeki etiket"
            />
          </label>
        ) : (
          <Dolu ad="Şase Numarası" deger={formatSerial(seri)} mono />
        )}

        {/* MODEL, KOD VE İMAL YILI SORULMUYOR: ŞASEDEN OKUNUYOR.

            Üçü de şase numarasının içinde yazılı. Servise ayrıca
            sordurmak, aynı bilgiyi ikinci kez ve bu sefer yanlış
            girme ihtimali demekti. */}
        {urun && (
          <>
            <Dolu ad="Makine" deger={urun.name} />
            {urun.code && <Dolu ad="Kod" deger={urun.code} mono />}
          </>
        )}
        {extractYear(seri) && <Dolu ad="İmal Yılı" deger={String(extractYear(seri))} />}
      </Bolum>
    </>
  )
}

function Dolu({ ad, deger, mono }) {
  if (!deger) return null
  return (
    <div className="satir" style={{ gap: 8, alignItems: 'baseline' }}>
      <span className="kucuk sonuk">{ad}</span>
      <span className={mono ? 'mono' : ''} style={{ marginLeft: 'auto' }}>
        {deger}
      </span>
    </div>
  )
}

/* ---------------------------------------------------------- Hak ediş */

/* İKİ ALAN, İKİ AYRI CİNS.

   Kilometre bir olgu: servis yazıyor, parasını PAKSAN kendi
   tarifesinden hesaplıyor. İşçilik ise işe göre değişiyor; tutarını
   servis koyuyor. Gerekçesi lib/servisKaydi.js içinde.

   TOPLAM ANINDA GÖRÜNÜYOR. Servis ne alacağını kaydı göndermeden
   önce biliyor; rakamı görmeden doldurulan bir form, doldurulmayan
   bir formdur. */
function Hakkedis({ km, iscilik, hakkedis, onKm, onIscilik }) {
  return (
    <>
      <Bolum ad="Gidilen Yol">
        <label className="alan">
          <span className="alan__ad">Toplam Kilometre</span>
          <input
            className="gir"
            inputMode="numeric"
            value={km}
            onChange={(e) => onKm(e.target.value.replace(/\D/g, ''))}
            placeholder="Gidiş ve dönüş"
          />
        </label>
        <p className="ipucu">
          Kilometre başına {paraYaz(TARIFE.yolKm)} {PARA_BIRIMI} ödeniyor.
        </p>
      </Bolum>

      <Bolum ad="İşçilik">
        <label className="alan">
          <span className="alan__ad">Tutar ({PARA_BIRIMI})</span>
          <input
            className="gir"
            inputMode="numeric"
            value={iscilik}
            onChange={(e) => onIscilik(e.target.value.replace(/\D/g, ''))}
            placeholder="Yoksa boş bırakın"
          />
        </label>
      </Bolum>

      <div className="not not--yesil">
        <IconCheckCircle size={19} />
        <div>
          <strong>
            Hesaplanan tutar: {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
          </strong>
          <p>
            {hakkedis.kalemler.map((k) => k.ad).join(' · ') || 'Henüz kalem yok.'}
          </p>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------- Ortak parçalar */

/* Cevap listesi. Tam genişlikte satırlar; dokunulan cevap bir sonraki
   soruyu açıyor. Seçili olan kenarıyla da ayrılıyor, yalnız renkle
   değil (renk körlüğü). */
function Secenekler({ secenekler, secili, onSec }) {
  return (
    <div className="secenek">
      {secenekler.map((s) => (
        <button
          key={s.deger}
          className={'buyuk-sec' + (secili === s.deger ? ' buyuk-sec--on' : '')}
          onClick={() => onSec(s.deger)}
        >
          <span className="buyuk-sec__ad">{s.ad}</span>
          {s.alt && <span className="buyuk-sec__alt">{s.alt}</span>}
        </button>
      ))}
    </div>
  )
}

/* Parça seçimi. Açılır kutu YOK: liste hâlinde duruyor, servis
   kullandığına dokunuyor. Tek etkileşim biçimi var — dokunmak.
   Seçilen satırda adet düğmeleri beliriyor.

   STOK SÜTUNU KALDIRILDI. Servisin elindeki parça sayısı uygulamada
   tutuluyordu ve hiçbir zaman gerçeğe uymadı; yanlış sayı, sayının
   olmamasından kötü. */
function ParcaSecimi({ secenekler, secili, onCevir, onAdet }) {
  return (
    <Bolum ad="Değişen Parça" sayi={secili.length}>
      {secenekler.map((ad) => {
        const secim = secili.find((p) => p.ad === ad)
        return (
          <div key={ad} className={'parca-satir' + (secim ? ' parca-satir--on' : '')}>
            <button className="parca-satir__ac" onClick={() => onCevir(ad)}>
              <span className="parca-satir__ad">{ad}</span>
            </button>

            {secim && (
              <div className="parca-satir__adet">
                <span className="parca-satir__etiket">Adet</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(ad, -1)}
                  aria-label={ad + ' adedini azalt'}
                >
                  <IconMinus size={19} />
                </button>
                <span className="parca-satir__sayi">{secim.adet}</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(ad, 1)}
                  aria-label={ad + ' adedini artır'}
                >
                  <IconPlus size={19} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </Bolum>
  )
}

/* Fotoğraf tek kare. Telefonun kamerası doğrudan açılıyor
   (`capture`), galeriye gitmek gerekmiyor. Küçültme `ekler.js`
   içinde; tarladan zayıf şebekeyle 8 MB'lık kare yollanmıyor. */
function Fotograf({ foto, onFoto }) {
  const [adres, setAdres] = useState('')

  async function sec(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    const kucuk = await fotoKucult(dosya)
    const id = await ekYaz(kucuk)
    onFoto({ id, ad: dosya.name, boyut: kucuk.size })
    setAdres(URL.createObjectURL(kucuk))
  }

  return (
    <>
      {adres && <img className="foto-onizleme" src={adres} alt="" />}
      <label className="dg dg--blok">
        <IconCamera size={19} />
        {foto ? 'Fotoğrafı Değiştir' : 'Fotoğraf Çek'}
        <input type="file" accept="image/*" capture="environment" onChange={sec} hidden />
      </label>
    </>
  )
}

function Garanti({ seri, urun }) {
  const yil = extractYear(seri)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  /* Son yıl da kapsam içi; yeşil kalıyor. */
  const kapsamda = durum.state === 'devam' || durum.state === 'son'

  return (
    <div className={'not ' + (kapsamda ? 'not--yesil' : 'not--mavi')}>
      <IconShield size={19} />
      <div>
        <strong>{(GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor)(kalan)}</strong>
        <p className="mono">
          {formatSerial(seri)}
          {urun ? ` · ${urun.name}` : ''}
        </p>
      </div>
    </div>
  )
}

/* Son adım ne olacağını yazıyor. "Emin misiniz?" demiyor — kullanıcı
   neyi onayladığını okuyor.

   ÜÇ KAPI ÜÇ AYRI SONUÇ ANLATIYOR ve servisin en çok merak ettiği şey
   kaydın nereye gideceği: parası ne zaman yatacak, parçayı kim
   gönderecek. */
function Ozet({ talep, ad, yapilanIs, kapi, parcalar, hakkedis }) {
  const SONUC = {
    garanti: {
      ton: 'yesil',
      baslik: `Kayıt ${markaEk('a')} onaya gidiyor.`,
      metin: `Onaylandığında ${paraYaz(hakkedis.toplam)} ${PARA_BIRIMI} cari hesabınıza alacak yazılacak.`,
    },
    eldeParca: {
      ton: 'yesil',
      baslik: 'İş burada bitiyor.',
      metin: 'Talep kapanacak ve müşteriye bildirim gidecek.',
    },
    parcaIste: {
      ton: 'mavi',
      baslik: `Parça isteğiniz ${markaEk('a')} gidiyor.`,
      metin: 'Parça yola çıkınca burada göreceksiniz. Taktıktan sonra kaydı siz kapatacaksınız.',
    },
  }
  const s = SONUC[kapi] || SONUC.eldeParca

  return (
    <>
      <div className={'not not--' + s.ton}>
        <IconCheckCircle size={19} />
        <div>
          <strong>{s.baslik}</strong>
          <p>{s.metin}</p>
        </div>
      </div>

      <Bolum ad="Kaydın Özeti">
        <Dolu ad="Talep" deger={talep.no} mono />
        <Dolu ad="Müşteri" deger={ad} />
        <Dolu ad="Yapılan İş" deger={yapilanIs} />
        <Dolu ad="Parça" deger={parcalar.map((p) => `${p.ad} × ${p.adet}`).join(', ')} />
        {kapi === 'garanti' && (
          <Dolu
            ad="Hak Ediş"
            deger={`${paraYaz(hakkedis.toplam)} ${PARA_BIRIMI}`}
          />
        )}
      </Bolum>
    </>
  )
}
