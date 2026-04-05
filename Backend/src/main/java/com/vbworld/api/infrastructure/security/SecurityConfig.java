package com.vbworld.api.infrastructure.security;

import com.vbworld.api.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserRepository userRepository;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.docs.public:true}")
    private boolean publicDocs;

    private static final String[] DOCS_URLS = {
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/api-docs/**"
    };

    private static final String[] PUBLIC_URLS = {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/actuator/health",
        "/actuator/health/**",
        "/actuator/info"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(PUBLIC_URLS).permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/branches").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/pos/qr/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/pos/qr/**").permitAll();

                if (publicDocs) {
                    auth.requestMatchers(DOCS_URLS).permitAll();
                } else {
                    auth.requestMatchers(DOCS_URLS).hasRole("ADMIN");
                }

                auth.requestMatchers(HttpMethod.GET, "/actuator/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/warehouse/**")
                    .hasAnyRole("WAREHOUSE_MANAGER", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/suppliers/**")
                    .hasAnyRole("WAREHOUSE_MANAGER", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/recipes/**")
                    .hasAnyRole("WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/purchase-orders/**")
                    .hasAnyRole("WAREHOUSE_MANAGER", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/delivery-routes/**")
                    .hasAnyRole("WAREHOUSE_MANAGER", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/aggregator-orders/**")
                    .hasAnyRole("RESTAURANT_STAFF", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/pos/**")
                    .authenticated()
                    .requestMatchers("/api/governance/notifications/**")
                    .authenticated()
                    .requestMatchers("/api/customers/**")
                    .hasAnyRole("RESTAURANT_STAFF", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/governance/audit/**")
                    .hasAnyRole("WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/transfers/mine")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/transfers/*/receive")
                    .authenticated()
                    .requestMatchers("/api/transfers/**")
                    .hasAnyRole("WAREHOUSE_MANAGER", "WAREHOUSE_ADMIN", "ADMIN")
                    .requestMatchers("/api/users/**")
                    .hasAnyRole("ADMIN", "WAREHOUSE_ADMIN")
                    .requestMatchers("/api/feedback/**")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/items/**")
                    .hasAnyRole("ADMIN", "WAREHOUSE_ADMIN")
                    .requestMatchers(HttpMethod.PATCH, "/api/items/**")
                    .hasAnyRole("ADMIN", "WAREHOUSE_ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/branches/**")
                    .hasAnyRole("ADMIN", "WAREHOUSE_ADMIN")
                    .anyRequest().authenticated();
            })
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return email -> {
            var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

            if (!user.isActive()) {
                throw new UsernameNotFoundException("Account is inactive");
            }
            if (user.getStatus() != com.vbworld.api.infrastructure.entity.UserEntity.Status.APPROVED) {
                throw new UsernameNotFoundException("Account not approved yet");
            }
            return user;
        };
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        var provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService());
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/actuator/**", config);
        return source;
    }
}
