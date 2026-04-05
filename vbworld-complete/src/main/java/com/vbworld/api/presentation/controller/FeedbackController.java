package com.vbworld.api.presentation.controller;

import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.FeedbackEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.FeedbackRepository;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
@Tag(name = "Feedback", description = "User feedback and queries")
@SecurityRequirement(name = "bearerAuth")
public class FeedbackController {

    private final BranchRepository branchRepository;
    private final FeedbackRepository feedbackRepository;

    // ─── SUBMIT (any logged-in user) ─────────────────────────
    @PostMapping
    @Operation(summary = "Submit feedback or query")
    public ResponseEntity<ApiResponse<FeedbackDto>> submit(
        @AuthenticationPrincipal UserEntity currentUser,
        @Valid @RequestBody SubmitRequest req
    ) {
        String branchName = currentUser.getBranch() == null
            ? null
            : branchRepository.findById(currentUser.getBranch().getId()).map(branch -> branch.getName()).orElse(null);
        var fb = FeedbackEntity.builder()
            .user(currentUser)
            .userName(currentUser.getName())
            .userEmail(currentUser.getEmail())
            .branchName(branchName)
            .type(req.getType() != null ? req.getType() : "FEEDBACK")
            .subject(req.getSubject())
            .message(req.getMessage())
            .status("OPEN")
            .build();

        var saved = feedbackRepository.save(fb);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(toDto(saved)));
    }

    // ─── LIST ALL (Admin / Warehouse Admin) ──────────────────
    @GetMapping
    @Operation(summary = "List all feedback (Admin)")
    public ResponseEntity<ApiResponse<List<FeedbackDto>>> list(
        @RequestParam(required = false) String status,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        // Warehouse admin and admin can see all; restaurant staff see only their own
        List<FeedbackEntity> items;
        if (currentUser.canManageUsers()) {
            items = status != null
                ? feedbackRepository.findByStatusOrderByCreatedAtDesc(status)
                : feedbackRepository.findAllByOrderByCreatedAtDesc();
        } else {
            items = feedbackRepository.findByUser_IdOrderByCreatedAtDesc(currentUser.getId());
        }

        return ResponseEntity.ok(ApiResponse.ok(items.stream().map(this::toDto).toList()));
    }

    // ─── UPDATE STATUS (Admin / Warehouse Admin) ─────────────
    @PatchMapping("/{id}/status")
    @Operation(summary = "Update feedback status (Admin)")
    public ResponseEntity<ApiResponse<FeedbackDto>> updateStatus(
        @PathVariable UUID id,
        @RequestBody StatusRequest req,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        if (!currentUser.canManageUsers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.ok(null));
        }

        var fb = feedbackRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));

        fb.setStatus(req.getStatus());
        if (req.getAdminNote() != null) fb.setAdminNote(req.getAdminNote());

        return ResponseEntity.ok(ApiResponse.ok(toDto(feedbackRepository.save(fb))));
    }

    // ─── HELPERS ─────────────────────────────────────────────
    private FeedbackDto toDto(FeedbackEntity fb) {
        return new FeedbackDto(
            fb.getId(), fb.getUserName(), fb.getUserEmail(), fb.getBranchName(),
            fb.getType(), fb.getSubject(), fb.getMessage(),
            fb.getStatus(), fb.getAdminNote(), fb.getCreatedAt(), fb.getUpdatedAt()
        );
    }

    record FeedbackDto(
        UUID id, String userName, String userEmail, String branchName,
        String type, String subject, String message,
        String status, String adminNote,
        LocalDateTime createdAt, LocalDateTime updatedAt
    ) {}

    @Data static class SubmitRequest {
        private String type;       // FEEDBACK | QUERY | BUG | COMPLAINT
        @NotBlank private String subject;
        @NotBlank private String message;
    }

    @Data static class StatusRequest {
        @NotBlank private String status;   // OPEN | IN_PROGRESS | RESOLVED
        private String adminNote;
    }
}
