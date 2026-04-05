package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.GovernanceService;
import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.DuplicateResourceException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.UserRepository;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Admin and warehouse-admin user management")
@SecurityRequirement(name = "bearerAuth")
public class UserManagementController {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final GovernanceService governanceService;

    @GetMapping
    @Operation(summary = "List visible users")
    public ResponseEntity<ApiResponse<List<UserSummary>>> list(@AuthenticationPrincipal UserEntity currentUser) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.MANAGE_USERS);
        List<UserSummary> users = userRepository.findAllByOrderByCreatedAtDesc().stream()
            .filter(user -> canManageTarget(currentUser, user) || currentUser.isAdmin())
            .map(this::toSummary)
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/pending")
    @Operation(summary = "List users pending approval")
    public ResponseEntity<ApiResponse<List<UserSummary>>> pending(@AuthenticationPrincipal UserEntity currentUser) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.APPROVE_USERS);
        List<UserSummary> users = userRepository.findByStatusOrderByCreatedAtDesc(UserEntity.Status.PENDING).stream()
            .filter(user -> canManageTarget(currentUser, user) || currentUser.isAdmin())
            .map(this::toSummary)
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a pending user")
    public ResponseEntity<ApiResponse<UserSummary>> approve(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.APPROVE_USERS);
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        assertCanManage(currentUser, user);

        if (user.getStatus() == UserEntity.Status.APPROVED) {
            throw new BusinessException("User is already approved");
        }

        user.setStatus(UserEntity.Status.APPROVED);
        user.setActive(true);
        UserEntity saved = userRepository.save(user);

        governanceService.logAction(
            currentUser,
            "USER_MANAGEMENT",
            "APPROVE",
            "USER",
            saved.getId(),
            currentUser.getName() + " approved " + saved.getName(),
            "targetRole=" + saved.getRole().name()
        );

        return ResponseEntity.ok(ApiResponse.ok("User approved", toSummary(saved)));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a pending user")
    public ResponseEntity<ApiResponse<UserSummary>> reject(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser,
        @RequestBody(required = false) RejectRequest req
    ) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.APPROVE_USERS);
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        assertCanManage(currentUser, user);

        user.setStatus(UserEntity.Status.REJECTED);
        user.setActive(false);
        UserEntity saved = userRepository.save(user);

        governanceService.logAction(
            currentUser,
            "USER_MANAGEMENT",
            "REJECT",
            "USER",
            saved.getId(),
            currentUser.getName() + " rejected " + saved.getName(),
            req != null ? req.getReason() : null
        );

        return ResponseEntity.ok(ApiResponse.ok("User rejected", toSummary(saved)));
    }

    @PostMapping
    @Operation(summary = "Create user directly")
    public ResponseEntity<ApiResponse<UserSummary>> create(
        @Valid @RequestBody CreateUserRequest req,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.MANAGE_USERS);
        if (userRepository.existsByEmail(req.getEmail().toLowerCase())) {
            throw new DuplicateResourceException("Email already registered: " + req.getEmail());
        }
        if (req.getPassword() == null || req.getPassword().length() < 8) {
            throw new BusinessException("Password must be at least 8 characters");
        }

        UserEntity.Role role = parseRole(req.getRole());
        assertCanAssignRole(currentUser, role);

        BranchEntity branch = null;
        if (req.getBranchId() != null) {
            branch = branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        }

        UserEntity saved = userRepository.save(UserEntity.builder()
            .name(req.getName())
            .email(req.getEmail().toLowerCase())
            .phone(req.getPhone())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .role(role)
            .branch(branch)
            .active(true)
            .status(UserEntity.Status.APPROVED)
            .build());

        governanceService.logAction(
            currentUser,
            "USER_MANAGEMENT",
            "CREATE",
            "USER",
            saved.getId(),
            currentUser.getName() + " created " + saved.getName(),
            "targetRole=" + saved.getRole().name()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("User created", toSummary(saved)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update user")
    public ResponseEntity<ApiResponse<UserSummary>> update(
        @PathVariable UUID id,
        @RequestBody UpdateUserRequest req,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        governanceService.requirePermission(currentUser, GovernanceService.PermissionKey.MANAGE_USERS);
        UserEntity user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        assertCanManage(currentUser, user);

        if (req.getName() != null) user.setName(req.getName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getActive() != null) user.setActive(req.getActive());
        if (req.getBranchId() != null) {
            BranchEntity branch = branchRepository.findById(req.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
            user.setBranch(branch);
        }
        if (req.getPassword() != null && req.getPassword().length() >= 8) {
            user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        }

        UserEntity saved = userRepository.save(user);

        governanceService.logAction(
            currentUser,
            "USER_MANAGEMENT",
            "UPDATE",
            "USER",
            saved.getId(),
            currentUser.getName() + " updated " + saved.getName(),
            "active=" + saved.isActive()
        );

        return ResponseEntity.ok(ApiResponse.ok(toSummary(saved)));
    }

    private UserEntity.Role parseRole(String role) {
        try {
            return UserEntity.Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Invalid role: " + role);
        }
    }

    private void assertCanManage(UserEntity actor, UserEntity target) {
        if (!canManageTarget(actor, target)) {
            throw new AccessDeniedException("You do not have permission to manage this user");
        }
    }

    private void assertCanAssignRole(UserEntity actor, UserEntity.Role role) {
        if (actor.isAdmin()) {
            return;
        }
        if (!actor.isWarehouseAdmin()) {
            throw new AccessDeniedException("You do not have permission to create users");
        }
        if (role != UserEntity.Role.RESTAURANT_STAFF && role != UserEntity.Role.WAREHOUSE_MANAGER) {
            throw new AccessDeniedException("Warehouse admin can only create restaurant staff or warehouse managers");
        }
    }

    private boolean canManageTarget(UserEntity actor, UserEntity target) {
        if (actor == null) {
            return false;
        }
        if (actor.isAdmin()) {
            return true;
        }
        if (!actor.isWarehouseAdmin()) {
            return false;
        }
        return target.getRole() == UserEntity.Role.RESTAURANT_STAFF || target.getRole() == UserEntity.Role.WAREHOUSE_MANAGER;
    }

    private UserSummary toSummary(UserEntity u) {
        return new UserSummary(
            u.getId(), u.getName(), u.getEmail(), u.getPhone(),
            u.getRole().name(), u.getStatus().name(),
            u.getBranch() != null ? u.getBranch().getId() : null,
            u.getBranch() != null ? u.getBranch().getName() : null,
            u.isActive(), u.getLastLoginAt(), u.getCreatedAt()
        );
    }

    record UserSummary(
        UUID id, String name, String email, String phone,
        String role, String status,
        UUID branchId, String branchName,
        boolean active, LocalDateTime lastLoginAt, LocalDateTime createdAt
    ) {}

    @Data
    static class CreateUserRequest {
        @NotBlank private String name;
        @NotBlank @Email private String email;
        private String phone;
        @NotBlank private String password;
        @NotBlank private String role;
        private UUID branchId;
    }

    @Data
    static class UpdateUserRequest {
        private String name;
        private String phone;
        private Boolean active;
        private UUID branchId;
        private String password;
    }

    @Data
    static class RejectRequest {
        private String reason;
    }
}
