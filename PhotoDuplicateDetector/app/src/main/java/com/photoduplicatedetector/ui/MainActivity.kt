package com.photoduplicatedetector.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.photoduplicatedetector.R
import com.photoduplicatedetector.repository.PhotoRepository
import com.photoduplicatedetector.ui.adapter.PhotoGroupAdapter
import com.photoduplicatedetector.viewmodel.MainViewModel
import com.photoduplicatedetector.viewmodel.ViewModelFactory

class MainActivity : AppCompatActivity() {

    private val viewModel: MainViewModel by viewModels {
        ViewModelFactory(PhotoRepository(contentResolver))
    }

    private lateinit var adapter: PhotoGroupAdapter
    private lateinit var recyclerView: RecyclerView
    private lateinit var btnScan: MaterialButton
    private lateinit var btnDelete: MaterialButton
    private lateinit var tvGroupCount: TextView
    private lateinit var tvPotentialSavings: TextView
    private lateinit var tvProgress: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmptyState: TextView
    private lateinit var fabSelectAll: ExtendedFloatingActionButton

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startAnalysis()
        } else {
            showPermissionDeniedDialog()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupRecyclerView()
        setupObservers()
        setupClickListeners()
    }

    private fun initViews() {
        recyclerView = findViewById(R.id.recyclerView)
        btnScan = findViewById(R.id.btnScan)
        btnDelete = findViewById(R.id.btnDelete)
        tvGroupCount = findViewById(R.id.tvGroupCount)
        tvPotentialSavings = findViewById(R.id.tvPotentialSavings)
        tvProgress = findViewById(R.id.tvProgress)
        progressBar = findViewById(R.id.progressBar)
        tvEmptyState = findViewById(R.id.tvEmptyState)
        fabSelectAll = findViewById(R.id.fabSelectAll)
    }

    private fun setupRecyclerView() {
        adapter = PhotoGroupAdapter(
            onGroupClick = { group ->
                viewModel.toggleGroupExpansion(group.id)
            },
            onPhotoSelected = { photo, isSelected ->
                photo.isSelected = isSelected
                updateDeleteButton()
            }
        )

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    private fun setupObservers() {
        viewModel.photoGroups.observe(this) { groups ->
            if (groups.isEmpty()) {
                recyclerView.visibility = View.GONE
                tvEmptyState.visibility = View.VISIBLE
                fabSelectAll.visibility = View.GONE
            } else {
                recyclerView.visibility = View.VISIBLE
                tvEmptyState.visibility = View.GONE
                fabSelectAll.visibility = View.VISIBLE
                adapter.submitList(groups)

                tvGroupCount.text = getString(R.string.duplicates_found, groups.size)
                tvPotentialSavings.text = getString(
                    R.string.potential_savings,
                    formatFileSize(viewModel.getTotalPotentialSavings())
                )
            }
        }

        viewModel.isLoading.observe(this) { isLoading ->
            btnScan.isEnabled = !isLoading
            progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            tvProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.analysisProgress.observe(this) { progress ->
            progressBar.max = progress.total
            progressBar.progress = progress.current

            val progressText = when (progress.phase) {
                MainViewModel.AnalysisProgress.Phase.LOADING -> getString(R.string.loading_photos)
                MainViewModel.AnalysisProgress.Phase.ANALYZING ->
                    "${getString(R.string.analyzing_photos)} ${progress.current}/${progress.total}"
                MainViewModel.AnalysisProgress.Phase.GROUPING -> getString(R.string.grouping_photos)
                MainViewModel.AnalysisProgress.Phase.COMPLETE -> getString(R.string.analysis_complete)
            }
            tvProgress.text = progressText
        }

        viewModel.deletionResult.observe(this) { result ->
            val message = when {
                result.success -> getString(R.string.delete_success, result.deletedCount)
                result.deletedCount > 0 -> getString(
                    R.string.delete_partial,
                    result.deletedCount,
                    result.totalCount
                )
                else -> getString(R.string.delete_failed)
            }
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }

        viewModel.error.observe(this) { error ->
            error?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun setupClickListeners() {
        btnScan.setOnClickListener {
            checkPermissionAndScan()
        }

        btnDelete.setOnClickListener {
            showDeleteConfirmation()
        }

        fabSelectAll.setOnClickListener {
            selectAllBadPhotos()
        }
    }

    private fun checkPermissionAndScan() {
        val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.READ_MEDIA_IMAGES
        } else {
            Manifest.permission.READ_EXTERNAL_STORAGE
        }

        when {
            ContextCompat.checkSelfPermission(
                this,
                permission
            ) == PackageManager.PERMISSION_GRANTED -> {
                startAnalysis()
            }
            shouldShowRequestPermissionRationale(permission) -> {
                showPermissionRationale()
            }
            else -> {
                permissionLauncher.launch(permission)
            }
        }
    }

    private fun startAnalysis() {
        viewModel.loadAndAnalyzePhotos()
    }

    private fun showDeleteConfirmation() {
        val selectedCount = viewModel.getSelectedPhotosCount()
        if (selectedCount == 0) return

        AlertDialog.Builder(this)
            .setTitle(R.string.delete_confirmation_title)
            .setMessage(getString(R.string.delete_confirmation_message, selectedCount))
            .setPositiveButton(R.string.delete) { _, _ ->
                val selectedPhotos = viewModel.getSelectedPhotos()
                viewModel.deleteSelectedPhotos(selectedPhotos)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun selectAllBadPhotos() {
        viewModel.photoGroups.value?.forEach { group ->
            viewModel.selectPhotosForDeletion(group, selectAll = true)
        }
        updateDeleteButton()
        adapter.submitList(viewModel.photoGroups.value)
    }

    private fun updateDeleteButton() {
        val count = viewModel.getSelectedPhotosCount()
        btnDelete.isEnabled = count > 0
        btnDelete.text = if (count > 0) {
            getString(R.string.photos_selected, count)
        } else {
            getString(R.string.delete_selected)
        }
    }

    private fun showPermissionRationale() {
        AlertDialog.Builder(this)
            .setTitle(R.string.permission_required)
            .setMessage("This app needs access to your photos to analyze and find duplicates.")
            .setPositiveButton(R.string.grant_permission) { _, _ ->
                val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    Manifest.permission.READ_MEDIA_IMAGES
                } else {
                    Manifest.permission.READ_EXTERNAL_STORAGE
                }
                permissionLauncher.launch(permission)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun showPermissionDeniedDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.permission_required)
            .setMessage(R.string.permission_denied)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun formatFileSize(size: Long): String {
        return when {
            size < 1024 -> "$size B"
            size < 1024 * 1024 -> String.format("%.1f KB", size / 1024.0)
            else -> String.format("%.1f MB", size / (1024.0 * 1024.0))
        }
    }
}
