package com.example.foodtracker.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.api.FoodEntry
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.viewmodel.FoodEditDraft
import com.example.foodtracker.util.DateUtils

@Composable
fun ResultDetailPanel(
    entry: FoodEntry,
    isEditing: Boolean,
    draft: FoodEditDraft?,
    isSaving: Boolean,
    isReanalyzing: Boolean,
    onStartEdit: () -> Unit,
    onSaveEdit: () -> Unit,
    onCancelEdit: () -> Unit,
    onFieldChange: (String, String) -> Unit,
    onReanalyze: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val primaryText = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
    val secondaryText = if (isDark) Color(0xFFA1A1A6) else Color(0xFF424245)
    val tertiaryText = Color(0xFF86868B)

    AnimatedContent(targetState = isEditing, label = "edit") { editing ->
        if (editing && draft != null) {
            InlineEditor(
                draft = draft,
                isSaving = isSaving,
                onFieldChange = onFieldChange,
                onSave = onSaveEdit,
                onCancel = onCancelEdit
            )
        } else {
            Column(modifier = modifier) {
                // Header row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            entry.foodName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = primaryText
                        )
                        Spacer(Modifier.height(2.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            entry.servingDescription?.let { serving ->
                                Text(
                                    serving,
                                    fontSize = 12.sp,
                                    color = secondaryText
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("·", fontSize = 12.sp, color = tertiaryText)
                                Spacer(Modifier.width(4.dp))
                            }
                            ConfidenceBadge(entry.confidence)
                        }
                    }

                    IconButton(
                        onClick = onStartEdit,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = tertiaryText,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    IconButton(
                        onClick = onReanalyze,
                        enabled = !isReanalyzing,
                        modifier = Modifier.size(32.dp)
                    ) {
                        if (isReanalyzing) {
                            androidx.compose.material3.CircularProgressIndicator(
                                modifier = Modifier.size(14.dp),
                                strokeWidth = 2.dp,
                                color = Emerald
                            )
                        } else {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Re-analyze",
                                tint = tertiaryText,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Meta row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetaLabel("Model", entry.modelUsed ?: "unknown")
                    MetaLabel("Taken", DateUtils.formatRelativeTime(entry.takenAt))
                }

                Spacer(Modifier.height(16.dp))

                // Nutrition grid
                NutritionGrid(
                    calories = entry.calories,
                    proteinG = entry.proteinG,
                    carbsG = entry.carbsG,
                    fatG = entry.fatG,
                    fiberG = entry.fiberG
                )

                // Description
                entry.description?.let { desc ->
                    if (desc.isNotBlank()) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            desc,
                            fontSize = 11.sp,
                            fontStyle = FontStyle.Italic,
                            color = secondaryText,
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetaLabel(label: String, value: String) {
    Column {
        Text(
            label.uppercase(),
            fontSize = 8.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.2.sp,
            color = Color(0xFF86868B)
        )
        Text(
            value,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = if (isSystemInDarkTheme()) Color(0xFFA1A1A6) else Color(0xFF424245)
        )
    }
}
