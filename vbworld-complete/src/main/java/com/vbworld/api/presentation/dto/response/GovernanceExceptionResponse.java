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
public class GovernanceExceptionResponse {
    private UUID id;
    private UUID ruleId;
    private String ruleCode;
    private String ruleName;
    private String title;
    private String moduleName;
    private String entityType;
    private UUID entityId;
    private String riskLevel;
    private String status;
    private String summary;
    private String details;
    private String triggeredByName;
    private String assignedToName;
    private LocalDateTime triggeredAt;
    private LocalDateTime resolvedAt;
    private String resolutionNote;
}
