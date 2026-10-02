package com.paksanmakina.app;

import android.Manifest;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/* ==========================================================================
   Mikrofon izni (30 Eylül 2026)

   Gizlilik ve İzinler sayfası mikrofon izninin bugünkü durumunu
   gösteriyor ve "İzin Ver" ile telefonun izin penceresini açıyor.
   Kullanıcının itirazı: "listelenen izinler için herhangi bir izin
   alınmıyor … tıklandığında da izin alma ekranı gelmiyor".

   Eklentinin kendi yöntemi yok: Capacitor'ın her eklentiye verdiği
   checkPermissions / requestPermissions yetiyor, izin burada adıyla
   (`mikrofon`) tanımlanıyor. Ses kaydının kendisi eklentiden geçmiyor;
   WebView'un getUserMedia'sı aynı izni kullanıyor.

   JS TARAFI: src/lib/mikrofonIzni.js. Aynı dosya android-servis'te de
   var (Servisim'in kendi paketinde).
   ========================================================================== */
@CapacitorPlugin(
    name = "MikrofonIzni",
    permissions = { @Permission(alias = "mikrofon", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class MikrofonIzniPlugin extends Plugin {}
