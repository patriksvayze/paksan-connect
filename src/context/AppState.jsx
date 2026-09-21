import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { load, save, remove, uid, oturumYukle, oturumKaydet, oturumSil } from '../lib/storage'
import { telAnahtar } from '../lib/tel'
import { yeniNo } from '../lib/numara'
import { uygulamaKaydi } from '../lib/kayit'
import { sunucuyaGonder } from '../lib/sunucu'
import { ihracatPostasi } from '../lib/ihracat'
import { talepKaydiOlustur } from '../lib/talepOlustur'
import { normalizeSerial } from '../lib/serial'
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
  const requestsGuncelle = useCallback((guncelle) => {
    setRequests((liste) => {
      const yeni = guncelle(liste)
      requestsRef.current = yeni
      save('requests', yeni)
      return yeni
    })
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
    requestsRef.current = requests
    save('requests', requests)
  }, [requests])
  useEffect(() => {
    const yenile = () => {
      const disaridaki = load('requests', [])
      if (JSON.stringify(disaridaki) !== JSON.stringify(requestsRef.current)) {
        setRequests(disaridaki)
      }
    }
    window.addEventListener('focus', yenile)
    document.addEventListener('visibilitychange', yenile)
    return () => {
      window.removeEventListener('focus', yenile)
      document.removeEventListener('visibilitychange', yenile)
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
     kaldırdıkları da aynı süzgeçten geçiyor. */
  const gorunenTalepler = useMemo(
    () =>
      requests.filter(
        (r) =>
          !r.servisSiparisi &&
          (!r.elle || (user && r.musteriId === user.id)) &&
          !gizlenenTalepler.includes(r.id),
      ),
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
      setMachines([])
      requestsGuncelle(() => [])
      setChats({})
      setGizlenenTalepler([])

      /* BİLDİRİMLER DE SİLİNİYOR. Duyuru kaydında kimin olduğu
         yazmıyor: kalsaydı telefonu devralan kişi önceki müşterinin
         talep numaralarını, personel notlarını ve atanan bayisini
         okuyordu. Aynı yol yalnız bu kişiye ait öteki defterleri de
         bırakıyordu — destek yazışması, geri bildirim ve numara
         değişikliği talebi. Anahtar adları backoffice’teki ANAHTAR
         listesiyle aynı; uygulama backoffice’in kodunu almıyor. */
      for (const anahtarAdi of [
        'duyurular', 'destekLog', 'geribildirim', 'numaraTalepleri',
      ]) {
        remove(anahtarAdi)
      }
    }

    /* Müşteri numarası kayıtta veriliyor; telefonda konuşurken kaydı
       tek cümlede bulmaya yarıyor (bkz. src/lib/numara.js). */
    const yeni = { id: uid(), no: yeniNo('musteri'), createdAt: Date.now(), ...data }
    setUser(yeni)
    save('hesap', yeni)
    uygulamaKaydi('musteri', `${yeni.no} ${yeni.ad} hesap açtı`)
  }, [requestsGuncelle])

  /* Var olan hesapla giriş — kayıt kaydını olduğu gibi geri yükler.
     Sunucu geldiğinde makine ve talep listesi de burada set edilecek. */
  const girisYap = useCallback((kayitliUser) => {
    setUser(kayitliUser)
    save('hesap', kayitliUser)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((u) => {
      if (!u) return u
      const yeni = { ...u, ...patch }
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
          (r.servis ? ' · ' + r.servis.ad : '')
      )

      return r
    },
    [user, requestsGuncelle]
  )

  const updateRequest = useCallback((id, patch) => {
    requestsGuncelle((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [requestsGuncelle])

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
      requests: gorunenTalepler,
      addRequest,
      updateRequest,
      removeRequest,
      getChat,
      pushChat,
      clearChat,
      okunanBildirimler,
      bildirimOku,
      bildirimleriOku,
      toast,
      showToast,
      dil,
      setDil,
    }),
    [
      user, login, girisYap, logout, updateUser,
      machines, addMachine, updateMachine, removeMachine, hasSerial,
      gorunenTalepler, addRequest, updateRequest, removeRequest,
      getChat, pushChat, clearChat,
      okunanBildirimler, bildirimOku, bildirimleriOku,
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
