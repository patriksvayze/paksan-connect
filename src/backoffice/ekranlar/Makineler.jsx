import { useEffect, useMemo, useState } from 'react'
import {
  devirIcinMusteriBul, gorunenDurum, izinli, KAPALI_DURUMLAR, makineAtamasiniKaydet,
  makineKayitlariGetir, makineSahibiniDegistir, rolunTalepleri, talepleriGetir,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, siraliListe, SiraliBaslik, tarihSaat, tarihYaz, useOnay, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { getProduct } from '../../data/katalog/products.js'
import { bayileriGetir } from '../../data/katalog/bayiler.js'
import {
  servisleriGetir, talebinServisleri, bayininServisleri,
} from '../../data/katalog/servisler.js'
import { extractYear, formatSerial, warrantyStatus, GARANTI_YIL } from '../../lib/serial'
import { kaydinServisi, servisiAtanmamisKayitlar } from '../../lib/servisAtama'
import { sahiplikTarihi } from '../../lib/makineKaydi'

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
     servis   servis uygulamasından elle açıldı — kaydeden servis
              `kaydedenServisId`de; servis ataması BOŞ, PAKSAN atar
              (25 Eylül 2026, kullanıcı sınaması Y5: Servisim kaydettiği
              makineye kendini atamış oluyordu). 25 Eylül'den önceki
              satırlarda servis alanı dolu; o satırlar atanmış sayılıyor.
     logo     faturadan geldi (LOGO bağlandığında)

   MAKİNENİN GEÇMİŞİ

   Liste bir satırın kim olduğunu söylüyor, pencere başına ne geldiğini:
   makine hangi bayiden çıktı, kime gitti, kaç kez servise girdi, ne
   yapıldı, garantisi sürüyor mu.

   SAHİBİ DE BURADAN DEĞİŞİYOR (9 Ekim 2026, kullanıcının onayı). İkinci
   el alınan makineyi yeni sahip Connect'te ekleyemiyor, PAKSAN'ı arıyor;
   personel pencereden makineyi onun hesabına geçiriyor (aşağıda
   Sahiplik). Tablonun "Kayıt" sütunu bugünkü sahibin makineyi aldığı
   günü gösteriyor; el değiştirmiş makinede altında ilk kayıt günü.

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
  /* MAKİNEYE SERVİS ATAMA AYRI YETKİ (25 Eylül 2026, kullanıcı
     sınaması). Atama `servisDuzenle`e bağlıydı; aynı izin servis
     kaydını, bölgesini ve servis hesabını da açıyordu. Hak edişi
     onaylayan Servis birimi atama dışı işi görünce makineyi
     atayamıyordu. Yan menü sayacı ve Genel Bakış kutusu da aynı izne
     bakıyor (bkz. data/yetkiler.js → makineAtama). */
  const duzenleyebilir = izinli(rol, 'makineAtama')
  /* Sahibini değiştirmek ayrı yetki (aşağıda Sahiplik). */
  const devredebilir = izinli(rol, 'makineDevir')
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
      /* Süzgeç tablodaki tarihe bakıyor: bugünkü sahibin makineyi aldığı gün. */
      if (!araliktaMi(sahiplikTarihi(k), aralik)) return false
      if (il !== 'hepsi' && k.il !== il) return false
      if (ilce !== 'hepsi' && k.ilce !== ilce) return false
      if (atanmamis && k._servisAd) return false
      if (kaynak !== 'hepsi' && (k.kaynak || 'musteri') !== kaynak) return false
      if (!q) return true

      const urun = getProduct(k.productId)?.name
      /* Kaydeden servis de aranıyor (25 Eylül 2026, Y5): servis ataması
         boş olsa da "Konya servisinin kaydettiği makineler" bulunabilsin. */
      const alanlar = [
        k.seri, k._bayiAd, k._servisAd, k.kaydedenServisAd, k.il, k.ilce, k.musteriAd,
        k.musteriNo, urun,
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
        tarih: (k) => sahiplikTarihi(k),
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
          zaten o makineler.

          ATAMA YETKİSİ OLMAYANA KART ÇIKMIYOR (25 Eylül 2026, kullanıcı
          sınaması). Kart "pencereden servis atayın" diyordu, oysa
          pencerede atama bölümü yoktu. Yan menüdeki sayaçla aynı kural
          (Backoffice.jsx → sayaclar.servissiz): yapamayacağı işi
          hatırlatmamak. "Servis atanmamış" kutusu herkeste kalıyor;
          bakmak zararsız. */}
      {eksik > 0 && !atanmamis && duzenleyebilir && (
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
          {'Bir satıra tıklayın. Makinenin bayisi, servisi, fatura bilgileri, servis ve sahiplik geçmişi tek pencerede açılır. '}
          {duzenleyebilir && devredebilir
            ? 'Buradan servis atayabilir ve makinenin sahibini değiştirebilirsiniz.'
            : duzenleyebilir
              ? 'Servis ataması da buradan yapılır.'
              : 'Servis atama yetkiniz yok; atama gerekiyorsa yöneticinize başvurun.'}
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
                      {/* Bugünkü sahibin makineyi aldığı gün; el değiştirmiş
                          makinede altında ilk kayıt (9 Ekim 2026). */}
                      <td className="kucuk sonuk">
                        {tarihSaat(sahiplikTarihi(k))[0]}
                        {sahiplikTarihi(k) !== k.tarih && (
                          <div className="kucuk sonuk" style={{ whiteSpace: 'nowrap' }} data-ilk-kayit>
                            İlk kayıt: {tarihSaat(k.tarih)[0]}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pencere kaydı SÜZÜLMEMİŞ listeden okuyor (26 Eylül 2026, ikinci
          kullanıcı sınaması). "Servis Atanmamış" süzgeci açıkken atanan
          makine süzülmüş listeden düşüyor, pencere açılış anının kopyasına
          dönüp "Bakan servis —" gösteriyordu; personel atamanın
          tutmadığını sanıyordu. */}
      {secili && (
        <MakineGecmisi
          kayit={zenginler.find((k) => k.id === secili.id) || secili}
          talepler={talepler}
          duzenleyebilir={duzenleyebilir}
          devredebilir={devredebilir}
          onAta={ata}
          personel={personel}
          bildir={bildir}
          tazele={tazele}
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
   listenin başında (bkz. data/katalog/servisler.js → talebinServisleri).
   Öneri bir kısıt değil; personel listeden istediğini seçiyor.
   ========================================================================== */
function Atama({ kayit, onAta }) {
  const bayiler = useMemo(
    () => [...bayileriGetir()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')),
    [],
  )

  /* Önerilen servisler önce, kalanlar alfabetik.

     MAKİNEYİ KAYDEDEN SERVİS EN ÜSTTE (25 Eylül 2026, Y5). Servisim'den
     elle kaydedilen makineye servis atanmıyor, atamayı PAKSAN yapıyor;
     çoğu zaman doğru cevap makineyi getiren servis. Ayrı grupta
     duruyor ki öneri olduğu, atama olmadığı belli olsun. */
  const servisler = useMemo(() => {
    const kaydeden = kayit.kaydedenServisId
      ? servisleriGetir().find((s) => s.id === kayit.kaydedenServisId) || null
      : null
    const oneri = talebinServisleri(kayit.il, kayit.ilce, 99).servisler.filter(
      (s) => s.id !== kaydeden?.id,
    )
    const onerilenId = new Set(oneri.map((s) => s.id))
    const kalan = servisleriGetir()
      .filter((s) => !onerilenId.has(s.id) && s.id !== kaydeden?.id)
      .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    return { kaydeden, oneri, kalan }
  }, [kayit.il, kayit.ilce, kayit.kaydedenServisId])

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
              {servisler.kaydeden && (
                <optgroup label="Makineyi kaydeden servis">
                  <option value={servisler.kaydeden.id}>
                    {servisler.kaydeden.ad} · {servisler.kaydeden.ilce} / {servisler.kaydeden.il}
                  </option>
                </optgroup>
              )}
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

/* ==========================================================================
   Sahiplik — ikinci el devir (9 Ekim 2026, kullanıcının onayı: "Evet,
   Sahibini Değiştir'i ekle")

   Yeni sahip makineyi Connect'te ekleyemiyor (seri başka hesapta) ve
   PAKSAN'ı arıyor; personel onun hesabını telefon numarasıyla bulup
   makineyi geçiriyor. Yazan iş veri katmanında (veri.js →
   makineSahibiniDegistir): defter, iki telefonun listesi, bildirimler ve
   İşlem Kaydı oradan; ekranda kalsaydı ekosistem sınaması onu
   çalıştıramazdı.

   AYRI YETKİ (`makineDevir`). Makineyi bir hesaptan alıp başkasına
   vermek numara değişikliği kadar ağır bir iş: yanlış devirde makine,
   servis talebi açma hakkıyla birlikte yabancının hesabına geçer.
   Varsayılan rollerde yalnız Admin'de (numara değişikliği gibi); Roller
   ekranından başka role verilebilir.

   Onaydan önce süren talep varsa söyleniyor, engellenmiyor: talep eski
   sahibin hesabında kalıyor (veri.js'teki gerekçe).
   ========================================================================== */
function Sahiplik({ kayit, personel, bildir, tazele, sor }) {
  const [acik, setAcik] = useState(false)
  const [tel, setTel] = useState('')
  const [sonuc, setSonuc] = useState(null)

  const bulunan = sonuc?.durum === 'bulundu' ? sonuc.musteri : null
  const ayniHesap = Boolean(bulunan && kayit.musteriId && bulunan.id === kayit.musteriId)
  const surenler = useMemo(
    () =>
      talepleriGetir().filter(
        (t) =>
          temiz(t.makine?.serial) === temiz(kayit.seri) &&
          !t.servisSiparisi &&
          !KAPALI_DURUMLAR.includes(t.status || 'yeni'),
      ),
    [kayit.seri, kayit.musteriId],
  )

  const kapat = () => {
    setAcik(false)
    setTel('')
    setSonuc(null)
  }

  async function gecir() {
    const urun = getProduct(kayit.productId)?.name || ''
    const hesapAdi = (ad, no) => (no ? `${ad || ''} (${no})`.trim() : ad || '')
    const yeni = hesapAdi(bulunan.ad, bulunan.no)
    const seri = formatSerial(kayit.seri)
    const metin = kayit.musteriId || kayit.musteriNo
      ? `${seri} seri numaralı ${urun}, ${hesapAdi(kayit.musteriAd, kayit.musteriNo)} hesabından ${yeni} hesabına geçecek. Makine eski sahibin PAKSAN Connect listesinden çıkacak, yeni sahibin listesine eklenecek. İkisine de bildirim gidecek. Garanti makineyle birlikte geçecek. Servis ataması değişmeyecek; gerekirse bu pencereden değiştirebilirsiniz.`
      : `${seri} seri numaralı ${urun}, ${yeni} hesabına eklenecek. Yeni sahibe bildirim gidecek. Servis ataması değişmeyecek; gerekirse bu pencereden değiştirebilirsiniz.`
    const evet = await sor({ baslik: 'Makine yeni sahibine geçecek', metin, dugme: 'Sahibini Değiştir' })
    if (!evet) return
    const r = makineSahibiniDegistir(kayit.id, bulunan.id, { personel })
    tazele()
    if (r.hata) {
      /* Pencere açılalı başka sekmede değişmiş olabilir: kural depodaki
         kayıttan veriliyor, ekran o cevabı gösteriyor. */
      setSonuc({ durum: r.hata === 'ayniHesap' ? 'bulundu' : 'yok', musteri: bulunan })
      return
    }
    bildir(`${seri} artık ${yeni} hesabında.`)
    kapat()
  }

  return (
    <div className="kart" style={{ marginTop: 18, background: 'var(--yuzey-2)' }} data-bolum="sahiplik">
      <div className="kart__ic">
        <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Sahiplik</h3>
        <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
          Makine ikinci el satıldıysa veya devredildiyse buradan yeni sahibinin hesabına geçirin.
        </p>

        {!acik ? (
          <button className="dg" data-eylem="sahip-degistir" onClick={() => setAcik(true)}>
            Sahibini Değiştir
          </button>
        ) : (
          <>
            <form
              className="satir"
              style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}
              onSubmit={(e) => {
                e.preventDefault()
                setSonuc(devirIcinMusteriBul(tel))
              }}
            >
              <label className="alan" style={{ margin: 0, flex: '1 1 220px' }}>
                <span className="alan__ad">Yeni sahibin telefon numarası</span>
                <input
                  className="gir"
                  inputMode="tel"
                  value={tel}
                  data-alan="devir-tel"
                  onChange={(e) => {
                    setTel(e.target.value)
                    setSonuc(null)
                  }}
                  placeholder="0532 111 22 33"
                  autoFocus
                />
              </label>
              <button type="submit" className="dg dg--ana" data-eylem="hesap-bul">
                Hesabı Bul
              </button>
              <button type="button" className="dg" onClick={kapat}>
                Vazgeç
              </button>
            </form>

            {sonuc?.durum === 'eksik' && (
              <p className="kucuk" style={{ margin: '10px 0 0', color: 'var(--kirmizi)' }}>
                Telefon numarasını eksiksiz yazın.
              </p>
            )}
            {sonuc?.durum === 'yok' && (
              <p className="kucuk" style={{ margin: '10px 0 0' }} data-devir-sonuc="yok">
                Bu numarayla kayıtlı bir PAKSAN Connect hesabı bulunamadı. Yeni sahip önce
                uygulamaya üye olmalı. Ardından makineyi buradan hesabına geçirebilirsiniz.
              </p>
            )}
            {bulunan && (
              <div className="kart" style={{ marginTop: 12 }} data-devir-sonuc="bulundu">
                <div className="kart__ic">
                  <strong>{bulunan.ad}</strong>
                  <div className="kucuk sonuk">
                    {[
                      bulunan.no,
                      bulunan.ilce ? `${bulunan.ilce} / ${bulunan.il}` : bulunan.il,
                      `${(bulunan.makineler || []).length} kayıtlı makine`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {ayniHesap ? (
                    <p className="kucuk" style={{ margin: '10px 0 0' }}>
                      Makine zaten bu hesapta kayıtlı.
                    </p>
                  ) : (
                    <>
                      {surenler.map((t) => (
                        <p key={t.id} className="kucuk" style={{ margin: '10px 0 0' }} data-devir-uyari>
                          Bu makine için devam eden bir talep var ({t.no}). Talep eski sahibin
                          hesabında kalacak.
                        </p>
                      ))}
                      <button
                        className="dg dg--ana"
                        style={{ marginTop: 12 }}
                        data-eylem="devret"
                        onClick={gecir}
                      >
                        Makineyi Bu Hesaba Geçir
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* Makinenin sahipleri, bugünkü başta. Yalnız el değiştirmiş makinede
   çiziliyor: tek sahipli makinede tablo yukarıdaki "Sahibi" satırını
   tekrarlardı. */
function SahiplikGecmisi({ kayit }) {
  const gecmis = kayit.sahiplikGecmisi || []
  if (!gecmis.length) return null
  const satirlar = [
    {
      musteriAd: kayit.musteriAd,
      musteriNo: kayit.musteriNo,
      baslangic: sahiplikTarihi(kayit),
      bitis: null,
      yapan: '',
    },
    ...gecmis,
  ]
  return (
    <>
      <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>Sahiplik Geçmişi</h3>
      <div className="tablo-sar">
        <table data-tablo="sahiplik">
          <thead>
            <tr>
              <th>Sahip</th>
              <th style={{ width: 120 }}>Başlangıç</th>
              <th style={{ width: 130 }}>Bitiş</th>
              <th>Değiştiren</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s, i) => (
              <tr key={i}>
                <td className="kucuk">
                  {s.musteriAd || '—'}
                  {s.musteriNo && <div className="kucuk sonuk mono">{s.musteriNo}</div>}
                </td>
                <td className="kucuk sonuk">{s.baslangic ? tarihSaat(s.baslangic)[0] : '—'}</td>
                <td className="kucuk sonuk">
                  {s.bitis ? tarihSaat(s.bitis)[0] : <span className="rz rz--yesil">Mevcut sahip</span>}
                </td>
                <td className="kucuk">{s.yapan || <span className="sonuk">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MakineGecmisi({
  kayit, talepler, duzenleyebilir, devredebilir, onAta, personel, bildir, tazele, onKapat,
}) {
  const [sor, onayPenceresi] = useOnay()
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
              {/* İki tarih (9 Ekim 2026): makinenin deftere ilk girdiği gün
                  ve bugünkü sahibe geçtiği gün. Tek sahipli makinede
                  ikincisi birincinin aynısı; yazılmıyor. */}
              {sahiplikTarihi(kayit) !== kayit.tarih && (
                <Bilgi ad="Bu sahibe geçiş" deger={tarihSaat(sahiplikTarihi(kayit))[0]} />
              )}
              <Bilgi
                ad="Konum"
                deger={kayit.ilce ? `${kayit.ilce} / ${kayit.il}` : kayit.il}
              />
              <Bilgi
                ad="İlk kayıt"
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
              {/* Makineyi Servisim'den deftere yazan servis (25 Eylül 2026,
                  Y5). Atama değil: bakan servis yukarıda, ayrı satırda. */}
              {kayit.kaydedenServisAd && (
                <Bilgi ad="Kaydeden servis" deger={kayit.kaydedenServisAd} />
              )}
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

          {/* Yetkisi olmayana boşluk değil neden (25 Eylül 2026, kullanıcı
              sınaması): atama bölümü hiç çizilmiyordu ve personel neden
              düğme olmadığını anlamıyordu. */}
          {duzenleyebilir ? (
            <Atama kayit={kayit} onAta={onAta} />
          ) : (
            <p className="kucuk sonuk" style={{ margin: '14px 0 0' }}>
              Servis atama yetkiniz yok. Atama gerekiyorsa yöneticinize başvurun.
            </p>
          )}

          {devredebilir ? (
            <Sahiplik
              key={kayit.id + ':' + (kayit.musteriId || '')}
              kayit={kayit}
              personel={personel}
              bildir={bildir}
              tazele={tazele}
              sor={sor}
            />
          ) : (
            <p className="kucuk sonuk" style={{ margin: '14px 0 0' }} data-uyari="devir-yetkisiz">
              Makinenin sahibini değiştirme yetkiniz yok. Gerekiyorsa yöneticinize başvurun.
            </p>
          )}

          <SahiplikGecmisi kayit={kayit} />

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
                        {/* Talepler'deki rozetin aynısı: parça bekleyen iş
                            "Parça Hazırlanıyor" ya da "Parça Yolda". */}
                        <span className={'rz rz--' + gorunenDurum(t).ton}>
                          {gorunenDurum(t).ad}
                        </span>
                      </td>
                      <td className="kucuk">
                        {t.servis?.ad || 'PAKSAN'}
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
      {/* Onay penceresi makine penceresinin üstünde. Onun zeminine
          tıklamak makine penceresini kapatmıyor: tıklamanın hedefi bu
          pencerenin zemini değil. */}
      {onayPenceresi}
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
  'Müşteri', 'Müşteri numarası', 'İlk kayıt tarihi', 'İlk kayıt saati',
  'Sahiplik başlangıç tarihi', 'Fatura tarihi', 'Logo bildi mi',
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
    tarihSaat(sahiplikTarihi(k))[0],
    k.faturaTarihi ? new Date(k.faturaTarihi).toLocaleDateString('tr-TR') : '',
    k.logoBildi ? 'Evet' : 'Hayır',
  ]
}
