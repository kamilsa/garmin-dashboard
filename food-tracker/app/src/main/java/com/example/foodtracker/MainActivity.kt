package com.example.foodtracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.foodtracker.ui.screens.FoodTrackerScreen
import com.example.foodtracker.ui.theme.FoodTrackerTheme
import com.example.foodtracker.ui.viewmodel.SettingsViewModel

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            FoodTrackerTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val settingsVm: SettingsViewModel = viewModel()
                    val serverUrl by settingsVm.serverUrl.collectAsState()
                    val dailyCalorieGoal by settingsVm.dailyCalorieGoal.collectAsState()

                    FoodTrackerScreen(
                        settingsUrl = serverUrl,
                        dailyCalorieGoal = dailyCalorieGoal,
                        onSettingsUrlChange = { settingsVm.updateServerUrl(it) },
                        onDailyCalorieGoalChange = { settingsVm.updateDailyCalorieGoal(it) }
                    )
                }
            }
        }
    }
}
