package com.filipecruz.paquetestickers

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import org.json.JSONObject
import java.io.File

class StickerContentProvider : ContentProvider() {

    companion object {
        const val AUTHORITY = "com.filipecruz.paquetestickers.stickercontentprovider"
        const val METADATA_CODE = 1
        const val STICKERS_CODE = 2

        val uriMatcher = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, "metadata", METADATA_CODE)
            addURI(AUTHORITY, "*/stickers/*", STICKERS_CODE)
        }
    }

    override fun onCreate() = true

    override fun query(
        uri: Uri, projection: Array<String>?, selection: String?,
        selectionArgs: Array<String>?, sortOrder: String?
    ): Cursor? {
        if (uriMatcher.match(uri) != METADATA_CODE) return null

        val prefs = context!!.getSharedPreferences("paquestickers_state", 0)
        val raw = prefs.getString("state", null) ?: return null
        val packs = JSONObject(raw).getJSONArray("packs")

        val cursor = MatrixCursor(arrayOf(
            "identifier", "name", "publisher", "tray_image_file",
            "android_play_store_link", "ios_app_store_link"
        ))
        for (i in 0 until packs.length()) {
            val p = packs.getJSONObject(i)
            cursor.addRow(arrayOf(
                p.getString("id"),
                p.getString("name"),
                p.getString("publisher"),
                p.getString("trayIconFile"),
                "", ""
            ))
        }
        return cursor
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        if (uriMatcher.match(uri) != STICKERS_CODE) return null
        val segments = uri.pathSegments
        val packId = segments[0]
        val stickerId = segments[2]
        val filesDir = context!!.filesDir.absolutePath
        val file = File("$filesDir/stickers/$packId/$stickerId.webp")
        if (!file.exists()) return null
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun getType(uri: Uri) = when (uriMatcher.match(uri)) {
        METADATA_CODE -> "vnd.android.cursor.dir/vnd.$AUTHORITY.metadata"
        STICKERS_CODE -> "image/webp"
        else -> null
    }

    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?) = 0
}
