import { useState } from 'react'
import {
  izinli, kullaniciAdiOner, personelEkle, personelGetir, personelGuncelle,
  personelSil, ROLLER, rolBilgi, BACKOFFICE_SIFRE_HANE,
} from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, siraliListe, SiraliBaslik, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar, IceAktar } from './aktar'
import { demoTemizle, demoVarMi, demoYukle } from '../demo'

/* Personel.

   Backoffice hesapları burada açılıyor. Yönetici listeyi görüyor; ekleme,
   düzenleme ve silme yalnız adminde.

   Şifre 6 rakam — uygulamadaki gibi. Kişi kendi şifresini giriş
   ekranındaki "şifremi unuttum" ile değiştiriyor; admin de buradan
   yeni şifre verebiliyor. */

const BOS_KAYIT = { ad: '', kullanici: '', rol: 'servis', eposta: '', tel: '', sifre: '' }

export function Personel({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'personelDuzenle')
  const [form, setForm] = useState(null)

  const { veri: kayitlar, yukleniyor } = useVeri(() => personelGetir(), [surum], [])

  const { siralama, cevir } = useSiralama('ad', 'artan')
  const liste = siraliListe(kayitlar, siralama, {
    no: (p) => p.no,
    ad: (p) => p.ad,
    kullanici: (p) => p.kullanici,
    rol: (p) => p.rol,
    sonGiris: (p) => p.sonGiris,
    aktif: (p) => Boolean(p.aktif),
  })

  return (
    <>
      <Baslik
        ad="Personel"
        sag={
          <>
            <DisaAktar
              ad="Personel"
              basliklar={AKTAR_BASLIK}
              satirlar={liste.map(aktarSatiri)}
              personel={personel}
            />

            {duzenleyebilir && (
              <>
                <IceAktar
                  ad="Personel"
                  basliklar={AKTAR_BASLIK}
                  ornek={ORNEK_SATIR}
                  bildir={bildir}
                  tazele={tazele}
                  personel={personel}
                  onVeri={(kayitlar) => iceAl(kayitlar, personel)}
                />
                <button
                  className="dg dg--ana"
                  onClick={() => setForm({ ...BOS_KAYIT, yeni: true })}
                >
                  Personel ekle
                </button>
              </>
            )}
          </>
        }
      />

      {yukleniyor ? (
        <BeklemeKart satir={5} />
      ) : (
        <div className="kart">
          {liste.length === 0 ? (
            <Bos metin="Kayıtlı personel yok." />
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
                    <SiraliBaslik ad="Ad Soyad" alan="ad" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik
                      ad="Kullanıcı Adı"
                      alan="kullanici"
                      siralama={siralama}
                      onSirala={cevir}
                    />
                    <SiraliBaslik ad="Rol" alan="rol" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik
                      ad="Son Giriş"
                      alan="sonGiris"
                      siralama={siralama}
                      onSirala={cevir}
                    />
                    <SiraliBaslik ad="Durum" alan="aktif" siralama={siralama} onSirala={cevir} />
                    {duzenleyebilir && <th style={{ width: 1 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {liste.map((p) => (
                    <tr key={p.id}>
                      <td className="mono kucuk sonuk">{p.no}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{p.ad}</div>
                        {p.eposta && <div className="kucuk sonuk">{p.eposta}</div>}
                      </td>
                      <td className="mono kucuk">{p.kullanici}</td>
                      <td className="kucuk">{rolBilgi(p.rol).ad}</td>
                      <td className="kucuk sonuk">
                        {p.sonGiris ? tarihYaz(p.sonGiris) : 'Hiç girmedi'}
                      </td>
                      <td>
                        <span className={'rz rz--' + (p.aktif ? 'yesil' : 'gri')}>
                          {p.aktif ? 'Açık' : 'Kapalı'}
                        </span>
                      </td>
                      {duzenleyebilir && (
                        <td>
                          <div className="satir" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            <button
                              className="dg"
                              onClick={() => setForm({ ...p, sifre: '' })}
                            >
                              Düzenle
                            </button>
                            <button
                              className="dg"
                              onClick={() => {
                                if (!confirm(`"${p.ad}" hesabı silinecek.`)) return
                                const c = personelSil(p.id, personel)
                                tazele()
                                bildir(c.hata || 'Hesap silindi')
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
      )}

      {duzenleyebilir && <DemoKutusu bildir={bildir} tazele={tazele} surum={surum} />}

      {form && (
        <Form
          kayit={form}
          onKapat={() => setForm(null)}
          onKaydet={async (d) => {
            const cevap = d.yeni
              ? await personelEkle(d, personel)
              : await personelGuncelle(d.id, d, personel)
            if (cevap.hata) return cevap.hata
            setForm(null)
            tazele()
            bildir(d.yeni ? 'Personel eklendi' : 'Personel güncellendi')
            return ''
          }}
        />
      )}
    </>
  )
}

/* Demo verisi.

   Backoffice boşken nasıl çalıştığı anlaşılmıyor. Bu kutu uydurma ama
   tutarlı bir veri seti yüklüyor; gerçek kayıtlara dokunmuyor.
   Yayına çıkmadan bu kutu kaldırılmalı. */
function DemoKutusu({ bildir, tazele, surum }) {
  const [calisiyor, setCalisiyor] = useState(false)
  const { veri: dolu } = useVeri(() => demoVarMi(), [surum], false)

  return (
    <div className="kart" style={{ marginTop: 18 }}>
      <div className="kart__tepe">
        <h2>Demo Verisi</h2>
      </div>
      <div className="kart__ic">
        <p className="kucuk sonuk" style={{ margin: '0 0 14px' }}>
          Uydurma personel, müşteri ve talep kayıtları. Gerçek kayıtlara dokunmaz,
          temizlenince tamamen kalkar.
        </p>

        <div className="satir">
          <button
            className="dg"
            disabled={calisiyor || dolu}
            onClick={async () => {
              setCalisiyor(true)
              const s = await demoYukle()
              setCalisiyor(false)
              tazele()
              bildir(
                `${s.personel} personel, ${s.musteri} müşteri, ${s.talep} talep eklendi`
              )
            }}
          >
            {calisiyor ? 'Yükleniyor…' : 'Demo verisini yükle'}
          </button>

          <button
            className="dg"
            disabled={calisiyor || !dolu}
            onClick={() => {
              if (!confirm('Demo kayıtları silinecek. Gerçek kayıtlara dokunulmaz.')) return
              demoTemizle()
              tazele()
              bildir('Demo verisi temizlendi')
            }}
          >
            Demo verisini temizle
          </button>
        </div>
      </div>
    </div>
  )
}

function Form({ kayit, onKapat, onKaydet }) {
  const [d, setD] = useState(kayit)
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  async function kaydet() {
    if (bekliyor) return
    if (d.ad.trim().length < 3) return setHata('Adınızı ve soyadınızı yazın.')
    if (!d.kullanici.trim()) return setHata('Kullanıcı adı yazın.')
    if (d.yeni && d.sifre.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    if (!d.yeni && d.sifre && d.sifre.length !== BACKOFFICE_SIFRE_HANE) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }

    setHata('')
    setBekliyor(true)
    const sonuc = await onKaydet(d)
    setBekliyor(false)
    if (sonuc) setHata(sonuc)
  }

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart">
        <div className="kart__tepe">
          <h2>{d.yeni ? 'Yeni personel' : d.ad}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Ad Soyad</span>
            <input
              className="gir"
              value={d.ad}
              onChange={(e) => {
                const ad = e.target.value
                /* Kullanıcı adı elle değiştirilmediyse addan üretiliyor */
                setD((o) => ({
                  ...o,
                  ad,
                  kullanici:
                    o.kullanici === kullaniciAdiOner(o.ad) || !o.kullanici
                      ? kullaniciAdiOner(ad)
                      : o.kullanici,
                }))
              }}
              autoFocus
            />
          </label>

          <label className="alan">
            <span className="alan__ad">Kullanıcı Adı</span>
            <input className="gir mono" value={d.kullanici} onChange={yaz('kullanici')} />
          </label>

          <div className="alan">
            <span className="alan__ad">Rol</span>
            <div className="suzgec">
              {ROLLER.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={'cip' + (d.rol === r.id ? ' cip--on' : '')}
                  onClick={() => setD({ ...d, rol: r.id })}
                >
                  {r.ad}
                </button>
              ))}
            </div>
            <p className="kucuk sonuk" style={{ margin: '6px 0 0' }}>{ROL_ACIKLAMA[d.rol]}</p>
          </div>

          <div className="esit">
            <label className="alan">
              <span className="alan__ad">E-posta</span>
              <input className="gir" value={d.eposta} onChange={yaz('eposta')} />
            </label>
            <label className="alan">
              <span className="alan__ad">Telefon</span>
              <input className="gir mono" value={d.tel} onChange={yaz('tel')} />
            </label>
          </div>

          <label className="alan">
            <span className="alan__ad">
              {d.yeni ? 'Şifre (6 rakam)' : 'Yeni şifre (değişmeyecekse boş bırakın)'}
            </span>
            <input
              className="gir gir--kod"
              inputMode="numeric"
              maxLength={BACKOFFICE_SIFRE_HANE}
              value={d.sifre}
              onChange={(e) => setD({ ...d, sifre: e.target.value.replace(/\D/g, '') })}
              placeholder="••••••"
            />
          </label>

          {!d.yeni && (
            <label className="secim">
              <input
                type="checkbox"
                checked={d.aktif !== false}
                onChange={(e) => setD({ ...d, aktif: e.target.checked })}
              />
              <span>Hesap açık — kapatılırsa bu kişi backoffice’e giremez</span>
            </label>
          )}

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button className="dg dg--ana" onClick={kaydet} disabled={bekliyor}>
              {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ROL_ACIKLAMA = {
  admin: 'Her şeyi görür; personel açar, müşteri bilgisi düzeltir, numara değişikliğini onaylar.',
  yonetici: 'Tüm talepleri ve kayıtları görür; personel listesini görür ancak değiştiremez.',
  servis: 'Yalnız servis taleplerini görür.',
  parca: 'Yalnız yedek parça taleplerini görür.',
  satis: 'Yalnız fiyat teklifi taleplerini görür.',
}

/* ----------------------------------------------------------- Excel aktarımı

   Dışa aktarımda şifre yok — şifreler zaten saklanmıyor, özetleri
   tutuluyor. İçe aktarımda şifre sütunu var: yeni açılan hesaba ilk
   şifresi buradan veriliyor, kişi girdikten sonra değiştirebiliyor. */

const AKTAR_BASLIK = ['Ad soyad', 'Kullanıcı adı', 'Rol', 'E-posta', 'Telefon']

const ORNEK_SATIR = [
  'Ahmet Yılmaz',
  'ahmet.yilmaz',
  'Servis',
  'ahmet.yilmaz@paksanmakina.com.tr',
  '0532 000 00 00',
]

const ROL_KOD = {
  admin: 'admin',
  yönetici: 'yonetici',
  yonetici: 'yonetici',
  servis: 'servis',
  'yedek parça': 'parca',
  parça: 'parca',
  parca: 'parca',
  satış: 'satis',
  satis: 'satis',
}

function aktarSatiri(p) {
  return [p.ad || '', p.kullanici || '', rolBilgi(p.rol).ad, p.eposta || '', p.tel || '']
}

async function iceAl(kayitlar, yapan) {
  const hatalar = []
  let eklendi = 0

  for (let i = 0; i < kayitlar.length; i++) {
    const k = kayitlar[i]
    const satir = i + 2
    const ad = k['Ad soyad']
    if (!ad) {
      hatalar.push(`${satir}. satır: ad soyad boş, atlandı.`)
      continue
    }

    const rol = ROL_KOD[String(k['Rol'] || '').trim().toLocaleLowerCase('tr-TR')]
    if (!rol) {
      hatalar.push(`${satir}. satır (${ad}): rol okunamadı, atlandı.`)
      continue
    }

    /* İlk şifre rastgele veriliyor; kişi "şifremi unuttum" ile kendi
       şifresini belirliyor. Dosyaya şifre yazdırmıyoruz. */
    const sifre = String(Math.floor(100000 + Math.random() * 900000))

    const cevap = await personelEkle(
      {
        ad,
        kullanici: k['Kullanıcı adı'] || kullaniciAdiOner(ad),
        rol,
        eposta: k['E-posta'] || '',
        tel: k['Telefon'] || '',
        sifre,
      },
      yapan
    )

    if (cevap.hata) hatalar.push(`${satir}. satır (${ad}): ${cevap.hata}`)
    else eklendi++
  }

  return { eklendi, atlandi: hatalar.length, hatalar }
}
