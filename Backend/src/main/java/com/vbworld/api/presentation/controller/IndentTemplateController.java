package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.IndentTemplateService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@Tag(name = "Templates", description = "Saved indent templates for quick reordering")
@SecurityRequirement(name = "bearerAuth")
public class IndentTemplateController {

    private final IndentTemplateService templateService;

    // GET /api/templates?branchId=
    @GetMapping
    @Operation(summary = "List all templates for a branch")
    public ResponseEntity<ApiResponse<List<IndentTemplateService.TemplateResponse>>> list(
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(branchId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(templateService.listTemplates(bid)));
    }

    // GET /api/templates/{id}
    @GetMapping("/{id}")
    @Operation(summary = "Get a single template")
    public ResponseEntity<ApiResponse<IndentTemplateService.TemplateResponse>> get(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(branchId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(templateService.getTemplate(id, bid)));
    }

    // POST /api/templates
    @PostMapping
    @Operation(summary = "Save a new template")
    public ResponseEntity<ApiResponse<IndentTemplateService.TemplateResponse>> create(
        @RequestBody CreateTemplateRequest req,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(req.getBranchId(), currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Template saved",
                templateService.saveTemplate(
                    bid, req.getName(), req.getDescription(),
                    req.getItems(), currentUser)));
    }

    // PATCH /api/templates/{id}
    @PatchMapping("/{id}")
    @Operation(summary = "Update an existing template")
    public ResponseEntity<ApiResponse<IndentTemplateService.TemplateResponse>> update(
        @PathVariable UUID id,
        @RequestBody UpdateTemplateRequest req,
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(branchId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(
            templateService.updateTemplate(
                id, bid, req.getName(), req.getDescription(),
                req.getItems(), currentUser)));
    }

    // POST /api/templates/{id}/use
    @PostMapping("/{id}/use")
    @Operation(summary = "Mark template as used (loads it into a new indent)")
    public ResponseEntity<ApiResponse<IndentTemplateService.TemplateResponse>> use(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(branchId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Template loaded",
            templateService.useTemplate(id, bid)));
    }

    // DELETE /api/templates/{id}
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a template")
    public ResponseEntity<ApiResponse<Void>> delete(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID branchId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        UUID bid = resolve(branchId, currentUser);
        templateService.deleteTemplate(id, bid);
        return ResponseEntity.ok(ApiResponse.message("Template deleted"));
    }

    // ─── Helpers ─────────────────────────────────────────────
    private UUID resolve(UUID requested, UserEntity user) {
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
                throw new AccessDeniedException("You can only access templates for your own branch");
            }
            return requested;
        }

        if (user.isAdmin() || user.isWarehouse() || user.isWarehouseAdmin()) {
            return requested;
        }

        throw new AccessDeniedException("You do not have permission to access templates");
    }

    @Data
    static class CreateTemplateRequest {
        private UUID branchId;
        @NotBlank private String name;
        private String description;
        @NotEmpty private List<Map<String, Object>> items;
    }

    @Data
    static class UpdateTemplateRequest {
        private String name;
        private String description;
        private List<Map<String, Object>> items;
    }
}
