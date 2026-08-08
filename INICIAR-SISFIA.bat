@echo off
chcp 65001 >nul
title SISFIA - servidor de pruebas
cd /d "%~dp0"

echo.
echo   ============================================
echo     SISFIA - Nueva Acropolis San Cristobal
echo   ============================================
echo.

REM Si quedo un servidor viejo abierto, el puerto 8080 sigue ocupado y Vite
REM arranca en el 8081 o el 8082. Entonces la pestana del navegador apunta a
REM un servidor que ya no existe y todo falla con "Failed to fetch".
REM Por eso se libera el puerto antes de empezar.
echo   Liberando el puerto 8080...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)

REM El navegador se abre en una ventana aparte que espera a que el servidor
REM responda de verdad. Abrirlo antes daria una pagina de error: la primera
REM compilacion puede tardar hasta un minuto.
start "" powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 90;$i++){ try { $r = Invoke-WebRequest 'http://localhost:8080/' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { Start-Process 'http://localhost:8080/'; break } } catch { Start-Sleep -Seconds 2 } }"

echo   Iniciando. La primera vez puede tardar un minuto.
echo   El navegador se abre solo cuando este listo.
echo.
echo   Para detenerlo: cierra esta ventana, o pulsa Ctrl+C.
echo.

call npm run dev

REM Si npm falla (por ejemplo, faltan las dependencias) la ventana se cerraria
REM al instante y no habria forma de leer el error.
echo.
echo   El servidor se detuvo.
echo   Si fue por un error, arriba esta el motivo.
echo.
pause
