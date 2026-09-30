import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import {
  CATEGORIES, getProduct, kategoriDilde, productsByCategory, supportGroup, urunDilde,
} from '../marka'
import { DESTEK, GUVENLIK, ZORLUK } from '../marka/icerik/destekVerisi'
import { GUVENLIK_CIZIMLERI } from '../marka/icerik/cizimler'
import { URUN_KILAVUZU } from '../marka/icerik/kilavuzEslesme'
import { useDil } from '../i18n'
import { load, save } from '../lib/storage'
import { norm } from '../lib/arama'
import { formatSerial } from '../lib/serial'
import { makineninServisi } from '../lib/servisAtama'
import { araProps, telFirma } from '../lib/tel'
import { useGeriYakala } from '../lib/geriYakala'
import { destekOlay, destekOturumu } from '../lib/destekLog'
import {
  IconAlert, IconBook, IconCheck, IconCheckCircle, IconClose, IconMachine, IconParca,
  IconPhone, IconRight, IconSearch, IconWrench,
} from '../components/Icons'

/* ==========================================================================
   Destek ekranı — arıza çözüm rehberi

   NEDEN BU EKRAN (29 Eylül 2026, kullanıcının isteği)

   Destek bir dönem sunucudaki kılavuz asistanıydı (screens/
   DestekAsistani.jsx). Asistanın sunucusu ve ekran kartı henüz yok,
   kılavuzların yarısı eksik; kullanıcı yönetime yapılacak sunum için
   ekranın hazır arıza-çözüm ağacına dönmesini istedi. Hangisinin açık
   olduğunu src/config.js → DESTEK_KIPI belirliyor.

   AKIŞ — ÇİFTÇİNİN MAKİNEYE BAKARAK CEVAPLAYABİLECEĞİ ÜÇ SORU

       makine  →  bölüm  →  belirti  →  ÇÖZÜM

     "Hangi makine"  yanında duran makine
     "Nerede"        parmağıyla gösterebileceği bölüm
     "Ne oluyor"     gözüyle gördüğü belirti

   Hiçbir adımda teşhis istenmiyor: "mekik zamanlaması bozuk mu?" diye
   sorulsa cevabı bilemez. Teşhis ekranın işi, belirtiyi söylemek
   çiftçinin. Bölümü bilmeyen için arama kutusu var: yazdığı kelime
   belirtinin, bölümün, nedenlerin ve parçaların adında aranıyor
   ("iğne" yazan, nedeni iğne olan belirtiyi de buluyor). Arama yalnız
   hazır listeyi süzüyor, cümle yorumlamıyor — yanlış anlaşılmış bir
   arıza tavsiyesi zarar verir.

   SEÇİLENLER EKRANIN ÜSTÜNDE. Makine ve bölüm "Seçimleriniz" kartında
   birikiyor, her satırın "Değiştir"i o adıma dönüyor; belirti çözümün
   başlığı. Geri düğmesi ve Android'in geri hareketi bir önceki ADIMA
   götürüyor, bir önceki sayfaya değil.

   ÇÖZÜM

   Önce güvenlik (dört madde, çizimli), sonra nedenler SIRALI: en olası
   ve en kolay kontrol edilen üstte, servis gerektiren dipte (veri
   dosyasının sırası, ekran ayrıca zorluğa göre diziyor). Her nedende
   "nasıl anlarsınız" ve "ne yapmalısınız", yanında tarlada yapılır /
   alet gerekir / servis işi rozeti. Çiftçi kontrol ettiği nedeni
   işaretliyor: tarlada uzun listede nerede kaldığını kaybetmiyor ve
   servis talebi açarsa işaretlediği nedenler talebe yazılıyor — servis
   aynı kontrolleri baştan yapmıyor, çiftçi aynı şeyi iki kez
   anlatmıyor.

   Sonunda "Sorun çözüldü mü?" Hayır denirse sıradaki adımlar: servis
   talebi (makinenin servisinin adıyla), servisi arama, yedek parça,
   başka belirti. Makinenin kılavuzu varsa kılavuzun kendi arıza
   tablosuna da yol var (screens/Manual.jsx).

   İÇERİK makine sınıfının genel bilgisi (marka/icerik/destekVerisi.js),
   kılavuz değil; ekranda da bu yazıyor. Kayıt: her hareket Destek
   Kayıtları'na düşüyor (lib/destekLog.js) — hangi belirti çözülmedi,
   PAKSAN orada görüyor.
   ========================================================================== */

/* Seçilen model ve fiziksel makine ayrı saklanıyor: içerik modele göre
   geliyor, talep ise seri numarası belli olan tek makineye açılıyor. */
const SECILI_URUN = 'destekUrun'
const SECILI_MAKINE = 'destekMakine'

const ZORLUK_SIRASI = { kolay: 0, orta: 1, servis: 2 }

export default function ArizaCozumu() {
  const nav = useNavigate()
  const { machineId: adresMakineId } = useParams()
  const [params] = useSearchParams()
  const { user, machines, showToast } = useApp()
  const { t, dil } = useDil()

  const [secim, setSecim] = useState(() => ilkSecim(machines, adresMakineId))
  const [yol, setYol] = useState(() => adrestekiBelirti(secim.urunId, params.get('belirti')))
  const [arama, setArama] = useState('')
  /* Kontrol edildi diye işaretlenen nedenler (anahtar: nedenin Türkçe
     adı). Belirti değişince sıfırlanıyor. */
  const [kontrol, setKontrol] = useState(() => new Set())
  /* null | 'cozuldu' | 'devam' — "Sorun çözüldü mü?" sorusunun cevabı */
  const [sonuc, setSonuc] = useState(null)
  const [modelPenceresi, setModelPenceresi] = useState(false)

  const { urunId, makineId } = secim
  const urun = urunId ? urunDilde(getProduct(urunId), dil) : null
  const makine = makineId ? machines.find((m) => m.id === makineId && m.productId === urunId) || null : null
  const grup = useMemo(() => destekGrubu(urunId), [urunId])
  const bolum = grup.bolumler.find((b) => b.id === yol.bolumId) || null
  const belirti = bolum?.belirtiler.find((b) => b.id === yol.belirtiId) || null
  const adim = !urun ? 'makine' : !bolum ? 'bolum' : !belirti ? 'belirti' : 'cozum'

  /* Makine sayfasından başka bir makineyle yeniden gelindiyse
     (/destek/mk2) konuşma o makineye geçiyor. */
  useEffect(() => {
    const m = machines.find((x) => x.id === adresMakineId)
    if (!m) return
    setSecim((s) => (s.makineId === m.id ? s : { urunId: m.productId, makineId: m.id }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresMakineId])

  /* Seçim telefonda kalıyor: ikinci açılışta makine sorulmuyor. */
  useEffect(() => {
    save(SECILI_URUN, urunId || null)
    save(SECILI_MAKINE, makineId || null)
  }, [urunId, makineId])

  /* Her adım sayfanın başından açılıyor: uzun çözümün dibinden bir
     sonraki adıma geçen çiftçi boş bir yere bakmasın. */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [adim, yol.bolumId, yol.belirtiId])

  /* ------------------------------------------------------- Oturum kaydı */

  function kaydet(olay) {
    const p = urunId ? getProduct(urunId) : null
    destekOlay(
      destekOturumu({
        anahtar: makine?.id || urunId || 'genel',
        kullanici: user,
        makine: makine ? { id: makine.id, serial: makine.serial, productId: makine.productId } : null,
        urun: p ? { id: p.id, name: p.name } : null,
        grup: p ? supportGroup(p) : 'genel',
        dil,
      }),
      olay,
    )
  }

  /* ------------------------------------------------------------ Adımlar */

  function belirtiyiSifirla() {
    setKontrol(new Set())
    setSonuc(null)
  }

  function makineSec(s) {
    setSecim({ urunId: s.urunId, makineId: s.makineId || null })
    setYol({ bolumId: null, belirtiId: null })
    setArama('')
    setModelPenceresi(false)
    belirtiyiSifirla()
  }

  function bolumSec(b) {
    kaydet({ tur: 'konu', deger: yaz(b.ad, 'tr'), kayitId: b.id })
    setYol({ bolumId: b.id, belirtiId: null })
    belirtiyiSifirla()
  }

  function belirtiSec(b, bolumunId = yol.bolumId) {
    kaydet({ tur: 'soru', deger: yaz(b.ad, 'tr'), kayitId: b.id })
    setYol({ bolumId: bolumunId, belirtiId: b.id })
    setArama('')
    belirtiyiSifirla()
  }

  /* "Değiştir" ve geri: seçilen adıma dönülüyor, sonrası siliniyor. */
  function adimaDon(hedef) {
    if (hedef === 'makine') {
      setSecim({ urunId: null, makineId: null })
      setYol({ bolumId: null, belirtiId: null })
    } else if (hedef === 'bolum') {
      setYol({ bolumId: null, belirtiId: null })
    } else {
      setYol((y) => ({ ...y, belirtiId: null }))
    }
    setArama('')
    belirtiyiSifirla()
  }

  function geri() {
    if (belirti) return adimaDon('belirti')
    if (bolum) return adimaDon('bolum')
    return false
  }
  useGeriYakala(Boolean(bolum), geri)

  function kontrolCevir(anahtar) {
    setKontrol((k) => {
      const yeni = new Set(k)
      if (yeni.has(anahtar)) yeni.delete(anahtar)
      else yeni.add(anahtar)
      return yeni
    })
  }

  function cevapla(cozuldu) {
    kaydet(cozuldu ? { tur: 'cevap', deger: 'çözüldü' } : { tur: 'cozulmedi', deger: yaz(belirti.ad, 'tr') })
    setSonuc(cozuldu ? 'cozuldu' : 'devam')
  }

  /* Talebe konuşulan belirti, kontrol edilen nedenler ve makine
     taşınıyor (bkz. RequestForm.jsx → destek, denenen, parcalar).
     Çözüm ekranından talebe gitmek "çözülmedi" demenin kendisi; cevap
     verilmeden gidildiyse o da kayda yazılıyor. */
  function talepAc(tur, parcalar = []) {
    if (belirti && sonuc !== 'devam') kaydet({ tur: 'cozulmedi', deger: yaz(belirti.ad, 'tr') })
    kaydet({ tur: 'yonlendirme', deger: tur })
    const q = new URLSearchParams({ tur })
    if (belirti) q.set('destek', yaz(belirti.ad, dil))
    const denenen = siraliNedenler(belirti)
      .filter((s) => kontrol.has(yaz(s.ad, 'tr')))
      .map((s) => yaz(s.ad, dil))
    if (denenen.length) q.set('denenen', denenen.join('|'))
    if (tur === 'parca' && parcalar.length) q.set('parcalar', parcalar.join('|'))
    /* Katalogdan seçilen modelin seri numarası yok; form o modelden tek
       kayıtlı makine varsa onu seçiyor. */
    if (makine) q.set('makine', makine.id)
    else if (urunId) q.set('model', urunId)
    nav('/talep?' + q.toString())
  }

  /* ------------------------------------------------------------- Ekran */

  const benimMakinelerim = machines
    .map((m) => ({ m, p: urunDilde(getProduct(m.productId), dil) }))
    .filter((x) => x.p)

  return (
    <div className="app">
      <TopBar title={t('destek.baslik')} back={bolum ? geri : 'auto'} />

      <div className="screen wrap destek">
        {adim !== 'makine' && (
          <Secimler
            urun={urun}
            makine={makine}
            bolum={bolum}
            dil={dil}
            t={t}
            onDegistir={adimaDon}
          />
        )}

        {/* Adım değişince içerik yeniden çiziliyor; `key` yumuşak girişi
            her adımda yeniden oynatıyor. */}
        <div key={`${adim}-${yol.bolumId}-${yol.belirtiId}`} className="fade-in">
          {adim === 'makine' && (
            <MakineAdimi
              benim={benimMakinelerim}
              dil={dil}
              t={t}
              onSec={makineSec}
              onModel={() => setModelPenceresi(true)}
            />
          )}

          {adim === 'bolum' && (
            <BolumAdimi
              grup={grup}
              arama={arama}
              setArama={setArama}
              dil={dil}
              t={t}
              onBolum={bolumSec}
              onBelirti={belirtiSec}
            />
          )}

          {adim === 'belirti' && (
            <BelirtiAdimi bolum={bolum} dil={dil} t={t} onBelirti={belirtiSec} onGeri={() => adimaDon('bolum')} />
          )}

          {adim === 'cozum' && (
            <CozumAdimi
              belirti={belirti}
              urunId={urunId}
              makine={makine}
              kontrol={kontrol}
              sonuc={sonuc}
              dil={dil}
              t={t}
              showToast={showToast}
              onKontrol={kontrolCevir}
              onCevap={cevapla}
              onTalep={talepAc}
              onKilavuz={() => nav(`/kilavuz/${urunId}?bolum=ariza`)}
              onBaskaBelirti={() => adimaDon('bolum')}
            />
          )}
        </div>
      </div>

      <Sheet open={modelPenceresi} onClose={() => setModelPenceresi(false)} title={t('ariza.modelSec')}>
        <p className="muted small" style={{ marginBottom: 14, lineHeight: 1.55 }}>
          {t('ariza.modelSecAlt')}
        </p>
        <ModelListesi dil={dil} secili={makineId ? null : urunId} onSec={(p) => makineSec({ urunId: p.id })} />
      </Sheet>

      <TabBar />
    </div>
  )
}

/* ============================================================ Yardımcılar */

function yaz(deger, dil = 'tr') {
  if (!deger) return ''
  if (typeof deger === 'string') return deger
  return deger[dil] || deger.tr || deger.en || ''
}

/* Sayılı metin: tek olanda `…Tek` anahtarı. Türkçede ikisi aynı ("1
   belirti", "3 belirti"); İngilizcede tekil ve çoğul ayrı. */
function sayili(t, anahtar, n, degerler = {}) {
  return t(n === 1 ? anahtar + 'Tek' : anahtar, { n, ...degerler })
}

/** Ürünün destek grubu; karşılığı yoksa genel gruba düşüyor. */
function destekGrubu(urunId) {
  const p = urunId ? getProduct(urunId) : null
  return DESTEK[p ? supportGroup(p) : 'genel'] || DESTEK.genel
}

/* İlk açılışta hangi makine: adresteki (makine sayfasından gelindi),
   yoksa telefonda kalan son seçim, yoksa tek kayıtlı makine. Kaydı
   silinmiş makine yok sayılıyor: talebe olmayan bir makine taşınmasın. */
function ilkSecim(machines, adresMakineId) {
  const adresten = machines.find((m) => m.id === adresMakineId)
  if (adresten) return { urunId: adresten.productId, makineId: adresten.id }
  const kalan = machines.find((m) => m.id === load(SECILI_MAKINE, null))
  if (kalan) return { urunId: kalan.productId, makineId: kalan.id }
  const kalanModel = load(SECILI_URUN, null)
  if (kalanModel && !load(SECILI_MAKINE, null) && getProduct(kalanModel)) {
    return { urunId: kalanModel, makineId: null }
  }
  if (machines.length === 1) return { urunId: machines[0].productId, makineId: machines[0].id }
  return { urunId: null, makineId: null }
}

/* Başka bir ekrandan belirtiyle gelinebiliyor (/destek/mk1?belirti=…). */
function adrestekiBelirti(urunId, belirtiId) {
  if (!urunId || !belirtiId) return { bolumId: null, belirtiId: null }
  for (const b of destekGrubu(urunId).bolumler) {
    if (b.belirtiler.some((x) => x.id === belirtiId)) return { bolumId: b.id, belirtiId }
  }
  return { bolumId: null, belirtiId: null }
}

/* Nedenler veri dosyasındaki sırayla ("en olası ve en kolay önce")
   geliyor; ekran ayrıca zorluğa göre diziyor, servis işi hep dipte.
   Sıralama kararlı: aynı zorluktakiler dosyadaki sırasını koruyor. */
function siraliNedenler(belirti) {
  if (!belirti) return []
  return belirti.sebepler
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (ZORLUK_SIRASI[a.s.zorluk] ?? 1) - (ZORLUK_SIRASI[b.s.zorluk] ?? 1) || a.i - b.i)
    .map((x) => x.s)
}

/* Arama: yazılan kelimelerin HEPSİ belirtinin, bölümün, nedenlerin ya
   da parçaların adında geçmeli. Başlığında geçenler öne alınıyor. */
function belirtiAra(grup, sorgu, dil) {
  const kelimeler = norm(sorgu).split(' ').filter(Boolean)
  if (!kelimeler.length) return []
  const sonuc = []
  for (const bolum of grup.bolumler) {
    for (const belirti of bolum.belirtiler) {
      const baslik = norm(yaz(belirti.ad, dil))
      const govde = norm(
        [
          yaz(bolum.ad, dil),
          ...belirti.sebepler.map((s) => yaz(s.ad, dil)),
          ...(belirti.parcalar || []),
        ].join(' '),
      )
      if (!kelimeler.every((k) => baslik.includes(k) || govde.includes(k))) continue
      const puan = kelimeler.filter((k) => baslik.includes(k)).length
      sonuc.push({ bolum, belirti, puan })
    }
  }
  return sonuc.sort((a, b) => b.puan - a.puan)
}

/* ============================================================ Seçimleriniz

   Makine ve bölüm birikerek görünüyor. Belirti burada yok: çözüm
   adımında sayfanın başlığı o, iki kez yazılınca ekranın üçte biri
   seçimleri tekrar ediyordu. Belirtiyi değiştirmek geri düğmesiyle. */
function Secimler({ urun, makine, bolum, dil, t, onDegistir }) {
  return (
    <div className="destek-secimler">
      <div className="destek-secimler__makine">
        <UrunFoto urunId={urun.id} ad={urun.name} tip="thumb" ikonBoyut={22} />
        <div className="destek-secimler__metin">
          <div className="destek-secimler__ad">{makine?.nickname || urun.name}</div>
          <div className="destek-secimler__alt">
            {makine ? formatSerial(makine.serial) : t('ariza.kayitsizModel')}
          </div>
        </div>
        <button type="button" className="destek-degistir" onClick={() => onDegistir('makine')}>
          {t('ariza.degistir')}
        </button>
      </div>

      {bolum && (
        <div className="destek-secimler__satir">
          <span className="destek-secimler__etiket">{t('ariza.bolum')}</span>
          <span className="destek-secimler__deger">{yaz(bolum.ad, dil)}</span>
          <button type="button" className="destek-degistir" onClick={() => onDegistir('bolum')}>
            {t('ariza.degistir')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ============================================================ 1. Makine */

function MakineAdimi({ benim, dil, t, onSec, onModel }) {
  return (
    <>
      <h2 className="destek-soru">{t('ariza.makineSoru')}</h2>
      <p className="destek-soru__alt">{t('ariza.makineSoruAlt')}</p>

      {benim.length > 0 ? (
        <>
          <div className="destek-liste">
            {benim.map(({ m, p }) => (
              <button
                key={m.id}
                type="button"
                className="destek-makine"
                onClick={() => onSec({ urunId: m.productId, makineId: m.id })}
              >
                <UrunFoto urunId={p.id} ad={p.name} tip="thumb" ikonBoyut={24} />
                <span className="destek-makine__metin">
                  <span className="destek-makine__ad">{m.nickname || p.name}</span>
                  {m.nickname && <span className="destek-makine__alt">{p.name}</span>}
                  <span className="destek-makine__alt">{formatSerial(m.serial)}</span>
                </span>
                <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--soft destek-model-dugme" onClick={onModel}>
            <IconMachine size={20} /> {t('ariza.baskaModel')}
          </button>
        </>
      ) : (
        /* Kayıtlı makinesi olmayana pencere açmanın anlamı yok: modeller
           doğrudan sayfada. */
        <ModelListesi dil={dil} onSec={(p) => onSec({ urunId: p.id })} />
      )}

      <Nasil t={t} />
    </>
  )
}

/* Üç adımın ne olduğu, makine seçilmeden önce bir kez. Sıra bilgi
   taşıyor (önce bölüm, sonra belirti), bu yüzden numaralı. */
function Nasil({ t }) {
  return (
    <ol className="destek-nasil" aria-label={t('ariza.nasilBaslik')}>
      <li><span className="destek-nasil__no">1</span>{t('ariza.nasil1')}</li>
      <li><span className="destek-nasil__no">2</span>{t('ariza.nasil2')}</li>
      <li><span className="destek-nasil__no">3</span>{t('ariza.nasil3')}</li>
    </ol>
  )
}

/* Katalogdaki modeller, kategori kategori. Kayıtlı olmayan bir makine
   için içerik aynı; yalnız talep seri numarasına bağlanmıyor. */
function ModelListesi({ dil, secili, onSec }) {
  return (
    <div className="destek-modeller">
      {CATEGORIES.map((k) => {
        const urunler = productsByCategory(k.id)
        if (!urunler.length) return null
        return (
          <section key={k.id} className="destek-modeller__grup">
            <h3 className="destek-modeller__baslik">{kategoriDilde(k, dil).name}</h3>
            <div className="destek-liste">
              {urunler.map((p) => {
                const u = urunDilde(p, dil)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={'destek-makine destek-makine--kucuk' + (secili === p.id ? ' destek-makine--secili' : '')}
                    aria-pressed={secili === p.id}
                    onClick={() => onSec(p)}
                  >
                    <UrunFoto urunId={p.id} ad={u.name} tip="thumb" ikonBoyut={20} />
                    <span className="destek-makine__metin">
                      <span className="destek-makine__ad">{u.name}</span>
                      <span className="destek-makine__alt">{u.tagline}</span>
                    </span>
                    <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ============================================================= 2. Bölüm */

function BolumAdimi({ grup, arama, setArama, dil, t, onBolum, onBelirti }) {
  const sonuclar = useMemo(() => belirtiAra(grup, arama, dil), [grup, arama, dil])
  const aramaVar = norm(arama).length > 0

  return (
    <>
      <h2 className="destek-soru">{t('ariza.bolumSoru')}</h2>
      <p className="destek-soru__alt">{t('ariza.bolumSoruAlt')}</p>

      <label className="destek-ara">
        <IconSearch size={20} />
        <input
          type="search"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder={t('ariza.aramaIpucu')}
          aria-label={t('ariza.aramaIpucu')}
          enterKeyHint="search"
          maxLength={60}
        />
        {arama && (
          <button type="button" className="destek-ara__sil" onClick={() => setArama('')} aria-label={t('ariza.aramaTemizle')}>
            <IconClose size={18} />
          </button>
        )}
      </label>

      {aramaVar ? (
        sonuclar.length ? (
          <>
            <p className="destek-sayac" aria-live="polite">{sayili(t, 'ariza.aramaSonuc', sonuclar.length)}</p>
            <div className="destek-liste">
              {sonuclar.map(({ bolum, belirti }) => (
                <button
                  key={bolum.id + belirti.id}
                  type="button"
                  className="destek-secenek"
                  onClick={() => onBelirti(belirti, bolum.id)}
                >
                  <span className="destek-secenek__metin">
                    <span className="destek-secenek__ad">{yaz(belirti.ad, dil)}</span>
                    <span className="destek-secenek__alt">{yaz(bolum.ad, dil)}</span>
                  </span>
                  <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="destek-bos" aria-live="polite">{t('ariza.aramaYok')}</p>
        )
      ) : (
        <div className="destek-liste">
          {grup.bolumler.map((b) => (
            <button key={b.id} type="button" className="destek-secenek" onClick={() => onBolum(b)}>
              <span className="destek-secenek__metin">
                <span className="destek-secenek__ad">{yaz(b.ad, dil)}</span>
                <span className="destek-secenek__alt">{yaz(b.aciklama, dil)}</span>
              </span>
              <span className="destek-secenek__adet">{sayili(t, 'ariza.belirtiSayisi', b.belirtiler.length)}</span>
              <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/* ============================================================ 3. Belirti */

function BelirtiAdimi({ bolum, dil, t, onBelirti, onGeri }) {
  return (
    <>
      <h2 className="destek-soru">{t('ariza.belirtiSoru')}</h2>
      <p className="destek-soru__alt">{t('ariza.belirtiSoruAlt')}</p>

      <div className="destek-liste">
        {bolum.belirtiler.map((b) => (
          <button key={b.id} type="button" className="destek-secenek" onClick={() => onBelirti(b)}>
            <span className="destek-secenek__metin">
              <span className="destek-secenek__ad">{yaz(b.ad, dil)}</span>
              <span className="destek-secenek__alt">{sayili(t, 'ariza.nedenSayisi', b.sebepler.length)}</span>
            </span>
            <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
          </button>
        ))}
      </div>

      <button type="button" className="btn btn--soft destek-model-dugme" onClick={onGeri}>
        {t('ariza.baskaBolum')}
      </button>
    </>
  )
}

/* ============================================================= 4. Çözüm */

function CozumAdimi({
  belirti, urunId, makine, kontrol, sonuc, dil, t, showToast,
  onKontrol, onCevap, onTalep, onKilavuz, onBaskaBelirti,
}) {
  const nedenler = siraliNedenler(belirti)
  const yapilan = nedenler.filter((s) => kontrol.has(yaz(s.ad, 'tr'))).length
  const parcalar = belirti.parcalar || []
  const kilavuzVar = Boolean(URUN_KILAVUZU[urunId])

  return (
    <>
      <h2 className="destek-cozum__baslik">{yaz(belirti.ad, dil)}</h2>

      {/* ÖNCE GÜVENLİK — cevabın en üstünde, açık. Katlanmış uyarı
          okunmuyor; dört madde kısa. Her maddenin yanında hareketi
          gösteren çizim: okuması zor olan kullanıcı cümleyi çözmeden
          anlamı görüyor (bkz. marka/icerik/cizimler.js). */}
      <section className="destek-guvenlik" aria-labelledby="destek-guvenlik-baslik">
        <h3 id="destek-guvenlik-baslik" className="destek-guvenlik__baslik">
          <IconAlert size={20} /> {t('ariza.guvenlikBaslik')}
        </h3>
        <ul className="destek-guvenlik__liste">
          {(GUVENLIK[dil] || GUVENLIK.tr).map((g, i) => (
            <li key={g} className="destek-guvenlik__madde">
              {GUVENLIK_CIZIMLERI[i] && (
                <span className="destek-guvenlik__cizim">
                  <img src={GUVENLIK_CIZIMLERI[i]} alt="" />
                </span>
              )}
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="destek-nedenler" aria-labelledby="destek-nedenler-baslik">
        <div className="destek-nedenler__bas">
          <h3 id="destek-nedenler-baslik">{sayili(t, 'ariza.nedenlerBaslik', nedenler.length)}</h3>
          <span className="destek-nedenler__sayac" aria-live="polite">
            {t('ariza.ilerleme', { n: yapilan, toplam: nedenler.length })}
          </span>
        </div>
        <p className="destek-nedenler__alt">{t('ariza.nedenlerAlt')}</p>
        <div
          className="destek-ilerleme"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={nedenler.length}
          aria-valuenow={yapilan}
          aria-label={t('ariza.ilerleme', { n: yapilan, toplam: nedenler.length })}
        >
          <span style={{ width: `${(yapilan / Math.max(1, nedenler.length)) * 100}%` }} />
        </div>

        <ol className="destek-neden-listesi">
          {nedenler.map((s, i) => {
            const anahtar = yaz(s.ad, 'tr')
            const tamam = kontrol.has(anahtar)
            return (
              <li key={anahtar} className={'destek-neden' + (tamam ? ' destek-neden--tamam' : '')}>
                <div className="destek-neden__bas">
                  <span className="destek-neden__no" aria-hidden="true">
                    {tamam ? <IconCheck size={16} /> : i + 1}
                  </span>
                  <div className="destek-neden__baslik">
                    <h4>{yaz(s.ad, dil)}</h4>
                    <span className={'destek-zorluk destek-zorluk--' + s.zorluk}>{yaz(ZORLUK[s.zorluk], dil)}</span>
                  </div>
                </div>

                <dl className="destek-neden__govde">
                  <dt>{t('ariza.kontrol')}</dt>
                  <dd>{yaz(s.kontrol, dil)}</dd>
                  <dt>{t('ariza.yapilacak')}</dt>
                  <dd>{yaz(s.yap, dil)}</dd>
                </dl>

                <button
                  type="button"
                  className={'destek-isaret' + (tamam ? ' destek-isaret--on' : '')}
                  aria-pressed={tamam}
                  onClick={() => onKontrol(anahtar)}
                >
                  <span className="destek-isaret__kutu" aria-hidden="true"><IconCheck size={16} /></span>
                  {tamam ? t('ariza.kontrolEdildi') : t('ariza.kontrolEttim')}
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {parcalar.length > 0 && (
        <section className="destek-parcalar" aria-labelledby="destek-parcalar-baslik">
          <h3 id="destek-parcalar-baslik">{t('ariza.parcalar')}</h3>
          <p className="destek-parcalar__alt">{t('ariza.parcalarAlt')}</p>
          <ul className="destek-parcalar__liste">
            {parcalar.map((p) => (
              <li key={p}><IconParca size={16} /> {p}</li>
            ))}
          </ul>
          <button type="button" className="btn btn--soft" onClick={() => onTalep('parca', parcalar)}>
            <IconParca size={20} /> {t('ariza.parcalariIste')}
          </button>
        </section>
      )}

      {kilavuzVar && (
        <button type="button" className="destek-kilavuz" onClick={onKilavuz}>
          <span className="destek-kilavuz__ikon"><IconBook size={22} /></span>
          <span className="destek-kilavuz__metin">
            <span className="destek-kilavuz__ad">{t('ariza.kilavuzTablo')}</span>
            <span className="destek-kilavuz__alt">{t('ariza.kilavuzTabloAlt')}</span>
          </span>
          <span className="destek-ok" aria-hidden="true"><IconRight size={20} /></span>
        </button>
      )}

      <Sonuc
        sonuc={sonuc}
        hepsiYapildi={nedenler.length > 0 && yapilan === nedenler.length}
        makine={makine}
        t={t}
        showToast={showToast}
        onCevap={onCevap}
        onTalep={onTalep}
        onBaskaBelirti={onBaskaBelirti}
      />

      <p className="destek-not">{t('ariza.kaynakNot')}</p>
    </>
  )
}

/* "Sorun çözüldü mü?" — ÇİFTÇİNİN KENDİ SÖZÜ.

   Backoffice'teki "Ekranda çözüldü" sayısı yalnız bu cevaba bakıyor
   (bkz. backoffice/ekranlar/DestekKayitlari.jsx → cozuldu). Hayır
   denince sıradaki adımlar açılıyor: servis talebi başta, çünkü
   çözülmeyen arızanın gideceği yer orası. Servisin adı ve numarası
   makinenin kaydından (lib/servisAtama.js); katalogdan seçilen modelde
   servis bilinmiyor, o satır yok. */
function Sonuc({ sonuc, hepsiYapildi, makine, t, showToast, onCevap, onTalep, onBaskaBelirti }) {
  const servis = makine ? makineninServisi(makine)?.servis || null : null
  const numara = servis ? telFirma(servis.tel) : ''

  if (sonuc === 'cozuldu') {
    return (
      <section className="destek-sonuc destek-sonuc--iyi" aria-live="polite">
        <span className="destek-sonuc__ikon"><IconCheckCircle size={30} /></span>
        <h3>{t('ariza.cozulduBaslik')}</h3>
        <p>{t('ariza.cozulduAlt')}</p>
        <button type="button" className="btn btn--soft" onClick={onBaskaBelirti}>
          {t('ariza.baskaSorun')}
        </button>
        {/* GERİ DÖNÜŞ YOLU (29 Eylül 2026, görünüm önerisi; kullanıcının
            onayı). "Evet, Çözüldü"ye alışkanlıkla basan çiftçinin önünden
            servis talebine giden yol kapanıyordu. Buradan cevabı
            değiştiriyor; kayda "çözülmedi" yazılıyor ve sıradaki adımlar
            açılıyor. */}
        <button type="button" className="btn btn--ghost" onClick={() => onCevap(false)}>
          {t('ariza.yineDevam')}
        </button>
      </section>
    )
  }

  if (sonuc === 'devam') {
    /* Kayıtlı makinenin servisi yoksa servis talebi açılamıyor (bkz.
       CLAUDE.md → "Zincir boş dönerse"). Düğme gösterilip formda geri
       çevrilmiyor; nedeni burada, ana ekrandaki cümleyle yazıyor. */
    const servisYok = Boolean(makine) && !servis
    return (
      <section className="destek-sonuc" aria-live="polite">
        <h3>{t('ariza.devamBaslik')}</h3>
        {servisYok ? (
          <div className="uyari-kart destek-sonuc__uyari">
            <IconAlert size={20} />
            <div>
              <strong>{t('servisim.yok')}</strong>
              <p>{t('servisim.yokAlt')}</p>
            </div>
          </div>
        ) : (
          <>
            <p>{t('ariza.devamAlt')}</p>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => onTalep('servis')}>
              <IconWrench size={21} /> {t('ariza.servisTalebi')}
            </button>
            <p className="destek-sonuc__not">
              {servis ? t('ariza.servisTalebiAlt', { servis: servis.ad }) : t('ariza.servisTalebiAltGenel')}
            </p>
          </>
        )}

        {numara && (
          <a className="btn btn--soft" {...araProps(servis.tel, numara, showToast)}>
            <IconPhone size={20} /> {t('ariza.servisiAra', { numara })}
          </a>
        )}
        <button type="button" className="btn btn--soft" onClick={() => onTalep('parca')}>
          <IconParca size={20} /> {t('ariza.parcaTalebi')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBaskaBelirti}>
          {t('ariza.baskaBelirti')}
        </button>
      </section>
    )
  }

  return (
    <section className="destek-sonuc" aria-labelledby="destek-sonuc-baslik">
      <h3 id="destek-sonuc-baslik">{t('ariza.cozulduMu')}</h3>
      <p>{hepsiYapildi ? t('ariza.hepsiKontrol') : t('ariza.cozulduMuAlt')}</p>
      {/* İKİ CEVAP EŞİT AĞIRLIKTA (29 Eylül 2026, görünüm önerisi C6).
          "Evet" doluydu, "Hayır" yalnız çerçeveli: okumadan basan çiftçi
          dolu olana basıyor ve servis talebine giden yol kapanıyordu. İki
          düğme de aynı biçimde; seçmek için okumak gerekiyor. */}
      <div className="destek-sonuc__secim">
        <button type="button" className="btn btn--cerceve btn--lg destek-cevap" data-cevap="evet" onClick={() => onCevap(true)}>
          <IconCheckCircle size={20} /> {t('ariza.evetCozuldu')}
        </button>
        <button type="button" className="btn btn--cerceve btn--lg destek-cevap" data-cevap="hayir" onClick={() => onCevap(false)}>
          <IconWrench size={20} /> {t('ariza.hayirDevam')}
        </button>
      </div>
    </section>
  )
}
