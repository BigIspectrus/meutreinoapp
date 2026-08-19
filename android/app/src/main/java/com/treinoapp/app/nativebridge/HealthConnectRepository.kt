package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Mass
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class HealthConnectRepository(private val context: Context) {
    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )

    private val optionalPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(BodyFatRecord::class),
        HealthPermission.getReadPermission(LeanBodyMassRecord::class),
    )

    fun isAvailable(): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    fun backgroundReadAvailable(): Boolean = isAvailable() && runCatching {
        client().features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    }.getOrDefault(false)

    fun requestablePermissions(): Set<String> = if (backgroundReadAvailable()) {
        (requiredPermissions + optionalPermissions) + PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
    } else requiredPermissions + optionalPermissions

    suspend fun grantedPermissions(): Set<String> =
        if (isAvailable()) client().permissionController.getGrantedPermissions() else emptySet()

    suspend fun hasRequiredPermissions(): Boolean = grantedPermissions().containsAll(requiredPermissions)

    data class HeartRatePoint(val timeMs: Long, val bpm: Long)

    data class Match(
        val found: Boolean,
        val confidence: Double = 0.0,
        val recordId: String? = null,
        val sourceApp: String? = null,
        val title: String? = null,
        val exerciseType: Int? = null,
        val startMs: Long? = null,
        val endMs: Long? = null,
        val durationMin: Long? = null,
        val avgHr: Double? = null,
        val maxHr: Double? = null,
        val minHr: Double? = null,
        val kcal: Double? = null,
        val heartRateSampleCount: Int = 0,
        val heartRateSamples: List<HeartRatePoint> = emptyList(),
        val candidateCount: Int = 0,
        val overlapRatio: Double = 0.0,
        val startDiffMin: Double? = null,
        val endDiffMin: Double? = null,
    )

    data class ExerciseCandidate(
        val recordId: String,
        val sourceApp: String,
        val title: String?,
        val exerciseType: Int,
        val startMs: Long,
        val endMs: Long,
        val durationMin: Long,
        val confidence: Double?,
        val overlapRatio: Double?,
        val startDiffMin: Double?,
        val endDiffMin: Double?,
        val avgHr: Double?,
        val maxHr: Double?,
        val minHr: Double?,
        val kcal: Double?,
    )

    private data class DetailedMetrics(
        val avgHr: Double?,
        val maxHr: Double?,
        val minHr: Double?,
        val kcal: Double?,
        val heartRateSampleCount: Int,
        val heartRateSamples: List<HeartRatePoint>,
    )

    data class HealthProbe(
        val available: Boolean,
        val sdkStatus: Int,
        val packageName: String,
        val grantedPermissions: List<String>,
        val readExerciseGranted: Boolean,
        val writeExerciseGranted: Boolean,
        val readHeartRateGranted: Boolean,
        val readCaloriesGranted: Boolean,
        val instant24Count: Int,
        val instant7dCount: Int,
        val local24Count: Int,
        val samsung7dCount: Int,
        val heartRate24Count: Int,
        val calories24Count: Int,
        val instant24Error: String?,
        val instant7dError: String?,
        val local24Error: String?,
        val samsung7dError: String?,
        val heartRateError: String?,
        val caloriesError: String?,
        val sampleSessions: List<ExerciseCandidate>,
    )

    data class RecoverySnapshot(
        val generatedAt: Long = System.currentTimeMillis(),
        val sleepLastMinutes: Long? = null,
        val sleepLastStartMs: Long? = null,
        val sleepLastEndMs: Long? = null,
        val sleep7dAvgMinutes: Double? = null,
        val restingHrLatest: Long? = null,
        val restingHr7dAvg: Double? = null,
        val restingHr28dAvg: Double? = null,
        val hrvLatestMs: Double? = null,
        val hrv7dAvgMs: Double? = null,
        val hrv28dAvgMs: Double? = null,
        val weightKg: Double? = null,
        val bodyFatPct: Double? = null,
        val leanMassKg: Double? = null,
        val sleepSource: String? = null,
        val restingHrSource: String? = null,
        val hrvSource: String? = null,
        val bodySource: String? = null,
        val permissions: List<String> = emptyList(),
    )

    data class WriteResult(
        val written: Boolean,
        val recordId: String? = null,
        val reason: String? = null,
        val errorClass: String? = null,
    )

    private data class CountResult(val count: Int, val error: String? = null)

    private fun sourceLabel(packageName: String): String = when (packageName) {
        "com.sec.android.app.shealth" -> "Samsung Health"
        "com.google.android.apps.fitness" -> "Google Fit"
        context.packageName, "com.treinoapp.app", "com.treinoapp.beta" -> "TreinoApp"
        else -> packageName
    }

    /**
     * Lê sessões de exercício em uma janela larga. A v12.0.1 deliberadamente
     * não aplica filtro por origem no request: primeiro precisamos enxergar o
     * que o Health Connect realmente entrega e só depois classificar a origem.
     */
    private suspend fun readExerciseRecords(start: Instant, end: Instant): List<ExerciseSessionRecord> {
        val hc = client()
        val request = ReadRecordsRequest<ExerciseSessionRecord>(
            timeRangeFilter = TimeRangeFilter.between(start, end),
            ascendingOrder = true,
            pageSize = 1000,
        )
        val all = hc.readRecords(request).records
        if (all.isNotEmpty()) return all

        // Fallback explícito para Samsung Health. Normalmente dataOriginFilter vazio
        // deve retornar todas as origens; esta segunda leitura também serve para
        // contornar/diagnosticar aparelhos em que o provider não entrega a origem
        // Samsung na consulta ampla.
        return hc.readRecords(
            ReadRecordsRequest<ExerciseSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, end),
                dataOriginFilter = setOf(DataOrigin("com.sec.android.app.shealth")),
                ascendingOrder = true,
                pageSize = 1000,
            )
        ).records
    }

    private data class Ranked(
        val record: ExerciseSessionRecord,
        val confidence: Double,
        val overlapRatio: Double,
        val startDiffMin: Double,
        val endDiffMin: Double,
    )

    private fun rankRecord(record: ExerciseSessionRecord, startMs: Long, endMs: Long): Ranked {
        val rs = record.startTime.toEpochMilli()
        val re = record.endTime.toEpochMilli()
        val appDuration = max(1L, endMs - startMs)
        val candidateDuration = max(1L, re - rs)
        val overlap = max(0L, min(endMs, re) - max(startMs, rs))
        val overlapRatio = overlap.toDouble() / max(appDuration, candidateDuration).toDouble()
        val startDiff = abs(rs - startMs).toDouble()
        val endDiff = abs(re - endMs).toDouble()
        val durationDiff = abs(candidateDuration - appDuration).toDouble()

        // Janelas mais tolerantes que na v12.0.0. O Galaxy Watch/Samsung Health
        // pode registrar o início/fim alguns segundos ou minutos diferente do app.
        val startScore = (1.0 - startDiff / (30 * 60_000.0)).coerceIn(0.0, 1.0)
        val endScore = (1.0 - endDiff / (30 * 60_000.0)).coerceIn(0.0, 1.0)
        val durationScore = (1.0 - durationDiff / max(appDuration, candidateDuration).toDouble()).coerceIn(0.0, 1.0)
        var confidence = (overlapRatio * 0.50 + startScore * 0.22 + endScore * 0.18 + durationScore * 0.10)

        // Sessões quase coincidentes devem continuar fortes mesmo quando uma das
        // plataformas fecha a sessão alguns segundos antes/depois.
        if (startDiff <= 3 * 60_000 && endDiff <= 3 * 60_000) confidence = max(confidence, 0.88)
        else if (startDiff <= 5 * 60_000 && endDiff <= 5 * 60_000) confidence = max(confidence, 0.78)

        return Ranked(
            record = record,
            confidence = confidence.coerceIn(0.0, 1.0),
            overlapRatio = overlapRatio,
            startDiffMin = startDiff / 60_000.0,
            endDiffMin = endDiff / 60_000.0,
        )
    }

    suspend fun findBestExerciseMatch(startMs: Long, endMs: Long): Match {
        if (!isAvailable() || !hasRequiredPermissions() || endMs <= startMs) return Match(false)
        val appStart = Instant.ofEpochMilli(startMs)
        val appEnd = Instant.ofEpochMilli(endMs)
        val searchStart = appStart.minusSeconds(90 * 60)
        val searchEnd = appEnd.plusSeconds(90 * 60)
        val records = readExerciseRecords(searchStart, searchEnd)
        val ownPackages = setOf(context.packageName, "com.treinoapp.app", "com.treinoapp.beta")
        val candidates = records.filter { it.metadata.dataOrigin.packageName !in ownPackages }
        if (candidates.isEmpty()) return Match(false, candidateCount = 0)

        val ranked = candidates.map { rankRecord(it, startMs, endMs) }.sortedByDescending { it.confidence }
        val best = ranked.first()
        val r = best.record
        val metrics = readDetailedMetrics(client(), r.startTime, r.endTime, r.metadata.dataOrigin)

        // "found" agora significa que existe uma sessão candidata real. A decisão
        // de associar automaticamente continua sendo feita por limiar de confiança.
        return Match(
            found = true,
            confidence = best.confidence,
            recordId = r.metadata.id,
            sourceApp = sourceLabel(r.metadata.dataOrigin.packageName),
            title = r.title?.toString(),
            exerciseType = r.exerciseType,
            startMs = r.startTime.toEpochMilli(),
            endMs = r.endTime.toEpochMilli(),
            durationMin = max(1L, (r.endTime.toEpochMilli() - r.startTime.toEpochMilli()) / 60_000L),
            avgHr = metrics.avgHr,
            maxHr = metrics.maxHr,
            minHr = metrics.minHr,
            kcal = metrics.kcal,
            heartRateSampleCount = metrics.heartRateSampleCount,
            heartRateSamples = metrics.heartRateSamples,
            candidateCount = candidates.size,
            overlapRatio = best.overlapRatio,
            startDiffMin = best.startDiffMin,
            endDiffMin = best.endDiffMin,
        )
    }

    suspend fun listRecentExerciseSessions(hours: Int, targetStartMs: Long? = null, targetEndMs: Long? = null): List<ExerciseCandidate> {
        if (!isAvailable() || !hasRequiredPermissions()) return emptyList()
        val now = Instant.now()
        val start = now.minusSeconds(hours.coerceIn(1, 168).toLong() * 3600L)
        val rows = readExerciseRecords(start, now.plusSeconds(10 * 60L)).sortedByDescending { it.startTime }
        val out = mutableListOf<ExerciseCandidate>()
        for (r in rows.take(30)) {
            val ranked = if (targetStartMs != null && targetEndMs != null && targetEndMs > targetStartMs) {
                rankRecord(r, targetStartMs, targetEndMs)
            } else null
            val metrics = readDetailedMetrics(client(), r.startTime, r.endTime, r.metadata.dataOrigin, includeSamples = false)
            out += ExerciseCandidate(
                recordId = r.metadata.id,
                sourceApp = sourceLabel(r.metadata.dataOrigin.packageName),
                title = r.title?.toString(),
                exerciseType = r.exerciseType,
                startMs = r.startTime.toEpochMilli(),
                endMs = r.endTime.toEpochMilli(),
                durationMin = max(1L, (r.endTime.toEpochMilli() - r.startTime.toEpochMilli()) / 60_000L),
                confidence = ranked?.confidence,
                overlapRatio = ranked?.overlapRatio,
                startDiffMin = ranked?.startDiffMin,
                endDiffMin = ranked?.endDiffMin,
                avgHr = metrics.avgHr,
                maxHr = metrics.maxHr,
                minHr = metrics.minHr,
                kcal = metrics.kcal,
            )
        }
        return out
    }

    suspend fun getExerciseDetail(recordId: String, startMs: Long, endMs: Long): Match? {
        if (!isAvailable() || !hasRequiredPermissions() || startMs <= 0L || endMs <= startMs) return null
        val records = readExerciseRecords(
            Instant.ofEpochMilli(startMs).minusSeconds(5 * 60L),
            Instant.ofEpochMilli(endMs).plusSeconds(5 * 60L),
        )
        val record = records.firstOrNull { it.metadata.id == recordId }
            ?: records.minByOrNull { abs(it.startTime.toEpochMilli() - startMs) + abs(it.endTime.toEpochMilli() - endMs) }
            ?: return null
        val metrics = readDetailedMetrics(client(), record.startTime, record.endTime, record.metadata.dataOrigin)
        return Match(
            found = true,
            confidence = 1.0,
            recordId = record.metadata.id,
            sourceApp = sourceLabel(record.metadata.dataOrigin.packageName),
            title = record.title?.toString(),
            exerciseType = record.exerciseType,
            startMs = record.startTime.toEpochMilli(),
            endMs = record.endTime.toEpochMilli(),
            durationMin = max(1L, (record.endTime.toEpochMilli() - record.startTime.toEpochMilli()) / 60_000L),
            avgHr = metrics.avgHr,
            maxHr = metrics.maxHr,
            minHr = metrics.minHr,
            kcal = metrics.kcal,
            heartRateSampleCount = metrics.heartRateSampleCount,
            heartRateSamples = metrics.heartRateSamples,
        )
    }

    private fun Throwable.debugMessage(): String =
        "${this::class.java.simpleName}: ${message ?: "sem mensagem"}"

    suspend fun probeHealthConnect(): HealthProbe {
        val status = HealthConnectClient.getSdkStatus(context)
        val available = status == HealthConnectClient.SDK_AVAILABLE
        if (!available) {
            return HealthProbe(
                available = false, sdkStatus = status, packageName = context.packageName,
                grantedPermissions = emptyList(), readExerciseGranted = false, writeExerciseGranted = false,
                readHeartRateGranted = false, readCaloriesGranted = false, instant24Count = 0, instant7dCount = 0,
                local24Count = 0, samsung7dCount = 0, heartRate24Count = 0, calories24Count = 0, instant24Error = null,
                instant7dError = null, local24Error = null, samsung7dError = null, heartRateError = null, caloriesError = null, sampleSessions = emptyList(),
            )
        }

        val hc = client()
        val granted = grantedPermissions()
        val readExercise = HealthPermission.getReadPermission(ExerciseSessionRecord::class) in granted
        val writeExercise = HealthPermission.getWritePermission(ExerciseSessionRecord::class) in granted
        val readHr = HealthPermission.getReadPermission(HeartRateRecord::class) in granted
        val readKcal = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class) in granted
        val now = Instant.now()

        suspend fun exerciseCount(filter: TimeRangeFilter): CountResult = try {
            CountResult(hc.readRecords(ReadRecordsRequest<ExerciseSessionRecord>(timeRangeFilter = filter, pageSize = 1000)).records.size)
        } catch (t: Throwable) { CountResult(0, t.debugMessage()) }

        val i24 = exerciseCount(TimeRangeFilter.between(now.minusSeconds(24L * 3600), now.plusSeconds(15L * 60)))
        val i7d = exerciseCount(TimeRangeFilter.between(now.minusSeconds(7L * 24 * 3600), now.plusSeconds(15L * 60)))
        val localNow = LocalDateTime.now()
        val l24 = exerciseCount(TimeRangeFilter.between(localNow.minusHours(24), localNow.plusMinutes(15)))
        val samsung7d = if (readExercise) try {
            CountResult(hc.readRecords(ReadRecordsRequest<ExerciseSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(7L * 24 * 3600), now.plusSeconds(15L * 60)),
                dataOriginFilter = setOf(DataOrigin("com.sec.android.app.shealth")),
                pageSize = 1000,
            )).records.size)
        } catch (t: Throwable) { CountResult(0, t.debugMessage()) } else CountResult(0, "READ_EXERCISE não concedida")

        val hr = if (readHr) try {
            CountResult(hc.readRecords(ReadRecordsRequest<HeartRateRecord>(timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(24L * 3600), now.plusSeconds(15L * 60)), pageSize = 1000)).records.size)
        } catch (t: Throwable) { CountResult(0, t.debugMessage()) } else CountResult(0, "READ_HEART_RATE não concedida")

        val kcal = if (readKcal) try {
            CountResult(hc.readRecords(ReadRecordsRequest<TotalCaloriesBurnedRecord>(timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(24L * 3600), now.plusSeconds(15L * 60)), pageSize = 1000)).records.size)
        } catch (t: Throwable) { CountResult(0, t.debugMessage()) } else CountResult(0, "READ_TOTAL_CALORIES_BURNED não concedida")

        val samples = if (readExercise) runCatching { listRecentExerciseSessions(168).take(10) }.getOrDefault(emptyList()) else emptyList()

        return HealthProbe(
            available = true, sdkStatus = status, packageName = context.packageName,
            grantedPermissions = granted.sorted(), readExerciseGranted = readExercise, writeExerciseGranted = writeExercise,
            readHeartRateGranted = readHr, readCaloriesGranted = readKcal, instant24Count = i24.count, instant7dCount = i7d.count,
            local24Count = l24.count, samsung7dCount = samsung7d.count, heartRate24Count = hr.count, calories24Count = kcal.count,
            instant24Error = i24.error, instant7dError = i7d.error, local24Error = l24.error, samsung7dError = samsung7d.error, heartRateError = hr.error, caloriesError = kcal.error,
            sampleSessions = samples,
        )
    }

    private suspend fun readDetailedMetrics(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        dataOrigin: DataOrigin,
        includeSamples: Boolean = true,
    ): DetailedMetrics {
        val granted = grantedPermissions()
        val hrAllowed = granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class))
        val kcalAllowed = granted.contains(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class))

        var avgHr: Double? = null
        var maxHr: Double? = null
        var minHr: Double? = null
        var kcal: Double? = null
        try {
            val metrics = buildSet {
                if (hrAllowed) {
                    add(HeartRateRecord.BPM_AVG)
                    add(HeartRateRecord.BPM_MAX)
                    add(HeartRateRecord.BPM_MIN)
                }
                if (kcalAllowed) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
            }
            if (metrics.isNotEmpty()) {
                val result: AggregationResult = hc.aggregate(
                    AggregateRequest(
                        metrics = metrics,
                        timeRangeFilter = TimeRangeFilter.between(start, end),
                        dataOriginFilter = setOf(dataOrigin),
                    )
                )
                if (hrAllowed) {
                    avgHr = result[HeartRateRecord.BPM_AVG]?.toDouble()
                    maxHr = result[HeartRateRecord.BPM_MAX]?.toDouble()
                    minHr = result[HeartRateRecord.BPM_MIN]?.toDouble()
                }
                if (kcalAllowed) kcal = result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
            }
        } catch (_: Throwable) {
            // Mantemos os dados parciais; a leitura das amostras abaixo ainda pode funcionar.
        }

        if (!hrAllowed || !includeSamples) return DetailedMetrics(avgHr, maxHr, minHr, kcal, 0, emptyList())

        return try {
            val records = hc.readRecords(
                ReadRecordsRequest<HeartRateRecord>(
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    dataOriginFilter = setOf(dataOrigin),
                    ascendingOrder = true,
                    pageSize = 1000,
                )
            ).records
            val raw = records.flatMap { record ->
                record.samples.mapNotNull { sample ->
                    val timeMs = sample.time.toEpochMilli()
                    if (timeMs in start.toEpochMilli()..end.toEpochMilli()) HeartRatePoint(timeMs, sample.beatsPerMinute) else null
                }
            }.sortedBy { it.timeMs }

            // O gráfico não precisa transportar milhares de pontos pelo bridge. Mantemos
            // no máximo ~360 pontos distribuídos ao longo da sessão.
            val sampled = if (raw.size <= 360) raw else {
                val stride = kotlin.math.ceil(raw.size / 360.0).toInt().coerceAtLeast(1)
                raw.filterIndexed { index, _ -> index % stride == 0 }.take(360)
            }
            val fallbackAvg = if (raw.isNotEmpty()) raw.map { it.bpm }.average() else null
            val fallbackMax = raw.maxOfOrNull { it.bpm }?.toDouble()
            val fallbackMin = raw.minOfOrNull { it.bpm }?.toDouble()
            DetailedMetrics(
                avgHr = avgHr ?: fallbackAvg,
                maxHr = maxHr ?: fallbackMax,
                minHr = minHr ?: fallbackMin,
                kcal = kcal,
                heartRateSampleCount = raw.size,
                heartRateSamples = sampled,
            )
        } catch (_: Throwable) {
            DetailedMetrics(avgHr, maxHr, minHr, kcal, 0, emptyList())
        }
    }

    suspend fun writeStrengthSession(
        sessionId: String,
        title: String,
        startMs: Long,
        endMs: Long,
    ): WriteResult {
        if (!isAvailable()) return WriteResult(false, reason = "Health Connect indisponível")
        val granted = grantedPermissions()
        if (!granted.contains(HealthPermission.getWritePermission(ExerciseSessionRecord::class))) {
            return WriteResult(false, reason = "WRITE_EXERCISE não concedida")
        }
        if (startMs <= 0L || endMs <= startMs) return WriteResult(false, reason = "Horários da sessão inválidos")
        return try {
            val start = Instant.ofEpochMilli(startMs)
            val end = Instant.ofEpochMilli(endMs)
            val zone = ZoneId.systemDefault()
            val record = ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = zone.rules.getOffset(start),
                endTime = end,
                endZoneOffset = zone.rules.getOffset(end),
                exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                title = title.take(100),
                metadata = Metadata.activelyRecorded(
                    device = Device(type = Device.TYPE_PHONE),
                    clientRecordId = "treinoapp:$sessionId",
                    clientRecordVersion = 2L,
                ),
            )
            val response = client().insertRecords(listOf(record))
            val id = response.recordIdsList.firstOrNull()
            if (id != null) WriteResult(true, recordId = id)
            else WriteResult(false, reason = "Health Connect não retornou ID após insertRecords")
        } catch (t: Throwable) {
            WriteResult(false, reason = t.message ?: "Falha desconhecida em insertRecords", errorClass = t::class.java.name)
        }
    }

    suspend fun getRecoverySnapshot(days: Int = 28): RecoverySnapshot {
        if (!isAvailable()) return RecoverySnapshot()
        val hc = client()
        val granted = grantedPermissions()
        val now = Instant.now()
        val safeDays = days.coerceIn(7, 90)
        val start = now.minusSeconds(safeDays.toLong() * 24 * 3600)
        val start7 = now.minusSeconds(7L * 24 * 3600)
        fun has(record: kotlin.reflect.KClass<out androidx.health.connect.client.records.Record>) =
            granted.contains(HealthPermission.getReadPermission(record))

        val sleepRecords = if (has(SleepSessionRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<SleepSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val latestSleep = sleepRecords.maxByOrNull { it.endTime }
        val sleep7 = sleepRecords.filter { it.endTime >= start7 }
        val sleep7Avg = sleep7.map { (it.endTime.toEpochMilli() - it.startTime.toEpochMilli()).coerceAtLeast(0L) / 60000.0 }
            .takeIf { it.isNotEmpty() }?.average()

        val resting = if (has(RestingHeartRateRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<RestingHeartRateRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val latestRest = resting.maxByOrNull { it.time }
        val rest7 = resting.filter { it.time >= start7 }.map { it.beatsPerMinute.toDouble() }
        val rest28 = resting.map { it.beatsPerMinute.toDouble() }

        val hrv = if (has(HeartRateVariabilityRmssdRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<HeartRateVariabilityRmssdRecord>(
                timeRangeFilter = TimeRangeFilter.between(start, now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val latestHrv = hrv.maxByOrNull { it.time }
        val hrv7 = hrv.filter { it.time >= start7 }.map { it.heartRateVariabilityMillis }
        val hrv28 = hrv.map { it.heartRateVariabilityMillis }

        val weights = if (has(WeightRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<WeightRecord>(
                timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(365L * 24 * 3600), now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val bodyFat = if (has(BodyFatRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<BodyFatRecord>(
                timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(365L * 24 * 3600), now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val lean = if (has(LeanBodyMassRecord::class)) runCatching {
            hc.readRecords(ReadRecordsRequest<LeanBodyMassRecord>(
                timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(365L * 24 * 3600), now.plusSeconds(3600)),
                ascendingOrder = true,
                pageSize = 1000,
            )).records
        }.getOrDefault(emptyList()) else emptyList()
        val latestWeight = weights.maxByOrNull { it.time }
        val latestFat = bodyFat.maxByOrNull { it.time }
        val latestLean = lean.maxByOrNull { it.time }

        return RecoverySnapshot(
            sleepLastMinutes = latestSleep?.let { ((it.endTime.toEpochMilli() - it.startTime.toEpochMilli()).coerceAtLeast(0L) / 60000L) },
            sleepLastStartMs = latestSleep?.startTime?.toEpochMilli(),
            sleepLastEndMs = latestSleep?.endTime?.toEpochMilli(),
            sleep7dAvgMinutes = sleep7Avg,
            restingHrLatest = latestRest?.beatsPerMinute,
            restingHr7dAvg = rest7.takeIf { it.isNotEmpty() }?.average(),
            restingHr28dAvg = rest28.takeIf { it.isNotEmpty() }?.average(),
            hrvLatestMs = latestHrv?.heartRateVariabilityMillis,
            hrv7dAvgMs = hrv7.takeIf { it.isNotEmpty() }?.average(),
            hrv28dAvgMs = hrv28.takeIf { it.isNotEmpty() }?.average(),
            weightKg = latestWeight?.weight?.inKilograms,
            bodyFatPct = latestFat?.percentage?.value,
            leanMassKg = latestLean?.mass?.inKilograms,
            sleepSource = latestSleep?.metadata?.dataOrigin?.packageName?.let(::sourceLabel),
            restingHrSource = latestRest?.metadata?.dataOrigin?.packageName?.let(::sourceLabel),
            hrvSource = latestHrv?.metadata?.dataOrigin?.packageName?.let(::sourceLabel),
            bodySource = (latestWeight?.metadata?.dataOrigin?.packageName ?: latestFat?.metadata?.dataOrigin?.packageName ?: latestLean?.metadata?.dataOrigin?.packageName)?.let(::sourceLabel),
            permissions = granted.sorted(),
        )
    }

    data class WeightSyncResult(val latestKg: Double?, val latestDate: String?, val written: Int)

    suspend fun syncWeight(localWeights: List<Pair<String, Double>>): WeightSyncResult {
        if (!isAvailable()) return WeightSyncResult(null, null, 0)
        val hc = client()
        val granted = grantedPermissions()
        var written = 0
        if (granted.contains(HealthPermission.getWritePermission(WeightRecord::class))) {
            val zone = ZoneId.systemDefault()
            val records = localWeights.mapNotNull { (date, kg) ->
                if (kg <= 0.0 || kg > 1000.0) return@mapNotNull null
                runCatching {
                    val time = LocalDate.parse(date).atTime(12, 0).atZone(zone).toInstant()
                    WeightRecord(
                        time = time,
                        zoneOffset = zone.rules.getOffset(time),
                        weight = Mass.kilograms(kg),
                        metadata = Metadata.manualEntry(
                            clientRecordId = "treinoapp-weight:$date",
                            clientRecordVersion = 1L,
                        ),
                    )
                }.getOrNull()
            }
            if (records.isNotEmpty()) runCatching { hc.insertRecords(records); written = records.size }
        }
        if (!granted.contains(HealthPermission.getReadPermission(WeightRecord::class))) {
            return WeightSyncResult(null, null, written)
        }
        val now = Instant.now()
        val records = hc.readRecords(
            ReadRecordsRequest<WeightRecord>(
                timeRangeFilter = TimeRangeFilter.between(now.minusSeconds(365L * 24 * 3600), now.plusSeconds(3600))
            )
        ).records
        val latest = records.maxByOrNull { it.time }
        return WeightSyncResult(
            latestKg = latest?.weight?.inKilograms,
            latestDate = latest?.time?.atZone(ZoneId.systemDefault())?.toLocalDate()?.toString(),
            written = written,
        )
    }
}
