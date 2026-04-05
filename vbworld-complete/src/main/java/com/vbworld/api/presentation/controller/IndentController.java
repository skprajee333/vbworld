package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.IndentService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.request.IndentRequest;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.IndentResponse;
import com.vbworld.api.presentation.dto.response.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/indents")
@RequiredArgsConstructor
@Tag(name = "Indents", description = "Purchase order lifecycle management")
@SecurityRequirement(name = "bearerAuth")
public class IndentController {

    private final IndentService indentService;

    @GetMapping
    @Operation(summary = "List indents with filters")
    public ResponseEntity<ApiResponse<PagedResponse<IndentResponse>>> list(
        @RequestParam(required = false) UUID   branchId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            indentService.listIndents(branchId, status, from, to, page, size, currentUser)
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get indent detail")
    public ResponseEntity<ApiResponse<IndentResponse>> get(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            indentService.getIndent(id, currentUser)
        ));
    }

    @GetMapping("/route-plan")
    @Operation(summary = "Get delivery route planning view")
    public ResponseEntity<ApiResponse<List<IndentService.RoutePlanItem>>> routePlan(
        @RequestParam LocalDate date,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(indentService.getRoutePlan(date, currentUser)));
    }

    @PostMapping
    @Operation(summary = "Create a new indent")
    public ResponseEntity<ApiResponse<IndentResponse>> create(
        @Valid @RequestBody IndentRequest.Create request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Indent created successfully",
                indentService.createIndent(request, currentUser)));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('WAREHOUSE_MANAGER','ADMIN')")
    @Operation(summary = "Approve indent")
    public ResponseEntity<ApiResponse<IndentResponse>> approve(
        @PathVariable UUID id,
        @RequestBody(required = false) IndentRequest.Approve request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Indent approved",
            indentService.approveIndent(id,
                request != null ? request : new IndentRequest.Approve(), currentUser)));
    }

    @PatchMapping("/{id}/dispatch")
    @PreAuthorize("hasAnyRole('WAREHOUSE_MANAGER','ADMIN')")
    @Operation(summary = "Dispatch indent")
    public ResponseEntity<ApiResponse<IndentResponse>> dispatch(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Indent dispatched",
            indentService.dispatchIndent(id, currentUser)));
    }

    @PatchMapping("/{id}/deliver")
    @Operation(summary = "Mark as delivered")
    public ResponseEntity<ApiResponse<IndentResponse>> deliver(
        @PathVariable UUID id,
        @RequestBody(required = false) IndentRequest.Deliver request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Delivery confirmed",
            indentService.deliverIndent(id, request, currentUser)));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancel indent")
    public ResponseEntity<ApiResponse<Void>> cancel(
        @PathVariable UUID id,
        @Valid @RequestBody IndentRequest.Cancel request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        indentService.cancelIndent(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.message("Indent cancelled"));
    }

    @PatchMapping("/{id}/schedule")
    @PreAuthorize("hasAnyRole('WAREHOUSE_ADMIN','ADMIN')")
    @Operation(summary = "Reschedule indent delivery")
    public ResponseEntity<ApiResponse<IndentResponse>> reschedule(
        @PathVariable UUID id,
        @Valid @RequestBody IndentRequest.Reschedule request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Indent rescheduled",
            indentService.rescheduleIndent(id, request, currentUser)
        ));
    }

    @GetMapping("/{id}/reorder")
    @Operation(summary = "Load a past indent as a new editable cart (for reorder)")
    public ResponseEntity<ApiResponse<IndentResponse>> reorder(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            indentService.getIndentForReorder(id, currentUser)
        ));
    }
}
