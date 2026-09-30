import { useEffect, useId, useRef, useState } from 'react'
import { MARKA } from '../marka'
import { baslat, izinDurumu, izinIste, kullanilabilir, yaziyaEkle } from './dikteMotoru'
import { Onay } from './Kabuk'
import { IconMic, IconStop } from '../components/Icons'

/* ==========================================================================
   Sesle yazılabilen yazı kutusu

   KULLANICININ İSTEĞİ (15 Eylül 2026): Servisim'de yazı yazılan yerlere
   dikte. Teknisyen tarlada, eldivenle; küçük klavyede cümle yazmak
   yerine konuşuyor, söylediği kutuya yazılıyor.

   KLAVYEDEKİ MİKROFON NEDEN YETMİYOR. Android klavyesinin üstünde zaten
   küçük bir mikrofon var ama çoğu kişi onu bilmiyor; ikon küçük ve
   yazısız. Buradaki düğme kutunun içinde, yazılı ve parmak boyunda
   (proje kuralı: gizli etkileşim yok, ikon tek başına anlam taşımaz).

   KUTU VE DÜĞME TEK PARÇA (17 Eylül 2026, kullanıcının isteği). Düğme
   önce kutunun altında ayrı bir düğme olarak duruyordu; ikisi
   birbirinden bağımsız iki şey gibi görünüyordu. Şimdi düğme kutunun
   çerçevesinin içinde, yazının altındaki şeritte. Kutuya dokununca da
   dinleme başlayınca da bütün çerçeve maviye dönüyor.

   DAVRANIŞ

     · Söylenen, kutudaki yazının SONUNA ekleniyor; var olan yazı
       silinmiyor (bkz. dikteMotoru.js → yaziyaEkle). Konuşma sürerken yazı
       kutuda akıyor; teknisyen bitince bakıp elle düzeltebiliyor.
     · DİNLEME KULLANICI DURDURANA KADAR SÜRÜYOR (18 Eylül 2026,
       kullanıcının isteği: "en ufak ses kesilmesinde dikteyi kapatıyor;
       dikteyi kullanıcı kendi kapatması gerekmez mi işi bittiğinde?").
       İki cümle arasındaki duraklama dikteyi kapatmıyor; aynı düğme
       "Durdur" olup elle durduruyor. Uzun sessizlikte güvenlik valfi
       devreye giriyor (bkz. dikteMotoru.js → SESSIZ_SINIR_MS).
       Bu yüzden `onSonuc` bir oturumda birden çok kez geliyor ve her
       cümle yazının sonuna ekleniyor.
     · Mikrofon izni ilk kullanımda, telefon sormadan önce ne işe
       yaradığı söylenerek isteniyor (bildirim izniyle aynı kalıp).
     · İzin yoksa, internet yoksa ya da söylenen anlaşılamadıysa uyarı
       kutunun altında çıkıyor ve yazarak devam edilebileceğini
       söylüyor — çıkmaz sokak değil.
     · Telefonda ses tanıma hiç yoksa düğme çizilmiyor.

   Sayı, telefon, şase numarası, tutar ve şifre kutularına KONMUYOR:
   rakam ve kod sesle güvenilir yazılmıyor. Yalnız cümle yazılan
   kutular.

   METİNLER CODEX'TEN GELDİ (proje kuralı).
   ========================================================================== */
const METIN = {
  dugme: 'Konuşarak Yaz',
  dugmeDinliyor: 'Durdur',
  dinliyor: 'Konuşabilirsiniz, dinleniyor.',
  izinBaslik: 'Mikrofon izni istenecek',
  /* Ses telefonun ses tanıma hizmetine gidiyor (Android'de çoğu zaman
     çevrim içi; DiktePlugin.java). "Kaydedilip saklanmaz" yalnız
     firmanın kendisi için doğruydu; cümle bunu da söylüyor
     (29 Eylül 2026, gizlilik incelemesi). */
  izinMetin: `Söylediklerinizi yazıya çevirmek için mikrofon izni gerekiyor. Sesiniz, metne çevrilip kutuya yazılması için telefonunuzun ses tanıma hizmetine gönderilir. ${MARKA} sesinizi kaydetmez.`,
  izinDugme: 'Devam Et',
  izinYok: 'Mikrofon izni verilmedi. Yazarak devam edebilirsiniz.',
  izinEngelli: 'Telefonun Ayarlar bölümünden bu uygulamaya mikrofon izni verin. O zamana kadar yazarak devam edebilirsiniz.',
  internet: 'İnternet bağlantısı yok. Yazarak devam edebilirsiniz.',
  anlasilamadi: 'Söyledikleriniz anlaşılamadı. Tekrar deneyin veya yazarak devam edin.',
  baslatilamadi: 'Sesle yazma başlatılamadı. Tekrar deneyin veya yazarak devam edin.',
}

/**
 * Etiketi, yazı kutusu ve kutunun içindeki "Konuşarak Yaz" şeridiyle
 * bir alan. Telefonda ses tanıma yoksa şerit çizilmiyor, kutu olağan
 * yazı kutusu gibi görünüyor.
 *
 * Etiket kutuyu SARMIYOR (htmlFor ile bağlı): düğme ve izin yaprağı
 * bir <label>'ın içinde olsaydı onlara dokunmak kutuya odaklanırdı.
 *
 * Tek alanlı bölümde etiket YAZILMIYOR, bölüm başlığı sorunun kendisi
 * oluyor (bkz. ServisKapanisi.jsx → Kutu). O durumda kutunun görünen bir
 * adı olmadığı için `etiket` veriliyor: ekran okuyucu ve sesli erişim
 * alanın adını yine söylüyor (18 Eylül 2026 erişilebilirlik denetimi).
 *
 * @param {{
 *   ad?: string, etiket?: string, deger: string, onDegis: (yazi: string) => void,
 *   satir?: number, placeholder?: string, ipucu?: import('react').ReactNode,
 * }} p
 */
export function DikteliKutu({ ad, etiket, deger, onDegis, satir = 3, placeholder, ipucu }) {
  const kimlik = useId()
  const d = useDikte({ deger, onDegis })

  return (
    <div className="alan">
      {ad && (
        <label className="alan__ad" htmlFor={kimlik}>
          {ad}
        </label>
      )}
      <div className={'dikteli' + (d.dinliyor ? ' dikteli--dinliyor' : '')}>
        <textarea
          id={kimlik}
          className="gir dikteli__gir"
          rows={satir}
          value={deger}
          onChange={(e) => onDegis(e.target.value)}
          placeholder={placeholder}
          aria-label={ad ? undefined : etiket || undefined}
        />
        {d.hazir && (
          <div className="dikteli__serit">
            <button
              type="button"
              className={'dg dikteli__dg' + (d.dinliyor ? ' dikteli__dg--on' : '')}
              aria-pressed={d.dinliyor}
              onClick={d.dokun}
            >
              {d.dinliyor ? <IconStop size={18} /> : <IconMic size={19} />}
              {d.dinliyor ? METIN.dugmeDinliyor : METIN.dugme}
            </button>
            {d.dinliyor && (
              <span className="dikteli__durum" role="status">
                <span className="dikteli__nabiz" aria-hidden="true" />
                {METIN.dinliyor}
              </span>
            )}
          </div>
        )}
      </div>
      {ipucu}
      {d.uyari && (
        <p className="uyari dikteli__uyari" role="alert">
          {METIN[d.uyari]}
        </p>
      )}
      {d.izinSor && (
        <Onay
          baslik={METIN.izinBaslik}
          metin={METIN.izinMetin}
          dugme={METIN.izinDugme}
          onOnayla={d.izinVer}
          onVazgec={d.izinVazgec}
        />
      )}
    </div>
  )
}

function useDikte({ deger, onDegis }) {
  const [hazir, setHazir] = useState(false)
  const [dinliyor, setDinliyor] = useState(false)
  const [uyari, setUyari] = useState(null)
  const [izinSor, setIzinSor] = useState(false)

  /* Olaylar oturum boyunca geliyor; en güncel yazıya ve ebeveynin en
     güncel işleyicisine ref üzerinden bakılıyor. */
  const degerRef = useRef(deger)
  const onDegisRef = useRef(onDegis)
  degerRef.current = deger
  onDegisRef.current = onDegis

  const tabanRef = useRef('')
  const kismiRef = useRef('')
  const oturumRef = useRef(null)
  const canliRef = useRef(true)
  /* Dikte'nin bu oturumda kutuya yazdığı her değer. Kutudaki yazı
     bunlardan biri değilse araya teknisyenin eli girmiş demektir. */
  const yazilanlarRef = useRef(new Set())
  /* Elle değişiklikle kesilen oturumun geç gelen sonuçları yazılmıyor. */
  const kesildiRef = useRef(false)

  useEffect(() => {
    canliRef.current = true
    kullanilabilir().then((v) => canliRef.current && setHazir(v))
    /* Kutu ekrandan kalkınca (pencere kapandı, sayfa değişti) mikrofon
       açık kalmıyor. */
    return () => {
      canliRef.current = false
      oturumRef.current?.iptal()
    }
  }, [])

  /* DİNLERKEN KUTUYA ELLE DOKUNULURSA DİKTE DURUYOR.

     Söylenen, dinleme başladığı andaki yazının sonuna ekleniyor. Bu
     arada teknisyen kutuda bir kelimeyi silerse ya da yazarsa bir
     sonraki sonuç o değişikliğin üstüne yazıyor ve silinen yazı geri
     geliyordu. Elle değişiklik görülünce oturum sonuç yazmadan
     kapanıyor; kutuda teknisyenin yazdığı kalıyor.

     Küme, tek bir "son yazılan" değil: telefonun olayları arka arkaya
     geliyor ve ekran iki dikte yazısının arasında güncellenebiliyor;
     dikte kendi yazısını elle değişiklik sanmasın. */
  useEffect(() => {
    if (!oturumRef.current) return
    if (yazilanlarRef.current.has(deger || '')) return
    kismiRef.current = ''
    kesildiRef.current = true
    const oturum = oturumRef.current
    oturumRef.current = null
    oturum.iptal()
  }, [deger])

  function yaz(yazi) {
    if (!canliRef.current || kesildiRef.current) return
    yazilanlarRef.current.add(yazi)
    onDegisRef.current(yazi)
  }

  async function dinle() {
    setUyari(null)
    tabanRef.current = degerRef.current || ''
    yazilanlarRef.current = new Set([tabanRef.current])
    kesildiRef.current = false
    kismiRef.current = ''
    setDinliyor(true)

    const oturum = await baslat({
      onKismi: (m) => {
        kismiRef.current = m
        yaz(yaziyaEkle(tabanRef.current, m))
      },
      onSonuc: (m) => {
        tabanRef.current = yaziyaEkle(tabanRef.current, m)
        kismiRef.current = ''
        yaz(tabanRef.current)
      },
      onHata: (kod) => {
        if (!canliRef.current) return
        /* Yarım da olsa yazıya dönen bir şey varsa "anlaşılamadı"
           demek yanlış olur; yazı kutuda duruyor. */
        if (kod === 'anlasilamadi' && kismiRef.current) return
        setUyari(kod === 'izin' ? 'izinYok' : kod)
      },
      onBitti: () => {
        /* Telefon son sonucu vermeden bittiyse konuşmanın ekranda
           görünen kısmı kalıcı oluyor. */
        if (kismiRef.current) {
          tabanRef.current = yaziyaEkle(tabanRef.current, kismiRef.current)
          kismiRef.current = ''
          yaz(tabanRef.current)
        }
        oturumRef.current = null
        if (canliRef.current) setDinliyor(false)
      },
    })
    oturumRef.current = oturum
    if (!oturum && canliRef.current) setDinliyor(false)
  }

  async function dokun() {
    if (dinliyor) {
      oturumRef.current?.durdur()
      return
    }
    const izin = await izinDurumu()
    if (izin === 'verildi') return dinle()
    /* "Engelli" görünse de izin YENİDEN İSTENİYOR. Android'in izin
       penceresi seçim yapılmadan (Geri ya da dışına dokunarak)
       kapatılınca Capacitor bunu kalıcı ret diye önbelleğe yazıyor;
       bir daha sorulmasaydı tek yanlış dokunuş sesle yazmayı Ayarlar'a
       gidilene kadar kapatırdı. İzin gerçekten kalıcı reddedildiyse
       Android pencere açmadan hemen reddediyor ve Ayarlar uyarısı
       çıkıyor (bkz. izinVer). */
    if (izin === 'engelli') return izinVer()
    setIzinSor(true)
  }

  async function izinVer() {
    setIzinSor(false)
    const sonuc = await izinIste()
    if (sonuc === 'verildi') return dinle()
    setUyari(sonuc === 'engelli' ? 'izinEngelli' : 'izinYok')
  }

  return {
    hazir,
    dinliyor,
    uyari,
    izinSor,
    dokun,
    izinVer,
    izinVazgec: () => setIzinSor(false),
  }
}
