# -*- coding: utf-8 -*-
"""Higgsfield'in urettigi ikon sayfasini gercek SVG yollarina cevirir.

NEDEN BOYLE BIR SEY GEREKTI

Uretilen gorsel PNG. Uygulamanin simgeleri PNG olamaz: alt menude
secili sekmede beyaz, secilmemiste soluk, karanlik modda bambaska bir
renk oluyorlar. Hazir bir PNG tek renkte donuyor ve 24 pikselde
bulaniklasiyor.

Elle yeniden cizmek de dogru cevap degildi -- o zaman ekranda gorunen
sey artik uretilen cizim olmuyor, ona benzetilmis baska bir cizim
oluyor.

Bu betik ucuncu yolu aciyor: uretilen cizimin KENDISI izlenip vektore
donusturuluyor. Ekranda gorunen sey birebir uretilen cizim, ama vektor
oldugu icin her boyda net ve `currentColor` ile istenen renge donuyor.

NASIL CALISIYOR

  1. Sayfa siyah-beyaza indiriliyor (koyu pikseller "murekkep")
  2. Murekkep once satirlara, sonra sutunlara ayriliyor: bos seritler
     ikonlarin arasindaki bosluk demek, kesim oradan yapiliyor
  3. Her ikon potrace ile izleniyor -- cizginin dis hatti cikiyor
  4. Koordinatlar 24 birimlik kutuya oturtuluyor, kenarda pay birakarak
  5. Cikti: fill="currentColor" olan tek bir <path>

CALISTIRMA

    python tools/ikon-svg.py <sayfa.png> ad1 ad2 ad3 ...

Adlar ikonlarin okuma sirasina gore verilir (soldan saga, ustten asagi).
Cikti tools/kaynak/ikon-yollari.json dosyasina eklenir.
"""
import io
import json
import os
import sys

import numpy as np
import potrace
from PIL import Image

CIKTI = os.path.join('tools', 'kaynak', 'ikon-yollari.json')

# Bu degerin altindaki parlaklik "murekkep" sayiliyor (0-255).
ESIK = 160

# Bir seridi bos saymak icin en az kac piksel bos kalmali.
#
# BU DEGER KUCUK OLURSA IKONLAR PARCALANIR. Dort kareli "urunler"
# simgesi bunun kanitiydi: kareler arasindaki 26 piksellik bosluk
# kesim yeri sanildi, tek simge iki simge olarak sayildi. Simgeler
# arasindaki bosluk ise 116 piksel. Aradaki fark genis, esik rahatca
# ortaya konabiliyor.
BOSLUK = 60

# 24 birimlik kutunun kenarinda birakilan pay.
PAY = 1.2


def murekkep(im):
    """Goruntuyu murekkep/bos ikili dizisine cevirir."""
    g = np.asarray(im.convert('L'), dtype=np.uint8)
    return g < ESIK


def seritler(dolu):
    """Dolu/bos dizisinden dolu araliklari cikarir: [(bas, son), ...]"""
    cikti = []
    bas = None
    bosSayaci = 0
    for i, d in enumerate(dolu):
        if d:
            if bas is None:
                bas = i
            bosSayaci = 0
        elif bas is not None:
            bosSayaci += 1
            if bosSayaci >= BOSLUK:
                cikti.append((bas, i - bosSayaci))
                bas = None
                bosSayaci = 0
    if bas is not None:
        cikti.append((bas, len(dolu) - 1))
    return cikti


def kutular(m):
    """Sayfadaki ikonlarin kutularini okuma sirasinda dondurur."""
    cikti = []
    for y0, y1 in seritler(m.any(axis=1)):
        satir = m[y0:y1 + 1]
        for x0, x1 in seritler(satir.any(axis=0)):
            # Kutuyu kendi murekkebine daralt: satir bandi butun satiri
            # kapsiyor, ikon o bandin icinde daha kisa olabilir.
            parca = satir[:, x0:x1 + 1]
            dolu = parca.any(axis=1)
            ust = int(np.argmax(dolu))
            alt = len(dolu) - 1 - int(np.argmax(dolu[::-1]))
            cikti.append((x0, y0 + ust, x1, y0 + alt))
    return cikti


def yol(m, kutu):
    """Bir ikonu izleyip 24 birimlik SVG yol metnine cevirir."""
    x0, y0, x1, y1 = kutu
    parca = m[y0:y1 + 1, x0:x1 + 1]

    en, boy = x1 - x0 + 1, y1 - y0 + 1
    olcek = (24.0 - 2 * PAY) / max(en, boy)
    # Kisa kenardan ortalanir: ikon kutunun ortasinda dursun
    kx = PAY + (24.0 - 2 * PAY - en * olcek) / 2
    ky = PAY + (24.0 - 2 * PAY - boy * olcek) / 2

    def d(x, y):
        # np.pad'in eklendigi iki piksel geri cikariliyor
        return round(kx + (x - 2) * olcek, 2), round(ky + (y - 2) * olcek, 2)

    # MASKE TERS VERILIYOR.
    #
    # potracer'in siyah saydigi taraf SIFIR olan taraf. Elimizdeki
    # maskede murekkep True; oldugu gibi verilirse cizimin CEVRESI
    # izleniyor ve ekrana dolu bir kare ile icinde beyaz bir sekil
    # cikiyor. Bilinen bir sekille denendi: 20x20 bos alanin ortasindaki
    # 10x10 dolu kare, ters verilmeden butun kutuyu dondurdu.
    #
    # Kenara iki piksel bos pay konuyor ki cizgi kutunun kenarina
    # dayandiginda kontur kenardan gecmesin.
    dolgulu = np.pad(parca, 2, constant_values=False)
    izler = potrace.Bitmap(~dolgulu).trace(turdsize=8, opticurve=1, alphamax=1.0)

    # potrace noktalari .x/.y tasiyan nesneler olarak veriyor
    def n(p):
        return d(p.x, p.y)

    parcalar = []
    for egri in izler:
        bx, by = n(egri.start_point)
        parcalar.append('M%g %g' % (bx, by))
        for s in egri:
            if s.is_corner:
                ax, ay = n(s.c)
                ex, ey = n(s.end_point)
                parcalar.append('L%g %gL%g %g' % (ax, ay, ex, ey))
            else:
                a1x, a1y = n(s.c1)
                a2x, a2y = n(s.c2)
                ex, ey = n(s.end_point)
                parcalar.append('C%g %g %g %g %g %g' % (a1x, a1y, a2x, a2y, ex, ey))
        parcalar.append('Z')
    return ''.join(parcalar)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    sayfa = sys.argv[1]
    adlar = [a for a in sys.argv[2:] if not a.startswith('bosluk=')]
    for a in sys.argv[2:]:
        if a.startswith('bosluk='):
            globals()['BOSLUK'] = int(a.split('=')[1])

    # ZEMIN HER ZAMAN BEYAZA OTURTULUYOR.
    #
    # Kaynak dosya palet kipinde ve saydamlik tasiyorsa dogrudan griye
    # cevirmek saydam pikselleri SIYAH yapiyor. O zaman cizim degil
    # cizimin cevresi "murekkep" sayiliyor ve izleme tersine donuyor:
    # ekranda dolu bir kare ve icinde beyaz bir anahtar cikiyordu.
    # Once RGBA'ya, sonra beyaz zemine oturtulunca bu ihtimal kalmiyor.
    im = Image.open(sayfa).convert('RGBA')
    zemin = Image.new('RGB', im.size, (255, 255, 255))
    zemin.paste(im, mask=im.split()[3])
    m = murekkep(zemin)

    kut = kutular(m)
    print('bulunan ikon: %d, verilen ad: %d' % (len(kut), len(adlar)))
    if len(kut) != len(adlar):
        for i, k in enumerate(kut):
            print('  %2d  x %4d-%4d  y %4d-%4d' % (i, k[0], k[2], k[1], k[3]))
        print('SAYI TUTMUYOR -- ad listesini duzeltin ya da BOSLUK degerini oynatin')
        return

    veri = {}
    if os.path.exists(CIKTI):
        veri = json.load(io.open(CIKTI, encoding='utf-8'))

    for ad, k in zip(adlar, kut):
        veri[ad] = yol(m, k)
        print('  %-16s %5d karakter' % (ad, len(veri[ad])))

    io.open(CIKTI, 'w', encoding='utf-8').write(
        json.dumps(veri, ensure_ascii=False, indent=1, sort_keys=True))
    print('yazildi:', CIKTI, '(toplam %d ikon)' % len(veri))
    js_yaz(veri)


def js_yaz(veri):
    """Yollari uygulamanin okudugu JS dosyasina yazar.

    JSON dogrudan ice aktarilabilirdi ama o zaman dosyanin ne oldugu
    ve elle duzenlenmemesi gerektigi hicbir yerde yazmiyor olurdu.
    """
    y = ['/* ==========================================================================',
         '   Simge yollari -- BU DOSYA ELLE DUZENLENMEZ',
         '',
         '   Higgsfield ile uretilen ikon sayfalari izlenerek uretildi:',
         '',
         '       python tools/ikon-svg.py tools/kaynak/ikon-referans-1.png ad1 ad2 ...',
         '',
         '   Her deger, uretilen cizginin dis hattini gosteren tek bir SVG',
         '   yolu. Cizgi degil dolgu olduklari icin fill="currentColor" ile',
         '   kullaniliyorlar; boylece secili sekmede beyaza, karanlik modda',
         '   baska bir renge kendiliginden donuyorlar.',
         '   ========================================================================== */',
         '',
         'export const IKON_YOLLARI = {']
    for ad in sorted(veri):
        y.append("  '%s':" % ad)
        y.append("    '%s'," % veri[ad])
    y.append('}')
    y.append('')
    yol = os.path.join('src', 'data', 'ikonYollari.js')
    io.open(yol, 'w', encoding='utf-8', newline=chr(10)).write(chr(10).join(y))
    print('yazildi:', yol)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
