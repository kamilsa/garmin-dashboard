package com.example.foodtracker.data.api

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface FoodApiService {

    @GET("api/models")
    suspend fun getModels(): ModelsResponse

    @GET("api/food")
    suspend fun getFoodEntries(
        @Query("days") days: Int = 7,
        @Query("limit") limit: Int = 50
    ): FoodListResponse

    @GET("api/food/{id}")
    suspend fun getFoodEntry(@Path("id") id: Int): FoodEntry

    @POST("api/food/analyze")
    suspend fun analyzeFood(@Body request: AnalyzeRequest): FoodEntry

    @PATCH("api/food/{id}")
    suspend fun updateFoodEntry(
        @Path("id") id: Int,
        @Body request: PatchFoodRequest
    ): FoodEntry

    @DELETE("api/food/{id}")
    suspend fun deleteFoodEntry(@Path("id") id: Int): DeleteResponse
}
