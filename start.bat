@echo off
REM Navigate to the directory where this script is located
cd /d "%~dp0"

echo Starting Mediamammal backend server on http://localhost:3000...
echo You can close this command prompt to stop the server.

node ai_agent.js
Pause
