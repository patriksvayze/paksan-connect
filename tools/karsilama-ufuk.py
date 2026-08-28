# -*- coding: utf-8 -*-
"""Karşılama sahnesindeki tarla şeridinin ufuk çizgisini yumuşatır ve
görseli yüksek yoğunluklu ekranlar için büyütür.

İKİ SORUN VARDI:

1. UFUKTA ÇİZİLMİŞ BİR ÇİZGİ GÖRÜNÜYORDU.

   Çizimdeki tepenin üst konturu lacivert. Görselin üstünde gökyüzüne
   karışsın diye bir saydamlık geçişi vardı ama o geçiş SABİT BİR
   YATAY BANTTA duruyordu (0-51. satırlar). Tepe çizgisi ise soldan
   sağa iniyor: solda 9. satırda, sağda 78. satırda. Ölçüldü —

       sütun    0 → kontur 19. satırda, alfa  48   (yumuşak)
       sütun  540 → kontur  9. satırda, alfa  46   (yumuşak)
       sütun  810 → kontur 75. satırda, alfa 255   (SERT)
       sütun  990 → kontur 75. satırda, alfa 255   (SERT)

   Yani bandın altında kalan sağ taraf tam opak kalıyor ve gökyüzüne
   karşı keskin, "cetvelle çizilmiş" bir çizgi gibi duruyordu.

   ÇÖZÜM: geçiş artık tepe çizgisini TAKİP EDİYOR. Her sütun kendi
   tepe noktasından başlayarak aşağı doğru yumuşuyor, böylece çizgi
   her yerde aynı ölçüde eriyor.

2. ÇÖZÜNÜRLÜK YETMİYORDU.

   Görsel 1080 piksel genişliğindeydi. Ekranda `object-fit: cover`
   ile çiziliyor ve kırpma hesaba katılınca 3 kat piksel yoğunluklu
   telefonlarda (çoğu Android) 1170 piksel gerekiyordu. Görsel
   büyütülerek çiziliyor, bulanık görünüyordu.

   ÇÖZÜM: çıktı 2 kat büyük yazılıyor (2160x736). Düz renkli bir
   çizim olduğu için LANCZOS ile büyütmek kenarları temiz bırakıyor.

İKİ TUZAK:

  · SÜTUN SÜTUN ERİTMEK TARAK İZİ BIRAKIYOR. Bir sütunda kontur var,
    yanındakinde yok; sınır bir aşağı bir yukarı zıplayınca dikey
    şeritler oluşuyor. Sınır önce komşu sütunlarla ortalanıyor.

  · GEÇİŞ DOĞRUSAL OLMAMALI. Doğrusal geçişin başladığı ve bittiği
    yerde gözle görülür bir kırılma oluyor. Smoothstep eğrisi iki
    ucunda da düzleştiği için geçiş fark edilmiyor.

KULLANIM:
    python tools/karsilama-ufuk.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

KOK = Path(__file__).resolve().parent.parent
GIRDI = KOK / 'tools' / 'kaynak' / 'karsilama-tarla-girdi.png'
CIKTI = KOK / 'src' / 'assets' / 'gorseller' / 'karsilama-tarla.png'

# Tepe çizgisinden itibaren kaç piksel boyunca eriyor.
# 1080 piksellik kaynakta ölçüldü: 70 piksel, ekranda yaklaşık 30
# CSS pikseline denk geliyor — çizgi kayboluyor ama tepe siluetini
# de yitirmiyor.
ERIME = 85
# Sınırı komşu sütunlarla ortalama penceresi (tarak izini önlüyor).
DUZLESTIRME = 41
# Çıktı büyütme katsayısı.
BUYUTME = 2


def smoothstep(t):
    """0-1 arasını iki ucunda da düzleşen bir eğriye çevirir."""
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def main():
    im = Image.open(GIRDI).convert('RGBA')
    a = np.array(im).astype(np.float64)
    Y, G = a.shape[0], a.shape[1]
    alfa = a[:, :, 3]

    # 1) Her sütunun tepe noktası: ilk görünür piksel.
    gorunur = alfa > 8
    var = gorunur.any(axis=0)
    tepe = np.where(var, gorunur.argmax(axis=0), 0).astype(np.float64)

    # Hiç pikseli olmayan sütunlar komşularının değerini alsın
    if (~var).any():
        idx = np.arange(G)
        tepe = np.interp(idx, idx[var], tepe[var])

    # 2) Sınırı düzleştir — tarak izi olmasın.
    cekirdek = np.ones(DUZLESTIRME) / DUZLESTIRME
    yastik = DUZLESTIRME // 2
    genis = np.pad(tepe, yastik, mode='edge')
    duz = np.convolve(genis, cekirdek, mode='valid')

    # Düzleştirme dik yamaçta gerçek tepeden GERİDE kalıyor: o
    # sütunlarda erime, içerik başladıktan sonra başlıyor ve kontur
    # yine sert çıkıyordu (ölçüldü: 21 sütun). Sınır hiçbir sütunda
    # kendi tepesinin altına inmesin.
    duz = np.minimum(duz, tepe)

    # 3) Geçiş maskesi: her sütun kendi tepesinden itibaren eriyor.
    satir = np.arange(Y)[:, None]
    oran = (satir - duz[None, :]) / ERIME
    maske = smoothstep(oran)

    yeni = a.copy()
    yeni[:, :, 3] = alfa * maske

    ciktiIm = Image.fromarray(yeni.astype(np.uint8), 'RGBA')

    # 4) Yüksek yoğunluklu ekranlar için büyüt.
    ciktiIm = ciktiIm.resize((G * BUYUTME, Y * BUYUTME), Image.LANCZOS)
    ciktiIm.save(CIKTI, optimize=True)

    # ÖLÇÜM: geçiş gerçekten yumuşadı mı?
    #
    # Doğru soru "kaç sert kontur var" DEĞİL — çizimin içinde balya
    # konturları da lacivert ve tam opak, onlar öyle olmalı. Doğru
    # soru şu: her sütunun KENDİ tepesinden aşağı indikçe saydamlık
    # ne hızla kapanıyor? Geçiş ne kadar uzun sürerse çizgi o kadar
    # az fark ediliyor.
    kontrol = np.array(Image.open(CIKTI).convert('RGBA')).astype(int)
    kalfa = kontrol[:, :, 3]
    KY, KG = kalfa.shape
    gorunurC = kalfa > 8
    profil = {}
    for d in (10, 30, 60, 90):
        deger = []
        for x in range(0, KG, 8):
            sut = np.where(gorunurC[:, x])[0]
            if not len(sut):
                continue
            y = sut[0] + d * BUYUTME
            if y < KY:
                deger.append(kalfa[y, x])
        profil[d] = round(float(np.mean(deger)), 1) if deger else None

    print(f'girdi        : {G}x{Y}')
    print(f'çıktı        : {G * BUYUTME}x{Y * BUYUTME}')
    print(f'erime        : tepe çizgisinden {ERIME} piksel, smoothstep')
    print('erime profili (tepeden kaynak pikseli → ortalama alfa):')
    for d, v in profil.items():
        print(f'   {d:3} px → {v}')
    print(f'yazıldı      : {CIKTI.relative_to(KOK)}')


if __name__ == '__main__':
    main()
