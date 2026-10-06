package com.treinoapp.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

enum class WidgetMode(val key: String, val title: String) {
    COMBINED("combined", "Combinado"), NUTRITION("nutrition", "Alimentação"),
    WORKOUT("workout", "Treino"), MOVEMENT("movement", "Movimento");
    companion object { fun fromKey(key: String?) = entries.firstOrNull { it.key == key } ?: COMBINED }
}
data class WidgetOptions(val mode: WidgetMode, val compact: Boolean = false, val showMacros: Boolean = true)

object WidgetConfiguration {
    private const val PREFS = "treino_widget_configuration"
    val providers = listOf(TreinoAppWidgetProvider::class.java, TreinoNutritionWidgetProvider::class.java,
        TreinoWorkoutWidgetProvider::class.java, TreinoMovementWidgetProvider::class.java)
    fun defaultMode(provider: String?) = when (provider) {
        TreinoNutritionWidgetProvider::class.java.name -> WidgetMode.NUTRITION
        TreinoWorkoutWidgetProvider::class.java.name -> WidgetMode.WORKOUT
        TreinoMovementWidgetProvider::class.java.name -> WidgetMode.MOVEMENT
        else -> WidgetMode.COMBINED
    }
    fun load(context: Context, id: Int, default: WidgetMode = WidgetMode.COMBINED): WidgetOptions {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return WidgetOptions(WidgetMode.fromKey(prefs.getString("$id.mode", default.key)),
            prefs.getBoolean("$id.compact", false), prefs.getBoolean("$id.macros", true))
    }
    fun save(context: Context, id: Int, options: WidgetOptions): Boolean {
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return false
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("$id.mode", options.mode.key).putBoolean("$id.compact", options.compact)
            .putBoolean("$id.macros", options.showMacros).commit()
    }
    fun remove(context: Context, ids: IntArray) {
        val edit = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        ids.forEach { edit.remove("$it.mode").remove("$it.compact").remove("$it.macros") }; edit.apply()
    }
    fun installed(context: Context): List<Int> {
        val manager = AppWidgetManager.getInstance(context)
        return providers.flatMap { manager.getAppWidgetIds(ComponentName(context, it)).toList() }
    }
}
