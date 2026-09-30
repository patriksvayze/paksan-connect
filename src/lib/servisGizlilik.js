import { load, save } from './storage'
import { SERVIS_METIN_SURUM } from '../data/servisGizlilik'

/* ==========================================================================
   Servisim — gizlilik metinlerinin kabulü

   NEDEN VAR (29 Eylül 2026, kullanıcının kararı: "İlk girişte onay
   ekranı"). Servisim'de hiçbir hukuki metin yoktu; oysa servis çiftçinin
   adını, telefonunu, adresini ve gönderdiği fotoğrafları görüyor. Servis
   ilk girişte (ve metin sürümü değişince) iki metni okuyup kabul ediyor:
   kendisine yönelik aydınlatma metni ve "Müşteri Bilgilerinin
   Gizliliği". Kabul edilmeden uygulama açılmıyor (ServisPanel.jsx →
   GizlilikKapisi).

   Kabul, {MARKA} ile servis arasındaki sözleşmenin gizlilik hükümlerinin
   YERİNE GEÇMİYOR; onları hatırlatıyor ve kimin ne zaman okuduğunu
   kaydediyor. Sözleşme ayrıca imzalanacak (CANLIYA-CIKIS.md).

   KAYIT: `servisKabulleri` deposunda, her kabul ayrı satır, yalnız
   eklenir. Servis hesabı bugün tek giriş (bir hesap = bir servis);
   veritabanında birden çok giriş olabileceği için satır kullanıcı adını
   da taşıyor. Backoffice Servisler ekranı son kabulü gösteriyor.
   Veritabanında henüz yeri yok: kvkk.RizaOlayi yalnız müşteri hesabına
   bağlı (VT-TASARIM-EKLERI.md §11).
   ========================================================================== */

const DEPO = 'servisKabulleri'

/** Servisin son kabulü (hangi sürüm olursa olsun) ya da null. */
export function servisinSonKabulu(servisId) {
  const liste = load(DEPO, [])
  for (let i = liste.length - 1; i >= 0; i -= 1) {
    if (liste[i]?.servisId === servisId) return liste[i]
  }
  return null
}

/** Servis bugünkü metinleri kabul etmiş mi. */
export function servisKabulEttiMi(servisId) {
  return servisinSonKabulu(servisId)?.surum === SERVIS_METIN_SURUM
}

/**
 * Kabulü yazar.
 * @param {{servisId: string, no?: string, ad?: string, kullanici?: string}} oturum
 * @param {string} kanal  servisimIlkGiris | servisimGuncelleme
 * @param {string} [uygulamaSurumu]
 */
export function servisKabulunuKaydet(oturum, kanal, uygulamaSurumu = '') {
  const kayit = {
    id: 'skb-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    servisId: oturum.servisId,
    servisNo: oturum.no || '',
    servisAd: oturum.ad || '',
    kullanici: oturum.kullanici || '',
    metinler: ['servisAydinlatma', 'servisGizlilik'],
    surum: SERVIS_METIN_SURUM,
    kanal,
    tarih: Date.now(),
    uygulamaSurumu,
  }
  save(DEPO, [...load(DEPO, []), kayit])
  return kayit
}
