package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import kotlinx.coroutines.CancellationException

data class ActivityDay(
    val date: String,
    val steps: Long? = null,
    val activeKcal: Double? = null,
    val totalKcal: Double? = null,
)

data class ActivitySnapshot(
    val available: Boolean,
    val generatedAt: Long = System.currentTimeMillis(),
    val zoneId: String = ZoneId.systemDefault().id,
    val rangeStart: String = "",
    val rangeEnd: String = "",
    val readSteps: Boolean = false,
    val readExercise: Boolean = false,
    val readActiveCalories: Boolean = false,
    val readCalories: Boolean = false,
    val historyGranted: Boolean = false,
    val sessionsComplete: Boolean = false,
    val duplicatesRemoved: Int = 0,
    val daily: List<ActivityDay> = emptyList(),
    val sessions: List<CardioSession> = emptyList(),
    val errors: List<String> = emptyList(),
)

class ActivityHealthRepository(private val context: Context) {
    private fun cardioKind(type: Int): String? = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walking"
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "running"
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "treadmill"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "cycling"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "stationary"
        else -> null
    }

    private fun sourceName(pkg: String): String = when (pkg) {
        "com.sec.android.app.shealth" -> "Samsung Health"
        "com.google.android.apps.fitness" -> "Google Fit"
        else -> pkg
    }

    suspend fun snapshot(days: Int): ActivitySnapshot {
        val helper = HealthConnectRepository(context)
        if (!helper.isAvailable()) return ActivitySnapshot(available = false)
        val hc = HealthConnectClient.getOrCreate(context)
        val granted = helper.grantedPermissions()
        val history = HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY in granted
        // Uma janela conservadora evita tentar acessar o histórico bloqueado de
        // outras origens. O cache no app preserva os dias já lidos anteriormente.
        val safeDays = days.coerceIn(7, if (history) 90 else 28)
        val zone = ZoneId.systemDefault()
        val now = Instant.now()
        val today = now.atZone(zone).toLocalDate()
        val first = today.minusDays((safeDays - 1).toLong())
        val localStart = first.atStartOfDay()
        val localEnd = LocalDateTime.ofInstant(now, zone)
        val start = localStart.atZone(zone).toInstant()
        val readSteps = HealthPermission.getReadPermission(StepsRecord::class) in granted
        val readExercise = HealthPermission.getReadPermission(ExerciseSessionRecord::class) in granted
        val readActive = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class) in granted
        val readTotal = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class) in granted
        val errors = mutableListOf<String>()
        val steps = mutableMapOf<String, Long?>()
        val active = mutableMapOf<String, Double?>()
        val total = mutableMapOf<String, Double?>()

        // Aggregate (sem filtro de origem) respeita a prioridade do Health Connect
        // e evita somar duas vezes passos do telefone e do relógio.
        if (readSteps) try {
            hc.aggregateGroupByPeriod(AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(localStart, localEnd),
                timeRangeSlicer = Period.ofDays(1),
            )).forEach { steps[it.startTime.toLocalDate().toString()] = it.result[StepsRecord.COUNT_TOTAL] }
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "steps"
        }
        if (readActive || readTotal) try {
            val metrics = buildSet {
                if (readActive) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                if (readTotal) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
            }
            hc.aggregateGroupByPeriod(AggregateGroupByPeriodRequest(
                metrics = metrics,
                timeRangeFilter = TimeRangeFilter.between(localStart, localEnd),
                timeRangeSlicer = Period.ofDays(1),
            )).forEach { bucket ->
                val date = bucket.startTime.toLocalDate().toString()
                if (readActive) active[date] = bucket.result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
                if (readTotal) total[date] = bucket.result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
            }
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "calories"
        }

        val records = mutableListOf<ExerciseSessionRecord>()
        var sessionsComplete = false
        if (readExercise) try {
            var token: String? = null
            do {
                val page = hc.readRecords(ReadRecordsRequest<ExerciseSessionRecord>(
                    timeRangeFilter = TimeRangeFilter.between(start, now),
                    ascendingOrder = true, pageSize = 1000, pageToken = token,
                ))
                records += page.records
                token = page.pageToken?.takeIf { it.isNotBlank() }
            } while (token != null)
            sessionsComplete = true
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "sessions"
        }
        val own = setOf(context.packageName, "com.treinoapp.app", "com.treinoapp.beta")
        val cardio = records.mapNotNull { record ->
            val kind = cardioKind(record.exerciseType) ?: return@mapNotNull null
            val pkg = record.metadata.dataOrigin.packageName
            if (pkg in own || record.endTime > now || record.startTime < start) return@mapNotNull null
            CardioSession(
                id = record.metadata.id, sourcePackage = pkg, source = sourceName(pkg), kind = kind,
                title = record.title?.toString().orEmpty(),
                date = record.startTime.atZone(zone).toLocalDate().toString(),
                startMs = record.startTime.toEpochMilli(), endMs = record.endTime.toEpochMilli(),
            )
        }
        val unique = CardioMath.deduplicate(cardio)
        val sessions = unique.map { row ->
            var kcal: Double? = null
            var calorieKind: String? = null
            if (readActive || readTotal) try {
                val metrics = buildSet {
                    if (readActive) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                    if (readTotal) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
                }
                val result = hc.aggregate(AggregateRequest(
                    metrics = metrics,
                    timeRangeFilter = TimeRangeFilter.between(Instant.ofEpochMilli(row.startMs), Instant.ofEpochMilli(row.endMs)),
                    dataOriginFilter = setOf(DataOrigin(row.sourcePackage)),
                ))
                kcal = if (readActive) result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories else null
                if (kcal != null) calorieKind = "active"
                else if (readTotal) {
                    kcal = result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
                    if (kcal != null) calorieKind = "total"
                }
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                if ("sessionCalories" !in errors) errors += "sessionCalories"
            }
            row.copy(kcal = kcal?.takeIf { it.isFinite() && it >= 0 }, calorieKind = calorieKind)
        }
        val daily = (0 until safeDays).map { offset ->
            val date = first.plusDays(offset.toLong()).toString()
            ActivityDay(date, steps[date], active[date], total[date])
        }
        return ActivitySnapshot(
            available = true, zoneId = zone.id, rangeStart = first.toString(), rangeEnd = today.toString(),
            readSteps = readSteps, readExercise = readExercise, readActiveCalories = readActive,
            readCalories = readTotal, historyGranted = history, sessionsComplete = sessionsComplete,
            duplicatesRemoved = cardio.size - unique.size, daily = daily, sessions = sessions, errors = errors,
        )
    }
}
