@echo off
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
echo ========================================================
echo Pushing EduInsight AI to GitHub...
echo Repository: https://github.com/GovindDagade264/Edulnsight-AI.git
echo ========================================================
echo If a GitHub sign-in window appears, click "Sign in with your browser".
echo.
git push -u origin main
echo.
echo ========================================================
echo Push complete!
echo ========================================================
pause

