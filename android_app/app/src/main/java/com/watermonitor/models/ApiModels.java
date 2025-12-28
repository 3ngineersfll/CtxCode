package com.watermonitor.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

// Request models
public class ApiModels {
    public static class RegisterRequest {
        public String username;
        public String email;
        public String password;
        public String displayName;

        public RegisterRequest(String username, String email, String password, String displayName) {
            this.username = username;
            this.email = email;
            this.password = password;
            this.displayName = displayName;
        }
    }

    public static class LoginRequest {
        public String email;
        public String password;

        public LoginRequest(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    public static class UsageRequest {
        public float flowRate;
        public float totalVolume;
        public String timestamp;
        public String date;

        public UsageRequest(float flowRate, float totalVolume, String timestamp, String date) {
            this.flowRate = flowRate;
            this.totalVolume = totalVolume;
            this.timestamp = timestamp;
            this.date = date;
        }
    }

    // Response models
    public static class AuthResponse {
        public boolean success;
        public String token;
        public User user;
        public String message;
    }

    public static class UserResponse {
        public boolean success;
        public User user;
    }

    public static class User {
        public String id;
        public String username;
        public String email;
        public String displayName;
        public String avatar;
        public Stats stats;
        public List<UserBadge> badges;
        public int currentStreak;
        public int longestStreak;
    }

    public static class Stats {
        public float totalUsage;
        public float dailyAverage;
        public float weeklyAverage;
        public float monthlyAverage;
        public int conservationScore;
    }

    public static class UserBadge {
        public String badgeId;
        public String earnedAt;
    }

    public static class UsageResponse {
        public boolean success;
        public UsageData data;
    }

    public static class UsageHistoryResponse {
        public boolean success;
        public int count;
        public List<UsageData> data;
    }

    public static class DailySummaryResponse {
        public boolean success;
        public List<DailySummary> data;
    }

    public static class DailySummary {
        @SerializedName("_id")
        public String date;
        public float totalVolume;
        public float avgFlowRate;
        public float maxFlowRate;
        public int count;
    }

    public static class LeaderboardResponse {
        public boolean success;
        public int count;
        public List<LeaderboardEntry> data;
    }

    public static class LeaderboardEntry {
        public int rank;
        public String userId;
        public String username;
        public String displayName;
        public String avatar;
        public int conservationScore;
        public int currentStreak;
        public int longestStreak;
        public int badgeCount;
        public float dailyAverage;
    }

    public static class RankResponse {
        public boolean success;
        public RankData data;
    }

    public static class RankData {
        public int rank;
        public int totalUsers;
        public String percentile;
        public int conservationScore;
    }

    public static class BadgeListResponse {
        public boolean success;
        public int count;
        public List<Badge> data;
    }

    public static class Badge {
        public String badgeId;
        public String name;
        public String description;
        public String icon;
        public String category;
        public String requirement;
        public int points;
        public String rarity;
        public String earnedAt; // Only for user badges
    }

    public static class UserBadgesResponse {
        public boolean success;
        public String username;
        public String displayName;
        public int count;
        public List<Badge> data;
    }

    public static class BadgeCheckResponse {
        public boolean success;
        public int newBadges;
        public List<Badge> data;
    }
}
