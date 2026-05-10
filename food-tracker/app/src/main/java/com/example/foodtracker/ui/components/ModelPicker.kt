package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.api.OllamaModel
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.theme.SubtleBorderDark
import com.example.foodtracker.ui.theme.SubtleBorderLight
import com.example.foodtracker.ui.theme.SubtleFillDark
import com.example.foodtracker.ui.theme.SubtleFillLight
import com.example.foodtracker.ui.viewmodel.FoodTrackerViewModel

@Composable
fun ModelPicker(
    models: List<OllamaModel>,
    selectedModel: String,
    isModelsLoading: Boolean,
    onModelSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    val isDark = isSystemInDarkTheme()
    val bg = if (isDark) SubtleFillDark else SubtleFillLight
    val borderColor = if (isDark) SubtleBorderDark else SubtleBorderLight
    val primaryText = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)

    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                .background(bg, RoundedCornerShape(12.dp))
                .clickable { expanded = true }
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val selectedModelObj = models.find { it.name == selectedModel }
            val isVision = selectedModelObj != null && FoodTrackerViewModel.isVisionModel(selectedModelObj)

            if (isVision) {
                Icon(
                    Icons.Default.Visibility,
                    contentDescription = null,
                    tint = Emerald,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(Modifier.width(6.dp))
            }

            if (isModelsLoading) {
                Text(
                    "Loading models...",
                    fontSize = 12.sp,
                    color = Color(0xFF86868B)
                )
            } else {
                Text(
                    text = selectedModel.ifEmpty { "Select a model" },
                    fontSize = 12.sp,
                    fontWeight = if (selectedModel.isNotEmpty()) FontWeight.Bold else FontWeight.Normal,
                    color = if (selectedModel.isNotEmpty()) primaryText else Color(0xFF86868B),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                val paramSize = selectedModelObj?.parameterSize
                if (paramSize != null) {
                    Spacer(Modifier.width(6.dp))
                    Text(
                        paramSize,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF86868B)
                    )
                }
            }

            Spacer(Modifier.width(4.dp))
            Icon(
                Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = Color(0xFF86868B),
                modifier = Modifier.size(16.dp)
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .heightIn(max = 300.dp)
                .background(
                    MaterialTheme.colorScheme.surface,
                    RoundedCornerShape(12.dp)
                )
        ) {
            models.forEach { model ->
                val isVision = FoodTrackerViewModel.isVisionModel(model)
                val isSelected = model.name == selectedModel

                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isVision) {
                                Icon(
                                    Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Emerald,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(Modifier.width(6.dp))
                            }
                            Text(
                                model.name,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = primaryText
                            )
                            if (model.parameterSize != null) {
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    model.parameterSize,
                                    fontSize = 10.sp,
                                    color = Color(0xFF86868B)
                                )
                            }
                        }
                    },
                    onClick = {
                        onModelSelected(model.name)
                        expanded = false
                    },
                    modifier = Modifier.background(
                        if (isSelected) (if (isDark) Color.White.copy(alpha = 0.05f) else Color.Black.copy(alpha = 0.05f))
                        else Color.Transparent
                    )
                )
            }
        }
    }
}
