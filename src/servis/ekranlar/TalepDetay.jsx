import { useEffect, useRef, useState } from 'react'
import { useGeri } from '../geri'
import {
  bildirimAlicilari,
  servisSiparisiniIptalEt,
  siparisHesabi,
  talepDurumDegistir,
  talepKapat,
  talepNotEkle,
  talepPlanla,
  talepIptal,
} from '../../backoffice/veri'
import {
  ASAMA, buZiyaretinKaydi, duzeltmeYazisi, GARANTI_DISI_OZET, iscilikYazisi, KAPI,
  parcaYazisiKodlu as parcaYazisi, satirlarinAdedi, siparisGonderimi, talebinParcalari, temizParcalar,
} from '../../lib/servisKaydi'
import { DikteliKutu } from '../Dikte'
import { bildirimYazisi, musteridenMi, okunduSay, talebinBildirimleri } from '../talepBildirimleri'
import { ParcaTablosu } from '../../components/ParcaTablosu'
import { teslimatYazisi } from '../../lib/teslimat'
import { bugunGirdi, gunlukRandevu, ileriTarihMi } from '../../lib/tarih'
import { RANDEVU_ISI } from '../../lib/talep'
import { kayitTelGoster, kayitTelHref } from '../../lib/tel'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { getProduct } from '../../data/katalog/products.js'
import { KDV_HARIC_LISTE, KDV_ORANI, PARA_BIRIMI, paraYaz } from '../../data/katalog/para.js'
import { ServisKapanisi, Secenekler } from './ServisKapanisi'
import { servisFormuPaylas, servisFormuVarMi } from '../servisFormu'
import { BasariSeridi, Onay, Sayfa, useAcilisKilidi } from '../Kabuk'
import {
  extractYear,
  formatSerial,
  matchProduct,
  warrantyStatus,
  GARANTI_YIL,
} from '../../lib/serial'
import {
  IconAlert,
  IconCalendar,
  IconCheckCircle,
  IconDevret,
  IconKamyon,
  IconKulaklik,
  IconNot,
  IconPhone,
  IconPin,
  IconRight,
  IconSaat,
  IconClose,
} from '../../components/Icons'
import { Capacitor } from '@capacitor/core'
import { yolTarifiAdresi } from '../../lib/yolTarifi'
import { siparisDurumu } from './Parca'
import { siparisNetTutari } from '../../lib/servisFiyat'
import { gecenSure, tarihYaz } from '../../backoffice/ekranlar/ortak'
import { Ekler } from '../../backoffice/ekranlar/Ekler'

/* ==========================================================================
   Servis paneli — talep detayı

   DURUM ADI GEÇMİYOR. Servis "incelemede", "planlandı" gibi kelimeler
   görmüyor; yaptığı işi anlatan düğmelere basıyor. Durum arka planda
   mevcut model üzerinden ilerliyor, böylece raporlar ve müşteri
   bildirimleri değişmeden çalışıyor.

     Randevu ver          → talepPlanla()   → planlandi
     Servis kaydı         → ServisKapanisi  → parça ya da onay bekliyor
     Garanti dışı iş      → talepKapat()    → kapandi (kayıt yok)
     PAKSAN'a devret      → destekTalepEt() → sahiplik PAKSAN'a geçer

   Talep PAKSAN'a devredildiyse servis işlem yapmıyor ama takip ediyor:
   müşteri hâlâ onun müşterisi.

   İKİ TALEP TÜRÜ, İKİ KAPANIŞ

     servis  → adım adım kapanış (bkz. ekranlar/ServisKapanisi.jsx)
     parca   → gönderim penceresi; yapılan iş bir onarım değil

   İkisi de aynı biçimde yazıyor: `cozum` nesnesi backoffice'in kendi
   kapanış formuyla aynı alanları taşıyor (bkz. lib/servisKapanis.js).

   FİYAT TEKLİFİ BURAYA HİÇ DÜŞMÜYOR. Servis makine satmıyor; teklif
   talebi PAKSAN'a düşüyor ve satışı yürüten tarafa yönlendiriliyor
   (bkz. backoffice/veri.js). Bu ekranda bir dönem "Fiyat Teklifi
   Hazırla" ve "Görüşmeyi Sonuçlandır" vardı; ikisi de kaldırıldı,
   çünkü servise hiç ulaşmayan bir talebin ekranı ölü koddur.

   SERVİS, PAKSAN'IN GÖRDÜĞÜ HER ŞEYİ GÖRÜYOR

   Müşterinin yazdığı, seslendirdiği, fotoğrafladığı ve sonradan
   eklediği ne varsa burada. Bir dönem yalnız metin alanları vardı:
   çiftçi kırık parçanın fotoğrafını çekiyor, sahaya giden usta onu
   hiç görmüyordu.
   ========================================================================== */

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça' }

/* ALICISIZ TALEPTE ONAY PENCERESİ "MÜŞTERİYE BİLDİRİM GİDECEK" DEMİYOR
   (25 Eylül 2026, kullanıcı sınaması Y4).

   Pencereler hep "müşteriye bildirim gidecek" diyordu. Oysa servisin
   elle açtığı ve müşterinin uygulamadaki hesabına bağlı olmayan talepte
   bildirim yazılmıyor (backoffice/veri.js → musteriyeBildir). Pencere
   ne olacağını doğru anlatmalı; soru veri katmanının kendisine
   soruluyor (bildirimAlicilari), kural ekranda yeniden yazılmıyor.
   Cümle backoffice'teki alıcısız cümleyle aynı: iki üründe tek ifade
   (Talepler.jsx). */
const ALICISIZ = 'Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmeyecek.'

/* NE OLDUĞU LİSTEDE YAZIYOR (29 Eylül 2026, görünüm önerisi S2).
   Randevu, iptal, kapatma ve kayıt ekranı sessizce listeye dönüyordu:
   randevu verilen iş "Yeni" sekmesinden kayboluyor, servis işi kaybettiğini
   sanıyordu. Kapanan her işlem `onKapat`a ne olduğunu söyleyen bir mesaj
   veriyor; liste onu yeşil şeritte gösteriyor (Kabuk.jsx →
   BasariSeridi). Geri düğmesi mesajsız kapatıyor.

   RANDEVUDAN SONRA AYRINTIDA KALINIYOR (29 Eylül 2026, kullanıcının
   onayı). Randevu verildikten sonra yapılacak iş çoğu zaman aynı işte:
   müşteriyi aramak, not düşmek, randevuyu düzeltmek. Listeye dönmek
   servisin işi yeniden bulup açmasını istiyordu. Şerit artık ayrıntının
   başında çıkıyor, sayfa başa kayıyor; "Randevu verildi" notu hemen
   altında. İptal, kapatma ve kayıt işi bitiriyor; onlar listeye dönüyor. */
const gunYazisi = (g) =>
  new Date(g + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })

export function TalepDetay({
  talep,
  oturum,
  servisAd,
  onKapat,
  onDevret,
  onYenile,
  basari,
  onBasari,
  onPencereKapandi,
}) {
  const [pencere, setPencere] = useState(null)
  /* Randevunun yeşil şeridi ayrıntıda KALIYOR (son inceleme). Listedeki
     şerit 8 saniyede kalkıyor; ayrıntıda kalkınca altındaki her şey 93
     piksel yukarı sıçrıyor, o sırada dokunan başka düğmeye basıyordu.
     Şerit sayfanın başında, servis aşağı indikçe zaten görünmüyor;
     ayrıntıdan çıkınca gidiyor. */
  const [serit, setSerit] = useState(basari || null)
  useEffect(() => {
    if (basari) setSerit(basari)
  }, [basari])
  /* Pencere kapanınca kısa bir süre dokunuş yutuluyor: "Kaydet"e ikinci
     dokunuş altta kalan düğmeye gitmesin (ServisPanel.jsx → "EKRAN
     DEĞİŞİNCE ÇİFT DOKUNUŞUN İKİNCİSİ YUTULUYOR"). */
  const oncekiPencere = useRef(pencere)
  useEffect(() => {
    const kapandi = Boolean(oncekiPencere.current) && !pencere
    oncekiPencere.current = pencere
    if (kapandi) onPencereKapandi?.()
  }, [pencere, onPencereKapandi])
  /* Veri katmanının reddettiği işlem (aşağıdaki pencere kapısı). */
  const [islemHatasi, setIslemHatasi] = useState('')

  /* DURUM DEĞİŞİNCE AÇIK PENCERE KAPANIYOR (25 Eylül 2026, inceleme).
     Detay depodan okunuyor ama açık pencere (randevu, iptal, "Talebi
     Kapat" onayı…) ekranda kalıyordu: PAKSAN talebi başka sekmede iptal
     edince servis açık pencerede Kaydet'e basıp iptal edilmiş talebi
     "planlandı"ya çevirebiliyordu. Talebin durumu ya da sahibi değişince
     pencere kapanıyor; servis güncel durumu görüp yeniden karar veriyor.
     Tam ekran servis kaydı (`kapanis`) kapanmıyor: yazdıkları kaybolmasın,
     gönderimi veri katmanı zaten reddediyor (servisKaydiGonder).
     Pencere kapanmadan basılan düğmeyi de veri katmanı reddediyor
     (veri.js → servisinKapaliIsEngeli); hata aşağıda gösteriliyor. */
  const durumIm = `${talep.status || 'yeni'}|${talep.sahip || 'paksan'}`
  const oncekiIm = useRef(durumIm)
  useEffect(() => {
    if (oncekiIm.current === durumIm) return
    oncekiIm.current = durumIm
    setPencere((p) => (p && p !== 'kapanis' ? null : p))
  }, [durumIm])
  const reddedildi = (sonuc) => {
    if (!sonuc?.hata) return false
    setPencere(null)
    setIslemHatasi(sonuc.hata)
    onYenile?.()
    return true
  }

  /* Talep açıldıysa PAKSAN'ın bu talepteki bildirimleri okunmuş sayılır;
     İşlerim'in üstündeki listeden düşerler (bkz. talepBildirimleri.js). */
  useEffect(() => {
    okunduSay(talebinBildirimleri(oturum?.servisId, talep.id).map((b) => b.id))
  }, [oturum?.servisId, talep.id])
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)
  /* Bu talepte müşteriye bildirim yazılıyor mu (yukarıda ALICISIZ). */
  const musteriyeGider = bildirimAlicilari(talep).musteri
  /* Numara kayıttaki ülke ve ham numaradan: ekranda "+90 532 …", arama
     bağlantısı ülke koduyla (25 Eylül 2026, kullanıcı sınaması; bkz.
     lib/tel.js → kayitTelGoster, kayitTelHref). Connect talebinde
     rakamlar olduğu gibi bağlantıya konuyor ve "tel:90532…" yanlış
     numarayı çeviriyordu. */
  const telYazi = kayitTelGoster(talep)
  /* Servis kaydının doğurduğu iki bekleme. İkisi de AÇIK talep: iş
     bitmedi, sıra karşı tarafta (bkz. lib/servisKaydi.js). */
  const onayda = talep.status === 'onayBekliyor'
  const parcada = talep.status === 'parcaBekliyor'

  /* İKİ AYRI YETKİ VAR VE KARIŞTIRILMAMALI.

     `islemVar`    servis kaydını açma yetkisi. Kayıt bir kez
                   gönderildikten sonra kapanıyor: aynı iş için ikinci
                   kayıt açılmaz, sıra karşı tarafta.

     `sesiVar`     not yazma, randevu verme, PAKSAN'a devretme. Talep AÇIK
                   olduğu ve hâlâ servisin üstünde durduğu sürece açık.

   İKİSİ BİR SÜRE AYNI BAYRAKTI VE BU BİR HATAYDI. Parça bekleyen
   talepte servisin tek düğmesi "Parçayı Taktım" oluyordu: yanlış parça
   geldiyse, kutu hasarlıysa ya da makinede başka bir şey çıktıysa
   söyleyecek yeri yoktu — ya işi kapatacaktı ya telefon edecekti.
   Onay beklerken de aynısıydı: PAKSAN kayıtla ilgili bir şey sorsa
   servis cevabını uygulamadan yazamıyordu.

   Talep PAKSAN'a devredildiyse (`paksanda`) ikisi de kapalı: muhatap
   artık PAKSAN, servis izliyor. */
  const islemVar = !kapali && !paksanda && !onayda && !parcada
  const sesiVar = !kapali && !paksanda

  /* İPTAL YALNIZ SERVİS KAYDI AÇILMADAN (10 Eylül 2026).

     Servis müşteriyi arayıp talebin yanlış açıldığını ya da
     müşterinin vazgeçtiğini öğrenebiliyor. Kayıt açılmadıysa işin
     izi yok; servis talebi gerekçesiyle kapatabiliyor. Kayıt
     açıldıysa (parça istendi, onay bekliyor) iptal parçayı ve
     ödemeyi de ilgilendiriyor; o karar PAKSAN'ın. */
  const iptalVar = islemVar && !talep.servisKaydi

  /* SERVİS KENDİ SİPARİŞİNİ YALNIZ "YENİ" İKEN İPTAL EDEBİLİYOR (24 Eylül
     2026, kullanıcının kararı). PAKSAN siparişi işleme aldıysa parça
     hazırlanıyor; iptal kararı backoffice'in. Parça gönderilmeden
     bakiyeden bir şey düşülmüyor, bu iptalde para hareketi yok
     (bkz. veri.js → servisSiparisiniIptalEt). */
  const siparisIptalVar = Boolean(talep.servisSiparisi) && talep.status === 'yeni'
  const [iptalHatasi, setIptalHatasi] = useState('')

  /* GARANTİ DIŞI İŞ KAYITSIZ KAPANIYOR (15 Eylül 2026, kullanıcının
     kararı).

     Servis kaydı yalnız garanti işi için (bkz. ServisKapanisi.jsx
     başı). Müşterinin açtığı talebe giden servis işin garanti dışı
     olduğunu görürse parasını müşteriden alıyor; PAKSAN'ın ödeyeceği
     ya da göndereceği bir şey yok, kayıt da istenmiyor. Ama talep
     açık kalamaz: servisin "Yeni" listesinde durur, backoffice'te 48
     saat sonra gecikmiş görünür.

     Kapatma talepKapat() ile: müşteriye "Talebiniz tamamlandı"
     bildirimi gidiyor ve "Sorun Devam Ediyor" düğmesi açık kalıyor —
     iptal değil, iş yapıldı. Hak ediş doğmuyor. Kapanış kaydına yalnız
     kısa bir özet yazılıyor; PAKSAN talebin garanti dışı kapandığını
     oradan okuyor. */
  const garantiDisiVar = islemVar && talep.tur === 'servis'

  /* RANDEVU YALNIZ ZİYARETTEN ÖNCE.

     `sesiVar` ile birlikte açılıyordu; sonuç şuydu: servis kaydını
     göndermiş, parça istemiş, hatta onay bekleyen bir talepte hâlâ
     "Randevu" düğmesi duruyordu. Randevu ziyaret öncesi bir şey —
     servis müşteriyle konuşup gün veriyor. Ziyaret olmuş, kayıt
     yazılmışsa verilecek bir gün kalmamıştır.

     Parça bekleyen işte de çıkmıyor: sıra parçanın gelmesinde, gün
     verilecek olan o değil.

     Kayıt BU ZİYARETİN kaydı (26 Eylül 2026, ikinci kullanıcı
     sınaması): müşteri "Sorun Devam Ediyor" deyince iş yeniden açılıyor,
     geçen ziyaretin kaydı talepte duruyor ve düğme hiç çıkmıyordu; iş
     geçmiş randevunun tarihiyle kalıyordu (bkz. lib/servisKaydi.js →
     buZiyaretinKaydi). */
  const randevuVar = sesiVar && !buZiyaretinKaydi(talep) && !onayda && !parcada
  /* Yalnız müşteriye gönderilmiş notlar; iç notlar servise gitmiyor. */
  const musteriNotlari = (talep.notlar || []).filter((n) => n.musteriye)
  /* PAKSAN'IN DOĞRUDAN SERVİSE YAZDIKLARI.

     Müşteriye giden notun aynısı, muhatabı servis: "iki koli gitti",
     "kapıya bırakılacak", "eski kasnağı da koydum". Bu bilginin
     servise ulaşacağı başka bir yol yoktu; telefon ediliyordu ve
     talepte izi kalmıyordu. */
  const bizeNotlar = (talep.notlar || []).filter((n) => n.servise)
  /* PAKSAN'IN BU TALEPTE YAPTIKLARI (21 Eylül 2026).

     Durum değişikliği, iptal, kapatma, parça, kaydın onayı ya da
     düzeltilmesi — her biri servise bildirim olarak gitti (bkz.
     talepBildirimleri.js). Burada o talebin bütün geçmişi, okunmuş
     olsun olmasın. Notlar hemen altındaki kartta zaten yazılı; burada
     tekrar edilmiyor. Müşterinin Connect'ten yaptığı işlemin bildirimi
     (talebe ekleme, "Sorun Devam Ediyor"; 25 Eylül 2026) PAKSAN'ın
     işlemi değil: başlık "PAKSAN tarafından yapılan işlemler" diyor ve
     müşterinin eklediği ile yazdığı zaten kendi kartlarında. */
  const paksanIslemleri = talebinBildirimleri(oturum?.servisId, talep.id).filter(
    (b) => b.olay !== 'not' && !musteridenMi(b),
  )
  /* SERVİSİN KENDİ NOTLARI.

     Not Ekle ile yazılan not talebe iç not olarak düşüyordu: PAKSAN
     görüyor, müşteri görmüyor — ama servisin kendisi de bir daha
     göremiyordu, çünkü bu ekran yalnız müşteriye ve servise
     gönderilmiş notları süzüyordu. Eski kayıtlarda işaret yok; yazan
     servisin adıyla eşleşen iç not da onun sayılıyor. */
  const benimNotlarim = (talep.notlar || []).filter(
    (n) => n.servisten || (!n.musteriye && !n.servise && n.personel === servisAd),
  )

  /* Kapanış tam ekran açılıyor, pencere olarak değil: her adımda tek
     soru soruluyor; cevaplar geniş düğmelerle sunuluyor. Gerekçesi
     ServisKapanisi.jsx başında yazılı. */
  if (pencere === 'kapanis') {
    return (
      <ServisKapanisi
        talep={talep}
        oturum={oturum}
        onKapat={() => setPencere(null)}
        onBitti={onKapat}
      />
    )
  }

  /* ASIL İŞLEM EKRANIN DİBİNE YAPIŞIK.

     Dört düğme yan yana dururken hangisinin asıl iş olduğu belli
     değildi. Servisin bu ekranda yapacağı tek şey var: işi bitirmek.
     O düğme altta, parmağın durduğu yerde ve tek başına; ötekiler
     detayın içinde, sırası gelince bakılan seçenekler. */

  /* PARÇA BEKLEYEN İŞİ SERVİS KAPATIYOR — PAKSAN DEĞİL.

     Parça yola çıktığında PAKSAN'ın işi bitiyor ama iş bitmiyor:
     parçanın takılması gerekiyor ve onu yalnız serviste olan biri
     bilebilir. Talep bu yüzden açık kalıyor ve kapatma düğmesi
     burada duruyor.

     GARANTİ İŞİNDE BU DÜĞME TALEBİ KAPATMIYOR, KAYDIN İKİNCİ
     AŞAMASINI AÇIYOR. Parça takıldıktan sonra sorulacak üç şey var:
     ne yapıldı, kaç kilometre gidildi, ne kadar işçilik alındı.
     Hak ediş bunlardan doğuyor ve kayıt ondan sonra onaya gidiyor
     (bkz. lib/servisKaydi.js başı). ESKİ garanti dışı parça
     isteğinde (kapı 'parcaIste', 15 Eylül 2026'dan önce yazılmış)
     sorulacak bir şey yok: parası müşteriden alındı, talep doğrudan
     kapanıyor. Yeni kayıt o kapıyla yazılmıyor ama yolda olan parçası
     olan eski talep bu yoldan bitiyor; dal bu yüzden duruyor.

     DÜĞME PARÇA YOLA ÇIKMADAN AÇILMIYOR. `parcaSevk` yedek parça
     personelinin "gönderdim" kaydı; o yokken servis parçayı takmış
     olamaz. Açık bırakılsaydı iş, parça daha hazırlanmadan
     kapatılabilirdi.

     AYRI BİR "TESLİM ALDIM" ADIMI YOK, BİLEREK (25 Eylül 2026, kullanıcı
     sınamasındaki tasarım sorusu: düğme parça daha yoldayken
     basılabiliyor). Parçanın servise ulaştığını bilen tek taraf
     servisin kendisi; uygulamanın bunu öğrenebileceği bir kaynak yok
     (kargo entegrasyonu da yok). Servise sorulacak ek adımın servise
     bir karşılığı da yok: işi uzatır, veri geçiştirilir (CLAUDE.md,
     "Servis bunu doldurduğu anda ne alıyor?"). Yanlış kullanımın sınırı
     zaten var: garanti işinde düğme kaydın ikinci aşamasını açıyor,
     hak ediş PAKSAN onayına gidiyor ve backoffice kaydın yanında kargo
     tarihini gösteriyor; kötüye kullanım orada görünür. Yapılan tek
     şey düğmenin ne zaman basılacağını altında söylemek. Detay açıkken
     parça gönderilince düğmenin kapalı kalması ayrı bir kusurdu; talep
     artık her tazelemede depodan okunuyor (ServisPanel.jsx → acikId). */
  const kayitAsamasi = talep.servisKaydi?.asama
  const ikinciAsama = parcada && kayitAsamasi === ASAMA.parca
  const parcaYolda = Boolean(talep.parcaSevk)

  const asilIslem = parcada ? (
    <>
      <button
        className="dg dg--ana dg--blok"
        data-eylem="parcayi-taktim"
        disabled={!parcaYolda}
        onClick={() => (ikinciAsama ? setPencere('kapanis') : setPencere('parcaKapat'))}
      >
        Parçayı Taktım
      </button>
      {!parcaYolda && (
        <p className="uyg__dip-not">
          Parça hazırlanıyor. Yola çıktığında bu düğme açılacak.
        </p>
      )}
      {parcaYolda && (
        <p className="uyg__dip-not">Parça elinize ulaştığında makineye takın, ardından bu düğmeye dokunun.</p>
      )}
    </>
  ) : (
    islemVar && (
      <button
        className="dg dg--ana dg--blok"
        data-eylem="servis-kaydi-ac"
        onClick={() => setPencere('kapanis')}
      >
        Servis Kaydını Aç
      </button>
    )
  )

  return (
    <Sayfa
      /* Servisin kendi siparişinde başlık kendi firmasının adıydı
         (29 Eylül 2026, S3); sipariş, siparişin adıyla açılıyor. */
      baslik={talep.servisSiparisi ? 'Sipariş' : talep.ad || '—'}
      alt={talep.no}
      onGeri={onKapat}
      dip={asilIslem}
    >
      {/* Az önce kaydedilen randevunun şeridi (yukarıda "RANDEVUDAN SONRA
          AYRINTIDA KALINIYOR"). */}
      {serit && <BasariSeridi mesaj={serit} />}
      {islemHatasi && (
        <div className="not not--sari">
          <IconAlert size={19} />
          <div>{islemHatasi}</div>
        </div>
      )}
      {/* ================================== Sorun devam ediyor

          Bu iş bir kez kapandı ve müşteri "hâlâ aynı" dedi. Servisin
          bunu KAPIDAN ÖNCE bilmesi gerekiyor: aynı arızaya ikinci kez
          gidiyor, ilk seferde ne yaptığı aşağıda yazılı. Ekranın en
          üstünde duruyor, çünkü altındaki her şey ilk ziyaretin
          bilgisi. */}
      {(talep.tekrar || []).length > 0 && (
        <div className="not not--sari">
          <IconAlert size={19} />
          <div>
            <strong>
              Müşteri Sorunun Devam Ettiğini Bildirdi
              {talep.tekrar.length > 1 ? ` · ${talep.tekrar.length} kez` : ''}
            </strong>
            {talep.tekrar
              .slice()
              .reverse()
              .map((x, i) => (
                <p key={i} style={{ margin: '6px 0 0' }}>
                  {x.aciklama || 'Açıklama yazılmadı.'}
                  <span className="kucuk sonuk"> · {gecenSure(x.tarih)}</span>
                </p>
              ))}
          </div>
        </div>
      )}

      {/* ŞU AN NE OLUYOR, EN ÜSTTE (29 Eylül 2026, görünüm önerisi S7).
          Randevu, onay, parça ve kapanış notları müşteri bilgisinin ve
          notların ALTINDAYDI: parça bekleyen işte ilk ekranda durumdan
          hiçbir şey görünmüyordu. Servis bir işi ya "sırada ne var" ya
          "arıza ne" diye açıyor; ikisi de artık ilk ekranda. */}
      {/* RANDEVU ALINMIŞ TALEP AYNI EKRANI GÖSTERMEMELİ.

          Randevu verildikten sonra talep servis tarafında yine "bekleyen"
          listesinde duruyor (doğrusu da bu, iş bitmedi) ama detayı yeni
          gelmiş bir taleple birebir aynı görünüyordu: servis randevu
          verdiğini unutup ikinci kez veriyordu. */}

      {/* BÖLGE DIŞI TALEP (5 Ekim 2026). Makinenin kendi servisi bu
          bölgeye bakmadığı için PAKSAN işi bu servise verdi (veri.js →
          bolgeDisiTalebeServisAta). Servis müşteriyi tanımıyor olabilir;
          ilk ekranda neden kendisinde olduğunu görüyor. Öteki servisin
          adı yazılmıyor (atama PAKSAN ile servisler arasında). */}
      {talep.bolgeDisi?.atama && !kapali && (
        <div className="not not--mavi" data-not="bolge-disi">
          <IconPin size={19} />
          <div>
            <strong>PAKSAN sizi bu iş için görevlendirdi</strong>
            <p>
              Makine şu an {[talep.bolgeDisi.ilce, talep.bolgeDisi.il].filter(Boolean).join(' / ')}{' '}
              bölgesinde. Makinenin kendi servisi burada hizmet vermiyor. Müşteriyle görüşüp randevu belirleyin.
            </p>
          </div>
        </div>
      )}

      {talep.plan && !kapali && (
        <div className="not not--mavi">
          <IconCalendar size={19} />
          <div>
            <strong>Randevu verildi · {talep.plan.tarihYazi}</strong>
            {/* İş adı boşken satır "· müşteriyle görüşüldü" diye
                başlıyordu; ayraç yalnız iki yanı da doluyken çıkıyor. */}
            <p>
              {[talep.plan.is, talep.plan.gorusuldu && 'müşteriyle görüşüldü']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {paksanda && talep.devir && (
        <div className="not not--mavi">
          <IconKulaklik size={19} />
          <div>
            <strong>PAKSAN bu talebe destek veriyor.</strong>
            <p>
              Müşteri hâlâ sizin müşteriniz. PAKSAN’ın attığı adımları
              burada görmeye devam edeceksiniz.
            </p>
          </div>
        </div>
      )}

      {/* Onay bir bekleme: gri, saatli (29 Eylül 2026, S5). */}
      {onayda && (
        <div className="not not--gri">
          <IconSaat size={19} />
          <div>
            <strong>Kaydınız PAKSAN’da onay bekliyor.</strong>
            <p>
              Yol, işçilik ve parçalar inceleniyor. Onaylandığında tutar
              cari hesabınıza alacak yazılacak.
            </p>
          </div>
        </div>
      )}

      {/* PARÇANIN NEREDE OLDUĞU TALEBİN ÜSTÜNDE.

          Parça isteği ayrı bir kayda çıkmıyor; aynı talebin içinde
          yürüyor. Servis tek yere bakıyor: parça hazırlanıyor mu,
          yola çıktı mı, takip numarası ne. */}
      {parcada && (
        <div className={'not ' + (talep.parcaSevk ? 'not--yesil' : 'not--gri')}>
          {talep.parcaSevk ? <IconKamyon size={19} /> : <IconSaat size={19} />}
          <div>
            <strong>
              {talep.parcaSevk ? 'Parça yola çıktı.' : 'Parça hazırlanıyor.'}
            </strong>
            <p>
              {talep.parcaSevk
                ? [
                    talep.parcaSevk.firma,
                    talep.parcaSevk.takipNo,
                    gecenSure(talep.parcaSevk.tarih),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : `PAKSAN parçayı hazırlıyor. Kargoya verildiğinde takip numarası burada görünecek.`}
            </p>
          </div>
        </div>
      )}

      {/* MÜŞTERİ İPTAL İSTEDİ (8 Ekim 2026). İşleme alınmış talepte müşteri
          Connect'ten istek gönderdi; kararı PAKSAN veriyor, iş o zamana
          kadar sürüyor (lib/musteriIptal.js). Sarı: işin geleceği belirsiz.
          Karar verilince not kalkıyor; iptal ya da "kabul edilmedi"
          bildirimi gidiyor. */}
      {!kapali && talep.iptalIstegi?.durum === 'bekliyor' && (
        <div className="not not--sari" data-not="iptal-istegi">
          <IconAlert size={19} />
          <div>
            <strong>Müşteri bu talebin iptalini istedi. PAKSAN karar verene kadar iş devam ediyor.</strong>
            {talep.iptalIstegi.neden && <p>{talep.iptalIstegi.neden}</p>}
          </div>
        </div>
      )}

      {/* İptal edilen talep "tamamlandı" demiyor; nedeni burada. Gri:
          yapılacak bir şey yok (29 Eylül 2026, S5). */}
      {kapali && talep.status === 'iptal' ? (
        <div className="not not--gri">
          <IconClose size={19} />
          <div>
            <strong>Bu talep iptal edildi.</strong>
            {talep.iptalBilgi?.neden && <p>{talep.iptalBilgi.neden}</p>}
            {talep.iptalBilgi?.aciklama && <p>{talep.iptalBilgi.aciklama}</p>}
          </div>
        </div>
      ) : kapali ? (
        <div className="not not--yesil">
          <IconCheckCircle size={19} />
          <div>
            <strong>Bu talep tamamlandı.</strong>
            {/* Garanti dışı kapanışta kayıt yok; nasıl kapandığı
                yalnız bu satırda. */}
            {talep.cozum?.garantiDisi && <p>{talep.cozum.ozet}</p>}
          </div>
        </div>
      ) : null}

      {/* SİPARİŞİN KENDİSİ BAŞTA (29 Eylül 2026, S3). Servisin kendi
          siparişinde durum, tarih, ödeme ve listedekiyle aynı KDV dâhil
          toplam yoktu; parça tablosu KDV hariç satır tutarını gösteriyordu
          ve servis listede 210, burada 175 TL görüyordu. */}
      {talep.servisSiparisi && <SiparisOzeti talep={talep} />}

      {/* SIRA: ARIZA, MAKİNE, İLETİŞİM (29 Eylül 2026, S7). Kart telefonla
          başlıyordu, arıza en altta kalıyordu; servis yola çıkmadan
          arızayı okumak için kaydırıyordu. Her işte aynı olan "Servis"
          etiketi kalktı; parça ve teklif talebinde duruyor. */}
      <div className="kart" style={{ padding: 16 }}>
        {talep.tur !== 'servis' && (
          <div className="is__ust">
            <span className={'tur tur--' + talep.tur}>
              {TUR_ADI[talep.tur] || talep.tur}
            </span>
          </div>

        )}

        {/* Kimlik değil okunur karşılık: ekranda "sorunlu" yazıyordu. */}
        {talep.durum && (
          <Satir ad="Makinenin Durumu" deger={makineDurumAdi(talep.durum)} />
        )}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {talep.aciklama && <Satir ad="Müşterinin Anlattığı" deger={talep.aciklama} />}

        {/* SES KAYDI VE FOTOĞRAF SERVİSE HİÇ GÖSTERİLMİYORDU.

            Çiftçi yazmak yerine anlatabiliyor, kırık parçayı
            fotoğraflayabiliyor, videoya alabiliyor. Bunların hepsi
            backoffice'te görünüyordu; sahaya giden usta hiçbirini
            görmüyordu. Arızayı en iyi anlatan şey çoğu zaman
            fotoğraftı ve tam da o kayboluyordu. */}
        {talep.ses && (
          <div style={{ marginTop: 12 }}>
            <div className="kucuk sonuk">
              Sesli not{talep.ses.sure ? ' · ' + talep.ses.sure + ' sn' : ''}
            </div>
            {talep.ses.veri ? (
              /* Müşterinin sesi serviste yalnız dinleniyor: indirme ve
                 hız menüsü kapalı (7 Ekim 2026). */
              <audio
                controls
                controlsList="nodownload noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                src={talep.ses.veri}
                style={{ width: '100%', marginTop: 6 }}
              />
            ) : (
              <div className="kucuk sonuk">Ses kaydı saklanmıyor.</div>
            )}
          </div>
        )}

        {/* Fotoğraf ve video arızanın yanında. 29 Eylül 2026'daki sıra
            değişikliğinde (durum → arıza → makine) bu satır düşmüştü;
            servis çiftçinin fotoğrafını göremez olmuştu (son inceleme). */}
        <Ekler ekler={talep.ekler} />

        {talep.makine?.serial ? (
          <Makine makine={talep.makine} />
        ) : talep.makine?.seriYok ? (
          <SerisizMakine makine={talep.makine} />
        ) : null}


        {/* Koşul iki biçime de bakıyor: yeni kayıtta satırlar fiyat
            görüntüsünde, eski kayıtta ad listesinde duruyor. */}
        {(talep.parcalar?.length > 0 ||
          talep.parcaFiyat?.satirlar?.length > 0) && (
          <ParcaDurumu talep={talep} />
        )}
        {/* Servisin kendi siparişinde telefon ve konum servisin
            kendisininki: gösterilmiyor. */}
        {!talep.servisSiparisi && (
          <>
            {/* Numara dokunulabilir: servis ezberleyip tuşlamıyor. Listedeki
                arama düğmesinin aynısı, burada satır hâlinde. */}
            {telYazi && (
              <div style={{ marginTop: 10 }}>
                <div className="kucuk sonuk">Telefon</div>
                <a className="ara-satir" href={kayitTelHref(talep)}>
                  <IconPhone size={19} />
                  <span className="mono">{telYazi}</span>
                </a>
              </div>
            )}
            <Satir
              ad="Konum"
              deger={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il}
            />
          </>
        )}
        {/* ADRES SERVİSİN ASIL İHTİYACI.

            İl ve ilçe listede sıralama için yeterli, tarlaya gitmek
            için değil. Müşteri uygulamada makinenin bulunduğu adresi
            yazıyor (bkz. screens/RequestForm.jsx) ve servis kapıdan
            çıkmadan önce burada okuyor. Telefonla açılan taleplerde
            boş; o zaman servis kayıt ekranında kendisi dolduruyor. */}
        <Satir ad="Adres" deger={talep.adres} />
        {/* YOL TARİFİ (29 Eylül 2026, kullanıcının kararı). Adresi
            telefonun harita uygulamasında açıyor; yalnız yazılı adresle
            (bkz. lib/yolTarifi.js). Telefonda bağlantıyı Android açıyor,
            "Ara" satırındaki gibi; tarayıcıda yeni sekmede, Servisim
            sekmesi yerinde kalsın. Servisin kendi siparişinde yok: adres
            servisin kendi adresi. */}
        {talep.adres && !talep.servisSiparisi && (
          <a
            className="ara-satir"
            href={yolTarifiAdresi(talep)}
            {...(Capacitor.isNativePlatform() ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            <IconPin size={19} />
            <span>Yol Tarifi</span>
          </a>
        )}
        {/* TESLİMAT ADRESİ BAYİDE GÖRÜNMÜYORDU.

            Servisten "Parçayı Gönderdim" demesi isteniyor ama parçanın
            nereye gideceği ekranda yazmıyordu: yalnız il ve ilçe
            vardı. Müşteri adresi talebin fatura bilgisinde duruyor ve
            kargo oraya çıkacak. */}
        {talep.fatura?.adres && (
          <Satir
            ad="Teslimat Adresi"
            deger={
              talep.fatura.adres +
              (talep.fatura.ilce ? ` · ${talep.fatura.ilce} / ${talep.fatura.il}` : '')
            }
          />
        )}
        {talep.fatura?.ad && talep.fatura.ad !== talep.ad && (
          <Satir ad="Fatura Adı" deger={talep.fatura.ad} />
        )}
      </div>

      {/* ------------------------------- Müşterinin sonradan eklediği not

          Talep gönderildikten SONRA müşterinin uygulamadan eklediği
          not, ses ve fotoğraflar. Servis yola çıkmadan önce bakması
          gereken yer burası: talep açıldıktan sonra arıza değişmiş
          ya da müşteri eksik bıraktığı bir şeyi eklemiş olabilir.
          En yeni üstte. */}
      {talep.eklemeler?.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            Müşterinin sonradan eklediği not · {talep.eklemeler.length}
          </div>
          {[...talep.eklemeler]
            .sort((a, b) => b.tarih - a.tarih)
            .map((e) => (
              <div key={e.id} style={{ marginBottom: 14 }}>
                <div className="kucuk sonuk">{gecenSure(e.tarih)}</div>
                {e.not && (
                  <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{e.not}</p>
                )}
                {e.ses?.veri && (
                  <audio
                    controls
                    controlsList="nodownload noplaybackrate"
                    onContextMenu={(o) => o.preventDefault()}
                    src={e.ses.veri}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                )}
                {e.ekler?.length > 0 && <Ekler ekler={e.ekler} />}
              </div>
            ))}
        </div>
      )}

      {/* PAKSAN'IN MÜŞTERİYE YAZDIKLARI.

          Servis sahaya gittiğinde müşteri "PAKSAN şöyle demişti"
          diyor ve servisin haberi olmuyordu. Yalnız müşteriye
          gönderilmiş notlar görünüyor; ekibin kendi arasındaki iç
          notlar servise gitmiyor. */}
      {musteriNotlari.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            PAKSAN müşteriye şunları yazdı
          </div>
          {musteriNotlari.map((n, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{n.metin}</p>
              <div className="kucuk sonuk" style={{ marginTop: 4 }}>
                {[n.personel, gecenSure(n.tarih)].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {paksanIslemleri.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            PAKSAN tarafından yapılan işlemler
          </div>
          {paksanIslemleri.map((b) => {
            const y = bildirimYazisi(b)
            return (
              <div key={b.id} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>{y.baslik}</div>
                {y.metin && (
                  <p style={{ whiteSpace: 'pre-wrap', margin: '2px 0 0' }}>{y.metin}</p>
                )}
                <div className="kucuk sonuk" style={{ marginTop: 4 }}>
                  {gecenSure(b.tarih)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bizeNotlar.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            PAKSAN size şunları yazdı
          </div>
          {bizeNotlar.map((n, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{n.metin}</p>
              <div className="kucuk sonuk" style={{ marginTop: 4 }}>
                {[n.personel, gecenSure(n.tarih)].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {benimNotlarim.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            Notlarınız
          </div>
          {benimNotlarim.map((n, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{n.metin}</p>
              <div className="kucuk sonuk" style={{ marginTop: 4 }}>
                {gecenSure(n.tarih)}
              </div>
            </div>
          ))}
        </div>
      )}

      {talep.servisKaydi && <ServisKaydi talep={talep} servisAd={oturum?.ad} />}


      {/* Kapanış kaydı: servis aylar sonra "Burada ne yapmıştık?" diye
          baktığında cevap burada. Alanlar backoffice'in kendi kapanış
          formuyla aynı; müşteri de bunları kendi uygulamasında
          okuyor. */}
      {/* Garanti dışı kapanışta gösterilecek alan yok (özet yukarıdaki
          yeşil notta); boş kart çizilmiyor. */}
      {kapali && talep.cozum && !talep.cozum.garantiDisi && (
        <div className="kart" style={{ padding: 16 }}>
          <Satir ad="Yapılan İş" deger={talep.cozum.yapilanIs} />
          <Satir ad="Değiştirilen Parça" deger={talep.cozum.parcalar} />
          <Satir ad="Ücret" deger={talep.cozum.ucret} />
          <Satir ad="Garanti Talebi" deger={talep.cozum.garantiNo} />
          <Satir ad="Sonuç" deger={talep.cozum.sonuc} />
          <Satir ad="Satış Fiyatı" deger={talep.cozum.satisFiyati} />
          <Satir ad="Not" deger={talep.cozum.not} />
        </div>
      )}

      {sesiVar && (
        <div className="secenek">
          {/* GARANTİ DIŞI TAMAMLAMA LİSTENİN BAŞINDA VE AYRIŞIYOR (17 Eylül
              2026, kullanıcının isteği). Talebi kapatan ikinci yol bu;
              öteki seçenekler talebi açık bırakıyor. Dipteki "Servis
              Kaydını Aç" düğmesinin hemen üstünde, yeşil çerçeveyle
              duruyor: iki kapanış yolu yan yana, iptal en sonda. */}
          {/* Altında ne olacağı yazıyor (29 Eylül 2026, S7): yeşil
              çerçeve ve onay işareti "iş bitti" gibi okunuyordu; bu düğme
              işi hak edişsiz kapatıyor. */}
          {garantiDisiVar && (
            <button
              className="secenek__dg secenek__dg--tamamla"
              onClick={() => setPencere('garantiDisi')}
            >
              <IconCheckCircle size={19} />
              <span className="secenek__govde">
                Garanti Dışı İşi Tamamla
                <span className="secenek__alt">Hak ediş oluşmaz; talep kapanır.</span>
              </span>
              <IconRight size={17} />
            </button>
          )}
          {talep.tur === 'servis' && randevuVar && (
            <button className="secenek__dg" data-eylem="randevu" onClick={() => setPencere('randevu')}>
              <IconCalendar size={19} />
              {talep.plan ? 'Randevuyu Değiştir' : 'Randevu'}
              <IconRight size={17} />
            </button>
          )}
          {/* Not kalem (29 Eylül 2026, S9): kitap simgesiydi. */}
          <button className="secenek__dg" onClick={() => setPencere('not')}>
            <IconNot size={19} />
            Not Ekle
            <IconRight size={17} />
          </button>
          {/* "PAKSAN'A DEVRET" (30 Eylül 2026, kullanıcının isteği:
              "'PAKSAN'dan Destek İste' seçeneği adı 'PAKSAN'a Devret'
              olmalı. Buna göre de butonun ikonunu düzenle"). Eylem hep
              buydu: işin sahibi PAKSAN oluyor, servis bir daha işlem
              yapamıyor (veri.js → destekTalepEt, `sahip: 'paksan'`);
              backoffice de ona "Devredildi" diyor. "Destek İste" servise
              yardım gelecekmiş gibi okunuyordu. Simge kulaklık değil
              iletme oku (Icons.jsx → IconDevret). */}
          <button className="secenek__dg" data-eylem="devret" onClick={() => setPencere('devret')}>
            <IconDevret size={19} />
            PAKSAN’a Devret
            <IconRight size={17} />
          </button>
          {/* İptal yıkıcı: kırmızı ve en sonda, arada boşluk (S7). */}
          {iptalVar && (
            <button className="secenek__dg secenek__dg--iptal" onClick={() => setPencere('iptal')}>
              <IconClose size={19} />
              Talebi İptal Et
              <IconRight size={17} />
            </button>
          )}
        </div>
      )}

      {talep.servisSiparisi && !kapali && (
        <>
          {iptalHatasi && (
            <div className="not not--sari">
              <IconAlert size={19} />
              <div>{iptalHatasi}</div>
            </div>
          )}
          {siparisIptalVar ? (
            <div className="secenek">
              <button className="secenek__dg secenek__dg--iptal" onClick={() => setPencere('siparisIptal')}>
                <IconClose size={19} />
                Siparişi İptal Et
                <IconRight size={17} />
              </button>
            </div>
          ) : (
            <p className="ipucu">
              PAKSAN siparişinizi işleme aldı. Siparişi iptal etmek isterseniz PAKSAN’ın yedek
              parça birimine ulaşın.
            </p>
          )}
        </>
      )}

      {pencere === 'siparisIptal' && (
        <Onay
          baslik="Sipariş iptal edilecek"
          metin={
            talep.odeme === 'bakiye'
              ? `PAKSAN bu siparişi hazırlamayacak. Parçalar gönderilmediği için bakiyenizden tutar düşülmedi. Bakiyeniz değişmez.`
              : `PAKSAN bu siparişi hazırlamayacak ve fatura kesilmeyecek.`
          }
          kalemler={[
            { ad: 'Sipariş', deger: talep.no },
            { ad: 'Tutar', deger: `${paraYaz(siparisHesabi(talep).toplam)} ${PARA_BIRIMI}` },
          ]}
          dugme="Siparişi İptal Et"
          onOnayla={() => {
            const s = servisSiparisiniIptalEt(talep, servisAd)
            setPencere(null)
            if (s?.hata) {
              setIptalHatasi(s.hata)
              onYenile?.()
              return
            }
            onKapat({ baslik: 'Siparişiniz iptal edildi' })
          }}
          onVazgec={() => setPencere(null)}
        />
      )}

      {pencere === 'randevu' && (
        <Randevu
          talep={talep}
          servisAd={servisAd}
          musteriyeGider={musteriyeGider}
          onKapat={() => setPencere(null)}
          onBitti={(tarih) => {
            setPencere(null)
            onYenile?.()
            onBasari?.({
              baslik: 'Randevu kaydedildi',
              alt: `${gunYazisi(tarih)}. İş, Devam Eden sekmesinde.`,
            })
            /* Şerit sayfanın başında; servis düğmelerin olduğu dipte. Dip
               çubuklu sayfada gövde kendi içinde kayıyor (Kabuk.jsx →
               Sayfa), çubuksuzda pencere; ikisi de başa alınıyor. */
            requestAnimationFrame(() => {
              document.querySelector('.uyg__ic')?.scrollTo({ top: 0, behavior: 'smooth' })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            })
          }}
          onRed={reddedildi}
        />
      )}
      {/* NOT YAZINCA DETAY KAPANMIYOR.

          Önceden kaydet düğmesi talebin kendisini kapatıp listeye
          dönüyordu; servis yazdığı notu bir daha göremiyordu. Pencere
          kapanıyor, talep depodan yeniden okunuyor ve not Notlarınız
          başlığında hemen görünüyor. */}
      {pencere === 'not' && (
        <Not
          talep={talep}
          servisAd={servisAd}
          onKapat={() => setPencere(null)}
          onBitti={() => {
            setPencere(null)
            onYenile?.()
          }}
        />
      )}
      {pencere === 'devret' && (
        <Devret onKapat={() => setPencere(null)} onGonder={onDevret} />
      )}
      {pencere === 'iptal' && (
        <Iptal
          talep={talep}
          servisAd={servisAd}
          musteriyeGider={musteriyeGider}
          onKapat={() => setPencere(null)}
          onBitti={() => onKapat({ baslik: 'Talep iptal edildi' })}
          onRed={reddedildi}
        />
      )}
      {/* Metinler Codex'ten (15 Eylül 2026). */}
      {pencere === 'garantiDisi' && (
        <Onay
          baslik="Talep kapanacak"
          metin={
            musteriyeGider
              ? 'Servis kaydı açılmadan talep kapanacak, hak ediş oluşmayacak. Müşteriye talebin tamamlandığı bildirilecek.'
              : `Servis kaydı açılmadan talep kapanacak, hak ediş oluşmayacak. ${ALICISIZ}`
          }
          kalemler={[{ ad: 'Talep', deger: talep.no }]}
          dugme="Talebi Kapat"
          onOnayla={() => {
            /* Yeniden açılmış talepte ilk ziyaretin çözümü (yapılan iş,
               değişen parça) silinmiyor: `onceki` içinde kalıyor ve
               müşteri uygulaması onu göstermeye devam ediyor. */
            const sonuc = talepKapat(
              talep,
              {
                ozet: GARANTI_DISI_OZET,
                garantiDisi: true,
                ...(talep.servisKaydi && talep.cozum && !talep.cozum.garantiDisi
                  ? { onceki: talep.cozum }
                  : {}),
              },
              servisAd,
              { servisten: true },
            )
            if (reddedildi(sonuc)) return
            onKapat({
              baslik: 'İş kapatıldı',
              alt: 'Garanti dışı iş olarak kaydedildi; hak ediş oluşmadı.',
            })
          }}
          onVazgec={() => setPencere(null)}
        />
      )}
      {pencere === 'parcaKapat' && (
        <Onay
          baslik="Talep kapanacak"
          metin={
            musteriyeGider
              ? 'Parçayı taktığınızı bildiriyorsunuz. Talep kapanacak ve müşteriye bildirim gidecek.'
              : `Parçayı taktığınızı bildiriyorsunuz. Talep kapanacak. ${ALICISIZ}`
          }
          parcalar={temizParcalar(talep.servisKaydi?.parcalar)}
          kalemler={[{ ad: 'Talep', deger: talep.no }]}
          dugme="Parçayı Taktım"
          onOnayla={() => {
            if (reddedildi(talepDurumDegistir(talep, 'kapandi', servisAd, { servisten: true }))) return
            onKapat({ baslik: 'İş kapatıldı', alt: 'Parçanın takıldığı kaydedildi.' })
          }}
          onVazgec={() => setPencere(null)}
        />
      )}
    </Sayfa>
  )
}

/* Servisin kendi siparişinin özeti (29 Eylül 2026, görünüm önerisi S3).
   Durum listedeki kartla aynı işlevden (Parca.jsx → siparisDurumu),
   tutar da (lib/servisFiyat.js → siparisNetTutari): iki ekran aynı
   rakamı söylüyor. */
function SiparisOzeti({ talep }) {
  const durum = siparisDurumu(talep)
  return (
    <div className="kart siparis-ozeti" style={{ padding: 16 }}>
      <div className={'siparis-ozeti__durum' + (durum.gec ? ' siparis-ozeti__durum--iptal' : '')}>
        {durum.ad}
      </div>
      <Satir ad="Sipariş tarihi" deger={tarihYaz(talep.createdAt)} />
      {/* Ödeme seçeneğinin adı "Bakiyem" (30 Eylül 2026, kullanıcının
          isteği); sipariş ekranındaki seçenekle aynı ad. */}
      <Satir ad="Ödeme" deger={talep.odeme === 'bakiye' ? 'Bakiyem' : 'Faturayla'} />
      <div className="siparis-ozeti__toplam">
        <span>Genel toplam (KDV dâhil)</span>
        <strong>
          {paraYaz(siparisNetTutari(talep))} {PARA_BIRIMI}
        </strong>
      </div>
    </div>
  )
}

function Satir({ ad, deger }) {
  if (!deger) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">{ad}</div>
      <div>{deger}</div>
    </div>
  )
}

/* MAKİNE VE GARANTİ.

   Servisin ilk sorduğu şey bu: iş garanti kapsamında mı, ücret alacak mı?
   Eskiden yalnız seri numarası yazıyordu, servis yılı kafasından
   hesaplıyordu.

   Yıl ve model seri numarasından çıkıyor (bkz. lib/serial.js), ayrıca
   bir yere kaydedilmesi gerekmiyor. Etiket burada Türkçe yazılı çünkü
   servis paneli tek dilli; `warrantyStatus` sözlük anahtarı döndürüyor ve
   bu tarafta sözlük yok. Metinler `i18n/tr.js` içindekilerle birebir
   aynı tutuluyor: müşteri ve servis aynı makineye baktığında aynı şeyi
   okumalı. */
const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

function Makine({ makine }) {
  const yil = extractYear(makine.serial)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  const model = matchProduct(makine.serial)?.product?.name

  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">Makine</div>
      <div className="mono">{formatSerial(makine.serial)}</div>
      {model && <div className="kucuk">{model}</div>}
      <div className={'garanti garanti--' + durum.state}>
        {(GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor)(kalan)}
        {yil ? ` · ${yil} üretimi` : ''}
      </div>
    </div>
  )
}

/* Seri numarası olmadan elle açılan talebin makinesi (24 Eylül 2026,
   bkz. ElleKayit.jsx başı): model ve tahmini yıl servisin yazdığı.
   Garanti hesaplanmıyor; tahmini yıl dayanak olamaz. */
function SerisizMakine({ makine }) {
  const model = getProduct(makine.productId)?.name
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">Makine</div>
      <div>{model || '—'}</div>
      <div className="kucuk">
        Seri numarası yok{makine.tahminiYil ? ` · tahmini ${makine.tahminiYil} üretimi` : ''}
      </div>
      <div className="garanti garanti--bilinmiyor">
        Seri numarası olmadan garanti süresi hesaplanamaz
      </div>
    </div>
  )
}

/* ==========================================================================
   Servisin kendi kaydı

   Servis gönderdikten sonra ne yazdığını görebiliyor. Bir hafta sonra
   "ben kaç kilometre yazmıştım" sorusunun cevabı burada.

   PAKSAN'IN DÜZELTMESİ GİZLENMİYOR

   Onaylayan personel yolu ya da işçiliği değiştirebiliyor. Bu
   değişiklik servise "siz şunu yazdınız, PAKSAN şuna çevirdi" diye
   GEREKÇESİYLE gösteriliyor. Sessiz değişiklik para konusunda güveni
   bitirir; ayrıca servis neyi yanlış girdiğini ancak böyle öğrenir.
   ========================================================================== */
function ServisKaydi({ talep, servisAd }) {
  const k = talep.servisKaydi
  const h = talep.hakkedis
  const duzeltmeler = k.duzeltmeler || []

  /* Notların dört tonu (29 Eylül 2026, görünüm önerisi S5; servis.css →
     Not): bekleme gri ve saatli, onay yeşil, ret para konusu olduğu için
     sarı ve üçgenli. Ret "turuncu" diyordu; o sınıf dört tona geçerken
     kalktı ve not tonsuz kalmıştı (son denetimde bulundu). */
  const DURUM = {
    bekliyor: { ton: 'gri', ad: 'Onay bekliyor', Ikon: IconSaat },
    onaylandi: { ton: 'yesil', ad: 'Onaylandı', Ikon: IconCheckCircle },
    reddedildi: { ton: 'sari', ad: 'Kabul edilmedi', Ikon: IconAlert },
  }
  const durum = h ? DURUM[h.durum] || DURUM.bekliyor : null

  return (
    <div className="kart" style={{ padding: 16 }}>
      <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
        Servis Kaydınız · {gecenSure(k.tarih)}
      </div>

      {/* Yalnız ESKİ garanti dışı kayıtta: 15 Eylül 2026'dan beri her
          servis kaydı garanti kaydı, satır bilgi taşımıyordu. */}
      {k.kapi !== 'garanti' && <Satir ad="Garanti Durumu" deger={KAPI[k.kapi]} />}
      <Satir ad="Yapılan İş" deger={k.yapilanIs} />
      <Satir ad="Sonuç" deger={k.sonuc} />
      <Satir ad="Gidilen Yol" deger={k.km ? k.km + ' km' : ''} />
      <Satir ad="İşçilik" deger={iscilikYazisi(k)} />

      {/* Parça listesi satır değil TABLO: kod, ad ve adet ayrı
          sütunlarda (bkz. components/ParcaTablosu.jsx). */}
      {temizParcalar(k.parcalar).length > 0 && (
        <>
          <div className="kucuk sonuk" style={{ margin: '12px 0 6px' }}>
            {/* 1. aşamada parça henüz takılmadı: istendi. Aynı satırın
                iki aşamada iki anlamı var. */}
            {k.asama === ASAMA.parca ? 'İstediğiniz parça' : 'Değiştirilen parça'}
          </div>
          <ParcaTablosu parcalar={temizParcalar(k.parcalar)} />
        </>
      )}

      {/* Parça isteğinde seçilen adres (bkz. ServisKapanisi.jsx): servis
          parçayı nerede bekleyeceğini burada görüyor. */}
      <Satir ad="Teslimat adresi" deger={teslimatYazisi(k.teslimat)} />

      {h && (
        <>
          <Satir
            ad="Ödeme Tutarı"
            deger={paraYaz(h.toplam) + ' ' + PARA_BIRIMI}
          />
          <div className={'not not--' + durum.ton} style={{ marginTop: 12 }}>
            <durum.Ikon size={19} />
            <div>
              <strong>{durum.ad}</strong>
              {h.red?.neden && <p>{h.red.neden}</p>}
              {/* RET KESİN (25 Eylül 2026, tasarım kararı; bkz.
                  backoffice/veri.js → hakkedisReddet). Kutu yalnız
                  "Kabul edilmedi" ve nedeni yazıyordu; servis kaydı
                  düzeltip yeniden gönderebileceğini sanıyordu. Sonucu
                  ve itirazın yolunu söylüyor. */}
              {h.durum === 'reddedildi' && (
                <p>Bu iş için ödeme yapılmayacak. İtirazınız varsa PAKSAN ile görüşün.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Önceki ziyaretler: aynı talebe ikinci kez gidildiyse ilk
          seferde ne yapıldığı burada duruyor. Servis kapıdan önce
          okuyor. */}
      {(talep.oncekiKayitlar || []).length > 0 && (
        <>
          <div className="kucuk sonuk" style={{ marginTop: 14, marginBottom: 6 }}>
            Önceki ziyaretler
          </div>
          {talep.oncekiKayitlar.map((o, i) => (
            <Satir
              key={i}
              ad={gecenSure(o.tarih)}
              deger={[o.yapilanIs, parcaYazisi(o.parcalar)].filter(Boolean).join(' · ')}
            />
          ))}
        </>
      )}

      {duzeltmeler.map((d, i) => (
        <div key={i} className="not not--sari" style={{ marginTop: 12 }}>
          <IconAlert size={19} />
          <div>
            <strong>PAKSAN kaydı düzeltti</strong>
            <p>{d.neden}</p>
            {/* Yalnız değişen kalem; hiçbiri değişmediyse satır yok. */}
            {duzeltmeYazisi(d) && <p className="kucuk sonuk">{duzeltmeYazisi(d)}</p>}
          </div>
        </div>
      ))}

      {servisFormuVarMi(talep) && <ServisFormuDugmesi talep={talep} servisAd={servisAd} />}
    </div>
  )
}

/* ==========================================================================
   Servis formu düğmesi

   Garanti kapsamında bitmiş işin PAKSAN servis formu, basılı formun
   düzeninde PDF olarak (bkz. servis/servisFormu.js). Telefonda
   paylaşma ekranı açılıyor: yazdır, WhatsApp, Dosyalar. Düğme işin
   kaydının altında, çünkü form o kaydın belgesi.

   PDF telefonda birkaç saniyede üretiliyor; o sırada düğme kapanıyor
   ve ne olduğunu söylüyor — iki kez basılıp iki paylaşma ekranı
   açılmasın. */
function ServisFormuDugmesi({ talep, servisAd }) {
  const [hazirlaniyor, setHazirlaniyor] = useState(false)
  const [hata, setHata] = useState('')

  async function al() {
    setHata('')
    setHazirlaniyor(true)
    try {
      await servisFormuPaylas(talep, servisAd)
    } catch {
      setHata('Servis formu hazırlanamadı. Tekrar deneyin.')
    }
    setHazirlaniyor(false)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button className="dg dg--blok" onClick={al} disabled={hazirlaniyor}>
        {hazirlaniyor ? 'Hazırlanıyor…' : 'Servis Formunu Al'}
      </button>
      <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
        Garanti işinin servis formu PDF olarak hazırlanır. Yazdırabilir ya da müşteriye
        gönderebilirsiniz.
      </p>
      {hata && <div className="uyari" style={{ marginTop: 10 }}>{hata}</div>}
    </div>
  )
}

/* İstenen parçalar.

   YANINDAKİ STOK SÜTUNU KALDIRILDI. Servisin elindeki parça sayısı
   uygulamada tutuluyordu ve tutmuyordu: PAKSAN'ın gönderdiğiyle
   servisin kendi eline geçen hiçbir zaman aynı rakam olmadı, servis
   de kendi defterini burada tutmadı. Yanlış sayı, sayının hiç
   olmamasından kötü — ekran ona bakıp karar veriyordu.

   Geriye işin kendisi kaldı: hangi parça, kaç adet.

   ADET ADLA ARANMIYOR — KODLA BULUNUYOR.

   Satırlar bir dönem talebin ad listesinden çiziliyor, adet de o adla
   `parcaAdet` içinde aranıyordu. Sipariş kaydı adedi artık kod
   anahtarıyla yazıyor (bkz. veri.js → servisParcaSiparisi); ad ile
   yapılan arama her satırda boş dönüyor ve ekranda her parça "× 1"
   görünüyordu. Ustaya söylenen rakam yanlıştı.

   Katalogta aynı adı taşıyan parçalar var, yani ad bir parçayı
   tanımlamıyor. Bu yüzden satırda KOD da yazıyor: usta parçayı
   koduyla istiyor.

   SATIRLARI ÜRETEN YER BU DOSYA DEĞİL: lib/servisKaydi.js →
   talebinParcalari. Aynı okuma burada, hak ediş ekranında ve sipariş
   listesinde üç kez yazılmıştı; hangi biçimin neden durduğu ve eski
   kayıtta koda niçin uydurulmadığı orada yazılı. */
function ParcaDurumu({ talep }) {
  const tum = talebinParcalari(talep)
  if (!tum.length) return null
  const g = talep.servisSiparisi ? talep.parcaFiyat : null
  /* EKSİK GÖNDERİM (24 Eylül 2026). PAKSAN siparişin bir kısmını
     gönderdiyse gönderilmeyen parçanın altında not, listenin altında
     ne olacağı (bkz. backoffice/veri.js → kalanParcalariGonder). */
  const gonderim = talep.servisSiparisi ? siparisGonderimi(talep) : null
  const kalan = talep.status === 'kapandi' ? gonderim?.kalan || [] : []
  const kalanVar = kalan.length > 0
  /* İPTAL EDİLEN KALEMLER (24 Eylül 2026): PAKSAN gönderemeyeceği
     bekleyen parçayı siparişten çıkardıysa satırın altında etiket,
     listenin altında nedeni ve paranın ne olduğu (backoffice/veri.js →
     kalanParcalariIptalEt). */
  const iptal = gonderim?.iptal || []
  const parcalar =
    kalanVar || iptal.length
      ? tum.map((p, i) =>
          iptal.includes(i)
            ? { ...p, not: 'İptal edildi' }
            : kalan.includes(i)
              ? { ...p, not: 'Henüz gönderilmedi' }
              : p,
        )
      : tum
  const iptaller = talep.kalemIptalleri || []
  const tamKart = Boolean(g && g.iskontoOrani !== undefined && g.listeToplam !== undefined)
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk" style={{ marginBottom: 6 }}>
        İstenen Parçalar
      </div>
      <ParcaTablosu parcalar={parcalar} tutarli={Boolean(g)} />
      {/* Satırlar KDV hariç, sayfanın başındaki toplam KDV dâhil
          (29 Eylül 2026, S3): "KDV hariç rakam yalnız dökümde, adıyla". */}
      {g && KDV_HARIC_LISTE && (
        <p className="kucuk sonuk" style={{ margin: '6px 0 0' }}>
          Satırlardaki tutarlar KDV hariçtir.
        </p>
      )}
      {kalanVar && (
        <p className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
          {talep.odeme === 'bakiye'
            ? 'Gönderilmeyen parçalar hazır olunca ayrıca gönderilecek. Tutarları gönderildikleri gün bakiyenizden düşülür.'
            : 'Gönderilmeyen parçalar hazır olunca ayrıca gönderilecek.'}
        </p>
      )}
      {/* KAÇ PARÇA ÇIKARILDI, ADETLE (25 Eylül 2026, kullanıcı sınaması):
          metin iptal edilen SATIR sayısını okuyordu; adedi 2 olan tek
          satır "1 parça" diye yazılıyordu (lib/servisKaydi.js →
          satirlarinAdedi). */}
      {iptaller.map((k) => (
        <p key={k.no} className="kucuk sonuk" style={{ margin: '8px 0 0' }}>
          {`PAKSAN siparişten ${satirlarinAdedi(talep, k.satirlar)} adet parça çıkardı. İptal nedeni: ${k.neden}.`}
          {k.aciklama ? ` ${k.aciklama}` : ''}{' '}
          {talep.odeme === 'bakiye'
            ? 'Bu parçaların tutarı bakiyenizden düşülmeyecek.'
            : 'Bu parçalar için sizden ücret alınmayacak.'}
        </p>
      ))}
      {/* İndirim dökümü olmayan eski siparişte aşağıdaki kart çıkmıyor;
          iptal edilen pay ve yeni tutar yine de görünsün. */}
      {/* "(KDV dâhil)" (26 Eylül 2026, ikinci kullanıcı sınaması): üstteki
          satırlar KDV hariç, bu toplam KDV dâhil; KDV satırı olmayan bu
          kartta rakamlar tutmuyor gibi görünüyordu. Hak Ediş'in sipariş
          yaprağıyla aynı ek (Hakkedis.jsx). */}
      {iptal.length > 0 && !tamKart && (
        <div className="fiyat-kart" style={{ marginTop: 10, marginBottom: 0 }}>
          <div className="urun-kart__satir">
            <span>Genel toplam</span>
            <strong>
              {paraYaz(siparisHesabi(talep).toplam)} {PARA_BIRIMI} (KDV dâhil)
            </strong>
          </div>
          <IptalPayi talep={talep} />
          {talep.odeme === 'bakiye' && <BakiyeDurumu talep={talep} />}
        </div>
      )}
      {/* SİPARİŞİN İNDİRİMİ (23 Eylül 2026). Sipariş o günkü indirim
          oranını taşıyor (veri.js → servisParcaSiparisi); servis
          verdiği siparişte ne kadar indirim aldığını burada da görüyor.
          Oranı taşımayan eski siparişte bölüm çıkmıyor. */}
      {tamKart && (
        <div className="fiyat-kart" style={{ marginTop: 10, marginBottom: 0 }}>
          <div className="urun-kart__satir">
            <span>Liste fiyatıyla toplam</span>
            <strong>
              {paraYaz(g.listeToplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__satir urun-kart__satir--indirim">
            <span>Yedek parça indiriminiz (%{Math.round(g.iskontoOrani * 100)})</span>
            <strong>
              −{paraYaz(g.iskontoTutari)} {PARA_BIRIMI}
            </strong>
          </div>
          {/* Bakiyeden ödemede ek indirim (24 Eylül 2026): sipariş o
              günkü oranı ve düşülen tutarı taşıyor; yalnız uygulandıysa. */}
          {Number(g.bakiyeIskontoTutari) > 0 && (
            <div className="urun-kart__satir urun-kart__satir--indirim">
              <span>Bakiyeden ödeme ek indirimi (%{Math.round(g.bakiyeIskontoOrani * 100)})</span>
              <strong>
                −{paraYaz(g.bakiyeIskontoTutari)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          {/* ARA TOPLAM VE KDV (24 Eylül 2026). Liste toplamından
              indirimler düşülünce ara toplam çıkıyor; genel toplam KDV
              dâhil. Bu iki satır yokken servis satırları toplayınca genel
              toplamdan %20 eksik bir rakama varıyordu. Sipariş ekranındaki
              özetle aynı satırlar (bkz. SiparisVer.jsx → Ozet). */}
          {g.araToplam !== undefined && (
            <div className="urun-kart__satir">
              <span>Ara toplam</span>
              <strong>
                {paraYaz(g.araToplam)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          {KDV_HARIC_LISTE && g.kdv !== undefined && (
            <div className="urun-kart__satir">
              <span>KDV %{Math.round(KDV_ORANI * 100)}</span>
              <strong>
                {paraYaz(g.kdv)} {PARA_BIRIMI}
              </strong>
            </div>
          )}
          <div className="urun-kart__satir urun-kart__satir--vurgu">
            <span>Genel toplam</span>
            <strong>
              {paraYaz(g.toplam)} {PARA_BIRIMI}
            </strong>
          </div>
          {/* İptal edilen kalem varsa genel toplam siparişin ilk hâli;
              servisin ödeyeceği yeni tutar altında (veri.js →
              siparisHesabi → net). */}
          {iptal.length > 0 && <IptalPayi talep={talep} />}
          {/* BAKİYEDEN NE KADAR DÜŞTÜ (24 Eylül 2026). Servis Hak Ediş'te
              bu siparişin satırını görüp genel toplamla karşılaştırıyor;
              kısmi gönderimde ya da parça henüz gönderilmemişken ikisi
              tutmuyordu ve nedeni hiçbir yerde yazmıyordu
              (bkz. veri.js → siparisHesabi). */}
          {talep.odeme === 'bakiye' && <BakiyeDurumu talep={talep} />}
        </div>
      )}
    </div>
  )
}

function IptalPayi({ talep }) {
  const h = siparisHesabi(talep)
  if (!(h.iptalEdilen > 0)) return null
  return (
    <>
      <div className="urun-kart__satir urun-kart__satir--indirim">
        <span>İptal edilen parçalar</span>
        <strong>
          −{paraYaz(h.iptalEdilen)} {PARA_BIRIMI}
        </strong>
      </div>
      <div className="urun-kart__satir urun-kart__satir--vurgu">
        <span>Siparişin yeni tutarı</span>
        <strong>
          {paraYaz(h.net)} {PARA_BIRIMI}
        </strong>
      </div>
    </>
  )
}

function BakiyeDurumu({ talep }) {
  const h = siparisHesabi(talep)
  const satir = (ad, n) => (
    <div className="urun-kart__satir">
      <span>{ad}</span>
      <strong>
        {paraYaz(n)} {PARA_BIRIMI}
      </strong>
    </div>
  )
  if (talep.status === 'iptal') {
    return h.iade > 0 ? satir('İptal sonrası bakiyenize geri eklenen', h.iade) : null
  }
  return (
    <>
      {h.dusulen > 0 && satir('Bakiyenizden düşülen', h.dusulen)}
      {h.bekleyen > 0 &&
        satir(
          h.dusulen > 0 ? 'Kalan parçalar gönderilince düşülecek' : 'Parçalar gönderilince düşülecek',
          h.bekleyen,
        )}
    </>
  )
}

/* Pencere kabuğu — ALTTAN AÇILAN YAPRAK (29 Eylül 2026, görünüm önerisi
   S4). Backoffice'in Form kalıbıydı: ekranın ortasında küçük bir kart,
   sağ üstte ikinci bir "Kapat", altta yan yana küçük düğmeler. Tek elle
   tutulan 6,5 inçlik telefonda başparmak ortaya ve sağ üste yetişmiyordu;
   para onayları da zaten alttan açılıyordu (Kabuk.jsx → Onay). Şimdi
   hepsi aynı: alttan açılıyor, düğmeler tam genişlikte ve alt alta.
   "Kapat" yok: her pencerenin kendi "Vazgeç"i var, telefonun geri
   hareketi ve karartılmış zemine dokunmak da kapatıyor. */
/* `ad` pencerenin işini söyleyen işaret (`data-pencere="devret"`): ekran
   turu pencereyi başlığının kelimesiyle değil bununla buluyor (X-13,
   30 Eylül 2026). Adı verilmeyen pencere eskisi gibi `data-pencere`
   taşıyor; X-06 ve X-07 yalnız varlığına bakıyor. */
function Pencere({ baslik, ad, children, onKapat }) {
  /* Geri tuşu "Vazgeç" ile aynı (bkz. servis/geri.jsx). */
  useGeri(true, () => onKapat())
  const kilit = useAcilisKilidi()
  return (
    <div data-pencere={ad || true} className="yaprak-perde" onClickCapture={kilit} onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="yaprak-pencere" role="dialog" aria-label={baslik}>
        <h2 className="yaprak-pencere__baslik" data-pencere-baslik>{baslik}</h2>
        <div className="yaprak-pencere__ic">{children}</div>
      </div>
    </div>
  )
}

/* "Ne yapılacak" alanı kaldırıldı; yapılacak iş türden çıkarılıyor.

   O alan müşterinin bildirimine gidiyor (bkz. talepPlanla → plan.is).
   Boş bırakılamazdı, ama servisten ayrıca yazmasını istemek gereksizdi:
   yapılacak iş zaten talebin türü. Müşteri de "servis ziyareti" diye
   okuyor, servisin yazdığı serbest metni değil. Yazı lib/talep.js →
   RANDEVU_ISI'nde: demo verisi de randevuyu o biçimde yazıyor. */
function Randevu({ talep, servisAd, musteriyeGider, onKapat, onBitti, onRed }) {
  /* Kayıtlı randevu varsa kutular onunla doluyor: servis tarihi
     değiştirmek için baştan yazmıyor. */
  /* `toISOString` değil `bugunGirdi`: ISO UTC'ye çeviriyor ve gece
     yarısına yakın kaydedilmiş randevuyu bir gün geri gösteriyordu
     (Türkiye UTC+3; 23.09 00:00 → "2026-09-22"). */
  const [tarih, setTarih] = useState(() => (talep.plan?.tarih ? bugunGirdi(talep.plan.tarih) : ''))
  const [onay, setOnay] = useState(false)
  const [hata, setHata] = useState('')
  const degisiklik = Boolean(talep.plan)

  function kaydet() {
    if (!tarih) return setHata('Gideceğiniz tarihi seçin.')
    /* GEÇMİŞ TARİH KAYDEDİLEMİYOR.

       Kutuya `min` verildi ama o yalnız takvimin kendi denetimi;
       elle yazılan değer geçiyordu. Geçmiş tarihli randevu hem
       müşteriye yanlış bildirim gönderiyor hem de "bugünün planı"
       bloğunda gidilmemiş iş gibi görünüyordu. */
    if (!ileriTarihMi(tarih)) return setHata('Geçmiş bir gün seçilemez.')
    /* Backoffice'teki kuralın aynısı: randevu müşteriyle konuşulmadan
       kaydedilmiyor. Müşteri o gün tarlada olmayabilir. */
    if (!onay) return setHata('Randevuyu kaydetmeden önce müşteriyle görüşün.')
    /* SAAT SORULMUYOR, SAAT YAZILMIYOR (25 Eylül 2026, kullanıcı
       sınaması). `new Date('2026-09-25')` günü UTC gece yarısı okuyordu;
       Türkiye'de o an 03:00 ve İşlerim randevuyu "25.09 · 03:00"
       gösteriyordu. Gün artık yerel gün başı, randevu da saatin
       girilmediğini taşıyor (lib/tarih.js → gunlukRandevu,
       `saatBelirtildi: false`). */
    const sonuc = talepPlanla(
      talep,
      {
        ...gunlukRandevu(tarih),
        is: RANDEVU_ISI[talep.tur] || 'Ziyaret',
        gorusuldu: true,
      },
      servisAd,
      { servisten: true },
    )
    if (onRed?.(sonuc)) return
    onBitti(tarih)
  }

  /* GÜN İKİ DOKUNUŞ (29 Eylül 2026, görünüm önerisi S4). Randevuların
     çoğu bugün ya da yarın; takvim kutusu küçük ve yağlı parmakla zor
     açılıyordu. Önümüzdeki yedi gün düğme; başka bir gün için takvim
     aşağıda duruyor. Kaydedilen değer aynı: gün başı, saatsiz. */
  /* SEKİZ GÜN, DÖRTLÜ İKİ SIRA (29 Eylül 2026, son denetim). Yedi gün tek
     sırada 360 piksellik telefonda 39 piksele iniyordu (dokunma alanı
     en az 44); dört sütunda her düğme 70 pikselin üstünde. Sekizinci
     gün ızgarayı dolduruyor ve gelecek haftanın aynı gününü veriyor. */
  const gunler = Array.from({ length: 8 }, (_, i) => bugunGirdi(Date.now() + i * 86400000))

  return (
    <Pencere baslik={degisiklik ? 'Randevuyu Değiştir' : 'Randevu'} onKapat={onKapat}>
      <div className="gun-secici" role="group" aria-label="Gideceğiniz Tarih">
        {gunler.map((g, i) => {
          const d = new Date(g + 'T00:00')
          return (
            <button
              key={g}
              type="button"
              className={'gun-secici__gun' + (tarih === g ? ' gun-secici__gun--on' : '')}
              aria-pressed={tarih === g}
              onClick={() => {
                setTarih(g)
                setHata('')
              }}
            >
              <span className="gun-secici__ad">
                {i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </span>
              <span className="gun-secici__no">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
      <label className="alan">
        <span className="alan__ad">Başka bir gün</span>
        <input
          className="gir"
          type="date"
          min={bugunGirdi()}
          value={tarih}
          onChange={(e) => {
            setTarih(e.target.value)
            setHata('')
          }}
          /* Klavyeyle yazılan geçmiş gün kutudan çıkınca siliniyor
             (bkz. lib/tarih.js → "Üçüncü katman"). */
          onBlur={(e) => {
            if (e.target.value && !ileriTarihMi(e.target.value)) {
              setTarih('')
              setHata('Geçmiş bir gün seçilemez.')
            }
          }}
        />
      </label>

      {/* Büyük satır (S4): 16 piksellik kutu yağlı parmakla ıskalanıyordu
          ve işaretlenmeden kayıt yapılmıyordu. Satırın tamamı dokunulur. */}
      <label className="secim secim--buyuk">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} />
        <span>Müşteriden randevu onayı alındı</span>
      </label>

      {hata && <div className="uyari">{hata}</div>}

      <p className="kucuk sonuk" style={{ margin: '4px 0 14px' }}>
        {musteriyeGider ? 'Müşteriye bu tarih için bildirim gönderilecek.' : ALICISIZ}
      </p>

      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

function Not({ talep, servisAd, onKapat, onBitti }) {
  const [metin, setMetin] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (metin.trim().length < 3) return setHata('Notunuzu yazın.')
    talepNotEkle(talep, metin.trim(), servisAd, { servisten: true })
    onBitti()
  }

  return (
    <Pencere baslik="Not Ekle" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Notunuzu PAKSAN görür, müşteriye gönderilmez. Talebin içindeki Notlarınız bölümünde görünür.
      </p>
      <DikteliKutu ad="Not" deger={metin} onDegis={setMetin} satir={3} />
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button className="dg dg--ana" onClick={kaydet}>Kaydet</button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

/* İŞİ PAKSAN'A DEVRETME (30 Eylül 2026'ya kadar adı "PAKSAN'dan Destek
   İste"; bkz. yukarıda düğmenin notu). Pencere ne olacağını söylüyor:
   işi PAKSAN üstleniyor, neden ona gidiyor, servis bu işte bir daha
   işlem yapamıyor (`sesiVar`, `islemVar` kapanıyor), müşteriye bildirim
   gitmiyor (veri.js → destekTalepEt). Geri alma yok; bu yüzden servis
   ne olacağını basmadan önce okuyor. Başlık ve onay düğmesi aynı ad,
   İptal penceresindeki gibi. Metinler Codex'ten. */
function Devret({ onKapat, onGonder }) {
  const [neden, setNeden] = useState('')
  const [hata, setHata] = useState('')

  return (
    <Pencere baslik={`PAKSAN’a Devret`} ad="devret" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        {`İşi PAKSAN üstlenir ve devir nedeniniz PAKSAN’a iletilir. Müşteri sizin müşteriniz olarak kalır ve müşteriye bildirim gitmez. Bu işte artık uygulamadan işlem yapamazsınız; PAKSAN’ın attığı adımları burada görmeye devam edersiniz.`}
      </p>
      <DikteliKutu
        ad="Devir nedeni"
        deger={neden}
        onDegis={setNeden}
        satir={3}
        placeholder="Örnek: Sorunu yerinde göremedik, elektronik arıza olabilir"
      />
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button
          className="dg dg--ana"
          data-eylem="devret-onay"
          onClick={() => {
            if (neden.trim().length < 3) return setHata('Devir nedenini yazın.')
            onGonder(neden.trim())
          }}
        >
          PAKSAN’a Devret
        </button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}

/* ==========================================================================
   Talebi iptal etme

   Servis müşteriyi aradığında talebin yanlış açıldığını ya da müşterinin
   vazgeçtiğini öğrenebiliyor (kullanıcı, 10 Eylül 2026). Neden
   sorulmadan iptal edilemiyor: neden müşteriye aynen gidiyor ve PAKSAN
   da görüyor (bkz. backoffice/veri.js → talepIptal).

   Pencere ne olacağını söylüyor; "Emin misiniz?" demiyor. Nedenler tam
   genişlikte düğme; "Başka bir neden" seçilirse neden yazılıyor.
   ========================================================================== */
/* Düğme yazısı Başlık Düzeninde (`ad`); müşterinin bildirimine giden
   cümle normal yazımla (`neden`). */
const IPTAL_NEDENLERI = [
  { deger: 'yanlis', ad: 'Talep Yanlış Açılmış', neden: 'Talep yanlış açılmış' },
  { deger: 'vazgecti', ad: 'Müşteri Vazgeçti', neden: 'Müşteri vazgeçti' },
  { deger: 'ulasilamadi', ad: 'Müşteriye Ulaşılamadı', neden: 'Müşteriye ulaşılamadı' },
  { deger: 'baska', ad: 'Başka Bir Neden', neden: 'Başka bir neden' },
]

function Iptal({ talep, servisAd, musteriyeGider, onKapat, onBitti, onRed }) {
  const [neden, setNeden] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')
  const baska = neden === 'baska'

  function iptalEt() {
    if (!neden) return setHata('İptal nedenini seçin.')
    if (baska && aciklama.trim().length < 3) return setHata('İptal nedenini yazın.')
    const secilen = IPTAL_NEDENLERI.find((n) => n.deger === neden)
    const sonuc = talepIptal(
      talep,
      {
        neden: baska ? aciklama.trim() : secilen.neden,
        aciklama: baska ? '' : aciklama.trim(),
      },
      servisAd,
      { servisten: true },
    )
    if (onRed?.(sonuc)) return
    onBitti()
  }

  return (
    <Pencere baslik="Talebi İptal Et" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        {musteriyeGider
          ? `Talep iptal edilir ve İşlerim listesinden çıkar. İptal nedeni müşteriye bildirilir. PAKSAN yetkilileri de iptal nedenini görür.`
          : `Talep iptal edilir ve İşlerim listesinden çıkar. PAKSAN yetkilileri iptal nedenini görür. Talep müşterinin uygulamadaki hesabına bağlı olmadığı için bildirim gönderilmez.`}
      </p>
      <Secenekler
        secenekler={IPTAL_NEDENLERI}
        secili={neden}
        onSec={(v) => {
          setNeden(v)
          setHata('')
        }}
      />
      <DikteliKutu
        ad={baska ? 'İptal nedeni' : 'Açıklama (isteğe bağlı)'}
        deger={aciklama}
        onDegis={setAciklama}
        satir={3}
      />
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button className="dg dg--ana" onClick={iptalEt}>
          Talebi İptal Et
        </button>
        <button className="dg" onClick={onKapat}>Vazgeç</button>
      </div>
    </Pencere>
  )
}
