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
public class AppNotificationResponse {
    private UUID id;
    private String notificationType;
    private String title;
    private String message;
    private String actionUrl;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
