package com.treinoapp.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.PermissionController
import com.getcapacitor.BridgeActivity
import com.getcapacitor.PluginCall
import com.treinoapp.app.nativebridge.HealthConnectRepository
import com.treinoapp.app.nativebridge.HealthSyncScheduler
import com.treinoapp.app.nativebridge.TreinoNativePlugin
import com.treinoapp.app.nativebridge.ExternalBackupRepository
import com.treinoapp.app.nativebridge.ExternalBackupScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : BridgeActivity() {
    private var pendingHealthCall: PluginCall? = null
    private var pendingNutritionCall: PluginCall? = null
    private var pendingCoreCall: PluginCall? = null
    private var pendingBackupFolderCall: PluginCall? = null
    private lateinit var healthRepository: HealthConnectRepository

    private val backupFolderLauncher = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        val call = pendingBackupFolderCall
        pendingBackupFolderCall = null
        if (call != null) {
            if (uri == null) call.resolve(com.getcapacitor.JSObject().apply { put("cancelled", true) })
            else CoroutineScope(Dispatchers.IO).launch {
                try {
                    val repository = ExternalBackupRepository(this@MainActivity)
                    repository.setFolder(uri)
                    runOnUiThread { call.resolve(com.getcapacitor.JSObject(repository.status().toString())) }
                } catch (error: Exception) { runOnUiThread { call.reject(error.message ?: "Não foi possível usar esta pasta.") } }
            }
        }
    }

    private val healthPermissionsLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        pendingHealthCall?.let { call ->
            val result = com.getcapacitor.JSObject()
            result.put("granted", granted.containsAll(healthRepository.requiredPermissions))
            result.put("backgroundGranted", androidx.health.connect.client.permission.HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND in granted)
            result.put("grantedCount", granted.size)
            result.put("requiredCount", healthRepository.requestablePermissions().size)
            call.resolve(result)
        }
        pendingHealthCall = null
    }

    private val corePermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val ok = result.values.all { it }
        pendingCoreCall?.resolve(com.getcapacitor.JSObject().apply {
            put("granted", ok)
            put("notifications", Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
            put("activityRecognition", Build.VERSION.SDK_INT < 29 || checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED)
        })
        pendingCoreCall = null
    }

    private val nutritionPermissionsLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        pendingNutritionCall?.resolve(com.getcapacitor.JSObject().apply {
            put("granted", granted.containsAll(healthRepository.nutritionPermissions))
            put("grantedCount", granted.intersect(healthRepository.nutritionPermissions).size)
            put("requiredCount", healthRepository.nutritionPermissions.size)
        })
        pendingNutritionCall = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        healthRepository = HealthConnectRepository(this)
        registerPlugin(TreinoNativePlugin::class.java)
        super.onCreate(savedInstanceState)
        HealthSyncScheduler.ensurePeriodic(this)
        ExternalBackupScheduler.ensure(this)
        routeIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        routeIntent(intent)
    }

    fun requestHealthPermissions(call: PluginCall) {
        if (!healthRepository.isAvailable()) {
            call.resolve(com.getcapacitor.JSObject().apply { put("granted", false); put("available", false) })
            return
        }
        pendingHealthCall = call
        healthPermissionsLauncher.launch(healthRepository.requestablePermissions())
    }

    fun chooseBackupFolder(call: PluginCall) {
        if (pendingBackupFolderCall != null) { call.reject("O seletor de pasta já está aberto."); return }
        pendingBackupFolderCall = call
        backupFolderLauncher.launch(null)
    }

    fun requestNutritionPermissions(call: PluginCall) {
        if (!healthRepository.isAvailable()) {
            call.resolve(com.getcapacitor.JSObject().apply { put("granted", false); put("available", false) })
            return
        }
        pendingNutritionCall = call
        nutritionPermissionsLauncher.launch(healthRepository.nutritionPermissions)
    }

    fun requestCorePermissions(call: PluginCall) {
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permissions += Manifest.permission.POST_NOTIFICATIONS
        }
        if (Build.VERSION.SDK_INT >= 29 && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            permissions += Manifest.permission.ACTIVITY_RECOGNITION
        }
        if (Build.VERSION.SDK_INT <= 28 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            permissions += Manifest.permission.WRITE_EXTERNAL_STORAGE
        }
        if (permissions.isEmpty()) {
            call.resolve(com.getcapacitor.JSObject().apply {
                put("granted", true); put("notifications", true); put("activityRecognition", true)
            })
        } else {
            pendingCoreCall = call
            corePermissionsLauncher.launch(permissions.toTypedArray())
        }
    }

    private fun routeIntent(intent: Intent?) {
        val tab = intent?.getStringExtra("openTab") ?: return
        val startNext = intent.getBooleanExtra("startNextWorkout", false)
        val addMeal = intent.getBooleanExtra("addMeal", false)
        val openActivity = intent.getBooleanExtra("openActivity", false)
        bridge?.webView?.postDelayed({
            val safe = if (tab in setOf("dashboard", "treinar", "nutricao", "historico", "progresso", "config")) tab else "treinar"
            val js = if (addMeal && safe == "nutricao") {
                "(function openMeal(attempt){if(window.abrirRefeicaoWidget){window.abrirRefeicaoWidget();}else if(attempt<40){setTimeout(()=>openMeal(attempt+1),250);}})(0);"
            } else if (openActivity && safe == "progresso") {
                "(function openMovement(attempt){if(window.abrirCardioPassos){window.abrirCardioPassos();}else if(attempt<40){setTimeout(()=>openMovement(attempt+1),250);}})(0);"
            } else if (startNext) {
                "(function openWorkout(attempt){if(window.iniciarTreinoWidget){window.iniciarTreinoWidget();}else if(attempt<40){setTimeout(()=>openWorkout(attempt+1),250);}})(0);"
            } else {
                "window.irParaAba && window.irParaAba('$safe');"
            }
            bridge.webView.evaluateJavascript(js, null)
        }, 350)
    }
}
