import { useMemo, useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { INDIRME_ADRESI } from '../../config'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { extractYear, formatSerial, normalizeSerial, validateSerial } from '../../lib/serial'
import { bayiMakineKaydi } from '../../lib/makineKaydi'
import { islemYaz, musterileriGetir } from '../../backoffice/veri'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { getProduct } from '../../data/products'
import { Bolum } from '../Kabuk'
import { IconAlert, IconCheckCircle, IconSend } from '../../components/Icons'

/* ==========================================================================
   Bayi paneli — elle kayıt

   Bayiye doğrudan gelen müşteri için. Uygulamayı kullanmayan, telefonla
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

   Önce ad soruluyordu; bayi adı yazdıktan sonra numarayı giriyordu ve
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
   seçili başlıyor, birden fazlaysa bayi seçiyor.

   Sebebi elle yazmanın burada işe yaramaması: seri numarası zaten
   sistemde duruyor, bayi onu müşteriden telefonda okuyup yazınca tek
   yaptığı şey hata riski eklemek oluyordu. Yanlış yazılan bir hane
   makineyi bulunamaz yapıyor, garanti de yanlış hesaplanıyor.

   Müşteri kayıtlı ama hiç makinesi yoksa kutu geri geliyor; o zaman
   elle yazmak tek yol.

   FİYAT TEKLİFİ SEKMESİ KALDIRILDI

   Kısa süre buradaydı ve yanlıştı. Talep türleri MÜŞTERİ
   uygulamasından geliyor: çiftçi PAKSAN'a servis, parça ya da fiyat
   sorabiliyor, soru bölgesindeki bayiye düşüyor. Üçü de oradan
   bakınca doğru.

   Ama bayi elle kayıt açtığında durum tersine dönüyor: FİYATI VEREN
   ZATEN BAYİ. Dükkânına gelip "Orkinos 1270 kaça?" diye soran
   müşteriye bayi cevabı kendi veriyor; PAKSAN'a bir talep açıp
   beklemiyor. Kendi kendine teklif istemek gibi bir şey oluyordu.

   Bayi tarafında fiyat teklifi talepleri YİNE GÖRÜNÜYOR — uygulamadan
   gelenler. Kaldırılan yalnız bayinin kendi eliyle açması.

   BUNUN GERÇEK BİR KOMŞUSU VAR ama henüz yapılamaz: bayinin PAKSAN'dan
   ÖZEL FİYAT ONAYI istemesi (filo alımı, taşımadığı model, ihracat).
   O bir "müşteri talebi" değil, iskonto onayıdır ve sistemde henüz
   fiyat yok — onaylanacak bir şey yok. Fiyat listesi geldiğinde
   ayrı bir akış olarak düşünülmeli (bkz. BAYI-YOL-HARITASI.md).

   KAYITLI OLMAYAN MÜŞTERİ

   Talep yine açılıyor — bayi müşteriyi kapıdan çeviremez. Ama iki şey
   ekleniyor: formda bayiye uygulamayı anlatması söyleniyor, kayıt
   bitince de müşteriye indirme bağlantısını SMS ile yollayabiliyor.

   SMS'İ TELEFONUN KENDİSİ GÖNDERİYOR. Sunucu yok ve API anahtarı
   uygulamaya konmuyor; `sms:` bağlantısı bayinin mesaj uygulamasını
   numarayla ve hazır metinle açıyor, göndermeye bayi karar veriyor.
   Sunucu geldiğinde toplu gönderime çevrilebilir.

   YENİ BİR MÜŞTERİ VARLIĞI TANIMLANMIYOR. Kayıtlı olmayan kişi için ad
   ve telefon düz metin alanı olarak kalıyor; uygulama hesabı
   açılmıyor. Hesap açmak müşterinin kendi işi, bayinin değil.

   SERİ NUMARASI GİRİLİRSE makine kayıt defterine de bir satır
   yazılıyor ve `bayiId` DOLU geçiyor. O alan LOGO için tasarlanmıştı
   ve bugün hep boş; bayinin elle açtığı kayıt onu bugünden doldurmaya
   başlıyor. Kayıtlı müşterinin listeden seçilen makinesi için satır
   AÇILMIYOR: o makine defterde zaten var.
   ========================================================================== */

const TURLER = [
  { id: 'servis', ad: 'Servis' },
  { id: 'parca', ad: 'Yedek Parça' },
]

/* Numaranın yalnız rakamları karşılaştırılıyor: müşteri "0532 111 22 33"
   yazmış olabilir, bayi "532 111 22 33". */
const rakamlar = (v) => String(v || '').replace(/\D/g, '').slice(-10)

export function ElleKayit({ oturum, onKaydedildi }) {
  const [tur, setTur] = useState('servis')
  const [tel, setTel] = useState('')
  const [ad, setAd] = useState('')
  /* Adı bayi mi yazdı, biz mi doldurduk — bkz. `telYaz`. */
  const [adElle, setAdElle] = useState(false)
  const [il, setIl] = useState(oturum.il || '')
  const [ilce, setIlce] = useState('')
  const [seri, setSeri] = useState('')
  const [makineId, setMakineId] = useState('')
  const [parcalar, setParcalar] = useState({})
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

  /* Tek makine kendiliğinden seçili: bayiye sorulacak bir şey yok.
     Birden fazlaysa seçim bekleniyor. */
  const secilenMakine =
    makineler.find((m) => m.id === makineId) ||
    (makineler.length === 1 ? makineler[0] : null)

  /* Eşleşme bulununca alanlar dolduruluyor; bayi isterse üzerine
     yazabiliyor (müşteri taşınmış olabilir).

     AD DA GÜNCELLENİYOR — ama bayi kendi yazdıysa dokunulmuyor.

     Önce ad yalnız boşken dolduruluyordu. Bayi numarayı yanlış yazıp
     düzeltince ekran şunu gösteriyordu: uyarıda ve il alanında yeni
     müşteri, ad alanında eskisi. Talep de o yanlış adla, ama yeni
     müşterinin hesabına bağlı olarak kaydediliyordu.

     `adElle` ayrımı bunu çözüyor: kendi doldurduğumuz adı
     değiştirebiliriz, bayinin yazdığını değiştiremeyiz. */
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
  }

  const secilenParcalar = Object.entries(parcalar)
    .filter(([, adet]) => Number(adet) > 0)
    .map(([adi, adet]) => ({ adi, adet: Number(adet) }))

  function kaydet() {
    if (tel.replace(/\D/g, '').length < 10) return setHata('Telefon numarasını yazın.')
    if (ad.trim().length < 3) return setHata('Müşterinin adını yazın.')
    if (!il) return setHata('İl seçin.')
    if (!ilce) return setHata('İlçe seçin.')
    if (tur === 'parca' && !secilenParcalar.length) {
      return setHata('En az bir parça seçin.')
    }

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
      no: talepNo(tur),
      createdAt: Date.now(),
      status: 'yeni',
      tur,
      ad: ad.trim(),
      tel: tel.trim(),
      telHam: tel.replace(/\D/g, ''),
      il,
      ilce,
      ulke: 'TR',
      ihracat: false,
      aciklama: aciklama.trim(),
      makine,
      elle: true,
      /* Kayıtlı müşteriyse talep onun hesabına bağlanıyor: kendi
         uygulamasında görüyor, bildirimleri ona düşüyor. */
      musteriId: eslesen?.id || null,
      sahip: 'bayi',
      bayi: { id: oturum.bayiId, ad: oturum.ad, kademe: 'elle', tarih: Date.now() },
    }

    /* Parça talebi uygulamadan gelenle aynı şekli taşıyor; böylece
       "İstenen parçalar" bölümü ve stok düşümü çalışıyor. */
    if (tur === 'parca') {
      talep.parcalar = secilenParcalar.map((p) => p.adi)
      talep.parcaAdet = Object.fromEntries(secilenParcalar.map((p) => [p.adi, p.adet]))
    }

    save('requests', [talep, ...load('requests', [])])

    /* Bayinin elle açtığı talep de İşlem Kaydı'na düşüyor: uygulamadan
       gelen talep kaydediliyor, bayininki kaydedilmiyordu. Rol alanını
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
      bayiMakineKaydi({
        seri: makine.serial,
        productId: makine.productId,
        musteriId: eslesen?.id || null,
        musteriAd: talep.ad,
        il,
        ilce,
        bayiId: oturum.bayiId,
        bayiAd: oturum.ad,
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
        <div className="alan">
          <span className="alan__ad">Talep Türü</span>
          <div className="suzgec">
            {TURLER.map((t) => (
              <button
                key={t.id}
                className={'cip' + (tur === t.id ? ' cip--on' : '')}
                onClick={() => { setTur(t.id); setHata('') }}
              >
                {t.ad}
              </button>
            ))}
          </div>
        </div>

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
              <strong>PAKSAN Connect kullanıcısı</strong>
              <p>
                {eslesen.ad} · bilgileri dolduruldu. Talep bu hesaba
                bağlanacak; müşteri kendi uygulamasında görecek.
              </p>
            </div>
          </div>
        )}

        {/* KAYITLI DEĞİLSE BAYİYE SÖYLENİYOR.

            Talep yine açılıyor; bayi müşteriyi kapıdan çeviremez. Ama
            bu müşteri talebinin durumunu göremeyecek, bildirim
            alamayacak ve garantisini takip edemeyecek — bunu ona
            söyleyebilecek tek kişi karşısındaki bayi. */}
        {yabanci && (
          <div className="not not--turuncu" style={{ marginTop: 0, marginBottom: 14 }}>
            <IconAlert size={19} />
            <div>
              <strong>Bu numara PAKSAN Connect’te kayıtlı değil.</strong>
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
          <span className="alan__ad">Müşteri ne anlattı</span>
          <textarea
            className="gir"
            rows={3}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
          />
        </label>

        {hata && <div className="uyari">{hata}</div>}
      </div>

      {/* Parça seçimi yalnız parça talebinde. Uygulamadaki talebin aynı
          şeklini üretiyor: "İstenen parçalar" ve stok düşümü çalışsın. */}
      {tur === 'parca' && (
        <Bolum ad="İstenen Parçalar" sayi={secilenParcalar.length}>
          <div className="kart" style={{ padding: '4px 16px' }}>
            {Object.entries(PARCA_FIYAT).map(([adi, bilgi]) => (
              <div key={adi} className="stok-satir">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{adi}</div>
                  <div className="kucuk sonuk mono">{bilgi.kod}</div>
                </div>
                <input
                  className="gir mono"
                  style={{ width: 82, textAlign: 'right' }}
                  inputMode="numeric"
                  value={parcalar[adi] || ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setParcalar((p) => ({ ...p, [adi]: v }))
                    setHata('')
                  }}
                  placeholder="0"
                  aria-label={adi + ' adedi'}
                />
              </div>
            ))}
          </div>
        </Bolum>
      )}

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
   bayi hangi makineye baktığını numaradan değil addan anlıyor. */
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
   `sms:` bağlantısı numarayı ve metni hazır getiriyor; göndermeye bayi
   karar veriyor. Gönderilip gönderilmediğini uygulama BİLMİYOR — bu
   yüzden hiçbir yere "gönderildi" yazılmıyor.

   Sunucu geldiğinde bu adım kendiliğinden gönderime çevrilebilir;
   metin ve adres zaten burada.
   ========================================================================== */

function Davet({ talep, onBitti }) {
  const numara = String(talep.tel || '').replace(/[^\d+]/g, '')
  const metin =
    `Merhaba ${talep.ad}, PAKSAN Makina. Talebiniz alındı: ${talep.no}. ` +
    `PAKSAN Connect’i indirin; talebinizin durumunu takip eder, ` +
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
