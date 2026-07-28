@echo off
echo ========================================
echo     Panda Notes - Backend Startup
echo ========================================
echo.
echo [1/2] Generating Prisma types...
cd backend
call npx prisma generate
echo.
echo [2/2] Starting backend service...
echo.
npm run start:dev
pause
