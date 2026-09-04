import { useMemo, useState } from 'react'
import { durumBilgi, makineKayitlariGetir, talepleriGetir } from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, siraliListe, SiraliBaslik, tarihSaat, tarihYaz, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { getProduct } from '../../data/products'
import { extractYear, formatSerial, warrantyStatus, GARANTI_YIL } from '../../lib/serial'

/* ==========================================================================
   Kayıtlı Makineler

   Uygulamaya kaydedilen ve bayinin elle açtığı makinelerin tek listesi.
   "Bu seri numarası kimde, hangi bayide, ne zaman kaydedilmiş"
   sorusunun cevabı.

   VERİ ZATEN VARDI, EKRAN YOKTU. `makineKayitlari` defteri
   src/lib/makineKaydi.js tarafından yazılıyor ve bugüne kadar yalnız
   Dashboard'da sayaç olarak kullanılıyordu.

   KAYNAK ALANI ÜÇ DEĞER ALIYOR:

     musteri  müşteri uygulamadan kaydetti
     bayi     bayi panelden elle açtı — bayi alanı DOLU
     logo     faturadan geldi (LOGO bağlandığında)

   LOGO ARAMASI AYRI EKRAN DEĞİL. Personel seri numarası yazarken
   "bu makine hakkında ne biliyoruz" diye soruyor; hangi deponun cevabı
   taşıdığını bilmek zorunda kalması iki ekran arasında gidip gelmek
   demek. LOGO bağlandığında bu defteri besleyecek, ekran yine tek
   arama kutusuyla çalışacak.

   BUGÜN BAYİ ALANI ÇOĞUNLUKLA BOŞ: LOGO kapalı (src/lib/logo.js) ve
   müşterinin kendi kaydında bayi bilgisi yok. Bayinin elle açtığı
   kayıtlarda dolu geliyor.

   MAKİNENİN GEÇMİŞİ

   Liste bir satırın kim olduğunu söylüyordu ama başına ne geldiğini
   söylemiyordu. Bir seri numarası sorulduğunda asıl merak edilen bu:
   makine hangi bayiden çıktı, kime gitti, kaç kez servise girdi, ne
   yapıldı, garantisi sürüyor mu.

   Cevabın parçaları iki ayrı deftere dağılmıştı — kayıt defteri ve
   talepler — ve ikisini birleştiren bir ekran yoktu. Satıra
   dokunulduğunda açılan pencere ikisini seri numarası üzerinden
   birleştiriyor.

   Seri numaraları karşılaştırılırken tire ve boşluk atılıyor: aynı
   makine kayıtta `ORK1270-2024-00157`, talepte `ORK1270202400157`
   olabiliyor.
   ========================================================================== */

const KAYNAK_ADI = {
  musteri: 'Müşteri',
  bayi: 'Bayi',
  logo: 'Logo',
}

const temiz = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/* Garanti metinleri uygulamadakiyle aynı cümleler (bkz. i18n/tr.js):
   personel ve müşteri aynı makineye baktığında aynı şeyi okumalı.
   Rozet tonu backoffice'in kendi `rz` kalıbından; `garanti` sınıfı
   yalnız bayi panelinin CSS'inde var, burada yok. */
const GARANTI_YAZI = {
  bilinmiyor: { ton: 'gri', yaz: () => 'Garanti bilgisi yok' },
  devam: { ton: 'yesil', yaz: (kalan) => `Garanti devam ediyor · ${kalan} yıl` },
  son: { ton: 'turuncu', yaz: () => 'Garantinin son yılı' },
  bitti: { ton: 'gri', yaz: () => 'Garanti süresi doldu' },
}

const TUR_ADI = { servis: 'Servis', parca: 'Yedek Parça', satinalma: 'Fiyat Teklifi' }

export function Makineler({ personel, surum }) {
  const [ara, setAra] = useState('')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [il, setIl] = useState('hepsi')
  const [bayi, setBayi] = useState('hepsi')
  const [kaynak, setKaynak] = useState('hepsi')
  const [secili, setSecili] = useState(null)

  const { veri: kayitlar, yukleniyor } = useVeri(() => makineKayitlariGetir(), [surum], [])
  const { veri: talepler } = useVeri(() => talepleriGetir(), [surum], [])
  const { siralama, cevir } = useSiralama('tarih', 'azalan')

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    const qRakam = q.replace(/\D/g, '')

    return kayitlar.filter((k) => {
      if (!araliktaMi(k.tarih, aralik)) return false
      if (il !== 'hepsi' && k.il !== il) return false
      if (bayi !== 'hepsi' && (k.bayiAd || '') !== bayi) return false
      if (kaynak !== 'hepsi' && (k.kaynak || 'musteri') !== kaynak) return false
      if (!q) return true

      const urun = getProduct(k.productId)?.name
      const alanlar = [k.seri, k.bayiAd, k.il, k.ilce, k.musteriAd, k.musteriNo, urun]
      if (alanlar.filter(Boolean).some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))) {
        return true
      }

      /* Seri numarasının bir bölümü veya müşteri numarasının rakamları
         da bulunmalı; tire ve boşluk aramayı bozmasın. */
      if (!qRakam) return false
      return [k.seri, k.musteriNo]
        .filter(Boolean)
        .some((x) => String(x).replace(/\D/g, '').includes(qRakam))
    })
  }, [kayitlar, ara, aralik, il, bayi, kaynak])

  const liste = useMemo(
    () =>
      siraliListe(suzulmus, siralama, {
        seri: (k) => k.seri,
        model: (k) => getProduct(k.productId)?.name || '',
        bayi: (k) => k.bayiAd || '',
        konum: (k) => k.il || '',
        musteri: (k) => k.musteriAd || '',
        tarih: (k) => k.tarih,
      }),
    [suzulmus, siralama]
  )

  const iller = [...new Set(kayitlar.map((k) => k.il).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )
  const bayiler = [...new Set(kayitlar.map((k) => k.bayiAd).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  )

  if (yukleniyor) {
    return (
      <>
        <Baslik ad="Kayıtlı Makineler" />
        <BeklemeKart satir={5} />
      </>
    )
  }

  return (
    <>
      <Baslik
        ad="Kayıtlı Makineler"
        sag={
          <DisaAktar
            ad="Kayıtlı Makineler"
            basliklar={AKTAR_BASLIK}
            satirlar={liste.map(aktarSatiri)}
            personel={personel}
          />
        }
      />

      <SuzgecCubugu>
        <Secim
          ad="İl"
          deger={il}
          onDegis={setIl}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm iller' },
            ...iller.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={140}
        />

        <Secim
          ad="Bayi"
          deger={bayi}
          onDegis={setBayi}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm bayiler' },
            ...bayiler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={190}
        />

        <Secim
          ad="Kaynak"
          deger={kaynak}
          onDegis={setKaynak}
          secenekler={[
            { deger: 'hepsi', ad: 'Hepsi' },
            { deger: 'musteri', ad: 'Müşteri kaydetti' },
            { deger: 'bayi', ad: 'Bayi açtı' },
            { deger: 'logo', ad: 'Logo faturası' },
          ]}
          genislik={165}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Seri numarası, bayi, il, müşteri adı veya numarası"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} kayıt</span>
      </SuzgecCubugu>

      {/* Satırın tıklanabilir olduğu yazıyor: fare imleci ve vurgu
          ancak satırın üstüne gelince görünüyor, aranan şey de
          çoğunlukla listede değil o pencerede. */}
      {liste.length > 0 && (
        <p className="kucuk sonuk" style={{ margin: '0 0 12px' }}>
          Bir satıra dokunun: makinenin bayisi, faturası ve servis
          geçmişi tek pencerede açılır.
        </p>
      )}

      {liste.length === 0 ? (
        <div className="kart">
          <Bos
            metin={
              kayitlar.length === 0
                ? 'Henüz kayıtlı makine yok. Müşteri uygulamadan makinesini kaydettiğinde burada görünecek.'
                : 'Bu süzgeçle makine bulunamadı.'
            }
          />
        </div>
      ) : (
        <div className="kart">
          <div className="tablo-sar">
            <table>
              <thead>
                <tr>
                  <SiraliBaslik ad="Seri No" alan="seri" siralama={siralama} onSirala={cevir} genislik={190} />
                  <SiraliBaslik ad="Model" alan="model" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Bayi" alan="bayi" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Konum" alan="konum" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Müşteri" alan="musteri" siralama={siralama} onSirala={cevir} />
                  <SiraliBaslik ad="Kayıt" alan="tarih" siralama={siralama} onSirala={cevir} genislik={120} />
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => {
                  const urun = getProduct(k.productId)
                  return (
                    <tr
                      key={k.id}
                      className="tiklanir"
                      onClick={() => setSecili(k)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSecili(k)}
                    >
                      <td className="mono kucuk">{formatSerial(k.seri)}</td>
                      <td className="kucuk">{urun?.name || '—'}</td>
                      <td className="kucuk">
                        {k.bayiAd || <span className="sonuk">—</span>}
                        <div className="kucuk sonuk">
                          {KAYNAK_ADI[k.kaynak || 'musteri']}
                        </div>
                      </td>
                      <td className="kucuk">{k.ilce ? `${k.ilce} / ${k.il}` : k.il || '—'}</td>
                      <td className="kucuk">
                        {k.musteriAd || '—'}
                        {k.musteriNo && <div className="kucuk sonuk mono">{k.musteriNo}</div>}
                      </td>
                      <td className="kucuk sonuk">{tarihSaat(k.tarih)[0]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {secili && (
        <MakineGecmisi
          kayit={secili}
          talepler={talepler}
          onKapat={() => setSecili(null)}
        />
      )}
    </>
  )
}

/* ==========================================================================
   Makinenin geçmişi

   Kayıt defteri "bu makine kimde" diyor, talepler "başına ne geldi"
   diyor; ikisi seri numarasıyla birleşiyor.

   AYNI SERİ BİRDEN FAZLA KAYITTA OLABİLİR: makine el değiştirdiğinde
   yeni sahibi de uygulamaya kaydediyor. Sahiplik zinciri o yüzden
   ayrı bir bölüm — "önceki sahibi kim" sorusunun cevabı da burada.
   ========================================================================== */

function MakineGecmisi({ kayit, talepler, onKapat }) {
  const anahtar = temiz(kayit.seri)
  const urun = getProduct(kayit.productId)
  /* Yıl SERİ NUMARASINDAN çıkıyor, LOGO'nun üretim tarihinden değil.
     Müşteri de garantisini seri numarasından görüyor; iki taraf aynı
     makineye bakıp farklı yıl okursa hangisinin doğru olduğu
     tartışılır. LOGO'nun tarihi aşağıda ayrı satırda duruyor. */
  const yil = extractYear(kayit.seri)
  const durum = warrantyStatus(yil)
  const kalan = yil ? yil + GARANTI_YIL - new Date().getFullYear() : 0
  const garanti = GARANTI_YAZI[durum.state] || GARANTI_YAZI.bilinmiyor

  const gecmis = (talepler || []).filter((t) => temiz(t.makine?.serial) === anahtar)

  return (
    <div className="pencere" onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="kart pencere__kart" style={{ maxWidth: 720 }}>
        <div className="kart__tepe">
          <h2>{urun?.name || 'Makine'}</h2>
          <span className="mono kucuk sonuk">{formatSerial(kayit.seri)}</span>
          <button className="dg" style={{ marginLeft: 'auto' }} onClick={onKapat}>
            Kapat
          </button>
        </div>

        <div className="kart__ic">
          <div className="satir" style={{ gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <span className={'rz rz--' + garanti.ton}>{garanti.yaz(kalan)}</span>
            {yil > 0 && <span className="kucuk sonuk">{yil} üretimi</span>}
          </div>

          <div className="ikili">
            <div>
              <Bilgi ad="Sahibi" deger={kayit.musteriAd} alt={kayit.musteriNo} />
              <Bilgi
                ad="Konum"
                deger={kayit.ilce ? `${kayit.ilce} / ${kayit.il}` : kayit.il}
              />
              <Bilgi
                ad="Kayıt"
                deger={tarihSaat(kayit.tarih)[0]}
                alt={KAYNAK_ADI[kayit.kaynak || 'musteri'] + ' kaydetti'}
              />
            </div>
            <div>
              <Bilgi ad="Satan bayi" deger={kayit.bayiAd} />
              <Bilgi
                ad="Fatura tarihi"
                deger={
                  kayit.faturaTarihi
                    ? new Date(kayit.faturaTarihi).toLocaleDateString('tr-TR')
                    : ''
                }
                /* LOGO cevap vermediyse "fatura yok" değil "bilinmiyor"
                   demek doğru; ikisi ayrı şeyler. */
                alt={kayit.logoBildi ? 'Logo faturasından' : 'Logo bu seriyi tanımıyor'}
              />
              <Bilgi
                ad="Üretim tarihi"
                deger={
                  kayit.uretimTarihi
                    ? new Date(kayit.uretimTarihi).toLocaleDateString('tr-TR')
                    : ''
                }
              />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>
            Servis Geçmişi{gecmis.length ? ` · ${gecmis.length} kayıt` : ''}
          </h3>

          {gecmis.length === 0 ? (
            <Bos metin="Bu makine için açılmış talep yok." />
          ) : (
            <div className="tablo-sar">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Tarih</th>
                    <th style={{ width: 110 }}>Tür</th>
                    <th style={{ width: 130 }}>Durum</th>
                    <th>Kim ilgilendi / ne yapıldı</th>
                  </tr>
                </thead>
                <tbody>
                  {gecmis.map((t) => (
                    <tr key={t.id}>
                      <td className="kucuk sonuk">
                        {tarihYaz(t.createdAt, false)}
                        <div className="kucuk sonuk mono">{t.no}</div>
                      </td>
                      <td className="kucuk">{TUR_ADI[t.tur] || t.tur}</td>
                      <td>
                        <span className={'rz rz--' + durumBilgi(t.status).ton}>
                          {durumBilgi(t.status).ad}
                        </span>
                      </td>
                      <td className="kucuk">
                        {t.bayi?.ad || 'PAKSAN'}
                        {t.cozum?.ozet && (
                          <div className="kucuk sonuk">{t.cozum.ozet}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Bilgi({ ad, deger, alt }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="kucuk sonuk">{ad}</div>
      <div>{deger || <span className="sonuk">—</span>}</div>
      {alt && <div className="kucuk sonuk">{alt}</div>}
    </div>
  )
}

const AKTAR_BASLIK = [
  'Seri numarası', 'Model', 'Bayi', 'Kaynak', 'İl', 'İlçe',
  'Müşteri', 'Müşteri numarası', 'Kayıt tarihi', 'Kayıt saati',
  'Fatura tarihi', 'Logo bildi mi',
]

function aktarSatiri(k) {
  return [
    formatSerial(k.seri),
    getProduct(k.productId)?.name || '',
    k.bayiAd || '',
    KAYNAK_ADI[k.kaynak || 'musteri'],
    k.il || '',
    k.ilce || '',
    k.musteriAd || '',
    k.musteriNo || '',
    ...tarihSaat(k.tarih),
    k.faturaTarihi ? new Date(k.faturaTarihi).toLocaleDateString('tr-TR') : '',
    k.logoBildi ? 'Evet' : 'Hayır',
  ]
}
