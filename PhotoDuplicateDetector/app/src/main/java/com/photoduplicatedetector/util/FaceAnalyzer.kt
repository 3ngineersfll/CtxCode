package com.photoduplicatedetector.util

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.tasks.await

object FaceAnalyzer {

    private val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setMinFaceSize(0.15f)
        .enableTracking()
        .build()

    private val detector = FaceDetection.getClient(options)

    data class FaceAnalysisResult(
        val faceCount: Int,
        val hasClosedEyes: Boolean,
        val hasSmile: Boolean,
        val averageSmileProbability: Float,
        val averageEyeOpenProbability: Float
    )

    suspend fun analyzeFaces(bitmap: Bitmap): FaceAnalysisResult {
        return try {
            val image = InputImage.fromBitmap(bitmap, 0)
            val faces = detector.process(image).await()

            if (faces.isEmpty()) {
                return FaceAnalysisResult(
                    faceCount = 0,
                    hasClosedEyes = false,
                    hasSmile = false,
                    averageSmileProbability = 0f,
                    averageEyeOpenProbability = 1f
                )
            }

            val hasClosedEyes = faces.any { face ->
                val leftEyeOpen = face.leftEyeOpenProbability ?: 1f
                val rightEyeOpen = face.rightEyeOpenProbability ?: 1f
                leftEyeOpen < 0.3f || rightEyeOpen < 0.3f
            }

            val averageSmile = faces.mapNotNull { it.smilingProbability }.average().toFloat()
            val hasSmile = averageSmile > 0.5f

            val averageEyeOpen = faces.flatMap { face ->
                listOfNotNull(face.leftEyeOpenProbability, face.rightEyeOpenProbability)
            }.average().toFloat()

            FaceAnalysisResult(
                faceCount = faces.size,
                hasClosedEyes = hasClosedEyes,
                hasSmile = hasSmile,
                averageSmileProbability = averageSmile,
                averageEyeOpenProbability = averageEyeOpen
            )
        } catch (e: Exception) {
            e.printStackTrace()
            FaceAnalysisResult(
                faceCount = 0,
                hasClosedEyes = false,
                hasSmile = false,
                averageSmileProbability = 0f,
                averageEyeOpenProbability = 1f
            )
        }
    }

    fun release() {
        detector.close()
    }
}
