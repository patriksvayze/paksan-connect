import { IconRight } from '../components/Icons'

/* ==========================================================================
   Alt montaj listesi — Servisim'in iki parça ekranının ortak listesi

   Servis kaydındaki parça seçimi (ekranlar/ParcaSec.jsx) ve PAKSAN'a
   sipariş (ekranlar/SiparisVer.jsx) aynı listeyle başlıyor: önce
   parçanın bağlı olduğu alt montaj, sonra o montajın parçaları. İki
   ekran listeyi ayrı ayrı çiziyordu; biri değişince öteki unutulurdu.

   SATIRDA YALNIZ AD VE SAYI (29 Eylül 2026, kullanıcının kararı: "parça
   kategori listesinde görsel olmayacak, spesifik bir kategoriye
   girildiğinde o kategoriye ait parçalar görselleri ile birlikte
   listelenecek"). Aynı gün satırlara montajın ilk parçasının resmi ve
   hangi makineye ait olduğu eklenmişti; bir parçanın resmi bütün montajı
   temsil etmiyor. Resim parça kartlarında. Montajın adı fiyat listesinde
   nasıl yazıyorsa öyle; sağdaki sayı kaç parça olduğunu söylüyor.
   ========================================================================== */
export function MontajListesi({ katalog, onSec }) {
  return (
    <div className="montaj-liste">
      {(katalog?.gruplar || []).map((g) => (
        <button key={g.id} type="button" className="montaj" onClick={() => onSec(g)}>
          <span className="montaj__ad">{g.ad}</span>
          <span className="montaj__sayi">{g.adet}</span>
          <IconRight size={18} />
        </button>
      ))}
    </div>
  )
}
