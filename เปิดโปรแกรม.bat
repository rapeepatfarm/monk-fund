@echo off
title กองทุนพระอาพาธ
cd /d "D:\Project\Monk Healthcare Fund"

echo.
echo  ================================
echo    กองทุนพระอาพาธ - กำลังเริ่มต้น
echo  ================================
echo.
echo  กรุณารอสักครู่...
echo.

start "" "http://localhost:3000"
npm run dev
