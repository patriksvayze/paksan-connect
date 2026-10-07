import { useMemo, useState } from 'react'
import { servisleriGetir } from '../../data/katalog/servisler.js'

import { adresYazisi, teslimatTelYaz } from '../../lib/teslimat'
import {
  adresEkle,
  adresGuncelle,
  adresleriGetir,
  adresSil,
  firmaAdresiOnerisi,
  varsayilanYap,
} from '../adresler'
import { ADRES_METNI, AdresFormu } from '../AdresSecici'
import { Bolum, Onay, useAcilisKilidi } from '../Kabuk'
import { useGeri } from '../geri'
import { IconPin, IconPlus, IconRight, IconTrash } from '../../components/Icons'

/* ==========================================================================
   Hesap → Adreslerim

   Klasik adres defteri (kullanıcının isteği, 17 Eylül 2026): liste,
   ekle, düzenle, sil, varsayılan yap. Sipariş ekranındaki seçici
   yalnız SEÇİYOR; defterin bakımı burada.

   İLK SATIR FİRMA ADRESİ (kullanıcının isteği, 18 Eylül 2026). PAKSAN
   kaydındaki adres defterde hazır duruyor ve varsayılan o. O kartta
   "Düzenle" ve "Sil" YOK: kayıt PAKSAN'ın, telefondan değiştirilirse
   iki taraf iki ayrı adres bilir (bkz. adresler.js başı). "Varsayılan
   Yap" ise duruyor — servis kendi adresini varsayılan yaptıysa
   oradan geri dönebilsin.

   GİZLİ ETKİLEŞİM YOK. Kaydırarak silme, uzun basma yok; her işin
   kartın altında yazılı bir düğmesi var. Silme geri alınamıyor ve
   onay yaprağı ne olacağını söylüyor — "Emin misiniz?" demiyor.

   "VARSAYILAN YAP" YALNIZ VARSAYILAN OLMAYAN KARTTA. Varsayılan kartta
   aynı düğme hiçbir şey yapmayacaktı; orada yerine rozet duruyor.

   Talebe yazılmış adresler bu defterden bağımsız (bkz. lib/teslimat.js
   başı): silinen ya da değiştirilen adres, önceki siparişlerin nereye
   gittiğini değiştirmiyor. Onay yaprağı bunu da söylüyor.

   METİNLER TEK NESNEDE: hepsi aşağıdaki METIN nesnesinde toplu.
   Codex'ten 19 Eylül 2026'da geçti.

   LİSTE TEK SATIRLIK (22 Eylül 2026, kullanıcının isteği: "adresler
   ekranda çok kalabalık yapıyor… çok yer kaplıyor"). Her adres bir
   kart, altında üç düğmelik bir sıra ve firma adresinde dört satırlık
   bir açıklamaydı; tek adresle bile ekranın yarısını tutuyordu. Artık
   her adres tek satır: başlığı, varsayılan rozeti ve adresi tek satırda.
   Satıra dokununca ayrıntı ve düğmeler (Varsayılan Yap, Düzenle, Sil)
   alttan açılan yaprakta; firma adresinin açıklaması da orada. Gizli
   etkileşim değil: satırın sağında ok var, dokunmak tek iş.
   ========================================================================== */
const METIN = {
  bolum: 'Adreslerim',
  bosAciklama:
    'Sipariş ettiğiniz veya garanti işleri için istediğiniz parçaların gönderileceği adresleri ekleyin. Sonraki siparişlerde bu adreslerden birini seçebilirsiniz.',
  ipucu: 'Sipariş verirken varsayılan adresiniz seçili gelir.',
  firmaNotu: `Firma adresiniz PAKSAN kaydınızdan gelir ve uygulamadan değiştirilemez. Taşındıysanız bizi arayın. Adresiniz güncellenene kadar yeni adresinizi ekleyip varsayılan yapabilirsiniz.`,
  duzenle: 'Düzenle',
  sil: 'Sil',
  varsayilanYap: 'Varsayılan Yap',
  silBaslik: 'Adres silinecek',
  silMetin: (ad) =>
    `"${ad}" adlı adres listenizden silinecek. Bu adrese daha önce gönderilen siparişler etkilenmez.`,
  silYeniVarsayilan: (ad) => `Varsayılan adresiniz "${ad}" olacak.`,
  silKalem: 'Adres',
  silDugme: 'Adresi Sil',
}

export function Adreslerim({ oturum }) {
  const servisId = oturum.servisId
  const [liste, setListe] = useState(() => adresleriGetir(servisId))
  /* null | { yeni: true } | { adres } */
  const [form, setForm] = useState(null)
  const [silinecek, setSilinecek] = useState(null)
  /* Ayrıntısı alttan açılan adres. */
  const [acik, setAcik] = useState(null)

  const oneri = useMemo(
    () => firmaAdresiOnerisi(servisleriGetir().find((s) => s.id === servisId) || null, oturum.ad),
    [servisId, oturum.ad],
  )

  const tazele = () => setListe(adresleriGetir(servisId))

  /* Silinen varsayılansa yerine geçecek adres: kalanların en eskisi
     (bkz. adresler.js → adresSil). Onay yaprağı bunu önceden söylüyor. */
  const yerineGececek =
    silinecek?.varsayilan && liste.length > 1
      ? [...liste]
          .filter((a) => a.id !== silinecek.id)
          .sort((a, b) => (a.olusma || 0) - (b.olusma || 0))[0]
      : null

  const formIlk = form?.adres
    ? form.adres
    : oneri
      ? liste.length === 0
        ? { baslik: ADRES_METNI.firmaOneriBaslik, ...oneri }
        : { alici: oneri.alici, tel: oneri.tel, il: oneri.il }
      : {}

  return (
    <Bolum ad={METIN.bolum} sayi={liste.length}>
      {liste.length === 0 ? (
        <p className="alan__ipucu adres-bos">{METIN.bosAciklama}</p>
      ) : (
        <>
          <p className="alan__ipucu adres-bos">{METIN.ipucu}</p>
          <div className="adres-liste">
            {liste.map((a) => (
              <button key={a.id} type="button" className="adres-satir" onClick={() => setAcik(a)}>
                <span className="calisilan__ikon" aria-hidden="true">
                  <IconPin size={18} />
                </span>
                <span className="adres-satir__govde">
                  <span className="adres-satir__bas">
                    <span className="adres-satir__ad">{a.baslik}</span>
                    {a.varsayilan && <span className="adres-rozet">{ADRES_METNI.varsayilan}</span>}
                  </span>
                  <span className="adres-satir__adres">{adresYazisi(a)}</span>
                </span>
                <IconRight size={18} />
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" className="dg dg--blok" onClick={() => setForm({ yeni: true })}>
        <IconPlus size={19} />
        {ADRES_METNI.adresEkle}
      </button>

      {form && (
        <AdresFormu
          ilk={formIlk}
          duzenle={Boolean(form.adres)}
          not={
            !form.adres && liste.length === 0 && oneri?.acikAdres ? ADRES_METNI.firmaOneriNotu : ''
          }
          onKapat={() => setForm(null)}
          onKaydet={(veri) => {
            const sonuc = form.adres
              ? adresGuncelle(servisId, form.adres.id, veri)
              : adresEkle(servisId, veri)
            if (sonuc.eksik) return sonuc.eksik
            tazele()
            setForm(null)
            return null
          }}
        />
      )}

      {acik && (
        <AdresYapragi
          adres={acik}
          onKapat={() => setAcik(null)}
          onVarsayilan={() => {
            setListe(varsayilanYap(servisId, acik.id))
            setAcik(null)
          }}
          onDuzenle={() => {
            setForm({ adres: acik })
            setAcik(null)
          }}
          onSil={() => {
            setSilinecek(acik)
            setAcik(null)
          }}
        />
      )}

      {silinecek && (
        <Onay
          baslik={METIN.silBaslik}
          metin={
            METIN.silMetin(silinecek.baslik) +
            (yerineGececek ? ' ' + METIN.silYeniVarsayilan(yerineGececek.baslik) : '')
          }
          kalemler={[{ ad: METIN.silKalem, deger: adresYazisi(silinecek) }]}
          dugme={METIN.silDugme}
          onOnayla={() => {
            setListe(adresSil(servisId, silinecek.id))
            setSilinecek(null)
          }}
          onVazgec={() => setSilinecek(null)}
        />
      )}
    </Bolum>
  )
}

/* Adresin ayrıntısı ve işleri — onay yaprağıyla aynı yüzey, ekranın
   dibinden açılıyor. Firma adresinde "Düzenle" ve "Sil" yok (kayıt
   PAKSAN'ın, bkz. dosyanın başı); nedeni açıklamada yazıyor. Varsayılan
   adreste "Varsayılan Yap" yok, rozet duruyor. */
function AdresYapragi({ adres: a, onKapat, onVarsayilan, onDuzenle, onSil }) {
  useGeri(true, () => onKapat())
  const kilit = useAcilisKilidi()
  return (
    <div className="onay-perde" onClickCapture={kilit} onClick={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="onay" role="dialog" aria-label={a.baslik}>
        <h2 className="onay__baslik">{a.baslik}</h2>
        <div className="adres-yaprak__rozetler">
          {a.varsayilan && <span className="adres-rozet">{ADRES_METNI.varsayilan}</span>}
          {a.firma && <span className="adres-rozet adres-rozet--firma">{ADRES_METNI.firmaRozet}</span>}
        </div>
        <div className="adres-yaprak__bilgi">
          <div>{[a.alici, teslimatTelYaz(a.tel)].filter(Boolean).join(' · ')}</div>
          <div>{adresYazisi(a)}</div>
        </div>
        {a.firma && <p className="onay__metin">{METIN.firmaNotu}</p>}

        {!a.varsayilan && (
          <button type="button" className="dg dg--ana dg--blok" onClick={onVarsayilan}>
            {METIN.varsayilanYap}
          </button>
        )}
        {!a.firma && (
          <div className="adres-yaprak__islemler">
            <button type="button" className="dg" onClick={onDuzenle}>
              {METIN.duzenle}
            </button>
            <button type="button" className="dg" onClick={onSil}>
              <IconTrash size={18} />
              {METIN.sil}
            </button>
          </div>
        )}
        <button type="button" className="dg dg--blok onay__vazgec" onClick={onKapat}>
          Kapat
        </button>
      </div>
    </div>
  )
}
