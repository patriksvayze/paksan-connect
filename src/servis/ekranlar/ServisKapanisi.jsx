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

   TEK SAYFA. ADIM ADIM DEĞİL.

   Bu ekran bir dönem yedi adımlık bir sihirbazdı: her ekranda tek soru,
   cevap verilince bir sonraki açılıyordu. Geri alındı ve sebebi şu:

     · Servis kaydı bir ANKET DEĞİL, BİR BELGE. Sahada doldurulan iş
       emrinin karşılığı. Belgeyi dolduran kişi neyin sorulacağını
       baştan görmek ister; "daha kaç ekran var" diye ilerlemek
       istemez.
     · Sihirbazda geri dönüp bir rakamı düzeltmek üç dokunuş; tek
       sayfada parmağı yukarı kaydırmak yetiyor.
     · Kayıt PARANIN KENDİSİ. Servis göndermeden önce tamamını bir
       kerede görmek zorunda: hangi parça, kaç kilometre, ne kadar
       işçilik, toplam ne tutuyor. Yedi ekrana bölünmüş bir tutarı
       kimse kontrol edemez.
     · Alan sayısı zaten az; uzun görünmesinin sebebi soruların
       çokluğu değil, ekranların çokluğuydu.

   "Tek ekranda tek soru" kuralı yerinde duruyor ama başka bir yerde:
   HIZLI KARAR ekranlarında. Belge doldurmak başka bir iş.

   EKSİK OLMAYAN SORULMUYOR

   Talep uygulamadan geldiyse müşterinin adı, telefonu, adresi ve
   makinenin künyesi zaten içinde. O alanlar okunur satır olarak
   duruyor, kutu olarak değil. Yalnız gerçekten boş olanlar soruluyor
   (bkz. lib/servisKaydi.js → eksikAlanlar).

   TUTAR HER AN EKRANIN DİBİNDE

   Garanti kapısında hesap, sayfanın dibindeki çubukta kaydet
   düğmesinin yanında duruyor ve yazdıkça değişiyor. Rakamı görmeden
   doldurulan bir form, doldurulmayan bir formdur.
   ========================================================================== */

const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

export function ServisKapanisi({ talep, oturum, onKapat, onBitti }) {
  /* Talepte olmayan alanlar. Bir kez hesaplanıyor: kullanıcı yazdıkça
     liste kısalsaydı kutular gözünün önünde kaybolurdu. */
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

  const seriDegeri = seri.trim() || talep.makine?.serial || ''
  const urun = useMemo(() => matchProduct(seriDegeri)?.product || null, [seriDegeri])

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

  function parcaCevir(parcaAdi) {
    setHata('')
    setParcalar((l) =>
      l.some((p) => p.ad === parcaAdi)
        ? l.filter((p) => p.ad !== parcaAdi)
        : [...l, { ad: parcaAdi, adet: 1 }],
    )
  }

  function adetDegistir(parcaAdi, fark) {
    setParcalar((l) =>
      l.map((p) => (p.ad === parcaAdi ? { ...p, adet: Math.max(1, p.adet + fark) } : p)),
    )
  }

  function bitir() {
    /* Formun kendi soruları önce; ancak hepsi doluysa model katmanına
       gidiliyor. Sıra ekrandaki sıranın aynısı — hata mesajı hep en
       yukarıdaki eksiği gösteriyor. */
    if (eksik.includes('ad') && ad.trim().length < 3) {
      return setHata('Müşterinin adını yazın.')
    }
    if (eksik.includes('tel') && telGiris(tel).replace(/\D/g, '').length < 10) {
      return setHata('Telefon numarasını eksiksiz yazın.')
    }
    if (eksik.includes('seri') && seri.trim() && !validateSerial(normalizeSerial(seri)).ok) {
      return setHata('Şase numarası tanınmadı. Yazdığınızı kontrol edin.')
    }
    if (ariza.trim().length < 5) return setHata('Arızayı bir cümleyle yazın.')
    if (sonuc.trim().length < 5) return setHata('Ne yaptığınızı bir cümleyle yazın.')

    /* Servisin doldurduğu eksikler talebin kendisine de işleniyor:
       telefonla gelen bir işte müşterinin adı ve makinenin şasesi ilk
       kez burada öğreniliyor. */
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

  return (
    <div className="katman">
      <Sayfa
        baslik="Servis Kaydı"
        alt={[talep.no, ad].filter(Boolean).join(' · ')}
        onGeri={onKapat}
        dip={
          <div className="kayit-dip">
            {kapi === 'garanti' && (
              <div className="kayit-dip__hesap">
                <span>Hak edişiniz</span>
                <strong>
                  {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
                </strong>
              </div>
            )}
            <button className="dg dg--ana dg--blok" onClick={bitir}>
              Kaydı Tamamla
            </button>
          </div>
        }
      >
        {/* ------------------------------------------- Müşteri ve makine */}
        <Bolum ad="Müşteri ve Makine">
          {eksik.includes('ad') ? (
            <Kutu ad="Adı Soyadı" deger={ad} onDegis={setAd} />
          ) : (
            <Satir ad="Adı Soyadı" deger={ad} />
          )}

          {eksik.includes('tel') ? (
            <Kutu
              ad="Telefon"
              deger={tel}
              onDegis={(v) => setTel(telGiris(v))}
              tur="tel"
              ipucu="05xx xxx xx xx"
            />
          ) : (
            <Satir ad="Telefon" deger={tel} />
          )}

          {eksik.includes('adres') ? (
            <Kutu ad="Adres" deger={adres} onDegis={setAdres} satir={2} />
          ) : (
            <Satir ad="Adres" deger={adres} />
          )}

          {eksik.includes('seri') ? (
            <Kutu
              ad="Şase Numarası"
              deger={seri}
              onDegis={setSeri}
              ipucu="Makinenin üstündeki etiket"
            />
          ) : (
            <Satir ad="Şase Numarası" deger={formatSerial(seri)} mono />
          )}

          {/* MODEL, KOD VE İMAL YILI SORULMUYOR: ŞASEDEN OKUNUYOR.

              Üçü de şase numarasının içinde yazılı. Servise ayrıca
              sordurmak, aynı bilgiyi ikinci kez ve bu sefer yanlış
              girme ihtimali demekti. */}
          {urun && <Satir ad="Makine" deger={urun.name} />}
          {urun?.code && <Satir ad="Kod" deger={urun.code} mono />}
          {extractYear(seriDegeri) && (
            <Satir ad="İmal Yılı" deger={String(extractYear(seriDegeri))} />
          )}
        </Bolum>

        {/* --------------------------------------------------------- Arıza

            BÖLÜM ADI ve ALAN ADI ÜST ÜSTE YAZMIYOR. Tek alanlı bölümde
            "Arıza" başlığının altında "Müşteri Ne Anlattı?" etiketi
            aynı şeyi iki kez söylüyordu; bölüm adı sorunun kendisi
            oldu. */}
        <Bolum ad="Müşteri Ne Anlattı?">
          <Kutu
            deger={ariza}
            onDegis={setAriza}
            satir={3}
            ipucu={
              talep.aciklama
                ? 'Talepten geldi; eksik varsa ekleyin.'
                : 'Örnek: Balya bağlamıyor, ip sürekli kopuyor'
            }
          />
        </Bolum>

        {/* --------------------------------------------------- Yapılan iş */}
        <Bolum ad="Ne Yapıldı?">
          <Secenekler
            secenekler={YAPILAN_IS.map((x) => ({ deger: x, ad: x }))}
            secili={yapilanIs}
            onSec={(v) => {
              setYapilanIs(v)
              setHata('')
            }}
          />
        </Bolum>

        <Bolum ad="Ne Buldunuz, Ne Yaptınız?">
          <Kutu
            deger={sonuc}
            onDegis={setSonuc}
            satir={3}
            ipucu="Örnek: Düğüm bıçağı aşınmıştı, değiştirildi ve ayar yapıldı"
          />
        </Bolum>

        {/* ---------------------------------------------------------- Kapı */}
        <Bolum ad="Ücreti Kim Ödüyor?">
          {seriDegeri && <Garanti seri={seriDegeri} urun={urun} />}
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
            onSec={(v) => {
              setKapi(v)
              setHata('')
            }}
          />
        </Bolum>

        {/* --------------------------------------------------------- Parça */}
        {kapi && (
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
                </Bolum>
              </>
            )}
          </>
        )}

        {/* ------------------------------------------------- Yol ve işçilik */}
        {kapi === 'garanti' && (
          <Bolum ad="Yol ve İşçilik">
            <Kutu
              ad="Gidilen Yol (km)"
              deger={km}
              onDegis={(v) => setKm(v.replace(/\D/g, ''))}
              tur="sayi"
              ipucu={`Gidiş ve dönüş toplamı · kilometre başına ${paraYaz(TARIFE.yolKm)} ${PARA_BIRIMI}`}
            />
            <Kutu
              ad={`İşçilik Tutarı (${PARA_BIRIMI})`}
              deger={iscilik}
              onDegis={(v) => setIscilik(v.replace(/\D/g, ''))}
              tur="sayi"
              ipucu="İşçilik almadıysanız boş bırakın"
            />

            {hakkedis.kalemler.length > 0 && (
              <div className="hesap">
                {hakkedis.kalemler.map((k) => (
                  <div key={k.ad} className="hesap__satir">
                    <span>{k.ad}</span>
                    <span>
                      {paraYaz(k.tutar)} {PARA_BIRIMI}
                    </span>
                  </div>
                ))}
                <div className="hesap__satir hesap__satir--toplam">
                  <span>Toplam</span>
                  <span>
                    {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
                  </span>
                </div>
              </div>
            )}
          </Bolum>
        )}

        {/* Kaydın nereye gideceği servisin en çok merak ettiği şey:
            parası ne zaman yatacak, parçayı kim gönderecek. */}
        {kapi && <Sonuc kapi={kapi} hakkedis={hakkedis} />}

        {hata && <div className="uyari">{hata}</div>}
      </Sayfa>
    </div>
  )
}

/* --------------------------------------------------------------- Parçalar */

/* Okunur satır: bilgi zaten var, kutu açmanın anlamı yok. */
function Satir({ ad, deger, mono }) {
  if (!deger) return null
  return (
    <div className="kv">
      <span className="kv__ad">{ad}</span>
      <span className={'kv__deger' + (mono ? ' mono' : '')}>{deger}</span>
    </div>
  )
}

/* Yazı kutusu. `satir` verilirse çok satırlı. */
function Kutu({ ad, deger, onDegis, satir, ipucu, tur }) {
  return (
    <label className="alan">
      {ad && <span className="alan__ad">{ad}</span>}
      {satir ? (
        <textarea
          className="gir"
          rows={satir}
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
        />
      ) : (
        <input
          className="gir"
          inputMode={tur === 'sayi' ? 'numeric' : tur === 'tel' ? 'tel' : undefined}
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
        />
      )}
      {ipucu && <span className="alan__ipucu">{ipucu}</span>}
    </label>
  )
}

/* Cevap listesi. Tam genişlikte satırlar. Seçili olan kenarındaki
   şeritle de ayrılıyor, yalnız renkle değil (renk körlüğü). */
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
   kullandığına dokunuyor. Seçilen satırda adet düğmeleri beliriyor.

   STOK SÜTUNU KALDIRILDI. Servisin elindeki parça sayısı uygulamada
   tutuluyordu ve hiçbir zaman gerçeğe uymadı; yanlış sayı, sayının
   olmamasından kötü. */
function ParcaSecimi({ secenekler, secili, onCevir, onAdet }) {
  return (
    <Bolum ad="Değişen Parça" sayi={secili.length}>
      {secenekler.map((parcaAdi) => {
        const secim = secili.find((p) => p.ad === parcaAdi)
        return (
          <div
            key={parcaAdi}
            className={'parca-satir' + (secim ? ' parca-satir--on' : '')}
          >
            <button className="parca-satir__ac" onClick={() => onCevir(parcaAdi)}>
              <span className="parca-satir__ad">{parcaAdi}</span>
            </button>

            {secim && (
              <div className="parca-satir__adet">
                <span className="parca-satir__etiket">Adet</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(parcaAdi, -1)}
                  aria-label={parcaAdi + ' adedini azalt'}
                >
                  <IconMinus size={19} />
                </button>
                <span className="parca-satir__sayi">{secim.adet}</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(parcaAdi, 1)}
                  aria-label={parcaAdi + ' adedini artır'}
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

/* Kaydın nereye gideceği. "Emin misiniz?" demiyor — ne olacağını
   yazıyor. */
function Sonuc({ kapi, hakkedis }) {
  const SONUC = {
    garanti: {
      ton: 'yesil',
      baslik: `Kayıt ${markaEk('a')} onaya gidecek.`,
      metin: `Onaylandığında ${paraYaz(hakkedis.toplam)} ${PARA_BIRIMI} ödeme hesabınıza eklenecek.`,
    },
    eldeParca: {
      ton: 'yesil',
      baslik: 'İş burada bitecek.',
      metin: 'Talep kapanacak ve müşteriye bildirim gidecek.',
    },
    parcaIste: {
      ton: 'mavi',
      baslik: `Parça isteğiniz ${markaEk('a')} gidecek.`,
      metin:
        'Parça yola çıkınca burada göreceksiniz. Taktıktan sonra kaydı siz kapatacaksınız.',
    },
  }
  const s = SONUC[kapi] || SONUC.eldeParca

  return (
    <div className={'not not--' + s.ton}>
      <IconCheckCircle size={19} />
      <div>
        <strong>{s.baslik}</strong>
        <p>{s.metin}</p>
      </div>
    </div>
  )
}
