package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.TransferService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.BranchTransferResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
@Tag(name = "Transfers", description = "Warehouse to branch transfer workflow")
@SecurityRequirement(name = "bearerAuth")
public class TransferController {

    private final TransferService transferService;

    @GetMapping
    @Operation(summary = "List all branch transfers for warehouse/admin roles")
    public ResponseEntity<ApiResponse<List<BranchTransferResponse>>> listTransfers(
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            transferService.listTransfers(search, currentUser)));
    }

    @GetMapping("/mine")
    @Operation(summary = "List incoming branch transfers for the current user's branch")
    public ResponseEntity<ApiResponse<List<BranchTransferResponse>>> listMyTransfers(
        @RequestParam(required = false) String search,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            transferService.listMyBranchTransfers(search, currentUser)));
    }

    @PostMapping
    @Operation(summary = "Create a warehouse to branch transfer")
    public ResponseEntity<ApiResponse<BranchTransferResponse>> createTransfer(
        @RequestBody CreateTransferRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Transfer created successfully",
            transferService.createTransfer(
                request.getItemId(),
                request.getDestinationBranchId(),
                request.getQuantityTransferred(),
                request.getReferenceNumber(),
                request.getNotes(),
                currentUser)));
    }

    @PostMapping("/{id}/receive")
    @Operation(summary = "Mark a branch transfer as received")
    public ResponseEntity<ApiResponse<BranchTransferResponse>> receiveTransfer(
        @PathVariable UUID id,
        @RequestBody(required = false) ReceiveTransferRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Transfer received successfully",
            transferService.receiveTransfer(
                id,
                request != null ? request.getNotes() : null,
                currentUser)));
    }

    @Data
    public static class CreateTransferRequest {
        private UUID itemId;
        private UUID destinationBranchId;
        private BigDecimal quantityTransferred;
        private String referenceNumber;
        private String notes;
    }

    @Data
    public static class ReceiveTransferRequest {
        private String notes;
    }
}
