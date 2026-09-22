import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TeknikOzellikler } from '../components/TeknikOzellikler'
import { TopBar, TabBar, DataRow, Sheet } from '../components/Chrome'
import { UrunFoto } from '../components/Gorsel'
import { VideoOynatici, videoTuru, VideoSure } from '../components/Video'
import { getProduct, urunDilde } from '../marka'
import { formatSerial, warrantyStatus } from '../lib/serial'
import { SIRKET } from '../marka'
import { makineninServisi } from '../lib/servisAtama'
import { ServisKarti, ServisYokKarti } from '../components/ServisKarti'
import {
  IconMachine, IconChat, IconBook, IconWrench, IconParca, IconPlay, IconCheck,
  IconShield, IconTrash, IconAlert, IconRight,
} from '../components/Icons'

const SEKMELER = [
  { id: 'videolar', anahtar: 'detay.videolar' },
  { id: 'bakim', anahtar: 'detay.bakim' },
  { id: 'bilgi', anahtar: 'detay.bilgiler' },
]

export default function MachineDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { machines, updateMachine, removeMachine, showToast } = useApp()
  const { t, dil } = useDil()
  const [sekme, setSekme] = useState('videolar')
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

  function bakimIsaretle(saat) {
    const yeni = done.includes(saat) ? done.filter((s) => s !== saat) : [...done, saat]
    updateMachine(machine.id, { doneMaintenance: yeni })
  }

  return (
    <div className="app">
      <TopBar
        title={p.name}
        sub={machine.nickname || null}
        back="/makinelerim"
      />

      <div className="screen fade-in">
        {/* Makine görseli + künye */}
        <UrunFoto urunId={p.id} ad={p.name} tip="hero" ikonBoyut={72} />

        <div className="wrap" style={{ marginTop: -34, position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ boxShadow: 'var(--sh-2)' }}>
            {/* Çalışma saati gösterilmiyor: makineler bir yere bağlı
                olmadığı için kaç saat çalıştığını bilemeyiz. */}
            <DataRow k={t('ekle.seriNo')} v={<span className="serial-mono">{formatSerial(machine.serial)}</span>} />
            {machine.year && <DataRow k={t('ekle.uretimYili')} v={machine.year} />}
            <div className="divider" />
            <div className="row">
              <span style={{ color: g.tone === 'green' ? 'var(--pk-green-yazi)' : 'var(--pk-orange-ink)' }}>
                <IconShield size={21} />
              </span>
              <span className={'badge badge--' + (g.tone || 'blue')}>{g.label}</span>
            </div>
            {/* Garanti durumu yukarıdaki rozette ve "Bilgiler" sekmesinde
                zaten yazılı; ayrıca bir bilgilendirme kartı konmuyor. */}
          </div>

          {/* Ana işlemler */}
          <div className="stack" style={{ marginTop: 14 }}>
            <button className="btn btn--primary btn--lg" onClick={() => nav(`/destek/${machine.id}`)}>
              <IconChat size={22} /> {t('detay.sorunVar')}
            </button>

            <div className="grid-2" style={{ gap: 10 }}>
              <button
                className="btn btn--soft btn--sm"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => nav(`/kilavuz/${p.id}`)}
              >
                <IconBook size={19} /> {t('detay.kilavuz')}
              </button>
              <button
                className="btn btn--soft btn--sm"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => nav(`/talep?tur=parca&makine=${machine.id}`)}
              >
                <IconParca size={19} /> {t('detay.yedekParca')}
              </button>
            </div>

            {/* Servis talebi — bu makine için, seri no otomatik gider */}
            <button
              className="listitem"
              onClick={() => nav(`/talep?tur=servis&makine=${machine.id}`)}
            >
              <div
                className="listitem__icon"
                style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
              >
                <IconWrench size={21} />
              </div>
              <div className="listitem__body">
                <div className="listitem__title" style={{ fontSize: 15.5 }}>
                  {t('detay.servisTalebi')}
                </div>
                <div className="listitem__sub">
                  {t('detay.servisAlt')}
                </div>
              </div>
              <span className="listitem__chev">
                <IconRight size={20} />
              </span>
            </button>

            {/* BU MAKİNEYE BAKAN SERVİS (22 Eylül 2026). Atama makine
                başına: aynı müşterinin öteki makinesine başka bir servis
                bakıyor olabilir. Servis talebinin gideceği yer burada
                görünüyor; atanmamışsa neden talep açılamadığı da. */}
            {servis ? (
              <ServisKarti servis={servis} showToast={showToast} t={t} dil={dil} />
            ) : (
              <ServisYokKarti hicbiri t={t} dil={dil} />
            )}
          </div>
        </div>

        {/* Sekmeler */}
        <div className="pill-list" style={{ marginTop: 22 }}>
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              className={'pill' + (sekme === s.id ? ' pill--on' : '')}
              onClick={() => setSekme(s.id)}
            >
              {t(s.anahtar)}
            </button>
          ))}
        </div>

        <div className="wrap" style={{ marginTop: 14 }}>
          {sekme === 'videolar' && <Videolar product={p} />}
          {sekme === 'bakim' && (
            <Bakim product={p} done={done} onToggle={bakimIsaretle} />
          )}
          {sekme === 'bilgi' && <Bilgiler product={p} machine={machine} />}
        </div>

        {/* Sayfanın en altı: kaydı silme. Yanlışlıkla basılmasın diye
            en sonda ve sade duruyor. */}
        <div className="wrap" style={{ marginTop: 34 }}>
          <div className="divider" />
          <button
            className="btn btn--soft btn--sm"
            style={{ color: 'var(--pk-red-yazi)', borderColor: 'var(--line)' }}
            onClick={() => setSilSor(true)}
          >
            <IconTrash size={19} /> {t('detay.kayitSil')}
          </button>
          <p className="small muted center" style={{ marginTop: 10, lineHeight: 1.5 }}>
            {t('detay.silNot')}
          </p>
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

/* --------------------------------------------------------------- Videolar */

function Videolar({ product }) {
  const { t } = useDil()
  const nav = useNavigate()
  const [acikVideo, setAcikVideo] = useState(null)
  const kullanim = product.videos.filter((v) => v.type === 'kullanim')
  const tanitim = product.videos.filter((v) => v.type === 'tanitim')

  return (
    <div className="stack">
      {kullanim.length > 0 && (
        <>
          <h3 style={{ fontSize: 16 }}>{t('detay.kullanimVideolari')}</h3>
          {kullanim.map((v, i) => <VideoRow key={i} video={v} onOynat={setAcikVideo} />)}
        </>
      )}

      {tanitim.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, marginTop: 12 }}>{t('detay.tanitim')}</h3>
          {tanitim.map((v, i) => <VideoRow key={i} video={v} onOynat={setAcikVideo} />)}
        </>
      )}

      <div className="listitem listitem--flat" style={{ alignItems: 'flex-start', marginTop: 8 }}>
        <span style={{ color: 'var(--pk-blue-yazi)', flex: 'none', marginTop: 2 }}>
          <IconAlert size={20} />
        </span>
        <div className="listitem__body">
          <div className="small" style={{ lineHeight: 1.55 }}>
            {t('detay.videoBulamadin')}
          </div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 10 }} onClick={() => nav('/destek')}>
            {t('detay.destekAl')}
          </button>
        </div>
      </div>

      <VideoOynatici video={acikVideo} onClose={() => setAcikVideo(null)} />
    </div>
  )
}

/* Bir video satırı.

   DİL KANCASI BURADA ŞART. Satır `t(...)` çağırıyordu ama kancayı
   almıyordu: dosyası da adresi de olmayan videoya dokunulduğunda
   çağrı hata veriyor ve ekranda hiçbir şey olmuyordu. Katalogdaki 31
   videonun 30'u bu durumda, yani dokunuşların neredeyse tamamı
   sessizce boşa gidiyordu.

   Yokluğu dokunmadan önce de yazıyoruz: süre yerine "yakında"
   satırı görünüyor, dokununca da aynı cümle uyarı olarak çıkıyor. */
function VideoRow({ video, onOynat }) {
  const { showToast } = useApp()
  const { t } = useDil()
  const tur = videoTuru(video)
  return (
    <button
      className="listitem"
      onClick={() => {
        if (tur === 'oynat') onOynat(video)
        else if (tur === 'dis') window.open(video.url, '_blank')
        else showToast(t('detay.videoYakinda'))
      }}
    >
      <div
        className="listitem__icon"
        style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
      >
        <IconPlay size={22} />
      </div>
      <div className="listitem__body">
        <div className="listitem__title" style={{ whiteSpace: 'normal', fontSize: 15 }}>
          {video.title}
        </div>
        <div className="listitem__sub">
          {tur === 'yok' ? t('detay.videoYakinda') : <VideoSure video={video} />}
        </div>
      </div>
      <span className="listitem__chev"><IconRight size={20} /></span>
    </button>
  )
}

/* ------------------------------------------------------------------ Bakım */

/* Çalışma saati uygulamada tutulmuyor (makineler bir yere bağlı değil,
   kaç saat çalıştığını bilemeyiz). Bu yüzden "sıradaki bakım" diye bir
   tahmin yapılmıyor; takvim olduğu gibi listeleniyor, çiftçi yaptığını
   kendisi işaretliyor. */
function Bakim({ product, done, onToggle }) {
  const { t } = useDil()
  return (
    <div className="stack">
      <h3 style={{ fontSize: 16 }}>{t('detay.bakimTakvimi')}</h3>

      {product.bakim.map((b) => {
        const isaretli = done.includes(b.saat)
        return (
          <button
            key={b.saat}
            className="listitem"
            onClick={() => onToggle(b.saat)}
            style={{ alignItems: 'flex-start' }}
            aria-pressed={isaretli}
          >
            <div
              className="listitem__icon"
              style={{
                background: isaretli ? 'var(--pk-green)' : 'var(--pk-blue-soft)',
                /* İşaretsizken --pk-blue değil --pk-blue-yazi: ana mavi
                   karanlık temada kendi soluk zemini üstünde 1,85
                   kontrastta kalıyor, saat aralığı hiç okunmuyordu. */
                color: isaretli ? '#fff' : 'var(--pk-blue-yazi)',
              }}
            >
              {isaretli ? <IconCheck size={21} /> : <strong style={{ fontSize: 12.5 }}>{b.saat}s</strong>}
            </div>
            <div className="listitem__body">
              <div className="listitem__title" style={{ whiteSpace: 'normal' }}>{b.baslik}</div>
              <div className="listitem__sub">{b.detay}</div>
            </div>
          </button>
        )
      })}

      <p className="small muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
        {t('detay.bakimNot')}
      </p>
    </div>
  )
}

/* --------------------------------------------------------------- Bilgiler */

function Bilgiler({ product, machine }) {
  const { t } = useDil()
  return (
    <div className="stack">
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{product.name}</h3>
        <p style={{ lineHeight: 1.6, color: 'var(--ink-2)', fontSize: 15 }}>{product.desc}</p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t('detay.teknik')}</h3>
        {product.specs.map(([k, v]) => <DataRow key={k} k={k} v={v} />)}
      </div>

      {/* Kayıtlı makinenin tam teknik tablosu.

          Ürün sayfasındakiyle aynı bileşen. Müşterinin kendi makinesine
          bakarken "piston kursu kaçtı, hangi lastik takılı" diye
          sorması, katalogdan bakmasından daha sık olan durum. */}
      <TeknikOzellikler urunId={product.id} />

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('detay.garanti')}</h3>
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

