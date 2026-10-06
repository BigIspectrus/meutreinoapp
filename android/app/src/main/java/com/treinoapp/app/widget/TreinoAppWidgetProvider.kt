package com.treinoapp.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import com.treinoapp.app.MainActivity
import com.treinoapp.app.R
import com.treinoapp.app.nativebridge.WorkoutForegroundService
import com.treinoapp.app.data.TreinoDatabase
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.time.DayOfWeek
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.max

open class TreinoAppWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateOne(context, it) }
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try { refreshNutrition(context) } finally { pending.finish() }
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        updateOne(context, id)
    }

    override fun onDeleted(context: Context, ids: IntArray) { WidgetConfiguration.remove(context, ids) }

    override fun onRestored(context: Context, oldIds: IntArray, newIds: IntArray) {
        // Launcher IDs belong to this device; migrate only matching restored instances.
        oldIds.zip(newIds).forEach { (old, new) ->
            val mode = WidgetConfiguration.defaultMode(AppWidgetManager.getInstance(context).getAppWidgetInfo(new)?.provider?.className)
            WidgetConfiguration.save(context, new, WidgetConfiguration.load(context, old, mode))
        }
        WidgetConfiguration.remove(context, oldIds.filter { it !in newIds }.toIntArray())
        newIds.forEach { updateOne(context, it) }
    }

    companion object {
        private const val WIDGET_PREFS = "treino_widget_state"
        fun updateAll(context: Context) { WidgetConfiguration.installed(context).forEach { updateOne(context, it) } }

        fun updateOne(context: Context, id: Int) {
            val manager = AppWidgetManager.getInstance(context)
            val provider = manager.getAppWidgetInfo(id)?.provider ?: return
            if (provider.className !in WidgetConfiguration.providers.map { it.name }) return
            val settings = WidgetConfiguration.load(context, id, WidgetConfiguration.defaultMode(provider.className))
            val options = manager.getAppWidgetOptions(id)
            val views = if (Build.VERSION.SDK_INT >= 31) {
                val heights = if (settings.mode == WidgetMode.COMBINED) listOf(180, 280, 380, 460) else listOf(180, 270)
                RemoteViews(heights.associate { height ->
                    SizeF(220f, height.toFloat()) to buildViewsForSize(context, id, settings, height)
                })
            } else buildViewsForSize(context, id, settings, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 300))
            manager.updateAppWidget(id, views)
        }

        suspend fun refreshNutrition(context: Context) {
            runCatching {
                val dao = TreinoDatabase.get(context).workoutDao()
                val date = LocalDate.now().toString()
                val entries = dao.nutritionEntriesForDate(date)
                val goal = dao.nutritionGoal()
                context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit()
                    .putString("nutritionDate", date)
                    .putFloat("nutritionKcal", entries.sumOf { it.kcal }.toFloat())
                    .putFloat("nutritionProtein", entries.sumOf { it.protein }.toFloat())
                    .putFloat("nutritionCarbs", entries.sumOf { it.carbs }.toFloat())
                    .putFloat("nutritionFat", entries.sumOf { it.fat }.toFloat())
                    .putFloat("nutritionGoalKcal", (goal?.kcal ?: 0.0).toFloat()).apply()
                updateAll(context)
            }
        }

        fun saveState(context: Context, nextWorkout: String, weeklyDone: Int, weeklyTarget: Int, streak: Int,
            nutritionDate: String, kcal: Float, protein: Float, carbs: Float, fat: Float, goalKcal: Float,
            movement: JSONObject? = null,
        ) {
            val edit = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit()
                .putString("nextWorkout", nextWorkout).putInt("weeklyDone", weeklyDone)
                .putInt("weeklyTarget", weeklyTarget).putInt("streak", streak)
                .putString("nutritionDate", nutritionDate).putFloat("nutritionKcal", kcal)
                .putFloat("nutritionProtein", protein).putFloat("nutritionCarbs", carbs)
                .putFloat("nutritionFat", fat).putFloat("nutritionGoalKcal", goalKcal)
            if (movement != null) {
                for (key in listOf("date", "weekStart", "weekEnd", "zoneId", "stepsState", "cardioState"))
                    edit.putString("movement.$key", movement.optString(key, ""))
                for (key in listOf("steps", "minutes", "sessions", "stepsGoal", "minutesGoal", "sessionsGoal")) {
                    val value = if (movement.isNull(key)) -1.0 else movement.optDouble(key, -1.0)
                    edit.putFloat("movement.$key", if (value.isFinite() && value >= 0) value.toFloat() else -1f)
                }
                for (key in listOf("stepsReadAt", "cardioReadAt")) {
                    val value = movement.optLong(key, 0L)
                    edit.putLong("movement.$key", if (value in 1..System.currentTimeMillis()) value else 0L)
                }
                edit.putBoolean("movement.partial", movement.optBoolean("partial", true))
            }
            edit.apply()
            updateAll(context)
        }

        // Legacy test entry point, also preserves the previous combined-widget default.
        private fun buildViews(context: Context, options: Bundle): RemoteViews =
            buildViewsForSize(context, 0, WidgetOptions(WidgetMode.COMBINED),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 300))

        internal fun buildViewsForSize(context: Context, id: Int, settings: WidgetOptions, height: Int): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_dashboard)
            val widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            val workoutPrefs = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
            val combined = settings.mode == WidgetMode.COMBINED
            val training = combined || settings.mode == WidgetMode.WORKOUT
            val food = combined || settings.mode == WidgetMode.NUTRITION
            val movement = combined || settings.mode == WidgetMode.MOVEMENT
            val usableHeight = (height / max(1f, context.resources.configuration.fontScale)).toInt()
            val compact = settings.compact || usableHeight < if (combined) 460 else 270
            fun visible(view: Int, show: Boolean) = views.setViewVisibility(view, if (show) View.VISIBLE else View.GONE)
            visible(R.id.widgetTrainingSection, training && (!combined || usableHeight >= 280)); visible(R.id.widgetNutritionSection, food)
            visible(R.id.widgetMovementSection, movement && (!combined || usableHeight >= 280)); visible(R.id.widgetButton, training)
            visible(R.id.widgetMealButton, food); visible(R.id.widgetMovementButton, movement)
            visible(R.id.widgetTrainingStats, !compact); visible(R.id.widgetProgress, !compact)
            visible(R.id.widgetSubtitle, !combined || !compact)
            visible(R.id.widgetMacros, settings.showMacros && usableHeight >= 155)
            visible(R.id.widgetMovementGoals, !compact)
            visible(R.id.widgetMovementWeek, usableHeight >= if (combined) 380 else 220)
            visible(R.id.widgetMovementRead, !combined || usableHeight >= 380)
            val active = workoutPrefs.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false)
            val name = if (active) workoutPrefs.getString(WorkoutForegroundService.KEY_NAME, "Treino") ?: "Treino"
                else widgetPrefs.getString("nextWorkout", "Treino") ?: "Treino"
            val done = workoutPrefs.getInt(WorkoutForegroundService.KEY_DONE, 0)
            val total = workoutPrefs.getInt(WorkoutForegroundService.KEY_TOTAL, 0)
            val weeklyDone = max(0, widgetPrefs.getInt("weeklyDone", 0))
            val weeklyTarget = max(1, widgetPrefs.getInt("weeklyTarget", 4))
            val started = workoutPrefs.getLong(WorkoutForegroundService.KEY_STARTED, 0L)
            val minutes = if (active && started > 0L) max(0L, (System.currentTimeMillis() - started) / 60_000L) else 0L
            val progress = if (active && total > 0) (done * 100 / total).coerceIn(0, 100)
                else (weeklyDone * 100 / weeklyTarget).coerceIn(0, 100)
            views.setTextViewText(R.id.widgetTitle, if (combined && usableHeight < 280) "Combinado · amplie" else if (combined && usableHeight < 380) "Combinado · salvos" else settings.mode.title)
            views.setTextViewText(R.id.widgetStatusChip, if (training && active) "EM TREINO" else "HOJE")
            views.setTextViewText(R.id.widgetWorkout, name)
            views.setTextViewText(R.id.widgetSubtitle, if (active)
                workoutPrefs.getString(WorkoutForegroundService.KEY_EXERCISE, "").orEmpty().ifBlank { "Sessão ativa" }
                else "Próximo treino · meta semanal")
            views.setProgressBar(R.id.widgetProgress, 100, progress, false)
            views.setTextViewText(R.id.widgetStatLeftValue, if (active) "$done/$total" else "$weeklyDone/$weeklyTarget")
            views.setTextViewText(R.id.widgetStatLeftLabel, if (active) "séries concluídas" else "treinos na semana")
            views.setTextViewText(R.id.widgetStatRightValue, if (active) "${minutes}m" else widgetPrefs.getInt("streak", 0).toString())
            views.setTextViewText(R.id.widgetStatRightLabel, if (active) "de treino" else "dias seguidos")
            views.setTextViewText(R.id.widgetButton, if (active) "ABRIR TREINO" else "INICIAR TREINO")
            views.setTextViewText(R.id.widgetMealButton, if (combined) "+ REFEIÇÃO" else "+ ADICIONAR REFEIÇÃO")
            views.setTextViewText(R.id.widgetMovementButton, if (combined) "MOVIMENTO" else "VER CARDIO E PASSOS")

            val today = LocalDate.now()
            fun number(key: String, valid: Boolean = true): Float? {
                val v = widgetPrefs.getFloat(key, -1f)
                return if (valid && v.isFinite() && v >= 0) v else null
            }
            fun format(value: Float?) = value?.let { String.format(Locale.forLanguageTag("pt-BR"), "%.0f", it) } ?: "—"
            val foodToday = widgetPrefs.getString("nutritionDate", "") == today.toString()
            fun foodAmount(key: String) = number(key, foodToday) ?: 0f
            val kcal = foodAmount("nutritionKcal")
            val goal = number("nutritionGoalKcal") ?: 0f
            views.setTextViewText(R.id.widgetNutritionKcal, if (goal > 0f) "${format(kcal)} / ${format(goal)} kcal" else "${format(kcal)} kcal consumidas")
            views.setTextViewText(R.id.widgetNutritionProtein, "P ${format(foodAmount("nutritionProtein"))} g")
            views.setTextViewText(R.id.widgetNutritionCarbs, "C ${format(foodAmount("nutritionCarbs"))} g")
            views.setTextViewText(R.id.widgetNutritionFat, "G ${format(foodAmount("nutritionFat"))} g")
            visible(R.id.widgetNutritionProgress, !compact && goal > 0)
            views.setProgressBar(R.id.widgetNutritionProgress, 100, if (goal > 0) (kcal * 100 / goal).toInt().coerceIn(0, 100) else 0, false)

            val zone = widgetPrefs.getString("movement.zoneId", "").orEmpty()
            val sameZone = zone.isBlank() || zone == ZoneId.systemDefault().id
            val sameDay = sameZone && widgetPrefs.getString("movement.date", "") == today.toString()
            val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            val sameWeek = sameZone && widgetPrefs.getString("movement.weekStart", "") == monday.toString()
                && widgetPrefs.getString("movement.weekEnd", "") == monday.plusDays(6).toString()
            val steps = number("movement.steps", sameDay); val stepGoal = number("movement.stepsGoal")
            val cardioMinutes = number("movement.minutes", sameWeek); val sessions = number("movement.sessions", sameWeek)
            views.setTextViewText(R.id.widgetSteps, if (stepGoal != null && stepGoal > 0) "${format(steps)} / ${format(stepGoal)} passos" else "${format(steps)} passos")
            visible(R.id.widgetStepsProgress, !compact && stepGoal != null && stepGoal > 0 && steps != null)
            views.setProgressBar(R.id.widgetStepsProgress, 100, if (stepGoal != null && stepGoal > 0 && steps != null) (steps * 100 / stepGoal).toInt().coerceIn(0, 100) else 0, false)
            val partial = widgetPrefs.getBoolean("movement.partial", true)
            views.setTextViewText(R.id.widgetMovementWeek, "${format(cardioMinutes)} min · ${format(sessions)} sessões na semana" + if (partial || !sameWeek) " · parcial" else "")
            val minuteGoal = number("movement.minutesGoal"); val sessionGoal = number("movement.sessionsGoal")
            views.setTextViewText(R.id.widgetMovementGoals, listOfNotNull(
                minuteGoal?.takeIf { it > 0 }?.let { "Meta: ${format(it)} min" },
                sessionGoal?.takeIf { it > 0 }?.let { "${format(it)} sessões" }).joinToString(" · "))
            val stamp = DateTimeFormatter.ofPattern("dd/MM HH:mm", Locale.forLanguageTag("pt-BR"))
            fun reading(key: String, valid: Boolean): String {
                val time = widgetPrefs.getLong("movement.$key", 0L)
                return if (valid && time > 0L) Instant.ofEpochMilli(time).atZone(ZoneId.systemDefault()).format(stamp) else "sem leitura"
            }
            val denied = listOf("stepsState", "cardioState").any { widgetPrefs.getString("movement.$it", "") == "denied" }
            val stepsRead = "Salvos · passos ${reading("stepsReadAt", steps != null)}"
            val readLabel = if (usableHeight < 220) stepsRead else stepsRead + "\nCardio ${reading("cardioReadAt", cardioMinutes != null)}"
            views.setTextViewText(R.id.widgetMovementRead, readLabel + if (denied) " · confira permissões" else "")
            fun open(tab: String) = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("openTab", tab)
            }
            fun pending(kind: String, intent: Intent): PendingIntent {
                intent.data = Uri.parse("treinoapp-widget://$id/$kind")
                return PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            }
            views.setOnClickPendingIntent(R.id.widgetButton, pending("train", open("treinar").apply { if (!active) putExtra("startNextWorkout", true) }))
            views.setOnClickPendingIntent(R.id.widgetMealButton, pending("meal", open("nutricao").apply { putExtra("addMeal", true) }))
            val move = open("progresso").apply { putExtra("openActivity", true) }
            views.setOnClickPendingIntent(R.id.widgetMovementButton, pending("movement", move))
            val tab = when (settings.mode) { WidgetMode.NUTRITION -> "nutricao"; WidgetMode.WORKOUT -> "treinar"; WidgetMode.MOVEMENT -> "progresso"; else -> "dashboard" }
            views.setOnClickPendingIntent(R.id.widgetRoot, pending("open", open(tab).apply { if (settings.mode == WidgetMode.MOVEMENT) putExtra("openActivity", true) }))
            views.setOnClickPendingIntent(R.id.widgetConfigure, pending("configure",
                Intent(context, WidgetConfigActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)))
            return views
        }
    }
}
class TreinoNutritionWidgetProvider : TreinoAppWidgetProvider()
class TreinoWorkoutWidgetProvider : TreinoAppWidgetProvider()
class TreinoMovementWidgetProvider : TreinoAppWidgetProvider()
