package com.photoduplicatedetector.model

import android.net.Uri

data class PhotoData(
    val id: Long,
    val uri: Uri,
    val displayName: String,
    val dateAdded: Long,
    val size: Long,
    val path: String,
    var perceptualHash: Long = 0L,
    var qualityScore: Float = 0f,
    var hasClosedEyes: Boolean = false,
    var hasSmile: Boolean = false,
    var faceCount: Int = 0,
    var blurScore: Float = 0f,
    var isSelected: Boolean = false
) {
    fun calculateQualityScore(): Float {
        var score = 50f

        if (hasClosedEyes) score -= 30f
        if (!hasSmile) score -= 15f
        score -= (blurScore * 20f)
        if (faceCount == 0) score -= 5f

        return score.coerceIn(0f, 100f).also { qualityScore = it }
    }
}

data class PhotoGroup(
    val id: Int,
    val photos: MutableList<PhotoData>,
    var isExpanded: Boolean = false
) {
    val bestPhoto: PhotoData?
        get() = photos.maxByOrNull { it.qualityScore }

    val worstPhotos: List<PhotoData>
        get() = photos.filter { it != bestPhoto }.sortedBy { it.qualityScore }

    val totalSize: Long
        get() = photos.sumOf { it.size }

    val potentialSavings: Long
        get() = worstPhotos.sumOf { it.size }
}
