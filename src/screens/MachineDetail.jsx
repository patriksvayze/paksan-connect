import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TeknikOzellikler } from '../components/TeknikOzellikler'
import { TopBar, TabBar, DataRow, Sheet } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { VideoOynatici, videoTuru, VideoSure } from '../components/Video'
import { getProduct, supportGroup, urunDilde, SIRKET } from '../marka'
import { URUN_KILAVUZU } from '../marka/icerik/kilavuzEslesme'
import { rehberListesi } from '../marka/icerik/rehber'
import { formatSerial, warrantyStatus } from '../lib/serial'
import { makineninServisi } from '../lib/servisAtama'
import { makineAnahtari } from '../lib/makineTalepleri'
import { KAPALI_DURUMLAR } from '../lib/talepEkleme'
import { musteriDurumAnahtari, talepTuru } from '../lib/talep'
import { rehberIlerlemesi } from '../lib/rehberIsaret'
import { ServisKarti, ServisYokKarti } from '../components/ServisKarti'
import {
  IconMachine, IconDestek, IconBook, IconWrench, IconParca, IconPlay, IconCheck,
  IconShield, IconTrash, IconAlert, IconRight, IconCalendar,
} from '../components/Icons'

/* ==========================================================================
   Makine detayı — "makinem" sayfası

   YENİDEN DÜZENLENDİ (29 Eylül 2026, kullanıcının isteği: "düzeninden
   ve kalitesinden memnun değilim"). Sıra çiftçinin bu sayfaya NEDEN
   geldiğine göre:

     1. Hangi makine, garantisi ne durumda      kimlik kartı
     2. Sorun var                                arıza çözümüne büyük düğme
     3. Başka ne yapabilirim                     servis, parça, kılavuz
     4. Bu makinede süren bir iş var mı         açık talepler (varsa)
     5. Kim bakıyor                              servis kartı
     6. Bakım, bilgiler, videolar                sekmeler

   Fotoğraf bu sayfada ürün sayfasındakinden kısa (16:9) ve kart
   fotoğrafın altına daha az biniyor: 16:10'da kimlik kartı ve büyük
   düğme ekranın altına iniyordu, daha çok binince tekerlekler
   örtülüyordu.

   AÇIK TALEPLER BURADA DA. Talep makineye açılıyor ama makinenin
   sayfası ondan habersizdi: servis talebi açmış çiftçi makinesine
   baktığında işin ne durumda olduğunu göremiyordu. Durum adı talep
   listesindekiyle aynı işlevden (lib/talep.js → musteriDurumAnahtari).

   BAKIM İLK SEKME. Videoların çoğu henüz yok (katalogda "yakında");
   ilk sekme boş bir listeyle açılıyordu. Bakım sekmesi saat takvimini
   ve mevsim rehberlerinin BU makinedeki ilerlemesini gösteriyor
   (lib/rehberIsaret.js → rehberIlerlemesi); rehbere dokununca rehber bu
   makineyle açılıyor.
   ========================================================================== */

const SEKMELER = [
  { id: 'bakim', anahtar: 'detay.bakim' },
  { id: 'bilgi', anahtar: 'detay.bilgiler' },
  { id: 'videolar', anahtar: 'detay.videolar' },
]

export default function MachineDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { machines, requests, updateMachine, removeMachine, showToast } = useApp()
  const { t, dil } = useDil()
  const [sekme, setSekme] = useState('bakim')
  /* Silme onayı için tarayıcının confirm() penceresi kullanılıyordu;
     uygulama içinde (Android WebView) açılmıyor, düğmeye basınca
     hiçbir şey olmuyordu. Uygulamanın kendi alt penceresi kullanılıyor. */
  const [silSor, setSilSor] = useState(false)

  const machine = machines.find((m) => m.id === id)
  const p = machine ? urunDilde(getProduct(machine.productId), dil) : null

  if (!machine || !p) {
    return (
      <div className="app">
        <TopBar title={t('detay.silinmis')} back="/makinelerim" />
        <div className="screen wrap" style={{ paddingTop: 30 }}>
          <div className="empty">
            <IconMachine size={62} />
            <p style={{ marginBottom: 20 }}>{t('detay.silinmis')}</p>
            <button className="btn btn--primary" onClick={() => nav('/makinelerim')}>
              {t('detay.makinelerimeDon')}
            </button>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  const g = warrantyStatus(machine.year, t)
  const servis = makineninServisi(machine)?.servis || null
  const done = machine.doneMaintenance || []
  const kilavuzVar = Boolean(URUN_KILAVUZU[p.id])

  /* Bu makineye açılmış, üzerinde iş süren talepler — en yenisi üstte.
     Eşleşme seri numarasıyla (lib/makineTalepleri.js → makineAnahtari):
     makine silinip yeniden eklense de talepler bulunuyor. */
  const anahtar = makineAnahtari(machine)
  const acikTalepler = (requests || [])
    .filter((r) => r?.makine && makineAnahtari(r.makine) === anahtar)
    .filter((r) => !KAPALI_DURUMLAR.includes(r.status || 'yeni'))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  function bakimIsaretle(saat) {
    const yeni = done.includes(saat) ? done.filter((s) => s !== saat) : [...done, saat]
    updateMachine(machine.id, { doneMaintenance: yeni })
  }

  return (
    <div className="app">
      <TopBar title={p.name} sub={machine.nickname || null} back="/makinelerim" />

      <div className="screen fade-in">
        <div className="makine-foto">
          <UrunFoto urunId={p.id} ad={p.name} tip="hero" ikonBoyut={72} />
        </div>

        <div className="wrap makine-govde">
          {/* ------------------------------------------------ Kimlik kartı */}
          <section className="makine-kimlik" aria-label={t('detay.kimlik')}>
            <div className="makine-kimlik__tur">{p.tagline}</div>
            <dl className="makine-kimlik__bilgi">
              <div>
                <dt>{t('makine.seriNo')}</dt>
                <dd className="serial-mono">{formatSerial(machine.serial)}</dd>
              </div>
              {machine.year && (
                <div>
                  <dt>{t('makine.uretimYili')}</dt>
                  <dd>{machine.year}</dd>
                </div>
              )}
            </dl>
            {/* Çalışma saati gösterilmiyor: makineler bir yere bağlı
                olmadığı için kaç saat çalıştığını bilemeyiz. */}
            <div className={'makine-garanti makine-garanti--' + (g.tone || 'yok')}>
              <IconShield size={20} />
              <span className="makine-garanti__metin">
                <strong>{g.label}</strong>
                {machine.year && (
                  <span>{t('detay.garantiBitis', { yil: machine.year + SIRKET.garantiYil })}</span>
                )}
              </span>
            </div>
          </section>

          {/* ------------------------------------------------ İşlemler

              "Sorun mu Var?" bu sayfanın asıl işi: turuncu, yardım
              simgeli (29 Eylül 2026, görünüm önerisi C9). Lacivertti ve
              sohbet balonu taşıyordu; turuncu her ekranda "buraya bas"
              demek. Karolar ana ekrandaki sırayla ve talep türlerinin
              renkleriyle: servis turuncu, parça mor, kılavuz mavi. */}
          <button className="btn btn--orange btn--lg makine-sorun" onClick={() => nav(`/destek/${machine.id}`)}>
            <IconDestek size={22} /> {t('detay.sorunVar')}
          </button>

          <div className="hizli makine-islemler">
            <Karo
              Ikon={IconWrench}
              tur="servis"
              ad={t('anasayfa.servisTalebi')}
              onClick={() => nav(`/talep?tur=servis&makine=${machine.id}`)}
            />
            <Karo
              Ikon={IconParca}
              tur="parca"
              ad={t('anasayfa.yedekParcaTalebi')}
              onClick={() => nav(`/talep?tur=parca&makine=${machine.id}`)}
            />
            {/* Kılavuzu olmayan modelde kılavuz karosu boş bir sayfaya
                götürüyordu; onun yerine bakım rehberi. */}
            {kilavuzVar ? (
              <Karo Ikon={IconBook} ad={t('detay.kilavuz')} onClick={() => nav(`/kilavuz/${p.id}`)} />
            ) : (
              <Karo
                Ikon={IconCalendar}
                ad={t('anasayfa.bakimRehberi')}
                onClick={() => nav(`/bakim?makine=${machine.id}`)}
              />
            )}
          </div>

          {/* -------------------------------------------- Açık talepler */}
          {acikTalepler.length > 0 && (
            <section className="makine-bolum" aria-labelledby="makine-talepler">
              <h2 id="makine-talepler" className="makine-bolum__baslik">
                {t('detay.acikTalepler')}
                <span className="sectionhead__count">{acikTalepler.length}</span>
              </h2>
              <div className="stack" style={{ gap: 10 }}>
                {acikTalepler.map((r) => (
                  <AcikTalep key={r.id} talep={r} t={t} onAc={() => nav(`/talebim/${r.id}`)} />
                ))}
              </div>
            </section>
          )}

          {/* BU MAKİNEYE BAKAN SERVİS (22 Eylül 2026). Atama makine
              başına: aynı müşterinin öteki makinesine başka bir servis
              bakıyor olabilir. Servis talebinin gideceği yer burada
              görünüyor; atanmamışsa neden talep açılamadığı da. */}
          <div className="makine-servis">
            {servis ? (
              <ServisKarti servis={servis} showToast={showToast} t={t} dil={dil} />
            ) : (
              <ServisYokKarti hicbiri t={t} dil={dil} />
            )}
          </div>

          {/* ------------------------------------------------- Sekmeler */}
          <div className="sekmeler makine-sekmeler" role="tablist" aria-label={p.name}>
            {SEKMELER.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={'makine-sekme-' + s.id}
                aria-selected={sekme === s.id}
                aria-controls="makine-sekme-icerik"
                className={'sekme' + (sekme === s.id ? ' sekme--on' : '')}
                onClick={() => setSekme(s.id)}
              >
                {t(s.anahtar)}
              </button>
            ))}
          </div>

          <div
            id="makine-sekme-icerik"
            role="tabpanel"
            aria-labelledby={'makine-sekme-' + sekme}
            key={sekme}
            className="fade-in"
          >
            {sekme === 'bakim' && (
              <Bakim product={p} machine={machine} done={done} onToggle={bakimIsaretle} />
            )}
            {sekme === 'bilgi' && <Bilgiler product={p} machine={machine} />}
            {sekme === 'videolar' && <Videolar product={p} machine={machine} />}
          </div>

          {/* Sayfanın en altı: kaydı silme. Yanlışlıkla basılmasın diye
              en sonda ve sade duruyor. */}
          <div className="makine-sil">
            <button className="btn btn--soft btn--sm makine-sil__dugme" onClick={() => setSilSor(true)}>
              <IconTrash size={19} /> {t('detay.kayitSil')}
            </button>
            <p className="small muted center" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {t('detay.silNot')}
            </p>
          </div>
        </div>
      </div>

      {/* Makine kaydını silme onayı */}
      <Sheet open={silSor} onClose={() => setSilSor(false)} title={t('detay.kayitSil')}>
        <div className="stack" style={{ gap: 14 }}>
          {/* Metin iki paragraf; satır sonları korunuyor */}
          <p style={{ lineHeight: 1.65, whiteSpace: 'pre-line' }}>
            {t('detay.silOnay', { ad: p.name })}
          </p>
          <button
            className="btn btn--lg"
            style={{ background: 'var(--pk-red)', color: '#fff' }}
            onClick={() => {
              setSilSor(false)
              removeMachine(machine.id)
              showToast(t('detay.silindi'))
              nav('/makinelerim', { replace: true })
            }}
          >
            <IconTrash size={20} /> {t('detay.evetSil')}
          </button>
          <button className="btn btn--soft" onClick={() => setSilSor(false)}>
            {t('ortak.vazgec')}
          </button>
        </div>
      </Sheet>

      <TabBar />
    </div>
  )
}

/* Ana ekrandaki hızlı işlem karosunun aynısı (screens/Home.jsx): aynı
   iş iki ekranda aynı biçimde görünsün. */
function Karo({ Ikon, ad, tur, onClick }) {
  return (
    <button type="button" className="hizli__karo" onClick={onClick}>
      <span className={'hizli__ikon' + (tur ? ' hizli__ikon--' + tur : '')}><Ikon size={24} /></span>
      <span className="hizli__yazi">{ad}</span>
    </button>
  )
}

/* Açık talep satırı: tür, numara ve durum. Türün rengi simgede
   (servis turuncu, parça mor — talep listesindeki gibi); numara başlığın
   altında düz yazı: rozet olarak başlığın yanına sığmayınca bir satırda
   yanında, ötekinde altında duruyordu. */
function AcikTalep({ talep, t, onAc }) {
  const tur = talepTuru(talep.tur)
  const Ikon = talep.tur === 'parca' ? IconParca : IconWrench
  return (
    <button type="button" className="makine-talep" onClick={onAc}>
      <span className={'makine-talep__ikon makine-talep__ikon--' + tur.ton}>
        <Ikon size={21} />
      </span>
      <span className="makine-talep__metin">
        <span className="makine-talep__ad">{t(`talep.${talep.tur}.baslik`)}</span>
        <span className="makine-talep__no serial-mono">{talep.no}</span>
        <span className={'durum-hap durum-hap--' + (talep.status || 'yeni')}>
          {t(musteriDurumAnahtari(talep))}
        </span>
      </span>
      <span className="makine-talep__ok" aria-hidden="true"><IconRight size={20} /></span>
    </button>
  )
}

/* ------------------------------------------------------------------ Bakım */

/* ÇALIŞMA SAATİNE GÖRE BAKIM. Çalışma saati uygulamada tutulmuyor
   (makineler bir yere bağlı değil, kaç saat çalıştığını bilemeyiz). Bu
   yüzden "sıradaki bakım" diye bir tahmin yapılmıyor; takvim olduğu gibi
   listeleniyor, çiftçi yaptığını kendisi işaretliyor. İşaret satırın
   sağında kutuyla ve "Yapıldı" yazısıyla: renk tek başına değil.

   MEVSİM REHBERLERİ. Günlük, sezon öncesi ve sezon sonu rehberlerinin bu
   makinedeki ilerlemesi; dokununca rehber bu makine seçili açılıyor. */
function Bakim({ product, machine, done, onToggle }) {
  const { t, dil } = useDil()
  const nav = useNavigate()
  const grup = supportGroup(getProduct(machine.productId))
  const rehberler = rehberListesi(dil)

  return (
    <div className="makine-bakim">
      <h3 className="makine-alt-baslik">{t('detay.bakimTakvimi')}</h3>
      <p className="makine-alt-aciklama">{t('detay.bakimNot')}</p>

      <ol className="makine-saatler">
        {product.bakim.map((b) => {
          const isaretli = done.includes(b.saat)
          return (
            <li key={b.saat}>
              <button
                type="button"
                className={'makine-saat' + (isaretli ? ' makine-saat--on' : '')}
                onClick={() => onToggle(b.saat)}
                aria-pressed={isaretli}
              >
                <span className="makine-saat__saat">
                  <strong>{b.saat}</strong>
                  <span>{t('detay.saatKisa')}</span>
                </span>
                <span className="makine-saat__metin">
                  <span className="makine-saat__ad">{b.baslik}</span>
                  <span className="makine-saat__detay">{b.detay}</span>
                </span>
                <span className="makine-saat__isaret">
                  <span className="makine-saat__kutu" aria-hidden="true"><IconCheck size={16} /></span>
                  {isaretli && <span className="makine-saat__durum">{t('detay.yapildi')}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <h3 className="makine-alt-baslik" style={{ marginTop: 26 }}>{t('detay.mevsimRehberleri')}</h3>
      <div className="stack" style={{ gap: 10 }}>
        {rehberler.map((r) => {
          const { yapilan, toplam } = rehberIlerlemesi(r, machine.id, grup)
          return (
            <button
              key={r.id}
              type="button"
              className="makine-rehber"
              onClick={() => nav(`/bakim/${r.id}?makine=${machine.id}`)}
            >
              <span className="makine-rehber__ikon"><IconCalendar size={21} /></span>
              <span className="makine-rehber__metin">
                <span className="makine-rehber__ad">{r.baslik}</span>
                <span className="makine-rehber__alt">{r.neZaman}</span>
                <span className="makine-rehber__cubuk" aria-hidden="true">
                  <span style={{ width: `${(yapilan / Math.max(1, toplam)) * 100}%` }} />
                </span>
                <span className="makine-rehber__sayi">
                  {t('detay.rehberIlerleme', { yapilan, toplam })}
                </span>
              </span>
              <span className="makine-talep__ok" aria-hidden="true"><IconRight size={20} /></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Bilgiler */

function Bilgiler({ product, machine }) {
  const { t } = useDil()
  return (
    <div className="stack">
      <div className="card">
        <h3 className="makine-alt-baslik" style={{ marginBottom: 8 }}>{product.name}</h3>
        <p style={{ lineHeight: 1.6, color: 'var(--ink-2)', fontSize: 15.5 }}>{product.desc}</p>
      </div>

      <div className="card">
        <h3 className="makine-alt-baslik" style={{ marginBottom: 12 }}>{t('detay.teknik')}</h3>
        {product.specs.map(([k, v]) => <DataRow key={k} k={k} v={v} />)}
      </div>

      {/* Kayıtlı makinenin tam teknik tablosu.

          Ürün sayfasındakiyle aynı bileşen. Müşterinin kendi makinesine
          bakarken "piston kursu kaçtı, hangi lastik takılı" diye
          sorması, katalogdan bakmasından daha sık olan durum. */}
      <TeknikOzellikler urunId={product.id} />

      <div className="card">
        <h3 className="makine-alt-baslik" style={{ marginBottom: 8 }}>{t('detay.garanti')}</h3>
        <p className="small muted" style={{ lineHeight: 1.6 }}>
          {t('detay.garantiMetni', { yil: SIRKET.garantiYil })}
        </p>
        {machine.year && (
          <p className="small" style={{ marginTop: 10, fontWeight: 700 }}>
            {t('detay.garantiBitis', { yil: machine.year + SIRKET.garantiYil })}
          </p>
        )}
        <p className="small muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          {t('detay.garantiNot')}
        </p>
      </div>

      <Link to={`/urun/${product.id}`} className="btn btn--soft">
        {t('detay.urunSayfasi')}
      </Link>
    </div>
  )
}

/* --------------------------------------------------------------- Videolar

   Katalogdaki videoların çoğunun dosyası da adresi de henüz yok. Hepsi
   aynı satır gibi dizildiğinde çiftçi dokunuyor, "yakında" uyarısı
   alıyordu; liste çalışmayan düğmelerle doluydu. Artık yalnız
   izlenebilen videolar düğme, gelecek olanlar adıyla sessiz bir
   listede — hangi videonun hazırlandığı yine görünüyor. */

function Videolar({ product, machine }) {
  const { t } = useDil()
  const nav = useNavigate()
  const [acikVideo, setAcikVideo] = useState(null)
  const hazir = product.videos.filter((v) => videoTuru(v) !== 'yok')
  const yakinda = product.videos.filter((v) => videoTuru(v) === 'yok')

  return (
    <div className="stack">
      {hazir.map((v) => (
        <VideoSatiri key={v.title} video={v} onOynat={setAcikVideo} />
      ))}

      {yakinda.length > 0 && (
        <div className="makine-yakinda">
          <h3 className="makine-alt-baslik">{t('detay.yakindaVideolar')}</h3>
          <ul>
            {yakinda.map((v) => (
              <li key={v.title}>
                <IconPlay size={16} />
                <span>{v.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="listitem listitem--flat" style={{ alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--pk-blue-yazi)', flex: 'none', marginTop: 2 }}>
          <IconAlert size={20} />
        </span>
        <div className="listitem__body">
          <div style={{ lineHeight: 1.55, fontSize: 15 }}>{t('detay.videoBulamadin')}</div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 10 }} onClick={() => nav(`/destek/${machine.id}`)}>
            {t('detay.destekAl')}
          </button>
        </div>
      </div>

      <VideoOynatici video={acikVideo} onClose={() => setAcikVideo(null)} />
    </div>
  )
}

/* İzlenebilen bir video: uygulamanın içinde oynayan dosya ya da dış
   bağlantı. Dosyası olan videonun süresi dosyadan okunuyor
   (components/Video.jsx → VideoSure). */
function VideoSatiri({ video, onOynat }) {
  const tur = videoTuru(video)
  return (
    <button
      type="button"
      className="listitem"
      onClick={() => {
        if (tur === 'oynat') onOynat(video)
        else window.open(video.url, '_blank')
      }}
    >
      <div
        className="listitem__icon"
        style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
      >
        <IconPlay size={22} />
      </div>
      <div className="listitem__body">
        <div className="listitem__title" style={{ whiteSpace: 'normal', fontSize: 15.5 }}>
          {video.title}
        </div>
        <div className="listitem__sub">
          <VideoSure video={video} />
        </div>
      </div>
      <span className="listitem__chev"><IconRight size={20} /></span>
    </button>
  )
}
