package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierItemMappingResponse {
    private UUID id;
    private UUID supplierId;
    private String supplierCode;
    private String supplierName;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private String supplierSku;
    private BigDecimal lastUnitCost;
    private BigDecimal minOrderQuantity;
    private Integer leadTimeDays;
    private boolean preferred;
    private boolean active;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
