package com.vbworld.api.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class ProductionConfigValidator {

    private final Environment environment;

    @PostConstruct
    void validate() {
        String jwtSecret = required("app.jwt.secret", "JWT secret");
        if (jwtSecret.contains("change-this")) {
            throw new IllegalStateException("JWT secret still uses the development placeholder. Set JWT_SECRET before starting prod.");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes for production.");
        }

        required("spring.datasource.password", "database password");

        String allowedOrigins = required("app.cors.allowed-origins", "allowed CORS origins");
        if (Arrays.stream(allowedOrigins.split(",")).map(String::trim).noneMatch(origin -> !origin.isBlank())) {
            throw new IllegalStateException("At least one allowed CORS origin is required for production.");
        }

        String cacheType = environment.getProperty("spring.cache.type", "simple");
        if ("redis".equalsIgnoreCase(cacheType)) {
            required("spring.data.redis.host", "Redis host");
        }
    }

    private String required(String key, String label) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required production configuration: " + label + " (" + key + ")");
        }
        return value.trim();
    }
}
