package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionMatrixResponse {
    private UUID userId;
    private String userName;
    private String userEmail;
    private String role;
    private String branchName;
    private List<PermissionEntry> permissions;
    private LocalDateTime generatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PermissionEntry {
        private String key;
        private String label;
        private String description;
        private boolean enabled;
        private boolean defaultEnabled;
        private String source;
    }
}
