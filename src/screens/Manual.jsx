import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar } from '../components/Chrome'
import { useDil } from '../i18n'
import { getProduct, urunDilde } from '../data/products'
import { yaz } from '../lib/destek'
import {
  genelGuvenlik, kilavuzBelgesi, kilavuzGuvenlik, kilavuzKartlari,
  kilavuzModelleri, kilavuzTeknik, kilavuzVarMi, prosedurBasligi, teknikEtiket,
} from '../lib/kilavuzVeri'
import {
  IconBook, IconAlert, IconRight, IconChat, IconShield, IconCog,
} from '../components/Icons'

/* ==========================================================================
   Kullanım kılavuzu ekranı

   İçeriğin tamamı makinenin KENDİ kullanım kılavuzundan geliyor
   (bkz. src/lib/kilavuzVeri.js). Uygulama tek bir teknik cümle yazmıyor.

   EKRANIN DÜZENİ

     Künye            hangi kılavuz, kaç sayfa
     Önce güvenlik    SABİT — makineye el sürmeden önceki kurallar
     Kullanım ve ayar kılavuzun prosedürleri, kısa adlarıyla
     Makine bilgisi   ölçü, ağırlık, devir — model seçilerek
     Arıza çözümü     Destek ekranını açıyor

   GÜVENLİK NEDEN KISALTILDI

   Bir kılavuzun güvenlik bölümü 51-58 madde ve dört kılavuzun maddeleri
   neredeyse aynı. Hepsini her makinenin sayfasına açık dökmek ekranı
   okunmaz yapıyordu. Burada yalnız "makineye el sürmeden önce" kuralları
   duruyor; tamamı ortak Güvenlik Kuralları sayfasında.
   ========================================================================== */

export default function Manual() {
  const { productId } = useParams()
  const nav = useNavigate()
  const { machines } = useApp()
  const { t, dil } = useDil()

  const p = urunDilde(getProduct(productId), dil)
  const [acik, setAcik] = useState('kullanim')

  const sabitGuvenlik = useMemo(() => genelGuvenlik(productId), [productId])
  const tumGuvenlik = useMemo(() => kilavuzGuvenlik(productId), [productId])
  const prosedur = useMemo(() => kilavuzKartlari(productId, 'PROCEDURE'), [productId])
  const modeller = useMemo(() => kilavuzModelleri(productId), [productId])
  const belge = useMemo(() => kilavuzBelgesi(productId), [productId])

  /* Teknik değerler varyanta özel; ilk varyant seçili geliyor. */
  const [varyant, setVaryant] = useState(() => kilavuzModelleri(productId)[0]?.id || null)
  const teknik = useMemo(() => kilavuzTeknik(varyant), [varyant])

  if (!p || !kilavuzVarMi(productId)) {
    return (
      <div className="app">
        <TopBar title={t('urun.kilavuz')} back />
        <div className="screen wrap">
          <div className="empty">
            <IconBook size={64} />
            <p>{p ? t('kilavuz.kilavuzYok') : t('detay.urunYok')}</p>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  /* Destek ekranına giderken kullanıcının KENDİ makinesine
     bağlanılıyor: açılan servis talebi doğru makineye düşsün. */
  const makinem = machines.find((m) => m.productId === p.id)

  return (
    <div className="app">
      <TopBar title={t('urun.kilavuz')} sub={p.name} back />

      <div className="screen wrap" style={{ paddingTop: 18 }}>
        {/* Hangi kılavuzdan okunduğu en başta yazıyor: müşteri elindeki
            basılı kılavuzla aynı belgeye baktığını görsün. */}
        {belge && (
          <div className="card kilavuz-kunye">
            <span className="kilavuz-kunye__ikon"><IconBook size={22} /></span>
            <div>
              <div className="kilavuz-kunye__ad">{belge.ad}</div>
              <div className="small muted">{t('kilavuz.belgeAlt', { n: belge.sayfa })}</div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ Önce güvenlik

            Açılır kapanır değil, sabit. Aşağıdaki bütün prosedürler
            makineye el sürmeyi gerektiriyor; bu kutu her zaman görünür
            olmalı. */}
        {sabitGuvenlik.length > 0 && (
          <div className="kilavuz-guvenlik">
            <div className="kilavuz-guvenlik__ust">
              <IconAlert size={20} />
              <h2>{t('kilavuz.onceGuvenlik')}</h2>
            </div>
            <p className="kilavuz-guvenlik__giris">{t('kilavuz.onceGuvenlikAlt')}</p>
            <ul className="kilavuz-guvenlik__liste">
              {sabitGuvenlik.map((g) => (
                <li key={g.safety_id}>{yaz(g.text, dil)}</li>
              ))}
            </ul>
            <Link to="/kilavuzlar/guvenlik" className="btn btn--soft btn--sm">
              <IconShield size={18} /> {t('kilavuz.tumKurallar', { n: tumGuvenlik.length })}
            </Link>
          </div>
        )}

        {prosedur.length > 0 && (
          <Bolum
            id="kullanim"
            acik={acik}
            setAcik={setAcik}
            Ikon={IconCog}
            baslik={t('kilavuz.b2')}
          >
            <Kartlar liste={prosedur} dil={dil} />
          </Bolum>
        )}

        {teknik.length > 0 && (
          <Bolum
            id="teknik"
            acik={acik}
            setAcik={setAcik}
            Ikon={IconBook}
            baslik={t('kilavuz.b4')}
          >
            {/* Kılavuz birden çok modeli kapsıyorsa değerler modele göre
                değişiyor; kullanıcı kendi modelini seçiyor. */}
            {modeller.length > 1 && (
              <>
                <p className="small muted" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>
                  {t('kilavuz.varyantSecin')}
                </p>
                <div className="secenekler" style={{ marginBottom: 14 }}>
                  {modeller.map((m) => (
                    <button
                      key={m.id}
                      className={'secenek' + (varyant === m.id ? ' secenek--on' : '')}
                      onClick={() => setVaryant(m.id)}
                    >
                      {m.ad}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="kilavuz-tablo">
              {teknik.map((q) => (
                <div key={q.faq_id} className="kilavuz-tablo__satir">
                  <span className="kilavuz-tablo__ad">{teknikEtiket(q, dil)}</span>
                  <strong className="kilavuz-tablo__deger">{yaz(q.answer, dil)}</strong>
                </div>
              ))}
            </div>
          </Bolum>
        )}

        {/* Arıza listesi ve teşhis akışı Destek ekranında duruyor;
            burada kopyalanmıyor. Sebebi tek bir doğru kaynak olması:
            veri seti yenilendiğinde iki ekranın ayrışması istenmiyor. */}
        <Bolum
          id="ariza"
          acik={acik}
          setAcik={setAcik}
          Ikon={IconChat}
          baslik={t('kilavuz.b5')}
        >
          <p style={{ margin: '0 0 16px', lineHeight: 1.65 }}>{t('kilavuz.arizaAciklama')}</p>
          <button
            className="btn btn--primary btn--lg"
            onClick={() => nav(makinem ? `/destek/${makinem.id}` : '/destek')}
          >
            <IconChat size={20} /> {t('kilavuz.destegeGit')}
          </button>
        </Bolum>
      </div>

      <TabBar />
    </div>
  )
}

/* Kılavuz kartları — kısa adı görünüyor, dokununca kılavuzun kendi
   paragrafı açılıyor. Paragrafların hepsini birden açık göstermek
   ekranı okunmaz yapıyordu. */
function Kartlar({ liste, dil }) {
  const [acikKart, setAcikKart] = useState(null)

  return (
    <div className="stack" style={{ gap: 8 }}>
      {liste.map((c, i) => {
        const acik = acikKart === c.card_id
        return (
          <div key={c.card_id} className={'ariza' + (acik ? ' ariza--on' : '')}>
            <button
              className="ariza__bas"
              onClick={() => setAcikKart(acik ? null : c.card_id)}
              aria-expanded={acik}
            >
              <span className="kilavuz-adim__no">{i + 1}</span>
              <span className="listitem__body">
                <span className="listitem__title" style={{ fontSize: 15 }}>
                  {prosedurBasligi(c, dil)}
                </span>
              </span>
              <span className={'ariza__ok' + (acik ? ' ariza__ok--on' : '')}>
                <IconRight size={20} />
              </span>
            </button>
            {acik && (
              <div className="ariza__ic">
                <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {yaz(c.body, dil)}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Bolum({ id, acik, setAcik, baslik, children, Ikon }) {
  const isOpen = acik === id

  return (
    <div className={'ariza' + (isOpen ? ' ariza--on' : '')} style={{ marginTop: 12 }}>
      <button
        className="ariza__bas"
        onClick={() => setAcik(isOpen ? null : id)}
        aria-expanded={isOpen}
      >
        <span className="listitem__icon"><Ikon size={21} /></span>
        <span className="listitem__body">
          <span className="listitem__title" style={{ fontSize: 15.5 }}>{baslik}</span>
        </span>
        <span className={'ariza__ok' + (isOpen ? ' ariza__ok--on' : '')}>
          <IconRight size={20} />
        </span>
      </button>
      {isOpen && <div className="ariza__ic">{children}</div>}
    </div>
  )
}
