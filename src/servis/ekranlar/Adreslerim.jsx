import { useMemo, useState } from 'react'
import { MARKA, servisleriGetir } from '../../marka'
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
import { Bolum, Onay } from '../Kabuk'
import { IconPin, IconPlus, IconTrash } from '../../components/Icons'

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
   ========================================================================== */
const METIN = {
  bolum: 'Adreslerim',
  bosAciklama:
    'Sipariş ettiğiniz veya garanti işleri için istediğiniz parçaların gönderileceği adresleri ekleyin. Sonraki siparişlerde bu adreslerden birini seçebilirsiniz.',
  ipucu: 'Sipariş verirken varsayılan adresiniz seçili gelir.',
  firmaNotu: `Firma adresiniz ${MARKA} kaydınızdan gelir ve uygulamadan değiştirilemez. Taşındıysanız bizi arayın. Adresiniz güncellenene kadar yeni adresinizi ekleyip varsayılan yapabilirsiniz.`,
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
          {liste.map((a) => (
            <div key={a.id} className="adres-kart">
              <div className="adres-kart__ust">
                <span className="calisilan__ikon" aria-hidden="true">
                  <IconPin size={18} />
                </span>
                <div className="adres-kart__bilgi">
                  <div className="adres-kart__bas">
                    <span className="adres-kart__ad">{a.baslik}</span>
                    {a.varsayilan && <span className="adres-rozet">{ADRES_METNI.varsayilan}</span>}
                    {a.firma && (
                      <span className="adres-rozet adres-rozet--firma">
                        {ADRES_METNI.firmaRozet}
                      </span>
                    )}
                  </div>
                  <div className="adres-kart__satir">
                    {[a.alici, teslimatTelYaz(a.tel)].filter(Boolean).join(' · ')}
                  </div>
                  <div className="adres-kart__satir">{adresYazisi(a)}</div>
                </div>
              </div>

              {/* Firma kartında yalnız "Varsayılan Yap" var; düzenleme ve
                  silme PAKSAN'ın kaydına dokunurdu. Kart o zaman tek
                  düğmeyle kalıyor, varsayılansa hiç düğmesiz — yerine
                  kartın altında nedenini söyleyen satır çıkıyor. */}
              {(!a.firma || !a.varsayilan) && (
                <div className="adres-kart__islemler">
                  {!a.varsayilan && (
                    <button
                      type="button"
                      className="dg adres-kart__varsayilan"
                      onClick={() => setListe(varsayilanYap(servisId, a.id))}
                    >
                      {METIN.varsayilanYap}
                    </button>
                  )}
                  {!a.firma && (
                    <>
                      <button type="button" className="dg" onClick={() => setForm({ adres: a })}>
                        {METIN.duzenle}
                      </button>
                      <button type="button" className="dg" onClick={() => setSilinecek(a)}>
                        <IconTrash size={18} />
                        {METIN.sil}
                      </button>
                    </>
                  )}
                </div>
              )}
              {a.firma && <p className="alan__ipucu adres-kart__not">{METIN.firmaNotu}</p>}
            </div>
          ))}
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
