import { useEffect, useRef, useState } from 'react'
import {
  rolEkle, rolGuncelle, rolleriGetir, rolSil, rolunPersoneli, rolunTurleri,
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

/* `talepTurleri` boş dizi = bütün türler ("Hepsi"). */
const BOS = { ad: '', aciklama: '', talepTurleri: [], izinler: [] }

/* Rol kaydından form taslağı. */
function taslakYap(r) {
  return {
    ad: r.ad,
    aciklama: r.aciklama || '',
    talepTurleri: rolunTurleri(r) || [],
    izinler: [...(r.izinler || [])],
  }
}

/* Taslak kayıttan farklı mı? Sıra önemsiz: yetkiler işaretlenme
   sırasına göre diziliyor; aynı küme farklı sırada gelebilir. */
function degistiMi(taslak, kayit) {
  if (!kayit) return Boolean(taslak.ad.trim() || taslak.aciklama.trim() || taslak.izinler.length)
  return (
    taslak.ad !== kayit.ad ||
    taslak.aciklama !== (kayit.aciklama || '') ||
    [...taslak.talepTurleri].sort().join() !== [...(rolunTurleri(kayit) || [])].sort().join() ||
    [...taslak.izinler].sort().join() !== [...(kayit.izinler || [])].sort().join()
  )
}

export function Roller({ personel, bildir, tazele, surum }) {
  const { veri: roller, yukleniyor } = useVeri(rolleriGetir, [surum], [])

  /* `secili` bir rol kimliği ya da 'yeni'. */
  const [secili, setSecili] = useState('admin')
  const [taslak, setTaslak] = useState(BOS)
  const [hata, setHata] = useState('')
  const [silinecek, setSilinecek] = useState(null)
  /* Kaydedilmemiş değişiklik varken başka role geçilmek istendi —
     hangi role gidileceği burada bekliyor. */
  const [gecisOnayi, setGecisOnayi] = useState(null)

  const acik = secili === 'yeni' ? null : roller.find((r) => r.id === secili)

  /* TASLAK YALNIZ ROL DEĞİŞİNCE YÜKLENİYOR.

     Önce bağımlılık `[secili, roller]` idi. `roller` her tazelemede
     yeniden okunuyor; arka planda çalışan yeni iş kontrolü 15 saniyede
     bir `tazele()` çağırabiliyor (bkz. Backoffice.jsx → useYeniIsHaberi).
     Aradaki bir tazeleme kullanıcının yarım kalan düzenlemesini
     sessizce silerdi. Bugün silmiyor çünkü liste aynı referansı
     döndürüyor — ama bu bir tesadüftü; kurala dönüştürüldü.

     Hangi rolün yüklendiği `yuklenen` ile tutuluyor; aynı roldeyken
     taslağa dokunulmuyor. */
  const yuklenen = useRef(null)

  useEffect(() => {
    if (yuklenen.current === secili) return
    setHata('')
    yuklenen.current = secili
    if (secili === 'yeni') return setTaslak(BOS)
    const r = roller.find((x) => x.id === secili)
    if (r) setTaslak(taslakYap(r))
    else yuklenen.current = null /* liste henüz gelmedi, tekrar denensin */
  }, [secili, roller])

  /* Silinen rol seçiliyken listede kalmasın */
  useEffect(() => {
    if (secili !== 'yeni' && roller.length && !roller.some((r) => r.id === secili)) {
      setSecili(roller[0].id)
    }
  }, [roller, secili])

  const kilitli = Boolean(acik?.sistem)
  const kaydedilmemis = !kilitli && degistiMi(taslak, acik)

  /* Rol değiştirmeden önce kaydedilmemiş değişiklik varsa soruluyor.
     Önce sessizce atılıyordu: kullanıcı yaptığı düzenlemenin
     kaybolduğunu ancak geri dönünce anlıyordu. */
  function rolSec(id) {
    if (id === secili) return
    if (kaydedilmemis) return setGecisOnayi(id)
    setSecili(id)
  }

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

    /* TASLAK KAYDIN SON HÂLİYLE EŞİTLENİYOR.

       Veri katmanı adı kırpıyor ve katalogda olmayan yetkiyi atıyor;
       taslak kırpılmamış hâlde kalırsa "Kaydedilmedi" rozeti kaydettikten
       sonra da yanmaya devam ederdi. Yükleme kaydı da elle
       güncelleniyor — yeni rolde `secili` hemen değişiyor ama liste
       henüz tazelenmemiş oluyor. */
    const yeni = secili === 'yeni'
    setTaslak(taslakYap(sonuc.rol))
    yuklenen.current = sonuc.rol.id
    if (yeni) setSecili(sonuc.rol.id)

    tazele()
    bildir(yeni ? `${sonuc.rol.ad} rolü oluşturuldu` : 'Rol güncellendi')
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
                  onClick={() => rolSec(r.id)}
                >
                  <span className="rol-satir__ad">{r.ad}</span>
                  {r.sistem && <span className="rz rz--gri">Kilitli</span>}
                  {secili === r.id && kaydedilmemis && (
                    <span className="rz rz--turuncu">Kaydedilmedi</span>
                  )}
                  <span className="kucuk sonuk" style={{ marginLeft: 'auto' }}>
                    {kisi} kişi
                  </span>
                </button>
              )
            })}

            <button
              className={'dg dg--blok' + (secili === 'yeni' ? ' dg--ana' : '')}
              style={{ marginTop: 12 }}
              onClick={() => rolSec('yeni')}
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
            {/* ADMİN HER YETKİYİ TAŞIYOR, YAZILI (22 Eylül 2026). Personel
                "T.C. kimlik numarasının tamamını görür" kutusunu başka
                rollerden kaldırıp Admin hesabıyla talebe baktı; "Göster"
                düğmesi durdu ve bunu hata sandı. Admin'in bu yetkiyi
                taşımaya devam etmesi kullanıcının kararı; ekran bunu
                söylüyor (bkz. veri.js → rolleriGetir). */}
            {kilitli && (
              <div className="uyari" style={{ marginTop: 0 }}>
                <span>
                  Admin rolü değiştirilemez ve silinemez. Bu kısıtlama, Roller ve
                  Yetkiler ekranına erişimin korunmasını sağlar. Admin her zaman tüm
                  yetkilere sahiptir. Başka rollerden kaldırılan yetkiler Admin'de
                  kalır. Talepteki T.C. kimlik veya vergi numarasının tamamını görme
                  yetkisi de buna dahildir.
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
                placeholder="Personel ekranında rol adının altında görünür."
                maxLength={120}
              />
            </label>

            {/* Talep türü yetkiden AYRI bir soru: "talepleri görür" izni
                hangi talepleri göreceğini söylemiyor. Servis ekibi
                talepleri görüyor ama yalnız servis taleplerini.

                BİRDEN ÇOK TÜR SEÇİLEBİLİYOR (21 Eylül 2026, kullanıcının
                isteği): çipler aç-kapa çalışıyor. "Hepsi" seçimi temizliyor;
                hiçbiri seçili değilse ya da üçü birden seçildiyse rol bütün
                talepleri görüyor ve "Hepsi" yanıyor. */}
            <div className="alan">
              <span className="alan__ad">Gördüğü Talepler</span>
              <div className="suzgec">
                {TALEP_TURU_SECENEKLERI.map((s) => {
                  const turler = rolunTurleri({ talepTurleri: taslak.talepTurleri }) || []
                  const secili = s.id === null ? turler.length === 0 : turler.includes(s.id)
                  const degistir = () => {
                    if (s.id === null) return setTaslak({ ...taslak, talepTurleri: [] })
                    const yeni = secili ? turler.filter((t) => t !== s.id) : [...turler, s.id]
                    setTaslak({ ...taslak, talepTurleri: rolunTurleri({ talepTurleri: yeni }) || [] })
                  }
                  return (
                    <button
                      key={s.id || 'hepsi'}
                      className={'cip' + (secili ? ' cip--on' : '')}
                      aria-pressed={secili}
                      disabled={kilitli}
                      onClick={degistir}
                    >
                      {s.ad}
                    </button>
                  )
                })}
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

            {!kilitli && kaydedilmemis && (
              <p className="kucuk sonuk" style={{ margin: '0 0 10px' }}>
                Değişiklikler kaydedilmedi. Kaydet düğmesine basana kadar değişiklikler
                uygulanmaz.
              </p>
            )}

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
          onSil={(tasima) => {
            const sonuc = rolSil(silinecek.id, tasima, personel)
            if (sonuc.hata) return sonuc.hata
            setSilinecek(null)
            tazele()
            bildir(
              sonuc.tasinan
                ? `${sonuc.silinen.ad} rolü silindi · ${sonuc.tasinan} kişi yeni rollerine taşındı`
                : `${sonuc.silinen.ad} rolü silindi`,
            )
            return null
          }}
        />
      )}

      {/* Kaydedilmemiş değişiklikle başka role geçiliyor. */}
      {gecisOnayi && (
        <div
          className="pencere"
          onClick={(e) => e.target === e.currentTarget && setGecisOnayi(null)}
        >
          <div className="kart pencere__kart" style={{ maxWidth: 440 }}>
            <div className="kart__tepe">
              <h2>Kaydedilmemiş Değişiklik Var</h2>
            </div>
            <div className="kart__ic">
              <p style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
                {acik ? `${acik.ad} rolünde` : 'Yeni rolde'} yaptığınız değişiklikler
                kaydedilmedi. Başka bir role geçerseniz bu değişiklikler kaybolur.
              </p>
              <div className="satir">
                <button
                  className="dg dg--ana"
                  onClick={() => {
                    setGecisOnayi(null)
                    setSecili(gecisOnayi)
                  }}
                  autoFocus
                >
                  Değişiklikleri At
                </button>
                <button className="dg" onClick={() => setGecisOnayi(null)}>
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
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

   HERKES AYNI ROLE GİTMİYOR. Önce tek bir açılır liste vardı ve roldeki
   herkes aynı yere taşınmak zorundaydı. Dört kişilik bir ekip
   dağılırken ikisi servise, ikisi satışa geçebilir. Artık her kişinin
   kendi seçimi var.

   ÜSTTE "HEPSİ" SATIRI, çünkü çoğu zaman gerçekten hepsi aynı yere
   gidiyor: tek dokunuşla hepsi ayarlanıyor, sonra ayrılacak kişi tek
   tek değiştiriliyor. Kişi sayısı ikiden fazlaysa çıkıyor; iki kişide
   iki listeyi elle seçmek zaten daha hızlı.
   ========================================================================== */

function SilPenceresi({ rol, roller, onKapat, onSil }) {
  const kisiler = rolunPersoneli(rol.id)
  const secenekler = roller.filter((r) => r.id !== rol.id)

  /* VARSAYILAN ADMİN OLAMAZ. Liste admin ile başlıyor; hazır gelen
     seçimi değiştirmeden "Sil ve Taşı" diyen kişi bütün ekibi admin
     yapardı. Varsayılan ilk sıradaki yetkisiz rol; admin seçilebiliyor
     ama isteyerek seçiliyor. */
  const ilk = (secenekler.find((r) => !r.sistem) || secenekler[0])?.id || ''

  /* { personelId: yeniRolId } — `rolSil` bu haritayı bekliyor. */
  const [tasima, setTasima] = useState(() =>
    Object.fromEntries(kisiler.map((k) => [k.id, ilk])),
  )
  const [hata, setHata] = useState('')

  const hepsiAyni = new Set(Object.values(tasima)).size <= 1

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 520 }}>
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
              <p style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
                {rol.ad} rolü silinecek. Bu roldeki {kisiler.length} kişinin her biri
                için yeni bir rol seçin.
              </p>

              {kisiler.length > 2 && (
                <label className="tasima tasima--hepsi">
                  <span className="tasima__ad">Hepsi</span>
                  <select
                    className="sec"
                    value={hepsiAyni ? Object.values(tasima)[0] || ilk : ''}
                    onChange={(e) =>
                      setTasima(
                        Object.fromEntries(kisiler.map((k) => [k.id, e.target.value])),
                      )
                    }
                  >
                    {!hepsiAyni && <option value="">Karışık</option>}
                    {secenekler.map((r) => (
                      <option key={r.id} value={r.id}>{r.ad}</option>
                    ))}
                  </select>
                </label>
              )}

              {kisiler.map((k) => (
                <label className="tasima" key={k.id}>
                  <span className="tasima__ad">{k.ad}</span>
                  <select
                    className="sec"
                    value={tasima[k.id] || ''}
                    onChange={(e) => setTasima({ ...tasima, [k.id]: e.target.value })}
                  >
                    {secenekler.map((r) => (
                      <option key={r.id} value={r.id}>{r.ad}</option>
                    ))}
                  </select>
                </label>
              ))}
            </>
          )}

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir" style={{ marginTop: 14 }}>
            <button
              className="dg dg--ana"
              onClick={() => setHata(onSil(kisiler.length ? tasima : null) || '')}
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
