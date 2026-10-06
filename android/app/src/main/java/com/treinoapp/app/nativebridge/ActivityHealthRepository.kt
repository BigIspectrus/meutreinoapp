package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.DistanceRecord
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

/** Horário da consulta pelo app, não da medição nem da sincronização do relógio. */
data class ActivityReadStatus(
    val checkedAt: Long = System.currentTimeMillis(),
    val readAt: Long? = null,
    val state: String,
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
    val readDistance: Boolean = false,
    val historyGranted: Boolean = false,
    val sessionsComplete: Boolean = false,
    val duplicatesRemoved: Int = 0,
    val daily: List<ActivityDay> = emptyList(),
    val sessions: List<CardioSession> = emptyList(),
    val errors: List<String> = emptyList(),
    val readStatus: Map<String, ActivityReadStatus> = emptyMap(),
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
        if (!helper.isAvailable()) return ActivitySnapshot(available = false, readStatus =
            listOf("steps", "activeKcal", "totalKcal", "sessions", "sessionKcal", "sessionDistance").associateWith {
                ActivityReadStatus(state = "unavailable")
            })
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
        val readDistance = HealthPermission.getReadPermission(DistanceRecord::class) in granted
        val errors = mutableListOf<String>()
        val steps = mutableMapOf<String, Long?>()
        val active = mutableMapOf<String, Double?>()
        val total = mutableMapOf<String, Double?>()
        val reads = mutableMapOf<String, ActivityReadStatus>()
        fun mark(key: String, state: String) {
            val time = System.currentTimeMillis()
            reads[key] = ActivityReadStatus(time, if (state == "ok") time else null, state)
        }

        // Aggregate (sem filtro de origem) respeita a prioridade do Health Connect
        // e evita somar duas vezes passos do telefone e do relógio.
        if (readSteps) try {
            hc.aggregateGroupByPeriod(AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(localStart, localEnd),
                timeRangeSlicer = Period.ofDays(1),
            )).forEach { steps[it.startTime.toLocalDate().toString()] = it.result[StepsRecord.COUNT_TOTAL] }
            mark("steps", "ok")
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "steps"
            mark("steps", "error")
        } else mark("steps", "denied")
        if (!readActive) mark("activeKcal", "denied")
        if (!readTotal) mark("totalKcal", "denied")
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
            if (readActive) mark("activeKcal", "ok")
            if (readTotal) mark("totalKcal", "ok")
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "calories"
            if (readActive) mark("activeKcal", "error")
            if (readTotal) mark("totalKcal", "error")
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
            mark("sessions", "ok")
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "sessions"
            mark("sessions", if (records.isNotEmpty()) "partial" else "error")
        } else mark("sessions", "denied")
        val sessionsObservedAt = System.currentTimeMillis()
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
                sessionReadAt = sessionsObservedAt,
            )
        }
        val unique = CardioMath.deduplicate(cardio)
        var energySucceeded = 0
        var energyFailed = 0
        val energySessions = unique.map { row ->
            var kcal: Double? = null
            var calorieKind: String? = null
            var kcalReadAt: Long? = null
            var kcalState = if (readActive || readTotal) "error" else "denied"
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
                kcalReadAt = System.currentTimeMillis()
                kcalState = "ok"
                energySucceeded++
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                if ("sessionCalories" !in errors) errors += "sessionCalories"
                energyFailed++
            }
            row.copy(kcal = kcal?.takeIf { it.isFinite() && it >= 0 }, calorieKind = calorieKind,
                kcalReadAt = kcalReadAt, kcalCheckedAt = System.currentTimeMillis(), kcalReadState = kcalState)
        }
        // Uma consulta paginada por janela/origens, DEPOIS das calorias. Não
        // multiplicar chamadas de distância por sessão nem consumir a cota antes
        // das leituras que já funcionavam. Limite defensivo mantém o cache em falha.
        val distanceParts = mutableListOf<CardioMath.DistanceSegment>()
        var distanceState = if (readDistance && readExercise) "error" else "denied"
        var distanceReadAt: Long? = null
        if (readDistance && sessionsComplete && unique.isNotEmpty()) try {
            var token: String? = null
            do {
                val page = hc.readRecords(ReadRecordsRequest<DistanceRecord>(
                    timeRangeFilter = TimeRangeFilter.between(start, now),
                    dataOriginFilter = unique.map { DataOrigin(it.sourcePackage) }.toSet(),
                    ascendingOrder = true, pageSize = 1000, pageToken = token,
                ))
                distanceParts += page.records.map { CardioMath.DistanceSegment(it.metadata.id, it.metadata.dataOrigin.packageName,
                    it.startTime.toEpochMilli(), it.endTime.toEpochMilli(), it.distance.inMeters) }
                if (distanceParts.size > 50_000) throw IllegalStateException("distance record limit")
                token = page.pageToken?.takeIf { it.isNotBlank() }
            } while (token != null)
            distanceReadAt = System.currentTimeMillis(); distanceState = "ok"
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            errors += "sessionDistance"
        }
        val sessions = energySessions.map { row ->
            val ambiguous = records.any { other ->
                other.metadata.id != row.id && other.metadata.dataOrigin.packageName == row.sourcePackage &&
                    other.startTime.toEpochMilli() < row.endMs && other.endTime.toEpochMilli() > row.startMs
            }
            val distance = if (distanceState == "ok") CardioMath.distance(row, distanceParts, ambiguous) else CardioMath.DistanceResult()
            row.copy(distanceMeters = distance.meters, distanceCoverage = distance.coverage, distanceComplete = distance.complete,
                distanceReason = distance.reason, distanceReadAt = distanceReadAt,
                distanceCheckedAt = System.currentTimeMillis(), distanceReadState = distanceState)
        }
        mark("sessionKcal", when {
            !readExercise || (!readActive && !readTotal) -> "denied"
            energyFailed > 0 -> if (energySucceeded > 0) "partial" else "error"
            !sessionsComplete -> reads["sessions"]?.state ?: "error"
            unique.isEmpty() -> "no_data"
            else -> "ok"
        })
        mark("sessionDistance", when {
            !readDistance || !readExercise -> "denied"
            !sessionsComplete -> reads["sessions"]?.state ?: "error"
            unique.isEmpty() -> "no_data"
            else -> distanceState
        })
        val daily = (0 until safeDays).map { offset ->
            val date = first.plusDays(offset.toLong()).toString()
            ActivityDay(date, steps[date], active[date], total[date])
        }
        return ActivitySnapshot(
            available = true, zoneId = zone.id, rangeStart = first.toString(), rangeEnd = today.toString(),
            readSteps = readSteps, readExercise = readExercise, readActiveCalories = readActive,
            readCalories = readTotal, readDistance = readDistance, historyGranted = history, sessionsComplete = sessionsComplete,
            duplicatesRemoved = cardio.size - unique.size, daily = daily, sessions = sessions, errors = errors,
            readStatus = reads,
        )
    }
}
