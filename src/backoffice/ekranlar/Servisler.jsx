import { useMemo, useState } from 'react'
import {
  servisSifreTalebiKapat,
  servisSifreTalepleriGetir,
  servisleriGetirBackoffice,
  servisleriSifirla,
  servisleriYaz,
  izinli,
  kullaniciAdiOner,
} from '../veri'
import { sifreHazirla } from '../../lib/hesap'
import { useVeri } from '../kanca'
import { SERVISLER, HIZMETLER, SERVIS_TURU, bayileriGetir } from '../../marka'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { Baslik, Bekleme, Bos, siraliListe, SiraliBaslik, tarihYaz, useSiralama } from './ortak'
import { Secim, SuzgecCubugu } from './suzgec'
import { DisaAktar, IceAktar } from './aktar'
import { uid } from '../../lib/storage'
import { yeniNo, sayaciEnAz } from '../../lib/numara'

/* Servisler.

   Makineyi kuran, bakımını ve tamirini yapan taraf. Liste buradan
   yönetiliyor; dokunulmazsa koddaki temsilî liste geçerli kalıyor.

   SERVİS SATIŞ YAPMAZ. Kayıtta satış diye bir hizmet yok; makineyi
   satan taraf bayi ve onun ayrı bir ekranı var.

   ÇALIŞTIĞI BAYİLER BU EKRANDA GİRİLİYOR. Bayinin paneli olmadığı için
   bağ servis kaydında duruyor. Müşteriye hangi servisin bakacağı bu
   bağdan çıkıyor: makine → bayi → bayinin servisi.

   Enlem/boylam, servisin haritada doğru yönde çıkması için gerekli.
   Bilinmiyorsa il merkezinin koordinatı yeterli. */

const BOS_SERVIS = {
  ad: '', tur: 'tuzel', il: '', ilce: '', adres: '', tel: '', telYazi: '',
  enlem: '', boylam: '', hizmet: ['servis'], bayiler: [], bolge: [],
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
    <div className="kart" style={{ marginBottom: 14, borderLeft: '3px solid var(--turuncu)' }}>
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
  const [hizmet, setHizmet] = useState('hepsi')
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
    if (hizmet !== 'hepsi' && !(b.hizmet || []).includes(hizmet)) return false

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
    hizmet: (b) => (b.hizmet || []).length,
    bayi: (b) => (b.bayiler || []).length,
  })
  const ozel = Boolean(yerel || kayitli)

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

            {ozel && (
              <button
                className="dg"
                onClick={() => {
                  if (!confirm('Koddaki temsilî listeye geri dönülecek. Emin misiniz?')) return
                  servisleriSifirla(personel)
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

        <Secim
          ad="Hizmet"
          deger={hizmet}
          onDegis={setHizmet}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm hizmetler' },
            ...Object.entries(HIZMETLER).map(([k, ad]) => ({ deger: k, ad })),
          ]}
          genislik={170}
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
                  <SiraliBaslik ad="Hizmet" alan="hizmet" siralama={siralama} onSirala={cevir} />
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
                    <td className="kucuk mono">{b.telYazi}</td>
                    <td>
                      <div className="satir" style={{ gap: 4 }}>
                        {(b.hizmet || []).map((y) => (
                          <span key={y} className="rz rz--mavi">{HIZMETLER[y] || y}</span>
                        ))}
                      </div>
                    </td>
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
            const temiz = {
              ...b,
              no: b.no || yeniNo('servis'),
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
            bildir(b.yeni ? 'Servis eklendi' : 'Servis güncellendi')
          }}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Sorumluluk bölgesi seçici

   Servisin hangi yerlerden gelen talebe bakacağını satış personeli
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
        Bu servise hangi yerlerden gelen talepler düşecek? İlçe seçmezseniz
        servis ilin tamamından sorumlu olur.
      </p>

      {bolge.length === 0 && (
        <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
          Bölge tanımlanmadı. Talepler ile, ilçe ve mesafeye göre
          eşleştirilmeye devam eder.
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

function Form({ servis, onKapat, onKaydet }) {
  const [d, setD] = useState(servis)
  const [hata, setHata] = useState('')
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  function kaydet() {
    if (d.ad.trim().length < 2) return setHata('Servis adını yazın.')
    if (!d.il.trim()) return setHata('İl adını yazın.')
    if (!d.tel.replace(/\D/g, '')) return setHata('Telefon numarasını yazın.')
    if (!(d.hizmet || []).length) return setHata('En az bir hizmet seçin.')
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
          <h2>{servis.yeni ? 'Yeni servis' : 'Servisi düzenle'}</h2>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>Kapat</button>
        </div>
        <div className="kart__ic">
          <div className="esit">
            <label className="alan">
              <span className="alan__ad">Servis Adı</span>
              <input className="gir" value={d.ad} onChange={yaz('ad')} autoFocus />
            </label>
            {/* Hak ediş ödemesi şahsa mı firmaya mı yapılacak — muhasebe
                bunu bilmek zorunda, sonradan sormak yerine burada
                soruluyor. */}
            <label className="alan">
              <span className="alan__ad">Servis Türü</span>
              <select className="gir" value={d.tur || 'tuzel'} onChange={yaz('tur')}>
                {Object.entries(SERVIS_TURU).map(([k, ad]) => (
                  <option key={k} value={k}>{ad}</option>
                ))}
              </select>
            </label>
          </div>

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
            Koordinat, servisin haritada doğru yönde çıkması için. Bilinmiyorsa
            il merkezinin koordinatı yeterli.
          </p>

          <div className="alan">
            <span className="alan__ad">Verdiği Hizmetler</span>
            <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
              Her servis parça bulundurmuyor. Yedek parça talebi yalnız
              parça hizmeti işaretli servislere düşüyor.
            </p>
            <div className="suzgec">
              {Object.entries(HIZMETLER).map(([k, ad]) => {
                const secili = (d.hizmet || []).includes(k)
                return (
                  <button
                    key={k}
                    className={'cip' + (secili ? ' cip--on' : '')}
                    onClick={() =>
                      setD({
                        ...d,
                        hizmet: secili
                          ? d.hizmet.filter((x) => x !== k)
                          : [...(d.hizmet || []), k],
                      })
                    }
                  >
                    {ad}
                  </button>
                )
              })}
            </div>
          </div>

          <BayiSecici
            secili={d.bayiler || []}
            onDegis={(b) => setD({ ...d, bayiler: b })}
          />

          {/* ==================================================== Panel girişi

              Servis kaydı ile servis hesabı aynı şey; ikiye bölmek iki yerde
              senkron tutulacak liste demek olurdu.

              Hesabı PAKSAN açıyor, servis kendi kaydını oluşturamıyor.
              Şifresini unutursa da PAKSAN'ı arıyor — hesap silme ve
              numara değişikliğindeki kuralın aynısı. */}
          <div className="alan" style={{ marginTop: 18 }}>
            <span className="alan__ad">Panel Girişi</span>
            <p className="kucuk sonuk" style={{ margin: '0 0 8px' }}>
              Servis, kendi panelinde yalnızca kendi bölgesine düşen talepleri
              görür. Kullanıcı adı boşsa servisin panel erişimi yoktur.
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
   değişebilir ama adları değişmemeli. Birden fazla değer yazılacak
   sütunlarda araya virgül konuyor.

   ÇALIŞTIĞI BAYİLER SÜTUNDA YOK. Bayi bağı kimlikle kuruluyor ve
   Excel'de ad yazılırsa iki farklı bayi aynı ada sahip olduğunda
   hangisi olduğu belirsizleşiyor. Toplu yükleme servisin künyesini
   getiriyor; bayi bağı ekrandan kuruluyor. */

const AKTAR_BASLIK = [
  'Servis Adı', 'Servis Türü', 'İl', 'İlçe', 'Adres',
  'Telefon (tuşlanacak)', 'Telefon (görünen)', 'Enlem', 'Boylam', 'Hizmetler',
]

const ORNEK_SATIR = [
  'Örnek Tarım Servisi',
  'Tüzel kişi',
  'Konya',
  'Selçuklu',
  'Ankara Yolu 12. km No: 5',
  '03323210000',
  '0332 321 00 00',
  '37.8746',
  '32.4932',
  'Servis ve bakım, Yedek parça',
]

const HIZMET_KOD = {
  'servis ve bakım': 'servis', servis: 'servis', bakım: 'servis',
  'yedek parça': 'parca', parca: 'parca', 'parça': 'parca',
}

const TUR_KOD = { 'şahıs': 'sahis', sahis: 'sahis', 'tüzel kişi': 'tuzel', 'tüzel': 'tuzel', tuzel: 'tuzel' }

function aktarSatiri(b) {
  return [
    b.ad || '',
    SERVIS_TURU[b.tur] || SERVIS_TURU.tuzel,
    b.il || '',
    b.ilce || '',
    b.adres || '',
    b.tel || '',
    b.telYazi || '',
    String(b.enlem ?? ''),
    String(b.boylam ?? ''),
    (b.hizmet || []).map((y) => HIZMETLER[y] || y).join(', '),
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

    const hizmet = String(k['Hizmetler'] || '')
      .split(/[,;/]/)
      .map((x) => HIZMET_KOD[x.trim().toLocaleLowerCase('tr-TR')])
      .filter(Boolean)

    if (!hizmet.length) {
      return hatalar.push(`${satir}. satır (${ad}): hizmet okunamadı, atlandı.`)
    }

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
      tel: String(k['Telefon (tuşlanacak)'] || '').replace(/\D/g, ''),
      telYazi: k['Telefon (görünen)'] || k['Telefon (tuşlanacak)'] || '',
      enlem: Number(String(k['Enlem'] || '').replace(',', '.')) || 0,
      boylam: Number(String(k['Boylam'] || '').replace(',', '.')) || 0,
      hizmet: [...new Set(hizmet)],
      bayiler: [],
    })
  })

  if (yeniler.length) kaydet([...mevcut, ...yeniler])
  return { eklendi: yeniler.length, atlandi: hatalar.length, hatalar }
}
