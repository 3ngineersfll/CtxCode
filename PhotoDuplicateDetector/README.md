# Photo Duplicate Detector

An intelligent Android application that analyzes your photo gallery, groups similar/duplicate photos, and helps you identify which ones to delete based on quality metrics like closed eyes, smile detection, and image blur.

## Features

- **Automatic Photo Analysis**: Scans your entire photo gallery
- **Duplicate Detection**: Groups similar photos using perceptual hashing algorithms
- **Quality Assessment**: Analyzes each photo for:
  - Closed eyes detection using ML Kit Face Detection
  - Smile detection
  - Blur detection using Laplacian variance
  - Face count
- **Smart Recommendations**: Automatically identifies the best photo in each group
- **Batch Operations**: Select and delete multiple low-quality photos at once
- **Storage Insights**: Shows potential space savings

## Technology Stack

- **Language**: Kotlin
- **Architecture**: MVVM (Model-View-ViewModel)
- **UI**: Material Design Components
- **Image Processing**:
  - Perceptual hashing (difference hash algorithm)
  - Laplacian variance for blur detection
- **ML/AI**: Google ML Kit Face Detection API
- **Image Loading**: Glide
- **Concurrency**: Kotlin Coroutines
- **Lifecycle**: Android Architecture Components (ViewModel, LiveData)

## How It Works

### 1. Photo Loading
The app scans the device's `MediaStore` to load all images from the gallery.

### 2. Image Analysis
For each photo, the app performs:
- **Perceptual Hashing**: Generates a hash that represents the visual content
- **Face Detection**: Uses ML Kit to detect faces and analyze:
  - Eye open probability (detects closed eyes)
  - Smile probability
  - Number of faces
- **Blur Detection**: Calculates image sharpness using Laplacian operator

### 3. Grouping Algorithm
Photos are grouped based on similarity using the Hamming distance between their perceptual hashes. Photos with a Hamming distance ≤ 10 are considered similar.

### 4. Quality Scoring
Each photo receives a quality score (0-100) based on:
- Starting score: 50
- Closed eyes: -30 points
- No smile: -15 points
- Blur score: -20 points (maximum)
- No faces detected: -5 points

### 5. Smart Selection
The app identifies the best photo in each group (highest quality score) and marks it as protected. All other photos can be selected for deletion.

## Installation

### Prerequisites
- Android Studio Arctic Fox or later
- Android SDK 24 or higher
- Gradle 8.0+

### Build Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd PhotoDuplicateDetector
```

2. Open the project in Android Studio

3. Sync Gradle files

4. Build and run on your device or emulator:
```bash
./gradlew assembleDebug
```

Or use Android Studio's Run button.

### Permissions Required

The app requires the following permissions:
- `READ_MEDIA_IMAGES` (Android 13+)
- `READ_EXTERNAL_STORAGE` (Android 12 and below)

Permissions are requested at runtime when you tap "Scan Photos."

## Usage

1. **Grant Permissions**: On first launch, grant the app permission to access your photos

2. **Scan Photos**: Tap the "Scan Photos" button to start analysis
   - The app will load all photos
   - Analyze each photo for quality metrics
   - Group similar photos together

3. **Review Groups**:
   - Each card shows a group of similar photos
   - Tap a group to expand and see all photos
   - The best photo is marked with a green "Best Photo" badge

4. **Select Photos to Delete**:
   - Manually check photos you want to delete
   - Or tap "Select All Bad Photos" to auto-select all lower-quality photos

5. **Delete Photos**: Tap "Delete Selected" and confirm to permanently delete selected photos

## Project Structure

```
PhotoDuplicateDetector/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/photoduplicatedetector/
│   │   │   │   ├── model/
│   │   │   │   │   └── PhotoData.kt          # Data models
│   │   │   │   ├── repository/
│   │   │   │   │   └── PhotoRepository.kt    # Data operations
│   │   │   │   ├── ui/
│   │   │   │   │   ├── MainActivity.kt       # Main screen
│   │   │   │   │   └── adapter/
│   │   │   │   │       ├── PhotoAdapter.kt
│   │   │   │   │       └── PhotoGroupAdapter.kt
│   │   │   │   ├── util/
│   │   │   │   │   ├── ImageHashUtil.kt      # Perceptual hashing
│   │   │   │   │   └── FaceAnalyzer.kt       # ML Kit integration
│   │   │   │   └── viewmodel/
│   │   │   │       ├── MainViewModel.kt      # Business logic
│   │   │   │       └── ViewModelFactory.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/                   # XML layouts
│   │   │   │   ├── values/                   # Strings, colors, themes
│   │   │   │   └── mipmap/                   # App icons
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── proguard-rules.pro
├── build.gradle
├── settings.gradle
└── README.md
```

## Key Components

### ImageHashUtil
Implements perceptual hashing algorithms:
- **Difference Hash (dHash)**: Compares adjacent pixels
- **Hamming Distance**: Measures similarity between hashes
- **Blur Detection**: Uses Laplacian variance

### FaceAnalyzer
Wraps Google ML Kit Face Detection:
- Detects faces in images
- Analyzes eye open probability
- Analyzes smile probability
- Returns comprehensive face analysis results

### PhotoRepository
Handles all data operations:
- Loads photos from MediaStore
- Analyzes individual photos
- Groups similar photos
- Deletes selected photos

### MainViewModel
Manages UI state and business logic:
- Coordinates photo loading and analysis
- Tracks analysis progress
- Manages photo selection
- Handles deletion operations

## Performance Considerations

- **Image Scaling**: Photos are downscaled before analysis to improve performance
- **Coroutines**: All heavy operations run on background threads
- **Progress Tracking**: Real-time progress updates during analysis
- **Memory Management**: Bitmaps are recycled after use

## Future Enhancements

- [ ] Duplicate detection by metadata (same timestamp, location)
- [ ] Cloud backup before deletion
- [ ] More quality metrics (composition, lighting, focus)
- [ ] Batch export to archive before deletion
- [ ] Settings for customizable quality thresholds
- [ ] Support for video duplicates
- [ ] Integration with Google Photos

## Troubleshooting

### App crashes on startup
- Ensure you're running Android 7.0 (API 24) or higher
- Check that Google Play Services is installed and updated

### Photos not loading
- Verify storage permissions are granted
- Check that photos exist in the device's gallery
- Try clearing app data and rescanning

### Face detection not working
- Ensure device has internet connection for first-time ML Kit model download
- Check that Google Play Services is up to date

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
