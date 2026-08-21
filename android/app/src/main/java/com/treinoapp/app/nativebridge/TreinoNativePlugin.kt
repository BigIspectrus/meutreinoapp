package com.treinoapp.app.nativebridge

import android.Manifest
import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.os.Build
import android.os.Environment
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.treinoapp.app.BuildConfig
import com.treinoapp.app.MainActivity
import com.treinoapp.app.data.TreinoDatabase
import com.treinoapp.app.data.WorkoutSessionEntity
import com.treinoapp.app.data.WorkoutSetEntity
import com.treinoapp.app.widget.TreinoAppWidgetProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

@CapacitorPlugin(name = "TreinoNative")
class TreinoNativePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val health by lazy { HealthConnectRepository(context) }
    private val db by lazy { TreinoDatabase.get(context) }

    @PluginMethod
    fun getNativeInfo(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("native", true)
            put("platform", "android")
            put("channel", BuildConfig.CHANNEL)
            put("versionName", BuildConfig.VERSION_NAME)
            put("versionCode", BuildConfig.VERSION_CODE)
            put("packageName", context.packageName)
            put("commit", BuildConfig.GIT_SHA)
            put("buildTime", BuildConfig.BUILD_TIME)
        })
    }

    @PluginMethod
    fun getNativeStorageInfo(call: PluginCall) {
        scope.launch {
            try {
                val dataBytes = runCatching {
                    context.dataDir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
                }.getOrDefault(0L)
                val dbBytes = runCatching { context.getDatabasePath("treinoapp_native.db").length() }.getOrDefault(0L)
                resolve(call, JSObject().apply {
                    put("protected", true)
                    put("dataBytes", dataBytes)
                    put("databaseBytes", dbBytes)
                    put("note", "Armazenamento privado do Android; preservado em atualizações do mesmo app")
                })
            } catch (e: Exception) { reject(call, "Falha ao consultar armazenamento Android", e) }
        }
    }

    @PluginMethod
    fun openUrl(call: PluginCall) {
        val url = call.getString("url") ?: return call.reject("url obrigatório")
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Não foi possível abrir o link", e)
        }
    }

    @PluginMethod
    fun requestCorePermissions(call: PluginCall) {
        (activity as? MainActivity)?.requestCorePermissions(call) ?: call.reject("Activity indisponível")
    }

    @PluginMethod
    fun startWorkout(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 29 && ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permissão de atividade física necessária para manter o treino em segundo plano")
            return
        }
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_START) {
                putExtra(WorkoutForegroundService.EXTRA_SESSION, call.getString("sessionId", UUID.randomUUID().toString()))
                putExtra(WorkoutForegroundService.EXTRA_NAME, call.getString("name", "Treino"))
                putExtra(WorkoutForegroundService.EXTRA_STARTED, longArg(call, "startedAt", System.currentTimeMillis()))
                putExtra(WorkoutForegroundService.EXTRA_TOTAL, call.getInt("totalSets", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_DONE, call.getInt("completedSets", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_EXERCISE, call.getString("currentExercise", ""))
                putExtra(WorkoutForegroundService.EXTRA_SET, call.getInt("currentSet", 1) ?: 1)
            }
            call.resolve(JSObject().apply { put("started", true) })
        } catch (e: Exception) {
            call.reject("Não foi possível iniciar o serviço de treino", e)
        }
    }

    @PluginMethod
    fun updateWorkout(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_UPDATE) {
                call.getString("sessionId")?.let { putExtra(WorkoutForegroundService.EXTRA_SESSION, it) }
                call.getString("name")?.let { putExtra(WorkoutForegroundService.EXTRA_NAME, it) }
                putExtra(WorkoutForegroundService.EXTRA_TOTAL, call.getInt("totalSets", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_DONE, call.getInt("completedSets", 0) ?: 0)
                call.getString("currentExercise")?.let { putExtra(WorkoutForegroundService.EXTRA_EXERCISE, it) }
                putExtra(WorkoutForegroundService.EXTRA_SET, call.getInt("currentSet", 1) ?: 1)
                putExtra(WorkoutForegroundService.EXTRA_PAUSED_BOOL, call.getBoolean("paused", false) ?: false)
            }
            call.resolve()
        } catch (e: Exception) { call.reject("Falha ao atualizar treino nativo", e) }
    }

    @PluginMethod fun pauseWorkout(call: PluginCall) = serviceCall(call, WorkoutForegroundService.ACTION_PAUSE)
    @PluginMethod fun resumeWorkout(call: PluginCall) = serviceCall(call, WorkoutForegroundService.ACTION_RESUME)
    @PluginMethod fun finishWorkout(call: PluginCall) = serviceCall(call, WorkoutForegroundService.ACTION_FINISH)

    @PluginMethod
    fun startRest(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_START_REST) {
                putExtra(WorkoutForegroundService.EXTRA_SECONDS, (call.getInt("seconds", 0) ?: 0).toLong())
                putExtra(WorkoutForegroundService.EXTRA_EXERCISE, call.getString("exercise", ""))
                putExtra(WorkoutForegroundService.EXTRA_SET, call.getInt("setNumber", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_NEXT_EXERCISE, call.getString("nextExercise", ""))
                putExtra(WorkoutForegroundService.EXTRA_NEXT_SET, call.getInt("nextSetNumber", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_NEXT_ORDINAL, call.getInt("nextOrdinal", -1) ?: -1)
                putExtra(WorkoutForegroundService.EXTRA_SESSION, call.getString("sessionId", ""))
            }
            call.resolve()
        } catch (e: Exception) { call.reject("Falha ao iniciar descanso", e) }
    }

    @PluginMethod
    fun adjustRest(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_ADJUST_REST) {
                putExtra(WorkoutForegroundService.EXTRA_DELTA, (call.getInt("deltaSeconds", 0) ?: 0).toLong())
            }
            call.resolve()
        } catch (e: Exception) { call.reject("Falha ao ajustar descanso", e) }
    }

    @PluginMethod fun skipRest(call: PluginCall) = serviceCall(call, WorkoutForegroundService.ACTION_SKIP_REST)

    @PluginMethod
    fun configureRestAlerts(call: PluginCall) {
        val vibration = call.getString("vibration", "medium") ?: "medium"
        val sound = call.getBoolean("sound", true) ?: true
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_CONFIGURE_ALERTS) {
                putExtra(WorkoutForegroundService.EXTRA_VIBRATION, vibration)
                putExtra(WorkoutForegroundService.EXTRA_SOUND, sound)
            }
            call.resolve(JSObject().apply {
                put("vibration", vibration)
                put("sound", sound)
            })
        } catch (e: Exception) { call.reject("Falha ao configurar avisos de descanso", e) }
    }

    @PluginMethod
    fun testRestAlert(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_TEST_REST_ALERT)
            call.resolve(JSObject().apply { put("posted", true) })
        } catch (e: Exception) { call.reject("Falha ao testar o aviso de descanso", e) }
    }

    @PluginMethod
    fun testWatchSetAction(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_TEST_WATCH_SET_ALERT)
            call.resolve(JSObject().apply { put("posted", true) })
        } catch (e: Exception) { call.reject("Falha ao testar o botão do relógio", e) }
    }

    @PluginMethod
    fun acknowledgeSetStart(call: PluginCall) {
        try {
            WorkoutForegroundService.send(context, WorkoutForegroundService.ACTION_ACK_SET_START) {
                putExtra(WorkoutForegroundService.EXTRA_REQUEST_ID, call.getString("requestId", ""))
                putExtra(WorkoutForegroundService.EXTRA_NEXT_EXERCISE, call.getString("exercise", ""))
                putExtra(WorkoutForegroundService.EXTRA_NEXT_SET, call.getInt("setNumber", 0) ?: 0)
                putExtra(WorkoutForegroundService.EXTRA_NEXT_ORDINAL, call.getInt("ordinal", -1) ?: -1)
            }
            call.resolve(JSObject().apply { put("acknowledged", true) })
        } catch (e: Exception) { call.reject("Falha ao confirmar início da série", e) }
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) { call.reject("Não foi possível abrir as notificações do Android", e) }
    }

    @PluginMethod
    fun getWorkoutState(call: PluginCall) {
        val p = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
        call.resolve(JSObject().apply {
            put("active", p.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false))
            put("sessionId", p.getString(WorkoutForegroundService.KEY_SESSION, null))
            put("name", p.getString(WorkoutForegroundService.KEY_NAME, null))
            put("startedAt", p.getLong(WorkoutForegroundService.KEY_STARTED, 0L))
            put("totalSets", p.getInt(WorkoutForegroundService.KEY_TOTAL, 0))
            put("completedSets", p.getInt(WorkoutForegroundService.KEY_DONE, 0))
            put("currentExercise", p.getString(WorkoutForegroundService.KEY_EXERCISE, null))
            put("currentSet", p.getInt(WorkoutForegroundService.KEY_SET, 0))
            put("restEndAt", p.getLong(WorkoutForegroundService.KEY_REST_END, 0L))
            put("paused", p.getBoolean(WorkoutForegroundService.KEY_PAUSED, false))
            put("pendingSetStartedAt", p.getLong(WorkoutForegroundService.KEY_PENDING_SET_STARTED_AT, 0L))
            put("pendingSetExercise", p.getString(WorkoutForegroundService.KEY_PENDING_SET_EXERCISE, null))
            put("pendingSetNumber", p.getInt(WorkoutForegroundService.KEY_PENDING_SET_NUMBER, 0))
            put("pendingSetOrdinal", p.getInt(WorkoutForegroundService.KEY_PENDING_SET_ORDINAL, -1))
            put("pendingSetSession", p.getString(WorkoutForegroundService.KEY_PENDING_SET_SESSION, null))
            put("pendingSetRequestId", p.getString(WorkoutForegroundService.KEY_PENDING_REQUEST_ID, null))
        })
    }

    @PluginMethod
    fun updateWidgetState(call: PluginCall) {
        TreinoAppWidgetProvider.saveState(
            context,
            call.getString("nextWorkout", "Treino") ?: "Treino",
            call.getInt("weeklyDone", 0) ?: 0,
            call.getInt("weeklyTarget", 4) ?: 4,
            call.getInt("streak", 0) ?: 0,
        )
        call.resolve()
    }


    @PluginMethod
    fun saveTextFile(call: PluginCall) {
        val content = call.getString("content") ?: return call.reject("content obrigatório")
        val requestedName = call.getString("fileName", "TreinoApp_relatorio.html") ?: "TreinoApp_relatorio.html"
        val fileName = sanitizeFileName(requestedName)
        val mimeType = call.getString("mimeType", "text/html") ?: "text/html"
        scope.launch {
            try {
                val result = saveToDownloads(fileName, mimeType, content.toByteArray(Charsets.UTF_8))
                resolve(call, JSObject().apply {
                    put("saved", true)
                    put("uri", result.first.toString())
                    put("location", result.second)
                })
            } catch (e: Exception) { reject(call, "Falha ao salvar arquivo em Downloads", e) }
        }
    }

    @PluginMethod
    fun saveBase64File(call: PluginCall) {
        val dataUrl = call.getString("dataUrl") ?: return call.reject("dataUrl obrigatório")
        val requestedName = call.getString("fileName", "TreinoApp_arquivo.bin") ?: "TreinoApp_arquivo.bin"
        val fileName = sanitizeFileName(requestedName)
        val mimeType = call.getString("mimeType", "application/octet-stream") ?: "application/octet-stream"
        scope.launch {
            try {
                val result = saveToDownloads(fileName, mimeType, decodeDataUrl(dataUrl))
                resolve(call, JSObject().apply {
                    put("saved", true)
                    put("uri", result.first.toString())
                    put("location", result.second)
                })
            } catch (e: Exception) { reject(call, "Falha ao salvar arquivo em Downloads", e) }
        }
    }

    @PluginMethod
    fun shareTextFile(call: PluginCall) {
        val content = call.getString("content") ?: return call.reject("content obrigatório")
        val requestedName = call.getString("fileName", "TreinoApp_relatorio.html") ?: "TreinoApp_relatorio.html"
        val fileName = sanitizeFileName(requestedName)
        val mimeType = call.getString("mimeType", "text/html") ?: "text/html"
        val title = call.getString("title", "Compartilhar pelo TreinoApp") ?: "Compartilhar pelo TreinoApp"
        scope.launch {
            try {
                shareBytes(fileName, mimeType, content.toByteArray(Charsets.UTF_8), title)
                resolve(call, JSObject().apply { put("shared", true) })
            } catch (e: Exception) { reject(call, "Falha ao abrir compartilhamento Android", e) }
        }
    }

    @PluginMethod
    fun saveImageToGallery(call: PluginCall) {
        val dataUrl = call.getString("dataUrl") ?: return call.reject("dataUrl obrigatório")
        val requestedName = call.getString("fileName", "TreinoApp_treino.png") ?: "TreinoApp_treino.png"
        val fileName = sanitizeFileName(requestedName).let { if (it.lowercase().endsWith(".png")) it else "$it.png" }
        scope.launch {
            try {
                val bytes = decodeDataUrl(dataUrl)
                val result = saveToPictures(fileName, "image/png", bytes)
                resolve(call, JSObject().apply {
                    put("saved", true)
                    put("uri", result.first.toString())
                    put("location", result.second)
                })
            } catch (e: Exception) { reject(call, "Falha ao salvar imagem na galeria", e) }
        }
    }

    @PluginMethod
    fun shareImage(call: PluginCall) {
        val dataUrl = call.getString("dataUrl") ?: return call.reject("dataUrl obrigatório")
        val requestedName = call.getString("fileName", "TreinoApp_treino.png") ?: "TreinoApp_treino.png"
        val fileName = sanitizeFileName(requestedName).let { if (it.lowercase().endsWith(".png")) it else "$it.png" }
        val title = call.getString("title", "Compartilhar treino") ?: "Compartilhar treino"
        scope.launch {
            try {
                shareBytes(fileName, "image/png", decodeDataUrl(dataUrl), title)
                resolve(call, JSObject().apply { put("shared", true) })
            } catch (e: Exception) { reject(call, "Falha ao compartilhar imagem", e) }
        }
    }

    @PluginMethod
    fun getHealthStatus(call: PluginCall) {
        scope.launch {
            try {
                val available = health.isAvailable()
                val granted = if (available) health.grantedPermissions() else emptySet()
                resolve(call, JSObject().apply {
                    put("available", available)
                    put("granted", available && granted.containsAll(health.requiredPermissions))
                    put("backgroundAvailable", available && health.backgroundReadAvailable())
                    put("backgroundGranted", PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND in granted)
                    put("grantedCount", granted.size)
                    put("requiredCount", if (available) health.requestablePermissions().size else health.requiredPermissions.size)
                    put("readExercise", granted.contains(HealthPermission.getReadPermission(ExerciseSessionRecord::class)))
                    put("writeExercise", granted.contains(HealthPermission.getWritePermission(ExerciseSessionRecord::class)))
                    put("readHeartRate", granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class)))
                    put("readCalories", granted.contains(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)))
                    put("readSleep", granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))
                    put("readRestingHeartRate", granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)))
                    put("readHrv", granted.contains(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)))
                    put("readBodyFat", granted.contains(HealthPermission.getReadPermission(BodyFatRecord::class)))
                    put("readLeanBodyMass", granted.contains(HealthPermission.getReadPermission(LeanBodyMassRecord::class)))
                })
            } catch (e: Exception) { reject(call, "Falha ao consultar Health Connect", e) }
        }
    }

    @PluginMethod
    fun getRecoverySnapshot(call: PluginCall) {
        val days = call.getInt("days", 28) ?: 28
        scope.launch {
            try {
                val r = health.getRecoverySnapshot(days)
                resolve(call, JSObject().apply {
                    put("generatedAt", r.generatedAt)
                    put("sleepLastMinutes", r.sleepLastMinutes)
                    put("sleepLastStartMs", r.sleepLastStartMs)
                    put("sleepLastEndMs", r.sleepLastEndMs)
                    put("sleep7dAvgMinutes", r.sleep7dAvgMinutes)
                    put("restingHrLatest", r.restingHrLatest)
                    put("restingHr7dAvg", r.restingHr7dAvg)
                    put("restingHr28dAvg", r.restingHr28dAvg)
                    put("hrvLatestMs", r.hrvLatestMs)
                    put("hrv7dAvgMs", r.hrv7dAvgMs)
                    put("hrv28dAvgMs", r.hrv28dAvgMs)
                    put("weightKg", r.weightKg)
                    put("bodyFatPct", r.bodyFatPct)
                    put("leanMassKg", r.leanMassKg)
                    put("sleepSource", r.sleepSource)
                    put("restingHrSource", r.restingHrSource)
                    put("hrvSource", r.hrvSource)
                    put("bodySource", r.bodySource)
                    put("permissions", JSArray(r.permissions))
                })
            } catch (e: Exception) { reject(call, "Falha ao ler recuperação do Health Connect", e) }
        }
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        (activity as? MainActivity)?.requestHealthPermissions(call) ?: call.reject("Activity indisponível")
    }

    @PluginMethod
    fun findHealthMatch(call: PluginCall) {
        val start = longArg(call, "startMs")
        val end = longArg(call, "endMs")
        scope.launch {
            try { resolve(call, matchToJs(health.findBestExerciseMatch(start, end))) }
            catch (e: Exception) { reject(call, "Falha ao buscar treino no Health Connect", e) }
        }
    }

    @PluginMethod
    fun listHealthExercises(call: PluginCall) {
        val hours = call.getInt("hours", 12) ?: 12
        val targetStart = longArgOrNull(call, "targetStartMs")
        val targetEnd = longArgOrNull(call, "targetEndMs")
        scope.launch {
            try {
                val rows = health.listRecentExerciseSessions(hours, targetStart, targetEnd)
                val arr = JSArray()
                rows.forEach { r ->
                    arr.put(JSObject().apply {
                        put("recordId", r.recordId)
                        put("sourceApp", r.sourceApp)
                        put("title", r.title)
                        put("exerciseType", r.exerciseType)
                        put("startMs", r.startMs)
                        put("endMs", r.endMs)
                        put("durationMin", r.durationMin)
                        put("confidence", r.confidence)
                        put("overlapRatio", r.overlapRatio)
                        put("startDiffMin", r.startDiffMin)
                        put("endDiffMin", r.endDiffMin)
                        put("avgHr", r.avgHr)
                        put("maxHr", r.maxHr)
                        put("minHr", r.minHr)
                        put("kcal", r.kcal)
                    })
                }
                resolve(call, JSObject().apply { put("records", arr); put("count", rows.size) })
            } catch (e: Exception) { reject(call, "Falha ao listar exercícios do Health Connect", e) }
        }
    }

    @PluginMethod
    fun getHealthExerciseDetail(call: PluginCall) {
        val recordId = call.getString("recordId") ?: return call.reject("recordId obrigatório")
        val start = longArg(call, "startMs")
        val end = longArg(call, "endMs")
        scope.launch {
            try {
                val detail = health.getExerciseDetail(recordId, start, end)
                if (detail == null) resolve(call, JSObject().apply { put("found", false) })
                else resolve(call, matchToJs(detail))
            } catch (e: Exception) { reject(call, "Falha ao carregar detalhes da sessão Health", e) }
        }
    }

    @PluginMethod
    fun probeHealthConnect(call: PluginCall) {
        scope.launch {
            try {
                val p = health.probeHealthConnect()
                val perms = JSArray(); p.grantedPermissions.forEach { perms.put(it) }
                val samples = JSArray()
                p.sampleSessions.forEach { r ->
                    samples.put(JSObject().apply {
                        put("recordId", r.recordId); put("sourceApp", r.sourceApp); put("title", r.title); put("exerciseType", r.exerciseType)
                        put("startMs", r.startMs); put("endMs", r.endMs); put("durationMin", r.durationMin)
                    })
                }
                resolve(call, JSObject().apply {
                    put("available", p.available); put("sdkStatus", p.sdkStatus); put("packageName", p.packageName)
                    put("grantedPermissions", perms)
                    put("readExercise", p.readExerciseGranted); put("writeExercise", p.writeExerciseGranted)
                    put("readHeartRate", p.readHeartRateGranted); put("readCalories", p.readCaloriesGranted)
                    put("instant24Count", p.instant24Count); put("instant7dCount", p.instant7dCount); put("local24Count", p.local24Count); put("samsung7dCount", p.samsung7dCount)
                    put("heartRate24Count", p.heartRate24Count); put("calories24Count", p.calories24Count)
                    put("instant24Error", p.instant24Error); put("instant7dError", p.instant7dError); put("local24Error", p.local24Error); put("samsung7dError", p.samsung7dError)
                    put("heartRateError", p.heartRateError); put("caloriesError", p.caloriesError); put("samples", samples)
                })
            } catch (e: Exception) { reject(call, "Falha no diagnóstico nativo do Health Connect", e) }
        }
    }

    @PluginMethod
    fun saveHealthLink(call: PluginCall) {
        val sid = call.getString("sessionId") ?: return call.reject("sessionId obrigatório")
        scope.launch {
            try {
                db.workoutDao().updateHealthLink(
                    sessionId = sid,
                    state = call.getString("state", "linked") ?: "linked",
                    recordId = call.getString("recordId"),
                    sourceApp = call.getString("sourceApp"),
                    confidence = call.getDouble("confidence", 1.0) ?: 1.0,
                    avgHr = call.getDouble("avgHr"),
                    maxHr = call.getDouble("maxHr"),
                    minHr = call.getDouble("minHr"),
                    kcal = call.getDouble("kcal"),
                    healthStartMs = longArgOrNull(call, "startMs"),
                    healthEndMs = longArgOrNull(call, "endMs"),
                    healthTitle = call.getString("title"),
                    healthExerciseType = call.getInt("exerciseType"),
                    heartRateSampleCount = call.getInt("heartRateSampleCount", 0) ?: 0,
                    heartRateSamplesJson = call.getArray("heartRateSamples")?.toString(),
                )
                resolve(call, JSObject().apply { put("saved", true) })
            } catch (e: Exception) { reject(call, "Falha ao salvar vínculo Health Connect", e) }
        }
    }

    @PluginMethod
    fun getHealthSyncResults(call: PluginCall) {
        scope.launch {
            try {
                val rows = db.workoutDao().healthSyncedSessions(50)
                val arr = JSArray()
                rows.forEach { r ->
                    arr.put(JSObject().apply {
                        put("sessionId", r.sessionId); put("state", r.healthState); put("recordId", r.healthRecordId)
                        put("sourceApp", r.healthSourceApp); put("confidence", r.healthConfidence)
                        put("avgHr", r.healthAvgHr); put("maxHr", r.healthMaxHr); put("minHr", r.healthMinHr); put("kcal", r.healthKcal)
                        put("startMs", r.healthStartMs); put("endMs", r.healthEndMs); put("title", r.healthTitle); put("exerciseType", r.healthExerciseType)
                        put("heartRateSampleCount", r.healthSampleCount); put("heartRateSamplesJson", r.healthSamplesJson)
                        val ds = r.healthStartMs ?: r.startMs; val de = r.healthEndMs ?: r.endMs
                        put("durationMin", ((de-ds)/60_000L).coerceAtLeast(1L)); put("linkedAt", r.healthSyncedAt)
                    })
                }
                resolve(call, JSObject().apply { put("results", arr) })
            } catch (e: Exception) { reject(call, "Falha ao carregar resultados do Health Connect", e) }
        }
    }

    @PluginMethod
    fun writeHealthSession(call: PluginCall) {
        val sid = call.getString("sessionId") ?: return call.reject("sessionId obrigatório")
        val name = call.getString("name", "TreinoApp") ?: "TreinoApp"
        val start = longArg(call, "startMs")
        val end = longArg(call, "endMs")
        scope.launch {
            try {
                val result = health.writeStrengthSession(sid, name, start, end)
                if (result.written && result.recordId != null) {
                    db.workoutDao().updateHealthLink(
                        sessionId = sid, state = "written", recordId = result.recordId, sourceApp = context.packageName,
                        confidence = 1.0, avgHr = null, maxHr = null, minHr = null, kcal = null,
                        healthStartMs = start, healthEndMs = end, healthTitle = name, healthExerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                        heartRateSampleCount = 0, heartRateSamplesJson = null,
                    )
                }
                resolve(call, JSObject().apply {
                    put("written", result.written); put("recordId", result.recordId); put("reason", result.reason); put("errorClass", result.errorClass)
                })
            } catch (e: Exception) { reject(call, "Falha ao gravar sessão no Health Connect", e) }
        }
    }

    @PluginMethod
    fun syncWeight(call: PluginCall) {
        val arr = call.getArray("localWeights") ?: JSArray()
        val local = mutableListOf<Pair<String, Double>>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val date = o.optString("date")
            val kg = o.optDouble("kg", 0.0)
            if (date.isNotBlank() && kg > 0) local += date to kg
        }
        scope.launch {
            try {
                val r = health.syncWeight(local)
                resolve(call, JSObject().apply { put("latestKg", r.latestKg); put("latestDate", r.latestDate); put("written", r.written) })
            } catch (e: Exception) { reject(call, "Falha ao sincronizar peso", e) }
        }
    }

    @PluginMethod
    fun saveWorkoutMirror(call: PluginCall) {
        val sid = call.getString("sessionId") ?: return call.reject("sessionId obrigatório")
        val sets = call.getArray("sets") ?: JSArray()
        scope.launch {
            try {
                val session = WorkoutSessionEntity(
                    sessionId = sid,
                    templateId = call.getString("templateId"),
                    name = call.getString("name", "Treino") ?: "Treino",
                    startMs = longArg(call, "startMs"),
                    endMs = longArg(call, "endMs"),
                    durationSec = (call.getInt("durationSec", 0) ?: 0).toLong(),
                    completedSets = call.getInt("completedSets", sets.length()) ?: sets.length(),
                    totalSets = call.getInt("totalSets", sets.length()) ?: sets.length(),
                    sessionRpe = call.getDouble("sessionRpe"),
                    contextTagsJson = call.getArray("contextTags")?.toString(),
                    sessionNote = call.getString("sessionNote")?.trim()?.take(500),
                )
                val nativeSets = mutableListOf<WorkoutSetEntity>()
                for (i in 0 until sets.length()) {
                    val o = sets.optJSONObject(i) ?: continue
                    nativeSets += WorkoutSetEntity(
                        id = o.optString("id").ifBlank { UUID.randomUUID().toString() },
                        sessionId = sid,
                        exercise = o.optString("exercise"),
                        setNumber = o.optInt("setNumber"),
                        weight = o.optDouble("weight"),
                        reps = o.optInt("reps"),
                        setType = o.optString("setType", "workset"),
                        completedAt = o.optLong("completedAt", session.endMs),
                        rir = if (o.has("rir") && !o.isNull("rir")) o.optInt("rir") else null,
                        rpe = if (o.has("rpe") && !o.isNull("rpe")) o.optDouble("rpe") else null,
                        startedAt = if (o.has("startedAt") && !o.isNull("startedAt")) o.optLong("startedAt") else null,
                        restBeforeSec = if (o.has("restBeforeSec") && !o.isNull("restBeforeSec")) o.optInt("restBeforeSec") else null,
                        timingQuality = o.optString("timingQuality", "legacy").ifBlank { "legacy" },
                    )
                }
                db.workoutDao().upsertSession(session)
                db.workoutDao().upsertSets(nativeSets)
                HealthSyncScheduler.scheduleSoon(context)
                resolve(call, JSObject().apply { put("saved", true); put("sets", nativeSets.size) })
            } catch (e: Exception) { reject(call, "Falha ao salvar espelho nativo", e) }
        }
    }

    @PluginMethod
    fun syncNativeDatabase(call: PluginCall) {
        val arr = call.getArray("records") ?: JSArray()
        val replace = call.getBoolean("replace", false) ?: false
        scope.launch {
            try {
                val sets = mutableListOf<WorkoutSetEntity>()
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val sid = o.optString("sessionId").ifBlank { "legacy_${o.optString("data")}" }
                    sets += WorkoutSetEntity(
                        id = o.optString("id").ifBlank { UUID.randomUUID().toString() },
                        sessionId = sid,
                        exercise = o.optString("exercicio"),
                        setNumber = o.optInt("numSerie"),
                        weight = o.optDouble("carga"),
                        reps = o.optInt("reps"),
                        setType = o.optString("setType", "workset"),
                        completedAt = o.optLong("completedAt", o.optLong("finishedAt", 0L)),
                        rir = if (o.has("rir") && !o.isNull("rir")) o.optInt("rir") else null,
                        rpe = if (o.has("rpe") && !o.isNull("rpe")) o.optDouble("rpe") else null,
                        startedAt = if (o.has("setStartedAt") && !o.isNull("setStartedAt")) o.optLong("setStartedAt") else null,
                        restBeforeSec = if (o.has("restBeforeSec") && !o.isNull("restBeforeSec")) o.optInt("restBeforeSec") else null,
                        timingQuality = o.optString("timingQuality", "legacy").ifBlank { "legacy" },
                    )
                }
                if (replace) db.workoutDao().replaceAllLegacy(sets) else db.workoutDao().upsertLegacySets(sets)
                resolve(call, JSObject().apply { put("synced", sets.size); put("replace", replace) })
            } catch (e: Exception) { reject(call, "Falha ao sincronizar banco nativo", e) }
        }
    }


    private fun longArgOrNull(call: PluginCall, key: String): Long? {
        val raw = call.data.opt(key)
        return when (raw) {
            is Number -> raw.toLong()
            is String -> raw.toLongOrNull() ?: raw.toDoubleOrNull()?.toLong()
            else -> null
        }
    }

    private fun longArg(call: PluginCall, key: String, default: Long = 0L): Long =
        longArgOrNull(call, key) ?: default

    private fun sanitizeFileName(name: String): String {
        val cleaned = name.map { ch ->
            if (ch.code < 32 || ch == '\\' || ch == '/' || ch == ':' || ch == '*' || ch == '?' || ch == '"' || ch == '<' || ch == '>' || ch == '|') '_' else ch
        }.joinToString("").trim().take(120)
        return cleaned.ifBlank { "TreinoApp_arquivo" }
    }

    private fun decodeDataUrl(dataUrl: String): ByteArray {
        val base64 = dataUrl.substringAfter(',', dataUrl)
        return Base64.decode(base64, Base64.DEFAULT)
    }

    private fun ensureLegacyStoragePermission() {
        if (Build.VERSION.SDK_INT <= 28 && ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            throw SecurityException("Permissão de armazenamento não concedida")
        }
    }

    private fun saveToDownloads(fileName: String, mimeType: String, bytes: ByteArray): Pair<Uri, String> {
        if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/TreinoApp")
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Android não criou o arquivo em Downloads")
            try {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    ?: throw IllegalStateException("Android não abriu o arquivo para gravação")
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                context.contentResolver.update(uri, values, null, null)
                return uri to "Downloads/TreinoApp/$fileName"
            } catch (e: Exception) {
                context.contentResolver.delete(uri, null, null)
                throw e
            }
        }
        ensureLegacyStoragePermission()
        val base = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "TreinoApp").apply { mkdirs() }
        val file = File(base, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        return Uri.fromFile(file) to file.absolutePath
    }

    private fun saveToPictures(fileName: String, mimeType: String, bytes: ByteArray): Pair<Uri, String> {
        if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/TreinoApp")
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Android não criou a imagem na galeria")
            try {
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    ?: throw IllegalStateException("Android não abriu a imagem para gravação")
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                context.contentResolver.update(uri, values, null, null)
                return uri to "Galeria/TreinoApp/$fileName"
            } catch (e: Exception) {
                context.contentResolver.delete(uri, null, null)
                throw e
            }
        }
        ensureLegacyStoragePermission()
        val base = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "TreinoApp").apply { mkdirs() }
        val file = File(base, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        return Uri.fromFile(file) to file.absolutePath
    }

    private fun shareBytes(fileName: String, mimeType: String, bytes: ByteArray, title: String) {
        val dir = File(context.cacheDir, "shared").apply { mkdirs() }
        dir.listFiles()?.filter { it.isFile && System.currentTimeMillis() - it.lastModified() > 24 * 60 * 60 * 1000L }?.forEach { it.delete() }
        val file = File(dir, fileName)
        FileOutputStream(file).use { it.write(bytes) }
        val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newRawUri(fileName, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(send, title)
        activity.runOnUiThread { activity.startActivity(chooser) }
    }

    private fun matchToJs(m: HealthConnectRepository.Match) = JSObject().apply {
        put("found", m.found); put("confidence", m.confidence); put("recordId", m.recordId)
        put("sourceApp", m.sourceApp); put("title", m.title); put("exerciseType", m.exerciseType)
        put("startMs", m.startMs); put("endMs", m.endMs); put("durationMin", m.durationMin)
        put("avgHr", m.avgHr); put("maxHr", m.maxHr); put("minHr", m.minHr); put("kcal", m.kcal)
        put("heartRateSampleCount", m.heartRateSampleCount)
        val hr = JSArray()
        m.heartRateSamples.forEach { point ->
            hr.put(JSObject().apply { put("timeMs", point.timeMs); put("bpm", point.bpm) })
        }
        put("heartRateSamples", hr)
        put("candidateCount", m.candidateCount); put("overlapRatio", m.overlapRatio)
        put("startDiffMin", m.startDiffMin); put("endDiffMin", m.endDiffMin)
    }

    private fun serviceCall(call: PluginCall, action: String) {
        try { WorkoutForegroundService.send(context, action); call.resolve() }
        catch (e: Exception) { call.reject("Falha no serviço de treino", e) }
    }

    private fun resolve(call: PluginCall, result: JSObject) = activity.runOnUiThread { call.resolve(result) }
    private fun reject(call: PluginCall, message: String, error: Exception) = activity.runOnUiThread { call.reject(message, error) }
}
