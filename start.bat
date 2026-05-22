@echo off
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
cd /d "%~dp0"
echo Token Monitor 启动中...
call npm start
pause
