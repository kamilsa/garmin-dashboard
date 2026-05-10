package com.example.foodtracker.util

import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

object DateUtils {

    private val isoFormatter = DateTimeFormatter.ISO_INSTANT

    fun formatRelativeTime(isoString: String?): String {
        if (isoString == null) return "—"

        val instant = try {
            Instant.from(isoFormatter.parse(isoString))
        } catch (e: DateTimeParseException) {
            try {
                val localDateTime = java.time.LocalDateTime.parse(
                    isoString.replace(" ", "T")
                )
                localDateTime.atZone(ZoneId.systemDefault()).toInstant()
            } catch (e2: Exception) {
                return "—"
            }
        }

        val now = Instant.now()
        val duration = Duration.between(instant, now)

        return when {
            duration.isNegative -> "—"
            duration.toMinutes() < 1 -> "Just now"
            duration.toMinutes() < 60 -> "${duration.toMinutes()}m ago"
            duration.toHours() < 24 -> "${duration.toHours()}h ago"
            duration.toDays() == 1L -> "Yesterday"
            duration.toDays() < 7 -> "${duration.toDays()}d ago"
            else -> {
                val date = instant.atZone(ZoneId.systemDefault()).toLocalDate()
                date.format(DateTimeFormatter.ofPattern("MMM d"))
            }
        }
    }

    fun formatTimeOnly(isoString: String?): String {
        if (isoString == null) return "—"
        val instant = try {
            Instant.from(isoFormatter.parse(isoString))
        } catch (e: DateTimeParseException) {
            return "—"
        }
        val localDateTime = instant.atZone(ZoneId.systemDefault()).toLocalDateTime()
        return localDateTime.format(DateTimeFormatter.ofPattern("h:mm a"))
    }

    fun todayDateString(): String {
        return LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
    }
}
