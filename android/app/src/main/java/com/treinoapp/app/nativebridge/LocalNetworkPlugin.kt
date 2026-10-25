package com.treinoapp.app.nativebridge

import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

@CapacitorPlugin(name = "LocalNetwork", permissions = [Permission(strings = ["android.permission.ACCESS_LOCAL_NETWORK"], alias = "lan")])
class LocalNetworkPlugin : Plugin() {
    private val prefs get() = context.getSharedPreferences("treino_local_pc", 0)
    private fun saved(): JSONObject? = prefs.getString("connection", null)?.let { JSONObject(it) }
    private fun validate(config: JSONObject) {
        val host = config.optString("host")
        val parts = host.split('.').map { it.toIntOrNull() ?: -1 }
        require(parts.size == 4 && parts.all { it in 0..255 } && host.matches(Regex("[0-9]+(\\.[0-9]+){3}"))) { "Endereço local inválido." }
        require(host == parts.joinToString(".")) { "Use o endereço IPv4 sem zeros à esquerda." }
        require(parts[0] == 10 || parts[0] == 192 && parts[1] == 168 || parts[0] == 172 && parts[1] in 16..31) { "Use o endereço da rede local do PC." }
        require(config.optInt("port") == 43128) { "Porta de sincronização inválida." }
        require(config.optString("fingerprint").matches(Regex("[a-fA-F0-9]{64}"))) { "Certificado do PC inválido." }
    }
    private fun request(config: JSONObject, path: String, payload: String): JSONObject {
        validate(config)
        val pin = config.getString("fingerprint").lowercase()
        fun matches(cert: X509Certificate): Boolean = MessageDigest.getInstance("SHA-256").digest(cert.encoded).joinToString("") { "%02x".format(it.toInt() and 255) } == pin
        val trust = object : X509TrustManager {
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
            override fun checkClientTrusted(chain: Array<X509Certificate>, type: String) { throw java.security.cert.CertificateException("Cliente não suportado") }
            override fun checkServerTrusted(chain: Array<X509Certificate>, type: String) {
                if (chain.isEmpty() || !matches(chain[0])) throw java.security.cert.CertificateException("O certificado não corresponde ao PC pareado.")
                chain[0].checkValidity()
            }
        }
        val ssl = SSLContext.getInstance("TLS").apply { init(null, arrayOf<TrustManager>(trust), SecureRandom()) }
        val connection = URL("https://${config.getString("host")}:43128$path").openConnection() as HttpsURLConnection
        try {
            connection.sslSocketFactory = ssl.socketFactory
            connection.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, session -> try { matches(session.peerCertificates[0] as X509Certificate) } catch (_: Exception) { false } }
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 8000
            connection.readTimeout = 45000
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            if (config.has("token")) connection.setRequestProperty("Authorization", "Bearer " + config.getString("token"))
            val bytes = payload.toByteArray(Charsets.UTF_8)
            require(bytes.size <= 64 * 1024 * 1024) { "Dados acima do limite de sincronização." }
            connection.setFixedLengthStreamingMode(bytes.size)
            connection.outputStream.use { it.write(bytes) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val output = java.io.ByteArrayOutputStream()
            stream?.use { input ->
                val buffer = ByteArray(16384)
                while (true) { val size = input.read(buffer); if (size < 0) break; require(output.size() + size <= 64 * 1024 * 1024) { "Resposta acima do limite." }; output.write(buffer, 0, size) }
            }
            val result = JSONObject(output.toString("UTF-8").ifBlank { "{}" })
            require(status in 200..299) { result.optString("error", "Falha de conexão com o PC ($status).") }
            return result
        } finally { connection.disconnect() }
    }
    @PluginMethod fun status(call: PluginCall) {
        val config = saved()
        call.resolve(JSObject().apply { put("connected", config != null); put("host", config?.optString("host")); put("serverId", config?.optString("serverId")); put("name", config?.optString("name")) })
    }
    @PluginMethod fun forget(call: PluginCall) { prefs.edit().remove("connection").apply(); call.resolve() }
    @PluginMethod fun pair(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 37 && getPermissionState("lan") != PermissionState.GRANTED) { requestPermissionForAlias("lan", call, "lanPermissionResult"); return }
        CoroutineScope(Dispatchers.IO).launch { try {
            val config = JSONObject(call.getString("code") ?: error("Leia o QR Code exibido no PC."))
            require(config.optString("app") == "TreinoAppPC" && config.optInt("protocol") == 1) { "QR Code não pertence ao TreinoApp PC." }
            val result = request(config, "/api/pair", JSONObject().put("secret", config.getString("secret")).put("name", Build.MODEL).toString())
            config.remove("secret"); config.put("token", result.getString("token")); config.put("serverId", result.getString("serverId")); config.put("name", result.optString("name", "Meu PC"))
            check(prefs.edit().putString("connection", config.toString()).commit()) { "Não foi possível guardar o pareamento." }
            call.resolve(JSObject().apply { put("connected", true); put("serverId", config.getString("serverId")); put("name", config.getString("name")) })
        } catch (error: Exception) { call.reject(error.message ?: "Não foi possível parear com o PC.", error) } }
    }
    @PermissionCallback private fun lanPermissionResult(call: PluginCall) { if (getPermissionState("lan") == PermissionState.GRANTED) pair(call) else call.reject("Autorize o acesso à rede local para parear o PC.") }
    @PluginMethod fun exchange(call: PluginCall) {
        CoroutineScope(Dispatchers.IO).launch { try {
            val config = saved() ?: error("Conecte seu PC nas configurações.")
            val result = request(config, "/api/sync", call.getString("payload") ?: error("Dados ausentes."))
            if (result.has("serverId")) require(result.getString("serverId") == config.getString("serverId")) { "Identidade do PC alterada. Faça novo pareamento." }
            call.resolve(JSObject().apply { put("data", result.toString()) })
        } catch (error: Exception) { call.reject(error.message ?: "PC indisponível na rede local.", error) } }
    }
}
