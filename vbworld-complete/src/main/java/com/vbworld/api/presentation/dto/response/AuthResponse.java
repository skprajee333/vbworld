package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private UserInfo user;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserInfo {
        private UUID id;
        private String name;
        private String email;
        private String role;
        private UUID branchId;
        private String branchName;
        private boolean impersonated;
        private UUID actorUserId;
        private String actorName;
        private String actorRole;
    }
}
