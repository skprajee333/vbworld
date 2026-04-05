package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BranchResponse {
    private UUID id;
    private String name;
    private String address;
    private String city;
    private String phone;
    private LocalTime orderCutoffTime;
    private Integer orderLeadDays;
    private String defaultDeliverySlot;
    private Integer morningSlotCapacity;
    private Integer afternoonSlotCapacity;
    private Integer eveningSlotCapacity;
    private Integer forecastHorizonDays;
    private Integer safetyStockDays;
    private boolean autoReplenishEnabled;
    private Integer autoReplenishMinConfidencePct;
    private boolean active;
    private LocalDateTime createdAt;
}
