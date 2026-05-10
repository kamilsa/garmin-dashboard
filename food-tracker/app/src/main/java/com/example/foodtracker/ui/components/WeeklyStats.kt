package com.example.foodtracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodtracker.data.api.DailyTotal
import com.example.foodtracker.ui.theme.Emerald
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

private const val WEEKS_COUNT = 12

@Composable
fun WeeklyStats(
    allTotals: List<DailyTotal>,
    weekOffset: Int,
    calorieGoal: Int?,
    onWeekChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val today = LocalDate.now()
    val scope = rememberCoroutineScope()

    val lastPage = WEEKS_COUNT - 1

    val pagerState = rememberPagerState(
        initialPage = (weekOffset + lastPage).coerceIn(0, lastPage),
        pageCount = { WEEKS_COUNT }
    )

    var initialPageSettled by remember { mutableStateOf(false) }
    LaunchedEffect(pagerState.currentPage) {
        if (initialPageSettled) {
            onWeekChange(pagerState.currentPage - lastPage)
        }
        initialPageSettled = true
    }

    val currentOffset = pagerState.currentPage - lastPage
    val monday = today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
        .plusWeeks(currentOffset.toLong())
    val weekDays = (0..6).map { monday.plusDays(it.toLong()) }

    val weekLabel = if (currentOffset == 0) "This Week"
        else if (currentOffset == -1) "Last Week"
        else {
            val sunday = weekDays.last()
            val formatter = DateTimeFormatter.ofPattern("MMM d")
            "${monday.format(formatter)} - ${sunday.format(formatter)}"
        }

    Column(modifier = modifier.fillMaxWidth().padding(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left arrow: go to older weeks (lower page index, past)
            IconButton(
                onClick = {
                    val target = (pagerState.currentPage - 1).coerceAtLeast(0)
                    scope.launch { pagerState.animateScrollToPage(target) }
                },
                enabled = pagerState.currentPage > 0,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Previous Week",
                    tint = if (pagerState.currentPage > 0) Emerald else Color.Gray.copy(alpha = 0.3f))
            }

            Text(
                weekLabel,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = if (isDark) Color(0xFFF5F5F7) else Color(0xFF1D1D1F)
            )

            // Right arrow: go to more recent weeks (higher page index, toward today)
            IconButton(
                onClick = {
                    val target = (pagerState.currentPage + 1).coerceAtMost(lastPage)
                    scope.launch { pagerState.animateScrollToPage(target) }
                },
                enabled = pagerState.currentPage < lastPage,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = "Next Week",
                    tint = if (pagerState.currentPage < lastPage) Emerald else Color.Gray.copy(alpha = 0.3f)
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().height(120.dp),
            beyondViewportPageCount = 1
        ) { page ->
            val pageOffset = page - lastPage
            val pageMonday = today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                .plusWeeks(pageOffset.toLong())
            val pageDays = (0..6).map { pageMonday.plusDays(it.toLong()) }

            val maxCalories = (allTotals.maxOfOrNull { it.totalCalories ?: 0.0 } ?: 2500.0)
                .coerceAtLeast(calorieGoal?.toDouble() ?: 2500.0)
                .coerceAtLeast(1.0)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom
            ) {
                pageDays.forEach { date ->
                    val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                    val total = allTotals.find { it.day == dateStr }
                    val calories = total?.totalCalories ?: 0.0
                    val goal = calorieGoal?.toDouble() ?: 2500.0

                    val barHeightFraction = (calories / maxCalories).coerceIn(0.01, 1.0).toFloat()

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (calories > 0) {
                            Text(
                                if (calories >= 1000) "${(calories / 1000).format(1)}k" else calories.toInt().toString(),
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF86868B),
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }

                        Box(
                            modifier = Modifier
                                .width(12.dp)
                                .height(80.dp * barHeightFraction)
                                .clip(RoundedCornerShape(4.dp))
                                .background(
                                    if (date == today) Emerald
                                    else if (calories > goal && goal > 0) Color(0xFFFF453A)
                                    else if (calories > 0) Emerald.copy(alpha = 0.4f)
                                    else if (isDark) Color.White.copy(alpha = 0.05f) else Color.Black.copy(alpha = 0.05f)
                                )
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            date.dayOfWeek.name.take(1),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = if (date == today) Emerald else Color(0xFF86868B)
                        )
                    }
                }
            }
        }
    }
}

private fun Double.format(digits: Int) = "%.${digits}f".format(this)
