import { useState } from 'react'
import {
  geriBildirimGetir, iptalIstegiBekliyorMu, izinli, KAPALI_DURUMLAR, makineKayitlariGetir,
  numaraTalepleriGetir, rolBilgi, rolunTalepleri, rolunTurleri, talepleriGetir, teklifBekliyorMu,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme } from './ortak'
import { SutunGrafik } from './grafik'
import { BOS_ARALIK, Secim } from './suzgec'
import { servisiAtanmamisKayitlar } from '../../lib/servisAtama'
import {
  bizdeGecikmisMi, odemeOnayiBekliyorMu, parcaHazirliktaMi,
  servisteGecikmisMi,
} from '../bekleyenIs'
import { kapanisOlayi, paraKutu } from './rapor/hesap'
import { BOLUMLER, HESAP_BOLUMLERI } from './rapor/bolumler'
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
        bu hafta gelen, bu hafta kapanan (ikisi geçen haftayla) ve
        rolün açık talepleri.
     2  BENİ NE BEKLİYOR?  "Bekleyen İşler" listesi. Yalnız sıfırdan
        büyük satırlar çıkıyor, en acili üstte; her satır kendi listesini
        açıyor. İki grup: topun PAKSAN'da olduğu işler ve başkasında
        bekleyip takip edilecekler. Hiç iş yoksa liste bunu söylüyor.

   8 EKİM 2026'DA İKİ ŞEY KALKTI (kullanıcının isteği). "Açık talepler
   kimde?" kartı (PAKSAN'da / serviste / müşteride): rol bazlı ekranda
   anlamı yoktu, yedek parça rolünde "Serviste" satırı hep 0 yazıyordu;
   aynı dağılım Raporlar → Genel Bakış'ta duruyor. "Aynı gün açılan
   talep oranı" yerine rolü ilgilendiren AÇIK TALEPLERİN sayısı geldi;
   kutuya dokununca Talepler o listeyle açılıyor.

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
         Makineler sayacının aynısı. Atama 25 Eylül 2026'dan beri ayrı
         yetki (`makineAtama`; önce `servisDuzenle`). */
      goster: izinli(rol, 'makineAtama') && izinli(rol, 'makineler'),
      ac: () => git('makineler', { atanmamis: true }),
    },
    { ad: 'Açılmamış talep', sayi: v.yeni, ac: talepler('yeni') },
    /* Müşteri işleme alınmış talebi için iptal istedi (8 Ekim 2026);
       kararı rolün masası veriyor. Rolün gördüğü taleplerden sayılıyor. */
    { ad: 'İptal isteği bekleyen talep', sayi: v.iptalIstegi, ac: talepler('iptalIstegi') },
    {
      ad: 'Onay bekleyen hak ediş',
      sayi: v.onayda,
      alt: paraKutu(v.onaydaTutar),
      goster: gorur('servis'),
      ac: talepler('onayBekliyor'),
    },
    /* Garanti parçasını 6 Ekim 2026'dan beri servis birimi gönderiyor
       (veri.js → rolunTalepleri); kutu o masada. */
    { ad: 'Parça hazırlığı bekleyen talep', sayi: v.parcaHazirlik, goster: gorur('servis'), ac: talepler('parcaHazirlik') },
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
        {/* Rolün gördüğü açık talepler (8 Ekim 2026; önce "Aynı gün açılan
            talep oranı" vardı). Sayı Talepler'in "Açık" süzgeciyle aynı. */}
        <Olcu
          ad="Açık Talepler"
          deger={v.acik}
          onClick={() => git('talepler', { durum: 'acik' })}
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

  const onayda = acikOlanlar.filter((t) => t.status === 'onayBekliyor')

  return {
    bugun: talepler.filter((t) => t.createdAt >= bugunBasi).length,
    buHafta: talepler.filter((t) => buHaftada(t.createdAt)).length,
    gecenHafta: talepler.filter((t) => gecenHaftada(t.createdAt)).length,
    buHaftaKapanan: kapanislar.filter(buHaftada).length,
    gecenHaftaKapanan: kapanislar.filter(gecenHaftada).length,

    /* Bekleyen işler — Talepler'in süzgeçleriyle aynı kural. */
    yeni: talepler.filter((t) => (t.status || 'yeni') === 'yeni').length,
    iptalIstegi: talepler.filter(iptalIstegiBekliyorMu).length,
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

    gunluk,
    enYogun,
  }
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
    const b = HESAP_BOLUMLERI.find((x) => x.id === bolum)
    if (!b) continue
    const sonuc = bolumuHesapla(b, veri, aralik, { git })
    bloklar.push({
      id: b.id,
      ad: b.ad,
      /* Sekmesi kaldırılmış bölümün (Satış ve Bayiler, 6 Ekim 2026)
         başlığı Raporlar'a götürmüyor: orada açılacak sekme yok. */
      sekmeVar: BOLUMLER.some((x) => x.id === b.id),
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
              {b.sekmeVar ? (
                <button
                  type="button"
                  className="yonetim-ozet__baslik"
                  onClick={() => ozet.git('raporlar', { bolum: b.id })}
                >
                  {b.ad}
                </button>
              ) : (
                <div className="yonetim-ozet__baslik yonetim-ozet__baslik--duz">{b.ad}</div>
              )}
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
