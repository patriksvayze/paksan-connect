import { useMemo } from 'react'
import { bayileriGetir, servisleriGetir, MARKA } from '../../marka'
import { Bolum } from '../Kabuk'
import { IconCart, IconPhone } from '../../components/Icons'

/* ==========================================================================
   Çalıştığınız bayiler

   NEDEN SERVİS TARAFINDA BİR "BAYİ" EKRANI VAR

   `npm run dogrula` normalde `src/servis/` içinde `bayi` kelimesini
   yasaklıyor ve bu doğru bir kural: panel bir zamanlar bayi için
   yazılmıştı, servise devredildi ve yarım kalan bir devir altı ay
   sonra hangi adın ne anlama geldiğini belirsizleştirir.

   Kuralın koruduğu şey KİMLİK KARIŞMASI. Burada karışma yok, tam
   tersi: bu ekran bayiyi AYRI BİR TARAF olarak gösteriyor. Servisin
   müşterisi, makineyi bu bayilerden alan kişi (zincir:
   makine → bayi → bayinin servisi, bkz. lib/servisAtama.js). Bağı
   PAKSAN kuruyor, backoffice'teki Servisler ekranından; servis
   kendisine hangi bayilerin bağlandığını göremiyordu.

   Servis bunu iki şey için istiyor: dükkânına gelen müşteriye "sizin
   makineniz bizim baktığımız bir bayiden" diyebilmek ve gerektiğinde
   bayiyi arayabilmek. Numara dokunulabilir; ezberlenip tuşlanmıyor.

   Bu dosya `tools/dogrula.mjs` içinde gerekçesiyle kapsam dışı
   tutuluyor — kural kalkmadı, tek dosya için istisna yazıldı.
   ========================================================================== */

export function Bayilerim({ oturum }) {
  const liste = useMemo(() => {
    const servis = servisleriGetir().find((x) => x.id === oturum.servisId)
    const kimlikler = servis?.bayiler || []
    if (!kimlikler.length) return []
    return bayileriGetir().filter((b) => kimlikler.includes(b.id))
  }, [oturum.servisId])

  if (!liste.length) {
    return (
      <Bolum ad="Çalıştığınız Bayiler">
        <p className="kucuk sonuk" style={{ margin: 0 }}>
          {MARKA} size henüz bayi bağlamadı. Bağlandığında burada
          görünecek.
        </p>
      </Bolum>
    )
  }

  return (
    <Bolum ad="Çalıştığınız Bayiler" sayi={liste.length}>
      <p className="alan__ipucu" style={{ marginTop: 0, marginBottom: 12 }}>
        Bu bayilerden makine alan müşterilere siz bakıyorsunuz.
      </p>

      {liste.map((b) => (
        <div key={b.id} className="calisilan">
          <span className="calisilan__ikon">
            <IconCart size={18} />
          </span>
          <div className="calisilan__bilgi">
            <div className="calisilan__ad">{b.ad}</div>
            <div className="kucuk sonuk">
              {[b.ilce, b.il].filter(Boolean).join(' / ')}
            </div>
          </div>
          {b.tel && (
            <a
              className="calisilan__ara"
              href={'tel:' + String(b.tel).replace(/\D/g, '')}
              aria-label={b.ad + ' numarasını ara'}
            >
              <IconPhone size={19} />
            </a>
          )}
        </div>
      ))}
    </Bolum>
  )
}
