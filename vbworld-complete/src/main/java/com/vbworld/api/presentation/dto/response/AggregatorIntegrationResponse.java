package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AggregatorIntegrationResponse {
    private UUID id;
    private UUID branchId;
    private String branchName;
    private String source;
    private String storeCode;
    private String outletName;
    private String integrationStatus;
    private boolean autoSyncEnabled;
    private Integer syncIntervalMinutes;
    private LocalDateTime lastSyncAt;
    private String lastSyncStatus;
    private String lastSyncMessage;
    private LocalDateTime lastOrderImportedAt;
    private String createdByName;
    private String updatedByName;
}
