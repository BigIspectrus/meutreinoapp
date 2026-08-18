package com.treinoapp.app

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class HealthPermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val density = resources.displayMetrics.density
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((24*density).toInt(), (42*density).toInt(), (24*density).toInt(), (24*density).toInt())
            setBackgroundColor(Color.rgb(15,17,23))
        }
        root.addView(TextView(this).apply {
            text = "TreinoApp e Health Connect"
            textSize = 24f
            setTextColor(Color.WHITE)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        root.addView(TextView(this).apply {
            text = "O TreinoApp usa o Health Connect somente com sua autorização para associar sessões registradas pelo Galaxy Watch/Samsung Health ao treino do aplicativo, consultar frequência cardíaca, calorias e peso e, quando não houver uma sessão equivalente, gravar a sessão de musculação do TreinoApp. Você pode revogar as permissões a qualquer momento nas configurações do Health Connect."
            textSize = 16f
            setTextColor(Color.rgb(190,196,220))
            setPadding(0,(18*density).toInt(),0,0)
            gravity = Gravity.START
        })
        setContentView(root)
    }
}
