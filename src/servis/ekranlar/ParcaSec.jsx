import { useEffect, useMemo, useState } from 'react'
import {
  grubunParcalari,
  katalogGetir,
  parcaAra,
} from '../../lib/parcaKatalogu'
import { MARKA } from '../../marka'
import { Sayfa } from '../Kabuk'
import { ParcaKarti } from '../ParcaKarti'
import { IconAlert, IconRight, IconSearch } from '../../components/Icons'

/* ==========================================================================
   Parça seçimi — PAKSAN'ın kendi kataloğundan

   ÖNCE EKRANDA ON TANE İSİM VARDI

   Servis kaydındaki parça listesi makinenin destek grubuna göre on
   kadar isim gösteriyordu: "Rulman", "Kayış", "Zincir". Sahadaki usta
   parçayı adıyla değil, KATALOGDAKİ RESMİYLE ve KODUYLA tanıyor.
   PAKSAN'ın bastığı fiyat listesinde her parçanın resmi, kodu, adı ve
   fiyatı var; servis zaten o listeye bakıyor. Uygulama da aynı şeyi
   göstermeli.

   ÖNCE ALT MONTAJ, SONRA PARÇA

   538 parça tek listede gösterilemez; gösterilse de kimse sonuna
   kadar kaydırmaz. Fiyat listesi zaten alt montajlara ayrılmış
   (Bağlama Grubu, İp Gerdirme Sistemi, Yaba Şanzumanı…). Ekran de
   aynı sırayı izliyor: önce hangi montajda çalışıldığı seçiliyor,
   sonra o montajın parçaları geliyor.

   ARAMA KESTİRME, ASIL YOL DEĞİL

   Kodu bilen bir servisin 35 grubu gezmesi gereksiz. Arama kutusu
   grup ekranının başında duruyor ama grupların yerini almıyor:
   parçayı adıyla arayan biri "rulman" yazınca 30 sonuç görüyor,
   hangisi olduğunu ancak montajı bilerek ayırt ediyor.

   KATALOG UYGULAMANIN İÇİNDE DEĞİL

   Bu ekran açıldığında liste ağdan iniyor (bkz. lib/parcaKatalogu.js).
   Yükleme, zaman aşımı ve hata durumları gerçek; sunucu geldiğinde
   değişecek tek şey adres.

   KART DÜZENİ FİYAT LİSTESİNİN AYNISI

   Üstte görsel, altında kod, altında ad, en altta fiyat. Servis
   kâğıttaki listeye alışkın; ekranda başka bir sıra kurmak, aynı
   parçayı iki ayrı biçimde ezberlemesini istemek olurdu.
   ========================================================================== */

export function ParcaSec({ secili = [], onBitti, onKapat }) {
  const [durum, setDurum] = useState('yukleniyor')
  const [katalog, setKatalog] = useState(null)
  const [grup, setGrup] = useState(null)
  const [arama, setArama] = useState('')
  /* Seçim kod → adet. Adet servis kaydında ayarlanıyor; burada tek
     dokunuş bir adet ekliyor, ikinci dokunuş seçimi kaldırıyor. */
  const [secim, setSecim] = useState(
    () => new Map(secili.map((p) => [p.kod, Math.max(1, Number(p.adet) || 1)])),
  )

  useEffect(() => {
    let gecerli = true
    setDurum('yukleniyor')
    katalogGetir()
      .then((k) => {
        if (!gecerli) return
        setKatalog(k)
        setDurum('hazir')
      })
      .catch(() => gecerli && setDurum('hata'))
    return () => {
      gecerli = false
    }
  }, [])

  function cevir(parca) {
    setSecim((eski) => {
      const yeni = new Map(eski)
      if (yeni.has(parca.kod)) yeni.delete(parca.kod)
      else yeni.set(parca.kod, 1)
      return yeni
    })
  }

  const sonuclar = useMemo(() => parcaAra(katalog, arama), [katalog, arama])
  const listelenen = arama.trim().length >= 2
    ? sonuclar
    : grup
      ? grubunParcalari(katalog, grup.id)
      : []

  /* KATALOG İNMEDEN SEÇİM KAPANMIYOR. Liste yüklenirken ya da
     inemediğinde "Seçimi Bitir" çalışıyordu; seçilen kodlar katalogda
     aranıp bulunamadığı için boş liste dönüyor ve formdaki seçim
     sessizce siliniyordu. Düğme o durumda kapalı; geri ile çıkmak
     seçime dokunmuyor. */
  function bitir() {
    if (durum !== 'hazir') return
    const secilenler = []
    for (const [kod, adet] of secim) {
      const p = (katalog?.parcalar || []).find((x) => x.kod === kod)
      if (p) secilenler.push({ kod: p.kod, ad: p.ad, fiyat: p.fiyat, adet })
    }
    onBitti(secilenler)
  }

  /* Geri düğmesi bir kademe geri gidiyor: parça listesindeyken
     gruplara, gruplardayken kayda. Telefonda "geri" tek düğme ve iki
     kademeyi birden atlarsa seçim kayboluyor sanılıyor. */
  const geri = () => {
    if (arama.trim()) return setArama('')
    if (grup) return setGrup(null)
    onKapat()
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={grup && !arama.trim() ? grup.ad : 'Parça Seç'}
        alt={
          grup && !arama.trim()
            ? `${MARKA} yedek parça listesi`
            : 'Önce parçanın bağlı olduğu alt montajı seçin'
        }
        onGeri={geri}
        dip={
          <div className="kayit-dip">
            <div className="kayit-dip__hesap">
              <span>Seçilen parçalar</span>
              <strong>{secim.size}</strong>
            </div>
            <button className="dg dg--ana dg--blok" onClick={bitir} disabled={durum !== 'hazir'}>
              Seçimi Bitir
            </button>
          </div>
        }
      >
        {durum === 'yukleniyor' && <Yukleniyor />}
        {durum === 'hata' && (
          <Hata
            onTekrar={() => {
              setDurum('yukleniyor')
              yenidenDene(setDurum, setKatalog)
            }}
          />
        )}

        {durum === 'hazir' && (
          <>
            <label className="ara-kutu">
              <IconSearch size={18} />
              <input
                className="gir"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Parça adı veya kodu"
                aria-label="Parça ara"
              />
            </label>

            {/* Grup listesi: arama boşken ve bir grup seçilmemişken. */}
            {!grup && !arama.trim() && (
              <div className="montaj-liste">
                {(katalog?.gruplar || []).map((g) => (
                  <button key={g.id} className="montaj" onClick={() => setGrup(g)}>
                    <span className="montaj__ad">{g.ad}</span>
                    <span className="montaj__sayi">{g.adet}</span>
                    <IconRight size={18} />
                  </button>
                ))}
              </div>
            )}

            {(grup || arama.trim().length >= 2) && (
              <>
                {arama.trim().length >= 2 && (
                  <p className="ipucu">
                    “{arama.trim()}” için {listelenen.length} parça bulundu.
                  </p>
                )}

                {listelenen.length === 0 ? (
                  <p className="kucuk sonuk">Eşleşen parça yok.</p>
                ) : (
                  <div className="parca-izgara">
                    {listelenen.map((p) => (
                      <ParcaKarti
                        key={p.kod}
                        parca={p}
                        fiyat={p.fiyat}
                        secili={secim.has(p.kod)}
                        onSec={() => cevir(p)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Sayfa>
    </div>
  )
}

/* Yeniden deneme: bellekteki hata zaten silinmiş oluyor
   (bkz. lib/parcaKatalogu.js), tek yapılacak yeni bir istek. */
function yenidenDene(setDurum, setKatalog) {
  katalogGetir()
    .then((k) => {
      setKatalog(k)
      setDurum('hazir')
    })
    .catch(() => setDurum('hata'))
}

/* Yükleme sırasında kartların iskeleti duruyor: boş bir ekran
   "bir şey yok" der, iskelet "geliyor" der. */
function Yukleniyor() {
  return (
    <>
      <p className="ipucu">Parça listesi {MARKA} sunucusundan yükleniyor…</p>
      <div className="parca-izgara">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="parca-kart parca-kart--iskelet">
            <span className="parca-kart__resim" />
            <span className="iskelet-satir iskelet-satir--kisa" />
            <span className="iskelet-satir" />
            <span className="iskelet-satir iskelet-satir--kisa" />
          </div>
        ))}
      </div>
    </>
  )
}

function Hata({ onTekrar }) {
  return (
    <div className="not not--turuncu">
      <IconAlert size={19} />
      <div>
        <strong>Parça listesi yüklenemedi</strong>
        <p>
          Liste {MARKA} sunucusundan geliyor. Bağlantınızı kontrol edip
          yeniden deneyin.
        </p>
        <button className="dg dg--ana dg--blok" style={{ marginTop: 12 }} onClick={onTekrar}>
          Yeniden Dene
        </button>
      </div>
    </div>
  )
}
