package com.vbworld.api.infrastructure.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthSessionDetails {
    private UUID actorUserId;
    private String actorRole;
    private String actorName;
    private boolean impersonated;
}
