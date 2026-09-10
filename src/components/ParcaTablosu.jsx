/* ==========================================================================
   PARÇA LİSTESİ — HER YERDE AYNI ÜÇ SÜTUN

   NEDEN TEK BİLEŞEN

   Parça listesi altı ayrı ekranda görünüyor: servis kaydının onay
   yaprağı, servisin talep ekranı, backoffice'in kayıt kartı, sevk
   formu, geçmiş kayıtlar ve hak ediş özeti. Her biri kendi satırını
   çiziyordu ve hepsi başka türlü çiziyordu — biri "Rulman × 2", öteki
   "Rulman (2013101010) × 2", bir başkası alt alta iki satır.

   Virgülle birleştirilmiş tek satır ("A × 2, B × 1, C × 4") üç parçadan
   sonra okunmuyor: kod, ad ve adet birbirine giriyor, telefonda da
   sıkışıp sarıyor.

   SÜTUN SIRASI: KOD · PARÇA · ADET

   Kod önde, çünkü PAKSAN'ın yedek parça masası listeyi koda göre
   okuyor; hazırlanacak şey o. Adet sonda ve sağa yaslı: rakamlar alt
   alta hizalanınca toplam bir bakışta görülüyor.

   KOD OLMAYAN SATIR DA ÇİZİLİYOR

   Katalog bağlanmadan önce kaydedilmiş kayıtlarda parçanın yalnız adı
   var. O satırlarda kod hücresi "—" ile geçiliyor; eski kayıt
   okunmaz hâle gelmiyor.

   TABLO DEĞİL IZGARA. `<table>` telefonda parça adını kırpıyor ya da
   yatay kaydırma açıyordu. Izgarada ad sütunu sarıyor, kod ve adet
   sabit kalıyor.
   ========================================================================== */

/**
 * @param {{parcalar: Array<{kod?: string, ad: string, adet: number}>, baslik?: boolean}} p
 *   `baslik` false verilirse sütun adları çizilmiyor (dar kutular için).
 */
export function ParcaTablosu({ parcalar = [], baslik = true }) {
  const liste = parcalar.filter((p) => p?.ad && Number(p.adet) > 0)
  if (!liste.length) return null

  return (
    <div className="parca-tablo" role="table">
      {baslik && (
        <div className="parca-tablo__baslik" role="row">
          <span role="columnheader">Parça kodu</span>
          <span role="columnheader">Parça adı</span>
          <span role="columnheader">Adet</span>
        </div>
      )}
      {liste.map((p, i) => (
        <div className="parca-tablo__satir" role="row" key={(p.kod || p.ad) + i}>
          <span className="parca-tablo__kod mono" role="cell">
            {p.kod || '—'}
          </span>
          <span className="parca-tablo__ad" role="cell">
            {p.ad}
          </span>
          <span className="parca-tablo__adet" role="cell">
            {p.adet}
          </span>
        </div>
      ))}
    </div>
  )
}
