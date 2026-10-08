package com.treinoapp.app.nativebridge

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.withContext

class ExternalBackupWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val repository = ExternalBackupRepository(applicationContext)
        if (!repository.enabled()) return Result.success()
        return try { withContext(Dispatchers.IO) { repository.write() }; Result.success() }
        catch (error: Exception) { if (error is CancellationException) throw error; if (runAttemptCount < 2) Result.retry() else Result.failure() }
    }
}

object ExternalBackupScheduler {
    private const val PERIODIC = "treinoapp-external-backup-periodic"
    private const val SOON = "treinoapp-external-backup-soon"
    fun ensure(context: Context) {
        val repository = ExternalBackupRepository(context)
        if (!repository.enabled()) return
        val hours = repository.intervalHours().toLong()
        val work = PeriodicWorkRequestBuilder<ExternalBackupWorker>(hours, TimeUnit.HOURS)
            .setInitialDelay(hours, TimeUnit.HOURS).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.UPDATE, work)
        soon(context)
    }
    fun soon(context: Context) {
        val work = OneTimeWorkRequestBuilder<ExternalBackupWorker>().setInitialDelay(30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(context).enqueueUniqueWork(SOON, ExistingWorkPolicy.KEEP, work)
    }
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
        WorkManager.getInstance(context).cancelUniqueWork(SOON)
    }
}
