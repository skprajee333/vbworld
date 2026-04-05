package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.SmartSuggestionService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/smart")
@RequiredArgsConstructor
@Tag(name = "Smart Suggestions", description = "Day-pattern intelligence for smart ordering")
@SecurityRequirement(name = "bearerAuth")
public class SmartSuggestionController {

    private final SmartSuggestionService smartService;

    @GetMapping("/readiness")
    @Operation(summary = "Check if branch has enough data for smart suggestions")
    public ResponseEntity<ApiResponse<SmartSuggestionService.ReadinessStatus>> readiness(
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(smartService.getReadinessStatus(resolveBranchId(branchId, currentUser))));
    }

    @GetMapping("/suggestions")
    @Operation(summary = "Get smart order suggestions for a specific date")
    public ResponseEntity<ApiResponse<SmartSuggestionService.SmartSuggestionResult>> suggestions(
        @RequestParam(required = false) UUID branchId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        LocalDate date = targetDate != null ? targetDate : LocalDate.now().plusDays(1);
        return ResponseEntity.ok(ApiResponse.ok(smartService.getSuggestions(resolveBranchId(branchId, currentUser), date)));
    }

    @GetMapping("/patterns")
    @Operation(summary = "Get day-of-week order patterns for heatmap")
    public ResponseEntity<ApiResponse<List<SmartSuggestionService.DayPattern>>> patterns(
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(smartService.getDayPatterns(resolveBranchId(branchId, currentUser))));
    }

    @GetMapping("/branch-forecast")
    @Operation(summary = "Get forecast-driven replenishment suggestions for one branch")
    public ResponseEntity<ApiResponse<SmartSuggestionService.BranchForecastResult>> branchForecast(
        @RequestParam(required = false) UUID branchId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) Integer days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            smartService.getBranchForecast(resolveBranchId(branchId, currentUser), startDate, days)));
    }

    @GetMapping("/network-forecast")
    @Operation(summary = "Get forecast-driven replenishment suggestions across all active branches")
    public ResponseEntity<ApiResponse<List<SmartSuggestionService.BranchForecastResult>>> networkForecast(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) Integer days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(smartService.getNetworkForecast(startDate, days, currentUser)));
    }

    @PostMapping("/branch-forecast/draft")
    @Operation(summary = "Create a forecast-driven draft indent for a branch")
    public ResponseEntity<ApiResponse<SmartSuggestionService.AutoReplenishmentDraftResult>> createForecastDraft(
        @RequestBody CreateForecastDraftRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Forecast draft created",
            smartService.createForecastDraft(
                resolveBranchId(request.getBranchId(), currentUser),
                request.getTargetDate(),
                request.getDays(),
                currentUser)));
    }

    private UUID resolveBranchId(UUID requested, UserEntity user) {
        if (user == null) {
            throw new AccessDeniedException("Authentication required");
        }

        UUID userBranchId = user.getBranch() != null ? user.getBranch().getId() : null;

        if (requested == null) {
            if (userBranchId != null) {
                return userBranchId;
            }
            throw new IllegalArgumentException("branchId is required");
        }

        if (user.isRestaurant()) {
            if (userBranchId == null) {
                throw new AccessDeniedException("A branch is required for restaurant users");
            }
            if (!requested.equals(userBranchId)) {
                throw new AccessDeniedException("You can only access smart suggestions for your own branch");
            }
            return requested;
        }

        if (user.isAdmin() || user.isWarehouse() || user.isWarehouseAdmin()) {
            return requested;
        }

        throw new AccessDeniedException("You do not have permission to access smart suggestions");
    }

    @Data
    public static class CreateForecastDraftRequest {
        private UUID branchId;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate targetDate;
        private Integer days;
    }
}
