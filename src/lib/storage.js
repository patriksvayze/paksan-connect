/* Telefonun hafızasına kayıt — internet olmadan da çalışır.
   İleride gerçek sunucuya geçince bu dosyadaki fonksiyonlar
   sunucu çağrılarıyla değiştirilir. */

const PREFIX = 'paksan.'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* hafıza doluysa sessizce geç */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* yoksay */
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* OTURUM YALNIZ UYGULAMA AÇIKKEN YAŞIYOR (10 Eylül 2026).

   Açık oturum kalıcı depoda duruyordu: telefonda uygulama kapatılıp
   açıldığında giriş sorulmadan doğrudan ana sayfa geliyordu. Kullanıcı
   uygulamanın her açılışta karşılama ekranından başlamasını istedi.

   Oturum artık `sessionStorage`'da: uygulama (Android'de WebView)
   kapanınca siliniyor, sayfa yenilemesinde kalıyor. Hesap, makineler ve
   talepler kalıcı depoda durmaya devam ediyor; kapanan yalnız oturum. */
export function oturumYukle(key, fallback) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function oturumKaydet(key, value) {
  try {
    if (value === null || value === undefined) sessionStorage.removeItem(PREFIX + key)
    else sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* Oturum deposu kullanılamıyorsa oturum bu açılışla sınırlı kalır */
  }
}

export function oturumSil(key) {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* yok say */
  }
}
