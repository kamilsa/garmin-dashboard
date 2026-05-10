package com.example.foodtracker.data.repository

import com.example.foodtracker.data.api.AnalyzeRequest
import com.example.foodtracker.data.api.FoodEntry
import com.example.foodtracker.data.api.FoodListResponse
import com.example.foodtracker.data.api.ModelsResponse
import com.example.foodtracker.data.api.PatchFoodRequest
import com.example.foodtracker.data.api.RetrofitClient

class FoodRepository {

    private fun service() = RetrofitClient.getService()

    suspend fun getModels(): Result<ModelsResponse> = runCatching {
        service().getModels()
    }

    suspend fun getFoodEntries(days: Int = 7, limit: Int = 50): Result<FoodListResponse> = runCatching {
        service().getFoodEntries(days, limit)
    }

    suspend fun getFoodEntry(id: Int): Result<FoodEntry> = runCatching {
        service().getFoodEntry(id)
    }

    suspend fun analyzeFood(request: AnalyzeRequest): Result<FoodEntry> = runCatching {
        service().analyzeFood(request)
    }

    suspend fun updateFoodEntry(id: Int, request: PatchFoodRequest): Result<FoodEntry> = runCatching {
        service().updateFoodEntry(id, request)
    }

    suspend fun deleteFoodEntry(id: Int): Result<Unit> = runCatching {
        service().deleteFoodEntry(id)
    }
}
