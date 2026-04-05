package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ItemResponse {
    private UUID id;
    private String code;
    private String name;
    private String category;
    private String unit;
    private BigDecimal reorderLevel;
    private BigDecimal salePrice;
    private boolean active;
    private BigDecimal warehouseStock;
    private String stockStatus;
}
