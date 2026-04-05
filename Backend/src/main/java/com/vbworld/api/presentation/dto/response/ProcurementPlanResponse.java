package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcurementPlanResponse {
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private BigDecimal currentStock;
    private BigDecimal minLevel;
    private BigDecimal maxLevel;
    private BigDecimal reorderLevel;
    private BigDecimal targetStock;
    private BigDecimal suggestedOrderQuantity;
    private BigDecimal averageDailyDemand;
    private BigDecimal estimatedDaysRemaining;
    private String urgency;
    private UUID recommendedSupplierId;
    private String recommendedSupplierCode;
    private String recommendedSupplierName;
    private Integer recommendedLeadTimeDays;
    private BigDecimal recommendedUnitCost;
    private BigDecimal minOrderQuantity;
    private boolean preferredSupplier;
    private LocalDate suggestedExpectedDate;
    private String recommendationReason;
}
