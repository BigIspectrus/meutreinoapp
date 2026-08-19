package com.treinoapp.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [WorkoutSessionEntity::class, WorkoutSetEntity::class],
    version = 2,
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

        fun get(context: Context): TreinoDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                TreinoDatabase::class.java,
                "treinoapp_native.db"
            ).addMigrations(MIGRATION_1_2).build().also { INSTANCE = it }
        }
    }
}
