package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderSupplierRecommendationResponse {
    private UUID supplierId;
    private String supplierCode;
    private String supplierName;
    private String contactPerson;
    private String phone;
    private Integer averageLeadTimeDays;
    private BigDecimal averageUnitCost;
    private int mappedItemCount;
    private int preferredItemCount;
    private LocalDate suggestedExpectedDate;
    private List<CoveredItem> coveredItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoveredItem {
        private UUID itemId;
        private String itemCode;
        private String itemName;
        private boolean preferred;
        private Integer leadTimeDays;
        private BigDecimal lastUnitCost;
        private BigDecimal minOrderQuantity;
    }
}
