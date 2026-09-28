/* ==========================================================================
   Connect'te müşterinin talep listesi

   Müşteri uygulamasında hangi talebin listede görüneceğine, hangisinin
   "listeden kaldırılanlar" arasında duracağına karar veren yer.
   context/AppState.jsx'in içindeydi; oradan taşındı, çünkü bir React
   bileşeninin içindeki karar uygulama dışından çalıştırılamıyor, yani
   ekosistem sınamasında sınanamıyordu (lib/talepOlustur.js ile aynı
   gerekçe). Ekrana çıkan metin yok.

   KİMİN TALEBİ — TEK KURAL lib/musteriEslesmesi.js'te (musterininMi):
   servis siparişi kimsenin değil; talepte hesap kimliği varsa yalnız o
   hesabın; yoksa telefon numarasıyla, yazılıştan bağımsız.

   CONNECT'İN EK ŞARTI: servisin Servisim'den ELLE açtığı ve bir hesaba
   bağlamadığı iş (`elle: true`, `musteriId` yok) numarası tutsa da
   listede görünmüyor. Telefonu bilen herhangi biri, başkası adına
   açılmış işin ayrıntısını görmesin. Backoffice'in müşteri kartı aynı
   talebi numarayla müşteriye bağlıyor (PAKSAN o müşteriyle ilgili her
   işi görmeli); istisna bilerek burada, gerekçesiyle
   (bkz. lib/musteriEslesmesi.js başındaki "BİLİNÇLİ İSTİSNA"; kural
   orada tek yüklemde: hesabaBaglanirMi).

   LİSTEDEN KALDIRILAN TALEP GERİ ALINABİLİYOR (25 Eylül 2026,
   kullanıcı sınaması O9). Müşterinin kaldırdığı talepler bu telefonun
   gizleme defterinde (`gizlenenTalepler`); kayıt paylaşılan depoda
   yerinde duruyor. Önce defterden çıkaran bir yol yoktu ve onay metni
   varmış gibi yazıyordu. Kaldırılanlar Taleplerim ekranının
   Tamamlananlar sekmesinde ayrı bir bölümde, geri alma düğmesiyle
   duruyor. Veritabanında geri alma talep.TalepGizleme satırının
   silinmesi (tasarımda zaten var).

   GİZLEME YALNIZ KAPALI TALEBİ SAKLAR (25 Eylül 2026, inceleme).
   Taleplerim yalnız kapalı talebi kaldırtıyor; ama PAKSAN kapanmış
   talebi yeniden açabiliyor (backoffice → talepGeriAc). Kaldırılmış
   talep açılınca gizli kalıyordu: açık bir iş yalnız "Listeden
   Kaldırdıklarım" altında duruyor, Ana Sayfa'nın aktif sayacı ve talep
   formunun "bu makinede açık talebiniz var" engeli (O5) onu görmüyor,
   aynı makineye ikinci servis talebi açılabiliyordu. Açık talep gizleme
   defterine bakılmadan listede; yeniden kapanınca defterdeki kaydı
   yine geçerli olur (müşterinin kararı o kapalı talep içindi).

   FİYAT TEKLİFİNDE MAKİNE YOK: iki liste de lib/talep.js →
   makinesizTeklif'ten geçiyor. 25 Eylül öncesi teklif kayıtlarında
   hatayla yazılmış makine ekranda görünmesin.
   ========================================================================== */

import { hesabaBaglanirMi } from './musteriEslesmesi'
import { makinesizTeklif } from './talep'
import { KAPALI_DURUMLAR } from './talepEkleme'

/**
 * Talep bu hesabın listesine ait mi?
 *
 * Servis siparişi hiçbir müşterinin değil; hesap kimliği varsa yalnız o
 * hesabın; yoksa numarayla — ama servisin elle açtığı kimliksiz iş
 * numarayla bağlanmıyor (yukarıdaki "Connect'in ek şartı").
 *
 * @param {object} r     talep
 * @param {object} user  oturumdaki hesap: { id, tel, ulke }
 */
export function talepHesabinMi(r, user) {
  if (!r || !user) return false
  return hesabaBaglanirMi(r, user)
}

/** Gizleme defteri bu talebi saklıyor mu? Yalnız kapalı talebi. */
export function gizliMi(r, gizlenen = []) {
  return (gizlenen || []).includes(r?.id) && KAPALI_DURUMLAR.includes(r?.status || 'yeni')
}

/** Müşterinin listesinde görünen talepler (kaldırdığı kapalılar hariç). */
export function gorunenTalepler(talepler = [], user = null, gizlenen = []) {
  return (talepler || [])
    .filter((r) => talepHesabinMi(r, user) && !gizliMi(r, gizlenen))
    .map(makinesizTeklif)
}

/** Müşterinin kendi listesinden kaldırdığı (kapalı) talepler. */
export function kaldirilanTalepler(talepler = [], user = null, gizlenen = []) {
  return (talepler || [])
    .filter((r) => talepHesabinMi(r, user) && gizliMi(r, gizlenen))
    .map(makinesizTeklif)
}
