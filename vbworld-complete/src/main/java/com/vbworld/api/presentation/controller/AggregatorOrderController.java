package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.AggregatorOrderService;
import com.vbworld.api.infrastructure.entity.AggregatorIntegrationEntity;
import com.vbworld.api.infrastructure.entity.AggregatorOrderEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.AggregatorIntegrationResponse;
import com.vbworld.api.presentation.dto.response.AggregatorOrderResponse;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/aggregator-orders")
@RequiredArgsConstructor
@Tag(name = "Aggregator Orders", description = "Unified online order hub and payout reconciliation")
@SecurityRequirement(name = "bearerAuth")
public class AggregatorOrderController {

    private final AggregatorOrderService aggregatorOrderService;

    @GetMapping
    @Operation(summary = "List aggregator orders for the hub")
    public ResponseEntity<ApiResponse<List<AggregatorOrderResponse>>> list(
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            aggregatorOrderService.listHubOrders(search, currentUser)
        ));
    }

    @GetMapping("/integrations")
    @Operation(summary = "List aggregator integrations")
    public ResponseEntity<ApiResponse<List<AggregatorIntegrationResponse>>> listIntegrations(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            aggregatorOrderService.listIntegrations(currentUser)
        ));
    }

    @PostMapping("/integrations")
    @Operation(summary = "Create or update an aggregator integration")
    public ResponseEntity<ApiResponse<AggregatorIntegrationResponse>> saveIntegration(
        @RequestBody SaveIntegrationRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Aggregator integration saved",
            aggregatorOrderService.saveIntegration(
                AggregatorOrderService.SaveIntegrationRequest.builder()
                    .id(request.getId())
                    .branchId(request.getBranchId())
                    .source(request.getSource())
                    .storeCode(request.getStoreCode())
                    .outletName(request.getOutletName())
                    .integrationStatus(request.getIntegrationStatus())
                    .autoSyncEnabled(request.isAutoSyncEnabled())
                    .syncIntervalMinutes(request.getSyncIntervalMinutes())
                    .build(),
                currentUser)
        ));
    }

    @PostMapping("/integrations/{id}/sync")
    @Operation(summary = "Trigger a sync run for an aggregator integration")
    public ResponseEntity<ApiResponse<AggregatorOrderService.SyncResultResponse>> triggerSync(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Aggregator sync completed",
            aggregatorOrderService.triggerSync(id, currentUser)
        ));
    }

    @PostMapping
    @Operation(summary = "Import or create an aggregator order")
    public ResponseEntity<ApiResponse<AggregatorOrderResponse>> create(
        @RequestBody CreateAggregatorOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Aggregator order added to hub",
            aggregatorOrderService.createOrder(
                AggregatorOrderService.CreateAggregatorOrderRequest.builder()
                    .branchId(request.getBranchId())
                    .source(request.getSource())
                    .externalOrderId(request.getExternalOrderId())
                    .customerName(request.getCustomerName())
                    .customerPhone(request.getCustomerPhone())
                    .deliveryAddress(request.getDeliveryAddress())
                    .items(request.getItems() != null ? request.getItems().stream()
                        .map(line -> AggregatorOrderService.OrderLineRequest.builder()
                            .itemName(line.getItemName())
                            .quantity(line.getQuantity())
                            .unitPrice(line.getUnitPrice())
                            .build())
                        .toList() : List.of())
                    .subtotal(request.getSubtotal())
                    .taxAmount(request.getTaxAmount())
                    .packagingCharge(request.getPackagingCharge())
                    .deliveryCharge(request.getDeliveryCharge())
                    .discountAmount(request.getDiscountAmount())
                    .paymentStatus(request.getPaymentStatus())
                    .notes(request.getNotes())
                    .orderedAt(request.getOrderedAt())
                    .build(),
                currentUser)
        ));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update aggregator operational and payment status")
    public ResponseEntity<ApiResponse<AggregatorOrderResponse>> updateStatus(
        @PathVariable UUID id,
        @RequestBody UpdateStatusRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Aggregator order updated",
            aggregatorOrderService.updateOperationalStatus(
                id,
                request.getAggregatorStatus(),
                request.getPaymentStatus(),
                request.getNotes(),
                currentUser)
        ));
    }

    @PatchMapping("/{id}/reconcile")
    @Operation(summary = "Update aggregator payout reconciliation")
    public ResponseEntity<ApiResponse<AggregatorOrderResponse>> reconcile(
        @PathVariable UUID id,
        @RequestBody ReconcileRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Aggregator payout reconciled",
            aggregatorOrderService.reconcileOrder(
                id,
                request.getReconciliationStatus(),
                request.getPayoutAmount(),
                request.getPayoutReference(),
                request.getNotes(),
                currentUser)
        ));
    }

    @Data
    public static class CreateAggregatorOrderRequest {
        private UUID branchId;
        private AggregatorOrderEntity.Source source;
        private String externalOrderId;
        private String customerName;
        private String customerPhone;
        private String deliveryAddress;
        private List<OrderLineRequest> items;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal packagingCharge;
        private BigDecimal deliveryCharge;
        private BigDecimal discountAmount;
        private AggregatorOrderEntity.PaymentStatus paymentStatus;
        private String notes;
        private LocalDateTime orderedAt;
    }

    @Data
    public static class OrderLineRequest {
        private String itemName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }

    @Data
    public static class UpdateStatusRequest {
        private AggregatorOrderEntity.AggregatorStatus aggregatorStatus;
        private AggregatorOrderEntity.PaymentStatus paymentStatus;
        private String notes;
    }

    @Data
    public static class ReconcileRequest {
        private AggregatorOrderEntity.ReconciliationStatus reconciliationStatus;
        private BigDecimal payoutAmount;
        private String payoutReference;
        private String notes;
    }

    @Data
    public static class SaveIntegrationRequest {
        private UUID id;
        private UUID branchId;
        private AggregatorOrderEntity.Source source;
        private String storeCode;
        private String outletName;
        private AggregatorIntegrationEntity.IntegrationStatus integrationStatus;
        private boolean autoSyncEnabled = true;
        private Integer syncIntervalMinutes;
    }
}
