package com.watermonitor.api;

import com.watermonitor.models.*;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.*;

public interface ApiService {
    // Auth endpoints
    @POST("auth/register")
    Call<AuthResponse> register(@Body RegisterRequest request);

    @POST("auth/login")
    Call<AuthResponse> login(@Body LoginRequest request);

    @GET("auth/me")
    Call<UserResponse> getMe(@Header("Authorization") String token);

    // Usage endpoints
    @POST("usage")
    Call<UsageResponse> submitUsage(
            @Header("Authorization") String token,
            @Body UsageRequest request
    );

    @GET("usage/history")
    Call<UsageHistoryResponse> getHistory(
            @Header("Authorization") String token,
            @Query("days") int days
    );

    @GET("usage/summary/daily")
    Call<DailySummaryResponse> getDailySummary(
            @Header("Authorization") String token,
            @Query("days") int days
    );

    // Leaderboard endpoints
    @GET("leaderboard")
    Call<LeaderboardResponse> getLeaderboard(
            @Query("limit") int limit,
            @Query("category") String category
    );

    @GET("leaderboard/rank/{userId}")
    Call<RankResponse> getUserRank(@Path("userId") String userId);

    @GET("leaderboard/weekly")
    Call<LeaderboardResponse> getWeeklyTop(@Query("limit") int limit);

    // Badge endpoints
    @GET("badges")
    Call<BadgeListResponse> getAllBadges();

    @GET("badges/user/{userId}")
    Call<UserBadgesResponse> getUserBadges(@Path("userId") String userId);

    @POST("badges/check")
    Call<BadgeCheckResponse> checkAndAwardBadges(@Header("Authorization") String token);
}
