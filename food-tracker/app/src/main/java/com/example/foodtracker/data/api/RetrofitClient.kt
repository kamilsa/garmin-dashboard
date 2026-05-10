package com.example.foodtracker.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private var baseUrl: String = "http://100.91.176.36:3001"
    private var retrofit: Retrofit? = null
    private var apiService: FoodApiService? = null

    private fun buildRetrofit(): Retrofit {
        val client = OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
            )
            .build()

        val normalizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

        return Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    fun getService(): FoodApiService {
        return apiService ?: synchronized(this) {
            apiService ?: run {
                retrofit = buildRetrofit()
                apiService = retrofit!!.create(FoodApiService::class.java)
                apiService!!
            }
        }
    }

    fun updateBaseUrl(newUrl: String) {
        if (newUrl != baseUrl) {
            baseUrl = newUrl
            synchronized(this) {
                retrofit = null
                apiService = null
            }
        }
    }

    fun getBaseUrl(): String = baseUrl
}
