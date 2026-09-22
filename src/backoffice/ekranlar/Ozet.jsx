import { useState } from 'react'
import {
  geriBildirimGetir, izinli, KAPALI_DURUMLAR, islemKaydiGetir, makineKayitlariGetir,
  numaraTalepleriGetir, rolBilgi, rolunTalepleri, rolunTurleri, talepleriGetir, teklifBekliyorMu,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme } from './ortak'
import { SutunGrafik } from './grafik'
import { BOS_ARALIK, Secim } from './suzgec'
import { markaEk } from '../../marka'
import { servisiAtanmamisKayitlar } from '../../lib/servisAtama'
import {
  bekledigiYer, bizdeGecikmisMi, bizdeMi, odemeOnayiBekliyorMu, parcaHazirliktaMi,
  servisteGecikmisMi,
} from '../bekleyenIs'
import { kapanisOlayi, paraKutu } from './rapor/hesap'
import { BOLUMLER } from './rapor/bolumler'
import { bolumuHesapla, raporVerisiOku } from './Raporlar'

/* ==========================================================================
   Dashboard — personelin açılış ekranı

   BAŞTAN KURULDU (22 Eylül 2026, kullanıcının isteği): "Dashboard
   ekranında hızlı erişim bilgileri çok kalabalıklaştı ve çok
   karmaşıklaştı. Bu ekran özet ama yararlı bilgiler içeren bir ekran
   olmalıydı. Tamamen en baştan oluşturma yetkisi veriyorum."

   Önceki hâli: on dört sayı kutusu (on tanesi tek satırda, etiketleri üç
   satıra sarıyordu), iki ölçü kartı, altı grafik ve bir servis tablosu.
   Kutuların çoğu sıfırken de yer kaplıyordu; grafiklerin dördü ("Talep
   Türü", "Talep durum dağılımı", iller, makineler) tüm zamanlara bakan,
   bugün yapılacak işle ilgisi olmayan rapor malzemesiydi ve dördü de
   Raporlar'da zaten var (Genel Bakış, Müşteriler ve Bölgeler, Ürün
   Kalitesi).

   ŞİMDİ EKRAN ÜÇ SORUYU CEVAPLIYOR, YUKARIDAN AŞAĞIYA:

     1  NE KADAR İŞ GELİYOR, NE KADARI BİTİYOR?  dört ölçü: bugün gelen,
        bu hafta gelen, bu hafta kapanan (ikisi geçen haftayla), aynı
        gün açılan talep oranı.
     2  BENİ NE BEKLİYOR?  "Bekleyen İşler" listesi. Yalnız sıfırdan
        büyük satırlar çıkıyor, en acili üstte; her satır kendi listesini
        açıyor. İki grup: topun PAKSAN'da olduğu işler ve başkasında
        bekleyip takip edilecekler. Hiç iş yoksa liste bunu söylüyor.
     3  AÇIK İŞLER KİMDE?  tek çubuk: PAKSAN'da, serviste, müşteride.
        Eski "Bizde bekleme süresi" kartının yaş dağılımı, PAKSAN'da
        satırının altındaki "48 saati geçti" sayısına indi.

   Altta dönem seçilebilen gelen talep grafiği ve yalnız yöneticide son
   30 günün özeti. Servis karnesi tablosu kaldırıldı: tamamı Raporlar →
   Servis Ağı'nda, özet bloğunun başlığı oraya gidiyor.

   Tasarım gerekçesi: yardım masası panolarının ortak düzeni — üstte
   çözülmemiş / gecikmiş / atanmamış iş, az sayıda ölçü, her rol kendi
   kuyruğunu görüyor, gerisi raporlarda (Freshdesk, Zoho Desk, Desk365
   örnekleri, 22 Eylül 2026'da incelendi).

   HESAPLAR ORTAK. Kuyruk kuralları bekleyenIs.js'te (Talepler'in
   süzgeçleri ve Raporlar'ın "Dikkat isteyenler" satırı aynı kuralı
   okuyor): satırdaki sayı, tıklayınca açılan listenin kayıt sayısıyla
   aynı. Kapanan talep Raporlar'daki gibi kapandığı güne göre sayılıyor
   (rapor/hesap.js → kapanisOlayi).

   Hepsi girenin rolüne göre süzülüyor: servis masası yalnız servis
   taleplerinin sayılarını ve kuyruğunu görüyor, yönetici hepsini.
   ========================================================================== */

const GUN = 86400000

/* Günlük grafiğin kaç günü göstereceği — kullanıcı seçiyor */
const PENCERELER = [
  { deger: '7', ad: 'Son 7 gün' },
  { deger: '14', ad: 'Son 14 gün' },
  { deger: '30', ad: 'Son 30 gün' },
  { deger: '90', ad: 'Son 90 gün' },
]

/* "Kimde" çubuğunun renkleri. PAKSAN marka mavisi; öteki ikisi ondan ve
   birbirinden ayrışan, iki temada da token'ı olan tonlar. */
const YER_RENK = {
  bizde: 'var(--mavi)',
  serviste: 'var(--turkuaz)',
  musteride: 'var(--mor)',
}

export function Ozet({ rol, git, surum }) {
  const [pencere, setPencere] = useState('14')

  /* Yönetici gözü (yetkiye bağlı, rol kimliğine değil: Roller ekranından
     açılan yeni bir yönetici rolü de görsün). */
  const yonetim = izinli(rol, 'yonetimOzeti')

  /* Rol bu talep türünü görüyor mu? Kuyruk satırları yalnız o türün
     masasındaki personele çıkıyor: satışçı onay bekleyen hak edişi,
     servis masası ödeme onayını görmüyor. */
  const turler = rolunTurleri(rol)
  const gorur = (tur) => !turler || turler.includes(tur)

  const { veri: v, yukleniyor } = useVeri(() => hesapla(rol, Number(pencere)), [surum, rol, pencere], null)

  /* Yönetim özeti: Raporlar'ın bölümleri "Son 30 gün" için. */
  const { veri: ozet } = useVeri(() => (yonetim ? yonetimOzetiHesapla(git) : null), [surum, yonetim], null)

  if (yukleniyor || !v) {
    return (
      <>
        <Baslik ad={'Dashboard · ' + rolBilgi(rol).ad} />
        <Bekleme satir={6} />
      </>
    )
  }

  const talepler = (durum) => () => git('talepler', { durum })

  /* Bekleyen işler, aciliyet sırasıyla. `goster` rolün o işi görüp
     görmediği; sıfır olan satır listeye girmiyor. */
  const bizdekiler = [
    /* Kırmızı yalnız iki satırda: top bizde ve 48 saati geçti; makinenin
       servisi yok, sahibi talep açamıyor. İkisinde de bekleyen PAKSAN'ın
       bir adımı. */
    { ad: 'Bizde 48 saati geçen talep', sayi: v.bizdeGeciken, dikkat: true, ac: talepler('bizdeGeciken') },
    {
      ad: 'Servisi atanmamış makine',
      sayi: v.servissiz,
      dikkat: true,
      /* Atamayı yapabilen ve o ekranı görebilen rolde — menüdeki Kayıtlı
         Makineler sayacının aynısı. */
      goster: izinli(rol, 'servisDuzenle') && izinli(rol, 'makineler'),
      ac: () => git('makineler', { atanmamis: true }),
    },
    { ad: 'Açılmamış talep', sayi: v.yeni, ac: talepler('yeni') },
    {
      ad: 'Onay bekleyen hak ediş',
      sayi: v.onayda,
      alt: paraKutu(v.onaydaTutar),
      goster: gorur('servis'),
      ac: talepler('onayBekliyor'),
    },
    { ad: 'Parça hazırlığı bekleyen talep', sayi: v.parcaHazirlik, goster: gorur('parca'), ac: talepler('parcaHazirlik') },
    { ad: 'Ödeme onayı bekleyen talep', sayi: v.odemeBekleyen, goster: gorur('parca'), ac: talepler('odemeBekleyen') },
    { ad: 'Numara değişikliği talebi', sayi: v.numara, goster: izinli(rol, 'numara'), ac: () => git('numara') },
    { ad: 'Okunmamış geri bildirim', sayi: v.gorus, goster: izinli(rol, 'geribildirim'), ac: () => git('geribildirim') },
  ]
  const takiptekiler = [
    /* Teklif verildi, müşteri dönmedi: satış arayıp soruyor. */
    { ad: 'Cevap beklenen teklif', sayi: v.teklifBekleyen, goster: gorur('satinalma'), ac: talepler('teklifBekleyen') },
    /* Servise düştü, servis 48 saattir el sürmedi: PAKSAN servisi arıyor. */
    { ad: 'Serviste geciken talep', sayi: v.servisteGeciken, goster: gorur('servis'), ac: talepler('servisteGeciken') },
  ]
  const suz = (l) => l.filter((s) => s.goster !== false && s.sayi > 0)

  return (
    <>
      <Baslik ad={'Dashboard · ' + rolBilgi(rol).ad} />

      {/* ------------------------------------------------------- Ölçüler */}
      <div className="olculer">
        <Olcu
          ad="Bugün Gelen"
          deger={v.bugun}
          onClick={() => git('talepler', { durum: 'hepsi', aralik: { ...BOS_ARALIK, tur: 'bugun' } })}
        />
        {/* Yüzde yerine geçen haftanın adedi: geçen hafta az talep gelince
            yüzde anlamsız büyüyordu (ekranda "▲ %814"). */}
        <Olcu ad="Bu Hafta Gelen" deger={v.buHafta} alt={`Geçen hafta ${v.gecenHafta}`} />
        {/* Gelenin karşısında biten: ikisi yan yana durunca iş birikiyor
            mu, eriyor mu tek bakışta görünüyor. */}
        <Olcu ad="Bu Hafta Kapanan" deger={v.buHaftaKapanan} alt={`Geçen hafta ${v.gecenHaftaKapanan}`} />
        {/* Gelen talebe AYNI GÜN dokunuluyor mu? (bkz. ayniGunOrani) */}
        <Olcu
          ad="Aynı gün açılan talep oranı"
          deger={v.ayniGun === null ? '—' : `%${v.ayniGun}`}
          alt={v.ayniGunGun ? `${v.ayniGunGun} çalışılan gün ortalaması` : 'Henüz yeterli veri yok'}
        />
      </div>

      <div className="ozet-izgara">
        {/* ------------------------------------------------ Bekleyen işler */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Bekleyen İşler</h2>
          </div>
          <div className="kart__ic">
            <BekleyenIsler gruplar={[
              { ad: 'Sizi bekleyenler', satirlar: suz(bizdekiler) },
              { ad: 'Takip edilecekler', satirlar: suz(takiptekiler) },
            ]} />
          </div>
        </div>

        {/* --------------------------------------------- Açık talepler kimde */}
        <Kimde v={v} git={git} raporVar={izinli(rol, 'raporlar')} />
      </div>

      {/* --------------------------------------------------- Gelen talep */}
      <div className="kart">
        <div className="kart__tepe">
          <h2 className="baslik--buyuk">Gelen talep</h2>
          <div style={{ marginLeft: 'auto' }}>
            <Secim ad="Dönem" deger={pencere} onDegis={setPencere} secenekler={PENCERELER} genislik={140} />
          </div>
        </div>
        <div className="kart__ic">
          <SutunGrafik
            veri={v.gunluk}
            onSec={(g) => git('talepler', { durum: 'hepsi', aralik: { tur: 'ozel', bas: g.iso, bit: g.iso } })}
          />
          <div className="kucuk sonuk" style={{ marginTop: 10 }}>
            Toplam {v.gunluk.reduce((t, g) => t + g.deger, 0)} talep · en yoğun gün{' '}
            {v.enYogun.etiket} ({v.enYogun.deger})
          </div>
        </div>
      </div>

      {ozet && <YonetimOzeti ozet={ozet} />}
    </>
  )
}

/* ------------------------------------------------------------ Parçalar */

/* Ölçü kartı. Tıklanabilirse düğme, değilse düz kart. */
function Olcu({ ad, deger, alt, onClick }) {
  const ic = (
    <>
      <div className="deger__ad">{ad}</div>
      <div className="deger__v">{deger}</div>
      {alt && <div className="deger__alt">{alt}</div>}
    </>
  )
  return onClick ? (
    <button type="button" className="deger" onClick={onClick}>{ic}</button>
  ) : (
    <div className="deger">{ic}</div>
  )
}

/* Sayı + ad + ok. Satırın tamamı düğme: listesini açıyor. Grup boşsa
   başlığı da çizilmiyor; hiçbir grupta iş yoksa boş durum. */
function BekleyenIsler({ gruplar }) {
  const dolu = gruplar.filter((g) => g.satirlar.length)
  if (!dolu.length) {
    return (
      <div className="is-liste__bos">
        <b>Bekleyen iş yok</b>
        <span>Yeni bir iş geldiğinde burada görünür.</span>
      </div>
    )
  }
  return (
    <div className="is-liste">
      {dolu.map((g) => (
        <div className="is-liste__grup" key={g.ad}>
          <div className="is-liste__baslik">{g.ad}</div>
          {g.satirlar.map((s) => (
            <button
              type="button"
              key={s.ad}
              className={'is-satir' + (s.dikkat ? ' is-satir--dikkat' : '')}
              onClick={s.ac}
            >
              <span className="is-satir__sayi">{s.sayi}</span>
              <span className="is-satir__ad">{s.ad}</span>
              {s.alt && <span className="is-satir__alt">{s.alt}</span>}
              <span className="is-satir__ok" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/* Açık talepler kimde bekliyor: PAKSAN'da, serviste, müşteride.
   Raporlar → Genel Bakış'taki "Açık talepler nerede bekliyor?" kartının
   üç grupluk özeti; kural aynı (bkz. bekleyenIs.js → bekledigiYer).
   Satırlar liste açmıyor: Talepler'in süzgeçleri bu gruplamayı
   bilmiyor ve yakın bir süzgeç farklı kayıt sayısı gösterirdi. Ayrıntı
   raporda. */
function Kimde({ v, git, raporVar }) {
  const satirlar = [
    {
      id: 'bizde',
      ad: markaEk('da'),
      deger: v.bizde,
      alt: v.bizdeGeciken ? `${v.bizdeGeciken} tanesi 48 saati geçti` : '',
      dikkat: true,
    },
    {
      id: 'serviste',
      ad: 'Serviste',
      deger: v.serviste,
      alt: v.servisteGeciken ? `${v.servisteGeciken} tanesi gecikiyor` : '',
    },
    { id: 'musteride', ad: 'Müşteri yanıtı bekleyen', deger: v.musteride },
  ]
  const toplam = v.bizde + v.serviste + v.musteride

  return (
    <div className="kart kimde">
      <div className="kart__tepe">
        <h2>Açık talepler kimde?</h2>
        <button
          type="button"
          className="kimde__toplam"
          onClick={() => git('talepler', { durum: 'acik' })}
        >
          {`${v.acik} açık talep`}
        </button>
      </div>
      <div className="kart__ic">
        {toplam > 0 && (
          <div className="yigin kimde__cubuk" aria-hidden="true">
            {satirlar
              .filter((s) => s.deger > 0)
              .map((s) => (
                <span
                  key={s.id}
                  className="yigin__parca"
                  style={{ width: `${(s.deger / toplam) * 100}%`, background: YER_RENK[s.id] }}
                />
              ))}
          </div>
        )}
        {satirlar.map((s) => (
          <div className="kimde__satir" key={s.id}>
            <span className="kimde__nokta" style={{ background: YER_RENK[s.id] }} />
            <span className="kimde__ad">
              {s.ad}
              {s.alt && (
                <span className={'kimde__alt' + (s.dikkat ? ' kimde__alt--dikkat' : '')}>{s.alt}</span>
              )}
            </span>
            <span className="kimde__v">{s.deger}</span>
          </div>
        ))}
        {raporVar && (
          <button type="button" className="kimde__bag" onClick={() => git('raporlar', { bolum: 'genel' })}>
            Raporlarda Ayrıntıları Gör
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Hesaplama */

function hesapla(rol, gunSayisi) {
  const talepler = rolunTalepleri(talepleriGetir(), rol)
  const simdi = Date.now()
  const bugunBasi = new Date().setHours(0, 0, 0, 0)
  const acikOlanlar = talepler.filter((t) => !KAPALI_DURUMLAR.includes(t.status || 'yeni'))

  /* Seçilen dönemin günlük dağılımı */
  const gunluk = []
  for (let i = gunSayisi - 1; i >= 0; i--) {
    const gunBas = bugunBasi - i * GUN
    const d = new Date(gunBas)
    gunluk.push({
      etiket: `${d.getDate()}.${d.getMonth() + 1}`,
      tamEtiket: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
      /* Grafikten tıklanınca tarih süzgecine verilecek biçim */
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      deger: talepler.filter((t) => t.createdAt >= gunBas && t.createdAt < gunBas + GUN).length,
    })
  }
  const enYogun = gunluk.reduce((a, b) => (b.deger > a.deger ? b : a), gunluk[0])

  /* Hafta karşılaştırması: son yedi gün ve ondan önceki yedi gün. */
  const buHaftada = (z) => z >= simdi - 7 * GUN
  const gecenHaftada = (z) => z >= simdi - 14 * GUN && z < simdi - 7 * GUN
  const kapanislar = talepler.map(kapanisOlayi).filter(Boolean)

  /* Kimde. Üç grup bütün açık talepleri kapsıyor (bkz. bekleyenIs.js). */
  const yer = acikOlanlar.map(bekledigiYer)
  const onayda = acikOlanlar.filter((t) => t.status === 'onayBekliyor')

  /* Aynı gün oranı yalnız İLK ADIMI PAKSAN'IN attığı taleplerde: servise
     düşen servis talebine ilk dokunan servis, PAKSAN personeli değil. */
  const ayniGun = ayniGunOrani(talepler.filter(ilkAdimPaksanda), calisilanGunler())

  return {
    bugun: talepler.filter((t) => t.createdAt >= bugunBasi).length,
    buHafta: talepler.filter((t) => buHaftada(t.createdAt)).length,
    gecenHafta: talepler.filter((t) => gecenHaftada(t.createdAt)).length,
    buHaftaKapanan: kapanislar.filter(buHaftada).length,
    gecenHaftaKapanan: kapanislar.filter(gecenHaftada).length,
    ayniGun: ayniGun.oran,
    ayniGunGun: ayniGun.gun,

    /* Bekleyen işler — Talepler'in süzgeçleriyle aynı kural. */
    yeni: talepler.filter((t) => (t.status || 'yeni') === 'yeni').length,
    bizdeGeciken: talepler.filter(bizdeGecikmisMi).length,
    servisteGeciken: talepler.filter(servisteGecikmisMi).length,
    onayda: onayda.length,
    onaydaTutar: onayda.reduce((a, t) => a + (Number(t.hakkedis?.toplam) || 0), 0),
    parcaHazirlik: talepler.filter(parcaHazirliktaMi).length,
    odemeBekleyen: talepler.filter(odemeOnayiBekliyorMu).length,
    servissiz: servisiAtanmamisKayitlar(makineKayitlariGetir()).length,
    /* Teklif verilmiş, müşteri dönmemiş. Kimse yeni bir olay üretmediği
       için bu talepler sessizce unutuluyordu. */
    teklifBekleyen: talepler.filter(teklifBekliyorMu).length,
    gorus: geriBildirimGetir().filter((g) => !g.okundu).length,
    numara: numaraTalepleriGetir().filter((t) => t.durum === 'bekliyor').length,

    acik: acikOlanlar.length,
    bizde: acikOlanlar.filter(bizdeMi).length,
    serviste: yer.filter((y) => y === 'servis' || y === 'yolda').length,
    musteride: yer.filter((y) => y === 'teklif').length,

    gunluk,
    enYogun,
  }
}

/* ==========================================================================
   Aynı gün açılan talep oranı

   SORU: personel gelen talebe aynı gün dokunuyor mu?

   Eski "tamamlanma oranı" bunu ölçmüyordu. Bugün gelen talep henüz
   kapanmadığı için oran her zaman düşük görünüyor, üstelik kapanma
   süresi işin büyüklüğüne bağlı — üç günlük bir tamirat "kötü
   performans" değil. Oysa gelen talebe dokunmamak her zaman kötü.

   HESAP

   Her İŞ GÜNÜ için ayrı oran çıkarılıyor: o gün gelen taleplerin kaçı
   aynı gün içinde "Yeni" durumundan çıkmış. Sonra bu günlük oranların
   ortalaması alınıyor.

   Neden günlük oranların ortalaması, toplam üzerinden tek bir oran
   değil? Çünkü tek oran, çok talep gelen günleri ağırlıklandırır:
   yoğun bir günde herkes koşturur ve oran yükselir, sakin günlerdeki
   ihmal görünmez olur. Personelin günlük alışkanlığını ölçmek
   istiyoruz, o yüzden her gün eşit ağırlıkta.

   DIŞARIDA KALANLAR

     · Hiç talep gelmeyen günler — sıfır bölme, üstelik o gün
       ölçülecek bir şey yok.
     · Personelin backoffice’e hiç girmediği günler — resmî tatil, izin,
       hafta sonu. Hangi günün çalışıldığı takvimden değil işlem
       kaydındaki giriş satırlarından okunuyor (bkz. calisilanGunler).
     · BUGÜN — gün daha bitmedi. Sabah gelen talebe öğleden sonra
       dokunulacak olabilir; yarım günü tam gün gibi saymak her sabah
       oranı düşük gösterirdi.
   ========================================================================== */

function gunBasi(zaman) {
  return new Date(zaman).setHours(0, 0, 0, 0)
}

/** Talep, geldiği gün içinde "Yeni" durumundan çıkmış mı? */
function ayniGunAcildiMi(talep) {
  const ilkDokunus = (talep.gecmis || [])[0]
  if (!ilkDokunus) return false
  return gunBasi(ilkDokunus.tarih) === gunBasi(talep.createdAt)
}

/* Personelin backoffice’e girdiği günler.

   İŞ GÜNÜ TAKVİMDEN DEĞİL, İŞLEM KAYDINDAN OKUNUYOR.

   Önceki hâli hafta içi olan her günü iş günü sayıyordu. Bu iki yönden
   yanlıştı: resmî tatilde ve izinli günlerde kimse backoffice’e bakmıyor ama
   o günler ortalamaya sıfır olarak giriyor, oranı haksız yere
   düşürüyordu. Öte yandan hafta sonu vardiya yapıldığında o günün
   emeği hiç sayılmıyordu.

   İşlem kaydındaki giriş satırları gerçekte çalışılan günleri söylüyor.
   Bayram da, cumartesi vardiyası da doğru yerine oturuyor.

   `oturum` türü hem girişi hem çıkışı kapsıyor; ayıran şey özet
   metni. Metin aranırken yalnız "giriş" kelimesine bakılıyor —
   adlandırma "panel"den "backoffice"e geçtiği için eski kayıtlarda
   "Panele giriş", yenilerde "Backoffice girişi" yazıyor.

   İşlem kaydı son 500 satırla sınırlı; çok eski günler listede
   olmayabilir. Sorun değil — bu ölçü zaten yakın dönemin
   alışkanlığını gösteriyor. */
function calisilanGunler() {
  const gunler = new Set()
  islemKaydiGetir().forEach((k) => {
    if (k.tur !== 'oturum') return
    if (!String(k.ozet || '').includes('giriş')) return
    gunler.add(gunBasi(k.tarih))
  })
  return gunler
}

/**
 * @param {Array} talepler
 * @param {Set<number>} calisilan backoffice’e girilen günlerin başlangıçları
 */
function ayniGunOrani(talepler, calisilan) {
  const bugun = gunBasi(Date.now())
  const gunler = {}
  /* BUGÜNÜN GİRİŞİ SAYILMIYOR. Yalnız bugün giriş kaydı olan yeni bir
     kurulumda (demo, canlıya ilk gün) takvime düşülmüyordu: çalışılan
     gün listesi "bugün"den ibaretti, bugün de hesaba girmediği için
     kutu hep "—" gösteriyordu. Geçmiş günlerden giriş kaydı yoksa
     hafta içi günleri sayılıyor. */
  const gecmisGunler = new Set([...(calisilan || [])].filter((g) => g < bugun))

  talepler.forEach((t) => {
    if (!t.createdAt) return
    const gun = gunBasi(t.createdAt)
    if (gun >= bugun) return /* bugün daha bitmedi */

    /* Personelin backoffice’e girdiği günler sayılıyor. Kayıt hiç yoksa
       (yeni kurulum, demo) takvime düşülüyor: hafta içi sayılıyor,
       hafta sonu sayılmıyor. */
    if (gecmisGunler.size) {
      if (!gecmisGunler.has(gun)) return
    } else {
      const haftaninGunu = new Date(gun).getDay()
      if (haftaninGunu === 0 || haftaninGunu === 6) return
    }

    if (!gunler[gun]) gunler[gun] = { toplam: 0, acilan: 0 }
    gunler[gun].toplam++
    if (ayniGunAcildiMi(t)) gunler[gun].acilan++
  })

  const oranlar = Object.values(gunler).map((g) => g.acilan / g.toplam)
  if (!oranlar.length) return { oran: null, gun: 0 }

  const ortalama = oranlar.reduce((a, b) => a + b, 0) / oranlar.length
  return { oran: Math.round(ortalama * 100), gun: oranlar.length }
}

/* İlk adımı PAKSAN mı atıyor? Servisi olan servis talebi önce servise
   düşüyor (bkz. lib/talepOlustur.js → sahip). */
function ilkAdimPaksanda(t) {
  return !(t.tur === 'servis' && t.servis)
}

/* ==========================================================================
   Yönetim özeti — son 30 gün

   KULLANICININ İSTEĞİ (22 Eylül 2026, Dashboard incelemesinden):
   servislerin karnesi, paranın durumu ve teklif dönüşümü yöneticinin
   açılış ekranında olsun. Aynı gün ekran baştan kurulurken servis
   karnesi TABLOSU çıkarıldı (ekranı kalabalıklaştıran on iki sütunluk
   raporun kırpılmış hâliydi); karnenin tamamı Raporlar → Servis Ağı'nda,
   bloğun başlığı oraya gidiyor.

   HESAP RAPORLARDAN. Ölçüler Raporlar'ın bölümlerinin kendi hesabı:
   özet ayrı bir hesapla yazılsaydı Dashboard ile rapor aynı ölçüye
   farklı rakam verebilirdi. Dönem Raporlar'ın açılış dönemi (son 30
   gün). Ölçüler kimlikleriyle seçiliyor (bölüm dosyalarında `id`),
   sıra numarasıyla değil: bölüme yeni ölçü eklenince özet kaymasın.
   ========================================================================== */

const OZET = [
  { bolum: 'garanti', olculer: ['onaylanan', 'parca'] },
  { bolum: 'servis', olculer: ['tamamlanan', 'ilkKayit', 'yenidenAcilma'] },
  { bolum: 'satis', olculer: ['donusum', 'satis'] },
  { bolum: 'parca', olculer: ['satis', 'garantiSevk'] },
]

function yonetimOzetiHesapla(git) {
  const veri = raporVerisiOku()
  const aralik = { ...BOS_ARALIK, tur: 'gun30' }
  const bloklar = []

  for (const { bolum, olculer } of OZET) {
    const b = BOLUMLER.find((x) => x.id === bolum)
    if (!b) continue
    const sonuc = bolumuHesapla(b, veri, aralik, { git })
    bloklar.push({
      id: b.id,
      ad: b.ad,
      olculer: olculer.map((id) => sonuc.olculer.find((o) => o.id === id)).filter(Boolean),
    })
  }

  return { bloklar, git }
}

function YonetimOzeti({ ozet }) {
  return (
    <div className="kart">
      <div className="kart__tepe">
        <h2>Yönetim Özeti</h2>
        <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
          Son 30 gün
        </span>
      </div>
      <div className="kart__ic">
        <div className="yonetim-ozet">
          {ozet.bloklar.map((b) => (
            <div className="yonetim-ozet__blok" key={b.id}>
              <button
                type="button"
                className="yonetim-ozet__baslik"
                onClick={() => ozet.git('raporlar', { bolum: b.id })}
              >
                {b.ad}
              </button>
              {b.olculer.map((o) => (
                <div className="yonetim-ozet__olcu" key={o.id}>
                  <div className="yonetim-ozet__ad">{o.ad}</div>
                  <div className="yonetim-ozet__v">{o.deger}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
