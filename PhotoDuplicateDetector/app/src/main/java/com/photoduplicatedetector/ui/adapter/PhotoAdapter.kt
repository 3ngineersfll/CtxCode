package com.photoduplicatedetector.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.photoduplicatedetector.R
import com.photoduplicatedetector.model.PhotoData

class PhotoAdapter(
    private val onPhotoClick: (PhotoData) -> Unit,
    private val onPhotoSelected: (PhotoData, Boolean) -> Unit,
    private val isBestPhoto: (PhotoData) -> Boolean
) : ListAdapter<PhotoData, PhotoAdapter.PhotoViewHolder>(PhotoDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PhotoViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_photo, parent, false)
        return PhotoViewHolder(view)
    }

    override fun onBindViewHolder(holder: PhotoViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class PhotoViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivPhoto: ImageView = itemView.findViewById(R.id.ivPhoto)
        private val tvQualityScore: TextView = itemView.findViewById(R.id.tvQualityScore)
        private val tvIssues: TextView = itemView.findViewById(R.id.tvIssues)
        private val tvFileSize: TextView = itemView.findViewById(R.id.tvFileSize)
        private val checkboxSelect: CheckBox = itemView.findViewById(R.id.checkboxSelect)
        private val selectedOverlay: View = itemView.findViewById(R.id.selectedOverlay)
        private val tvBestBadge: TextView = itemView.findViewById(R.id.tvBestBadge)

        fun bind(photo: PhotoData) {
            Glide.with(itemView.context)
                .load(photo.uri)
                .centerCrop()
                .into(ivPhoto)

            tvQualityScore.text = itemView.context.getString(
                R.string.quality_score,
                photo.qualityScore
            )

            val qualityColor = when {
                photo.qualityScore >= 70 -> R.color.quality_high
                photo.qualityScore >= 40 -> R.color.quality_medium
                else -> R.color.quality_low
            }
            tvQualityScore.setTextColor(itemView.context.getColor(qualityColor))

            val issues = mutableListOf<String>()
            if (photo.hasClosedEyes) issues.add(itemView.context.getString(R.string.closed_eyes))
            if (!photo.hasSmile) issues.add(itemView.context.getString(R.string.no_smile))
            if (photo.blurScore > 0.3f) issues.add(itemView.context.getString(R.string.blurry))
            if (photo.faceCount == 0) issues.add(itemView.context.getString(R.string.no_faces))

            tvIssues.text = if (issues.isEmpty()) {
                "No issues detected"
            } else {
                issues.joinToString(", ")
            }

            tvFileSize.text = formatFileSize(photo.size)

            val isBest = isBestPhoto(photo)
            tvBestBadge.visibility = if (isBest) View.VISIBLE else View.GONE

            checkboxSelect.isEnabled = !isBest
            checkboxSelect.isChecked = photo.isSelected
            selectedOverlay.visibility = if (photo.isSelected) View.VISIBLE else View.GONE

            checkboxSelect.setOnCheckedChangeListener { _, isChecked ->
                onPhotoSelected(photo, isChecked)
            }

            itemView.setOnClickListener {
                if (!isBest) {
                    checkboxSelect.isChecked = !checkboxSelect.isChecked
                }
            }
        }

        private fun formatFileSize(size: Long): String {
            return when {
                size < 1024 -> "$size B"
                size < 1024 * 1024 -> String.format("%.1f KB", size / 1024.0)
                else -> String.format("%.1f MB", size / (1024.0 * 1024.0))
            }
        }
    }

    class PhotoDiffCallback : DiffUtil.ItemCallback<PhotoData>() {
        override fun areItemsTheSame(oldItem: PhotoData, newItem: PhotoData): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: PhotoData, newItem: PhotoData): Boolean {
            return oldItem == newItem
        }
    }
}
