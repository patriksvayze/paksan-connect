import { useEffect, useMemo, useState } from 'react'
import { kampanyaSonDegisiklik } from '../../lib/rizaKaydi'
import { izinli, musteriGuncelle, musterileriGetir, rolunTalepleri, talepleriGetir, TALEP_ADI } from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, DurumRozet, gecenSure, siraliListe, SiraliBaslik,
  tarihSaat, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { getProduct } from '../../data/katalog/products.js'
import { formatSerial, warrantyStatus } from '../../lib/serial'
import { telFirma, telGoster } from '../../lib/tel'
import { musterininServisleri } from '../../lib/servisAtama'
import { talepSahibiBulucu } from '../../lib/musteriEslesmesi'

/* Müşteriler.

   Telefon çaldığında "kim arıyor, hangi makinesi var, geçmişte ne
   sormuş" sorusunun tek ekranda cevabı. Rolden bağımsız: her ekip aynı
   müşteri kaydını görüyor, düzeltmeyi yalnız admin yapıyor.

   Telefon numarası buradan değiştirilmiyor. Numara hesabın kimliği;
   değişikliği müşterinin kendi talebi üzerinden, seri numarasıyla
   doğrulanarak yapılıyor (Numara Talepleri ekranı). */

export function Musteriler({ personel, rol, bildir, tazele, surum, git, sorgu }) {
  const [ara, setAra] = useState('')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [makineli, setMakineli] = useState('hepsi')
  const [il, setIl] = useState('hepsi')
  const [ilce, setIlce] = useState('hepsi')
  const [secili, setSecili] = useState(null)
  const [duzenlenen, setDuzenlenen] = useState(null)

  /* Başka ekrandan belirli bir müşterinin kartı açılabiliyor (8 Ekim 2026:
     Geri Bildirimler → Müşteri Kartını Aç). */
  useEffect(() => {
    if (sorgu?.musteriId) setSecili(sorgu.musteriId)
  }, [sorgu])

  const { veri: musteriler, yukleniyor } = useVeri(() => musterileriGetir(), [surum], [])
  /* Rolün görmediği talep türü burada da görünmüyor (22 Eylül 2026,
     kullanıcının kuralı: servis, yedek parça ve satış birbirinin
     talebini görmez). Önce müşteri detayındaki ve makine geçmişindeki
     listeler bütün talepleri gösteriyordu; satır tıklanmasa da içeriği
     okunuyordu. Sayılar da aynı listeden çıkıyor. */
  const { veri: talepler } = useVeri(() => rolunTalepleri(talepleriGetir(), rol), [surum, rol], [])

  /* MÜŞTERİNİN TALEPLERİ TEK EŞLEŞMEDEN (25 Eylül 2026, kullanıcı
     sınaması Y3). Talep müşteriye telefonun harfi harfine eşitliğiyle
     bağlanıyordu (`t.telHam === m.tel`): hesap numarası boşluklu
     saklanıyor, Servisim'in elle açtığı talep rakam ya da sıfırlı yazıyor.
     Servisin kayıtlı müşteriye açtığı iş karttan, sayıdan ve Excel'den
     düşüyordu; talepteki `musteriId`ye hiç bakılmıyordu. Kural artık tek
     yerde (lib/musteriEslesmesi.js): önce hesap kimliği, yoksa ülke kodlu
     telefon, yazılıştan bağımsız; servis siparişi kimsenin değil. Sayı,
     sıralama, kart ve Excel aynı haritadan okuyor. */
  const talepHaritasi = useMemo(() => {
    const bul = talepSahibiBulucu(musteriler)
    const harita = new Map()
    for (const t of talepler) {
      const id = bul(t)?.kayit?.id
      if (!id) continue
      if (!harita.has(id)) harita.set(id, [])
      harita.get(id).push(t)
    }
    return harita
  }, [musteriler, talepler])
  const kendiTalepleri = (m) => talepHaritasi.get(m.id) || []

  const { siralama, cevir } = useSiralama('createdAt', 'azalan')

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    return musteriler.filter((m) => {
      if (!araliktaMi(m.createdAt, aralik)) return false
      if (il !== 'hepsi' && m.il !== il) return false
      if (ilce !== 'hepsi' && m.ilce !== ilce) return false
      const makineSayisi = (m.makineler || []).length
      if (makineli === 'var' && !makineSayisi) return false
      if (makineli === 'yok' && makineSayisi) return false
      if (!q) return true

      const seriler = (m.makineler || []).map((x) => x.serial)
      const alanlar = [m.no, m.ad, m.tel, m.il, m.ilce, ...seriler]
      if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
        return true
      }

      /* Telefonun son haneleri veya seri numarasının bir bölümü de
         bulunmalı; boşluklar aramayı bozmasın. */
      const qRakam = q.replace(/\D/g, '')
      if (!qRakam) return false
      return [m.no, m.tel, ...seriler]
        .filter(Boolean)
        .some((x) => String(x).replace(/\D/g, '').includes(qRakam))
    })
  }, [musteriler, ara, aralik, makineli, il, ilce])

  const liste = useMemo(
    () =>
      siraliListe(suzulmus, siralama, {
        no: (m) => m.no,
        ad: (m) => m.ad,
        konum: (m) => m.il,
        makine: (m) => (m.makineler || []).length,
        talep: (m) => (talepHaritasi.get(m.id) || []).length,
        createdAt: (m) => m.createdAt,
      }),
    [suzulmus, siralama, talepHaritasi]
  )

  const iller = [...new Set(musteriler.map((m) => m.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )
  const ilceler = [
    ...new Set(
      musteriler.filter((m) => il === 'hepsi' || m.il === il).map((m) => m.ilce).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'tr'))

  const acik = secili ? musteriler.find((m) => m.id === secili) : liste[0]

  if (yukleniyor) {
    return (
      <>
        <Baslik ad="Müşteriler" />
        <BeklemeKart satir={5} />
      </>
    )
  }

  return (
    <>
      <Baslik
        ad="Müşteriler"
        sag={
          <DisaAktar
            ad="Müşteriler"
            basliklar={AKTAR_BASLIK}
            satirlar={liste.map((m) => aktarSatiri(m, kendiTalepleri(m)))}
            personel={personel}
          />
        }
      />

      <SuzgecCubugu>
        <Secim
          ad="Makine"
          deger={makineli}
          onDegis={setMakineli}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'var', ad: 'Makinesi olanlar' },
            { deger: 'yok', ad: 'Makinesi olmayanlar' },
          ]}
          genislik={175}
        />

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
          genislik={140}
        />

        <Secim
          ad="İlçe"
          deger={ilce}
          onDegis={setIlce}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm ilçeler' },
            ...ilceler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={140}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
      placeholder="Müşteri numarası, ad, telefon, seri numarası"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} kayıt</span>
      </SuzgecCubugu>

      {liste.length === 0 ? (
        <div className="kart"><Bos metin="Bu süzgeçle müşteri bulunamadı." /></div>
      ) : (
        <div className="ikili">
          <div className="kart">
            <div className="tablo-sar">
              <table>
                <thead>
                  <tr>
                    <SiraliBaslik
                      ad="No"
                      alan="no"
                      siralama={siralama}
                      onSirala={cevir}
                      genislik={110}
                    />
                    <SiraliBaslik ad="Müşteri" alan="ad" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Makine" alan="makine" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Talep" alan="talep" siralama={siralama} onSirala={cevir} />
                  </tr>
                </thead>
                <tbody>
                  {liste.map((m) => (
                    <tr
                      key={m.id}
                      className={'tiklanir' + (acik?.id === m.id ? ' secili' : '')}
                      onClick={() => setSecili(m.id)}
                    >
                      <td className="mono kucuk sonuk">{m.no || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.ad}</div>
                        <div className="kucuk sonuk mono">{telGoster(m.ulke, m.tel)}</div>
                        {m.birlesti && (
                          <div className="kucuk sonuk">
                            {m.birlesti.hesapNo || '—'} numaralı hesapla birleştirildi
                          </div>
                        )}
                      </td>
                      <td className="kucuk">{m.ilce ? `${m.ilce} / ${m.il}` : m.il || '—'}</td>
                      <td className="kucuk">{m.makineler?.length || 0}</td>
                      <td className="kucuk">{kendiTalepleri(m).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="kart">
            {acik ? (
              <Detay
                musteri={acik}
                talepler={kendiTalepleri(acik)}
                duzenleyebilir={izinli(rol, 'musteriDuzenle')}
                onDuzenle={() => setDuzenlenen({ ...acik })}
                /* Talebe gidiş yalnız o talebi Talepler ekranında
                   görebilen personele açık: ekrana yetkisi yoksa ya da
                   rolü başka bir talep türüne bağlıysa (satış personeli
                   servis talebini görmüyor) satır tıklanmıyor. Tıklanıp
                   boş bir ekran açılsaydı personel talebin silindiğini
                   sanardı. */
                talebeGidebilir={(t) =>
                  Boolean(git) && izinli(rol, 'talepler') && rolunTalepleri([t], rol).length > 0
                }
                onTalebeGit={(t) => git('talepler', { durum: 'hepsi', talep: t.id })}
              />
            ) : (
              <Bos metin="Müşteri seçin." />
            )}
          </div>
        </div>
      )}

      {duzenlenen && (
        <Form
          musteri={duzenlenen}
          onKapat={() => setDuzenlenen(null)}
          onKaydet={(d) => {
            musteriGuncelle(duzenlenen, d, personel)
            setDuzenlenen(null)
            tazele()
            bildir('Müşteri bilgisi güncellendi')
          }}
        />
      )}
    </>
  )
}

function Detay({ musteri, talepler, duzenleyebilir, onDuzenle, talebeGidebilir, onTalebeGit }) {
  /* Liste zaten bu müşterinin talepleri (yukarıdaki talepHaritasi). */
  const kendi = talepler
  const servisSatirlari = musterininServisleri(musteri.makineler || []).hepsi

  return (
    <>
      <div className="kart__tepe">
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{musteri.ad}</div>
          <div className="mono" style={{ fontSize: 15, marginTop: 3 }}>
            {musteri.no ? musteri.no + ' · ' : ''}
            {telGoster(musteri.ulke, musteri.tel)}
          </div>
        </div>
        {duzenleyebilir && (
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onDuzenle}>
            Düzenle
          </button>
        )}
      </div>

      <div className="kart__ic">
        {/* ==================================== Birleştirilmiş hesap

            Seri çakışması talebi onaylandığında eski hesabın makineleri
            ve talepleri yeni hesaba geçiyor (bkz. veri.js →
            hesaplariBirlestir). Geriye kalan eski kayıt, açıklaması
            olmadan makinesi boşalmış sıradan bir müşteri gibi
            görünüyordu; telefon çaldığında personel makinenin nereye
            gittiğini bilemiyordu. */}
        {musteri.birlesti && (
          <p
            className="kucuk"
            style={{
              margin: '0 0 16px',
              padding: '11px 14px',
              borderRadius: 'var(--r)',
              background: 'var(--mavi-z)',
              lineHeight: 1.55,
            }}
          >
            Bu hesaptaki makineler, makine kayıtları ve talepler{' '}
            <span className="mono">{musteri.birlesti.hesapNo || '—'}</span> numaralı hesaba
            taşındı ({tarihYaz(musteri.birlesti.tarih)}). Müşteri kayıtlarına
            yeni numarasıyla açtığı hesaptan erişebilir.
          </p>
        )}

        <Bolum ad="Bilgiler">
          <S k="Müşteri numarası" v={musteri.no} mono />
          <S k="Konum" v={musteri.ilce ? `${musteri.ilce} / ${musteri.il}` : musteri.il} />
          <S k="Makineyi aldığı yer" v={musteri.satici} />
          <S k="Kayıt Tarihi" v={tarihYaz(musteri.createdAt)} />
          <S k="Bildirim İzni" v={IZIN[musteri.bildirim?.izin]} />
          {/* KVKK onayının sürümü ve tarihi, kampanya izninin son
              değiştiği gün (29 Eylül 2026, gizlilik incelemesi). Önce
              yalnız "Var / Yok" yazıyordu; iznin ne zaman verildiği ya
              da geri alındığı sorulunca cevap yoktu. */}
          <S k="KVKK onayı" v={kvkkOnayi(musteri.onaylar)} />
          <S k="Kampanya izni" v={kampanyaIzni(musteri.onaylar)} />
        </Bolum>

        {musteri.onaylar?.olaylar?.length > 0 && (
          <Bolum ad="Onay geçmişi">
            <ul className="onay-gecmisi" data-onay-gecmisi>
              {[...musteri.onaylar.olaylar].reverse().map((o, i) => (
                <li key={i}>
                  <span className="sonuk">{tarihYaz(o.tarih)}</span>{' '}
                  {RIZA_METIN_ADI[o.metin] || o.metin} · {RIZA_ISLEM_ADI[o.secim] || o.secim} ·{' '}
                  {RIZA_KANAL_ADI[o.kanal] || o.kanal} · sürüm {o.surum}
                </li>
              ))}
            </ul>
          </Bolum>
        )}

        {/* ============================================ Servisi

            "Bu müşteriye kim bakıyor" sorusu telefonda en sık sorulan
            şey ve cevabı bugüne kadar bu ekranda yoktu: personel
            Kayıtlı Makineler ekranına gidip seri numarası aramak
            zorunda kalıyordu.

            Cevap makineden geliyor (bkz. lib/servisAtama.js), o yüzden
            makine listesinin hemen üstünde duruyor. Birden çok makine
            farklı servislere bağlıysa hepsi yazılıyor — tek satıra
            indirmek yanlış bilgi olurdu.

            SERVİSİ YOKSA UYARI ÇIKIYOR: o müşteri uygulamadan servis
            talebi açamıyor ve bunu arayan personelin bilmesi
            gerekiyor. */}
        <Bolum ad="Servisi">
          {servisSatirlari.length === 0 ? (
            <div className="uyari" style={{ margin: 0, display: 'block' }}>
              <b>Servis atanmamış.</b>
              <p className="kucuk" style={{ margin: '6px 0 0' }}>
                Bu müşteri uygulamadan servis talebi açamıyor. Kayıtlı
                Makineler ekranından makinesine servis atayın.
              </p>
            </div>
          ) : (
            servisSatirlari.map((x) => (
              <div key={x.makine.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{x.servis.ad}</div>
                <div className="kucuk sonuk">
                  {[x.servis.ilce, x.servis.il].filter(Boolean).join(' / ')}
                  {' · '}
                  {telFirma(x.servis.tel)}
                </div>
                <div className="kucuk sonuk">
                  {formatSerial(x.makine.serial)}
                  {x.kaynak === 'bayi' ? ' · bayisinden' : ' · elle atandı'}
                  {x.bayi ? ` · ${x.bayi.ad}` : ''}
                </div>
              </div>
            ))
          )}
        </Bolum>

        <Bolum ad={`Makineler · ${musteri.makineler?.length || 0}`}>
          {(musteri.makineler || []).length === 0 ? (
            <p className="kucuk sonuk" style={{ margin: 0 }}>Kayıtlı makine yok.</p>
          ) : (
            musteri.makineler.map((m) => {
              const p = getProduct(m.productId)
              const g = warrantyStatus(m.year)
              return (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>
                    {p?.name || m.productId}
                    {m.nickname ? ` · ${m.nickname}` : ''}
                  </div>
                  <div className="kucuk sonuk mono">{formatSerial(m.serial)}</div>
                  <div className="kucuk sonuk">
                    {m.year ? `${m.year} üretim` : 'Üretim yılı okunamadı'} · {GARANTI[g.state]}
                  </div>
                </div>
              )
            })
          )}
        </Bolum>

        <Bolum ad={`Talepler · ${kendi.length}`}>
          {kendi.length === 0 ? (
            <p className="kucuk sonuk" style={{ margin: 0 }}>Talep açmamış.</p>
          ) : (
            /* TALEBE TIKLANIYOR (14 Eylül 2026, kullanıcının isteği).
               Önce düz satırdı: talebin ayrıntısı için Talepler ekranına
               geçip numarayla aramak gerekiyordu. Satır artık Talepler
               ekranını o talep seçili ve "tüm durumlar" süzgeciyle
               açıyor; kapanmış talep de bulunuyor. Görünüm, talep
               detayındaki "müşterinin diğer talepleri" satırlarıyla aynı
               (.bag-satir). */
            kendi.map((t) => {
              const icerik = (
                <>
                  <span className="mono kucuk">{t.no}</span>
                  <span className="kucuk sonuk">{TALEP_ADI[t.tur]}</span>
                  <span className="kucuk sonuk">{gecenSure(t.createdAt)}</span>
                  <DurumRozet durum={t.status} talep={t} />
                </>
              )
              return talebeGidebilir(t) ? (
                <button
                  key={t.id}
                  type="button"
                  className="bag-satir"
                  style={{ flexWrap: 'wrap' }}
                  onClick={() => onTalebeGit(t)}
                >
                  {icerik}
                </button>
              ) : (
                <div key={t.id} className="satir" style={{ marginBottom: 8, alignItems: 'baseline' }}>
                  {icerik}
                </div>
              )
            })
          )}
        </Bolum>
      </div>
    </>
  )
}

function Form({ musteri, onKapat, onKaydet }) {
  const [d, setD] = useState({
    ad: musteri.ad || '',
    il: musteri.il || '',
    ilce: musteri.ilce || '',
    satici: musteri.satici || '',
  })
  const [hata, setHata] = useState('')
  const yaz = (k) => (e) => setD({ ...d, [k]: e.target.value })

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart">
        <div className="kart__tepe">
          <h2>Müşteri Bilgisi</h2>
        </div>

        <div className="kart__ic">
          <label className="alan">
            <span className="alan__ad">Ad Soyad</span>
            <input className="gir" value={d.ad} onChange={yaz('ad')} autoFocus />
          </label>

          <div className="esit">
            <label className="alan">
              <span className="alan__ad">İl</span>
              <input className="gir" value={d.il} onChange={yaz('il')} />
            </label>
            <label className="alan">
              <span className="alan__ad">İlçe</span>
              <input className="gir" value={d.ilce} onChange={yaz('ilce')} />
            </label>
          </div>

          <label className="alan">
          <span className="alan__ad">Makineyi aldığı yer</span>
            <input className="gir" value={d.satici} onChange={yaz('satici')} />
          </label>

          <div className="uyari">
            Telefon numarası buradan değişmiyor. Numara hesabın kimliği; değişiklik
            müşterinin talebi üzerinden, seri numarasıyla doğrulanarak yapılıyor.
          </div>

          {hata && <div className="uyari">{hata}</div>}

          <div className="satir">
            <button
              className="dg dg--ana"
              onClick={() => {
                if (d.ad.trim().length < 3) return setHata('Adınızı ve soyadınızı yazın.')
                if (!d.il.trim()) return setHata('İl adını yazın.')
                onKaydet(d)
              }}
            >
              Kaydet
            </button>
            <button className="dg" onClick={onKapat}>Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const IZIN = { verildi: 'Verildi', reddedildi: 'Reddedildi', sorulmadi: 'Sorulmadı' }

const GARANTI = {
  devam: 'Garanti sürüyor',
  son: 'Garantinin son yılı',
  bitti: 'Garanti bitti',
  bilinmiyor: 'Garanti bilgisi yok',
}

function Bolum({ ad, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="alan__ad"
        style={{ borderBottom: '1px solid var(--cizgi)', paddingBottom: 6, marginBottom: 10 }}
      >
        {ad}
      </div>
      {children}
    </div>
  )
}

/* KVKK onaylarının ekrandaki adları (Codex'ten geçti). Kodlar
   lib/rizaKaydi.js'teki ve veritabanındaki listelerle aynı. */
const RIZA_METIN_ADI = {
  aydinlatma: 'Aydınlatma Metni',
  acikRiza: 'Açık Rıza Metni',
  ticariIleti: 'Kampanya bildirimleri',
}
const RIZA_ISLEM_ADI = { onay: 'Onayladı', ret: 'Reddetti', geriCekme: 'Geri aldı' }
const RIZA_KANAL_ADI = {
  connectKayit: 'Kayıt',
  connectProfil: 'Profil',
  connectGuncelleme: 'Metin güncellemesi',
}

function kvkkOnayi(onaylar) {
  if (!onaylar?.aydinlatma || !onaylar?.tarih) return 'Yok'
  return `${tarihYaz(onaylar.tarih)} · sürüm ${onaylar.surum || '—'}`
}

function kampanyaIzni(onaylar) {
  const tarih = kampanyaSonDegisiklik(onaylar)
  const durum = onaylar?.kampanya ? 'Var' : 'Yok'
  return tarih ? `${durum} · ${tarihYaz(tarih)}` : durum
}

function S({ k, v, mono }) {
  if (!v) return null
  return (
    <div className="satir" style={{ gap: 10, alignItems: 'baseline', marginBottom: 5 }}>
      <span className="kucuk sonuk" style={{ minWidth: 130 }}>{k}</span>
      <span className={mono ? 'mono' : undefined}>{v}</span>
    </div>
  )
}

/* ----------------------------------------------------------- Excel aktarımı */

const AKTAR_BASLIK = [
    'Müşteri numarası', 'Ad soyad', 'Telefon', 'İl', 'İlçe', 'Makineyi aldığı yer',
  'Kayıt tarihi', 'Kayıt saati', 'Makine sayısı', 'Makineler', 'Seri numaraları',
  'Talep sayısı', 'Aydınlatma onayı', 'Açık rıza', 'Kampanya izni',
  'Metin sürümü', 'Onay tarihi',
]

function aktarSatiri(m, kendi) {
  const makineler = m.makineler || []
  return [
    m.no || '',
    m.ad || '',
    telGoster(m.ulke, m.tel),
    m.il || '',
    m.ilce || '',
    m.satici || '',
    ...tarihSaat(m.createdAt),
    String(makineler.length),
    makineler.map((x) => getProduct(x.productId)?.name || x.productId).join(' · '),
    makineler.map((x) => formatSerial(x.serial)).join(' · '),
    String(kendi.length),
    m.onaylar?.aydinlatma ? 'Onaylı' : 'Yok',
    m.onaylar?.acikRiza ? 'Onaylı' : 'Yok',
    m.onaylar?.kampanya ? 'Var' : 'Yok',
    m.onaylar?.surum || '',
    m.onaylar?.tarih ? tarihSaat(m.onaylar.tarih)[0] : '',
  ]
}
