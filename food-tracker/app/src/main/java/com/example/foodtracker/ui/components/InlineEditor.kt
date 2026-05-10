package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.ui.theme.SubtleFillDark
import com.example.foodtracker.ui.theme.SubtleFillLight
import com.example.foodtracker.ui.viewmodel.FoodEditDraft

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InlineEditor(
    draft: FoodEditDraft,
    isSaving: Boolean,
    onFieldChange: (String, String) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val inputBg = if (isDark) SubtleFillDark else SubtleFillLight
    val borderColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.1f)
    val textColor = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
    val labelColor = Color(0xFF86868B)

    val inputColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = textColor,
        unfocusedTextColor = textColor,
        focusedBorderColor = Emerald.copy(alpha = 0.4f),
        unfocusedBorderColor = borderColor,
        cursorColor = Emerald,
        focusedLabelColor = labelColor,
        unfocusedLabelColor = labelColor
    )

    Column(modifier = modifier) {
        OutlinedTextField(
            value = draft.foodName,
            onValueChange = { onFieldChange("food_name", it) },
            label = { Text("Food name", fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
            colors = inputColors,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = draft.servingDescription,
            onValueChange = { onFieldChange("serving_description", it) },
            label = { Text("Serving", fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
            colors = inputColors,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = draft.description,
            onValueChange = { onFieldChange("description", it) },
            label = { Text("Description", fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
            modifier = Modifier.fillMaxWidth(),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
            colors = inputColors,
            shape = RoundedCornerShape(12.dp),
            minLines = 2
        )

        Spacer(Modifier.height(12.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            NumericField("Calories", draft.calories, "kcal", onValueChange = { onFieldChange("calories", it) })
            NumericField("Protein", draft.proteinG, "g", onValueChange = { onFieldChange("protein_g", it) })
            NumericField("Carbs", draft.carbsG, "g", onValueChange = { onFieldChange("carbs_g", it) })
            NumericField("Fat", draft.fatG, "g", onValueChange = { onFieldChange("fat_g", it) })
            NumericField("Fiber", draft.fiberG, "g", onValueChange = { onFieldChange("fiber_g", it) })
        }

        Spacer(Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            OutlinedButton(
                onClick = onCancel,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF86868B))
            ) {
                Text("Cancel", fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
            Spacer(Modifier.width(8.dp))
            Button(
                onClick = onSave,
                enabled = !isSaving && draft.foodName.isNotBlank(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Emerald,
                    disabledContainerColor = Emerald.copy(alpha = 0.4f)
                )
            ) {
                Text(
                    if (isSaving) "Saving..." else "Save",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

@Composable
private fun NumericField(
    label: String,
    value: String,
    suffix: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val borderColor = if (isDark) Color.White.copy(alpha = 0.1f) else Color.Black.copy(alpha = 0.1f)
    val textColor = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, fontSize = 8.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp) },
        suffix = { Text(suffix, fontSize = 9.sp, color = Color(0xFF86868B)) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier.width(100.dp),
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
}
