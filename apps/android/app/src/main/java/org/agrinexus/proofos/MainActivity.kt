package org.agrinexus.proofos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val DEV_API_BASE = "http://10.0.2.2:8000"

private val fields = listOf(
    "root_zone_water_mm" to "Root-zone water (mm)",
    "field_capacity_mm" to "Field water capacity (mm)",
    "minimum_water_mm" to "Entered minimum water (mm)",
    "estimated_daily_demand_mm" to "Estimated daily demand (mm)",
    "forecast_rain_mm" to "Forecast rain (mm)",
    "proposed_irrigation_mm" to "Proposed irrigation (mm)",
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { ProofOsHome() } }
    }
}

@Composable
private fun ProofOsHome() {
    val inputs = remember {
        mutableStateMapOf(
            "root_zone_water_mm" to "35",
            "field_capacity_mm" to "60",
            "minimum_water_mm" to "25",
            "estimated_daily_demand_mm" to "7",
            "forecast_rain_mm" to "2",
            "proposed_irrigation_mm" to "10",
        )
    }
    var status by remember { mutableStateOf("Backend not checked") }
    var report by remember { mutableStateOf("Enter data and compare scenarios.") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Spacer(Modifier.height(22.dp))
        Text("AgriNexus ProofOS", style = MaterialTheme.typography.headlineMedium)
        Text("Kotlin / Android — connected to the shared API")
        Text("Prototype only: manually entered, unverified inputs. This is not irrigation advice.")
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Shared backend", style = MaterialTheme.typography.titleMedium)
                Text(status)
                Button(enabled = !busy, onClick = {
                    busy = true
                    scope.launch {
                        status = withContext(Dispatchers.IO) {
                            sendRequest("GET", "/health", null)
                        }
                        busy = false
                    }
                }) { Text("Check API") }
            }
        }
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Illustrative scenario inputs", style = MaterialTheme.typography.titleMedium)
                fields.forEach { (key, label) ->
                    OutlinedTextField(
                        modifier = Modifier.fillMaxWidth(),
                        value = inputs[key] ?: "",
                        onValueChange = { inputs[key] = it },
                        label = { Text(label) },
                        singleLine = true,
                    )
                }
                Button(enabled = !busy, onClick = {
                    val values = JSONObject()
                    var invalid = false
                    fields.forEach { (key, _) ->
                        val raw = inputs[key]?.trim().orEmpty()
                        if (raw.isEmpty()) {
                            values.put(key, if (key == "proposed_irrigation_mm") 10 else JSONObject.NULL)
                        } else {
                            val parsed = raw.toDoubleOrNull()
                            if (parsed == null || !parsed.isFinite()) invalid = true
                            else values.put(key, parsed)
                        }
                    }
                    if (invalid) {
                        report = "Please enter valid numeric values."
                    } else {
                        busy = true
                        scope.launch {
                            report = withContext(Dispatchers.IO) {
                                val rawResponse = sendRequest(
                                    "POST", "/v1/decisions/irrigation", values.toString()
                                )
                                try {
                                    val parsed = JSONObject(rawResponse)
                                    if (parsed.optString("status") == "needs_evidence") {
                                        "Missing evidence: " + parsed.getJSONArray("missing_inputs")
                                            .let { array ->
                                                (0 until array.length()).joinToString(", ") { index ->
                                                    array.getString(index)
                                                }
                                            }
                                    } else if (parsed.optString("status") == "illustrative") {
                                        val scenarios = parsed.getJSONArray("scenarios")
                                        buildString {
                                            appendLine("Illustrative results; NOT irrigation advice.")
                                            for (index in 0 until scenarios.length()) {
                                                val item = scenarios.getJSONObject(index)
                                                appendLine(item.getString("label"))
                                                appendLine("End water: " + item.getDouble("estimated_end_water_mm") + " mm")
                                                appendLine("Deficit: " + item.getDouble("estimated_deficit_to_minimum_mm") + " mm")
                                            }
                                        }
                                    } else rawResponse
                                } catch (_: Exception) { rawResponse }
                            }
                            busy = false
                        }
                    }
                }) { Text(if (busy) "Working…" else "Compare scenarios") }
                Text(report)
            }
        }
    }
}

private fun sendRequest(method: String, path: String, jsonBody: String?): String {
    return try {
        val connection = (URL(DEV_API_BASE + path).openConnection() as HttpURLConnection)
        connection.requestMethod = method
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        if (jsonBody != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.bufferedWriter().use { it.write(jsonBody) }
        }
        try {
            val responseCode = connection.responseCode
            val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
            val body = stream.bufferedReader().use { it.readText() }
            if (responseCode in 200..299) body else "HTTP error $responseCode: $body"
        } finally { connection.disconnect() }
    } catch (exception: Exception) {
        "Backend offline: " + (exception.message ?: "connection failed")
    }
}
