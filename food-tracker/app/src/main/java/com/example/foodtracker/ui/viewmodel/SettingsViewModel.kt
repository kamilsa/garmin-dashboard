package com.example.foodtracker.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.foodtracker.data.api.RetrofitClient
import com.example.foodtracker.data.repository.SettingsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val settingsRepository = SettingsRepository(application)

    val serverUrl: StateFlow<String> = settingsRepository.serverUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SettingsRepository.DEFAULT_SERVER_URL)

    init {
        viewModelScope.launch {
            settingsRepository.serverUrl.collect { url ->
                RetrofitClient.updateBaseUrl(url)
            }
        }
    }

    fun updateServerUrl(url: String) {
        viewModelScope.launch {
            settingsRepository.setServerUrl(url)
        }
    }
}
