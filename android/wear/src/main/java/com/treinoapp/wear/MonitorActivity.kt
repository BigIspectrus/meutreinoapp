package com.treinoapp.wear

import android.Manifest
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.text.TextUtils
import android.view.Gravity
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.ContextCompat
import androidx.wear.ambient.AmbientLifecycleObserver
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.ExerciseTrackedStatus
import com.treinoapp.watchlink.WorkoutSnapshot
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

class MonitorActivity : ComponentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var refresh: Job? = null
    private var resumed = false
    private var startAfterPermission = false
    private var externalSession: String? = null
    private var ownerCheckedFor: String? = null
    private var ambient: AmbientLifecycleObserver.AmbientDetails? = null
    private var touchStartX = 0f
    private var touchStartY = 0f
    private val spot by lazy { SpotHeart(this, ::render) }
    private val compact get() = resources.configuration.screenHeightDp < 200
    private val mainTextFactor get() = minOf(1f, 1.2f / resources.configuration.fontScale.coerceAtLeast(1f))
    private lateinit var dial: LinearLayout
    private lateinit var ring: RestRing
    private lateinit var phase: TextView
    private lateinit var exercise: TextView
    private lateinit var setLabel: TextView
    private lateinit var clock: TextView
    private lateinit var heart: TextView
    private lateinit var markers: SetMarkers
    private lateinit var details: ScrollView
    private lateinit var detailExercise: TextView
    private lateinit var detailClock: TextView
    private lateinit var avgHr: TextView
    private lateinit var kcal: TextView
    private lateinit var sensorStatus: TextView
    private lateinit var lastHeart: TextView
    private lateinit var connection: TextView
    private lateinit var sensorButton: Button
    private lateinit var shortcutButton: Button
    private lateinit var ambientPanel: LinearLayout
    private lateinit var ambientTime: TextView
    private lateinit var ambientStatus: TextView
    private lateinit var ambientMain: TextView
    private var detailsOpen = false

    private val detailsBack = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = showDetails(false)
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startAfterPermission = savedInstanceState?.getBoolean("startSensors") ?: false
        detailsOpen = savedInstanceState?.getBoolean("details") ?: false
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        ring = RestRing(this, TRACK, MINT)
        root.addView(ring, FrameLayout.LayoutParams(-1, -1))
        createDial(root)
        createDetails(root)
        createAmbient(root)
        setContentView(root)
        onBackPressedDispatcher.addCallback(this, detailsBack)
        lifecycle.addObserver(AmbientLifecycleObserver(this, object : AmbientLifecycleObserver.AmbientLifecycleCallback {
            override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
                ambient = ambientDetails
                spot.stop()
                showPanel()
                render()
            }

            override fun onUpdateAmbient() = render()

            override fun onExitAmbient() {
                ambient = null
                showPanel()
                render()
            }
        }))
        showPanel()
        render()
    }

    private fun createDial(root: FrameLayout) {
        dial = column().apply { setPadding(dp(24), 0, dp(24), 0) }
        root.addView(dial, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER))
        phase = dial.line(10f, BLUE, bold = true, main = true).apply { maxLines = 1 }
        clock = dial.line(if (compact) 37f else 44f, INK, bold = true, main = true, margin = 2).apply {
            typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
            fontFeatureSettings = "tnum"
            maxLines = 1
        }
        exercise = dial.line(if (compact) 14f else 16f, INK, bold = true, main = true, margin = 3).apply {
            maxLines = 2
            ellipsize = TextUtils.TruncateAt.END
        }
        setLabel = dial.line(11f, MUTED, bold = true, main = true, margin = 3).apply { maxLines = 1 }
        markers = SetMarkers(this, MINT, BLUE, MUTED)
        dial.addView(markers, LinearLayout.LayoutParams(-1, dp(10)).apply { topMargin = dp(4) })
        heart = dial.line(if (compact) 14f else 17f, PULSE, bold = true, main = true, margin = 5).apply { maxLines = 1 }
        dial.action("↑ Detalhes", main = true) { showDetails(true) }
    }

    private fun createDetails(root: FrameLayout) {
        val content = column().apply { setPadding(dp(24), dp(18), dp(24), dp(25)) }
        details = ScrollView(this).apply {
            isVerticalScrollBarEnabled = false
            isFocusableInTouchMode = true
            addView(content, -1, -2)
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
        root.addView(details, FrameLayout.LayoutParams(-1, -1))
        content.action("↓ Voltar ao treino") { showDetails(false) }
        detailExercise = content.line(14f, INK, bold = true, margin = 8).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END }
        detailClock = content.line(26f, INK, bold = true, margin = 5).apply { fontFeatureSettings = "tnum" }
        content.line(10f, MUTED).text = "Tempo total"
        val values = LinearLayout(this).apply { gravity = Gravity.CENTER; orientation = LinearLayout.HORIZONTAL }
        content.addView(values, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(11) })
        avgHr = metric(values, "FC média", PULSE)
        kcal = metric(values, "kcal estimadas", MINT)
        sensorStatus = content.line(11f, MUTED, margin = 12)
        lastHeart = content.line(11f, MUTED, margin = 6)
        connection = content.line(11f, BLUE, margin = 6)
        sensorButton = content.action("Medir FC e kcal") { requestSensors() }
        shortcutButton = content.action("Ativar atalho no mostrador") {
            if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), SHORTCUT_ACCESS)
        }
    }

    private fun createAmbient(root: FrameLayout) {
        ambientPanel = column().apply { setPadding(dp(31), 0, dp(31), 0) }
        root.addView(ambientPanel, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER))
        ambientTime = ambientPanel.line(12f, DIM)
        ambientStatus = ambientPanel.line(11f, DIM, bold = true, margin = 8)
        ambientMain = ambientPanel.line(24f, DIM, main = true, margin = 4)
    }

    private fun column() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
    }

    private fun LinearLayout.line(size: Float, color: Int, bold: Boolean = false, main: Boolean = false, margin: Int = 0): TextView {
        val field = TextView(this@MonitorActivity).apply {
            gravity = Gravity.CENTER
            textSize = if (main) size * mainTextFactor else size
            setTextColor(color)
            includeFontPadding = false
            if (bold) typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
        }
        addView(field, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(margin) })
        return field
    }

    private fun LinearLayout.action(label: String, main: Boolean = false, click: () -> Unit): Button {
        val button = Button(this@MonitorActivity).apply {
            text = label
            isAllCaps = false
            textSize = if (main) 10f * mainTextFactor else 11f
            setTextColor(BLUE)
            gravity = Gravity.CENTER
            includeFontPadding = false
            minHeight = dp(if (main) 30 else 44)
            setPadding(dp(8), dp(3), dp(8), dp(3))
            background = GradientDrawable().apply {
                cornerRadius = dp(24).toFloat()
                setColor(if (main) Color.TRANSPARENT else BUTTON)
            }
            setOnClickListener { click() }
        }
        addView(button, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(if (main) 2 else 8) })
        return button
    }

    private fun metric(parent: LinearLayout, caption: String, color: Int): TextView {
        val column = column()
        parent.addView(column, LinearLayout.LayoutParams(0, -2, 1f))
        val value = column.line(20f, color, bold = true)
        column.line(10f, MUTED, margin = 2).text = caption
        return value
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (!detailsOpen && ambient == null) {
            if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                touchStartX = event.x
                touchStartY = event.y
            } else if (event.actionMasked == MotionEvent.ACTION_UP &&
                touchStartY - event.y > dp(44) && touchStartY - event.y > abs(touchStartX - event.x) * 1.4f
            ) {
                val cancelled = MotionEvent.obtain(event).apply { action = MotionEvent.ACTION_CANCEL }
                super.dispatchTouchEvent(cancelled)
                cancelled.recycle()
                showDetails(true)
                return true
            }
        }
        return super.dispatchTouchEvent(event)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        showDetails(false)
    }

    override fun onStart() {
        super.onStart()
        PhoneWorkout.attach(this)
        refresh = scope.launch {
            launch { PhoneWorkout.snapshot.collect { WatchShortcut.update(this@MonitorActivity, it); render() } }
            launch { WatchHealthService.readings.collect { render() } }
            launch { refreshExerciseOwner() }
            while (true) {
                if (ambient == null) render()
                delay(if (ambient == null) 250L else 5_000L)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumed = true
        startHealthIfAuthorized()
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
        outState.putBoolean("startSensors", startAfterPermission)
        outState.putBoolean("details", detailsOpen)
        super.onSaveInstanceState(outState)
    }

    private fun showDetails(show: Boolean) {
        detailsOpen = show
        showPanel()
        if (show && ambient == null) {
            details.scrollTo(0, 0)
            details.requestFocus()
        }
        render()
    }

    private fun showPanel() {
        details.visibility = if (ambient == null && detailsOpen) View.VISIBLE else View.GONE
        dial.visibility = if (ambient == null && !detailsOpen) View.VISIBLE else View.GONE
        ring.visibility = dial.visibility
        ambientPanel.visibility = if (ambient != null) View.VISIBLE else View.GONE
        detailsBack.isEnabled = detailsOpen && ambient == null
    }

    private suspend fun refreshExerciseOwner() {
        while (true) {
            val current = PhoneWorkout.snapshot.value
            val measuring = WatchHealthService.readings.value.mode in setOf(HealthMode.MEASURING, HealthMode.STARTING)
            if (resumed && ambient == null && current?.active == true && current.isFresh(System.currentTimeMillis()) && !measuring) {
                val status = withTimeoutOrNull(3_000L) {
                    runCatching {
                        HealthServices.getClient(this@MonitorActivity).exerciseClient
                            .getCurrentExerciseInfoAsync().await().exerciseTrackedStatus
                    }.getOrNull()
                }
                if (status != null) {
                    ownerCheckedFor = current.sessionId
                    externalSession = if (status == ExerciseTrackedStatus.OTHER_APP_IN_PROGRESS) current.sessionId else null
                }
                render()
            }
            delay(8_000L)
        }
    }

    private fun render() {
        if (!::clock.isInitialized) return
        val now = System.currentTimeMillis()
        val workout = PhoneWorkout.snapshot.value
        val active = workout?.active == true
        val fresh = workout?.isFresh(now) == true
        val paused = workout?.paused == true && active
        val restMs = workout?.restAt(now) ?: 0L
        val resting = fresh && restMs > 0L
        val measured = WatchHealthService.readings.value.takeIf { it.sessionId == workout?.sessionId }
        val measuring = measured?.mode in setOf(HealthMode.MEASURING, HealthMode.STARTING)
        val canRead = hasPermission(heartPermission())
        spot.forSession(workout?.sessionId.orEmpty())
        if (active && fresh && resumed && ambient == null && canRead && !paused && !measuring) spot.start() else spot.stop()
        val elapsed = workout?.let { formatTime(it.elapsedAt(now) / 1_000L) } ?: "—"
        if (ambient != null) {
            renderAmbient(now, workout, restMs)
            return
        }
        val title = workout?.let { it.exercise.ifBlank { it.name } }.orEmpty().ifBlank { "TreinoApp Monitor" }
        val live = (if (measuring) measured?.current else spot.current)?.takeIf { it.isRecent() && active && !paused }
        val average = if (measuring || !active) measured?.average ?: spot.average else spot.average ?: measured?.average
        val external = if (workout != null && ownerCheckedFor == workout.sessionId)
            externalSession == workout.sessionId else measured?.mode == HealthMode.EXTERNAL
        if (!detailsOpen) {
            val phaseLabel = when {
                workout == null -> "AGUARDANDO CELULAR"
                !active -> "TREINO ENCERRADO"
                !fresh -> "RECONECTANDO"
                paused -> "TREINO PAUSADO"
                resting -> "DESCANSO"
                workout.readyAfterRest(now) -> "PRONTO PARA A PRÓXIMA"
                workout.setRunning -> "SÉRIE EM ANDAMENTO"
                workout.setNumber > 0 -> "PRÓXIMA SÉRIE"
                else -> "TREINO EM ANDAMENTO"
            }
            phase.show(phaseLabel)
            phase.setTextColor(if (resting) MINT else BLUE)
            val displayTime = if (resting) formatTime((restMs + 999L) / 1_000L) else elapsed
            clock.show(displayTime)
            clock.textSize = (when {
                displayTime.length > 5 && compact -> 31f
                displayTime.length > 5 -> 36f
                compact -> 37f
                else -> 44f
            }) * mainTextFactor
            clock.setTextColor(if (resting) MINT else INK)
            ring.show(resting, workout?.restFractionAt(now))
            exercise.show(title)
            val position = when {
                workout == null -> ""
                workout.setNumber > 0 && workout.exerciseSets > 0 -> "Série ${workout.setNumber} de ${workout.exerciseSets}"
                workout.setNumber > 0 -> "Série ${workout.setNumber}"
                workout.totalSets > 0 -> "${workout.completedSets}/${workout.totalSets} concluídas"
                else -> ""
            }
            setLabel.show(if (resting && (workout?.setNumber ?: 0) > 0) "Próxima · $position" else position)
            setLabel.visibility = if (position.isBlank()) View.GONE else View.VISIBLE
            markers.show(workout?.exerciseSetStates.orEmpty().takeIf { it.length == workout?.exerciseSets }.orEmpty())
            val heartLabel = when {
                !active -> ""
                !fresh -> relativeAge(workout!!.ageAt(now)).let { "Atualização $it" }
                live != null -> "♥  ${live.bpm.roundToInt()} bpm"
                paused -> ""
                !canRead -> "FC · autorize o sensor"
                external -> "Outro app está medindo"
                spot.unavailable -> "FC indisponível"
                else -> "Aguardando FC"
            }
            heart.show(heartLabel)
            heart.visibility = if (heartLabel.isBlank()) View.GONE else View.VISIBLE
            heart.setTextColor(if (live != null && fresh) PULSE else MUTED)
            return
        }
        detailExercise.show(title)
        detailClock.show(elapsed)
        avgHr.show(average?.roundToInt()?.toString() ?: "—")
        kcal.show(measured?.kcal?.roundToInt()?.toString() ?: "—")
        val state = when {
            workout == null -> "Abra o TreinoApp no celular e inicie um treino."
            !active -> "Inicie outro treino no celular para atualizar."
            !fresh -> "Reconectando ao celular."
            !canRead -> "Autorize o sensor para ver a frequência cardíaca."
            measured?.mode == HealthMode.STARTING -> "Ativando os sensores…"
            measured?.mode == HealthMode.MEASURING -> "Medição pelo TreinoApp. kcal desde a ativação."
            external -> "Outro app está medindo. A FC do Monitor usa leituras com a tela aberta."
            measured?.mode != HealthMode.EXTERNAL && measured?.message?.isNotBlank() == true -> measured.message
            paused -> "Medição pausada junto com o treino."
            spot.unavailable -> "Sensor de FC indisponível no momento."
            else -> "FC média das leituras com a tela aberta."
        }
        sensorStatus.show(state)
        val previousHeart = listOfNotNull(measured?.current, spot.current).maxByOrNull { it.uptimeMs }
        val reading = previousHeart?.let {
            "Última FC · ${it.bpm.roundToInt()} bpm · ${relativeAge(SystemClock.elapsedRealtime() - it.uptimeMs)}"
        }.orEmpty()
        lastHeart.show(reading)
        lastHeart.visibility = if (reading.isBlank()) View.GONE else View.VISIBLE
        connection.show(if (workout == null) "Celular · aguardando" else "Celular · ${relativeAge(workout.ageAt(now))}")
        sensorButton.visibility = if (active && fresh && !paused && !measuring) View.VISIBLE else View.GONE
        sensorButton.show(if (canRead) "Medir FC e kcal" else "Permitir FC")
        shortcutButton.visibility = if (!WatchShortcut.canPost(this)) View.VISIBLE else View.GONE
    }

    private fun renderAmbient(now: Long, workout: WorkoutSnapshot?, restMs: Long) {
        ambientTime.show(LocalTime.now().format(AMBIENT_CLOCK))
        val fresh = workout?.isFresh(now) == true
        val label = when {
            workout == null -> "AGUARDANDO TREINO"
            !workout.active -> "TREINO ENCERRADO"
            !fresh -> "RECONECTANDO"
            workout.paused -> "PAUSADO"
            restMs > 0 -> "DESCANSO"
            workout.readyAfterRest(now) -> "PRÓXIMA SÉRIE"
            else -> "TREINO"
        }
        ambientStatus.show(label)
        val value = when {
            workout == null || !fresh && workout.active -> "—"
            restMs > 0 -> "~ ${(restMs + 59_999L) / 60_000L} min"
            workout.readyAfterRest(now) -> "Série ${workout.setNumber}"
            else -> "${(workout.elapsedAt(now) / 60_000L)} min"
        }
        ambientMain.show(value)
        if (ambient?.burnInProtectionRequired == true) {
            val minute = now / 60_000L
            ambientPanel.translationX = dp((minute % 5L).toInt() - 2).toFloat()
            ambientPanel.translationY = dp(((minute / 2L) % 5L).toInt() - 2).toFloat()
        }
    }

    private fun requestSensors() {
        if (!hasPermission(heartPermission())) {
            requestPermissions(arrayOf(heartPermission()), HEART_ACCESS)
        } else if (!hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)) {
            requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), ACTIVITY_ACCESS)
        } else {
            startAfterPermission = true
            startHealthIfAuthorized()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            ACTIVITY_ACCESS -> {
                startAfterPermission = hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)
                startHealthIfAuthorized()
            }
            SHORTCUT_ACCESS -> if (WatchShortcut.canPost(this)) WatchShortcut.update(this, PhoneWorkout.snapshot.value, force = true)
        }
        render()
    }

    private fun startHealthIfAuthorized() {
        if (!startAfterPermission || !resumed) return
        startAfterPermission = false
        val current = PhoneWorkout.snapshot.value ?: return
        if (!current.active || !current.isFresh(System.currentTimeMillis()) ||
            !hasPermission(heartPermission()) || !hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)
        ) return
        val intent = Intent(this, WatchHealthService::class.java).putExtra(WatchHealthService.SESSION_EXTRA, current.sessionId)
        runCatching { ContextCompat.startForegroundService(this, intent) }.onFailure {
            WatchHealthService.readings.value = WatchReadings(current.sessionId, HealthMode.ERROR,
                message = "Abra o monitor e tente ativar os sensores novamente.")
        }
    }

    private fun TextView.show(value: String) { if (text.toString() != value) text = value }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).roundToInt()

    private fun relativeAge(ms: Long): String = when {
        ms < 3_000L -> "agora"
        ms < 60_000L -> "há ${ms / 1_000L} s"
        ms < 3_600_000L -> "há ${ms / 60_000L} min"
        else -> "há ${ms / 3_600_000L} h"
    }

    private fun formatTime(total: Long): String =
        if (total >= 3_600) String.format(Locale.ROOT, "%d:%02d:%02d", total / 3_600, total / 60 % 60, total % 60)
        else String.format(Locale.ROOT, "%02d:%02d", total / 60, total % 60)

    companion object {
        private const val HEART_ACCESS = 10
        private const val ACTIVITY_ACCESS = 11
        private const val SHORTCUT_ACCESS = 12
        private val AMBIENT_CLOCK = DateTimeFormatter.ofPattern("HH:mm")
        private val INK = Color.rgb(242, 249, 255)
        private val MUTED = Color.rgb(177, 194, 213)
        private val DIM = Color.rgb(155, 155, 155)
        private val BLUE = Color.rgb(163, 213, 255)
        private val PULSE = Color.rgb(255, 173, 154)
        private val MINT = Color.rgb(146, 236, 193)
        private val TRACK = Color.rgb(43, 66, 63)
        private val BUTTON = Color.rgb(26, 44, 61)
    }
}
