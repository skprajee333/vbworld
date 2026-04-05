package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WarehouseAdjustmentResponse {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private String adjustmentType;
    private String reasonType;
    private String impactType;
    private UUID lotId;
    private String batchNumber;
    private BigDecimal quantityDelta;
    private BigDecimal quantityBefore;
    private BigDecimal quantityAfter;
    private String reason;
    private String notes;
    private LocalDateTime adjustedAt;
    private String adjustedByName;
}
