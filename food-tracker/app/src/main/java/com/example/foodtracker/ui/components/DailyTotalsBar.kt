package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Egg
import androidx.compose.material.icons.filled.Grain
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Opacity
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.api.DailyTotal
import com.example.foodtracker.ui.theme.CaloriesRed
import com.example.foodtracker.ui.theme.CarbsYellow
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.theme.FatBlue
import com.example.foodtracker.ui.theme.ProteinRed
import com.example.foodtracker.ui.theme.SubtleFillDark
import com.example.foodtracker.ui.theme.SubtleFillLight
import com.example.foodtracker.util.NumberUtils

@Composable
fun DailyTotalsBar(
    totals: DailyTotal?,
    modifier: Modifier = Modifier,
    calorieGoal: Int? = null
) {
    val isDark = isSystemInDarkTheme()
    val tileBg = if (isDark) SubtleFillDark else SubtleFillLight
    val primaryText = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)

    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TotalTile("Kcal", totals?.totalCalories, Icons.Default.LocalFireDepartment, CaloriesRed, tileBg, primaryText, Modifier.weight(1f))
            TotalTile("Protein", totals?.totalProtein, Icons.Default.Egg, ProteinRed, tileBg, primaryText, Modifier.weight(1f))
            TotalTile("Carbs", totals?.totalCarbs, Icons.Default.Grain, CarbsYellow, tileBg, primaryText, Modifier.weight(1f))
            TotalTile("Fat", totals?.totalFat, Icons.Default.Opacity, FatBlue, tileBg, primaryText, Modifier.weight(1f))
        }

        if (calorieGoal != null && calorieGoal > 0 && totals?.totalCalories != null) {
            val progress = remember(calorieGoal, totals.totalCalories) {
                (totals.totalCalories / calorieGoal.toDouble()).toFloat().coerceIn(0f, 1f)
            }
            val progressColor = remember(totals.totalCalories, calorieGoal) {
                val ratio = totals.totalCalories / calorieGoal
                when {
                    ratio >= 1.0 -> CaloriesRed
                    ratio >= 0.8 -> CarbsYellow
                    else -> Emerald
                }
            }
            val labelColor = if (isDark) Color(0xFFA1A1A6) else Color(0xFF424245)

            Spacer(Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .background(tileBg, RoundedCornerShape(4.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .fillMaxHeight()
                        .background(progressColor, RoundedCornerShape(4.dp))
                )
            }
            Spacer(Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${NumberUtils.formatInt(totals.totalCalories)} / ${NumberUtils.formatInt(calorieGoal.toDouble())} kcal",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = labelColor
                )
                Text(
                    text = "${(totals.totalCalories.toInt() * 100 / calorieGoal).coerceAtMost(999)}%",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF86868B)
                )
            }
        }
    }
}

@Composable
private fun TotalTile(
    label: String,
    value: Double?,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    bg: Color,
    textColor: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(bg, RoundedCornerShape(12.dp))
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.padding(bottom = 4.dp))
        Text(
            text = NumberUtils.formatInt(value),
            fontSize = 16.sp,
            fontWeight = FontWeight.Black,
            color = textColor,
            lineHeight = 16.sp
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = label.uppercase(),
            fontSize = 8.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.0.sp,
            color = Color(0xFF86868B)
        )
    }
}
