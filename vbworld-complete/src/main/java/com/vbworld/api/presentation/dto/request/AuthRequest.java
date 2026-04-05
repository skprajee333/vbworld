// ============================================================
// AUTH DTOs
// ============================================================
package com.vbworld.api.presentation.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class AuthRequest {

    @Data
    public static class Login {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class Refresh {
        @NotBlank(message = "Refresh token is required")
        private String refreshToken;
    }

    @Data
    public static class ChangePassword {
        @NotBlank private String currentPassword;
        @NotBlank private String newPassword;
    }
}
