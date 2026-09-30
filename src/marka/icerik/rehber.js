/* ==========================================================================
   Bakım rehberleri

   Üç rehber var: günlük, sezon öncesi, sezon sonu. Her makine için ayrı
   rehber yazılmıyor — bu hem çok fazla metin olurdu hem de bakımı
   yapacak kişi için gereksiz. Bunun yerine her rehberin iki katmanı var:

     ortak    → hangi makine olursa olsun geçerli adımlar
     gruplar  → makinenin türüne göre değişen adımlar
                (balya, rulo, yem, silaj, cayir, toprak)

   Ekranda önce ortak adımlar, sonra seçilen makinenin türüne ait adımlar
   gösteriliyor. Makine seçilmemişse yalnızca ortak kısım görünüyor.

   Grup adları products.js içindeki supportGroup() ile aynı — yeni ürün
   eklendiğinde burada bir şey değişmesi gerekmez.

   ⚠ İçerik genel tarım makinesi bakım bilgisine göre yazıldı.
   Servis ekibiniz okuyup onaylamalı; modele özel değerler (tork, yağ
   tipi, gres aralığı) eklenirse rehber çok daha faydalı olur.
   ========================================================================== */

import { REHBER_EN, REHBER_GUVENLIK_EN } from './rehber.en'

/* Her rehberin başında çıkan güvenlik uyarısı — hiçbir koşulda
   atlanmaması gereken tek madde. */
export const REHBER_GUVENLIK =
  'Bakıma başlamadan önce traktörü durdurun, kuyruk milini (PTO) kapatın, ' +
  'kontağı kapatıp anahtarı üzerinizde bulundurun ve hareketli parçalar ' +
  'tamamen durana kadar bekleyin. Makinenin altına girmeniz gerekiyorsa ' +
  'mutlaka sehpa veya takoz kullanın; hidrolik desteğe güvenmeyin.'

export const REHBERLER = [
  /* ------------------------------------------------------------ GÜNLÜK */
  {
    id: 'gunluk',
    baslik: 'Günlük Bakım',
    ozet: 'Her çalışma gününe başlamadan önce, 10–15 dakika',
    neZaman: 'Her gün, tarlaya çıkmadan önce',
    /* Ana sayfada hangi ayda öne çıkacağı — sezon içi aylar */
    aylar: [5, 6, 7, 8, 9, 10],
    ortak: [
      {
        baslik: 'Kontrol',
        maddeler: [
          'Makinenin çevresini dolaşın; gevşemiş, sarkmış veya kırılmış bir parça var mı bakın.',
          'Cıvata ve somunların yerinde olduğunu kontrol edin. Gevşeyen varsa sıkın.',
          'Yağ, gres veya hidrolik kaçağı olup olmadığına bakın. Yerde damla izi varsa kaynağını bulun.',
          'Tüm koruma kapaklarının ve mafsal koruyucularının takılı olduğundan emin olun.',
        ],
      },
      {
        baslik: 'Gresleme',
        maddeler: [
          'Gres noktalarının tamamına gres basın. Eski gres dışarı çıkana kadar devam edin.',
          'Gres tabancasının ucunu her seferinde silin; toprak ve toz yatağın içine girmesin.',
          'Mafsal (kardan) koruyucusunun içindeki noktaları unutmayın.',
        ],
      },
      {
        baslik: 'Bağlantı ve emniyet',
        maddeler: [
          'Çeki okunu ve pimin emniyet mandalını kontrol edin.',
          'Kuyruk mili mafsalının traktör tarafında ve makine tarafında tam oturduğundan emin olun.',
          'Hidrolik hortumlarında ezilme, çatlak veya sürtme izi olup olmadığına bakın.',
          'Karayolunda taşıyacaksanız reflektör ve işaret lambalarını kontrol edin.',
        ],
      },
      {
        baslik: 'Gün sonunda — makineyi MUTLAKA temizleyin',
        vurgu: true,
        giris:
          'Makineyi kirli bırakıp kenara çekmek, uzun vadede en pahalı alışkanlıktır. ' +
          'Üzerinde kalan sap, ot ve toprak nem tutar; nem paslanmayı başlatır, ' +
          'yataklara ve zincirlere girip aşınmayı hızlandırır. Kurumuş bitki artığı ' +
          'ise bir sonraki çalışmada tıkanmanın ve yangının en sık sebebidir.',
        maddeler: [
          'Her kullanımdan sonra, makineyi kenara çekmeden önce temizleyin. Ertesi güne bırakmayın — kuruyan artığı sökmek çok daha zordur.',
          'Pikap, kesme bölgesi, kanallar ve koruyucuların altındaki sap, ot ve toprak birikintilerini temizleyin.',
          'Sıcak yüzeylerdeki (şanzıman, rulman, egzoz yakını) bitki artıklarını mutlaka alın — yangın burada başlar.',
          'Basınçlı hava varsa tercih edin. Su kullanacaksanız rulman, elektrik bağlantısı ve gres nipellerine doğrudan tutmayın.',
          'Islak temizlik yaptıysanız makineyi kurutun ve gres noktalarına yeniden gres basın; su gresi yerinden atar.',
          'Ertesi gün için eksilen sarf malzemelerini (ip, ağ, emniyet cıvatası) tamamlayın.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'Balya makinesine özel',
          maddeler: [
            'Düğüm atıcıları basınçlı havayla temizleyin; ip tozu ve sap artığı düğümü bozar.',
            'İp yolunu baştan sona takip edin, takılma yapan nokta var mı bakın.',
            'İp gerginliğini kontrol edin. Balya gevşek çıkıyorsa ilk bakılacak yer burasıdır.',
            'Pikap parmaklarını sayın; kırık veya eğik olanları değiştirin.',
            'Piston bıçağı ile karşı bıçak arasındaki boşluğu gözle kontrol edin.',
            'Yedek emniyet cıvatası ve ip bulundurun.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'Rulo balya makinesine özel',
          maddeler: [
            'Ağ sarma bölgesini temizleyin; sap artığı ağın düzgün açılmasını engeller.',
            'Ağ rulosunun yerinde ve gergin olduğundan emin olun.',
            'Kapak kilit mekanizmasını ve hidrolik silindiri kontrol edin.',
            'Sıkıştırma kayışlarında yırtık, çatlak veya kaçık dikiş var mı bakın.',
            'Pikap parmaklarını ve yaylarını kontrol edin.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'Yem karma makinesine özel',
          maddeler: [
            'Helezon üzerindeki bıçakların körelip körelmediğine bakın; kör bıçak karışımı bozar.',
            'Kazan içinde yabancı cisim (tel, taş, demir) kalmadığından emin olun.',
            'Boşaltma bandını ve kapağını temizleyin, hareketini kontrol edin.',
            'Tartı sisteminin sıfırda olduğunu doğrulayın.',
            'Hidrolik yağ seviyesine bakın.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'Silaj makinesine özel',
          maddeler: [
            'Bıçakları bileyin. Silaj makinesinde günlük bakımın en önemli maddesi budur.',
            'Karşı bıçak boşluğunu ayarlayın; boşluk büyüdükçe kesme boyu uzar ve güç tüketimi artar.',
            'Bıçak cıvatalarının torkunu kontrol edin.',
            'Kesme kanalını ve üfleyici bölgesini temizleyin.',
            'Kayış gerginliğini kontrol edin.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'Çayır ve ot makinesine özel',
          maddeler: [
            'Kesici bıçak veya parmakların keskinliğini ve kırık olup olmadığını kontrol edin.',
            'Bıçak cıvatalarını sıkın.',
            'Tırmık parmaklarında eksik olup olmadığına bakın.',
            'Kesim yüksekliği ayarını tarlaya göre gözden geçirin.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'Toprak işleme makinesine özel',
          maddeler: [
            'Bıçak, keski ve uç demirlerinin aşınmasına bakın; aşınmış uç yakıt tüketimini artırır.',
            'Kırık bıçak varsa çalışmadan önce mutlaka değiştirin — dengesizlik rulmanları bozar.',
            'Bıçak cıvatalarının torkunu kontrol edin.',
            'Yan şanzıman yağ seviyesine bakın.',
            'Çalışma derinliği ayarını kontrol edin.',
          ],
        },
      ],
    },
  },

  /* ----------------------------------------------------- SEZON ÖNCESİ */
  {
    id: 'sezon-oncesi',
    baslik: 'Sezon Öncesi Bakım',
    ozet: 'Sezon açılmadan 2–3 hafta önce, yarım gün ayırın',
    neZaman: 'İlkbaharda, ilk işe başlamadan önce',
    aylar: [2, 3, 4],
    ortak: [
      {
        baslik: 'Depodan çıkarırken',
        maddeler: [
          'Makinenin üzerindeki örtüyü alın, kuş ve kemirgen yuvası olup olmadığına bakın.',
          'Kabloları ve hortumları kemirgenler kesmiş olabilir; baştan sona kontrol edin.',
          'Pas önleyici sürdüyseniz çalışma yüzeylerinden temizleyin.',
          'Lastik varsa hava basınçlarını kontrol edin.',
        ],
      },
      {
        baslik: 'Yağ ve gres',
        maddeler: [
          'Şanzıman yağ seviyesini kontrol edin; kış boyunca bekleyen yağda su toplanmış olabilir.',
          'Kullanım kılavuzundaki değişim aralığı dolduysa yağı değiştirin.',
          'Tüm gres noktalarına bol gres basın; kışın kuruyan yataklar ilk saatlerde zarar görür.',
          'Zincirleri yağlayın ve gerginliklerini ayarlayın.',
        ],
      },
      {
        baslik: 'Aşınma parçaları',
        maddeler: [
          'Aşınmış parçaları sezon başlamadan değiştirin. Sezon ortasında parça beklemek en pahalı gecikmedir.',
          'Rulmanları elle çevirip ses ve boşluk kontrolü yapın.',
          'Kayış ve zincirlerde çatlak, kopmuş halka veya aşırı uzama var mı bakın.',
          'Emniyet cıvatalarından yedek alın; doğru ölçüde olmayan cıvata makineye zarar verir.',
        ],
      },
      {
        baslik: 'Deneme çalıştırması',
        maddeler: [
          'Tarlaya çıkmadan önce makineyi boşta çalıştırın; anormal ses veya titreşim olup olmadığını kontrol edin.',
          'Hidrolik hareketlerin tamamını sırayla deneyin.',
          'Aydınlatma ve işaret lambalarını kontrol edin.',
          'İlk balyayı yaptıktan veya ilk sırayı tamamladıktan sonra durup sonucu inceleyin; ayar gerekiyorsa şimdi yapın.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'Balya makinesinde',
          maddeler: [
            'Düğüm atıcıları söküp iyice temizleyin; kışın kuruyan gres ve ip tozu düğümü bozar.',
            'İp tutucu yay basınçlarını kontrol edin.',
            'Piston bıçağı ile karşı bıçak arasındaki boşluğu kılavuzdaki değere ayarlayın.',
            'Sezon boyunca ihtiyacınız olan ipi önceden alın; ip kalitesi düğüm başarısını doğrudan etkiler.',
            'Pikap parmaklarının tamamını gözden geçirin.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'Rulo balya makinesinde',
          maddeler: [
            'Sıkıştırma kayışlarını baştan sona kontrol edin, dikişleri gözden geçirin.',
            'Ağ sarma mekanizmasını temizleyip deneyin.',
            'Kapak hidroliğini ve kilit mekanizmasını kontrol edin.',
            'Sezonluk ağ ihtiyacınızı önceden temin edin.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'Yem karma makinesinde',
          maddeler: [
            'Bıçakları kontrol edin, körelmiş olanları değiştirin.',
            'Tartı sistemini kalibre ettirin; kış boyunca sapma olmuş olabilir.',
            'Kazan içindeki aşınma plakalarını gözden geçirin.',
            'Boşaltma bandının gerginliğini ayarlayın.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'Silaj makinesinde',
          maddeler: [
            'Bıçakları bileyin veya değiştirin, karşı bıçağı ayarlayın.',
            'Üfleyici kanatlarının aşınmasına bakın.',
            'Kayışları kontrol edip gerginliklerini ayarlayın.',
            'Streç film kullanıyorsanız sarma ünitesini deneyin.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'Çayır ve ot makinesinde',
          maddeler: [
            'Tüm kesici bıçakları veya parmakları değiştirmeyi düşünün; sezon boyu temiz kesim sağlar.',
            'Tırmık parmaklarının eksiklerini tamamlayın.',
            'Şanzıman yağını kontrol edin.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'Toprak işleme makinesinde',
          maddeler: [
            'Aşınmış bıçak ve uçları sezon başında toplu hâlde değiştirin.',
            'Cıvata torklarını kılavuzdaki değere göre kontrol edin.',
            'Yan şanzıman ve ana şanzıman yağını değiştirin.',
          ],
        },
      ],
    },
  },

  /* -------------------------------------------------------- SEZON SONU */
  {
    id: 'sezon-sonu',
    baslik: 'Sezon Sonu Bakım',
    ozet: 'Makineyi kenara kaldırmadan önce, yarım gün ayırın',
    neZaman: 'Sezon bitince, kışlığa kaldırmadan önce',
    aylar: [11, 12, 1],
    ortak: [
      {
        baslik: 'Temizlik — kışa kirli girmeyin',
        vurgu: true,
        giris:
          'Makine kışı nasıl geçirirse bahara öyle çıkar. Üzerinde kalan sap ve ' +
          'toprak, aylarca nem tutarak paslanmaya yol açar; bahar geldiğinde ' +
          'sökülmeyen cıvata, tutukluk yapan zincir ve çürümüş yatak olarak ' +
          'karşınıza çıkar. Bir günlük temizliği ihmal etmek, bir sezonluk arıza demektir.',
        maddeler: [
          'Makineyi baştan sona temizleyin: kanallar, koruyucu altları, zincir yatakları ve kesme bölgesi dâhil.',
          'Basınçlı su kullanacaksanız rulman, elektrik bağlantısı ve gres nipellerine doğrudan tutmayın.',
          'Yıkadıktan sonra makineyi mutlaka kurutun; ıslak kaldırmayın.',
          'Kuruduktan sonra tüm gres noktalarına gres basın — su gresi yerinden attıysa yatak korumasız kalır.',
        ],
      },
      {
        baslik: 'Koruma',
        maddeler: [
          'Tüm gres noktalarına gres basın; içerideki nemi dışarı iter.',
          'Parlak çalışma yüzeylerine (bıçak, keski, helezon) pas önleyici yağ sürün.',
          'Zincirleri yağlayın.',
          'Hidrolik silindir millerini içeri toplayın veya yağlayın; açıkta kalan mil paslanır.',
        ],
      },
      {
        baslik: 'Gözden geçirme ve not',
        maddeler: [
          'Sezon boyunca sorun çıkaran noktaları şimdi tespit edin.',
          'Değişmesi gereken parçaların listesini çıkarın ve kış boyunca sipariş edin — sezon başında herkes aynı anda ister.',
          'Listeyi uygulamadaki "Yedek Parça" talebiyle şimdiden iletin.',
        ],
      },
      {
        baslik: 'Depolama',
        maddeler: [
          'Mümkünse kapalı ve kuru bir yerde saklayın. Açıkta kalacaksa su geçirmeyen ama nefes alan bir örtü kullanın.',
          'Lastiklerin üzerindeki yükü azaltın; mümkünse makineyi takoza alın.',
          'Kemirgenlere karşı önlem alın; kablo ve hortumlar en çok kışın zarar görür.',
        ],
      },
    ],
    gruplar: {
      balya: [
        {
          baslik: 'Balya makinesinde',
          maddeler: [
            'Düğüm atıcıları temizleyip yağlayın.',
            'Kalan ipi makineden çıkarın; fare yuvası olmasın.',
            'Piston bıçağını koruyucu yağla kaplayın.',
          ],
        },
      ],
      rulo: [
        {
          baslik: 'Rulo balya makinesinde',
          maddeler: [
            'Kayışları gevşetin; kış boyu gergin duran kayış şeklini kaybeder.',
            'Ağ rulosunu makineden çıkarıp kuru yerde saklayın.',
          ],
        },
      ],
      yem: [
        {
          baslik: 'Yem karma makinesinde',
          maddeler: [
            'Kazanı iyice temizleyin; yem artığı kışın küflenip kazanı aşındırır.',
            'Tartı sisteminin yük hücrelerini nemden koruyun.',
          ],
        },
      ],
      silaj: [
        {
          baslik: 'Silaj makinesinde',
          maddeler: [
            'Bıçakları sökmeyip yağlayın; sezon başında bileyerek devam edersiniz.',
            'Kesme kanalını ve üfleyiciyi tamamen temizleyin.',
            'Kayışları gevşetin.',
          ],
        },
      ],
      cayir: [
        {
          baslik: 'Çayır ve ot makinesinde',
          maddeler: [
            'Bıçakları koruyucu yağla kaplayın.',
            'Tırmık parmaklarındaki eksikleri not edin, kış boyunca tamamlayın.',
          ],
        },
      ],
      toprak: [
        {
          baslik: 'Toprak işleme makinesinde',
          maddeler: [
            'Bıçak ve uçları temizleyip yağlayın.',
            'Şanzıman yağ seviyesini kontrol edin.',
            'Makineyi toprakla temas etmeyecek şekilde kaldırın.',
          ],
        },
      ],
    },
  },
]

/* ==========================================================================
   Dil

   İngilizce metinler rehber.en.js dosyasında, aynı yapıda. Bir bölüm
   çevrilmemişse Türkçesi gösteriliyor — rehber hiç boş kalmıyor.

   `id` ve `aylar` gibi teknik alanlar hiç değişmiyor; yalnız görünen
   yazılar değişiyor.
   ========================================================================== */

function rehberCevir(r, dil) {
  if (!r || dil === 'tr') return r
  const en = REHBER_EN[r.id]
  if (!en) return r

  /* Bölümler sırayla eşleşiyor: aynı indeksteki bölüm aynı bölüm.
     Çeviride eksik varsa o bölüm Türkçe kalıyor.

     Türkçe başlık `baslikTr` olarak SAKLANIYOR. Bölüm çizimleri
     Türkçe anahtar kelimeye göre eşleşiyor (bkz. bakimCizimleri.js);
     İngilizce başlıkla eşleştirilseydi hiçbiri tutmaz, İngilizce
     kullanan kullanıcı çizimleri hiç görmezdi. */
  const bolumler = (trList, enList) =>
    (trList || []).map((b, i) => ({
      ...b,
      ...((enList || [])[i] || {}),
      baslikTr: b.baslik,
    }))

  const gruplar = {}
  for (const [grup, liste] of Object.entries(r.gruplar || {})) {
    gruplar[grup] = bolumler(liste, en.gruplar?.[grup])
  }

  return {
    ...r,
    baslik: en.baslik || r.baslik,
    ozet: en.ozet || r.ozet,
    neZaman: en.neZaman || r.neZaman,
    ortak: bolumler(r.ortak, en.ortak),
    gruplar,
  }
}

export function rehberListesi(dil = 'tr') {
  return REHBERLER.map((r) => rehberCevir(r, dil))
}

export function guvenlikMetni(dil = 'tr') {
  return dil === 'tr' ? REHBER_GUVENLIK : REHBER_GUVENLIK_EN
}

export function getRehber(id, dil = 'tr') {
  const r = REHBERLER.find((x) => x.id === id) || null
  return rehberCevir(r, dil)
}

/** İçinde bulunulan aya göre öne çıkan rehber. */
export function mevsimRehberi(ay = new Date().getMonth() + 1) {
  return REHBERLER.find((r) => r.aylar.includes(ay)) || REHBERLER[0]
}
