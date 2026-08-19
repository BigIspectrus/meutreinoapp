package com.treinoapp.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "workout_sessions")
data class WorkoutSessionEntity(
    @PrimaryKey val sessionId: String,
    val templateId: String?,
    val name: String,
    val startMs: Long,
    val endMs: Long,
    val durationSec: Long,
    val completedSets: Int,
    val totalSets: Int,
    val syncedAt: Long = System.currentTimeMillis(),
    val healthState: String = "pending",
    val healthRecordId: String? = null,
    val healthSourceApp: String? = null,
    val healthConfidence: Double? = null,
    val healthAvgHr: Double? = null,
    val healthMaxHr: Double? = null,
    val healthMinHr: Double? = null,
    val healthKcal: Double? = null,
    val healthStartMs: Long? = null,
    val healthEndMs: Long? = null,
    val healthTitle: String? = null,
    val healthExerciseType: Int? = null,
    val healthSampleCount: Int = 0,
    val healthSamplesJson: String? = null,
    val healthSyncedAt: Long? = null,
)

@Entity(tableName = "workout_sets")
data class WorkoutSetEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val exercise: String,
    val setNumber: Int,
    val weight: Double,
    val reps: Int,
    val setType: String,
    val completedAt: Long
)
