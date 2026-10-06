package com.treinoapp.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.treinoapp.app.R

/** A configuração pertence à instância do launcher, não aos registros do app. */
class WidgetConfigActivity : AppCompatActivity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var managing = false
    private var selected = WidgetOptions(WidgetMode.COMBINED)
    private lateinit var content: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        widgetId = savedInstanceState?.getInt("widgetId") ?: intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        managing = savedInstanceState?.getBoolean("managing") ?: (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID)
        window.statusBarColor = Color.parseColor("#0F1117")
        window.navigationBarColor = Color.parseColor("#0F1117")
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            if (!validId(widgetId)) { finish(); return }
            selected = savedInstanceState?.let { WidgetOptions(WidgetMode.fromKey(it.getString("mode")), it.getBoolean("compact"), it.getBoolean("macros", true)) }
                ?: optionsFor(widgetId)
            showConfiguration()
        } else showManager()
    }

    override fun onSaveInstanceState(out: Bundle) {
        out.putInt("widgetId", widgetId); out.putBoolean("managing", managing)
        out.putString("mode", selected.mode.key); out.putBoolean("compact", selected.compact); out.putBoolean("macros", selected.showMacros)
        super.onSaveInstanceState(out)
    }

    override fun onResume() {
        super.onResume()
        if (::content.isInitialized && managing && widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) showManager()
    }

    private fun validId(id: Int): Boolean {
        val provider = AppWidgetManager.getInstance(this).getAppWidgetInfo(id)?.provider ?: return false
        return WidgetConfiguration.providers.any { it.name == provider.className }
    }
    private fun optionsFor(id: Int) = WidgetConfiguration.load(this, id,
        WidgetConfiguration.defaultMode(AppWidgetManager.getInstance(this).getAppWidgetInfo(id)?.provider?.className))
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun screen(title: String, subtitle: String) {
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(24), dp(20), dp(24))
            setBackgroundColor(Color.parseColor("#0F1117"))
        }
        val scroll = ScrollView(this).apply { isFillViewport = true; addView(content); setBackgroundColor(Color.parseColor("#0F1117")) }
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            content.setPadding(dp(20) + bars.left, dp(24) + bars.top, dp(20) + bars.right, dp(24) + bars.bottom)
            insets
        }
        setContentView(scroll)
        label("TREINOAPP", 12, "#83AEFF")
        label(title, 26, "#FFFFFF")
        label(subtitle, 14, "#AEB8D8")
    }
    private fun label(text: String, size: Int = 14, color: String = "#AEB8D8"): TextView {
        val view = TextView(this).apply { this.text = text; textSize = size.toFloat(); setTextColor(Color.parseColor(color)); setPadding(0, dp(6), 0, dp(8)) }
        content.addView(view); return view
    }
    private fun button(text: String, action: () -> Unit) {
        content.addView(Button(this).apply {
            this.text = text; isAllCaps = false; setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.widget_button_background)
            layoutParams = LinearLayout.LayoutParams(-1, dp(52)).apply { topMargin = dp(10) }
            setOnClickListener { action() }
        })
    }
    private fun showManager() {
        screen("Seus widgets", "Escolha o que quer acompanhar na tela inicial. Cada widget tem sua própria configuração.")
        val ids = WidgetConfiguration.installed(this)
        if (ids.isEmpty()) label("Você ainda não adicionou widgets. Use um dos botões abaixo ou toque e segure a tela inicial → Widgets → TreinoApp.")
        else {
            label("NA TELA INICIAL", 12, "#83AEFF")
            ids.forEachIndexed { index, id ->
                button("${optionsFor(id).mode.title} · widget ${index + 1}") {
                    widgetId = id; selected = optionsFor(id); showConfiguration()
                }
            }
        }
        label("ADICIONAR", 12, "#83AEFF")
        WidgetMode.entries.forEach { mode -> button("+ ${mode.title}") { pin(mode) } }
        label("Movimento usa os últimos dados importados do Health Connect. Abra Cardio e passos no app para atualizar. O relógio envia os dados após a sincronização.")
        button("Voltar ao aplicativo") { finish() }
    }
    private fun pin(mode: WidgetMode) {
        val manager = AppWidgetManager.getInstance(this)
        if (!manager.isRequestPinAppWidgetSupported) {
            Toast.makeText(this, "Adicione pela tela inicial: Widgets → TreinoApp → ${mode.title}", Toast.LENGTH_LONG).show(); return
        }
        val provider = when (mode) {
            WidgetMode.COMBINED -> TreinoAppWidgetProvider::class.java
            WidgetMode.NUTRITION -> TreinoNutritionWidgetProvider::class.java
            WidgetMode.WORKOUT -> TreinoWorkoutWidgetProvider::class.java
            WidgetMode.MOVEMENT -> TreinoMovementWidgetProvider::class.java
        }
        if (!manager.requestPinAppWidget(ComponentName(this, provider), null, null))
            Toast.makeText(this, "Use a lista de Widgets da tela inicial para adicionar.", Toast.LENGTH_LONG).show()
    }
    private fun showConfiguration() {
        screen("Configurar widget", "Escolha as informações deste widget. Os outros widgets continuam com suas próprias opções.")
        val group = RadioGroup(this)
        val choices = mutableMapOf<Int, WidgetMode>()
        WidgetMode.entries.forEach { mode ->
            val button = RadioButton(this).apply {
                id = View.generateViewId(); text = mode.title; textSize = 17f
                setTextColor(Color.WHITE); minHeight = dp(52)
            }
            choices[button.id] = mode; group.addView(button)
            if (mode == selected.mode) group.check(button.id)
        }
        content.addView(group)
        val preview = label("", 15, "#DCE8FF").apply { setPadding(dp(14), dp(14), dp(14), dp(14)); setBackgroundResource(R.drawable.widget_stat_background) }
        val compact = Switch(this).apply { text = "Sempre compacto"; isChecked = selected.compact; setTextColor(Color.WHITE); minHeight = dp(56) }
        val macros = Switch(this).apply { text = "Mostrar proteínas, carboidratos e gorduras"; isChecked = selected.showMacros; setTextColor(Color.WHITE); minHeight = dp(56) }
        content.addView(compact); content.addView(macros)
        fun updatePreview() {
            macros.visibility = if (selected.mode in setOf(WidgetMode.COMBINED, WidgetMode.NUTRITION)) View.VISIBLE else View.GONE
            preview.text = when (selected.mode) {
                WidgetMode.NUTRITION -> "Kcal do dia${if (selected.showMacros) " + macros" else ""}\nAtalho para adicionar refeição de hoje"
                WidgetMode.WORKOUT -> "Próximo treino ou sessão ativa\nAtalho para iniciar ou retomar o treino"
                WidgetMode.MOVEMENT -> "Passos de hoje e cardio da semana\nMetas manuais e horário das leituras salvas"
                WidgetMode.COMBINED -> "Treino, alimentação e movimento\nTrês atalhos na mesma área"
            }
        }
        group.setOnCheckedChangeListener { _, checked -> choices[checked]?.let { selected = selected.copy(mode = it); updatePreview() } }
        compact.setOnCheckedChangeListener { _, checked -> selected = selected.copy(compact = checked) }
        macros.setOnCheckedChangeListener { _, checked -> selected = selected.copy(showMacros = checked); updatePreview() }
        updatePreview()
        label("O modo automático adapta os detalhes ao tamanho. Redimensione o widget na tela inicial para ver mais informações. Toque em ⋮ no widget para editar novamente.")
        button("Salvar widget") {
            if (!validId(widgetId)) { Toast.makeText(this, "Este widget foi removido. Adicione outro na tela inicial.", Toast.LENGTH_LONG).show(); finish(); return@button }
            if (!WidgetConfiguration.save(this, widgetId, selected)) { Toast.makeText(this, "Não foi possível salvar. Tente novamente.", Toast.LENGTH_LONG).show(); return@button }
            TreinoAppWidgetProvider.updateOne(this, widgetId)
            if (managing) { widgetId = AppWidgetManager.INVALID_APPWIDGET_ID; showManager() }
            else { setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)); finish() }
        }
        button("Cancelar") { if (managing) { widgetId = AppWidgetManager.INVALID_APPWIDGET_ID; showManager() } else finish() }
    }
}
