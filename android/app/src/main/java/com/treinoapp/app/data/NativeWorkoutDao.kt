package com.treinoapp.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface NativeWorkoutDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSession(session: WorkoutSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSets(sets: List<WorkoutSetEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertLegacySets(sets: List<WorkoutSetEntity>)

    @Query("DELETE FROM workout_sets")
    suspend fun clearSets()

    @Query("DELETE FROM workout_sessions")
    suspend fun clearSessions()

    @Query("SELECT COUNT(*) FROM workout_sets")
    suspend fun countSets(): Int

    @Query("SELECT COUNT(*) FROM workout_sessions")
    suspend fun countSessions(): Int

    @Query("SELECT * FROM workout_sessions WHERE healthState = 'pending' AND endMs > :minEndMs ORDER BY endMs DESC LIMIT :limit")
    suspend fun pendingHealthSessions(minEndMs: Long, limit: Int = 20): List<WorkoutSessionEntity>

    @Query("SELECT * FROM workout_sessions WHERE healthState IN ('linked','written') ORDER BY healthSyncedAt DESC LIMIT :limit")
    suspend fun healthSyncedSessions(limit: Int = 50): List<WorkoutSessionEntity>

    @Query("""
        UPDATE workout_sessions SET
          healthState = :state,
          healthRecordId = :recordId,
          healthSourceApp = :sourceApp,
          healthConfidence = :confidence,
          healthAvgHr = :avgHr,
          healthMaxHr = :maxHr,
          healthMinHr = :minHr,
          healthKcal = :kcal,
          healthStartMs = :healthStartMs,
          healthEndMs = :healthEndMs,
          healthTitle = :healthTitle,
          healthExerciseType = :healthExerciseType,
          healthSampleCount = :heartRateSampleCount,
          healthSamplesJson = :heartRateSamplesJson,
          healthSyncedAt = :syncedAt
        WHERE sessionId = :sessionId
    """)
    suspend fun updateHealthLink(
        sessionId: String,
        state: String,
        recordId: String?,
        sourceApp: String?,
        confidence: Double?,
        avgHr: Double?,
        maxHr: Double?,
        minHr: Double?,
        kcal: Double?,
        healthStartMs: Long?,
        healthEndMs: Long?,
        healthTitle: String?,
        healthExerciseType: Int?,
        heartRateSampleCount: Int,
        heartRateSamplesJson: String?,
        syncedAt: Long = System.currentTimeMillis(),
    )

    @Transaction
    suspend fun replaceAllLegacy(sets: List<WorkoutSetEntity>) {
        // A migração inicial do histórico web substitui apenas o espelho de séries.
        // Sessões nativas já criadas nunca são apagadas por uma sincronização comum.
        clearSets()
        if (sets.isNotEmpty()) upsertLegacySets(sets)
    }
}
