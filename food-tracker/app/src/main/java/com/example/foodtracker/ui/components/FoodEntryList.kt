package com.example.foodtracker.ui.components

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ImageSearch
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.api.FoodEntry
import com.example.foodtracker.ui.theme.Emerald

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodEntryList(
    entries: List<FoodEntry>,
    isLoading: Boolean,
    isRefreshing: Boolean,
    selectedEntryId: Int?,
    editingEntryId: Int?,
    savingId: Int?,
    deletingId: Int?,
    onRefresh: () -> Unit,
    onEntryClick: (Int) -> Unit,
    onEditEntry: (Int) -> Unit,
    onDeleteEntry: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val textColor = if (isDark) Color(0xFFA1A1A6) else Color(0xFF424245)

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier
    ) {
        if (isLoading && entries.isEmpty()) {
            // Loading skeleton
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                repeat(3) {
                    SkeletonLoader(modifier = Modifier.fillMaxWidth().height(68.dp))
                }
            }
        } else if (entries.isEmpty()) {
            // Empty state
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.ImageSearch,
                    contentDescription = null,
                    tint = Emerald.copy(alpha = 0.4f),
                    modifier = Modifier.size(48.dp)
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "No food logged yet",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Upload a photo to get started",
                    fontSize = 11.sp,
                    color = Color(0xFF86868B),
                    textAlign = TextAlign.Center
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(entries, key = { it.id }) { entry ->
                    FoodEntryCard(
                        entry = entry,
                        isSelected = selectedEntryId == entry.id,
                        isDeleting = deletingId == entry.id,
                        isEditing = savingId == entry.id,
                        onClick = { onEntryClick(entry.id) },
                        onEdit = { onEditEntry(entry.id) },
                        onDelete = { onDeleteEntry(entry.id) }
                    )
                }
            }
        }
    }
}
