package com.paquetestickers

import com.facebook.react.bridge.*

class StateModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "StateModule"

    @ReactMethod
    fun saveState(stateJson: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("paquestickers_state", 0)
            prefs.edit().putString("state", stateJson).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
