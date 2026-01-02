# Build Instructions

## Quick Start

### Option 1: Using Android Studio (Recommended)

1. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install with default settings

2. **Open the Project**
   ```bash
   cd PhotoDuplicateDetector
   ```
   - In Android Studio: File → Open → Select `PhotoDuplicateDetector` folder

3. **Sync Gradle**
   - Android Studio will automatically prompt to sync
   - Or click: File → Sync Project with Gradle Files

4. **Run the App**
   - Connect an Android device (USB debugging enabled) or start an emulator
   - Click the green "Run" button (or press Shift+F10)

### Option 2: Command Line Build

1. **Prerequisites**
   ```bash
   # Install JDK 17
   sudo apt install openjdk-17-jdk  # Linux
   # or download from: https://adoptium.net/

   # Set ANDROID_HOME environment variable
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

2. **Build Debug APK**
   ```bash
   cd PhotoDuplicateDetector
   chmod +x gradlew
   ./gradlew assembleDebug
   ```

   Output: `app/build/outputs/apk/debug/app-debug.apk`

3. **Build Release APK**
   ```bash
   ./gradlew assembleRelease
   ```

4. **Install on Device**
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

## System Requirements

- **Minimum Android Version**: Android 7.0 (API 24)
- **Target Android Version**: Android 14 (API 34)
- **Build Tools**: Android SDK Build Tools 34.0.0
- **Java**: JDK 17
- **Gradle**: 8.0+

## Dependencies

All dependencies are automatically downloaded by Gradle:

### Core Android
- AndroidX Core KTX 1.12.0
- AppCompat 1.6.1
- Material Design Components 1.11.0

### Architecture Components
- Lifecycle ViewModel KTX 2.7.0
- LiveData KTX 2.7.0

### ML/AI
- ML Kit Face Detection 16.1.6

### Image Loading
- Glide 4.16.0

### Async
- Kotlin Coroutines 1.7.3

## Troubleshooting Build Issues

### 1. Gradle Sync Failed
```bash
# Clear Gradle cache
./gradlew clean
rm -rf .gradle
./gradlew build --refresh-dependencies
```

### 2. SDK Not Found
- Set ANDROID_HOME environment variable
- Download required SDK components via Android Studio SDK Manager

### 3. Build Tools Version Error
- Open Android Studio SDK Manager
- Install Android SDK Build Tools 34.0.0

### 4. Java Version Error
```bash
# Check Java version
java -version
# Should be Java 17 or higher

# Set Java home
export JAVA_HOME=/path/to/jdk-17
```

### 5. ML Kit Download Issues
- Ensure device has internet connection
- ML Kit models download on first use
- Check Google Play Services is updated

## Running Tests

```bash
# Unit tests
./gradlew test

# Instrumented tests (requires connected device)
./gradlew connectedAndroidTest
```

## Building for Production

1. **Generate Signing Key**
   ```bash
   keytool -genkey -v -keystore my-release-key.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias my-key-alias
   ```

2. **Configure Signing in `app/build.gradle`**
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("my-release-key.jks")
               storePassword "****"
               keyAlias "my-key-alias"
               keyPassword "****"
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. **Build Release APK**
   ```bash
   ./gradlew assembleRelease
   ```

## File Size Optimization

To reduce APK size:

```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}
```

## Useful Gradle Commands

```bash
# Clean build
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Install debug APK
./gradlew installDebug

# Uninstall app
adb uninstall com.photoduplicatedetector

# View dependencies
./gradlew app:dependencies

# Check for dependency updates
./gradlew dependencyUpdates
```
