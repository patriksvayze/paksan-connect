import { useEffect, useId, useRef, useState } from 'react'
import { ILLER, ilceleriGetir } from '../data/iller'
import { adresYazisi, teslimatEksigi, teslimatTelGiris, teslimatTelYaz } from '../lib/teslimat'
import { adresEkle, adresleriGetir, adresTeslimata } from './adresler'
import { useGeri } from './geri'
import { Sayfa } from './Kabuk'
import { DikteliKutu } from './Dikte'
import { IconPlus } from '../components/Icons'

/* ==========================================================================
   Teslimat adresi seçici — Adreslerim'in sipariş ekranındaki yüzü

   KULLANICININ İSTEĞİ (17 Eylül 2026): "Adres Ekle" ve yanında "Elle
   Gir". Servis parçayı bazen dükkânına, bazen doğrudan müşterinin
   tarlasına göndertiyor; müşterinin adresini defterine kaydetmek
   istemiyor. İkisi de tek dokunuş uzakta.

   FİRMA ADRESİ HAZIR GELİYOR (18 Eylül 2026, kullanıcının isteği).
   Defterin ilk satırı PAKSAN kaydındaki firma adresi; servis hiçbir şey
   yapmadan seçili geliyor (bkz. adresler.js → firmaAdresi). Aşağıdaki
   "Defter boş" hâli bu yüzden artık yalnız PAKSAN kaydında adres
   yazmayan servis için çıkıyor.

   ÜÇ HÂL

     · Defter boş      iki düğme ve ikisinin farkını anlatan bir satır.
                       Boş ekran çıkmaz sokak değil: ne yapılacağı yazıyor.
     · Defter dolu     adres kartları (varsayılan başta ve SEÇİLİ gelir),
                       altında yine iki düğme.
     · Elle            kartların yerinde bir kerelik adres alanları;
                       "Adres Seçimine Dön" ile kartlara dönülüyor. Yazılan
                       kaybolmuyor, geri gelinirse yerinde. Kartlara
                       dönünce elle moduna girmeden önce seçili olan
                       adres de yerinde: seçim sessizce varsayılana
                       atlamıyor.

   ANDROİD GERİ TUŞU elle modunda "Adres Seçimine Dön" ile aynı işi
   yapıyor (bkz. geri.jsx). Yakalanmadığında sıra ebeveyne düşüyordu ve
   servis kaydında bütün ekran kapanıyordu: yarım doldurulmuş arıza,
   tespit, parça listesi ve fotoğraf uyarısız gidiyordu.

   DEĞER YUKARI VERİLİYOR. Seçici neyin seçildiğini tutmuyor, ebeveyn
   tutuyor: sipariş ekranının özet adımı kapanıp açıldığında seçim
   kaybolmasın. Biçim lib/teslimat.js başında.

   "ADRES EKLE" TAM EKRAN AÇILIYOR. Altı alanlı bir form klavyeyle
   dolduruluyor; alttan açılan yaprağa sıkıştırılınca klavye formun
   yarısını örtüyordu. Parça seçimi gibi (bkz. ekranlar/ParcaSec.jsx)
   sipariş arkada bekliyor, kaydedince aynı yerden devam ediliyor ve
   yeni adres SEÇİLİ geliyor.

   Adres düzenleme ve silme burada YOK: seçim ekranı tek iş yapıyor.
   Onlar Hesap → Adreslerim'de (bkz. ekranlar/Adreslerim.jsx).

   METİNLER TEK NESNEDE: hepsi aşağıdaki ADRES_METNI nesnesinde toplu.
   Codex'ten 19 Eylül 2026'da geçti; yeni metin eklenirse o da buraya
   yazılır, tek tek dağıtılmaz.
   ========================================================================== */
export const ADRES_METNI = {
  // Alanlar
  baslikAd: 'Adres adı',
  baslikIpucu: 'Listede bu adla görünür.',
  baslikOnerileri: ['İş Yeri', 'Depo', 'Ev'],
  aliciAd: 'Teslim alacak kişi',
  telAd: 'Telefon',
  telIpucu: 'Kargo görevlisi gerektiğinde bu numaradan ulaşır.',
  ilAd: 'İl',
  ilceAd: 'İlçe',
  secin: 'Seçin',
  onceIl: 'Önce il seçin',
  acikAdresAd: 'Açık adres',
  acikAdresIpucu: 'Mahalle, sokak, bina ve kapı numarası',

  /* Eksik alan uyarıları — alanların sırasıyla. Uyarı servis kaydında
     sayfanın dibinde çıkıyor ve orada müşterinin telefonu da soruluyor;
     her cümle teslimat alanı olduğunu kendisi söylüyor. */
  eksik: {
    adres: 'Teslimat adresini seçin.',
    baslik: 'Teslimat adresine bir ad verin. Örnek: İş Yeri, Depo.',
    alici: 'Parçayı teslim alacak kişinin adını yazın.',
    tel: 'Parçayı teslim alacak kişinin telefon numarasını eksiksiz yazın.',
    il: 'Teslimat adresinin ilini seçin.',
    ilce: 'Teslimat adresinin ilçesini seçin.',
    acikAdres: 'Teslimat adresini mahalle, sokak, bina ve kapı numarasıyla yazın.',
  },

  // Seçici
  bosAciklama:
    'Sonraki siparişlerde de kullanmak için adres ekleyin. Yalnız bu siparişte kullanacaksanız adresi elle girin.',
  adresEkle: 'Adres Ekle',
  elleGir: 'Elle Gir',
  varsayilan: 'Varsayılan',
  firmaRozet: `PAKSAN kaydınız`,
  hesaptanDegistir: `Firma adresiniz PAKSAN kaydınızdan gelir ve uygulamadan değiştirilemez. Güncellemek için bizi arayın. Kendi eklediğiniz adresleri Hesap ekranındaki Adreslerim bölümünden düzenleyebilirsiniz.`,
  hesaptanDegistirKendi:
    'Kendi eklediğiniz adresleri Hesap ekranındaki Adreslerim bölümünden düzenleyebilirsiniz.',
  elleAciklama: 'Bu adres yalnız bu siparişte kullanılır, adres listenize kaydedilmez.',
  secimeDon: 'Adres Seçimine Dön',

  // Form sayfası
  formBaslikEkle: 'Adres Ekle',
  formBaslikDuzenle: 'Adresi Düzenle',
  formAlt: 'Parçalarınızın gönderileceği adres',
  firmaOneriBaslik: 'İş Yeri',
  firmaOneriNotu: `Form, PAKSAN kaydınızdaki firma adresiyle dolduruldu. Buradaki bilgileri değiştirip yeni bir adres olarak kaydedebilirsiniz. Firma adresiniz değişmez.`,
  kaydet: 'Adresi Kaydet',
}

/* Adres taslağında yazılmış bir şey var mı? "Elle Gir" alanlarını
   öneriyle doldurmadan önce buna bakılıyor: dolu bir taslağın üstüne
   öneri yazılmıyor. */
const adresDolu = (a) =>
  Boolean(a) && ['alici', 'tel', 'il', 'ilce', 'acikAdres'].some((k) => String(a[k] ?? '').trim())

/** Seçimin eksiği varsa ekranda yazılacak cümle, yoksa null. */
export function teslimatHatasi(deger) {
  const eksik = teslimatEksigi(deger)
  return eksik ? ADRES_METNI.eksik[eksik] || ADRES_METNI.eksik.adres : null
}

/* -------------------------------------------------------------- Alanlar */

/**
 * Adresin yazı alanları. Hem "Adres Ekle" formu hem "Elle Gir" bunu
 * kullanıyor; iki yerde iki ayrı form olmasın.
 *
 * @param {{ deger: object, onDegis: (v: object) => void, baslikli?: boolean }} p
 */
export function AdresAlanlari({ deger, onDegis, baslikli = false }) {
  const M = ADRES_METNI
  const baslikId = useId()
  const d = deger || {}
  const degis = (alan, v) => onDegis({ ...d, [alan]: v })

  return (
    <>
      {baslikli && (
        <div className="alan">
          <label className="alan__ad" htmlFor={baslikId}>
            {M.baslikAd}
          </label>
          <input
            id={baslikId}
            className="gir"
            value={d.baslik || ''}
            onChange={(e) => degis('baslik', e.target.value)}
            maxLength={40}
          />
          {/* Sık kullanılan adlar tek dokunuşla yazılıyor; kutu yine
              serbest, servis kendi adını da verebiliyor. */}
          <div className="hap-liste adres-haplar">
            {M.baslikOnerileri.map((ad) => (
              <button
                key={ad}
                type="button"
                className={'hap' + (d.baslik === ad ? ' hap--on' : '')}
                aria-pressed={d.baslik === ad}
                onClick={() => degis('baslik', ad)}
              >
                {ad}
              </button>
            ))}
          </div>
          <span className="alan__ipucu">{M.baslikIpucu}</span>
        </div>
      )}

      <label className="alan">
        <span className="alan__ad">{M.aliciAd}</span>
        <input
          className="gir"
          value={d.alici || ''}
          onChange={(e) => degis('alici', e.target.value)}
          autoComplete="name"
        />
      </label>

      <label className="alan">
        <span className="alan__ad">{M.telAd}</span>
        <input
          className="gir mono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={d.tel || ''}
          onChange={(e) => degis('tel', teslimatTelGiris(e.target.value))}
          placeholder="0532 111 22 33"
          maxLength={16}
        />
        <span className="alan__ipucu">{M.telIpucu}</span>
      </label>

      <div className="esit">
        <label className="alan">
          <span className="alan__ad">{M.ilAd}</span>
          <select
            className="gir"
            value={d.il || ''}
            onChange={(e) => onDegis({ ...d, il: e.target.value, ilce: '' })}
          >
            <option value="">{M.secin}</option>
            {ILLER.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="alan">
          <span className="alan__ad">{M.ilceAd}</span>
          <select
            className="gir"
            value={d.ilce || ''}
            onChange={(e) => degis('ilce', e.target.value)}
            disabled={!d.il}
          >
            <option value="">{d.il ? M.secin : M.onceIl}</option>
            {ilceleriGetir(d.il).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Açık adres cümle; sesle yazılabiliyor (bkz. Dikte.jsx). Ad ve
          telefon tek satır, onlarda şerit yok. */}
      <DikteliKutu
        ad={M.acikAdresAd}
        deger={d.acikAdres || ''}
        onDegis={(v) => degis('acikAdres', v)}
        satir={3}
        placeholder={M.acikAdresIpucu}
      />
    </>
  )
}

/* ---------------------------------------------------------- Form sayfası */

/**
 * Tam ekran adres formu. Kaydet'e basılınca `onKaydet(veri)` çağrılıyor;
 * eksik alan adı dönerse uyarı yazılıyor ve sayfa açık kalıyor.
 *
 * @param {{
 *   ilk?: object, duzenle?: boolean, not?: string,
 *   onKaydet: (veri: object) => (string|null), onKapat: () => void,
 * }} p
 */
export function AdresFormu({ ilk, duzenle = false, not, onKaydet, onKapat }) {
  const M = ADRES_METNI
  const [veri, setVeri] = useState(() => ({ ...(ilk || {}) }))
  const [hata, setHata] = useState('')

  function kaydet() {
    const eksik = onKaydet(veri)
    if (eksik) return setHata(M.eksik[eksik] || M.eksik.adres)
    setHata('')
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={duzenle ? M.formBaslikDuzenle : M.formBaslikEkle}
        alt={M.formAlt}
        onGeri={onKapat}
        dip={
          <>
            {/* Uyarı dipte, düğmenin üstünde: form uzun, klavye açık;
                sayfanın sonuna yazılan uyarı görünmüyordu. */}
            {hata && (
              <p className="uyari adres-form__hata" role="alert">
                {hata}
              </p>
            )}
            <button className="dg dg--ana dg--blok" onClick={kaydet}>
              {M.kaydet}
            </button>
          </>
        }
      >
        {not && <p className="ipucu">{not}</p>}
        <div className="kart adres-form">
          <AdresAlanlari
            deger={veri}
            onDegis={(v) => {
              setVeri(v)
              if (hata) setHata('')
            }}
            baslikli
          />
        </div>
      </Sayfa>
    </div>
  )
}

/* --------------------------------------------------------------- Seçici */

/**
 * @param {{
 *   servisId: string,
 *   deger: object|null,
 *   onDegis: (teslimat: object|null) => void,
 *   oneri?: object,     // servisin firma adresi (bkz. adresler.js → firmaAdresiOnerisi)
 *   elleOneri?: object, // "Elle Gir" alanlarının başlangıcı
 *   elleNotu?: string,  // başlangıcın nereden geldiğini söyleyen satır
 * }} p
 */
export function AdresSecici({ servisId, deger, onDegis, oneri, elleOneri, elleNotu }) {
  const M = ADRES_METNI
  const [adresler, setAdresler] = useState(() => adresleriGetir(servisId))
  const [elle, setElle] = useState(() => deger?.kaynak === 'elle')
  const [elleVeri, setElleVeri] = useState(() =>
    deger?.kaynak === 'elle' ? { ...deger } : { ...(elleOneri || {}) },
  )
  const [formAcik, setFormAcik] = useState(false)
  /* Elle moduna girerken seçili olan kayıtlı adres; "Adres Seçimine
     Dön" onu geri veriyor. */
  const [sonKayitli, setSonKayitli] = useState(() => (deger?.kaynak === 'kayitli' ? deger : null))
  /* Elle alanları öneriyle mi doldu? Not yalnız o zaman yazılıyor.
     Açılışta alanlar zaten öneriden kopyalanıyor; servisin kendi
     yazdığı bir kerelik adresle geri gelindiğinde ise not çıkmıyor. */
  const [oneriIle, setOneriIle] = useState(() => deger?.kaynak !== 'elle' && adresDolu(elleOneri))

  /* Ebeveynin işleyicisi her çizimde yeniden yaratılıyor; etkiyi
     tetiklemesin diye ref üzerinden çağrılıyor. */
  const onDegisRef = useRef(onDegis)
  onDegisRef.current = onDegis

  /* KAYITLI ADRES HEP DEFTERDEKİ HÂLİYLE. Seçim yoksa varsayılan
     seçiliyor; seçili adres defterde değiştiyse anlık görüntü
     tazeleniyor, silindiyse varsayılana dönülüyor. */
  useEffect(() => {
    if (elle) return
    const bulunan =
      deger?.kaynak === 'kayitli' ? adresler.find((a) => a.id === deger.adresId) : null
    const secilecek = bulunan || adresler[0] || null
    const taze = adresTeslimata(secilecek)
    if (!taze) {
      if (deger) onDegisRef.current(null)
      return
    }
    if (
      !deger ||
      deger.kaynak !== 'kayitli' ||
      deger.adresId !== taze.adresId ||
      deger.yazi !== taze.yazi ||
      deger.baslik !== taze.baslik
    ) {
      onDegisRef.current(taze)
    }
  }, [adresler, elle, deger])

  /* ÖNERİ YALNIZ AÇILIŞTA DEĞİL, ELLE GİR'E BASILDIĞINDA DA OKUNUYOR.
     Ebeveynin önerisi sonradan doluyor olabilir: telefonla açılmış bir
     talepte servis önce parçayı seçiyor, müşterinin adını ve adresini
     sonra yazıyor. Yalnız açılışta okunduğunda alanlar boş açılıyordu
     ve servis aynı adresi ikinci kez yazmak zorunda kalıyordu — üstelik
     ekranda "dolduruldu" yazarken. Yazılmış bir şey varsa ona
     dokunulmuyor: servisin emeği öneriyle ezilmez. */
  function elleAc() {
    if (deger?.kaynak === 'kayitli') setSonKayitli(deger)
    const bos = !adresDolu(elleVeri)
    const baslangic = bos ? { ...(elleOneri || {}) } : elleVeri
    if (bos) {
      setElleVeri(baslangic)
      setOneriIle(adresDolu(elleOneri))
    }
    setElle(true)
    onDegis({ ...baslangic, kaynak: 'elle' })
  }

  function elleYaz(v) {
    setElleVeri(v)
    onDegis({ ...v, kaynak: 'elle' })
  }

  function secimeDon() {
    setElle(false)
    /* Elle moduna girmeden önceki kayıtlı seçim geri veriliyor. Yoksa
       etki varsayılanı seçiyor; defter boşsa seçim boşalıyor ve iki
       düğme geri geliyor. */
    onDegis(sonKayitli || null)
  }

  /* Geri tuşu elle modunda ekrandaki "Adres Seçimine Dön" ile aynı
     şeyi yapıyor; karşılanmazsa sıra ebeveyne düşüyor ve servis
     kaydı kapanıyordu. */
  useGeri(elle, secimeDon)

  /* Formun başlangıcı. Firma adresi deftere hazır geldiği için buradaki
     öneri artık EKSTRA adres için: yalnız alıcı, telefon ve il geliyor
     — ikinci adres başka bir yer ama teslim alacak kişi çoğu zaman
     aynı. Defter gerçekten boşsa (PAKSAN kaydında adres yazmıyorsa)
     eski davranış sürüyor ve formun tamamı öneriyle doluyor. */
  const ilkAdres = adresler.length === 0
  const formIlk = oneri
    ? ilkAdres
      ? { baslik: M.firmaOneriBaslik, ...oneri }
      : { alici: oneri.alici, tel: oneri.tel, il: oneri.il }
    : {}
  const formNotu = oneri && ilkAdres && oneri.acikAdres ? M.firmaOneriNotu : ''

  const dugmeler = (
    <div className="adres-dugmeler">
      <button type="button" className="dg dg--blok" onClick={() => setFormAcik(true)}>
        <IconPlus size={19} />
        {M.adresEkle}
      </button>
      <button type="button" className="dg dg--blok" onClick={elleAc}>
        {M.elleGir}
      </button>
    </div>
  )

  return (
    <>
      {elle ? (
        <>
          {/* Not yalnız alanlar gerçekten öneriyle dolduysa yazılıyor:
              "Müşterinin bilgileriyle dolduruldu" diyen bir satırın
              altında boş alanlar durmasın. */}
          <p className="alan__ipucu adres-elle__not">
            {M.elleAciklama}
            {oneriIle && elleNotu ? ` ${elleNotu}` : ''}
          </p>
          <div className="kart adres-form">
            <AdresAlanlari deger={elleVeri} onDegis={elleYaz} />
          </div>
          <button type="button" className="dg dg--blok adres-geri" onClick={secimeDon}>
            {M.secimeDon}
          </button>
        </>
      ) : adresler.length === 0 ? (
        <>
          <p className="alan__ipucu adres-bos">{M.bosAciklama}</p>
          {dugmeler}
        </>
      ) : (
        <>
          <div className="secenek adres-secenek" role="radiogroup">
            {adresler.map((a) => {
              const secili = deger?.kaynak === 'kayitli' && deger.adresId === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  className={'buyuk-sec adres-sec' + (secili ? ' buyuk-sec--on' : '')}
                  onClick={() => onDegis(adresTeslimata(a))}
                >
                  <span className="buyuk-sec__ad adres-sec__bas">
                    <span className="adres-sec__ad">{a.baslik}</span>
                    {a.varsayilan && <span className="adres-rozet">{M.varsayilan}</span>}
                    {/* "PAKSAN kaydınız" rozeti BURADA YOK, Adreslerim'de
                        var. Ölçüldü: iki rozet 375 piksellik telefonda
                        başlığın altına sarıyor ve kart üç satır etiketle
                        açılıyor. Seçerken gereken bilgi hangi adres
                        olduğu; nereden geldiğini altındaki satır ve
                        Adreslerim zaten söylüyor. */}
                  </span>
                  <span className="buyuk-sec__alt">
                    {[a.alici, teslimatTelYaz(a.tel)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="buyuk-sec__alt">{adresYazisi(a)}</span>
                </button>
              )
            })}
          </div>
          {dugmeler}
          {/* Firma adresi yoksa (PAKSAN kaydında adres yazmıyorsa) o
              cümlenin ilk yarısı yanlış olurdu; bütün satır o zaman
              kısa hâline düşüyor. */}
          <p className="alan__ipucu">
            {adresler.some((a) => a.firma) ? M.hesaptanDegistir : M.hesaptanDegistirKendi}
          </p>
        </>
      )}

      {formAcik && (
        <AdresFormu
          ilk={formIlk}
          not={formNotu}
          onKapat={() => setFormAcik(false)}
          onKaydet={(veri) => {
            const sonuc = adresEkle(servisId, veri)
            if (sonuc.eksik) return sonuc.eksik
            /* Yeni adres seçili geliyor: servis onu bu sipariş için
               ekledi. */
            setAdresler(adresleriGetir(servisId))
            setElle(false)
            onDegis(adresTeslimata(sonuc.adres))
            setFormAcik(false)
            return null
          }}
        />
      )}
    </>
  )
}
