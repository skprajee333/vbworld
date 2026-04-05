package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.ItemEntity;
import com.vbworld.api.infrastructure.entity.SupplierEntity;
import com.vbworld.api.infrastructure.entity.SupplierItemMappingEntity;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import com.vbworld.api.infrastructure.repository.SupplierItemMappingRepository;
import com.vbworld.api.infrastructure.repository.SupplierRepository;
import com.vbworld.api.presentation.dto.response.SupplierItemMappingResponse;
import com.vbworld.api.presentation.dto.response.SupplierResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierItemMappingRepository supplierItemMappingRepository;
    private final ItemRepository itemRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<SupplierResponse> getSuppliers(String search) {
        Map<UUID, SupplierPerformanceMetrics> performanceBySupplier = getSupplierPerformanceMetrics();
        return supplierRepository.findAllBySearch(normalizedSearch(search))
            .stream()
            .map(supplier -> toResponse(supplier, performanceBySupplier.get(supplier.getId())))
            .toList();
    }

    @Transactional
    public SupplierResponse createSupplier(CreateSupplierCommand command) {
        String code = normalized(command.code());
        if (code == null) {
            throw new BusinessException("Supplier code is required");
        }
        if (supplierRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new BusinessException("Supplier code already exists: " + code);
        }

        SupplierEntity saved = supplierRepository.save(
            SupplierEntity.builder()
                .code(code)
                .name(required(command.name(), "Supplier name is required"))
                .contactPerson(normalized(command.contactPerson()))
                .phone(normalized(command.phone()))
                .email(normalized(command.email()))
                .leadTimeDays(command.leadTimeDays() != null ? command.leadTimeDays() : 2)
                .address(normalized(command.address()))
                .notes(normalized(command.notes()))
                .active(command.active() == null || command.active())
                .build()
        );

        log.info("Supplier created: {} ({})", saved.getName(), saved.getCode());
        return toResponse(saved, getSupplierPerformanceMetrics().get(saved.getId()));
    }

    @Transactional
    public SupplierResponse updateSupplier(UUID id, UpdateSupplierCommand command) {
        SupplierEntity supplier = supplierRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));

        if (command.code() != null) {
            String code = normalized(command.code());
            if (code == null) {
                throw new BusinessException("Supplier code cannot be blank");
            }
            supplierRepository.findByCodeIgnoreCase(code)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new BusinessException("Supplier code already exists: " + code);
                });
            supplier.setCode(code);
        }
        if (command.name() != null) supplier.setName(required(command.name(), "Supplier name is required"));
        if (command.contactPerson() != null) supplier.setContactPerson(normalized(command.contactPerson()));
        if (command.phone() != null) supplier.setPhone(normalized(command.phone()));
        if (command.email() != null) supplier.setEmail(normalized(command.email()));
        if (command.leadTimeDays() != null) supplier.setLeadTimeDays(command.leadTimeDays());
        if (command.address() != null) supplier.setAddress(normalized(command.address()));
        if (command.notes() != null) supplier.setNotes(normalized(command.notes()));
        if (command.active() != null) supplier.setActive(command.active());

        SupplierEntity saved = supplierRepository.save(supplier);
        log.info("Supplier updated: {} ({})", saved.getName(), saved.getCode());
        return toResponse(saved, getSupplierPerformanceMetrics().get(saved.getId()));
    }

    @Transactional(readOnly = true)
    public List<SupplierItemMappingResponse> getSupplierItemMappings(UUID supplierId) {
        ensureSupplierExists(supplierId);
        return supplierItemMappingRepository.findBySupplierIdDetailed(supplierId)
            .stream()
            .map(this::toMappingResponse)
            .toList();
    }

    @Transactional
    public SupplierItemMappingResponse saveSupplierItemMapping(UUID supplierId, SaveSupplierItemMappingCommand command) {
        SupplierEntity supplier = ensureSupplierExists(supplierId);
        if (command.itemId() == null) {
            throw new BusinessException("Item is required");
        }

        ItemEntity item = itemRepository.findById(command.itemId())
            .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + command.itemId()));

        SupplierItemMappingEntity mapping = supplierItemMappingRepository
            .findBySupplier_IdAndItem_Id(supplierId, item.getId())
            .orElseGet(() -> SupplierItemMappingEntity.builder()
                .supplier(supplier)
                .item(item)
                .build());

        mapping.setSupplierSku(normalized(command.supplierSku()));
        mapping.setLastUnitCost(command.lastUnitCost());
        mapping.setMinOrderQuantity(command.minOrderQuantity());
        mapping.setLeadTimeDays(command.leadTimeDays());
        mapping.setPreferred(command.preferred() != null && command.preferred());
        mapping.setActive(command.active() == null || command.active());
        mapping.setNotes(normalized(command.notes()));

        SupplierItemMappingEntity saved = supplierItemMappingRepository.save(mapping);
        if (saved.isPreferred() && saved.isActive()) {
            supplierItemMappingRepository.clearPreferredForItemExcept(saved.getItem().getId(), saved.getId());
        }

        log.info("Supplier-item mapping saved: supplier={} item={} preferred={}",
            supplier.getName(), item.getName(), saved.isPreferred());
        return toMappingResponse(saved);
    }

    private SupplierResponse toResponse(SupplierEntity supplier, SupplierPerformanceMetrics performance) {
        List<SupplierItemMappingEntity> mappings = supplierItemMappingRepository.findBySupplierIdDetailed(supplier.getId());
        return SupplierResponse.builder()
            .id(supplier.getId())
            .code(supplier.getCode())
            .name(supplier.getName())
            .contactPerson(supplier.getContactPerson())
            .phone(supplier.getPhone())
            .email(supplier.getEmail())
            .leadTimeDays(supplier.getLeadTimeDays())
            .address(supplier.getAddress())
            .notes(supplier.getNotes())
            .active(supplier.isActive())
            .mappedItemCount(mappings.size())
            .preferredItemCount((int) mappings.stream().filter(SupplierItemMappingEntity::isPreferred).count())
            .totalPurchaseOrders(performance != null ? performance.totalPurchaseOrders() : 0)
            .completedPurchaseOrders(performance != null ? performance.completedPurchaseOrders() : 0)
            .fulfilmentPct(performance != null ? performance.fulfilmentPct() : 0.0)
            .discrepancyReceipts(performance != null ? performance.discrepancyReceipts() : 0)
            .createdAt(supplier.getCreatedAt())
            .updatedAt(supplier.getUpdatedAt())
            .build();
    }

    private SupplierItemMappingResponse toMappingResponse(SupplierItemMappingEntity mapping) {
        return SupplierItemMappingResponse.builder()
            .id(mapping.getId())
            .supplierId(mapping.getSupplier().getId())
            .supplierCode(mapping.getSupplier().getCode())
            .supplierName(mapping.getSupplier().getName())
            .itemId(mapping.getItem().getId())
            .itemCode(mapping.getItem().getCode())
            .itemName(mapping.getItem().getName())
            .category(mapping.getItem().getCategory() != null ? mapping.getItem().getCategory().getName() : null)
            .unit(mapping.getItem().getUnit())
            .supplierSku(mapping.getSupplierSku())
            .lastUnitCost(mapping.getLastUnitCost())
            .minOrderQuantity(mapping.getMinOrderQuantity())
            .leadTimeDays(mapping.getLeadTimeDays())
            .preferred(mapping.isPreferred())
            .active(mapping.isActive())
            .notes(mapping.getNotes())
            .createdAt(mapping.getCreatedAt())
            .updatedAt(mapping.getUpdatedAt())
            .build();
    }

    private SupplierEntity ensureSupplierExists(UUID supplierId) {
        return supplierRepository.findById(supplierId)
            .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + supplierId));
    }

    private Map<UUID, SupplierPerformanceMetrics> getSupplierPerformanceMetrics() {
        String sql = """
            SELECT
                s.id,
                COALESCE(COUNT(DISTINCT po.id), 0) AS total_pos,
                COALESCE(COUNT(DISTINCT CASE WHEN po.po_status = 'RECEIVED' THEN po.id END), 0) AS completed_pos,
                COALESCE(COUNT(DISTINCT CASE WHEN wr.receipt_status = 'RECEIVED_WITH_DISCREPANCY' THEN wr.id END), 0) AS discrepancy_receipts
            FROM suppliers s
            LEFT JOIN purchase_orders po ON po.supplier_id = s.id
            LEFT JOIN warehouse_receipts wr ON wr.supplier_id = s.id
            GROUP BY s.id
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();

        Map<UUID, SupplierPerformanceMetrics> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID supplierId = row[0] instanceof UUID uuid ? uuid : UUID.fromString(row[0].toString());
            int total = ((Number) row[1]).intValue();
            int completed = ((Number) row[2]).intValue();
            int discrepancy = ((Number) row[3]).intValue();
            double fulfilmentPct = total == 0
                ? 0.0
                : BigDecimal.valueOf(completed * 100.0 / total)
                    .setScale(1, RoundingMode.HALF_UP)
                    .doubleValue();
            result.put(supplierId, new SupplierPerformanceMetrics(total, completed, fulfilmentPct, discrepancy));
        }
        return result;
    }

    private String normalized(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizedSearch(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String required(String value, String message) {
        String normalized = normalized(value);
        if (normalized == null) throw new BusinessException(message);
        return normalized;
    }

    public record CreateSupplierCommand(
        String code,
        String name,
        String contactPerson,
        String phone,
        String email,
        Integer leadTimeDays,
        String address,
        String notes,
        Boolean active
    ) {}

    public record UpdateSupplierCommand(
        String code,
        String name,
        String contactPerson,
        String phone,
        String email,
        Integer leadTimeDays,
        String address,
        String notes,
        Boolean active
    ) {}

    public record SaveSupplierItemMappingCommand(
        UUID itemId,
        String supplierSku,
        BigDecimal lastUnitCost,
        BigDecimal minOrderQuantity,
        Integer leadTimeDays,
        Boolean preferred,
        Boolean active,
        String notes
    ) {}

    private record SupplierPerformanceMetrics(
        int totalPurchaseOrders,
        int completedPurchaseOrders,
        double fulfilmentPct,
        int discrepancyReceipts
    ) {}
}
