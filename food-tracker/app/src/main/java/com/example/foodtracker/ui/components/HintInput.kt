package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.theme.SubtleFillDark
import com.example.foodtracker.ui.theme.SubtleFillLight

@Composable
fun HintInput(
    value: String,
    onValueChange: (String) -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val bg = if (isDark) SubtleFillDark else SubtleFillLight
    val borderColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.05f)

    TextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .background(bg, RoundedCornerShape(12.dp)),
        placeholder = {
            Text(
                "Hint: e.g. 'pork cutlet', 'matcha latte'...",
                fontSize = 12.sp,
                color = Color(0xFF86868B)
            )
        },
        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = Color.Transparent,
            unfocusedContainerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent,
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
            focusedTextColor = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F),
            unfocusedTextColor = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F),
            cursorColor = Emerald
        ),
        shape = RoundedCornerShape(12.dp)
    )
}
