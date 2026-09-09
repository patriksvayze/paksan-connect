import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { load, save, remove, uid } from '../lib/storage'
import { telAnahtar } from '../lib/tel'
import { yeniNo } from '../lib/numara'
import { uygulamaKaydi } from '../lib/kayit'
import { talepNo } from '../lib/talep'
import { sunucuyaGonder } from '../lib/sunucu'
import { ihracatPostasi, talepUlkesi, yurtdisiTalepMi } from '../lib/ihracat'
import { musterininServisleri } from '../lib/servisAtama'
import { SUNUCU } from '../config'
import { cihazDili, DilSaglayici } from '../i18n'

/* Talep türü hangi servis hizmetini gerektiriyor.

   FİYAT TEKLİFİ BURADA YOK VE OLMAYACAK. Makineyi satan taraf bayi;
   servis satış yapmıyor. Fiyat teklifi talebi hiçbir servise
   atanmıyor: PAKSAN'a düşüyor, satış personeli müşteriye en uygun
   bayiye atıyor (bkz. backoffice/ekranlar/Talepler.jsx → BayiyeAta).
   Listede karşılığı olmayan tür atanmadan geçiyor. */
const TUR_HIZMET = {
  servis: 'servis',
  parca: 'parca',
}

const Ctx = createContext(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp bir AppProvider içinde kullanılmalı')
  return v
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => load('user', null))
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

  useEffect(() => save('user', user), [user])

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
       'user'  → açık oturum. Çıkış yapınca silinir.
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
    remove('user')
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

  const hasSerial = useCallback(
    (serial) => machines.some((m) => m.serial === serial),
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
      /* Yurtdışı talebi ayrı yoldan gidiyor: backoffice’e düşmüyor, ihracat
         ekibinin e-postasına gidiyor (bkz. src/lib/ihracat.js). Karar
         BURADA veriliyor ki her talep ekranı aynı davransın. */
      const ihracat = yurtdisiTalepMi(user)

      /* Talep MÜŞTERİNİN KENDİ SERVİSİNE düşüyor — coğrafyaya değil.

         Servis, makineden bayiye, bayiden servise giden zincirden
         çıkıyor (bkz. lib/servisAtama.js). Bir zamanlar burada il ve
         ilçeye bakıp en yakın servis seçiliyordu; o yol bırakıldı.
         Servis hak edişini PAKSAN'dan alıyor ve PAKSAN kime iş
         verdiğini bilmek zorunda; "en yakın" bir kayıt değil, tahmin.

         Servis talebi zaten servis atanmadan açılamıyor (form o kapıyı
         tutuyor). Yedek parça talebi ise servis parça tutmuyorsa
         PAKSAN'da kalıyor: parçası olmayan servise parça talebi
         yollamak, talebi bir kez daha taşıtmak demek.

         Yurtdışı talebi hiç düşmüyor: servis ağı Türkiye içinde.
         Fiyat teklifi de düşmüyor (bkz. TUR_HIZMET). */
      const gerekenHizmet = TUR_HIZMET[data.tur]
      const servis = ihracat || !gerekenHizmet
        ? null
        : musterininServisleri(machines, gerekenHizmet).ana

      const r = {
        id: uid(),
        no: talepNo(data.tur),
        createdAt: Date.now(),
        status: 'yeni',
        ulke: talepUlkesi(user),
        ihracat,
        servis: servis
          ? { id: servis.id, ad: servis.ad, tel: servis.tel || '', tarih: Date.now() }
          : null,
        sahip: servis ? 'servis' : 'paksan',
        ...data,
      }

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
    [user, machines, requestsGuncelle]
  )

  const updateRequest = useCallback((id, patch) => {
    requestsGuncelle((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [requestsGuncelle])

  const removeRequest = useCallback((id) => {
    requestsGuncelle((list) => {
      const silinen = list.find((r) => r.id === id)
      if (silinen) uygulamaKaydi('talep', `${silinen.no} müşteri tarafından silindi`)
      return list.filter((r) => r.id !== id)
    })
  }, [requestsGuncelle])

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
      requests,
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
      requests, addRequest, updateRequest, removeRequest,
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
