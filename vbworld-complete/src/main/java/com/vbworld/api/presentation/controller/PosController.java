package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.PosService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pos")
@RequiredArgsConstructor
@Tag(name = "POS", description = "Restaurant dine-in billing and KOT workflow")
@SecurityRequirement(name = "bearerAuth")
public class PosController {

    private final PosService posService;

    @GetMapping("/tables")
    @Operation(summary = "List restaurant tables and their current orders")
    public ResponseEntity<ApiResponse<List<PosService.TableResponse>>> listTables(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(posService.listTables(currentUser)));
    }

    @PostMapping("/tables/{tableId}/qr-session")
    @Operation(summary = "Create a QR self-order session for a table")
    public ResponseEntity<ApiResponse<PosService.QrSessionResponse>> createQrSession(
        @PathVariable UUID tableId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "QR session created",
            posService.createQrSession(tableId, currentUser)));
    }

    @GetMapping("/qr/{token}")
    @Operation(summary = "Get a public QR self-order session")
    public ResponseEntity<ApiResponse<PosService.QrSessionResponse>> getQrSession(
        @PathVariable String token
    ) {
        return ResponseEntity.ok(ApiResponse.ok(posService.getQrSession(token)));
    }

    @PostMapping("/qr/{token}/orders")
    @Operation(summary = "Submit a self-order from a QR session")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> submitQrOrder(
        @PathVariable String token,
        @RequestBody SaveOrderRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "QR order placed successfully",
            posService.submitQrOrder(
                token,
                PosService.SavePosOrderRequest.builder()
                    .customerName(request.getCustomerName())
                    .customerPhone(request.getCustomerPhone())
                    .guestCount(request.getGuestCount())
                    .notes(request.getNotes())
                    .items(request.getItems() != null ? request.getItems().stream()
                        .map(line -> PosService.OrderLineRequest.builder()
                            .itemId(line.getItemId())
                            .quantity(line.getQuantity())
                            .notes(line.getNotes())
                            .build())
                        .toList() : List.of())
                    .build())));
    }

    @GetMapping("/orders/active")
    @Operation(summary = "List active POS orders for the branch")
    public ResponseEntity<ApiResponse<List<PosService.PosOrderResponse>>> activeOrders(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(posService.listActiveOrders(currentUser)));
    }

    @GetMapping("/shift")
    @Operation(summary = "Get the cashier shift summary for the current branch user")
    public ResponseEntity<ApiResponse<PosService.CashierShiftResponse>> shiftSummary(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(posService.getShiftSummary(currentUser)));
    }

    @PostMapping("/shift/open")
    @Operation(summary = "Open a cashier shift")
    public ResponseEntity<ApiResponse<PosService.CashierShiftResponse>> openShift(
        @RequestBody(required = false) ShiftRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Cashier shift opened",
            posService.openShift(
                PosService.OpenShiftRequest.builder()
                    .openingCash(request != null ? request.getOpeningCash() : null)
                    .notes(request != null ? request.getNotes() : null)
                    .build(),
                currentUser)));
    }

    @PostMapping("/shift/close")
    @Operation(summary = "Close a cashier shift")
    public ResponseEntity<ApiResponse<PosService.CashierShiftResponse>> closeShift(
        @RequestBody(required = false) ShiftRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Cashier shift closed",
            posService.closeShift(
                PosService.CloseShiftRequest.builder()
                    .closingCash(request != null ? request.getClosingCash() : null)
                    .notes(request != null ? request.getNotes() : null)
                    .build(),
                currentUser)));
    }

    @PostMapping("/tables/{tableId}/orders")
    @Operation(summary = "Create or update a dine-in POS order for a table")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> saveOrder(
        @PathVariable UUID tableId,
        @RequestBody SaveOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "POS order saved successfully",
            posService.saveTableOrder(
                tableId,
                PosService.SavePosOrderRequest.builder()
                    .customerName(request.getCustomerName())
                    .customerPhone(request.getCustomerPhone())
                    .assignedStaffName(request.getAssignedStaffName())
                    .guestCount(request.getGuestCount())
                    .notes(request.getNotes())
                    .items(request.getItems() != null ? request.getItems().stream()
                        .map(line -> PosService.OrderLineRequest.builder()
                            .itemId(line.getItemId())
                            .quantity(line.getQuantity())
                            .notes(line.getNotes())
                            .build())
                        .toList() : List.of())
                    .build(),
                currentUser)));
    }

    @PatchMapping("/orders/{orderId}/service")
    @Operation(summary = "Update waiter/captain service controls for an active bill")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> updateService(
        @PathVariable UUID orderId,
        @RequestBody(required = false) ServiceRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Service controls updated",
            posService.updateService(
                orderId,
                PosService.UpdateServiceRequest.builder()
                    .serviceStatus(request != null ? request.getServiceStatus() : null)
                    .assignedStaffName(request != null ? request.getAssignedStaffName() : null)
                    .guestCount(request != null ? request.getGuestCount() : null)
                    .build(),
                currentUser)));
    }

    @PostMapping("/qr/{token}/request-bill")
    @Operation(summary = "Request bill from a public QR session")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> requestBill(
        @PathVariable String token
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Bill request sent",
            posService.requestBillFromQr(token)));
    }

    @PatchMapping("/orders/{orderId}/kot")
    @Operation(summary = "Send a POS order to kitchen")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> sendKot(
        @PathVariable UUID orderId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "KOT sent successfully",
            posService.sendKot(orderId, currentUser)));
    }

    @PatchMapping("/orders/{orderId}/settle")
    @Operation(summary = "Settle and close a POS bill")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> settle(
        @PathVariable UUID orderId,
        @RequestBody(required = false) SettleOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Bill settled successfully",
            posService.settleOrder(
                orderId,
                PosService.SettlePosOrderRequest.builder()
                    .discountAmount(request != null ? request.getDiscountAmount() : null)
                    .taxAmount(request != null ? request.getTaxAmount() : null)
                    .couponCode(request != null ? request.getCouponCode() : null)
                    .redeemPoints(request != null ? request.getRedeemPoints() : null)
                    .payments(request != null && request.getPayments() != null
                        ? request.getPayments().stream()
                            .map(payment -> PosService.PaymentRequest.builder()
                                .paymentMethod(payment.getPaymentMethod())
                                .amount(payment.getAmount())
                                .referenceNumber(payment.getReferenceNumber())
                                .build())
                            .toList()
                        : null)
                    .build(),
                currentUser)));
    }

    @PatchMapping("/orders/{orderId}/cancel")
    @Operation(summary = "Cancel an active POS order")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> cancel(
        @PathVariable UUID orderId,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "POS order cancelled",
            posService.cancelOrder(orderId, currentUser)));
    }

    @PostMapping("/orders/{orderId}/split")
    @Operation(summary = "Split selected items from one bill into a new active bill")
    public ResponseEntity<ApiResponse<List<PosService.PosOrderResponse>>> split(
        @PathVariable UUID orderId,
        @RequestBody SplitOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Bill split successfully",
            posService.splitOrder(
                orderId,
                request.getItems() != null ? request.getItems().stream()
                    .map(item -> PosService.SplitLineRequest.builder()
                        .orderItemId(item.getOrderItemId())
                        .quantity(item.getQuantity())
                        .build())
                    .toList() : List.of(),
                currentUser)));
    }

    @PostMapping("/orders/{targetOrderId}/merge")
    @Operation(summary = "Merge another active bill into the target bill")
    public ResponseEntity<ApiResponse<PosService.PosOrderResponse>> merge(
        @PathVariable UUID targetOrderId,
        @RequestBody MergeOrderRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Bills merged successfully",
            posService.mergeOrders(targetOrderId, request.getSourceOrderId(), currentUser)));
    }

    @Data
    public static class SaveOrderRequest {
        private String customerName;
        private String customerPhone;
        private String assignedStaffName;
        private Integer guestCount;
        private String notes;
        private List<OrderLine> items;
    }

    @Data
    public static class ServiceRequest {
        private com.vbworld.api.infrastructure.entity.PosOrderEntity.ServiceStatus serviceStatus;
        private String assignedStaffName;
        private Integer guestCount;
    }

    @Data
    public static class OrderLine {
        private UUID itemId;
        private BigDecimal quantity;
        private String notes;
    }

    @Data
    public static class SettleOrderRequest {
        private BigDecimal discountAmount;
        private BigDecimal taxAmount;
        private String couponCode;
        private Integer redeemPoints;
        private List<PaymentLine> payments;
    }

    @Data
    public static class PaymentLine {
        private com.vbworld.api.infrastructure.entity.PosOrderPaymentEntity.PaymentMethod paymentMethod;
        private BigDecimal amount;
        private String referenceNumber;
    }

    @Data
    public static class SplitOrderRequest {
        private List<SplitLine> items;
    }

    @Data
    public static class SplitLine {
        private UUID orderItemId;
        private BigDecimal quantity;
    }

    @Data
    public static class MergeOrderRequest {
        private UUID sourceOrderId;
    }

    @Data
    public static class ShiftRequest {
        private BigDecimal openingCash;
        private BigDecimal closingCash;
        private String notes;
    }
}
