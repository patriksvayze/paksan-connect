import { useEffect, useMemo, useState } from 'react'
import {
  bayileriGetirBackoffice, cariHareketleri, destekOturumlariGetir, islemKaydiGetir,
  makineKayitlariGetir, musterileriGetir, personelGetir, servisleriGetirBackoffice,
  talepleriGetir,
} from '../veri'
import { useVeri } from '../kanca'
import { bayileriGetir, servisleriGetir } from '../../marka'
import { Baslik, Bekleme } from './ortak'
import { araliktaMi, BOS_ARALIK, SuzgecCubugu, TarihAraligi } from './suzgec'
import { BOLUMLER } from './rapor/bolumler'
import { bolumuExceleAktar, RaporBolumu } from './rapor/Gorunum'
import { karsilastirilabilirMi, oncekiDonemdeMi } from './rapor/hesap'

/* ==========================================================================
   Raporlar — yönetim ekranı

   17 EYLÜL 2026'DA BAŞTAN KURULDU (kullanıcının isteği: "yöneticilerin
   çok beğenmesini ve gerçekten kullanmalarını istediğim bir alan").

   ESKİ HÂLİ NEYİ EKSİK BIRAKIYORDU
     · Ekosistemin yarısı raporlarda yoktu: servis ağı, hak ediş ve
       servis bakiyesi, garanti içi/dışı ayrımı, parça sevki, yeniden
       açılan talepler, bayiye atanan teklifler, servisi olmayan
       makineler.
     · Hiç grafik yoktu; her rapor düz bir tabloydu.
     · Bazı raporlar eski dünyaya göre sayıyordu: servisin kendi parça
       siparişi müşteri talebi gibi, servis firması personel gibi,
       "Servis tahsilatı" PAKSAN servisten para alıyormuş gibi.

   YENİ DÜZEN — SEKMELER
     Her sekme bir yönetici sorusunu cevaplıyor (bkz. rapor/bolumler/).
     Her sekmede aynı üç kat var:
       1  ölçüler      önceki eşit dönemle karşılaştırmalı; iyi yönü
                       bilinen ölçüde fark yeşil ya da kırmızı
       2  grafikler    zaman içindeki gidiş ve sıralamalar
       3  tablolar     sıralanabilir; satıra tıklayınca ilgili liste
                       süzgeçli açılıyor; her tablo ve bütün sekme
                       Excel'e iniyor
     Genel Bakış'ta ayrıca "Dikkat İsteyenler": şu an bir şey
     yapılması gereken işler, tarih süzgecinden bağımsız.

   Hesaplar tek yerde (rapor/hesap.js), çizim tek yerde (rapor/Gorunum.jsx).
   Bir bölümün hesabı patlarsa yalnız o sekme hata gösteriyor; ekranın
   geri kalanı çalışmaya devam ediyor.
   ========================================================================== */

const M = {
  baslik: 'Raporlar',
  okumaHatasi: 'Rapor verileri okunamadı. Sayfayı yenileyin; sorun sürerse yöneticinize haber verin.',
  bolumHatasi: 'Bu rapor hesaplanamadı. Diğer sekmeleri inceleyebilirsiniz. Sayfayı yenileyin; sorun sürerse yöneticinize haber verin.',
  karsilastirma: 'Farklar, seçilen dönemden önceki eşit uzunluktaki döneme göre hesaplanır.',
  karsilastirmaYok: 'Tüm zamanlar seçili olduğu için önceki dönemle karşılaştırma yapılmaz.',
  sekmeler: 'Rapor sekmeleri',
  bolumExcel: "Bu Sekmeyi Excel'e Aktar",
}

/* ------------------------------------------- Dashboard ile ortak adımlar

   Dashboard'un yönetim özeti bölümlerin kendi hesabını "Son 30 gün"
   için çağırıyor (22 Eylül 2026): özet ayrı bir hesapla yazılsaydı
   Dashboard ile rapor aynı ölçüye farklı rakam verebilirdi. Veri ve
   bağlam bu yüzden tek yerde kuruluyor. */

/** Raporların okuduğu bütün kayıtlar. */
export function raporVerisiOku() {
  return {
    talepler: talepleriGetir(),
    musteriler: musterileriGetir(),
    personel: personelGetir(),
    makineler: makineKayitlariGetir(),
    /* Backoffice'te liste hiç değiştirilmemişse bu iki okuyucu null
       dönüyor; asıl liste katalogda (marka kapısı). */
    servisler: servisleriGetirBackoffice() || servisleriGetir(),
    bayiler: bayileriGetirBackoffice() || bayileriGetir(),
    cari: cariHareketleri(),
    destekOturumlari: destekOturumlariGetir(),
    islemKaydi: islemKaydiGetir(),
  }
}

/** Bir bölümü verilen dönem için hesaplar. */
export function bolumuHesapla(bolum, veri, aralik, { git, rol } = {}) {
  const donemde = (z) => Number.isFinite(z) && araliktaMi(z, aralik)
  const oncekide = (z) => Number.isFinite(z) && oncekiDonemdeMi(z, aralik)
  return bolum.uret({
    veri,
    aralik,
    donemde,
    oncekide,
    karsilastir: karsilastirilabilirMi(aralik),
    donem: veri.talepler.filter((t) => donemde(t.createdAt)),
    onceki: veri.talepler.filter((t) => oncekide(t.createdAt)),
    git,
    rol,
  })
}

export function Raporlar({ rol, personel, surum, git, sorgu }) {
  const [bolumId, setBolumId] = useState(sorgu?.bolum || 'genel')
  const [aralik, setAralik] = useState({ ...BOS_ARALIK, tur: 'gun30' })

  useEffect(() => {
    if (sorgu?.bolum) setBolumId(sorgu.bolum)
  }, [sorgu])

  const { veri, yukleniyor, hata } = useVeri(raporVerisiOku, [surum], null)

  const bolum = BOLUMLER.find((b) => b.id === bolumId) || BOLUMLER[0]

  /* Bölüm yalnız veri, dönem ya da sekme değişince yeniden hesaplanıyor;
     tablo sıralaması ve sayfa geçişi hesabı tekrarlatmıyor. */
  const hesap = useMemo(() => {
    if (!veri) return null
    try {
      return { sonuc: bolumuHesapla(bolum, veri, aralik, { git, rol }) }
    } catch (e) {
      console.error('Rapor hesaplanamadı:', bolum.id, e)
      return { hata: e }
    }
  }, [veri, aralik, bolum, git, rol])

  const bas = (sag) => <Baslik ad={M.baslik} sag={sag} />

  if (hata) {
    return (
      <>
        {bas()}
        <div className="hata">{M.okumaHatasi}</div>
      </>
    )
  }

  if (yukleniyor || !veri) {
    return (
      <>
        {bas()}
        <Bekleme satir={6} />
      </>
    )
  }

  return (
    <>
      {bas(
        hesap?.sonuc && (
          <button className="dg" onClick={() => bolumuExceleAktar(bolum.ad, hesap.sonuc, personel)}>
            {M.bolumExcel}
          </button>
        ),
      )}

      <nav className="rapor-sekmeler" aria-label={M.sekmeler}>
        {BOLUMLER.map((b) => (
          <button
            key={b.id}
            type="button"
            className={'rapor-sekme' + (b.id === bolum.id ? ' rapor-sekme--on' : '')}
            aria-current={b.id === bolum.id ? 'page' : undefined}
            onClick={() => setBolumId(b.id)}
          >
            {b.ad}
          </button>
        ))}
      </nav>

      <SuzgecCubugu>
        <TarihAraligi aralik={aralik} onDegis={setAralik} />
        <span className="suzgec-cubugu__sayi">
          {karsilastirilabilirMi(aralik) ? M.karsilastirma : M.karsilastirmaYok}
        </span>
      </SuzgecCubugu>

      <div className="rapor-bolum-bas">
        <h2>{bolum.ad}</h2>
        <p>{bolum.soru}</p>
      </div>

      {hesap?.hata ? (
        <div className="hata">{M.bolumHatasi}</div>
      ) : (
        hesap?.sonuc && <RaporBolumu sonuc={hesap.sonuc} personel={personel} />
      )}
    </>
  )
}
