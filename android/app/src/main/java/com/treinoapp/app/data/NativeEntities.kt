package com.treinoapp.app.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

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
    val sessionRpe: Double? = null,
    val contextTagsJson: String? = null,
    val sessionNote: String? = null,
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
    val completedAt: Long,
    val rir: Int? = null,
    val rpe: Double? = null,
    val startedAt: Long? = null,
    val restBeforeSec: Int? = null,
    val timingQuality: String = "legacy",
)

@Entity(tableName = "nutrition_goals")
data class NutritionGoalEntity(
    @PrimaryKey val id: String = "default",
    val kcal: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val updatedAt: Long,
)

@Entity(tableName = "nutrition_foods")
data class NutritionFoodEntity(
    @PrimaryKey val id: String,
    val name: String,
    val brand: String,
    val servingName: String,
    val servingGrams: Double,
    val kcal100: Double,
    val protein100: Double,
    val carbs100: Double,
    val fat100: Double,
    val fiber100: Double,
    val sodium100: Double,
    val favorite: Boolean,
    @ColumnInfo(defaultValue = "'manual'") val source: String = "manual",
    @ColumnInfo(defaultValue = "''") val sourceId: String = "",
    @ColumnInfo(defaultValue = "''") val barcode: String = "",
    @ColumnInfo(defaultValue = "'[]'") val measuresJson: String = "[]",
    val createdAt: Long,
    val updatedAt: Long,
    val lastUsedAt: Long,
)

@Entity(tableName = "nutrition_recipes")
data class NutritionRecipeEntity(
    @PrimaryKey val id: String,
    val name: String,
    val yieldGrams: Double,
    val servings: Double,
    val itemsJson: String,
    val favorite: Boolean,
    val createdAt: Long,
    val updatedAt: Long,
    val lastUsedAt: Long,
)

@Entity(tableName = "nutrition_meal_templates")
data class NutritionMealTemplateEntity(
    @PrimaryKey val id: String,
    val name: String,
    val mealType: String,
    val itemsJson: String,
    val createdAt: Long,
    val updatedAt: Long,
    val lastUsedAt: Long,
)

@Entity(
    tableName = "nutrition_entries",
    indices = [Index(value = ["date"]), Index(value = ["foodId"])],
)
data class NutritionEntryEntity(
    @PrimaryKey val id: String,
    val date: String,
    val time: String,
    val mealType: String,
    val foodId: String?,
    val name: String,
    val grams: Double,
    val kcal: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val fiber: Double,
    val sodium: Double,
    val createdAt: Long,
    val updatedAt: Long,
)
