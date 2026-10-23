package com.treinoapp.app.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader

/** Somente o anel é bitmap (192²); números continuam TextViews acessíveis/escaláveis. */
internal object WidgetNutritionGraphics {
    private var lastKey = Int.MIN_VALUE
    private var lastBitmap: Bitmap? = null

    @Synchronized
    fun ring(fraction: Double?): Bitmap {
        val key = if (fraction != null && fraction.isFinite()) (fraction.coerceIn(0.0, 1.0) * 1000).toInt() else -1
        lastBitmap?.takeIf { key == lastKey }?.let { return it }
        val bitmap = Bitmap.createBitmap(192, 192, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val bounds = RectF(18f, 18f, 174f, 174f)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE; strokeWidth = 14f; strokeCap = Paint.Cap.ROUND
            color = Color.parseColor("#2B4057")
        }
        canvas.drawOval(bounds, paint)
        if (key > 0) {
            paint.shader = LinearGradient(25f, 25f, 167f, 167f,
                Color.parseColor("#A9CCFF"), Color.parseColor("#8EDBD2"), Shader.TileMode.CLAMP)
            canvas.drawArc(bounds, -90f, key * .36f, false, paint)
        }
        // Não reciclar a imagem anterior: outro RemoteViews ainda pode referenciá-la.
        lastKey = key; lastBitmap = bitmap
        return bitmap
    }
}
