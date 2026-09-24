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

   GÖRSEL SÜTUNU (22 Eylül 2026, kullanıcının isteği): satırın başında
   parçanın küçük resmi (bkz. ParcaResmi.jsx). Servisim'in Hak Ediş
   yaprağı bunun için ayrı bir görselli liste taşıyordu; o liste bu
   bileşene katıldı, parça her ekranda aynı biçimde görünüyor.

   DAR KUTUDA KOD ADIN ÜSTÜNE ÇIKIYOR. Resim, kod, ad ve adet yan yana
   telefonda ada yer bırakmıyordu. Kutu dar olduğunda (Servisim, kargo
   penceresi) kod ile ad aynı hücrede alt alta duruyor; geniş panelde
   dört sütun. Karar kutunun genişliğine göre, ekranınkine göre değil:
   backoffice'in dar penceresi de telefon gibi davranıyor
   (bkz. backoffice.css → .parca-tablo).

   SATIR NOTU (24 Eylül 2026): satır `not` taşıyorsa adın altında turuncu
   bir etiket — eksik gönderilen serviste siparişinde "gönderilmedi"
   (bkz. backoffice/veri.js → kalanParcalariGonder). Yazıyı çağıran
   ekran veriyor; bu bileşen Connect'te kullanılmıyor.

   TUTAR SÜTUNU (24 Eylül 2026, kullanıcının isteği: backoffice'te
   servis siparişinin parça tablosunda tutarlar yazmıyordu). `tutarli`
   verilirse satırın sonunda satır tutarı, adet birden çoksa altında
   birim fiyat. Rakam kaydın fiyat görüntüsünden (satırın `tutar` ve
   `birimFiyat` alanları, sipariş anının fiyatı); bileşen hesaplamıyor.
   Tutarı olmayan satırda "—". Genel toplam tabloda değil, çağıran
   ekranın dökümünde: KDV ve indirimler satıra bölünmüyor.
   ========================================================================== */

import { PARA_BIRIMI, paraYaz } from '../marka'
import { ParcaResmi, useParcaKatalogu } from './ParcaResmi'

/**
 * @param {{parcalar: Array<{kod?: string, ad: string, adet: number, tutar?: number, birimFiyat?: number}>,
 *          baslik?: boolean, tutarli?: boolean}} p
 *   `baslik` false verilirse sütun adları çizilmiyor (dar kutular için).
 */
export function ParcaTablosu({ parcalar = [], baslik = true, tutarli = false }) {
  const liste = parcalar.filter((p) => p?.ad && Number(p.adet) > 0)
  /* Katalog yalnız görseli kayıtta yazmayan (eski) satır için iniyor. */
  const katalog = useParcaKatalogu(liste.some((p) => p.kod && p.gorsel === undefined))
  if (!liste.length) return null

  return (
    <div className={'parca-tablo' + (tutarli ? ' parca-tablo--tutarli' : '')} role="table">
      {baslik && (
        <div className="parca-tablo__baslik" role="row">
          <span className="parca-tablo__resim" role="columnheader" />
          <span className="parca-tablo__kod" role="columnheader">Parça kodu</span>
          <span className="parca-tablo__ad" role="columnheader">Parça adı</span>
          <span className="parca-tablo__adet" role="columnheader">Adet</span>
          {tutarli && (
            <span className="parca-tablo__tutar" role="columnheader">Tutar</span>
          )}
        </div>
      )}
      {liste.map((p, i) => (
        <div className="parca-tablo__satir" role="row" key={(p.kod || p.ad) + i}>
          <span className="parca-tablo__resim" role="cell">
            <ParcaResmi katalog={katalog} kod={p.kod} gorsel={p.gorsel} />
          </span>
          <span className="parca-tablo__kod mono" role="cell">
            {p.kod || '—'}
          </span>
          <span className="parca-tablo__ad" role="cell">
            {p.ad}
            {p.not && <span className="rz rz--turuncu parca-tablo__not">{p.not}</span>}
          </span>
          <span className="parca-tablo__adet" role="cell">
            {p.adet}
          </span>
          {tutarli && (
            <span className="parca-tablo__tutar" role="cell">
              {typeof p.tutar === 'number' ? `${paraYaz(p.tutar)} ${PARA_BIRIMI}` : '—'}
              {typeof p.birimFiyat === 'number' && Number(p.adet) > 1 && (
                <span className="parca-tablo__birim">
                  Birim {paraYaz(p.birimFiyat)} {PARA_BIRIMI}
                </span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
