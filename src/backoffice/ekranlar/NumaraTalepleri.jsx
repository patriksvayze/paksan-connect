import { useState } from 'react'
import {
  eskiHesapBilgisi, hesapBirlesmeOzeti, numaraDogruMu, numaraTalebiKarar,
  numaraTalepleriGetir, seriCakismasiMi, seriDogruMu,
} from '../veri'
import { useVeri } from '../kanca'
import { Baslik, BeklemeKart, Bos, tarihYaz } from './ortak'
import { formatSerial } from '../../lib/serial'

/* Numara değişikliği talepleri.

   Giriş numarası hesabın kimliği; müşteri kendi başına değiştiremiyor.
   Telefonu eline geçiren biri numarayı değiştirebilseydi hesabı
   devralırdı.

   Kimlik doğrulaması makinenin seri numarasıyla yapılıyor — seri
   numarasını yalnız makinenin başındaki kişi bilir. Backoffice iki kontrolü
   kendisi yapıyor:

       · talepteki eski numara hesaptaki numarayla aynı mı,
       · girilen seri no müşterinin kayıtlı makinelerinden biri mi.

   İkisi de tutuyorsa onay güvenli. Tutmuyorsa onaylamadan önce müşteri
   aranmalı.

   SERİ ÇAKIŞMASI (17 Eylül 2026). Müşteri makine eklerken seri başka
   bir hesapta çıktı ve "numaram değişti" dedi. Bu talepte yön ters:
   talebi açan hesap yeni numarayla açılmış, müşteri eski numarasını
   yazmış. Kontroller de eski hesaba bakıyor; onay numarayı değil,
   eski hesabın kayıtlarını bu hesaba geçiriyor (bkz. veri.js →
   hesaplariBirlestir). Kart bu yüzden ayrı rozetle ve neyin
   taşınacağını söyleyerek çıkıyor.                                     */

export function NumaraTalepleri({ personel, bildir, tazele, surum }) {
  const [acik, setAcik] = useState('bekleyen')

  const { veri: liste, yukleniyor } = useVeri(() => numaraTalepleriGetir(), [surum], [])

  const gosterilen = liste.filter((t) =>
    acik === 'bekleyen' ? t.durum === 'bekliyor' : true
  )

  return (
    <>
      <Baslik
        ad="Numara değişikliği ve hesap birleştirme talepleri"
        sag={
          <div className="suzgec">
            <button
              className={'cip' + (acik === 'bekleyen' ? ' cip--on' : '')}
              onClick={() => setAcik('bekleyen')}
            >
              Bekleyen
            </button>
            <button
              className={'cip' + (acik === 'hepsi' ? ' cip--on' : '')}
              onClick={() => setAcik('hepsi')}
            >
              Hepsi
            </button>
          </div>
        }
      />

      {yukleniyor ? (
        <BeklemeKart satir={3} />
      ) : gosterilen.length === 0 ? (
        <div className="kart">
          <Bos metin="Bu görünümde talep yok. Diğer talepleri görmek için Hepsi düğmesini kullanın; yeni talepleri bu ekrandan takip edin." />
        </div>
      ) : (
        gosterilen.map((t) => (
          <Kart
            key={t.id}
            talep={t}
            personel={personel}
            bildir={bildir}
            tazele={tazele}
          />
        ))
      )}
    </>
  )
}

function Kart({ talep, personel, bildir, tazele }) {
  const [not, setNot] = useState('')
  const bekliyor = talep.durum === 'bekliyor'
  const onaylandi = talep.durum === 'onaylandi'

  const cakisma = seriCakismasiMi(talep)
  const eskiHesap = cakisma ? eskiHesapBilgisi(talep) : null
  /* Taşınacakların sayısı yalnız bekleyen talepte anlamlı; kapanmış
     talepte kayıtlar zaten taşındı. */
  const ozet = cakisma && bekliyor ? hesapBirlesmeOzeti(talep) : null

  const seriTamam = seriDogruMu(talep)
  const numaraTamam = numaraDogruMu(talep)
  const guvenli = seriTamam && numaraTamam

  function karar(onay) {
    const soru = cakisma
      ? 'Eski numara ve seri numarası kontrollerinden en az biri doğrulanamadı. Onay verirseniz eski hesabın makineleri, makine kayıtları ve talepleri yeni hesaba taşınacak. Yanlış onay, başka birinin hesabının devralınmasına yol açabilir. Müşteriyi arayıp iki hesabın da kendisine ait olduğunu doğrulamadan onay vermeyin. Kayıtlar yeni hesaba taşınsın mı?'
      : 'Eski numara ve seri numarası kontrollerinden en az biri doğrulanamadı. Onay verirseniz hesabın giriş numarası değişecek. Yanlış onay, başka birinin hesaba erişmesine yol açabilir. Müşteriyi arayıp bilgilerini doğrulamadan onay vermeyin. Hesabın numarası değiştirilsin mi?'
    if (onay && !guvenli && !confirm(soru)) {
      return
    }
    numaraTalebiKarar(talep, onay, personel, not.trim())
    setNot('')
    tazele()
    /* Taşınacak kayıt yoksa (kayıtlar daha önceki bir onayda taşınmış
       olabilir) veri.js hiçbir depoyu yazmıyor; bildirim de taşıma
       olmuş gibi konuşmuyor. */
    const bosBirlesme = Boolean(ozet) && !ozet.makine && !ozet.defter && !ozet.talep
    bildir(
      !onay
        ? 'Talep reddedildi. Müşteriye bildirim gönderildi.'
        : cakisma
          ? bosBirlesme
            ? 'Talep onaylandı. Eski hesapta taşınacak kayıt bulunamadı.'
            : 'Eski hesaptaki taşınabilir kayıtlar yeni hesaba taşındı. Müşteriye bildirim gönderildi.'
          : 'Hesabın giriş numarası değiştirildi. Müşteriye bildirim gönderildi.'
    )
  }

  return (
    <div className="kart" style={{ marginBottom: 14 }}>
      <div className="kart__tepe">
        <div>
          <div style={{ fontWeight: 700 }}>{talep.ad || '—'}</div>
          <div className="kucuk sonuk">{tarihYaz(talep.tarih)}</div>
        </div>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {cakisma && <span className="rz rz--mor">Seri numarası başka hesapta</span>}
          <span className={'rz rz--' + DURUM_TON[talep.durum]}>{DURUM_ADI[talep.durum]}</span>
        </span>
      </div>

      <div className="kart__ic">
        {cakisma && (
          <p
            className="kucuk"
            style={{
              margin: '0 0 14px',
              padding: '11px 14px',
              borderRadius: 'var(--r)',
              background: 'var(--mavi-z)',
              lineHeight: 1.55,
            }}
          >
            Bu makine başka bir hesapta kayıtlı. Müşteri, numarasının değiştiğini belirterek
            eski hesabındaki kayıtların yeni numarasıyla açtığı hesaba taşınmasını istiyor.
          </p>
        )}

        <div className="esit">
          <div>
            <div className="alan__ad">
              {cakisma ? 'Kaydetmek istediği makinenin seri numarası' : 'Müşterinin yazdığı seri numarası'}
            </div>
            <div className="mono">{formatSerial(talep.seri) || '—'}</div>
          </div>
          {cakisma ? (
            <div>
              <div className="alan__ad">Makinenin kayıtlı olduğu hesap</div>
              <div>
                <span className="mono">{eskiHesap.no || '—'}</span>
                {eskiHesap.ad ? ` · ${eskiHesap.ad}` : ''}
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>

        <div className="esit" style={{ marginTop: 12 }}>
          <div>
            <div className="alan__ad">
              {cakisma ? 'Müşterinin yazdığı eski numara' : 'Eski numara'}
            </div>
            <div className="mono">{talep.eskiTel || '—'}</div>
          </div>
          <div>
            <div className="alan__ad">
              {cakisma ? 'Talebi açan hesabın yeni numarası' : 'Yeni numara'}
            </div>
            <div className="mono" style={{ fontWeight: 700 }}>{talep.yeniTel || '—'}</div>
          </div>
        </div>

        {/* KONTROLLER ONAYDAN SONRA ÇİZİLMİYOR.

            İki kontrol de bugünün verisine bakıyor: seri hangi hesapta,
            numara hangi hesabın. Onay tam da bunları değiştiriyor —
            kayıtlar yeni hesaba geçiyor, numara yeni numara oluyor.
            Kapanmış kartta ✓/✗ çizmek, doğru verilmiş bir kararı
            sonradan bakan personele hatalı gösteriyordu. Reddedilen
            talepte hiçbir şey taşınmadığı için kontroller yerinde
            duruyor. */}
        {onaylandi ? (
          <div className="kucuk sonuk" style={{ margin: '14px 0 0', lineHeight: 1.55 }}>
            {cakisma
              ? 'Hesap birleştirme talebi onaylandı. Taşıma sonucunu İşlem Kaydı ekranından kontrol edin.'
              : 'Hesabın giriş numarası, talepteki yeni numarayla değiştirildi.'}
          </div>
        ) : (
          <div className="kontrol">
            {cakisma ? (
              <>
                <Kontrol
                  tamam={numaraTamam}
                  yazi="Müşterinin yazdığı eski numara, makinenin kayıtlı olduğu hesabın numarasıyla aynı mı?"
                />
                <Kontrol tamam={seriTamam} yazi="Seri numarası, eski hesaba kayıtlı makinelerden birine ait mi?" />
              </>
            ) : (
              <>
                <Kontrol tamam={numaraTamam} yazi="Eski numara, hesapta kayıtlı numarayla aynı mı?" />
                <Kontrol tamam={seriTamam} yazi="Seri numarası, müşterinin kayıtlı makinelerinden birine ait mi?" />
              </>
            )}
          </div>
        )}

        {bekliyor ? (
          <>
            {!guvenli && (
              <div className="uyari">
                {!cakisma
                  ? 'Kontrollerden en az biri eşleşmiyor. Onaylamadan önce müşteriyi arayıp eski numarasını ve makinenin seri numarasını doğrulayın. Yanlış onay, başka birinin hesaba erişmesine yol açabilir.'
                  : eskiHesap.bulundu
                    ? 'Kontrollerden en az biri eşleşmiyor. Müşteriyi arayıp eski numarasını, seri numarasını ve iki hesabın da kendisine ait olduğunu doğrulamadan onay vermeyin. Makineyi başkasından almış olması, eski hesaptaki tüm kayıtları devralabileceği anlamına gelmez. Yanlış onay, başka birinin hesabının devralınmasına yol açabilir.'
                    : 'Eski hesap bilgilerine bu tarayıcıdan ulaşılamıyor; telefon numarası karşılaştırılamadı. Müşteriyi arayıp eski numarasını, seri numarasını ve iki hesabın da kendisine ait olduğunu doğrulamadan onay vermeyin. Yanlış onay, başka birinin hesabının devralınmasına yol açabilir.'}
              </div>
            )}

            {ozet && (
              <p className="kucuk sonuk" style={{ margin: '0 0 12px', lineHeight: 1.55 }}>
                Onaylanınca eski hesaptan yeni hesaba taşınacak kayıtlar: {ozet.makine} makine, {ozet.defter} makine
                kaydı, {ozet.talep} talep.
                {ozet.eskiTelBilinmiyor &&
                  ' Eski hesabın numarası bilinmediği için eski numarayla açılmış talepler taşınamaz.'}
              </p>
            )}

            <label className="alan">
              <span className="alan__ad">İşlem notu (İşlem Kaydı ekranında görünür)</span>
              <input
                className="gir"
                value={not}
                onChange={(e) => setNot(e.target.value)}
          placeholder="Örnek: Müşteri arandı; eski numarası, seri numarası ve hesap sahipliği doğrulandı"
              />
            </label>

            <div className="satir">
              <button className="dg dg--ana" onClick={() => karar(true)}>
                {cakisma ? 'Onayla ve Kayıtları Yeni Hesaba Taşı' : 'Onayla ve Numarayı Değiştir'}
              </button>
              <button className="dg" onClick={() => karar(false)}>Reddet</button>
            </div>
          </>
        ) : (
          <div className="kucuk sonuk" style={{ marginTop: 12 }}>
            {talep.karar?.personel} · {tarihYaz(talep.karar?.tarih)}
            {talep.karar?.not ? ` · ${talep.karar.not}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function Kontrol({ tamam, yazi }) {
  return (
    <div className={'kontrol__a' + (tamam ? ' kontrol__a--ok' : '')}>
      <span aria-hidden="true">{tamam ? '✓' : '✕'}</span>
      <span>{yazi}</span>
    </div>
  )
}

const DURUM_ADI = { bekliyor: 'Bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' }
const DURUM_TON = { bekliyor: 'turuncu', onaylandi: 'yesil', reddedildi: 'gri' }
