package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WarehouseStockResponse {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private BigDecimal quantity;
    private BigDecimal minLevel;
    private BigDecimal maxLevel;
    private String stockStatus;
    private LocalDateTime lastUpdatedAt;
    private String updatedByName;
}
