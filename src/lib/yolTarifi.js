/* ==========================================================================
   Yol tarifi — işin adresine telefonun harita uygulamasıyla

   KARAR (29 Eylül 2026, kullanıcının): Servisim'de iş ayrıntısındaki
   adresin altında "Yol Tarifi". Dokununca telefonun harita uygulaması
   (Google Haritalar) açılıyor, rotayı o çiziyor. Uygulamanın içinde
   harita yok: anahtar, ücret, ek eklenti gerekmiyor; "Ara" bağlantısının
   telefonu açması gibi bağlantıyı Android açıyor (Capacitor, uygulamanın
   kendisi olmayan her adresi telefona veriyor).

   YAZILI ADRESLE, KONUMLA DEĞİL. Talepte konum işareti (GPS) yok; yalnız
   çiftçinin yazdığı adres ve il/ilçe. Harita bununla en fazla köye ya da
   mahalleye götürür; "kooperatifin arkası"nı ve tarlayı bilmez, son
   kısım telefonla. Konum işareti ayrı bir iş (kullanıcıya anlatıldı,
   şimdilik yok). Aynı adlı köy başka ilçede de olabildiği için ilçe ve
   il de sorguya giriyor; "Merkez" ilçesi yazılmıyor, haritada yer adı
   değil.

   Bağlantı Google'ın herkese açık "Maps URLs" biçiminde (api=1): telefonda
   Haritalar uygulamasını, bilgisayarda tarayıcıyı açıyor. `geo:` biçimi
   bilgisayarda hiçbir şey açmıyordu; `dir_action=navigate` servis
   pini görmeden sürüşü başlatırdı, konmadı.
   ========================================================================== */

const ULKE_ADI = { TR: 'Türkiye' }

export function yolTarifiAdresi({ adres, ilce, il, ulke } = {}) {
  const hedef = [
    String(adres || '').trim(),
    ilce && !/^merkez$/i.test(String(ilce).trim()) ? ilce : '',
    il,
    ULKE_ADI[ulke || 'TR'] || '',
  ]
    .filter(Boolean)
    .join(', ')
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(hedef)
}
