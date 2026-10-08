package com.treinoapp.app.nativebridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.AtomicFile
import androidx.documentfile.provider.DocumentFile
import com.treinoapp.app.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

/** O worker copia o último espelho completo do WebView, mesmo com o app fechado. */
class ExternalBackupRepository(context: Context) {
    private val context = context.applicationContext
    private val prefs = this.context.getSharedPreferences("treino_external_backup", Context.MODE_PRIVATE)
    private val mirror = AtomicFile(File(this.context.filesDir, "backup/external-mirror.json"))

    private fun digest(content: String) = MessageDigest.getInstance("SHA-256").digest(content.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 255) }

    fun setFolder(uri: Uri) = synchronized(lock) {
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        context.contentResolver.takePersistableUriPermission(uri, flags)
        val folder = DocumentFile.fromTreeUri(context, uri)
        require(folder != null && folder.isDirectory && folder.canWrite()) { "Escolha uma pasta com permissão de gravação." }
        val oldUri = prefs.getString("folderUri", null)
        check(prefs.edit().putString("folderUri", uri.toString()).putString("folderName", folder.name ?: "Pasta selecionada")
            .putBoolean("enabled", false).putString("lastError", "").putLong("lastSuccessAt", 0L).putString("lastFile", "").commit()) { "Não foi possível salvar a pasta." }
        ExternalBackupScheduler.cancel(context)
        // A nova seleção só substitui o acesso anterior depois de estar salva.
        if (oldUri != null && oldUri != uri.toString()) runCatching {
            context.contentResolver.releasePersistableUriPermission(Uri.parse(oldUri), flags)
        }
        Unit
    }

    fun configure(enabled: Boolean, hours: Int, keep: Int): JSONObject = synchronized(lock) {
        require(hours in listOf(12, 24, 168)) { "Intervalo inválido." }
        require(keep in listOf(0, 7, 30)) { "Quantidade de cópias inválida." }
        if (enabled) require(prefs.getString("folderUri", null) != null) { "Escolha uma pasta primeiro." }
        check(prefs.edit().putBoolean("enabled", enabled).putInt("hours", hours).putInt("keep", keep).commit())
        if (enabled) ExternalBackupScheduler.ensure(context) else ExternalBackupScheduler.cancel(context)
        status()
    }

    fun stage(content: String): JSONObject = synchronized(lock) {
        require(content.toByteArray(Charsets.UTF_8).size <= 50 * 1024 * 1024) { "Backup maior que 50 MB." }
        val data = JSONObject(content)
        require(data.optString("app") == "TreinoApp" && data.has("historicoTreinoV3") && data.has("treinosTemplates")) { "Backup inválido." }
        val stable = JSONObject(content).apply { remove("exportedAt") }
        val hash = digest(stable.toString())
        if (hash != prefs.getString("stagedHash", "") || !mirror.baseFile.exists()) {
            mirror.baseFile.parentFile?.mkdirs()
            val output = mirror.startWrite()
            try { output.write(content.toByteArray(Charsets.UTF_8)); mirror.finishWrite(output) }
            catch (error: Exception) { mirror.failWrite(output); throw error }
            prefs.edit().putString("stagedHash", hash).putLong("stagedAt", System.currentTimeMillis()).apply()
        }
        if (prefs.getBoolean("enabled", false)) ExternalBackupScheduler.soon(context)
        status()
    }

    fun clearMirror() = synchronized(lock) {
        prefs.edit().putBoolean("enabled", false).remove("stagedHash").remove("stagedAt").apply()
        ExternalBackupScheduler.cancel(context)
        mirror.delete()
    }

    fun intervalHours() = prefs.getInt("hours", 24).takeIf { it in listOf(12, 24, 168) } ?: 24
    fun enabled() = prefs.getBoolean("enabled", false)

    fun status(): JSONObject = synchronized(lock) {
        val uri = prefs.getString("folderUri", null)
        val permission = uri != null && context.contentResolver.persistedUriPermissions.any { it.uri.toString() == uri && it.isWritePermission }
        val history = runCatching { JSONArray(prefs.getString("history", "[]")) }.getOrDefault(JSONArray())
        val recent = JSONArray()
        val current = (0 until history.length()).mapNotNull { history.optJSONObject(it) }.filter { it.optString("folder") == uri }.takeLast(5)
        for (row in current) recent.put(row.let {
            JSONObject().put("name", it.optString("name")).put("createdAt", it.optLong("createdAt")).put("bytes", it.optLong("bytes"))
        })
        JSONObject().put("enabled", enabled()).put("configured", uri != null).put("permission", permission)
            .put("folderName", prefs.getString("folderName", "")).put("hours", intervalHours()).put("keep", prefs.getInt("keep", 0))
            .put("stagedAt", prefs.getLong("stagedAt", 0L)).put("lastSuccessAt", prefs.getLong("lastSuccessAt", 0L))
            .put("lastFile", prefs.getString("lastFile", "")).put("lastError", if (uri != null && !permission) "Selecione a pasta novamente para autorizar o acesso." else prefs.getString("lastError", ""))
            .put("history", recent)
    }

    fun write(force: Boolean = false): JSONObject = synchronized(lock) {
        if (!force && !enabled()) return status().put("saved", false)
        val now = System.currentTimeMillis()
        val last = prefs.getLong("lastSuccessAt", 0L)
        if (!force && last > 0 && now >= last && now - last < intervalHours() * 3_600_000L) return status().put("saved", false)
        var created: DocumentFile? = null
        try {
            val uri = prefs.getString("folderUri", null) ?: error("Escolha uma pasta de backup.")
            val folder = DocumentFile.fromTreeUri(context, Uri.parse(uri))
            check(folder != null && folder.isDirectory && folder.canWrite()) { "Pasta indisponível. Selecione-a novamente." }
            check(mirror.baseFile.exists()) { "Abra o aplicativo para preparar seus dados." }
            val content = mirror.openRead().use { it.readBytes().toString(Charsets.UTF_8) }
            val data = JSONObject(content)
            data.put("exportedAt", java.time.Instant.now().toString())
            data.put("externalBackup", JSONObject().put("sourceCapturedAt", prefs.getLong("stagedAt", 0L)).put("automatic", !force))
            val bytes = data.toString().toByteArray(Charsets.UTF_8)
            val name = "TreinoApp_${BuildConfig.CHANNEL}_${if (force) "manual" else "auto"}_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss")) + "_${UUID.randomUUID().toString().take(8)}.json"
            created = folder.createFile("application/json", name) ?: error("Não foi possível criar o arquivo nesta pasta.")
            val document = requireNotNull(created)
            context.contentResolver.openOutputStream(document.uri, "wt")?.use { it.write(bytes); it.flush() }
                ?: error("Não foi possível gravar o backup.")
            val history = runCatching { JSONArray(prefs.getString("history", "[]")) }.getOrDefault(JSONArray())
            history.put(JSONObject().put("uri", document.uri.toString()).put("folder", uri).put("name", document.name ?: name)
                .put("createdAt", now).put("bytes", bytes.size).put("automatic", !force))
            check(prefs.edit().putString("history", history.toString()).putLong("lastSuccessAt", now)
                .putString("lastFile", document.name ?: name).putString("lastError", "").commit())
            // Exclusão opcional só de versões automáticas rastreadas e na pasta atual.
            // Cópias manuais e arquivos do usuário nunca entram nesta retenção.
            created = null
            val keep = prefs.getInt("keep", 0)
            if (keep > 0) runCatching { prune(history, uri, keep) }
            status().put("saved", true).put("fileName", document.name ?: name)
        } catch (error: Exception) {
            // Uma cópia incompleta não substitui qualquer versão anterior.
            created?.let { runCatching { it.delete() } }
            val message = if (error is SecurityException) "A permissão da pasta foi removida. Selecione a pasta novamente." else error.message ?: "Não foi possível gravar o backup."
            prefs.edit().putString("lastError", message).apply()
            throw IllegalStateException(message, error)
        }
    }

    private fun prune(history: JSONArray, folder: String, keep: Int) {
        val automatic = (0 until history.length()).mapNotNull { history.optJSONObject(it) }
            .filter { it.optBoolean("automatic") && it.optString("folder") == folder }
        val remove = automatic.dropLast(keep).mapNotNull { row ->
            val uri = row.optString("uri")
            if (runCatching { DocumentFile.fromSingleUri(context, Uri.parse(uri))?.delete() == true }.getOrDefault(false)) uri else null
        }.toSet()
        val retained = JSONArray()
        for (i in 0 until history.length()) history.optJSONObject(i)?.let { if (it.optString("uri") !in remove) retained.put(it) }
        prefs.edit().putString("history", retained.toString()).apply()
    }

    companion object { private val lock = Any() }
}
