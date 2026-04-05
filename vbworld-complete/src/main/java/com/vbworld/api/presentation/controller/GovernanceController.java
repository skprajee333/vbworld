package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.GovernanceService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.AppNotificationResponse;
import com.vbworld.api.presentation.dto.response.AuditLogResponse;
import com.vbworld.api.presentation.dto.response.FraudControlRuleResponse;
import com.vbworld.api.presentation.dto.response.GovernanceExceptionResponse;
import com.vbworld.api.presentation.dto.response.PermissionMatrixResponse;
import com.vbworld.api.presentation.dto.response.SystemMonitorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/governance")
@RequiredArgsConstructor
@Tag(name = "Governance", description = "Audit logs and in-app notifications")
@SecurityRequirement(name = "bearerAuth")
public class GovernanceController {

    private final GovernanceService governanceService;

    @GetMapping("/notifications")
    @Operation(summary = "Get notifications for the current user")
    public ResponseEntity<ApiResponse<List<AppNotificationResponse>>> notifications(
        @RequestParam(defaultValue = "false") boolean unreadOnly,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            governanceService.listNotifications(unreadOnly, currentUser)));
    }

    @PatchMapping("/notifications/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<ApiResponse<AppNotificationResponse>> markRead(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Notification marked as read",
            governanceService.markNotificationRead(id, currentUser)));
    }

    @PatchMapping("/notifications/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<Integer>> markAllRead(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Notifications marked as read",
            governanceService.markAllNotificationsRead(currentUser)));
    }

    @GetMapping("/audit")
    @Operation(summary = "Get audit logs")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> audit(
        @RequestParam(required = false) String module,
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            governanceService.listAuditLogs(module, search, currentUser)));
    }

    @GetMapping("/permissions/me")
    @Operation(summary = "Get the effective permission matrix for the current user")
    public ResponseEntity<ApiResponse<PermissionMatrixResponse>> myPermissions(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(governanceService.getMyPermissionMatrix(currentUser)));
    }

    @GetMapping("/permissions/{userId}")
    @Operation(summary = "Get the permission matrix for a target user")
    public ResponseEntity<ApiResponse<PermissionMatrixResponse>> permissions(
        @PathVariable UUID userId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(governanceService.getPermissionMatrix(userId, currentUser)));
    }

    @PutMapping("/permissions/{userId}")
    @Operation(summary = "Update permission overrides for a target user")
    public ResponseEntity<ApiResponse<PermissionMatrixResponse>> updatePermissions(
        @PathVariable UUID userId,
        @RequestBody UpdatePermissionsRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Permission matrix updated",
            governanceService.savePermissionMatrix(userId, request.getPermissions(), currentUser)));
    }

    @GetMapping("/monitor")
    @Operation(summary = "Get live governance and system-monitor summary")
    public ResponseEntity<ApiResponse<SystemMonitorResponse>> monitor(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(governanceService.getSystemMonitor(currentUser)));
    }

    @GetMapping("/fraud-rules")
    @Operation(summary = "Get fraud-control and exception rules")
    public ResponseEntity<ApiResponse<List<FraudControlRuleResponse>>> fraudRules(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(governanceService.listFraudRules(currentUser)));
    }

    @PutMapping("/fraud-rules")
    @Operation(summary = "Save fraud-control and exception rules")
    public ResponseEntity<ApiResponse<List<FraudControlRuleResponse>>> updateFraudRules(
        @RequestBody UpdateFraudRulesRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Fraud-control rules updated",
            governanceService.saveFraudRules(request.getRules(), currentUser)));
    }

    @GetMapping("/exceptions")
    @Operation(summary = "Get governance exceptions")
    public ResponseEntity<ApiResponse<List<GovernanceExceptionResponse>>> exceptions(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String riskLevel,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            governanceService.listExceptions(status, riskLevel, currentUser)));
    }

    @PostMapping("/exceptions/{id}/escalate")
    @Operation(summary = "Escalate a governance exception")
    public ResponseEntity<ApiResponse<GovernanceExceptionResponse>> escalateException(
        @PathVariable UUID id,
        @RequestBody ResolveExceptionRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Governance exception escalated",
            governanceService.escalateException(id, request != null ? request.getNote() : null, currentUser)));
    }

    @PostMapping("/exceptions/{id}/resolve")
    @Operation(summary = "Resolve or dismiss a governance exception")
    public ResponseEntity<ApiResponse<GovernanceExceptionResponse>> resolveException(
        @PathVariable UUID id,
        @RequestBody ResolveExceptionRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Governance exception updated",
            governanceService.resolveException(
                id,
                new GovernanceService.ExceptionResolutionRequest(
                    request != null ? request.getNote() : null,
                    request != null && request.isDismissed()
                ),
                currentUser)));
    }

    @lombok.Data
    public static class UpdatePermissionsRequest {
        private List<GovernanceService.PermissionOverrideRequest> permissions;
    }

    @lombok.Data
    public static class UpdateFraudRulesRequest {
        private List<GovernanceService.FraudRuleUpsertRequest> rules;
    }

    @lombok.Data
    public static class ResolveExceptionRequest {
        private String note;
        private boolean dismissed;
    }
}
