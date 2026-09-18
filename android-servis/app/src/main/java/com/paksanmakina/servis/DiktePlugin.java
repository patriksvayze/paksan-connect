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

   JS TARAFI: src/servis/dikteMotoru.js → olaylar "kismi", "sonuc", "hata",
   "bitti". Hata kodları orada ekrandaki uyarıya çevriliyor.
   ========================================================================== */
@CapacitorPlugin(
    name = "Dikte",
    permissions = { @Permission(alias = "mikrofon", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class DiktePlugin extends Plugin {

    private SpeechRecognizer taniyici;

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
            try {
                taniyici = SpeechRecognizer.createSpeechRecognizer(getContext());
            } catch (Exception e) {
                call.reject("baslatilamadi", "baslatilamadi");
                return;
            }
            taniyici.setRecognitionListener(new Dinleyici());

            Intent istek = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE, dil);
            istek.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, dil);
            istek.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            istek.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            istek.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

            try {
                taniyici.startListening(istek);
                call.resolve();
            } catch (Exception e) {
                birak();
                call.reject("baslatilamadi", "baslatilamadi");
            }
        });
    }

    /* Konuşmayı bitir: söylenen o ana kadarki kısım yine yazıya dönüyor. */
    @PluginMethod
    public void durdur(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (taniyici != null) {
                try {
                    taniyici.stopListening();
                } catch (Exception ignored) {
                    birak();
                }
            }
            call.resolve();
        });
    }

    /* Ekran kapanırken: sonuç beklenmeden bırak. */
    @PluginMethod
    public void iptal(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            birak();
            call.resolve();
        });
    }

    /* Uygulama arka plana geçince mikrofon açık kalmıyor. */
    @Override
    protected void handleOnPause() {
        getActivity().runOnUiThread(() -> {
            if (taniyici != null) {
                birak();
                notifyListeners("bitti", new JSObject());
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        birak();
    }

    private void birak() {
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

    /* Android hata kodları → ekrandaki dört uyarı.
       1 ağ zaman aşımı, 2 ağ, 4 sunucu, 11 sunucu bağlantısı koptu,
       13 dil şu an kullanılamıyor (çevrimdışı paket yok) → internet.
       6 konuşma gelmedi, 7 eşleşme yok → anlaşılamadı.
       9 izin yok → izin. Geri kalanı → başlatılamadı. */
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

        @Override
        public void onBeginningOfSpeech() {}

        @Override
        public void onRmsChanged(float rmsdB) {}

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {}

        @Override
        public void onError(int error) {
            birak();
            JSObject veri = new JSObject();
            veri.put("kod", hataKodu(error));
            notifyListeners("hata", veri);
            notifyListeners("bitti", new JSObject());
        }

        @Override
        public void onResults(Bundle results) {
            JSObject veri = new JSObject();
            veri.put("metin", ilkMetin(results));
            birak();
            notifyListeners("sonuc", veri);
            notifyListeners("bitti", new JSObject());
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            String metin = ilkMetin(partialResults);
            if (metin.isEmpty()) return;
            JSObject veri = new JSObject();
            veri.put("metin", metin);
            notifyListeners("kismi", veri);
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
