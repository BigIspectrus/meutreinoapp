package com.treinoapp.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [WorkoutSessionEntity::class, WorkoutSetEntity::class],
    version = 1,
    exportSchema = true
)
abstract class TreinoDatabase : RoomDatabase() {
    abstract fun workoutDao(): NativeWorkoutDao

    companion object {
        @Volatile private var INSTANCE: TreinoDatabase? = null

        fun get(context: Context): TreinoDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                TreinoDatabase::class.java,
                "treinoapp_native.db"
            ).build().also { INSTANCE = it }
        }
    }
}
