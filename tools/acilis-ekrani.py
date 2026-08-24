# -*- coding: utf-8 -*-
"""Android açılış ekranını (splash) PAKSAN markasıyla üretir.

SORUN. Capacitor projeyi kurarken kendi varsayılan görselini bırakmış:
beyaz zeminde açık mavi bir "X". APK'yı açan kullanıcı, uygulama
yüklenene kadar PAKSAN yerine onu görüyordu.

ÇÖZÜM. Uygulamanın karşılama sahnesiyle aynı dili konuşan bir açılış
ekranı: koyu lacivert gökyüzü, ufka doğru ısınan turuncu, ortada
PAKSAN yazısı. Sahnedeki güneşin durduğu yere denk gelen yumuşak bir
turuncu parıltı var.

NEDEN ANİMASYON YOK. Açılış ekranı işletim sisteminin gösterdiği tek
kare bir görsel; hareket edemiyor. Gün doğumu animasyonu uygulama
açıldıktan sonra karşılama ekranında oynuyor. İkisi aynı renk ve
düzende olduğu için geçiş kesintisiz duruyor.

Her yoğunluk için ayrı boyut üretiliyor; boyutlar Capacitor'ın
bıraktığı dosyalardan okunuyor, böylece yeni bir yoğunluk eklenirse
elle liste güncellemek gerekmiyor.

Kullanım:  python tools/acilis-ekrani.py
"""
import glob
import os

from PIL import Image, ImageDraw

KOK = 'android/app/src/main/res'
LOGO = 'src/assets/marka/paksan-logo.png'

# Karşılama sahnesindeki gökyüzü ile aynı duraklar
GOK = [
    (0.00, (6, 15, 33)),
    (0.42, (13, 33, 72)),
    (0.66, (42, 61, 99)),
    (0.84, (122, 74, 42)),
    (1.00, (184, 90, 30)),
]


def renk(oran):
    """Duraklar arasında düz geçiş."""
    for i in range(len(GOK) - 1):
        a, ra = GOK[i]
        b, rb = GOK[i + 1]
        if a <= oran <= b:
            t = 0 if b == a else (oran - a) / (b - a)
            return tuple(round(ra[k] + (rb[k] - ra[k]) * t) for k in range(3))
    return GOK[-1][1]


def uret(en, boy, logo):
    im = Image.new('RGB', (en, boy))
    ciz = ImageDraw.Draw(im)

    # Gökyüzü
    for y in range(boy):
        ciz.line([(0, y), (en, y)], fill=renk(y / max(1, boy - 1)))

    # Güneşin parıltısı — sahnede güneşin durduğu yere denk geliyor.
    # Yumuşak geçiş için birden çok saydam halka üst üste biniyor.
    gx, gy = en // 2, round(boy * 0.72)
    yaricap = round(min(en, boy) * 0.34)
    parilti = Image.new('RGBA', (en, boy), (0, 0, 0, 0))
    pciz = ImageDraw.Draw(parilti)
    adim = 46
    for i in range(adim, 0, -1):
        r = round(yaricap * i / adim)
        saydam = round(30 * (1 - i / adim) ** 1.7)
        pciz.ellipse([gx - r, gy - r, gx + r, gy + r], fill=(232, 100, 26, saydam))
    im = Image.alpha_composite(im.convert('RGBA'), parilti).convert('RGB')

    # PAKSAN yazısı — kısa kenarın yarısı kadar genişlikte, ortada
    hedef_en = round(min(en, boy) * 0.52)
    oran = hedef_en / logo.width
    l = logo.resize((hedef_en, round(logo.height * oran)), Image.LANCZOS)
    im.paste(l, ((en - l.width) // 2, round(boy * 0.44) - l.height // 2), l)
    return im


def main():
    logo = Image.open(LOGO).convert('RGBA')
    # Logo koyu zeminde beyaz olmalı; kaynak dosya koyu renkli.
    beyaz = Image.new('RGBA', logo.size, (255, 255, 255, 255))
    beyaz.putalpha(logo.getchannel('A'))
    logo = beyaz

    dosyalar = glob.glob(os.path.join(KOK, 'drawable*', 'splash.png'))
    assert dosyalar, 'splash dosyası bulunamadı'

    for yol in sorted(dosyalar):
        en, boy = Image.open(yol).size
        uret(en, boy, logo).save(yol, 'PNG', optimize=True)
        print('%-46s %dx%d  %.0f KB' % (
            os.path.relpath(yol, KOK), en, boy, os.path.getsize(yol) / 1024))


if __name__ == '__main__':
    main()
