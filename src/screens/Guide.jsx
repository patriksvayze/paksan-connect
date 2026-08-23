import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar } from '../components/Chrome'
import { useDil } from '../i18n'
import { getRehber, guvenlikMetni } from '../data/rehber'
import { getProduct, supportGroup, urunDilde } from '../data/products'
import { rehberListesi } from '../data/rehber'
import {
  bolumuSifirla, isaretiCevir, isaretleriGetir, maddeAnahtari,
} from '../lib/rehberIsaret'
import {
  IconAlert, IconCheck, IconCheckCircle, IconRight, IconChat, IconWrench,
} from '../components/Icons'

/* Bakım rehberi ekranı.

   Rehber metni iki katmandan oluşuyor (bkz. src/data/rehber.js):
     · ortak   → her makinede geçerli adımlar
     · gruplar → makinenin türüne göre değişen adımlar

   Kullanıcının birden fazla makinesi varsa üstteki haplardan seçer,
   metnin alt yarısı ona göre değişir. Hiç makinesi yoksa yalnızca ortak
   kısım gösterilir ve makine kaydetmeye çağrılır.                       */

export default function Guide() {
  const { rehberId } = useParams()
  const nav = useNavigate()
  const { machines } = useApp()
  const { t, dil } = useDil()
  const rehber = getRehber(rehberId, dil)

  const [secili, setSecili] = useState(machines[0]?.id || null)

  /* İşaretli maddeler telefonda duruyor; ekran açıldığında geri
     okunuyor (bkz. src/lib/rehberIsaret.js). */
  const [isaretler, setIsaretler] = useState(isaretleriGetir)

  if (!rehber) {
    return (
      <div className="app">
        <TopBar title={t('rehberler.baslik')} back="auto" />
        <div className="screen wrap empty">{t('rehberler.bulunamadi')}</div>
        <TabBar />
      </div>
    )
  }

  const makine = machines.find((m) => m.id === secili) || null
  const urun = makine ? getProduct(makine.productId) : null
  const grup = urun ? supportGroup(urun) : null
  const grupBolumleri = grup ? rehber.gruplar[grup] || [] : []

  return (
    <div className="app">
      <TopBar title={rehber.baslik} sub={rehber.neZaman} back="auto" />

      <div className="screen fade-in">
        {/* Güvenlik — her rehberin başında, atlanamaz */}
        <div className="wrap" style={{ paddingTop: 16 }}>
          <div
            className="card"
            style={{ background: 'var(--pk-red-soft)', boxShadow: 'none' }}
          >
            <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              {/* Uyarı atlanmasın diye ikon ve başlık kart içindeki
                  diğer yazılardan belirgin şekilde büyük. */}
              <span style={{ color: 'var(--pk-red)', flex: 'none', marginTop: 1 }}>
                <IconAlert size={28} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{t('rehberler.onceGuvenlik')}</div>
                <p className="small muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  {guvenlikMetni(dil)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Makine seçimi — metnin alt yarısı buna göre değişir */}
        {machines.length > 0 && (
          <>
            <div className="wrap" style={{ marginTop: 20 }}>
              <div className="eyebrow">{t('rehberler.hangiMakine')}</div>
            </div>
            <div className="pill-list" style={{ marginTop: 10 }}>
              {machines.map((m) => {
                const p = urunDilde(getProduct(m.productId), dil)
                if (!p) return null
                return (
                  <button
                    key={m.id}
                    className={'pill' + (secili === m.id ? ' pill--on' : '')}
                    onClick={() => setSecili(m.id)}
                  >
                    {m.nickname || p.name}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="wrap" style={{ marginTop: 22 }}>
          {/* Önce makineye özel adımlar: kullanıcı kendi makinesi için ne
              yapacağını en üstte görsün. Genel maddeler altında. */}
          {grupBolumleri.map((b, i) => (
            <Bolum
              key={b.baslik}
              bolum={b}
              vurgulu
              kimlik={`${grup}-${i}`}
              makineId={secili}
              rehberId={rehber.id}
              rehberAdi={rehber.baslik}
              isaretler={isaretler}
              setIsaretler={setIsaretler}
              t={t}
            />
          ))}

          {grupBolumleri.length > 0 && (
            <div className="sectionhead">
              <h2>{t('rehberler.herMakine')}</h2>
            </div>
          )}

          {rehber.ortak.map((b, i) => (
            <Bolum
              key={b.baslik}
              bolum={b}
              kimlik={`ortak-${i}`}
              makineId={secili}
              rehberId={rehber.id}
              rehberAdi={rehber.baslik}
              isaretler={isaretler}
              setIsaretler={setIsaretler}
              t={t}
            />
          ))}

          {/* Makine yoksa: neyin eksik kaldığını söyle */}
          {machines.length === 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card__title">{t('rehberler.ozelAdimlar')}</div>
              <div className="card__sub">{t('rehberler.makineKaydet')}</div>
              <button
                className="btn btn--brand"
                style={{ marginTop: 14 }}
                onClick={() => nav('/makine-ekle')}
              >
                {t('makine.ekle')}
              </button>
            </div>
          )}

          {/* Sonraki adımlar */}
          <div className="sectionhead">
            <h2>{t('rehberler.takildiginiz')}</h2>
          </div>
          <div className="stack">
            <button
              className="listitem"
              onClick={() =>
                nav(makine ? `/destek/${makine.id}` : '/destek')
              }
            >
              <div className="listitem__icon">
                <IconChat size={22} />
              </div>
              <div className="listitem__body">
                <div className="listitem__title">{t('rehberler.destekSorun')}</div>
                <div className="listitem__sub">
                  {t('rehberler.destekSorunAlt')}
                </div>
              </div>
              <span className="listitem__chev">
                <IconRight size={21} />
              </span>
            </button>

            <button
              className="listitem"
              onClick={() =>
                nav(`/talep?tur=parca${makine ? `&makine=${makine.id}` : ''}`)
              }
            >
              <div
                className="listitem__icon"
                style={{ background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' }}
              >
                <IconWrench size={22} />
              </div>
              <div className="listitem__body">
                {/* Başlık kısa: uzun cümle satıra sığmayıp kesiliyordu,
                    butonun ne işe yaradığı anlaşılmıyordu. */}
                <div className="listitem__title">{t('rehberler.parcaIsteyin')}</div>
                <div className="listitem__sub">{t('rehberler.parcaIsteyinAlt')}</div>
              </div>
              <span className="listitem__chev">
                <IconRight size={21} />
              </span>
            </button>
          </div>

          {/* Diğer rehberler */}
          <div className="sectionhead">
            <h2>{t('rehberler.digerRehberler')}</h2>
            <Link to="/bakim">{t('ortak.tumu')}</Link>
          </div>
          <div className="stack">
            {rehberListesi(dil).filter((r) => r.id !== rehber.id).map((r) => (
              <Link key={r.id} to={`/bakim/${r.id}`} className="listitem">
                <div className="listitem__body">
                  <div className="listitem__title">{r.baslik}</div>
                  <div className="listitem__sub">{r.ozet}</div>
                </div>
                <span className="listitem__chev">
                  <IconRight size={21} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/* Bir bakım bölümü.

   Her madde dokunulabilir: yapılan madde koyu yeşile dönüyor ve
   üstü çiziliyor. Bölümün bütün maddeleri işaretlenince en altta
   tamamlandı şeridi çıkıyor.

   Amaç kağıt üstünde takip etmeyi bırakmak: çiftçi neyi yaptığını
   telefonda görüyor, yarım kalırsa kaldığı yerden devam ediyor. */
function Bolum({
  bolum, vurgulu, kimlik, makineId, rehberId, rehberAdi,
  isaretler, setIsaretler, t,
}) {
  const anahtarlar = useMemo(
    () => bolum.maddeler.map((_, i) => maddeAnahtari(makineId, rehberId, kimlik, i)),
    [bolum.maddeler, makineId, rehberId, kimlik]
  )

  const yapilan = anahtarlar.filter((a) => isaretler.includes(a)).length
  const tamam = yapilan === bolum.maddeler.length && yapilan > 0

  return (
    <div
      className="card"
      style={{
        marginTop: 14,
        ...(bolum.vurgu
          ? { borderLeft: '4px solid var(--pk-orange)', borderRadius: 'var(--r)' }
          : vurgulu
            ? { borderLeft: '4px solid var(--pk-blue)', borderRadius: 'var(--r)' }
            : null),
      }}
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
        <h3 style={{ fontSize: 16.5, flex: 1 }}>{bolum.baslik}</h3>
        {/* Kaç madde yapıldı — başlığın yanında, tek bakışta. */}
        <span className={'rehber__sayac' + (tamam ? ' rehber__sayac--on' : '')}>
          {t('rehberler.ilerleme', { yapilan, toplam: bolum.maddeler.length })}
        </span>
      </div>

      {bolum.giris && (
        <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
          {bolum.giris}
        </p>
      )}

      <div className="stack" style={{ gap: 4, marginTop: 12 }}>
        {bolum.maddeler.map((m, i) => {
          const acik = isaretler.includes(anahtarlar[i])
          return (
            <button
              key={m}
              className={'rehber__madde' + (acik ? ' rehber__madde--on' : '')}
              onClick={() => setIsaretler(isaretiCevir(anahtarlar[i]))}
              aria-pressed={acik}
              aria-label={acik ? m : `${t('rehberler.maddeYapildi')}: ${m}`}
            >
              <span className={'rehber__isaret' + (acik ? ' rehber__isaret--on' : '')}>
                <IconCheck size={14} />
              </span>
              <span className="rehber__metin">{m}</span>
            </button>
          )
        })}
      </div>

      {tamam && (
        <div className="rehber__bitti">
          <span className="rehber__bitti__ikon"><IconCheckCircle size={22} /></span>
          <div style={{ flex: 1 }}>
            <div className="rehber__bitti__ad">
              {t('rehberler.bolumTamam', { bolum: bolum.baslik, rehber: rehberAdi })}
            </div>
            <div className="small muted" style={{ marginTop: 3, lineHeight: 1.5 }}>
              {t('rehberler.bolumTamamAlt')}
            </div>
          </div>
          {/* Günlük bakım her gün yeniden yapılıyor; işaretleri
              temizlemek kullanıcının elinde. */}
          <button
            className="btn btn--soft btn--sm"
            onClick={() => setIsaretler(bolumuSifirla(makineId, rehberId, kimlik))}
          >
            {t('rehberler.yenidenBasla')}
          </button>
        </div>
      )}
    </div>
  )
}
