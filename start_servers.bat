@echo off
echo 🚀 Starting AI Interview Assistant...
echo.

echo 📡 Starting Backend Server (Port 8000)...
start "Backend Server" cmd /k "cd /d D:\project\AI\backend && python -m uvicorn main:app --reload --port 8000"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd /d D:\project\AI\frontend && npm run dev"

echo.
echo ✅ Both servers are starting!
echo 📱 Frontend: http://localhost:3000
echo 📡 Backend: http://localhost:8000
echo 📝 API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause > nul
