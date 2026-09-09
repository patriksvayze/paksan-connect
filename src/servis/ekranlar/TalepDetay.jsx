import { useState } from 'react'
import {
  parcaIlerlemeEngeli,
  talepDurumDegistir,
  talepKapat,
  talepNotEkle,
  talepPlanla,
} from '../../backoffice/veri'
import { KAPI, parcaYazisi } from '../../lib/servisKaydi'
import { makineDurumAdi } from '../../data/talepAlanlari'
import { getProduct, MARKA, markaEk } from '../../marka'
import { PARA_BIRIMI, paraYaz } from '../../marka'
import { ServisKapanisi } from './ServisKapanisi'
import { Sayfa } from '../Kabuk'
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
     İşi tamamladım       → talepKapat()    → kapandi
     Parçayı gönderdim    → talepKapat()    → kapandi
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
}) {
  const [pencere, setPencere] = useState(null)
  const paksanda = (talep.sahip || 'paksan') === 'paksan'
  const kapali = ['kapandi', 'iptal'].includes(talep.status)
  /* Servis kaydının doğurduğu iki bekleme. İkisi de AÇIK talep: iş
     bitmedi, sıra karşı tarafta (bkz. lib/servisKaydi.js). */
  const onayda = talep.status === 'onayBekliyor'
  const parcada = talep.status === 'parcaBekliyor'
  const islemVar = !kapali && !paksanda && !onayda && !parcada
  /* Yalnız müşteriye gönderilmiş notlar; iç notlar servise gitmiyor. */
  const musteriNotlari = (talep.notlar || []).filter((n) => n.musteriye)

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
  /* ÖDEME ONAYI BAYİ TARAFINDA DA KİLİT.

     Parça bedeli önden alınıyor ve dekontu PAKSAN kontrol ediyor.
     Backoffice bu kuralı zaten uyguluyordu (`parcaIlerlemeEngeli`)
     ama servis paneli uygulamıyordu: servis, ödemesi onaylanmamış bir
     talebi "gönderdim" diye kapatabiliyor ve müşteriye "Parçanız Yola
     Çıktı" bildirimi gidiyordu. Aynı kural iki tarafta da geçerli. */
  const odemeEngeli = parcaIlerlemeEngeli(talep, 'kapandi')

  /* KAPANIŞ TÜRE GÖRE DEĞİŞİYOR — ikisi aynı formla kapanmıyor.

     Servis kapanışı bir onarımı anlatıyor, yedek parça kapanışı bir
     gönderimi. İkisi tek forma sokulduğunda parça talebi "Ne yapıldı?
     Ayar yapıldı" diye kapanıyordu; sorulan soru işin kendisiyle
     ilgisizdi.

     Alan adları backoffice'in kendi kapanış formuyla aynı
     (bkz. Talepler.jsx `KAPANIS_ALANLARI`), böylece PAKSAN ve müşteri
     servisin kapattığı işi kendi ekranlarında okuyor. */
  const KAPANIS = {
    parca: { pencere: 'gonderdim', ad: 'Parçayı Gönderdim' },
    servis: { pencere: 'kapanis', ad: 'Servis Kaydını Aç' },
  }
  const kapanis = KAPANIS[talep.tur] || KAPANIS.servis

  /* PARÇA BEKLEYEN İŞİ SERVİS KAPATIYOR — PAKSAN DEĞİL.

     Parça yola çıktığında PAKSAN'ın işi bitiyor ama iş bitmiyor:
     parçanın takılması gerekiyor ve onu yalnız serviste olan biri
     bilebilir. Talep bu yüzden açık kalıyor ve kapatma düğmesi
     burada duruyor. */
  const asilIslem = parcada ? (
    <button
      className="dg dg--ana dg--blok"
      onClick={() => {
        talepDurumDegistir(talep, 'kapandi', servisAd)
        onKapat()
      }}
    >
      Parçayı Taktım, İşi Kapat
    </button>
  ) : (
    islemVar && (
      <button
        className="dg dg--ana dg--blok"
        onClick={() => setPencere(kapanis.pencere)}
        disabled={Boolean(odemeEngeli)}
      >
        {kapanis.ad}
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
        {talep.makine?.serial && <Makine makine={talep.makine} />}

        {/* Kimlik değil okunur karşılık: ekranda "sorunlu" yazıyordu. */}
        {talep.durum && (
          <Satir ad="Makinenin Durumu" deger={makineDurumAdi(talep.durum)} />
        )}
        {talep.belirtiler?.length > 0 && (
          <Satir ad="Belirtiler" deger={talep.belirtiler.join(', ')} />
        )}
        {talep.parcalar?.length > 0 && (
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

      {/* RANDEVU ALINMIŞ TALEP AYNI EKRANI GÖSTERMEMELİ.

          Randevu verildikten sonra talep servis tarafında yine "bekleyen"
          listesinde duruyor (doğrusu da bu, iş bitmedi) ama detayı yeni
          gelmiş bir taleple birebir aynı görünüyordu: servis randevu
          verdiğini unutup ikinci kez veriyordu. */}
      {/* Ödemenin durumu servisin de bilmesi gereken bilgi: parçayı
          hazırlamaya başlayıp başlamayacağına buna bakarak karar
          veriyor. */}
      {talep.tur === 'parca' && !kapali && talep.fatura && (
        <div className={'not ' + (talep.odemeOnay ? 'not--yesil' : 'not--turuncu')}>
          <IconCheckCircle size={19} />
          <div>
            <strong>
              {talep.odemeOnay
                ? 'Ödeme onaylandı'
                : 'Ödeme onayı bekleniyor'}
            </strong>
            <p>
              {talep.odemeOnay
                ? 'Parçayı hazırlayıp kargoya verebilirsiniz.'
                : `${MARKA} dekontu kontrol ediyor. Onaylanmadan parçayı göndermeyin.`}
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

      {kapali && (
        <div className="not not--yesil">
          <IconCheckCircle size={19} />
          <div>
            <strong>Bu talep tamamlandı.</strong>
          </div>
        </div>
      )}

      {/* Kapanış kaydı: servis aylar sonra "Burada ne yapmıştık?" diye
          baktığında cevap burada. Alanlar backoffice'in kendi kapanış
          formuyla aynı; müşteri de bunları kendi uygulamasında
          okuyor. */}
      {kapali && talep.cozum && (
        <div className="kart" style={{ padding: 16 }}>
          <Satir ad="Yapılan İş" deger={talep.cozum.yapilanIs} />
          <Satir ad="Değişen Parça" deger={talep.cozum.parcalar} />
          <Satir ad="Ücret" deger={talep.cozum.ucret} />
          <Satir ad="Garanti Talebi" deger={talep.cozum.garantiNo} />
          <Satir ad="Sonuç" deger={talep.cozum.sonuc} />
          <Satir ad="Satış Fiyatı" deger={talep.cozum.satisFiyati} />
          <Satir ad="Not" deger={talep.cozum.not} />
        </div>
      )}

      {islemVar && (
        <div className="secenek">
          {talep.tur === 'servis' && (
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
      {pencere === 'gonderdim' && (
        <Kapanis
          talep={talep}
          servisAd={servisAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {pencere === 'not' && (
        <Not
          talep={talep}
          servisAd={servisAd}
          onKapat={() => setPencere(null)}
          onBitti={onKapat}
        />
      )}
      {pencere === 'destek' && (
        <Destek onKapat={() => setPencere(null)} onGonder={onDestekIste} />
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

      <Satir ad="Garanti Durumu" deger={KAPI[k.kapi]} />
      <Satir ad="Yapılan İş" deger={k.yapilanIs} />
      <Satir ad="Sonuç" deger={k.sonuc} />
      <Satir ad="Değişen Parça" deger={parcaYazisi(k.parcalar)} />
      <Satir ad="Parçanın Durumu" deger={k.parcaDurumu} />
      <Satir ad="Gidilen Yol" deger={k.km ? k.km + ' km' : ''} />
      <Satir
        ad="İşçilik"
        deger={k.iscilik ? paraYaz(k.iscilik) + ' ' + PARA_BIRIMI : ''}
      />

      {h && (
        <>
          <Satir
            ad="Hak Ediş"
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

   Geriye işin kendisi kaldı: hangi parça, kaç adet. */
function ParcaDurumu({ talep }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="kucuk sonuk">İstenen Parçalar</div>
      {talep.parcalar.map((ad) => {
        const istenen = Number(talep.parcaAdet?.[ad]) || 1
        return (
          <div key={ad} className="satir" style={{ gap: 8, alignItems: 'baseline' }}>
            <span>
              {ad}
              {istenen > 1 && <span className="kucuk sonuk"> × {istenen}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* Pencere kabuğu; backoffice'teki Form kalıbının aynısı. */
function Pencere({ baslik, children, onKapat }) {
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
        <input className="gir" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
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

/* Yedek parça talebinin kapanışı. Servis işi bu pencereden çıktı;
   burada yapılan iş bir onarım değil, bir gönderim. */
function Kapanis({ talep, servisAd, onKapat, onBitti }) {
  const [ozet, setOzet] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (ozet.trim().length < 3) return setHata('Ne gönderdiğinizi yazın.')
    /* ORTAK ALANA DA YAZILIYOR.

       Burası yalnız `ozet` alanına yazıyordu. `ozet` işlem kaydına giden
       satır; talebi OKUYAN iki ekran ona bakmıyor. Backoffice
       `yapilanIs` alanını okuyor (bkz. Talepler.jsx →
       KAPANIS_ALANLARI.parca), müşteri uygulaması da aynı alanı
       (bkz. screens/RequestDetail.jsx). Sonuç: servis kargo takip
       numarasını yazıyordu ve iki tarafta da boş bir kutu görünüyordu.

       Aynı metin iki alana yazılıyor: `yapilanIs` okunan alan,
       `ozet` işlem kaydının satırı. */
    const yazi = ozet.trim()
    talepKapat(talep, { yapilanIs: yazi, ozet: yazi }, servisAd)
    onBitti()
  }

  return (
    <Pencere baslik="Parçayı Gönderdim" onKapat={onKapat}>
      <label className="alan">
        <span className="alan__ad">Ne Gönderdiniz?</span>
        <textarea
          className="gir"
          rows={3}
          value={ozet}
          onChange={(e) => setOzet(e.target.value)}
          placeholder="Örnek: 2 adet düğüm bıçağı kargoya verildi"
        />
      </label>
      {hata && <div className="uyari">{hata}</div>}
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
    talepNotEkle(talep, metin.trim(), servisAd)
    onBitti()
  }

  return (
    <Pencere baslik="Not Ekle" onKapat={onKapat}>
      <p className="kucuk sonuk" style={{ marginTop: 0 }}>
        Bu not müşteriye gönderilmez; talep kaydında saklanır.
      </p>
      <label className="alan">
        <span className="alan__ad">Not</span>
        <textarea className="gir" rows={3} value={metin} onChange={(e) => setMetin(e.target.value)} />
      </label>
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
      <label className="alan">
        <span className="alan__ad">Neden Destek İstiyorsunuz?</span>
        <textarea
          className="gir"
          rows={3}
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          placeholder="Örnek: Sorunu yerinde göremedik, elektronik arıza olabilir"
        />
      </label>
      {hata && <div className="uyari">{hata}</div>}
      <div className="satir">
        <button
          className="dg dg--ana"
          onClick={() => {
            if (neden.trim().length < 3) return setHata('Kısaca sebebini yazın.')
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
