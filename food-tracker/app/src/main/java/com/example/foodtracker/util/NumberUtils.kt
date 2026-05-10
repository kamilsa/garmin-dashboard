package com.example.foodtracker.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object NumberUtils {

    private val intFormat = DecimalFormat("#", DecimalFormatSymbols(Locale.US))
    private val oneDecimalFormat = DecimalFormat("#.#", DecimalFormatSymbols(Locale.US))

    fun formatInt(value: Double?): String {
        if (value == null) return "—"
        return intFormat.format(value)
    }

    fun formatDecimal(value: Double?): String {
        if (value == null) return "—"
        return oneDecimalFormat.format(value)
    }

    fun parseDoubleOrNull(text: String): Double? {
        return text.trim().ifEmpty { null }?.toDoubleOrNull()
    }
}
