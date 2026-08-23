/* Gönder düğmesi — cevap gelene kadar bekleme durumunda kalır.

   Neden ayrı bir bileşen: talep formunda ve geri bildirimde aynı
   davranış gerekiyor. Tarlada şebeke zayıfken gönderim birkaç saniye
   sürebiliyor; düğme o sürede hem "çalışıyorum" demeli hem de ikinci
   kez basılmayı engellemeli — yoksa aynı talep iki kez gider.         */

export function GonderButonu({
  gonderiliyor,
  etiket,
  gonderiliyorEtiket,
  onClick,
  ikon = null,
  sinif = 'btn btn--primary btn--lg',
}) {
  return (
    <button
      className={sinif}
      onClick={onClick}
      disabled={gonderiliyor}
      aria-busy={gonderiliyor || undefined}
    >
      {gonderiliyor ? (
        <>
          <span className="donen" aria-hidden="true" />
          {gonderiliyorEtiket}
        </>
      ) : (
        <>
          {ikon}
          {etiket}
        </>
      )}
    </button>
  )
}
