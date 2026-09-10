import { useMemo, useState } from 'react'
import { MARKA, markaEk, PARA_BIRIMI, paraYaz } from '../../marka'
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
  ASAMA,
  PARCA_DURUMU,
  TARIFE,
  YAPILAN_IS,
  eksikAlanlar,
  hakkedisHesapla,
  parcaYazisi,
  temizParcalar,
} from '../../lib/servisKaydi'
import { ekYaz, fotoKucult } from '../../lib/ekler'
import { servisKaydiGonder } from '../../backoffice/veri'
import { Bolum, Onay, Sayfa } from '../Kabuk'
import { ParcaSec } from './ParcaSec'
import {
  IconAlert,
  IconCamera,
  IconMinus,
  IconPlus,
  IconShield,
  IconTrash,
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
     · Alan sayısı zaten az; uzun görünmesinin sebebi soruların
       çokluğu değil, ekranların çokluğuydu.

   "Tek ekranda tek soru" kuralı yerinde duruyor ama başka bir yerde:
   HIZLI KARAR ekranlarında. Belge doldurmak başka bir iş.

   AYNI EKRAN İKİ AŞAMAYI DA AÇIYOR

   Garanti işinde önce parça isteniyor, parça gelince takılıyor ve iş
   o zaman bitiyor (gerekçesi lib/servisKaydi.js başında). İkisi ayrı
   ekran olsaydı aynı sorular iki yerde yazılı olurdu; ekran aşamayı
   kaydın kendisinden okuyor:

     1. AŞAMA   arıza, teşhis, garanti kapısı, gereken parça.
                Para sorulmuyor.
     2. AŞAMA   ne yapıldı, yol, işçilik. 1. aşamanın cevapları
                üstte okunur satır olarak duruyor.

   EKSİK OLMAYAN SORULMUYOR

   Talep uygulamadan geldiyse müşterinin adı, telefonu, adresi ve
   makinenin künyesi zaten içinde. O alanlar okunur satır olarak
   duruyor, kutu olarak değil. Yalnız gerçekten boş olanlar soruluyor
   (bkz. lib/servisKaydi.js → eksikAlanlar). Servisin dükkânında
   açılan bir kayıtta hepsi boş gelir ve hepsi sorulur.

   GÖNDERMEDEN ÖNCE ONAY

   İki düğme de geri alınamaz bir şey yapıyor: talep durum değiştiriyor,
   PAKSAN'a düşüyor, müşteriye bildirim gidiyor. Onay yaprağı ne
   olacağını yazıyor ve tutarı son bir kez gösteriyor.
   ========================================================================== */

const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

export function ServisKapanisi({ talep, oturum, onKapat, onBitti }) {
  const onceki = talep.servisKaydi || null
  /* İkinci aşama: 1. aşamada parça istenmiş, parça gelmiş, servis
     takmış. Kalan tek soru işin kendisi ve hak ediş. */
  const ikinci = onceki?.asama === ASAMA.parca

  /* Talepte olmayan alanlar. Bir kez hesaplanıyor: kullanıcı yazdıkça
     liste kısalsaydı kutular gözünün önünde kaybolurdu. */
  const eksik = useMemo(() => eksikAlanlar(talep), [talep])

  const [ad, setAd] = useState(talep.ad || '')
  const [tel, setTel] = useState(talep.tel || '')
  const [adres, setAdres] = useState(talep.adres || talep.fatura?.adres || '')
  const [seri, setSeri] = useState(talep.makine?.serial || '')
  const [ariza, setAriza] = useState(onceki?.ariza || talep.aciklama || '')
  const [yapilanIs, setYapilanIs] = useState(onceki?.yapilanIs || '')
  const [sonuc, setSonuc] = useState(onceki?.sonuc || '')
  const [kapi, setKapi] = useState(onceki?.kapi || '')
  /* İkinci aşamada parça gerekliliği geçmişte kaldı: 1. aşamada
     "evet" denmiş. Birinci aşamada soru henüz cevaplanmadı. */
  const [parcaGerek, setParcaGerek] = useState(ikinci ? 'evet' : '')
  const [parcalar, setParcalar] = useState(onceki?.parcalar || [])
  const [parcaDurumu, setParcaDurumu] = useState(onceki?.parcaDurumu || '')
  const [foto, setFoto] = useState(onceki?.foto || null)
  const [km, setKm] = useState(onceki?.km ? String(onceki.km) : '')
  const [iscilik, setIscilik] = useState(onceki?.iscilik ? String(onceki.iscilik) : '')
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [katalogAcik, setKatalogAcik] = useState(false)

  const seriDegeri = seri.trim() || talep.makine?.serial || ''
  const urun = useMemo(() => matchProduct(seriDegeri)?.product || null, [seriDegeri])

  /* "son" = garantinin SON YILI, yani garanti hâlâ sürüyor. */
  const garantiDurumu = warrantyStatus(extractYear(seriDegeri)).state
  const garantiVar = garantiDurumu === 'devam' || garantiDurumu === 'son'

  /* AŞAMAYI EKRAN BELİRLİYOR, KOD TAHMİN ETMİYOR.

     Garanti kapısında "Parça gerekiyor mu?" diye açıkça soruluyor;
     cevabı "evet" ise bu kayıt bir parça isteği, iş henüz bitmedi.
     Öteki iki kapı tek aşamalı: parça elde varsa iş bitti, garanti
     dışı parça isteniyorsa hak ediş zaten doğmuyor. */
  const parcaIstegi = !ikinci && kapi === 'garanti' && parcaGerek === 'evet'
  const asama = parcaIstegi ? ASAMA.parca : ASAMA.bitti

  /* Parça bölümü hangi kapıda açılıyor: garantide soruya "evet"
     dendiğinde ya da "hayır" dendiğinde (kendi parçasını takmış
     olabilir), garanti dışı iki kapıda her zaman. */
  const parcaBolumu = ikinci
    ? false
    : kapi === 'eldeParca' || kapi === 'parcaIste' || (kapi === 'garanti' && Boolean(parcaGerek))

  /* İş bittiğinde sorulanlar: ne yapıldı, yol, işçilik. Parça
     isteğinde hiçbiri sorulmuyor — henüz olmamış bir işin parası
     yazılamaz.

     GARANTİDE SORU CEVAPLANMADAN AÇILMIYOR. Kapı seçilir seçilmez
     açılıyordu: servis "Garanti Kapsamında" der demez ekranda hem
     "Parça gerekiyor mu?" hem de yol ve işçilik kutuları beliriyordu.
     İkisi birden görününce soru, cevabı zaten belliymiş gibi
     duruyordu. */
  const isBitti = ikinci || (kapi === 'garanti' ? parcaGerek === 'hayir' : Boolean(kapi))
  const paraSorulur = isBitti && (ikinci || kapi === 'garanti')

  const kayit = {
    asama,
    kapi: ikinci ? onceki.kapi : kapi,
    yapilanIs,
    sonuc,
    parcalar,
    parcaDurumu,
    foto,
    km: Number(km) || 0,
    iscilik: Number(iscilik) || 0,
  }
  const hakkedis = hakkedisHesapla(kayit)
  const secilenler = temizParcalar(parcalar)

  function adetDegistir(kod, fark) {
    setParcalar((l) =>
      l.map((p) => (p.kod === kod ? { ...p, adet: Math.max(1, p.adet + fark) } : p)),
    )
  }

  function parcaCikar(kod) {
    setParcalar((l) => l.filter((p) => p.kod !== kod))
  }

  /* Formun kendi soruları. Model katmanına ancak hepsi doluysa
     gidiliyor; sıra ekrandaki sıranın aynısı, böylece hata mesajı hep
     en yukarıdaki eksiği gösteriyor. */
  function formHatasi() {
    if (!ikinci) {
      if (eksik.includes('ad') && ad.trim().length < 3) return 'Müşterinin adını yazın.'
      if (eksik.includes('tel') && telGiris(tel).replace(/\D/g, '').length < 10) {
        return 'Telefon numarasını eksiksiz yazın.'
      }
      if (eksik.includes('seri') && seri.trim() && !validateSerial(normalizeSerial(seri)).ok) {
        return 'Şase numarasını kontrol edip yeniden yazın.'
      }
      if (ariza.trim().length < 5) return 'Arızayı bir cümleyle yazın.'
      if (!kapi) return 'Ücreti kimin ödeyeceğini seçin.'
      if (kapi === 'garanti' && !parcaGerek) return 'Parça gerekip gerekmediğini seçin.'
    }
    if (sonuc.trim().length < 5) {
      return parcaIstegi ? 'Ne bulduğunuzu bir cümleyle yazın.' : 'Ne yaptığınızı bir cümleyle yazın.'
    }
    return null
  }

  function onaylat() {
    const h = formHatasi()
    if (h) return setHata(h)
    setHata('')
    setOnay(true)
  }

  function gonder() {
    setOnay(false)

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

  /* Onay yaprağının içeriği. "Ne olacak" bilgisi eskiden formun
     dibinde duran bir kutuydu; ekranı uzatıyor ve okunmuyordu. Karar
     anına taşındı. */
  const onayBilgisi = parcaIstegi
    ? {
        baslik: 'Parça isteğiniz gönderilecek',
        metin: `${MARKA} yedek parça birimi parçayı hazırlayıp size gönderecek. Parça elinize geçtiğinde bu talebi açıp "Parçayı Taktım" düğmesine dokunacaksınız. Yol ve işçilik bilgileri o zaman sorulacak.`,
        kalemler: [{ ad: 'İstenen parça', deger: parcaYazisi(secilenler) }],
        dugme: 'Parçayı İste',
      }
    : kapi === 'garanti' || ikinci
      ? {
          baslik: `Kayıt ${markaEk('a')} onaya gidecek`,
          metin: `${MARKA} yolu, işçiliği ve parçaları inceleyecek. Onaylandığında tutar hesabınıza eklenecek ve talep kapanacak.`,
          kalemler: [
            { ad: 'Yapılan iş', deger: yapilanIs || '—' },
            ...(secilenler.length
              ? [{ ad: 'Parça', deger: parcaYazisi(secilenler) }]
              : []),
            { ad: 'Hesabınıza eklenecek tutar', deger: `${paraYaz(hakkedis.toplam)} ${PARA_BIRIMI}` },
          ],
          dugme: 'Kaydı Gönder',
        }
      : {
          baslik: 'Talep kapanacak',
          metin: 'Kayıt müşterinin uygulamasında görünecek ve müşteriye bildirim gidecek.',
          kalemler: [
            { ad: 'Yapılan iş', deger: yapilanIs || '—' },
            ...(secilenler.length
              ? [{ ad: 'Parça', deger: parcaYazisi(secilenler) }]
              : []),
            { ad: 'Ücret', deger: 'Müşteri ödedi' },
          ],
          dugme: 'Kaydı Gönder',
        }

  const dugmeYazi = parcaIstegi ? 'Parçayı İste' : ikinci ? 'İşi Tamamla' : 'Kaydı Tamamla'

  /* KATALOG TAM EKRAN AÇILIYOR, PENCERE OLARAK DEĞİL.

     Kartlarda görsel var ve görsel bu ekranın asıl işi; pencereye
     sıkıştırıldığında parça tanınmıyor. Kayıt ekranı arkada duruyor,
     seçim bitince aynı yerden devam ediliyor. */
  if (katalogAcik) {
    return (
      <ParcaSec
        secili={parcalar}
        onKapat={() => setKatalogAcik(false)}
        onBitti={(secilenler) => {
          setParcalar(secilenler)
          setKatalogAcik(false)
          setHata('')
        }}
      />
    )
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={ikinci ? 'Parçayı Taktım' : 'Servis Kaydı'}
        alt={[talep.no, ad].filter(Boolean).join(' · ')}
        onGeri={onKapat}
        dip={
          <div className="kayit-dip">
            {paraSorulur && (
              <div className="kayit-dip__hesap">
                <span>Hesabınıza eklenecek</span>
                <strong>
                  {paraYaz(hakkedis.toplam)} {PARA_BIRIMI}
                </strong>
              </div>
            )}
            <button className="dg dg--ana dg--blok" onClick={onaylat}>
              {dugmeYazi}
            </button>
          </div>
        }
      >
        {/* ------------------------------- 1. aşamanın cevapları (2. aşama) */}
        {ikinci && <IlkAsama kayit={onceki} />}

        {/* ------------------------------------------- Müşteri ve makine */}
        {!ikinci && (
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
        )}

        {/* --------------------------------------------------------- Arıza

            BÖLÜM ADI ve ALAN ADI ÜST ÜSTE YAZMIYOR. Tek alanlı bölümde
            "Arıza" başlığının altında "Müşteri Ne Anlattı?" etiketi
            aynı şeyi iki kez söylüyordu; bölüm adı sorunun kendisi
            oldu. */}
        {!ikinci && (
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
        )}

        {/* ---------------------------------------------------------- Kapı */}
        {!ikinci && (
          <Bolum ad="Ücreti Kim Ödüyor?">
            {seriDegeri && <Garanti seri={seriDegeri} urun={urun} />}
            <Secenekler
              secenekler={[
                {
                  deger: 'garanti',
                  ad: 'Garanti Kapsamında',
                  alt: `Yolunuzu ve işçiliğinizi ${MARKA} öder.`,
                },
                {
                  deger: 'eldeParca',
                  ad: 'Garanti Dışı · Parçayı Ben Taktım',
                  alt: 'Ücreti müşteriden alırsınız, kayıt kapanır.',
                },
                {
                  deger: 'parcaIste',
                  ad: `Garanti Dışı · Parçayı ${MARKA} Göndersin`,
                  alt: `Parça ${markaEk('dan')} gelecek, ücreti müşteriden alırsınız.`,
                },
              ]}
              secili={kapi}
              onSec={(v) => {
                setKapi(v)
                setParcaGerek('')
                setHata('')
              }}
            />
          </Bolum>
        )}

        {/* GARANTİDE TEK BİR SORU AKIŞI İKİYE AYIRIYOR.

            Cevap "evet" ise bu kayıt bir parça isteği: iş bitmedi,
            para sorulmuyor. "Hayır" ise iş bu ziyarette bitti ve
            kayıt doğrudan onaya gidiyor. Soru sorulmasaydı akış
            "parça seçildi mi" gibi örtük bir şeyden okunurdu; servis
            neyi seçtiğinde ne olacağını bilemezdi. */}
        {!ikinci && kapi === 'garanti' && (
          <Bolum ad="Parça Gerekiyor mu?">
            <Secenekler
              secenekler={[
                {
                  deger: 'evet',
                  ad: `Evet, ${MARKA} göndersin`,
                  alt: 'Parça hazırlanıp size gönderilecek; takınca işi tamamlarsınız.',
                },
                {
                  deger: 'hayir',
                  ad: 'Hayır, iş bitti',
                  alt: 'Kayıt bugün kapanacak; yol ve işçilik bilgilerini aşağıda gireceksiniz.',
                },
              ]}
              secili={parcaGerek}
              onSec={(v) => {
                setParcaGerek(v)
                setHata('')
              }}
            />
          </Bolum>
        )}

        {!ikinci && kapi === 'garanti' && parcaGerek && !garantiVar && (
          <div className="not not--turuncu">
            <IconAlert size={19} />
            <div>
              <strong>Bu makinenin garantisi görünmüyor.</strong>
              <p>
                Kayıt yine de gönderilebilir ama {MARKA} reddedebilir. Şase
                numarasını kontrol edin.
              </p>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- Parça */}
        {parcaBolumu && (
          <>
            <SecilenParcalar
              ad={parcaIstegi ? 'Gerekli Parça' : 'Değiştirilen Parça'}
              ipucu={
                parcaIstegi
                  ? `${MARKA} bu parçaları hazırlayıp size gönderecek.`
                  : 'Değiştirdiğiniz parça varsa katalogdan seçin.'
              }
              secili={parcalar}
              onAdet={adetDegistir}
              onCikar={parcaCikar}
              onKatalog={() => setKatalogAcik(true)}
            />

            {secilenler.length > 0 && (kapi === 'garanti' || ikinci) && (
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

                {/* FOTOĞRAF İSTEĞE BAĞLI VE PARÇA GERİ İSTENMİYOR.

                    Burada "eski parçayı PAKSAN'a geri gönderin, yoksa
                    kayıt açık kalır" yazan bir kutu vardı. Böyle bir
                    kural yok: PAKSAN arızalı parçanın iadesini
                    istemiyor. Kutu kaldırıldı; fotoğraf kaldı, çünkü
                    garanti tartışmasında bakılacak tek şey o. */}
                <Bolum ad="Parçanın Fotoğrafı">
                  <Fotograf foto={foto} onFoto={setFoto} />
                </Bolum>
              </>
            )}
          </>
        )}

        {/* --------------------------------------------------- Yapılan iş */}
        {isBitti && (
          <>
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
          </>
        )}

        {/* 1. aşamada iş bitmedi; sorulan tek şey ne bulunduğu. */}
        {parcaIstegi && (
          <Bolum ad="Ne Buldunuz?">
            <Kutu
              deger={sonuc}
              onDegis={setSonuc}
              satir={3}
              ipucu="Örnek: Düğüm bıçağı aşınmış, balyayı bağlamıyor"
            />
          </Bolum>
        )}

        {/* ------------------------------------------------- Yol ve işçilik */}
        {paraSorulur && (
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

        {hata && <div className="uyari">{hata}</div>}
      </Sayfa>

      {onay && (
        <Onay
          baslik={onayBilgisi.baslik}
          metin={onayBilgisi.metin}
          kalemler={onayBilgisi.kalemler}
          dugme={onayBilgisi.dugme}
          onOnayla={gonder}
          onVazgec={() => setOnay(false)}
        />
      )}
    </div>
  )
}

/* --------------------------------------------------------------- Parçalar */

/* İkinci aşamada 1. aşamada yazılanlar okunur duruyor: servis aradan
   günler geçmiş olabilecek bir işe dönüyor ve neyi neden istediğini
   hatırlamak zorunda değil. */
function IlkAsama({ kayit }) {
  return (
    <Bolum ad="Bu İş İçin Yazdıklarınız">
      <div className="kart" style={{ padding: 16 }}>
        <Satir ad="Müşterinin Anlattığı" deger={kayit.ariza} />
        <Satir ad="Bulduğunuz" deger={kayit.sonuc} />
        <Satir ad="İstediğiniz Parça" deger={parcaYazisi(kayit.parcalar)} />
        <Satir ad="Parçanın Durumu" deger={kayit.parcaDurumu} />
      </div>
    </Bolum>
  )
}

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

/* ==========================================================================
   Kayıttaki parçalar — katalogdan seçiliyor

   ÖNCE BURADA ON TANE İSİM VARDI

   Makinenin destek grubuna göre "Rulman", "Kayış", "Zincir" gibi on
   kadar genel ad listeleniyordu. İki sorunu vardı ve ikisi de büyük:

     · PAKSAN'IN GERÇEK PARÇALARI DEĞİLDİ. Fiyat listesinde 538 parça
       var; kayda giden "Rulman" satırı yedek parça personelinin
       hangi rulmanı hazırlayacağını söylemiyordu.
     · Servis parçayı adıyla değil, RESMİYLE ve KODUYLA tanıyor.

   Şimdi seçim PAKSAN'ın kendi kataloğundan yapılıyor (bkz.
   ekranlar/ParcaSec.jsx) ve kayda kod, ad ve fiyat birlikte gidiyor.
   Bu ekranda yalnız SEÇİLENLER duruyor: adet ayarı ve çıkarma.

   Liste boşken de bölüm çiziliyor. "Parça Seç" düğmesi ekranın o
   noktasında bir yer tutuyor; sonradan belirseydi servis parça
   ekleyebileceğini bilmezdi.
   ========================================================================== */
function SecilenParcalar({ ad, ipucu, secili, onAdet, onCikar, onKatalog }) {
  return (
    <Bolum ad={ad} sayi={secili.length}>
      {ipucu && <p className="alan__ipucu parca-ipucu">{ipucu}</p>}

      {secili.length > 0 && (
        <div className="parca-liste" style={{ marginBottom: 12 }}>
          {secili.map((p) => (
            <div key={p.kod} className="parca-satir parca-satir--on">
              <span className="parca-satir__ac" style={{ cursor: 'default' }}>
                <span className="parca-satir__ad">
                  {p.ad}
                  <span className="secili-parca__kod mono">
                    {p.kod}
                    {p.fiyat ? ` · ${paraYaz(p.fiyat)} ${PARA_BIRIMI}` : ''}
                  </span>
                </span>
              </span>

              <div className="parca-satir__adet">
                <button
                  className="stok-dus"
                  onClick={() => onAdet(p.kod, -1)}
                  aria-label={p.ad + ' adedini azalt'}
                >
                  <IconMinus size={19} />
                </button>
                <span className="parca-satir__sayi">{p.adet}</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(p.kod, 1)}
                  aria-label={p.ad + ' adedini artır'}
                >
                  <IconPlus size={19} />
                </button>
                <button
                  className="stok-dus"
                  onClick={() => onCikar(p.kod)}
                  aria-label={p.ad + ' satırını kaldır'}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="dg dg--blok" onClick={onKatalog}>
        <IconPlus size={19} />
        {secili.length ? 'Parça Ekle veya Çıkar' : 'Parça Seç'}
      </button>
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
