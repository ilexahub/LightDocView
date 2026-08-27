@echo off
setlocal
call "%LOCALAPPDATA%\VSBuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
if errorlevel 1 (
  echo VsDevCmd failed
  exit /b 1
)
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin;C:\Program Files\nodejs"
where link
where cl
where node
cd /d "%~dp0.."
npm run tauri build
