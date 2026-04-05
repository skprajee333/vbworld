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
public class AuditLogResponse {
    private UUID id;
    private String actorName;
    private String actorRole;
    private String moduleName;
    private String actionType;
    private String entityType;
    private UUID entityId;
    private String summary;
    private String details;
    private LocalDateTime createdAt;
}
