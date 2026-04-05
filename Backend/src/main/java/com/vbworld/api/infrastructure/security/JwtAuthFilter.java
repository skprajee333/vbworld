package com.vbworld.api.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        final String token = extractToken(request);

        try {

            if (token != null) {

                if (!jwtUtil.isTokenValid(token) || !jwtUtil.isAccessToken(token)) {
                    throw new RuntimeException("Invalid or expired token");
                }

                Claims claims = jwtUtil.extractClaims(token);
                String email = claims.get("email", String.class);

                var userDetails = userDetailsService.loadUserByUsername(email);

                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

                auth.setDetails(AuthSessionDetails.builder()
                    .actorUserId(extractUuid(claims, "actorUserId"))
                    .actorRole(claims.get("actorRole", String.class))
                    .actorName(claims.get("actorName", String.class))
                    .impersonated(Boolean.TRUE.equals(claims.get("impersonated", Boolean.class)))
                    .build());

                SecurityContextHolder.getContext().setAuthentication(auth);
            }

        } catch (Exception e) {
            log.warn("❌ JWT error: {}", e.getMessage());

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("""
                {
                  "success": false,
                  "message": "Unauthorized or session expired"
                }
            """);

            return;
        }

        filterChain.doFilter(request, response);
    }


    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }

    private UUID extractUuid(Claims claims, String key) {
        String value = claims.get(key, String.class);
        return (value == null || value.isBlank()) ? null : UUID.fromString(value);
    }
}
