import { useMemo, useState } from 'react'
import { islemKaydiGetir, personelGetir, rolBilgi } from '../veri'
import { useVeri } from '../kanca'
import {
  Baslik, Bekleme, Bos, siraliListe, SiraliBaslik, tarihYaz, useSiralama,
} from './ortak'
import { araliktaMi, BOS_ARALIK, Secim, SuzgecCubugu, TarihAraligi } from './suzgec'
import { MARKA, markaEk } from '../../marka'

/* İşlem kaydı — kim, ne zaman, ne yaptı.

   Hem backoffice’te personelin yaptıkları hem uygulamada müşterinin yaptıkları
   aynı deftere yazılıyor: talep açılması, makine kaydı, geri bildirim,
   numara talebi, durum değişikliği, personel işlemleri, Excel aktarımı,
   backoffice girişleri. Uygulamadan gelen satırlarda personel alanında
   "Uygulama" yazıyor.

   Kayıt binlerce satıra çıkıyor; ekran açılır açılmaz hepsini
   getirmiyor. Arama kutusuna yazılan her şey aranıyor: personel adı,
   personel numarası (PRS003), talep numarası (SRV2608184821), müşteri
   numarası (MST000001), servis adı… Satırda geçen her bilgi bulunuyor.

   Tarih aralığı seçilirse arama olmadan da liste geliyor: "1 Ağustos'tan
   bugüne ne oldu" sorusu sık soruluyor.

   Backoffice’ten silinemiyor; silme düğmesi bilerek yok. Sunucu geldiğinde
   kayıt sunucuda tutulacak ve kimse kendi izini silemeyecek. */

const TURLER = [
  { deger: 'hepsi', ad: 'Tüm işlemler' },
  { deger: 'talep', ad: 'Talep' },
  { deger: 'durum', ad: 'Talep durumu' },
  { deger: 'not', ad: 'Talep notu' },
  { deger: 'odeme', ad: 'Ödeme onayı' },
  { deger: 'makine', ad: 'Makine kaydı' },
  { deger: 'numara', ad: 'Numara değişikliği' },
  { deger: 'musteri', ad: 'Müşteri kaydı' },
  { deger: 'geribildirim', ad: 'Geri bildirim' },
  { deger: 'duyuru', ad: 'Duyuru' },
  { deger: 'personel', ad: 'Personel' },
  /* Rol ve yetki değişikliği güvenlik olayı: kimin neyi görebildiğini
     değiştiriyor, kaydı tutulmadan yapılmıyor. */
  { deger: 'rol', ad: 'Rol ve yetki' },
  { deger: 'sifre', ad: 'Şifre' },
  { deger: 'servis', ad: 'Servis listesi' },
  /* Servis tarafından gelen dört işlem. Sipariş, stok ve fiyat teklifi
     servis panelinde doğuyor, devir de servisin PAKSAN'dan destek
     istemesi. Teklif süzgeci sonradan eklendi: kayıtlar yazılıyordu
     ama listede ham "teklif" kelimesiyle çıkıp süzülemiyordu. */
  { deger: 'siparis', ad: 'Servis siparişi' },
  { deger: 'stok', ad: 'Servis stoku' },
  { deger: 'teklif', ad: 'Servis fiyat teklifi' },
  { deger: 'devir', ad: `${markaEk('a')} devir` },
  { deger: 'excel', ad: 'Excel aktarımı' },
  { deger: 'demo', ad: 'Demo verisi' },
  { deger: 'oturum', ad: 'Giriş / çıkış' },
]

const TUR_ADI = Object.fromEntries(TURLER.map((t) => [t.deger, t.ad]))

/* Müşteri verisine veya hesaplara dokunan işlemler listede ayırt edilsin. */
const ONEMLI = ['numara', 'musteri', 'personel', 'rol']

/* Kaydı kimin yazdığı.

   `rol` alanı PAKSAN rollerini tutuyordu; servis paneli açıldığında
   oraya 'servis' de yazılmaya başladı. `rolBilgi()` tanımadığı rolde
   listenin üçüncü satırını (Servis) döndürüyor — servisin işlemi
   "Servis" görünürdü. Servis ayrı ele alınıyor.

   Süzgeç de bunun üstüne kuruldu: "servisler bu hafta ne yaptı" tek
   soruyla cevaplanabilsin. */
const KAYNAKLAR = [
  { deger: 'hepsi', ad: 'Herkes' },
  { deger: 'paksan', ad: `${MARKA} personeli` },
  { deger: 'servis', ad: 'Servisler' },
]

function rolYazi(rol) {
  if (rol === 'servis') return 'Servis'
  return rol ? rolBilgi(rol).ad : '—'
}

export function IslemKaydi({ surum }) {
  const [tur, setTur] = useState('hepsi')
  const [kaynak, setKaynak] = useState('hepsi')
  const [aralik, setAralik] = useState(BOS_ARALIK)
  const [ara, setAra] = useState('')
  const [sorgu, setSorgu] = useState('')

  const { veri, yukleniyor } = useVeri(
    () => ({ kayit: islemKaydiGetir(), personel: personelGetir() }),
    [surum],
    null
  )

  /* Süzgeç ya arama ya tarih aralığıyla açılıyor; ikisi de boşken
     liste getirilmiyor. */
  const suzgecVar =
    Boolean(sorgu) || aralik.tur !== 'hepsi' || tur !== 'hepsi' || kaynak !== 'hepsi'

  const { siralama, cevir } = useSiralama('tarih', 'azalan')

  const suzulmus = useMemo(() => {
    if (!veri || !suzgecVar) return null
    const q = sorgu.toLocaleLowerCase('tr-TR')

    /* Personel numarası veya kullanıcı adı yazıldıysa o kişinin adına
       çevriliyor — kayıtta numara değil ad yazıyor. */
    const kisi = q
      ? veri.personel.find(
          (p) =>
            String(p.no || '').toLocaleLowerCase('tr-TR') === q ||
            String(p.kullanici || '').toLocaleLowerCase('tr-TR') === q
        )
      : null

    return veri.kayit.filter((k) => {
      if (tur !== 'hepsi' && k.tur !== tur) return false
      if (kaynak === 'servis' && k.rol !== 'servis') return false
      if (kaynak === 'paksan' && k.rol === 'servis') return false
      if (!araliktaMi(k.tarih, aralik)) return false
      if (!q) return true
      if (kisi) return k.personel === kisi.ad
      return `${k.ozet} ${k.personel}`.toLocaleLowerCase('tr-TR').includes(q)
    })
  }, [veri, suzgecVar, sorgu, tur, kaynak, aralik])

  /* Süzgeç yokken liste hiç getirilmiyor (null); sıralama da o zaman
     çalışmıyor. */
  const liste = useMemo(
    () =>
      suzulmus &&
      siraliListe(suzulmus, siralama, {
        tarih: (k) => k.tarih,
        personel: (k) => k.personel,
        rol: (k) => rolYazi(k.rol),
        tur: (k) => k.tur,
        ozet: (k) => k.ozet,
      }),
    [suzulmus, siralama]
  )

  return (
    <>
      <Baslik ad="İşlem Kaydı" />

      <SuzgecCubugu>
        <Secim ad="İşlem" deger={tur} onDegis={setTur} secenekler={TURLER} genislik={175} />

        <Secim
          ad="Kim"
          deger={kaynak}
          onDegis={setKaynak}
          secenekler={KAYNAKLAR}
          genislik={165}
        />

        <TarihAraligi aralik={aralik} onDegis={setAralik} />

        <form
          className="secim-alan secim-alan--genis"
          onSubmit={(e) => {
            e.preventDefault()
            setSorgu(ara.trim())
          }}
        >
          <span className="secim-alan__ad">Ara</span>
          <div className="satir" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <input
              className="sec"
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="Personel, PRS003, SRV2608184821, MST000001…"
            />
            <button className="dg dg--ana" type="submit">Ara</button>
            {sorgu && (
              <button
                className="dg"
                type="button"
                onClick={() => {
                  setAra('')
                  setSorgu('')
                }}
              >
                Temizle
              </button>
            )}
          </div>
        </form>

        {liste && <span className="suzgec-cubugu__sayi">{liste.length} kayıt</span>}
      </SuzgecCubugu>

      <div className="kart">
        {yukleniyor ? (
          <Bekleme satir={4} />
        ) : !liste ? (
          <Bos metin="Personel, talep, müşteri veya servis numarası yazıp arayın ya da tarih aralığı seçin." />
        ) : liste.length === 0 ? (
          <Bos metin="Bu süzgeçle kayıt bulunamadı." />
        ) : (
          <div className="tablo-sar">
            <table>
              <thead>
                <tr>
                  <SiraliBaslik
                    ad="Tarih"
                    alan="tarih"
                    siralama={siralama}
                    onSirala={cevir}
                    genislik={170}
                  />
                  <SiraliBaslik
                    ad="Personel"
                    alan="personel"
                    siralama={siralama}
                    onSirala={cevir}
                    genislik={150}
                  />
                  <SiraliBaslik
                    ad="Rol"
                    alan="rol"
                    siralama={siralama}
                    onSirala={cevir}
                    genislik={110}
                  />
                  <SiraliBaslik
                    ad="Tür"
                    alan="tur"
                    siralama={siralama}
                    onSirala={cevir}
                    genislik={150}
                  />
                  <SiraliBaslik ad="İşlem" alan="ozet" siralama={siralama} onSirala={cevir} />
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => (
                  <tr key={k.id}>
                    <td className="kucuk sonuk mono">{tarihYaz(k.tarih)}</td>
                    <td>{k.personel}</td>
                    <td className="kucuk sonuk">{rolYazi(k.rol)}</td>
                    <td>
                      <span className={'rz rz--' + (ONEMLI.includes(k.tur) ? 'turuncu' : 'gri')}>
                        {TUR_ADI[k.tur] || k.tur}
                      </span>
                    </td>
                    <td>{k.ozet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
