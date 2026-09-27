@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: mahoraga.bat ^<script.jocky^>
    exit /b 1
)

set SRC=%~1
set BASE_NAME=%~n1

set INSTRUCTION_OUT=out\instructions\%BASE_NAME%.json
set ENCRYPTED_OUT=out\instructions\%BASE_NAME%.enc

set RAW_EVIDENCE=out\evidence\raw_evidence.json
set SEALED_EVIDENCE=out\evidence\%BASE_NAME%_sealed.json
set STIX_OUT=out\evidence\%BASE_NAME%_stix.json

if not exist out\instructions mkdir out\instructions
if not exist out\evidence mkdir out\evidence

echo [1/4] Compiling %SRC% to IR/Instructions...
python -m compiler compile "%SRC%" --out "%INSTRUCTION_OUT%"
if errorlevel 1 (
    echo [Error] Compilation failed.
    exit /b 1
)

echo       -^> Plain IR: %INSTRUCTION_OUT%
echo       -^> Polymorphic encryption...

python -m compiler.obfuscator "%INSTRUCTION_OUT%" "%ENCRYPTED_OUT%"
if errorlevel 1 (
    echo [Error] Obfuscation failed.
    exit /b 1
)

echo       -^> Encrypted payload: %ENCRYPTED_OUT%

echo [2/4] Executing native C++ runtime...
if exist "build\mahoraga-run.exe" (
    .\build\mahoraga-run.exe "%ENCRYPTED_OUT%"
) else if exist "build\Release\mahoraga-run.exe" (
    .\build\Release\mahoraga-run.exe "%ENCRYPTED_OUT%"
) else if exist "build\Debug\mahoraga-run.exe" (
    .\build\Debug\mahoraga-run.exe "%ENCRYPTED_OUT%"
) else (
    echo [Error] mahoraga-run.exe not found in build directory.
    exit /b 1
)

if errorlevel 1 (
    echo [Error] Runtime execution failed.
    exit /b 1
)

echo [3/4] Cryptographically sealing evidence...
python -m evidence.sealing "%RAW_EVIDENCE%" "%SEALED_EVIDENCE%"
if errorlevel 1 (
    echo [Error] Evidence sealing failed.
    exit /b 1
)

echo [4/4] Generating STIX 2.1 intelligence bundle...
python -m detection.engine "%INSTRUCTION_OUT%" "%SEALED_EVIDENCE%" "%STIX_OUT%"
if errorlevel 1 (
    echo [Error] Detection engine failed.
    exit /b 1
)

echo.
echo Investigation successfully completed!
echo    -^> Sealed Evidence: %SEALED_EVIDENCE%
echo    -^> STIX Bundle:     %STIX_OUT%
