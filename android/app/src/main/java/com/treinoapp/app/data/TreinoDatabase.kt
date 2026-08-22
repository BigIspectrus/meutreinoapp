package com.treinoapp.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        WorkoutSessionEntity::class,
        WorkoutSetEntity::class,
        NutritionGoalEntity::class,
        NutritionFoodEntity::class,
        NutritionEntryEntity::class,
        NutritionRecipeEntity::class,
        NutritionMealTemplateEntity::class,
    ],
    version = 7,
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

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `nutrition_goals` (
                        `id` TEXT NOT NULL,
                        `kcal` REAL NOT NULL,
                        `protein` REAL NOT NULL,
                        `carbs` REAL NOT NULL,
                        `fat` REAL NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `nutrition_foods` (
                        `id` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `brand` TEXT NOT NULL,
                        `servingName` TEXT NOT NULL,
                        `servingGrams` REAL NOT NULL,
                        `kcal100` REAL NOT NULL,
                        `protein100` REAL NOT NULL,
                        `carbs100` REAL NOT NULL,
                        `fat100` REAL NOT NULL,
                        `fiber100` REAL NOT NULL,
                        `sodium100` REAL NOT NULL,
                        `favorite` INTEGER NOT NULL,
                        `createdAt` INTEGER NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        `lastUsedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `nutrition_entries` (
                        `id` TEXT NOT NULL,
                        `date` TEXT NOT NULL,
                        `time` TEXT NOT NULL,
                        `mealType` TEXT NOT NULL,
                        `foodId` TEXT,
                        `name` TEXT NOT NULL,
                        `grams` REAL NOT NULL,
                        `kcal` REAL NOT NULL,
                        `protein` REAL NOT NULL,
                        `carbs` REAL NOT NULL,
                        `fat` REAL NOT NULL,
                        `fiber` REAL NOT NULL,
                        `sodium` REAL NOT NULL,
                        `createdAt` INTEGER NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_nutrition_entries_date` ON `nutrition_entries` (`date`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_nutrition_entries_foodId` ON `nutrition_entries` (`foodId`)")
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE nutrition_foods ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
                db.execSQL("ALTER TABLE nutrition_foods ADD COLUMN sourceId TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE nutrition_foods ADD COLUMN barcode TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE nutrition_foods ADD COLUMN measuresJson TEXT NOT NULL DEFAULT '[]'")
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `nutrition_recipes` (
                        `id` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `yieldGrams` REAL NOT NULL,
                        `servings` REAL NOT NULL,
                        `itemsJson` TEXT NOT NULL,
                        `favorite` INTEGER NOT NULL,
                        `createdAt` INTEGER NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        `lastUsedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `nutrition_meal_templates` (
                        `id` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `mealType` TEXT NOT NULL,
                        `itemsJson` TEXT NOT NULL,
                        `createdAt` INTEGER NOT NULL,
                        `updatedAt` INTEGER NOT NULL,
                        `lastUsedAt` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE nutrition_goals ADD COLUMN microsJson TEXT NOT NULL DEFAULT '{}'")
                db.execSQL("ALTER TABLE nutrition_foods ADD COLUMN microsJson TEXT NOT NULL DEFAULT '{}'")
                db.execSQL("ALTER TABLE nutrition_entries ADD COLUMN microsJson TEXT NOT NULL DEFAULT '{}'")
            }
        }

        fun get(context: Context): TreinoDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                TreinoDatabase::class.java,
                "treinoapp_native.db"
            ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7).build().also { INSTANCE = it }
        }
    }
}
