import { useEffect, useMemo, useRef, useState } from 'react'
import {
  durumBilgi, gecikmisMi, gecmisDurumu, gonderimGecikti, gonderimGecikmeSaati,
  GORUNEN_DURUMLAR, gorunenDurum,
  izinli, KAPALI_DURUMLAR, musterininDigerTalepleri,
  odemeOnayla, parcaIlerlemeEngeli, rolBilgi, rolunTalepleri, rolunTurleri, TALEP_ADI,
  talepDurumDegistir,
  elleSecilebilirDurumlar, talepDurumlari, talepIptal, talepKapat, talepleriGetir,
  talepNotEkle, talepPlanla, talepTeklifVer, teklifBeklemeGunu, teklifBekliyorMu,
  TEKLIF_BEKLEME_GUN, talebiBayiyeAta, bayiAtamasiniKaldir,
  hakkedisOnayla, hakkedisDuzelt, hakkedisReddet, servisParcasiGonderildi, musteriKargosunuGuncelle,
  hakkedisIlerlemeEngeli,
  islemYaz,
  kalanParcalariGonder, kalanParcalariIptalEt, siparisHesabi,
  bildirimAlicilari, durumKilidi, bakiyeDurumu,
} from '../veri'
import { makineninServisi } from '../../lib/servisAtama'
import {
  acikServisTalebiMi, makineAnahtari, makineninAcikServisTalepleri,
} from '../../lib/makineTalepleri'
import { gonderilenTutar, siparisNetTutari } from '../../lib/servisFiyat'
import { KDV_HARIC_LISTE, KDV_ORANI } from '../../marka'
/* Kodlu biçim: yedek parça personeli 538 parçalık katalogta hangi
   kaydı hazırlayacağını addan çıkaramıyor. */
import {
  duzeltmeYazisi,
  iscilikAlanlari,
  iscilikYazisi,
  KAPI,
  parcaYazisiKodlu as kayitParcaYazisi,
  saatGirdisi,
  saatYaz as sureYaz,
  talebinParcalari,
  kmUcretiOku,
  saatUcretiOku,
  siparisGonderimi,
  temizParcalar,
} from '../../lib/servisKaydi'
import { ParcaTablosu } from '../../components/ParcaTablosu'
import { ParcaResmi, useParcaKatalogu } from '../../components/ParcaResmi'
import {
  bizdeGecikmisMi, odemeOnayiBekliyorMu, parcaHazirliktaMi, servisteGecikmisMi,
} from '../bekleyenIs'
import { useVeri } from '../kanca'
import {
  Baslik, Bekleme, Bos, DurumRozet, saatYaz, Sayfalama, siraliListe, SiraliBaslik,
  tarihSaat, tarihYaz, useSiralama,
  durumYazisi,
} from './ortak'
import { DisaAktar } from './aktar'
import { boyutYaz, ekAdresi, ekYaz } from '../../lib/ekler'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { Dekont, Ekler } from './Ekler'
import { getProduct, markaEk } from '../../marka'
import { formatSerial, warrantyStatus } from '../../lib/serial'
import { ileriTarihMi, metindeGecmisTarihVar, simdiGirdi } from '../../lib/tarih'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { BANKA } from '../../marka'
import { servisleriGetir, bayileriGetir, MARKA } from '../../marka'
import { PARA_BIRIMI, paraYaz } from '../../marka'
import { kayitTelGoster, telFirma } from '../../lib/tel'
import { teslimatTelYaz } from '../../lib/teslimat'

/* Talepler listesinde bir sayfadaki kayıt sayısı (bkz. ortak.jsx → Sayfalama). */
const SAYFA_BOYU = 10

/* Okuma hatası satırı.

   "Kayıt yok" ile "kayıt okunamadı" ayrı şeyler ve önceden ikisi de
   "Talep yok." yazıyordu: personel bekleyen talebi olmadığını sanıp
   kuyruğu kapatıyordu. Satır artık arızayı söylüyor ve ne yapacağını
   da söylüyor — cevabı olmayan bir hata mesajı, hata mesajı değil. */
const OKUMA_HATASI = 'Talep kayıtları okunamadı. Sayfayı yenileyin; sorun sürerse yöneticinize haber verin.'

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
    /* Sahiplik de sıfırlanıyor. Açık kalmış "Serviste" süzgeci
       dashboard'dan gelen sayıyla listeyi uyumsuz hâle getiriyordu:
       kutuda 35 yazıyor, listede 12 kayıt çıkıyordu. */
    setSahiplik(sorgu.sahiplik ?? 'hepsi')
    setAra(sorgu.ara ?? '')
    /* Başka ekrandan belirli bir talep açılabiliyor (Müşteriler →
       müşterinin talepleri). Seçim, bulunduğu sayfaya geçişi de
       tetikliyor (aşağıdaki sayfa etkisi). */
    setSecili(sorgu.talep ?? null)
  }, [sorgu])

  /* OKUMA HATASI "KAYIT YOK" DİYE GÖRÜNMÜYOR.

     `useVeri` baştan beri bir `hata` değeri döndürüyor (bkz. kanca.js)
     ama hiçbir ekran onu almıyordu: okuma patladığında liste boş
     geliyor ve ekranda "Talep yok." yazıyordu. Personel o an doğru
     kararı veriyor — yeni talep gelmemiş diye bırakıyor; oysa elde
     bekleyen talepler var ve kimse görmüyor.

     "Yok" ile "okunamadı" ayrı iki cevap. Sunucuya geçildiğinde bu
     ayrım daha da pahalı: ağ hatası, boş kuyruk gibi görünürdü. */
  const { veri: kendiTalepleri, yukleniyor, hata } = useVeri(
    () => rolunTalepleri(talepleriGetir(), rol),
    [surum, rol],
    []
  )

  /* AYNI MAKİNEDE İKİ AÇIK İŞ (25 Eylül 2026, kullanıcı sınaması O5).
     Aynı makineye farklı servislerden ya da farklı telefonlardan açılmış
     iki servis talebi yan yana duruyordu; "Aktif diğer talepler" telefona
     baktığı için birbirini görmüyorlardı. Sayım rolün kendi listesinden:
     öteki masanın talebi bu ekranda gösterilmiyor (22 Eylül kuralı).
     "Açık" tanımı üç üründe tek yerden (lib/makineTalepleri.js); onay
     bekleyen iş de açık, çünkü ödenmedi. */
  const ayniMakinede = useMemo(() => {
    const say = new Map()
    for (const t of kendiTalepleri) {
      const a = acikServisTalebiMi(t) ? makineAnahtari(t.makine) : null
      if (a) say.set(a, (say.get(a) || 0) + 1)
    }
    return (t) => acikServisTalebiMi(t) && (say.get(makineAnahtari(t.makine)) || 0) > 1
  }, [kendiTalepleri])

  /* Rolün türleri: null = hepsi. Birden çok tür görebilen rolde (21 Eylül
     2026'dan beri) süzgeç o türleri ve "Her tür"ü sunuyor. */
  const rolTurleri = rolunTurleri(rol)
  const tumTurler = rolTurleri === null
  const turSecenegi = tumTurler ? Object.keys(TALEP_ADI) : rolTurleri
  const tekTur = turSecenegi.length === 1 ? turSecenegi[0] : null

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
  const suzgecTuru = tekTur || tur
  /* ONAY VE PARÇA BEKLEYEN SÜZGEÇTE VAR (22 Eylül 2026). `talepDurumlari`
     elle SEÇİLEBİLEN durumları veriyor; bu ikisini servis kaydı kuruyor,
     personel seçemiyor (ELLE_SECILMEZ). Süzgeç ise aramak için: liste
     o işlevden kurulunca tek türe bağlı rolde (servis masası) "Onay
     Bekliyor" hiç çıkmıyordu, Dashboard'dan ya da Genel Bakış'tan o
     listeye gelen personel "Açık olanlar"a düşüyordu.

     SÜZGEÇ ROZETLE AYNI ADLARI KULLANIYOR (24 Eylül 2026, kullanıcının
     isteği). "Parça Bekleniyor" seçeneği iki rozeti ("Parça Bekleniyor",
     "Parça Yolda") birden listeliyordu, "Parça hazırlığı bekleyenler"
     kısayolu da rozeti "Parça Bekleniyor" olan satırları. Artık seçenek
     listesi rozetin kendisi: "Parça Hazırlanıyor" ve "Parça Yolda" iki
     ayrı seçenek (veri.js → GORUNEN_DURUMLAR, gorunenDurum); eski
     kısayol birincisinin içinde eridi, anahtarı aynı ('parcaHazirlik').

     KARŞILIĞI OLMAYAN SEÇENEK ÇIKMIYOR. Onay ve parça durumları yalnız
     servis talebinde oluşuyor: admin türü "Yedek parça" seçince listede
     kalıyorlardı ve seçilince liste boş geliyordu. Yedek parça masasının
     rolü (tek tür: parça) bu durumları görüyor, çünkü servis talebinin
     parçası onun masasına düşüyor (bkz. veri.js → rolunTalepleri).
     "Ödeme onayı bekleyenler" müşterinin parça talebine ait; servis
     talebinde yok. */
  const teklifVar = !suzgecTuru || suzgecTuru === 'hepsi' || suzgecTuru === 'satinalma'
  const servisDurumlariVar = suzgecTuru !== 'satinalma' && !(tur === 'parca' && !tekTur)
  const odemeVar = !suzgecTuru || suzgecTuru === 'hepsi' || suzgecTuru === 'parca'
  const SERVIS_DURUMLARI = ['onayBekliyor', 'parcaHazirlik', 'parcaYolda']
  const durumSecenekleri = GORUNEN_DURUMLAR.filter((d) => {
    if (SERVIS_DURUMLARI.includes(d.id)) return servisDurumlariVar
    if (d.id === 'teklif' || d.id === 'bayiyeIletildi') return teklifVar
    if (suzgecTuru === 'satinalma') return talepDurumlari('satinalma').some((x) => x.id === d.id)
    return true
  })
  /* Durumun adı ekranda başka bir şey değilse sıra: teklifte kullanıcının
     verdiği sıra (bkz. veri.js → TEKLIF_DURUMLARI). */
  const durumSecenekleriSirali =
    suzgecTuru === 'satinalma'
      ? talepDurumlari('satinalma').map((x) => durumSecenekleri.find((d) => d.id === x.id)).filter(Boolean)
      : durumSecenekleri

  /* Excel sütunları rolüne göre süzülüyor (bkz. aktarSutunlari) */
  const aktarSutun = useMemo(() => aktarSutunlari(rol), [rol])

  /* Tür değişince seçili durum listede kalmayabilir: "Gönderildi"
     seçiliyken fiyat teklifine geçilirse öyle bir aşama yok. Süzgeç o
     zaman hiçbir şey döndürmezdi ve kullanıcı sebebini anlamazdı.
     Karşılığı kalmayan seçim "Açık olanlar"a düşüyor. */
  useEffect(() => {
    const gecerli = ['acik', 'gecikmis', 'bizdeGeciken', 'servisteGeciken', 'hepsi']
    if (odemeVar) gecerli.push('odemeBekleyen')
    if (teklifVar) gecerli.push('teklifBekleyen')
    /* Atama dışı ve aynı makinedeki işler yalnız servis talebinde. */
    if (servisDurumlariVar) gecerli.push('atamaDisi', 'ayniMakine')
    for (const d of durumSecenekleri) gecerli.push(d.id)
    if (!gecerli.includes(durum)) setDurum('acik')
  }, [durum, durumSecenekleri, teklifVar, odemeVar, servisDurumlariVar])

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
    /* TAM TALEP NUMARASI SÜZGEÇLERİ AŞIYOR (26 Eylül 2026, ikinci
       kullanıcı sınaması). Ekran "Açık olanlar"la açılıyor; kapanmış
       talebin numarası aranınca "Talep yok" çıkıyordu, personel talebin
       silindiğini sandı. Numaranın tamamı yazıldıysa aranan tek bir
       kayıt: durum, tarih ve il süzgeci ona uygulanmıyor. Rolün
       görmediği talep yine görünmüyor (liste `kendiTalepleri`). */
    if (/^[a-zçğıöşü]{3}\d{10}$/.test(q)) {
      const tam = kendiTalepleri.filter((t) => String(t.no || '').toLocaleLowerCase('tr-TR') === q)
      if (tam.length) return tam
    }
    return kendiTalepleri.filter((t) => {
      const d = t.status || 'yeni'
      if (durum === 'acik' && KAPALI_DURUMLAR.includes(d)) return false
      if (durum === 'gecikmis' && !gecikmisMi(t)) return false
      /* Dashboard'un iki kutusunun listesi: top PAKSAN'da 48 saattir
         bekleyen ve serviste 48 saattir el sürülmemiş iş
         (bkz. backoffice/bekleyenIs.js). Kutudaki sayı ile açılan
         liste aynı kuraldan geliyor. */
      if (durum === 'bizdeGeciken' && !bizdeGecikmisMi(t)) return false
      if (durum === 'servisteGeciken' && !servisteGecikmisMi(t)) return false
      if (durum === 'parcaHazirlik' && !parcaHazirliktaMi(t)) return false
      if (durum === 'parcaYolda' && gorunenDurum(t).id !== 'parcaYolda') return false
      if (durum === 'odemeBekleyen' && !odemeOnayiBekliyorMu(t)) return false
      if (durum === 'teklifBekleyen' && !teklifBekliyorMu(t)) return false
      /* ATAMA DIŞI İŞ (25 Eylül 2026, kullanıcı sınaması Y5): servisin
         elle açtığı ve makinenin servisinde olmayan iş. Kapanmış olan
         dikkat istemiyor; işaret satırda yine görünüyor. */
      if (durum === 'atamaDisi' && !(t.atamaDisi && !KAPALI_DURUMLAR.includes(d))) return false
      if (durum === 'ayniMakine' && !ayniMakinede(t)) return false
      if (
        !['acik', 'gecikmis', 'bizdeGeciken', 'servisteGeciken', 'parcaHazirlik', 'parcaYolda',
          'odemeBekleyen', 'teklifBekleyen', 'atamaDisi', 'ayniMakine', 'hepsi'].includes(durum) &&
        d !== durum
      ) {
        return false
      }
      if (!tekTur && tur !== 'hepsi' && t.tur !== tur) return false
      if (!araliktaMi(t.createdAt, aralik)) return false
      if (il !== 'hepsi' && t.il !== il) return false
      if (ilce !== 'hepsi' && t.ilce !== ilce) return false
      if (sahiplik === 'servis' && (t.sahip || 'paksan') !== 'servis') return false
      if (sahiplik === 'paksan' && (t.sahip || 'paksan') !== 'paksan') return false
      if (sahiplik === 'bayi' && (t.sahip || 'paksan') !== 'bayi') return false
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
         bulmuyordu. Servis adı da aynı sebeple burada: personel
         "Konya servisindeki işler" diye arıyor. */
      const alanlar = [
        t.no, t.ad, t.tel, t.il, t.ilce, t.makine?.serial, t.aciklama,
        t.fatura?.ad, t.fatura?.unvan, t.servis?.ad,
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
  }, [kendiTalepleri, durum, tur, aralik, il, ilce, makine, ara, tekTur, sahiplik, ayniMakinede])

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
        tel: (t) => kayitTelGoster(t),
        createdAt: (t) => t.createdAt,
        /* Görünen duruma göre: "Parça Hazırlanıyor" ile "Parça Yolda"
           aynı koddan geliyor ama sırada ayrı duruyor. */
        status: (t) => GORUNEN_DURUMLAR.findIndex((d) => d.id === gorunenDurum(t).id),
      }),
    [suzulmus, siralama]
  )

  /* SAYFALAMA — 10 talepte bir sayfa.

     Süzgeç ya da sıralama değişince ilk sayfaya dönülüyor: eski sayfa
     numarası yeni listede başka kayıtları gösterirdi. Başka bir yerden
     talep seçildiğinde (ör. müşterinin diğer talepleri) o talebin
     bulunduğu sayfaya geçiliyor; satıra tıklamak sayfayı değiştirmiyor,
     çünkü tıklanan satır zaten ekrandaki sayfada. */
  const [sayfa, setSayfa] = useState(0)
  const listeBasi = useRef(null)
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / SAYFA_BOYU))
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi - 1)
  const gorunen = liste.slice(gecerliSayfa * SAYFA_BOYU, (gecerliSayfa + 1) * SAYFA_BOYU)

  useEffect(() => {
    setSayfa(0)
  }, [durum, tur, aralik, il, ilce, makine, sahiplik, ara, siralama])

  useEffect(() => {
    if (!secili) return
    const sira = liste.findIndex((t) => t.id === secili)
    if (sira >= 0) setSayfa(Math.floor(sira / SAYFA_BOYU))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secili])

  const sayfalamaOrtak = {
    sayfa: gecerliSayfa,
    sayfaSayisi,
    toplam: liste.length,
    boy: SAYFA_BOYU,
    birim: 'talep',
  }

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
            { deger: 'hepsi', ad: 'Hepsi' },
            {
              grup: 'Dikkat isteyenler',
              secenekler: [
                { deger: 'gecikmis', ad: 'Gecikmiş talepler' },
                { deger: 'bizdeGeciken', ad: 'Bizde 48 saati geçenler' },
                { deger: 'servisteGeciken', ad: 'Serviste gecikenler' },
                ...(odemeVar ? [{ deger: 'odemeBekleyen', ad: 'Ödeme onayı bekleyenler' }] : []),
                ...(teklifVar ? [{ deger: 'teklifBekleyen', ad: 'Cevap Beklenen Teklifler' }] : []),
                ...(servisDurumlariVar
                  ? [
                      { deger: 'atamaDisi', ad: 'Atama dışı işler' },
                      { deger: 'ayniMakine', ad: 'Aynı makinede açık işler' },
                    ]
                  : []),
              ],
            },
            {
              grup: 'Duruma göre',
              secenekler: durumSecenekleriSirali.map((d) => ({ deger: d.id, ad: d.ad })),
            },
          ]}
          genislik={165}
        />

        <Secim
          ad="Talep Türü"
          deger={tekTur || tur}
          onDegis={setTur}
          secenekler={
            tekTur
              ? [{ deger: tekTur, ad: TALEP_ADI[tekTur] }]
              : [
                  { deger: 'hepsi', ad: 'Her tür' },
                  ...turSecenegi.map((k) => ({ deger: k, ad: TALEP_ADI[k] })),
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

        {/* Talep servise düşse de PAKSAN listesinden çıkmıyor; bu
            süzgeç "şu an kim ilgileniyor" sorusunu cevaplıyor. */}
        <Secim
          ad="Sahiplik"
          deger={sahiplik}
          onDegis={setSahiplik}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'servis', ad: 'Serviste' },
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
        <div className="kart" ref={listeBasi}>
          {yukleniyor ? (
            <Bekleme satir={5} />
          ) : hata ? (
            <div className="hata">{OKUMA_HATASI}</div>
          ) : liste.length === 0 ? (
            <Bos metin="Talep yok." />
          ) : (
            <>
              <Sayfalama {...sayfalamaOrtak} onDegis={setSayfa} />
              <div className="tablo-sar tablo-sar--talepler">
              <table className="tablo--esit tablo--talepler">
                <thead>
                  <tr>
                    <SiraliBaslik ad="Talep" alan="no" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Müşteri" alan="ad" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Makine" alan="makine" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik
                      ad="Tarih"
                      alan="createdAt"
                      siralama={siralama}
                      onSirala={cevir}
                    />
                    <SiraliBaslik ad="Durum" alan="status" siralama={siralama} onSirala={cevir} />
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map((t) => {
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
                          <IsIsaretleri atamaDisi={Boolean(t.atamaDisi)} ayniMakine={ayniMakinede(t)} />
                        </td>
                        <td>
                          <div>{t.ad || '—'}</div>
                          <div className="kucuk sonuk">
                            {t.ilce ? `${t.ilce} / ${t.il}` : t.il || '—'}
                          </div>
                          {/* TELEFON AYRI SÜTUNDAYDI. Dar ekranda tablo
                              sığmıyor, yana kaydırılarak okunuyordu;
                              aranacak numara artık müşterinin altında.
                              Biçim her ekranda aynı (25 Eylül 2026,
                              lib/tel.js → kayitTelGoster): Servisim'in
                              elle açtığı talep "0532 …" diye sıfırlı,
                              Connect'inki "+90 …" diye görünüyordu. */}
                          {kayitTelGoster(t) && (
                            <div className="kucuk sonuk mono">{kayitTelGoster(t)}</div>
                          )}
                        </td>
                        <td>
                          <div className="kucuk">{p?.name || '—'}</div>
                          {t.makine?.serial && (
                            <div className="kucuk sonuk mono">{formatSerial(t.makine.serial)}</div>
                          )}
                        </td>
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
                        <td><DurumRozet durum={t.status} talep={t} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <Sayfalama
                {...sayfalamaOrtak}
                alt
                onDegis={(n) => {
                  setSayfa(n)
                  listeBasi.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }}
              />
            </>
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

/* "Bildirim gitti" cümlesinin sonu (25 Eylül 2026, kullanıcı sınaması Y4).
   Kime gittiğini veri katmanı söylüyor (veri.js → bildirimAlicilari):
   servis siparişinde servise; talep müşterinin uygulamadaki hesabına
   bağlı değilse kimseye. */
function bildirimSonu(talep, alicilar) {
  if (talep.servisSiparisi) return 'servise bildirim gönderildi'
  return alicilar.musteri
    ? 'müşteriye bildirim gitti'
    : 'talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmedi'
}

/* Durum kilidinin nedeni (25 Eylül 2026, kullanıcı sınaması O8). Kod
   veri katmanında (veri.js → durumKilidi); cümle burada. Gönderilmiş
   siparişin iptali para geri yazıyorsa (bakiyeden ödenmiş sipariş) bunu
   da söylüyor: faturalı siparişte uygulama para yazmıyor, iade faturası
   LOGO'da. */
const KILIT_METNI = {
  bayide: 'Bu talep bayiye iletildi. Durumu değiştirilemez.',
  siparisGonderildi:
    'Bu sipariş gönderildi ve kapandı. Gönderilmiş siparişi iptal etme yetkiniz yok. İade gerekiyorsa yöneticinize başvurun.',
  kapandi: 'Bu talep kapandı. Yeniden açılması gerekiyorsa yöneticinize başvurun.',
  iptal: 'Bu talep iptal edildi. Yeniden açılması gerekiyorsa yöneticinize başvurun.',
}

function kilitMetni(talep, kilit) {
  const metin = KILIT_METNI[kilit] || KILIT_METNI.kapandi
  if (kilit === 'siparisGonderildi' && talep.odeme === 'bakiye') {
    return metin + ' İptal edilince düşülen tutar servisin bakiyesine geri eklenir.'
  }
  return metin
}

function Detay({ talep, hepsi, personel, rol, tazele, bildir, onTalepSec }) {
  const [not, setNot] = useState('')
  /* 'kapanis' | 'plan' | 'teklif' | 'iptal' | 'gonderim' | null */
  const [form, setForm] = useState(null)
  const [onay, setOnay] = useState(null) /* onay bekleyen durum */
  const [odemeOnay, setOdemeOnay] = useState(false)

  /* Ödeme onaylanmadan ilerlenmeye çalışıldı — hangi durum istendi */
  const [odemeKapisi, setOdemeKapisi] = useState(null)
  /* Onay bekleyen hak ediş varken durum elle değiştirilmek istendi. */
  const [hakkedisKapisi, setHakkedisKapisi] = useState(null)
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

  /* KİME BİLDİRİM GİDİYOR (25 Eylül 2026, kullanıcı sınaması Y4).
     Ekran kendi tahminini yürütüyordu ve servis siparişinde de
     "müşteriye bildirim gitti" diyordu; oysa siparişi servis veriyor,
     müşterisi yok. Cevap yazan işlevlerle aynı kuraldan geliyor
     (veri.js → bildirimAlicilari): servis siparişinde servise; talep
     müşterinin uygulamadaki hesabına bağlı değilse kimseye. */
  const alicilar = bildirimAlicilari(talep)
  const siparis = Boolean(talep.servisSiparisi)

  /* Durum değişikliğinde kime haber gittiği. Servis siparişinde servise
     gidiyor; "Yeni"ye dönüşte gitmiyor (veri.js → talepDurumDegistir). */
  function durumBildirimi(hedef, sessiz) {
    if (siparis) {
      return hedef === 'yeni' ? 'servise bildirim gönderilmedi' : 'servise bildirim gönderildi'
    }
    if (sessiz) return 'müşteriye bildirim gönderilmedi'
    return bildirimSonu(talep, alicilar)
  }

  const garanti = talep.makine ? warrantyStatus(makineYili(talep)) : null

  /* AYNI MAKİNEDEKİ ÖTEKİ AÇIK SERVİS TALEPLERİ (25 Eylül 2026, O5).
     Rolün kendi listesinden (`hepsi`); talebin kendisi hariç. Yalnız
     açık servis talebinde soruluyor: kapanmış işin yanında "açık başka
     iş var" demek bir şey anlatmıyor. */
  const ayniMakinedekiler = acikServisTalebiMi(talep)
    ? makineninAcikServisTalepleri(talep.makine, hepsi, { haric: talep.id })
    : []

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
  const devirUstte = Boolean(talep.devir) && !kapali && (talep.sahip || 'paksan') === 'paksan'
  /* BAYİYE İLETİLEN TALEP HİÇ AÇILMIYOR (21 Eylül 2026, kullanıcının
     kararı): geri açma yetkisi olan da çiple başka bir duruma geçiremez.
     Yanlış tıklamanın tek düzeltmesi Bayi bölümündeki geri alma
     (bkz. veri.js → durumGecisiEngeli).

     KİLİT VE NEDENİ TEK YERDEN (25 Eylül 2026, kullanıcı sınaması O8).
     Kilitli çip `disabled` idi: gönderilmiş servis siparişinde "İptal"e
     basan yedek parça personeli hiçbir tepki görmüyordu, altındaki soluk
     cümle de "yeniden açılması gerekiyorsa" diyordu, iptalden söz
     etmiyordu. Kural veri katmanında (veri.js → durumKilidi); çip artık
     basılıyor ve nedeni söylüyor. */
  const kilit = durumKilidi(talep, rol)
  const bayide = kilit === 'bayide'
  const kilitli = Boolean(kilit)
  const kilitYazisi = kilit ? kilitMetni(talep, kilit) : ''

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
    if (kilitli) return bildir(kilitYazisi)

    /* Yedek parçada ödeme onaylanmadan ilerlenemiyor: parası gelmemiş
       siparişi hazırlamaya başlamak, sonradan geri alınması zor bir
       hata. Personel doğrudan ödeme onayına gönderiliyor. */
    if (parcaIlerlemeEngeli(talep, yeni)) return setOdemeKapisi(yeni)

    /* Onay bekleyen hak ediş kilitliyor: para kararı açılır listeden
       değil, Onayla / Kabul Etme düğmelerinden veriliyor. */
    if (hakkedisIlerlemeEngeli(talep, yeni)) return setHakkedisKapisi(yeni)

    if (!kapali && yeni === 'kapandi') return setForm('kapanis')
    if (!kapali && yeni === 'planlandi') return setForm('plan')
    if (!kapali && yeni === 'teklif') return setForm('teklif')
    /* Kapanmış (gönderilmiş) servis siparişinin iptali de formdan geçiyor
       (24 Eylül 2026): sebep servise gidiyor ve pencere bakiyeye dönecek
       tutarı önceden söylüyor. Kapanmış talebi açma yetkisi yine şart
       (yukarıdaki `kilitli`). */
    if ((!kapali || (talep.servisSiparisi && suanki === 'kapandi')) && yeni === 'iptal') {
      return setForm('iptal')
    }
    setOnay(yeni)
  }

  function onayla() {
    const sessiz = bildirimsizMi(onay)
    talepDurumDegistir(talep, onay, personel, { bildirme: sessiz })
    const ad = durumBilgi(onay).ad
    const hedef = onay
    setOnay(null)
    tazele()
    bildir(`${talep.no} → ${ad} · ${durumBildirimi(hedef, sessiz)}`)
  }

  /* Notun üç muhatabı var: yalnız PAKSAN (iç not), müşteri ve servis.
     @param {'ic'|'musteri'|'servis'} hedef */
  function notKaydet(hedef) {
    if (not.trim().length < 2) return
    talepNotEkle(talep, not.trim(), personel, {
      musteriye: hedef === 'musteri',
      servise: hedef === 'servis',
    })
    setNot('')
    tazele()
    bildir(
      hedef === 'musteri'
        ? 'Not müşteriye gönderildi'
        : hedef === 'servis'
          ? /* Servis adına yönelme eki gerekiyor ("… Servisine") ve ek,
               adın son hecesine göre değişiyor. Genel ifade hem doğru
               hem de kısa; muhatabı zaten belli. */
            'Not servise gönderildi'
          : 'İç not eklendi',
    )
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
        <span style={{ marginLeft: 'auto' }}><DurumRozet durum={talep.status} talep={talep} /></span>
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

        {/* Bayiye iletilmiş talepte çip sırası çizilmiyor: şu anki durum
            çiplerde yok (bayi seçilmeden girilmiyor), hiçbiri seçili
            görünmez ve hepsi kapalıdır. Durum sağ üstteki rozette. */}
        {!bayide && (
          <div className="suzgec" style={{ marginBottom: kilitli ? 8 : 20 }}>
            {elleSecilebilirDurumlar(talep.tur).map((d) => {
              const engel = parcaIlerlemeEngeli(talep, d.id)
              /* Kilitli çip KAPATILMIYOR, basılınca nedeni söylüyor
                 (O8; ödeme kilidiyle aynı düzen, bkz. backoffice.css →
                 .cip--kilitli). `aria-disabled` ekran okuyucuya
                 basılamayacağını söylüyor. */
              return (
                <button
                  key={d.id}
                  className={
                    'cip' +
                    (suanki === d.id ? ' cip--on' : '') +
                    (engel || kilitli ? ' cip--kilitli' : '')
                  }
                  onClick={() => durumaGec(d.id)}
                  disabled={suanki === d.id}
                  aria-disabled={kilitli || undefined}
                  title={engel ? 'Önce ödemeyi onaylayın' : kilitli ? kilitYazisi : undefined}
                >
                  {(engel || kilitli) && <span aria-hidden="true">🔒 </span>}
                  {d.ad}
                </button>
              )
            })}
          </div>
        )}

        {kilitli && (
          <div className="uyari" style={{ marginBottom: 20 }}>
            {kilitYazisi}
          </div>
        )}

        {/* MÜŞTERİ "SORUN DEVAM EDİYOR" DEDİ.

            Kapanmış bir servis talebini müşteri kendi uygulamasından
            yeniden açabiliyor (bkz. screens/RequestDetail.jsx). Aynı
            arızaya ikinci kez gidiliyor demek; PAKSAN'ın da servisin
            de bunu görmesi gerekiyor, yoksa iş yeni bir talep gibi
            okunuyor ve ilk ziyarette ne yapıldığı kaybolıyor. */}
        {(talep.tekrar || []).length > 0 && (
          <div className="uyari" style={{ marginBottom: 16, display: 'block' }}>
            <b>
              Müşteri sorunun devam ettiğini bildirdi
              {talep.tekrar.length > 1 ? ` · ${talep.tekrar.length} kez` : ''}
            </b>
            {talep.tekrar
              .slice()
              .reverse()
              .map((x, i) => (
                <p key={i} style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                  {x.aciklama || 'Açıklama yazılmadı.'}
                  <span className="kucuk"> · {tarihYaz(x.tarih)}</span>
                </p>
              ))}
          </div>
        )}

        {/* SERVİSİN DESTEK İSTEME NEDENİ EN ÜSTTE (22 Eylül 2026).
            Kutu "Servis" bölümünün dibindeydi: müşteri bilgisinin altında,
            ekranın katlanan yerinde kalıyordu ve personel nedeni
            göremediğini bildirdi. Talep PAKSAN'dayken bu cümle yapılacak
            işin kendisi; "Müşteri sorunun devam ettiğini bildirdi" kutusuyla
            aynı yerde duruyor. İş servise döndüyse ya da kapandıysa kutu
            geçmiş bilgi olarak Servis bölümünde kalıyor. */}
        {devirUstte && <DevirNedeni devir={talep.devir} />}

        <Bolum ad="Müşteri">
          <S k="Ad Soyad" v={talep.ad} />
          <S k="Telefon" v={kayitTelGoster(talep)} mono />
          <S k="Konum" v={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il} />
        </Bolum>

        <ServisDurumu talep={talep} devirGoster={!devirUstte} />

        {talep.tur === 'satinalma' && (
          <BayiAtama
            talep={talep}
            personel={personel}
            geriAlabilir={izinli(rol, 'talepGeriAc')}
            tazele={tazele}
            bildir={bildir}
          />
        )}

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
                  <span className="kucuk sonuk">{durumYazisi(t)}</span>
                </button>
              ))
            )}
          </Bolum>
        )}

        {talep.makine && (
          <Bolum ad="Makine">
            <S k="Model" v={p?.name} />
            {/* SERİSİZ ELLE KAYIT (24 Eylül 2026): servis seri numarasını
                okuyamadıysa modeli ve tahmini yılı yazdı (Servisim →
                ElleKayit). Seri satırı bunu söylüyor; yıl tahmini diye
                işaretli, garanti hesaplanmıyor. */}
            {talep.makine.seriYok && !talep.makine.serial ? (
              <>
                <S k="Seri numarası" v="Yok · servis seri numarasını okuyamadı" />
                <S
                  k="Üretim Yılı"
                  v={talep.makine.tahminiYil ? `${talep.makine.tahminiYil} (tahmini)` : ''}
                />
              </>
            ) : (
              <>
                <S k="Seri numarası" v={formatSerial(talep.makine.serial)} mono />
                <S k="Üretim Yılı" v={makineYili(talep) || ''} />
              </>
            )}
            {garanti && (
              <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
                <span className="kucuk sonuk" style={{ minWidth: 118 }}>Garanti</span>
                <span className={'rz rz--' + GARANTI_TON[garanti.state]}>
                  {GARANTI_ADI[garanti.state]}
                </span>
              </div>
            )}
            {/* AYNI MAKİNEDE AÇIK BAŞKA İŞ (25 Eylül 2026, O5). Başka
                servisten ya da başka telefonla açılmış iş "Aktif diğer
                talepler"de görünmüyordu (o bölüm müşteriye bakıyor).
                Numaraya dokununca o talep açılıyor. */}
            {ayniMakinedekiler.length > 0 && (
              <div className="uyari" style={{ display: 'block', marginTop: 10 }}>
                <b>Bu Makine İçin Açık Başka Servis Talebi Var · {ayniMakinedekiler.length}</b>
                {ayniMakinedekiler.map((t) => (
                  <button key={t.id} className="bag-satir" onClick={() => onTalepSec(t.id)}>
                    <span className="mono">{t.no}</span>
                    <span className="kucuk sonuk">{t.servis?.ad || MARKA}</span>
                    <span className="kucuk sonuk">{durumYazisi(t)}</span>
                  </button>
                ))}
              </div>
            )}
          </Bolum>
        )}

        <Bolum ad="Talep">
          {/* Makinenin bulunduğu adres: servis talebinde müşteri
              uygulamada yazıyor, sahadaki servis onu okuyor. Telefonla
              gelen taleplerde boş kalıyor ve servis kendi ekranında
              dolduruyor. */}
          <S k="Adres" v={talep.adres} />
          <S k="Makinenin Durumu" v={makineDurumAdi(talep.durum)} />
          <S k="Belirtiler" v={talep.belirtiler?.join(' · ')} />
          {/* MÜŞTERİNİN SEÇTİĞİ PARÇALAR GÖRSELLİ (22 Eylül 2026,
              kullanıcının isteği). Satır "Pikap dişi × 2 · Düğüm atıcı
              bıçağı" diye düz yazıydı: parçayı hazırlayan personel
              kodu da resmi de görmüyordu, katalogta aynı adı taşıyan
              parçalar var. Servis kaydının parça listesiyle aynı
              tablo (bkz. components/ParcaTablosu.jsx). */}
          {talebinParcalari(talep).length > 0 && (
            <div style={{ margin: '6px 0 10px' }}>
              <div className="alan__ad" style={{ marginBottom: 6 }}>
                İstenen Parçalar
              </div>
              {/* EKSİK GÖNDERİM (24 Eylül 2026). Kapanmış servis
                  siparişinde gönderilmemiş satırın altında etiket;
                  bekleyen parça varsa gönderme düğmesi (bkz. veri.js →
                  kalanParcalariGonder).

                  SERVİS SİPARİŞİNDE TUTARLAR (24 Eylül 2026, kullanıcının
                  isteği). Tabloda yalnız kod, ad ve adet vardı; tutar
                  aşağıdaki bölümde KDV hariç tek bir rakamdı ve servisin
                  bakiyesinden düşen KDV dâhil tutarla tutmuyordu. Şimdi
                  satır tutarları tabloda, altında siparişin dökümü ve
                  bakiye durumu (bkz. SiparisDokumu). Müşterinin parça
                  talebinde tutarlar "Fatura ve Teslimat" bölümünde
                  (BeklenenTutar), orada değişen bir şey yok. */}
              <ParcaTablosu
                parcalar={gonderimliParcalar(talep, 'Gönderilmedi')}
                tutarli={Boolean(talep.servisSiparisi && talep.parcaFiyat)}
              />
              {talep.servisSiparisi && <SiparisDokumu talep={talep} />}
              {/* KALAN PARÇALARIN İPTALİ (24 Eylül 2026): stoktan kalkmış
                  bekleyen parça siparişin tamamı iptal edilmeden
                  kapatılıyor (bkz. veri.js → kalanParcalariIptalEt). */}
              {suanki === 'kapandi' && siparisGonderimi(talep)?.kalan.length > 0 && (
                <div className="satir" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="dg" onClick={() => setForm('kalan')}>
                    Kalan Parçaları Gönder
                  </button>
                  <button className="dg" onClick={() => setForm('kalanIptal')}>
                    Kalan Parçaları İptal Et
                  </button>
                </div>
              )}
            </div>
          )}
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
                Sesli not{talep.ses?.sure ? ' · ' + talep.ses.sure + ' sn' : ''}
              </div>
              {talep.ses?.veri ? (
                <audio controls src={talep.ses.veri} style={{ width: '100%' }} />
              ) : (
                <div className="kucuk sonuk">Ses kaydı saklanmıyor.</div>
              )}

            </div>
          )}

          <Ekler ekler={talep.ekler} />
        </Bolum>

        {/* ------------------------------------- Müşterinin sonradan eklediği not

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
        {/* SERVİS SİPARİŞİNDE FATURA BÖLÜMÜ AÇILMIYOR.

            Aşağıdaki bölüm son müşteri için yazıldı: fatura tipi, T.C.
            kimlik numarası, dekont, ödeme onayı. Servis cari hesaplı bir
            iş ortağı — hiçbiri onun için sorulmuyor ve sorulsaydı ekran
            boş kutularla, doldurulamayacak bir "Ödemeyi onayla"
            düğmesiyle dolardı. Servisin siparişinde bakılacak üç şey
            var: ne istedi, nereye gidecek, ne zaman istiyor. */}
        {talep.servisSiparisi && (
          <Bolum ad="Servis Siparişi">
            <S k="Servis" v={talep.servis?.ad} />
            {/* Tutar burada KDV hariç tek satırdı ("Sipariş tutarı");
                dökümüyle birlikte parça tablosunun altına taşındı. Burada
                ödemenin biçimi kaldı. */}
            <S
              k="Ödeme"
              v={talep.odeme === 'bakiye' ? 'Servisin bakiyesinden düşülür' : 'Faturayla'}
            />
            {talep.odeme === 'bakiye' && <S k="Servisin Bakiyesi" v={bakiyeYazisi(talep.servis?.id)} />}
            <S
              k="İstenen tarih"
              v={talep.istenenTarih ? tarihYaz(talep.istenenTarih, false) : ''}
            />
            {/* Servisim adresi yapısal veriyor (17 Eylül 2026); eski
                siparişte yalnız tek satırlık yazı var. */}
            {talep.teslimat ? (
              <TeslimatAdresi teslimat={talep.teslimat} />
            ) : (
              <>
                <div className="alan__ad" style={{ marginTop: 14, marginBottom: 6 }}>
                  Teslimat adresi
                </div>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {talep.fatura?.adres || '—'}
                </p>
              </>
            )}
          </Bolum>
        )}

        {talep.tur === 'parca' && talep.fatura && !talep.servisSiparisi && (
          <Bolum ad="Fatura ve Teslimat">
            <S k="Fatura Tipi" v={talep.fatura.tuzel ? 'Tüzel kişi' : 'Gerçek kişi'} />
            {talep.fatura.tuzel ? (
              <>
                {/* TDK'ye göre "unvan"; etikette "Ünvan" yazıyordu. */}
                <S k="Unvan" v={talep.fatura.unvan} />
                <KimlikNo
                  k="Vergi numarası"
                  v={talep.fatura.vergiNo}
                  talep={talep}
                  rol={rol}
                  personel={personel}
                />
              </>
            ) : (
              <>
                <S k="Ad Soyad" v={talep.fatura.ad} />
                <KimlikNo
                  k="T.C. kimlik numarası"
                  v={talep.fatura.tc}
                  talep={talep}
                  rol={rol}
                  personel={personel}
                />
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
                kontrol edemiyordu. Rakam, talep açılırken kaydın içine
                yazılan fiyattan geliyor (bkz. lib/parcaKatalogu.js →
                fiyatGoruntusu), yani müşterinin o gün gördüğü rakamın
                aynısı. */}
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
                almış olabilir (bkz. src/marka/kimlik.js → BANKA).
              </p>
            )}
          </Bolum>
        )}

        {/* FİYAT TEKLİFİNE ADAY LİSTESİ ŞİMDİLİK YOK.

            Burada, fiyat teklifi talebinin altında üç aday listeleniyordu.
            Aday olarak SERVİS gösteriliyordu; oysa makineyi satan taraf
            bayi, servis satış yapmıyor. Satış personeline yanlış listeyi
            göstermektense hiç göstermemek doğru.

            Bayi kaydı ayrı bir varlığa çıktığında buraya bayi önerisi
            gelecek (bkz. planın 1b adımı). O gün "bunu kime
            yollayacağım" sorusunun cevabı yine talebin içinde yazacak. */}

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
          <Bolum ad="İptal Nedeni">
            <S k="Sebep" v={talep.iptalBilgi.neden} />
            {talep.iptalBilgi.aciklama && (
              <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                {talep.iptalBilgi.aciklama}
              </p>
            )}
            <div className="kucuk sonuk" style={{ marginTop: 6 }}>
              {talep.iptalBilgi.personel} · {tarihYaz(talep.iptalBilgi.tarih)}
            </div>
            {/* Yazıyı kimin gördüğü alıcı kuralından (26 Eylül 2026, ikinci
                kullanıcı sınaması). Her talepte "müşterinin uygulamasında"
                yazıyordu; servis siparişinin müşterisi yok, iptal nedeni
                Servisim'in ayrıntısında (servis/ekranlar/TalepDetay.jsx).
                Servis talebinde ikisi de görüyor. */}
            {(alicilar.musteri || alicilar.servis) && (
              <p className="kucuk sonuk" style={{ marginTop: 8 }}>
                {alicilar.musteri && alicilar.servis
                  ? 'Bu yazı müşterinin ve servisin uygulamasında aynen görünüyor.'
                  : alicilar.musteri
                    ? 'Bu yazı müşterinin uygulamasında aynen görünüyor.'
                    : 'Bu yazı servisin uygulamasında aynen görünüyor.'}
              </p>
            )}
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

        {talep.servisKaydi && (
          <ServisKaydiBolumu
            talep={talep}
            rol={rol}
            atamaOzeti={atamaDisiOzeti(talep)}
            ayniMakinedekiler={ayniMakinedekiler}
            onDuzelt={() => setForm('hakkedisDuzelt')}
            onOnayla={() => setForm('hakkedisOnay')}
            onReddet={() => setForm('hakkedisRed')}
            onSevk={() => setForm('parcaSevk')}
          />
        )}

        {/* SERVİS KAYDI VARSA KAPANIŞ BLOĞU GÖSTERİLMİYOR.

            İkisi aynı işi anlatıyor: `cozum` servis kaydından
            türetiliyor (bkz. lib/servisKaydi.js → kaydiCozume) ve
            kaydın taşıdığından azını taşıyor. Yan yana durduklarında
            personel aynı üç satırı iki kez okuyor ve hangisinin
            geçerli olduğunu soruyor.

            `cozum` YİNE YAZILIYOR: müşteri uygulaması, Excel çıktısı
            ve raporlar onu okuyor. Yalnız bu ekranda ikinci kez
            çizilmiyor.

            GARANTİ DIŞI KAPANIŞ İSTİSNA: yeniden açılmış talepte
            servis ikinci ziyareti kayıt açmadan kapattıysa (bkz.
            servis/ekranlar/TalepDetay.jsx → garantiDisi) talepte ilk
            ziyaretin servis kaydı duruyor ama güncel kapanış o değil.
            Blok çizilmezse personel talebi ilk kayıtla kapanmış
            sanıyordu. Alanlar boş olduğu için özet satırı çıkıyor. */}
        {talep.cozum && (!talep.servisKaydi || talep.cozum.garantiDisi) && (
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

            {/* KARGO KAPANIŞIN İÇİNDE (25 Eylül 2026, kullanıcı sınaması).
                Müşterinin parça talebinde kapanışta girilen kargo firması
                ve takip numarası talebin `parcaSevk` alanında (bkz.
                veri.js → talepKapat); kapanış bildirimiyle müşteriye de
                gitti. Servis siparişinin kargosu burada değil. */}
            {talep.tur === 'parca' && !talep.servisSiparisi && talep.parcaSevk && (
              <S
                k="Kargo"
                v={[talep.parcaSevk.firma, talep.parcaSevk.takipNo].filter(Boolean).join(' · ')}
                mono
              />
            )}
            {/* KARGO BİLGİSİ SONRADAN (26 Eylül 2026, ikinci kullanıcı
                sınaması O2): takip numarası kapanıştan sonra gelince ya da
                yanlış yazılınca buradan; talep kapalı kalıyor, müşteriye
                kargo bilgisiyle bildirim gidiyor (veri.js →
                musteriKargosunuGuncelle). Düğme yazıları servis parçasının
                "Kargo Bilgisini Gir / Düzelt"iyle aynı. */}
            {talep.tur === 'parca' && !talep.servisSiparisi && talep.status === 'kapandi' && (
              <button
                className="dg"
                style={{ marginTop: 8 }}
                data-eylem="musteri-kargo"
                onClick={() => setForm('musteriKargo')}
              >
                {talep.parcaSevk?.takipNo ? 'Kargo Bilgisini Düzelt' : 'Kargo Bilgisini Gir'}
              </button>
            )}

            {/* KAPANIŞ ÖZETİ — BOŞ KUTUYA KARŞI.

                Servisin kapattığı yedek parça talebi yalnız `ozet`
                alanına yazılıyordu; backoffice'in okuduğu alanların
                hiçbiri dolu değildi. Sonuç: kapanmış talepte "Yapılan
                iş" başlığı ve altında yalnız imza satırı görünüyordu.
                Servisin yazdığı kargo takip numarası dâhil hiçbir şey
                okunmuyordu.

                Servis tarafı düzeltildi ve artık ortak alanı yazıyor.
                Bu satır ESKİ kayıtlar için duruyor: alanların hepsi
                boşsa özet gösteriliyor, kayıt kaybolmuyor. */}
            {kapanisBos(talep) && talep.cozum.ozet && (
              <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{talep.cozum.ozet}</p>
            )}

            {/* Kapanışta PAKSAN'a bedelsiz parça faturası çıkarıldıysa
                numarası burada: talebin karşılığı olan garanti
                siparişi, Servis Siparişleri ekranında bu numarayla
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
                           gidiyor. Müşterinin parça talebinde kargo
                           takip numarası 25 Eylül 2026'dan beri
                           kapanışın içinde gidiyor (KapanisFormu);
                           numara sonradan gelirse yine buradan.

            Yanlış düğmeye basmak pahalı olduğu için müşteriye giden
            not ayrı renkte ve gönderilmiş notlar listede işaretli.

            MÜŞTERİYE NOT HER TALEPTE YOK (25 Eylül 2026, kullanıcı
            sınaması Y4). Servis siparişinin müşterisi yok: siparişi
            servis verdi, iletişim "Servise Gönder"den. Talep müşterinin
            uygulamadaki hesabına bağlı değilse not ona ulaşmıyor
            (Connect, servisin elle açtığı hesapsız talebi göstermiyor);
            düğme yerine ne yapılacağı yazıyor. */}
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
                    {n.servise && (
                      <span className="rz rz--mor" style={{ marginLeft: 8 }}>
                        servise gönderildi
                      </span>
                    )}
                    {n.servisten && (
                      <span className="rz rz--turuncu" style={{ marginLeft: 8 }}>
                        servis notu
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
            <button className="dg" onClick={() => notKaydet('ic')}>
              İç Not Ekle
            </button>
            {/* SERVİSE NOT YALNIZ SERVİSİ OLAN TALEPTE.

                Servisi atanmamış bir talepte düğme, basıldığında
                hiçbir yere ulaşmayan bir not üretirdi. */}
            {talep.servis?.id && (
              <button
                className="dg"
                disabled={not.trim().length < 2}
                onClick={() => notKaydet('servis')}
              >
                Servise Gönder
              </button>
            )}
            {!siparis && alicilar.musteri && (
              <button
                className="dg dg--ana"
                disabled={not.trim().length < 2}
                onClick={() => setNotOnay(true)}
              >
                Müşteriye Gönder
              </button>
            )}
          </div>
          <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
            {siparis
              ? '"Servise Gönder" düğmesine bastığınızda notunuz servisin uygulamasında bu siparişin içinde görünür. Siparişi servis verdiği için not müşteriye gönderilmez.'
              : !alicilar.musteri
                ? 'Talep müşterinin uygulamadaki hesabına bağlı olmadığı için yazdığınız not ona ulaşmaz. Müşteriye iletilecek bilgiyi telefonla verin.' +
                  (talep.servis?.id
                    ? ' "Servise Gönder" düğmesiyle notunuzu servisin uygulamasına gönderebilirsiniz.'
                    : '')
                : '"Müşteriye Gönder" düğmesine dokunduğunuzda yazdığınız cümle olduğu gibi müşterinin uygulamasında görünür ve müşteriye bildirim gönderilir. "Servise Gönder" düğmesine dokunduğunuzda aynı cümle servisin uygulamasında bu talebin içinde görünür; müşteriye gönderilmez.'}
          </p>
        </Bolum>

        {onay && (
          <Onay
            baslik="Durumu değiştir"
            metin={
              /* Servis siparişinde haber servise gidiyor, müşteriye değil;
                 "Yeni"ye dönüşte servise de gitmiyor. Talep müşterinin
                 uygulamadaki hesabına bağlı değilse müşteriye gitmiyor
                 (bildirimAlicilari, yukarıda). */
              siparis
                ? onay === 'yeni'
                  ? `${talep.no} siparişi "${durumBilgi(onay).ad}" durumuna geri alınacak. Geri alma bir düzeltmedir; servise bildirim GÖNDERİLMEYECEK.`
                  : `${talep.no} siparişinin durumu "${durumBilgi(onay).ad}" olarak değişecek ve servise bildirim gidecek.`
                : kapali
                  ? `${talep.no} kapanmış bir talep. Durumu "${durumBilgi(onay).ad}" olarak değişecek; müşteriye bildirim GÖNDERİLMEYECEK.`
                  : bildirimsizMi(onay)
                    ? `${talep.no} talebi bir önceki aşamaya, "${durumBilgi(onay).ad}" durumuna alınacak. Geriye alma bir düzeltmedir; müşteriye bildirim GÖNDERİLMEYECEK.`
                    : alicilar.musteri
                      ? `${talep.no} talebinin durumu "${durumBilgi(onay).ad}" olarak değişecek ve müşteriye bildirim gidecek.`
                      : `${talep.no} talebinin durumu "${durumBilgi(onay).ad}" olarak değişecek. Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek.`
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
              const sonuc = talepKapat(talep, cozum, personel)
              setForm(null)
              tazele()
              if (sonuc?.hata) return bildir(sonuc.hata)
              bildir(
                sonuc?.kismi
                  ? `${talep.no} · parçaların bir kısmı gönderildi, kalanlar talepte bekliyor`
                  : `${talep.no} kapandı · ${bildirimSonu(talep, alicilar)}`,
              )
            }}
          />
        )}

        {form === 'kalan' && (
          <KalanParcaFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(secim) => {
              const sonuc = kalanParcalariGonder(talep, secim, personel)
              if (sonuc.hata) return sonuc.hata
              setForm(null)
              tazele()
              bildir(`${talep.no} · kalan parçalar gönderildi, servise bildirim gönderildi`)
              return null
            }}
          />
        )}

        {form === 'kalanIptal' && (
          <KalanIptalFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(secim, iptal) => {
              const sonuc = kalanParcalariIptalEt(talep, secim, iptal, personel)
              if (sonuc.hata) return sonuc.hata
              setForm(null)
              tazele()
              bildir(`${talep.no} · kalan parçalar iptal edildi, servise bildirim gönderildi`)
              return null
            }}
          />
        )}

        {form === 'plan' && (
          <PlanFormu
            talep={talep}
            alicilar={alicilar}
            onKapat={() => setForm(null)}
            onKaydet={(plan) => {
              talepPlanla(talep, plan, personel)
              setForm(null)
              tazele()
              bildir(`${talep.no} planlandı · ${bildirimSonu(talep, alicilar)}`)
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
              bildir(`${talep.no} · teklif verildi, ${bildirimSonu(talep, alicilar)}`)
            }}
          />
        )}

        {form === 'iptal' && (
          <IptalFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={(iptal) => {
              const iade = talep.servisSiparisi ? siparisHesabi(talep).dusulen : 0
              talepIptal(talep, iptal, personel)
              setForm(null)
              tazele()
              bildir(
                talep.servisSiparisi
                  ? `${talep.no} iptal edildi · servise bildirim gönderildi` +
                      (iade > 0 ? ` · ${paraYaz(iade)} ${PARA_BIRIMI} bakiyesine geri eklendi` : '')
                  : alicilar.musteri
                    ? `${talep.no} iptal edildi · sebep müşteriye gitti`
                    : `${talep.no} iptal edildi · ${bildirimSonu(talep, alicilar)}`,
              )
            }}
          />
        )}

        {form === 'hakkedisOnay' && (
          <Onay
            baslik="Hak edişi onayla"
            /* ONAY SON ADIM: PARÇA ZATEN TAKILMIŞ.

               Burada "kayıtta parça isteği var, talep kapanmayacak,
               yedek parçaya geçecek" yazıyordu. Akış tersine
               çevrildikten sonra doğru değil: parça onaydan ÖNCE
               hazırlanıp gönderiliyor, servis takıyor ve kaydı ancak
               ondan sonra onaya gönderiyor. Onay her hâlükârda
               talebi kapatıyor (bkz. veri.js → hakkedisOnayla).

               PARAYI ONAYLAYAN NEYİ ONAYLADIĞINI GÖRÜYOR (25 Eylül 2026,
               kullanıcı sınaması Y5 ve O5; kullanıcının kararı: "uyar,
               engelleme"). Sıra: tutar → atama dışı iş (servis işi
               kendisi açtı, makine ona atanmamıştı) → aynı makinedeki
               öteki açık işler → kime bildirim gittiği. Engel yok; karar
               personelin. */
            metin={
              `${talep.no} · ${talep.servis?.ad || 'servis'} hesabına ` +
              `${paraYaz(talep.hakkedis?.toplam || 0)} ${PARA_BIRIMI} alacak yazılacak.` +
              (atamaDisiOzeti(talep) ? '\n\nAtama dışı iş: ' + atamaDisiOzeti(talep) : '') +
              (ayniMakinedekiler.length
                ? `\n\nBu makine için açık başka bir servis talebi var: ${ayniMakinedekiler.map((x) => x.no).join(', ')}.`
                : '') +
              (alicilar.musteri
                ? '\n\nTalep kapanacak ve müşteriye bildirim gidecek.'
                : '\n\nTalep kapanacak. Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek.')
            }
            onVazgec={() => setForm(null)}
            onOnayla={() => {
              const sonuc = hakkedisOnayla(talep, personel)
              setForm(null)
              tazele()
              if (sonuc.hata) return bildir(sonuc.hata)
              bildir(`${talep.no} onaylandı · kapandı`)
            }}
          />
        )}

        {form === 'hakkedisDuzelt' && (
          <HakkedisFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={({ kayit, neden }) => {
              const sonuc = hakkedisDuzelt(talep, kayit, neden, personel)
              if (sonuc.hata) {
                tazele()
                return bildir(sonuc.hata)
              }
              setForm(null)
              tazele()
              bildir(`${talep.no} · kayıt düzeltildi, gerekçe servise görünecek`)
            }}
          />
        )}

        {form === 'hakkedisRed' && (
          <RedFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onDuzelt={() => setForm('hakkedisDuzelt')}
            onKaydet={(neden) => {
              const sonuc = hakkedisReddet(talep, neden, personel)
              if (sonuc.hata) {
                tazele()
                return bildir(sonuc.hata)
              }
              setForm(null)
              tazele()
              bildir(`${talep.no} · hak ediş kabul edilmedi, gerekçe servise gitti`)
            }}
          />
        )}

        {form === 'musteriKargo' && (
          <MusteriKargoFormu
            talep={talep}
            musteriyeGider={alicilar.musteri}
            onKapat={() => setForm(null)}
            onKaydet={(kargo) => {
              const sonuc = musteriKargosunuGuncelle(talep, kargo, personel)
              if (sonuc?.hata) return bildir(sonuc.hata)
              setForm(null)
              tazele()
              bildir(`${talep.no} · kargo bilgisi kaydedildi · ${bildirimSonu(talep, alicilar)}`)
            }}
          />
        )}

        {form === 'parcaSevk' && (
          <SevkFormu
            talep={talep}
            onKapat={() => setForm(null)}
            onKaydet={({ kargo, not: sevkNotu }) => {
              /* Sonuç veri katmanından okunuyor (25 Eylül 2026, O2): "ilk
                 gönderim mi, düzeltme mi" ekranın kopyasından seçiliyordu
                 ve parça artık beklenmiyorken de "kaydedildi" deniyordu.
                 Hata dönerse not da gönderilmiyor. */
              const sonuc = servisParcasiGonderildi(talep, kargo, personel)
              if (sonuc?.hata) {
                setForm(null)
                tazele()
                return bildir(sonuc.hata)
              }
              if (sevkNotu) talepNotEkle(talep, sevkNotu, personel, { servise: true })
              setForm(null)
              tazele()
              bildir(
                sonuc.guncelleme
                  ? `${talep.no} · kargo bilgisi kaydedildi`
                  : `${talep.no} · parça gönderildi, servis takınca kapatacak`,
              )
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
              notKaydet('musteri')
            }}
          />
        )}

        {hakkedisKapisi && (
          <Onay
            baslik="Önce hak edişi sonuçlandırın"
            metin={
              `${talep.no} · ${talep.servis?.ad || 'Servis'} bu iş için ` +
              `${paraYaz(talep.hakkedis?.toplam || 0)} ${PARA_BIRIMI} bekliyor ve ` +
              `bu tutar servisin ekranında "onay bekliyor" olarak duruyor.` +
              `

Durum "${durumBilgi(hakkedisKapisi).ad}" yapılırsa kayıt ` +
              `onaylanamaz hâle gelir ama servis beklemeye devam eder. ` +
              `Aşağıdaki Hak Edişi Onayla ya da Kabul Etme düğmesini kullanın.`
            }
            onayYazi="Tamam"
            onVazgec={() => setHakkedisKapisi(null)}
            onOnayla={() => setHakkedisKapisi(null)}
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
              const sonuc = odemeOnayla(talep, personel)
              setOdemeOnay(false)
              tazele()
              bildir(
                acilacak && !sonuc?.zatenOnayli
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
                  <div>{gecmisDurumu(talep, g).ad}</div>
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

/* SERVİSİN BAKİYESİ İŞİN BAŞINDA (28 Eylül 2026, kullanıcının kararı:
   Servis ve Yedek Parça personeli "görsünler"). Hak edişi onaylayan ve
   bakiyeden ödenen siparişi gönderen personel bakiyeyi hiçbir yerde
   göremiyordu (ikinci kullanıcı sınaması; yalnız Raporlar'da, iki rolün
   o izni yok). Hesap tek yerden (veri.js → bakiyeDurumu); gönderilmeyi
   bekleyen bakiye siparişi varsa kullanılabilir kısım yanında. Listede
   de var: Servisler → Bakiye sütunu. */
function bakiyeYazisi(servisId) {
  if (!servisId) return ''
  const b = bakiyeDurumu(servisId)
  const tl = (n) => `${paraYaz(n)} ${PARA_BIRIMI}`
  return b.ayrilan > 0 ? `${tl(b.bakiye)} · Kullanılabilir ${tl(b.kullanilabilir)}` : tl(b.bakiye)
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

/* ==========================================================================
   Teslimat adresi — parçanın gideceği yer

   Servisim'de servis, siparişinde ve garanti parça isteğinde adresi
   Adreslerim'den seçiyor ya da elle giriyor (bkz. lib/teslimat.js).
   Burada parçayı kargoya veren personel okuyor: alıcı, telefon, il ve
   ilçe, açık adres ayrı satırlarda — kargo firmasının formundaki
   sırayla.

   "ADRESİ KOPYALA" tek satırı panoya alıyor: kargo firmasının kendi
   ekranına yazılırken harf harf okunup yeniden yazılmıyor.
   ========================================================================== */
function TeslimatAdresi({ teslimat: t, ust = 14 }) {
  const [kopyalandi, setKopyalandi] = useState(false)
  if (!t) return null

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(t.yazi || '')
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2000)
    } catch {
      /* Pano izni yoksa yazı ekranda duruyor; elle seçilebilir. */
    }
  }

  return (
    <div style={{ marginTop: ust }}>
      <div className="satir" style={{ marginBottom: 6, gap: 8 }}>
        <span className="alan__ad" style={{ margin: 0 }}>
          Teslimat adresi
        </span>
        <span className="rz rz--gri">
          {t.kaynak === 'kayitli' && t.baslik ? t.baslik : 'Servis tarafından elle girildi'}
        </span>
        <button
          type="button"
          className="dg dg--kucuk"
          style={{ marginLeft: 'auto' }}
          onClick={kopyala}
        >
          {kopyalandi ? 'Kopyalandı' : 'Adresi Kopyala'}
        </button>
      </div>
      <S k="Alıcı" v={t.alici} />
      <S k="Telefon" v={teslimatTelYaz(t.tel)} mono />
      <S k="İl / ilçe" v={[t.il, t.ilce].filter(Boolean).join(' / ')} />
      <S k="Açık adres" v={t.acikAdres} />
    </div>
  )
}

/* ==========================================================================
   Kimlik ve vergi numarası — kapalı duruyor, açılışı kaydediliyor

   ÖNCE OLDUĞU GİBİ YAZIYORDU. Talebi görebilen her rol — yedek parça,
   satış, servis — müşterinin T.C. kimlik numarasını ve vergi numarasını
   tam okuyordu; üstelik kimin baktığı hiçbir yere yazılmıyordu.

   NUMARA KALDIRILMIYOR: faturayı kesen kişiye gerçekten gerekiyor.
   Kapalı duruyor, isteyen açıyor ve açtığı İşlem Kaydı'na yazılıyor.
   Ekranın üstünde kendiliğinden duran bir numara, omzundan bakan
   herkese açıktır; açmak bir karar olunca arkasında iz kalıyor.

   SON DÖRT HANE AÇIK — müşteri uygulamasındaki kuralın aynısı
   (bkz. screens/RequestDetail.jsx → gizle). Personel doğru kaydın
   önünde olduğunu teyit edebiliyor, numaranın tamamını okumuyor.

   BU EKRAN KORUMASI, ERİŞİM DENETİMİ DEĞİL. Kayıt hâlâ tarayıcının
   deposunda duruyor; numarayı gerçekten ayıracak yer sunucunun satır
   süzgeci. Buradaki kazanç iki şey: numara kendiliğinden ekranda
   durmuyor ve açan kişi biliniyor.

   TALEP DEĞİŞİNCE YENİDEN KAPANIYOR. Açık hâl talebin kimliğine
   bağlı: yoksa listeden bir sonraki müşteriye geçildiğinde onun
   numarası kayıtsız açılırdı — tam da kapatılmak istenen şey.

   İZİN KATALOGDA YOKKEN AÇMA DÜĞMESİ ÇIKMIYOR, satır maskeli kalıyor.
   Katalog satırı src/data/yetkiler.js içinde; hangi rollerin alacağına
   PAKSAN karar veriyor. */
const KIMLIK_IZNI = 'kimlikNo'

function kimlikMaskele(numara) {
  const s = String(numara || '')
  if (s.length < 5) return s
  return '•'.repeat(s.length - 4) + s.slice(-4)
}

/* İşlem Kaydı satırının fiili. Satır `TLP-241 · T.C. Kimlik No ·
   tamamı görüntülendi` biçiminde kuruluyor: cümle değil, kayıt. */
const KIMLIK_ACILDI = 'tamamı görüntülendi'

function KimlikNo({ k, v, talep, rol, personel }) {
  const [acilan, setAcilan] = useState(null)
  if (!v) return null

  const acik = acilan === talep.id
  const yetkili = izinli(rol, KIMLIK_IZNI)

  function ac() {
    setAcilan(talep.id)
    islemYaz({ tur: 'musteri', ozet: `${talep.no} · ${k} · ${KIMLIK_ACILDI}`, personel })
  }

  return (
    <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span className="kucuk sonuk" style={{ minWidth: 118 }}>{k}</span>
      <span className="mono">{acik ? v : kimlikMaskele(v)}</span>
      {yetkili && !acik && (
        <button type="button" className="dg dg--kucuk" onClick={ac}>
          Göster
        </button>
      )}
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
  { ad: 'Durum', deger: (t) => durumYazisi(t) },
  { ad: 'Tarih', deger: (t) => tarihSaat(t.createdAt)[0] },
  { ad: 'Saat', deger: (t) => tarihSaat(t.createdAt)[1] },
  { ad: 'Müşteri', deger: (t) => t.ad || '' },
  /* Ekrandaki biçimle aynı: +90 532 123 45 67 (lib/tel.js → kayitTelGoster). */
  { ad: 'Telefon', deger: (t) => kayitTelGoster(t) },
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

  /* --------------------------------------------------- Kapanış ve servis

     YAPILAN İŞ EXCEL'E HİÇ GİTMİYORDU. Oysa kapanış kaydı bu projedeki
     en değerli veri: hangi modelde hangi parça kaçıncı yılda
     bozuluyor sorusunun cevabı orada birikiyor. Ekranda görünüyor,
     dosyaya inmiyordu — yani hiçbir yerde toplanamıyordu.

     Servis sütunu da aynı sebeple burada: talebin kimde olduğu listede
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
  { ad: 'Servis', deger: (t) => t.servis?.ad || '' },
  /* Servisin elle açtığı ve makinenin servisinde olmayan iş (25 Eylül
     2026, Y5): talep açıldığı andaki durum. */
  { ad: 'Atama dışı', deger: (t) => ATAMA_DISI_ADI[t.atamaDisi?.durum] || '', turler: ['servis'] },
  {
    ad: 'Talep kimde',
    deger: (t) => {
      if (t.bayi) return 'Bayide'
      return t.servis && (t.sahip || 'paksan') === 'servis' ? 'Serviste' : markaEk('da')
    },
  },
  { ad: 'Bayi', deger: (t) => t.bayi?.ad || '' },

  { ad: 'İptal sebebi', deger: (t) => t.iptalBilgi?.neden || '' },
]

/** Rolün göreceği sütunlar; rolün gördüğü talep türüne göre süzülüyor. */
export function aktarSutunlari(rol) {
  const turler = rolunTurleri(rol)
  /* Bütün türleri gören rolde süzme yok. */
  if (!turler) return AKTAR_SUTUNLARI
  return AKTAR_SUTUNLARI.filter((x) => !x.turler || x.turler.some((t) => turler.includes(t)))
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

/* --------------------------------------------- Talepteki parça kalemleri

   KAYDIN İÇİNDEKİ FİYAT OKUNUYOR, CANLI KATALOG AÇILMIYOR.

   Talep açılırken o günün fiyatı kaydın içine yazılıyor (`parcaFiyat`,
   bkz. lib/parcaKatalogu.js → fiyatGoruntusu). Fiyat listesi
   değişiyor; altı ay önceki talebe bakan personel müşterinin o gün
   havale ettiği tutarı görmeli, bugünün rakamını değil.

   İKİ KAYIT BİÇİMİ VAR

     YENİ  `parcaFiyat` dolu: satırda kod, ad, adet ve o günün tutarı.
     ESKİ  yalnız parça ADLARI ile adetleri var; fiyat hiçbir yerde
           yazılı değil. Bugünün fiyatını o kayda yazmak uydurma
           olurdu, o yüzden tutar boş kalıyor ve ekran bunu söylüyor. */
/* OKUMA BURADA YAPILMIYOR, paylasılan okuyucuya gidiyor:
   lib/servisKaydi.js → talebinParcalari. Bu dosyada bir kopyası vardı
   ve kopya sessizce ayrışmıştı: `kod` için '' yerine null dönüyor,
   görüntüde tutar olsa bile `tutar: null` yazıyor ve `goruntuden`
   alanını hiç taşımıyordu. Kayıt biçimini bilen tek yer orada. */

/* "Pikap dişi × 2 · Düğüm atıcı bıçağı"

   Adet ayrı bir alanda tutuluyor; eski taleplerde yok, o yüzden
   yalnızca 1'den büyükse yazılıyor. */
function parcaYazisi(talep) {
  return talebinParcalari(talep)
    .map((k) => (k.adet > 1 ? `${k.ad || '—'} × ${k.adet}` : k.ad || '—'))
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
    /* NOT ALANI BACKOFFICE'TE YOKTU. Servis servis kapanışında not
       yazabiliyor (bkz. lib/servisKapanis.js) ve o not müşterinin
       uygulamasında görünüyordu; PAKSAN'ın ekranında görünmüyordu.
       Müşterinin okuduğu bir şeyi üreticinin okuyamaması. */
    { ad: 'not', etiket: 'Not', uzun: true,
      ipucu: 'Müşteriyle konuşulanlar, sonraki bakımda dikkat edilecekler' },
  ],
  /* Yedek parça kapanışında TUTAR SORULMUYOR.

     Parça bedeli talebin en başında, müşteri tarafından ödeniyor ve
     tutarı talebin içinde yazılı (bkz. lib/parcaKatalogu.js →
     fiyatGoruntusu).
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

   Talep servise düşse de bu listeden çıkmıyor; personel her talebi
   görüyor. Bu etiket "buna kim bakıyor" sorusunu cevaplıyor, yoksa
   personel servisin ilgilendiği talebe de aynı anda dokunur ve müşteri
   iki yerden aranır.

   Servisi olmayan talepte hiçbir şey yazmıyor: satırda gereksiz gürültü
   olmasın, "PAKSAN'da" zaten varsayılan durum. */
function SahiplikEtiketi({ talep }) {
  /* Fiyat teklifi bayiye iletildiyse satırda yetkilendirilen bayinin
     adı yazıyor. Durum rozeti zaten "Bayiye İletildi" diyor; bu satır
     "hangi bayiye" sorusunu cevaplıyor. */
  if (talep.bayi) {
    return (
      <div className="kucuk sonuk" style={{ marginTop: 2 }}>
        Yetkili bayi · {talep.bayi.ad}
      </div>
    )
  }
  if (!talep.servis) return null

  /* SERVİSİN KENDİ SİPARİŞİ DEVİR DEĞİL.

     Servis parça ısmarladığında talep doğrudan PAKSAN'da açılıyor ve
     `servis` alanı dolu — aşağıdaki kural bunu "devredildi" diye
     okuyordu. Oysa devredilecek bir şey yok: talebi zaten servis
     açtı, siparişi veren o. */
  if (talep.servisSiparisi) {
    return (
      <div className="kucuk sonuk" style={{ marginTop: 2 }}>
        Servis siparişi · {talep.servis.ad}
      </div>
    )
  }

  /* DEVREDİLEN TALEP TALEBE GİRMEDEN BELLİ OLUYOR.

     Servis talebi PAKSAN'a bıraktığında da bu satır "Serviste" ile aynı
     soluk, küçük yazıdaydı; kullanıcı talebe girmeden fark etmiyordu
     (detayda turuncu rozet ve uyarı kutusu var). Yeni bir rozet
     eklenmedi — kullanıcının isteği (14 Eylül 2026): ekranda zaten çok
     etiket var. Yazı aynı, kalın ve detaydaki turuncu tonda: iş PAKSAN'a
     geri döndü, bakılması gereken satır bu (bkz. backoffice.css →
     .talep-devir). */
  const devredildi = (talep.sahip || 'paksan') === 'paksan'
  if (devredildi) {
    return (
      <div className="kucuk talep-devir" style={{ marginTop: 2 }}>
        Devredildi · {talep.servis.ad}
      </div>
    )
  }
  return (
    <div className="kucuk sonuk" style={{ marginTop: 2 }}>
      Serviste · {talep.servis.ad}
    </div>
  )
}

/* ==========================================================================
   Atama dışı iş ve aynı makinede iki iş (25 Eylül 2026, kullanıcı
   sınaması Y5 ve O5; kullanıcının kararı: "uyar, engelleme")

   Servisim'in Kayıt Aç ekranı işi her zaman açan servisin adına yazıyor.
   Makine başka servise atanmışsa ya da servisi yoksa backoffice'te
   hiçbir yer bunu göstermiyordu; hak edişi onaylayan personel PAKSAN'ın
   o makineye kimi atadığını göremiyordu. Talep AÇILDIĞI ANIN durumunu
   taşıyor (`atamaDisi`, yazan tek yer lib/elleTalep.js): PAKSAN
   makineyi sonradan atarsa bugünden hesaplanan işaret kanıtı silerdi.
   Makinenin bugünkü servisi ayrı satırda okunuyor.

   YENİ ROZET YOK: kullanıcının 14 Eylül isteği, ekranda zaten çok etiket
   var. Liste satırında "Devredildi" ile aynı kalıp (bkz. backoffice.css →
   .talep-devir).
   ========================================================================== */
const ATAMA_DISI_ADI = {
  baskaServis: 'Makineye başka servis atanmış',
  atanmamis: 'Makineye servis atanmamış',
  seriYok: 'Seri numarası yok',
}

/* Onay penceresi ve kayıt bölümü için tek cümle; işaret yoksa null. */
function atamaDisiOzeti(talep) {
  const a = talep.atamaDisi
  if (!a) return null
  const acan = talep.servis?.ad || 'servis'
  if (a.durum === 'baskaServis') {
    return `Makineye atanan servis ${a.servisAd || '—'}; bu işi ${acan} kendisi açtı.`
  }
  if (a.durum === 'atanmamis') return `Makineye servis atanmamıştı; bu işi ${acan} kendisi açtı.`
  if (a.durum === 'seriYok') {
    return `Seri numarası olmadığı için makinenin servisi denetlenemedi; bu işi ${acan} kendisi açtı.`
  }
  return null
}

/* Liste satırındaki işaretler: numaranın altında, tür etiketinin
   ardından, "Devredildi" satırıyla aynı yazı. */
function IsIsaretleri({ atamaDisi, ayniMakine }) {
  const p = [atamaDisi && 'Atama dışı', ayniMakine && 'Makinede başka açık iş'].filter(Boolean)
  return p.length ? (
    <div className="kucuk talep-devir" style={{ marginTop: 2 }}>
      {p.join(' · ')}
    </div>
  ) : null
}

/* Detaydaki Servis bölümünde: talep açıldığında makinenin durumu ve
   bugünkü servisi. Öteki servisin adı burada GÖSTERİLİYOR; Servisim'de
   gösterilmiyor (atama PAKSAN ile servis arasında ticari bir karar). */
function AtamaDisiUyarisi({ talep }) {
  const a = talep.atamaDisi
  if (!a) return null
  const acan = talep.servis?.ad || 'Servis'
  const bugun = talep.makine?.serial ? makineninServisi(talep.makine) : null

  let baslik
  let govde
  let bugunGoster
  if (a.durum === 'baskaServis') {
    baslik = 'Atama Dışı İş: Makineye Başka Servis Atanmış'
    govde =
      `Bu işi ${acan} kendisi açtı. Talep açıldığında makineye bakan servis ` +
      `${a.servisAd || '—'}${a.kaynak === 'bayi' ? ' (bayisinden)' : ''} idi.`
    bugunGoster = (bugun?.servis?.id || null) !== (a.servisId || null)
  } else if (a.durum === 'atanmamis') {
    baslik = 'Atama Dışı İş: Makinenin Servisi Yoktu'
    govde = `Bu işi ${acan} kendisi açtı. Talep açıldığında makineye atanmış servis yoktu.`
    bugunGoster = true
  } else {
    baslik = 'Atama Kontrol Edilemedi: Seri Numarası Yok'
    govde = `Bu işi ${acan} kendisi açtı. Seri numarası girilmediği için makinenin servisi denetlenemedi.`
    /* Seri numarası sonradan girildiyse bugünkü durum okunabiliyor. */
    bugunGoster = Boolean(talep.makine?.serial)
  }

  return (
    <div className="uyari" style={{ display: 'block', marginTop: 10 }}>
      <b>{baslik}</b>
      <p style={{ margin: '6px 0 0' }}>{govde}</p>
      {bugunGoster && (
        <p className="kucuk" style={{ margin: '6px 0 0' }}>
          {bugun
            ? `Makinenin bugünkü servisi: ${bugun.servis.ad}`
            : 'Makineye şu anda atanmış servis yok. Kayıtlı Makineler ekranından servis atanabilir.'}
        </p>
      )}
    </div>
  )
}

/* ==========================================================================
   Talebe bakan servis

   BU BÖLÜM DETAYDA HİÇ YOKTU. Listede satırın altında "Serviste · X"
   yazıyordu ama personelin çalıştığı yer sağ paneldi; talebi açınca
   hangi servisin ilgilendiği, telefonu, ne zaman düştüğü kayboluyordu.
   Servisi aramak için listeye geri dönmek gerekiyordu.

   DEVİR SEBEBİ DE BURADA. Servis "bunu ben çözemiyorum" deyip talebi
   PAKSAN'a bıraktığında sebebini yazıyor (bkz. veri.js →
   destekTalepEt). O sebep servis panelinde görünüyordu, backoffice'te
   hiçbir yerde görünmüyordu — devir süzgeci vardı ama içeriği yoktu.
   Oysa devrin tek anlamı o cümlede.

   TELEFON TIKLANABİLİR DEĞİL. Backoffice masaüstü tarayıcıda açılıyor;
   oradan arama başlatmak işe yaramıyor, en iyi ihtimalle bir uygulama
   seçme penceresi açıyor. Numara okunacak ve masadaki telefondan
   aranacak.
   ========================================================================== */
/* ==========================================================================
   Fiyat teklifini bayiye iletme (21 Eylül 2026, kullanıcının kararı)

   BAYİ SİSTEMİ YOK, ATAMA DA YOK. Bayinin paneli yok; satış personeli
   talebi bayiye telefonla ya da mesajla kendisi iletiyor. Bu bölümün
   işi yalnız HANGİ BAYİNİN YETKİLENDİRİLDİĞİNİ yazmak. Kaydedilince
   talep "Bayiye İletildi" durumuna geçiyor, PAKSAN'ın kuyruğundan
   çıkıyor ve orada kalıyor (bkz. veri.js → talebiBayiyeAta).

   BÖLÜM ÜÇ HÂLDE:
     yeni, teklif verilmemiş   iletme formu
     bayiye iletildi           yetkili bayi; yetkisi olana geri alma
     öteki her durum           hiç çizilmiyor — teklif verilmiş,
                               kapanmış ya da iptal edilmiş talep
                               bayiye iletilemez

   BAYİLER MÜŞTERİYE YAKINLIĞA GÖRE SIRALI ve sıra ekranda yazılı:
   aynı ilçe, aynı il, sonra kalanlar. Personel istediğini seçebiliyor —
   sıralama bir kolaylık, kısıt değil.

   PAKSAN KENDİSİ İLGİLENECEKSE İLETİLMİYOR. O zaman talep her zamanki
   akışta kalıyor: teklif veriliyor, kapanıyor. Bu yüzden bölüm bir
   zorunluluk gibi değil, bir seçenek gibi duruyor.
   ========================================================================== */
function BayiAtama({ talep, personel, geriAlabilir, tazele, bildir }) {
  const [secim, setSecim] = useState('')

  /* Müşterinin ilçesi, sonra ili, sonra kalanlar. */
  const bayiler = useMemo(() => {
    const hepsi = bayileriGetir()
    const puan = (b) => (b.ilce === talep.ilce && b.il === talep.il ? 0 : b.il === talep.il ? 1 : 2)
    return [...hepsi].sort((a, b) => puan(a) - puan(b) || a.ad.localeCompare(b.ad, 'tr'))
  }, [talep.il, talep.ilce])

  const durum = talep.status || 'yeni'

  if (durum === 'bayiyeIletildi') {
    return (
      <Bolum ad="Yetkili bayi">
        <div className="satir" style={{ gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <b>{talep.bayi?.ad || '—'}</b>
        </div>
        <S k="Telefon" v={telFirma(talep.bayi?.tel)} mono />
        <S k="İletilme tarihi" v={talep.bayi?.tarih ? tarihYaz(talep.bayi.tarih) : ''} />
        <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
          {`Müşteriyle bu bayi ilgilenecek. ${MARKA} bu taleple ilgili başka işlem yapmayacak. Müşteriye bildirim gönderilmedi.`}
        </p>
        {geriAlabilir && (
          <button
            className="dg"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (!confirm('Talep "Yeni" durumuna dönecek ve talepteki bayi bilgisi silinecek. Müşteriye bildirim gönderilmeyecek.')) return
              const sonuc = bayiAtamasiniKaldir(talep, personel)
              if (sonuc?.hata) return bildir(sonuc.hata)
              tazele()
              bildir('Bayiye iletme işlemi geri alındı')
            }}
          >
            Geri Al
          </button>
        )}
      </Bolum>
    )
  }

  if (durum !== 'yeni' || talep.teklif) return null

  return (
    <Bolum ad="Bayiye ilet">
      <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
        {`Teklifi bayi verecekse önce bayiye haber verin, ardından yetkilendirdiğiniz bayiyi buradan seçip kaydedin. Talep "Bayiye İletildi" durumuna geçer ve müşteriye bildirim gönderilmez. ${MARKA} kendisi teklif verecekse bu bölümü kullanmayın.`}
      </p>

      <div className="satir" style={{ gap: 8, alignItems: 'flex-end' }}>
        <label className="alan" style={{ flex: 1, marginBottom: 0 }}>
          <span className="alan__ad">Bayi</span>
          <select className="gir" value={secim} onChange={(e) => setSecim(e.target.value)}>
            <option value="">Bayi seçin</option>
            {bayiler.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ad} · {b.ilce} / {b.il}
              </option>
            ))}
          </select>
        </label>
        <button
          className="dg dg--ana"
          disabled={!secim}
          onClick={() => {
            const b = bayiler.find((x) => x.id === secim)
            const sonuc = talebiBayiyeAta(talep, b, personel)
            if (sonuc.hata) return bildir(sonuc.hata)
            tazele()
            bildir(`Talep bayiye iletildi · ${b.ad}`)
          }}
        >
          Bayiye İlet
        </button>
      </div>
    </Bolum>
  )
}

/* Servisin Servisim'deki "PAKSAN'a Devret" ile yazdığı neden (bkz. veri.js →
   destekTalepEt). Düğmenin adı 30 Eylül 2026'ya kadar "PAKSAN'dan Destek
   İste" idi; buradaki cümle henüz eski adla, karar bekliyor. */
function DevirNedeni({ devir, ust = 16 }) {
  return (
    <div className="uyari" style={{ marginTop: ust ? 0 : 12, marginBottom: ust, display: 'block' }}>
      <b>Servis bu talep için {markaEk('dan')} destek istedi.</b>
      {devir.neden && (
        <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{devir.neden}</p>
      )}
      <div className="kucuk" style={{ marginTop: 8 }}>
        {[devir.servisAd, devir.tarih ? tarihYaz(devir.tarih) : ''].filter(Boolean).join(' · ')}
      </div>
    </div>
  )
}

function ServisDurumu({ talep, devirGoster = true }) {
  if (!talep.servis) return null

  const kayit = servisleriGetir().find((b) => b.id === talep.servis.id) || null
  const paksanda = (talep.sahip || 'paksan') === 'paksan'

  return (
    <Bolum ad="Servis">
      {/* Ad ile rozet aynı satırda: bölüm başlığı zaten "Servis" diyor,
          altına bir de "Servis" etiketi koymak aynı kelimeyi iki kez
          yazmak demekti. Rozet, talebin ŞU AN kimde olduğunu
          söylüyor. */}
      <div className="satir" style={{ gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <b>{talep.servis.ad}</b>
        <span
          className={'rz rz--' + (paksanda ? 'turuncu' : 'mavi')}
          style={{ marginLeft: 'auto' }}
        >
          {paksanda ? markaEk('da') : 'Serviste'}
        </span>
      </div>

      {kayit && <S k="Konum" v={[kayit.ilce, kayit.il].filter(Boolean).join(' / ')} />}
      {kayit && <S k="Telefon" v={telFirma(kayit.tel)} mono />}
      <S k="Servise düştü" v={talep.servis.tarih ? tarihYaz(talep.servis.tarih) : ''} />

      <AtamaDisiUyarisi talep={talep} />

      {devirGoster && talep.devir && <DevirNedeni devir={talep.devir} ust={0} />}
    </Bolum>
  )
}

/* Onay penceresi — durum değişikliği müşteriye bildirim gönderdiği için
   yanlış tıklama pahalı. */
/* ==========================================================================
   Servis kaydı — PAKSAN'ın gördüğü hâli

   Servis sahada işi bitirip kaydı gönderdiğinde talep kapanmıyor:
   burada bir iş kalıyor. Yol, işçilik ve parçalar inceleniyor.

   AYRI EKRAN AÇILMADI. Bir dönem servis siparişlerinin kendi ekranı
   vardı ve personel gününü burada geçirdiği için oraya hiç bakmadı.
   Kayıt bu yüzden talebin içinde duruyor — personelin zaten baktığı
   yerde.

   ÜÇ DÜĞME, ÜÇ AYRI SONUÇ

     ONAYLA   servisin cari hesabına alacak yazılıyor. Parça istendiyse
              talep kapanmıyor, yedek parçaya geçiyor.
     DÜZELT   rakam değişiyor ve DEĞİŞİKLİK SERVİSE GÖRÜNÜYOR,
              gerekçesiyle. Para konusunda sessiz değişiklik güveni
              bitirir; ayrıca servis neyi yanlış girdiğini ancak böyle
              öğrenir.
     REDDET   gerekçe zorunlu ve servise gidiyor.
   ========================================================================== */
function ServisKaydiBolumu({
  talep,
  rol,
  atamaOzeti = null,
  ayniMakinedekiler = [],
  onDuzelt,
  onOnayla,
  onReddet,
  onSevk,
}) {
  const k = talep.servisKaydi
  const h = talep.hakkedis
  const yetkili = izinli(rol, 'talepler')
  const onayda = talep.status === 'onayBekliyor'
  const parcada = talep.status === 'parcaBekliyor'

  const HAKKEDIS_DURUM = {
    bekliyor: 'Onay bekliyor',
    onaylandi: 'Onaylandı',
    reddedildi: 'Kabul edilmedi',
  }

  return (
    <Bolum
      ad="Servis Kaydı"
      sag={
        <span className="kucuk sonuk">
          {k.servisAd} · {tarihYaz(k.tarih)}
        </span>
      }
    >
      {/* Yalnız ESKİ garanti dışı kayıtta. 15 Eylül 2026'dan beri
          servis kaydı yalnız garanti işi için yazılıyor (bkz.
          servis/ekranlar/ServisKapanisi.jsx); satır her kayıtta aynı
          şeyi söylüyordu. */}
      {k.kapi !== 'garanti' && <S k="Garanti Durumu" v={KAPI[k.kapi]} />}
      {/* SERVİSİN YAZDIĞI TALEP NEDENİ (22 Eylül 2026). Servis kaydında
          "Servis Talebi Nedeni" alanı müşterinin anlattığıyla dolu
          açılıyor, servis sahada gördüğünü ekliyor. Kayda yazılıyordu,
          servis formu PDF'inde "Arızanın Tanımı" olarak basılıyordu ama
          backoffice'te hiçbir yerde görünmüyordu. PAKSAN hak edişi ve
          garanti parçasını bu cümleye bakarak onaylıyor. */}
      <S k="Servis Talebi Nedeni" v={k.ariza} />
      <S k="Yapılan İş" v={k.yapilanIs} />
      {k.sonuc && (
        <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>{k.sonuc}</p>
      )}
      <S k="Gidilen Yol" v={k.km ? k.km + ' km' : ''} />
      <S k="İşçilik" v={iscilikYazisi(k)} />

      {/* PARÇA LİSTESİ VİRGÜLLE DEĞİL TABLOYLA.

          Satır "A (2013101010) × 2, B (2013101011) × 1" biçimindeydi;
          üç parçadan sonra kod ile ad birbirine giriyordu. Yedek parça
          personelinin okuduğu asıl liste bu — sütunlara ayrıldı
          (bkz. components/ParcaTablosu.jsx).

          "Parçanın nesi var?" satırı da buradaydı; soru servis
          uygulamasından kaldırıldı (gerekçesi lib/servisKaydi.js). */}
      {temizParcalar(k.parcalar).length > 0 && (
        <div style={{ margin: '4px 0 10px' }}>
          <div className="alan__ad" style={{ marginBottom: 6 }}>
            {k.asama === 'parca' ? 'İstenen parça' : 'Değiştirilen parça'}
          </div>
          <ParcaTablosu parcalar={temizParcalar(k.parcalar)} />
        </div>
      )}

      {!parcada && k.teslimat && (
        <div style={{ marginBottom: 10 }}>
          <TeslimatAdresi teslimat={k.teslimat} ust={0} />
        </div>
      )}

      {h && (
        <>
          <S k="Ödeme Tutarı" v={paraYaz(h.toplam) + ' ' + PARA_BIRIMI} />
          <S k="Durumu" v={HAKKEDIS_DURUM[h.durum] || h.durum} />
          <S k="Servisin Bakiyesi" v={bakiyeYazisi(talep.servis?.id)} />
          {h.red?.neden && <S k="Kabul Etmeme Gerekçesi" v={h.red.neden} />}
        </>
      )}

      {/* Değişen parçanın fotoğrafı: garanti tartışmasında bakılacak
          belge bu. PARÇANIN KENDİSİ İSTENMİYOR — servisten arızalı
          parçayı geri göndermesi beklenmiyor, karar bu fotoğrafa
          bakılarak veriliyor. */}
      {k.foto && <Ekler ekler={[k.foto]} />}

      {/* DÜZELTMELER AÇIK YAZIYOR. Servis de aynı satırları kendi
          uygulamasında görüyor. */}
      {(k.duzeltmeler || []).map((d, i) => (
        <div key={i} className="uyari" style={{ marginTop: 10 }}>
          <strong>Düzeltildi · {d.personel}</strong>
          <p style={{ margin: '4px 0 0' }}>{d.neden}</p>
          <p className="kucuk" style={{ margin: '4px 0 0' }}>{duzeltmeYazisi(d)}</p>
        </div>
      ))}

      {/* PARÇA SEVKİYATI AYNI TALEBİN ÜSTÜNDE.

          Parça isteği ikinci bir talep doğurmuyor: aynı satırda
          yürüyor, servis parçayı takınca kendisi kapatıyor. Böylece
          "parça nerede" sorusunun cevabı işin kendisiyle aynı yerde
          duruyor. */}
      {parcada && (
        <div
          className={talep.parcaSevk ? 'not not--yesil' : 'uyari'}
          style={{ marginTop: 10 }}
        >
          <strong>{talep.parcaSevk ? 'Parça gönderildi' : 'Parça bekleniyor'}</strong>
          <p style={{ margin: '4px 0 0' }}>
            {talep.parcaSevk
              ? [
                  talep.parcaSevk.firma,
                  talep.parcaSevk.takipNo,
                  tarihYaz(talep.parcaSevk.tarih),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : k.kapi === 'parcaIste'
                ? 'Servis parçayı takınca talebi kendisi kapatacak.'
                : /* Garanti işi: servis parçayı takınca kaydı onaya
                     geliyor, talebi kendisi kapatmıyor. Metin Codex'ten
                     (15 Eylül 2026); eski cümle yalnız eski garanti
                     dışı parça isteğinde doğru. */
                  'Parça gönderilip takıldıktan sonra servis kaydını tamamlayacak; servis birimi kaydı onaylayınca talep kapanacak.'}
          </p>
          {/* Takip numarası girilmediyse hatırlatılıyor. PARÇA YOLDAYKEN İŞ
              YEDEK PARÇANIN LİSTESİNDE KALIYOR (25 Eylül 2026, kullanıcı
              sınaması O2): numara girilince talep listeden düşüyordu ve
              yanlış yazılan numarayı düzeltmek isteyen kişi talebi bir
              daha bulamıyordu. Artık servis parçayı takıp kaydı gönderene
              kadar "Parça Yolda" olarak duruyor (veri.js → rolunTalepleri,
              üçüncü kapı). */}
          {talep.parcaSevk && !talep.parcaSevk.takipNo && (
            <p style={{ margin: '4px 0 0' }}>
              Takip numarası girilmedi. Numara geldiğinde "Kargo Bilgisini Gir"
              düğmesiyle yazabilirsiniz. Parça yoldayken talep listenizde "Parça
              Yolda" olarak kalır.
            </p>
          )}
        </div>
      )}

      {/* ÖNCEKİ ZİYARETLER.

          Müşteri "sorun devam ediyor" dediğinde aynı talebe ikinci kez
          gidiliyor ve yeni kayıt öncekini arşive itiyor
          (bkz. veri.js → servisKaydiGonder). PAKSAN'ın sorması gereken
          soru burada cevaplanıyor: aynı arıza mı tekrar etti, ilk
          seferde ne yapılmıştı, o iş için ne ödendi. */}
      {(k.oncekiKayitlar || talep.oncekiKayitlar || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="alan__ad" style={{ marginBottom: 6 }}>
            Önceki ziyaretler
          </div>
          {(talep.oncekiKayitlar || []).map((o, i) => (
            <div key={i} className="kv">
              <span className="kv__ad">{tarihYaz(o.tarih)}</span>
              <span className="kv__deger">
                {[o.yapilanIs, kayitParcaYazisi(o.parcalar), o.hakkedis?.toplam
                  ? paraYaz(o.hakkedis.toplam) + ' ' + PARA_BIRIMI
                  : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ONAYLAMADAN ÖNCE BAKILACAKLAR (25 Eylül 2026, kullanıcı sınaması
          Y5 ve O5). Hak edişi onaylayan personel işin atama dışı açıldığını
          ve aynı makinede ödenmemiş başka bir iş olduğunu düğmelerin hemen
          üstünde görüyor. Engel değil, uyarı: kullanıcının kararı. */}
      {yetkili && onayda && (atamaOzeti || ayniMakinedekiler.length > 0) && (
        <div className="uyari" style={{ marginTop: 12, display: 'block' }}>
          <b>Onaylamadan Önce Kontrol Edin</b>
          {atamaOzeti && <p style={{ margin: '6px 0 0' }}>{'Atama dışı iş: ' + atamaOzeti}</p>}
          {ayniMakinedekiler.length > 0 && (
            <p style={{ margin: '6px 0 0' }}>
              {`Bu makine için açık başka bir servis talebi var: ${ayniMakinedekiler.map((x) => x.no).join(', ')}.`}
            </p>
          )}
        </div>
      )}

      {yetkili && onayda && (
        <div className="satir" style={{ marginTop: 12 }}>
          <button className="dg dg--ana" onClick={onOnayla}>
            Hak Edişi Onayla
          </button>
          <button className="dg" onClick={onDuzelt}>
            Düzelt
          </button>
          <button className="dg" onClick={onReddet}>
            Kabul Etme
          </button>
        </div>
      )}

      {/* Parça gönderildikten sonra da düğme duruyor: takip numarası
          çoğu zaman o an elde olmuyor, sonradan giriliyor; yanlış
          yazılmışsa düzeltiliyor (25 Eylül 2026, O2 — düğmenin adı üç
          hâlde: gönderilmedi, numarasız gönderildi, numaralı). */}
      {/* PARÇANIN GİDECEĞİ ADRES GÖNDER DÜĞMESİNİN HEMEN ÜSTÜNDE.
          Servis parça isterken adresi seçiyor (bkz. servis/ekranlar/
          ServisKapanisi.jsx); parçayı kargoya veren personel başka yere
          bakmadan okuyor. Parça beklenmiyorsa (takıldı, kayıt onayda)
          adres parça tablosunun altında duruyor. Eski kayıtta adres
          yok, bölüm çıkmıyor. */}
      {parcada && k.teslimat && <TeslimatAdresi teslimat={k.teslimat} />}

      {yetkili && parcada && (
        <div className="satir" style={{ marginTop: 12 }}>
          <button
            className={'dg' + (talep.parcaSevk ? '' : ' dg--ana')}
            onClick={onSevk}
          >
            {!talep.parcaSevk
              ? 'Parçayı Gönderdim'
              : talep.parcaSevk.takipNo
                ? 'Kargo Bilgisini Düzelt'
                : 'Kargo Bilgisini Gir'}
          </button>
        </div>
      )}
    </Bolum>
  )
}

/* Hak ediş düzeltme formu.

   GEREKÇE ZORUNLU. Rakamı değiştiren kişi neden değiştirdiğini
   yazıyor ve o cümle servisin ekranında duruyor. Gerekçesiz düzeltme,
   servis açısından "PAKSAN parayı kırptı"dan başka bir şey değil. */
function HakkedisFormu({ talep, onKapat, onKaydet }) {
  const k = talep.servisKaydi || {}
  const [km, setKm] = useState(String(k.km || ''))
  /* İŞÇİLİK SÜREYLE DÜZELTİLİYOR (22 Eylül 2026): servis süreyi
     yazıyor, tutar saat ücretinden çıkıyor (bkz. lib/servisKaydi.js →
     TARIFE). Ücret kaydın kendi ücreti — tarife sonradan değiştiyse
     düzeltme eski işi yeni ücretle hesaplamasın. Süresi olmayan eski
     kayıtta kutu boş açılıyor; boş bırakılırsa eski tutar korunuyor,
     süre yazılırsa tutar süreden hesaplanıyor. */
  const saatUcreti = saatUcretiOku(k)
  /* Km ücreti de kaydın kendi ücreti (23 Eylül 2026'dan beri kayıt
     taşıyor; eskisinde başlangıç ücreti — bkz. servisKaydi.js). */
  const kmUcreti = kmUcretiOku(k)
  const eskiTutar = k.iscilikSaat == null && Number(k.iscilik) > 0
  const [saat, setSaat] = useState(k.iscilikSaat ? sureYaz(k.iscilikSaat) : '')
  const iscilik = eskiTutar && !saat ? {} : iscilikAlanlari(saat, saatUcreti)
  const [parcalar, setParcalar] = useState(() => temizParcalar(k.parcalar))
  const katalog = useParcaKatalogu(parcalar.some((p) => p.kod && p.gorsel === undefined))
  const [neden, setNeden] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (neden.trim().length < 5) return setHata('Düzeltme gerekçesini yazın.')
    onKaydet({
      kayit: { ...k, km: Number(km) || 0, ...iscilik, parcalar },
      neden: neden.trim(),
    })
  }

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Servis Kaydını Düzelt</h2>
        </div>
        <div className="kart__ic">
          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            {talep.no} · {k.servisAd}. Yaptığınız değişiklik gerekçesiyle
            birlikte servisin ekranında görünecek.
          </p>

          <label className="alan">
            <span className="alan__ad">Gidilen Yol (km)</span>
            <input
              className="gir"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))}
            />
            <span className="kucuk sonuk" style={{ display: 'block', marginTop: 4 }}>
              {`Kilometre başına ${paraYaz(kmUcreti)} ${PARA_BIRIMI} · yol tutarı ${paraYaz(
                Math.round((Number(km) || 0) * kmUcreti),
              )} ${PARA_BIRIMI}`}
            </span>
          </label>

          <label className="alan">
            <span className="alan__ad">İşçilik Süresi (saat)</span>
            <input
              className="gir"
              inputMode="decimal"
              value={saat}
              onChange={(e) => setSaat(saatGirdisi(e.target.value))}
            />
            <span className="kucuk sonuk" style={{ display: 'block', marginTop: 4 }}>
              {`Saat başına ${paraYaz(saatUcreti)} ${PARA_BIRIMI} · işçilik tutarı ${paraYaz(
                iscilik.iscilik ?? (Number(k.iscilik) || 0),
              )} ${PARA_BIRIMI}`}
            </span>
          </label>

          {parcalar.length > 0 && (
            <div style={{ margin: '12px 0' }}>
              <div className="kucuk sonuk" style={{ marginBottom: 6 }}>
                Parçalar
              </div>
              {parcalar.map((p, i) => (
                <div key={p.ad} className="satir" style={{ gap: 10, marginBottom: 6 }}>
                  {/* Adedi düzelten personel parçayı resminden de tanısın
                      (bkz. components/ParcaResmi.jsx). */}
                  <ParcaResmi katalog={katalog} kod={p.kod} gorsel={p.gorsel} boyut={48} />
                  <span style={{ flex: 1 }}>
                    {p.ad}
                    {p.kod && <span className="kucuk sonuk mono" style={{ display: 'block' }}>{p.kod}</span>}
                  </span>
                  <input
                    className="gir"
                    style={{ width: 80 }}
                    inputMode="numeric"
                    value={String(p.adet)}
                    onChange={(e) => {
                      const adet = Number(e.target.value.replace(/\D/g, '')) || 0
                      setParcalar((l) => l.map((x, j) => (j === i ? { ...x, adet } : x)))
                    }}
                  />
                </div>
              ))}
              <p className="kucuk sonuk">Adedi sıfırlanan parça kayıttan çıkar.</p>
            </div>
          )}

          <label className="alan">
            <span className="alan__ad">Düzeltme Gerekçesi</span>
            <textarea
              className="gir"
              rows={3}
              value={neden}
              onChange={(e) => setNeden(e.target.value)}
              placeholder="Örnek: Mesafe haritada 40 km, 120 km yazılmış."
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Red formu. Gerekçe zorunlu ve servise gidiyor: reddedilen kaydın
   sebebini bilmeyen servis aynı hatayı tekrar yapıyor.

   RET KESİN (25 Eylül 2026, tasarım kararı; kullanıcı sınaması). Pencere
   yalnız "gerekçe görünecek, talep kapanacak" diyordu; personel reddi
   "düzeltip yeniden gönderin" diye kullandı, oysa servisin yeniden
   gönderme yolu yok (bkz. veri.js → hakkedisReddet). Pencere artık ne
   olacağını tam söylüyor ve düzeltilebilir hata için Düzelt'e
   yönlendiriyor: km, işçilik süresi ve parça PAKSAN tarafından
   gerekçesiyle düzeltiliyor, kayıt onayda kalıyor. */
function RedFormu({ talep, onKapat, onKaydet, onDuzelt }) {
  const [neden, setNeden] = useState('')
  const [hata, setHata] = useState('')

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 440 }}>
        <div className="kart__tepe">
          <h2>Hak Edişi Kabul Etme</h2>
        </div>
        <div className="kart__ic">
          <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
            {talep.no} · Kabul etmediğiniz kayıt için servise ödeme yapılmaz ve talep
            kapanır. Servis bu kaydı yeniden gönderemez. Gerekçe servisin ekranında
            görünür.
          </p>
          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            Kilometre, işçilik süresi ya da parça yanlışsa kaydı reddetmeyin; Düzelt ile
            doğrusunu yazın. Eksik bilgi için servise not yazın; kayıt onay beklemeye
            devam eder.
          </p>
          <label className="alan">
            <span className="alan__ad">Gerekçe</span>
            <textarea
              className="gir"
              rows={3}
              value={neden}
              onChange={(e) => setNeden(e.target.value)}
              placeholder="Örnek: Makinenin garantisi 2023 yılında doldu."
            />
          </label>
          {hata && <div className="uyari">{hata}</div>}
          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() =>
                neden.trim().length < 5
                  ? setHata('Gerekçeyi yazın.')
                  : onKaydet(neden.trim())
              }
            >
              Kabul Etme
            </button>
            {onDuzelt && (
              <button className="dg" onClick={onDuzelt}>
                Düzelt
              </button>
            )}
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Parça sevk formu.

   TALEBİ KAPATMIYOR. Parça yola çıkıyor ama iş bitmiyor: takılması
   gerekiyor ve onu yalnız serviste olan biri bilebilir. Talep açık
   kalıyor; garanti işinde servis parçayı takınca kaydını tamamlıyor ve
   kayıt onaya geliyor. (Eski garanti dışı parça isteğinde servis
   talebi kendisi kapatıyordu.)

   KARGO BİLGİSİ ZORUNLU DEĞİL VE SONRADAN GİRİLEBİLİYOR.

   Kargo firması zorunluydu, takip numarası kutusu da formda
   duruyordu. Gerçekte ikisi de gönderim anında elde olmuyor: paket
   şubeye veriliyor, numara akşam ya da ertesi gün geliyor. Zorunlu
   alan bu durumda iki şeyden birini üretiyordu — ya personel
   uydurma bir şey yazıyordu ya da parça yola çıktığı hâlde kayda
   girilmiyordu. İkisi de servisi bekletiyor.

   Şimdi ikisi de boş bırakılabiliyor ve aynı form talep açıkken
   yeniden açılıp doldurulabiliyor. Gönderim tarihi ilk kaydın
   tarihi olarak kalıyor (bkz. veri.js → servisParcasiGonderildi).

   SERVİSE NOT AYNI FORMDA. "Kapıya bırakılacak", "iki koli gitti",
   "eski kasnağı da koydum" gibi bilgilerin servise ulaşacağı başka
   bir yol yoktu; müşteriye giden not mekanizmasının aynısı, muhatabı
   servis. */
function SevkFormu({ talep, onKapat, onKaydet }) {
  const sevk = talep.parcaSevk || null
  const [firma, setFirma] = useState(sevk?.firma || '')
  const [takipNo, setTakipNo] = useState(sevk?.takipNo || '')
  const [not, setNot] = useState('')
  const parcalar = temizParcalar(talep.servisKaydi?.parcalar)

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
        <div className="kart__tepe">
          <h2>{sevk ? 'Kargo bilgisi' : 'Parçayı gönder'}</h2>
        </div>
        <div className="kart__ic">
          <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
            {talep.no} ·{' '}
            {sevk
              ? 'Parça gönderildi olarak işaretli. Kargo bilgisini şimdi girebilir ya da güncelleyebilirsiniz.'
              : talep.servisKaydi?.kapi === 'parcaIste'
                ? 'Talep kapanmayacak; servis parçayı taktıktan sonra kendisi kapatacak.'
                : 'Parça gönderilince talep açık kalacak; servis parçayı takıp kaydını tamamladıktan sonra servis biriminin onayıyla kapanacak.'}
          </p>

          {parcalar.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <ParcaTablosu parcalar={parcalar} />
            </div>
          )}

          {/* Kargo formu adresle birlikte: gönderi bu bilgiyle
              hazırlanıyor. */}
          {talep.servisKaydi?.teslimat && (
            <div style={{ marginBottom: 14 }}>
              <TeslimatAdresi teslimat={talep.servisKaydi.teslimat} ust={0} />
            </div>
          )}

          <label className="alan">
            <span className="alan__ad">
              Kargo firması <span className="sonuk">· isteğe bağlı</span>
            </span>
            <input className="gir" value={firma} onChange={(e) => setFirma(e.target.value)} />
          </label>
          <label className="alan">
            <span className="alan__ad">
              Takip numarası <span className="sonuk">· sonradan girilebilir</span>
            </span>
            <input
              className="gir"
              value={takipNo}
              onChange={(e) => setTakipNo(e.target.value)}
            />
          </label>
          <label className="alan">
            <span className="alan__ad">
              Servise not <span className="sonuk">· isteğe bağlı</span>
            </span>
            <textarea
              className="metin"
              style={{ minHeight: 62 }}
              value={not}
              onChange={(e) => setNot(e.target.value)}
            />
            <span className="alan__ipucu">
              Yazdığınız cümle servisin uygulamasında bu talebin içinde görünür.
            </span>
          </label>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() =>
                onKaydet({
                  kargo: { firma: firma.trim(), takipNo: takipNo.trim() },
                  not: not.trim(),
                })
              }
            >
              {sevk ? 'Kaydet' : 'Gönderildi Olarak İşaretle'}
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Müşterinin kapanmış parça talebinde kargo bilgisi (26 Eylül 2026,
   ikinci kullanıcı sınaması O2; veri.js → musteriKargosunuGuncelle).
   SevkFormu'nun müşteri karşılığı: servise not ve teslimat adresi yok,
   talep kapalı kalıyor. Alan adları SevkFormu'yla aynı. */
function MusteriKargoFormu({ talep, musteriyeGider, onKapat, onKaydet }) {
  const [firma, setFirma] = useState(talep.parcaSevk?.firma || '')
  const [takipNo, setTakipNo] = useState(talep.parcaSevk?.takipNo || '')
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
        <div className="kart__tepe">
          <h2>Kargo bilgisi</h2>
        </div>
        <div className="kart__ic">
          <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
            {talep.no} ·{' '}
            {musteriyeGider
              ? 'Parça kargoya verildi. Kargo bilgisini şimdi girebilir ya da düzeltebilirsiniz. Kaydettiğinizde müşteriye bildirim gönderilecek.'
              : 'Parça kargoya verildi. Kargo bilgisini şimdi girebilir ya da düzeltebilirsiniz. Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek.'}
          </p>
          <label className="alan">
            <span className="alan__ad">Kargo firması</span>
            <input className="gir" value={firma} onChange={(e) => setFirma(e.target.value)} />
          </label>
          <label className="alan">
            <span className="alan__ad">Takip numarası</span>
            <input className="gir" value={takipNo} onChange={(e) => setTakipNo(e.target.value)} />
          </label>
          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => onKaydet({ firma: firma.trim(), takipNo: takipNo.trim() })}
            >
              Kaydet
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
function PlanFormu({ talep, alicilar, onKapat, onKaydet }) {
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
              min={simdiGirdi()}
              value={tarih}
              onChange={(e) => {
                setTarih(e.target.value)
                setHata('')
              }}
              /* Klavyeyle yazılan geçmiş zaman kutudan çıkınca siliniyor
                 (bkz. lib/tarih.js → "Üçüncü katman"). */
              onBlur={(e) => {
                if (e.target.value && !ileriTarihMi(e.target.value, { saatli: true })) {
                  setTarih('')
                  setHata('Geçmiş bir tarih veya saat seçilemez.')
                }
              }}
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

          {/* Kime gittiği veri katmanından (25 Eylül 2026, Y4; bkz.
              Detay → alicilar): servis siparişinde tarih servise gidiyor;
              talep müşterinin uygulamadaki hesabına bağlı değilse
              müşteriye hiçbir şey gitmiyor ve bunu önceden söylüyor. */}
          <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
            {talep.servisSiparisi
              ? 'Gönderim tarihi servisin uygulamasına bildirim olarak gider.'
              : alicilar && !alicilar.musteri
                ? 'Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek. Tarihi müşteriye telefonla bildirin.'
                : 'Bu bilgiler müşterinin bildirimlerine aynen gidiyor; randevudan bir gün önce hatırlatma da düşüyor.'}
          </p>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (!tarih) return setHata('Planlanan tarih ve saati seçin.')
                /* GEÇMİŞ ZAMAN KAYDEDİLEMİYOR. Kutudaki `min` yalnız
                   takvimin denetimi; elle yazılan değer geçiyordu ve
                   geçmişte duran bir randevu hem müşteriye yanlış
                   bildirim gönderiyor hem de hatırlatma zincirini
                   bozuyordu. Saatli sorulduğu için bugünün geçmiş
                   saati de geçersiz. */
                if (!ileriTarihMi(tarih, { saatli: true })) {
                  return setHata('Geçmiş bir tarih veya saat seçilemez.')
                }
                if (is.trim().length < 5) return setHata('Planlanan işi yazın.')
                if (gorusmeSart && !gorusuldu) {
                  return setHata('Randevuyu kaydetmeden önce müşteriyle görüşün.')
                }
                const d = new Date(tarih)
                onKaydet({
                  gorusuldu,
                  /* Backoffice gün VE saat soruyor (25 Eylül 2026;
                     Servisim yalnız gün soruyor ve false yazıyor, bkz.
                     lib/tarih.js → randevuSaatliMi). Veritabanında
                     talep.Randevu.SaatBelirtildi. */
                  saatBelirtildi: true,
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

  /* GÖNDERİLEN PARÇALAR — yalnız servis siparişinde (24 Eylül 2026,
     kullanıcının kararı). Stokta olmayan parçanın işareti kaldırılıyor;
     bakiyeden ödenen siparişte servisin bakiyesinden yalnız işaretli
     parçaların tutarı düşülüyor (veri.js → talepKapat). Daha önce
     gönderilmiş satır (yeniden açılmış talep) işaretli ve kilitli. */
  const gonderim = siparisGonderimi(talep)
  /* İptal edilmiş kalem (yeniden açılmış siparişte) listede çıkmıyor:
     siparişte artık yok (veri.js → kalanParcalariIptalEt). */
  const gonderilebilir = gonderim
    ? talep.parcaFiyat.satirlar.map((_, i) => i).filter((i) => !gonderim.iptal.includes(i))
    : []
  const [secili, setSecili] = useState(() => gonderilebilir)

  /* KARGO — yalnız müşterinin parça talebinde (25 Eylül 2026, kullanıcı
     sınaması). Takip numarası kapanışta sorulmuyordu; personel onu ayrı
     bir "müşteriye not" ile gönderiyor, çiftçiye art arda iki benzer
     bildirim düşüyordu. Artık kapanış bildirimiyle gidiyor (veri.js →
     talepKapat, talebin `parcaSevk` alanı). İki kutu da isteğe bağlı:
     numara sonradan gelirse not yolu duruyor. Servis siparişinin kargosu
     gönderim başına düşünülmeli, burada sorulmuyor. */
  const kargolu = talep.tur === 'parca' && !talep.servisSiparisi
  const [kargo, setKargo] = useState(() => ({
    firma: talep.parcaSevk?.firma || '',
    takipNo: talep.parcaSevk?.takipNo || '',
  }))

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
    if (gonderim && !secili.length) return setHata('En az bir parçayı işaretleyin.')
    onKaydet({
      ...temiz,
      fis,
      ozet: kapanisOzeti(talep.tur, temiz),
      ...(gonderim ? { gonderilen: secili } : {}),
      ...(kargolu ? { kargo: { firma: kargo.firma.trim(), takipNo: kargo.takipNo.trim() } } : {}),
    })
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
          {/* Servis siparişi kapanırken parça kargoya veriliyor; adres
              formun başında, başka yere bakmadan okunuyor. */}
          {talep.servisSiparisi && talep.teslimat && (
            <div style={{ marginBottom: 14 }}>
              <TeslimatAdresi teslimat={talep.teslimat} ust={0} />
            </div>
          )}

          {gonderim && (
            <GonderimSecimi
              talep={talep}
              kilitli={gonderim.gonderilen}
              yalniz={gonderim.iptal.length ? gonderilebilir : undefined}
              secili={secili}
              setSecili={(x) => {
                setSecili(x)
                setHata('')
              }}
              aciklama={
                talep.odeme === 'bakiye'
                  ? 'Göndermediğiniz parçaların işaretini kaldırın. Servisin bakiyesinden yalnız gönderilen parçaların tutarı düşülür. Kalan parçaların tutarı, gönderildikleri gün düşülür.'
                  : 'Göndermediğiniz parçaların işaretini kaldırın. Servis, gönderilmeyen parçaları uygulamasında görür.'
              }
            />
          )}

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

          {kargolu && (
            <>
              <label className="alan">
                <span className="alan__ad">
                  Kargo firması <span className="sonuk">· isteğe bağlı</span>
                </span>
                <input
                  className="gir"
                  value={kargo.firma}
                  onChange={(e) => setKargo({ ...kargo, firma: e.target.value })}
                />
              </label>
              <label className="alan">
                <span className="alan__ad">
                  Takip numarası <span className="sonuk">· isteğe bağlı</span>
                </span>
                <input
                  className="gir"
                  value={kargo.takipNo}
                  onChange={(e) => setKargo({ ...kargo, takipNo: e.target.value })}
                />
                <span className="alan__ipucu">
                  Kargo firması ve takip numarası, talebin kapandığını bildiren mesajla
                  müşteriye gider. Ayrıca not göndermenize gerek yok.
                </span>
              </label>
            </>
          )}

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
const GECERLILIK_GECMIS = 'Geçerlilik tarihi bugünden önce olamaz.'

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
              onChange={(e) => {
                setGecerlilik(e.target.value)
                setHata('')
              }}
              onBlur={() => {
                if (metindeGecmisTarihVar(gecerlilik)) setHata(GECERLILIK_GECMIS)
              }}
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
                /* Geçerlilik serbest yazı ("30 gün" de yazılabiliyor);
                   içinde tarih varsa bugünden önce olamaz: müşteri
                   süresi dolmuş bir teklif görürdü. */
                if (metindeGecmisTarihVar(gecerlilik)) return setHata(GECERLILIK_GECMIS)
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

/* SERVİS SİPARİŞİNİN İPTALİ (24 Eylül 2026, kullanıcının kararı). Sebep
   ve açıklama servise gidiyor, müşteriye değil. Parçası gönderilmiş
   bakiye siparişinde düşülen tutar bakiyeye geri ekleniyor ve pencere
   rakamı önceden söylüyor (veri.js → siparisIadesiniYaz). Faturalı
   siparişte uygulama para yazmıyor; fatura kesildiyse iadesi LOGO'da. */
const SIPARIS_IPTAL_SEBEPLERI = [
  'Servis siparişten vazgeçti',
  'Parça temin edilemiyor',
  'Yanlış parça sipariş edilmiş',
  'Parçalar iade alındı',
  'Aynı sipariş iki kez verilmiş',
]

function IptalFormu({ talep, onKapat, onKaydet }) {
  const [neden, setNeden] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')
  const siparis = Boolean(talep.servisSiparisi)
  const hesap = siparis ? siparisHesabi(talep) : null
  const gonderildi = siparis && (talep.status === 'kapandi' || (talep.gonderimler?.length || 0) > 0)

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>{siparis ? 'Siparişi İptal Et' : 'Talebi İptal Et'} · {talep.no}</h2>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">İptal nedeni</span>
            <select className="sec" value={neden} onChange={(e) => setNeden(e.target.value)}>
              <option value="">Seçilmedi</option>
              {(siparis ? SIPARIS_IPTAL_SEBEPLERI : IPTAL_SEBEPLERI).map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label className="alan">
            <span className="alan__ad">
              {siparis ? 'Servise açıklama' : 'Müşteriye açıklama'}
              <span className="sonuk"> · isteğe bağlı</span>
            </span>
            <textarea
              className="metin"
              style={{ minHeight: 78 }}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder={
                siparis
                  ? 'Örnek: Bu parça artık üretilmiyor. Yerine kullanılabilecek parçayı ayrıca önereceğiz.'
                  : 'Örnek: Aradığımızda makinenin satıldığını öğrendik.'
              }
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          {siparis && talep.odeme === 'bakiye' && (
            <div className="bilgi" style={{ marginBottom: 14 }}>
              {hesap.dusulen > 0
                ? `Bu sipariş için servisin bakiyesinden ${paraYaz(hesap.dusulen)} ${PARA_BIRIMI} düşülmüştü. İptal edildiğinde bu tutar servisin bakiyesine geri eklenir.`
                : 'Bu sipariş için servisin bakiyesinden henüz tutar düşülmedi. İptal edildiğinde bakiye değişmez.'}
            </div>
          )}
          {siparis && talep.odeme !== 'bakiye' && gonderildi && (
            <div className="bilgi" style={{ marginBottom: 14 }}>
              Bu sipariş faturayla ödeniyor. Fatura kesildiyse parçalar geri geldiğinde iade faturasını
              LOGO'da işleyin. Uygulama bakiyede değişiklik yapmaz.
            </div>
          )}

          <div className="uyari" style={{ marginBottom: 14 }}>
            <span>
              {siparis ? (
                <>
                  Buraya yazdıklarınız servisin uygulamasında <b>aynen</b> görünecek.
                </>
              ) : (
                <>
                  Buraya yazdıklarınız müşterinin uygulamasında <b>aynen</b> görünecek.
                  Müşteri "talebim neden iptal oldu?" sorusunun yanıtını burada okuyacak.
                </>
              )}
            </span>
          </div>

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (!neden) return setHata('İptal nedenini seçin.')
                onKaydet({ neden, aciklama: aciklama.trim() })
              }}
            >
              İptal Et ve Bildir
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

/* Talepteki parçaların, TALEP AÇILDIĞI GÜNKÜ tutarı.

   Bu bir fatura değil, KONTROL SATIRI: dekonttaki rakamla
   karşılaştırılıyor. Bu yüzden rakam katalogdan yeniden
   hesaplanamaz — müşteri havaleyi o gün gördüğü tutardan yaptı,
   fiyat listesi o günden sonra değişmiş olabilir. Kaydın içindeki
   anlık görüntü okunuyor (bkz. lib/servisKaydi.js → talebinParcalari).

   Fiyatı bilinmeyen parça varsa toplam eksik demektir ve bu ekranda
   yazıyor — yoksa personel eksik parayı onaylayabilir.

   ESKİ KAYITLARDA HİÇ FİYAT YOK: anlık görüntü alınmaya başlamadan
   önce açılmış talepler yalnız parça adlarını taşıyor. Orada parça
   listesi gösteriliyor, tutar gösterilmiyor; bugünkü fiyatı yazmak
   dekontla karşılaştırılan rakamı uydurmak olurdu. */
function BeklenenTutar({ talep }) {
  const kalemler = talebinParcalari(talep)
  const goruntu = talep.parcaFiyat

  if (!kalemler.length) return <span className="kucuk sonuk">Parça seçilmemiş.</span>

  if (!goruntu) {
    return (
      <>
        {kalemler.map((k, i) => (
          <div key={i} className="kucuk" style={{ marginBottom: 4 }}>
            {k.ad || '—'}
            {k.adet > 1 ? ` × ${k.adet}` : ''}
          </div>
        ))}
        <div className="uyari" style={{ marginTop: 10, marginBottom: 0 }}>
          <span>Bu talep fiyat listesi gelmeden önce açıldığı için kayıtta fiyat dökümü bulunmuyor. Parça tutarları için fiyat listesine bakın.</span>
        </div>
      </>
    )
  }

  return (
    <>
      {kalemler.map((k, i) => (
        <div key={i} className="satir" style={{ gap: 10, marginBottom: 4 }}>
          <span className="kucuk">
            {k.ad || '—'}
            {k.adet > 1 ? ` × ${k.adet}` : ''}
            {k.kod ? <span className="sonuk"> · {k.kod}</span> : null}
          </span>
          <span className="kucuk mono" style={{ marginLeft: 'auto' }}>
            {k.tutar === null || k.tutar === undefined
              ? '—'
              : paraYaz(k.tutar) + ' ' + PARA_BIRIMI}
          </span>
        </div>
      ))}

      {/* SERVİS İSKONTOSU (23 Eylül 2026). Servis siparişinin görüntüsü
          sipariş anındaki oranı ve liste fiyatıyla toplamı taşıyor
          (bkz. veri.js → servisParcaSiparisi). Satır tutarları zaten
          iskontolu; burada ne kadar düşüldüğü görünüyor. Oranı taşımayan
          eski siparişte satır çıkmıyor. */}
      {goruntu.iskontoOrani !== undefined && goruntu.listeToplam !== undefined && (
        <>
          <div className="satir kucuk sonuk" style={{ gap: 10, marginTop: 8 }}>
            <span>Liste fiyatıyla toplam</span>
            <span className="mono" style={{ marginLeft: 'auto' }}>
              {paraYaz(goruntu.listeToplam)} {PARA_BIRIMI}
            </span>
          </div>
          <div className="satir kucuk" style={{ gap: 10, marginTop: 2 }}>
            <span>Servis iskontosu (%{Math.round(goruntu.iskontoOrani * 100)})</span>
            <span className="mono" style={{ marginLeft: 'auto' }}>
              −{paraYaz(goruntu.iskontoTutari)} {PARA_BIRIMI}
            </span>
          </div>
        </>
      )}

      {/* BAKİYEDEN ÖDEME EK İSKONTOSU (24 Eylül 2026). Servis siparişi
          bakiyeden ödüyorsa ve o gün ek iskonto açıksa görüntü oranı ve
          düşülen tutarı taşıyor; KDV dâhil toplam ek iskontolu. Cariden
          düşülecek tutar bu toplam (veri.js → talepKapat). */}
      {Number(goruntu.bakiyeIskontoTutari) > 0 && (
        <div className="satir kucuk" style={{ gap: 10, marginTop: 2 }}>
          <span>Bakiyeden ödeme ek iskontosu (%{Math.round(goruntu.bakiyeIskontoOrani * 100)})</span>
          <span className="mono" style={{ marginLeft: 'auto' }}>
            −{paraYaz(goruntu.bakiyeIskontoTutari)} {PARA_BIRIMI}
          </span>
        </div>
      )}

      <div
        className="satir"
        style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--cizgi)' }}
      >
        <b>KDV dâhil toplam</b>
        <b className="mono" style={{ marginLeft: 'auto' }}>
          {paraYaz(goruntu.toplam)} {PARA_BIRIMI}
        </b>
      </div>

      {goruntu.eksikFiyat && (
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

/* ==========================================================================
   Servis siparişinin eksik gönderimi (24 Eylül 2026)

   Kullanıcının kararı: siparişteki bir parça stokta yoksa personel
   talebi kapatırken onun işaretini kaldırıyor; bakiyeden ödenen
   siparişte servisin bakiyesinden yalnız gönderilen parçaların tutarı
   düşülüyor. Kalan parça stok gelince "Kalan Parçaları Gönder" ile
   gidiyor ve tutarı o gün düşülüyor. Hesap veri katmanında
   (veri.js → talepKapat, kalanParcalariGonder); bu ekran seçimi alıyor
   ve düşülecek tutarı önceden gösteriyor.
   ========================================================================== */

/* Servis siparişinin dökümü ve bakiye durumu (24 Eylül 2026).

   KULLANICININ BULDUĞU HATA. Bu bölümde "Sipariş tutarı" diye KDV
   hariç ara toplam yazıyordu, Servisim'in sipariş listesi de aynı
   rakamı gösteriyordu; servisin bakiyesinden düşen ise KDV dâhil
   tutardı. İki ekran birbirini tutuyor, bakiyeden düşen rakam ikisini
   de tutmuyordu. Şimdi tutar döküm olarak yazıyor: indirimler, KDV
   hariç ara toplam adıyla, KDV dâhil genel toplam. Altında bakiyeden
   ödenen siparişin durumu: ne kadar düşüldü, ne kadar gönderilince
   düşülecek (veri.js → siparisHesabi). Kısmi gönderimde düşülen
   genel toplamdan azdır ve bu satır nedenini söyler.

   Rakamlar kaydın fiyat görüntüsünden; katalog açılmıyor. Görüntüsü
   olmayan eski siparişte yalnız toplam. */
function SiparisDokumu({ talep }) {
  const g = talep.parcaFiyat
  const hesap = siparisHesabi(talep)
  const para = (n) => `${paraYaz(n)} ${PARA_BIRIMI}`
  const satir = (ad, deger, { sonuk, eksi } = {}) => (
    <div className={'satir kucuk' + (sonuk ? ' sonuk' : '')} style={{ gap: 10, marginTop: 2 }}>
      <span>{ad}</span>
      <span className="mono" style={{ marginLeft: 'auto' }}>
        {eksi ? '−' : ''}
        {para(deger)}
      </span>
    </div>
  )

  return (
    <div style={{ marginTop: 10 }}>
      {g && g.listeToplam !== undefined && g.iskontoOrani !== undefined && (
        <>
          {satir('Liste fiyatıyla toplam', g.listeToplam, { sonuk: true })}
          {satir(`Servis iskontosu (%${Math.round(g.iskontoOrani * 100)})`, g.iskontoTutari, { eksi: true })}
        </>
      )}
      {g && Number(g.bakiyeIskontoTutari) > 0 &&
        satir(
          `Bakiyeden ödeme ek iskontosu (%${Math.round(g.bakiyeIskontoOrani * 100)})`,
          g.bakiyeIskontoTutari,
          { eksi: true },
        )}
      {g && g.araToplam !== undefined && satir('Ara toplam (KDV hariç)', g.araToplam)}
      {g && KDV_HARIC_LISTE && g.kdv !== undefined && satir(`KDV %${Math.round(KDV_ORANI * 100)}`, g.kdv)}
      <div
        className="satir"
        style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--cizgi)' }}
      >
        <b>Genel toplam (KDV dâhil)</b>
        <b className="mono" style={{ marginLeft: 'auto' }}>{para(hesap.toplam)}</b>
      </div>
      {g?.eksikFiyat && (
        <div className="uyari" style={{ marginTop: 10, marginBottom: 0 }}>
          <span>Bazı parçaların fiyatı listede yok. Bu yüzden yukarıdaki toplam eksik.</span>
        </div>
      )}

      {/* İPTAL EDİLEN KALEMLER (24 Eylül 2026, veri.js →
          kalanParcalariIptalEt). Genel toplam siparişin ilk hâli olarak
          kalıyor — yukarıdaki satırlar onu topluyor; iptal edilen pay ve
          servisin ödeyeceği yeni tutar altında ayrı. Kim, ne zaman, neden
          iptal etti, satırın altında. */}
      {hesap.iptalEdilen > 0 && (
        <>
          {satir('İptal edilen parçalar', hesap.iptalEdilen, { eksi: true })}
          <div className="satir" style={{ gap: 10, marginTop: 4 }}>
            <b>Siparişin yeni tutarı (KDV dâhil)</b>
            <b className="mono" style={{ marginLeft: 'auto' }}>{para(hesap.net)}</b>
          </div>
        </>
      )}
      {(talep.kalemIptalleri || []).map((k) => (
        <div key={k.no} className="kucuk sonuk" style={{ marginTop: 6 }}>
          {k.satirlar?.length} kalem iptal edildi · {k.neden}
          {k.aciklama ? ` · ${k.aciklama}` : ''} · {k.personel} · {tarihYaz(k.tarih)}
        </div>
      ))}

      {talep.odeme === 'bakiye' && (
        <div className="siparis-bakiye">
          {/* İptal edilip iadesi yapılmış siparişte net düşülen sıfır;
              satır yerine iade satırı konuşuyor. */}
          {(hesap.dusulen > 0 || talep.status !== 'iptal') &&
            satir('Servisin bakiyesinden düşülen', hesap.dusulen)}
          {hesap.bekleyen > 0 &&
            satir(
              talep.status === 'kapandi'
                ? 'Kalan parçalar gönderilince düşülecek'
                : 'Parçalar gönderilince düşülecek',
              hesap.bekleyen,
            )}
          {hesap.iade > 0 && satir('İptal sonrası bakiyeye geri eklenen', hesap.iade)}
        </div>
      )}
    </div>
  )
}

/* Talebin parça satırları, gönderilmemiş olanın altında etiketle.
   Talep kapanmadıysa "gönderilmedi" etiketi yok: henüz hiçbir şey
   gönderilmedi, etiket her satırda aynı şeyi söylerdi. İptal edilen
   kalemin etiketi her durumda (veri.js → kalanParcalariIptalEt). */
function gonderimliParcalar(talep, etiket) {
  const parcalar = talebinParcalari(talep)
  const g = siparisGonderimi(talep)
  if (!g) return parcalar
  const kalan = talep.status === 'kapandi' ? g.kalan : []
  if (!kalan.length && !g.iptal.length) return parcalar
  return parcalar.map((p, i) =>
    g.iptal.includes(i) ? { ...p, not: 'İptal edildi' } : kalan.includes(i) ? { ...p, not: etiket } : p,
  )
}

/* İşaret kutulu satır listesi ve bakiyeden düşülecek tutar.
   `kilitli`: daha önce gönderilmiş satırlar (işaretli, değiştirilemez).
   `tutarsiz`: alttaki "bakiyeden düşülecek" satırı çıkmıyor (kalemi
   iptal ederken bakiyeden bir şey düşülmüyor). */
function GonderimSecimi({
  talep, kilitli = [], secili, setSecili, aciklama, yalniz,
  baslik = 'Gönderilen parçalar', tutarsiz = false,
}) {
  const satirlar = talep.parcaFiyat?.satirlar || []
  const gorunen = satirlar.map((s, i) => ({ s, i })).filter(({ i }) => !yalniz || yalniz.includes(i))
  const dusulecek =
    talep.odeme === 'bakiye' && !tutarsiz
      ? gonderilenTutar(talep.parcaFiyat, [...new Set([...kilitli, ...secili])], 'bakiye') -
        (kilitli.length ? gonderilenTutar(talep.parcaFiyat, kilitli, 'bakiye') : 0)
      : null

  function degis(i, acik) {
    setSecili(acik ? [...new Set([...secili, i])].sort((a, b) => a - b) : secili.filter((x) => x !== i))
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="alan__ad" style={{ marginBottom: 4 }}>{baslik}</div>
      <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>{aciklama}</p>
      {gorunen.map(({ s, i }) => {
        const once = kilitli.includes(i)
        return (
          <label className="secim" key={i} style={{ alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={once || secili.includes(i)}
              disabled={once}
              onChange={(e) => degis(i, e.target.checked)}
            />
            <span style={{ flex: 1 }}>
              {s.ad || s.kod || '—'}
              {Number(s.adet) > 1 ? ` × ${s.adet}` : ''}
              {s.kod ? <span className="sonuk"> · {s.kod}</span> : null}
            </span>
            <span className="kucuk mono">
              {typeof s.tutar === 'number' ? `${paraYaz(s.tutar)} ${PARA_BIRIMI}` : '—'}
            </span>
          </label>
        )
      })}
      {dusulecek !== null && (
        <div className="satir" style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--cizgi)' }}>
          <b>Bakiyeden düşülecek tutar</b>
          <b className="mono" style={{ marginLeft: 'auto' }}>
            {paraYaz(dusulecek)} {PARA_BIRIMI}
          </b>
        </div>
      )}
    </div>
  )
}

/* Kapanmış siparişin bekleyen parçalarını gönderme penceresi. Kalan
   satırların hepsi işaretli açılıyor; stok yine eksikse işaret
   kaldırılıyor ve o satır beklemeye devam ediyor. */
function KalanParcaFormu({ talep, onKapat, onKaydet }) {
  const g = siparisGonderimi(talep)
  const [secili, setSecili] = useState(() => g?.kalan || [])
  const [hata, setHata] = useState('')

  function kaydet() {
    if (!secili.length) return setHata('En az bir parçayı işaretleyin.')
    const h = onKaydet(secili)
    if (h) setHata(h)
  }

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Kalan Parçaları Gönder · {talep.no}</h2>
        </div>
        <div className="kart__ic">
          {talep.teslimat && (
            <div style={{ marginBottom: 14 }}>
              <TeslimatAdresi teslimat={talep.teslimat} ust={0} />
            </div>
          )}
          <GonderimSecimi
            talep={talep}
            kilitli={g?.gonderilen || []}
            yalniz={g?.kalan || []}
            secili={secili}
            setSecili={(x) => {
              setSecili(x)
              setHata('')
            }}
            aciklama="Şimdi gönderdiğiniz parçaları işaretleyin. Bakiyeden ödenen siparişte bu parçaların tutarı servisin bakiyesinden düşülür."
          />
          {hata && <div className="uyari">{hata}</div>}
          <div className="satir" style={{ gap: 8 }}>
            <button className="dg dg--ana" onClick={kaydet}>Kalan Parçaları Gönder</button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* KALAN PARÇALARIN İPTALİ (24 Eylül 2026, kullanıcının onayı). Kısmen
   gönderilmiş siparişin bekleyen kalemleri siparişten çıkarılıyor;
   gönderilenler yerinde kalıyor. Bekleyen kalemin parası bakiyeden
   henüz düşülmediği için bakiyeye bir şey yazılmıyor; pencere
   siparişin yeni tutarını önceden söylüyor (veri.js →
   kalanParcalariIptalEt). Sebep ve açıklama servise gidiyor. */
const KALAN_IPTAL_SEBEPLERI = [
  'Parça temin edilemiyor',
  'Parça üretimden kalktı',
  'Servis kalan parçalardan vazgeçti',
  'Yanlış parça sipariş edilmiş',
]

function KalanIptalFormu({ talep, onKapat, onKaydet }) {
  const g = siparisGonderimi(talep)
  const [secili, setSecili] = useState(() => g?.kalan || [])
  const [neden, setNeden] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')
  const once = siparisNetTutari(talep)
  const sonra = siparisNetTutari({
    ...talep,
    kalemIptalleri: [...(talep.kalemIptalleri || []), { satirlar: secili }],
  })
  const para = (n) => `${paraYaz(n)} ${PARA_BIRIMI}`

  function kaydet() {
    if (!secili.length) return setHata('En az bir parçayı işaretleyin.')
    if (!neden) return setHata('İptal nedenini seçin.')
    const h = onKaydet(secili, { neden, aciklama: aciklama.trim() })
    if (h) setHata(h)
  }

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
        <div className="kart__tepe">
          <h2>Kalan Parçaları İptal Et · {talep.no}</h2>
        </div>
        <div className="kart__ic">
          <GonderimSecimi
            talep={talep}
            baslik="İptal edilecek parçalar"
            tutarsiz
            yalniz={g?.kalan || []}
            secili={secili}
            setSecili={(x) => {
              setSecili(x)
              setHata('')
            }}
            aciklama="Gönderilmeyecek parçaları işaretleyin. Gönderilmiş parçalar siparişte kalır."
          />

          <label className="alan">
            <span className="alan__ad">İptal nedeni</span>
            <select
              className="sec"
              value={neden}
              onChange={(e) => {
                setNeden(e.target.value)
                setHata('')
              }}
            >
              <option value="">Seçilmedi</option>
              {KALAN_IPTAL_SEBEPLERI.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label className="alan">
            <span className="alan__ad">
              Servise açıklama<span className="sonuk"> · isteğe bağlı</span>
            </span>
            <textarea
              className="metin"
              style={{ minHeight: 78 }}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Örnek: Bu parça artık üretilmiyor. Yerine kullanılabilecek parçayı ayrıca önereceğiz."
            />
          </label>

          {hata && <div className="uyari">{hata}</div>}

          <div className="bilgi" style={{ marginBottom: 14 }}>
            {talep.odeme === 'bakiye'
              ? 'Bu parçaların tutarı servisin bakiyesinden henüz düşülmedi. İptal edildiğinde de düşülmeyecek.'
              : "Bu sipariş faturayla ödeniyor. İptal edilen parçaları faturaya yansıtmayın; fatura kesildiyse düzeltmeyi LOGO'da yapın."}{' '}
            Siparişin tutarı {para(once)} iken {para(sonra)} olacak.
          </div>

          <div className="uyari" style={{ marginBottom: 14 }}>
            <span>
              Buraya yazdıklarınız servisin uygulamasında <b>aynen</b> görünecek.
            </span>
          </div>

          <div className="satir" style={{ gap: 8 }}>
            <button className="dg dg--ana" onClick={kaydet}>Kalan Parçaları İptal Et</button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}
