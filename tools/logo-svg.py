# -*- coding: utf-8 -*-
"""PAKSAN yazısını PNG'den SVG'ye çevirir.

NEDEN:

Karşılama ekranındaki logo 225x69 piksellik bir PNG idi. Ekranda
163x50 çiziliyor ama telefonun piksel yoğunluğu 2 kat olduğu için
gerçekte 326x100 piksel gerekiyordu. Yani görsel %44 BÜYÜTÜLEREK
çiziliyordu — bulanıklığın ve kenarlardaki bozuk piksellerin sebebi
buydu.

Yazı tek renkli (#1d50a0) ve saydam zeminli; yani düz bir çizim.
Böyle bir şey SVG olarak tutulduğunda her boyutta net çıkıyor ve
rengi doğrudan CSS'ten veriliyor — eskiden kullanılan
`filter: brightness(0) invert(1)` hilesine de gerek kalmıyor.

NASIL:

Alfa kanalı eşikleniyor, potrace ile iz sürülüyor. potracer SIFIR
olan bölgeleri iz sürdüğü için maske ters çevriliyor (bu projedeki
ikon hattında da aynı durum vardı, bkz. tools/ikon-svg.py).

KULLANIM:
    python tools/logo-svg.py
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / 'src' / 'assets' / 'marka' / 'paksan-logo.png'
CIKTI = KOK / 'src' / 'data' / 'markaYollari.js'

# Logonun yazı bölümü; kalkan amblemi 0-48 arasında, ona dokunulmuyor.
YAZI_X = 54
# Alfa bu değerin üstündeyse "mürekkep" sayılıyor. Kenar yumuşatma
# piksellerinin izi bozmaması için ortadan yüksek seçildi.
ESIK = 128
# Yükseltme: küçük görselde iz sürmek köşeleri basamaklı çıkarıyor.
# Önce büyütülüyor, iz sürülüyor, sonra koordinatlar geri ölçekleniyor.
BUYUTME = 8


def yol_metni(egri, olcek):
    """potrace eğrisini SVG path verisine çevirir."""
    parcalar = []
    for e in egri:
        b = e.start_point
        parcalar.append(f'M{b.x / olcek:.2f} {b.y / olcek:.2f}')
        for parca in e:
            if parca.is_corner:
                k, s = parca.c, parca.end_point
                parcalar.append(f'L{k.x / olcek:.2f} {k.y / olcek:.2f}')
                parcalar.append(f'L{s.x / olcek:.2f} {s.y / olcek:.2f}')
            else:
                a, b2, s = parca.c1, parca.c2, parca.end_point
                parcalar.append(
                    f'C{a.x / olcek:.2f} {a.y / olcek:.2f}'
                    f' {b2.x / olcek:.2f} {b2.y / olcek:.2f}'
                    f' {s.x / olcek:.2f} {s.y / olcek:.2f}'
                )
        parcalar.append('Z')
    return ''.join(parcalar)


def main():
    im = Image.open(KAYNAK).convert('RGBA')
    yazi = im.crop((YAZI_X, 0, im.width, im.height))
    g, y = yazi.size

    buyuk = yazi.resize((g * BUYUTME, y * BUYUTME), Image.LANCZOS)
    alfa = np.array(buyuk.split()[-1])
    dolu = alfa > ESIK

    # potracer SIFIR bölgeleri iz sürüyor; maske ters çevriliyor.
    bitmap = potrace.Bitmap(~dolu)
    yol = bitmap.trace()

    d = yol_metni(yol, BUYUTME)

    icerik = f'''/* ==========================================================================
   PAKSAN yazısı — SVG yolu

   ELLE YAZILMADI. `python tools/logo-svg.py` üretiyor; kaynağı
   src/assets/marka/paksan-logo.png dosyasının yazı bölümü.

   NEDEN SVG: PNG hâli 225x69 pikseldi ve karşılama ekranında
   326x100 piksel gerekiyordu — yani büyütülerek çiziliyor, bulanık
   ve kenarları bozuk görünüyordu. SVG her boyutta net çıkıyor.

   Renk `fill="currentColor"` ile geliyor; koyu zeminde beyaz yapmak
   için artık görsel filtresi gerekmiyor.
   ========================================================================== */

export const MARKA_YAZI_W = {g}
export const MARKA_YAZI_H = {y}

export const MARKA_YAZI_YOLU =
  '{d}'
'''
    CIKTI.write_text(icerik, encoding='utf-8')
    print(f'kaynak      : {KAYNAK.name} ({im.width}x{im.height})')
    print(f'yazı bölümü : {g}x{y}')
    print(f'iz süresi   : {BUYUTME}x büyütülerek')
    print(f'yol uzunluğu: {len(d)} karakter')
    print(f'yazıldı     : {CIKTI.relative_to(KOK)}')


if __name__ == '__main__':
    main()
