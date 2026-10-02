package com.paksanmakina.servis;

import android.Manifest;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/* ==========================================================================
   Mikrofon izni (30 Eylül 2026)

   Gizlilik ve İzinler sayfası mikrofon izninin bugünkü durumunu
   gösteriyor ve "İzin Ver" ile telefonun izin penceresini açıyor.
   Connect'teki eklentinin aynısı (android/.../MikrofonIzniPlugin.java);
   iki uygulama tek JS dosyasını paylaşıyor: src/lib/mikrofonIzni.js.

   Eklentinin kendi yöntemi yok: Capacitor'ın her eklentiye verdiği
   checkPermissions / requestPermissions yetiyor. Sesle yazmanın eklentisi
   (DiktePlugin) aynı izni kendi adıyla tanımlıyor; ikisi aynı Android
   iznine bakıyor.
   ========================================================================== */
@CapacitorPlugin(
    name = "MikrofonIzni",
    permissions = { @Permission(alias = "mikrofon", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class MikrofonIzniPlugin extends Plugin {}
