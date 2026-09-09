import { useMemo } from 'react'
import { cariBakiye, cariHareketleri, servisinTalepleri, talepleriGetir } from '../../backoffice/veri'
import { PARA_BIRIMI, paraYaz, MARKA, markaEk } from '../../marka'
import { gecenSure } from '../../backoffice/ekranlar/ortak'
import { Bolum, Bos, ListeKarti } from '../Kabuk'
import { IconAlert, IconCheckCircle } from '../../components/Icons'
import bosIsGorseli from '../../assets/gorseller/servis-bos-is.png'

/* ==========================================================================
   Servis paneli — hak ediş

   BU EKRAN "ÜRÜNLER"İN YERİNE GELDİ

   Orada yirmi makinenin kataloğu duruyordu: fiyatı, teslim süresi,
   teknik değerleri. Servis makine satmıyor; o listeye bakmasının bir
   sebebi yoktu ve bakmıyordu da.

   Servisin bu uygulamada en çok merak ettiği şeyin karşılığı bu:
   PAKSAN bana ne kadar borçlu, hangi iş onaylandı, hangisi bekliyor.

   NEDEN ÖNEMLİ — VERİNİN DOĞRULUĞU BURADAN GELİYOR

   Servis ayrı bir şirket ve kendi menfaati dışında bir şey yapmıyor.
   `lib/servisKaydi.js` başındaki kural bu ekranda tamamlanıyor: kayıt
   doldurulmadan para doğmuyor, para bu ekranda görünüyor. Kaydın
   doğru dolmasının bekçisi iyi niyet değil, servisin kendi cebi —
   ama cebini göremezse o kaldıraç da çalışmıyor.

   ÜÇ BÖLÜM

     BAKİYE     PAKSAN'ın bugünkü borcu, tek rakam
     BEKLEYEN   gönderildi, onay bekliyor
     GEÇMİŞ     cari hesap hareketleri, en yeni üstte

   BUGÜNKÜ SINIR: veri tarayıcının kendi hafızasında. Servisin
   telefonundaki bakiye PAKSAN'ın ekranına ulaşmıyor. Defterin biçimi
   doğru; sunucu geldiğinde yalnız veri katmanı değişecek.
   ========================================================================== */

export function Hakkedis({ oturum, onAc }) {
  const talepler = useMemo(
    () => servisinTalepleri(talepleriGetir(), oturum.servisId),
    [oturum.servisId],
  )
  const hareketler = useMemo(
    () => cariHareketleri(oturum.servisId),
    [oturum.servisId],
  )
  const bakiye = cariBakiye(oturum.servisId)

  /* Gönderilmiş ama onaylanmamış kayıtlar. Servis "param nerede"
     sorusunun cevabını burada buluyor. */
  const bekleyen = talepler.filter((t) => t.hakkedis?.durum === 'bekliyor')
  const bekleyenToplam = bekleyen.reduce((t, x) => t + (x.hakkedis?.toplam || 0), 0)

  return (
    <>
      {/* TEK RAKAM, EN ÜSTTE. Servis ekranı bunun için açıyor. */}
      <div className={'not ' + (bakiye > 0 ? 'not--yesil' : 'not--mavi')}>
        <IconCheckCircle size={19} />
        <div>
          <strong>
            {MARKA} bakiyeniz: {paraYaz(bakiye)} {PARA_BIRIMI}
          </strong>
          <p>
            {bakiye > 0
              ? 'Onaylanan işlerinizin tutarı. Ödeme yapıldıkça buradan düşer.'
              : 'Onaylanmış ve ödenmemiş işiniz görünmüyor.'}
          </p>
        </div>
      </div>

      {bekleyen.length > 0 && (
        <Bolum ad="Onay Bekleyen" sayi={bekleyen.length}>
          <p className="ipucu">
            Toplam {paraYaz(bekleyenToplam)} {PARA_BIRIMI} · {markaEk('in')} servis
            personeli inceliyor.
          </p>
          {bekleyen.map((t) => (
            <ListeKarti
              key={t.id}
              ad={t.ad || '—'}
              tur="servis"
              turAdi="Servis"
              kunye={t.no}
              sol={gecenSure(t.servisKaydi?.tarih || t.createdAt)}
              sag={`${paraYaz(t.hakkedis.toplam)} ${PARA_BIRIMI}`}
              onAc={() => onAc(t)}
            />
          ))}
        </Bolum>
      )}

      {hareketler.length === 0 ? (
        <Bos
          gorsel={bosIsGorseli}
          baslik="Henüz hak edişiniz yok"
          alt="Garanti kapsamında tamamladığınız işler onaylandığında burada görünür."
          kucuk={bekleyen.length > 0}
        />
      ) : (
        <Bolum ad="Hesap Hareketleri" sayi={hareketler.length}>
          {hareketler.map((h) => (
            <div key={h.id} className="satir" style={{ gap: 10, alignItems: 'baseline' }}>
              <div>
                <div>{h.aciklama}</div>
                <div className="kucuk sonuk">{gecenSure(h.tarih)}</div>
              </div>
              <span
                className={h.tur === 'alacak' ? 'is__sag' : 'is__sag is__sag--gec'}
                style={{ marginLeft: 'auto' }}
              >
                {h.tur === 'alacak' ? '+' : '−'}
                {paraYaz(h.tutar)} {PARA_BIRIMI}
              </span>
            </div>
          ))}
        </Bolum>
      )}

      {/* ÖDEMENİN NASIL YAPILDIĞI YAZIYOR.

          Bakiye ekranı olan her yerde ilk sorulan soru bu. Cevabı
          yoksa servis telefon ediyor; telefon eden servis, ekranın
          işe yaramadığı anlamına geliyor. */}
      <p className="ipucu">
        Ödemeler {MARKA} muhasebesi tarafından cari hesabınıza yapılır.
        Bakiyenizle ilgili bir sorunuz varsa servis personeline yazın.
      </p>
    </>
  )
}
