package com.example.foodtracker.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.foodtracker.ui.components.AnalyzeButton
import com.example.foodtracker.ui.components.DailyTotalsBar
import com.example.foodtracker.ui.components.ErrorBanner
import com.example.foodtracker.ui.components.FoodEntryList
import com.example.foodtracker.ui.components.HintInput
import com.example.foodtracker.ui.components.ImageUploadZone
import com.example.foodtracker.ui.components.ModelPicker
import com.example.foodtracker.ui.components.ResultDetailPanel
import com.example.foodtracker.ui.components.SettingsDialog
import com.example.foodtracker.ui.theme.BentoCard
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.viewmodel.FoodTrackerViewModel
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodTrackerScreen(
    foodVm: FoodTrackerViewModel = viewModel(),
    settingsUrl: String,
    onSettingsUrlChange: (String) -> Unit
) {
    val state by foodVm.uiState.collectAsState()
    val isDark = isSystemInDarkTheme()
    val context = LocalContext.current
    var showSettings by remember { mutableStateOf(false) }

    var cameraImageUri by remember { mutableStateOf<Uri?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) cameraImageUri?.let { foodVm.onImageSelected(it) }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraImageUri = createTempImageUri(context)
            cameraLauncher.launch(cameraImageUri!!)
        } else {
            Toast.makeText(context, "Camera permission is needed to take food photos", Toast.LENGTH_SHORT).show()
        }
    }

    val launchCamera: () -> Unit = {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            cameraImageUri = createTempImageUri(context)
            cameraLauncher.launch(cameraImageUri!!)
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { foodVm.onImageSelected(it) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = Emerald,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(
                                "Food Tracker",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
                            )
                            Text(
                                "AI-powered nutrition logging",
                                fontSize = 10.sp,
                                color = Color(0xFF86868B)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = launchCamera) {
                        Icon(Icons.Default.AddAPhoto, contentDescription = "Take photo", tint = Emerald)
                    }
                    IconButton(onClick = { showSettings = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color(0xFF86868B))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Transparent
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            // Upload + Analysis card
            BentoCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    ImageUploadZone(
                        imageUri = state.imageUri,
                        isAnalyzing = state.isAnalyzing,
                        onTakePhoto = launchCamera,
                        onPickFromGallery = { galleryLauncher.launch("image/*") },
                        onClearImage = { foodVm.clearImage() }
                    )

                    if (state.imageUri != null) {
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            HintInput(
                                value = state.hint,
                                onValueChange = { foodVm.updateHint(it) },
                                onDone = { foodVm.analyze() },
                                modifier = Modifier.weight(1f)
                            )
                            AnalyzeButton(
                                isAnalyzing = state.isAnalyzing,
                                enabled = state.imageBase64 != null && state.selectedModel.isNotEmpty(),
                                onClick = { foodVm.analyze() }
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        ModelPicker(
                            models = state.availableModels,
                            selectedModel = state.selectedModel,
                            isModelsLoading = state.isModelsLoading,
                            onModelSelected = { foodVm.selectModel(it) }
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            state.error?.let { error ->
                ErrorBanner(message = error, onDismiss = { foodVm.clearError() }, modifier = Modifier.padding(bottom = 12.dp))
            }

            state.analysisResult?.let { entry ->
                BentoCard(modifier = Modifier.fillMaxWidth()) {
                    ResultDetailPanel(
                        entry = entry,
                        isEditing = state.isEditingResult,
                        draft = state.resultDraft,
                        isSaving = state.isSavingResult,
                        isReanalyzing = state.isAnalyzing,
                        onStartEdit = { foodVm.startEditingResult() },
                        onSaveEdit = { foodVm.saveResultEdit() },
                        onCancelEdit = { foodVm.cancelResultEdit() },
                        onFieldChange = { field, value -> foodVm.updateResultDraftField(field, value) },
                        onReanalyze = { foodVm.reanalyze() }
                    )
                }
                Spacer(Modifier.height(12.dp))
            }

            // Today's totals
            BentoCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        "TODAY'S TOTALS",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.2.sp,
                        color = Color(0xFF86868B)
                    )
                    Spacer(Modifier.height(8.dp))
                    DailyTotalsBar(totals = state.todayTotals)
                }
            }

            Spacer(Modifier.height(12.dp))

            // History
            BentoCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        "HISTORY",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.2.sp,
                        color = Color(0xFF86868B)
                    )
                    Spacer(Modifier.height(8.dp))
                    FoodEntryList(
                        entries = state.entries,
                        isLoading = state.isLoadingLog,
                        isRefreshing = false,
                        selectedEntryId = state.analysisResult?.id,
                        editingEntryId = state.editingEntryId,
                        savingId = state.savingId,
                        deletingId = state.deletingId,
                        onRefresh = { foodVm.loadFoodLog() },
                        onEntryClick = { foodVm.openEntry(it) },
                        onEditEntry = { foodVm.startEditingEntry(it) },
                        onDeleteEntry = { foodVm.deleteEntry(it) }
                    )
                }
            }
        }

        if (showSettings) {
            SettingsDialog(
                currentUrl = settingsUrl,
                onSave = {
                    onSettingsUrlChange(it)
                    showSettings = false
                    foodVm.loadModels()
                    foodVm.loadFoodLog()
                },
                onDismiss = { showSettings = false }
            )
        }
    }
}

private fun createTempImageUri(context: android.content.Context): Uri {
    val file = File(context.cacheDir, "food_photo_${System.currentTimeMillis()}.jpg")
    file.parentFile?.mkdirs()
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
