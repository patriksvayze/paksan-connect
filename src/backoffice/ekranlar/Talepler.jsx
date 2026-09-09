import { useEffect, useMemo, useState } from 'react'
import {
  DURUMLAR, durumBilgi, gecikmisMi, gonderimGecikti, gonderimGecikmeSaati,
  izinli, KAPALI_DURUMLAR, musterininDigerTalepleri,
  odemeOnayla, parcaIlerlemeEngeli, rolBilgi, rolunTalepleri, TALEP_ADI,
  talepDurumDegistir,
  talepDurumlari, talepIptal, talepKapat, talepleriGetir,
  talepNotEkle, talepPlanla, talepTeklifVer, teklifBeklemeGunu, teklifBekliyorMu,
  TEKLIF_BEKLEME_GUN,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, Bekleme, Bos, DurumRozet, saatYaz, siraliListe, SiraliBaslik,
  tarihSaat, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { boyutYaz, ekAdresi, ekYaz } from '../../lib/ekler'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { Dekont, Ekler } from './Ekler'
import { getProduct, markaEk } from '../../marka'
import { formatSerial, warrantyStatus } from '../../lib/serial'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { BANKA } from '../../marka'
import { bayileriGetir, talebinBayileri, yetkiAdi } from '../../marka'
import { PARA_BIRIMI, parcaToplami, paraYaz } from '../../marka'

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
  const [sahiplik, setSahiplik] = useState('hepsi')
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
    /* Sahiplik de sıfırlanıyor. Açık kalmış "Bayide" süzgeci
       dashboard'dan gelen sayıyla listeyi uyumsuz hâle getiriyordu:
       kutuda 35 yazıyor, listede 12 kayıt çıkıyordu. */
    setSahiplik(sorgu.sahiplik ?? 'hepsi')
    setAra(sorgu.ara ?? '')
    setSecili(null)
  }, [sorgu])

  const { veri: kendiTalepleri, yukleniyor } = useVeri(
    () => rolunTalepleri(talepleriGetir(), rol),
    [surum, rol],
    []
  )

  const tumTurler = rolBilgi(rol).talepTuru === null

  /* DURUM SÜZGECİ SEÇİLİ TÜRE GÖRE DARALIYOR.

     Önce yedi durumun hepsi her zaman listeleniyordu. Satış personeli
     süzgeci açtığında yedek parçaya ait "Gönderildi" durumunu da
     görüyordu — o durum fiyat teklifi talebinde hiç oluşmuyor, seçilse
     liste hep boş geliyordu.

     Her türün kendi aşamaları zaten tanımlı (bkz. veri.js →
     talepDurumlari). Süzgeç artık onu kullanıyor:

       · Rolü tek türe bağlıysa       → o türün aşamaları
       · Admin/yönetici bir tür seçtiyse → seçilen türün aşamaları
       · "Her tür" seçiliyse           → hepsi

     "Cevap bekleyen teklifler" kısayolu da yalnız fiyat teklifi
     görünürken çıkıyor; başka türde karşılığı yok. */
  const suzgecTuru = tumTurler ? tur : rolBilgi(rol).talepTuru
  const durumSecenekleri =
    suzgecTuru && suzgecTuru !== 'hepsi' ? talepDurumlari(suzgecTuru) : DURUMLAR
  const teklifVar = !suzgecTuru || suzgecTuru === 'hepsi' || suzgecTuru === 'satinalma'

  /* Excel sütunları rolüne göre süzülüyor (bkz. aktarSutunlari) */
  const aktarSutun = useMemo(() => aktarSutunlari(rol), [rol])

  /* Tür değişince seçili durum listede kalmayabilir: "Gönderildi"
     seçiliyken fiyat teklifine geçilirse öyle bir aşama yok. Süzgeç o
     zaman hiçbir şey döndürmezdi ve kullanıcı sebebini anlamazdı.
     Karşılığı kalmayan seçim "Açık olanlar"a düşüyor. */
  useEffect(() => {
    const gecerli = ['acik', 'gecikmis', 'hepsi']
    if (teklifVar) gecerli.push('teklifBekleyen')
    for (const d of durumSecenekleri) gecerli.push(d.id)
    if (!gecerli.includes(durum)) setDurum('acik')
  }, [durum, durumSecenekleri, teklifVar])

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
      if (sahiplik === 'bayi' && (t.sahip || 'paksan') !== 'bayi') return false
      if (sahiplik === 'paksan' && (t.sahip || 'paksan') !== 'paksan') return false
      if (sahiplik === 'devredilen' && !t.devir) return false
      if (makine !== 'hepsi') {
        const ad = t.makine ? getProduct(t.makine.productId)?.name : null
        if (ad !== makine) return false
      }
      if (!q) return true

      /* Parça arama: telefonun son 6 hanesi, talep numarasının bir
         bölümü, seri numarasının sonu — hepsi bulunmalı. Rakamlar
         ayrıca boşluksuz hâliyle de karşılaştırılıyor, yoksa
         "1415057" araması "549 141 50 57" numarasını bulamıyordu.

         FATURA ADI VE BAYİ ADI DA ARANIYOR. Yedek parça faturası
         çoğu zaman şirkete kesiliyor ve o unvan uygulamayı kullanan
         kişinin adından farklı; "Öztürk Tarım" araması hiçbir şey
         bulmuyordu. Bayi adı da aynı sebeple burada: personel
         "Konya bayisindeki işler" diye arıyor. */
      const alanlar = [
        t.no, t.ad, t.tel, t.il, t.ilce, t.makine?.serial, t.aciklama,
        t.fatura?.ad, t.fatura?.unvan, t.bayi?.ad,
      ]
      if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
        return true
      }
      const qRakam = q.replace(/\D/g, '')
      if (!qRakam) return false
      return [t.no, t.tel, t.telHam, t.makine?.serial]
        .filter(Boolean)
        .some((x) => String(x).replace(/\D/g, '').includes(qRakam))
    })
  }, [kendiTalepleri, durum, tur, aralik, il, ilce, makine, ara, tumTurler, sahiplik])

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
            basliklar={aktarSutun.map((s) => s.ad)}
            satirlar={liste.map((t) => aktarSutun.map((s) => s.deger(t)))}
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
            ...(teklifVar
              ? [{ deger: 'teklifBekleyen', ad: 'Cevap Beklenen Teklifler' }]
              : []),
            ...durumSecenekleri.map((d) => ({ deger: d.id, ad: d.ad })),
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

        {/* Talep bayiye düşse de PAKSAN listesinden çıkmıyor; bu
            süzgeç "şu an kim ilgileniyor" sorusunu cevaplıyor. */}
        <Secim
          ad="Sahiplik"
          deger={sahiplik}
          onDegis={setSahiplik}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'bayi', ad: 'Bayide' },
            { deger: 'paksan', ad: markaEk('da') },
            { deger: 'devredilen', ad: 'Devredilenler' },
          ]}
          genislik={150}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Talep numarası, ad, telefon, seri numarası"
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
              <table className="tablo--esit tablo--talepler">
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
                          {/* Numara TEK BAŞINA ilk satırda.

                              Uyarı işaretleri önce numaranın önünde
                              duruyordu; her biri 23 piksel yer kaplıyor
                              ve üçü birden çıkabildiği için numara
                              sığmıyordu (ölçüldü: 42 numaranın 18'i
                              kırpılıyordu). Şimdi alt satıra, tür
                              etiketinin yanına alındılar — satır sayısı
                              değişmedi, numara tam görünüyor. */}
                          <div className="mono talep-no">{t.no}</div>
                          <div className="talep-alt">
                            <TurEtiket tur={t.tur} />
                            {gecikmisMi(t) && <Gecikme />}
                            {teklifBekliyorMu(t) && <TeklifBekliyor talep={t} />}
                            {gonderimGecikti(t) && <GonderimGecikti talep={t} />}
                          </div>
                          <SahiplikEtiketi talep={t} />
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
  /* Kapanmış talebi geri açma yetkisi ROL KİMLİĞİNE bağlıydı
     (`rol !== 'admin'`). Roller ekrandan açılabildiği için yetkiye
     taşındı; hangi rolün açabileceği Roller ekranından işaretleniyor. */
  const kapali = KAPALI_DURUMLAR.includes(suanki)
  const kilitli = kapali && !izinli(rol, 'talepGeriAc')

  /* Müşteriye bildirim gitmeyecek iki hâl:

       1) Kapanmış talebi yönetici yeniden açıyor (yukarıdaki gerekçe).

       2) DURUM GERİYE ALINIYOR. "Planlandı" iken "Yeni"ye dönmek
          müşteriye ikinci kez "Talebiniz alındı." bildirimini gönderiyordu —
          günler sonra, hiçbir şey olmamışken. Geriye alma personelin
          yanlış tıklamasını düzeltmesidir; müşteri açısından olmuş bir
          şey yok. Aşama sırası türün kendi akışından okunuyor. */
  function bildirimsizMi(hedef) {
    if (kapali) return true
    const sira = talepDurumlari(talep.tur).map((d) => d.id)
    const s = sira.indexOf(suanki)
    const h = sira.indexOf(hedef)
    return s >= 0 && h >= 0 && h < s
  }

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
    if (!kapali && yeni === 'iptal') return setForm('iptal')
    setOnay(yeni)
  }

  function onayla() {
    const sessiz = bildirimsizMi(onay)
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
            <span>Bu talep 48 saati aşkın süredir açık.</span>
          </div>
        )}

        {/* Planlanan gönderim saati geçti ama parça hâlâ yolda değil.
            Müşteriye tarih verildiği için bu, tutulmamış bir söz. */}
        {gonderimGecikti(talep) && (
          <div className="uyari">
            <GonderimGecikti talep={talep} />
            <span>
              Gönderilecek: planlanan tarih {talep.plan.tarihYazi} idi,
              üzerinden {gonderimGecikmeSaati(talep)} saat geçti ve parça
              hâlâ gönderilmedi.
            </span>
          </div>
        )}

        <div className="suzgec" style={{ marginBottom: kilitli ? 8 : 20 }}>
          {talepDurumlari(talep.tur).map((d) => {
            const engel = parcaIlerlemeEngeli(talep, d.id)
            return (
              <button
                key={d.id}
                className={
                  'cip' +
                  (suanki === d.id ? ' cip--on' : '') +
                  (engel ? ' cip--kilitli' : '')
                }
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

        <BayiDurumu talep={talep} />

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
            <S k="Seri numarası" v={formatSerial(talep.makine.serial)} mono />
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
          <S k="Balyalanacak ürün" v={talep.urunTipi} />
          <S k="Arazi" v={talep.arazi} />
          <S k="Traktör Gücü" v={talep.traktor} />
          <S k="İlgilendiği Ürün" v={talep.urunId ? getProduct(talep.urunId)?.name : ''} />
          {talep.aciklama && (
            <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0 0' }}>{talep.aciklama}</p>
          )}
          {/* Ses kaydı ya da yazıya çevrilmiş hâli — biri varsa bölüm
              açılıyor. Demo kayıtlarında sesin kendisi yok (megabaytlarca
              base64 tarayıcıyı doldururdu), yalnız süresi ve metni var. */}
          {talep.ses && (
            <div style={{ marginTop: 12 }}>
              <div className="alan__ad">
                Sesli Not{talep.ses?.sure ? ' · ' + talep.ses.sure + ' sn' : ''}
              </div>
              {talep.ses?.veri ? (
                <audio controls src={talep.ses.veri} style={{ width: '100%' }} />
              ) : (
                <div className="kucuk sonuk">Ses kaydı bu kayıtta saklanmıyor.</div>
              )}

            </div>
          )}

          <Ekler ekler={talep.ekler} />
        </Bolum>

        {/* ------------------------------------- Müşterinin sonradan eklediği

            Talep gönderildikten SONRA müşterinin uygulamadan eklediği
            not, ses ve dosyalar. İlk gönderimin ekleriyle karışmasın
            diye ayrı bölümde ve her biri kendi zaman damgasıyla
            duruyor (bkz. src/lib/talepEkleme.js).

            Personel için önemli: talep okunduktan sonra gelen bilgi
            olabilir. Sıra yeniden eskiye — en yeni ekleme üstte. */}
        {talep.eklemeler?.length > 0 && (
          <Bolum ad={`Müşterinin Sonradan Eklediği · ${talep.eklemeler.length}`}>
            <div className="zaman">
              {[...talep.eklemeler]
                .sort((a, b) => b.tarih - a.tarih)
                .map((e) => (
                  <div key={e.id} className="zaman__a">
                    <div className="kucuk sonuk">{tarihYaz(e.tarih)}</div>
                    {e.not && (
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{e.not}</div>
                    )}
                    {e.ses?.veri && (
                      <audio
                        controls
                        src={e.ses.veri}
                        style={{ width: '100%', marginTop: 8 }}
                      />
                    )}
                    {e.ekler?.length > 0 && <Ekler ekler={e.ekler} />}
                  </div>
                ))}
            </div>
          </Bolum>
        )}

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
                {/* TDK'ye göre "unvan"; etikette "Ünvan" yazıyordu. */}
                <S k="Unvan" v={talep.fatura.unvan} />
                <S k="Vergi numarası" v={talep.fatura.vergiNo} mono />
              </>
            ) : (
              <>
                <S k="Ad Soyad" v={talep.fatura.ad} />
                <S k="T.C. kimlik numarası" v={talep.fatura.tc} mono />
              </>
            )}
            <S k="Fatura telefonu" v={talep.fatura.tel} mono />
            {talep.fatura.farkliKisi && (
              <div className="uyari" style={{ marginTop: 8 }}>
                Fatura, uygulamayı kullanan kişiden BAŞKASININ adına kesilecek.
              </div>
            )}

            <div className="alan__ad" style={{ marginTop: 14, marginBottom: 6 }}>
              Teslimat adresi
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
        {/* Bayi ZATEN EŞLEŞMİŞSE aday listesi çıkmıyor. Bu bölüm
            konumdan üç aday hesaplıyor; talebin düştüğü bayi bunlardan
            biri olmayabilir (bayi listesi değişmiş ya da talep bayinin
            kendi kaydından açılmış olabilir). İkisi birden ekranda
            durunca personel yanlış bayiyi arıyordu. Eşleşme varsa
            yukarıdaki "Bayi" bölümü zaten doğrusunu yazıyor. */}
        {talep.tur === 'satinalma' && !talep.bayi && <TalepBayileri talep={talep} />}

        {/* Verilen teklif — müşterinin cevabı beklenirken burada duruyor */}
        {talep.teklif && (
          <Bolum ad="Verilen Teklif">
            <S k="Teklif tutarı" v={paraliYaz(talep.teklif.tutar)} />
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
            <S k="Planlanan tarih" v={talep.plan.tarihYazi} />
            <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{talep.plan.is}</p>
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.plan.personel} · {tarihYaz(talep.plan.kayitTarihi)}
            </div>
          </Bolum>
        )}

        {talep.cozum && (
          <Bolum ad={talep.tur === 'satinalma' ? 'Teklif sonucu' : 'Yapılan iş'}>
            {(KAPANIS_ALANLARI[talep.tur] || KAPANIS_ALANLARI.servis).map((a) =>
              a.uzun ? (
                talep.cozum[a.ad] ? (
                  <p key={a.ad} style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>
                    {talep.cozum[a.ad]}
                  </p>
                ) : null
              ) : (
                <S
                  key={a.ad}
                  k={a.etiket}
                  v={a.para ? paraliYaz(talep.cozum[a.ad]) : talep.cozum[a.ad]}
                />
              )
            )}

            {/* KAPANIŞ ÖZETİ — BOŞ KUTUYA KARŞI.

                Bayinin kapattığı yedek parça talebi yalnız `ozet`
                alanına yazılıyordu; backoffice'in okuduğu alanların
                hiçbiri dolu değildi. Sonuç: kapanmış talepte "Yapılan
                iş" başlığı ve altında yalnız imza satırı görünüyordu.
                Bayinin yazdığı kargo takip numarası dâhil hiçbir şey
                okunmuyordu.

                Bayi tarafı düzeltildi ve artık ortak alanı yazıyor.
                Bu satır ESKİ kayıtlar için duruyor: alanların hepsi
                boşsa özet gösteriliyor, kayıt kaybolmuyor. */}
            {kapanisBos(talep) && talep.cozum.ozet && (
              <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{talep.cozum.ozet}</p>
            )}

            {/* Kapanışta PAKSAN'a bedelsiz parça faturası çıkarıldıysa
                numarası burada: talebin karşılığı olan garanti
                siparişi, Bayi Siparişleri ekranında bu numarayla
                aranıyor. */}
            {talep.cozum.garantiNo && (
              <S k="Garanti talebi" v={talep.cozum.garantiNo} mono />
            )}

            {/* Servis fişi. Kapanışta yüklendiyse burada duruyor;
                garanti tartışmasında ya da müşteri itirazında
                gösterilecek belge bu. */}
            {talep.cozum.fis && <ServisFisi fis={talep.cozum.fis} />}

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
            placeholder="İç not…"
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
            uygulamasında görünür ve bildirim gönderilir.
          </p>
        </Bolum>

        {onay && (
          <Onay
            baslik="Durumu değiştir"
            metin={
              kapali
                ? `${talep.no} kapanmış bir talep. Durumu "${durumBilgi(onay).ad}" olarak değişecek; müşteriye bildirim GÖNDERİLMEYECEK.`
                : bildirimsizMi(onay)
                  ? `${talep.no} talebi bir önceki aşamaya, "${durumBilgi(onay).ad}" durumuna alınacak. Geriye alma bir düzeltmedir; müşteriye bildirim GÖNDERİLMEYECEK.`
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

        {notOnay && (
          <Onay
            baslik="Notu müşteriye gönder"
            metin={`Aşağıdaki yazı ${talep.ad || 'müşteriye'} olduğu gibi gönderilecek ve telefonuna bildirim gönderilecek. Gönderilen not geri alınamaz.\n\n"${not.trim()}"`}
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
            metin={`${talep.no} talebinin ödemesi onaylanacak. Dekontu ve hesaba geçen tutarı kontrol ettiğinizden emin olun. Müşteriye "ödemeniz alındı" bildirimi gönderilecek.`}
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

/* ==========================================================================
   Excel sütunları

   BAŞLIK VE HÜCRE TEK TANIMDAN ÜRETİLİYOR. Önce başlıklar bir dizide,
   hücreler ayrı bir fonksiyonda duruyordu. Role göre sütun çıkarmak
   gerekince bu ayrım tehlikeli hâle geldi: biri süzülüp öbürü
   süzülmezse bütün sütunlar kayar ve kimse fark etmez — telefon
   numarası "İl" sütununda görünür. Artık her sütun kendi adını ve
   kendi değerini birlikte taşıyor.

   TALEP TÜRÜNE GÖRE SÜZME

   Bir rolün hiç bakmadığı sütunlar dosyaya girmiyor. Bunlar zaten o
   rolün gördüğü taleplerde boş kalan sütunlar; satış personelinin
   Excel'inde "Ödeme onayı" diye boş bir sütun taşımanın anlamı yok.

   SÜZGEÇ ROL KİMLİĞİNE DEĞİL, TALEP TÜRÜNE BAKIYOR. Önceden her sütun
   hangi rollerden gizleneceğini kimlikleriyle listeliyordu. Roller
   ekrandan oluşturulabildiği için o liste eksik kalıyordu: yeni
   oluşturulan bir rol bütün sütunları alıyordu ve kimse fark
   etmiyordu.

   Artık sütun hangi talep türleri için ANLAMLI olduğunu belirtiyor;
   rolün gördüğü tür bununla karşılaştırılıyor. Bütün türleri gören rol —
   admin, yönetici ya da sonradan açılan bir rol — bütün sütunları
   alıyor.

   "AÇIKLAMA" HİÇBİR ROLDEN GİZLENMİYOR. Müşterinin kendi yazdığı metin
   her türde dolu ve her role lazım: satış talebinde "ne balyalayacağım,
   arazim nasıl" orada yazıyor. Gizlenseydi satış personeli müşterinin
   anlattığını Excel'de göremezdi. */
const AKTAR_SUTUNLARI = [
  { ad: 'Talep numarası', deger: (t) => t.no },
  { ad: 'Tür', deger: (t) => TALEP_ADI[t.tur] || t.tur },
  { ad: 'Durum', deger: (t) => durumBilgi(t.status).ad },
  { ad: 'Tarih', deger: (t) => tarihSaat(t.createdAt)[0] },
  { ad: 'Saat', deger: (t) => tarihSaat(t.createdAt)[1] },
  { ad: 'Müşteri', deger: (t) => t.ad || '' },
  { ad: 'Telefon', deger: (t) => t.tel || '' },
  { ad: 'İl', deger: (t) => t.il || '' },
  { ad: 'İlçe', deger: (t) => t.ilce || '' },
  {
    ad: 'Makine',
    deger: (t) => (t.makine ? getProduct(t.makine.productId)?.name || '' : ''),
  },
  {
    ad: 'Seri numarası',
    deger: (t) => (t.makine?.serial ? formatSerial(t.makine.serial) : ''),
  },

  /* ------------------------------------------------------ Servis tarafı */
  /* Kimlik değil okunur karşılık: Excel'e "sorunlu" gidiyordu. */
  { ad: 'Makinenin durumu', deger: (t) => makineDurumAdi(t.durum), turler: ['servis', 'parca'] },
  {
    ad: 'Belirtiler',
    deger: (t) => (t.belirtiler || []).join(' · '),
    turler: ['servis', 'parca'],
  },

  /* ------------------------------------------------ Yedek parça tarafı */
  { ad: 'İstenen parçalar', deger: (t) => parcaYazisi(t), turler: ['parca'] },

  { ad: 'Açıklama', deger: (t) => t.aciklama || '' },
  { ad: 'Aranma tercihi', deger: (t) => t.ulasim || '' },
  {
    ad: 'Ek sayısı',
    deger: (t) => String((t.ekler || []).length + (t.ses?.veri ? 1 : 0)),
  },

  /* ------------------------------------------- Fiyat teklifi ve satış */
  { ad: 'Teklif tutarı', deger: (t) => t.teklif?.tutar || '', turler: ['satinalma'] },
  {
    ad: 'Teklif tarihi',
    deger: (t) => (t.teklif?.tarih ? tarihYaz(t.teklif.tarih, false) : ''),
    turler: ['satinalma'],
  },
  { ad: 'Sonuç', deger: (t) => t.cozum?.sonuc || '', turler: ['satinalma'] },
  {
    ad: 'Satış fiyatı',
    deger: (t) => t.cozum?.satisFiyati || '',
    turler: ['satinalma'],
  },

  /* ------------------------------- Ödeme ve gönderim (yedek parçada) */
  {
    ad: 'Fatura tipi',
    deger: (t) => (t.fatura ? (t.fatura.tuzel ? 'Tüzel' : 'Gerçek') : ''),
    turler: ['servis', 'parca'],
  },
  {
    ad: 'Fatura adı',
    deger: (t) => (t.fatura ? (t.fatura.tuzel ? t.fatura.unvan : t.fatura.ad) || '' : ''),
    turler: ['servis', 'parca'],
  },
  {
    ad: 'Ödeme onayı',
    deger: (t) => (t.odemeOnay ? tarihYaz(t.odemeOnay.tarih, false) : ''),
    turler: ['servis', 'parca'],
  },

  /* --------------------------------------------------- Kapanış ve bayi

     YAPILAN İŞ EXCEL'E HİÇ GİTMİYORDU. Oysa kapanış kaydı bu projedeki
     en değerli veri: hangi modelde hangi parça kaçıncı yılda
     bozuluyor sorusunun cevabı orada birikiyor. Ekranda görünüyor,
     dosyaya inmiyordu — yani hiçbir yerde toplanamıyordu.

     Bayi sütunu da aynı sebeple burada: talebin kimde olduğu listede
     yazıyor, dosyada yazmıyordu. */
  {
    ad: 'Yapılan iş',
    deger: (t) =>
      t.cozum ? t.cozum.yapilanIs || t.cozum.ozet || '' : '',
    turler: ['servis', 'parca'],
  },
  { ad: 'Kapanış notu', deger: (t) => t.cozum?.not || '' },
  {
    ad: 'Kapanış tarihi',
    deger: (t) => (t.cozum?.tarih ? tarihYaz(t.cozum.tarih, false) : ''),
  },
  { ad: 'Bayi', deger: (t) => t.bayi?.ad || '' },
  {
    ad: 'Talep kimde',
    deger: (t) =>
      t.bayi && (t.sahip || 'paksan') === 'bayi' ? 'Bayide' : markaEk('da'),
  },

  { ad: 'İptal sebebi', deger: (t) => t.iptalBilgi?.neden || '' },
]

/** Rolün göreceği sütunlar; rolün gördüğü talep türüne göre süzülüyor. */
export function aktarSutunlari(rol) {
  const tur = rolBilgi(rol).talepTuru
  /* Bütün türleri gören rolde süzme yok. */
  if (!tur) return AKTAR_SUTUNLARI
  return AKTAR_SUTUNLARI.filter((x) => !x.turler || x.turler.includes(tur))
}

/* Kapanışta yüklenen servis fişi.

   Dosyanın kendisi IndexedDB'de (eklerle aynı yol); burada yalnız
   kimliği duruyor. Adres asenkron çözüldüğü için düğme adres gelene
   kadar sönük. */
function ServisFisi({ fis }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let iptal = false
    ekAdresi(fis.id).then((a) => {
      if (!iptal) setAdres(a)
    })
    return () => {
      iptal = true
    }
  }, [fis.id])

  return (
    <div className="fis" style={{ marginTop: 10 }}>
      <span className="fis__ad">{fis.ad}</span>
      <span className="kucuk sonuk">{boyutYaz(fis.boyut)}</span>
      <a
        className="dg dg--kucuk"
        href={adres || undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!adres}
      >
        {adres ? 'Aç' : '…'}
      </a>
    </div>
  )
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

/* Gönderim tarihi geçmiş parça talebi işareti.

   Gecikme ünlemi (kimse bakmadı) ve kum saati (müşteri dönmedi) ile
   karışmasın diye ayrı simge ve ayrı renk: burada top PERSONELDE,
   verilen tarih geçmiş. */
function GonderimGecikti({ talep }) {
  const saat = gonderimGecikmeSaati(talep)
  return (
    <span
      className="gonderilecek"
      title={`Planlanan gönderim ${talep.plan?.tarihYazi} idi, ${saat} saat geçti`}
      aria-label="Gönderilecek — planlanan tarih geçti"
    >
      📦
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

/* Tutarın yanına para birimi.

   Aynı panelde "4.200 TL" ile "1.850.000" yan yana duruyordu; ikincisi
   birim taşımıyordu. Servis ücreti her zaman sayı olmadığı için
   ("Garanti kapsamında") yalnız rakamlardan oluşan değere ekleniyor.
   Müşteri uygulamasındaki kuralın aynısı (bkz. screens/RequestDetail). */
function paraliYaz(deger) {
  const s = String(deger ?? '').trim()
  if (!s) return ''
  return /^[\d.\s]+$/.test(s) ? `${s} ${PARA_BIRIMI}` : s
}

/* Kapanış alanlarının hepsi boş mu? Boşsa `cozum.ozet` gösteriliyor —
   gerekçesi kapanış bölümünde yazılı. */
function kapanisBos(talep) {
  const alanlar = KAPANIS_ALANLARI[talep.tur] || KAPANIS_ALANLARI.servis
  return alanlar.every((a) => !String(talep.cozum?.[a.ad] ?? '').trim())
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
    { ad: 'yapilanIs', etiket: 'Yapılan iş', uzun: true, zorunlu: true,
      ipucu: 'Örnek: düğüm ipi mekanizması ayarlandı, pikap dişi değişti' },
    { ad: 'parcalar', etiket: 'Değişen parça', ipucu: 'Pikap dişi, düğüm ipi' },
    { ad: 'ucret', etiket: 'Ücret', para: true, ipucu: 'Garanti kapsamında / 1250' },
    /* NOT ALANI BACKOFFICE'TE YOKTU. Bayi servis kapanışında not
       yazabiliyor (bkz. lib/bayiServis.js) ve o not müşterinin
       uygulamasında görünüyordu; PAKSAN'ın ekranında görünmüyordu.
       Müşterinin okuduğu bir şeyi üreticinin okuyamaması. */
    { ad: 'not', etiket: 'Not', uzun: true,
      ipucu: 'Müşteriyle konuşulanlar, sonraki bakımda dikkat edilecekler' },
  ],
  /* Yedek parça kapanışında TUTAR SORULMUYOR.

     Parça bedeli talebin en başında, müşteri tarafından ödeniyor ve
     tutarı fiyat listesinden belli (bkz. src/data/parcaFiyat.js).
     Kapanışta bir kez daha sormak, aynı rakamı ikinci kez ve elle
     yazdırmak demekti; iki kayıt tutmayınca da hangisinin doğru olduğu
     belirsizleşiyordu. */
  /* YEDEK PARÇA KAPANIŞINDA PERSONEL BİR ŞEY YAZMIYOR.

     "Yapılan İş" boş bir kutuydu ve zorunluydu; personel her
     seferinde "parçalar kargoya verildi" diye aynı cümleyi
     yazıyordu. Bilgi taşımayan, yalnızca zorunlu olduğu için
     doldurulan bir alandı.

     Şimdi orada müşterinin sipariş ettiği parçalar kendiliğinden
     yazıyor (`oto` alanı: okunur, yazılmaz). Fazladan bir şey
     yapıldıysa altındaki isteğe bağlı nota yazılıyor. */
  parca: [
    /* `uzun` yalnız OKUMA tarafını etkiliyor: talep detayında etiketsiz
       paragraf oluyor, çünkü bölüm başlığı zaten "Yapılan iş" diyordu
       ve etiket aynı kelimeyi ikinci kez yazıyordu. Formda `oto` önce
       geldiği için alan yine okunur kutu olarak çıkıyor. Servis
       tarafındaki aynı alan zaten böyle. */
    { ad: 'yapilanIs', etiket: 'Yapılan iş', uzun: true, oto: (talep) => parcaYazisi(talep) },
    { ad: 'not', etiket: 'Not', uzun: true,
      ipucu: 'Fazladan bir şey yapıldıysa yazın — eksik gönderim, değişen parça, müşteriyle konuşulan' },
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
    /* Sonuç "Satış oldu" ise fiyat ZORUNLU. Rakamsız kapatılan satış
       kaydı raporlarda ciro hesabını bozuyordu: satış görünüyor ama
       tutarı yok. Diğer sonuçlarda (vazgeçti, rakibe gitti) fiyat
       diye bir şey olmadığı için sorulmuyor. */
    { ad: 'satisFiyati', etiket: 'Sonuçlanan Satış Fiyatı', para: true,
      zorunluEger: (d) => d.sonuc === 'Satış oldu',
      ipucu: 'Örnek: 1780000' },
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
  /* Yedek parçada "yapılan iş" gönderilen parçaların kendisi; not
     yazıldıysa işlem kaydında o da görünsün. */
  if (tur === 'parca') {
    return [deger.yapilanIs, deger.not].filter(Boolean).join(' · ')
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

/* Talebin şu an kimde olduğunu gösteren satır.

   Talep bayiye düşse de bu listeden çıkmıyor; personel her talebi
   görüyor. Bu etiket "buna kim bakıyor" sorusunu cevaplıyor, yoksa
   personel bayinin ilgilendiği talebe de aynı anda dokunur ve müşteri
   iki yerden aranır.

   Bayisi olmayan talepte hiçbir şey yazmıyor: satırda gereksiz gürültü
   olmasın, "PAKSAN'da" zaten varsayılan durum. */
function SahiplikEtiketi({ talep }) {
  if (!talep.bayi) return null
  const devredildi = (talep.sahip || 'paksan') === 'paksan'
  return (
    <div className="kucuk sonuk" style={{ marginTop: 2 }}>
      {devredildi ? `Devredildi · ${talep.bayi.ad}` : `Bayide · ${talep.bayi.ad}`}
    </div>
  )
}

/* ==========================================================================
   Talebe bakan bayi

   BU BÖLÜM DETAYDA HİÇ YOKTU. Listede satırın altında "Bayide · X"
   yazıyordu ama personelin çalıştığı yer sağ paneldi; talebi açınca
   hangi bayinin ilgilendiği, telefonu, ne zaman düştüğü kayboluyordu.
   Bayiyi aramak için listeye geri dönmek gerekiyordu.

   DEVİR SEBEBİ DE BURADA. Bayi "bunu ben çözemiyorum" deyip talebi
   PAKSAN'a bıraktığında sebebini yazıyor (bkz. veri.js →
   destekTalepEt). O sebep bayi panelinde görünüyordu, backoffice'te
   hiçbir yerde görünmüyordu — devir süzgeci vardı ama içeriği yoktu.
   Oysa devrin tek anlamı o cümlede.

   Telefon TIKLANABİLİR DEĞİL; gerekçesi TalepBayileri'nde yazılı.
   ========================================================================== */
function BayiDurumu({ talep }) {
  if (!talep.bayi) return null

  const kayit = bayileriGetir().find((b) => b.id === talep.bayi.id) || null
  const paksanda = (talep.sahip || 'paksan') === 'paksan'

  return (
    <Bolum ad="Bayi">
      {/* Ad ile rozet aynı satırda: bölüm başlığı zaten "Bayi" diyor,
          altına bir de "Bayi" etiketi koymak aynı kelimeyi iki kez
          yazmak demekti. Rozet, talebin ŞU AN kimde olduğunu
          söylüyor. */}
      <div className="satir" style={{ gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <b>{talep.bayi.ad}</b>
        <span
          className={'rz rz--' + (paksanda ? 'turuncu' : 'mavi')}
          style={{ marginLeft: 'auto' }}
        >
          {paksanda ? markaEk('da') : 'Bayide'}
        </span>
      </div>

      {kayit && <S k="Konum" v={[kayit.ilce, kayit.il].filter(Boolean).join(' / ')} />}
      {kayit && <S k="Telefon" v={kayit.telYazi || kayit.tel} mono />}
      <S k="Bayiye düştü" v={talep.bayi.tarih ? tarihYaz(talep.bayi.tarih) : ''} />

      {talep.devir && (
        <div className="uyari" style={{ marginTop: 12, marginBottom: 0, display: 'block' }}>
          <b>Bayi bu talep için {markaEk('dan')} destek istedi.</b>
          {talep.devir.neden && (
            <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{talep.devir.neden}</p>
          )}
          <div className="kucuk" style={{ marginTop: 8 }}>
            {[talep.devir.bayiAd, talep.devir.tarih ? tarihYaz(talep.devir.tarih) : '']
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      )}
    </Bolum>
  )
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
            <span className="alan__ad">Planlanan tarih ve saat</span>
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
              <span>Randevunun gün ve saati müşteriyle görüşüldü</span>
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
                if (!tarih) return setHata('Planlanan tarih ve saati seçin.')
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
  /* `oto` alanları talepten okunuyor ve baştan dolu geliyor. */
  const [deger, setDeger] = useState(() => {
    const bas = {}
    for (const a of alanlar) if (a.oto) bas[a.ad] = a.oto(talep)
    return bas
  })
  const [hata, setHata] = useState('')

  /* SERVİS FİŞİ — yalnız servis taleplerinde.

     Teknisyen işi sahada bitirip fişi orada dolduruyor. Fiş bugüne
     kadar kâğıt olarak kalıyordu; talebin kaydında işin belgesi
     bulunmuyordu. Garanti tartışmasında ya da müşteri "böyle bir işlem
     yapılmadı" dediğinde gösterilecek bir şey yoktu.

     ZORUNLU DEĞİL. Şebekenin çekmediği yerde fiş yüklenemeyebilir,
     bazı işlerde fiş kesilmemiş olabilir. Ama fişsiz kapatmak da fark
     edilmeden geçmemeli — onay soruluyor. */
  const fisliMi = talep.tur === 'servis'
  const [fis, setFis] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [fisOnayi, setFisOnayi] = useState(false)

  async function fisSec(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    if (dosya.size > 10 * 1024 * 1024) {
      return setHata('Servis fişi en fazla 10 MB olabilir.')
    }
    setHata('')
    setYukleniyor(true)
    try {
      const id = await ekYaz(dosya)
      setFis({
        id,
        ad: dosya.name,
        boyut: dosya.size,
        tur: dosya.type.startsWith('image/') ? 'gorsel' : 'pdf',
      })
    } catch {
      setHata('Servis fişi kaydedilemedi, tekrar deneyin.')
    }
    setYukleniyor(false)
  }

  /* Bir alan şu an zorunlu mu? Bazıları her zaman (`zorunlu`),
     bazıları başka bir alanın değerine bağlı (`zorunluEger`) —
     satış fiyatı yalnız sonuç "Satış oldu" iken isteniyor. */
  function zorunluMu(a) {
    return Boolean(a.zorunlu) || Boolean(a.zorunluEger && a.zorunluEger(deger))
  }

  /* Alanlar tamam mı? Kaydet düğmesi ve fişsiz onayı aynı denetimi
     kullanıyor; iki yerde ayrı yazılırsa biri unutulur.

     Para alanında uzunluk değil RAKAM aranıyor: "50" iki karakter
     ama geçerli bir tutar. */
  function eksikAlan() {
    return alanlar.find((a) => {
      if (!zorunluMu(a)) return false
      const v = String(deger[a.ad] || '').trim()
      return a.para ? !/\d/.test(v) : v.length < 3
    })
  }

  function kaydet() {
    const temiz = {}
    alanlar.forEach((a) => (temiz[a.ad] = String(deger[a.ad] || '').trim()))
    onKaydet({ ...temiz, fis, ozet: kapanisOzeti(talep.tur, temiz) })
  }

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
                {!a.oto && !zorunluMu(a) && (
                  <span className="sonuk"> · isteğe bağlı</span>
                )}
              </span>

              {a.oto ? (
                /* Okunur alan: talepten geliyor, personel değiştirmiyor.
                   Yazılabilir bırakmak, kayıtta müşterinin sipariş
                   ettiğinden başka bir şey görünmesine yol açardı. */
                <div className="alan__oto">{deger[a.ad] || '—'}</div>
              ) : a.uzun ? (
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

          {fisliMi && (
            <div className="alan">
              <span className="alan__ad">
                Servis Fişi<span className="sonuk"> · isteğe bağlı</span>
              </span>

              {fis ? (
                <div className="fis">
                  <span className="fis__ad">{fis.ad}</span>
                  <span className="kucuk sonuk">{boyutYaz(fis.boyut)}</span>
                  <button className="dg dg--kucuk" onClick={() => setFis(null)}>
                    Kaldır
                  </button>
                </div>
              ) : (
                <label className="dg dg--dosya">
                  {yukleniyor ? 'Yükleniyor…' : 'Fiş yükle · PDF veya fotoğraf'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={fisSec}
                    hidden
                  />
                </label>
              )}
            </div>
          )}

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                const eksik = eksikAlan()
                if (eksik) return setHata(eksik.etiket + ' alanını doldurun.')
                /* Fiş yoksa önce sorulur; onaylanırsa kapanır. */
                if (fisliMi && !fis) return setFisOnayi(true)
                kaydet()
              }}
            >
              Kapat ve kaydet
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>

      {fisOnayi && (
        <Onay
          baslik="Servis fişi yüklenmedi"
          metin="Servis fişi yüklenmedi. Servis fişi olmadan kapatmak istediğinizden emin misiniz?"
          onVazgec={() => setFisOnayi(false)}
          onOnayla={() => {
            setFisOnayi(false)
            kaydet()
          }}
        />
      )}
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
            <span className="alan__ad">Teklif tutarı</span>
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
            Müşteri {TEKLIF_BEKLEME_GUN} gün içinde yanıt vermezse bu talep listede işaretlenir.
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
              Müşteri "talebim neden iptal oldu?" sorusunun yanıtını burada okuyacak.
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
