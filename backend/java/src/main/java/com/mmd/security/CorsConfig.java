package com.mmd.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        String allowed = System.getenv("ALLOWED_ORIGINS");
        if (allowed == null || allowed.isBlank()) {
            // sensible default for local dev
            allowed = "http://localhost:5173";
        }
        registry.addMapping("/api/**")
                .allowedOrigins(allowed.split(","))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
