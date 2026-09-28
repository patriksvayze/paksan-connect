/* ==========================================================================
   Talep kaydını kuran karar

   Müşteri uygulamasında bir talep açıldığında kaydın NE OLACAĞINA karar
   veren yer burası: hangi ülkeye ait, ihracat mı, hangi servise düşecek,
   sahibi kim. Kaydı depoya yazmak, sunucuya göndermek ve işlem kaydı
   düşmek bu dosyanın işi değil — onlar context/AppState.jsx'te kaldı.

   NEDEN AYRI DOSYA: bu karar bir React bileşeninin içinde, useCallback
   gövdesinde duruyordu. Orada durduğu sürece uygulama dışından
   çalıştırılamıyor, dolayısıyla sınanamıyordu; ekosistem sınaması
   (tools/ekosistem-sinamasi.mjs) aynı mantığın bir kopyasını yazmak
   zorunda kalırdı. Kopya zamanla asıl koddan ayrışır ve kimse uyarmaz.
   Şimdi tek gövde var, sınama da uygulama da onu çağırıyor.

   Ekrana çıkan metin yok; burası yalnız karar ve kayıt kurma.
   ========================================================================== */

import { uid } from './storage'
import { talepNo } from './talep'
import { talepUlkesi, yurtdisiTalepMi } from './ihracat'
import { makineninServisi } from './servisAtama'
import { telHamYap } from './tel'

/**
 * Talep formunun onayda hesaba işleyeceği konum. Değişiklik yoksa null.
 *
 * SERVİS TALEBİNDE YER MAKİNENİN (25 Eylül 2026, inceleme; O4'ün ters
 * yönü). Form il, ilçe ve adresi makinenin son servis talebinden
 * dolduruyor (lib/makineTalepleri.js → makineninSonServisAdresi); onayda
 * hesaptakinden farklıysa hesaba yazılıyordu. İki makineli çiftçi
 * hiçbir alana dokunmasa da hesabın yeri öteki makinenin yerine
 * dönüyordu; fiyat teklifinin bölgesi (bayi), parça teslimatının ili,
 * Profil ve Servisim'in elle kayıt önerisi hesabı okuyor. Servis
 * talebinde hesaba yalnız BOŞ olan yazılıyor ve yer karışmıyor:
 *   - hesapta il yoksa il, ilçe ve (boşsa) adres birlikte;
 *   - hesabın ili aynıysa boş ilçe ve boş adres;
 *   - dolu alan hiç değişmiyor; hesabın yeri Profil'den değişir.
 * "Bir kez soruluyor" kuralı böyle sürüyor: ilk talepte yazılan adres
 * sonraki talebe öneri olarak geliyor.
 *
 * PARÇA VE TEKLİFTE yer hesabın yeri: onay penceresindeki "Konumumu
 * düzelt" hesabı düzeltiyor, eskisi gibi. Sınaması AK-32.
 *
 * @param {string} tur  talep türü
 * @param {object} user oturumdaki hesap
 * @param {{konumUlke: string, il: string, ilce: string, adres?: string}} yer formdaki değerler
 * @returns {object|null} updateUser'a verilecek alanlar
 */
export function hesabaIslenecekKonum(tur, user, { konumUlke, il, ilce, adres = '' }) {
  if (tur !== 'servis') {
    return il !== user?.il || (ilce || '') !== (user?.ilce || '') ? { konumUlke, il, ilce } : null
  }
  const yama = {}
  const bos = (v) => !String(v || '').trim()
  const ayniIl = !bos(user?.il) && user.il === il && (bos(user.ilce) || user.ilce === ilce)
  if (bos(user?.il) && !bos(il)) Object.assign(yama, { konumUlke, il, ilce: ilce || '' })
  else if (ayniIl && bos(user.ilce) && !bos(ilce)) yama.ilce = ilce
  if ((yama.il || ayniIl) && bos(user?.adres) && !bos(adres)) yama.adres = adres.trim()
  return Object.keys(yama).length ? yama : null
}

/** Talebin düşeceği servis. Düşmeyecekse null. */
export function talebinServisi(data, user) {
  /* Yurtdışı talebi ayrı yoldan gidiyor: backoffice'e düşmüyor, ihracat
     ekibinin e-postasına gidiyor (bkz. lib/ihracat.js). */
  if (yurtdisiTalepMi(user)) return null

  /* Talep MÜŞTERİNİN KENDİ SERVİSİNE düşüyor — coğrafyaya değil.

     Servis, makineden bayiye, bayiden servise giden zincirden çıkıyor
     (bkz. lib/servisAtama.js). Bir zamanlar burada il ve ilçeye bakıp en
     yakın servis seçiliyordu; o yol bırakıldı. Servis hak edişini
     PAKSAN'dan alıyor ve PAKSAN kime iş verdiğini bilmek zorunda;
     "en yakın" bir kayıt değil, tahmin.

     Servis talebi zaten servis atanmadan açılamıyor (form o kapıyı
     tutuyor).

     YEDEK PARÇA TALEBİ SERVİSE DÜŞMÜYOR. Tedarikçi PAKSAN: müşteri
     parayı dekontla PAKSAN'a ödüyor, parçayı PAKSAN gönderiyor. Bir
     dönem makineye bakan servis "parça hizmeti" veriyorsa talep ona
     gidiyordu. Servis parçayı kendi elinden gönderiyor, parası PAKSAN'da
     kalıyordu ve servise karşılığı hiçbir yere yazılmıyordu. Elle
     atanmış servis parça hizmeti vermese de talebi alıyordu. Servisin
     parça ihtiyacı kendi siparişiyle (Parça sekmesi) ya da servis
     kaydının içinden karşılanıyor.

     FİYAT TEKLİFİ DE DÜŞMÜYOR VE DÜŞMEYECEK. Makineyi satan taraf bayi;
     servis satış yapmıyor. Teklif talebi hiçbir servise atanmıyor:
     PAKSAN'a düşüyor, satış personeli müşteriye en uygun bayiye atıyor
     (bkz. backoffice/ekranlar/Talepler.jsx → BayiyeAta).

     SERVİS, TALEBİN AÇILDIĞI MAKİNEDEN ÇIKIYOR. Bir zamanlar müşterinin
     İLK makinesinin servisi yazılıyordu; iki ayrı bayiden makine almış
     müşteri B makinesi için talep açınca iş A makinesinin servisine
     düşüyordu. Yanlış servis tanımadığı bir işi görüyor, doğru servis
     hiç görmüyor. */
  if (data.tur !== 'servis') return null

  return makineninServisi(data.makine)?.servis || null
}

/** Depoya yazılmaya hazır talep kaydı. Hiçbir şey yazmaz, yalnız kurar. */
export function talepKaydiOlustur(data, user) {
  const ihracat = yurtdisiTalepMi(user)
  const servis = talebinServisi(data, user)
  const simdi = Date.now()

  const kayit = {
    id: uid(),
    no: talepNo(data.tur),
    createdAt: simdi,
    status: 'yeni',
    ulke: talepUlkesi(user),
    ihracat,
    servis: servis
      ? { id: servis.id, ad: servis.ad, tel: servis.tel || '', tarih: simdi }
      : null,
    sahip: servis ? 'servis' : 'paksan',
    /* Açanın hesabı (24 Eylül 2026): Connect talep listesini bununla
       süzüyor (lib/musterininTalepleri.js → gorunenTalepler), bildirim de
       alıcıyı önce buradan buluyor (backoffice/veri.js →
       bildirimAlicisi). Önce yalnız telefon numarası vardı. */
    musteriId: user?.id || null,
    ...data,
    /* FİYAT TEKLİFİNDE MAKİNE YOK (25 Eylül 2026, kullanıcı sınaması
       Y1). Teklif, müşterinin henüz sahip olmadığı ürün için. Form
       makine seçimini her türde çiftçinin ilk makinesiyle başlatıyordu;
       teklif formunda makine kutusu hiç çizilmediği hâlde seçim kayda
       gidiyordu ("Süper Yunus teklifi · Makine: Orkinos 1270"). Ekran ne
       gönderirse göndersin kayıt makinesiz. Eski kayıtlar okunurken
       ayıklanıyor (lib/talep.js → makinesizTeklif). */
    ...(data.tur === 'satinalma' ? { makine: null } : {}),
  }

  /* HAM NUMARA TEK BİÇİMDE (25 Eylül 2026, kullanıcı sınaması Y3).
     Hesaptaki numara ekranda göründüğü gibi, boşluklu saklanıyor
     ("532 111 22 33") ve Connect talebi onu `telHam` diye olduğu gibi
     yazıyordu; servisin elle açtığı talep ise düz rakam. Harfi harfine
     karşılaştıran ekranlar aynı müşteriyi iki kişi sanıyordu. Kayda
     giren ham numara artık yalnız rakam; baştaki sıfır ve ülke kodu yok
     (lib/tel.js → telHamYap). Karşılaştırmanın kendisi
     lib/musteriEslesmesi.js'te. */
  if (kayit.telHam) kayit.telHam = telHamYap(kayit.telUlke || user?.ulke, kayit.telHam)
  return kayit
}
