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
