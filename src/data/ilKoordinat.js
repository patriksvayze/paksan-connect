/* ==========================================================================
   İl merkezlerinin koordinatları

   NEDEN VAR

   Fiyat teklifi talebi geldiğinde backoffice’te "bu müşteriye hangi servis
   bakacak" sorusunun cevabı yazılı olmalı. Talebin içinde il ve ilçe
   var ama koordinat yok; servis listesinde ise koordinat var
   (bkz. src/data/servisler.js). İkisini bağlayan halka bu tablo.

   Müşterinin ilinde servis varsa zaten ada göre eşleşiyor ve buraya
   ihtiyaç kalmıyor. Tablo, ilinde servis OLMAYAN müşteri için gerekli:
   "en yakın servis hangisi" ancak koordinatla cevaplanabiliyor.

   Değerler il merkezlerinin yaklaşık koordinatları. Kuş uçuşu mesafe
   hesabı için fazlasıyla yeterli — amaç sıralama, navigasyon değil.
   ========================================================================== */

export const IL_KOORDINAT = {
  Adana: [37.0, 35.3213],
  Adıyaman: [37.7648, 38.2786],
  Afyonkarahisar: [38.7507, 30.5567],
  Ağrı: [39.7191, 43.0503],
  Aksaray: [38.3687, 34.037],
  Amasya: [40.6499, 35.8353],
  Ankara: [39.9334, 32.8597],
  Antalya: [36.8969, 30.7133],
  Ardahan: [41.1105, 42.7022],
  Artvin: [41.1828, 41.8183],
  Aydın: [37.856, 27.8416],
  Balıkesir: [39.6484, 27.8826],
  Bartın: [41.6344, 32.3375],
  Batman: [37.8812, 41.1351],
  Bayburt: [40.2552, 40.2249],
  Bilecik: [40.1451, 29.9799],
  Bingöl: [38.8854, 40.4966],
  Bitlis: [38.3938, 42.1232],
  Bolu: [40.732, 31.6082],
  Burdur: [37.7203, 30.2908],
  Bursa: [40.1826, 29.0665],
  Çanakkale: [40.1553, 26.4142],
  Çankırı: [40.6013, 33.6134],
  Çorum: [40.5506, 34.9556],
  Denizli: [37.7765, 29.0864],
  Diyarbakır: [37.9144, 40.2306],
  Düzce: [40.8438, 31.1565],
  Edirne: [41.6771, 26.5557],
  Elazığ: [38.6748, 39.2226],
  Erzincan: [39.75, 39.5],
  Erzurum: [39.9, 41.27],
  Eskişehir: [39.7767, 30.5206],
  Gaziantep: [37.0662, 37.3833],
  Giresun: [40.9128, 38.3895],
  Gümüşhane: [40.4386, 39.5086],
  Hakkari: [37.5744, 43.7408],
  Hatay: [36.2, 36.1667],
  Iğdır: [39.9167, 44.0333],
  Isparta: [37.7648, 30.5566],
  İstanbul: [41.0082, 28.9784],
  İzmir: [38.4237, 27.1428],
  Kahramanmaraş: [37.5858, 36.9371],
  Karabük: [41.2061, 32.6204],
  Karaman: [37.1759, 33.2287],
  Kars: [40.6167, 43.1],
  Kastamonu: [41.3887, 33.7827],
  Kayseri: [38.7312, 35.4787],
  Kırıkkale: [39.8468, 33.5153],
  Kırklareli: [41.7333, 27.2167],
  Kırşehir: [39.1425, 34.1709],
  Kilis: [36.7184, 37.1212],
  Kocaeli: [40.8533, 29.8815],
  Konya: [37.8746, 32.4932],
  Kütahya: [39.4242, 29.9833],
  Malatya: [38.3552, 38.3095],
  Manisa: [38.6191, 27.4289],
  Mardin: [37.3212, 40.7245],
  Mersin: [36.8121, 34.6415],
  Muğla: [37.2153, 28.3636],
  Muş: [38.9462, 41.7539],
  Nevşehir: [38.6939, 34.6857],
  Niğde: [37.9667, 34.6833],
  Ordu: [40.9839, 37.8764],
  Osmaniye: [37.213, 36.1763],
  Rize: [41.0201, 40.5234],
  Sakarya: [40.7569, 30.3781],
  Samsun: [41.2867, 36.33],
  Siirt: [37.9333, 41.95],
  Sinop: [42.0231, 35.1531],
  Sivas: [39.7477, 37.0179],
  Şanlıurfa: [37.1591, 38.7969],
  Şırnak: [37.4187, 42.4918],
  Tekirdağ: [40.9781, 27.5117],
  Tokat: [40.3167, 36.5544],
  Trabzon: [41.0015, 39.7178],
  Tunceli: [39.3074, 39.4388],
  Uşak: [38.6823, 29.4082],
  Van: [38.4891, 43.4089],
  Yalova: [40.655, 29.2769],
  Yozgat: [39.8181, 34.8147],
  Zonguldak: [41.4564, 31.7987],
}

/** İl adından koordinat; bilinmiyorsa null. */
export function ilKoordinati(il) {
  const k = IL_KOORDINAT[il]
  return k ? { enlem: k[0], boylam: k[1] } : null
}
