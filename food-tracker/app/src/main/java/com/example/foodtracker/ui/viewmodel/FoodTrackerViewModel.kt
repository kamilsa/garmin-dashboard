package com.example.foodtracker.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.foodtracker.data.api.AnalyzeRequest
import com.example.foodtracker.data.api.DailyTotal
import com.example.foodtracker.data.api.FoodEntry
import com.example.foodtracker.data.api.OllamaModel
import com.example.foodtracker.data.api.PatchFoodRequest
import com.example.foodtracker.data.exif.ExifExtractor
import com.example.foodtracker.data.repository.FoodRepository
import com.example.foodtracker.util.ImageUtils
import com.example.foodtracker.util.NumberUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class FoodEditDraft(
    val foodName: String = "",
    val description: String = "",
    val servingDescription: String = "",
    val calories: String = "",
    val proteinG: String = "",
    val carbsG: String = "",
    val fatG: String = "",
    val fiberG: String = ""
)

data class FoodTrackerUiState(
    // Image
    val imageUri: Uri? = null,
    val imageBase64: String? = null,
    val imageThumbnail: String? = null,
    val extractedTakenAt: String? = null,

    // Inputs
    val hint: String = "",
    val selectedModel: String = "",
    val availableModels: List<OllamaModel> = emptyList(),
    val isModelsLoading: Boolean = true,

    // Analysis
    val isAnalyzing: Boolean = false,
    val analysisResult: FoodEntry? = null,
    val isEditingResult: Boolean = false,
    val resultDraft: FoodEditDraft? = null,
    val isSavingResult: Boolean = false,

    // Entry list
    val entries: List<FoodEntry> = emptyList(),
    val todayTotals: DailyTotal? = null,
    val isLoadingLog: Boolean = true,
    val editingEntryId: Int? = null,
    val entryDraft: FoodEditDraft? = null,
    val savingId: Int? = null,
    val deletingId: Int? = null,

    // Error
    val error: String? = null
)

class FoodTrackerViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = FoodRepository()

    private val _uiState = MutableStateFlow(FoodTrackerUiState())
    val uiState: StateFlow<FoodTrackerUiState> = _uiState.asStateFlow()

    companion object {
        val VISION_HINTS = listOf(
            "gemma", "llava", "vision", "minicpm", "bakllava",
            "moondream", "llama3.2", "qwen2-vl", "qwen3.5", "pixtral", "cogvlm"
        )

        fun isVisionModel(model: OllamaModel): Boolean {
            val name = model.name.lowercase()
            val family = model.family?.lowercase() ?: ""
            return VISION_HINTS.any { hint -> name.contains(hint) || family.contains(hint) }
        }
    }

    init {
        loadModels()
        loadFoodLog()
    }

    fun loadModels() {
        viewModelScope.launch {
            _uiState.update { it.copy(isModelsLoading = true) }
            repository.getModels().fold(
                onSuccess = { response ->
                    val visionModels = response.models.filter { isVisionModel(it) }
                    val defaultModel = visionModels.firstOrNull()?.name
                        ?: response.models.firstOrNull()?.name
                        ?: ""
                    _uiState.update {
                        it.copy(
                            availableModels = response.models,
                            selectedModel = if (it.selectedModel.isEmpty()) defaultModel else it.selectedModel,
                            isModelsLoading = false
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            error = "Failed to load models: ${e.message}",
                            isModelsLoading = false
                        )
                    }
                }
            )
        }
    }

    fun loadFoodLog() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingLog = true) }
            repository.getFoodEntries().fold(
                onSuccess = { response ->
                    val today = java.time.LocalDate.now()
                        .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE)
                    _uiState.update {
                        it.copy(
                            entries = response.entries,
                            todayTotals = response.totals.find { t -> t.day == today },
                            isLoadingLog = false
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            error = "Failed to load food log: ${e.message}",
                            isLoadingLog = false
                        )
                    }
                }
            )
        }
    }

    fun onImageSelected(uri: Uri) {
        viewModelScope.launch {
            _uiState.update { it.copy(imageUri = uri, error = null) }

            val takenAt = withContext(Dispatchers.IO) {
                ExifExtractor.extractTakenAt(getApplication(), uri)
            }

            val base64 = ImageUtils.uriToBase64(getApplication(), uri)
            val thumbnail = ImageUtils.generateThumbnailDataUrl(getApplication(), uri)

            _uiState.update {
                it.copy(
                    imageBase64 = base64,
                    imageThumbnail = thumbnail,
                    extractedTakenAt = takenAt
                )
            }
        }
    }

    fun clearImage() {
        _uiState.update {
            it.copy(
                imageUri = null,
                imageBase64 = null,
                imageThumbnail = null,
                extractedTakenAt = null,
                analysisResult = null,
                isEditingResult = false,
                resultDraft = null,
                error = null
            )
        }
    }

    fun updateHint(hint: String) {
        _uiState.update { it.copy(hint = hint) }
    }

    fun selectModel(modelName: String) {
        _uiState.update { it.copy(selectedModel = modelName) }
    }

    fun analyze() {
        val state = _uiState.value
        if (state.imageBase64 == null || state.selectedModel.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isAnalyzing = true, error = null) }

            val request = AnalyzeRequest(
                image = state.imageBase64,
                model = state.selectedModel,
                thumbnail = state.imageThumbnail,
                hint = state.hint.takeIf { it.isNotBlank() },
                takenAt = state.extractedTakenAt
            )

            repository.analyzeFood(request).fold(
                onSuccess = { entry ->
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            analysisResult = entry,
                            hint = ""
                        )
                    }
                    loadFoodLog()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            error = "Analysis failed: ${e.message}"
                        )
                    }
                }
            )
        }
    }

    fun reanalyze() {
        val state = _uiState.value
        val entry = state.analysisResult ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isAnalyzing = true, error = null) }

            val request = AnalyzeRequest(
                image = "", // server will use stored image_data
                model = state.selectedModel,
                entryId = entry.id,
                hint = state.hint.takeIf { it.isNotBlank() }
            )

            repository.analyzeFood(request).fold(
                onSuccess = { newEntry ->
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            analysisResult = newEntry,
                            hint = ""
                        )
                    }
                    loadFoodLog()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            error = "Re-analysis failed: ${e.message}"
                        )
                    }
                }
            )
        }
    }

    // --- Result editing ---

    fun startEditingResult() {
        val entry = _uiState.value.analysisResult ?: return
        _uiState.update {
            it.copy(
                isEditingResult = true,
                resultDraft = entryToDraft(entry)
            )
        }
    }

    fun cancelResultEdit() {
        _uiState.update { it.copy(isEditingResult = false, resultDraft = null) }
    }

    fun updateResultDraftField(field: String, value: String) {
        _uiState.update { state ->
            val draft = state.resultDraft ?: return@update state
            state.copy(resultDraft = applyDraftField(draft, field, value))
        }
    }

    fun saveResultEdit() {
        val state = _uiState.value
        val entry = state.analysisResult ?: return
        val draft = state.resultDraft ?: return
        if (draft.foodName.isBlank()) return

        val request = draftToRequest(draft)
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingResult = true) }
            repository.updateFoodEntry(entry.id, request).fold(
                onSuccess = { updated ->
                    _uiState.update {
                        it.copy(
                            analysisResult = updated,
                            isEditingResult = false,
                            resultDraft = null,
                            isSavingResult = false
                        )
                    }
                    loadFoodLog()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            error = "Failed to save: ${e.message}",
                            isSavingResult = false
                        )
                    }
                }
            )
        }
    }

    // --- Entry list editing ---

    fun editEntry(id: Int) {
        viewModelScope.launch {
            repository.getFoodEntry(id).fold(
                onSuccess = { entry ->
                    val imageDataUrl = entry.imageThumbnail ?: entry.imageData
                    val imageUri = imageDataUrl?.let { saveBase64ToCacheUri(it) }
                    _uiState.update {
                        it.copy(
                            analysisResult = entry,
                            isEditingResult = true,
                            resultDraft = entryToDraft(entry),
                            imageUri = imageUri,
                            imageBase64 = entry.imageData?.let { stripDataUrlPrefix(it) },
                            imageThumbnail = entry.imageThumbnail
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update { it.copy(error = "Failed to load entry: ${e.message}") }
                }
            )
        }
    }

    fun openEntry(id: Int) {
        viewModelScope.launch {
            repository.getFoodEntry(id).fold(
                onSuccess = { entry ->
                    val imageDataUrl = entry.imageThumbnail ?: entry.imageData
                    val imageUri = imageDataUrl?.let { saveBase64ToCacheUri(it) }
                    _uiState.update {
                        it.copy(
                            analysisResult = entry,
                            isEditingResult = false,
                            resultDraft = null,
                            imageUri = imageUri,
                            imageBase64 = entry.imageData?.let { stripDataUrlPrefix(it) },
                            imageThumbnail = entry.imageThumbnail
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update { it.copy(error = "Failed to load entry: ${e.message}") }
                }
            )
        }
    }

    fun closeEntry() {
        _uiState.update {
            it.copy(
                analysisResult = null,
                isEditingResult = false,
                resultDraft = null,
                imageUri = null,
                imageBase64 = null,
                imageThumbnail = null,
                extractedTakenAt = null,
                error = null
            )
        }
    }

    private fun saveBase64ToCacheUri(dataUrl: String): Uri? {
        return try {
            val app = getApplication<Application>()
            val base64 = stripDataUrlPrefix(dataUrl) ?: return null
            val bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
            val file = java.io.File(app.cacheDir, "food_entry_${System.currentTimeMillis()}.jpg")
            file.writeBytes(bytes)
            FileProvider.getUriForFile(
                app,
                "${app.packageName}.fileprovider",
                file
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun stripDataUrlPrefix(dataUrl: String): String? {
        val commaIndex = dataUrl.indexOf(',')
        if (commaIndex == -1) return dataUrl
        return dataUrl.substring(commaIndex + 1)
    }

    fun startEditingEntry(id: Int) {
        val entry = _uiState.value.entries.find { it.id == id } ?: return
        _uiState.update {
            it.copy(
                editingEntryId = id,
                entryDraft = entryToDraft(entry)
            )
        }
    }

    fun cancelEntryEdit() {
        _uiState.update { it.copy(editingEntryId = null, entryDraft = null) }
    }

    fun updateEntryDraftField(field: String, value: String) {
        _uiState.update { state ->
            val draft = state.entryDraft ?: return@update state
            state.copy(entryDraft = applyDraftField(draft, field, value))
        }
    }

    fun saveEntryEdit(id: Int) {
        val draft = _uiState.value.entryDraft ?: return
        if (draft.foodName.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(savingId = id) }
            repository.updateFoodEntry(id, draftToRequest(draft)).fold(
                onSuccess = {
                    _uiState.update { it.copy(editingEntryId = null, entryDraft = null, savingId = null) }
                    loadFoodLog()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            error = "Failed to save: ${e.message}",
                            savingId = null
                        )
                    }
                }
            )
        }
    }

    fun deleteEntry(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(deletingId = id) }
            repository.deleteFoodEntry(id).fold(
                onSuccess = {
                    val wasViewing = _uiState.value.analysisResult?.id == id
                    _uiState.update {
                        it.copy(
                            deletingId = null,
                            analysisResult = if (wasViewing) null else it.analysisResult,
                            isEditingResult = if (wasViewing) false else it.isEditingResult,
                            resultDraft = if (wasViewing) null else it.resultDraft
                        )
                    }
                    loadFoodLog()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(
                            error = "Failed to delete: ${e.message}",
                            deletingId = null
                        )
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    // --- Helpers ---

    private fun entryToDraft(entry: FoodEntry): FoodEditDraft = FoodEditDraft(
        foodName = entry.foodName,
        description = entry.description ?: "",
        servingDescription = entry.servingDescription ?: "",
        calories = NumberUtils.formatInt(entry.calories),
        proteinG = NumberUtils.formatDecimal(entry.proteinG),
        carbsG = NumberUtils.formatDecimal(entry.carbsG),
        fatG = NumberUtils.formatDecimal(entry.fatG),
        fiberG = NumberUtils.formatDecimal(entry.fiberG)
    )

    private fun applyDraftField(draft: FoodEditDraft, field: String, value: String): FoodEditDraft {
        return when (field) {
            "food_name" -> draft.copy(foodName = value)
            "description" -> draft.copy(description = value)
            "serving_description" -> draft.copy(servingDescription = value)
            "calories" -> draft.copy(calories = value)
            "protein_g" -> draft.copy(proteinG = value)
            "carbs_g" -> draft.copy(carbsG = value)
            "fat_g" -> draft.copy(fatG = value)
            "fiber_g" -> draft.copy(fiberG = value)
            else -> draft
        }
    }

    private fun draftToRequest(draft: FoodEditDraft): PatchFoodRequest = PatchFoodRequest(
        foodName = draft.foodName,
        description = draft.description.ifEmpty { null },
        servingDescription = draft.servingDescription.ifEmpty { null },
        calories = NumberUtils.parseDoubleOrNull(draft.calories),
        proteinG = NumberUtils.parseDoubleOrNull(draft.proteinG),
        carbsG = NumberUtils.parseDoubleOrNull(draft.carbsG),
        fatG = NumberUtils.parseDoubleOrNull(draft.fatG),
        fiberG = NumberUtils.parseDoubleOrNull(draft.fiberG)
    )
}
