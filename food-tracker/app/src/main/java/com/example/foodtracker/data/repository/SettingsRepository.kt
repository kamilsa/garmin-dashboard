package com.example.foodtracker.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsRepository(private val context: Context) {

    companion object {
        private val KEY_SERVER_URL = stringPreferencesKey("server_url")
        private val KEY_DAILY_CALORIE_GOAL = intPreferencesKey("daily_calorie_goal")
        const val DEFAULT_SERVER_URL = "http://100.91.176.36:3001"
        const val DEFAULT_DAILY_CALORIE_GOAL = 2000
    }

    val serverUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_SERVER_URL] ?: DEFAULT_SERVER_URL
    }

    suspend fun setServerUrl(url: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_SERVER_URL] = url.trimEnd('/')
        }
    }

    val dailyCalorieGoal: Flow<Int> = context.dataStore.data.map { prefs ->
        prefs[KEY_DAILY_CALORIE_GOAL] ?: DEFAULT_DAILY_CALORIE_GOAL
    }

    suspend fun setDailyCalorieGoal(goal: Int) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DAILY_CALORIE_GOAL] = goal.coerceIn(0, 99999)
        }
    }
}
