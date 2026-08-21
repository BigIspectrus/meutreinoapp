package com.treinoapp.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [WorkoutSessionEntity::class, WorkoutSetEntity::class],
    version = 4,
    exportSchema = true
)
abstract class TreinoDatabase : RoomDatabase() {
    abstract fun workoutDao(): NativeWorkoutDao

    companion object {
        @Volatile private var INSTANCE: TreinoDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthMinHr REAL")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthStartMs INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthEndMs INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthTitle TEXT")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthExerciseType INTEGER")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthSampleCount INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN healthSamplesJson TEXT")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN rir INTEGER")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN rpe REAL")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN sessionRpe REAL")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN contextTagsJson TEXT")
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN sessionNote TEXT")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN startedAt INTEGER")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN restBeforeSec INTEGER")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN timingQuality TEXT NOT NULL DEFAULT 'legacy'")
            }
        }

        fun get(context: Context): TreinoDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                TreinoDatabase::class.java,
                "treinoapp_native.db"
            ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4).build().also { INSTANCE = it }
        }
    }
}
