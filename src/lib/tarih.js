/* ==========================================================================
   Tarih girişi — ileri tarih denetimi

   NEDEN VAR

   Randevu ve plan ekranlarında tarih kutusu vardı ve girilen tarihin
   bugünden önce olup olmadığına HİÇBİRİ bakmıyordu. Servis panelinde
   "10 Ağustos 2026" yazılabiliyor, backoffice'te geçen ayın bir günü
   seçilebiliyordu. İkisi de kaydediliyor, müşteriye bildirim gidiyor
   ve takvimde geçmişte duran bir randevu oluşuyordu.

   Bunun sessiz bir hatası da vardı: geçmiş tarihli randevu, "bugünün
   planı" bloğunda "tarihi geçmiş randevu" olarak görünüyor ve servisin
   gitmediği bir iş gibi okunuyordu (bkz. servis/ServisPanel.jsx →
   Bugun).

   İKİ KATMAN

   Kutuya `min` veriliyor — takvim geçmiş günleri hiç açmıyor. Ama
   `min` yalnız takvimin kendi denetimi; elle yazılan ya da yapıştırılan
   değer geçebiliyor. Bu yüzden kaydetmeden önce burada bir kez daha
   bakılıyor.

   SAAT DUYARLILIĞI AYRI

   Yalnız gün sorulduğunda (servis randevusu) bugün geçerli: sabah
   randevu alınıp öğleden sonra gidilebilir. Gün ve saat sorulduğunda
   (backoffice planı) geçmiş SAAT de geçersiz — bugünün sabahı için
   randevu verilemez.

   ÜÇÜNCÜ KATMAN: KUTUDAN ÇIKINCA (22 Eylül 2026, kullanıcının isteği:
   "bugünden öncesi seçilememeli"). Takvim geçmiş günleri kapatıyor
   ama klavyeyle gün/ay/yıl yazılınca Chrome geçmiş tarihi kutuda
   bırakıyordu; hata ancak kaydet düğmesinde çıkıyordu. Artık kutudan
   çıkıldığı anda geçmiş tarih siliniyor ve uyarı görünüyor. Yazarken
   DEĞİL, çıkarken: yıl hane hane yazılırken kutu 0002, 0020, 0202
   gibi ara değerlerden geçiyor; her değişiklikte silinseydi yıl hiç
   yazılamazdı.
   ========================================================================== */

/** Verilen zamanın gün başlangıcı (00:00). */
export function gunBasi(t = Date.now()) {
  return new Date(t).setHours(0, 0, 0, 0)
}

function iki(n) {
  return String(n).padStart(2, '0')
}

/**
 * `<input type="date">` için bugünün değeri.
 * `toISOString` KULLANILMIYOR: o UTC'ye çeviriyor ve Türkiye'de akşam
 * saatlerinde bir sonraki günü veriyor.
 */
export function bugunGirdi(t = Date.now()) {
  const d = new Date(t)
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`
}

/** `<input type="datetime-local">` için şu anın değeri. */
export function simdiGirdi(t = Date.now()) {
  const d = new Date(t)
  return `${bugunGirdi(t)}T${iki(d.getHours())}:${iki(d.getMinutes())}`
}

/**
 * Serbest yazıdaki tarih bugünden önce mi? Tarih kutusu olmayan,
 * "30 gün / 30.09.2026" gibi iki biçimi de kabul eden alanlar için
 * (teklifin geçerliliği). Yazıda tarih yoksa ya da takvimde olmayan
 * bir günse (31.02) false: "30 gün" yazan satışçı engellenmez.
 * @param {string} metin
 * @returns {boolean}
 */
export function metindeGecmisTarihVar(metin, t = Date.now()) {
  const bulunanlar = String(metin || '').matchAll(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)/g)
  for (const [, g, a, y] of bulunanlar) {
    const yil = y.length === 2 ? 2000 + Number(y) : Number(y)
    const d = new Date(yil, Number(a) - 1, Number(g))
    if (d.getMonth() !== Number(a) - 1 || d.getDate() !== Number(g)) continue
    if (d.getTime() < gunBasi(t)) return true
  }
  return false
}

/**
 * Girilen tarih ileri tarihli mi?
 * @param {string} deger input değeri ('2026-09-12' ya da '2026-09-12T14:30')
 * @param {{saatli?: boolean}} ayar saatli ise geçmiş saat de geçersiz
 * @returns {boolean}
 */
export function ileriTarihMi(deger, { saatli = false } = {}) {
  if (!deger) return false
  const zaman = new Date(deger).getTime()
  if (Number.isNaN(zaman)) return false
  return saatli ? zaman >= Date.now() : gunBasi(zaman) >= gunBasi()
}
