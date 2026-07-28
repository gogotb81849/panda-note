@echo off
chcp 65001 >nul
echo ========================================
echo     熊猫笔记 - 数据库初始化脚本
echo ========================================
echo.
echo 请确保 PostgreSQL 已启动并运行！
echo.
echo 数据库配置信息：
echo   - 数据库名: navlog
echo   - 用户名:   navlog
echo   - 密码:     NavLog2026!@#
echo.
echo 如果还没有创建数据库，请先在 PostgreSQL 中执行：
echo.
echo   CREATE DATABASE navlog;
echo   CREATE USER navlog WITH PASSWORD 'NavLog2026!@#';
echo   GRANT ALL PRIVILEGES ON DATABASE navlog TO navlog;
echo.
pause
echo.
echo 正在运行 Prisma 迁移...
cd backend
call npx prisma migrate dev --name init
echo.
echo ========================================
echo     数据库初始化完成！
echo ========================================
echo.
echo 现在可以运行 启动-后端.bat 和 启动-前端.bat 了
echo.
pause
