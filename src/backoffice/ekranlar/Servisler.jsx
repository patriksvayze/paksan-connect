import { useMemo, useState } from 'react'
import {
  servisSifreTalebiKapat,
  servisSifreTalepleriGetir,
  servisleriGetirBackoffice,
  servisleriYaz,
  izinli,
  kullaniciAdiOner,
} from '../veri'
import { sifreHazirla } from '../../lib/hesap'
import { useVeri } from '../kanca'
import { SERVISLER, SERVIS_TURU, bayileriGetir } from '../../marka'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { Baslik, Bekleme, Bos, siraliListe, SiraliBaslik, tarihYaz, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { DisaAktar, IceAktar } from './aktar'
import { uid } from '../../lib/storage'
import { yeniNo, sayaciEnAz } from '../../lib/numara'
import { telFirma, telGiris } from '../../lib/tel'

/* Servisler.

   Makineyi kuran, bakımını ve tamirini yapan taraf. Liste buradan
   yönetiliyor; dokunulmazsa koddaki temsilî liste geçerli kalıyor.

   SERVİS SATIŞ YAPMAZ. Kayıtta satış diye bir hizmet yok; makineyi
   satan taraf bayi ve onun ayrı bir ekranı var.

   ÇALIŞTIĞI BAYİLER BU EKRANDA GİRİLİYOR. Bayinin paneli olmadığı için
   bağ servis kaydında duruyor. Müşteriye hangi servisin bakacağı bu
   bağdan çıkıyor: makine → bayi → bayinin servisi.

   KOORDİNAT SORULMUYOR. Bir dönem enlem/boylam isteniyordu; tek
   tüketicisi müşteri uygulamasındaki yön haritasıydı ve o harita
   kaldırıldı. Servisin nerede olduğu il, ilçe ve adresle belli.

   TELEFON TEK ALAN. "Tuşlanacak" ve "ekranda görünen" diye iki alan
   vardı; ikisi de aynı numaraydı, ikincisi yalnız boşlukların yerini
   söylüyordu. Boşluğu ekran koyuyor (bkz. lib/tel.js → telFirma). */

/* `adres` yalnız şahıs türünde soruluyor (gider pusulası), `vergiDairesi`
   yalnız tüzel kişide. Boş kayıt ikisini de taşıyor: tür değiştirilip geri
   alındığında yazılan değer kaybolmasın. */
const BOS_CARI = {
  unvan: '', vergiDairesi: '', vergiNo: '', adres: '', iban: '', ibanAd: '',
}

const BOS_SERVIS = {
  ad: '', tur: 'tuzel', il: '', ilce: '', adres: '', tel: '',
  bayiler: [], bolge: [], cari: { ...BOS_CARI },
}

/* Servisin bıraktığı şifre yardımı talebi.

   Servis kendi sıfırlayamıyor: e-postası yok ve kullanıcı adını bilen
   herkese hesabı açardı. Talep bırakıyor, PAKSAN arıyor, geçici şifre
   veriyor. Servis o şifreyle girince `ilkGiris` akışı kendi şifresini
   belirletiyor. */
function SifreYardimi({ personel, tazele, surum }) {
  const liste = useMemo(() => {
    void surum
    return servisSifreTalepleriGetir().filter((t) => t.durum === 'bekliyor')
  }, [surum])

  if (!liste.length) return null

  return (
    <div className="kart kart--dikkat" style={{ marginBottom: 14 }}>
      <div className="kart__tepe">
        <h2>Şifre Yardımı Bekleyen Servis ({liste.length})</h2>
      </div>
      <div className="kart__ic">
        {liste.map((t) => (
          <div key={t.id} className="satir" style={{ alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ flex: 1 }}>
              <strong>{t.servisAd}</strong>
              <div className="kucuk sonuk mono">
                {t.servisNo} · {t.kullanici} · {tarihYaz(t.tarih)}
              </div>
            </div>
            <button
              className="dg"
              onClick={() => {
                servisSifreTalebiKapat(t.id, personel)
                tazele()
              }}
            >
              Arandı, kapat
            </button>
          </div>
        ))}
        <p className="kucuk sonuk" style={{ marginTop: 8 }}>
          Servisi arayıp aşağıdaki listeden "Şifre sıfırla" ile geçici şifre
          verin. Servis o şifreyle girdiğinde kendi şifresini belirleyecek.
        </p>
      </div>
    </div>
  )
}

export function Servisler({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'servisDuzenle')
  /* Toplu yükleme yalnız adminde: bir dosya bütün listeyi değiştirebiliyor. */
  const yonetici = izinli(rol, 'personelDuzenle')
  const [duzenlenen, setDuzenlenen] = useState(null)
  const [yerel, setYerel] = useState(null)
  const [il, setIl] = useState('hepsi')
  const [ilce, setIlce] = useState('hepsi')
  const [ara, setAra] = useState('')

  const { veri: kayitli, yukleniyor } = useVeri(() => servisleriGetirBackoffice(), [surum], null)

  const tumServisler = yerel || kayitli || SERVISLER

  const iller = [...new Set(tumServisler.map((b) => b.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )
  const ilceler = [
    ...new Set(
      tumServisler.filter((b) => il === 'hepsi' || b.il === il).map((b) => b.ilce).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  /* Servis adına göre arama.

     İl ve ilçe süzgeçleri "bu bölgede kim var" sorusunu
     cevaplıyordu ama günlük iş çoğu zaman tersi: elde bir servis adı
     var, telefonu ya da yetkisi aranıyor. Listede yüz kayıt varken
     adı bilinen servisi il seçerek bulmak dolambaçlı yoldu.

     Arama ada bakıyor; il, ilçe ve telefon da eşleşiyor ki
     "Bandırma" ya da numaranın son haneleri de bulsun. */
  const suzulmus = tumServisler.filter((b) => {
    if (il !== 'hepsi' && b.il !== il) return false
    if (ilce !== 'hepsi' && b.ilce !== ilce) return false

    const q = ara.trim().toLocaleLowerCase('tr-TR')
    if (!q) return true

    const alanlar = [b.no, b.ad, b.il, b.ilce, b.adres, b.tel]
    if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
      return true
    }

    /* Telefon boşluklu yazılıyor; "7339090" araması da bulsun. */
    const qRakam = q.replace(/\D/g, '')
    if (!qRakam) return false
    return [b.no, b.tel].filter(Boolean).some((x) => String(x).replace(/\D/g, '').includes(qRakam))
  })

  const { siralama, cevir } = useSiralama('ad', 'artan')
  const liste = siraliListe(suzulmus, siralama, {
    no: (b) => b.no,
    ad: (b) => b.ad,
    konum: (b) => b.il,
    tel: (b) => b.tel,
    bayi: (b) => (b.bayiler || []).length,
  })

  /* Süzgeç açıkken bile kaydetme bütün listeyi yazıyor; ekranda
     görünen alt küme değil. */
  function kaydet(yeniListe) {
    setYerel(yeniListe)
    servisleriYaz(yeniListe, personel, `Servis listesi güncellendi (${yeniListe.length} servis)`)
    tazele()
  }

  return (
    <>
      {/* Şifre yardımı isteyen servisler en üstte: servis giremiyor demek,
          bekleyen bir talebi de olabilir. Servis kendi sıfırlayamıyor —
          gerekçesi veri.js'te yazılı. */}
      {duzenleyebilir && <SifreYardimi personel={personel} tazele={tazele} surum={surum} />}

      <Baslik
        ad="Servisler"
        sag={
          duzenleyebilir && (
          <>
            <DisaAktar
              ad="Servisler"
              basliklar={AKTAR_BASLIK}
              satirlar={liste.map(aktarSatiri)}
              personel={personel}
            />

            {yonetici && (
              <IceAktar
                ad="Servisler"
                basliklar={AKTAR_BASLIK}
                ornek={ORNEK_SATIR}
                bildir={bildir}
                tazele={tazele}
                personel={personel}
                onVeri={(kayitlar) => iceAl(kayitlar, liste, kaydet)}
              />
            )}

            <button
              className="dg dg--ana"
              onClick={() => setDuzenlenen({ ...BOS_SERVIS, id: uid(), yeni: true })}
            >
              Servis ekle
            </button>
          </>
          )
        }
      />

      <SuzgecCubugu>
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
          genislik={150}
        />

        <Secim
          ad="İlçe"
          deger={ilce}
          onDegis={setIlce}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm ilçeler' },
            ...ilceler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={150}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Servis adı, il/ilçe, telefon"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} servis</span>
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={5} />
        ) : liste.length === 0 ? (
          <Bos metin="Bu süzgeçle servis bulunamadı." />
        ) : (
          <div className="tablo-sar">
            <table>
              <thead>
                <tr>
                  <SiraliBaslik
                    ad="No"
                    alan="no"
                    siralama={siralama}
                    onSirala={cevir}
                    genislik={90}
                  />
                  <SiraliBaslik ad="Servis" alan="ad" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Telefon" alan="tel" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Bayi" alan="bayi" siralama={siralama} onSirala={cevir} />
                  {duzenleyebilir && <th style={{ width: 1 }}></th>}
                </tr>
              </thead>
              <tbody>
                {liste.map((b) => (
                  <tr key={b.id}>
                    <td className="mono kucuk sonuk">{b.no || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{b.ad}</div>
                      <div className="kucuk sonuk">
                        {SERVIS_TURU[b.tur] || SERVIS_TURU.tuzel}
                        {b.adres ? ' · ' + b.adres : ''}
                      </div>
                    </td>
                    <td className="kucuk">{b.ilce} / {b.il}</td>
                    <td className="kucuk mono">{telFirma(b.tel)}</td>
                    {/* Bayi bağı kurulmamış servis, talebi yalnız
                        coğrafyadan alıyor. Listede görünmesi gerekiyor
                        ki eksik bağ fark edilsin. */}
                    <td className="kucuk">
                      {(b.bayiler || []).length ? (
                        `${b.bayiler.length} bayi`
                      ) : (
                        <span className="sonuk">Bağ yok</span>
                      )}
                    </td>
                    {duzenleyebilir && (
                      <td>
                        <div className="satir" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <button className="dg" onClick={() => setDuzenlenen({ ...b })}>Düzenle</button>
                          <button
                            className="dg"
                            onClick={() => {
                              if (!confirm(`"${b.ad}" listeden çıkarılacak.`)) return
                              kaydet(liste.filter((x) => x.id !== b.id))
                              bildir('Servis çıkarıldı')
                            }}
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {duzenlenen && (
        <Form
          servis={duzenlenen}
          onKapat={() => setDuzenlenen(null)}
          onKaydet={async (b) => {
            sayaciEnAz('servis', liste.length)
            const temiz = { ...b, no: b.no || yeniNo('servis') }
            delete temiz.yeni

            /* Şifre formda düz metin duruyor, kayda özet olarak
               giriyor. Boş bırakıldıysa eski şifre korunuyor —
               "kullanıcı adını düzelteyim" derken şifreyi silmemek
               için. */
            const acikSifre = temiz.yeniSifre
            delete temiz.yeniSifre
            if (acikSifre) {
              temiz.sifre = await sifreHazirla(acikSifre)
              temiz.panelAktif = true
              temiz.ilkGiris = true
            }
            temiz.kullanici = (temiz.kullanici || '').trim().toLocaleLowerCase('tr-TR')
            const yeni = b.yeni
              ? [...liste, temiz]
              : liste.map((x) => (x.id === b.id ? temiz : x))
            kaydet(yeni)
            setDuzenlenen(null)
            bildir(b.yeni ? 'Servis eklendi' : 'Servis güncellendi')
          }}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Sorumluluk bölgesi seçici

   Servisin hangi yerlere baktığını satış personeli burada tanımlıyor.

   BU BİR KISIT DEĞİL, BİR TERCİH. Bölge, personel bir makineye servis
   atarken hangi servisin önce görüneceğini belirliyor. Bölgesi
   girilmemiş servis listeden DÜŞMÜYOR, yalnız sırada geride kalıyor.
   Zorunlu tutulsaydı yeni açılan her servis, kimse ona bölge yazana
   kadar görünmez olurdu.

   İl eklenince varsayılan olarak TÜM İL geliyor. İlçe seçilirse
   yalnız o ilçelere daralıyor. Kural tek cümle: ilçe seçilmediyse
   tüm il.
   ========================================================================== */
function BolgeSecici({ bolge, onDegis }) {
  const [acikIl, setAcikIl] = useState('')
  const secili = bolge.map((b) => b.il)
  const eklenebilir = ILLER.filter((il) => !secili.includes(il))

  function ilEkle(il) {
    if (!il) return
    onDegis([...bolge, { il, ilceler: [] }])
    setAcikIl(il)
  }

  function ilCikar(il) {
    onDegis(bolge.filter((b) => b.il !== il))
    if (acikIl === il) setAcikIl('')
  }

  function ilceDegistir(il, ilce) {
    onDegis(
      bolge.map((b) => {
        if (b.il !== il) return b
        const var_ = (b.ilceler || []).includes(ilce)
        return {
          ...b,
          ilceler: var_
            ? b.ilceler.filter((x) => x !== ilce)
            : [...(b.ilceler || []), ilce],
        }
      }),
    )
  }

  return (
    <div className="alan">
      <span className="alan__ad">Sorumluluk bölgesi (isteğe bağlı)</span>
      <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
        Servis bu bölgelere bakıyorsa makineye servis atanırken listenin
        başında görünür. İlçe seçilmezse ilin tamamı geçerli sayılır.
      </p>

      {bolge.length === 0 && (
        <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
          Bölge girilmedi. Servis yine de atanabilir; kayıtlı il ve
          ilçesine göre listelenir.
        </p>
      )}

      {bolge.map((b) => (
        <div key={b.il} className="kart" style={{ marginBottom: 8, padding: 10 }}>
          <div className="satir" style={{ alignItems: 'center', gap: 8 }}>
            <strong>{b.il}</strong>
            <span className="kucuk sonuk">
              {b.ilceler?.length ? `${b.ilceler.length} ilçe` : 'İlin tamamı'}
            </span>
            <button
              className="dg"
              style={{ marginLeft: 'auto' }}
              onClick={() => setAcikIl(acikIl === b.il ? '' : b.il)}
            >
              {acikIl === b.il ? 'Kapat' : 'İlçe seç'}
            </button>
            <button className="dg" onClick={() => ilCikar(b.il)}>Kaldır</button>
          </div>

          {acikIl === b.il && (
            <div className="suzgec" style={{ marginTop: 8 }}>
              {ilceleriGetir(b.il).map((ilce) => {
                const on = (b.ilceler || []).includes(ilce)
                return (
                  <button
                    key={ilce}
                    className={'cip' + (on ? ' cip--on' : '')}
                    onClick={() => ilceDegistir(b.il, ilce)}
                  >
                    {ilce}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}

      <select className="gir" value="" onChange={(e) => ilEkle(e.target.value)}>
        <option value="">İl ekle</option>
        {eklenebilir.map((il) => (
          <option key={il} value={il}>{il}</option>
        ))}
      </select>
    </div>
  )
}

/* ==========================================================================
   Çalıştığı bayiler

   Zincirin orta halkası: müşteri makineyi bayiden alıyor, servisi de
   o bayinin çalıştığı servis oluyor. Bağ burada kuruluyor çünkü
   bayinin paneli yok.

   Bir servis birden çok bayiyle çalışabiliyor; sahada olan da bu.
   Bağ kurulmazsa sistem çalışmaya devam ediyor, talep coğrafyaya göre
   eşleşiyor — ama o zaman "bu müşteriye kim bakacak" sorusunun cevabı
   tahmin oluyor.
   ========================================================================== */
function BayiSecici({ secili, onDegis }) {
  const bayiler = useMemo(() => bayileriGetir(), [])
  const [ara, setAra] = useState('')

  const q = ara.trim().toLocaleLowerCase('tr-TR')
  const gorunen = q
    ? bayiler.filter((b) =>
        [b.ad, b.il, b.ilce].some((x) =>
          String(x || '').toLocaleLowerCase('tr-TR').includes(q),
        ),
      )
    : bayiler

  function cevir(id) {
    onDegis(secili.includes(id) ? secili.filter((x) => x !== id) : [...secili, id])
  }

  return (
    <div className="alan">
      <span className="alan__ad">Çalıştığı Bayiler</span>
      <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
        {secili.length
          ? `${secili.length} bayi seçili. Bu bayilerden makine alan müşteriye bu servis bakıyor.`
          : 'Bayi seçilmedi. Talepler yalnız il, ilçe ve mesafeye göre eşleşir.'}
      </p>

      <input
        className="gir"
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="Bayi adı veya ili"
        style={{ marginBottom: 8 }}
      />

      <div className="suzgec" style={{ maxHeight: 180, overflow: 'auto' }}>
        {gorunen.map((b) => (
          <button
            key={b.id}
            className={'cip' + (secili.includes(b.id) ? ' cip--on' : '')}
            onClick={() => cevir(b.id)}
          >
            {b.ad} · {b.il}
          </button>
        ))}
        {!gorunen.length && (
          <p className="kucuk sonuk" style={{ margin: 0 }}>Eşleşen bayi yok.</p>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   Cari hesap

   Servis işini kapattığında PAKSAN bir hak ediş hesaplıyor ve bunu
   servisin cari hesabına alacak yazıyor. Ödemeler uzun vadeli:
   hak edişler birikiyor, sezon sonunda ödeniyor. Ödeme yapılacağı gün
   muhasebenin buradaki bilgilere ihtiyacı olacak.

   BUGÜN HENÜZ ÇALIŞMIYOR. Hak ediş ve cari hareket defteri sunucu
   gerektiriyor; servisin telefonundaki bakiye PAKSAN'ın ekranına
   ulaşmıyor (bkz. lib/storage.js). Alanlar bugünden toplanıyor ki o
   gün geldiğinde on dört servis tek tek aranmasın.

   ZORUNLU DEĞİL. Boş bırakılan bir cari kaydı servisin çalışmasını
   engellemiyor; yalnız ödeme sırası geldiğinde eksik görünüyor.

   ------------------------------------------------------------------
   ALANLAR TÜRE GÖRE DEĞİŞİYOR — ETİKET DEĞİL, ALANIN KENDİSİ

   Önce iki tür aynı formu paylaşıyor, yalnız etiketler değişiyordu
   ("Ad Soyad" / "Ticaret unvanı"). Bu yanlıştı: iki türün muhasebesi
   aynı belgeyle yürümüyor.

     ŞAHIS      PAKSAN **gider pusulası** düzenliyor. Gereken: ad
                soyad, T.C. kimlik numarası (11 hane) ve adres.
                Vergi dairesi ile vergi numarası SORULMUYOR — ücretli
                bir gerçek kişinin ikisi de yok, boş bırakılacak iki
                kutu koymak "bir şey eksik" hissi veriyor.

     TÜZEL      Servis kendi **faturasını** kesiyor. Gereken: ticaret
                unvanı, vergi dairesi ve vergi numarası (10 hane).
                Adres faturanın üstünde zaten var, ayrıca sorulmuyor.

   Ortak olan tek şey banka: hangi tür olursa olsun para bir IBAN'a
   gidiyor.

   TÜR SEÇİMİ BU BÖLÜMÜN İÇİNDE. Formun en başında, künye alanlarının
   arasında duruyordu; oysa tek etkisi buradaki alanları belirlemek.
   Seçimle sonucu arasında bir ekran boyu mesafe olması, personelin
   neyi neden seçtiğini görmemesi demekti.
   ========================================================================== */

const CARI_ALAN = {
  sahis: ['unvan', 'vergiNo', 'adres'],
  tuzel: ['unvan', 'vergiDairesi', 'vergiNo'],
}

function CariHesap({ cari, tur, onDegis, onTur }) {
  const yaz = (k) => (e) => onDegis({ ...cari, [k]: e.target.value })
  const sahis = tur === 'sahis'
  /* Doluluk yalnız o türün istediği alanlara bakıyor: tür değişince
     kalan eski değer "dolu" göstermesin. */
  const gerekli = CARI_ALAN[sahis ? 'sahis' : 'tuzel']
  const dolu = gerekli.some((k) => String(cari?.[k] || '').trim())

  return (
    <div className="alan" style={{ marginTop: 18 }}>
      <span className="alan__ad">Cari Hesap (ödeme bilgileri)</span>
      <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
        {dolu
          ? 'Hak ediş ödemesi bu bilgilere göre yapılır.'
          : 'Şimdi doldurmanız gerekmez. Bu bilgiler ödeme yapılacağı zaman gerekir.'}
      </p>

      {/* Tür önce soruluyor: altındaki alanları o belirliyor. */}
      <label className="alan">
        <span className="alan__ad">Servis Türü</span>
        <select className="gir" value={tur} onChange={(e) => onTur(e.target.value)}>
          {Object.entries(SERVIS_TURU).map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </label>
      <p className="kucuk sonuk" style={{ marginTop: -6 }}>
        {sahis
          ? 'Gerçek kişi. Ödeme gider pusulasıyla yapılır; vergi dairesi ve vergi numarası sorulmaz.'
          : 'Tüzel kişi. Servis kendi faturasını keser; vergi dairesi ve vergi numarası gerekir.'}
      </p>

      {sahis ? (
        <>
          <div className="esit">
            <label className="alan">
              <span className="alan__ad">Ad Soyad</span>
              <input className="gir" value={cari.unvan || ''} onChange={yaz('unvan')} />
            </label>
            <label className="alan">
              <span className="alan__ad">T.C. Kimlik No</span>
              <input
                className="gir mono"
                value={cari.vergiNo || ''}
                onChange={(e) => onDegis({ ...cari, vergiNo: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                maxLength={11}
              />
            </label>
          </div>
          {/* Gider pusulasında adres zorunlu alan. */}
          <label className="alan">
            <span className="alan__ad">Adres (gider pusulası için)</span>
            <input className="gir" value={cari.adres || ''} onChange={yaz('adres')} />
          </label>
        </>
      ) : (
        <>
          <label className="alan">
            <span className="alan__ad">Ticaret Unvanı</span>
            <input className="gir" value={cari.unvan || ''} onChange={yaz('unvan')} />
          </label>
          <div className="esit">
            <label className="alan">
              <span className="alan__ad">Vergi Dairesi</span>
              <input className="gir" value={cari.vergiDairesi || ''} onChange={yaz('vergiDairesi')} />
            </label>
            <label className="alan">
              <span className="alan__ad">Vergi No</span>
              <input
                className="gir mono"
                value={cari.vergiNo || ''}
                onChange={(e) => onDegis({ ...cari, vergiNo: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                maxLength={10}
              />
            </label>
          </div>
        </>
      )}

      {/* Banka iki türde de ortak: para bir IBAN'a gidiyor. */}
      <div className="esit">
        <label className="alan">
          <span className="alan__ad">IBAN</span>
          <input
            className="gir mono"
            value={cari.iban || ''}
            onChange={(e) =>
              onDegis({
                ...cari,
                iban: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26),
              })
            }
            placeholder="TR000000000000000000000000"
          />
        </label>
        <label className="alan">
          <span className="alan__ad">Hesap Sahibi</span>
          <input className="gir" value={cari.ibanAd || ''} onChange={yaz('ibanAd')} />
        </label>
      </div>
    </div>
  )
}

function Form({ servis, onKapat, onKaydet }) {
  const [d, setD] = useState(servis)
  const [hata, setHata] = useState('')
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  function kaydet() {
    if (d.ad.trim().length < 2) return setHata('Servis adını yazın.')
    if (!d.il.trim()) return setHata('İl adını yazın.')
    if (!d.tel.replace(/\D/g, '')) return setHata('Telefon numarasını yazın.')
    /* Kullanıcı adı yazıldıysa şifre de olmalı: şifresiz hesap
       giriş yapamaz, ekranda "hesabı var" görünür ve kimse
       neden giremediğini anlamaz. */
    if (d.kullanici?.trim() && !d.sifre && !d.yeniSifre?.trim()) {
      return setHata('Uygulama hesabı için şifre belirleyin.')
    }
    if (d.yeniSifre?.trim() && !/^\d{6}$/.test(d.yeniSifre.trim())) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    setHata('')
    onKaydet(d)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,26,51,.45)',
        display: 'grid', placeItems: 'center', padding: 20, zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onKapat()}
    >
      <div className="kart" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="kart__tepe">
          <h2>{servis.yeni ? 'Yeni servis' : 'Servisi düzenle'}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>
        <div className="kart__ic">
          {/* SERVİS TÜRÜ BURADA DEĞİL, CARİ HESAP BÖLÜMÜNDE.

              Künye alanlarının arasında duruyordu ama künyeyle ilgisi
              yok: tek etkisi cari hesapta hangi alanların isteneceği.
              Seçimle sonucu arasında bir ekran boyu mesafe olması,
              personelin neyi neden seçtiğini görmemesi demekti. */}
          <label className="alan">
            <span className="alan__ad">Servis Adı</span>
            <input className="gir" value={d.ad} onChange={yaz('ad')} autoFocus />
          </label>

          {/* İl ve ilçe elle yazılıyordu. Bölge eşleştirmesi il adının
              birebir tutmasına dayandığı için bir yazım hatası koca bir
              ili yönlendirilemez yapardı; artık listeden seçiliyor. */}
          <div className="esit">
            <label className="alan">
              <span className="alan__ad">İl</span>
              <select
                className="gir"
                value={d.il}
                onChange={(e) => setD({ ...d, il: e.target.value, ilce: '' })}
              >
                <option value="">Seçin</option>
                {ILLER.map((il) => (
                  <option key={il} value={il}>{il}</option>
                ))}
              </select>
            </label>
            <label className="alan">
              <span className="alan__ad">İlçe</span>
              <select className="gir" value={d.ilce} onChange={yaz('ilce')} disabled={!d.il}>
                <option value="">{d.il ? 'Seçin' : 'Önce il'}</option>
                {ilceleriGetir(d.il).map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </label>
          </div>

          <BolgeSecici bolge={d.bolge || []} onDegis={(b) => setD({ ...d, bolge: b })} />

          <label className="alan">
            <span className="alan__ad">Adres</span>
            <input className="gir" value={d.adres} onChange={yaz('adres')} />
          </label>

          {/* Tek telefon alanı. Boşluklar yazılırken kendiliğinden
              geliyor; alana rakam ve baştaki artıdan başka bir şey
              girilemiyor. */}
          <label className="alan">
            <span className="alan__ad">Telefon</span>
            <input
              className="gir mono"
              value={telFirma(d.tel)}
              onChange={(e) => setD({ ...d, tel: telGiris(e.target.value) })}
              inputMode="tel"
              placeholder="0332 321 00 01"
            />
          </label>

          <BayiSecici
            secili={d.bayiler || []}
            onDegis={(b) => setD({ ...d, bayiler: b })}
          />

          <CariHesap
            cari={d.cari || {}}
            tur={d.tur || 'tuzel'}
            onDegis={(c) => setD({ ...d, cari: c })}
            onTur={(t) => setD({ ...d, tur: t })}
          />

          {/* ================================================ Uygulama girişi

              Servis kaydı ile servis hesabı aynı şey; ikiye bölmek iki yerde
              senkron tutulacak liste demek olurdu.

              Hesabı PAKSAN açıyor, servis kendi kaydını oluşturamıyor.
              Şifresini unutursa da PAKSAN'ı arıyor — hesap silme ve
              numara değişikliğindeki kuralın aynısı. */}
          <div className="alan" style={{ marginTop: 18 }}>
            <span className="alan__ad">Uygulama Girişi</span>
            <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
              Servis, kendi uygulamasında yalnızca kendisine düşen talepleri
              görür. Kullanıcı adı boşsa servisin uygulama erişimi yoktur.
            </p>
            <div className="esit">
              <label className="alan">
                <span className="alan__ad">Kullanıcı Adı</span>
                <input
                  className="gir mono"
                  value={d.kullanici || ''}
                  onChange={yaz('kullanici')}
                  placeholder={kullaniciAdiOner(d.ad) || 'servis.adi'}
                />
              </label>
              <label className="alan">
                <span className="alan__ad">
                  {d.sifre ? 'Yeni Şifre (boşsa değişmez)' : 'Şifre'}
                </span>
                <input
                  className="gir mono"
                  value={d.yeniSifre || ''}
                  onChange={yaz('yeniSifre')}
                  placeholder="6 rakam"
                  inputMode="numeric"
                />
              </label>
            </div>
            {d.sifre && (
              <label className="satir" style={{ gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={d.panelAktif !== false}
                  onChange={(e) => setD({ ...d, panelAktif: e.target.checked })}
                />
                <span className="kucuk">Uygulama girişi açık</span>
              </label>
            )}
          </div>

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

/* ----------------------------------------------------------- Excel aktarımı

   Başlık satırı sütun adlarıyla eşleşiyor; sütunların sırası
   değişebilir ama adları değişmemeli. Birden fazla değer yazılacak
   sütunlarda araya virgül konuyor.

   ÇALIŞTIĞI BAYİLER SÜTUNDA YOK. Bayi bağı kimlikle kuruluyor ve
   Excel'de ad yazılırsa iki farklı bayi aynı ada sahip olduğunda
   hangisi olduğu belirsizleşiyor. Toplu yükleme servisin künyesini
   getiriyor; bayi bağı ekrandan kuruluyor.

   CARİ HESAP DA SÜTUNDA YOK. IBAN ve vergi numarası tek tek
   doğrulanması gereken bilgiler; toplu bir dosyadan sessizce
   yüklenmeleri yanlış hesaba ödeme yapılması demek. */

const AKTAR_BASLIK = [
  'Servis Adı', 'Servis Türü', 'İl', 'İlçe', 'Adres', 'Telefon',
]

const ORNEK_SATIR = [
  'Örnek Tarım Servisi',
  'Tüzel kişi',
  'Konya',
  'Selçuklu',
  'Ankara Yolu 12. km No: 5',
  '0332 321 00 00',
  'Servis ve bakım, Yedek parça',
]

const TUR_KOD = { 'şahıs': 'sahis', sahis: 'sahis', 'tüzel kişi': 'tuzel', 'tüzel': 'tuzel', tuzel: 'tuzel' }

function aktarSatiri(b) {
  return [
    b.ad || '',
    SERVIS_TURU[b.tur] || SERVIS_TURU.tuzel,
    b.il || '',
    b.ilce || '',
    b.adres || '',
    telFirma(b.tel),
  ]
}

function iceAl(kayitlar, mevcut, kaydet) {
  const hatalar = []
  const yeniler = []
  sayaciEnAz('servis', mevcut.length)

  kayitlar.forEach((k, i) => {
    const satir = i + 2
    const ad = k['Servis Adı']
    if (!ad) return hatalar.push(`${satir}. satır: servis adı boş, atlandı.`)
    if (!k['İl']) return hatalar.push(`${satir}. satır (${ad}): il boş, atlandı.`)

    yeniler.push({
      id: uid(),
      no: yeniNo('servis'),
      ad,
      /* Tür yazılmamışsa tüzel kişi varsayılıyor: servislerin çoğu
         firma, şahıs olan azınlık. */
      tur: TUR_KOD[String(k['Servis Türü'] || '').trim().toLocaleLowerCase('tr-TR')] || 'tuzel',
      il: k['İl'],
      ilce: k['İlçe'] || '',
      adres: k['Adres'] || '',
      tel: telGiris(k['Telefon'] || ''),
      bayiler: [],
      bolge: [],
      cari: { ...BOS_CARI },
    })
  })

  if (yeniler.length) kaydet([...mevcut, ...yeniler])
  return { eklendi: yeniler.length, atlandi: hatalar.length, hatalar }
}
