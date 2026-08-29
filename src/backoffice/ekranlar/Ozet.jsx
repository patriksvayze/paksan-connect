import { useState } from 'react'
import {
  DURUMLAR, durumBilgi, geriBildirimGetir, izinli, KAPALI_DURUMLAR,
  islemKaydiGetir, makineKayitlariGetir, musterileriGetir, numaraTalepleriGetir,
  rolBilgi, rolunTalepleri, TALEP_ADI, talepleriGetir, teklifBekliyorMu,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme } from './ortak'
import { Deger, Halka, RenkAnahtari, SutunGrafik, YatayBar, YiginBar } from './grafik'
import { BOS_ARALIK, Secim } from './suzgec'
import { getProduct } from '../../data/products'

/* Dashboard — yöneticinin monitörü.

   Üstte tek satırda hızlı erişim kutuları, altında grafikler. Hepsi
   girenin rolüne göre süzülüyor: servisçi yalnız servis taleplerinin
   sayılarını görüyor, yönetici hepsini.

   Grafiklerin hepsi gerçekten gelmiş taleplerden hesaplanıyor; uydurma
   sayı yok. Veri yoksa grafik "veri yok" diyor.                       */

const GUN = 86400000

/* Günlük grafiğin kaç günü göstereceği — kullanıcı seçiyor */
const PENCERELER = [
  { deger: '7', ad: 'Son 7 gün' },
  { deger: '14', ad: 'Son 14 gün' },
  { deger: '30', ad: 'Son 30 gün' },
  { deger: '90', ad: 'Son 90 gün' },
]

/* Talep türlerinin rengi — grafiklerin hepsinde aynı renk aynı türü
   gösteriyor ki bir grafikten ötekine bakarken kafa karışmasın. */
const TUR_RENK = {
  servis: 'var(--tur-servis)',
  parca: 'var(--tur-parca)',
  satinalma: 'var(--tur-satis)',
}

export function Ozet({ rol, git, surum }) {
  const [pencere, setPencere] = useState('14')

  /* Yönetici gözü — admin ve yönetici. Şirketin bütününe bakan
     sayılar (müşteri adedi, görüşler, tür dağılımı) yalnız onlarda;
     ekipler kendi işini görüyor. */
  const yonetim = rol === 'admin' || rol === 'yonetici'

  const { veri: v, yukleniyor } = useVeri(
    () => hesapla(rol, Number(pencere)),
    [surum, rol, pencere],
    null
  )

  if (yukleniyor || !v) {
    return (
      <>
        <Baslik ad={'Dashboard · ' + rolBilgi(rol).ad} />
        <Bekleme satir={6} />
      </>
    )
  }

  return (
    <>
      <Baslik ad={'Dashboard · ' + rolBilgi(rol).ad} />

      {/* Hızlı erişim — tek satır, dar ekranda yana kayıyor */}
      <div className="sayilar">
        {/* Kutular Talepler'i kendi süzgeciyle açıyor: "48 saati geçen 17"
            deyip bütün listeyi göstermek işe yaramıyordu. */}
        <Sayi
          deger={v.yeni}
          ad="Açılmamış Talep"
          dikkat={v.yeni > 0}
          onClick={() => git('talepler', { durum: 'yeni' })}
        />
        <Sayi deger={v.acik} ad="Açık Talep" onClick={() => git('talepler', { durum: 'acik' })} />
        <Sayi
          deger={v.bugun}
          ad="Bugün Gelen"
          onClick={() => git('talepler', { durum: 'hepsi', aralik: { ...BOS_ARALIK, tur: 'bugun' } })}
        />
        <Sayi
          deger={v.geciken}
          ad="48 Saati Geçen"
          dikkat={v.geciken > 0}
          onClick={() => git('talepler', { durum: 'gecikmis' })}
        />
        {/* Teklif verildi, müşteri dönmedi. "48 saati geçen"den farklı
            bir iş: orada kimse bakmadı, burada bakıldı ve cevap
            bekleniyor. İkisi ayrı kutuda olmalı. */}
        {/* Bekleyen teklif satış ekibinin işi. Servisçinin ekranında
            hiçbir zaman sayı göstermeyecek bir kutu duruyordu. */}
        {(rol === 'satis' || yonetim) && (
          <Sayi
            deger={v.teklifBekleyen}
            ad="Cevap Beklenen Teklif"
            dikkat={v.teklifBekleyen > 0}
            onClick={() => git('talepler', { durum: 'teklifBekleyen' })}
          />
        )}
        {izinli(rol, 'numara') && (
          <Sayi
            deger={v.numara}
            ad="Numara Talebi"
            dikkat={v.numara > 0}
            onClick={() => git('numara')}
          />
        )}
        {/* Görüşler, müşteri sayısı ve numara talepleri günlük işin
            parçası değil; yöneticinin ve adminin baktığı şeyler.
            Servisçinin ekranında yer kaplayıp asıl işini —
            bekleyen talepleri — aşağı itiyorlardı. */}
        {yonetim && (
          <>
            <Sayi deger={v.gorus} ad="Okunmamış Görüş" onClick={() => git('geribildirim')} />
            <Sayi deger={v.musteri} ad="Müşteri sayısı" onClick={() => git('musteriler')} />
          </>
        )}
        <Sayi deger={v.makine} ad="Kayıtlı makine" onClick={() => git('musteriler')} />
      </div>

      {/* Ölçüler */}
      <div className="olculer">
        <Deger ad="Bu Hafta Gelen" deger={v.buHafta} degisim={v.haftaFark} />
        {/* "Tamamlanma oranı" yerine bu geldi.

            Tamamlanma oranı yanıltıcıydı: bugün gelen talep henüz
            kapanmadığı için oran her zaman düşük görünüyordu ve
            personelin ne kadar çalıştığı hakkında bir şey
            söylemiyordu.

            Buradaki soru şu: gelen talebe AYNI GÜN dokunuluyor mu?
            (bkz. ayniGunOrani) */}
        <Deger
          ad="Aynı gün açılan talep oranı"
          deger={v.ayniGun === null ? '—' : `%${v.ayniGun}`}
          alt={v.ayniGunGun ? `${v.ayniGunGun} çalışılan gün ortalaması` : undefined}
        />
      </div>

      {/* Grafikler */}
      <div className="pano">
        <div className="kart pano__genis">
          <div className="kart__tepe">
            <h2 className="baslik--buyuk">Gelen talep</h2>
            <div style={{ marginLeft: 'auto' }}>
              <Secim
                ad="Dönem"
                deger={pencere}
                onDegis={setPencere}
                secenekler={PENCERELER}
                genislik={140}
              />
            </div>
          </div>
          <div className="kart__ic">
            <SutunGrafik
              veri={v.gunluk}
              onSec={(g) =>
                git('talepler', {
                  durum: 'hepsi',
                  aralik: { tur: 'ozel', bas: g.iso, bit: g.iso },
                })
              }
            />
            <div className="kucuk sonuk" style={{ marginTop: 10 }}>
              Toplam {v.gunluk.reduce((t, g) => t + g.deger, 0)} talep · en yoğun gün{' '}
              {v.enYogun.etiket} ({v.enYogun.deger})
            </div>
          </div>
        </div>

        <div className="kart">
          <div className="kart__tepe">
            <h2>Taleplerin bekleme süreleri</h2>
          </div>
          <div className="kart__ic">
            <YiginBar dilimler={v.yasDagilim} />
          </div>
        </div>

        {/* Tür dağılımı şirketin bütününe bakan bir grafik; ekipler
            zaten tek tür görüyor, onlarda tek dilimli bir halka
            çıkıyordu. */}
        {yonetim && v.turDagilim.length > 1 && (
          <div className="kart">
            <div className="kart__tepe">
              <h2>Talep Türü</h2>
              {/* Bu grafik dönem süzgecine bağlı DEĞİL — kayıtların
                  tamamını gösteriyor. Yandaki "Gelen talep" grafiği
                  seçilen döneme baktığı için ikisi karıştırılabiliyordu;
                  hangi veriye baktığı artık yazıyor. */}
              <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
                Tüm zamanlar · {v.toplam} talep
              </span>
            </div>
            <div className="kart__ic">
              <Halka dilimler={v.turDagilim} toplamAdi="talep" />
            </div>
          </div>
        )}

        <div className="kart">
          <div className="kart__tepe">
            <h2>Talep durum dağılımı</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              Tüm zamanlar
            </span>
          </div>
          <div className="kart__ic">
            <YatayBar satirlar={v.durumDagilim} />
          </div>
        </div>

        <div className="kart">
          <div className="kart__tepe">
            <h2>En Çok Talep Gelen İller</h2>
          </div>
          <div className="kart__ic">
            <YatayBar satirlar={v.iller} />
            {v.turDagilim.length > 1 && <RenkAnahtari ogeler={v.turAnahtari} />}
          </div>
        </div>

        <div className="kart">
          <div className="kart__tepe">
            <h2>En Çok Talep Alan Makineler</h2>
          </div>
          <div className="kart__ic">
            <YatayBar satirlar={v.makineler} />
            {v.turDagilim.length > 1 && <RenkAnahtari ogeler={v.turAnahtari} />}
          </div>
        </div>
      </div>

    </>
  )
}

/* ------------------------------------------------------------ Hesaplama */

function hesapla(rol, gunSayisi) {
  const talepler = rolunTalepleri(talepleriGetir(), rol)
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
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`,
      deger: talepler.filter((t) => t.createdAt >= gunBas && t.createdAt < gunBas + GUN).length,
    })
  }
  const enYogun = gunluk.reduce((a, b) => (b.deger > a.deger ? b : a), gunluk[0])

  /* Hafta karşılaştırması */
  const buHafta = talepler.filter((t) => t.createdAt >= Date.now() - 7 * GUN).length
  const gecenHafta = talepler.filter(
    (t) => t.createdAt >= Date.now() - 14 * GUN && t.createdAt < Date.now() - 7 * GUN
  ).length
  const haftaFark = gecenHafta
    ? Math.round(((buHafta - gecenHafta) / gecenHafta) * 100)
    : undefined

  /* Açık işin yaş dağılımı — grafikte gösteriliyor */
  const saat = (t) => (Date.now() - t.createdAt) / 3600000
  const yasSayac = {
    yesil: acikOlanlar.filter((t) => saat(t) < 24).length,
    sari: acikOlanlar.filter((t) => saat(t) >= 24 && saat(t) < 48).length,
    kirmizi: acikOlanlar.filter((t) => saat(t) >= 48).length,
  }


  const turDagilim = Object.entries(TALEP_ADI)
    .map(([k, ad]) => ({
      ad,
      tur: k,
      deger: talepler.filter((t) => t.tur === k).length,
      renk: TUR_RENK[k],
    }))
    .filter((d) => d.deger > 0)

  const ayniGun = ayniGunOrani(talepler, calisilanGunler())

  return {
    toplam: talepler.length,
    ayniGun: ayniGun.oran,
    ayniGunGun: ayniGun.gun,
    yeni: talepler.filter((t) => (t.status || 'yeni') === 'yeni').length,
    acik: acikOlanlar.length,
    bugun: talepler.filter((t) => t.createdAt >= bugunBasi).length,
    geciken: yasSayac.kirmizi,
    /* Teklif verilmiş, müşteri dönmemiş. Kimse yeni bir olay
       üretmediği için bu talepler sessizce unutuluyordu. */
    teklifBekleyen: talepler.filter(teklifBekliyorMu).length,
    gorus: geriBildirimGetir().filter((g) => !g.okundu).length,
    musteri: musterileriGetir().length,
    numara: numaraTalepleriGetir().filter((t) => t.durum === 'bekliyor').length,
    makine: makineKayitlariGetir().length,
    son: talepler.slice(0, 8),

    gunluk,
    enYogun,
    buHafta,
    haftaFark,
    kapananSayi: talepler.filter((t) => t.status === 'kapandi').length,

    /* Orta dilim SARI, turuncu değil.

       Turuncu ile kırmızı yan yana duran iki çubukta birbirine
       karışıyordu — özellikle projeksiyonda ve renk körlüğünde.
       Sarı ile kırmızı arasında böyle bir sorun yok; trafik ışığı
       mantığı da zaten yeşil-sarı-kırmızı. */
    yasDagilim: [
      { ad: '24 saat içinde', deger: yasSayac.yesil, renk: 'var(--yesil)' },
      { ad: '1-2 gün', deger: yasSayac.sari, renk: 'var(--sari)' },
      { ad: '2 günden eski', deger: yasSayac.kirmizi, renk: 'var(--kirmizi)' },
    ],

    turDagilim,
    turAnahtari: turDagilim.map((d) => ({ ad: d.ad, renk: d.renk })),

    durumDagilim: DURUMLAR.map((d) => ({
      ad: d.ad,
      deger: talepler.filter((t) => (t.status || 'yeni') === d.id).length,
      renk: TON_RENK[durumBilgi(d.id).ton],
    })).filter((d) => d.deger > 0),

    /* İl ve makine sıralamaları türe bölünmüş: hangi ilden ne tür talep
       geldiği tek bakışta görünüyor. */
    iller: turlereBol(talepler, (t) => t.il, 6),
    makineler: turlereBol(
      talepler.filter((t) => t.makine),
      (t) => getProduct(t.makine.productId)?.name,
      5
    ),
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

  talepler.forEach((t) => {
    if (!t.createdAt) return
    const gun = gunBasi(t.createdAt)
    if (gun >= bugun) return /* bugün daha bitmedi */

    /* Personelin backoffice’e girdiği günler sayılıyor. Kayıt hiç yoksa
       (yeni kurulum, demo) takvime düşülüyor: hafta içi sayılıyor,
       hafta sonu sayılmıyor. */
    if (calisilan && calisilan.size) {
      if (!calisilan.has(gun)) return
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

const TON_RENK = {
  kirmizi: 'var(--kirmizi)',
  turuncu: 'var(--turuncu-d)',
  mavi: 'var(--mavi)',
  yesil: 'var(--yesil)',
  gri: 'var(--gri)',
  mor: 'var(--mor)',
  turkuaz: 'var(--turkuaz)',
}

/** En çok geçen N değeri, her biri talep türüne bölünmüş olarak. */
function turlereBol(talepler, anahtar, adet) {
  const kova = {}

  talepler.forEach((t) => {
    const ad = anahtar(t)
    if (!ad) return
    if (!kova[ad]) kova[ad] = { ad, deger: 0, turler: {} }
    kova[ad].deger++
    kova[ad].turler[t.tur] = (kova[ad].turler[t.tur] || 0) + 1
  })

  return Object.values(kova)
    .sort((a, b) => b.deger - a.deger)
    .slice(0, adet)
    .map((k) => ({
      ad: k.ad,
      deger: k.deger,
      parcalar: Object.entries(TALEP_ADI).map(([tur, ad]) => ({
        ad,
        deger: k.turler[tur] || 0,
        renk: TUR_RENK[tur],
      })),
    }))
}

function Sayi({ deger, ad, dikkat, onClick }) {
  return (
    <button className={'sayi' + (dikkat ? ' sayi--dikkat' : '')} onClick={onClick}>
      <div className="sayi__v">{deger}</div>
      <div className="sayi__k">{ad}</div>
    </button>
  )
}
