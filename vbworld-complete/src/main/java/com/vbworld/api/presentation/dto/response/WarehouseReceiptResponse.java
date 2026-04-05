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
public class WarehouseReceiptResponse {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private UUID supplierId;
    private String supplierName;
    private UUID purchaseOrderId;
    private UUID purchaseOrderItemId;
    private String purchaseOrderNumber;
    private String referenceNumber;
    private BigDecimal quantityReceived;
    private String receivedUom;
    private BigDecimal unitsPerPack;
    private BigDecimal baseQuantityReceived;
    private String batchNumber;
    private LocalDate expiryDate;
    private BigDecimal orderedQuantity;
    private BigDecimal shortageQuantity;
    private BigDecimal damagedQuantity;
    private BigDecimal quantityBefore;
    private BigDecimal quantityAfter;
    private BigDecimal unitCost;
    private String invoiceNumber;
    private String receiptStatus;
    private String notes;
    private String resolutionStatus;
    private String resolutionNotes;
    private LocalDateTime resolvedAt;
    private String resolvedByName;
    private String returnStatus;
    private BigDecimal returnedQuantity;
    private String returnReference;
    private String returnNotes;
    private LocalDateTime returnedAt;
    private LocalDateTime receivedAt;
    private String receivedByName;
}
