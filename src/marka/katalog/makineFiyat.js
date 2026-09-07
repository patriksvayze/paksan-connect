/* ==========================================================================
   Makine fiyat listesi — BAYİ TARAFI

   ⚠⚠ BU FİYATLAR GERÇEK DEĞİL ⚠⚠

   Hepsi demo için uydurulmuş sayılardır. Ekranın nasıl çalıştığını,
   iskontonun ve teklif toplamının nasıl hesaplandığını göstermek için
   var. YAYINA ÇIKMADAN ÖNCE PAKSAN satış biriminden alınan gerçek
   liste buraya yazılmalı.

   Bu dosya doldurulmadan `MAKINE_FIYAT_AKTIF` true yapılmamalı —
   bayinin müşteriye yanlış fiyat söylemesi, düzeltmesi en zor
   hatalardan biridir.

   NEDEN BAYİYE FİYAT GÖSTERİYORUZ

   Bayinin her gün aldığı soru "bu makine kaça?". Bugün bunun için
   PAKSAN'ı arıyor ya da e-postadaki PDF listeyi açıyor. Fiyat panelde
   olunca bayi paneli, bilgi aldığı yer hâline geliyor — bilgi verdiği
   yer değil. Bayi portallarının sektörde başlıca benimsenme sebebi budur.

   ÜÇ FİYAT VAR, ÜÇÜ DE AYRI ANLAM TAŞIYOR

     liste    PAKSAN'ın yayınladığı fiyat (KDV hariç)
     alış     bayinin PAKSAN'a ödediği — liste eksi iskonto
     tavsiye  bayinin müşteriden istemesi önerilen fiyat

   Aradaki fark bayinin kârı ve GÖRÜNMESİ GEREKİYOR. Kârını görmeyen
   bayi ekrandaki fiyata güvenmez, telefonu eline alır.

   TEDARİK BİÇİMİ

   PAKSAN'da her model bayide durmuyor:

     stok     bayi satın alıp sahasında tutuyor, seri numarası bayide
     siparis  müşteri bulununca sipariş açılıyor, fabrikadan çıkıyor

   Satış ekranı buna bakıyor: stoklu modelde seri numarası listeden
   seçiliyor, sipariş üzerine modelde PAKSAN'a sipariş açılıyor.
   ========================================================================== */

/* Gerçek liste girilene kadar false kalırsa ekran fiyat göstermez,
   "fiyat için PAKSAN'a danışın" der. Demo sırasında true. */
export const MAKINE_FIYAT_AKTIF = true

/* Bayinin varsayılan iskontosu. Bayi kaydında `iskonto` alanı varsa o
   geçerli — bayiden bayiye değişebilir ve gerçekte değişiyor. */
export const BAYI_ISKONTO = 0.18

/* Yedek parçada iskonto daha yüksek: parça marjı bayinin servis
   gelirinin ana kalemi. */
export const PARCA_BAYI_ISKONTO = 0.3

/* Tavsiye satış fiyatı liste fiyatının üstünde değil, ona eşit
   tutuluyor. Liste fiyatı zaten müşteriye açıklanan fiyat; bayinin
   üstüne çıkması PAKSAN'ın fiyat itibarını bozar. Alan yine de ayrı
   duruyor: kampanyada tavsiye düşerken liste sabit kalıyor. */
export const MAKINE_FIYAT = {
  /* -------------------------------------------------- Büyük balya */
  'orkinos-1270': { liste: 2850000, tedarik: 'siparis', teslimGun: 45 },
  'orkinos-870': { liste: 2140000, tedarik: 'siparis', teslimGun: 45 },
  'orka-870': { liste: 1780000, tedarik: 'stok' },
  'albatros-870': { liste: 1620000, tedarik: 'stok' },

  /* -------------------------------------------------- Küçük balya */
  'super-yunus': { liste: 685000, tedarik: 'stok' },
  'super-yunus-dual2': { liste: 795000, tedarik: 'stok' },
  'super-yunus-3yabali': { liste: 742000, tedarik: 'stok' },
  'super-8002': { liste: 610000, tedarik: 'stok' },
  'super-8002e': { liste: 668000, tedarik: 'stok' },
  'super-8002e-dual2': { liste: 780000, tedarik: 'stok' },
  'hammer': { liste: 545000, tedarik: 'stok' },

  /* --------------------------------------------------- Rulo balya */
  'ipak-rulo': { liste: 1320000, tedarik: 'siparis', teslimGun: 30 },

  /* ---------------------------------------------------- Yem karma */
  'diamond-dikey': { liste: 1950000, tedarik: 'siparis', teslimGun: 40 },
  'pelican-yatay': { liste: 1640000, tedarik: 'siparis', teslimGun: 40 },

  /* -------------------------------------------------------- Silaj */
  'scorpion-silaj': { liste: 2380000, tedarik: 'siparis', teslimGun: 50 },
  'silaj-paketleme': { liste: 1150000, tedarik: 'stok' },

  /* ----------------------------------------------------- Çayır/ot */
  'yengec-cayir': { liste: 425000, tedarik: 'stok' },
  'kirlangic-ot-toplama': { liste: 298000, tedarik: 'stok' },

  /* ------------------------------------------------ Toprak işleme */
  'rotovator': { liste: 265000, tedarik: 'stok' },
  'tesviye-kuregi': { liste: 148000, tedarik: 'stok' },
}

/* ==========================================================================
   Kampanyalar

   ⚠ BUNLAR DA DEMO. Gerçek kampanya PAKSAN satış biriminden gelir.

   Kampanya bayinin İSKONTOSUNU artırıyor, liste fiyatını değil.
   Sebebi: liste fiyatı müşteriye açıklanan fiyat; kampanyada düşen
   şey bayinin maliyeti, böylece bayi ya kârını artırıyor ya da
   müşteriye indirim yapabiliyor. Karar bayinin.

   `biter` geçtiyse kampanya kendiliğinden düşüyor; listeden silmek
   gerekmiyor.
   ========================================================================== */
export const KAMPANYALAR = [
  {
    id: 'sezon-2026-kucuk-balya',
    ad: 'Sezon öncesi küçük balya',
    aciklama: 'Küçük balya makinelerinde ek %5 bayi iskontosu.',
    urunler: ['super-yunus', 'super-yunus-dual2', 'super-8002', 'super-8002e'],
    ekIskonto: 0.05,
    biter: new Date('2026-11-30').getTime(),
  },
  {
    id: 'orkinos-erken-siparis',
    ad: 'Orkinos erken sipariş',
    aciklama: 'Orkinos serisinde ek %3 iskonto, teslim süresi 30 güne iniyor.',
    urunler: ['orkinos-1270', 'orkinos-870'],
    ekIskonto: 0.03,
    teslimGun: 30,
    biter: new Date('2026-12-31').getTime(),
  },
]
