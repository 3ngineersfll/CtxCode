package com.photoduplicatedetector.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.photoduplicatedetector.R
import com.photoduplicatedetector.model.PhotoData
import com.photoduplicatedetector.model.PhotoGroup

class PhotoGroupAdapter(
    private val onGroupClick: (PhotoGroup) -> Unit,
    private val onPhotoSelected: (PhotoData, Boolean) -> Unit
) : RecyclerView.Adapter<PhotoGroupAdapter.GroupViewHolder>() {

    private val groups = mutableListOf<PhotoGroup>()

    fun submitList(newGroups: List<PhotoGroup>) {
        groups.clear()
        groups.addAll(newGroups)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GroupViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_photo_group, parent, false)
        return GroupViewHolder(view)
    }

    override fun onBindViewHolder(holder: GroupViewHolder, position: Int) {
        holder.bind(groups[position])
    }

    override fun getItemCount() = groups.size

    inner class GroupViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivThumbnail: ImageView = itemView.findViewById(R.id.ivThumbnail)
        private val tvGroupTitle: TextView = itemView.findViewById(R.id.tvGroupTitle)
        private val tvSavings: TextView = itemView.findViewById(R.id.tvSavings)
        private val ivExpand: ImageView = itemView.findViewById(R.id.ivExpand)
        private val recyclerViewPhotos: RecyclerView = itemView.findViewById(R.id.recyclerViewPhotos)
        private val groupHeader: View = itemView.findViewById(R.id.groupHeader)

        private val photoAdapter = PhotoAdapter(
            onPhotoClick = { },
            onPhotoSelected = onPhotoSelected,
            isBestPhoto = { photo ->
                val group = groups[bindingAdapterPosition]
                photo == group.bestPhoto
            }
        )

        init {
            recyclerViewPhotos.layoutManager = LinearLayoutManager(itemView.context)
            recyclerViewPhotos.adapter = photoAdapter
        }

        fun bind(group: PhotoGroup) {
            Glide.with(itemView.context)
                .load(group.bestPhoto?.uri)
                .centerCrop()
                .into(ivThumbnail)

            tvGroupTitle.text = itemView.context.getString(
                R.string.photo_group_title,
                group.id + 1,
                group.photos.size
            )

            tvSavings.text = itemView.context.getString(
                R.string.potential_savings,
                formatFileSize(group.potentialSavings)
            )

            photoAdapter.submitList(group.photos)

            recyclerViewPhotos.visibility = if (group.isExpanded) View.VISIBLE else View.GONE

            ivExpand.rotation = if (group.isExpanded) 180f else 0f

            groupHeader.setOnClickListener {
                onGroupClick(group)
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
}
