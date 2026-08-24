# -*- coding: utf-8 -*-
"""Üretilen görselleri uygulamaya hazırlar.

ÜRETİLEN GÖRSEL DOĞRUDAN KULLANILAMIYOR. İki sorunu var:

  1. Konu karenin ortasında küçük duruyor, çevresi kocaman beyaz.
     Boş ekranda 140 piksele küçültülünce konu 50 piksel kalıyor.
  2. Zemin düz beyaz. Karanlık modda koyu sayfanın ortasında parlak bir
     kare olarak duruyor.

Bu betik ikisini de çözüyor:

  KIRPMA      Kenarlardaki boş alan atılıyor, konunun etrafında ölçülü
              bir pay bırakılıyor.
  SAYDAMLIK   Zemin saydam yapılıyor ama YALNIZ KENARDAN YAYILARAK.
              Düz "beyaz olan her pikseli sil" demek, makinenin
              içindeki açık gri dolguları da silerdi; gövde delik
              deşik olurdu. Kenardan başlayan yayılma yalnız dışarıdaki
              zemine ulaşıyor, içerideki dolgulara dokunmuyor.

Kullanım:  python tools/gorsel-hazirla.py girdi.png cikti.png
"""
import sys
from collections import deque

from PIL import Image

# Zemin sayılacak parlaklık eşiği. Zemin saf beyaz (255); makinenin en
# açık dolgusu #e8edf5 (232,237,245). Eşik ikisinin arasında.
ESIK = 246

# Konunun etrafında bırakılan pay — görselin kısa kenarının yüzdesi.
PAY_ORANI = 0.06


def zemini_sec(im):
    """Kenardan yayılarak zemin piksellerini işaretler."""
    en, boy = im.size
    px = im.load()
    zemin = bytearray(en * boy)
    sira = deque()

    def parlak(x, y):
        r, g, b = px[x, y][:3]
        return r >= ESIK and g >= ESIK and b >= ESIK

    # Dört kenardaki parlak pikseller başlangıç noktası
    for x in range(en):
        for y in (0, boy - 1):
            if parlak(x, y) and not zemin[y * en + x]:
                zemin[y * en + x] = 1
                sira.append((x, y))
    for y in range(boy):
        for x in (0, en - 1):
            if parlak(x, y) and not zemin[y * en + x]:
                zemin[y * en + x] = 1
                sira.append((x, y))

    while sira:
        x, y = sira.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < en and 0 <= ny < boy and not zemin[ny * en + nx]:
                if parlak(nx, ny):
                    zemin[ny * en + nx] = 1
                    sira.append((nx, ny))
    return zemin


def hazirla(girdi, cikti):
    im = Image.open(girdi).convert('RGBA')
    en, boy = im.size
    zemin = zemini_sec(im)

    # Saydamlık
    px = im.load()
    for y in range(boy):
        satir = y * en
        for x in range(en):
            if zemin[satir + x]:
                px[x, y] = (255, 255, 255, 0)

    # Kırpma — konunun sınırları
    sinir = im.getbbox()
    if not sinir:
        raise SystemExit('gorsel bos cikti')
    im = im.crop(sinir)

    # Ölçülü pay
    pay = int(min(im.size) * PAY_ORANI)
    genis = Image.new('RGBA', (im.width + pay * 2, im.height + pay * 2), (255, 255, 255, 0))
    genis.paste(im, (pay, pay))

    # Uygulama için makul boyut; en fazla 720 piksel yeter
    if max(genis.size) > 720:
        oran = 720 / max(genis.size)
        genis = genis.resize(
            (round(genis.width * oran), round(genis.height * oran)),
            Image.LANCZOS,
        )

    # Palete indirme. Düz renkli çizimde gözle fark edilmiyor ama
    # dosya on kat küçülüyor: 101 KB -> 8 KB. Uygulama internetsiz
    # çalışıyor ve APK'nın içinde taşınıyor, her kilobayt önemli.
    genis = genis.quantize(colors=32, method=Image.FASTOCTREE)

    genis.save(cikti, 'PNG', optimize=True)
    import os
    print('%s -> %s  (%dx%d, %.1f KB)' % (
        girdi, cikti, genis.width, genis.height, os.path.getsize(cikti) / 1024))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('kullanim: python tools/gorsel-hazirla.py girdi.png cikti.png')
    hazirla(sys.argv[1], sys.argv[2])
