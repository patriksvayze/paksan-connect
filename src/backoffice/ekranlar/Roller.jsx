import { useEffect, useState } from 'react'
import {
  rolEkle, rolGuncelle, rolleriGetir, rolSil, rolunPersoneli,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, Bekleme } from './ortak'
import { TALEP_TURU_SECENEKLERI, YETKI_KATALOG } from '../../data/yetkiler'

/* ==========================================================================
   Roller ve Yetkiler

   NEDEN VAR

   Roller kodda sabitti: yeni bir ekip kurmak ya da bir rolün yetkisini
   kısmak kod değişikliği ve yeni derleme gerektiriyordu. Artık admin
   ekrandan yapıyor.

   YETKİ ROL BAZLI, KİŞİ BAZLI DEĞİL. Personel bir role atanıyor,
   yetkisi rolünden geliyor. Aynı roldeki iki kişinin farklı yetkisi
   olamıyor.

   YALNIZ ADMİNDE. Menü satırı `rolYonetimi` iznine bağlı ve o izin
   varsayılan olarak yalnız admin rolünde; başka rolde ekran menüde hiç
   görünmüyor (bkz. Backoffice.jsx → menü süzgeci).

   DÜZEN

   Solda roller, sağda seçilen rolün tamamı — Talepler ve Duyurular'daki
   `ikili` kalıbının aynısı. Matris (rol × yetki) bilerek denenmedi:
   kompakt ama okuması zor; ekranın amacı haftada bir açılıp tek rolün
   ayarını değiştirmek.
   ========================================================================== */

const BOS = { ad: '', aciklama: '', talepTuru: null, izinler: [] }

export function Roller({ personel, bildir, tazele, surum }) {
  const { veri: roller, yukleniyor } = useVeri(rolleriGetir, [surum], [])

  /* `secili` bir rol kimliği ya da 'yeni'. */
  const [secili, setSecili] = useState('admin')
  const [taslak, setTaslak] = useState(BOS)
  const [hata, setHata] = useState('')
  const [silinecek, setSilinecek] = useState(null)

  const acik = secili === 'yeni' ? null : roller.find((r) => r.id === secili)

  /* Seçim değişince form o rolün bilgileriyle dolduruluyor. Yoksa bir
     rolde yapılan yarım değişiklik ötekine taşınıyordu. */
  useEffect(() => {
    setHata('')
    if (secili === 'yeni') return setTaslak(BOS)
    const r = roller.find((x) => x.id === secili)
    if (r) {
      setTaslak({
        ad: r.ad,
        aciklama: r.aciklama || '',
        talepTuru: r.talepTuru || null,
        izinler: r.izinler || [],
      })
    }
  }, [secili, roller])

  /* Silinen rol seçiliyken listede kalmasın */
  useEffect(() => {
    if (secili !== 'yeni' && roller.length && !roller.some((r) => r.id === secili)) {
      setSecili(roller[0].id)
    }
  }, [roller, secili])

  const kilitli = Boolean(acik?.sistem)

  function cevir(izin) {
    setTaslak((t) => ({
      ...t,
      izinler: t.izinler.includes(izin)
        ? t.izinler.filter((x) => x !== izin)
        : [...t.izinler, izin],
    }))
  }

  function kaydet() {
    const sonuc =
      secili === 'yeni'
        ? rolEkle(taslak, personel)
        : rolGuncelle(secili, taslak, personel)

    if (sonuc.hata) return setHata(sonuc.hata)
    setHata('')
    if (secili === 'yeni') setSecili(sonuc.rol.id)
    tazele()
    bildir(secili === 'yeni' ? `${sonuc.rol.ad} rolü oluşturuldu` : 'Rol güncellendi')
  }

  if (yukleniyor) {
    return (
      <>
        <Baslik ad="Roller ve Yetkiler" />
        <Bekleme satir={5} />
      </>
    )
  }

  return (
    <>
      <Baslik ad="Roller ve Yetkiler" />

      <div className="ikili">
        {/* --------------------------------------------------- Rol listesi */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>Roller</h2>
            <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
              {roller.length} rol
            </span>
          </div>

          <div className="kart__ic">
            {roller.map((r) => {
              const kisi = rolunPersoneli(r.id).length
              return (
                <button
                  key={r.id}
                  className={'rol-satir' + (secili === r.id ? ' rol-satir--secili' : '')}
                  onClick={() => setSecili(r.id)}
                >
                  <span className="rol-satir__ad">{r.ad}</span>
                  {r.sistem && <span className="rz rz--gri">Kilitli</span>}
                  <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
                    {kisi} kişi
                  </span>
                </button>
              )
            })}

            <button
              className={'dg dg--blok' + (secili === 'yeni' ? ' dg--ana' : '')}
              style={{ marginTop: 12 }}
              onClick={() => setSecili('yeni')}
            >
              Yeni Rol
            </button>
          </div>
        </div>

        {/* ------------------------------------------------- Rolün ayrıntısı */}
        <div className="kart">
          <div className="kart__tepe">
            <h2>{secili === 'yeni' ? 'Yeni Rol' : acik?.ad}</h2>
          </div>

          <div className="kart__ic">
            {kilitli && (
              <div className="uyari" style={{ marginTop: 0 }}>
                <span>
                  Admin rolü değiştirilemez ve silinemez. Yetkisi kaldırılan admin
                  bu ekranı bir daha açamaz; geri dönüş yolu yoktur.
                </span>
              </div>
            )}

            <label className="alan">
              <span className="alan__ad">Rol Adı</span>
              <input
                className="gir"
                value={taslak.ad}
                disabled={kilitli}
                onChange={(e) => setTaslak({ ...taslak, ad: e.target.value })}
                placeholder="Örnek: Sevkiyat"
                maxLength={40}
              />
            </label>

            <label className="alan">
              <span className="alan__ad">
                Açıklama<span className="sonuk"> · isteğe bağlı</span>
              </span>
              <input
                className="gir"
                value={taslak.aciklama}
                disabled={kilitli}
                onChange={(e) => setTaslak({ ...taslak, aciklama: e.target.value })}
                placeholder="Personel ekranında bu rolün altında görünür."
                maxLength={120}
              />
            </label>

            {/* Talep türü yetkiden AYRI bir soru: "talepleri görür" izni
                hangi talepleri göreceğini söylemiyor. Servis ekibi
                talepleri görüyor ama yalnız servis taleplerini. */}
            <div className="alan">
              <span className="alan__ad">Gördüğü Talepler</span>
              <div className="suzgec">
                {TALEP_TURU_SECENEKLERI.map((s) => (
                  <button
                    key={s.id || 'hepsi'}
                    className={'cip' + ((taslak.talepTuru || null) === s.id ? ' cip--on' : '')}
                    disabled={kilitli}
                    onClick={() => setTaslak({ ...taslak, talepTuru: s.id })}
                  >
                    {s.ad}
                  </button>
                ))}
              </div>
            </div>

            {YETKI_KATALOG.map((g) => (
              <div className="alan" key={g.grup}>
                <span className="alan__ad">{g.grup}</span>
                <div className="yetki-liste">
                  {g.izinler.map((y) => (
                    <label className="yetki" key={y.id}>
                      <input
                        type="checkbox"
                        checked={taslak.izinler.includes(y.id)}
                        disabled={kilitli}
                        onChange={() => cevir(y.id)}
                      />
                      <span>{y.ad}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {hata && <div className="uyari">{hata}</div>}

            {!kilitli && (
              <div className="satir" style={{ gap: 8 }}>
                <button className="dg dg--ana" onClick={kaydet}>
                  {secili === 'yeni' ? 'Rolü Oluştur' : 'Kaydet'}
                </button>
                {secili !== 'yeni' && (
                  <button
                    className="dg"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setSilinecek(acik)}
                  >
                    Rolü Sil
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {silinecek && (
        <SilPenceresi
          rol={silinecek}
          roller={roller}
          onKapat={() => setSilinecek(null)}
          onSil={(yeniRol) => {
            const sonuc = rolSil(silinecek.id, yeniRol, personel)
            if (sonuc.hata) return sonuc.hata
            setSilinecek(null)
            tazele()
            bildir(
              sonuc.tasinan
                ? `${sonuc.silinen.ad} silindi · ${sonuc.tasinan} kişi taşındı`
                : `${sonuc.silinen.ad} silindi`,
            )
            return null
          }}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Silme penceresi

   PERSONEL ROLSÜZ BIRAKILMIYOR. Rolde kişi varsa silme tek başına
   yapılmıyor; hangi role geçecekleri aynı pencerede soruluyor ve iki iş
   tek işlemde tamamlanıyor. Ayrı adımlar olsaydı araya giren bir hata
   kişileri var olmayan bir rolde bırakırdı.
   ========================================================================== */

function SilPenceresi({ rol, roller, onKapat, onSil }) {
  const kisiler = rolunPersoneli(rol.id)
  const secenekler = roller.filter((r) => r.id !== rol.id)
  const [yeniRol, setYeniRol] = useState(secenekler[0]?.id || '')
  const [hata, setHata] = useState('')

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 480 }}>
        <div className="kart__tepe">
          <h2>Rolü Sil · {rol.ad}</h2>
        </div>

        <div className="kart__ic">
          {kisiler.length === 0 ? (
            <p style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
              {rol.ad} rolü silinecek. Bu rolde kimse yok.
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                Bu rolde {kisiler.length} kişi var: {kisiler.map((k) => k.ad).join(', ')}.
                Rol silinince hangi role geçsinler?
              </p>
              <label className="alan">
                <span className="alan__ad">Yeni Rol</span>
                <select
                  className="sec"
                  value={yeniRol}
                  onChange={(e) => setYeniRol(e.target.value)}
                >
                  {secenekler.map((r) => (
                    <option key={r.id} value={r.id}>{r.ad}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => setHata(onSil(kisiler.length ? yeniRol : null) || '')}
            >
              {kisiler.length ? 'Sil ve Taşı' : 'Sil'}
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}
