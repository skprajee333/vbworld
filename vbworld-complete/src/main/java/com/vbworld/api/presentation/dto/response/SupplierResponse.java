package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SupplierResponse {
    private UUID id;
    private String code;
    private String name;
    private String contactPerson;
    private String phone;
    private String email;
    private Integer leadTimeDays;
    private String address;
    private String notes;
    private boolean active;
    private Integer mappedItemCount;
    private Integer preferredItemCount;
    private Integer totalPurchaseOrders;
    private Integer completedPurchaseOrders;
    private Double fulfilmentPct;
    private Integer discrepancyReceipts;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
