import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar } from '../components/Chrome'
import { getProduct, urunDilde } from '../data/products'
import { alanEtiketi } from '../data/talepAlanlari'
import { formatSerial } from '../lib/serial'
import { talepTuru } from '../lib/talep'
import { ekAdresi } from '../lib/ekler'
import { SIRKET } from '../config'
import { araProps } from '../lib/tel'
import {
  IconCalendar, IconCheckCircle, IconClose, IconCart, IconMic,
  IconPhone, IconWrench, IconInfo,
} from '../components/Icons'

/* ==========================================================================
   Talep detayı

   NEDEN VAR

   Bildirime dokunan kişi bir şey ÖĞRENMEK istiyor. Önceden bildirim
   müşteriyi profil sayfasındaki listeye atıyordu; orada talebin yalnız
   durumu yazıyordu. "Talebiniz kapatıldı" bildirimine dokunan çiftçi
   yine "Kapatıldı" yazısını görüyor, NEDEN kapatıldığını
   öğrenemiyordu. Dokunmanın hiçbir karşılığı yoktu.

   Bu ekran o karşılığı veriyor: en üstte talebin şu anki hâli ve
   PAKSAN'ın son sözü — iptal sebebi, yapılan iş, verilen teklif, kargo
   takip numarası. Talebin kendisi (ne sorulmuştu) altında duruyor.

   SIRALAMA KASITLI: yeni bilgi üstte, eski bilgi altta. Ekranı açan
   kişi zaten ne sorduğunu biliyor; bilmediği şey cevabı.
   ========================================================================== */

export default function RequestDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { requests, showToast } = useApp()
  const { t, dil } = useDil()

  const r = requests.find((x) => x.id === id)
  const yerel = dil === 'tr' ? 'tr-TR' : 'en-GB'

  const tarihYaz = (z, saatli = true) => {
    if (!z) return ''
    const d = new Date(z)
    const g = d.toLocaleDateString(yerel, { day: 'numeric', month: 'long', year: 'numeric' })
    if (!saatli) return g
    return g + ' · ' + d.toLocaleTimeString(yerel, { hour: '2-digit', minute: '2-digit' })
  }

  /* Talep silinmiş olabilir — profil listesinden kaydırıp silmek
     serbest. O durumda boş ekran değil, ne olduğunu anlatan bir yazı. */
  if (!r) {
    return (
      <div className="app">
        <TopBar title={t('talepDetay.baslik')} back="auto" />
        <div className="screen wrap">
          <div className="empty" style={{ paddingTop: 60 }}>
            <IconInfo size={58} />
            <h2 style={{ fontSize: 19, marginTop: 12 }}>{t('talepDetay.yokBaslik')}</h2>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>{t('talepDetay.yokAlt')}</p>
            <button
              className="btn btn--primary"
              style={{ marginTop: 22 }}
              onClick={() => nav('/profil')}
            >
              {t('talep.taleplerimiGor')}
            </button>
          </div>
        </div>
        <TabBar />
      </div>
    )
  }

  const tur = talepTuru(r.tur)
  const urun = r.makine ? urunDilde(getProduct(r.makine.productId), dil) : null
  const teklifUrun = r.urunId ? urunDilde(getProduct(r.urunId), dil) : null
  const durum = r.status || 'yeni'

  /* Müşteriye açık notlar — personelin "müşteriye gönder" diyerek
     yazdıkları. İç notlar buraya GELMİYOR. */
  const notlar = (r.notlar || []).filter((n) => n.musteriye)

  return (
    <div className="app">
      <TopBar title={tur.ad} sub={r.no} back="auto" />

      <div className="screen wrap fade-in" style={{ paddingTop: 16 }}>
        {/* ------------------------------------------------ Şu anki hâli */}
        <div className={'card durum-kart durum-kart--' + durum}>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <DurumIkon durum={durum} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{t('talepDurum.' + durum)}</div>
              <div className="small muted" style={{ marginTop: 2 }}>
                {tarihYaz(sonDegisim(r) || r.createdAt)}
              </div>
            </div>
            <span className={'badge serial-mono badge--' + tur.ton}>{r.no}</span>
          </div>
        </div>

        {/* ----------------------------------------- PAKSAN'ın son sözü

            İptal sebebi, yapılan iş, verilen teklif… Bildirime dokunan
            kişinin aradığı bilgi burada, en üstte. */}

        {r.iptalBilgi && (
          <Kutu ad={t('talepDetay.iptalBaslik')} ton="kirmizi">
            <p className="detay-metin">{r.iptalBilgi.neden}</p>
            {r.iptalBilgi.aciklama && <p className="detay-metin">{r.iptalBilgi.aciklama}</p>}
            <Imza personel={r.iptalBilgi.personel} tarih={tarihYaz(r.iptalBilgi.tarih)} />
            <a
              className="btn btn--soft btn--sm"
              style={{ marginTop: 14 }}
              {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}
            >
              <IconPhone size={18} /> {t('talepDetay.yanlislikVar')}
            </a>
          </Kutu>
        )}

        {r.teklif && (
          <Kutu ad={t('talepDetay.teklifBaslik')} ton="mor">
            <Satir k={t('talepDetay.teklifTutar')} v={r.teklif.tutar} vurgu />
            <Satir k={t('talepDetay.gecerlilik')} v={r.teklif.gecerlilik} />
            {r.teklif.not && <p className="detay-metin">{r.teklif.not}</p>}
            <Imza personel={r.teklif.personel} tarih={tarihYaz(r.teklif.tarih)} />
          </Kutu>
        )}

        {r.plan && durum === 'planlandi' && (
          <Kutu ad={t('talepDetay.randevuBaslik')} ton="turuncu">
            <div style={{ fontWeight: 800, fontSize: 16 }}>{r.plan.tarihYazi}</div>
            <p className="detay-metin">{r.plan.is}</p>
            <Imza personel={r.plan.personel} tarih={tarihYaz(r.plan.kayitTarihi)} />
          </Kutu>
        )}

        {r.gonderim && (
          <Kutu ad={t('talepDetay.gonderimBaslik')} ton="yesil">
            <Satir k={t('talepDetay.gonderilenParca')} v={r.gonderim.parcalar} />
            <Satir k={t('talepDetay.kargo')} v={r.gonderim.kargo} />
            <Satir k={t('talepDetay.takipNo')} v={r.gonderim.takipNo} mono vurgu />
            <Imza personel={r.gonderim.personel} tarih={tarihYaz(r.gonderim.tarih)} />
          </Kutu>
        )}

        {r.cozum && (
          <Kutu
            ad={r.tur === 'satinalma' ? t('talepDetay.sonucBaslik') : t('talepDetay.yapilanIs')}
            ton="yesil"
          >
            {r.cozum.yapilanIs && <p className="detay-metin">{r.cozum.yapilanIs}</p>}
            <Satir k={t('talepDetay.degisenParca')} v={r.cozum.parcalar} />
            <Satir k={t('talepDetay.ucret')} v={r.cozum.ucret} vurgu />
            <Satir k={t('talepDetay.sonuc')} v={r.cozum.sonuc} />
            <Satir k={t('talepDetay.satisFiyati')} v={r.cozum.satisFiyati} vurgu />
            {r.cozum.not && <p className="detay-metin">{r.cozum.not}</p>}
            <Imza personel={r.cozum.personel} tarih={tarihYaz(r.cozum.tarih)} />
          </Kutu>
        )}

        {/* ------------------------------------------ PAKSAN'dan notlar

            Kargo takip numarası gibi sonradan eklenen bilgiler. Her
            biri müşteriye bildirim olarak da gitti; burada kalıcı
            duruyor ki bildirim kaybolsa da bulunabilsin. */}
        {notlar.length > 0 && (
          <>
            <div className="sectionhead" style={{ marginTop: 22 }}>
              <h2>{t('talepDetay.notlar')}</h2>
            </div>
            <div className="stack">
              {notlar.map((n, i) => (
                <div key={i} className="card" style={{ padding: 16 }}>
                  <p className="detay-metin" style={{ marginTop: 0 }}>{n.metin}</p>
                  <Imza personel={n.personel} tarih={tarihYaz(n.tarih)} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* --------------------------------------------------------- Ödeme

            Yedek parçada müşteri parayı önden gönderiyor; onaylanıp
            onaylanmadığını görebilmeli. */}
        {r.tur === 'parca' && r.fatura && (
          <>
            <div className="sectionhead" style={{ marginTop: 22 }}>
              <h2>{t('talepDetay.odemeBaslik')}</h2>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div
                className={'badge badge--' + (r.odemeOnay ? 'green' : 'orange')}
                style={{ marginBottom: 12 }}
              >
                {r.odemeOnay ? t('talepDetay.odemeOnayli') : t('talepDetay.odemeBekliyor')}
              </div>
              <Satir
                k={t('talepDetay.faturaAdi')}
                v={r.fatura.tuzel ? r.fatura.unvan : r.fatura.ad}
              />
              <Satir
                k={r.fatura.tuzel ? t('parcaOdeme.vergiNo') : t('parcaOdeme.tcNo')}
                v={gizle(r.fatura.tuzel ? r.fatura.vergiNo : r.fatura.tc)}
                mono
              />
              <Satir k={t('talepDetay.teslimatAdresi')} v={r.fatura.adres} />
              {r.odemeOnay?.tarih && (
                <Imza personel={r.odemeOnay.personel} tarih={tarihYaz(r.odemeOnay.tarih)} />
              )}
            </div>
          </>
        )}

        {/* ------------------------------------------------- Talebin kendisi */}
        <div className="sectionhead" style={{ marginTop: 22 }}>
          <h2>{t('talepDetay.talebiniz')}</h2>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <Satir k={t('talepDetay.acildi')} v={tarihYaz(r.createdAt)} />
          {urun && (
            <>
              <Satir k={t('talepDetay.makine')} v={urun.name} />
              <Satir k={t('talepDetay.seriNo')} v={formatSerial(r.makine.serial)} mono />
            </>
          )}
          {teklifUrun && <Satir k={t('talepDetay.ilgilenilen')} v={teklifUrun.name} />}
          <Satir
            k={t('talepDetay.belirtiler')}
            v={(r.belirtiler || []).map((x) => alanEtiketi(x, dil)).join(' · ')}
          />
          <Satir k={t('talepDetay.parcalar')} v={parcaYazisi(r, dil)} />
          <Satir k={t('talepDetay.aranmaTercihi')} v={r.ulasim} />
          {r.aciklama && <p className="detay-metin">{r.aciklama}</p>}
          {r.ses?.veri && (
            <div className="row small muted" style={{ gap: 5, marginTop: 8 }}>
              <IconMic size={15} /> {t('profil.sesEklendi')}
            </div>
          )}
          {r.ekler?.length > 0 && <Ekler ekler={r.ekler} />}
        </div>

        {/* --------------------------------------------------------- Geçmiş */}
        {r.gecmis?.length > 0 && (
          <>
            <div className="sectionhead" style={{ marginTop: 22 }}>
              <h2>{t('talepDetay.gecmis')}</h2>
            </div>
            <div className="card" style={{ padding: '18px 16px' }}>
              <div className="cizelge">
                <div className="cizelge__a">
                  <div className="cizelge__ad">{t('talepDurum.yeni')}</div>
                  <div className="small muted">{tarihYaz(r.createdAt)}</div>
                </div>
                {r.gecmis.map((g, i) => (
                  <div
                    key={i}
                    className={
                      'cizelge__a' + (i === r.gecmis.length - 1 ? ' cizelge__a--son' : '')
                    }
                  >
                    <div className="cizelge__ad">{t('talepDurum.' + g.durum)}</div>
                    <div className="small muted">{tarihYaz(g.tarih)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="stack" style={{ marginTop: 22 }}>
          <a className="btn btn--soft" {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}>
            <IconPhone size={20} /> {t('talepDetay.paksaniAra')}
          </a>
        </div>
      </div>

      <TabBar />
    </div>
  )
}

/* ------------------------------------------------------------ Parçalar */

function DurumIkon({ durum }) {
  const Ikon =
    durum === 'iptal' ? IconClose
      : durum === 'planlandi' ? IconCalendar
      : durum === 'teklif' ? IconCart
      : durum === 'incelemede' ? IconWrench
      : IconCheckCircle
  return (
    <span className="durum-kart__ikon">
      <Ikon size={24} />
    </span>
  )
}

function Kutu({ ad, ton, children }) {
  return (
    <div className={'card detay-kutu detay-kutu--' + ton} style={{ marginTop: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{ad}</div>
      {children}
    </div>
  )
}

function Satir({ k, v, mono, vurgu }) {
  if (!v) return null
  return (
    <div className="detay-satir">
      <span className="small muted">{k}</span>
      <span className={(mono ? 'serial-mono' : '') + (vurgu ? ' detay-satir__vurgu' : '')}>
        {v}
      </span>
    </div>
  )
}

function Imza({ personel, tarih }) {
  if (!personel && !tarih) return null
  return (
    <div className="small muted" style={{ marginTop: 10 }}>
      {[personel, tarih].filter(Boolean).join(' · ')}
    </div>
  )
}

/* "Pikap dişi × 2 · Düğüm atıcı bıçağı" */
function parcaYazisi(r, dil) {
  return (r.parcalar || [])
    .map((x) => {
      const adet = r.parcaAdet?.[x]
      return alanEtiketi(x, dil) + (adet > 1 ? ' × ' + adet : '')
    })
    .join(' · ')
}

/* Kimlik ve vergi numarası ekranda tam yazılmıyor.

   Müşteri kendi numarasını zaten biliyor; ekranda tam görünmesinin tek
   sonucu, telefonu birinin eline geçtiğinde okunabilir olması. Son dört
   hane, doğru numarayı gönderdiğini teyit etmeye yetiyor. */
function gizle(numara) {
  const s = String(numara || '')
  if (s.length < 5) return s
  return '•'.repeat(s.length - 4) + s.slice(-4)
}

/* Talebe eklenen fotoğraflar. Dosyanın kendisi IndexedDB'de duruyor;
   burada geçici adresler üretilip ekranda gösteriliyor ve ekrandan
   çıkarken bırakılıyor — yoksa hafızada birikirler. */
function Ekler({ ekler }) {
  const [adresler, setAdresler] = useState([])

  useEffect(() => {
    let gecerli = true
    const uretilen = []

    Promise.all(
      ekler
        .filter((e) => e.tur === 'foto')
        .map(async (e) => {
          const a = await ekAdresi(e.id)
          if (a) uretilen.push(a)
          return a
        })
    ).then((liste) => {
      if (gecerli) setAdresler(liste.filter(Boolean))
      else uretilen.forEach((a) => URL.revokeObjectURL(a))
    })

    return () => {
      gecerli = false
      uretilen.forEach((a) => URL.revokeObjectURL(a))
    }
  }, [ekler])

  if (!adresler.length) return null

  return (
    <div className="detay-ekler">
      {adresler.map((a, i) => (
        <img key={i} src={a} alt="" />
      ))}
    </div>
  )
}

/* Son durum değişikliğinin zamanı — kartın üstünde "ne zaman oldu" */
function sonDegisim(r) {
  const g = r.gecmis || []
  return g.length ? g[g.length - 1].tarih : null
}
