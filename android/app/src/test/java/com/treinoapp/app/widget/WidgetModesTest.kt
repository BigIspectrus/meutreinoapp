package com.treinoapp.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.widget.TextView
import com.treinoapp.app.R
import com.treinoapp.app.nativebridge.WorkoutForegroundService
import java.time.LocalDate
import java.time.DayOfWeek
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class WidgetModesTest {
    private lateinit var context: Context
    @Before fun setup() {
        context = RuntimeEnvironment.getApplication()
        for (name in listOf("treino_widget_state", "treino_widget_configuration", WorkoutForegroundService.PREFS))
            context.getSharedPreferences(name, Context.MODE_PRIVATE).edit().clear().commit()
    }
    private fun build(mode: WidgetMode, id: Int = 1, height: Int = 400, macros: Boolean = true, compact: Boolean = false): View =
        TreinoAppWidgetProvider.buildViewsForSize(context, id, WidgetOptions(mode, compact, macros), height).apply(context, null)
    private fun text(view: View, id: Int) = view.findViewById<TextView>(id).text.toString()
    private fun visible(view: View, id: Int) = view.findViewById<View>(id).visibility == View.VISIBLE
    private fun movement(date: LocalDate = LocalDate.now(), steps: Any? = 3400, sessions: Any? = 2): JSONObject {
        val week = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return JSONObject().put("date", date.toString()).put("weekStart", week.toString()).put("weekEnd", week.plusDays(6).toString())
            .put("zoneId", ZoneId.systemDefault().id).put("steps", steps ?: JSONObject.NULL)
            .put("minutes", if (sessions == null) JSONObject.NULL else 60).put("sessions", sessions ?: JSONObject.NULL)
            .put("stepsGoal", 8000).put("minutesGoal", 150).put("sessionsGoal", 3)
            .put("stepsReadAt", System.currentTimeMillis() - 1000).put("cardioReadAt", System.currentTimeMillis() - 1000)
            .put("stepsState", "ok").put("cardioState", "ok").put("partial", false)
    }
    private fun save(move: JSONObject? = movement()) = TreinoAppWidgetProvider.saveState(context,
        "Treino A", 2, 4, 3, LocalDate.now().toString(), 400f, 30f, 50f, 10f, 2000f, move)

    @Test fun independentModesAndDeletingOnePreserveOtherInstancesAndFood() {
        save()
        assertTrue(WidgetConfiguration.save(context, 1, WidgetOptions(WidgetMode.NUTRITION, true, false)))
        assertTrue(WidgetConfiguration.save(context, 2, WidgetOptions(WidgetMode.MOVEMENT)))
        assertEquals(WidgetMode.NUTRITION, WidgetConfiguration.load(context, 1).mode)
        assertFalse(WidgetConfiguration.load(context, 1).showMacros)
        assertEquals(WidgetMode.MOVEMENT, WidgetConfiguration.load(context, 2).mode)
        TreinoAppWidgetProvider().onDeleted(context, intArrayOf(1))
        assertEquals(WidgetMode.COMBINED, WidgetConfiguration.load(context, 1).mode)
        assertEquals(WidgetMode.MOVEMENT, WidgetConfiguration.load(context, 2).mode)
        assertEquals(400f, context.getSharedPreferences("treino_widget_state", Context.MODE_PRIVATE).getFloat("nutritionKcal", 0f), 0f)
    }

    @Test fun separateProvidersUseTheirOwnDefaultsAndLegacyUsesCombined() {
        assertEquals(WidgetMode.COMBINED, WidgetConfiguration.defaultMode(TreinoAppWidgetProvider::class.java.name))
        assertEquals(WidgetMode.NUTRITION, WidgetConfiguration.defaultMode(TreinoNutritionWidgetProvider::class.java.name))
        assertEquals(WidgetMode.WORKOUT, WidgetConfiguration.defaultMode(TreinoWorkoutWidgetProvider::class.java.name))
        assertEquals(WidgetMode.MOVEMENT, WidgetConfiguration.defaultMode(TreinoMovementWidgetProvider::class.java.name))
    }

    @Test fun eachModeShowsOnlyItsContentAndShortcut() {
        save()
        val sections = listOf(R.id.widgetTrainingSection, R.id.widgetNutritionSection, R.id.widgetMovementSection)
        val buttons = listOf(R.id.widgetButton, R.id.widgetMealButton, R.id.widgetMovementButton)
        for ((mode, index) in listOf(WidgetMode.WORKOUT to 0, WidgetMode.NUTRITION to 1, WidgetMode.MOVEMENT to 2)) {
            val view = build(mode)
            sections.forEachIndexed { i, section -> assertEquals(i == index, visible(view, section)) }
            buttons.forEachIndexed { i, button -> assertEquals(i == index, visible(view, button)) }
        }
        val combined = build(WidgetMode.COMBINED, height = 460)
        (sections + buttons).forEach { assertTrue(visible(combined, it)) }
    }

    @Test fun compactAndMacrosChoicesRemainPerInstance() {
        save()
        val food = build(WidgetMode.NUTRITION, macros = false)
        assertFalse(visible(food, R.id.widgetMacros)); assertTrue(visible(food, R.id.widgetMealButton))
        assertTrue(visible(build(WidgetMode.NUTRITION), R.id.widgetMacros))
        val training = build(WidgetMode.WORKOUT, compact = true)
        assertFalse(visible(training, R.id.widgetTrainingStats)); assertTrue(visible(training, R.id.widgetButton))
        val small = build(WidgetMode.COMBINED, height = 180)
        assertFalse(visible(small, R.id.widgetTrainingSection)); assertFalse(visible(small, R.id.widgetMovementSection))
        assertTrue(visible(small, R.id.widgetNutritionSection)); assertTrue(visible(small, R.id.widgetMovementButton))
    }

    @Test fun absentIsNotZeroAndRealZeroIsShown() {
        save(movement(steps = null, sessions = null))
        var view = build(WidgetMode.MOVEMENT)
        assertEquals("— / 8000 passos", text(view, R.id.widgetSteps))
        assertTrue(text(view, R.id.widgetMovementWeek).startsWith("— min · — sessões"))
        save(movement(steps = 0, sessions = 0).put("minutes", 0))
        view = build(WidgetMode.MOVEMENT)
        assertEquals("0 / 8000 passos", text(view, R.id.widgetSteps))
        assertTrue(text(view, R.id.widgetMovementWeek).startsWith("0 min · 0 sessões"))
    }

    @Test @GraphicsMode(GraphicsMode.Mode.NATIVE) fun minimumSizesKeepContentAboveTheShortcutRow() {
        save()
        val density = context.resources.displayMetrics.density
        val cases = listOf(WidgetMode.NUTRITION to 180, WidgetMode.WORKOUT to 180, WidgetMode.MOVEMENT to 180,
            WidgetMode.COMBINED to 180, WidgetMode.COMBINED to 280, WidgetMode.COMBINED to 380, WidgetMode.COMBINED to 460)
        val failures = mutableListOf<String>()
        for ((mode, height) in cases) {
            val view = build(mode, height = height)
            val widthPx = (250 * density).toInt(); val heightPx = (height * density).toInt()
            view.measure(View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.EXACTLY))
            view.layout(0, 0, widthPx, heightPx)
            val action = listOf(R.id.widgetButton, R.id.widgetMealButton, R.id.widgetMovementButton).map { view.findViewById<View>(it) }.first { it.visibility == View.VISIBLE }
            val row = action.parent as View
            println("$mode $height: density=$density scaledDensity=${context.resources.displayMetrics.scaledDensity} fontScale=${context.resources.configuration.fontScale} heightPx=$heightPx action=${row.top}..${row.bottom}")
            if (row.bottom > heightPx) failures += "$mode $height: ação fora do widget (${row.bottom} > $heightPx)"
            for (id in listOf(R.id.widgetTrainingSection, R.id.widgetNutritionSection, R.id.widgetMovementSection)) {
                val section = view.findViewById<View>(id)
                if (section.visibility == View.VISIBLE) {
                    println("section $id: ${section.top}..${section.bottom}")
                    if (section.bottom + (section.parent as View).top > row.top) failures += "$mode $height: conteúdo sobrepõe o atalho"
                }
            }
            val content = view.findViewById<View>(R.id.widgetContent)
            fun withinContent(node: View, section: View): Boolean {
                var position = node.bottom; var parent = node.parent
                while (parent is View && parent !== section) { position += parent.top; parent = parent.parent }
                return node.height > 0 && position <= section.height
            }
            for ((sectionId, textIds) in listOf(
                R.id.widgetNutritionSection to listOf(R.id.widgetNutritionKcal, R.id.widgetNutritionProtein),
                R.id.widgetTrainingSection to listOf(R.id.widgetWorkout, R.id.widgetSubtitle, R.id.widgetStatLeftValue),
                R.id.widgetMovementSection to listOf(R.id.widgetSteps, R.id.widgetMovementRead, R.id.widgetMovementWeek))) {
                val section = view.findViewById<View>(sectionId)
                if (section.visibility != View.VISIBLE) continue
                for (textId in textIds) {
                    val field = view.findViewById<View>(textId)
                    var shown = field.visibility == View.VISIBLE; var parent = field.parent
                    while (parent is View && parent !== content) { shown = shown && parent.visibility == View.VISIBLE; parent = parent.parent }
                    if (shown && !withinContent(field, section)) failures += "$mode $height: texto cortado ($textId)"
                    if (shown && field is TextView && field.layout != null && field.layout.height > field.height - field.compoundPaddingTop - field.compoundPaddingBottom)
                        failures += "$mode $height: linhas cortadas ($textId)"
                }
            }
            val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(bitmap))
            val target = File("build/reports/widget-previews/${mode.key}-$height.png")
            target.parentFile.mkdirs()
            target.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
        assertTrue(failures.joinToString("; "), failures.isEmpty())
    }

    @Test fun dayWeekAndZoneChangesDoNotRelabelOldValues() {
        save(movement(LocalDate.now().minusDays(1)))
        assertEquals("— / 8000 passos", text(build(WidgetMode.MOVEMENT), R.id.widgetSteps))
        save(movement(LocalDate.now().minusWeeks(1)))
        assertTrue(text(build(WidgetMode.MOVEMENT), R.id.widgetMovementWeek).startsWith("— min · — sessões"))
        save(movement().put("zoneId", "different-zone"))
        assertEquals("— / 8000 passos", text(build(WidgetMode.MOVEMENT), R.id.widgetSteps))
    }

    @Test fun cachedPermissionDeniedAndPartialAreIdentified() {
        save(movement().put("partial", true).put("stepsState", "denied"))
        val view = build(WidgetMode.MOVEMENT)
        assertEquals("3400 / 8000 passos", text(view, R.id.widgetSteps))
        assertTrue(text(view, R.id.widgetMovementWeek).endsWith("parcial"))
        assertTrue(text(view, R.id.widgetMovementRead).contains("Salvos"))
        assertTrue(text(view, R.id.widgetMovementRead).contains("permissões"))
    }

    @Test fun shortcutsHaveUniqueIdentityAndMovementOpensTheRightScreen() {
        save()
        val view1 = build(WidgetMode.COMBINED, id = 10)
        val view2 = build(WidgetMode.MOVEMENT, id = 20)
        assertTrue(view1.findViewById<View>(R.id.widgetConfigure).performClick())
        val config1 = shadowOf(RuntimeEnvironment.getApplication()).nextStartedActivity
        assertEquals(10, config1.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1))
        assertTrue(view2.findViewById<View>(R.id.widgetConfigure).performClick())
        val config2 = shadowOf(RuntimeEnvironment.getApplication()).nextStartedActivity
        assertEquals(20, config2.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)); assertNotEquals(config1.data, config2.data)
        assertTrue(view2.findViewById<View>(R.id.widgetMovementButton).performClick())
        val intent = shadowOf(RuntimeEnvironment.getApplication()).nextStartedActivity
        assertEquals("progresso", intent.getStringExtra("openTab")); assertTrue(intent.getBooleanExtra("openActivity", false))
    }

    @Test fun restoringLauncherIdsMigratesOnlyConfiguration() {
        save()
        WidgetConfiguration.save(context, 10, WidgetOptions(WidgetMode.NUTRITION, true, false))
        TreinoAppWidgetProvider().onRestored(context, intArrayOf(10), intArrayOf(20))
        assertEquals(WidgetOptions(WidgetMode.NUTRITION, true, false), WidgetConfiguration.load(context, 20))
        assertEquals(WidgetMode.COMBINED, WidgetConfiguration.load(context, 10).mode)
        assertEquals(400f, context.getSharedPreferences("treino_widget_state", Context.MODE_PRIVATE).getFloat("nutritionKcal", 0f), 0f)
    }

    @Test fun pausedWorkoutTimeAndOpeningItKeepTheSession() {
        save()
        val now = System.currentTimeMillis()
        val prefs = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(WorkoutForegroundService.KEY_ACTIVE, true).putString(WorkoutForegroundService.KEY_NAME, "Treino B")
            .putLong(WorkoutForegroundService.KEY_STARTED, now - 20 * 60_000L)
            .putBoolean(WorkoutForegroundService.KEY_PAUSED, true).putLong(WorkoutForegroundService.KEY_PAUSED_AT, now - 5 * 60_000L)
            .putLong(WorkoutForegroundService.KEY_PAUSED_TOTAL, 5 * 60_000L).commit()
        val view = build(WidgetMode.WORKOUT)
        assertEquals("PAUSADO", text(view, R.id.widgetStatusChip)); assertEquals("10m", text(view, R.id.widgetStatRightValue))
        assertTrue(view.findViewById<View>(R.id.widgetButton).performClick())
        val intent = shadowOf(RuntimeEnvironment.getApplication()).nextStartedActivity
        assertEquals("treinar", intent.getStringExtra("openTab")); assertFalse(intent.getBooleanExtra("startNextWorkout", false))
        assertTrue(prefs.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false)); assertTrue(prefs.getBoolean(WorkoutForegroundService.KEY_PAUSED, false))
    }

    @Test fun invalidConfigurationCannotCreateOrOverwriteAWidget() {
        assertFalse(WidgetConfiguration.save(context, AppWidgetManager.INVALID_APPWIDGET_ID, WidgetOptions(WidgetMode.WORKOUT)))
        val controller = Robolectric.buildActivity(WidgetConfigActivity::class.java,
            Intent(context, WidgetConfigActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, 99999)).create()
        assertTrue(controller.get().isFinishing)
        assertEquals(Activity.RESULT_CANCELED, shadowOf(controller.get()).resultCode)
        controller.destroy()
    }
}
