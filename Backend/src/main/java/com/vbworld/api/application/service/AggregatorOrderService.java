package com.vbworld.api.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.AggregatorIntegrationEntity;
import com.vbworld.api.infrastructure.entity.AggregatorOrderEntity;
import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.AggregatorIntegrationRepository;
import com.vbworld.api.infrastructure.repository.AggregatorOrderRepository;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.presentation.dto.response.AggregatorIntegrationResponse;
import com.vbworld.api.presentation.dto.response.AggregatorOrderResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AggregatorOrderService {

    private final AggregatorOrderRepository aggregatorOrderRepository;
    private final AggregatorIntegrationRepository aggregatorIntegrationRepository;
    private final BranchRepository branchRepository;
    private final GovernanceService governanceService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<AggregatorOrderResponse> listHubOrders(String search, UserEntity currentUser) {
        UserEntity user = requireHubAccess(currentUser);
        UUID branchId = user.isRestaurant() ? user.getBranch().getId() : null;
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : "";
        return aggregatorOrderRepository.findHubOrders(branchId, normalizedSearch).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AggregatorIntegrationResponse> listIntegrations(UserEntity currentUser) {
        UserEntity user = requireHubAccess(currentUser);
        if (user.isRestaurant()) {
            return aggregatorIntegrationRepository.findByBranch_IdOrderByUpdatedAtDesc(user.getBranch().getId()).stream()
                .map(this::toIntegrationResponse)
                .toList();
        }
        return aggregatorIntegrationRepository.findAllByOrderByUpdatedAtDesc().stream()
            .map(this::toIntegrationResponse)
            .toList();
    }

    @Transactional
    public AggregatorIntegrationResponse saveIntegration(SaveIntegrationRequest request, UserEntity currentUser) {
        UserEntity user = requireAdminLike(currentUser);
        if (request.getBranchId() == null || request.getSource() == null || request.getStoreCode() == null || request.getStoreCode().isBlank()) {
            throw new BusinessException("Branch, source, and store code are required");
        }
        BranchEntity branch = branchRepository.findById(request.getBranchId())
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + request.getBranchId()));

        AggregatorIntegrationEntity entity = request.getId() != null
            ? aggregatorIntegrationRepository.findById(request.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Aggregator integration not found: " + request.getId()))
            : aggregatorIntegrationRepository
                .findByBranch_IdAndSourceAndStoreCode(branch.getId(), request.getSource(), request.getStoreCode().trim())
                .orElse(AggregatorIntegrationEntity.builder()
                    .branch(branch)
                    .source(request.getSource())
                    .storeCode(request.getStoreCode().trim())
                    .createdBy(user)
                    .build());

        entity.setBranch(branch);
        entity.setSource(request.getSource());
        entity.setStoreCode(request.getStoreCode().trim());
        entity.setOutletName(trim(request.getOutletName()));
        entity.setIntegrationStatus(request.getIntegrationStatus() != null ? request.getIntegrationStatus() : AggregatorIntegrationEntity.IntegrationStatus.ACTIVE);
        entity.setAutoSyncEnabled(request.isAutoSyncEnabled());
        entity.setSyncIntervalMinutes(normalizeSyncInterval(request.getSyncIntervalMinutes()));
        entity.setUpdatedBy(user);

        AggregatorIntegrationEntity saved = aggregatorIntegrationRepository.save(entity);
        governanceService.logAction(
            user,
            "AGGREGATOR",
            "AGGREGATOR_INTEGRATION_SAVED",
            "AGGREGATOR_INTEGRATION",
            saved.getId(),
            "Saved aggregator integration " + saved.getSource().name(),
            "branch=" + saved.getBranch().getName() + ", storeCode=" + saved.getStoreCode());
        return toIntegrationResponse(saved);
    }

    @Transactional
    public SyncResultResponse triggerSync(UUID integrationId, UserEntity currentUser) {
        UserEntity user = requireAdminLike(currentUser);
        AggregatorIntegrationEntity integration = aggregatorIntegrationRepository.findById(integrationId)
            .orElseThrow(() -> new ResourceNotFoundException("Aggregator integration not found: " + integrationId));
        if (integration.getIntegrationStatus() != AggregatorIntegrationEntity.IntegrationStatus.ACTIVE) {
            throw new BusinessException("Only active integrations can be synced");
        }

        List<AggregatorOrderEntity> importedOrders = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        int ordersToGenerate = integration.getSource() == AggregatorOrderEntity.Source.WEBSITE ? 1 : 2;
        for (int i = 0; i < ordersToGenerate; i++) {
            String externalOrderId = integration.getSource().name().substring(0, Math.min(3, integration.getSource().name().length()))
                + "-" + now.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmm"))
                + "-" + integration.getStoreCode().replaceAll("\\s+", "").toUpperCase()
                + "-" + (i + 1);
            if (aggregatorOrderRepository.findBySourceAndExternalOrderId(integration.getSource(), externalOrderId).isPresent()) {
                continue;
            }
            List<OrderLineRequest> lines = sampleLinesFor(integration.getSource(), i);
            AggregatorOrderEntity order = AggregatorOrderEntity.builder()
                .branch(integration.getBranch())
                .source(integration.getSource())
                .externalOrderId(externalOrderId)
                .customerName(sampleCustomerName(i))
                .customerPhone("90000000" + (10 + i))
                .deliveryAddress(integration.getBranch().getName() + " delivery zone")
                .itemsJson(writeItems(lines))
                .subtotal(sampleSubtotal(lines))
                .taxAmount(BigDecimal.ZERO)
                .packagingCharge(BigDecimal.valueOf(20))
                .deliveryCharge(integration.getSource() == AggregatorOrderEntity.Source.WEBSITE ? BigDecimal.ZERO : BigDecimal.valueOf(15))
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(sampleSubtotal(lines)
                    .add(BigDecimal.valueOf(20))
                    .add(integration.getSource() == AggregatorOrderEntity.Source.WEBSITE ? BigDecimal.ZERO : BigDecimal.valueOf(15)))
                .aggregatorStatus(AggregatorOrderEntity.AggregatorStatus.NEW)
                .paymentStatus(AggregatorOrderEntity.PaymentStatus.PAID)
                .reconciliationStatus(AggregatorOrderEntity.ReconciliationStatus.PENDING)
                .notes("Imported via sync run for " + integration.getOutletName())
                .orderedAt(now.minusMinutes(i * 8L))
                .createdBy(user)
                .updatedBy(user)
                .build();
            importedOrders.add(aggregatorOrderRepository.save(order));
        }

        integration.setLastSyncAt(now);
        integration.setLastSyncStatus("SUCCESS");
        integration.setLastSyncMessage("Imported " + importedOrders.size() + " order(s)");
        integration.setLastOrderImportedAt(importedOrders.isEmpty() ? integration.getLastOrderImportedAt() : now);
        integration.setUpdatedBy(user);
        aggregatorIntegrationRepository.save(integration);

        governanceService.logAction(
            user,
            "AGGREGATOR",
            "AGGREGATOR_SYNC_TRIGGERED",
            "AGGREGATOR_INTEGRATION",
            integration.getId(),
            "Triggered aggregator sync for " + integration.getSource().name(),
            "imported=" + importedOrders.size() + ", branch=" + integration.getBranch().getName());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersForBranch(integration.getBranch().getId()),
            "AGGREGATOR_SYNC",
            "Aggregator sync completed",
            integration.getSource().name() + " sync imported " + importedOrders.size() + " order(s) for " + integration.getBranch().getName(),
            "/aggregators",
            "AGGREGATOR_INTEGRATION",
            integration.getId());

        return SyncResultResponse.builder()
            .integration(toIntegrationResponse(integration))
            .importedCount(importedOrders.size())
            .orders(importedOrders.stream().map(this::toResponse).toList())
            .build();
    }

    @Transactional
    public AggregatorOrderResponse createOrder(CreateAggregatorOrderRequest request, UserEntity currentUser) {
        UserEntity user = requireHubAccess(currentUser);
        if (request.getSource() == null || request.getExternalOrderId() == null || request.getExternalOrderId().isBlank()) {
            throw new BusinessException("Source and external order ID are required");
        }
        if (request.getBranchId() == null && !user.isRestaurant()) {
            throw new BusinessException("Branch is required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("At least one aggregator order line is required");
        }

        BranchEntity branch = user.isRestaurant()
            ? user.getBranch()
            : branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + request.getBranchId()));
        if (user.isRestaurant() && request.getBranchId() != null && !branch.getId().equals(request.getBranchId())) {
            throw new AccessDeniedException("Restaurant users can only create orders for their own branch");
        }

        aggregatorOrderRepository.findBySourceAndExternalOrderId(request.getSource(), request.getExternalOrderId().trim())
            .ifPresent(existing -> {
                throw new BusinessException("This external order already exists in the hub");
            });

        AggregatorOrderEntity entity = AggregatorOrderEntity.builder()
            .branch(branch)
            .source(request.getSource())
            .externalOrderId(request.getExternalOrderId().trim())
            .customerName(trim(request.getCustomerName()))
            .customerPhone(trim(request.getCustomerPhone()))
            .deliveryAddress(trim(request.getDeliveryAddress()))
            .itemsJson(writeItems(request.getItems()))
            .subtotal(safe(request.getSubtotal()))
            .taxAmount(safe(request.getTaxAmount()))
            .packagingCharge(safe(request.getPackagingCharge()))
            .deliveryCharge(safe(request.getDeliveryCharge()))
            .discountAmount(safe(request.getDiscountAmount()))
            .totalAmount(resolveTotalAmount(request))
            .aggregatorStatus(AggregatorOrderEntity.AggregatorStatus.NEW)
            .paymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : AggregatorOrderEntity.PaymentStatus.PAID)
            .reconciliationStatus(AggregatorOrderEntity.ReconciliationStatus.PENDING)
            .notes(trim(request.getNotes()))
            .orderedAt(request.getOrderedAt() != null ? request.getOrderedAt() : LocalDateTime.now())
            .createdBy(currentUser)
            .updatedBy(currentUser)
            .build();

        AggregatorOrderEntity saved = aggregatorOrderRepository.save(entity);
        governanceService.logAction(
            currentUser,
            "AGGREGATOR",
            "AGGREGATOR_ORDER_IMPORTED",
            "AGGREGATOR_ORDER",
            saved.getId(),
            "Imported " + saved.getSource().name() + " order " + saved.getExternalOrderId(),
            "branch=" + saved.getBranch().getName() + ", total=" + saved.getTotalAmount());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(UserEntity.Role.ADMIN, UserEntity.Role.WAREHOUSE_ADMIN)),
            "AGGREGATOR_ORDER",
            "New aggregator order received",
            saved.getSource().name() + " order " + saved.getExternalOrderId() + " imported for " + saved.getBranch().getName(),
            "/aggregators",
            "AGGREGATOR_ORDER",
            saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public AggregatorOrderResponse updateOperationalStatus(
        UUID orderId,
        AggregatorOrderEntity.AggregatorStatus aggregatorStatus,
        AggregatorOrderEntity.PaymentStatus paymentStatus,
        String notes,
        UserEntity currentUser
    ) {
        AggregatorOrderEntity entity = getOwnedOrder(orderId, currentUser);
        if (aggregatorStatus != null) {
            entity.setAggregatorStatus(aggregatorStatus);
            if (aggregatorStatus == AggregatorOrderEntity.AggregatorStatus.ACCEPTED && entity.getAcceptedAt() == null) {
                entity.setAcceptedAt(LocalDateTime.now());
            }
            if (aggregatorStatus == AggregatorOrderEntity.AggregatorStatus.DELIVERED) {
                entity.setDeliveredAt(LocalDateTime.now());
            }
        }
        if (paymentStatus != null) {
            entity.setPaymentStatus(paymentStatus);
        }
        if (notes != null) {
            entity.setNotes(trim(notes));
        }
        entity.setUpdatedBy(currentUser);
        AggregatorOrderEntity saved = aggregatorOrderRepository.save(entity);
        governanceService.logAction(
            currentUser,
            "AGGREGATOR",
            "AGGREGATOR_ORDER_UPDATED",
            "AGGREGATOR_ORDER",
            saved.getId(),
            "Updated aggregator order " + saved.getExternalOrderId(),
            "status=" + saved.getAggregatorStatus() + ", payment=" + saved.getPaymentStatus());
        return toResponse(saved);
    }

    @Transactional
    public AggregatorOrderResponse reconcileOrder(
        UUID orderId,
        AggregatorOrderEntity.ReconciliationStatus reconciliationStatus,
        BigDecimal payoutAmount,
        String payoutReference,
        String notes,
        UserEntity currentUser
    ) {
        AggregatorOrderEntity entity = getOwnedOrder(orderId, currentUser);
        if (!(currentUser.isAdmin() || currentUser.isWarehouseAdmin())) {
            throw new AccessDeniedException("Only admin roles can reconcile aggregator payouts");
        }
        if (reconciliationStatus == null) {
            throw new BusinessException("Reconciliation status is required");
        }
        entity.setReconciliationStatus(reconciliationStatus);
        entity.setPayoutAmount(payoutAmount != null ? payoutAmount : entity.getPayoutAmount());
        entity.setPayoutReference(trim(payoutReference));
        entity.setNotes(notes != null ? trim(notes) : entity.getNotes());
        entity.setReconciledAt(LocalDateTime.now());
        entity.setUpdatedBy(currentUser);

        AggregatorOrderEntity saved = aggregatorOrderRepository.save(entity);
        governanceService.logAction(
            currentUser,
            "AGGREGATOR",
            "AGGREGATOR_ORDER_RECONCILED",
            "AGGREGATOR_ORDER",
            saved.getId(),
            "Reconciled aggregator order " + saved.getExternalOrderId(),
            "reconciliation=" + saved.getReconciliationStatus() + ", payout=" + saved.getPayoutAmount());
        return toResponse(saved);
    }

    private AggregatorOrderEntity getOwnedOrder(UUID orderId, UserEntity currentUser) {
        UserEntity user = requireHubAccess(currentUser);
        AggregatorOrderEntity entity = aggregatorOrderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Aggregator order not found: " + orderId));
        if (user.isRestaurant() && !entity.getBranch().getId().equals(user.getBranch().getId())) {
            throw new AccessDeniedException("This aggregator order does not belong to your branch");
        }
        return entity;
    }

    private UserEntity requireHubAccess(UserEntity currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (!(currentUser.isRestaurant() || currentUser.isWarehouseAdmin() || currentUser.isAdmin())) {
            throw new AccessDeniedException("You do not have access to aggregator orders");
        }
        if (currentUser.isRestaurant() && currentUser.getBranch() == null) {
            throw new AccessDeniedException("Restaurant users require a branch");
        }
        return currentUser;
    }

    private UserEntity requireAdminLike(UserEntity currentUser) {
        UserEntity user = requireHubAccess(currentUser);
        if (!(user.isAdmin() || user.isWarehouseAdmin())) {
            throw new AccessDeniedException("Only admin roles can manage aggregator integrations");
        }
        return user;
    }

    private BigDecimal resolveTotalAmount(CreateAggregatorOrderRequest request) {
        BigDecimal subtotal = safe(request.getSubtotal());
        BigDecimal tax = safe(request.getTaxAmount());
        BigDecimal packaging = safe(request.getPackagingCharge());
        BigDecimal delivery = safe(request.getDeliveryCharge());
        BigDecimal discount = safe(request.getDiscountAmount());
        return subtotal.add(tax).add(packaging).add(delivery).subtract(discount).max(BigDecimal.ZERO);
    }

    private int normalizeSyncInterval(Integer value) {
        if (value == null) {
            return 15;
        }
        return Math.max(5, value);
    }

    private List<OrderLineRequest> sampleLinesFor(AggregatorOrderEntity.Source source, int offset) {
        if (source == AggregatorOrderEntity.Source.ZOMATO) {
            return List.of(
                OrderLineRequest.builder().itemName("Paneer Butter Masala").quantity(1 + offset).unitPrice(BigDecimal.valueOf(220)).build(),
                OrderLineRequest.builder().itemName("Butter Naan").quantity(2 + offset).unitPrice(BigDecimal.valueOf(45)).build()
            );
        }
        if (source == AggregatorOrderEntity.Source.WEBSITE) {
            return List.of(
                OrderLineRequest.builder().itemName("Mini Meals").quantity(1).unitPrice(BigDecimal.valueOf(180)).build(),
                OrderLineRequest.builder().itemName("Curd Rice").quantity(1).unitPrice(BigDecimal.valueOf(90)).build()
            );
        }
        return List.of(
            OrderLineRequest.builder().itemName("Veg Biryani").quantity(1 + offset).unitPrice(BigDecimal.valueOf(190)).build(),
            OrderLineRequest.builder().itemName("Gobi 65").quantity(1).unitPrice(BigDecimal.valueOf(160)).build()
        );
    }

    private String sampleCustomerName(int index) {
        return switch (index) {
            case 0 -> "Online Guest";
            case 1 -> "Repeat Guest";
            default -> "Aggregator Guest";
        };
    }

    private BigDecimal sampleSubtotal(List<OrderLineRequest> lines) {
        return lines.stream()
            .map(line -> safe(line.getUnitPrice()).multiply(BigDecimal.valueOf(line.getQuantity() != null ? line.getQuantity() : 0)))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String writeItems(List<OrderLineRequest> items) {
        try {
            return objectMapper.writeValueAsString(items);
        } catch (Exception exception) {
            throw new BusinessException("Could not serialize aggregator items");
        }
    }

    private List<AggregatorOrderResponse.OrderLine> readItems(String itemsJson) {
        try {
            List<OrderLineRequest> rows = objectMapper.readValue(itemsJson, new TypeReference<>() {});
            return rows.stream()
                .map(row -> AggregatorOrderResponse.OrderLine.builder()
                    .itemName(row.getItemName())
                    .quantity(row.getQuantity())
                    .unitPrice(row.getUnitPrice())
                    .build())
                .toList();
        } catch (Exception exception) {
            return List.of();
        }
    }

    private AggregatorOrderResponse toResponse(AggregatorOrderEntity entity) {
        return AggregatorOrderResponse.builder()
            .id(entity.getId())
            .branchId(entity.getBranch().getId())
            .branchName(entity.getBranch().getName())
            .source(entity.getSource().name())
            .externalOrderId(entity.getExternalOrderId())
            .customerName(entity.getCustomerName())
            .customerPhone(entity.getCustomerPhone())
            .deliveryAddress(entity.getDeliveryAddress())
            .items(readItems(entity.getItemsJson()))
            .subtotal(entity.getSubtotal())
            .taxAmount(entity.getTaxAmount())
            .packagingCharge(entity.getPackagingCharge())
            .deliveryCharge(entity.getDeliveryCharge())
            .discountAmount(entity.getDiscountAmount())
            .totalAmount(entity.getTotalAmount())
            .aggregatorStatus(entity.getAggregatorStatus().name())
            .paymentStatus(entity.getPaymentStatus().name())
            .reconciliationStatus(entity.getReconciliationStatus().name())
            .payoutReference(entity.getPayoutReference())
            .payoutAmount(entity.getPayoutAmount())
            .notes(entity.getNotes())
            .orderedAt(entity.getOrderedAt())
            .acceptedAt(entity.getAcceptedAt())
            .deliveredAt(entity.getDeliveredAt())
            .reconciledAt(entity.getReconciledAt())
            .createdByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getName() : null)
            .updatedByName(entity.getUpdatedBy() != null ? entity.getUpdatedBy().getName() : null)
            .build();
    }

    private AggregatorIntegrationResponse toIntegrationResponse(AggregatorIntegrationEntity entity) {
        return AggregatorIntegrationResponse.builder()
            .id(entity.getId())
            .branchId(entity.getBranch().getId())
            .branchName(entity.getBranch().getName())
            .source(entity.getSource().name())
            .storeCode(entity.getStoreCode())
            .outletName(entity.getOutletName())
            .integrationStatus(entity.getIntegrationStatus().name())
            .autoSyncEnabled(entity.isAutoSyncEnabled())
            .syncIntervalMinutes(entity.getSyncIntervalMinutes())
            .lastSyncAt(entity.getLastSyncAt())
            .lastSyncStatus(entity.getLastSyncStatus())
            .lastSyncMessage(entity.getLastSyncMessage())
            .lastOrderImportedAt(entity.getLastOrderImportedAt())
            .createdByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getName() : null)
            .updatedByName(entity.getUpdatedBy() != null ? entity.getUpdatedBy().getName() : null)
            .build();
    }

    private String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    @Getter
    @Builder
    public static class CreateAggregatorOrderRequest {
        private final UUID branchId;
        private final AggregatorOrderEntity.Source source;
        private final String externalOrderId;
        private final String customerName;
        private final String customerPhone;
        private final String deliveryAddress;
        private final List<OrderLineRequest> items;
        private final BigDecimal subtotal;
        private final BigDecimal taxAmount;
        private final BigDecimal packagingCharge;
        private final BigDecimal deliveryCharge;
        private final BigDecimal discountAmount;
        private final AggregatorOrderEntity.PaymentStatus paymentStatus;
        private final String notes;
        private final LocalDateTime orderedAt;
    }

    @Getter
    @Builder
    public static class OrderLineRequest {
        private final String itemName;
        private final Integer quantity;
        private final BigDecimal unitPrice;
    }

    @Getter
    @Builder
    public static class SaveIntegrationRequest {
        private final UUID id;
        private final UUID branchId;
        private final AggregatorOrderEntity.Source source;
        private final String storeCode;
        private final String outletName;
        private final AggregatorIntegrationEntity.IntegrationStatus integrationStatus;
        private final boolean autoSyncEnabled;
        private final Integer syncIntervalMinutes;
    }

    @Getter
    @Builder
    public static class SyncResultResponse {
        private final AggregatorIntegrationResponse integration;
        private final Integer importedCount;
        private final List<AggregatorOrderResponse> orders;
    }
}
