# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Bluetooth classes
-keep class android.bluetooth.** { *; }

# Keep database model classes
-keep class com.watermonitor.WaterUsageData { *; }
-keep class com.watermonitor.DatabaseHelper$DailyUsageSummary { *; }

# MPAndroidChart
-keep class com.github.mikephil.charting.** { *; }
-dontwarn com.github.mikephil.charting.**

# SQLite
-keep class android.database.** { *; }
-keep class android.database.sqlite.** { *; }
