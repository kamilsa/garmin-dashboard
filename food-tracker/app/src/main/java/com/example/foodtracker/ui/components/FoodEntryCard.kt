package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.example.foodtracker.data.api.FoodEntry
import com.example.foodtracker.ui.theme.Emerald
import com.example.foodtracker.util.DateUtils
import com.example.foodtracker.util.NumberUtils

@Composable
fun FoodEntryCard(
    entry: FoodEntry,
    isSelected: Boolean,
    isDeleting: Boolean,
    isEditing: Boolean,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val primaryText = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
    val secondaryText = if (isDark) Color(0xFFA1A1A6) else Color(0xFF424245)
    val tertiaryText = Color(0xFF86868B)

    val bg = if (isSelected) {
        Emerald.copy(alpha = 0.1f)
    } else {
        if (isDark) Color.White.copy(alpha = 0.03f) else Color.Black.copy(alpha = 0.03f)
    }
    val border = if (isSelected) {
        Emerald.copy(alpha = 0.3f)
    } else {
        if (isDark) Color.White.copy(alpha = 0.05f) else Color.Black.copy(alpha = 0.05f)
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg, RoundedCornerShape(12.dp))
            .border(1.dp, border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Thumbnail
        if (entry.imageThumbnail != null) {
            AsyncImage(
                model = entry.imageThumbnail,
                contentDescription = entry.foodName,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop
            )
        } else {
            Icon(
                Icons.Default.Image,
                contentDescription = null,
                tint = tertiaryText,
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        if (isDark) Color.White.copy(alpha = 0.05f) else Color.Black.copy(alpha = 0.05f),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            )
        }

        Spacer(Modifier.width(10.dp))

        // Info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                entry.foodName,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = primaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Row {
                val kcal = NumberUtils.formatInt(entry.calories)
                Text("$kcal kcal", fontSize = 11.sp, color = secondaryText, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(6.dp))
                Text(
                    "P:${NumberUtils.formatDecimal(entry.proteinG)} C:${NumberUtils.formatDecimal(entry.carbsG)} F:${NumberUtils.formatDecimal(entry.fatG)}",
                    fontSize = 10.sp,
                    color = tertiaryText
                )
            }
            Spacer(Modifier.height(2.dp))
            Row {
                entry.modelUsed?.let {
                    Text(it, fontSize = 9.sp, color = tertiaryText)
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    DateUtils.formatRelativeTime(entry.takenAt ?: entry.createdAt),
                    fontSize = 9.sp,
                    color = tertiaryText
                )
            }
        }

        // Actions
        if (isEditing) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = Emerald
            )
        } else if (isDeleting) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = Color(0xFFEF4444)
            )
        } else {
            IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "Edit",
                    tint = tertiaryText,
                    modifier = Modifier.size(14.dp)
                )
            }
            IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = tertiaryText,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
