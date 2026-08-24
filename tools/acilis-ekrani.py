# -*- coding: utf-8 -*-
"""Android açılış ekranını (splash) PAKSAN markasıyla üretir.

SORUN. Capacitor projeyi kurarken kendi varsayılan görselini bırakmış:
beyaz zeminde açık mavi bir "X". APK'yı açan kullanıcı, uygulama
yüklenene kadar PAKSAN yerine onu görüyordu.

ÇÖZÜM. Uygulamanın karşılama sahnesiyle aynı dili konuşan bir açılış
ekranı: koyu lacivert gökyüzü, ufka doğru ısınan turuncu, ortada
beyaz daire içinde PAKSAN amblemi ve altında PAKSAN yazısı. Sahnedeki
güneşin durduğu yere denk gelen yumuşak bir turuncu parıltı var.

AMBLEM NEDEN BEYAZ DAİRE İÇİNDE. Önce logo dosyasının tamamı beyaza
çevrilip konuyordu. Kalkan amblemi çok renkli; beyaza çevrilince
ayrıntıları kaybolup tanınmaz bir lekeye dönüşüyordu. Beyaz daire
amblemi kendi renkleriyle bırakıyor. Karşılama sahnesinde de aynısı
yapılıyor, ikisi birebir örtüşüyor.

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
AMBLEM = 'src/assets/marka/paksan-amblem.png'

# Logo dosyası (225x69) iki parça: 0-48 amblem, 54-225 "paksan" yazısı.
# Buradan yalnız yazı kırpılıyor; amblem ayrı dosyadan, tam renkli
# geliyor (bkz. src/components/Marka.jsx).
YAZI_X = 54

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


def uret(en, boy, yazi, amblem):
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

    # Marka bloğu: amblem üstte beyaz daire içinde, yazı altında.
    # Oranlar karşılama sahnesindekiyle aynı (64 / 12 / 50 piksel).
    kisa = min(en, boy)
    cap = round(kisa * 0.20)
    bosluk = round(kisa * 0.035)
    yazi_en = round(kisa * 0.34)
    yazi_boy = round(yazi.height * yazi_en / yazi.width)

    blok = cap + bosluk + yazi_boy
    ust = round(boy * 0.42) - blok // 2

    # Beyaz daire
    daire = Image.new('RGBA', (cap, cap), (0, 0, 0, 0))
    ImageDraw.Draw(daire).ellipse([0, 0, cap - 1, cap - 1], fill=(255, 255, 255, 255))
    # Amblem dairenin içinde, kenarlarda pay bırakarak
    a_en = round(cap * 0.72)
    a = amblem.resize((a_en, round(amblem.height * a_en / amblem.width)), Image.LANCZOS)
    daire.paste(a, ((cap - a.width) // 2, (cap - a.height) // 2), a)
    im.paste(daire, ((en - cap) // 2, ust), daire)

    # PAKSAN yazısı
    y = yazi.resize((yazi_en, yazi_boy), Image.LANCZOS)
    im.paste(y, ((en - yazi_en) // 2, ust + cap + bosluk), y)
    return im


def main():
    # Yazı: logo dosyasından kırpılıp beyaza çevriliyor. Koyu gökyüzünde
    # yazının beyaz olması gerekiyor, kaynak dosya koyu renkli.
    logo = Image.open(LOGO).convert('RGBA')
    yazi = logo.crop((YAZI_X, 0, logo.width, logo.height))
    beyaz = Image.new('RGBA', yazi.size, (255, 255, 255, 255))
    beyaz.putalpha(yazi.getchannel('A'))
    yazi = beyaz

    # Amblem tam renkli kalıyor; beyaz dairenin içine giriyor.
    amblem = Image.open(AMBLEM).convert('RGBA')

    dosyalar = glob.glob(os.path.join(KOK, 'drawable*', 'splash.png'))
    assert dosyalar, 'splash dosyası bulunamadı'

    for yol in sorted(dosyalar):
        en, boy = Image.open(yol).size
        uret(en, boy, yazi, amblem).save(yol, 'PNG', optimize=True)
        print('%-46s %dx%d  %.0f KB' % (
            os.path.relpath(yol, KOK), en, boy, os.path.getsize(yol) / 1024))


if __name__ == '__main__':
    main()
