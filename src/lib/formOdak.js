/* Sorunlu form alanını ekrana getirir ve işaretler.

   Uzun formlarda sorun en üstteki alanda olabiliyor ama kullanıcı en
   altta, gönder düğmesinin başındadır. Düğmenin üstündeki hata kutusu
   neyin eksik olduğunu yazıyor; bu fonksiyon da o alanı ekrana getirip
   bir an için çerçeveliyor, kullanıcı nereye bakacağını arasın diye.

   Alanlar `data-alan="ad"` gibi işaretli. */

export function alanaGit(ad) {
  if (!ad) return
  /* Çizim bittikten sonra: hata kutusu görünür olunca sayfa boyu
     değişiyor, önce ona bırakıyoruz. */
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-alan="${ad}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    el.classList.remove('alan-vurgu')
    /* Sınıfı yeniden eklemek için tarayıcının aradaki hâli görmesi
       gerekiyor; yoksa aynı kare içinde birleşip animasyon hiç
       başlamıyor. */
    void el.offsetWidth
    el.classList.add('alan-vurgu')
    setTimeout(() => el.classList.remove('alan-vurgu'), 1800)

    /* Yazı alanıysa imleç de oraya gitsin — kullanıcı doğrudan yazsın.
       Seçim kutularına odaklanılmıyor: bazı telefonlarda odak alınca
       liste kendiliğinden açılıyor ve ekranı kapatıyor. */
    const yazi = el.querySelector('input, textarea')
    if (yazi) setTimeout(() => yazi.focus({ preventScroll: true }), 320)
  })
}
