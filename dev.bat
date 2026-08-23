@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
rem Iki sekme birden acilsin: uygulama ve yonetim paneli.
rem Bu degisken yoksa sunucu sessizce baslar (bkz. vite.config.js).
set "PAKSAN_SEKME=ac"
npm run dev
