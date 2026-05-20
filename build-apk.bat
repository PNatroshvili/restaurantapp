@echo off
cd /d "%~dp0"
echo [1/3] Creating assets directory...
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"

echo [2/3] Bundling JavaScript (index.ts)...
npx react-native bundle ^
  --platform android ^
  --dev false ^
  --entry-file index.ts ^
  --bundle-output "android\app\src\main\assets\index.android.bundle" ^
  --assets-dest "android\app\src\main\res"

if %errorlevel% neq 0 (
  echo.
  echo ERROR: Bundle step failed! See output above.
  pause
  exit /b 1
)

echo [3/3] Building APK...
cd android
call gradlew.bat assembleDebug
cd ..

echo.
echo ============================================================
echo APK ready at:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo ============================================================
pause
