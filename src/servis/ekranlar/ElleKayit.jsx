import { useMemo, useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { INDIRME_ADRESI, uygulamaEk, UYGULAMA, SIRKET } from '../../marka'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { extractYear, formatSerial, normalizeSerial, validateSerial } from '../../lib/serial'
import { servisMakineKaydi } from '../../lib/makineKaydi'
import { islemYaz, musterileriGetir } from '../../backoffice/veri'
import { getProduct } from '../../marka'
import { Bolum } from '../Kabuk'
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

   YEDEK PARÇA TALEBİNDE PARÇA SEÇİLİYOR

   Talep serbest metinden ibaret kalınca "İstenen parçalar" bölümü boş
   çıkıyor, stok düşümü çalışmıyor ve talep uygulamadan gelenle aynı
   şekilde işlenemiyordu. Parça listesi uygulamadakiyle aynı kaynaktan
   (`parcaFiyat.js`) geliyor.

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
   ========================================================================== */

/* Numaranın yalnız rakamları karşılaştırılıyor: müşteri "0532 111 22 33"
   yazmış olabilir, servis "532 111 22 33". */
const rakamlar = (v) => String(v || '').replace(/\D/g, '').slice(-10)

export function ElleKayit({ oturum, onKaydedildi }) {
  const [tel, setTel] = useState('')
  const [ad, setAd] = useState('')
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

  /* Eşleşme bulununca alanlar dolduruluyor; servis isterse üzerine
     yazabiliyor (müşteri taşınmış olabilir).

     AD DA GÜNCELLENİYOR — ama servis kendi yazdıysa dokunulmuyor.

     Önce ad yalnız boşken dolduruluyordu. Servis numarayı yanlış yazıp
     düzeltince ekran şunu gösteriyordu: uyarıda ve il alanında yeni
     müşteri, ad alanında eskisi. Talep de o yanlış adla, ama yeni
     müşterinin hesabına bağlı olarak kaydediliyordu.

     `adElle` ayrımı bunu çözüyor: kendi doldurduğumuz adı
     değiştirebiliriz, servisin yazdığını değiştiremeyiz. */
  function telYaz(v) {
    setTel(v)
    setHata('')
    setMakineId('')
    const n = rakamlar(v)
    const m = n.length === 10 ? musteriler.find((x) => rakamlar(x.tel) === n) : null
    if (!m) {
      /* Eşleşme kalmadıysa bizim doldurduğumuz ad da kalkıyor. */
      if (!adElle) setAd('')
      return
    }
    if (!adElle) setAd(m.ad || '')
    if (m.il) setIl(m.il)
    if (m.ilce) setIlce(m.ilce)
    if (m.adres) setAdres(m.adres)
  }

  function kaydet() {
    if (tel.replace(/\D/g, '').length < 10) return setHata('Telefon numarasını yazın.')
    if (ad.trim().length < 3) return setHata('Müşterinin adını yazın.')
    if (!il) return setHata('İl seçin.')
    if (!ilce) return setHata('İlçe seçin.')
    if (adres.trim().length < 10) return setHata('Adresi yazın.')

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

    const talep = {
      id: uid(),
      no: talepNo('servis'),
      createdAt: Date.now(),
      status: 'yeni',
      tur: 'servis',
      ad: ad.trim(),
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
      }`,
      personel: oturum.ad,
    })

    /* Kayıt defterine YALNIZ elle yazılan seri için satır açılıyor.
       Listeden seçilen makine defterde zaten var; ikinci satır aynı
       makineyi iki kez göstermek olurdu. */
    if (yeniKayit) {
      servisMakineKaydi({
        seri: makine.serial,
        productId: makine.productId,
        musteriId: eslesen?.id || null,
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
            placeholder="0532 111 22 33"
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

        <label className="alan">
          <span className="alan__ad">Müşterinin Adı</span>
          <input
            className="gir"
            value={ad}
            onChange={(e) => {
              setAd(e.target.value)
              setAdElle(e.target.value.trim().length > 0)
            }}
          />
        </label>

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

        <label className="alan">
          <span className="alan__ad">Adres</span>
          <textarea
            className="gir"
            rows={2}
            value={adres}
            onChange={(e) => setAdres(e.target.value)}
            placeholder="Köy ya da mahalle, tarif"
          />
          <span className="kucuk sonuk">Servis kaydına kendiliğinden gelir.</span>
        </label>

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
          <label className="alan">
            <span className="alan__ad">Makine Seri Numarası (varsa)</span>
            <input
              className="gir mono"
              value={seri}
              onChange={(e) => setSeri(e.target.value)}
              placeholder="ORK1270-2024-00157"
            />
            <span className="kucuk sonuk">
              {eslesen
                ? 'Bu müşterinin kayıtlı makinesi yok. Seri numarasını elle yazabilirsiniz.'
                : 'Yazarsanız makine sizin kaydınıza bağlanır. Model seri numarasından bulunuyor.'}
            </span>
          </label>
        )}

        <label className="alan">
          <span className="alan__ad">Servis Talebi Nedeni</span>
          <textarea
            className="gir"
            rows={3}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
          />
        </label>

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
