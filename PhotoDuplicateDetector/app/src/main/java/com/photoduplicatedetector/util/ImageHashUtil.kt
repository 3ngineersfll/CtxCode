package com.photoduplicatedetector.util

import android.graphics.Bitmap
import android.graphics.Color
import kotlin.math.abs

object ImageHashUtil {

    private const val HASH_SIZE = 8

    fun calculatePerceptualHash(bitmap: Bitmap): Long {
        val resized = Bitmap.createScaledBitmap(bitmap, HASH_SIZE, HASH_SIZE, false)

        val pixels = IntArray(HASH_SIZE * HASH_SIZE)
        resized.getPixels(pixels, 0, HASH_SIZE, 0, 0, HASH_SIZE, HASH_SIZE)

        val grayPixels = pixels.map { pixel ->
            val r = Color.red(pixel)
            val g = Color.green(pixel)
            val b = Color.blue(pixel)
            (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        }

        val average = grayPixels.average()

        var hash = 0L
        grayPixels.forEachIndexed { index, gray ->
            if (gray > average) {
                hash = hash or (1L shl index)
            }
        }

        resized.recycle()
        return hash
    }

    fun calculateDifferenceHash(bitmap: Bitmap): Long {
        val resized = Bitmap.createScaledBitmap(bitmap, HASH_SIZE + 1, HASH_SIZE, false)

        val pixels = IntArray((HASH_SIZE + 1) * HASH_SIZE)
        resized.getPixels(pixels, 0, HASH_SIZE + 1, 0, 0, HASH_SIZE + 1, HASH_SIZE)

        val grayPixels = pixels.map { pixel ->
            val r = Color.red(pixel)
            val g = Color.green(pixel)
            val b = Color.blue(pixel)
            (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        }

        var hash = 0L
        var bitIndex = 0
        for (row in 0 until HASH_SIZE) {
            for (col in 0 until HASH_SIZE) {
                val leftIndex = row * (HASH_SIZE + 1) + col
                val rightIndex = leftIndex + 1

                if (grayPixels[leftIndex] < grayPixels[rightIndex]) {
                    hash = hash or (1L shl bitIndex)
                }
                bitIndex++
            }
        }

        resized.recycle()
        return hash
    }

    fun hammingDistance(hash1: Long, hash2: Long): Int {
        var xor = hash1 xor hash2
        var distance = 0

        while (xor != 0L) {
            distance += (xor and 1L).toInt()
            xor = xor ushr 1
        }

        return distance
    }

    fun areSimilar(hash1: Long, hash2: Long, threshold: Int = 10): Boolean {
        return hammingDistance(hash1, hash2) <= threshold
    }

    fun calculateBlurScore(bitmap: Bitmap): Float {
        val small = Bitmap.createScaledBitmap(bitmap, 100, 100, false)

        val pixels = IntArray(100 * 100)
        small.getPixels(pixels, 0, 100, 0, 0, 100, 100)

        val grayPixels = pixels.map { pixel ->
            val r = Color.red(pixel)
            val g = Color.green(pixel)
            val b = Color.blue(pixel)
            (0.299 * r + 0.587 * g + 0.114 * b)
        }

        var laplacianSum = 0.0
        for (y in 1 until 99) {
            for (x in 1 until 99) {
                val index = y * 100 + x
                val laplacian = abs(
                    4 * grayPixels[index] -
                    grayPixels[index - 1] -
                    grayPixels[index + 1] -
                    grayPixels[index - 100] -
                    grayPixels[index + 100]
                )
                laplacianSum += laplacian
            }
        }

        val variance = laplacianSum / (98 * 98)
        small.recycle()

        val normalized = (variance / 1000.0).coerceIn(0.0, 1.0)
        return (1.0 - normalized).toFloat()
    }
}
