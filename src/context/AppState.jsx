import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { load, save, remove, uid, oturumYukle, oturumKaydet, oturumSil } from '../lib/storage'
import { telAnahtar } from '../lib/tel'
import { yeniNo } from '../lib/numara'
import { uygulamaKaydi } from '../lib/kayit'
import { sunucuyaGonder } from '../lib/sunucu'
import { ihracatPostasi } from '../lib/ihracat'
import { talepKaydiOlustur } from '../lib/talepOlustur'
import { musteriIptaliniKaydet } from '../lib/musteriIptal'
import { gorunenTalepler, kaldirilanTalepler } from '../lib/musterininTalepleri'
import { normalizeSerial } from '../lib/serial'
import { servisGruplari } from '../lib/servisAtama'
import { SUNUCU } from '../config'
import { cihazDili, DilSaglayici } from '../i18n'

const Ctx = createContext(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp bir AppProvider içinde kullanılmalı')
  return v
}

export function AppProvider({ children }) {
  /* Açık oturum oturum deposunda: uygulama kapanınca biter ve açılış
     karşılama ekranından başlar (bkz. lib/storage.js → oturumYukle). */
  const [user, setUser] = useState(() => oturumYukle('user', null))
  const [machines, setMachines] = useState(() => load('machines', []))
  const [requests, setRequests] = useState(() => load('requests', []))
  const requestsRef = useRef(requests)
  /* DEPODAKİ GÜNCEL LİSTENİN ÜSTÜNE YAZILIYOR (24 Eylül 2026).

     Talepler deposu backoffice ve Servisim ile ortak. Değişiklik önce
     bellekteki listeye uygulanıp liste depoya BÜTÜNÜYLE yazılıyordu;
     bellekteki liste yalnız sekme odağa gelince tazeleniyordu. Arada
     başka uygulama bir talebe dokunduysa (hak edişi onaylandı, parça
     gönderildi) Connect'in ilk yazımı o değişikliği geri alıyordu —
     cari hareket ise yerinde kalıyordu. Artık her yazım depodaki
     listeden başlıyor. Yan etki güncelleyicinin dışında: React
     güncelleyiciyi iki kez çağırabilir, depoya iki kez yazılmasın. */
  const requestsGuncelle = useCallback((guncelle) => {
    const yeni = guncelle(load('requests', []))
    save('requests', yeni)
    requestsRef.current = yeni
    setRequests(yeni)
  }, [])
  /* Müşterinin KENDİ LİSTESİNDEN kaldırdığı taleplerin kimlikleri.

     Talepler deposu backoffice ve servis uygulamasıyla paylaşılıyor.
     Müşteri bir satırı listeden kaldırınca kayıt siliniyordu: PAKSAN'ın
     ve teknisyenin listesinden de kalkıyordu, geri dönüşü yoktu. Artık
     yalnız bu telefonda gizleniyor, paylaşılan kayıt yerinde kalıyor.
     Bu defter telefona ait; sunucuya gitmiyor. */
  const [gizlenenTalepler, setGizlenenTalepler] = useState(() =>
    load('gizlenenTalepler', [])
  )
  const [chats, setChats] = useState(() => load('chats', {}))
  /* Okunmuş bildirimlerin kimlikleri. Bildirimlerin kendisi
     saklanmıyor — uygulamanın bildiklerinden her açılışta yeniden
     üretiliyor (bkz. src/lib/bildirimler.js). */
  const [okunanBildirimler, setOkunanBildirimler] = useState(() =>
    load('okunanBildirimler', [])
  )
  /* GÖRÜLEN MAKİNE VE SERVİSLER (22 Eylül 2026, kullanıcının isteği).
     Müşterinin hesabına yeni bir makine ya da makinesine yeni bir servis
     gelince ana ekrandaki sayı şeridinde kırmızı "Yeni" işareti çıkıyor;
     Makinelerim ekranının ilgili sekmesi açılınca görülmüş sayılıyor.
     Burada o güne kadar görülenlerin kimlikleri tutuluyor.

     null = henüz hiç sayılmadı: ilk açılışta eldeki her şey görülmüş
     sayılıyor, uygulamayı ilk kez açan kullanıcı her kutuda işaret
     görmesin. Müşterinin kendi eklediği makine eklendiği an görülmüş
     sayılıyor (addMachine); işaret yalnız dışarıdan geleni haber veriyor. */
  const [gorulenler, setGorulenler] = useState(() => load('gorulenler', null))
  const [toast, setToast] = useState(null)

  /* Dil. Kullanıcı bir kez seçtiyse onun seçimi geçerli; hiç
     seçmediyse telefonun dili öneriliyor (Türkçe değilse İngilizce). */
  const [dil, setDilDurum] = useState(() => load('dil', null) || cihazDili())

  const setDil = useCallback((yeni) => {
    setDilDurum(yeni)
    save('dil', yeni)
  }, [])

  useEffect(() => oturumKaydet('user', user), [user])

  /* Eski sürümlerin kalıcı depoya yazdığı oturum kaydı siliniyor;
     kalsaydı hiçbir şey okumasa da telefonda gereksiz yer tutardı. */
  useEffect(() => remove('user'), [])

  /* Numara sisteminden önce açılmış hesapların numarası yok; ilk
     açılışta bir kez veriliyor. */
  useEffect(() => {
    if (!user || user.no) return
    const no = yeniNo('musteri')
    setUser((u) => {
      if (!u || u.no) return u
      const yeni = { ...u, no }
      save('hesap', yeni)
      return yeni
    })
  }, [user])
  useEffect(() => save('machines', machines), [machines])
  useEffect(() => {
    if (gorulenler) save('gorulenler', gorulenler)
    else
      setGorulenler({
        makine: machines.map((m) => m.id),
        servis: servisGruplari(machines).gruplar.map((g) => g.servis.id),
      })
  }, [gorulenler, machines])
  /** tur: 'makine' | 'servis'. Verilen kimlikleri görülmüş sayar. */
  const gorulduIsaretle = useCallback((tur, kimlikler) => {
    setGorulenler((g) => {
      if (!g) return g
      const eksik = kimlikler.filter((k) => !g[tur].includes(k))
      return eksik.length ? { ...g, [tur]: [...g[tur], ...eksik] } : g
    })
  }, [])
  /* Liste burada depoya YAZILMIYOR: yazan tek yer requestsGuncelle. Bu
     etki eskiden her değişimde bellekteki listeyi depoya geri yazıyordu;
     başkasının değişikliğini ezen yol buydu. */
  useEffect(() => {
    requestsRef.current = requests
  }, [requests])
  useEffect(() => {
    const yenile = () => {
      const disaridaki = load('requests', [])
      if (JSON.stringify(disaridaki) !== JSON.stringify(requestsRef.current)) {
        requestsRef.current = disaridaki
        setRequests(disaridaki)
      }
      /* Hesap da dışarıdan değişebiliyor: PAKSAN numara değişikliğini
         onaylayınca telefon `hesap`ta değişiyor (backoffice/veri.js →
         numaraTalebiKarar). Açık oturum eski numarayla kalırsa bir
         sonraki profil düzenlemesi eski numarayı geri yazardı. */
      const hesap = load('hesap', null)
      setUser((u) => (u && hesap?.id === u.id && JSON.stringify(hesap) !== JSON.stringify(u) ? hesap : u))
      /* Makine listesi de: PAKSAN makineyi yeni sahibine geçirince ya da
         iki hesabı birleştirince liste depoda değişiyor (backoffice/veri.js
         → makineSahibiniDegistir, hesaplariBirlestir). Bellekteki eski
         liste kalsaydı bir sonraki makine değişikliği onu depoya geri
         yazar, devredilen makine eski sahibin listesine dönerdi. */
      const makineler = load('machines', [])
      setMachines((m) => (JSON.stringify(makineler) !== JSON.stringify(m) ? makineler : m))
    }
    window.addEventListener('focus', yenile)
    document.addEventListener('visibilitychange', yenile)
    /* Aynı tarayıcıda başka sekme (backoffice, Servisim) depoya yazınca. */
    window.addEventListener('storage', yenile)
    return () => {
      window.removeEventListener('focus', yenile)
      document.removeEventListener('visibilitychange', yenile)
      window.removeEventListener('storage', yenile)
    }
  }, [])
  useEffect(() => save('chats', chats), [chats])

  /* MÜŞTERİ YALNIZ KENDİ TALEPLERİNİ GÖRÜYOR (10 Eylül 2026).

     Talepler deposu tarayıcıda servis uygulaması ve backoffice ile
     paylaşılıyor: servisin PAKSAN'dan verdiği parça siparişi ve
     servisin başka müşteriler için elle açtığı kayıtlar da aynı
     listeye yazılıyor. Connect onları müşterinin kendi talebi gibi
     gösteriyordu (servis siparişinde "Ödemeniz kontrol ediliyor").
     Telefonda iki uygulama depoyu paylaşmıyor, sunucu geldiğinde de
     liste müşteriye göre gelecek; süzgeç yine de ekranlara giden
     listede duruyor.

     Depoya yazılan liste süzülmüyor: süzülseydi paylaşılan depodaki
     servis kayıtları silinirdi. Müşterinin kendi listesinden
     kaldırdıkları da aynı süzgeçten geçiyor.

     HESABA GÖRE (24 Eylül 2026). Telefonu başkası devraldığında
     öncekinin talepleri artık depodan silinmiyor (bkz. login); yeni
     kişi yalnız kendi taleplerini görüyor. Talep 24 Eylül'den beri
     açanın hesap kimliğini taşıyor (addRequest); daha eskisinde kimlik
     yok, telefon numarasına bakılıyor.

     KURAL ARTIK lib/musterininTalepleri.js'te (25 Eylül 2026): burada
     dururken sınanamıyordu. Kimin talebi olduğu da oradan
     lib/musteriEslesmesi.js'e bağlı; backoffice'in müşteri kartıyla
     aynı kural, servisin elle açtığı kimliksiz iş istisnasıyla. */
  const gorunen = useMemo(
    () => gorunenTalepler(requests, user, gizlenenTalepler),
    [requests, user, gizlenenTalepler],
  )
  /* Müşterinin kendi listesinden kaldırdıkları: Taleplerim ekranında
     ayrı bölümde, geri alma düğmesiyle (kullanıcı sınaması O9). */
  const kaldirilan = useMemo(
    () => kaldirilanTalepler(requests, user, gizlenenTalepler),
    [requests, user, gizlenenTalepler],
  )
  useEffect(() => save('gizlenenTalepler', gizlenenTalepler), [gizlenenTalepler])
  useEffect(() => save('okunanBildirimler', okunanBildirimler), [okunanBildirimler])

  /* Uzun cümlenin okunması kısa olandan uzun sürüyor; süre yazının
     uzunluğuna göre hesaplanıyor. */
  const showToast = useCallback((text) => {
    setToast(text)
    const sure = Math.min(6000, Math.max(2600, String(text).length * 55))
    setTimeout(() => setToast((t) => (t === text ? null : t)), sure)
  }, [])

  /* ------------------------------------------------------------ Kullanıcı */

  /* Hesap iki yerde durur:
       'user'  → açık oturum. Çıkış yapınca ve uygulama kapanınca biter.
       'hesap' → bu telefonda kayıt olmuş kişi. Çıkış yapınca KALIR ki
                 aynı numarayla tekrar giriş yapılabilsin.
     Makineler ve talepler de çıkışta silinmez; yalnızca oturum kapanır.
     Gerçekten silmek isteyen "hesabımı sil" der.                        */

  /* Yeni kayıt */
  const login = useCallback((data) => {
    const onceki = load('hesap', null)

    /* Telefonu başkası devraldıysa önceki kişinin kayıtları taşınmasın.
       Karşılaştırma ülke kodu + numara üzerinden: aynı numara farklı
       ülkelerde farklı kişidir. */
    const anahtar = (h) => (h ? telAnahtar(h.ulke, h.tel) : '')
    if (onceki && anahtar(onceki) !== anahtar(data)) {
      /* Yalnız bu telefona ait defterler sıfırlanıyor. */
      setMachines([])
      setGorulenler(null)
      setChats({})
      setGizlenenTalepler([])

      /* ORTAK DEPOLAR SİLİNMİYOR (24 Eylül 2026). Burada talepler,
         bildirimler, destek yazışmaları, geri bildirimler ve numara
         değişikliği talepleri de siliniyordu: telefonu devralan kişi
         öncekinin kayıtlarını görmesin diye. Ama bu depolar backoffice
         ve Servisim ile ortak; silmek PAKSAN'ın ve servislerin bütün
         kayıtlarını (servis siparişleri, elle açılan işler dahil)
         yok ediyordu. Gizlilik artık okurken sağlanıyor: talep listesi
         hesaba göre süzülüyor (aşağıda gorunenTalepler), kişisel
         bildirim ve numara talebi zaten hesap kimliğiyle
         (lib/duyuruHedef.js, lib/numaraTalebi.js); destek yazışması ve
         geri bildirim Connect'te hiç okunmuyor. */
    }

    /* Müşteri numarası kayıtta veriliyor; telefonda konuşurken kaydı
       tek cümlede bulmaya yarıyor (bkz. src/lib/numara.js). */
    const yeni = { id: uid(), no: yeniNo('musteri'), createdAt: Date.now(), ...data }
    setUser(yeni)
    save('hesap', yeni)
    uygulamaKaydi('musteri', `${yeni.no} ${yeni.ad} hesap açtı`)
  }, [])

  /* Var olan hesapla giriş — kayıt kaydını olduğu gibi geri yükler.
     Sunucu geldiğinde makine ve talep listesi de burada set edilecek. */
  const girisYap = useCallback((kayitliUser) => {
    setUser(kayitliUser)
    save('hesap', kayitliUser)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((u) => {
      if (!u) return u
      /* Depodaki hesap aynı kişininse onun üstüne: PAKSAN arada
         telefonu değiştirmiş olabilir (bkz. yukarıdaki yenile). */
      const depodaki = load('hesap', null)
      const yeni = { ...u, ...(depodaki?.id === u.id ? depodaki : {}), ...patch }
      save('hesap', yeni)
      return yeni
    })
  }, [])

  /* Oturumu kapat — kayıtlar telefonda kalır, tekrar giriş yapılabilir */
  const logout = useCallback(() => {
    setUser(null)
    oturumSil('user')
  }, [])

  /* NOT: Hesap silme uygulamadan yapılmıyor. KVKK kapsamındaki silme
     talebi PAKSAN'a iletiliyor ve yetkili tarafından yürütülüyor
     (bkz. Profil → Çıkış Yap ve KVKK Aydınlatma Metni). */

  /* -------------------------------------------------------------- Makine */

  const addMachine = useCallback(
    ({ productId, serial, year, nickname }) => {
      const m = {
        id: uid(),
        productId,
        serial,
        year: year || null,
        nickname: nickname || '',
        addedAt: Date.now(),
        hours: 0,
        doneMaintenance: [],
      }
      setMachines((list) => [m, ...list])
      setGorulenler((g) => (g ? { ...g, makine: [...g.makine, m.id] } : g))
      return m
    },
    []
  )

  const updateMachine = useCallback((id, patch) => {
    setMachines((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const removeMachine = useCallback((id) => {
    setMachines((list) => list.filter((m) => m.id !== id))
    setChats((c) => {
      const next = { ...c }
      delete next[id]
      return next
    })
  }, [])

  /* Seri biçimden bağımsız karşılaştırılıyor (21 Eylül 2026): kayıt
     defteri de öyle arıyor. Düz eşitlikte aynı makine küçük harfle ya da
     tiresiz yazılınca "zaten kayıtlı" denmiyordu. */
  const hasSerial = useCallback(
    (serial) => {
      const aranan = normalizeSerial(serial)
      return Boolean(aranan) && machines.some((m) => normalizeSerial(m.serial) === aranan)
    },
    [machines]
  )

  /* --------------------------------------------------------------- Talep */

  /* Talep gönderimi.

     Sunucuya gidip cevabı bekliyor; bu yüzden async. Sunucu kapalıyken
     (demo) yine kısa bir gecikmeyle dönüyor, böylece ekranlardaki
     "Gönderiliyor" durumu şimdiden çalışıyor ve sunucu açıldığında
     ekranlarda değişiklik gerekmiyor.

     Gönderim başarısızsa hata yukarı fırlatılıyor ve talep KAYDEDİLMİYOR
     — kullanıcı "gönderildi" görüp beklemesin, aynı formdan yeniden
     denesin. */
  const addRequest = useCallback(
    async (data) => {
      /* Kaydın kendisi src/lib/talepOlustur.js'te kuruluyor: ihracat mı,
         hangi ülkeye ait, hangi servise düşecek, sahibi kim. Gerekçeleri
         orada yazılı. O karar bu bileşenin içinde dururken uygulama
         dışından çalıştırılamıyordu, yani sınanamıyordu. Burada yalnız
         gönderim, yazım ve işlem kaydı kaldı. */
      const r = talepKaydiOlustur(data, user)
      const ihracat = r.ihracat

      const cevap = ihracat
        ? await sunucuyaGonder(SUNUCU.ihracatEndpoint, {
            talep: r,
            eposta: ihracatPostasi(r),
          })
        : await sunucuyaGonder(SUNUCU.talepEndpoint, r)

      /* Talep numarasını sunucu üretiyorsa onunki geçerli */
      if (cevap?.no) r.no = cevap.no

      requestsGuncelle((list) => [r, ...list])
      uygulamaKaydi(
        'talep',
        `${r.no} açıldı · ${r.ad}` +
          (ihracat ? ' · ihracat (' + r.ulke + ')' : '') +
          (r.servis ? ' · ' + r.servis.ad : '') +
          (r.bolgeDisi ? ' · bölge dışı, PAKSAN’a yönlendirildi' : '')
      )

      return r
    },
    [user, requestsGuncelle]
  )

  const updateRequest = useCallback((id, patch) => {
    requestsGuncelle((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [requestsGuncelle])

  /* Müşterinin talebini iptal etmesi ya da iptal istemesi (8 Ekim 2026).
     Kural ve yazım lib/musteriIptal.js'te; karar depodaki kayıttan. Döner:
     { talep } ya da { hata }. */
  const talebiIptalEt = useCallback((id, yol, secim) => {
    const sonuc = musteriIptaliniKaydet(id, yol, secim)
    if (!sonuc.hata) {
      const yeni = load('requests', [])
      requestsRef.current = yeni
      setRequests(yeni)
    }
    return sonuc
  }, [])

  /* Talebi müşterinin listesinden kaldırır.

     PAYLAŞILAN KAYIT SİLİNMİYOR. Eskiden satır 'requests' deposundan
     çıkarılıyordu; o depoyu backoffice ve servis uygulaması da okuyor,
     yani müşterinin tek hareketi PAKSAN'ın ve teknisyenin listesinden
     de kaydı geri dönüşsüz siliyordu. Şimdi kimlik yalnız bu telefonun
     gizleme defterine yazılıyor. */
  const removeRequest = useCallback((id) => {
    const silinen = requestsRef.current.find((r) => r.id === id)
    if (silinen) uygulamaKaydi('talep', `${silinen.no} müşteri tarafından kendi listesinden kaldırıldı`)
    setGizlenenTalepler((liste) => (liste.includes(id) ? liste : [...liste, id]))
  }, [])

  /* Kaldırılan talebi listeye geri alır (25 Eylül 2026, kullanıcı
     sınaması O9). Kaldırma yalnız bu telefonun gizleme defterine
     yazıyordu ve defterden çıkaran bir yol yoktu; onay metni ise geri
     dönüş yolu varmış gibi yazıyordu. Kimlik defterden çıkıyor, talep
     listeye dönüyor. */
  const talebiGeriAl = useCallback((id) => {
    const r = requestsRef.current.find((x) => x.id === id)
    if (r) uygulamaKaydi('talep', `${r.no} müşteri tarafından kendi listesine geri alındı`)
    setGizlenenTalepler((liste) => liste.filter((x) => x !== id))
  }, [])

  /* --------------------------------------------------------------- Sohbet */

  const getChat = useCallback((key) => chats[key] || [], [chats])

  const pushChat = useCallback((key, msgs) => {
    setChats((c) => ({ ...c, [key]: [...(c[key] || []), ...msgs] }))
  }, [])

  /* -------------------------------------------------------- Bildirim */

  const bildirimOku = useCallback((id) => {
    setOkunanBildirimler((l) => (l.includes(id) ? l : [...l, id]))
  }, [])

  const bildirimleriOku = useCallback((idler) => {
    setOkunanBildirimler((l) => [...new Set([...l, ...idler])])
  }, [])

  const clearChat = useCallback((key) => {
    setChats((c) => ({ ...c, [key]: [] }))
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      girisYap,
      logout,
      updateUser,
      machines,
      addMachine,
      updateMachine,
      removeMachine,
      hasSerial,
      requests: gorunen,
      kaldirilanTalepler: kaldirilan,
      addRequest,
      updateRequest,
      talebiIptalEt,
      removeRequest,
      talebiGeriAl,
      getChat,
      pushChat,
      clearChat,
      okunanBildirimler,
      bildirimOku,
      bildirimleriOku,
      gorulenler,
      gorulduIsaretle,
      toast,
      showToast,
      dil,
      setDil,
    }),
    [
      user, login, girisYap, logout, updateUser,
      machines, addMachine, updateMachine, removeMachine, hasSerial,
      gorunen, kaldirilan, addRequest, updateRequest, removeRequest, talebiGeriAl,
      getChat, pushChat, clearChat,
      okunanBildirimler, bildirimOku, bildirimleriOku,
      gorulenler, gorulduIsaretle,
      toast, showToast, dil, setDil,
    ]
  )

  /* Dil sağlayıcısı burada sarmalıyor: uygulamanın her yerinden
     hem useApp() hem useDil() çalışsın. */
  return (
    <Ctx.Provider value={value}>
      <DilSaglayici dil={dil}>{children}</DilSaglayici>
    </Ctx.Provider>
  )
}
