import { Fragment, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar } from '../components/Chrome'
import { araligiBolme, RehberIlerlemesi, RehberMakineSecici } from '../components/Rehber'
import { useDil } from '../i18n'
import { getRehber, guvenlikMetni, rehberListesi } from '../marka/icerik/rehber'
import { bakimCizimi, rehberCizimi } from '../data/bakimCizimleri'
import { getProduct, supportGroup, urunDilde } from '../marka'
import {
  bolumuSifirla, isaretiCevir, isaretleriGetir, isaretleriGeriYukle, maddeAnahtari,
  rehberBolumleri, rehberIlerlemesi, rehberiSifirla,
} from '../lib/rehberIsaret'
import {
  IconAlert, IconCheck, IconCheckCircle, IconRight, IconChat, IconParca, IconWrench, IconUndo,
} from '../components/Icons'

/* ==========================================================================
   Bakım rehberi

   Rehber metni iki katmanlı (bkz. marka/icerik/rehber.js):
     · gruplar → makinenin türüne göre değişen adımlar
     · ortak   → her makinede geçerli adımlar
   Makineye özel bölümler önce: çiftçi kendi makinesi için ne yapacağını
   en üstte görsün.

   YENİDEN DÜZENLENDİ (29 Eylül 2026, kullanıcının isteği).

     · En üstte rehberin özeti ve BÜTÜN rehberin ilerlemesi ("9 / 22
       adım"). Önce yalnız bölüm başına sayaç vardı; kaç iş kaldığı
       toplanarak bulunuyordu.
     · Makine seçimi ekranın başında, rehber listesinden ya da makine
       sayfasından gelindiyse o makine seçili (?makine=). İşaretler makine
       başına (lib/rehberIsaret.js).
     · Maddeler büyük: satırın tamamı düğme, kutu 26 piksel, yazı 16
       piksel. Yapılan maddenin kutusu yeşil ve onaylı; üstü çizilmiyor
       (29 Eylül 2026, görünüm önerisi C9: çizgi yazıyı okunmaz yapıyordu).
     · Bütün rehber bitince tek bir "tamamlandı" kartı ve baştan başlama;
       bölüm bitince bölümün altında kısa bir satır. Önce her bölümün
       altında ayrı bir büyük şerit çıkıyordu.
   ========================================================================== */

export default function Guide() {
  const { rehberId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { machines } = useApp()
  const { t, dil } = useDil()
  const rehber = getRehber(rehberId, dil)

  const [secili, setSecili] = useState(
    () => machines.find((m) => m.id === params.get('makine'))?.id || machines[0]?.id || null,
  )
  /* İşaretli maddeler telefonda duruyor; ekran açıldığında geri
     okunuyor (bkz. src/lib/rehberIsaret.js). */
  const [isaretler, setIsaretler] = useState(isaretleriGetir)

  /* "BAŞTAN BAŞLA" GERİ ALINIYOR (29 Eylül 2026, görünüm önerisi;
     kullanıcının onayı). Tek dokunuş bütün işaretleri siliyordu ve düğme
     ilerleme çubuğunun hemen altında, başparmağın durduğu yerdeydi.
     Silinen işaretler bir süre tutuluyor; "Geri Al" onları geri yazıyor. */
  const [geriAlinacak, setGeriAlinacak] = useState(null)
  useEffect(() => {
    if (!geriAlinacak) return undefined
    const zaman = setTimeout(() => setGeriAlinacak(null), 10000)
    return () => clearTimeout(zaman)
  }, [geriAlinacak])
  const sifirla = () => {
    setGeriAlinacak(isaretleriGetir())
    setIsaretler(rehberiSifirla(secili, rehber.id))
  }

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
  const urun = makine ? urunDilde(getProduct(makine.productId), dil) : null
  const grup = urun ? supportGroup(urun) : null
  const bolumler = rehberBolumleri(rehber, grup)
  const ozelSayisi = bolumler.filter((b) => b.ozel).length
  const { yapilan, toplam } = rehberIlerlemesi(rehber, secili, grup, isaretler)
  const hepsiTamam = toplam > 0 && yapilan === toplam
  const cizim = rehberCizimi(rehber.id)
  const makineSorgusu = makine ? `?makine=${makine.id}` : ''

  return (
    <div className="app">
      <TopBar title={rehber.baslik} back="auto" />

      <div className="screen wrap fade-in bakim">
        {/* ------------------------------------------ Özet ve ilerleme */}
        <section className="bakim-ozet">
          <div className="bakim-ozet__ust">
            <div className="bakim-ozet__metin">
              <p className="bakim-ozet__ozet">{araligiBolme(rehber.ozet)}</p>
              <p className="bakim-ozet__zaman">{rehber.neZaman}</p>
            </div>
            {cizim && <img className="bakim-ozet__cizim" src={cizim} alt="" />}
          </div>
          <RehberIlerlemesi
            yapilan={yapilan}
            toplam={toplam}
            yazi={t('rehberler.ilerlemeUzun', { yapilan, toplam })}
          />
          {yapilan > 0 && (
            <button type="button" className="bakim-sifirla" onClick={sifirla}>
              {t('rehberler.bastanBasla')}
            </button>
          )}
          {geriAlinacak && (
            <div className="bakim-geri-al" role="status">
              <span>{t('rehberler.silindi')}</span>
              {/* Kendi yazısı ve tam boy (29 Eylül 2026, son denetim):
                  talep listesinin "Listeme Geri Al" yazısını ödünç
                  alıyordu ve 46 pikseldi. */}
              <button
                type="button"
                className="btn btn--soft"
                onClick={() => {
                  setIsaretler(isaretleriGeriYukle(geriAlinacak))
                  setGeriAlinacak(null)
                }}
              >
                <IconUndo size={18} /> {t('rehberler.geriAl')}
              </button>
            </div>
          )}
        </section>

        {machines.length > 1 && (
          <RehberMakineSecici
            machines={machines}
            secili={secili}
            onSec={setSecili}
            baslik={t('rehberler.hangiMakine')}
            dil={dil}
          />
        )}

        {/* Güvenlik — her rehberin başında, atlanamaz. Tek paragraf:
            bakımın her maddesi için geçerli olan tek kural. */}
        <section className="bakim-guvenlik" aria-labelledby="bakim-guvenlik-baslik">
          <h2 id="bakim-guvenlik-baslik" className="bakim-guvenlik__baslik">
            <IconAlert size={22} /> {t('rehberler.onceGuvenlik')}
          </h2>
          <p>{guvenlikMetni(dil)}</p>
        </section>

        {hepsiTamam && (
          <section className="bakim-tamam" aria-live="polite">
            <span className="bakim-tamam__ikon"><IconCheckCircle size={30} /></span>
            <h2>{t('rehberler.tamamBaslik', { rehber: rehber.baslik })}</h2>
            <p>{t('rehberler.tamamAlt')}</p>
            <button type="button" className="btn btn--soft" onClick={sifirla}>
              {t('rehberler.bastanBasla')}
            </button>
          </section>
        )}

        {/* ------------------------------------------------- Bölümler */}
        {bolumler.map(({ bolum, kimlik, ozel }, i) => (
          <Fragment key={kimlik}>
            {i === 0 && ozelSayisi > 0 && (
              <h2 className="bakim-baslik">{t('rehberler.makineyeOzel', { makine: makine.nickname || urun.name })}</h2>
            )}
            {i === ozelSayisi && ozelSayisi > 0 && <h2 className="bakim-baslik">{t('rehberler.herMakine')}</h2>}
            <Bolum
              bolum={bolum}
              ozel={ozel}
              kimlik={kimlik}
              makineId={secili}
              rehberId={rehber.id}
              isaretler={isaretler}
              setIsaretler={setIsaretler}
              t={t}
            />
          </Fragment>
        ))}

        {/* Makine yoksa: neyin eksik kaldığını söyle */}
        {machines.length === 0 && (
          <div className="card bakim-makine-yok">
            <div className="card__title">{t('rehberler.ozelAdimlar')}</div>
            <div className="card__sub">{t('rehberler.makineKaydet')}</div>
            <button className="btn btn--brand" style={{ marginTop: 14 }} onClick={() => nav('/makine-ekle')}>
              {t('makine.ekle')}
            </button>
          </div>
        )}

        {/* ------------------------------------------ Takıldığınız yer */}
        <h2 className="bakim-baslik">{t('rehberler.takildiginiz')}</h2>
        <div className="stack" style={{ gap: 10 }}>
          <SonrakiAdim
            Ikon={IconChat}
            ad={t('rehberler.destekSorun')}
            alt={t('rehberler.destekSorunAlt')}
            onClick={() => nav(makine ? `/destek/${makine.id}` : '/destek')}
          />
          <SonrakiAdim
            Ikon={IconWrench}
            turuncu
            ad={t('rehberler.servisIsteyin')}
            alt={t('rehberler.servisIsteyinAlt')}
            onClick={() => nav(`/talep?tur=servis${makine ? `&makine=${makine.id}` : ''}`)}
          />
          <SonrakiAdim
            Ikon={IconParca}
            turuncu
            ad={t('rehberler.parcaIsteyin')}
            alt={t('rehberler.parcaIsteyinAlt')}
            onClick={() => nav(`/talep?tur=parca${makine ? `&makine=${makine.id}` : ''}`)}
          />
        </div>

        {/* ------------------------------------------- Diğer rehberler */}
        <div className="sectionhead">
          <h2>{t('rehberler.digerRehberler')}</h2>
          <Link to={`/bakim${makineSorgusu}`}>{t('ortak.tumu')}</Link>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {rehberListesi(dil)
            .filter((r) => r.id !== rehber.id)
            .map((r) => (
              <Link key={r.id} to={`/bakim/${r.id}${makineSorgusu}`} className="bakim-satir bakim-satir--sade">
                {rehberCizimi(r.id) && (
                  <span className="bakim-satir__cizim">
                    <img src={rehberCizimi(r.id)} alt="" />
                  </span>
                )}
                <span className="bakim-satir__metin">
                  <span className="bakim-satir__ad">{r.baslik}</span>
                  <span className="bakim-satir__alt">{araligiBolme(r.ozet)}</span>
                </span>
                <span className="bakim-satir__ok" aria-hidden="true"><IconRight size={20} /></span>
              </Link>
            ))}
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/* Bir bakım bölümü.

   Her madde dokunulabilir: yapılan madde işaretleniyor, yazısının üstü
   çiziliyor. Amaç kağıt üstünde takip etmeyi bırakmak: çiftçi neyi
   yaptığını telefonda görüyor, yarım kalırsa kaldığı yerden devam
   ediyor. Bölüm bitince altında kısa bir "tamamlandı" satırı ve o
   bölümü sıfırlama; günlük bakım her gün yeniden yapılıyor. */
function Bolum({ bolum, ozel, kimlik, makineId, rehberId, isaretler, setIsaretler, t }) {
  const anahtarlar = useMemo(
    () => bolum.maddeler.map((_, i) => maddeAnahtari(makineId, rehberId, kimlik, i)),
    [bolum.maddeler, makineId, rehberId, kimlik],
  )

  const yapilan = anahtarlar.filter((a) => isaretler.includes(a)).length
  const tamam = yapilan === bolum.maddeler.length && yapilan > 0
  const cizim = bakimCizimi(bolum.baslikTr || bolum.baslik)

  return (
    <section
      className={
        'bakim-kart' +
        (bolum.vurgu ? ' bakim-kart--vurgu' : ozel ? ' bakim-kart--ozel' : '') +
        (tamam ? ' bakim-kart--tamam' : '')
      }
    >
      <div className="bakim-kart__bas">
        {/* Bölümün hangi işi anlattığını yazıyı çözmeden gösteren çizim:
            bakmak, greslemek, sıkmak, temizlemek. */}
        {cizim && (
          <span className="bakim-kart__cizim">
            <img src={cizim} alt="" />
          </span>
        )}
        <h3>{bolum.baslik}</h3>
        <span className={'bakim-kart__sayac' + (tamam ? ' bakim-kart__sayac--on' : '')}>
          {t('rehberler.ilerleme', { yapilan, toplam: bolum.maddeler.length })}
        </span>
      </div>

      {bolum.giris && <p className="bakim-kart__giris">{bolum.giris}</p>}

      <ul className="bakim-maddeler">
        {bolum.maddeler.map((m, i) => {
          const acik = isaretler.includes(anahtarlar[i])
          return (
            <li key={m}>
              <button
                type="button"
                className={'bakim-madde' + (acik ? ' bakim-madde--on' : '')}
                onClick={() => setIsaretler(isaretiCevir(anahtarlar[i]))}
                aria-pressed={acik}
              >
                <span className="bakim-madde__kutu" aria-hidden="true"><IconCheck size={16} /></span>
                <span className="bakim-madde__metin">{m}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {tamam && (
        <div className="bakim-kart__bitti">
          <span>
            <IconCheckCircle size={20} /> {t('rehberler.bolumTamamKisa')}
          </span>
          <button
            type="button"
            className="bakim-sifirla"
            onClick={() => setIsaretler(bolumuSifirla(makineId, rehberId, kimlik))}
          >
            {t('rehberler.yenidenBasla')}
          </button>
        </div>
      )}
    </section>
  )
}

function SonrakiAdim({ Ikon, ad, alt, turuncu, onClick }) {
  return (
    <button type="button" className="listitem" onClick={onClick}>
      <div
        className="listitem__icon"
        style={turuncu ? { background: 'var(--pk-orange-soft)', color: 'var(--pk-orange-ink)' } : undefined}
      >
        <Ikon size={22} />
      </div>
      <div className="listitem__body">
        {/* Başlık kısa: uzun cümle satıra sığmayıp kesiliyordu,
            düğmenin ne işe yaradığı anlaşılmıyordu. */}
        <div className="listitem__title">{ad}</div>
        <div className="listitem__sub">{alt}</div>
      </div>
      <span className="listitem__chev"><IconRight size={21} /></span>
    </button>
  )
}
