import { useState } from 'react'
import { load, save, uid } from '../../lib/storage'
import { talepNo } from '../../lib/talep'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { normalizeSerial, validateSerial } from '../../lib/serial'
import { bayiMakineKaydi } from '../../lib/makineKaydi'

/* ==========================================================================
   Bayi paneli — elle kayıt

   Bayiye doğrudan gelen müşteri için. Uygulamayı kullanmayan, telefonla
   arayan ya da dükkâna gelen çiftçinin talebi de sistemde dursun.

   YENİ BİR MÜŞTERİ VARLIĞI TANIMLANMIYOR. Aynı talep listesine, aynı
   şekilde bir talep yazılıyor. Talep zaten hesaba bağlı değil: ad,
   telefon, il ve ilçe düz metin alanları.

     elle: true       bayi elle açtı, uygulamadan gelmedi
     musteriId: null  uygulama kullanıcısı değil

   SERİ NUMARASI GİRİLİRSE makine kayıt defterine de bir satır
   yazılıyor ve `bayiId` DOLU geçiyor. O alan LOGO için tasarlanmıştı
   ve bugün hep boş; bayinin elle açtığı kayıt onu bugünden doldurmaya
   başlıyor. Model seri numarasından çıkarılıyor, bayiye ayrıca
   sorulmuyor.
   ========================================================================== */

const TURLER = [
  { id: 'servis', ad: 'Servis' },
  { id: 'parca', ad: 'Yedek Parça' },
  { id: 'satinalma', ad: 'Fiyat Teklifi' },
]

export function ElleKayit({ oturum, onKaydedildi }) {
  const [tur, setTur] = useState('servis')
  const [ad, setAd] = useState('')
  const [tel, setTel] = useState('')
  const [il, setIl] = useState(oturum.il || '')
  const [ilce, setIlce] = useState('')
  const [seri, setSeri] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [hata, setHata] = useState('')

  function kaydet() {
    if (ad.trim().length < 3) return setHata('Müşterinin adını yazın.')
    if (tel.replace(/\D/g, '').length < 10) return setHata('Telefon numarasını yazın.')
    if (!il) return setHata('İl seçin.')
    if (!ilce) return setHata('İlçe seçin.')

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
      musteriId: null,
      sahip: 'bayi',
      bayi: { id: oturum.bayiId, ad: oturum.ad, kademe: 'elle', tarih: Date.now() },
    }

    save('requests', [talep, ...load('requests', [])])

    if (makine) {
      bayiMakineKaydi({
        seri: makine.serial,
        productId: makine.productId,
        musteriId: null,
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
                onClick={() => setTur(t.id)}
              >
                {t.ad}
              </button>
            ))}
          </div>
        </div>

        <label className="alan">
          <span className="alan__ad">Müşterinin Adı</span>
          <input className="gir" value={ad} onChange={(e) => setAd(e.target.value)} />
        </label>

        <label className="alan">
          <span className="alan__ad">Telefon</span>
          <input
            className="gir mono"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="0532 111 22 33"
            type="tel"
            inputMode="tel"
          />
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

      <div className="yapisik">
        <button className="dg dg--ana dg--blok" onClick={kaydet}>
          Talebi Aç
        </button>
      </div>
    </>
  )
}
