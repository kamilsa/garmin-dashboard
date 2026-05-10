package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.ui.theme.ErrorBgDark
import com.example.foodtracker.ui.theme.ErrorBgLight
import com.example.foodtracker.ui.theme.ErrorBorderDark
import com.example.foodtracker.ui.theme.ErrorBorderLight
import com.example.foodtracker.ui.theme.ErrorTextDark
import com.example.foodtracker.ui.theme.ErrorTextLight

@Composable
fun ErrorBanner(
    message: String,
    onDismiss: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val bg = if (isDark) ErrorBgDark else ErrorBgLight
    val border = if (isDark) ErrorBorderDark else ErrorBorderLight
    val text = if (isDark) ErrorTextDark else ErrorTextLight

    Row(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, border, RoundedCornerShape(12.dp))
            .background(bg, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = message,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = text,
            modifier = Modifier.weight(1f)
        )
        if (onDismiss != null) {
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onDismiss, modifier = Modifier.padding(0.dp)) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Dismiss",
                    tint = text,
                    modifier = Modifier.padding(0.dp)
                )
            }
        }
    }
}
