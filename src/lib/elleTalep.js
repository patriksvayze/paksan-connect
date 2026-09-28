/* ==========================================================================
   Servisim'in elle açtığı talebin kaydı

   Servise doğrudan gelen müşterinin talebi Servisim'in Kayıt Aç
   ekranından açılıyor (servis/ekranlar/ElleKayit.jsx). Kaydın NE
   OLACAĞINA karar veren yer burası; lib/talepOlustur.js'in Servisim
   karşılığı. Depoya yazmak, İşlem Kaydı düşmek ve makine defterine satır
   açmak ekranın işi olarak kalıyor.

   NEDEN AYRI DOSYA (25 Eylül 2026, kullanıcı sınaması Y5). Kayıt React
   bileşeninin içinde kuruluyordu; ekosistem sınaması onu çalıştıramıyor,
   senaryolar talebi elle kopyalayarak kuruyordu. Kopya zamanla asıl
   koddan ayrışır. Şimdi tek gövde var, sınama da ekran da onu çağırıyor.

   İKİ YENİ KURAL

   MAKİNENİN SERVİSİ BAŞKAYSA İŞARET (kullanıcının kararı: uyar,
   engelleme). İş açan serviste kalıyor; makine başka servise atanmışsa,
   hiç servisi yoksa ya da seri numarası olmadığı için denetlenemiyorsa
   talebe `atamaDisi` yazılıyor. Hak edişi onaylayan personel onu
   görüyor. İşaret yalnız çelişki varken yazılıyor: alanın olmaması
   "çelişki yok" demek. Kural lib/servisAtama.js → elleIsinAtamasi.

   NUMARA TEK BİÇİMDE (kullanıcı sınaması, 24 Eylül 2026). Servisin
   yazdığı numara olduğu gibi ("0532…", "532 …") kayda gidiyordu ve ülke
   yazılmıyordu; aynı müşteri ekranlarda üç biçimde görünüyor, eşleşmede
   iki kişi sayılıyordu. Ham numara telHamYap'tan geçiyor, ekrandaki
   biçim telGoster'den, ülke Türkiye (Servisim yalnız Türkiye'de).

   Ekrana çıkan metin yok.
   ========================================================================== */

import { uid } from './storage'
import { talepNo } from './talep'
import { adBicimle } from './adBicimi'
import { elleIsinAtamasi } from './servisAtama'
import { telGoster, telHamYap } from './tel'

/**
 * Servisim'in elle açtığı servis talebinin kaydı.
 *
 * @param {object} form  { adi, soyadi, tel, il, ilce, adres, aciklama, makine, musteriId }
 *   makine: listeden seçilen makine, seriyle yazılan yeni makine ya da
 *   `{ seriYok: true, productId, tahminiYil }`
 *   musteriId: numara kayıtlı bir müşteriyle eşleştiyse onun kimliği
 * @param {{servisId: string, ad: string}} oturum işi açan servis
 */
export function elleTalepKaydiOlustur({ adi, soyadi, tel, il, ilce, adres, aciklama, makine, musteriId }, oturum) {
  const simdi = Date.now()
  const atamaDisi = elleIsinAtamasi(makine, oturum.servisId)
  const telHam = telHamYap('TR', tel)
  return {
    id: uid(),
    no: talepNo('servis'),
    createdAt: simdi,
    status: 'yeni',
    tur: 'servis',
    /* "Onur Gökay" biçiminde (kullanıcının isteği, lib/adBicimi.js).
       Defter satırı, İşlem Kaydı ve SMS daveti bu alandan okuyor. */
    ad: adBicimle(`${adi || ''} ${soyadi || ''}`),
    tel: telGoster('TR', telHam),
    telUlke: 'TR',
    telHam,
    il,
    ilce,
    /* ADRES BURADA SORULUYOR (10 Eylül 2026). Servis kaydı ekranı
       talepte adres varsa onu salt okunur gösteriyor (bkz.
       lib/servisKaydi.js → eksikAlanlar). */
    adres: String(adres || '').trim(),
    ulke: 'TR',
    ihracat: false,
    aciklama: String(aciklama || '').trim(),
    makine,
    elle: true,
    /* Kayıtlı müşteriyse talep onun hesabına bağlanıyor: kendi
       uygulamasında görüyor, bildirimleri ona düşüyor. */
    musteriId: musteriId || null,
    sahip: 'servis',
    servis: { id: oturum.servisId, ad: oturum.ad, kademe: 'elle', tarih: simdi },
    ...(atamaDisi ? { atamaDisi } : {}),
  }
}
