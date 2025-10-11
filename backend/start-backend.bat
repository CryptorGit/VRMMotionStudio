@echo off
REM MokuMokuDanceWeb Backend Startup Script
REM Usage: start-backend.bat

echo Starting MokuMokuDanceWeb Backend...

set JAR_PATH=java\target\java-0.1.0.jar

if not exist "%JAR_PATH%" (
    echo Error: JAR file not found at %JAR_PATH%
    echo Building the project first...
    
    cd java
    call mvn clean package -DskipTests
    cd ..
    
    if not exist "%JAR_PATH%" (
        echo Build failed. Please check for errors.
        exit /b 1
    )
)

echo Starting Spring Boot application...
java -jar %JAR_PATH% --spring.profiles.active=local
