import { useMemo, useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { INDIRME_ADRESI, uygulamaEk, UYGULAMA, SIRKET } from '../../marka'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { extractYear, formatSerial, normalizeSerial, validateSerial } from '../../lib/serial'
import { servisMakineKaydi, seriSatiri } from '../../lib/makineKaydi'
import { telGoster } from '../../lib/tel'
import { adBicimle } from '../../lib/adBicimi'
import { islemYaz, musterileriGetir } from '../../backoffice/veri'
import { getProduct } from '../../marka'
import { Bolum } from '../Kabuk'
import { DikteliKutu } from '../Dikte'
import { IconAlert, IconCheckCircle, IconSend } from '../../components/Icons'

/* ==========================================================================
   Servis paneli — elle kayıt

   Servise doğrudan gelen müşteri için. Uygulamayı kullanmayan, telefonla
   arayan ya da dükkâna gelen çiftçinin talebi de sistemde dursun.

   TELEFON İLK SIRADA — ekranın çalışma biçimi bu.

   Numara yalnız bir alan değil, KİMLİĞİN KENDİSİ: uygulamada hesap
   telefon numarasıyla açılıyor, giriş numarayla yapılıyor, numara
   değişikliği ayrı bir onay süreci. Dolayısıyla numara girildiği anda
   o kişinin kayıtlı olup olmadığı biliniyor.

   Kayıtlıysa ad, il ve ilçe kendiliğinden doluyor ve talep `musteriId`
   ile o hesaba BAĞLANIYOR. Bağlanmasının karşılığı somut: müşteri
   talebi kendi uygulamasında görüyor, durum bildirimleri ona düşüyor,
   PAKSAN da aynı kişinin iki ayrı kaydı olarak görmüyor.

   Önce ad soruluyordu; servis adı yazdıktan sonra numarayı giriyordu ve
   kayıtlı müşteri de olsa her seferinde yeni bir yabancı kayıt
   doğuyordu.

   MAKİNE YAZILMIYOR, SEÇİLİYOR

   Kayıtlı müşteri bulunduğunda seri numarası kutusu kapanıyor ve
   yerine o müşterinin kayıtlı makineleri geliyor. Tek makinesi varsa
   seçili başlıyor, birden fazlaysa servis seçiyor.

   Sebebi elle yazmanın burada işe yaramaması: seri numarası zaten
   sistemde duruyor, servis onu müşteriden telefonda okuyup yazınca tek
   yaptığı şey hata riski eklemek oluyordu. Yanlış yazılan bir hane
   makineyi bulunamaz yapıyor, garanti de yanlış hesaplanıyor.

   Müşteri kayıtlı ama hiç makinesi yoksa kutu geri geliyor; o zaman
   elle yazmak tek yol.

   FİYAT TEKLİFİ BURADA YOK

   Servis makine satmıyor: kurulumu, bakımı ve tamiri yapıyor. Fiyat
   teklifi talebi bu uygulamaya hiç düşmüyor, elle de açılamıyor.
   Kısa bir süre bir sekmesi vardı ve kaldırıldı.

   KAYITLI OLMAYAN MÜŞTERİ

   Talep yine açılıyor — servis müşteriyi kapıdan çeviremez. Ama iki şey
   ekleniyor: formda servise uygulamayı anlatması söyleniyor, kayıt
   bitince de müşteriye indirme bağlantısını SMS ile yollayabiliyor.

   SMS'İ TELEFONUN KENDİSİ GÖNDERİYOR. Sunucu yok ve API anahtarı
   uygulamaya konmuyor; `sms:` bağlantısı servisin mesaj uygulamasını
   numarayla ve hazır metinle açıyor, göndermeye servis karar veriyor.
   Sunucu geldiğinde toplu gönderime çevrilebilir.

   YENİ BİR MÜŞTERİ VARLIĞI TANIMLANMIYOR. Kayıtlı olmayan kişi için ad
   ve telefon düz metin alanı olarak kalıyor; uygulama hesabı
   açılmıyor. Hesap açmak müşterinin kendi işi, servisin değil.

   SERİ NUMARASI GİRİLİRSE makine kayıt defterine de bir satır
   yazılıyor ve `servisId` DOLU geçiyor. O alan LOGO için tasarlanmıştı
   ve bugün hep boş; servisin elle açtığı kayıt onu bugünden doldurmaya
   başlıyor. Kayıtlı müşterinin listeden seçilen makinesi için satır
   AÇILMIYOR: o makine defterde zaten var.

   SERİ DEFTERDE ZATEN VARSA SATIR AÇILMIYOR (21 Eylül 2026). Önce
   açılıyordu: bir müşteride kayıtlı makine, talebi açan ikinci kişide
   de görünüyordu ve en yeni satır öne geçtiği için makinenin servisi
   bu servis oluyordu (bkz. lib/makineKaydi.js başı). Talep YİNE
   açılıyor — makineyi getiren sahibinin işçisi, akrabası ya da onu
   ikinci el almış biri olabilir; servis kapıdan çeviremez. Ama
   makinenin kaydı değişmiyor ve servis bunu yazarken görüyor. Makine
   başka bir müşterinin hesabındaysa İşlem Kaydı'na da düşüyor: makine
   el değiştirmiş olabilir, devri PAKSAN yapıyor.

   MAKİNENİN SAHİBİ GÖSTERİLİYOR VE ONAY İSTENİYOR (21 Eylül 2026,
   kullanıcının kararı): "Servis talebini illa kayıtlı kişi açmak zorunda
   değil, oğlu veya başka biri açmıştır. En azından onay ekranında
   makinenin asıl sahibini görüp ona göre onay alır servis." Aynı gün
   önce sahibin adı başkasının bilgisi diye gizlenmişti; karar tersine
   döndü. Servis PAKSAN'ın iş ortağı ve karşısındaki kişiye "Ahmet
   Bey'in nesi oluyorsunuz?" diye sorabilmesi için adı bilmesi gerekiyor.
   Seri yazılınca kutunun altında sahibin adı, yeri ve telefonu çıkıyor;
   servis "Anladım"a basmadan talep açılmıyor (aynı gün sonraki karar:
   önce "Talebi Aç"tan sonra bir onay yaprağı açılıyordu ve telefon
   gösterilmiyordu).
   ========================================================================== */

/* Numaranın yalnız rakamları karşılaştırılıyor: müşteri "0532 111 22 33"
   yazmış olabilir, servis "532 111 22 33". */
const rakamlar = (v) => String(v || '').replace(/\D/g, '').slice(-10)

/* Kayıtlı müşterinin adı ve soyadı. Connect hesabı ikisini ayrı tutuyor
   (`adi`, `soyadi`); ayrı alanı olmayan eski kayıtta tam ad son
   boşluktan bölünüyor — soyadı son kelime. */
function adiSoyadi(m) {
  if (m?.adi || m?.soyadi) return [m.adi || '', m.soyadi || '']
  const parca = String(m?.ad || '').trim().split(/\s+/).filter(Boolean)
  if (parca.length < 2) return [parca[0] || '', '']
  return [parca.slice(0, -1).join(' '), parca[parca.length - 1]]
}

export function ElleKayit({ oturum, onKaydedildi }) {
  const [tel, setTel] = useState('')
  /* AD VE SOYAD AYRI KUTUDA (21 Eylül 2026, kullanıcının isteği): tek
     kutuda "onu rgökay" gibi yanlış yere düşen bir boşluk kayda öyle
     geçiyordu. Kayıtta yine tek alan (`talep.ad`, veritabanında
     talep.Talep.IletisimAdi); iki kutu kaydederken birleşiyor. */
  const [adi, setAdi] = useState('')
  const [soyadi, setSoyadi] = useState('')
  /* Adı servis mi yazdı, biz mi doldurduk — bkz. `telYaz`. */
  const [adElle, setAdElle] = useState(false)
  const [il, setIl] = useState(oturum.il || '')
  const [ilce, setIlce] = useState('')
  const [adres, setAdres] = useState('')
  const [seri, setSeri] = useState('')
  const [makineId, setMakineId] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')
  /* Kayıt bitince kayıtlı olmayan müşteri için gösterilen ekran. */
  const [bitti, setBitti] = useState(null)

  /* Kayıtlı müşteriler numaraya göre aranıyor. Sunucu gelene kadar bu
     liste yalnız bu cihazdakileri görüyor; arama biçimi değişmeyecek,
     yalnız kaynağı değişecek. */
  const musteriler = useMemo(() => musterileriGetir(), [])
  const eslesen = useMemo(() => {
    const n = rakamlar(tel)
    if (n.length < 10) return null
    return musteriler.find((m) => rakamlar(m.tel) === n) || null
  }, [tel, musteriler])

  /* Numara tamamlandı ama kimse bulunamadı: uyarı ancak bu durumda
     çıkıyor, yarım yazılmış numarada değil. */
  const tamNumara = rakamlar(tel).length === 10
  const yabanci = tamNumara && !eslesen

  /* Her iki türde de soru aynı: "hangi makinesi için geldi". */
  const makineler = eslesen?.makineler || []

  /* Tek makine kendiliğinden seçili: servise sorulacak bir şey yok.
     Birden fazlaysa seçim bekleniyor. */
  const secilenMakine =
    makineler.find((m) => m.id === makineId) ||
    (makineler.length === 1 ? makineler[0] : null)

  /* Yazılan seri defterde var mı, varsa kimde. Seri tanınmıyorsa soru
     sorulmuyor: kaydet zaten hata veriyor. */
  const kayitliSatir = useMemo(() => {
    const sonuc = seri.trim() ? validateSerial(normalizeSerial(seri)) : null
    return sonuc?.ok ? seriSatiri(sonuc.serial) : null
  }, [seri])
  const buMusteride = Boolean(
    kayitliSatir &&
      eslesen &&
      ((kayitliSatir.musteriId && kayitliSatir.musteriId === eslesen.id) ||
        (kayitliSatir.musteriNo && kayitliSatir.musteriNo === eslesen.no))
  )
  const baskaMusteride = Boolean(
    kayitliSatir && (kayitliSatir.musteriId || kayitliSatir.musteriNo) && !buMusteride
  )

  /* Makine telefonu yazılan kişinin değilse kimin adına kayıtlı. Hesabı
     olan sahipte ad ve yer hesabın GÜNCEL kaydından (defterdeki ad
     makine eklendiği günün adı); hesapsız satırda servisin o gün
     yazdığı ad. */
  const baskasininMakinesi = useMemo(() => {
    if (!kayitliSatir || buMusteride) return null
    const hesap = musteriler.find(
      (m) =>
        (kayitliSatir.musteriId && m.id === kayitliSatir.musteriId) ||
        (kayitliSatir.musteriNo && m.no === kayitliSatir.musteriNo)
    )
    /* TELEFON (21 Eylül 2026, kullanıcının isteği). Hesabı olan sahipte
       hesabın numarası. Hesapsız satırda defter numara tutmuyor; numara
       o makineyi deftere yazan elle açılmış talepte duruyor. İkisi de
       yoksa satır çizilmiyor. */
    const ilkTalep = hesap
      ? null
      : load('requests', []).find(
          (t) =>
            t.elle &&
            normalizeSerial(t.makine?.serial) === normalizeSerial(kayitliSatir.seri) &&
            t.telHam
        )
    const telHam = hesap?.tel || ilkTalep?.telHam || ''
    return {
      id: kayitliSatir.id,
      ad: hesap?.ad || kayitliSatir.musteriAd || '—',
      yer: [hesap?.ilce || kayitliSatir.ilce, hesap?.il || kayitliSatir.il]
        .filter(Boolean)
        .join(' / '),
      telHam,
      tel: telHam ? telGoster(hesap?.ulke || 'TR', telHam) : '',
    }
  }, [kayitliSatir, buMusteride, musteriler])

  /* "ANLADIM" ZORUNLU (21 Eylül 2026, kullanıcının kararı): servisin
     uyarıyı okuyup anladığına dair onayı. Aynı gün önce "Talebi Aç"tan
     sonra açılan bir onay yaprağı vardı; düğme onun yerini aldı — aynı
     şeyi iki kez onaylatmak servise fazladan soru. Onay SATIRA bağlı:
     seri başka birinin makinesine değişirse yeniden isteniyor. */
  const [anlasilanSatir, setAnlasilanSatir] = useState(null)
  const anladi = Boolean(baskasininMakinesi) && anlasilanSatir === baskasininMakinesi.id

  /* Eşleşme bulununca alanlar dolduruluyor; servis isterse üzerine
     yazabiliyor (müşteri taşınmış olabilir).

     AD DA GÜNCELLENİYOR — ama servis kendi yazdıysa dokunulmuyor.

     Önce ad yalnız boşken dolduruluyordu. Servis numarayı yanlış yazıp
     düzeltince ekran şunu gösteriyordu: uyarıda ve il alanında yeni
     müşteri, ad alanında eskisi. Talep de o yanlış adla, ama yeni
     müşterinin hesabına bağlı olarak kaydediliyordu.

     `adElle` ayrımı bunu çözüyor: kendi doldurduğumuz adı
     değiştirebiliriz, servisin yazdığını değiştiremeyiz. İki kutudan
     birine servis bir şey yazdıysa ikisine de dokunulmuyor. */
  function telYaz(v) {
    setTel(v)
    setHata('')
    setMakineId('')
    const n = rakamlar(v)
    const m = n.length === 10 ? musteriler.find((x) => rakamlar(x.tel) === n) : null
    if (!m) {
      /* Eşleşme kalmadıysa bizim doldurduğumuz ad da kalkıyor. */
      if (!adElle) {
        setAdi('')
        setSoyadi('')
      }
      return
    }
    if (!adElle) {
      const [a, s] = adiSoyadi(m)
      setAdi(a)
      setSoyadi(s)
    }
    if (m.il) setIl(m.il)
    if (m.ilce) setIlce(m.ilce)
    if (m.adres) setAdres(m.adres)
  }

  /* Ad ve soyad kutusuna yalnız harf, boşluk, tire ve kesme işareti
     girer. Kullanıcı "123424 223424" yazıp talebi açabilmişti (21 Eylül
     2026): uzunluk denetimi rakamı ad sayıyordu. Rakam ve işaret
     yazılırken düşüyor; bu yüzden ayrı bir hata metnine gerek yok. */
  function adYaz(kutu, hamDeger) {
    const deger = hamDeger.replace(/[^\p{L}\s'-]/gu, '')
    const yeniAdi = kutu === 'adi' ? deger : adi
    const yeniSoyadi = kutu === 'soyadi' ? deger : soyadi
    setAdi(yeniAdi)
    setSoyadi(yeniSoyadi)
    setAdElle(Boolean(yeniAdi.trim() || yeniSoyadi.trim()))
  }

  function kaydet() {
    if (tel.replace(/\D/g, '').length < 10) return setHata('Telefon numarasını yazın.')
    const harfSayisi = (s) => (s.match(/\p{L}/gu) || []).length
    if (harfSayisi(adi) < 2) return setHata('Müşterinin adını yazın.')
    if (harfSayisi(soyadi) < 2) return setHata('Müşterinin soyadını yazın.')
    if (!il) return setHata('İl seçin.')
    if (!ilce) return setHata('İlçe seçin.')
    if (adres.trim().length < 10) return setHata('Adresi en az 10 karakter olacak şekilde yazın.')

    /* Kayıtlı müşterinin makinesi listeden seçildiyse doğrulanacak bir
       şey yok: o seri numarası zaten sistemde. Talebe uygulamadan gelen
       talebin taşıdığı şeklin aynısı yazılıyor. */
    let makine = null
    let yeniKayit = false

    if (secilenMakine) {
      makine = {
        id: secilenMakine.id,
        serial: secilenMakine.serial,
        productId: secilenMakine.productId,
      }
    } else if (seri.trim()) {
      /* validateSerial başarıda { ok, product, serial, year } döndürüyor,
         hatada { ok: false, hata }. Modeli de o dönüyor, ayrıca
         matchProduct çağırmaya gerek yok. */
      const sonuc = validateSerial(normalizeSerial(seri))
      if (!sonuc.ok) {
        return setHata('Seri numarası tanınmadı. Boş bırakabilirsiniz.')
      }
      makine = { id: uid(), serial: sonuc.serial, productId: sonuc.product?.id || null }
      yeniKayit = true
    } else if (makineler.length > 1) {
      return setHata('Hangi makine için geldiğini seçin.')
    }

    /* Seri başkasının adına kayıtlıysa servis uyarıdaki "Anladım"a
       basmış olmalı. */
    if (yeniKayit && baskasininMakinesi && !anladi) {
      return setHata('Talebi açmadan önce makinenin sahibiyle ilgili uyarıyı okuyup Anladım düğmesine basın.')
    }

    const talep = {
      id: uid(),
      no: talepNo('servis'),
      createdAt: Date.now(),
      status: 'yeni',
      tur: 'servis',
      /* "Onur Gökay" biçiminde (kullanıcının isteği, lib/adBicimi.js).
         Defter satırı, İşlem Kaydı ve SMS daveti bu alandan okuyor. */
      ad: adBicimle(`${adi} ${soyadi}`),
      tel: tel.trim(),
      telHam: tel.replace(/\D/g, ''),
      il,
      ilce,
      /* ADRES BURADA SORULUYOR (10 Eylül 2026). Servis kaydı ekranı
         talepte adres varsa onu salt okunur gösteriyor; elle açılan
         talepte adres yoktu ve kayıt ekranında ayrıca yazdırılıyordu
         (bkz. lib/servisKaydi.js → eksikAlanlar). */
      adres: adres.trim(),
      ulke: 'TR',
      ihracat: false,
      aciklama: aciklama.trim(),
      makine,
      elle: true,
      /* Kayıtlı müşteriyse talep onun hesabına bağlanıyor: kendi
         uygulamasında görüyor, bildirimleri ona düşüyor. */
      musteriId: eslesen?.id || null,
      sahip: 'servis',
      servis: { id: oturum.servisId, ad: oturum.ad, kademe: 'elle', tarih: Date.now() },
    }

    save('requests', [talep, ...load('requests', [])])

    /* Servisin elle açtığı talep de İşlem Kaydı'na düşüyor: uygulamadan
       gelen talep kaydediliyor, servisinki kaydedilmiyordu. Rol alanını
       `islemYaz` çalışan derlemeden çıkarıyor (bkz. src/lib/urun.js). */
    islemYaz({
      tur: 'talep',
      ozet: `${talep.no} · elle açıldı · ${talep.ad}${
        eslesen ? ' · kayıtlı müşteri' : ''
      }${yeniKayit && baskaMusteride ? ' · makine başka müşteride kayıtlı' : ''}`,
      personel: oturum.ad,
    })

    /* Kayıt defterine YALNIZ elle yazılan seri için satır açılıyor.
       Listeden seçilen makine defterde zaten var; ikinci satır aynı
       makineyi iki kez göstermek olurdu. Elle yazılan seri de defterde
       varsa `servisMakineKaydi` yazmadan dönüyor. */
    if (yeniKayit) {
      servisMakineKaydi({
        seri: makine.serial,
        productId: makine.productId,
        musteriId: eslesen?.id || null,
        musteriNo: eslesen?.no || null,
        musteriAd: talep.ad,
        il,
        ilce,
        servisId: oturum.servisId,
        servisAd: oturum.ad,
      })
    }

    /* Kayıtlı müşteri için ekran hemen kapanıyor: söylenecek bir şey
       yok. Kayıtlı olmayan müşteride SMS adımı gösteriliyor. */
    if (eslesen) return onKaydedildi(talep)
    setBitti(talep)
  }

  if (bitti) {
    return <Davet talep={bitti} onBitti={() => onKaydedildi(bitti)} />
  }

  return (
    <>
      <p className="ipucu">
        Uygulamayı kullanmayan, sizi telefonla arayan ya da dükkânınıza
        gelen müşteriler için talep açın.
      </p>

      <div className="kart" style={{ padding: 16 }}>
        {/* TELEFON İLK. Numara kimliğin kendisi; girildiği anda kayıtlı
            müşteri bulunuyorsa alanlar doluyor. */}
        <label className="alan">
          <span className="alan__ad">Telefon</span>
          <input
            className="gir mono"
            value={tel}
            onChange={(e) => telYaz(e.target.value)}
            placeholder="532 111 22 33"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />
        </label>

        {eslesen && (
          <div className="not not--yesil" style={{ marginTop: 0, marginBottom: 14 }}>
            <IconCheckCircle size={19} />
            <div>
              <strong>{UYGULAMA} kullanıcısı</strong>
              <p>
                {eslesen.ad} · bilgileri dolduruldu. Talep bu hesaba
                bağlanacak; müşteri kendi uygulamasında görecek.
              </p>
            </div>
          </div>
        )}

        {/* KAYITLI DEĞİLSE BAYİYE SÖYLENİYOR.

            Talep yine açılıyor; servis müşteriyi kapıdan çeviremez. Ama
            bu müşteri talebinin durumunu göremeyecek, bildirim
            alamayacak ve garantisini takip edemeyecek — bunu ona
            söyleyebilecek tek kişi karşısındaki servis. */}
        {yabanci && (
          <div className="not not--turuncu" style={{ marginTop: 0, marginBottom: 14 }}>
            <IconAlert size={19} />
            <div>
              <strong>Bu numara {uygulamaEk('da')} kayıtlı değil.</strong>
              <p>
                Müşteriye uygulamayı indirmesini söyleyin: talebinin
                durumunu kendi telefonundan takip eder, makinesini
                kaydeder ve garantisini görür. Kaydı bitirdiğinizde
                indirme bağlantısını SMS ile yollayabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Ad ve soyad YAN YANA, Connect'in kayıt ekranıyla aynı düzen ve
            aynı metinler (kullanıcının isteği): "Ad" / "Soyad", örnek
            "Ahmet" / "Yılmaz". Aynı gün önce alt alta ve "Müşterinin
            Soyadı" etiketiyle yapılmıştı; kullanıcı beğenmedi. Kısa
            etiketler telefonda sarmıyor. */}
        <div className="esit esit--ikili">
          <label className="alan">
            <span className="alan__ad">Ad</span>
            <input
              className="gir"
              value={adi}
              onChange={(e) => adYaz('adi', e.target.value)}
              placeholder="Ahmet"
              autoComplete="given-name"
              autoCapitalize="words"
            />
          </label>
          <label className="alan">
            <span className="alan__ad">Soyad</span>
            <input
              className="gir"
              value={soyadi}
              onChange={(e) => adYaz('soyadi', e.target.value)}
              placeholder="Yılmaz"
              autoComplete="family-name"
              autoCapitalize="words"
            />
          </label>
        </div>

        <div className="esit">
          <label className="alan">
            <span className="alan__ad">İl</span>
            <select
              className="gir"
              value={il}
              onChange={(e) => { setIl(e.target.value); setIlce('') }}
            >
              <option value="">Seçin</option>
              {ILLER.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="alan">
            <span className="alan__ad">İlçe</span>
            <select className="gir" value={ilce} onChange={(e) => setIlce(e.target.value)} disabled={!il}>
              <option value="">{il ? 'Seçin' : 'Önce il'}</option>
              {ilceleriGetir(il).map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>

        {/* Sesle yazma düğmesi <label>'ın dışında (bkz. Dikte.jsx). */}
        <DikteliKutu
          ad="Adres"
          deger={adres}
          onDegis={setAdres}
          satir={2}
          placeholder="Köy veya mahalle adı, adres tarifi"
          ipucu={<span className="alan__ipucu">Bu adres servis kaydına otomatik eklenir.</span>}
        />

        {/* MAKİNE: kayıtlı müşteride SEÇİLİYOR, ötekinde yazılıyor.
            Gerekçesi dosyanın başında. */}
        {makineler.length > 0 ? (
          <div className="alan">
            <span className="alan__ad">
              {makineler.length === 1 ? 'Müşterinin Makinesi' : 'Hangi Makine'}
            </span>
            {makineler.map((m) => (
              <MakineSecim
                key={m.id}
                makine={m}
                secili={secilenMakine?.id === m.id}
                tekli={makineler.length === 1}
                onSec={() => { setMakineId(m.id); setHata('') }}
              />
            ))}
            <span className="kucuk sonuk">
              {makineler.length === 1
                ? 'Müşterinin kayıtlı tek makinesi bu.'
                : 'Müşterinin kayıtlı makineleri. Hangisi için geldiyse onu seçin.'}
            </span>
          </div>
        ) : (
          <>
            <label className="alan">
              <span className="alan__ad">Makine Seri Numarası (varsa)</span>
              <input
                className="gir mono"
                value={seri}
                onChange={(e) => setSeri(e.target.value)}
                placeholder="ORK1270-2024-00157"
              />
              {/* Seri defterdeyse ipucu onu söylüyor: "sizin kaydınıza
                  bağlanır" o zaman doğru değil (bkz. dosyanın başı).
                  Başkasının makinesinde ipucunun yerini aşağıdaki uyarı
                  alıyor. */}
              {!baskasininMakinesi && (
                <span className="kucuk sonuk">
                  {buMusteride
                    ? 'Bu makine bu müşterinin adına zaten kayıtlı.'
                    : eslesen
                      ? 'Bu müşterinin kayıtlı makinesi yok. Seri numarasını elle yazabilirsiniz.'
                      : 'Yazarsanız makine sizin kaydınıza bağlanır. Model seri numarasından bulunuyor.'}
                </span>
              )}
            </label>

            {/* BAŞKASININ MAKİNESİ: sahibi ve telefonu yazılıyor
                (gerekçe dosyanın başında). Talep engellenmiyor ama
                "Anladım" basılmadan açılmıyor. Numara dokununca aranıyor:
                servis "makineyi getiren sizin nenizdir" diye sahibine
                sorabilsin. */}
            {baskasininMakinesi && (
              <div className="not not--turuncu" style={{ marginTop: 0, marginBottom: 14 }}>
                <IconAlert size={19} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>Bu makine başka birinin adına kayıtlı</strong>
                  <p>
                    Kayıtlı sahibi: {baskasininMakinesi.ad}
                    {baskasininMakinesi.yer ? ` · ${baskasininMakinesi.yer}` : ''}
                  </p>
                  {baskasininMakinesi.tel && (
                    <p>
                      Telefon:{' '}
                      <a className="mono not__tel" href={`tel:${baskasininMakinesi.telHam}`}>
                        {baskasininMakinesi.tel}
                      </a>
                    </p>
                  )}
                  <button
                    type="button"
                    className={'dg dg--blok not__onay' + (anladi ? ' not__onay--on' : '')}
                    aria-pressed={anladi}
                    onClick={() => {
                      setAnlasilanSatir(anladi ? null : baskasininMakinesi.id)
                      setHata('')
                    }}
                  >
                    {anladi && <IconCheckCircle size={19} />}
                    Anladım
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <DikteliKutu ad="Servis Talebi Nedeni" deger={aciklama} onDegis={setAciklama} satir={3} />

        {hata && <div className="uyari">{hata}</div>}
      </div>

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={kaydet}>
          Talebi Aç
        </button>
      </div>

    </>
  )
}

/* Makine satırı.

   Tek makinede de aynı satır kullanılıyor ama dokunmaya gerek yok:
   zaten seçili. Model adı ve üretim yılı seri numarasından çıkıyor,
   servis hangi makineye baktığını numaradan değil addan anlıyor. */
function MakineSecim({ makine, secili, tekli, onSec }) {
  const model = getProduct(makine.productId)?.name
  const yil = extractYear(makine.serial)

  return (
    <button
      className={'makine-sec' + (secili ? ' makine-sec--on' : '')}
      onClick={onSec}
      aria-pressed={secili}
      disabled={tekli}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{model || 'Makine'}</div>
        <div className="kucuk sonuk mono">{formatSerial(makine.serial)}</div>
        {yil && <div className="kucuk sonuk">{yil} üretimi</div>}
      </div>
      {secili && <IconCheckCircle size={20} />}
    </button>
  )
}

/* ==========================================================================
   Uygulamaya davet

   Kayıtlı olmayan müşteri için talep açıldıktan sonra çıkıyor.

   SMS'İ TELEFONUN KENDİ MESAJ UYGULAMASI GÖNDERİYOR. Sunucu yok,
   PAKSAN'ın SMS sağlayıcısı yok ve API anahtarı uygulamaya konmuyor.
   `sms:` bağlantısı numarayı ve metni hazır getiriyor; göndermeye servis
   karar veriyor. Gönderilip gönderilmediğini uygulama BİLMİYOR — bu
   yüzden hiçbir yere "gönderildi" yazılmıyor.

   Sunucu geldiğinde bu adım kendiliğinden gönderime çevrilebilir;
   metin ve adres zaten burada.
   ========================================================================== */

function Davet({ talep, onBitti }) {
  const numara = String(talep.tel || '').replace(/[^\d+]/g, '')
  const metin =
    `Merhaba ${talep.ad}, ${SIRKET.ad}. Talebiniz alındı: ${talep.no}. ` +
    `${uygulamaEk('i')} indirin; talebinizin durumunu takip eder, ` +
    `makinenizi kaydeder ve garantinizi görürsünüz: ${INDIRME_ADRESI}`

  return (
    <>
      <div className="not not--yesil" style={{ marginTop: 0 }}>
        <IconCheckCircle size={19} />
        <div>
          <strong>Talep açıldı · {talep.no}</strong>
          <p>{talep.ad} için kaydedildi. İşlerim listenizde görünecek.</p>
        </div>
      </div>

      <Bolum ad="Müşteriyi Uygulamaya Çağırın">
        <div className="kart" style={{ padding: 16 }}>
          <p className="kucuk sonuk" style={{ marginTop: 0 }}>
            Aşağıdaki düğme telefonunuzun mesaj uygulamasını hazır
            metinle açar. Mesajı siz gönderirsiniz.
          </p>
          <div className="alinti">{metin}</div>
          <a
            className="dg dg--ana dg--blok"
            style={{ marginTop: 14 }}
            href={`sms:${numara}?body=${encodeURIComponent(metin)}`}
          >
            <IconSend size={19} />
            SMS ile davet gönder
          </a>
        </div>
      </Bolum>

      <div className="yapisik">
        <button className="dg dg--blok" onClick={onBitti}>
          Bitir
        </button>
      </div>
    </>
  )
}
