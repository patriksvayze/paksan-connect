/* ==========================================================================
   Telefon numarası

   Numara artık iki parçadan oluşuyor:
     ulke → ISO kısaltması ('TR'), ülke listesinden geliyor
     tel  → BAŞTA SIFIR OLMADAN, sadece rakamlar: 5321234567

   Baştaki sıfır neden yok: uluslararası biçimde sıfır yazılmıyor
   (+90 532 …). Yurtdışındaki müşterilerimiz de aynı ekranı kullanacak,
   iki farklı kural olmasın diye herkes sıfırsız yazıyor. Kullanıcı
   alışkanlıkla sıfırla yazsa bile baştaki sıfırlar kendiliğinden
   atılıyor — uyarı çıkarıp uğraştırmıyoruz.
   ========================================================================== */

import { ulkeGetir, VARSAYILAN_ULKE } from '../data/ulkeler'

/** Sadece rakamları bırakır. */
export function telRakam(raw) {
  return (raw || '').replace(/\D/g, '')
}

/** Baştaki sıfırları atar: "0532…" ve "00532…" → "532…" */
export function telSifirsiz(raw) {
  return telRakam(raw).replace(/^0+/, '')
}

/* Bir numaranın en fazla kaç hane olabileceği.

   Sabit 10 verilmedi: Türkiye'de numara 10 hane ama Brezilya ve Çin'de
   11. Sabit sınır o müşterilerin numarasını hiç yazamaması demekti.
   Sınır seçili ülkenin hane sayısı — Türkiye'de tam olarak 10. Ülke
   listede yoksa geniş bırakılıyor. */
const EN_FAZLA_HANE = 14

/**
 * Yazarken biçimlendirir: 532 123 45 67
 * Baştaki sıfır kullanıcı yazsa bile alınmıyor; fazla hane yazılamıyor.
 */
export function formatTel(raw, enFazla = EN_FAZLA_HANE) {
  const sinir = enFazla || EN_FAZLA_HANE
  const r = telSifirsiz(raw).slice(0, sinir)
  const p = []
  if (r.length > 0) p.push(r.slice(0, 3))
  if (r.length > 3) p.push(r.slice(3, 6))
  if (r.length > 6) p.push(r.slice(6, 8))
  if (r.length > 8) p.push(r.slice(8, sinir))
  return p.join(' ')
}

/**
 * Numara eksiksiz mi?
 * Ülkenin hane sayısı biliniyorsa tam o kadar, bilinmiyorsa 6-14 arası.
 */
export function telGecerliMi(raw, ulke = VARSAYILAN_ULKE) {
  const n = telSifirsiz(raw).length
  const u = ulkeGetir(ulke)
  if (u.hane) return n === u.hane
  return n >= 6 && n <= 14
}

/** Ekranda gösterilecek tam hâli: +90 532 123 45 67 */
export function telGoster(ulke, tel) {
  const t = formatTel(tel)
  if (!t) return ''
  return `${ulkeGetir(ulke).kod} ${t}`
}

/** Kullanıcı nesnesinden doğrudan: telKullanici(user) */
export function telKullanici(user) {
  if (!user) return ''
  return telGoster(user.ulke || VARSAYILAN_ULKE, user.tel)
}

/* ==========================================================================
   Firma numarası — bayi, servis, PAKSAN

   Müşterinin numarası ülke koduyla ayrı ayrı saklanıyor (yukarısı).
   Firma numarası öyle değil: personel numarayı olduğu gibi yazıyor,
   çoğu sabit hat ve baştaki sıfırla söyleniyor.

   TEK ALAN VAR. Bir zamanlar iki alan vardı: "tuşlanacak" ve "ekranda
   görünen". İkisi de aynı numaraydı ve ikincisi yalnız boşlukların
   nereye konacağını söylüyordu. Personelin bunu yazması gerekmiyor —
   boşlukları ekran koyar. Kayıtta yalnız `tel` duruyor, biçim
   gösterildiği yerde hesaplanıyor.
   ========================================================================== */

/** Alana yazılabilenler: yalnız rakam ve baştaki artı. */
export function telGiris(ham) {
  const s = String(ham || '')
  const arti = s.trimStart().startsWith('+')
  return (arti ? '+' : '') + s.replace(/\D/g, '')
}

/**
 * Firma numarasını okunur biçime çevirir.
 *   03323210001   → 0332 321 00 01
 *   +903323210001 → +90 332 321 00 01
 * Hane sayısı tutmuyorsa numara olduğu gibi gösteriliyor: uydurulmuş
 * bir boşluk, yanlış numarayı doğru gibi gösterir.
 */
export function telFirma(ham) {
  const s = String(ham || '').trim()
  if (!s) return ''
  const arti = s.startsWith('+')
  let r = s.replace(/\D/g, '')
  let ulke = ''

  if (arti) {
    if (r.length <= 10) return '+' + r
    ulke = r.slice(0, -10)
    r = r.slice(-10)
  } else {
    r = r.replace(/^0+/, '')
  }

  if (r.length !== 10) return s

  const yazi = `${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6, 8)} ${r.slice(8, 10)}`
  return ulke ? `+${ulke} ${yazi}` : `0${yazi}`
}

/** Firma numarası aranabilir mi? En az yedi hane. */
export function telFirmaGecerliMi(ham) {
  return telRakam(ham).length >= 7
}

/* TEK NUMARA VAR.

   Kullanıcının bir telefon numarası var ve o numara hem hesabın kimliği
   hem de taleplerde arandığı numara. Uygulamanın hiçbir yerinden
   değiştirilemiyor — kayıt, profil, talep onayı, hepsinde kilitli.
   Değişikliği yalnızca PAKSAN yetkilisi, müşteriyle görüşerek yapıyor.

   Bir ara "ulaşım numarası" diye ikinci bir numara denendi (kullanıcı
   taleplerde aranacağı numarayı serbestçe değiştirebiliyordu). Kaldırıldı:
   numara serbestse kilit anlamsız kalıyor, telefonu eline geçiren biri
   talep ekranından numarayı değiştirip hesabı devralabiliyor.           */

/**
 * Hesap eşleştirmesi için tek biçim: 905321234567
 * Aynı numara farklı yazılsa da (sıfırlı, boşluklu) aynı anahtarı verir.
 */
export function telAnahtar(ulke, tel) {
  return telRakam(ulkeGetir(ulke).kod) + telSifirsiz(tel)
}

/* ---------------------------------------------------------------- Arama

   Telefonda `tel:` bağlantısı arama ekranını açar; Android uygulamasında
   (Capacitor) da aynı şekilde çalışır. Masaüstü tarayıcıda ise hiçbir şey
   olmaz — geliştirirken "buton bozuk mu?" diye düşünülmesin diye orada
   numara ekranda gösterilir.

   Kullanım:
     <a {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}>       */

/** tel: bağlantısı üretir. */
export function telHref(numara) {
  const r = telRakam(numara)
  return 'tel:' + (String(numara).trim().startsWith('+') ? '+' + r : r)
}

/** Cihaz arama yapabiliyor mu? (kabaca: dokunmatik / mobil) */
export function aramaDestekleniyorMu() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/**
 * Arama bağlantıları için onClick üreticisi.
 * Telefonda: hiçbir şey yapmaz, bağlantı normal çalışır.
 * Masaüstünde: numarayı bildirim olarak gösterir.
 */
export function araTiklama(showToast, gorunenNumara) {
  return (e) => {
    if (aramaDestekleniyorMu()) return
    e.preventDefault()
    showToast?.(`Arama telefonda açılır · ${gorunenNumara}`)
  }
}

/**
 * Bir <a> etiketine yayılacak hazır arama özellikleri.
 *   <a className="listitem" {...araProps(SIRKET.telefonHam, SIRKET.telefon, showToast)}>
 */
export function araProps(numara, gorunenNumara, showToast) {
  return {
    href: telHref(numara),
    onClick: araTiklama(showToast, gorunenNumara || numara),
  }
}
