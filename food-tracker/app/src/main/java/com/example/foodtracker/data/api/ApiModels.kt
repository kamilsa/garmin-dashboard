package com.example.foodtracker.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// GET /api/models
@JsonClass(generateAdapter = true)
data class ModelsResponse(
    val models: List<OllamaModel>,
    val default: String
)

@JsonClass(generateAdapter = true)
data class OllamaModel(
    val name: String,
    val size: Long,
    @Json(name = "parameterSize") val parameterSize: String?,
    val family: String?
)

// GET /api/food response
@JsonClass(generateAdapter = true)
data class FoodListResponse(
    val entries: List<FoodEntry>,
    val totals: List<DailyTotal>
)

@JsonClass(generateAdapter = true)
data class DailyTotal(
    val day: String,
    @Json(name = "total_calories") val totalCalories: Double?,
    @Json(name = "total_protein") val totalProtein: Double?,
    @Json(name = "total_carbs") val totalCarbs: Double?,
    @Json(name = "total_fat") val totalFat: Double?,
    @Json(name = "entry_count") val entryCount: Int
)

// Food entry
@JsonClass(generateAdapter = true)
data class FoodEntry(
    val id: Int,
    @Json(name = "food_name") val foodName: String,
    val description: String?,
    val calories: Double?,
    @Json(name = "protein_g") val proteinG: Double?,
    @Json(name = "carbs_g") val carbsG: Double?,
    @Json(name = "fat_g") val fatG: Double?,
    @Json(name = "fiber_g") val fiberG: Double?,
    @Json(name = "serving_description") val servingDescription: String?,
    val confidence: String?,
    @Json(name = "raw_analysis") val rawAnalysis: String?,
    @Json(name = "image_thumbnail") val imageThumbnail: String?,
    @Json(name = "image_data") val imageData: String?,
    @Json(name = "model_used") val modelUsed: String?,
    @Json(name = "taken_at") val takenAt: String?,
    @Json(name = "created_at") val createdAt: String
)

// POST /api/food/analyze request
@JsonClass(generateAdapter = true)
data class AnalyzeRequest(
    val image: String,
    val model: String,
    val thumbnail: String? = null,
    @Json(name = "entryId") val entryId: Int? = null,
    val hint: String? = null,
    @Json(name = "takenAt") val takenAt: String? = null
)

// PATCH /api/food/:id request
@JsonClass(generateAdapter = true)
data class PatchFoodRequest(
    @Json(name = "food_name") val foodName: String? = null,
    val description: String? = null,
    val calories: Double? = null,
    @Json(name = "protein_g") val proteinG: Double? = null,
    @Json(name = "carbs_g") val carbsG: Double? = null,
    @Json(name = "fat_g") val fatG: Double? = null,
    @Json(name = "fiber_g") val fiberG: Double? = null,
    @Json(name = "serving_description") val servingDescription: String? = null,
    val confidence: String? = null
)

// DELETE response
@JsonClass(generateAdapter = true)
data class DeleteResponse(val success: Boolean)
