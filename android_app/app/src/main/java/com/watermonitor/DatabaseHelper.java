package com.watermonitor;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "WaterMonitor.db";
    private static final int DATABASE_VERSION = 1;

    // Table name
    private static final String TABLE_USAGE = "water_usage";

    // Column names
    private static final String COLUMN_ID = "id";
    private static final String COLUMN_TIMESTAMP = "timestamp";
    private static final String COLUMN_FLOW_RATE = "flow_rate";
    private static final String COLUMN_TOTAL_VOLUME = "total_volume";
    private static final String COLUMN_DATE = "date";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_TABLE = "CREATE TABLE " + TABLE_USAGE + "("
                + COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + COLUMN_TIMESTAMP + " INTEGER,"
                + COLUMN_FLOW_RATE + " REAL,"
                + COLUMN_TOTAL_VOLUME + " REAL,"
                + COLUMN_DATE + " TEXT"
                + ")";
        db.execSQL(CREATE_TABLE);

        // Create index on date for faster queries
        db.execSQL("CREATE INDEX idx_date ON " + TABLE_USAGE + "(" + COLUMN_DATE + ")");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USAGE);
        onCreate(db);
    }

    // Insert water usage data
    public long insertUsageData(float flowRate, float totalVolume) {
        SQLiteDatabase db = this.getWritableDatabase();

        long timestamp = System.currentTimeMillis();
        String date = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                .format(new Date(timestamp));

        ContentValues values = new ContentValues();
        values.put(COLUMN_TIMESTAMP, timestamp);
        values.put(COLUMN_FLOW_RATE, flowRate);
        values.put(COLUMN_TOTAL_VOLUME, totalVolume);
        values.put(COLUMN_DATE, date);

        long id = db.insert(TABLE_USAGE, null, values);
        db.close();
        return id;
    }

    // Get all usage data
    public List<WaterUsageData> getAllUsageData() {
        List<WaterUsageData> dataList = new ArrayList<>();
        String selectQuery = "SELECT * FROM " + TABLE_USAGE + " ORDER BY " + COLUMN_TIMESTAMP + " DESC";

        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery(selectQuery, null);

        if (cursor.moveToFirst()) {
            do {
                WaterUsageData data = new WaterUsageData();
                data.setId(cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_ID)));
                data.setTimestamp(cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_TIMESTAMP)));
                data.setFlowRate(cursor.getFloat(cursor.getColumnIndexOrThrow(COLUMN_FLOW_RATE)));
                data.setTotalVolume(cursor.getFloat(cursor.getColumnIndexOrThrow(COLUMN_TOTAL_VOLUME)));
                data.setDate(cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_DATE)));
                dataList.add(data);
            } while (cursor.moveToNext());
        }

        cursor.close();
        db.close();
        return dataList;
    }

    // Get usage data for a specific date
    public List<WaterUsageData> getUsageDataByDate(String date) {
        List<WaterUsageData> dataList = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();

        Cursor cursor = db.query(TABLE_USAGE,
                null,
                COLUMN_DATE + "=?",
                new String[]{date},
                null, null,
                COLUMN_TIMESTAMP + " ASC");

        if (cursor.moveToFirst()) {
            do {
                WaterUsageData data = new WaterUsageData();
                data.setId(cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_ID)));
                data.setTimestamp(cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_TIMESTAMP)));
                data.setFlowRate(cursor.getFloat(cursor.getColumnIndexOrThrow(COLUMN_FLOW_RATE)));
                data.setTotalVolume(cursor.getFloat(cursor.getColumnIndexOrThrow(COLUMN_TOTAL_VOLUME)));
                data.setDate(cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_DATE)));
                dataList.add(data);
            } while (cursor.moveToNext());
        }

        cursor.close();
        db.close();
        return dataList;
    }

    // Get daily usage summary
    public List<DailyUsageSummary> getDailyUsageSummary(int days) {
        List<DailyUsageSummary> summaryList = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();

        String query = "SELECT " + COLUMN_DATE + ", "
                + "SUM(" + COLUMN_TOTAL_VOLUME + ") as total_volume, "
                + "AVG(" + COLUMN_FLOW_RATE + ") as avg_flow_rate, "
                + "MAX(" + COLUMN_FLOW_RATE + ") as max_flow_rate, "
                + "COUNT(*) as count "
                + "FROM " + TABLE_USAGE + " "
                + "GROUP BY " + COLUMN_DATE + " "
                + "ORDER BY " + COLUMN_DATE + " DESC "
                + "LIMIT ?";

        Cursor cursor = db.rawQuery(query, new String[]{String.valueOf(days)});

        if (cursor.moveToFirst()) {
            do {
                DailyUsageSummary summary = new DailyUsageSummary();
                summary.setDate(cursor.getString(0));
                summary.setTotalVolume(cursor.getFloat(1));
                summary.setAvgFlowRate(cursor.getFloat(2));
                summary.setMaxFlowRate(cursor.getFloat(3));
                summary.setCount(cursor.getInt(4));
                summaryList.add(summary);
            } while (cursor.moveToNext());
        }

        cursor.close();
        db.close();
        return summaryList;
    }

    // Delete all data
    public void deleteAllData() {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_USAGE, null, null);
        db.close();
    }

    // Delete data older than specified days
    public int deleteOldData(int days) {
        SQLiteDatabase db = this.getWritableDatabase();
        long cutoffTime = System.currentTimeMillis() - (days * 24L * 60 * 60 * 1000);

        int rowsDeleted = db.delete(TABLE_USAGE,
                COLUMN_TIMESTAMP + " < ?",
                new String[]{String.valueOf(cutoffTime)});

        db.close();
        return rowsDeleted;
    }

    // Get total water consumption
    public float getTotalWaterConsumption() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT MAX(" + COLUMN_TOTAL_VOLUME + ") FROM " + TABLE_USAGE, null);

        float total = 0;
        if (cursor.moveToFirst()) {
            total = cursor.getFloat(0);
        }

        cursor.close();
        db.close();
        return total;
    }

    // Inner class for daily usage summary
    public static class DailyUsageSummary {
        private String date;
        private float totalVolume;
        private float avgFlowRate;
        private float maxFlowRate;
        private int count;

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public float getTotalVolume() { return totalVolume; }
        public void setTotalVolume(float totalVolume) { this.totalVolume = totalVolume; }

        public float getAvgFlowRate() { return avgFlowRate; }
        public void setAvgFlowRate(float avgFlowRate) { this.avgFlowRate = avgFlowRate; }

        public float getMaxFlowRate() { return maxFlowRate; }
        public void setMaxFlowRate(float maxFlowRate) { this.maxFlowRate = maxFlowRate; }

        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
    }
}
