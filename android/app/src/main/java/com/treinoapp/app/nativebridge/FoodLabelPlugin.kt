package com.treinoapp.app.nativebridge

import android.Manifest
import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.util.concurrent.Executors

@CapacitorPlugin(name = "FoodLabel", permissions = [Permission(alias = "camera", strings = [Manifest.permission.CAMERA])])
class FoodLabelPlugin : Plugin() {
    private val worker = Executors.newSingleThreadExecutor()
    private var busy = false

    @Synchronized private fun claim(): Boolean { if (busy) return false; busy = true; return true }
    @Synchronized private fun release() { busy = false }

    @PluginMethod fun readLabel(call: PluginCall) {
        if (!claim()) { call.reject("Já há uma leitura de rótulo em andamento.", "OCR_BUSY"); return }
        if (call.getString("source", "camera") == "gallery") {
            try {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "image/*"; addCategory(Intent.CATEGORY_OPENABLE)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivityForResult(call, intent, "imageSelected")
            } catch (_: Exception) { release(); call.reject("Não foi possível abrir o seletor de imagens.", "OCR_PICKER") }
        } else if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionResult")
        } else launchCamera(call)
    }

    @PermissionCallback private fun cameraPermissionResult(call: PluginCall) {
        if (getPermissionState("camera") == PermissionState.GRANTED) launchCamera(call)
        else { release(); call.reject("Permissão de câmera negada. Você pode escolher uma imagem ou cadastrar manualmente.", "OCR_PERMISSION") }
    }

    private fun launchCamera(call: PluginCall) {
        try {
            val folder = File(context.cacheDir, "food-labels").apply { mkdirs() }
            val photo = File.createTempFile("label_", ".jpg", folder)
            call.data.put("capturePath", photo.absolutePath)
            val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", photo)
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                clipData = ClipData.newRawUri("Rótulo", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
            startActivityForResult(call, intent, "cameraResult")
        } catch (_: Exception) { cleanup(call); release(); call.reject("Não foi possível abrir a câmera. Tente escolher uma imagem.", "OCR_CAMERA") }
    }

    @ActivityCallback private fun cameraResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) { release(); return }
        if (result.resultCode != Activity.RESULT_OK) { cleanup(call); release(); call.resolve(JSObject().put("cancelled", true)); return }
        val file = captureFile(call)
        if (file == null || !file.exists() || file.length() == 0L) { cleanup(call); release(); call.reject("A câmera não entregou uma imagem. Tente novamente.", "OCR_IMAGE"); return }
        recognize(call, Uri.fromFile(file))
    }

    @ActivityCallback private fun imageSelected(call: PluginCall?, result: ActivityResult) {
        if (call == null) { release(); return }
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) { release(); call.resolve(JSObject().put("cancelled", true)); return }
        if (uri.scheme != "content") { release(); call.reject("Imagem não suportada pelo seletor.", "OCR_IMAGE"); return }
        recognize(call, uri)
    }

    private fun sampledBitmap(uri: Uri): Bitmap {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
        require(bounds.outWidth > 0 && bounds.outHeight > 0) { "Imagem inválida" }
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 2048) sample *= 2
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, options) } ?: error("Imagem inválida")
        val orientation = try { resolver.openInputStream(uri).use { stream -> if (stream == null) 1 else ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1) } } catch (_: Exception) { 1 }
        val matrix = Matrix()
        when (orientation) {
            2 -> matrix.setScale(-1f, 1f)
            3 -> matrix.setRotate(180f)
            4 -> matrix.setScale(1f, -1f)
            5 -> { matrix.setRotate(90f); matrix.postScale(-1f, 1f) }
            6 -> matrix.setRotate(90f)
            7 -> { matrix.setRotate(270f); matrix.postScale(-1f, 1f) }
            8 -> matrix.setRotate(270f)
        }
        if (matrix.isIdentity) return bitmap
        val oriented = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        if (oriented !== bitmap) bitmap.recycle()
        return oriented
    }

    private fun recognize(call: PluginCall, uri: Uri) {
        synchronized(this) { busy = true }
        worker.execute {
            var imageBitmap: Bitmap? = null
            try {
                val bitmap = sampledBitmap(uri); imageBitmap = bitmap
                val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                recognizer.process(InputImage.fromBitmap(bitmap, 0))
                    .addOnSuccessListener { result ->
                        val lines = JSArray()
                        for (block in result.textBlocks) for (line in block.lines) {
                            val box = line.boundingBox ?: continue
                            lines.put(JSObject().apply { put("text", line.text.take(1000)); put("left", box.left); put("top", box.top); put("height", box.height()) })
                        }
                        call.resolve(JSObject().apply { put("text", result.text.take(30000)); put("lines", lines); put("onDevice", true) })
                    }
                    .addOnFailureListener { call.reject("Não foi possível ler o rótulo. Tente uma imagem nítida ou preencha manualmente.", "OCR_RECOGNITION") }
                    .addOnCompleteListener { recognizer.close(); bitmap.recycle(); cleanup(call); release() }
            } catch (_: OutOfMemoryError) {
                imageBitmap?.recycle(); cleanup(call); release()
                call.reject("Memória insuficiente para esta imagem. Tente uma imagem menor ou cadastro manual.", "OCR_MEMORY")
            } catch (_: Exception) {
                imageBitmap?.recycle(); cleanup(call); release()
                call.reject("Não foi possível processar a imagem. Tente outra foto ou cadastro manual.", "OCR_IMAGE")
            }
        }
    }

    private fun captureFile(call: PluginCall): File? {
        val path = call.getString("capturePath") ?: return null
        val file = File(path).canonicalFile
        val folder = File(context.cacheDir, "food-labels").canonicalFile
        return file.takeIf { it.parentFile == folder && it.name.startsWith("label_") && it.extension == "jpg" }
    }
    private fun cleanup(call: PluginCall) { try { captureFile(call)?.delete() } catch (_: Exception) {} }
    override fun handleOnDestroy() { worker.shutdown(); super.handleOnDestroy() }
}
