# -*- coding: utf-8 -*-
"""Alt menudeki "Makineler" simgesini PAKSAN'in kendi cizimden uretir.

NEDEN AYRI BIR BETIK

Bu simge birkac kere uretilip her seferinde tutmadi. Sebep basit:
uretim modeline "cekilir balya makinesi" tarif edilip ne cikacagi
umuluyordu; cikan sey her defasinda baska bir makine oluyordu.

Oysa dogru cizim zaten elimizde: "Makinelerim" listesi bosken
gosterilen cizim (src/assets/gorseller/bos-makine.png). Bu betik onu
tarif etmiyor, DOGRUDAN onu izliyor. Simge artik o cizimin kendisi.

NE YAPIYOR

  1. Cizimin koyu lacivert KONTUR renkleri seciliyor -- govde dolgusu,
     mavi sasi ve turuncu parca alinmiyor. Cikan sey cizimin cizgileri.
  2. Makineye ait olmayan parcalar atiliyor: yer cizgileri ve yanlarda
     duran iki kucuk rulo. Onlar bos liste cizimindeki manzara; simgede
     isleri yok. Atma isi baglantili parcalari sayarak yapiliyor, en
     buyuk parca makinenin kendisi.
  3. Cizgiler potrace ile izlenip 24 birimlik kutuya oturtuluyor,
     src/data/ikonYollari.js icindeki "makine" yolunun ustune yaziliyor.

CALISTIRMA

    python tools/makine-ikonu.py
"""
import io
import json
import os

import numpy as np
import potrace
from PIL import Image
from scipy import ndimage

KAYNAK = os.path.join('src', 'assets', 'gorseller', 'bos-makine.png')
YOLLAR = os.path.join('tools', 'kaynak', 'ikon-yollari.json')

# Cizimdeki kontur renkleri. Govde dolgusu (225,232,245), sasi mavisi
# (33,83,163) ve turuncu (222,99,32) BILEREK disarida: simge cizgi
# olacak, dolu siluet degil.
KONTUR = [(15, 35, 68), (7, 26, 58)]
TOLERANS = 60

PAY = 1.0

# Cizgi kalinlastirma yaricapi (piksel).
#
# CIZIM BUYUK, CIZGILERI INCE. Kaynak 499 piksel genisliginde ve
# konturu 6 piksel; yani cizgi, genisligin yuzde 1,2'si. 24 piksele
# indirilince cizgi 0,3 piksel kaliyor, alt menude silik bir leke
# oluyor. Uretilen oteki simgelerde bu oran yuzde 4 civarinda.
#
# Kontur, oranlar oteki simgelerle esitlensin diye sisiriliyor.
# Degeri buyutmek cizimin ic bosluklarini kapatir (tekerlek gobekleri
# once kaybolur), kucultmek silikligi geri getirir.
KALINLIK = 8


def kontur_maskesi(im):
    a = np.asarray(im.convert('RGBA')).astype(np.int16)
    opak = a[..., 3] > 128
    m = np.zeros(a.shape[:2], bool)
    for r, g, b in KONTUR:
        fark = np.abs(a[..., 0] - r) + np.abs(a[..., 1] - g) + np.abs(a[..., 2] - b)
        m |= (fark < TOLERANS)
    return m & opak


# Cizimde makineye ait OLMAYAN parcalarin yeri.
#
# Iki yer cizgisi ve yanlarda duran iki kucuk rulo var. Bunlar bos
# liste cizimindeki manzara; simgede isleri yok. Baglantili parca
# saymak yetmedi cunku yer cizgisi tekerleklere degiyor, makineyle tek
# parca oluyor. Onun icin sinirlar cizimden olculup yazildi:
#
#   makinenin en solu   x=90   ceki okunun ucundaki kanca topu
#   makinenin en sagi   x=579  govdenin sag kenari
#   makinenin en alti   y=322  tekerleklerin alt noktasi
#
# Bunlarin disinda kalan her sey yer cizgisi ya da rulo.
SOL, SAG, ALT = 86, 585, 323


def manzarayi_at(m):
    k = np.zeros_like(m)
    k[:ALT, SOL:SAG] = m[:ALT, SOL:SAG]
    return k


def en_buyuk_parca(m):
    """Yalnizca makinenin kendisi kalsin.

    Yer cizgileri ve yanlardaki rulolar ayri parcalar; makine ise
    govde, ceki oku ve tekerlekleriyle tek parca ve acik ara en buyugu.
    """
    etiket, sayi = ndimage.label(m, structure=np.ones((3, 3), bool))
    if sayi <= 1:
        return m
    boyut = ndimage.sum(m, etiket, range(1, sayi + 1))
    return etiket == (int(np.argmax(boyut)) + 1)


def kalinlastir(m, yaricap=None):
    r = KALINLIK if yaricap is None else yaricap
    if r <= 0:
        return m
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    disk = x * x + y * y <= r * r
    return ndimage.binary_dilation(m, structure=disk)


def yol(m):
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    parca = m[y0:y1 + 1, x0:x1 + 1]

    en, boy = x1 - x0 + 1, y1 - y0 + 1
    olcek = (24.0 - 2 * PAY) / max(en, boy)
    kx = PAY + (24.0 - 2 * PAY - en * olcek) / 2
    ky = PAY + (24.0 - 2 * PAY - boy * olcek) / 2

    def d(p):
        return (round(kx + (p.x - 2) * olcek, 2), round(ky + (p.y - 2) * olcek, 2))

    dolgulu = np.pad(parca, 2, constant_values=False)
    # potracer'in siyah saydigi taraf SIFIR olan taraf; maske ters veriliyor
    izler = potrace.Bitmap(~dolgulu).trace(turdsize=6, opticurve=1, alphamax=1.0)

    p = []
    for egri in izler:
        bx, by = d(egri.start_point)
        p.append('M%g %g' % (bx, by))
        for s in egri:
            if s.is_corner:
                ax, ay = d(s.c)
                ex, ey = d(s.end_point)
                p.append('L%g %gL%g %g' % (ax, ay, ex, ey))
            else:
                a1x, a1y = d(s.c1)
                a2x, a2y = d(s.c2)
                ex, ey = d(s.end_point)
                p.append('C%g %g %g %g %g %g' % (a1x, a1y, a2x, a2y, ex, ey))
        p.append('Z')
    return ''.join(p), (en, boy)


def main():
    im = Image.open(KAYNAK)
    m = kontur_maskesi(im)
    print('kontur pikseli   :', int(m.sum()))
    m = manzarayi_at(m)
    print('manzara sonrasi  :', int(m.sum()))
    m = en_buyuk_parca(m)
    print('makine pikseli   :', int(m.sum()))
    m = kalinlastir(m)
    print('kalinlastirilmis :', int(m.sum()))

    d, (en, boy) = yol(m)
    print('kutu             : %dx%d  oran %.2f' % (en, boy, en / boy))
    print('yol uzunlugu     :', len(d))

    veri = json.load(io.open(YOLLAR, encoding='utf-8'))
    veri['makine'] = d
    io.open(YOLLAR, 'w', encoding='utf-8').write(
        json.dumps(veri, ensure_ascii=False, indent=1, sort_keys=True))
    print('yazildi:', YOLLAR)


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    main()
