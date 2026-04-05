package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderResponse {
    private UUID id;
    private String poNumber;
    private UUID supplierId;
    private String supplierCode;
    private String supplierName;
    private String poStatus;
    private LocalDate expectedDate;
    private String referenceNumber;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private String createdByName;
    private String updatedByName;
    private BigDecimal totalOrderedQuantity;
    private BigDecimal totalReceivedQuantity;
    private List<PurchaseOrderLineResponse> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderLineResponse {
        private UUID id;
        private UUID itemId;
        private String itemCode;
        private String itemName;
        private String category;
        private String unit;
        private BigDecimal orderedQuantity;
        private BigDecimal receivedQuantity;
        private BigDecimal unitCost;
        private String notes;
    }
}
