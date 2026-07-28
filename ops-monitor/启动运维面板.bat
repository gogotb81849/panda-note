@echo off
chcp 65001 >nul
title 熊猫笔记运维监控面板

cd /d "%~dp0"

echo.
echo ============================================
echo   熊猫笔记 · 运维监控面板 v2.0
echo ============================================
echo.
echo   启动地址: http://127.0.0.1:8899
echo   API文档:  http://127.0.0.1:8899/docs
echo.
echo ============================================
echo.

python server.py

pause