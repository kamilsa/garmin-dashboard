package com.example.foodtracker.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import android.util.Base64

object ImageUtils {

    private const val MAX_DIMENSION = 2048
    private const val JPEG_QUALITY = 70
    private const val THUMBNAIL_MAX_DIMENSION = 200
    private const val THUMBNAIL_QUALITY = 60

    suspend fun uriToBase64(context: Context, uri: Uri): String? = withContext(Dispatchers.Default) {
        try {
            val bitmap = decodeSampledBitmap(context, uri, MAX_DIMENSION)
                ?: return@withContext null

            val rotated = applyExifOrientation(context, uri, bitmap)

            val outputStream = ByteArrayOutputStream()
            rotated.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, outputStream)
            val bytes = outputStream.toByteArray()

            if (bitmap !== rotated) rotated.recycle()
            if (rotated !== bitmap) bitmap.recycle()

            Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun generateThumbnailDataUrl(context: Context, uri: Uri): String? = withContext(Dispatchers.Default) {
        try {
            val bitmap = decodeSampledBitmap(context, uri, THUMBNAIL_MAX_DIMENSION)
                ?: return@withContext null

            val rotated = applyExifOrientation(context, uri, bitmap)

            val outputStream = ByteArrayOutputStream()
            rotated.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, outputStream)
            val bytes = outputStream.toByteArray()

            if (bitmap !== rotated) rotated.recycle()
            if (rotated !== bitmap) bitmap.recycle()

            "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }

    private fun decodeSampledBitmap(context: Context, uri: Uri, maxDim: Int): Bitmap? {
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, options)
        }

        options.inSampleSize = calculateInSampleSize(
            options.outWidth, options.outHeight, maxDim
        )
        options.inJustDecodeBounds = false

        return context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, options)
        }
    }

    private fun applyExifOrientation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
        val rotation = try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)
                when (exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    else -> 0f
                }
            } ?: 0f
        } catch (e: Exception) {
            0f
        }

        if (rotation == 0f) return bitmap

        val matrix = Matrix().apply { postRotate(rotation) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun calculateInSampleSize(width: Int, height: Int, maxDim: Int): Int {
        var inSampleSize = 1
        if (height > maxDim || width > maxDim) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            while ((halfHeight / inSampleSize) >= maxDim && (halfWidth / inSampleSize) >= maxDim) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }
}
