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

  return {
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
    ...data,
  }
}
