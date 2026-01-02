package com.photoduplicatedetector.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.photoduplicatedetector.model.PhotoData
import com.photoduplicatedetector.model.PhotoGroup
import com.photoduplicatedetector.repository.PhotoRepository
import kotlinx.coroutines.launch

class MainViewModel(private val repository: PhotoRepository) : ViewModel() {

    private val _photos = MutableLiveData<List<PhotoData>>()
    val photos: LiveData<List<PhotoData>> = _photos

    private val _photoGroups = MutableLiveData<List<PhotoGroup>>()
    val photoGroups: LiveData<List<PhotoGroup>> = _photoGroups

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _analysisProgress = MutableLiveData<AnalysisProgress>()
    val analysisProgress: LiveData<AnalysisProgress> = _analysisProgress

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _deletionResult = MutableLiveData<DeletionResult>()
    val deletionResult: LiveData<DeletionResult> = _deletionResult

    data class AnalysisProgress(
        val current: Int,
        val total: Int,
        val phase: Phase
    ) {
        enum class Phase {
            LOADING, ANALYZING, GROUPING, COMPLETE
        }

        val percentage: Int
            get() = if (total > 0) (current * 100) / total else 0
    }

    data class DeletionResult(
        val deletedCount: Int,
        val totalCount: Int,
        val success: Boolean
    )

    fun loadAndAnalyzePhotos() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _analysisProgress.value = AnalysisProgress(0, 0, AnalysisProgress.Phase.LOADING)

                val photos = repository.loadPhotos()
                _photos.value = photos

                if (photos.isEmpty()) {
                    _error.value = "No photos found in gallery"
                    _isLoading.value = false
                    return@launch
                }

                _analysisProgress.value = AnalysisProgress(0, photos.size, AnalysisProgress.Phase.ANALYZING)

                val analyzedPhotos = mutableListOf<PhotoData>()
                photos.forEachIndexed { index, photo ->
                    val analyzed = repository.analyzePhoto(photo)
                    analyzedPhotos.add(analyzed)
                    _analysisProgress.value = AnalysisProgress(
                        index + 1,
                        photos.size,
                        AnalysisProgress.Phase.ANALYZING
                    )
                }

                _analysisProgress.value = AnalysisProgress(
                    photos.size,
                    photos.size,
                    AnalysisProgress.Phase.GROUPING
                )

                val groups = repository.groupSimilarPhotos(analyzedPhotos)
                _photoGroups.value = groups

                _analysisProgress.value = AnalysisProgress(
                    photos.size,
                    photos.size,
                    AnalysisProgress.Phase.COMPLETE
                )

            } catch (e: Exception) {
                _error.value = "Error analyzing photos: ${e.message}"
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteSelectedPhotos(photos: List<PhotoData>) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val deletedCount = repository.deletePhotos(photos)

                _deletionResult.value = DeletionResult(
                    deletedCount = deletedCount,
                    totalCount = photos.size,
                    success = deletedCount == photos.size
                )

                loadAndAnalyzePhotos()

            } catch (e: Exception) {
                _error.value = "Error deleting photos: ${e.message}"
                _deletionResult.value = DeletionResult(0, photos.size, false)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun toggleGroupExpansion(groupId: Int) {
        val currentGroups = _photoGroups.value ?: return
        val updatedGroups = currentGroups.map { group ->
            if (group.id == groupId) {
                group.copy(isExpanded = !group.isExpanded)
            } else {
                group
            }
        }
        _photoGroups.value = updatedGroups
    }

    fun selectPhotosForDeletion(group: PhotoGroup, selectAll: Boolean = false) {
        val currentGroups = _photoGroups.value ?: return
        val updatedGroups = currentGroups.map { g ->
            if (g.id == group.id) {
                val updatedPhotos = g.photos.map { photo ->
                    if (selectAll) {
                        photo.copy(isSelected = photo != g.bestPhoto)
                    } else {
                        photo.copy(isSelected = !photo.isSelected)
                    }
                }
                g.copy(photos = updatedPhotos.toMutableList())
            } else {
                g
            }
        }
        _photoGroups.value = updatedGroups
    }

    fun getSelectedPhotosCount(): Int {
        return _photoGroups.value?.flatMap { it.photos }?.count { it.isSelected } ?: 0
    }

    fun getSelectedPhotos(): List<PhotoData> {
        return _photoGroups.value?.flatMap { it.photos }?.filter { it.isSelected } ?: emptyList()
    }

    fun getTotalPotentialSavings(): Long {
        return _photoGroups.value?.sumOf { it.potentialSavings } ?: 0L
    }
}
