import { useMemo, useState } from 'react'
import { parcalariGetir, PARCA_DIGER } from '../../data/talepAlanlari'
import { supportGroup, MARKA, markaEk } from '../../marka'
import { extractYear, matchProduct, warrantyStatus, GARANTI_YIL } from '../../lib/serial'
import { parcaAdedi } from '../../lib/servisStok'
import { siparisAc } from '../../lib/servisSiparis'
import {
  ODEME,
  PARCA_DURUMU,
  SURELER,
  YAPILAN_IS,
  parcaYazisi,
  servisKapat,
} from '../../lib/servisKapanis'
import { ekYaz, fotoKucult } from '../../lib/ekler'
import { islemYaz, talepKapat } from '../../backoffice/veri'
import { Bolum, Sayfa } from '../Kabuk'
import {
  IconAlert,
  IconCamera,
  IconCheckCircle,
  IconMinus,
  IconPlus,
  IconShield,
} from '../../components/Icons'

/* ==========================================================================
   Servis kapanışı

   TEK EKRANDA TEK SORU

   Bu ekran önce kaydırılan altı bölümlük bir formdu: belirti, iş,
   parça, ücret, süre, kayıt. Panelin kullanıcısı servis personeli —
   teknoloji bilgisi yüksek olmayabilir, ekranı tarlada, işin sonunda,
   çoğu zaman ayakta açıyor. Altı bölümlük bir form orada
   doldurulmuyor; doldurulursa da geçiştiriliyor.

   Şimdi her ekranda tek soru var. Cevaplar tam genişlikteki
   düğmelerde. Dokunulan cevap bir sonraki soruyu açıyor:

     1. Ne yapıldı?            → dört seçenek
     2. Parça değişti mi?      → üç seçenek, kapıyı bu belirliyor
     3. Seçilen kapıya göre son adım

   En kısa yol iki dokunuş. Yazı yazılan tek yer isteğe bağlı not.

   NE SORULACAĞINA TEŞVİK KARAR VERİYOR

   Hangi kapıda ne sorulduğunun gerekçesi `lib/servisKapanis.js` başında
   yazılı: servisten karşılıksız veri istenmiyor. Garanti kapısında
   ayrıntı sorulabiliyor çünkü form bir rapor değil, bedelsiz parçayı
   almanın kendisi.

   GERİ DÖNÜŞ HER ADIMDA

   Üst çubuktaki geri oku bir önceki soruya dönüyor, ekranı
   kapatmıyor. Yanlış basılan bir cevap kalıcı olmamalı.
   ========================================================================== */

const GARANTI_YAZI = {
  bilinmiyor: () => 'Garanti bilgisi yok',
  devam: (kalan) => `Garanti devam ediyor · ${kalan} yıl`,
  son: () => 'Garantinin son yılı',
  bitti: () => 'Garanti süresi doldu',
}

export function ServisKapanisi({ talep, oturum, onKapat, onBitti }) {
  const [adim, setAdim] = useState('is')
  const [yapilanIs, setYapilanIs] = useState('')
  const [odeme, setOdeme] = useState('')
  const [parcalar, setParcalar] = useState([])
  const [parcaDurumu, setParcaDurumu] = useState('')
  const [foto, setFoto] = useState(null)
  const [sureDk, setSureDk] = useState(null)
  const [kim, setKim] = useState('')
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')
  /* Kapanıştan sonra biten kalem varsa sipariş öneriliyor. */
  const [biten, setBiten] = useState(null)

  const urun = useMemo(
    () => matchProduct(talep.makine?.serial)?.product || null,
    [talep.makine?.serial],
  )
  /* ELİNDEKİ PARÇA ÖNCE.

     Liste on üç satır ve servis kullandığı parçayı arıyor. Kullandığı
     parça, elinde olan parçadır — stokta duranlar başa alınıyor.
     Sıralama içinde eski sıra korunuyor (`sort` kararlı). */
  const parcaSecenekleri = useMemo(() => {
    const liste = parcalariGetir(supportGroup(urun)).filter((p) => p !== PARCA_DIGER)
    return [...liste].sort(
      (a, b) => (parcaAdedi(oturum.servisId, b) > 0) - (parcaAdedi(oturum.servisId, a) > 0),
    )
  }, [urun, oturum.servisId])

  /* "son" = garantinin SON YILI, yani garanti hâlâ sürüyor. Önce
     `!== 'devam'` diye bakılıyordu ve son yılındaki makinede "garanti
     görünmüyor" uyarısı çıkıyordu — oysa o makinenin talebi geçerli. */
  const garantiDurumu = warrantyStatus(extractYear(talep.makine?.serial)).state
  const garantiVar = garantiDurumu === 'devam' || garantiDurumu === 'son'

  function geri() {
    setHata('')
    if (adim === 'is') return onKapat()
    if (adim === 'odeme') return setAdim('is')
    setAdim('odeme')
  }

  function isSec(deger) {
    setYapilanIs(deger)
    setAdim('odeme')
  }

  function odemeSec(deger) {
    setOdeme(deger)
    setAdim(deger === 'yok' ? 'ozet' : deger === 'musteri' ? 'parca' : 'garanti')
  }

  function parcaCevir(ad) {
    setHata('')
    setParcalar((l) =>
      l.some((p) => p.ad === ad)
        ? l.filter((p) => p.ad !== ad)
        : [...l, { ad, adet: 1 }],
    )
  }

  function adetDegistir(ad, fark) {
    setParcalar((l) =>
      l.map((p) => (p.ad === ad ? { ...p, adet: Math.max(1, p.adet + fark) } : p)),
    )
  }

  function bitir() {
    const sonuc = servisKapat({
      servisId: oturum.servisId,
      servisAd: oturum.ad,
      servisNo: oturum.no,
      talep,
      yapilanIs,
      odeme,
      parcalar,
      parcaDurumu,
      foto,
      sureDk,
      kim,
      not,
    })
    if (sonuc.hata) return setHata(sonuc.hata)

    talepKapat(talep, sonuc.cozum, oturum.ad)

    if (sonuc.garantiSiparis) {
      islemYaz({
        tur: 'siparis',
        ozet: `${sonuc.garantiSiparis.no} · garanti talebi · ${talep.no}`,
        personel: oturum.ad,
      })
    }

    /* SİPARİŞ ÖNERİSİ — servisin kapıdan aldığı şey.

       Stok düşünce kalem bitmiş olabilir. Servis bunu kendi fark edip
       sipariş ekranına gitmiyor; ekran soruyor. Stokun doğru olması
       servisin işine burada yarıyor: malsız kalmıyor. */
    const bitenler = (sonuc.parcalar || []).filter(
      (p) => parcaAdedi(oturum.servisId, p.ad) === 0,
    )
    if (odeme === 'musteri' && bitenler.length) {
      return setBiten(bitenler.map((p) => ({ ad: p.ad, adet: p.adet })))
    }
    onBitti()
  }

  function siparisVer() {
    const sonuc = siparisAc({
      servisId: oturum.servisId,
      servisAd: oturum.ad,
      servisNo: oturum.no,
      kalemler: biten.map((p) => ({
        tur: 'parca',
        anahtar: p.ad,
        ad: p.ad,
        adet: p.adet,
      })),
      not: 'Serviste kullanıldı, stok bitti.',
    })
    if (sonuc.hata) return setHata(sonuc.hata)
    islemYaz({
      tur: 'siparis',
      ozet: `${sonuc.siparis.no} · ${parcaYazisi(biten)}`,
      personel: oturum.ad,
    })
    onBitti()
  }

  const BASLIK = {
    is: 'Ne Yapıldı?',
    odeme: 'Parça Değişti mi?',
    parca: 'Hangi Parça Değişti?',
    garanti: 'Garantiden Parça İste',
    ozet: 'İşi Tamamla',
  }

  return (
    <div className="katman">
      <Sayfa
        baslik={biten ? 'Stokta Kalmadı' : BASLIK[adim]}
        alt={talep.no + ' · ' + (talep.ad || '')}
        onGeri={biten ? null : geri}
        dip={
          biten ? (
            <button className="dg dg--ana dg--blok" onClick={siparisVer}>
              {markaEk('a')} Sipariş Ver
            </button>
          ) : adim === 'ozet' ? (
            <button className="dg dg--ana dg--blok" onClick={bitir}>
              İşi Tamamla
            </button>
          ) : adim === 'parca' ? (
            <button className="dg dg--ana dg--blok" onClick={bitir}>
              İşi Tamamla
            </button>
          ) : adim === 'garanti' ? (
            <button className="dg dg--ana dg--blok" onClick={bitir}>
              İşi Tamamla ve Parça İste
            </button>
          ) : null
        }
      >
        {biten ? (
          <BitenStok
            biten={biten}
            onVazgec={onBitti}
          />
        ) : (
          <>
            {adim === 'is' && (
              <Secenekler
                secenekler={YAPILAN_IS.map((x) => ({ deger: x, ad: x }))}
                secili={yapilanIs}
                onSec={isSec}
              />
            )}

            {adim === 'odeme' && (
              <>
                <Secenekler
                  secenekler={[
                    { deger: 'yok', ad: ODEME.yok, alt: 'Parça takılmadı.' },
                    {
                      deger: 'musteri',
                      ad: ODEME.musteri,
                      alt: 'Stokunuzdan düşülecek.',
                    },
                    {
                      deger: 'garanti',
                      ad: ODEME.garanti,
                      alt: `${markaEk('dan')} bedelsiz parça isteyeceksiniz.`,
                    },
                  ]}
                  secili={odeme}
                  onSec={odemeSec}
                />
                {talep.makine?.serial && <Garanti makine={talep.makine} urun={urun} />}
              </>
            )}

            {(adim === 'parca' || adim === 'garanti') && (
              <ParcaSecimi
                secenekler={parcaSecenekleri}
                secili={parcalar}
                servisId={oturum.servisId}
                stokGoster={odeme === 'musteri'}
                onCevir={parcaCevir}
                onAdet={adetDegistir}
              />
            )}

            {adim === 'garanti' && (
              <>
                {/* GARANTİ GEÇERLİLİĞİ TALEP AÇILMADAN SÖYLENİYOR.

                    Süresi dolmuş makine için açılan talep PAKSAN'da
                    reddedilecek; servis bunu haftalar sonra değil
                    burada öğrenmeli. Düğme kapatılmıyor: seri
                    numarası yanlış okunmuş olabilir ve servisi kendi
                    kaydının hatasına hapsetmek doğru değil. */}
                {!garantiVar && (
                  <div className="not not--turuncu">
                    <IconAlert size={19} />
                    <div>
                      <strong>Bu makinenin garantisi görünmüyor.</strong>
                      <p>
                        Talep yine de açılabilir ama {MARKA}{' '}
                        reddedebilir. Seri numarasını kontrol edin.
                      </p>
                    </div>
                  </div>
                )}

                <Bolum ad="Parçanın Nesi Var?">
                  <Secenekler
                    secenekler={PARCA_DURUMU.map((x) => ({ deger: x, ad: x }))}
                    secili={parcaDurumu}
                    onSec={(v) => {
                      setParcaDurumu(v)
                      setHata('')
                    }}
                  />
                </Bolum>

                <Bolum ad="Eski Parçanın Fotoğrafı">
                  <Fotograf foto={foto} onFoto={setFoto} />
                </Bolum>

                <div className="not not--mavi">
                  <IconShield size={19} />
                  <div>
                    <strong>Eski parçayı {markaEk('a')} geri gönderin.</strong>
                    <p>
                      {MARKA} parçayı inceleyecek. Geri gönderilmezse talep
                      açık kalır.
                    </p>
                  </div>
                </div>

                {/* SÜRE VE USTA İSTEĞE BAĞLI.

                    Garanti işçiliği bugün ödenmiyor; ödendiği gün bu
                    iki satır hak ediş belgesinin dayanağı olacak ve
                    zorunluya çevrilecek. Bugün zorunlu yapmak,
                    karşılığı olmayan bir alanı dayatmak olurdu. */}
                <Bolum ad="Süre">
                  <div className="hap-liste">
                    {SURELER.map((s) => (
                      <button
                        key={s.dk}
                        className={'hap' + (sureDk === s.dk ? ' hap--on' : '')}
                        onClick={() => setSureDk(sureDk === s.dk ? null : s.dk)}
                      >
                        {s.ad}
                      </button>
                    ))}
                  </div>
                </Bolum>

                <Bolum ad="İşi Yapan">
                  <label className="alan">
                    <input
                      className="gir"
                      value={kim}
                      onChange={(e) => setKim(e.target.value)}
                      placeholder="Ustanın adı (isteğe bağlı)"
                    />
                  </label>
                </Bolum>
              </>
            )}

            {adim === 'ozet' && <Ozet talep={talep} yapilanIs={yapilanIs} />}

            {(adim === 'parca' || adim === 'garanti' || adim === 'ozet') && (
              <Bolum ad="Not">
                <label className="alan">
                  <textarea
                    className="gir"
                    rows={3}
                    value={not}
                    onChange={(e) => setNot(e.target.value)}
                    placeholder="Eklemek istediğiniz bilgi (isteğe bağlı)"
                  />
                </label>
              </Bolum>
            )}

            {hata && <div className="uyari">{hata}</div>}
          </>
        )}
      </Sayfa>
    </div>
  )
}

/* Cevap listesi. Tam genişlikte satırlar; dokunulan cevap bir sonraki
   soruyu açıyor. Seçili olan kenarıyla da ayrılıyor, yalnız renkle
   değil (renk körlüğü). */
function Secenekler({ secenekler, secili, onSec }) {
  return (
    <div className="secenek">
      {secenekler.map((s) => (
        <button
          key={s.deger}
          className={'buyuk-sec' + (secili === s.deger ? ' buyuk-sec--on' : '')}
          onClick={() => onSec(s.deger)}
        >
          <span className="buyuk-sec__ad">{s.ad}</span>
          {s.alt && <span className="buyuk-sec__alt">{s.alt}</span>}
        </button>
      ))}
    </div>
  )
}

/* Parça seçimi. Açılır kutu YOK: liste hâlinde duruyor, servis
   kullandığına dokunuyor. Tek etkileşim biçimi var — dokunmak.
   Seçilen satırda adet düğmeleri beliriyor. */
function ParcaSecimi({ secenekler, secili, servisId, stokGoster, onCevir, onAdet }) {
  return (
    <Bolum ad="Değişen Parça" sayi={secili.length}>
      {secenekler.map((ad) => {
        const secim = secili.find((p) => p.ad === ad)
        const stok = parcaAdedi(servisId, ad)
        return (
          <div key={ad} className={'parca-satir' + (secim ? ' parca-satir--on' : '')}>
            <button className="parca-satir__ac" onClick={() => onCevir(ad)}>
              <span className="parca-satir__ad">{ad}</span>
              {/* Stok bilinmiyorsa hiçbir şey yazılmıyor. "Stok
                  girilmedi" satırların çoğunda çıkıyor ve hiçbir şey
                  anlatmıyordu; bilginin yokluğu zaten yokluğuyla
                  anlaşılıyor. */}
              {stokGoster && stok !== null && (
                <span className="parca-satir__stok">
                  {stok === 0 ? 'stokta yok' : `stokta ${stok}`}
                </span>
              )}
            </button>

            {secim && (
              <div className="parca-satir__adet">
                <span className="parca-satir__etiket">Adet</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(ad, -1)}
                  aria-label={ad + ' adedini azalt'}
                >
                  <IconMinus size={19} />
                </button>
                <span className="parca-satir__sayi">{secim.adet}</span>
                <button
                  className="stok-dus"
                  onClick={() => onAdet(ad, 1)}
                  aria-label={ad + ' adedini artır'}
                >
                  <IconPlus size={19} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </Bolum>
  )
}

/* Fotoğraf tek kare. Telefonun kamerası doğrudan açılıyor
   (`capture`), galeriye gitmek gerekmiyor. Küçültme `ekler.js`
   içinde; tarladan zayıf şebekeyle 8 MB'lık kare yollanmıyor. */
function Fotograf({ foto, onFoto }) {
  const [adres, setAdres] = useState('')

  async function sec(e) {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    const kucuk = await fotoKucult(dosya)
    const id = await ekYaz(kucuk)
    onFoto({ id, ad: dosya.name, boyut: kucuk.size })
    setAdres(URL.createObjectURL(kucuk))
  }

  return (
    <>
      {adres && <img className="foto-onizleme" src={adres} alt="" />}
      <label className="dg dg--blok">
        <IconCamera size={19} />
        {foto ? 'Fotoğrafı Değiştir' : 'Fotoğraf Çek'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={sec}
          hidden
        />
      </label>
    </>
  )
}

function Garanti({ makine, urun }) {
  const yil = extractYear(makine.serial)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  /* Son yıl da kapsam içi; yeşil kalıyor. */
  const kapsamda = durum.state === 'devam' || durum.state === 'son'

  return (
    <div className={'not ' + (kapsamda ? 'not--yesil' : 'not--mavi')}>
      <IconShield size={19} />
      <div>
        <strong>{(GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor)(kalan)}</strong>
        <p className="mono">
          {makine.serial}
          {urun ? ` · ${urun.name}` : ''}
        </p>
      </div>
    </div>
  )
}

/* Son adım ne olacağını yazıyor. "Emin misiniz?" demiyor — kullanıcı
   neyi onayladığını okuyor. */
function Ozet({ talep, yapilanIs }) {
  return (
    <div className="not not--yesil">
      <IconCheckCircle size={19} />
      <div>
        <strong>{yapilanIs}</strong>
        <p>
          {talep.no} numaralı talep kapanacak ve müşteriye bildirim
          gidecek.
        </p>
      </div>
    </div>
  )
}

function BitenStok({ biten, onVazgec }) {
  return (
    <>
      <div className="not not--turuncu">
        <IconCheckCircle size={19} />
        <div>
          <strong>İş tamamlandı.</strong>
          <p>
            Stokunuzda kalmayan parçalar:{' '}
            {biten.map((p) => p.ad).join(', ')}.
          </p>
        </div>
      </div>

      <Bolum ad="Sipariş">
        <p className="ipucu">
          Aynı parçadan {markaEk('a')} sipariş verelim mi? Aşağıdaki düğme
          siparişi hemen açar.
        </p>
        <button className="dg dg--blok" onClick={onVazgec}>
          Şimdi Değil
        </button>
      </Bolum>
    </>
  )
}
