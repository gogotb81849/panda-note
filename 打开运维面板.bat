@echo off
chcp 65001 >nul
title 熊猫笔记 - 运维监控面板

cd /d "%~dp0ops-monitor"

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

if errorlevel 1 (
    echo.
    echo 启动失败！请确认：
    echo 1. Python 是否已安装
    echo 2. Python 是否已添加到系统环境变量
    echo 3. 是否安装了依赖：pip install -r ops-monitor\requirements.txt
    echo.
    pause
)
