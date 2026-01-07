package com.watermonitor;

public class WaterUsageData {
    private long id;
    private long timestamp;
    private float flowRate;      // L/min
    private float totalVolume;   // L
    private String date;

    public WaterUsageData() {}

    public WaterUsageData(long timestamp, float flowRate, float totalVolume, String date) {
        this.timestamp = timestamp;
        this.flowRate = flowRate;
        this.totalVolume = totalVolume;
        this.date = date;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public float getFlowRate() {
        return flowRate;
    }

    public void setFlowRate(float flowRate) {
        this.flowRate = flowRate;
    }

    public float getTotalVolume() {
        return totalVolume;
    }

    public void setTotalVolume(float totalVolume) {
        this.totalVolume = totalVolume;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }
}
