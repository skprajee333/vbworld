package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AggregatorOrderResponse {
    private UUID id;
    private UUID branchId;
    private String branchName;
    private String source;
    private String externalOrderId;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;
    private List<OrderLine> items;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal packagingCharge;
    private BigDecimal deliveryCharge;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String aggregatorStatus;
    private String paymentStatus;
    private String reconciliationStatus;
    private String payoutReference;
    private BigDecimal payoutAmount;
    private String notes;
    private LocalDateTime orderedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime reconciledAt;
    private String createdByName;
    private String updatedByName;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderLine {
        private String itemName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}
