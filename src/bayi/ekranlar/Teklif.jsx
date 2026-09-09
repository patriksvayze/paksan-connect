import { useMemo, useState } from 'react'
import { PRODUCTS, getProduct, UYGULAMA } from '../../marka'
import { ILLER, ilceleriGetir } from '../../data/iller'
import { PARA_BIRIMI, paraYaz } from '../../marka'
import { makineFiyati } from '../../lib/bayiFiyat'
import { bayileriGetir } from '../../marka'
import {
  HATIRLATMA_GUN,
  TEKLIF_GUN,
  TEKLIF_SONUC,
  kalanGun,
  smsAdedi,
  suresiDoldu,
  teklifAc,
  teklifGonderildi,
  teklifKapat,
  teklifKari,
  teklifSms,
  teklifToplami,
} from '../../lib/bayiTeklif'
import { islemYaz, musteriyeBildir, musterileriGetir } from '../../backoffice/veri'
import { telAnahtar, telRakam } from '../../lib/tel'
import { Bolum, ListeKarti, Sayfa } from '../Kabuk'
import { UrunFoto } from '../../components/Gorsel'
import {
  IconCheckCircle,
  IconPhone,
  IconPlus,
  IconSend,
  IconTrash,
} from '../../components/Icons'

/* ==========================================================================
   Bayi paneli — fiyat teklifi

   Bayinin her gün yaptığı iş: gelen çiftçiye fiyat vermek. Bugüne
   kadar bu iş uygulamanın dışındaydı — kâğıda yazılıyor, WhatsApp'tan
   gönderiliyor, sonra kayboluyordu. Gerekçesi `lib/bayiTeklif.js`
   başında yazılı.

   FİYAT KİLİTLİ DEĞİL

   Ekran liste fiyatını öneriyor; bayi üzerine yazabiliyor. Yazdığı anda
   altında kendi kârı güncelleniyor. Pazarlık sırasında bayinin
   ihtiyaç duyduğu tek sayı bu — ne kadar inebileceğini oradan görüyor.

   MÜŞTERİ ÖNCE TELEFON NUMARASIYLA ARANIYOR

   Yeni Kayıt ekranındaki kalıbın aynısı: numara girilince kayıtlı
   müşteri bulunuyor, adı ve yeri kendiliğinden doluyor. Bulunamazsa
   bayi elle yazıyor; teklif için uygulama hesabı şart değil.

   GÖNDERİM SMS İLE

   Sunucu yok, API anahtarı uygulamaya konmuyor: `sms:` bağlantısı
   telefonun kendi mesaj uygulamasını hazır metinle açıyor, göndermeye
   bayi karar veriyor.

   KAYITLI MÜŞTERİ İLE KAYITSIZIN FARKI

   Kayıtlı müşteriye SMS'in yanında bir de uygulama bildirimi gidiyor:
   SMS kutusunda kaybolsa bile teklif uygulamasında duruyor. Kayıtsız
   müşteriye yalnız SMS gidiyor. Ekran hangisinin geçerli olduğunu
   göndermeden önce yazıyor — bayi ne olacağını biliyor.
   ========================================================================== */

const rakamlar = (v) => String(v || '').replace(/\D/g, '').slice(-10)

/* --------------------------------------------------------- Teklif hazırla */

/* `talep` verilirse ekran müşterinin kendi fiyat sorusundan açılıyor:
   adı, telefonu, yeri ve sorduğu ürün oradan geliyor. Bayi aynı
   bilgileri elle yeniden girmiyor — talep zaten önünde duruyordu. */
export function TeklifYap({ oturum, urun: ilkUrun, talep, onKapat, onKaydedildi }) {
  const [tel, setTel] = useState(talep?.tel || '')
  const [ad, setAd] = useState(talep?.ad || '')
  const [adElle, setAdElle] = useState(Boolean(talep?.ad))
  const [il, setIl] = useState(talep?.il || oturum.il || '')
  const [ilce, setIlce] = useState(talep?.ilce || '')
  const [gun, setGun] = useState(String(TEKLIF_GUN))
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')

  /* Satırlar: { urunId, adet, birimFiyat } — fiyat metin olarak
     tutuluyor, bayi silip yeniden yazarken kutunun boşalması gerekiyor. */
  const [satirlar, setSatirlar] = useState(() => {
    const baslangic = ilkUrun?.id || talep?.urunId
    return baslangic && getProduct(baslangic)
      ? [yeniSatir(baslangic, oturum)]
      : []
  })

  const musteriler = useMemo(() => musterileriGetir(), [])
  const eslesen = useMemo(() => {
    const n = rakamlar(tel)
    if (n.length < 10) return null
    return musteriler.find((m) => rakamlar(m.tel) === n) || null
  }, [tel, musteriler])

  const ilceler = useMemo(() => (il ? ilceleriGetir(il) : []), [il])

  const kalemler = useMemo(
    () =>
      satirlar
        .map((s) => {
          const u = getProduct(s.urunId)
          const f = makineFiyati(s.urunId, oturum)
          if (!u) return null
          return {
            urunId: s.urunId,
            ad: u.name,
            adet: Number(s.adet) || 0,
            birimFiyat: Number(s.birimFiyat) || 0,
            listeFiyat: f?.liste ?? 0,
            alisFiyat: f?.alis ?? 0,
          }
        })
        .filter(Boolean),
    [satirlar, oturum],
  )

  const hesap = teklifToplami(kalemler)
  const kar = teklifKari(kalemler)

  function telYaz(v) {
    setTel(v)
    setHata('')
    const n = rakamlar(v)
    const m = n.length === 10 ? musteriler.find((x) => rakamlar(x.tel) === n) : null
    if (!m) {
      if (!adElle) setAd('')
      return
    }
    if (!adElle) setAd(m.ad || '')
    if (m.il) setIl(m.il)
    if (m.ilce) setIlce(m.ilce)
  }

  function satirGuncelle(i, alan, deger) {
    setSatirlar((liste) =>
      liste.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)),
    )
    setHata('')
  }

  function urunDegistir(i, urunId) {
    setSatirlar((liste) =>
      liste.map((s, j) => (j === i ? yeniSatir(urunId, oturum, s.adet) : s)),
    )
  }

  function kaydet() {
    if (!kalemler.length) return setHata('En az bir ürün ekleyin.')
    if (kalemler.some((k) => k.adet < 1)) return setHata('Adet en az 1 olmalı.')
    if (kalemler.some((k) => k.birimFiyat <= 0)) {
      return setHata('Her ürün için birim fiyat yazın.')
    }
    if (ad.trim().length < 3) return setHata('Müşterinin adını yazın.')

    const sonuc = teklifAc({
      bayiId: oturum.bayiId,
      bayiAd: oturum.ad,
      bayiNo: oturum.no,
      musteriId: eslesen?.id || null,
      ad,
      tel,
      il,
      ilce,
      kalemler,
      not,
      gecerlilikGun: Number(gun) || TEKLIF_GUN,
    })
    if (sonuc.hata) return setHata(sonuc.hata)

    islemYaz({
      tur: 'teklif',
      ozet: `${sonuc.teklif.no} · ${ad.trim()} · ${paraYaz(hesap.toplam)} ${PARA_BIRIMI}`,
      personel: oturum.ad,
    })
    onKaydedildi(sonuc.teklif)
  }

  return (
    <Sayfa
      baslik="Fiyat Teklifi"
      alt="Müşterinize verdiğiniz fiyatı kaydedin"
      onGeri={onKapat}
      dip={
        <button className="dg dg--ana dg--blok" onClick={kaydet}>
          Teklifi Oluştur
        </button>
      }
    >
      <Bolum ad="Müşteri">
        <label className="alan">
          <span className="alan__ad">Telefon</span>
          <input
            className="gir mono"
            inputMode="tel"
            value={tel}
            onChange={(e) => telYaz(e.target.value)}
            placeholder="0532 000 00 00"
          />
        </label>

        {/* Eşleşme yalnız "bulundu" demiyor, ne işe yaradığını da
            söylüyor: kayıtlı müşteriye SMS'in yanında uygulama
            bildirimi de gidiyor. */}
        {eslesen && (
          <p className="kucuk" style={{ color: 'var(--yesil)', marginTop: -4 }}>
            {UYGULAMA} hesabı bulundu; uygulamaya da bildirim gidecek.
          </p>
        )}

        <label className="alan">
          <span className="alan__ad">Müşterinin Adı</span>
          <input
            className="gir"
            value={ad}
            onChange={(e) => {
              setAd(e.target.value)
              setAdElle(true)
            }}
            placeholder="Ad soyad"
          />
        </label>

        <div className="ikili">
          <label className="alan">
            <span className="alan__ad">İl</span>
            <select
              className="gir"
              value={il}
              onChange={(e) => {
                setIl(e.target.value)
                setIlce('')
              }}
            >
              <option value="">Seçin</option>
              {ILLER.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          <label className="alan">
            <span className="alan__ad">İlçe</span>
            <select
              className="gir"
              value={ilce}
              onChange={(e) => setIlce(e.target.value)}
              disabled={!il}
            >
              <option value="">Seçin</option>
              {ilceler.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Bolum>

      <Bolum ad="Ürünler" sayi={satirlar.length}>
        {satirlar.map((s, i) => (
          <TeklifSatiri
            key={i}
            satir={s}
            oturum={oturum}
            onUrun={(v) => urunDegistir(i, v)}
            onAdet={(v) => satirGuncelle(i, 'adet', v)}
            onFiyat={(v) => satirGuncelle(i, 'birimFiyat', v)}
            onSil={() =>
              setSatirlar((liste) => liste.filter((_, j) => j !== i))
            }
          />
        ))}

        <button
          className="dg dg--blok"
          onClick={() =>
            setSatirlar((liste) => [...liste, yeniSatir(PRODUCTS[0].id, oturum)])
          }
        >
          <IconPlus size={19} /> Ürün Ekle
        </button>
      </Bolum>

      {kalemler.length > 0 && (
        <div className="fiyat-kart">
          <div className="urun-kart__satir">
            <span>Ara Toplam</span>
            <strong>
              {paraYaz(hesap.araToplam)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__satir">
            <span>KDV</span>
            <strong>
              {paraYaz(hesap.kdv)} {PARA_BIRIMI}
            </strong>
          </div>
          <div className="urun-kart__satir urun-kart__satir--vurgu">
          <span>Genel Toplam</span>
            <strong>
              {paraYaz(hesap.toplam)} {PARA_BIRIMI}
            </strong>
          </div>
          {/* Kâr müşteriye giden metinde yok; burada var. */}
          <div
            className={
              'urun-kart__satir ' +
              (kar >= 0 ? 'urun-kart__satir--yesil' : 'urun-kart__satir--kirmizi')
            }
          >
            <span>Kârınız</span>
            <strong>
              {paraYaz(kar)} {PARA_BIRIMI}
            </strong>
          </div>
          {kar < 0 && (
            <div className="urun-kart__dip">
              Verdiğiniz fiyat alış fiyatınızın altında.
            </div>
          )}
        </div>
      )}

      <Bolum ad="Geçerlilik">
        <label className="alan">
          <span className="alan__ad">Geçerlilik (gün)</span>
          <input
            className="gir mono"
            inputMode="numeric"
            value={gun}
            onChange={(e) => setGun(e.target.value.replace(/\D/g, '').slice(0, 3))}
            style={{ maxWidth: 120 }}
          />
        </label>
      </Bolum>

      <Bolum ad="Not">
        <label className="alan">
          <textarea
            className="gir"
            rows={3}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Teklife eklemek istediğiniz açıklama"
          />
        </label>
      </Bolum>

      {hata && <div className="uyari">{hata}</div>}
    </Sayfa>
  )
}

function yeniSatir(urunId, oturum, adet = '1') {
  const f = makineFiyati(urunId, oturum)
  return { urunId, adet, birimFiyat: String(f?.liste ?? '') }
}

/* Satırda üç kutu var: ürün, adet, birim fiyat. Fiyatın altında liste
   fiyatı ve o satırın kârı yazıyor — bayi indirim yaparken ne
   verdiğini görüyor. */
function TeklifSatiri({ satir, oturum, onUrun, onAdet, onFiyat, onSil }) {
  const f = makineFiyati(satir.urunId, oturum)
  const adet = Number(satir.adet) || 0
  const fiyat = Number(satir.birimFiyat) || 0
  const satirKar = f ? (fiyat - f.alis) * adet : 0
  const indirim = f && fiyat > 0 ? f.liste - fiyat : 0

  return (
    <div className="teklif-satir">
      <div className="teklif-satir__ust">
        <UrunFoto
          urunId={satir.urunId}
          ad=""
          tip="thumb"
          ikonBoyut={24}
          style={{ width: 62, height: 42 }}
        />
        <select
          className="gir"
          value={satir.urunId}
          onChange={(e) => onUrun(e.target.value)}
          aria-label="Ürün"
        >
          {PRODUCTS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button className="ozet-kalem__sil" onClick={onSil} aria-label="Satırı Kaldır">
          <IconTrash size={18} />
        </button>
      </div>

      <div className="teklif-satir__alt">
        <label className="alan">
          <span className="alan__ad">Adet</span>
          <input
            className="gir mono"
            inputMode="numeric"
            value={satir.adet}
            onChange={(e) => onAdet(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <label className="alan">
          <span className="alan__ad">Birim Fiyat</span>
          <input
            className="gir mono"
            inputMode="numeric"
            value={satir.birimFiyat}
            onChange={(e) => onFiyat(e.target.value.replace(/\D/g, ''))}
          />
        </label>
      </div>

      {f && (
        <div className="teklif-satir__bilgi">
          Liste {paraYaz(f.liste)} · Alış {paraYaz(f.alis)}
          {indirim > 0 && ` · İndirim ${paraYaz(indirim)}`}
          {' · '}
          <strong className={satirKar < 0 ? 'zarar' : 'kazanc'}>
            Kâr {paraYaz(satirKar)}
          </strong>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------- Teklif detayı */

export function TeklifDetay({ teklif, oturum, onKapat, onDegisti }) {
  const [kapanis, setKapanis] = useState(false)
  const [sonuc, setSonuc] = useState('')
  const [not, setNot] = useState('')
  const [hata, setHata] = useState('')
  const [gonderim, setGonderim] = useState(teklif.gonderim || null)

  const bayi = useMemo(
    () => bayileriGetir().find((b) => b.id === teklif.bayiId) || null,
    [teklif.bayiId],
  )

  const metin = teklifSms(teklif, bayi)
  const telefon = telRakam(teklif.tel)
  /* `sms:` bağlantısı çevrilebilir numara istiyor. Kayıtta numara
     baştaki sıfırsız durabiliyor (533 830 96 36); ham rakamlar
     yazıldığında telefon numarayı tanımıyordu. `telAnahtar` sıfırı
     atıp ülke kodunu ekliyor, başına da "+" konuyor. */
  const smsNumara = teklif.tel ? '+' + telAnahtar('TR', teklif.tel) : ''
  const kalan = kalanGun(teklif)
  const acik = teklif.durum === 'acik'
  const kayitli = Boolean(teklif.musteriId)

  /* Gönder düğmesi iki iş yapıyor: mesaj uygulamasını açıyor ve
     gönderimi kaydediyor. Bağlantının kendisi engellenmiyor — `onClick`
     çalışıyor, ardından `href` telefonun mesaj uygulamasını açıyor. */
  function gonder() {
    const kanallar = ['sms']

    if (kayitli) {
      kanallar.push('uygulama')
      musteriyeBildir({
        tur: 'talep',
        musteriId: teklif.musteriId,
        baslikAnahtar: 'bildirimler.bayiTeklifBaslik',
        metinAnahtar: 'bildirimler.bayiTeklifMetin',
        degerler: {
          bayi: teklif.bayiAd,
          tutar: `${paraYaz(teklif.toplam)} ${PARA_BIRIMI}`,
          gecerlilik: new Date(teklif.gecerlilik).toLocaleDateString('tr-TR'),
        },
      })
    }

    teklifGonderildi(teklif.id, kanallar)
    setGonderim({ tarih: Date.now(), kanallar })
    islemYaz({
      tur: 'teklif',
      ozet: `${teklif.no} · müşteriye gönderildi`,
      personel: oturum.ad,
    })
  }

  function kapat() {
    const r = teklifKapat(teklif.id, sonuc, oturum.ad, not)
    if (r.hata) return setHata(r.hata)
    islemYaz({
      tur: 'teklif',
      ozet: `${teklif.no} · ${TEKLIF_SONUC[sonuc].ad}`,
      personel: oturum.ad,
    })
    onDegisti()
  }

  return (
    <Sayfa
      baslik={teklif.ad}
      alt={teklif.no}
      onGeri={onKapat}
      dip={
        acik && (
          <a
            className="dg dg--ana dg--blok"
            href={`sms:${smsNumara}?body=${encodeURIComponent(metin)}`}
            onClick={gonder}
          >
            <IconSend size={19} />
            {gonderim ? 'Yeniden Gönder' : 'SMS ile Gönder'}
          </a>
        )
      }
    >
      <div className="fiyat-kart">
        {teklif.kalemler.map((k, i) => (
          <div key={i} className="ozet-kalem">
            <div className="ozet-kalem__ad">
              <div>{k.ad}</div>
              <div className="kucuk sonuk">
                {k.adet} × {paraYaz(k.birimFiyat)} {PARA_BIRIMI}
              </div>
            </div>
            <div className="ozet-kalem__tutar">
              {paraYaz(k.birimFiyat * k.adet)}
            </div>
          </div>
        ))}

        <div className="urun-kart__satir" style={{ marginTop: 8 }}>
          <span>Ara Toplam</span>
          <strong>
            {paraYaz(teklif.araToplam)} {PARA_BIRIMI}
          </strong>
        </div>
        <div className="urun-kart__satir">
          <span>KDV</span>
          <strong>
            {paraYaz(teklif.kdv)} {PARA_BIRIMI}
          </strong>
        </div>
        <div className="urun-kart__satir urun-kart__satir--vurgu">
          <span>Genel Toplam</span>
          <strong>
            {paraYaz(teklif.toplam)} {PARA_BIRIMI}
          </strong>
        </div>
        <div className="urun-kart__satir urun-kart__satir--yesil">
          <span>Kârınız</span>
          <strong>
            {paraYaz(teklif.kar)} {PARA_BIRIMI}
          </strong>
        </div>
      </div>

      <Bolum ad="Durum">
        <div className="kart" style={{ padding: 14 }}>
          {acik ? (
            <div className={'not ' + (kalan < 0 ? 'not--turuncu' : 'not--mavi')}>
              <IconCheckCircle size={19} />
              <div>
                <strong>
                  {kalan < 0
                    ? 'Süresi doldu'
                    : kalan === 0
                      ? 'Bugün son gün'
                      : `${kalan} gün kaldı`}
                </strong>
                <p>
                  Geçerlilik tarihi:{' '}
                  {new Date(teklif.gecerlilik).toLocaleDateString('tr-TR')}.
                </p>
              </div>
            </div>
          ) : (
            <div className="not not--yesil">
              <IconCheckCircle size={19} />
              <div>
                <strong>{TEKLIF_SONUC[teklif.durum]?.ad}</strong>
                {teklif.kapanis?.not && <p>{teklif.kapanis.not}</p>}
              </div>
            </div>
          )}
        </div>
      </Bolum>

      {acik && (
        <Bolum ad="Gönderim">
          <div className="kart" style={{ padding: 14 }}>
            {gonderim ? (
              <div className="not not--yesil">
                <IconCheckCircle size={19} />
                <div>
                  <strong>Gönderildi</strong>
                  <p>
                    {new Date(gonderim.tarih).toLocaleDateString('tr-TR')} ·{' '}
                    {gonderim.kanallar.includes('uygulama')
                      ? 'SMS ve uygulama bildirimi'
                      : 'SMS'}
                  </p>
                </div>
              </div>
            ) : (
              <div className={'not ' + (kayitli ? 'not--yesil' : 'not--mavi')}>
                <IconSend size={19} />
                <div>
                  <strong>
                    {kayitli
                      ? `Müşterinin ${UYGULAMA} hesabı var`
                      : `Müşterinin ${UYGULAMA} hesabı yok`}
                  </strong>
                  <p>
                    {kayitli
                      ? 'Teklif SMS ile gönderilecek; uygulamaya da bildirim gidecek.'
                      : 'Teklif yalnız SMS ile gönderilecek.'}
                  </p>
                </div>
              </div>
            )}

            {/* Bayi göndermeden önce müşterinin ne okuyacağını görüyor.
                SMS adedi de burada: ücretini bayi ödüyor. */}
            <div className="sms">
              <div className="sms__ust">
                <span>SMS Önizlemesi</span>
                <span className="sms__adet">{smsAdedi(metin)} SMS</span>
              </div>
              <div className="sms__metin">{metin}</div>
            </div>
          </div>
        </Bolum>
      )}

      {telefon && (
        <Bolum ad="Müşteri">
          <a className="dg dg--blok" href={'tel:' + telefon}>
            <IconPhone size={19} /> {teklif.tel}
          </a>
        </Bolum>
      )}

      {acik && (
        <Bolum ad="Sonuç">
          {!kapanis ? (
            <button className="dg dg--blok" onClick={() => setKapanis(true)}>
              Teklifi Sonuçlandır
            </button>
          ) : (
            <div className="kart" style={{ padding: 16 }}>
              {/* Üç sonuç da kaydediliyor: PAKSAN'ın öğrenmek istediği
                  şey satılanlar kadar satılamayanlar. */}
              <div className="secenek">
                {Object.entries(TEKLIF_SONUC).map(([id, s]) => (
                  <button
                    key={id}
                    className={
                      'makine-sec' + (sonuc === id ? ' makine-sec--on' : '')
                    }
                    onClick={() => setSonuc(id)}
                  >
                    {s.ad}
                  </button>
                ))}
              </div>

              <label className="alan" style={{ marginTop: 12 }}>
                <span className="alan__ad">Not</span>
                <textarea
                  className="gir"
                  rows={2}
                  value={not}
                  onChange={(e) => setNot(e.target.value)}
                  placeholder="Sebebi ya da eklemek istediğiniz bilgi"
                />
              </label>

              {hata && <div className="uyari">{hata}</div>}

              <button
                className="dg dg--ana dg--blok"
                onClick={kapat}
                disabled={!sonuc}
              >
                Kaydet
              </button>
              <button
                className="dg dg--blok"
                style={{ marginTop: 8 }}
                onClick={() => setKapanis(false)}
              >
                Vazgeç
              </button>
            </div>
          )}
        </Bolum>
      )}
    </Sayfa>
  )
}

/* --------------------------------------------------------------- Liste kartı

   İş kartıyla AYNI İSKELET (bkz. BayiPanel.jsx `ListeKarti`). İkisi
   İşlerim'de art arda duruyor; ayrı düzenlerde çizilince liste
   dağılıyordu.

   Üç satırın teklife düşen karşılığı:

     1. Müşterinin adı — sağda "Teklif" rozeti
     2. Teklif numarası ve ürünler
     3. Solda TUTAR, sağda kalan gün

   Tutar üçüncü satırın soluna, kalan gün sağına geçti. Önce tutar
   ortada tek başına duruyordu, kalan gün ise kartın en altında 11
   piksellik kırmızı yazıydı: teklifte bayiyi ilgilendiren iki sayıdan
   biri en görünür, öbürü en görünmez yerdeydi.

   Oluşturma tarihi kaldırıldı — hiçbir soruya cevap vermiyordu. Bayinin
   sorduğu "kaç günüm kaldı", tarih değil.                              */

export function TeklifKarti({ teklif, onAc }) {
  const kalan = kalanGun(teklif)
  const gecti = suresiDoldu(teklif)
  const acik = teklif.durum === 'acik'

  const sure =
    kalan < 0 ? 'Süresi doldu' : kalan === 0 ? 'Bugün son gün' : `${kalan} gün kaldı`

  return (
    <ListeKarti
      ad={teklif.ad}
      tur="satinalma"
      turAdi="Teklif"
      kunye={
        <>
          <span className="mono">{teklif.no}</span> ·{' '}
          {teklif.kalemler.map((k) => k.ad).join(', ')}
        </>
      }
      sol={
        <strong className="is__tutar">
          {paraYaz(teklif.toplam)} {PARA_BIRIMI}
        </strong>
      }
      sag={acik ? sure : TEKLIF_SONUC[teklif.durum]?.ad}
      sagGec={acik && kalan <= HATIRLATMA_GUN}
      gec={gecti}
      onAc={onAc}
    />
  )
}
