// ============================================================
// OPENAPI CONFIG
// ============================================================
package com.vbworld.api.infrastructure.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title       = "VB World Supply Chain API",
        version     = "1.0.0",
        description = "Production grade grocery supply chain management for VB World restaurants"
    )
)
@SecurityScheme(
    name   = "bearerAuth",
    type   = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
public class OpenApiConfig {
    // All configuration done via annotations above
}
