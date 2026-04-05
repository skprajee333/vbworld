package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FraudControlRuleResponse {
    private UUID id;
    private String ruleCode;
    private String ruleName;
    private String moduleScope;
    private String riskLevel;
    private BigDecimal thresholdValue;
    private String thresholdUnit;
    private boolean enabled;
    private boolean autoCreateException;
    private List<String> escalationRoles;
    private LocalDateTime updatedAt;
}
