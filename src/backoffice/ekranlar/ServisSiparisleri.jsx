import { useEffect, useMemo, useState } from 'react'
import {
  ACIK_DURUMLAR,
  SIPARIS_DURUM,
  siparisDurumu,
  siparisleriGetir,
} from '../../lib/servisSiparis'
import { ekAdresi } from '../../lib/ekler'
import { formatSerial } from '../../lib/serial'
import {
  Baslik, Bos, saatYaz, siraliListe, SiraliBaslik, tarihYaz, useSiralama,
} from './ortak'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { DisaAktar } from './aktar'
import { islemYaz, izinli } from '../veri'

/* ==========================================================================
   Servis Siparişleri — PAKSAN tarafı

   Servis stokunu kendi artıramıyor; artışın tek yolu bu ekran. Servis
   sipariş veriyor, PAKSAN burada ilerletiyor:

     PAKSAN'a iletildi → Onaylandı → Hazırlanıyor → Gönderildi

   "Gönderildi" işaretlendiği anda servisin stoku artıyor. Onay ve
   hazırlık adımlarında artmıyor — parça henüz serviste değil. Kargo
   bilgisi burada giriliyor, servis uygulamasında görünüyor.

   İPTAL GERİ ALINMIYOR. Kapanmış sipariş (gönderildi/iptal) bir daha
   değişmiyor; yanlışlık olursa yeni sipariş açılıyor. Gönderilmiş
   siparişi geri almak stoku da geri almak demek, o da servisin elindeki
   gerçek malı yok saymak olurdu.

   ------------------------------------------------------------------
   EKRAN TALEPLER EKRANIYLA AYNI KALIPTA

   Bu ekran bir dönem apayrı bir şeydi: başlığı elle çizilmiş, süzgeci
   dört çipten ibaret, satırları akordeon gibi yerinde açılıyordu. Ne
   arama vardı, ne sıralama, ne tarih aralığı, ne Excel çıktısı.

   Oysa personelin burada yaptığı iş Talepler'dekiyle AYNI CİNSTEN:
   gelen bir kaydı bul, aç, oku, bir adım ilerlet. Aynı işi iki farklı
   arayüzle yaptırmak, personelin her ekranda yeniden öğrenmesi
   demekti — ve öğrenmediği için Talepler'de kullandığı arama
   alışkanlığı burada karşılık bulmuyordu.

   Şimdi ikisi aynı iskelette: başlık + süzgeç çubuğu + solda sıralanır
   tablo + sağda seçilen kaydın tamamı.
   ========================================================================== */

/* GARANTİ TALEBİ AYRI SÜZGEÇTE.

   Garanti talebi de bir sipariş — akış birebir aynı ilerliyor. Ama
   PAKSAN'ın orada verdiği karar farklı: parayla satılan bir siparişi
   onaylamakla, bedelsiz parça göndermeyi kabul etmek aynı iş değil.
   İkisi tek listede karışınca garanti talepleri gözden kaçıyordu. */
const DURUM_SUZGEC = [
  { deger: 'acik', ad: 'Bekleyenler' },
  { deger: 'garanti', ad: 'Garanti talepleri' },
  { deger: 'kapali', ad: 'Kapananlar' },
  { deger: 'hepsi', ad: 'Hepsi' },
  ...Object.entries(SIPARIS_DURUM).map(([k, d]) => ({ deger: k, ad: d.ad })),
]

export function ServisSiparisleri({ rol, personel, surum }) {
  const [suzgec, setSuzgec] = useState('acik')
  const [servis, setServis] = useState('hepsi')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [ara, setAra] = useState('')
  const [tazele, setTazele] = useState(0)
  const [secili, setSecili] = useState(null)

  const hepsi = useMemo(() => {
    void surum
    return siparisleriGetir()
  }, [tazele, surum])

  const servisler = [...new Set(hepsi.map((s) => s.servisAd).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr-TR')
    return hepsi.filter((s) => {
      if (suzgec === 'acik' && !ACIK_DURUMLAR.includes(s.durum)) return false
      if (suzgec === 'garanti' && s.tur !== 'garanti') return false
      if (suzgec === 'kapali' && ACIK_DURUMLAR.includes(s.durum)) return false
      if (SIPARIS_DURUM[suzgec] && s.durum !== suzgec) return false
      if (servis !== 'hepsi' && s.servisAd !== servis) return false
      if (!araliktaMi(s.tarih, aralik)) return false
      if (!q) return true

      /* Sipariş numarası, servis adı, kalem adı ve kargo takip
         numarası — personelin elinde bunlardan biri oluyor. */
      const alanlar = [
        s.no,
        s.servisAd,
        s.not,
        s.kargo?.takipNo,
        s.garanti?.talepNo,
        s.garanti?.seri,
        ...(s.kalemler || []).map((k) => k.ad),
      ]
      return alanlar
        .filter(Boolean)
        .some((x) => String(x).toLocaleLowerCase('tr-TR').includes(q))
    })
  }, [hepsi, suzgec, servis, aralik, ara])

  const { siralama, cevir } = useSiralama('tarih', 'azalan')
  const liste = siraliListe(suzulmus, siralama, {
    no: (s) => s.no,
    servis: (s) => s.servisAd || '',
    kalem: (s) => (s.kalemler || []).length,
    durum: (s) => SIPARIS_DURUM[s.durum]?.ad || s.durum,
    tarih: (s) => s.tarih,
  })

  /* Yalnız servis kaydını düzenleyebilen personel siparişi ilerletebiliyor:
     sevkiyat kararı ticari bir karar, her rolün işi değil. */
  const yetkili = izinli(rol, 'servisDuzenle')
  const acik = liste.find((s) => s.id === secili) || null

  return (
    <>
      <Baslik
        ad="Servis Siparişleri"
        sag={
          <DisaAktar
            ad="Servis Siparişleri"
            basliklar={AKTAR_BASLIK}
            satirlar={liste.map(aktarSatiri)}
            personel={personel}
          />
        }
      />

      <SuzgecCubugu>
        <Secim ad="Durum" deger={suzgec} onDegis={setSuzgec} secenekler={DURUM_SUZGEC} genislik={180} />

        <Secim
          ad="Servis"
          deger={servis}
          onDegis={setServis}
          secenekler={[
            { deger: 'hepsi', ad: 'Tüm servisler' },
            ...servisler.map((x) => ({ deger: x, ad: x })),
          ]}
          genislik={190}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        <label className="secim-alan secim-alan--genis">
          <span className="secim-alan__ad">Ara</span>
          <input
            className="sec"
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Sipariş numarası, servis, parça adı, kargo takip"
          />
        </label>

        <span className="suzgec-cubugu__sayi">{liste.length} sipariş</span>
      </SuzgecCubugu>

      <div className="ikili">
        <div className="kart">
          {liste.length === 0 ? (
            <Bos
              metin={
                suzgec === 'acik'
                  ? 'Bekleyen sipariş yok.'
                  : 'Bu süzgeçle sipariş bulunamadı.'
              }
            />
          ) : (
            <div className="tablo-sar">
              <table className="tablo--esit">
                <thead>
                  <tr>
                    <SiraliBaslik ad="Sipariş" alan="no" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Servis" alan="servis" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="İçerik" alan="kalem" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Tarih / saat" alan="tarih" siralama={siralama} onSirala={cevir} />
                    <SiraliBaslik ad="Durum" alan="durum" siralama={siralama} onSirala={cevir} />
                  </tr>
                </thead>
                <tbody>
                  {liste.map((s) => {
                    const d = SIPARIS_DURUM[s.durum] || SIPARIS_DURUM.yeni
                    const adet = (s.kalemler || []).reduce((t, k) => t + Number(k.adet), 0)
                    return (
                      <tr
                        key={s.id}
                        className={'tiklanir' + (secili === s.id ? ' secili' : '')}
                        onClick={() => setSecili(s.id)}
                      >
                        <td>
                          <div className="mono talep-no">{s.no}</div>
                          <div className="talep-alt">
                            {s.tur === 'garanti' ? (
                              <span className="rz rz--turuncu">Garanti</span>
                            ) : (
                              <span className="rz rz--gri">Sipariş</span>
                            )}
                          </div>
                        </td>
                        <td>{s.servisAd || '—'}</td>
                        <td className="kucuk">
                          {(s.kalemler || []).length} kalem
                          <div className="sonuk">{adet} adet</div>
                        </td>
                        <td className="kucuk">
                          <div>{tarihYaz(s.tarih, false)}</div>
                          <div className="sonuk">{saatYaz(s.tarih)}</div>
                        </td>
                        <td><span className={'rz rz--' + d.ton}>{d.ad}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="kart">
          {acik ? (
            /* `key` şart: başka bir sipariş seçildiğinde kargo
               kutularında kalan yarım yazı yeni siparişe taşınmasın. */
            <Detay
              key={acik.id}
              siparis={acik}
              yetkili={yetkili}
              personel={personel}
              onDegisti={() => setTazele((x) => x + 1)}
            />
          ) : (
            <Bos metin="Soldaki listeden bir sipariş seçin." />
          )}
        </div>
      </div>
    </>
  )
}

/* ==========================================================================
   Garanti talebinin dayanağı

   Servis bu talebi bir servis işinin sonunda açıyor; talep boşluktan
   doğmuyor. Dayanağı olmayan bir garanti talebi, PAKSAN'ın neyin
   karşılığında parça gönderdiğini bilmemesi demek — o yüzden burada
   hangi işten doğduğu, hangi makine olduğu ve parçanın nesi olduğu
   yazıyor.

   PARÇANIN NESİ VAR — SERVİSİN VERDİĞİ HÜKÜM DEĞİL

   Servise "üretim hatası mı, kullanım hatası mı" diye sorulmuyor;
   sorulsaydı her talepte "üretim hatası" yazardı, çünkü talebinin
   kabulü ona bağlı. Servis yalnız GÖZLEDİĞİNİ yazıyor: kırıldı,
   aşındı, kaçırıyor. Hükmü PAKSAN veriyor — eski parça eline
   geçtiğinde.
   ========================================================================== */

function GarantiBilgisi({ garanti }) {
  const [adres, setAdres] = useState('')

  useEffect(() => {
    if (!garanti.foto?.id) return
    let iptal = false
    ekAdresi(garanti.foto.id).then((a) => {
      if (!iptal) setAdres(a || '')
    })
    return () => {
      iptal = true
    }
  }, [garanti.foto?.id])

  return (
    <div className="not not--turuncu" style={{ marginBottom: 14 }}>
      <div>
        <strong>Garanti Talebi</strong>
        <p className="kucuk">
          Servis işi <span className="mono">{garanti.talepNo}</span>
          {garanti.seri && (
            <>
              {' · '}
              Makine <span className="mono">{formatSerial(garanti.seri)}</span>
            </>
          )}
        </p>
        <p className="kucuk">
          Parçanın durumu: <b>{garanti.parcaDurumu || '—'}</b>
          {garanti.sureDk ? ` · Süre: ${garanti.sureDk} dakika` : ''}
          {garanti.kim ? ` · İşi yapan: ${garanti.kim}` : ''}
        </p>
        <p className="kucuk">
          {garanti.iade
            ? 'Servis eski parçayı geri gönderecek.'
            : 'Eski parça geri gönderilmeyecek.'}
        </p>
        {adres && (
          <a href={adres} target="_blank" rel="noreferrer">
            <img
              src={adres}
              alt="Eski parça"
              style={{ maxWidth: 220, borderRadius: 8, marginTop: 8 }}
            />
          </a>
        )}
      </div>
    </div>
  )
}

/* Sıradaki adım tek düğme: personel "şimdi ne olacak" diye durum
   listesinden seçmiyor, akış zaten tek yönlü. */
const SONRAKI = {
  yeni: { durum: 'onaylandi', ad: 'Onayla' },
  onaylandi: { durum: 'hazirlaniyor', ad: 'Hazırlığa Al' },
  hazirlaniyor: { durum: 'gonderildi', ad: 'Gönderildi Olarak İşaretle' },
}

function Detay({ siparis, yetkili, personel, onDegisti }) {
  const [firma, setFirma] = useState('')
  const [takip, setTakip] = useState('')
  const [hata, setHata] = useState('')
  const d = SIPARIS_DURUM[siparis.durum] || SIPARIS_DURUM.yeni
  const sonraki = SONRAKI[siparis.durum]
  const adet = (siparis.kalemler || []).reduce((t, k) => t + Number(k.adet), 0)

  /* Sipariş hareketleri İşlem Kaydı'na da yazılıyor: stoku değiştiren
     tek adım gönderim ve "bu servisin stoku neden arttı" sorusunun
     cevabı denetlenebilir bir yerde durmalı. */
  function yaz(ozet) {
    islemYaz({ tur: 'siparis', ozet: `${siparis.no} · ${siparis.servisAd} · ${ozet}`, personel })
  }

  function ilerlet() {
    const kargo = siparis.durum === 'hazirlaniyor' ? { firma, takipNo: takip } : undefined
    const sonuc = siparisDurumu(siparis.id, sonraki.durum, personel, kargo)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz(
      sonraki.durum === 'gonderildi'
        ? `gönderildi · stok işlendi${takip ? ' · ' + (firma || 'kargo') + ' ' + takip : ''}`
        : SIPARIS_DURUM[sonraki.durum].ad.toLocaleLowerCase('tr-TR'),
    )
    onDegisti()
  }

  function iptal() {
    if (!confirm(`${siparis.no} numaralı sipariş iptal edilecek.`)) return
    const sonuc = siparisDurumu(siparis.id, 'iptal', personel)
    if (sonuc.hata) return setHata(sonuc.hata)
    yaz('iptal edildi')
    onDegisti()
  }

  return (
    <>
      <div className="kart__tepe">
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{siparis.servisAd}</div>
          <div className="mono kucuk sonuk" style={{ marginTop: 3 }}>
            {siparis.no} · {siparis.servisNo || ''}
          </div>
        </div>
        <span className={'rz rz--' + d.ton} style={{ marginLeft: 'auto' }}>{d.ad}</span>
      </div>

      <div className="kart__ic">
        {siparis.garanti && <GarantiBilgisi garanti={siparis.garanti} />}

        <div className="tablo-sar">
          <table>
            <thead>
              <tr>
                <th>Kalem</th>
                <th style={{ textAlign: 'right', width: 70 }}>Adet</th>
              </tr>
            </thead>
            <tbody>
              {(siparis.kalemler || []).map((k) => (
                <tr key={k.tur + k.anahtar}>
                  <td>{k.ad}</td>
                  <td style={{ textAlign: 'right' }}>{k.adet}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>{(siparis.kalemler || []).length} kalem</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{adet}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {siparis.not && (
          <div style={{ marginTop: 14 }}>
            <div className="kucuk sonuk">Servisin notu</div>
            <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{siparis.not}</p>
          </div>
        )}

        {siparis.kargo?.takipNo && (
          <p className="kucuk" style={{ marginTop: 14 }}>
            Kargo: {siparis.kargo.firma || '—'} · <span className="mono">{siparis.kargo.takipNo}</span>
          </p>
        )}

        <div className="zaman" style={{ marginTop: 14 }}>
          {(siparis.gecmis || []).map((g, i) => (
            <div key={i} className="kucuk sonuk">
              {SIPARIS_DURUM[g.durum]?.ad || g.durum} · {tarihYaz(g.tarih)} · {g.kim}
            </div>
          ))}
        </div>

        {yetkili && sonraki && (
          <>
            {/* Kargo bilgisi yalnız gönderim adımında soruluyor;
                önceki adımlarda henüz kargo yok. */}
            {siparis.durum === 'hazirlaniyor' && (
              <div className="esit" style={{ marginTop: 16 }}>
                <label className="alan">
                  <span className="alan__ad">Kargo Firması</span>
                  <input
                    className="gir"
                    value={firma}
                    onChange={(e) => setFirma(e.target.value)}
                    placeholder="Örnek: Aras Kargo"
                  />
                </label>
                <label className="alan">
                  <span className="alan__ad">Takip Numarası</span>
                  <input
                    className="gir mono"
                    value={takip}
                    onChange={(e) => setTakip(e.target.value)}
                  />
                </label>
              </div>
            )}

            {hata && <div className="uyari">{hata}</div>}

            <div className="satir" style={{ marginTop: 14 }}>
              <button className="dg dg--ana" onClick={ilerlet}>{sonraki.ad}</button>
              <button className="dg" onClick={iptal}>Siparişi İptal Et</button>
            </div>

            {siparis.durum === 'hazirlaniyor' && (
              <p className="kucuk sonuk" style={{ marginTop: 8 }}>
                Gönderildi olarak işaretlenince ürünler servisin stokuna
                eklenecek.
              </p>
            )}
          </>
        )}

        {yetkili && !sonraki && (
          <p className="kucuk sonuk" style={{ marginTop: 14 }}>
            Bu sipariş kapandı; üzerinde yapılacak bir işlem kalmadı.
          </p>
        )}

        {!yetkili && (
          <p className="kucuk sonuk" style={{ marginTop: 14 }}>
            Siparişi ilerletmek için servis düzenleme yetkisi gerekiyor.
          </p>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------ Excel çıktısı

   Talepler ekranında zaten vardı, burada yoktu: muhasebe "bu ay hangi
   servise ne gönderdik" diye sorduğunda liste elle yazılıyordu. */

const AKTAR_BASLIK = [
  'Sipariş No', 'Servis', 'Tür', 'Durum', 'Kalem sayısı', 'Toplam adet',
  'Kalemler', 'Kargo firması', 'Takip numarası', 'Tarih', 'Saat',
]

function aktarSatiri(s) {
  return [
    s.no || '',
    s.servisAd || '',
    s.tur === 'garanti' ? 'Garanti' : 'Sipariş',
    SIPARIS_DURUM[s.durum]?.ad || s.durum || '',
    String((s.kalemler || []).length),
    String((s.kalemler || []).reduce((t, k) => t + Number(k.adet), 0)),
    (s.kalemler || []).map((k) => `${k.ad} × ${k.adet}`).join(', '),
    s.kargo?.firma || '',
    s.kargo?.takipNo || '',
    tarihYaz(s.tarih, false),
    saatYaz(s.tarih),
  ]
}
