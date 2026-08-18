package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Mass
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class HealthConnectRepository(private val context: Context) {
    /** Permissões mínimas para localizar e enriquecer uma sessão do relógio. */
    // A única permissão indispensável para associar uma sessão do relógio é a leitura de exercícios.
    // FC/calorias/peso e escrita são recursos adicionais: negar um deles não impede a associação básica.
    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )

    /** Permissões adicionais para enriquecer a sessão, gravar o treino e sincronizar peso. */
    private val optionalPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
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
    } else (requiredPermissions + optionalPermissions)

    suspend fun grantedPermissions(): Set<String> =
        if (isAvailable()) client().permissionController.getGrantedPermissions() else emptySet()

    suspend fun hasRequiredPermissions(): Boolean = grantedPermissions().containsAll(requiredPermissions)

    data class Match(
        val found: Boolean,
        val confidence: Double = 0.0,
        val recordId: String? = null,
        val sourceApp: String? = null,
        val startMs: Long? = null,
        val endMs: Long? = null,
        val durationMin: Long? = null,
        val avgHr: Double? = null,
        val maxHr: Double? = null,
        val kcal: Double? = null,
    )

    suspend fun findBestExerciseMatch(startMs: Long, endMs: Long): Match {
        if (!isAvailable() || !hasRequiredPermissions() || endMs <= startMs) return Match(false)
        val hc = client()
        val appStart = Instant.ofEpochMilli(startMs)
        val appEnd = Instant.ofEpochMilli(endMs)
        val searchStart = appStart.minusSeconds(20 * 60)
        val searchEnd = appEnd.plusSeconds(20 * 60)
        val records = hc.readRecords(
            ReadRecordsRequest<ExerciseSessionRecord>(
                timeRangeFilter = TimeRangeFilter.between(searchStart, searchEnd)
            )
        ).records

        val ownPackages = setOf(context.packageName, "com.treinoapp.app", "com.treinoapp.beta")
        val candidates = records.filter { it.metadata.dataOrigin.packageName !in ownPackages }
        if (candidates.isEmpty()) return Match(false)

        val appDuration = max(1L, endMs - startMs)
        val ranked = candidates.map { r ->
            val rs = r.startTime.toEpochMilli()
            val re = r.endTime.toEpochMilli()
            val overlap = max(0L, min(endMs, re) - max(startMs, rs))
            val candidateDuration = max(1L, re - rs)
            val overlapRatio = overlap.toDouble() / max(appDuration, candidateDuration).toDouble()
            val startDiff = abs(rs - startMs).toDouble()
            val endDiff = abs(re - endMs).toDouble()
            val startScore = (1.0 - startDiff / (15 * 60_000.0)).coerceIn(0.0, 1.0)
            val endScore = (1.0 - endDiff / (15 * 60_000.0)).coerceIn(0.0, 1.0)
            val confidence = (overlapRatio * 0.70 + startScore * 0.15 + endScore * 0.15).coerceIn(0.0, 1.0)
            Triple(r, confidence, overlapRatio)
        }.sortedByDescending { it.second }

        val best = ranked.first()
        if (best.second < 0.45) return Match(false)
        val r = best.first
        val metrics = aggregateMetrics(hc, r.startTime, r.endTime, r.metadata.dataOrigin)
        return Match(
            found = true,
            confidence = best.second,
            recordId = r.metadata.id,
            sourceApp = r.metadata.dataOrigin.packageName,
            startMs = r.startTime.toEpochMilli(),
            endMs = r.endTime.toEpochMilli(),
            durationMin = max(1L, (r.endTime.toEpochMilli() - r.startTime.toEpochMilli()) / 60_000L),
            avgHr = metrics.first,
            maxHr = metrics.second,
            kcal = metrics.third,
        )
    }

    private suspend fun aggregateMetrics(
        hc: HealthConnectClient,
        start: Instant,
        end: Instant,
        dataOrigin: DataOrigin,
    ): Triple<Double?, Double?, Double?> {
        return try {
            val granted = grantedPermissions()
            val hrAllowed = granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class))
            val kcalAllowed = granted.contains(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class))
            val metrics = buildSet {
                if (hrAllowed) {
                    add(HeartRateRecord.BPM_AVG)
                    add(HeartRateRecord.BPM_MAX)
                }
                if (kcalAllowed) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
            }
            if (metrics.isEmpty()) return Triple(null, null, null)
            val result: AggregationResult = hc.aggregate(
                AggregateRequest(
                    metrics = metrics,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    dataOriginFilter = setOf(dataOrigin),
                )
            )
            Triple(
                if (hrAllowed) result[HeartRateRecord.BPM_AVG]?.toDouble() else null,
                if (hrAllowed) result[HeartRateRecord.BPM_MAX]?.toDouble() else null,
                if (kcalAllowed) result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories else null,
            )
        } catch (_: Throwable) {
            Triple(null, null, null)
        }
    }

    suspend fun writeStrengthSession(
        sessionId: String,
        title: String,
        startMs: Long,
        endMs: Long,
    ): String? {
        if (!isAvailable()) return null
        val granted = grantedPermissions()
        if (!granted.contains(HealthPermission.getWritePermission(ExerciseSessionRecord::class))) return null
        if (endMs <= startMs) return null
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
            metadata = Metadata.manualEntry(
                clientRecordId = "treinoapp:$sessionId",
                clientRecordVersion = 1L,
            ),
        )
        val response = client().insertRecords(listOf(record))
        return response.recordIdsList.firstOrNull()
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
            if (records.isNotEmpty()) {
                runCatching { hc.insertRecords(records); written = records.size }
            }
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
