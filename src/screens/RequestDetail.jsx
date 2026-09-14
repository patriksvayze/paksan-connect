import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { useDil } from '../i18n'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { EkAlani } from '../components/EkAlani'
import { SesKaydi } from '../components/SesKaydi'
import { eklemeOlustur, eklemeleri, eklemeYapilabilir } from '../lib/talepEkleme'
import { getProduct, urunDilde } from '../marka'
import { alanEtiketi } from '../data/talepAlanlari'
import { formatSerial } from '../lib/serial'
import { servisleriGetir } from '../marka'
import { PARA_BIRIMI, paraYaz } from '../marka'
import { talepTuru } from '../lib/talep'
import { talebinParcalari } from '../lib/servisKaydi'
import { ekAdresi } from '../lib/ekler'
import { SIRKET } from '../marka'
import { araProps, telFirma } from '../lib/tel'
import {
  IconCalendar, IconCheckCircle, IconClose, IconCart, IconMic,
  IconPhone, IconWrench, IconInfo, IconPlus, IconAlert,
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

/* TUTARIN YANINDA PARA BİRİMİ.

   Teklif tutarı ve satış fiyatı backoffice'te binlik ayraçlı yazı
   olarak saklanıyor ("2.600.000") ve müşterinin ekranında birimsiz
   çıkıyordu: "Satış fiyatı 2.600.000". Sayı tek başına para tutarını
   belirtmiyor. Yalnız sayıdan oluşan değerlere birim ekleniyor;
   "Garanti kapsamında" gibi yazılara dokunulmuyor. */
function paraliYaz(deger) {
  const s = String(deger ?? '').trim()
  if (!s) return ''
  return /^[\d.\s]+$/.test(s) ? `${s} ${PARA_BIRIMI}` : s
}

export default function RequestDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { requests, updateRequest, showToast } = useApp()
  const { t, dil } = useDil()

  /* Sonradan ekleme penceresi ve içindeki alanlar. */
  const [eklemePenceresi, setEklemePenceresi] = useState(false)
  const [yeniNot, setYeniNot] = useState('')
  const [yeniSes, setYeniSes] = useState(null)
  const [yeniEkler, setYeniEkler] = useState([])
  const [eklemeHata, setEklemeHata] = useState('')
  /* "Sorun devam ediyor" penceresi ve içindeki açıklama. */
  const [devamPenceresi, setDevamPenceresi] = useState(false)
  const [devamNot, setDevamNot] = useState('')

  const r = requests.find((x) => x.id === id)
  const yerel = dil === 'tr' ? 'tr-TR' : 'en-GB'

  /* Talebi yürüten servis. Talepte yalnız kimliği ve adı yazıyor;
     telefonu servis listesinden okunuyor — o liste zaten uygulamanın
     içinde (bkz. Servisler ekranı). */
  const servis =
    r?.sahip === 'servis' && r?.servis?.id
      ? servisleriGetir().find((b) => b.id === r.servis.id) || null
      : null

  const sonrakiler = eklemeleri(r)

  /* Talebin şimdiye kadar kullandığı medya: ilk gönderimin ekleri artı
     bütün sonraki eklemelerinki. Sınır talep başına sayıldığı için
     ekleme formu bunu bilmek zorunda. */
  const kullanilanEkler = [
    ...(r?.ekler || []),
    ...sonrakiler.flatMap((e) => e.ekler || []),
  ]
  const eklenebilir = eklemeYapilabilir(r)

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
      {/* Başlık SÖZLÜKTEN geliyor. `talepTuru(...).ad` Türkçe sabit;
          İngilizce kullanan müşteri ekranın tepesinde "Servis talebi"
          görüyordu. Renk (`ton`) dilden bağımsız olduğu için o hâlâ
          oradan alınıyor. */}
      <TopBar title={t(`talep.${r.tur}.adi`)} sub={r.no} back="auto" />

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

        {/* ---------------------------------------------- Talebi alan bayi

            Fiyat teklifi bayiye atandığında müşterinin bilmesi gereken
            tek şey: kim arayacak ve numarası ne. Tanımadığı bir
            numaradan gelen aramayı beklemesin. */}
        {r.bayi && (
          <Kutu ad={t('talepDetay.bayiBaslik')} ton="mor">
            <div style={{ fontWeight: 800, fontSize: 16 }}>{r.bayi.ad}</div>
            <p className="detay-metin">{t('talepDetay.bayiAlt')}</p>
            {r.bayi.tel && (
              <a
                className="btn btn--soft btn--sm"
                style={{ marginTop: 10 }}
                {...araProps(r.bayi.tel, telFirma(r.bayi.tel), showToast)}
              >
                <IconPhone size={18} /> {telFirma(r.bayi.tel)}
              </a>
            )}
          </Kutu>
        )}

        {r.teklif && (
          <Kutu ad={t('talepDetay.teklifBaslik')} ton="mor">
            <Satir k={t('talepDetay.teklifTutar')} v={paraliYaz(r.teklif.tutar)} vurgu />
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


        {r.cozum && (
          <Kutu
            ad={r.tur === 'satinalma' ? t('talepDetay.sonucBaslik') : t('talepDetay.yapilanIs')}
            ton="yesil"
          >
            {r.cozum.yapilanIs && <p className="detay-metin">{r.cozum.yapilanIs}</p>}
            <Satir k={t('talepDetay.degisenParca')} v={r.cozum.parcalar} />
            <Satir k={t('talepDetay.ucret')} v={r.cozum.ucret} vurgu />
            {/* Seçenekler kayda HER ZAMAN Türkçe yazılıyor (bkz.
                data/talepAlanlari.js); ekranda kullanıcının dilinde
                görünmeleri gerekiyor. Belirtiler ve parçalar zaten
                çevriliyordu, bu üç alan atlanmıştı. */}
            <Satir k={t('talepDetay.sonuc')} v={alanEtiketi(r.cozum.sonuc, dil)} />
            <Satir k={t('talepDetay.satisFiyati')} v={paraliYaz(r.cozum.satisFiyati)} vurgu />
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
          <Parcalar r={r} dil={dil} t={t} />
          <Satir k={t('talepDetay.aranmaTercihi')} v={alanEtiketi(r.ulasim, dil)} />
          {r.aciklama && <p className="detay-metin">{r.aciklama}</p>}
          {r.ses?.veri && (
            <div className="row small muted" style={{ gap: 5, marginTop: 8 }}>
              <IconMic size={15} /> {t('profil.sesEklendi')}
            </div>
          )}
          {r.ekler?.length > 0 && <Ekler ekler={r.ekler} />}
        </div>

        {/* ------------------------------------------- Sonradan eklenenler

            İlk gönderimin ekleri YUKARIDA, talebin kendi kartının
            içinde. Buraya yalnız sonradan eklenenler geliyor: ayrı
            başlık, ayrı kart, her birinde zaman damgası. İkisi
            karışmasın diye kasıtlı olarak ayrı duruyorlar. */}
        {sonrakiler.length > 0 && (
          <>
            <div className="sectionhead" style={{ marginTop: 22 }}>
              <h2>{t('talepDetay.eklemeBaslik')}</h2>
              <span className="sectionhead__count">{sonrakiler.length}</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {sonrakiler.map((e) => (
                <div key={e.id} className="card ekleme">
                  <div className="ekleme__tarih">{tarihYaz(e.tarih)}</div>
                  {e.not && <p className="detay-metin" style={{ marginTop: 8 }}>{e.not}</p>}
                  {e.ses?.veri && (
                    <div className="row small muted" style={{ gap: 5, marginTop: 8 }}>
                      <IconMic size={15} /> {t('profil.sesEklendi')}
                    </div>
                  )}
                  {e.ekler?.length > 0 && <Ekler ekler={e.ekler} />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Ekleme düğmesi. Kapalı talepte yerine sebebi yazıyor:
            kapanan talebe kimse bakmıyor, oraya yazılan kimseye
            ulaşmaz (bkz. src/lib/talepEkleme.js). */}
        {eklenebilir ? (
          <button
            className="btn btn--soft"
            style={{ marginTop: 16 }}
            onClick={() => {
              setEklemeHata('')
              setEklemePenceresi(true)
            }}
          >
            <IconPlus size={18} /> {t('talepDetay.eklemeYap')}
          </button>
        ) : (
          /* Kapanmış SERVİS talebinde "yeni talep açın" demek artık
             yanlış: aşağıda aynı talebi geri açan bir düğme var ve
             doğru yol o. İki yazı birbiriyle çelişmemeli. */
          <p className="small muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
            {t(
              r.tur === 'servis' && durum === 'kapandi'
                ? 'talepDetay.eklemeKapaliServis'
                : 'talepDetay.eklemeKapali',
            )}
          </p>
        )}

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

        {/* ARAMA DÜĞMESİ ÖNCE HEP PAKSAN'I ARIYORDU.

            Oysa talep servise düştüyse işi yapan servis: randevuyu o
            veriyor, makineye o gidiyor, kapanışı o yazıyor. Müşteriye
            "PAKSAN Ara" demek, işi yapanı atlayıp merkeze yönlendirmek
            demekti. Şimdi talep servisteyken önce servis çıkıyor; PAKSAN
            üst basamak olarak altında duruyor.

            Talep PAKSAN'a devredilmişse (`sahip: 'paksan'`) servis
            düğmesi çıkmıyor — o işi artık servis yürütmüyor. */}
        {/* ================================= Sorun devam ediyor

            KAPANAN İŞ HER ZAMAN BİTMİŞ İŞ DEĞİL. Servis geliyor,
            yapıyor, talebi kapatıyor; makine ertesi gün aynı şeyi
            yapıyor. Bugüne kadar çiftçinin tek yolu sıfırdan yeni bir
            talep açmaktı ve o talep ilk işle bağlantısız oluyordu:
            servis aynı arızaya ikinci kez ilk kez bakıyormuş gibi
            gidiyordu.

            Düğme AYNI TALEBİ geri açıyor. Yapılan iş, değişen parça ve
            servis geçmişi olduğu yerde kalıyor; üstüne "sorun devam
            ediyor" satırı yazılıyor. Servis ne yaptığını görerek
            gidiyor.

            YALNIZ SERVİS TALEBİNDE VE YALNIZ KAPANDIYSA. İptal edilmiş
            talepte yapılmış bir iş yok; parça talebinde de "sorun"
            diye bir şey yok, parça geldi ya da gelmedi. */}
        {r.tur === 'servis' && durum === 'kapandi' && (
          <div className="card" style={{ marginTop: 22, padding: 16 }}>
            <div className="card__title">{t('talepDetay.devamBaslik')}</div>
            <div className="card__sub" style={{ marginTop: 4, lineHeight: 1.6 }}>
              {t('talepDetay.devamAlt')}
            </div>
            <button
              className="btn btn--orange"
              style={{ marginTop: 14 }}
              onClick={() => setDevamPenceresi(true)}
            >
              <IconAlert size={20} /> {t('talepDetay.devamDugme')}
            </button>
          </div>
        )}

        {/* Geri açıldıysa en son ne yazıldığı burada duruyor. */}
        {(r.tekrar || []).length > 0 && durum !== 'kapandi' && (
          <Kutu ad={t('talepDetay.devamBildirildi')} ton="turuncu">
            {r.tekrar.map((x, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                {x.aciklama && <p className="detay-metin">{x.aciklama}</p>}
                <div className="small muted">{tarihYaz(x.tarih)}</div>
              </div>
            ))}
          </Kutu>
        )}

        <div className="stack" style={{ marginTop: 22 }}>
          {servis?.tel && (
            <a
              className="btn btn--soft"
              {...araProps(servis.tel, telFirma(servis.tel), showToast)}
            >
              <IconPhone size={20} /> {t('talepDetay.servisiAra')}
            </a>
          )}
          {servis?.ad && (
            <div className="small muted" style={{ textAlign: 'center' }}>
              {servis.ad}
            </div>
          )}
          <a className="btn btn--soft" {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}>
            <IconPhone size={20} /> {t('talepDetay.markayiAra')}
          </a>
        </div>
      </div>

      {/* --------------------------------------------- Ekleme penceresi

          Not, ses ve dosya TEK kayıtta gidiyor: çiftçi bir kere
          "ekleme yap" diyor, elindeki her şeyi koyuyor, tek zaman
          damgası alıyor (bkz. src/lib/talepEkleme.js). */}
      <Sheet
        open={eklemePenceresi}
        onClose={() => setEklemePenceresi(false)}
        title={t('talepDetay.eklemeYap')}
      >
        <div className="stack" style={{ gap: 16 }}>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.6 }}>
            {t('talepDetay.eklemeAciklama')}
          </p>

          <label className="field">
            <span className="field__label">{t('talepDetay.eklemeNot')}</span>
            <textarea
              className="textarea"
              value={yeniNot}
              onChange={(e) => setYeniNot(e.target.value)}
              placeholder={t('talepDetay.eklemeNotIpucu')}
            />
          </label>

          <SesKaydi ses={yeniSes} onDegis={setYeniSes} />
          {/* Medya sınırı talep başına: ilk gönderimin ve önceki
              eklemelerin ekleri de sayıya giriyor. */}
          <EkAlani ekler={yeniEkler} onDegis={setYeniEkler} mevcut={kullanilanEkler} />

          {eklemeHata && <div className="uyari-kart">{eklemeHata}</div>}

          <button
            className="btn btn--primary"
            onClick={() => {
              const kayit = eklemeOlustur({
                not: yeniNot,
                ses: yeniSes,
                ekler: yeniEkler,
              })
              /* Boş ekleme kaydedilmiyor: personelin listesinde
                 içi boş bir satır belirmesin. */
              if (!kayit) return setEklemeHata(t('talepDetay.eklemeBos'))
              updateRequest(r.id, { eklemeler: [...(r.eklemeler || []), kayit] })
              setYeniNot('')
              setYeniSes(null)
              setYeniEkler([])
              setEklemeHata('')
              setEklemePenceresi(false)
              showToast(t('talepDetay.eklemeAlindi'))
            }}
          >
            {t('talepDetay.eklemeGonder')}
          </button>
        </div>
      </Sheet>

      {/* --------------------------------- Sorun devam ediyor penceresi

          Açıklama İSTEĞE BAĞLI. Zorunlu tutmak, yazmak istemeyen
          çiftçiyi bildirimden vazgeçiriyor; boş bir bildirim bile
          servise "bu iş bitmedi" demeye yetiyor. */}
      <Sheet
        open={devamPenceresi}
        onClose={() => setDevamPenceresi(false)}
        title={t('talepDetay.devamBaslik')}
      >
        <div className="stack" style={{ gap: 16 }}>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.6 }}>
            {t('talepDetay.devamAciklama')}
          </p>

          <label className="field">
            <span className="field__label">{t('talepDetay.devamNot')}</span>
            <textarea
              className="textarea"
              value={devamNot}
              onChange={(e) => setDevamNot(e.target.value)}
              placeholder={t('talepDetay.devamNotIpucu')}
            />
          </label>

          <button
            className="btn btn--orange"
            onClick={() => {
              const kayit = { tarih: Date.now(), aciklama: devamNot.trim() }
              updateRequest(r.id, {
                status: 'yeni',
                tekrar: [...(r.tekrar || []), kayit],
                gecmis: [...(r.gecmis || []), { durum: 'yeni', tarih: kayit.tarih }],
              })
              setDevamNot('')
              setDevamPenceresi(false)
              showToast(t('talepDetay.devamAlindi'))
            }}
          >
            {t('talepDetay.devamGonder')}
          </button>
        </div>
      </Sheet>

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

/* ------------------------------------------------- İstenen parçalar

   KAYITTAKİ FİYAT GÖRÜNTÜSÜ OKUNUYOR, CANLI LİSTE DEĞİL.

   Müşterinin havale ettiği tutar talebin içinde duruyor: `parcaFiyat`
   satırları, ara toplamı, KDV'si ve toplamıyla birlikte kaydın içine
   yazılıyor (bkz. lib/parcaKatalogu.js → fiyatGoruntusu). Fiyat listesi
   değişiyor; bu ekran canlı listeden yeniden hesaplasa, müşterinin
   gönderdiği rakam aylar sonra başka görünürdü. Burada gösterilen tutar
   her zaman o günün görüntüsündeki tutardır.

   KOD AD İLE BİRLİKTE YAZIYOR. PAKSAN'ın kataloğunda tekrar eden parça
   adları var; parçayı ayırt eden şey kod. Müşteri telefonu açtığında ya
   da havale açıklamasını yazarken de kodu söylüyor — ödeme adımında
   gördüğü satırın aynısı burada duruyor.

   ESKİ KAYITLARDA GÖRÜNTÜ YOK. Katalog bağlanmadan önce açılmış
   talepler ile "Diğer" yolundan gelen talepler yalnız ad (ve eski
   kayıtlarda ada göre anahtarlanmış adet) taşıyor. O satırlara kod ya
   da tutar UYDURULMUYOR; eski biçimde, tek satır yazı olarak
   gösteriliyor.

   PARÇA TABLOSU BİLEŞENİ BURADA KULLANILMIYOR
   (components/ParcaTablosu.jsx): biçimi yalnız backoffice.css içinde
   tanımlı ve sütun başlıkları tek dilli. Müşteri uygulamasında ödeme
   adımındaki satır düzeni tekrarlanıyor; müşteri aynı listeyi iki
   ekranda aynı biçimde görüyor. */
function Parcalar({ r, dil, t }) {
  const gorunti = r.parcaFiyat
  const satirlar = (gorunti?.satirlar || []).filter((s) => s?.ad && Number(s.adet) > 0)

  /* Görüntüsü olmayan kayıt: eski ad/adet alanları. */
  if (!satirlar.length) {
    return <Satir k={t('talepDetay.parcalar')} v={parcaYazisi(r, dil)} />
  }

  const araToplam = Number(gorunti.araToplam) || 0
  const kdv = Number(gorunti.kdv) || 0
  /* KDV oranı görüntüde yazmıyor; uygulanmış tutardan geri hesaplanıyor.
     Böylece oran sonradan değişse bile eski kayıt kendi oranını yazıyor. */
  const kdvOran = araToplam > 0 ? Math.round((kdv / araToplam) * 100) : 0
  /* Yarım toplam gösterilmiyor: fiyatı bulunamayan kalem varsa müşteri
     eksik havale eder. Ödeme adımı da aynı kuralla davranıyor. */
  const tutarGosterilir = !gorunti.eksikFiyat && araToplam > 0

  return (
    <>
      <div className="eyebrow" style={{ marginTop: 12, marginBottom: 6 }}>
        {t('talepDetay.parcalar')}
      </div>
      {satirlar.map((s, i) => (
        <div className="detay-satir" key={(s.kod || s.ad) + i}>
          <span>
            {s.ad}
            <span
              className="small muted serial-mono"
              style={{ display: 'block', marginTop: 2 }}
            >
              {[s.kod, Number(s.adet) > 1 ? '× ' + s.adet : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="detay-satir__vurgu">
            {s.tutar === null || s.tutar === undefined
              ? '—'
              : `${paraYaz(s.tutar)} ${PARA_BIRIMI}`}
          </span>
        </div>
      ))}

      {tutarGosterilir ? (
        <div className="tutar-kutu" style={{ marginTop: 12 }}>
          <div className="tutar-kutu__satir">
            <span>{t('parcaFiyat.araToplam')}</span>
            <span>{paraYaz(araToplam)} {PARA_BIRIMI}</span>
          </div>
          {kdv > 0 && (
            <div className="tutar-kutu__satir">
              <span>{t('parcaFiyat.kdv', { oran: kdvOran })}</span>
              <span>{paraYaz(kdv)} {PARA_BIRIMI}</span>
            </div>
          )}
          <div className="tutar-kutu__satir tutar-kutu__satir--toplam">
            <span>{t('parcaFiyat.gonderilecek')}</span>
            <span>{paraYaz(Number(gorunti.toplam) || 0)} {PARA_BIRIMI}</span>
          </div>
        </div>
      ) : (
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          {t('parcaSec.tutarYok')}
        </p>
      )}
    </>
  )
}

/* "Pikap dişi × 2 · Düğüm atıcı bıçağı" — fiyat görüntüsü olmayan
   kayıtlar için.

   ADET BURADA ARANMIYOR, ORTAK OKUYUCUDAN GELİYOR
   (bkz. lib/servisKaydi.js → talebinParcalari). Önceden talebin ad
   listesi üzerinde `parcaAdet[ad]` ile aranıyordu; adet koda göre
   anahtarlanmış bir kayıtta o arama boş dönüyor ve her satır adetsiz
   çıkıyordu. Aynı okuma servis uygulamasının üç ekranında da vardı ve
   tek yere toplandı.

   Bulunamayan adet yine yazılmıyor: ortak okuyucu bulamadığında 1
   varsayıyor, 1 de yazılmıyor. Yanlış adet yazmaktansa yazmamak. */
function parcaYazisi(r, dil) {
  return talebinParcalari(r)
    .filter((x) => x.ad)
    .map((x) => alanEtiketi(x.ad, dil) + (x.adet > 1 ? ' × ' + x.adet : ''))
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
