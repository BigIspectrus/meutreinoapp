package com.treinoapp.wear

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.min

internal class RestRing(context: Context, private val trackColor: Int, private val progressColor: Int) : View(context) {
    private val density = resources.displayMetrics.density
    private val bounds = RectF()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3.5f * density
        strokeCap = Paint.Cap.ROUND
    }
    private var fraction: Float? = null
    private var running = false

    init { importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO }

    fun show(active: Boolean, progress: Float?) {
        if (running == active && fraction == progress) return
        running = active
        fraction = progress
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (!running) return
        val radius = min(width, height) / 2f - 6f * density
        if (radius <= 0f) return
        val x = width / 2f
        val y = height / 2f
        bounds.set(x - radius, y - radius, x + radius, y + radius)
        paint.color = trackColor
        canvas.drawOval(bounds, paint)
        val remainder = fraction ?: return
        if (remainder > 0f) {
            paint.color = progressColor
            canvas.drawArc(bounds, -90f, 360f * remainder, false, paint)
        }
    }
}

internal class SetMarkers(
    context: Context,
    private val done: Int,
    private val active: Int,
    private val remaining: Int,
) : View(context) {
    private val density = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { strokeWidth = 1.2f * density }
    private var states = ""

    fun show(value: String) {
        if (states != value) {
            states = value
            val completed = value.count { it == 'd' }
            val skipped = value.count { it == 's' }
            contentDescription = "${value.length} séries no exercício, $completed concluídas, $skipped puladas"
            invalidate()
        }
        visibility = if (value.isEmpty()) GONE else VISIBLE
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (states.isEmpty()) return
        val step = min(14f * density, width.toFloat() / states.length)
        val radius = min(3.3f * density, step * 0.34f)
        val start = width / 2f - step * (states.length - 1) / 2f
        val y = height / 2f
        states.forEachIndexed { index, state ->
            val x = start + index * step
            paint.style = if (state == 'd') Paint.Style.FILL else Paint.Style.STROKE
            paint.color = when (state) {
                'd' -> done
                'a' -> active
                else -> remaining
            }
            canvas.drawCircle(x, y, radius, paint)
            if (state == 's') canvas.drawLine(x - radius, y + radius, x + radius, y - radius, paint)
            if (state == 'a') {
                paint.style = Paint.Style.FILL
                canvas.drawCircle(x, y, radius * 0.42f, paint)
            }
        }
    }
}
