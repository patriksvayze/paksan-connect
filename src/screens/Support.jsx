import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { PaksanAmblem } from '../components/Marka'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'
import { destekOlay, destekOturumu } from '../lib/destekLog'
import { PRODUCTS, getProduct, supportGroup, urunDilde } from '../data/products'
import { DESTEK, GUVENLIK, ZORLUK } from '../data/destekVerisi'
import {
  IconAlert, IconCheckCircle, IconMachine, IconParca, IconRight, IconWrench,
} from '../components/Icons'

/* ==========================================================================
   Destek ekranı

   NE İŞE YARIYOR

   Çiftçi tarlada, makinenin yanında duruyor. Bir şey ters gidiyor ve
   tek bir şey öğrenmek istiyor: ne yapacağım.

   Ekran onu üç dokunuşta oraya götürüyor:

       makine  →  nerede  →  ne oluyor  →  CEVAP

   Makine bir kere seçiliyor ve hatırlanıyor; ikinci açılışta doğrudan
   "nerede" sorusundan başlanıyor, iki dokunuş yetiyor.

   Makine sorusu sohbetin İÇİNDE soruluyor, aşağıdan kayan bir
   pencereyle değil. Ekran açılır açılmaz pencereyle karşılaşmak,
   kullanıcıyı daha ne sunulduğunu görmeden karar vermeye zorluyordu.
   Pencere yalnız "başka makine" denince açılıyor.

   AKIŞ NEDEN BU SIRADA

   Her adım, çiftçinin makineye bakarak cevaplayabileceği bir soru:

     "Hangi makine"    — yanında duran makine
     "Nerede"          — parmağıyla gösterebileceği bölüm
     "Ne oluyor"       — gözüyle gördüğü belirti

   Hiçbir adımda çiftçiden teşhis koyması istenmiyor. "Mekik zamanlaması
   bozuk mu?" diye sorulsa cevabı bilemez; zaten bilse zaten çözerdi.
   Teşhis ekranın işi, belirtiyi bildirmek çiftçinin.

   CEVAP NASIL VERİLİYOR

   Bir belirtinin altında birden çok sebep olabiliyor. Hepsi birden
   gösteriliyor ama SIRALI: en olası ve en kolay kontrol edileni en
   üstte, servis gerektiren en altta. Çiftçi listeyi yukarıdan aşağıya
   işliyor.

   Her sebepte iki satır var:

       KONTROL   bunu nasıl anlarsınız
       YAPILACAK anladıysanız ne yaparsınız

   Yanında bir de rozet: tarlada yapılır / alet gerekir / servis işi.
   Böylece çiftçi hangi maddeyi kendi başına deneyebileceğini görüyor.

   KULLANICI YAZI YAZMIYOR

   Ekranda yazı kutusu yok, her cevap bir düğme. Tarlada eldivenle yazı
   yazmak zor; ayrıca yazılan cümleyi yorumlayan bir sistem yanlış
   anlayabilir ve yanlış anlaşılmış bir arıza tavsiyesi zarar verir.

   ÇÖZEMEZSE

   Cevabın altında "Sorun çözüldü" ve "Hâlâ devam ediyor" var. Devam
   ediyorsa üç yol açılıyor: başka bir belirtiye bakmak, servis talebi,
   yedek parça talebi. Talebe makine ve konuşulan belirti taşınıyor,
   çiftçi aynı şeyi ikinci kez anlatmıyor. Aramaya yönlendirme yok;
   bu ekranın işi telefon yükünü azaltmak.

   VERİ

   İçerik src/data/destekVerisi.js dosyasında. Makinenin destek grubuna
   göre seçiliyor (bkz. products.js → supportGroup), böylece
   uygulamadaki yirmi makinenin tamamının bir karşılığı var.
   ========================================================================== */

const SECILI_URUN = 'destekUrun'

export default function Support() {
  const nav = useNavigate()
  const { machineId } = useParams()
  const [params] = useSearchParams()
  const { user, machines } = useApp()
  const { t, dil } = useDil()

  /* Seçilen makine telefonda saklanıyor: çiftçi her açılışta yeniden
     seçmesin. Uygulamanın ürün kimliği tutuluyor. */
  const [urunId, setUrunId] = useState(() => load(SECILI_URUN, null))
  const [secici, setSecici] = useState(false)

  const [mesajlar, setMesajlar] = useState([])
  const [adim, setAdim] = useState(null)

  const sayac = useRef(0)
  const dip = useRef(null)
  /* Talep formuna taşınacak belirti adı */
  const sonBelirti = useRef('')
  const urun = urunId ? urunDilde(getProduct(urunId), dil) : null
  const grup = useMemo(() => destekGrubu(urunId), [urunId])
  const bolumler = grup.bolumler

  /* Müşterinin uygulamada kayıtlı makineleri en üstte. Artık her
     makinenin destek karşılığı var, hiçbiri elenmiyor. */
  const benimMakinelerim = useMemo(() => {
    const gorulen = new Set()
    const liste = []
    for (const m of machines) {
      if (gorulen.has(m.productId)) continue
      gorulen.add(m.productId)
      const p = urunDilde(getProduct(m.productId), dil)
      if (!p) continue
      liste.push({ urunId: m.productId, ad: m.nickname || p.name, alt: m.serial })
    }
    return liste
  }, [machines, dil])

  const digerUrunler = useMemo(() => {
    const benim = new Set(benimMakinelerim.map((m) => m.urunId))
    return PRODUCTS.filter((p) => !benim.has(p.id)).map((p) => ({
      urunId: p.id,
      ad: urunDilde(p, dil).name,
    }))
  }, [benimMakinelerim, dil])

  useEffect(() => {
    if (urunId) save(SECILI_URUN, urunId)
  }, [urunId])

  /* Tek kayıtlı makinesi olan kullanıcıya seçim hiç sorulmuyor. */
  useEffect(() => {
    if (!urunId && benimMakinelerim.length === 1) setUrunId(benimMakinelerim[0].urunId)
  }, [urunId, benimMakinelerim])

  useEffect(() => {
    dip.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [mesajlar, adim])

  /* ------------------------------------------------------- Oturum kaydı

     Her konuşma backoffice'e kayıt olarak düşüyor: hangi makinede hangi
     belirti arandı, çözüldü mü. Çözülmeyenler PAKSAN'a bilgi tabanının
     sahada yetmediği yeri gösteriyor. */

  const kaydet = (olay) =>
    destekOlay(
      destekOturumu({
        anahtar: urunId || 'genel',
        kullanici: user,
        makine: urun ? { machine_id: urunId, name: urun.name } : null,
        urun: urun ? { id: urun.id, name: urun.name } : null,
        grup: urunId || 'genel',
        dil,
      }),
      olay
    )

  /* ------------------------------------------------------------ Sohbet */

  function soyle(mesaj) {
    /* Numara sayacın dışından okunuyor: React güncellemeyi sıraya
       aldığı için içeriden okunsaydı arka arkaya gönderilen iki mesaja
       aynı numara düşerdi. */
    sayac.current += 1
    const numara = sayac.current
    setMesajlar((x) => [...x, { id: numara, ...mesaj }])
  }

  /* Karşılama her zaman aynı iki satır. İlk soru ayrı baloncukta
     arkadan geliyor; böylece selam, makinenin seçili olup olmamasına
     göre değişmiyor. */
  function karsilama() {
    return {
      id: 1,
      kim: 'bot',
      metin: [
        t('destek.selam', { ad: (user?.ad || '').split(' ')[0] || '' }),
        t('destek.nasilYardim'),
      ].join('\n'),
    }
  }

  /* Karşılamadan sonraki ilk soru: makine belliyse "ne oluyor",
     değilse "hangi makine". */
  function ilkSoru(hedefUrunId) {
    const u = hedefUrunId ? urunDilde(getProduct(hedefUrunId), dil) : null
    return u ? t('destek.neOluyor', { makine: u.name }) : t('destek.hangiMakine')
  }

  function bastanBasla(hedefUrunId = urunId) {
    sayac.current = 2
    setMesajlar([
      karsilama(),
      { id: 2, kim: 'bot', metin: ilkSoru(hedefUrunId) },
    ])
    /* Makine belli değilse ilk soru o. Bölümler makineye göre
       değiştiği için önce makineyi bilmek gerekiyor. */
    setAdim({ tur: hedefUrunId ? 'bolum' : 'makine' })
  }

  function bolumSec(bolum) {
    soyle({ kim: 'ben', metin: yaz(bolum.ad, dil) })
    soyle({ kim: 'bot', metin: t('destek.hangisi') })
    setAdim({ tur: 'belirti', bolum })
  }

  /* Bir belirtiye dokunulunca cevabın tamamı tek seferde açılıyor.
     Ara soru sorulmuyor; sebepler sıralı olarak listeleniyor. */
  function belirtiSec(belirti) {
    const ad = yaz(belirti.ad, dil)
    sonBelirti.current = ad

    soyle({ kim: 'ben', metin: ad })
    kaydet({ tur: 'soru', deger: yaz(belirti.ad, 'tr'), kayitId: belirti.id })

    soyle({ kim: 'bot', cevap: belirti })
    setAdim({ tur: 'sonuc', belirti })
  }

  function cozuldu() {
    soyle({ kim: 'ben', metin: t('destek.cozuldu') })
    kaydet({ tur: 'cevap', deger: 'çözüldü' })
    soyle({ kim: 'bot', metin: t('destek.tesekkur') })
    setAdim({ tur: 'bitti' })
  }

  function cozulmedi() {
    soyle({ kim: 'ben', metin: t('destek.cozulmedi') })
    kaydet({ tur: 'cozulmedi', deger: sonBelirti.current })
    soyle({ kim: 'bot', metin: t('destek.neYapalim') })
    setAdim({ tur: 'cikis' })
  }

  function talepAc(tur) {
    kaydet({ tur: 'yonlendirme', deger: tur })
    const belirti = sonBelirti.current
      ? `&destek=${encodeURIComponent(sonBelirti.current)}`
      : ''
    nav(`/talep?tur=${tur}${belirti}`)
  }

  /* Sohbetin içinden makine seçimi: konuşma kesilmiyor, seçilen
     makine kullanıcının cevabı olarak baloncuğa yazılıyor. */
  function makineSec(id, pencereden = false) {
    const p = urunDilde(getProduct(id), dil)
    setUrunId(id)
    setSecici(false)

    /* Pencereden seçildiyse ya da konuşma ilerlemişse baştan
       başlanıyor: bölümler ve belirtiler makineye özel. */
    if (pencereden || adim?.tur !== 'makine') {
      sayac.current = 2
      setMesajlar([
        karsilama(),
        { id: 2, kim: 'bot', metin: ilkSoru(id) },
      ])
      return setAdim({ tur: 'bolum' })
    }

    soyle({ kim: 'ben', metin: p?.name || id })
    soyle({ kim: 'bot', metin: t('destek.nerede') })
    setAdim({ tur: 'bolum' })
  }

  /* Sohbet ekran açılır açılmaz başlıyor.

     Makine sayfasından ya da bakım rehberinden gelindiğinde adreste o
     makinenin kaydı yazıyor (/destek/mk1). Kullanıcı zaten hangi
     makineyi kastettiğini söylemiş oluyor, bir daha sorulmuyor. */
  const gelen = params.get('belirti')
  const kuruldu = useRef(false)
  useEffect(() => {
    if (kuruldu.current) return
    kuruldu.current = true

    const adrestenGelen = machineId
      ? machines.find((m) => m.id === machineId)?.productId
      : null
    const acilis = adrestenGelen || urunId
    if (adrestenGelen && adrestenGelen !== urunId) setUrunId(adrestenGelen)

    const bulunan = acilis && gelen ? belirtiBul(destekGrubu(acilis), gelen) : null
    if (!bulunan) return bastanBasla(acilis)

    sayac.current = 1
    setMesajlar([karsilama()])
    belirtiSec(bulunan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Konuşma bilerek saklanmıyor: ekrandan çıkılınca siliniyor. Yarım
     kalmış bir teşhise günler sonra dönmek işe yaramaz, makinenin
     durumu değişmiş olur. Kayda geçen oturum ayrı tutuluyor. */

  /* ------------------------------------------------------------- Ekran */

  return (
    <div className="app">
      <TopBar title={t('destek.baslik')} sub={urun?.name || null} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 14 }}>
        <button className="listitem listitem--flat" onClick={() => setSecici(true)}>
          <div className="listitem__icon"><IconMachine size={21} /></div>
          <div className="listitem__body">
            <div className="listitem__title" style={{ fontSize: 15 }}>
              {urun ? urun.name : t('destek.makineSecin')}
            </div>
            <div className="listitem__sub">
              {urun ? t('destek.degistir') : t('destek.makineSecinAlt')}
            </div>
          </div>
          <span className="listitem__chev"><IconRight size={20} /></span>
        </button>

        <div className="chat">
          {mesajlar.map((m) => (
            <Balon key={m.id} mesaj={m} dil={dil} t={t} />
          ))}
        </div>

        <Secenekler
          adim={adim}
          bolumler={bolumler}
          benimMakinelerim={benimMakinelerim}
          dil={dil}
          t={t}
          onMakine={makineSec}
          onBaskaMakine={() => setSecici(true)}
          onBolum={bolumSec}
          onBelirti={belirtiSec}
          onCozuldu={cozuldu}
          onCozulmedi={cozulmedi}
          onBaskaSorun={() => {
            soyle({ kim: 'bot', metin: t('destek.nerede') })
            setAdim({ tur: 'bolum' })
          }}
          onTalep={talepAc}
        />

        {mesajlar.length > 1 && (
          <button
            className="btn btn--soft btn--sm"
            style={{ marginTop: 18 }}
            onClick={() => bastanBasla()}
          >
            {t('destek.bastanBasla')}
          </button>
        )}

        <div ref={dip} />
      </div>

      <Sheet open={secici} onClose={() => setSecici(false)} title={t('destek.makineSec')}>
        <p className="muted small" style={{ marginBottom: 14, lineHeight: 1.55 }}>
          {t('destek.makineSecAciklama')}
        </p>
        <MakineListesi
          benim={benimMakinelerim}
          digerleri={digerUrunler}
          secili={urunId}
          onSec={(id) => makineSec(id, true)}
          t={t}
        />
      </Sheet>

      <TabBar />
    </div>
  )
}

/* ------------------------------------------------------------ Yardımcılar */

function yaz(deger, dil = 'tr') {
  if (!deger) return ''
  if (typeof deger === 'string') return deger
  return deger[dil] || deger.tr || deger.en || ''
}

/** Ürünün destek grubu; karşılığı yoksa genel gruba düşüyor. */
function destekGrubu(urunId) {
  const p = urunId ? getProduct(urunId) : null
  const anahtar = p ? supportGroup(p) : 'genel'
  return DESTEK[anahtar] || DESTEK.genel
}

function belirtiBul(grup, belirtiId) {
  for (const b of grup.bolumler) {
    const bulunan = b.belirtiler.find((x) => x.id === belirtiId)
    if (bulunan) return bulunan
  }
  return null
}

/* ============================================================== Baloncuk

   Bot baloncuğunun solunda PAKSAN amblemi, kullanıcınınki sağda ve
   lacivert. Cevap baloncuğu ayrı bir bileşen; içinde güvenlik uyarısı,
   sebep listesi ve parça listesi var. */
function Balon({ mesaj, dil, t }) {
  const bot = mesaj.kim === 'bot'
  /* Cevap baloncuğa sığmıyor: içinde güvenlik uyarısı, numaralı sebep
     listesi ve parça listesi var. Konuşma balonu kısa cümleler için;
     cevap satırın tamamını kaplıyor. */
  const genis = Boolean(mesaj.cevap)

  return (
    <div
      className={
        'msg-row msg-row--' + (bot ? 'bot' : 'me') + (genis ? ' msg-row--genis' : '')
      }
    >
      {/* Cevap satırında amblem yok: 375 piksellik bir telefonda
          amblem ve boşluğu birlikte otuz piksel yiyor, o genişlik
          cevabın kendisine lazım. Kimliği önceki baloncuklar zaten
          kurmuş oluyor. */}
      {bot && !genis && (
        <span className="msg-ava">
          <PaksanAmblem size={22} />
        </span>
      )}

      <div className={'msg msg--' + (bot ? 'bot' : 'me')}>
        {mesaj.metin && <div>{mesaj.metin}</div>}
        {mesaj.cevap && <Cevap belirti={mesaj.cevap} dil={dil} t={t} />}
      </div>
    </div>
  )
}

/* ================================================================= Cevap

   Sıralama önemli: önce güvenlik, sonra sebepler, en sonda parçalar.

   Sebepler veri dosyasındaki sırayla geliyor; o sıra bilerek "en olası
   ve en kolay kontrol edilen önce" diye kurulmuş. Ekran ayrıca zorluk
   rozetine göre yeniden sıralıyor, böylece servis işleri her zaman
   dipte kalıyor. */
function Cevap({ belirti, dil, t }) {
  const sira = { kolay: 0, orta: 1, servis: 2 }
  const sebepler = [...belirti.sebepler].sort(
    (a, b) => (sira[a.zorluk] ?? 1) - (sira[b.zorluk] ?? 1)
  )

  return (
    <div className="dst-cevap">
      <div className="dst-guvenlik">
        <div className="dst-guvenlik__bas">
          <IconAlert size={16} />
          <span>{t('destek.guvenlikBaslik')}</span>
        </div>
        <ul className="dst-guvenlik__liste">
          {(GUVENLIK[dil] || GUVENLIK.tr).map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>

      <div className="dst-cevap__ust">
        {t('destek.sebepBasligi', { n: sebepler.length })}
      </div>

      <div className="dst-sebepler">
        {sebepler.map((s, i) => (
          <div key={yaz(s.ad, 'tr')} className="dst-sebep">
            <div className="dst-sebep__bas">
              <span className="dst-sebep__no">{i + 1}</span>
              <span className="dst-sebep__ad">{yaz(s.ad, dil)}</span>
            </div>

            <div className={'dst-rozet dst-rozet--' + s.zorluk}>
              {yaz(ZORLUK[s.zorluk], dil)}
            </div>

            <div className="dst-sebep__satir">
              <span className="dst-sebep__etiket">{t('destek.kontrol')}</span>
              <p>{yaz(s.kontrol, dil)}</p>
            </div>
            <div className="dst-sebep__satir">
              <span className="dst-sebep__etiket">{t('destek.yapilacak')}</span>
              <p>{yaz(s.yap, dil)}</p>
            </div>
          </div>
        ))}
      </div>

      {belirti.parcalar?.length > 0 && (
        <div className="dst-parcalar">
          <div className="dst-parcalar__bas">{t('destek.parcalar')}</div>
          <div className="dst-parcalar__liste">
            {belirti.parcalar.map((p) => (
              <span key={p} className="dst-parca">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bu içeriğin ne olduğu açıkça yazıyor: makine sınıfının genel
          çalışma bilgisi, kullanım kılavuzunun yerine geçmez. */}
      <p className="dst-not">{t('destek.kaynakNot')}</p>
    </div>
  )
}

/* =========================================================== Seçenekler

   Sohbetin altındaki düğmeler. Kullanıcı yazı yazmadığı için her adımda
   ne söyleyebileceği burada duruyor. */
function Secenekler({
  adim, bolumler, benimMakinelerim, dil, t,
  onMakine, onBaskaMakine, onBolum, onBelirti, onCozuldu, onCozulmedi,
  onBaskaSorun, onTalep,
}) {
  if (!adim) return null

  /* Makine seçimi konuşmanın ilk adımı. Kayıtlı makineleri hazır
     düğme; kaydı olmayan makine için pencere açılıyor. */
  if (adim.tur === 'makine') {
    return (
      <div className="chips chips--dikey">
        {benimMakinelerim.map((m) => (
          <button key={m.urunId} className="chip" onClick={() => onMakine(m.urunId)}>
            <IconMachine size={18} /> {m.ad}
          </button>
        ))}
        <button className="chip chip--soluk" onClick={onBaskaMakine}>
          {benimMakinelerim.length ? t('destek.baskaMakine') : t('destek.makineSec')}
        </button>
      </div>
    )
  }

  if (adim.tur === 'bolum') {
    return (
      <div className="chips chips--dikey">
        {bolumler.map((b) => (
          <button key={b.id} className="chip chip--konu" onClick={() => onBolum(b)}>
            <span>
              <span className="chip__ad">{yaz(b.ad, dil)}</span>
              <span className="chip__alt">{yaz(b.aciklama, dil)}</span>
            </span>
            <span className="chip__adet">{b.belirtiler.length}</span>
          </button>
        ))}
      </div>
    )
  }

  if (adim.tur === 'belirti') {
    return (
      <div className="chips chips--dikey">
        {adim.bolum.belirtiler.map((b) => (
          <button key={b.id} className="chip" onClick={() => onBelirti(b)}>
            {yaz(b.ad, dil)}
          </button>
        ))}
        <button className="chip chip--soluk" onClick={onBaskaSorun}>
          {t('destek.baskaBolum')}
        </button>
      </div>
    )
  }

  if (adim.tur === 'sonuc') {
    return (
      <div className="chips">
        <button className="chip chip--ana" onClick={onCozuldu}>
          <IconCheckCircle size={18} /> {t('destek.cozuldu')}
        </button>
        <button className="chip" onClick={onCozulmedi}>{t('destek.cozulmedi')}</button>
      </div>
    )
  }

  if (adim.tur === 'cikis') {
    return (
      <div className="chips chips--dikey">
        <button className="chip" onClick={onBaskaSorun}>{t('destek.baskaBelirti')}</button>
        <button className="chip chip--ana" onClick={() => onTalep('servis')}>
          <IconWrench size={18} /> {t('destek.servisTalebi')}
        </button>
        <button className="chip chip--ana" onClick={() => onTalep('parca')}>
          <IconParca size={18} /> {t('destek.parcaTalebi')}
        </button>
      </div>
    )
  }

  /* adim.tur === 'bitti' */
  return (
    <div className="chips">
      <button className="chip" onClick={onBaskaSorun}>{t('destek.baskaBelirti')}</button>
    </div>
  )
}

/* ========================================================= Makine listesi */
function MakineListesi({ benim, digerleri, secili, onSec, t }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      {benim.length > 0 && (
        <>
          <div className="eyebrow">{t('destek.benimMakinelerim')}</div>
          {benim.map((m) => (
            <Satir key={m.urunId} m={m} secili={secili} onSec={onSec} />
          ))}
          <div className="eyebrow" style={{ marginTop: 12 }}>
            {t('destek.digerModeller')}
          </div>
        </>
      )}
      {digerleri.map((m) => (
        <Satir key={m.urunId} m={m} secili={secili} onSec={onSec} />
      ))}
    </div>
  )
}

function Satir({ m, secili, onSec }) {
  return (
    <button
      className={'listitem' + (secili === m.urunId ? ' listitem--on' : '')}
      onClick={() => onSec(m.urunId)}
    >
      <div className="listitem__body">
        <div className="listitem__title" style={{ fontSize: 14.5 }}>{m.ad}</div>
        {m.alt && <div className="listitem__sub">{m.alt}</div>}
      </div>
      <span className="listitem__chev"><IconRight size={19} /></span>
    </button>
  )
}
