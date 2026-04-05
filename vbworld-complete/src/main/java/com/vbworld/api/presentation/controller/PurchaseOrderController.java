package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.PurchaseOrderService;
import com.vbworld.api.infrastructure.entity.PurchaseOrderEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.ProcurementPlanResponse;
import com.vbworld.api.presentation.dto.response.PurchaseOrderSupplierRecommendationResponse;
import com.vbworld.api.presentation.dto.response.PurchaseOrderResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@Tag(name = "Purchase Orders", description = "Supplier procurement workflow")
@SecurityRequirement(name = "bearerAuth")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    @Operation(summary = "List purchase orders")
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> list(
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            purchaseOrderService.listPurchaseOrders(search, currentUser)));
    }

    @GetMapping("/recommendations")
    @Operation(summary = "Recommend suppliers for selected items")
    public ResponseEntity<ApiResponse<List<PurchaseOrderSupplierRecommendationResponse>>> recommendations(
        @RequestParam List<UUID> itemIds,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            purchaseOrderService.getSupplierRecommendations(itemIds, currentUser)));
    }

    @GetMapping("/planning")
    @Operation(summary = "Get procurement planning recommendations")
    public ResponseEntity<ApiResponse<List<ProcurementPlanResponse>>> planning(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            purchaseOrderService.getProcurementPlan(currentUser)));
    }

    @PostMapping("/auto-draft")
    @Operation(summary = "Generate draft purchase orders from procurement plan")
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> autoDraft(
        @RequestBody AutoDraftRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Draft purchase orders created successfully",
            purchaseOrderService.createAutoDraftPurchaseOrders(
                request != null && Boolean.TRUE.equals(request.getIncludeMedium()),
                currentUser)));
    }

    @PostMapping
    @Operation(summary = "Create purchase order")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(
        @RequestBody CreatePurchaseOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        var lines = request.getItems().stream()
            .map(line -> new PurchaseOrderService.CreatePurchaseOrderLine(
                line.getItemId(),
                line.getOrderedQuantity(),
                line.getReceivedQuantity(),
                line.getUnitCost(),
                line.getNotes()))
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(
            "Purchase order created successfully",
            purchaseOrderService.createPurchaseOrder(
                request.getSupplierId(),
                request.getExpectedDate(),
                request.getReferenceNumber(),
                request.getNotes(),
                lines,
                currentUser)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update purchase order status")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updateStatus(
        @PathVariable UUID id,
        @RequestBody UpdateStatusRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Purchase order status updated",
            purchaseOrderService.updateStatus(id, request.getStatus(), currentUser)));
    }

    @Data
    public static class CreatePurchaseOrderRequest {
        private UUID supplierId;
        private LocalDate expectedDate;
        private String referenceNumber;
        private String notes;
        private List<LineRequest> items;
    }

    @Data
    public static class LineRequest {
        private UUID itemId;
        private BigDecimal orderedQuantity;
        private BigDecimal receivedQuantity;
        private BigDecimal unitCost;
        private String notes;
    }

    @Data
    public static class UpdateStatusRequest {
        private PurchaseOrderEntity.PurchaseOrderStatus status;
    }

    @Data
    public static class AutoDraftRequest {
        private Boolean includeMedium;
    }
}
