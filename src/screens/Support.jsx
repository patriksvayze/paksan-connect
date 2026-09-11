import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppState'
import { TopBar, TabBar } from '../components/Chrome'
import { Amblem, PRODUCTS, getProduct, urunDilde } from '../marka'
import { useDil } from '../i18n'
import { destekOlay, destekOturumu } from '../lib/destekLog'
import { kilavuzAdresi, soruSor, sorudakiUrun } from '../lib/destekAsistani'
import {
  IconAlert, IconCheckCircle, IconMachine, IconParca, IconRight, IconSend, IconWrench,
} from '../components/Icons'

/* ==========================================================================
   Destek ekranı — PAKSAN'ın kılavuzlarından cevap veren asistan

   ESKİ EKRAN GEÇİCİYDİ

   Burada bir dönem hazır bir arıza rehberi vardı: makine → bölüm →
   belirti → sebepler. İçeriği uygulamaya gömülü 81 kayıttı
   ve yalnız o soruları biliyordu. O veri 10 Eylül 2026'da uygulamadan
   çıkarıldı (arşiv: D:\paksan-rag\arsiv\eski-destek-ekrani).
   Hedef baştan beri PAKSAN'a özel bir asistandı; o ekran yerini
   tutuyordu.

   ASİSTANIN HİÇBİR PARÇASI UYGULAMADA DEĞİL

   Kılavuzlar, arama indeksi ve dil modeli sunucuda (bkz. src/config.js
   → AI, lib/destekAsistani.js). Uygulama soruyu gönderiyor, cevabı
   geldikçe gösteriyor. Sunucuya yeni kılavuz eklendiğinde bu ekran hiç
   değişmeden onu da biliyor.

   CEVABIN KAYNAĞI GÖSTERİLİYOR

   Her cevabın altında hangi kılavuzun hangi sayfasından geldiği yazıyor
   ve dokununca o sayfa açılıyor. Cevaptaki [1] işareti ile kaynaktaki
   rozet aynı: çiftçi hangi cümlenin hangi sayfadan geldiğini
   eşleştirebiliyor. Asistan kılavuzda bulamadığını uydurmuyor —
   "bulamadım" diyor ve servis talebine yönlendiriyor.

   MAKİNEYİ GEREKTİĞİNDE ASİSTAN SORUYOR

   Aynı soru iki makinede başka cevaba çıkıyor (traktör gücü, yağ
   miktarı). Sohbet seçimsiz başlıyor; sunucu sorudan modeli bulamazsa
   makine_gerekli dönüyor. Kayıtlı makineler ve diğer modeller sohbetin
   içinde sunuluyor. Seçim yapılınca bekleyen soru yeniden gönderiliyor.
   Makine sayfasından gelindiyse adresteki makine kullanılıyor.

   BOŞ EKRAN ÇIKMAZ SOKAK DEĞİL. Hiç soru sorulmamışken örnek sorular
   duruyor ve tek dokunuşla soruluyor.

   KAYIT

   Her soru ve cevabın kaynağı Destek Kayıtları'na düşüyor
   (bkz. lib/destekLog.js). Cevapsız kalan sorular PAKSAN'a hangi
   kılavuzun ya da bölümün eksik olduğunu gösteriyor.
   ========================================================================== */

/* Model cevabı, fiziksel makine talebi belirler. Eski sohbetin seçimi
   cihazdan yüklenmez; yeni sohbet fark ettirmeden o makineye bağlanmaz. */
const BOS_BAGLAM = { urunId: null, makineId: null }
const MODEL_ADLARI = PRODUCTS.map((p) => ({ ...p, enName: urunDilde(p, 'en').name }))

/* Modele geri gönderilen geçmiş: son üç soru ve cevabı. Uzun geçmiş
   hem cevabı yavaşlatıyor hem de konuyu eski soruya kaydırıyor. */
const GECMIS = 6

/* Kılavuz adındaki tarih çiftçiye bir şey anlatmıyor. */
const kilavuzAdi = (ad) => String(ad || '').replace(/\s+\d{8}$/, '')

export default function Support() {
  const nav = useNavigate()
  const { machineId: adresMakineId } = useParams()
  const { user, machines } = useApp()
  const { t, dil } = useDil()

  const adresMakinesi = machines.find((m) => m.id === adresMakineId)
  const [baglam, setBaglam] = useState(() => adresMakinesi
    ? { urunId: adresMakinesi.productId, makineId: adresMakinesi.id }
    : BOS_BAGLAM)
  const { urunId, makineId } = baglam
  const [mesajlar, setMesajlar] = useState([])
  const [yazi, setYazi] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  const sayac = useRef(0)
  const dip = useRef(null)
  const durdurucu = useRef(null)
  const sonSoru = useRef('')
  const bekleyenSoru = useRef(null)

  /* Müşterinin kayıtlı makineleri en üstte, her makine ayrı satır: iki
     Süper Yunus'u olan çiftçi ikisini de görmeli. */
  const benimMakinelerim = useMemo(() => {
    const liste = []
    for (const m of machines) {
      const p = urunDilde(getProduct(m.productId), dil)
      if (!p) continue
      liste.push({
        anahtar: m.id,
        makineId: m.id,
        urunId: m.productId,
        ad: m.nickname || p.name,
        alt: [m.nickname ? p.name : null, m.serial].filter(Boolean).join(' · '),
      })
    }
    return liste
  }, [machines, dil])

  /* Katalogdan seçilen model kullanıcının kayıtlı makinesi değil:
     `makineId` yok, talep de bir seri numarasına bağlanmıyor. */
  const digerUrunler = useMemo(() => {
    return PRODUCTS.map((p) => ({
      anahtar: p.id,
      makineId: null,
      urunId: p.id,
      ad: urunDilde(p, dil).name,
    }))
  }, [dil])

  /* Saklanan makine silinmiş olabilir: listede yoksa yok sayılıyor. */
  const secilenMakine = machines.find((m) => m.id === makineId && m.productId === urunId)

  /* Makine sayfasından gelindiğinde (/destek/mk1) makine adreste yazılı;
     bir daha sorulmuyor. */
  useEffect(() => {
    durdurucu.current?.abort()
    durdurucu.current = null
    bekleyenSoru.current = null
    sonSoru.current = ''
    setBekliyor(false)
    setMesajlar([])
    setYazi('')
    setBaglam(adresMakinesi
      ? { urunId: adresMakinesi.productId, makineId: adresMakinesi.id }
      : BOS_BAGLAM)
  }, [adresMakineId, adresMakinesi?.id, adresMakinesi?.productId])

  /* Ekrandan çıkılınca yarım kalan cevap sunucuda da duruyor. */
  useEffect(() => () => {
    durdurucu.current?.abort()
    durdurucu.current = null
  }, [])

  useEffect(() => {
    dip.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [mesajlar])

  /* ------------------------------------------------------- Oturum kaydı */

  function kaydet(olay, hedef = baglam) {
    const u = hedef.urunId ? getProduct(hedef.urunId) : null
    const makine = machines.find((m) => m.id === hedef.makineId && m.productId === hedef.urunId)
    destekOlay(
      destekOturumu({
        anahtar: makine?.id || hedef.urunId || 'genel',
        kullanici: user,
        makine: makine
          ? { id: makine.id, serial: makine.serial, productId: makine.productId }
          : null,
        urun: u ? { id: u.id, name: u.name } : null,
        grup: u?.category || 'genel',
        dil,
      }),
      olay,
    )
  }

  /* ------------------------------------------------------------ Sohbet */

  function guncelle(id, yama) {
    setMesajlar((liste) =>
      liste.map((m) =>
        m.id === id ? { ...m, ...(typeof yama === 'function' ? yama(m) : yama) } : m,
      ),
    )
  }

  async function sor(metin, { hedef = baglam, onceki = mesajlar, secimMetni = '' } = {}) {
    const soru = String(metin || '').trim()
    if (soru.length < 3 || soru.length > 1000) return

    /* Makine sorusuna yalnız model adı yazmak da düğmeye dokunmak gibi
       ilk soruyu sürdürür. Yeni bir cümle ise yeni soru olarak işlenir. */
    const yazilanModel = sorudakiUrun(soru, MODEL_ADLARI, true)
    if (!secimMetni && bekleyenSoru.current && yazilanModel) {
      makineSec({ urunId: yazilanModel.id, ad: urunDilde(yazilanModel, dil).name })
      return
    }
    const anilanModel = secimMetni ? null : sorudakiUrun(soru, MODEL_ADLARI)
    if (anilanModel && anilanModel.id !== hedef.urunId) {
      hedef = { urunId: anilanModel.id, makineId: null }
    }
    setBaglam(hedef)
    bekleyenSoru.current = null

    /* Yeni soru bekleyen cevabı durduruyor: çiftçi soruyu değiştirdiyse
       eski cevabın bitmesini beklemesinin anlamı yok. */
    durdurucu.current?.abort()
    const kontrol = new AbortController()
    durdurucu.current = kontrol

    /* Yalnız aynı makineye ait tamamlanan soru-cevap çiftleri. Makine
       seçimi ve cevapsız ilk deneme geçmişe ikinci soru gibi eklenmez. */
    const gecmis = onceki.flatMap((m) =>
      m.kim === 'bot' && m.durum === 'cevaplandi' && m.metin && m.soru &&
      m.baglam?.urunId === hedef.urunId && m.baglam?.makineId === hedef.makineId
        ? [{ kim: 'ben', metin: m.soru }, { kim: 'bot', metin: m.metin }]
        : [],
    )
      .slice(-GECMIS)

    sayac.current += 2
    const benId = sayac.current - 1
    const botId = sayac.current
    sonSoru.current = soru
    setMesajlar((l) => [
      ...l.filter((m) => !m.akiyor),
      { id: benId, kim: 'ben', metin: secimMetni || soru, yanit: Boolean(secimMetni) },
      { id: botId, kim: 'bot', metin: '', akiyor: true, soru, baglam: hedef },
    ])
    setYazi('')
    setBekliyor(true)
    kaydet({ tur: 'serbest', deger: soru }, hedef)

    let kaynaklar = []
    const son = await soruSor(
      { soru, urun: hedef.urunId || '', dil, gecmis },
      {
        signal: kontrol.signal,
        onOlay: (olay) => {
          if (kontrol.signal.aborted || durdurucu.current !== kontrol) return
          if (olay.tur === 'durum') {
            guncelle(botId, { asama: olay.durum })
          } else if (olay.tur === 'kaynaklar') {
            kaynaklar = olay.kaynaklar || []
            guncelle(botId, { kaynaklar, guvenlik: Boolean(olay.guvenlik) })
          } else if (olay.tur === 'parca') {
            guncelle(botId, (m) => ({ metin: (m.metin || '') + olay.metin }))
          }
        },
      },
    )

    if (kontrol.signal.aborted || durdurucu.current !== kontrol) return
    durdurucu.current = null
    setBekliyor(false)
    if (son.durum === 'iptal') {
      setMesajlar((l) => l.filter((m) => m.id !== botId))
      return
    }
    guncelle(botId, { akiyor: false, durum: son.durum, alintilar: son.alintilar || null })
    if (son.durum === 'makine_gerekli') {
      bekleyenSoru.current = { botId, soru, onceki }
    }

    if (son.durum === 'cevaplandi' || son.durum === 'llm_yok') {
      /* "HAMMER KULLANIM KILAVUZU, s. 37, 38" — aynı kılavuzun sayfaları
         tek satırda; backoffice'te hangi bölümün işe yaradığı okunuyor. */
      const sayfalar = {}
      for (const k of kaynaklar) {
        const ad = kilavuzAdi(k.kilavuz)
        sayfalar[ad] = [...new Set([...(sayfalar[ad] || []), k.sayfa])]
      }
      const kaynakYazisi = Object.entries(sayfalar)
        .map(([ad, liste]) => `${ad}, s. ${liste.sort((a, b) => a - b).join(', ')}`)
        .join('; ')
      kaydet({ tur: 'cevap', deger: kaynakYazisi || soru }, hedef)
    } else if (['bulunamadi', 'kilavuz_yok', 'model_farkli'].includes(son.durum)) {
      kaydet({ tur: 'cevapsiz', deger: soru }, hedef)
    }
  }

  function makineSec(secim) {
    const bekleyen = bekleyenSoru.current
    if (!bekleyen || durdurucu.current) return
    bekleyenSoru.current = null
    const hedef = { urunId: secim.urunId, makineId: secim.makineId || null }
    sor(bekleyen.soru, {
      hedef,
      onceki: bekleyen.onceki,
      secimMetni: [secim.ad, secim.alt].filter(Boolean).join(' · '),
    })
  }

  /* ÇÖZÜLDÜ MÜ — ÇİFTÇİNİN KENDİ SÖZÜ.

     Cevabın gelmiş olması sorunun çözüldüğünü göstermiyor. Backoffice'teki
     "Ekranda çözüldü" sayısı yalnız bu cevaba bakıyor (bkz.
     backoffice/ekranlar/DestekKayitlari.jsx → cozuldu); kanıt yoksa
     oturum "yarıda kaldı" sayılıyor.

     "Hâlâ devam ediyor" denince talep düğmeleri çıkıyor: asistanın
     yetmediği yer servisin başladığı yer. Çiftçinin seçimi kendi
     baloncuğunda görünüyor ama modele geri gönderilmiyor (`yanit`). */
  function geriBildirim(cozuldu) {
    sayac.current += 2
    const benId = sayac.current - 1
    const botId = sayac.current
    kaydet(cozuldu ? { tur: 'cevap', deger: 'çözüldü' } : { tur: 'cozulmedi', deger: sonSoru.current })
    setMesajlar((l) => [
      ...l,
      { id: benId, kim: 'ben', yanit: true, metin: t(cozuldu ? 'destek.cozuldu' : 'destek.cozulmedi') },
      {
        id: botId,
        kim: 'bot',
        yanit: true,
        metin: t(cozuldu ? 'destek.tesekkur' : 'destek.neYapalim'),
        durum: cozuldu ? 'tesekkur' : 'devam',
      },
    ])
  }

  function bastanBasla() {
    durdurucu.current?.abort()
    durdurucu.current = null
    bekleyenSoru.current = null
    sonSoru.current = ''
    setBekliyor(false)
    setMesajlar([])
    setYazi('')
    setBaglam(adresMakinesi
      ? { urunId: adresMakinesi.productId, makineId: adresMakinesi.id }
      : BOS_BAGLAM)
  }

  /* Talebe konuşulan soru ve makine taşınıyor; çiftçi aynı şeyi ikinci
     kez anlatmıyor. */
  function talepAc(tur) {
    kaydet({ tur: 'yonlendirme', deger: tur })
    const destek = sonSoru.current ? `&destek=${encodeURIComponent(sonSoru.current)}` : ''
    /* Makine yalnız model adıyla belirlendiyse model taşınıyor; form o
       modelden tek kayıtlı makine varsa onu seçer (bkz. RequestForm.jsx). */
    const makine = secilenMakine
      ? `&makine=${encodeURIComponent(secilenMakine.id)}`
      : urunId ? `&model=${encodeURIComponent(urunId)}` : ''
    nav(`/talep?tur=${tur}${destek}${makine}`)
  }

  /* ------------------------------------------------------------- Ekran */

  const sonMesaj = mesajlar[mesajlar.length - 1]
  const sonBot = sonMesaj?.kim === 'bot' && !sonMesaj.akiyor ? sonMesaj : null
  /* Cevap geldiyse önce "çözüldü mü" soruluyor. Cevap hiç yoksa ya da
     çiftçi "devam ediyor" dediyse doğrudan talep düğmeleri. */
  const cevapVar =
    sonBot && ((sonBot.durum === 'cevaplandi' && sonBot.metin) || sonBot.durum === 'llm_yok')
  const talepVar =
    sonBot &&
    (sonBot.durum === 'devam' ||
      ['bulunamadi', 'kilavuz_yok', 'model_farkli'].includes(sonBot.durum) ||
      (sonBot.durum === 'cevaplandi' && !sonBot.metin))
  const ornekler = [t('destek.ornek1'), t('destek.ornek2'), t('destek.ornek3')]

  return (
    <div className="app">
      <TopBar title={t('destek.baslik')} back="auto" />

      <div className="screen wrap fade-in sohbet-ekrani" style={{ paddingTop: 14 }}>
        <div className="chat">
          <Balon
            mesaj={{
              kim: 'bot',
              metin: [
                t('destek.selam', { ad: (user?.ad || '').split(' ')[0] || '' }),
                t('destek.nasilYardim'),
              ].join('\n'),
            }}
            t={t}
          />

          {/* Örnek sorular açılışta; selam ya da "ne yapabilirsin" cevabından
              sonra da çiftçi ne sorabileceğini görsün. */}
          {(mesajlar.length === 0 || (sonBot && ['selam', 'kimlik'].includes(sonBot.durum))) && (
            <div className="chips chips--dikey">
              <div className="eyebrow">{t('destek.ornekBaslik')}</div>
              {ornekler.map((o) => (
                <button key={o} className="chip" onClick={() => sor(o)}>
                  {o}
                </button>
              ))}
            </div>
          )}

          {mesajlar.map((m) => (
            <Balon
              key={m.id}
              mesaj={m}
              t={t}
              makine={urunDilde(getProduct(m.baglam?.urunId), dil)?.name}
            >
              {m === sonBot && m.durum === 'makine_gerekli' && (
                <MakineListesi benim={benimMakinelerim} digerleri={digerUrunler} onSec={makineSec} t={t} />
              )}
            </Balon>
          ))}
        </div>

        {cevapVar && (
          <div className="chips chips--dikey">
            <button className="chip chip--ana" onClick={() => geriBildirim(true)}>
              <IconCheckCircle size={18} /> {t('destek.cozuldu')}
            </button>
            <button className="chip" onClick={() => geriBildirim(false)}>
              <IconAlert size={18} /> {t('destek.cozulmedi')}
            </button>
          </div>
        )}

        {talepVar && (
          <div className="chips chips--dikey">
            <button className="chip chip--ana" onClick={() => talepAc('servis')}>
              <IconWrench size={18} /> {t('destek.servisTalebi')}
            </button>
            <button className="chip" onClick={() => talepAc('parca')}>
              <IconParca size={18} /> {t('destek.parcaTalebi')}
            </button>
          </div>
        )}

        {mesajlar.length > 0 && (
          <button className="btn btn--soft btn--sm" style={{ marginTop: 18 }} onClick={bastanBasla}>
            {t('destek.bastanBasla')}
          </button>
        )}

        <p className="dst-not">{t('destek.asistanNot')}</p>
        <div ref={dip} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          sor(yazi)
        }}
      >
        <input
          className="input"
          value={yazi}
          onChange={(e) => setYazi(e.target.value)}
          placeholder={t('destek.yaziIpucu')}
          enterKeyHint="send"
          maxLength={1000}
        />
        <button
          className="composer__send"
          type="submit"
          disabled={yazi.trim().length < 3}
          aria-label={t('destek.gonder')}
        >
          <IconSend size={21} />
        </button>
      </form>

      {bekliyor && <span className="sr-only" aria-live="polite">{t('destek.bakiyor')}</span>}

      <TabBar />
    </div>
  )
}

/* ============================================================== Baloncuk

   Cevaptaki [1] işareti rozete çevriliyor; aynı rozet kaynak listesinde
   de var. Cevap akarken kaynak listesi gösterilmiyor: cevap bitmeden
   hangi sayfanın kullanıldığı belli değil. */

function isaretli(metin) {
  return String(metin)
    .split(/(\[\d+\])/g)
    .map((parca, i) => {
      const m = parca.match(/^\[(\d+)\]$/)
      return m ? (
        <sup key={i} className="dst-ref">
          {m[1]}
        </sup>
      ) : (
        parca
      )
    })
}

function Balon({ mesaj, t, makine, children }) {
  const bot = mesaj.kim === 'bot'
  const bitti = bot && !mesaj.akiyor
  /* YALNIZ KULLANILAN KAYNAK. Modele beş alıntı gidiyor, cevap çoğu zaman
     birini kullanıyor. Hepsi listelenseydi çiftçi cevabı olmayan
     sayfaları da açardı. Cevapta [n] varsa yalnız anılanlar gösteriliyor;
     hiç yoksa (ya da numaralar listede yoksa) hepsi. Numaralar değişmiyor:
     cevaptaki [3] listede de 3. */
  const anilan = new Set([...String(mesaj.metin || '').matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
  const anilanKaynaklar = (mesaj.kaynaklar || []).filter((k) => anilan.has(k.no))
  const kaynakListesi = anilanKaynaklar.length ? anilanKaynaklar : mesaj.kaynaklar || []
  const kaynakli =
    bitti &&
    (mesaj.durum === 'cevaplandi' || mesaj.durum === 'llm_yok') &&
    kaynakListesi.length > 0
  const genis = bot && (kaynakli || mesaj.alintilar?.length > 0 || Boolean(children))

  const DURUM = {
    makine_gerekli: t('destek.makineGerekli'),
    kilavuz_yok: t('destek.kilavuzYok', { makine: makine || '' }),
    model_farkli: t('destek.modelFarkli'),
    bulunamadi: t('destek.bulunamadi'),
    llm_yok: t('destek.llmYok'),
    hazir_degil: t('destek.hazirDegil'),
    baglanti: t('destek.baglantiYok'),
    hata: t('destek.hata'),
    /* Sohbet: sunucu selamı, teşekkürü, vedayı, "sen kimsin" sorusunu ve
       makineyle ilgisi olmayan soruları kılavuza ve modele göndermeden
       ayırıyor (sohbet sunucusunda niyet.mjs). Cevap burada, sözlükte. */
    selam: t('destek.sohbetSelam'),
    tesekkur: t('destek.sohbetTesekkur'),
    veda: t('destek.sohbetVeda'),
    kimlik: t('destek.sohbetKimlik'),
    konu_disi: t('destek.konuDisi'),
  }
  /* Model "cevaplandı" deyip hiçbir şey yazmadıysa boş baloncuk kalmasın. */
  const durumYazisi = !bitti
    ? null
    : mesaj.durum === 'cevaplandi' && !mesaj.metin
      ? t('destek.bulunamadi')
      : DURUM[mesaj.durum] || null

  return (
    <div className={'msg-row msg-row--' + (bot ? 'bot' : 'me') + (genis ? ' msg-row--genis' : '')}>
      {bot && !genis && (
        <span className="msg-ava">
          <Amblem size={22} />
        </span>
      )}

      <div className={'msg msg--' + (bot ? 'bot' : 'me')}>
        {bot && mesaj.guvenlik && (mesaj.metin || mesaj.alintilar?.length > 0) && (
          <div className="uyari-kart dst-uyari">
            <IconAlert size={16} />
            <span>{t('destek.guvenlikUyari')}</span>
          </div>
        )}

        {/* İLK KELİMEYE KADAR NE OLDUĞU YAZIYOR. Asistan işlemcide
            çalışıyor; bulunan bölümü okuyup ilk kelimeyi yazması yarım
            dakikayı bulabiliyor, bir süre kullanılmadıysa üstüne yeniden
            hazırlanması ekleniyor. Tek bir "bakıyorum" yazısı o sürede
            takılmış gibi görünürdü. Aşamayı sunucu `durum` olayıyla
            bildiriyor (bkz. lib/destekAsistani.js). */}
        {bot && mesaj.akiyor && !mesaj.metin && (
          <div className="dst-bakiyor">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
            <span>
              {mesaj.asama === 'model_yukleniyor'
                ? t('destek.hazirlaniyor')
                : mesaj.asama === 'yaziyor'
                  ? t('destek.yaziyor')
                  : t('destek.bakiyor')}
            </span>
          </div>
        )}

        {mesaj.metin && <div>{bot ? isaretli(mesaj.metin) : mesaj.metin}</div>}

        {durumYazisi && <div className={mesaj.metin ? 'dst-durum' : undefined}>{durumYazisi}</div>}

        {children}

        {mesaj.alintilar?.map((a) => (
          <blockquote key={a.no} className="dst-alinti">
            <sup className="dst-ref">{a.no}</sup> {a.metin}
          </blockquote>
        ))}

        {kaynakli && (
          <div className="dst-parcalar">
            <div className="dst-parcalar__bas">{t('destek.kaynak')}</div>
            <div className="dst-parcalar__liste">
              {kaynakListesi.map((k) => (
                <a
                  key={k.no}
                  className="dst-parca dst-kaynak"
                  href={kilavuzAdresi(k.belge, k.sayfa)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="dst-ref">{k.no}</span> {kilavuzAdi(k.kilavuz)} ·{' '}
                  {t('destek.sayfa', { n: k.sayfa })}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ========================================================= Makine listesi */
function MakineListesi({ benim, digerleri, onSec, t }) {
  const [modellerAcik, setModellerAcik] = useState(benim.length === 0)
  return (
    <div className="dst-makineler">
      {benim.length > 0 && (
        <>
          <div className="eyebrow">{t('destek.benimMakinelerim')}</div>
          {benim.map((m) => (
            <Satir key={m.anahtar} m={m} onSec={onSec} />
          ))}
          <button type="button" className="chip" aria-expanded={modellerAcik}
            onClick={() => setModellerAcik((acik) => !acik)}>
            {t(modellerAcik ? 'destek.modelleriGizle' : 'destek.baskaModel')}
          </button>
        </>
      )}
      {modellerAcik && (
        <>
          <div className="eyebrow">{t('destek.digerModeller')}</div>
          {digerleri.map((m) => <Satir key={m.anahtar} m={m} onSec={onSec} />)}
        </>
      )}
    </div>
  )
}

function Satir({ m, onSec }) {
  return (
    <button
      type="button"
      className="listitem dst-makine"
      onClick={() => onSec(m)}
    >
      <IconMachine size={18} />
      <div className="listitem__body">
        <div className="listitem__title" style={{ fontSize: 14.5 }}>{m.ad}</div>
        {m.alt && <div className="listitem__sub">{m.alt}</div>}
      </div>
      <span className="listitem__chev"><IconRight size={19} /></span>
    </button>
  )
}
