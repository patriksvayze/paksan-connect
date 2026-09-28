/* ==========================================================================
   Telefon numarası

   Numara artık iki parçadan oluşuyor:
     ulke → ISO kısaltması ('TR'), ülke listesinden geliyor
     tel  → BAŞTA SIFIR OLMADAN: 532 123 45 67

   HESAPTAKİ NUMARA BOŞLUKLU (25 Eylül 2026'da düzeltilen yorum). Bu
   başlık uzun süre "tel → sadece rakamlar" diyordu; doğru değildi.
   Numara alanı yazarken biçimliyor (components/TelefonAlani.jsx →
   formatTel) ve hesap.tel ekranda göründüğü gibi, boşluklu saklanıyor.
   Biçim girişi bozmamak için değiştirilmedi. Onun yerine iki kural:

     Kayda yazılan ham numara (talep, görüş → `telHam`) telHamYap'tan
     geçer: yalnız rakam, baştaki sıfır ve ülke kodu yok.
     İki numara karşılaştırılırken telAnahtar kullanılır; yazılış
     (boşluklu, sıfırlı, "+90 …") sonucu değiştirmez.

   Kullanıcı sınaması Y3 (24 Eylül 2026): servisin elle açtığı talep
   "0532…" yazıyordu, Connect talebi boşluklu; harfi harfine
   karşılaştıran ekranlar aynı müşteriyi iki kişi sanıyordu (bkz.
   lib/musteriEslesmesi.js).

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

/**
 * Kayda yazılacak ham numara: yalnız rakam; baştaki sıfır ve ülke kodu yok.
 *   "532 111 22 33", "0532 111 22 33", "+90 532 111 22 33",
 *   "0090 532 111 22 33", "90 532 111 22 33"  →  "5321112233"
 *
 * Ülke kodu yalnız açıkça yazıldıysa ("+", "00") ya da numara ülkenin
 * hane sayısından tam ülke kodu kadar uzunsa atılıyor. Kısa ya da
 * hane sayısı bilinmeyen ülkenin numarasında baştaki "90" bir
 * rakamdır; tahminle silinmez.
 */
export function telHamYap(ulke, raw) {
  const s = String(raw || '').trim()
  const u = ulkeGetir(ulke || VARSAYILAN_ULKE)
  const kod = telRakam(u.kod)
  let r = telSifirsiz(s)
  const kodlu = s.startsWith('+') || s.startsWith('00') || (u.hane && r.length === u.hane + kod.length)
  if (kodlu && kod && r.startsWith(kod)) r = r.slice(kod.length).replace(/^0+/, '')
  return r
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

/** Ekranda gösterilecek tam hâli: +90 532 123 45 67
 *
 *  Numara önce telHamYap'tan geçiyor (25 Eylül 2026): "+90 …" yazılmış
 *  bir numara eskiden "+90 905 322 …" çıkıyordu, çünkü formatTel ülke
 *  kodunu atmıyor. Boşluklu ya da düz rakam girişte çıktı aynı. */
export function telGoster(ulke, tel) {
  const t = formatTel(telHamYap(ulke, tel))
  if (!t) return ''
  return `${ulkeGetir(ulke).kod} ${t}`
}

/** Kayıttaki (talep, görüş) müşteri numarasının ülkesi ve ham hâli.
 *  Kayıtta ülke yoksa `ulkeYedek`, o da yoksa Türkiye: Servisim'in elle
 *  açtığı talepler 25 Eylül 2026'ya kadar ülke yazmıyordu ve Servisim
 *  yalnız Türkiye'de çalışıyor. */
export function kayitNumarasi(kayit, ulkeYedek) {
  const ulke = kayit?.telUlke || ulkeYedek || VARSAYILAN_ULKE
  return { ulke, ham: telHamYap(ulke, kayit?.telHam || kayit?.tel) }
}

/** Kayıttaki müşteri numarası ekranda: +90 532 123 45 67.
 *
 *  AYNI NUMARA HER EKRANDA AYNI BİÇİMDE (25 Eylül 2026, kullanıcı
 *  sınaması): ekranlar talebin `tel` yazısını ya olduğu gibi basıyor ya
 *  da firma biçimleyicisinden geçiriyordu; aynı müşteri "+90 …",
 *  "532 …" ve "0532 …" diye üç biçimde görünüyordu.
 *
 *  Servisin kendi parça siparişinde numara servisin firma numarası;
 *  firma numarası kendi biçimiyle gösterilir (telFirma, aşağıda). */
export function kayitTelGoster(kayit) {
  if (kayit?.servisSiparisi) return telFirma(kayit.tel)
  const { ulke, ham } = kayitNumarasi(kayit)
  return ham ? telGoster(ulke, ham) : ''
}

/** Aynı numaranın arama bağlantısı, ülke koduyla: tel:+905321234567.
 *  Ülke kodu olmadan ("tel:905…") Türkiye'den aranan numara yanlıştı:
 *  Servisim'in Ara düğmesi Connect taleplerinde başka numarayı
 *  çeviriyordu. */
export function kayitTelHref(kayit) {
  if (kayit?.servisSiparisi) return kayit?.tel ? telHref(kayit.tel) : ''
  const { ulke, ham } = kayitNumarasi(kayit)
  return ham ? telHref(ulkeGetir(ulke).kod + ham) : ''
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
 * Aynı numara farklı yazılsa da (sıfırlı, boşluklu, ülke kodlu) aynı
 * anahtarı verir. Ülke kodlu yazılış ("+90 532 …") 25 Eylül 2026'ya
 * kadar ikinci bir "90" ile başka anahtar veriyordu (bkz. telHamYap).
 */
export function telAnahtar(ulke, tel) {
  return telRakam(ulkeGetir(ulke).kod) + telHamYap(ulke, tel)
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
