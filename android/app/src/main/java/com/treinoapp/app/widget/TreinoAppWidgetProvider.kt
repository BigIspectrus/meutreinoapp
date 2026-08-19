package com.treinoapp.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.treinoapp.app.MainActivity
import com.treinoapp.app.R
import com.treinoapp.app.nativebridge.WorkoutForegroundService
import kotlin.math.max

class TreinoAppWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, buildViews(context)) }
    }

    companion object {
        private const val WIDGET_PREFS = "treino_widget_state"

        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, TreinoAppWidgetProvider::class.java)
            manager.getAppWidgetIds(component).forEach { manager.updateAppWidget(it, buildViews(context)) }
        }

        fun saveState(
            context: Context,
            nextWorkout: String,
            weeklyDone: Int,
            weeklyTarget: Int,
            streak: Int,
        ) {
            context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit()
                .putString("nextWorkout", nextWorkout)
                .putInt("weeklyDone", weeklyDone)
                .putInt("weeklyTarget", weeklyTarget)
                .putInt("streak", streak)
                .apply()
            updateAll(context)
        }

        private fun buildViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_treinoapp)
            val widgetPrefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            val workoutPrefs = context.getSharedPreferences(WorkoutForegroundService.PREFS, Context.MODE_PRIVATE)
            val active = workoutPrefs.getBoolean(WorkoutForegroundService.KEY_ACTIVE, false)
            val name = if (active) workoutPrefs.getString(WorkoutForegroundService.KEY_NAME, "Treino") ?: "Treino"
            else widgetPrefs.getString("nextWorkout", "Treino") ?: "Treino"
            val done = workoutPrefs.getInt(WorkoutForegroundService.KEY_DONE, 0)
            val total = workoutPrefs.getInt(WorkoutForegroundService.KEY_TOTAL, 0)
            val currentExercise = workoutPrefs.getString(WorkoutForegroundService.KEY_EXERCISE, "") ?: ""
            val weeklyDone = widgetPrefs.getInt("weeklyDone", 0)
            val weeklyTarget = max(1, widgetPrefs.getInt("weeklyTarget", 4))
            val streak = widgetPrefs.getInt("streak", 0)
            val started = workoutPrefs.getLong(WorkoutForegroundService.KEY_STARTED, 0L)
            val minutes = if (active && started > 0L) max(0L, (System.currentTimeMillis() - started) / 60_000L) else 0L
            val progress = if (active && total > 0) (done * 100 / total).coerceIn(0, 100)
            else (weeklyDone * 100 / weeklyTarget).coerceIn(0, 100)

            views.setTextViewText(R.id.widgetTitle, if (active) "Treino em andamento" else "Próximo treino")
            views.setTextViewText(R.id.widgetStatusChip, if (active) "EM TREINO" else "PRÓXIMO")
            views.setTextViewText(R.id.widgetWorkout, name)
            views.setTextViewText(
                R.id.widgetSubtitle,
                if (active) (currentExercise.ifBlank { "Sessão ativa" }) else "Meta semanal"
            )
            views.setProgressBar(R.id.widgetProgress, 100, progress, false)

            if (active) {
                views.setTextViewText(R.id.widgetStatLeftValue, "$done/$total")
                views.setTextViewText(R.id.widgetStatLeftLabel, "séries concluídas")
                views.setTextViewText(R.id.widgetStatRightValue, "${minutes}m")
                views.setTextViewText(R.id.widgetStatRightLabel, "de treino")
                views.setTextViewText(R.id.widgetButton, "ABRIR TREINO")
            } else {
                views.setTextViewText(R.id.widgetStatLeftValue, "$weeklyDone/$weeklyTarget")
                views.setTextViewText(R.id.widgetStatLeftLabel, "treinos na semana")
                views.setTextViewText(R.id.widgetStatRightValue, "$streak")
                views.setTextViewText(R.id.widgetStatRightLabel, "dias de streak")
                views.setTextViewText(R.id.widgetButton, "INICIAR TREINO")
            }

            val open = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("openTab", "treinar")
            }
            val action = Intent(open).apply { if (!active) putExtra("startNextWorkout", true) }
            views.setOnClickPendingIntent(
                R.id.widgetButton,
                PendingIntent.getActivity(context, 910, action, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            )
            views.setOnClickPendingIntent(
                R.id.widgetRoot,
                PendingIntent.getActivity(context, 911, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            )
            return views
        }
    }
}
