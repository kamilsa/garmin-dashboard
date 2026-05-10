package com.example.foodtracker.ui.components

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.repository.SettingsRepository
import com.example.foodtracker.ui.theme.Emerald

@Composable
fun SettingsDialog(
    currentUrl: String,
    currentGoal: Int,
    onSave: (String, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var url by remember { mutableStateOf(currentUrl) }
    var goal by remember { mutableStateOf(currentGoal.toString()) }
    val isDark = isSystemInDarkTheme()
    val textColor = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
    val borderColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.1f)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(24.dp),
        title = {
            Text(
                "Server Settings",
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = textColor
            )
        },
        text = {
            Column {
                Text(
                    "Server URL",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFF86868B)
                )
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            "http://192.168.x.x:3001",
                            fontSize = 12.sp,
                            color = Color(0xFF86868B)
                        )
                    },
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, color = textColor),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Emerald.copy(alpha = 0.4f),
                        unfocusedBorderColor = borderColor,
                        cursorColor = Emerald
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    "DAILY CALORIE GOAL",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFF86868B)
                )
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = goal,
                    onValueChange = { goal = it.filter { c -> c.isDigit() } },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            "${SettingsRepository.DEFAULT_DAILY_CALORIE_GOAL}",
                            fontSize = 12.sp,
                            color = Color(0xFF86868B)
                        )
                    },
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, color = textColor),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Emerald.copy(alpha = 0.4f),
                        unfocusedBorderColor = borderColor,
                        cursorColor = Emerald
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val parsedGoal = goal.toIntOrNull()?.coerceIn(0, 99999) ?: 0
                    onSave(url.trimEnd('/'), parsedGoal)
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Emerald)
            ) {
                Text("Save", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            Row {
                TextButton(onClick = {
                    url = SettingsRepository.DEFAULT_SERVER_URL
                    goal = SettingsRepository.DEFAULT_DAILY_CALORIE_GOAL.toString()
                }) {
                    Text(
                        "Reset",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF86868B)
                    )
                }
                OutlinedButton(onClick = onDismiss) {
                    Text(
                        "Cancel",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF86868B)
                    )
                }
            }
        }
    )
}
