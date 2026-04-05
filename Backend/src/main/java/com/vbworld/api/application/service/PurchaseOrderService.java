package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.ItemEntity;
import com.vbworld.api.infrastructure.entity.PurchaseOrderEntity;
import com.vbworld.api.infrastructure.entity.PurchaseOrderItemEntity;
import com.vbworld.api.infrastructure.entity.SupplierEntity;
import com.vbworld.api.infrastructure.entity.SupplierItemMappingEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockEntity;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import com.vbworld.api.infrastructure.repository.PurchaseOrderRepository;
import com.vbworld.api.infrastructure.repository.SupplierItemMappingRepository;
import com.vbworld.api.infrastructure.repository.SupplierRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import com.vbworld.api.presentation.dto.response.ProcurementPlanResponse;
import com.vbworld.api.presentation.dto.response.PurchaseOrderSupplierRecommendationResponse;
import com.vbworld.api.presentation.dto.response.PurchaseOrderResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierItemMappingRepository supplierItemMappingRepository;
    private final ItemRepository itemRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final GovernanceService governanceService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> listPurchaseOrders(String search, UserEntity currentUser) {
        ensureWarehouseRole(currentUser);
        String normalizedSearch = normalize(search);
        return (normalizedSearch == null
            ? purchaseOrderRepository.findAllDetailed()
            : purchaseOrderRepository.findAllDetailedBySearch(normalizedSearch))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderSupplierRecommendationResponse> getSupplierRecommendations(
        List<UUID> itemIds,
        UserEntity currentUser
    ) {
        ensureWarehouseRole(currentUser);
        List<UUID> normalizedIds = itemIds == null ? List.of() : itemIds.stream().distinct().toList();
        if (normalizedIds.isEmpty()) {
            return List.of();
        }

        List<SupplierItemMappingEntity> mappings = supplierItemMappingRepository.findActiveMappingsForItems(normalizedIds);
        Map<UUID, RecommendationAccumulator> suppliers = new LinkedHashMap<>();
        for (SupplierItemMappingEntity mapping : mappings) {
            RecommendationAccumulator acc = suppliers.computeIfAbsent(
                mapping.getSupplier().getId(),
                ignored -> new RecommendationAccumulator(mapping.getSupplier()));
            acc.add(mapping);
        }

        return suppliers.values().stream()
            .sorted(Comparator
                .comparingInt(RecommendationAccumulator::preferredCount).reversed()
                .thenComparingInt(RecommendationAccumulator::mappedCount).reversed()
                .thenComparingInt(RecommendationAccumulator::averageLeadTimeDays)
                .thenComparing(RecommendationAccumulator::averageUnitCost,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(acc -> acc.supplier().getName(), String.CASE_INSENSITIVE_ORDER))
            .map(RecommendationAccumulator::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProcurementPlanResponse> getProcurementPlan(UserEntity currentUser) {
        ensureWarehouseRole(currentUser);

        List<WarehouseStockEntity> stocks = warehouseStockRepository.findAllWithItems();
        if (stocks.isEmpty()) {
            return List.of();
        }

        List<UUID> itemIds = stocks.stream().map(stock -> stock.getItem().getId()).toList();
        Map<UUID, BigDecimal> demandByItem = getAverageDailyDemand(itemIds);
        Map<UUID, SupplierItemMappingEntity> bestMappingByItem = getBestMappingByItem(itemIds);

        return stocks.stream()
            .map(stock -> toProcurementPlanResponse(stock, demandByItem, bestMappingByItem))
            .filter(plan -> plan.getSuggestedOrderQuantity().compareTo(BigDecimal.ZERO) > 0)
            .sorted(Comparator
                .comparingInt((ProcurementPlanResponse plan) -> urgencyRank(plan.getUrgency()))
                .thenComparing(ProcurementPlanResponse::getSuggestedOrderQuantity, Comparator.reverseOrder())
            .thenComparing(ProcurementPlanResponse::getItemName, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    @Transactional
    public List<PurchaseOrderResponse> createAutoDraftPurchaseOrders(boolean includeMedium, UserEntity currentUser) {
        ensureWarehouseRole(currentUser);

        List<ProcurementPlanResponse> plan = getProcurementPlan(currentUser).stream()
            .filter(item -> item.getRecommendedSupplierId() != null)
            .filter(item -> includeMedium || !"MEDIUM".equals(item.getUrgency()))
            .toList();

        if (plan.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<ProcurementPlanResponse>> groupedBySupplier = new LinkedHashMap<>();
        for (ProcurementPlanResponse item : plan) {
            groupedBySupplier.computeIfAbsent(item.getRecommendedSupplierId(), ignored -> new ArrayList<>()).add(item);
        }

        List<PurchaseOrderResponse> createdOrders = new ArrayList<>();
        for (Map.Entry<UUID, List<ProcurementPlanResponse>> entry : groupedBySupplier.entrySet()) {
            SupplierEntity supplier = supplierRepository.findById(entry.getKey())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + entry.getKey()));

            List<PurchaseOrderItemEntity> orderItems = new ArrayList<>();
            PurchaseOrderEntity purchaseOrder = PurchaseOrderEntity.builder()
                .poNumber(nextPoNumber())
                .supplier(supplier)
                .poStatus(PurchaseOrderEntity.PurchaseOrderStatus.DRAFT)
                .expectedDate(resolveAutoDraftExpectedDate(entry.getValue(), supplier))
                .referenceNumber("AUTO-" + LocalDate.now())
                .notes("Auto-draft generated from procurement planner")
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build();

            for (ProcurementPlanResponse row : entry.getValue()) {
                ItemEntity item = itemRepository.findById(row.getItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + row.getItemId()));

                orderItems.add(PurchaseOrderItemEntity.builder()
                    .purchaseOrder(purchaseOrder)
                    .item(item)
                    .orderedQuantity(row.getSuggestedOrderQuantity())
                    .receivedQuantity(BigDecimal.ZERO)
                    .unitCost(row.getRecommendedUnitCost())
                    .notes("Auto-draft: " + row.getRecommendationReason())
                    .build());
            }

            purchaseOrder.setItems(orderItems);
            PurchaseOrderEntity saved = purchaseOrderRepository.save(purchaseOrder);
            createdOrders.add(toResponse(saved));

            governanceService.logAction(
                currentUser,
                "PROCUREMENT",
                "PURCHASE_ORDER_AUTO_DRAFTED",
                "PURCHASE_ORDER",
                saved.getId(),
                "Auto-drafted purchase order " + saved.getPoNumber(),
                "Supplier: " + supplier.getName() + ", lines: " + orderItems.size());
        }

        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "PURCHASE_ORDER",
            "Auto-draft purchase orders created",
            createdOrders.size() + " draft purchase orders were generated from the procurement planner",
            "/purchase-orders",
            "PURCHASE_ORDER",
            createdOrders.get(0).getId());

        return createdOrders;
    }

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(
        UUID supplierId,
        LocalDate expectedDate,
        String referenceNumber,
        String notes,
        List<CreatePurchaseOrderLine> lines,
        UserEntity currentUser
    ) {
        ensureWarehouseRole(currentUser);

        if (supplierId == null) {
            throw new BusinessException("Supplier is required");
        }
        if (lines == null || lines.isEmpty()) {
            throw new BusinessException("At least one purchase order line is required");
        }

        SupplierEntity supplier = supplierRepository.findById(supplierId)
            .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + supplierId));

        PurchaseOrderEntity purchaseOrder = PurchaseOrderEntity.builder()
            .poNumber(nextPoNumber())
            .supplier(supplier)
            .poStatus(PurchaseOrderEntity.PurchaseOrderStatus.DRAFT)
            .expectedDate(expectedDate)
            .referenceNumber(normalize(referenceNumber))
            .notes(normalize(notes))
            .createdBy(currentUser)
            .updatedBy(currentUser)
            .build();

        List<PurchaseOrderItemEntity> orderItems = new ArrayList<>();
        for (CreatePurchaseOrderLine line : lines) {
            if (line.itemId() == null) {
                throw new BusinessException("Item is required for all purchase order lines");
            }
            if (line.orderedQuantity() == null || line.orderedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Ordered quantity must be greater than zero");
            }

            ItemEntity item = itemRepository.findById(line.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + line.itemId()));

            orderItems.add(PurchaseOrderItemEntity.builder()
                .purchaseOrder(purchaseOrder)
                .item(item)
                .orderedQuantity(line.orderedQuantity())
                .receivedQuantity(line.receivedQuantity() != null ? line.receivedQuantity() : BigDecimal.ZERO)
                .unitCost(line.unitCost())
                .notes(normalize(line.notes()))
                .build());
        }

        purchaseOrder.setItems(orderItems);
        PurchaseOrderEntity saved = purchaseOrderRepository.save(purchaseOrder);
        governanceService.logAction(
            currentUser,
            "PROCUREMENT",
            "PURCHASE_ORDER_CREATED",
            "PURCHASE_ORDER",
            saved.getId(),
            "Created purchase order " + saved.getPoNumber(),
            "Supplier: " + supplier.getName() + ", lines: " + orderItems.size());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "PURCHASE_ORDER",
            "Purchase order created",
            saved.getPoNumber() + " was created for " + supplier.getName(),
            "/purchase-orders",
            "PURCHASE_ORDER",
            saved.getId());
        log.info("Purchase order created: {} for supplier {}", saved.getPoNumber(), supplier.getName());
        return toResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse updateStatus(
        UUID id,
        PurchaseOrderEntity.PurchaseOrderStatus status,
        UserEntity currentUser
    ) {
        ensureWarehouseRole(currentUser);
        if (status == null) {
            throw new BusinessException("Purchase order status is required");
        }

        PurchaseOrderEntity purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found: " + id));

        purchaseOrder.setPoStatus(status);
        if (status == PurchaseOrderEntity.PurchaseOrderStatus.SENT && purchaseOrder.getSentAt() == null) {
            purchaseOrder.setSentAt(LocalDateTime.now());
        }
        purchaseOrder.setUpdatedBy(currentUser);

        PurchaseOrderEntity saved = purchaseOrderRepository.save(purchaseOrder);
        governanceService.logAction(
            currentUser,
            "PROCUREMENT",
            "PURCHASE_ORDER_STATUS_UPDATED",
            "PURCHASE_ORDER",
            saved.getId(),
            "Updated " + saved.getPoNumber() + " to " + status.name(),
            "Supplier: " + saved.getSupplier().getName());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "PURCHASE_ORDER",
            "Purchase order updated",
            saved.getPoNumber() + " is now " + status.name().replace('_', ' '),
            "/purchase-orders",
            "PURCHASE_ORDER",
            saved.getId());
        log.info("Purchase order status updated: {} -> {}", saved.getPoNumber(), status);
        return toResponse(saved);
    }

    private PurchaseOrderResponse toResponse(PurchaseOrderEntity purchaseOrder) {
        BigDecimal totalOrdered = BigDecimal.ZERO;
        BigDecimal totalReceived = BigDecimal.ZERO;

        List<PurchaseOrderResponse.PurchaseOrderLineResponse> lines = purchaseOrder.getItems().stream()
            .map(item -> {
                BigDecimal ordered = item.getOrderedQuantity() != null ? item.getOrderedQuantity() : BigDecimal.ZERO;
                BigDecimal received = item.getReceivedQuantity() != null ? item.getReceivedQuantity() : BigDecimal.ZERO;
                return PurchaseOrderResponse.PurchaseOrderLineResponse.builder()
                    .id(item.getId())
                    .itemId(item.getItem().getId())
                    .itemCode(item.getItem().getCode())
                    .itemName(item.getItem().getName())
                    .category(item.getItem().getCategory() != null ? item.getItem().getCategory().getName() : null)
                    .unit(item.getItem().getUnit())
                    .orderedQuantity(ordered)
                    .receivedQuantity(received)
                    .unitCost(item.getUnitCost())
                    .notes(item.getNotes())
                    .build();
            })
            .toList();

        for (PurchaseOrderResponse.PurchaseOrderLineResponse line : lines) {
            totalOrdered = totalOrdered.add(line.getOrderedQuantity() != null ? line.getOrderedQuantity() : BigDecimal.ZERO);
            totalReceived = totalReceived.add(line.getReceivedQuantity() != null ? line.getReceivedQuantity() : BigDecimal.ZERO);
        }

        return PurchaseOrderResponse.builder()
            .id(purchaseOrder.getId())
            .poNumber(purchaseOrder.getPoNumber())
            .supplierId(purchaseOrder.getSupplier().getId())
            .supplierCode(purchaseOrder.getSupplier().getCode())
            .supplierName(purchaseOrder.getSupplier().getName())
            .poStatus(purchaseOrder.getPoStatus().name())
            .expectedDate(purchaseOrder.getExpectedDate())
            .referenceNumber(purchaseOrder.getReferenceNumber())
            .notes(purchaseOrder.getNotes())
            .createdAt(purchaseOrder.getCreatedAt())
            .sentAt(purchaseOrder.getSentAt())
            .createdByName(purchaseOrder.getCreatedBy() != null ? purchaseOrder.getCreatedBy().getName() : null)
            .updatedByName(purchaseOrder.getUpdatedBy() != null ? purchaseOrder.getUpdatedBy().getName() : null)
            .totalOrderedQuantity(totalOrdered)
            .totalReceivedQuantity(totalReceived)
            .items(lines)
            .build();
    }

    private void ensureWarehouseRole(UserEntity currentUser) {
        if (!(currentUser.isAdmin() || currentUser.isWarehouse() || currentUser.isWarehouseAdmin())) {
            throw new AccessDeniedException("You do not have permission to manage purchase orders");
        }
    }

    private String nextPoNumber() {
        int next = purchaseOrderRepository.findTopByOrderByCreatedAtDesc()
            .map(PurchaseOrderEntity::getPoNumber)
            .map(last -> {
                String digits = last.replaceAll("[^0-9]", "");
                if (digits.isBlank()) return 1;
                return Integer.parseInt(digits) + 1;
            })
            .orElse(1);
        return String.format("PO-%05d", next);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record CreatePurchaseOrderLine(
        UUID itemId,
        BigDecimal orderedQuantity,
        BigDecimal receivedQuantity,
        BigDecimal unitCost,
        String notes
    ) {}

    private ProcurementPlanResponse toProcurementPlanResponse(
        WarehouseStockEntity stock,
        Map<UUID, BigDecimal> demandByItem,
        Map<UUID, SupplierItemMappingEntity> bestMappingByItem
    ) {
        BigDecimal currentStock = valueOrZero(stock.getQuantity());
        BigDecimal minLevel = valueOrZero(stock.getMinLevel());
        BigDecimal reorderLevel = valueOrZero(stock.getItem().getReorderLevel());
        BigDecimal maxLevel = stock.getMaxLevel();
        BigDecimal targetStock = maxLevel != null
            ? maxLevel
            : minLevel.max(reorderLevel).multiply(BigDecimal.valueOf(2));

        BigDecimal suggestedOrderQuantity = targetStock.subtract(currentStock).max(BigDecimal.ZERO);
        BigDecimal averageDailyDemand = demandByItem.getOrDefault(stock.getItem().getId(), BigDecimal.ZERO);
        BigDecimal estimatedDaysRemaining = averageDailyDemand.compareTo(BigDecimal.ZERO) > 0
            ? currentStock.divide(averageDailyDemand, 1, RoundingMode.HALF_UP)
            : null;

        SupplierItemMappingEntity mapping = bestMappingByItem.get(stock.getItem().getId());
        Integer leadTimeDays = mapping != null && mapping.getLeadTimeDays() != null
            ? mapping.getLeadTimeDays()
            : mapping != null
                ? mapping.getSupplier().getLeadTimeDays()
                : null;
        if (mapping != null && mapping.getMinOrderQuantity() != null
            && suggestedOrderQuantity.compareTo(mapping.getMinOrderQuantity()) < 0) {
            suggestedOrderQuantity = mapping.getMinOrderQuantity();
        }

        String urgency = resolveUrgency(currentStock, minLevel, estimatedDaysRemaining, leadTimeDays);
        LocalDate suggestedExpectedDate = leadTimeDays != null
            ? LocalDate.now().plusDays(leadTimeDays)
            : null;

        return ProcurementPlanResponse.builder()
            .itemId(stock.getItem().getId())
            .itemCode(stock.getItem().getCode())
            .itemName(stock.getItem().getName())
            .category(stock.getItem().getCategory() != null ? stock.getItem().getCategory().getName() : null)
            .unit(stock.getItem().getUnit())
            .currentStock(currentStock)
            .minLevel(minLevel)
            .maxLevel(maxLevel)
            .reorderLevel(reorderLevel)
            .targetStock(targetStock)
            .suggestedOrderQuantity(suggestedOrderQuantity)
            .averageDailyDemand(averageDailyDemand.compareTo(BigDecimal.ZERO) > 0 ? averageDailyDemand : null)
            .estimatedDaysRemaining(estimatedDaysRemaining)
            .urgency(urgency)
            .recommendedSupplierId(mapping != null ? mapping.getSupplier().getId() : null)
            .recommendedSupplierCode(mapping != null ? mapping.getSupplier().getCode() : null)
            .recommendedSupplierName(mapping != null ? mapping.getSupplier().getName() : null)
            .recommendedLeadTimeDays(leadTimeDays)
            .recommendedUnitCost(mapping != null ? mapping.getLastUnitCost() : null)
            .minOrderQuantity(mapping != null ? mapping.getMinOrderQuantity() : null)
            .preferredSupplier(mapping != null && mapping.isPreferred())
            .suggestedExpectedDate(suggestedExpectedDate)
            .recommendationReason(buildRecommendationReason(urgency, estimatedDaysRemaining, leadTimeDays, mapping))
            .build();
    }

    private LocalDate resolveAutoDraftExpectedDate(List<ProcurementPlanResponse> rows, SupplierEntity supplier) {
        return rows.stream()
            .map(ProcurementPlanResponse::getSuggestedExpectedDate)
            .filter(date -> date != null)
            .min(LocalDate::compareTo)
            .orElse(LocalDate.now().plusDays(supplier.getLeadTimeDays() != null ? supplier.getLeadTimeDays() : 2));
    }

    private Map<UUID, BigDecimal> getAverageDailyDemand(List<UUID> itemIds) {
        if (itemIds.isEmpty()) {
            return Map.of();
        }

        String sql = """
            SELECT ii.item_id, COALESCE(SUM(ii.requested_qty), 0) / 30.0 AS avg_daily_demand
            FROM indent_items ii
            JOIN indents i ON i.id = ii.indent_id
            WHERE ii.item_id IN :itemIds
              AND i.status NOT IN ('DRAFT', 'CANCELLED')
              AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY ii.item_id
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
            .setParameter("itemIds", itemIds)
            .getResultList();

        Map<UUID, BigDecimal> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID itemId = row[0] instanceof UUID uuid ? uuid : UUID.fromString(row[0].toString());
            result.put(itemId, toBigDecimal(row[1], 3));
        }
        return result;
    }

    private Map<UUID, SupplierItemMappingEntity> getBestMappingByItem(List<UUID> itemIds) {
        if (itemIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, SupplierItemMappingEntity> result = new HashMap<>();
        for (SupplierItemMappingEntity mapping : supplierItemMappingRepository.findActiveMappingsForItems(itemIds)) {
            result.compute(mapping.getItem().getId(), (itemId, existing) -> {
                if (existing == null) {
                    return mapping;
                }
                return compareMappings(mapping, existing) < 0 ? mapping : existing;
            });
        }
        return result;
    }

    private int compareMappings(SupplierItemMappingEntity left, SupplierItemMappingEntity right) {
        if (left.isPreferred() != right.isPreferred()) {
            return left.isPreferred() ? -1 : 1;
        }

        int leadCompare = Integer.compare(resolveLeadTime(left), resolveLeadTime(right));
        if (leadCompare != 0) {
            return leadCompare;
        }

        BigDecimal leftCost = left.getLastUnitCost();
        BigDecimal rightCost = right.getLastUnitCost();
        if (leftCost != null && rightCost != null) {
            int costCompare = leftCost.compareTo(rightCost);
            if (costCompare != 0) {
                return costCompare;
            }
        } else if (leftCost != null) {
            return -1;
        } else if (rightCost != null) {
            return 1;
        }

        return left.getSupplier().getName().compareToIgnoreCase(right.getSupplier().getName());
    }

    private int resolveLeadTime(SupplierItemMappingEntity mapping) {
        return mapping.getLeadTimeDays() != null ? mapping.getLeadTimeDays() : mapping.getSupplier().getLeadTimeDays();
    }

    private String resolveUrgency(
        BigDecimal currentStock,
        BigDecimal minLevel,
        BigDecimal estimatedDaysRemaining,
        Integer leadTimeDays
    ) {
        if (currentStock.compareTo(minLevel.divide(BigDecimal.valueOf(2), 3, RoundingMode.HALF_UP)) <= 0) {
            return "CRITICAL";
        }
        if (estimatedDaysRemaining != null && leadTimeDays != null
            && estimatedDaysRemaining.compareTo(BigDecimal.valueOf(leadTimeDays)) <= 0) {
            return "CRITICAL";
        }
        if (currentStock.compareTo(minLevel) <= 0) {
            return "HIGH";
        }
        if (estimatedDaysRemaining != null && leadTimeDays != null
            && estimatedDaysRemaining.compareTo(BigDecimal.valueOf(leadTimeDays + 2L)) <= 0) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private String buildRecommendationReason(
        String urgency,
        BigDecimal estimatedDaysRemaining,
        Integer leadTimeDays,
        SupplierItemMappingEntity mapping
    ) {
        StringBuilder reason = new StringBuilder(urgency).append(" priority");
        if (estimatedDaysRemaining != null) {
            reason.append(", around ").append(estimatedDaysRemaining).append(" days of stock left");
        }
        if (leadTimeDays != null) {
            reason.append(", vendor lead time ").append(leadTimeDays).append(" days");
        }
        if (mapping != null && mapping.isPreferred()) {
            reason.append(", mapped preferred vendor");
        }
        return reason.toString();
    }

    private int urgencyRank(String urgency) {
        return switch (urgency) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            default -> 2;
        };
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal toBigDecimal(Object value, int scale) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal.setScale(scale, RoundingMode.HALF_UP);
        }
        return new BigDecimal(value.toString()).setScale(scale, RoundingMode.HALF_UP);
    }

    private static class RecommendationAccumulator {
        private final SupplierEntity supplier;
        private final List<PurchaseOrderSupplierRecommendationResponse.CoveredItem> coveredItems = new ArrayList<>();
        private int preferredCount;
        private int mappedCount;
        private int totalLeadTime;
        private int leadTimeEntries;
        private BigDecimal totalCost = BigDecimal.ZERO;
        private int costEntries;

        private RecommendationAccumulator(SupplierEntity supplier) {
            this.supplier = supplier;
        }

        private void add(SupplierItemMappingEntity mapping) {
            mappedCount++;
            if (mapping.isPreferred()) {
                preferredCount++;
            }
            int leadTime = mapping.getLeadTimeDays() != null ? mapping.getLeadTimeDays() : supplier.getLeadTimeDays();
            totalLeadTime += leadTime;
            leadTimeEntries++;
            if (mapping.getLastUnitCost() != null) {
                totalCost = totalCost.add(mapping.getLastUnitCost());
                costEntries++;
            }
            coveredItems.add(PurchaseOrderSupplierRecommendationResponse.CoveredItem.builder()
                .itemId(mapping.getItem().getId())
                .itemCode(mapping.getItem().getCode())
                .itemName(mapping.getItem().getName())
                .preferred(mapping.isPreferred())
                .leadTimeDays(leadTime)
                .lastUnitCost(mapping.getLastUnitCost())
                .minOrderQuantity(mapping.getMinOrderQuantity())
                .build());
        }

        private SupplierEntity supplier() {
            return supplier;
        }

        private int preferredCount() {
            return preferredCount;
        }

        private int mappedCount() {
            return mappedCount;
        }

        private int averageLeadTimeDays() {
            return leadTimeEntries == 0 ? supplier.getLeadTimeDays() : Math.max(1, Math.round((float) totalLeadTime / leadTimeEntries));
        }

        private BigDecimal averageUnitCost() {
            return costEntries == 0 ? null : totalCost.divide(BigDecimal.valueOf(costEntries), 2, java.math.RoundingMode.HALF_UP);
        }

        private PurchaseOrderSupplierRecommendationResponse toResponse() {
            return PurchaseOrderSupplierRecommendationResponse.builder()
                .supplierId(supplier.getId())
                .supplierCode(supplier.getCode())
                .supplierName(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .phone(supplier.getPhone())
                .averageLeadTimeDays(averageLeadTimeDays())
                .averageUnitCost(averageUnitCost())
                .mappedItemCount(mappedCount)
                .preferredItemCount(preferredCount)
                .suggestedExpectedDate(LocalDate.now().plusDays(averageLeadTimeDays()))
                .coveredItems(coveredItems)
                .build();
        }
    }
}
