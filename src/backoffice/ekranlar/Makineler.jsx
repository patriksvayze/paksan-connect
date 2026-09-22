import { useEffect, useMemo, useState } from 'react'
import {
  durumBilgi, makineKayitlariGetir, talepleriGetir, izinli, makineAtamasiniKaydet, rolunTalepleri,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, siraliListe, SiraliBaslik, tarihSaat, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import {
  getProduct, MARKA, bayileriGetir, servisleriGetir, talebinServisleri, bayininServisleri,
} from '../../marka'
import { extractYear, formatSerial, warrantyStatus, GARANTI_YIL } from '../../lib/serial'
import { kaydinServisi, servisiAtanmamisKayitlar } from '../../lib/servisAtama'

/* ==========================================================================
   Kayıtlı Makineler

   Uygulamaya kaydedilen ve servisin elle açtığı makinelerin tek listesi.
   "Bu seri numarası kimde, hangi bayiden çıktı, kim bakıyor" sorusunun
   cevabı.

   BU EKRAN ARTIK SADECE BAKMIYOR, ATAMA DA YAPIYOR

   Zincirin tamamı buradan geçiyor:

     makine → bayi → bayinin servisi → müşteri

   Müşteri servis talebi açabilmek için bir servise bağlı olmak
   zorunda (bkz. lib/servisAtama.js); o bağ bu ekranda kuruluyor.
   Atama yapılmamış bir makine, sahibinin servis talebi açamaması
   demek — o yüzden listede eksik atama sessizce durmuyor, üstte
   sayılıyor.

   LOGO AÇILDIĞINDA BAYİ KENDİLİĞİNDEN GELECEK: fatura bayiye
   kesiliyor. O güne kadar personel elle giriyor. Servis ataması ise
   LOGO'dan sonra da elle kalacak — hangi servisin hangi müşteriye
   bakacağı ticari bir karar, faturada yazmıyor.

   KAYNAK ALANI ÜÇ DEĞER ALIYOR:

     musteri  müşteri uygulamadan kaydetti
     servis   servis uygulamasından elle açıldı — servis alanı DOLU
     logo     faturadan geldi (LOGO bağlandığında)

   MAKİNENİN GEÇMİŞİ

   Liste bir satırın kim olduğunu söylüyor, pencere başına ne geldiğini:
   makine hangi bayiden çıktı, kime gitti, kaç kez servise girdi, ne
   yapıldı, garantisi sürüyor mu.

   Seri numaraları karşılaştırılırken tire ve boşluk atılıyor: aynı
   makine kayıtta `ORK1270-2024-00157`, talepte `ORK1270202400157`
   olabiliyor.
   ========================================================================== */

const KAYNAK_ADI = {
  musteri: 'Müşteri',
  servis: 'Servis',
  logo: 'Logo',
}

const temiz = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/* Garanti metinleri uygulamadakiyle aynı cümleler (bkz. i18n/tr.js):
   personel ve müşteri aynı makineye baktığında aynı şeyi okumalı.
   Rozet tonu backoffice'in kendi `rz` kalıbından; `garanti` sınıfı
   yalnız servis panelinin CSS'inde var, burada yok. */
const GARANTI_YAZI = {
  bilinmiyor: { ton: 'gri', yaz: () => 'Garanti bilgisi yok' },
  devam: { ton: 'yesil', yaz: (kalan) => `Garanti devam ediyor · ${kalan} yıl` },
  son: { ton: 'turuncu', yaz: () => 'Garantinin son yılı' },
  bitti: { ton: 'gri', yaz: () => 'Garanti süresi doldu' },
}

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

/* Bayi ya da servis atamasını kaydeder.

   ATAMA YALNIZ BU EKRANDAN (21 Eylül 2026, kullanıcının kararı): "Servis
   ataması müşteri bazında değil makine bazında olmalı … her servis her
   makine üzerinde uzman sayılamaz." Aynı gün Müşteriler ekranına da bir
   atama yeri eklenmiş, sonra geri alınmıştı.

   Yazan iş veri katmanında (veri.js → makineAtamasiniKaydet): makinenin
   servisi değişince müşteriye bildirim de oradan gidiyor. Ekranda
   kalsaydı ekosistem sınaması onu çalıştıramazdı. */
function atamayiKaydet(kayit, yama, ozet, { personel, tazele, bildir }) {
  makineAtamasiniKaydet(kayit.id, yama, { ozet, personel })
  tazele()
  bildir(ozet)
}

/* Bir kaydın servisi kim — atanmışsa o, değilse bayisinden geleni.
   Cevap lib/servisAtama.js → kaydinServisi'den: müşterinin uygulaması
   ve yan menüdeki sayı da oradan okuyor, üçü aynı cevabı veriyor. */
const kayitServisi = kaydinServisi

export function Makineler({ personel, rol, bildir, tazele, surum, sorgu }) {
  const duzenleyebilir = izinli(rol, 'servisDuzenle')
  const [ara, setAra] = useState('')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [il, setIl] = useState('hepsi')
  /* İLÇE SÜZGECİ (21 Eylül 2026, kullanıcının isteği). Seçenekleri
     seçili ile göre daralıyor; il değişince ilçe sıfırlanıyor —
     Müşteriler ekranındakiyle aynı davranış. */
  const [ilce, setIlce] = useState('hepsi')
  /* SERVİS SÜZGECİ KALDIRILDI (21 Eylül 2026, kullanıcının kararı:
     "gereksiz"). Belli bir servisin makineleri arama kutusuna servis
     adı yazılarak bulunuyor; tabloda da servis sütunu var.

     SERVİS ATAMASI YAPILMAMIŞ MAKİNELER — ONAY KUTUSU. Önce Servis
     açılır listesinin içinde bir seçenekti ve gözden kaçıyordu; ayrı
     kutu oldu, arama kutusunun solunda. */
  const [atanmamis, setAtanmamis] = useState(false)
  /* Dashboard'un "Servisi Atanmamış Makine" kutusu ekranı bu süzgeçle
     açıyor: kutudaki sayı ile liste aynı olsun. */
  useEffect(() => {
    if (sorgu?.atanmamis) setAtanmamis(true)
  }, [sorgu])
  const [kaynak, setKaynak] = useState('hepsi')
  const [secili, setSecili] = useState(null)

  const { veri: kayitlar, yukleniyor } = useVeri(() => makineKayitlariGetir(), [surum], [])
  /* Rolün görmediği talep türü burada da görünmüyor (22 Eylül 2026,
     kullanıcının kuralı: servis, yedek parça ve satış birbirinin
     talebini görmez). Önce müşteri detayındaki ve makine geçmişindeki
     listeler bütün talepleri gösteriyordu; satır tıklanmasa da içeriği
     okunuyordu. Sayılar da aynı listeden çıkıyor. */
  const { veri: talepler } = useVeri(() => rolunTalepleri(talepleriGetir(), rol), [surum, rol], [])
  const { siralama, cevir } = useSiralama('tarih', 'azalan')

  /* Her kayda bayisi ve servisi yazılıyor; süzgeç, sıralama ve tablo
     hepsi bu türetilmiş alanlara bakıyor. */
  const zenginler = useMemo(() => {
    void surum
    const bayiler = bayileriGetir()
    return kayitlar.map((k) => {
      const bayi = bayiler.find((b) => b.id === k.bayiId) || null
      const bulunan = kayitServisi(k)
      return {
        ...k,
        _bayiAd: bayi?.ad || k.bayiAd || '',
        _servisAd: bulunan?.servis.ad || '',
        _servisKaynak: bulunan?.kaynak || '',
      }
    })
  }, [kayitlar, surum])

  /* Yan menüdeki Kayıtlı Makineler sayısıyla aynı işlev
     (Backoffice.jsx → sayaclar.servissiz). */
  const eksik = servisiAtanmamisKayitlar(kayitlar).length

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const qRakam = q.replace(/\D/g, '')

    return zenginler.filter((k) => {
      if (!araliktaMi(k.tarih, aralik)) return false
      if (il !== 'hepsi' && k.il !== il) return false
      if (ilce !== 'hepsi' && k.ilce !== ilce) return false
      if (atanmamis && k._servisAd) return false
      if (kaynak !== 'hepsi' && (k.kaynak || 'musteri') !== kaynak) return false
      if (!q) return true

      const urun = getProduct(k.productId)?.name
      const alanlar = [
        k.seri, k._bayiAd, k._servisAd, k.il, k.ilce, k.musteriAd, k.musteriNo, urun,
      ]
      if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
        return true
      }

      /* Seri numarasının bir bölümü veya müşteri numarasının rakamları
         da bulunmalı; tire ve boşluk aramayı bozmasın. */
      if (!qRakam) return false
      return [k.seri, k.musteriNo]
        .filter(Boolean)
        .some((x) => String(x).replace(/\D/g, '').includes(qRakam))
    })
  }, [zenginler, ara, aralik, il, ilce, atanmamis, kaynak])

  const liste = useMemo(
    () =>
      siraliListe(suzulmus, siralama, {
        seri: (k) => k.seri,
        model: (k) => getProduct(k.productId)?.name || '',
        bayi: (k) => k._bayiAd,
        servis: (k) => k._servisAd,
        konum: (k) => k.il || '',
        musteri: (k) => k.musteriAd || '',
        tarih: (k) => k.tarih,
      }),
    [suzulmus, siralama]
  )

  const iller = [...new Set(kayitlar.map((k) => k.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )
  const ilceler = [
    ...new Set(
      kayitlar.filter((k) => il === 'hepsi' || k.il === il).map((k) => k.ilce).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  const ata = (kayit, yama, ozet) =>
    atamayiKaydet(kayit, yama, ozet, { personel, tazele, bildir })

  if (yukleniyor) {
    return (
      <>
        <Baslik ad="Kayıtlı Makineler" />
        <BeklemeKart satir={5} />
      </>
    )
  }

  return (
    <>
      <Baslik
        ad="Kayıtlı Makineler"
        sag={
          <DisaAktar
            ad="Kayıtlı Makineler"
            basliklar={AKTAR_BASLIK}
            satirlar={liste.map(aktarSatiri)}
            personel={personel}
          />
        }
      />

      <SuzgecCubugu>
        <Secim
          ad="İl"
          deger={il}
          onDegis={(v) => {
            setIl(v)
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
          ad="Kaynak"
          deger={kaynak}
          onDegis={setKaynak}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'musteri', ad: 'Müşteri kaydetti' },
            { deger: 'servis', ad: 'Servis açtı' },
            { deger: 'logo', ad: 'Logo faturası' },
          ]}
          genislik={165}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        {/* Servisi olmayan makineleri gösteren tek yol bu kutu. Uyarı
            kartındaki "göster" düğmesi kaldırıldı — aynı işi yapan iki
            kontrol kafa karıştırıyordu.

            YERİ ARAMA KUTUSUNUN SOLU (21 Eylül 2026, kullanıcının
            isteği). Aynı gün önce filtrelerin en sağına konmuştu; sonra
            arama kutusuyla yer değiştirdi: süzgeçler yan yana, serbest
            arama en sonda. */}
        <label className="secim-alan secim-alan--kutu">
          <span className="secim-alan__ad">Servis atanmamış</span>
          <span className="secim-alan__kutu">
            <input
              type="checkbox"
              checked={atanmamis}
              onChange={(e) => setAtanmamis(e.target.checked)}
            />
          </span>
        </label>

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Seri numarası, bayi, servis, il, müşteri adı veya telefon numarası"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} kayıt</span>
      </SuzgecCubugu>

      {/* SERVİSİ OLMAYAN MAKİNE SESSİZ KALMIYOR.

          Servisi atanmamış bir makinenin sahibi uygulamadan servis
          talebi açamıyor; uygulamada "servisiniz henüz atanmadı, en kısa
          sürede atanacak" yazısını görüyor. Bu eksiklik listenin içinde
          kaybolursa kimse fark etmiyor ve verilen söz tutulmuyor.
          Kart sayıyı ve ne yapılacağını söylüyor; listeyi süzmenin tek
          yolu filtrelerdeki kutu. Kutu işaretliyken kart çıkmıyor: liste
          zaten o makineler. */}
      {eksik > 0 && !atanmamis && (
        <div
          className="kart kart--dikkat"
          style={{ marginBottom: 14 }}
        >
          <div className="kart__ic">
            <strong>{eksik} makineye servis atanmamış.</strong>
            <p className="kucuk sonuk" style={{ margin: '6px 0 0' }}>
              Bu makinelerin sahipleri uygulamadan servis talebi açamıyor.
              Üstteki filtrelerde, arama kutusunun hemen solundaki "Servis atanmamış" kutusunu işaretleyin.
              Listede makinenin satırına tıklayıp açılan pencereden servis atayın.
              Makineyi satan bayiyi girerseniz bayinin çalıştığı servis kendiliğinden atanır.
            </p>
          </div>
        </div>
      )}

      {/* Satırın tıklanabilir olduğu yazıyor: fare imleci ve vurgu
          ancak satırın üstüne gelince görünüyor, aranan şey de
          çoğunlukla listede değil o pencerede. */}
      {liste.length > 0 && (
        <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
          Bir satıra tıklayın. Makinenin bayisi, servisi, fatura bilgileri
          ve servis geçmişi tek pencerede açılır. Servis ataması da buradan
          yapılır.
        </p>
      )}

      {liste.length === 0 ? (
        <div className="kart">
          <Bos
            metin={
              kayitlar.length === 0
                ? 'Henüz kayıtlı makine yok. Müşteri uygulamadan makinesini kaydettiğinde burada görünecek.'
                : 'Bu süzgeçle makine bulunamadı.'
            }
          />
        </div>
      ) : (
        <div className="kart">
          <div className="tablo-sar">
            <table>
              <thead>
                <tr>
                  <SiraliBaslik ad="Seri No" alan="seri" siralama={siralama} onSirala={cevir} genislik={190} />
                  <SiraliBaslik ad="Model" alan="model" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Satan Bayi" alan="bayi" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Bakan Servis" alan="servis" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Müşteri" alan="musteri" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Kayıt" alan="tarih" siralama={siralama} onSirala={cevir} genislik={120} />
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => {
                  const urun = getProduct(k.productId)
                  return (
                    <tr
                      key={k.id}
                      className="tiklanir"
                      onClick={() => setSecili(k)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSecili(k)}
                    >
                      <td className="mono kucuk">{formatSerial(k.seri)}</td>
                      <td className="kucuk">{urun?.name || '—'}</td>
                      <td className="kucuk">
                        {k._bayiAd || <span className="sonuk">—</span>}
                        <div className="kucuk sonuk">
                          {KAYNAK_ADI[k.kaynak || 'musteri']}
                        </div>
                      </td>
                      {/* Servisin bayiden mi geldiği yazıyor: elle
                          atanmış bir servis, bayi değişse de yerinde
                          kalır; bayiden gelen ise bayi değişince
                          değişir. İkisi aynı görünmemeli. */}
                      <td className="kucuk">
                        {k._servisAd ? (
                          <>
                            {k._servisAd}
                            {k._servisKaynak === 'bayi' && (
                              <div className="kucuk sonuk">bayisinden</div>
                            )}
                          </>
                        ) : (
                          <span className="rz rz--turuncu">Atanmadı</span>
                        )}
                      </td>
                      <td className="kucuk">{k.ilce ? `${k.ilce} / ${k.il}` : k.il || '—'}</td>
                      <td className="kucuk">
                        {k.musteriAd || '—'}
                        {k.musteriNo && <div className="kucuk sonuk mono">{k.musteriNo}</div>}
                      </td>
                      <td className="kucuk sonuk">{tarihSaat(k.tarih)[0]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {secili && (
        <MakineGecmisi
          kayit={liste.find((k) => k.id === secili.id) || secili}
          talepler={talepler}
          duzenleyebilir={duzenleyebilir}
          onAta={ata}
          onKapat={() => setSecili(null)}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Makinenin geçmişi

   Kayıt defteri "bu makine kimde" diyor, talepler "başına ne geldi"
   diyor; ikisi seri numarasıyla birleşiyor.

   BİR SERİ, BİR SATIR (21 Eylül 2026). Burada bir dönem "aynı seri
   birden fazla kayıtta olabilir, makine el değiştirince yeni sahibi de
   kaydediyor" yazıyordu. 17 Eylül'den beri öyle değil: makine başka
   hesaptaysa müşteri ekleyemiyor, devri PAKSAN yapıyor. Kalan iki kopya
   yolu (silip yeniden ekleme, Servisim'den elle kayıt) da kapandı —
   bkz. lib/makineKaydi.js başı. Liste her makineyi bir kez gösteriyor.
   ========================================================================== */

/* ==========================================================================
   Bayi ve servis ataması

   İKİ AYRI SORU, İKİ AYRI ALAN:

     Satan bayi    makine nereden çıktı. LOGO açıldığında faturadan
                   gelecek; bugün elle giriliyor.
     Bakan servis  müşteriye kim bakıyor. Bu bir ticari karar; LOGO
                   açıldıktan sonra da elle kalacak.

   SERVİS BOŞ BIRAKILABİLİR ve boş bırakmak bir seçim: o zaman bayinin
   çalıştığı servis geçerli oluyor (bkz. Servisler ekranı → Çalıştığı
   Bayiler). Bayi değişince servis de değişiyor. Doğrudan atanan servis
   ise sabit kalıyor — ekranda hangisinin geçerli olduğu yazıyor.

   SIRALAMA ÖNERİYE GÖRE: makinenin bulunduğu il/ilçeye bakan servisler
   listenin başında (bkz. marka/katalog/servisler.js → talebinServisleri).
   Öneri bir kısıt değil; personel listeden istediğini seçiyor.
   ========================================================================== */
function Atama({ kayit, onAta }) {
  const bayiler = useMemo(
    () => [...bayileriGetir()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')),
    [],
  )

  /* Önerilen servisler önce, kalanlar alfabetik. */
  const servisler = useMemo(() => {
    const oneri = talebinServisleri(kayit.il, kayit.ilce, 99).servisler
    const onerilenId = new Set(oneri.map((s) => s.id))
    const kalan = servisleriGetir()
      .filter((s) => !onerilenId.has(s.id))
      .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    return { oneri, kalan }
  }, [kayit.il, kayit.ilce])

  const bayiServisi = bayininServisleri(kayit.bayiId)[0] || null

  return (
    <div className="kart" style={{ marginTop: 18, background: 'var(--yuzey-2)' }}>
      <div className="kart__ic">
        <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Atama</h3>
        <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
          Servisi atanmayan makinenin sahibi uygulamadan servis talebi
          açamaz.
        </p>

        <div className="esit">
          <label className="alan">
            <span className="alan__ad">Satan Bayi</span>
            <select
              className="gir"
              value={kayit.bayiId || ''}
              onChange={(e) => {
                const b = bayiler.find((x) => x.id === e.target.value)
                onAta(
                  kayit,
                  { bayiId: b?.id || null, bayiAd: b?.ad || '' },
                  b
                    ? `${formatSerial(kayit.seri)} bayisi: ${b.ad}`
                    : `${formatSerial(kayit.seri)} bayisi kaldırıldı`,
                )
              }}
            >
              <option value="">Bilinmiyor</option>
              {bayiler.map((b) => (
                <option key={b.id} value={b.id}>{b.ad} · {b.il}</option>
              ))}
            </select>
          </label>

          <label className="alan">
            <span className="alan__ad">Bakan Servis</span>
            <select
              className="gir"
              value={kayit.servisId || ''}
              onChange={(e) => {
                const s = servisleriGetir().find((x) => x.id === e.target.value)
                onAta(
                  kayit,
                  { servisId: s?.id || null, servisAd: s?.ad || '' },
                  s
                    ? `${formatSerial(kayit.seri)} servisi: ${s.ad}`
                    : `${formatSerial(kayit.seri)} servis ataması kaldırıldı`,
                )
              }}
            >
              <option value="">
                {bayiServisi ? `Bayinin servisi: ${bayiServisi.ad}` : 'Atanmadı'}
              </option>
              {servisler.oneri.length > 0 && (
                <optgroup label="Bu bölgeye bakanlar">
                  {servisler.oneri.map((s) => (
                    <option key={s.id} value={s.id}>{s.ad} · {s.ilce} / {s.il}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Diğer servisler">
                {servisler.kalan.map((s) => (
                  <option key={s.id} value={s.id}>{s.ad} · {s.ilce} / {s.il}</option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>

        <p className="kucuk sonuk" style={{ margin: 0 }}>
          {kayit.servisId
            ? 'Servis doğrudan atandı; bayi değişse de bu servis kalır.'
            : bayiServisi
              ? 'Servis bayiden atanıyor. Bayi değişirse servis de değişir.'
              : 'Servis atanmadı. Bayi girerseniz bayinin servisi geçerli olur.'}
        </p>
      </div>
    </div>
  )
}

function MakineGecmisi({ kayit, talepler, duzenleyebilir, onAta, onKapat }) {
  const anahtar = temiz(kayit.seri)
  const urun = getProduct(kayit.productId)
  /* Yıl SERİ NUMARASINDAN çıkıyor, LOGO'nun üretim tarihinden değil.
     Müşteri de garantisini seri numarasından görüyor; iki taraf aynı
     makineye bakıp farklı yıl okursa hangisinin doğru olduğu
     tartışılır. LOGO'nun tarihi aşağıda ayrı satırda duruyor. */
  const yil = extractYear(kayit.seri)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  const garanti = GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor

  const gecmis = (talepler || []).filter((t) => temiz(t.makine?.serial) === anahtar)

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 720 }}>
        <div className="kart__tepe">
          <h2>{urun?.name || 'Makine'}</h2>
          <span className="mono kucuk sonuk">{formatSerial(kayit.seri)}</span>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>
            Kapat
          </button>
        </div>

        <div className="kart__ic">
          <div className="satir" style={{ gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <span className={'rz rz--' + garanti.ton}>{garanti.yaz(kalan)}</span>
            {yil > 0 && <span className="kucuk sonuk">{yil} üretimi</span>}
          </div>

          <div className="ikili">
            <div>
              <Bilgi ad="Sahibi" deger={kayit.musteriAd} alt={kayit.musteriNo} />
              <Bilgi
                ad="Konum"
                deger={kayit.ilce ? `${kayit.ilce} / ${kayit.il}` : kayit.il}
              />
              <Bilgi
                ad="Kayıt"
                deger={tarihSaat(kayit.tarih)[0]}
                alt={KAYNAK_ADI[kayit.kaynak || 'musteri'] + ' kaydetti'}
              />
            </div>
            <div>
              <Bilgi
                ad="Satan bayi"
                deger={kayit._bayiAd}
                alt={kayit.bayiId ? '' : 'Girilmedi'}
              />
              <Bilgi
                ad="Bakan servis"
                deger={kayit._servisAd}
                alt={kayit._servisKaynak === 'bayi' ? 'Bayisinden geliyor' : ''}
              />
              <Bilgi
                ad="Fatura tarihi"
                deger={
                  kayit.faturaTarihi
                    ? new Date(kayit.faturaTarihi).toLocaleDateString('tr-TR')
                    : ''
                }
                /* LOGO cevap vermediyse "fatura yok" değil "bilinmiyor"
                   demek doğru; ikisi ayrı şeyler. */
                alt={kayit.logoBildi ? 'Logo faturasından' : 'Logo bu seriyi tanımıyor'}
              />
              <Bilgi
                ad="Üretim tarihi"
                deger={
                  kayit.uretimTarihi
                    ? new Date(kayit.uretimTarihi).toLocaleDateString('tr-TR')
                    : ''
                }
              />
            </div>
          </div>

          {duzenleyebilir && <Atama kayit={kayit} onAta={onAta} />}

          <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>
            Servis Geçmişi{gecmis.length ? ` · ${gecmis.length} kayıt` : ''}
          </h3>

          {gecmis.length === 0 ? (
            <Bos metin="Bu makine için açılmış talep yok." />
          ) : (
            <div className="tablo-sar">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Tarih</th>
                    <th style={{ width: 110 }}>Tür</th>
                    <th style={{ width: 130 }}>Durum</th>
                    <th>Kim ilgilendi / ne yapıldı</th>
                  </tr>
                </thead>
                <tbody>
                  {gecmis.map((t) => (
                    <tr key={t.id}>
                      <td className="kucuk sonuk">
                        {tarihYaz(t.createdAt, false)}
                        <div className="kucuk sonuk mono">{t.no}</div>
                      </td>
                      <td className="kucuk">{TUR_ADI[t.tur] || t.tur}</td>
                      <td>
                        <span className={'rz rz--' + durumBilgi(t.status).ton}>
                          {durumBilgi(t.status).ad}
                        </span>
                      </td>
                      <td className="kucuk">
                        {t.servis?.ad || MARKA}
                        {t.cozum?.ozet && (
                          <div className="kucuk sonuk">{t.cozum.ozet}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Bilgi({ ad, deger, alt }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="kucuk sonuk">{ad}</div>
      <div>{deger || <span className="sonuk">—</span>}</div>
      {alt && <div className="kucuk sonuk">{alt}</div>}
    </div>
  )
}

const AKTAR_BASLIK = [
  'Seri numarası', 'Model', 'Satan bayi', 'Bakan servis', 'Kaynak', 'İl', 'İlçe',
  'Müşteri', 'Müşteri numarası', 'Kayıt tarihi', 'Kayıt saati',
  'Fatura tarihi', 'Logo bildi mi',
]

function aktarSatiri(k) {
  return [
    formatSerial(k.seri),
    getProduct(k.productId)?.name || '',
    k._bayiAd || '',
    k._servisAd || '',
    KAYNAK_ADI[k.kaynak || 'musteri'],
    k.il || '',
    k.ilce || '',
    k.musteriAd || '',
    k.musteriNo || '',
    ...tarihSaat(k.tarih),
    k.faturaTarihi ? new Date(k.faturaTarihi).toLocaleDateString('tr-TR') : '',
    k.logoBildi ? 'Evet' : 'Hayır',
  ]
}
