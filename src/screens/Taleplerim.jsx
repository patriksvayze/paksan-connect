import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar, Sheet } from '../components/Chrome'
import { getProduct, urunDilde } from '../marka'
import { alanEtiketi } from '../data/talepAlanlari'
import { KaydirilirSatir } from '../components/Kaydir'
import { musteriDurumAnahtari, talepTuru } from '../lib/talep'
import { KAPALI_DURUMLAR } from '../lib/talepEkleme'
import { formatSerial } from '../lib/serial'
import { useDil } from '../i18n'
import { IconMic, IconParca, IconRight, IconWrench } from '../components/Icons'
import { TalepSimgesi } from '../components/TalepSimgesi'

/* ==========================================================================
   Taleplerim

   TALEPLER KENDİ EKRANINDA (25 Eylül 2026, kullanıcı sınaması). Liste
   Profil sayfasının içinde, hesap kartının altında duruyordu. Ana
   ekrandaki "Aktif taleplerim" sayacı bu yüzden Profil'e gidip listeye
   kaydırıyordu: başlıkta "Profil" yazıyor, alt menüde Profil yanıyordu;
   Profil'deki "Talep" sayacına dokunmak ise hiçbir şey yapmıyordu.
   Talepler hesap ayarı değil. Ana ekranın ve Profil'in sayacı artık
   buraya geliyor; liste, sekmeler, kaldırma penceresi ve parça özetleri
   Profile.jsx'ten olduğu gibi taşındı.

   LİSTEDEN KALDIRILANLAR GERİ ALINABİLİYOR (kullanıcı sınaması O9).
   Kaldırma yalnız bu telefonun listesinden kaldırıyor, kayıt PAKSAN'da
   duruyor (bkz. context/AppState.jsx → removeRequest). Önce geri
   getirmenin yolu yoktu ve onay metni varmış gibi yazıyordu. Kaldırılan
   talepler Tamamlananlar sekmesinin altında, kendi bölümünde, geri alma
   düğmesiyle duruyor.
   ========================================================================== */

export default function Taleplerim() {
  const nav = useNavigate()
  const { t, dil } = useDil()
  const { requests, kaldirilanTalepler, removeRequest, talebiGeriAl, showToast } = useApp()
  /* 'acik' | 'kapali' — hangi sekme açık */
  const [talepSekme, setTalepSekme] = useState('acik')
  const [tumTalepler, setTumTalepler] = useState(false)
  const [silinecek, setSilinecek] = useState(null)
  /* "Listeden Kaldırdıklarım" bölümü açık mı */
  const [kaldirilanlarAcik, setKaldirilanlarAcik] = useState(false)

  /* Açık ve tamamlanmış talepler.

     "Tamamlanmış" = üzerinde iş kalmamış: kapandı, iptal edildi ya da
     fiyat teklifi bayiye iletildi. Yedek parçada kargoya verilmek ayrı
     bir durum değil, kapanışın kendisi. Liste lib/talepEkleme.js'te;
     talebe ekleme kapısı da aynı listeye bakıyor. */
  const KAPALI = KAPALI_DURUMLAR
  const acikTalepler = requests.filter((r) => !KAPALI.includes(r.status || 'yeni'))
  const kapaliTalepler = requests.filter((r) => KAPALI.includes(r.status || 'yeni'))
  const seciliListe = talepSekme === 'acik' ? acikTalepler : kapaliTalepler

  /* İlk beş satır; gerisi isteyene. Liste Profil'deyken altındaki hesap
     ayarlarına ulaşmak için konmuştu; kendi ekranında da uzun listeyi
     bölmek bakılan şeyi (en yeni talepler) öne çıkarıyor. */
  const ILK_TALEP = 5
  const gosterilen = tumTalepler ? seciliListe : seciliListe.slice(0, ILK_TALEP)
  const kalan = seciliListe.length - gosterilen.length

  /* Hiç talep yoksa — kaldırılanlar da yoksa — boş ekran. Kaldırılan
     talep varsa sekmeler duruyor: geri almanın yolu Tamamlananlar
     sekmesinde. */
  const hicYok = requests.length === 0 && kaldirilanTalepler.length === 0

  const tarihYaz = (z) =>
    new Date(z).toLocaleDateString(dil === 'tr' ? 'tr-TR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <div className="app">
      <TopBar title={t('profil.taleplerim')} back="auto" />

      <div className="screen wrap" style={{ paddingTop: 18 }}>
        {/* İKİ SEKME. Talepler birikince liste metrelerce uzuyordu ve
            asıl bakılan şey — bekleyen işler — kapanmışların arasında
            kayboluyordu. Açık talepler önde, tamamlananlar ikinci
            sekmede. */}
        {!hicYok && (
          <div className="sekmeler">
            <button
              className={'sekme' + (talepSekme === 'acik' ? ' sekme--on' : '')}
              onClick={() => {
                setTalepSekme('acik')
                setTumTalepler(false)
              }}
            >
              {t('profil.acikTalepler')}
              <span className="sekme__sayi">{acikTalepler.length}</span>
            </button>
            <button
              className={'sekme' + (talepSekme === 'kapali' ? ' sekme--on' : '')}
              onClick={() => {
                setTalepSekme('kapali')
                setTumTalepler(false)
              }}
            >
              {t('profil.tamamlananTalepler')}
              <span className="sekme__sayi">{kapaliTalepler.length}</span>
            </button>
          </div>
        )}

        {hicYok ? (
          /* Boş liste. Tek bir "Talep Oluştur" butonu vardı ama hangi
             talebi açacağı belli olmuyordu; artık iki iş de adıyla
             yazılı, kullanıcı ne açtığını bilerek dokunuyor.
             Sıra ana ekranla aynı: önce servis, sonra parça (29 Eylül
             2026, C4). Servis turuncu, parça çerçeveli: ana ekranda da
             turuncu servisin. */
          <div className="card" style={{ padding: 22 }}>
            <p className="muted small center" style={{ lineHeight: 1.6 }}>
              {t('profil.talepYok')}
            </p>
            <button
              className="btn btn--orange btn--lg"
              style={{ marginTop: 18 }}
              onClick={() => nav('/talep?tur=servis')}
            >
              <IconWrench size={21} /> {t('anasayfa.servisTalebi')}
            </button>
            <button
              className="btn btn--cerceve btn--lg"
              style={{ marginTop: 10 }}
              onClick={() => nav('/talep?tur=parca')}
            >
              <IconParca size={21} /> {t('anasayfa.yedekParcaTalebi')}
            </button>
          </div>
        ) : gosterilen.length === 0 ? (
          <div className="card" style={{ padding: 22 }}>
            <p className="muted small center" style={{ lineHeight: 1.6 }}>
              {talepSekme === 'acik' ? t('profil.acikTalepYok') : t('profil.kapaliTalepYok')}
            </p>
          </div>
        ) : (
          <>
            {/* İpucu yalnız kapalı talepler sekmesinde: açık taleplerde
                kaydırma yok, olmayan bir hareketi anlatmak yanlış. */}
            {talepSekme === 'kapali' && (
              <p className="small muted" style={{ marginBottom: 10 }}>
                {t('profil.kaydirIpucu')}
              </p>
            )}
            <div className="stack">
              {gosterilen.map((r) => {
                const pr = r.makine ? urunDilde(getProduct(r.makine.productId), dil) : null
                const tur = talepTuru(r.tur)
                /* ÜZERİNDE İŞ SÜREN TALEP KAYDIRILAMIYOR.

                   Her satır kaydırılabiliyordu ve kaydırma kaydı
                   listeden kaldırıyordu. Açık bir talep PAKSAN'ın ve
                   teknisyenin listesinde duran iştir: müşteri onu
                   kaldırınca ekranında işin izi kalmıyor, oysa iş
                   sürüyor. Kapanmış ya da iptal edilmiş satır
                   kaldırılabiliyor; açık satırda kaydırma hiç yok —
                   çalışmayan bir hareketi ipucuyla tanıtmak kendi
                   başına hata. */
                const kaldirilabilir = KAPALI.includes(r.status || 'yeni')
                const govde = (
                  <div
                    className="listitem"
                    style={{ alignItems: 'flex-start' }}
                    data-talep={r.id}
                  >
                    {/* Talebin TÜRÜ, durumu değil (29 Eylül 2026,
                        C3): her satırda yeşil onay işareti vardı ve işi
                        süren talep de "bitti" gibi görünüyordu. Durum
                        hemen aşağıdaki renkli etikette. */}
                    <TalepSimgesi tur={r.tur} />
                    <div className="listitem__body">
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span className="listitem__title" style={{ fontSize: 15.5 }}>
                          {t(`talep.${r.tur}.baslik`)}
                        </span>
                        {/* Talep numarası türün rengiyle: servis kırmızı,
                            yedek parça turuncu, teklif mavi. */}
                        <span
                          className={'badge serial-mono badge--' + tur.ton}
                          style={{ fontSize: 11.5 }}
                        >
                          {r.no}
                        </span>
                      </div>
                      {/* Talebin hangi aşamada olduğu.

                          Düz yazıyla yazınca öteki satırların
                          arasında kayboluyordu; durum listedeki en
                          önemli bilgi. Renkli hap hâlinde ve durumun
                          kendi rengiyle. Adı türe göre: parçada
                          `planlandi` gönderim günü, randevu değil
                          (lib/talep.js → musteriDurumAnahtari). */}
                      <div style={{ marginTop: 5 }}>
                        <span className={'durum-hap durum-hap--' + (r.status || 'yeni')}>
                          {t(musteriDurumAnahtari(r))}
                        </span>
                      </div>

                      {/* Randevu verildiyse tarihi ve işi burada */}
                      {r.plan && r.status === 'planlandi' && (
                        <div className="randevu-kutu">
                          <div className="randevu-kutu__tarih">{r.plan.tarihYazi}</div>
                          <div>{r.plan.is}</div>
                        </div>
                      )}

                      {pr && (
                        <div className="listitem__sub">
                          {pr.name} ·{' '}
                          <span className="serial-mono">{formatSerial(r.makine.serial)}</span>
                        </div>
                      )}
                      {/* Formda işaretlenen belirti / parça başlıkları —
                          açıklamayı okumadan talebin ne olduğu anlaşılsın */}
                      {(r.belirtiler?.length > 0 ||
                        r.parcalar?.length > 0 ||
                        r.parcaFiyat?.satirlar?.length > 0) && (
                        <div className="listitem__sub" style={{ marginTop: 4 }}>
                          {/* Belirti kaydı Türkçe; ekranda kullanıcının
                              dilinde. Parçalar katalogdan geliyor ve
                              kendi adıyla, kodunun yanında yazıyor. */}
                          {[
                            ...(r.belirtiler || []).map((x) => alanEtiketi(x, dil)),
                            ...parcaOzetleri(r, dil),
                          ].join(' · ')}
                        </div>
                      )}
                      {r.ses?.veri && (
                        <div className="row small muted" style={{ gap: 5, marginTop: 5 }}>
                          <IconMic size={14} /> {t('profil.sesEklendi')}
                        </div>
                      )}
                      {r.aciklama && (
                        <p className="small muted" style={{ marginTop: 5, lineHeight: 1.5 }}>
                          {r.aciklama.length > 90 ? r.aciklama.slice(0, 90) + '…' : r.aciklama}
                        </p>
                      )}
                      {/* "AYRINTI İÇİN DOKUNUN" KALDIRILDI (10 Eylül 2026).

                          Yalnız iptal edilmiş, kapanmış ya da teklifi
                          gelmiş taleplerde çıkıyordu; kartların bir
                          kısmında olup ötekilerde olmaması tutarsız
                          görünüyordu. Her kart zaten dokununca açılıyor
                          ve sağındaki ok bunu gösteriyor. */}
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {tarihYaz(r.createdAt)}
                      </div>
                    </div>
                    <span className="listitem__chev"><IconRight size={20} /></span>
                  </div>
                )
                return kaldirilabilir ? (
                  <KaydirilirSatir
                    key={r.id}
                    onSil={() => setSilinecek(r)}
                    onDokun={() => nav('/talebim/' + r.id)}
                  >
                    {govde}
                  </KaydirilirSatir>
                ) : (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => nav('/talebim/' + r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') nav('/talebim/' + r.id)
                    }}
                  >
                    {govde}
                  </div>
                )
              })}
            </div>

            {kalan > 0 && (
              <button
                className="btn btn--soft"
                style={{ marginTop: 12 }}
                onClick={() => setTumTalepler(true)}
              >
                {t('profil.dahaFazlaTalep', { n: kalan })}
              </button>
            )}
          </>
        )}

        {/* --------------------------------- Listeden kaldırdıklarım

            Tamamlananlar sekmesinin altında: kaldırılabilen talep yalnız
            tamamlanmış talep. Kapalı açılıyor; açılınca her talebin
            yanında geri alma düğmesi. Kart dokunulunca açılmıyor —
            ayrıntısı talep listeye dönünce görünüyor. */}
        {talepSekme === 'kapali' && kaldirilanTalepler.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <button
              className="btn btn--soft"
              aria-expanded={kaldirilanlarAcik}
              onClick={() => setKaldirilanlarAcik((a) => !a)}
            >
              {t('profil.kaldirilanlar', { n: kaldirilanTalepler.length })}
            </button>
            {kaldirilanlarAcik && (
              <>
                <p className="small muted" style={{ margin: '12px 0 10px', lineHeight: 1.6 }}>
                  {t('profil.kaldirilanlarAlt')}
                </p>
                <div className="stack">
                  {kaldirilanTalepler.map((r) => (
                    <div key={r.id} className="card" style={{ padding: 16 }} data-kaldirilan={r.id}>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15.5 }}>
                          {t(`talep.${r.tur}.baslik`)}
                        </span>
                        <span
                          className={'badge serial-mono badge--' + talepTuru(r.tur).ton}
                          style={{ fontSize: 11.5 }}
                        >
                          {r.no}
                        </span>
                      </div>
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {tarihYaz(r.createdAt)}
                      </div>
                      <button
                        className="btn btn--soft btn--sm"
                        /* 48: Android'in dokunma eşiği; küçük düğme 46'da kalıyordu. */
                        style={{ marginTop: 12, minHeight: 48 }}
                        onClick={() => {
                          talebiGeriAl(r.id)
                          showToast(t('profil.geriAlindi'))
                        }}
                      >
                        {t('profil.geriAl')}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Talebi listeden kaldırma. Kayıt silinmiyor; pencere geri
          almanın yerini söylüyor (profil.talepKaldirAciklama). */}
      <Sheet
        open={Boolean(silinecek)}
        onClose={() => setSilinecek(null)}
        title={t('profil.talepKaldirSor')}
      >
        {silinecek && (
          <div className="stack" style={{ gap: 14 }}>
            <p style={{ lineHeight: 1.65 }}>
              {t('profil.talepKaldirAciklama', {
                no: silinecek.no,
                tur: t(`talep.${silinecek.tur}.baslik`).toLocaleLowerCase(),
              })}
            </p>
            <button
              className="btn btn--lg"
              style={{ background: 'var(--pk-red)', color: '#fff' }}
              onClick={() => {
                removeRequest(silinecek.id)
                setSilinecek(null)
                showToast(t('profil.talepKaldirildi'))
              }}
            >
              {t('profil.evetKaldir')}
            </button>
            <button className="btn btn--soft" onClick={() => setSilinecek(null)}>
              {t('ortak.vazgec')}
            </button>
          </div>
        )}
      </Sheet>

      <TabBar />
    </div>
  )
}

/* ------------------------------------------- Listedeki parça özetleri

   Talep kartının alt satırında parçalar tek tek yazıyor. Kayıttaki
   fiyat görüntüsü (`parcaFiyat.satirlar`) varsa oradan okunuyor ve KOD
   da yazılıyor: PAKSAN'ın kataloğunda tekrar eden adlar var, adın
   kendisi artık parçayı belirtmiyor. Liste sıkışık olduğu için satır
   kısa tutuluyor — ad, parantez içinde kod; adet ve tutar burada yok,
   ikisi de talep detayında duruyor.

   Görüntüsü olmayan eski kayıtlarda yalnız ad var; kod UYDURULMUYOR,
   satır eski biçimde yazılıyor. */
function parcaOzetleri(r, dil) {
  const satirlar = (r.parcaFiyat?.satirlar || []).filter((s) => s?.ad)
  if (satirlar.length) {
    return satirlar.map((s) => (s.kod ? `${s.ad} (${s.kod})` : s.ad))
  }
  return (r.parcalar || []).map((x) => alanEtiketi(x, dil))
}
