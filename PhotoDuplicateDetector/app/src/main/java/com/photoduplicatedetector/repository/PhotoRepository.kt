package com.photoduplicatedetector.repository

import android.content.ContentResolver
import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import com.photoduplicatedetector.model.PhotoData
import com.photoduplicatedetector.model.PhotoGroup
import com.photoduplicatedetector.util.FaceAnalyzer
import com.photoduplicatedetector.util.ImageHashUtil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException

class PhotoRepository(private val contentResolver: ContentResolver) {

    suspend fun loadPhotos(): List<PhotoData> = withContext(Dispatchers.IO) {
        val photos = mutableListOf<PhotoData>()

        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATA
        )

        val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"

        contentResolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection,
            null,
            null,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
            val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
            val dataColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val name = cursor.getString(nameColumn)
                val date = cursor.getLong(dateColumn)
                val size = cursor.getLong(sizeColumn)
                val path = cursor.getString(dataColumn)

                val uri = ContentUris.withAppendedId(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    id
                )

                photos.add(
                    PhotoData(
                        id = id,
                        uri = uri,
                        displayName = name,
                        dateAdded = date,
                        size = size,
                        path = path
                    )
                )
            }
        }

        photos
    }

    suspend fun analyzePhoto(photo: PhotoData): PhotoData = withContext(Dispatchers.IO) {
        try {
            val bitmap = loadBitmap(photo.uri, 1024) ?: return@withContext photo

            photo.perceptualHash = ImageHashUtil.calculateDifferenceHash(bitmap)
            photo.blurScore = ImageHashUtil.calculateBlurScore(bitmap)

            val faceResult = FaceAnalyzer.analyzeFaces(bitmap)
            photo.faceCount = faceResult.faceCount
            photo.hasClosedEyes = faceResult.hasClosedEyes
            photo.hasSmile = faceResult.hasSmile

            photo.calculateQualityScore()

            bitmap.recycle()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        photo
    }

    suspend fun groupSimilarPhotos(photos: List<PhotoData>): List<PhotoGroup> =
        withContext(Dispatchers.Default) {
            val groups = mutableListOf<PhotoGroup>()
            val processed = mutableSetOf<Long>()
            var groupId = 0

            for (i in photos.indices) {
                if (photos[i].id in processed) continue

                val similarPhotos = mutableListOf(photos[i])
                processed.add(photos[i].id)

                for (j in i + 1 until photos.size) {
                    if (photos[j].id in processed) continue

                    if (ImageHashUtil.areSimilar(photos[i].perceptualHash, photos[j].perceptualHash)) {
                        similarPhotos.add(photos[j])
                        processed.add(photos[j].id)
                    }
                }

                if (similarPhotos.size > 1) {
                    groups.add(
                        PhotoGroup(
                            id = groupId++,
                            photos = similarPhotos.sortedByDescending { it.qualityScore }.toMutableList()
                        )
                    )
                }
            }

            groups.sortedByDescending { it.potentialSavings }
        }

    suspend fun deletePhotos(photos: List<PhotoData>): Int = withContext(Dispatchers.IO) {
        var deletedCount = 0

        photos.forEach { photo ->
            try {
                val deleted = contentResolver.delete(
                    photo.uri,
                    null,
                    null
                )
                if (deleted > 0) deletedCount++
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        deletedCount
    }

    private fun loadBitmap(uri: Uri, maxSize: Int): Bitmap? {
        return try {
            contentResolver.openInputStream(uri)?.use { inputStream ->
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeStream(inputStream, null, options)

                val scale = calculateInSampleSize(options, maxSize, maxSize)

                contentResolver.openInputStream(uri)?.use { stream ->
                    val decodeOptions = BitmapFactory.Options().apply {
                        inSampleSize = scale
                    }
                    BitmapFactory.decodeStream(stream, null, decodeOptions)
                }
            }
        } catch (e: IOException) {
            e.printStackTrace()
            null
        }
    }

    private fun calculateInSampleSize(
        options: BitmapFactory.Options,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2

            while (halfHeight / inSampleSize >= reqHeight &&
                   halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }
}
