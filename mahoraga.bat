@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage:
    echo   mahoraga.bat ^<script.jocky^>       :: Full pipeline: Compile -^> Encrypt -^> Run -^> Seal
    echo   mahoraga.bat build ^<script.jocky^> :: Build only: Compile -^> Encrypted .enc payload
    echo   mahoraga.bat ^<payload.enc^>        :: Execute pre-compiled payload directly
    exit /b 1
)

:: ---------------------------------------------------------------------------
:: Mode A: Build Only (Compile + Polymorphic Encryption -> .enc)
:: ---------------------------------------------------------------------------
if /i "%~1"=="build" (
    if "%~2"=="" (
        echo Usage: mahoraga.bat build ^<script.jocky^>
        exit /b 1
    )
    set SRC=%~2
    set BASE_NAME=%~n2
    if not exist out\instructions mkdir out\instructions
    set INSTRUCTION_OUT=out\instructions\!BASE_NAME!.json
    set ENCRYPTED_OUT=out\instructions\!BASE_NAME!.enc

    echo [1/2] Compiling !SRC! to IR/Instructions...
    python -m compiler compile "!SRC!" --out "!INSTRUCTION_OUT!"
    if errorlevel 1 (
        echo [Error] Compilation failed.
        exit /b 1
    )
    echo       -^> Plain IR: !INSTRUCTION_OUT!

    echo [2/2] Generating polymorphic encrypted payload...
    python -m compiler.obfuscator "!INSTRUCTION_OUT!" "!ENCRYPTED_OUT!"
    if errorlevel 1 (
        echo [Error] Obfuscation failed.
        exit /b 1
    )
    echo.
    echo [OK] Portable payload built successfully: !ENCRYPTED_OUT!
    exit /b 0
)

:: ---------------------------------------------------------------------------
:: Mode B: Direct .enc Execution (Pre-compiled cross-platform payload)
:: ---------------------------------------------------------------------------
if /i "%~x1"==".enc" (
    set ENCRYPTED_OUT=%~1
    set BASE_NAME=%~n1
    set RAW_EVIDENCE=out\evidence\raw_evidence.json
    set SEALED_EVIDENCE=out\evidence\!BASE_NAME!_sealed.json
    set INSTRUCTION_OUT=out\instructions\!BASE_NAME!.json
    set STIX_OUT=out\evidence\!BASE_NAME!_stix.json

    if not exist out\evidence mkdir out\evidence

    echo [1/2] Executing pre-compiled native payload: !ENCRYPTED_OUT!...
    if exist "build\mahoraga-run.exe" (
        .\build\mahoraga-run.exe "!ENCRYPTED_OUT!"
    ) else if exist "build\Release\mahoraga-run.exe" (
        .\build\Release\mahoraga-run.exe "!ENCRYPTED_OUT!"
    ) else if exist "build\Debug\mahoraga-run.exe" (
        .\build\Debug\mahoraga-run.exe "!ENCRYPTED_OUT!"
    ) else (
        echo [Error] mahoraga-run.exe not found in build directory.
        exit /b 1
    )
    if errorlevel 1 (
        echo [Error] Runtime execution failed.
        exit /b 1
    )

    echo [2/2] Cryptographically sealing evidence...
    python -m evidence.sealing "!RAW_EVIDENCE!" "!SEALED_EVIDENCE!"
    if errorlevel 1 (
        echo [Error] Evidence sealing failed.
        exit /b 1
    )

    if exist "!INSTRUCTION_OUT!" (
        python -m detection.engine "!INSTRUCTION_OUT!" "!SEALED_EVIDENCE!" "!STIX_OUT!" 2>nul
    )

    echo.
    echo Investigation successfully completed!
    echo    -^> Sealed Evidence: !SEALED_EVIDENCE!
    if exist "!STIX_OUT!" echo    -^> STIX Bundle:     !STIX_OUT!
    exit /b 0
)

:: ---------------------------------------------------------------------------
:: Mode C: Standard Full Pipeline (.jocky -> Compile -> Encrypt -> Run -> Seal)
:: ---------------------------------------------------------------------------
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
