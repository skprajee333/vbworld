package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.*;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.BranchTransferRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import com.vbworld.api.presentation.dto.response.BranchTransferResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final BranchTransferRepository branchTransferRepository;
    private final BranchRepository branchRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final GovernanceService governanceService;

    @Transactional(readOnly = true)
    public List<BranchTransferResponse> listTransfers(String search, UserEntity currentUser) {
        ensureWarehouseRole(currentUser);
        String normalizedSearch = normalize(search);
        return (normalizedSearch == null
            ? branchTransferRepository.findRecentTransfers()
            : branchTransferRepository.findRecentTransfersBySearch(normalizedSearch))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BranchTransferResponse> listMyBranchTransfers(String search, UserEntity currentUser) {
        if (currentUser.getBranch() == null) {
            throw new IllegalArgumentException("Current user is not linked to a branch");
        }
        String normalizedSearch = normalize(search);
        return (normalizedSearch == null
            ? branchTransferRepository.findRecentTransfersForBranch(currentUser.getBranch().getId())
            : branchTransferRepository.findRecentTransfersForBranchBySearch(
                currentUser.getBranch().getId(), normalizedSearch))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BranchTransferResponse createTransfer(
        UUID itemId,
        UUID destinationBranchId,
        BigDecimal quantityTransferred,
        String referenceNumber,
        String notes,
        UserEntity currentUser
    ) {
        ensureWarehouseRole(currentUser);

        if (itemId == null) {
            throw new IllegalArgumentException("Item is required");
        }
        if (destinationBranchId == null) {
            throw new IllegalArgumentException("Destination branch is required");
        }
        if (quantityTransferred == null || quantityTransferred.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer quantity must be greater than zero");
        }

        WarehouseStockEntity stock = warehouseStockRepository.findByItem_Id(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("No warehouse stock for item: " + itemId));

        BranchEntity destinationBranch = branchRepository.findById(destinationBranchId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + destinationBranchId));

        BigDecimal quantityBefore = stock.getQuantity();
        BigDecimal quantityAfter = quantityBefore.subtract(quantityTransferred);

        if (quantityAfter.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Not enough warehouse stock for this transfer");
        }

        stock.setQuantity(quantityAfter);
        stock.setLastUpdatedAt(LocalDateTime.now());
        stock.setUpdatedBy(currentUser);
        warehouseStockRepository.save(stock);

        BranchTransferEntity transfer = branchTransferRepository.save(
            BranchTransferEntity.builder()
                .item(stock.getItem())
                .stock(stock)
                .destinationBranch(destinationBranch)
                .transferStatus(BranchTransferEntity.TransferStatus.IN_TRANSIT)
                .quantityTransferred(quantityTransferred)
                .quantityBefore(quantityBefore)
                .quantityAfter(quantityAfter)
                .referenceNumber(normalize(referenceNumber))
                .notes(normalize(notes))
                .transferredAt(LocalDateTime.now())
                .transferredBy(currentUser)
                .build()
        );

        governanceService.logAction(
            currentUser,
            "TRANSFERS",
            "TRANSFER_CREATED",
            "BRANCH_TRANSFER",
            transfer.getId(),
            "Created transfer to " + destinationBranch.getName(),
            "Item: " + stock.getItem().getName() + ", qty: " + quantityTransferred);
        governanceService.notifyUsers(
            governanceService.getApprovedUsersForBranch(destinationBranchId),
            "TRANSFER",
            "Incoming stock transfer",
            stock.getItem().getName() + " is on the way to " + destinationBranch.getName(),
            "/transfers",
            "BRANCH_TRANSFER",
            transfer.getId());

        log.info("Branch transfer created: item={} branch={} qty={}",
            stock.getItem().getName(), destinationBranch.getName(), quantityTransferred);

        return toResponse(transfer);
    }

    @Transactional
    public BranchTransferResponse receiveTransfer(UUID id, String notes, UserEntity currentUser) {
        BranchTransferEntity transfer = branchTransferRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Transfer not found: " + id));

        if (transfer.getTransferStatus() == BranchTransferEntity.TransferStatus.RECEIVED) {
            throw new IllegalArgumentException("Transfer has already been received");
        }

        boolean privileged = hasWarehouseRole(currentUser);
        UUID currentBranchId = currentUser.getBranch() != null ? currentUser.getBranch().getId() : null;
        if (!privileged && (currentBranchId == null
            || !currentBranchId.equals(transfer.getDestinationBranch().getId()))) {
            throw new AccessDeniedException("You can only receive transfers for your own branch");
        }

        transfer.setTransferStatus(BranchTransferEntity.TransferStatus.RECEIVED);
        transfer.setReceivedAt(LocalDateTime.now());
        transfer.setReceivedBy(currentUser);
        if (normalize(notes) != null) {
            String existing = transfer.getNotes();
            transfer.setNotes(existing == null
                ? notes.trim()
                : existing + "\nReceived note: " + notes.trim());
        }

        BranchTransferEntity saved = branchTransferRepository.save(transfer);
        governanceService.logAction(
            currentUser,
            "TRANSFERS",
            "TRANSFER_RECEIVED",
            "BRANCH_TRANSFER",
            saved.getId(),
            "Received transfer for " + saved.getDestinationBranch().getName(),
            "Item: " + saved.getItem().getName() + ", qty: " + saved.getQuantityTransferred());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "TRANSFER",
            "Transfer received",
            saved.getDestinationBranch().getName() + " confirmed receipt of " + saved.getItem().getName(),
            "/transfers",
            "BRANCH_TRANSFER",
            saved.getId());
        log.info("Branch transfer received: transferId={} branch={}",
            saved.getId(), saved.getDestinationBranch().getName());
        return toResponse(saved);
    }

    private BranchTransferResponse toResponse(BranchTransferEntity transfer) {
        return BranchTransferResponse.builder()
            .id(transfer.getId())
            .itemId(transfer.getItem().getId())
            .itemCode(transfer.getItem().getCode())
            .itemName(transfer.getItem().getName())
            .category(transfer.getItem().getCategory() != null
                ? transfer.getItem().getCategory().getName() : null)
            .unit(transfer.getItem().getUnit())
            .destinationBranchId(transfer.getDestinationBranch().getId())
            .destinationBranchName(transfer.getDestinationBranch().getName())
            .transferStatus(transfer.getTransferStatus().name())
            .quantityTransferred(transfer.getQuantityTransferred())
            .quantityBefore(transfer.getQuantityBefore())
            .quantityAfter(transfer.getQuantityAfter())
            .referenceNumber(transfer.getReferenceNumber())
            .notes(transfer.getNotes())
            .transferredAt(transfer.getTransferredAt())
            .transferredByName(transfer.getTransferredBy() != null
                ? transfer.getTransferredBy().getName() : null)
            .receivedAt(transfer.getReceivedAt())
            .receivedByName(transfer.getReceivedBy() != null
                ? transfer.getReceivedBy().getName() : null)
            .build();
    }

    private void ensureWarehouseRole(UserEntity currentUser) {
        if (!hasWarehouseRole(currentUser)) {
            throw new AccessDeniedException("You do not have permission to manage transfers");
        }
    }

    private boolean hasWarehouseRole(UserEntity currentUser) {
        return currentUser.getRole() == UserEntity.Role.ADMIN
            || currentUser.getRole() == UserEntity.Role.WAREHOUSE_ADMIN
            || currentUser.getRole() == UserEntity.Role.WAREHOUSE_MANAGER;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
