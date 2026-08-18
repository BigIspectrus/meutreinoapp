package com.treinoapp.app.nativebridge

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
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
                putExtra(WorkoutForegroundService.EXTRA_STARTED, (call.getDouble("startedAt", System.currentTimeMillis().toDouble()) ?: System.currentTimeMillis().toDouble()).toLong())
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
                })
            } catch (e: Exception) { reject(call, "Falha ao consultar Health Connect", e) }
        }
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        (activity as? MainActivity)?.requestHealthPermissions(call) ?: call.reject("Activity indisponível")
    }

    @PluginMethod
    fun findHealthMatch(call: PluginCall) {
        val start = (call.getDouble("startMs", 0.0) ?: 0.0).toLong()
        val end = (call.getDouble("endMs", 0.0) ?: 0.0).toLong()
        scope.launch {
            try { resolve(call, matchToJs(health.findBestExerciseMatch(start, end))) }
            catch (e: Exception) { reject(call, "Falha ao buscar treino no Health Connect", e) }
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
                        put("avgHr", r.healthAvgHr); put("maxHr", r.healthMaxHr); put("kcal", r.healthKcal)
                        put("durationMin", ((r.endMs-r.startMs)/60_000L).coerceAtLeast(1L)); put("linkedAt", r.healthSyncedAt)
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
        val start = (call.getDouble("startMs", 0.0) ?: 0.0).toLong()
        val end = (call.getDouble("endMs", 0.0) ?: 0.0).toLong()
        scope.launch {
            try {
                val id = health.writeStrengthSession(sid, name, start, end)
                if (id != null) db.workoutDao().updateHealthLink(sid, "written", id, context.packageName, 1.0, null, null, null)
                resolve(call, JSObject().apply { put("written", id != null); put("recordId", id) })
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
                    startMs = (call.getDouble("startMs", 0.0) ?: 0.0).toLong(),
                    endMs = (call.getDouble("endMs", 0.0) ?: 0.0).toLong(),
                    durationSec = (call.getInt("durationSec", 0) ?: 0).toLong(),
                    completedSets = call.getInt("completedSets", sets.length()) ?: sets.length(),
                    totalSets = call.getInt("totalSets", sets.length()) ?: sets.length(),
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
                    )
                }
                if (replace) db.workoutDao().replaceAllLegacy(sets) else db.workoutDao().upsertLegacySets(sets)
                resolve(call, JSObject().apply { put("synced", sets.size); put("replace", replace) })
            } catch (e: Exception) { reject(call, "Falha ao sincronizar banco nativo", e) }
        }
    }

    private fun matchToJs(m: HealthConnectRepository.Match) = JSObject().apply {
        put("found", m.found); put("confidence", m.confidence); put("recordId", m.recordId)
        put("sourceApp", m.sourceApp); put("startMs", m.startMs); put("endMs", m.endMs)
        put("durationMin", m.durationMin); put("avgHr", m.avgHr); put("maxHr", m.maxHr); put("kcal", m.kcal)
    }

    private fun serviceCall(call: PluginCall, action: String) {
        try { WorkoutForegroundService.send(context, action); call.resolve() }
        catch (e: Exception) { call.reject("Falha no serviço de treino", e) }
    }

    private fun resolve(call: PluginCall, result: JSObject) = activity.runOnUiThread { call.resolve(result) }
    private fun reject(call: PluginCall, message: String, error: Exception) = activity.runOnUiThread { call.reject(message, error) }
}
