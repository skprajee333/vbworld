package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemMonitorResponse {
    private LocalDateTime generatedAt;
    private int pendingApprovals;
    private long openFeedbackCount;
    private long lowStockCount;
    private long submittedIndents;
    private int unreadNotifications;
    private long governanceEvents24h;
    private long impersonationEvents24h;
    private long openExceptions;
    private long highRiskExceptions;
    private long activeFraudRules;
    private long triggeredRules24h;
    private List<MonitorEvent> recentEvents;
    private List<ExceptionEvent> recentExceptions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonitorEvent {
        private String moduleName;
        private String actionType;
        private String actorName;
        private String actorRole;
        private String summary;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExceptionEvent {
        private String title;
        private String moduleName;
        private String riskLevel;
        private String status;
        private String summary;
        private LocalDateTime triggeredAt;
    }
}
