import { useMemo, useState } from 'react'
import { makineKayitlariGetir } from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, BeklemeKart, Bos, siraliListe, SiraliBaslik, tarihSaat, useSiralama,
} from './ortak'
import { DisaAktar } from './aktar'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { getProduct } from '../../data/products'
import { formatSerial } from '../../lib/serial'

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
   ========================================================================== */

const KAYNAK_ADI = {
  musteri: 'Müşteri',
  bayi: 'Bayi',
  logo: 'Logo',
}

export function Makineler({ personel, surum }) {
  const [ara, setAra] = useState('')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [il, setIl] = useState('hepsi')
  const [bayi, setBayi] = useState('hepsi')
  const [kaynak, setKaynak] = useState('hepsi')

  const { veri: kayitlar, yukleniyor } = useVeri(() => makineKayitlariGetir(), [surum], [])
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
                    <tr key={k.id}>
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
    </>
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
