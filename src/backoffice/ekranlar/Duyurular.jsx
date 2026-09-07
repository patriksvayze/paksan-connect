import { useEffect, useRef, useState } from 'react'
import { duyurulariGetir, duyuruSil, duyuruYayinla } from '../veri'
import { ILLER } from '../../data/iller'
import { PRODUCTS } from '../../data/products'
import { bayileriGetir } from '../../data/bayiler.js'
import { useVeri } from '../kanca'
import { Baslik, Bekleme, Bos, tarihYaz } from './ortak'
import { boyutYaz, ekAdresi, ekSil, ekYaz, fotoKucult } from '../../lib/ekler'

/* ==========================================================================
   Duyurular

   NEDEN VAR

   Duyuru altyapısı uygulamada baştan beri duruyordu ama yayınlayacak
   bir ekran yoktu: PAKSAN bir kampanya başlatsa ya da bir güvenlik
   uyarısı yapması gerekse müşteriye ulaşacak yol yoktu.

   MÜŞTERİDE NASIL GÖRÜNÜYOR

   İki yerde birden. Uygulamayı bir sonraki açışında pencere olarak
   çıkıyor (kapatılınca bir daha çıkmıyor), sonrasında Bildirimler
   listesinde kalıcı duruyor. Yalnız listede dursaydı kimse görmezdi;
   yalnız pencere olsaydı kapatan kişi bir daha ulaşamazdı.

   İKİ TÜR — VE ARALARINDAKİ FARK HUKUKİ

     DUYURU  kampanya, yeni ürün, bayi etkinliği. Ticari elektronik
             ileti sayılıyor: 6563 sayılı kanun gereği YALNIZ izin
             veren müşteriye gidiyor. İzin kayıt sırasında alınıyor
             ve profilden geri çekilebiliyor.

     UYARI   güvenlik uyarısı, geri çağırma, kullanım hatası. Hizmete
             ilişkin bildirim; ticari ileti değil, herkese gidiyor.
             Zaten görülmemesi tehlikeli olan şey bu.

   Yanlış türü seçmek hukuki sonuç doğurduğu için ekranda kaç kişiye
   gideceği yayınlamadan önce yazıyor.
   ========================================================================== */

const TURLER = [
  {
    id: 'duyuru',
    ad: 'Duyuru',
    alt: 'Kampanya, yeni ürün, etkinlik',
    kime: 'Yalnız ticari ileti izni veren müşterilere gider.',
    ton: 'mavi',
    /* Kampanya metni son kullanıcıya yazılıyor; bayide gürültü olur. */
    varsayilanKime: 'musteri',
  },
  {
    id: 'uyari',
    ad: 'Önemli uyarı',
    alt: 'Güvenlik uyarısı, geri çağırma',
    kime: 'Tüm müşterilere gider — hizmete ilişkin bildirim, izin gerektirmez.',
    ton: 'turuncu',
    /* Geri çağırma ve güvenlik uyarısı bayiye de gitmeli: makineyi
       elinde tutan, servisi veren, müşteriyi arayacak olan o. */
    varsayilanKime: 'ikisi',
  },
]

/* ==========================================================================
   Kime gidecek

   BU SEÇİM AÇILIR PANELİN İÇİNDEYDİ, ARTIK FORMDA DURUYOR

   Alıcı kitlesi "Seç" düğmesinin arkasında, il ve model süzgeçleriyle
   aynı kutuda duruyordu; özet satırı da hedef seçilmemişken "Herkese
   gidecek" yazıyordu. Oysa varsayılan yalnız müşterilerdi — yayınlanan
   duyuru bayi ekranlarına hiç düşmüyordu ve ekran bunun tersini
   söylüyordu.

   İl ve model bir SÜZGEÇ (kitleyi daraltır), alıcı kitlesi ise bir
   KARAR. İkisi aynı kutuda durmamalı.
   ========================================================================== */

const KIMLER = [
  { id: 'musteri', ad: 'Müşterilere', alt: 'PAKSAN Connect kullanan çiftçiler' },
  { id: 'bayi', ad: 'Bayilere', alt: 'Bayi paneli ve bayi uygulaması' },
  { id: 'ikisi', ad: 'İkisine de', alt: 'Hem müşteri hem bayi ekranları' },
]

const KIME_ADI = Object.fromEntries(KIMLER.map((k) => [k.id, k.ad]))

/* ==========================================================================
   Hedefleme

   Duyuru varsayılan olarak HERKESE gidiyor. Hedef seçilmediği sürece
   kayda `hedef` alanı hiç yazılmıyor; okuma tarafı yokluğu "sınır yok"
   diye anlıyor (bkz. src/lib/duyuruHedef.js).

   Makine tipi ayrı alan değil: kategori seçimi burada ürün
   kimliklerine genişletiliyor, böylece müşterinin telefonunda tek bir
   liste karşılaştırması kalıyor.
   ========================================================================== */

const BOS_HEDEF = { kime: 'musteri', iller: [], bayiler: [], urunler: [] }

function HedefSecici({ hedef, onDegis, bayiler }) {
  const [acik, setAcik] = useState(false)

  const cevir = (alan, deger) => {
    const mevcut = hedef[alan] || []
    onDegis({
      ...hedef,
      [alan]: mevcut.includes(deger)
        ? mevcut.filter((x) => x !== deger)
        : [...mevcut, deger],
    })
  }

  const sinirVar = hedef.iller.length || hedef.bayiler.length || hedef.urunler.length

  return (
    <div className="alan">
      <div className="satir" style={{ alignItems: 'center' }}>
        <span className="alan__ad" style={{ margin: 0 }}>Daraltma</span>
        <button className="dg" style={{ marginLeft: 'auto' }} onClick={() => setAcik(!acik)}>
          {acik ? 'Kapat' : 'Seç'}
        </button>
      </div>
      <p className="kucuk sonuk" style={{ margin: '4px 0 0' }}>
        {sinirVar
          ? ozetle(hedef, bayiler)
          : `${KIME_ADI[hedef.kime]} sınırsız gönderilecek — il, bayi ve model süzgeci yok.`}
      </p>

      {acik && (
        <div className="kart" style={{ padding: 12, marginTop: 8 }}>
          <div className="alan">
            <span className="alan__ad">İller · boş bırakılırsa tüm iller</span>
            <div className="suzgec" style={{ maxHeight: 140, overflow: 'auto' }}>
              {ILLER.map((il) => (
                <button
                  key={il}
                  className={'cip' + (hedef.iller.includes(il) ? ' cip--on' : '')}
                  onClick={() => cevir('iller', il)}
                >
                  {il}
                </button>
              ))}
            </div>
          </div>

          {hedef.kime !== 'musteri' && (
            <div className="alan">
              <span className="alan__ad">Bayiler · boş bırakılırsa tüm bayiler</span>
              <div className="suzgec" style={{ maxHeight: 120, overflow: 'auto' }}>
                {bayiler.map((b) => (
                  <button
                    key={b.id}
                    className={'cip' + (hedef.bayiler.includes(b.id) ? ' cip--on' : '')}
                    onClick={() => cevir('bayiler', b.id)}
                  >
                    {b.ad}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="alan">
            <span className="alan__ad">Makine modeli · boş bırakılırsa tüm makineler</span>
            <div className="suzgec" style={{ maxHeight: 140, overflow: 'auto' }}>
              {PRODUCTS.map((u) => (
                <button
                  key={u.id}
                  className={'cip' + (hedef.urunler.includes(u.id) ? ' cip--on' : '')}
                  onClick={() => cevir('urunler', u.id)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <button className="dg" onClick={() => onDegis(BOS_HEDEF)}>
            Hedefi temizle
          </button>
        </div>
      )}
    </div>
  )
}

/* Yayınlamadan önceki son cümle. Alıcı kitlesi burada da yazıyor:
   yanlış kitleye giden duyuru geri alınamıyor, kaldırılsa bile
   görülmüş oluyor. */
function onayMetni(tur, baslik, kime) {
  const alici =
    kime === 'bayi' ? 'yalnız bayilere'
      : kime === 'ikisi' ? 'hem müşterilere hem de bayilere'
        : 'müşterilere'

  if (tur === 'uyari') {
    return `“${baslik}” başlıklı uyarı ${alici} gidecek. Ekranlarını açtıklarında pencere olarak görecekler; bu bildirim için izin gerekmiyor.`
  }
  /* Ticari ileti izni YALNIZ müşteri tarafında aranıyor. Duyuru
     yalnız bayilere gidiyorsa o cümle konuyla ilgisiz kalıyordu:
     personel, duyuruyu almayacak kitlenin izin kuralını okuyordu. */
  if (kime === 'bayi') {
    return `“${baslik}” başlıklı duyuru ${alici} gidecek. Bayilerde ticari ileti izni aranmaz.`
  }
  return `“${baslik}” başlıklı duyuru ${alici} gidecek. Müşteri tarafında yalnızca ticari ileti izni verenlere ulaşır${kime === 'ikisi' ? '; bayilerde böyle bir izin aranmaz' : ''}.`
}

function ozetle(hedef, bayiler) {
  const parcalar = []
  if (hedef.kime === 'bayi') parcalar.push('Yalnız bayilere')
  else if (hedef.kime === 'ikisi') parcalar.push('Müşteri ve bayilere')
  if (hedef.iller.length) parcalar.push(hedef.iller.join(', '))
  if (hedef.bayiler.length) {
    parcalar.push(
      hedef.bayiler.map((id) => bayiler.find((b) => b.id === id)?.ad || id).join(', ')
    )
  }
  if (hedef.urunler.length) {
    parcalar.push(
      hedef.urunler.map((id) => PRODUCTS.find((u) => u.id === id)?.name || id).join(', ')
    )
  }
  return parcalar.join(' · ')
}

export function Duyurular({ personel, bildir, tazele, surum }) {
  const [tur, setTur] = useState('duyuru')
  const [baslik, setBaslik] = useState('')
  const [metin, setMetin] = useState('')
  const [gorsel, setGorsel] = useState(null)
  const [hata, setHata] = useState('')
  const [onay, setOnay] = useState(false)
  const [silinecek, setSilinecek] = useState(null)
  const [hedef, setHedef] = useState(BOS_HEDEF)

  const { veri: liste, yukleniyor } = useVeri(duyurulariGetir, [surum], [])
  const bayiListesi = bayileriGetir()

  const secili = TURLER.find((x) => x.id === tur)

  function kontrolEt() {
    if (baslik.trim().length < 4) return setHata('Duyuru başlığını yazın.')
    if (metin.trim().length < 10) return setHata('Duyuru metnini yazın.')
    setHata('')
    setOnay(true)
  }

  function yayinla() {
    duyuruYayinla({ tur, baslik, metin, gorsel, hedef }, personel)
    setBaslik('')
    setMetin('')
    setGorsel(null)
    setHedef(BOS_HEDEF)
    setOnay(false)
    tazele()
    bildir('Duyuru yayınlandı')
  }

  return (
    <>
      <Baslik ad="Duyurular" />

      <div className="ikili">
        {/* ------------------------------------------------- Yeni duyuru */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Yeni Duyuru</h2>
          </div>

          <div className="kart__ic">
            <div className="alan">
              <span className="alan__ad">Tür</span>
              <div className="suzgec" style={{ marginBottom: 4 }}>
                {TURLER.map((x) => (
                  <button
                    key={x.id}
                    className={'cip' + (tur === x.id ? ' cip--on' : '')}
                    onClick={() => {
                      setTur(x.id)
                      /* Alıcı kitlesi türe göre başlıyor; personel
                         isterse aşağıdan değiştiriyor. */
                      setHedef((h) => ({ ...h, kime: x.varsayilanKime }))
                    }}
                  >
                    {x.ad}
                  </button>
                ))}
              </div>
              <span className="kucuk sonuk">{secili.alt}</span>
            </div>

            <div className={'uyari'} style={{ marginTop: 12 }}>
              <span>{secili.kime}</span>
            </div>

            {/* ALICI KİTLESİ FORMDA, AÇILIR PANELDE DEĞİL. Gerekçesi
                KIMLER tanımının başında yazılı. */}
            <div className="alan" style={{ marginTop: 14 }}>
              <span className="alan__ad">Kimlere Gidecek</span>
              <div className="suzgec" style={{ marginBottom: 4 }}>
                {KIMLER.map((x) => (
                  <button
                    key={x.id}
                    className={'cip' + (hedef.kime === x.id ? ' cip--on' : '')}
                    onClick={() => setHedef({ ...hedef, kime: x.id })}
                  >
                    {x.ad}
                  </button>
                ))}
              </div>
              <span className="kucuk sonuk">
                {KIMLER.find((x) => x.id === hedef.kime)?.alt}
              </span>
            </div>

            <label className="alan">
              <span className="alan__ad">Başlık</span>
              <input
                className="gir"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                placeholder={
                  tur === 'uyari'
                    ? 'Örnek: Orkinos 1270 · düğüm atıcı kontrolü'
                    : 'Örnek: Sezon öncesi yedek parça kampanyası'
                }
                maxLength={70}
              />
              <span className="kucuk sonuk">
                Telefonun bildiriminde ilk görünen yazı bu. Kısa tutun.
              </span>
            </label>

            <label className="alan">
              <span className="alan__ad">Metin</span>
              <textarea
                className="metin"
                style={{ minHeight: 140 }}
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                /* İpucu alıcıya göre değişiyor: hedef "bayilere"
                   seçilmişken "müşterinin okuyacağı metin" demek,
                   personeli yanlış kitleye yazmaya yönlendiriyordu. */
                placeholder={
                  hedef.kime === 'bayi'
                    ? 'Bayinin okuyacağı metin. Ne olduğunu ve ne yapması gerektiğini yazın.'
                    : 'Müşterinin okuyacağı metin. Ne olduğunu ve ne yapması gerektiğini yazın.'
                }
              />
            </label>

            <GorselAlani gorsel={gorsel} onDegis={setGorsel} />

            <HedefSecici hedef={hedef} onDegis={setHedef} bayiler={bayiListesi} />

            {/* Metin çevrilmiyor: personelin yazdığı cümleyi uygulama
                çeviremez. Yurt dışında müşteri de varsa iki dilde ayrı
                duyuru yayınlanmalı.

                YALNIZ BAYİLERE GİDEN DUYURUDA BU NOT ÇIKMIYOR: bayi
                paneli tek dilli ve bütün bayiler Türkiye'de. Orada
                "İngilizce bir duyuru da yayınlayın" demek, yapılması
                imkânsız bir iş öneriyordu. */}
            {hedef.kime !== 'bayi' && (
              <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
                Yazdığınız metin müşteriye <b>aynen</b> gider; uygulama çeviri yapmaz.
                Yurt dışındaki müşteriler için ayrıca İngilizce bir duyuru yayınlayın.
              </p>
            )}

            {hata && <div className="uyari">{hata}</div>}

            <button className="dg dg--ana" onClick={kontrolEt}>Yayınla</button>
          </div>
        </div>

        {/* ---------------------------------------------- Yayındakiler */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Yayındaki Duyurular</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {liste.length} kayıt
            </span>
          </div>

          <div className="kart__ic">
            {yukleniyor ? (
              <Bekleme satir={4} />
            ) : liste.length === 0 ? (
              <Bos metin="Henüz duyuru yayınlanmadı." />
            ) : (
              liste.map((d) => (
                <div
                  key={d.id}
                  style={{
                    borderBottom: '1px solid var(--cizgi)',
                    paddingBottom: 14,
                    marginBottom: 14,
                  }}
                >
                  <div className="satir" style={{ gap: 10, alignItems: 'center' }}>
                    <span className={'rz rz--' + (d.tur === 'uyari' ? 'turuncu' : 'mavi')}>
                      {d.tur === 'uyari' ? 'Uyarı' : 'Duyuru'}
                    </span>
                    <b>{d.baslik}</b>
                    <button
                      className="dg dg--kucuk"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setSilinecek(d)}
                    >
              Yayından kaldır
                    </button>
                  </div>
                  {d.gorsel && <DuyuruGorseli gorsel={d.gorsel} />}
                  <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{d.metin}</p>
                  <div className="kucuk sonuk" style={{ marginTop: 6 }}>
                    {d.personel} · {tarihYaz(d.tarih)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {onay && (
        <Pencere
          baslik="Duyuruyu yayınla"
          metin={onayMetni(tur, baslik, hedef.kime)}
          onayYazi="Yayınla"
          onOnayla={yayinla}
          onVazgec={() => setOnay(false)}
        />
      )}

      {silinecek && (
        <Pencere
          baslik="Duyuruyu yayından kaldır"
          metin={`"${silinecek.baslik}" yayından kaldırılacak. Duyuruyu daha önce görmüş müşterilerin bildirim listesinden de silinir.`}
          onayYazi="Yayından kaldır"
          onOnayla={() => {
            duyuruSil(silinecek.id, personel)
            setSilinecek(null)
            tazele()
          bildir('Duyuru yayından kaldırıldı')
          }}
          onVazgec={() => setSilinecek(null)}
        />
      )}
    </>
  )
}

function Pencere({ baslik, metin, onayYazi, onOnayla, onVazgec }) {
  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onVazgec()}>
      <div className="kart pencere__kart" style={{ maxWidth: 460 }}>
        <div className="kart__tepe">
          <h2>{baslik}</h2>
        </div>
        <div className="kart__ic">
          <p style={{ margin: '0 0 18px', lineHeight: 1.6 }}>{metin}</p>
          <div className="satir">
            <button className="dg dg--ana" onClick={onOnayla} autoFocus>{onayYazi}</button>
            <button className="dg" onClick={onVazgec}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Duyuru görseli

   ÖNERİLEN ÖLÇÜ 1200 × 675 PİKSEL (16:9). Neden bu:

     · Telefonda duyuru penceresinin genişliği ekranın tamamı; 16:9
       oran, metni ekranın dışına itmeden üste oturuyor.
     · 1200 piksel, yüksek çözünürlüklü telefonlarda da net görünen en
       küçük genişlik. Daha büyüğü tarlada boşuna veri harcıyor.

   Başka oranda bir görsel yüklenirse kırpılmıyor, olduğu gibi
   gösteriliyor — kampanya görselinin yazısı kesilmesin.

   Yüklenen dosya küçültülüyor (uzun kenar 1600 piksel, JPEG). Tasarımcı
   PNG gönderse bile telefona inen dosya küçük kalıyor.
   ========================================================================== */

/* Ölçüler ekranda da yazıyor; tasarımcıya iletilecek bilgi bu. */
export const DUYURU_GORSEL = { en: 1200, boy: 675, mb: 5 }

function GorselAlani({ gorsel, onDegis }) {
  const dosyaRef = useRef(null)
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  async function secildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return

    if (!dosya.type.startsWith('image/')) {
        return setHata('Yalnızca JPG veya PNG görseli yükleyebilirsiniz.')
    }
    if (dosya.size > DUYURU_GORSEL.mb * 1024 * 1024) {
      return setHata(`Dosya çok büyük. En fazla ${DUYURU_GORSEL.mb} MB olmalı.`)
    }

    setHata('')
    setCalisiyor(true)
    try {
      const kucuk = await fotoKucult(dosya)
      const id = await ekYaz(kucuk)
      if (gorsel?.id) await ekSil(gorsel.id).catch(() => {})
      onDegis({ id, ad: dosya.name, boyut: kucuk.size })
    } catch {
      setHata('Görsel okunamadı. Başka bir dosya deneyin.')
    } finally {
      setCalisiyor(false)
    }
  }

  async function kaldir() {
    if (gorsel?.id) await ekSil(gorsel.id).catch(() => {})
    onDegis(null)
  }

  return (
    <div className="alan">
      <span className="alan__ad">
        Görsel<span className="sonuk"> · isteğe bağlı</span>
      </span>

      {gorsel ? (
        <>
          <DuyuruGorseli gorsel={gorsel} />
          <div className="satir" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
            <span className="kucuk sonuk">
              {[gorsel.ad, boyutYaz(gorsel.boyut)].filter(Boolean).join(' · ')}
            </span>
            <button className="dg dg--kucuk" style={{ marginLeft: 'auto' }} onClick={kaldir}>
              Kaldır
            </button>
          </div>
        </>
      ) : (
        <button className="dg" disabled={calisiyor} onClick={() => dosyaRef.current?.click()}>
          {calisiyor ? 'Yükleniyor…' : 'Görsel seç'}
        </button>
      )}

      <input
        ref={dosyaRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={secildi}
      />

      <span className="kucuk sonuk">
        Önerilen ölçü <b>{DUYURU_GORSEL.en} × {DUYURU_GORSEL.boy} piksel</b> (16:9), en fazla{' '}
        {DUYURU_GORSEL.mb} MB · JPG veya PNG. Başka oranda bir görsel kırpılmaz, olduğu gibi
        gösterilir; yazı içeren görsellerde 16:9 dışına çıkmayın.
      </span>

      {hata && <div className="uyari" style={{ marginTop: 10 }}>{hata}</div>}
    </div>
  )
}

/* Görselin kendisi IndexedDB'de; ekranda göstermek için geçici adres
   üretilip çıkarken bırakılıyor. */
function DuyuruGorseli({ gorsel }) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let gecerli = true
    let acik = null
    ekAdresi(gorsel.id).then((a) => {
      if (!gecerli) return a && URL.revokeObjectURL(a)
      acik = a
      setAdres(a)
    })
    return () => {
      gecerli = false
      if (acik) URL.revokeObjectURL(acik)
    }
  }, [gorsel.id])

  if (!adres) return null
  return <img className="duyuru-gorsel" src={adres} alt="" />
}
