@echo off
cd /d "%~dp0"
echo Building release APK...
cd android
call gradlew.bat assembleRelease > ..\build-log.txt 2>&1
cd ..
echo Done. Check build-log.txt for result.
pause
