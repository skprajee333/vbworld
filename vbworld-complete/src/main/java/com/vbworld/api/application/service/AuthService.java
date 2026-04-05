package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.UserRepository;
import com.vbworld.api.infrastructure.security.JwtUtil;
import com.vbworld.api.presentation.dto.request.AuthRequest;
import com.vbworld.api.presentation.dto.response.AuthResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authManager;
    private final PasswordEncoder passwordEncoder;
    private final GovernanceService governanceService;

    @Transactional
    public AuthResponse login(AuthRequest.Login request) {
        String email = request.getEmail().toLowerCase();

        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (BadCredentialsException ex) {
            log.warn("Login failed for email={}", email);
            throw new BusinessException("Invalid email or password");
        }

        UserEntity user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BusinessException("User not found"));

        assertActiveApproved(user);

        try {
            userRepository.updateLastLogin(user.getId(), LocalDateTime.now());
        } catch (Exception ex) {
            log.warn("Failed to update last login for {}", email);
        }

        return buildAuthResponse(
            buildUserInfo(user, null),
            generateAccessToken(user),
            jwtUtil.generateRefreshToken(user.getId())
        );
    }

    @Transactional
    public AuthResponse refresh(AuthRequest.Refresh request) {
        String token = request.getRefreshToken();

        if (!jwtUtil.isTokenValid(token)) {
            throw new BusinessException("Invalid or expired refresh token");
        }

        var claims = jwtUtil.extractClaims(token);
        UUID effectiveUserId = UUID.fromString(jwtUtil.extractUserId(token));
        UserEntity effectiveUser = userRepository.findById(effectiveUserId)
            .orElseThrow(() -> new BusinessException("User not found"));

        assertActiveApproved(effectiveUser);

        boolean impersonated = Boolean.TRUE.equals(claims.get("impersonated", Boolean.class));
        if (!impersonated) {
            return buildAuthResponse(
                buildUserInfo(effectiveUser, null),
                generateAccessToken(effectiveUser),
                jwtUtil.generateRefreshToken(effectiveUser.getId())
            );
        }

        String actorUserIdValue = claims.get("actorUserId", String.class);
        if (actorUserIdValue == null || actorUserIdValue.isBlank()) {
            throw new BusinessException("Invalid impersonation refresh token");
        }

        UserEntity actor = userRepository.findById(UUID.fromString(actorUserIdValue))
            .orElseThrow(() -> new BusinessException("Impersonation actor not found"));

        validateImpersonation(actor, effectiveUser);

        return buildAuthResponse(
            buildUserInfo(effectiveUser, actor),
            generateAccessToken(effectiveUser, actor),
            generateRefreshToken(effectiveUser, actor)
        );
    }

    @Transactional
    public void changePassword(UUID userId, AuthRequest.ChangePassword request) {
        if (request.getNewPassword().length() < 8) {
            throw new BusinessException("New password must be at least 8 characters");
        }

        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for user={}", user.getEmail());
    }

    @Transactional
    public AuthResponse impersonate(UserEntity actor, UUID targetUserId) {
        UserEntity target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));

        validateImpersonation(actor, target);

        governanceService.logAction(
            actor,
            "AUTH",
            "IMPERSONATE_START",
            "USER",
            target.getId(),
            actor.getName() + " started impersonating " + target.getName(),
            "actorRole=" + actor.getRole().name() + ", targetRole=" + target.getRole().name()
        );
        governanceService.triggerRuleException(
            "IMPERSONATION_SESSION",
            BigDecimal.ONE,
            actor,
            "AUTH",
            "USER",
            target.getId(),
            "Impersonation session started",
            actor.getName() + " started impersonating " + target.getName(),
            "actorRole=" + actor.getRole().name() + ", targetRole=" + target.getRole().name()
        );

        return buildAuthResponse(
            buildUserInfo(target, actor),
            generateAccessToken(target, actor),
            generateRefreshToken(target, actor)
        );
    }

    private void assertActiveApproved(UserEntity user) {
        if (!user.isActive()) {
            throw new BusinessException("Account is deactivated");
        }
        if (user.getStatus() != UserEntity.Status.APPROVED) {
            throw new BusinessException("User not approved yet");
        }
    }

    private String generateAccessToken(UserEntity user) {
        return jwtUtil.generateAccessToken(
            user.getId(),
            user.getEmail(),
            user.getRole().name(),
            user.getBranch() != null ? user.getBranch().getId() : null
        );
    }

    private String generateAccessToken(UserEntity effectiveUser, UserEntity actor) {
        return jwtUtil.generateAccessToken(
            effectiveUser.getId(),
            effectiveUser.getEmail(),
            effectiveUser.getRole().name(),
            effectiveUser.getBranch() != null ? effectiveUser.getBranch().getId() : null,
            impersonationClaims(actor)
        );
    }

    private String generateRefreshToken(UserEntity effectiveUser, UserEntity actor) {
        return jwtUtil.generateRefreshToken(effectiveUser.getId(), impersonationClaims(actor));
    }

    private Map<String, Object> impersonationClaims(UserEntity actor) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("impersonated", true);
        claims.put("actorUserId", actor.getId().toString());
        claims.put("actorRole", actor.getRole().name());
        claims.put("actorName", actor.getName());
        return claims;
    }

    private AuthResponse buildAuthResponse(AuthResponse.UserInfo userInfo, String accessToken, String refreshToken) {
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .expiresIn(900)
            .user(userInfo)
            .build();
    }

    private AuthResponse.UserInfo buildUserInfo(UserEntity user, UserEntity actor) {
        return AuthResponse.UserInfo.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole().name())
            .branchId(user.getBranch() != null ? user.getBranch().getId() : null)
            .branchName(user.getBranch() != null ? user.getBranch().getName() : null)
            .impersonated(actor != null)
            .actorUserId(actor != null ? actor.getId() : null)
            .actorName(actor != null ? actor.getName() : null)
            .actorRole(actor != null ? actor.getRole().name() : null)
            .build();
    }

    private void validateImpersonation(UserEntity actor, UserEntity target) {
        if (!(actor.isAdmin() || actor.isWarehouseAdmin())) {
            throw new BusinessException("You do not have permission to impersonate users");
        }
        assertActiveApproved(target);
        if (actor.getId().equals(target.getId())) {
            throw new BusinessException("You are already signed in as this user");
        }
        if (target.isAdmin()) {
            throw new BusinessException("Admin accounts cannot be impersonated");
        }
        if (actor.isWarehouseAdmin() &&
            target.getRole() != UserEntity.Role.RESTAURANT_STAFF &&
            target.getRole() != UserEntity.Role.WAREHOUSE_MANAGER) {
            throw new BusinessException("Warehouse admin can only impersonate restaurant staff or warehouse managers");
        }
    }
}
