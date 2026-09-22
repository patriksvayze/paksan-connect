import { GECIKME_SAAT, KAPALI_DURUMLAR } from './veri'
import { servisGecikti } from '../servis/isDurumu'
import { musteriTalebiMi } from './ekranlar/rapor/hesap'

/* ==========================================================================
   Açık iş kimde bekliyor?

   İKİ EKRAN AYNI SORUYU SORUYOR: Raporlar'ın Genel Bakış sekmesi ("Açık
   talepler nerede bekliyor?", "Dikkat isteyenler") ve Dashboard'un
   kutuları. Kural önce yalnız rapor bölümünün içindeydi
   (rapor/bolumler/genel.js); Dashboard kendi sayımını yapıyordu ve iki
   ekran aynı işe farklı rakam verebiliyordu. Kural buraya taşındı,
   ikisi de buradan okuyor (22 Eylül 2026).

   NEDEN GEREKTİ. Dashboard'un "48 Saati Geçen" kutusu açılalı 48 saat
   olan her açık talebi sayıyordu: servisin sahada yürüttüğü iş de,
   müşterinin cevabını beklediği iş de kırmızıya düşüyordu (kullanıcıya
   sunulan incelemede ekranda 63 açık talebin 36'sı). PAKSAN personeli o
   kırmızıya bakıp "biz geç kaldık" diye okuyordu. Artık soru ikiye
   ayrılıyor: BİZDE 48 saati geçen (top PAKSAN'da) ve SERVİSTE geciken
   (Servisim'in kendi gecikme kuralı: servise düşmüş, 48 saattir el
   sürülmemiş iş — bkz. servis/isDurumu.js). */

export function acikMi(t) {
  return !KAPALI_DURUMLAR.includes(t.status || 'yeni')
}

/* Açık talebin şu an kimin elinde beklediği. Sıra önemli: aynı talep
   birden çok koşula uyabiliyor (serviste ve parça bekliyor); en dar
   olan kazanıyor. */
export function bekledigiYer(t) {
  const d = t.status || 'yeni'
  if (d === 'onayBekliyor') return 'onay'
  if (d === 'parcaBekliyor') return t.parcaSevk ? 'yolda' : 'parcaHazirlik'
  if (d === 'teklif') return 'teklif'
  if ((t.sahip || 'paksan') === 'servis') return 'servis'
  if (t.tur === 'parca') return 'parcaTalebi'
  return 'paksan'
}

/* Yerin Talepler ekranındaki en yakın süzgeci. Talepler ekranının
   süzgeçleri bu gruplamayı bilmiyor (örn. "Serviste" orada "Sahiplik:
   Serviste + açık" ve onay ya da parça bekleyen servis işlerini de
   içeriyor); bağımsız denetimde "Serviste 19" satırı 31 kayıtlık liste
   açtı. Fark her bölümün "Bu sayılar nasıl hesaplanıyor?" notunda
   yazıyor (bkz. Gorunum.jsx → listeNotu). */
export function yerSuzgeci(yer) {
  switch (yer) {
    case 'onay': return { durum: 'onayBekliyor' }
    case 'parcaHazirlik': return { durum: 'parcaHazirlik' }
    case 'yolda': return { durum: 'parcaBekliyor' }
    case 'teklif': return { durum: 'teklif' }
    case 'servis': return { durum: 'acik', sahiplik: 'servis' }
    case 'parcaTalebi': return { durum: 'acik', tur: 'parca' }
    default: return { durum: 'acik', sahiplik: 'paksan' }
  }
}

/* Topun PAKSAN'da olduğu yerler. "yolda" (parça gönderildi, servis
   takacak) servisin, "teklif" müşterinin, "servis" servisin. */
const BIZDE = ['paksan', 'onay', 'parcaHazirlik', 'parcaTalebi']

export function bizdeMi(t) {
  return acikMi(t) && BIZDE.includes(bekledigiYer(t))
}

/* İşin bulunduğu yere geldiği an: geçmişteki son hareket, servis kaydı
   ya da açılış — hangisi en yeniyse. Onay bekleyen iş servis kaydını
   gönderdiği anda PAKSAN'a geldi; üç gün önce açılmış olması PAKSAN'ın
   üç gündür beklettiği anlamına gelmiyor. */
export function yerineGeldigiAn(t) {
  const anlar = [t.createdAt || 0, t.servisKaydi?.tarih || 0, ...(t.gecmis || []).map((g) => g?.tarih || 0)]
  return Math.max(...anlar)
}

/** Kaç saattir bulunduğu yerde bekliyor? */
export function bekledigiSaat(t, simdi = Date.now()) {
  return (simdi - yerineGeldigiAn(t)) / 3600000
}

/** Top PAKSAN'da ve 48 saattir yerinden kıpırdamadı. */
export function bizdeGecikmisMi(t) {
  return bizdeMi(t) && bekledigiSaat(t) > GECIKME_SAAT
}

/* Serviste geciken: talep servise düşmüş (sahip servis), servis 48
   saattir el sürmemiş. Servisim'in "İşlerim" şeridiyle aynı kural;
   sahiplik denetimi burada, çünkü Servisim o kuralı yalnız zaten kendi
   işlerine uyguluyor. */
export function servisteGecikmisMi(t) {
  return Boolean(t.servis) && (t.sahip || 'paksan') === 'servis' && acikMi(t) && servisGecikti(t)
}

/* ---------------------------------------------- PAKSAN'ın iki kuyruğu

   Dashboard kutusu, Raporlar'ın "Dikkat isteyenler" satırı ve Talepler
   süzgeci aynı kuralı okuyor. Önce Talepler'de bu kuyrukların tam
   süzgeci yoktu: "parça hazırlanmayı bekliyor 2" satırı kargoya verilmiş
   parçaları da içeren 6 kayıtlık listeyi, "dekont onay bekliyor" satırı
   bütün açık parça taleplerini açıyordu (22 Eylül 2026). */

/** Servis garanti parçasını istedi; parça henüz gönderilmedi. */
export function parcaHazirliktaMi(t) {
  return t.status === 'parcaBekliyor' && !t.parcaSevk
}

/* Müşteri dekont gönderdi, ödeme onaylanmadı. Servisin kendi parça
   siparişi ön ödemeye tabi değil (bkz. veri.js → parcaIlerlemeEngeli). */
export function odemeOnayiBekliyorMu(t) {
  return acikMi(t) && t.tur === 'parca' && musteriTalebiMi(t) && Boolean(t.dekont) && !t.odemeOnay
}
