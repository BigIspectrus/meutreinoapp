package com.treinoapp.app.widget

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import android.widget.TextView
import com.treinoapp.app.R
import com.treinoapp.app.data.NutritionEntryEntity
import com.treinoapp.app.data.NutritionGoalEntity
import com.treinoapp.app.data.TreinoDatabase
import com.treinoapp.app.nativebridge.ActivityHealthRepository
import com.treinoapp.app.nativebridge.WorkoutForegroundService
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** Android simulado: usa SharedPreferences, RemoteViews/resources e Room reais.
 * Não representa teste físico de launcher ou Samsung Health/Galaxy Watch. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AndroidCriticalCasesTest {
    private lateinit var context: Context

    @Before fun setup() {
        context = RuntimeEnvironment.getApplication()
        context.getSharedPreferences("treino_widget_state", Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE).edit().clear().commit()
    }

    private fun closeDatabase() {
        val field = TreinoDatabase::class.java.getDeclaredField("INSTANCE").apply { isAccessible = true }
        (field.get(null) as? TreinoDatabase)?.close()
        field.set(null, null)
    }

    @After fun cleanup() { closeDatabase() }

    private fun build(height: Int = 400): View {
        val options = Bundle().apply { putInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, height) }
        val method = TreinoAppWidgetProvider.Companion::class.java.getDeclaredMethod("buildViews", Context::class.java, Bundle::class.java)
            .apply { isAccessible = true }
        val views = method.invoke(TreinoAppWidgetProvider.Companion, context, options) as RemoteViews
        return views.apply(context, null)
    }

    private fun text(view: View, id: Int) = view.findViewById<TextView>(id).text.toString()

    private fun save(date: String = LocalDate.now().toString()) {
        TreinoAppWidgetProvider.saveState(context, "Treino A", 2, 4, 3, date, 400f, 30f, 50f, 10f, 2000f)
    }

    @Test fun currentDayShowsCaloriesAndMacrosWithoutWebView() {
        save(); val view = build()
        assertEquals("400 / 2000 kcal", text(view, R.id.widgetNutritionKcal))
        assertEquals("P 30 g", text(view, R.id.widgetNutritionProtein))
        assertEquals("C 50 g", text(view, R.id.widgetNutritionCarbs))
        assertEquals("G 10 g", text(view, R.id.widgetNutritionFat))
        assertEquals("INICIAR TREINO", text(view, R.id.widgetButton))
    }

    @Test fun previousDayIsNeverShownAsToday() {
        save(LocalDate.now().minusDays(1).toString()); val view = build()
        assertEquals("0 / 2000 kcal", text(view, R.id.widgetNutritionKcal))
        assertEquals("P 0 g", text(view, R.id.widgetNutritionProtein))
        assertEquals("C 0 g", text(view, R.id.widgetNutritionCarbs))
        assertEquals("G 0 g", text(view, R.id.widgetNutritionFat))
    }

    @Test fun compactWidgetKeepsFoodAndButtons() {
        save(); val view = build(260)
        assertEquals(View.GONE, view.findViewById<View>(R.id.widgetTrainingStats).visibility)
        assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widgetMealButton).visibility)
        assertEquals(View.VISIBLE, view.findViewById<View>(R.id.widgetNutritionKcal).visibility)
    }

    @Test fun mealShortcutDoesNotResetActiveWorkout() {
        save()
        val prefs = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(WorkoutForegroundService.KEY_ACTIVE, true)
            .putString(WorkoutForegroundService.KEY_NAME, "Sessão ativa")
            .putInt(WorkoutForegroundService.KEY_DONE, 3).putInt(WorkoutForegroundService.KEY_TOTAL, 12).commit()
        val view = build(); assertEquals("ABRIR TREINO", text(view, R.id.widgetButton))
        assertTrue(view.findViewById<View>(R.id.widgetMealButton).performClick())
        val intent = shadowOf(RuntimeEnvironment.getApplication()).nextStartedActivity
        assertNotNull(intent); assertEquals("nutricao", intent.getStringExtra("openTab")); assertTrue(intent.getBooleanExtra("addMeal", false))
        assertTrue(prefs.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false)); assertEquals(3, prefs.getInt(WorkoutForegroundService.KEY_DONE, 0))
    }

    private fun meal(id: String, date: String, kcal: Double) = NutritionEntryEntity(
        id = id, date = date, time = "12:00", mealType = "lunch", foodId = null, name = "Dados fictícios",
        grams = 100.0, kcal = kcal, protein = 30.0, carbs = 50.0, fat = 10.0,
        fiber = 0.0, sodium = 0.0, createdAt = 1L, updatedAt = 1L,
    )

    @Test fun widgetReadsRoomAndDataSurvivesDatabaseReopen() = runBlocking(Dispatchers.IO) {
        val today = LocalDate.now().toString(); val yesterday = LocalDate.now().minusDays(1).toString()
        val db = TreinoDatabase.get(context)
        db.workoutDao().replaceAllNutrition(NutritionGoalEntity(kcal = 2000.0, protein = 150.0, carbs = 200.0, fat = 60.0, updatedAt = 1L),
            emptyList(), listOf(meal("today", today, 400.0), meal("yesterday", yesterday, 900.0)), emptyList(), emptyList())
        TreinoAppWidgetProvider.refreshNutrition(context)
        val prefs = context.getSharedPreferences("treino_widget_state", Context.MODE_PRIVATE)
        assertEquals(today, prefs.getString("nutritionDate", "")); assertEquals(400f, prefs.getFloat("nutritionKcal", -1f), 0f)
        closeDatabase()
        val reopened = TreinoDatabase.get(context)
        assertEquals(1, reopened.workoutDao().nutritionEntriesForDate(today).size)
        assertEquals(2000.0, reopened.workoutDao().nutritionGoal()!!.kcal, 0.0)
        prefs.edit().putString("nutritionDate", yesterday).putFloat("nutritionKcal", 900f).commit()
        TreinoAppWidgetProvider.refreshNutrition(context)
        assertEquals(today, prefs.getString("nutritionDate", "")); assertEquals(400f, prefs.getFloat("nutritionKcal", -1f), 0f)
    }

    @Test @Config(sdk = [33]) fun healthUnavailableDoesNotCreateValuesOrSuccessfulReads() = runBlocking {
        val snapshot = ActivityHealthRepository(context).snapshot(30)
        assertFalse(snapshot.available); assertTrue(snapshot.daily.isEmpty()); assertTrue(snapshot.sessions.isEmpty())
        assertEquals(6, snapshot.readStatus.size)
        snapshot.readStatus.values.forEach { assertEquals("unavailable", it.state); assertNull(it.readAt) }
    }
}
