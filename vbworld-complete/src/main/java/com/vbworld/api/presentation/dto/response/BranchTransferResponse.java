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
public class BranchTransferResponse {
    private UUID id;
    private UUID itemId;
    private String itemCode;
    private String itemName;
    private String category;
    private String unit;
    private UUID destinationBranchId;
    private String destinationBranchName;
    private String transferStatus;
    private BigDecimal quantityTransferred;
    private BigDecimal quantityBefore;
    private BigDecimal quantityAfter;
    private String referenceNumber;
    private String notes;
    private LocalDateTime transferredAt;
    private String transferredByName;
    private LocalDateTime receivedAt;
    private String receivedByName;
}
