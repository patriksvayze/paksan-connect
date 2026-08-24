# -*- coding: utf-8 -*-
"""Karsilama sahnesindeki uzak seridi maviden yesile cevirir.

NEDEN

Uretilen gorselin kendi gokyuzu vardi. Sahnede gokyuzu CSS ile
boyandigi icin o gokyuzu kirpildi, ama tepenin cizgisi saga dogru
yukseldigi icin sagda bir parcasi goruntunun icinde kaldi. Iki sorun
cikiyordu:

  1. Kalan mavi serit, boyanan gokyuzunun altinda ayri bir mavi alan
     gibi duruyordu. Tarlanin ustundeki mavi su cagristiriyor; PAKSAN
     tarim makinesi ureticisi, sahnede denizin isi yok.

  2. Seridin ust kenari goruntunun ust kenarina dayaniyordu. Boyanan
     gokyuzuyle arasinda kesik bir cizgi olusuyordu -- kirpma yeri
     belli oluyordu.

NE YAPIYOR

  · Mavi pikseller cayir yesiline donuyor. Uzak bir mera oluyor:
    onde bicilmis sari tarla, arkada henuz yesil otlak. Sahneye
    derinlik de katiyor.

  · Seridin ust kenari yumusatiliyor. Yesil, yukari dogru saydamlasip
    gokyuzunun icinde eriyor -- uzaktaki tepenin sabah pusunda solmasi
    gibi. Kesik kenar kalmiyor.

IKI TUZAK

  · KOYU LACIVERT KONTURA DOKUNULMUYOR. Cizimin butun cizgileri
    (17,37,71) lacivert. "Mavimsi olani yesil yap" denirse balyalarin
    ve tepenin cizgileri de yesile doner, cizim dagilir. Yalnizca
    PARLAK gokyuzu mavisi degisiyor.

  · ERIME SINIRI DUZLESTIRILIYOR. Her sutunun kendi ust sinirindan
    eritmek tarak gibi dikey seritler birakiyor: bir sutunda kontur
    var, yanindakinde yok, sinir bir asagi bir yukari ziplyor. Sinir
    once komsu sutunlarla ortalanip yumusatiliyor.

CALISTIRMA

    python tools/karsilama-cayir.py

Girdi tools/kaynak/karsilama-tarla-mavi.png (uretilen gorselin ilk
hali). Betik her calistiginda ondan basliyor, kendi ciktisinin ustune
ust uste islem yapmiyor.
"""
import os

from PIL import Image

# Girdi tools/kaynak altinda duruyor, uygulamanin icinde degil: Vite
# yalnizca ice aktarilan dosyalari paketliyor ama src/assets icinde
# duran kullanilmayan bir gorsel yine de karisiklik yaratir -- hangisinin
# gercek oldugu belirsizlesir. Ciktinin yeri uygulamanin icinde.
GIRDI = os.path.join('tools', 'kaynak', 'karsilama-tarla-mavi.png')
CIKTI = os.path.join('src', 'assets', 'gorseller', 'karsilama-tarla.png')

# Cayir yesili. Sabah isiginda uzaktaki otlak parlak degil; sari tarlanin
# yaninda one gecmemesi icin bilerek soluk ve koyu tutuldu.
YESIL = (104, 140, 78)

# Ust kenarin kac pikselde tamamen saydama dusecegi
ERIME = 30

# Sinir yumusatmasinda kac komsu sutuna bakilacagi
PENCERE = 28


def parlak_mavi_mi(p):
    """Gokyuzu mavisi mi? Koyu lacivert KONTUR bu testi gecmemeli."""
    r, g, b, a = p
    return a > 0 and b > 140 and b > r + 40 and g > r


def main():
    im = Image.open(GIRDI).convert('RGBA')
    w, h = im.size
    px = im.load()

    # ------------------------------------------------ 1) Mavi -> yesil
    boyanan = 0
    for x in range(w):
        for y in range(h):
            p = px[x, y]
            if parlak_mavi_mi(p):
                # Tonun kendi acikligi korunuyor: gorselde mavinin iki
                # tonu var (duz alan ve golgesi), ikisi de ayni oranda
                # yesile tasiniyor.
                canlilik = p[2] / 181.0
                px[x, y] = (
                    int(YESIL[0] * canlilik),
                    int(YESIL[1] * canlilik),
                    int(YESIL[2] * canlilik),
                    p[3],
                )
                boyanan += 1

    # -------------------------------------- 2) Ust sinir: bul, yumusat
    ham = []
    for x in range(w):
        ust = None
        for y in range(h):
            if px[x, y][3] > 0:
                ust = y
                break
        ham.append(ust)

    # Hic opak pikseli olmayan sutun (tamamen saydam) atlaniyor.
    duz = []
    for x in range(w):
        if ham[x] is None:
            duz.append(None)
            continue
        komsu = [
            ham[k]
            for k in range(max(0, x - PENCERE), min(w, x + PENCERE + 1))
            if ham[k] is not None
        ]
        duz.append(sum(komsu) / float(len(komsu)))

    # ------------------------------------------------- 3) Ust kenar erisin
    eriyen = 0
    for x in range(w):
        if duz[x] is None:
            continue
        ust = duz[x]
        for i in range(ERIME):
            y = int(ust) + i
            if y < 0 or y >= h:
                continue
            p = px[x, y]
            if p[3] == 0:
                continue
            # Yumusatilmis sinirin uzerindeki mesafeye gore saydamlik.
            # Sinir kesirli oldugu icin gecis sutundan sutuna kaymiyor.
            oran = (y - ust + 1) / float(ERIME)
            oran = max(0.0, min(1.0, oran))
            px[x, y] = p[:3] + (int(p[3] * oran),)
            eriyen += 1

    im.save(CIKTI, optimize=True)
    print('yesile donen piksel:', boyanan)
    print('ust kenarda eriyen piksel:', eriyen)
    print('yazildi:', CIKTI, os.path.getsize(CIKTI) // 1024, 'KB')


if __name__ == '__main__':
    main()
