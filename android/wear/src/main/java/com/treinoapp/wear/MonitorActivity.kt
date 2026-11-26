package com.treinoapp.wear

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.TextUtils
import android.view.Gravity
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.treinoapp.watchlink.WorkoutSnapshot
import java.util.Locale
import kotlin.math.roundToInt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MonitorActivity : Activity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var refresh: Job? = null
    private var resumed = false
    private var startAfterPermission = false
    private val spot by lazy { SpotHeart(this, ::render) }
    private lateinit var scroll: ScrollView
    private lateinit var phase: TextView
    private lateinit var exercise: TextView
    private lateinit var progress: TextView
    private lateinit var clockLabel: TextView
    private lateinit var clock: TextView
    private lateinit var secondaryClock: TextView
    private lateinit var currentHr: TextView
    private lateinit var avgHr: TextView
    private lateinit var averageLabel: TextView
    private lateinit var kcal: TextView
    private lateinit var details: TextView
    private lateinit var sensorButton: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startAfterPermission = savedInstanceState?.getBoolean("startAfterPermission") ?: false
        val outer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val round = resources.configuration.isScreenRound
            setPadding(dp(if (round) 22 else 12), dp(if (round) 20 else 10), dp(if (round) 22 else 12), dp(20))
        }
        scroll = ScrollView(this).apply {
            isFillViewport = true
            clipToPadding = false
            isVerticalScrollBarEnabled = false
            setBackgroundColor(BG)
            isFocusableInTouchMode = true
            addView(outer, ScrollView.LayoutParams(-1, -2))
            setOnGenericMotionListener { _, event ->
                if (!event.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER) || event.action != MotionEvent.ACTION_SCROLL) {
                    return@setOnGenericMotionListener false
                }
                val amount = (-event.getAxisValue(MotionEvent.AXIS_SCROLL) *
                    ViewConfiguration.get(this@MonitorActivity).scaledVerticalScrollFactor).roundToInt()
                scrollBy(0, amount)
                true
            }
        }
        setContentView(scroll)
        phase = outer.line(10f, BLUE, bold = true).apply { maxLines = 1 }
        exercise = outer.line(16f, INK, bold = true, margin = 4).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END }
        progress = outer.line(11f, MUTED, margin = 2).apply { maxLines = 2 }
        clockLabel = outer.line(10f, MUTED, bold = true, margin = 7)
        clock = outer.line(35f, INK, bold = true).apply {
            typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
            maxLines = 1
        }
        secondaryClock = outer.line(10f, MUTED, margin = 2)
        val metrics = LinearLayout(this).apply { gravity = Gravity.CENTER; orientation = LinearLayout.HORIZONTAL }
        outer.addView(metrics, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(7) })
        currentHr = addMetric(metrics, "FC", HEART).first
        val average = addMetric(metrics, "FC média", BLUE)
        avgHr = average.first
        averageLabel = average.second
        kcal = addMetric(metrics, "kcal", GREEN).first
        details = outer.line(10f, MUTED, margin = 7)
        sensorButton = outer.line(12f, INK, bold = true, margin = 7).apply {
            minHeight = dp(48)
            setPadding(dp(9), dp(5), dp(9), dp(5))
            background = GradientDrawable().apply {
                setColor(Color.rgb(29, 50, 70))
                cornerRadius = dp(25).toFloat()
            }
            setOnClickListener { requestSensors() }
            accessibilityDelegate = object : View.AccessibilityDelegate() {
                override fun onInitializeAccessibilityNodeInfo(host: View, info: android.view.accessibility.AccessibilityNodeInfo) {
                    super.onInitializeAccessibilityNodeInfo(host, info)
                    info.className = "android.widget.Button"
                }
            }
        }
        scroll.requestFocus()
        render()
    }

    private fun LinearLayout.line(size: Float, color: Int, bold: Boolean = false, margin: Int = 0): TextView {
        return TextView(this@MonitorActivity).apply {
            gravity = Gravity.CENTER
            textSize = size
            setTextColor(color)
            includeFontPadding = false
            if (bold) typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            addView(this, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(margin) })
        }
    }

    private fun addMetric(row: LinearLayout, label: String, color: Int): Pair<TextView, TextView> {
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        row.addView(col, LinearLayout.LayoutParams(0, -2, 1f))
        val number = col.line(19f, color, bold = true).apply { maxLines = 1 }
        val caption = col.line(9f, MUTED, margin = 2).apply { text = label; maxLines = 1 }
        return number to caption
    }

    override fun onStart() {
        super.onStart()
        PhoneWorkout.attach(this)
        refresh = scope.launch {
            launch { PhoneWorkout.snapshot.collect { render() } }
            launch { WatchHealthService.readings.collect { render() } }
            while (true) {
                render()
                delay(250)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumed = true
        if (startAfterPermission && hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)) {
            startAfterPermission = false
            startHealthMeasurement()
        }
        render()
    }

    override fun onPause() {
        resumed = false
        spot.stop()
        super.onPause()
    }

    override fun onStop() {
        refresh?.cancel()
        PhoneWorkout.detach()
        super.onStop()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putBoolean("startAfterPermission", startAfterPermission)
        super.onSaveInstanceState(outState)
    }

    private fun render() {
        if (!::clock.isInitialized) return
        val now = System.currentTimeMillis()
        val workout = PhoneWorkout.snapshot.value
        val active = workout?.active == true
        val fresh = workout?.isFresh(now) == true
        val restMs = workout?.restAt(now) ?: 0L
        val resting = fresh && restMs > 0L
        val paused = workout?.paused == true && active
        val measured = WatchHealthService.readings.value.takeIf { it.sessionId == workout?.sessionId }
        val measuring = measured?.mode == HealthMode.MEASURING || measured?.mode == HealthMode.STARTING
        val canRead = hasPermission(heartPermission())
        spot.forSession(workout?.sessionId.orEmpty())
        if (active && fresh && resumed && canRead && !paused && !measuring) spot.start() else spot.stop()
        val status = when {
            workout == null -> "AGUARDANDO CELULAR"
            !active -> "TREINO ENCERRADO"
            !fresh -> "SEM ATUALIZAÇÃO DO CELULAR"
            paused -> "TREINO PAUSADO"
            resting -> "DESCANSO"
            workout.setRunning -> "SÉRIE EM ANDAMENTO"
            workout.setNumber > 0 -> "PRÓXIMA SÉRIE"
            else -> "TREINO EM ANDAMENTO"
        }
        phase.show(status)
        phase.setTextColor(if (resting) GREEN else BLUE)
        exercise.show(workout?.let { it.exercise.ifBlank { it.name } }.orEmpty().ifBlank { "TreinoApp Monitor" })
        val currentSet = when {
            workout == null -> ""
            workout.setNumber > 0 && workout.exerciseSets > 0 -> "Série ${workout.setNumber} de ${workout.exerciseSets}"
            workout.setNumber > 0 -> "Série ${workout.setNumber}"
            else -> ""
        }
        val count = workout?.takeIf { it.totalSets > 0 }?.let { "${it.completedSets}/${it.totalSets} feitas" }.orEmpty()
        val statusDetails = listOf(currentSet, count).filter(String::isNotBlank).joinToString(" · ")
        progress.show(statusDetails)
        progress.visibility = if (statusDetails.isBlank()) View.GONE else View.VISIBLE
        val elapsed = workout?.let { formatTime(it.elapsedAt(now) / 1_000) } ?: "—"
        clockLabel.show(if (resting) "TEMPO RESTANTE" else "TEMPO DE TREINO")
        clock.show(if (resting) formatTime((restMs + 999) / 1_000) else elapsed)
        clock.setTextColor(if (resting) GREEN else INK)
        secondaryClock.visibility = if (resting) View.VISIBLE else View.GONE
        if (resting) secondaryClock.show("Treino $elapsed")
        val live = (if (measuring) measured?.current else spot.current)?.takeIf { it.isRecent() && active && !paused }
        val average = if (measuring || !active) measured?.average ?: spot.average else spot.average ?: measured?.average
        currentHr.show(live?.bpm?.roundToInt()?.toString() ?: "—")
        avgHr.show(average?.roundToInt()?.toString() ?: "—")
        averageLabel.show(if (!measuring && spot.average != null) "FC média¹" else "FC média")
        kcal.show(measured?.kcal?.roundToInt()?.toString() ?: "—")
        val explanation = when {
            workout == null -> "Abra o TreinoApp no celular pareado e inicie um treino."
            active && !fresh -> "Último estado recebido. Aguardando reconexão."
            !active -> "Inicie outro treino no celular para atualizar."
            !canRead -> "Autorize a FC para usar o sensor do relógio."
            measured?.mode == HealthMode.STARTING -> "Ativando os sensores…"
            measured?.mode == HealthMode.MEASURING -> "kcal totais estimadas desde a ativação"
            measured?.message?.isNotBlank() == true -> measured.message
            spot.unavailable -> "Sensor de FC indisponível no momento."
            paused -> "Medição pausada junto com o treino."
            spot.average == null -> "Aguardando leitura de FC."
            else -> "¹ Média das leituras com a tela aberta."
        }
        details.show(explanation)
        sensorButton.visibility = if (active && fresh && !paused && !measuring) View.VISIBLE else View.GONE
        sensorButton.show(if (canRead) "Medir FC e kcal" else "Permitir FC")
    }

    private fun requestSensors() {
        if (!hasPermission(heartPermission())) {
            startAfterPermission = false
            requestPermissions(arrayOf(heartPermission()), PERMISSIONS)
            return
        }
        if (!hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)) {
            startAfterPermission = true
            requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), PERMISSIONS)
            return
        }
        startHealthMeasurement()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != PERMISSIONS) return
        if (!hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)) startAfterPermission = false
        if (startAfterPermission && resumed) {
            startAfterPermission = false
            startHealthMeasurement()
        }
        render()
    }

    private fun startHealthMeasurement() {
        val current = PhoneWorkout.snapshot.value ?: return
        if (!current.active || !current.isFresh(System.currentTimeMillis())) return
        val intent = Intent(this, WatchHealthService::class.java).putExtra(WatchHealthService.SESSION_EXTRA, current.sessionId)
        runCatching { ContextCompat.startForegroundService(this, intent) }.onFailure {
            WatchHealthService.readings.value = WatchReadings(current.sessionId, HealthMode.ERROR,
                message = "Abra o monitor e tente ativar os sensores novamente.")
        }
    }

    private fun TextView.show(value: String) { if (text.toString() != value) text = value }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).roundToInt()

    private fun formatTime(total: Long): String {
        return if (total >= 3_600) String.format(Locale.ROOT, "%d:%02d:%02d", total / 3_600, total / 60 % 60, total % 60)
        else String.format(Locale.ROOT, "%02d:%02d", total / 60, total % 60)
    }

    companion object {
        private const val PERMISSIONS = 10
        private val BG = Color.rgb(10, 16, 24)
        private val INK = Color.rgb(240, 247, 255)
        private val MUTED = Color.rgb(174, 189, 208)
        private val BLUE = Color.rgb(167, 210, 255)
        private val HEART = Color.rgb(255, 165, 155)
        private val GREEN = Color.rgb(135, 231, 191)
    }
}
