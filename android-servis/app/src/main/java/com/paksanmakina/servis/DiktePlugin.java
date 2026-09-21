package com.paksanmakina.servis;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;

/* ==========================================================================
   Sesle yazma — telefonun kendi Türkçe ses tanıması

   NEDEN YEREL BİR EKLENTİ

   Tarayıcıdaki ses tanıma (webkitSpeechRecognition) Android'in WebView'ında
   yok; APK'nın içinde çalışmıyor. Android'in SpeechRecognizer'ı ise her
   telefonda hazır: sunucu, anahtar ya da ücret gerekmiyor.

   NEDEN npm PAKETİ DEĞİL

   Capacitor npm'den kurulan eklentiyi iki Android projesine birden
   bağlıyor (android/ ve android-servis/). Sesle yazma yalnız Servisim'in
   özelliği; bu sınıf yalnız bu klasörde duruyor ve MainActivity'de
   elle kaydediliyor. PAKSAN Connect'e girmiyor.

   SES SAKLANMIYOR. Tanıma telefonun hizmetinde yapılıyor, uygulamaya
   yalnız yazı dönüyor.

   DİNLEME KULLANICI DURDURANA KADAR SÜRÜYOR (18 Eylül 2026, kullanıcının
   isteği: "en ufak ses kesilmesinde dikteyi kapatıyor; dikteyi kullanıcı
   kendi kapatması gerekmez mi işi bittiğinde?").

   Android'in SpeechRecognizer'ı TEK CÜMLELİK çalışır: konuşma durunca
   onResults verip oturumu bitirir, uzun sessizlikte de hata 6/7 atar.
   Eskiden ikisi de dikteyi kapatıyordu — teknisyen iki cümle arasında
   nefes alınca düğmeye yeniden basmak zorunda kalıyordu. Tarlada,
   eldivenle, elleri doluyken.

   Şimdi: gelen her cümle "sonuc" olarak yazıya ekleniyor ve dinleme
   YENİDEN başlatılıyor. Sessizlik hatası (6/7) duraklamanın kendisidir,
   ekrana uyarı olarak çıkmıyor. Oturum yalnız üç şeyle bitiyor:
   kullanıcı "Durdur" dedi, gerçek bir hata oldu (izin/internet), ya da
   sessizlik sınırı doldu.

   SESSİZLİK SINIRI bir güvenlik valfi: unutulan mikrofon sonsuza kadar
   açık kalmasın diye. Konuşulduğu anda sıfırlanıyor.

   JS TARAFI: src/servis/dikteMotoru.js → olaylar "kismi", "sonuc", "hata",
   "bitti". "sonuc" artık bir oturumda BİRDEN ÇOK KEZ gelebiliyor; JS
   tarafı onları üst üste ekliyor (Dikte.jsx → onSonuc). Hata kodları
   orada ekrandaki uyarıya çevriliyor.
   ========================================================================== */
@CapacitorPlugin(
    name = "Dikte",
    permissions = { @Permission(alias = "mikrofon", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class DiktePlugin extends Plugin {

    /* Sessizlikte dinlemeye devam edilecek en uzun süre. Konuşulduğu an
       sıfırlanıyor; yani "iki dakika hiç ses gelmezse kapan" demek.
       Teknisyen makineye bakarken düşünmek için duraklayabilir — kısa
       bir sınır özelliği yeniden işe yaramaz hâle getirirdi. */
    private static final long SESSIZ_SINIR_MS = 120_000L;

    /* Android bazı cihazlarda hemen yeniden başlatılınca ERROR_RECOGNIZER_BUSY
       veriyor; araya kısa bir soluk konuyor. */
    private static final long YENIDEN_BASLAMA_MS = 250L;

    private SpeechRecognizer taniyici;
    private Intent istek;
    private final android.os.Handler saat = new android.os.Handler(android.os.Looper.getMainLooper());

    /* Durdurduktan sonra telefon ne sonuç ne hata verirse ekran
       "dinliyor" durumunda asılı kalırdı. Bu süre sonunda oturum zorla
       kapatılıyor. */
    private static final long DURDURMA_SABRI_MS = 3_000L;

    /** Kullanıcı "Durdur" dedi mi? Dedi ise yeniden başlatılmıyor. */
    private boolean kullaniciDurdurdu = false;
    /** "bitti" bir oturumda BİR KEZ yayılıyor. */
    private boolean bittiYayildi = false;
    /** En son ne zaman gerçekten bir şey söylendi. */
    private long sonSes = 0L;

    /** Oturumu kapatır ve "bitti"yi bir kez yayar. */
    private void bitirVeYay() {
        if (bittiYayildi) return;
        bittiYayildi = true;
        birak();
        notifyListeners("bitti", new JSObject());
    }

    @PluginMethod
    public void durum(PluginCall call) {
        JSObject sonuc = new JSObject();
        sonuc.put("kullanilabilir", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(sonuc);
    }

    @PluginMethod
    public void baslat(PluginCall call) {
        if (getPermissionState("mikrofon") != PermissionState.GRANTED) {
            call.reject("izin", "izin");
            return;
        }
        final String dil = call.getString("dil", "tr-TR");

        /* SpeechRecognizer yalnız ana iş parçacığında kurulup
           çalıştırılabiliyor. */
        getActivity().runOnUiThread(() -> {
            birak();
            kullaniciDurdurdu = false;
            bittiYayildi = false;
            sonSes = System.currentTimeMillis();

            istek = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE, dil);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, dil);
            istek.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            istek.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            istek.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

            if (dinlemeyeBasla()) call.resolve();
            else call.reject("baslatilamadi", "baslatilamadi");
        });
    }

    /**
     * Tanıyıcıyı kurup dinlemeyi başlatır. Yeniden başlatmada da aynı yol
     * kullanılıyor: tanıyıcı her turda yeniden kuruluyor çünkü onResults
     * sonrası aynı örneği yeniden kullanmak bazı cihazlarda
     * ERROR_RECOGNIZER_BUSY veriyor.
     */
    private boolean dinlemeyeBasla() {
        try {
            birak();
            taniyici = SpeechRecognizer.createSpeechRecognizer(getContext());
            taniyici.setRecognitionListener(new Dinleyici());
            taniyici.startListening(istek);
            return true;
        } catch (Exception e) {
            birak();
            return false;
        }
    }

    /**
     * Duraklamadan sonra dinlemeye devam.
     * Kullanıcı durdurduysa ya da sessizlik sınırı dolduysa oturum biter.
     */
    private void devamEtVeyaBitir() {
        if (kullaniciDurdurdu || System.currentTimeMillis() - sonSes > SESSIZ_SINIR_MS) {
            bitirVeYay();
            return;
        }
        saat.postDelayed(() -> {
            if (kullaniciDurdurdu) return;
            if (!dinlemeyeBasla()) bitirVeYay();
        }, YENIDEN_BASLAMA_MS);
    }

    /* Konuşmayı bitir: söylenen o ana kadarki kısım yine yazıya dönüyor.
       Bayrak ÖNCE konuyor — stopListening'in tetiklediği onResults
       yeniden başlatmasın diye. */
    @PluginMethod
    public void durdur(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            kullaniciDurdurdu = true;
            if (taniyici != null) {
                try {
                    taniyici.stopListening();
                } catch (Exception ignored) {
                    bitirVeYay();
                }
            }
            /* Telefon sessiz kalırsa oturum burada kapanır; ekran
               "dinliyor"da asılı kalmaz. */
            saat.postDelayed(DiktePlugin.this::bitirVeYay, DURDURMA_SABRI_MS);
            call.resolve();
        });
    }

    /* Ekran kapanırken: sonuç beklenmeden bırak. */
    @PluginMethod
    public void iptal(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            kullaniciDurdurdu = true;
            birak();
            call.resolve();
        });
    }

    /* Uygulama arka plana geçince mikrofon açık kalmıyor. */
    @Override
    protected void handleOnPause() {
        getActivity().runOnUiThread(() -> {
            if (taniyici != null) {
                kullaniciDurdurdu = true;
                bitirVeYay();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        kullaniciDurdurdu = true;
        birak();
    }

    private void birak() {
        saat.removeCallbacksAndMessages(null);
        if (taniyici == null) return;
        try {
            taniyici.cancel();
            taniyici.destroy();
        } catch (Exception ignored) {
            // Tanıyıcı zaten kapanmış olabilir.
        }
        taniyici = null;
    }

    private static String ilkMetin(Bundle paket) {
        if (paket == null) return "";
        ArrayList<String> liste = paket.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return (liste == null || liste.isEmpty()) ? "" : liste.get(0);
    }

    /* Android hata kodları → ekrandaki uyarı.
       1 ağ zaman aşımı, 2 ağ, 4 sunucu, 11 sunucu bağlantısı koptu,
       13 dil şu an kullanılamıyor (çevrimdışı paket yok) → internet.
       9 izin yok → izin. Geri kalanı → başlatılamadı.

       6 (konuşma gelmedi), 7 (eşleşme yok) ve 8 (tanıyıcı meşgul) BURAYA
       HİÇ GELMİYOR: onError onları duraklama sayıp dinlemeye devam
       ediyor. 'anlasilamadi' karşılığı JS tarafında duruyor çünkü
       tarayıcı yolu hâlâ üretebiliyor. */
    private static String hataKodu(int kod) {
        switch (kod) {
            case 1:
            case 2:
            case 4:
            case 11:
            case 13:
                return "internet";
            case 6:
            case 7:
                return "anlasilamadi";
            case 9:
                return "izin";
            default:
                return "baslatilamadi";
        }
    }

    private class Dinleyici implements RecognitionListener {

        @Override
        public void onReadyForSpeech(Bundle params) {
            notifyListeners("hazir", new JSObject());
        }

        /* Konuşma başladı: sessizlik sayacı sıfırlanıyor. */
        @Override
        public void onBeginningOfSpeech() {
            sonSes = System.currentTimeMillis();
        }

        @Override
        public void onRmsChanged(float rmsdB) {}

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {}

        @Override
        public void onError(int error) {
            /* SESSİZLİK HATA DEĞİL, DURAKLAMADIR.

               6 (konuşma gelmedi) ve 7 (eşleşme yok) teknisyen iki cümle
               arasında sustuğunda geliyor; 8 (tanıyıcı meşgul) ise
               yeniden başlatma çakışması. Üçü de ekrana uyarı olarak
               çıkmıyor ve oturumu bitirmiyor — dinlemeye devam ediliyor.
               Gerçekten susulup kalındıysa sessizlik sınırı devreye
               giriyor (bkz. devamEtVeyaBitir). */
            if (error == 6 || error == 7 || error == 8) {
                devamEtVeyaBitir();
                return;
            }
            JSObject veri = new JSObject();
            veri.put("kod", hataKodu(error));
            notifyListeners("hata", veri);
            bitirVeYay();
        }

        @Override
        public void onResults(Bundle results) {
            String metin = ilkMetin(results);
            if (!metin.isEmpty()) {
                sonSes = System.currentTimeMillis();
                JSObject veri = new JSObject();
                veri.put("metin", metin);
                notifyListeners("sonuc", veri);
            }
            /* Cümle bitti diye dikte bitmiyor: yazı eklendi, dinleme
               sürüyor. JS tarafı "sonuc"u üst üste ekliyor. */
            devamEtVeyaBitir();
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            String metin = ilkMetin(partialResults);
            if (metin.isEmpty()) return;
            sonSes = System.currentTimeMillis();
            JSObject veri = new JSObject();
            veri.put("metin", metin);
            notifyListeners("kismi", veri);
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
