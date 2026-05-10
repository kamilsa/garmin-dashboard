package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Egg
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Opacity
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.ui.theme.CaloriesRed
import com.example.foodtracker.ui.theme.CarbsYellow
import com.example.foodtracker.ui.theme.FatBlue
import com.example.foodtracker.ui.theme.FiberGreen
import com.example.foodtracker.ui.theme.ProteinRed
import com.example.foodtracker.ui.theme.SubtleFillDark
import com.example.foodtracker.ui.theme.SubtleFillLight
import com.example.foodtracker.util.NumberUtils

data class MacroItem(
    val label: String,
    val value: Double?,
    val icon: ImageVector,
    val color: Color,
    val suffix: String = "g",
    val isInt: Boolean = false
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NutritionGrid(
    calories: Double?,
    proteinG: Double?,
    carbsG: Double?,
    fatG: Double?,
    fiberG: Double?,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val tileBg = if (isDark) SubtleFillDark else SubtleFillLight

    val macros = listOf(
        MacroItem("Calories", calories, Icons.Default.LocalFireDepartment, CaloriesRed, "kcal", true),
        MacroItem("Protein", proteinG, Icons.Default.Egg, ProteinRed),
        MacroItem("Carbs", carbsG, Icons.Default.Grain, CarbsYellow),
        MacroItem("Fat", fatG, Icons.Default.Opacity, FatBlue),
        MacroItem("Fiber", fiberG, Icons.Default.Spa, FiberGreen)
    )

    FlowRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        macros.forEach { macro ->
            Column(
                modifier = Modifier
                    .width(80.dp)
                    .background(tileBg, RoundedCornerShape(12.dp))
                    .padding(10.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    macro.icon,
                    contentDescription = null,
                    tint = macro.color,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = if (macro.isInt) NumberUtils.formatInt(macro.value)
                    else NumberUtils.formatDecimal(macro.value),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F),
                    lineHeight = 16.sp
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = "${macro.label} (${macro.suffix})",
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.0.sp,
                    color = Color(0xFF86868B)
                )
            }
        }
    }
}
