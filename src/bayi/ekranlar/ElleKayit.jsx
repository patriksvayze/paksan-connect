import { useMemo, useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { INDIRME_ADRESI } from '../../config'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { extractYear, formatSerial, normalizeSerial, validateSerial } from '../../lib/serial'
import { bayiMakineKaydi } from '../../lib/makineKaydi'
import { islemYaz, musterileriGetir } from '../../backoffice/veri'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { CATEGORIES, PRODUCTS, getProduct } from '../../data/products'
import { Bolum } from '../Kabuk'
import {
  IconAlert,
  IconCheckCircle,
  IconChevronDown,
  IconSend,
} from '../../components/Icons'

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

   FİYAT TEKLİFİ TERS ÇALIŞIYOR

   Servis ve yedek parça talebi müşterinin SAHİP OLDUĞU makine için
   açılıyor. Fiyat teklifi ise sahip OLMADIĞI makine için: müşteri yeni
   bir makine almak istiyor. Bu yüzden o sekmede müşterinin kendi
   makineleri değil, PAKSAN'ın ürettiği bütün makineler listeleniyor.

   Liste yirmi kalem; alt alta düğme olarak dizilseydi ekranın yarısını
   kaplardı. Seçim tek satırda duruyor, dokununca açılıyor.

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
  { id: 'satinalma', ad: 'Fiyat Teklifi' },
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

  /* Fiyat teklifinde soru "hangi makineyi almak istiyor", öteki iki
     türde "hangi makinesi için geldi". Gerekçesi dosyanın başında. */
  const teklif = tur === 'satinalma'
  const makineler = teklif ? [] : eslesen?.makineler || []

  /* Tek makine kendiliğinden seçili: bayiye sorulacak bir şey yok.
     Birden fazlaysa seçim bekleniyor. */
  const secilenMakine =
    makineler.find((m) => m.id === makineId) ||
    (makineler.length === 1 ? makineler[0] : null)

  /* Fiyat teklifinde seçilen PAKSAN ürünü. Bu bir makine KAYDI değil,
     yalnız hangi modelin sorulduğu — talebe `urunId` olarak gidiyor,
     uygulamadan gelen fiyat teklifiyle aynı alan. */
  const [urunId, setUrunId] = useState('')

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
    if (teklif && !urunId) {
      return setHata('Teklif istenen makineyi seçin.')
    }

    /* Kayıtlı müşterinin makinesi listeden seçildiyse doğrulanacak bir
       şey yok: o seri numarası zaten sistemde. Talebe uygulamadan gelen
       talebin taşıdığı şeklin aynısı yazılıyor. */
    let makine = null
    let yeniKayit = false

    if (teklif) {
      /* Teklifte makine kaydı açılmıyor: müşterinin henüz o makinesi
         yok. Seri numarası da yok, olamaz. */
    } else if (secilenMakine) {
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
      /* Fiyat teklifinde `makine` boş, `urunId` dolu; uygulamadan gelen
         teklif talebiyle aynı şekil (bkz. RequestForm.jsx). */
      makine: teklif ? null : makine,
      urunId: teklif ? urunId : null,
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
            Fiyat teklifinde ise PAKSAN'ın bütün ürünleri listeleniyor.
            Gerekçesi dosyanın başında. */}
        {teklif ? (
          <UrunSecici
            deger={urunId}
            onDegis={(v) => { setUrunId(v); setHata('') }}
          />
        ) : makineler.length > 0 ? (
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

/* ==========================================================================
   Ürün seçici — fiyat teklifi için

   Yirmi makine var. Hepsini alt alta düğme olarak dizmek ekranın
   yarısını kaplıyordu; bayi aradığı modeli bulmak için kaydırmak
   zorunda kalıyordu.

   Kapalıyken tek satır: seçilen model, ya da "Makine seçin". Dokununca
   liste açılıyor ve kategorilere ayrılmış hâlde geliyor — bayi zaten
   "büyük balya mı, silaj mı" diye düşünüyor, model adından değil
   işinden gidiyor.

   `<select>` KULLANILMADI. Telefonda işletim sisteminin kendi tekerlek
   listesi açılıyor; orada kategori başlığı, model altındaki açıklama
   ve seçili işareti gösterilemiyor. Ayrıca dokunma hedefi bizim
   ölçümüzde değil, işletim sisteminin ölçüsünde oluyor.
   ========================================================================== */

function UrunSecici({ deger, onDegis }) {
  const [acik, setAcik] = useState(false)
  const secili = PRODUCTS.find((p) => p.id === deger)

  return (
    <div className="alan">
      <span className="alan__ad">Teklif İstenen Makine</span>

      <button
        className={'secici' + (acik ? ' secici--acik' : '')}
        onClick={() => setAcik(!acik)}
        aria-expanded={acik}
      >
        <div className="secici__yazi">
          {secili ? (
            <>
              <div>{secili.name}</div>
              <div className="kucuk sonuk">
                {CATEGORIES.find((k) => k.id === secili.category)?.short}
              </div>
            </>
          ) : (
            <span className="sonuk">Makine seçin</span>
          )}
        </div>
        <IconChevronDown size={20} />
      </button>

      {acik && (
        <div className="secici__liste">
          {CATEGORIES.map((kat) => {
            const urunler = PRODUCTS.filter((p) => p.category === kat.id)
            if (!urunler.length) return null
            return (
              <div key={kat.id}>
                <div className="secici__baslik">{kat.name}</div>
                {urunler.map((u) => (
                  <button
                    key={u.id}
                    className={'secici__satir' + (u.id === deger ? ' secici__satir--on' : '')}
                    onClick={() => { onDegis(u.id); setAcik(false) }}
                  >
                    <span>{u.name}</span>
                    {u.id === deger && <IconCheckCircle size={19} />}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <span className="kucuk sonuk">
        Müşteri bu makineyi almak istiyor. PAKSAN’ın ürettiği bütün
        makineler listede.
      </span>
    </div>
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
