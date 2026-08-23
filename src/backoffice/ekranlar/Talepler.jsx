import { useEffect, useMemo, useState } from 'react'
import {
  DURUMLAR, durumBilgi, gecikmisMi, KAPALI_DURUMLAR, musterininDigerTalepleri,
  odemeOnayla, parcaIlerlemeEngeli, rolBilgi, rolunTalepleri, TALEP_ADI,
  talepDurumDegistir,
  talepDurumlari, talepGonderildi, talepIptal, talepKapat, talepleriGetir,
  talepNotEkle, talepPlanla, talepTeklifVer, teklifBeklemeGunu, teklifBekliyorMu,
  TEKLIF_BEKLEME_GUN,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, Bekleme, Bos, DurumRozet, saatYaz, siraliListe, SiraliBaslik,
  tarihSaat, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { Dekont, Ekler } from './Ekler'
import { getProduct } from '../../data/products'
import { formatSerial, warrantyStatus } from '../../lib/serial'
import { MAKINE_DURUMU, PARCA_ACELE } from '../../data/talepAlanlari'
import { BANKA } from '../../config'
import { talebinBayileri, yetkiAdi } from '../../data/bayiler'
import { PARA_BIRIMI, parcaToplami, paraYaz } from '../../data/parcaFiyat'

/* Talepler.

   Solda liste, sağda seçilen talebin tamamı. Herkes kendi işini görüyor:
   servisçi servis taleplerini, yedek parçacı parça taleplerini, satışçı
   fiyat tekliflerini. Admin ve yönetici hepsini görüyor ve türe göre
   süzebiliyor. */

export function Talepler({ personel, rol, bildir, tazele, surum, sorgu }) {
  const [durum, setDurum] = useState('acik')
  const [tur, setTur] = useState('hepsi')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [il, setIl] = useState('hepsi')
  const [ilce, setIlce] = useState('hepsi')
  const [makine, setMakine] = useState('hepsi')
  const [ara, setAra] = useState('')
  const [secili, setSecili] = useState(null)

  /* Dashboard'dan süzgeçle gelindiğinde ("48 saati geçen" kutusu,
     grafikteki bir gün) o süzgeç buraya kuruluyor. */
  useEffect(() => {
    if (!sorgu) return
    setDurum(sorgu.durum ?? 'hepsi')
    setTur(sorgu.tur ?? 'hepsi')
    setAralik(sorgu.aralik ?? BOS_ARALIK)
    setIl(sorgu.il ?? 'hepsi')
    setIlce('hepsi')
    setMakine(sorgu.makine ?? 'hepsi')
    setAra(sorgu.ara ?? '')
    setSecili(null)
  }, [sorgu])

  const { veri: kendiTalepleri, yukleniyor } = useVeri(
    () => rolunTalepleri(talepleriGetir(), rol),
    [surum, rol],
    []
  )

  const tumTurler = rolBilgi(rol).talepTuru === null

  /* Süzgeç seçenekleri elimizdeki kayıtlardan çıkarılıyor; boş il
     listelemenin anlamı yok. */
  const iller = [...new Set(kendiTalepleri.map((t) => t.il).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'tr')
  )
  const ilceler = [
    ...new Set(
      kendiTalepleri
        .filter((t) => il === 'hepsi' || t.il === il)
        .map((t) => t.ilce)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))
  const makineler = [
    ...new Set(
      kendiTalepleri
        .filter((t) => t.makine)
        .map((t) => getProduct(t.makine.productId)?.name)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  /* Açılışta en yeni talep üstte — personelin ilk baktığı şey bu.
     Başka bir sıra gerektiğinde sütun başlığından değiştiriliyor. */
  const { siralama, cevir } = useSiralama('createdAt', 'azalan')

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    return kendiTalepleri.filter((t) => {
      const d = t.status || 'yeni'
      if (durum === 'acik' && KAPALI_DURUMLAR.includes(d)) return false
      if (durum === 'gecikmis' && !gecikmisMi(t)) return false
      if (durum === 'teklifBekleyen' && !teklifBekliyorMu(t)) return false
      if (
        durum !== 'acik' && durum !== 'gecikmis' && durum !== 'teklifBekleyen' &&
        durum !== 'hepsi' && d !== durum
      ) {
        return false
      }
      if (tumTurler && tur !== 'hepsi' && t.tur !== tur) return false
      if (!araliktaMi(t.createdAt, aralik)) return false
      if (il !== 'hepsi' && t.il !== il) return false
      if (ilce !== 'hepsi' && t.ilce !== ilce) return false
      if (makine !== 'hepsi') {
        const ad = t.makine ? getProduct(t.makine.productId)?.name : null
        if (ad !== makine) return false
      }
      if (!q) return true

      /* Parça arama: telefonun son 6 hanesi, talep numarasının bir
         bölümü, seri numarasının sonu — hepsi bulunmalı. Rakamlar
         ayrıca boşluksuz hâliyle de karşılaştırılıyor, yoksa
         "1415057" araması "549 141 50 57" numarasını bulamıyordu. */
      const alanlar = [t.no, t.ad, t.tel, t.il, t.ilce, t.makine?.serial, t.aciklama]
      if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
        return true
      }
      const qRakam = q.replace(/\D/g, '')
      if (!qRakam) return false
      return [t.no, t.tel, t.telHam, t.makine?.serial]
        .filter(Boolean)
        .some((x) => String(x).replace(/\D/g, '').includes(qRakam))
    })
  }, [kendiTalepleri, durum, tur, aralik, il, ilce, makine, ara, tumTurler])

  /* Sıralama süzgeçten SONRA: ekranda ne varsa o sıralanıyor.
     Değer fonksiyonları sıralamanın neye baktığını söylüyor —
     "Tarih / Saat" sütunu ekranda yazı gösteriyor ama zaman
     damgasına göre sıralanıyor. */
  const liste = useMemo(
    () =>
      siraliListe(suzulmus, siralama, {
        no: (t) => t.no,
        ad: (t) => t.ad,
        makine: (t) => (t.makine ? getProduct(t.makine.productId)?.name : null),
        tel: (t) => t.tel,
        createdAt: (t) => t.createdAt,
        status: (t) => DURUMLAR.findIndex((d) => d.id === (t.status || 'yeni')),
      }),
    [suzulmus, siralama]
  )

  const acik = secili ? kendiTalepleri.find((t) => t.id === secili) : null

  return (
    <>
      <Baslik
        ad={'Talepler · ' + rolBilgi(rol).ad}
        sag={
          <DisaAktar
            ad="Talepler"
            basliklar={AKTAR_BASLIK}
            satirlar={liste.map(aktarSatiri)}
            personel={personel}
          />
        }
      />

      <SuzgecCubugu>
        <Secim
          ad="Durum"
          deger={durum}
          onDegis={setDurum}
          secenekler={[
            { deger: 'acik', ad: 'Açık olanlar' },
            { deger: 'gecikmis', ad: 'Gecikmiş talepler' },
            { deger: 'teklifBekleyen', ad: 'Cevap bekleyen teklifler' },
            ...DURUMLAR.map((d) => ({ deger: d.id, ad: d.ad })),
            { deger: 'hepsi', ad: 'Hepsi' },
          ]}
          genislik={165}
        />

        <Secim
          ad="Talep Türü"
          deger={tumTurler ? tur : rolBilgi(rol).talepTuru}
          onDegis={setTur}
          secenekler={
            tumTurler
              ? [
                  { deger: 'hepsi', ad: 'Her tür' },
                  ...Object.entries(TALEP_ADI).map(([k, ad]) => ({ deger: k, ad })),
                ]
              : [
                  {
                    deger: rolBilgi(rol).talepTuru,
                    ad: TALEP_ADI[rolBilgi(rol).talepTuru],
                  },
                ]
          }
          genislik={150}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        <Secim
          ad="İl"
          deger={il}
          onDegis={(x) => {
            setIl(x)
            setIlce('hepsi')
          }}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm iller' },
            ...iller.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={140}
        />

        <Secim
          ad="İlçe"
          deger={ilce}
          onDegis={setIlce}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm ilçeler' },
            ...ilceler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={140}
        />

        <Secim
          ad="Makine"
          deger={makine}
          onDegis={setMakine}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm makineler' },
            ...makineler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={170}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Talep no, ad, telefon, seri no"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} kayıt</span>
      </SuzgecCubugu>

      <div className="ikili">
        <div className="kart">
          {yukleniyor ? (
            <Bekleme satir={5} />
          ) : liste.length === 0 ? (
            <Bos metin="Talep yok." />
          ) : (
            <div className="tablo-sar">
              <table className="tablo--esit">
                <thead>
                  <tr>
                    <SiraliBaslik ad="Talep" alan="no" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Müşteri" alan="ad" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Makine" alan="makine" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Telefon" alan="tel" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik
                      ad="Tarih / saat"
                      alan="createdAt"
                      siralama={siralama}
                      onSirala={cevir}
                    />
                    <SiraliBaslik ad="Durum" alan="status" siralama={siralama} onSirala={cevir} />
                  </tr>
                </thead>
                <tbody>
                  {liste.map((t) => {
                    const p = t.makine ? getProduct(t.makine.productId) : null
                    return (
                      <tr
                        key={t.id}
                        className={'tiklanir' + (secili === t.id ? ' secili' : '')}
                        onClick={() => setSecili(t.id)}
                      >
                        <td>
                          <div className="mono">
                            {gecikmisMi(t) && <Gecikme />}
                            {teklifBekliyorMu(t) && <TeklifBekliyor talep={t} />}
                            {t.no}
                          </div>
                          <TurEtiket tur={t.tur} />
                        </td>
                        <td>
                          <div>{t.ad || '—'}</div>
                          <div className="kucuk sonuk">
                            {t.ilce ? `${t.ilce} / ${t.il}` : t.il || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="kucuk">{p?.name || '—'}</div>
                          {t.makine?.serial && (
                            <div className="kucuk sonuk mono">{formatSerial(t.makine.serial)}</div>
                          )}
                        </td>
                        <td className="kucuk mono">{t.tel || '—'}</td>
                        {/* "3 saat önce" yerine tarih ve saat.

                            Göreli süre okunması kolay ama iş görmüyor:
                            müşteri telefonda "salı sabahı aramıştım"
                            diyor, personelin ekranında "2 gün önce"
                            yazıyor ve eşleştiremiyor. Kayıt tutulan bir
                            sistemde saat, sürenin kendisinden daha
                            değerli. */}
                        <td className="kucuk">
                          <div>{tarihYaz(t.createdAt, false)}</div>
                          <div className="sonuk">{saatYaz(t.createdAt)}</div>
                        </td>
                        <td><DurumRozet durum={t.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="kart">
          {acik ? (
            /* `key` şart: başka bir talep seçildiğinde Detay'ın içindeki
               her şey sıfırlansın. Yoksa bir talepte yazılmış yarım not,
               açılmış "Tümü" görünümü ve açık form bir sonraki talebe
               taşınıyor — personel yanlış talebe not yazabiliyordu. */
            <Detay
              key={acik.id}
              talep={acik}
              hepsi={kendiTalepleri}
              personel={personel}
              rol={rol}
              tazele={tazele}
              bildir={bildir}
              onTalepSec={(id) => {
                setDurum('hepsi')
                setAralik(BOS_ARALIK)
                setAra('')
                setSecili(id)
              }}
            />
          ) : (
            <Bos metin="Soldan talep seçin." />
          )}
        </div>
      </div>
    </>
  )
}

function Detay({ talep, hepsi, personel, rol, tazele, bildir, onTalepSec }) {
  const [not, setNot] = useState('')
  /* 'kapanis' | 'plan' | 'teklif' | 'iptal' | 'gonderim' | null */
  const [form, setForm] = useState(null)
  const [onay, setOnay] = useState(null) /* onay bekleyen durum */
  const [odemeOnay, setOdemeOnay] = useState(false)

  /* Ödeme onaylanmadan ilerlenmeye çalışıldı — hangi durum istendi */
  const [odemeKapisi, setOdemeKapisi] = useState(null)
  /* Müşteriye giden not GERİ ALINAMIYOR: bildirim anında telefona
     düşüyor. İki düğme yan yana duruyor ve yanlışına basmak kolay —
     bu yüzden gönderilecek metin onay penceresinde bir kez daha
     gösteriliyor. İç notta böyle bir pencere yok, orada yanlış tıklama
     pahalı değil. */
  const [notOnay, setNotOnay] = useState(false)
  /* Müşterinin öteki talepleri: varsayılan yalnız açık olanlar,
     "Tümü" denince kapanmışlar da geliyor (bkz. madde 1). */
  const [tumDigerler, setTumDigerler] = useState(false)
  const p = talep.makine ? getProduct(talep.makine.productId) : null
  const suanki = talep.status || 'yeni'

  const garanti = talep.makine ? warrantyStatus(makineYili(talep)) : null

  const digerAcik = musterininDigerTalepleri(talep, hepsi, { yalnizAcik: true })
  const digerHepsi = musterininDigerTalepleri(talep, hepsi)
  const digerler = tumDigerler ? digerHepsi : digerAcik

  /* Kapanmış talep kapalı kalır: iş bitti, müşteriye "tamamlandı"
     bildirimi gitti. Yanlışlıkla kapatıldıysa yalnız admin geri
     açabiliyor ve o açılış müşteriye bildirilmiyor — kapandı diye
     haber alan kişiye "yeniden açıldı" demek kafa karıştırır. */
  const kapali = KAPALI_DURUMLAR.includes(suanki)
  const kilitli = kapali && rol !== 'admin'
  const sessiz = kapali /* admin geri açıyor: bildirim yok */

  /* Bazı durumlar tek tıkla değişmiyor: arkalarında müşteriye giden
     bir bilgi var ve o bilgi olmadan bildirim boş kalıyor.

       kapandı    → ne yapıldı
       planlandı  → ne zaman, ne yapılacak
       teklif     → tutar kaç
       iptal      → neden
       gönderildi → hangi kargo, takip no

     İptal daha önce tek tıkla oluyordu; müşteriye "talebiniz kapatıldı"
     diye haber gidiyor, sebebi hiçbir yerde yazmıyordu. Bildirime
     dokunan kişi hiçbir şey öğrenemiyordu. */
  function durumaGec(yeni) {
    if (kilitli) return

    /* Yedek parçada ödeme onaylanmadan ilerlenemiyor: parası gelmemiş
       siparişi hazırlamaya başlamak, sonradan geri alınması zor bir
       hata. Personel doğrudan ödeme onayına gönderiliyor. */
    if (parcaIlerlemeEngeli(talep, yeni)) return setOdemeKapisi(yeni)

    if (!kapali && yeni === 'kapandi') return setForm('kapanis')
    if (!kapali && yeni === 'planlandi') return setForm('plan')
    if (!kapali && yeni === 'teklif') return setForm('teklif')
    if (!kapali && yeni === 'gonderildi') return setForm('gonderim')
    if (!kapali && yeni === 'iptal') return setForm('iptal')
    setOnay(yeni)
  }

  function onayla() {
    talepDurumDegistir(talep, onay, personel, { bildirme: sessiz })
    const ad = durumBilgi(onay).ad
    setOnay(null)
    tazele()
    bildir(
      sessiz
        ? `${talep.no} → ${ad} · müşteriye bildirim gönderilmedi`
        : `${talep.no} → ${ad} · müşteriye bildirim gitti`
    )
  }

  /* @param {boolean} musteriye not müşterinin uygulamasına da düşsün mü */
  function notKaydet(musteriye) {
    if (not.trim().length < 2) return
    talepNotEkle(talep, not.trim(), personel, { musteriye })
    setNot('')
    tazele()
    bildir(musteriye ? 'Not müşteriye gönderildi' : 'İç not eklendi')
  }



  return (
    <>
      <div className="kart__tepe">
        <div>
          <div className="mono" style={{ fontWeight: 700 }}>{talep.no}</div>
          <div className="kucuk sonuk">
            {TALEP_ADI[talep.tur] || talep.tur} · {tarihYaz(talep.createdAt)}
          </div>
        </div>
        <span style={{ marginLeft: 'auto' }}><DurumRozet durum={talep.status} /></span>
      </div>

      <div className="kart__ic">
        {gecikmisMi(talep) && (
          <div className="uyari">
            <Gecikme />
            <span>Bu talep 48 saati geçti, hâlâ açık.</span>
          </div>
        )}

        <div className="suzgec" style={{ marginBottom: kilitli ? 8 : 20 }}>
          {talepDurumlari(talep.tur).map((d) => {
            const engel = parcaIlerlemeEngeli(talep, d.id)
            return (
              <button
                key={d.id}
                className={'cip' + (suanki === d.id ? ' cip--on' : '') + (engel ? ' cip--kilitli' : '')}
                onClick={() => durumaGec(d.id)}
                disabled={suanki === d.id || kilitli}
                title={engel ? 'Önce ödemeyi onaylayın' : undefined}
              >
                {engel && <span aria-hidden="true">🔒 </span>}
                {d.ad}
              </button>
            )
          })}
        </div>

        {kilitli && (
          <p className="kucuk sonuk" style={{ margin: '0 0 20px' }}>
            Bu talep kapandı. Yeniden açılması gerekiyorsa yöneticinize başvurun.
          </p>
        )}

        <Bolum ad="Müşteri">
          <S k="Ad Soyad" v={talep.ad} />
          <S k="Telefon" v={talep.tel} mono />
          <S k="Konum" v={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il} />
          <S k="Aranma Tercihi" v={talep.ulasim} />
        </Bolum>

        {/* Müşterinin öteki talepleri.

            ÖNCEKİ HÂLİ İKİ SORUNLUYDU:

            1) Yalnız DAHA ESKİ talepler görünüyordu. Bu, ilişkiyi tek
               yönlü yapıyordu: A'nın içinde B yazıyor ama B'nin içinde
               A yazmıyordu. Aynı müşterinin iki açık işi varsa
               ikisinden de ötekine geçilebilmeli.

            2) Kapanmışlar da listeleniyordu. Yıllar içinde biriken
               kapalı talepler bu alanı şişirip asıl işe yarayan
               bilgiyi — bu müşterinin BEKLEYEN başka işi var mı —
               görünmez yapıyordu.

            Şimdi varsayılan yalnız açık talepler; geçmişin tamamı
            "Tümü" düğmesinin ardında. */}
        {digerHepsi.length > 0 && (
          <Bolum
            ad={
              (tumDigerler ? 'Bu müşterinin tüm talepleri' : 'Aktif diğer talepler') +
              ' · ' + digerler.length
            }
            sag={
              digerHepsi.length > digerAcik.length && (
                <button className="dg dg--kucuk" onClick={() => setTumDigerler((x) => !x)}>
                  {tumDigerler ? 'Yalnız aktifler' : `Tümü · ${digerHepsi.length}`}
                </button>
              )
            }
          >
            {digerler.length === 0 ? (
              <p className="kucuk sonuk" style={{ margin: 0 }}>
                Bu müşterinin başka açık talebi yok.
              </p>
            ) : (
              digerler.map((t) => (
                <button key={t.id} className="bag-satir" onClick={() => onTalepSec(t.id)}>
                  <span className="mono">{t.no}</span>
                  <TurEtiket tur={t.tur} />
                  <span className="kucuk sonuk">{tarihYaz(t.createdAt, false)}</span>
                  <span className="kucuk sonuk">{durumBilgi(t.status).ad}</span>
                </button>
              ))
            )}
          </Bolum>
        )}

        {talep.makine && (
          <Bolum ad="Makine">
            <S k="Model" v={p?.name} />
            <S k="Seri No" v={formatSerial(talep.makine.serial)} mono />
            <S k="Üretim Yılı" v={makineYili(talep) || ''} />
            {garanti && (
              <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
                <span className="kucuk sonuk" style={{ minWidth: 118 }}>Garanti</span>
                <span className={'rz rz--' + GARANTI_TON[garanti.state]}>
                  {GARANTI_ADI[garanti.state]}
                </span>
              </div>
            )}
          </Bolum>
        )}

        <Bolum ad="Talep">
          <S k="Makinenin Durumu" v={makineDurumAdi(talep.durum)} />
          <S k="Belirtiler" v={talep.belirtiler?.join(' · ')} />
          <S k="İstenen Parçalar" v={parcaYazisi(talep)} />
          {/* Aciliyet artık sorulmuyor — herkes "hemen" diyordu, soru
              sıralamaya katkı vermiyordu. Eski taleplerde yazılı
              olduğu için satır duruyor, boşsa görünmüyor. */}
          <S k="Aciliyet" v={aceleAdi(talep.acele)} />
          <S k="Ne Balyalayacak" v={talep.urunTipi} />
          <S k="Arazi" v={talep.arazi} />
          <S k="Traktör Gücü" v={talep.traktor} />
          <S k="İlgilendiği Ürün" v={talep.urunId ? getProduct(talep.urunId)?.name : ''} />
          {talep.aciklama && (
            <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0 0' }}>{talep.aciklama}</p>
          )}
          {/* Ses kaydı ya da yazıya çevrilmiş hâli — biri varsa bölüm
              açılıyor. Demo kayıtlarında sesin kendisi yok (megabaytlarca
              base64 tarayıcıyı doldururdu), yalnız süresi ve metni var. */}
          {(talep.ses || talep.sesMetni) && (
            <div style={{ marginTop: 12 }}>
              <div className="alan__ad">
                Sesli Not{talep.ses?.sure ? ' · ' + talep.ses.sure + ' sn' : ''}
              </div>
              {talep.ses?.veri ? (
                <audio controls src={talep.ses.veri} style={{ width: '100%' }} />
              ) : (
                <div className="kucuk sonuk">Ses kaydı bu kayıtta saklanmıyor.</div>
              )}

              {/* Yazıya çevrilmiş hâli — n8n akışından geliyor
                  (bkz. src/backoffice/sesMetin.js). Ses kaydı yerini
                  ALMIYOR, yanında duruyor: çeviri yanlış anlamış
                  olabilir, personel kaydı dinleyip doğrulayabilsin. */}
              {talep.sesMetni?.metin ? (
                <div className="ses-metni">
                  <div className="alan__ad">Sesli Notun Yazıya Çevrilmiş Hâli</div>
                  <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>
                    {talep.sesMetni.metin}
                  </p>
                  <div className="kucuk sonuk" style={{ marginTop: 8 }}>
                    Otomatik çeviridir; kaydı dinleyerek doğrulayın.
                  </div>
                </div>
              ) : (
                <div className="kucuk sonuk" style={{ marginTop: 6 }}>
                  Yazıya çevrilmiş hâli henüz gelmedi.
                </div>
              )}
            </div>
          )}

          <Ekler ekler={talep.ekler} />
        </Bolum>

        {/* --------------------------------------------- Fatura ve ödeme

            Yedek parça bir satış: faturası kesilecek, parası önden
            geliyor ve bir yere gönderilecek. Bu bilgiler olmadan talep
            işe yaramıyordu, personel "kime keseyim, nereye yollayayım"
            diye telefon açmak zorunda kalıyordu.

            Ödeme onayı parçanın hazırlanmasının önkoşulu; bu yüzden
            burada, düğmesiyle birlikte duruyor. */}
        {talep.tur === 'parca' && talep.fatura && (
          <Bolum ad="Fatura ve Teslimat">
            <S k="Fatura Tipi" v={talep.fatura.tuzel ? 'Tüzel kişi' : 'Gerçek kişi'} />
            {talep.fatura.tuzel ? (
              <>
                <S k="Ünvan" v={talep.fatura.unvan} />
                <S k="Vergi No" v={talep.fatura.vergiNo} mono />
              </>
            ) : (
              <>
                <S k="Ad Soyad" v={talep.fatura.ad} />
                <S k="TC Kimlik No" v={talep.fatura.tc} mono />
              </>
            )}
            <S k="Fatura Telefonu" v={talep.fatura.tel} mono />
            {talep.fatura.farkliKisi && (
              <div className="uyari" style={{ marginTop: 8 }}>
                Fatura, uygulamayı kullanan kişiden BAŞKASININ adına kesilecek.
              </div>
            )}

            <div className="alan__ad" style={{ marginTop: 14, marginBottom: 6 }}>
              Teslimat Adresi
            </div>
            <S
              k="İl / İlçe"
              v={talep.fatura.ilce ? `${talep.fatura.ilce} / ${talep.fatura.il}` : talep.fatura.il}
            />
            <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{talep.fatura.adres}</p>

            {/* Beklenen tutar.

                Ödemeyi onaylayan personel "ne kadar gelmesi
                gerekiyordu" sorusunun cevabını görmeden dekontu
                kontrol edemiyordu. Fiyatlar müşteriye gösterilen
                listeden geliyor (bkz. src/data/parcaFiyat.js), yani
                müşterinin gördüğü rakamın aynısı. */}
            <div className="alan__ad" style={{ marginTop: 18, marginBottom: 6 }}>
              Beklenen Tutar
            </div>
            <BeklenenTutar talep={talep} />

            <div className="alan__ad" style={{ marginTop: 18, marginBottom: 6 }}>
              Ödeme
            </div>
            {talep.odemeOnay ? (
              <>
                <span className="rz rz--yesil">Ödeme onaylandı</span>
                <div className="kucuk sonuk" style={{ marginTop: 6 }}>
                  {talep.odemeOnay.personel} · {tarihYaz(talep.odemeOnay.tarih)}
                  {talep.odemeOnay.not ? ' · ' + talep.odemeOnay.not : ''}
                </div>
              </>
            ) : (
              <>
                <span className="rz rz--turuncu">Ödeme onayı bekliyor</span>
                <p className="kucuk sonuk" style={{ margin: '8px 0 12px' }}>
                  Dekontu ve hesaba geçen tutarı kontrol edin. Onayladığınızda müşteriye
                  bildirim gider ve parça hazırlama aşamasına geçilir.
                </p>
                <button
                  className="dg dg--ana"
                  disabled={!talep.dekont}
                  onClick={() => setOdemeOnay(true)}
                  title={talep.dekont ? undefined : 'Dekont yüklenmemiş'}
                >
                  Ödemeyi onayla
                </button>
              </>
            )}

            <div className="alan__ad" style={{ marginTop: 18, marginBottom: 6 }}>
              Dekont
            </div>
            <Dekont dekont={talep.dekont} />
            {BANKA.aktif === false && (
              <p className="kucuk sonuk" style={{ marginTop: 10 }}>
                Uygulamada banka hesabı tanımlı değil; müşteri ödeme bilgilerini telefonla
                almış olabilir (bkz. src/config.js → BANKA).
              </p>
            )}
          </Bolum>
        )}

        {/* -------------------------------------- Bu talebe bakacak bayi

            Makineleri bayiye satıyoruz, son kullanıcıya bayi satıyor.
            Uygulamadan gelen fiyat teklifi talebini doğrudan
            cevaplamak, bayiyi kendi müşterisinde atlamak olur.

            Satış personelinin "bunu kime yollayacağım" sorusunun
            cevabı burada, talebin içinde yazılı — başka bir ekrana
            gidip il seçerek aramaya gerek yok. */}
        {talep.tur === 'satinalma' && <TalepBayileri talep={talep} />}

        {/* Verilen teklif — müşterinin cevabı beklenirken burada duruyor */}
        {talep.teklif && (
          <Bolum ad="Verilen Teklif">
            <S k="Teklif Tutarı" v={talep.teklif.tutar} />
            <S k="Geçerlilik" v={talep.teklif.gecerlilik} />
            {talep.teklif.not && (
              <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{talep.teklif.not}</p>
            )}
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.teklif.personel} · {tarihYaz(talep.teklif.tarih)}
            </div>
            {teklifBekliyorMu(talep) && (
              <div className="uyari" style={{ marginTop: 12, marginBottom: 0 }}>
                <span>
                  Teklif verileli <b>{teklifBeklemeGunu(talep)} gün</b> oldu, müşteri hâlâ
                  dönmedi. Aramanın zamanı.
                </span>
              </div>
            )}
          </Bolum>
        )}

        {talep.gonderim && (
          <Bolum ad="Gönderim">
            <S k="Gönderilen Parça" v={talep.gonderim.parcalar} />
            <S k="Kargo Firması" v={talep.gonderim.kargo} />
            <S k="Takip No" v={talep.gonderim.takipNo} mono />
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.gonderim.personel} · {tarihYaz(talep.gonderim.tarih)}
            </div>
          </Bolum>
        )}

        {talep.iptalBilgi && (
          <Bolum ad="İptal Sebebi">
            <S k="Sebep" v={talep.iptalBilgi.neden} />
            {talep.iptalBilgi.aciklama && (
              <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                {talep.iptalBilgi.aciklama}
              </p>
            )}
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.iptalBilgi.personel} · {tarihYaz(talep.iptalBilgi.tarih)}
            </div>
            <p className="kucuk sonuk" style={{ marginTop: 8 }}>
              Bu yazı müşterinin uygulamasında aynen görünüyor.
            </p>
          </Bolum>
        )}

        {talep.plan && (
          <Bolum ad="Plan">
            <S k="Planlanan Tarih" v={talep.plan.tarihYazi} />
            <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{talep.plan.is}</p>
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.plan.personel} · {tarihYaz(talep.plan.kayitTarihi)}
            </div>
          </Bolum>
        )}

        {talep.cozum && (
          <Bolum ad={talep.tur === 'satinalma' ? 'Teklif sonucu' : 'Yapılan iş'}>
            {KAPANIS_ALANLARI[talep.tur].map((a) =>
              a.uzun ? (
                talep.cozum[a.ad] ? (
                  <p key={a.ad} style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>
                    {talep.cozum[a.ad]}
                  </p>
                ) : null
              ) : (
                <S key={a.ad} k={a.etiket} v={talep.cozum[a.ad]} />
              )
            )}
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.cozum.personel} · {tarihYaz(talep.cozum.tarih)}
            </div>
          </Bolum>
        )}

        {/* Notlar.

            İki tür not var ve ayrımı ekranda da görünmeli:

              İÇ NOT       ekibin kendi arasında konuştuğu şey.
              MÜŞTERİ NOTU müşterinin uygulamasına düşüyor ve bildirim
                           gidiyor. Kargo takip numarası buradan
                           iletiliyor.

            Yanlış düğmeye basmak pahalı olduğu için müşteriye giden
            not ayrı renkte ve gönderilmiş notlar listede işaretli. */}
        <Bolum ad="Notlar">
          {talep.notlar?.length > 0 && (
            <div className="zaman" style={{ marginBottom: 12 }}>
              {talep.notlar.map((n, i) => (
                <div key={i} className="zaman__a">
                  <div>{n.metin}</div>
                  <div className="kucuk sonuk">
                    {n.personel} · {tarihYaz(n.tarih)}
                    {n.musteriye && (
                      <span className="rz rz--mavi" style={{ marginLeft: 8 }}>
                        müşteriye gönderildi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <textarea
            className="metin"
            style={{ minHeight: 68 }}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Kargo takip numarası, iç not…"
          />
          <div className="satir" style={{ marginTop: 8, gap: 8 }}>
            <button className="dg" onClick={() => notKaydet(false)}>
              İç not ekle
            </button>
            <button
              className="dg dg--ana"
              disabled={not.trim().length < 2}
              onClick={() => setNotOnay(true)}
            >
              Müşteriye gönder
            </button>
          </div>
          <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
            "Müşteriye gönder" dediğinizde yazdığınız cümle olduğu gibi müşterinin
            uygulamasına düşer ve bildirim gider.
          </p>
        </Bolum>

        {onay && (
          <Onay
            baslik="Durumu değiştir"
            metin={
              sessiz
                ? `${talep.no} kapanmış bir talep. Durumu "${durumBilgi(onay).ad}" olarak değişecek; müşteriye bildirim GÖNDERİLMEYECEK.`
                : `${talep.no} talebinin durumu "${durumBilgi(onay).ad}" olarak değişecek ve müşteriye bildirim gidecek.`
            }
            onVazgec={() => setOnay(null)}
            onOnayla={onayla}
          />
        )}

        {form === 'kapanis' && (
          <KapanisFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(cozum) => {
              talepKapat(talep, cozum, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} kapandı · müşteriye bildirim gitti`)
            }}
          />
        )}

        {form === 'plan' && (
          <PlanFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(plan) => {
              talepPlanla(talep, plan, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} planlandı · müşteriye bildirim gitti`)
            }}
          />
        )}

        {form === 'teklif' && (
          <TeklifFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(teklif) => {
              talepTeklifVer(talep, teklif, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} · teklif verildi, müşteriye bildirim gitti`)
            }}
          />
        )}

        {form === 'iptal' && (
          <IptalFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(iptal) => {
              talepIptal(talep, iptal, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} iptal edildi · sebep müşteriye gitti`)
            }}
          />
        )}

        {form === 'gonderim' && (
          <GonderimFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(gonderim) => {
              talepGonderildi(talep, gonderim, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} gönderildi · müşteriye bildirim gitti`)
            }}
          />
        )}

        {notOnay && (
          <Onay
            baslik="Notu müşteriye gönder"
            metin={`Aşağıdaki yazı ${talep.ad || 'müşteriye'} olduğu gibi gidecek ve telefonuna bildirim düşecek. Gönderilen not geri alınamaz.\n\n"${not.trim()}"`}
            onayYazi="Gönder"
            onVazgec={() => setNotOnay(false)}
            onOnayla={() => {
              setNotOnay(false)
              notKaydet(true)
            }}
          />
        )}

        {odemeKapisi && (
          <Onay
            baslik="Önce ödemeyi onaylayın"
            metin={`${talep.no} yedek parça talebi. Müşteri parça bedelini önden gönderiyor; ödeme onaylanmadan talep "${durumBilgi(odemeKapisi).ad}" durumuna alınamaz.\n\nDekontu ve hesaba geçen tutarı kontrol edip ödemeyi onaylayın. Onayladığınızda talep kendiliğinden İncelemede durumuna geçer.`}
            onayYazi={talep.dekont ? 'Ödemeye git' : 'Tamam'}
            onVazgec={() => setOdemeKapisi(null)}
            onOnayla={() => {
              setOdemeKapisi(null)
              if (talep.dekont) setOdemeOnay(true)
            }}
          />
        )}

        {odemeOnay && (
          <Onay
            baslik="Ödemeyi onayla"
            metin={`${talep.no} talebinin ödemesi onaylanacak. Dekontu ve hesaba geçen tutarı kontrol ettiğinizden emin olun. Müşteriye "ödemeniz alındı" bildirimi gidecek.`}
            onVazgec={() => setOdemeOnay(false)}
            onOnayla={() => {
              const acilacak = (talep.status || 'yeni') === 'yeni'
              odemeOnayla(talep, personel)
              setOdemeOnay(false)
              tazele()
              bildir(
                acilacak
                  ? `${talep.no} · ödeme onaylandı, talep incelemeye alındı`
                  : `${talep.no} · ödeme onaylandı`
              )
            }}
          />
        )}

        {talep.gecmis?.length > 0 && (
          <Bolum ad="Geçmiş">
            <div className="zaman">
              {talep.gecmis.map((g, i) => (
                <div
                  key={i}
                  className={'zaman__a' + (i === talep.gecmis.length - 1 ? ' zaman__a--son' : '')}
                >
                  <div>{durumBilgi(g.durum).ad}</div>
                  <div className="kucuk sonuk">{g.personel} · {tarihYaz(g.tarih)}</div>
                </div>
              ))}
            </div>
          </Bolum>
        )}
      </div>
    </>
  )
}

function Bolum({ ad, sag, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="alan__ad satir"
        style={{
          borderBottom: '1px solid var(--cizgi)',
          paddingBottom: 6,
          marginBottom: 10,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span>{ad}</span>
        {sag && <span style={{ marginLeft: 'auto' }}>{sag}</span>}
      </div>
      {children}
    </div>
  )
}

function S({ k, v, mono }) {
  if (!v) return null
  return (
    <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span className="kucuk sonuk" style={{ minWidth: 118 }}>{k}</span>
      <span className={mono ? 'mono' : undefined}>{v}</span>
    </div>
  )
}

/* ----------------------------------------------------------- Excel aktarımı

   Ekranda ne görünüyorsa o gidiyor: rolün göremediği talep dosyaya da
   girmiyor, süzgeç açıksa süzülmüş liste iniyor. */

const AKTAR_BASLIK = [
  'Talep No', 'Tür', 'Durum', 'Tarih', 'Saat', 'Müşteri', 'Telefon',
  'İl', 'İlçe', 'Makine', 'Seri No', 'Makinenin durumu', 'Belirtiler',
  'İstenen parçalar', 'Açıklama', 'Aranma tercihi', 'Ek sayısı',
  /* Fiyat teklifi ve yedek parça akışının para tarafı. Yönetici
     "kaç teklif verdik, kaçı satışa döndü, ödemesi gelmeyen parça
     talebi var mı" sorularını Excel'de de cevaplayabilsin. */
  'Teklif tutarı', 'Teklif tarihi', 'Sonuç', 'Satış fiyatı',
  'Fatura tipi', 'Fatura adı', 'Ödeme onayı', 'Kargo takip no', 'İptal sebebi',
]

function aktarSatiri(t) {
  const p = t.makine ? getProduct(t.makine.productId) : null
  return [
    t.no,
    TALEP_ADI[t.tur] || t.tur,
    durumBilgi(t.status).ad,
    ...tarihSaat(t.createdAt),
    t.ad || '',
    t.tel || '',
    t.il || '',
    t.ilce || '',
    p?.name || '',
    t.makine?.serial ? formatSerial(t.makine.serial) : '',
    t.durum || '',
    (t.belirtiler || []).join(' · '),
    parcaYazisi(t),
    t.aciklama || '',
    t.ulasim || '',
    String((t.ekler || []).length + (t.ses?.veri ? 1 : 0)),
    t.teklif?.tutar || '',
    t.teklif?.tarih ? tarihYaz(t.teklif.tarih, false) : '',
    t.cozum?.sonuc || '',
    t.cozum?.satisFiyati || '',
    t.fatura ? (t.fatura.tuzel ? 'Tüzel' : 'Gerçek') : '',
    t.fatura ? (t.fatura.tuzel ? t.fatura.unvan : t.fatura.ad) || '' : '',
    t.odemeOnay ? tarihYaz(t.odemeOnay.tarih, false) : '',
    t.gonderim?.takipNo || '',
    t.iptalBilgi?.neden || '',
  ]
}

/* Gecikme işareti — 48 saati geçmiş açık talep */
function Gecikme() {
  return (
    <span className="gecikme" title="48 saati geçti" aria-label="Gecikmiş talep">
      !
    </span>
  )
}

/* Cevap bekleyen teklif işareti.

   Gecikme ünlemiyle KARIŞTIRILMAMALI: gecikme "kimse bakmadı" demek,
   bu ise "iş yapıldı, müşteri dönmedi". İkisi farklı iş gerektiriyor,
   bu yüzden farklı renk ve farklı simge. */
function TeklifBekliyor({ talep }) {
  const gun = teklifBeklemeGunu(talep)
  return (
    <span
      className="bekleyen"
      title={`Teklif verileli ${gun} gün oldu, müşteri dönmedi`}
      aria-label="Cevap bekleyen teklif"
    >
      ⏳
    </span>
  )
}

/* "Pikap dişi × 2 · Düğüm atıcı bıçağı"

   Adet ayrı bir alanda tutuluyor; eski taleplerde yok, o yüzden
   yalnızca 1'den büyükse yazılıyor. */
function parcaYazisi(talep) {
  return (talep.parcalar || [])
    .map((x) => {
      const adet = talep.parcaAdet?.[x]
      return adet > 1 ? `${x} × ${adet}` : x
    })
    .join(' · ')
}

/* Talebin makinesinin üretim yılı; seri numarasından okunuyor. */
function makineYili(talep) {
  const yil = String(talep.makine?.serial || '').match(/(20[0-9]{2})/)
  return yil ? Number(yil[1]) : null
}

const GARANTI_TON = { devam: 'yesil', son: 'turuncu', bitti: 'gri', bilinmiyor: 'gri' }
const GARANTI_ADI = {
  devam: 'Garanti sürüyor',
  son: 'Garantinin son yılı',
  bitti: 'Garanti bitti',
  bilinmiyor: 'Garanti bilgisi yok',
}

/* Tür başına kapanış alanları.

   Servis ve yedek parça kapanırken "ne yapıldı" soruluyor. Fiyat
   teklifinde yapılacak bir iş yok; orada verilen fiyat, geçerlilik ve
   sonuç soruluyor. Aynı formu üç türe de sormak anlamsızdı. */
const KAPANIS_ALANLARI = {
  servis: [
    { ad: 'yapilanIs', etiket: 'Yapılan İş', uzun: true, zorunlu: true,
      ipucu: 'Örnek: düğüm ipi mekanizması ayarlandı, pikap dişi değişti' },
    { ad: 'parcalar', etiket: 'Değişen Parça', ipucu: 'Pikap dişi, düğüm ipi' },
    { ad: 'ucret', etiket: 'Ücret', para: true, ipucu: 'Garanti kapsamında / 1250' },
  ],
  /* Yedek parça kapanışında TUTAR SORULMUYOR.

     Parça bedeli talebin en başında, müşteri tarafından ödeniyor ve
     tutarı fiyat listesinden belli (bkz. src/data/parcaFiyat.js).
     Kapanışta bir kez daha sormak, aynı rakamı ikinci kez ve elle
     yazdırmak demekti; iki kayıt tutmayınca da hangisinin doğru olduğu
     belirsizleşiyordu. */
  parca: [
    { ad: 'yapilanIs', etiket: 'Yapılan İş', uzun: true, zorunlu: true,
      ipucu: 'Örnek: parçalar kargoya verildi, takip numarası paylaşıldı' },
    { ad: 'parcalar', etiket: 'Gönderilen Parça', ipucu: 'Pikap dişi x2' },
  ],
  /* Fiyat teklifi kapanışı.

     Verilen fiyat ve geçerlilik artık BURADA sorulmuyor; onlar
     "Teklif Verildi" aşamasına taşındı. Teklif haftalarca açık
     kalabiliyor ve o süre boyunca tutarın backoffice’te görünmesi gerekiyor —
     kapanışa saklamak, bekleyen teklifin tutarını görünmez yapıyordu.

     Burada kalan tek soru sonucun ne olduğu: satış oldu mu, olduysa
     kaça. Sonuçlanan satış fiyatı teklif tutarından farklı olabiliyor
     (pazarlık), ikisi ayrı ayrı duruyor ki iskonto oranı görülebilsin. */
  satinalma: [
    { ad: 'sonuc', etiket: 'Sonuç', zorunlu: true,
      secenek: ['Satış oldu', 'Müşteri vazgeçti', 'Rakibe gitti', 'Ulaşılamadı'] },
    { ad: 'satisFiyati', etiket: 'Sonuçlanan Satış Fiyatı', para: true,
      ipucu: 'Satış olduysa yazın — örnek: 1780000' },
    { ad: 'not', etiket: 'Not', uzun: true, ipucu: 'Görüşmede konuşulanlar' },
  ],
}

/* Para alanı biçimlendirme.

   Kullanıcı "1650000" yazınca kutuda "1.650.000" görünüyor. Yalnız
   rakam yazıldığında devreye giriyor; "Garanti kapsamında" gibi bir
   cümle yazılırsa dokunmuyor — servis ücreti her zaman sayı olmuyor. */
function paraBicimle(deger) {
  const ham = String(deger ?? '')
  if (!/^[\d.\s]*$/.test(ham)) return ham
  const rakam = ham.replace(/\D/g, '')
  if (!rakam) return ''
  return rakam.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/* Kapanış özeti işlem kaydına yazılıyor; her türde farklı alan. */
function kapanisOzeti(tur, deger) {
  if (tur === 'satinalma') {
    return [deger.sonuc, deger.satisFiyati].filter(Boolean).join(' · ')
  }
  return deger.yapilanIs
}

/* Talep türü etiketi.

   Renkler Dashboard'daki grafiklerle aynı: servis kırmızı, yedek parça
   mor, fiyat teklifi mavi. Bir ekrandan ötekine geçerken aynı renk aynı
   şeyi gösteriyor. */
function TurEtiket({ tur }) {
  return <span className={'tur tur--' + tur}>{TALEP_ADI[tur] || tur}</span>
}

/* Uygulamada makinenin durumu ve aciliyet KİMLİKLE saklanıyor
   ("durdu", "hemen"). Backoffice’te okunur karşılığı gösterilmeli; yoksa
   ekranda "durdu" yazıyordu. */
function makineDurumAdi(id) {
  if (!id) return ''
  return MAKINE_DURUMU.find((d) => d.id === id)?.ad || id
}

function aceleAdi(id) {
  if (!id) return ''
  return PARCA_ACELE.find((d) => d.id === id)?.ad || id
}

/* Onay penceresi — durum değişikliği müşteriye bildirim gönderdiği için
   yanlış tıklama pahalı. */
function Onay({ baslik, metin, onOnayla, onVazgec, onayYazi = 'Onayla' }) {
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="kart pencere__kart" style={{ maxWidth: 440 }}>
        <div className="kart__tepe">
          <h2>{baslik}</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: '0 0 18px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{metin}</p>
          <div className="satir">
            <button className="dg dg--ana" onClick={onOnayla} autoFocus>{onayYazi}</button>
            <button className="dg" onClick={onVazgec}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Planlama formu.

   "Planlandı" demek tek başına bir şey anlatmıyordu; müşteriye giden
   bildirimde neyin ne zaman yapılacağı yazsın diye iş ve tarih
   alınıyor. */
function PlanFormu({ talep, onKapat, onKaydet }) {
  const [tarih, setTarih] = useState('')
  const [is, setIs] = useState('')
  const [gorusuldu, setGorusuldu] = useState(false)
  const [hata, setHata] = useState('')

  /* Servis randevusunda müşteriyle konuşmak şart.

     Çiftçi bildirime bakmayabilir; servis aracı boşa gider. Tarih
     müşteriyle telefonda belirlenmeden randevu kaydedilemiyor —
     bildirim o konuşmanın yazılı teyidi oluyor, tek kaynağı değil. */
  const gorusmeSart = talep.tur === 'servis'

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Planla · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Planlanan Tarih ve Saat</span>
            <input
              className="gir"
              type="datetime-local"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              autoFocus
            />
          </label>

          <label className="alan">
            <span className="alan__ad">Planlanan İş</span>
            <textarea
              className="metin"
              style={{ minHeight: 78 }}
              value={is}
              onChange={(e) => setIs(e.target.value)}
              placeholder={
                talep.tur === 'parca'
                  ? 'Örnek: parçalar hazırlanıp kargoya verilecek'
                  : 'Örnek: servis ekibi tarlada olacak, pikap dişi değişecek'
              }
            />
          </label>

          {gorusmeSart && (
            <label className="secim">
              <input
                type="checkbox"
                checked={gorusuldu}
                onChange={(e) => setGorusuldu(e.target.checked)}
              />
              <span>Randevu gün ve saati müşteri ile görüşüldü</span>
            </label>
          )}

          {hata && <div className="uyari">{hata}</div>}

          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            Bu bilgiler müşterinin bildirimlerine aynen gidiyor; randevudan bir gün
            önce hatırlatma da düşüyor.
          </p>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (!tarih) return setHata('Planlanan tarihi seçin.')
                if (is.trim().length < 5) return setHata('Planlanan işi yazın.')
                if (gorusmeSart && !gorusuldu) {
                  return setHata('Randevuyu kaydetmeden önce müşteriyle görüşün.')
                }
                const d = new Date(tarih)
                onKaydet({
                  gorusuldu,
                  tarih: d.getTime(),
                  tarihYazi: d.toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  is: is.trim(),
                })
              }}
            >
              Planla ve bildir
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Kapatma formu — alanlar türe göre değişiyor (bkz. KAPANIS_ALANLARI). */
function KapanisFormu({ talep, onKapat, onKaydet }) {
  const alanlar = KAPANIS_ALANLARI[talep.tur] || KAPANIS_ALANLARI.servis
  const [deger, setDeger] = useState({})
  const [hata, setHata] = useState('')

  const yaz = (a) => (e) =>
    setDeger({ ...deger, [a.ad]: a.para ? paraBicimle(e.target.value) : e.target.value })

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Talebi Kapat · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          {alanlar.map((a, i) => (
            <label className="alan" key={a.ad}>
              <span className="alan__ad">
                {a.etiket}
                {!a.zorunlu && <span className="sonuk"> · isteğe bağlı</span>}
              </span>

              {a.uzun ? (
                <textarea
                  className="metin"
                  style={{ minHeight: 78 }}
                  value={deger[a.ad] || ''}
                  onChange={yaz(a)}
                  placeholder={a.ipucu}
                  autoFocus={i === 0}
                />
              ) : a.secenek ? (
                <select className="sec" value={deger[a.ad] || ''} onChange={yaz(a)}>
                  <option value="">Seçilmedi</option>
                  {a.secenek.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="gir"
                  value={deger[a.ad] || ''}
                  onChange={yaz(a)}
                  placeholder={a.ipucu}
                  autoFocus={i === 0}
                  inputMode={a.para ? 'numeric' : undefined}
                />
              )}
            </label>
          ))}

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                const eksik = alanlar.find(
                  (a) => a.zorunlu && String(deger[a.ad] || '').trim().length < 3
                )
                if (eksik) return setHata(eksik.etiket + ' alanını doldurun.')
                const temiz = {}
                alanlar.forEach((a) => (temiz[a.ad] = String(deger[a.ad] || '').trim()))
                onKaydet({ ...temiz, ozet: kapanisOzeti(talep.tur, temiz) })
              }}
            >
              Kapat ve kaydet
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Teklif verildi formu

   Fiyat teklifinin en uzun aşaması: fiyat çalışıldı, müşteriye iletildi
   ve müşteri düşünüyor. Haftalar sürebiliyor.

   BURADA "SONUÇ" SORULMUYOR — sonuç henüz yok. Kapanış ekranındaki
   sonuç kutusunu buraya da koymak, satışçıyı teklifi verdiği anda
   sonucu tahmin etmeye zorlardı; o kutu boş bırakılır ve hiçbir işe
   yaramazdı. Sonuç, müşteri döndüğünde kapanışta giriliyor.
   ========================================================================== */
function TeklifFormu({ talep, onKapat, onKaydet }) {
  const [tutar, setTutar] = useState('')
  const [gecerlilik, setGecerlilik] = useState('')
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Teklif Ver · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Teklif Tutarı</span>
            <input
              className="gir"
              value={tutar}
              onChange={(e) => setTutar(paraBicimle(e.target.value))}
              placeholder="Örnek: 1850000"
              inputMode="numeric"
              autoFocus
            />
          </label>

          <label className="alan">
            <span className="alan__ad">
              Geçerlilik<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <input
              className="gir"
              value={gecerlilik}
              onChange={(e) => setGecerlilik(e.target.value)}
              placeholder="30 gün / 30.09.2026"
            />
          </label>

          <label className="alan">
            <span className="alan__ad">
              Not<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <textarea
              className="metin"
              style={{ minHeight: 70 }}
              value={not}
              onChange={(e) => setNot(e.target.value)}
              placeholder="Teklife dâhil olanlar, teslim süresi…"
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            Tutar ve geçerlilik müşterinin uygulamasında görünecek, bildirim de gidecek.
            Müşteri {TEKLIF_BEKLEME_GUN} gün içinde dönmezse bu talep listede işaretlenir.
          </p>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (!tutar.trim()) return setHata('Teklif tutarını yazın.')
                onKaydet({ tutar: tutar.trim(), gecerlilik: gecerlilik.trim(), not: not.trim() })
              }}
            >
              Teklifi kaydet ve bildir
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   İptal formu

   İptal, kapanışın sessiz kardeşi değil: müşteri bir iş bekliyordu ve o
   iş yapılmayacak. Sebebi yazılmadan iptal edilemiyor ve yazılan sebep
   müşteriye AYNEN gidiyor.

   Hazır sebepler var çünkü çoğu iptal aynı birkaç sebepten oluyor ve
   her seferinde cümle kurmak zaman alıyor. Hazır sebep seçilse bile
   açıklama yazılabiliyor.
   ========================================================================== */

const IPTAL_SEBEPLERI = [
  'Müşteri vazgeçti',
  'Müşteriye ulaşılamadı',
  'Yanlışlıkla açılmış talep',
  'Aynı konuda başka talep var',
  'Sorun telefonda çözüldü',
  'Bu talep kapsamımız dışında',
]

function IptalFormu({ talep, onKapat, onKaydet }) {
  const [neden, setNeden] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Talebi İptal Et · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">İptal Sebebi</span>
            <select className="sec" value={neden} onChange={(e) => setNeden(e.target.value)}>
              <option value="">Seçilmedi</option>
              {IPTAL_SEBEPLERI.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label className="alan">
            <span className="alan__ad">
              Müşteriye açıklama<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <textarea
              className="metin"
              style={{ minHeight: 78 }}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Örnek: Aradığımızda makinenin satıldığını öğrendik."
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          <div className="uyari" style={{ marginBottom: 14 }}>
            <span>
              Buraya yazdıklarınız müşterinin uygulamasında <b>aynen</b> görünecek.
              Müşteri "talebim neden iptal oldu" sorusunun cevabını burada okuyacak.
            </span>
          </div>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (!neden) return setHata('İptal sebebini seçin.')
                onKaydet({ neden, aciklama: aciklama.trim() })
              }}
            >
              İptal et ve bildir
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Gönderim formu — yedek parça

   Parça kargoya verildiğinde talep kapanıyor. Kargo firması ve takip
   numarası isteğe bağlı ama girildiğinde müşteriye bildirim olarak
   gidiyor: çiftçi kargonun nerede olduğunu uygulamadan görsün, santrali
   aramasın.
   ========================================================================== */
function GonderimFormu({ talep, onKapat, onKaydet }) {
  const [parcalar, setParcalar] = useState(parcaYazisi(talep))
  const [kargo, setKargo] = useState('')
  const [takipNo, setTakipNo] = useState('')
  const [hata, setHata] = useState('')

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Gönderildi · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          {!talep.odemeOnay && (
            <div className="uyari">
              <span>
                Bu talebin <b>ödemesi onaylanmadı</b>. Yine de gönderilecekse devam edin;
                onay bilgisi kayıtta boş kalacak.
              </span>
            </div>
          )}

          <label className="alan">
            <span className="alan__ad">Gönderilen Parça</span>
            <input
              className="gir"
              value={parcalar}
              onChange={(e) => setParcalar(e.target.value)}
              autoFocus
            />
          </label>

          <label className="alan">
            <span className="alan__ad">
              Kargo firması<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <input
              className="gir"
              value={kargo}
              onChange={(e) => setKargo(e.target.value)}
              placeholder="Örnek: Aras Kargo"
            />
          </label>

          <label className="alan">
            <span className="alan__ad">
              Takip numarası<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <input
              className="gir"
              value={takipNo}
              onChange={(e) => setTakipNo(e.target.value)}
              placeholder="Kargo takip numarası"
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            Takip numarası yazarsanız müşteriye bildirimle birlikte gider. Sonradan da
            "Müşteriye gönder" notuyla iletebilirsiniz.
          </p>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (parcalar.trim().length < 2) return setHata('Gönderilen parçayı yazın.')
                onKaydet({
                  parcalar: parcalar.trim(),
                  kargo: kargo.trim(),
                  takipNo: takipNo.trim(),
                })
              }}
            >
              Gönderildi olarak kaydet
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Talebe bakacak bayi listesi

   Üç kademe var ve hangisinde olduğumuz ekranda yazıyor: müşterinin
   ilçesindeki bayi ile "en yakın bayi" arasındaki fark, satış
   personelinin bilmesi gereken bir fark.
   ========================================================================== */

const KADEME_YAZI = {
  ilce: 'Müşterinin ilçesindeki satış bayisi',
  il: 'Müşterinin ilindeki satış bayisi',
  yakin: 'İlinde satış bayisi yok — en yakın bayiler',
}

function TalepBayileri({ talep }) {
  const { kademe, bayiler } = talebinBayileri(talep.il, talep.ilce)

  return (
    <Bolum ad="İlgili Bayi">
      <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
        {KADEME_YAZI[kademe]}
      </p>

      {bayiler.length === 0 ? (
        <div className="uyari" style={{ marginBottom: 0 }}>
          <span>
            Bu konum için bayi eşleştirilemedi. Talebi hangi bayiye yönlendireceğinizi
            Bayiler ekranından belirleyin.
          </span>
        </div>
      ) : (
        bayiler.map((b) => (
          <div
            key={b.id}
            style={{ borderTop: '1px solid var(--cizgi)', padding: '10px 0 4px' }}
          >
            <div className="satir" style={{ gap: 10, alignItems: 'baseline' }}>
              <b>{b.ad}</b>
              {b.km !== undefined && (
                <span className="kucuk sonuk">~{b.km} km (kuş uçuşu)</span>
              )}
            </div>
            <div className="kucuk sonuk">
              {[b.ilce, b.il].filter(Boolean).join(' / ')}
              {b.adres ? ' · ' + b.adres : ''}
            </div>
            {/* Telefon TIKLANABİLİR DEĞİL. Backoffice masaüstü tarayıcıda
                açılıyor; oradan arama başlatmak işe yaramıyor, en
                iyi ihtimalle bir uygulama seçme penceresi açıyor.
                Numara okunacak ve masadaki telefondan aranacak. */}
            <div className="satir" style={{ gap: 10, marginTop: 6, alignItems: 'center' }}>
              <span className="mono">{b.telYazi || b.tel}</span>
              <span className="kucuk sonuk">
                {(b.yetki || []).map((y) => yetkiAdi(y)).join(' · ')}
              </span>
            </div>
          </div>
        ))
      )}
    </Bolum>
  )
}

/* Talepteki parçaların liste fiyatı üzerinden tutarı.

   Bu bir fatura değil, KONTROL SATIRI: dekonttaki rakamla
   karşılaştırılıyor. Fiyatı bilinmeyen parça varsa (müşteri "Diğer"
   seçmişse) toplam eksik demektir ve bu ekranda yazıyor — yoksa
   personel eksik parayı onaylayabilir. */
function BeklenenTutar({ talep }) {
  const hesap = parcaToplami(talep.parcalar || [], talep.parcaAdet || {})

  if (!hesap.satirlar.length) return <span className="kucuk sonuk">Parça seçilmemiş.</span>

  return (
    <>
      {hesap.satirlar.map((r) => (
        <div key={r.ad} className="satir" style={{ gap: 10, marginBottom: 4 }}>
          <span className="kucuk">
            {r.ad}
            {r.adet > 1 ? ` × ${r.adet}` : ''}
            {r.bilgi ? <span className="sonuk"> · {r.bilgi.kod}</span> : null}
          </span>
          <span className="kucuk mono" style={{ marginLeft: 'auto' }}>
            {r.tutar === null ? '—' : paraYaz(r.tutar) + ' ' + PARA_BIRIMI}
          </span>
        </div>
      ))}

      <div
        className="satir"
        style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--cizgi)' }}
      >
        <b>KDV dâhil toplam</b>
        <b className="mono" style={{ marginLeft: 'auto' }}>
          {paraYaz(hesap.toplam)} {PARA_BIRIMI}
        </b>
      </div>

      {hesap.eksikFiyat && (
        <div className="uyari" style={{ marginTop: 10, marginBottom: 0 }}>
          <span>
            Fiyatı listede olmayan parça var ("Diğer"). Yukarıdaki toplam EKSİK — müşteriyle
            konuşulan tutarı esas alın.
          </span>
        </div>
      )}
    </>
  )
}
