import { useState } from 'react'
import { useGeri } from '../geri'
import {
  talepDurumDegistir,
  talepKapat,
  talepNotEkle,
  talepPlanla,
  talepIptal,
} from '../../backoffice/veri'
import {
  ASAMA, GARANTI_DISI_OZET, KAPI, parcaYazisiKodlu as parcaYazisi, talebinParcalari, temizParcalar,
} from '../../lib/servisKaydi'
import { DikteliKutu } from '../Dikte'
import { ParcaTablosu } from '../../components/ParcaTablosu'
import { teslimatYazisi } from '../../lib/teslimat'
import { bugunGirdi, ileriTarihMi } from '../../lib/tarih'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { getProduct, MARKA, markaEk } from '../../marka'
import { PARA_BIRIMI, paraYaz } from '../../marka'
import { ServisKapanisi, Secenekler } from './ServisKapanisi'
import { Onay, Sayfa } from '../Kabuk'
import {
  extractYear,
  formatSerial,
  matchProduct,
  warrantyStatus,
  GARANTI_YIL,
} from '../../lib/serial'
import {
  IconAlert,
  IconBook,
  IconCalendar,
  IconCheckCircle,
  IconPhone,
  IconRight,
  IconShield,
  IconClose,
} from '../../components/Icons'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
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
     PAKSAN'dan destek    → destekTalepEt() → sahiplik PAKSAN'a geçer

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

export function TalepDetay({
  talep,
  oturum,
  servisAd,
  onKapat,
  onDestekIste,
  onYenile,
}) {
  const [pencere, setPencere] = useState(null)
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)
  /* Servis kaydının doğurduğu iki bekleme. İkisi de AÇIK talep: iş
     bitmedi, sıra karşı tarafta (bkz. lib/servisKaydi.js). */
  const onayda = talep.status === 'onayBekliyor'
  const parcada = talep.status === 'parcaBekliyor'

  /* İKİ AYRI YETKİ VAR VE KARIŞTIRILMAMALI.

     `islemVar`    servis kaydını açma yetkisi. Kayıt bir kez
                   gönderildikten sonra kapanıyor: aynı iş için ikinci
                   kayıt açılmaz, sıra karşı tarafta.

     `sesiVar`     not yazma, randevu verme, destek isteme. Talep AÇIK
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
     verilecek olan o değil. */
  const randevuVar = sesiVar && !talep.servisKaydi && !onayda && !parcada
  /* Yalnız müşteriye gönderilmiş notlar; iç notlar servise gitmiyor. */
  const musteriNotlari = (talep.notlar || []).filter((n) => n.musteriye)
  /* PAKSAN'IN DOĞRUDAN SERVİSE YAZDIKLARI.

     Müşteriye giden notun aynısı, muhatabı servis: "iki koli gitti",
     "kapıya bırakılacak", "eski kasnağı da koydum". Bu bilginin
     servise ulaşacağı başka bir yol yoktu; telefon ediliyordu ve
     talepte izi kalmıyordu. */
  const bizeNotlar = (talep.notlar || []).filter((n) => n.servise)
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
     kapatılabilirdi. */
  const kayitAsamasi = talep.servisKaydi?.asama
  const ikinciAsama = parcada && kayitAsamasi === ASAMA.parca
  const parcaYolda = Boolean(talep.parcaSevk)

  const asilIslem = parcada ? (
    <>
      <button
        className="dg dg--ana dg--blok"
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
    </>
  ) : (
    islemVar && (
      <button
        className="dg dg--ana dg--blok"
        onClick={() => setPencere('kapanis')}
      >
        Servis Kaydını Aç
      </button>
    )
  )

  return (
    <Sayfa
      baslik={talep.ad || '—'}
      alt={talep.no}
      onGeri={onKapat}
      dip={asilIslem}
    >
      {/* ================================== Sorun devam ediyor

          Bu iş bir kez kapandı ve müşteri "hâlâ aynı" dedi. Servisin
          bunu KAPIDAN ÖNCE bilmesi gerekiyor: aynı arızaya ikinci kez
          gidiyor, ilk seferde ne yaptığı aşağıda yazılı. Ekranın en
          üstünde duruyor, çünkü altındaki her şey ilk ziyaretin
          bilgisi. */}
      {(talep.tekrar || []).length > 0 && (
        <div className="not not--turuncu">
          <IconAlert size={19} />
          <div>
            <strong>
              Müşteri sorunun devam ettiğini bildirdi
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

      <div className="kart" style={{ padding: 16 }}>
        <div className="is__ust">
          <span className={'tur tur--' + talep.tur}>
            {TUR_ADI[talep.tur] || talep.tur}
          </span>
        </div>

        {/* Numara dokunulabilir: servis ezberleyip tuşlamıyor. Listedeki
            arama düğmesinin aynısı, burada satır hâlinde. */}
        {talep.tel && (
          <div style={{ marginTop: 10 }}>
            <div className="kucuk sonuk">Telefon</div>
            <a className="ara-satir" href={'tel:' + String(talep.tel).replace(/\D/g, '')}>
              <IconPhone size={19} />
              <span className="mono">{talep.tel}</span>
            </a>
          </div>
        )}
        <Satir
          ad="Konum"
          deger={talep.ilce ? `${talep.ilce} / ${talep.il}` : talep.il}
        />
        {/* ADRES SERVİSİN ASIL İHTİYACI.

            İl ve ilçe listede sıralama için yeterli, tarlaya gitmek
            için değil. Müşteri uygulamada makinenin bulunduğu adresi
            yazıyor (bkz. screens/RequestForm.jsx) ve servis kapıdan
            çıkmadan önce burada okuyor. Telefonla açılan taleplerde
            boş; o zaman servis kayıt ekranında kendisi dolduruyor. */}
        <Satir ad="Adres" deger={talep.adres} />
        {talep.makine?.serial && <Makine makine={talep.makine} />}

        {/* Kimlik değil okunur karşılık: ekranda "sorunlu" yazıyordu. */}
        {talep.durum && (
          <Satir ad="Makinenin Durumu" deger={makineDurumAdi(talep.durum)} />
        )}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {/* Koşul iki biçime de bakıyor: yeni kayıtta satırlar fiyat
            görüntüsünde, eski kayıtta ad listesinde duruyor. */}
        {(talep.parcalar?.length > 0 ||
          talep.parcaFiyat?.satirlar?.length > 0) && (
          <ParcaDurumu talep={talep} />
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
        {talep.aciklama && <Satir ad="Müşterinin Anlattığı" deger={talep.aciklama} />}
        {talep.ulasim && <Satir ad="Aranma Tercihi" deger={talep.ulasim} />}

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
              <audio controls src={talep.ses.veri} style={{ width: '100%', marginTop: 6 }} />
            ) : (
              <div className="kucuk sonuk">Ses kaydı saklanmıyor.</div>
            )}
          </div>
        )}

        <Ekler ekler={talep.ekler} />
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
                  <audio controls src={e.ses.veri} style={{ width: '100%', marginTop: 8 }} />
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
            {MARKA} müşteriye şunları yazdı
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

      {bizeNotlar.length > 0 && (
        <div className="kart" style={{ padding: 16 }}>
          <div className="kucuk sonuk" style={{ marginBottom: 10 }}>
            {MARKA} size şunları yazdı
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

      {/* RANDEVU ALINMIŞ TALEP AYNI EKRANI GÖSTERMEMELİ.

          Randevu verildikten sonra talep servis tarafında yine "bekleyen"
          listesinde duruyor (doğrusu da bu, iş bitmedi) ama detayı yeni
          gelmiş bir taleple birebir aynı görünüyordu: servis randevu
          verdiğini unutup ikinci kez veriyordu. */}

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
          <IconShield size={19} />
          <div>
            <strong>{MARKA} bu talebe destek veriyor.</strong>
            <p>
              Müşteri hâlâ sizin müşteriniz. {markaEk('in')} attığı adımları
              burada görmeye devam edeceksiniz.
            </p>
          </div>
        </div>
      )}

      {onayda && (
        <div className="not not--mavi">
          <IconShield size={19} />
          <div>
            <strong>Kaydınız {markaEk('da')} onay bekliyor.</strong>
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
        <div className={'not ' + (talep.parcaSevk ? 'not--yesil' : 'not--turuncu')}>
          <IconAlert size={19} />
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
                : `${MARKA} parçayı hazırlıyor. Kargoya verildiğinde takip numarası burada görünecek.`}
            </p>
          </div>
        </div>
      )}

      {talep.servisKaydi && <ServisKaydi talep={talep} />}

      {/* İptal edilen talep "tamamlandı" demiyor; nedeni burada. */}
      {kapali && talep.status === 'iptal' ? (
        <div className="not not--turuncu">
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
          {garantiDisiVar && (
            <button
              className="secenek__dg secenek__dg--tamamla"
              onClick={() => setPencere('garantiDisi')}
            >
              <IconCheckCircle size={19} />
              Garanti Dışı İşi Tamamla
              <IconRight size={17} />
            </button>
          )}
          {talep.tur === 'servis' && randevuVar && (
            <button className="secenek__dg" onClick={() => setPencere('randevu')}>
              <IconCalendar size={19} />
              {talep.plan ? 'Randevuyu Değiştir' : 'Randevu'}
              <IconRight size={17} />
            </button>
          )}
          <button className="secenek__dg" onClick={() => setPencere('not')}>
            <IconBook size={19} />
            Not Ekle
            <IconRight size={17} />
          </button>
          <button className="secenek__dg" onClick={() => setPencere('destek')}>
            <IconShield size={19} />
            {markaEk('dan')} Destek İste
            <IconRight size={17} />
          </button>
          {iptalVar && (
            <button className="secenek__dg" onClick={() => setPencere('iptal')}>
              <IconClose size={19} />
              Talebi İptal Et
              <IconRight size={17} />
            </button>
          )}
        </div>
      )}

      {pencere === 'randevu' && (
        <Randevu
          talep={talep}
          servisAd={servisAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
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
      {pencere === 'destek' && (
        <Destek onKapat={() => setPencere(null)} onGonder={onDestekIste} />
      )}
      {pencere === 'iptal' && (
        <Iptal
          talep={talep}
          servisAd={servisAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {/* Metinler Codex'ten (15 Eylül 2026). */}
      {pencere === 'garantiDisi' && (
        <Onay
          baslik="Talep kapanacak"
          metin="Servis kaydı açılmadan talep kapanacak, hak ediş oluşmayacak. Müşteriye talebin tamamlandığı bildirilecek."
          kalemler={[{ ad: 'Talep', deger: talep.no }]}
          dugme="Talebi Kapat"
          onOnayla={() => {
            /* Yeniden açılmış talepte ilk ziyaretin çözümü (yapılan iş,
               değişen parça) silinmiyor: `onceki` içinde kalıyor ve
               müşteri uygulaması onu göstermeye devam ediyor. */
            talepKapat(
              talep,
              {
                ozet: GARANTI_DISI_OZET,
                garantiDisi: true,
                ...(talep.servisKaydi && talep.cozum && !talep.cozum.garantiDisi
                  ? { onceki: talep.cozum }
                  : {}),
              },
              servisAd,
            )
            onKapat()
          }}
          onVazgec={() => setPencere(null)}
        />
      )}
      {pencere === 'parcaKapat' && (
        <Onay
          baslik="Talep kapanacak"
          metin="Parçayı taktığınızı bildiriyorsunuz. Talep kapanacak ve müşteriye bildirim gidecek."
          parcalar={temizParcalar(talep.servisKaydi?.parcalar)}
          kalemler={[{ ad: 'Talep', deger: talep.no }]}
          dugme="Parçayı Taktım"
          onOnayla={() => {
            talepDurumDegistir(talep, 'kapandi', servisAd)
            onKapat()
          }}
          onVazgec={() => setPencere(null)}
        />
      )}
    </Sayfa>
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
function ServisKaydi({ talep }) {
  const k = talep.servisKaydi
  const h = talep.hakkedis
  const duzeltmeler = k.duzeltmeler || []

  const DURUM = {
    bekliyor: { ton: 'mavi', ad: 'Onay bekliyor' },
    onaylandi: { ton: 'yesil', ad: 'Onaylandı' },
    reddedildi: { ton: 'turuncu', ad: 'Kabul edilmedi' },
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
      <Satir
        ad="İşçilik"
        deger={k.iscilik ? paraYaz(k.iscilik) + ' ' + PARA_BIRIMI : ''}
      />

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
      <Satir ad="Gönderim Adresi" deger={teslimatYazisi(k.teslimat)} />

      {h && (
        <>
          <Satir
            ad="Ödeme Tutarı"
            deger={paraYaz(h.toplam) + ' ' + PARA_BIRIMI}
          />
          <div className={'not not--' + durum.ton} style={{ marginTop: 12 }}>
            <IconCheckCircle size={19} />
            <div>
              <strong>{durum.ad}</strong>
              {h.red?.neden && <p>{h.red.neden}</p>}
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
        <div key={i} className="not not--turuncu" style={{ marginTop: 12 }}>
          <IconAlert size={19} />
          <div>
            <strong>{MARKA} kaydı düzeltti</strong>
            <p>{d.neden}</p>
            <p className="kucuk sonuk">
              Yol {d.onceki.km || 0} km → {d.yeni.km || 0} km · İşçilik{' '}
              {paraYaz(d.onceki.iscilik || 0)} → {paraYaz(d.yeni.iscilik || 0)}{' '}
              {PARA_BIRIMI}
            </p>
          </div>
        </div>
      ))}
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
  const parcalar = talebinParcalari(talep)
  if (!parcalar.length) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk" style={{ marginBottom: 6 }}>
        İstenen Parçalar
      </div>
      <ParcaTablosu parcalar={parcalar} />
    </div>
  )
}

/* Pencere kabuğu; backoffice'teki Form kalıbının aynısı. */
function Pencere({ baslik, children, onKapat }) {
  /* Geri tuşu "Kapat" düğmesiyle aynı (bkz. servis/geri.jsx). */
  useGeri(true, () => onKapat())
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,26,51,.45)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="kart" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="kart__tepe">
          <h2>{baslik}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>
            Kapat
          </button>
        </div>
        <div className="kart__ic">{children}</div>
      </div>
    </div>
  )
}

/* "Ne yapılacak" alanı kaldırıldı; yapılacak iş türden çıkarılıyor.

   O alan müşterinin bildirimine gidiyor (bkz. talepPlanla → plan.is).
   Boş bırakılamazdı, ama servisten ayrıca yazmasını istemek gereksizdi:
   yapılacak iş zaten talebin türü. Müşteri de "servis ziyareti" diye
   okuyor, servisin yazdığı serbest metni değil. */
const PLAN_ISI = {
  servis: 'Servis ziyareti',
  parca: 'Parça teslimi',
}

function Randevu({ talep, servisAd, onKapat, onBitti }) {
  /* Kayıtlı randevu varsa kutular onunla doluyor: servis tarihi
     değiştirmek için baştan yazmıyor. */
  const [tarih, setTarih] = useState(() =>
    talep.plan?.tarih ? new Date(talep.plan.tarih).toISOString().slice(0, 10) : '',
  )
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
    const g = new Date(tarih)
    talepPlanla(
      talep,
      {
        tarih: g.getTime(),
        tarihYazi: g.toLocaleDateString('tr-TR'),
        is: PLAN_ISI[talep.tur] || 'Ziyaret',
        gorusuldu: true,
      },
      servisAd,
    )
    onBitti()
  }

  return (
    <Pencere baslik={degisiklik ? 'Randevuyu Değiştir' : 'Randevu'} onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Gideceğiniz Tarih</span>
        <input
          className="gir"
          type="date"
          min={bugunGirdi()}
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
        />
      </label>

      <label className="secim">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} />
        <span>Müşteriden randevu onayı alındı</span>
      </label>

      {hata && <div className="uyari">{hata}</div>}

      <p className="kucuk sonuk" style={{ margin: '4px 0 14px' }}>
        Müşteriye bu tarih için bildirim gönderilecek.
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
        Notunuzu {MARKA} görür, müşteriye gönderilmez. Talebin içindeki Notlarınız bölümünde görünür.
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

function Destek({ onKapat, onGonder }) {
  const [neden, setNeden] = useState('')
  const [hata, setHata] = useState('')

  return (
    <Pencere baslik={`${markaEk('dan')} Destek İste`} onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Talep {markaEk('a')} geçecek ama müşteri sizin müşteriniz olmaya devam
        edecek. {markaEk('in')} attığı adımları burada görmeye devam
        edeceksiniz.
      </p>
      <DikteliKutu
        ad="Neden Destek İstiyorsunuz?"
        deger={neden}
        onDegis={setNeden}
        satir={3}
        placeholder="Örnek: Sorunu yerinde göremedik, elektronik arıza olabilir"
      />
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button
          className="dg dg--ana"
          onClick={() => {
            if (neden.trim().length < 3) return setHata('Destek isteme nedeninizi yazın.')
            onGonder(neden.trim())
          }}
        >
          Destek İste
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

function Iptal({ talep, servisAd, onKapat, onBitti }) {
  const [neden, setNeden] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')
  const baska = neden === 'baska'

  function iptalEt() {
    if (!neden) return setHata('İptal nedenini seçin.')
    if (baska && aciklama.trim().length < 3) return setHata('İptal nedenini yazın.')
    const secilen = IPTAL_NEDENLERI.find((n) => n.deger === neden)
    talepIptal(
      talep,
      {
        neden: baska ? aciklama.trim() : secilen.neden,
        aciklama: baska ? '' : aciklama.trim(),
      },
      servisAd,
    )
    onBitti()
  }

  return (
    <Pencere baslik="Talebi İptal Et" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Talep iptal edilir ve İşlerim listesinden çıkar. İptal nedeni
        müşteriye bildirilir. {MARKA} yetkilileri de iptal nedenini görür.
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
