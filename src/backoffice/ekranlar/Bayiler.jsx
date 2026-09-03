import { useState } from 'react'
import { bayileriGetirBackoffice, bayileriSifirla, bayileriYaz, izinli, kullaniciAdiOner } from '../veri'
import { sifreHazirla } from '../../lib/hesap'
import { useVeri } from '../kanca'
import { BAYILER, YETKILER } from '../../data/bayiler'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { Baslik, Bekleme, Bos, siraliListe, SiraliBaslik, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { DisaAktar, IceAktar } from './aktar'
import { uid } from '../../lib/storage'
import { yeniNo, sayaciEnAz } from '../../lib/numara'

/* Bayiler.

   Uygulamadaki bayi listesi buradan yönetiliyor. Liste değiştirilirse
   uygulama artık bu listeyi gösteriyor; dokunulmazsa koddaki liste
   geçerli kalıyor.

   Enlem/boylam, bayinin haritada doğru yönde çıkması için gerekli.
   Bilinmiyorsa il merkezinin koordinatı yeterli. */

const BOS_BAYI = {
  ad: '', il: '', ilce: '', adres: '', tel: '', telYazi: '',
  enlem: '', boylam: '', yetki: ['satis'], bolge: [],
}

export function Bayiler({ personel, rol, bildir, tazele, surum }) {
  const duzenleyebilir = izinli(rol, 'bayiDuzenle')
  /* Toplu yükleme yalnız adminde: bir dosya bütün listeyi değiştirebiliyor. */
  const yonetici = izinli(rol, 'personelDuzenle')
  const [duzenlenen, setDuzenlenen] = useState(null)
  const [yerel, setYerel] = useState(null)
  const [il, setIl] = useState('hepsi')
  const [ilce, setIlce] = useState('hepsi')
  const [hizmet, setHizmet] = useState('hepsi')
  const [ara, setAra] = useState('')

  const { veri: kayitli, yukleniyor } = useVeri(() => bayileriGetirBackoffice(), [surum], null)

  const tumBayiler = yerel || kayitli || BAYILER

  const iller = [...new Set(tumBayiler.map((b) => b.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )
  const ilceler = [
    ...new Set(
      tumBayiler.filter((b) => il === 'hepsi' || b.il === il).map((b) => b.ilce).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  /* Bayi adına göre arama.

     İl ve ilçe süzgeçleri "bu bölgede kim var" sorusunu
     cevaplıyordu ama günlük iş çoğu zaman tersi: elde bir bayi adı
     var, telefonu ya da yetkisi aranıyor. Listede yüz kayıt varken
     adı bilinen bayiyi il seçerek bulmak dolambaçlı yoldu.

     Arama ada bakıyor; il, ilçe ve telefon da eşleşiyor ki
     "Bandırma" ya da numaranın son haneleri de bulsun. */
  const suzulmus = tumBayiler.filter((b) => {
    if (il !== 'hepsi' && b.il !== il) return false
    if (ilce !== 'hepsi' && b.ilce !== ilce) return false
    if (hizmet !== 'hepsi' && !(b.yetki || []).includes(hizmet)) return false

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
    hizmet: (b) => (b.yetki || []).length,
  })
  const ozel = Boolean(yerel || kayitli)

  /* Süzgeç açıkken bile kaydetme bütün listeyi yazıyor; ekranda
     görünen alt küme değil. */
  function kaydet(yeniListe) {
    setYerel(yeniListe)
    bayileriYaz(yeniListe, personel, `Bayi listesi güncellendi (${yeniListe.length} bayi)`)
    tazele()
  }

  return (
    <>
      <Baslik
        ad="Bayiler"
        sag={
          duzenleyebilir && (
          <>
            <DisaAktar
              ad="Bayiler"
              basliklar={AKTAR_BASLIK}
              satirlar={liste.map(aktarSatiri)}
              personel={personel}
            />

            {yonetici && (
              <IceAktar
                ad="Bayiler"
                basliklar={AKTAR_BASLIK}
                ornek={ORNEK_SATIR}
                bildir={bildir}
                tazele={tazele}
                personel={personel}
                onVeri={(kayitlar) => iceAl(kayitlar, liste, kaydet)}
              />
            )}

            {ozel && (
              <button
                className="dg"
                onClick={() => {
                  if (!confirm('Koddaki temsilî listeye geri dönülecek. Emin misiniz?')) return
                  bayileriSifirla(personel)
                  setYerel(null)
                  tazele()
                  bildir('Fabrika ayarına dönüldü')
                }}
              >
                Fabrika ayarına dön
              </button>
            )}
            <button
              className="dg dg--ana"
              onClick={() => setDuzenlenen({ ...BOS_BAYI, id: uid(), yeni: true })}
            >
              Bayi ekle
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

        <Secim
          ad="Hizmet"
          deger={hizmet}
          onDegis={setHizmet}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm hizmetler' },
            ...Object.entries(YETKILER).map(([k, ad]) => ({ deger: k, ad })),
          ]}
          genislik={170}
        />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Bayi adı, il/ilçe, telefon"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} bayi</span>
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={5} />
        ) : liste.length === 0 ? (
          <Bos metin="Bu süzgeçle bayi bulunamadı." />
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
                  <SiraliBaslik ad="Bayi" alan="ad" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Telefon" alan="tel" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Hizmet" alan="hizmet" siralama={siralama} onSirala={cevir} />
                  {duzenleyebilir && <th style={{ width: 1 }}></th>}
                </tr>
              </thead>
              <tbody>
                {liste.map((b) => (
                  <tr key={b.id}>
                    <td className="mono kucuk sonuk">{b.no || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{b.ad}</div>
                      <div className="kucuk sonuk">{b.adres}</div>
                    </td>
                    <td className="kucuk">{b.ilce} / {b.il}</td>
                    <td className="kucuk mono">{b.telYazi}</td>
                    <td>
                      <div className="satir" style={{ gap: 4 }}>
                        {(b.yetki || []).map((y) => (
                          <span key={y} className="rz rz--mavi">{YETKILER[y] || y}</span>
                        ))}
                      </div>
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
                              bildir('Bayi çıkarıldı')
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
          bayi={duzenlenen}
          onKapat={() => setDuzenlenen(null)}
          onKaydet={async (b) => {
            sayaciEnAz('bayi', liste.length)
            const temiz = {
              ...b,
              no: b.no || yeniNo('bayi'),
              enlem: Number(b.enlem) || 0,
              boylam: Number(b.boylam) || 0,
            }
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
            bildir(b.yeni ? 'Bayi eklendi' : 'Bayi güncellendi')
          }}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Sorumluluk bölgesi seçici

   Bayinin hangi yerlerden gelen talebe bakacağını satış personeli
   burada tanımlıyor.

   İl eklenince varsayılan olarak TÜM İL sorumluluğu geliyor. İlçe
   seçilirse sorumluluk yalnız o ilçelere daralıyor. Kural tek cümle:
   ilçe seçilmediyse tüm il.
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
      <span className="alan__ad">Sorumluluk Bölgesi</span>
      <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
        Bu bayiye hangi yerlerden gelen talepler düşecek? İlçe seçmezseniz
        bayi tüm ilden sorumlu olur.
      </p>

      {bolge.length === 0 && (
        <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
          Bölge tanımlanmadı. Talepler ile, ilçeye ve mesafeye bakılarak
          eşleştirilmeye devam eder.
        </p>
      )}

      {bolge.map((b) => (
        <div key={b.il} className="kart" style={{ marginBottom: 8, padding: 10 }}>
          <div className="satir" style={{ alignItems: 'center', gap: 8 }}>
            <strong>{b.il}</strong>
            <span className="kucuk sonuk">
              {b.ilceler?.length ? `${b.ilceler.length} ilçe` : 'Tüm il'}
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

function Form({ bayi, onKapat, onKaydet }) {
  const [d, setD] = useState(bayi)
  const [hata, setHata] = useState('')
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  function kaydet() {
    if (d.ad.trim().length < 2) return setHata('Bayi adını yazın.')
    if (!d.il.trim()) return setHata('İl adını yazın.')
    if (!d.tel.replace(/\D/g, '')) return setHata('Telefon numarasını yazın.')
    if (!(d.yetki || []).length) return setHata('En az bir hizmet seçin.')
    /* Kullanıcı adı yazıldıysa şifre de olmalı: şifresiz hesap
       giriş yapamaz, ekranda "hesabı var" görünür ve kimse
       neden giremediğini anlamaz. */
    if (d.kullanici?.trim() && !d.sifre && !d.yeniSifre?.trim()) {
      return setHata('Panel hesabı için şifre belirleyin.')
    }
    if (d.yeniSifre?.trim() && !/^\d{6}$/.test(d.yeniSifre.trim())) {
      return setHata('Şifre 6 rakamdan oluşmalı.')
    }
    setHata('')
    onKaydet({
      ...d,
      tel: d.tel.replace(/\D/g, ''),
      telYazi: d.telYazi.trim() || d.tel,
    })
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
          <h2>{bayi.yeni ? 'Yeni bayi' : 'Bayiyi düzenle'}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>
        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Bayi Adı</span>
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

          <div className="esit">
            <label className="alan">
              <span className="alan__ad">Telefon (tuşlanacak)</span>
              <input className="gir mono" value={d.tel} onChange={yaz('tel')} placeholder="03323210001" />
            </label>
            <label className="alan">
              <span className="alan__ad">Telefon (ekranda görünen)</span>
              <input className="gir mono" value={d.telYazi} onChange={yaz('telYazi')} placeholder="0332 321 00 01" />
            </label>
          </div>

          <div className="esit">
            <label className="alan">
              <span className="alan__ad">Enlem</span>
              <input className="gir mono" value={d.enlem} onChange={yaz('enlem')} placeholder="37.8746" />
            </label>
            <label className="alan">
              <span className="alan__ad">Boylam</span>
              <input className="gir mono" value={d.boylam} onChange={yaz('boylam')} placeholder="32.4932" />
            </label>
          </div>
          <p className="kucuk sonuk" style={{ marginTop: -6 }}>
            Koordinat, bayinin haritada doğru yönde çıkması için. Bilinmiyorsa
            il merkezinin koordinatı yeterli.
          </p>

          <div className="alan">
            <span className="alan__ad">Verdiği Hizmetler</span>
            <div className="suzgec">
              {Object.entries(YETKILER).map(([k, ad]) => {
                const secili = (d.yetki || []).includes(k)
                return (
                  <button
                    key={k}
                    className={'cip' + (secili ? ' cip--on' : '')}
                    onClick={() =>
                      setD({
                        ...d,
                        yetki: secili
                          ? d.yetki.filter((x) => x !== k)
                          : [...(d.yetki || []), k],
                      })
                    }
                  >
                    {ad}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ==================================================== Panel girişi

              Bayi kaydı ile bayi hesabı aynı şey; ikiye bölmek iki yerde
              senkron tutulacak liste demek olurdu.

              Hesabı PAKSAN açıyor, bayi kendi kaydını oluşturamıyor.
              Şifresini unutursa da PAKSAN'ı arıyor — hesap silme ve
              numara değişikliğindeki kuralın aynısı. */}
          <div className="alan" style={{ marginTop: 18 }}>
            <span className="alan__ad">Panel Girişi</span>
            <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
              Bayi, kendi panelinden yalnız kendi bölgesine düşen talepleri
              görür. Kullanıcı adı boşsa bayinin paneli yoktur.
            </p>
            <div className="esit">
              <label className="alan">
                <span className="alan__ad">Kullanıcı Adı</span>
                <input
                  className="gir mono"
                  value={d.kullanici || ''}
                  onChange={yaz('kullanici')}
                  placeholder={kullaniciAdiOner(d.ad) || 'bayi.adi'}
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
                <span className="kucuk">Panel girişi açık</span>
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
   değişebilir ama adları değişmemeli. Hizmet sütununa birden fazla
   hizmet yazılacaksa araya virgül konuyor. */

const AKTAR_BASLIK = [
  'Bayi Adı', 'İl', 'İlçe', 'Adres', 'Telefon (tuşlanacak)',
  'Telefon (görünen)', 'Enlem', 'Boylam', 'Hizmetler',
]

const ORNEK_SATIR = [
    'Örnek Tarım Makineleri',
  'Konya',
  'Selçuklu',
  'Ankara Yolu 12. km No: 5',
  '03323210000',
  '0332 321 00 00',
  '37.8746',
  '32.4932',
  'Satış, Yetkili servis, Yedek parça',
]

const HIZMET_KOD = { 'satış': 'satis', satis: 'satis', 'yetkili servis': 'servis', servis: 'servis', 'yedek parça': 'parca', parca: 'parca' }

function aktarSatiri(b) {
  return [
    b.ad || '',
    b.il || '',
    b.ilce || '',
    b.adres || '',
    b.tel || '',
    b.telYazi || '',
    String(b.enlem ?? ''),
    String(b.boylam ?? ''),
    (b.yetki || []).map((y) => YETKILER[y] || y).join(', '),
  ]
}

function iceAl(kayitlar, mevcut, kaydet) {
  const hatalar = []
  const yeniler = []
  sayaciEnAz('bayi', mevcut.length)

  kayitlar.forEach((k, i) => {
    const satir = i + 2
    const ad = k['Bayi Adı']
    if (!ad) return hatalar.push(`${satir}. satır: bayi adı boş, atlandı.`)
    if (!k['İl']) return hatalar.push(`${satir}. satır (${ad}): il boş, atlandı.`)

    const yetki = String(k['Hizmetler'] || '')
      .split(/[,;/]/)
      .map((x) => HIZMET_KOD[x.trim().toLocaleLowerCase('tr-TR')])
      .filter(Boolean)

    if (!yetki.length) {
      return hatalar.push(`${satir}. satır (${ad}): hizmet okunamadı, atlandı.`)
    }

    yeniler.push({
      id: uid(),
      no: yeniNo('bayi'),
      ad,
      il: k['İl'],
      ilce: k['İlçe'] || '',
      adres: k['Adres'] || '',
      tel: String(k['Telefon (tuşlanacak)'] || '').replace(/\D/g, ''),
      telYazi: k['Telefon (görünen)'] || k['Telefon (tuşlanacak)'] || '',
      enlem: Number(String(k['Enlem'] || '').replace(',', '.')) || 0,
      boylam: Number(String(k['Boylam'] || '').replace(',', '.')) || 0,
      yetki: [...new Set(yetki)],
    })
  })

  if (yeniler.length) kaydet([...mevcut, ...yeniler])
  return { eklendi: yeniler.length, atlandi: hatalar.length, hatalar }
}
