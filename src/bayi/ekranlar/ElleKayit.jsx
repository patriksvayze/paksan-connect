import { useMemo, useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { normalizeSerial, validateSerial } from '../../lib/serial'
import { bayiMakineKaydi } from '../../lib/makineKaydi'
import { musterileriGetir } from '../../backoffice/veri'
import { PARCA_FIYAT } from '../../data/parcaFiyat'
import { Bolum } from '../Kabuk'
import { IconCheckCircle } from '../../components/Icons'

/* ==========================================================================
   Bayi paneli — elle kayıt

   Bayiye doğrudan gelen müşteri için. Uygulamayı kullanmayan, telefonla
   arayan ya da dükkâna gelen çiftçinin talebi de sistemde dursun.

   TELEFON İLK SIRADA — ekranın çalışma biçimi bu.

   Numara yalnız bir alan değil, KİMLİĞİN KENDİSİ: uygulamada hesap
   telefon numarasıyla açılıyor, giriş numarayla yapılıyor, numara
   değişikliği ayrı bir onay süreci. Dolayısıyla numara girildiği anda
   o kişinin kayıtlı olup olmadığı biliniyor.

   Kayıtlıysa ad, il ve ilçe kendiliğinden doluyor ve talep `musteriId`
   ile o hesaba BAĞLANIYOR. Bağlanmasının karşılığı somut: müşteri
   talebi kendi uygulamasında görüyor, durum bildirimleri ona düşüyor,
   PAKSAN da aynı kişinin iki ayrı kaydı olarak görmüyor.

   Önce ad soruluyordu; bayi adı yazdıktan sonra numarayı giriyordu ve
   kayıtlı müşteri de olsa her seferinde yeni bir yabancı kayıt
   doğuyordu.

   YEDEK PARÇA TALEBİNDE PARÇA SEÇİLİYOR

   Talep serbest metinden ibaret kalınca "İstenen parçalar" bölümü boş
   çıkıyor, stok düşümü çalışmıyor ve talep uygulamadan gelenle aynı
   şekilde işlenemiyordu. Parça listesi uygulamadakiyle aynı kaynaktan
   (`parcaFiyat.js`) geliyor.

   YENİ BİR MÜŞTERİ VARLIĞI TANIMLANMIYOR. Kayıtlı olmayan kişi için ad
   ve telefon düz metin alanı olarak kalıyor; uygulama hesabı
   açılmıyor. Hesap açmak müşterinin kendi işi, bayinin değil.

   SERİ NUMARASI GİRİLİRSE makine kayıt defterine de bir satır
   yazılıyor ve `bayiId` DOLU geçiyor. O alan LOGO için tasarlanmıştı
   ve bugün hep boş; bayinin elle açtığı kayıt onu bugünden doldurmaya
   başlıyor.
   ========================================================================== */

const TURLER = [
  { id: 'servis', ad: 'Servis' },
  { id: 'parca', ad: 'Yedek Parça' },
  { id: 'satinalma', ad: 'Fiyat Teklifi' },
]

/* Numaranın yalnız rakamları karşılaştırılıyor: müşteri "0532 111 22 33"
   yazmış olabilir, bayi "532 111 22 33". */
const rakamlar = (v) => String(v || '').replace(/\D/g, '').slice(-10)

export function ElleKayit({ oturum, onKaydedildi }) {
  const [tur, setTur] = useState('servis')
  const [tel, setTel] = useState('')
  const [ad, setAd] = useState('')
  const [il, setIl] = useState(oturum.il || '')
  const [ilce, setIlce] = useState('')
  const [seri, setSeri] = useState('')
  const [parcalar, setParcalar] = useState({})
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')

  /* Kayıtlı müşteriler numaraya göre aranıyor. Sunucu gelene kadar bu
     liste yalnız bu cihazdakileri görüyor; arama biçimi değişmeyecek,
     yalnız kaynağı değişecek. */
  const musteriler = useMemo(() => musterileriGetir(), [])
  const eslesen = useMemo(() => {
    const n = rakamlar(tel)
    if (n.length < 10) return null
    return musteriler.find((m) => rakamlar(m.tel) === n) || null
  }, [tel, musteriler])

  /* Eşleşme bulununca alanlar bir kez dolduruluyor; bayi isterse
     üzerine yazabiliyor (müşteri taşınmış olabilir). */
  function telYaz(v) {
    setTel(v)
    setHata('')
    const n = rakamlar(v)
    if (n.length < 10) return
    const m = musteriler.find((x) => rakamlar(x.tel) === n)
    if (!m) return
    if (!ad.trim()) setAd(m.ad || '')
    if (m.il) setIl(m.il)
    if (m.ilce) setIlce(m.ilce)
  }

  const secilenParcalar = Object.entries(parcalar)
    .filter(([, adet]) => Number(adet) > 0)
    .map(([adi, adet]) => ({ adi, adet: Number(adet) }))

  function kaydet() {
    if (tel.replace(/\D/g, '').length < 10) return setHata('Telefon numarasını yazın.')
    if (ad.trim().length < 3) return setHata('Müşterinin adını yazın.')
    if (!il) return setHata('İl seçin.')
    if (!ilce) return setHata('İlçe seçin.')
    if (tur === 'parca' && !secilenParcalar.length) {
      return setHata('En az bir parça seçin.')
    }

    /* validateSerial başarıda { ok, product, serial, year } döndürüyor,
       hatada { ok: false, hata }. Modeli de o dönüyor, ayrıca
       matchProduct çağırmaya gerek yok. */
    let makine = null
    if (seri.trim()) {
      const sonuc = validateSerial(normalizeSerial(seri))
      if (!sonuc.ok) {
        return setHata('Seri numarası tanınmadı. Boş bırakabilirsiniz.')
      }
      makine = { id: uid(), serial: sonuc.serial, productId: sonuc.product?.id || null }
    }

    const talep = {
      id: uid(),
      no: talepNo(tur),
      createdAt: Date.now(),
      status: 'yeni',
      tur,
      ad: ad.trim(),
      tel: tel.trim(),
      telHam: tel.replace(/\D/g, ''),
      il,
      ilce,
      ulke: 'TR',
      ihracat: false,
      aciklama: aciklama.trim(),
      makine,
      elle: true,
      /* Kayıtlı müşteriyse talep onun hesabına bağlanıyor: kendi
         uygulamasında görüyor, bildirimleri ona düşüyor. */
      musteriId: eslesen?.id || null,
      sahip: 'bayi',
      bayi: { id: oturum.bayiId, ad: oturum.ad, kademe: 'elle', tarih: Date.now() },
    }

    /* Parça talebi uygulamadan gelenle aynı şekli taşıyor; böylece
       "İstenen parçalar" bölümü ve stok düşümü çalışıyor. */
    if (tur === 'parca') {
      talep.parcalar = secilenParcalar.map((p) => p.adi)
      talep.parcaAdet = Object.fromEntries(secilenParcalar.map((p) => [p.adi, p.adet]))
    }

    save('requests', [talep, ...load('requests', [])])

    if (makine) {
      bayiMakineKaydi({
        seri: makine.serial,
        productId: makine.productId,
        musteriId: eslesen?.id || null,
        musteriAd: talep.ad,
        il,
        ilce,
        bayiId: oturum.bayiId,
        bayiAd: oturum.ad,
      })
    }

    onKaydedildi(talep)
  }

  return (
    <>
      <p className="ipucu">
        Uygulamayı kullanmayan, sizi telefonla arayan ya da dükkânınıza
        gelen müşteriler için talep açın.
      </p>

      <div className="kart" style={{ padding: 16 }}>
        <div className="alan">
          <span className="alan__ad">Talep Türü</span>
          <div className="suzgec">
            {TURLER.map((t) => (
              <button
                key={t.id}
                className={'cip' + (tur === t.id ? ' cip--on' : '')}
                onClick={() => { setTur(t.id); setHata('') }}
              >
                {t.ad}
              </button>
            ))}
          </div>
        </div>

        {/* TELEFON İLK. Numara kimliğin kendisi; girildiği anda kayıtlı
            müşteri bulunuyorsa alanlar doluyor. */}
        <label className="alan">
          <span className="alan__ad">Telefon</span>
          <input
            className="gir mono"
            value={tel}
            onChange={(e) => telYaz(e.target.value)}
            placeholder="0532 111 22 33"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
          />
        </label>

        {eslesen && (
          <div className="not not--yesil" style={{ marginTop: 0, marginBottom: 14 }}>
            <IconCheckCircle size={19} />
            <div>
              <strong>PAKSAN Connect kullanıcısı</strong>
              <p>
                {eslesen.ad} · bilgileri dolduruldu. Talep bu hesaba
                bağlanacak; müşteri kendi uygulamasında görecek.
              </p>
            </div>
          </div>
        )}

        <label className="alan">
          <span className="alan__ad">Müşterinin Adı</span>
          <input className="gir" value={ad} onChange={(e) => setAd(e.target.value)} />
        </label>

        <div className="esit">
          <label className="alan">
            <span className="alan__ad">İl</span>
            <select
              className="gir"
              value={il}
              onChange={(e) => { setIl(e.target.value); setIlce('') }}
            >
              <option value="">Seçin</option>
              {ILLER.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="alan">
            <span className="alan__ad">İlçe</span>
            <select className="gir" value={ilce} onChange={(e) => setIlce(e.target.value)} disabled={!il}>
              <option value="">{il ? 'Seçin' : 'Önce il'}</option>
              {ilceleriGetir(il).map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>

        <label className="alan">
          <span className="alan__ad">Makine Seri Numarası (varsa)</span>
          <input
            className="gir mono"
            value={seri}
            onChange={(e) => setSeri(e.target.value)}
            placeholder="ORK1270-2024-00157"
          />
          <span className="kucuk sonuk">
            Yazarsanız makine sizin kaydınıza bağlanır. Model seri
            numarasından bulunuyor.
          </span>
        </label>

        <label className="alan">
          <span className="alan__ad">Müşteri ne anlattı</span>
          <textarea
            className="gir"
            rows={3}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
          />
        </label>

        {hata && <div className="uyari">{hata}</div>}
      </div>

      {/* Parça seçimi yalnız parça talebinde. Uygulamadaki talebin aynı
          şeklini üretiyor: "İstenen parçalar" ve stok düşümü çalışsın. */}
      {tur === 'parca' && (
        <Bolum ad="İstenen Parçalar" sayi={secilenParcalar.length}>
          <div className="kart" style={{ padding: '4px 16px' }}>
            {Object.entries(PARCA_FIYAT).map(([adi, bilgi]) => (
              <div key={adi} className="stok-satir">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{adi}</div>
                  <div className="kucuk sonuk mono">{bilgi.kod}</div>
                </div>
                <input
                  className="gir mono"
                  style={{ width: 82, textAlign: 'right' }}
                  inputMode="numeric"
                  value={parcalar[adi] || ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setParcalar((p) => ({ ...p, [adi]: v }))
                    setHata('')
                  }}
                  placeholder="0"
                  aria-label={adi + ' adedi'}
                />
              </div>
            ))}
          </div>
        </Bolum>
      )}

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={kaydet}>
          Talebi Aç
        </button>
      </div>
    </>
  )
}
