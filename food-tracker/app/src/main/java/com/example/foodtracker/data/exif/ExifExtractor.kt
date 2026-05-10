package com.example.foodtracker.data.exif

import android.content.Context
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object ExifExtractor {

    private val exifDateFormat = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss")

    fun extractTakenAt(context: Context, uri: Uri): String? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)

                val dateOriginal = exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)
                if (!dateOriginal.isNullOrBlank()) {
                    return@use parseExifDate(dateOriginal)
                }

                val dateDigitized = exif.getAttribute(ExifInterface.TAG_DATETIME_DIGITIZED)
                if (!dateDigitized.isNullOrBlank()) {
                    return@use parseExifDate(dateDigitized)
                }

                val dateTime = exif.getAttribute(ExifInterface.TAG_DATETIME)
                if (!dateTime.isNullOrBlank()) {
                    return@use parseExifDate(dateTime)
                }

                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun parseExifDate(value: String): String? {
        return try {
            val localDateTime = LocalDateTime.parse(value, exifDateFormat)
            val zonedDateTime = localDateTime.atZone(ZoneId.systemDefault())
            DateTimeFormatter.ISO_INSTANT.format(zonedDateTime)
        } catch (e: Exception) {
            null
        }
    }
}
