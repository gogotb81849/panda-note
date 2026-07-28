@echo off
chcp 65001 >nul
title 熊猫笔记 - 运维启动器
color 0A

echo.
echo ========================================
echo    熊猫笔记系统 - 运维启动器
echo ========================================
echo.

set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%BASE_DIR%backend"
set "FRONTEND_DIR=%BASE_DIR%frontend"
set "LOG_DIR=%BASE_DIR%logs"
set "LOG_FILE=%LOG_DIR%\ops.log"

:: 创建日志目录
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: 清空旧日志
echo [%date% %time%] ====== 启动自检 ======> "%LOG_FILE%"

echo [1/6] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装或未加入环境变量
    echo [%date% %time%] [ERROR] Node.js 未安装或未加入环境变量>> "%LOG_FILE%"
    pause
    exit /b 1
)
echo [OK] Node.js 已安装
for /f %%i in ('node -v') do echo       %%i
echo [%date% %time%] [OK] Node.js: %%i>> "%LOG_FILE%"

echo.
echo [2/6] 检查数据库 (PostgreSQL)...
netstat -ano | findstr ":5432.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] PostgreSQL 端口 5432 未监听
    echo       请确认数据库服务已启动
    echo [%date% %time%] [WARN] PostgreSQL 端口 5432 未监听>> "%LOG_FILE%"
) else (
    echo [OK] PostgreSQL 端口 5432 正在监听
    echo [%date% %time%] [OK] PostgreSQL 端口 5432 正在监听>> "%LOG_FILE%"
)

echo.
echo [3/6] 检查后端端口 (3002)...
netstat -ano | findstr ":3002.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 后端端口 3002 未监听，准备启动...
    echo [%date% %time%] [INFO] 后端端口 3002 未监听，准备启动>> "%LOG_FILE%"
    
    :: 使用 PowerShell 直接调用 node 执行 nest cli，避免 npm.cmd 路径问题
    powershell -NoLogo -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'node_modules/.bin/nest.cmd','start:dev' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Minimized"
    echo       正在启动后端服务...
    timeout /t 8 /nobreak >nul
    
    netstat -ano | findstr ":3002.*LISTENING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] 后端启动失败，请查看日志
        echo [%date% %time%] [ERROR] 后端启动失败>> "%LOG_FILE%"
    ) else (
        echo [OK] 后端服务启动成功
        echo [%date% %time%] [OK] 后端服务启动成功>> "%LOG_FILE%"
    )
) else (
    echo [OK] 后端端口 3002 已在监听
    echo [%date% %time%] [OK] 后端端口 3002 已在监听>> "%LOG_FILE%"
)

echo.
echo [4/6] 检查前端端口 (3000)...
netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 前端端口 3000 未监听，准备启动...
    echo [%date% %time%] [INFO] 前端端口 3000 未监听，准备启动>> "%LOG_FILE%"
    
    :: 使用 PowerShell 直接调用 node 执行 nuxt cli
    powershell -NoLogo -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'node_modules/nuxt/bin/nuxt.mjs','dev' -WorkingDirectory '%FRONTEND_DIR%' -WindowStyle Minimized"
    echo       正在启动前端服务...
    timeout /t 15 /nobreak >nul
    
    netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] 前端启动失败，请查看日志
        echo [%date% %time%] [ERROR] 前端启动失败>> "%LOG_FILE%"
    ) else (
        echo [OK] 前端服务启动成功
        echo [%date% %time%] [OK] 前端服务启动成功>> "%LOG_FILE%"
    )
) else (
    echo [OK] 前端端口 3000 已在监听
    echo [%date% %time%] [OK] 前端端口 3000 已在监听>> "%LOG_FILE%"
)

echo.
echo [5/6] 健康检查...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3002/api/ops/health' -UseBasicParsing -TimeoutSec 5; Write-Host '[OK] 后端健康检查通过'; $r.Content } catch { Write-Host '[ERROR] 健康检查失败: ' $_.Exception.Message }" 2>nul

echo.
echo [6/6] 打开浏览器...
timeout /t 2 /nobreak >nul
start http://localhost:3000/

echo.
echo ========================================
echo    启动完成！浏览器已自动打开
echo    运维面板: http://localhost:3000/admin/ops
echo    日志文件: logs\ops.log
echo ========================================
echo.
echo [%date% %time%] [OK] 启动完成>> "%LOG_FILE%"

echo 按任意键退出...
pause >nul
