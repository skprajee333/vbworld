package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.AuthService;
import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.DuplicateResourceException;
import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.UserRepository;
import com.vbworld.api.infrastructure.security.AuthSessionDetails;
import com.vbworld.api.presentation.dto.request.AuthRequest;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.AuthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, register, refresh")
public class AuthController {

    private final AuthService       authService;
    private final UserRepository    userRepository;
    private final BranchRepository  branchRepository;
    private final PasswordEncoder   passwordEncoder;

    @Value("${app.auth.public-registration-enabled:true}")
    private boolean publicRegistrationEnabled;

    // ─── LOGIN ────────────────────────────────────────────────
    @PostMapping("/login")
    @Operation(summary = "Login and get JWT tokens")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
        @Valid @RequestBody AuthRequest.Login request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    // ─── REGISTER ─────────────────────────────────────────────
    @PostMapping("/register")
    @Operation(summary = "Register — account created as PENDING, requires admin approval")
    public ResponseEntity<ApiResponse<String>> register(
        @Valid @RequestBody RegisterRequest req
    ) {
        if (!publicRegistrationEnabled) {
            throw new BusinessException("Public registration is disabled");
        }

        // Validate email unique
        if (userRepository.existsByEmail(req.getEmail().toLowerCase()))
            throw new DuplicateResourceException("Email already registered: " + req.getEmail());

        if (req.getPassword().length() < 8)
            throw new BusinessException("Password must be at least 8 characters");

        // Parse role
        UserEntity.Role role;
        try { role = UserEntity.Role.valueOf(req.getRole().toUpperCase()); }
        catch (Exception e) {
            throw new BusinessException("Invalid role. Use: RESTAURANT_STAFF or WAREHOUSE_MANAGER");
        }

        // Resolve branch
        // - WAREHOUSE_MANAGER: no branch needed
        // - RESTAURANT_STAFF: branchId OR (restaurantName + area) to find/create branch
        BranchEntity branch = null;

        if (role == UserEntity.Role.RESTAURANT_STAFF) {
            if (req.getBranchId() != null) {
                // Link to existing branch
                branch = branchRepository.findById(req.getBranchId())
                    .orElseThrow(() -> new BusinessException("Selected branch not found"));
            } else if (req.getRestaurantName() != null && !req.getRestaurantName().isBlank()) {
                // Find or create branch by name
                String branchName = req.getRestaurantName().trim();
                Optional<BranchEntity> existing = branchRepository.findAllByActiveTrue()
                    .stream()
                    .filter(b -> b.getName().equalsIgnoreCase(branchName))
                    .findFirst();

                if (existing.isPresent()) {
                    branch = existing.get();
                } else {
                    // Auto-create new branch
                    branch = branchRepository.save(BranchEntity.builder()
                        .name(branchName)
                        .address(req.getArea())
                        .city(req.getCity() != null ? req.getCity() : "Chennai")
                        .active(true)
                        .build());
                }
            } else {
                throw new BusinessException("Restaurant staff must provide a branch or restaurant name");
            }
        }

        // Create user as PENDING
        UserEntity user = UserEntity.builder()
            .name(req.getName())
            .email(req.getEmail().toLowerCase())
            .phone(req.getPhone())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .role(role)
            .branch(branch)
            .active(false) // not active until approved
            .status(UserEntity.Status.PENDING)
            .build();

        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.message(
            "Registration successful! Your account is pending admin approval. " +
            "You will be able to login once approved."));
    }

    // ─── REFRESH ──────────────────────────────────────────────
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
        @Valid @RequestBody AuthRequest.Refresh request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(request)));
    }

    // ─── CHANGE PASSWORD ──────────────────────────────────────
    @PostMapping("/change-password")
    @Operation(summary = "Change password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
        @AuthenticationPrincipal UserEntity currentUser,
        @Valid @RequestBody AuthRequest.ChangePassword request
    ) {
        authService.changePassword(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.message("Password changed successfully"));
    }

    @PostMapping("/impersonate")
    @Operation(summary = "Start a scoped impersonation session")
    public ResponseEntity<ApiResponse<AuthResponse>> impersonate(
        @AuthenticationPrincipal UserEntity currentUser,
        @Valid @RequestBody ImpersonateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.impersonate(currentUser, request.getUserId())));
    }

    // ─── ME ───────────────────────────────────────────────────
    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<ApiResponse<AuthResponse.UserInfo>> me(
        @AuthenticationPrincipal UserEntity currentUser,
        Authentication authentication
    ) {
        AuthSessionDetails details = authentication != null && authentication.getDetails() instanceof AuthSessionDetails authDetails
            ? authDetails
            : null;
        UUID branchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
        String branchName = branchId != null
            ? branchRepository.findById(branchId).map(BranchEntity::getName).orElse(null)
            : null;
        return ResponseEntity.ok(ApiResponse.ok(
            AuthResponse.UserInfo.builder()
                .id(currentUser.getId())
                .name(currentUser.getName())
                .email(currentUser.getEmail())
                .role(currentUser.getRole().name())
                .branchId(branchId)
                .branchName(branchName)
                .impersonated(details != null && details.isImpersonated())
                .actorUserId(details != null ? details.getActorUserId() : null)
                .actorName(details != null ? details.getActorName() : null)
                .actorRole(details != null ? details.getActorRole() : null)
                .build()
        ));
    }

    // ─── DTO ──────────────────────────────────────────────────
    @Data
    static class RegisterRequest {
        @NotBlank private String name;
        @NotBlank @Email private String email;
        private String phone;
        @NotBlank private String password;
        @NotBlank private String role; // RESTAURANT_STAFF or WAREHOUSE_MANAGER

        // For restaurant staff — provide ONE of:
        private java.util.UUID branchId;      // link to existing branch
        private String restaurantName;          // or create/find by name
        private String area;                    // address/area
        private String city;                    // defaults to Chennai
    }

    @Data
    static class ImpersonateRequest {
        private UUID userId;
    }
}
