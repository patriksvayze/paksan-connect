import { useState } from 'react'
import {
  destekOturumlariGetir, DURUMLAR, durumBilgi, gecikmisMi, geriBildirimGetir,
  KAPALI_DURUMLAR, makineKayitlariGetir, musterileriGetir, personelGetir,
  TALEP_ADI, talepleriGetir, teklifBekliyorMu,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, Bekleme, Bos, siraliSatirlar, SiraliBaslik, tarihSaat, tarihYaz,
  useSiralama,
} from './ortak'
import {
  araligiCoz, araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi,
} from './suzgec'
import { cevapsizlar, konular, sorular, yonlendirme } from './DestekKayitlari'
import { DisaAktar } from './aktar'
import { getProduct } from '../../data/products'
import { extractYear, formatSerial } from '../../lib/serial'
import { SIRKET } from '../../config'
import { parcaToplami } from '../../data/parcaFiyat'

/* ==========================================================================
   Raporlar — yönetici ekranı

   ESKİ HÂLİ NEDEN ÇALIŞMIYORDU

   On üç rapor bir açılır listedeydi. Yönetici ekranı açtığında hiçbir
   şey görmüyordu; önce hangi raporu istediğini BİLMESİ, sonra listeden
   bulup seçmesi gerekiyordu. Oysa yöneticinin sorusu "Garanti maliyeti
   raporunu aç" değil, "işler nasıl gidiyor, neye bakmam lazım".

   YENİ DÜZEN — ÜÇ KAT

     1  BU DÖNEM        altı sayı, önceki dönemle karşılaştırmalı.
                        Ekranı açan beş saniyede durumu görüyor.

     2  DİKKAT İSTEYEN  o an müdahale gerektiren şeyler, her biri
                        ilgili listeye tek dokunuşla gidiyor.

     3  RAPORLAR        on üç raporun kartları. Her kartta raporun
                        cevapladığı SORU ve o raporun tek başlık
                        rakamı yazıyor — açmadan önce içinde ne
                        olduğu belli.

   Karta dokununca raporun tablosu tam ekran açılıyor, geri düğmesiyle
   bu ekrana dönülüyor.

   Bu düzen servis masası ve CRM ürünlerinde yerleşmiş olan yöntem:
   özet üstte, istisnalar hemen altında, ayrıntıya özetin üstünden
   tıklanarak iniliyor; raporlar açılır liste yerine adı ve açıklaması
   görünen bir kitaplık.

   RAPORLARIN KENDİSİ DEĞİŞMEDİ. Hesaplamalar, sütunlar, Excel çıktısı
   ve "uydurma sayı yok" kuralı aynı: hesaplanamayan hücre boş kalıyor,
   tahmin yürütülmüyor.
   ========================================================================== */

/* Rapor kitaplığı.

   `soru` alanı raporun adından daha önemli: yönetici rapor adlarını
   ezberlemek zorunda değil, sorusunu tanıyor.

   `oneCikan` o raporun özetindeki hangi sayının kartta görüneceği.
   Adı raporun kendi özetiyle birebir eşleşmeli; eşleşmezse kartta
   rakam çıkmıyor, uydurma bir sayı yazılmıyor. */
const RAPORLAR = [
  {
    deger: 'ozet', ad: 'Dönem özeti', obek: 'Sonuç',
    soru: 'Tür tür ne geldi, ne kapandı, ne kadar sürdü?',
    oneCikan: 'Tamamlanma',
  },
  {
    deger: 'finans', ad: 'Para akışı', obek: 'Sonuç',
    soru: 'Bu dönem ne kadar iş yaptık, hunide ne bekliyor?',
    oneCikan: 'Satışa dönen',
  },
  {
    deger: 'satis', ad: 'Fiyat teklifi sonuçları', obek: 'Sonuç',
    soru: 'Verdiğimiz teklifler ne oldu, hangisi cevap bekliyor?',
    oneCikan: 'Cevap bekleyen',
  },
  {
    deger: 'garanti', ad: 'Garanti maliyeti', obek: 'Sonuç',
    soru: 'Hangi model bize garanti kapsamında kaça mal oluyor?',
    oneCikan: 'Garanti oranı',
  },

  {
    deger: 'gecikme', ad: 'Bekleyen işler', obek: 'Operasyon',
    soru: 'Kimsenin bakmadığı ya da cevap beklenen talepler hangileri?',
    oneCikan: 'Kimsenin bakmadığı',
  },
  {
    deger: 'personel', ad: 'Personel performansı', obek: 'Operasyon',
    soru: 'Kim kaç talebe dokundu, ne kadar sürede kapattı?',
    oneCikan: 'Kapatılan talep',
  },
  {
    deger: 'model', ad: 'Model arıza raporu', obek: 'Operasyon',
    soru: 'Hangi makine daha çok arıza çıkarıyor?',
    oneCikan: 'Talep gelen model',
  },
  {
    deger: 'parca', ad: 'En çok istenen parçalar', obek: 'Operasyon',
    soru: 'Stokta ne bulundurmalıyız?',
    oneCikan: 'Parça talebi',
  },
  {
    deger: 'destek', ad: 'Destek ekranı konuları', obek: 'Operasyon',
    soru: 'Müşteri uygulamada ne arıyor, nerede cevapsız kalıyor?',
    oneCikan: 'Cevapsız kalan soru',
  },

  {
    deger: 'sadakat', ad: 'Müşteri sadakati', obek: 'Büyüme',
    soru: 'En çok hangi müşteri bize geliyor?',
    oneCikan: 'Tekrar oranı',
  },
  {
    deger: 'bolge', ad: 'Bölge dağılımı', obek: 'Büyüme',
    soru: 'Talepler hangi illerden geliyor?',
    oneCikan: 'Talep gelen il',
  },
  {
    deger: 'bayi', ad: 'Bayi raporu', obek: 'Büyüme',
    soru: 'Müşteriler makineyi nereden aldıklarını söylüyor?',
    oneCikan: 'Kayıtlı müşteri',
  },
  {
    deger: 'musteri', ad: 'Müşteri ve makine kayıtları', obek: 'Büyüme',
    soru: 'Bu dönem kaç yeni müşteri, kaç makine kaydı geldi?',
    oneCikan: 'Yeni müşteri',
  },
]

const OBEKLER = [
  { ad: 'Sonuç', alt: 'Para, satış ve tamamlanma' },
  { ad: 'Operasyon', alt: 'İşin akışı ve ekibin yükü' },
  { ad: 'Büyüme', alt: 'Müşteri, bölge ve bayi' },
]

export function Raporlar({ rol, surum, git }) {
  /* `acikRapor` null iken genel bakış, dolu iken o raporun tablosu. */
  const [acikRapor, setAcikRapor] = useState(null)
  const [aralik, setAralik] = useState({ ...BOS_ARALIK, tur: 'gun30' })

  /* Sıralama sütun SIRASINA göre: rapor tabloları hücrelerini hazır
     yazı olarak üretiyor, alan adları yok. Rapor değişince sıralama
     sıfırlanıyor — üçüncü sütun her raporda başka bir şey. */
  const { siralama, cevir } = useSiralama(null, 'artan')

  const { veri, yukleniyor } = useVeri(
    () => ({
      talepler: talepleriGetir(),
      musteriler: musterileriGetir(),
      personel: personelGetir(),
      gorusler: geriBildirimGetir(),
      makineler: makineKayitlariGetir(),
    }),
    [surum],
    null
  )

  if (yukleniyor || !veri) {
    return (
      <>
        <Baslik ad="Raporlar" />
        <Bekleme satir={6} />
      </>
    )
  }

  /* Rapor dönemi: talepler geliş tarihine göre süzülüyor */
  const donem = veri.talepler.filter((t) => araliktaMi(t.createdAt, aralik))

  /* Bir önceki eşit uzunlukta dönem.

     Tek bir sayı "iyi mi kötü mü" sorusunu cevaplamıyor: 42 talep çok
     mu az mı, geçen ayki 61'i görmeden bilinmiyor. */
  const onceki = veri.talepler.filter((t) => oncekiDonemdeMi(t.createdAt, aralik))

  const uret = (ad) => URETICILER[ad](donem, veri, aralik, onceki)

  /* ------------------------------------------------------ Rapor detayı */

  if (acikRapor) {
    const tanim = RAPORLAR.find((r) => r.deger === acikRapor)
    const sonuc = uret(acikRapor)

    return (
      <>
        <Baslik ad={tanim.ad} />

        <SuzgecCubugu>
          <button className="dg dg--kucuk" onClick={() => { setAcikRapor(null); cevir(null) }}>
            ← Bütün raporlar
          </button>
          <TarihAraligi aralik={aralik} onDegis={setAralik} />
          <DisaAktar
            ad={tanim.ad}
            basliklar={sonuc.basliklar}
            satirlar={
              sonuc.toplamSatiri ? [...sonuc.satirlar, sonuc.toplamSatiri] : sonuc.satirlar
            }
            personel={rol}
          />
          <span className="suzgec-cubugu__sayi">{sonuc.satirlar.length} satır</span>
        </SuzgecCubugu>

        <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>{tanim.soru}</p>

        {sonuc.ozet?.length > 0 && <Olculer ozet={sonuc.ozet} />}

        <div className="kart">
          <div className="kart__tepe">
            <h2>{tanim.ad}</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {donem.length} talep incelendi
            </span>
          </div>

          {sonuc.satirlar.length === 0 ? (
            <Bos metin="Bu dönemde gösterilecek kayıt yok." />
          ) : (
            <div className="tablo-sar">
              <table>
                <thead>
                  <tr>
                    {sonuc.basliklar.map((b, i) => (
                      <SiraliBaslik
                        key={b}
                        ad={b}
                        alan={i}
                        siralama={siralama}
                        onSirala={cevir}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {siraliSatirlar(sonuc.satirlar, siralama).map((satir, i) => (
                    <tr key={i}>
                      {satir.map((h, j) => (
                        <td key={j} className={j === 0 ? undefined : 'kucuk'}>{h}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {/* Toplam satırı sıralamaya karışmıyor; her zaman dipte */}
                {sonuc.toplamSatiri && (
                  <tfoot>
                    <tr className="toplam-satir">
                      {sonuc.toplamSatiri.map((h, j) => (
                        <td key={j} className={j === 0 ? undefined : 'kucuk'}>{h}</td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        <p className="kucuk sonuk">{ACIKLAMA[acikRapor]}</p>
      </>
    )
  }

  /* ------------------------------------------------------ Genel bakış */

  const ozetR = uret('ozet')
  const finansR = uret('finans')
  const uyarilar = dikkatIsteyenler(donem, veri, aralik, git)

  /* Kartlarda görünecek başlık rakamları. Her rapor bir kere
     üretiliyor; on üç rapor da hafif, tamamı bellekteki diziler
     üzerinde dönüyor. */
  const kartDegeri = {}
  for (const r of RAPORLAR) {
    if (!r.oneCikan) continue
    const o = uret(r.deger).ozet || []
    const bulunan = o.find((x) => x.ad === r.oneCikan)
    if (bulunan) kartDegeri[r.deger] = bulunan
  }

  return (
    <>
      <Baslik ad="Raporlar" />

      <SuzgecCubugu>
        <TarihAraligi aralik={aralik} onDegis={setAralik} />
        <span className="suzgec-cubugu__sayi">{donem.length} talep</span>
      </SuzgecCubugu>

      {/* 1 — Bu dönem: durum beş saniyede okunuyor */}
      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart__tepe">
          <h2>Bu Dönem</h2>
          <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
            önceki eşit dönemle karşılaştırmalı
          </span>
        </div>
        <div className="kart__ic">
          <Olculer
            ozet={[
              ...(ozetR.ozet || []).slice(0, 4),
              ...(finansR.ozet || []).filter((x) =>
                ['Satışa dönen', 'Hunide bekleyen'].includes(x.ad)
              ),
            ]}
          />
        </div>
      </div>

      {/* 2 — Dikkat isteyenler: yöneticinin asıl işi */}
      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart__tepe">
          <h2>Dikkat İsteyenler</h2>
          <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
            {uyarilar.length ? `${uyarilar.length} başlık` : 'temiz'}
          </span>
        </div>
        <div className="kart__ic">
          {uyarilar.length === 0 ? (
            <p className="kucuk sonuk" style={{ margin: 0 }}>
              Bu dönemde bekleyen, gecikmiş ya da cevapsız kalan bir şey yok.
            </p>
          ) : (
            <div className="uyari-liste">
              {uyarilar.map((u) => (
                <div key={u.ad} className={'uyari-satir uyari-satir--' + u.ton}>
                  <span className="uyari-satir__nokta" />
                  <div style={{ flex: 1 }}>
                    <div className="uyari-satir__ad">{u.ad}</div>
                    <div className="kucuk sonuk">{u.alt}</div>
                  </div>
                  {u.goster && (
                    <button className="dg dg--kucuk" onClick={u.goster}>
                      Göster →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3 — Rapor kitaplığı */}
      {OBEKLER.map((obek) => (
        <div className="kart" key={obek.ad} style={{ marginBottom: 16 }}>
          <div className="kart__tepe">
            <h2>{obek.ad}</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>{obek.alt}</span>
          </div>
          <div className="kart__ic">
            <div className="rapor-izgara">
              {RAPORLAR.filter((r) => r.obek === obek.ad).map((r) => (
                <button
                  key={r.deger}
                  className="rapor-kart"
                  onClick={() => { setAcikRapor(r.deger); cevir(null) }}
                >
                  <div className="rapor-kart__ad">{r.ad}</div>
                  <div className="rapor-kart__soru">{r.soru}</div>
                  {kartDegeri[r.deger] && (
                    <div className="rapor-kart__deger">
                      {kartDegeri[r.deger].deger}
                      <span className="rapor-kart__etiket">{kartDegeri[r.deger].ad}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

/* Ölçü şeridi — hem genel bakışta hem rapor detayında aynı biçim. */
function Olculer({ ozet }) {
  return (
    <div className="olculer">
      {ozet.map((o) => (
        <div className="deger" key={o.ad}>
          <div className="deger__ad">{o.ad}</div>
          <div className="deger__v">{o.deger}</div>
          {/* Bir önceki eşit dönemle fark. Yön okla, büyüklük yüzdeyle.
              Karşılaştırılacak veri yoksa satır hiç çizilmiyor — "%0"
              yazmak yanıltıcı olurdu. */}
          {o.fark !== undefined && o.fark !== null && (
            <div className={'deger__fark ' + (o.fark >= 0 ? 'arti' : 'eksi')}>
              {o.fark >= 0 ? '▲' : '▼'} %{Math.abs(o.fark)}
              <span className="sonuk"> önceki döneme göre</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------- Dikkat isteyenler

   Yöneticinin ekrana bakma sebebi genelde "her şey yolunda mı" değil,
   "neye yetişmem lazım". Burada yalnız BİR ŞEY YAPILMASI GEREKEN
   durumlar var; sayısı sıfır olan başlık listeye hiç girmiyor.

   Her satırın "Göster" düğmesi ilgili ekranı süzgeçli açıyor —
   yönetici raporu okuyup sonra listeyi elle aramıyor.

   SEÇİLEN DÖNEM DE TAŞINIYOR. Taşınmadığında rapor "8 talep" derken
   açılan liste 9 satır gösteriyordu: rapor seçili döneme bakıyor,
   liste ise bütün zamanlara. İki sayının tutmaması, raporun tamamına
   olan güveni götürür. */
function dikkatIsteyenler(donem, veri, aralik, git) {
  const liste = []

  const gecikenler = donem.filter(gecikmisMi)
  if (gecikenler.length) {
    liste.push({
      ad: `${gecikenler.length} talebe 48 saattir kimse bakmadı`,
      alt: 'Açık kaldığı hâlde hiçbir personel dokunmamış talepler',
      ton: 'kirmizi',
      goster: git ? () => git('talepler', { durum: 'gecikmis', aralik }) : null,
    })
  }

  const teklifBekleyen = donem.filter(teklifBekliyorMu)
  if (teklifBekleyen.length) {
    liste.push({
      ad: `${teklifBekleyen.length} teklif müşteri cevabı bekliyor`,
      alt: 'Fiyat verildi, müşteriden dönüş gelmedi',
      ton: 'turuncu',
      goster: git ? () => git('talepler', { durum: 'teklifBekleyen', aralik }) : null,
    })
  }

  /* En çok arıza çıkaran model — imalat tarafının bakması gereken
     tek satır. Yalnız birden çok arızası olan model uyarı sayılıyor;
     tek arıza tesadüf olabilir. */
  const modelSayim = new Map()
  for (const t of donem) {
    if (t.tur !== 'servis' || !t.makine?.productId) continue
    const ad = getProduct(t.makine.productId)?.name || t.makine.productId
    modelSayim.set(ad, (modelSayim.get(ad) || 0) + 1)
  }
  const enCok = [...modelSayim.entries()].sort((a, b) => b[1] - a[1])[0]
  if (enCok && enCok[1] > 1) {
    liste.push({
      ad: `En çok servis isteyen model: ${enCok[0]} (${enCok[1]} talep)`,
      alt: 'Aynı modelde tekrar eden arıza imalata bakmayı gerektirebilir',
      ton: 'mavi',
      goster: null,
    })
  }

  /* Destek ekranında cevapsız kalan sorular: kılavuzda ya da veri
     setinde eksik olan her satır, ileride bir telefon demek. */
  const oturumlar = destekOturumlariGetir().filter((o) => araliktaMi(o.baslangic, aralik))
  /* `cevapsizlar` TEK BİR OTURUM alıyor, dizi değil. Önce diziyle
     çağrılıyordu: `oturum.olaylar` tanımsız kalıyor, fonksiyon her
     zaman boş dönüyordu ve bu uyarı hiçbir zaman çıkamıyordu. */
  const eksikler = oturumlar.reduce((a, o) => a + cevapsizlar(o).length, 0)
  if (eksikler) {
    liste.push({
      ad: `Destek ekranında ${eksikler} soru cevapsız kaldı`,
      alt: 'Müşterinin arayıp bulamadığı arızalar',
      ton: 'turuncu',
      goster: git ? () => git('destek') : null,
    })
  }

  return liste
}

/* --------------------------------------------------------- Yardımcılar */

const SAAT = 3600000

/** Talebe ilk dokunuş ve kapanış süreleri (saat). */
function sureler(t) {
  const gecmis = t.gecmis || []
  const ilk = gecmis[0] ? (gecmis[0].tarih - t.createdAt) / SAAT : null
  const kapanis = gecmis.find((g) => g.durum === 'kapandi')
  return { ilk, kapanis: kapanis ? (kapanis.tarih - t.createdAt) / SAAT : null }
}

function ortalama(dizi) {
  const gecerli = dizi.filter((x) => x !== null && !Number.isNaN(x))
  if (!gecerli.length) return null
  return gecerli.reduce((a, b) => a + b, 0) / gecerli.length
}

function sureYaz(saat) {
  if (saat === null) return '—'
  if (saat < 1) return `${Math.round(saat * 60)} dk`
  if (saat < 48) return `${Math.round(saat)} sa`
  return `${Math.round(saat / 24)} gün`
}

function yuzde(bolum, toplam) {
  if (!toplam) return '—'
  return '%' + Math.round((bolum / toplam) * 100)
}

/* Bir önceki eşit uzunlukta dönem.

   "Son 30 gün" seçiliyse ondan önceki 30 gün. "Tüm zamanlar" veya açık
   uçlu özel aralık seçiliyse karşılaştırılacak bir önceki dönem yok —
   o durumda hiçbir şey karşılaştırılmıyor, uydurma bir taban
   üretmiyoruz. */
function oncekiDonemdeMi(zaman, aralik) {
  const { bas, bit } = araligiCoz(aralik)
  if (!Number.isFinite(bas) || !Number.isFinite(bit) || bas === 0) return false
  const uzunluk = bit - bas
  return zaman >= bas - uzunluk - 1 && zaman < bas
}

/** İki dönem arasındaki yüzde farkı; taban yoksa null. */
function fark(simdi, once) {
  if (!once) return null
  return Math.round(((simdi - once) / once) * 100)
}

/* Para alanlarının okunması.

   Personel bu alanlara her zaman sayı yazmıyor: servis ücretine
   "Garanti kapsamında" yazılabiliyor ve bu doğru bir cevap. Rakam
   içermeyen değer toplama girmiyor, ayrıca sayılıyor — garanti
   kapsamında yapılan iş imalatçı için ayrı bir maliyet kalemi. */
function paraOku(deger) {
  const ham = String(deger ?? '')
  if (!/\d/.test(ham)) return null
  const rakam = ham.replace(/\D/g, '')
  return rakam ? Number(rakam) : null
}

function paraYaz(sayi) {
  if (sayi === null || sayi === undefined || Number.isNaN(sayi)) return '—'
  return String(Math.round(sayi)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function topla(dizi) {
  return dizi.filter((x) => x !== null).reduce((a, b) => a + b, 0)
}

/* Yüzdelik dilim — ortalamanın sakladığı kuyruğu gösteriyor.

   "Ortalama kapanma 19 saat" iyi görünüyor ama taleplerin onda biri
   dokuz gün bekliyorsa o dokuz gün müşteri kaybı demek. Ortalama bunu
   gizliyor, p90 gösteriyor. */
function dilim(dizi, oran) {
  const gecerli = dizi.filter((x) => x !== null && !Number.isNaN(x)).sort((a, b) => a - b)
  if (!gecerli.length) return null
  const i = Math.min(gecerli.length - 1, Math.floor(gecerli.length * oran))
  return gecerli[i]
}

/* Seri numarasından üretim yılı.

   Önce `extractYear` deneniyor; o, seri numarasının başındaki ürün
   önekini tanıyıp hemen ardındaki dört haneyi okuyor. Bazı eski
   numaralarda önek tanınmıyor (SUPER8 / SUPER82 gibi birbirine
   benzeyen önekler) ve yıl okunamıyor.

   Talepler ekranı bu durumda numaranın içindeki ilk 20xx dizisine
   bakıyor; rapor da aynı yolu izliyor. İkisi ayrı davranırsa aynı
   makine bir ekranda "2019", ötekinde "bilinmiyor" görünür. */
function uretimYili(seri) {
  const kesin = extractYear(seri)
  if (kesin) return kesin
  const eslesme = String(seri || '').match(/(20[0-9]{2})/)
  if (!eslesme) return null
  const yil = Number(eslesme[1])
  return yil <= new Date().getFullYear() ? yil : null
}

/* Talep açıldığında makine garanti içinde miydi?

   "Şu an garantide mi" sorusunun cevabı raporu bozar: iki yıl önceki
   bir servis o gün garanti kapsamındaydı, bugün değil. Karşılaştırma
   talebin tarihiyle yapılıyor.

   Yıl okunamazsa null dönüyor ve o talep orana girmiyor — tahmin
   yürütmektense "bilinmiyor" demek doğru. */
function garantiIcindeMiydi(talep) {
  const uretim = uretimYili(talep.makine?.serial)
  if (!uretim) return null
  const talepYili = new Date(talep.createdAt).getFullYear()
  return talepYili - uretim < SIRKET.garantiYil
}

/* ------------------------------------------------------- Rapor üreticileri

   Her üretici { basliklar, satirlar, ozet } döndürüyor. Ekran ve Excel
   aynı veriyi kullanıyor; tabloda ne görünüyorsa dosyaya o iniyor. */

const URETICILER = {
  /* Yöneticinin ilk sorusu: bu dönemde ne geldi, ne kapandı, ne kadar
     sürdü. Tür bazında ayrı ayrı — servisle satışın temposu farklı. */
  ozet(donem, veri, aralik, onceki) {
    const satirlar = Object.entries(TALEP_ADI).map(([tur, ad]) => {
      const liste = donem.filter((t) => t.tur === tur)
      const kapanan = liste.filter((t) => t.status === 'kapandi')
      const acik = liste.filter((t) => !KAPALI_DURUMLAR.includes(t.status || 'yeni'))
      return [
        ad,
        String(liste.length),
        String(kapanan.length),
        String(acik.length),
        String(acik.filter(gecikmisMi).length),
        yuzde(kapanan.length, liste.length),
        sureYaz(ortalama(liste.map((t) => sureler(t).ilk))),
        sureYaz(ortalama(liste.map((t) => sureler(t).kapanis))),
        /* En yavaş onda birin kapanma süresi. Ortalamanın sakladığı
           kuyruk burada görünüyor: ortalama iyiyken müşterilerin
           %10'u haftalarca bekliyor olabilir. */
        sureYaz(dilim(liste.map((t) => sureler(t).kapanis), 0.9)),
      ]
    })

    /* Toplam satırı — tabloyu gözle toplamak zorunda kalmasın.

       `satirlar` içine KONULMUYOR: sütun başlığından sıralama
       yapıldığında toplam satırı listenin ortasına düşerdi. Ayrı
       duruyor, tablonun dibinde sabit. */
    const kapanan = donem.filter((t) => t.status === 'kapandi')
    const acikHepsi = donem.filter((t) => !KAPALI_DURUMLAR.includes(t.status || 'yeni'))
    const toplamSatiri = [
      String(donem.length),
      String(kapanan.length),
      String(acikHepsi.length),
      String(acikHepsi.filter(gecikmisMi).length),
      yuzde(kapanan.length, donem.length),
      sureYaz(ortalama(donem.map((t) => sureler(t).ilk))),
      sureYaz(ortalama(donem.map((t) => sureler(t).kapanis))),
      sureYaz(dilim(donem.map((t) => sureler(t).kapanis), 0.9)),
    ]

    const oncekiKapanan = onceki.filter((t) => t.status === 'kapandi')

    return {
      basliklar: [
        'Talep türü', 'Gelen', 'Kapanan', 'Açık', 'Gecikmiş',
        'Tamamlanma', 'Ort. ilk dokunuş', 'Ort. kapanma', 'En yavaş %10',
      ],
      satirlar,
      toplamSatiri,
      ozet: [
        {
          ad: 'Gelen talep',
          deger: donem.length,
          fark: fark(donem.length, onceki.length),
        },
        {
          ad: 'Kapanan',
          deger: kapanan.length,
          fark: fark(kapanan.length, oncekiKapanan.length),
        },
        { ad: 'Tamamlanma', deger: yuzde(kapanan.length, donem.length) },
        {
          ad: 'Ort. kapanma',
          deger: sureYaz(ortalama(donem.map((t) => sureler(t).kapanis))),
        },
        {
          ad: 'En yavaş %10',
          deger: sureYaz(dilim(donem.map((t) => sureler(t).kapanis), 0.9)),
        },
      ],
    }
  },

  /* ------------------------------------------------------ Para akışı

     YÖNETİCİNİN İLK SORUSU BUYDU VE HİÇBİR RAPORDA CEVABI YOKTU.

     Backoffice tutarları baştan beri topluyordu — kapanışta girilen servis
     ücreti, parça tutarı, verilen teklif — ama hiçbir yerde
     toplanmıyordu. Yönetici "bu ay ne kadar iş yaptık" sorusunu
     backoffice’e soramıyor, Logo'ya bakmak zorunda kalıyordu.

     Burada üç ayrı para var ve karıştırılmamalı:

       HUNİDEKİ   teklif verilmiş, cevabı beklenen tutar. Henüz para
                  değil, ihtimal. Satış ekibinin peşine düşeceği liste.
       KAZANILAN  satışa dönen teklif tutarı.
       TAHSİL     servis ve yedek parçadan kapanışta girilen tutar.

     Garanti kapsamında ücretsiz yapılan iş ayrıca sayılıyor: o bir
     gelir değil, imalat kalitesinin maliyeti. */
  finans(donem, veri, aralik, onceki) {
    const teklifler = donem.filter((t) => t.tur === 'satinalma')
    const hunide = teklifler.filter((t) => (t.status || 'yeni') === 'teklif')
    const kazanilan = teklifler.filter((t) => t.cozum?.sonuc === 'Satış oldu')
    const kaybedilen = teklifler.filter(
      (t) => t.cozum && t.cozum.sonuc && t.cozum.sonuc !== 'Satış oldu'
    )

    const hunideTutar = topla(hunide.map((t) => paraOku(t.teklif?.tutar)))
    const kazanilanTutar = topla(
      kazanilan.map((t) => paraOku(t.cozum?.satisFiyati) ?? paraOku(t.teklif?.tutar))
    )
    const kaybedilenTutar = topla(kaybedilen.map((t) => paraOku(t.teklif?.tutar)))

    const servis = donem.filter((t) => t.tur === 'servis' && t.cozum)
    const servisTutar = topla(servis.map((t) => paraOku(t.cozum?.ucret)))

    /* Yedek parça geliri FİYAT LİSTESİNDEN hesaplanıyor, kapanışta
       elle girilen bir rakamdan değil.

       Müşteri parça bedelini talebin başında, uygulamada gördüğü
       fiyattan ödüyor; kapanışta personele aynı rakamı ikinci kez
       yazdırmanın karşılığı yoktu ve iki kayıt tutunca hangisinin
       doğru olduğu belirsizleşiyordu.

       Yalnız ÖDEMESİ ONAYLANMIŞ talepler sayılıyor: onaylanmamış
       ödeme henüz hesaba geçmemiş para demek. */
    const parca = donem.filter((t) => t.tur === 'parca' && t.odemeOnay)
    const parcaTutar = topla(
      parca.map((t) => parcaToplami(t.parcalar || [], t.parcaAdet || {}).toplam)
    )

    /* Garanti kapsamında yapılan iş: kapanışta tutar yazılmamış ya da
       rakam yerine cümle yazılmış servisler. */
    const garantili = servis.filter((t) => paraOku(t.cozum?.ucret) === null)

    const satirlar = [
      ['Hunideki teklif', String(hunide.length), paraYaz(hunideTutar),
        'Teklif verildi, müşteri cevabı bekleniyor'],
      ['Satışa dönen', String(kazanilan.length), paraYaz(kazanilanTutar),
        'Teklif kapandı, sonuç: satış oldu'],
      ['Kaybedilen', String(kaybedilen.length), paraYaz(kaybedilenTutar),
        'Vazgeçti, rakibe gitti veya ulaşılamadı'],
      ['Servis tahsilatı', String(servis.length - garantili.length), paraYaz(servisTutar),
        'Kapanışta ücret girilen servisler'],
      ['Yedek parça tahsilatı', String(parca.length), paraYaz(parcaTutar),
        'Ödemesi onaylanan parça talepleri, fiyat listesi üzerinden (KDV dâhil)'],
      ['Garanti kapsamında', String(garantili.length), '—',
        'Ücretsiz yapılan servis — imalat kalitesinin maliyeti'],
    ]

    const oncekiKazanilan = topla(
      onceki
        .filter((t) => t.tur === 'satinalma' && t.cozum?.sonuc === 'Satış oldu')
        .map((t) => paraOku(t.cozum?.satisFiyati) ?? paraOku(t.teklif?.tutar))
    )

    return {
      basliklar: ['Kalem', 'Adet', 'Tutar', 'Ne anlama geliyor'],
      satirlar,
      ozet: [
        {
          ad: 'Satışa dönen',
          deger: paraYaz(kazanilanTutar),
          fark: fark(kazanilanTutar, oncekiKazanilan),
        },
        { ad: 'Hunide bekleyen', deger: paraYaz(hunideTutar) },
        { ad: 'Servis + parça', deger: paraYaz(servisTutar + parcaTutar) },
        {
          ad: 'Teklif dönüşümü',
          deger: yuzde(kazanilan.length, kazanilan.length + kaybedilen.length),
        },
        { ad: 'Garantili iş', deger: garantili.length },
      ],
    }
  },

  /* -------------------------------------------------- Garanti maliyeti

     İMALATÇI İÇİN EN PAHALI SATIR BU. Garanti kapsamındaki her servis
     PAKSAN'ın cebinden çıkıyor. Hangi modelde bu oran yüksekse orada
     bir üretim sorunu var ve o sorun her satılan makineyle çarpılarak
     büyüyor.

     Garanti durumu TALEBİN TARİHİNE göre hesaplanıyor, bugüne göre
     değil: iki yıl önceki bir servis o gün garanti kapsamındaydı. */
  garanti(donem) {
    const kova = {}

    donem
      .filter((t) => t.tur === 'servis' && t.makine)
      .forEach((t) => {
        const ad = getProduct(t.makine.productId)?.name || t.makine.productId
        if (!kova[ad]) kova[ad] = { ic: 0, dis: 0, bilinmeyen: 0, makineler: new Set() }
        kova[ad].makineler.add(t.makine.serial)

        const icinde = garantiIcindeMiydi(t)
        if (icinde === null) kova[ad].bilinmeyen++
        else if (icinde) kova[ad].ic++
        else kova[ad].dis++
      })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].ic - a[1].ic)
      .map(([ad, k]) => [
        ad,
        String(k.ic + k.dis + k.bilinmeyen),
        String(k.ic),
        String(k.dis),
        String(k.bilinmeyen),
        yuzde(k.ic, k.ic + k.dis),
        String(k.makineler.size),
        k.makineler.size ? (k.ic / k.makineler.size).toFixed(1).replace('.', ',') : '0',
      ])

    const toplamIc = Object.values(kova).reduce((a, k) => a + k.ic, 0)
    const toplamDis = Object.values(kova).reduce((a, k) => a + k.dis, 0)
    const toplamBilinmeyen = Object.values(kova).reduce((a, k) => a + k.bilinmeyen, 0)

    return {
      basliklar: [
        'Model', 'Servis talebi', 'Garanti içinde', 'Garanti dışında',
        'Yılı okunamadı', 'Garanti oranı', 'Farklı makine',
        'Makine başına garantili servis',
      ],
      satirlar,
      ozet: [
        { ad: 'Garanti içi servis', deger: toplamIc },
        { ad: 'Garanti dışı servis', deger: toplamDis },
        { ad: 'Garanti oranı', deger: yuzde(toplamIc, toplamIc + toplamDis) },
        { ad: 'Yılı okunamayan', deger: toplamBilinmeyen },
      ],
    }
  },

  /* ------------------------------------------------- Müşteri sadakati

     Yeni müşteri bulmak, var olanı elde tutmaktan pahalı. Bu rapor
     "kaç müşterimiz bize ikinci kez döndü" sorusunu cevaplıyor ve
     defalarca gelen müşterileri listeliyor — hem en sadıklar hem de
     makinesi sürekli bozulanlar bu listede. İkisi de aranmayı hak
     ediyor, farklı sebeplerle. */
  sadakat(donem) {
    const kova = {}
    donem.forEach((t) => {
      if (!t.telHam) return
      if (!kova[t.telHam]) {
        kova[t.telHam] = {
          ad: t.ad,
          il: t.il,
          servis: 0,
          parca: 0,
          satis: 0,
          ilk: t.createdAt,
          son: t.createdAt,
          makineler: new Set(),
        }
      }
      const k = kova[t.telHam]
      if (t.tur === 'servis') k.servis++
      if (t.tur === 'parca') k.parca++
      if (t.tur === 'satinalma') k.satis++
      k.ilk = Math.min(k.ilk, t.createdAt)
      k.son = Math.max(k.son, t.createdAt)
      if (t.makine) k.makineler.add(getProduct(t.makine.productId)?.name || t.makine.productId)
    })

    const hepsi = Object.entries(kova).map(([tel, k]) => ({ tel, ...k }))
    const tekrarEden = hepsi.filter((k) => k.servis + k.parca + k.satis > 1)

    const satirlar = hepsi
      .sort((a, b) => b.servis + b.parca + b.satis - (a.servis + a.parca + a.satis))
      .map((k) => [
        k.ad || '—',
        k.tel,
        k.il || '—',
        String(k.servis + k.parca + k.satis),
        String(k.servis),
        String(k.parca),
        String(k.satis),
        [...k.makineler].join(' · ') || '—',
        tarihYaz(k.son, false),
      ])

    return {
      basliklar: [
        'Müşteri', 'Telefon', 'İl', 'Toplam talep', 'Servis', 'Yedek parça',
        'Fiyat teklifi', 'Makineleri', 'Son talebi',
      ],
      satirlar,
      ozet: [
        { ad: 'Talep açan müşteri', deger: hepsi.length },
        { ad: 'Birden çok kez gelen', deger: tekrarEden.length },
        { ad: 'Tekrar oranı', deger: yuzde(tekrarEden.length, hepsi.length) },
        {
          ad: 'Müşteri başına talep',
          deger: hepsi.length
            ? (donem.length / hepsi.length).toFixed(1).replace('.', ',')
            : '—',
        },
      ],
    }
  },

  /* ------------------------------------------- Destek ekranı konuları

     Destek ekranında müşteri ne arıyor. Kayıt uygulamada tutuluyor
     (bkz. src/lib/destekLog.js); burada makine ve konu bazında
     toplanıyor.

     RAPOR DÖNEMİNE TALEPLERDEN AYRI BAKILIYOR: destek oturumu bir
     talep değil, kendi tarihi var.

     "Cevapsız" sütunu bu raporun asıl çıktısı: bilgi tabanının o
     makinede nerede yetersiz kaldığını gösteriyor. */
  destek(donem, veri, aralik) {
    const oturumlar = destekOturumlariGetir().filter((o) =>
      araliktaMi(o.baslangic, aralik)
    )

    const kova = {}
    oturumlar.forEach((o) => {
      const ad = o.urun?.ad || 'Makine seçilmedi'
      if (!kova[ad]) {
        kova[ad] = { oturum: 0, soru: 0, cevapsiz: 0, talep: 0, konular: {} }
      }
      const k = kova[ad]
      k.oturum++
      k.soru += sorular(o).length
      k.cevapsiz += cevapsizlar(o).length
      if (yonlendirme(o)) k.talep++
      konular(o).forEach((c) => {
        k.konular[c] = (k.konular[c] || 0) + 1
      })
    })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].oturum - a[1].oturum)
      .map(([ad, k]) => {
        const enSik = Object.entries(k.konular).sort((a, b) => b[1] - a[1])[0]
        return [
          ad,
          String(k.oturum),
          String(k.soru),
          String(k.cevapsiz),
          String(k.talep),
          yuzde(k.oturum - k.talep, k.oturum),
          enSik ? `${enSik[0]} (${enSik[1]})` : '—',
        ]
      })

    const toplamCevapsiz = oturumlar.reduce((a, o) => a + cevapsizlar(o).length, 0)
    const talepOlan = oturumlar.filter((o) => yonlendirme(o)).length

    return {
      basliklar: [
        'Makine', 'Konuşma', 'Sorulan soru', 'Cevapsız kalan',
        'Talebe dönen', 'Ekranda çözülen', 'En çok konuşulan konu',
      ],
      satirlar,
      ozet: [
        { ad: 'Destek konuşması', deger: oturumlar.length },
        { ad: 'Cevapsız kalan soru', deger: toplamCevapsiz },
        { ad: 'Talebe dönen', deger: talepOlan },
        {
          ad: 'Ekranda çözülen',
          deger: yuzde(oturumlar.length - talepOlan, oturumlar.length),
        },
      ],
    }
  },

  /* Kim ne kadar iş kapatmış. Kaynak: talebin geçmişindeki durum
     değişikliklerini yapan kişi. Not eklemek de iş sayılıyor —
     dokunulan talep, sahiplenilmiş taleptir. */
  personel(donem, veri) {
    const kova = {}
    const ekle = (ad, alan) => {
      if (!ad || ad === '—') return
      if (!kova[ad]) kova[ad] = { dokunma: 0, kapatma: 0, not: 0, sureler: [] }
      kova[ad][alan]++
    }

    donem.forEach((t) => {
      ;(t.gecmis || []).forEach((g) => {
        ekle(g.personel, 'dokunma')
        if (g.durum === 'kapandi') {
          ekle(g.personel, 'kapatma')
          if (kova[g.personel]) kova[g.personel].sureler.push((g.tarih - t.createdAt) / SAAT)
        }
      })
      ;(t.notlar || []).forEach((n) => ekle(n.personel, 'not'))
    })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].kapatma - a[1].kapatma)
      .map(([ad, k]) => {
        const kisi = veri.personel.find((p) => p.ad === ad)
        return [
          ad,
          kisi?.no || '—',
          kisi ? kisi.rol : '—',
          String(k.dokunma),
          String(k.kapatma),
          String(k.not),
          sureYaz(ortalama(k.sureler)),
        ]
      })

    return {
      basliklar: ['Personel', 'No', 'Rol', 'İşlem', 'Kapattığı talep', 'Not', 'Ort. kapanma'],
      satirlar,
      ozet: [
        { ad: 'Çalışan sayısı', deger: satirlar.length },
        { ad: 'Kapatılan talep', deger: donem.filter((t) => t.status === 'kapandi').length },
      ],
    }
  },

  /* İmalatçı için en değerli rapor: hangi model kaç kez arızalanıyor,
     en sık hangi belirtiyle. Ürün geliştirmeye doğrudan girdi. */
  model(donem) {
    const kova = {}
    donem
      .filter((t) => t.makine)
      .forEach((t) => {
        const ad = getProduct(t.makine.productId)?.name || t.makine.productId
        if (!kova[ad]) kova[ad] = { servis: 0, parca: 0, belirti: {}, seriler: new Set() }
        if (t.tur === 'servis') kova[ad].servis++
        if (t.tur === 'parca') kova[ad].parca++
        kova[ad].seriler.add(t.makine.serial)
        ;(t.belirtiler || []).forEach((b) => {
          kova[ad].belirti[b] = (kova[ad].belirti[b] || 0) + 1
        })
      })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].servis + b[1].parca - (a[1].servis + a[1].parca))
      .map(([ad, k]) => {
        const enSik = Object.entries(k.belirti).sort((a, b) => b[1] - a[1])[0]
        return [
          ad,
          String(k.servis + k.parca),
          String(k.servis),
          String(k.parca),
          String(k.seriler.size),
          enSik ? `${enSik[0]} (${enSik[1]})` : '—',
        ]
      })

    return {
      basliklar: [
        'Model', 'Toplam talep', 'Servis', 'Yedek parça',
        'Farklı makine', 'En sık belirti',
      ],
      satirlar,
      ozet: [{ ad: 'Talep gelen model', deger: satirlar.length }],
    }
  },

  /* Stok planlaması: hangi parça ne sıklıkta isteniyor. */
  parca(donem) {
    const kova = {}
    donem
      .filter((t) => t.tur === 'parca')
      .forEach((t) => {
        ;(t.parcalar || []).forEach((p) => {
          if (!kova[p]) kova[p] = { adet: 0, modeller: new Set() }
          kova[p].adet++
          if (t.makine) {
            kova[p].modeller.add(getProduct(t.makine.productId)?.name || t.makine.productId)
          }
        })
      })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].adet - a[1].adet)
      .map(([ad, k]) => [ad, String(k.adet), [...k.modeller].join(' · ') || '—'])

    return {
      basliklar: ['Parça', 'İstenme sayısı', 'Hangi modellerde'],
      satirlar,
      ozet: [
        { ad: 'Parça talebi', deger: donem.filter((t) => t.tur === 'parca').length },
        { ad: 'Farklı parça', deger: satirlar.length },
      ],
    }
  },

  /* Satış hunisi.

     ÖNCEDEN YALNIZ KAPANMIŞ TEKLİFLER LİSTELENİYORDU. Bu, hunideki
     en önemli kalemi — teklif verilmiş, cevabı beklenen işleri —
     görünmez yapıyordu. Bir satış müdürünün ilk bakacağı yer orası.

     Artık teklif verilmiş her talep listede: kapanmışlar sonucuyla,
     bekleyenler kaç gündür beklediğiyle. Uzun süre cevapsız kalan
     satırlar ayrıca işaretli. */
  satis(donem) {
    const teklifler = donem.filter((t) => t.tur === 'satinalma')
    const fiyatVerilen = teklifler.filter((t) => t.teklif)
    const kapanan = teklifler.filter((t) => t.cozum)
    const oldu = kapanan.filter((t) => t.cozum.sonuc === 'Satış oldu')

    const satirlar = fiyatVerilen
      .sort((a, b) => (b.teklif?.tarih || 0) - (a.teklif?.tarih || 0))
      .map((t) => [
        t.no,
        tarihYaz(t.teklif.tarih, false),
        t.ad || '—',
        t.il || '—',
        t.urunId ? getProduct(t.urunId)?.name || t.urunId : '—',
        t.teklif.tutar || '—',
        t.cozum?.sonuc || (teklifBekliyorMu(t) ? 'BEKLİYOR — cevap gecikti' : 'Bekliyor'),
        t.cozum?.satisFiyati || '—',
        t.cozum
          ? sureYaz(sureler(t).kapanis)
          : Math.floor((Date.now() - t.teklif.tarih) / 86400000) + ' gündür',
      ])

    const bekleyenTutar = topla(
      fiyatVerilen
        .filter((t) => !t.cozum)
        .map((t) => paraOku(t.teklif?.tutar))
    )

    return {
      basliklar: [
        'Talep no', 'Teklif tarihi', 'Müşteri', 'İl', 'İlgilendiği ürün',
        'Teklif tutarı', 'Sonuç', 'Satış fiyatı', 'Süre',
      ],
      satirlar,
      ozet: [
        { ad: 'Gelen teklif talebi', deger: teklifler.length },
        { ad: 'Fiyat verilen', deger: fiyatVerilen.length },
        { ad: 'Cevap bekleyen', deger: fiyatVerilen.length - kapanan.length },
        { ad: 'Hunide bekleyen tutar', deger: paraYaz(bekleyenTutar) },
        { ad: 'Dönüşüm', deger: yuzde(oldu.length, kapanan.length) },
      ],
    }
  },

  /* Servis ağı planlaması: hangi ilden ne kadar iş geliyor. */
  bolge(donem) {
    const kova = {}
    donem.forEach((t) => {
      const il = t.il || 'Belirtilmemiş'
      if (!kova[il]) kova[il] = { toplam: 0, servis: 0, parca: 0, satis: 0, musteri: new Set() }
      kova[il].toplam++
      if (t.tur === 'servis') kova[il].servis++
      if (t.tur === 'parca') kova[il].parca++
      if (t.tur === 'satinalma') kova[il].satis++
      if (t.telHam) kova[il].musteri.add(t.telHam)
    })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].toplam - a[1].toplam)
      .map(([il, k]) => [
        il,
        String(k.toplam),
        String(k.servis),
        String(k.parca),
        String(k.satis),
        String(k.musteri.size),
      ])

    return {
      basliklar: ['İl', 'Toplam talep', 'Servis', 'Yedek parça', 'Fiyat teklifi', 'Müşteri'],
      satirlar,
      ozet: [{ ad: 'Talep gelen il', deger: satirlar.length }],
    }
  },

  /* Bayi raporu — müşterinin "makineyi nereden aldım" cevabına dayanıyor.

     ⚠ Bu bir satış rakamı DEĞİL: yalnız uygulamaya kayıt olan
     müşterilerin beyanı. Gerçek satış adedi Logo'daki faturadan gelir. */
  bayi(donem, veri) {
    const kova = {}
    veri.musteriler.forEach((m) => {
      const ad = m.satici || 'Belirtilmemiş'
      if (!kova[ad]) kova[ad] = { musteri: 0, makine: 0, talep: 0, telefonlar: new Set() }
      kova[ad].musteri++
      kova[ad].makine += (m.makineler || []).length
      if (m.tel) kova[ad].telefonlar.add(m.tel)
    })

    donem.forEach((t) => {
      const sahip = veri.musteriler.find((m) => m.tel === t.telHam)
      const ad = sahip?.satici || 'Belirtilmemiş'
      if (kova[ad]) kova[ad].talep++
    })

    const satirlar = Object.entries(kova)
      .sort((a, b) => b[1].musteri - a[1].musteri)
      .map(([ad, k]) => [
        ad,
        String(k.musteri),
        String(k.makine),
        String(k.talep),
        k.musteri ? (k.talep / k.musteri).toFixed(1).replace('.', ',') : '0',
      ])

    return {
      basliklar: [
        'Makinenin alındığı yer', 'Müşteri', 'Kayıtlı makine',
        'Dönemdeki talep', 'Müşteri başına talep',
      ],
      satirlar,
      ozet: [{ ad: 'Kayıtlı müşteri', deger: veri.musteriler.length }],
    }
  },

  /* Bekleyen iş listesi — toplantıda tek tek üzerinden geçmek için.

     İKİ FARKLI BEKLEME VAR ve aynı listede ama ayrı işaretli:

       GECİKMİŞ  48 saati geçmiş, hâlâ kimsenin bakmadığı talep.
                 Bu bizim hatamız.
       TEKLİF    fiyat verilmiş, müşteri haftalardır dönmemiş.
                 Bu müşterinin sessizliği; iş, telefon açmak.

     İkisini ayırmadan tek liste yapmak, satış ekibine "gecikmiş 40
     talebiniz var" demek olurdu ki doğru değil. */
  gecikme(donem) {
    const liste = donem
      .filter((t) => gecikmisMi(t) || teklifBekliyorMu(t))
      .sort((a, b) => a.createdAt - b.createdAt)

    const satirlar = liste.map((t) => [
      t.no,
      TALEP_ADI[t.tur] || t.tur,
      durumBilgi(t.status).ad,
      teklifBekliyorMu(t) ? 'Müşteri cevabı bekleniyor' : 'Kimse bakmadı',
      t.ad || '—',
      t.tel || '—',
      t.il || '—',
      ...tarihSaat(t.createdAt),
      `${Math.floor((Date.now() - t.createdAt) / 86400000)} gün`,
    ])

    const gecikenler = donem.filter(gecikmisMi)
    const teklifBekleyen = donem.filter(teklifBekliyorMu)

    return {
      basliklar: [
        'Talep no', 'Tür', 'Durum', 'Neden bekliyor', 'Müşteri', 'Telefon',
        'İl', 'Tarih', 'Saat', 'Bekleme',
      ],
      satirlar,
      ozet: [
        { ad: 'Kimsenin bakmadığı', deger: gecikenler.length },
        { ad: 'Cevap bekleyen teklif', deger: teklifBekleyen.length },
        {
          ad: 'En eski',
          deger: liste.length
            ? `${Math.floor((Date.now() - liste[0].createdAt) / 86400000)} gün`
            : '—',
        },
      ],
    }
  },

  /* Uygulamanın büyümesi: kim kayıt oldu, hangi makineyi kaydetti. */
  musteri(donem, veri, aralik) {
    const yeniler = veri.musteriler.filter((m) => araliktaMi(m.createdAt, aralik))
    const makineler = veri.makineler.filter((k) => araliktaMi(k.tarih, aralik))

    const satirlar = yeniler.map((m) => [
      m.no || '—',
      m.ad || '—',
      m.tel || '—',
      m.il || '—',
      tarihYaz(m.createdAt, false),
      String((m.makineler || []).length),
      (m.makineler || []).map((x) => formatSerial(x.serial)).join(' · ') || '—',
      m.satici || '—',
    ])

    return {
      basliklar: [
        'Müşteri no', 'Ad soyad', 'Telefon', 'İl', 'Kayıt tarihi',
        'Makine', 'Seri numaraları', 'Aldığı yer',
      ],
      satirlar,
      ozet: [
        { ad: 'Yeni müşteri', deger: yeniler.length },
        { ad: 'Makine kaydı', deger: makineler.length },
        { ad: 'Toplam müşteri', deger: veri.musteriler.length },
      ],
    }
  },
}

const ACIKLAMA = {
  ozet: 'Süreler talebin geçmişinden hesaplanıyor; hiç dokunulmamış talep ortalamaya girmiyor. Yüzde farklar bir önceki eşit uzunluktaki dönemle karşılaştırılıyor; "Tüm zamanlar" seçiliyse karşılaştırma yapılmıyor.',
  finans: 'Teklif ve servis tutarları personelin girdiği rakamlardan, yedek parça tutarı fiyat listesinden geliyor. Bu bir muhasebe kaydı değil — kesin ciro Logo\'daki faturadan okunur. Rakam yerine "Garanti kapsamında" gibi bir cümle yazılan servisler toplama girmiyor, ayrıca sayılıyor.',
  garanti: 'Garanti durumu talebin AÇILDIĞI tarihe göre hesaplanıyor, bugüne göre değil. Seri numarasından üretim yılı okunamayan makineler oran hesabına girmiyor.',
  sadakat: 'Müşteriler telefon numarasına göre tekilleştirildi. Çok talep açan müşteri hem en sadık hem de makinesi en çok bozulan olabilir; ikisi de aranmayı hak ediyor.',
  destek: 'Destek ekranındaki konuşmalardan üretiliyor; talep kayıtlarından bağımsız. "Cevapsız kalan" sütunu bilgi tabanına yazılması gereken soruları gösteriyor — ayrıntısı Destek Kayıtları ekranında.',
  personel: 'Bir talebe birden çok kişi dokunmuşsa her biri kendi satırında sayılıyor.',
  model: 'Yalnız makinesi kayıtlı talepler; fiyat teklifleri bu raporda yok.',
  parca: 'Müşterinin formda seçtiği parça başlıkları sayılıyor.',
  satis: 'Fiyat verilmiş her teklif listede: kapanmışlar sonucuyla, bekleyenler kaç gündür beklediğiyle. Henüz fiyat çalışılmamış talepler bu listede yok.',
  bolge: 'Müşteri sayısı telefon numarasına göre tekilleştirildi.',
  bayi: 'Bu bir satış rakamı değil — müşterinin "makineyi nereden aldım" beyanı. Gerçek satış adedi Logo\'daki faturadan gelir.',
  gecikme: 'İki tür bekleme bir arada: 48 saati geçtiği hâlde kimsenin bakmadığı talepler ve fiyatı verilip müşteri cevabı gelmeyen teklifler. "Neden bekliyor" sütunu ikisini ayırıyor.',
  musteri: 'Kayıt tarihi seçilen aralığa düşen müşteriler.',
}
