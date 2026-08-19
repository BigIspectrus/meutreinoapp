package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.treinoapp.app.data.TreinoDatabase
import java.util.concurrent.TimeUnit

/**
 * Procura automaticamente uma sessão do Samsung Health/Galaxy Watch que coincida
 * com uma sessão finalizada no TreinoApp. Só associa sem intervenção quando a
 * confiança é >= 78%. Casos ambíguos continuam pendentes para confirmação no app.
 */
class HealthSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val health = HealthConnectRepository(applicationContext)
        if (!health.isAvailable() || !health.backgroundReadAvailable()) return Result.success()
        val granted = runCatching { health.grantedPermissions() }.getOrElse { return Result.retry() }
        if (!granted.containsAll(health.requiredPermissions) || PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND !in granted) {
            return Result.success()
        }

        val dao = TreinoDatabase.get(applicationContext).workoutDao()
        val minEnd = System.currentTimeMillis() - 7L * 24 * 60 * 60 * 1000
        val pending = dao.pendingHealthSessions(minEnd)
        for (session in pending) {
            val match = runCatching { health.findBestExerciseMatch(session.startMs, session.endMs) }.getOrNull() ?: continue
            if (match.found && match.confidence >= 0.78) {
                dao.updateHealthLink(
                    sessionId = session.sessionId,
                    state = "linked",
                    recordId = match.recordId,
                    sourceApp = match.sourceApp,
                    confidence = match.confidence,
                    avgHr = match.avgHr,
                    maxHr = match.maxHr,
                    minHr = match.minHr,
                    kcal = match.kcal,
                    healthStartMs = match.startMs,
                    healthEndMs = match.endMs,
                    healthTitle = match.title,
                    healthExerciseType = match.exerciseType,
                    heartRateSampleCount = match.heartRateSampleCount,
                    heartRateSamplesJson = match.heartRateSamples.joinToString(prefix = "[", postfix = "]") { point -> "{\"timeMs\":${point.timeMs},\"bpm\":${point.bpm}}" },
                )
            }
        }
        return Result.success()
    }
}

object HealthSyncScheduler {
    private const val PERIODIC_NAME = "treinoapp-health-sync-periodic"
    private const val SOON_NAME = "treinoapp-health-sync-soon"

    fun ensurePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<HealthSyncWorker>(15, TimeUnit.MINUTES)
            .setInitialDelay(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    fun scheduleSoon(context: Context) {
        // Galaxy Watch -> Samsung Health -> Health Connect pode levar alguns minutos.
        // Agendamos uma pequena escada de novas tentativas em vez de uma única leitura.
        val manager = WorkManager.getInstance(context)
        listOf(1L, 3L, 7L, 15L, 30L).forEach { delay ->
            val request = OneTimeWorkRequestBuilder<HealthSyncWorker>()
                .setInitialDelay(delay, TimeUnit.MINUTES)
                .build()
            manager.enqueueUniqueWork(
                "$SOON_NAME-$delay",
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
