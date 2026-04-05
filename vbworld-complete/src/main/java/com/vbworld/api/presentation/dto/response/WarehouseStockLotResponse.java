package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WarehouseStockLotResponse {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String stockUnit;
    private String receivedUom;
    private BigDecimal unitsPerPack;
    private BigDecimal quantityReceived;
    private BigDecimal baseQuantityReceived;
    private BigDecimal remainingQuantity;
    private String batchNumber;
    private LocalDate expiryDate;
    private String lotStatus;
    private String supplierName;
    private BigDecimal unitCost;
    private String referenceNumber;
    private String invoiceNumber;
    private LocalDateTime receivedAt;
    private String receivedByName;
}
