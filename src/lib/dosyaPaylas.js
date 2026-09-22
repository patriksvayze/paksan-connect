import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/* ==========================================================================
   Üretilen dosyayı telefonda paylaşmak

   NEDEN VAR (22 Eylül 2026): Servisim'in servis formu PDF'i telefonda
   üretiliyor (bkz. servis/servisFormu.js). Android'in uygulama içi
   tarayıcısı ne indirme bağlantısını ne de yazdır komutunu tanıyor;
   dosyayı uygulamanın dışına çıkarmanın yolu Capacitor'un resmi iki
   eklentisi: dosya önbelleğe yazılıyor, telefonun paylaşma ekranı
   açılıyor. Oradan yazdırılıyor, WhatsApp'la gönderiliyor ya da
   Dosyalar'a kaydediliyor — servis elemanı hangisini istiyorsa.

   Önbellek klasörünü paylaşma izni Android projesinde zaten tanımlı
   (android-servis/app/src/main/res/xml/file_paths.xml → cache-path).

   TARAYICIDA (geliştirme, backoffice) dosya doğrudan indiriliyor. */

function base64(baytlar) {
  let ikili = ''
  const parca = 0x8000
  for (let i = 0; i < baytlar.length; i += parca) {
    ikili += String.fromCharCode.apply(null, baytlar.subarray(i, i + parca))
  }
  return btoa(ikili)
}

/**
 * Dosyayı paylaşır (telefonda) ya da indirir (tarayıcıda).
 * Kullanıcı paylaşma ekranını kapatırsa hata sayılmıyor.
 *
 * @param {Uint8Array} baytlar
 * @param {string} dosyaAdi  ör. "servis-formu-SRV2609211588.pdf"
 * @param {string} baslik    paylaşma ekranının başlığı
 * @param {string} [tur]
 */
export async function dosyaPaylas(baytlar, dosyaAdi, baslik, tur = 'application/pdf') {
  if (!Capacitor.isNativePlatform()) {
    const adres = URL.createObjectURL(new Blob([baytlar], { type: tur }))
    const a = document.createElement('a')
    a.href = adres
    a.download = dosyaAdi
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(adres), 30000)
    return
  }

  const { uri } = await Filesystem.writeFile({
    path: dosyaAdi,
    data: base64(baytlar),
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title: baslik, dialogTitle: baslik, url: uri })
  } catch (e) {
    /* Paylaşma ekranını geri tuşuyla kapatmak bir hata değil. */
    if (!/cancel/i.test(String(e?.message || e))) throw e
  }
}
