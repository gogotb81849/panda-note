@echo off
chcp 65001 >nul
title 熊猫笔记 - 停止服务
color 0C

echo.
echo ========================================
echo    熊猫笔记系统 - 停止服务
echo ========================================
echo.

set "BASE_DIR=%~dp0"
set "LOG_FILE=%BASE_DIR%logs\ops.log"

echo [%date% %time%] ====== 停止服务 ======>> "%LOG_FILE%"

echo [1/3] 停止前端服务 (端口 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo       发现进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    echo       已停止
    echo [%date% %time%] [OK] 前端 PID %%a 已停止>> "%LOG_FILE%"
)

echo.
echo [2/3] 停止后端服务 (端口 3002)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002.*LISTENING"') do (
    echo       发现进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    echo       已停止
    echo [%date% %time%] [OK] 后端 PID %%a 已停止>> "%LOG_FILE%"
)

echo.
echo [3/3] 清理残留 Node 进程...
taskkill /IM node.exe /F >nul 2>&1
echo       已清理

echo.
echo ========================================
echo    所有服务已停止
echo ========================================
echo.
echo [%date% %time%] [OK] 所有服务已停止>> "%LOG_FILE%"

pause
