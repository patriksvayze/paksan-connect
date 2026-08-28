/* ==========================================================================
   Telefon numarası değişikliği — ortak metinler

   Numara değişikliği uygulamadan yapılmıyor; müşteri üç ayrı yerde bu
   duvara çarpabiliyor:

     · Şifremi unuttum → kod gelmedi → "numaranız mı değişti?"
     · Talep gönderirken → "bu numara doğru mu?" → "hayır"
     · Profil → giriş numarasının yanındaki bağlantı

   Üçünde de aynı şeyi anlatmamız gerekiyor. Metin tek yerde dursun ki
   birinde değişip ötekinde eski kalmasın.
   ========================================================================== */

const TR = {
  neden:
    'Giriş numarası hesabınızın kimliğidir. Uygulamadan değiştirilebilseydi, ' +
    'telefonunuz bir başkasının eline geçtiğinde hesabınız da onun olurdu. ' +
    'Bu yüzden numara değişikliğini yalnızca PAKSAN yetkilisi, sizinle ' +
    'görüşerek yapıyor.',
  hazirlanacaklar: [
    'Ad ve soyadınız',
    'Hesabınızdaki eski telefon numaranız',
    'Yeni telefon numaranız',
    'Makinenizin seri numarası',
  ],
  seriNotu:
    'Seri numarasını yalnızca makinenin başındaki kişi bilir; kimliğinizi ' +
    'bu şekilde doğruluyoruz.',
  talepUyari:
    'Numaranız düzeltilmeden talebinizi gönderirseniz ekibimiz size ' +
    'ulaşamaz. Önce numaranızı güncelletin.',
  ararkenYaninizda: 'Ararken yanınızda bulunsun',
  talepKaybolmadi: 'Talebiniz kaybolmadı; geri dönüp gönderebilirsiniz.',
  geriDon: 'Geri Dön',
}

const EN = {
  neden:
    'Your sign-in number is the identity of your account. If it could be ' +
    'changed from the app, whoever got hold of your phone would also get ' +
    'your account. That is why only a PAKSAN representative changes it, ' +
    'after speaking with you.',
  hazirlanacaklar: [
    'Your first and last name',
    'The old phone number on your account',
    'Your new phone number',
    "Your machine's serial number",
  ],
  seriNotu:
    'Only the person standing at the machine knows its serial number; that ' +
    'is how we confirm who you are.',
  talepUyari:
    'If you send your request before your number is corrected, our team ' +
    'will not be able to reach you. Please have your number updated first.',
  ararkenYaninizda: 'Have these ready when you call',
  talepKaybolmadi: 'Your request has not been lost; go back and send it.',
  geriDon: 'Go Back',
}

const METIN = { tr: TR, en: EN }

export function numaraMetni(dil = 'tr') {
  return METIN[dil] || TR
}
