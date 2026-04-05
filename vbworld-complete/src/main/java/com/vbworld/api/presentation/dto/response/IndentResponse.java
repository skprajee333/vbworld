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

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class IndentResponse {
    private UUID id;
    private String indentNumber;
    private String branchName;
    private UUID branchId;
    private String createdByName;
    private String status;
    private LocalDate expectedDate;
    private LocalDate scheduledDeliveryDate;
    private String requestedDeliverySlot;
    private String promisedDeliverySlot;
    private boolean cutoffApplied;
    private String notes;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String dispatchedByName;
    private LocalDateTime dispatchedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private LocalDateTime createdAt;
    private int itemCount;
    private List<IndentItemResponse> items;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IndentItemResponse {
        private UUID id;
        private UUID itemId;
        private String itemName;
        private String itemCode;
        private String category;
        private BigDecimal requestedQty;
        private BigDecimal approvedQty;
        private BigDecimal deliveredQty;
        private String unit;
        private String notes;
    }
}
