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
import android.util.TypedValue
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
import java.text.NumberFormat
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
        private val nutritionLock = Any()
        fun updateAll(context: Context) { WidgetConfiguration.installed(context).forEach { updateOne(context, it) } }

        fun updateOne(context: Context, id: Int) {
            val manager = AppWidgetManager.getInstance(context)
            val provider = manager.getAppWidgetInfo(id)?.provider ?: return
            if (provider.className !in WidgetConfiguration.providers.map { it.name }) return
            val settings = WidgetConfiguration.load(context, id, WidgetConfiguration.defaultMode(provider.className))
            val options = manager.getAppWidgetOptions(id)
            val views = if (Build.VERSION.SDK_INT >= 31) {
                val heights = when (settings.mode) {
                    WidgetMode.COMBINED -> listOf(184, 240, 320)
                    else -> listOf(156, 240, 320)
                }
                RemoteViews(listOf(170, 225, 275).flatMap { width -> heights.map { height ->
                    SizeF(width.toFloat(), height.toFloat()) to buildViewsForSize(context, id, settings, height, width)
                } }.toMap())
            } else buildViewsForSize(context, id, settings,
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 300),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 270))
            manager.updateAppWidget(id, views)
        }

        suspend fun refreshNutrition(context: Context) {
            runCatching {
                val dao = TreinoDatabase.get(context).workoutDao()
                val date = LocalDate.now().toString()
                val entries = dao.nutritionEntriesForDate(date)
                val goal = dao.nutritionGoal()
                val changed = synchronized(nutritionLock) {
                    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
                    val previousDate = prefs.getString("nutritionDate", "").orEmpty()
                    val webDate = prefs.getString("nutritionWebDate", "").orEmpty()
                    if (webDate == date || entries.isEmpty()) return@synchronized false
                    val edit = prefs.edit().putString("nutritionDate", date)
                        .putFloat("nutritionKcal", entries.sumOf { it.kcal }.toFloat())
                        .putFloat("nutritionProtein", entries.sumOf { it.protein }.toFloat())
                        .putFloat("nutritionCarbs", entries.sumOf { it.carbs }.toFloat())
                        .putFloat("nutritionFat", entries.sumOf { it.fat }.toFloat())
                    // Uma meta copiada da Web pertence ao perfil da data em que foi calculada.
                    if (webDate.isBlank()) {
                        edit.putFloat("nutritionGoalKcal", (goal?.kcal ?: 0.0).toFloat())
                            .putFloat("nutritionGoalProtein", (goal?.protein ?: 0.0).toFloat())
                            .putFloat("nutritionGoalCarbs", (goal?.carbs ?: 0.0).toFloat())
                            .putFloat("nutritionGoalFat", (goal?.fat ?: 0.0).toFloat())
                            .putString("nutritionGoalDate", date)
                    } else if (previousDate != date && !prefs.contains("nutritionGoalDate")) {
                        edit.putString("nutritionGoalDate", webDate)
                    }
                    edit.apply()
                    true
                }
                if (changed) updateAll(context)
            }
        }

        fun saveState(context: Context, nextWorkout: String, weeklyDone: Int, weeklyTarget: Int, streak: Int,
            nutritionDate: String, kcal: Float, protein: Float, carbs: Float, fat: Float, goalKcal: Float,
            movement: JSONObject? = null,
            goalProtein: Float = 0f, goalCarbs: Float = 0f, goalFat: Float = 0f,
            nutritionProfile: String = "",
            hasWorkoutSuggestion: Boolean = nextWorkout.isNotBlank() && nextWorkout != "Treino",
            workoutDraftName: String = "",
            workoutDraftUntil: Long = 0L,
            waterMl: Int? = null,
            waterGoalMl: Int = 0,
        ) {
            val edit = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit()
                .putString("nextWorkout", nextWorkout).putInt("weeklyDone", weeklyDone)
                .putInt("weeklyTarget", weeklyTarget).putInt("streak", streak)
                .putString("nutritionDate", nutritionDate).putFloat("nutritionKcal", kcal)
                .putFloat("nutritionProtein", protein).putFloat("nutritionCarbs", carbs)
                .putFloat("nutritionFat", fat).putFloat("nutritionGoalKcal", goalKcal)
                .putFloat("nutritionGoalProtein", goalProtein).putFloat("nutritionGoalCarbs", goalCarbs)
                .putFloat("nutritionGoalFat", goalFat)
                .putString("nutritionGoalDate", nutritionDate)
                .putBoolean("hasWorkoutSuggestion", hasWorkoutSuggestion)
                .putString("workoutDraftName", workoutDraftName.take(120))
                .putLong("workoutDraftUntil", workoutDraftUntil)
            if (waterMl != null) {
                edit.putString("waterDate", nutritionDate)
                    .putInt("waterMl", waterMl.coerceAtLeast(0))
                    .putInt("waterGoalMl", waterGoalMl.coerceAtLeast(0))
            }
            if (nutritionProfile in setOf("standard", "training", "rest")) {
                edit.putString("nutritionProfile", nutritionProfile).putString("nutritionWebDate", nutritionDate)
            }
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
            synchronized(nutritionLock) { edit.apply() }
            updateAll(context)
        }

        internal fun buildViewsForSize(context: Context, id: Int, settings: WidgetOptions, height: Int, width: Int = 275): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_dashboard)
            val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            val workout = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
            val combined = settings.mode == WidgetMode.COMBINED
            val food = settings.mode == WidgetMode.NUTRITION
            val training = settings.mode == WidgetMode.WORKOUT
            val movement = settings.mode == WidgetMode.MOVEMENT
            val scale = context.resources.configuration.fontScale.coerceAtLeast(1f)
            val contentHeight = (height - 109) / scale
            val narrow = width / scale < 218
            val medium = !settings.compact && (height - 117) / scale >= 111
            val large = !settings.compact && (height - 166) / scale >= 134
            fun dp(value: Int) = (value * context.resources.displayMetrics.density).toInt()
            if (!medium) {
                val pad = dp(8)
                views.setViewPadding(R.id.widgetRoot, pad, pad, pad, pad)
            }
            val summarySize = when {
                large && !narrow -> 17f
                contentHeight >= 60 -> 14f
                else -> 12f
            }
            if (combined) {
                val gap = dp(when { large -> 10; medium -> 7; contentHeight >= 60 -> 2; else -> 0 })
                for (section in listOf(R.id.widgetNutritionSection, R.id.widgetTrainingSection, R.id.widgetMovementSection))
                    views.setViewPadding(section, 0, gap, 0, gap)
            }
            val today = LocalDate.now()
            val locale = Locale.forLanguageTag("pt-BR")
            val dateFormat = DateTimeFormatter.ofPattern("dd/MM", locale)
            val whole = NumberFormat.getIntegerInstance(locale)
            val precise = NumberFormat.getNumberInstance(locale).apply { maximumFractionDigits = 1 }
            fun count(value: Number?) = value?.let { whole.format(it) } ?: "—"
            fun grams(value: Float?) = value?.let { precise.format(it.toDouble()) } ?: "—"
            fun number(key: String) = prefs.getFloat(key, -1f).takeIf { it.isFinite() && it >= 0f }
            fun progress(value: Float?, target: Float?, maximum: Int) =
                if (value != null && target != null && target > 0) (value.toDouble() / target * maximum).coerceIn(0.0, maximum.toDouble()).toInt() else 0
            fun visible(view: Int, show: Boolean) = views.setViewVisibility(view, if (show) View.VISIBLE else View.GONE)
            fun text(view: Int, value: CharSequence) = views.setTextViewText(view, value)
            fun size(view: Int, sp: Float) = views.setTextViewTextSize(view, TypedValue.COMPLEX_UNIT_SP, sp)
            fun pending(kind: String, tab: String, extra: String? = null): PendingIntent {
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    data = Uri.parse("treinoapp-widget://$id/$kind")
                    putExtra("openTab", tab)
                    if (extra != null) putExtra(extra, true)
                }
                return PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            }
            val openDiary = pending("diary", "nutricao", "openFoodToday")
            val openText = pending("meal-text", "nutricao", "addMealText")
            val openWater = pending("water", "nutricao", "openWaterToday")
            val openMovement = pending("movement", "progresso", "openActivity")
            val openTraining = pending("train-list", "treinar")

            val now = System.currentTimeMillis()
            val active = workout.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false)
            val paused = active && workout.getBoolean(WorkoutForegroundService.KEY_PAUSED, false)
            val draft = prefs.getString("workoutDraftName", "").orEmpty()
                .takeIf { prefs.getLong("workoutDraftUntil", 0L) > now }.orEmpty()
            val suggested = prefs.getString("nextWorkout", "").orEmpty()
            val canStartSuggested = prefs.getBoolean("hasWorkoutSuggestion", suggested.isNotBlank() && suggested != "Treino")
            val continuing = active || draft.isNotBlank()
            val workoutName = when {
                active -> workout.getString(WorkoutForegroundService.KEY_NAME, "").orEmpty().ifBlank { "Treino em andamento" }
                draft.isNotBlank() -> draft
                canStartSuggested -> suggested
                else -> "Treino em branco"
            }
            val done = workout.getInt(WorkoutForegroundService.KEY_DONE, 0).coerceAtLeast(0)
            val total = workout.getInt(WorkoutForegroundService.KEY_TOTAL, 0).coerceAtLeast(0)
            val weeklyDone = prefs.getInt("weeklyDone", 0).coerceAtLeast(0)
            val weeklyTarget = prefs.getInt("weeklyTarget", 4).coerceAtLeast(1)
            val start = workout.getLong(WorkoutForegroundService.KEY_STARTED, 0L)
            val pauseStart = workout.getLong(WorkoutForegroundService.KEY_PAUSED_AT, now)
            val pausedMs = workout.getLong(WorkoutForegroundService.KEY_PAUSED_TOTAL, 0L) + if (paused) max(0L, now - pauseStart) else 0L
            val minutes = if (active && start > 0L) (now - start - pausedMs).coerceAtLeast(0L) / 60_000L else 0L
            val exercise = workout.getString(WorkoutForegroundService.KEY_EXERCISE, "").orEmpty()
            val trainingAction = when {
                continuing -> "Continuar treino"
                canStartSuggested -> "Iniciar treino"
                else -> "Treino em branco"
            }
            val goTraining = pending("workout", "treinar", when {
                continuing -> "resumeWorkout"
                canStartSuggested -> "startNextWorkout"
                else -> "startBlankWorkout"
            })

            val savedDay = prefs.getString("nutritionDate", "").orEmpty()
            val foodToday = savedDay == today.toString()
            val goalToday = prefs.getString("nutritionGoalDate", savedDay) == today.toString()
            val kcal = number("nutritionKcal").takeIf { foodToday }
            val goal = number("nutritionGoalKcal").takeIf { goalToday && it != null && it > 0 }
            val profile = when (prefs.getString("nutritionProfile", "")) {
                "training" -> "Meta de treino"
                "rest" -> "Meta de descanso"
                else -> "Meta padrão"
            }
            val staleFood = when (savedDay) {
                "" -> "Abra o app para atualizar"
                today.minusDays(1).toString() -> "Dados de ontem"
                else -> runCatching { "Dados de ${LocalDate.parse(savedDay).format(dateFormat)}" }.getOrDefault("Abra o app para atualizar")
            }
            val ring = food && large && !narrow && kcal != null && goal != null
            val energy = when {
                kcal == null -> "— kcal"
                goal != null && !ring -> "${count(kcal)} / ${count(goal)} kcal"
                else -> "${count(kcal)} kcal"
            }
            val balance = when {
                kcal == null -> staleFood
                !goalToday -> "Abra o app para atualizar a meta"
                goal == null -> "Sem meta definida"
                kcal > goal -> "${count(kcal - goal)} kcal acima da meta"
                kcal < goal -> "Restam ${count(goal - kcal)} kcal"
                else -> "Meta de calorias atingida"
            }
            val todayString = today.toString()
            val dateLabel = today.format(dateFormat)
            val waterDate = prefs.getString("waterDate", "").orEmpty()
            val hasWater = food && waterDate.isNotBlank()
            val water = if (waterDate == todayString) prefs.getInt("waterMl", 0).coerceAtLeast(0) else 0
            val waterGoal = prefs.getInt("waterGoalMl", 0).coerceAtLeast(0)
            val waterFormat = NumberFormat.getNumberInstance(locale).apply { maximumFractionDigits = 3 }
            fun waterVolume(ml: Int) = if (ml < 1000) "$ml mL" else "${waterFormat.format(ml / 1000.0)} L"
            val waterTotal = waterVolume(water) + if (waterGoal > 0) " / ${waterVolume(waterGoal)}" else ""
            text(R.id.widgetTitle, if (combined) "Resumo do dia" else settings.mode.title)
            visible(R.id.widgetStatusChip, !narrow)
            text(R.id.widgetStatusChip, if (training && active) if (paused) "Pausado" else "Em treino" else dateLabel)
            visible(R.id.widgetNutritionSection, food || combined)
            visible(R.id.widgetTrainingSection, training || combined)
            visible(R.id.widgetMovementSection, movement || combined)
            visible(R.id.widgetFoodActions, food)
            visible(R.id.widgetTextMealButton, food)
            visible(R.id.widgetMealButton, food && medium)
            visible(R.id.widgetReadyActions, food && large)
            visible(R.id.widgetOtherActions, training || movement)
            visible(R.id.widgetButton, training)
            visible(R.id.widgetBlankButton, training && !continuing && canStartSuggested)
            visible(R.id.widgetMovementButton, movement)
            visible(R.id.widgetCombinedActions, combined)

            if (food || combined) {
                text(R.id.widgetNutritionKcal, if (combined) "Alimentação · ${count(kcal)} kcal" else energy)
                if (combined) {
                    size(R.id.widgetNutritionKcal, summarySize)
                    if (kcal == null) views.setContentDescription(R.id.widgetNutritionKcal, "Alimentação. $staleFood")
                }
                else if (narrow || contentHeight < 52) size(R.id.widgetNutritionKcal, 18f)
                else if (!medium) size(R.id.widgetNutritionKcal, 22f)
                text(R.id.widgetNutritionBalance, if (hasWater && !large) "Água · $waterTotal" else balance)
                if (contentHeight < 52) size(R.id.widgetNutritionBalance, 10f)
                text(R.id.widgetNutritionGoal, if (ring) "$profile · ${count(goal)} kcal" else profile)
                visible(R.id.widgetNutritionBalance, food)
                visible(R.id.widgetNutritionGoal, food && medium && goal != null)
                visible(R.id.widgetNutritionProgress, food && medium && !ring && kcal != null && goal != null)
                views.setProgressBar(R.id.widgetNutritionProgress, 1000, progress(kcal, goal, 1000), false)
                visible(R.id.widgetNutritionRingBox, ring)
                visible(R.id.widgetHydration, hasWater && large)
                if (hasWater) {
                    if (large) {
                        text(R.id.widgetHydrationTotal, "Água · $waterTotal")
                        visible(R.id.widgetHydrationProgress, waterGoal > 0)
                        views.setProgressBar(R.id.widgetHydrationProgress, 1000, progress(water.toFloat(), waterGoal.toFloat(), 1000), false)
                        views.setOnClickPendingIntent(R.id.widgetHydration, openWater)
                    } else {
                        views.setTextColor(R.id.widgetNutritionBalance, 0xFF99DDF5.toInt())
                        views.setOnClickPendingIntent(R.id.widgetNutritionBalance, openWater)
                    }
                }
                if (ring && kcal != null && goal != null) {
                    val fraction = kcal.toDouble() / goal
                    text(R.id.widgetNutritionPercent, if (fraction >= 10) "999%+" else "${count(fraction * 100)}%")
                    views.setContentDescription(R.id.widgetNutritionRingBox, "${count(kcal)} de ${count(goal)} quilocalorias")
                    views.setImageViewBitmap(R.id.widgetNutritionRing, WidgetNutritionGraphics.ring(fraction))
                }
                val showMacros = food && medium && settings.showMacros && foodToday
                visible(R.id.widgetMacros, showMacros)
                if (showMacros) {
                    fun showMacro(valueId: Int, labelId: Int, barId: Int, key: String, targetKey: String, label: String, short: String) {
                        val value = number(key)
                        val target = number(targetKey).takeIf { goalToday && it != null && it > 0 }
                        text(labelId, if (narrow) short else label)
                        text(valueId, if (target == null) "${grams(value)} g" else "${grams(value)} / ${grams(target)} g")
                        if (width / scale < 255) size(valueId, 10f)
                        views.setContentDescription(valueId, if (target == null) "$label: ${grams(value)} gramas" else "$label: ${grams(value)} de ${grams(target)} gramas")
                        visible(barId, value != null && target != null)
                        views.setProgressBar(barId, 1000, progress(value, target, 1000), false)
                    }
                    showMacro(R.id.widgetNutritionProtein, R.id.widgetProteinGoal, R.id.widgetProteinProgress, "nutritionProtein", "nutritionGoalProtein", "Proteína", "Prot")
                    showMacro(R.id.widgetNutritionCarbs, R.id.widgetCarbsGoal, R.id.widgetCarbsProgress, "nutritionCarbs", "nutritionGoalCarbs", "Carboidratos", "Carb")
                    showMacro(R.id.widgetNutritionFat, R.id.widgetFatGoal, R.id.widgetFatProgress, "nutritionFat", "nutritionGoalFat", "Gorduras", "Gord")
                }
            }
            if (training || combined) {
                val title = if (active && exercise.isNotBlank() && !combined) exercise else workoutName
                val detail = when {
                    active -> listOfNotNull(if (paused) "Pausado" else null, if (total > 0) "$done/$total séries" else "Adicione exercícios",
                        if (!narrow && medium) "${minutes} min" else null).joinToString(" · ")
                    draft.isNotBlank() -> "Sessão guardada"
                    canStartSuggested -> "Próximo treino · $weeklyDone/$weeklyTarget na semana"
                    else -> "Adicione os exercícios na sessão"
                }
                text(R.id.widgetWorkout, if (combined) "Treino · $title" else title)
                size(R.id.widgetWorkout, if (combined) summarySize else if (medium && !narrow) 24f else 18f)
                if (contentHeight < 54) size(R.id.widgetSubtitle, 10f)
                text(R.id.widgetSubtitle, detail)
                visible(R.id.widgetSubtitle, training)
                val showProgress = training && medium && (!active || total > 0)
                visible(R.id.widgetProgress, showProgress)
                if (showProgress) {
                    val value = if (active) done else weeklyDone
                    val target = if (active) total else weeklyTarget
                    views.setProgressBar(R.id.widgetProgress, 100, progress(value.toFloat(), target.toFloat(), 100), false)
                }
                visible(R.id.widgetTrainingStats, training && large)
                text(R.id.widgetStatLeftValue, if (active && total > 0) "$done/$total" else "$weeklyDone/$weeklyTarget")
                text(R.id.widgetStatLeftLabel, if (active && total > 0) "séries concluídas" else "treinos na semana")
                text(R.id.widgetStatRightValue, if (active) "$minutes min" else count(prefs.getInt("streak", 0)))
                text(R.id.widgetStatRightLabel, if (active) "duração da sessão" else "dias seguidos")
            }
            if (movement || combined) {
                val zone = prefs.getString("movement.zoneId", "").orEmpty()
                val sameZone = zone.isBlank() || zone == ZoneId.systemDefault().id
                val sameDay = sameZone && prefs.getString("movement.date", "") == todayString
                val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                val sameWeek = sameZone && prefs.getString("movement.weekStart", "") == monday.toString() &&
                    prefs.getString("movement.weekEnd", "") == monday.plusDays(6).toString()
                val steps = number("movement.steps").takeIf { sameDay }
                val stepGoal = number("movement.stepsGoal").takeIf { it != null && it > 0 }
                val cardio = number("movement.minutes").takeIf { sameWeek }
                val sessions = number("movement.sessions").takeIf { sameWeek }
                val partial = prefs.getBoolean("movement.partial", true)
                val noPermission = listOf("stepsState", "cardioState").any { prefs.getString("movement.$it", "") == "denied" }
                val stepsLabel = if (steps == null) "Passos · sem leitura" else "${count(steps)} passos"
                text(R.id.widgetSteps, stepsLabel)
                size(R.id.widgetSteps, if (combined) summarySize else if (medium && !narrow) 25f else 18f)
                visible(R.id.widgetStepsProgress, movement && medium && steps != null && stepGoal != null)
                views.setProgressBar(R.id.widgetStepsProgress, 100, progress(steps, stepGoal, 100), false)
                text(R.id.widgetStepsGoal, "Meta de hoje · ${count(stepGoal)} passos")
                visible(R.id.widgetStepsGoal, movement && medium && stepGoal != null)
                val weekly = if (cardio == null && sessions == null) "Cardio da semana · sem leitura"
                    else "${count(cardio)} min · ${count(sessions)} ${if (sessions == 1f) "sessão" else "sessões"}" +
                        if (partial) " · parcial" else " de cardio"
                text(R.id.widgetMovementWeek, weekly)
                if (contentHeight < 54) size(R.id.widgetMovementWeek, 10f)
                visible(R.id.widgetMovementWeek, movement)
                val stamp = DateTimeFormatter.ofPattern(if (narrow) "dd/MM HH:mm" else "dd/MM 'às' HH:mm", locale)
                val recent = listOf("stepsReadAt", "cardioReadAt").map { prefs.getLong("movement.$it", 0L) }.filter { it in 1..now }.maxOrNull()
                val read = when {
                    noPermission -> "Health Connect · revise permissões"
                    recent == null -> "Health Connect · aguardando leitura"
                    else -> "Leitura ${Instant.ofEpochMilli(recent).atZone(ZoneId.systemDefault()).format(stamp)}"
                }
                text(R.id.widgetMovementRead, read)
                visible(R.id.widgetMovementRead, movement && contentHeight >= 65)
                val minutesGoal = number("movement.minutesGoal")?.takeIf { it > 0 }
                text(R.id.widgetMovementGoals, "Meta semanal · ${count(minutesGoal)} min de cardio")
                visible(R.id.widgetMovementGoals, movement && large && minutesGoal != null)
            }

            val compactText = if (food && medium && narrow) "Por texto" else "Refeição por texto"
            text(R.id.widgetTextMealButton, compactText)
            text(R.id.widgetButton, trainingAction)
            text(R.id.widgetMovementButton, "Ver cardio e passos")
            views.setOnClickPendingIntent(R.id.widgetTextMealButton, openText)
            views.setOnClickPendingIntent(R.id.widgetMealButton, pending("meal", "nutricao", "addMeal"))
            views.setOnClickPendingIntent(R.id.widgetReadyMealButton, pending("ready-meal", "nutricao", "openReadyMeals"))
            views.setOnClickPendingIntent(R.id.widgetButton, goTraining)
            views.setOnClickPendingIntent(R.id.widgetBlankButton, pending("blank-workout", "treinar", "startBlankWorkout"))
            views.setOnClickPendingIntent(R.id.widgetMovementButton, openMovement)
            if (combined) {
                val (label, action) = when (settings.primaryAction) {
                    WidgetAction.TEXT_MEAL -> "Refeição por texto" to openText
                    WidgetAction.WORKOUT -> trainingAction to goTraining
                    WidgetAction.MOVEMENT -> "Ver cardio e passos" to openMovement
                }
                text(R.id.widgetCombinedButton, label)
                views.setOnClickPendingIntent(R.id.widgetCombinedButton, action)
                views.setOnClickPendingIntent(R.id.widgetNutritionSection, openDiary)
                views.setOnClickPendingIntent(R.id.widgetTrainingSection, if (continuing) goTraining else openTraining)
                views.setOnClickPendingIntent(R.id.widgetMovementSection, openMovement)
            }
            views.setOnClickPendingIntent(R.id.widgetRoot, when (settings.mode) {
                WidgetMode.COMBINED -> pending("dashboard", "dashboard")
                WidgetMode.NUTRITION -> openDiary
                WidgetMode.WORKOUT -> openTraining
                WidgetMode.MOVEMENT -> openMovement
            })
            val config = Intent(context, WidgetConfigActivity::class.java)
                .setData(Uri.parse("treinoapp-widget://$id/configure"))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            views.setOnClickPendingIntent(R.id.widgetConfigure,
                PendingIntent.getActivity(context, id, config, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            return views
        }
    }
}
class TreinoNutritionWidgetProvider : TreinoAppWidgetProvider()
class TreinoWorkoutWidgetProvider : TreinoAppWidgetProvider()
class TreinoMovementWidgetProvider : TreinoAppWidgetProvider()
