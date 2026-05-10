package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.ui.theme.ConfidenceHighBgDark
import com.example.foodtracker.ui.theme.ConfidenceHighBgLight
import com.example.foodtracker.ui.theme.ConfidenceHighTextDark
import com.example.foodtracker.ui.theme.ConfidenceHighTextLight
import com.example.foodtracker.ui.theme.ConfidenceLowBgDark
import com.example.foodtracker.ui.theme.ConfidenceLowBgLight
import com.example.foodtracker.ui.theme.ConfidenceLowTextDark
import com.example.foodtracker.ui.theme.ConfidenceLowTextLight
import com.example.foodtracker.ui.theme.ConfidenceMediumBgDark
import com.example.foodtracker.ui.theme.ConfidenceMediumBgLight
import com.example.foodtracker.ui.theme.ConfidenceMediumTextDark
import com.example.foodtracker.ui.theme.ConfidenceMediumTextLight

@Composable
fun ConfidenceBadge(confidence: String?, modifier: Modifier = Modifier) {
    val isDark = isSystemInDarkTheme()
    val (bg, text) = when (confidence?.lowercase()) {
        "high" -> if (isDark) ConfidenceHighBgDark to ConfidenceHighTextDark
        else ConfidenceHighBgLight to ConfidenceHighTextLight
        "medium" -> if (isDark) ConfidenceMediumBgDark to ConfidenceMediumTextDark
        else ConfidenceMediumBgLight to ConfidenceMediumTextLight
        else -> if (isDark) ConfidenceLowBgDark to ConfidenceLowTextDark
        else ConfidenceLowBgLight to ConfidenceLowTextLight
    }

    val label = confidence?.replaceFirstChar { it.uppercase() } ?: "Low"

    Text(
        text = label,
        fontSize = 9.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 1.2.sp,
        color = text,
        maxLines = 1,
        softWrap = false,
        modifier = modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}
